import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || 'eb6f53f5795c23b1f75e360674a4650b',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || 'c415be80d7e69af090163b2ac446d60b',
  secretAccessKey:
    process.env.R2_SECRET_ACCESS_KEY ||
    'fde9ab464ab90497d58b7a41510be6b139ca1cc3b9eaf11d9b9ec2b22b1e8e31',
  endpoint:
    process.env.R2_ENDPOINT ||
    'https://eb6f53f5795c23b1f75e360674a4650b.r2.cloudflarestorage.com',
  defaultBucket: process.env.R2_BUCKET_NAME || 'minhnld2',
};

function getR2Client(): S3Client {
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }
    const { key, data, contentType = 'application/json' } = body || {};
    if (!key || !data) {
      return res.status(200).json({ success: false, error: 'Thiếu key hoặc data' });
    }

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.defaultBucket,
      Key: key,
      Body: typeof data === 'string' ? Buffer.from(data, 'utf-8') : data,
      ContentType: contentType,
      Metadata: {
        'uploaded-by': 'personal-finance-app',
        'uploaded-at': new Date().toISOString(),
      },
    });

    await client.send(command);
    return res.status(200).json({
      success: true,
      key,
      bucket: R2_CONFIG.defaultBucket,
    });
  } catch (err: any) {
    console.error('[R2 Upload API Error]:', err);
    return res.status(200).json({
      success: false,
      error: err?.message || String(err),
    });
  }
}
