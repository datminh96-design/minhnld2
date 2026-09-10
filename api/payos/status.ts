const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '23a0f8b7-488b-4e8f-ade7-470dd0d51027';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '9ca106c4-8a7f-4a99-952f-8116f70c42b3';
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isConfigured = Boolean(PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY);

  return res.status(200).json({
    success: true,
    clientId: PAYOS_CLIENT_ID ? `${PAYOS_CLIENT_ID.substring(0, 8)}...` : '',
    apiKey: PAYOS_API_KEY ? `${PAYOS_API_KEY.substring(0, 6)}...` : '',
    checksumKey: PAYOS_CHECKSUM_KEY ? `${PAYOS_CHECKSUM_KEY.substring(0, 8)}...` : '',
    isConfigured,
  });
}
