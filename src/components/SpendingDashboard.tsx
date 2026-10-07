import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  LineChart as LineIcon, 
  Calendar, 
  DollarSign, 
  Tag, 
  Camera, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Receipt,
  Sparkles,
  Layers,
  ChevronRight,
  ShoppingBag,
  Coins
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Transaction, ExpenseCategory } from '../types';
import { formatCurrency, isInvestmentTransaction } from '../lib/utils';
import { Modal } from './ui/Modal';
import { ExpenseCapture } from './ExpenseCapture';

export interface SpendingDashboardProps {
  className?: string;
  transactions?: Transaction[];
  categories?: ExpenseCategory[];
  showCaptureButton?: boolean;
}

const CATEGORY_COLORS = [
  '#EF4444', // Red (Ăn uống)
  '#F97316', // Orange (Mua sắm)
  '#F59E0B', // Amber (Di chuyển)
  '#10B981', // Emerald (Hóa đơn)
  '#06B6D4', // Cyan (Y tế)
  '#6366F1', // Indigo (Giải trí)
  '#8B5CF6', // Purple (Giáo dục)
  '#EC4899', // Pink (Nhà cửa)
  '#14B8A6', // Teal (Công việc)
  '#64748B', // Slate (Khác)
];

export const SpendingDashboard: React.FC<SpendingDashboardProps> = ({
  className = '',
  transactions: propTransactions,
  categories: propCategories,
  showCaptureButton = true,
}) => {
  const { transactions: ctxTransactions, categories: ctxCategories, userSettings } = useData();
  const allTransactions = propTransactions || ctxTransactions;
  const allCategories = propCategories || ctxCategories;

  // Timeframe filter state: '6months' | '12months' | '30days' | 'all'
  const [timeRange, setTimeRange] = useState<'30days' | '6months' | '12months' | 'all'>('6months');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Filter only regular living expense transactions (excluding pure investment purchases or income)
  const expenseTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const isExp = tx.transaction_type === 'expense' && !isInvestmentTransaction(tx);
      if (!isExp) return false;

      if (selectedCategory !== 'all' && tx.category_name !== selectedCategory) {
        return false;
      }

      const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
      if (!txDate) return true;

      const now = new Date();
      if (timeRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return txDate >= thirtyDaysAgo;
      } else if (timeRange === '6months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
        return txDate >= sixMonthsAgo;
      } else if (timeRange === '12months') {
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0];
        return txDate >= twelveMonthsAgo;
      }

      return true;
    });
  }, [allTransactions, selectedCategory, timeRange]);

  // 1. Monthly Spending Trend Line/Area Data (Grouped by Month)
  const monthlyTrendData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; displayMonth: string; amount: number; count: number }> = {};
    const now = new Date();

    // Generate month slots based on timeRange
    const monthsToGenerate = timeRange === '12months' ? 12 : timeRange === '6months' ? 6 : timeRange === '30days' ? 2 : 12;
    for (let i = monthsToGenerate - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const display = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
      monthlyMap[key] = {
        month: key,
        displayMonth: display,
        amount: 0,
        count: 0,
      };
    }

    // Populate data
    expenseTransactions.forEach((tx) => {
      const monthKey = tx.transaction_date ? tx.transaction_date.substring(0, 7) : '';
      if (monthKey && monthlyMap[monthKey]) {
        monthlyMap[monthKey].amount += Number(tx.amount) || 0;
        monthlyMap[monthKey].count += 1;
      } else if (monthKey && timeRange === 'all') {
        if (!monthlyMap[monthKey]) {
          const [y, m] = monthKey.split('-');
          monthlyMap[monthKey] = {
            month: monthKey,
            displayMonth: `T${Number(m)}/${y.slice(-2)}`,
            amount: 0,
            count: 0,
          };
        }
        monthlyMap[monthKey].amount += Number(tx.amount) || 0;
        monthlyMap[monthKey].count += 1;
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [expenseTransactions, timeRange]);

  // 2. Category Breakdown for Pie Chart
  const categoryPieData = useMemo(() => {
    const catMap: Record<string, { name: string; value: number; count: number; color?: string }> = {};

    expenseTransactions.forEach((tx) => {
      const catName = tx.category_name || 'Khác';
      if (!catMap[catName]) {
        const foundCat = allCategories.find((c) => c.name === catName);
        catMap[catName] = {
          name: catName,
          value: 0,
          count: 0,
          color: foundCat?.color,
        };
      }
      catMap[catName].value += Number(tx.amount) || 0;
      catMap[catName].count += 1;
    });

    const list = Object.values(catMap).sort((a, b) => b.value - a.value);
    const total = list.reduce((sum, item) => sum + item.value, 0);

    return list.map((item, idx) => ({
      ...item,
      color: item.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [expenseTransactions, allCategories]);

  // 3. Summary Statistics
  const summaryMetrics = useMemo(() => {
    const total = expenseTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const txCount = expenseTransactions.length;
    const monthsCount = Math.max(1, monthlyTrendData.filter((m) => m.amount > 0).length || (timeRange === '6months' ? 6 : 12));
    const avgMonthly = total / monthsCount;
    const topCategory = categoryPieData[0] || null;

    // Scan receipts count
    const ocrScannedCount = allTransactions.filter(
      (tx) => (tx.note && (tx.note.includes('Mặt hàng:') || tx.note.includes('Sàn/CTCK:') || tx.note.includes('HĐ:')))
    ).length;

    return {
      total,
      txCount,
      avgMonthly,
      topCategory,
      ocrScannedCount,
    };
  }, [expenseTransactions, monthlyTrendData, timeRange, categoryPieData, allTransactions]);

  // Custom Chart Tooltip for Trend Line
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-slate-900/95 text-white border border-slate-700 shadow-xl backdrop-blur-md text-xs space-y-1">
          <p className="font-bold text-slate-300">{data.displayMonth || label}</p>
          <p className="text-sm font-extrabold text-rose-400 font-display">
            {formatCurrency(data.amount, userSettings.currency || 'VND')}
          </p>
          <p className="text-[10px] text-slate-400">
            {data.count} giao dịch chi tiêu trong tháng
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Chart Tooltip for Category Pie
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-slate-900/95 text-white border border-slate-700 shadow-xl backdrop-blur-md text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <p className="text-sm font-extrabold text-white font-display">
            {formatCurrency(data.value, userSettings.currency || 'VND')}
          </p>
          <p className="text-[10px] text-slate-400">
            Chiếm {data.percent.toFixed(1)}% tổng chi tiêu ({data.count} khoản)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Action Header */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-700 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
              <LineIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">Báo Cáo & Xu Hướng Chi Tiêu</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/25 backdrop-blur-sm">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-purple-100/90 max-w-xl">
            Trực quan hóa biến động chi tiêu theo thời gian và cơ cấu tỷ trọng danh mục (tự động cập nhật từ công cụ Quét Hóa Đơn AI)
          </p>
        </div>

        {showCaptureButton && (
          <div className="relative z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer transform active:scale-95"
            >
              <Camera className="w-4 h-4 text-purple-600" />
              <span>📸 Quét Hóa Đơn AI</span>
            </button>
          </div>
        )}

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Tổng Chi Tiêu ({timeRange === '6months' ? '6 tháng' : timeRange === '12months' ? '1 năm' : timeRange === '30days' ? '30 ngày' : 'Toàn bộ'})</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-display">
            {formatCurrency(summaryMetrics.total, userSettings.currency)}
          </h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summaryMetrics.txCount} giao dịch chi tiêu
          </span>
        </div>

        {/* Average Monthly Spend */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Trung Bình Mỗi Tháng</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1 font-display">
            {formatCurrency(summaryMetrics.avgMonthly, userSettings.currency)}
          </h3>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            Mức chi tiêu tiêu chuẩn
          </span>
        </div>

        {/* Top Spending Category */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Danh Mục Chi Nhiều Nhất</p>
          <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1 truncate">
            {summaryMetrics.topCategory?.name || 'Chưa có'}
          </h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {summaryMetrics.topCategory 
              ? `${formatCurrency(summaryMetrics.topCategory.value, userSettings.currency)} (${summaryMetrics.topCategory.percent.toFixed(0)}%)` 
              : '0 đ'}
          </span>
        </div>

        {/* OCR Bill Scanned count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Hóa Đơn Quét Bằng AI</p>
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-display">
            {summaryMetrics.ocrScannedCount} <span className="text-xs font-normal text-slate-400">biên lai</span>
          </h3>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
            Tự động bóc tách 100%
          </span>
        </div>
      </div>

      {/* Control Bar: Timeframe & Category Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Time Range Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeRange === '30days'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('6months')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeRange === '6months'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            6 tháng gần nhất
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('12months')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeRange === '12months'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            1 năm
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeRange === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tất cả
          </button>
        </div>

        {/* Filter by Category & Toggle Chart Style */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả danh mục ({allCategories.length})</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Vùng Gradient
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Đường Line
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Grid: Trend Line (Left/Top) & Category Pie (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Monthly Expenses Trend Line / Area Chart (Span 2 cols on desktop) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <LineIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  Biểu Đồ Xu Hướng Chi Tiêu Hàng Tháng
                </h3>
                <p className="text-[11px] text-slate-400">
                  Đường xu hướng (Trend Line) tổng chi phí theo thời gian thực
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full">
              {monthlyTrendData.length} mốc thời gian
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {monthlyTrendData.length === 0 || monthlyTrendData.every((m) => m.amount === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="text-xs">Chưa có dữ liệu chi tiêu trong khoảng thời gian này</p>
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(true)}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold underline cursor-pointer"
                >
                  Quét hóa đơn ngay
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis
                      dataKey="displayMonth"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tickFormatter={(val) =>
                        val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : val >= 1_000 ? `${(val / 1_000).toFixed(0)}k` : val
                      }
                    />
                    <Tooltip content={<CustomTrendTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Chi Tiêu"
                      stroke="#EF4444"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#expenseGradient)"
                      dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#DC2626', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis
                      dataKey="displayMonth"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tickFormatter={(val) =>
                        val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : val >= 1_000 ? `${(val / 1_000).toFixed(0)}k` : val
                      }
                    />
                    <Tooltip content={<CustomTrendTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Chi Tiêu"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#DC2626', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Category-Based Pie Chart */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  Cơ Cấu Danh Mục
                </h3>
                <p className="text-[11px] text-slate-400">Tỷ trọng chi tiêu theo từng nhóm</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full">
              {categoryPieData.length} nhóm
            </span>
          </div>

          {/* Pie Visual Container */}
          <div className="h-56 w-full relative">
            {categoryPieData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                Chưa có dữ liệu danh mục
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Legend & List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto pr-1">
            {categoryPieData.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(cat.value, userSettings.currency, true)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold w-10 text-right">
                    {cat.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded Expense Capture Modal for OCR Integration */}
      {isScanModalOpen && (
        <Modal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          title="Quét Hóa Đơn Chi Tiêu AI"
          subtitle="Tự động bóc tách tên, số tiền, ngày và phí bằng Gemini Vision OCR"
          maxWidth="lg"
        >
          <ExpenseCapture
            onClose={() => setIsScanModalOpen(false)}
            categories={allCategories}
          />
        </Modal>
      )}
    </div>
  );
};
