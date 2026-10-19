import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Briefcase, Calendar, CheckCircle2, DollarSign, Flag, Layers, Percent, X } from 'lucide-react';

interface ProjectModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> & { id?: string }) => Promise<void>;
  initialData?: Project | null;
}

export const ProjectModalForm: React.FC<ProjectModalFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [progress, setProgress] = useState(0);
  const [budget, setBudget] = useState('');
  const [spent, setSpent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setClient(initialData.client || '');
      setDescription(initialData.description || '');
      setStatus(initialData.status || 'in_progress');
      setProgress(initialData.progress || 0);
      setBudget(initialData.budget ? initialData.budget.toString() : '');
      setSpent(initialData.spent ? initialData.spent.toString() : '');
      setDeadline(initialData.deadline || '');
      setPriority(initialData.priority || 'medium');
    } else {
      setName('');
      setClient('');
      setDescription('');
      setStatus('in_progress');
      setProgress(0);
      setBudget('');
      setSpent('');
      setDeadline(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setPriority('medium');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        client: client.trim() || undefined,
        description: description.trim() || undefined,
        status,
        progress: Math.min(100, Math.max(0, Number(progress) || 0)),
        budget: Number(budget) || 0,
        spent: Number(spent) || 0,
        deadline: deadline || undefined,
        priority,
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
      title={initialData ? 'Chỉnh Sửa Dự Án' : 'Thêm Dự Án Mới'}
      subtitle="Theo dõi tiến độ, ngân sách và trạng thái bàn giao dự án"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tên dự án / Hạng mục công việc <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Triển khai Cổng Thanh Toán & OCR Hóa Đơn..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Client & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Khách hàng / Đơn vị phụ trách
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="VD: MinhTech Enterprise"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Độ ưu tiên
            </label>
            <div className="flex items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="high">🔴 Cao (High Priority)</option>
                <option value="medium">🟡 Trung bình (Medium)</option>
                <option value="low">🟢 Thấp (Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status & Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trạng thái dự án
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="in_progress">⚡ Đang triển khai (In Progress)</option>
              <option value="review">🔍 Chờ nghiệm thu (Under Review)</option>
              <option value="completed">✅ Đã hoàn thành (Completed)</option>
              <option value="planning">📋 Lên kế hoạch (Planning)</option>
              <option value="on_hold">⏸️ Tạm hoãn (On Hold)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tiến độ hoàn thành
              </label>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {progress}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Budget & Spent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngân sách dự kiến (VND)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="number"
                min="0"
                step="500000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="VD: 30000000"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chi phí / Đã thanh toán (VND)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="number"
                min="0"
                step="500000"
                value={spent}
                onChange={(e) => setSpent(e.target.value)}
                placeholder="VD: 15000000"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Hạn chót bàn giao (Deadline)
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Ghi chú & Phạm vi công việc (Scope)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả các hạng mục và trạng thái hiện tại của dự án..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Cập Nhật' : 'Lưu Dự Án'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
