-- ==============================================================================
-- SUPABASE POSTGRESQL MASTER DATABASE SCHEMA & MIGRATION SCRIPT
-- Application: Quản Lý Giờ Công, Chi Tiêu & Danh Mục Đầu Tư (Nguyễn Lê Đạt Minh)
-- Author: Senior Software Architect
-- Compatible: Supabase PostgreSQL 15+, Cloudflare R2, Resend Email API
-- ==============================================================================

-- 1. BẬT TIỆN ÍCH EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. KHỞI TẠO CÁC BẢNG DỮ LIỆU (DDL TABLES)
-- ==============================================================================

-- 2.1 BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL DEFAULT 'Nguyễn Lê Đạt Minh',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.2 BẢNG CÀI ĐẶT NGƯỜI DÙNG (USER SETTINGS)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND', 'USD')),
    currency_format TEXT DEFAULT 'vi-VN',
    cost_calculation_method TEXT DEFAULT 'weighted_average' CHECK (cost_calculation_method IN ('weighted_average', 'fifo')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.3 BẢNG CẤU HÌNH GIỜ LÀM VIỆC CHUẨN (WORK SETTINGS)
CREATE TABLE IF NOT EXISTS public.work_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    default_check_in TIME NOT NULL DEFAULT '08:00:00',
    default_check_out TIME NOT NULL DEFAULT '18:00:00',
    default_break_start TIME NOT NULL DEFAULT '12:00:00',
    default_break_end TIME NOT NULL DEFAULT '14:00:00',
    standard_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    standard_days_per_month INTEGER DEFAULT 26,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.4 BẢNG NHẬT KÝ CHẤM CÔNG (WORK LOGS)
CREATE TABLE IF NOT EXISTS public.work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    break_start TIME,
    break_end TIME,
    break_duration_hours NUMERIC(4,2) DEFAULT 2.00,
    break_duration_minutes INTEGER DEFAULT 120,
    total_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    total_minutes INTEGER DEFAULT 0,
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    overtime_minutes INTEGER DEFAULT 0,
    missing_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    missing_minutes INTEGER DEFAULT 0,
    work_status TEXT NOT NULL DEFAULT 'Làm việc' 
        CHECK (work_status IN ('Làm việc', 'Nghỉ phép', 'Nghỉ không lương', 'Nghỉ lễ', 'Làm nửa ngày', 'Tăng ca')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_work_date UNIQUE (user_id, work_date)
);

-- 2.5 BẢNG DANH MỤC THU CHI (EXPENSE CATEGORIES)
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    color TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.6 BẢNG GIAO DỊCH THU CHI (TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.7 BẢNG TÀI SẢN ĐẦU TƯ (INVESTMENT ASSETS)
CREATE TABLE IF NOT EXISTS public.investment_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock', 'fund', 'gold', 'other')),
    current_price NUMERIC(18,4) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    price_updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_asset_symbol UNIQUE (user_id, asset_symbol)
);

-- 2.8 BẢNG LỊCH SỬ MUA BÁN ĐẦU TƯ (INVESTMENT TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'reward', 'dividend', 'adjustment')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC(24,8) NOT NULL CHECK (quantity > 0),
    price NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (price >= 0),
    price_per_unit NUMERIC(18,4) DEFAULT 0,
    original_price NUMERIC(18,4) DEFAULT 0,
    price_currency TEXT DEFAULT 'VND',
    fee NUMERIC(18,2) DEFAULT 0 CHECK (fee >= 0),
    original_fee NUMERIC(18,4) DEFAULT 0,
    fee_currency TEXT DEFAULT 'VND',
    usdt_rate NUMERIC(18,2) DEFAULT 25400,
    bnb_price_usdt NUMERIC(18,2) DEFAULT 600,
    total_amount NUMERIC(18,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.9 BẢNG ẢNH CHỤP DANH MỤC ĐẦU TƯ (PORTFOLIO SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value NUMERIC(18,2) NOT NULL,
    total_cost NUMERIC(18,2) NOT NULL,
    total_profit NUMERIC(18,2) NOT NULL,
    profit_percentage NUMERIC(8,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

-- 2.10 BẢNG LỊCH SỬ SAO LƯU HỆ THỐNG (SYSTEM BACKUPS - R2 & SUPABASE)
CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_name TEXT NOT NULL,
    storage_provider TEXT DEFAULT 'cloudflare_r2',
    file_key TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    records_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.11 BẢNG NHẬT KÝ GỬI EMAIL (EMAIL LOGS)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    template TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'sent', 'failed', 'simulated')),
    message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 3. TỐI ƯU HÓA HIỆU NĂNG - CHỈ MỤC TÌM KIẾM (INDEXES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON public.work_logs(user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_investment_assets_user ON public.investment_assets(user_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_investment_tx_user_asset ON public.investment_transactions(user_id, asset_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date ASC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON public.email_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_backups_user ON public.system_backups(user_id, created_at DESC);

-- ==============================================================================
-- 4. KÍCH HOẠT VÀ THIẾT LẬP BẢO MẬT PHÂN QUYỀN (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Helper macro: Safe Policy Creator Function (Tránh lỗi Duplicate Policy khi chạy lại)
DO $$
BEGIN
    -- PROFILES
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    -- USER SETTINGS
    DROP POLICY IF EXISTS "user_settings_select_policy" ON public.user_settings;
    DROP POLICY IF EXISTS "user_settings_insert_policy" ON public.user_settings;
    DROP POLICY IF EXISTS "user_settings_update_policy" ON public.user_settings;
    CREATE POLICY "user_settings_select_policy" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "user_settings_insert_policy" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "user_settings_update_policy" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

    -- WORK SETTINGS
    DROP POLICY IF EXISTS "work_settings_select_policy" ON public.work_settings;
    DROP POLICY IF EXISTS "work_settings_insert_policy" ON public.work_settings;
    DROP POLICY IF EXISTS "work_settings_update_policy" ON public.work_settings;
    CREATE POLICY "work_settings_select_policy" ON public.work_settings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "work_settings_insert_policy" ON public.work_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "work_settings_update_policy" ON public.work_settings FOR UPDATE USING (auth.uid() = user_id);

    -- WORK LOGS
    DROP POLICY IF EXISTS "work_logs_all_policy" ON public.work_logs;
    CREATE POLICY "work_logs_all_policy" ON public.work_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- EXPENSE CATEGORIES (Cho phép xem danh mục mặc định hoặc của chính mình)
    DROP POLICY IF EXISTS "expense_categories_select_policy" ON public.expense_categories;
    DROP POLICY IF EXISTS "expense_categories_modify_policy" ON public.expense_categories;
    CREATE POLICY "expense_categories_select_policy" ON public.expense_categories FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);
    CREATE POLICY "expense_categories_modify_policy" ON public.expense_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- TRANSACTIONS
    DROP POLICY IF EXISTS "transactions_all_policy" ON public.transactions;
    CREATE POLICY "transactions_all_policy" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- INVESTMENT ASSETS
    DROP POLICY IF EXISTS "investment_assets_all_policy" ON public.investment_assets;
    CREATE POLICY "investment_assets_all_policy" ON public.investment_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- INVESTMENT TRANSACTIONS
    DROP POLICY IF EXISTS "investment_tx_all_policy" ON public.investment_transactions;
    CREATE POLICY "investment_tx_all_policy" ON public.investment_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- PORTFOLIO SNAPSHOTS
    DROP POLICY IF EXISTS "portfolio_snapshots_all_policy" ON public.portfolio_snapshots;
    CREATE POLICY "portfolio_snapshots_all_policy" ON public.portfolio_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- SYSTEM BACKUPS
    DROP POLICY IF EXISTS "system_backups_all_policy" ON public.system_backups;
    CREATE POLICY "system_backups_all_policy" ON public.system_backups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- EMAIL LOGS
    DROP POLICY IF EXISTS "email_logs_all_policy" ON public.email_logs;
    CREATE POLICY "email_logs_all_policy" ON public.email_logs FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL) WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
END $$;

-- ==============================================================================
-- 5. HÀM STORED PROCEDURES & TRIGGERS TỰ ĐỘNG HÓA
-- ==============================================================================

-- 5.1 TRIGGER CẬP NHẬT UPDATED_AT TỰ ĐỘNG
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_work_settings_updated_at ON public.work_settings;
CREATE TRIGGER trg_work_settings_updated_at BEFORE UPDATE ON public.work_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_work_logs_updated_at ON public.work_logs;
CREATE TRIGGER trg_work_logs_updated_at BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_investment_assets_updated_at ON public.investment_assets;
CREATE TRIGGER trg_investment_assets_updated_at BEFORE UPDATE ON public.investment_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5.2 TRIGGER TỰ ĐỘNG KHỞI TẠO TÀI KHOẢN VÀ DỮ LIỆU BAN ĐẦU KHI CÓ USER ĐĂNG KÝ MỚI
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'Nguyễn Lê Đạt Minh');

    -- 1. Khởi tạo Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, user_full_name, NEW.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

    -- 2. Khởi tạo Work Settings mặc định
    INSERT INTO public.work_settings (user_id, default_check_in, default_check_out, default_break_start, default_break_end, standard_hours_per_day, standard_days_per_month)
    VALUES (NEW.id, '08:00:00', '18:00:00', '12:00:00', '14:00:00', 8.00, 26)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Khởi tạo User Settings mặc định
    INSERT INTO public.user_settings (user_id, theme, currency, currency_format, cost_calculation_method)
    VALUES (NEW.id, 'system', 'VND', 'vi-VN', 'weighted_average')
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Khởi tạo Bộ Danh mục Thu Nhập Mặc Định
    INSERT INTO public.expense_categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Lương chính', 'income', 'Briefcase', '#10B981', TRUE),
        (NEW.id, 'Thưởng & Hoa hồng', 'income', 'Award', '#059669', TRUE),
        (NEW.id, 'Làm thêm (OT)', 'income', 'Clock', '#34D399', TRUE),
        (NEW.id, 'Kinh doanh & Freelance', 'income', 'TrendingUp', '#6EE7B7', TRUE),
        (NEW.id, 'Lợi nhuận đầu tư', 'income', 'PieChart', '#14B8A6', TRUE),
        (NEW.id, 'Thu nhập khác', 'income', 'PlusCircle', '#0D9488', TRUE)
    ON CONFLICT DO NOTHING;

    -- 5. Khởi tạo Bộ Danh mục Chi Tiêu Mặc Định
    INSERT INTO public.expense_categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Ăn uống', 'expense', 'Utensils', '#EF4444', TRUE),
        (NEW.id, 'Nhà ở & Tiền thuê', 'expense', 'Home', '#F97316', TRUE),
        (NEW.id, 'Đi lại & Phương tiện', 'expense', 'Car', '#F59E0B', TRUE),
        (NEW.id, 'Xăng xe', 'expense', 'Fuel', '#EAB308', TRUE),
        (NEW.id, 'Điện nước & Internet', 'expense', 'Zap', '#84CC16', TRUE),
        (NEW.id, 'Mua sắm cá nhân', 'expense', 'ShoppingBag', '#06B6D4', TRUE),
        (NEW.id, 'Giải trí & Du lịch', 'expense', 'Film', '#6366F1', TRUE),
        (NEW.id, 'Y tế & Sức khỏe', 'expense', 'HeartPulse', '#EC4899', TRUE),
        (NEW.id, 'Gia đình & Con cái', 'expense', 'Users', '#8B5CF6', TRUE),
        (NEW.id, 'Công việc & Thiết bị', 'expense', 'Laptop', '#64748B', TRUE),
        (NEW.id, 'Tích lũy & Đầu tư', 'expense', 'Coins', '#0EA5E9', TRUE),
        (NEW.id, 'Chi tiêu khác', 'expense', 'MoreHorizontal', '#94A3B8', TRUE)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- HOÀN TẤT THIẾT LẬP CƠ SỞ DỮ LIỆU SUPABASE SẴN SÀNG 100%
-- ==============================================================================
