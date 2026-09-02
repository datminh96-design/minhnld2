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
  const currentYear = 2026;
  const currentMonth = 9; // Tháng 09/2026 như trong ví dụ prompt
  const logs: WorkLog[] = [];

  // Tạo dữ liệu các ngày trong tháng 9/2026 chuẩn theo mẫu Bảng Ghi Giờ Làm
  const sampleDays = [
    { day: 1, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 2, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 3, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 4, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 5, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 6, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 7, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'HT Lagi', total: 9, ot: 1.0, missing: 0 },
    { day: 8, checkIn: '06:00', checkOut: '18:00', status: 'Tăng ca', note: 'HT Lagi', total: 10, ot: 2.0, missing: 0 },
    { day: 9, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'DC DLK', total: 8, ot: 0, missing: 0 },
    { day: 10, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'DLK', total: 8, ot: 0, missing: 0 },
    { day: 11, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'DLK', total: 8, ot: 0, missing: 0 },
    { day: 12, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'DLK', total: 8, ot: 0, missing: 0 },
    { day: 13, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'Chấm công muộn shop mất điện', total: 8, ot: 0, missing: 0 },
    { day: 14, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'DLK', total: 8, ot: 0, missing: 0 },
    { day: 15, checkIn: '08:00', checkOut: '18:00', status: 'Làm việc', note: 'Chấm công muộn di chuyển DLK-LDG', total: 8, ot: 0, missing: 0 },
    { day: 16, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'KT ĐăkMil', total: 9, ot: 1.0, missing: 0 },
    { day: 17, checkIn: '06:00', checkOut: '20:00', status: 'Tăng ca', note: 'KT ĐăkMil', total: 12, ot: 4.0, missing: 0 },
    { day: 18, checkIn: '07:00', checkOut: '19:00', status: 'Tăng ca', note: 'KT ĐăkMil', total: 10, ot: 2.0, missing: 0 },
    { day: 19, checkIn: '07:00', checkOut: '19:00', status: 'Tăng ca', note: 'KT ĐăkMil', total: 10, ot: 2.0, missing: 0 },
    { day: 20, checkIn: '07:00', checkOut: '20:00', status: 'Tăng ca', note: 'KT ĐăkMil', total: 11, ot: 3.0, missing: 0 },
    { day: 21, checkIn: '04:30', checkOut: '19:30', status: 'Tăng ca', note: 'KT ĐăkMil', total: 13, ot: 5.0, missing: 0 },
    { day: 22, checkIn: '06:30', checkOut: '18:30', status: 'Tăng ca', note: 'KT ĐăkMil', total: 10, ot: 2.0, missing: 0 },
    { day: 23, checkIn: '06:30', checkOut: '18:30', status: 'Tăng ca', note: 'KT ĐăkMil', total: 10, ot: 2.0, missing: 0 },
    { day: 24, checkIn: '07:00', checkOut: '18:30', status: 'Tăng ca', note: 'KT ĐăkMil', total: 9.5, ot: 1.5, missing: 0 },
    { day: 25, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'GPP EaKar', total: 9, ot: 1.0, missing: 0 },
    { day: 26, checkIn: '07:00', checkOut: '18:00', status: 'Làm việc', note: 'GPP EaKar', total: 9, ot: 1.0, missing: 0 },
    { day: 27, checkIn: '', checkOut: '', status: 'Nghỉ phép', note: 'Off', total: 0, ot: 0, missing: 0 },
    { day: 28, checkIn: '', checkOut: '', status: 'Nghỉ phép', note: 'Off', total: 0, ot: 0, missing: 0 },
    { day: 29, checkIn: '', checkOut: '', status: 'Nghỉ phép', note: 'Off', total: 0, ot: 0, missing: 0 },
    { day: 30, checkIn: '', checkOut: '', status: 'Nghỉ lễ', note: 'Nghỉ Lễ', total: 0, ot: 0, missing: 0 },
  ];

  sampleDays.forEach(d => {
    const dayStr = d.day < 10 ? `0${d.day}` : `${d.day}`;
    const totalMinutes = Math.round(d.total * 60);
    const otMinutes = Math.round(d.ot * 60);
    const missingMinutes = Math.round(d.missing * 60);
    const breakMinutes = d.status === 'Nghỉ phép' || d.status === 'Nghỉ lễ' || d.status === 'Làm nửa ngày' ? 0 : 120;
    const breakHours = breakMinutes / 60;

    logs.push({
      id: `log-2026-09-${dayStr}`,
      work_date: `2026-09-${dayStr}`,
      check_in: d.checkIn,
      check_out: d.checkOut,
      break_start: '12:00',
      break_end: '14:00',
      break_duration_hours: breakHours,
      break_duration_minutes: breakMinutes,
      total_hours: d.total,
      total_minutes: totalMinutes,
      overtime_hours: d.ot,
      overtime_minutes: otMinutes,
      missing_hours: d.missing,
      missing_minutes: missingMinutes,
      work_status: d.status as any,
      notes: d.note,
    });
  });

  return logs;
};

export const getInitialTransactions = (): Transaction[] => {
  return [
    {
      id: 'tx-1',
      transaction_date: '2026-09-05',
      transaction_type: 'income',
      category_id: 'cat-inc-1',
      category_name: 'Lương',
      amount: 45000000,
      note: 'Lương chuyển khoản tháng 08',
    },
    {
      id: 'tx-2',
      transaction_date: '2026-09-06',
      transaction_type: 'income',
      category_id: 'cat-inc-2',
      category_name: 'Thưởng',
      amount: 12000000,
      note: 'Thưởng KPI dự án Q3',
    },
    {
      id: 'tx-3',
      transaction_date: '2026-09-12',
      transaction_type: 'income',
      category_id: 'cat-inc-3',
      category_name: 'Làm thêm',
      amount: 8500000,
      note: 'Freelance tư vấn giải pháp Cloud',
    },
    {
      id: 'tx-4',
      transaction_date: '2026-09-01',
      transaction_type: 'expense',
      category_id: 'cat-exp-2',
      category_name: 'Nhà ở & Tiện ích',
      amount: 9000000,
      note: 'Tiền thuê căn hộ tháng 9',
    },
    {
      id: 'tx-5',
      transaction_date: '2026-09-03',
      transaction_type: 'expense',
      category_id: 'cat-exp-5',
      category_name: 'Điện nước & Internet',
      amount: 1850000,
      note: 'Hóa đơn tiền điện + gói cước cáp quang',
    },
    {
      id: 'tx-6',
      transaction_date: '2026-09-04',
      transaction_type: 'expense',
      category_id: 'cat-exp-1',
      category_name: 'Ăn uống',
      amount: 3200000,
      note: 'Đi siêu thị thực phẩm tuần đầu',
    },
    {
      id: 'tx-7',
      transaction_date: '2026-09-08',
      transaction_type: 'expense',
      category_id: 'cat-exp-4',
      category_name: 'Xăng xe',
      amount: 600000,
      note: 'Đổ xăng xe máy và bảo dưỡng',
    },
    {
      id: 'tx-8',
      transaction_date: '2026-09-10',
      transaction_type: 'expense',
      category_id: 'cat-exp-6',
      category_name: 'Mua sắm & Thiết bị',
      amount: 4500000,
      note: 'Bàn phím cơ công thái học & chuột không dây',
    },
    {
      id: 'tx-9',
      transaction_date: '2026-09-15',
      transaction_type: 'expense',
      category_id: 'cat-exp-7',
      category_name: 'Giải trí & Du lịch',
      amount: 2200000,
      note: 'Ăn tối liên hoan đội ngũ & xem phim cuối tuần',
    },
    {
      id: 'tx-10',
      transaction_date: '2026-09-18',
      transaction_type: 'expense',
      category_id: 'cat-exp-1',
      category_name: 'Ăn uống',
      amount: 2800000,
      note: 'Thực phẩm dinh dưỡng & cafe làm việc',
    },
    {
      id: 'tx-11',
      transaction_date: '2026-09-20',
      transaction_type: 'expense',
      category_id: 'cat-exp-9',
      category_name: 'Gia đình & Hiếu hỷ',
      amount: 3000000,
      note: 'Gửi tiền biếu bố mẹ',
    },
  ];
};

export const getInitialInvestmentAssets = (): InvestmentAsset[] => {
  return [
    {
      id: 'asset-btc',
      asset_name: 'Bitcoin',
      asset_symbol: 'BTC',
      asset_type: 'crypto',
      current_price: 1650000000, // ~ 65,000 USD quy đổi VND
      price_updated_at: new Date().toISOString(),
      notes: 'Tài sản crypto phòng hộ lạm phát dài hạn',
    },
    {
      id: 'asset-tpb',
      asset_name: 'Tiên Phong Bank',
      asset_symbol: 'TPB',
      asset_type: 'stock',
      current_price: 14650, // Giá khớp lệnh thực tế sàn HOSE (14.65)
      price_updated_at: new Date().toISOString(),
      notes: 'Cổ phiếu ngân hàng số niêm yết sàn HOSE',
    },
    {
      id: 'asset-veof',
      asset_name: 'VinaCapital Equity Opportunity Fund',
      asset_symbol: 'VEOF',
      asset_type: 'fund',
      current_price: 33192, // Giá NAV quỹ mở VinaCapital
      price_updated_at: new Date().toISOString(),
      notes: 'Chứng chỉ quỹ mở đầu tư cổ phiếu VinaCapital VEOF',
    },
    {
      id: 'asset-gold',
      asset_name: 'Vàng Nhẫn 9999 SJC',
      asset_symbol: 'SJC',
      asset_type: 'gold',
      current_price: 145500000, // Giá vàng SJC thực tế (VND / Lượng)
      price_updated_at: new Date().toISOString(),
      notes: 'Vàng tích sản truyền thống an toàn',
    },
  ];
};

export const getInitialInvestmentTransactions = (): InvestmentTransaction[] => {
  return [
    // BTC: Mua 0.15 BTC @ 1,420,000,000
    {
      id: 'itx-1',
      asset_id: 'asset-btc',
      transaction_type: 'buy',
      transaction_date: '2026-03-15',
      quantity: 0.15,
      price: 1420000000,
      fee: 200000,
      note: 'DCA đợt tích lũy quý 1',
    },
    // BTC: Mua thêm 0.05 BTC @ 1,510,000,000
    {
      id: 'itx-2',
      asset_id: 'asset-btc',
      transaction_type: 'buy',
      transaction_date: '2026-06-20',
      quantity: 0.05,
      price: 1510000000,
      fee: 100000,
      note: 'Mua khi thị trường điều chỉnh ngắn hạn',
    },
    // TPB: Mua 5,000 CP @ 18,500
    {
      id: 'itx-3',
      asset_id: 'asset-tpb',
      transaction_type: 'buy',
      transaction_date: '2026-02-10',
      quantity: 5000,
      price: 18500,
      fee: 150000,
      note: 'Mua đón sóng kết quả kinh doanh Q1',
    },
    // TPB: Mua thêm 3,000 CP @ 19,200
    {
      id: 'itx-4',
      asset_id: 'asset-tpb',
      transaction_type: 'buy',
      transaction_date: '2026-05-18',
      quantity: 3000,
      price: 19200,
      fee: 90000,
      note: 'Gia tăng tỷ trọng',
    },
    // TPB: Nhận cổ tức tiền mặt
    {
      id: 'itx-5',
      asset_id: 'asset-tpb',
      transaction_type: 'dividend',
      transaction_date: '2026-07-15',
      quantity: 8000,
      price: 1000, // 1,000đ/cp
      fee: 0,
      note: 'Cổ tức đợt 1 năm 2026',
    },
    // VEOF: Mua 3,500 CCQ @ 31,000
    {
      id: 'itx-6',
      asset_id: 'asset-veof',
      transaction_type: 'buy',
      transaction_date: '2026-01-20',
      quantity: 3500,
      price: 31000,
      fee: 50000,
      note: 'Đầu tư định kỳ SIP tháng 1',
    },
    // VEOF: Mua thêm 2,500 CCQ @ 33,200
    {
      id: 'itx-7',
      asset_id: 'asset-veof',
      transaction_type: 'buy',
      transaction_date: '2026-04-25',
      quantity: 2500,
      price: 33200,
      fee: 40000,
      note: 'Đầu tư định kỳ SIP tháng 4',
    },
    // Gold: Mua 2.0 lượng SJC @ 79,500,000
    {
      id: 'itx-8',
      asset_id: 'asset-gold',
      transaction_type: 'buy',
      transaction_date: '2026-02-15',
      quantity: 2.0,
      price: 79500000,
      fee: 0,
      note: 'Mua vía Thần Tài tích sản',
    },
  ];
};

export const getInitialPortfolioSnapshots = (): PortfolioSnapshot[] => {
  return [
    { id: 'snap-1', snapshot_date: '2026-04-01', total_cost: 580000000, total_value: 610000000, total_profit: 30000000, profit_percentage: 5.17 },
    { id: 'snap-2', snapshot_date: '2026-05-01', total_cost: 620000000, total_value: 665000000, total_profit: 45000000, profit_percentage: 7.25 },
    { id: 'snap-3', snapshot_date: '2026-06-01', total_cost: 680000000, total_value: 735000000, total_profit: 55000000, profit_percentage: 8.08 },
    { id: 'snap-4', snapshot_date: '2026-07-01', total_cost: 710000000, total_value: 785000000, total_profit: 75000000, profit_percentage: 10.56 },
    { id: 'snap-5', snapshot_date: '2026-08-01', total_cost: 715000000, total_value: 820000000, total_profit: 105000000, profit_percentage: 14.68 },
    { id: 'snap-6', snapshot_date: '2026-09-01', total_cost: 742000000, total_value: 873400000, total_profit: 131400000, profit_percentage: 17.70 },
  ];
};
