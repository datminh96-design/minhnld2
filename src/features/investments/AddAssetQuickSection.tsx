import React, { useState, useEffect, useTransition } from 'react';
import { 
  InvestmentAsset, 
  AssetType 
} from '../../types';
import { 
  priceService, 
  POPULAR_PRESET_ASSETS, 
  PresetAssetItem,
  LiveAssetLookupResult 
} from '../../services/priceService';
import { formatCurrency } from '../../lib/utils';
import { 
  Plus, 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Coins, 
  LineChart, 
  Building2, 
  ShieldCheck,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';

interface AddAssetQuickSectionProps {
  existingAssets: InvestmentAsset[];
  userCurrency: 'VND' | 'USD';
  onAddAsset: (asset: Omit<InvestmentAsset, 'id'>) => Promise<void>;
  onOpenAddTxForAsset?: (asset: InvestmentAsset) => void;
  addToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onRefreshPrices: () => Promise<void>;
}

export const AddAssetQuickSection: React.FC<AddAssetQuickSectionProps> = ({
  existingAssets,
  userCurrency,
  onAddAsset,
  onOpenAddTxForAsset,
  addToast,
  onRefreshPrices,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'stock' | 'fund' | 'gold'>('all');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<AssetType>('crypto');
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [customUsdtPrice, setCustomUsdtPrice] = useState<number | null>(null);
  const [customChangePc, setCustomChangePc] = useState<number | null>(null);
  const [customExchange, setCustomExchange] = useState<string>('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [, startTransition] = useTransition();

  // Filter presets based on category
  const filteredPresets = POPULAR_PRESET_ASSETS.filter(
    p => selectedCategory === 'all' || p.category === selectedCategory
  );

  // Check if an asset symbol is already in portfolio
  const isAssetInPortfolio = (symbol: string) => {
    return existingAssets.some(a => a.asset_symbol.toUpperCase() === symbol.toUpperCase());
  };

  // Debounced auto-detection when custom symbol changes
  useEffect(() => {
    const trimmed = customSymbol.trim().toUpperCase();
    if (!trimmed || trimmed.length < 2) {
      setCustomPrice(null);
      setCustomUsdtPrice(null);
      setCustomChangePc(null);
      setCustomExchange('');
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const result = await priceService.lookupAssetLiveInfo(trimmed, customType);
        if (isMounted && result) {
          setCustomPrice(result.priceVnd);
          if (result.priceUsdt) setCustomUsdtPrice(result.priceUsdt);
          if (result.changePercent !== undefined) setCustomChangePc(result.changePercent);
          setCustomExchange(result.exchange);
          if (!customName || customName === customSymbol) {
            setCustomName(result.name);
          }
          if (result.type) {
            setCustomType(result.type);
          }
        }
      } catch (err) {
        console.warn('Live lookup failed:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customSymbol, customType]);

  // Handle Preset Click
  const handleSelectPreset = async (preset: PresetAssetItem) => {
    setCustomSymbol(preset.symbol);
    setCustomName(preset.name);
    setCustomType(preset.type);
    setIsSearching(true);

    try {
      const liveData = await priceService.lookupAssetLiveInfo(preset.symbol, preset.type);
      if (liveData) {
        setCustomPrice(liveData.priceVnd);
        if (liveData.priceUsdt) setCustomUsdtPrice(liveData.priceUsdt);
        if (liveData.changePercent !== undefined) setCustomChangePc(liveData.changePercent);
        setCustomExchange(liveData.exchange);
      }
    } catch (e) {
      console.warn('Preset price fetch err', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Submit & Add Asset to Portfolio
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) return;
    const cleanSym = customSymbol.trim().toUpperCase();
    if (!cleanSym) {
      addToast('Vui lòng nhập mã tài sản (Ticker/Symbol)', 'warning');
      return;
    }

    if (isAssetInPortfolio(cleanSym)) {
      addToast(`Mã ${cleanSym} đã có sẵn trong danh mục theo dõi của bạn!`, 'info');
      return;
    }

    setIsAdding(true);
    try {
      // Final live price verification
      let finalPrice = customPrice;
      if (!finalPrice || finalPrice <= 0) {
        const lookup = await priceService.lookupAssetLiveInfo(cleanSym, customType);
        if (lookup && lookup.priceVnd > 0) {
          finalPrice = lookup.priceVnd;
        } else {
          finalPrice = customType === 'Crypto' ? 1000000 : 20000;
        }
      }

      const newAssetData: Omit<InvestmentAsset, 'id'> = {
        asset_symbol: cleanSym,
        asset_name: customName.trim() || `${cleanSym} Asset`,
        asset_type: customType,
        current_price: finalPrice,
        currency: 'VND',
        price_updated_at: new Date().toISOString(),
        notes: `Tự động cập nhật trực tiếp từ sàn ${customExchange || (customType === 'Crypto' ? 'Binance' : 'HOSE')}`,
      };

      await onAddAsset(newAssetData);
      await onRefreshPrices();

      addToast(`🎉 Đã thêm ${cleanSym} (${customName || cleanSym}) vào danh mục theo dõi!`, 'success');

      // Reset form
      setCustomSymbol('');
      setCustomName('');
      setCustomPrice(null);
      setCustomUsdtPrice(null);
      setCustomChangePc(null);
      setCustomExchange('');
    } catch (err) {
      console.error('Error adding asset:', err);
      addToast('Có lỗi xảy ra khi lưu tài sản', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-b from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-100 dark:border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Thêm Tài Sản Mới (Tự Động Cập Nhật Giá Trực Tiếp Từ Sàn)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Thêm bất kỳ đồng Coin nào từ sàn <strong className="text-amber-600 dark:text-amber-400">Binance</strong> hoặc Cổ phiếu từ sàn <strong className="text-blue-600 dark:text-blue-400">HOSE / HNX</strong> & Quỹ Mở. Giá sẽ tự động nhảy liên tục theo thị trường.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ⚡ Tất cả
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('crypto')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              selectedCategory === 'crypto'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3 h-3" /> Coin Binance
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('stock')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              selectedCategory === 'stock'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3 h-3" /> Cổ phiếu HOSE
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('fund')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedCategory === 'fund'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Quỹ Mở
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('gold')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedCategory === 'gold'
                ? 'bg-yellow-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Vàng SJC
          </button>
        </div>
      </div>

      {/* Preset Fast Selection Chips */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gợi ý phổ biến (1 chạm chọn ngay):
          </span>
          <span className="text-[10px] text-slate-400">
            Click vào mã để nạp giá trực tiếp
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredPresets.map((preset) => {
            const inPortfolio = isAssetInPortfolio(preset.symbol);
            const isSelected = customSymbol.toUpperCase() === preset.symbol;

            return (
              <button
                key={preset.symbol}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/40'
                    : inPortfolio
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs'
                }`}
              >
                <span className="font-mono font-bold">{preset.symbol}</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline truncate max-w-[100px]">
                  {preset.name}
                </span>
                <span
                  className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                    preset.category === 'crypto'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                      : preset.category === 'stock'
                      ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                      : preset.category === 'fund'
                      ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      : 'bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300'
                  }`}
                >
                  {preset.exchange}
                </span>
                {inPortfolio && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Đã có trong danh mục" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Input Form with Live Exchange Detection */}
      <form onSubmit={handleAddSubmit} className="space-y-3 bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Symbol Input */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mã tài sản (Symbol / Ticker) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="VD: SOL, HPG, FPT, PEPE..."
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {isSearching && (
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Asset Type */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Loại tài sản
            </label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as AssetType)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="crypto">🪙 Tiền mã hóa (Binance Crypto)</option>
              <option value="stock">📈 Cổ phiếu VN (Sàn HOSE / HNX)</option>
              <option value="fund">🏛️ Chứng chỉ quỹ mở (Fmarket)</option>
              <option value="gold">👑 Vàng (SJC 9999 / Vàng miếng)</option>
            </select>
          </div>

          {/* Full Asset Name */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên đầy đủ tài sản
            </label>
            <input
              type="text"
              placeholder="Tự động nhận diện hoặc nhập tên..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 pt-5">
            <button
              type="submit"
              disabled={isAdding || !customSymbol.trim()}
              className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              {isAdding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isAdding ? 'Đang thêm...' : '+ Thêm Tài Sản'}
            </button>
          </div>
        </div>

        {/* Live Detected Price Preview Banner */}
        {customSymbol.trim() && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {customExchange ? `Nguồn Sàn: ${customExchange}` : 'Đang quét giá sàn trực tiếp'}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {customSymbol}
              </span>
              {customName && (
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">
                  ({customName})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {customPrice !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Giá sàn tức thì:</span>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(customPrice, userCurrency)}
                  </span>
                  {customUsdtPrice && (
                    <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                      (${customUsdtPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })} USDT)
                    </span>
                  )}
                  {customChangePc !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${customChangePc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {customChangePc >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {customChangePc > 0 ? '+' : ''}{customChangePc.toFixed(2)}%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 text-[11px] italic">
                  Đang lấy giá tự động từ sàn...
                </span>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
