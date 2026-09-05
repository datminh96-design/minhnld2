import { listR2Objects, R2_CONFIG } from './_helpers';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prefix = (req.query?.prefix as string) || '';
    const bucket = (req.query?.bucket as string) || R2_CONFIG.defaultBucket;

    const result = await listR2Objects(prefix, bucket);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      bucket: R2_CONFIG.defaultBucket,
      objects: [],
      error: error?.message || 'Lỗi khi lấy danh sách đối tượng từ R2',
    });
  }
}
