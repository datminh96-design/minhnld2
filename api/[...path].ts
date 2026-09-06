import { handleApiRequest } from '../src/lib/apiHandler.ts';
import { app } from '../server.ts';

export default async function handler(req: any, res: any) {
  try {
    const handled = await handleApiRequest(req, res);
    if (handled) return;

    // Delegate to Express app
    return new Promise((resolve) => {
      res.on('finish', () => resolve(undefined));
      res.on('close', () => resolve(undefined));
      app(req, res, (err: any) => {
        if (err) {
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: err?.message || 'Server error' });
          }
        } else if (!res.headersSent) {
          res.status(404).json({ success: false, error: 'Endpoint not found', path: req.url });
        }
        resolve(undefined);
      });
    });
  } catch (err: any) {
    console.error('[API Handler Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
    }
  }
}
