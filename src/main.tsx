import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://ba550d0228ea7f7619f8caa0c1cea902@o4512033736753152.ingest.us.sentry.io/4512033751171072';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Tracing
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'production',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-semibold text-white">Đã xảy ra lỗi không mong muốn</h2>
            <p className="text-sm text-slate-400">
              Sự cố đã được ghi nhận tự động vào hệ thống giám sát Sentry để đội ngũ kỹ thuật xử lý.
            </p>
            {error && (
              <pre className="text-xs bg-slate-950 p-3 rounded-lg text-red-300 text-left overflow-auto max-h-32 border border-slate-800">
                {String(error.message || error)}
              </pre>
            )}
            <button
              onClick={() => resetError()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-900/30 text-sm cursor-pointer"
            >
              Thử tải lại giao diện
            </button>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

