import { app } from '../server.ts';

export default function handler(req: any, res: any) {
  // Ensure url starts with /api if rewritten without it
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
