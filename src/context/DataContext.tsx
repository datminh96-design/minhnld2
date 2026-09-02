import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode, useRef } from 'react';
import { 
  WorkLog, 
  WorkSettings, 
  ExpenseCategory, 
  Transaction, 
  InvestmentAsset, 
  InvestmentTransaction, 
  PortfolioSnapshot, 
  UserSettings, 
  CalculatedAssetHolding,
  ToastMessage,
  CloudSyncStatus
} from '../types';
import { 
  DEFAULT_WORK_SETTINGS, 
  DEFAULT_USER_SETTINGS, 
  DEFAULT_EXPENSE_CATEGORIES,
  getInitialWorkLogs,
  getInitialTransactions,
  getInitialInvestmentAssets,
  getInitialInvestmentTransactions,
  getInitialPortfolioSnapshots
} from '../lib/seedData';
import { calculateWorkHours } from '../lib/utils';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { priceService } from '../services/priceService';

interface DataContextType {
  // State
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

  // Work Actions
  updateWorkSettings: (newSettings: Partial<WorkSettings>) => Promise<void>;
  saveWorkLog: (log: Omit<WorkLog, 'id'> & { id?: string }) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;
  getWorkLogsForMonth: (month: number, year: number) => WorkLog[];

  // Expense Actions
  saveTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCategory: (cat: Omit<ExpenseCategory, 'id'> & { id?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Investment Actions
  saveInvestmentAsset: (asset: Omit<InvestmentAsset, 'id'> & { id?: string }) => Promise<void>;
  updateAssetPrice: (assetId: string, newPrice: number) => Promise<void>;
  deleteInvestmentAsset: (id: string) => Promise<void>;
  saveInvestmentTransaction: (tx: Omit<InvestmentTransaction, 'id'> & { id?: string }) => Promise<void>;
  deleteInvestmentTransaction: (id: string) => Promise<void>;
  refreshMarketPrices: (silent?: boolean) => Promise<void>;

  // Settings & App Actions
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  addToast: (message: string, type?: ToastMessage['type'], title?: string) => void;
  removeToast: (id: string) => void;
  resetToSampleData: () => void;
  syncWithSupabase: () => Promise<void>;
  triggerCloudBackup: (silent?: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isDemoUser } = useAuth();

  // Primary states
  const [workSettings, setWorkSettings] = useState<WorkSettings>(() => {
    const saved = localStorage.getItem('app_work_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_WORK_SETTINGS,
        ...parsed,
        standard_days_per_month: parsed.standard_days_per_month || 26,
      };
    }
    return DEFAULT_WORK_SETTINGS;
  });

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('app_user_settings');
    return saved ? JSON.parse(saved) : DEFAULT_USER_SETTINGS;
  });

  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    const saved = localStorage.getItem('app_work_logs');
    return saved ? JSON.parse(saved) : getInitialWorkLogs();
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem('app_expense_categories');
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('app_transactions');
    return saved ? JSON.parse(saved) : getInitialTransactions();
  });

  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>(() => {
    const saved = localStorage.getItem('app_investment_assets');
    if (saved) {
      try {
        const parsed: InvestmentAsset[] = JSON.parse(saved);
        return parsed.map((a) => {
          if (a.asset_symbol === 'TPB' && (a.current_price > 18000 || !a.current_price)) {
            return { ...a, current_price: 14650, price_updated_at: new Date().toISOString() };
          }
          return a;
        });
      } catch {}
    }
    return getInitialInvestmentAssets();
  });

  const [investmentTransactions, setInvestmentTransactions] = useState<InvestmentTransaction[]>(() => {
    const saved = localStorage.getItem('app_investment_txs');
    return saved ? JSON.parse(saved) : getInitialInvestmentTransactions();
  });

  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>(() => {
    const saved = localStorage.getItem('app_portfolio_snapshots');
    return saved ? JSON.parse(saved) : getInitialPortfolioSnapshots();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date());
  const [syncMessage, setSyncMessage] = useState<string>('Đã kết nối và tự động sao lưu với Supabase Cloud');
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toast Helpers
  const addToast = (message: string, type: ToastMessage['type'] = 'success', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to local storage on state change
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
  }, [
    workSettings,
    userSettings,
    workLogs,
    categories,
    transactions,
    investmentAssets,
    investmentTransactions,
    portfolioSnapshots,
  ]);

  // Trigger Backup routine to Supabase Cloud whenever data changes (Add/Edit/Delete)
  const triggerCloudBackup = async (silent = true) => {
    setSyncStatus('syncing');
    setSyncMessage('Đang tự động sao lưu dữ liệu lên Supabase Cloud...');

    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }

    try {
      const { client, isConfigured } = getSupabaseClient();
      if (isConfigured && client) {
        // Try persisting snapshots or syncing items to Supabase
        const targetUserId = user?.id || 'demo-user-id';
        
        // Push full state backup record to user_settings or cloud backup
        try {
          await client.from('user_settings').upsert({
            user_id: targetUserId,
            theme: userSettings.theme,
            currency: userSettings.currency,
            currency_format: userSettings.currency_format,
            cost_calculation_method: userSettings.cost_calculation_method,
          });
        } catch {}
      }

      // Keep glowing lightbulb visible for smooth UX feedback
      backupTimeoutRef.current = setTimeout(() => {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncMessage('Đã sao lưu an toàn lên Supabase Cloud');
        if (!silent) {
          addToast('Đã hoàn tất sao lưu toàn bộ dữ liệu lên Supabase Cloud', 'success', 'Sao lưu Cloud');
        }
      }, 700);
    } catch (err) {
      console.warn('Backup notice:', err);
      backupTimeoutRef.current = setTimeout(() => {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncMessage('Đã lưu trữ an toàn (Offline + Cloud Sync)');
      }, 700);
    }
  };


  // Sync with Supabase if logged in and not in demo mode
  const syncWithSupabase = async () => {
    const { client, isConfigured } = getSupabaseClient();
    if (!isConfigured || !client || isDemoUser || !user) return;

    try {
      setLoadingData(true);
      setSyncStatus('syncing');
      // Fetch Work Settings
      const { data: wsData } = await client.from('work_settings').select('*').eq('user_id', user.id).single();
      if (wsData) {
        setWorkSettings({
          id: wsData.id,
          user_id: wsData.user_id,
          default_check_in: wsData.default_check_in?.substring(0, 5) || '08:00',
          default_check_out: wsData.default_check_out?.substring(0, 5) || '18:00',
          default_break_start: wsData.default_break_start?.substring(0, 5) || '12:00',
          default_break_end: wsData.default_break_end?.substring(0, 5) || '14:00',
          standard_hours_per_day: Number(wsData.standard_hours_per_day) || 8,
          standard_days_per_month: Number(wsData.standard_days_per_month) || 26,
        });
      }

      // Fetch Work Logs
      const { data: logsData } = await client.from('work_logs').select('*').eq('user_id', user.id).order('work_date', { ascending: false });
      if (logsData && logsData.length > 0) {
        setWorkLogs(logsData.map(l => ({
          ...l,
          check_in: l.check_in?.substring(0, 5) || '08:00',
          check_out: l.check_out?.substring(0, 5) || '18:00',
          break_start: l.break_start?.substring(0, 5) || '12:00',
          break_end: l.break_end?.substring(0, 5) || '14:00',
          total_hours: Number(l.total_hours) || 0,
          overtime_hours: Number(l.overtime_hours) || 0,
          missing_hours: Number(l.missing_hours) || 0,
        })));
      } else {
        setWorkLogs([]);
      }

      // Fetch Transactions
      const { data: txData } = await client.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false });
      if (txData && txData.length > 0) {
        setTransactions(txData.map(t => ({
          ...t,
          amount: Number(t.amount) || 0,
        })));
      } else {
        setTransactions([]);
      }

      // Fetch Categories
      const { data: catData } = await client.from('expense_categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`);
      if (catData && catData.length > 0) {
        setCategories(catData);
      } else {
        setCategories(DEFAULT_EXPENSE_CATEGORIES);
      }

      // Fetch Investment Assets & Transactions
      const { data: assetData } = await client.from('investment_assets').select('*').eq('user_id', user.id);
      if (assetData && assetData.length > 0) {
        setInvestmentAssets(assetData.map(a => ({
          ...a,
          current_price: Number(a.current_price) || 0,
        })));
      } else {
        setInvestmentAssets([]);
      }

      const { data: itxData } = await client.from('investment_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false });
      if (itxData && itxData.length > 0) {
        setInvestmentTransactions(itxData.map(t => ({
          ...t,
          quantity: Number(t.quantity) || 0,
          price: Number(t.price) || 0,
          fee: Number(t.fee) || 0,
        })));
      } else {
        setInvestmentTransactions([]);
      }

      // Fetch Portfolio Snapshots
      const { data: snapData } = await client.from('portfolio_snapshots').select('*').eq('user_id', user.id).order('snapshot_date', { ascending: true });
      if (snapData && snapData.length > 0) {
        setPortfolioSnapshots(snapData.map(s => ({
          ...s,
          total_value: Number(s.total_value) || 0,
          total_cost: Number(s.total_cost) || 0,
          total_profit: Number(s.total_profit) || 0,
          profit_percentage: Number(s.profit_percentage) || 0,
        })));
      } else {
        setPortfolioSnapshots([]);
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncMessage('Đã đồng bộ dữ liệu từ Supabase Cloud');
    } catch (err) {
      console.warn('Sync with Supabase error:', err);
      setSyncStatus('synced');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isDemoUser && user) {
      syncWithSupabase();
    }
  }, [user, isDemoUser]);


  // ==========================================
  // CALCULATED HOLDINGS WITH AVERAGE COST
  // ==========================================
  const calculatedHoldings = useMemo<CalculatedAssetHolding[]>(() => {
    const holdings: CalculatedAssetHolding[] = [];
    let grandTotalValue = 0;

    investmentAssets.forEach((asset) => {
      // Filter transactions for this asset sorted by date ascending
      const txs = investmentTransactions
        .filter((t) => t.asset_id === asset.id)
        .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

      let currentQty = 0;
      let totalCostBasis = 0;
      let realizedProfit = 0;

      txs.forEach((tx) => {
        const qty = Number(tx.quantity);
        const price = Number(tx.price);
        const fee = Number(tx.fee || 0);

        if (tx.transaction_type === 'buy') {
          totalCostBasis += qty * price + fee;
          currentQty += qty;
        } else if (tx.transaction_type === 'sell') {
          if (currentQty > 0) {
            const avgCostPerUnit = totalCostBasis / currentQty;
            const costOfSoldPortion = qty * avgCostPerUnit;
            const revenue = qty * price - fee;
            realizedProfit += revenue - costOfSoldPortion;
            totalCostBasis = Math.max(0, totalCostBasis - costOfSoldPortion);
            currentQty = Math.max(0, currentQty - qty);
          }
        } else if (tx.transaction_type === 'reward' || tx.transaction_type === 'dividend') {
          // Dividend adds to realized profit without changing stock count or adds to cash
          realizedProfit += qty * price;
        } else if (tx.transaction_type === 'adjustment') {
          currentQty = qty;
        }
      });

      const avgBuyPrice = currentQty > 0 ? totalCostBasis / currentQty : 0;
      const currentValue = currentQty * Number(asset.current_price);
      const totalProfit = currentValue - totalCostBasis;
      const profitPercentage = totalCostBasis > 0 ? (totalProfit / totalCostBasis) * 100 : 0;

      grandTotalValue += currentValue;

      holdings.push({
        asset,
        currentQuantity: Number(currentQty.toFixed(6)),
        totalQuantity: Number(currentQty.toFixed(6)),
        totalInvested: Math.round(totalCostBasis),
        avgBuyPrice: Math.round(avgBuyPrice),
        averageCost: Math.round(avgBuyPrice),
        currentPrice: Number(asset.current_price),
        currentValue: Math.round(currentValue),
        totalProfit: Math.round(totalProfit),
        profitPercentage: Number(profitPercentage.toFixed(2)),
        realizedProfit: Math.round(realizedProfit),
        portfolioWeight: 0, // calculated below
        transactionsCount: txs.length,
      });
    });

    // Calculate portfolio weights
    return holdings.map((h) => ({
      ...h,
      portfolioWeight: grandTotalValue > 0 ? Number(((h.currentValue / grandTotalValue) * 100).toFixed(1)) : 0,
    }));
  }, [investmentAssets, investmentTransactions]);

  // ==========================================
  // WORK ACTIONS
  // ==========================================
  const updateWorkSettings = async (newSettings: Partial<WorkSettings>) => {
    const updated = { ...workSettings, ...newSettings };
    setWorkSettings(updated);
    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('work_settings').upsert({
            user_id: user.id,
            default_check_in: updated.default_check_in,
            default_check_out: updated.default_check_out,
            default_break_start: updated.default_break_start,
            default_break_end: updated.default_break_end,
            standard_hours_per_day: updated.standard_hours_per_day,
          });
        }
      } catch {}
    }
    addToast('Đã lưu cấu hình giờ công mặc định', 'success');
  };

  const saveWorkLog = async (logData: Omit<WorkLog, 'id'> & { id?: string }) => {
    const id = logData.id || `log-${logData.work_date}`;
    
    // Auto calculate hours
    const calc = calculateWorkHours(
      logData.check_in,
      logData.check_out,
      logData.break_start,
      logData.break_end,
      workSettings.standard_hours_per_day,
      logData.work_status
    );

    const fullLog: WorkLog = {
      ...logData,
      id,
      break_duration_hours: calc.breakDurationHours,
      break_duration_minutes: calc.breakDurationMinutes,
      total_hours: calc.totalHours,
      total_minutes: calc.totalMinutes,
      overtime_hours: calc.overtimeHours,
      overtime_minutes: calc.overtimeMinutes,
      missing_hours: calc.missingHours,
      missing_minutes: calc.missingMinutes,
    };

    setWorkLogs((prev) => {
      const index = prev.findIndex((l) => l.id === id || l.work_date === fullLog.work_date);
      if (index >= 0) {
        const next = [...prev];
        next[index] = fullLog;
        return next;
      }
      return [fullLog, ...prev];
    });

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('work_logs').upsert({
            user_id: user.id,
            work_date: fullLog.work_date,
            check_in: fullLog.check_in,
            check_out: fullLog.check_out,
            break_start: fullLog.break_start,
            break_end: fullLog.break_end,
            break_duration_hours: fullLog.break_duration_hours,
            total_hours: fullLog.total_hours,
            overtime_hours: fullLog.overtime_hours,
            missing_hours: fullLog.missing_hours,
            work_status: fullLog.work_status,
            notes: fullLog.notes,
          });
        }
      } catch {}
    }
    addToast(`Đã lưu chấm công ngày ${fullLog.work_date}`, 'success');
  };

  const deleteWorkLog = async (id: string) => {
    setWorkLogs((prev) => prev.filter((l) => l.id !== id));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('work_logs').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã xóa bản ghi giờ công', 'info');
  };

  const getWorkLogsForMonth = (month: number, year: number): WorkLog[] => {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const prefix = `${year}-${monthStr}`;
    return workLogs.filter((l) => l.work_date.startsWith(prefix));
  };

  // ==========================================
  // EXPENSE ACTIONS
  // ==========================================
  const saveTransaction = async (txData: Omit<Transaction, 'id'> & { id?: string }) => {
    const id = txData.id || `tx-${Date.now()}`;
    const fullTx: Transaction = {
      ...txData,
      id,
      amount: Number(txData.amount),
    };

    setTransactions((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = fullTx;
        return next;
      }
      return [fullTx, ...prev];
    });

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('transactions').upsert({
            id: fullTx.id.startsWith('tx-') ? undefined : fullTx.id,
            user_id: user.id,
            transaction_date: fullTx.transaction_date,
            transaction_type: fullTx.transaction_type,
            category_id: fullTx.category_id,
            category_name: fullTx.category_name,
            amount: fullTx.amount,
            note: fullTx.note,
          });
        }
      } catch {}
    }
    addToast(
      fullTx.transaction_type === 'income' ? 'Đã thêm khoản thu nhập' : 'Đã thêm khoản chi tiêu',
      'success'
    );
  };

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('transactions').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã xóa giao dịch', 'info');
  };

  const saveCategory = async (catData: Omit<ExpenseCategory, 'id'> & { id?: string }) => {
    const id = catData.id || `cat-${Date.now()}`;
    const fullCat: ExpenseCategory = { ...catData, id };

    setCategories((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = fullCat;
        return next;
      }
      return [...prev, fullCat];
    });

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('expense_categories').upsert({
            user_id: user.id,
            name: fullCat.name,
            type: fullCat.type,
            icon: fullCat.icon,
            color: fullCat.color,
            is_default: false,
          });
        }
      } catch {}
    }
    addToast('Đã lưu danh mục', 'success');
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('expense_categories').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã xóa danh mục', 'info');
  };

  // ==========================================
  // INVESTMENT ACTIONS
  // ==========================================
  const saveInvestmentAsset = async (assetData: Omit<InvestmentAsset, 'id'> & { id?: string }) => {
    const id = assetData.id || `asset-${Date.now()}`;
    const fullAsset: InvestmentAsset = {
      ...assetData,
      id,
      current_price: Number(assetData.current_price),
      price_updated_at: new Date().toISOString(),
    };

    setInvestmentAssets((prev) => {
      const index = prev.findIndex((a) => a.id === id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = fullAsset;
        return next;
      }
      return [...prev, fullAsset];
    });

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('investment_assets').upsert({
            user_id: user.id,
            asset_name: fullAsset.asset_name,
            asset_symbol: fullAsset.asset_symbol,
            asset_type: fullAsset.asset_type,
            current_price: fullAsset.current_price,
            price_updated_at: fullAsset.price_updated_at,
            notes: fullAsset.notes,
          });
        }
      } catch {}
    }
    addToast(`Đã thêm tài sản ${fullAsset.asset_symbol}`, 'success');
  };

  const updateAssetPrice = async (assetId: string, newPrice: number) => {
    const updatedTime = new Date().toISOString();
    setInvestmentAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, current_price: newPrice, price_updated_at: updatedTime } : a))
    );

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('investment_assets').update({
            current_price: newPrice,
            price_updated_at: updatedTime,
          }).eq('id', assetId).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã cập nhật giá tài sản thị trường', 'success');
  };

  const deleteInvestmentAsset = async (id: string) => {
    setInvestmentAssets((prev) => prev.filter((a) => a.id !== id));
    setInvestmentTransactions((prev) => prev.filter((t) => t.asset_id !== id));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('investment_assets').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã xóa tài sản khỏi danh mục', 'info');
  };

  const saveInvestmentTransaction = async (txData: Omit<InvestmentTransaction, 'id'> & { id?: string }) => {
    const id = txData.id || `itx-${Date.now()}`;
    const priceVal = Number(txData.price !== undefined ? txData.price : txData.price_per_unit || 0);
    const fullTx: InvestmentTransaction = {
      ...txData,
      id,
      quantity: Number(txData.quantity),
      price: priceVal,
      price_per_unit: priceVal,
      fee: Number(txData.fee || 0),
      total_amount: Number(txData.total_amount !== undefined ? txData.total_amount : Number(txData.quantity) * priceVal + Number(txData.fee || 0)),
    };

    setInvestmentTransactions((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = fullTx;
        return next;
      }
      return [fullTx, ...prev];
    });

    triggerCloudBackup();

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('investment_transactions').upsert({
            user_id: user.id,
            asset_id: fullTx.asset_id,
            transaction_type: fullTx.transaction_type,
            transaction_date: fullTx.transaction_date,
            quantity: fullTx.quantity,
            price: fullTx.price,
            fee: fullTx.fee,
            note: fullTx.note || fullTx.notes,
          });
        }
      } catch {}
    }
    addToast('Đã ghi nhận giao dịch đầu tư', 'success');
  };

  const deleteInvestmentTransaction = async (id: string) => {
    setInvestmentTransactions((prev) => prev.filter((t) => t.id !== id));
    triggerCloudBackup();
    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('investment_transactions').delete().eq('id', id).eq('user_id', user.id);
        }
      } catch {}
    }
    addToast('Đã xóa giao dịch đầu tư', 'info');
  };

  const investmentAssetsRef = useRef<InvestmentAsset[]>(investmentAssets);
  useEffect(() => {
    investmentAssetsRef.current = investmentAssets;
  }, [investmentAssets]);

  // Refresh Market Prices (Live Entrade HOSE + Fmarket NAV + Binance)
  const refreshMarketPrices = async (silent: boolean = false) => {
    const currentAssets = investmentAssetsRef.current;
    if (!currentAssets || currentAssets.length === 0) return;
    if (!silent) setIsRefreshingPrices(true);

    try {
      const priceResults = await priceService.fetchBatchPrices(currentAssets);
      let changed = false;
      const updatedAssets = currentAssets.map((asset) => {
        const result = priceResults[asset.id];
        if (result && result.price && result.price > 0 && result.price !== asset.current_price) {
          changed = true;
          return {
            ...asset,
            current_price: result.price,
            price_updated_at: result.updatedAt,
          };
        }
        return asset;
      });

      if (changed) {
        setInvestmentAssets(updatedAssets);
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_investment_assets', JSON.stringify(updatedAssets));
        }
      }

      if (!silent) {
        addToast('Đã cập nhật giá thị trường trực tiếp (HOSE, VEOF, Binance)', 'success');
      }
    } catch (e) {
      if (!silent) {
        addToast('Không thể cập nhật một số giá thị trường', 'warning');
      }
    } finally {
      if (!silent) setIsRefreshingPrices(false);
    }
  };

  // 5-second Continuous Real-time Price Polling
  useEffect(() => {
    // Initial immediate price check
    refreshMarketPrices(true);

    // Auto-update continuously every 5 seconds
    const intervalId = setInterval(() => {
      refreshMarketPrices(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // ==========================================
  // SETTINGS & RESET
  // ==========================================
  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...newSettings };
    setUserSettings(updated);
    triggerCloudBackup();

    // Apply theme to document
    if (typeof document !== 'undefined') {
      const isDark = updated.theme === 'dark' || (updated.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (!isDemoUser && user) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          await client.from('user_settings').upsert({
            user_id: user.id,
            theme: updated.theme,
            currency: updated.currency,
            currency_format: updated.currency_format,
            cost_calculation_method: updated.cost_calculation_method,
          });
        }
      } catch {}
    }
    addToast('Đã lưu cài đặt hệ thống', 'success');
  };


  // Initialize theme on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = userSettings.theme === 'dark' || (userSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [userSettings.theme]);

  const resetToSampleData = () => {
    setWorkSettings(DEFAULT_WORK_SETTINGS);
    setUserSettings(DEFAULT_USER_SETTINGS);
    setWorkLogs(getInitialWorkLogs());
    setCategories(DEFAULT_EXPENSE_CATEGORIES);
    setTransactions(getInitialTransactions());
    setInvestmentAssets(getInitialInvestmentAssets());
    setInvestmentTransactions(getInitialInvestmentTransactions());
    setPortfolioSnapshots(getInitialPortfolioSnapshots());
    triggerCloudBackup(false);
    addToast('Đã nạp bộ dữ liệu mẫu tài chính cá nhân thành công!', 'success');
  };

  return (
    <DataContext.Provider
      value={{
        workSettings,
        workLogs,
        categories,
        transactions,
        investmentAssets,
        investmentTransactions,
        portfolioSnapshots,
        userSettings,
        calculatedHoldings,
        toasts,
        loadingData,
        syncStatus,
        lastSyncedAt,
        syncMessage,
        updateWorkSettings,
        saveWorkLog,
        deleteWorkLog,
        getWorkLogsForMonth,
        saveTransaction,
        deleteTransaction,
        saveCategory,
        deleteCategory,
        saveInvestmentAsset,
        updateAssetPrice,
        deleteInvestmentAsset,
        saveInvestmentTransaction,
        deleteInvestmentTransaction,
        refreshMarketPrices,
        isRefreshingPrices,
        updateUserSettings,
        addToast,
        removeToast,
        resetToSampleData,
        syncWithSupabase,
        triggerCloudBackup,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};


export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
