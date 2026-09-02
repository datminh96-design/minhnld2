# NGUYỄN LÊ ĐẠT MINH – GIỜ CÔNG | CHI TIÊU | ĐẦU TƯ

Web Application hiện đại, toàn diện và tối ưu hóa cao dành cho quản lý tài chính cá nhân và giờ công làm việc.

---

## 🌟 3 TÍNH NĂNG CỐT LÕI

### 1. ⏱️ QUẢN LÝ GIỜ CÔNG (Work Management)
- **Chấm công thông minh**: Giờ vào (08:00), Giờ ra (18:00), Nghỉ trưa (12:00 - 14:00), Chuẩn 8h/ngày.
- **Tự động tính toán**: Tổng giờ làm, Giờ tăng ca (OT > 8h), Giờ còn thiếu (< 8h), Phụ cấp.
- **Phân loại trạng thái**: *Làm việc, Tăng ca, Làm nửa ngày, Nghỉ phép, Nghỉ lễ, Nghỉ không lương*.
- **Xuất báo cáo Excel**: Tạo file Excel bảng chấm công chi tiết theo tháng với 1 click.
- **Biểu đồ thống kê**: Trực quan hóa số giờ làm việc theo ngày và theo tuần.

### 2. 💰 QUẢN LÝ CHI TIÊU (Expense Management)
- **Quản lý thu / chi**: Phân loại theo 🟢 Thu nhập và 🔴 Chi tiêu.
- **Danh mục đa dạng & Tùy biến**: Ăn uống, Nhà ở, Đi lại, Lương, Thưởng, Đầu tư... và tạo danh mục mới tùy thích.
- **Bộ lọc mạnh mẽ**: Hôm nay, Tuần này, Tháng này, 3 tháng, 6 tháng, 1 năm, Tùy chỉnh ngày, Tìm kiếm từ khóa.
- **Phân tích dòng tiền**: Biểu đồ tròn tỷ trọng danh mục (Pie Chart), Biểu đồ so sánh Thu - Chi theo tháng (Bar Chart), Xu hướng chi tiêu (Area Chart).

### 3. 📈 QUẢN LÝ ĐẦU TƯ (Investment Management)
- **Đa dạng loại tài sản**: Crypto, Cổ phiếu (Stocks), Chứng chỉ Quỹ (Funds), Vàng (Gold), Khác.
- **Sổ lệnh giao dịch**: Mua (Buy), Bán (Sell), Cổ tức (Dividend).
- **Tự động tính giá vốn (DCA)**: Tính khối lượng nắm giữ, Giá vốn trung bình, Giá trị thị trường và Lợi nhuận/Lỗ (+/- amount & %).
- **Cập nhật giá Live**: Đồng bộ và mô phỏng giá thị trường theo thời gian thực.
- **Biểu đồ danh mục**: Tỷ trọng phân bổ tài sản & Hiệu suất sinh lời từng mã.

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI LÊN VERCEL & SUPABASE

### Bước 1: Tạo Dự Án Trên Supabase
1. Truy cập [supabase.com](https://supabase.com) và tạo một dự án mới.
2. Vào mục **SQL Editor** trong bảng điều khiển Supabase.
3. Mở file `supabase/schema.sql` trong mã nguồn dự án này, dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
4. Toàn bộ các bảng (`profiles`, `work_logs`, `transactions`, `investment_assets`, `investment_transactions`, `portfolio_snapshots`, `categories`, `user_settings`), RLS Policies và Triggers sẽ được khởi tạo tự động.

### Bước 2: Lấy Khóa API Supabase
1. Vào **Project Settings** > **API** trên Supabase.
2. Sao chép:
   - `Project URL`
   - `anon public key`

### Bước 3: Triển Khai Lên Vercel
1. Đẩy code lên GitHub Repository của bạn.
2. Truy cập [vercel.com](https://vercel.com) và chọn **Add New Project** > Import từ repo vừa tạo.
3. Trong mục **Environment Variables**, thêm 2 biến:
   - `VITE_SUPABASE_URL` = `<Project URL của bạn>`
   - `VITE_SUPABASE_ANON_KEY` = `<anon key của bạn>`
4. Nhấn **Deploy**.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Icons**: Lucide Icons
- **Data Visualization**: Recharts
- **Excel Engine**: SheetJS (XLSX)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **Local Fallback**: LocalStorage Offline-first mode
