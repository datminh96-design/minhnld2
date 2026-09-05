import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 S3 credentials configuration
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

let r2ClientInstance: S3Client | null = null;

/**
 * Lazy initialization of S3 Client configured for Cloudflare R2
 */
export function getR2Client(): S3Client {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.endpoint) {
    throw new Error('Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT) are not configured.');
  }

  if (!r2ClientInstance) {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: R2_CONFIG.endpoint,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return r2ClientInstance;
}

/**
 * Test R2 connection and list available buckets
 */
export async function testR2Connection(): Promise<{
  connected: boolean;
  buckets: string[];
  endpoint: string;
  accountId: string;
  error?: string;
}> {
  try {
    const client = getR2Client();
    let buckets: string[] = [];

    try {
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      buckets = (response.Buckets || []).map((b) => b.Name || '').filter(Boolean);
    } catch (listErr) {
      // If ListBuckets is restricted to specific bucket, test specific default bucket
      try {
        await client.send(
          new ListObjectsV2Command({
            Bucket: R2_CONFIG.defaultBucket,
            MaxKeys: 1,
          })
        );
        buckets = [R2_CONFIG.defaultBucket];
      } catch (bucketErr) {
        throw listErr;
      }
    }

    if (buckets.length === 0 && R2_CONFIG.defaultBucket) {
      buckets = [R2_CONFIG.defaultBucket];
    }

    return {
      connected: true,
      buckets,
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
    };
  } catch (error: any) {
    console.error('[Cloudflare R2] Connection test failed:', error);
    return {
      connected: false,
      buckets: [],
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
      error: error?.message || String(error),
    };
  }
}

/**
 * Ensure default bucket exists or select first available bucket
 */
export async function ensureBucketExists(bucketName: string = R2_CONFIG.defaultBucket): Promise<string> {
  const client = getR2Client();
  try {
    // Check if bucket exists
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return bucketName;
  } catch (error: any) {
    // If not found, try to create it or fall back to any existing bucket
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      return bucketName;
    } catch (createError: any) {
      // List existing buckets and use the first one if available
      try {
        const listRes = await client.send(new ListBucketsCommand({}));
        const existing = listRes.Buckets?.[0]?.Name;
        if (existing) {
          return existing;
        }
      } catch (listError) {
        // ignore
      }
      return bucketName;
    }
  }
}

/**
 * Upload object to Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  data: string | Buffer | Uint8Array,
  contentType: string = 'application/json',
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; key: string; bucket: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);
    
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
    console.error('[Cloudflare R2] Upload error:', error);
    return {
      success: false,
      key,
      bucket: bucketName,
      error: error?.message || String(error),
    };
  }
}

/**
 * List objects in Cloudflare R2 bucket
 */
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
    const targetBucket = await ensureBucketExists(bucketName);
    
    const command = new ListObjectsV2Command({
      Bucket: targetBucket,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await client.send(command);
    const objects = (response.Contents || []).map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified,
    })).filter((item) => Boolean(item.key));

    return {
      success: true,
      bucket: targetBucket,
      objects,
    };
  } catch (error: any) {
    console.error('[Cloudflare R2] List objects error:', error);
    return {
      success: false,
      bucket: bucketName,
      objects: [],
      error: error?.message || String(error),
    };
  }
}

/**
 * Get object content from Cloudflare R2
 */
export async function getFromR2(
  key: string,
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);
    
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
    console.error('[Cloudflare R2] Get object error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Delete object from Cloudflare R2
 */
export async function deleteFromR2(
  key: string,
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);
    
    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    await client.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('[Cloudflare R2] Delete object error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Generate Presigned Upload URL for direct client upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'application/json',
  expiresInSeconds: number = 3600,
  bucketName: string = R2_CONFIG.defaultBucket
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);
    
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return {
      success: true,
      url,
      key,
    };
  } catch (error: any) {
    console.error('[Cloudflare R2] Presigned URL error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}
