import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardDrive,
  Cloud,
  UploadCloud,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  FileArchive,
  Code,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Zap,
  Sparkles,
  Filter,
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  FileMetadata,
  FileUploadItem,
  FileCategory,
  FolderItem,
  StorageStats,
} from '../../types/file';
import {
  fileService,
  getCustomFolders,
  saveCustomFolders,
  getStoredLocalFiles,
} from '../../services/fileService';
import { formatFileSize } from '../../lib/file-utils';
import { UploadDropzone } from './UploadDropzone';
import { UploadProgress } from './UploadProgress';
import { FileList } from './FileList';
import { FilePreviewModal } from './FilePreviewModal';
import { EditFileModal } from './EditFileModal';
import { NewFolderModal } from './NewFolderModal';

export const StorageView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useData();

  // Storage data states with initial local cache to prevent blank flicker
  const [files, setFiles] = useState<FileMetadata[]>(getStoredLocalFiles);
  const [folders, setFolders] = useState<FolderItem[]>(getCustomFolders);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'
  >('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Upload queue state
  const [showUploadZone, setShowUploadZone] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);

  // Modal states
  const [previewingFile, setPreviewingFile] = useState<FileMetadata | null>(null);
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState<FileMetadata | null>(null);

  // Storage stats
  const [stats, setStats] = useState<StorageStats | null>(null);

  // Load files from service quietly without wiping out existing list
  const loadFiles = useCallback(async (forceSkeleton = false) => {
    if (forceSkeleton) {
      setIsLoading(true);
    }
    try {
      const result = await fileService.listFiles({
        folder: selectedFolder,
        category: selectedCategory,
        search: searchQuery,
        sortBy,
      });
      setFiles(result.files);
      setStats(result.stats);
      setFolders(result.stats.folders);
    } catch (err: any) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    loadFiles(false);
  }, [loadFiles]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFiles(false);
    setIsRefreshing(false);
    addToast('Đã làm mới và đồng bộ danh sách tệp từ Supabase Cloud & Cloudflare R2', 'success');
  };

  // Handle files chosen for upload
  const handleFilesSelected = (selectedFiles: File[], folder: string, description: string) => {
    if (!isAdmin) {
      addToast('Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền tải file lên R2.', 'warning');
      return;
    }

    const newItems: FileUploadItem[] = selectedFiles.map((file) => ({
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      folder: folder || 'Gốc',
      description,
      progress: 0,
      bytesUploaded: 0,
      uploadSpeedBps: 0,
      status: 'queued',
      startedAt: Date.now(),
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);

    // Start uploading each new item in parallel
    newItems.forEach((item) => {
      startSingleUpload(item);
    });
  };

  const updateQueueItem = (id: string, updates: Partial<FileUploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const startSingleUpload = async (item: FileUploadItem) => {
    try {
      const metadata = await fileService.uploadFileItem(item, (updates) => {
        updateQueueItem(item.id, updates);
      });

      addToast(`Tải lên thành công: ${item.name}`, 'success');
      // Refresh list to show new file
      loadFiles();
    } catch (err: any) {
      console.error(`Upload error for ${item.name}:`, err);
      updateQueueItem(item.id, {
        status: 'error',
        errorMessage: err?.message || 'Tải lên thất bại',
      });
      addToast(`Lỗi tải lên ${item.name}: ${err?.message || 'Thất bại'}`, 'error');
    }
  };

  const handleCancelQueueItem = (id: string) => {
    const item = uploadQueue.find((i) => i.id === id);
    if (item?.xhr) {
      item.xhr.abort();
    }
    updateQueueItem(id, { status: 'canceled' });
  };

  const handleRetryQueueItem = (id: string) => {
    const item = uploadQueue.find((i) => i.id === id);
    if (item) {
      updateQueueItem(id, { status: 'queued', progress: 0, errorMessage: undefined });
      startSingleUpload(item);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCompleted = () => {
    setUploadQueue((prev) => prev.filter((i) => i.status !== 'completed'));
  };

  // Download handler
  const handleDownload = async (file: FileMetadata) => {
    try {
      addToast(`Đang tạo liên kết tải về cho ${file.file_name}...`, 'info');
      await fileService.downloadFile(file.id, file.file_name);
      addToast(`Bắt đầu tải file: ${file.file_name}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Không thể tải file.', 'error');
    }
  };

  // Delete handler
  const confirmDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      await fileService.deleteFile(deletingFile.id);
      addToast(`Đã xóa file ${deletingFile.file_name} khỏi Cloudflare R2`, 'success');
      setDeletingFile(null);
      loadFiles();
    } catch (err: any) {
      addToast(err?.message || 'Xóa file thất bại', 'error');
    }
  };

  // Edit metadata handler
  const handleSaveMetadata = async (
    fileId: string,
    updates: { file_name: string; folder: string; description: string }
  ) => {
    try {
      await fileService.updateFileMetadata(fileId, updates);
      addToast('Đã cập nhật thông tin file thành công', 'success');
      loadFiles();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi cập nhật', 'error');
      throw err;
    }
  };

  // Folder creation handler
  const handleCreateFolder = (folderName: string) => {
    const newFolder: FolderItem = {
      id: `folder_${Date.now()}`,
      name: folderName,
      fileCount: 0,
      totalSizeBytes: 0,
      color: 'text-purple-500',
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveCustomFolders(updated);
    setSelectedFolder(folderName);
    addToast(`Đã tạo thư mục mới: ${folderName}`, 'success');
  };

  // Copy link
  const handleCopyLink = async (file: FileMetadata) => {
    try {
      const previewUrl = await fileService.getPreviewUrl(file.id);
      await navigator.clipboard.writeText(previewUrl);
      addToast('Đã sao chép link truy cập an toàn R2 vào bộ nhớ tạm!', 'success');
    } catch {
      addToast('Không thể tạo link chia sẻ.', 'error');
    }
  };

  const categoriesConfig: Array<{ id: FileCategory; label: string; icon: any }> = [
    { id: 'all', label: 'Tất cả', icon: HardDrive },
    { id: 'document', label: 'Tài liệu (PDF, Word)', icon: FileText },
    { id: 'spreadsheet', label: 'Bảng tính (Excel)', icon: FileSpreadsheet },
    { id: 'image', label: 'Hình ảnh', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Film },
    { id: 'audio', label: 'Âm thanh', icon: Music },
    { id: 'archive', label: 'File nén', icon: FileArchive },
    { id: 'code', label: 'Mã nguồn & Dữ liệu', icon: Code },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Cloudflare R2 Connection Stats */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 rounded-3xl p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5 backdrop-blur-md">
                <Cloud className="w-3.5 h-3.5 text-purple-400" /> Cloudflare R2 Storage (Vercel + Supabase)
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> S3 Compatible Direct Upload
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
              <HardDrive className="w-6 h-6 text-purple-400 shrink-0" />
              Kho Lưu Trữ & Quản Lý Dữ Liệu Đám Mây
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Lưu trữ an toàn tập tin cá nhân, chứng từ, hóa đơn, bảng tính Excel, hình ảnh và tài liệu dự án trên bucket <strong className="text-purple-300 font-mono">{stats?.bucket || 'minhnld2'}</strong> với băng thông tải trực tiếp cực nhanh.
            </p>
          </div>

          {/* Quick Stats Metric Pill */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white/10 dark:bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Tổng Tập Tin</span>
              <span className="text-lg font-black font-display text-white">{stats?.totalFiles || files.length}</span>
            </div>
            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Dung Lượng Đã Dùng</span>
              <span className="text-lg font-black font-display text-emerald-300">{stats?.totalSizeFormatted || '0 B'}</span>
            </div>
            <div className="px-3 py-1">
              <span className="text-[10px] uppercase font-bold text-purple-200/80 block">Bucket R2</span>
              <span className="text-xs font-mono font-bold text-purple-300">{stats?.bucket || 'minhnld2'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone Section (Admin only or prompt) */}
      {isAdmin ? (
        <div className="space-y-4">
          <UploadDropzone
            onFilesSelected={handleFilesSelected}
            folders={folders}
            currentFolder={selectedFolder}
          />
          <UploadProgress
            items={uploadQueue}
            onCancelItem={handleCancelQueueItem}
            onRetryItem={handleRetryQueueItem}
            onRemoveItem={handleRemoveQueueItem}
            onClearCompleted={handleClearCompleted}
          />
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Chế độ Xem Khách (USER)</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Bạn có thể duyệt, xem trước và tải xuống mọi tài liệu. Đăng nhập quyền Admin để tải file lên hoặc xóa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Files Browser Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        {/* Controls Bar: Search, Sort, View Switcher & Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm file theo tên, mô tả, đuôi mở rộng..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Filters & View toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="date_desc">Mới nhất trước</option>
                <option value="date_asc">Cũ nhất trước</option>
                <option value="name_asc">Tên (A → Z)</option>
                <option value="name_desc">Tên (Z → A)</option>
                <option value="size_desc">Dung lượng lớn nhất</option>
                <option value="size_asc">Dung lượng nhỏ nhất</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng lưới thẻ (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng danh sách (List)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-500 hover:text-purple-600 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              title="Làm mới từ R2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Folders Pills Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-blue-500" /> Thư mục lưu trữ:
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(true)}
                className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Tạo thư mục mới
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {folders.map((folder) => {
              const isSelected =
                folder.id === 'all'
                  ? selectedFolder === 'all'
                  : selectedFolder.toLowerCase() === folder.name.toLowerCase();

              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolder(folder.id === 'all' ? 'all' : folder.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                  }`}
                >
                  <span>📁 {folder.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isSelected ? 'bg-purple-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {folder.fileCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoriesConfig.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = stats?.categoryBreakdown?.[cat.id]?.count ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Files View */}
        <FileList
          files={files}
          viewMode={viewMode}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onPreview={(file) => setPreviewingFile(file)}
          onDownload={handleDownload}
          onEdit={(file) => setEditingFile(file)}
          onDelete={(file) => setDeletingFile(file)}
          onCopyLink={handleCopyLink}
        />
      </div>

      {/* File Preview Modal */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Edit File Metadata Modal */}
      {editingFile && (
        <EditFileModal
          file={editingFile}
          folders={folders}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveMetadata}
        />
      )}

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Delete Confirmation Modal */}
      {deletingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Xác nhận xóa tập tin khỏi Cloudflare R2?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tập tin <strong className="text-slate-800 dark:text-slate-200">{deletingFile.file_name}</strong> ({formatFileSize(deletingFile.file_size)}) sẽ bị xóa vĩnh viễn khỏi bucket <code className="font-mono text-purple-600 dark:text-purple-400">{stats?.bucket || 'minhnld2'}</code> và cơ sở dữ liệu.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingFile(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
