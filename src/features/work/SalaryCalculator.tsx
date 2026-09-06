import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../lib/utils';
import { Save, Calculator, Cloud, CheckCircle2, Loader2, CloudCheck } from 'lucide-react';
import { MonthlySalaryData } from '../../types';

interface SalaryCalculatorProps {
  month: number; // 1-12
  year: number;
  totalOvertimeMinutes: number; // calculated from summary
}

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ month, year, totalOvertimeMinutes }) => {
  const { workSettings, getSalaryRecord, saveSalaryRecord, syncStatus } = useData();

  const [data, setData] = useState<MonthlySalaryData>(() => getSalaryRecord(month, year));
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);

  // Sync state when month/year changes or when loaded from cloud
  useEffect(() => {
    const record = getSalaryRecord(month, year);
    setData(record);
    setIsSaved(false);
    isInitialMount.current = true;
  }, [month, year]);

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
      await saveSalaryRecord(month, year, data, totalOvertimeMinutes);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Lỗi khi lưu bảng lương:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations
  const standardDays = workSettings.standard_days_per_month || 26;
  const standardHours = workSettings.standard_hours_per_day || 8;
  const standardMinutes = standardDays * standardHours * 60;
  
  const perMinuteRate = data.baseSalary > 0 && standardMinutes > 0 ? (data.baseSalary / standardMinutes) : 0;
  
  // Tiền tăng ca (Chỉ tính khi có số phút tăng ca > 0)
  const overtimePay = totalOvertimeMinutes > 0 ? (perMinuteRate * totalOvertimeMinutes) : 0;
  
  // Tổng lương
  const totalSalary = data.baseSalary 
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
            <p className="text-xs text-slate-500">Tính toán thu nhập, trợ cấp và tiền tăng ca tự động</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cột nhập liệu */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>Thu Nhập Thường Xuyên</span>
            <span className="text-[11px] font-normal text-slate-400">Đơn vị: VNĐ</span>
          </h4>
          
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Lương chính thức (Cho {standardDays} ngày x {standardHours}h)
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
          <div>
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 flex items-center justify-between">
              <span>Chi Tiết Tăng Ca</span>
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {standardDays} ngày x {standardHours}h = {standardMinutes / 60}h chuẩn
              </span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tổng phút tăng ca</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {totalOvertimeMinutes > 0 ? totalOvertimeMinutes : 0} phút
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Quy ra giờ</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {totalOvertimeMinutes > 0 ? (totalOvertimeMinutes / 60).toFixed(1) : 0} giờ
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Đơn giá tăng ca (1 phút)</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                  {Math.round(perMinuteRate).toLocaleString('vi-VN')} đ/phút
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300">Tiền tăng ca nhận được</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  + {formatCurrency(Math.round(overtimePay))}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
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
