import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  InvestmentAsset, 
  InvestmentTransaction, 
  AssetType, 
  InvestmentTxType 
} from '../../types';
import { formatCurrency, formatPercent, formatDateVN } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { priceService, KNOWN_ASSET_NAMES } from '../../services/priceService';
import { AddAssetQuickSection } from './AddAssetQuickSection';
import { TechnicalAnalysis4HSection } from './TechnicalAnalysis4HSection';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  PieChart as PieIcon, 
  BarChart3, 
  Layers, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  History,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

const ALLOC_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#64748B'];

export const InvestmentsView: React.FC = () => {
  const { 
    investmentAssets, 
    investmentTransactions, 
    calculatedHoldings, 
    portfolioSnapshots,
    userSettings, 
    saveInvestmentAsset, 
    deleteInvestmentAsset, 
    saveInvestmentTransaction, 
    deleteInvestmentTransaction,
    refreshMarketPrices, 
    isRefreshingPrices,
    addToast 
  } = useData();

  // State
  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions' | 'charts'>('holdings');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InvestmentAsset | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedAssetForTx, setSelectedAssetForTx] = useState<InvestmentAsset | null>(null);

  // Asset Form States
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [assetPrice, setAssetPrice] = useState('');
  const [assetCurrency, setAssetCurrency] = useState('VND');

  // Tx Form States
  const [txAssetId, setTxAssetId] = useState('');
  const [txType, setTxType] = useState<InvestmentTxType>('buy');
  const [txDate, setTxDate] = useState('2026-09-01');
  const [txQuantity, setTxQuantity] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txPriceCurrency, setTxPriceCurrency] = useState<'VND' | 'USDT'>('VND');
  const [txFee, setTxFee] = useState('0');
  const [txFeeCurrency, setTxFeeCurrency] = useState<'VND' | 'BNB' | 'USDT'>('VND');
  const [usdtRate, setUsdtRate] = useState<number>(25400); // 1 USDT = 25,400 VND
  const [bnbPriceUsdt, setBnbPriceUsdt] = useState<number>(580); // 1 BNB = 580 USDT
  const [txNotes, setTxNotes] = useState('');

  // Holdings Sorting state (Default: Total Invested Descending)
  const [sortField, setSortField] = useState<'totalInvested' | 'currentValue' | 'totalProfit' | 'symbol' | 'currentQuantity' | 'averageCost' | 'currentPrice'>('totalInvested');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleToggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For financial values, default to descending (highest first)
      setSortDirection(field === 'symbol' ? 'asc' : 'desc');
    }
  };

  // Holdings Filtered & Sorted
  const filteredHoldings = useMemo(() => {
    return calculatedHoldings
      .filter((h) => {
        const matchType = assetTypeFilter === 'all' || h.asset.asset_type === assetTypeFilter;
        const matchSearch =
          searchTerm === '' ||
          h.asset.asset_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchType && matchSearch;
      })
      .sort((a, b) => {
        let diff = 0;
        switch (sortField) {
          case 'totalInvested':
            diff = (b.totalInvested || 0) - (a.totalInvested || 0);
            break;
          case 'currentValue':
            diff = (b.currentValue || 0) - (a.currentValue || 0);
            break;
          case 'totalProfit':
            diff = (b.totalProfit || 0) - (a.totalProfit || 0);
            break;
          case 'currentQuantity':
            diff = (b.currentQuantity || 0) - (a.currentQuantity || 0);
            break;
          case 'averageCost':
            diff = (b.averageCost || 0) - (a.averageCost || 0);
            break;
          case 'currentPrice':
            diff = (b.asset.current_price || 0) - (a.asset.current_price || 0);
            break;
          case 'symbol':
            diff = a.asset.asset_symbol.localeCompare(b.asset.asset_symbol);
            break;
          default:
            diff = (b.totalInvested || 0) - (a.totalInvested || 0);
        }
        return sortDirection === 'desc' ? diff : -diff;
      });
  }, [calculatedHoldings, assetTypeFilter, searchTerm, sortField, sortDirection]);

  // Overall Portfolio Stats
  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let currentTotalValue = 0;
    let totalProfit = 0;
    let totalRealizedProfit = 0;

    calculatedHoldings.forEach((h) => {
      totalInvested += h.totalInvested;
      currentTotalValue += h.currentValue;
      totalProfit += h.totalProfit;
      totalRealizedProfit += (h.realizedProfit || 0);
    });

    const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentTotalValue,
      totalProfit,
      totalRealizedProfit,
      profitPercent,
      assetCount: calculatedHoldings.length,
    };
  }, [calculatedHoldings]);

  // Asset Allocation Pie Data
  const allocationPieData = useMemo(() => {
    return calculatedHoldings
      .filter((h) => h.currentValue > 0)
      .map((h) => ({
        name: `${h.asset.asset_symbol} (${h.asset.asset_type === 'crypto' ? 'Crypto' : h.asset.asset_type === 'stock' ? 'Cổ phiếu' : h.asset.asset_type === 'fund' ? 'Quỹ' : h.asset.asset_type === 'gold' ? 'Vàng' : 'Khác'})`,
        value: h.currentValue,
      }));
  }, [calculatedHoldings]);

  // Profit/Loss Bar Chart Data
  const profitBarData = useMemo(() => {
    return calculatedHoldings
      .filter((h) => h.totalInvested > 0)
      .map((h) => ({
        symbol: h.asset.asset_symbol,
        profit: h.totalProfit,
        percent: Number(h.profitPercentage.toFixed(2)),
        invested: h.totalInvested,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [calculatedHoldings]);

  // Open Create Asset Modal
  const handleOpenAddAsset = () => {
    setShowQuickAdd((prev) => !prev);
  };

  // Open Edit Asset Modal
  const handleOpenEditAsset = (asset: InvestmentAsset) => {
    setEditingAsset(asset);
    setAssetSymbol(asset.asset_symbol);
    setAssetName(asset.asset_name);
    setAssetType(asset.asset_type);
    setAssetPrice(asset.current_price.toString());
    setAssetCurrency(asset.currency || 'VND');
    setIsAssetModalOpen(true);
  };

  // Save Asset Form
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(assetPrice.replace(/,/g, ''));
    if (isNaN(numPrice) || numPrice < 0) {
      addToast('Vui lòng nhập giá thị trường hợp lệ', 'warning');
      return;
    }

    const cleanSym = assetSymbol.trim().toUpperCase();
    try {
      await saveInvestmentAsset({
        id: editingAsset ? editingAsset.id : undefined,
        asset_symbol: cleanSym,
        asset_name: assetName.trim() || `${cleanSym} Asset`,
        asset_type: assetType,
        current_price: numPrice,
        currency: assetCurrency,
        price_updated_at: new Date().toISOString(),
      });
      setIsAssetModalOpen(false);
      await refreshMarketPrices();
      addToast(`Đã lưu mã ${cleanSym} với giá thị trường cập nhật tự động!`, 'success');
    } catch (err) {
      console.warn('Cannot save asset:', err);
    }
  };

  // Open Add Transaction Modal
  const handleOpenAddTx = async (asset?: InvestmentAsset) => {
    const defaultAsset = asset || investmentAssets[0];
    if (!defaultAsset) {
      addToast('Vui lòng tạo tài sản đầu tư trước khi thêm giao dịch', 'warning');
      handleOpenAddAsset();
      return;
    }

    setSelectedAssetForTx(defaultAsset);
    setTxAssetId(defaultAsset.id);
    setTxType('buy');
    setTxDate(new Date().toISOString().substring(0, 10));
    setTxQuantity('');
    
    // Default currency logic based on asset type
    const isCrypto = defaultAsset.asset_type === 'crypto' || defaultAsset.asset_symbol === 'BTC' || defaultAsset.asset_symbol === 'ETH';
    setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
    setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
    setTxFee('0');
    setTxNotes('');

    // Fetch live rates if crypto
    if (isCrypto) {
      try {
        const [liveUsdtPrice, liveBnbPrice] = await Promise.all([
          priceService.fetchCryptoPriceUSDT(defaultAsset.asset_symbol),
          priceService.fetchCryptoPriceUSDT('BNB'),
        ]);
        if (liveUsdtPrice) {
          setTxPrice(liveUsdtPrice.toString());
        } else {
          // If asset stored in VND, estimate USDT price
          const estUsdt = defaultAsset.current_price > 1000000 ? defaultAsset.current_price / 25400 : defaultAsset.current_price;
          setTxPrice(estUsdt.toString());
        }
        if (liveBnbPrice) {
          setBnbPriceUsdt(liveBnbPrice);
        }
      } catch {
        setTxPrice(defaultAsset.current_price.toString());
      }
    } else {
      setTxPrice(defaultAsset.current_price.toString());
    }

    setIsTxModalOpen(true);
  };

  // Save Transaction Form
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = parseFloat(txQuantity);
    const rawPrice = parseFloat(txPrice.replace(/,/g, ''));
    const rawFee = parseFloat(txFee.replace(/,/g, '') || '0');

    if (isNaN(numQty) || numQty <= 0 || isNaN(rawPrice) || rawPrice < 0) {
      addToast('Vui lòng nhập số lượng và giá hợp lệ', 'warning');
      return;
    }

    const targetAsset = investmentAssets.find((a) => a.id === txAssetId);
    if (!targetAsset) return;

    // Convert price to VND for standard portfolio accounting
    let priceInVnd = rawPrice;
    if (txPriceCurrency === 'USDT') {
      priceInVnd = rawPrice * usdtRate;
    }

    // Convert fee to VND
    let feeInVnd = rawFee;
    if (txFeeCurrency === 'USDT') {
      feeInVnd = rawFee * usdtRate;
    } else if (txFeeCurrency === 'BNB') {
      feeInVnd = rawFee * bnbPriceUsdt * usdtRate;
    }

    const totalVndAmount = numQty * priceInVnd + feeInVnd;

    await saveInvestmentTransaction({
      asset_id: txAssetId,
      transaction_type: txType,
      transaction_date: txDate,
      quantity: numQty,
      price: priceInVnd,
      price_per_unit: priceInVnd,
      original_price: rawPrice,
      price_currency: txPriceCurrency,
      fee: feeInVnd,
      original_fee: rawFee,
      fee_currency: txFeeCurrency,
      usdt_rate: usdtRate,
      bnb_price_usdt: bnbPriceUsdt,
      total_amount: totalVndAmount,
      note: txNotes,
      notes: txNotes,
    });

    setIsTxModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 3 Main Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Value */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Giá Trị Danh Mục Hiện Tại</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-display">
              {formatCurrency(portfolioSummary.currentTotalValue, userSettings.currency)}
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
              {portfolioSummary.assetCount} tài sản đang nắm giữ
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Invested Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Vốn Đầu Tư (DCA)</p>
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1 font-display">
              {formatCurrency(portfolioSummary.totalInvested, userSettings.currency)}
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
              {investmentTransactions.length} giao dịch mua/bán
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Profit / Loss */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Tổng Lợi Nhuận / Lỗ</p>
            <h3 className={`text-2xl font-bold mt-1 font-display ${portfolioSummary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {portfolioSummary.totalProfit >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalProfit, userSettings.currency)}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-semibold ${portfolioSummary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                Hiệu suất: {formatPercent(portfolioSummary.profitPercent)}
              </span>
              {portfolioSummary.totalRealizedProfit !== 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
                  Đã chốt lời: {portfolioSummary.totalRealizedProfit >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalRealizedProfit, userSettings.currency)}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${portfolioSummary.totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'}`}>
            {portfolioSummary.totalProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Filters, Refresh and Action Buttons */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('holdings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'holdings'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Danh Mục Nắm Giữ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Lịch Sử Giao Dịch
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'charts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Biểu Đồ Danh Mục
            </button>
          </div>

          {/* Action Buttons: Refresh, Add Asset, Add Tx */}
          <div className="flex flex-wrap items-center gap-2">
            <div 
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs"
              title="Tự động cập nhật 5s/lần"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => refreshMarketPrices()}
              disabled={isRefreshingPrices}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
              title="Cập nhật giá thị trường trực tiếp ngay"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrices ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddAsset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> {showQuickAdd ? 'Đóng' : 'Thêm Tài Sản Mới'}
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddTx()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" /> + Giao Dịch Mua/Bán
            </button>
          </div>
        </div>

        {/* Search & Asset Type Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã tài sản (BTC, VCB, SJC...), tên gọi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <select
              value={assetTypeFilter}
              onChange={(e) => setAssetTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả loại tài sản</option>
              <option value="crypto">🪙 Tiền mã hóa (Crypto)</option>
              <option value="stock">📈 Cổ phiếu (Stocks)</option>
              <option value="fund">🏛️ Chứng chỉ quỹ (Funds)</option>
              <option value="gold">👑 Vàng & Kim loại quý</option>
              <option value="other">💎 Tài sản khác</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab 1: Holdings Table */}
      {activeTab === 'holdings' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              {filteredHoldings.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="Chưa có tài sản trong danh mục"
                  description="Bắt đầu quản lý danh mục bằng cách thêm mã tài sản và ghi nhận lệnh mua đầu tiên."
                  action={
                    <button
                      type="button"
                      onClick={handleOpenAddAsset}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-xs"
                    >
                      + Thêm Tài Sản Đầu Tiên
                    </button>
                  }
                />
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold select-none">
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('symbol')}
                          className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Tài sản</span>
                          {sortField === 'symbol' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">Loại</th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('currentQuantity')}
                          className="flex items-center justify-end gap-1 w-full hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Khối lượng</span>
                          {sortField === 'currentQuantity' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('averageCost')}
                          className="flex items-center justify-end gap-1 w-full hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Giá vốn (DCA)</span>
                          {sortField === 'averageCost' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('currentPrice')}
                          className="flex items-center justify-end gap-1 w-full hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Giá hiện tại</span>
                          {sortField === 'currentPrice' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('totalInvested')}
                          className={`flex items-center justify-end gap-1 w-full font-bold cursor-pointer ${
                            sortField === 'totalInvested' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-purple-600 dark:hover:text-purple-400'
                          }`}
                          title="Sắp xếp theo tổng vốn"
                        >
                          <span>Tổng vốn</span>
                          {sortField === 'totalInvested' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('currentValue')}
                          className="flex items-center justify-end gap-1 w-full hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Giá trị thị trường</span>
                          {sortField === 'currentValue' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('totalProfit')}
                          className="flex items-center justify-end gap-1 w-full hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                        >
                          <span>Lợi nhuận / Lỗ</span>
                          {sortField === 'totalProfit' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHoldings.map((h) => {
                      const isProfitable = h.totalProfit >= 0;
                      return (
                        <tr
                          key={h.asset.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center shrink-0 font-display text-xs">
                                {h.asset.asset_symbol.substring(0, 3)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {h.asset.asset_symbol}
                                  </p>
                                  {(() => {
                                    const sym = h.asset.asset_symbol.toUpperCase();
                                    const type = h.asset.asset_type;
                                    const known = KNOWN_ASSET_NAMES[sym];
                                    const exchangeLabel = known?.exchange || (
                                      type === 'crypto' || type === 'crypto' ? 'Binance' :
                                      type === 'stock' || type === 'stock' ? 'HOSE' :
                                      type === 'fund' || type === 'fund' ? 'VinaCapital' :
                                      type === 'gold' || type === 'gold' ? 'SJC 9999' : 'Thị trường'
                                    );
                                    const isCrypto = type === 'crypto' || type === 'crypto' || exchangeLabel === 'Binance';
                                    const isStock = type === 'stock' || type === 'stock' || exchangeLabel === 'HOSE' || exchangeLabel === 'HNX';
                                    const isFund = type === 'fund' || type === 'fund' || exchangeLabel.includes('VinaCapital') || exchangeLabel === 'Fmarket';

                                    return (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                          isCrypto
                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                            : isStock
                                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                            : isFund
                                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                            : 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                        }`}
                                      >
                                        {exchangeLabel}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-[11px] text-slate-400 max-w-[150px] truncate">
                                  {h.asset.asset_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {h.asset.asset_type === 'crypto' ? 'Crypto' : h.asset.asset_type === 'stock' ? 'Cổ phiếu' : h.asset.asset_type === 'fund' ? 'Quỹ' : h.asset.asset_type === 'gold' ? 'Vàng' : 'Khác'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {h.currentQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 6 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            <div>{formatCurrency(h.averageCost, userSettings.currency)}</div>
                            {h.averageCost > 0 && priceService.formatSecondaryUsdt(h.asset, h.averageCost) && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {priceService.formatSecondaryUsdt(h.asset, h.averageCost)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center justify-end gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Giá trực tiếp thị trường" />
                              <span>{formatCurrency(h.asset.current_price, userSettings.currency)}</span>
                            </div>
                            {priceService.formatSecondaryUsdt(h.asset, h.asset.current_price) && (
                              <span className="block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                {priceService.formatSecondaryUsdt(h.asset, h.asset.current_price)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(h.totalInvested, userSettings.currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(h.currentValue, userSettings.currency)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className={`font-bold font-display ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                              {isProfitable ? '+' : ''}{formatCurrency(h.totalProfit, userSettings.currency)}
                            </div>
                            <div className={`text-[10px] font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPercent(h.profitPercentage)}
                            </div>
                            {h.realizedProfit !== 0 && (
                              <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                                Chốt: {h.realizedProfit > 0 ? '+' : ''}{formatCurrency(h.realizedProfit, userSettings.currency, true)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddTx(h.asset)}
                                className="p-1 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                                title="Mua/Bán thêm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAsset(h.asset)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Chỉnh sửa mã tài sản"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteInvestmentAsset(h.asset.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Xóa tài sản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 4H Technical Analysis & AI Quantitative Forecast Section */}
          <TechnicalAnalysis4HSection
            holdings={calculatedHoldings}
            userCurrency={userSettings.currency}
            addToast={addToast}
          />

          {/* Quick Add Asset Section directly under Holdings */}
          {showQuickAdd && (
            <AddAssetQuickSection
              existingAssets={investmentAssets}
              userCurrency={userSettings.currency}
              onAddAsset={async (newAsset) => {
                await saveInvestmentAsset(newAsset);
              }}
              onOpenAddTxForAsset={(asset) => handleOpenAddTx(asset)}
              addToast={addToast}
              onRefreshPrices={refreshMarketPrices}
            />
          )}
        </div>
      )}

      {/* Main Tab 2: Transaction History Table */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {investmentTransactions.length === 0 ? (
              <EmptyState
                icon={History}
                title="Chưa có lịch sử giao dịch"
                description="Các lệnh mua, bán hoặc nhận cổ tức sẽ hiển thị tại đây."
                action={
                  <button
                    type="button"
                    onClick={() => handleOpenAddTx()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-xs"
                  >
                    + Thêm Lệnh Mua / Bán
                  </button>
                }
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Ngày</th>
                    <th className="py-3 px-3">Mã tài sản</th>
                    <th className="py-3 px-3">Lệnh</th>
                    <th className="py-3 px-3 text-right">Số lượng</th>
                    <th className="py-3 px-3 text-right">Đơn giá</th>
                    <th className="py-3 px-3 text-right">Phí giao dịch</th>
                    <th className="py-3 px-4 text-right">Tổng thanh toán</th>
                    <th className="py-3 px-4">Ghi chú</th>
                    <th className="py-3 px-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {investmentTransactions.map((tx) => {
                    const asset = investmentAssets.find((a) => a.id === tx.asset_id);
                    const isBuy = tx.transaction_type === 'buy';
                    const isSell = tx.transaction_type === 'sell';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatDateVN(tx.transaction_date)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {asset?.asset_symbol || 'N/A'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isBuy
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : isSell
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {isBuy ? '🟢 Mua' : isSell ? '🔴 Bán' : '🎁 Cổ tức'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          {tx.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          <div>
                            {tx.price_currency === 'USDT' && tx.original_price ? (
                              <>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  ${tx.original_price.toLocaleString('en-US', { maximumFractionDigits: 4 })} USDT
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  ≈ {formatCurrency(tx.price_per_unit || tx.price || 0, userSettings.currency)}
                                </span>
                              </>
                            ) : (
                              formatCurrency(tx.price_per_unit || tx.price || 0, userSettings.currency)
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-400">
                          <div>
                            {tx.fee_currency === 'BNB' && tx.original_fee ? (
                              <>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {tx.original_fee} BNB
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  ≈ {formatCurrency(tx.fee, userSettings.currency)}
                                </span>
                              </>
                            ) : tx.fee_currency === 'USDT' && tx.original_fee ? (
                              <>
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  ${tx.original_fee} USDT
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  ≈ {formatCurrency(tx.fee, userSettings.currency)}
                                </span>
                              </>
                            ) : (
                              formatCurrency(tx.fee, userSettings.currency)
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(tx.total_amount || 0, userSettings.currency)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                          {tx.notes || tx.note || '--'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => deleteInvestmentTransaction(tx.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Xóa lệnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Main Tab 3: Charts */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Asset Allocation */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Phân Bổ Tỷ Trọng Danh Mục
            </h3>
            <p className="text-xs text-slate-400 mb-4">Tỷ trọng phần trăm từng tài sản trên tổng danh mục</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {allocationPieData.map((_, index) => (
                      <Cell key={`alloc-cell-${index}`} fill={ALLOC_COLORS[index % ALLOC_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val, userSettings.currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Profit/Loss per Asset */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display mb-1">
              Lợi Nhuận Từng Tài Sản
            </h3>
            <p className="text-xs text-slate-400 mb-4">Mức lãi/lỗ tính bằng giá trị tiền tệ</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatCurrency(val, userSettings.currency, true)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, userSettings.currency)} />
                  <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} name="Lợi nhuận" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Asset */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={editingAsset ? 'Chỉnh Sửa Mã Tài Sản' : 'Thêm Mã Tài Sản Mới'}
        subtitle="Quản lý mã cổ phiếu, crypto, vàng hoặc quỹ đầu tư"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mã tài sản (Ticker/Symbol)
              </label>
              <input
                type="text"
                required
                placeholder="VD: BTC, ETH, VCB, SJC..."
                value={assetSymbol}
                onChange={(e) => setAssetSymbol(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loại tài sản
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="crypto">🪙 Crypto</option>
                <option value="stock">📈 Cổ phiếu</option>
                <option value="fund">🏛️ Chứng chỉ quỹ</option>
                <option value="gold">👑 Vàng</option>
                <option value="other">💎 Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên đầy đủ tài sản
            </label>
            <input
              type="text"
              required
              placeholder="VD: Bitcoin, Ethereum, Vietcombank, Vàng SJC 9999..."
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giá thị trường hiện tại ({userSettings.currency})
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="VD: 1550000000"
                value={assetPrice}
                onChange={(e) => setAssetPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Đồng tiền định giá
              </label>
              <select
                value={assetCurrency}
                onChange={(e) => setAssetCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="VND">VND (Việt Nam Đồng)</option>
                <option value="USD">USD (Đô la Mỹ)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
            >
              Lưu Tài Sản
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Investment Transaction (Buy / Sell / Dividend) */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Thêm Lệnh Giao Dịch Đầu Tư"
        subtitle="Ghi nhận lệnh Mua, Bán hoặc Cổ tức để hệ thống tự tính giá vốn (DCA)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTx} className="space-y-4">
          {/* Tx Type Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTxType('buy')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                txType === 'buy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Mua (Buy)
            </button>
            <button
              type="button"
              onClick={() => setTxType('sell')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                txType === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Bán (Sell)
            </button>
            <button
              type="button"
              onClick={() => setTxType('dividend')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
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
                onChange={async (e) => {
                  const newAssetId = e.target.value;
                  setTxAssetId(newAssetId);
                  const selected = investmentAssets.find(a => a.id === newAssetId);
                  if (selected) {
                    const isCrypto = selected.asset_type === 'crypto' || selected.asset_symbol === 'BTC' || selected.asset_symbol === 'ETH';
                    setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
                    setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
                    if (isCrypto) {
                      try {
                        const [liveUsdt, liveBnb] = await Promise.all([
                          priceService.fetchCryptoPriceUSDT(selected.asset_symbol),
                          priceService.fetchCryptoPriceUSDT('BNB')
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
                }}
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
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
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
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
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
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
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
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
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
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
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
                  1 USDT = <input
                    type="number"
                    value={usdtRate}
                    onChange={(e) => setUsdtRate(parseFloat(e.target.value) || 25400)}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 text-right"
                  /> đ
                </span>
                {txFeeCurrency === 'BNB' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    1 BNB = ${bnbPriceUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT (Live Binance)
                    <button
                      type="button"
                      onClick={async () => {
                        const p = await priceService.fetchCryptoPriceUSDT('BNB');
                        if (p) setBnbPriceUsdt(p);
                      }}
                      className="p-0.5 text-amber-600 hover:text-amber-800 dark:text-amber-400"
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
          {(() => {
            const rawQty = parseFloat(txQuantity) || 0;
            const rawP = parseFloat(txPrice) || 0;
            const rawF = parseFloat(txFee) || 0;
            const priceVnd = txPriceCurrency === 'USDT' ? rawP * usdtRate : rawP;
            let feeVnd = rawF;
            if (txFeeCurrency === 'USDT') feeVnd = rawF * usdtRate;
            else if (txFeeCurrency === 'BNB') feeVnd = rawF * bnbPriceUsdt * usdtRate;
            const totalVnd = rawQty * priceVnd + feeVnd;
            const totalUsdt = totalVnd / usdtRate;

            return (
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Tổng thanh toán (VNĐ):</span>
                  <span className="text-base text-purple-700 dark:text-purple-300 font-display">
                    {formatCurrency(totalVnd, 'VND')}
                  </span>
                </div>
                {txPriceCurrency === 'USDT' && (
                  <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                    <span>Quy đổi USDT:</span>
                    <span>≈ ${totalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
            >
              Ghi Nhận Lệnh
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
