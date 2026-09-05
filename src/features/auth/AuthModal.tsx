import React, { useState } from 'react';
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
  HardDrive
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'supabase';
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
    isSupabaseConfigured,
    isDemoUser,
    switchMode,
  } = useAuth();
  const { addToast, backupToCloudflareR2 } = useData();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'supabase'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [loading, setLoading] = useState(false);

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
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) {
          addToast(error.message || 'Đăng ký thất bại', 'error');
        } else {
          addToast('Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.', 'success');
          onClose();
        }
      } else if (tab === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          addToast(error.message || 'Gửi yêu cầu thất bại', 'error');
        } else {
          addToast('Đã gửi email liên kết đặt lại mật khẩu đến ' + email, 'success');
          setTab('login');
        }
      }
    } catch (err: any) {
      addToast(err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
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
          : tab === 'forgot'
          ? 'Khôi Phục Mật Khẩu'
          : 'Cấu Hình Supabase Cloud'
      }
      subtitle={
        isAuthenticated
          ? 'Quản lý thông tin xác thực, đám mây Supabase và sao lưu bảo mật'
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
                <button
                  type="button"
                  onClick={handleQuickBackup}
                  disabled={isBackingUp}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Cloud className={`w-3.5 h-3.5 text-sky-500 ${isBackingUp ? 'animate-spin' : ''}`} />
                  {isBackingUp ? 'Đang lưu...' : 'Sao lưu R2'}
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng Xuất
                </button>
              </div>
            </div>
          </div>

          {/* Integration & Storage Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" /> Supabase Cloud
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                PostgreSQL RLS an toàn
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-500" /> Cloudflare R2
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bucket <span className="font-mono text-emerald-500 font-semibold">minhnld2</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" /> Bộ Nhớ Đệm
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đồng bộ hai chiều Realtime
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
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Đăng Ký
            </button>
            <button
              type="button"
              onClick={() => setTab('supabase')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === 'supabase'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Supabase {isSupabaseConfigured ? '🟢' : '⚪'}
            </button>
          </div>

          {tab !== 'supabase' ? (
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
