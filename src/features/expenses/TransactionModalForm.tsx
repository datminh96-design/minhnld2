import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Transaction, ExpenseCategory, UserSettings } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getCategoryIconMeta, AVAILABLE_CATEGORY_ICONS } from '../../lib/categoryIcons';
import { ArrowDownLeft, ArrowUpRight, Plus, Sparkles, Check } from 'lucide-react';

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
  const [inlineCatIcon, setInlineCatIcon] = useState('ShoppingBag');
  const [inlineCatColor, setInlineCatColor] = useState('#EF4444');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpenRef = React.useRef(false);
  const prevEditingTxIdRef = React.useRef<string | undefined>(undefined);

  // Available categories for current selected type
  const availableCategories = useMemo(() => {
    return categories.filter((c) => c.type === formType);
  }, [categories, formType]);

  // Sync state ONLY when modal transitions from closed to open, or when editingTx changes
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isEditingTargetChanged = isOpen && editingTx?.id !== prevEditingTxIdRef.current;

    if (isOpening || isEditingTargetChanged) {
      if (editingTx) {
        setFormType(editingTx.transaction_type);
        setFormDate(editingTx.transaction_date || new Date().toISOString().split('T')[0]);
        setFormCategoryName(editingTx.category_name);
        setFormAmount(editingTx.amount ? editingTx.amount.toString() : '');
        setFormNote(editingTx.note || '');
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

    prevIsOpenRef.current = isOpen;
    prevEditingTxIdRef.current = editingTx?.id;
  }, [isOpen, editingTx, defaultType, categories]);

  // Update inline category default color/icon when category name changes
  useEffect(() => {
    if (inlineCatName.trim()) {
      const meta = getCategoryIconMeta(inlineCatName.trim());
      setInlineCatIcon(meta.iconName);
      setInlineCatColor(meta.color);
    }
  }, [inlineCatName]);

  const handleQuickCreateCategory = async () => {
    if (!inlineCatName.trim()) return;
    try {
      const meta = getCategoryIconMeta(inlineCatName.trim(), inlineCatIcon, inlineCatColor);
      const created = await onAddCategory({
        name: inlineCatName.trim(),
        type: formType,
        icon: meta.iconName,
        color: meta.color,
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

  const selectedCategoryMeta = useMemo(() => {
    const matched = categories.find((c) => c.name === formCategoryName);
    return getCategoryIconMeta(formCategoryName, matched?.icon, matched?.color);
  }, [formCategoryName, categories]);

  const SelectedIcon = selectedCategoryMeta.Icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTx ? 'Chỉnh Sửa Giao Dịch' : formType === 'income' ? 'Thêm Khoản Thu Nhập' : 'Thêm Khoản Chi Tiêu'}
      subtitle="Quản lý dòng tiền tài chính cá nhân"
      maxWidth="lg"
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Chi Tiêu
          </button>
        </div>

        {/* Categorization System with Visual Icons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Danh mục {formType === 'income' ? 'thu nhập' : 'chi tiêu'}</span>
              <span className="text-[11px] font-normal text-slate-400">({availableCategories.length} danh mục)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsInlineAddCatOpen(!isInlineAddCatOpen)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" /> {isInlineAddCatOpen ? 'Đóng tạo nhanh' : '+ Tạo danh mục mới'}
            </button>
          </div>

          {/* Inline Quick Category Creator */}
          {isInlineAddCatOpen && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder={`Nhập tên danh mục ${formType === 'income' ? 'thu' : 'chi'} (VD: Cà phê, Grab, Học tập...)`}
                  value={inlineCatName}
                  onChange={(e) => setInlineCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickCreateCategory();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuickCreateCategory()}
                  disabled={!inlineCatName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Tạo & Chọn
                </button>
              </div>

              {inlineCatName.trim() && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tự động nhận diện biểu tượng & màu sắc chuẩn</span>
                </div>
              )}
            </div>
          )}

          {/* Category Icon Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            {availableCategories.map((c) => {
              const isSelected = formCategoryName === c.name;
              const { Icon: CatIcon, color, bgColor } = getCategoryIconMeta(c.name, c.icon, c.color);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormCategoryName(c.name)}
                  className={`p-2 rounded-xl flex items-center gap-2 text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bgColor }}
                  >
                    <CatIcon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                    {c.name}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Selected Category Pill Preview */}
          {formCategoryName && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
              <span className="text-slate-400 text-[11px]">Đang chọn:</span>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: selectedCategoryMeta.bgColor }}
              >
                <SelectedIcon className="w-3 h-3" style={{ color: selectedCategoryMeta.color }} />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100 font-display">
                {formCategoryName}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            {formAmount && !isNaN(Number(formAmount)) && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                Hiển thị: {formatCurrency(Number(formAmount), userSettings.currency)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngày giao dịch
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Ghi chú
          </label>
          <textarea
            rows={2}
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="Chi tiết giao dịch (Ví dụ: Ăn trưa bún bò, Mua cà phê sáng...)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
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
