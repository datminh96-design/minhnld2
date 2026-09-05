import { listR2Objects, deleteFromR2 } from '../../src/lib/r2';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const prefix = (req.query.prefix as string) || '';
      const result = await listR2Objects(prefix);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi lấy danh sách file Cloudflare R2',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { key } = req.body || {};
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số key cần xóa' });
      }

      const result = await deleteFromR2(key);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi xóa file trên Cloudflare R2',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
