import { uploadToR2 } from '../../src/lib/r2.ts';

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
      const { key, data, contentType = 'application/json' } = body;
      if (!key || !data) {
        return res.status(400).json({ success: false, error: 'Thiếu key hoặc data' });
      }
      const result = await uploadToR2(key, data, contentType);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Lỗi khi tải tệp lên R2' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
