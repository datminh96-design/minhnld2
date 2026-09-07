export type FileCategory =
  | 'all'
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'other';

export interface FileMetadata {
  id: string;
  user_id: string;
  user_email?: string;
  file_name: string;
  original_name: string;
  object_key: string;
  mime_type: string;
  file_size: number;
  folder: string;
  category: FileCategory;
  description?: string;
  extension: string;
  created_at: string;
  updated_at: string;
  download_url?: string;
  preview_url?: string;
  is_public?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  fileCount: number;
  totalSizeBytes: number;
}

export type UploadStatus =
  | 'idle'
  | 'queued'
  | 'presigning'
  | 'uploading'
  | 'completing'
  | 'completed'
  | 'error'
  | 'canceled';

export interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  folder: string;
  description?: string;
  progress: number; // 0 to 100
  bytesUploaded: number;
  uploadSpeedBps: number;
  status: UploadStatus;
  errorMessage?: string;
  xhr?: XMLHttpRequest;
  objectKey?: string;
  resultFile?: FileMetadata;
  startedAt?: number;
}

export interface PresignedUploadRequest {
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  folder?: string;
  description?: string;
}

export interface PresignedUploadResponse {
  success: boolean;
  uploadUrl: string;
  objectKey: string;
  fileId: string;
  expiresAt: string;
  bucket: string;
  error?: string;
}

export interface CompleteUploadRequest {
  fileId?: string;
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  folder?: string;
  description?: string;
}

export interface CompleteUploadResponse {
  success: boolean;
  file: FileMetadata;
  error?: string;
}

export interface StorageStats {
  connected: boolean;
  bucket: string;
  endpoint: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  categoryBreakdown: Record<FileCategory, { count: number; bytes: number; formatted: string }>;
  folders: FolderItem[];
}
