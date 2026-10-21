import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TransactionProcessItem, TransactionProcessState } from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Activity,
  Cloud,
  HardDrive,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Compact badge for an individual transaction row showing its real-time status:
 * - Đang xử lý (Processing)
 * - Hoàn tất (Completed)
 * - Lỗi (Error + Retry button)
 */
export const TransactionRowStatusBadge: React.FC<{ txId: string }> = ({ txId }) => {
  const { txProcessLogs, retryTransactionSync } = useData();

  const processItem = useMemo(
    () => txProcessLogs.find((item) => item.txId === txId),
    [txProcessLogs, txId]
  );

  // Default to "Hoàn tất" for existing synced transactions, or show live status if in process log
  const status: TransactionProcessState = processItem ? processItem.status : 'completed';

  if (status === 'processing') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
        title={processItem?.stepMessage || 'Giao dịch đang được xử lý và đồng bộ lên đám mây'}
      >
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        <span>Đang xử lý ({processItem?.progress || 50}%)</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
          title={processItem?.errorDetail || processItem?.stepMessage || 'Lỗi đồng bộ đám mây'}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Lỗi đồng bộ</span>
        </span>
        {processItem && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              retryTransactionSync(processItem.id);
            }}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors cursor-pointer"
            title="Thử đồng bộ lại giao dịch này"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Thử lại</span>
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
      title={
        processItem?.durationMs
          ? `Hoàn tất trong ${processItem.durationMs}ms • Đã lưu & đồng bộ an toàn`
          : 'Giao dịch đã hoàn tất và lưu trữ an toàn'
      }
    >
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      <span>Hoàn tất</span>
    </span>
  );
};

/**
 * Inline Real-Time Transaction Status Bar & Activity Feed for ExpensesView / InvestmentsView
 */
export const RealtimeTransactionInlineBanner: React.FC<{
  filterCategory?: 'expense_income' | 'investment' | 'all';
}> = ({ filterCategory = 'all' }) => {
  const {
    txProcessLogs,
    activeTxProcess,
    retryTransactionSync,
    clearTxProcessLogs,
    userSettings,
  } = useData();

  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'error'>('all');

  const relevantLogs = useMemo(() => {
    return txProcessLogs.filter((item) => {
      if (filterCategory === 'expense_income') {
        return item.txType === 'expense' || item.txType === 'income' || item.txType === 'investment';
      }
      if (filterCategory === 'investment') {
        return item.txType === 'investment';
      }
      return true;
    });
  }, [txProcessLogs, filterCategory]);

  const counts = useMemo(() => {
    let processing = 0;
    let completed = 0;
    let error = 0;
    relevantLogs.forEach((item) => {
      if (item.status === 'processing') processing++;
      else if (item.status === 'completed') completed++;
      else if (item.status === 'error') error++;
    });
    return { total: relevantLogs.length, processing, completed, error };
  }, [relevantLogs]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === 'all') return relevantLogs;
    return relevantLogs.filter((item) => item.status === statusFilter);
  }, [relevantLogs, statusFilter]);

  const latestItem: TransactionProcessItem | null = activeTxProcess || relevantLogs[0] || null;

  const formatTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
      {/* Top Real-time Status Bar */}
      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/50">
        {/* Left: Live Status Indicator & Latest Transaction Pipeline */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              counts.processing > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                : counts.error > 0
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
            }`}
          >
            {counts.processing > 0 ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : counts.error > 0 ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">
                Trạng Thái Giao Dịch Thời Gian Thực
              </span>

              {/* Live state badge */}
              {counts.processing > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Đang xử lý ({counts.processing})
                </span>
              ) : counts.error > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Có {counts.error} giao dịch lỗi đồng bộ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hoàn tất tức thì (0ms)
                </span>
              )}
            </div>

            {latestItem ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[260px] sm:max-w-xs">
                  {latestItem.title}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {latestItem.stepMessage}
                </span>
                {latestItem.durationMs && latestItem.status === 'completed' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <Clock className="w-2.5 h-2.5" /> {latestItem.durationMs}ms
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mọi giao dịch mới được ghi nhận tức thì vào bộ nhớ và đồng bộ tự động lên đám mây theo thời gian thực.
              </p>
            )}
          </div>
        </div>

        {/* Right: 3 Status Counters & Toggle Details Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('processing');
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'processing' && isExpanded
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
              title="Xem các giao dịch đang xử lý"
            >
              <Loader2 className={`w-3 h-3 ${counts.processing > 0 ? 'animate-spin' : ''}`} />
              <span>Đang xử lý: {counts.processing}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter('completed');
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'completed' && isExpanded
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
              title="Xem các giao dịch đã hoàn tất"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Hoàn tất: {counts.completed}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter('error');
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'error' && isExpanded
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
              title="Xem các giao dịch gặp lỗi đồng bộ"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Lỗi: {counts.error}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isExpanded) setStatusFilter('all');
              setIsExpanded(!isExpanded);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết tiến trình'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Live Progress Bar when a transaction is actively processing or recently triggered */}
      {latestItem && (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              latestItem.status === 'processing'
                ? 'bg-amber-500'
                : latestItem.status === 'error'
                ? 'bg-rose-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${latestItem.progress}%` }}
          />
        </div>
      )}

      {/* Expandable 3-Stage Pipeline & Real-time Transaction Process History */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4 animate-in fade-in duration-150">
          {/* 3-Step Visual Pipeline for Latest Transaction */}
          {latestItem && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Tiến trình giao dịch gần nhất:
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {latestItem.title}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Lúc {formatTime(latestItem.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Step 1: Local Instant Commit */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <HardDrive className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      1. Ghi nhận tức thì (0ms)
                    </p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
                      Đã lưu bộ nhớ thiết bị
                    </p>
                  </div>
                </div>

                {/* Step 2: Realtime & Cloud Sync */}
                <div
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                    latestItem.status === 'processing'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : latestItem.status === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/25'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 ${
                      latestItem.status === 'processing'
                        ? 'bg-amber-500'
                        : latestItem.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                  >
                    {latestItem.status === 'processing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-bold ${
                        latestItem.status === 'processing'
                          ? 'text-amber-700 dark:text-amber-300'
                          : latestItem.status === 'error'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      2. Đồng bộ Cloud & Realtime
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {latestItem.status === 'processing'
                        ? 'Đang truyền dữ liệu đa tầng...'
                        : latestItem.status === 'error'
                        ? 'Gián đoạn kết nối Cloud'
                        : 'Đã đồng bộ Supabase Cloud'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Final Verification */}
                <div
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                    latestItem.status === 'processing'
                      ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      : latestItem.status === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/25'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      latestItem.status === 'processing'
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        : latestItem.status === 'error'
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {latestItem.status === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-bold ${
                        latestItem.status === 'processing'
                          ? 'text-slate-500 dark:text-slate-400'
                          : latestItem.status === 'error'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      3. {latestItem.status === 'processing' ? 'Đang xác thực...' : latestItem.status === 'error' ? 'Lỗi (Đã lưu dự phòng)' : 'Hoàn tất 100%'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {latestItem.durationMs ? `Thời gian xử lý: ${latestItem.durationMs}ms` : 'Đang hoàn tất...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter & History Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Tất cả ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('processing')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'processing'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Đang xử lý ({counts.processing})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Hoàn tất ({counts.completed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('error')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'error'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Lỗi ({counts.error})
              </button>
            </div>

            {relevantLogs.length > 0 && (
              <button
                type="button"
                onClick={clearTxProcessLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa nhật ký</span>
              </button>
            )}
          </div>

          {/* Transaction Process Items List */}
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-400">
              Chưa có giao dịch nào trong trạng thái này. Hãy thêm hoặc chỉnh sửa một giao dịch để theo dõi tiến trình thời gian thực.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredLogs.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.txType === 'income'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : item.txType === 'investment'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {item.txType === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : item.txType === 'investment' ? (
                        <Coins className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 ${
                          item.status === 'processing'
                            ? 'text-amber-600 dark:text-amber-400'
                            : item.status === 'error'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.stepMessage}
                      </p>
                    </div>
                  </div>

                  {/* Right Status Badge & Action */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.status === 'processing' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý ({item.progress}%)</span>
                      </span>
                    )}

                    {item.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn tất{item.durationMs ? ` (${item.durationMs}ms)` : ''}</span>
                      </span>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Lỗi</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => retryTransactionSync(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Thử lại</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Global Floating Real-Time Transaction Progress Widget
 * Appears automatically at bottom-left when a transaction is triggered
 */
export const RealtimeTransactionFloatingWidget: React.FC = () => {
  const { activeTxProcess, dismissActiveTxProcess, retryTransactionSync } = useData();

  return (
    <AnimatePresence>
      {activeTxProcess && (
        <motion.div
          key={activeTxProcess.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 left-5 z-[95] max-w-sm w-[calc(100vw-2.5rem)] sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden pointer-events-auto"
        >
          <div className="p-3.5 flex items-start gap-3">
            {/* Status Icon */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                activeTxProcess.status === 'processing'
                  ? 'bg-amber-500/15 text-amber-500'
                  : activeTxProcess.status === 'error'
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}
            >
              {activeTxProcess.status === 'processing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : activeTxProcess.status === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    activeTxProcess.status === 'processing'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : activeTxProcess.status === 'error'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {activeTxProcess.status === 'processing'
                    ? `Đang xử lý (${activeTxProcess.progress}%)`
                    : activeTxProcess.status === 'error'
                    ? 'Lỗi đồng bộ'
                    : `Hoàn tất (${activeTxProcess.durationMs || 15}ms)`}
                </span>

                <button
                  type="button"
                  onClick={dismissActiveTxProcess}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors cursor-pointer"
                  aria-label="Đóng tiến trình"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                {activeTxProcess.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeTxProcess.subtitle}
              </p>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 flex items-center justify-between">
                <span>{activeTxProcess.stepMessage}</span>
                {activeTxProcess.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => retryTransactionSync(activeTxProcess.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Thử lại
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                activeTxProcess.status === 'processing'
                  ? 'bg-amber-500'
                  : activeTxProcess.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${activeTxProcess.progress}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
