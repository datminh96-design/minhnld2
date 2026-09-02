export type ThemeMode = 'light' | 'dark' | 'system';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type WorkStatus = 
  | 'Làm việc'
  | 'Nghỉ phép'
  | 'Nghỉ không lương'
  | 'Nghỉ lễ'
  | 'Làm nửa ngày'
  | 'Tăng ca';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id?: string;
  user_id?: string;
  theme: ThemeMode;
  currency: 'VND' | 'USD';
  currency_format: string;
  cost_calculation_method: 'weighted_average' | 'fifo';
}

export interface WorkSettings {
  id?: string;
  user_id?: string;
  default_check_in: string; // e.g. '08:00'
  default_check_out: string; // e.g. '18:00'
  default_break_start: string; // e.g. '12:00'
  default_break_end: string; // e.g. '14:00'
  standard_hours_per_day: number; // e.g. 8.0
  standard_days_per_month?: number; // e.g. 26 days (26 * 8h = 208h)
}

export interface WorkLog {
  id: string;
  user_id?: string;
  work_date: string; // 'YYYY-MM-DD'
  check_in: string; // 'HH:mm'
  check_out: string; // 'HH:mm'
  break_start: string; // 'HH:mm'
  break_end: string; // 'HH:mm'
  break_duration_hours: number;
  break_duration_minutes?: number; // Minutes
  total_hours: number;
  total_minutes?: number; // Minutes
  overtime_hours: number;
  overtime_minutes?: number; // OT in exact minutes
  missing_hours: number;
  missing_minutes?: number; // Missing in exact minutes
  work_status: WorkStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'income' | 'expense';

export interface ExpenseCategory {
  id: string;
  user_id?: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

export interface Transaction {
  id: string;
  user_id?: string;
  transaction_date: string; // 'YYYY-MM-DD'
  transaction_type: TransactionType;
  category_id?: string;
  category_name: string;
  amount: number;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export type AssetType = 
  | 'Crypto' 
  | 'Cổ phiếu' 
  | 'Quỹ' 
  | 'Vàng' 
  | 'Khác'
  | 'crypto' 
  | 'stock' 
  | 'fund' 
  | 'gold' 
  | 'other';

export type InvestmentTransactionType = 
  | 'buy' 
  | 'sell' 
  | 'reward' 
  | 'dividend' 
  | 'adjustment';

export type InvestmentTxType = InvestmentTransactionType;

export interface InvestmentAsset {
  id: string;
  user_id?: string;
  asset_name: string;
  asset_symbol: string;
  asset_type: AssetType;
  current_price: number;
  currency?: string;
  price_updated_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvestmentTransaction {
  id: string;
  user_id?: string;
  asset_id: string;
  transaction_type: InvestmentTransactionType;
  transaction_date: string; // 'YYYY-MM-DD'
  quantity: number;
  price?: number;
  price_per_unit?: number;
  original_price?: number;
  price_currency?: 'VND' | 'USDT';
  fee: number; // Stored in VND
  original_fee?: number;
  fee_currency?: 'VND' | 'BNB' | 'USDT';
  usdt_rate?: number; // Tỷ giá USDT/VND tại thời điểm giao dịch
  bnb_price_usdt?: number; // Giá BNB tại thời điểm giao dịch (USDT)
  total_amount?: number;
  note?: string;
  notes?: string;
  created_at?: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id?: string;
  snapshot_date: string; // 'YYYY-MM-DD'
  total_value: number;
  total_cost: number;
  total_profit: number;
  profit_percentage: number;
  created_at?: string;
}

export interface CalculatedAssetHolding {
  asset: InvestmentAsset;
  currentQuantity: number;
  totalQuantity: number;
  totalInvested: number; // Tổng vốn còn lại
  avgBuyPrice: number;   // Giá vốn trung bình
  averageCost: number;   // Alias for avgBuyPrice
  currentPrice: number;
  currentValue: number;  // Giá trị hiện tại
  totalProfit: number;   // Lợi nhuận/lỗ tuyệt đối
  profitPercentage: number; // % Lợi nhuận/lỗ
  realizedProfit: number; // Lợi nhuận đã chốt khi bán
  portfolioWeight: number; // Tỷ trọng %
  transactionsCount: number;
}

export type DateFilterPreset = 
  | 'today' 
  | 'week' 
  | 'month' 
  | '3months' 
  | '6months' 
  | '1year' 
  | 'all' 
  | 'custom';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
