import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { WorkLog, WorkSettings, WorkStatus } from '../../types';
import { calculateWorkHours, formatDateVN, getDayOfWeek } from '../../lib/utils';
import { Clock } from 'lucide-react';

interface WorkLogModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingLog: WorkLog | null;
  initialDate: string;
  workSettings: WorkSettings;
  onSave: (data: Partial<WorkLog>) => Promise<void>;
}

export const WorkLogModalForm: React.FC<WorkLogModalFormProps> = ({
  isOpen,
  onClose,
  editingLog,
  initialDate,
  workSettings,
  onSave,
}) => {
  const [formDate, setFormDate] = useState(initialDate);
  const [formStatus, setFormStatus] = useState<WorkStatus>('Làm việc');
  const [formCheckIn, setFormCheckIn] = useState(workSettings.default_check_in || '08:00');
  const [formCheckOut, setFormCheckOut] = useState(workSettings.default_check_out || '18:00');
  const [formBreakStart, setFormBreakStart] = useState(workSettings.default_break_start || '12:00');
  const [formBreakEnd, setFormBreakEnd] = useState(workSettings.default_break_end || '14:00');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpenRef = React.useRef(false);
  const prevEditingLogIdRef = React.useRef<string | undefined>(undefined);

  // Sync form state ONLY when modal transitions from closed to open, or when editing target changes
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isEditingTargetChanged = isOpen && editingLog?.id !== prevEditingLogIdRef.current;

    if (isOpening || isEditingTargetChanged) {
      if (editingLog) {
        setFormDate(editingLog.work_date);
        setFormStatus(editingLog.work_status);
        setFormCheckIn(editingLog.check_in || workSettings.default_check_in || '08:00');
        setFormCheckOut(editingLog.check_out || workSettings.default_check_out || '18:00');
        setFormBreakStart(editingLog.break_start || workSettings.default_break_start || '12:00');
        setFormBreakEnd(editingLog.break_end || workSettings.default_break_end || '14:00');
        setFormNotes(editingLog.notes || '');
      } else {
        setFormDate(initialDate);
        setFormStatus('Làm việc');
        setFormCheckIn(workSettings.default_check_in || '08:00');
        setFormCheckOut(workSettings.default_check_out || '18:00');
        setFormBreakStart(workSettings.default_break_start || '12:00');
        setFormBreakEnd(workSettings.default_break_end || '14:00');
        setFormNotes('');
      }
    }

    prevIsOpenRef.current = isOpen;
    prevEditingLogIdRef.current = editingLog?.id;
  }, [isOpen, editingLog, initialDate]);

  // Live calculation preview inside modal without triggering parent re-render
  const modalCalculated = useMemo(() => {
    return calculateWorkHours(
      formCheckIn,
      formCheckOut,
      formBreakStart,
      formBreakEnd,
      workSettings.standard_hours_per_day || 8,
      formStatus
    );
  }, [formCheckIn, formCheckOut, formBreakStart, formBreakEnd, workSettings.standard_hours_per_day, formStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        id: editingLog ? editingLog.id : undefined,
        work_date: formDate,
        check_in: formCheckIn,
        check_out: formCheckOut,
        break_start: formBreakStart,
        break_end: formBreakEnd,
        work_status: formStatus,
        notes: formNotes,
        break_duration_hours: modalCalculated.breakDurationHours,
        total_hours: modalCalculated.totalHours,
        overtime_hours: modalCalculated.overtimeHours,
        missing_hours: modalCalculated.missingHours,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLog ? 'Chỉnh Sửa Ca Làm Việc' : 'Thêm Bản Ghi Chấm Công'}
      subtitle={`Ngày làm việc: ${formatDateVN(formDate)} (${getDayOfWeek(formDate)})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
              <option value="Nghỉ phép năm">Nghỉ phép năm (Tính 8h công)</option>
              <option value="Nghỉ lễ">Nghỉ lễ (Tính 8h công)</option>
              <option value="Nghỉ phép">Nghỉ phép (Off)</option>
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
              <span>
                {formStatus === 'Nghỉ phép năm' || formStatus === 'Nghỉ lễ'
                  ? `Hưởng nguyên lương (${formStatus}):`
                  : 'Tính toán tự động theo phút:'}
              </span>
            </span>
            <span className="text-amber-800 dark:text-amber-300 font-display">
              {modalCalculated.totalMinutes} phút ({modalCalculated.totalHours} giờ công)
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu Chấm Công'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
