import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatPercent, getCurrentMonthPrefix } from '../../lib/utils';
import { getCategoryIconMeta } from '../../lib/categoryIcons';
import {
  PieChart as PieIcon,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Layers,
  Filter,
  DollarSign,
  PieChart as LucidePieChart,
  BarChart2,
  Receipt
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export interface AnalyticsProps {
  className?: string;
  defaultTimeRange?: 'current_month' | 'last_month' | 'last_3m' | 'last_6m' | 'all';
}

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#84CC16', // Lime
  '#A855F7', // Violet
];

export const Analytics: React.FC<AnalyticsProps> = ({
  className = '',
  defaultTimeRange = 'current_month',
}) => {
  const { transactions, userSettings } = useData();

  const [viewMode, setViewMode] = useState<'expense' | 'income' | 'comparison'>('expense');
  const [timeRange, setTimeRange] = useState<'current_month' | 'last_month' | 'last_3m' | 'last_6m' | 'all'>(defaultTimeRange);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter transactions by selected time range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentPrefix = getCurrentMonthPrefix(); // 'YYYY-MM'

    // Last month prefix
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // 3 months ago timestamp
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];

    return transactions.filter((tx) => {
      if (!tx.transaction_date) return false;
      if (timeRange === 'current_month') {
        return tx.transaction_date.startsWith(currentPrefix);
      }
      if (timeRange === 'last_month') {
        return tx.transaction_date.startsWith(lastMonthPrefix);
      }
      if (timeRange === 'last_3m') {
        return tx.transaction_date >= threeMonthsAgo;
      }
      if (timeRange === 'last_6m') {
        return tx.transaction_date >= sixMonthsAgo;
      }
      return true; // 'all'
    });
  }, [transactions, timeRange]);

  // Aggregate totals and category distributions
  const analyticsData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    const expenseCategoryMap: Record<string, number> = {};
    const incomeCategoryMap: Record<string, number> = {};

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.transaction_type === 'income') {
        totalIncome += amt;
        const cat = tx.category_name || 'Khác';
        incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + amt;
      } else {
        totalExpense += amt;
        const cat = tx.category_name || 'Khác';
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;
      }
    });

    // Prepare Expense Pie Data
    const expenseDistribution = Object.entries(expenseCategoryMap)
      .map(([name, value], idx) => {
        const meta = getCategoryIconMeta(name);
        return {
          name,
          value,
          percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
          color: meta.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
        };
      })
      .sort((a, b) => b.value - a.value);

    // Prepare Income Pie Data
    const incomeDistribution = Object.entries(incomeCategoryMap)
      .map(([name, value], idx) => {
        const meta = getCategoryIconMeta(name);
        return {
          name,
          value,
          percent: totalIncome > 0 ? (value / totalIncome) * 100 : 0,
          color: meta.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
        };
      })
      .sort((a, b) => b.value - a.value);

    // Prepare Income vs Expense Comparison Data
    const comparisonData = [
      {
        name: 'Thu Nhập (Inflow)',
        value: totalIncome,
        percent: (totalIncome + totalExpense) > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 0,
        color: '#10B981',
      },
      {
        name: 'Chi Tiêu (Outflow)',
        value: totalExpense,
        percent: (totalIncome + totalExpense) > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 0,
        color: '#F43F5E',
      },
    ];

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      expenseDistribution,
      incomeDistribution,
      comparisonData,
      hasData: filteredTransactions.length > 0,
    };
  }, [filteredTransactions]);

  // Current active dataset for pie visualization
  const currentChartData = useMemo(() => {
    if (viewMode === 'expense') return analyticsData.expenseDistribution;
    if (viewMode === 'income') return analyticsData.incomeDistribution;
    return analyticsData.comparisonData;
  }, [viewMode, analyticsData]);

  const currentTotal = useMemo(() => {
    if (viewMode === 'expense') return analyticsData.totalExpense;
    if (viewMode === 'income') return analyticsData.totalIncome;
    return analyticsData.totalIncome + analyticsData.totalExpense;
  }, [viewMode, analyticsData]);

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-6 ${className}`}>
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <LucidePieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Phân Tích Cơ Cấu Thu Chi (Transaction Analytics)
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <Sparkles className="w-3 h-3" /> Recharts Donut
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trực quan hóa tỷ trọng chi tiêu, phân bổ thu nhập và đối chiếu dòng tiền
            </p>
          </div>
        </div>

        {/* View Mode & Time Range Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* View Mode Segment */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('expense')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Cơ Cấu Chi
            </button>
            <button
              type="button"
              onClick={() => setViewMode('income')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Cơ Cấu Thu
            </button>
            <button
              type="button"
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'comparison'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Thu vs Chi
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('current_month')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'current_month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('last_month')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'last_month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('last_3m')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'last_3m'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              3 tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Tổng Thu Nhập
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md font-bold">
              {analyticsData.incomeDistribution.length} nguồn
            </span>
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(analyticsData.totalIncome, userSettings.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Tổng Chi Tiêu
            </span>
            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-md font-bold">
              {analyticsData.expenseDistribution.length} hạng mục
            </span>
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(analyticsData.totalExpense, userSettings.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Số Dư Ròng (Net)
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              analyticsData.netSavings >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-600'
            }`}>
              Tiết kiệm: {analyticsData.savingsRate}%
            </span>
          </div>
          <p className={`text-lg font-bold font-mono mt-1 ${
            analyticsData.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
          }`}>
            {analyticsData.netSavings >= 0 ? '+' : ''}{formatCurrency(analyticsData.netSavings, userSettings.currency)}
          </p>
        </div>
      </div>

      {/* 3. Recharts Visual Section: Donut Chart + Category Breakdown */}
      {!analyticsData.hasData || currentChartData.length === 0 ? (
        <div className="py-14 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <PieIcon className="w-10 h-10 mb-2 opacity-40 text-purple-500" />
          <p className="text-sm font-medium">Chưa có dữ liệu giao dịch trong khoảng thời gian đã chọn</p>
          <p className="text-xs mt-1 text-slate-400">Hãy ghi chép thu nhập hoặc chi tiêu để tự động phân tích cơ cấu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart Canvas (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {currentChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="transparent"
                        className="transition-all duration-300 cursor-pointer outline-none"
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-2xl bg-slate-900/95 text-white p-3 shadow-2xl border border-slate-700/80 text-xs space-y-1 backdrop-blur-md min-w-[160px]">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                {formatPercent(item.percent)}
                              </span>
                            </div>
                            <p className="text-sm font-bold font-mono text-slate-100">
                              {formatCurrency(item.value, userSettings.currency)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center Donut Info Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400">
                {viewMode === 'expense' ? 'Tổng Chi' : viewMode === 'income' ? 'Tổng Thu' : 'Tổng Dòng Tiền'}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(currentTotal, userSettings.currency, true)}
              </span>
            </div>
          </div>

          {/* Detailed Category Breakdown Table / Progress List (7 cols) */}
          <div className="lg:col-span-7 space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {currentChartData.map((item, index) => {
              const meta = getCategoryIconMeta(item.name);
              const Icon = meta.Icon;
              const isHovered = activeIndex === index;

              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/70 hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}25`, color: item.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {formatCurrency(item.value, userSettings.currency)}
                      </span>
                      <span className="font-bold text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 min-w-[45px] text-right">
                        {formatPercent(item.percent)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(2, item.percent))}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
