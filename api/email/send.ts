import { sendTransactionalEmail } from '../../src/lib/email.ts';

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
      const result = await sendTransactionalEmail(body);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Lỗi khi gửi email' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
