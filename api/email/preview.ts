import { generateEmailHtml } from '../../src/lib/email';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const template = req.body?.template || req.query?.template || 'account_verification';
    const data = req.body?.data || {};

    const { subject, html } = generateEmailHtml(template, data);
    return res.status(200).json({
      success: true,
      template,
      subject,
      html,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Không thể tạo bản xem trước email',
    });
  }
}
