import { updateR2Config, testR2Connection, R2_CONFIG } from '../../src/lib/r2.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      accountId: R2_CONFIG.accountId,
      accessKeyId: R2_CONFIG.accessKeyId,
      endpoint: R2_CONFIG.endpoint,
      defaultBucket: R2_CONFIG.defaultBucket,
      hasSecretKey: !!R2_CONFIG.secretAccessKey,
      secretKeyMasked: R2_CONFIG.secretAccessKey
        ? `${R2_CONFIG.secretAccessKey.slice(0, 6)}••••••••${R2_CONFIG.secretAccessKey.slice(-6)}`
        : '',
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { accountId, accessKeyId, secretAccessKey, endpoint, defaultBucket } = body;
      updateR2Config({
        accountId,
        accessKeyId,
        secretAccessKey,
        endpoint,
        defaultBucket,
      });
      const result = await testR2Connection();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        connected: false,
        buckets: [],
        endpoint: R2_CONFIG.endpoint,
        accountId: R2_CONFIG.accountId,
        error: error?.message || 'Lỗi khi cập nhật cấu hình Cloudflare R2',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
