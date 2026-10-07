import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Bar,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Wallet,
  Coins,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatPercent, isInvestmentTransaction } from '../lib/utils';
import { Transaction } from '../types';

export interface NetBalanceTrendChartProps {
  className?: string;
  transactions?: Transaction[];
}

export const NetBalanceTrendChart: React.FC<NetBalanceTrendChartProps> = ({
  className = '',
  transactions: propTransactions,
}) => {
  const { transactions: ctxTransactions, userSettings } = useData();
  const allTransactions = propTransactions || ctxTransactions;

  // View Controls
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'year' | 'all'>('6m');
  const [chartMode, setChartMode] = useState<'cumulative' | 'composed' | 'monthly_net'>('cumulative');

  // Compute monthly data series with cumulative carryover logic
  const chartData = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return [];

    // Extract all unique year-month strings from transactions
    const monthsSet = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.transaction_date && t.transaction_date.length >= 7) {
        monthsSet.add(t.transaction_date.substring(0, 7));
      }
    });

    // Also include current month and past months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let targetMonthsCount = 6;
    if (timeRange === '12m') targetMonthsCount = 12;
    else if (timeRange === 'year') targetMonthsCount = currentMonth;
    else if (timeRange === 'all') targetMonthsCount = Math.max(12, monthsSet.size + 2);

    const monthList: string[] = [];
    for (let i = targetMonthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthList.push(`${y}-${m}`);
    }

    // Sort chronologically ascending
    monthList.sort();

    let runningCumulativeBalance = 0;

    // Calculate baseline balance before the first displayed month if filtered
    const firstDisplayedMonth = monthList[0];
    allTransactions.forEach((t) => {
      const txDate = t.transaction_date ? t.transaction_date.substring(0, 7) : '';
      if (txDate && txDate < firstDisplayedMonth) {
        const amt = Number(t.amount) || 0;
        if (t.transaction_type === 'income') {
          runningCumulativeBalance += amt;
        } else if (isInvestmentTransaction(t) || t.transaction_type === 'expense') {
          runningCumulativeBalance -= amt;
        }
      }
    });

    const result = monthList.map((mKey) => {
      const [yearStr, monthStr] = mKey.split('-');
      const mNum = parseInt(monthStr, 10);
      const label = `T${mNum}/${yearStr.slice(2)}`;
      const fullLabel = `Tháng ${mNum}/${yearStr}`;

      const startingCarryover = runningCumulativeBalance;

      let monthlyInflow = 0;
      let monthlyLivingExpense = 0;
      let monthlyInvestment = 0;

      allTransactions.forEach((t) => {
        if (t.transaction_date && t.transaction_date.startsWith(mKey)) {
          const amt = Number(t.amount) || 0;
          if (t.transaction_type === 'income') {
            monthlyInflow += amt;
          } else if (isInvestmentTransaction(t)) {
            monthlyInvestment += amt;
          } else if (t.transaction_type === 'expense') {
            monthlyLivingExpense += amt;
          }
        }
      });

      const monthlyNetSavings = monthlyInflow - monthlyLivingExpense - monthlyInvestment;
      runningCumulativeBalance += monthlyNetSavings;

      const totalOutflow = monthlyLivingExpense + monthlyInvestment;
      const savingsRate = monthlyInflow > 0
        ? Math.max(0, Math.min(100, Math.round(((monthlyInflow - monthlyLivingExpense) / monthlyInflow) * 100)))
        : (monthlyLivingExpense === 0 && runningCumulativeBalance >= 0 ? 100 : 0);

      return {
        monthKey: mKey,
        label,
        fullLabel,
        startingCarryover,
        inflow: monthlyInflow,
        livingExpense: monthlyLivingExpense,
        investment: monthlyInvestment,
        outflow: totalOutflow,
        monthlyNet: monthlyNetSavings,
        cumulativeBalance: runningCumulativeBalance,
        savingsRate,
      };
    });

    return result;
  }, [allTransactions, timeRange]);

  // Analytics & KPIs
  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        currentBalance: 0,
        totalNetGrowth: 0,
        avgInflow: 0,
        avgExpense: 0,
        avgNet: 0,
        bestMonth: null as any,
        growthPercent: 0,
        isPositiveGrowth: true,
        healthRating: 'Chưa có dữ liệu',
      };
    }

    const currentBalance = chartData[chartData.length - 1].cumulativeBalance;
    const initialBalance = chartData[0].startingCarryover;
    const totalNetGrowth = currentBalance - initialBalance;

    const totalInflow = chartData.reduce((acc, curr) => acc + curr.inflow, 0);
    const totalExpense = chartData.reduce((acc, curr) => acc + curr.livingExpense, 0);
    const avgInflow = Math.round(totalInflow / chartData.length);
    const avgExpense = Math.round(totalExpense / chartData.length);
    const avgNet = Math.round((totalInflow - totalExpense) / chartData.length);

    let bestMonth = chartData[0];
    chartData.forEach((item) => {
      if (item.monthlyNet > bestMonth.monthlyNet) {
        bestMonth = item;
      }
    });

    const growthPercent = initialBalance !== 0
      ? ((currentBalance - initialBalance) / Math.abs(initialBalance)) * 100
      : (currentBalance > 0 ? 100 : 0);

    let healthRating = 'Vững mạnh & Ổn định';
    if (currentBalance < 0) healthRating = 'Cần bù đắp thâm hụt';
    else if (totalNetGrowth > 0 && currentBalance > avgExpense * 3) healthRating = 'Rất Tốt (Quỹ dự phòng an toàn)';
    else if (totalNetGrowth > 0) healthRating = 'Đang tăng trưởng tích cực';

    return {
      currentBalance,
      totalNetGrowth,
      avgInflow,
      avgExpense,
      avgNet,
      bestMonth,
      growthPercent,
      isPositiveGrowth: totalNetGrowth >= 0,
      healthRating,
    };
  }, [chartData]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const isPositiveEnding = data.cumulativeBalance >= 0;

    return (
      <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md min-w-[260px] text-xs space-y-2.5 z-50">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{data.fullLabel}</span>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Tiết kiệm: {data.savingsRate}%
          </span>
        </div>

        {/* Breakdown details */}
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span>Số dư đầu kỳ (chuyển sang):</span>
            <span className="text-slate-200 font-semibold">
              {formatCurrency(data.startingCarryover, userSettings.currency)}
            </span>
          </div>

          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Thu nhập trong tháng:
            </span>
            <span className="font-bold">+{formatCurrency(data.inflow, userSettings.currency)}</span>
          </div>

          <div className="flex items-center justify-between text-rose-400">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Chi tiêu sinh hoạt:
            </span>
            <span className="font-bold">-{formatCurrency(data.livingExpense, userSettings.currency)}</span>
          </div>

          {data.investment > 0 && (
            <div className="flex items-center justify-between text-blue-400">
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" /> Tích lũy & Đầu tư riêng:
              </span>
              <span className="font-bold">-{formatCurrency(data.investment, userSettings.currency)}</span>
            </div>
          )}

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Thặng dư phát sinh tháng:</span>
            <span className={`font-bold ${data.monthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.monthlyNet >= 0 ? '+' : ''}{formatCurrency(data.monthlyNet, userSettings.currency)}
            </span>
          </div>
        </div>

        {/* Ending Cumulative Balance highlight */}
        <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">Số dư tích lũy cuối kỳ:</span>
          <span className={`font-bold text-sm font-display ${isPositiveEnding ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(data.cumulativeBalance, userSettings.currency)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-xs space-y-6 ${className}`}>
      {/* Header with Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-blue-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-2">
              <span>Đường Xu Hướng Số Dư Ròng & Dòng Tiền Tích Lũy</span>
              <span className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                Cumulative Trend
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi sự gia tăng số dư khả dụng thực tế qua từng tháng, bảo lưu và kết chuyển số dư liên tục
            </p>
          </div>
        </div>

        {/* Action Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Số Dư Tích Lũy
            </button>
            <button
              type="button"
              onClick={() => setChartMode('composed')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'composed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Thu vs Chi + Dư
            </button>
            <button
              type="button"
              onClick={() => setChartMode('monthly_net')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'monthly_net'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Thặng Dư Tháng
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('6m')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === '6m'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              6 Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('12m')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === '12m'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              12 Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('year')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === 'year'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Năm Nay
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Metric 1: Current Cumulative Balance */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[11px] font-medium block">Số dư ròng tích lũy hiện tại</span>
          <p className={`text-xl sm:text-2xl font-bold font-display mt-1 ${
            metrics.currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
          }`}>
            {formatCurrency(metrics.currentBalance, userSettings.currency)}
          </p>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            {metrics.isPositiveGrowth ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{formatCurrency(metrics.totalNetGrowth, userSettings.currency, true)}
              </span>
            ) : (
              <span className="text-rose-500 font-semibold flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {formatCurrency(metrics.totalNetGrowth, userSettings.currency, true)}
              </span>
            )}
            <span>trong kỳ</span>
          </span>
        </div>

        {/* Metric 2: Avg Monthly Income */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[11px] font-medium block">Thu nhập bình quân / tháng</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1 text-slate-900 dark:text-white">
            {formatCurrency(metrics.avgInflow, userSettings.currency, true)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            Dòng tiền vào định kỳ
          </span>
        </div>

        {/* Metric 3: Avg Monthly Living Expense */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[11px] font-medium block">Chi tiêu TB / tháng</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1 text-slate-900 dark:text-white">
            {formatCurrency(metrics.avgExpense, userSettings.currency, true)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Thặng dư TB: <strong className="text-emerald-600 font-mono">+{formatCurrency(metrics.avgNet, userSettings.currency, true)}</strong>
          </span>
        </div>

        {/* Metric 4: Health Rating */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[11px] font-medium block">Sức khỏe tài chính</span>
          <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="truncate">{metrics.healthRating}</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
            {metrics.bestMonth ? `Đỉnh cao: ${metrics.bestMonth.label} (+${formatCurrency(metrics.bestMonth.monthlyNet, userSettings.currency, true)})` : '---'}
          </span>
        </div>
      </div>

      {/* Main Recharts Visualizer Area */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'composed' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cumBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000000)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                iconType="circle"
              />
              <Bar dataKey="inflow" name="Thu nhập tháng" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="outflow" name="Chi tiêu & Tích lũy" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Line
                type="monotone"
                dataKey="cumulativeBalance"
                name="Số dư tích lũy luân chuyển"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
            </ComposedChart>
          ) : chartMode === 'monthly_net' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000000)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                iconType="circle"
              />
              <Bar
                dataKey="monthlyNet"
                name="Thặng dư phát sinh trong tháng (Net Flow)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="cumulativeBalance"
                name="Số dư tích lũy cuối kỳ"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#6366F1' }}
              />
            </ComposedChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#06B6D4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netSavingsLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000000)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="cumulativeBalance"
                name="Dòng tiền số dư ròng tích lũy (Cumulative Net Balance)"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#balanceAreaGradient)"
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 7, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="monthlyNet"
                name="Thặng dư tháng"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Smart Analysis Callout Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 text-xs flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-bold text-slate-100 flex items-center gap-1.5">
            <span>Đánh Giá Sức Khỏe Tài Chính Lũy Kế:</span>
            <span className="text-emerald-400">{metrics.healthRating}</span>
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {metrics.totalNetGrowth >= 0 ? (
              <>
                Dòng tiền tích lũy tăng trưởng <strong className="text-emerald-400 font-mono font-bold">+{formatCurrency(metrics.totalNetGrowth, userSettings.currency)}</strong> trong {chartData.length} tháng qua. Số dư từ tháng trước được bảo lưu nguyên vẹn và kết chuyển để dự phòng chi tiêu và đầu tư tài sản dài hạn.
              </>
            ) : (
              <>
                Dòng tiền có mức thâm hụt nhẹ trong kỳ. Khuyến nghị duy trì tỷ lệ tiết kiệm tối thiểu 20% thu nhập hàng tháng và rà soát các khoản chi tiêu không bắt buộc.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
