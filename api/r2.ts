import {
  testR2Connection,
  uploadToR2,
  getFromR2,
  listR2Objects,
  deleteFromR2,
  updateR2Config,
  generateR2ObjectKey,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getPresignedPreviewUrl,
  R2_CONFIG,
} from '../src/lib/r2';

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-file-name, x-object-key, x-mime-type, x-folder, x-description, x-file-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const method = (req.method || 'GET').toUpperCase();
  const body = parseBody(req);
  const query = req.query || {};

  try {
    // 1. Status check: /api/r2/status or default
    if (subpath === 'status' || (!subpath && method === 'GET' && !query.action && !query.key)) {
      const result = await testR2Connection();
      return res.status(200).json(result);
    }

    // 2. Config: /api/r2/config
    if (subpath === 'config') {
      if (method === 'POST') {
        const { accountId, accessKeyId, secretAccessKey, endpoint, defaultBucket } = body;
        updateR2Config({ accountId, accessKeyId, secretAccessKey, endpoint, defaultBucket });
        const testResult = await testR2Connection();
        return res.status(200).json({
          success: testResult.connected,
          ...testResult,
        });
      }
      return res.status(200).json({
        accountId: R2_CONFIG.accountId,
        accessKeyId: R2_CONFIG.accessKeyId,
        endpoint: R2_CONFIG.endpoint,
        defaultBucket: R2_CONFIG.defaultBucket,
        hasSecretKey: !!R2_CONFIG.secretAccessKey,
        secretKeyMasked: R2_CONFIG.secretAccessKey
          ? `${R2_CONFIG.secretAccessKey.slice(0, 6)}••••••••${R2_CONFIG.secretAccessKey.slice(-6)}`
          : '',
      });
    }

    // 3. List Objects: /api/r2/objects
    if (subpath === 'objects') {
      const prefix = (query.prefix as string) || '';
      const result = await listR2Objects(prefix);
      return res.status(200).json(result);
    }

    // 4. Backups: /api/r2/backup
    if (subpath === 'backup') {
      if (method === 'POST') {
        const payload = body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const key = `backups/backup_${timestamp}.json`;
        const uploadResult = await uploadToR2(
          key,
          JSON.stringify(payload, null, 2),
          'application/json'
        );
        return res.status(uploadResult.success ? 200 : 500).json(uploadResult);
      }
      
      const key = (query.key as string) || '';
      if (key) {
        const result = await getFromR2(key);
        if (result.success && result.data) {
          try {
            const parsed = JSON.parse(result.data.toString());
            return res.status(200).json({ success: true, backup: parsed });
          } catch {
            return res.status(200).json({ success: true, raw: result.data.toString() });
          }
        }
        return res.status(404).json({ success: false, error: 'Không tìm thấy bản sao lưu' });
      }

      // Default list backups
      const result = await listR2Objects('backups/');
      return res.status(200).json(result);
    }

    // 5. Object Operations: /api/r2/object
    if (subpath === 'object') {
      if (method === 'GET') {
        const key = (query.key as string) || '';
        const download = query.download === 'true';
        if (!key) {
          return res.status(400).json({ success: false, error: 'Thiếu key' });
        }
        if (download) {
          const presigned = await getPresignedDownloadUrl(key);
          return res.status(200).json(presigned);
        }
        const result = await getFromR2(key);
        return res.status(result.success ? 200 : 500).json(result);
      }

      if (method === 'POST') {
        const { key, content, contentType = 'application/octet-stream' } = body;
        if (!key) {
          return res.status(400).json({ success: false, error: 'Thiếu key' });
        }
        const result = await uploadToR2(key, content, contentType);
        return res.status(result.success ? 200 : 500).json(result);
      }

      if (method === 'DELETE') {
        const key = (query.key as string) || body?.key;
        if (!key) {
          return res.status(400).json({ success: false, error: 'Thiếu key' });
        }
        const result = await deleteFromR2(key);
        return res.status(result.success ? 200 : 500).json(result);
      }
    }

    // 6. Presigned Upload URL: /api/r2/upload/presign or /api/upload/presign
    if (subpath.includes('presign')) {
      const { originalFileName, mimeType = 'application/octet-stream' } = body;
      if (!originalFileName) {
        return res.status(400).json({ success: false, error: 'Thiếu originalFileName' });
      }
      const userId = 'admin123';
      const objectKey = generateR2ObjectKey(userId, originalFileName);
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresInSeconds = 3600;

      const presignResult = await getPresignedUploadUrl(
        objectKey,
        mimeType,
        expiresInSeconds,
        R2_CONFIG.defaultBucket
      );

      return res.status(200).json({
        success: presignResult.success,
        uploadUrl: presignResult.url,
        objectKey,
        fileId,
        bucket: R2_CONFIG.defaultBucket,
      });
    }

    // Default fallback
    const result = await testR2Connection();
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[R2 API Serverless Error]:', err);
    return res.status(200).json({
      connected: false,
      error: err?.message || 'Lỗi xử lý yêu cầu R2',
    });
  }
}
