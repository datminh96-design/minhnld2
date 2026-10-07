import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  Edit3, 
  Save, 
  X, 
  LogOut, 
  Sparkles, 
  CloudCheck, 
  Globe,
  KeyRound,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export interface UserProfileProps {
  /**
   * Display style variant
   * - 'card': Standard profile card with avatar, details, and badges
   * - 'compact': Small inline row suitable for headers or list items
   * - 'detailed': Full-featured card with inline name editing, copy actions, and security info
   * - 'badge': Minimal pill badge with avatar and display name
   */
  variant?: 'card' | 'compact' | 'detailed' | 'badge';
  showEmail?: boolean;
  showRole?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  variant = 'card',
  showEmail = true,
  showRole = true,
  showActions = true,
  onEdit,
  className = '',
}) => {
  const { 
    user, 
    profile, 
    isDemoUser, 
    isAdmin, 
    isSupabaseConfigured, 
    signOut, 
    updateProfile 
  } = useAuth();
  
  const { addToast } = useData();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Retrieve user info from AuthContext
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Nguyễn Lê Đạt Minh';
  const emailAddress = profile?.email || user?.email || 'datminh96@gmail.com';
  const avatarUrl = profile?.avatar_url;
  const initialLetter = displayName.charAt(0).toUpperCase() || 'M';
  const userId = user?.id || profile?.id || 'admin123';
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '01/01/2026';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(emailAddress);
      setCopiedEmail(true);
      addToast(`Đã sao chép email: ${emailAddress}`, 'info');
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(userId);
      setCopiedId(true);
      addToast('Đã sao chép mã định danh người dùng', 'info');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const startEditName = () => {
    setEditedName(displayName);
    setIsEditingName(true);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const saveEditName = async () => {
    if (!editedName.trim()) {
      addToast('Tên hiển thị không được để trống', 'warning');
      return;
    }
    try {
      setIsSavingName(true);
      const res = await updateProfile({ full_name: editedName.trim() });
      if (res?.error) {
        addToast(`Không thể cập nhật tên: ${res.error.message}`, 'error');
      } else {
        addToast('Đã cập nhật tên hiển thị thành công!', 'success');
        setIsEditingName(false);
      }
    } catch (err: any) {
      addToast(`Lỗi: ${err?.message || 'Không thể lưu tên'}`, 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  // 1. Badge Variant (Minimalist)
  if (variant === 'badge') {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 ${className}`}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            initialLetter
          )}
        </div>
        <span className="truncate max-w-[120px] font-semibold">{displayName}</span>
        {showEmail && (
          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">({emailAddress})</span>
        )}
      </div>
    );
  }

  // 2. Compact Variant (For headers, dropdowns, list rows)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-xl object-cover" />
            ) : (
              initialLetter
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
        </div>

        <div className="overflow-hidden text-left min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {displayName}
            </h4>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          </div>
          {showEmail && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {emailAddress}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3. Card Variant (Standard widget / modal / dashboard profile)
  if (variant === 'card') {
    return (
      <div 
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md ring-4 ring-emerald-500/10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  initialLetter
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>

            {/* Display Name & Email */}
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>

              {showEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mt-0.5 group truncate text-left"
                  title="Nhấn để sao chép email"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-emerald-500" />
                  <span className="truncate">{emailAddress}</span>
                  {copiedEmail ? (
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 ml-0.5" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Role / Status Badge */}
          {showRole && (
            <span
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                isAdmin
                  ? 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isAdmin ? 'Quản Trị Viên' : 'Thành Viên'}
            </span>
          )}
        </div>

        {/* Footer info pills */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            {isDemoUser ? 'Chế độ Trực tuyến' : 'Supabase Cloud'}
          </span>

          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đã kích hoạt
          </span>
        </div>
      </div>
    );
  }

  // 4. Detailed Variant (Comprehensive profile management card)
  return (
    <div 
      className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative ${className}`}
    >
      {/* Decorative top background gradient */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/15 border-b border-slate-100 dark:border-slate-800" />

      <div className="relative pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  initialLetter
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
            </div>

            {/* Name & Email */}
            <div className="overflow-hidden min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Nhập họ và tên..."
                    className="px-2.5 py-1 text-sm font-semibold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEditName}
                    disabled={isSavingName}
                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    title="Lưu tên"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditName}
                    disabled={isSavingName}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    title="Hủy"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </h2>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <button
                    type="button"
                    onClick={startEditName}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    title="Chỉnh sửa tên hiển thị"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Email with copy button */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
                  title="Nhấn để sao chép email"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                  <span className="font-medium">{emailAddress}</span>
                  {copiedEmail ? (
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Đã chép
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {showRole && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  isAdmin
                    ? 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isAdmin ? 'Quản Trị Viên (Admin)' : 'Thành Viên'}
              </span>
            )}
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {isDemoUser ? 'Chế độ Trực tuyến' : 'Supabase Cloud'}
            </span>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Tài Khoản
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Xác thực & Bảo mật
            </p>
          </div>

          <div 
            onClick={handleCopyId}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-colors group"
            title="Nhấn để sao chép User ID"
          >
            <span className="text-slate-400 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                Mã Định Danh (ID)
              </span>
              {copiedId ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </span>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
              {userId}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Ngày Tạo Tài Khoản
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {createdAt}
            </p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Dữ liệu được đồng bộ Realtime đa thiết bị
            </p>

            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
