import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Plus, 
  Sparkles, 
  Database, 
  LogOut, 
  User, 
  CalendarPlus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  Cloud,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  setIsOpenMobile: (open: boolean) => void;
  openAuthModal: () => void;
  onQuickAction: (action: 'add-work' | 'add-transaction' | 'add-investment') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setIsOpenMobile,
  openAuthModal,
  onQuickAction,
}) => {
  const { profile, isDemoUser, isSupabaseConfigured, signOut } = useAuth();
  const { 
    userSettings, 
    updateUserSettings, 
    resetToSampleData, 
    syncStatus, 
    lastSyncedAt, 
    syncMessage, 
    syncWithSupabase 
  } = useData();

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Tổng Quan Tài Chính & Công Việc', subtitle: 'Bức tranh toàn cảnh về thu nhập, chi tiêu, đầu tư và chấm công' };
      case 'work':
        return { title: 'Quản Lý Giờ Công & Chấm Công', subtitle: 'Theo dõi ca làm việc, tăng ca, ngày nghỉ và xuất báo cáo Excel' };
      case 'expenses':
        return { title: 'Quản Lý Thu Chi Cá Nhân', subtitle: 'Kiểm soát dòng tiền, phân loại danh mục và biểu đồ chi tiêu' };
      case 'investments':
        return { title: 'Danh Mục & Quản Lý Đầu Tư', subtitle: 'Theo dõi Crypto, Cổ phiếu, Quỹ, Vàng và lợi nhuận danh mục' };
      case 'reports':
        return { title: 'Báo Cáo & Phân Tích Tổng Hợp', subtitle: 'Báo cáo hiệu suất công việc, sức khỏe tài chính và tăng trưởng tài sản' };
      case 'settings':
        return { title: 'Cài Đặt Hệ Thống & Cấu Hình', subtitle: 'Tùy chỉnh giờ chuẩn, tỷ giá tiền tệ, giao diện và Supabase' };
    }
  };

  const currentInfo = getTabTitle(activeTab);

  const toggleTheme = () => {
    const nextTheme = userSettings.theme === 'dark' ? 'light' : 'dark';
    updateUserSettings({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-30 h-18 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile trigger & Page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight">
            {currentInfo.title}
          </h2>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Glowing Lightbulb Backup Status Indicator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => syncWithSupabase(true)}
            onMouseEnter={() => setShowSyncTooltip(true)}
            onMouseLeave={() => setShowSyncTooltip(false)}
            className={`relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all duration-300 ${
              syncStatus === 'syncing'
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-500 dark:text-amber-300 ring-4 ring-amber-400/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
            title="Nhấn để kích hoạt sao lưu tức thì lên Supabase Cloud"
          >
            {/* Luminous Lightbulb */}
            <div className="relative flex items-center justify-center">
              <Lightbulb 
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-300 ${
                  syncStatus === 'syncing' 
                    ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse' 
                    : 'text-amber-500 dark:text-amber-300 fill-amber-400/80 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                }`} 
              />
              {syncStatus === 'syncing' && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-bold leading-tight font-display flex items-center gap-1">
                {syncStatus === 'syncing' ? 'Đang Sao Lưu...' : 'Đã Sao Lưu'}
              </span>
              <span className="text-[9px] opacity-75 leading-none">
                {syncStatus === 'syncing' ? 'Supabase Cloud' : 'Tự động 100%'}
              </span>
            </div>
          </button>

          {/* Tooltip on hover */}
          {showSyncTooltip && (
            <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-slate-900/95 text-white backdrop-blur-md shadow-2xl border border-slate-700 z-50 text-xs animate-in fade-in zoom-in-95 pointer-events-none">
              <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-bold">
                <Lightbulb className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Cơ chế Tự Động Sao Lưu Cloud</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Mỗi khi bạn <strong className="text-white">Thêm mới</strong>, <strong className="text-white">Sửa chữa</strong> hoặc <strong className="text-white">Xóa</strong> dữ liệu, hệ thống tự động đồng bộ và sao lưu an toàn ngay lập tức lên máy chủ Supabase.
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Trạng thái:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ghi Chép Nhanh</span>
          </button>

          {showQuickMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowQuickMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onQuickAction('add-work');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-amber-500" />
                  <span>Chấm công ca làm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onQuickAction('add-transaction');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  <span>Thêm Thu / Chi tiêu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onQuickAction('add-investment');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span>Ghi nhận giao dịch Đầu tư</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Chuyển sang giao diện ${userSettings.theme === 'dark' ? 'sáng' : 'tối'}`}
        >
          {userSettings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User profile / Auth trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {profile?.full_name?.charAt(0) || 'M'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">
                {profile?.full_name || 'Nguyễn Lê Đạt Minh'}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isDemoUser ? 'Chế độ Trực tuyến' : 'Supabase Cloud'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-600/10 via-teal-600/5 to-slate-50 dark:to-slate-800/60 border border-emerald-500/20 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {profile?.full_name?.charAt(0) || 'M'}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {profile?.full_name || 'Nguyễn Lê Đạt Minh'}
                        </p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {profile?.email || 'datminh96@gmail.com'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    openAuthModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Trung Tâm Tài Khoản & Bảo Mật</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    resetToSampleData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Nạp lại Dữ liệu Mẫu (Seed Data)</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

