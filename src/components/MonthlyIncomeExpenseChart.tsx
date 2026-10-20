import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sliders,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatPercent, isInvestmentTransaction } from '../lib/utils';
import { Transaction } from '../types';

export type ChartType = 'grouped_bar' | 'area_cashflow' | 'composed' | 'stacked_bar';
export type TimeRange = '6m' | '12m' | 'ytd' | 'custom_year';

export interface MonthlyIncomeExpenseChartProps {
  className?: string;
  transactions?: Transaction[];
  defaultRange?: TimeRange;
  defaultChartType?: ChartType;
  showKpiSummary?: boolean;
  title?: string;
  subtitle?: string;
  onQuickAddTransaction?: (type: 'income' | 'expense') => void;
  selectedYear?: number;
  selectedMonth?: number;
  filterMode?: 'month' | 'year';
}

// Safe context hook fallback
const useSafeDataContext = () => {
  try {
    return useData();
  } catch {
    return null;
  }
};

export const MonthlyIncomeExpenseChart: React.FC<MonthlyIncomeExpenseChartProps> = ({
  className = '',
  transactions: propTransactions,
  defaultRange = '12m',
  defaultChartType = 'composed',
  showKpiSummary = true,
  title,
  subtitle,
  onQuickAddTransaction,
  selectedYear: propSelectedYear,
  selectedMonth: propSelectedMonth,
  filterMode: propFilterMode,
}) => {
  const contextData = useSafeDataContext();
  const allTransactions = propTransactions || contextData?.transactions || [];
  const currency = contextData?.userSettings?.currency || 'VND';

  const now = new Date();
  const currentYear = now.getFullYear();

  // Controls state
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    if (propFilterMode === 'year') return 'custom_year';
    return defaultRange;
  });
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [showNetLine, setShowNetLine] = useState<boolean>(true);
  const [showAvgReference, setShowAvgReference] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(propSelectedYear || currentYear);

  // Synchronize when external DateRangePicker changes
  useEffect(() => {
    if (propFilterMode === 'year' && propSelectedYear) {
      setTimeRange('custom_year');
      setSelectedYear(propSelectedYear);
    } else if (propFilterMode === 'month' && propSelectedYear) {
      setSelectedYear(propSelectedYear);
    }
  }, [propFilterMode, propSelectedYear, propSelectedMonth]);

  // Available unique years in dataset
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    allTransactions.forEach((t) => {
      if (t.transaction_date && t.transaction_date.length >= 4) {
        const y = parseInt(t.transaction_date.substring(0, 4), 10);
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allTransactions, currentYear]);

  // Aggregate monthly data based on selected range
  const chartData = useMemo(() => {
    const monthList: string[] = [];

    if (timeRange === '6m') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        monthList.push(`${y}-${m}`);
      }
    } else if (timeRange === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        monthList.push(`${y}-${m}`);
      }
    } else if (timeRange === 'ytd') {
      const currentMonth = now.getMonth() + 1;
      for (let m = 1; m <= currentMonth; m++) {
        monthList.push(`${currentYear}-${String(m).padStart(2, '0')}`);
      }
    } else if (timeRange === 'custom_year') {
      for (let m = 1; m <= 12; m++) {
        monthList.push(`${selectedYear}-${String(m).padStart(2, '0')}`);
      }
    }

    let prevMonthNet = 0;

    return monthList.map((mKey, idx) => {
      const [yearStr, monthStr] = mKey.split('-');
      const mNum = parseInt(monthStr, 10);
      const label = `T${mNum}`;
      const fullLabel = `Tháng ${mNum}/${yearStr}`;

      let income = 0;
      let expense = 0;
      let investment = 0;

      allTransactions.forEach((t) => {
        if (t.transaction_date && t.transaction_date.startsWith(mKey)) {
          const amt = Number(t.amount) || 0;
          if (t.transaction_type === 'income') {
            income += amt;
          } else if (isInvestmentTransaction(t)) {
            investment += amt;
          } else if (t.transaction_type === 'expense') {
            expense += amt;
          }
        }
      });

      const net = income - expense;
      const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : (expense > 0 ? -100 : 0);
      const momChangeNet = idx > 0 ? net - prevMonthNet : 0;
      prevMonthNet = net;

      return {
        monthKey: mKey,
        label,
        fullLabel,
        monthNumber: mNum,
        year: parseInt(yearStr, 10),
        income,
        expense,
        investment,
        net,
        savingsRate,
        momChangeNet,
      };
    });
  }, [allTransactions, timeRange, selectedYear, now, currentYear]);

  // Financial KPIs & Summaries
  const kpis = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netCashflow: 0,
        avgIncome: 0,
        avgExpense: 0,
        avgNet: 0,
        overallSavingsRate: 0,
        peakIncomeMonth: null as any,
        peakExpenseMonth: null as any,
        healthyRatio: true,
      };
    }

    const totalIncome = chartData.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = chartData.reduce((acc, curr) => acc + curr.expense, 0);
    const netCashflow = totalIncome - totalExpense;
    const count = chartData.length;

    const avgIncome = Math.round(totalIncome / count);
    const avgExpense = Math.round(totalExpense / count);
    const avgNet = Math.round(netCashflow / count);

    const overallSavingsRate = totalIncome > 0 ? Math.round((netCashflow / totalIncome) * 100) : 0;

    let peakIncomeMonth = chartData[0];
    let peakExpenseMonth = chartData[0];

    chartData.forEach((m) => {
      if (m.income > peakIncomeMonth.income) peakIncomeMonth = m;
      if (m.expense > peakExpenseMonth.expense) peakExpenseMonth = m;
    });

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      avgIncome,
      avgExpense,
      avgNet,
      overallSavingsRate,
      peakIncomeMonth,
      peakExpenseMonth,
      healthyRatio: netCashflow >= 0,
    };
  }, [chartData]);

  // Formatter for Y-Axis numbers
  const formatYAxisTick = (val: number) => {
    if (Math.abs(val) >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}Tr`;
    }
    if (Math.abs(val) >= 1_000) {
      return `${(val / 1_000).toFixed(0)}k`;
    }
    return String(val);
  };

  // Custom Rich Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    const isPositiveNet = dataPoint.net >= 0;

    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 shadow-xl rounded-xl p-3.5 text-xs text-white backdrop-blur-md min-w-[220px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200">{dataPoint.fullLabel}</span>
          <span
            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
              isPositiveNet ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
            }`}
          >
            {dataPoint.savingsRate > 0 ? `+${dataPoint.savingsRate}%` : `${dataPoint.savingsRate}%`}
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Income row */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span>Thu nhập:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {formatCurrency(dataPoint.income, currency)}
            </span>
          </div>

          {/* Expense row */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              <span>Chi sinh hoạt:</span>
            </span>
            <span className="font-mono font-bold text-rose-400">
              {formatCurrency(dataPoint.expense, currency)}
            </span>
          </div>

          {/* Investment row */}
          {dataPoint.investment > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                <span>Tích lũy & Đầu tư:</span>
              </span>
              <span className="font-mono font-bold text-sky-400">
                {formatCurrency(dataPoint.investment, currency)}
              </span>
            </div>
          )}

          {/* Net Cashflow row */}
          <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span className="font-medium text-slate-400">Dòng tiền ròng (Net):</span>
            <span
              className={`font-mono font-extrabold ${
                isPositiveNet ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isPositiveNet ? '+' : ''}
              {formatCurrency(dataPoint.net, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const hasData = chartData.some((d) => d.income > 0 || d.expense > 0 || d.investment > 0);

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* =========================================================================
          CHART HEADER & CONTROLS
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                {title || 'Tương Quan Thu Nhập & Chi Tiêu Hàng Tháng'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle || 'Theo dõi cân đối dòng tiền thu vào, chi tiêu sinh hoạt, tích lũy đầu tư và tỷ lệ tiết kiệm'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('6m')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '6m'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              6 Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('12m')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '12m'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              12 Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('ytd')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === 'ytd'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Năm {currentYear}
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('custom_year')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === 'custom_year'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Theo Năm
            </button>
          </div>

          {/* Year selector if custom_year */}
          {timeRange === 'custom_year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Chọn năm xem báo cáo"
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1 font-semibold outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          )}

          {/* Chart Type Segmented Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setChartType('composed')}
              title="Biểu đồ Kết hợp Cột & Đường xu hướng"
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                chartType === 'composed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cột + Xu hướng
            </button>
            <button
              type="button"
              onClick={() => setChartType('grouped_bar')}
              title="Biểu đồ Cột Thu & Chi cạnh nhau"
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                chartType === 'grouped_bar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cột Nhóm
            </button>
            <button
              type="button"
              onClick={() => setChartType('area_cashflow')}
              title="Biểu đồ Miền Dòng Tiền (Area)"
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                chartType === 'area_cashflow'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Miền (Area)
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FINANCIAL PERFORMANCE KPI STRIP
          ========================================================================= */}
      {showKpiSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          {/* Metric 1: Total Inflow */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Tổng Thu Nhập</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(kpis.totalIncome, currency, true)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              TB: {formatCurrency(kpis.avgIncome, currency, true)}/tháng
            </p>
          </div>

          {/* Metric 2: Total Outflow */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Tổng Chi Tiêu</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(kpis.totalExpense, currency, true)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              TB: {formatCurrency(kpis.avgExpense, currency, true)}/tháng
            </p>
          </div>

          {/* Metric 3: Net Cashflow */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Thặng Dư Ròng</span>
              <span className={`w-2 h-2 rounded-full ${kpis.healthyRatio ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
            <p
              className={`text-base sm:text-lg font-bold font-mono ${
                kpis.netCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {kpis.netCashflow >= 0 ? '+' : ''}
              {formatCurrency(kpis.netCashflow, currency, true)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              TB: {formatCurrency(kpis.avgNet, currency, true)}/tháng
            </p>
          </div>

          {/* Metric 4: Savings Rate */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Tỷ Lệ Tiết Kiệm</span>
              <span className="font-mono text-[10px] font-bold text-purple-600">{kpis.overallSavingsRate}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
                {kpis.overallSavingsRate}%
              </p>
              <span className="text-[10px] text-slate-400">
                {kpis.overallSavingsRate >= 20 ? 'Tốt' : kpis.overallSavingsRate > 0 ? 'Trung bình' : 'Bội chi'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  kpis.overallSavingsRate >= 20
                    ? 'bg-emerald-500'
                    : kpis.overallSavingsRate > 0
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, kpis.overallSavingsRate))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHART LEGEND & TOGGLE STRIP
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-xs bg-emerald-500" />
            <span>Thu nhập</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-xs bg-rose-500" />
            <span>Chi tiêu</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-xs bg-sky-500" />
            <span>Tích lũy & Đầu tư</span>
          </span>
          {chartType === 'composed' && (
            <span className="flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400">
              <span className="w-3 h-0.5 bg-purple-500" />
              <span>Dòng tiền ròng (Net)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={showAvgReference}
              onChange={(e) => setShowAvgReference(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Đường trung bình</span>
          </label>
        </div>
      </div>

      {/* =========================================================================
          RECHARTS VISUALIZATION CONTAINER
          ========================================================================= */}
      {!hasData ? (
        <div className="h-72 w-full flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center p-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Chưa có dữ liệu giao dịch trong khoảng thời gian này
          </p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Ghi nhận thêm các khoản thu nhập hoặc chi tiêu để biểu đồ phân tích trực quan xu hướng tài chính của bạn.
          </p>
          {onQuickAddTransaction && (
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => onQuickAddTransaction('income')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm thu nhập
              </button>
              <button
                type="button"
                onClick={() => onQuickAddTransaction('expense')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm chi tiêu
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area_cashflow' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradientExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxisTick} />
                <Tooltip content={<CustomChartTooltip />} />
                {showAvgReference && (
                  <>
                    <ReferenceLine y={kpis.avgIncome} stroke="#10B981" strokeDasharray="4 4" opacity={0.6} />
                    <ReferenceLine y={kpis.avgExpense} stroke="#F43F5E" strokeDasharray="4 4" opacity={0.6} />
                  </>
                )}
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Thu nhập"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Chi tiêu"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientExpense)"
                />
              </AreaChart>
            ) : chartType === 'grouped_bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxisTick} />
                <Tooltip content={<CustomChartTooltip />} />
                {showAvgReference && (
                  <>
                    <ReferenceLine y={kpis.avgIncome} stroke="#10B981" strokeDasharray="4 4" opacity={0.6} />
                    <ReferenceLine y={kpis.avgExpense} stroke="#F43F5E" strokeDasharray="4 4" opacity={0.6} />
                  </>
                )}
                <Bar dataKey="income" name="Thu nhập" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Chi tiêu" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="investment" name="Tích lũy & Đầu tư" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxisTick} />
                <Tooltip content={<CustomChartTooltip />} />
                {showAvgReference && (
                  <>
                    <ReferenceLine y={kpis.avgIncome} stroke="#10B981" strokeDasharray="4 4" opacity={0.6} />
                    <ReferenceLine y={kpis.avgExpense} stroke="#F43F5E" strokeDasharray="4 4" opacity={0.6} />
                  </>
                )}
                <Bar dataKey="income" name="Thu nhập" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expense" name="Chi tiêu" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="investment" name="Tích lũy & Đầu tư" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={24} />
                {showNetLine && (
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Dòng tiền ròng"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    dot={{ fill: '#8B5CF6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer Insight Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {kpis.healthyRatio
              ? `Dòng tiền đang dương ${formatCurrency(kpis.netCashflow, currency, true)}. Tỷ lệ tiết kiệm đạt ${kpis.overallSavingsRate}%.`
              : `Chi tiêu đang vượt thu nhập ${formatCurrency(Math.abs(kpis.netCashflow), currency, true)}. Cần tối ưu các khoản chi tiêu lớn.`}
          </span>
        </div>
        {kpis.peakIncomeMonth && (
          <span className="text-[11px] text-slate-400">
            Tháng thu cao nhất: <strong>{kpis.peakIncomeMonth.label}</strong> ({formatCurrency(kpis.peakIncomeMonth.income, currency, true)})
          </span>
        )}
      </div>
    </div>
  );
};
