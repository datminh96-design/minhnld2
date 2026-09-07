import { FileCategory } from '../types/file';

/**
 * Format bytes into human readable string (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format upload speed (e.g. 1.5 MB/s)
 */
export function formatUploadSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Extract clean extension from filename (e.g. 'pdf', 'xlsx')
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase().trim() || '';
}

/**
 * Remove Vietnamese accents and special characters for safe cloud file naming
 */
export function sanitizeFileName(filename: string): string {
  if (!filename) return 'unnamed-file';
  
  // Normalize accents
  let str = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace Vietnamese specific letters
  str = str.replace(/[đĐ]/g, 'd');
  
  // Replace spaces and special characters with dash
  str = str
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return str || 'file';
}

/**
 * Categorize a file by MIME type or extension
 */
export function getFileCategory(mimeType: string, extension: string): FileCategory {
  const ext = extension.toLowerCase();
  const mime = mimeType.toLowerCase();

  // Images
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)
  ) {
    return 'image';
  }

  // Videos
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'mkv', 'avi', 'flv', 'wmv', 'm4v', '3gp'].includes(ext)
  ) {
    return 'video';
  }

  // Audio
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'wma', 'opus'].includes(ext)
  ) {
    return 'audio';
  }

  // Spreadsheets
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(ext)
  ) {
    return 'spreadsheet';
  }

  // Presentations
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['pptx', 'ppt', 'odp', 'key'].includes(ext)
  ) {
    return 'presentation';
  }

  // Documents
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('document') ||
    ['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'pages'].includes(ext)
  ) {
    return 'document';
  }

  // Archives
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('rar') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)
  ) {
    return 'archive';
  }

  // Code / Data
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('xml') ||
    mime.includes('html') ||
    ['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'sql', 'md', 'xml', 'yaml', 'yml'].includes(ext)
  ) {
    return 'code';
  }

  return 'other';
}

/**
 * Returns a human-friendly Vietnamese label for a category
 */
export function getCategoryLabel(category: FileCategory): string {
  switch (category) {
    case 'all':
      return 'Tất cả';
    case 'document':
      return 'Tài liệu (PDF, Word, Text)';
    case 'spreadsheet':
      return 'Bảng tính (Excel, CSV)';
    case 'presentation':
      return 'Trình chiếu (PowerPoint)';
    case 'image':
      return 'Hình ảnh';
    case 'video':
      return 'Video & Clip';
    case 'audio':
      return 'Âm thanh & Voice';
    case 'archive':
      return 'File nén (ZIP, RAR)';
    case 'code':
      return 'Mã nguồn & Dữ liệu';
    case 'other':
      return 'Khác';
  }
}

/**
 * Detect if file can be rendered directly in web preview modal
 */
export function isPreviewable(mimeType: string, extension: string): boolean {
  const ext = extension.toLowerCase();
  const mime = mimeType.toLowerCase();

  // Images
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return true;
  }

  // Videos
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) {
    return true;
  }

  // Audio
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return true;
  }

  // PDF
  if (mime.includes('pdf') || ext === 'pdf') {
    return true;
  }

  // Text / Code
  if (
    mime.startsWith('text/') ||
    ['txt', 'json', 'md', 'csv', 'js', 'ts', 'html', 'css', 'sql', 'xml'].includes(ext)
  ) {
    return true;
  }

  return false;
}
