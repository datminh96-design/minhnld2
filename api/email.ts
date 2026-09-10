import {
  getEmailConfig,
  sendTransactionalEmail,
  generateEmailHtml,
  emailLogs,
} from '../src/lib/email';

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function getSubpath(req: any): string {
  if (req.query?.subpath) {
    return Array.isArray(req.query.subpath) ? req.query.subpath.join('/') : String(req.query.subpath);
  }
  const urlPath = (req.url || '').split('?')[0];
  const match = urlPath.match(/\/api\/email\/(.*)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlPath.replace(/^\/(api\/)?email\/?/, '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const method = (req.method || 'GET').toUpperCase();
  const body = parseBody(req);
  const query = req.query || {};

  try {
    // 1. Status: /api/email/status or default GET
    if (subpath === 'status' || (!subpath && method === 'GET')) {
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

    // 2. Logs: /api/email/logs
    if (subpath === 'logs') {
      return res.status(200).json({
        success: true,
        logs: emailLogs,
        total: emailLogs.length,
      });
    }

    // 3. Preview: /api/email/preview
    if (subpath === 'preview') {
      const template = body?.template || body?.type || 'financial_summary';
      const data = body?.data || {};
      const generated = generateEmailHtml(template, data);
      return res.status(200).json({
        success: true,
        type: template,
        subject: generated.subject,
        html: generated.html,
      });
    }

    // 4. Send: /api/email/send
    if (subpath === 'send' || method === 'POST') {
      const { to, subject, template, type, data, customHtml } = body;
      const targetTemplate = template || type || 'financial_summary';
      const result = await sendTransactionalEmail({
        to: to || 'datminh96@gmail.com',
        subject,
        template: targetTemplate,
        data,
        customHtml,
      });
      return res.status(result.success ? 200 : 500).json(result);
    }

    const config = getEmailConfig();
    return res.status(200).json({ success: true, isConfigured: config.isResendConfigured || config.isSmtpConfigured });
  } catch (err: any) {
    console.error('[Email API Serverless Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Lỗi xử lý gửi email',
    });
  }
}
