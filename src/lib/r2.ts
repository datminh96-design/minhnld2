import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sanitizeFileName, getFileExtension } from './file-utils';

// Cloudflare R2 S3 credentials configuration
export const R2_CONFIG = {
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

let r2ClientInstance: S3Client | null = null;
let cachedResolvedBucket: string | null = null;
let corsConfiguredBuckets = new Set<string>();

/**
 * Dynamically update R2 configuration
 */
export function updateR2Config(newConfig: Partial<typeof R2_CONFIG>) {
  if (newConfig.accountId) R2_CONFIG.accountId = newConfig.accountId.trim();
  if (newConfig.accessKeyId) R2_CONFIG.accessKeyId = newConfig.accessKeyId.trim();
  if (newConfig.secretAccessKey) R2_CONFIG.secretAccessKey = newConfig.secretAccessKey.trim();
  if (newConfig.endpoint) R2_CONFIG.endpoint = newConfig.endpoint.trim();
  if (newConfig.defaultBucket) {
    R2_CONFIG.defaultBucket = newConfig.defaultBucket.trim();
    cachedResolvedBucket = R2_CONFIG.defaultBucket;
  }
  r2ClientInstance = null; // Reset cached client instance to apply new credentials
  corsConfiguredBuckets.clear();
}

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
 * Ensure CORS configuration is active on target bucket to allow browser direct uploads
 */
export async function ensureBucketCors(bucketName: string): Promise<void> {
  if (corsConfiguredBuckets.has(bucketName)) return;
  try {
    const client = getR2Client();
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'x-amz-request-id'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    corsConfiguredBuckets.add(bucketName);
  } catch (corsErr: any) {
    console.warn(`[Cloudflare R2] CORS set warning for ${bucketName}:`, corsErr?.message || corsErr);
  }
}

/**
 * Auto-discover existing buckets and ensure an active valid bucket is selected
 */
export async function ensureBucketExists(bucketName?: string): Promise<string> {
  const client = getR2Client();
  const target = bucketName || cachedResolvedBucket || R2_CONFIG.defaultBucket || 'minhnld2';
  
  try {
    await client.send(new HeadBucketCommand({ Bucket: target }));
    cachedResolvedBucket = target;
    // Ensure CORS is set for seamless browser uploads
    ensureBucketCors(target).catch(() => {});
    return target;
  } catch (error: any) {
    // If target bucket does not exist, query ListBuckets to auto-detect valid bucket
    try {
      const listRes = await client.send(new ListBucketsCommand({}));
      const buckets = (listRes.Buckets || []).map((b) => b.Name || '').filter(Boolean);
      
      if (buckets.length > 0) {
        // If current configured is in list, use it; otherwise use the first available bucket
        const matched = buckets.find((b) => b.toLowerCase() === target.toLowerCase()) || buckets[0];
        R2_CONFIG.defaultBucket = matched;
        cachedResolvedBucket = matched;
        ensureBucketCors(matched).catch(() => {});
        return matched;
      }
      
      // If no buckets found, attempt to create the target bucket
      await client.send(new CreateBucketCommand({ Bucket: target }));
      cachedResolvedBucket = target;
      ensureBucketCors(target).catch(() => {});
      return target;
    } catch (createOrListError: any) {
      console.warn('[Cloudflare R2] Auto-bucket resolution note:', createOrListError?.message || createOrListError);
      cachedResolvedBucket = target;
      return target;
    }
  }
}

/**
 * Generate a safe unique R2 object key according to architecture:
 * uploads/{user_id}/{year}/{month}/{timestamp}-{random}-{sanitized_name}
 */
export function generateR2ObjectKey(userId: string = 'admin123', originalFileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  
  const ext = getFileExtension(originalFileName);
  const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
  const safeBase = sanitizeFileName(baseName);
  const uniqueName = `${timestamp}-${randomSuffix}-${safeBase}${ext ? `.${ext}` : ''}`;
  
  const safeUserId = sanitizeFileName(userId || 'anonymous');
  return `uploads/${safeUserId}/${year}/${month}/${uniqueName}`;
}

/**
 * Test R2 connection and list available buckets
 */
export async function testR2Connection(): Promise<{
  connected: boolean;
  buckets: string[];
  endpoint: string;
  accountId: string;
  defaultBucket: string;
  error?: string;
}> {
  try {
    const client = getR2Client();
    let buckets: string[] = [];

    try {
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      buckets = (response.Buckets || []).map((b) => b.Name || '').filter(Boolean);
      
      if (buckets.length > 0 && (!R2_CONFIG.defaultBucket || !buckets.includes(R2_CONFIG.defaultBucket))) {
        R2_CONFIG.defaultBucket = buckets[0];
        cachedResolvedBucket = buckets[0];
      }
    } catch (listErr) {
      const activeBucket = await ensureBucketExists();
      buckets = [activeBucket];
    }

    if (buckets.length === 0 && R2_CONFIG.defaultBucket) {
      buckets = [R2_CONFIG.defaultBucket];
    }

    return {
      connected: true,
      buckets,
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
      defaultBucket: R2_CONFIG.defaultBucket,
    };
  } catch (error: any) {
    console.error('[Cloudflare R2] Connection test failed:', error);
    return {
      connected: false,
      buckets: [],
      endpoint: R2_CONFIG.endpoint,
      accountId: R2_CONFIG.accountId,
      defaultBucket: R2_CONFIG.defaultBucket,
      error: error?.message || String(error),
    };
  }
}

/**
 * Check if object exists in R2
 */
export async function headObjectInR2(
  key: string,
  bucketName?: string
): Promise<{ exists: boolean; size?: number; contentType?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key,
      })
    );
    return {
      exists: true,
      size: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch (err: any) {
    return { exists: false, error: err?.message || String(err) };
  }
}

/**
 * Generate Presigned Upload PUT URL for direct browser upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'application/octet-stream',
  expiresInSeconds: number = 3600,
  bucketName?: string
): Promise<{ success: boolean; url?: string; key?: string; bucket?: string; error?: string }> {
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
      bucket: targetBucket,
    };
  } catch (error: any) {
    console.error('[Cloudflare R2] Presigned Upload URL error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Generate Presigned Download GET URL with attachment filename
 */
export async function getPresignedDownloadUrl(
  key: string,
  downloadFileName?: string,
  expiresInSeconds: number = 300,
  bucketName?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ResponseContentDisposition: downloadFileName
        ? `attachment; filename="${encodeURIComponent(downloadFileName)}"`
        : 'attachment',
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return { success: true, url };
  } catch (error: any) {
    console.error('[Cloudflare R2] Presigned Download URL error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Generate Presigned Preview GET URL for inline viewing
 */
export async function getPresignedPreviewUrl(
  key: string,
  contentType?: string,
  expiresInSeconds: number = 600,
  bucketName?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getR2Client();
    const targetBucket = await ensureBucketExists(bucketName);

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ResponseContentType: contentType || undefined,
      ResponseContentDisposition: 'inline',
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return { success: true, url };
  } catch (error: any) {
    console.error('[Cloudflare R2] Presigned Preview URL error:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Upload object to Cloudflare R2 (Server-side upload)
 */
export async function uploadToR2(
  key: string,
  data: string | Buffer | Uint8Array,
  contentType: string = 'application/json',
  bucketName?: string
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
      bucket: bucketName || R2_CONFIG.defaultBucket,
      error: error?.message || String(error),
    };
  }
}

/**
 * List objects in Cloudflare R2 bucket
 */
export async function listR2Objects(
  prefix: string = '',
  bucketName?: string
): Promise<{
  success: boolean;
  bucket: string;
  objects: Array<{ key: string; size: number; lastModified?: Date }>;
  error?: string;
}> {
  try {
    const client = getR2Client();
    let targetBucket = await ensureBucketExists(bucketName);
    
    let command = new ListObjectsV2Command({
      Bucket: targetBucket,
      Prefix: prefix,
      MaxKeys: 500,
    });

    try {
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
    } catch (listErr: any) {
      if (listErr?.name === 'NoSuchBucket' || String(listErr).includes('NoSuchBucket')) {
        // Force refresh bucket list and retry
        const discovered = await ensureBucketExists();
        if (discovered && discovered !== targetBucket) {
          targetBucket = discovered;
          command = new ListObjectsV2Command({
            Bucket: targetBucket,
            Prefix: prefix,
            MaxKeys: 500,
          });
          const retryRes = await client.send(command);
          const objects = (retryRes.Contents || []).map((item) => ({
            key: item.Key || '',
            size: item.Size || 0,
            lastModified: item.LastModified,
          })).filter((item) => Boolean(item.key));

          return {
            success: true,
            bucket: targetBucket,
            objects,
          };
        }
      }
      throw listErr;
    }
  } catch (error: any) {
    console.error('[Cloudflare R2] List objects error:', error);
    return {
      success: false,
      bucket: bucketName || R2_CONFIG.defaultBucket,
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
  bucketName?: string
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
  bucketName?: string
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
