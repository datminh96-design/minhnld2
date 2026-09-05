import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export const R2_CONFIG = {
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

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.endpoint) {
    throw new Error('Cloudflare R2 credentials are not configured.');
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: R2_CONFIG.endpoint,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return r2Client;
}

export async function testR2Connection(): Promise<{
  connected: boolean;
  buckets: string[];
  endpoint: string;
  accountId: string;
  error?: string;
}> {
  try {
    const client = getR2Client();
    await client.send(
      new ListObjectsV2Command({
        Bucket: R2_CONFIG.defaultBucket,
        MaxKeys: 1,
      })
    );

    return {
      connected: true,
      buckets: [R2_CONFIG.defaultBucket],
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
    };
  } catch (error: any) {
    return {
      connected: false,
      buckets: [],
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
      error: error?.message || String(error),
    };
  }
}

export async function uploadToR2(
  key: string,
  data: string | Buffer | Uint8Array,
  contentType: string = 'application/json',
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; key: string; bucket: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = bucketName || R2_CONFIG.defaultBucket || 'minhnld2';

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: typeof data === 'string' ? Buffer.from(data, 'utf-8') : data,
      ContentType: contentType,
      Metadata: {
        'uploaded-by': 'personal-finance-app',
        'uploaded-at': new Date().toISOString(),
      },
    });

    await client.send(command);
    return {
      success: true,
      key,
      bucket: targetBucket,
    };
  } catch (error: any) {
    return {
      success: false,
      key,
      bucket: bucketName || R2_CONFIG.defaultBucket,
      error: error?.message || String(error),
    };
  }
}

export async function listR2Objects(
  prefix: string = '',
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{
  success: boolean;
  bucket: string;
  objects: Array<{ key: string; size: number; lastModified?: Date }>;
  error?: string;
}> {
  try {
    const client = getR2Client();
    const targetBucket = bucketName || R2_CONFIG.defaultBucket || 'minhnld2';

    const command = new ListObjectsV2Command({
      Bucket: targetBucket,
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

    return {
      success: true,
      bucket: targetBucket,
      objects,
    };
  } catch (error: any) {
    return {
      success: false,
      bucket: bucketName || R2_CONFIG.defaultBucket,
      objects: [],
      error: error?.message || String(error),
    };
  }
}

export async function getFromR2(
  key: string,
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = bucketName || R2_CONFIG.defaultBucket || 'minhnld2';

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    const response = await client.send(command);
    if (!response.Body) {
      throw new Error('No body returned from R2 Object');
    }

    const strData = await response.Body.transformToString('utf-8');
    return {
      success: true,
      data: strData,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function deleteFromR2(
  key: string,
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = bucketName || R2_CONFIG.defaultBucket || 'minhnld2';

    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    await client.send(command);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}
