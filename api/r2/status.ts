import { testR2Connection, R2_CONFIG } from '../../src/lib/r2.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await testR2Connection();
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      buckets: [],
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
      error: error?.message || 'Lỗi khi kiểm tra kết nối Cloudflare R2',
    });
  }
}
