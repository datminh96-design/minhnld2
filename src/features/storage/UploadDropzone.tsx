import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  FileArchive,
  Code,
  Folder,
  AlertCircle,
  Plus
} from 'lucide-react';
import { MAX_FILE_SIZE_BYTES } from '../../lib/file-validation';
import { FolderItem } from '../../types/file';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[], folder: string, description: string) => void;
  folders: FolderItem[];
  currentFolder: string;
  disabled?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  folders,
  currentFolder,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>(
    currentFolder && currentFolder !== 'all' ? currentFolder : 'Gốc'
  );
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  const processSelectedFiles = (files: File[]) => {
    setValidationError(null);
    if (files.length === 0) return;

    // Validate size limit
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setValidationError(
        `Có ${oversized.length} file vượt quá giới hạn 500MB (${oversized.map((f) => f.name).join(', ')})`
      );
      return;
    }

    onFilesSelected(files, selectedFolder, description);
    setDescription('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Tải Lên Cloudflare R2 (Trực Tiếp Từ Trình Duyệt)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hỗ trợ mọi định dạng file • Tối đa 500MB/file • Tự động mã hóa và tạo Presigned URL
          </p>
        </div>

        {/* Folder selection */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-blue-500" />
            Lưu vào thư mục:
          </label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            {folders
              .filter((f) => f.id !== 'all')
              .map((f) => (
                <option key={f.id} value={f.name}>
                  📁 {f.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {validationError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
          Kéo & Thả files vào đây hoặc <span className="text-purple-600 dark:text-purple-400 underline decoration-purple-400/50">Chọn từ máy tính</span>
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md">
          Hỗ trợ upload hàng loạt nhiều file cùng lúc với thanh tiến trình thời gian thực
        </p>

        {/* Supported format badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex items-center gap-1">
            <FileText className="w-3 h-3" /> PDF, Word, TXT
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3" /> Excel, CSV
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-900 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> JPG, PNG, WEBP
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 flex items-center gap-1">
            <Film className="w-3 h-3" /> MP4, MOV
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
            <Music className="w-3 h-3" /> MP3, WAV
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 flex items-center gap-1">
            <FileArchive className="w-3 h-3" /> ZIP, RAR
          </span>
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900 flex items-center gap-1">
            <Code className="w-3 h-3" /> Code & Data
          </span>
        </div>
      </div>
    </div>
  );
};
