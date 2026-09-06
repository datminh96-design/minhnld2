import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Frontend Service for Cloudflare R2 Cloud Storage & Backup Management
 * Features hybrid architecture: Server API primary + Direct S3 Client fallback
 */

const FALLBACK_R2_CONFIG = {
  accountId: 'eb6f53f5795c23b1f75e360674a4650b',
  accessKeyId: 'c415be80d7e69af090163b2ac446d60b',
  secretAccessKey: '67b447654bce01ef126b8c79df49d4a4b0308cef0005c8b52aba1187a99d6b19',
  endpoint: 'https://eb6f53f5795c23b1f75e360674a4650b.r2.cloudflarestorage.com',
  defaultBucket: 'minhnld2',
};

function getLocalCredentials() {
  try {
    const saved = localStorage.getItem('r2_custom_credentials');
    if (saved) {
      return { ...FALLBACK_R2_CONFIG, ...JSON.parse(saved) };
    }
  } catch {}
  return FALLBACK_R2_CONFIG;
}

let clientCache: S3Client | null = null;
function getDirectS3Client(): S3Client {
  if (!clientCache) {
    const creds = getLocalCredentials();
    clientCache = new S3Client({
      region: 'auto',
      endpoint: creds.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
  }
  return clientCache;
}

export interface R2StatusResponse {
  connected: boolean;
  buckets: string[];
  endpoint: string;
  accountId: string;
  bucket?: string;
  error?: string;
}

export interface R2ObjectItem {
  key: string;
  size: number;
  lastModified?: string;
}

export interface R2ListResponse {
  success: boolean;
  bucket: string;
  objects: R2ObjectItem[];
  error?: string;
}

export interface R2BackupPayload {
  workLogs: any[];
  workSettings: any;
  transactions: any[];
  categories: any[];
  investmentAssets: any[];
  investmentTransactions: any[];
  portfolioSnapshots: any[];
  userSettings: any;
  backupTimestamp: string;
  appVersion: string;
  totalRecords: number;
}

async function safeParseJson(response: Response, defaultErrorMsg: string): Promise<any> {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (!response.ok && !data.error) {
      data.error = `HTTP ${response.status}: ${text.slice(0, 100)}`;
    }
    return data;
  } catch {
    return {
      success: false,
      connected: false,
      error: response.ok
        ? defaultErrorMsg
        : `Lỗi máy chủ (${response.status}): ${text ? text.slice(0, 100) : defaultErrorMsg}`,
    };
  }
}

export interface R2ConfigResponse {
  accountId: string;
  accessKeyId: string;
  endpoint: string;
  defaultBucket: string;
  hasSecretKey: boolean;
  secretKeyMasked?: string;
}

export interface R2UpdateConfigPayload {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  defaultBucket?: string;
}

export const r2Service = {
  /**
   * Fetch current R2 configuration metadata (masked)
   */
  async getConfig(): Promise<R2ConfigResponse> {
    try {
      const response = await fetch('/api/r2/config');
      if (response.ok) {
        const res = await safeParseJson(response, 'Không thể tải cấu hình R2');
        if (res?.accountId) return res;
      }
    } catch {}

    const creds = getLocalCredentials();
    return {
      accountId: creds.accountId,
      accessKeyId: creds.accessKeyId,
      endpoint: creds.endpoint,
      defaultBucket: creds.defaultBucket,
      hasSecretKey: !!creds.secretAccessKey,
      secretKeyMasked: creds.secretAccessKey
        ? `${creds.secretAccessKey.slice(0, 6)}••••••••${creds.secretAccessKey.slice(-6)}`
        : '',
    };
  },

  /**
   * Update R2 credentials dynamically
   */
  async updateConfig(payload: R2UpdateConfigPayload): Promise<R2StatusResponse> {
    try {
      if (payload) {
        localStorage.setItem('r2_custom_credentials', JSON.stringify(payload));
        clientCache = null;
      }
    } catch {}

    try {
      const response = await fetch('/api/r2/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await safeParseJson(response, 'Không thể cập nhật cấu hình R2');
        if (data?.connected) return data;
      }
    } catch {}

    // Test directly via S3 client
    return await this.checkStatus();
  },

  /**
   * Check connection status to Cloudflare R2
   */
  async checkStatus(): Promise<R2StatusResponse> {
    try {
      const response = await fetch('/api/r2/status');
      const data = await safeParseJson(response, 'Không thể kiểm tra trạng thái R2');
      if (response.ok && data?.connected) {
        return {
          connected: true,
          buckets: Array.isArray(data?.buckets) ? data.buckets : ['minhnld2'],
          endpoint: data?.endpoint || FALLBACK_R2_CONFIG.endpoint,
          accountId: data?.accountId || FALLBACK_R2_CONFIG.accountId,
        };
      }
      if (data?.error && response.status !== 404) {
        return {
          connected: false,
          buckets: [],
          endpoint: data?.endpoint || FALLBACK_R2_CONFIG.endpoint,
          accountId: data?.accountId || FALLBACK_R2_CONFIG.accountId,
          error: data.error,
        };
      }
    } catch {}

    // Direct S3 Client test fallback
    try {
      const s3 = getDirectS3Client();
      const creds = getLocalCredentials();
      const cmd = new ListObjectsV2Command({
        Bucket: creds.defaultBucket,
        MaxKeys: 1,
      });
      await s3.send(cmd);
      return {
        connected: true,
        buckets: [creds.defaultBucket],
        endpoint: creds.endpoint,
        accountId: creds.accountId,
      };
    } catch (directErr: any) {
      return {
        connected: false,
        buckets: [],
        endpoint: FALLBACK_R2_CONFIG.endpoint,
        accountId: FALLBACK_R2_CONFIG.accountId,
        error: directErr?.message || 'Không thể kết nối API Cloudflare R2',
      };
    }
  },

  /**
   * List backups or objects in Cloudflare R2
   */
  async listBackups(prefix = 'backups/'): Promise<R2ListResponse> {
    try {
      const response = await fetch(`/api/r2/objects?prefix=${encodeURIComponent(prefix)}`);
      const data = await safeParseJson(response, 'Không thể tải danh sách bản sao lưu R2');
      if (response.ok && data?.success && Array.isArray(data?.objects)) {
        return {
          success: true,
          bucket: data?.bucket || 'minhnld2',
          objects: data.objects,
        };
      }
      if (data?.error && response.status !== 404) {
        return {
          success: false,
          bucket: 'minhnld2',
          objects: [],
          error: data.error,
        };
      }
    } catch {}

    // Direct S3 Client fallback
    try {
      const s3 = getDirectS3Client();
      const creds = getLocalCredentials();
      const cmd = new ListObjectsV2Command({
        Bucket: creds.defaultBucket,
        Prefix: prefix,
      });
      const res = await s3.send(cmd);
      const objects: R2ObjectItem[] = (res.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
      }));

      return {
        success: true,
        bucket: creds.defaultBucket,
        objects,
      };
    } catch (directErr: any) {
      return {
        success: false,
        bucket: 'minhnld2',
        objects: [],
        error: directErr?.message || 'Không thể tải danh sách bản sao lưu R2',
      };
    }
  },

  /**
   * Upload backup snapshot to Cloudflare R2
   */
  async saveBackup(payload: R2BackupPayload): Promise<{ success: boolean; key?: string; bucket?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/backup_${timestamp}.json`;
    const jsonString = JSON.stringify(payload, null, 2);

    try {
      const response = await fetch('/api/r2/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await safeParseJson(response, 'Lỗi khi gửi bản sao lưu lên Cloudflare R2');
      if (response.ok && data?.success) {
        return data;
      }
      if (data?.error && response.status !== 404) {
        return { success: false, error: data.error };
      }
    } catch {}

    // Direct S3 Client fallback
    try {
      const s3 = getDirectS3Client();
      const creds = getLocalCredentials();
      const cmd = new PutObjectCommand({
        Bucket: creds.defaultBucket,
        Key: key,
        Body: jsonString,
        ContentType: 'application/json',
      });
      await s3.send(cmd);
      return {
        success: true,
        key,
        bucket: creds.defaultBucket,
      };
    } catch (directErr: any) {
      return {
        success: false,
        error: directErr?.message || 'Lỗi khi tải bản sao lưu lên R2',
      };
    }
  },

  /**
   * Retrieve backup data from Cloudflare R2
   */
  async getBackup(key: string): Promise<{ success: boolean; data?: R2BackupPayload; error?: string }> {
    try {
      const response = await fetch(`/api/r2/backup?key=${encodeURIComponent(key)}`);
      const data = await safeParseJson(response, 'Không thể khôi phục dữ liệu từ Cloudflare R2');
      if (response.ok && data?.success && data?.data) {
        return data;
      }
      if (data?.error && response.status !== 404) {
        return { success: false, error: data.error };
      }
    } catch {}

    // Direct S3 Client fallback
    try {
      const s3 = getDirectS3Client();
      const creds = getLocalCredentials();
      const cmd = new GetObjectCommand({
        Bucket: creds.defaultBucket,
        Key: key,
      });
      const res = await s3.send(cmd);
      const str = await res.Body?.transformToString();
      if (!str) throw new Error('Dữ liệu tải về từ R2 rỗng');
      const parsed = JSON.parse(str);
      return {
        success: true,
        data: parsed,
      };
    } catch (directErr: any) {
      return {
        success: false,
        error: directErr?.message || 'Không thể khôi phục dữ liệu từ Cloudflare R2',
      };
    }
  },

  /**
   * Delete backup from Cloudflare R2
   */
  async deleteBackup(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/r2/object', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await safeParseJson(response, 'Lỗi khi xóa bản ghi trên Cloudflare R2');
      if (response.ok && data?.success) {
        return data;
      }
      if (data?.error && response.status !== 404) {
        return { success: false, error: data.error };
      }
    } catch {}

    // Direct S3 Client fallback
    try {
      const s3 = getDirectS3Client();
      const creds = getLocalCredentials();
      const cmd = new DeleteObjectCommand({
        Bucket: creds.defaultBucket,
        Key: key,
      });
      await s3.send(cmd);
      return { success: true };
    } catch (directErr: any) {
      return {
        success: false,
        error: directErr?.message || 'Lỗi khi xóa bản ghi trên Cloudflare R2',
      };
    }
  },
};

