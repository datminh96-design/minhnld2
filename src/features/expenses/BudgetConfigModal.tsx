import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { UserSettings } from '../../types';
import { formatCurrency, numberToVietnameseWords } from '../../lib/utils';
import { ShieldAlert, Sparkles, Check, Bell, Mail, X, Plus } from 'lucide-react';

interface BudgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onSave: (updated: Partial<UserSettings>) => Promise<void>;
}

export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({
  isOpen,
  onClose,
  userSettings,
  onSave,
}) => {
  const [budgetLimit, setBudgetLimit] = useState<number>(userSettings.monthly_budget_limit || 15_000_000);
  const [rawInput, setRawInput] = useState<string>(() => (userSettings.monthly_budget_limit || 15_000_000).toString());
  const [threshold, setThreshold] = useState<number>(userSettings.budget_warning_threshold || 80);
  const [enableAlert, setEnableAlert] = useState<boolean>(userSettings.enable_budget_alert !== false);
  const [enableEmailAlert, setEnableEmailAlert] = useState<boolean>(Boolean(userSettings.enable_email_budget_alert));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const limit = userSettings.monthly_budget_limit || 15_000_000;
      setBudgetLimit(limit);
      setRawInput(limit.toString());
      setThreshold(userSettings.budget_warning_threshold || 80);
      setEnableAlert(userSettings.enable_budget_alert !== false);
      setEnableEmailAlert(Boolean(userSettings.enable_email_budget_alert));
    }
  }, [isOpen, userSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setRawInput('');
      setBudgetLimit(0);
      return;
    }
    const num = Math.min(parseInt(val, 10) || 0, 999_999_999_999);
    setRawInput(val);
    setBudgetLimit(num);
  };

  const handlePresetSelect = (amount: number) => {
    setBudgetLimit(amount);
    setRawInput(amount > 0 ? amount.toString() : '');
  };

  const handleIncrement = (added: number) => {
    const next = Math.max(0, budgetLimit + added);
    setBudgetLimit(next);
    setRawInput(next > 0 ? next.toString() : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        monthly_budget_limit: budgetLimit,
        budget_warning_threshold: threshold,
        enable_budget_alert: enableAlert,
        enable_email_budget_alert: enableEmailAlert,
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
      title="Thiết Lập Ngân Sách Chi Tiêu Tháng"
      subtitle="Quản lý hạn mức chi tiêu và cấu hình cảnh báo tự động"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 leading-relaxed">
            <p className="font-semibold">Hệ thống giám sát chi tiêu tự động:</p>
            <p className="text-slate-600 dark:text-slate-400">
              Hệ thống sẽ liên tục theo dõi mọi khoản chi tiêu trong tháng và ngay lập tức phát cảnh báo khi bạn chạm ngưỡng hoặc vượt hạn mức ngân sách định trước.
            </p>
          </div>
        </div>

        {/* Budget Limit Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Hạn Mức Ngân Sách Tháng ({userSettings.currency})
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              required
              value={rawInput}
              onChange={handleInputChange}
              placeholder="VD: 15000000"
              className="w-full pl-3 pr-12 py-2.5 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              VNĐ
            </span>
          </div>

          {budgetLimit > 0 && (
            <div className="flex flex-col gap-0.5 px-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-emerald-600 dark:text-emerald-300">
                <span>👉 {budgetLimit.toLocaleString('vi-VN')} đ</span>
                <span className="font-normal font-sans italic text-[11px] text-slate-600 dark:text-slate-400">
                  ({numberToVietnameseWords(budgetLimit)})
                </span>
              </div>
            </div>
          )}

          {/* Preset Buttons */}
          <div className="pt-1.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[10px] text-slate-400 font-medium mr-0.5">Mức phổ biến:</span>
              {[5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    budgetLimit === preset
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {preset / 1_000_000}tr
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[10px] text-slate-400 font-medium mr-0.5">Cộng nhanh:</span>
              {[500_000, 1_000_000, 2_000_000, 5_000_000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleIncrement(inc)}
                  className="px-2 py-0.5 rounded-lg font-semibold bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 transition-all cursor-pointer text-[10px] flex items-center gap-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                  {inc >= 1_000_000 ? `${inc / 1_000_000}tr` : `${inc / 1_000}k`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Warning Threshold Selector */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ngưỡng Cảnh Báo Trước (% Ngân sách)
            </label>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
              {threshold}% ({formatCurrency(Math.round((budgetLimit * threshold) / 100), userSettings.currency)})
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[70, 80, 85, 90].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThreshold(t)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  threshold === t
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {t}%
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hệ thống sẽ phát tín hiệu cảnh báo màu vàng khi bạn chi tiêu đạt đến mốc <strong>{threshold}%</strong> ngân sách.
          </p>
        </div>

        {/* Notification Options */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Thông báo cảnh báo trực tiếp trên màn hình
                </p>
                <p className="text-[11px] text-slate-400">
                  Hiển thị banner cảnh báo và thông báo tức thì khi lưu giao dịch
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableAlert}
              onChange={(e) => setEnableAlert(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Gửi email cảnh báo vượt ngân sách
                </p>
                <p className="text-[11px] text-slate-400">
                  Gửi email chi tiết tới hòm thư cá nhân qua hệ thống Resend
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableEmailAlert}
              onChange={(e) => setEnableEmailAlert(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>
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
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Ngân Sách'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
