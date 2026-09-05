export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { SENTRY_DSN, VITE_SENTRY_DSN } = process.env;
  const dsn = SENTRY_DSN || VITE_SENTRY_DSN;

  return res.status(200).json({
    status: 'ok',
    message: 'Sentry endpoint verification ready for Vercel',
    sentryConfigured: Boolean(dsn),
    dsnMasked: dsn ? `${dsn.slice(0, 15)}...${dsn.slice(-10)}` : 'Not configured',
    timestamp: new Date().toISOString(),
  });
}
