/**
 * Frontend Service for Cloudflare R2 Cloud Storage & Backup Management
 */

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

export const r2Service = {
  /**
   * Check connection status to Cloudflare R2
   */
  async checkStatus(): Promise<R2StatusResponse> {
    try {
      const response = await fetch('/api/r2/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      return {
        connected: false,
        buckets: [],
        endpoint: '',
        accountId: '',
        error: error?.message || 'Không thể kết nối API Cloudflare R2',
      };
    }
  },

  /**
   * List backups or objects in Cloudflare R2
   */
  async listBackups(prefix = 'backups/'): Promise<R2ListResponse> {
    try {
      const response = await fetch(`/api/r2/objects?prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        bucket: 'personal-finance-backups',
        objects: [],
        error: error?.message || 'Không thể tải danh sách bản sao lưu R2',
      };
    }
  },

  /**
   * Upload backup snapshot to Cloudflare R2
   */
  async saveBackup(payload: R2BackupPayload): Promise<{ success: boolean; key?: string; bucket?: string; error?: string }> {
    try {
      const response = await fetch('/api/r2/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Lỗi khi gửi bản sao lưu lên Cloudflare R2',
      };
    }
  },

  /**
   * Retrieve backup data from Cloudflare R2
   */
  async getBackup(key: string): Promise<{ success: boolean; data?: R2BackupPayload; error?: string }> {
    try {
      const response = await fetch(`/api/r2/backup?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Không thể khôi phục dữ liệu từ Cloudflare R2',
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
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Lỗi khi xóa bản ghi trên Cloudflare R2',
      };
    }
  },
};
