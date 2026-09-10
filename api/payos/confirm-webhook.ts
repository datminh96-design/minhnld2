import { PayOS } from '@payos/node';

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '23a0f8b7-488b-4e8f-ade7-470dd0d51027';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '9ca106c4-8a7f-4a99-952f-8116f70c42b3';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { webhookUrl } = req.body || {};
    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: 'Thiếu webhookUrl' });
    }

    const payos = new PayOS({
      clientId: PAYOS_CLIENT_ID,
      apiKey: PAYOS_API_KEY,
      checksumKey: PAYOS_CHECKSUM_KEY,
    });

    const result = await payos.webhooks.confirm(webhookUrl);
    return res.status(200).json({
      success: true,
      message: 'Xác nhận webhook URL thành công',
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Không thể xác nhận webhook URL',
    });
  }
}
