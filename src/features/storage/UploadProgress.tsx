import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  X,
  File as FileIcon,
  Loader2,
  Trash2,
  Zap
} from 'lucide-react';
import { FileUploadItem } from '../../types/file';
import { formatFileSize, formatUploadSpeed } from '../../lib/file-utils';

interface UploadProgressProps {
  items: FileUploadItem[];
  onCancelItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearCompleted: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  items,
  onCancelItem,
  onRetryItem,
  onRemoveItem,
  onClearCompleted,
}) => {
  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const inProgressCount = items.filter(
    (i) => i.status === 'uploading' || i.status === 'presigning' || i.status === 'completing'
  ).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
            {items.length}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Hàng Đợi Tải Lên Cloudflare R2
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {inProgressCount > 0
                ? `Đang xử lý ${inProgressCount} file...`
                : `Đã hoàn thành ${completedCount}/${items.length} file`}
              {errorCount > 0 && ` • ${errorCount} file lỗi`}
            </p>
          </div>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={onClearCompleted}
            className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Dọn danh sách đã xong ({completedCount})
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => {
          const isUploading =
            item.status === 'uploading' || item.status === 'presigning' || item.status === 'completing';
          const isDone = item.status === 'completed';
          const isErr = item.status === 'error';
          const isCanceled = item.status === 'canceled';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                  : isErr
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <FileIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {formatFileSize(item.size)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>📁 {item.folder}</span>
                      {isUploading && item.uploadSpeedBps > 0 && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                          <Zap className="w-3 h-3" />
                          {formatUploadSpeed(item.uploadSpeedBps)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions per item */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isUploading && (
                    <button
                      type="button"
                      onClick={() => onCancelItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Hủy tải lên"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {isErr && (
                    <button
                      type="button"
                      onClick={() => onRetryItem(item.id)}
                      className="px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Thử lại"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Thử lại
                    </button>
                  )}

                  {(isDone || isErr || isCanceled) && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Xóa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isDone
                        ? 'bg-emerald-500'
                        : isErr
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isDone
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isErr
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {item.status === 'queued' && (
                      <>
                        <Clock className="w-3 h-3" /> Đang chờ...
                      </>
                    )}
                    {item.status === 'presigning' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang tạo Presigned URL...
                      </>
                    )}
                    {item.status === 'uploading' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang tải trực tiếp lên R2 ({item.progress}%)
                      </>
                    )}
                    {item.status === 'completing' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu metadata...
                      </>
                    )}
                    {item.status === 'completed' && (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Đã tải lên R2 thành công (100%)
                      </>
                    )}
                    {item.status === 'error' && (
                      <>
                        <XCircle className="w-3 h-3" /> {item.errorMessage || 'Tải lên thất bại'}
                      </>
                    )}
                    {item.status === 'canceled' && (
                      <>
                        <X className="w-3 h-3" /> Đã hủy tải lên
                      </>
                    )}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {item.progress}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
