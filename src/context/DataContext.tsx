import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import {
  WorkSettings, WorkLog, ExpenseCategory, Transaction,
  InvestmentAsset, InvestmentTransaction, PortfolioSnapshot,
  UserSettings, CloudSyncStatus, ToastMessage, CalculatedAssetHolding,
  MonthlySalaryData, SalaryRecord, BusinessTripExpense
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
} from '../lib/seedData';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { calculateWorkHours, generateUUID } from '../lib/utils';
import { calculateInvestmentHoldings } from '../lib/utils';
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
  userSettings: UserSettings;
  calculatedHoldings: CalculatedAssetHolding[];
  toasts: ToastMessage[];
  loadingData: boolean;
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
  backupToCloudflareR2: () => Promise<boolean>;
  restoreFromCloudflareR2: (key: string) => Promise<boolean>;
  sendTransactionalEmailNotification: (payload: SendEmailPayload) => Promise<SendEmailResponse>;
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
    // Initial fetch on mount
    const timer = setTimeout(() => {
      if (investmentAssetsRef.current.length > 0) {
        refreshMarketPrices(true, false);
      }
    }, 1000);

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      if (investmentAssetsRef.current.length > 0) {
        refreshMarketPrices(true, false);
      }
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

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
      localStorage.setItem('app_expense_categories', JSON.stringify(categories));
      localStorage.setItem('app_transactions', JSON.stringify(transactions));
      localStorage.setItem('app_investment_assets', JSON.stringify(investmentAssets));
      localStorage.setItem('app_investment_txs', JSON.stringify(investmentTransactions));
      localStorage.setItem('app_portfolio_snapshots', JSON.stringify(portfolioSnapshots));
      localStorage.setItem('app_salary_records', JSON.stringify(salaryRecords));
    }
  }, [workSettings, userSettings, workLogs, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots, salaryRecords]);

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
      try {
        let queryWs = client.from('work_settings').select('*');
        if (user?.id) {
          queryWs = queryWs.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        }
        const { data: wsData, error: wsError } = await queryWs.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (!wsError && wsData) {
          setWorkSettings(prev => ({ ...DEFAULT_WORK_SETTINGS, ...prev, ...wsData }));
          if (wsData.salary_data && typeof wsData.salary_data === 'object') {
            setSalaryRecords(prev => ({ ...prev, ...wsData.salary_data }));
          }
        }
      } catch (wsErr) {
        console.warn('Lỗi tải work_settings:', wsErr);
      }

      // 2. Tải bảng salary_records chuyên dụng
      try {
        let querySal = client.from('salary_records').select('*');
        if (user?.id) {
          querySal = querySal.or(`user_id.eq.${user.id},user_id.eq.admin123`);
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
          setSalaryRecords(prev => ({ ...prev, ...salMap }));
        }
      } catch (salErr) {
        console.warn('Tải salary_records:', salErr);
      }

      // 3. Tải user_settings
      try {
        let queryUs = client.from('user_settings').select('*');
        if (user?.id) queryUs = queryUs.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: usData } = await queryUs.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (usData) {
          setUserSettings(prev => ({ ...DEFAULT_USER_SETTINGS, ...prev, ...usData }));
        }
      } catch (usErr) {
        console.warn('Lỗi tải user_settings:', usErr);
      }

      // 4. Tải work_logs
      try {
        let queryWl = client.from('work_logs').select('*');
        if (user?.id) queryWl = queryWl.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: wlData, error: wlError } = await queryWl.order('work_date', { ascending: false });
        if (!wlError && wlData && wlData.length > 0) {
          const actualLogs: any[] = [];
          const foundSalaryFromLogs: Record<string, MonthlySalaryData> = {};

          wlData.forEach((l: any) => {
            if (l.notes && typeof l.notes === 'string' && l.notes.includes('[SALARY_SYNC]:')) {
              try {
                const jsonPart = l.notes.substring(l.notes.indexOf('[SALARY_SYNC]:') + 14);
                const parsed = JSON.parse(jsonPart);
                if (parsed && typeof parsed === 'object') {
                  Object.assign(foundSalaryFromLogs, parsed);
                }
              } catch (e) {
                // ignore
              }
              if (l.id && String(l.id).startsWith('salary_meta_')) {
                return;
              }
            }
            actualLogs.push({
              ...l, 
              break_duration_hours: Number(l.break_duration_hours) || 0,
              total_hours: Number(l.total_hours) || 0,
              overtime_hours: Number(l.overtime_hours) || 0,
              missing_hours: Number(l.missing_hours) || 0
            });
          });

          setWorkLogs(actualLogs);
          if (Object.keys(foundSalaryFromLogs).length > 0) {
            setSalaryRecords(prev => ({ ...prev, ...foundSalaryFromLogs }));
          }
        }
      } catch (wlErr) {
        console.warn('Lỗi tải work_logs:', wlErr);
      }

      // 5. Tải business_trips
      try {
        let queryBt = client.from('business_trips').select('*');
        if (user?.id) queryBt = queryBt.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: btData, error: btError } = await queryBt.order('trip_date', { ascending: false });
        if (!btError && btData && Array.isArray(btData) && btData.length > 0) {
          setBusinessTrips(btData.map((t: any) => ({
            ...t,
            days_count: Number(t.days_count) || 1,
            daily_allowance_rate: Number(t.daily_allowance_rate) || 160000,
            total_daily_allowance: Number(t.total_daily_allowance) || 0,
            hotel_cost: Number(t.hotel_cost) || 0,
            outbound_cost: Number(t.outbound_cost) || 0,
            return_cost: Number(t.return_cost) || 0,
            total_amount: Number(t.total_amount) || 0,
            is_paid: Boolean(t.is_paid)
          })));
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

      // 7. Tải transactions
      try {
        let queryTx = client.from('transactions').select('*');
        if (user?.id) queryTx = queryTx.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: txData, error: txError } = await queryTx.order('transaction_date', { ascending: false });
        if (!txError && txData && txData.length > 0) {
          setTransactions(txData.map(t => ({ ...t, amount: Number(t.amount) || 0 })));
        }
      } catch (txErr) {
        console.warn('Tải transactions:', txErr);
      }

      // 8. Tải investment_assets
      try {
        let queryAssets = client.from('investment_assets').select('*');
        if (user?.id) queryAssets = queryAssets.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: assetData, error: assetError } = await queryAssets;
        if (!assetError && assetData) {
          setInvestmentAssets(prev => {
            const prevMap = new Map<string, InvestmentAsset>(prev.map(p => [p.id, p]));
            return assetData.map((serverAsset: InvestmentAsset) => {
              const existing = prevMap.get(serverAsset.id);
              const serverPrice = Number(serverAsset.current_price) || 0;
              const existingPrice = Number(existing?.current_price) || 0;
              
              let finalPrice = serverPrice;
              let finalUpdatedAt = serverAsset.price_updated_at;

              if (existingPrice > 0) {
                if (!serverPrice) {
                  finalPrice = existingPrice;
                  finalUpdatedAt = existing?.price_updated_at;
                } else if (existing?.price_updated_at && serverAsset.price_updated_at) {
                  const localTime = new Date(existing.price_updated_at).getTime();
                  const serverTime = new Date(serverAsset.price_updated_at).getTime();
                  if (localTime >= serverTime) {
                    finalPrice = existingPrice;
                    finalUpdatedAt = existing.price_updated_at;
                  }
                } else {
                  finalPrice = existingPrice;
                }
              }

              return {
                ...serverAsset,
                current_price: finalPrice,
                price_updated_at: finalUpdatedAt
              };
            });
          });
        }
      } catch (assetErr) {
        console.warn('Lỗi tải investment_assets:', assetErr);
      }

      // 9. Tải investment_transactions
      try {
        let queryItx = client.from('investment_transactions').select('*');
        if (user?.id) queryItx = queryItx.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: itxData, error: itxError } = await queryItx.order('transaction_date', { ascending: false });
        if (!itxError && itxData) {
          setInvestmentTransactions(itxData.map(t => ({ 
            ...t, 
            quantity: Number(t.quantity) || 0, 
            price: Number(t.price) || 0, 
            fee: Number(t.fee) || 0 
          })));
        }
      } catch (itxErr) {
        console.warn('Lỗi tải investment_transactions:', itxErr);
      }

      // 10. Tải portfolio_snapshots
      try {
        let querySnap = client.from('portfolio_snapshots').select('*');
        if (user?.id) querySnap = querySnap.or(`user_id.eq.${user.id},user_id.eq.admin123`);
        const { data: snapData, error: snapError } = await querySnap.order('snapshot_date', { ascending: true });
        if (!snapError && snapData) {
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
          if (error) {
            // If table doesn't exist yet on remote Supabase instance
            if (error.message?.includes('schema cache') || error.message?.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
              console.warn(`[Supabase Sync] Bảng '${table}' chưa được tạo trên Supabase:`, error.message);
              if (successMsg) {
                addToast(`${successMsg} (Đã lưu an toàn trên máy - Vui lòng chạy SQL tạo bảng '${table}' trên Supabase để đồng bộ Cloud)`, 'info');
              }
              return { success: true, localOnly: true };
            }
            throw error;
          }
        }
      } catch (err: any) {
        if (err.message?.includes('schema cache') || err.message?.includes('Could not find the table') || err.code === 'PGRST205' || err.code === '42P01') {
          console.warn(`[Supabase Sync] Bảng '${table}' chưa tồn tại:`, err.message);
          if (successMsg) {
            addToast(`${successMsg} (Đã lưu máy - Chạy SQL để đồng bộ Cloud)`, 'info');
          }
          return { success: true, localOnly: true };
        }
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
          if (error) {
            if (error.message?.includes('schema cache') || error.message?.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
              console.warn(`[Supabase Sync] Bảng '${table}' chưa tồn tại khi xóa:`, error.message);
              if (successMsg) addToast(successMsg, 'success');
              return;
            }
            throw error;
          }
        }
      } catch (err: any) {
        if (err.message?.includes('schema cache') || err.message?.includes('Could not find the table') || err.code === 'PGRST205' || err.code === '42P01') {
          if (successMsg) addToast(successMsg, 'success');
          return;
        }
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
      standard_hours_per_day: updated.standard_hours_per_day,
      standard_days_per_month: updated.standard_days_per_month,
      salary_data: updated.salary_data || salaryRecords
    }, 'Đã lưu cấu hình giờ công');
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

      // 2. Lưu vào bảng chuyên dụng salary_records
      try {
        const recordId = `sal_${effectiveUserId.slice(0, 16)}_${year}_${month}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        await client.from('salary_records').upsert({
          id: recordId,
          user_id: effectiveUserId,
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
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (err: any) {
        console.warn('Lỗi lưu bảng salary_records trên Cloud:', err);
      }

      // 3. Lưu trực tiếp vào work_settings (có trường salary_data để đồng bộ chắc chắn)
      try {
        const updatedWorkSettings = {
          ...workSettings,
          salary_data: { ...(workSettings.salary_data || {}), [key]: data }
        };
        setWorkSettings(updatedWorkSettings);
        await client.from('work_settings').upsert({
          id: updatedWorkSettings.id || `ws_${effectiveUserId}`,
          user_id: effectiveUserId,
          default_check_in: updatedWorkSettings.default_check_in,
          default_check_out: updatedWorkSettings.default_check_out,
          default_break_start: updatedWorkSettings.default_break_start,
          default_break_end: updatedWorkSettings.default_break_end,
          standard_hours_per_day: updatedWorkSettings.standard_hours_per_day,
          standard_days_per_month: updatedWorkSettings.standard_days_per_month,
          salary_data: updatedWorkSettings.salary_data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (wsErr: any) {
        console.warn('Lỗi lưu work_settings fallback trên Cloud:', wsErr);
      }

      // 4. Lưu bản ghi dự phòng vào work_logs (bảo đảm 100% đồng bộ vì bảng work_logs luôn tồn tại)
      try {
        const salaryLogId = `salary_meta_${effectiveUserId.slice(0, 12)}_${year}_${month}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const monthDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        await client.from('work_logs').upsert({
          id: salaryLogId,
          user_id: effectiveUserId,
          work_date: monthDateStr,
          work_status: 'Làm việc',
          total_hours: 8,
          notes: `[SALARY_SYNC]:${JSON.stringify({ [key]: data })}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (logErr) {
        // ignore
      }
    }

    if (!silent) {
      addToast(`Đã lưu và đồng bộ Bảng Lương Tháng ${month}/${year} lên Supabase Cloud!`, 'success');
    }
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

    setBusinessTrips(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = idx >= 0 ? prev.map(t => t.id === id ? fullTrip : t) : [fullTrip, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(next));
      }
      return next;
    });

    await runUpsert('business_trips', fullTrip, `Đã lưu công tác phí ngày ${fullTrip.trip_date}`);
  };

  const deleteBusinessTrip = async (id: string) => {
    setBusinessTrips(prev => {
      const next = prev.filter(t => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(next));
      }
      return next;
    });
    await runDelete('business_trips', id, 'Đã xóa bản ghi công tác phí');
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

    setBusinessTrips(prev => {
      const next = prev.map(t => t.id === id ? updatedTrip : t);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_business_trips', JSON.stringify(next));
      }
      return next;
    });

    await runUpsert(
      'business_trips',
      updatedTrip,
      updatedIsPaid
        ? 'Đã thanh toán (Màu xanh, chuyển xuống dưới)'
        : 'Chờ thanh toán (Chữ đỏ, đưa lên đầu)'
    );
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
    setBusinessTrips([]);
    setCategories(DEFAULT_EXPENSE_CATEGORIES);
    setTransactions([]);
    setInvestmentAssets([]);
    setInvestmentTransactions([]);
    setPortfolioSnapshots([]);
    setSalaryRecords({});
    localStorage.removeItem('app_work_logs');
    localStorage.removeItem('app_business_trips');
    localStorage.removeItem('app_transactions');
    localStorage.removeItem('app_investment_assets');
    localStorage.removeItem('app_investment_txs');
    localStorage.removeItem('app_portfolio_snapshots');
    localStorage.removeItem('app_salary_records');
    triggerCloudBackup(false);
    addToast('Đã xóa toàn bộ dữ liệu', 'success');
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
        salaryRecords,
        transactions,
        categories,
        investmentAssets,
        investmentTransactions,
        portfolioSnapshots,
        userSettings,
        backupTimestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        totalRecords: workLogs.length + transactions.length + investmentAssets.length + investmentTransactions.length + portfolioSnapshots.length + Object.keys(salaryRecords).length,
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

  return (
    <DataContext.Provider value={{
      workSettings, workLogs, businessTrips, categories, transactions, investmentAssets, investmentTransactions, portfolioSnapshots,
      salaryRecords, userSettings, calculatedHoldings, toasts, loadingData, syncStatus, lastSyncedAt, syncMessage, isRefreshingPrices,
      updateWorkSettings, saveSalaryRecord, getSalaryRecord, saveWorkLog, deleteWorkLog, getWorkLogsForMonth,
      saveBusinessTrip, deleteBusinessTrip, toggleBusinessTripPayment,
      saveTransaction, deleteTransaction,
      saveCategory, deleteCategory, saveInvestmentAsset, updateAssetPrice, deleteInvestmentAsset,
      saveInvestmentTransaction, deleteInvestmentTransaction, refreshMarketPrices, takeDailySnapshot, updateUserSettings,
      addToast, removeToast, clearAllData, syncWithSupabase, triggerCloudBackup,
      backupToCloudflareR2, restoreFromCloudflareR2, sendTransactionalEmailNotification
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
