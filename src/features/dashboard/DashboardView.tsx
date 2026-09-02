import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { 
  Clock, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardViewProps {
  onNavigateTab: (tab: 'work' | 'expenses' | 'investments') => void;
  onQuickAction: (action: 'add-work' | 'add-transaction' | 'add-investment') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onQuickAction,
}) => {
  const { 
    workLogs, 
    workSettings, 
    transactions, 
    calculatedHoldings, 
    portfolioSnapshots,
    userSettings 
  } = useData();

  // Current active date reference (e.g. Month 9, 2026 or current date)
  const currentYear = 2026;
  const currentMonth = 9;
  const monthStr = '09';
  const prefix = `${currentYear}-${monthStr}`;

  // ==========================================
  // CARD 1 – STATS GIỜ CÔNG
  // ==========================================
  const workStats = useMemo(() => {
    const monthLogs = workLogs.filter((l) => l.work_date.startsWith(prefix));
    
    let totalHours = 0;
    let totalOvertime = 0;
    let totalMissing = 0;
    let workDaysCount = 0;
    let leaveDaysCount = 0;

    monthLogs.forEach((l) => {
      totalHours += l.total_hours;
      totalOvertime += l.overtime_hours;
      totalMissing += l.missing_hours;

      if (l.work_status === 'Làm việc' || l.work_status === 'Tăng ca' || l.work_status === 'Làm nửa ngày') {
        workDaysCount += 1;
      } else if (l.work_status === 'Nghỉ phép' || l.work_status === 'Nghỉ không lương' || l.work_status === 'Nghỉ lễ') {
        leaveDaysCount += 1;
      }
    });

    // Standard working days in month (estimate 26 working days x 8h = 208h)
    const standardDaysInMonth = workSettings.standard_days_per_month || 26;
    const targetStandardHours = standardDaysInMonth * workSettings.standard_hours_per_day;
    const completionRate = targetStandardHours > 0 ? Math.min(100, (totalHours / targetStandardHours) * 100) : 0;

    return {
      totalHours,
      totalOvertime,
      totalMissing,
      workDaysCount,
      leaveDaysCount,
      standardDaysInMonth,
      targetStandardHours,
      completionRate,
      logsCount: monthLogs.length,
    };
  }, [workLogs, prefix, workSettings]);

  // ==========================================
  // CARD 2 – STATS CHI TIÊU
  // ==========================================
  const expenseStats = useMemo(() => {
    const monthTx = transactions.filter((t) => t.transaction_date.startsWith(prefix));

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    monthTx.forEach((t) => {
      if (t.transaction_type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categoryTotals[t.category_name] = (categoryTotals[t.category_name] || 0) + t.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    // Calculate average daily expense for days passed (or 30 days)
    const dailyAvgExpense = totalExpense > 0 ? totalExpense / 30 : 0;

    // Top spending category
    let topCategory = { name: 'Chưa có', amount: 0 };
    Object.entries(categoryTotals).forEach(([name, amount]) => {
      if (amount > topCategory.amount) {
        topCategory = { name, amount };
      }
    });

    return {
      totalIncome,
      totalExpense,
      netSavings,
      dailyAvgExpense,
      topCategory,
      txCount: monthTx.length,
    };
  }, [transactions, prefix]);

  // ==========================================
  // CARD 3 – STATS ĐẦU TƯ
  // ==========================================
  const investmentStats = useMemo(() => {
    let totalInvested = 0;
    let currentTotalValue = 0;
    let totalProfit = 0;

    let bestAsset: { name: string; symbol: string; percent: number } | null = null;
    let worstAsset: { name: string; symbol: string; percent: number } | null = null;

    calculatedHoldings.forEach((h) => {
      totalInvested += h.totalInvested;
      currentTotalValue += h.currentValue;
      totalProfit += h.totalProfit;

      if (h.totalInvested > 0) {
        if (!bestAsset || h.profitPercentage > bestAsset.percent) {
          bestAsset = { name: h.asset.asset_name, symbol: h.asset.asset_symbol, percent: h.profitPercentage };
        }
        if (!worstAsset || h.profitPercentage < worstAsset.percent) {
          worstAsset = { name: h.asset.asset_name, symbol: h.asset.asset_symbol, percent: h.profitPercentage };
        }
      }
    });

    const overallProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentTotalValue,
      totalProfit,
      overallProfitPercent,
      bestAsset,
      worstAsset,
    };
  }, [calculatedHoldings]);

  // Net worth total calculation (Investments + Monthly Savings)
  const estimatedTotalNetWorth = investmentStats.currentTotalValue + Math.max(0, expenseStats.netSavings);

  // Time Series Chart Data for Net Worth
  const chartData = useMemo(() => {
    return portfolioSnapshots.map((s) => ({
      date: s.snapshot_date.substring(5), // 'MM-DD'
      fullDate: s.snapshot_date,
      value: s.total_value,
      cost: s.total_cost,
      profit: s.total_profit,
    }));
  }, [portfolioSnapshots]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Net Worth & Hero Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Tổng Giá Trị Tài Sản Ước Tính
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              {formatCurrency(estimatedTotalNetWorth, userSettings.currency)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Danh mục đầu tư đạt <span className="text-emerald-400 font-semibold">{formatCurrency(investmentStats.currentTotalValue, userSettings.currency)}</span> ({formatPercent(investmentStats.overallProfitPercent)}), số dư thu chi tích lũy <span className="text-emerald-300 font-semibold">{formatCurrency(expenseStats.netSavings, userSettings.currency)}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onQuickAction('add-work')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm border border-white/10 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" /> + Chấm Công
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-transaction')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm border border-white/10 transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-300" /> + Thu/Chi
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-investment')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-md shadow-emerald-500/30 transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" /> + Đầu Tư
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Functional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD 1: GIỜ CÔNG */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    QUẢN LÝ GIỜ CÔNG
                  </h3>
                  <span className="text-[11px] text-slate-400">Tháng 09/2026</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('work')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Chi tiết →
              </button>
            </div>

            {/* Main Metric */}
            <div className="my-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
                  {workStats.totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ {workStats.targetStandardHours}h</span>
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                  {workStats.completionRate.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${workStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Breakdown stats */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Số ngày làm việc</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{workStats.workDaysCount} ngày</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Số giờ tăng ca (OT)</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{workStats.totalOvertime.toFixed(1)}h</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Số ngày nghỉ / lễ</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{workStats.leaveDaysCount} ngày</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Số giờ còn thiếu</p>
                <p className="font-bold text-rose-500 mt-0.5">{workStats.totalMissing.toFixed(1)}h</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Ca tiêu chuẩn: {workSettings.default_check_in} - {workSettings.default_check_out}</span>
            <span className="text-emerald-600 font-medium">8h/ngày</span>
          </div>
        </div>

        {/* CARD 2: CHI TIÊU */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    QUẢN LÝ CHI TIÊU
                  </h3>
                  <span className="text-[11px] text-slate-400">Dòng tiền tháng 09</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Chi tiết →
              </button>
            </div>

            {/* Main Metric */}
            <div className="my-4">
              <p className="text-xs text-slate-400">Số dư ròng tháng</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-display">
                  {formatCurrency(expenseStats.netSavings, userSettings.currency)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {expenseStats.txCount} giao dịch
                </span>
              </div>
            </div>

            {/* Breakdown stats */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" /> Tổng thu nhập
                </p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(expenseStats.totalIncome, userSettings.currency, true)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <p className="text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Tổng chi tiêu
                </p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(expenseStats.totalExpense, userSettings.currency, true)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Chi tiêu TB / ngày</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatCurrency(expenseStats.dailyAvgExpense, userSettings.currency, true)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Chi nhiều nhất</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                  {expenseStats.topCategory.name}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tỷ lệ tiết kiệm</span>
            <span className="font-semibold text-emerald-600">
              {expenseStats.totalIncome > 0
                ? `${Math.round((expenseStats.netSavings / expenseStats.totalIncome) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 3: ĐẦU TƯ */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    QUẢN LÝ ĐẦU TƯ
                  </h3>
                  <span className="text-[11px] text-slate-400">Danh mục tài sản</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('investments')}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Chi tiết →
              </button>
            </div>

            {/* Main Metric */}
            <div className="my-4">
              <p className="text-xs text-slate-400">Giá trị danh mục hiện tại</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
                  {formatCurrency(investmentStats.currentTotalValue, userSettings.currency)}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                  investmentStats.totalProfit >= 0
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                }`}>
                  {investmentStats.totalProfit >= 0 ? '+' : ''}{formatPercent(investmentStats.overallProfitPercent)}
                </span>
              </div>
            </div>

            {/* Breakdown stats */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Tổng vốn đầu tư</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatCurrency(investmentStats.totalInvested, userSettings.currency, true)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Tổng lợi nhuận/lỗ</p>
                <p className={`font-bold mt-0.5 ${investmentStats.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {investmentStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(investmentStats.totalProfit, userSettings.currency, true)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Tăng mạnh nhất</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  {investmentStats.bestAsset ? `${investmentStats.bestAsset.symbol} (${formatPercent(investmentStats.bestAsset.percent)})` : '--'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[11px]">Tăng trưởng thấp nhất</p>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {investmentStats.worstAsset ? `${investmentStats.worstAsset.symbol} (${formatPercent(investmentStats.worstAsset.percent)})` : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tài sản nắm giữ: {calculatedHoldings.length} loại</span>
            <span className="text-purple-600 font-semibold">Tự động tính giá vốn</span>
          </div>
        </div>
      </div>

      {/* Biểu Đồ Tổng Tài Sản Theo Thời Gian */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display tracking-tight">
              Biểu Đồ Tăng Trưởng Tài Sản Danh Mục
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Diễn biến tổng giá trị tài sản thị trường so với tổng vốn đầu tư theo thời gian
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Giá trị tài sản</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">Tổng vốn tích lũy</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-900/95 text-white p-3 shadow-xl border border-slate-800 text-xs space-y-1">
                        <p className="font-semibold text-slate-300">Ngày: {data.fullDate}</p>
                        <p className="text-emerald-400 font-bold">
                          Giá trị: {formatCurrency(data.value, userSettings.currency)}
                        </p>
                        <p className="text-blue-400">
                          Vốn: {formatCurrency(data.cost, userSettings.currency)}
                        </p>
                        <p className="text-amber-300">
                          Lợi nhuận: +{formatCurrency(data.profit, userSettings.currency)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
              <Area 
                type="monotone" 
                dataKey="cost" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#colorCost)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
