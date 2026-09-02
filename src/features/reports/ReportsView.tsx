import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { exportWorkLogsToExcel } from '../../lib/excelExport';
import { 
  BarChart3, 
  Clock, 
  Wallet, 
  TrendingUp, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Sparkles,
  PieChart as PieIcon
} from 'lucide-react';
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
  Area,
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { 
    workLogs, 
    workSettings, 
    transactions, 
    calculatedHoldings, 
    portfolioSnapshots,
    userSettings, 
    addToast 
  } = useData();

  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Work calculation
  const workSummary = useMemo(() => {
    let totalHours = 0;
    let totalMinutes = 0;
    let totalOvertime = 0;
    let totalOvertimeMinutes = 0;
    let workDays = 0;
    let leaveDays = 0;

    workLogs.forEach((l) => {
      totalHours += l.total_hours;
      totalMinutes += l.total_minutes ?? Math.round((l.total_hours || 0) * 60);
      totalOvertime += l.overtime_hours;
      totalOvertimeMinutes += l.overtime_minutes ?? Math.round((l.overtime_hours || 0) * 60);
      if (['Làm việc', 'Tăng ca', 'Làm nửa ngày'].includes(l.work_status)) {
        workDays += 1;
      } else {
        leaveDays += 1;
      }
    });

    const standardDaysInMonth = workSettings.standard_days_per_month || 26;
    const targetHours = standardDaysInMonth * workSettings.standard_hours_per_day;
    const efficiency = targetHours > 0 ? (totalHours / targetHours) * 100 : 100;

    return { totalHours, totalMinutes, totalOvertime, totalOvertimeMinutes, standardDaysInMonth, targetHours, workDays, leaveDays, efficiency };
  }, [workLogs, workSettings]);

  // Cashflow calculation
  const cashflowSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      if (t.transaction_type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return { totalIncome, totalExpense, netSavings, savingsRatio };
  }, [transactions]);

  // Investment calculation
  const investSummary = useMemo(() => {
    let totalInvested = 0;
    let totalValue = 0;
    let totalProfit = 0;

    calculatedHoldings.forEach((h) => {
      totalInvested += h.totalInvested;
      totalValue += h.currentValue;
      totalProfit += h.totalProfit;
    });

    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return { totalInvested, totalValue, totalProfit, roi };
  }, [calculatedHoldings]);

  // Financial Health Score (out of 100)
  const healthScore = useMemo(() => {
    let score = 50; // base
    if (cashflowSummary.savingsRatio >= 30) score += 20;
    else if (cashflowSummary.savingsRatio >= 15) score += 10;

    if (investSummary.roi > 10) score += 15;
    else if (investSummary.roi > 0) score += 10;

    if (workSummary.efficiency >= 95) score += 15;
    else if (workSummary.efficiency >= 80) score += 10;

    return Math.min(100, Math.max(0, score));
  }, [cashflowSummary, investSummary, workSummary]);

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  const handleExportFullExcel = () => {
    exportWorkLogsToExcel(workLogs, 9, 2026, {
      totalHours: workSummary.totalHours,
      totalStandard: workSummary.targetHours,
      totalOvertime: workSummary.totalOvertime,
      totalMissing: 0,
      workDaysCount: workSummary.workDays,
      leaveDaysCount: workSummary.leaveDays,
      completionRate: workSummary.efficiency,
      standardDaysInMonth: workSummary.standardDaysInMonth,
    });
    addToast('Đã xuất toàn bộ bảng chấm công & tăng ca OT chuyên nghiệp ra file Excel', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Báo Cáo Toàn Diện: Giờ Công – Dòng Tiền – Danh Mục Đầu Tư
          </h3>
          <p className="text-xs text-slate-400">
            Tổng hợp dữ liệu đa chiều hỗ trợ ra quyết định tài chính và cân bằng công việc
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> In Báo Cáo
          </button>
          <button
            type="button"
            onClick={handleExportFullExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Financial Health Score Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg border border-emerald-700/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" /> Chỉ Số Sức Khỏe Tài Chính & Kỷ Luật
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            Điểm Đánh Giá: <span className="text-emerald-400">{healthScore}/100</span> (Rất Tốt)
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Tỷ lệ tiết kiệm đạt <span className="font-semibold text-emerald-300">{cashflowSummary.savingsRatio.toFixed(1)}%</span>, danh mục đầu tư tăng trưởng <span className="font-semibold text-emerald-300">+{formatPercent(investSummary.roi)}</span>, tiến độ giờ làm việc hoàn thành <span className="font-semibold text-emerald-300">{workSummary.efficiency.toFixed(1)}%</span>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-[10px] text-slate-300">Tiết Kiệm</p>
            <p className="text-lg font-bold text-emerald-300 mt-0.5">{cashflowSummary.savingsRatio.toFixed(0)}%</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-[10px] text-slate-300">Lãi Đầu Tư</p>
            <p className="text-lg font-bold text-emerald-300 mt-0.5">+{formatPercent(investSummary.roi)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-[10px] text-slate-300">Chuyên Cần</p>
            <p className="text-lg font-bold text-emerald-300 mt-0.5">{workSummary.efficiency.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* 3 Module Breakdown Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Work Report */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Báo Cáo Giờ Công</h4>
              <p className="text-[11px] text-slate-400">Thời gian làm việc & chuyên cần</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Tổng giờ làm thực tế:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {workSummary.totalHours.toFixed(1)}h <span className="text-[11px] font-normal text-slate-400">({workSummary.totalMinutes.toLocaleString('vi-VN')}p)</span>
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Tăng ca (OT):</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{workSummary.totalOvertimeMinutes} phút <span className="text-[11px] font-normal text-amber-500">(+{workSummary.totalOvertime.toFixed(1)}h)</span>
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Số ngày làm việc:</span>
              <span className="font-bold text-slate-900 dark:text-white">{workSummary.workDays} ngày</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Số ngày nghỉ / phép:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{workSummary.leaveDays} ngày</span>
            </div>
          </div>
        </div>

        {/* Module 2: Cashflow Report */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Báo Cáo Thu Chi</h4>
              <p className="text-[11px] text-slate-400">Dòng tiền & tỷ lệ tích lũy</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Tổng thu nhập:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cashflowSummary.totalIncome, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Tổng chi tiêu:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(cashflowSummary.totalExpense, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Số dư tích lũy:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(cashflowSummary.netSavings, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tỷ lệ tiết kiệm:</span>
              <span className="font-bold text-emerald-600">
                {cashflowSummary.savingsRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Module 3: Investment Report */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Báo Cáo Đầu Tư</h4>
              <p className="text-[11px] text-slate-400">Hiệu suất tài sản thị trường</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Giá trị danh mục:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(investSummary.totalValue, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Tổng vốn tích lũy:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(investSummary.totalInvested, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Lợi nhuận danh mục:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(investSummary.totalProfit, userSettings.currency, true)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tỷ suất ROI:</span>
              <span className="font-bold text-emerald-600">
                +{formatPercent(investSummary.roi)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
