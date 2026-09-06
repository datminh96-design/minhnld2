import { generateEmailHtml } from '../../src/lib/email.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { template = 'financial_summary', data = {}, customHtml } = body;
      const { subject, html } = generateEmailHtml(template, {
        ...data,
        customHtml,
      });
      return res.status(200).json({ success: true, subject, html });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Lỗi khi xem trước email' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
