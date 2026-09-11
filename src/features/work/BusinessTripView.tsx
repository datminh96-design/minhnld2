import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BusinessTripExpense, TransportType } from '../../types';
import { formatCurrency, formatDateVN, getDayOfWeek, cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Briefcase,
  Calendar,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Car,
  Bike,
  Bus,
  Building2,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Sparkles,
  MapPin,
  ArrowRight,
  TrendingUp,
  Tag,
  Database,
  Copy,
  Check,
  Eye,
  FileText
} from 'lucide-react';

interface BusinessTripViewProps {
  month: number;
  year: number;
}

export const BusinessTripView: React.FC<BusinessTripViewProps> = ({ month, year }) => {
  const {
    businessTrips,
    saveBusinessTrip,
    deleteBusinessTrip,
    toggleBusinessTripPayment,
    addToast
  } = useData();

  // Filters & State
  const [filterMonth, setFilterMonth] = useState<number>(month);
  const [filterYear, setFilterYear] = useState<number>(year);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const copyTripSql = () => {
    const sqlText = `-- Chạy câu lệnh này trong Supabase -> SQL Editor -> Run:
CREATE TABLE IF NOT EXISTS public.business_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    end_date DATE,
    days_count NUMERIC(4,1) NOT NULL DEFAULT 1,
    daily_allowance_rate NUMERIC(18,2) NOT NULL DEFAULT 160000,
    total_daily_allowance NUMERIC(18,2) NOT NULL DEFAULT 0,
    hotel_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    outbound_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    return_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_business_trips_user_date ON public.business_trips(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_trips_user_paid ON public.business_trips(user_id, is_paid);

ALTER TABLE public.business_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_trips_all_policy" ON public.business_trips;
CREATE POLICY "business_trips_all_policy" ON public.business_trips FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    addToast('Đã sao chép câu lệnh SQL tạo bảng Supabase!', 'success');
  };
  const KM_RATE = 1500;

  // Report View & Copy Modal State
  const [viewingTripForReport, setViewingTripForReport] = useState<BusinessTripExpense | null>(null);
  const [copiedReportText, setCopiedReportText] = useState(false);
  const [customReportText, setCustomReportText] = useState<string>('');

  const getEndDateFormatted = (startDateStr: string, daysCount: number = 1, endDateStr?: string) => {
    if (endDateStr) return formatDateVN(endDateStr);
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + Math.max(0, daysCount - 1));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}/${m}/${y}`;
    }
    return formatDateVN(startDateStr);
  };

  const formatTransportDetail = (
    type?: TransportType,
    km?: number | string,
    cost: number = 0
  ) => {
    const numKm = Number(km) || 0;
    if (type === 'motorbike' || (!type && numKm > 0)) {
      return `xe máy ${numKm > 0 ? `${numKm}km ` : ''}${cost > 0 ? formatCurrency(cost) : '0 đ'}`;
    }
    if (type === 'bus') {
      return `xe khách ${cost > 0 ? formatCurrency(cost) : '0 đ'}`;
    }
    if (cost > 0) {
      return `${formatCurrency(cost)}`;
    }
    return '0 đ';
  };

  const generateTripReportText = (trip: BusinessTripExpense) => {
    const startDateVN = formatDateVN(trip.trip_date);
    const endDateVN = getEndDateFormatted(trip.trip_date, trip.days_count || 1, trip.end_date);
    const days = trip.days_count || 1;
    const hotelText = trip.hotel_cost > 0 ? formatCurrency(trip.hotel_cost) : '0 đ';

    let transportText = '';
    const hasOutbound = trip.outbound_cost > 0 || (trip.outbound_km && Number(trip.outbound_km) > 0);
    const hasReturn = trip.return_cost > 0 || (trip.return_km && Number(trip.return_km) > 0);

    if (hasOutbound || hasReturn) {
      const outDesc = formatTransportDetail(trip.outbound_type, trip.outbound_km, trip.outbound_cost);
      const retDesc = formatTransportDetail(trip.return_type, trip.return_km, trip.return_cost);
      transportText = `Đi: ${outDesc} | Về: ${retDesc}`;
    } else {
      transportText = '0 đ';
    }

    return `Shop: ${trip.location || 'Chưa nhập địa điểm'}
42157 - Nguyễn Lê Đạt Minh
Email:  minhnld2@fpt.com
CTP: từ ngày ${startDateVN} tới ngày ${endDateVN} (${days} ngày)
Tiền khách sạn: ${hotelText}
Di chuyển: ${transportText}`;
  };

  const handleOpenReportModal = (trip: BusinessTripExpense) => {
    setViewingTripForReport(trip);
    setCustomReportText(generateTripReportText(trip));
    setCopiedReportText(false);
  };

  const handleCopyReport = (textToCopy?: string) => {
    const text = textToCopy !== undefined ? textToCopy : customReportText;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedReportText(true);
    setTimeout(() => setCopiedReportText(false), 2500);
    addToast('Đã sao chép nội dung báo cáo CTP!', 'success');
  };

  const [editingTrip, setEditingTrip] = useState<BusinessTripExpense | null>(null);

  // Form Fields
  const [formTripDate, setFormTripDate] = useState<string>(
    `${year}-${String(month).padStart(2, '0')}-01`
  );
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formDaysCount, setFormDaysCount] = useState<number>(1);
  const [formDailyRate, setFormDailyRate] = useState<number>(160000); // Mặc định 160.000 hoặc 200.000
  const [formHotelCost, setFormHotelCost] = useState<number | string>('');

  // Lượt đi: Xe máy (1.500đ/km) hoặc Xe khách
  const [formOutboundType, setFormOutboundType] = useState<TransportType>('motorbike');
  const [formOutboundKm, setFormOutboundKm] = useState<number | string>('');
  const [formOutboundCost, setFormOutboundCost] = useState<number | string>('');

  // Lượt về: Xe máy (1.500đ/km) hoặc Xe khách
  const [formReturnType, setFormReturnType] = useState<TransportType>('motorbike');
  const [formReturnKm, setFormReturnKm] = useState<number | string>('');
  const [formReturnCost, setFormReturnCost] = useState<number | string>('');

  const [formLocation, setFormLocation] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Month prefix
  const monthStr = String(filterMonth).padStart(2, '0');
  const monthPrefix = `${filterYear}-${monthStr}`;

  // Filtered trips for selected month/year
  const monthTrips = useMemo(() => {
    return businessTrips.filter((t) => {
      const matchMonth = t.trip_date.startsWith(monthPrefix);
      return matchMonth;
    });
  }, [businessTrips, monthPrefix]);

  // Apply search and status filter, and SORT: PENDING ON TOP, PAID ON BOTTOM
  const sortedAndFilteredTrips = useMemo(() => {
    return monthTrips
      .filter((t) => {
        if (filterStatus === 'pending' && t.is_paid) return false;
        if (filterStatus === 'paid' && !t.is_paid) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchLoc = (t.location || '').toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchDate = t.trip_date.includes(q);
          if (!matchLoc && !matchNotes && !matchDate) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // 1. Chờ thanh toán (false) đứng trước Đã thanh toán (true)
        if (a.is_paid !== b.is_paid) {
          return a.is_paid ? 1 : -1;
        }
        // 2. Cùng trạng thái thì sắp xếp theo ngày gần nhất
        return b.trip_date.localeCompare(a.trip_date);
      });
  }, [monthTrips, filterStatus, searchTerm]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;
    let pendingCount = 0;
    let paidCount = 0;
    let totalDays = 0;
    let totalHotel = 0;
    let totalTransport = 0;

    monthTrips.forEach((t) => {
      totalDays += t.days_count || 1;
      totalHotel += t.hotel_cost || 0;
      totalTransport += (t.outbound_cost || 0) + (t.return_cost || 0);

      if (t.is_paid) {
        totalPaidAmount += t.total_amount || 0;
        paidCount += 1;
      } else {
        totalPendingAmount += t.total_amount || 0;
        pendingCount += 1;
      }
    });

    return {
      totalAll: totalPendingAmount + totalPaidAmount,
      totalPendingAmount,
      totalPaidAmount,
      pendingCount,
      paidCount,
      totalCount: monthTrips.length,
      totalDays,
      totalHotel,
      totalTransport,
    };
  }, [monthTrips]);

  // Open Modal Add
  const handleOpenAdd = () => {
    setEditingTrip(null);
    const today = new Date().toISOString().substring(0, 10);
    setFormTripDate(today.startsWith(monthPrefix) ? today : `${monthPrefix}-01`);
    setFormEndDate('');
    setFormDaysCount(1);
    setFormDailyRate(160000);
    setFormHotelCost('');
    setFormOutboundType('bus');
    setFormOutboundKm('');
    setFormOutboundCost('');
    setFormReturnType('bus');
    setFormReturnKm('');
    setFormReturnCost('');
    setFormLocation('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEdit = (trip: BusinessTripExpense) => {
    setEditingTrip(trip);
    setFormTripDate(trip.trip_date);
    setFormEndDate(trip.end_date || '');
    setFormDaysCount(trip.days_count || 1);
    setFormDailyRate(trip.daily_allowance_rate || 160000);
    setFormHotelCost(trip.hotel_cost || '');
    
    // Phương tiện lượt đi
    const outType: TransportType = trip.outbound_type || (trip.outbound_km ? 'motorbike' : 'bus');
    setFormOutboundType(outType);
    setFormOutboundKm(trip.outbound_km !== undefined && trip.outbound_km !== null ? trip.outbound_km : (outType === 'motorbike' && trip.outbound_cost ? Math.round(trip.outbound_cost / KM_RATE) : ''));
    setFormOutboundCost(outType === 'motorbike' ? '' : (trip.outbound_cost || ''));

    // Phương tiện lượt về
    const retType: TransportType = trip.return_type || (trip.return_km ? 'motorbike' : 'bus');
    setFormReturnType(retType);
    setFormReturnKm(trip.return_km !== undefined && trip.return_km !== null ? trip.return_km : (retType === 'motorbike' && trip.return_cost ? Math.round(trip.return_cost / KM_RATE) : ''));
    setFormReturnCost(retType === 'motorbike' ? '' : (trip.return_cost || ''));

    setFormLocation(trip.location || '');
    setFormNotes(trip.notes || '');
    setIsModalOpen(true);
  };

  // Live calculation for form total
  const calculatedDailyTotal = (Number(formDaysCount) || 1) * (Number(formDailyRate) || 0);
  const calculatedHotelTotal = Number(formHotelCost) || 0;
  
  // Tính tiền lượt đi: nếu xe máy thì số km * 1500đ, nếu xe khách thì lấy tiền vé
  const calculatedOutboundTotal =
    formOutboundType === 'motorbike'
      ? (Number(formOutboundKm) || 0) * KM_RATE
      : (Number(formOutboundCost) || 0);

  // Tính tiền lượt về: nếu xe máy thì số km * 1500đ, nếu xe khách thì lấy tiền vé
  const calculatedReturnTotal =
    formReturnType === 'motorbike'
      ? (Number(formReturnKm) || 0) * KM_RATE
      : (Number(formReturnCost) || 0);

  const calculatedFormGrandTotal =
    calculatedDailyTotal + calculatedHotelTotal + calculatedOutboundTotal + calculatedReturnTotal;

  // Helper tính số ngày công tác tự động giữa ngày bắt đầu và kết thúc
  const calculateDaysFromDates = (start: string, end: string): number => {
    if (!start) return 1;
    if (!end || end === start) return 1;
    try {
      const startDate = new Date(start + 'T00:00:00');
      const endDate = new Date(end + 'T00:00:00');
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1;
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays + 1 : 1;
    } catch {
      return 1;
    }
  };

  const handleTripDateChange = (newStartDate: string) => {
    setFormTripDate(newStartDate);
    if (formEndDate) {
      if (formEndDate < newStartDate) {
        setFormEndDate(newStartDate);
        setFormDaysCount(1);
      } else {
        const calculated = calculateDaysFromDates(newStartDate, formEndDate);
        setFormDaysCount(calculated);
      }
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setFormEndDate(newEndDate);
    if (newEndDate && formTripDate) {
      if (newEndDate >= formTripDate) {
        const calculated = calculateDaysFromDates(formTripDate, newEndDate);
        setFormDaysCount(calculated);
      }
    } else if (!newEndDate) {
      setFormDaysCount(1);
    }
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const days = Math.max(1, Number(formDaysCount) || 1);
    const rate = Number(formDailyRate) || 160000;
    const hotel = Number(formHotelCost) || 0;
    const outboundCost = calculatedOutboundTotal;
    const returnCost = calculatedReturnTotal;
    const totalDaily = days * rate;
    const grandTotal = totalDaily + hotel + outboundCost + returnCost;

    await saveBusinessTrip({
      id: editingTrip ? editingTrip.id : undefined,
      trip_date: formTripDate,
      end_date: formEndDate || undefined,
      days_count: days,
      daily_allowance_rate: rate,
      total_daily_allowance: totalDaily,
      hotel_cost: hotel,
      outbound_type: formOutboundType,
      outbound_km: formOutboundType === 'motorbike' ? (Number(formOutboundKm) || 0) : undefined,
      outbound_cost: outboundCost,
      return_type: formReturnType,
      return_km: formReturnType === 'motorbike' ? (Number(formReturnKm) || 0) : undefined,
      return_cost: returnCost,
      total_amount: grandTotal,
      is_paid: editingTrip ? Boolean(editingTrip.is_paid) : false,
      paid_at: editingTrip?.paid_at,
      location: formLocation.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  // Quick toggle payment with instant visual feedback
  const handleTogglePayment = async (trip: BusinessTripExpense) => {
    await toggleBusinessTripPayment(trip.id);
  };

  // Export to Excel / CSV
  const handleExport = () => {
    if (monthTrips.length === 0) {
      addToast('Không có dữ liệu công tác phí để xuất.', 'warning');
      return;
    }

    const headers = [
      'STT',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Số ngày',
      'Mức công tác phí (đ/ngày)',
      'Tổng tiền công tác phí (đ)',
      'Tiền khách sạn (đ)',
      'Tiền lượt đi (đ)',
      'Tiền lượt về (đ)',
      'Tổng tiền (đ)',
      'Trạng thái thanh toán',
      'Địa điểm / Nội dung',
      'Ghi chú',
    ];

    const rows = sortedAndFilteredTrips.map((t, idx) => [
      idx + 1,
      t.trip_date,
      t.end_date || '',
      t.days_count,
      t.daily_allowance_rate,
      t.total_daily_allowance,
      t.hotel_cost,
      t.outbound_cost,
      t.return_cost,
      t.total_amount,
      t.is_paid ? 'Đã thanh toán' : 'Chờ thanh toán',
      `"${(t.location || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Cong_Tac_Phi_Thang_${monthStr}_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Đã xuất danh sách Công Tác Phí thành công!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              Quản Lý Công Tác Phí
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Tháng {monthStr}/{filterYear}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Theo dõi chi phí đi lại, khách sạn và phụ cấp ngày (160k / 200k)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyTripSql}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800 transition-all shadow-xs cursor-pointer"
            title="Sao chép câu lệnh SQL để tạo bảng trên Supabase"
          >
            {copiedSql ? <Check className="w-4 h-4 text-emerald-500" /> : <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
            <span>{copiedSql ? 'Đã sao chép SQL' : 'SQL Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Xuất Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Công Tác Phí</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Chờ Thanh Toán (NỔI BẬT CHỮ ĐỎ THEO YÊU CẦU) */}
        <div className="p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Chờ Thanh Toán
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              {summary.pendingCount} chuyến
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {formatCurrency(summary.totalPendingAmount)}
          </div>
          <p className="text-[11px] text-rose-500/80 dark:text-rose-400/80 mt-1">
            Chi phí công tác chưa được duyệt chi
          </p>
        </div>

        {/* Card 2: Đã Thanh Toán (MÀU XANH LÁ) */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã Thanh Toán
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              {summary.paidCount} chuyến
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {formatCurrency(summary.totalPaidAmount)}
          </div>
          <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            Đã quyết toán & thanh toán xong
          </p>
        </div>

        {/* Card 3: Tổng Chi Phí Công Tác Tháng */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Tổng Toàn Bộ Công Tác Phí</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {formatCurrency(summary.totalAll)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.totalCount} chuyến ({summary.totalDays} ngày công tác)
          </p>
        </div>

        {/* Card 4: Cơ Cấu Chi Phí (Khách Sạn & Xe Cộ) */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Khách Sạn & Đi Lại</span>
            <Car className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono space-y-0.5">
            <div className="flex justify-between">
              <span className="text-xs font-normal text-slate-400">Khách sạn:</span>
              <span>{formatCurrency(summary.totalHotel)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-normal text-slate-400">Lượt đi & về:</span>
              <span>{formatCurrency(summary.totalTransport)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Tìm theo địa điểm, ngày, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tất cả ({monthTrips.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            Chờ thanh toán ({summary.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('paid')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            Đã thanh toán ({summary.paidCount})
          </button>
        </div>
      </div>

      {/* Main Table / List View */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {sortedAndFilteredTrips.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Chưa có bản ghi công tác phí"
            description={`Chưa có chuyến công tác nào trong tháng ${monthStr}/${filterYear}. Bấm nút bên dưới để thêm mới.`}
            action={
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-xs cursor-pointer"
              >
                + Thêm Công Tác Phí
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 text-center w-12">Thanh toán</th>
                  <th className="py-3 px-4 text-left min-w-[120px]">Ngày công tác</th>
                  <th className="py-3 px-3 text-center w-24">Số ngày</th>
                  <th className="py-3 px-3 text-right min-w-[110px]">Mức phụ cấp</th>
                  <th className="py-3 px-3 text-right min-w-[110px]">Tiền phụ cấp</th>
                  <th className="py-3 px-3 text-right min-w-[110px]">Tiền KS</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">Lượt đi</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">Lượt về</th>
                  <th className="py-3 px-4 text-right min-w-[130px] font-extrabold">TỔNG TIỀN</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Trạng thái</th>
                  <th className="py-3 px-4 text-left min-w-[150px]">Địa điểm / Ghi chú</th>
                  <th className="py-3 px-3 text-center w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sortedAndFilteredTrips.map((trip) => {
                  const isPaid = Boolean(trip.is_paid);

                  return (
                    <tr
                      key={trip.id}
                      className={cn(
                        'transition-all',
                        // ĐÃ THANH TOÁN: MỜ ĐI (opacity-70, bg xám nhạt) & Ở DƯỚI CÙNG
                        isPaid
                          ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-65 hover:opacity-100'
                          // CHỜ THANH TOÁN: NỔI BẬT (viền đỏ / chữ đỏ)
                          : 'bg-white dark:bg-slate-900 hover:bg-amber-50/20 dark:hover:bg-amber-950/10'
                      )}
                    >
                      {/* Checkbox Thanh Toán (1 chạm đổi trạng thái) */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(trip)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center mx-auto',
                            isPaid
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100'
                              : 'text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          )}
                          title={isPaid ? 'Bấm để chuyển lại Chờ thanh toán' : 'Bấm để đánh dấu ĐÃ THANH TOÁN'}
                        >
                          {isPaid ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                          )}
                        </button>
                      </td>

                      {/* Ngày công tác */}
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateVN(trip.trip_date)}</span>
                          {trip.end_date && trip.end_date !== trip.trip_date && (
                            <>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span>{formatDateVN(trip.end_date)}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal pl-5">
                          {getDayOfWeek(trip.trip_date)}
                        </div>
                      </td>

                      {/* Số ngày */}
                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {trip.days_count} ngày
                        </span>
                      </td>

                      {/* Mức phụ cấp (160k / 200k) */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {formatCurrency(trip.daily_allowance_rate)}
                        </span>
                      </td>

                      {/* Tiền phụ cấp */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(trip.total_daily_allowance)}
                      </td>

                      {/* Tiền khách sạn */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trip.hotel_cost > 0 ? (
                          formatCurrency(trip.hotel_cost)
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Lượt đi */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trip.outbound_cost > 0 ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(trip.outbound_cost)}
                            </div>
                            {trip.outbound_type === 'motorbike' && trip.outbound_km ? (
                              <div className="text-[10px] text-sky-600 dark:text-sky-400 flex items-center justify-end gap-0.5">
                                <Bike className="w-3 h-3 text-sky-500" />
                                <span>{trip.outbound_km}km</span>
                              </div>
                            ) : trip.outbound_type === 'bus' ? (
                              <div className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
                                <Bus className="w-3 h-3 text-slate-400" />
                                <span>Xe khách</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Lượt về */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trip.return_cost > 0 ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(trip.return_cost)}
                            </div>
                            {trip.return_type === 'motorbike' && trip.return_km ? (
                              <div className="text-[10px] text-sky-600 dark:text-sky-400 flex items-center justify-end gap-0.5">
                                <Bike className="w-3 h-3 text-sky-500" />
                                <span>{trip.return_km}km</span>
                              </div>
                            ) : trip.return_type === 'bus' ? (
                              <div className="text-[10px] text-slate-400 flex items-center justify-end gap-0.5">
                                <Bus className="w-3 h-3 text-slate-400" />
                                <span>Xe khách</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* TỔNG TIỀN (CHỜ THANH TOÁN = CHỮ ĐỎ, ĐÃ THANH TOÁN = CHỮ XANH) */}
                      <td className="py-3 px-4 text-right font-mono text-sm font-extrabold whitespace-nowrap">
                        {isPaid ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(trip.total_amount)}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 animate-pulse-slow">
                            {formatCurrency(trip.total_amount)}
                          </span>
                        )}
                      </td>

                      {/* TRẠNG THÁI: CHỜ THANH TOÁN (CHỮ ĐỎ) / ĐÃ THANH TOÁN (MÀU XANH) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Đã thanh toán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            Chờ thanh toán
                          </span>
                        )}
                      </td>

                      {/* Địa điểm & Ghi chú */}
                      <td className="py-3 px-4 text-left">
                        {trip.location && (
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(trip)}
                            className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 text-left transition-colors cursor-pointer group"
                            title="Bấm để xem và sao chép văn bản báo cáo CTP"
                          >
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[160px] underline decoration-dotted decoration-slate-300 dark:decoration-slate-700 underline-offset-2">
                              {trip.location}
                            </span>
                          </button>
                        )}
                        {trip.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {trip.notes}
                          </div>
                        )}
                        {!trip.location && !trip.notes && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(trip)}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors cursor-pointer"
                            title="Xem & Sao chép báo cáo CTP"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(trip)}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBusinessTrip(trip.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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

              {/* BẢNG TỔNG CỘNG CHÂN TRANG */}
              <tfoot>
                <tr className="bg-amber-100/80 dark:bg-amber-950/60 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td colSpan={2} className="py-3 px-4 text-center font-bold uppercase tracking-wider">
                    TỔNG CỘNG ({sortedAndFilteredTrips.length} CHUYẾN)
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {summary.totalDays} ngày
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatCurrency(
                      sortedAndFilteredTrips.reduce((acc, t) => acc + (t.total_daily_allowance || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatCurrency(
                      sortedAndFilteredTrips.reduce((acc, t) => acc + (t.hotel_cost || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatCurrency(
                      sortedAndFilteredTrips.reduce((acc, t) => acc + (t.outbound_cost || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatCurrency(
                      sortedAndFilteredTrips.reduce((acc, t) => acc + (t.return_cost || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/40">
                    {formatCurrency(
                      sortedAndFilteredTrips.reduce((acc, t) => acc + (t.total_amount || 0), 0)
                    )}
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-xs font-normal text-slate-500 dark:text-slate-400">
                    Chờ chi: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summary.totalPendingAmount)}</span> | Đã chi: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.totalPaidAmount)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA CÔNG TÁC PHÍ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrip ? 'Chỉnh Sửa Công Tác Phí' : 'Thêm Bản Ghi Công Tác Phí'}
        subtitle="Nhập thông tin ngày, phụ cấp (160k/200k), khách sạn và tiền lượt đi / về"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Hàng 1: Ngày bắt đầu & Ngày kết thúc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày công tác (Ngày bắt đầu) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formTripDate}
                onChange={(e) => handleTripDateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Ngày kết thúc (Tùy chọn)</span>
                {formEndDate && formEndDate >= formTripDate && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                    Tự động tính ngày
                  </span>
                )}
              </label>
              <input
                type="date"
                value={formEndDate}
                min={formTripDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Hàng 2: Số ngày công tác & Mức tiền công tác phí (160k hoặc 200k) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Số ngày công tác <span className="text-rose-500">*</span>
                </label>
                {formEndDate && formEndDate >= formTripDate && (
                  <span className="text-[10px] text-slate-500">
                    (Từ {formatDateVN(formTripDate)} đến {formatDateVN(formEndDate)})
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={formDaysCount}
                onChange={(e) => setFormDaysCount(Math.max(0.5, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="VD: 1 hoặc 2..."
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Tổng phụ cấp ngày: <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(calculatedDailyTotal)}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Mức tiền công tác phí / ngày <span className="text-rose-500">*</span>
              </label>
              {/* Nút chọn nhanh 2 mức 160.000 đ hoặc 200.000 đ */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setFormDailyRate(160000)}
                  className={cn(
                    'py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                    formDailyRate === 160000
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  )}
                >
                  160.000 đ/ngày
                </button>
                <button
                  type="button"
                  onClick={() => setFormDailyRate(200000)}
                  className={cn(
                    'py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                    formDailyRate === 200000
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  )}
                >
                  200.000 đ/ngày
                </button>
              </div>

              <input
                type="number"
                step="1000"
                value={formDailyRate}
                onChange={(e) => setFormDailyRate(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                placeholder="Hoặc tự nhập số tiền..."
              />
            </div>
          </div>

          {/* Hàng 3: Tiền Khách Sạn */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-500" />
                Tiền khách sạn (VNĐ)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatCurrency(calculatedHotelTotal)}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formHotelCost}
              onChange={(e) => setFormHotelCost(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="VD: 350000 (Để trống nếu không có)"
            />
          </div>

          {/* Hàng 4: Phương tiện & Tiền Lượt đi & Lượt về */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/50">
            {/* Lượt đi */}
            <div className="space-y-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  Tiền Lượt Đi
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                  {formatCurrency(calculatedOutboundTotal)}
                </span>
              </div>

              {/* Toggle Xe máy / Xe khách */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOutboundType('motorbike')}
                  className={cn(
                    'py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                    formOutboundType === 'motorbike'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Xe máy (1.500đ/km)
                </button>
                <button
                  type="button"
                  onClick={() => setFormOutboundType('bus')}
                  className={cn(
                    'py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                    formOutboundType === 'bus'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <Bus className="w-3.5 h-3.5" />
                  Xe khách (Vé xe)
                </button>
              </div>

              {/* Ô nhập tương ứng với loại xe */}
              {formOutboundType === 'motorbike' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nhập số km di chuyển (1 km = 1.500 đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formOutboundKm}
                    onChange={(e) => setFormOutboundKm(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="VD: 100 (Số km)"
                  />
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-mono">
                    {Number(formOutboundKm) > 0
                      ? `${formOutboundKm} km × 1.500 đ = ${formatCurrency(calculatedOutboundTotal)}`
                      : '1 km = 1.500 đ'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nhập số tiền vé xe khách (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formOutboundCost}
                    onChange={(e) => setFormOutboundCost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="VD: 150000 (Tiền vé)"
                  />
                </div>
              )}
            </div>

            {/* Lượt về */}
            <div className="space-y-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  Tiền Lượt Về
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                  {formatCurrency(calculatedReturnTotal)}
                </span>
              </div>

              {/* Toggle Xe máy / Xe khách */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFormReturnType('motorbike')}
                  className={cn(
                    'py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                    formReturnType === 'motorbike'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Xe máy (1.500đ/km)
                </button>
                <button
                  type="button"
                  onClick={() => setFormReturnType('bus')}
                  className={cn(
                    'py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                    formReturnType === 'bus'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <Bus className="w-3.5 h-3.5" />
                  Xe khách (Vé xe)
                </button>
              </div>

              {/* Ô nhập tương ứng với loại xe */}
              {formReturnType === 'motorbike' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nhập số km di chuyển (1 km = 1.500 đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formReturnKm}
                    onChange={(e) => setFormReturnKm(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="VD: 100 (Số km)"
                  />
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-mono">
                    {Number(formReturnKm) > 0
                      ? `${formReturnKm} km × 1.500 đ = ${formatCurrency(calculatedReturnTotal)}`
                      : '1 km = 1.500 đ'}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nhập số tiền vé xe khách (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formReturnCost}
                    onChange={(e) => setFormReturnCost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="VD: 150000 (Tiền vé)"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hàng 5: Địa điểm & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Địa điểm / Khách hàng / Mục đích
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="VD: Chi nhánh Cần Thơ, Hợp đồng..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú thêm
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Số hóa đơn, người đi cùng..."
              />
            </div>
          </div>

          {/* TỔNG TIỀN LIVE PREVIEW BÊN DƯỚI FORM */}
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                TỔNG TIỀN CÔNG TÁC PHÍ:
              </div>
              <div className="text-[11px] text-slate-500">
                ({formDaysCount} ngày × {formatCurrency(formDailyRate)}) + KS {formatCurrency(calculatedHotelTotal)} + Đi/Về {formatCurrency(calculatedOutboundTotal + calculatedReturnTotal)}
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(calculatedFormGrandTotal)}
            </div>
          </div>

          {/* Form Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-all cursor-pointer"
            >
              {editingTrip ? 'Cập Nhật' : 'Lưu Công Tác Phí'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL XEM & SAO CHÉP BÁO CÁO CÔNG TÁC PHÍ */}
      <Modal
        isOpen={Boolean(viewingTripForReport)}
        onClose={() => setViewingTripForReport(null)}
        title="Báo Cáo Công Tác Phí (CTP)"
        subtitle={
          viewingTripForReport?.location
            ? `Shop: ${viewingTripForReport.location} | ${formatDateVN(viewingTripForReport.trip_date)}`
            : 'Sao chép nhanh định dạng văn bản gửi duyệt công tác phí'
        }
        maxWidth="md"
      >
        {viewingTripForReport && (
          <div className="space-y-4 text-xs">
            {/* Tóm tắt nhanh */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{viewingTripForReport.location || 'Chưa nhập địa điểm'}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    {formatDateVN(viewingTripForReport.trip_date)} ({viewingTripForReport.days_count || 1} ngày)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng tiền</div>
                <div className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(viewingTripForReport.total_amount)}
                </div>
              </div>
            </div>

            {/* Ô xem & sao chép văn bản */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-500" />
                  <span>Nội dung văn bản báo cáo</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyReport()}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                    copiedReportText
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800'
                  )}
                >
                  {copiedReportText ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép nhanh</span>
                    </>
                  )}
                </button>
              </div>

              {/* Textarea hiển thị có thể chỉnh sửa trước khi sao chép nếu cần */}
              <div className="relative rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 p-3.5 font-mono text-xs shadow-inner">
                <textarea
                  value={customReportText}
                  onChange={(e) => setCustomReportText(e.target.value)}
                  rows={7}
                  className="w-full bg-transparent text-emerald-300 dark:text-emerald-300 focus:outline-none resize-none font-mono text-xs leading-relaxed"
                  placeholder="Nội dung báo cáo CTP..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingTripForReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleCopyReport()}
                className={cn(
                  'px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer',
                  copiedReportText
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                )}
              >
                {copiedReportText ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã Sao Chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao Chép Văn Bản CTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
