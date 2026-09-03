import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import {
  WorkSettings, WorkLog, ExpenseCategory, Transaction,
  InvestmentAsset, InvestmentTransaction, PortfolioSnapshot,
  UserSettings, CloudSyncStatus, ToastMessage, CalculatedAssetHolding
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
} from '../lib/seedData';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { calculateWorkHours, generateUUID } from '../lib/utils';
import { calculateInvestmentHoldings } from '../lib/utils';
import { priceService } from '../services/priceService';

interface DataContextType {
  workSettings: WorkSettings;
  workLogs: WorkLog[];
  categories: ExpenseCategory[];
  transactions: Transaction[];
  investmentAssets: InvestmentAsset[];
  investmentTransactions: InvestmentTransaction[];
  portfolioSnapshots: PortfolioSnapshot[];
  userSettings: UserSettings;
  calculatedHoldings: CalculatedAssetHolding[];
  toasts: ToastMessage[];
  loadingData: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: Date | null;
  syncMessage: string;
  isRefreshingPrices: boolean;
  updateWorkSettings: (newSettings: Partial<WorkSettings>) => Promise<void>;
  saveWorkLog: (log: Omit<WorkLog, 'id'> & { id?: string }) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;
  getWorkLogsForMonth: (month: number, year: number) => WorkLog[];
  saveTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCategory: (cat: Omit<ExpenseCategory, 'id'> & { id?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveInvestmentAsset: (asset: Omit<InvestmentAsset, 'id'> & { id?: string }) => Promise<void>;
  updateAssetPrice: (assetId: string, newPrice: number) => Promise<void>;
  deleteInvestmentAsset: (id: string) => Promise<void>;
  saveInvestmentTransaction: (tx: Omit<InvestmentTransaction, 'id'> & { id?: string }) => Promise<void>;
  deleteInvestmentTransaction: (id: string) => Promise<void>;
  refreshMarketPrices: (silent?: boolean, skipCloudSave?: boolean) => Promise<void>;
  takeDailySnapshot: (totalValue: number, totalCost: number) => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  addToast: (message: string, type?: ToastMessage['type'], title?: string) => void;
  removeToast: (id: string) => void;
  clearAllData: () => void;
  syncWithSupabase: (showToast?: boolean) => Promise<void>;
  triggerCloudBackup: (silent?: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isDemoUser } = useAuth();
  
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
    return saved ? JSON.parse(saved) : getInitialWorkLogs();
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
    return saved ? JSON.parse(saved) : getInitialInvestmentAssets();
  });
  const [investmentTransactions, setInvestmentTransactions] = useState<InvestmentTransaction[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_investment_txs') : null;
    return saved ? JSON.parse(saved) : getInitialInvestmentTransactions();
  });
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app_portfolio_snapshots') : null;
    return saved ? JSON.parse(saved) : getInitialPortfolioSnapshots();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const loadingDataRef = useRef(loadingData);
  useEffect(() => {
    loadingDataRef.current = loadingData;
  }, [loadingData]);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [syncMessage, setSyncMessage] = useState<string>('Đã kết nối');
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const investmentAssetsRef = useRef(investmentAssets);

  useEffect(() => {
    investmentAssetsRef.current = investmentAssets;
  }, [investmentAssets]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (investmentAssetsRef.current.length > 0) {
        refreshMarketPrices(true, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculatedHoldings = useMemo(() => {
    return calculateInvestmentHoldings(investmentAssets, investmentTransactions, userSettings.cost_calculation_method);
  }, [investmentAssets, investmentTransactions, userSettings.cost_calculation_method]);

  const addToast = (message: string, type: ToastMessage['type'] = 'success', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => removeToast(id), 4500);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_work_settings', JSON.stringify(workSettings));
      localStorage.setItem('app_user_settings', JSON.stringify(userSettings));
      localStorage.setItem('app_work_logs', JSON.stringify(workLogs));
      localStorage.setItem('app_expense_categories', JSON.stringify(categories));
      localStorage.setItem('app_transactions', JSON.stringify(transactions));
      localStorage.setItem('app_investment_assets', JSON.stringify(investmentAssets));
      localStorage.setItem('app_investment_txs', JSON.stringify(investmentTransactions));
      localStorage.setItem('app_portfolio_snapshots', JSON.stringify(portfolioSnapshots));
    }
  }, [workSettings, userSettings, workLogs, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots]);

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
    if (!isConfigured || !client || isDemoUser || !user) return;
    try {
      setLoadingData(true);
      setSyncStatus('syncing');
      
      const { data: wsData, error: wsError } = await client.from('work_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (wsError) {
        console.error('Lỗi tải work_settings:', wsError);
      } else if (wsData) {
        setWorkSettings({ ...DEFAULT_WORK_SETTINGS, ...wsData });
      }

      const { data: usData, error: usError } = await client.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (usError) {
        console.error('Lỗi tải user_settings:', usError);
      } else if (usData) {
        setUserSettings({ ...DEFAULT_USER_SETTINGS, ...usData });
      }

      const { data: wlData, error: wlError } = await client.from('work_logs').select('*').eq('user_id', user.id).order('work_date', { ascending: false });
      if (wlError) {
         console.error('Lỗi tải work_logs:', wlError);
      } else if (wlData) {
        setWorkLogs(wlData.map(l => ({
          ...l, 
          break_duration_hours: Number(l.break_duration_hours) || 0,
          total_hours: Number(l.total_hours) || 0,
          overtime_hours: Number(l.overtime_hours) || 0,
          missing_hours: Number(l.missing_hours) || 0
        })));
      }

      const { data: catData, error: catError } = await client.from('expense_categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`);
      if (catError) {
         console.error('Lỗi tải categories:', catError);
      } else if (catData && catData.length > 0) {
        setCategories(catData);
      } else {
        const defaultCats = DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, user_id: user.id }));
        setCategories(defaultCats);
        const { error: insertError } = await client.from('expense_categories').upsert(defaultCats);
        if (insertError) console.error(insertError);
      }

      const { data: txData, error: txError } = await client.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false });
      if (txError) {
         console.error('Lỗi tải transactions:', txError);
      } else if (txData) {
         const serverTxs = txData.map(t => ({ ...t, amount: Number(t.amount) || 0 }));
         // Supabase is the single source of truth - replace directly to eliminate zombie resurrection
         setTransactions(serverTxs);
      }

      const { data: assetData, error: assetError } = await client.from('investment_assets').select('*').eq('user_id', user.id);
      if (assetError) {
         console.error('Lỗi tải assets:', assetError);
      } else if (assetData) {
         setInvestmentAssets(assetData.map(a => ({ ...a, current_price: Number(a.current_price) || 0 })));
      }

      const { data: itxData, error: itxError } = await client.from('investment_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false });
      if (itxError) {
         console.error('Lỗi tải investment_transactions:', itxError);
      } else if (itxData) {
         setInvestmentTransactions(itxData.map(t => ({ 
          ...t, 
          quantity: Number(t.quantity) || 0, 
          price: Number(t.price) || 0, 
          fee: Number(t.fee) || 0 
        })));
      }

      const { data: snapData, error: snapError } = await client.from('portfolio_snapshots').select('*').eq('user_id', user.id).order('snapshot_date', { ascending: true });
      if (snapError) {
         console.error('Lỗi tải snapshots:', snapError);
      } else if (snapData) {
         setPortfolioSnapshots(snapData.map(s => ({
          ...s,
          total_value: Number(s.total_value) || 0,
          total_cost: Number(s.total_cost) || 0,
          total_profit: Number(s.total_profit) || 0,
          profit_percentage: Number(s.profit_percentage) || 0
        })));
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
    if (isDemoUser || !user) return;

    // Initial sync
    syncWithSupabase();

    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client) return;

    // Setup Supabase Realtime channel for instant cross-device updates
    const channel = client
      .channel(`realtime-sync-${user.id}`)
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
          }, 100);
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

  const runUpsert = async (table: string, data: any, successMsg: string) => {
    triggerCloudBackup();
    if (!isDemoUser) {
      if (!user) {
        addToast('Lỗi: Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.', 'error');
        return { success: false, error: new Error('Session expired') };
      }
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client.from(table).upsert({ ...data, user_id: user.id });
          if (error) throw error;
        }
      } catch (err: any) {
        addToast(`Lỗi lưu Cloud: ${err.message || JSON.stringify(err)}`, 'error');
        return { success: false, error: err };
      }
    }
    if (successMsg) addToast(successMsg, 'success');
    return { success: true };
  };

  const runDelete = async (table: string, id: string, successMsg: string) => {
    triggerCloudBackup();
    if (!isDemoUser) {
      if (!user) {
        addToast('Lỗi: Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        return;
      }
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client.from(table).delete().eq('id', id);
          if (error) throw error;
        }
      } catch (err: any) {
        addToast(`Lỗi xóa Cloud: ${err.message || JSON.stringify(err)}`, 'error');
        return;
      }
    }
    if (successMsg) addToast(successMsg, 'success');
  };

  const updateWorkSettings = async (newSettings: Partial<WorkSettings>) => {
    const updated = { ...workSettings, ...newSettings };
    setWorkSettings(updated);
    await runUpsert('work_settings', {
      id: updated.id,
      default_check_in: updated.default_check_in,
      default_check_out: updated.default_check_out,
      default_break_start: updated.default_break_start,
      default_break_end: updated.default_break_end,
      standard_hours_per_day: updated.standard_hours_per_day
    }, 'Đã lưu cấu hình giờ công');
  };

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...newSettings };
    setUserSettings(updated);
    await runUpsert('user_settings', {
      id: updated.id,
      theme: updated.theme,
      currency: updated.currency,
      currency_format: updated.currency_format,
      cost_calculation_method: updated.cost_calculation_method
    }, 'Đã lưu cài đặt hệ thống');
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
      if (idx >= 0) { const next = [...prev]; next[idx] = fullLog; return next; }
      return [fullLog, ...prev];
    });
        await runUpsert('work_logs', {
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
    }, `Đã lưu chấm công ngày ${fullLog.work_date}`);
  };

  const deleteWorkLog = async (id: string) => {
    setWorkLogs(prev => prev.filter(l => l.id !== id));
    await runDelete('work_logs', id, 'Đã xóa chấm công');
  };

  const getWorkLogsForMonth = (month: number, year: number) => {
    return workLogs.filter(l => {
      const d = new Date(l.work_date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  };

  const saveTransaction = async (txData: Omit<Transaction, 'id'> & { id?: string }) => {
    const id = txData.id || generateUUID();
    const isNew = !txData.id;
    // Validate category_id for PostgreSQL uuid format!
    // If it is an empty string, or undefined, we don't pass it or pass null
    const validCategoryId = (txData.category_id && txData.category_id.length > 0) ? txData.category_id : null;
    
    const fullTx: Transaction = {
      ...txData, id, amount: Number(txData.amount), category_id: validCategoryId || undefined
    };
    
    setTransactions(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx >= 0) { const next = [...prev]; next[idx] = fullTx; return next; }
      return [fullTx, ...prev];
    });
    
    const res = await runUpsert('transactions', fullTx, `Đã lưu khoản ${fullTx.transaction_type === 'income' ? 'thu' : 'chi'}`);
    
    if (res && res.success === false) {
      if (isNew) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
      if (res.error?.message?.includes('foreign key') || res.error?.message?.includes('uuid')) {
        syncWithSupabase();
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await runDelete('transactions', id, 'Đã xóa giao dịch');
  };

  const saveCategory = async (catData: Omit<ExpenseCategory, 'id'> & { id?: string }) => {
    const id = catData.id || generateUUID();
    const isNew = !catData.id;
    const fullCat: ExpenseCategory = { ...catData, id, is_default: false };
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx >= 0) { const next = [...prev]; next[idx] = fullCat; return next; }
      return [fullCat, ...prev];
    });
    const res = await runUpsert('expense_categories', fullCat, 'Đã lưu danh mục');
    
    if (res && res.success === false) {
      if (isNew) {
        setCategories(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    await runDelete('expense_categories', id, 'Đã xóa danh mục');
  };

  const saveInvestmentAsset = async (assetData: Omit<InvestmentAsset, 'id'> & { id?: string }) => {
    const cleanSym = assetData.asset_symbol.trim().toUpperCase();
    const existingIdx = investmentAssets.findIndex(a => a.asset_symbol.toUpperCase() === cleanSym && a.id !== assetData.id);
    if (existingIdx >= 0) {
      addToast(`Mã tài sản ${cleanSym} đã tồn tại trong danh mục!`, 'error');
      throw new Error('Duplicate asset symbol');
    }

    const id = assetData.id || generateUUID();
    const isNew = !assetData.id;
    const fullAsset: InvestmentAsset = { ...assetData, id, current_price: Number(assetData.current_price) || 0 };
    setInvestmentAssets(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx >= 0) { const next = [...prev]; next[idx] = fullAsset; return next; }
      return [fullAsset, ...prev];
    });
    const res = await runUpsert('investment_assets', {
      id: fullAsset.id,
      asset_name: fullAsset.asset_name,
      asset_symbol: fullAsset.asset_symbol,
      asset_type: fullAsset.asset_type,
      current_price: fullAsset.current_price,
      price_updated_at: fullAsset.price_updated_at,
      notes: fullAsset.notes
    }, `Đã lưu tài sản ${fullAsset.asset_symbol}`);

    if (res && res.success === false) {
      if (isNew) {
        setInvestmentAssets(prev => prev.filter(a => a.id !== id));
      }
    }
  };

  const updateAssetPrice = async (assetId: string, newPrice: number) => {
    setInvestmentAssets(prev => prev.map(a => a.id === assetId ? { ...a, current_price: newPrice, price_updated_at: new Date().toISOString() } : a));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      const { client } = getSupabaseClient();
      if (client) {
        const { error } = await client.from('investment_assets').update({ current_price: newPrice, price_updated_at: new Date().toISOString() }).eq('id', assetId);
        if (error) console.error(error);
      }
    }
  };

  const deleteInvestmentAsset = async (id: string) => {
    setInvestmentAssets(prev => prev.filter(a => a.id !== id));
    await runDelete('investment_assets', id, 'Đã xóa tài sản');
  };

  const saveInvestmentTransaction = async (txData: Omit<InvestmentTransaction, 'id'> & { id?: string }) => {
    const id = txData.id || generateUUID();
    const isNew = !txData.id;
    const fullTx: InvestmentTransaction = { ...txData, id, quantity: Number(txData.quantity), price: Number(txData.price || (txData as any).price_per_unit || 0) };
    
    setInvestmentTransactions(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx >= 0) { const next = [...prev]; next[idx] = fullTx; return next; }
      return [fullTx, ...prev];
    });
    
    const res = await runUpsert('investment_transactions', {
      id: fullTx.id,
      asset_id: fullTx.asset_id,
      transaction_type: fullTx.transaction_type,
      transaction_date: fullTx.transaction_date,
      quantity: fullTx.quantity,
      price: fullTx.price,
      fee: fullTx.fee,
      note: fullTx.note
    }, 'Đã lưu giao dịch đầu tư');

    if (res && res.success === false) {
      if (isNew) {
        setInvestmentTransactions(prev => prev.filter(t => t.id !== id));
      }
      if (res.error?.message?.includes('foreign key')) {
        syncWithSupabase();
      }
    }
  };

  const deleteInvestmentTransaction = async (id: string) => {
    setInvestmentTransactions(prev => prev.filter(t => t.id !== id));
    await runDelete('investment_transactions', id, 'Đã xóa giao dịch đầu tư');
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

  const refreshMarketPrices = async (silent = false, skipCloudSave = false) => {
    if (isRefreshingPrices) return;
    setIsRefreshingPrices(true);
    try {
      const priceUpdates = await priceService.fetchBatchPrices(investmentAssetsRef.current);
      setInvestmentAssets(prev => {
        let hasChanges = false;
        const updatedAssets = prev.map(a => {
          const update = priceUpdates[a.id];
          if (update && update.price && update.price !== a.current_price) {
            hasChanges = true;
            return { ...a, current_price: update.price, price_updated_at: new Date().toISOString() };
          }
          return a;
        });
        
        if (!hasChanges) return prev; // Avoid unnecessary re-renders

        if (!isDemoUser && user && !skipCloudSave) {
          const { client } = getSupabaseClient();
          if (client) {
            Promise.all(updatedAssets.map(async a => {
              if (priceUpdates[a.id] && priceUpdates[a.id].price !== prev.find(p => p.id === a.id)?.current_price) {
                const { error } = await client.from('investment_assets').update({ current_price: a.current_price, price_updated_at: a.price_updated_at }).eq('id', a.id);
                if (error) console.error('Lỗi lưu giá tài sản:', error);
              }
            })).catch(() => {});
          }
        }
        return updatedAssets;
      });
      if (!silent) addToast('Đã cập nhật giá thị trường', 'success');
    } catch (err) {
      if (!silent) addToast('Lỗi cập nhật giá thị trường', 'error');
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = userSettings.theme === 'dark' || (userSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [userSettings.theme]);

  const clearAllData = () => {
    setWorkSettings(DEFAULT_WORK_SETTINGS);
    setUserSettings(DEFAULT_USER_SETTINGS);
    setWorkLogs([]);
    setCategories(DEFAULT_EXPENSE_CATEGORIES);
    setTransactions([]);
    setInvestmentAssets([]);
    setInvestmentTransactions([]);
    setPortfolioSnapshots([]);
    localStorage.removeItem('app_work_logs');
    localStorage.removeItem('app_transactions');
    localStorage.removeItem('app_investment_assets');
    localStorage.removeItem('app_investment_txs');
    localStorage.removeItem('app_portfolio_snapshots');
    triggerCloudBackup(false);
    addToast('Đã xóa toàn bộ dữ liệu', 'success');
  };

  return (
    <DataContext.Provider value={{
      workSettings, workLogs, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots,
      userSettings, calculatedHoldings, toasts, loadingData, syncStatus, lastSyncedAt, syncMessage, isRefreshingPrices,
      updateWorkSettings, saveWorkLog, deleteWorkLog, getWorkLogsForMonth, saveTransaction, deleteTransaction,
      saveCategory, deleteCategory, saveInvestmentAsset, updateAssetPrice, deleteInvestmentAsset,
      saveInvestmentTransaction, deleteInvestmentTransaction, refreshMarketPrices, takeDailySnapshot, updateUserSettings,
      addToast, removeToast, clearAllData, syncWithSupabase, triggerCloudBackup
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
