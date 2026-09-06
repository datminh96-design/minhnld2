import { Resend } from 'resend';
import nodemailer from 'nodemailer';

function renderTemplate(template: string, data: Record<string, any> = {}) {
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
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: 'Courier New', monospace; padding: 4px 0;">${code}</div>
          <span style="font-size: 12px; color: #059669; display: block; margin-top: 8px;">⏱️ Mã này có hiệu lực trong vòng <strong>${expireMinutes} phút</strong></span>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Xác Thực Tài Khoản Đăng Ký') };
    }

    case 'password_recovery': {
      const code = data.code || '719354';
      const userEmail = data.email || 'datminh96@gmail.com';
      const expireMinutes = data.expireMinutes || 15;
      const subject = `[Khôi Phục Mật Khẩu] Mã OTP đặt lại mật khẩu của bạn: ${code}`;
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: #eff6ff; border-radius: 50%; color: #2563eb; font-size: 28px; border: 2px solid #bfdbfe; margin-bottom: 10px;">🔑</div>
          <h2 style="font-size: 20px; color: #0f172a; margin: 4px 0; font-weight: 700;">Yêu Cầu Đặt Lại Mật Khẩu</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Xin chào <strong>${recipientName}</strong>, hệ thống đã nhận được yêu cầu cấp lại mật khẩu.</p>
        </div>
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px dashed #3b82f6; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Mã OTP Đặt Lại Mật Khẩu</span>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', monospace; padding: 4px 0;">${code}</div>
          <span style="font-size: 12px; color: #2563eb; display: block; margin-top: 8px;">⏱️ Hết hạn sau <strong>${expireMinutes} phút</strong></span>
        </div>
      `;
      return { subject, html: wrapLayout(subject, content, 'Khôi Phục Mật Khẩu An Toàn') };
    }

    default: {
      const customHtml = data.customHtml || '<p>Nội dung thông báo tài chính.</p>';
      const subject = data.subject || 'Thông báo từ hệ thống Quản Lý Tài Chính';
      return { subject, html: wrapLayout(subject, customHtml, 'Thông Báo Hệ Thống') };
    }
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { template = 'account_verification', to = 'datminh96@gmail.com', data = {}, customHtml, smtpConfig, resendApiKey: customResendKey } = payload;
    
    const { subject, html } = renderTemplate(template, { ...data, customHtml });

    const resendApiKey = customResendKey || process.env.RESEND_API_KEY || '';
    const emailFrom = process.env.EMAIL_FROM || 'Personal Finance <onboarding@resend.dev>';
    
    const smtpHost = smtpConfig?.host || process.env.SMTP_HOST || '';
    const smtpPort = parseInt(smtpConfig?.port || process.env.SMTP_PORT || '587', 10);
    const smtpUser = smtpConfig?.user || process.env.SMTP_USER || '';
    const smtpPass = smtpConfig?.pass || process.env.SMTP_PASS || '';

    // 1. Send via Resend if API Key available
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const sendResult = await resend.emails.send({
          from: emailFrom,
          to: [to],
          subject,
          html,
        });
        return res.status(200).json({
          success: true,
          provider: 'resend',
          id: (sendResult as any)?.data?.id,
          subject,
          html,
        });
      } catch (resendErr: any) {
        // If Resend failed, throw clear error
        throw new Error(`Lỗi gửi qua Resend: ${resendErr?.message || 'Không thể gửi'}`);
      }
    }

    // 2. Send via SMTP (e.g. Gmail App Password) if configured
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        const info = await transporter.sendMail({
          from: `Quản Lý Tài Chính <${smtpUser}>`,
          to,
          subject,
          html,
        });
        return res.status(200).json({
          success: true,
          provider: 'smtp',
          messageId: info.messageId,
          subject,
          html,
        });
      } catch (smtpErr: any) {
        throw new Error(`Lỗi gửi qua SMTP Gmail: ${smtpErr?.message || 'Sai mật khẩu ứng dụng hoặc cấu hình'}`);
      }
    }

    // 3. If neither configured, return simulator mode with clear explanation
    return res.status(200).json({
      success: true,
      simulated: true,
      provider: 'simulator',
      subject,
      html,
      message: 'Email được dựng thành công ở chế độ Simulator. Để gửi thư thực tế về hộp thư datminh96@gmail.com, vui lòng cấu hình Mật khẩu ứng dụng Gmail (SMTP) hoặc Resend API Key trong mục Cài Đặt.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Lỗi xử lý gửi email',
    });
  }
}
