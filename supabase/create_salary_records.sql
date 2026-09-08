-- ==============================================================================
-- TẠO BẢNG LƯƠNG THÁNG (salary_records) & CỘT DỰ PHÒNG CHO work_settings
-- Chạy đoạn SQL này trong mục "SQL Editor" trên trang Supabase của bạn
-- ==============================================================================

-- 1. Bổ sung cột salary_data vào work_settings nếu chưa có
ALTER TABLE IF EXISTS public.work_settings 
ADD COLUMN IF NOT EXISTS salary_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.work_settings 
ADD COLUMN IF NOT EXISTS standard_days_per_month NUMERIC(4,2) DEFAULT 26.00;

-- 2. Tạo bảng chuyên dụng salary_records
CREATE TABLE IF NOT EXISTS public.salary_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    kpi_bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
    sales_bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
    other_allowance NUMERIC(15,2) NOT NULL DEFAULT 0,
    insurance_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_overtime_minutes INTEGER DEFAULT 0,
    overtime_pay NUMERIC(15,2) DEFAULT 0,
    total_salary NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_user_month_year UNIQUE (user_id, month, year)
);

-- Tạo Index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_salary_records_user_year ON public.salary_records(user_id, year DESC, month DESC);

-- Bật Row Level Security (RLS)
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

-- Cấp quyền truy cập đọc/ghi đầy đủ cho người dùng và các thiết bị
DROP POLICY IF EXISTS "salary_records_all_access" ON public.salary_records;
CREATE POLICY "salary_records_all_access" 
ON public.salary_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Bật Realtime cho bảng salary_records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_records;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.work_settings;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
