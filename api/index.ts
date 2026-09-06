import { app } from '../server.ts';

export default async function handler(req: any, res: any) {
  // Add CORS headers for API invocations
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Determine actual requested URL from Vercel headers or fallback
  let targetUrl = req.url || '/';
  
  const matchedPath =
    req.headers?.['x-matched-path'] ||
    req.headers?.['x-vercel-matched-path'] ||
    req.headers?.['x-original-url'];

  if (matchedPath && typeof matchedPath === 'string' && (matchedPath.startsWith('/api') || matchedPath.startsWith('/r2') || matchedPath.startsWith('/gemini') || matchedPath.startsWith('/email'))) {
    targetUrl = matchedPath;
  } else if (targetUrl.includes('/api/index.ts') || targetUrl.includes('/api/index') || targetUrl === '/api' || targetUrl === '/api/') {
    const searchPart = targetUrl.includes('?') ? targetUrl.split('?')[1] : '';
    const nowMatches = req.headers?.['x-now-route-matches'];
    if (nowMatches && typeof nowMatches === 'string') {
      const match = new URLSearchParams(nowMatches).get('1') || new URLSearchParams(nowMatches).get('match');
      if (match) {
        targetUrl = `/api/${match.replace(/^\/+/, '')}`;
      }
    } else if (searchPart) {
      const match = new URLSearchParams(searchPart).get('1') || new URLSearchParams(searchPart).get('match');
      if (match) {
        targetUrl = `/api/${match.replace(/^\/+/, '')}`;
      }
    }
  }

  if (!targetUrl.startsWith('/api') && !targetUrl.startsWith('/r2') && !targetUrl.startsWith('/gemini') && !targetUrl.startsWith('/email')) {
    targetUrl = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
  }

  req.url = targetUrl;

  // Wrap Express dispatch in a Promise so Vercel Serverless Function waits for completion
  return new Promise((resolve) => {
    res.on('finish', () => resolve(undefined));
    res.on('close', () => resolve(undefined));

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error('[Vercel Handler Error]:', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: err?.message || 'Server handler error' });
          }
        } else if (!res.headersSent) {
          res.status(404).json({ success: false, error: 'Endpoint not found', path: req.url });
        }
        resolve(undefined);
      });
    } catch (e: any) {
      console.error('[Vercel Handler Exception]:', e);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: e?.message || 'Internal invocation exception' });
      }
      resolve(undefined);
    }
  });
}

