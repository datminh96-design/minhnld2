import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Database, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Layers, 
  Tag, 
  Filter,
  Sparkles,
  PieChart,
  BarChart3,
  Sliders,
  MoreVertical,
  Check,
  PauseCircle,
  HelpCircle
} from 'lucide-react';
import { getSupabaseClient, getSupabaseStatus } from '../lib/supabase';
import { formatCurrency, formatPercent } from '../lib/utils';
import { Project, ProjectStatus, Transaction } from '../types';
import { useData } from '../context/DataContext';
import { DEFAULT_USER_SETTINGS } from '../lib/seedData';
import { ProjectModalForm } from '../features/dashboard/ProjectModalForm';
import { TransactionModalForm } from '../features/expenses/TransactionModalForm';
import { MonthlyIncomeExpenseChart } from './MonthlyIncomeExpenseChart';
import { DateRangePicker, DateFilterValue } from './DateRangePicker';
import { CategorySpendingPieChart } from './CategorySpendingPieChart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export interface DashboardProps {
  onNavigateTab?: (tab: 'work' | 'expenses' | 'investments' | 'storage' | 'reports' | 'settings') => void;
  onQuickAction?: (action: 'add-work' | 'add-transaction' | 'add-investment') => void;
}

// Safe hook that allows Dashboard to function both within DataProvider and standalone
const useSafeData = () => {
  try {
    return useData();
  } catch {
    return null;
  }
};

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateTab = () => {},
  onQuickAction = () => {},
}) => {
  const contextData = useSafeData();

  // Fallback standalone states if rendered without DataProvider
  const [standaloneTxs, setStandaloneTxs] = useState<Transaction[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_transactions');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [standaloneProjects, setStandaloneProjects] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_projects');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Effective data sources (Context or Standalone)
  const transactions = contextData?.transactions ?? standaloneTxs;
  const categories = contextData?.categories ?? [];
  const projects = contextData?.projects ?? standaloneProjects;
  const userSettings = contextData?.userSettings ?? DEFAULT_USER_SETTINGS;
  const syncStatus = contextData?.syncStatus ?? 'synced';
  const lastSyncedAt = contextData?.lastSyncedAt ?? new Date();

  const addToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (contextData?.addToast) {
      contextData.addToast(msg, type);
    } else {
      console.log(`[Toast ${type}]:`, msg);
    }
  }, [contextData]);

  const saveProject = useCallback(async (projData: Omit<Project, 'id'> & { id?: string }) => {
    if (contextData?.saveProject) {
      await contextData.saveProject(projData);
      return;
    }

    const id = projData.id || `proj_${Date.now()}`;
    const newProj: Project = {
      ...projData,
      id,
      updated_at: new Date().toISOString(),
      created_at: (projData as any).created_at || new Date().toISOString(),
    };

    setStandaloneProjects(prev => {
      const exists = prev.some(p => p.id === id);
      const updated = exists ? prev.map(p => p.id === id ? newProj : p) : [newProj, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_projects', JSON.stringify(updated));
      }
      return updated;
    });

    const { client } = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').upsert([newProj]);
      } catch (e) {
        console.warn('Direct supabase saveProject error:', e);
      }
    }
  }, [contextData]);

  const deleteProject = useCallback(async (id: string) => {
    if (contextData?.deleteProject) {
      await contextData.deleteProject(id);
      return;
    }

    setStandaloneProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_projects', JSON.stringify(updated));
      }
      return updated;
    });

    const { client } = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').delete().eq('id', id);
      } catch (e) {
        console.warn('Direct supabase deleteProject error:', e);
      }
    }
  }, [contextData]);

  const saveTransaction = useCallback(async (txData: Omit<Transaction, 'id'> & { id?: string }) => {
    if (contextData?.saveTransaction) {
      await contextData.saveTransaction(txData);
      return;
    }

    const id = txData.id || `tx_${Date.now()}`;
    const newTx: Transaction = {
      ...txData,
      id,
      created_at: (txData as any).created_at || new Date().toISOString(),
    };

    setStandaloneTxs(prev => {
      const exists = prev.some(t => t.id === id);
      const updated = exists ? prev.map(t => t.id === id ? newTx : t) : [newTx, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_transactions', JSON.stringify(updated));
      }
      return updated;
    });

    const { client } = getSupabaseClient();
    if (client) {
      try {
        await client.from('transactions').upsert([newTx]);
      } catch (e) {
        console.warn('Direct supabase saveTransaction error:', e);
      }
    }
  }, [contextData]);

  // Supabase Connection State
  const [supabaseStatus, setSupabaseStatus] = useState(() => getSupabaseStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [supabaseLatencyMs, setSupabaseLatencyMs] = useState<number | null>(null);

  // Time Period State via DateRangePicker
  const now = new Date();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const selectedMonth = dateFilter.month;
  const selectedYear = dateFilter.year;
  const filterMode = dateFilter.mode;

  // Available unique years in dataset
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(now.getFullYear());
    transactions.forEach(t => {
      if (t.transaction_date && t.transaction_date.length >= 4) {
        const y = parseInt(t.transaction_date.substring(0, 4), 10);
        if (!isNaN(y) && y > 2000 && y < 2100) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions, now]);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('income');

  // Measure Supabase Connection Latency & direct fetch if standalone
  const testSupabaseConnection = useCallback(async () => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) {
      setSupabaseLatencyMs(null);
      return;
    }

    try {
      const start = performance.now();
      const { data: txData } = await client.from('transactions').select('*').limit(100);
      const latency = Math.round(performance.now() - start);
      setSupabaseLatencyMs(latency);

      // If standalone (no context), populate from live Supabase
      if (!contextData && txData && Array.isArray(txData)) {
        setStandaloneTxs(txData as Transaction[]);
      }

      if (!contextData) {
        const { data: projData } = await client.from('projects').select('*').limit(50);
        if (projData && Array.isArray(projData)) {
          setStandaloneProjects(projData as Project[]);
        }
      }
    } catch (e) {
      setSupabaseLatencyMs(null);
    }
  }, [contextData]);

  useEffect(() => {
    setSupabaseStatus(getSupabaseStatus());
    testSupabaseConnection();
  }, [testSupabaseConnection]);

  // Realtime Supabase Subscription for instant sync
  useEffect(() => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    const channel = client
      .channel('dashboard_view_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          if (contextData?.syncWithSupabase) {
            contextData.syncWithSupabase(false);
          } else {
            testSupabaseConnection();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          if (contextData?.syncWithSupabase) {
            contextData.syncWithSupabase(false);
          } else {
            testSupabaseConnection();
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [contextData, testSupabaseConnection]);

  // Handle Manual Sync
  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      if (contextData?.syncWithSupabase) {
        await contextData.syncWithSupabase(true);
      }
      await testSupabaseConnection();
      addToast('Đã kết nối và đồng bộ dữ liệu mới nhất từ Supabase Cloud', 'success');
    } catch (err: any) {
      addToast('Lỗi khi đồng bộ Supabase: ' + (err?.message || 'Không thể kết nối'), 'error');
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Filter Transactions by Selected Month or Year via DateRangePicker
  const isYearMode = dateFilter.mode === 'year';
  const periodLabel = isYearMode 
    ? `Cả Năm ${dateFilter.year}` 
    : `Tháng ${dateFilter.month}/${dateFilter.year}`;
  const prevPeriodLabel = isYearMode 
    ? `Năm trước (${dateFilter.year - 1})` 
    : `Tháng trước`;

  const currentPeriodTransactions = useMemo(() => {
    if (isYearMode) {
      const yearPrefix = `${dateFilter.year}-`;
      return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(yearPrefix));
    }
    const monthPrefix = `${dateFilter.year}-${String(dateFilter.month).padStart(2, '0')}`;
    return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(monthPrefix));
  }, [transactions, isYearMode, dateFilter.year, dateFilter.month]);

  const prevPeriodTransactions = useMemo(() => {
    if (isYearMode) {
      const prevYearPrefix = `${dateFilter.year - 1}-`;
      return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(prevYearPrefix));
    }
    const prevMonthDate = new Date(dateFilter.year, dateFilter.month - 2, 1);
    const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(t => t.transaction_date && t.transaction_date.startsWith(prevMonthPrefix));
  }, [transactions, isYearMode, dateFilter.year, dateFilter.month]);

  // Aliases for compatibility
  const currentMonthTransactions = currentPeriodTransactions;
  const prevMonthTransactions = prevPeriodTransactions;

  // ==========================================
  // 1. INCOME SUMMARY CALCULATIONS
  // ==========================================
  const incomeStats = useMemo(() => {
    const incomeTxs = currentPeriodTransactions.filter(t => t.transaction_type === 'income');
    const totalIncome = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevIncomeTxs = prevPeriodTransactions.filter(t => t.transaction_type === 'income');
    const prevTotalIncome = prevIncomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    let growthPercent = 0;
    if (prevTotalIncome > 0) {
      growthPercent = ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
    }

    // Breakdown by Category
    const categoryBreakdown: Record<string, number> = {};
    incomeTxs.forEach(t => {
      const cat = t.category_name || 'Khác';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(t.amount) || 0);
    });

    const topIncomeSources = Object.entries(categoryBreakdown)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const averagePerUnit = isYearMode
      ? (totalIncome > 0 ? totalIncome / 12 : 0)
      : (totalIncome > 0 ? totalIncome / 30 : 0);

    return {
      totalIncome,
      prevTotalIncome,
      growthPercent,
      txCount: incomeTxs.length,
      topIncomeSources,
      averagePerDay: averagePerUnit,
      averagePerUnit,
    };
  }, [currentPeriodTransactions, prevPeriodTransactions, isYearMode]);

  // ==========================================
  // 2. EXPENSES SUMMARY CALCULATIONS
  // ==========================================
  const expenseStats = useMemo(() => {
    const expenseTxs = currentPeriodTransactions.filter(
      t => t.transaction_type === 'expense' && t.category_name !== 'Tích lũy & Đầu tư'
    );
    const totalExpense = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevExpenseTxs = prevPeriodTransactions.filter(
      t => t.transaction_type === 'expense' && t.category_name !== 'Tích lũy & Đầu tư'
    );
    const prevTotalExpense = prevExpenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    let growthPercent = 0;
    if (prevTotalExpense > 0) {
      growthPercent = ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
    }

    const baseMonthlyLimit = userSettings.monthly_budget_limit || 15000000;
    const budgetLimit = isYearMode ? baseMonthlyLimit * 12 : baseMonthlyLimit;
    const budgetUsedPercent = budgetLimit > 0 ? (totalExpense / budgetLimit) * 100 : 0;
    const remainingBudget = Math.max(0, budgetLimit - totalExpense);

    // Breakdown by Category
    const categoryBreakdown: Record<string, number> = {};
    expenseTxs.forEach(t => {
      const cat = t.category_name || 'Khác';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(t.amount) || 0);
    });

    const topCategories = Object.entries(categoryBreakdown)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const averagePerUnit = isYearMode
      ? (totalExpense > 0 ? totalExpense / 12 : 0)
      : (totalExpense > 0 ? totalExpense / 30 : 0);

    return {
      totalExpense,
      prevTotalExpense,
      growthPercent,
      budgetLimit,
      budgetUsedPercent,
      remainingBudget,
      isOverBudget: totalExpense > budgetLimit,
      txCount: expenseTxs.length,
      topCategories,
      averagePerDay: averagePerUnit,
      averagePerUnit,
    };
  }, [currentPeriodTransactions, prevPeriodTransactions, userSettings.monthly_budget_limit, isYearMode]);

  // ==========================================
  // 3. PROJECT STATUS SUMMARY CALCULATIONS
  // ==========================================
  const projectStats = useMemo(() => {
    const totalProjects = projects.length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const review = projects.filter(p => p.status === 'review').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    const planning = projects.filter(p => p.status === 'planning').length;

    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);

    const avgProgress = totalProjects > 0
      ? Math.round(projects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / totalProjects)
      : 0;

    return {
      totalProjects,
      inProgress,
      completed,
      review,
      onHold,
      planning,
      totalBudget,
      totalSpent,
      avgProgress,
      activeProjects: inProgress + review,
    };
  }, [projects]);

  // Handle Quick Project Status Update
  const handleQuickStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    const updatedProgress = newStatus === 'completed' ? 100 : project.progress;
    await saveProject({
      ...project,
      status: newStatus,
      progress: updatedProgress,
    });
    addToast(`Đã chuyển trạng thái dự án "${project.name}" sang ${getStatusLabel(newStatus)}`, 'success');
  };

  // Helper for status badge styling
  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Hoàn thành',
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'in_progress':
        return {
          label: 'Đang triển khai',
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500 animate-pulse',
        };
      case 'review':
        return {
          label: 'Chờ nghiệm thu',
          bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500',
        };
      case 'on_hold':
        return {
          label: 'Tạm hoãn',
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      case 'planning':
      default:
        return {
          label: 'Lên kế hoạch',
          bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in_progress': return 'Đang triển khai';
      case 'review': return 'Chờ nghiệm thu';
      case 'on_hold': return 'Tạm hoãn';
      case 'planning': return 'Lên kế hoạch';
      default: return status;
    }
  };

  // Quick Transaction Add Handler
  const handleSaveTransaction = async (data: {
    id?: string;
    type: 'income' | 'expense' | 'investment';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
  }) => {
    const matchedCat = categories.find(c => c.name === data.category);
    await saveTransaction({
      id: data.id,
      transaction_date: data.transaction_date,
      transaction_type: data.type,
      category_id: matchedCat?.id,
      category_name: data.category,
      amount: data.amount,
      note: data.description,
    });
    addToast('Đã lưu giao dịch thành công!', 'success');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =========================================================================
          DATE RANGE PICKER (BY MONTH OR YEAR) & QUICK ACTIONS
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={dateFilter}
            onChange={setDateFilter}
            availableYears={availableYears}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTxModalType('income');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Thu Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTxModalType('expense');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Chi Tiêu
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Dự Án Mới
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE THREE REQUIRED CORE SUMMARY CARDS
          1. INCOME SUMMARY CARD
          2. EXPENSES SUMMARY CARD
          3. CURRENT PROJECT STATUS SUMMARY CARD
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* =====================================================================
            CARD 1: INCOME SUMMARY
            ===================================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    TỔNG THU NHẬP (INCOME)
                  </h3>
                  <span className="text-[11px] text-slate-400">{periodLabel}</span>
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

            {/* Main Hero Number */}
            <div className="my-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
                  {formatCurrency(incomeStats.totalIncome, userSettings.currency)}
                </p>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                    incomeStats.growthPercent >= 0 
                      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300' 
                      : 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}>
                    {incomeStats.growthPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {incomeStats.growthPercent >= 0 ? '+' : ''}{incomeStats.growthPercent.toFixed(1)}% {isYearMode ? 'vs năm trước' : 'vs tháng trước'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {prevPeriodLabel}: {formatCurrency(incomeStats.prevTotalIncome, userSettings.currency, true)} • {incomeStats.txCount} khoản thu
              </p>
            </div>

            {/* Top Income Sources Breakdown */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nguồn thu chính:</span>
                <span className="text-slate-400 font-normal text-[11px]">Tỷ trọng</span>
              </p>
              {incomeStats.topIncomeSources.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Chưa ghi nhận khoản thu nào {isYearMode ? 'trong năm' : 'tháng này'}
                </div>
              ) : (
                <div className="space-y-2">
                  {incomeStats.topIncomeSources.slice(0, 3).map((item) => {
                    const pct = incomeStats.totalIncome > 0 ? (item.amount / incomeStats.totalIncome) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                            {item.name}
                          </span>
                          <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.amount, userSettings.currency, true)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>{isYearMode ? 'TB Thu/tháng:' : 'TB Thu/ngày:'} <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(incomeStats.averagePerUnit, userSettings.currency, true)}</strong></span>
            <button
              type="button"
              onClick={() => {
                setTxModalType('income');
                setIsTxModalOpen(true);
              }}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Thêm thu nhập
            </button>
          </div>
        </div>

        {/* =====================================================================
            CARD 2: EXPENSES SUMMARY
            ===================================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    TỔNG CHI TIÊU (EXPENSES)
                  </h3>
                  <span className="text-[11px] text-slate-400">{periodLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Chi tiết →
              </button>
            </div>

            {/* Main Hero Number */}
            <div className="my-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
                  {formatCurrency(expenseStats.totalExpense, userSettings.currency)}
                </p>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                    expenseStats.growthPercent <= 0 
                      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300' 
                      : 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}>
                    {expenseStats.growthPercent > 0 ? '+' : ''}{expenseStats.growthPercent.toFixed(1)}% {isYearMode ? 'vs năm trước' : 'vs tháng trước'}
                  </span>
                </div>
              </div>

              {/* Monthly Budget Tracker Gauge */}
              <div className="mt-2.5 pt-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Ngân sách {isYearMode ? 'năm' : 'tháng'}: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(expenseStats.budgetLimit, userSettings.currency, true)}</strong>
                  </span>
                  <span className={`font-mono font-bold ${
                    expenseStats.isOverBudget ? 'text-rose-600' : expenseStats.budgetUsedPercent >= 80 ? 'text-amber-500' : 'text-emerald-600'
                  }`}>
                    {expenseStats.budgetUsedPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      expenseStats.isOverBudget ? 'bg-rose-500' : expenseStats.budgetUsedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, expenseStats.budgetUsedPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Còn lại trong hạn mức:</span>
                  <span className={`font-mono font-bold ${expenseStats.isOverBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(expenseStats.remainingBudget, userSettings.currency, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Expense Categories Breakdown */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chi tiêu nhiều nhất:
              </p>
              {expenseStats.topCategories.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Chưa có giao dịch chi tiêu nào {isYearMode ? 'trong năm' : 'trong tháng'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {expenseStats.topCategories.slice(0, 4).map((cat) => (
                    <div key={cat.name} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{cat.name}</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {formatCurrency(cat.amount, userSettings.currency, true)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>{isYearMode ? 'TB Chi/tháng:' : 'TB Chi/ngày:'} <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(expenseStats.averagePerUnit, userSettings.currency, true)}</strong></span>
            <button
              type="button"
              onClick={() => {
                setTxModalType('expense');
                setIsTxModalOpen(true);
              }}
              className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Thêm chi tiêu
            </button>
          </div>
        </div>

        {/* =====================================================================
            CARD 3: CURRENT PROJECT STATUS SUMMARY
            ===================================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    TRẠNG THÁI DỰ ÁN (PROJECT STATUS)
                  </h3>
                  <span className="text-[11px] text-slate-400">{projectStats.activeProjects} dự án đang hoạt động</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setIsProjectModalOpen(true);
                }}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                + Thêm mới
              </button>
            </div>

            {/* Main Metrics Overview */}
            <div className="my-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-slate-400">Tiến độ bàn giao tổng thể</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
                    {projectStats.avgProgress}%
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {projectStats.completed}/{projectStats.totalProjects} hoàn tất
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${projectStats.avgProgress}%` }}
                />
              </div>

              {/* Project Status Badges Count */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                <div className="p-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Đang chạy</p>
                  <p className="text-xs font-extrabold text-blue-800 dark:text-blue-300 mt-0.5">{projectStats.inProgress}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/40">
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Nghiệm thu</p>
                  <p className="text-xs font-extrabold text-purple-800 dark:text-purple-300 mt-0.5">{projectStats.review}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Hoàn tất</p>
                  <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5">{projectStats.completed}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Tạm dừng</p>
                  <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300 mt-0.5">{projectStats.onHold}</p>
                </div>
              </div>
            </div>

            {/* Compact Project Items List */}
            <div className="space-y-2 pt-1 max-h-[160px] overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Chưa có dự án nào. Nhấn "+ Thêm mới" để bắt đầu.
                </div>
              ) : (
                projects.slice(0, 3).map((proj) => {
                  const badge = getStatusBadge(proj.status);
                  return (
                    <div
                      key={proj.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {proj.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          {proj.client && <span className="truncate max-w-[100px]">{proj.client}</span>}
                          {proj.deadline && <span>Hạn: {proj.deadline}</span>}
                          <span className="font-mono text-purple-600 font-bold">{proj.progress}%</span>
                        </div>
                      </div>

                      {/* Status Selector Dropdown */}
                      <select
                        value={proj.status}
                        onChange={(e) => handleQuickStatusChange(proj, e.target.value as ProjectStatus)}
                        className={`text-[11px] font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${badge.bg}`}
                      >
                        <option value="in_progress">Đang chạy</option>
                        <option value="review">Nghiệm thu</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="on_hold">Tạm dừng</option>
                        <option value="planning">Kế hoạch</option>
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng ngân sách: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(projectStats.totalBudget, userSettings.currency, true)}</strong></span>
            <button
              type="button"
              onClick={() => onNavigateTab('work')}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Xem nhật ký chấm công →
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CASH FLOW CHART: MONTHLY INCOME VS EXPENSES VIA RECHARTS
          ========================================================================= */}
      <MonthlyIncomeExpenseChart
        transactions={transactions}
        defaultRange={dateFilter.mode === 'year' ? 'custom_year' : '12m'}
        filterMode={dateFilter.mode}
        selectedYear={dateFilter.year}
        selectedMonth={dateFilter.month}
        defaultChartType="composed"
        showKpiSummary={true}
        onQuickAddTransaction={(type) => {
          setTxModalType(type);
          setIsTxModalOpen(true);
        }}
      />

      {/* =========================================================================
          SPENDING DISTRIBUTION BY CATEGORY: PIE CHART VIA RECHARTS
          ========================================================================= */}
      <CategorySpendingPieChart
        transactions={currentPeriodTransactions}
        categories={categories}
        selectedPeriodLabel={periodLabel}
        onQuickAddExpense={() => {
          setTxModalType('expense');
          setIsTxModalOpen(true);
        }}
        onSelectCategory={(_categoryName) => {
          setTxModalType('expense');
          setIsTxModalOpen(true);
        }}
      />

      {/* =========================================================================
          DETAILED PROJECT STATUS TABLE
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Danh Sách Dự Án & Tiến Độ Hiện Tại (Project Status Tracker)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lưu trữ an toàn trên Supabase và đồng bộ hóa đa thiết bị theo thời gian thực
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Dự Án Mới
          </button>
        </div>

        <div className="overflow-x-auto pt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Tên Dự Án</th>
                <th className="py-2.5 px-3">Khách Hàng</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
                <th className="py-2.5 px-3">Tiến Độ</th>
                <th className="py-2.5 px-3">Ngân Sách / Chi Phí</th>
                <th className="py-2.5 px-3">Hạn Chót</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có dự án nào được tạo.
                  </td>
                </tr>
              ) : (
                projects.map((proj) => {
                  const badge = getStatusBadge(proj.status);
                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{proj.name}</p>
                        {proj.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{proj.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {proj.client || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={proj.status}
                          onChange={(e) => handleQuickStatusChange(proj, e.target.value as ProjectStatus)}
                          className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${badge.bg}`}
                        >
                          <option value="in_progress">Đang triển khai</option>
                          <option value="review">Chờ nghiệm thu</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="on_hold">Tạm hoãn</option>
                          <option value="planning">Lên kế hoạch</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{proj.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${proj.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        <p className="font-bold">{formatCurrency(proj.budget, userSettings.currency, true)}</p>
                        {proj.spent !== undefined && (
                          <p className="text-[10px] text-slate-400">Đã chi: {formatCurrency(proj.spent, userSettings.currency, true)}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {proj.deadline ? proj.deadline : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(proj);
                              setIsProjectModalOpen(true);
                            }}
                            className="px-2 py-1 text-slate-600 hover:text-purple-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Bạn có chắc muốn xóa dự án "${proj.name}"?`)) {
                                await deleteProject(proj.id);
                                addToast('Đã xóa dự án thành công', 'success');
                              }
                            }}
                            className="px-2 py-1 text-rose-500 hover:text-rose-700 text-[11px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* Project Add/Edit Modal */}
      <ProjectModalForm
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={async (projectData) => {
          await saveProject(projectData);
          addToast(editingProject ? 'Đã cập nhật dự án' : 'Đã tạo dự án mới', 'success');
        }}
        initialData={editingProject}
      />

      {/* Transaction Add Modal */}
      <TransactionModalForm
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        editingTx={null}
        defaultType={txModalType}
        categories={categories}
        userSettings={userSettings}
        onSave={handleSaveTransaction}
        onAddCategory={async (catData) => {
          return null;
        }}
      />
    </div>
  );
};

export default Dashboard;
