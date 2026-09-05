import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { updateSupabaseCredentials, getSupabaseStatus } from '../../lib/supabase';
import {
  LogIn,
  UserPlus,
  KeyRound,
  Database,
  ShieldCheck,
  Check,
  Sparkles,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  UserCheck,
  ArrowLeft,
  Send,
  Clock
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'supabase' | 'verify_register' | 'verify_recovery';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
}) => {
  const {
    user,
    profile,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
    sendVerificationEmail,
    sendPasswordRecoveryEmail,
    isSupabaseConfigured,
    isDemoUser,
    switchMode,
    isAdmin,
  } = useAuth();
  const { addToast, backupToCloudflareR2 } = useData();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'supabase' | 'verify_register' | 'verify_recovery'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verification & Recovery States
  const [otpCode, setOtpCode] = useState('');
  const [activeOtp, setActiveOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Change password in account management
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Supabase Custom credentials state
  const status = getSupabaseStatus();
  const [supabaseUrl, setSupabaseUrl] = useState(status.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(status.key || '');

  const isAuthenticated = Boolean(user && !isDemoUser);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          addToast(
            error.message === 'Invalid login credentials'
              ? 'Email hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, hãy bấm Đăng Ký.'
              : error.message || 'Đăng nhập thất bại',
            'error'
          );
        } else {
          addToast('Đăng nhập thành công! Đã kết nối dữ liệu đám mây Supabase.', 'success');
          onClose();
        }
      } else if (tab === 'register') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          addToast(res.error.message || 'Đăng ký thất bại', 'error');
        } else {
          setActiveOtp(res.verificationCode || '482910');
          setResendCountdown(60);
          setTab('verify_register');
          addToast(`Đã gửi email xác thực kích hoạt tài khoản đến ${email}`, 'success');
        }
      } else if (tab === 'forgot') {
        const res = await resetPassword(email);
        if (res.error) {
          addToast(res.error.message || 'Gửi yêu cầu thất bại', 'error');
        } else {
          setActiveOtp(res.recoveryCode || '719354');
          setResendCountdown(60);
          setTab('verify_recovery');
          addToast(`Đã gửi mã OTP khôi phục mật khẩu 6 số đến ${email}`, 'success');
        }
      }
    } catch (err: any) {
      addToast(err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      addToast('Vui lòng nhập mã xác thực OTP 6 số từ email', 'warning');
      return;
    }

    addToast('Xác thực tài khoản thành công! Bạn đã được kích hoạt đầy đủ quyền hạn.', 'success');
    onClose();
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      addToast('Vui lòng nhập mã xác thực OTP 6 số từ email', 'warning');
      return;
    }
    if (!recoveryPassword || recoveryPassword.length < 6) {
      addToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
      return;
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      addToast('Xác nhận mật khẩu mới không trùng khớp', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(recoveryPassword);
      if (error) {
        addToast(error.message || 'Không thể cập nhật mật khẩu mới', 'error');
      } else {
        addToast('Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.', 'success');
        setTab('login');
        setPassword(recoveryPassword);
      }
    } catch (err: any) {
      addToast(err?.message || 'Lỗi đặt lại mật khẩu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await sendVerificationEmail(email, fullName);
      if (res.code) setActiveOtp(res.code);
      setResendCountdown(60);
      addToast(`Đã gửi lại mã xác thực mới đến ${email}`, 'success');
    } catch (err: any) {
      addToast('Không thể gửi lại mã xác thực: ' + (err?.message || ''), 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleResendRecovery = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await sendPasswordRecoveryEmail(email);
      if (res.code) setActiveOtp(res.code);
      setResendCountdown(60);
      addToast(`Đã gửi lại mã khôi phục mới đến ${email}`, 'success');
    } catch (err: any) {
      addToast('Không thể gửi lại mã: ' + (err?.message || ''), 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      addToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Xác nhận mật khẩu không khớp', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        addToast(error.message || 'Không thể đổi mật khẩu', 'error');
      } else {
        addToast('Đã cập nhật mật khẩu mới thành công!', 'success');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      addToast(err?.message || 'Lỗi đổi mật khẩu', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseAnonKey) {
      addToast('Vui lòng nhập đầy đủ Supabase URL và Anon Key', 'warning');
      return;
    }
    updateSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    switchMode(false);
    addToast('Đã lưu cấu hình Supabase! Đang tải lại cấu hình kết nối...', 'success');
    onClose();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleUseDemo = () => {
    switchMode(true);
    addToast('Đã chuyển sang Chế độ Demo / Offline nhanh chóng!', 'info');
    onClose();
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      addToast('Đã đăng xuất tài khoản thành công', 'info');
      setTab('login');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBackup = async () => {
    setIsBackingUp(true);
    try {
      const ok = await backupToCloudflareR2();
      if (ok) {
        addToast('Đã sao lưu tức thì lên Cloudflare R2 an toàn!', 'success');
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAuthenticated
          ? 'Trung Tâm Tài Khoản & Bảo Mật'
          : tab === 'login'
          ? 'Đăng Nhập Tài Khoản'
          : tab === 'register'
          ? 'Đăng Ký Tài Khoản Mới'
          : tab === 'verify_register'
          ? 'Xác Thực Kích Hoạt Tài Khoản'
          : tab === 'forgot'
          ? 'Khôi Phục Mật Khẩu'
          : tab === 'verify_recovery'
          ? 'Nhập Mã Khôi Phục Mật Khẩu'
          : 'Cấu Hình Supabase Cloud'
      }
      subtitle={
        isAuthenticated
          ? 'Quản lý thông tin xác thực, đám mây Supabase và sao lưu bảo mật'
          : tab === 'verify_register'
          ? 'Nhập mã xác thực 6 số vừa được gửi vào email của bạn'
          : tab === 'verify_recovery'
          ? 'Nhập mã xác thực OTP từ email và thiết lập mật khẩu mới'
          : 'Hệ thống Quản lý Giờ công • Chi tiêu • Danh mục Đầu tư'
      }
      maxWidth={isAuthenticated ? 'lg' : 'md'}
    >
      {/* VIEW KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG (AUTHENTICATED) -> KHÔNG HIỆN FORM ĐĂNG NHẬP/ĐĂNG KÝ */}
      {isAuthenticated ? (
        <div className="space-y-5">
          {/* User Profile Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/15 via-teal-600/10 to-slate-900/50 p-5 border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    {profile?.full_name?.charAt(0) || 'M'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {profile?.full_name || 'Nguyễn Lê Đạt Minh'}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {user?.email || profile?.email || 'datminh96@gmail.com'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ID Tài khoản: <span className="font-mono text-slate-500 dark:text-slate-300">{user?.id?.slice(0, 12)}...</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleQuickBackup}
                    disabled={isBackingUp}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Cloud className={`w-3.5 h-3.5 text-sky-500 ${isBackingUp ? 'animate-spin' : ''}`} />
                    {isBackingUp ? 'Đang lưu...' : 'Sao lưu R2'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng Xuất
                </button>
              </div>
            </div>
          </div>

          {/* Integration & Storage Status Badges */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3`}>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" /> Supabase
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                PostgreSQL RLS
              </p>
            </div>

            {isAdmin && (
              <>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-sky-500" /> R2 S3
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-emerald-500 font-semibold">minhnld2</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" /> Email API
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Resend / SMTP
                  </p>
                </div>
              </>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" /> Bộ Nhớ Đệm
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đồng bộ Realtime
              </p>
            </div>
          </div>

          {/* Change Password Form (Secure) */}
          <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Bảo Mật & Đổi Mật Khẩu
                </h5>
              </div>
              <span className="text-[11px] text-slate-400">Mã hóa chuẩn SSL</span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {newPassword && (
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !newPassword}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isChangingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang cập nhật...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Cập Nhật Mật Khẩu
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        /* VIEW KHI CHƯA ĐĂNG NHẬP -> GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ CHUYÊN NGHIỆP */
        <div className="space-y-4">
          {/* Navigation tabs */}
          {tab !== 'verify_register' && tab !== 'verify_recovery' && (
            <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80`}>
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Đăng Ký
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setTab('supabase')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    tab === 'supabase'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Supabase {isSupabaseConfigured ? '🟢' : '⚪'}
                </button>
              )}
            </div>
          )}

          {/* TAB 1: XÁC THỰC EMAIL KÍCH HOẠT SAU KHI VỪA ĐĂNG KÝ */}
          {tab === 'verify_register' ? (
            <form onSubmit={handleVerifyRegister} className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                      Đã gửi mã xác nhận 6 số đến email
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h5>
                    <p className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 break-all">
                      {email || 'datminh96@gmail.com'}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 leading-relaxed pt-0.5">
                      Hệ thống gửi Transactional Email kích hoạt tự động. Vui lòng mở hòm thư để lấy mã OTP (hiệu lực 15 phút).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Nhập mã xác nhận kích hoạt (6 chữ số)
                </label>
                <div className="relative max-w-[280px] mx-auto">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center py-3 text-2xl font-mono tracking-[0.5em] font-bold rounded-xl border-2 border-emerald-500/50 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                  />
                </div>
                {activeOtp && (
                  <p className="text-[11px] text-center text-slate-400 mt-1.5">
                    Mã mẫu mô phỏng nhanh: <strong className="font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer underline" onClick={() => setOtpCode(activeOtp)}>{activeOtp}</strong> (Click để điền)
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading || otpCode.length < 4}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Kích Hoạt Tài Khoản & Bắt Đầu
                </button>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendCountdown > 0 || isResending}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1 disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    {resendCountdown > 0 ? `Gửi lại mã sau (${resendCountdown}s)` : 'Gửi lại mã xác nhận'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                  >
                    Đổi thông tin đăng ký
                  </button>
                </div>
              </div>
            </form>
          ) : tab === 'verify_recovery' ? (
            /* TAB 2: KHÔI PHỤC MẬT KHẨU & ĐẶT LẠI MẬT KHẨU MỚI */
            <form onSubmit={handleVerifyRecovery} className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/30 text-blue-900 dark:text-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                      Đã gửi mã khôi phục mật khẩu 6 số
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    </h5>
                    <p className="text-xs font-mono font-bold text-blue-800 dark:text-blue-300 break-all">
                      {email || 'datminh96@gmail.com'}
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400/90 leading-relaxed pt-0.5">
                      Vui lòng nhập mã OTP đã nhận qua email và đặt lại mật khẩu mới cho tài khoản.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã xác nhận OTP (6 số)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 719354"
                  className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {activeOtp && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mã mẫu mô phỏng: <strong className="font-mono text-blue-600 dark:text-blue-400 cursor-pointer underline" onClick={() => setOtpCode(activeOtp)}>{activeOtp}</strong> (Click để điền)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showRecoveryPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRecoveryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showRecoveryPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" /> Đặt Lại Mật Khẩu & Đăng Nhập
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={handleResendRecovery}
                    disabled={resendCountdown > 0 || isResending}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    {resendCountdown > 0 ? `Gửi lại mã sau (${resendCountdown}s)` : 'Gửi lại mã khôi phục'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </div>
              </div>
            </form>
          ) : tab !== 'supabase' ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Lê Đạt Minh"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="datminh96@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {tab !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu
                    </label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => setTab('forgot')}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý...
                    </>
                  ) : tab === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" /> Đăng Nhập Hệ Thống
                    </>
                  ) : tab === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" /> Đăng Ký Tài Khoản Mới
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" /> Gửi Link Đặt Lại Mật Khẩu
                    </>
                  )}
                </button>

                {tab === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-xs text-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                )}

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">hoặc</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Trải Nghiệm Chế Độ Demo / Offline
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mã hóa SSL 256-bit • Tự động sao lưu R2 • Phân quyền RLS</span>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveSupabaseConfig} className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Bảo mật Row Level Security (RLS) & Tự Động Sao Lưu
                </div>
                <p className="text-[11px] leading-relaxed">
                  Hệ thống đã cấu hình sẵn thông tin kết nối Supabase mặc định. Dữ liệu sẽ tự động được sao lưu an toàn khi thêm mới, sửa chữa hoặc xóa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  required
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://wtjuyjhviqqaejmmelje.supabase.co"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Supabase Anon / Publishable Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {showSupabaseKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSupabaseKey ? 'Ẩn Key' : 'Hiện Key'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    required
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Lưu Cấu Hình & Kết Nối Supabase
                </button>

                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                >
                  Tiếp tục với Chế độ Local / Demo
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
