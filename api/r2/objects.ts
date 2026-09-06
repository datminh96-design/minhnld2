import { listR2Objects } from '../../src/lib/r2.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prefix = (req.query?.prefix as string) || '';
    const result = await listR2Objects(prefix);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Lỗi khi lấy danh sách bản ghi Cloudflare R2',
    });
  }
}
