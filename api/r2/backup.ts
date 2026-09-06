import { uploadToR2, getFromR2 } from '../../src/lib/r2.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `backups/backup_${timestamp}.json`;
      const result = await uploadToR2(key, JSON.stringify(payload, null, 2), 'application/json');
      return res.status(200).json({
        success: true,
        key,
        bucket: result.bucket,
        message: 'Đã sao lưu thành công lên Cloudflare R2',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi tạo bản sao lưu lên Cloudflare R2',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const key = (req.query?.key as string);
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu tham số key của bản sao lưu' });
      }
      const resObj = await getFromR2(key);
      if (!resObj.success || !resObj.data) {
        return res.status(404).json({ success: false, error: resObj.error || 'Không tìm thấy bản sao lưu' });
      }
      const backupData = JSON.parse(resObj.data);
      return res.status(200).json({ success: true, data: backupData });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi tải bản sao lưu từ Cloudflare R2',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
