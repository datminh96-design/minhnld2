import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Receipt,
  RotateCw,
  RefreshCw,
  X,
  Store,
  Percent,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Zap,
  ShoppingBag,
  Coffee,
  Car,
  Building2,
  Tv,
  Check,
  SwitchCamera,
  SlidersHorizontal,
  ChevronDown,
  Activity
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ExpenseCategory, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { billScannerService, ExtractedExpenseData } from '../services/billScannerService';
import { ReceiptDiagnosticModal } from './ReceiptDiagnosticModal';

export interface ExpenseScannerProps {
  onAddRecord?: (data: {
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
    fee?: number;
    type?: 'expense' | 'income';
  }) => Promise<void> | void;
  onClose?: () => void;
  isOpen?: boolean;
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

  // 2. ISO timestamp format: 2026-10-07T... or 2026-10-07 09:00:57
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed)) {
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
    if (parts[1] && parts[1].length === 3 && parseInt(parts[0], 10) > 0 && !str.startsWith('0,')) {
      str = parts.join('');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts[1] && parts[1].length === 3 && parts.length === 2 && parseInt(parts[0], 10) > 0 && !str.startsWith('0.')) {
      str = parts.join('');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
};

export const ExpenseScanner: React.FC<ExpenseScannerProps> = ({
  onAddRecord,
  onClose,
  isOpen = true,
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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form Field States (Extracted details: merchant/name, amount, date, fee, category, type)
  const [txMerchant, setTxMerchant] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txFee, setTxFee] = useState('0');
  const [txCategory, setTxCategory] = useState(defaultCategory || 'Ăn uống');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txNotes, setTxNotes] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [scannedTotalQty, setScannedTotalQty] = useState<number | null>(null);
  const [rawDebugJson, setRawDebugJson] = useState<string>('');
  const [isDebugModeOpen, setIsDebugModeOpen] = useState<boolean>(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);
  const [copiedDebug, setCopiedDebug] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAddAfterScan, setAutoAddAfterScan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Category
  useEffect(() => {
    if (availableCategories.length > 0 && !txCategory) {
      const firstExp = availableCategories.find((c) => c.type === 'expense');
      setTxCategory(firstExp ? firstExp.name : availableCategories[0].name);
    }
  }, [availableCategories, txCategory]);

  // Clean up camera stream on unmount
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Handle Camera initialization
  const startCamera = async () => {
    try {
      stopCameraStream();
      setScanError(null);

      // Enumerate video devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCameraDevices(videoInputs);
      }

      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Cannot open camera:', err);
      setScanError('Không thể mở camera. Vui lòng cấp quyền truy cập máy ảnh hoặc tải ảnh từ máy.');
      setIsCameraActive(false);
    }
  };

  // Capture frame from live video
  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCameraStream();
    setScannedImagePreview(dataUrl);
    setRotationAngle(0);
    handleProcessScan(dataUrl);
  };

  // Rotate image helper
  const handleRotateImage = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
  };

  // Main Bill Scanning Method with Multi-Layout Extraction
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
        },
        selectedModel
      );

      if (result.success && result.data) {
        const data = result.data;
        const rawJsonString = result.raw_output || JSON.stringify(data, null, 2);
        setRawDebugJson(rawJsonString);

        // 🔍 DEBUG MODE: Console log the raw JSON output from Gemini API before app processing
        console.group('🔍 [Expense Scanner DEBUG MODE] Raw Gemini JSON Output');
        console.log('Model Used:', result.used_model || selectedModel);
        console.log('Raw JSON from Gemini:', rawJsonString);
        console.log('Extracted items array:', data.items);
        console.log('Extracted total_quantity:', data.total_quantity);
        console.log('Parsed data object:', data);
        console.groupEnd();

        setScanSuccess(true);
        setScanConfidence(data.confidence || 95);
        setDetectedLayout(data.document_layout || 'general');
        setLayoutLabel(data.layout_label || 'Hóa đơn chung');

        // 1. Merchant / Store Name
        if (data.name && data.name.trim()) {
          setTxMerchant(data.name.trim());
        }

        // 2. Amount Extraction
        const normalizedAmount = parseFlexibleAmount(data.amount);
        if (normalizedAmount !== null && normalizedAmount > 0) {
          setTxAmount(normalizedAmount.toString());
        } else {
          setTxAmount('');
        }

        // 3. Date Extraction
        const normalizedDate = parseFlexibleDateToISO(data.transaction_date);
        if (normalizedDate) {
          setTxDate(normalizedDate);
        }

        // 4. Fee & Tax
        const normalizedFee = parseFlexibleAmount(data.fee);
        if (normalizedFee !== null && normalizedFee >= 0) {
          setTxFee(normalizedFee.toString());
        } else {
          setTxFee('0');
        }

        // 5. Category Mapping
        if (data.category) {
          const cleanCat = data.category.trim().toLowerCase();
          const matched = availableCategories.find(
            (c) =>
              c.name.toLowerCase() === cleanCat ||
              cleanCat.includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(cleanCat)
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

        // 7. Line Items & Quantities
        if (Array.isArray(data.items) && data.items.length > 0) {
          setScannedItems(data.items);
          setScannedTotalQty(data.total_quantity || data.items.reduce((s, it) => s + (it.quantity || 1), 0));
        } else {
          setScannedItems([]);
          setScannedTotalQty(null);
        }

        // 8. Notes & Summary
        const noteSegments: string[] = [];
        if (data.items_summary && data.items_summary.trim()) {
          noteSegments.push(`Chi tiết: ${data.items_summary.trim()}`);
        }
        if (data.tax && data.tax > 0) {
          noteSegments.push(`VAT: ${formatCurrency(data.tax)}`);
        }
        if (data.notes && data.notes.trim()) {
          noteSegments.push(data.notes.trim());
        }
        if (noteSegments.length > 0) {
          setTxNotes(noteSegments.join(' • '));
        }

        // 9. Missing Required Fields Inspection
        const currentMissing: string[] = [];
        if (!data.name || !data.name.trim()) currentMissing.push('name');
        if (normalizedAmount === null || normalizedAmount <= 0) currentMissing.push('amount');
        if (!normalizedDate) currentMissing.push('transaction_date');
        setMissingFields(currentMissing);

        addToast(
          currentMissing.length === 0
            ? 'Đã bóc tách dữ liệu hóa đơn thành công 100%!'
            : `Đã đọc hóa đơn, còn ${currentMissing.length} thông tin cần bổ sung`,
          currentMissing.length === 0 ? 'success' : 'info'
        );
      } else {
        throw new Error(result.error || 'Không nhận diện được nội dung từ hóa đơn.');
      }
    } catch (err: any) {
      console.error('[ExpenseScanner] Scan error:', err);
      setScanError(err?.message || 'Có lỗi xảy ra trong quá trình nhận diện hóa đơn.');
      setScanSuccess(false);
      addToast('Lỗi khi quét hóa đơn. Bạn có thể nhập tay thông tin bên dưới.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Clipboard Paste Support (Ctrl+V / Command+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleProcessScan(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Preset Sample Bills for 1-Click Fast Verification
  const handleSampleBill = async (type: 'supermarket' | 'highlands' | 'grab' | 'utility' | 'shopee') => {
    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText('Đang nạp dữ liệu hóa đơn mẫu...');
    setScanError(null);
    setScanSuccess(false);
    setMissingFields([]);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 750;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (type === 'supermarket') {
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('SIÊU THỊ WINMART+ NGUYỄN HUỆ', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('HÓA ĐƠN BÁN LẺ - SỐ: HD-8849204', 40, 80);
        ctx.fillText('Ngày: 07/10/2026 18:45:12 | Thu ngân: Mai Anh', 40, 105);
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(40, 120);
        ctx.lineTo(710, 120);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = '15px sans-serif';
        ctx.fillText('1. Sữa tươi tiệt trùng Vinamilk 1L (x2): 72,000 đ', 40, 155);
        ctx.fillText('2. Trứng gà Ba Huân hộp 10 quả: 34,000 đ', 40, 185);
        ctx.fillText('3. Thịt nạc heo CP 500g: 85,000 đ', 40, 215);
        ctx.fillText('4. Bánh mì sandwich tươi: 24,000 đ', 40, 245);

        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#b91c1c';
        ctx.fillText('TỔNG CỘNG THANH TOÁN: 215,000 VND', 40, 315);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('Phương thức: Thẻ Vietcombank Contactless (Đã thanh toán)', 40, 355);
      } else if (type === 'highlands') {
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('HIGHLANDS COFFEE - VINCOM PLAZA', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('PHIẾU THANH TOÁN - BÀN: T2-08 | 07/10/2026 09:15', 40, 80);

        ctx.fillStyle = '#1e293b';
        ctx.font = '15px sans-serif';
        ctx.fillText('1. Phin Sữa Đá (Size L): 45,000 đ', 40, 155);
        ctx.fillText('2. Trà Sen Vàng (Size M): 55,000 đ', 40, 185);
        ctx.fillText('3. Bánh Mì Que Gà Phô Mai: 25,000 đ', 40, 215);

        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#991b1b';
        ctx.fillText('TỔNG CỘNG: 125,000 VND', 40, 315);
      } else if (type === 'grab') {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('GRAB VIỆT NAM - BIÊN LAI CHUYẾN ĐI', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Dịch vụ: GrabCar 4 chỗ | Ngày: 07/10/2026 08:30', 40, 80);
        ctx.fillStyle = '#1e293b';
        ctx.font = '15px sans-serif';
        ctx.fillText('Điểm đón: 120 Hai Bà Trưng, Q.1', 40, 155);
        ctx.fillText('Điểm đến: Sân bay Quốc tế Tân Sơn Nhất', 40, 185);
        ctx.fillText('Cước phí chuyến đi: 135,000 đ | Phí cầu đường/sân bay: 15,000 đ', 40, 215);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('TỔNG THANH TOÁN: 150,000 VND', 40, 315);
      } else if (type === 'shopee') {
        ctx.fillStyle = '#ea580c';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('SHOPEE VIỆT NAM - CHI TIẾT ĐƠN HÀNG', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Mã đơn hàng: 261007SPX994 | Ngày: 07/10/2026', 40, 80);
        ctx.fillStyle = '#1e293b';
        ctx.font = '15px sans-serif';
        ctx.fillText('Sản phẩm: Bộ chuột bàn phím Bluetooth không dây', 40, 155);
        ctx.fillText('Tiền hàng: 420,000 đ | Phí vận chuyển: 25,000 đ', 40, 185);
        ctx.fillText('Voucher giảm giá: -30,000 đ', 40, 215);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ea580c';
        ctx.fillText('TỔNG THANH TOÁN: 415,000 VND', 40, 315);
      } else {
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('EVN - TỔNG CÔNG TY ĐIỆN LỰC TP.HCM', 40, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('GIẤY BÁO TIỀN ĐIỆN KỲ 10/2026 | Ngày: 07/10/2026', 40, 80);
        ctx.fillStyle = '#1e293b';
        ctx.font = '15px sans-serif';
        ctx.fillText('Mã khách hàng: PE01000847291 | Chỉ số tiêu thụ: 342 kWh', 40, 155);
        ctx.fillText('Tiền điện: 873,818 đ | Thuế VAT 10%: 87,382 đ', 40, 185);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#0284c7';
        ctx.fillText('TỔNG CỘNG TIỀN THANH TOÁN: 961,200 VND', 40, 315);
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

  // Submit Handler: Add record to financial database
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFlexibleAmount(txAmount);
    if (!numAmount || numAmount <= 0) {
      setMissingFields((prev) => (prev.includes('amount') ? prev : [...prev, 'amount']));
      addToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'warning');
      return;
    }

    if (!txMerchant.trim()) {
      setMissingFields((prev) => (prev.includes('name') ? prev : [...prev, 'name']));
      addToast('Vui lòng nhập tên đơn vị / đơn vị nhận thanh toán', 'warning');
      return;
    }

    const numFee = parseFlexibleAmount(txFee) || 0;
    setIsSubmitting(true);

    try {
      const finalCategory = txCategory || (txType === 'income' ? 'Lương' : 'Ăn uống');
      const finalNote = txNotes.trim()
        ? `${txMerchant.trim()} | ${txNotes.trim()}`
        : txMerchant.trim();

      if (onAddRecord) {
        await onAddRecord({
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

      addToast('Đã lưu giao dịch vào sổ tài chính thành công!', 'success');

      if (onClose) {
        onClose();
      } else {
        // Reset form for next scan in standalone mode
        setTxAmount('');
        setTxMerchant('');
        setTxNotes('');
        setScannedImagePreview(null);
        setScanSuccess(false);
      }
    } catch (err: any) {
      console.error('[ExpenseScanner] Save error:', err);
      addToast('Không thể lưu giao dịch. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ========================================================================= */}
      {/* 📸 AI OCR BILL SCANNER SECTION                                            */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-slate-50 dark:to-slate-900/60 p-4 sm:p-5 space-y-4 shadow-sm transition-all">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  📸 AI Expense Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs">
                  Gemini Vision OCR
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động chụp hoặc tải ảnh hóa đơn để bóc tách Cửa hàng, Số tiền, Ngày và Danh mục
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Live Camera Viewfinder or Dropzone */}
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-purple-500 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-72 sm:h-80 object-cover"
            />
            {/* Viewfinder Target Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-48 sm:w-80 sm:h-56 border-2 border-dashed border-purple-400/80 rounded-xl flex items-center justify-center">
                <span className="text-white/80 text-xs px-2 py-1 bg-black/60 rounded backdrop-blur-xs">
                  Đặt hóa đơn vừa khung hình
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 text-white text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy Camera
              </button>
              <button
                type="button"
                onClick={capturePhotoFromCamera}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Chụp & Phân Tích</span>
              </button>
            </div>
          </div>
        ) : (
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
                : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-white/70 dark:bg-slate-800/70 shadow-xs'
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
                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-md transition-transform duration-300"
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
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-slate-200">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span>Đã nạp ảnh hóa đơn</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhấp vào đây để chọn ảnh khác hoặc dán ảnh chụp màn hình bằng <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl+V</kbd>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kéo thả ảnh hóa đơn vào đây hoặc <span className="text-purple-600 dark:text-purple-400 underline">chọn từ thiết bị</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ WinMart, Highlands, Shopee, Grab, EVN... hoặc dán nhanh bằng <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl+V</kbd>
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Mở Camera Quét Trực Tiếp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Model Selector & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Model AI Phân Tích:</span>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-purple-300 dark:border-purple-700 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
          >
            <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (🆓 Miễn phí • Siêu tốc 1.1s)</option>
            <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash (🆓 Miễn phí • Bóc tách số chuẩn)</option>
            <option value="gemini-3.8-flash">🚀 Gemini 3.8 Flash (🆓 Miễn phí • Thị giác mới nhất)</option>
            <option value="gemini-flash-latest">🧠 Gemini Flash Latest (🆓 Miễn phí • Tự động)</option>
            <option value="gemini-3.7-flash">🎯 Gemini 3.7 Flash (🆓 Miễn phí • Đa nhiệm)</option>
          </select>
        </div>

        {/* Quick Sample Receipts Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Thử hóa đơn mẫu:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSampleBill('supermarket')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              🛒 Siêu thị WinMart
            </button>
            <button
              type="button"
              onClick={() => handleSampleBill('highlands')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              ☕ Highlands Coffee
            </button>
            <button
              type="button"
              onClick={() => handleSampleBill('grab')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              🚗 GrabCar
            </button>
            <button
              type="button"
              onClick={() => handleSampleBill('shopee')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              📦 Shopee
            </button>
            <button
              type="button"
              onClick={() => handleSampleBill('utility')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              ⚡ Tiền điện EVN
            </button>
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        {isScanning && (
          <div className="space-y-2 p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                {scanStatusText || 'AI đang phân tích chữ & số trên hóa đơn...'}
              </span>
              <span className="font-mono text-purple-600 dark:text-purple-400">{scanProgress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Result Status Banner */}
        {scanSuccess && !isScanning && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã bóc tách dữ liệu từ hóa đơn thành công!
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px]">
                Độ tin cậy: {scanConfidence}%
              </span>
            </div>
            {layoutLabel && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Bố cục nhận diện:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium">
                    {layoutLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDiagnosticModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer"
                  >
                    <Activity className="w-3 h-3 text-purple-600" />
                    <span>🔬 Nhật Ký Chẩn Đoán</span>
                  </button>

                  {rawDebugJson && (
                    <button
                      type="button"
                      onClick={() => setIsDebugModeOpen(!isDebugModeOpen)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>{isDebugModeOpen ? 'Ẩn Debug JSON' : '🛠️ Debug Mode (Xem JSON Gốc)'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Debug Mode Viewer: Raw JSON Output from Gemini API */}
        {isDebugModeOpen && rawDebugJson && (
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 space-y-2 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span>🔍 RAW GEMINI API JSON OUTPUT</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(rawDebugJson);
                    setCopiedDebug(true);
                    setTimeout(() => setCopiedDebug(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-sans font-semibold border border-slate-600 cursor-pointer flex items-center gap-1"
                >
                  {copiedDebug ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                  <span>{copiedDebug ? 'Đã sao chép' : 'Sao chép JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDebugModeOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <pre className="p-2.5 rounded-lg bg-slate-950/80 overflow-x-auto text-[11px] text-emerald-300 leading-relaxed max-h-60 overflow-y-auto">
              {rawDebugJson}
            </pre>
            <p className="text-[10px] text-slate-400 font-sans">
              💡 Bạn cũng có thể mở <kbd className="px-1 py-0.5 bg-slate-800 rounded">F12 &gt; Console</kbd> để xem log nhóm chi tiết: <code className="text-emerald-400 font-mono">[Expense Scanner DEBUG MODE]</code>.
            </p>
          </div>
        )}

        {/* Scan Error Banner */}
        {scanError && !isScanning && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Thông Báo Quét Hóa Đơn</span>
              </span>
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
              {scanError}
            </p>
            {(scanError.includes('GEMINI_API_KEY') || scanError.includes('API key') || scanError.includes('cấu hình')) && (
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 space-y-2">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  💡 Dán khóa Gemini API Key miễn phí (từ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-purple-600 underline">aistudio.google.com/apikey</a>) để quét trực tiếp trên Vercel:
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="password"
                    placeholder="Dán khóa API (AIzaSy...)"
                    defaultValue={typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''}
                    id="custom_user_gemini_key_expense"
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById('custom_user_gemini_key_expense') as HTMLInputElement;
                      if (inputEl?.value) {
                        localStorage.setItem('gemini_api_key', inputEl.value.trim());
                        setScanError(null);
                        if (scannedImagePreview) handleProcessScan(scannedImagePreview);
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Lưu & Quét Lại
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Missing Fields Warning Banner */}
        {missingFields.length > 0 && !isScanning && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Hóa đơn còn {missingFields.length} thông tin chưa rõ (các ô viền đỏ bên dưới). Vui lòng bổ sung để lưu vào sổ:
              </span>
            </div>
          </div>
        )}

        {/* Scan Error Banner */}
        {scanError && !isScanning && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {scanError}
            </span>
            <button
              type="button"
              onClick={() => handleSampleBill('supermarket')}
              className="text-[11px] font-bold text-rose-700 dark:text-rose-300 underline cursor-pointer"
            >
              Thử mẫu
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📝 FINANCIAL RECORD FORM (PRE-FILLED & VALIDATED)                         */}
      {/* ========================================================================= */}
      <form onSubmit={handleSaveRecord} className="space-y-4">
        {/* Type Toggle: Expense / Income */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTxType('expense')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              txType === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Khoản Chi Tiêu</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('income')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              txType === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Khoản Thu Nhập</span>
          </button>
        </div>

        {/* Row 1: Merchant/Name & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-purple-600" />
                Cửa hàng / Đơn vị nhận tiền: <span className="text-rose-500">*</span>
              </span>
              {missingFields.includes('name') && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Thiếu tên đơn vị
                </span>
              )}
            </label>
            <input
              type="text"
              value={txMerchant}
              onChange={(e) => {
                setTxMerchant(e.target.value);
                if (e.target.value.trim()) {
                  setMissingFields((prev) => prev.filter((f) => f !== 'name'));
                }
              }}
              placeholder="VD: Siêu thị WinMart, Highlands Coffee, GrabCar..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm border focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all ${
                missingFields.includes('name')
                  ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/20'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Ngày giao dịch: <span className="text-rose-500">*</span>
              </span>
              {missingFields.includes('transaction_date') && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Thiếu ngày
                </span>
              )}
            </label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => {
                setTxDate(e.target.value);
                if (e.target.value) {
                  setMissingFields((prev) => prev.filter((f) => f !== 'transaction_date'));
                }
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm border focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all ${
                missingFields.includes('transaction_date')
                  ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/20'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
          </div>
        </div>

        {/* Row 2: Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Số tiền thanh toán (VND): <span className="text-rose-500">*</span>
              </span>
              {missingFields.includes('amount') && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Thiếu số tiền
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={txAmount}
                onChange={(e) => {
                  setTxAmount(e.target.value);
                  const parsed = parseFlexibleAmount(e.target.value);
                  if (parsed && parsed > 0) {
                    setMissingFields((prev) => prev.filter((f) => f !== 'amount'));
                  }
                }}
                placeholder="VD: 205000 hoặc 205.000"
                className={`w-full px-3.5 py-2.5 pr-14 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold border focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all ${
                  missingFields.includes('amount')
                    ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/20'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VND
              </span>
            </div>
            {parseFlexibleAmount(txAmount) ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                ≈ {formatCurrency(parseFlexibleAmount(txAmount) || 0)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              Danh mục: <span className="text-rose-500">*</span>
            </label>
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.type === 'expense' ? 'Chi' : 'Thu'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Extracted Line Items with Quantity badges */}
        {scannedItems.length > 0 && (
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-950 dark:text-purple-200">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                Danh Sách Mặt Hàng Đã Bóc Tách ({scannedItems.length} món)
              </span>
              {scannedTotalQty !== null && (
                <span className="px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[10px] font-bold">
                  Tổng SL: {scannedTotalQty}
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {scannedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] shrink-0">
                      x{item.quantity || 1}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    {item.unit && (
                      <span className="text-[10px] text-slate-400">({item.unit})</span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {item.total_price ? (
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.total_price)}
                      </span>
                    ) : item.unit_price ? (
                      <span className="text-slate-500 text-[11px]">
                        @{formatCurrency(item.unit_price)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Notes & Itemized details */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            Ghi chú & Chi tiết món hàng:
          </label>
          <textarea
            value={txNotes}
            onChange={(e) => setTxNotes(e.target.value)}
            rows={2}
            placeholder="Chi tiết món hàng trên hóa đơn..."
            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isScanning}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu vào sổ...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Lưu Vào Sổ Chi Tiêu</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* OCR Diagnostic & Request/Response Logger Modal */}
      {isDiagnosticModalOpen && (
        <ReceiptDiagnosticModal
          isOpen={isDiagnosticModalOpen}
          onClose={() => setIsDiagnosticModalOpen(false)}
        />
      )}
    </div>
  );
};
