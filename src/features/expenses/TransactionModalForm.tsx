import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Transaction, ExpenseCategory, UserSettings } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';

interface TransactionModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTx: Transaction | null;
  categories: ExpenseCategory[];
  userSettings: UserSettings;
  defaultType?: 'expense' | 'income';
  onSave: (data: {
    id?: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
  }) => Promise<void>;
  onAddCategory: (category: Partial<ExpenseCategory>) => Promise<ExpenseCategory | null>;
}

export const TransactionModalForm: React.FC<TransactionModalFormProps> = ({
  isOpen,
  onClose,
  editingTx,
  categories,
  userSettings,
  defaultType = 'expense',
  onSave,
  onAddCategory,
}) => {
  const [formType, setFormType] = useState<'income' | 'expense'>(defaultType);
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formCategoryName, setFormCategoryName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isInlineAddCatOpen, setIsInlineAddCatOpen] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available categories for current selected type
  const availableCategories = useMemo(() => {
    return categories.filter((c) => c.type === formType);
  }, [categories, formType]);

  // Sync state when modal opens or editingTx changes
  useEffect(() => {
    if (isOpen) {
      if (editingTx) {
        setFormType(editingTx.type);
        setFormDate(editingTx.transaction_date);
        setFormCategoryName(editingTx.category);
        setFormAmount(editingTx.amount.toString());
        setFormNote(editingTx.description || '');
      } else {
        setFormType(defaultType);
        setFormDate(new Date().toISOString().split('T')[0]);
        const matchingCats = categories.filter((c) => c.type === defaultType);
        setFormCategoryName(matchingCats[0]?.name || (defaultType === 'income' ? 'Lương' : 'Ăn uống'));
        setFormAmount('');
        setFormNote('');
      }
      setIsInlineAddCatOpen(false);
      setInlineCatName('');
    }
  }, [isOpen, editingTx, defaultType, categories]);

  const handleQuickCreateCategory = async () => {
    if (!inlineCatName.trim()) return;
    try {
      const created = await onAddCategory({
        name: inlineCatName.trim(),
        type: formType,
        color: formType === 'income' ? '#10B981' : '#F43F5E',
      });
      if (created) {
        setFormCategoryName(created.name);
      } else {
        setFormCategoryName(inlineCatName.trim());
      }
      setInlineCatName('');
      setIsInlineAddCatOpen(false);
    } catch (err) {
      console.warn('Tạo nhanh danh mục lỗi:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingTx ? editingTx.id : undefined,
        type: formType,
        amount: numAmount,
        category: formCategoryName || (formType === 'income' ? 'Lương' : 'Ăn uống'),
        description: formNote,
        transaction_date: formDate,
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
      title={editingTx ? 'Chỉnh Sửa Giao Dịch' : formType === 'income' ? 'Thêm Khoản Thu Nhập' : 'Thêm Khoản Chi Tiêu'}
      subtitle="Quản lý dòng tiền tài chính cá nhân"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setFormType('income');
              const incCats = categories.filter((c) => c.type === 'income');
              setFormCategoryName(incCats[0]?.name || 'Lương');
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              formType === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Thu Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setFormType('expense');
              const expCats = categories.filter((c) => c.type === 'expense');
              setFormCategoryName(expCats[0]?.name || 'Ăn uống');
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              formType === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Chi Tiêu
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngày giao dịch
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Danh mục
              </label>
              <button
                type="button"
                onClick={() => setIsInlineAddCatOpen(!isInlineAddCatOpen)}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> {isInlineAddCatOpen ? 'Đóng' : 'Thêm mới'}
              </button>
            </div>

            {!isInlineAddCatOpen ? (
              <select
                value={formCategoryName}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsInlineAddCatOpen(true);
                  } else {
                    setFormCategoryName(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__add_new__" className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ➕ Thêm danh mục mới...
                </option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  placeholder={`Tên danh mục ${formType === 'income' ? 'thu' : 'chi'}...`}
                  value={inlineCatName}
                  onChange={(e) => setInlineCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickCreateCategory();
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuickCreateCategory()}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap shadow-xs cursor-pointer"
                >
                  Tạo
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Số tiền ({userSettings.currency})
          </label>
          <input
            type="number"
            required
            min="0"
            step="any"
            placeholder="VD: 500000"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {formAmount && !isNaN(Number(formAmount)) && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
              Hiển thị: {formatCurrency(Number(formAmount), userSettings.currency)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Ghi chú
          </label>
          <textarea
            rows={2}
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="Chi tiết giao dịch..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 ${
              formType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
