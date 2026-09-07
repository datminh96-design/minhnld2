import { getFileExtension, sanitizeFileName } from './file-utils';

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit per file

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  extension?: string;
}

export function validateFileForUpload(
  fileName: string,
  fileSize: number,
  _mimeType?: string
): FileValidationResult {
  if (!fileName || fileName.trim().length === 0) {
    return {
      valid: false,
      error: 'Tên file không hợp lệ hoặc bị trống.',
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: 'File rỗng (0 bytes). Vui lòng chọn file hợp lệ.',
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File vượt quá dung lượng cho phép (${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
    };
  }

  const ext = getFileExtension(fileName);
  if (!ext) {
    return {
      valid: false,
      error: 'File không có phần mở rộng (extension). Vui lòng kiểm tra lại.',
    };
  }

  const bannedExtensions = new Set(['exe', 'bat', 'sh', 'cmd', 'vbs', 'com', 'scr', 'msi', 'dll']);
  if (bannedExtensions.has(ext)) {
    return {
      valid: false,
      error: `Định dạng .${ext} có nguy cơ bảo mật và không được phép tải lên.`,
    };
  }

  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  const sanitizedBase = sanitizeFileName(baseName);
  const sanitizedName = `${sanitizedBase}.${ext}`;

  return {
    valid: true,
    sanitizedName,
    extension: ext,
  };
}
