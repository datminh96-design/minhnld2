import crypto from 'node:crypto';

// In-memory or env configuration with the user-provided keys as defaults
export let PAYOS_CONFIG = {
  clientId: process.env.PAYOS_CLIENT_ID || '23a0f8b7-488b-4e8f-ade7-470dd0d51027',
  apiKey: process.env.PAYOS_API_KEY || '9ca106c4-8a7f-4a99-952f-8116f70c42b3',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7',
};

const BASE_URL = 'https://api-merchant.payos.vn';

function sortObjDataByKey(object: Record<string, any>): Record<string, any> {
  const ordered: Record<string, any> = {};
  Object.keys(object)
    .sort()
    .forEach((key) => {
      ordered[key] = object[key];
    });
  return ordered;
}

function convertObjToQueryStr(object: Record<string, any>): string {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined && object[key] !== null && object[key] !== '')
    .map((key) => {
      let value = object[key];
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return `${key}=${value}`;
    })
    .join('&');
}

function createSignatureFromObj(data: any, key: string): string {
  if (!data || !key) return '';
  const sortedDataByKey = sortObjDataByKey(data);
  const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
  return crypto.createHmac('sha256', key).update(dataQueryStr).digest('hex');
}

function createSignatureOfPaymentRequest(data: any, key: string): string {
  if (!data || !key) return '';
  const { amount, cancelUrl, description, orderCode, returnUrl } = data;
  const dataStr = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  return crypto.createHmac('sha256', key).update(dataStr).digest('hex');
}

export function updatePayOSConfig(config: { clientId?: string; apiKey?: string; checksumKey?: string }) {
  if (config.clientId) PAYOS_CONFIG.clientId = config.clientId.trim();
  if (config.apiKey) PAYOS_CONFIG.apiKey = config.apiKey.trim();
  if (config.checksumKey) PAYOS_CONFIG.checksumKey = config.checksumKey.trim();
}

export function getPayOSStatus() {
  return {
    clientId: PAYOS_CONFIG.clientId ? `${PAYOS_CONFIG.clientId.substring(0, 8)}...` : '',
    apiKey: PAYOS_CONFIG.apiKey ? `${PAYOS_CONFIG.apiKey.substring(0, 6)}...` : '',
    checksumKey: PAYOS_CONFIG.checksumKey ? `${PAYOS_CONFIG.checksumKey.substring(0, 8)}...` : '',
    isConfigured: Boolean(PAYOS_CONFIG.clientId && PAYOS_CONFIG.apiKey && PAYOS_CONFIG.checksumKey),
  };
}

export function formatPayOSDescription(desc?: string, fallbackOrderCode?: number | string): string {
  if (!desc) return 'Gui Dat Minh';
  let clean = desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/gui\s+tien\s+cho\s+nguyen\s+le\s+dat\s+minh/i.test(clean)) {
    return 'Gui Nguyen Le Dat Minh';
  }

  if (clean.length > 25) {
    clean = clean.substring(0, 25).trim();
  }
  return clean || 'Gui Dat Minh';
}

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
  const match = urlPath.match(/\/api\/payos\/(.*)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlPath.replace(/^\/(api\/)?payos\/?/, '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-id, x-api-key, x-checksum-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const method = (req.method || 'GET').toUpperCase();
  const body = parseBody(req);
  const query = req.query || {};

  // Extract client keys from body or headers or fallback to PAYOS_CONFIG
  const activeClientId = (
    body?.clientId ||
    req.headers?.['x-client-id'] ||
    PAYOS_CONFIG.clientId ||
    process.env.PAYOS_CLIENT_ID ||
    ''
  ).toString().trim();

  const activeApiKey = (
    body?.apiKey ||
    req.headers?.['x-api-key'] ||
    PAYOS_CONFIG.apiKey ||
    process.env.PAYOS_API_KEY ||
    ''
  ).toString().trim();

  const activeChecksumKey = (
    body?.checksumKey ||
    req.headers?.['x-checksum-key'] ||
    PAYOS_CONFIG.checksumKey ||
    process.env.PAYOS_CHECKSUM_KEY ||
    ''
  ).toString().trim();

  try {
    // 1. Status: /api/payos/status or default GET /api/payos
    if (subpath === 'status' || (!subpath && method === 'GET')) {
      const status = getPayOSStatus();
      return res.status(200).json({
        success: true,
        ...status,
      });
    }

    // 2. Config: /api/payos/config
    if (subpath === 'config') {
      if (method === 'POST') {
        const { clientId, apiKey, checksumKey } = body;
        updatePayOSConfig({ clientId, apiKey, checksumKey });
        const status = getPayOSStatus();
        return res.status(200).json({
          success: true,
          message: 'Đã cập nhật cấu hình PayOS thành công!',
          ...status,
        });
      }
      const status = getPayOSStatus();
      return res.status(200).json({ success: true, ...status });
    }

    // 3. Webhook: /api/payos/webhook (Accepts both GET health probe & POST real notifications)
    if (subpath === 'webhook' || subpath === 'payment/webhook') {
      if (method === 'GET') {
        return res.status(200).json({
          success: true,
          message: 'PayOS Webhook endpoint is healthy and ready to receive transactions.',
        });
      }

      const webhookData = body;
      let verifiedData: any = webhookData;
      let isVerified = false;

      if (webhookData?.data && webhookData?.signature && activeChecksumKey) {
        try {
          const expectedSig = createSignatureFromObj(webhookData.data, activeChecksumKey);
          if (expectedSig === webhookData.signature) {
            isVerified = true;
            verifiedData = webhookData.data;
          }
        } catch (e: any) {
          console.warn('[PayOS Webhook] Signature verification notice:', e?.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        verified: isVerified,
        data: verifiedData,
      });
    }

    // 4. Confirm Webhook: /api/payos/confirm-webhook
    if (subpath === 'confirm-webhook') {
      const { webhookUrl } = body;
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu hoặc URL webhook không hợp lệ (cần bắt đầu bằng https://)',
        });
      }

      if (!activeClientId || !activeApiKey) {
        return res.status(400).json({
          success: false,
          error: 'Chưa cấu hình Client ID và API Key cho PayOS',
        });
      }

      // Call PayOS confirm-webhook endpoint directly via REST API
      const payosRes = await fetch(`${BASE_URL}/confirm-webhook`, {
        method: 'POST',
        headers: {
          'x-client-id': activeClientId,
          'x-api-key': activeApiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'PersonalFinanceApp/1.0',
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const payosData: any = await payosRes.json().catch(() => null);

      if (!payosRes.ok || (payosData && payosData.code !== '00')) {
        const errorDesc =
          payosData?.desc ||
          payosData?.data ||
          payosData?.message ||
          `Mã lỗi PayOS ${payosData?.code || payosRes.status}`;
        return res.status(200).json({
          success: false,
          error: `Không thể xác nhận webhook với PayOS: ${errorDesc}`,
          data: payosData,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã xác nhận Webhook URL với PayOS thành công!',
        data: payosData?.data || payosData,
      });
    }

    // 5. Create Payment Link: /api/payos/create-payment-link
    if (subpath === 'create-payment-link' || (subpath.includes('create') && method === 'POST')) {
      const {
        amount,
        description,
        orderCode: customOrderCode,
        buyerName,
        returnUrl,
        cancelUrl,
      } = body;

      const numAmount = Math.round(Number(amount));
      if (!numAmount || numAmount < 1000) {
        return res.status(400).json({
          success: false,
          error: 'Số tiền thanh toán tối thiểu là 1,000 VNĐ',
        });
      }

      const orderCode =
        customOrderCode && Number.isInteger(Number(customOrderCode)) && Number(customOrderCode) > 0
          ? Number(customOrderCode)
          : Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 900 + 100);

      const safeDescription = formatPayOSDescription(description, orderCode);

      let finalReturnUrl = returnUrl;
      let finalCancelUrl = cancelUrl;
      if (!finalReturnUrl || typeof finalReturnUrl !== 'string' || !finalReturnUrl.startsWith('http')) {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        finalReturnUrl = `${protocol}://${host}/?payment_status=PAID`;
        finalCancelUrl = `${protocol}://${host}/?payment_status=CANCELLED`;
      }

      const paymentLinkData: any = {
        orderCode,
        amount: numAmount,
        description: safeDescription,
        cancelUrl: finalCancelUrl,
        returnUrl: finalReturnUrl,
      };

      if (buyerName && typeof buyerName === 'string' && buyerName.trim()) {
        const cleanName = buyerName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .replace(/[^a-zA-Z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50);
        if (cleanName) {
          paymentLinkData.buyerName = cleanName;
        }
      }

      // Generate signature
      const signature = createSignatureOfPaymentRequest(paymentLinkData, activeChecksumKey);
      paymentLinkData.signature = signature;

      const payosRes = await fetch(`${BASE_URL}/v2/payment-requests`, {
        method: 'POST',
        headers: {
          'x-client-id': activeClientId,
          'x-api-key': activeApiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'PersonalFinanceApp/1.0',
        },
        body: JSON.stringify(paymentLinkData),
      });

      const payosData: any = await payosRes.json().catch(() => null);

      if (!payosRes.ok || (payosData && payosData.code !== '00')) {
        const errMsg = payosData?.desc || payosData?.message || 'Không thể tạo link thanh toán PayOS';
        return res.status(400).json({
          success: false,
          error: errMsg,
          details: payosData,
        });
      }

      return res.status(200).json({
        success: true,
        data: payosData.data,
        orderCode,
        amount: numAmount,
        description: safeDescription,
      });
    }

    // 6. Get Payment Link Info: /api/payos/payment-link/:id
    if (subpath.startsWith('payment-link/')) {
      const orderId = subpath.replace('payment-link/', '').trim();
      const payosRes = await fetch(`${BASE_URL}/v2/payment-requests/${orderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': activeClientId,
          'x-api-key': activeApiKey,
          'Content-Type': 'application/json',
        },
      });
      const payosData: any = await payosRes.json().catch(() => null);

      if (!payosRes.ok || (payosData && payosData.code !== '00')) {
        return res.status(400).json({
          success: false,
          error: payosData?.desc || `Không thể lấy thông tin thanh toán cho đơn ${orderId}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: payosData.data,
      });
    }

    // 7. Cancel Payment Link: /api/payos/cancel-payment-link/:id
    if (subpath.startsWith('cancel-payment-link/')) {
      const orderId = subpath.replace('cancel-payment-link/', '').trim();
      const reason = body?.cancellationReason || 'Người dùng hủy thanh toán';
      const payosRes = await fetch(`${BASE_URL}/v2/payment-requests/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'x-client-id': activeClientId,
          'x-api-key': activeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      const payosData: any = await payosRes.json().catch(() => null);

      if (!payosRes.ok || (payosData && payosData.code !== '00')) {
        return res.status(400).json({
          success: false,
          error: payosData?.desc || 'Không thể hủy link thanh toán',
        });
      }

      return res.status(200).json({
        success: true,
        data: payosData.data,
      });
    }

    const status = getPayOSStatus();
    return res.status(200).json({ success: true, ...status });
  } catch (err: any) {
    console.error('[PayOS API Handler Error]:', err);
    return res.status(200).json({
      success: false,
      error: err?.message || 'Lỗi xử lý yêu cầu PayOS',
    });
  }
}
