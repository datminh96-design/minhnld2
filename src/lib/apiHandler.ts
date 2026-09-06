import {
  testR2Connection,
  uploadToR2,
  getFromR2,
  listR2Objects,
  deleteFromR2,
  updateR2Config,
  R2_CONFIG,
} from './r2.ts';
import {
  getEmailConfig,
  sendTransactionalEmail,
  generateEmailHtml,
  emailLogs,
} from './email.ts';

// Helper to parse JSON body safely if not already parsed
async function getParsedBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: any, statusCode: number, data: any) {
  if (res.headersSent) return;
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: any, res: any): Promise<boolean> {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }

  // Parse path & query
  const rawUrl = req.url || '/';
  const urlObj = new URL(rawUrl, 'http://localhost');
  let pathname = urlObj.pathname.replace(/\/+/g, '/');

  // Also check if path parameters were passed via Vercel [...path] query
  if (req.query?.path) {
    const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    pathname = `/api/${subpath}`;
  }

  // Normalize path
  if (!pathname.startsWith('/api')) {
    pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  }

  const method = (req.method || 'GET').toUpperCase();

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      sentryConfigured: true,
      r2Configured: !!(R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey),
    });
    return true;
  }

  // 2. R2 Status
  if (pathname === '/api/r2/status' && method === 'GET') {
    try {
      const result = await testR2Connection();
      sendJson(res, 200, result);
    } catch (error: any) {
      sendJson(res, 500, {
        connected: false,
        buckets: [],
        endpoint: R2_CONFIG.endpoint,
        accountId: R2_CONFIG.accountId,
        error: error?.message || 'Lỗi khi kiểm tra kết nối Cloudflare R2',
      });
    }
    return true;
  }

  // 3. R2 Config
  if (pathname === '/api/r2/config') {
    if (method === 'GET') {
      sendJson(res, 200, {
        accountId: R2_CONFIG.accountId,
        accessKeyId: R2_CONFIG.accessKeyId,
        endpoint: R2_CONFIG.endpoint,
        defaultBucket: R2_CONFIG.defaultBucket,
        hasSecretKey: !!R2_CONFIG.secretAccessKey,
        secretKeyMasked: R2_CONFIG.secretAccessKey
          ? `${R2_CONFIG.secretAccessKey.slice(0, 6)}••••••••${R2_CONFIG.secretAccessKey.slice(-6)}`
          : '',
      });
      return true;
    }
    if (method === 'POST') {
      try {
        const body = await getParsedBody(req);
        const { accountId, accessKeyId, secretAccessKey, endpoint, defaultBucket } = body || {};
        updateR2Config({
          accountId,
          accessKeyId,
          secretAccessKey,
          endpoint,
          defaultBucket,
        });
        const result = await testR2Connection();
        sendJson(res, 200, result);
      } catch (error: any) {
        sendJson(res, 500, {
          connected: false,
          buckets: [],
          endpoint: R2_CONFIG.endpoint,
          accountId: R2_CONFIG.accountId,
          error: error?.message || 'Lỗi khi cập nhật cấu hình Cloudflare R2',
        });
      }
      return true;
    }
  }

  // 4. R2 Objects list
  if (pathname === '/api/r2/objects' && method === 'GET') {
    try {
      const prefix = (req.query?.prefix as string) || urlObj.searchParams.get('prefix') || '';
      const result = await listR2Objects(prefix);
      sendJson(res, 200, result);
    } catch (error: any) {
      sendJson(res, 500, {
        success: false,
        error: error?.message || 'Lỗi khi lấy danh sách bản ghi Cloudflare R2',
      });
    }
    return true;
  }

  // 5. R2 Backup
  if (pathname === '/api/r2/backup') {
    if (method === 'POST') {
      try {
        const payload = await getParsedBody(req);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const key = `backups/backup_${timestamp}.json`;
        const result = await uploadToR2(key, JSON.stringify(payload, null, 2), 'application/json');
        sendJson(res, 200, {
          success: true,
          key,
          bucket: result.bucket,
          message: 'Đã sao lưu thành công lên Cloudflare R2',
        });
      } catch (error: any) {
        sendJson(res, 500, {
          success: false,
          error: error?.message || 'Lỗi khi tạo bản sao lưu lên Cloudflare R2',
        });
      }
      return true;
    }
    if (method === 'GET') {
      try {
        const key = (req.query?.key as string) || urlObj.searchParams.get('key');
        if (!key) {
          sendJson(res, 400, { success: false, error: 'Thiếu tham số key của bản sao lưu' });
          return true;
        }
        const resObj = await getFromR2(key);
        if (!resObj.success || !resObj.data) {
          sendJson(res, 404, { success: false, error: resObj.error || 'Không tìm thấy bản sao lưu' });
          return true;
        }
        const backupData = JSON.parse(resObj.data);
        sendJson(res, 200, { success: true, data: backupData });
      } catch (error: any) {
        sendJson(res, 500, {
          success: false,
          error: error?.message || 'Lỗi khi tải bản sao lưu từ Cloudflare R2',
        });
      }
      return true;
    }
  }

  // 6. R2 Upload generic
  if (pathname === '/api/r2/upload' && method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const { key, data, contentType = 'application/json' } = body || {};
      if (!key || !data) {
        sendJson(res, 400, { success: false, error: 'Thiếu key hoặc data' });
        return true;
      }
      const result = await uploadToR2(key, data, contentType);
      sendJson(res, 200, { success: true, ...result });
    } catch (error: any) {
      sendJson(res, 500, { success: false, error: error?.message || 'Lỗi khi tải tệp lên R2' });
    }
    return true;
  }

  // 7. R2 Delete object
  if (pathname === '/api/r2/object' && (method === 'DELETE' || method === 'POST')) {
    try {
      const body = await getParsedBody(req);
      const key = body?.key || (req.query?.key as string) || urlObj.searchParams.get('key');
      if (!key) {
        sendJson(res, 400, { success: false, error: 'Thiếu key cần xóa' });
        return true;
      }
      const result = await deleteFromR2(key);
      sendJson(res, 200, { success: true, ...result });
    } catch (error: any) {
      sendJson(res, 500, { success: false, error: error?.message || 'Lỗi khi xóa tệp trên R2' });
    }
    return true;
  }

  // 8. Email Status
  if (pathname === '/api/email/status' && method === 'GET') {
    const config = getEmailConfig();
    sendJson(res, 200, {
      success: true,
      isResendConfigured: config.isResendConfigured,
      isSmtpConfigured: config.isSmtpConfigured,
      emailFrom: config.emailFrom,
      defaultRecipient: config.defaultRecipient,
      smtpHost: config.smtp.host ? `${config.smtp.host}:${config.smtp.port}` : null,
      smtpUser: config.smtp.user || null,
      mode: config.isResendConfigured
        ? 'Resend API (Live)'
        : config.isSmtpConfigured
        ? 'Custom SMTP (Live)'
        : 'Simulator / Local Preview',
    });
    return true;
  }

  // 9. Email Send
  if (pathname === '/api/email/send' && method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const result = await sendTransactionalEmail(body);
      sendJson(res, 200, result);
    } catch (error: any) {
      sendJson(res, 500, { success: false, error: error?.message || 'Lỗi khi gửi email' });
    }
    return true;
  }

  // 10. Email Preview
  if (pathname === '/api/email/preview' && method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const { template = 'financial_summary', data = {}, customHtml } = body || {};
      const { subject, html } = generateEmailHtml(template, {
        ...data,
        customHtml,
      });
      sendJson(res, 200, { success: true, subject, html });
    } catch (error: any) {
      sendJson(res, 500, { success: false, error: error?.message || 'Lỗi khi xem trước email' });
    }
    return true;
  }

  // 11. Email Logs
  if (pathname === '/api/email/logs' && method === 'GET') {
    sendJson(res, 200, { logs: emailLogs });
    return true;
  }

  // Not handled by this standard dispatcher
  return false;
}
