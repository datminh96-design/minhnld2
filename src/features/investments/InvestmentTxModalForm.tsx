import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { InvestmentAsset, InvestmentTxType } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { priceService } from '../../services/priceService';
import { ArrowDownLeft, ArrowUpRight, Sparkles, Coins, RefreshCw } from 'lucide-react';

interface InvestmentTxModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  investmentAssets: InvestmentAsset[];
  initialAssetId?: string;
  initialUsdtRate?: number;
  onSave: (data: {
    asset_id: string;
    tx_type: InvestmentTxType;
    units: number;
    price_per_unit: number;
    fee: number;
    tx_date: string;
    notes?: string;
    fee_currency?: 'VND' | 'USDT' | 'BNB';
    exchange_rate?: number;
  }) => Promise<void>;
}

export const InvestmentTxModalForm: React.FC<InvestmentTxModalFormProps> = ({
  isOpen,
  onClose,
  investmentAssets,
  initialAssetId,
  initialUsdtRate = 25400,
  onSave,
}) => {
  const [txType, setTxType] = useState<InvestmentTxType>('buy');
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

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const selectedId = initialAssetId || investmentAssets[0]?.id || '';
      setTxAssetId(selectedId);
      setTxType('buy');
      setTxDate(new Date().toISOString().split('T')[0]);
      setTxQuantity('');
      setTxFee('0');
      setTxNotes('');

      const selected = investmentAssets.find((a) => a.id === selectedId);
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
  }, [isOpen, initialAssetId, investmentAssets]);

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
    const rawQty = parseFloat(txQuantity) || 0;
    const rawP = parseFloat(txPrice) || 0;
    const rawF = parseFloat(txFee) || 0;
    const priceVnd = txPriceCurrency === 'USDT' ? rawP * usdtRate : rawP;
    let feeVnd = rawF;
    if (txFeeCurrency === 'USDT') feeVnd = rawF * usdtRate;
    else if (txFeeCurrency === 'BNB') feeVnd = rawF * bnbPriceUsdt * usdtRate;
    const totalVnd = rawQty * priceVnd + feeVnd;
    const totalUsdt = totalVnd / (usdtRate || 25400);

    return { rawQty, rawP, rawF, priceVnd, feeVnd, totalVnd, totalUsdt };
  }, [txQuantity, txPrice, txFee, txPriceCurrency, txFeeCurrency, usdtRate, bnbPriceUsdt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAssetId) return;
    const { rawQty, priceVnd, feeVnd } = calculatedValues;
    if (rawQty <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        asset_id: txAssetId,
        tx_type: txType,
        units: rawQty,
        price_per_unit: priceVnd,
        fee: feeVnd,
        tx_date: txDate,
        notes: txNotes,
        fee_currency: txFeeCurrency,
        exchange_rate: txPriceCurrency === 'USDT' ? usdtRate : 1,
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
      title="Thêm Lệnh Giao Dịch Đầu Tư"
      subtitle="Ghi nhận lệnh Mua, Bán hoặc Cổ tức để hệ thống tự tính giá vốn (DCA)"
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
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              txType === 'dividend' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Cổ tức
          </button>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Khối lượng / Số lượng
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
                Đơn giá khớp lệnh
              </label>
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
            </div>
            <div className="relative">
              <input
                type="number"
                required
                step="any"
                min="0"
                placeholder={txPriceCurrency === 'USDT' ? 'VD: 68500' : 'VD: 1740000000'}
                value={txPrice}
                onChange={(e) => setTxPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                {txPriceCurrency}
              </span>
            </div>
            {txPriceCurrency === 'USDT' && parseFloat(txPrice) > 0 && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                ≈ {formatCurrency((parseFloat(txPrice) || 0) * usdtRate, 'VND')} (Tỷ giá: {usdtRate.toLocaleString('vi-VN')} đ)
              </span>
            )}
          </div>
        </div>

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
            {txFeeCurrency === 'BNB' && parseFloat(txFee) > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                ≈ ${(parseFloat(txFee) * bnbPriceUsdt).toFixed(2)} USDT ≈ {formatCurrency(parseFloat(txFee) * bnbPriceUsdt * usdtRate, 'VND')} (BNB: ${bnbPriceUsdt})
              </span>
            )}
            {txFeeCurrency === 'USDT' && parseFloat(txFee) > 0 && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 block">
                ≈ {formatCurrency(parseFloat(txFee) * usdtRate, 'VND')}
              </span>
            )}
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
        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
            <span>Tổng thanh toán (VNĐ):</span>
            <span className="text-base text-purple-700 dark:text-purple-300 font-display">
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
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Ghi Nhận Lệnh'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
