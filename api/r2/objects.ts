import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const prefix = (req.query?.prefix as string) || '';
    const client = getR2Client();

    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.defaultBucket,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await client.send(command);
    const objects = (response.Contents || [])
      .map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified,
      }))
      .filter((item) => Boolean(item.key));

    return res.status(200).json({
      success: true,
      bucket: R2_CONFIG.defaultBucket,
      objects,
    });
  } catch (error: any) {
    console.error('[R2 List Objects Error]:', error);
    return res.status(200).json({
      success: false,
      bucket: R2_CONFIG.defaultBucket,
      objects: [],
      error: error?.message || 'Lỗi khi lấy danh sách đối tượng từ R2',
    });
  }
}
