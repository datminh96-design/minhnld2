import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

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

let r2Client: S3Client | null = null;
function getClient() {
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

function getSubpath(req: any): string {
  if (req.query?.subpath) {
    return Array.isArray(req.query.subpath) ? req.query.subpath.join('/') : String(req.query.subpath);
  }
  const urlPath = (req.url || '').split('?')[0];
  const match = urlPath.match(/\/api\/upload\/(.*)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlPath.replace(/^\/(api\/)?upload\/?/, '');
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
  const client = getClient();
  const bucket = R2_CONFIG.defaultBucket;

  try {
    // 1. Presign Upload URL: /api/upload/presign
    if (subpath === 'presign' || (!subpath && req.method === 'POST')) {
      const body = req.body || {};
      const { originalFileName = 'file.dat', mimeType = 'application/octet-stream' } = body;
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const timestamp = Math.floor(now.getTime() / 1000);
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `uploads/admin123/${year}/${month}/${timestamp}-${randomSuffix}-${safeName}`;
      const fileId = `file_${Date.now()}_${randomSuffix}`;
      const expiresInSeconds = 3600;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      return res.status(200).json({
        success: true,
        uploadUrl,
        objectKey,
        fileId,
        expiresAt,
        bucket,
      });
    }

    // 2. Upload complete confirmation: /api/upload/complete
    if (subpath === 'complete') {
      const body = req.body || {};
      const { objectKey, fileId, originalFileName, mimeType, fileSize, folder, description } = body;

      if (!objectKey) {
        return res.status(400).json({ success: false, error: 'Missing objectKey' });
      }

      let confirmedSize = fileSize || 0;
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
        confirmedSize = head.ContentLength || confirmedSize;
      } catch (headErr) {
        console.warn('[Upload Complete] Head object warning:', headErr);
      }

      const fileRecord = {
        id: fileId || `file_${Date.now()}`,
        name: originalFileName || objectKey.split('/').pop() || 'Tài liệu',
        objectKey,
        bucket,
        fileSize: confirmedSize,
        mimeType: mimeType || 'application/octet-stream',
        folder: folder || 'Gốc',
        description: description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        file: fileRecord,
        message: 'Đã lưu tệp vào Cloudflare R2 thành công',
      });
    }

    return res.status(200).json({ success: true, message: 'Upload service ready' });
  } catch (err: any) {
    console.error('[Upload Handler Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý tải tệp' });
  }
}
