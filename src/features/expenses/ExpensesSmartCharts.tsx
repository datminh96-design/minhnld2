import React, { useState, useMemo } from 'react';
import { Transaction, ExpenseCategory, UserSettings } from '../../types';
import { formatCurrency, formatPercent, formatDateVN, getDayOfWeek } from '../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Activity,
  DollarSign,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  Home,
  Briefcase,
  HelpCircle,
  ChevronRight,
  Eye,
  ArrowUpDown,
  Layers,
  Clock,
  X,
  PiggyBank
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart
} from 'recharts';

export interface ExpensesSmartChartsProps {
  transactions: Transaction[];
  categories: ExpenseCategory[];
  userSettings: UserSettings;
  onEditTransaction?: (tx: Transaction) => void;
}

type TimeframeOption = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';
type GranularityOption = 'day' | 'week' | 'month' | 'year';
type ChartStyleOption = 'area' | 'line' | 'bar';
type CashflowGranularity = 'day' | 'week' | 'month';
type SortOption = 'amount_desc' | 'amount_asc' | 'count_desc' | 'name_asc';

// Category Icon mapping for visual finesse
const CATEGORY_ICONS: Record<string, any> = {
  'Ăn uống': Utensils,
  'Ăn ngoài': Utensils,
  'Food': Utensils,
  'Di chuyển': Car,
  'Đi lại': Car,
  'Xăng xe': Car,
  'Transport': Car,
  'Mua sắm': ShoppingBag,
  'Shopping': ShoppingBag,
  'Hóa đơn': Receipt,
  'Điện nước': Receipt,
  'Internet': Receipt,
  'Bills': Receipt,
  'Giải trí': Film,
  'Du lịch': Film,
  'Entertainment': Film,
  'Y tế': HeartPulse,
  'Sức khỏe': HeartPulse,
  'Thuốc': HeartPulse,
  'Health': HeartPulse,
  'Gia đình': Home,
  'Nhà cửa': Home,
  'Family': Home,
  'Đầu tư': Briefcase,
  'Tiết kiệm': PiggyBank,
  'Investment': Briefcase,
  'Khác': HelpCircle,
  'Other': HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Ăn uống': '#EF4444',
  'Di chuyển': '#F97316',
  'Mua sắm': '#EC4899',
  'Hóa đơn': '#3B82F6',
  'Giải trí': '#8B5CF6',
  'Y tế': '#10B981',
  'Gia đình': '#14B8A6',
  'Đầu tư': '#06B6D4',
  'Khác': '#64748B',
};

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#84CC16', '#64748B'
];

// Helper to get category icon component
const getCategoryIcon = (categoryName: string) => {
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return CATEGORY_ICONS[key];
    }
  }
  return HelpCircle;
};

// Helper to get category color
const getCategoryColor = (categoryName: string, index: number) => {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return CATEGORY_COLORS[key];
    }
  }
  return PALETTE[index % PALETTE.length];
};

// Custom Tooltip for Income vs Expense Chart
const CustomIncomeExpenseTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSurplus = data.savings >= 0;
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-medium text-slate-300">
          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {data.dateLabel || label}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {data.granularityLabel || 'Thời kỳ'}
          </span>
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> Thu nhập:
            </span>
            <span className="font-bold text-slate-100 font-mono">
              {formatCurrency(data.income, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Chi tiêu:
            </span>
            <span className="font-bold text-slate-100 font-mono">
              {formatCurrency(data.expense, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-semibold">
            <span className="text-slate-300 flex items-center gap-1">
              <PiggyBank className="w-3 h-3 text-purple-400" /> Tiết kiệm:
            </span>
            <span className={`font-mono font-bold ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(data.savings, currency)}
            </span>
          </div>
          {data.income > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Tỷ lệ tiết kiệm:</span>
              <span className={`font-bold font-mono ${data.savingsRate >= 20 ? 'text-emerald-400' : data.savingsRate >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {formatPercent(data.savingsRate)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Donut Chart
const CustomDonutTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
            {data.name}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
            {data.count} giao dịch
          </span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Số tiền đã chi:</span>
            <span className="font-bold text-rose-400 font-mono">
              {formatCurrency(data.value, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tỷ trọng:</span>
            <span className="font-bold text-slate-100 font-mono">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Trung bình/lần:</span>
            <span className="font-mono text-slate-300">
              {formatCurrency(data.avgPerTx, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Monthly Spend Trend & Comparison
const CustomTrendComparisonTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          Ngày {data.dayNumber} trong tháng
        </div>
        <div className="space-y-1 pt-0.5">
          {data.currentMonthSpend !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-purple-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Tháng này (lũy kế):
              </span>
              <span className="font-bold text-slate-100 font-mono">
                {formatCurrency(data.currentMonthCumulative, currency)}
              </span>
            </div>
          )}
          {data.prevMonthCumulative !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Tháng trước (lũy kế):
              </span>
              <span className="font-semibold text-slate-300 font-mono">
                {formatCurrency(data.prevMonthCumulative, currency)}
              </span>
            </div>
          )}
          {data.diff !== undefined && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-semibold">
              <span className="text-slate-300">Chênh lệch:</span>
              <span className={`font-mono ${data.diff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.diff > 0 ? '+' : ''}{formatCurrency(data.diff, currency)} ({data.diffPercent > 0 ? '+' : ''}{formatPercent(data.diffPercent)})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Cash Flow Chart
const CustomCashflowTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          {data.label || label}
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> Tiền vào (Thu):
            </span>
            <span className="font-bold text-slate-100 font-mono">
              {formatCurrency(data.inflow, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Tiền ra (Chi):
            </span>
            <span className="font-bold text-slate-100 font-mono">
              {formatCurrency(data.outflow, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-semibold">
            <span className="text-slate-300">Dòng tiền thuần:</span>
            <span className={`font-mono ${data.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.netFlow >= 0 ? '+' : ''}{formatCurrency(data.netFlow, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-purple-400 pt-0.5">
            <span>Số dư tích lũy:</span>
            <span className="font-bold font-mono text-purple-300">
              {formatCurrency(data.cumulativeBalance, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpensesSmartCharts: React.FC<ExpensesSmartChartsProps> = ({
  transactions,
  categories,
  userSettings,
  onEditTransaction,
}) => {
  // Filters & State Controls
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30D');
  const [granularity, setGranularity] = useState<GranularityOption>('day');
  const [chartStyle, setChartStyle] = useState<ChartStyleOption>('area');
  const [selectedCategoryDrilldown, setSelectedCategoryDrilldown] = useState<string | null>(null);
  const [categorySortBy, setCategorySortBy] = useState<SortOption>('amount_desc');
  const [cashflowGranularity, setCashflowGranularity] = useState<CashflowGranularity>('month');

  // Filter transactions based on selected timeframe
  const timeframeTransactions = useMemo(() => {
    const now = new Date();
    let daysCutoff = 30;
    if (timeframe === '7D') daysCutoff = 7;
    else if (timeframe === '30D') daysCutoff = 30;
    else if (timeframe === '3M') daysCutoff = 90;
    else if (timeframe === '6M') daysCutoff = 180;
    else if (timeframe === '1Y') daysCutoff = 365;
    else if (timeframe === 'ALL') daysCutoff = 3650;

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysCutoff);
    const cutoffStr = cutoffDate.toISOString().substring(0, 10);

    return transactions.filter((tx) => {
      const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
      return txDate >= cutoffStr;
    }).sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  }, [transactions, timeframe]);

  // Overall Financial Summary for Timeframe
  const summaryMetrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let expenseTxCount = 0;
    let incomeTxCount = 0;

    timeframeTransactions.forEach((tx) => {
      if (tx.transaction_type === 'income') {
        totalIncome += tx.amount;
        incomeTxCount++;
      } else {
        totalExpense += tx.amount;
        expenseTxCount++;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Days count in timeframe for daily burn rate calculation
    let numDays = 30;
    if (timeframe === '7D') numDays = 7;
    else if (timeframe === '30D') numDays = 30;
    else if (timeframe === '3M') numDays = 90;
    else if (timeframe === '6M') numDays = 180;
    else if (timeframe === '1Y') numDays = 365;
    else if (timeframe === 'ALL') numDays = Math.max(30, timeframeTransactions.length > 0 ? 90 : 30);

    const avgDailyExpense = totalExpense / numDays;
    const avgDailyIncome = totalIncome / numDays;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      expenseTxCount,
      incomeTxCount,
      avgDailyExpense,
      avgDailyIncome,
    };
  }, [timeframeTransactions, timeframe]);

  // ==========================================
  // A. BIỂU ĐỒ THU NHẬP VÀ CHI TIÊU (Time series)
  // ==========================================
  const incomeExpenseChartData = useMemo(() => {
    const buckets: Record<
      string,
      { label: string; income: number; expense: number; fullDate: string }
    > = {};

    timeframeTransactions.forEach((tx) => {
      const date = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
      if (!date) return;

      let key = date;
      let label = formatDateVN(date);

      if (granularity === 'day') {
        key = date;
        const [y, m, d] = date.split('-');
        label = `${d}/${m}`;
      } else if (granularity === 'week') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const monStr = monday.toISOString().substring(0, 10);
        key = `W-${monStr}`;
        label = `Tuần ${monday.getDate()}/${monday.getMonth() + 1}`;
      } else if (granularity === 'month') {
        key = date.substring(0, 7); // YYYY-MM
        const [y, m] = key.split('-');
        label = `T${m}/${y}`;
      } else if (granularity === 'year') {
        key = date.substring(0, 4); // YYYY
        label = `Năm ${key}`;
      }

      if (!buckets[key]) {
        buckets[key] = { label, income: 0, expense: 0, fullDate: date };
      }

      if (tx.transaction_type === 'income') {
        buckets[key].income += tx.amount;
      } else {
        buckets[key].expense += tx.amount;
      }
    });

    return Object.keys(buckets)
      .sort()
      .map((k) => {
        const item = buckets[k];
        const savings = item.income - item.expense;
        const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
        return {
          key: k,
          dateLabel: item.label,
          income: item.income,
          expense: item.expense,
          savings,
          savingsRate,
          granularityLabel: granularity === 'day' ? 'Ngày' : granularity === 'week' ? 'Tuần' : granularity === 'month' ? 'Tháng' : 'Năm',
        };
      });
  }, [timeframeTransactions, granularity]);

  // ==========================================
  // B. BIỂU ĐỒ CƠ CẤU CHI TIÊU (Donut Breakdown)
  // ==========================================
  const categoryDonutData = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    let totalExpense = 0;

    timeframeTransactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        const cat = t.category_name || 'Khác';
        if (!map[cat]) {
          map[cat] = { amount: 0, count: 0 };
        }
        map[cat].amount += t.amount;
        map[cat].count += 1;
        totalExpense += t.amount;
      });

    return Object.entries(map)
      .map(([name, data], idx) => ({
        name,
        value: data.amount,
        count: data.count,
        percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
        avgPerTx: data.count > 0 ? data.amount / data.count : 0,
        fill: getCategoryColor(name, idx),
        Icon: getCategoryIcon(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [timeframeTransactions]);

  // Transactions list for selected drilldown category
  const drilldownCategoryTransactions = useMemo(() => {
    if (!selectedCategoryDrilldown) return [];
    return timeframeTransactions
      .filter((t) => t.transaction_type === 'expense' && t.category_name === selectedCategoryDrilldown)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [timeframeTransactions, selectedCategoryDrilldown]);

  // Drilldown Category Summary
  const drilldownCategoryStats = useMemo(() => {
    if (!selectedCategoryDrilldown || drilldownCategoryTransactions.length === 0) return null;
    const total = drilldownCategoryTransactions.reduce((acc, tx) => acc + tx.amount, 0);
    const count = drilldownCategoryTransactions.length;
    const maxTx = [...drilldownCategoryTransactions].sort((a, b) => b.amount - a.amount)[0];
    const avg = total / count;
    const percentOfTotal = summaryMetrics.totalExpense > 0 ? (total / summaryMetrics.totalExpense) * 100 : 0;

    return {
      categoryName: selectedCategoryDrilldown,
      total,
      count,
      maxTx,
      avg,
      percentOfTotal,
    };
  }, [selectedCategoryDrilldown, drilldownCategoryTransactions, summaryMetrics.totalExpense]);

  // ==========================================
  // C. BIỂU ĐỒ SO SÁNH DANH MỤC (Bar Chart)
  // ==========================================
  const sortedCategoryComparison = useMemo(() => {
    const list = [...categoryDonutData];
    if (categorySortBy === 'amount_desc') {
      return list.sort((a, b) => b.value - a.value);
    } else if (categorySortBy === 'amount_asc') {
      return list.sort((a, b) => a.value - b.value);
    } else if (categorySortBy === 'count_desc') {
      return list.sort((a, b) => b.count - a.count);
    } else {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [categoryDonutData, categorySortBy]);

  // ==========================================
  // D. BIỂU ĐỒ XU HƯỚNG CHI TIÊU & SO SÁNH THÁNG
  // ==========================================
  const spendingTrendComparison = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

    // Filter transactions for current month and previous month
    const currentMonthTxs = transactions.filter(
      (tx) => tx.transaction_type === 'expense' && tx.transaction_date.startsWith(currentMonthStr)
    );
    const prevMonthTxs = transactions.filter(
      (tx) => tx.transaction_type === 'expense' && tx.transaction_date.startsWith(prevMonthStr)
    );

    const totalCurrentMonth = currentMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPrevMonth = prevMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Analyze Trend Status
    let trendStatus: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let diffAmount = totalCurrentMonth - totalPrevMonth;
    let diffPercent = totalPrevMonth > 0 ? ((totalCurrentMonth - totalPrevMonth) / totalPrevMonth) * 100 : 0;

    if (diffPercent > 5) {
      trendStatus = 'increasing';
    } else if (diffPercent < -5) {
      trendStatus = 'decreasing';
    } else {
      trendStatus = 'stable';
    }

    // Cumulative Spend by Day of Month (Day 1 to 31)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();

    let runningCurrent = 0;
    let runningPrev = 0;
    const dailyPoints = [];

    for (let day = 1; day <= 31; day++) {
      const dayStr = String(day).padStart(2, '0');
      const curDateStr = `${currentMonthStr}-${dayStr}`;
      const prevDateStr = `${prevMonthStr}-${dayStr}`;

      const curDaySpend = currentMonthTxs
        .filter((tx) => tx.transaction_date === curDateStr)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const prevDaySpend = prevMonthTxs
        .filter((tx) => tx.transaction_date === prevDateStr)
        .reduce((sum, tx) => sum + tx.amount, 0);

      runningPrev += prevDaySpend;

      // Only plot current month up to today
      let curVal: number | undefined = undefined;
      if (day <= currentDay) {
        runningCurrent += curDaySpend;
        curVal = runningCurrent;
      }

      const diff = curVal !== undefined ? curVal - runningPrev : undefined;
      const diffP = curVal !== undefined && runningPrev > 0 ? ((curVal - runningPrev) / runningPrev) * 100 : 0;

      dailyPoints.push({
        dayNumber: day,
        label: `N${day}`,
        currentMonthSpend: curDaySpend,
        currentMonthCumulative: curVal,
        prevMonthSpend: prevDaySpend,
        prevMonthCumulative: runningPrev,
        diff,
        diffPercent: diffP,
      });
    }

    // Projected spend for end of month based on daily velocity
    const dailyVelocity = currentDay > 0 ? totalCurrentMonth / currentDay : 0;
    const projectedEndOfMonth = dailyVelocity * daysInCurrentMonth;

    return {
      currentMonthLabel: `Tháng ${currentMonth + 1}/${currentYear}`,
      prevMonthLabel: `Tháng ${prevMonth + 1}/${prevYear}`,
      totalCurrentMonth,
      totalPrevMonth,
      trendStatus,
      diffAmount,
      diffPercent,
      projectedEndOfMonth,
      dailyVelocity,
      dailyPoints,
    };
  }, [transactions]);

  // ==========================================
  // E. BIỂU ĐỒ DÒNG TIỀN (Cashflow & Cumulative Balance)
  // ==========================================
  const cashflowTimelineData = useMemo(() => {
    const buckets: Record<string, { label: string; inflow: number; outflow: number; dateKey: string }> = {};

    transactions.forEach((tx) => {
      const date = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
      if (!date) return;

      let key = date;
      let label = date;

      if (cashflowGranularity === 'day') {
        key = date;
        const [y, m, d] = date.split('-');
        label = `${d}/${m}`;
      } else if (cashflowGranularity === 'week') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const monStr = monday.toISOString().substring(0, 10);
        key = `W-${monStr}`;
        label = `Tuần ${monday.getDate()}/${monday.getMonth() + 1}`;
      } else if (cashflowGranularity === 'month') {
        key = date.substring(0, 7); // YYYY-MM
        const [y, m] = key.split('-');
        label = `T${m}/${y}`;
      }

      if (!buckets[key]) {
        buckets[key] = { label, inflow: 0, outflow: 0, dateKey: key };
      }

      if (tx.transaction_type === 'income') {
        buckets[key].inflow += tx.amount;
      } else {
        buckets[key].outflow += tx.amount;
      }
    });

    const sortedKeys = Object.keys(buckets).sort();
    let cumulative = 0;

    return sortedKeys.map((k) => {
      const item = buckets[k];
      const netFlow = item.inflow - item.outflow;
      cumulative += netFlow;
      return {
        key: k,
        label: item.label,
        inflow: item.inflow,
        outflow: item.outflow,
        netFlow,
        cumulativeBalance: cumulative,
      };
    });
  }, [transactions, cashflowGranularity]);

  // Cashflow overall summary
  const cashflowAggregates = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach((tx) => {
      if (tx.transaction_type === 'income') totalIn += tx.amount;
      else totalOut += tx.amount;
    });
    return {
      totalIn,
      totalOut,
      netTotal: totalIn - totalOut,
      count: transactions.length,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE FINANCIAL COCKPIT (Top KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Income */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng Thu Nhập
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            +{formatCurrency(summaryMetrics.totalIncome, userSettings.currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {summaryMetrics.incomeTxCount} nguồn thu
            </span>
            <span>• TB {formatCurrency(summaryMetrics.avgDailyIncome, userSettings.currency, true)}/ngày</span>
          </div>
        </div>

        {/* Metric 2: Total Expense */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng Chi Tiêu
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-display text-rose-600 dark:text-rose-400 tracking-tight">
            -{formatCurrency(summaryMetrics.totalExpense, userSettings.currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {summaryMetrics.expenseTxCount} khoản chi
            </span>
            <span>• TB {formatCurrency(summaryMetrics.avgDailyExpense, userSettings.currency, true)}/ngày</span>
          </div>
        </div>

        {/* Metric 3: Net Savings / Surplus */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tiền Tiết Kiệm / Thặng Dư
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                summaryMetrics.netSavings >= 0
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-xl md:text-2xl font-bold font-display tracking-tight ${
              summaryMetrics.netSavings >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summaryMetrics.netSavings >= 0 ? '+' : ''}
            {formatCurrency(summaryMetrics.netSavings, userSettings.currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            <span
              className={`px-1.5 py-0.5 rounded-md font-bold ${
                summaryMetrics.savingsRate >= 30
                  ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : summaryMetrics.savingsRate >= 15
                  ? 'bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : summaryMetrics.savingsRate >= 0
                  ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {formatPercent(summaryMetrics.savingsRate)}
            </span>
            <span className="text-slate-500 dark:text-slate-400">tỷ lệ tiết kiệm</span>
          </div>
        </div>

        {/* Metric 4: Spending Health Status */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Đánh Giá Sức Khỏe Thu Chi
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white truncate">
            {summaryMetrics.savingsRate >= 30
              ? '🌟 Xuất sắc (>30%)'
              : summaryMetrics.savingsRate >= 15
              ? '✅ Ổn định (15-30%)'
              : summaryMetrics.savingsRate >= 0
              ? '⚠️ Cần kiểm soát'
              : '🚨 Chi vượt thu'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {spendingTrendComparison.trendStatus === 'decreasing'
              ? 'Xu hướng chi tiêu đang giảm tốt'
              : spendingTrendComparison.trendStatus === 'increasing'
              ? 'Tốc độ chi tiêu đang tăng'
              : 'Chi tiêu giữ mức cân bằng'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* A. BIỂU ĐỒ THU NHẬP VÀ CHI TIÊU (Interactive Timeframe Area/Line Chart) */}
      {/* ========================================================================= */}
      <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <LineIcon className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                A. Biểu Đồ Thu Nhập Và Chi Tiêu
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phân tích tương quan giữa dòng tiền Thu nhập, Chi tiêu và Mức thặng dư tiết kiệm
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Granularity Selector */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
              {(['day', 'week', 'month', 'year'] as GranularityOption[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    granularity === g
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g === 'day' ? 'Ngày' : g === 'week' ? 'Tuần' : g === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>

            {/* Timeframe Presets Filter */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
              {(['7D', '30D', '3M', '6M', '1Y', 'ALL'] as TimeframeOption[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tf === '7D' ? '7 ngày' : tf === '30D' ? '30 ngày' : tf === '3M' ? '3 tháng' : tf === '6M' ? '6 tháng' : tf === '1Y' ? '1 năm' : 'Tất cả'}
                </button>
              ))}
            </div>

            {/* Chart Style Switcher */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setChartStyle('area')}
                title="Vùng Gradient"
                className={`p-1.5 rounded-lg cursor-pointer ${chartStyle === 'area' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('line')}
                title="Đường Line mượt"
                className={`p-1.5 rounded-lg cursor-pointer ${chartStyle === 'line' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                <LineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('bar')}
                title="Cột Bar"
                className={`p-1.5 rounded-lg cursor-pointer ${chartStyle === 'bar' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-80 w-full">
          {incomeExpenseChartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Calendar className="w-8 h-8 mb-2 opacity-40" />
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'area' ? (
                <AreaChart data={incomeExpenseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} 
                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={75} 
                  />
                  <Tooltip content={<CustomIncomeExpenseTooltip currency={userSettings.currency} />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                    name="Thu nhập"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                    name="Chi tiêu"
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#8B5CF6' }}
                    name="Tiết kiệm"
                  />
                </AreaChart>
              ) : chartStyle === 'line' ? (
                <LineChart data={incomeExpenseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip content={<CustomIncomeExpenseTooltip currency={userSettings.currency} />} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} name="Thu nhập" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} dot={{ r: 3 }} name="Chi tiêu" />
                  <Line type="monotone" dataKey="savings" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} name="Tiết kiệm" />
                </LineChart>
              ) : (
                <BarChart data={incomeExpenseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip content={<CustomIncomeExpenseTooltip currency={userSettings.currency} />} />
                  <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Thu nhập" />
                  <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Chi tiêu" />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Thu nhập (+{formatCurrency(summaryMetrics.totalIncome, userSettings.currency)})
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              Chi tiêu (-{formatCurrency(summaryMetrics.totalExpense, userSettings.currency)})
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400">
              <span className="w-3 h-1 bg-purple-500 rounded-full border-dashed" />
              Tiết kiệm ({summaryMetrics.netSavings >= 0 ? '+' : ''}{formatCurrency(summaryMetrics.netSavings, userSettings.currency)})
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Rê chuột / chạm biểu đồ để xem chi tiết từng điểm thời gian
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRID: B. CƠ CẤU CHI TIÊU & C. SO SÁNH DANH MỤC */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B. BIỂU ĐỒ CƠ CẤU CHI TIÊU (Donut Chart & Drilldown) */}
        <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
                  <PieIcon className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  B. Biểu Đồ Cơ Cấu Chi Tiêu
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {categoryDonutData.length} danh mục
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Hiển thị tỷ trọng, số tiền và số giao dịch. <strong>Click vào danh mục</strong> để xem chi tiết giao dịch.
            </p>

            {/* Donut Chart with Total in Center */}
            <div className="h-64 w-full relative">
              {categoryDonutData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <PieIcon className="w-8 h-8 mb-2 opacity-40" />
                  Chưa có dữ liệu chi tiêu trong kỳ
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDonutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={2.5}
                      onClick={(entry) => setSelectedCategoryDrilldown(entry.name)}
                      className="cursor-pointer"
                    >
                      {categoryDonutData.map((entry, index) => (
                        <Cell
                          key={`cat-donut-${index}`}
                          fill={entry.fill}
                          stroke={selectedCategoryDrilldown === entry.name ? '#ffffff' : 'transparent'}
                          strokeWidth={selectedCategoryDrilldown === entry.name ? 2.5 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip currency={userSettings.currency} />} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Center Donut Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Tổng Chi
                </span>
                <span className="text-sm font-bold font-display text-rose-600 dark:text-rose-400">
                  {formatCurrency(summaryMetrics.totalExpense, userSettings.currency, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Category List / Clickable Items */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 max-h-52 overflow-y-auto pr-1">
            {categoryDonutData.map((item) => {
              const ItemIcon = item.Icon;
              const isSelected = selectedCategoryDrilldown === item.name;
              return (
                <div
                  key={`cat-pill-${item.name}`}
                  onClick={() => setSelectedCategoryDrilldown(isSelected ? null : item.name)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-pink-50 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800 shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="p-1.5 rounded-lg flex-shrink-0 text-white shadow-xs"
                      style={{ backgroundColor: item.fill }}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.count} giao dịch • TB {formatCurrency(item.avgPerTx, userSettings.currency, true)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.value, userSettings.currency)}
                      </div>
                      <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-pink-600' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* C. BIỂU ĐỒ SO SÁNH DANH MỤC (Bar Chart & Ranking) */}
        <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  C. Biểu Đồ So Sánh Danh Mục
                </h3>
              </div>

              {/* Sort selector */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCategorySortBy('amount_desc')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    categorySortBy === 'amount_desc' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Chi tiêu cao nhất"
                >
                  Cao nhất
                </button>
                <button
                  type="button"
                  onClick={() => setCategorySortBy('count_desc')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    categorySortBy === 'count_desc' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Số lần giao dịch"
                >
                  Tần suất
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              So sánh mức chi tiêu trực quan giữa các danh mục (Ăn uống, Di chuyển, Mua sắm...)
            </p>

            {/* Horizontal-like Bar Chart */}
            <div className="h-64 w-full">
              {sortedCategoryComparison.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                  Chưa có dữ liệu danh mục
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCategoryComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={75} 
                    />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val, userSettings.currency), 'Đã chi']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Chi tiêu">
                      {sortedCategoryComparison.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Ranking Grid (Top Categories) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sortedCategoryComparison.slice(0, 6).map((item, idx) => (
              <div
                key={`rank-card-${idx}`}
                onClick={() => setSelectedCategoryDrilldown(item.name)}
                className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-[11px] cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    #{idx + 1} {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(item.value, userSettings.currency, true)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILLDOWN DRAWER (When clicking on category) */}
      {/* ========================================================================= */}
      {selectedCategoryDrilldown && drilldownCategoryStats && (
        <div className="p-5 md:p-6 rounded-2xl border-2 border-pink-500/30 bg-pink-50/20 dark:bg-pink-950/20 shadow-md backdrop-blur-xs transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-pink-600 text-white shadow-xs">
                {React.createElement(getCategoryIcon(selectedCategoryDrilldown), { className: 'w-4 h-4' })}
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                  Chi Tiết Giao Dịch Danh Mục: <span className="text-pink-600 dark:text-pink-400">{selectedCategoryDrilldown}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tổng {drilldownCategoryStats.count} giao dịch • Chiếm {drilldownCategoryStats.percentOfTotal.toFixed(1)}% tổng chi tiêu
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategoryDrilldown(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Đóng chi tiết"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Quick Stats of this category */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Tổng Đã Chi</span>
              <span className="text-sm md:text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(drilldownCategoryStats.total, userSettings.currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Chi Trung Bình / Lần</span>
              <span className="text-sm md:text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(drilldownCategoryStats.avg, userSettings.currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Khoản Chi Lớn Nhất</span>
              <span className="text-sm md:text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {drilldownCategoryStats.maxTx ? formatCurrency(drilldownCategoryStats.maxTx.amount, userSettings.currency) : '--'}
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Ghi chú</th>
                  <th className="py-2.5 px-3 text-right">Số tiền</th>
                  {onEditTransaction && <th className="py-2.5 px-2 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {drilldownCategoryTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDateVN(tx.transaction_date)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {tx.note || '--'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -{formatCurrency(tx.amount, userSettings.currency)}
                    </td>
                    {onEditTransaction && (
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300"
                        >
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* D. BIỂU ĐỒ XU HƯỚNG CHI TIÊU & SO SÁNH THÁNG HIỆN TẠI VS THÁNG TRƯỚC */}
      {/* ========================================================================= */}
      <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                D. Biểu Đồ Xu Hướng Chi Tiêu (So Sánh Tháng Này vs Tháng Trước)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              So sánh đường chi tiêu lũy kế theo từng ngày trong tháng để kiểm soát tốc độ đốt tiền
            </p>
          </div>

          {/* Trend Status Indicator Pill */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                spendingTrendComparison.trendStatus === 'decreasing'
                  ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : spendingTrendComparison.trendStatus === 'increasing'
                  ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  : 'bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}
            >
              {spendingTrendComparison.trendStatus === 'decreasing' ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" /> Xu hướng: ĐANG GIẢM (Tiết kiệm tốt hơn)
                </>
              ) : spendingTrendComparison.trendStatus === 'increasing' ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" /> Xu hướng: ĐANG TĂNG (Cần chú ý chi tiêu)
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" /> Xu hướng: ỔN ĐỊNH (Cân bằng)
                </>
              )}
            </span>
          </div>
        </div>

        {/* 3 Quick Metrics Cards for Month Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 block">
              {spendingTrendComparison.currentMonthLabel} (Hiện tại)
            </span>
            <span className="text-base font-bold font-mono text-purple-800 dark:text-purple-300">
              {formatCurrency(spendingTrendComparison.totalCurrentMonth, userSettings.currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
              {spendingTrendComparison.prevMonthLabel} (Cùng kỳ)
            </span>
            <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-300">
              {formatCurrency(spendingTrendComparison.totalPrevMonth, userSettings.currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block">
              Dự Báo Cuối Tháng Này
            </span>
            <span className="text-base font-bold font-mono text-indigo-800 dark:text-indigo-300">
              ~{formatCurrency(spendingTrendComparison.projectedEndOfMonth, userSettings.currency)}
            </span>
          </div>
        </div>

        {/* Line Chart Comparison */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spendingTrendComparison.dailyPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis 
                tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false} 
                width={75} 
              />
              <Tooltip content={<CustomTrendComparisonTooltip currency={userSettings.currency} />} />
              <Line
                type="monotone"
                dataKey="currentMonthCumulative"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ r: 3, fill: '#8B5CF6' }}
                name="Tháng này (Lũy kế)"
              />
              <Line
                type="monotone"
                dataKey="prevMonthCumulative"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: '#94A3B8' }}
                name="Tháng trước (Lũy kế)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
              <span className="w-3 h-1 bg-purple-600 rounded-full" /> {spendingTrendComparison.currentMonthLabel} (Lũy kế)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <span className="w-3 h-1 bg-slate-400 rounded-full border-dashed" /> {spendingTrendComparison.prevMonthLabel} (Lũy kế)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Giúp đánh giá tiến độ chi tiêu qua từng ngày
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* E. BIỂU ĐỒ DÒNG TIỀN (Cash Flow Chart & Cumulative Balance) */}
      {/* ========================================================================= */}
      <div className="p-5 md:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                E. Biểu Đồ Dòng Tiền (Cash Flow & Số Dư Tích Lũy)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Theo dõi dòng tiền vào (Thu), tiền ra (Chi) và đường diễn biến số dư tích lũy tổng thể
            </p>
          </div>

          {/* Granularity Selector for Cash Flow */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold self-start sm:self-auto">
            {(['day', 'week', 'month'] as CashflowGranularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setCashflowGranularity(g)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  cashflowGranularity === g
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {g === 'day' ? 'Ngày' : g === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Overview Stat Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
              Tổng Tiền Vào (Inflow)
            </span>
            <span className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-300">
              +{formatCurrency(cashflowAggregates.totalIn, userSettings.currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block">
              Tổng Tiền Ra (Outflow)
            </span>
            <span className="text-base font-bold font-mono text-rose-800 dark:text-rose-300">
              -{formatCurrency(cashflowAggregates.totalOut, userSettings.currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 block">
              Dòng Tiền Thuần Tích Lũy
            </span>
            <span className={`text-base font-bold font-mono ${cashflowAggregates.netTotal >= 0 ? 'text-purple-800 dark:text-purple-300' : 'text-rose-800 dark:text-rose-300'}`}>
              {cashflowAggregates.netTotal >= 0 ? '+' : ''}
              {formatCurrency(cashflowAggregates.netTotal, userSettings.currency)}
            </span>
          </div>
        </div>

        {/* Composed Chart (Bars for Flow, Line for Cumulative Balance) */}
        <div className="h-72 w-full">
          {cashflowTimelineData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Activity className="w-8 h-8 mb-2 opacity-40" />
              Chưa có dữ liệu dòng tiền
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashflowTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis 
                  tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={75} 
                />
                <Tooltip content={<CustomCashflowTooltip currency={userSettings.currency} />} />
                <Bar dataKey="inflow" fill="#10B981" radius={[4, 4, 0, 0]} name="Tiền vào" />
                <Bar dataKey="outflow" fill="#EF4444" radius={[4, 4, 0, 0]} name="Tiền ra" />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#8B5CF6' }}
                  name="Số dư tích lũy"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Tiền vào (Thu)
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Tiền ra (Chi)
            </span>
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
              <span className="w-3 h-1 bg-purple-500 rounded-full" /> Số dư tích lũy
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Dữ liệu tổng hợp toàn bộ lịch sử thu chi
          </div>
        </div>
      </div>
    </div>
  );
};
