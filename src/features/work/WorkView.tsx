import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { WorkLog, WorkStatus } from '../../types';
import { 
  formatDateVN, 
  getDayOfWeek, 
  calculateWorkHours, 
  formatMinutes,
  formatMinutesToHM,
  cn 
} from '../../lib/utils';
import { exportWorkLogsToExcel } from '../../lib/excelExport';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { 
  Clock, 
  Calendar, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Award,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const STATUS_CONFIG: Record<WorkStatus, { label: string; badgeClass: string; rowBg: string }> = {
  'Làm việc': {
    label: 'Làm việc',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    rowBg: '',
  },
  'Tăng ca': {
    label: 'Tăng ca',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    rowBg: 'bg-amber-50/20 dark:bg-amber-950/10',
  },
  'Làm nửa ngày': {
    label: 'Làm nửa ngày',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    rowBg: '',
  },
  'Nghỉ phép': {
    label: 'Nghỉ phép',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    rowBg: 'bg-purple-50/20 dark:bg-purple-950/10',
  },
  'Nghỉ lễ': {
    label: 'Nghỉ lễ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    rowBg: 'bg-rose-50/20 dark:bg-rose-950/10',
  },
  'Nghỉ không lương': {
    label: 'Nghỉ không lương',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    rowBg: 'bg-slate-100/30 dark:bg-slate-800/10',
  },
};

export const WorkView: React.FC = () => {
  const { 
    workLogs, 
    workSettings, 
    saveWorkLog, 
    deleteWorkLog, 
    addToast 
  } = useData();

  // State
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'simple' | 'table' | 'charts'>('simple');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  // Form states
  const [formDate, setFormDate] = useState<string>('2026-09-01');
  const [formCheckIn, setFormCheckIn] = useState<string>('08:00');
  const [formCheckOut, setFormCheckOut] = useState<string>('18:00');
  const [formBreakStart, setFormBreakStart] = useState<string>('12:00');
  const [formBreakEnd, setFormBreakEnd] = useState<string>('14:00');
  const [formStatus, setFormStatus] = useState<WorkStatus>('Làm việc');
  const [formNotes, setFormNotes] = useState<string>('');

  // Prefix for selected month
  const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
  const monthPrefix = `${selectedYear}-${monthStr}`;

  // Days count in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Filter logs for selected month
  const currentMonthLogs = useMemo(() => {
    return workLogs
      .filter((l) => l.work_date.startsWith(monthPrefix))
      .sort((a, b) => a.work_date.localeCompare(b.work_date));
  }, [workLogs, monthPrefix]);

  // Search and status filtered logs
  const displayLogs = useMemo(() => {
    return currentMonthLogs.filter((l) => {
      const matchSearch =
        searchTerm === '' ||
        l.work_date.includes(searchTerm) ||
        (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        l.work_status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || l.work_status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [currentMonthLogs, searchTerm, statusFilter]);

  // Statistics for this month
  const summary = useMemo(() => {
    let totalHours = 0;
    let totalMinutes = 0;
    let totalOvertime = 0;
    let totalOvertimeMinutes = 0;
    let totalMissing = 0;
    let totalMissingMinutes = 0;
    let totalBreakMinutes = 0;
    let workDaysCount = 0;
    let leaveDaysCount = 0;

    currentMonthLogs.forEach((l) => {
      totalHours += l.total_hours;
      totalMinutes += l.total_minutes ?? Math.round((l.total_hours || 0) * 60);
      totalOvertime += l.overtime_hours;
      totalOvertimeMinutes += l.overtime_minutes ?? Math.round((l.overtime_hours || 0) * 60);
      totalMissing += l.missing_hours;
      totalMissingMinutes += l.missing_minutes ?? Math.round((l.missing_hours || 0) * 60);
      totalBreakMinutes += l.break_duration_minutes ?? Math.round((l.break_duration_hours || 0) * 60);

      if (['Làm việc', 'Tăng ca', 'Làm nửa ngày'].includes(l.work_status)) {
        workDaysCount += 1;
      } else {
        leaveDaysCount += 1;
      }
    });

    const standardDaysInMonth = workSettings.standard_days_per_month || 26; // Standard 26 working days (26 x 8h = 208h)
    const totalStandard = standardDaysInMonth * workSettings.standard_hours_per_day;
    const totalStandardMinutes = Math.round(totalStandard * 60);
    const completionRate = totalStandard > 0 ? (totalHours / totalStandard) * 100 : 0;

    return {
      totalHours,
      totalMinutes,
      totalStandard,
      totalStandardMinutes,
      standardDaysInMonth,
      totalOvertime,
      totalOvertimeMinutes,
      totalMissing,
      totalMissingMinutes,
      totalBreakMinutes,
      workDaysCount,
      leaveDaysCount,
      completionRate,
    };
  }, [currentMonthLogs, workSettings]);

  // Full Month Days for Simplified Template Table
  const simpleSheetData = useMemo(() => {
    const logsMap = new Map<number, WorkLog>();
    currentMonthLogs.forEach((l) => {
      const parts = l.work_date.split('-');
      if (parts.length === 3) {
        logsMap.set(parseInt(parts[2], 10), l);
      }
    });

    let totalExcess = 0;
    let totalOff = 0;
    const rows = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const log = logsMap.get(day);
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const fullDate = `${selectedYear}-${monthStr}-${dayStr}`;

      if (log) {
        const status = log.work_status;
        const isOff = status === 'Nghỉ phép' || status === 'Nghỉ không lương' || (log.notes && /\b(off|nghỉ không|nghỉ phép)\b/i.test(log.notes));
        const isHoliday = status === 'Nghỉ lễ' || (log.notes && /\b(lễ|nghỉ lễ)\b/i.test(log.notes));

        if (isOff) {
          totalOff += 1;
          rows.push({
            day,
            fullDate,
            log,
            vaoCaSang: 'N',
            nghiTrua: '',
            vaoCaChieu: 'N',
            hetCa: '',
            tongGioLam: '',
            phutDuThieu: '',
            ngayNghi: 1,
            lyDo: log.notes || 'Off',
            isOff: true,
            isHoliday: false,
          });
        } else if (isHoliday) {
          rows.push({
            day,
            fullDate,
            log,
            vaoCaSang: 'Nghỉ Lễ',
            nghiTrua: '',
            vaoCaChieu: 'Nghỉ Lễ',
            hetCa: '',
            tongGioLam: '',
            phutDuThieu: '',
            ngayNghi: 0,
            lyDo: log.notes || 'Nghỉ Lễ',
            isOff: false,
            isHoliday: true,
          });
        } else {
          const totalMins = log.total_minutes ?? Math.round((log.total_hours || 0) * 60);
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;
          const tongGioLam = `${h}:${m < 10 ? '0' : ''}${m}`;
          const excess = totalMins > 0 ? (totalMins - 480) : 0;
          if (excess > 0) totalExcess += excess;

          rows.push({
            day,
            fullDate,
            log,
            vaoCaSang: log.check_in || '08:00',
            nghiTrua: (log.break_duration_hours && log.break_duration_hours > 0 && log.break_start) ? log.break_start : '',
            vaoCaChieu: (log.break_duration_hours && log.break_duration_hours > 0 && log.break_end) ? log.break_end : '',
            hetCa: log.check_out || '18:00',
            tongGioLam,
            phutDuThieu: excess,
            ngayNghi: 0,
            lyDo: log.notes || (excess > 0 ? 'Tăng ca' : ''),
            isOff: false,
            isHoliday: false,
          });
        }
      } else {
        rows.push({
          day,
          fullDate,
          log: null,
          vaoCaSang: '',
          nghiTrua: '',
          vaoCaChieu: '',
          hetCa: '',
          tongGioLam: '',
          phutDuThieu: '',
          ngayNghi: 0,
          lyDo: '',
          isOff: false,
          isHoliday: false,
        });
      }
    }

    return {
      rows,
      totalExcess,
      totalOff,
    };
  }, [currentMonthLogs, daysInMonth, selectedYear, monthStr]);

  // Chart data for daily hours
  const dailyChartData = useMemo(() => {
    return currentMonthLogs.map((l) => ({
      day: l.work_date.substring(8), // 'DD'
      fullDate: formatDateVN(l.work_date),
      totalHours: l.total_hours,
      totalMinutes: l.total_minutes ?? Math.round((l.total_hours || 0) * 60),
      overtime: l.overtime_hours,
      overtimeMinutes: l.overtime_minutes ?? Math.round((l.overtime_hours || 0) * 60),
      standard: workSettings.standard_hours_per_day,
      status: l.work_status,
    }));
  }, [currentMonthLogs, workSettings]);

  // Open Create Modal with default times
  const handleOpenAddModal = (dateStr?: string) => {
    const defaultDate = dateStr || `${selectedYear}-${monthStr}-01`;
    setEditingLog(null);
    setFormDate(defaultDate);
    setFormCheckIn(workSettings.default_check_in);
    setFormCheckOut(workSettings.default_check_out);
    setFormBreakStart(workSettings.default_break_start);
    setFormBreakEnd(workSettings.default_break_end);
    setFormStatus('Làm việc');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (log: WorkLog) => {
    setEditingLog(log);
    setFormDate(log.work_date);
    setFormCheckIn(log.check_in);
    setFormCheckOut(log.check_out);
    setFormBreakStart(log.break_start || workSettings.default_break_start);
    setFormBreakEnd(log.break_end || workSettings.default_break_end);
    setFormStatus(log.work_status);
    setFormNotes(log.notes || '');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveWorkLog({
      id: editingLog ? editingLog.id : undefined,
      work_date: formDate,
      check_in: formCheckIn,
      check_out: formCheckOut,
      break_start: formBreakStart,
      break_end: formBreakEnd,
      work_status: formStatus,
      notes: formNotes,
      break_duration_hours: 2,
      total_hours: 0,
      overtime_hours: 0,
      missing_hours: 0,
    });
    setIsModalOpen(false);
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    exportWorkLogsToExcel(currentMonthLogs, selectedMonth, selectedYear, summary, {
      name: 'Nguyễn Lê Đạt Minh',
      id: '42157',
      username: 'Minhnd2',
      standardTargetText: 'Phút chuẩn làm/ngày: 208'
    });
    addToast(`Đã xuất file Excel mẫu chuẩn: Bang_Ghi_Gio_Lam_Thang_${monthStr}_${selectedYear}.xlsx`, 'success');
  };

  // Live preview calculation inside modal
  const modalCalculated = calculateWorkHours(
    formCheckIn,
    formCheckOut,
    formBreakStart,
    formBreakEnd,
    workSettings.standard_hours_per_day,
    formStatus
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Month Selector, Mode Switcher, and Excel Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} className="dark:bg-slate-900">
                    Tháng {m < 10 ? `0${m}` : m}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y} className="dark:bg-slate-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" /> Chuẩn: {workSettings.standard_hours_per_day}h/ngày (208h/tháng)
          </div>
        </div>

        {/* Actions: View Mode Switch & Export Excel & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('simple')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'simple'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Bảng Ghi Giờ Làm (Mẫu Excel)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Bảng Chi Tiết
            </button>
            <button
              type="button"
              onClick={() => setViewMode('charts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'charts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Biểu Đồ
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-all shadow-xs cursor-pointer"
            title="Xuất file Excel theo đúng mẫu Bảng Ghi Giờ Làm đơn giản dễ nhìn"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Xuất Excel Đơn Giản</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chấm Công</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Tổng Thời Gian Làm</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
            {summary.totalHours.toFixed(1)}h
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {summary.totalMinutes.toLocaleString('vi-VN')} phút ({summary.workDaysCount} ngày làm)
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Phút Dư / Tăng Ca (OT)</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-display">
            +{simpleSheetData.totalExcess.toLocaleString('vi-VN')}p
          </p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            ≈ {(simpleSheetData.totalExcess / 60).toFixed(1)} giờ làm thêm
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Ngày Nghỉ (Off)</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-display">
            {simpleSheetData.totalOff} ngày
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Nghỉ phép / việc riêng</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Định Mức Chuẩn</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 font-display">
            208h
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{summary.standardDaysInMonth} ngày x {workSettings.standard_hours_per_day}h</p>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'simple' ? (
        /* ========================================================================= */
        /* BẢNG GHI GIỜ LÀM (CHUẨN FORM EXCEL ĐƠN GIẢN DỄ NHÌN NHƯ ẢNH MẪU) */
        /* ========================================================================= */
        <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Top Header Row of the Table */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-400 font-display tracking-tight text-center sm:text-left">
              Nguyễn Lê Đạt Minh - 42157 - Minhnd2
            </h2>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Phút chuẩn làm/ngày: <span className="text-amber-600 dark:text-amber-400">208</span>
            </div>
          </div>

          {/* Table Banner Title */}
          <div className="bg-amber-100/90 dark:bg-amber-950/70 py-2.5 px-4 text-center border-b border-amber-300 dark:border-amber-800">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-amber-200 uppercase tracking-wide">
              Bảng Ghi Giờ Làm
            </h3>
          </div>

          {/* Simple Sheet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold divide-x divide-slate-300 dark:divide-slate-700 border-b border-slate-300 dark:border-slate-700">
                  <th className="py-2.5 px-2 text-center w-12">Ngày</th>
                  <th className="py-2.5 px-3 text-center min-w-[90px] bg-sky-50/70 dark:bg-sky-950/30">Vào ca sáng</th>
                  <th className="py-2.5 px-2 text-center min-w-[75px] bg-cyan-50/70 dark:bg-cyan-950/30">Nghỉ trưa</th>
                  <th className="py-2.5 px-3 text-center min-w-[90px] bg-amber-50/70 dark:bg-amber-950/30">Vào ca chiều</th>
                  <th className="py-2.5 px-3 text-center min-w-[85px] bg-sky-50/70 dark:bg-sky-950/30">Hết ca</th>
                  <th className="py-2.5 px-3 text-center min-w-[110px] bg-cyan-50/70 dark:bg-cyan-950/30">Tổng số giờ làm</th>
                  <th className="py-2.5 px-3 text-center min-w-[100px] bg-amber-50/70 dark:bg-amber-950/30">Phút dư/thiếu</th>
                  <th className="py-2.5 px-2 text-center w-20 bg-amber-50/70 dark:bg-amber-950/30">Ngày nghỉ</th>
                  <th className="py-2.5 px-4 text-left min-w-[200px]">Lý do tăng ca/ nghỉ</th>
                  <th className="py-2.5 px-2 text-center w-16 bg-slate-100/60 dark:bg-slate-800">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {simpleSheetData.rows.map((row) => {
                  const hasLog = Boolean(row.log);
                  const isOffOrHoliday = row.isOff || row.isHoliday;

                  return (
                    <tr
                      key={row.day}
                      className={cn(
                        'divide-x divide-slate-200 dark:divide-slate-700 transition-colors',
                        row.isOff ? 'bg-rose-50/30 dark:bg-rose-950/10' : '',
                        row.isHoliday ? 'bg-amber-50/30 dark:bg-amber-950/10' : '',
                        !hasLog ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                      )}
                    >
                      {/* Ngày */}
                      <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200">
                        {row.day}
                      </td>

                      {/* Vào ca sáng */}
                      <td className={cn(
                        'py-2 px-3 text-center font-mono font-medium',
                        isOffOrHoliday ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                      )}>
                        {row.vaoCaSang || '--'}
                      </td>

                      {/* Nghỉ trưa */}
                      <td className="py-2 px-2 text-center font-mono text-slate-500 dark:text-slate-400">
                        {row.nghiTrua || ''}
                      </td>

                      {/* Vào ca chiều */}
                      <td className={cn(
                        'py-2 px-3 text-center font-mono font-medium',
                        isOffOrHoliday ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                      )}>
                        {row.vaoCaChieu || ''}
                      </td>

                      {/* Hết ca */}
                      <td className="py-2 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {row.hetCa || ''}
                      </td>

                      {/* Tổng số giờ làm */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {row.tongGioLam || ''}
                      </td>

                      {/* Phút dư/thiếu */}
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        {row.phutDuThieu !== '' ? (
                          <span className={cn(
                            typeof row.phutDuThieu === 'number' && row.phutDuThieu > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          )}>
                            {row.phutDuThieu}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>

                      {/* Ngày nghỉ */}
                      <td className="py-2 px-2 text-center font-bold">
                        <span className={row.ngayNghi > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-rose-600/80 dark:text-rose-400/80'}>
                          {row.ngayNghi}
                        </span>
                      </td>

                      {/* Lý do tăng ca/ nghỉ */}
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">
                        {row.lyDo ? (
                          <span className={cn(
                            row.isOff ? 'font-semibold text-rose-600 dark:text-rose-400' : '',
                            row.isHoliday ? 'font-semibold text-amber-600 dark:text-amber-400' : '',
                            !isOffOrHoliday ? 'text-slate-700 dark:text-slate-300' : ''
                          )}>
                            {row.lyDo}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">--</span>
                        )}
                      </td>

                      {/* Action edit/add */}
                      <td className="py-1 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.log) {
                              handleOpenEditModal(row.log);
                            } else {
                              handleOpenAddModal(row.fullDate);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={row.log ? 'Chỉnh sửa ngày này' : 'Nhập giờ chấm công ngày này'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* BOTTOM SUMMARY ROW */}
                <tr className="bg-amber-200/90 dark:bg-amber-900/60 font-bold border-t-2 border-slate-400 dark:border-slate-600 divide-x divide-slate-300 dark:divide-slate-700">
                  <td colSpan={6} className="py-3 px-4 text-center text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    TỔNG CỘNG
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-50/50 dark:bg-rose-950/30">
                    {simpleSheetData.totalExcess}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-50/50 dark:bg-rose-950/30">
                    {simpleSheetData.totalOff}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-slate-600 dark:text-slate-400"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed Table View */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {/* Table Header Filter & Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo ngày, trạng thái, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">Lọc:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Làm việc">Làm việc</option>
                <option value="Tăng ca">Tăng ca</option>
                <option value="Làm nửa ngày">Làm nửa ngày</option>
                <option value="Nghỉ phép">Nghỉ phép</option>
                <option value="Nghỉ lễ">Nghỉ lễ</option>
                <option value="Nghỉ không lương">Nghỉ không lương</option>
              </select>
            </div>
          </div>

          {/* Table container */}
          <div className="overflow-x-auto">
            {displayLogs.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Chưa có dữ liệu chấm công"
                description={`Không tìm thấy bản ghi chấm công nào trong tháng ${monthStr}/${selectedYear}.`}
                action={
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-xs"
                  >
                    + Thêm Chấm Công
                  </button>
                }
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Ngày</th>
                    <th className="py-3 px-3">Thứ</th>
                    <th className="py-3 px-3">Giờ vào</th>
                    <th className="py-3 px-3">Giờ ra</th>
                    <th className="py-3 px-3">Nghỉ trưa</th>
                    <th className="py-3 px-3">Tổng làm</th>
                    <th className="py-3 px-3 text-amber-600 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/30">Tăng ca OT (Phút)</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4">Ghi chú</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayLogs.map((log) => {
                    const statusCfg = STATUS_CONFIG[log.work_status] || STATUS_CONFIG['Làm việc'];
                    const dayName = getDayOfWeek(log.work_date);
                    const isWeekend = dayName === 'Thứ 7' || dayName === 'Chủ Nhật';
                    const otMins = log.overtime_minutes ?? Math.round((log.overtime_hours || 0) * 60);
                    const totalMins = log.total_minutes ?? Math.round((log.total_hours || 0) * 60);
                    const breakMins = log.break_duration_minutes ?? Math.round((log.break_duration_hours || 0) * 60);

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${statusCfg.rowBg}`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatDateVN(log.work_date)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              isWeekend ? 'text-amber-500 font-semibold' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {dayName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {log.check_in || '--:--'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {log.check_out || '--:--'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {breakMins > 0 ? `${breakMins}p (${(breakMins / 60).toFixed(1)}h)` : '--'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white font-display">
                          {log.total_hours > 0 ? (
                            <span>
                              {log.total_hours.toFixed(1)}h{' '}
                              <span className="text-[10px] font-normal text-slate-400">({totalMins}p)</span>
                            </span>
                          ) : (
                            '0h'
                          )}
                        </td>
                        <td className="py-3 px-3 bg-amber-50/30 dark:bg-amber-950/20">
                          {otMins > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/50 px-2 py-0.5 rounded-md text-xs">
                              +{otMins} phút <span className="text-[10px] font-normal">({formatMinutesToHM(otMins)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0 phút</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {log.notes || '--'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(log)}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteWorkLog(log.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Work Charts View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Daily Working Hours */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Giờ Làm Theo Ngày Trong Tháng
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Đường mức chuẩn 8 tiếng/ngày so với thời gian làm việc thực tế
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 14]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900/95 text-white p-3 shadow-xl border border-slate-800 text-xs space-y-1">
                            <p className="font-semibold text-slate-300">Ngày: {data.fullDate}</p>
                            <p className="text-emerald-400 font-bold">Tổng giờ: {data.totalHours} giờ</p>
                            {data.overtime > 0 && <p className="text-amber-400">Tăng ca: +{data.overtime}h</p>}
                            <p className="text-slate-400">Trạng thái: {data.status}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalHours" fill="#10B981" radius={[4, 4, 0, 0]} name="Tổng giờ làm" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Overtime vs Missing Breakdown */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Phân Bổ Tăng Ca & Giờ Làm
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Theo dõi giờ OT tăng ca để tính thưởng phụ cấp
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData.filter(d => d.overtime > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="overtime" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Số giờ tăng ca" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Work Log */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLog ? 'Chỉnh Sửa Ca Làm Việc' : 'Thêm Bản Ghi Chấm Công'}
        subtitle={`Ngày làm việc: ${formatDateVN(formDate)} (${getDayOfWeek(formDate)})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày làm việc
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái ngày
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as WorkStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Làm việc">Làm việc</option>
                <option value="Tăng ca">Tăng ca</option>
                <option value="Làm nửa ngày">Làm nửa ngày</option>
                <option value="Nghỉ phép">Nghỉ phép (Off)</option>
                <option value="Nghỉ lễ">Nghỉ lễ</option>
                <option value="Nghỉ không lương">Nghỉ không lương (Off)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giờ vào ca sáng
              </label>
              <input
                type="time"
                value={formCheckIn}
                onChange={(e) => setFormCheckIn(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giờ hết ca
              </label>
              <input
                type="time"
                value={formCheckOut}
                onChange={(e) => setFormCheckOut(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bắt đầu nghỉ trưa
              </label>
              <input
                type="time"
                value={formBreakStart}
                onChange={(e) => setFormBreakStart(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kết thúc nghỉ trưa (Vào ca chiều)
              </label>
              <input
                type="time"
                value={formBreakEnd}
                onChange={(e) => setFormBreakEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Live Calculation Preview Box */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Tính toán tự động theo phút:</span>
              </span>
              <span className="text-amber-800 dark:text-amber-300 font-display">
                {modalCalculated.totalMinutes} phút ({modalCalculated.totalHours} giờ)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-100 dark:border-amber-950">
                <span className="text-slate-400 block text-[10px]">Nghỉ trưa:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {modalCalculated.breakDurationMinutes}p ({modalCalculated.breakDurationHours}h)
                </span>
              </div>
              <div className="bg-amber-100/70 dark:bg-amber-900/40 p-2 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                <span className="text-amber-600 dark:text-amber-400 block text-[10px] font-semibold">Tăng ca (OT):</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  +{modalCalculated.overtimeMinutes}p (+{modalCalculated.overtimeHours}h)
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-amber-100 dark:border-amber-950">
                <span className="text-slate-400 block text-[10px]">Thiếu hụt:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {modalCalculated.missingMinutes > 0 ? `-${modalCalculated.missingMinutes}p` : '0p'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do tăng ca / ghi chú công việc / nghỉ
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="VD: HT Lagi, DC DLK, DLK, KT ĐăkMil, GPP EaKar, Off, Nghỉ Lễ..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Lưu Chấm Công
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
