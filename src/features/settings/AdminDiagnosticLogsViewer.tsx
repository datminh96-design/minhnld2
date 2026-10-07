import React, { useState, useEffect, useMemo } from 'react';
import {
  receiptDiagnosticLogger,
  DiagnosticLogEntry,
  SUPABASE_LOGS_TABLE_SQL,
} from '../../utils/receiptDiagnosticLogger';
import { getSupabaseStatus } from '../../lib/supabase';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Database,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Layers,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Zap,
  Code,
  Sparkles,
  Info,
  ChevronRight,
  ArrowUpDown,
  Laptop,
  Flame,
  FileText,
} from 'lucide-react';

export const AdminDiagnosticLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFromSupabase, setIsFromSupabase] = useState(false);
  const [supabaseNotice, setSupabaseNotice] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'warning'>('all');
  const [envFilter, setEnvFilter] = useState<'all' | 'vercel' | 'aistudio' | 'localhost'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'investment'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Log for detail modal / view
  const [selectedLog, setSelectedLog] = useState<DiagnosticLogEntry | null>(null);

  // Copy states
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedLogJson, setCopiedLogJson] = useState(false);
  const [syncingToCloud, setSyncingToCloud] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(true);

  const supabaseConfig = getSupabaseStatus();

  // Load logs
  const loadLogs = async () => {
    setLoading(true);
    setSupabaseNotice(null);
    try {
      let startDate: string | undefined;
      const now = new Date();
      if (timeFilter === '24h') {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (timeFilter === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeFilter === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await receiptDiagnosticLogger.fetchLogsFromSupabase({
        status: statusFilter,
        environment: envFilter,
        type: typeFilter,
        startDate,
        limit: 100,
      });

      setLogs(res.logs);
      setIsFromSupabase(res.fromSupabase);
      if (res.error) {
        setSupabaseNotice(res.error);
      }
    } catch (err: any) {
      setSupabaseNotice(err?.message || 'Lỗi khi tải nhật ký');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter, envFilter, typeFilter, timeFilter]);

  // Filtered by Search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      const matchId = log.id.toLowerCase().includes(query);
      const matchEndpoint = log.request.endpoint.toLowerCase().includes(query);
      const matchHost = log.environment.hostname.toLowerCase().includes(query);
      const matchModel = (log.response?.usedModel || log.request.payloadSummary.requestedModel || '').toLowerCase().includes(query);
      const matchError = (log.response?.error || '').toLowerCase().includes(query);
      const matchSummary = (log.diagnosis?.summary || '').toLowerCase().includes(query);
      const matchExtracted = (log.response?.extractedSummary || '').toLowerCase().includes(query);
      return matchId || matchEndpoint || matchHost || matchModel || matchError || matchSummary || matchExtracted;
    });
  }, [logs, searchQuery]);

  // Analytics
  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.response?.success).length;
    const failed = logs.filter((l) => !l.response?.success).length;
    const vercelLogs = logs.filter((l) => l.environment.isVercel);
    const vercelTotal = vercelLogs.length;
    const vercelSuccess = vercelLogs.filter((l) => l.response?.success).length;
    const vercelFailed = vercelLogs.filter((l) => !l.response?.success).length;
    const vercelFailRate = vercelTotal > 0 ? Math.round((vercelFailed / vercelTotal) * 100) : 0;

    const durations = logs.filter((l) => l.response?.durationMs).map((l) => l.response!.durationMs);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      total,
      success,
      failed,
      vercelTotal,
      vercelSuccess,
      vercelFailed,
      vercelFailRate,
      avgDuration,
    };
  }, [logs]);

  const handleSyncToSupabase = async () => {
    setSyncingToCloud(true);
    setSyncResult(null);
    try {
      const res = await receiptDiagnosticLogger.syncAllLocalToSupabase();
      setSyncResult(`Đã đồng bộ thành công ${res.success}/${res.total} bản ghi lên Supabase.`);
      await loadLogs();
    } catch (err: any) {
      setSyncResult(`Lỗi đồng bộ: ${err?.message || 'Không thể gửi dữ liệu'}`);
    } finally {
      setSyncingToCloud(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký chẩn đoán trên cả Trình duyệt và Supabase?')) return;
    setLoading(true);
    await receiptDiagnosticLogger.clearAllLogs();
    setSelectedLog(null);
    await loadLogs();
  };

  const handleCopyReport = () => {
    const report = receiptDiagnosticLogger.exportReport();
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_LOGS_TABLE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyLogJson = (log: DiagnosticLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedLogJson(true);
    setTimeout(() => setCopiedLogJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>Nhật Ký Quản Trị OCR & Chẩn Đoán Vercel</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Supabase Powered
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Theo dõi và phân tích chuyên sâu chu kỳ Request/Response bóc tách biên lai, so sánh môi trường Vercel vs Local
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold backdrop-blur-md border border-white/10 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu từ Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleSyncToSupabase}
            disabled={syncingToCloud}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Đẩy tất cả nhật ký cục bộ lên bảng Supabase"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{syncingToCloud ? 'Đang đẩy...' : 'Đẩy lên Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Xem mã SQL tạo bảng trên Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQL Supabase</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition cursor-pointer"
            title="Xuất toàn bộ báo cáo chẩn đoán JSON"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Đã sao chép!' : 'Xuất JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30 flex items-center gap-1.5 transition cursor-pointer"
            title="Xóa toàn bộ nhật ký"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Supabase connection status banner */}
      {supabaseNotice && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">{supabaseNotice}</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Nếu bảng chưa tồn tại trên Supabase, bạn có thể nhấn "SQL Supabase" để tạo bảng trong 5 giây.
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="underline font-bold text-amber-900 dark:text-amber-100 cursor-pointer"
              >
                Xem lệnh SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {syncResult && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{syncResult}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Tổng số phiên quét</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</span>
            <span className="text-[11px] text-slate-500">
              {isFromSupabase ? 'từ Supabase DB' : 'bộ nhớ đệm local'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Thành công / Thất bại</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.success}</span>
            <span className="text-sm font-semibold text-slate-400">/</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</span>
            <span className="text-[11px] text-slate-500">lỗi</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Lỗi trên Vercel</span>
            <Globe className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.vercelTotal > 0 ? `${stats.vercelFailRate}%` : '0%'}
            </span>
            <span className="text-[11px] text-slate-500">
              ({stats.vercelFailed}/{stats.vercelTotal} request)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Độ trễ trung bình</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.avgDuration}</span>
            <span className="text-xs font-semibold text-slate-500">ms</span>
          </div>
        </div>
      </div>

      {/* Vercel vs Local Comparative Matrix */}
      <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              BẢNG SO SÁNH NGUYÊN NHÂN LỖI: VERCEL SERVERLESS VS MÁY CỤC BỘ (LOCAL / AI STUDIO)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowComparisonMatrix(!showComparisonMatrix)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            {showComparisonMatrix ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </div>

        {showComparisonMatrix && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                1. Giới hạn Payload Body (Ảnh chụp)
              </div>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-red-300">Vercel:</strong> Tối đa <strong>4.5MB</strong> cho toàn bộ HTTP request. Ảnh gốc camera iPhone (4-8MB) sẽ bị chặn ngay với mã <code className="bg-red-950 px-1 py-0.5 rounded text-red-200">HTTP 413</code>.<br />
                • <strong className="text-emerald-300">Local / AI Studio:</strong> Express bodyParser cho phép 50MB.<br />
                • <strong className="text-indigo-300">Giải pháp đã áp dụng:</strong> Client tự động nén JPEG 1800px (~400KB - 800KB) trước khi gửi.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                2. Khóa API & Biến Môi Trường
              </div>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-red-300">Vercel:</strong> Chạy trong môi trường cô lập, chỉ đọc biến được cấu hình tại <em>Vercel Project Settings</em>.<br />
                • <strong className="text-emerald-300">Local / AI Studio:</strong> Đọc trực tiếp từ file <code className="bg-slate-700 px-1 py-0.5 rounded">.env</code>.<br />
                • <strong className="text-indigo-300">Giải pháp đã áp dụng:</strong> Hỗ trợ truyền khóa Gemini tùy biến qua Header <code className="bg-indigo-950 px-1 py-0.5 rounded text-indigo-200">x-gemini-api-key</code> và tự động fallback sang Client AI SDK.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                3. Thời Gian Xử Lý (Timeout) & Retry
              </div>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-red-300">Vercel Hobby:</strong> Giới hạn <strong>10s</strong> (Pro là 60s). Nếu mạng chậm hoặc Gemini phân tích lâu sẽ báo <code className="bg-red-950 px-1 py-0.5 rounded text-red-200">504 Gateway Timeout</code>.<br />
                • <strong className="text-indigo-300">Giải pháp đã áp dụng:</strong> Cấu hình <code className="bg-purple-950 px-1 py-0.5 rounded text-purple-200">maxDuration: 60</code>, dùng model siêu tốc <code className="text-purple-200">gemini-3.1-flash-lite</code> và Exponential Backoff Retry.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo ID phiên, tên cửa hàng, mã cổ phiếu/crypto, lỗi, model..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
            />
          </div>

          {/* Quick Filter Counts */}
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Trạng thái:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                statusFilter === 'success'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              Thành công
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('error')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                statusFilter === 'error'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              Lỗi / Thất bại
            </button>
          </div>

          {/* Environment Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Môi trường:</span>
            <button
              type="button"
              onClick={() => setEnvFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                envFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setEnvFilter('vercel')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                envFilter === 'vercel'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
              }`}
            >
              Vercel Deployment
            </button>
            <button
              type="button"
              onClick={() => setEnvFilter('aistudio')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                envFilter === 'aistudio'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              AI Studio Preview
            </button>
            <button
              type="button"
              onClick={() => setEnvFilter('localhost')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                envFilter === 'localhost'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Localhost
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="px-2 text-[11px] font-semibold text-slate-500">Loại:</span>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                typeFilter === 'all' ? 'bg-white dark:bg-slate-700 font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                typeFilter === 'expense' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-600'
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('investment')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition ${
                typeFilter === 'investment' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600'
              }`}
            >
              Đầu tư
            </button>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 pr-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all">Toàn bộ thời gian</option>
              <option value="24h">24 giờ qua</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Đang truy vấn nhật ký từ Supabase...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Không có nhật ký nào phù hợp bộ lọc</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              Hãy thực hiện quét một hóa đơn hoặc lệnh đầu tư để tạo nhật ký chẩn đoán mới nhất, hoặc thay đổi bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Thời Gian & Session ID</th>
                  <th className="py-3 px-3">Môi Trường</th>
                  <th className="py-3 px-3">Loại & Endpoint</th>
                  <th className="py-3 px-3">Payload / Ảnh</th>
                  <th className="py-3 px-3">Trạng Thái & Model</th>
                  <th className="py-3 px-3">Độ Trễ</th>
                  <th className="py-3 px-3">Chẩn Đoán Tự Động</th>
                  <th className="py-3 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const isSuccess = log.response?.success;
                  const isVercel = log.environment.isVercel;
                  const sizeKB = log.request.payloadSummary.estimatedSizeKB;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition ${
                        selectedLog?.id === log.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
                      }`}
                    >
                      {/* Timestamp & ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleDateString('vi-VN')} • {log.id.slice(-6)}
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="py-3 px-3">
                        {isVercel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Globe className="w-3 h-3" />
                            <span>Vercel</span>
                          </span>
                        ) : log.environment.isAiStudio ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Studio</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Laptop className="w-3 h-3" />
                            <span>Local</span>
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={log.environment.hostname}>
                          {log.environment.hostname || 'localhost'}
                        </div>
                      </td>

                      {/* Type & Endpoint */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            log.type === 'expense'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {log.type === 'expense' ? 'Hóa đơn Chi Tiêu' : 'Lệnh Đầu Tư'}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px] mt-0.5" title={log.request.endpoint}>
                          {log.request.endpoint}
                        </div>
                      </td>

                      {/* Payload size */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {sizeKB} KB
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.request.payloadSummary.mimeType.replace('image/', '')}
                          {sizeKB > 4500 && (
                            <span className="text-red-500 font-bold ml-1">(&gt;4.5M Vercel!)</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Model */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>200 OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                              <AlertCircle className="w-3 h-3" />
                              <span>{log.response?.status || 'LỖI'}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5 font-mono">
                          {log.response?.usedModel || log.request.payloadSummary.requestedModel}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {log.response?.durationMs ? `${log.response.durationMs}ms` : '---'}
                        </div>
                        {log.retries.length > 0 && (
                          <span className="text-[10px] font-bold text-amber-500">
                            ({log.retries.length} retry)
                          </span>
                        )}
                      </td>

                      {/* Automated Diagnosis */}
                      <td className="py-3 px-3">
                        <div className="max-w-[200px] truncate text-slate-700 dark:text-slate-300 font-medium">
                          {log.diagnosis?.summary || (isSuccess ? 'Bóc tách thành công' : 'Thất bại')}
                        </div>
                        {log.response?.error && (
                          <div className="text-[10px] text-red-500 truncate max-w-[200px]">
                            {log.response.error}
                          </div>
                        )}
                      </td>

                      {/* Detail CTA */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 text-xs transition cursor-pointer"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Log Deep Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    selectedLog.response?.success
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                      : 'bg-red-100 dark:bg-red-950 text-red-600'
                  }`}
                >
                  {selectedLog.response?.success ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Chi Tiết Phiên Quét: {selectedLog.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedLog.type === 'expense'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {selectedLog.type}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</span>
                    <span>•</span>
                    <span>Host: {selectedLog.environment.hostname}</span>
                    <span>•</span>
                    <span>Môi trường: {selectedLog.environment.isVercel ? 'Vercel' : selectedLog.environment.isAiStudio ? 'AI Studio' : 'Local'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLogJson(selectedLog)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLogJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLogJson ? 'Đã copy!' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Automated Heuristic Diagnosis Box */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedLog.diagnosis?.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Chẩn Đoán Nguyên Nhân (Automated Heuristic Diagnosis):</span>
                </div>
                <p className="font-semibold leading-relaxed">{selectedLog.diagnosis?.summary}</p>

                {selectedLog.diagnosis?.recommendations && selectedLog.diagnosis.recommendations.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-current/20 space-y-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider">Khuyến nghị khắc phục:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
                      {selectedLog.diagnosis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Endpoint API</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                    {selectedLog.request.endpoint}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Kích Thước Ảnh (Payload)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.request.payloadSummary.estimatedSizeKB} KB ({selectedLog.request.payloadSummary.mimeType})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Mô Hình Gemini</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.response?.usedModel || selectedLog.request.payloadSummary.requestedModel}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Thời Gian Xử Lý</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.response?.durationMs} ms
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Khóa API Tùy Biến</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.request.payloadSummary.hasCustomApiKey
                      ? `Có (${selectedLog.request.payloadSummary.maskedApiKey})`
                      : 'Không (Dùng Env)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Lượt Retry (Backoff)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.retries.length} lần
                  </span>
                </div>
              </div>

              {/* Extracted Data or Error details */}
              {selectedLog.response?.extractedSummary && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                    📊 Kết Quả Bóc Tách Thành Công:
                  </span>
                  <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {selectedLog.response.extractedSummary}
                  </p>
                </div>
              )}

              {selectedLog.response?.error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <span className="font-bold text-red-800 dark:text-red-300 block mb-1">
                    ⚠️ Chi Tiết Lỗi Server Phản Hồi:
                  </span>
                  <p className="font-mono text-xs text-red-700 dark:text-red-300">
                    {selectedLog.response.error}
                  </p>
                </div>
              )}

              {/* Exponential Backoff Timeline */}
              {selectedLog.retries.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>Lịch Sử Exponential Backoff Retry:</span>
                  </span>
                  <div className="space-y-1.5">
                    {selectedLog.retries.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-amber-200/50">
                        <span>Lần #{r.attempt} (Chờ {r.delayMs}ms): {r.reason}</span>
                        <span className="text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON viewer */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Toàn bộ Payload & Response JSON:</span>
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-indigo-300 font-mono text-[11px] overflow-x-auto max-h-48 leading-tight">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Khởi Tạo Bảng Nhật Ký Chẩn Đoán trên Supabase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Chạy đoạn SQL sau trong mục <strong>SQL Editor</strong> của trang quản trị Supabase (<code className="text-indigo-600 font-mono font-bold">wtjuyjhviqqaejmmelje.supabase.co</code>) để lưu trữ vĩnh viễn và đồng bộ toàn bộ nhật ký giữa Vercel, Local và Điện thoại:
              </p>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-60">
                  {SUPABASE_LOGS_TABLE_SQL}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Đã sao chép!' : 'Sao chép SQL'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs">
                💡 Sau khi chạy SQL trên Supabase, mọi lượt quét từ Vercel sẽ tự động được ghi lại vào bảng này để bạn theo dõi trực tiếp từ bất cứ đâu.
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
