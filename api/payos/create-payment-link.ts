import { PayOS } from '@payos/node';

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '23a0f8b7-488b-4e8f-ade7-470dd0d51027';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '9ca106c4-8a7f-4a99-952f-8116f70c42b3';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7';

function formatDescription(desc?: string): string {
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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      amount,
      description,
      orderCode: customOrderCode,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      items,
      returnUrl,
      cancelUrl,
    } = req.body || {};

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

    const safeDescription = formatDescription(description);

    let finalReturnUrl = returnUrl;
    let finalCancelUrl = cancelUrl;
    if (!finalReturnUrl || typeof finalReturnUrl !== 'string' || !finalReturnUrl.startsWith('http')) {
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'personal-finance-management.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      finalReturnUrl = `${protocol}://${host}/?payment_status=PAID`;
      finalCancelUrl = `${protocol}://${host}/?payment_status=CANCELLED`;
    }

    const payos = new PayOS({
      clientId: PAYOS_CLIENT_ID,
      apiKey: PAYOS_API_KEY,
      checksumKey: PAYOS_CHECKSUM_KEY,
    });

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
  } catch (err: any) {
    console.error('[PayOS Vercel Create Link Error]:', err);
    let errMsg = err?.message || 'Không thể tạo link thanh toán PayOS. Vui lòng kiểm tra API Key và Checksum Key.';
    if (err?.response?.data?.desc) {
      errMsg = err.response.data.desc;
    } else if (err?.desc) {
      errMsg = err.desc;
    }
    return res.status(400).json({
      success: false,
      error: errMsg,
    });
  }
}
