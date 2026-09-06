import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

function getClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { key, data, contentType = 'application/json' } = body;
      if (!key || !data) {
        return res.status(400).json({ success: false, error: 'Thiếu key hoặc data' });
      }
      const client = getClient();
      const command = new PutObjectCommand({
        Bucket: R2_CONFIG.defaultBucket,
        Key: key,
        Body: typeof data === 'string' ? data : JSON.stringify(data),
        ContentType: contentType,
      });
      await client.send(command);
      return res.status(200).json({ success: true, key, bucket: R2_CONFIG.defaultBucket });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || 'Lỗi khi tải tệp lên R2' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
