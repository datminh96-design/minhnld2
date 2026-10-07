import { getSupabaseClient } from '../lib/supabase';

/**
 * Receipt & Bill Processing Diagnostic Logger
 * Tracks full Request/Response lifecycle for receipt OCR processing across Local, AI Studio Preview, and Vercel environments.
 */

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  type: 'expense' | 'investment';
  environment: {
    origin: string;
    hostname: string;
    isVercel: boolean;
    isAiStudio: boolean;
    isLocalhost: boolean;
    userAgent: string;
  };
  request: {
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    payloadSummary: {
      imageBase64Length: number;
      estimatedSizeKB: number;
      mimeType: string;
      requestedModel: string;
      hasCustomApiKey: boolean;
      maskedApiKey: string | null;
      additionalDataSummary?: string;
    };
  };
  retries: Array<{
    attempt: number;
    delayMs: number;
    reason: string;
    timestamp: string;
  }>;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    durationMs: number;
    success: boolean;
    usedModel?: string;
    extractedSummary?: string;
    missingFields?: string[];
    error?: string;
    rawTextSnippet?: string;
  };
  diagnosis?: {
    status: 'success' | 'warning' | 'error';
    summary: string;
    recommendations: string[];
  };
}

const STORAGE_KEY = 'receipt_diagnostic_logs_v1';
const MAX_LOGS_KEPT = 50;

export const SUPABASE_LOGS_TABLE_SQL = `-- Run this in Supabase SQL Editor to enable persistent Diagnostic Logs across all devices & Vercel
CREATE TABLE IF NOT EXISTS receipt_diagnostic_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  is_vercel BOOLEAN DEFAULT FALSE,
  is_aistudio BOOLEAN DEFAULT FALSE,
  is_localhost BOOLEAN DEFAULT FALSE,
  hostname TEXT,
  origin TEXT,
  endpoint TEXT,
  status_code INT,
  is_success BOOLEAN DEFAULT FALSE,
  duration_ms INT,
  used_model TEXT,
  estimated_size_kb INT,
  retries_count INT DEFAULT 0,
  error_message TEXT,
  diagnosis_status TEXT,
  diagnosis_summary TEXT,
  log_data JSONB NOT NULL
);

-- Enable RLS and public policies for seamless telemetry
ALTER TABLE receipt_diagnostic_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipt_diagnostic_logs' AND policyname = 'Allow public read') THEN
    CREATE POLICY "Allow public read" ON receipt_diagnostic_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipt_diagnostic_logs' AND policyname = 'Allow public insert') THEN
    CREATE POLICY "Allow public insert" ON receipt_diagnostic_logs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipt_diagnostic_logs' AND policyname = 'Allow public update') THEN
    CREATE POLICY "Allow public update" ON receipt_diagnostic_logs FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipt_diagnostic_logs' AND policyname = 'Allow public delete') THEN
    CREATE POLICY "Allow public delete" ON receipt_diagnostic_logs FOR DELETE USING (true);
  END IF;
END $$;
`;

class ReceiptDiagnosticLogger {
  private inMemoryLogs: DiagnosticLogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.inMemoryLogs = JSON.parse(raw);
      }
    } catch {
      this.inMemoryLogs = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryLogs.slice(0, MAX_LOGS_KEPT)));
    } catch {
      // Storage quota or private mode
    }
  }

  private getClientEnvironment() {
    if (typeof window === 'undefined') {
      return {
        origin: 'server-side',
        hostname: 'node-server',
        isVercel: false,
        isAiStudio: false,
        isLocalhost: false,
        userAgent: 'Node.js',
      };
    }

    const host = window.location.hostname.toLowerCase();
    return {
      origin: window.location.origin,
      hostname: window.location.hostname,
      isVercel: host.includes('vercel.app'),
      isAiStudio: host.includes('aistudio.google.com') || host.includes('run.app'),
      isLocalhost: host === 'localhost' || host === '127.0.0.1',
      userAgent: navigator.userAgent,
    };
  }

  private maskApiKey(key?: string | null): string | null {
    if (!key || typeof key !== 'string') return null;
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '***';
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  /**
   * Start tracking a new OCR request session
   */
  startSession(
    type: 'expense' | 'investment',
    endpoint: string,
    payload: {
      imageBase64?: string;
      mimeType?: string;
      model?: string;
      apiKey?: string;
      existingCategories?: any[];
      currentAssets?: any[];
    },
    headers: Record<string, string> = {}
  ): string {
    const sessionId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const base64Str = payload.imageBase64 || '';
    const base64Len = base64Str.length;
    const sizeKB = Math.round((base64Len * 0.75) / 1024);

    const apiKey = payload.apiKey || headers['x-gemini-api-key'] || null;

    const sanitizedHeaders: Record<string, string> = { ...headers };
    if (sanitizedHeaders['x-gemini-api-key']) {
      sanitizedHeaders['x-gemini-api-key'] = this.maskApiKey(sanitizedHeaders['x-gemini-api-key']) || '';
    }

    const entry: DiagnosticLogEntry = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      type,
      environment: this.getClientEnvironment(),
      request: {
        endpoint,
        method: 'POST',
        headers: sanitizedHeaders,
        payloadSummary: {
          imageBase64Length: base64Len,
          estimatedSizeKB: sizeKB,
          mimeType: payload.mimeType || 'image/jpeg',
          requestedModel: payload.model || 'gemini-3.1-flash-lite',
          hasCustomApiKey: !!apiKey,
          maskedApiKey: this.maskApiKey(apiKey),
          additionalDataSummary:
            type === 'expense'
              ? `Categories count: ${(payload.existingCategories || []).length}`
              : `Current assets count: ${(payload.currentAssets || []).length}`,
        },
      },
      retries: [],
    };

    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > MAX_LOGS_KEPT) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, MAX_LOGS_KEPT);
    }
    this.saveToStorage();

    console.group(`📡 [Diagnostic Logger] Started ${type.toUpperCase()} OCR Session (${sessionId})`);
    console.log('Environment:', entry.environment);
    console.log('Request Endpoint:', endpoint);
    console.log('Payload Specs:', entry.request.payloadSummary);
    console.groupEnd();

    return sessionId;
  }

  /**
   * Record transient retry event
   */
  recordRetry(sessionId: string, attempt: number, delayMs: number, reason: string) {
    const log = this.inMemoryLogs.find((l) => l.id === sessionId);
    if (!log) return;

    log.retries.push({
      attempt,
      delayMs,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();

    console.warn(`⚠️ [Diagnostic Logger] Retry #${attempt} for ${sessionId} after ${delayMs}ms: ${reason}`);
  }

  /**
   * Complete session with response or error
   */
  completeSession(
    sessionId: string,
    response: Response | null,
    resJson: any,
    durationMs: number,
    clientFallbackUsed = false
  ) {
    const log = this.inMemoryLogs.find((l) => l.id === sessionId);
    if (!log) return;

    const respHeaders: Record<string, string> = {};
    if (response && response.headers) {
      ['content-type', 'x-vercel-id', 'x-vercel-cache', 'server', 'x-matched-path'].forEach((h) => {
        const val = response.headers.get(h);
        if (val) respHeaders[h] = val;
      });
    }

    const success = !!(resJson && resJson.success);
    const errorMsg = resJson?.error || resJson?.message || (response && !response.ok ? `HTTP ${response.status} ${response.statusText}` : undefined);

    let extractedSummary = '';
    if (resJson?.data) {
      if (log.type === 'expense') {
        extractedSummary = `Merchant: "${resJson.data.name || ''}", Amount: ${resJson.data.amount}, Items: ${(resJson.data.items || []).length}`;
      } else {
        extractedSummary = `Symbol: "${resJson.data.asset_symbol || ''}", Qty: ${resJson.data.quantity}, Price: ${resJson.data.price_per_unit}, Broker: "${resJson.data.broker_name || ''}"`;
      }
    }

    log.response = {
      status: response ? response.status : clientFallbackUsed ? 200 : 0,
      statusText: response ? response.statusText : clientFallbackUsed ? 'Client AI Fallback' : 'Network Failure',
      headers: respHeaders,
      durationMs,
      success,
      usedModel: resJson?.used_model || log.request.payloadSummary.requestedModel,
      extractedSummary,
      missingFields: resJson?.data?.missing_fields || [],
      error: errorMsg,
      rawTextSnippet: typeof resJson?.raw_output === 'string' ? resJson.raw_output.slice(0, 300) : undefined,
    };

    // Run automated diagnosis analysis
    log.diagnosis = this.analyzeLog(log, clientFallbackUsed);

    this.saveToStorage();

    // Asynchronously sync to Supabase without blocking UI
    this.persistToSupabase(log).catch(() => {});

    console.group(`🏁 [Diagnostic Logger] Completed ${log.type.toUpperCase()} OCR Session (${sessionId}) in ${durationMs}ms`);
    console.log('Response Status:', log.response.status, log.response.statusText);
    console.log('Success:', success);
    console.log('Diagnosis:', log.diagnosis);
    if (log.response.error) console.error('Error Details:', log.response.error);
    console.groupEnd();
  }

  /**
   * Persist a log entry to Supabase database
   */
  async persistToSupabase(log: DiagnosticLogEntry): Promise<boolean> {
    try {
      const { client, isConfigured } = getSupabaseClient();
      if (!client || !isConfigured) return false;

      const record = {
        id: log.id,
        timestamp: log.timestamp,
        type: log.type,
        is_vercel: Boolean(log.environment.isVercel),
        is_aistudio: Boolean(log.environment.isAiStudio),
        is_localhost: Boolean(log.environment.isLocalhost),
        hostname: log.environment.hostname || '',
        origin: log.environment.origin || '',
        endpoint: log.request.endpoint || '',
        status_code: log.response?.status ?? null,
        is_success: Boolean(log.response?.success),
        duration_ms: log.response?.durationMs ?? null,
        used_model: log.response?.usedModel || log.request.payloadSummary.requestedModel || '',
        estimated_size_kb: log.request.payloadSummary.estimatedSizeKB || 0,
        retries_count: log.retries.length,
        error_message: log.response?.error || null,
        diagnosis_status: log.diagnosis?.status || 'error',
        diagnosis_summary: log.diagnosis?.summary || '',
        log_data: log,
      };

      const { error } = await client.from('receipt_diagnostic_logs').upsert(record, {
        onConflict: 'id',
      });

      if (error) {
        // If table does not exist or permission error, log silently
        console.warn('Supabase diagnostic log sync notice:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Failed to persist diagnostic log to Supabase:', err?.message || err);
      return false;
    }
  }

  /**
   * Fetch logs from Supabase with flexible filters
   */
  async fetchLogsFromSupabase(options?: {
    limit?: number;
    type?: 'all' | 'expense' | 'investment';
    status?: 'all' | 'success' | 'error' | 'warning';
    environment?: 'all' | 'vercel' | 'aistudio' | 'localhost';
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: DiagnosticLogEntry[]; fromSupabase: boolean; error?: string }> {
    const { client, isConfigured } = getSupabaseClient();

    if (!client || !isConfigured) {
      return {
        logs: this.getFilteredLocalLogs(options),
        fromSupabase: false,
        error: 'Supabase chưa được cấu hình. Đang hiển thị nhật ký cục bộ (Local Storage).',
      };
    }

    try {
      let query = client
        .from('receipt_diagnostic_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(100);
      }

      if (options?.type && options.type !== 'all') {
        query = query.eq('type', options.type);
      }

      if (options?.status && options.status !== 'all') {
        if (options.status === 'success') {
          query = query.eq('is_success', true);
        } else if (options.status === 'error') {
          query = query.eq('is_success', false);
        } else if (options.status === 'warning') {
          query = query.eq('diagnosis_status', 'warning');
        }
      }

      if (options?.environment && options.environment !== 'all') {
        if (options.environment === 'vercel') query = query.eq('is_vercel', true);
        if (options.environment === 'aistudio') query = query.eq('is_aistudio', true);
        if (options.environment === 'localhost') query = query.eq('is_localhost', true);
      }

      if (options?.startDate) {
        query = query.gte('timestamp', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('timestamp', options.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Could not query Supabase diagnostic table:', error.message);
        return {
          logs: this.getFilteredLocalLogs(options),
          fromSupabase: false,
          error: `Supabase Table Notice: ${error.message}. (Hiển thị nhật ký bộ nhớ đệm cục bộ)`,
        };
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const parsedLogs: DiagnosticLogEntry[] = data.map((item: any) => {
          if (item.log_data && typeof item.log_data === 'object') {
            return item.log_data as DiagnosticLogEntry;
          }
          return {
            id: item.id,
            timestamp: item.timestamp,
            type: item.type,
            environment: {
              origin: item.origin || '',
              hostname: item.hostname || '',
              isVercel: item.is_vercel || false,
              isAiStudio: item.is_aistudio || false,
              isLocalhost: item.is_localhost || false,
              userAgent: '',
            },
            request: {
              endpoint: item.endpoint || '',
              method: 'POST',
              headers: {},
              payloadSummary: {
                imageBase64Length: 0,
                estimatedSizeKB: item.estimated_size_kb || 0,
                mimeType: 'image/jpeg',
                requestedModel: item.used_model || '',
                hasCustomApiKey: false,
                maskedApiKey: null,
              },
            },
            retries: [],
            response: {
              status: item.status_code || 200,
              statusText: item.is_success ? 'OK' : 'Error',
              headers: {},
              durationMs: item.duration_ms || 0,
              success: item.is_success || false,
              usedModel: item.used_model,
              error: item.error_message || undefined,
            },
            diagnosis: {
              status: item.diagnosis_status || (item.is_success ? 'success' : 'error'),
              summary: item.diagnosis_summary || '',
              recommendations: [],
            },
          };
        });

        // Merge with local logs to ensure no latest local uncommitted events are missing
        const idMap = new Set(parsedLogs.map((l) => l.id));
        const missingLocal = this.inMemoryLogs.filter((l) => !idMap.has(l.id));
        const combined = [...missingLocal, ...parsedLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
          logs: combined,
          fromSupabase: true,
        };
      }

      // If Supabase table returned 0 records, fallback to local logs
      return {
        logs: this.getFilteredLocalLogs(options),
        fromSupabase: true,
      };
    } catch (err: any) {
      return {
        logs: this.getFilteredLocalLogs(options),
        fromSupabase: false,
        error: err?.message || 'Lỗi kết nối Supabase',
      };
    }
  }

  /**
   * Filter local in-memory logs
   */
  private getFilteredLocalLogs(options?: {
    type?: 'all' | 'expense' | 'investment';
    status?: 'all' | 'success' | 'error' | 'warning';
    environment?: 'all' | 'vercel' | 'aistudio' | 'localhost';
    startDate?: string;
    endDate?: string;
  }): DiagnosticLogEntry[] {
    return this.inMemoryLogs.filter((log) => {
      if (options?.type && options.type !== 'all' && log.type !== options.type) return false;
      if (options?.status && options.status !== 'all') {
        if (options.status === 'success' && !log.response?.success) return false;
        if (options.status === 'error' && log.response?.success) return false;
        if (options.status === 'warning' && log.diagnosis?.status !== 'warning') return false;
      }
      if (options?.environment && options.environment !== 'all') {
        if (options.environment === 'vercel' && !log.environment.isVercel) return false;
        if (options.environment === 'aistudio' && !log.environment.isAiStudio) return false;
        if (options.environment === 'localhost' && !log.environment.isLocalhost) return false;
      }
      if (options?.startDate && new Date(log.timestamp) < new Date(options.startDate)) return false;
      if (options?.endDate && new Date(log.timestamp) > new Date(options.endDate)) return false;
      return true;
    });
  }

  /**
   * Push all local logs to Supabase
   */
  async syncAllLocalToSupabase(): Promise<{ total: number; success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    for (const log of this.inMemoryLogs) {
      const ok = await this.persistToSupabase(log);
      if (ok) success++;
      else failed++;
    }
    return { total: this.inMemoryLogs.length, success, failed };
  }

  /**
   * Delete a log from local and Supabase
   */
  async deleteLog(id: string): Promise<boolean> {
    this.inMemoryLogs = this.inMemoryLogs.filter((l) => l.id !== id);
    this.saveToStorage();

    try {
      const { client, isConfigured } = getSupabaseClient();
      if (client && isConfigured) {
        await client.from('receipt_diagnostic_logs').delete().eq('id', id);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all logs in local storage and Supabase
   */
  async clearAllLogs(): Promise<void> {
    this.inMemoryLogs = [];
    this.saveToStorage();

    try {
      const { client, isConfigured } = getSupabaseClient();
      if (client && isConfigured) {
        await client.from('receipt_diagnostic_logs').delete().neq('id', '___non_existent___');
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Run automated heuristic diagnosis for why a request succeeded or failed on Vercel
   */
  private analyzeLog(log: DiagnosticLogEntry, clientFallbackUsed: boolean): DiagnosticLogEntry['diagnosis'] {
    const isVercel = log.environment.isVercel;
    const resp = log.response;
    const sizeKB = log.request.payloadSummary.estimatedSizeKB;

    if (resp?.success) {
      return {
        status: 'success',
        summary: clientFallbackUsed
          ? 'Quét thành công thông qua chế độ Trình duyệt AI (Client-side Direct SDK)'
          : 'Bóc tách thành công 100% qua API Gateway.',
        recommendations: [
          'Dữ liệu hóa đơn đã được chuyển đổi chuẩn xác.',
          isVercel ? 'Môi trường Vercel hoạt động ổn định.' : 'Môi trường Preview hoạt động ổn định.',
        ],
      };
    }

    const recs: string[] = [];
    let summary = 'Không trích xuất được dữ liệu từ hóa đơn.';

    // Case 1: Payload size > 4.5MB on Vercel
    if (sizeKB > 4500) {
      summary = `Dung lượng payload (${sizeKB} KB) vượt quá giới hạn 4.5MB của Vercel Serverless Function (Lỗi 413 Payload Too Large).`;
      recs.push('Kích hoạt nén ảnh tự động qua compressImage (đã tích hợp chuẩn JPEG 1800px).');
    }

    // Case 2: Missing GEMINI_API_KEY
    if (resp?.error && (resp.error.includes('GEMINI_API_KEY') || resp.error.includes('API key') || resp.error.includes('chưa được cấu hình'))) {
      summary = 'Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel Serverless Function.';
      recs.push('Vào Vercel Dashboard > Project Settings > Environment Variables > Thêm GEMINI_API_KEY.');
      recs.push('Hoặc dán trực tiếp khóa API Gemini miễn phí (từ aistudio.google.com/apikey) vào khung quét trên ứng dụng.');
    }

    // Case 3: HTTP 404 Route Not Found
    if (resp?.status === 404) {
      summary = 'Không tìm thấy API route trên Vercel (/api/gemini).';
      recs.push('Kiểm tra cấu hình rewrites trong vercel.json đã khớp với đường dẫn /api/investments/* và /api/expenses/*.');
    }

    // Case 4: HTTP 504 Gateway Timeout
    if (resp?.status === 504) {
      summary = 'Máy chủ Vercel Serverless Function bị quá thời gian xử lý (Gateway Timeout 504).';
      recs.push('Cấu hình maxDuration = 60 trong api/gemini.ts.');
      recs.push('Sử dụng model siêu tốc: gemini-3.1-flash-lite thay vì model nặng.');
    }

    // Case 5: 429 Rate Limit
    if (resp?.status === 429 || (resp?.error && resp.error.includes('quota'))) {
      summary = 'Đạt giới hạn lượt gọi (Rate Limit 429) của mô hình Gemini.';
      recs.push('Hệ thống đã tự động kích hoạt cơ chế Exponential Backoff để thử lại.');
      recs.push('Thử chuyển sang model khác như Gemini 2.5 Flash hoặc Gemini 3.8 Flash.');
    }

    if (recs.length === 0) {
      recs.push('Kiểm tra độ nét của ảnh và đảm bảo các trường ngày tháng, số tiền không bị che khuất.');
      recs.push('Nhấn "Xem Debug JSON Gốc" hoặc "Sao Chép Nhật Ký Chẩn Đoán" để gửi phân tích.');
    }

    return {
      status: 'error',
      summary,
      recommendations: recs,
    };
  }

  getLogs(): DiagnosticLogEntry[] {
    return [...this.inMemoryLogs];
  }

  getLatestLog(): DiagnosticLogEntry | null {
    return this.inMemoryLogs.length > 0 ? this.inMemoryLogs[0] : null;
  }

  clearLogs() {
    this.inMemoryLogs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  exportReport(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        clientEnv: this.getClientEnvironment(),
        totalSessions: this.inMemoryLogs.length,
        logs: this.inMemoryLogs,
      },
      null,
      2
    );
  }
}

export const receiptDiagnosticLogger = new ReceiptDiagnosticLogger();
