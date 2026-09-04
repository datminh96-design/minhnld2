import React, { useState, useEffect, useMemo } from 'react';
import { 
  technicalAnalysisService, 
  Asset4HAnalysis, 
  TradeLevel,
  get4HCycleInfo
} from '../../services/technicalAnalysisService';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle, 
  Target, 
  ShieldCheck, 
  BarChart2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  Zap,
  Info,
  Timer,
  CheckCircle2
} from 'lucide-react';

interface Props {
  holdings: Array<{
    asset: { id: string; asset_symbol: string; asset_name: string; asset_type: string; current_price: number };
    averageCost: number;
    currentQuantity: number;
    profitPercentage: number;
    totalInvested: number;
    currentValue: number;
  }>;
  userCurrency: string;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TechnicalAnalysis4HSection: React.FC<Props> = ({
  holdings,
  userCurrency,
  addToast,
}) => {
  const [analyses, setAnalyses] = useState<Record<string, Asset4HAnalysis>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  
  // 4H Timer & Cycle Tracking
  const [cycleInfo, setCycleInfo] = useState(() => get4HCycleInfo());
  const [countdownText, setCountdownText] = useState<string>('');
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem('app_4h_analysis_last_run');
    return saved ? parseInt(saved, 10) : Date.now();
  });

  // Load analyses function
  const runAnalysis = async (forceRefresh: boolean = false) => {
    if (!holdings || holdings.length === 0) return;

    setIsLoading(true);
    const results: Record<string, Asset4HAnalysis> = {};

    try {
      for (const h of holdings) {
        const res = await technicalAnalysisService.analyzeAsset(h, 25400, forceRefresh);
        results[res.symbol] = res;
      }
      setAnalyses(results);

      // Auto select first holding if not selected
      if (!selectedSymbol || !results[selectedSymbol]) {
        const defaultSymbol = holdings[0]?.asset.asset_symbol.toUpperCase() || '';
        setSelectedSymbol(defaultSymbol);
      }

      const now = Date.now();
      setLastUpdatedTimestamp(now);
      localStorage.setItem('app_4h_analysis_last_run', now.toString());
      setCycleInfo(get4HCycleInfo(new Date(now)));

      if (forceRefresh) {
        addToast(`Đã cập nhật phân tích kỹ thuật 4H (Khung ${get4HCycleInfo().cycleStartHour})!`, 'success');
      }
    } catch (err) {
      console.error('Error running 4H technical analysis:', err);
      addToast('Không thể cập nhật phân tích kỹ thuật', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate live countdown to the next 4H cycle and auto-run when cycle expires
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const currentCycle = get4HCycleInfo(new Date());
      setCycleInfo(currentCycle);

      const diff = Math.max(0, currentCycle.nextCycleTimestamp - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );

      // If 4 hours (14,400,000 ms) passed since last run, auto-run
      const fourHoursMs = 4 * 60 * 60 * 1000;
      if (now - lastUpdatedTimestamp >= fourHoursMs && !isLoading) {
        console.log('[4H Auto Runner] 4 hours elapsed. Running automatic 4H cycle analysis...');
        runAnalysis(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedTimestamp, isLoading]);

  useEffect(() => {
    runAnalysis(false);
  }, [holdings]);

  const activeAnalysis = selectedSymbol ? analyses[selectedSymbol] : null;

  // Copy full report
  const handleCopyReport = (analysis: Asset4HAnalysis) => {
    const fullText = `${analysis.summaryReport}\n\n3 ĐIỂM MUA TỐT NHẤT:\n${analysis.buyLevels
      .map(
        (b) =>
          `• ${b.title}: ${
            b.priceUsdt ? `$${b.priceUsdt.toLocaleString()} (~${b.priceVnd.toLocaleString('vi-VN')} đ)` : `${b.priceVnd.toLocaleString('vi-VN')} đ`
          } (${b.expectedPercentFromCurrent > 0 ? '+' : ''}${b.expectedPercentFromCurrent}%) - Tỷ trọng: ${b.allocationPercent}%\n  Lý do: ${b.technicalReason}`
      )
      .join('\n')}\n\n3 ĐIỂM BÁN TỐT NHẤT (CHỐT LỜI):\n${analysis.sellLevels
      .map(
        (s) =>
          `• ${s.title}: ${
            s.priceUsdt ? `$${s.priceUsdt.toLocaleString()} (~${s.priceVnd.toLocaleString('vi-VN')} đ)` : `${s.priceVnd.toLocaleString('vi-VN')} đ`
          } (+${s.expectedPercentFromCurrent}%) - Tỷ trọng: ${s.allocationPercent}%\n  Lý do: ${s.technicalReason}`
      )
      .join('\n')}\n\n${analysis.dcaStrategyAdvice}`;

    navigator.clipboard.writeText(fullText);
    setCopiedSymbol(analysis.symbol);
    addToast(`Đã sao chép báo cáo phân tích 4H mã ${analysis.symbol}!`, 'success');
    setTimeout(() => setCopiedSymbol(null), 2500);
  };

  if (!holdings || holdings.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden transition-all">
      {/* Top Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-slate-900/10 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                  Phân Tích Kỹ Thuật & Dự Báo 4H (AI & Quant)
                </h3>
                
                {/* Explicit 4H Update Time Badge */}
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white shadow-xs flex items-center gap-1.5 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thời gian cập nhật: {cycleInfo.cycleStartHour}</span>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Tự động 4 giờ/lần
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  RSI • MACD • EMA • Bollinger
                </span>
              </div>

              {/* Status bar showing exact cycle timings */}
              <div className="flex items-center gap-3 flex-wrap mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Cập nhật lúc: {cycleInfo.cycleStartHour} (Chi tiết: {cycleInfo.analyzedTimeShort})
                </span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Chu kỳ 4H tiếp theo: <strong className="text-indigo-600 dark:text-indigo-400">{cycleInfo.nextCycleAt}</strong>
                </span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Tự động chạy lại sau: {countdownText}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Đang phân tích...' : 'Làm mới ngay'}</span>
            </button>
          </div>
        </div>

        {/* Asset Quick Switch Pills */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
          {holdings.map((h) => {
            const sym = h.asset.asset_symbol.toUpperCase();
            const analysis = analyses[sym];
            const isSelected = selectedSymbol === sym && viewMode === 'single';
            const isBullish = (analysis?.upProbability || 50) >= 50;

            return (
              <button
                key={h.asset.id}
                type="button"
                onClick={() => {
                  setSelectedSymbol(sym);
                  setViewMode('single');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                }`}
              >
                <span className="font-bold">{sym}</span>
                {analysis && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isSelected
                        ? 'bg-purple-800 text-white'
                        : isBullish
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isBullish ? `↗ ${analysis.upProbability}% Tăng` : `↘ ${analysis.downProbability}% Giảm`}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'all' ? 'single' : 'all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {viewMode === 'all' ? 'Đóng toàn bộ' : 'Xem toàn bộ danh mục'}
          </button>
        </div>
      </div>

      {/* Main Analysis Display Content */}
      <div className="p-5 sm:p-6 space-y-6">
        {isLoading && Object.keys(analyses).length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-3" />
            <p className="text-sm font-medium">Đang tính toán các chỉ báo RSI, MACD, EMA và mô hình nến 4H...</p>
          </div>
        ) : viewMode === 'all' ? (
          /* Render all assets in a compact card grid */
          <div className="space-y-6">
            {(Object.values(analyses) as Asset4HAnalysis[]).map((item) => (
              <AssetAnalysisCard
                key={item.symbol}
                analysis={item}
                userCurrency={userCurrency}
                onCopyReport={() => handleCopyReport(item)}
                isCopied={copiedSymbol === item.symbol}
              />
            ))}
          </div>
        ) : activeAnalysis ? (
          /* Render active selected asset in full rich detail */
          <AssetAnalysisCard
            analysis={activeAnalysis}
            userCurrency={userCurrency}
            onCopyReport={() => handleCopyReport(activeAnalysis)}
            isCopied={copiedSymbol === activeAnalysis.symbol}
          />
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Vui lòng chọn một tài sản để xem chi tiết phân tích 4H.
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-Component: Detailed Analysis Card for a specific Asset
const AssetAnalysisCard: React.FC<{
  analysis: Asset4HAnalysis;
  userCurrency: string;
  onCopyReport: () => void;
  isCopied: boolean;
}> = ({ analysis, userCurrency, onCopyReport, isCopied }) => {
  const isBullish = analysis.upProbability >= 50;
  const isProfitable = analysis.pnlPercent >= 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 space-y-6">
      {/* 1. Header & Position Quick Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              {analysis.symbol}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {analysis.name}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                analysis.primaryTrend === 'TĂNG MẠNH'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : analysis.primaryTrend === 'TĂNG TÍCH LŨY'
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                  : analysis.primaryTrend === 'ĐIỀU CHỈNH GIẢM' || analysis.primaryTrend === 'GIẢM MẠNH'
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {analysis.primaryTrend}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
              Thời gian cập nhật: <strong>{analysis.cycleStartHour}</strong>
            </span>
            <span>•</span>
            <span>Chi tiết: {analysis.analyzedAt}</span>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              Chu kỳ 4H kế tiếp: <strong>{analysis.nextCycleAt}</strong>
            </span>
          </div>
        </div>

        {/* User Holding Metrics Box */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white dark:bg-slate-800/90 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Giá vốn DCA (KDA)</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {formatCurrency(analysis.averageCost, userCurrency)}
            </span>
            {analysis.averageCostUsdt && (
              <span className="text-[10px] text-slate-400 block">
                ≈ ${analysis.averageCostUsdt.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Giá hiện tại (Live)</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {formatCurrency(analysis.currentPrice, userCurrency)}
            </span>
            {analysis.currentPriceUsdt && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block">
                ≈ ${analysis.currentPriceUsdt.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Lợi nhuận hiện tại</span>
            <span
              className={`font-bold font-mono ${
                isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {isProfitable ? '+' : ''}
              {formatPercent(analysis.pnlPercent)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              KL: {analysis.currentQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Forecast Probabilities & Expected Range Gauge */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Xác Suất Xu Hướng & Biên Độ Dự Phóng (Khung 4H)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Mô hình lượng hóa kỹ thuật
          </span>
        </div>

        {/* Visual Probability Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Xác suất TĂNG: {analysis.upProbability}% (Kỳ vọng: +{analysis.expectedUpRange.min}% ~ +{analysis.expectedUpRange.max}%)
            </span>
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Xác suất GIẢM: {analysis.downProbability}% (Rủi ro: -{analysis.expectedDownRange.min}% ~ -{analysis.expectedDownRange.max}%)
            </span>
          </div>

          <div className="w-full h-3.5 bg-rose-100 dark:bg-rose-950/60 rounded-full overflow-hidden flex p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-xs"
              style={{ width: `${analysis.upProbability}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. 3 Best Buy Points & 3 Best Sell Points Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* BUY COLUMN */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 border border-emerald-200 dark:border-emerald-900/50 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-950/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                <Target className="w-3.5 h-3.5" />
              </div>
              <h5 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                3 Điểm Mua Tốt Nhất (Entry Zones)
              </h5>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Chiến lược Gom Hàng / DCA
            </span>
          </div>

          <div className="space-y-3">
            {analysis.buyLevels.map((lvl) => (
              <div
                key={lvl.levelNumber}
                className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {lvl.levelNumber}
                    </span>
                    {lvl.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    Tỷ trọng: {lvl.allocationPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(lvl.priceVnd, userCurrency)}
                    {lvl.priceUsdt && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                        (${lvl.priceUsdt.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {lvl.expectedPercentFromCurrent > 0 ? '+' : ''}
                    {lvl.expectedPercentFromCurrent}% so với giá hiện tại
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lvl.technicalReason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SELL COLUMN */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 border border-purple-200 dark:border-purple-900/50 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-purple-950/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h5 className="text-xs sm:text-sm font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                3 Điểm Bán Tốt Nhất (Take Profit)
              </h5>
            </div>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
              Chiến lược Khóa Lợi Nhuận
            </span>
          </div>

          <div className="space-y-3">
            {analysis.sellLevels.map((lvl) => (
              <div
                key={lvl.levelNumber}
                className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {lvl.levelNumber}
                    </span>
                    {lvl.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    Chốt: {lvl.allocationPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="font-mono text-sm font-bold text-purple-700 dark:text-purple-400">
                    {formatCurrency(lvl.priceVnd, userCurrency)}
                    {lvl.priceUsdt && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                        (${lvl.priceUsdt.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    +{lvl.expectedPercentFromCurrent}% so với giá hiện tại
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lvl.technicalReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Technical Indicators Matrix Breakdown */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Chi Tiết Các Chỉ Báo Kỹ Thuật (Khung 4H)
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Dữ liệu nến 4 giờ</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* RSI */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">RSI (14)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                {analysis.indicators.rsi14}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  analysis.indicators.rsiSignal === 'Overbought'
                    ? 'bg-amber-100 text-amber-800'
                    : analysis.indicators.rsiSignal === 'Bullish'
                    ? 'bg-emerald-100 text-emerald-800'
                    : analysis.indicators.rsiSignal === 'Oversold'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {analysis.indicators.rsiSignal}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {analysis.indicators.rsi14 > 70 ? 'Cảnh báo vùng quá mua' : analysis.indicators.rsi14 < 30 ? 'Vùng quá bán phục hồi' : 'Động lượng cân bằng'}
            </span>
          </div>

          {/* MACD */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">MACD (12, 26, 9)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                Histo: {analysis.indicators.macd.histogram}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                analysis.indicators.macd.histogram >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600'
              }`}
            >
              {analysis.indicators.macd.trend}
            </span>
          </div>

          {/* EMA */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Hệ EMA (20, 50, 200)</span>
            <div className="mt-1 font-bold text-xs text-slate-900 dark:text-white">
              {analysis.indicators.ema.trend}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Cấu trúc sóng trung hạn
            </span>
          </div>

          {/* Bollinger Bands */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Bollinger Bands (20, 2)</span>
            <div className="mt-1 font-bold text-xs text-slate-900 dark:text-white">
              Biên độ: {analysis.indicators.bollinger.bandWidthPercent}%
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {analysis.indicators.bollinger.bandWidthPercent < 8 ? 'Thắt nút cổ chai (Squeeze)' : 'Đang mở rộng dải sóng'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Text Summary & Strategy Guidance */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Văn Bản Báo Cáo Phân Tích & Chiến Lược Vị Thế Cá Nhân Hóa
            </span>
          </div>

          <button
            type="button"
            onClick={onCopyReport}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép văn bản</span>
              </>
            )}
          </button>
        </div>

        {/* Formatted Text Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
          {analysis.summaryReport}
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200 leading-relaxed font-medium">
          {analysis.dcaStrategyAdvice}
        </div>
      </div>
    </div>
  );
};
