import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = getR2Client();

  if (req.method === 'GET') {
    try {
      const key = (req.query?.key as string) || '';
      if (!key) {
        return res.status(200).json({ success: false, error: 'Thiếu key' });
      }

      const command = new GetObjectCommand({
        Bucket: R2_CONFIG.defaultBucket,
        Key: key,
      });

      const response = await client.send(command);
      if (!response.Body) {
        return res.status(200).json({ success: false, error: 'Không tìm thấy file trên R2' });
      }

      const strData = await response.Body.transformToString('utf-8');
      return res.status(200).json({ success: true, data: strData });
    } catch (err: any) {
      console.error('[R2 Get Object Error]:', err);
      return res.status(200).json({
        success: false,
        error: err?.message || String(err),
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // ignore
        }
      }
      const key = body?.key;
      if (!key) {
        return res.status(200).json({ success: false, error: 'Thiếu key cần xóa' });
      }

      const command = new DeleteObjectCommand({
        Bucket: R2_CONFIG.defaultBucket,
        Key: key,
      });

      await client.send(command);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[R2 Delete Object Error]:', err);
      return res.status(200).json({
        success: false,
        error: err?.message || String(err),
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
