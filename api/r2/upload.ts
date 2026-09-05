import { uploadToR2 } from './_helpers';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }
    const { key, data, contentType = 'application/json' } = body || {};
    if (!key || !data) {
      return res.status(400).json({ success: false, error: 'Thiếu key hoặc data' });
    }

    const uploadResult = await uploadToR2(key, data, contentType);
    return res.status(uploadResult.success ? 200 : 500).json(uploadResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
}
