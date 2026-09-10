export type ThemeMode = 'light' | 'dark' | 'system';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type WorkStatus = 
  | 'Làm việc'
  | 'Tăng ca'
  | 'Làm nửa ngày'
  | 'Nghỉ phép năm'
  | 'Nghỉ lễ'
  | 'Nghỉ phép'
  | 'Nghỉ không lương';

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
  employee_id?: string; // e.g. '42157'
  employee_name?: string; // e.g. 'Họ tên NV'
  default_check_in: string; // e.g. '08:00'
  default_check_out: string; // e.g. '18:00'
  default_break_start: string; // e.g. '12:00'
  default_break_end: string; // e.g. '14:00'
  standard_hours_per_day: number; // e.g. 8.0
  standard_days_per_month?: number; // e.g. 26 days (26 * 8h = 208h)
  salary_data?: Record<string, any>; // Backup salary JSON
}

export interface MonthlySalaryData {
  baseSalary: number;
  kpiBonus: number;
  salesBonus: number;
  otherAllowance: number;
  insuranceDeduction: number;
}

export interface SalaryRecord {
  id?: string;
  user_id?: string;
  month: number;
  year: number;
  base_salary: number;
  kpi_bonus: number;
  sales_bonus: number;
  other_allowance: number;
  insurance_deduction: number;
  total_overtime_minutes?: number;
  overtime_pay?: number;
  total_salary?: number;
  created_at?: string;
  updated_at?: string;
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

export type AssetType = 'crypto' | 'stock' | 'fund' | 'gold' | 'other'
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

export interface BusinessTripExpense {
  id: string;
  user_id?: string;
  trip_date: string; // YYYY-MM-DD (Ngày bắt đầu/công tác)
  end_date?: string; // YYYY-MM-DD
  days_count: number; // Số ngày công tác
  daily_allowance_rate: number; // 160000 hoặc 200000 hoặc số tiền khác
  total_daily_allowance: number; // days_count * daily_allowance_rate
  hotel_cost: number; // Tiền khách sạn
  outbound_cost: number; // Tiền lượt đi
  return_cost: number; // Tiền lượt về
  total_amount: number; // Tổng tiền = Tiền phụ cấp ngày + Khách sạn + Lượt đi + Lượt về
  is_paid: boolean; // false = Chờ thanh toán (đỏ), true = Đã thanh toán (xanh mờ, đưa xuống dưới cùng)
  paid_at?: string; // Thời gian đánh dấu thanh toán
  location?: string; // Địa điểm / Mục đích công tác
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

