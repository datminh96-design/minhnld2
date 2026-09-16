import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Save,
  Key,
  Lock,
  Globe,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';
import { payosClient, PayOSStatusResponse } from '../../lib/payosClient';
import { PayOSModal } from '../payment/PayOSModal';
import { useData } from '../../context/DataContext';

export const PayOSSection: React.FC = () => {
  const { addToast } = useData();
  const [status, setStatus] = useState<PayOSStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [showTestModal, setShowTestModal] = useState<boolean>(false);

  // Form edit state
  const [clientId, setClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('personal_finance_payos_keys');
      if (saved) return JSON.parse(saved).clientId || '23a0f8b7-488b-4e8f-ade7-470dd0d51027';
    } catch {}
    return '23a0f8b7-488b-4e8f-ade7-470dd0d51027';
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('personal_finance_payos_keys');
      if (saved) return JSON.parse(saved).apiKey || '9ca106c4-8a7f-4a99-952f-8116f70c42b3';
    } catch {}
    return '9ca106c4-8a7f-4a99-952f-8116f70c42b3';
  });
  const [checksumKey, setChecksumKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('personal_finance_payos_keys');
      if (saved) return JSON.parse(saved).checksumKey || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7';
    } catch {}
    return 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7';
  });
  const [showKeys, setShowKeys] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [webhookConfirmedData, setWebhookConfirmedData] = useState<any>(null);

  const defaultWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/payos/webhook`
    : 'https://ais-pre-vc2mudksye5gqgfzicn22t-115346028144.asia-east1.run.app/api/payos/webhook';

  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>(defaultWebhookUrl);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const res = await payosClient.getStatus();
      setStatus(res);
    } catch (e: any) {
      console.warn('Lỗi tải trạng thái PayOS:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !apiKey.trim() || !checksumKey.trim()) {
      addToast('Vui lòng nhập đầy đủ Client ID, API Key và Checksum Key', 'error');
      return;
    }

    setIsSaving(true);
    try {
      try {
        localStorage.setItem('personal_finance_payos_keys', JSON.stringify({
          clientId: clientId.trim(),
          apiKey: apiKey.trim(),
          checksumKey: checksumKey.trim(),
        }));
      } catch {}

      await payosClient.updateConfig({
        clientId: clientId.trim(),
        apiKey: apiKey.trim(),
        checksumKey: checksumKey.trim(),
      });
      addToast('Đã lưu cấu hình khóa bảo mật PayOS thành công!', 'success');
      loadStatus();
    } catch (err: any) {
      addToast(err?.message || 'Lỗi khi lưu cấu hình PayOS', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(customWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    addToast('Đã sao chép đường dẫn Webhook URL', 'success');
  };

  const handleConfirmWebhook = async () => {
    if (!customWebhookUrl.trim() || !customWebhookUrl.startsWith('http')) {
      addToast('Vui lòng nhập đường dẫn Webhook URL hợp lệ (bắt đầu bằng https://)', 'error');
      return;
    }

    setIsTestingWebhook(true);
    try {
      const result = await payosClient.confirmWebhook(customWebhookUrl.trim(), {
        clientId: clientId.trim(),
        apiKey: apiKey.trim(),
        checksumKey: checksumKey.trim(),
      });
      setWebhookConfirmedData(result.data || result);
      addToast('Đã kết nối và xác nhận Webhook thành công với PayOS!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Không thể xác nhận webhook với PayOS.', 'error');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-blue-200/80 dark:border-blue-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cổng Thanh Toán PayOS (VietQR)
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                Đang Hoạt Động (24/7)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              Hệ thống tạo mã VietQR Napas247 động, tự động nhận diện thanh toán từ mọi ứng dụng ngân hàng và ví điện tử không độ trễ.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTestModal(true)}
          className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Thử Tạo Mã VietQR Ngay</span>
        </button>
      </div>

      {/* Configuration Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Khóa API & Thông Tin Xác Thực (Credentials)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowKeys(!showKeys)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {showKeys ? 'Ẩn khóa bảo mật' : 'Hiển thị khóa bảo mật'}
          </button>
        </div>

        <form onSubmit={handleSaveKeys} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client ID
              </label>
              <div className="relative">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="23a0f8b7-488b-4e8f-ade7-470dd0d51027"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="9ca106c4-8a7f-4a99-952f-8116f70c42b3"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Checksum Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checksum Key
              </label>
              <div className="relative">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={checksumKey}
                  onChange={(e) => setChecksumKey(e.target.value)}
                  placeholder="f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Cập Nhật Thông Tin PayOS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Webhook & Realtime Notification Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Cấu Hình Webhook Tự Động Nhận Tiền
            </h4>
          </div>
          {webhookConfirmedData && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3 h-3" />
              Đã xác nhận với PayOS
            </span>
          )}
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Nhập đường dẫn Webhook URL bên dưới và bấm <strong>Xác nhận Webhook</strong> để hệ thống tự động đăng ký với PayOS, hoặc dán URL này vào mục <strong>Webhook URL</strong> trên trang quản trị <a href="https://my.payos.vn" target="_blank" rel="noreferrer" className="text-blue-500 underline font-medium">PayOS Dashboard</a>:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={customWebhookUrl}
            onChange={(e) => setCustomWebhookUrl(e.target.value)}
            placeholder="https://your-domain.com/api/payos/webhook"
            className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>Sao chép</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmWebhook}
              disabled={isTestingWebhook}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              {isTestingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Xác nhận Webhook</span>
            </button>
          </div>
        </div>

        {webhookConfirmedData && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Xác nhận thành công với tài khoản PayOS:</span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 pl-5">
              {webhookConfirmedData.accountName && (
                <div>Chủ tài khoản: <strong>{webhookConfirmedData.accountName}</strong> ({webhookConfirmedData.shortName || 'Ngân hàng'}) - STK: <strong>{webhookConfirmedData.accountNumber}</strong></div>
              )}
              {webhookConfirmedData.webhookUrl && (
                <div className="truncate text-slate-500 dark:text-slate-400 mt-0.5">URL đã duyệt: {webhookConfirmedData.webhookUrl}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test PayOS VietQR Modal */}
      <PayOSModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        defaultAmount={50000}
        defaultDescription="Gui tien cho Nguyen Le Dat Minh"
      />
    </div>
  );
};
