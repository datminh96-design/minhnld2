-- ==============================================================================
-- DATABASE SCHEMA: NGUYỄN LÊ ĐẠT MINH - GIỜ CÔNG | CHI TIÊU | ĐẦU TƯ
-- System: Supabase PostgreSQL with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT 'Nguyễn Lê Đạt Minh',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. USER SETTINGS & PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system',
    currency TEXT DEFAULT 'VND',
    currency_format TEXT DEFAULT 'vi-VN',
    cost_calculation_method TEXT DEFAULT 'weighted_average', -- 'weighted_average' | 'fifo'
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. WORK SETTINGS (Default times for attendance)
CREATE TABLE IF NOT EXISTS public.work_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    default_check_in TIME NOT NULL DEFAULT '08:00:00',
    default_check_out TIME NOT NULL DEFAULT '18:00:00',
    default_break_start TIME NOT NULL DEFAULT '12:00:00',
    default_break_end TIME NOT NULL DEFAULT '14:00:00',
    standard_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. WORK LOGS (Attendance & Hours)
CREATE TABLE IF NOT EXISTS public.work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    break_start TIME,
    break_end TIME,
    break_duration_hours NUMERIC(4,2) DEFAULT 2.00,
    total_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    missing_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    work_status TEXT NOT NULL DEFAULT 'Làm việc', 
    -- 'Làm việc', 'Nghỉ phép', 'Nghỉ không lương', 'Nghỉ lễ', 'Làm nửa ngày', 'Tăng ca'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_work_date UNIQUE (user_id, work_date)
);

-- 5. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    color TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 6. TRANSACTIONS (Income & Expense)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. INVESTMENT ASSETS
CREATE TABLE IF NOT EXISTS public.investment_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock', 'fund', 'gold', 'other')),
    current_price NUMERIC(18,4) NOT NULL DEFAULT 0,
    price_updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_asset_symbol UNIQUE (user_id, asset_symbol)
);

-- 8. INVESTMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'reward', 'dividend', 'adjustment')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
    price NUMERIC(18,4) NOT NULL CHECK (price >= 0),
    fee NUMERIC(15,2) DEFAULT 0 CHECK (fee >= 0),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. PORTFOLIO SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value NUMERIC(18,2) NOT NULL,
    total_cost NUMERIC(18,2) NOT NULL,
    total_profit NUMERIC(18,2) NOT NULL,
    profit_percentage NUMERIC(8,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON public.work_logs(user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_investment_assets_user ON public.investment_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_tx_user_asset ON public.investment_transactions(user_id, asset_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date ASC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Work Settings Policies
DROP POLICY IF EXISTS "Users can view own work settings" ON public.work_settings;
CREATE POLICY "Users can view own work settings" ON public.work_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own work settings" ON public.work_settings;
CREATE POLICY "Users can insert own work settings" ON public.work_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own work settings" ON public.work_settings;
CREATE POLICY "Users can update own work settings" ON public.work_settings FOR UPDATE USING (auth.uid() = user_id);

-- Work Logs Policies
DROP POLICY IF EXISTS "Users can view own work logs" ON public.work_logs;
CREATE POLICY "Users can view own work logs" ON public.work_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own work logs" ON public.work_logs;
CREATE POLICY "Users can insert own work logs" ON public.work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own work logs" ON public.work_logs;
CREATE POLICY "Users can update own work logs" ON public.work_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own work logs" ON public.work_logs;
CREATE POLICY "Users can delete own work logs" ON public.work_logs FOR DELETE USING (auth.uid() = user_id);

-- Expense Categories Policies
DROP POLICY IF EXISTS "Users can view own and default categories" ON public.expense_categories;
CREATE POLICY "Users can view own and default categories" ON public.expense_categories FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);
DROP POLICY IF EXISTS "Users can insert own categories" ON public.expense_categories;
CREATE POLICY "Users can insert own categories" ON public.expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own categories" ON public.expense_categories;
CREATE POLICY "Users can update own categories" ON public.expense_categories FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own categories" ON public.expense_categories;
CREATE POLICY "Users can delete own categories" ON public.expense_categories FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Investment Assets Policies
DROP POLICY IF EXISTS "Users can view own investment assets" ON public.investment_assets;
CREATE POLICY "Users can view own investment assets" ON public.investment_assets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own investment assets" ON public.investment_assets;
CREATE POLICY "Users can insert own investment assets" ON public.investment_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own investment assets" ON public.investment_assets;
CREATE POLICY "Users can update own investment assets" ON public.investment_assets FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own investment assets" ON public.investment_assets;
CREATE POLICY "Users can delete own investment assets" ON public.investment_assets FOR DELETE USING (auth.uid() = user_id);

-- Investment Transactions Policies
DROP POLICY IF EXISTS "Users can view own investment tx" ON public.investment_transactions;
CREATE POLICY "Users can view own investment tx" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own investment tx" ON public.investment_transactions;
CREATE POLICY "Users can insert own investment tx" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own investment tx" ON public.investment_transactions;
CREATE POLICY "Users can update own investment tx" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own investment tx" ON public.investment_transactions;
CREATE POLICY "Users can delete own investment tx" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);

-- Portfolio Snapshots Policies
DROP POLICY IF EXISTS "Users can view own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can view own portfolio snapshots" ON public.portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can insert own portfolio snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can update own portfolio snapshots" ON public.portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users can delete own portfolio snapshots" ON public.portfolio_snapshots FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP & PROFILE CREATION TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_work_settings_updated_at BEFORE UPDATE ON public.work_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_investment_assets_updated_at BEFORE UPDATE ON public.investment_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger on user creation to create profile, default settings and categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nguyễn Lê Đạt Minh'), NEW.raw_user_meta_data->>'avatar_url');

    -- Create default work settings
    INSERT INTO public.work_settings (user_id, default_check_in, default_check_out, default_break_start, default_break_end, standard_hours_per_day)
    VALUES (NEW.id, '08:00:00', '18:00:00', '12:00:00', '14:00:00', 8.00);

    -- Create default user settings
    INSERT INTO public.user_settings (user_id, theme, currency, currency_format, cost_calculation_method)
    VALUES (NEW.id, 'system', 'VND', 'vi-VN', 'weighted_average');

    -- Default Income categories
    INSERT INTO public.expense_categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Lương', 'income', 'Briefcase', '#10B981', TRUE),
        (NEW.id, 'Thưởng', 'income', 'Award', '#059669', TRUE),
        (NEW.id, 'Làm thêm', 'income', 'Clock', '#34D399', TRUE),
        (NEW.id, 'Kinh doanh', 'income', 'TrendingUp', '#6EE7B7', TRUE),
        (NEW.id, 'Đầu tư', 'income', 'PieChart', '#14B8A6', TRUE),
        (NEW.id, 'Thu nhập khác', 'income', 'PlusCircle', '#0D9488', TRUE);

    -- Default Expense categories
    INSERT INTO public.expense_categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Ăn uống', 'expense', 'Utensils', '#EF4444', TRUE),
        (NEW.id, 'Nhà ở', 'expense', 'Home', '#F97316', TRUE),
        (NEW.id, 'Đi lại', 'expense', 'Car', '#F59E0B', TRUE),
        (NEW.id, 'Xăng xe', 'expense', 'Fuel', '#EAB308', TRUE),
        (NEW.id, 'Điện nước', 'expense', 'Zap', '#84CC16', TRUE),
        (NEW.id, 'Mua sắm', 'expense', 'ShoppingBag', '#06B6D4', TRUE),
        (NEW.id, 'Giải trí', 'expense', 'Film', '#6366F1', TRUE),
        (NEW.id, 'Y tế', 'expense', 'HeartPulse', '#EC4899', TRUE),
        (NEW.id, 'Gia đình', 'expense', 'Users', '#8B5CF6', TRUE),
        (NEW.id, 'Công việc', 'expense', 'Laptop', '#64748B', TRUE),
        (NEW.id, 'Đầu tư', 'expense', 'Coins', '#0EA5E9', TRUE),
        (NEW.id, 'Khác', 'expense', 'MoreHorizontal', '#94A3B8', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ENABLE SUPABASE REALTIME FOR MULTI-DEVICE INSTANT SYNCHRONIZATION
-- ==============================================================================
DO $$
BEGIN
    -- Add tables to realtime publication if they are not already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.work_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.work_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_categories;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_assets;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_transactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_snapshots;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

