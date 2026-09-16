import * as React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

// Tùy chỉnh Sentry DSN thông qua biến môi trường hoặc cấu hình an toàn
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE || 'production',
      ignoreErrors: [
        'Cross-origin script load denied',
        'Script error',
        'Script error.',
        'ResizeObserver loop completed with undelivered notifications.',
        'ResizeObserver loop limit exceeded',
        'Failed to fetch',
        'Load failed',
        'NetworkError',
        'TypeError: Failed to fetch',
        'TypeError: NetworkError when attempting to fetch resource.',
      ],
      denyUrls: [
        // Bỏ qua các script bên thứ 3 và extension
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
      ],
      beforeSend(event, hint) {
        const error = hint?.originalException;
        const msg = String(event.message || (error && typeof error === 'object' && 'message' in error ? (error as any).message : error) || '');
        if (
          msg.includes('Cross-origin script load denied') ||
          msg.includes('Script error') ||
          msg.includes('ResizeObserver')
        ) {
          return null;
        }
        return event;
      },
    });
  } catch (err) {
    console.warn('Sentry initialization bypassed:', err);
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorMsg = String(error?.message || error || '');
    // Bỏ qua các lỗi script cross-origin hoặc extension không ảnh hưởng đến component React
    if (
      errorMsg.includes('Cross-origin script load denied') ||
      errorMsg.includes('Script error') ||
      errorMsg.includes('ResizeObserver')
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMsg = String(error?.message || error || '');
    if (
      errorMsg.includes('Cross-origin script load denied') ||
      errorMsg.includes('Script error') ||
      errorMsg.includes('ResizeObserver')
    ) {
      return;
    }
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
    if (SENTRY_DSN) {
      Sentry.captureException(error, { extra: errorInfo as any });
    }
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-semibold text-white">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-sm text-slate-400">
              Hệ thống đã tự động ghi nhận và bảo vệ dữ liệu của bạn an toàn.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-950 p-3 rounded-lg text-red-300 text-left overflow-auto max-h-32 border border-slate-800">
                {String(this.state.error.message || this.state.error)}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-900/30 text-sm cursor-pointer"
            >
              Thử tải lại giao diện
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);



