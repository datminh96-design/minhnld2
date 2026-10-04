import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { formatCurrency, numberToVietnameseWords, isInvestmentTransaction } from '../../lib/utils';
import { getCategoryIconMeta, AVAILABLE_CATEGORY_ICONS } from '../../lib/categoryIcons';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Check, 
  Calendar, 
  Receipt, 
  Tag, 
  FileText, 
  Coins, 
  DollarSign,
  Clock,
  PiggyBank,
  X
} from 'lucide-react';

export interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income' | 'investment';
  onSuccess?: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'expense',
  onSuccess,
}) => {
  const { categories, userSettings, saveTransaction, saveCategory, addToast } = useData();

  const [type, setType] = useState<'expense' | 'income' | 'investment'>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inline Category Creator States
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('ShoppingBag');
  const [newCatColor, setNewCatColor] = useState<string>('#EF4444');
  const [isSavingCategory, setIsSavingCategory] = useState<boolean>(false);

  // Available categories filtered by current type
  const availableCategories = useMemo(() => {
    return categories.filter((c) => {
      if (type === 'investment') {
        return c.type === 'investment' || isInvestmentTransaction(c);
      }
      if (type === 'income') {
        return c.type === 'income';
      }
      return c.type === 'expense' && !isInvestmentTransaction(c);
    });
  }, [categories, type]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setNote('');
      setIsCreatingCategory(false);
      setNewCatName('');

      const matching = categories.filter((c) => {
        if (defaultType === 'investment') return c.type === 'investment' || isInvestmentTransaction(c);
        if (defaultType === 'income') return c.type === 'income';
        return c.type === 'expense' && !isInvestmentTransaction(c);
      });

      if (matching.length > 0) {
        setCategoryName(matching[0].name);
      } else {
        setCategoryName(defaultType === 'income' ? 'Lương' : defaultType === 'investment' ? 'Tích lũy & Đầu tư' : 'Ăn uống');
      }
    }
  }, [isOpen, defaultType, categories]);

  // Quick preset amount additions
  const handleAddPreset = (valueToAdd: number) => {
    const current = parseFloat(amount.replace(/\D/g, '')) || 0;
    const nextVal = current + valueToAdd;
    setAmount(nextVal.toString());
  };

  // Quick category creation
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSavingCategory(true);
    try {
      const meta = getCategoryIconMeta(newCatName.trim(), newCatIcon, newCatColor);
      const created = await saveCategory({
        name: newCatName.trim(),
        type: type === 'investment' ? 'investment' : type,
        icon: meta.iconName,
        color: meta.color,
      });

      if (created && created.name) {
        setCategoryName(created.name);
      } else {
        setCategoryName(newCatName.trim());
      }
      setNewCatName('');
      setIsCreatingCategory(false);
      addToast(`Đã thêm danh mục mới "${newCatName.trim()}"`, 'success');
    } catch (err: any) {
      addToast('Không thể tạo danh mục: ' + err.message, 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Main Submit: Save transaction directly to database via Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(rawNumber) || rawNumber <= 0) {
      addToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'error');
      return;
    }

    if (!categoryName.trim()) {
      addToast('Vui lòng chọn danh mục giao dịch.', 'error');
      return;
    }

    const matchedCategory = categories.find((c) => c.name === categoryName);

    setIsSubmitting(true);
    try {
      await saveTransaction({
        transaction_type: type === 'investment' ? 'investment' : type,
        amount: rawNumber,
        category_name: categoryName.trim(),
        category_id: matchedCategory?.id,
        note: note.trim(),
        transaction_date: date || new Date().toISOString().split('T')[0],
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast('Lỗi lưu giao dịch lên Supabase: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericAmount = parseFloat(amount.replace(/\D/g, '')) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        type === 'income' 
          ? 'Thêm Khoản Thu Nhập Mới' 
          : type === 'investment' 
          ? 'Thêm Khoản Tích Lũy & Đầu Tư (Nằm Riêng)' 
          : 'Thêm Khoản Chi Tiêu Sinh Hoạt'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Transaction Type Toggle (3 Tabs: Chi tiêu vs Tích lũy & Đầu tư vs Thu nhập) */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              const expenseCats = categories.filter((c) => c.type === 'expense' && !isInvestmentTransaction(c));
              if (expenseCats.length > 0) setCategoryName(expenseCats[0].name);
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Chi Tiêu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('investment');
              const investCats = categories.filter((c) => c.type === 'investment' || isInvestmentTransaction(c));
              if (investCats.length > 0) setCategoryName(investCats[0].name);
              else setCategoryName('Tích lũy & Đầu tư');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'investment'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Tích Lũy / Đầu Tư</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('income');
              const incomeCats = categories.filter((c) => c.type === 'income');
              if (incomeCats.length > 0) setCategoryName(incomeCats[0].name);
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Thu Nhập</span>
          </button>
        </div>

        {/* 2. Amount Input & Quick Increment Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className={`w-4 h-4 ${type === 'income' ? 'text-emerald-500' : type === 'investment' ? 'text-blue-500' : 'text-rose-500'}`} />
              Số tiền ({userSettings.currency || 'VND'}) <span className="text-rose-500">*</span>
            </label>
            {numericAmount > 0 && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {numberToVietnameseWords(numericAmount)}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              required
              autoFocus
              inputMode="numeric"
              value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setAmount(clean);
              }}
              placeholder="0"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-2xl font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-right pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">
              {userSettings.currency || 'VND'}
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 mr-1">Cộng nhanh:</span>
            {[
              { label: '+50k', val: 50000 },
              { label: '+100k', val: 100000 },
              { label: '+200k', val: 200000 },
              { label: '+500k', val: 500000 },
              { label: '+1tr', val: 1000000 },
              { label: '+2tr', val: 2000000 },
              { label: '+5tr', val: 5000000 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAddPreset(preset.val)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
            {numericAmount > 0 && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-100 transition-all ml-auto"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* 3. Category Selector & Quick Icon */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              Danh mục {type === 'income' ? 'thu nhập' : type === 'investment' ? 'tích lũy & đầu tư' : 'chi tiêu'} <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Thêm danh mục
            </button>
          </div>

          {/* Inline Category Creator Panel */}
          {isCreatingCategory && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tạo danh mục mới
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Tên danh mục (ví dụ: Mua chứng chỉ quỹ, Tiết kiệm...)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateCategory}
                  disabled={!newCatName.trim() || isSavingCategory}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  {isSavingCategory ? 'Lưu...' : 'Thêm'}
                </button>
              </div>
            </div>
          )}

          {/* Grid of Categories with Icons */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {availableCategories.map((cat) => {
              const meta = getCategoryIconMeta(cat.name, cat.icon, cat.color);
              const Icon = meta.Icon;
              const isSelected = categoryName === cat.name;

              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => setCategoryName(cat.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-xs truncate font-medium ${
                    isSelected ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Date & Note Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Ngày giao dịch
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" /> Ghi chú (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Mua cổ phiếu HPG, Gửi tiết kiệm 6 tháng..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* 5. Footer Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || numericAmount <= 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : type === 'investment'
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang lưu vào Supabase...' : 'Lưu Giao Dịch'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
