import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = getR2Client();

  if (req.method === 'POST') {
    try {
      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          // ignore
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `backups/backup_${timestamp}.json`;
      const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

      const command = new PutObjectCommand({
        Bucket: R2_CONFIG.defaultBucket,
        Key: key,
        Body: Buffer.from(bodyString, 'utf-8'),
        ContentType: 'application/json',
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
    } catch (error: any) {
      console.error('[R2 Backup API Error]:', error);
      return res.status(200).json({
        success: false,
        error: error?.message || 'Lỗi khi tải bản sao lưu lên Cloudflare R2',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const key = (req.query?.key as string) || '';
      if (!key) {
        return res.status(200).json({ success: false, error: 'Thiếu tham số key của bản sao lưu' });
      }

      const command = new GetObjectCommand({
        Bucket: R2_CONFIG.defaultBucket,
        Key: key,
      });

      const response = await client.send(command);
      if (!response.Body) {
        return res.status(200).json({ success: false, error: 'Không tìm thấy nội dung file' });
      }

      const strData = await response.Body.transformToString('utf-8');
      let parsed: any;
      try {
        parsed = JSON.parse(strData);
      } catch {
        parsed = strData;
      }

      return res.status(200).json({ success: true, data: parsed });
    } catch (error: any) {
      console.error('[R2 Get Backup Error]:', error);
      return res.status(200).json({
        success: false,
        error: error?.message || 'Lỗi khi đọc bản sao lưu từ Cloudflare R2',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
