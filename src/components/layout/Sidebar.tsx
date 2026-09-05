import React from 'react';
import { 
  Home, 
  Clock, 
  Wallet, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'dashboard' | 'work' | 'expenses' | 'investments' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  openAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
  openAuthModal,
}) => {
  const { isSupabaseConfigured, isDemoUser, profile } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Tổng Quan',
      icon: Home,
      badge: undefined,
      color: 'text-blue-500',
    },
    {
      id: 'work' as NavTab,
      label: 'Quản Lý Giờ Công',
      icon: Clock,
      badge: '8h/ngày',
      color: 'text-amber-500',
    },
    {
      id: 'expenses' as NavTab,
      label: 'Quản Lý Chi Tiêu',
      icon: Wallet,
      badge: undefined,
      color: 'text-emerald-500',
    },
    {
      id: 'investments' as NavTab,
      label: 'Quản Lý Đầu Tư',
      icon: TrendingUp,
      badge: 'Live',
      color: 'text-purple-500',
    },
    {
      id: 'reports' as NavTab,
      label: 'Báo Cáo',
      icon: BarChart3,
      badge: undefined,
      color: 'text-indigo-500',
    },
    {
      id: 'settings' as NavTab,
      label: 'Cài Đặt',
      icon: Settings,
      badge: undefined,
      color: 'text-slate-400',
    },
  ];

  const handleTabClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (isOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold font-display text-lg shrink-0">
                ĐM
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight truncate">
                  HỆ THỐNG CÁ NHÂN
                </h1>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 shrink-0" /> Giờ Công • Chi Tiêu • Đầu Tư
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold font-display text-lg">
              ĐM
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Menu Quản Lý
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : item.color
                  }`}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Database & Cloud Status Pill */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
          {!isCollapsed ? (
            <div
              onClick={openAuthModal}
              className="cursor-pointer p-3 rounded-2xl bg-gradient-to-br from-emerald-600/5 via-teal-600/5 to-slate-50 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 transition-all text-xs group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cloud & Dữ Liệu</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured && !isDemoUser ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {profile?.full_name || 'Nguyễn Lê Đạt Minh'}
              </p>
              <div className="mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <ShieldCheck className="w-3 h-3" /> Trung tâm Tài khoản →
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              title="Trung tâm Tài khoản & Supabase"
              className="w-full flex justify-center p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Database className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
