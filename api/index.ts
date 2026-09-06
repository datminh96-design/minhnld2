import startServer from '../server';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await startServer();
    }
    return cachedApp(req, res);
  } catch (error) {
    console.error('Error initializing server:', error);
    res.status(500).json({ error: 'Internal Server Error during init', details: String(error) });
  }
}


