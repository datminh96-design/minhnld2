import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  technicalAnalysisService, 
  Asset4HAnalysis, 
  TradeLevel,
  get4HCycleInfo,
  AVAILABLE_GEMINI_MODELS,
  GeminiModelOption,
  MarketTopMoversReport,
  AssetMoverItem
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
  CheckCircle2,
  Bot,
  BrainCircuit,
  Compass,
  Layers,
  ChevronDown,
  Cpu,
  Sliders,
  X,
  Newspaper,
  Flame,
  Globe,
  Coins,
  Building2
} from 'lucide-react';
import { MarketTopMoversView } from './MarketTopMoversView';

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
  const [aiRefreshingSymbol, setAiRefreshingSymbol] = useState<string | null>(null);

  // Sort holdings by highest capital (total invested / current market value) descending from left to right
  const sortedHoldings = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];
    return [...holdings].sort((a, b) => {
      const capA = a.totalInvested || a.currentValue || (a.currentQuantity * (a.asset.current_price || 0)) || 0;
      const capB = b.totalInvested || b.currentValue || (b.currentQuantity * (b.asset.current_price || 0)) || 0;
      return capB - capA;
    });
  }, [holdings]);

  // Gemini Model Selector State (gemini-3.7-flash is recommended for top accuracy)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('preferred_gemini_model');
    if (saved && saved !== 'gemini-2.5-flash' && saved !== 'gemini-3.1-flash-lite') return saved;
    return 'gemini-3.7-flash';
  });
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [customModelText, setCustomModelText] = useState<string>('');
  
  // Top 5 Gainers & Losers (Crypto & VN Stocks) for 4H cycle
  const [moversReport, setMoversReport] = useState<MarketTopMoversReport | null>(null);
  const [isMoversLoading, setIsMoversLoading] = useState<boolean>(false);
  
  // 4H Timer & Cycle Tracking
  const [cycleInfo, setCycleInfo] = useState(() => get4HCycleInfo());
  const [countdownText, setCountdownText] = useState<string>('');
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem('app_4h_analysis_last_run');
    return saved ? parseInt(saved, 10) : Date.now();
  });

  // Track last executed cycle timestamp from localStorage to prevent duplicate AI triggers in the same cycle
  const lastAnalyzedCycleRef = useRef<number>(
    parseInt(localStorage.getItem('app_4h_last_analyzed_cycle') || '0', 10)
  );

  // Holdings Signature to prevent unnecessary re-runs on raw micro price updates
  const holdingsSignature = useMemo(() => {
    if (!sortedHoldings || sortedHoldings.length === 0) return '';
    return sortedHoldings
      .map(
        (h) =>
          `${h.asset.id}_${h.asset.asset_symbol}_${h.currentQuantity}_${h.averageCost}_${h.totalInvested}`
      )
      .join('|');
  }, [sortedHoldings]);

  // Active Model Display Object
  const activeModelOption = useMemo(() => {
    const found = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel);
    if (found) return found;
    return {
      id: selectedModel,
      name: selectedModel,
      badge: 'Tùy chỉnh',
      description: 'Mô hình AI Gemini tùy biến do người dùng thiết lập.',
    };
  }, [selectedModel]);

  // Load analyses function with model support & quota preservation
  const runAnalysis = async (forceRefresh: boolean = false, modelToUse: string = selectedModel) => {
    if (!sortedHoldings || sortedHoldings.length === 0) return;

    if (forceRefresh || Object.keys(analyses).length === 0) {
      setIsLoading(true);
    }
    const results: Record<string, Asset4HAnalysis> = {};

    try {
      const activeSym = selectedSymbol || sortedHoldings[0]?.asset.asset_symbol.toUpperCase() || '';

      // 1. Instantly calculate high-precision quant indicators for all holdings (includeAi: false for lightning speed & 0 token cost)
      const quantPromises = sortedHoldings.map((h) =>
        technicalAnalysisService.analyzeAsset(h, 25400, forceRefresh, modelToUse, false)
      );
      const analysesList = await Promise.all(quantPromises);
      for (const res of analysesList) {
        results[res.symbol] = res;
      }
      setAnalyses((prev) => ({ ...prev, ...results }));

      // Auto select highest capital holding if not selected
      if (!selectedSymbol || !results[selectedSymbol]) {
        setSelectedSymbol(activeSym);
      }

      const now = Date.now();
      const currentCycle = get4HCycleInfo(new Date(now));
      lastAnalyzedCycleRef.current = currentCycle.currentCycleTimestamp;
      localStorage.setItem('app_4h_last_analyzed_cycle', currentCycle.currentCycleTimestamp.toString());
      setLastUpdatedTimestamp(now);
      localStorage.setItem('app_4h_analysis_last_run', now.toString());
      setCycleInfo(currentCycle);

      // 2. Enrich the active/selected holding with Gemini AI in the background
      const targetHolding = sortedHoldings.find((h) => h.asset.asset_symbol.toUpperCase() === activeSym);
      if (targetHolding) {
        setAiRefreshingSymbol(activeSym);
        technicalAnalysisService
          .analyzeAsset(targetHolding, 25400, forceRefresh, modelToUse, true)
          .then((aiRes) => {
            if (aiRes) {
              setAnalyses((prev) => ({ ...prev, [activeSym]: aiRes }));
            }
          })
          .catch((err) => {
            console.warn('Gemini AI enrichment notice:', err);
          })
          .finally(() => {
            setAiRefreshingSymbol(null);
          });
      }

      // 3. Auto-sync top 5 gainers & losers for Crypto and VN Stocks for current 4H cycle
      setIsMoversLoading(true);
      technicalAnalysisService
        .getMarketTopMovers(modelToUse, forceRefresh)
        .then((mReport) => {
          if (mReport) {
            setMoversReport(mReport);
          }
        })
        .catch((mErr) => {
          console.warn('Market movers auto-sync notice:', mErr);
        })
        .finally(() => {
          setIsMoversLoading(false);
        });

      if (forceRefresh) {
        addToast(`Đã hoàn tất phân tích kỹ thuật 4H (${modelToUse})!`, 'success');
      }
    } catch (err) {
      console.error('Error running 4H technical analysis:', err);
      if (forceRefresh) {
        addToast('Không thể cập nhật phân tích kỹ thuật', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('preferred_gemini_model', modelId);
    setShowModelPicker(false);
    addToast(`Đã chọn mô hình ${modelId}. Đang phân tích lại...`, 'info');
    runAnalysis(true, modelId);
  };

  const handleApplyCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customModelText.trim();
    if (!trimmed) {
      addToast('Vui lòng nhập tên mô hình hợp lệ (ví dụ: gemini-3.8-flash)', 'warning');
      return;
    }
    setSelectedModel(trimmed);
    localStorage.setItem('preferred_gemini_model', trimmed);
    setShowModelPicker(false);
    setCustomModelText('');
    addToast(`Đã áp dụng mô hình tùy chỉnh: ${trimmed}!`, 'success');
    runAnalysis(true, trimmed);
  };

  const refreshSingleAssetAi = async (symbol: string) => {
    const holding = sortedHoldings.find((h) => h.asset.asset_symbol.toUpperCase() === symbol.toUpperCase());
    if (!holding) return;

    setAiRefreshingSymbol(symbol);
    try {
      const res = await technicalAnalysisService.analyzeAsset(holding, 25400, true, selectedModel, true);
      setAnalyses((prev) => ({ ...prev, [symbol]: res }));
      addToast(`Đã hoàn tất cố vấn Gemini AI cho mã ${symbol}!`, 'success');
    } catch (e) {
      console.error('Failed to refresh AI analysis:', e);
      addToast(`Không thể cập nhật AI cho mã ${symbol}`, 'error');
    } finally {
      setAiRefreshingSymbol(null);
    }
  };

  const handleRefreshMoversOnly = async () => {
    setIsMoversLoading(true);
    try {
      const res = await technicalAnalysisService.getMarketTopMovers(selectedModel, true);
      setMoversReport(res);
      addToast('Đã cập nhật Top 5 tăng / giảm thị trường (Crypto & VN Stocks)!', 'success');
    } catch (err) {
      console.error('Failed to refresh market movers:', err);
      addToast('Không thể cập nhật danh sách biến động thị trường', 'error');
    } finally {
      setIsMoversLoading(false);
    }
  };

  const [isNewsRefreshing, setIsNewsRefreshing] = useState<boolean>(false);

  const handleRefreshNews = async () => {
    setIsNewsRefreshing(true);
    try {
      const freshNews = await technicalAnalysisService.fetchMarketNews(selectedModel, true);
      setAnalyses((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (next[k]) {
            next[k] = {
              ...next[k],
              geminiInsight: {
                ...(next[k].geminiInsight || {
                  verdict: 'QUAN SÁT',
                  confidence: 80,
                  trendAnalysis: '',
                  keyDrivers: [],
                  customDcaAdvice: '',
                  tacticalBuyNotes: '',
                  tacticalSellNotes: '',
                  summaryReportMarkdown: '',
                }),
                topMarketNews: freshNews,
              },
            };
          }
        }
        return next;
      });
      addToast('Đã cập nhật 5 tin tức thị trường 4H mới nhất!', 'success');
    } catch (e) {
      console.error('Failed to refresh news:', e);
      addToast('Không thể làm mới tin tức, đang dùng bản lưu tạm.', 'warning');
    } finally {
      setIsNewsRefreshing(false);
    }
  };

  // Helper when user selects a tab - trigger AI fetch if not already enhanced
  const handleSelectAssetTab = (sym: string) => {
    setSelectedSymbol(sym);
    setViewMode('single');

    const item = analyses[sym];
    if ((!item || !item.isAiEnhanced) && aiRefreshingSymbol !== sym) {
      const holding = sortedHoldings.find((h) => h.asset.asset_symbol.toUpperCase() === sym);
      if (holding) {
        setAiRefreshingSymbol(sym);
        technicalAnalysisService
          .analyzeAsset(holding, 25400, false, selectedModel, true)
          .then((aiRes) => {
            if (aiRes) {
              setAnalyses((prev) => ({ ...prev, [sym]: aiRes }));
            }
          })
          .catch(() => {})
          .finally(() => {
            setAiRefreshingSymbol(null);
          });
      }
    }
  };

  // Calculate live countdown to the next 4H cycle and auto-run strictly according to the 4H schedule roadmap
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const currentCycle = get4HCycleInfo(new Date());

      setCycleInfo((prev) => {
        if (prev.currentCycleTimestamp !== currentCycle.currentCycleTimestamp) {
          return currentCycle;
        }
        return prev;
      });

      const diff = Math.max(0, currentCycle.nextCycleTimestamp - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );

      // Auto-run strictly when the 4H cycle slot shifts to a new scheduled roadmap window
      if (
        lastAnalyzedCycleRef.current !== 0 &&
        currentCycle.currentCycleTimestamp > lastAnalyzedCycleRef.current &&
        !isLoading
      ) {
        lastAnalyzedCycleRef.current = currentCycle.currentCycleTimestamp;
        localStorage.setItem('app_4h_last_analyzed_cycle', currentCycle.currentCycleTimestamp.toString());
        console.log('[4H Roadmap Auto Runner] Triggering scheduled 4H cycle analysis for slot:', currentCycle.cycleStartHour);
        runAnalysis(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Run initial analysis or when holdings actual content updates
  useEffect(() => {
    if (!holdingsSignature) return;
    const currentCycle = get4HCycleInfo(new Date());
    const savedCycle = parseInt(localStorage.getItem('app_4h_last_analyzed_cycle') || '0', 10);
    if (savedCycle === currentCycle.currentCycleTimestamp) {
      lastAnalyzedCycleRef.current = currentCycle.currentCycleTimestamp;
    }
    runAnalysis(false);
  }, [holdingsSignature]);

  const activeAnalysis = selectedSymbol ? analyses[selectedSymbol] : null;

  // Sorted list of analyses matching sortedHoldings
  const sortedAnalysesList = useMemo(() => {
    return sortedHoldings
      .map((h) => analyses[h.asset.asset_symbol.toUpperCase()])
      .filter((a): a is Asset4HAnalysis => Boolean(a));
  }, [sortedHoldings, analyses]);

  // Copy full report
  const handleCopyReport = (analysis: Asset4HAnalysis) => {
    let newsSectionText = '';
    if (analysis.geminiInsight?.topMarketNews && analysis.geminiInsight.topMarketNews.length > 0) {
      newsSectionText = `\n\n📰 5 TIN TỨC QUAN TRỌNG MỚI NHẤT TÁC ĐỘNG TỚI GIÁ (CRYPTO & CK VN):\n` +
        analysis.geminiInsight.topMarketNews
          .map(
            (n, idx) =>
              `${idx + 1}. ${n.title} (Nguồn: ${n.source || 'Tổng hợp'})\n   • Tác động tới: ${n.impactedAssets?.join(', ')} [${n.impactType}]\n   • Đánh giá: ${n.impactSummary}`
          )
          .join('\n');
    }

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
      .join('\n')}\n\n${analysis.dcaStrategyAdvice}${newsSectionText}`;

    navigator.clipboard.writeText(fullText);
    setCopiedSymbol(analysis.symbol);
    addToast(`Đã sao chép báo cáo phân tích 4H & 5 tin tức thị trường mã ${analysis.symbol}!`, 'success');
    setTimeout(() => setCopiedSymbol(null), 2500);
  };

  if (!holdings || holdings.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden transition-all">
      {/* Top Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-slate-900/10 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                  Phân Tích Kỹ Thuật & Dự Báo 4H (AI & Quant)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Chu kỳ 4H Quốc Tế (UTC)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  RSI • MACD • EMA • Bollinger
                </span>
              </div>

              {/* Single Consolidated 4H Cycle Status Line */}
              <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Cập nhật: <span className="text-purple-900 dark:text-purple-100 font-bold">{cycleInfo.cycleStartHour}</span>
                </span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Kế tiếp: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{cycleInfo.nextCycleAt}</strong>
                </span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 shrink-0" /> Đóng nến sau: {countdownText}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
            {/* Model Selector Button */}
            <button
              type="button"
              onClick={() => setShowModelPicker(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-100/90 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900/90 border border-purple-300 dark:border-purple-700/80 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none whitespace-nowrap"
              title="Đổi mô hình Gemini AI"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Mô hình: <strong className="text-purple-900 dark:text-purple-100">{activeModelOption.name}</strong></span>
              <ChevronDown className="w-3 h-3 text-purple-500" />
            </button>

            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-80 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none whitespace-nowrap"
              title="Làm mới ngay phân tích kỹ thuật 4H"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Asset Quick Switch Pills - Sorted by Highest Capital from Left */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {sortedHoldings.map((h) => {
            const sym = h.asset.asset_symbol.toUpperCase();
            const analysis = analyses[sym];
            const isSelected = selectedSymbol === sym && viewMode === 'single';
            const isBullish = (analysis?.upProbability || 50) >= 50;

            return (
              <button
                key={h.asset.id}
                type="button"
                onClick={() => handleSelectAssetTab(sym)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
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
                    {isBullish ? `↗ ${analysis.upProbability}%` : `↘ ${analysis.downProbability}%`}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'all' ? 'single' : 'all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            {viewMode === 'all' ? 'Đóng toàn bộ' : 'Xem toàn bộ'}
          </button>
        </div>
      </div>

      {/* Main Analysis Display Content */}
      <div className="p-4 sm:p-5 space-y-5">
        {isLoading && Object.keys(analyses).length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-3" />
            <p className="text-sm font-medium">Đang tính toán các chỉ báo RSI, MACD, EMA và mô hình nến 4H...</p>
          </div>
        ) : viewMode === 'all' ? (
          /* Render all assets in a compact card grid sorted by highest capital */
          <div className="space-y-6">
            {sortedAnalysesList.map((item) => (
              <AssetAnalysisCard
                key={item.symbol}
                analysis={item}
                userCurrency={userCurrency}
                activeModelOption={activeModelOption}
                onOpenModelPicker={() => setShowModelPicker(true)}
                onCopyReport={() => handleCopyReport(item)}
                isCopied={copiedSymbol === item.symbol}
                onRefreshAi={() => refreshSingleAssetAi(item.symbol)}
                isAiRefreshing={aiRefreshingSymbol === item.symbol}
                onRefreshNews={handleRefreshNews}
                isNewsRefreshing={isNewsRefreshing}
              />
            ))}
          </div>
        ) : activeAnalysis ? (
          /* Render active selected asset in full rich detail */
          <AssetAnalysisCard
            analysis={activeAnalysis}
            userCurrency={userCurrency}
            activeModelOption={activeModelOption}
            onOpenModelPicker={() => setShowModelPicker(true)}
            onCopyReport={() => handleCopyReport(activeAnalysis)}
            isCopied={copiedSymbol === activeAnalysis.symbol}
            onRefreshAi={() => refreshSingleAssetAi(activeAnalysis.symbol)}
            isAiRefreshing={aiRefreshingSymbol === activeAnalysis.symbol}
            onRefreshNews={handleRefreshNews}
            isNewsRefreshing={isNewsRefreshing}
          />
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Vui lòng chọn một tài sản để xem chi tiết phân tích 4H.
          </div>
        )}

        {/* Top 5 Gainers & Top 5 Losers Section (Crypto & VN Stocks) - Synchronized with 4H Cycle */}
        <MarketTopMoversView
          moversReport={moversReport}
          isLoading={isMoversLoading}
          onRefresh={handleRefreshMoversOnly}
          activeModel={selectedModel}
        />
      </div>

      {/* Model Selection Modal */}
      {showModelPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Chọn Mô Hình Gemini AI Phân Tích
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lựa chọn hoặc tùy chỉnh mô hình Gemini phù hợp với nhu cầu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModelPicker(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model List */}
            <div className="space-y-2.5">
              {AVAILABLE_GEMINI_MODELS.map((m) => {
                const isCurrent = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-600 ring-2 ring-purple-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {m.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {m.description}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">
                        Model ID: {m.id}
                      </span>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Model Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>Nhập mã mô hình Gemini tùy chỉnh (khi Google có bản mới):</span>
              </label>
              <form onSubmit={handleApplyCustomModel} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: gemini-3.7-flash, gemini-3.9-flash..."
                  value={customModelText}
                  onChange={(e) => setCustomModelText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  Áp dụng
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-Component: Detailed Analysis Card for a specific Asset
const AssetAnalysisCard: React.FC<{
  analysis: Asset4HAnalysis;
  userCurrency: string;
  activeModelOption: GeminiModelOption;
  onOpenModelPicker: () => void;
  onCopyReport: () => void;
  isCopied: boolean;
  onRefreshAi?: () => void;
  isAiRefreshing?: boolean;
  onRefreshNews?: () => void;
  isNewsRefreshing?: boolean;
}> = ({
  analysis,
  userCurrency,
  activeModelOption,
  onOpenModelPicker,
  onCopyReport,
  isCopied,
  onRefreshAi,
  isAiRefreshing,
  onRefreshNews,
  isNewsRefreshing,
}) => {
  const isBullish = analysis.upProbability >= 50;
  const isProfitable = analysis.pnlPercent >= 0;
  const hasAi = !!analysis.geminiInsight;
  const currentModelDisplayName = analysis.geminiInsight?.model || activeModelOption.name;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* 1. Header & Position Quick Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-h-[26px]">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight">
              {analysis.symbol}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {analysis.name}
            </span>
            <span
              className={`px-2 py-0.2 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center ${
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

            {/* AI Supercharged Interactive Badge */}
            <button
              type="button"
              onClick={onOpenModelPicker}
              className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white inline-flex items-center gap-1 shadow-2xs hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
              title="Nhấn để đổi mô hình Gemini AI"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
              <span className="tabular-nums">{currentModelDisplayName}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70 shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.2 rounded border border-purple-200 dark:border-purple-800 whitespace-nowrap text-[11px]">
              Cập nhật: <strong className="font-mono">{analysis.cycleStartHour}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap text-[11px]">
              Kế tiếp: <strong className="font-mono">{analysis.nextCycleAt}</strong>
            </span>
          </div>
        </div>

        {/* User Holding Metrics Box */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/90 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Giá vốn DCA (KDA)</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums text-xs">
              {formatCurrency(analysis.averageCost, userCurrency)}
            </span>
            {analysis.averageCostUsdt && (
              <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                ≈ ${analysis.averageCostUsdt.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Giá hiện tại (Live)</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {formatCurrency(analysis.currentPrice, userCurrency)}
            </span>
            {analysis.currentPriceUsdt && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block font-mono tabular-nums">
                ≈ ${analysis.currentPriceUsdt.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Lợi nhuận vị thế</span>
            <span
              className={`font-bold font-mono tabular-nums text-xs ${
                isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {isProfitable ? '+' : ''}
              {formatPercent(analysis.pnlPercent)}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums truncate max-w-[100px]">
              KL: {analysis.currentQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Gemini AI Deep Intelligence Card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-900/10 via-indigo-900/5 to-slate-900/10 dark:from-purple-950/50 dark:via-indigo-950/40 dark:to-slate-900/60 border border-purple-200 dark:border-purple-800/80 p-3.5 sm:p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-purple-100 dark:border-purple-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Trí Tuệ Nhân Tạo Gemini AI 4H Insight
                </span>
                <button
                  type="button"
                  onClick={onOpenModelPicker}
                  className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-all cursor-pointer flex items-center gap-1 border border-purple-200 dark:border-purple-700/60"
                  title="Nhấn để đổi mô hình Gemini AI"
                >
                  <Cpu className="w-2.5 h-2.5" />
                  <span>{currentModelDisplayName}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {analysis.geminiInsight && (
              <div className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1 shadow-2xs">
                <BrainCircuit className="w-3 h-3 text-indigo-500" />
                <span>Độ tin cậy: {analysis.geminiInsight.confidence}%</span>
              </div>
            )}
            {onRefreshAi && (
              <button
                type="button"
                onClick={onRefreshAi}
                disabled={isAiRefreshing}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-800 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-80 select-none whitespace-nowrap"
                title="Cập nhật lại phân tích AI cho tài sản này"
              >
                <RefreshCw className={`w-3 h-3 shrink-0 ${isAiRefreshing ? 'animate-spin' : ''}`} />
                <span>Cập nhật AI</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Verdict & 3 Key Drivers */}
        {analysis.geminiInsight ? (
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white dark:bg-slate-800/90 p-2.5 sm:p-3 rounded-xl border border-purple-100 dark:border-purple-900/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Khuyến nghị AI:</span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xs">
                  {analysis.geminiInsight.verdict}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {analysis.geminiInsight.keyDrivers?.map((driver, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800/60 flex items-center gap-1"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span>{driver}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* AI Technical Breakdown & Custom DCA Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <Compass className="w-3.5 h-3.5 text-purple-600" />
                  <span>Nhận định Kỹ Thuật 4H (Hỗ trợ & Kháng cự):</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {analysis.geminiInsight.trendAnalysis}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cố vấn Vị thế & DCA Theo Giá Vốn (KDA):</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {analysis.geminiInsight.customDcaAdvice}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-purple-100 dark:border-purple-900/30 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
              <span>Đang tính toán phân tích kỹ thuật 4H và tải dữ liệu mô hình {currentModelDisplayName}...</span>
            </span>
            {onRefreshAi && (
              <button
                type="button"
                onClick={onRefreshAi}
                className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 cursor-pointer shadow-xs"
              >
                Tải lại ngay
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Forecast Probabilities & Expected Range Gauge */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Xác Suất Xu Hướng & Biên Độ Dự Phóng (Khung 4H)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Mô hình lượng hóa kỹ thuật
          </span>
        </div>

        {/* Visual Probability Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5" /> Xác suất TĂNG: {analysis.upProbability}% (Kỳ vọng: +{analysis.expectedUpRange.min}% ~ +{analysis.expectedUpRange.max}%)
            </span>
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
              <TrendingDown className="w-3.5 h-3.5" /> Xác suất GIẢM: {analysis.downProbability}% (Rủi ro: -{analysis.expectedDownRange.min}% ~ -{analysis.expectedDownRange.max}%)
            </span>
          </div>

          <div className="w-full h-3 bg-rose-100 dark:bg-rose-950/60 rounded-full overflow-hidden flex p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-2xs"
              style={{ width: `${analysis.upProbability}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. 3 Best Buy Points & 3 Best Sell Points Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* BUY COLUMN */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-950/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                <Target className="w-3 h-3" />
              </div>
              <h5 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                3 Điểm Mua Tốt Nhất (Entry Zones)
              </h5>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Chiến lược Gom Hàng / DCA
            </span>
          </div>

          <div className="space-y-2">
            {analysis.buyLevels.map((lvl) => (
              <div
                key={lvl.levelNumber}
                className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {lvl.levelNumber}
                    </span>
                    {lvl.title}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    Tỷ trọng: {lvl.allocationPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="font-mono text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(lvl.priceVnd, userCurrency)}
                    {lvl.priceUsdt && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                        (${lvl.priceUsdt.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
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
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-purple-200 dark:border-purple-900/50 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-purple-950/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <h5 className="text-xs sm:text-sm font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                3 Điểm Bán Tốt Nhất (Take Profit)
              </h5>
            </div>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
              Chiến lược Khóa Lợi Nhuận
            </span>
          </div>

          <div className="space-y-2">
            {analysis.sellLevels.map((lvl) => (
              <div
                key={lvl.levelNumber}
                className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {lvl.levelNumber}
                    </span>
                    {lvl.title}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    Chốt: {lvl.allocationPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="font-mono text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-400">
                    {formatCurrency(lvl.priceVnd, userCurrency)}
                    {lvl.priceUsdt && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                        (${lvl.priceUsdt.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
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
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Chỉ Báo Kỹ Thuật Định Lượng (Khung 4H)
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Dữ liệu nến 4 giờ</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* RSI */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">RSI (14)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
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
              {analysis.indicators.rsi14 > 70 ? 'Cảnh báo quá mua' : analysis.indicators.rsi14 < 30 ? 'Quá bán phục hồi' : 'Động lượng cân bằng'}
            </span>
          </div>

          {/* MACD */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">MACD (12, 26, 9)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
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
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Hệ EMA (20, 50, 200)</span>
            <div className="mt-0.5 font-bold text-xs text-slate-900 dark:text-white">
              {analysis.indicators.ema.trend}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Cấu trúc xu hướng
            </span>
          </div>

          {/* Bollinger Bands */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Bollinger Bands (20, 2)</span>
            <div className="mt-0.5 font-bold text-xs text-slate-900 dark:text-white">
              Biên: {analysis.indicators.bollinger.bandWidthPercent}%
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {analysis.indicators.bollinger.bandWidthPercent < 8 ? 'Thắt nút cổ chai (Squeeze)' : 'Đang mở rộng dải sóng'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Text Summary & Strategy Guidance */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Báo Cáo Phân Tích & Chiến Lược Vị Thế Cá Nhân Hóa
            </span>
          </div>

          <button
            type="button"
            onClick={onCopyReport}
            className="px-2 py-0.5 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 text-xs">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-xs">Sao chép</span>
              </>
            )}
          </button>
        </div>

        {/* Formatted Text Box */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
          {analysis.summaryReport}
        </div>

        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed font-medium">
          {analysis.geminiInsight?.customDcaAdvice
            ? (analysis.geminiInsight.customDcaAdvice.startsWith('🤖')
                ? analysis.geminiInsight.customDcaAdvice
                : `🤖 [Gemini AI Cố Vấn - ${analysis.geminiInsight.model || currentModelDisplayName}]: ${analysis.geminiInsight.customDcaAdvice}`)
            : analysis.dcaStrategyAdvice}
        </div>
      </div>

      {/* 6. Top 5 Key Market News Affecting Crypto & Vietnam Stocks */}
      {analysis.geminiInsight?.topMarketNews && analysis.geminiInsight.topMarketNews.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 sm:p-4 border border-amber-200/80 dark:border-amber-900/50 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-amber-100 dark:border-amber-950/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                <Newspaper className="w-3 h-3" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  <span>5 Tin Tức Quan Trọng Tác Động Tới Giá & Dòng Tiền</span>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.2 rounded-full border border-amber-200 dark:border-amber-800">
                    Crypto & Cổ Phiếu VN
                  </span>
                </h5>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[10px] text-slate-400 font-medium">
                Đồng bộ cùng chu kỳ 4H
              </span>
              {onRefreshNews && (
                <button
                  type="button"
                  onClick={onRefreshNews}
                  disabled={isNewsRefreshing}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Cập nhật 5 tin tức thị trường 4H mới nhất"
                >
                  <RefreshCw className={`w-3 h-3 ${isNewsRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-bold">Làm mới tin tức</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {analysis.geminiInsight.topMarketNews.map((news, idx) => {
              const isBullish = news.impactType === 'BULLISH';
              const isBearish = news.impactType === 'BEARISH';
              const isVolatile = news.impactType === 'VOLATILE';

              const badgeBg = isBullish
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : isBearish
                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : isVolatile
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';

              const badgeLabel = isBullish
                ? '🟢 Tích Cực (Tăng)'
                : isBearish
                ? '🔴 Áp Lực Giảm'
                : isVolatile
                ? '⚡ Biến Động Mạnh'
                : '🟡 Trung Lập';

              return (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/90 text-xs space-y-1.5 hover:border-amber-300 dark:hover:border-amber-800/80 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-amber-500/20 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white leading-snug text-xs">
                        {news.title}
                      </span>
                    </div>

                    {news.source && (
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap self-end sm:self-auto bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                        {news.source}
                      </span>
                    )}
                  </div>

                  {/* Impact Target & Direction Row */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Mã chịu tác động:
                    </span>
                    {news.impactedAssets?.map((assetCode, aIdx) => (
                      <span
                        key={aIdx}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        {assetCode}
                      </span>
                    ))}

                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border sm:ml-auto ${badgeBg}`}
                    >
                      {badgeLabel}
                    </span>
                  </div>

                  {/* News Impact Analysis */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800/90 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
                    💡 <strong>Tác động giá & dòng tiền:</strong> {news.impactSummary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
