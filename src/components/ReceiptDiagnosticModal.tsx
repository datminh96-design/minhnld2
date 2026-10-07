import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Server,
  FileCode,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { receiptDiagnosticLogger, DiagnosticLogEntry } from '../utils/receiptDiagnosticLogger';

interface ReceiptDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptDiagnosticModal: React.FC<ReceiptDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => receiptDiagnosticLogger.getLogs());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(() => logs[0]?.id || null);
  const [copied, setCopied] = useState(false);

  const refreshLogs = () => {
    const updated = receiptDiagnosticLogger.getLogs();
    setLogs(updated);
    if (updated.length > 0 && (!selectedLogId || !updated.some((l) => l.id === selectedLogId))) {
      setSelectedLogId(updated[0].id);
    }
  };

  const clearAllLogs = () => {
    receiptDiagnosticLogger.clearLogs();
    setLogs([]);
    setSelectedLogId(null);
  };

  const handleCopyReport = () => {
    const report = receiptDiagnosticLogger.exportReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔬 Nhật Ký Chẩn Đoán OCR (Diagnostic Logging Utility)"
      subtitle="Theo dõi chi tiết chu kỳ Request/Response, Headers, Payload & Môi trường để debug lỗi trên Vercel"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Tổng số phiên ghi nhận: {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={refreshLogs}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold border border-slate-300 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép Báo cáo (JSON)'}</span>
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={clearAllLogs}
                className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold cursor-pointer"
                title="Xóa nhật ký"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-400 animate-pulse" />
            <p className="font-bold text-slate-700 dark:text-slate-300">Chưa có phiên quét OCR nào được ghi nhận</p>
            <p className="text-slate-500 text-[11px]">
              Hãy thực hiện quét một hóa đơn hoặc biên lai để hệ thống tự động ghi nhật ký Request/Response chu kỳ đầy đủ.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Left Sidebar: Session List */}
            <div className="md:col-span-1 space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => {
                const isSelected = log.id === selectedLog?.id;
                const isSuccess = log.response?.success;
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="capitalize">{log.type === 'expense' ? 'Chi Tiêu' : 'Đầu Tư'}</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          log.environment.isVercel
                            ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        {log.environment.isVercel ? 'Vercel' : 'AI Studio'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                      <span>{log.response?.durationMs ? `${log.response.durationMs}ms` : '---'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Detailed Session Inspector */}
            {selectedLog && (
              <div className="md:col-span-2 space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                {/* Diagnosis Summary Card */}
                {selectedLog.diagnosis && (
                  <div
                    className={`p-3 rounded-xl border space-y-1.5 ${
                      selectedLog.diagnosis.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {selectedLog.diagnosis.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>Đánh Giá Tự Động: {selectedLog.diagnosis.summary}</span>
                    </div>
                    {selectedLog.diagnosis.recommendations.length > 0 && (
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90">
                        {selectedLog.diagnosis.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Environment Specs */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Môi Trường & Thiết Bị (Client Environment):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400">Host: </span>
                      <strong>{selectedLog.environment.hostname}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Nền tảng: </span>
                      <strong>
                        {selectedLog.environment.isVercel
                          ? 'Vercel Production'
                          : selectedLog.environment.isAiStudio
                          ? 'Google AI Studio Preview'
                          : 'Localhost'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Request Specs */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                    <Server className="w-3.5 h-3.5 text-purple-500" />
                    <span>Chi Tiết Request (Gửi Đi):</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400">Endpoint: </span>
                      <span className="text-purple-600 font-bold">{selectedLog.request.endpoint}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-slate-400">Dung lượng Payload: </span>
                        <strong>{selectedLog.request.payloadSummary.estimatedSizeKB} KB</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Model mục tiêu: </span>
                        <strong>{selectedLog.request.payloadSummary.requestedModel}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">MIME Type: </span>
                        <strong>{selectedLog.request.payloadSummary.mimeType}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">API Key: </span>
                        <strong>
                          {selectedLog.request.payloadSummary.hasCustomApiKey
                            ? `Khóa tuỳ chỉnh (${selectedLog.request.payloadSummary.maskedApiKey})`
                            : 'Biến môi trường Vercel/Server'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Specs */}
                {selectedLog.response && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Kết Quả Phản Hồi (Response):</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400">HTTP Status: </span>
                          <span
                            className={`font-bold ${
                              selectedLog.response.status === 200 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {selectedLog.response.status} ({selectedLog.response.statusText})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Độ trễ: </span>
                          <strong>{selectedLog.response.durationMs} ms</strong>
                        </div>
                      </div>
                      {selectedLog.response.usedModel && (
                        <div>
                          <span className="text-slate-400">Model xử lý thực tế: </span>
                          <strong>{selectedLog.response.usedModel}</strong>
                        </div>
                      )}
                      {selectedLog.response.extractedSummary && (
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300">
                          <span className="text-slate-400">Dữ liệu trích xuất: </span>
                          <span>{selectedLog.response.extractedSummary}</span>
                        </div>
                      )}
                      {selectedLog.response.error && (
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                          <span className="text-slate-400">Chi tiết lỗi: </span>
                          <span>{selectedLog.response.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Retries list if any */}
                {selectedLog.retries.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-amber-600">
                      Lịch sử Exponential Backoff ({selectedLog.retries.length} lần thử lại):
                    </span>
                    <div className="space-y-1">
                      {selectedLog.retries.map((r, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-mono text-amber-800 dark:text-amber-200"
                        >
                          Lần #{r.attempt} (Chờ {r.delayMs}ms): {r.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
