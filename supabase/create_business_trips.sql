-- ==============================================================================
-- SQL TẠO BẢNG CÔNG TÁC PHÍ (BUSINESS TRIPS) TRÊN SUPABASE
-- Hãy copy toàn bộ đoạn mã này và chạy trong Supabase -> SQL Editor -> Run
-- ==============================================================================

-- 1. Tạo bảng business_trips
CREATE TABLE IF NOT EXISTS public.business_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    end_date DATE,
    days_count NUMERIC(4,1) NOT NULL DEFAULT 1,
    daily_allowance_rate NUMERIC(18,2) NOT NULL DEFAULT 160000,
    total_daily_allowance NUMERIC(18,2) NOT NULL DEFAULT 0,
    hotel_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    outbound_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    return_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Tạo Indexes tăng tốc truy vấn
CREATE INDEX IF NOT EXISTS idx_business_trips_user_date ON public.business_trips(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_trips_user_paid ON public.business_trips(user_id, is_paid);

-- 3. Bật bảo mật Row Level Security (RLS)
ALTER TABLE public.business_trips ENABLE ROW LEVEL SECURITY;

-- 4. Phân quyền người dùng xem & sửa dữ liệu của chính mình
DROP POLICY IF EXISTS "business_trips_all_policy" ON public.business_trips;
CREATE POLICY "business_trips_all_policy" 
    ON public.business_trips 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 5. Trigger cập nhật thời gian updated_at tự động (nếu đã có function handle_updated_at)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        DROP TRIGGER IF EXISTS trg_business_trips_updated_at ON public.business_trips;
        CREATE TRIGGER trg_business_trips_updated_at BEFORE UPDATE ON public.business_trips FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
