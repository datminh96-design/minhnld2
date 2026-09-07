import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Film,
  Music,
  Code,
  File,
  Loader2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { FileMetadata } from '../../types/file';
import { formatFileSize, isPreviewable } from '../../lib/file-utils';
import { fileService } from '../../services/fileService';

interface FilePreviewModalProps {
  file: FileMetadata | null;
  onClose: () => void;
  onDownload: (file: FileMetadata) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setTextContent(null);
    setZoomLevel(1);

    const loadPreview = async () => {
      try {
        const url = await fileService.getPreviewUrl(file.id);
        if (!isMounted) return;
        setPreviewUrl(url);

        // If it's a text/code/json/markdown file, fetch content to display directly
        const ext = file.extension?.toLowerCase() || '';
        if (['txt', 'json', 'md', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'sql', 'py'].includes(ext)) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              if (isMounted) setTextContent(text);
            }
          } catch (textErr) {
            console.warn('Could not read text content:', textErr);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Không thể tải bản xem trước file từ Cloudflare R2.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [file]);

  if (!file) return null;

  const ext = file.extension?.toLowerCase() || '';
  const canPreview = isPreviewable(file.mime_type, ext);

  const handleCopyLink = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderFileIcon = () => {
    switch (file.category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-pink-500" />;
      case 'video':
        return <Film className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-indigo-500" />;
      case 'code':
        return <Code className="w-5 h-5 text-cyan-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0">
              {renderFileIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-display">
                {file.file_name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>📁 {file.folder}</span>
                <span>•</span>
                <span>{new Date(file.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {previewUrl && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Sao chép liên kết xem trước R2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDownload(file)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải xuống</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-auto flex items-center justify-center relative">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="text-xs font-medium">Đang tải nội dung từ Cloudflare R2...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="max-w-md text-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Không thể xem trực tiếp file này
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => onDownload(file)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Tải file về máy để mở
              </button>
            </div>
          )}

          {!isLoading && !error && previewUrl && (
            <>
              {/* Image preview */}
              {file.category === 'image' && (
                <div className="relative max-w-full max-h-full flex flex-col items-center justify-center">
                  <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt={file.file_name}
                      className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md transition-transform duration-200"
                      style={{ transform: `scale(${zoomLevel})` }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Zoom Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md shadow-lg">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:text-purple-400"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 hover:text-purple-400"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 hover:text-purple-400"
                      title="Về kích thước chuẩn"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PDF preview */}
              {ext === 'pdf' && (
                <iframe
                  src={`${previewUrl}#toolbar=1`}
                  title={file.file_name}
                  className="w-full h-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white"
                />
              )}

              {/* Video preview */}
              {file.category === 'video' && (
                <div className="max-w-4xl w-full flex items-center justify-center">
                  <video
                    src={previewUrl}
                    controls
                    autoPlay={false}
                    className="w-full max-h-[70vh] rounded-xl shadow-2xl bg-black"
                  >
                    Trình duyệt của bạn không hỗ trợ phát thẻ video.
                  </video>
                </div>
              )}

              {/* Audio preview */}
              {file.category === 'audio' && (
                <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                    <Music className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {file.file_name}
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">{formatFileSize(file.file_size)}</p>
                  <audio src={previewUrl} controls className="w-full" autoPlay={false}>
                    Trình duyệt không hỗ trợ phát âm thanh.
                  </audio>
                </div>
              )}

              {/* Text / Code / JSON preview */}
              {(file.category === 'code' || textContent !== null) && (
                <div className="w-full h-full max-w-4xl bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto font-mono text-xs shadow-inner">
                  <pre className="whitespace-pre-wrap">{textContent || 'Đang tải nội dung văn bản...'}</pre>
                </div>
              )}

              {/* Office documents (Word, Excel, PowerPoint) / Non-previewable */}
              {!['image', 'video', 'audio', 'code'].includes(file.category) && ext !== 'pdf' && textContent === null && (
                <div className="max-w-md text-center p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                    {renderFileIcon()}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {file.file_name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Định dạng <strong className="uppercase">.{ext}</strong> cần ứng dụng chuyên dụng (Microsoft Office / LibreOffice) để hiển thị đầy đủ cấu trúc định dạng.
                  </p>
                  <button
                    type="button"
                    onClick={() => onDownload(file)}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Tải File Về Máy ({formatFileSize(file.file_size)})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
