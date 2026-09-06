import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../lib/utils';
import { Save, Calculator } from 'lucide-react';

interface SalaryCalculatorProps {
  month: number; // 1-12
  year: number;
  totalOvertimeMinutes: number; // calculated from summary
}

interface MonthlySalaryData {
  baseSalary: number;
  kpiBonus: number;
  salesBonus: number;
  otherAllowance: number;
  insuranceDeduction: number;
}

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ month, year, totalOvertimeMinutes }) => {
  const { workSettings } = useData();
  const storageKey = `app_salary_${year}_${month}`;

  const [data, setData] = useState<MonthlySalaryData>({
    baseSalary: 0,
    kpiBonus: 0,
    salesBonus: 0,
    otherAllowance: 0,
    insuranceDeduction: 0,
  });
  
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setData(JSON.parse(saved));
    } else {
      // Initialize with 0 or previous settings if you want, but starting at 0 is safer
      setData({
        baseSalary: 0,
        kpiBonus: 0,
        salesBonus: 0,
        otherAllowance: 0,
        insuranceDeduction: 0,
      });
    }
    setIsSaved(false);
  }, [storageKey]);

  const handleChange = (field: keyof MonthlySalaryData, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    setData(prev => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num
    }));
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Bảng Lương Tháng {month}/{year}
            </h3>
            <p className="text-xs text-slate-500">Tính toán thu nhập và tăng ca</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? 'Đã Lưu' : 'Lưu Lại'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cột nhập liệu */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            Thu Nhập Thường Xuyên
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
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
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
              className="w-full px-3 py-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        {/* Cột tổng kết */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
              Chi Tiết Tăng Ca
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tổng phút tăng ca</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {totalOvertimeMinutes > 0 ? totalOvertimeMinutes : 0} phút
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Quy ra giờ</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {totalOvertimeMinutes > 0 ? (totalOvertimeMinutes / 60).toFixed(1) : 0} giờ
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Đơn giá tăng ca (1 phút)</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {Math.round(perMinuteRate).toLocaleString('vi-VN')} đ/phút
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-medium text-slate-700 dark:text-slate-300">Tiền tăng ca nhận được</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(Math.round(overtimePay))}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 text-right uppercase tracking-wider">
              Tổng Lương Tháng {month}/{year}
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 text-right font-display tracking-tight">
              {formatCurrency(Math.round(totalSalary))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
