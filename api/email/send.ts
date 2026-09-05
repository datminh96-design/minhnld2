import { sendTransactionalEmail } from '../../src/lib/email';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};
    if (!payload.to) {
      return res.status(400).json({ success: false, error: 'Thiếu email người nhận (to)' });
    }

    const result = await sendTransactionalEmail(payload);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Không thể gửi email',
    });
  }
}
