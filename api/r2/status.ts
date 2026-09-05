import { testR2Connection } from './_helpers';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await testR2Connection();
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(200).json({
      connected: false,
      buckets: [],
      error: error?.message || 'Lỗi kiểm tra kết nối Cloudflare R2',
    });
  }
}
