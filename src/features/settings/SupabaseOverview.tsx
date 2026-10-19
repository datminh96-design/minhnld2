import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Layers, 
  Plus, 
  ExternalLink, 
  Copy, 
  Check, 
  Activity, 
  Eye, 
  EyeOff, 
  Trash2, 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Zap,
  Tag,
  Radio,
  FileCode
} from 'lucide-react';
import { getSupabaseClient, getSupabaseStatus } from '../../lib/supabase';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Project, ProjectStatus, Transaction } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_USER_SETTINGS } from '../../lib/seedData';
import { ProjectModalForm } from '../dashboard/ProjectModalForm';
import { TransactionModalForm } from '../expenses/TransactionModalForm';
import { MonthlyIncomeExpenseChart } from '../../components/MonthlyIncomeExpenseChart';
import { DateRangePicker, DateFilterValue } from '../../components/DateRangePicker';
import { CategorySpendingPieChart } from '../../components/CategorySpendingPieChart';
import { receiptDiagnosticLogger } from '../../utils/receiptDiagnosticLogger';

export interface SupabaseOverviewProps {
  onNavigateTab?: (tab: 'work' | 'expenses' | 'investments' | 'storage' | 'reports' | 'settings') => void;
  onQuickAction?: (action: 'add-work' | 'add-transaction' | 'add-investment') => void;
}

export const SupabaseOverview: React.FC<SupabaseOverviewProps> = ({
  onNavigateTab = () => {},
  onQuickAction = () => {},
}) => {
  const { 
    transactions, 
    categories, 
    projects, 
    workLogs,
    calculatedHoldings,
    saveProject, 
    deleteProject, 
    saveTransaction, 
    userSettings = DEFAULT_USER_SETTINGS,
    syncStatus,
    lastSyncedAt,
    syncMessage,
    syncWithSupabase,
    triggerCloudBackup,
    addToast
  } = useData();

  const { isSupabaseConfigured, user, profile } = useAuth();

  // Supabase Status & Performance Metrics
  const [supabaseStatus, setSupabaseStatus] = useState(() => getSupabaseStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [supabaseLatencyMs, setSupabaseLatencyMs] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(true);

  // Time Period State via DateRangePicker
  const now = new Date();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  // Unique years in dataset
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

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('income');

  // Measure Supabase Connection Latency via direct client query
  const testSupabaseConnection = useCallback(async () => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) {
      setSupabaseLatencyMs(null);
      return;
    }

    setIsTestingLatency(true);
    try {
      const start = performance.now();
      await client.from('transactions').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      setSupabaseLatencyMs(latency);
    } catch (e) {
      setSupabaseLatencyMs(null);
    } finally {
      setIsTestingLatency(false);
    }
  }, []);

  useEffect(() => {
    setSupabaseStatus(getSupabaseStatus());
    testSupabaseConnection();
  }, [testSupabaseConnection]);

  // Realtime Supabase Subscription for instant sync & channel monitoring
  useEffect(() => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) {
      setRealtimeActive(false);
      return;
    }

    try {
      const channel = client
        .channel('supabase_overview_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            syncWithSupabase?.(false);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          () => {
            syncWithSupabase?.(false);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'work_logs' },
          () => {
            syncWithSupabase?.(false);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeActive(false);
          }
        });

      return () => {
        client.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription error in SupabaseOverview:', err);
    }
  }, [syncWithSupabase]);

  // Handle Manual Sync
  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      await syncWithSupabase(true);
      await testSupabaseConnection();
      addToast('Đã đồng bộ dữ liệu mới nhất từ Supabase Cloud thành công!', 'success');
    } catch (err: any) {
      addToast('Lỗi khi đồng bộ Supabase: ' + (err?.message || 'Không thể kết nối'), 'error');
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Filter Transactions by Selected Month or Year
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

  // 1. INCOME SUMMARY
  const incomeStats = useMemo(() => {
    const currentIncome = currentPeriodTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const prevIncome = prevPeriodTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const diff = currentIncome - prevIncome;
    const percentChange = prevIncome > 0 ? (diff / prevIncome) * 100 : 0;
    const incomeCount = currentPeriodTransactions.filter(t => t.transaction_type === 'income').length;

    return {
      currentIncome,
      prevIncome,
      diff,
      percentChange,
      incomeCount,
      isPositive: diff >= 0,
    };
  }, [currentPeriodTransactions, prevPeriodTransactions]);

  // 2. EXPENSE SUMMARY
  const expenseStats = useMemo(() => {
    const currentExpense = currentPeriodTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const prevExpense = prevPeriodTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const diff = currentExpense - prevExpense;
    const percentChange = prevExpense > 0 ? (diff / prevExpense) * 100 : 0;
    const expenseCount = currentPeriodTransactions.filter(t => t.transaction_type === 'expense').length;

    const budgetLimit = userSettings.monthly_budget_limit || 15_000_000;
    const effectiveLimit = isYearMode ? budgetLimit * 12 : budgetLimit;
    const budgetUsedPercent = effectiveLimit > 0 ? (currentExpense / effectiveLimit) * 100 : 0;

    return {
      currentExpense,
      prevExpense,
      diff,
      percentChange,
      expenseCount,
      budgetLimit: effectiveLimit,
      budgetUsedPercent,
      isOverBudget: currentExpense > effectiveLimit,
    };
  }, [currentPeriodTransactions, prevPeriodTransactions, userSettings, isYearMode]);

  // 3. PROJECT STATUS SUMMARY
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

  // Quick Project Status Update
  const handleQuickStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    const updatedProgress = newStatus === 'completed' ? 100 : project.progress;
    await saveProject({
      ...project,
      status: newStatus,
      progress: updatedProgress,
    });
    addToast(`Đã chuyển trạng thái dự án "${project.name}" sang ${getStatusLabel(newStatus)}`, 'success');
  };

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
    addToast('Đã lưu giao dịch lên Supabase Cloud thành công!', 'success');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(supabaseStatus.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    addToast('Đã sao chép Supabase URL', 'success');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(supabaseStatus.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    addToast('Đã sao chép Supabase Anon Key', 'success');
  };

  const copySchemaSql = () => {
    const sqlText = `-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA MASTER - QUẢN LÝ DỰ ÁN & TÀI CHÍNH
-- ==============================================================================

-- 1. BẢNG TRANSACTIONS (THU CHI & ĐẦU TƯ)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment')),
    category_id UUID,
    category_name TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. BẢNG PROJECTS (QUẢN LÝ DỰ ÁN)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    client TEXT,
    budget NUMERIC(15,2) DEFAULT 0,
    spent NUMERIC(15,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planning',
    progress INTEGER DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- BẬT RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    addToast('Đã sao chép mã SQL schema Supabase!', 'success');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =========================================================================
          1. SUPABASE CLOUD LIVE CONNECTION & MONITORING BANNER
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 p-6 sm:p-7 text-white shadow-xl border border-slate-700/50">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Supabase PostgreSQL Live
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono">
                <Radio className="w-3 h-3 text-purple-400" />
                {realtimeActive ? 'Realtime Subscribed' : 'Realtime Idle'}
              </span>
              {supabaseLatencyMs !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-mono">
                  <Activity className="w-3 h-3 text-blue-400" />
                  {supabaseLatencyMs} ms
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display flex items-center gap-2.5">
              <Database className="w-7 h-7 text-emerald-400" />
              Tổng Quan Cơ Sở Dữ Liệu Supabase Cloud
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Theo dõi trực tiếp trạng thái kết nối đám mây, số lượng bản ghi các bảng dữ liệu, độ trễ mạng và đồng bộ hai chiều thời gian thực giữa ứng dụng và máy chủ Supabase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={testSupabaseConnection}
              disabled={isTestingLatency}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-sm border border-white/15 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 text-blue-400 ${isTestingLatency ? 'animate-spin' : ''}`} />
              <span>{isTestingLatency ? 'Đang đo...' : 'Đo Độ Trễ (Ping)'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus === 'syncing'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing || syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng Bộ Hai Chiều'}</span>
            </button>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white font-medium text-xs border border-purple-400/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Dashboard</span>
            </a>
          </div>
        </div>

        {/* Live Status Indicators Bar */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>Đám Mây: <strong className="text-white">{isSupabaseConfigured ? 'Đã kết nối' : 'Demo Local'}</strong></span>
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Lần đồng bộ gần nhất: <strong className="text-white">{lastSyncedAt ? lastSyncedAt.toLocaleTimeString('vi-VN') : 'Vừa xong'}</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Trạng thái đồng bộ:</span>
            <span className="font-semibold text-emerald-300">{syncMessage || 'Đã đồng bộ an toàn'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SUPABASE DATABASE TABLES RECORD COUNT METRICS
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">transactions</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {transactions.length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Giao dịch thu & chi</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">projects</span>
            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {projects.length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Dự án & Hợp đồng</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">work_logs</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {workLogs.length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Nhật ký chấm công</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">holdings</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {calculatedHoldings.length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Danh mục đầu tư</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">categories</span>
            <Tag className="w-3.5 h-3.5 text-pink-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {categories.length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Phân loại chi tiêu</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-mono font-medium">audit_logs</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {receiptDiagnosticLogger.getLogs().length}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-1">Nhật ký kiểm toán</p>
        </div>
      </div>

      {/* =========================================================================
          3. DATE RANGE PICKER (BY MONTH OR YEAR) & QUICK DATA ACTIONS
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
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
          4. THE THREE CORE SUMMARY CARDS (SYNCHRONIZED WITH SUPABASE)
          1. INCOME SUMMARY CARD
          2. EXPENSES SUMMARY CARD
          3. CURRENT PROJECT STATUS SUMMARY CARD
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD 1: INCOME SUMMARY */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    Tổng Thu Nhập ({periodLabel})
                  </h3>
                  <p className="text-xs text-slate-400">Dữ liệu dòng tiền thu vào Supabase</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {incomeStats.incomeCount} khoản
              </span>
            </div>

            <div className="py-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(incomeStats.currentIncome, userSettings.currency, true)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md ${
                  incomeStats.isPositive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                }`}>
                  {incomeStats.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {incomeStats.prevIncome > 0 ? `${Math.abs(incomeStats.percentChange).toFixed(1)}%` : '—'}
                </span>
                <span className="text-slate-400">so với {prevPeriodLabel}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Mức thu kỳ trước:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
              {formatCurrency(incomeStats.prevIncome, userSettings.currency, true)}
            </span>
          </div>
        </div>

        {/* CARD 2: EXPENSES SUMMARY */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    Tổng Chi Tiêu ({periodLabel})
                  </h3>
                  <p className="text-xs text-slate-400">Dữ liệu xuất chi lưu trên Supabase</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                expenseStats.isOverBudget
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {expenseStats.expenseCount} khoản
              </span>
            </div>

            <div className="py-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-rose-600 dark:text-rose-400">
                  {formatCurrency(expenseStats.currentExpense, userSettings.currency, true)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md ${
                  expenseStats.diff <= 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                }`}>
                  {expenseStats.diff <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {expenseStats.prevExpense > 0 ? `${Math.abs(expenseStats.percentChange).toFixed(1)}%` : '—'}
                </span>
                <span className="text-slate-400">so với {prevPeriodLabel}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Đã dùng ngân sách:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {expenseStats.budgetUsedPercent.toFixed(1)}% ({formatCurrency(expenseStats.budgetLimit, userSettings.currency, true)})
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  expenseStats.budgetUsedPercent > 100 
                    ? 'bg-rose-500' 
                    : expenseStats.budgetUsedPercent > 80 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, expenseStats.budgetUsedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: PROJECT STATUS SUMMARY */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    Trạng Thái Dự Án Supabase
                  </h3>
                  <p className="text-xs text-slate-400">Bảng dữ liệu projects đồng bộ thời gian thực</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {projectStats.totalProjects} dự án
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-purple-600 dark:text-purple-400">
                    {projectStats.activeProjects}
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">dự án đang thực hiện & nghiệm thu</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {projectStats.completed} hoàn tất
                </span>
              </div>

              {/* Status Chips Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                  <span className="font-bold">{projectStats.inProgress}</span> Đang làm
                </div>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                  <span className="font-bold">{projectStats.review}</span> Nghiệm thu
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                  <span className="font-bold">{projectStats.completed}</span> Đã xong
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Tiến độ trung bình:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {projectStats.avgProgress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${projectStats.avgProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. MONTHLY INCOME & EXPENSE VISUALIZATION VIA RECHARTS
          ========================================================================= */}
      <MonthlyIncomeExpenseChart
        transactions={transactions}
        selectedYear={dateFilter.year}
        selectedMonth={dateFilter.month}
        filterMode={dateFilter.mode}
        title="Biểu Đồ Dòng Tiền Thu & Chi Hàng Tháng (Supabase)"
        subtitle="Mô hình phân tích trực quan luồng tiền mặt vào và ra được đồng bộ an toàn trên Supabase"
        onQuickAddTransaction={(type) => {
          setTxModalType(type);
          setIsTxModalOpen(true);
        }}
      />

      {/* =========================================================================
          6. CATEGORY SPENDING PIE CHART VIA RECHARTS
          ========================================================================= */}
      <CategorySpendingPieChart
        transactions={currentPeriodTransactions}
        categories={categories}
        title={`Cơ Cấu Chi Tiêu Theo Danh Mục (${periodLabel})`}
        subtitle="Biểu đồ phân bổ tỷ trọng phần trăm theo từng nhóm chi tiêu trong kỳ được truy vấn từ Supabase"
        selectedPeriodLabel={periodLabel}
        onQuickAddExpense={() => {
          setTxModalType('expense');
          setIsTxModalOpen(true);
        }}
      />

      {/* =========================================================================
          7. SUPABASE PROJECTS MANAGEMENT TABLE
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Quản Lý Dự Án & Hợp Đồng Khách Hàng (Bảng projects)
              </h3>
              <p className="text-xs text-slate-400">
                Dữ liệu được cập nhật trực tiếp hai chiều với Supabase PostgreSQL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Dự Án Mới
          </button>
        </div>

        {/* Projects List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Tên Dự Án</th>
                <th className="py-2.5 px-3">Khách Hàng</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
                <th className="py-2.5 px-3">Tiến Độ</th>
                <th className="py-2.5 px-3">Ngân Sách / Chi</th>
                <th className="py-2.5 px-3">Hạn Chót</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <p className="font-medium">Chưa có dự án nào trong cơ sở dữ liệu Supabase</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProject(null);
                        setIsProjectModalOpen(true);
                      }}
                      className="mt-2 text-purple-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tạo dự án đầu tiên
                    </button>
                  </td>
                </tr>
              ) : (
                projects.map((proj) => {
                  const badge = getStatusBadge(proj.status);
                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
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
                            className="px-2 py-1 text-slate-600 hover:text-purple-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Bạn có chắc muốn xóa dự án "${proj.name}" khỏi Supabase?`)) {
                                await deleteProject(proj.id);
                                addToast('Đã xóa dự án thành công', 'success');
                              }
                            }}
                            className="px-2 py-1 text-rose-500 hover:text-rose-700 text-[11px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer"
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
          8. SUPABASE TECHNICAL CREDENTIALS & SCHEMA TOOLKIT
          ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Thông Số Kỹ Thuật Supabase & Schema DDL
              </h3>
              <p className="text-xs text-slate-400">Thông tin kết nối đám mây và cấu trúc các bảng PostgreSQL</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            {showCredentials ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showCredentials ? 'Ẩn thông số' : 'Hiện thông số'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">SUPABASE_URL</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-slate-500 hover:text-purple-600 cursor-pointer"
                title="Sao chép URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {showCredentials ? supabaseStatus.url : supabaseStatus.maskedUrl}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">SUPABASE_ANON_KEY</span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-slate-500 hover:text-purple-600 cursor-pointer"
                title="Sao chép Key"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {showCredentials ? supabaseStatus.key : supabaseStatus.maskedKey}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={copySchemaSql}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5 text-purple-500" />}
            <span>{copiedSql ? 'Đã sao chép Schema SQL' : 'Sao chép Schema SQL Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
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

      <TransactionModalForm
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        editingTx={null}
        defaultType={txModalType}
        categories={categories}
        userSettings={userSettings}
        onSave={handleSaveTransaction}
        onAddCategory={async () => null}
      />
    </div>
  );
};
