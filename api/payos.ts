import { PayOS } from '@payos/node';
import {
  getPayOSInstance,
  getPayOSStatus,
  updatePayOSConfig,
  formatPayOSDescription,
  PAYOS_CONFIG,
} from '../src/lib/payos';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const method = (req.method || 'GET').toUpperCase();
  const body = parseBody(req);
  const query = req.query || {};

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

    // 3. Create Payment Link: /api/payos/create-payment-link
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

      const payos = getPayOSInstance();
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

      const response = await payos.paymentRequests.create(paymentLinkData);

      return res.status(200).json({
        success: true,
        data: response,
        orderCode,
        amount: numAmount,
        description: safeDescription,
      });
    }

    // 4. Get Payment Link Info: /api/payos/payment-link/:id
    if (subpath.startsWith('payment-link/')) {
      const orderId = subpath.replace('payment-link/', '').trim();
      const payos = getPayOSInstance();
      const orderCodeNum = Number(orderId);
      const info = !isNaN(orderCodeNum)
        ? await payos.paymentRequests.get(orderCodeNum)
        : await payos.paymentRequests.get(orderId);

      return res.status(200).json({
        success: true,
        data: info,
      });
    }

    // 5. Cancel Payment Link: /api/payos/cancel-payment-link/:id
    if (subpath.startsWith('cancel-payment-link/')) {
      const orderId = subpath.replace('cancel-payment-link/', '').trim();
      const reason = body?.cancellationReason || 'Người dùng hủy thanh toán';
      const payos = getPayOSInstance();
      const orderCodeNum = Number(orderId);
      const result = !isNaN(orderCodeNum)
        ? await payos.paymentRequests.cancel(orderCodeNum, reason)
        : await payos.paymentRequests.cancel(orderId, reason);

      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    // 6. Webhook: /api/payos/webhook
    if (subpath === 'webhook') {
      const webhookData = body;
      const payos = getPayOSInstance();
      let verifiedData: any = webhookData;
      try {
        verifiedData = await payos.webhooks.verify(webhookData);
      } catch (verifyErr: any) {
        console.warn('[PayOS Webhook] Verification warning:', verifyErr?.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: verifiedData,
      });
    }

    // 7. Confirm Webhook: /api/payos/confirm-webhook
    if (subpath === 'confirm-webhook') {
      const { webhookUrl } = body;
      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: 'Thiếu webhookUrl' });
      }
      const payos = getPayOSInstance();
      const result = await payos.webhooks.confirm(webhookUrl);
      return res.status(200).json({
        success: true,
        message: 'Đã xác nhận Webhook URL với PayOS thành công!',
        data: result,
      });
    }

    const status = getPayOSStatus();
    return res.status(200).json({ success: true, ...status });
  } catch (err: any) {
    console.error('[PayOS API Serverless Error]:', err);
    let errMsg = err?.message || 'Lỗi xử lý yêu cầu PayOS';
    if (err?.response?.data?.desc) {
      errMsg = err.response.data.desc;
    } else if (err?.desc) {
      errMsg = err.desc;
    }
    return res.status(200).json({
      success: false,
      error: errMsg,
    });
  }
}
