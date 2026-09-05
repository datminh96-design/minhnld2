import { getEmailConfig } from '../../src/lib/email';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEmailConfig();
    const isConfigured = config.isResendConfigured || config.isSmtpConfigured;
    const provider = config.isResendConfigured ? 'resend' : config.isSmtpConfigured ? 'smtp' : 'simulator';

    return res.status(200).json({
      configured: isConfigured,
      provider,
      from: config.emailFrom,
      hasResendApiKey: config.isResendConfigured,
      hasSmtpConfig: config.isSmtpConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      configured: false,
      provider: 'none',
      error: error?.message || 'Lỗi kiểm tra trạng thái email',
    });
  }
}
