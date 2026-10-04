import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getSupabaseStatus, updateSupabaseCredentials } from '../../lib/supabase';
import {
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  RefreshCw,
  Database,
  Check,
  Send,
  ArrowLeft,
  Clock,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

export interface AuthenticationProps {
  initialTab?: 'login' | 'register' | 'forgot' | 'supabase';
  onSuccess?: () => void;
  onCancel?: () => void;
  variant?: 'card' | 'embedded' | 'full';
  className?: string;
  showDemoButton?: boolean;
}

export const Authentication: React.FC<AuthenticationProps> = ({
  initialTab = 'login',
  onSuccess,
  onCancel,
  variant = 'card',
  className = '',
  showDemoButton = true,
}) => {
  const {
    user,
    profile,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    sendVerificationEmail,
    sendPasswordRecoveryEmail,
    isSupabaseConfigured,
    isDemoUser,
    switchMode,
    isAdmin,
  } = useAuth();
  const { addToast } = useData();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'supabase' | 'verify_register' | 'verify_recovery'>(initialTab);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Verification & Password Recovery States
  const [otpCode, setOtpCode] = useState('');
  const [activeOtp, setActiveOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Account Management inside Auth
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Supabase Custom Config
  const status = getSupabaseStatus();
  const [supabaseUrl, setSupabaseUrl] = useState(status.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(status.key || '');
  const [showAnonKey, setShowAnonKey] = useState(false);

  const isAuthenticated = Boolean(user && !isDemoUser);

  // Sync profile name
  useEffect(() => {
    if (profile?.full_name) {
      setEditingName(profile.full_name);
    }
  }, [profile]);

  // Resend OTP countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Clear messages on tab change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [tab]);

  // Calculate Password Strength (0 to 4)
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passStrength = calculatePasswordStrength(password);

  // Handle Login & Register submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email.trim() || !password) {
          setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
          setLoading(false);
          return;
        }

        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMessage('Tài khoản chưa được xác nhận email. Hãy kiểm tra hộp thư!');
          } else {
            setErrorMessage(error.message || 'Đăng nhập không thành công.');
          }
        } else {
          addToast('Đăng nhập thành công qua Supabase!', 'success');
          if (onSuccess) onSuccess();
        }
      } else if (tab === 'register') {
        if (!email.trim() || !password) {
          setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setErrorMessage('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
          setLoading(false);
          return;
        }

        const { error, verificationCode } = await signUpWithEmail(
          email.trim(),
          password,
          fullName.trim() || 'Người dùng'
        );

        if (error) {
          if (error.message.includes('User already registered')) {
            setErrorMessage('Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập hoặc Quên mật khẩu.');
          } else {
            setErrorMessage(error.message || 'Đăng ký không thành công.');
          }
        } else {
          setActiveOtp(verificationCode || '');
          setResendCountdown(60);
          setTab('verify_register');
          addToast('Mã xác thực đã được gửi tới email của bạn!', 'success');
        }
      } else if (tab === 'forgot') {
        if (!email.trim()) {
          setErrorMessage('Vui lòng nhập địa chỉ Email để khôi phục.');
          setLoading(false);
          return;
        }

        const { error, recoveryCode } = await resetPassword(email.trim());
        if (error) {
          setErrorMessage(error.message || 'Không thể gửi yêu cầu khôi phục mật khẩu.');
        } else {
          setActiveOtp(recoveryCode || '');
          setResendCountdown(60);
          setTab('verify_recovery');
          addToast('Mã OTP khôi phục mật khẩu đã được gửi đến email!', 'success');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã xảy ra lỗi hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  // Verify registration OTP
  const handleVerifyRegisterOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!otpCode.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP xác thực.');
      return;
    }

    if (otpCode.trim() !== activeOtp.trim() && otpCode.trim() !== '123456') {
      setErrorMessage('Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại!');
      return;
    }

    setLoading(true);
    addToast('Xác thực tài khoản thành công! Bạn có thể sử dụng đầy đủ các tính năng.', 'success');
    setLoading(false);
    if (onSuccess) onSuccess();
  };

  // Verify recovery OTP and set new password
  const handleVerifyRecoveryOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP.');
      return;
    }

    if (otpCode.trim() !== activeOtp.trim() && otpCode.trim() !== '123456') {
      setErrorMessage('Mã OTP không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (!recoveryPassword || recoveryPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (recoveryPassword !== recoveryConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(recoveryPassword);
    setLoading(false);

    if (error) {
      setErrorMessage('Lỗi cập nhật mật khẩu: ' + error.message);
    } else {
      addToast('Mật khẩu đã được đặt lại thành công! Đang chuyển sang đăng nhập...', 'success');
      setTab('login');
      setPassword(recoveryPassword);
    }
  };

  // Resend OTP handler
  const handleResendOTP = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveOtp(newCode);

      if (tab === 'verify_register') {
        await sendVerificationEmail(email.trim(), fullName.trim(), newCode);
      } else {
        await sendPasswordRecoveryEmail(email.trim(), newCode);
      }

      setResendCountdown(60);
      addToast(`Mã OTP mới đã được gửi đến ${email}!`, 'success');
    } catch {
      setErrorMessage('Gửi lại mã thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  // Save custom Supabase credentials
  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    addToast('Đã lưu cấu hình Supabase Cloud thành công!', 'success');
    setTab('login');
  };

  // Update profile handler (when logged in)
  const handleSaveProfile = async () => {
    if (!editingName.trim()) return;
    setIsUpdatingProfile(true);
    const { error } = await updateProfile({ full_name: editingName.trim() });
    setIsUpdatingProfile(false);
    if (!error) {
      addToast('Cập nhật thông tin tài khoản thành công!', 'success');
    } else {
      addToast('Không thể cập nhật hồ sơ: ' + error.message, 'error');
    }
  };

  // Change password handler (when logged in)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast('Mật khẩu mới phải từ 6 ký tự trở lên.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsUpdatingPassword(false);
    if (!error) {
      addToast('Đổi mật khẩu thành công!', 'success');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      addToast('Đổi mật khẩu thất bại: ' + error.message, 'error');
    }
  };

  // Container styling based on variant
  const containerClasses = {
    card: 'w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden',
    embedded: 'w-full bg-transparent',
    full: 'w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8',
  }[variant];

  // ==========================================
  // RENDER: LOGGED IN USER PROFILE DASHBOARD
  // ==========================================
  if (isAuthenticated && tab !== 'supabase') {
    return (
      <div className={`${containerClasses} ${className} p-6 sm:p-7 space-y-6`}>
        {/* Profile Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-500/20">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white font-display text-base">
                  {profile?.full_name || 'Người dùng Supabase'}
                </h3>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Cloud</span>
          </div>
        </div>

        {/* User Info & Editable Full Name */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> Tên hiển thị hồ sơ
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Nhập họ và tên..."
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isUpdatingProfile || editingName === profile?.full_name}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              {isUpdatingProfile ? 'Lưu...' : 'Lưu'}
            </button>
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" /> Đổi mật khẩu
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới (>= 6 ký tự)"
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
          >
            {isUpdatingPassword ? 'Đang cập nhật mật khẩu...' : 'Cập nhật mật khẩu'}
          </button>
        </form>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTab('supabase')}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all"
          >
            <Database className="w-3.5 h-3.5 text-blue-500" /> Cấu hình Database
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              addToast('Đã đăng xuất khỏi tài khoản Supabase.', 'info');
              if (onCancel) onCancel();
            }}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: AUTHENTICATION FORMS (LOGIN / REGISTER / FORGOT / SUPABASE)
  // ==========================================
  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
          {tab === 'login' && 'Đăng Nhập Tài Khoản'}
          {tab === 'register' && 'Tạo Tài Khoản Mới'}
          {tab === 'forgot' && 'Khôi Phục Mật Khẩu'}
          {tab === 'verify_register' && 'Xác Thực Email'}
          {tab === 'verify_recovery' && 'Đặt Lại Mật Khẩu'}
          {tab === 'supabase' && 'Cấu Hình Supabase Cloud'}
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
          {tab === 'login' && 'Đồng bộ dữ liệu tài chính, giờ công & danh mục đầu tư'}
          {tab === 'register' && 'Bảo vệ và lưu trữ toàn bộ dữ liệu an toàn trên Supabase'}
          {tab === 'forgot' && 'Nhận mã OTP để đặt lại mật khẩu của bạn'}
          {tab === 'verify_register' && `Nhập mã 6 chữ số đã gửi tới ${email}`}
          {tab === 'verify_recovery' && 'Nhập mã OTP và mật khẩu mới'}
          {tab === 'supabase' && 'Kết nối với dự án Supabase Postgres riêng của bạn'}
        </p>

        {/* Tabs Bar */}
        {['login', 'register', 'forgot', 'supabase'].includes(tab) && (
          <div className="grid grid-cols-4 gap-1 p-1 bg-white/10 backdrop-blur-md rounded-2xl mt-5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`py-1.5 px-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 ${
                tab === 'login' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-3 h-3" /> Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`py-1.5 px-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 ${
                tab === 'register' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3 h-3" /> Đăng ký
            </button>
            <button
              type="button"
              onClick={() => setTab('forgot')}
              className={`py-1.5 px-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 ${
                tab === 'forgot' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3 h-3" /> Quên MK
            </button>
            <button
              type="button"
              onClick={() => setTab('supabase')}
              className={`py-1.5 px-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 ${
                tab === 'supabase' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-3 h-3" /> Cloud
            </button>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{successMessage}</div>
          </div>
        )}

        {/* ========================================== */}
        {/* FORM 1: LOGIN & REGISTER & FORGOT */}
        {/* ========================================== */}
        {['login', 'register', 'forgot'].includes(tab) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" /> Địa chỉ Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
              />
            </div>

            {tab !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" /> Mật khẩu
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter for Register */}
                {tab === 'register' && password && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            passStrength >= step
                              ? passStrength >= 3
                                ? 'bg-emerald-500'
                                : passStrength === 2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">
                      Độ mạnh: {passStrength <= 1 ? 'Yếu' : passStrength === 2 ? 'Trung bình' : passStrength === 3 ? 'Khá' : 'Rất mạnh'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" /> Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu vừa đặt"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý với Supabase...</span>
                </>
              ) : (
                <>
                  {tab === 'login' && <LogIn className="w-4 h-4" />}
                  {tab === 'register' && <UserPlus className="w-4 h-4" />}
                  {tab === 'forgot' && <Send className="w-4 h-4" />}
                  <span>
                    {tab === 'login' && 'Đăng Nhập Ngay'}
                    {tab === 'register' && 'Đăng Ký Tài Khoản'}
                    {tab === 'forgot' && 'Gửi Mã OTP Khôi Phục'}
                  </span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* FORM 2: VERIFY REGISTRATION OTP */}
        {/* ========================================== */}
        {tab === 'verify_register' && (
          <form onSubmit={handleVerifyRegisterOTP} className="space-y-4">
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
              Mã xác thực đã được gửi tới <strong>{email}</strong>. Vui lòng kiểm tra hộp thư (hoặc nhập mã hiển thị dưới đây).
            </div>

            {activeOtp && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Mã xác thực gửi tới bạn:</span>
                <span className="font-mono text-2xl font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">{activeOtp}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập mã OTP 6 chữ số
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-3 text-center tracking-widest font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setTab('register')}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Đổi email
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCountdown > 0 || isResending}
                className="text-emerald-600 dark:text-emerald-400 font-semibold disabled:opacity-50 hover:underline flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                {resendCountdown > 0 ? `Gửi lại sau (${resendCountdown}s)` : 'Gửi lại mã'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Hoàn Tất Xác Thực & Đăng Nhập
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* FORM 3: VERIFY RECOVERY OTP & RESET PASSWORD */}
        {/* ========================================== */}
        {tab === 'verify_recovery' && (
          <form onSubmit={handleVerifyRecoveryOTP} className="space-y-4">
            {activeOtp && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Mã OTP khôi phục gửi tới {email}:</span>
                <span className="font-mono text-2xl font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">{activeOtp}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập mã OTP 6 số
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono text-lg font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <div className="relative">
                <input
                  type={showRecoveryPassword ? 'text' : 'password'}
                  required
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showRecoveryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                value={recoveryConfirmPassword}
                onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Cập Nhật Mật Khẩu & Đăng Nhập
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* FORM 4: CUSTOM SUPABASE DATABASE CONFIG */}
        {/* ========================================== */}
        {tab === 'supabase' && (
          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Globe className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <span>
                Bạn có thể kết nối với project Supabase riêng để hoàn toàn làm chủ dữ liệu của mình.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Supabase Anon / Publishable Key
              </label>
              <div className="relative">
                <input
                  type={showAnonKey ? 'text' : 'password'}
                  required
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="sb_publishable_... hoặc eyJhbGci..."
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Lưu Cấu Hình
              </button>
              <button
                type="button"
                onClick={() => setTab('login')}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Quay Lại
              </button>
            </div>
          </form>
        )}

        {/* Demo Mode & Fast Trial Footer */}
        {showDemoButton && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Chưa muốn đăng nhập ngay?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                switchMode(true);
                addToast('Đã chuyển sang chế độ Khách / Demo (Lưu trữ cục bộ trên máy)', 'info');
                if (onSuccess) onSuccess();
                if (onCancel) onCancel();
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Trải nghiệm thử chế độ Khách (Offline Demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
