import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseStatus, updateSupabaseCredentials } from '../../lib/supabase';
import { r2Service, R2ObjectItem, R2StatusResponse } from '../../services/r2Service';
import { TransactionalEmailSection } from './TransactionalEmailSection';
import { 
  Settings, 
  Clock, 
  Palette, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  Save, 
  Copy, 
  Check, 
  Sparkles,
  ExternalLink,
  Code,
  Lightbulb,
  Eye,
  EyeOff,
  CloudCheck,
  Cloud,
  HardDrive,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    workSettings, 
    updateWorkSettings, 
    userSettings, 
    updateUserSettings, 
    clearAllData,
    addToast,
    syncStatus,
    lastSyncedAt,
    syncMessage,
    triggerCloudBackup,
    backupToCloudflareR2,
    restoreFromCloudflareR2
  } = useData();

  const { isSupabaseConfigured, isDemoUser, profile, isAdmin } = useAuth();
  const supabaseStatus = getSupabaseStatus();

  // Work settings form states
  const [inTime, setInTime] = useState(workSettings.default_check_in);
  const [outTime, setOutTime] = useState(workSettings.default_check_out);
  const [breakStart, setBreakStart] = useState(workSettings.default_break_start);
  const [breakEnd, setBreakEnd] = useState(workSettings.default_break_end);
  const [stdHours, setStdHours] = useState(workSettings.standard_hours_per_day.toString());
  const [stdDays, setStdDays] = useState((workSettings.standard_days_per_month || 26).toString());

  // App settings
  const [currency, setCurrency] = useState(userSettings.currency);
  const [theme, setTheme] = useState(userSettings.theme);

  // Masking toggles for Supabase & Cloudflare R2
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [showR2Details, setShowR2Details] = useState(false);

  // Cloudflare R2 State
  const [r2Status, setR2Status] = useState<R2StatusResponse | null>(null);
  const [r2Backups, setR2Backups] = useState<R2ObjectItem[]>([]);
  const [testingR2, setTestingR2] = useState(false);
  const [backingUpToR2, setBackingUpToR2] = useState(false);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);

  // Copied SQL state
  const [copiedSql, setCopiedSql] = useState(false);

  // Load Cloudflare R2 status & backups on mount
  useEffect(() => {
    checkR2Status();
    loadR2Backups();
  }, []);

  const checkR2Status = async () => {
    setTestingR2(true);
    try {
      const res = await r2Service.checkStatus();
      setR2Status(res);
    } catch (e) {
      console.warn('R2 status check error:', e);
    } finally {
      setTestingR2(false);
    }
  };

  const loadR2Backups = async () => {
    try {
      const res = await r2Service.listBackups();
      if (res.success && res.objects) {
        // Sort newest first
        const sorted = [...res.objects].sort((a, b) => {
          const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          return timeB - timeA;
        });
        setR2Backups(sorted);
      }
    } catch (e) {
      console.warn('R2 backup list error:', e);
    }
  };

  const handleBackupR2 = async () => {
    setBackingUpToR2(true);
    try {
      const ok = await backupToCloudflareR2();
      if (ok) {
        await loadR2Backups();
      }
    } finally {
      setBackingUpToR2(false);
    }
  };

  const handleRestoreR2 = async (key: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu ${key}? Dữ liệu hiện tại sẽ được thay thế bằng bản sao lưu này.`)) {
      return;
    }
    setRestoringKey(key);
    try {
      await restoreFromCloudflareR2(key);
    } finally {
      setRestoringKey(null);
    }
  };

  const handleDeleteR2 = async (key: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản sao lưu ${key} khỏi Cloudflare R2?`)) {
      return;
    }
    try {
      const res = await r2Service.deleteBackup(key);
      if (res.success) {
        addToast('Đã xóa bản sao lưu khỏi Cloudflare R2', 'success');
        setR2Backups(prev => prev.filter(b => b.key !== key));
      } else {
        addToast(`Lỗi khi xóa: ${res.error || 'Lỗi không xác định'}`, 'error');
      }
    } catch (err: any) {
      addToast(`Lỗi: ${err.message}`, 'error');
    }
  };

  // Save work settings
  const handleSaveWorkSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = parseFloat(stdHours);
    const parsedDays = parseFloat(stdDays);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      addToast('Số giờ làm chuẩn phải lớn hơn 0', 'warning');
      return;
    }
    if (isNaN(parsedDays) || parsedDays <= 0) {
      addToast('Số ngày làm chuẩn phải lớn hơn 0', 'warning');
      return;
    }

    updateWorkSettings({
      default_check_in: inTime,
      default_check_out: outTime,
      default_break_start: breakStart,
      default_break_end: breakEnd,
      standard_hours_per_day: parsedHours,
      standard_days_per_month: parsedDays,
    });
  };

  // Save App Display settings
  const handleSaveDisplaySettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserSettings({
      currency: currency as 'VND' | 'USD',
      theme: theme as 'light' | 'dark' | 'system',
    });
  };

  const copySchemaSql = () => {
    const sqlText = `-- Chạy đoạn mã này trong Supabase SQL Editor:
-- Đã có sẵn trong file supabase/schema.sql của dự án.`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    addToast('Đã sao chép hướng dẫn SQL Schema', 'info');
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* 1. Cấu hình Giờ Công Tiêu Chuẩn */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Cấu Hình Giờ Công & Ca Làm Việc
            </h3>
            <p className="text-xs text-slate-400">
              Thiết lập khung giờ vào/ra và nghỉ trưa mặc định khi tạo bản ghi mới
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWorkSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giờ vào ca mặc định
              </label>
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giờ ra ca mặc định
              </label>
              <input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bắt đầu nghỉ trưa
              </label>
              <input
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kết thúc nghỉ trưa
              </label>
              <input
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số ngày làm chuẩn / tháng
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="31"
                value={stdDays}
                onChange={(e) => setStdDays(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số giờ chuẩn / ngày
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={stdHours}
                onChange={(e) => setStdHours(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Live standard hours summary calculation badge */}
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Tổng giờ công chuẩn mỗi tháng:
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400 text-sm">
              {(parseFloat(stdDays || '26') * parseFloat(stdHours || '8') || 208).toFixed(0)} giờ ({stdDays || '26'} ngày x {stdHours || '8'}h)
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Lưu Cấu Hình Giờ Công
            </button>
          </div>
        </form>
      </div>

      {/* 2. Cấu hình Giao diện & Định dạng */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Giao Diện & Định Dạng Tiền Tệ
            </h3>
            <p className="text-xs text-slate-400">Tùy biến hiển thị số liệu và chủ đề màu sắc</p>
          </div>
        </div>

        <form onSubmit={handleSaveDisplaySettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiền tệ chính
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="VND">VND - Việt Nam Đồng (₫)</option>
                <option value="USD">USD - Đô la Mỹ ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chế độ màu giao diện
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="light">Chế độ Sáng (Light Mode)</option>
                <option value="dark">Chế độ Tối (Dark Mode)</option>
                <option value="system">Tự động theo Hệ thống</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Lưu Tùy Chọn Hiển Thị
            </button>
          </div>
        </form>
      </div>

      {/* 3 & 4. Cấu hình Supabase & Cloudflare R2 - CHỈ ADMIN datminh96@gmail.com ĐƯỢC PHÉP THẤY */}
      {isAdmin && (
        <>
          {/* 3. Cấu hình Supabase & Quản trị dữ liệu */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                      Cơ Sở Dữ Liệu Supabase & Tự Động Sao Lưu
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Tự động đồng bộ và sao lưu an toàn khi Thêm, Sửa, Xóa</p>
                </div>
              </div>

              {/* Glowing Bulb Indicator */}
              <button
                type="button"
                onClick={() => triggerCloudBackup(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-500 animate-pulse'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <Lightbulb className={`w-4 h-4 ${syncStatus === 'syncing' ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-amber-500 fill-amber-400/80'}`} />
                <span>{syncStatus === 'syncing' ? 'Đang Sao Lưu...' : 'Sao Lưu Ngay'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Trạng thái: {syncMessage}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Cập nhật: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('vi-VN') : 'Vừa xong'}
                </span>
              </div>

              {/* Masked default credentials box */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Thông tin kết nối Supabase (Mặc định được ẩn an toàn)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfigDetails(!showConfigDetails)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {showConfigDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showConfigDetails ? 'Ẩn thông tin' : 'Hiện thông tin'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Project URL:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      {showConfigDetails ? supabaseStatus.url : supabaseStatus.maskedUrl}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Anon / Publishable Key:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      {showConfigDetails ? supabaseStatus.key : supabaseStatus.maskedKey}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Hệ thống tự động kích hoạt tính năng sao lưu và làm sáng bóng đèn trạng thái trên thanh Header mỗi khi có thao tác thêm mới, sửa chữa hoặc xóa dữ liệu.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={clearAllData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa Trắng Dữ Liệu Hiện Tại
                </button>

                <button
                  type="button"
                  onClick={copySchemaSql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-semibold cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Đã sao chép' : 'Sao chép Schema SQL'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Cấu hình Cloudflare R2 Object Storage */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                      Lưu Trữ & Sao Lưu Đám Mây Cloudflare R2 (S3)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      S3 Compatible • Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Kho lưu trữ tệp tin và bản sao lưu JSON toàn diện không tốn phí băng thông xuất dữ liệu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkR2Status}
                  disabled={testingR2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingR2 ? 'animate-spin text-orange-500' : ''}`} />
                  <span>{testingR2 ? 'Đang kiểm tra...' : 'Kiểm tra R2'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackupR2}
                  disabled={backingUpToR2}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${backingUpToR2 ? 'animate-bounce' : ''}`} />
                  <span>{backingUpToR2 ? 'Đang Tải Lên...' : 'Sao Lưu Lên R2'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      r2Status?.connected ? 'bg-emerald-500' : testingR2 ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Trạng thái:{' '}
                    {r2Status?.connected
                      ? 'Đã kết nối Cloudflare R2 thành công'
                      : testingR2
                      ? 'Đang kiểm tra kết nối...'
                      : r2Status?.error
                      ? `Lỗi: ${r2Status.error}`
                      : 'Sẵn sàng sao lưu'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Buckets khả dụng: {r2Status?.buckets?.length || 1}
                </span>
              </div>

              {/* Masked credentials box */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                    Thông số kết nối Cloudflare S3 Endpoint (Bảo mật)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowR2Details(!showR2Details)}
                    className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {showR2Details ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showR2Details ? 'Ẩn thông tin' : 'Hiện thông tin'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">S3 Endpoint:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      {r2Status?.endpoint || (showR2Details ? 'Configured in Environment' : 'https://...r2.cloudflarestorage.com')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Access Key ID:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      {showR2Details ? 'Đã cấu hình bảo mật qua ENV' : '•••••••••••••••• (Ẩn an toàn)'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Account ID:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      {r2Status?.accountId || (showR2Details ? 'Configured in Environment' : '••••••••••••••••')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Default Bucket:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block">
                      minhnld2
                    </span>
                  </div>
                </div>
              </div>

              {/* Backup History Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Lịch sử bản sao lưu trên Cloudflare R2 ({r2Backups.length})
                  </span>
                  <button
                    type="button"
                    onClick={loadR2Backups}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Làm mới danh sách
                  </button>
                </div>

                {r2Backups.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-center text-slate-400 text-xs">
                    Chưa có bản sao lưu nào trên Cloudflare R2. Nhấn nút <strong>"Sao Lưu Lên R2"</strong> để tạo bản đầu tiên.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {r2Backups.map((item) => (
                      <div
                        key={item.key}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-slate-800 dark:text-slate-200 truncate font-semibold">
                            {item.key.replace('backups/', '')}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.lastModified
                              ? new Date(item.lastModified).toLocaleString('vi-VN')
                              : 'Vừa tải lên'}{' '}
                            • {(item.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreR2(item.key)}
                            disabled={restoringKey === item.key}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] transition-all cursor-pointer disabled:opacity-50"
                            title="Khôi phục dữ liệu từ bản này"
                          >
                            <Download className={`w-3 h-3 ${restoringKey === item.key ? 'animate-bounce' : ''}`} />
                            <span>{restoringKey === item.key ? 'Đang khôi phục...' : 'Khôi phục'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteR2(item.key)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            title="Xóa bản sao lưu này khỏi R2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Cấu hình & Gửi Transactional Email */}
          <TransactionalEmailSection />
        </>
      )}

      {/* 6. Thông tin ứng dụng */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-bold text-slate-800 dark:text-slate-200 font-display">
          QUẢN LÝ CÁ NHÂN – GIỜ CÔNG | CHI TIÊU | ĐẦU TƯ
        </p>
        <p>Phiên bản 1.0.0 • Tối ưu hóa triển khai Vercel & Supabase Cloud PostgreSQL • Tự động sao lưu dữ liệu khi thêm, sửa, xóa</p>
      </div>
    </div>
  );
};

