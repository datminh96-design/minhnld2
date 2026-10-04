import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, numberToVietnameseWords } from '../../lib/utils';
import { Save, Calculator, Cloud, CheckCircle2, Loader2, Clock, TrendingUp, Info, RefreshCw, X, Sparkles, Plus } from 'lucide-react';
import { MonthlySalaryData } from '../../types';

interface SalaryCalculatorProps {
  month: number; // 1-12
  year: number;
  totalWorkedMinutes?: number; // Tổng thời gian đã làm thực tế trong tháng
  totalOvertimeMinutes: number; // calculated from summary
}

interface SmartCurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  isNegative?: boolean;
  showPresets?: boolean;
  showInWords?: boolean;
  unitLabel?: string;
  subInfo?: React.ReactNode;
}

const SmartCurrencyInput: React.FC<SmartCurrencyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '0',
  isNegative = false,
  showPresets = false,
  showInWords = false,
  unitLabel = 'VNĐ',
  subInfo,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  // rawInput holds the exact string while typing without IME-breaking dynamic dot insertions
  const [rawInput, setRawInput] = useState<string>(() => {
    return value > 0 ? value.toString() : '';
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize when external value changes and not actively focused
  useEffect(() => {
    if (!isFocused) {
      setRawInput(value > 0 ? value.toString() : '');
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only numeric digits
    const cleanDigits = val.replace(/\D/g, '');

    if (!cleanDigits) {
      setRawInput('');
      onChange(0);
      return;
    }

    const num = Math.min(parseInt(cleanDigits, 10) || 0, 999_999_999_999);
    setRawInput(cleanDigits);
    onChange(num);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setRawInput(value > 0 ? value.toString() : '');
    // Select input content for quick re-typing
    setTimeout(() => {
      e.target.select();
    }, 10);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!rawInput || parseInt(rawInput, 10) === 0) {
      setRawInput('');
      onChange(0);
    } else {
      const num = parseInt(rawInput, 10);
      onChange(num);
    }
  };

  const handleClear = () => {
    setRawInput('');
    onChange(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePresetSelect = (amount: number) => {
    setRawInput(amount > 0 ? amount.toString() : '');
    onChange(amount);
  };

  const handleIncrement = (added: number) => {
    const next = Math.max(0, value + added);
    setRawInput(next > 0 ? next.toString() : '');
    onChange(next);
  };

  // Formatted display value: when unfocused, show with dots "7.000.000". When focused, show raw digits "7000000" for smooth typing
  const displayVal = isFocused ? rawInput : (value > 0 ? value.toLocaleString('vi-VN') : '');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`block text-xs font-medium ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {label}
        </label>
        {value > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Xóa nhanh về 0 đ"
          >
            <X className="w-3 h-3" /> Xóa
          </button>
        )}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayVal}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full pl-3 pr-12 py-2.5 rounded-xl text-sm font-semibold transition-all outline-none font-mono ${
            isNegative
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
          {unitLabel}
        </span>
      </div>

      {/* Hiển thị số tiền format trực quan và bằng chữ tiếng Việt */}
      {value > 0 && (
        <div className="flex flex-col gap-0.5 px-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-emerald-600 dark:text-emerald-300">
            <span>👉 {value.toLocaleString('vi-VN')} đ</span>
            {showInWords && (
              <span className="font-normal font-sans italic text-[11px] text-slate-600 dark:text-slate-400">
                ({numberToVietnameseWords(value)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sub info (đơn giá giờ công) */}
      {subInfo}

      {/* Gợi ý mức phổ biến & cộng nhanh cho Lương chính thức */}
      {showPresets && (
        <div className="pt-1.5 space-y-2">
          {/* Mức phổ biến: 5tr, 7tr, 10tr, 15tr, 20tr */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[10px] text-slate-400 font-medium mr-0.5">Mức phổ biến:</span>
            {[5_000_000, 7_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  value === preset
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {preset / 1_000_000}tr
              </button>
            ))}
          </div>

          {/* Cộng nhanh: +100k, +200k, +500k, +1tr, +2tr, +5tr */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[10px] text-slate-400 font-medium mr-0.5">Cộng nhanh:</span>
            {[
              { label: '+100k', amount: 100_000 },
              { label: '+200k', amount: 200_000 },
              { label: '+500k', amount: 500_000 },
              { label: '+1tr', amount: 1_000_000 },
              { label: '+2tr', amount: 2_000_000 },
              { label: '+5tr', amount: 5_000_000 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleIncrement(item.amount)}
                className="px-2 py-0.5 rounded-lg font-semibold bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 transition-all cursor-pointer text-[10px] flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ 
  month, 
  year, 
  totalWorkedMinutes = 0,
  totalOvertimeMinutes = 0 
}) => {
  const { workSettings, salaryRecords, getSalaryRecord, saveSalaryRecord, syncWithSupabase } = useData();

  const [data, setData] = useState<MonthlySalaryData>(() => getSalaryRecord(month, year));
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialMount = useRef(true);
  const lastSavedDataStr = useRef(JSON.stringify(getSalaryRecord(month, year)));

  // Sync state when month/year changes or when loaded from cloud
  useEffect(() => {
    const record = getSalaryRecord(month, year);
    setData(record);
    lastSavedDataStr.current = JSON.stringify(record);
    setIsSaved(false);

    // If local record is empty, quietly pull from Supabase Cloud on mount
    if (!record.baseSalary && isInitialMount.current) {
      syncWithSupabase(false);
    }
  }, [month, year]);

  // Listen to custom window events for instant sync across components/tabs
  useEffect(() => {
    const handleSalaryUpdated = (e: any) => {
      const key = `${year}_${month}`;
      if (e.detail?.key === key && e.detail?.data) {
        setData(e.detail.data);
        lastSavedDataStr.current = JSON.stringify(e.detail.data);
      }
    };
    window.addEventListener('app_salary_updated', handleSalaryUpdated);
    return () => window.removeEventListener('app_salary_updated', handleSalaryUpdated);
  }, [month, year]);

  // Auto-save with debounce whenever user changes any field
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const currentStr = JSON.stringify(data);
    if (currentStr === lastSavedDataStr.current) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        lastSavedDataStr.current = currentStr;
        await saveSalaryRecord(month, year, data, totalWorkedMinutes, totalOvertimeMinutes, true);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } catch (err) {
        console.warn('Auto-save salary error:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [data, month, year, totalWorkedMinutes, totalOvertimeMinutes]);

  const handleFieldChange = (field: keyof MonthlySalaryData, val: number) => {
    setData((prev) => ({
      ...prev,
      [field]: val,
    }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      lastSavedDataStr.current = JSON.stringify(data);
      await saveSalaryRecord(month, year, data, totalWorkedMinutes, totalOvertimeMinutes, false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Lỗi khi lưu bảng lương:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithSupabase(true);
      const record = getSalaryRecord(month, year);
      setData(record);
      lastSavedDataStr.current = JSON.stringify(record);
    } finally {
      setIsSyncing(false);
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
                <span>Supabase Realtime Cloud</span>
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
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Đồng bộ dữ liệu bảng lương mới nhất từ Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isSyncing ? 'Đang tải Cloud...' : 'Đồng bộ lại'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-70 cursor-pointer"
            title="Lưu trữ và đồng bộ hóa tức thì toàn bộ bảng lương lên mọi thiết bị qua Supabase Cloud"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu Cloud...</span>
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã Đồng Bộ Cloud</span>
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
          
          {/* Lương chính thức */}
          <SmartCurrencyInput
            label={`Lương chính thức (Cho ${standardDays} ngày x ${standardHoursPerDay}h = ${standardTotalHours}h chuẩn)`}
            value={data.baseSalary}
            onChange={(val) => handleFieldChange('baseSalary', val)}
            placeholder="0"
            showPresets={true}
            showInWords={true}
            subInfo={
              data.baseSalary > 0 ? (
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <span>Đơn giá giờ (÷ {standardTotalHours}h):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {Math.round(hourlyRate).toLocaleString('vi-VN')} đ/giờ ({Math.round(perMinuteRate).toLocaleString('vi-VN')} đ/phút)
                  </span>
                </div>
              ) : null
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SmartCurrencyInput
              label="Thưởng KPI"
              value={data.kpiBonus}
              onChange={(val) => handleFieldChange('kpiBonus', val)}
              placeholder="0"
            />
            <SmartCurrencyInput
              label="Thưởng Bán Hàng"
              value={data.salesBonus}
              onChange={(val) => handleFieldChange('salesBonus', val)}
              placeholder="0"
            />
          </div>

          <SmartCurrencyInput
            label="Phụ cấp khác (Cơm trưa, điện thoại, xăng xe...)"
            value={data.otherAllowance}
            onChange={(val) => handleFieldChange('otherAllowance', val)}
            placeholder="0"
          />

          <SmartCurrencyInput
            label="Khoản trích đóng bảo hiểm (Trừ BHXH, BHYT...)"
            value={data.insuranceDeduction}
            onChange={(val) => handleFieldChange('insuranceDeduction', val)}
            placeholder="0"
            isNegative={true}
          />
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
