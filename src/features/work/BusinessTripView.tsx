import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BusinessTripExpense } from '../../types';
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
  Tag
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
  const [editingTrip, setEditingTrip] = useState<BusinessTripExpense | null>(null);

  // Form Fields
  const [formTripDate, setFormTripDate] = useState<string>(
    `${year}-${String(month).padStart(2, '0')}-01`
  );
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formDaysCount, setFormDaysCount] = useState<number>(1);
  const [formDailyRate, setFormDailyRate] = useState<number>(160000); // Mặc định 160.000 hoặc 200.000
  const [formHotelCost, setFormHotelCost] = useState<number | string>('');
  const [formOutboundCost, setFormOutboundCost] = useState<number | string>('');
  const [formReturnCost, setFormReturnCost] = useState<number | string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsPaid, setFormIsPaid] = useState<boolean>(false);

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
    setFormOutboundCost('');
    setFormReturnCost('');
    setFormLocation('');
    setFormNotes('');
    setFormIsPaid(false);
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
    setFormOutboundCost(trip.outbound_cost || '');
    setFormReturnCost(trip.return_cost || '');
    setFormLocation(trip.location || '');
    setFormNotes(trip.notes || '');
    setFormIsPaid(Boolean(trip.is_paid));
    setIsModalOpen(true);
  };

  // Live calculation for form total
  const calculatedDailyTotal = (Number(formDaysCount) || 1) * (Number(formDailyRate) || 0);
  const calculatedHotelTotal = Number(formHotelCost) || 0;
  const calculatedOutboundTotal = Number(formOutboundCost) || 0;
  const calculatedReturnTotal = Number(formReturnCost) || 0;
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
    const outbound = Number(formOutboundCost) || 0;
    const returnCost = Number(formReturnCost) || 0;
    const totalDaily = days * rate;
    const grandTotal = totalDaily + hotel + outbound + returnCost;

    await saveBusinessTrip({
      id: editingTrip ? editingTrip.id : undefined,
      trip_date: formTripDate,
      end_date: formEndDate || undefined,
      days_count: days,
      daily_allowance_rate: rate,
      total_daily_allowance: totalDaily,
      hotel_cost: hotel,
      outbound_cost: outbound,
      return_cost: returnCost,
      total_amount: grandTotal,
      is_paid: formIsPaid,
      paid_at: formIsPaid ? (editingTrip?.paid_at || new Date().toISOString()) : undefined,
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
                          formatCurrency(trip.outbound_cost)
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Lượt về */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {trip.return_cost > 0 ? (
                          formatCurrency(trip.return_cost)
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
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[160px]">{trip.location}</span>
                          </div>
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

          {/* Hàng 4: Lượt đi & Lượt về */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-900/40">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-sky-600" /> Tiền lượt đi (VNĐ)
                </span>
                <span className="text-[11px] text-sky-600 font-mono">
                  {formatCurrency(calculatedOutboundTotal)}
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formOutboundCost}
                onChange={(e) => setFormOutboundCost(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="VD: 150000"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-sky-600" /> Tiền lượt về (VNĐ)
                </span>
                <span className="text-[11px] text-sky-600 font-mono">
                  {formatCurrency(calculatedReturnTotal)}
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formReturnCost}
                onChange={(e) => setFormReturnCost(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="VD: 150000"
              />
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

          {/* Hàng 6: Trạng thái thanh toán ban đầu */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="formIsPaidCheckbox"
              checked={formIsPaid}
              onChange={(e) => setFormIsPaid(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="formIsPaidCheckbox" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              Đã thanh toán (nếu chưa thanh toán, để trống để hiện chữ Đỏ chờ thanh toán)
            </label>
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
    </div>
  );
};
