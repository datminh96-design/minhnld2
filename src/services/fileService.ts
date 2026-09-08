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
import {
  getPresignedUploadUrl as directPresignedUpload,
  getPresignedDownloadUrl as directPresignedDownload,
  getPresignedPreviewUrl as directPresignedPreview,
  generateR2ObjectKey,
  deleteFromR2 as directDeleteFromR2,
  listR2Objects,
  R2_CONFIG,
} from '../lib/r2';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'minh_personal_files_metadata';
const LOCAL_FOLDERS_KEY = 'minh_personal_storage_folders';

export const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'all', name: 'Tất cả thư mục', fileCount: 0, totalSizeBytes: 0, color: 'text-slate-500' },
  { id: 'root', name: 'Gốc', fileCount: 0, totalSizeBytes: 0, color: 'text-blue-500' },
  { id: 'documents', name: 'Tài liệu & Hợp đồng', fileCount: 0, totalSizeBytes: 0, color: 'text-indigo-500' },
  { id: 'invoices', name: 'Hóa đơn & Chứng từ', fileCount: 0, totalSizeBytes: 0, color: 'text-emerald-500' },
  { id: 'reports', name: 'Báo cáo tài chính', fileCount: 0, totalSizeBytes: 0, color: 'text-amber-500' },
  { id: 'investments', name: 'Đầu tư & Danh mục', fileCount: 0, totalSizeBytes: 0, color: 'text-purple-500' },
  { id: 'media', name: 'Hình ảnh & Media', fileCount: 0, totalSizeBytes: 0, color: 'text-rose-500' },
];

export function getStoredLocalFiles(): FileMetadata[] {
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

export function saveLocalFiles(files: FileMetadata[]): void {
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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
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
  // Đồng bộ cấu trúc thư mục lên Supabase để tất cả các máy đều nhận được
  syncFoldersToSupabase(folders).catch((err) => {
    console.warn('Sync folders to Supabase warning:', err);
  });
}

/**
 * Lấy User ID hiện tại hoặc fallback sang định danh admin chung
 */
async function getCurrentUserId(): Promise<string> {
  try {
    const { client } = getSupabaseClient();
    if (client) {
      const { data } = await client.auth.getUser();
      if (data?.user?.id) return data.user.id;
    }
  } catch (e) {
    // Ignore
  }
  return 'admin123';
}

/**
 * Trích xuất tên file gốc thân thiện từ R2 Object Key
 * Ví dụ: "uploads/admin123/2026/09/1725791234-abcd-IMG_9446.png" -> "IMG_9446.png"
 */
function extractFileNameFromKey(key: string): string {
  const parts = key.split('/');
  const rawLastPart = parts[parts.length - 1] || 'file';
  // Regex kiểm tra tiền tố timestamp-random: ^\d{8,14}-[a-z0-9]+-(.+)$
  const match = rawLastPart.match(/^\d+-[a-z0-9]+-(.+)$/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return decodeURIComponent(rawLastPart);
}

/**
 * Đồng bộ danh sách file lên Supabase Cloud Database (storage_files + work_settings JSON backup)
 */
async function syncFilesToSupabase(files: FileMetadata[]): Promise<void> {
  const { client, isConfigured } = getSupabaseClient();
  if (!client || !isConfigured || files.length === 0) return;

  const userId = await getCurrentUserId();

  // 1. Cố gắng ghi vào bảng `storage_files`
  try {
    const payload = files.map((f) => ({
      id: f.id,
      user_id: f.user_id || userId,
      file_name: f.file_name,
      original_name: f.original_name,
      object_key: f.object_key,
      mime_type: f.mime_type,
      file_size: f.file_size,
      folder: f.folder || 'Gốc',
      category: f.category || 'other',
      description: f.description || '',
      extension: f.extension || '',
      created_at: f.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await client.from('storage_files').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    // Bảng storage_files có thể chưa tồn tại trong Supabase, tiếp tục lưu vào JSON backup
  }

  // 2. Lưu vào JSON backup trong `work_settings` hoặc `user_settings` để đảm bảo 100% mọi thiết bị đều đọc được
  try {
    const { data: existingWs } = await client
      .from('work_settings')
      .select('id, salary_data')
      .eq('user_id', userId)
      .maybeSingle();

    const existingSalaryData = existingWs?.salary_data || {};
    const updatedSalaryData = {
      ...existingSalaryData,
      storage_files_backup: files,
    };

    await client.from('work_settings').upsert({
      user_id: userId,
      salary_data: updatedSalaryData,
      updated_at: new Date().toISOString(),
    });
  } catch (errWs) {
    console.warn('Backup files to work_settings warning:', errWs);
  }
}

/**
 * Đồng bộ danh sách thư mục lên Supabase
 */
async function syncFoldersToSupabase(folders: FolderItem[]): Promise<void> {
  const { client, isConfigured } = getSupabaseClient();
  if (!client || !isConfigured) return;

  const userId = await getCurrentUserId();
  try {
    const { data: existingWs } = await client
      .from('work_settings')
      .select('id, salary_data')
      .eq('user_id', userId)
      .maybeSingle();

    const existingSalaryData = existingWs?.salary_data || {};
    const updatedSalaryData = {
      ...existingSalaryData,
      storage_folders_backup: folders,
    };

    await client.from('work_settings').upsert({
      user_id: userId,
      salary_data: updatedSalaryData,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Sync folders to Supabase warning:', err);
  }
}

/**
 * Tải danh sách file từ Supabase Cloud Database
 */
async function fetchFilesFromSupabase(): Promise<FileMetadata[]> {
  const { client, isConfigured } = getSupabaseClient();
  if (!client || !isConfigured) return [];

  const foundFiles: FileMetadata[] = [];
  const userId = await getCurrentUserId();

  // 1. Thử lấy từ bảng `storage_files`
  try {
    const { data, error } = await client
      .from('storage_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((row: any) => {
        foundFiles.push({
          id: row.id,
          user_id: row.user_id,
          file_name: row.file_name || row.original_name,
          original_name: row.original_name || row.file_name,
          object_key: row.object_key,
          mime_type: row.mime_type || 'application/octet-stream',
          file_size: Number(row.file_size) || 0,
          folder: row.folder || 'Gốc',
          category: row.category || getFileCategory(row.mime_type, row.extension),
          description: row.description || '',
          extension: row.extension || '',
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        });
      });
      return foundFiles;
    }
  } catch (err) {
    // Ignore and fallback to JSON backup
  }

  // 2. Thử lấy từ JSON backup trong `work_settings`
  try {
    const { data: wsData, error: wsError } = await client
      .from('work_settings')
      .select('salary_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wsError && wsData?.salary_data?.storage_files_backup) {
      const backupFiles = wsData.salary_data.storage_files_backup;
      if (Array.isArray(backupFiles)) {
        return backupFiles;
      }
    }
  } catch (errWs) {
    console.warn('Fetch files from work_settings backup warning:', errWs);
  }

  return foundFiles;
}

/**
 * Tải danh sách thư mục từ Supabase
 */
async function fetchFoldersFromSupabase(): Promise<FolderItem[] | null> {
  const { client, isConfigured } = getSupabaseClient();
  if (!client || !isConfigured) return null;

  try {
    const userId = await getCurrentUserId();
    const { data: wsData, error: wsError } = await client
      .from('work_settings')
      .select('salary_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wsError && wsData?.salary_data?.storage_folders_backup) {
      const folders = wsData.salary_data.storage_folders_backup;
      if (Array.isArray(folders) && folders.length > 0) {
        return folders;
      }
    }
  } catch (err) {
    // Ignore
  }
  return null;
}

export const fileService = {
  /**
   * Request a Presigned PUT Upload URL from server or direct S3
   */
  async getPresignedUploadUrl(
    file: File,
    folder: string = 'Gốc',
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

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.uploadUrl) {
          return json;
        }
      }
    } catch (apiError: any) {
      console.warn('API Presign server call failed, engaging direct S3 presigner fallback:', apiError);
    }

    // Direct Client-side S3 Presigner Fallback (Hoạt động 100% trên Vercel và mọi thiết bị)
    try {
      const userId = await getCurrentUserId();
      const objectKey = generateR2ObjectKey(userId, file.name);
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresInSeconds = 3600;

      const directResult = await directPresignedUpload(
        objectKey,
        file.type || 'application/octet-stream',
        expiresInSeconds,
        R2_CONFIG.defaultBucket
      );

      if (directResult.success && directResult.url) {
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
        return {
          success: true,
          uploadUrl: directResult.url,
          objectKey,
          fileId,
          expiresAt,
          bucket: directResult.bucket || R2_CONFIG.defaultBucket,
        };
      }
      throw new Error(directResult.error || 'Không thể tạo liên kết tải lên Cloudflare R2');
    } catch (fallbackErr: any) {
      console.error('Direct fallback presign error:', fallbackErr);
      throw new Error(fallbackErr.message || 'Lỗi tạo liên kết tải lên Cloudflare R2');
    }
  },

  /**
   * Upload file directly to Cloudflare R2 via XMLHttpRequest with Progress
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
          reject(new Error(`Tải lên Cloudflare R2 thất bại với mã lỗi HTTP ${xhr.status}.`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Lỗi mạng hoặc kết nối đến Cloudflare R2 bị gián đoạn.'));
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
   * Server-side Proxy Upload Fallback
   */
  uploadViaServerProxy(
    file: File,
    folder: string = 'Gốc',
    description: string = '',
    objectKey?: string,
    fileId?: string,
    onProgress?: (progress: number, bytesUploaded: number, speedBps: number) => void,
    onXhrCreated?: (xhr: XMLHttpRequest) => void
  ): Promise<FileMetadata> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (onXhrCreated) {
        onXhrCreated(xhr);
      }

      let lastTime = Date.now();
      let lastLoaded = 0;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
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

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.file) {
              const localFiles = getStoredLocalFiles();
              const filtered = localFiles.filter((f) => f.id !== data.file.id);
              const updatedList = [data.file, ...filtered];
              saveLocalFiles(updatedList);
              // Đồng bộ lên Supabase Cloud
              syncFilesToSupabase(updatedList).catch(() => {});
              if (onProgress) onProgress(100, file.size, 0);
              resolve(data.file);
              return;
            }
          } catch (jsonErr) {
            // fallback below
          }
        }
        reject(new Error(`Máy chủ proxy tải lên trả về lỗi ${xhr.status}`));
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Lỗi kết nối máy chủ khi tải lên file'));
      });

      xhr.open('POST', '/api/upload/direct', true);
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
      xhr.setRequestHeader('x-mime-type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-folder', encodeURIComponent(folder || 'Gốc'));
      xhr.setRequestHeader('x-description', encodeURIComponent(description || ''));
      if (objectKey) xhr.setRequestHeader('x-object-key', objectKey);
      if (fileId) xhr.setRequestHeader('x-file-id', fileId);

      xhr.send(file);
    });
  },

  /**
   * Complete the upload by recording metadata in Supabase + Local Cache
   */
  async completeUpload(
    objectKey: string,
    file: File,
    folder: string = 'Gốc',
    description?: string,
    fileId?: string
  ): Promise<FileMetadata> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const userId = await getCurrentUserId();
    const finalId = fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const metadataRecord: FileMetadata = {
      id: finalId,
      user_id: userId,
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

    // 1. Thử gửi lên API server (nếu đang chạy full-stack)
    try {
      fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: finalId,
          objectKey,
          originalFileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          folder: folder || 'Gốc',
          description: description || '',
        }),
      }).catch(() => {});
    } catch (e) {
      // Ignore API server fail on serverless/Vercel
    }

    // 2. Lưu vào Local Cache
    const localFiles = getStoredLocalFiles();
    const updatedList = [metadataRecord, ...localFiles.filter((f) => f.id !== finalId && f.object_key !== objectKey)];
    saveLocalFiles(updatedList);

    // 3. ĐỒNG BỘ TRỰC TIẾP LÊN SUPABASE CLOUD ĐỂ TẤT CẢ CÁC THIẾT BỊ ĐỀU THẤY
    try {
      await syncFilesToSupabase(updatedList);
    } catch (supabaseErr) {
      console.warn('Lỗi khi đồng bộ metadata lên Supabase:', supabaseErr);
    }

    return metadataRecord;
  },

  /**
   * Execute full upload pipeline for a single file with automatic fallback & multi-device cloud sync
   */
  async uploadFileItem(
    item: FileUploadItem,
    onUpdate: (updated: Partial<FileUploadItem>) => void
  ): Promise<FileMetadata> {
    onUpdate({ status: 'presigning', progress: 5 });

    let presignResult: PresignedUploadResponse | null = null;
    try {
      presignResult = await this.getPresignedUploadUrl(item.file, item.folder, item.description);
      onUpdate({
        status: 'uploading',
        progress: 10,
        objectKey: presignResult.objectKey,
      });

      // Thử tải trực tiếp lên Cloudflare R2
      await this.uploadDirectToR2(
        presignResult.uploadUrl,
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

      // Hoàn tất lưu thông tin lên Supabase và Cloud
      onUpdate({ status: 'completing', progress: 99 });
      const metadata = await this.completeUpload(
        presignResult.objectKey,
        item.file,
        item.folder,
        item.description,
        presignResult.fileId
      );

      onUpdate({
        status: 'completed',
        progress: 100,
        resultFile: metadata,
      });

      return metadata;
    } catch (directUploadError: any) {
      console.warn('Direct R2 upload encountered error, initiating server proxy fallback:', directUploadError);

      onUpdate({ status: 'uploading', progress: 15 });

      // Fallback 2: Server proxy
      try {
        const metadata = await this.uploadViaServerProxy(
          item.file,
          item.folder,
          item.description,
          presignResult?.objectKey,
          presignResult?.fileId,
          (progress, bytes, speed) => {
            onUpdate({
              progress: Math.max(15, Math.min(progress, 98)),
              bytesUploaded: bytes,
              uploadSpeedBps: speed,
            });
          },
          (xhr) => {
            onUpdate({ xhr });
          }
        );

        onUpdate({
          status: 'completed',
          progress: 100,
          resultFile: metadata,
        });

        return metadata;
      } catch (proxyError: any) {
        console.error('All upload methods failed:', proxyError);
        throw new Error(proxyError.message || directUploadError.message || 'Tải lên tập tin thất bại');
      }
    }
  },

  /**
   * List files with multi-device cloud sync: Supabase + Cloudflare R2 Auto-discovery
   */
  async listFiles(options?: {
    folder?: string;
    category?: FileCategory;
    search?: string;
    sortBy?: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
  }): Promise<{ files: FileMetadata[]; total: number; stats: StorageStats }> {
    // 1. Khởi tạo từ Local Storage trước để hiển thị ngay lập tức không bị giật màn hình
    let fileMap = new Map<string, FileMetadata>();
    const localFiles = getStoredLocalFiles();
    localFiles.forEach((f) => fileMap.set(f.object_key || f.id, f));

    // 2. Lấy dữ liệu file từ Supabase Cloud Database (Đảm bảo các máy khác mở app sẽ thấy ngay)
    try {
      const supabaseFiles = await fetchFilesFromSupabase();
      if (supabaseFiles.length > 0) {
        supabaseFiles.forEach((sf) => {
          fileMap.set(sf.object_key || sf.id, {
            ...fileMap.get(sf.object_key || sf.id),
            ...sf,
          });
        });
      }
    } catch (sbErr) {
      console.warn('Supabase fetch files warning:', sbErr);
    }

    // 3. Gọi thêm API server nếu có backend chạy
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          data.files.forEach((apiFile: FileMetadata) => {
            fileMap.set(apiFile.object_key || apiFile.id, {
              ...fileMap.get(apiFile.object_key || apiFile.id),
              ...apiFile,
            });
          });
        }
      }
    } catch (apiErr) {
      // Ignore API server fail on serverless
    }

    // 4. Khám phá trực tiếp các file đã upload trong Cloudflare R2 Bucket (Auto-Discovery từ S3)
    try {
      const r2List = await listR2Objects('uploads/', R2_CONFIG.defaultBucket);
      if (r2List.success && Array.isArray(r2List.objects) && r2List.objects.length > 0) {
        r2List.objects.forEach((obj, idx) => {
          if (!obj.key || obj.key.endsWith('/')) return;

          // Nếu file trên R2 chưa có trong metadata, tự động khôi phục thông tin
          if (!fileMap.has(obj.key)) {
            const fileName = extractFileNameFromKey(obj.key);
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const recoveredFile: FileMetadata = {
              id: `r2_${idx}_${obj.key.replace(/[^a-zA-Z0-9]/g, '_')}`,
              user_id: 'admin123',
              file_name: fileName,
              original_name: fileName,
              object_key: obj.key,
              mime_type: 'application/octet-stream',
              file_size: obj.size || 0,
              folder: 'Gốc',
              category: getFileCategory('', ext),
              description: 'Đồng bộ tự động từ Cloudflare R2',
              extension: ext,
              created_at: obj.lastModified?.toISOString() || new Date().toISOString(),
              updated_at: obj.lastModified?.toISOString() || new Date().toISOString(),
            };
            fileMap.set(obj.key, recoveredFile);
          }
        });
      }
    } catch (r2Err) {
      console.warn('Direct R2 listing warning:', r2Err);
    }

    // 5. Cập nhật lại danh sách hợp nhất vào LocalStorage và Supabase Cloud
    const allFiles = Array.from(fileMap.values());
    saveLocalFiles(allFiles);
    
    // Background sync to Supabase
    syncFilesToSupabase(allFiles).catch(() => {});

    // Đồng bộ danh mục thư mục từ Supabase nếu có
    fetchFoldersFromSupabase().then((sbFolders) => {
      if (sbFolders && sbFolders.length > 0) {
        saveCustomFolders(sbFolders);
      }
    }).catch(() => {});

    // 6. Lọc và tìm kiếm phía Client
    let filtered = [...allFiles];
    if (options?.folder && options.folder !== 'all') {
      filtered = filtered.filter((f) => (f.folder || 'Gốc').toLowerCase() === options.folder?.toLowerCase());
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
          (f.folder || 'Gốc').toLowerCase().includes(q)
      );
    }

    // 7. Sắp xếp
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

    const stats = this.computeStats(allFiles);
    return { files: filtered, total: filtered.length, stats };
  },

  /**
   * Request Presigned GET Download URL and trigger download
   */
  async downloadFile(fileId: string, fileName?: string): Promise<string> {
    const local = getStoredLocalFiles();
    const targetFile = local.find((f) => f.id === fileId || f.object_key === fileId);
    const objectKey = targetFile ? targetFile.object_key : fileId;
    const downloadName = fileName || targetFile?.file_name || 'download';

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/download`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          const a = document.createElement('a');
          a.href = data.url;
          a.download = downloadName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return data.url;
        }
      }
    } catch (err) {
      console.warn('API Download error, trying direct presigned download:', err);
    }

    // Direct S3 presigned download fallback
    try {
      const direct = await directPresignedDownload(objectKey, downloadName, 300, R2_CONFIG.defaultBucket);
      if (direct.success && direct.url) {
        const a = document.createElement('a');
        a.href = direct.url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return direct.url;
      }
    } catch (directErr) {
      console.error('Direct download error:', directErr);
    }

    throw new Error('Không thể tạo liên kết tải xuống file từ Cloudflare R2.');
  },

  /**
   * Request Presigned GET Preview URL for inline preview modal
   */
  async getPreviewUrl(fileId: string): Promise<string> {
    const local = getStoredLocalFiles();
    const targetFile = local.find((f) => f.id === fileId || f.object_key === fileId);
    const objectKey = targetFile ? targetFile.object_key : fileId;
    const mimeType = targetFile?.mime_type || 'application/octet-stream';

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/preview`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) return data.url;
      }
    } catch (err) {
      console.warn('API Preview error, trying direct presigned preview:', err);
    }

    // Direct S3 presigned preview fallback
    try {
      const direct = await directPresignedPreview(objectKey, mimeType, 600, R2_CONFIG.defaultBucket);
      if (direct.success && direct.url) {
        return direct.url;
      }
    } catch (directErr) {
      console.error('Direct preview error:', directErr);
    }

    throw new Error('Không thể tải URL xem trước từ Cloudflare R2.');
  },

  /**
   * Delete file from Cloudflare R2 & Database (Supabase + Local)
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const local = getStoredLocalFiles();
    const targetFile = local.find((f) => f.id === fileId || f.object_key === fileId);
    const remainingFiles = local.filter((f) => f.id !== fileId && f.object_key !== fileId);

    // 1. Thử gọi API Server
    try {
      fetch(`/api/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {
      // Ignore
    }

    // 2. Xóa trực tiếp từ Cloudflare R2
    if (targetFile?.object_key) {
      try {
        await directDeleteFromR2(targetFile.object_key, R2_CONFIG.defaultBucket);
      } catch (r2Err) {
        console.warn('Direct R2 delete warning:', r2Err);
      }
    }

    // 3. Xóa từ Supabase Cloud Database
    try {
      const { client } = getSupabaseClient();
      if (client) {
        if (targetFile?.id) {
          await client.from('storage_files').delete().eq('id', targetFile.id);
        }
        if (targetFile?.object_key) {
          await client.from('storage_files').delete().eq('object_key', targetFile.object_key);
        }
      }
    } catch (sbErr) {
      console.warn('Supabase delete warning:', sbErr);
    }

    // 4. Lưu lại Local & Supabase Backup
    saveLocalFiles(remainingFiles);
    syncFilesToSupabase(remainingFiles).catch(() => {});

    return true;
  },

  /**
   * Update file metadata (Rename, Move folder, Edit description) across Supabase & Local
   */
  async updateFileMetadata(
    fileId: string,
    updates: { file_name?: string; folder?: string; description?: string }
  ): Promise<FileMetadata> {
    const local = getStoredLocalFiles();
    const idx = local.findIndex((f) => f.id === fileId || f.object_key === fileId);

    if (idx < 0) {
      throw new Error('Không tìm thấy file để cập nhật');
    }

    const updatedItem: FileMetadata = {
      ...local[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    local[idx] = updatedItem;
    saveLocalFiles(local);

    // 1. Thử gửi lên API server
    try {
      fetch(`/api/files/${encodeURIComponent(fileId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(() => {});
    } catch (e) {
      // Ignore
    }

    // 2. Cập nhật vào Supabase Cloud
    try {
      const { client } = getSupabaseClient();
      if (client) {
        await client
          .from('storage_files')
          .update({
            file_name: updatedItem.file_name,
            folder: updatedItem.folder,
            description: updatedItem.description,
            updated_at: updatedItem.updated_at,
          })
          .eq('id', updatedItem.id);
      }
    } catch (sbErr) {
      console.warn('Supabase update file metadata warning:', sbErr);
    }

    // Đồng bộ lại toàn bộ backup
    syncFilesToSupabase(local).catch(() => {});

    return updatedItem;
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
