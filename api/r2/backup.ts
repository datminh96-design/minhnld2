import { uploadToR2, getFromR2 } from './_helpers';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          // ignore
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `backups/backup_${timestamp}.json`;

      const uploadResult = await uploadToR2(
        key,
        typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
        'application/json'
      );

      return res.status(uploadResult.success ? 200 : 500).json(uploadResult);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi tải bản sao lưu lên Cloudflare R2',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const key = req.query?.key as string;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số key của bản sao lưu' });
      }

      const result = await getFromR2(key);
      if (!result.success || !result.data) {
        return res.status(404).json({ success: false, error: result.error || 'Không tìm thấy file trên R2' });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(result.data);
      } catch {
        parsed = result.data;
      }
      return res.status(200).json({ success: true, data: parsed });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi đọc bản sao lưu từ Cloudflare R2',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
