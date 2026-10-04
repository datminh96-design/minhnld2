import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatPercent, getCurrentMonthPrefix, isInvestmentTransaction } from '../../lib/utils';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Settings2, 
  TrendingUp, 
  ArrowUpRight, 
  Sparkles,
  Info,
  Flame,
  PieChart
} from 'lucide-react';
import { BudgetConfigModal } from './BudgetConfigModal';

interface BudgetTrackerCardProps {
  onOpenTransactions?: () => void;
  compact?: boolean;
}

export const BudgetTrackerCard: React.FC<BudgetTrackerCardProps> = ({
  onOpenTransactions,
  compact = false,
}) => {
  const { transactions, userSettings, updateUserSettings } = useData();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const currentPrefix = getCurrentMonthPrefix();
  const d = new Date();
  const monthNum = d.getMonth() + 1;
  const yearNum = d.getFullYear();

  // Calculate current month's total living expenses (excluding investments & savings)
  const monthStats = useMemo(() => {
    let totalExpense = 0;
    let totalInvested = 0;
    let expenseCount = 0;

    transactions.forEach((tx) => {
      if (tx.transaction_date && tx.transaction_date.startsWith(currentPrefix)) {
        if (isInvestmentTransaction(tx)) {
          totalInvested += Number(tx.amount) || 0;
        } else if (tx.transaction_type === 'expense') {
          totalExpense += Number(tx.amount) || 0;
          expenseCount += 1;
        }
      }
    });

    const budgetLimit = userSettings.monthly_budget_limit || 15_000_000;
    const thresholdPercent = userSettings.budget_warning_threshold || 80;
    const spentPercent = budgetLimit > 0 ? (totalExpense / budgetLimit) * 100 : 0;
    const remaining = budgetLimit - totalExpense;
    const overspent = totalExpense > budgetLimit ? totalExpense - budgetLimit : 0;

    const isOverBudget = spentPercent >= 100;
    const isWarning = spentPercent >= thresholdPercent && !isOverBudget;
    const isSafe = spentPercent < thresholdPercent;

    return {
      totalExpense,
      totalInvested,
      expenseCount,
      budgetLimit,
      thresholdPercent,
      spentPercent,
      remaining,
      overspent,
      isOverBudget,
      isWarning,
      isSafe,
    };
  }, [transactions, currentPrefix, userSettings]);

  const handleSaveBudget = async (newSettings: any) => {
    await updateUserSettings(newSettings);
  };

  return (
    <>
      <div className={`rounded-2xl border transition-all ${
        monthStats.isOverBudget
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-sm'
          : monthStats.isWarning
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
      } ${compact ? 'p-4' : 'p-5 sm:p-6'} space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              monthStats.isOverBudget
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                : monthStats.isWarning
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
            }`}>
              {monthStats.isOverBudget ? (
                <Flame className="w-4 h-4 animate-bounce" />
              ) : monthStats.isWarning ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Ngân Sách Tháng {monthNum}/{yearNum}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  monthStats.isOverBudget
                    ? 'bg-rose-500 text-white animate-pulse'
                    : monthStats.isWarning
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {monthStats.isOverBudget
                    ? '🚨 VƯỢT NGÂN SÁCH'
                    : monthStats.isWarning
                    ? '⚠️ CẢNH BÁO TIÊU DÙNG'
                    : '🟢 AN TOÀN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hạn mức định trước: <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(monthStats.budgetLimit, userSettings.currency)}</span> (Cảnh báo ở mốc {monthStats.thresholdPercent}%)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            title="Điều chỉnh hạn mức ngân sách & ngưỡng cảnh báo"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cài Đặt Ngân Sách</span>
          </button>
        </div>

        {/* Warning / Alert Banner when threshold reached */}
        {monthStats.isOverBudget ? (
          <div className="p-3 rounded-xl bg-rose-100/90 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-bold">CẢNH BÁO: BẠN ĐÃ CHI TIÊU VƯỢT NGÂN SÁCH THÁNG!</p>
              <p className="text-[11px] text-rose-800 dark:text-rose-300">
                Tổng chi tiêu hiện tại đã vượt <span className="font-bold">+{formatCurrency(monthStats.overspent, userSettings.currency)}</span> ({monthStats.spentPercent.toFixed(1)}% ngân sách). Hãy kiểm tra lại các khoản chi không cấp thiết để ổn định tài chính.
              </p>
            </div>
          </div>
        ) : monthStats.isWarning ? (
          <div className="p-3 rounded-xl bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-bold">CHÚ Ý: ĐÃ CHẠM NGƯỠNG CẢNH BÁO {monthStats.thresholdPercent}%!</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Bạn đã sử dụng <span className="font-bold">{monthStats.spentPercent.toFixed(1)}%</span> hạn mức chi tiêu tháng. Ngân sách còn lại: <span className="font-bold">{formatCurrency(monthStats.remaining, userSettings.currency)}</span>.
              </p>
            </div>
          </div>
        ) : null}

        {/* Progress Bar & Numerical Metrics */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Tiến độ chi tiêu: <strong className="font-mono text-slate-800 dark:text-white font-bold">{formatCurrency(monthStats.totalExpense, userSettings.currency)}</strong> / {formatCurrency(monthStats.budgetLimit, userSettings.currency)}
            </span>
            <span className={`font-mono font-bold text-sm ${
              monthStats.isOverBudget
                ? 'text-rose-600 dark:text-rose-400'
                : monthStats.isWarning
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {monthStats.spentPercent.toFixed(1)}%
            </span>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthStats.isOverBudget
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-xs'
                  : monthStats.isWarning
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
              }`}
              style={{ width: `${Math.min(100, monthStats.spentPercent)}%` }}
            />
            {/* Warning Marker at threshold */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 opacity-60 pointer-events-none"
              style={{ left: `${monthStats.thresholdPercent}%` }}
              title={`Ngưỡng cảnh báo: ${monthStats.thresholdPercent}%`}
            />
          </div>
        </div>

        {/* 3 Metric Mini Cards + Investment Badge */}
        <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 text-[10px] font-medium">Chi tiêu sinh hoạt</p>
            <p className="font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 text-xs sm:text-sm">
              {formatCurrency(monthStats.totalExpense, userSettings.currency, true)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 text-[10px] font-medium">
              {monthStats.isOverBudget ? 'Số tiền vượt mức' : 'Ngân sách còn lại'}
            </p>
            <p className={`font-bold font-mono mt-0.5 text-xs sm:text-sm ${
              monthStats.isOverBudget
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {monthStats.isOverBudget
                ? `+${formatCurrency(monthStats.overspent, userSettings.currency, true)}`
                : formatCurrency(Math.max(0, monthStats.remaining), userSettings.currency, true)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 text-[10px] font-medium">Số khoản chi tiêu</p>
            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-xs sm:text-sm">
              {monthStats.expenseCount} giao dịch
            </p>
          </div>
        </div>

        {monthStats.totalInvested > 0 && (
          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs">
            <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Tích lũy & Đầu tư tháng (Nằm riêng):
            </span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(monthStats.totalInvested, userSettings.currency)}
            </span>
          </div>
        )}
      </div>

      {/* Budget Configuration Modal */}
      <BudgetConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        userSettings={userSettings}
        onSave={handleSaveBudget}
      />
    </>
  );
};
