import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { InvestmentAsset, InvestmentTxType, InvestmentTransaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { priceService } from '../../services/priceService';
import { ArrowDownLeft, ArrowUpRight, Sparkles, Coins, RefreshCw, DollarSign, Gift, Info, CheckCircle2 } from 'lucide-react';

interface InvestmentTxModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  investmentAssets: InvestmentAsset[];
  selectedAsset?: InvestmentAsset;
  initialAssetId?: string;
  initialUsdtRate?: number;
  onSave: (data: Partial<InvestmentTransaction> & {
    asset_id: string;
    transaction_type: InvestmentTxType;
    dividend_type?: 'cash' | 'stock';
    tx_type?: InvestmentTxType;
    quantity: number;
    units?: number;
    price: number;
    price_per_unit?: number;
    total_amount?: number;
    fee: number;
    transaction_date: string;
    tx_date?: string;
    note?: string;
    notes?: string;
    fee_currency?: 'VND' | 'USDT' | 'BNB';
    exchange_rate?: number;
  }) => Promise<void>;
}

export const InvestmentTxModalForm: React.FC<InvestmentTxModalFormProps> = ({
  isOpen,
  onClose,
  investmentAssets,
  selectedAsset,
  initialAssetId,
  initialUsdtRate = 25400,
  onSave,
}) => {
  const [txType, setTxType] = useState<InvestmentTxType>('buy');
  const [dividendType, setDividendType] = useState<'cash' | 'stock'>('cash');
  const [dividendCalcMode, setDividendCalcMode] = useState<'direct' | 'per_share'>('direct');
  
  const [txAssetId, setTxAssetId] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txQuantity, setTxQuantity] = useState<string>('');
  const [txPrice, setTxPrice] = useState<string>('');
  const [txPriceCurrency, setTxPriceCurrency] = useState<'VND' | 'USDT'>('VND');
  const [txFee, setTxFee] = useState<string>('0');
  const [txFeeCurrency, setTxFeeCurrency] = useState<'VND' | 'USDT' | 'BNB'>('VND');
  const [txNotes, setTxNotes] = useState<string>('');
  const [usdtRate, setUsdtRate] = useState<number>(initialUsdtRate);
  const [bnbPriceUsdt, setBnbPriceUsdt] = useState<number>(580);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Specific state for cash dividend calculation
  const [cashDividendTotal, setCashDividendTotal] = useState<string>('');
  const [cashDividendPerShare, setCashDividendPerShare] = useState<string>('');
  const [dividendSharesCount, setDividendSharesCount] = useState<string>('');

  const prevIsOpenRef = React.useRef(false);

  // Current selected asset object
  const currentAsset = useMemo(() => {
    return investmentAssets.find((a) => a.id === txAssetId) || selectedAsset;
  }, [investmentAssets, txAssetId, selectedAsset]);

  // Sync state ONLY when modal transitions from closed to open
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpening) {
      const selectedId = selectedAsset?.id || initialAssetId || investmentAssets[0]?.id || '';
      setTxAssetId(selectedId);
      setTxType('buy');
      setDividendType('cash');
      setDividendCalcMode('direct');
      setTxDate(new Date().toISOString().split('T')[0]);
      setTxQuantity('');
      setTxFee('0');
      setTxNotes('');
      setCashDividendTotal('');
      setCashDividendPerShare('');
      setDividendSharesCount('');

      const selected = investmentAssets.find((a) => a.id === selectedId) || selectedAsset;
      if (selected) {
        const isCrypto =
          selected.asset_type === 'crypto' ||
          selected.asset_symbol === 'BTC' ||
          selected.asset_symbol === 'ETH';
        setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
        setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
        setTxPrice(selected.current_price?.toString() || '');
      } else {
        setTxPriceCurrency('VND');
        setTxFeeCurrency('VND');
        setTxPrice('');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialAssetId, selectedAsset, investmentAssets]);

  const handleAssetChange = async (newAssetId: string) => {
    setTxAssetId(newAssetId);
    const selected = investmentAssets.find((a) => a.id === newAssetId);
    if (selected) {
      const isCrypto =
        selected.asset_type === 'crypto' ||
        selected.asset_symbol === 'BTC' ||
        selected.asset_symbol === 'ETH';
      setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
      setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
      if (isCrypto) {
        try {
          const [liveUsdt, liveBnb] = await Promise.all([
            priceService.fetchCryptoPriceUSDT(selected.asset_symbol),
            priceService.fetchCryptoPriceUSDT('BNB'),
          ]);
          if (liveUsdt) setTxPrice(liveUsdt.toString());
          if (liveBnb) setBnbPriceUsdt(liveBnb);
        } catch {
          setTxPrice(selected.current_price.toString());
        }
      } else {
        setTxPrice(selected.current_price.toString());
      }
    }
  };

  const calculatedValues = useMemo(() => {
    const rawF = parseFloat(txFee) || 0;
    let feeVnd = rawF;
    if (txFeeCurrency === 'USDT') feeVnd = rawF * usdtRate;
    else if (txFeeCurrency === 'BNB') feeVnd = rawF * bnbPriceUsdt * usdtRate;

    // 1. Dividend Logic
    if (txType === 'dividend') {
      if (dividendType === 'cash') {
        let grossCash = 0;
        if (dividendCalcMode === 'direct') {
          grossCash = parseFloat(cashDividendTotal) || 0;
        } else {
          const count = parseFloat(dividendSharesCount) || 0;
          const perShare = parseFloat(cashDividendPerShare) || 0;
          grossCash = count * perShare;
        }

        const grossCashVnd = txPriceCurrency === 'USDT' ? grossCash * usdtRate : grossCash;
        const netCashVnd = Math.max(0, grossCashVnd - feeVnd);
        const netCashUsdt = netCashVnd / (usdtRate || 25400);

        return {
          rawQty: 0,
          rawP: grossCashVnd,
          rawF,
          priceVnd: grossCashVnd,
          feeVnd,
          totalVnd: netCashVnd,
          totalUsdt: netCashUsdt,
          isCashDividend: true,
          netCashVnd,
        };
      } else {
        // Stock dividend (thưởng cổ phiếu / token, giá vốn 0đ)
        const rawQty = parseFloat(txQuantity) || 0;
        const totalVnd = feeVnd;
        const totalUsdt = feeVnd / (usdtRate || 25400);

        return {
          rawQty,
          rawP: 0,
          rawF,
          priceVnd: 0,
          feeVnd,
          totalVnd,
          totalUsdt,
          isCashDividend: false,
          netCashVnd: 0,
        };
      }
    }

    // 2. Regular Buy / Sell Logic
    const rawQty = parseFloat(txQuantity) || 0;
    const rawP = parseFloat(txPrice) || 0;
    const priceVnd = txPriceCurrency === 'USDT' ? rawP * usdtRate : rawP;
    const totalVnd = rawQty * priceVnd + (txType === 'buy' ? feeVnd : -feeVnd);
    const totalUsdt = totalVnd / (usdtRate || 25400);

    return {
      rawQty,
      rawP,
      rawF,
      priceVnd,
      feeVnd,
      totalVnd: Math.max(0, totalVnd),
      totalUsdt: Math.max(0, totalUsdt),
      isCashDividend: false,
      netCashVnd: 0,
    };
  }, [
    txType,
    dividendType,
    dividendCalcMode,
    cashDividendTotal,
    cashDividendPerShare,
    dividendSharesCount,
    txQuantity,
    txPrice,
    txFee,
    txPriceCurrency,
    txFeeCurrency,
    usdtRate,
    bnbPriceUsdt,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAssetId) return;

    const { rawQty, priceVnd, feeVnd, totalVnd, isCashDividend } = calculatedValues;

    if (txType === 'dividend' && isCashDividend) {
      if (priceVnd <= 0) return;
    } else {
      if (rawQty <= 0) return;
    }

    setIsSubmitting(true);
    try {
      const savePromise = onSave({
        asset_id: txAssetId,
        transaction_type: txType,
        dividend_type: txType === 'dividend' ? dividendType : undefined,
        tx_type: txType,
        quantity: isCashDividend ? 0 : rawQty,
        units: isCashDividend ? 0 : rawQty,
        price: isCashDividend ? priceVnd : priceVnd,
        price_per_unit: isCashDividend ? priceVnd : priceVnd,
        total_amount: isCashDividend ? totalVnd : totalVnd,
        fee: feeVnd,
        transaction_date: txDate,
        tx_date: txDate,
        note: txNotes || (txType === 'dividend' ? (dividendType === 'cash' ? 'Nhận cổ tức tiền mặt (tính vào chốt lời)' : 'Nhận cổ tức cổ phiếu/thưởng') : ''),
        notes: txNotes || (txType === 'dividend' ? (dividendType === 'cash' ? 'Nhận cổ tức tiền mặt (tính vào chốt lời)' : 'Nhận cổ tức cổ phiếu/thưởng') : ''),
        fee_currency: txFeeCurrency,
        usdt_rate: usdtRate,
        exchange_rate: txPriceCurrency === 'USDT' ? usdtRate : 1,
      });

      // Race with a 2-second timeout to guarantee the modal always closes quickly and never hangs
      await Promise.race([
        savePromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      onClose();
    } catch (err) {
      console.warn('Lỗi khi lưu giao dịch đầu tư:', err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Lệnh Giao Dịch Đầu Tư"
      subtitle={
        txType === 'dividend'
          ? 'Ghi nhận Cổ tức Tiền mặt (tính vào Chốt Lời) hoặc Cổ tức Cổ phiếu (tăng số lượng & giảm giá vốn DCA)'
          : 'Ghi nhận lệnh Mua, Bán hoặc Cổ tức để hệ thống tự tính giá vốn (DCA)'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tx Type Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTxType('buy')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              txType === 'buy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Mua (Buy)
          </button>
          <button
            type="button"
            onClick={() => setTxType('sell')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              txType === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Bán (Sell)
          </button>
          <button
            type="button"
            onClick={() => setTxType('dividend')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === 'dividend' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Cổ tức
          </button>
        </div>

        {/* Specialized Dividend Type Switcher */}
        {txType === 'dividend' && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Chọn hình thức nhận cổ tức:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDividendType('cash')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  dividendType === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Cổ tức Tiền Mặt</span>
                </div>
                <span className={`text-[10px] leading-tight ${dividendType === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  👉 Tính thẳng vào phần Chốt Lời (Realized Profit)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDividendType('stock')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  dividendType === 'stock'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Cổ tức Cổ Phiếu</span>
                </div>
                <span className={`text-[10px] leading-tight ${dividendType === 'stock' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  👉 Thêm cổ phiếu thưởng (Giá 0đ, giảm giá vốn DCA)
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chọn tài sản
            </label>
            <select
              value={txAssetId}
              onChange={(e) => handleAssetChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {investmentAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_symbol} - {a.asset_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngày giao dịch
            </label>
            <input
              type="date"
              required
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Dynamic Fields Based On Transaction Type */}
        {txType === 'dividend' && dividendType === 'cash' ? (
          /* ========================================================================= */
          /* FORM NHẬN CỔ TỨC TIỀN MẶT                                                */
          /* ========================================================================= */
          <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Cách thức nhập số tiền cổ tức
              </label>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDividendCalcMode('direct')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    dividendCalcMode === 'direct'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Nhập tổng tiền
                </button>
                <button
                  type="button"
                  onClick={() => setDividendCalcMode('per_share')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    dividendCalcMode === 'per_share'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Tính theo CP × Đơn giá
                </button>
              </div>
            </div>

            {dividendCalcMode === 'direct' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tổng số tiền cổ tức nhận được
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTxPriceCurrency('VND')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txPriceCurrency === 'VND'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      VND
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxPriceCurrency('USDT')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txPriceCurrency === 'USDT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      USDT
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 60000 hoặc 1500000"
                    value={cashDividendTotal}
                    onChange={(e) => setCashDividendTotal(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txPriceCurrency}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng cổ phiếu nhận cổ tức
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 60"
                    value={dividendSharesCount}
                    onChange={(e) => setDividendSharesCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cổ tức / 1 Cổ phiếu ({txPriceCurrency})
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 1000 (10%)"
                    value={cashDividendPerShare}
                    onChange={(e) => setCashDividendPerShare(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Thuế / Phí khấu trừ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thuế TNCN / Phí khấu trừ ({txPriceCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="VD: 0 hoặc 5%"
                  value={txFee}
                  onChange={(e) => setTxFee(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="Cổ tức tiền mặt đợt 1..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Highlight Realized Profit Boost Card */}
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Tính thẳng vào Lợi Nhuận Đã Chốt Lời:
                </span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Toàn bộ số tiền thực nhận <strong>+{formatCurrency(calculatedValues.totalVnd, 'VND')}</strong> sẽ được cộng trực tiếp vào mục <strong>Lợi Nhuận Đã Chốt Lời (Realized Profit)</strong> của mã <strong>{currentAsset?.asset_symbol || 'tài sản'}</strong> và tổng danh mục. Số lượng cổ phiếu nắm giữ không bị thay đổi.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FORM MUA, BÁN HOẶC CỔ TỨC CỔ PHIẾU                                       */
          /* ========================================================================= */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {txType === 'dividend' ? 'Khối lượng cổ phiếu nhận thêm' : 'Khối lượng / Số lượng'}
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0.00000001"
                  placeholder="VD: 0.5 hoặc 100"
                  value={txQuantity}
                  onChange={(e) => setTxQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {txType === 'dividend' ? 'Đơn giá nhận (0đ)' : 'Đơn giá khớp lệnh'}
                  </label>
                  {txType !== 'dividend' && (
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          if (txPriceCurrency === 'VND' && parseFloat(txPrice) > 0) {
                            setTxPrice((parseFloat(txPrice) / usdtRate).toFixed(2));
                          }
                          setTxPriceCurrency('USDT');
                        }}
                        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          txPriceCurrency === 'USDT'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        USDT
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (txPriceCurrency === 'USDT' && parseFloat(txPrice) > 0) {
                            setTxPrice(Math.round(parseFloat(txPrice) * usdtRate).toString());
                          }
                          setTxPriceCurrency('VND');
                        }}
                        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          txPriceCurrency === 'VND'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        VND
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required={txType !== 'dividend'}
                    disabled={txType === 'dividend'}
                    step="any"
                    min="0"
                    placeholder={txType === 'dividend' ? '0 đ (Cổ phiếu thưởng)' : txPriceCurrency === 'USDT' ? 'VD: 68500' : 'VD: 1740000000'}
                    value={txType === 'dividend' ? '0' : txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txPriceCurrency}
                  </span>
                </div>
                {txPriceCurrency === 'USDT' && parseFloat(txPrice) > 0 && txType !== 'dividend' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ≈ {formatCurrency((parseFloat(txPrice) || 0) * usdtRate, 'VND')} (Tỷ giá: {usdtRate.toLocaleString('vi-VN')} đ)
                  </span>
                )}
              </div>
            </div>

            {txType === 'dividend' && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <Gift className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Nhận thêm <strong>+{calculatedValues.rawQty} cổ phiếu {currentAsset?.asset_symbol}</strong> với giá vốn 0đ. Hệ thống sẽ tự động cộng vào số lượng nắm giữ và <strong>kéo giảm giá vốn bình quân (DCA)</strong>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phí giao dịch
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('BNB')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'BNB'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Phí trả bằng BNB (giảm 25% trên Binance)"
                    >
                      BNB
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('USDT')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'USDT'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('VND')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'VND'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      VND
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={txFeeCurrency === 'BNB' ? 'VD: 0.0015' : txFeeCurrency === 'USDT' ? 'VD: 1.5' : 'VD: 15000'}
                    value={txFee}
                    onChange={(e) => setTxFee(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txFeeCurrency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="Giao dịch sàn Binance / SSI..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </>
        )}

        {/* Optional Exchange Rate Config for Crypto */}
        {(txPriceCurrency === 'USDT' || txFeeCurrency === 'USDT' || txFeeCurrency === 'BNB') && (
          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Tỷ giá quy đổi quy về VNĐ:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1">
                1 USDT ={' '}
                <input
                  type="number"
                  value={usdtRate}
                  onChange={(e) => setUsdtRate(parseFloat(e.target.value) || 25400)}
                  className="w-16 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 text-right"
                />{' '}
                đ
              </span>
              {txFeeCurrency === 'BNB' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  1 BNB = ${bnbPriceUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
                  <button
                    type="button"
                    onClick={async () => {
                      const p = await priceService.fetchCryptoPriceUSDT('BNB');
                      if (p) setBnbPriceUsdt(p);
                    }}
                    className="p-0.5 text-amber-600 hover:text-amber-800 dark:text-amber-400 cursor-pointer"
                    title="Làm mới giá BNB trực tiếp"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live total calculated */}
        <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
          txType === 'dividend' && dividendType === 'cash'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60'
            : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-900/60'
        }`}>
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
            <span>
              {txType === 'dividend' && dividendType === 'cash'
                ? '💵 Tiền cổ tức thực nhận (Cộng thẳng vào Chốt Lời):'
                : 'Tổng thanh toán (VNĐ):'}
            </span>
            <span className={`text-base font-display ${
              txType === 'dividend' && dividendType === 'cash'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-purple-700 dark:text-purple-300'
            }`}>
              {formatCurrency(calculatedValues.totalVnd, 'VND')}
            </span>
          </div>
          {txPriceCurrency === 'USDT' && (
            <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-medium">
              <span>Quy đổi USDT:</span>
              <span>
                ≈ ${calculatedValues.totalUsdt.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USDT
              </span>
            </div>
          )}
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
              txType === 'dividend' && dividendType === 'cash'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : txType === 'dividend' && dividendType === 'cash' ? 'Ghi Nhận Cổ Tức Tiền Mặt' : 'Ghi Nhận Lệnh'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
