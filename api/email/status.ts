export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const resendApiKey = process.env.RESEND_API_KEY || '';
  const emailFrom = process.env.EMAIL_FROM || 'Personal Finance <onboarding@resend.dev>';
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  const isResendConfigured = !!resendApiKey;
  const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);

  return res.status(200).json({
    success: true,
    isResendConfigured,
    isSmtpConfigured,
    emailFrom,
    defaultRecipient: 'datminh96@gmail.com',
    smtpHost: smtpHost ? `${smtpHost}:${smtpPort}` : null,
    smtpUser: smtpUser || null,
    mode: isResendConfigured
      ? 'Resend API (Live)'
      : isSmtpConfigured
      ? 'Custom SMTP (Live)'
      : 'Simulator / Local Preview',
  });
}
