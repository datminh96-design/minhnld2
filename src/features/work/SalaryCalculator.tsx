import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../lib/utils';
import { Save, Calculator, Cloud, CheckCircle2, Loader2, Briefcase, Clock, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { MonthlySalaryData } from '../../types';

interface SalaryCalculatorProps {
  month: number; // 1-12
  year: number;
  totalWorkedMinutes?: number; // Tổng thời gian đã làm thực tế trong tháng
  totalOvertimeMinutes: number; // calculated from summary
}

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ 
  month, 
  year, 
  totalWorkedMinutes = 0,
  totalOvertimeMinutes = 0 
}) => {
  const { workSettings, salaryRecords, getSalaryRecord, saveSalaryRecord, businessTrips } = useData();

  const [data, setData] = useState<MonthlySalaryData>(() => getSalaryRecord(month, year));
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);

  // Business Trips for this month
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthTripsSummary = useMemo(() => {
    const list = businessTrips.filter((t) => t.trip_date.startsWith(monthPrefix));
    let pendingAmount = 0;
    let paidAmount = 0;
    list.forEach((t) => {
      if (t.is_paid) paidAmount += t.total_amount || 0;
      else pendingAmount += t.total_amount || 0;
    });
    return {
      count: list.length,
      pendingAmount,
      paidAmount,
      totalAmount: pendingAmount + paidAmount,
    };
  }, [businessTrips, monthPrefix]);

  // Sync state when month/year changes or when loaded from cloud
  useEffect(() => {
    const record = getSalaryRecord(month, year);
    setData(record);
    setIsSaved(false);
    isInitialMount.current = true;
  }, [month, year, salaryRecords, workSettings]);

  const handleChange = (field: keyof MonthlySalaryData, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    const updated = {
      ...data,
      [field]: isNaN(num) ? 0 : num
    };
    setData(updated);
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSalaryRecord(month, year, data, totalWorkedMinutes, totalOvertimeMinutes);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Lỗi khi lưu bảng lương:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // CƠ CHẾ TÍNH LƯƠNG CHÍNH XÁC THEO MỐC 208 GIỜ CHUẨN (26 NGÀY x 8H)
  // =========================================================================
  const standardDays = workSettings.standard_days_per_month || 26;
  const standardHoursPerDay = workSettings.standard_hours_per_day || 8;
  const standardTotalHours = standardDays * standardHoursPerDay; // 208 giờ
  const standardMinutes = standardTotalHours * 60; // 12,480 phút

  // Đơn giá 1 giờ = Lương chính thức / 208 giờ
  const hourlyRate = data.baseSalary > 0 && standardTotalHours > 0 ? (data.baseSalary / standardTotalHours) : 0;
  // Đơn giá 1 phút = Lương chính thức / (208 * 60)
  const perMinuteRate = data.baseSalary > 0 && standardMinutes > 0 ? (data.baseSalary / standardMinutes) : 0;

  // Tổng thời gian làm việc thực tế trong tháng (bao gồm cả 8h nghỉ phép năm và 8h nghỉ lễ)
  const workedMinutes = totalWorkedMinutes || 0;
  const workedHours = workedMinutes / 60;

  // 1. Lương giờ công tiêu chuẩn (Tối đa 208 giờ):
  // Làm được bao nhiêu giờ thì tính xuống bấy nhiêu lương (tối đa bằng lương chính thức khi đủ 208h)
  const regularMinutes = Math.min(workedMinutes, standardMinutes);
  const regularHours = regularMinutes / 60;
  const regularSalary = regularMinutes * perMinuteRate;

  // 2. Tăng ca (OT):
  // Khi làm tới 208 giờ tiếp theo sẽ tính vào giờ tăng ca
  const excessMinutesOver208 = Math.max(0, workedMinutes - standardMinutes);
  // Lấy giá trị lớn hơn giữa số phút vượt 208h và số phút tăng ca đã ghi nhận
  const effectiveOvertimeMinutes = Math.max(excessMinutesOver208, totalOvertimeMinutes);
  const effectiveOvertimeHours = effectiveOvertimeMinutes / 60;
  const overtimePay = effectiveOvertimeMinutes * perMinuteRate;

  // 3. Tổng lương thực nhận
  const totalSalary = regularSalary 
                    + data.kpiBonus 
                    + data.salesBonus 
                    + data.otherAllowance 
                    - data.insuranceDeduction 
                    + overtimePay;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Bảng Lương Tháng {month}/{year}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                <Cloud className="w-3 h-3" />
                <span>Supabase Cloud</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Định mức: {standardDays} ngày x {standardHoursPerDay}h = {standardTotalHours} giờ chuẩn (vượt {standardTotalHours}h tính tăng ca)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-70 cursor-pointer"
            title="Lưu trữ và đồng bộ hóa toàn bộ dữ liệu bảng lương lên Supabase Cloud"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu Cloud...</span>
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã Lưu Cloud</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Lên Cloud</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Box hướng dẫn quy tắc tính lương */}
      <div className="mb-6 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold mb-0.5">Quy tắc tính lương tự động theo giờ công:</p>
          <p className="text-sky-700/90 dark:text-sky-300/90">
            • <strong>Đơn giá 1 giờ:</strong> Lương chính thức ÷ {standardTotalHours} giờ = <span className="font-bold text-sky-900 dark:text-sky-200">{Math.round(hourlyRate).toLocaleString('vi-VN')} đ/giờ</span>.
          </p>
          <p className="text-sky-700/90 dark:text-sky-300/90">
            • <strong>Làm bao nhiêu tính bấy nhiêu:</strong> Số giờ làm thực tế (tối đa {standardTotalHours}h) × đơn giá giờ.
          </p>
          <p className="text-sky-700/90 dark:text-sky-300/90">
            • <strong>Tính tăng ca:</strong> Khi làm đủ {standardTotalHours} giờ, toàn bộ thời gian làm tiếp theo sẽ tự động được tính vào tiền tăng ca (OT).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cột nhập liệu */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>Thu Nhập Thường Xuyên</span>
            <span className="text-[11px] font-normal text-slate-400">Đơn vị: VNĐ</span>
          </h4>
          
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Lương chính thức (Cho {standardDays} ngày x {standardHoursPerDay}h = {standardTotalHours}h)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatCurrency(data.baseSalary).replace(' đ', '')}
                onChange={(e) => handleChange('baseSalary', e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            {data.baseSalary > 0 && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>Đơn giá giờ (÷ {standardTotalHours}h):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {Math.round(hourlyRate).toLocaleString('vi-VN')} đ/giờ ({Math.round(perMinuteRate).toLocaleString('vi-VN')} đ/phút)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Thưởng KPI
              </label>
              <input
                type="text"
                value={formatCurrency(data.kpiBonus).replace(' đ', '')}
                onChange={(e) => handleChange('kpiBonus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Thưởng Bán Hàng
              </label>
              <input
                type="text"
                value={formatCurrency(data.salesBonus).replace(' đ', '')}
                onChange={(e) => handleChange('salesBonus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all font-mono"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Phụ cấp khác
            </label>
            <input
              type="text"
              value={formatCurrency(data.otherAllowance).replace(' đ', '')}
              onChange={(e) => handleChange('otherAllowance', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all font-mono"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-rose-500 mb-1.5">
              Khoản trích đóng bảo hiểm (Trừ)
            </label>
            <input
              type="text"
              value={formatCurrency(data.insuranceDeduction).replace(' đ', '')}
              onChange={(e) => handleChange('insuranceDeduction', e.target.value)}
              className="w-full px-3 py-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 transition-all font-mono"
              placeholder="0"
            />
          </div>
        </div>

        {/* Cột tổng kết */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
              <span>Bảng Kê Chi Tiết Thu Nhập</span>
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                Định mức {standardTotalHours}h chuẩn
              </span>
            </h4>
            
            {/* 1. Lương theo giờ làm thực tế */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  1. Lương Giờ Làm Thực Tế
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {workedHours.toFixed(1)} / {standardTotalHours}h
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>
                  {workedHours >= standardTotalHours ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Đạt đủ 100% định mức ({standardTotalHours}h)</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Thiếu {(standardTotalHours - workedHours).toFixed(1)}h ({( (regularHours / standardTotalHours) * 100 ).toFixed(1)}%)
                    </span>
                  )}
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatCurrency(Math.round(regularSalary))}
                </span>
              </div>
            </div>

            {/* 2. Tiền Tăng Ca (Phần vượt 208h hoặc ca OT) */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  2. Tiền Tăng Ca (Vượt {standardTotalHours}h)
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  +{effectiveOvertimeHours.toFixed(1)}h ({effectiveOvertimeMinutes} phút)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Đơn giá: {Math.round(hourlyRate).toLocaleString('vi-VN')} đ/h</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                  + {formatCurrency(Math.round(overtimePay))}
                </span>
              </div>
            </div>

            {/* 3. Thưởng & Phụ cấp khác */}
            {(data.kpiBonus > 0 || data.salesBonus > 0 || data.otherAllowance > 0) && (
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 text-xs space-y-1.5">
                <div className="flex justify-between items-center font-medium text-slate-700 dark:text-slate-300">
                  <span>3. Thưởng & Phụ cấp khác:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    + {formatCurrency(data.kpiBonus + data.salesBonus + data.otherAllowance)}
                  </span>
                </div>
              </div>
            )}

            {/* 4. Giảm trừ bảo hiểm */}
            {data.insuranceDeduction > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 text-xs flex justify-between items-center text-rose-600 dark:text-rose-400">
                <span>4. Khoản trích đóng bảo hiểm:</span>
                <span className="font-mono font-bold">
                  - {formatCurrency(data.insuranceDeduction)}
                </span>
              </div>
            )}

            {/* Phụ cấp Công Tác Phí Tháng */}
            {monthTripsSummary.count > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Công Tác Phí ({monthTripsSummary.count} chuyến)
                  </span>
                  <span className="font-mono">{formatCurrency(monthTripsSummary.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Chờ thanh toán:
                  </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {formatCurrency(monthTripsSummary.pendingAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã thanh toán:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(monthTripsSummary.paidAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 text-right uppercase tracking-wider">
              Tổng Lương Thực Nhận Tháng {month}/{year}
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 text-right font-display tracking-tight font-mono">
              {formatCurrency(Math.round(totalSalary))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
