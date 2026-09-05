import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  FileText,
  ShieldCheck,
  Calendar,
  DollarSign,
  HardDrive,
  X,
  ExternalLink,
  Clock,
  Sparkles,
  Inbox,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { emailService, EmailStatusResponse, EmailLog } from '../../services/emailService';

export const TransactionalEmailSection: React.FC = () => {
  const {
    workLogs,
    transactions,
    calculatedHoldings,
    investmentAssets,
    userSettings,
    addToast
  } = useData();
  const { profile, user } = useAuth();

  const [status, setStatus] = useState<EmailStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [customRecipient, setCustomRecipient] = useState('datminh96@gmail.com');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<
    | 'account_verification'
    | 'password_recovery'
    | 'financial_summary'
    | 'backup_success'
    | 'budget_alert'
    | 'work_hours_statement'
    | 'security_alert'
  >('account_verification');

  // Calculate dynamic data from current app state
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Financial Stats
  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.transaction_date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = currentMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? `${Math.max(0, Math.round((balance / totalIncome) * 100))}%` : '50%';
  const investValue = calculatedHoldings.reduce((sum, h) => sum + h.current_value, 0) || 185000000;

  // Work Stats
  const currentMonthLogs = workLogs.filter(l => {
    const d = new Date(l.work_date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });
  const totalWorkDays = currentMonthLogs.length || 22;
  const totalWorkHours = currentMonthLogs.reduce((sum, l) => sum + (l.actual_work_hours || 8), 0) || 176;
  const totalOtHours = currentMonthLogs.reduce((sum, l) => sum + (l.overtime_hours || 0), 0) || 8.5;

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await emailService.getStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to load email status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await emailService.getLogs();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load email logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, []);

  const getTemplatePayloadData = (tmpl: string) => {
    const recipientName = profile?.full_name || 'Nguyễn Lê Đạt Minh';
    const targetEmail = customRecipient || user?.email || 'datminh96@gmail.com';
    switch (tmpl) {
      case 'account_verification':
        return {
          recipientName,
          email: targetEmail,
          code: '482910',
          expireMinutes: 15,
        };
      case 'password_recovery':
        return {
          recipientName,
          email: targetEmail,
          code: '719354',
          expireMinutes: 15,
          requestTime: new Date().toLocaleString('vi-VN'),
        };
      case 'financial_summary':
        return {
          recipientName,
          month: currentMonth,
          year: currentYear,
          totalIncome,
          totalExpense,
          balance,
          savingRate,
          investValue,
        };
      case 'backup_success':
        return {
          recipientName,
          backupTime: new Date().toLocaleString('vi-VN'),
          backupSize: '128.4 KB',
          recordCount: workLogs.length + transactions.length + investmentAssets.length,
          bucketName: 'minhnld2',
          fileKey: `backups/backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
        };
      case 'budget_alert':
        return {
          recipientName,
          month: currentMonth,
          limit: 15000000,
          spent: totalExpense || 13800000,
          percentage: '92%',
          category: 'Chi tiêu sinh hoạt & Tiêu dùng',
        };
      case 'work_hours_statement':
        return {
          recipientName,
          month: currentMonth,
          totalDays: totalWorkDays,
          totalHours: totalWorkHours,
          otHours: totalOtHours,
          estimatedSalary: 25000000,
        };
      case 'security_alert':
        return {
          recipientName,
          eventTime: new Date().toLocaleString('vi-VN'),
          eventType: 'Đăng nhập trang quản trị Admin / Đồng bộ dữ liệu',
          ipAddress: '14.232.18.92',
          userAgent: 'Chrome trên Windows (AI Studio Cloud)',
        };
      default:
        return {};
    }
  };

  const handleSendEmail = async (templateName: any) => {
    const targetEmail = customRecipient.trim() || 'datminh96@gmail.com';
    setSendingTemplate(templateName);
    try {
      const payloadData = getTemplatePayloadData(templateName);
      const res = await emailService.sendEmail({
        template: templateName,
        to: targetEmail,
        data: payloadData,
      });

      if (res.success) {
        addToast(
          `Đã gửi Transactional Email "${res.subject}" tới ${targetEmail} thành công! [${res.provider.toUpperCase()}]`,
          'success'
        );
        loadLogs();
      } else {
        addToast(`Gửi email không thành công: ${res.error || 'Lỗi server'}`, 'error');
      }
    } catch (err: any) {
      addToast(`Lỗi khi gửi email: ${err.message || String(err)}`, 'error');
    } finally {
      setSendingTemplate(null);
    }
  };

  const handlePreview = async (templateName: any) => {
    setLoadingPreview(true);
    setPreviewTemplate(templateName);
    try {
      const payloadData = getTemplatePayloadData(templateName);
      const res = await emailService.previewEmail({
        template: templateName,
        data: payloadData,
      });

      if (res.success) {
        setPreviewHtml(res.html);
        setPreviewSubject(res.subject);
      }
    } catch (err: any) {
      addToast(`Lỗi khi tạo bản xem trước: ${err.message || String(err)}`, 'error');
      setPreviewTemplate(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const templatesList = [
    {
      id: 'account_verification' as const,
      title: 'Xác Thực Tài Khoản Đăng Ký (OTP)',
      desc: 'Email kích hoạt tài khoản kèm mã OTP 6 số và hướng dẫn bảo mật khi người dùng vừa đăng ký.',
      icon: UserCheck,
      color: 'emerald',
      badge: 'Đăng Ký & Kích Hoạt',
    },
    {
      id: 'password_recovery' as const,
      title: 'Khôi Phục Mật Khẩu & Đặt Lại OTP',
      desc: 'Email cấp mã OTP đặt lại mật khẩu an toàn khi người dùng yêu cầu khôi phục tài khoản.',
      icon: KeyRound,
      color: 'blue',
      badge: 'Khôi Phục Mật Khẩu',
    },
    {
      id: 'financial_summary' as const,
      title: 'Báo Cáo Thu Chi & Đầu Tư Định Kỳ',
      desc: 'Tổng hợp thu nhập, chi tiêu, thặng dư tích lũy và định giá danh mục đầu tư tháng.',
      icon: DollarSign,
      color: 'emerald',
      badge: 'Báo Cáo Hàng Tháng',
    },
    {
      id: 'backup_success' as const,
      title: 'Xác Nhận Sao Lưu Cloudflare R2',
      desc: 'Thông báo xác nhận khi gói dữ liệu hoàn tất sao lưu lên R2 Bucket minhnld2 an toàn.',
      icon: HardDrive,
      color: 'sky',
      badge: 'Sao Lưu & Khôi Phục',
    },
    {
      id: 'budget_alert' as const,
      title: 'Cảnh Báo Vượt Hạn Mức Chi Tiêu',
      desc: 'Cảnh báo tức thì khi tỷ lệ chi tiêu trong tháng vượt mốc an toàn 80% - 90%.',
      icon: AlertTriangle,
      color: 'amber',
      badge: 'Cảnh Báo Ngân Sách',
    },
    {
      id: 'work_hours_statement' as const,
      title: 'Phiếu Chấm Công & Giờ Làm Việc',
      desc: 'Tổng kết chi tiết ngày công thực tế, tổng giờ chuẩn và giờ tăng ca (OT).',
      icon: Calendar,
      color: 'indigo',
      badge: 'Chấm Công & Lương',
    },
    {
      id: 'security_alert' as const,
      title: 'Cảnh Báo Bảo Mật & Xác Thực',
      desc: 'Thông báo an ninh khi có phiên đăng nhập từ thiết bị mới hoặc thay đổi mật khẩu.',
      icon: ShieldCheck,
      color: 'rose',
      badge: 'Bảo Mật Tài Khoản',
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Transactional Email (Email Giao Dịch Tự Động)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Resend • SMTP • Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gửi email thông báo tự động: Báo cáo tài chính, xác nhận sao lưu R2, cảnh báo chi tiêu & phiếu chấm công
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            loadStatus();
            loadLogs();
          }}
          disabled={loadingStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-blue-500' : ''}`} />
          <span>{loadingStatus ? 'Đang tải...' : 'Làm mới trạng thái'}</span>
        </button>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-500" /> Trạng thái máy chủ
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {status?.mode || 'Simulator / Live Preview'}
          </p>
          <p className="text-[11px] text-slate-400">
            {status?.isResendConfigured
              ? 'Đã kết nối Resend API Key'
              : status?.isSmtpConfigured
              ? 'Đã kết nối SMTP Transporter'
              : 'Sẵn sàng gửi & mô phỏng HTML'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-emerald-500" /> Người gửi mặc định
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white font-mono truncate">
            {status?.emailFrom || 'Personal Finance <onboarding@resend.dev>'}
          </p>
          <p className="text-[11px] text-slate-400">Cấu hình qua biến EMAIL_FROM</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Người nhận Admin
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              Admin
            </span>
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
            datminh96@gmail.com
          </p>
          <p className="text-[11px] text-slate-400">Nguyễn Lê Đạt Minh</p>
        </div>
      </div>

      {/* Recipient Target Input */}
      <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
            Địa chỉ Email nhận thử nghiệm:
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Mặc định là tài khoản quản trị <strong className="text-slate-700 dark:text-slate-200">datminh96@gmail.com</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="email"
            value={customRecipient}
            onChange={(e) => setCustomRecipient(e.target.value)}
            placeholder="datminh96@gmail.com"
            className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setCustomRecipient('datminh96@gmail.com')}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Mặc định
          </button>
        </div>
      </div>

      {/* Interactive Templates Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            Danh Sách Mẫu Transactional Email Sẵn Sàng Gửi
          </h4>
          <span className="text-[11px] text-slate-400">5 Mẫu chuẩn HTML Responsive</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templatesList.map((item) => {
            const IconComponent = item.icon;
            const isSending = sendingTemplate === item.id;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-xs text-blue-600 dark:text-blue-400 border border-slate-200/60 dark:border-slate-700">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handlePreview(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span>Xem mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEmail(item.id)}
                    disabled={isSending}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                    <span>{isSending ? 'Đang gửi...' : 'Gửi ngay'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sent Logs Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Lịch sử Transactional Email đã gửi ({logs.length})
          </span>
          <button
            type="button"
            onClick={loadLogs}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Làm mới lịch sử
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-center text-slate-400 text-xs">
            Chưa có bản ghi email nào trong phiên này. Nhấn nút <strong>"Gửi ngay"</strong> ở bất kỳ mẫu nào phía trên để thử nghiệm gửi Transactional Email.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {logs.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.subject}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        item.status === 'sent'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {item.status.toUpperCase()} • {item.provider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tới: <strong className="text-slate-600 dark:text-slate-300 font-mono">{item.to}</strong> •{' '}
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HTML Email Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    Xem Trước Bản Email HTML Giao Dịch
                  </h4>
                  <p className="text-xs text-slate-400 truncate max-w-md">{previewSubject}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: HTML Preview Frame */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-slate-950">
              {loadingPreview ? (
                <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Đang dựng mã HTML Email...</span>
                </div>
              ) : (
                <iframe
                  title="Transactional Email Preview"
                  srcDoc={previewHtml}
                  className="w-full min-h-[500px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Gửi tới: <strong className="font-mono text-slate-700 dark:text-slate-200">{customRecipient}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendEmail(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Thử Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
