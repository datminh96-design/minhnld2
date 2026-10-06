import React, { useState, useRef, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Cloud, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Database
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const SyncStatusIndicator: React.FC = () => {
  const { 
    isOnline, 
    syncStatus, 
    lastSyncedAt, 
    syncMessage, 
    syncWithSupabase, 
    loadingData 
  } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine effective status
  const isSyncing = syncStatus === 'syncing' || loadingData;
  const isOffline = !isOnline;
  
  // Status label
  let statusText: 'Online' | 'Syncing...' | 'Offline' = 'Online';
  if (isOffline) {
    statusText = 'Offline';
  } else if (isSyncing) {
    statusText = 'Syncing...';
  } else {
    statusText = 'Online';
  }

  // Format last synced time
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Vừa xong';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
    } catch {
      return 'Vừa xong';
    }
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSyncing && !isOffline) {
      await syncWithSupabase(true);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-xs font-medium shadow-xs ${
          isOffline
            ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            : isSyncing
            ? 'bg-amber-500/15 dark:bg-amber-950/40 border-amber-500/40 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/20'
            : 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
        }`}
        title={`Trạng thái đồng bộ: ${statusText} (Nhấn để xem chi tiết / đồng bộ)`}
        aria-label={`Trạng thái kết nối: ${statusText}`}
      >
        {/* Status Dot / Icon */}
        <div className="relative flex items-center justify-center">
          {isOffline ? (
            <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          ) : isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Text Label */}
        <div className="flex items-center gap-1">
          <span className="font-semibold tracking-tight">
            {statusText}
          </span>
          {/* Subtle icon indicator on hover */}
          {!isOffline && !isSyncing && (
            <Wifi className="w-3 h-3 text-emerald-500/70 hidden md:inline-block opacity-70 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>

      {/* Details Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isOffline
                    ? 'bg-rose-500/15 text-rose-500'
                    : isSyncing
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-emerald-500/15 text-emerald-500'
                }`}
              >
                {isOffline ? (
                  <WifiOff className="w-4 h-4" />
                ) : isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Trạng thái: {statusText}</span>
                  {statusText === 'Online' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isOffline
                    ? 'Không có kết nối Internet'
                    : isSyncing
                    ? 'Đang truyền nhận dữ liệu đám mây'
                    : 'Supabase Cloud & Realtime Active'}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isOffline
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : isSyncing
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {statusText}
            </span>
          </div>

          {/* Body details */}
          <div className="py-2.5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Đồng bộ gần nhất:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatSyncTime(lastSyncedAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Kênh sao lưu:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Đa tầng (Cloud + Shadow Log)
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              {isOffline
                ? 'Mọi thay đổi khi ngoại tuyến sẽ được lưu cục bộ an toàn và tự động đồng bộ ngay khi có kết nối mạng.'
                : 'Dữ liệu được bảo vệ và đồng bộ tự động 2 chiều tức thì giữa các thiết bị thông qua cơ chế Realtime Broadcast.'}
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {syncMessage || 'Đã đồng bộ'}
            </span>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || isOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-medium text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
