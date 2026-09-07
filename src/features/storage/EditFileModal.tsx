import React, { useState } from 'react';
import { X, Edit3, Folder, FileText, Save, Loader2 } from 'lucide-react';
import { FileMetadata, FolderItem } from '../../types/file';

interface EditFileModalProps {
  file: FileMetadata | null;
  folders: FolderItem[];
  onClose: () => void;
  onSave: (fileId: string, updates: { file_name: string; folder: string; description: string }) => Promise<void>;
}

export const EditFileModal: React.FC<EditFileModalProps> = ({
  file,
  folders,
  onClose,
  onSave,
}) => {
  if (!file) return null;

  const [fileName, setFileName] = useState(file.file_name);
  const [folder, setFolder] = useState(file.folder || 'Gốc');
  const [description, setDescription] = useState(file.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setError('Tên file không được để trống');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(file.id, {
        file_name: fileName.trim(),
        folder,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Chỉnh Sửa Thông Tin File (Admin)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Tên hiển thị file:
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              placeholder="Nhập tên file..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-blue-500" /> Thư mục lưu trữ:
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Ghi chú / Mô tả file:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-none"
              placeholder="Thêm mô tả về tài liệu, chứng từ..."
            />
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">R2 Object Key:</span>{' '}
            <code className="text-[10px] break-all font-mono">{file.object_key}</code>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
