
-- Xóa bảng cũ nếu muốn làm lại từ đầu (cẩn thận mất dữ liệu, nếu không muốn mất thì bỏ qua đoạn DROP này)
-- DROP TABLE IF EXISTS public.portfolio_snapshots CASCADE;
-- DROP TABLE IF EXISTS public.investment_transactions CASCADE;
-- DROP TABLE IF EXISTS public.investment_assets CASCADE;

-- 1. TẠO BẢNG TÀI SẢN ĐẦU TƯ
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

-- 2. TẠO BẢNG GIAO DỊCH ĐẦU TƯ
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

-- BẬT BẢO MẬT
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- CẤP QUYỀN (Sử dụng DO khối ẩn danh để tránh lỗi trùng lặp policy)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own investment assets') THEN
        CREATE POLICY "Users can view own investment assets" ON public.investment_assets FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own investment assets') THEN
        CREATE POLICY "Users can insert own investment assets" ON public.investment_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own investment assets') THEN
        CREATE POLICY "Users can update own investment assets" ON public.investment_assets FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own investment assets') THEN
        CREATE POLICY "Users can delete own investment assets" ON public.investment_assets FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own investment tx') THEN
        CREATE POLICY "Users can view own investment tx" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own investment tx') THEN
        CREATE POLICY "Users can insert own investment tx" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own investment tx') THEN
        CREATE POLICY "Users can update own investment tx" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own investment tx') THEN
        CREATE POLICY "Users can delete own investment tx" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
