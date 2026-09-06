/**
 * Full-fidelity Responsive Transactional HTML Email Generator
 */

export interface EmailRenderResult {
  subject: string;
  html: string;
}

export function generateEmailHtml(template: string, data: Record<string, any> = {}): EmailRenderResult {
  const recipientName = data.recipientName || 'Nguyễn Lê Đạt Minh';
  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseHeader = (badgeText = 'Thông báo giao dịch tự động') => `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%); padding: 32px 24px; text-align: center; border-radius: 16px 16px 0 0; color: #ffffff;">
      <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: rgba(255,255,255,0.12); border-radius: 14px; font-size: 24px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.2);">📊</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Hệ Thống Quản Lý Tài Chính & Công Việc</h1>
      <p style="color: #99f6e4; margin: 6px 0 0 0; font-size: 12px; font-weight: 500;">${badgeText} • ${currentDate}</p>
    </div>
  `;

  const baseFooter = `
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">Tài khoản quản trị: <strong style="color: #0f172a; font-family: monospace;">datminh96@gmail.com</strong></p>
      <p style="margin: 0;">Email này được phát hành tự động từ ứng dụng Quản Lý Tài Chính Cá Nhân.</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Bảo mật chuẩn SSL • Đồng bộ Supabase Cloud & Cloudflare R2 S3</p>
    </div>
  `;

  const wrapLayout = (title: string, bodyContent: string, badgeText?: string) => `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); overflow: hidden; margin: 0 auto; border: 1px solid #e2e8f0;">
        <tr>
          <td>
            ${baseHeader(badgeText)}
            <div style="padding: 28px 24px; font-size: 14px; line-height: 1.6;">
              ${bodyContent}
            </div>
            ${baseFooter}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  switch (template) {
    case 'account_verification': {
      const code = data.code || '482910';
      const userEmail = data.email || 'datminh96@gmail.com';
      const expireMinutes = data.expireMinutes || 15;

      const subject = `[Xác Thực Tài Khoản] Mã kích hoạt tài khoản của bạn: ${code}`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #ecfdf5; border-radius: 50%; color: #059669; font-size: 28px; border: 2px solid #a7f3d0; margin-bottom: 10px;">✨</div>
          <h2 style="font-size: 20px; color: #0f172a; margin: 4px 0; font-weight: 700;">Chào mừng bạn đến với hệ thống!</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Xin chào <strong>${recipientName}</strong>, cảm ơn bạn đã đăng ký tài khoản Quản Lý Tài Chính.</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Để hoàn tất đăng ký và kích hoạt đầy đủ quyền bảo mật và đồng bộ đám mây, vui lòng nhập mã xác nhận 6 chữ số bên dưới vào ứng dụng:
        </p>

        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed #10b981; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Mã Xác Thực Kích Hoạt (OTP)</span>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: 'Courier New', monospace; padding: 4px 0;">
            ${code}
          </div>
          <span style="font-size: 12px; color: #059669; display: block; margin-top: 8px;">⏱️ Mã này có hiệu lực trong vòng <strong>${expireMinutes} phút</strong></span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <table width="100%" border="0" cellpadding="4" cellspacing="0">
            <tr>
              <td style="color: #64748b; width: 40%;">Tài khoản email:</td>
              <td style="color: #0f172a; font-weight: 600; font-family: monospace;">${userEmail}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Thời gian phát hành:</td>
              <td style="color: #0f172a; font-weight: 600;">${currentDate}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Quyền hạn kích hoạt:</td>
              <td style="color: #059669; font-weight: 600;">Đồng bộ dữ liệu Supabase & Cloudflare R2</td>
            </tr>
          </table>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
          🔒 <strong>Lưu ý an toàn:</strong> Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email an toàn.
        </p>
      `;
      return { subject, html: wrapLayout(subject, content, 'Xác Thực Tài Khoản Đăng Ký') };
    }

    case 'password_recovery': {
      const code = data.code || '719354';
      const userEmail = data.email || 'datminh96@gmail.com';
      const expireMinutes = data.expireMinutes || 15;
      const requestTime = data.requestTime || new Date().toLocaleString('vi-VN');

      const subject = `[Khôi Phục Mật Khẩu] Mã OTP đặt lại mật khẩu của bạn: ${code}`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #eff6ff; border-radius: 50%; color: #2563eb; font-size: 28px; border: 2px solid #bfdbfe; margin-bottom: 10px;">🔑</div>
          <h2 style="font-size: 20px; color: #0f172a; margin: 4px 0; font-weight: 700;">Yêu Cầu Đặt Lại Mật Khẩu</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Xin chào <strong>${recipientName}</strong>, hệ thống đã nhận được yêu cầu cấp lại mật khẩu.</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Nhập mã xác thực an toàn dưới đây để thiết lập mật khẩu mới cho tài khoản <strong style="color: #1e293b; font-family: monospace;">${userEmail}</strong>:
        </p>

        <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px dashed #3b82f6; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Mã OTP Đặt Lại Mật Khẩu</span>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', monospace; padding: 4px 0;">
            ${code}
          </div>
          <span style="font-size: 12px; color: #2563eb; display: block; margin-top: 8px;">⏱️ Hết hạn sau <strong>${expireMinutes} phút</strong></span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <table width="100%" border="0" cellpadding="4" cellspacing="0">
            <tr>
              <td style="color: #64748b; width: 40%;">Tài khoản yêu cầu:</td>
              <td style="color: #0f172a; font-weight: 600; font-family: monospace;">${userEmail}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Thời gian ghi nhận:</td>
              <td style="color: #0f172a; font-weight: 600;">${requestTime}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Trạng thái:</td>
              <td style="color: #d97706; font-weight: 600;">Đang chờ nhập mã OTP</td>
            </tr>
          </table>
        </div>

        <div style="border-left: 4px solid #ef4444; background-color: #fef2f2; padding: 14px; border-radius: 8px;">
          <strong style="color: #991b1b; font-size: 13px; display: block; margin-bottom: 4px;">🛡️ Cảnh báo bảo mật:</strong>
          <span style="color: #b91c1c; font-size: 12px; line-height: 1.5; display: block;">Nếu bạn <strong>không yêu cầu</strong> đặt lại mật khẩu, vui lòng không cung cấp mã này cho bất kỳ ai. Tài khoản của bạn vẫn được bảo mật an toàn.</span>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Khôi Phục Mật Khẩu An Toàn') };
    }

    case 'financial_summary': {
      const month = data.month || new Date().getMonth() + 1;
      const year = data.year || new Date().getFullYear();
      const income = data.totalIncome ? Number(data.totalIncome).toLocaleString('vi-VN') + ' ₫' : '28.500.000 ₫';
      const expense = data.totalExpense ? Number(data.totalExpense).toLocaleString('vi-VN') + ' ₫' : '14.250.000 ₫';
      const balance = data.balance ? Number(data.balance).toLocaleString('vi-VN') + ' ₫' : '14.250.000 ₫';
      const savingRate = data.savingRate || '50%';
      const investValue = data.investValue ? Number(data.investValue).toLocaleString('vi-VN') + ' ₫' : '185.000.000 ₫';

      const subject = `[Báo Cáo Tài Chính] Báo cáo Thu Chi & Danh Mục Đầu Tư Tháng ${month}/${year}`;
      const content = `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Xin chào ${recipientName},</h2>
        <p style="color: #475569; margin-bottom: 20px;">Dưới đây là bảng tổng hợp báo cáo tài chính, chi tiêu và danh mục tài sản đầu tư của bạn trong tháng <strong>${month}/${year}</strong>:</p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="48%" style="padding: 14px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
              <span style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700; display: block;">Tổng Thu Nhập</span>
              <strong style="font-size: 17px; color: #065f46; display: block; margin-top: 4px;">${income}</strong>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding: 14px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
              <span style="font-size: 11px; text-transform: uppercase; color: #dc2626; font-weight: 700; display: block;">Tổng Chi Tiêu</span>
              <strong style="font-size: 17px; color: #991b1b; display: block; margin-top: 4px;">${expense}</strong>
            </td>
          </tr>
          <tr><td height="12"></td></tr>
          <tr>
            <td width="48%" style="padding: 14px; background-color: #eff6ff; border-radius: 12px; border-left: 4px solid #3b82f6;">
              <span style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 700; display: block;">Thặng Dư Tích Lũy</span>
              <strong style="font-size: 17px; color: #1e40af; display: block; margin-top: 4px;">${balance}</strong>
              <span style="font-size: 11px; color: #60a5fa; display: block; margin-top: 2px;">Tỷ lệ tiết kiệm: ${savingRate}</span>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding: 14px; background-color: #faf5ff; border-radius: 12px; border-left: 4px solid #a855f7;">
              <span style="font-size: 11px; text-transform: uppercase; color: #9333ea; font-weight: 700; display: block;">Giá Trị Danh Mục Đầu Tư</span>
              <strong style="font-size: 17px; color: #6b21a8; display: block; margin-top: 4px;">${investValue}</strong>
              <span style="font-size: 11px; color: #c084fc; display: block; margin-top: 2px;">Cổ phiếu • Tiết kiệm • Crypto</span>
            </td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #334155; font-weight: 700;">💡 Đánh giá sức khỏe tài chính:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;">
            <li>Tỷ lệ tiết kiệm đạt mức tốt (${savingRate}), đảm bảo dòng tiền tích lũy định kỳ.</li>
            <li>Tất cả dữ liệu được lưu trữ an toàn và sao lưu thường xuyên trên Cloudflare R2 S3.</li>
          </ul>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, `Tổng Kết Tài Chính Tháng ${month}/${year}`) };
    }

    case 'backup_success': {
      const backupTime = data.backupTime || new Date().toLocaleString('vi-VN');
      const backupSize = data.backupSize || '128.4 KB';
      const recordCount = data.recordCount || 48;
      const bucketName = data.bucketName || 'minhnld2';
      const fileKey = data.fileKey || `backups/backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      const subject = `[Sao Lưu R2] Xác nhận sao lưu dữ liệu thành công lên Cloudflare R2`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #e0f2fe; border-radius: 50%; color: #0284c7; font-size: 28px; border: 2px solid #bae6fd; margin-bottom: 10px;">☁️</div>
          <h2 style="font-size: 20px; color: #0f172a; margin: 4px 0; font-weight: 700;">Sao Lưu Dữ Liệu Thành Công!</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Gói dữ liệu toàn diện của <strong>${recipientName}</strong> đã được đồng bộ lên Cloudflare R2 Storage.</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; font-size: 13px;">
          <table width="100%" border="0" cellpadding="6" cellspacing="0">
            <tr>
              <td style="color: #64748b; width: 40%;">R2 Bucket Lưu Trữ:</td>
              <td style="color: #0284c7; font-weight: 700; font-family: monospace;">${bucketName}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Tên tệp tin sao lưu:</td>
              <td style="color: #0f172a; font-weight: 600; font-family: monospace; font-size: 11px;">${fileKey}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Tổng số bản ghi:</td>
              <td style="color: #059669; font-weight: 700;">${recordCount} bản ghi (Giờ công, Chi tiêu, Đầu tư)</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Kích thước tệp:</td>
              <td style="color: #0f172a; font-weight: 600;">${backupSize}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Thời gian hoàn tất:</td>
              <td style="color: #0f172a; font-weight: 600;">${backupTime}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; font-size: 12px; color: #166534;">
          ✅ Bản sao lưu được lưu trữ vĩnh viễn trên Cloudflare R2 với mã hóa AES-256 tiêu chuẩn ngân hàng. Bạn có thể khôi phục dữ liệu bất cứ lúc nào từ mục Cài Đặt.
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Sao Lưu Dữ Liệu Cloudflare R2') };
    }

    case 'budget_alert': {
      const month = data.month || new Date().getMonth() + 1;
      const limit = data.limit ? Number(data.limit).toLocaleString('vi-VN') + ' ₫' : '15.000.000 ₫';
      const spent = data.spent ? Number(data.spent).toLocaleString('vi-VN') + ' ₫' : '13.800.000 ₫';
      const percentage = data.percentage || '92%';
      const category = data.category || 'Chi tiêu sinh hoạt & Tiêu dùng';

      const subject = `[Cảnh Báo Ngân Sách] Chi tiêu tháng ${month} đã đạt ${percentage} hạn mức định mức`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #fef3c7; border-radius: 50%; color: #d97706; font-size: 28px; border: 2px solid #fde68a; margin-bottom: 10px;">⚠️</div>
          <h2 style="font-size: 20px; color: #92400e; margin: 4px 0; font-weight: 700;">Cảnh Báo Vượt Ngưỡng Chi Tiêu</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Xin chào <strong>${recipientName}</strong>, ngân sách của bạn đang tiệm cận mức giới hạn.</p>
        </div>

        <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 14px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 12px; text-transform: uppercase; color: #b45309; font-weight: 700; display: block;">Tỷ Lệ Đã Chi Dùng</span>
          <div style="font-size: 40px; font-weight: 800; color: #d97706; margin: 8px 0;">${percentage}</div>
          <div style="background-color: #fde68a; height: 8px; border-radius: 4px; overflow: hidden; max-width: 320px; margin: 0 auto;">
            <div style="background-color: #d97706; height: 100%; width: ${percentage};"></div>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <table width="100%" border="0" cellpadding="4" cellspacing="0">
            <tr>
              <td style="color: #64748b; width: 45%;">Hạng mục cảnh báo:</td>
              <td style="color: #0f172a; font-weight: 600;">${category}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Hạn mức đã cài đặt:</td>
              <td style="color: #0f172a; font-weight: 600;">${limit}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Số tiền đã chi thực tế:</td>
              <td style="color: #dc2626; font-weight: 700;">${spent}</td>
            </tr>
          </table>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Cảnh Báo Hạn Mức Chi Tiêu') };
    }

    case 'work_hours_statement': {
      const month = data.month || new Date().getMonth() + 1;
      const totalDays = data.totalDays || 22;
      const totalHours = data.totalHours || 176;
      const otHours = data.otHours || 8.5;
      const estimatedSalary = data.estimatedSalary ? Number(data.estimatedSalary).toLocaleString('vi-VN') + ' ₫' : '25.000.000 ₫';

      const subject = `[Phiếu Chấm Công] Bảng tổng kết ngày công & thu nhập tháng ${month}`;
      const content = `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Xin chào ${recipientName},</h2>
        <p style="color: #475569; margin-bottom: 20px;">Dưới đây là bảng tổng hợp giờ làm việc, ngày công thực tế và ước tính thu nhập tháng <strong>${month}</strong>:</p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td width="48%" style="padding: 14px; background-color: #eff6ff; border-radius: 12px; border-left: 4px solid #3b82f6;">
              <span style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 700; display: block;">Ngày Công Thực Tế</span>
              <strong style="font-size: 20px; color: #1e40af; display: block; margin-top: 4px;">${totalDays} ngày</strong>
              <span style="font-size: 11px; color: #60a5fa; display: block; margin-top: 2px;">Tổng: ${totalHours} giờ làm việc</span>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding: 14px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
              <span style="font-size: 11px; text-transform: uppercase; color: #b45309; font-weight: 700; display: block;">Giờ Tăng Ca (OT)</span>
              <strong style="font-size: 20px; color: #92400e; display: block; margin-top: 4px;">+${otHours} giờ</strong>
              <span style="font-size: 11px; color: #d97706; display: block; margin-top: 2px;">Hệ số lương OT 1.5x</span>
            </td>
          </tr>
        </table>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 700; display: block;">Ước Tính Thu Nhập Tháng</span>
          <strong style="font-size: 22px; color: #15803d; display: block; margin-top: 4px;">${estimatedSalary}</strong>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Bảng Chấm Công & Thu Nhập') };
    }

    case 'security_alert': {
      const eventTime = data.eventTime || new Date().toLocaleString('vi-VN');
      const eventType = data.eventType || 'Đăng nhập trang quản trị Admin / Đồng bộ dữ liệu';
      const ipAddress = data.ipAddress || '14.232.18.92 (Việt Nam)';
      const userAgent = data.userAgent || 'Safari trên iOS / Vercel Production';

      const subject = `[Cảnh Báo Bảo Mật] Hoạt động truy cập quản trị trên tài khoản của bạn`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #ffe4e6; border-radius: 50%; color: #e11d48; font-size: 28px; border: 2px solid #fecdd3; margin-bottom: 10px;">🛡️</div>
          <h2 style="font-size: 20px; color: #9f1239; margin: 4px 0; font-weight: 700;">Thông Báo An Ninh Tài Khoản</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Xin chào <strong>${recipientName}</strong>, hệ thống ghi nhận một phiên xác thực mới.</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <table width="100%" border="0" cellpadding="6" cellspacing="0">
            <tr>
              <td style="color: #64748b; width: 35%;">Loại hoạt động:</td>
              <td style="color: #0f172a; font-weight: 600;">${eventType}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Thời gian:</td>
              <td style="color: #0f172a; font-weight: 600;">${eventTime}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Địa chỉ IP:</td>
              <td style="color: #0f172a; font-weight: 600; font-family: monospace;">${ipAddress}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Thiết bị & Trình duyệt:</td>
              <td style="color: #0f172a; font-weight: 600;">${userAgent}</td>
            </tr>
          </table>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Thông Báo An Ninh & Bảo Mật') };
    }

    default: {
      const customHtml = data.customHtml || '<p>Nội dung thông báo tài chính.</p>';
      const subject = data.subject || 'Thông báo từ hệ thống Quản Lý Tài Chính';
      return { subject, html: wrapLayout(subject, customHtml, 'Thông Báo Hệ Thống') };
    }
  }
}
