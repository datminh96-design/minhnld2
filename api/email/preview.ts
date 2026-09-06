export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { subject = 'Thông báo tài chính', customHtml = '<p>Nội dung xem trước email</p>' } = payload;
    return res.status(200).json({
      success: true,
      subject,
      html: customHtml,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Lỗi xem trước email' });
  }
}
