import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Heart,
  Sparkles,
  Coffee,
  Gift,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  Building2,
  Wallet,
  PartyPopper,
  Check,
  Zap,
  Smile
} from 'lucide-react';
import { payosClient, PayOSPaymentLinkData } from '../../lib/payosClient';
import { useData } from '../../context/DataContext';

interface PayOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  defaultDescription?: string;
  onPaymentSuccess?: (paymentData: any) => void;
}

interface DonationTier {
  amount: number;
  icon: string;
  title: string;
  badge?: string;
}

const DONATION_TIERS: DonationTier[] = [
  { amount: 20000, icon: '☕', title: 'Ly Cà Phê', badge: 'Nhẹ nhàng' },
  { amount: 50000, icon: '🧋', title: 'Ly Trà Sữa', badge: 'Phổ biến' },
  { amount: 100000, icon: '🍕', title: 'Bữa Ăn Ngon', badge: 'Được yêu thích' },
  { amount: 200000, icon: '🎁', title: 'Món Quà Ý Nghĩa', badge: 'Động viên' },
  { amount: 500000, icon: '🌟', title: 'Tiếp Lửa Đam Mê', badge: 'Đồng hành' },
  { amount: 1000000, icon: '👑', title: 'Nhà Tài Trợ Vàng', badge: 'Đặc biệt' },
];

export const PayOSModal: React.FC<PayOSModalProps> = ({
  isOpen,
  onClose,
  defaultAmount = 50000,
  defaultDescription = 'Gui tien cho Nguyen Le Dat Minh',
  onPaymentSuccess,
}) => {
  const { addTransaction, addToast } = useData();

  const [step, setStep] = useState<'create' | 'payment' | 'success'>('create');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customAmountText, setCustomAmountText] = useState<string>(
    defaultAmount ? defaultAmount.toLocaleString('vi-VN') : '50.000'
  );
  const [description, setDescription] = useState<string>(defaultDescription);
  const [donorName, setDonorName] = useState<string>('');
  const [donorMessage, setDonorMessage] = useState<string>('Chúc bạn luôn tràn đầy năng lượng & thành công!');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment Link Response
  const [paymentData, setPaymentData] = useState<PayOSPaymentLinkData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes countdown
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  // Initialize or reset state only when transitioning from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep('create');
      setAmount(defaultAmount);
      setCustomAmountText(defaultAmount ? defaultAmount.toLocaleString('vi-VN') : '50.000');
      setDescription(defaultDescription);
      setErrorMessage(null);
      setPaymentData(null);
      setTimeLeft(600);
    } else if (!isOpen && prevIsOpenRef.current) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle ESC key and Body Scroll Lock separately without affecting user inputs
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Polling logic when payment data is active
  useEffect(() => {
    if (step === 'payment' && paymentData?.orderCode) {
      pollingTimerRef.current = setInterval(async () => {
        try {
          const info = await payosClient.getOrderInfo(paymentData.orderCode);
          if (info && (info.status === 'PAID' || info.status === 'SUCCESS')) {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            handlePaidSuccess(info);
          } else if (info && info.status === 'CANCELLED') {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            setErrorMessage('Giao dịch thanh toán đã bị hủy.');
          }
        } catch (e) {
          // Ignore polling network glitches
        }
      }, 3000);

      const countdownTimer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        clearInterval(countdownTimer);
      };
    }
  }, [step, paymentData]);

  const handleAmountChange = (valStr: string) => {
    const rawNumber = parseInt(valStr.replace(/\D/g, ''), 10) || 0;
    setAmount(rawNumber);
    setCustomAmountText(rawNumber ? rawNumber.toLocaleString('vi-VN') : '');
  };

  const handleSelectTier = (tierAmount: number) => {
    setAmount(tierAmount);
    setCustomAmountText(tierAmount.toLocaleString('vi-VN'));
  };

  const handleAddAmount = (addVal: number) => {
    const nextVal = (amount || 0) + addVal;
    setAmount(nextVal);
    setCustomAmountText(nextVal.toLocaleString('vi-VN'));
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 2000) {
      setErrorMessage('Số tiền quyên góp tối thiểu là 2,000 VNĐ');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await payosClient.createPaymentLink({
        amount,
        description: description || 'Gui tien cho Nguyen Le Dat Minh',
        buyerName: donorName || 'Nhà hảo tâm',
      });

      if (res.success && res.data) {
        setPaymentData(res.data);
        setStep('payment');
        setTimeLeft(600);
      } else {
        throw new Error('Không nhận được dữ liệu từ PayOS');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi tạo mã thanh toán PayOS. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaidSuccess = (info: any) => {
    setStep('success');
    addToast(`Cảm ơn bạn đã quyên góp ${amount.toLocaleString('vi-VN')} đ cho Nguyễn Lê Đạt Minh!`, 'success');

    // Auto record transaction to system as Income/Donation
    try {
      addTransaction({
        type: 'income',
        amount: amount,
        category: 'Thu Nhập Khác',
        description: `Quyên góp ủng hộ VietQR #${paymentData?.orderCode || ''} (${donorName ? `từ ${donorName}` : 'Ẩn danh'})`,
        date: new Date().toISOString().substring(0, 10),
      });
    } catch (err) {
      console.warn('Lỗi ghi tự động giao dịch:', err);
    }

    if (onPaymentSuccess) {
      onPaymentSuccess(info);
    }
  };

  const handleManualCheckStatus = async () => {
    if (!paymentData?.orderCode) return;
    setIsCheckingStatus(true);
    try {
      const info = await payosClient.getOrderInfo(paymentData.orderCode);
      if (info && (info.status === 'PAID' || info.status === 'SUCCESS')) {
        handlePaidSuccess(info);
      } else {
        addToast(`Trạng thái: ${info?.status || 'Chưa nhận được giao dịch'}. Hệ thống đang liên tục kiểm tra...`, 'info');
      }
    } catch (err: any) {
      addToast(err?.message || 'Chưa thể kiểm tra trạng thái.', 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentData?.orderCode) {
      setStep('create');
      return;
    }
    try {
      await payosClient.cancelPaymentLink(paymentData.orderCode, 'Người dùng hủy quyên góp');
      addToast('Đã hủy giao dịch', 'info');
    } catch (e) {
      // ignore
    }
    setStep('create');
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    addToast(`Đã sao chép ${fieldName}`, 'success');
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // VietQR Quick Image URL fallback
  const vietQrImageUrl = paymentData
    ? `https://img.vietqr.io/image/${paymentData.bin || '970422'}-${paymentData.accountNumber}-compact2.png?amount=${paymentData.amount}&addInfo=${encodeURIComponent(paymentData.description)}&accountName=${encodeURIComponent(paymentData.accountName || 'NGUYEN LE DAT MINH')}`
    : '';

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Fullscreen Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
          />

          {/* Centered Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Recipient Profile Banner */}
            <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-indigo-500/10 dark:from-rose-950/30 dark:via-pink-950/20 dark:to-indigo-950/30 overflow-hidden shrink-0">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-rose-500/25">
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white animate-pulse" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] text-white">
                      ✓
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base font-display">
                        Quyên Góp & Ủng Hộ
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Sparkles className="w-3 h-3" /> VietQR PayOS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <span>Gửi tới:</span>
                      <strong className="text-slate-900 dark:text-slate-200 font-semibold">
                        Nguyễn Lê Đạt Minh
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Prominent Close Button ('X') */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all cursor-pointer shrink-0"
                  title="Đóng bảng quyên góp (Esc hoặc nhấp ra ngoài)"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: CREATE DONATION ================= */}
          {step === 'create' && (
            <form onSubmit={handleCreatePayment} className="space-y-4">
              {/* Meaningful Donation Tiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-rose-500" />
                    Chọn mức ủng hộ ý nghĩa
                  </label>
                  <span className="text-[11px] text-slate-400">VietQR tức thì 24/7</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {DONATION_TIERS.map((tier) => {
                    const isSelected = amount === tier.amount;
                    return (
                      <button
                        key={tier.amount}
                        type="button"
                        onClick={() => handleSelectTier(tier.amount)}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30 border-rose-500 dark:border-rose-500 shadow-sm shadow-rose-500/10 ring-2 ring-rose-500/20'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50'
                        }`}
                      >
                        {tier.badge && (
                          <span
                            className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {tier.badge}
                          </span>
                        )}
                        <div className="text-lg mb-0.5">{tier.icon}</div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {tier.amount.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                          {tier.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Input with Quick Add Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hoặc nhập số tiền tùy tâm (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAmountText}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Ví dụ: 100,000"
                    className="w-full pl-4 pr-14 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold text-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-lg">
                    VNĐ
                  </span>
                </div>
                {/* Quick Add Chips */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-400 shrink-0">Cộng thêm:</span>
                  {[10000, 20000, 50000, 100000, 500000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAddAmount(inc)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                    >
                      +{inc >= 1000 ? `${inc / 1000}k` : inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer Note / Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung chuyển tiền
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gui tien cho Nguyen Le Dat Minh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Mặc định: <strong className="text-slate-600 dark:text-slate-300">Gui tien cho Nguyen Le Dat Minh</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tự động gắn mã chuẩn VietQR</span>
                </p>
              </div>

              {/* Donor Name & Message */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên của bạn / Biệt danh
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Ví dụ: Bạn bè / Ẩn danh"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lời nhắn gửi trao
                  </label>
                  <input
                    type="text"
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    placeholder="Lời chúc ý nghĩa..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Mã VietQR động tạo qua PayOS đảm bảo an toàn, chính xác số tiền & nội dung 100%.</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || amount < 2000}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-700 hover:via-pink-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo mã VietQR quyên góp...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Tạo Mã VietQR Quyên Góp ({amount.toLocaleString('vi-VN')} đ)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= STEP 2: VIETQR DISPLAY & TRANSFER DETAILS ================= */}
          {step === 'payment' && paymentData && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Countdown & Live Detection Status Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-indigo-500/10 border border-rose-200 dark:border-rose-900/50 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                  <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>Hết hạn: <strong className="font-mono text-rose-600 dark:text-rose-400">{formattedTime}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Đang dò nhận giao dịch...</span>
                </div>
              </div>

              {/* Modern VietQR Code Presentation */}
              <div className="relative flex flex-col items-center justify-center p-5 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                {/* Glow ring */}
                <div className="absolute inset-0 bg-radial from-rose-500/5 via-transparent to-transparent pointer-events-none" />

                {/* Bank Banner */}
                <div className="flex items-center justify-between w-full mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-extrabold text-[11px] tracking-wider">
                      MBBANK
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-extrabold text-[11px] tracking-wider">
                      VietQR
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Napas247 Tức Thì
                  </span>
                </div>

                {/* QR Image */}
                <div className="relative p-2 bg-white rounded-2xl shadow-md border border-slate-200/80 group">
                  <img
                    src={vietQrImageUrl}
                    alt="Mã VietQR Quyên Góp"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 rounded-2xl border-2 border-rose-500/20 pointer-events-none" />
                </div>

                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-3 text-center">
                  Mở App Ngân hàng bất kỳ hoặc Ví điện tử quét mã QR để chuyển nhanh
                </p>
              </div>

              {/* Bank Details Breakdown Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                {/* Account Name */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">Người nhận:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1">
                    {paymentData.accountName || 'NGUYEN LE DAT MINH'}
                    <span className="text-[10px] text-emerald-500">✓</span>
                  </span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white text-sm">
                    <span>{paymentData.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentData.accountNumber, 'Số tài khoản')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tài khoản' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">Số tiền ủng hộ:</span>
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 text-sm">
                    <span>{paymentData.amount.toLocaleString('vi-VN')} đ</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(paymentData.amount), 'Số tiền')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tiền' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <span className="bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      {paymentData.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentData.description, 'Nội dung chuyển khoản')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'Nội dung chuyển khoản' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {paymentData.checkoutUrl && (
                  <a
                    href={paymentData.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Mở trang thanh toán cổng PayOS (Trình duyệt)</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={isCheckingStatus}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra kết quả</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUCCESS CELEBRATION ================= */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/30 animate-bounce">
                  <Heart className="w-10 h-10 fill-white text-white" />
                </div>
                <div className="absolute -top-1 -right-1 text-2xl">✨</div>
                <div className="absolute -bottom-1 -left-1 text-2xl">💖</div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                  Cảm Ơn Tấm Lòng Của Bạn!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn đã quyên góp thành công <strong className="text-rose-600 dark:text-rose-400 font-bold">{amount.toLocaleString('vi-VN')} đ</strong> cho <strong className="text-slate-900 dark:text-white">Nguyễn Lê Đạt Minh</strong>. Sự ủng hộ của bạn là nguồn động lực vô cùng quý giá!
                </p>
              </div>

              {/* Receipt Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-rose-200/60 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    #{paymentData?.orderCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Người gửi:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {donorName || 'Nhà hảo tâm ẩn danh'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nội dung:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {paymentData?.description}
                  </span>
                </div>
                <div className="flex justify-between border-t border-rose-100 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ NHẬN THÀNH CÔNG (PAID)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
