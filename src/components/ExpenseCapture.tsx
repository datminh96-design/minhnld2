import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  Image as ImageIcon, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  Check, 
  RefreshCw, 
  X,
  Store,
  Percent,
  RotateCw,
  Eye,
  Building2,
  Car,
  Coffee,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ExpenseCategory, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { billScannerService, ExtractedExpenseData } from '../services/billScannerService';

export interface ExpenseCaptureProps {
  onSave?: (data: {
    id?: string;
    type: 'income' | 'expense' | 'investment';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
    fee?: number;
  }) => Promise<void>;
  onClose?: () => void;
  categories?: ExpenseCategory[];
  standalone?: boolean;
  className?: string;
  defaultCategory?: string;
}

/**
 * Universal Date Normalizer for various Vietnamese and international date formats
 */
export const parseFlexibleDateToISO = (raw: string | null | undefined): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Direct match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. ISO timestamp format: 2026-10-07T...
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 5. DD/MM/YY (e.g. 07/10/26)
  const dmyShortMatch = trimmed.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, '0');
    const month = dmyShortMatch[2].padStart(2, '0');
    const year = `20${dmyShortMatch[3]}`;
    return `${year}-${month}-${day}`;
  }

  // 6. Vietnamese Text "Ngày 07 tháng 10 năm 2026"
  const vnTextMatch = trimmed.match(/(\d{1,2})\s*(?:tháng|\/)\s*(\d{1,2})\s*(?:năm|\/)\s*(\d{4})/i);
  if (vnTextMatch) {
    const day = vnTextMatch[1].padStart(2, '0');
    const month = vnTextMatch[2].padStart(2, '0');
    const year = vnTextMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
};

/**
 * Universal Amount Normalizer for Vietnamese & International receipt amount layouts
 */
export const parseFlexibleAmount = (raw: any): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) || raw <= 0 ? null : raw;
  if (typeof raw !== 'string') return null;

  let str = raw.trim().toLowerCase();
  if (!str) return null;

  // Handle unit suffixes
  const kMatch = str.match(/^([\d\.,]+)\s*k$/i);
  if (kMatch) {
    const base = parseFloat(kMatch[1].replace(/,/g, '.'));
    return isNaN(base) ? null : Math.round(base * 1000);
  }
  const trMatch = str.match(/^([\d\.,]+)\s*(?:tr|triệu|m)$/i);
  if (trMatch) {
    const base = parseFloat(trMatch[1].replace(/,/g, '.'));
    return isNaN(base) ? null : Math.round(base * 1000000);
  }

  // Clean currency symbols
  str = str.replace(/[đvndvnđ\$usd\s]/gi, '');

  // Vietnamese thousand dot "205.000,00" or "205.000" or US comma "205,000.00"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    const parts = str.split(',');
    if (parts[1] && parts[1].length === 3) {
      str = parts.join('');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts[1] && parts[1].length === 3 && parts.length === 2) {
      str = parts.join('');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
};

export const ExpenseCapture: React.FC<ExpenseCaptureProps> = ({
  onSave,
  onClose,
  categories: propCategories,
  standalone = false,
  className = '',
  defaultCategory,
}) => {
  const { categories: contextCategories, saveTransaction, addToast } = useData();
  const availableCategories = propCategories || contextCategories;

  // Scanner UI States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [detectedLayout, setDetectedLayout] = useState<string | null>(null);
  const [layoutLabel, setLayoutLabel] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Form Field States (Extracted details: name, amount, date, fee, category, type)
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txFee, setTxFee] = useState('0');
  const [txCategory, setTxCategory] = useState(defaultCategory || 'Ăn uống');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txNotes, setTxNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial category
  useEffect(() => {
    if (availableCategories.length > 0 && !txCategory) {
      const firstExp = availableCategories.find((c) => c.type === 'expense');
      setTxCategory(firstExp ? firstExp.name : availableCategories[0].name);
    }
  }, [availableCategories, txCategory]);

  // Rotate image helper
  const handleRotateImage = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
  };

  // Main Bill Scanning Method with High-Accuracy Normalization
  const handleProcessScan = async (fileOrBase64: File | string) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatusText('Đang nạp ảnh hóa đơn chi tiêu...');
    setScanError(null);
    setScanSuccess(false);
    setMissingFields([]);
    setDetectedLayout(null);
    setLayoutLabel(null);

    try {
      if (typeof fileOrBase64 !== 'string') {
        const preview = await billScannerService.fileToBase64(fileOrBase64);
        setScannedImagePreview(preview);
      } else {
        setScannedImagePreview(fileOrBase64);
      }

      const result = await billScannerService.scanExpenseBill(
        fileOrBase64,
        availableCategories,
        (percent, status) => {
          setScanProgress(percent);
          setScanStatusText(status);
        }
      );

      if (result.success && result.data) {
        const data = result.data;
        setScanSuccess(true);
        setScanProgress(100);
        setScanConfidence(data.confidence || 95);
        setDetectedLayout(data.document_layout || 'general');
        setLayoutLabel(data.layout_label || 'Hóa đơn chi tiêu');

        // 1. Name / Merchant Extraction
        if (data.name && data.name.trim()) {
          setTxName(data.name.trim());
        } else {
          setTxName('');
        }

        // 2. Amount with Universal Normalizer
        const normalizedAmount = parseFlexibleAmount(data.amount);
        if (normalizedAmount !== null && normalizedAmount > 0) {
          setTxAmount(normalizedAmount.toString());
        } else {
          setTxAmount('');
        }

        // 3. Date with Universal ISO Normalizer
        const normalizedDate = parseFlexibleDateToISO(data.transaction_date);
        if (normalizedDate) {
          setTxDate(normalizedDate);
        } else {
          setTxDate(new Date().toISOString().split('T')[0]);
        }

        // 4. Fee / Surcharge Normalizer
        const normalizedFee = parseFlexibleAmount(data.fee);
        if (normalizedFee !== null && normalizedFee >= 0) {
          setTxFee(normalizedFee.toString());
        } else {
          setTxFee('0');
        }

        // 5. Category matching with intelligent keyword fallback
        if (data.category) {
          const matched = availableCategories.find(
            (c) =>
              c.name.toLowerCase() === data.category.toLowerCase() ||
              c.name.toLowerCase().includes(data.category.toLowerCase()) ||
              data.category.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matched) {
            setTxCategory(matched.name);
          } else {
            setTxCategory(data.category);
          }
        }

        // 6. Transaction Type
        if (data.transaction_type) {
          setTxType(data.transaction_type);
        }

        // 7. Notes & Items summary
        const noteParts: string[] = [];
        if (data.items_summary) noteParts.push(`Mặt hàng: ${data.items_summary}`);
        if (data.notes) noteParts.push(data.notes);
        if (noteParts.length > 0) {
          setTxNotes(noteParts.join(' | '));
        }

        // 8. Strict evaluation of missing fields
        const detectedMissing: string[] = [];
        if (!data.name || !data.name.trim()) detectedMissing.push('name');
        if (!normalizedAmount || normalizedAmount <= 0) detectedMissing.push('amount');
        if (!normalizedDate) detectedMissing.push('date');

        setMissingFields(detectedMissing);
        addToast('Đã quét & trích xuất hóa đơn bằng AI thành công!', 'success');
      } else {
        setScanError(result.error || 'AI không nhận diện được thông tin hóa đơn. Vui lòng điền tay.');
        setMissingFields(['name', 'amount', 'date']);
      }
    } catch (err: any) {
      setScanError(err?.message || 'Lỗi khi quét ảnh hóa đơn');
      setMissingFields(['name', 'amount', 'date']);
    } finally {
      setIsScanning(false);
    }
  };

  // Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessScan(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [availableCategories]);

  // Demo Sample Receipt Generator (5 diverse document layouts)
  const handleSampleReceipt = async (type: 'winmart' | 'highlands' | 'grab' | 'bank' | 'evn') => {
    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText('Đang nạp ảnh hóa đơn mẫu...');
    setScanError(null);
    setScanSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 680;
      canvas.height = 460;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 680, 460);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';

      const todayStr = new Date().toISOString().split('T')[0];

      if (type === 'winmart') {
        ctx.fillText('SIÊU THỊ WINMART+ / MASAN GROUP', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Đ/C: Tòa nhà Landmark 81, P.22, Bình Thạnh, TP.HCM', 40, 80);
        ctx.fillText('------------------------------------------------------------------', 40, 105);
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('1. Sữa tươi tiệt trùng Vinamilk 1L        x2   68,000 đ', 40, 140);
        ctx.fillText('2. Trứng gà Ba Huân hộp 10 quả           x1   34,000 đ', 40, 175);
        ctx.fillText('3. Thịt nạc dăm heo MeatDeli 400g        x1   85,000 đ', 40, 210);
        ctx.fillText('4. Bánh mì tươi Sandwich Kinh Đô         x1   18,000 đ', 40, 245);
        ctx.fillText('------------------------------------------------------------------', 40, 275);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('TỔNG TIỀN THANH TOÁN: 205,000 VND', 40, 310);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Phí túi sinh học: 0 đ | VAT 8%: 16,400 đ (đã gồm)', 40, 345);
        ctx.fillText(`Ngày GD: ${todayStr} 14:32 | HĐ: WM-89104`, 40, 380);
      } else if (type === 'highlands') {
        ctx.fillText('HIGHLANDS COFFEE - NGUYỄN HUỆ', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('HÓA ĐƠN BÁN LẺ DỊCH VỤ ĂN UỐNG & F&B', 40, 80);
        ctx.fillText('------------------------------------------------------------------', 40, 105);
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('1. Phin Sữa Đá (Size L)                  x2   90,000 đ', 40, 145);
        ctx.fillText('2. Trà Sen Vàng (Size M)                 x1   55,000 đ', 40, 185);
        ctx.fillText('3. Bánh Mì Thịt Nướng                    x1   29,000 đ', 40, 225);
        ctx.fillText('------------------------------------------------------------------', 40, 260);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('TỔNG CỘNG: 174,000 VND', 40, 295);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Phí phục vụ: 0 đ | Thanh toán: Thẻ Visa', 40, 335);
        ctx.fillText(`Ngày lập: ${todayStr} | Quầy thu ngân 02`, 40, 375);
      } else if (type === 'grab') {
        ctx.fillText('GRAB VIETNAM - BIÊN LAI DI CHUYỂN', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Dịch vụ: GrabCar 4 chỗ - Khách hàng cá nhân', 40, 80);
        ctx.fillText('------------------------------------------------------------------', 40, 105);
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('Điểm đón: 123 Lê Lợi, Quận 1', 40, 145);
        ctx.fillText('Điểm đến: Sân bay Quốc tế Tân Sơn Nhất', 40, 185);
        ctx.fillText('Cước phí chuyến đi: 135,000 đ', 40, 225);
        ctx.fillText('Phí cầu đường / sân bay: 15,000 đ', 40, 260);
        ctx.fillText('------------------------------------------------------------------', 40, 290);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('TỔNG THANH TOÁN: 150,000 VND', 40, 325);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Thời gian: ${todayStr} 08:15 | Mã chuyến: GRB-749210`, 40, 365);
      } else if (type === 'bank') {
        ctx.fillStyle = '#005baa';
        ctx.fillRect(0, 0, 680, 80);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('VIETCOMBANK - BIÊN LAI CHUYỂN KHOẢN 24/7', 40, 50);
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('GIAO DỊCH CHUYỂN TIỀN THÀNH CÔNG', 40, 120);
        ctx.font = '15px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText('Người nhận: CÔNG TY TNHH DỊCH VỤ NHÀ CỬA', 40, 160);
        ctx.fillText('Số tài khoản: 1029384756 (Techcombank)', 40, 195);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#dc2626';
        ctx.fillText('Số tiền chuyển: 1,850,000 VND', 40, 240);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Phí giao dịch: 0 VND (Miễn phí)', 40, 280);
        ctx.fillText('Nội dung: Thanh toan tien thue nha thang 10', 40, 315);
        ctx.fillText(`Thời gian giao dịch: ${todayStr} 10:25:30`, 40, 350);
        ctx.fillText('Mã giao dịch: VCB-98342157', 40, 385);
      } else {
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(0, 0, 680, 80);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('TỔNG CÔNG TY ĐIỆN LỰC TP.HCM (EVN HCMC)', 40, 50);
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('GIẤY BÁO TIỀN ĐIỆN & HÓA ĐƠN TIỆN ÍCH', 40, 120);
        ctx.font = '15px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText(`Kỳ hóa đơn: Tháng 10/2026 | Ngày xuất: ${todayStr}`, 40, 160);
        ctx.fillText('Khách hàng: Nguyễn Lê Đạt Minh - PE08000123456', 40, 195);
        ctx.fillText('Điện năng tiêu thụ: 345 kWh', 40, 230);
        ctx.fillText('Tiền điện chưa thuế: 890,000 đ | Thuế GTGT (8%): 71,200 đ', 40, 265);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('TỔNG CỘNG TIỀN THANH TOÁN: 961,200 VND', 40, 315);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Hình thức: Trừ nợ tự động ngân hàng', 40, 355);
      }

      const sampleDataUrl = canvas.toDataURL('image/jpeg');
      setScannedImagePreview(sampleDataUrl);
      setRotationAngle(0);
      await handleProcessScan(sampleDataUrl);
    } catch (err: any) {
      setScanError(err?.message || 'Lỗi khi tạo hóa đơn mẫu');
      setIsScanning(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFlexibleAmount(txAmount);
    if (!numAmount || numAmount <= 0) {
      setMissingFields((prev) => (prev.includes('amount') ? prev : [...prev, 'amount']));
      addToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'warning');
      return;
    }

    if (!txName.trim()) {
      setMissingFields((prev) => (prev.includes('name') ? prev : [...prev, 'name']));
      addToast('Vui lòng nhập tên giao dịch / đơn vị thanh toán', 'warning');
      return;
    }

    const numFee = parseFlexibleAmount(txFee) || 0;
    setIsSubmitting(true);

    try {
      const finalCategory = txCategory || (txType === 'income' ? 'Lương' : 'Ăn uống');
      const finalNote = txNotes.trim() 
        ? `${txName.trim()} | ${txNotes.trim()}` 
        : txName.trim();

      if (onSave) {
        await onSave({
          type: txType,
          amount: numAmount,
          category: finalCategory,
          description: finalNote,
          transaction_date: txDate,
          fee: numFee,
        });
      } else {
        await saveTransaction({
          transaction_type: txType,
          amount: numAmount,
          category_name: finalCategory,
          note: finalNote,
          transaction_date: txDate,
        });
      }

      addToast(`Đã lưu giao dịch ${txName} (${formatCurrency(numAmount, 'VND')}) thành công!`, 'success');
      
      // Reset form
      setTxName('');
      setTxAmount('');
      setTxFee('0');
      setTxNotes('');
      setScannedImagePreview(null);
      setScanSuccess(false);
      setMissingFields([]);

      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu giao dịch từ hóa đơn:', err);
      addToast('Lỗi khi lưu giao dịch: ' + (err?.message || 'Vui lòng thử lại'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg">Quét Hóa Đơn Chi Tiêu AI</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/25 text-white backdrop-blur-sm shadow-2xs">
                Gemini OCR
              </span>
            </div>
            <p className="text-xs text-purple-100/90">
              Nhận diện thông minh mọi bố cục hóa đơn (Siêu thị, F&B, Grab, Chuyển khoản, EVN...)
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Upload & Dropzone Area */}
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessScan(e.dataTransfer.files[0]);
              }
            }}
            className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
              isScanning
                ? 'border-purple-400 bg-purple-500/10'
                : scanSuccess
                ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-500/5'
                : scanError
                ? 'border-rose-400 dark:border-rose-600 bg-rose-500/5'
                : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-purple-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessScan(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {scannedImagePreview ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="relative group">
                  <img
                    src={scannedImagePreview}
                    alt="Hóa đơn vừa tải lên"
                    style={{ transform: `rotate(${rotationAngle}deg)` }}
                    className="w-28 h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-md transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotateImage();
                    }}
                    title="Xoay ảnh 90 độ"
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span>Đã nạp ảnh chụp hóa đơn / biên lai</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhấp vào đây để chọn ảnh khác hoặc dán ảnh chụp màn hình bằng <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl+V</kbd>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kéo thả ảnh hóa đơn / bill vào đây hoặc <span className="text-purple-600 dark:text-purple-400 underline">chọn từ thiết bị</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ hóa đơn siêu thị, Highlands, Phúc Long, Grab, Shopee, chuyển khoản, tiền điện nước... (Hỗ trợ <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl+V</kbd>)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Demo Sample Bills - 5 Document Layout Types */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bố cục mẫu:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSampleReceipt('winmart')}
                disabled={isScanning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                🛒 Siêu thị WinMart
              </button>
              <button
                type="button"
                onClick={() => handleSampleReceipt('highlands')}
                disabled={isScanning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                ☕ Highlands Coffee
              </button>
              <button
                type="button"
                onClick={() => handleSampleReceipt('grab')}
                disabled={isScanning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                🚗 Cước GrabCar
              </button>
              <button
                type="button"
                onClick={() => handleSampleReceipt('bank')}
                disabled={isScanning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                🏦 Chuyển khoản VCB
              </button>
              <button
                type="button"
                onClick={() => handleSampleReceipt('evn')}
                disabled={isScanning}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                ⚡ Tiền điện EVN
              </button>
            </div>
          </div>
        </div>

        {/* Realtime Progress Status Bar */}
        {isScanning && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                {scanStatusText || 'AI đang xử lý hình ảnh...'}
              </span>
              <span className="font-mono text-sm text-purple-700 dark:text-purple-300 font-extrabold">
                {scanProgress}%
              </span>
            </div>

            {/* Visual Animated Gradient Progress Bar */}
            <div className="w-full h-3 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Success Banner with Layout Type Badge */}
        {scanSuccess && !isScanning && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-2 text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Quét Hóa Đơn Hoàn Tất (100%)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {layoutLabel && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {layoutLabel}
                  </span>
                )}
                {scanConfidence && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold">
                    Độ tin cậy: {scanConfidence}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
              AI đã tự động bóc tách ngày giao dịch, số tiền và tên đơn vị bên dưới. Vui lòng kiểm tra và bấm <strong>Xác nhận</strong> để lưu vào sổ chi tiêu.
            </p>
          </div>
        )}

        {/* Scan Error Banner */}
        {scanError && !isScanning && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-1 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Quét thất bại hoặc ảnh không rõ chữ</span>
            </div>
            <p className="text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
              {scanError}. Các ô cần thiết bên dưới đã được tô đỏ để bạn tự nhập bằng tay.
            </p>
          </div>
        )}

        {/* Missing Fields Warning Notice */}
        {missingFields.length > 0 && !isScanning && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              ⚠️ Còn <strong className="text-rose-600 dark:text-rose-400 font-bold">{missingFields.length} thông tin chưa nhận diện được</strong> (các ô có <strong className="text-rose-600 dark:text-rose-400">viền màu đỏ</strong> bên dưới). Bạn vui lòng nhập bổ sung bằng tay để tiếp tục.
            </p>
          </div>
        )}

        {/* Main Extracted Fields Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Type Selector (Chi Tiêu vs Thu Nhập) */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                txType === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Khoản Chi Tiêu
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                txType === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Khoản Thu Nhập
            </button>
          </div>

          {/* 1. Transaction Name / Merchant (with Red Highlight if missing) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-purple-600" />
                <span>Tên giao dịch / Đơn vị bán hàng (Name)</span>
              </label>
              {(missingFields.includes('name') || !txName.trim()) && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Thiếu tên giao dịch
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="VD: Siêu thị WinMart, Highlands Coffee, Tiền điện EVN..."
              value={txName}
              onChange={(e) => {
                setTxName(e.target.value);
                if (e.target.value.trim()) {
                  setMissingFields((prev) => prev.filter((f) => f !== 'name'));
                }
              }}
              className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 ${
                missingFields.includes('name') || !txName.trim()
                  ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
              }`}
            />
            {(missingFields.includes('name') || !txName.trim()) && (
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                ⚠️ Chưa quét được tên giao dịch - Bắt buộc nhập bằng tay
              </p>
            )}
          </div>

          {/* 2. Amount & Fee Grid (with Red Highlight if amount is missing) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tổng số tiền (Amount - VNĐ)</span>
                </label>
                {(missingFields.includes('amount') || !txAmount || parseFloat(txAmount) <= 0) && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Thiếu số tiền
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="VD: 185000"
                  value={txAmount}
                  onChange={(e) => {
                    setTxAmount(e.target.value);
                    if (e.target.value && parseFloat(e.target.value) > 0) {
                      setMissingFields((prev) => prev.filter((f) => f !== 'amount'));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    missingFields.includes('amount') || !txAmount || parseFloat(txAmount) <= 0
                      ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
              {(missingFields.includes('amount') || !txAmount || parseFloat(txAmount) <= 0) && (
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  ⚠️ Chưa có số tiền thanh toán - Bắt buộc nhập bằng tay
                </p>
              )}
            </div>

            {/* Fee / Surcharge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  <span>Phụ phí / Phí dịch vụ / VAT (Fee)</span>
                </label>
                {missingFields.includes('fee') && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Kiểm tra phí
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0 đ"
                  value={txFee}
                  onChange={(e) => {
                    setTxFee(e.target.value);
                    setMissingFields((prev) => prev.filter((f) => f !== 'fee'));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>
          </div>

          {/* 3. Date & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Transaction Date (with Red Highlight if missing) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ngày giao dịch (Date)</span>
                </label>
                {(missingFields.includes('date') || !txDate) && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Thiếu ngày
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => {
                  setTxDate(e.target.value);
                  if (e.target.value) {
                    setMissingFields((prev) => prev.filter((f) => f !== 'date'));
                  }
                }}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl transition-all focus:outline-none focus:ring-2 ${
                  missingFields.includes('date') || !txDate
                    ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                    : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
                }`}
              />
              {(missingFields.includes('date') || !txDate) && (
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  ⚠️ Chưa có ngày hóa đơn - Bắt buộc chọn ngày
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                <span>Danh mục chi tiêu</span>
              </label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableCategories
                  .filter((c) => (txType === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ghi chú bổ sung / Chi tiết mặt hàng</span>
            </label>
            <input
              type="text"
              placeholder="VD: Mua thực phẩm tươi sống cuối tuần..."
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Total Confirmation Card */}
          {parseFloat(txAmount) > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Số tiền ghi nhận:
                </span>
                <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300 font-display">
                  {formatCurrency(parseFloat(txAmount) || 0, 'VND')}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Danh mục:
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {txCategory || 'Chung'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isScanning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu giao dịch...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận & Lưu Giao Dịch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
