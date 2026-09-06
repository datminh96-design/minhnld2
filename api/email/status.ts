import { getEmailConfig } from '../../src/lib/email.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = getEmailConfig();
  return res.status(200).json({
    success: true,
    isResendConfigured: config.isResendConfigured,
    isSmtpConfigured: config.isSmtpConfigured,
    emailFrom: config.emailFrom,
    defaultRecipient: config.defaultRecipient,
    smtpHost: config.smtp.host ? `${config.smtp.host}:${config.smtp.port}` : null,
    smtpUser: config.smtp.user || null,
    mode: config.isResendConfigured
      ? 'Resend API (Live)'
      : config.isSmtpConfigured
      ? 'Custom SMTP (Live)'
      : 'Simulator / Local Preview',
  });
}
