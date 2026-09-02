import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { updateSupabaseCredentials, getSupabaseStatus } from '../../lib/supabase';
import { LogIn, UserPlus, KeyRound, Database, ShieldCheck, Check, Sparkles, Eye, EyeOff } from 'lucide-react';

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
  const { signInWithEmail, signUpWithEmail, resetPassword, isSupabaseConfigured, isDemoUser, switchMode } = useAuth();
  const { addToast } = useData();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'supabase'>(initialTab);
  const [email, setEmail] = useState('datminh96@gmail.com');
  const [password, setPassword] = useState('Datminh@2026');
  const [fullName, setFullName] = useState('Nguyễn Lê Đạt Minh');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase Custom credentials state
  const status = getSupabaseStatus();
  const [supabaseUrl, setSupabaseUrl] = useState(status.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(status.key || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          addToast(error.message || 'Đăng nhập thất bại', 'error');
        } else {
          addToast('Đăng nhập thành công!', 'success');
          onClose();
        }
      } else if (tab === 'register') {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) {
          addToast(error.message || 'Đăng ký thất bại', 'error');
        } else {
          addToast('Đăng ký tài khoản thành công!', 'success');
          onClose();
        }
      } else if (tab === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          addToast(error.message || 'Gửi yêu cầu thất bại', 'error');
        } else {
          addToast('Đã gửi email hướng dẫn đặt lại mật khẩu!', 'success');
          setTab('login');
        }
      }
    } catch (err: any) {
      addToast(err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
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
    addToast('Đã lưu cấu hình Supabase! Vui lòng làm mới trang.', 'success');
    onClose();
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleUseDemo = () => {
    switchMode(true);
    addToast('Đang ở chế độ Xem trước / Demo tương tác nhanh!', 'info');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tab === 'login'
          ? 'Đăng Nhập Tài Khoản'
          : tab === 'register'
          ? 'Đăng Ký Tài Khoản Mới'
          : tab === 'forgot'
          ? 'Quên Mật Khẩu'
          : 'Kết Nối Supabase Database'
      }
      subtitle="Hệ thống quản lý Giờ công | Chi tiêu | Đầu tư - Nguyễn Lê Đạt Minh"
      maxWidth="md"
    >
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => setTab('login')}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
            tab === 'login'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
            tab === 'register'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Đăng Ký
        </button>
        <button
          type="button"
          onClick={() => setTab('supabase')}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
            tab === 'supabase'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Supabase {isSupabaseConfigured ? '🟢' : '⚪'}
        </button>
      </div>

      {tab !== 'supabase' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Họ và Tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Lê Đạt Minh"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Đang xử lý...'
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Đăng Nhập
                </>
              ) : tab === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" /> Đăng Ký Tài Khoản
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

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">hoặc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseDemo}
              className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Trải Nghiệm Nhanh Chế Độ Demo
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Bảo mật Row Level Security (RLS) & Tự Động Sao Lưu
            </div>
            <p>
              Hệ thống đã cấu hình sẵn thông tin kết nối Supabase mặc định. Dữ liệu sẽ tự động được sao lưu an toàn khi thêm mới, sửa chữa hoặc xóa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supabase Anon / Publishable Key (Mặc định ẩn)
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
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Lưu Cấu Hình & Kết Nối Supabase
            </button>

            <button
              type="button"
              onClick={handleUseDemo}
              className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
            >
              Tiếp tục với Chế độ Local / Demo
            </button>
          </div>

        </form>
      )}
    </Modal>
  );
};
