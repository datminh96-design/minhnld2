import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatPercent, getCurrentMonthPrefix, isInvestmentTransaction, calculateMonthlyCumulativeCashflow } from '../../lib/utils';
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
  Zap,
  BarChart3,
  CircleDollarSign,
  Plus,
  ArrowRight,
  ShieldAlert,
  Coins,
  Receipt,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Heart,
  BookOpen,
  Film,
  HelpCircle,
  Edit3,
  Trash2
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
  Legend,
} from 'recharts';
import { Analytics } from './Analytics';
import { NetBalanceTrendChart } from '../../components/NetBalanceTrendChart';
import { MonthlyIncomeExpenseChart } from '../../components/MonthlyIncomeExpenseChart';
import { CategorySpendingPieChart } from '../../components/CategorySpendingPieChart';
import { DateRangePicker, DateFilterValue } from '../../components/DateRangePicker';
import { TransactionModalForm } from '../expenses/TransactionModalForm';
import { Transaction, ExpenseCategory } from '../../types';

export interface DashboardProps {
  onNavigateTab?: (tab: 'work' | 'expenses' | 'investments' | 'storage' | 'reports' | 'settings') => void;
  onQuickAction?: (action: 'add-work' | 'add-transaction' | 'add-investment') => void;
}

// Category Icon mapping helper
const getCategoryIcon = (iconKey?: string, name?: string) => {
  const normalized = (iconKey || name || '').toLowerCase();
  if (normalized.includes('ăn') || normalized.includes('food') || normalized.includes('uống')) return Utensils;
  if (normalized.includes('xe') || normalized.includes('đi lại') || normalized.includes('transport') || normalized.includes('xăng')) return Car;
  if (normalized.includes('nhà') || normalized.includes('rent') || normalized.includes('điện') || normalized.includes('nước')) return Home;
  if (normalized.includes('mua') || normalized.includes('shopping') || normalized.includes('sắm')) return ShoppingBag;
  if (normalized.includes('khỏe') || normalized.includes('health') || normalized.includes('thuốc')) return Heart;
  if (normalized.includes('học') || normalized.includes('education') || normalized.includes('sách')) return BookOpen;
  if (normalized.includes('chơi') || normalized.includes('giải trí') || normalized.includes('game')) return Film;
  if (normalized.includes('lương') || normalized.includes('salary') || normalized.includes('thưởng')) return Coins;
  return Receipt;
};

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateTab = () => {},
  onQuickAction = () => {},
}) => {
  const { 
    workLogs, 
    workSettings, 
    transactions, 
    categories,
    calculatedHoldings, 
    portfolioSnapshots,
    takeDailySnapshot,
    saveTransaction,
    deleteTransaction,
    saveCategory,
    addToast,
    userSettings 
  } = useData();

  // Current active date reference
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear();
  const monthStr = String(currentMonth).padStart(2, '0');
  const prefix = getCurrentMonthPrefix();

  // Date Range Filter State for Charts & Dashboard
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'month',
    year: currentYear,
    month: currentMonth,
  });

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(currentYear);
    transactions.forEach(t => {
      if (t.transaction_date && t.transaction_date.length >= 4) {
        const y = parseInt(t.transaction_date.substring(0, 4), 10);
        if (!isNaN(y) && y > 2000 && y < 2100) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  // Filter transactions for category pie chart based on dateFilter
  const filteredCategoryTransactions = useMemo(() => {
    if (dateFilter.mode === 'year') {
      const yearPrefix = `${dateFilter.year}-`;
      return transactions.filter(t => t.transaction_date?.startsWith(yearPrefix));
    }
    const monthPrefix = `${dateFilter.year}-${String(dateFilter.month).padStart(2, '0')}`;
    return transactions.filter(t => t.transaction_date?.startsWith(monthPrefix));
  }, [transactions, dateFilter.mode, dateFilter.year, dateFilter.month]);

  const selectedPeriodLabel = dateFilter.mode === 'year'
    ? `Cả Năm ${dateFilter.year}`
    : `Tháng ${dateFilter.month}/${dateFilter.year}`;

  // Transaction Edit Modal State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedTx = async (data: {
    id?: string;
    type: 'income' | 'expense' | 'investment';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
  }) => {
    const matchedCat = categories.find((c) => c.name === data.category);

    await saveTransaction({
      id: data.id,
      transaction_date: data.transaction_date,
      transaction_type: data.type,
      category_id: matchedCat?.id,
      category_name: data.category,
      amount: data.amount,
      note: data.description,
    });
    addToast('Đã cập nhật giao dịch thành công!', 'success');
  };

  const handleQuickAddCategory = async (catData: Partial<ExpenseCategory>) => {
    if (!catData.name?.trim()) return null;
    return await saveCategory({
      name: catData.name.trim(),
      type: catData.type || (editingTx?.transaction_type || 'expense'),
      color: catData.color || '#10B981',
    });
  };

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

      if (['Làm việc', 'Tăng ca', 'Làm nửa ngày', 'Nghỉ phép năm', 'Nghỉ lễ'].includes(l.work_status)) {
        workDaysCount += (l.work_status === 'Làm nửa ngày' ? 0.5 : 1);
      } else if (l.work_status === 'Nghỉ phép' || l.work_status === 'Nghỉ không lương') {
        leaveDaysCount += 1;
      }
    });

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
  // CARD 2 – STATS CHI TIÊU & TÍCH LŨY (KÈM SỐ DƯ LŨY KẾ THÁNG TRƯỚC)
  // ==========================================
  const expenseStats = useMemo(() => {
    const cumulative = calculateMonthlyCumulativeCashflow(transactions, prefix);
    const monthTx = transactions.filter((t) => t.transaction_date && t.transaction_date.startsWith(prefix));

    const categoryTotals: Record<string, number> = {};

    monthTx.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.transaction_type === 'expense' && !isInvestmentTransaction(t)) {
        categoryTotals[t.category_name] = (categoryTotals[t.category_name] || 0) + amt;
      }
    });

    const dailyAvgExpense = cumulative.currentMonthLivingExpense > 0 ? cumulative.currentMonthLivingExpense / 30 : 0;

    let topCategory = { name: 'Chưa có', amount: 0 };
    Object.entries(categoryTotals).forEach(([name, amount]) => {
      if (amount > topCategory.amount) {
        topCategory = { name, amount };
      }
    });

    return {
      totalIncome: cumulative.currentMonthIncome,
      totalExpense: cumulative.currentMonthLivingExpense,
      totalInvestment: cumulative.currentMonthInvestment,
      netSavings: cumulative.currentMonthNetSavings,
      previousCarryoverBalance: cumulative.previousCarryoverBalance,
      cumulativeBalance: cumulative.cumulativeBalance,
      hasPreviousCarryover: cumulative.hasPreviousCarryover,
      savingsRate: cumulative.savingsRate,
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

  // Total Net Worth (Investments + Cumulative Cashflow Balance)
  const estimatedTotalNetWorth = investmentStats.currentTotalValue + Math.max(0, expenseStats.cumulativeBalance);

  React.useEffect(() => {
    takeDailySnapshot(investmentStats.currentTotalValue, investmentStats.totalInvested);
  }, [investmentStats.currentTotalValue, investmentStats.totalInvested, takeDailySnapshot]);

  // Recent Transactions (sorted by date desc, top 6)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date).getTime();
        const dateB = new Date(b.transaction_date).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [transactions]);

  // Portfolio Snapshots Chart Data
  const chartData = useMemo(() => {
    return portfolioSnapshots.map((s) => ({
      date: s.snapshot_date.substring(5),
      fullDate: s.snapshot_date,
      value: s.total_value,
      cost: s.total_cost,
      profit: s.total_profit,
    }));
  }, [portfolioSnapshots]);

  // ==========================================
  // MONTHLY CASHFLOW BAR CHART (INFLOWS VS OUTFLOWS)
  // ==========================================
  const [cashflowRange, setCashflowRange] = useState<'6m' | '12m' | 'year'>('6m');

  const monthlyCashflowData = useMemo(() => {
    const now = new Date();
    const monthsCount = cashflowRange === '6m' ? 6 : cashflowRange === '12m' ? 12 : (now.getMonth() + 1);
    
    const list = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth() + 1;
      const mPrefix = `${y}-${String(m).padStart(2, '0')}`;
      const monthLabel = `T${m}/${String(y).slice(2)}`;
      const fullMonthName = `Tháng ${m}/${y}`;

      let inflow = 0;
      let outflow = 0;
      let investment = 0;

      transactions.forEach((t) => {
        if (t.transaction_date && t.transaction_date.startsWith(mPrefix)) {
          const amt = Number(t.amount) || 0;
          if (t.transaction_type === 'income') {
            inflow += amt;
          } else if (isInvestmentTransaction(t)) {
            investment += amt;
          } else if (t.transaction_type === 'expense') {
            outflow += amt;
          }
        }
      });

      const net = inflow - outflow - investment;
      const savingsRate = inflow > 0 ? Math.round(((inflow - outflow) / inflow) * 100) : (outflow > 0 ? -100 : 0);

      list.push({
        monthKey: mPrefix,
        monthLabel,
        fullMonthName,
        inflow,
        outflow,
        investment,
        net,
        savingsRate,
      });
    }

    return list;
  }, [transactions, cashflowRange]);

  const cashflowSummary = useMemo(() => {
    const totalInflow = monthlyCashflowData.reduce((acc, curr) => acc + curr.inflow, 0);
    const totalOutflow = monthlyCashflowData.reduce((acc, curr) => acc + curr.outflow, 0);
    const totalInvestment = monthlyCashflowData.reduce((acc, curr) => acc + curr.investment, 0);
    const netSavings = totalInflow - totalOutflow - totalInvestment;
    const avgSavingsRate = totalInflow > 0 ? Math.round((netSavings / totalInflow) * 100) : 0;
    const hasAnyData = monthlyCashflowData.some((m) => m.inflow > 0 || m.outflow > 0 || m.investment > 0);

    return {
      totalInflow,
      totalOutflow,
      totalInvestment,
      netSavings,
      avgSavingsRate,
      hasAnyData,
    };
  }, [monthlyCashflowData]);

  // Budget Tracker Metrics
  const budgetLimit = userSettings.monthly_budget_limit || 15_000_000;
  const threshold = userSettings.budget_warning_threshold || 80;
  const spentPercent = budgetLimit > 0 ? (expenseStats.totalExpense / budgetLimit) * 100 : 0;
  const isOverBudget = spentPercent >= 100;
  const isWarning = spentPercent >= threshold && !isOverBudget;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Total Balance & Net Worth Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Tổng Giá Trị Tài Sản Ước Tính (Total Balance)
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              {formatCurrency(estimatedTotalNetWorth, userSettings.currency)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Danh mục đầu tư đạt <span className="text-emerald-400 font-semibold">{formatCurrency(investmentStats.currentTotalValue, userSettings.currency)}</span> ({formatPercent(investmentStats.overallProfitPercent)}), dòng tiền tích lũy khả dụng <span className="text-emerald-300 font-semibold">{formatCurrency(expenseStats.cumulativeBalance, userSettings.currency)}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onQuickAction('add-work')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm border border-white/10 transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" /> + Chấm Công
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-transaction')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm border border-white/10 transition-all cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-300" /> + Thu/Chi
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add-investment')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-md shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" /> + Đầu Tư
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Functional Metric Cards */}
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
                  <span className="text-[11px] text-slate-400">Tháng {monthStr}/{currentYear}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('work')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
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

        {/* CARD 2: CHI TIÊU & NGÂN SÁCH */}
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
                  <span className="text-[11px] text-slate-400">Dòng tiền tháng {monthStr}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Chi tiết →
              </button>
            </div>

            {/* Main Metric */}
            <div className="my-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <span>Số dư ròng khả dụng (Dòng tiền còn lại)</span>
                  </p>
                  <p className={`text-2xl sm:text-3xl font-bold font-display ${expenseStats.cumulativeBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(expenseStats.cumulativeBalance, userSettings.currency)}
                  </p>
                  {expenseStats.hasPreviousCarryover ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        Từ tháng trước: {expenseStats.previousCarryoverBalance >= 0 ? '+' : ''}{formatCurrency(expenseStats.previousCarryoverBalance, userSettings.currency, true)}
                      </span>
                      <span>•</span>
                      <span>
                        Tháng này: {expenseStats.netSavings >= 0 ? '+' : ''}{formatCurrency(expenseStats.netSavings, userSettings.currency, true)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tháng này: {expenseStats.netSavings >= 0 ? '+' : ''}{formatCurrency(expenseStats.netSavings, userSettings.currency, true)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {expenseStats.txCount} giao dịch
                  </span>
                </div>
              </div>

              {/* Monthly Budget Tracker Bar */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Ngân sách: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(expenseStats.totalExpense, userSettings.currency, true)}</strong> / {formatCurrency(budgetLimit, userSettings.currency, true)}
                  </span>
                  <span className={`font-mono font-bold ${
                    isOverBudget ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {spentPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, spentPercent)}%` }}
                  />
                </div>
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
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Tích lũy & Đầu tư riêng:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                {formatCurrency(expenseStats.totalInvestment, userSettings.currency, true)}
              </strong>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Tiết kiệm: {expenseStats.totalIncome > 0
                ? `${Math.round(((expenseStats.totalIncome - expenseStats.totalExpense) / expenseStats.totalIncome) * 100)}%`
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
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
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

      {/* 4. QUICK ACTIONS & ASSET PORTFOLIO GROWTH ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Summary & Quick Actions (Col Span 1) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Lối Tắt Nhanh & Trạng Thái
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold">
                Sẵn sàng
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onQuickAction('add-transaction')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Ghi chép thu / chi mới</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onQuickAction('add-work')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Ghi nhận chấm công hôm nay</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onQuickAction('add-investment')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Mua / Bán tài sản đầu tư</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Health Summary Box */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs space-y-1.5 shadow-md">
            <div className="flex items-center justify-between font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sức khỏe tài chính
              </span>
              <span>{cashflowSummary.avgSavingsRate >= 20 ? 'Tốt' : 'Cần tối ưu'}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Tỷ lệ tiết kiệm tháng này đạt {cashflowSummary.avgSavingsRate}%. Mục tiêu duy trì thặng dư dương và đầu tư định kỳ.
            </p>
          </div>
        </div>

        {/* 5. BIỂU ĐỒ TỔNG TÀI SẢN THEO THỜI GIAN (Col Span 2) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
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
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <PieIcon className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm font-medium">Chưa có dữ liệu lịch sử</p>
              <p className="text-xs mt-1">Biểu đồ sẽ xuất hiện khi có biến động tài sản qua các ngày</p>
            </div>
          ) : (
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
          )}
          </div>
        </div>
      </div>

      {/* Transaction Edit Modal */}
      <TransactionModalForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTx(null);
        }}
        editingTx={editingTx}
        categories={categories}
        userSettings={userSettings}
        defaultType={editingTx?.transaction_type || 'expense'}
        onSave={handleSaveEditedTx}
        onAddCategory={handleQuickAddCategory}
      />
    </div>
  );
};
export const DashboardView = Dashboard;
