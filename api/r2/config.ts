const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || 'eb6f53f5795c23b1f75e360674a4650b',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || 'c415be80d7e69af090163b2ac446d60b',
  secretAccessKey:
    process.env.R2_SECRET_ACCESS_KEY ||
    '67b447654bce01ef126b8c79df49d4a4b0308cef0005c8b52aba1187a99d6b19',
  endpoint:
    process.env.R2_ENDPOINT ||
    'https://eb6f53f5795c23b1f75e360674a4650b.r2.cloudflarestorage.com',
  defaultBucket: process.env.R2_BUCKET_NAME || 'minhnld2',
};

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
      if (accountId) R2_CONFIG.accountId = accountId.trim();
      if (accessKeyId) R2_CONFIG.accessKeyId = accessKeyId.trim();
      if (secretAccessKey) R2_CONFIG.secretAccessKey = secretAccessKey.trim();
      if (endpoint) R2_CONFIG.endpoint = endpoint.trim();
      if (defaultBucket) R2_CONFIG.defaultBucket = defaultBucket.trim();

      return res.status(200).json({
        connected: true,
        buckets: [R2_CONFIG.defaultBucket],
        endpoint: R2_CONFIG.endpoint,
        accountId: R2_CONFIG.accountId,
      });
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
