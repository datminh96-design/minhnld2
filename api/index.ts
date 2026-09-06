import startServer from '../server';

let cachedApp: any = null;
let serverPromise: Promise<any> | null = null;

export default function handler(req: any, res: any) {
  if (cachedApp) {
    return cachedApp(req, res);
  }

  if (!serverPromise) {
    serverPromise = startServer()
      .then((app) => {
        cachedApp = app;
        return app;
      })
      .catch((err) => {
        console.error('Failed to initialize server:', err);
        serverPromise = null;
        res.status(500).json({ error: 'Server initialization failed' });
        return null;
      });
  }

  serverPromise.then((app) => {
    if (app) {
      app(req, res);
    }
  });
}
