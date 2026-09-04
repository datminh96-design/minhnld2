export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = req.url || '';
    const targetPath = rawUrl.replace(/^\/api\/fmarket/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://fmarket.vn/',
      Origin: 'https://fmarket.vn',
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (req.method === 'POST' || req.method === 'PUT') {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const response = await fetch(`https://api.fmarket.vn${targetPath}`, fetchOptions);
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ success: false, data: { rows: [] } });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(200).json({ success: false, data: { rows: [] } });
  }
}
