import { deleteFromR2, getFromR2 } from './_helpers';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const key = req.query?.key as string;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu key' });
      }

      const result = await getFromR2(key);
      if (!result.success || !result.data) {
        return res.status(404).json({ success: false, error: result.error || 'Không tìm thấy file trên R2' });
      }

      return res.status(200).json({ success: true, data: result.data });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || String(err),
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // ignore
        }
      }
      const key = body?.key;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu key cần xóa' });
      }

      const deleteResult = await deleteFromR2(key);
      return res.status(deleteResult.success ? 200 : 500).json(deleteResult);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || String(err),
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
