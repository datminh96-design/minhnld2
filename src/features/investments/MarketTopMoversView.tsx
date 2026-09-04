import React, { useState } from 'react';
import { 
  MarketTopMoversReport, 
  AssetMoverItem 
} from '../../services/technicalAnalysisService';
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Coins, 
  Building2, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Layers,
  Info,
  Globe
} from 'lucide-react';

interface Props {
  moversReport: MarketTopMoversReport | null;
  isLoading: boolean;
  onRefresh: () => void;
  activeModel?: string;
}

type FilterTab = 'all' | 'crypto' | 'stock' | 'gainers' | 'losers';

export const MarketTopMoversView: React.FC<Props> = ({
  moversReport,
  isLoading,
  onRefresh,
  activeModel = 'gemini-3.8-flash',
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const cryptoGainers = moversReport?.cryptoGainers || [];
  const cryptoLosers = moversReport?.cryptoLosers || [];
  const stockGainers = moversReport?.stockGainers || [];
  const stockLosers = moversReport?.stockLosers || [];

  const showCryptoGainers = filterTab === 'all' || filterTab === 'crypto' || filterTab === 'gainers';
  const showCryptoLosers = filterTab === 'all' || filterTab === 'crypto' || filterTab === 'losers';
  const showStockGainers = filterTab === 'all' || filterTab === 'stock' || filterTab === 'gainers';
  const showStockLosers = filterTab === 'all' || filterTab === 'stock' || filterTab === 'losers';

  const renderMoverCard = (item: AssetMoverItem, rank: number, isGain: boolean) => {
    const isCrypto = item.category === 'crypto';
    const rankColor = rank === 1 
      ? isGain ? 'bg-amber-400 text-amber-950 font-black shadow-xs' : 'bg-rose-500 text-white font-black shadow-xs'
      : rank === 2 
      ? isGain ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold' : 'bg-rose-400 text-white font-bold'
      : rank === 3 
      ? isGain ? 'bg-amber-600 text-white font-bold' : 'bg-rose-300 text-rose-950 font-bold'
      : isGain ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold';

    const cardBorder = isGain
      ? 'border-emerald-200/70 dark:border-emerald-900/50 bg-white dark:bg-slate-900/90 hover:border-emerald-400 dark:hover:border-emerald-700'
      : 'border-rose-200/70 dark:border-rose-900/50 bg-white dark:bg-slate-900/90 hover:border-rose-400 dark:hover:border-rose-700';

    return (
      <div
        key={`${item.category}-${item.symbol}-${rank}`}
        className={`p-3 rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-xs space-y-2 ${cardBorder}`}
      >
        {/* Header: Rank, Symbol, Name, Price & Change */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${rankColor}`}
            >
              #{rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-wide">
                  {item.symbol}
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase">
                  {isCrypto ? 'Crypto' : 'Cổ Phiếu VN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] sm:max-w-[200px]">
                {item.name}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
              {item.priceFormatted}
            </div>
            <div
              className={`inline-flex items-center gap-0.5 font-mono font-bold text-[11px] tabular-nums px-2 py-0.2 rounded-full mt-0.5 ${
                isGain
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{isGain ? `+${Math.abs(item.changePercent).toFixed(2)}%` : `-${Math.abs(item.changePercent).toFixed(2)}%`}</span>
            </div>
          </div>
        </div>

        {/* Lý do tăng / giảm */}
        <div
          className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
            isGain
              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/40 text-rose-950 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-1">
            <span className="font-bold shrink-0 text-slate-900 dark:text-white">
              {isGain ? '💡 Lý do:' : '⚠️ Lý do:'}
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {item.reason}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-slate-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900 p-3.5 sm:p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/50 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-xs shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Top 5 Tăng & Top 5 Giảm Biến Động Nhất
              </h4>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-2xs">
                Chu kỳ 4H Quốc Tế
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Đồng bộ tự động theo nến 4 giờ UTC (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)</span>
              <span>•</span>
              <span>Phân tích nguyên nhân định lượng & vĩ mô</span>
            </p>
          </div>
        </div>

        {/* Right Tools & Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
          <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Tất Cả
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('crypto')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'crypto'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>Crypto</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('stock')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'stock'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Cổ Phiếu VN</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('gainers')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'gainers'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Tăng</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('losers')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === 'losers'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              <span>Giảm</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Làm mới phân tích biến động thị trường 4H"
          >
            <RefreshCw className={`w-3 h-3 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns (Crypto & Stocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ================= COLUMN 1: CRYPTO ================= */}
        {(filterTab === 'all' || filterTab === 'crypto' || filterTab === 'gainers' || filterTab === 'losers') && (
          <div className="space-y-4">
            {/* Box Crypto Gainers */}
            {showCryptoGainers && (
              <div className="bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-950">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Top 5 Coin Tăng Cao Nhất</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Crypto Gainers
                        </span>
                      </h5>
                    </div>
                  </div>
                  <Coins className="w-3.5 h-3.5 text-emerald-500/60" />
                </div>

                <div className="space-y-2">
                  {cryptoGainers.map((item, idx) => renderMoverCard(item, idx + 1, true))}
                </div>
              </div>
            )}

            {/* Box Crypto Losers */}
            {showCryptoLosers && (
              <div className="bg-white dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-950">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold text-xs">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Top 5 Coin Giảm Sâu Nhất</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                          Crypto Losers
                        </span>
                      </h5>
                    </div>
                  </div>
                  <Coins className="w-3.5 h-3.5 text-rose-500/60" />
                </div>

                <div className="space-y-2">
                  {cryptoLosers.map((item, idx) => renderMoverCard(item, idx + 1, false))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= COLUMN 2: VIETNAMESE STOCKS ================= */}
        {(filterTab === 'all' || filterTab === 'stock' || filterTab === 'gainers' || filterTab === 'losers') && (
          <div className="space-y-4">
            {/* Box Stock Gainers */}
            {showStockGainers && (
              <div className="bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-950">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Top 5 Cổ Phiếu VN Tăng Cao Nhất</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          HOSE / HNX / VN30
                        </span>
                      </h5>
                    </div>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-emerald-500/60" />
                </div>

                <div className="space-y-2">
                  {stockGainers.map((item, idx) => renderMoverCard(item, idx + 1, true))}
                </div>
              </div>
            )}

            {/* Box Stock Losers */}
            {showStockLosers && (
              <div className="bg-white dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-950">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold text-xs">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Top 5 Cổ Phiếu VN Giảm Sâu Nhất</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                          HOSE / HNX / VN30
                        </span>
                      </h5>
                    </div>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-rose-500/60" />
                </div>

                <div className="space-y-2">
                  {stockLosers.map((item, idx) => renderMoverCard(item, idx + 1, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cycle & Sync Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
            <Sparkles className="w-3 h-3" />
            <span>Mô hình:</span> {moversReport?.model || activeModel}
          </span>
          <span>•</span>
          <span className="font-mono">Chu kỳ 4H: {moversReport?.cycleStartHour || '4H UTC'}</span>
          <span>•</span>
          <span className="font-mono">Kế tiếp: {moversReport?.nextCycleAt || '+4 giờ'}</span>
        </div>
        <span className="text-slate-400 font-medium">
          Dữ liệu tự động đồng bộ theo chu kỳ nến 4H quốc tế
        </span>
      </div>
    </div>
  );
};

