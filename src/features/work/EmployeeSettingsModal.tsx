import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { WorkSettings } from '../../types';
import { User, Hash, Calendar, Clock, Cloud, Check } from 'lucide-react';

interface EmployeeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workSettings: WorkSettings;
  onSave: (newSettings: Partial<WorkSettings>) => Promise<void>;
}

export const EmployeeSettingsModal: React.FC<EmployeeSettingsModalProps> = ({
  isOpen,
  onClose,
  workSettings,
  onSave,
}) => {
  const [empId, setEmpId] = useState(workSettings.employee_id || '42157');
  const [empName, setEmpName] = useState(workSettings.employee_name || 'Họ tên NV');
  const [standardDays, setStandardDays] = useState<number>(workSettings.standard_days_per_month || 26);
  const [standardHours, setStandardHours] = useState<number>(workSettings.standard_hours_per_day || 8);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmpId(workSettings.employee_id || '42157');
      setEmpName(workSettings.employee_name || 'Họ tên NV');
      setStandardDays(workSettings.standard_days_per_month || 26);
      setStandardHours(workSettings.standard_hours_per_day || 8);
    }
  }, [isOpen, workSettings]);

  const totalMonthlyHours = Math.round((Number(standardDays) || 26) * (Number(standardHours) || 8));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        employee_id: empId.trim() || '42157',
        employee_name: empName.trim() || 'Họ tên NV',
        standard_days_per_month: Number(standardDays) || 26,
        standard_hours_per_day: Number(standardHours) || 8,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thông Tin Nhân Viên & Giờ Chuẩn"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
          <Cloud className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">Đồng bộ đa thiết bị tự động:</p>
            <p className="text-slate-600 dark:text-slate-400">
              Thông tin Mã số NV, Họ tên và Định mức giờ chuẩn sẽ được lưu trữ và tự động đồng bộ realtime lên tài khoản Supabase Cloud cho tất cả các máy.
            </p>
          </div>
        </div>

        {/* Employee ID */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-sky-500" />
            <span>Mã số nhân viên (Mã số NV)</span>
          </label>
          <input
            type="text"
            required
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            placeholder="Ví dụ: 42157"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
          />
        </div>

        {/* Employee Name */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-sky-500" />
            <span>Họ và tên nhân viên</span>
          </label>
          <input
            type="text"
            required
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Lê Đạt Minh"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
          />
        </div>

        {/* Standard Quota Settings */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Ngày công chuẩn</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={31}
                required
                value={standardDays}
                onChange={(e) => setStandardDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">ngày</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Giờ chuẩn / ngày</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min={1}
                max={24}
                required
                value={standardHours}
                onChange={(e) => setStandardHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">giờ</span>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            Giờ công chuẩn tháng: <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">{standardDays} ngày</span> x <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">{standardHours}h</span> = <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base">{totalMonthlyHours} giờ</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu & Đồng Bộ Cloud'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
