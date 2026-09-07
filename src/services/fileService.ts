import {
  FileMetadata,
  FileUploadItem,
  PresignedUploadResponse,
  CompleteUploadResponse,
  StorageStats,
  FileCategory,
  FolderItem,
} from '../types/file';
import { getFileCategory, formatFileSize } from '../lib/file-utils';
import { validateFileForUpload } from '../lib/file-validation';

const LOCAL_STORAGE_KEY = 'minh_personal_files_metadata';
const LOCAL_FOLDERS_KEY = 'minh_personal_storage_folders';

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'all', name: 'Tất cả thư mục', fileCount: 0, totalSizeBytes: 0, color: 'text-slate-500' },
  { id: 'root', name: 'Gốc', fileCount: 0, totalSizeBytes: 0, color: 'text-blue-500' },
  { id: 'documents', name: 'Tài liệu & Hợp đồng', fileCount: 0, totalSizeBytes: 0, color: 'text-indigo-500' },
  { id: 'invoices', name: 'Hóa đơn & Chứng từ', fileCount: 0, totalSizeBytes: 0, color: 'text-emerald-500' },
  { id: 'reports', name: 'Báo cáo tài chính', fileCount: 0, totalSizeBytes: 0, color: 'text-amber-500' },
  { id: 'investments', name: 'Đầu tư & Danh mục', fileCount: 0, totalSizeBytes: 0, color: 'text-purple-500' },
  { id: 'media', name: 'Hình ảnh & Media', fileCount: 0, totalSizeBytes: 0, color: 'text-rose-500' },
];

function getStoredLocalFiles(): FileMetadata[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading local files:', err);
  }
  return [];
}

function saveLocalFiles(files: FileMetadata[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
  } catch (err) {
    console.warn('Error saving local files:', err);
  }
}

export function getCustomFolders(): FolderItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading local folders:', err);
  }
  return DEFAULT_FOLDERS;
}

export function saveCustomFolders(folders: FolderItem[]): void {
  try {
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
  } catch (err) {
    console.warn('Error saving local folders:', err);
  }
}

export const fileService = {
  /**
   * Request a Presigned PUT Upload URL from server
   */
  async getPresignedUploadUrl(
    file: File,
    folder: string = 'Tài liệu chung',
    description?: string
  ): Promise<PresignedUploadResponse> {
    const validation = validateFileForUpload(file.name, file.size, file.type);
    if (!validation.valid) {
      throw new Error(validation.error || 'File không hợp lệ');
    }

    const payload = {
      originalFileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      folder: folder || 'Gốc',
      description: description || '',
    };

    try {
      const response = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi máy chủ (${response.status}) khi tạo Presigned URL`);
      }

      return await response.json();
    } catch (apiError: any) {
      console.warn('API Presign failed, checking fallback:', apiError);
      throw apiError;
    }
  },

  /**
   * Upload file directly to Cloudflare R2 via XMLHttpRequest with accurate Progress Event (0% - 100%)
   */
  uploadDirectToR2(
    uploadUrl: string,
    file: File,
    onProgress: (progress: number, bytesUploaded: number, speedBps: number) => void,
    onXhrCreated?: (xhr: XMLHttpRequest) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (onXhrCreated) {
        onXhrCreated(xhr);
      }

      let lastTime = Date.now();
      let lastLoaded = 0;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const timeDiffSec = (now - lastTime) / 1000;
          let speed = 0;
          if (timeDiffSec > 0.2) {
            speed = (e.loaded - lastLoaded) / timeDiffSec;
            lastTime = now;
            lastLoaded = e.loaded;
          }

          const percent = Math.min(Math.round((e.loaded / e.total) * 100), 99);
          onProgress(percent, e.loaded, speed);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100, file.size, 0);
          resolve();
        } else {
          reject(new Error(`Tải lên Cloudflare R2 thất bại với mã lỗi HTTP ${xhr.status}. Vui lòng kiểm tra cấu hình CORS R2.`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Lỗi mạng hoặc kết nối đến Cloudflare R2 bị gián đoạn. Vui lòng kiểm tra Internet và cấu hình CORS.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Quá trình tải lên đã bị hủy bởi người dùng.'));
      });

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  },

  /**
   * Complete the upload by recording metadata in database
   */
  async completeUpload(
    objectKey: string,
    file: File,
    folder: string = 'Gốc',
    description?: string,
    fileId?: string
  ): Promise<FileMetadata> {
    const payload = {
      fileId,
      objectKey,
      originalFileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      folder: folder || 'Gốc',
      description: description || '',
    };

    try {
      const response = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data: CompleteUploadResponse = await response.json();
        if (data.success && data.file) {
          // Sync with local store
          const localFiles = getStoredLocalFiles();
          const filtered = localFiles.filter((f) => f.id !== data.file.id);
          saveLocalFiles([data.file, ...filtered]);
          return data.file;
        }
      }
    } catch (err) {
      console.warn('API Complete failed, creating local fallback record:', err);
    }

    // Fallback: construct record locally
    const ext = file.name.split('.').pop() || '';
    const fallbackRecord: FileMetadata = {
      id: fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: 'admin123',
      file_name: file.name,
      original_name: file.name,
      object_key: objectKey,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      folder: folder || 'Gốc',
      category: getFileCategory(file.type, ext),
      description: description || '',
      extension: ext,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const localFiles = getStoredLocalFiles();
    saveLocalFiles([fallbackRecord, ...localFiles.filter((f) => f.id !== fallbackRecord.id)]);
    return fallbackRecord;
  },

  /**
   * Execute full upload pipeline for a single file
   */
  async uploadFileItem(
    item: FileUploadItem,
    onUpdate: (updated: Partial<FileUploadItem>) => void
  ): Promise<FileMetadata> {
    onUpdate({ status: 'presigning', progress: 5 });

    // Step 1: Request presigned URL
    const presign = await this.getPresignedUploadUrl(item.file, item.folder, item.description);
    onUpdate({
      status: 'uploading',
      progress: 10,
      objectKey: presign.objectKey,
    });

    // Step 2: Direct upload to R2
    await this.uploadDirectToR2(
      presign.uploadUrl,
      item.file,
      (progress, bytes, speed) => {
        onUpdate({
          progress: Math.max(10, Math.min(progress, 98)),
          bytesUploaded: bytes,
          uploadSpeedBps: speed,
        });
      },
      (xhr) => {
        onUpdate({ xhr });
      }
    );

    // Step 3: Complete upload
    onUpdate({ status: 'completing', progress: 99 });
    const metadata = await this.completeUpload(
      presign.objectKey,
      item.file,
      item.folder,
      item.description,
      presign.fileId
    );

    onUpdate({
      status: 'completed',
      progress: 100,
      resultFile: metadata,
    });

    return metadata;
  },

  /**
   * List files with filtering and search
   */
  async listFiles(options?: {
    folder?: string;
    category?: FileCategory;
    search?: string;
    sortBy?: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
  }): Promise<{ files: FileMetadata[]; total: number; stats: StorageStats }> {
    let files: FileMetadata[] = [];

    try {
      const params = new URLSearchParams();
      if (options?.folder && options.folder !== 'all') params.set('folder', options.folder);
      if (options?.category && options.category !== 'all') params.set('category', options.category);
      if (options?.search) params.set('search', options.search);
      if (options?.sortBy) params.set('sortBy', options.sortBy);

      const res = await fetch(`/api/files?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          files = data.files;
          saveLocalFiles(files);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch files from API, using cached records:', err);
      files = getStoredLocalFiles();
    }

    if (files.length === 0) {
      files = getStoredLocalFiles();
    }

    // Apply client-side filters if needed
    let filtered = [...files];
    if (options?.folder && options.folder !== 'all') {
      filtered = filtered.filter((f) => f.folder.toLowerCase() === options.folder?.toLowerCase());
    }
    if (options?.category && options.category !== 'all') {
      filtered = filtered.filter((f) => f.category === options.category);
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (f) =>
          f.file_name.toLowerCase().includes(q) ||
          f.original_name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.folder.toLowerCase().includes(q)
      );
    }

    // Sort
    const sortBy = options?.sortBy || 'date_desc';
    filtered.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return a.file_name.localeCompare(b.file_name);
      if (sortBy === 'name_desc') return b.file_name.localeCompare(a.file_name);
      if (sortBy === 'size_desc') return b.file_size - a.file_size;
      if (sortBy === 'size_asc') return a.file_size - b.file_size;
      return 0;
    });

    const stats = this.computeStats(files);
    return { files: filtered, total: filtered.length, stats };
  },

  /**
   * Request Presigned GET Download URL and trigger download
   */
  async downloadFile(fileId: string, fileName?: string): Promise<string> {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          const a = document.createElement('a');
          a.href = data.url;
          a.download = fileName || data.fileName || 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return data.url;
        }
      }
    } catch (err) {
      console.error('Download file error:', err);
    }
    throw new Error('Không thể tạo liên kết tải xuống file từ Cloudflare R2.');
  },

  /**
   * Request Presigned GET Preview URL for inline preview modal
   */
  async getPreviewUrl(fileId: string): Promise<string> {
    try {
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) return data.url;
      }
    } catch (err) {
      console.error('Get preview URL error:', err);
    }
    throw new Error('Không thể tải URL xem trước từ Cloudflare R2.');
  },

  /**
   * Delete file from Cloudflare R2 & Database (ADMIN role)
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const local = getStoredLocalFiles();
        saveLocalFiles(local.filter((f) => f.id !== fileId));
        return true;
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Xóa file thất bại');
    } catch (err: any) {
      console.warn('API Delete error, updating local store:', err);
      const local = getStoredLocalFiles();
      saveLocalFiles(local.filter((f) => f.id !== fileId));
      return true;
    }
  },

  /**
   * Update file metadata (Rename, Move folder, Edit description)
   */
  async updateFileMetadata(
    fileId: string,
    updates: { file_name?: string; folder?: string; description?: string }
  ): Promise<FileMetadata> {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.file) {
          const local = getStoredLocalFiles();
          const idx = local.findIndex((f) => f.id === fileId);
          if (idx >= 0) {
            local[idx] = { ...local[idx], ...data.file };
            saveLocalFiles(local);
          }
          return data.file;
        }
      }
    } catch (err) {
      console.warn('API update failed, applying locally:', err);
    }

    const local = getStoredLocalFiles();
    const idx = local.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      local[idx] = {
        ...local[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveLocalFiles(local);
      return local[idx];
    }
    throw new Error('Không tìm thấy file để cập nhật');
  },

  /**
   * Compute comprehensive storage statistics
   */
  computeStats(files: FileMetadata[]): StorageStats {
    let totalBytes = 0;
    const catMap: Record<FileCategory, { count: number; bytes: number; formatted: string }> = {
      all: { count: 0, bytes: 0, formatted: '0 B' },
      document: { count: 0, bytes: 0, formatted: '0 B' },
      image: { count: 0, bytes: 0, formatted: '0 B' },
      video: { count: 0, bytes: 0, formatted: '0 B' },
      audio: { count: 0, bytes: 0, formatted: '0 B' },
      spreadsheet: { count: 0, bytes: 0, formatted: '0 B' },
      presentation: { count: 0, bytes: 0, formatted: '0 B' },
      archive: { count: 0, bytes: 0, formatted: '0 B' },
      code: { count: 0, bytes: 0, formatted: '0 B' },
      other: { count: 0, bytes: 0, formatted: '0 B' },
    };

    const folderMap: Record<string, { count: number; bytes: number }> = {};

    files.forEach((f) => {
      const size = f.file_size || 0;
      totalBytes += size;
      const cat = f.category || 'other';

      if (catMap[cat]) {
        catMap[cat].count += 1;
        catMap[cat].bytes += size;
      }

      const fol = f.folder || 'Gốc';
      if (!folderMap[fol]) {
        folderMap[fol] = { count: 0, bytes: 0 };
      }
      folderMap[fol].count += 1;
      folderMap[fol].bytes += size;
    });

    catMap.all = {
      count: files.length,
      bytes: totalBytes,
      formatted: formatFileSize(totalBytes),
    };

    Object.keys(catMap).forEach((k) => {
      const key = k as FileCategory;
      catMap[key].formatted = formatFileSize(catMap[key].bytes);
    });

    const customFolders = getCustomFolders();
    const computedFolders: FolderItem[] = customFolders.map((cf) => {
      const stats = folderMap[cf.name] || { count: 0, bytes: 0 };
      return {
        ...cf,
        fileCount: cf.id === 'all' ? files.length : stats.count,
        totalSizeBytes: cf.id === 'all' ? totalBytes : stats.bytes,
      };
    });

    // Add any missing folders created dynamically
    Object.keys(folderMap).forEach((folName) => {
      if (!computedFolders.some((f) => f.name.toLowerCase() === folName.toLowerCase())) {
        computedFolders.push({
          id: `folder_${Math.random().toString(36).substring(2, 6)}`,
          name: folName,
          fileCount: folderMap[folName].count,
          totalSizeBytes: folderMap[folName].bytes,
          color: 'text-indigo-500',
        });
      }
    });

    return {
      connected: true,
      bucket: 'minhnld2',
      endpoint: 'eb6f53f5795c23b1f75e360674a4650b.r2.cloudflarestorage.com',
      totalFiles: files.length,
      totalSizeBytes: totalBytes,
      totalSizeFormatted: formatFileSize(totalBytes),
      categoryBreakdown: catMap,
      folders: computedFolders,
    };
  },
};
