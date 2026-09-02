import { 
  WorkLog, 
  ExpenseCategory, 
  Transaction, 
  InvestmentAsset, 
  InvestmentTransaction, 
  PortfolioSnapshot,
  WorkSettings,
  UserSettings,
  Profile
} from '../types';

export const DEFAULT_PROFILE: Profile = {
  id: 'demo-user-id',
  full_name: 'Nguyễn Lê Đạt Minh',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  email: 'datminh96@gmail.com',
};

export const DEFAULT_WORK_SETTINGS: WorkSettings = {
  default_check_in: '08:00',
  default_check_out: '18:00',
  default_break_start: '12:00',
  default_break_end: '14:00',
  standard_hours_per_day: 8.0,
  standard_days_per_month: 26, // 26 days * 8h = 208h standard hours
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark',
  currency: 'VND',
  currency_format: 'vi-VN',
  cost_calculation_method: 'weighted_average',
};

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  // Income
  { id: 'cat-inc-1', name: 'Lương', type: 'income', icon: 'Briefcase', color: '#10B981', is_default: true },
  { id: 'cat-inc-2', name: 'Thưởng', type: 'income', icon: 'Award', color: '#059669', is_default: true },
  { id: 'cat-inc-3', name: 'Làm thêm', type: 'income', icon: 'Clock', color: '#34D399', is_default: true },
  { id: 'cat-inc-4', name: 'Kinh doanh', type: 'income', icon: 'TrendingUp', color: '#6EE7B7', is_default: true },
  { id: 'cat-inc-5', name: 'Đầu tư & Cổ tức', type: 'income', icon: 'PieChart', color: '#14B8A6', is_default: true },
  { id: 'cat-inc-6', name: 'Thu nhập khác', type: 'income', icon: 'PlusCircle', color: '#0D9488', is_default: true },

  // Expense
  { id: 'cat-exp-1', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#EF4444', is_default: true },
  { id: 'cat-exp-2', name: 'Nhà ở & Tiện ích', type: 'expense', icon: 'Home', color: '#F97316', is_default: true },
  { id: 'cat-exp-3', name: 'Đi lại & Xe cộ', type: 'expense', icon: 'Car', color: '#F59E0B', is_default: true },
  { id: 'cat-exp-4', name: 'Xăng xe', type: 'expense', icon: 'Fuel', color: '#EAB308', is_default: true },
  { id: 'cat-exp-5', name: 'Điện nước & Internet', type: 'expense', icon: 'Zap', color: '#84CC16', is_default: true },
  { id: 'cat-exp-6', name: 'Mua sắm & Thiết bị', type: 'expense', icon: 'ShoppingBag', color: '#06B6D4', is_default: true },
  { id: 'cat-exp-7', name: 'Giải trí & Du lịch', type: 'expense', icon: 'Film', color: '#6366F1', is_default: true },
  { id: 'cat-exp-8', name: 'Y tế & Sức khỏe', type: 'expense', icon: 'HeartPulse', color: '#EC4899', is_default: true },
  { id: 'cat-exp-9', name: 'Gia đình & Hiếu hỷ', type: 'expense', icon: 'Users', color: '#8B5CF6', is_default: true },
  { id: 'cat-exp-10', name: 'Công việc & Học tập', type: 'expense', icon: 'Laptop', color: '#64748B', is_default: true },
  { id: 'cat-exp-11', name: 'Tích lũy & Đầu tư', type: 'expense', icon: 'Coins', color: '#0EA5E9', is_default: true },
  { id: 'cat-exp-12', name: 'Chi tiêu khác', type: 'expense', icon: 'MoreHorizontal', color: '#94A3B8', is_default: true },
];

export const getInitialWorkLogs = (): WorkLog[] => {
  return [];
};

export const getInitialTransactions = (): Transaction[] => {
  return [];
};

export const getInitialInvestmentAssets = (): InvestmentAsset[] => {
  return [];
};

export const getInitialInvestmentTransactions = (): InvestmentTransaction[] => {
  return [];
};

export const getInitialPortfolioSnapshots = (): PortfolioSnapshot[] => {
  return [];
};
