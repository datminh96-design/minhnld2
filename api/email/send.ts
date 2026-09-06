import { Resend } from 'resend';
import nodemailer from 'nodemailer';

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
    const { to = 'datminh96@gmail.com', subject = 'Thông báo tài chính', customHtml } = payload;
    const resendApiKey = process.env.RESEND_API_KEY || '';
    const emailFrom = process.env.EMAIL_FROM || 'Personal Finance <onboarding@resend.dev>';
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    const htmlBody = customHtml || `<p>Nội dung thông báo từ ứng dụng Quản Lý Tài Chính.</p>`;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const result = await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html: htmlBody,
      });
      return res.status(200).json({ success: true, provider: 'resend', id: (result as any)?.data?.id });
    }

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html: htmlBody,
      });
      return res.status(200).json({ success: true, provider: 'smtp', messageId: info.messageId });
    }

    return res.status(200).json({
      success: true,
      simulated: true,
      provider: 'simulator',
      message: 'Email được gửi ở chế độ mô phỏng (preview)',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Lỗi gửi email' });
  }
}
