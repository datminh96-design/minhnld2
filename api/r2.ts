import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

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

export function updateR2Config(newConfig: Partial<typeof R2_CONFIG>) {
  if (newConfig.accountId) R2_CONFIG.accountId = newConfig.accountId.trim();
  if (newConfig.accessKeyId) R2_CONFIG.accessKeyId = newConfig.accessKeyId.trim();
  if (newConfig.secretAccessKey) R2_CONFIG.secretAccessKey = newConfig.secretAccessKey.trim();
  if (newConfig.endpoint) R2_CONFIG.endpoint = newConfig.endpoint.trim();
  if (newConfig.defaultBucket) {
    R2_CONFIG.defaultBucket = newConfig.defaultBucket.trim();
    cachedResolvedBucket = R2_CONFIG.defaultBucket;
  }
  r2ClientInstance = null;
  corsConfiguredBuckets.clear();
}

export function getR2Client(): S3Client {
  if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.endpoint) {
    throw new Error('Cloudflare R2 credentials (accessKeyId, secretAccessKey, endpoint) are not configured.');
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
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag', 'Content-Type', 'Content-Length', 'x-amz-meta-*'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    corsConfiguredBuckets.add(bucketName);
  } catch (corsErr: any) {
    console.warn(`[R2 CORS] Warning on bucket '${bucketName}':`, corsErr?.message || corsErr);
  }
}

export async function resolveWorkingBucket(preferredBucket?: string): Promise<string> {
  const target = preferredBucket || cachedResolvedBucket || R2_CONFIG.defaultBucket || 'minhnld2';
  const client = getR2Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: target }));
    cachedResolvedBucket = target;
    await ensureBucketCors(target);
    return target;
  } catch {
    try {
      const listRes = await client.send(new ListBucketsCommand({}));
      if (listRes.Buckets && listRes.Buckets.length > 0) {
        const first = listRes.Buckets[0].Name || 'minhnld2';
        cachedResolvedBucket = first;
        await ensureBucketCors(first);
        return first;
      }
    } catch {}
  }
  return target;
}

export async function testR2Connection(): Promise<{
  connected: boolean;
  endpoint: string;
  defaultBucket: string;
  resolvedBucket?: string;
  bucketsCount: number;
  buckets: string[];
  error?: string;
}> {
  try {
    const client = getR2Client();
    const res = await client.send(new ListBucketsCommand({}));
    const bucketNames = (res.Buckets || []).map((b) => b.Name || '').filter(Boolean);
    const resolved = await resolveWorkingBucket(R2_CONFIG.defaultBucket);
    return {
      connected: true,
      endpoint: R2_CONFIG.endpoint,
      defaultBucket: R2_CONFIG.defaultBucket,
      resolvedBucket: resolved,
      bucketsCount: bucketNames.length > 0 ? bucketNames.length : 1,
      buckets: bucketNames.length > 0 ? bucketNames : [resolved],
    };
  } catch (err: any) {
    return {
      connected: false,
      endpoint: R2_CONFIG.endpoint,
      defaultBucket: R2_CONFIG.defaultBucket,
      bucketsCount: 0,
      buckets: [],
      error: err?.message || String(err),
    };
  }
}

async function getRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf-8'));
      } catch {
        return req.body.toString('utf-8');
      }
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
  }

  if (typeof req.on !== 'function') {
    return {};
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw || {});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function getSubpath(req: any): string {
  if (req.query?.subpath) {
    return Array.isArray(req.query.subpath) ? req.query.subpath.join('/') : String(req.query.subpath);
  }
  const urlPath = (req.url || '').split('?')[0];
  const match = urlPath.match(/\/api\/r2\/(.*)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlPath.replace(/^\/(api\/)?r2\/?/, '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-file-name, x-object-key, x-mime-type, x-folder, x-description, x-file-id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req).toLowerCase();
  const method = (req.method || 'GET').toUpperCase();
  const body = await getRequestBody(req);
  const query = req.query || {};

  try {
    // 1. Status Check: /api/r2/status
    if (subpath === 'status' || (!subpath && method === 'GET' && !query.action && !query.key && !query.prefix)) {
      const result = await testR2Connection();
      return res.status(200).json(result);
    }

    // 2. Configuration: GET /api/r2/config or POST /api/r2/config
    if (subpath === 'config') {
      if (method === 'POST') {
        const { accountId, accessKeyId, secretAccessKey, endpoint, defaultBucket } = body || {};
        updateR2Config({
          accountId,
          accessKeyId,
          secretAccessKey,
          endpoint,
          defaultBucket,
        });
        const testResult = await testR2Connection();
        return res.status(200).json({
          success: testResult.connected,
          message: 'Đã cập nhật cấu hình Cloudflare R2',
          ...testResult,
        });
      }

      return res.status(200).json({
        accountId: R2_CONFIG.accountId,
        accessKeyId: R2_CONFIG.accessKeyId,
        endpoint: R2_CONFIG.endpoint,
        defaultBucket: R2_CONFIG.defaultBucket,
        hasSecretKey: Boolean(R2_CONFIG.secretAccessKey),
        secretKeyMasked: R2_CONFIG.secretAccessKey
          ? `${R2_CONFIG.secretAccessKey.slice(0, 6)}••••••••${R2_CONFIG.secretAccessKey.slice(-6)}`
          : '',
      });
    }

    // 3. Backup Management: POST /api/r2/backup (upload) or GET /api/r2/backup (download)
    if (subpath === 'backup') {
      const client = getR2Client();
      const bucket = await resolveWorkingBucket(query.bucket || body?.bucket);

      if (method === 'POST') {
        const payload = body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const key = `backups/backup_${timestamp}.json`;
        const contentStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(contentStr, 'utf-8'),
          ContentType: 'application/json',
          Metadata: {
            'uploaded-by': 'personal-finance-app',
            'backup-time': new Date().toISOString(),
          },
        });

        await client.send(command);

        return res.status(200).json({
          success: true,
          key,
          bucket,
          message: 'Bản sao lưu đã được tải lên Cloudflare R2 thành công',
        });
      }

      if (method === 'GET') {
        const key = query.key || body?.key;
        if (!key) {
          return res.status(400).json({ success: false, error: 'Thiếu key của bản sao lưu' });
        }

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: String(key),
        });

        const response = await client.send(command);
        if (!response.Body) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy nội dung file trên R2' });
        }

        const strData = await response.Body.transformToString('utf-8');
        const parsed = JSON.parse(strData);
        return res.status(200).json({ success: true, data: parsed });
      }
    }

    // 4. List Objects/Backups: GET /api/r2/objects or GET /api/r2/list
    if (subpath === 'objects' || subpath === 'list' || (method === 'GET' && query.prefix !== undefined)) {
      const prefix = query.prefix !== undefined ? String(query.prefix) : 'backups/';
      const bucket = await resolveWorkingBucket(query.bucket ? String(query.bucket) : undefined);
      const client = getR2Client();

      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: Number(query.maxKeys) || 500,
      });

      const response = await client.send(listCommand);
      const objects = (response.Contents || [])
        .map((item) => ({
          key: item.Key || '',
          size: item.Size || 0,
          lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        }))
        .filter((item) => Boolean(item.key));

      return res.status(200).json({
        success: true,
        bucket,
        objects,
        files: objects, // backward compatibility
        isTruncated: response.IsTruncated || false,
      });
    }

    // 5. Delete Object: DELETE /api/r2/object or DELETE /api/r2/delete
    if (subpath === 'object' || subpath === 'delete' || method === 'DELETE') {
      const key = query.key || body?.key || body?.objectKey;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Thiếu key cần xóa' });
      }
      const bucket = await resolveWorkingBucket(query.bucket || body?.bucket);
      const client = getR2Client();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: String(key) }));
      return res.status(200).json({ success: true, key: String(key), bucket });
    }

    // 6. Generic Upload: POST /api/r2/upload
    if (subpath === 'upload' && method === 'POST') {
      const { key, data, contentType = 'application/json' } = body || {};
      if (!key || !data) {
        return res.status(400).json({ success: false, error: 'Thiếu key hoặc data' });
      }
      const bucket = await resolveWorkingBucket(query.bucket || body?.bucket);
      const client = getR2Client();
      const contentBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(JSON.stringify(data));

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: String(key),
          Body: contentBuffer,
          ContentType: String(contentType),
        })
      );
      return res.status(200).json({ success: true, key: String(key), bucket });
    }

    // 7. Presigned URL: /api/r2/presign or /api/r2/presigned-upload-url
    if (subpath === 'presign' || subpath === 'presigned-upload-url' || subpath === 'upload-url') {
      const key = query.key || body?.key || body?.objectKey;
      const contentType = query.contentType || body?.contentType || 'application/octet-stream';
      const bucket = await resolveWorkingBucket(query.bucket || body?.bucket);

      if (!key) {
        return res.status(400).json({ error: 'Missing object key' });
      }

      const client = getR2Client();
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: String(key),
        ContentType: String(contentType),
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      return res.status(200).json({
        uploadUrl,
        key: String(key),
        bucket,
        expiresIn: 3600,
      });
    }

    // Default: Check status and return info
    const statusRes = await testR2Connection();
    return res.status(200).json(statusRes);
  } catch (err: any) {
    console.error('[R2 API Handler Error]:', err);
    return res.status(200).json({
      success: false,
      connected: false,
      error: err?.message || 'Lỗi xử lý yêu cầu Cloudflare R2',
    });
  }
}
