import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = getClient();
    const prefix = (req.query?.prefix as string) || '';
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.defaultBucket,
      Prefix: prefix,
    });
    const response = await client.send(command);
    const objects = (response.Contents || []).map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
    }));

    return res.status(200).json({
      success: true,
      bucket: R2_CONFIG.defaultBucket,
      objects,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Lỗi khi lấy danh sách bản ghi Cloudflare R2',
    });
  }
}
