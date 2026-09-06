import { handleApiRequest } from '../src/lib/apiHandler.ts';

export default async function handler(req: any, res: any) {
  try {
    const handled = await handleApiRequest(req, res);
    if (!handled && !res.headersSent) {
      res.status(404).json({ success: false, error: 'R2 endpoint not found' });
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err?.message || 'R2 API error' });
    }
  }
}
