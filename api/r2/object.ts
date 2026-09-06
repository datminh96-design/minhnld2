import { deleteFromR2 } from '../../src/lib/r2.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'DELETE' || req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const key = body.key || req.query?.key;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu key cần xóa' });
      }
      const result = await deleteFromR2(key);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Lỗi khi xóa tệp trên R2' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
