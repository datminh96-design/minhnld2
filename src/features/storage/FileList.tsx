import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  FileArchive,
  Code,
  File as FileIcon,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Edit3,
  Copy,
  Check,
  Folder,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { FileMetadata } from '../../types/file';
import { formatFileSize } from '../../lib/file-utils';

interface FileListProps {
  files: FileMetadata[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  isAdmin: boolean;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onEdit: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onCopyLink: (file: FileMetadata) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  viewMode,
  isLoading,
  isAdmin,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onCopyLink,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (file: FileMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink(file);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  const renderFileIcon = (file: FileMetadata, size: 'sm' | 'md' | 'lg' = 'md') => {
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    };

    switch (file.category) {
      case 'image':
        return <ImageIcon className={`${iconSizes[size]} text-pink-500`} />;
      case 'video':
        return <Film className={`${iconSizes[size]} text-purple-500`} />;
      case 'audio':
        return <Music className={`${iconSizes[size]} text-amber-500`} />;
      case 'spreadsheet':
        return <FileSpreadsheet className={`${iconSizes[size]} text-emerald-500`} />;
      case 'archive':
        return <FileArchive className={`${iconSizes[size]} text-indigo-500`} />;
      case 'code':
        return <Code className={`${iconSizes[size]} text-cyan-500`} />;
      default:
        return <FileText className={`${iconSizes[size]} text-blue-500`} />;
    }
  };

  if (isLoading && files.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-sm w-3/4" />
            <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded-sm w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Folder className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1">
          Chưa có file nào trong danh mục này
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Kéo thả file ở khung bên trên hoặc nhấn nút "Tải Lên" để lưu trữ an toàn trên Cloudflare R2.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const isMenuOpen = activeMenuId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => onPreview(file)}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600/60 rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
              >
                {/* Top bar */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                    {renderFileIcon(file, 'md')}
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 text-xs font-medium animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onPreview(file);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" /> Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDownload(file);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-500" /> Tải về máy
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(file, e)}
                          className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          {copiedId === file.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Đã sao chép
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" /> Sao chép link
                            </>
                          )}
                        </button>

                        {isAdmin && (
                          <>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onEdit(file);
                              }}
                              className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Đổi tên / Chuyển mục
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onDelete(file);
                              }}
                              className="w-full px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Xóa khỏi R2
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* File Title */}
                <div className="mb-3">
                  <h4
                    className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug"
                    title={file.file_name}
                  >
                    {file.file_name}
                  </h4>
                  {file.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {file.description}
                    </p>
                  )}
                </div>

                {/* Meta details */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatFileSize(file.file_size)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium truncate max-w-[100px]">
                    📁 {file.folder}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tên File</th>
                  <th className="py-3 px-3">Thư mục</th>
                  <th className="py-3 px-3">Dung lượng</th>
                  <th className="py-3 px-3">Ngày Tải Lên</th>
                  <th className="py-3 px-3">Người Upload</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => onPreview(file)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {renderFileIcon(file, 'sm')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs md:max-w-md">
                            {file.file_name}
                          </p>
                          {file.description && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        📁 {file.folder}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatFileSize(file.file_size)}
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(file.created_at).toLocaleDateString('vi-VN')}
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {file.user_email || 'datminh96@gmail.com'}
                    </td>

                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onPreview(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                          title="Xem trước"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(file)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                          title="Tải về máy"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(file, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Sao chép link"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(file)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(file)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
