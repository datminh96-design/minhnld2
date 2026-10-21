import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import {
  WorkSettings, WorkLog, ExpenseCategory, Transaction, TransactionType,
  InvestmentAsset, InvestmentTransaction, PortfolioSnapshot,
  UserSettings, CloudSyncStatus, ToastMessage, CalculatedAssetHolding,
  MonthlySalaryData, SalaryRecord, BusinessTripExpense, Project,
  TransactionProcessItem, TransactionProcessState, TransactionProcessStep
} from '../types';
import {
  DEFAULT_WORK_SETTINGS,
  DEFAULT_USER_SETTINGS,
  DEFAULT_EXPENSE_CATEGORIES,
  getInitialWorkLogs,
  getInitialTransactions,
  getInitialInvestmentAssets,
  getInitialInvestmentTransactions,
  getInitialPortfolioSnapshots,
  getInitialBusinessTrips,
  getInitialProjects,
} from '../lib/seedData';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { calculateWorkHours, generateUUID, toValidUUID, formatCurrency, calculateInvestmentHoldings, isInvestmentTransaction } from '../lib/utils';
import { priceService } from '../services/priceService';
import { r2Service, R2BackupPayload } from '../services/r2Service';
import { emailService, SendEmailPayload, SendEmailResponse } from '../services/emailService';

interface DataContextType {
  workSettings: WorkSettings;
  workLogs: WorkLog[];
  businessTrips: BusinessTripExpense[];
  categories: ExpenseCategory[];
  transactions: Transaction[];
  investmentAssets: InvestmentAsset[];
  investmentTransactions: InvestmentTransaction[];
  portfolioSnapshots: PortfolioSnapshot[];
  salaryRecords: Record<string, MonthlySalaryData>;
  projects: Project[];
  userSettings: UserSettings;
  calculatedHoldings: CalculatedAssetHolding[];
  toasts: ToastMessage[];
  loadingData: boolean;
  isOnline: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: Date | null;
  syncMessage: string;
  isRefreshingPrices: boolean;
  updateWorkSettings: (newSettings: Partial<WorkSettings>) => Promise<void>;
  saveSalaryRecord: (month: number, year: number, data: MonthlySalaryData, totalWorkedMinutes?: number, totalOvertimeMinutes?: number, silent?: boolean) => Promise<void>;
  getSalaryRecord: (month: number, year: number) => MonthlySalaryData;
  saveWorkLog: (log: Omit<WorkLog, 'id'> & { id?: string }) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;
  getWorkLogsForMonth: (month: number, year: number) => WorkLog[];
  saveBusinessTrip: (trip: Omit<BusinessTripExpense, 'id'> & { id?: string }) => Promise<void>;
  deleteBusinessTrip: (id: string) => Promise<void>;
  toggleBusinessTripPayment: (id: string) => Promise<void>;
  saveTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCategory: (cat: Omit<ExpenseCategory, 'id'> & { id?: string }) => Promise<ExpenseCategory>;
  deleteCategory: (id: string) => Promise<void>;
  saveInvestmentAsset: (asset: Omit<InvestmentAsset, 'id'> & { id?: string }) => Promise<void>;
  updateAssetPrice: (assetId: string, newPrice: number) => Promise<void>;
  deleteInvestmentAsset: (id: string) => Promise<void>;
  saveInvestmentTransaction: (tx: Omit<InvestmentTransaction, 'id'> & { id?: string }) => Promise<void>;
  deleteInvestmentTransaction: (id: string) => Promise<void>;
  saveProject: (project: Omit<Project, 'id'> & { id?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshMarketPrices: (silent?: boolean, skipCloudSave?: boolean) => Promise<void>;
  takeDailySnapshot: (totalValue: number, totalCost: number) => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  addToast: (message: string, type?: ToastMessage['type'], title?: string) => void;
  removeToast: (id: string) => void;
  clearAllData: () => void;
  resetToSampleData: () => void;
  syncWithSupabase: (showToast?: boolean) => Promise<void>;
  triggerCloudBackup: (silent?: boolean) => Promise<void>;
  backupToCloudflareR2: () => Promise<boolean>;
  restoreFromCloudflareR2: (key: string) => Promise<boolean>;
  sendTransactionalEmailNotification: (payload: SendEmailPayload) => Promise<SendEmailResponse>;
  txProcessLogs: TransactionProcessItem[];
  activeTxProcess: TransactionProcessItem | null;
  retryTransactionSync: (processId: string) => Promise<void>;
  clearTxProcessLogs: () => void;
  dismissActiveTxProcess: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const validateAndSanitizeTransaction = (raw: any, existing?: Transaction): Transaction | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || existing?.id;
  if (!id || typeof id !== 'string') return null;
  
  const amountNum = Number(raw.amount !== undefined ? raw.amount : existing?.amount);
  if (isNaN(amountNum) || amountNum < 0) return null;

  let txType: TransactionType = 'expense';
  const rawType = raw.transaction_type || raw.type || existing?.transaction_type;
  if (rawType === 'income' || rawType === 'expense' || rawType === 'investment') {
    txType = rawType;
  } else if (
    (raw.notes && typeof raw.notes === 'string' && raw.notes.includes('[TX_TYPE_INVESTMENT]')) ||
    (raw.note && typeof raw.note === 'string' && raw.note.includes('[TX_TYPE_INVESTMENT]')) ||
    raw.category_name === 'Tích lũy & Đầu tư' ||
    raw.category_name === 'Tiết kiệm ngân hàng' ||
    raw.category_name === 'Chứng khoán & Quỹ' ||
    raw.category_name === 'Vàng & Kim loại quý'
  ) {
    txType = 'investment';
  }

  let note = raw.note !== undefined ? (raw.note === null ? undefined : String(raw.note)) : existing?.note;
  if (note && note.includes('[TX_TYPE_INVESTMENT]')) {
    note = note.replace(/\[TX_TYPE_INVESTMENT\]/g, '').trim() || undefined;
  }

  const txDate = raw.transaction_date || existing?.transaction_date || new Date().toISOString().split('T')[0];
  const catId = (raw.category_id && typeof raw.category_id === 'string' && raw.category_id.length > 0) 
    ? raw.category_id 
    : (existing?.category_id || undefined);
  
  const catName = raw.category_name !== undefined 
    ? String(raw.category_name) 
    : (existing?.category_name || '');

  const createdAt = raw.created_at || existing?.created_at || new Date().toISOString();
  const updatedAt = raw.updated_at || new Date().toISOString();

  return {
    id,
    user_id: raw.user_id || existing?.user_id,
    transaction_date: txDate,
    amount: amountNum,
    transaction_type: txType,
    category_id: catId,
    category_name: catName,
    note,
    created_at: createdAt,
    updated_at: updatedAt
  };
};

interface AssetPriceCacheEntry {
  current_price: number;
  price_updated_at: string;
}

const ASSET_PRICE_CACHE_KEY = 'app_investment_asset_prices';

const isUuidString = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

const parseSafeTime = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return isNaN(t) ? 0 : t;
};

const readAssetPriceCache = (): Record<string, AssetPriceCacheEntry> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ASSET_PRICE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const forceUpdateAssetPriceCache = (
  entries: { id?: string; symbol?: string; current_price: number; price_updated_at?: string }[]
) => {
  if (typeof window === 'undefined' || !entries.length) return;
  try {
    const cache = readAssetPriceCache();
    const nowIso = new Date().toISOString();
    entries.forEach((e) => {
      const price = Number(e.current_price);
      if (isNaN(price) || price <= 0) return;
      const updatedAt = e.price_updated_at || nowIso;
      const item: AssetPriceCacheEntry = { current_price: price, price_updated_at: updatedAt };
      if (e.id) cache[`id:${e.id}`] = item;
      if (e.symbol) cache[`sym:${e.symbol.trim().toUpperCase()}`] = item;
    });
    localStorage.setItem(ASSET_PRICE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const pickNewestPriceCandidate = (
  candidates: { price?: number | null; updatedAt?: string | null; priority?: number }[]
): { current_price: number; price_updated_at: string } => {
  let bestPrice = 0;
  let bestTime = -1;
  let bestIso = '';
  let bestPriority = -1;

  for (const c of candidates) {
    const p = Number(c.price) || 0;
    if (p <= 0) continue;
    const t = parseSafeTime(c.updatedAt);
    const prio = c.priority ?? 0;
    if (t > bestTime || (t === bestTime && prio > bestPriority)) {
      bestPrice = p;
      bestTime = t;
      bestIso = c.updatedAt || '';
      bestPriority = prio;
    }
  }

  return {
    current_price: bestPrice,
    price_updated_at: bestIso || new Date().toISOString(),
  };
};

const applyCachedPricesToAssets = (assets: InvestmentAsset[]): InvestmentAsset[] => {
  if (!Array.isArray(assets) || assets.length === 0) return assets;
  const cache = readAssetPriceCache();
  return assets.map((asset) => {
    const symKey = `sym:${(asset.asset_symbol || '').trim().toUpperCase()}`;
    const idKey = `id:${asset.id}`;
    const byId = cache[idKey];
    const bySym = cache[symKey];
    const best = pickNewestPriceCandidate([
      { price: asset.current_price, updatedAt: asset.price_updated_at, priority: 1 },
      { price: byId?.current_price, updatedAt: byId?.price_updated_at, priority: 3 },
      { price: bySym?.current_price, updatedAt: bySym?.price_updated_at, priority: 2 },
    ]);
    if (best.current_price > 0) {
      return {
        ...asset,
        current_price: best.current_price,
        price_updated_at: best.price_updated_at,
      };
    }
    return asset;
  });
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isDemoUser } = useAuth();
  const userRef = useRef(user);
  const isDemoUserRef = useRef(isDemoUser);
  useEffect(() => {
    userRef.current = user;
    isDemoUserRef.current = isDemoUser;
  }, [user, isDemoUser]);
  
  const [workSettings, setWorkSettings] = useState<WorkSettings>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_work_settings') : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_WORK_SETTINGS, ...parsed };
    }
    return DEFAULT_WORK_SETTINGS;
  });
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_user_settings') : null;
    return saved ? JSON.parse(saved) : DEFAULT_USER_SETTINGS;
  });
  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_work_logs') : null;
    const initial = saved ? JSON.parse(saved) : getInitialWorkLogs();
    if (Array.isArray(initial)) {
      return initial.map((l: any) => {
        const isHolidayOrAnnual = 
          l.work_status === 'Nghỉ lễ' || 
          l.work_status === 'Nghỉ phép năm' || 
          (l.notes && /\b(lễ|nghỉ lễ|phép năm|nghỉ phép năm)\b/i.test(l.notes));

        let th = Number(l.total_hours) || 0;
        let tm = Number(l.total_minutes) || Math.round(th * 60);
        if (isHolidayOrAnnual && th === 0) {
          th = 8.0;
          tm = 480;
        }

        return {
          ...l,
          total_hours: th,
          total_minutes: tm,
        };
      });
    }
    return initial;
  });
  const [businessTrips, setBusinessTrips] = useState<BusinessTripExpense[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_business_trips') : null;
    return saved ? JSON.parse(saved) : getInitialBusinessTrips();
  });
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_expense_categories') : null;
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_transactions') : null;
    return saved ? JSON.parse(saved) : getInitialTransactions();
  });
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_investment_assets') : null;
    const initial: InvestmentAsset[] = saved ? JSON.parse(saved) : getInitialInvestmentAssets();
    return applyCachedPricesToAssets(initial);
  });
  const [investmentTransactions, setInvestmentTransactions] = useState<InvestmentTransaction[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_investment_txs') : null;
    return saved ? JSON.parse(saved) : getInitialInvestmentTransactions();
  });
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_portfolio_snapshots') : null;
    return saved ? JSON.parse(saved) : getInitialPortfolioSnapshots();
  });
  const [salaryRecords, setSalaryRecords] = useState<Record<string, MonthlySalaryData>>(() => {
    const initialMap: Record<string, MonthlySalaryData> = {};
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_salary_records');
      if (saved) {
        try { Object.assign(initialMap, JSON.parse(saved)); } catch {}
      }
      // Scan any legacy per-month keys like app_salary_2026_9
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('app_salary_') && k !== 'app_salary_records') {
          try {
            const v = localStorage.getItem(k);
            if (v) {
              const parts = k.replace('app_salary_', '').split('_');
              if (parts.length >= 2) {
                initialMap[`${parts[0]}_${parts[1]}`] = JSON.parse(v);
              }
            }
          } catch {}
        }
      }
    }
    return initialMap;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_projects') : null;
    return saved ? JSON.parse(saved) : getInitialProjects();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [txProcessLogs, setTxProcessLogs] = useState<TransactionProcessItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_tx_process_logs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.slice(0, 25);
        } catch {}
      }
    }
    return [];
  });
  const [activeTxProcess, setActiveTxProcess] = useState<TransactionProcessItem | null>(null);
  const activeTxTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startTxProcess = useCallback((params: {
    txId: string;
    title: string;
    subtitle: string;
    amount?: number;
    category?: string;
    txType: TransactionProcessItem['txType'];
    action: TransactionProcessItem['action'];
    rawPayload?: any;
  }): { processId: string; startTime: number } => {
    const processId = generateUUID();
    const startTime = Date.now();
    const newItem: TransactionProcessItem = {
      id: processId,
      txId: params.txId,
      title: params.title,
      subtitle: params.subtitle,
      amount: params.amount,
      category: params.category,
      txType: params.txType,
      action: params.action,
      status: 'processing',
      step: 'local_saved',
      stepMessage: 'Đang xử lý • Đã ghi nhận vào bộ nhớ thiết bị',
      progress: 45,
      timestamp: new Date().toISOString(),
      rawPayload: params.rawPayload,
    };

    if (activeTxTimerRef.current) clearTimeout(activeTxTimerRef.current);
    setActiveTxProcess(newItem);
    setTxProcessLogs(prev => {
      const filtered = prev.filter(p => p.txId !== params.txId || p.id === processId);
      const next = [newItem, ...filtered].slice(0, 25);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_tx_process_logs', JSON.stringify(next));
      }
      return next;
    });

    // Chuyển sang bước đang đồng bộ Cloud sau 80ms để hiển thị trực quan tiến trình
    setTimeout(() => {
      setActiveTxProcess(curr => {
        if (!curr || curr.id !== processId || curr.status !== 'processing') return curr;
        return {
          ...curr,
          step: 'cloud_syncing',
          stepMessage: 'Đang xử lý • Đang đồng bộ Realtime & Cloud...',
          progress: 78,
        };
      });
      setTxProcessLogs(prev =>
        prev.map(item =>
          item.id === processId && item.status === 'processing'
            ? {
                ...item,
                step: 'cloud_syncing',
                stepMessage: 'Đang xử lý • Đang đồng bộ Realtime & Cloud...',
                progress: 78,
              }
            : item
        )
      );
    }, 80);

    return { processId, startTime };
  }, []);

  const finalizeTxProcess = useCallback((
    processId: string,
    startTime: number,
    status: 'completed' | 'error',
    stepMessage: string,
    errorDetail?: string
  ) => {
    const durationMs = Math.max(12, Date.now() - startTime);
    const finalStep: TransactionProcessStep = status === 'completed' ? 'completed' : 'error';

    setTxProcessLogs(prev => {
      const next = prev.map(item =>
        item.id === processId
          ? {
              ...item,
              status,
              step: finalStep,
              stepMessage,
              progress: 100,
              durationMs,
              errorDetail,
            }
          : item
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_tx_process_logs', JSON.stringify(next));
      }
      return next;
    });

    setActiveTxProcess(curr => {
      if (!curr || curr.id !== processId) return curr;
      return {
        ...curr,
        status,
        step: finalStep,
        stepMessage,
        progress: 100,
        durationMs,
        errorDetail,
      };
    });

    if (activeTxTimerRef.current) clearTimeout(activeTxTimerRef.current);
    activeTxTimerRef.current = setTimeout(() => {
      setActiveTxProcess(curr => (curr?.id === processId && status === 'completed' ? null : curr));
    }, 6000);
  }, []);

  const clearTxProcessLogs = useCallback(() => {
    setTxProcessLogs([]);
    setActiveTxProcess(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_tx_process_logs');
    }
  }, []);

  const dismissActiveTxProcess = useCallback(() => {
    setActiveTxProcess(null);
  }, []);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const loadingDataRef = useRef(loadingData);
  useEffect(() => {
    loadingDataRef.current = loadingData;
  }, [loadingData]);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [syncMessage, setSyncMessage] = useState<string>('Đã kết nối');
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const investmentAssetsRef = useRef(investmentAssets);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage('Đã kết nối trực tuyến');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('Mất kết nối Internet');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    investmentAssetsRef.current = investmentAssets;
  }, [investmentAssets]);

  const workSettingsRef = useRef(workSettings);
  useEffect(() => {
    workSettingsRef.current = workSettings;
  }, [workSettings]);

  const calculatedHoldings = useMemo(() => {
    return calculateInvestmentHoldings(investmentAssets, investmentTransactions, userSettings.cost_calculation_method);
  }, [investmentAssets, investmentTransactions, userSettings.cost_calculation_method]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_work_settings', JSON.stringify(workSettings));
      localStorage.setItem('app_user_settings', JSON.stringify(userSettings));
      localStorage.setItem('app_work_logs', JSON.stringify(workLogs));
      localStorage.setItem('app_business_trips', JSON.stringify(businessTrips));
      localStorage.setItem('app_expense_categories', JSON.stringify(categories));
      localStorage.setItem('app_transactions', JSON.stringify(transactions));
      localStorage.setItem('app_investment_assets', JSON.stringify(investmentAssets));
      localStorage.setItem('app_investment_txs', JSON.stringify(investmentTransactions));
      localStorage.setItem('app_portfolio_snapshots', JSON.stringify(portfolioSnapshots));
      localStorage.setItem('app_salary_records', JSON.stringify(salaryRecords));
    }
  }, [workSettings, userSettings, workLogs, businessTrips, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots, salaryRecords]);

  const triggerCloudBackup = async (silent = true) => {
    setSyncStatus('syncing');
    setSyncMessage('Đang tự động sao lưu dữ liệu lên Supabase Cloud...');
    if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
    backupTimeoutRef.current = setTimeout(() => {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncMessage('Đã sao lưu an toàn lên Supabase Cloud');
    }, 700);
  };

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncWithSupabase = async (showToast = false) => {
    if (loadingDataRef.current) return;
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;
    try {
      setLoadingData(true);
      setSyncStatus('syncing');
      
      const effectiveUserId = user?.id || 'admin123';

      // 1. Tải work_settings (chứa cấu hình giờ công và salary_data)
      let wsBusinessTripsFallback: BusinessTripExpense[] | null = null;
      let wsInvestmentTxsFallback: InvestmentTransaction[] | null = null;
      let wsInvestmentAssetsFallback: InvestmentAsset[] | null = null;
      let wsTransactionsFallback: Transaction[] | null = null;
      const foundItxsFromLogs: InvestmentTransaction[] = [];
      const foundAssetsFromLogs: InvestmentAsset[] = [];
      const foundTransactionsFromLogs: Transaction[] = [];
      try {
        let queryWs = client.from('work_settings').select('*');
        if (user?.id && isUuidString(user.id)) {
          queryWs = queryWs.or(`user_id.eq.${user.id},user_id.is.null`);
        }
        let { data: wsData, error: wsError } = await queryWs.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if ((wsError || !wsData) && user?.id) {
          const fallbackWs = await client.from('work_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
          if (!fallbackWs.error && fallbackWs.data) {
            wsData = fallbackWs.data;
            wsError = null;
          }
        }
        if (!wsError && wsData) {
          const empFallback = wsData.salary_data?._employee_info;
          const mergedWs: WorkSettings = {
            ...DEFAULT_WORK_SETTINGS,
            ...wsData,
            employee_id: wsData.employee_id || empFallback?.employee_id || DEFAULT_WORK_SETTINGS.employee_id,
            employee_name: wsData.employee_name || empFallback?.employee_name || DEFAULT_WORK_SETTINGS.employee_name,
          };
          setWorkSettings(mergedWs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_work_settings', JSON.stringify(mergedWs));
          }
          if (Array.isArray((wsData as any)._investment_txs)) {
            wsInvestmentTxsFallback = (wsData as any)._investment_txs;
          }
          if (Array.isArray((wsData as any)._investment_assets)) {
            wsInvestmentAssetsFallback = (wsData as any)._investment_assets;
          }
          if (wsData.salary_data && typeof wsData.salary_data === 'object') {
            if (Array.isArray(wsData.salary_data._business_trips)) {
              wsBusinessTripsFallback = wsData.salary_data._business_trips;
            }
            if (Array.isArray(wsData.salary_data._investment_txs)) {
              wsInvestmentTxsFallback = wsData.salary_data._investment_txs;
            }
            if (Array.isArray(wsData.salary_data._investment_assets)) {
              wsInvestmentAssetsFallback = wsData.salary_data._investment_assets;
            }
            if (Array.isArray(wsData.salary_data._transactions)) {
              wsTransactionsFallback = wsData.salary_data._transactions;
            }
            setSalaryRecords(prev => {
              const merged = { ...prev, ...wsData.salary_data };
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_salary_records', JSON.stringify(merged));
                Object.entries(wsData.salary_data).forEach(([k, v]) => {
                  if (k !== '_employee_info' && k !== '_business_trips' && k !== '_investment_txs' && k !== '_investment_assets' && k !== '_transactions') {
                    localStorage.setItem(`app_salary_${k}`, JSON.stringify(v));
                  }
                });
              }
              return merged;
            });
          }
        }
      } catch (wsErr) {
        console.warn('Lỗi tải work_settings:', wsErr);
      }

      // 2. Tải bảng salary_records chuyên dụng (nếu có trên Supabase)
      try {
        let querySal = client.from('salary_records').select('*');
        if (user?.id && isUuidString(user.id)) {
          querySal = querySal.or(`user_id.eq.${user.id},user_id.is.null`);
        }
        const { data: salData, error: salError } = await querySal;
        if (!salError && salData && Array.isArray(salData)) {
          const salMap: Record<string, MonthlySalaryData> = {};
          salData.forEach((r: any) => {
            const m = Number(r.month);
            const y = Number(r.year);
            if (m && y) {
              salMap[`${y}_${m}`] = {
                baseSalary: Number(r.base_salary) || 0,
                kpiBonus: Number(r.kpi_bonus) || 0,
                salesBonus: Number(r.sales_bonus) || 0,
                otherAllowance: Number(r.other_allowance) || 0,
                insuranceDeduction: Number(r.insurance_deduction) || 0,
              };
            }
          });
          if (Object.keys(salMap).length > 0) {
            setSalaryRecords(prev => {
              const merged = { ...prev, ...salMap };
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_salary_records', JSON.stringify(merged));
                Object.entries(salMap).forEach(([k, v]) => {
                  localStorage.setItem(`app_salary_${k}`, JSON.stringify(v));
                });
              }
              return merged;
            });
          }
        }
      } catch {
        // Tự động sử dụng dữ liệu từ work_settings và work_logs shadow
      }

      // 3. Tải user_settings
      try {
        let queryUs = client.from('user_settings').select('*');
        if (user?.id && isUuidString(user.id)) queryUs = queryUs.or(`user_id.eq.${user.id},user_id.is.null`);
        const { data: usData } = await queryUs.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (usData) {
          setUserSettings(prev => ({ ...DEFAULT_USER_SETTINGS, ...prev, ...usData }));
        }
      } catch (usErr) {
        console.warn('Lỗi tải user_settings:', usErr);
      }

      // 4. Tải work_logs (bao gồm quét các bản ghi đồng bộ lương an toàn)
      try {
        let queryWl = client.from('work_logs').select('*');
        if (user?.id && isUuidString(user.id)) queryWl = queryWl.or(`user_id.eq.${user.id},user_id.is.null`);
        let { data: wlData, error: wlError } = await queryWl.order('work_date', { ascending: false });
        if ((wlError || !wlData || wlData.length === 0) && user?.id) {
          const fbWl = await client.from('work_logs').select('*').order('work_date', { ascending: false });
          if (!fbWl.error && fbWl.data) {
            wlData = fbWl.data;
            wlError = null;
          }
        }
        if (!wlError && wlData && wlData.length > 0) {
          const actualLogs: any[] = [];
          const foundSalaryFromLogs: Record<string, MonthlySalaryData> = {};
          const foundTripsFromLogs: BusinessTripExpense[] = [];

          wlData.forEach((l: any) => {
            // Nhận diện bản ghi đồng bộ cấu hình nhân viên & giờ công dự phòng
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[WORK_SETTINGS_SYNC]:')) {
              try {
                const keyword = '[WORK_SETTINGS_SYNC]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (parsed && typeof parsed === 'object') {
                  setWorkSettings(prev => {
                    const merged: WorkSettings = {
                      ...DEFAULT_WORK_SETTINGS,
                      ...prev,
                      ...parsed,
                      employee_id: parsed.employee_id || prev.employee_id || DEFAULT_WORK_SETTINGS.employee_id,
                      employee_name: parsed.employee_name || prev.employee_name || DEFAULT_WORK_SETTINGS.employee_name,
                      standard_hours_per_day: Number(parsed.standard_hours_per_day) || prev.standard_hours_per_day || 8.0,
                      standard_days_per_month: Number(parsed.standard_days_per_month) || prev.standard_days_per_month || 26,
                    };
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('app_work_settings', JSON.stringify(merged));
                    }
                    return merged;
                  });
                }
              } catch (e) {
                // ignore
              }
              return; // Bỏ qua không đưa vào danh sách chấm công hàng ngày
            }

            // Nhận diện bản ghi đồng bộ lương đặc biệt
            if (l.notes && typeof l.notes === 'string' && (l.notes.includes('[SALARY_SYNC]:') || l.notes.includes('[SALARY_DATA]:'))) {
              try {
                const keyword = l.notes.includes('[SALARY_SYNC]:') ? '[SALARY_SYNC]:' : '[SALARY_DATA]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (parsed && typeof parsed === 'object') {
                  Object.assign(foundSalaryFromLogs, parsed);
                }
              } catch (e) {
                // ignore
              }
              return; // Bỏ qua không đưa vào danh sách chấm công hàng ngày
            }

            // Nhận diện bản ghi đồng bộ công tác phí đa tầng
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[BUSINESS_TRIP_SYNC]:')) {
              try {
                const keyword = '[BUSINESS_TRIP_SYNC]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (Array.isArray(parsed)) {
                  foundTripsFromLogs.push(...parsed);
                }
              } catch (e) {
                // ignore
              }
              return; // Bỏ qua không đưa vào danh sách chấm công hàng ngày
            }

            // Nhận diện bản ghi đồng bộ giao dịch đầu tư & cổ tức tiền mặt
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[INVESTMENTS_SYNC]:')) {
              try {
                const keyword = '[INVESTMENTS_SYNC]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (Array.isArray(parsed)) {
                  foundItxsFromLogs.push(...parsed);
                }
              } catch (e) {
                // ignore
              }
              return;
            }

            // Nhận diện bản ghi đồng bộ danh mục tài sản đầu tư
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[INVESTMENT_ASSETS_SYNC]:')) {
              try {
                const keyword = '[INVESTMENT_ASSETS_SYNC]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (Array.isArray(parsed)) {
                  foundAssetsFromLogs.push(...parsed);
                }
              } catch (e) {
                // ignore
              }
              return;
            }

            // Nhận diện bản ghi đồng bộ giao dịch thu chi & tích lũy đầu tư đa tầng
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[TRANSACTIONS_SYNC]:')) {
              try {
                const keyword = '[TRANSACTIONS_SYNC]:';
                const jsonPart = l.notes.substring(l.notes.indexOf(keyword) + keyword.length);
                const parsed = JSON.parse(jsonPart);
                if (Array.isArray(parsed)) {
                  foundTransactionsFromLogs.push(...parsed);
                }
              } catch (e) {
                // ignore
              }
              return;
            }

            if (l.work_date === '1970-01-01' || l.work_status === 'Lương tháng' || l.work_status === 'Cấu hình' || l.work_status === 'Công tác phí' || l.work_status === 'Đầu tư' || l.work_status === 'Thu chi') {
              return;
            }

            let th = Number(l.total_hours) || 0;
            let tm = Number(l.total_minutes) || Math.round(th * 60);
            const status = l.work_status;
            const isHolidayOrAnnual = 
              status === 'Nghỉ lễ' || 
              status === 'Nghỉ phép năm' || 
              (l.notes && /\b(lễ|nghỉ lễ|phép năm|nghỉ phép năm)\b/i.test(l.notes));

            if (isHolidayOrAnnual && th === 0) {
              th = 8.0;
              tm = 480;
            }

            actualLogs.push({
              ...l, 
              break_duration_hours: Number(l.break_duration_hours) || 0,
              break_duration_minutes: Number(l.break_duration_minutes) || Math.round((Number(l.break_duration_hours) || 0) * 60),
              total_hours: th,
              total_minutes: tm,
              overtime_hours: Number(l.overtime_hours) || 0,
              overtime_minutes: Number(l.overtime_minutes) || Math.round((Number(l.overtime_hours) || 0) * 60),
              missing_hours: Number(l.missing_hours) || 0,
              missing_minutes: Number(l.missing_minutes) || Math.round((Number(l.missing_hours) || 0) * 60),
            });
          });

          setWorkLogs(actualLogs);
          if (Object.keys(foundSalaryFromLogs).length > 0) {
            setSalaryRecords(prev => {
              const merged = { ...prev, ...foundSalaryFromLogs };
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_salary_records', JSON.stringify(merged));
                Object.entries(foundSalaryFromLogs).forEach(([k, v]) => {
                  localStorage.setItem(`app_salary_${k}`, JSON.stringify(v));
                });
              }
              return merged;
            });
          }
        }
      } catch (wlErr) {
        console.warn('Lỗi tải work_logs:', wlErr);
      }

      // 5. Tải business_trips chuẩn từ Cloud Database
      try {
        let loadedTrips: BusinessTripExpense[] | null = null;

        // 5a. Thử tải trực tiếp từ bảng business_trips trên Supabase
        try {
          let queryBt = client.from('business_trips').select('*');
          if (user?.id && isUuidString(user.id)) queryBt = queryBt.or(`user_id.eq.${user.id},user_id.is.null`);
          const { data: btData, error: btError } = await queryBt.order('trip_date', { ascending: false });
          if (!btError && btData && Array.isArray(btData)) {
            loadedTrips = btData.map((t: any) => {
              let outType = t.outbound_type || (t.outbound_km ? 'motorbike' : 'bus');
              let outKm = t.outbound_km;
              let outRoute = t.outbound_route || '';
              let retType = t.return_type || (t.return_km ? 'motorbike' : 'bus');
              let retKm = t.return_km;
              let retRoute = t.return_route || '';
              let cleanNotes = t.notes || '';

              if (cleanNotes && cleanNotes.includes('[TRIP_TRANSPORT]:')) {
                try {
                  const match = cleanNotes.match(/\[TRIP_TRANSPORT\]:(\{.*?\})/);
                  if (match && match[1]) {
                    const parsed = JSON.parse(match[1]);
                    if (parsed.outbound_type) outType = parsed.outbound_type;
                    if (parsed.outbound_km !== undefined && parsed.outbound_km !== null) outKm = Number(parsed.outbound_km);
                    if (parsed.outbound_route) outRoute = parsed.outbound_route;
                    if (parsed.return_type) retType = parsed.return_type;
                    if (parsed.return_km !== undefined && parsed.return_km !== null) retKm = Number(parsed.return_km);
                    if (parsed.return_route) retRoute = parsed.return_route;
                    cleanNotes = cleanNotes.replace(/\[TRIP_TRANSPORT\]:\{.*?\}/g, '').trim();
                  }
                } catch {}
              }

              return {
                ...t,
                days_count: Number(t.days_count) || 1,
                daily_allowance_rate: Number(t.daily_allowance_rate) || 160000,
                total_daily_allowance: Number(t.total_daily_allowance) || 0,
                hotel_cost: Number(t.hotel_cost) || 0,
                outbound_cost: Number(t.outbound_cost) || 0,
                outbound_type: outType,
                outbound_km: outKm !== undefined && outKm !== null ? Number(outKm) : undefined,
                outbound_route: outRoute || undefined,
                return_cost: Number(t.return_cost) || 0,
                return_type: retType,
                return_km: retKm !== undefined && retKm !== null ? Number(retKm) : undefined,
                return_route: retRoute || undefined,
                total_amount: Number(t.total_amount) || 0,
                is_paid: Boolean(t.is_paid),
                notes: cleanNotes || undefined,
              };
            });
          }
        } catch (tableErr) {
          console.warn('Lỗi đọc bảng business_trips:', tableErr);
        }

        // 5b. Nếu bảng business_trips chưa có hoặc lỗi, fallback qua work_settings._business_trips
        if (loadedTrips === null && wsBusinessTripsFallback && Array.isArray(wsBusinessTripsFallback)) {
          loadedTrips = wsBusinessTripsFallback;
        }

        // 5c. Áp dụng dữ liệu đồng bộ
        if (loadedTrips !== null) {
          const sorted = [...loadedTrips].sort(
            (a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime()
          );
          setBusinessTrips(sorted);
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_business_trips', JSON.stringify(sorted));
          }
        }
      } catch (btErr) {
        console.warn('Tải business_trips:', btErr);
      }

      // 6. Tải expense_categories
      try {
        const { data: catData, error: catError } = await client.from('expense_categories').select('*');
        if (!catError && catData && catData.length > 0) {
          setCategories(catData);
        }
      } catch (catErr) {
        console.warn('Tải categories:', catErr);
      }

      // 7. Tải transactions (với Shadow Sync & Realtime Fallback đa tầng & Schema Validation)
      try {
        let loadedTxs: Transaction[] | null = null;
        let queryTx = client.from('transactions').select('*');
        if (user?.id && isUuidString(user.id)) queryTx = queryTx.or(`user_id.eq.${user.id},user_id.is.null`);
        let { data: txData, error: txError } = await queryTx.order('transaction_date', { ascending: false });
        if ((txError || !txData || txData.length === 0) && user?.id) {
          const fbTx = await client.from('transactions').select('*').order('transaction_date', { ascending: false });
          if (!fbTx.error && fbTx.data) {
            txData = fbTx.data;
            txError = null;
          }
        }
        if (!txError && txData && Array.isArray(txData) && txData.length > 0) {
          loadedTxs = txData
            .map((t: any) => validateAndSanitizeTransaction(t))
            .filter((t): t is Transaction => t !== null);
        }

        // Fallback from shadow channel foundTransactionsFromLogs
        if (foundTransactionsFromLogs.length > 0) {
          const validatedShadowLogs = foundTransactionsFromLogs
            .map((t: any) => validateAndSanitizeTransaction(t))
            .filter((t): t is Transaction => t !== null);

          if (!loadedTxs) {
            loadedTxs = validatedShadowLogs;
          } else {
            const map = new Map(loadedTxs.map(t => [t.id, t]));
            validatedShadowLogs.forEach(f => {
              if (!map.has(f.id)) {
                loadedTxs!.push(f);
                map.set(f.id, f);
              }
            });
          }
        }

        // Fallback from work_settings._transactions
        if (!loadedTxs && wsTransactionsFallback && Array.isArray(wsTransactionsFallback)) {
          loadedTxs = wsTransactionsFallback
            .map((t: any) => validateAndSanitizeTransaction(t))
            .filter((t): t is Transaction => t !== null);
        }

        if (loadedTxs && loadedTxs.length > 0) {
          const finalTxs = loadedTxs;
          setTransactions(prev => {
            const remoteMap = new Map(finalTxs.map(r => [r.id, r]));
            const localOnly = prev.filter(p => !remoteMap.has(p.id));
            const merged = [...finalTxs, ...localOnly].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_transactions', JSON.stringify(merged));
            }
            return merged;
          });
        }
      } catch (txErr) {
        console.warn('Tải transactions:', txErr);
      }

      // 8. Tải investment_assets (Bảo toàn giá mới nhất từ Local Cache, Shadow Logs, Work Settings & Cloud)
      try {
        let queryAssets = client.from('investment_assets').select('*');
        if (user?.id && isUuidString(user.id)) queryAssets = queryAssets.or(`user_id.eq.${user.id},user_id.is.null`);
        let { data: assetData, error: assetError } = await queryAssets;
        if ((assetError || !assetData || assetData.length === 0) && user?.id) {
          const fbAssets = await client.from('investment_assets').select('*');
          if (!fbAssets.error && fbAssets.data) {
            assetData = fbAssets.data;
            assetError = null;
          }
        }

        const serverAssets: InvestmentAsset[] = !assetError && Array.isArray(assetData) ? assetData : [];
        const logAssets: InvestmentAsset[] = Array.isArray(foundAssetsFromLogs) ? foundAssetsFromLogs : [];
        const wsAssets: InvestmentAsset[] = Array.isArray(wsInvestmentAssetsFallback) ? wsInvestmentAssetsFallback : [];

        if (serverAssets.length > 0 || logAssets.length > 0 || wsAssets.length > 0) {
          let needsCloudHeal = false;
          let healedAssetsSnapshot: InvestmentAsset[] = [];

          setInvestmentAssets(prev => {
            const priceCache = readAssetPriceCache();
            const prevById = new Map<string, InvestmentAsset>(prev.map(p => [p.id, p]));
            const prevBySym = new Map<string, InvestmentAsset>(
              prev.map(p => [(p.asset_symbol || '').trim().toUpperCase(), p])
            );
            const logById = new Map<string, InvestmentAsset>(logAssets.map(a => [a.id, a]));
            const logBySym = new Map<string, InvestmentAsset>(
              logAssets.map(a => [(a.asset_symbol || '').trim().toUpperCase(), a])
            );
            const wsById = new Map<string, InvestmentAsset>(wsAssets.map(a => [a.id, a]));
            const wsBySym = new Map<string, InvestmentAsset>(
              wsAssets.map(a => [(a.asset_symbol || '').trim().toUpperCase(), a])
            );

            // Kết hợp danh sách tài sản gốc từ serverAssets -> logAssets -> wsAssets -> prev
            const baseListMap = new Map<string, InvestmentAsset>();
            serverAssets.forEach(a => baseListMap.set(a.id, a));
            logAssets.forEach(a => {
              if (!baseListMap.has(a.id)) baseListMap.set(a.id, a);
            });
            wsAssets.forEach(a => {
              if (!baseListMap.has(a.id)) baseListMap.set(a.id, a);
            });
            prev.forEach(a => {
              if (!baseListMap.has(a.id)) baseListMap.set(a.id, a);
            });

            if (baseListMap.size === 0) return prev;

            const mergedAssets = Array.from(baseListMap.values()).map((baseAsset) => {
              const sym = (baseAsset.asset_symbol || '').trim().toUpperCase();
              const localAsset = prevById.get(baseAsset.id) || prevBySym.get(sym);
              const logAsset = logById.get(baseAsset.id) || logBySym.get(sym);
              const wsAsset = wsById.get(baseAsset.id) || wsBySym.get(sym);
              const serverAsset = serverAssets.find(
                s => s.id === baseAsset.id || (s.asset_symbol || '').trim().toUpperCase() === sym
              );
              const cachedById = priceCache[`id:${baseAsset.id}`];
              const cachedBySym = priceCache[`sym:${sym}`];

              const best = pickNewestPriceCandidate([
                { price: serverAsset?.current_price, updatedAt: serverAsset?.price_updated_at, priority: 1 },
                { price: logAsset?.current_price, updatedAt: logAsset?.price_updated_at, priority: 2 },
                { price: wsAsset?.current_price, updatedAt: wsAsset?.price_updated_at, priority: 3 },
                { price: localAsset?.current_price, updatedAt: localAsset?.price_updated_at, priority: 4 },
                { price: cachedBySym?.current_price, updatedAt: cachedBySym?.price_updated_at, priority: 5 },
                { price: cachedById?.current_price, updatedAt: cachedById?.price_updated_at, priority: 6 },
              ]);

              const finalPrice = best.current_price || Number(baseAsset.current_price) || 0;
              const finalUpdatedAt = best.price_updated_at || baseAsset.price_updated_at || new Date().toISOString();

              if (
                serverAsset &&
                finalPrice > 0 &&
                (Number(serverAsset.current_price) !== finalPrice ||
                  parseSafeTime(finalUpdatedAt) > parseSafeTime(serverAsset.price_updated_at))
              ) {
                needsCloudHeal = true;
              }

              return {
                ...(serverAsset || baseAsset),
                ...(localAsset ? { currency: localAsset.currency || (serverAsset as any)?.currency } : {}),
                current_price: finalPrice,
                price_updated_at: finalUpdatedAt,
              };
            });

            healedAssetsSnapshot = mergedAssets;
            investmentAssetsRef.current = mergedAssets;
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_investment_assets', JSON.stringify(mergedAssets));
              forceUpdateAssetPriceCache(
                mergedAssets.map(a => ({
                  id: a.id,
                  symbol: a.asset_symbol,
                  current_price: a.current_price,
                  price_updated_at: a.price_updated_at,
                }))
              );
            }
            return mergedAssets;
          });

          if (needsCloudHeal && healedAssetsSnapshot.length > 0 && !isDemoUserRef.current) {
            void syncInvestmentAssetsToCloud(healedAssetsSnapshot);
          }
        }
      } catch (assetErr) {
        console.warn('Lỗi tải investment_assets:', assetErr);
      }

      // 9. Tải investment_transactions
      try {
        let loadedItxs: InvestmentTransaction[] | null = null;
        let queryItx = client.from('investment_transactions').select('*');
        if (user?.id && isUuidString(user.id)) queryItx = queryItx.or(`user_id.eq.${user.id},user_id.is.null`);
        let { data: itxData, error: itxError } = await queryItx.order('transaction_date', { ascending: false });
        if ((itxError || !itxData || itxData.length === 0) && user?.id) {
          const fbItx = await client.from('investment_transactions').select('*').order('transaction_date', { ascending: false });
          if (!fbItx.error && fbItx.data) {
            itxData = fbItx.data;
            itxError = null;
          }
        }
        if (!itxError && itxData && Array.isArray(itxData)) {
          loadedItxs = itxData.map((t: any) => {
            let divType = t.dividend_type as 'cash' | 'stock' | undefined;
            let totAmt = Number(t.total_amount) || 0;
            let price = Number(t.price) || 0;
            let qty = Number(t.quantity) || 0;
            let fee = Number(t.fee) || 0;
            let txType = (t.transaction_type || 'buy') as any;

            if (t.note && t.note.includes('[DIVIDEND_META]:')) {
              try {
                const match = t.note.match(/\[DIVIDEND_META\]:(\{.*?\})/);
                if (match && match[1]) {
                  const meta = JSON.parse(match[1]);
                  txType = 'dividend';
                  if (meta.dividend_type) divType = meta.dividend_type;
                  if (meta.total_amount !== undefined) totAmt = Number(meta.total_amount);
                  if (meta.price !== undefined) price = Number(meta.price);
                  if (meta.quantity !== undefined) qty = Number(meta.quantity);
                  if (meta.fee !== undefined) fee = Number(meta.fee);
                }
              } catch {}
            }

            if (txType === 'dividend' || (t.note && t.note.toLowerCase().includes('cổ tức'))) {
              txType = 'dividend';
              if (!divType) {
                divType = (qty === 0 || totAmt > 0 || (price > 0 && qty === 0)) ? 'cash' : 'stock';
              }
              if (divType === 'cash') {
                if (totAmt === 0 && price > 0) totAmt = Math.max(0, price - fee);
              }
            }

            return {
              ...t,
              transaction_type: txType,
              dividend_type: divType,
              quantity: qty,
              price: price,
              price_per_unit: price,
              total_amount: totAmt > 0 ? totAmt : (qty * price + fee),
              fee: fee,
            };
          });
        }

        // Merge from shadow channel foundItxsFromLogs
        if (foundItxsFromLogs.length > 0) {
          if (!loadedItxs) {
            loadedItxs = foundItxsFromLogs;
          } else {
            const map = new Map(loadedItxs.map(t => [t.id, t]));
            foundItxsFromLogs.forEach(f => {
              if (!map.has(f.id)) {
                loadedItxs!.push(f);
                map.set(f.id, f);
              }
            });
          }
        }

        // Merge from work_settings._investment_txs
        if (wsInvestmentTxsFallback && Array.isArray(wsInvestmentTxsFallback)) {
          if (!loadedItxs) {
            loadedItxs = wsInvestmentTxsFallback;
          } else {
            const map = new Map(loadedItxs.map(t => [t.id, t]));
            wsInvestmentTxsFallback.forEach(f => {
              if (!map.has(f.id)) {
                loadedItxs!.push(f);
                map.set(f.id, f);
              }
            });
          }
        }

        if (loadedItxs) {
          const finalItxs = loadedItxs;
          setInvestmentTransactions(prev => {
            const remoteMap = new Map(finalItxs.map(r => [r.id, r]));
            const localOnly = prev.filter(p => !remoteMap.has(p.id));
            const merged = [...finalItxs, ...localOnly].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_investment_txs', JSON.stringify(merged));
            }
            return merged;
          });
        }
      } catch (itxErr) {
        console.warn('Lỗi tải investment_transactions:', itxErr);
      }

      // 10. Tải portfolio_snapshots
      try {
        let querySnap = client.from('portfolio_snapshots').select('*');
        if (user?.id && isUuidString(user.id)) querySnap = querySnap.or(`user_id.eq.${user.id},user_id.is.null`);
        const { data: snapData, error: snapError } = await querySnap.order('snapshot_date', { ascending: true });
        if (!snapError && snapData && snapData.length > 0) {
          setPortfolioSnapshots(snapData.map(s => ({
            ...s,
            total_value: Number(s.total_value) || 0,
            total_cost: Number(s.total_cost) || 0,
            total_profit: Number(s.total_profit) || 0,
            profit_percentage: Number(s.profit_percentage) || 0
          })));
        }
      } catch (snapErr) {
        console.warn('Lỗi tải portfolio_snapshots:', snapErr);
      }

      // 11. Tải projects từ Supabase
      try {
        let queryProj = client.from('projects').select('*');
        if (user?.id && isUuidString(user.id)) queryProj = queryProj.or(`user_id.eq.${user.id},user_id.is.null`);
        const { data: projData, error: projError } = await queryProj.order('created_at', { ascending: false });
        if (!projError && projData && Array.isArray(projData) && projData.length > 0) {
          const formatted: Project[] = projData.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            name: p.name || 'Dự án',
            client: p.client || '',
            description: p.description || '',
            status: p.status || 'in_progress',
            progress: Number(p.progress) || 0,
            budget: Number(p.budget) || 0,
            spent: Number(p.spent) || 0,
            deadline: p.deadline || '',
            priority: p.priority || 'medium',
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          }));
          setProjects(formatted);
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_projects', JSON.stringify(formatted));
          }
        }
      } catch (projErr) {
        // Table may not yet be created on Supabase; local fallback remains fully functional
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncMessage('Đồng bộ Realtime Supabase hoạt động');
      if (showToast) addToast('Đã đồng bộ dữ liệu mới nhất từ Cloud', 'success');
    } catch (err: any) {
      console.error('Lỗi nghiêm trọng khi đồng bộ:', err);
      setSyncStatus('error');
    } finally {
      setLoadingData(false);
    }
  };

  // Realtime Multi-Device synchronization hook
  useEffect(() => {
    // Initial sync
    syncWithSupabase();

    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    const effectiveUserId = user?.id || 'admin123';

    // Setup Supabase Realtime channel for instant cross-device updates
    const channel = client
      .channel('app_global_realtime_sync')
      .on(
        'broadcast',
        { event: 'salary_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.key && item?.data) {
            setSalaryRecords(prev => {
              const updated = { ...prev, [item.key]: item.data };
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_salary_records', JSON.stringify(updated));
                localStorage.setItem(`app_salary_${item.key}`, JSON.stringify(item.data));
              }
              return updated;
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'work_settings_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.settings) {
            setWorkSettings(prev => {
              const updated = { ...prev, ...item.settings };
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_work_settings', JSON.stringify(updated));
              }
              return updated;
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'business_trips_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.trips && Array.isArray(item.trips)) {
            const sorted = [...item.trips].sort(
              (a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime()
            );
            setBusinessTrips(sorted);
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_business_trips', JSON.stringify(sorted));
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'investment_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.transactions && Array.isArray(item.transactions)) {
            setInvestmentTransactions(item.transactions);
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_investment_txs', JSON.stringify(item.transactions));
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'transactions_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.transactions && Array.isArray(item.transactions)) {
            setTransactions(prev => {
              const currentMap = new Map(prev.map(t => [t.id, t]));
              const validIncoming: Transaction[] = [];
              
              for (const raw of item.transactions) {
                const existing = currentMap.get(raw.id);
                const validated = validateAndSanitizeTransaction(raw, existing);
                if (validated) {
                  validIncoming.push(validated);
                  currentMap.set(validated.id, validated);
                }
              }

              // Merge incoming validated transactions with any local-only transactions
              const incomingMap = new Map(validIncoming.map(t => [t.id, t]));
              const retainedLocal = prev.filter(p => !incomingMap.has(p.id));
              const merged = [...validIncoming, ...retainedLocal].sort(
                (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
              );

              if (typeof window !== 'undefined') {
                localStorage.setItem('app_transactions', JSON.stringify(merged));
              }
              return merged;
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'investment_assets_sync' },
        (payload: any) => {
          const item = payload?.payload;
          if (item?.assets && Array.isArray(item.assets) && item.assets.length > 0) {
            setInvestmentAssets(prev => {
              const prevById = new Map(prev.map(p => [p.id, p]));
              const priceCache = readAssetPriceCache();
              const merged = item.assets.map((inc: InvestmentAsset) => {
                const loc = prevById.get(inc.id);
                const sym = (inc.asset_symbol || '').trim().toUpperCase();
                const best = pickNewestPriceCandidate([
                  { price: inc.current_price, updatedAt: inc.price_updated_at, priority: 3 },
                  { price: loc?.current_price, updatedAt: loc?.price_updated_at, priority: 2 },
                  { price: priceCache[`id:${inc.id}`]?.current_price, updatedAt: priceCache[`id:${inc.id}`]?.price_updated_at, priority: 1 },
                  { price: priceCache[`sym:${sym}`]?.current_price, updatedAt: priceCache[`sym:${sym}`]?.price_updated_at, priority: 1 },
                ]);
                return {
                  ...inc,
                  current_price: best.current_price || Number(inc.current_price) || 0,
                  price_updated_at: best.price_updated_at || inc.price_updated_at,
                };
              });
              investmentAssetsRef.current = merged;
              if (typeof window !== 'undefined') {
                localStorage.setItem('app_investment_assets', JSON.stringify(merged));
                forceUpdateAssetPriceCache(
                  merged.map((a: InvestmentAsset) => ({
                    id: a.id,
                    symbol: a.asset_symbol,
                    current_price: a.current_price,
                    price_updated_at: a.price_updated_at,
                  }))
                );
              }
              return merged;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload) => {
          console.log('[Supabase Realtime] Event received from another device/session:', payload.eventType, payload.table);
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => {
            syncWithSupabase(false);
          }, 150);
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Subscription status:', status);
      });

    // Heartbeat auto-sync every 15s when tab is active
    const heartbeat = setInterval(() => {
      if (!document.hidden && !loadingDataRef.current) {
        syncWithSupabase(false);
      }
    }, 15000);

    // Sync when tab regains focus or becomes visible
    const handleFocusOrVisible = () => {
      if (!document.hidden && !loadingDataRef.current) {
        syncWithSupabase(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Sync across tabs in the same browser
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('app_') && !loadingDataRef.current) {
        syncWithSupabase(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      clearInterval(heartbeat);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('storage', handleStorage);
      client.removeChannel(channel);
    };
  }, [user?.id, isDemoUser]);

  const raceWithTimeout = <T,>(promise: PromiseLike<T>, ms = 3000): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Cloud sync timeout (tự động chuyển sang lưu nền)')), ms)
      ),
    ]);
  };

  const runUpsert = async (table: string, data: any, successMsg: string): Promise<{ success: boolean; localOnly?: boolean; pendingSync?: boolean; error?: any }> => {
    triggerCloudBackup();
    if (!isDemoUserRef.current) {
      const currentUserId = userRef.current?.id;
      const validUuidUserId = currentUserId && isUuidString(currentUserId) ? currentUserId : null;
      const effectiveUserId = validUuidUserId || 'admin123';
      try {
        const { client } = getSupabaseClient();
        if (client) {
          let payloadToSave: any = { ...data };
          if (validUuidUserId) {
            payloadToSave.user_id = validUuidUserId;
          } else if (payloadToSave.user_id && !isUuidString(payloadToSave.user_id)) {
            delete payloadToSave.user_id;
          }

          let { error } = await raceWithTimeout<any>(client.from(table).upsert(payloadToSave), 3000);

          // Nếu lỗi do user_id foreign key hoặc kiểu UUID, thử lại khi lược bỏ user_id hoặc cập nhật theo id
          if (error && (error.code === '22P02' || error.code === '23503' || error.code === '23502' || error.message?.includes('user_id'))) {
            const retryPayload = { ...payloadToSave };
            if (error.code === '23502') {
              retryPayload.user_id = toValidUUID(effectiveUserId);
            } else {
              delete retryPayload.user_id;
            }
            const retryRes = await raceWithTimeout<any>(client.from(table).upsert(retryPayload), 3000);
            error = retryRes.error;
          }

          if (error) {
            // Check if error is due to missing columns (e.g. outbound_type, outbound_km in business_trips)
            if (table === 'business_trips' && (
              error.code === '42703' || 
              error.code === 'PGRST204' || 
              error.message?.includes('column') || 
              (error.message?.includes('schema cache') && !error.message?.includes('Could not find the table'))
            )) {
              try {
                const cleanNotes = (data.notes || '').replace(/\[TRIP_TRANSPORT\]:\{.*?\}/g, '').trim();
                const meta = (data.outbound_type || data.outbound_km || data.outbound_route || data.return_type || data.return_km || data.return_route) ? ` [TRIP_TRANSPORT]:${JSON.stringify({
                  outbound_type: data.outbound_type,
                  outbound_km: data.outbound_km,
                  outbound_route: data.outbound_route,
                  return_type: data.return_type,
                  return_km: data.return_km,
                  return_route: data.return_route,
                })}` : '';
                
                const safeCoreData = {
                  id: data.id,
                  user_id: effectiveUserId,
                  trip_date: data.trip_date,
                  end_date: data.end_date || null,
                  days_count: Number(data.days_count) || 1,
                  daily_allowance_rate: Number(data.daily_allowance_rate) || 160000,
                  total_daily_allowance: Number(data.total_daily_allowance) || 0,
                  hotel_cost: Number(data.hotel_cost) || 0,
                  outbound_cost: Number(data.outbound_cost) || 0,
                  return_cost: Number(data.return_cost) || 0,
                  total_amount: Number(data.total_amount) || 0,
                  is_paid: Boolean(data.is_paid),
                  paid_at: data.paid_at || null,
                  location: data.location || null,
                  notes: (cleanNotes + meta).trim() || null,
                  updated_at: new Date().toISOString()
                };
                
                const { error: retryErr } = await raceWithTimeout<any>(client.from('business_trips').upsert(safeCoreData), 3000);
                if (!retryErr) {
                  if (successMsg) addToast(successMsg, 'success');
                  return { success: true, error: null };
                }
              } catch (retryE) {
                console.warn('Lỗi retry business_trips:', retryE);
              }
            }

            // Check if error in transactions table (e.g. check constraint 23514 on transaction_type or foreign key)
            if (table === 'transactions' && (
              error.code === '23514' || 
              error.code === '42703' || 
              error.code === '23503' ||
              error.message?.includes('check constraint') || 
              error.message?.includes('foreign key') ||
              error.message?.includes('transaction_type')
            )) {
              try {
                const isInvest = data.transaction_type === 'investment' || isInvestmentTransaction(data);
                const safeType = isInvest ? 'expense' : (data.transaction_type === 'income' ? 'income' : 'expense');
                const rawNote = (data.note || '').replace(/\[TX_TYPE_INVESTMENT\]/g, '').trim();
                const safeNote = isInvest ? `${rawNote} [TX_TYPE_INVESTMENT]`.trim() : rawNote;

                const safeTxData = {
                  id: data.id,
                  user_id: effectiveUserId,
                  transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                  transaction_type: safeType,
                  category_id: error.message?.includes('foreign key') ? null : (data.category_id || null),
                  category_name: data.category_name || (isInvest ? 'Tích lũy & Đầu tư' : 'Chi tiêu'),
                  amount: Number(data.amount) || 0,
                  note: safeNote || null,
                  updated_at: new Date().toISOString()
                };

                const { error: retryTxErr } = await raceWithTimeout<any>(client.from('transactions').upsert(safeTxData), 3000);
                if (!retryTxErr) {
                  if (successMsg) addToast(successMsg, 'success');
                  return { success: true, error: null };
                }
              } catch (retryE) {
                console.warn('Lỗi retry transactions:', retryE);
              }
            }

            // Check if error in investment_transactions table (e.g. check constraint 23514 on dividend type)
            if (table === 'investment_transactions' && (
              error.code === '23514' || 
              error.code === '42703' || 
              error.code === '23503' ||
              error.message?.includes('check constraint') || 
              error.message?.includes('foreign key') ||
              error.message?.includes('transaction_type')
            )) {
              try {
                const isDividend = data.transaction_type === 'dividend' || data.dividend_type;
                const safeType = isDividend ? 'buy' : (data.transaction_type || 'buy');
                const rawNote = (data.note || data.notes || '').replace(/\[DIVIDEND_META\]:\{.*?\}/g, '').trim();
                let metaNote = rawNote;
                if (isDividend) {
                  const meta = {
                    dividend_type: data.dividend_type || (Number(data.quantity) === 0 ? 'cash' : 'stock'),
                    total_amount: Number(data.total_amount) || Number(data.price) || 0,
                    price: Number(data.price) || 0,
                    quantity: Number(data.quantity) || 0,
                    fee: Number(data.fee) || 0
                  };
                  metaNote = `${rawNote} [DIVIDEND_META]:${JSON.stringify(meta)}`.trim();
                }

                const safeItxData = {
                  id: data.id,
                  user_id: effectiveUserId,
                  asset_id: data.asset_id,
                  transaction_type: safeType,
                  transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                  quantity: isDividend && (data.dividend_type === 'cash' || Number(data.quantity) === 0) ? 0 : (Number(data.quantity) || 0),
                  price: Number(data.price) || 0,
                  fee: Number(data.fee) || 0,
                  note: metaNote || null,
                  updated_at: new Date().toISOString()
                };

                const { error: retryItxErr } = await raceWithTimeout<any>(client.from('investment_transactions').upsert(safeItxData), 3000);
                if (!retryItxErr) {
                  if (successMsg) addToast(successMsg, 'success');
                  return { success: true, error: null };
                }
              } catch (retryE) {
                console.warn('Lỗi retry investment_transactions:', retryE);
              }
            }

            // If table doesn't exist yet on remote Supabase instance (gracefully handled via fallback layers)
            if (error.message?.includes('Could not find the table') || error.message?.includes('schema cache') || error.code === 'PGRST205' || error.code === '42P01') {
              if (successMsg) {
                addToast(successMsg, 'success');
              }
              return { success: true, localOnly: true, error: null };
            }
            if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
              if (successMsg) addToast(successMsg, 'success');
              return { success: true, pendingSync: true, error: null };
            }
            if (successMsg) addToast(successMsg, 'success');
            return { success: true, localOnly: true, error };
          }
        }
      } catch (err: any) {
        if (successMsg) addToast(successMsg, 'success');
        return { success: true, pendingSync: true, error: err };
      }
    }
    if (successMsg) addToast(successMsg, 'success');
    return { success: true, error: null };
  };

  const runDelete = async (table: string, id: string, successMsg: string) => {
    triggerCloudBackup();
    if (!isDemoUser) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await raceWithTimeout<any>(client.from(table).delete().eq('id', id), 3000);
          if (error) {
            if (error.message?.includes('schema cache') || error.message?.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
              if (successMsg) addToast(successMsg, 'success');
              return;
            }
            throw error;
          }
        }
      } catch (err: any) {
        if (
          err.message?.includes('schema cache') ||
          err.message?.includes('Could not find the table') ||
          err.code === 'PGRST205' ||
          err.code === '42P01' ||
          err.message?.includes('timeout')
        ) {
          if (successMsg) addToast(successMsg, 'success');
          return;
        }
        console.warn(`Lỗi xóa Cloud '${table}':`, err.message);
      }
    }
    if (successMsg) addToast(successMsg, 'success');
  };

  const updateWorkSettings = async (newSettings: Partial<WorkSettings>) => {
    const updated: WorkSettings = { ...workSettings, ...newSettings };
    setWorkSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_work_settings', JSON.stringify(updated));
    }

    const { client, isConfigured } = getSupabaseClient();
    if (isConfigured && client) {
      triggerCloudBackup();
      const effectiveUserId = user?.id || 'admin123';

      // 1. Broadcast realtime update to other devices/tabs
      try {
        const channel = client.channel('app_global_realtime_sync');
        channel.send({
          type: 'broadcast',
          event: 'work_settings_sync',
          payload: { settings: updated, updated_at: new Date().toISOString() }
        });
      } catch (bcErr) {
        console.warn('Realtime broadcast error:', bcErr);
      }

      // 2. Save to work_settings table with fallback in salary_data._employee_info
      try {
        const salaryDataWithEmp = {
          ...(updated.salary_data || salaryRecords || {}),
          _employee_info: {
            employee_id: updated.employee_id || '42157',
            employee_name: updated.employee_name || 'Họ tên NV',
          }
        };

        await runUpsert('work_settings', {
          id: updated.id ? toValidUUID(updated.id) : toValidUUID(`ws_${effectiveUserId}`),
          employee_id: updated.employee_id || '42157',
          employee_name: updated.employee_name || 'Họ tên NV',
          default_check_in: updated.default_check_in,
          default_check_out: updated.default_check_out,
          default_break_start: updated.default_break_start,
          default_break_end: updated.default_break_end,
          standard_hours_per_day: updated.standard_hours_per_day,
          standard_days_per_month: updated.standard_days_per_month || 26,
          salary_data: salaryDataWithEmp
        }, 'Đã lưu & đồng bộ Mã số NV, Họ tên và Giờ chuẩn lên Supabase Cloud');
      } catch (wsErr: any) {
        console.warn('Lỗi lưu work_settings:', wsErr);
      }

      // 3. Tự động lưu dự phòng vào work_logs để đảm bảo luôn đồng bộ 100% qua mọi thiết bị
      try {
        const configId = toValidUUID(`cfg_work_settings_${effectiveUserId}`);
        const notesPayload = `[WORK_SETTINGS_SYNC]:${JSON.stringify({
          employee_id: updated.employee_id || '42157',
          employee_name: updated.employee_name || 'Họ tên NV',
          standard_hours_per_day: updated.standard_hours_per_day || 8.0,
          standard_days_per_month: updated.standard_days_per_month || 26,
          default_check_in: updated.default_check_in,
          default_check_out: updated.default_check_out,
          default_break_start: updated.default_break_start,
          default_break_end: updated.default_break_end,
          updated_at: new Date().toISOString()
        })}`;

        await client.from('work_logs').upsert({
          id: configId,
          user_id: user?.id,
          work_date: '1970-01-01',
          work_status: 'Cấu hình',
          notes: notesPayload,
          total_hours: 0,
          total_minutes: 0,
          overtime_hours: 0,
          overtime_minutes: 0,
          missing_hours: 0,
          missing_minutes: 0,
          break_duration_hours: 0,
          break_duration_minutes: 0,
        });
      } catch (backupSyncErr) {
        console.warn('Lưu dự phòng work_logs lỗi:', backupSyncErr);
      }
    } else {
      addToast('Đã lưu cài đặt giờ công & nhân viên', 'success');
    }
  };

  const getSalaryRecord = (month: number, year: number): MonthlySalaryData => {
    const key = `${year}_${month}`;
    if (salaryRecords[key]) return salaryRecords[key];
    if (workSettings?.salary_data && workSettings.salary_data[key]) {
      return workSettings.salary_data[key];
    }
    if (typeof window !== 'undefined') {
      const legacy = localStorage.getItem(`app_salary_${year}_${month}`);
      if (legacy) {
        try { return JSON.parse(legacy); } catch {}
      }
      const allRecords = localStorage.getItem('app_salary_records');
      if (allRecords) {
        try {
          const parsed = JSON.parse(allRecords);
          if (parsed[key]) return parsed[key];
        } catch {}
      }
    }
    return {
      baseSalary: 0,
      kpiBonus: 0,
      salesBonus: 0,
      otherAllowance: 0,
      insuranceDeduction: 0,
    };
  };

  const saveSalaryRecord = async (
    month: number,
    year: number,
    data: MonthlySalaryData,
    totalWorkedMinutes: number = 0,
    totalOvertimeMinutes: number = 0,
    silent: boolean = false
  ) => {
    const key = `${year}_${month}`;
    const newMap = { ...salaryRecords, [key]: data };
    setSalaryRecords(newMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_salary_records', JSON.stringify(newMap));
      localStorage.setItem(`app_salary_${year}_${month}`, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('app_salary_updated', { detail: { key, month, year, data } }));
    }

    // Calculations for cloud summary based on 208 standard hours
    const standardDays = workSettings.standard_days_per_month || 26;
    const standardHours = workSettings.standard_hours_per_day || 8;
    const standardMinutes = standardDays * standardHours * 60; // 26 * 8 * 60 = 12480 phút (208h)
    const perMinuteRate = data.baseSalary > 0 && standardMinutes > 0 ? (data.baseSalary / standardMinutes) : 0;

    // Giờ làm thực tế tính lương: tối đa 208h (12480 phút)
    const workedMinutes = totalWorkedMinutes > 0 ? totalWorkedMinutes : standardMinutes;
    const regularMinutes = Math.min(workedMinutes, standardMinutes);
    const regularSalary = regularMinutes * perMinuteRate;

    // Giờ tăng ca: Phần vượt mốc 208h hoặc tổng số phút OT
    const excessMinutes = Math.max(0, workedMinutes - standardMinutes);
    const effectiveOTMinutes = Math.max(excessMinutes, totalOvertimeMinutes);
    const overtimePay = effectiveOTMinutes > 0 ? (perMinuteRate * effectiveOTMinutes) : 0;
    const totalSalary = regularSalary + data.kpiBonus + data.salesBonus + data.otherAllowance - data.insuranceDeduction + overtimePay;

    const { client, isConfigured } = getSupabaseClient();
    if (isConfigured && client) {
      triggerCloudBackup();
      const effectiveUserId = user?.id || 'admin123';

      // 1. Broadcast Realtime message to all devices instantly
      try {
        const channel = client.channel('app_global_realtime_sync');
        channel.send({
          type: 'broadcast',
          event: 'salary_sync',
          payload: { key, month, year, data, updated_at: new Date().toISOString() }
        });
      } catch (bcErr) {
        console.warn('Realtime broadcast error:', bcErr);
      }

      // 2. Lưu bản ghi dự phòng vào work_logs qua runUpsert (Kênh đồng bộ 100% hoạt động chắc chắn nhất vì work_logs luôn tồn tại)
      try {
        const salaryLogId = toValidUUID(`salary_meta_${effectiveUserId}_${year}_${month}`);
        await runUpsert('work_logs', {
          id: salaryLogId,
          work_date: '1970-01-01',
          work_status: 'Lương tháng',
          total_hours: 0,
          break_duration_hours: 0,
          overtime_hours: 0,
          missing_hours: 0,
          notes: `[SALARY_SYNC]:${JSON.stringify({ [key]: data })}`
        }, '');
      } catch (logErr) {
        console.warn('Lỗi lưu work_logs sync salary:', logErr);
      }

      // 3. Lưu vào work_settings (có trường salary_data để đồng bộ)
      try {
        const updatedWorkSettings = {
          ...workSettings,
          salary_data: { ...(workSettings.salary_data || {}), [key]: data }
        };
        setWorkSettings(updatedWorkSettings);
        await runUpsert('work_settings', {
          id: workSettings.id ? toValidUUID(workSettings.id) : toValidUUID(`ws_${effectiveUserId}`),
          default_check_in: updatedWorkSettings.default_check_in,
          default_check_out: updatedWorkSettings.default_check_out,
          default_break_start: updatedWorkSettings.default_break_start,
          default_break_end: updatedWorkSettings.default_break_end,
          standard_hours_per_day: updatedWorkSettings.standard_hours_per_day,
          standard_days_per_month: updatedWorkSettings.standard_days_per_month,
          salary_data: updatedWorkSettings.salary_data,
        }, '');
      } catch (wsErr: any) {
        console.warn('Lỗi lưu work_settings fallback trên Cloud:', wsErr);
      }

      // 4. Lưu vào bảng chuyên dụng salary_records (nếu có)
      try {
        const recordId = toValidUUID(`sal_${effectiveUserId}_${year}_${month}`);
        await runUpsert('salary_records', {
          id: recordId,
          month,
          year,
          base_salary: data.baseSalary,
          kpi_bonus: data.kpiBonus,
          sales_bonus: data.salesBonus,
          other_allowance: data.otherAllowance,
          insurance_deduction: data.insuranceDeduction,
          total_overtime_minutes: totalOvertimeMinutes,
          overtime_pay: Math.round(overtimePay),
          total_salary: Math.round(totalSalary),
        }, '');
      } catch {
        // Handled silently by fallback channels
      }
    }

    if (!silent) {
      addToast(`Đã lưu và đồng bộ Bảng Lương Tháng ${month}/${year} lên Supabase Cloud!`, 'success');
    }
  };

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...newSettings };
    setUserSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_user_settings', JSON.stringify(updated));
    }
    await runUpsert('user_settings', {
      id: updated.id,
      theme: updated.theme,
      currency: updated.currency,
      currency_format: updated.currency_format,
      cost_calculation_method: updated.cost_calculation_method,
      monthly_budget_limit: updated.monthly_budget_limit,
      budget_warning_threshold: updated.budget_warning_threshold,
      enable_budget_alert: updated.enable_budget_alert,
      enable_email_budget_alert: updated.enable_email_budget_alert
    }, 'Đã lưu cài đặt hệ thống & ngân sách');
  };

  const saveWorkLog = async (logData: Omit<WorkLog, 'id'> & { id?: string }) => {
    const id = logData.id || generateUUID();
    const calc = calculateWorkHours(logData.check_in, logData.check_out, logData.break_start, logData.break_end, workSettings.standard_hours_per_day, logData.work_status);
    const fullLog: WorkLog = {
      ...logData, id,
      break_duration_hours: calc.breakDurationHours, break_duration_minutes: calc.breakDurationMinutes,
      total_hours: calc.totalHours, total_minutes: calc.totalMinutes,
      overtime_hours: calc.overtimeHours, overtime_minutes: calc.overtimeMinutes,
      missing_hours: calc.missingHours, missing_minutes: calc.missingMinutes,
    };
    setWorkLogs(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const next = idx >= 0 ? prev.map((l, i) => (i === idx ? fullLog : l)) : [fullLog, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_logs', JSON.stringify(next));
      }
      return next;
    });
    addToast(`Đã lưu chấm công ngày ${fullLog.work_date}`, 'success');
    void runUpsert('work_logs', {
      id: fullLog.id,
      work_date: fullLog.work_date,
      check_in: fullLog.check_in || null,
      check_out: fullLog.check_out || null,
      break_start: fullLog.break_start || null,
      break_end: fullLog.break_end || null,
      break_duration_hours: fullLog.break_duration_hours,
      total_hours: fullLog.total_hours,
      overtime_hours: fullLog.overtime_hours,
      missing_hours: fullLog.missing_hours,
      work_status: fullLog.work_status,
      notes: fullLog.notes
    }, '');
  };

  const deleteWorkLog = async (id: string) => {
    setWorkLogs(prev => {
      const next = prev.filter(l => l.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_logs', JSON.stringify(next));
      }
      return next;
    });
    addToast('Đã xóa chấm công', 'success');
    void runDelete('work_logs', id, '');
  };

  const getWorkLogsForMonth = (month: number, year: number) => {
    return workLogs.filter(l => {
      const d = new Date(l.work_date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  };

  const syncBusinessTripsToCloud = async (currentTrips: BusinessTripExpense[]) => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    const effectiveUserId = user?.id || 'admin123';

    // 1. Broadcast Realtime message tới toàn bộ các thiết bị đang mở ngay tức thì
    try {
      const channel = client.channel('app_global_realtime_sync');
      channel.send({
        type: 'broadcast',
        event: 'business_trips_sync',
        payload: { trips: currentTrips, updated_at: new Date().toISOString() }
      });
    } catch (bcErr) {
      console.warn('Realtime business trips broadcast error:', bcErr);
    }

    // 2. Lưu đồng bộ đa tầng vào work_settings & work_logs song song
    const updatedSalaryData = {
      ...(workSettings.salary_data || {}),
      _business_trips: currentTrips
    };
    setWorkSettings(prev => {
      const nextWs = { ...prev, salary_data: updatedSalaryData };
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_settings', JSON.stringify(nextWs));
      }
      return nextWs;
    });

    const backupLogId = toValidUUID(`bt_backup_${effectiveUserId}`);
    await Promise.allSettled([
      runUpsert('work_settings', {
        id: workSettings.id ? toValidUUID(workSettings.id) : toValidUUID(`ws_${effectiveUserId}`),
        salary_data: updatedSalaryData
      }, ''),
      runUpsert('work_logs', {
        id: backupLogId,
        work_date: '1970-01-01',
        work_status: 'Công tác phí',
        total_hours: 0,
        break_duration_hours: 0,
        overtime_hours: 0,
        missing_hours: 0,
        notes: `[BUSINESS_TRIP_SYNC]:${JSON.stringify(currentTrips)}`
      }, '')
    ]);
  };

  const saveBusinessTrip = async (tripData: Omit<BusinessTripExpense, 'id'> & { id?: string }) => {
    const id = tripData.id || generateUUID();
    const days = Math.max(1, Number(tripData.days_count) || 1);
    const rate = Number(tripData.daily_allowance_rate) || 160000;
    const hotel = Number(tripData.hotel_cost) || 0;
    const outbound = Number(tripData.outbound_cost) || 0;
    const returnCost = Number(tripData.return_cost) || 0;
    const totalDaily = Number(tripData.total_daily_allowance) || (days * rate);
    const grandTotal = Number(tripData.total_amount) || (totalDaily + hotel + outbound + returnCost);

    const fullTrip: BusinessTripExpense = {
      ...tripData,
      id,
      days_count: days,
      daily_allowance_rate: rate,
      total_daily_allowance: totalDaily,
      hotel_cost: hotel,
      outbound_cost: outbound,
      return_cost: returnCost,
      total_amount: grandTotal,
      is_paid: Boolean(tripData.is_paid),
      created_at: tripData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existingIdx = businessTrips.findIndex(t => t.id === id);
    const computedNextTrips = existingIdx >= 0
      ? businessTrips.map(t => t.id === id ? fullTrip : t)
      : [fullTrip, ...businessTrips];

    setBusinessTrips(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const nextTrips = idx >= 0 ? prev.map(t => t.id === id ? fullTrip : t) : [fullTrip, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(nextTrips));
      }
      return nextTrips;
    });

    addToast(`Đã lưu công tác phí ngày ${fullTrip.trip_date}`, 'success');
    void (async () => {
      await Promise.allSettled([
        runUpsert('business_trips', fullTrip, ''),
        syncBusinessTripsToCloud(computedNextTrips)
      ]);
    })();
  };

  const deleteBusinessTrip = async (id: string) => {
    const computedNextTrips = businessTrips.filter(t => t.id !== id);
    setBusinessTrips(prev => {
      const nextTrips = prev.filter(t => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(nextTrips));
      }
      return nextTrips;
    });
    addToast('Đã xóa bản ghi công tác phí', 'success');
    void (async () => {
      await Promise.allSettled([
        runDelete('business_trips', id, ''),
        syncBusinessTripsToCloud(computedNextTrips)
      ]);
    })();
  };

  const toggleBusinessTripPayment = async (id: string) => {
    const target = businessTrips.find(t => t.id === id);
    if (!target) return;
    const updatedIsPaid = !target.is_paid;
    const updatedTrip: BusinessTripExpense = {
      ...target,
      is_paid: updatedIsPaid,
      paid_at: updatedIsPaid ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    };

    const computedNextTrips = businessTrips.map(t => t.id === id ? updatedTrip : t);
    setBusinessTrips(prev => {
      const nextTrips = prev.map(t => t.id === id ? updatedTrip : t);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(nextTrips));
      }
      return nextTrips;
    });

    addToast(
      updatedIsPaid
        ? 'Đã thanh toán (Màu xanh, chuyển xuống dưới)'
        : 'Chờ thanh toán (Chữ đỏ, đưa lên đầu)',
      'success'
    );
    void (async () => {
      await Promise.allSettled([
        runUpsert('business_trips', updatedTrip, ''),
        syncBusinessTripsToCloud(computedNextTrips)
      ]);
    })();
  };


  const syncTransactionsToCloud = async (currentTransactions: Transaction[]) => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    const effectiveUserId = user?.id || 'admin123';

    // 1. Broadcast Realtime message tới toàn bộ các thiết bị đang mở ngay tức thì (<200ms)
    try {
      const channel = client.channel('app_global_realtime_sync');
      channel.send({
        type: 'broadcast',
        event: 'transactions_sync',
        payload: { transactions: currentTransactions, updated_at: new Date().toISOString() }
      });
    } catch (bcErr) {
      console.warn('Realtime transactions broadcast error:', bcErr);
    }

    // 2. Lưu đồng bộ đa tầng vào work_settings & work_logs song song
    const updatedSalaryData = {
      ...(workSettings.salary_data || {}),
      _transactions: currentTransactions
    };
    setWorkSettings(prev => {
      const nextWs = { ...prev, salary_data: updatedSalaryData };
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_settings', JSON.stringify(nextWs));
      }
      return nextWs;
    });

    const txLogId = toValidUUID(`tx_sync_global_meta`);
    await Promise.allSettled([
      runUpsert('work_settings', {
        id: workSettings.id ? toValidUUID(workSettings.id) : toValidUUID(`ws_${effectiveUserId}`),
        salary_data: updatedSalaryData
      }, ''),
      runUpsert('work_logs', {
        id: txLogId,
        work_date: '1970-01-01',
        work_status: 'Thu chi',
        total_hours: 0,
        break_duration_hours: 0,
        overtime_hours: 0,
        missing_hours: 0,
        notes: `[TRANSACTIONS_SYNC]:${JSON.stringify(currentTransactions)}`
      }, '')
    ]);
  };

  const saveTransaction = async (txData: Omit<Transaction, 'id'> & { id?: string }) => {
    const id = txData.id || generateUUID();
    const isEdit = Boolean(txData.id);
    const validCategoryId = (txData.category_id && txData.category_id.length > 0) ? txData.category_id : undefined;

    const existingCurrent = transactions.find(t => t.id === id);
    const fullTx: Transaction = validateAndSanitizeTransaction(
      {
        ...txData,
        id,
        category_id: validCategoryId !== undefined ? validCategoryId : existingCurrent?.category_id,
      },
      existingCurrent
    ) || {
      ...txData,
      id,
      amount: Number(txData.amount) || 0,
      transaction_type: (txData.transaction_type as TransactionType) || 'expense',
      transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0],
      created_at: txData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingIdx = transactions.findIndex(t => t.id === id);
    const computedNextTransactions = existingIdx >= 0
      ? transactions.map((t, i) => (i === existingIdx ? { ...fullTx } : { ...t }))
      : [{ ...fullTx }, ...transactions.map(t => ({ ...t }))];

    if (typeof window !== 'undefined') {
      localStorage.setItem('app_transactions', JSON.stringify(computedNextTransactions));
    }

    setTransactions(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = idx >= 0
        ? prev.map((t, i) => (i === idx ? { ...fullTx } : { ...t }))
        : [{ ...fullTx }, ...prev.map(t => ({ ...t }))];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_transactions', JSON.stringify(next));
      }
      return next;
    });

    const toastLabel = fullTx.transaction_type === 'investment' 
      ? 'khoản tích lũy đầu tư' 
      : fullTx.transaction_type === 'income' ? 'khoản thu' : 'khoản chi';

    const typeTitle = fullTx.transaction_type === 'investment'
      ? 'Tích lũy & Đầu tư'
      : fullTx.transaction_type === 'income'
      ? 'Thu nhập'
      : 'Chi tiêu';

    const { processId, startTime } = startTxProcess({
      txId: fullTx.id,
      title: `${isEdit ? 'Cập nhật' : 'Thêm'} ${typeTitle}: ${fullTx.category_name || 'Giao dịch'}`,
      subtitle: `${formatCurrency(fullTx.amount, userSettings.currency)} • ${fullTx.transaction_date}${fullTx.note ? ` • ${fullTx.note}` : ''}`,
      amount: fullTx.amount,
      category: fullTx.category_name,
      txType: fullTx.transaction_type,
      action: isEdit ? 'update' : 'create',
      rawPayload: fullTx,
    });

    // Giao dịch thành công ngay lập tức (Optimistic 0ms)
    addToast(`Đã lưu ${toastLabel}`, 'success');

    // Check monthly budget threshold & trigger automated alerts immediately
    const budgetLimit = userSettings.monthly_budget_limit || 0;
    const isAlertEnabled = userSettings.enable_budget_alert !== false;
    const threshold = userSettings.budget_warning_threshold || 80;

    if (fullTx.transaction_type === 'expense' && !isInvestmentTransaction(fullTx) && budgetLimit > 0 && isAlertEnabled) {
      const txMonthPrefix = fullTx.transaction_date ? fullTx.transaction_date.substring(0, 7) : new Date().toISOString().substring(0, 7);
      let updatedMonthExpenses = 0;
      computedNextTransactions.forEach(t => {
        if (t.transaction_type === 'expense' && !isInvestmentTransaction(t) && t.transaction_date && t.transaction_date.startsWith(txMonthPrefix)) {
          updatedMonthExpenses += Number(t.amount) || 0;
        }
      });

      const currentPercent = Math.round((updatedMonthExpenses / budgetLimit) * 100);
      if (currentPercent >= 100) {
        setTimeout(() => {
          addToast(
            `🚨 CẢNH BÁO VƯỢT NGÂN SÁCH: Chi tiêu tháng đã vượt ${currentPercent}% định mức (Đã chi ${formatCurrency(updatedMonthExpenses, userSettings.currency)} / Ngân sách ${formatCurrency(budgetLimit, userSettings.currency)})!`,
            'error'
          );
        }, 350);
      } else if (currentPercent >= threshold) {
        setTimeout(() => {
          addToast(
            `⚠️ CHÚ Ý NGÂN SÁCH: Chi tiêu tháng đã chạm ${currentPercent}% định mức (${formatCurrency(updatedMonthExpenses, userSettings.currency)} / ${formatCurrency(budgetLimit, userSettings.currency)})!`,
            'warning'
          );
        }, 350);
      }
    }

    // Đồng bộ ngầm lên Supabase Cloud và cập nhật trạng thái thời gian thực
    void (async () => {
      try {
        if (!navigator.onLine) {
          finalizeTxProcess(
            processId,
            startTime,
            'completed',
            'Hoàn tất (Chế độ Offline • Đã lưu trên thiết bị, tự đồng bộ khi có mạng)'
          );
          return;
        }
        const [upsertRes] = await Promise.allSettled([
          runUpsert('transactions', fullTx, ''),
          syncTransactionsToCloud(computedNextTransactions)
        ]);
        if (upsertRes.status === 'fulfilled' && upsertRes.value?.error && !upsertRes.value?.localOnly && !upsertRes.value?.pendingSync) {
          finalizeTxProcess(
            processId,
            startTime,
            'error',
            'Lỗi đồng bộ Cloud (Đã lưu an toàn trên thiết bị & kênh dự phòng)',
            upsertRes.value.error?.message || 'Lỗi kết nối máy chủ'
          );
        } else {
          finalizeTxProcess(
            processId,
            startTime,
            'completed',
            'Hoàn tất • Đã lưu thiết bị & đồng bộ đám mây thành công'
          );
        }
      } catch (err: any) {
        finalizeTxProcess(
          processId,
          startTime,
          'error',
          'Lỗi kết nối đám mây (Đã lưu an toàn trên thiết bị)',
          err?.message || String(err)
        );
      }
    })();
  };

  const deleteTransaction = async (id: string) => {
    const targetTx = transactions.find(t => t.id === id);
    const computedNextTransactions = transactions.filter(t => t.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_transactions', JSON.stringify(computedNextTransactions));
    }
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_transactions', JSON.stringify(next));
      }
      return next;
    });

    const { processId, startTime } = startTxProcess({
      txId: id,
      title: `Xóa giao dịch: ${targetTx?.category_name || 'Thu chi'}`,
      subtitle: targetTx ? `${formatCurrency(targetTx.amount, userSettings.currency)} • ${targetTx.transaction_date}` : `ID: ${id.substring(0, 8)}`,
      amount: targetTx?.amount,
      category: targetTx?.category_name,
      txType: targetTx?.transaction_type || 'expense',
      action: 'delete',
    });

    addToast('Đã xóa giao dịch', 'success');
    void (async () => {
      try {
        await Promise.allSettled([
          runDelete('transactions', id, ''),
          syncTransactionsToCloud(computedNextTransactions)
        ]);
        finalizeTxProcess(processId, startTime, 'completed', 'Hoàn tất • Đã xóa giao dịch và đồng bộ Cloud');
      } catch (err: any) {
        finalizeTxProcess(processId, startTime, 'error', 'Lỗi đồng bộ xóa Cloud', err?.message);
      }
    })();
  };

  const saveCategory = async (catData: Omit<ExpenseCategory, 'id'> & { id?: string }): Promise<ExpenseCategory> => {
    const id = catData.id || generateUUID();
    const fullCat: ExpenseCategory = { ...catData, id, is_default: false };
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const next = idx >= 0 ? prev.map((c, i) => (i === idx ? fullCat : c)) : [fullCat, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_categories', JSON.stringify(next));
      }
      return next;
    });
    addToast('Đã lưu danh mục', 'success');
    void runUpsert('expense_categories', fullCat, '');
    return fullCat;
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_categories', JSON.stringify(next));
      }
      return next;
    });
    addToast('Đã xóa danh mục', 'success');
    void runDelete('expense_categories', id, '');
  };

  const syncInvestmentAssetsToCloud = async (assetsToSync: InvestmentAsset[]) => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client || isDemoUserRef.current) return;

    const effectiveUserId = userRef.current?.id || 'admin123';

    // 1. Broadcast Realtime message tới các tab/thiết bị đang mở
    try {
      const channel = client.channel('app_global_realtime_sync');
      channel.send({
        type: 'broadcast',
        event: 'investment_assets_sync',
        payload: { assets: assetsToSync, updated_at: new Date().toISOString() },
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast asset error:', bcErr);
    }

    // 2. Đồng bộ đa tầng vào work_settings._investment_assets & work_logs ([INVESTMENT_ASSETS_SYNC]) & bảng investment_assets
    const currentWs = workSettingsRef.current;
    const updatedSalaryData = {
      ...(currentWs.salary_data || {}),
      _investment_assets: assetsToSync,
    };
    setWorkSettings((prev) => {
      const nextWs = {
        ...prev,
        salary_data: { ...(prev.salary_data || {}), _investment_assets: assetsToSync },
        _investment_assets: assetsToSync,
      } as WorkSettings;
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_settings', JSON.stringify(nextWs));
      }
      return nextWs;
    });

    const assetLogId = toValidUUID('asset_sync_global_meta');
    const wsId = currentWs.id ? toValidUUID(currentWs.id) : toValidUUID(`ws_${effectiveUserId}`);

    await Promise.allSettled([
      runUpsert(
        'work_settings',
        {
          id: wsId,
          salary_data: updatedSalaryData,
          updated_at: new Date().toISOString(),
        },
        ''
      ),
      runUpsert(
        'work_logs',
        {
          id: assetLogId,
          work_date: '1970-01-01',
          work_status: 'Đầu tư',
          total_hours: 0,
          break_duration_hours: 0,
          overtime_hours: 0,
          missing_hours: 0,
          notes: `[INVESTMENT_ASSETS_SYNC]:${JSON.stringify(assetsToSync)}`,
        },
        ''
      ),
      ...assetsToSync.map(async (asset) => {
        const res = await runUpsert(
          'investment_assets',
          {
            id: asset.id,
            asset_name: asset.asset_name,
            asset_symbol: asset.asset_symbol,
            asset_type: asset.asset_type,
            current_price: Number(asset.current_price) || 0,
            price_updated_at: asset.price_updated_at || new Date().toISOString(),
            notes: asset.notes || null,
          },
          ''
        );
        // Đảm bảo lệnh UPDATE trực tiếp theo id cũng chạy trong trường hợp hàng đã tồn tại với user_id khác
        if (res.error) {
          await raceWithTimeout(
            client
              .from('investment_assets')
              .update({
                asset_name: asset.asset_name,
                asset_symbol: asset.asset_symbol,
                asset_type: asset.asset_type,
                current_price: Number(asset.current_price) || 0,
                price_updated_at: asset.price_updated_at || new Date().toISOString(),
                notes: asset.notes || null,
              })
              .eq('id', asset.id),
            3000
          ).catch(() => {});
        }
      }),
    ]);
  };

  const saveInvestmentAsset = async (assetData: Omit<InvestmentAsset, 'id'> & { id?: string }) => {
    const cleanSym = assetData.asset_symbol.trim().toUpperCase();
    const currentAssets = investmentAssetsRef.current;
    const existingIdx = currentAssets.findIndex(
      (a) => a.asset_symbol.toUpperCase() === cleanSym && a.id !== assetData.id
    );
    if (existingIdx >= 0) {
      addToast(`Mã tài sản ${cleanSym} đã tồn tại trong danh mục!`, 'error');
      throw new Error('Duplicate asset symbol');
    }

    const id = assetData.id || generateUUID();
    const nowIso = assetData.price_updated_at || new Date().toISOString();
    const fullAsset: InvestmentAsset = {
      ...assetData,
      id,
      asset_symbol: cleanSym,
      current_price: Number(assetData.current_price) || 0,
      price_updated_at: nowIso,
    };

    const idxInCurrent = currentAssets.findIndex((a) => a.id === id);
    const computedNextAssets =
      idxInCurrent >= 0
        ? currentAssets.map((a) => (a.id === id ? fullAsset : a))
        : [fullAsset, ...currentAssets];

    investmentAssetsRef.current = computedNextAssets;
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_investment_assets', JSON.stringify(computedNextAssets));
      forceUpdateAssetPriceCache([
        {
          id: fullAsset.id,
          symbol: fullAsset.asset_symbol,
          current_price: fullAsset.current_price,
          price_updated_at: fullAsset.price_updated_at,
        },
      ]);
    }

    setInvestmentAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      const nextAssets = idx >= 0 ? prev.map((a) => (a.id === id ? fullAsset : a)) : [fullAsset, ...prev];
      investmentAssetsRef.current = nextAssets;
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_investment_assets', JSON.stringify(nextAssets));
      }
      return nextAssets;
    });

    addToast(`Đã lưu tài sản ${fullAsset.asset_symbol}`, 'success');
    void syncInvestmentAssetsToCloud(computedNextAssets);
  };

  const updateAssetPrice = async (assetId: string, newPrice: number) => {
    const nowIso = new Date().toISOString();
    const numericPrice = Number(newPrice) || 0;
    let updatedSnapshot: InvestmentAsset[] = [];

    setInvestmentAssets((prev) => {
      const next = prev.map((a) =>
        a.id === assetId ? { ...a, current_price: numericPrice, price_updated_at: nowIso } : a
      );
      updatedSnapshot = next;
      investmentAssetsRef.current = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_investment_assets', JSON.stringify(next));
        const target = next.find((a) => a.id === assetId);
        if (target) {
          forceUpdateAssetPriceCache([
            {
              id: target.id,
              symbol: target.asset_symbol,
              current_price: numericPrice,
              price_updated_at: nowIso,
            },
          ]);
        }
      }
      return next;
    });

    triggerCloudBackup();
    if (updatedSnapshot.length > 0) {
      void syncInvestmentAssetsToCloud(updatedSnapshot);
    }
  };

  const deleteInvestmentAsset = async (id: string) => {
    const computedNextAssets = investmentAssetsRef.current.filter((a) => a.id !== id);
    investmentAssetsRef.current = computedNextAssets;
    setInvestmentAssets((prev) => {
      const nextAssets = prev.filter((a) => a.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_investment_assets', JSON.stringify(nextAssets));
      }
      return nextAssets;
    });

    addToast('Đã xóa tài sản', 'success');

    void (async () => {
      await Promise.allSettled([
        syncInvestmentAssetsToCloud(computedNextAssets),
        runDelete('investment_assets', id, ''),
      ]);
    })();
  };

  const syncInvestmentTxsToCloud = async (currentTxs: InvestmentTransaction[]) => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    const effectiveUserId = user?.id || 'admin123';

    // 1. Broadcast Realtime message tới toàn bộ các thiết bị đang mở ngay tức thì (<200ms)
    try {
      const channel = client.channel('app_global_realtime_sync');
      channel.send({
        type: 'broadcast',
        event: 'investment_sync',
        payload: { transactions: currentTxs, updated_at: new Date().toISOString() }
      });
    } catch (bcErr) {
      console.warn('Realtime investment_sync broadcast error:', bcErr);
    }

    // 2. Lưu đồng bộ đa tầng vào work_settings & work_logs song song
    const updatedSalaryData = {
      ...(workSettings.salary_data || {}),
      _investment_txs: currentTxs
    };
    setWorkSettings(prev => {
      const nextWs = { ...prev, salary_data: updatedSalaryData, _investment_txs: currentTxs };
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_work_settings', JSON.stringify(nextWs));
      }
      return nextWs;
    });

    const itxLogId = toValidUUID('itx_sync_global_meta');
    await Promise.allSettled([
      runUpsert('work_settings', {
        id: workSettings.id ? toValidUUID(workSettings.id) : toValidUUID(`ws_${effectiveUserId}`),
        salary_data: updatedSalaryData,
        updated_at: new Date().toISOString()
      }, ''),
      runUpsert('work_logs', {
        id: itxLogId,
        work_date: '1970-01-01',
        work_status: 'Đầu tư',
        total_hours: 0,
        break_duration_hours: 0,
        overtime_hours: 0,
        missing_hours: 0,
        notes: `[INVESTMENTS_SYNC]:${JSON.stringify(currentTxs)}`
      }, '')
    ]);
  };

  const saveInvestmentTransaction = async (txData: any) => {
    const id = txData.id || generateUUID();
    const txType = txData.transaction_type || txData.tx_type || 'buy';
    const txDate = txData.transaction_date || txData.tx_date || new Date().toISOString().split('T')[0];
    const txQty = Number(txData.quantity ?? txData.units ?? 0);
    const txPrice = Number(txData.price ?? txData.price_per_unit ?? 0);
    const txFee = Number(txData.fee ?? 0);
    const rawNote = (txData.note || txData.notes || '').replace(/\[DIVIDEND_META\]:\{.*?\}/g, '').trim();

    let dividendType = txData.dividend_type as 'cash' | 'stock' | undefined;
    if (txType === 'dividend' && !dividendType) {
      dividendType = (txQty === 0 || (txPrice > 0 && txQty === 0)) ? 'cash' : 'stock';
    }

    let totalAmount = Number(txData.total_amount);
    if (!totalAmount || isNaN(totalAmount)) {
      if (txType === 'dividend') {
        if (dividendType === 'cash') {
          totalAmount = Math.max(0, txPrice - txFee);
        } else {
          totalAmount = txFee;
        }
      } else if (txType === 'buy') {
        totalAmount = txQty * txPrice + txFee;
      } else {
        totalAmount = Math.max(0, txQty * txPrice - txFee);
      }
    }

    let fullNote = rawNote;
    if (txType === 'dividend' || dividendType) {
      const meta = {
        dividend_type: dividendType || 'cash',
        total_amount: totalAmount,
        price: txPrice,
        quantity: txQty,
        fee: txFee,
      };
      fullNote = `${rawNote} [DIVIDEND_META]:${JSON.stringify(meta)}`.trim();
    }

    const existingCurrent = investmentTransactions.find(t => t.id === id);
    const fullTx: InvestmentTransaction = {
      ...(existingCurrent || {}),
      ...txData,
      id,
      asset_id: txData.asset_id || existingCurrent?.asset_id || '',
      transaction_type: txType,
      dividend_type: dividendType,
      transaction_date: txDate,
      quantity: txQty,
      price: txPrice,
      price_per_unit: txPrice,
      total_amount: totalAmount,
      fee: txFee,
      note: fullNote,
      created_at: txData.created_at || existingCurrent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingIdx = investmentTransactions.findIndex(t => t.id === id);
    const computedUpdatedTxs = existingIdx >= 0
      ? investmentTransactions.map((t, i) => (i === existingIdx ? { ...fullTx } : t))
      : [{ ...fullTx }, ...investmentTransactions];

    if (typeof window !== 'undefined') {
      localStorage.setItem('app_investment_txs', JSON.stringify(computedUpdatedTxs));
    }

    setInvestmentTransactions(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const updatedTxs = idx >= 0 ? prev.map((t, i) => i === idx ? { ...fullTx } : t) : [{ ...fullTx }, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_investment_txs', JSON.stringify(updatedTxs));
      }
      return updatedTxs;
    });

    const matchedAsset = investmentAssets.find(a => a.id === fullTx.asset_id);

    // If Cash Dividend, also mirror into General Finance Transactions (Income) immediately
    if (txType === 'dividend' && dividendType === 'cash' && totalAmount > 0) {
      const incId = toValidUUID(`div_inc_${fullTx.id}`);
      const assetSym = matchedAsset?.asset_symbol || '';
      const incTx: Transaction = {
        id: incId,
        amount: totalAmount,
        transaction_type: 'income',
        category_name: 'Cổ tức / Đầu tư',
        transaction_date: txDate,
        note: `Nhận cổ tức tiền mặt ${assetSym} [INVESTMENT_DIVIDEND_LINK]:${fullTx.id} ${rawNote}`.trim(),
      };
      setTransactions(prev => {
        const idx = prev.findIndex(t => t.id === incId);
        const next = idx >= 0 ? prev.map(t => t.id === incId ? incTx : t) : [incTx, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_transactions', JSON.stringify(next));
        }
        return next;
      });
      void runUpsert('transactions', incTx, '');
    }

    const toastMsg = txType === 'dividend' && dividendType === 'cash'
      ? `Đã ghi nhận nhận cổ tức tiền mặt +${totalAmount.toLocaleString('vi-VN')} đ (tính vào chốt lời)`
      : txType === 'dividend'
      ? `Đã ghi nhận nhận cổ tức +${txQty} cổ phiếu thưởng (kéo giảm giá vốn DCA)`
      : 'Đã ghi nhận lệnh giao dịch đầu tư';

    const { processId, startTime } = startTxProcess({
      txId: fullTx.id,
      title: `Lệnh đầu tư (${txType === 'buy' ? 'Mua' : txType === 'sell' ? 'Bán' : 'Cổ tức'}): ${matchedAsset?.asset_symbol || 'Tài sản'}`,
      subtitle: `${formatCurrency(totalAmount, userSettings.currency)} • SL: ${txQty} • ${txDate}`,
      amount: totalAmount,
      category: matchedAsset?.asset_symbol || 'Đầu tư',
      txType: 'investment',
      action: txData.id ? 'update' : 'create',
      rawPayload: fullTx,
    });

    addToast(toastMsg, 'success');

    // Background Cloud Sync
    void (async () => {
      try {
        if (matchedAsset && !isDemoUser) {
          void runUpsert('investment_assets', {
            id: matchedAsset.id,
            asset_name: matchedAsset.asset_name,
            asset_symbol: matchedAsset.asset_symbol,
            asset_type: matchedAsset.asset_type,
            current_price: matchedAsset.current_price,
            price_updated_at: matchedAsset.price_updated_at,
            notes: matchedAsset.notes
          }, '');
        }

        await Promise.allSettled([
          syncInvestmentTxsToCloud(computedUpdatedTxs),
          runUpsert('investment_transactions', {
            id: fullTx.id,
            asset_id: fullTx.asset_id,
            transaction_type: fullTx.transaction_type,
            transaction_date: fullTx.transaction_date,
            quantity: fullTx.quantity,
            price: fullTx.price,
            fee: fullTx.fee,
            note: fullTx.note
          }, '')
        ]);
        finalizeTxProcess(processId, startTime, 'completed', 'Hoàn tất • Đã ghi nhận lệnh đầu tư & đồng bộ Cloud');
      } catch (err: any) {
        finalizeTxProcess(processId, startTime, 'error', 'Lỗi đồng bộ Cloud (Đã lưu an toàn trên máy)', err?.message);
      }
    })();
  };

  const deleteInvestmentTransaction = async (id: string) => {
    const computedUpdatedTxs = investmentTransactions.filter(t => t.id !== id);
    setInvestmentTransactions(prev => {
      const updatedTxs = prev.filter(t => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_investment_txs', JSON.stringify(updatedTxs));
      }
      return updatedTxs;
    });

    const linkedIncId = toValidUUID(`div_inc_${id}`);
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== linkedIncId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_transactions', JSON.stringify(next));
      }
      return next;
    });

    addToast('Đã xóa giao dịch đầu tư', 'success');

    void (async () => {
      await Promise.allSettled([
        runDelete('transactions', linkedIncId, ''),
        syncInvestmentTxsToCloud(computedUpdatedTxs),
        runDelete('investment_transactions', id, '')
      ]);
    })();
  };

  const takeDailySnapshot = async (totalValue: number, totalCost: number) => {
    if (isDemoUser || !user || totalCost <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    const existing = portfolioSnapshots.find(s => s.snapshot_date === today);
    
    // Nếu giá trị không đổi so với hiện tại, bỏ qua (tối ưu hóa)
    if (existing && existing.total_value === totalValue && existing.total_cost === totalCost) return;

    const newSnapshot: PortfolioSnapshot = {
      id: existing ? existing.id : crypto.randomUUID(),
      user_id: user.id,
      snapshot_date: today,
      total_value: totalValue,
      total_cost: totalCost,
      total_profit: totalValue - totalCost,
      profit_percentage: ((totalValue - totalCost) / totalCost) * 100,
      created_at: existing ? existing.created_at : new Date().toISOString()
    };

    setPortfolioSnapshots(prev => {
      const filtered = prev.filter(s => s.snapshot_date !== today);
      return [...filtered, newSnapshot].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    });

    const { client } = getSupabaseClient();
    if (client) {
      if (existing) {
        const { error } = await client.from('portfolio_snapshots').update({
          total_value: newSnapshot.total_value,
          total_cost: newSnapshot.total_cost,
          total_profit: newSnapshot.total_profit,
          profit_percentage: newSnapshot.profit_percentage
        }).eq('id', existing.id);
        if (error) console.error('Lỗi khi cập nhật snapshot:', error);
      } else {
        const { error } = await client.from('portfolio_snapshots').insert(newSnapshot);
        if (error) console.error('Lỗi khi lưu snapshot mới:', error);
      }
    }
  };

  const refreshMarketPrices = useCallback(async (silent = false, skipCloudSave = false) => {
    if (isRefreshingPrices) return;
    setIsRefreshingPrices(true);
    try {
      const currentList = investmentAssetsRef.current;
      if (!currentList || currentList.length === 0) return;

      const priceUpdates = await priceService.fetchBatchPrices(currentList);
      const nowIso = new Date().toISOString();
      let updatedSnapshot: InvestmentAsset[] | null = null;

      setInvestmentAssets((prev) => {
        let hasChanges = false;
        const cacheEntries: { id: string; symbol: string; current_price: number; price_updated_at: string }[] = [];

        const updatedAssets = prev.map((a) => {
          const update = priceUpdates[a.id];
          if (update && update.price && update.price > 0) {
            cacheEntries.push({
              id: a.id,
              symbol: a.asset_symbol,
              current_price: update.price,
              price_updated_at: nowIso,
            });
            if (update.price !== a.current_price) {
              hasChanges = true;
              return { ...a, current_price: update.price, price_updated_at: nowIso };
            }
          }
          return a;
        });

        if (cacheEntries.length > 0) {
          forceUpdateAssetPriceCache(cacheEntries);
        }

        if (!hasChanges) return prev;

        updatedSnapshot = updatedAssets;
        investmentAssetsRef.current = updatedAssets;
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_investment_assets', JSON.stringify(updatedAssets));
        }
        return updatedAssets;
      });

      if (updatedSnapshot && !isDemoUserRef.current && !skipCloudSave) {
        void syncInvestmentAssetsToCloud(updatedSnapshot);
      }

      if (!silent) addToast('Đã cập nhật giá thị trường', 'success');
    } catch (err) {
      if (!silent) addToast('Lỗi cập nhật giá thị trường', 'error');
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [isRefreshingPrices, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (investmentAssetsRef.current.length > 0) {
        void refreshMarketPrices(true, false);
      }
    }, 1000);

    const interval = setInterval(() => {
      if (investmentAssetsRef.current.length > 0) {
        void refreshMarketPrices(true, false);
      }
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refreshMarketPrices]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = userSettings.theme === 'dark' || (userSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [userSettings.theme]);

  const saveProject = async (projData: Omit<Project, 'id'> & { id?: string }) => {
    const id = projData.id || generateUUID();
    const newProj: Project = {
      ...projData,
      id,
      user_id: user?.id || 'admin123',
      updated_at: new Date().toISOString(),
      created_at: (projData as any).created_at || new Date().toISOString(),
    };

    setProjects(prev => {
      const exists = prev.some(p => p.id === id);
      const updated = exists ? prev.map(p => p.id === id ? newProj : p) : [newProj, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_projects', JSON.stringify(updated));
      }
      return updated;
    });

    const { client, isConfigured } = getSupabaseClient();
    if (isConfigured && client) {
      try {
        await client.from('projects').upsert(newProj);
      } catch (e) {
        // Supabase table fallback
      }
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_projects', JSON.stringify(updated));
      }
      return updated;
    });

    const { client, isConfigured } = getSupabaseClient();
    if (isConfigured && client) {
      try {
        await client.from('projects').delete().eq('id', id);
      } catch (e) {
        // Supabase table fallback
      }
    }
  };

  const clearAllData = () => {
    setWorkSettings(DEFAULT_WORK_SETTINGS);
    setUserSettings(DEFAULT_USER_SETTINGS);
    setWorkLogs([]);
    setBusinessTrips([]);
    setCategories(DEFAULT_EXPENSE_CATEGORIES);
    setTransactions([]);
    setInvestmentAssets([]);
    setInvestmentTransactions([]);
    setPortfolioSnapshots([]);
    setSalaryRecords({});
    setProjects([]);
    localStorage.removeItem('app_work_logs');
    localStorage.removeItem('app_business_trips');
    localStorage.removeItem('app_transactions');
    localStorage.removeItem('app_investment_assets');
    localStorage.removeItem('app_investment_txs');
    localStorage.removeItem('app_portfolio_snapshots');
    localStorage.removeItem('app_salary_records');
    localStorage.removeItem('app_projects');
    triggerCloudBackup(false);
    addToast('Đã xóa toàn bộ dữ liệu', 'success');
  };

  const resetToSampleData = () => {
    setWorkSettings(DEFAULT_WORK_SETTINGS);
    setUserSettings(DEFAULT_USER_SETTINGS);
    setWorkLogs(getInitialWorkLogs());
    setBusinessTrips(getInitialBusinessTrips());
    setCategories(DEFAULT_EXPENSE_CATEGORIES);
    setTransactions(getInitialTransactions());
    setInvestmentAssets(getInitialInvestmentAssets());
    setInvestmentTransactions(getInitialInvestmentTransactions());
    setPortfolioSnapshots(getInitialPortfolioSnapshots());
    setSalaryRecords({});
    setProjects(getInitialProjects());
    localStorage.setItem('app_projects', JSON.stringify(getInitialProjects()));
    triggerCloudBackup(false);
    addToast('Đã nạp lại dữ liệu mẫu thành công', 'success');
  };

  /**
   * Backup full application state snapshot directly to Cloudflare R2 S3 storage
   */
  const backupToCloudflareR2 = async (): Promise<boolean> => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('Đang sao lưu toàn bộ dữ liệu lên Cloudflare R2...');

      const payload: R2BackupPayload = {
        workLogs,
        workSettings,
        businessTrips,
        salaryRecords,
        transactions,
        categories,
        investmentAssets,
        investmentTransactions,
        portfolioSnapshots,
        userSettings,
        backupTimestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        totalRecords: workLogs.length + (businessTrips?.length || 0) + transactions.length + investmentAssets.length + investmentTransactions.length + portfolioSnapshots.length + Object.keys(salaryRecords).length,
      };

      const result = await r2Service.saveBackup(payload);

      if (result.success) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncMessage('Sao lưu Cloudflare R2 thành công');
        addToast(`Đã sao lưu thành công lên Cloudflare R2 (${result.key})`, 'success');
        return true;
      } else {
        throw new Error(result.error || 'Lỗi sao lưu R2');
      }
    } catch (err: any) {
      console.error('[Cloudflare R2] Backup error:', err);
      setSyncStatus('error');
      setSyncMessage('Lỗi sao lưu Cloudflare R2');
      addToast(`Lỗi sao lưu R2: ${err.message || String(err)}`, 'error');
      return false;
    }
  };

  /**
   * Restore full application state snapshot from Cloudflare R2 S3 storage
   */
  const restoreFromCloudflareR2 = async (key: string): Promise<boolean> => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('Đang tải và khôi phục dữ liệu từ Cloudflare R2...');

      const result = await r2Service.getBackup(key);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Không thể đọc bản sao lưu');
      }

      const backup = result.data;

      if (backup.workSettings) setWorkSettings(backup.workSettings);
      if (backup.userSettings) setUserSettings(backup.userSettings);
      if (backup.salaryRecords) setSalaryRecords(backup.salaryRecords);
      if (Array.isArray(backup.workLogs)) setWorkLogs(backup.workLogs);
      if (Array.isArray(backup.businessTrips)) {
        setBusinessTrips(backup.businessTrips);
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_business_trips', JSON.stringify(backup.businessTrips));
        }
      }
      if (Array.isArray(backup.categories)) setCategories(backup.categories);
      if (Array.isArray(backup.transactions)) setTransactions(backup.transactions);
      if (Array.isArray(backup.investmentAssets)) setInvestmentAssets(backup.investmentAssets);
      if (Array.isArray(backup.investmentTransactions)) setInvestmentTransactions(backup.investmentTransactions);
      if (Array.isArray(backup.portfolioSnapshots)) setPortfolioSnapshots(backup.portfolioSnapshots);

      // If user is authenticated with Supabase, sync restored data up to Supabase
      if (!isDemoUser && user) {
        const { client } = getSupabaseClient();
        if (client) {
          try {
            if (backup.workSettings) await client.from('work_settings').upsert({ ...backup.workSettings, user_id: user.id });
            if (backup.userSettings) await client.from('user_settings').upsert({ ...backup.userSettings, user_id: user.id });
            if (backup.workLogs?.length) await client.from('work_logs').upsert(backup.workLogs.map(l => ({ ...l, user_id: user.id })));
            if (backup.businessTrips?.length) await client.from('business_trips').upsert(backup.businessTrips.map(bt => ({ ...bt, user_id: user.id })));
            if (backup.categories?.length) await client.from('expense_categories').upsert(backup.categories.map(c => ({ ...c, user_id: user.id })));
            if (backup.transactions?.length) await client.from('transactions').upsert(backup.transactions.map(t => ({ ...t, user_id: user.id })));
            if (backup.investmentAssets?.length) await client.from('investment_assets').upsert(backup.investmentAssets.map(a => ({ ...a, user_id: user.id })));
            if (backup.investmentTransactions?.length) await client.from('investment_transactions').upsert(backup.investmentTransactions.map(it => ({ ...it, user_id: user.id })));
            if (backup.portfolioSnapshots?.length) await client.from('portfolio_snapshots').upsert(backup.portfolioSnapshots.map(s => ({ ...s, user_id: user.id })));
          } catch (cloudErr) {
            console.warn('Lỗi khi đồng bộ dữ liệu phục hồi lên Supabase:', cloudErr);
          }
        }
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncMessage('Đã khôi phục dữ liệu từ Cloudflare R2 thành công');
      addToast('Khôi phục dữ liệu từ Cloudflare R2 thành công!', 'success');
      return true;
    } catch (err: any) {
      console.error('[Cloudflare R2] Restore error:', err);
      setSyncStatus('error');
      setSyncMessage('Lỗi khôi phục Cloudflare R2');
      addToast(`Lỗi khôi phục R2: ${err.message || String(err)}`, 'error');
      return false;
    }
  };

  const sendTransactionalEmailNotification = async (payload: SendEmailPayload): Promise<SendEmailResponse> => {
    try {
      const res = await emailService.sendEmail(payload);
      if (res.success) {
        addToast(`Đã gửi Transactional Email: ${res.subject}`, 'success');
      } else {
        addToast(`Không thể gửi email: ${res.error || 'Lỗi không xác định'}`, 'error');
      }
      return res;
    } catch (err: any) {
      addToast(`Lỗi gửi Transactional Email: ${err.message || String(err)}`, 'error');
      throw err;
    }
  };

  const retryTransactionSync = async (processId: string) => {
    const target = txProcessLogs.find(item => item.id === processId);
    if (!target) return;

    const startTime = Date.now();
    setTxProcessLogs(prev =>
      prev.map(item =>
        item.id === processId
          ? {
              ...item,
              status: 'processing',
              step: 'cloud_syncing',
              stepMessage: 'Đang thử đồng bộ lại lên Cloud...',
              progress: 65,
              errorDetail: undefined,
            }
          : item
      )
    );
    setActiveTxProcess(curr =>
      curr?.id === processId
        ? {
            ...curr,
            status: 'processing',
            step: 'cloud_syncing',
            stepMessage: 'Đang thử đồng bộ lại lên Cloud...',
            progress: 65,
            errorDetail: undefined,
          }
        : curr
    );

    try {
      if (target.txType === 'investment' && target.rawPayload) {
        await Promise.allSettled([
          syncInvestmentTxsToCloud(investmentTransactions),
          runUpsert('investment_transactions', target.rawPayload, '')
        ]);
      } else if (target.rawPayload) {
        await Promise.allSettled([
          runUpsert('transactions', target.rawPayload, ''),
          syncTransactionsToCloud(transactions)
        ]);
      } else {
        await syncWithSupabase(false);
      }
      finalizeTxProcess(processId, startTime, 'completed', 'Hoàn tất • Đã đồng bộ lại thành công');
      addToast('Đã đồng bộ lại giao dịch thành công!', 'success');
    } catch (err: any) {
      finalizeTxProcess(processId, startTime, 'error', 'Lỗi kết nối • Vẫn được bảo toàn trên thiết bị', err?.message);
    }
  };

  return (
    <DataContext.Provider value={{
      workSettings, workLogs, businessTrips, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots,
      salaryRecords, projects, userSettings, calculatedHoldings, toasts, loadingData, isOnline, syncStatus, lastSyncedAt, syncMessage, isRefreshingPrices,
      updateWorkSettings, saveSalaryRecord, getSalaryRecord, saveWorkLog, deleteWorkLog, getWorkLogsForMonth,
      saveBusinessTrip, deleteBusinessTrip, toggleBusinessTripPayment,
      saveTransaction, deleteTransaction,
      saveCategory, deleteCategory, saveInvestmentAsset, updateAssetPrice, deleteInvestmentAsset,
      saveInvestmentTransaction, deleteInvestmentTransaction, saveProject, deleteProject, refreshMarketPrices, takeDailySnapshot, updateUserSettings,
      addToast, removeToast, clearAllData, resetToSampleData, syncWithSupabase, triggerCloudBackup,
      backupToCloudflareR2, restoreFromCloudflareR2, sendTransactionalEmailNotification,
      txProcessLogs, activeTxProcess, retryTransactionSync, clearTxProcessLogs, dismissActiveTxProcess
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
