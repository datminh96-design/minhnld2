import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { InvestmentAsset, InvestmentTxType, InvestmentTransaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { priceService } from '../../services/priceService';
import { billScannerService, ExtractedBillData } from '../../services/billScannerService';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles, 
  Coins, 
  RefreshCw, 
  DollarSign, 
  Gift, 
  Info, 
  CheckCircle2, 
  Camera, 
  Upload, 
  FileText, 
  AlertTriangle, 
  AlertCircle, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Check, 
  Copy 
} from 'lucide-react';

interface InvestmentTxModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  investmentAssets: InvestmentAsset[];
  selectedAsset?: InvestmentAsset;
  initialAssetId?: string;
  editingTransaction?: InvestmentTransaction | null;
  initialUsdtRate?: number;
  initialOpenScanner?: boolean;
  onSaveAsset?: (asset: Partial<InvestmentAsset>) => Promise<void>;
  onSave: (data: Partial<InvestmentTransaction> & {
    id?: string;
    asset_id: string;
    transaction_type: InvestmentTxType;
    dividend_type?: 'cash' | 'stock';
    tx_type?: InvestmentTxType;
    quantity: number;
    units?: number;
    price: number;
    price_per_unit?: number;
    total_amount?: number;
    fee: number;
    transaction_date: string;
    tx_date?: string;
    note?: string;
    notes?: string;
    fee_currency?: 'VND' | 'USDT' | 'BNB';
    exchange_rate?: number;
  }) => Promise<void>;
}

export const InvestmentTxModalForm: React.FC<InvestmentTxModalFormProps> = ({
  isOpen,
  onClose,
  investmentAssets,
  selectedAsset,
  initialAssetId,
  editingTransaction,
  initialUsdtRate = 25400,
  initialOpenScanner = false,
  onSaveAsset,
  onSave,
}) => {
  const [txType, setTxType] = useState<InvestmentTxType>('buy');
  const [dividendType, setDividendType] = useState<'cash' | 'stock'>('cash');
  const [dividendCalcMode, setDividendCalcMode] = useState<'direct' | 'per_share'>('direct');
  
  const [txAssetId, setTxAssetId] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txQuantity, setTxQuantity] = useState<string>('');
  const [txPrice, setTxPrice] = useState<string>('');
  const [txPriceCurrency, setTxPriceCurrency] = useState<'VND' | 'USDT'>('VND');
  const [txFee, setTxFee] = useState<string>('0');
  const [txFeeCurrency, setTxFeeCurrency] = useState<'VND' | 'USDT' | 'BNB'>('VND');
  const [txNotes, setTxNotes] = useState<string>('');
  const [usdtRate, setUsdtRate] = useState<number>(initialUsdtRate);
  const [bnbPriceUsdt, setBnbPriceUsdt] = useState<number>(580);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI OCR Bill Scanner States
  const [isScanPanelOpen, setIsScanPanelOpen] = useState(initialOpenScanner);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedBillPreview, setScannedBillPreview] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [scannedSummary, setScannedSummary] = useState<string | null>(null);
  const [scannedBroker, setScannedBroker] = useState<string | null>(null);
  const [unmatchedSymbolPrompt, setUnmatchedSymbolPrompt] = useState<{ symbol: string; name?: string; type?: string; price?: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Specific state for cash dividend calculation
  const [cashDividendTotal, setCashDividendTotal] = useState<string>('');
  const [cashDividendPerShare, setCashDividendPerShare] = useState<string>('');
  const [dividendSharesCount, setDividendSharesCount] = useState<string>('');

  const prevIsOpenRef = React.useRef(false);
  const prevEditingTxIdRef = React.useRef<string | undefined>(undefined);

  // Scan file handler
  const handleScanFile = async (fileOrBase64: File | string) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatusText('Đang nạp ảnh hóa đơn / lệnh khớp...');
    setScanError(null);
    setScanSuccess(false);
    setMissingFields([]);
    setScannedSummary(null);
    setUnmatchedSymbolPrompt(null);

    try {
      if (typeof fileOrBase64 !== 'string') {
        const preview = await billScannerService.fileToBase64(fileOrBase64);
        setScannedBillPreview(preview);
      } else {
        setScannedBillPreview(fileOrBase64);
      }

      const result = await billScannerService.scanBill(fileOrBase64, investmentAssets, (pct, status) => {
        setScanProgress(pct);
        setScanStatusText(status);
      });

      if (result.success && result.data) {
        const data = result.data;
        setScanSuccess(true);
        setScanProgress(100);
        setScanConfidence(data.confidence || 95);
        setScannedBroker(data.broker_name || null);

        // 1. Asset matching
        let matchedAssetId = '';
        let isCrypto = false;
        if (data.asset_symbol) {
          const cleanSymbol = data.asset_symbol.trim().toUpperCase();
          const matched = investmentAssets.find(
            (a) =>
              a.asset_symbol.trim().toUpperCase() === cleanSymbol ||
              a.asset_name.toLowerCase().includes(cleanSymbol.toLowerCase()) ||
              cleanSymbol.includes(a.asset_symbol.trim().toUpperCase())
          );
          if (matched) {
            matchedAssetId = matched.id;
            setTxAssetId(matched.id);
            isCrypto =
              matched.asset_type === 'crypto' ||
              ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'DOT', 'NEAR', 'SUI'].includes(matched.asset_symbol.toUpperCase());
          } else {
            // Prompt to quickly create asset
            isCrypto = data.asset_type === 'crypto' || ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA'].includes(cleanSymbol);
            setUnmatchedSymbolPrompt({
              symbol: cleanSymbol,
              name: data.asset_name || `${cleanSymbol}`,
              type: data.asset_type || (isCrypto ? 'crypto' : 'stock'),
              price: data.price_per_unit || 0,
            });
          }
        }

        // 2. Transaction type
        if (data.transaction_type) {
          setTxType(data.transaction_type);
        }

        // 3. Quantity
        if (data.quantity !== null && data.quantity !== undefined && data.quantity > 0) {
          setTxQuantity(data.quantity.toString());
        } else {
          setTxQuantity('');
        }

        // 4. Price per unit
        if (data.price_per_unit !== null && data.price_per_unit !== undefined && data.price_per_unit > 0) {
          setTxPrice(data.price_per_unit.toString());
        } else {
          setTxPrice('');
        }

        // 5. Currency
        if (data.currency === 'USDT' || data.currency === 'USD' || isCrypto) {
          setTxPriceCurrency('USDT');
        } else {
          setTxPriceCurrency('VND');
        }

        // 6. Fee & Fee Currency
        if (data.fee !== null && data.fee !== undefined) {
          setTxFee(data.fee.toString());
        }
        if (data.fee_currency === 'BNB') {
          setTxFeeCurrency('BNB');
        } else if (data.fee_currency === 'USDT' || data.fee_currency === 'USD') {
          setTxFeeCurrency('USDT');
        } else if (data.fee_currency === 'VND') {
          setTxFeeCurrency('VND');
        } else if (isCrypto) {
          setTxFeeCurrency('BNB');
        }

        // 7. Transaction Date
        if (data.transaction_date) {
          setTxDate(data.transaction_date);
        }

        // 8. Notes & Broker
        const noteParts: string[] = [];
        if (data.broker_name) noteParts.push(`Sàn/CTCK: ${data.broker_name}`);
        if (data.order_id) noteParts.push(`Mã lệnh: ${data.order_id}`);
        if (data.notes) noteParts.push(data.notes);
        if (noteParts.length > 0) {
          setTxNotes(noteParts.join(' | '));
        }

        // 9. Re-evaluate missing fields
        const detectedMissing: string[] = [];
        if (!matchedAssetId) detectedMissing.push('asset_symbol');
        if (!data.quantity || data.quantity <= 0) detectedMissing.push('quantity');
        if (!data.price_per_unit || data.price_per_unit <= 0) detectedMissing.push('price_per_unit');
        if (!data.transaction_date) detectedMissing.push('transaction_date');

        setMissingFields(detectedMissing);
        const currDisplay = (data.currency === 'USDT' || isCrypto) ? 'USDT' : 'VND';
        setScannedSummary(
          `Đã quét: ${data.asset_symbol || 'Tài sản'} • ${data.transaction_type === 'buy' ? 'MUA' : 'BÁN'}` +
            (data.quantity ? ` • SL: ${data.quantity}` : '') +
            (data.price_per_unit ? ` • Giá: ${data.price_per_unit.toLocaleString('vi-VN')} ${currDisplay}` : '') +
            (data.broker_name ? ` • Sàn: ${data.broker_name}` : '')
        );
      } else {
        setScanError(result.error || 'AI không nhận diện được hóa đơn này. Vui lòng điền tay.');
        setMissingFields(['asset_symbol', 'quantity', 'price_per_unit', 'transaction_date']);
      }
    } catch (err: any) {
      setScanError(err?.message || 'Lỗi khi quét ảnh hóa đơn');
      setMissingFields(['asset_symbol', 'quantity', 'price_per_unit', 'transaction_date']);
    } finally {
      setIsScanning(false);
    }
  };

  // Handler to auto-create asset from scanned bill if not existing
  const handleCreateAssetFromBill = async () => {
    if (!unmatchedSymbolPrompt || !onSaveAsset) return;
    try {
      const newAsset = {
        asset_symbol: unmatchedSymbolPrompt.symbol,
        asset_name: unmatchedSymbolPrompt.name || unmatchedSymbolPrompt.symbol,
        asset_type: (unmatchedSymbolPrompt.type as any) || 'stock',
        current_price: unmatchedSymbolPrompt.price || 0,
        currency: txPriceCurrency,
      };
      await onSaveAsset(newAsset);
      setUnmatchedSymbolPrompt(null);
      setMissingFields((prev) => prev.filter((f) => f !== 'asset_symbol'));
    } catch (e) {
      console.warn('Could not auto create asset:', e);
    }
  };

  // Paste screenshot event listener
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setIsScanPanelOpen(true);
            handleScanFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, investmentAssets]);

  // Demo sample bill test for 3 realistic document layouts
  const handleSampleBillTest = async (type: 'binance' | 'tcbs' | 'sjc' = 'binance') => {
    setIsScanPanelOpen(true);
    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText('Đang nạp ảnh hóa đơn mẫu...');
    setScanError(null);
    setScanSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 460;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (type === 'binance') {
          // Dark Theme Binance App Layout
          ctx.fillStyle = '#181a20';
          ctx.fillRect(0, 0, 640, 460);
          ctx.fillStyle = '#f0b90b';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('BINANCE SPOT - LỊCH SỬ GIAO DỊCH', 40, 50);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#0ecb81';
          ctx.fillText('LỆNH MUA (BUY) - BTC / USDT', 40, 90);
          ctx.fillStyle = '#eaecef';
          ctx.font = '15px sans-serif';
          ctx.fillText('Cặp giao dịch: BTC/USDT', 40, 135);
          ctx.fillText('Khối lượng khớp (Filled): 0.00102 BTC', 40, 175);
          ctx.fillText('Đơn giá khớp (Price): 84,300.00 USDT', 40, 215);
          ctx.fillText('Phí giao dịch (Fee): 0.00008404 BNB', 40, 255);
          ctx.fillText('Tổng giá trị (Total): 85.986 USDT', 40, 295);
          ctx.fillText(`Thời gian: ${todayStr} 09:00:57`, 40, 335);
          ctx.fillStyle = '#848e9c';
          ctx.font = '13px sans-serif';
          ctx.fillText('Mã lệnh / Order ID: 67232813680', 40, 380);
          ctx.fillText('Trạng thái: Khớp hoàn toàn (Filled 100%)', 40, 410);
        } else if (type === 'sjc') {
          // Gold Invoice Layout
          ctx.fillStyle = '#fffdf0';
          ctx.fillRect(0, 0, 640, 460);
          ctx.fillStyle = '#b45309';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('CÔNG TY VÀNG BẠC ĐÁ QUÝ SÀI GÒN - SJC', 40, 50);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#059669';
          ctx.fillText('HÓA ĐƠN BÁN LẺ VÀNG MIẾNG', 40, 90);
          ctx.fillStyle = '#1e293b';
          ctx.font = '15px sans-serif';
          ctx.fillText('Mặt hàng: Vàng miếng SJC 99.99 (Mã: SJC)', 40, 135);
          ctx.fillText('Loại giao dịch: MUA VÀNG (BUY)', 40, 175);
          ctx.fillText('Số lượng: 2 lượng (cây)', 40, 215);
          ctx.fillText('Đơn giá niêm yết: 89,500,000 VND / lượng', 40, 255);
          ctx.fillText('Phí gia công / Bảo hiểm: 0 VND', 40, 295);
          ctx.fillText('Tổng tiền thanh toán: 179,000,000 VND', 40, 335);
          ctx.fillText(`Ngày xuất hóa đơn: ${todayStr}`, 40, 375);
          ctx.fillStyle = '#64748b';
          ctx.font = '13px sans-serif';
          ctx.fillText('Số chứng từ: SJC-HN-20261007', 40, 415);
        } else {
          // TCBS Stock Order Layout
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 640, 460);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('CÔNG TY CỔ PHẦN CHỨNG KHOÁN TCBS', 40, 50);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#059669';
          ctx.fillText('KẾT QUẢ KHỚP LỆNH MUA CHỨNG KHOÁN', 40, 90);
          ctx.fillStyle = '#334155';
          ctx.font = '15px sans-serif';
          ctx.fillText('Mã cổ phiếu: HPG - CTCP Tập đoàn Hòa Phát', 40, 135);
          ctx.fillText('Loại lệnh: MUA (BUY) - Khớp 100%', 40, 175);
          ctx.fillText('Khối lượng khớp: 500 CP', 40, 215);
          ctx.fillText('Đơn giá khớp: 28,500 VND', 40, 255);
          ctx.fillText('Phí giao dịch: 15,000 VND', 40, 295);
          ctx.fillText('Tổng tiền khớp: 14,265,000 VND', 40, 335);
          ctx.fillText(`Ngày giao dịch: ${todayStr}`, 40, 375);
          ctx.fillStyle = '#64748b';
          ctx.font = '13px sans-serif';
          ctx.fillText('Mã lệnh: TCBS-89421598', 40, 415);
        }

        const sampleDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setScannedBillPreview(sampleDataUrl);
        await handleScanFile(sampleDataUrl);
      }
    } catch (err: any) {
      setScanError(err?.message || 'Lỗi khi tạo hóa đơn mẫu');
      setIsScanning(false);
    }
  };

  // Current selected asset object
  const currentAsset = useMemo(() => {
    return investmentAssets.find((a) => a.id === txAssetId) || selectedAsset;
  }, [investmentAssets, txAssetId, selectedAsset]);

  // Sync state ONLY when modal transitions from closed to open or editingTransaction changes
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isEditingTargetChanged = isOpen && editingTransaction?.id !== prevEditingTxIdRef.current;

    if (isOpening || isEditingTargetChanged) {
      if (initialOpenScanner) {
        setIsScanPanelOpen(true);
      }
      if (editingTransaction) {
        setTxAssetId(editingTransaction.asset_id);
        setTxType(editingTransaction.transaction_type);
        const isCash = editingTransaction.dividend_type === 'cash' || 
          (editingTransaction.transaction_type === 'dividend' && (editingTransaction.quantity === 0 || (editingTransaction.total_amount && editingTransaction.total_amount > 0 && editingTransaction.dividend_type !== 'stock')));
        setDividendType(isCash ? 'cash' : (editingTransaction.dividend_type || 'stock'));
        setDividendCalcMode('direct');
        setTxDate(editingTransaction.transaction_date ? editingTransaction.transaction_date.substring(0, 10) : new Date().toISOString().split('T')[0]);
        setTxQuantity(editingTransaction.quantity ? editingTransaction.quantity.toString() : '');
        
        const rawP = editingTransaction.original_price 
          ? editingTransaction.original_price.toString() 
          : (editingTransaction.price_per_unit || editingTransaction.price || '').toString();
        setTxPrice(rawP);
        setTxPriceCurrency(editingTransaction.price_currency || 'VND');

        const rawF = editingTransaction.original_fee !== undefined 
          ? editingTransaction.original_fee.toString() 
          : (editingTransaction.fee || 0).toString();
        setTxFee(rawF);
        setTxFeeCurrency(editingTransaction.fee_currency || 'VND');

        setTxNotes(editingTransaction.notes || editingTransaction.note || '');
        
        const rawCash = editingTransaction.total_amount 
          ? editingTransaction.total_amount.toString() 
          : (editingTransaction.price || '').toString();
        setCashDividendTotal(rawCash);
        setCashDividendPerShare('');
        setDividendSharesCount('');

        if (editingTransaction.usdt_rate) setUsdtRate(editingTransaction.usdt_rate);
        if (editingTransaction.bnb_price_usdt) setBnbPriceUsdt(editingTransaction.bnb_price_usdt);
      } else {
        const selectedId = selectedAsset?.id || initialAssetId || investmentAssets[0]?.id || '';
        setTxAssetId(selectedId);
        setTxType('buy');
        setDividendType('cash');
        setDividendCalcMode('direct');
        setTxDate(new Date().toISOString().split('T')[0]);
        setTxQuantity('');
        setTxFee('0');
        setTxNotes('');
        setCashDividendTotal('');
        setCashDividendPerShare('');
        setDividendSharesCount('');

        const selected = investmentAssets.find((a) => a.id === selectedId) || selectedAsset;
        if (selected) {
          const isCrypto =
            selected.asset_type === 'crypto' ||
            selected.asset_symbol === 'BTC' ||
            selected.asset_symbol === 'ETH';
          setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
          setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
          setTxPrice(selected.current_price?.toString() || '');
        } else {
          setTxPriceCurrency('VND');
          setTxFeeCurrency('VND');
          setTxPrice('');
        }
      }
    }
    prevIsOpenRef.current = isOpen;
    prevEditingTxIdRef.current = editingTransaction?.id;
  }, [isOpen, initialAssetId, selectedAsset, investmentAssets, editingTransaction]);

  const handleAssetChange = async (newAssetId: string) => {
    setTxAssetId(newAssetId);
    const selected = investmentAssets.find((a) => a.id === newAssetId);
    if (selected) {
      const isCrypto =
        selected.asset_type === 'crypto' ||
        selected.asset_symbol === 'BTC' ||
        selected.asset_symbol === 'ETH';
      setTxPriceCurrency(isCrypto ? 'USDT' : 'VND');
      setTxFeeCurrency(isCrypto ? 'BNB' : 'VND');
      if (isCrypto) {
        try {
          const [liveUsdt, liveBnb] = await Promise.all([
            priceService.fetchCryptoPriceUSDT(selected.asset_symbol),
            priceService.fetchCryptoPriceUSDT('BNB'),
          ]);
          if (liveUsdt) setTxPrice(liveUsdt.toString());
          if (liveBnb) setBnbPriceUsdt(liveBnb);
        } catch {
          setTxPrice(selected.current_price.toString());
        }
      } else {
        setTxPrice(selected.current_price.toString());
      }
    }
  };

  const calculatedValues = useMemo(() => {
    const rawF = parseFloat(txFee) || 0;
    let feeVnd = rawF;
    if (txFeeCurrency === 'USDT') feeVnd = rawF * usdtRate;
    else if (txFeeCurrency === 'BNB') feeVnd = rawF * bnbPriceUsdt * usdtRate;

    // 1. Dividend Logic
    if (txType === 'dividend') {
      if (dividendType === 'cash') {
        let grossCash = 0;
        if (dividendCalcMode === 'direct') {
          grossCash = parseFloat(cashDividendTotal) || 0;
        } else {
          const count = parseFloat(dividendSharesCount) || 0;
          const perShare = parseFloat(cashDividendPerShare) || 0;
          grossCash = count * perShare;
        }

        const grossCashVnd = txPriceCurrency === 'USDT' ? grossCash * usdtRate : grossCash;
        const netCashVnd = Math.max(0, grossCashVnd - feeVnd);
        const netCashUsdt = netCashVnd / (usdtRate || 25400);

        return {
          rawQty: 0,
          rawP: grossCashVnd,
          rawF,
          priceVnd: grossCashVnd,
          feeVnd,
          totalVnd: netCashVnd,
          totalUsdt: netCashUsdt,
          isCashDividend: true,
          netCashVnd,
        };
      } else {
        // Stock dividend (thưởng cổ phiếu / token, giá vốn 0đ)
        const rawQty = parseFloat(txQuantity) || 0;
        const totalVnd = feeVnd;
        const totalUsdt = feeVnd / (usdtRate || 25400);

        return {
          rawQty,
          rawP: 0,
          rawF,
          priceVnd: 0,
          feeVnd,
          totalVnd,
          totalUsdt,
          isCashDividend: false,
          netCashVnd: 0,
        };
      }
    }

    // 2. Regular Buy / Sell Logic
    const rawQty = parseFloat(txQuantity) || 0;
    const rawP = parseFloat(txPrice) || 0;
    const priceVnd = txPriceCurrency === 'USDT' ? rawP * usdtRate : rawP;
    const totalVnd = rawQty * priceVnd + (txType === 'buy' ? feeVnd : -feeVnd);
    const totalUsdt = totalVnd / (usdtRate || 25400);

    return {
      rawQty,
      rawP,
      rawF,
      priceVnd,
      feeVnd,
      totalVnd: Math.max(0, totalVnd),
      totalUsdt: Math.max(0, totalUsdt),
      isCashDividend: false,
      netCashVnd: 0,
    };
  }, [
    txType,
    dividendType,
    dividendCalcMode,
    cashDividendTotal,
    cashDividendPerShare,
    dividendSharesCount,
    txQuantity,
    txPrice,
    txFee,
    txPriceCurrency,
    txFeeCurrency,
    usdtRate,
    bnbPriceUsdt,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAssetId) return;

    const { rawQty, priceVnd, feeVnd, totalVnd, isCashDividend } = calculatedValues;

    if (txType === 'dividend' && isCashDividend) {
      if (priceVnd <= 0) return;
    } else {
      if (rawQty <= 0) return;
    }

    setIsSubmitting(true);
    try {
      const savePromise = onSave({
        id: editingTransaction ? editingTransaction.id : undefined,
        asset_id: txAssetId,
        transaction_type: txType,
        dividend_type: txType === 'dividend' ? dividendType : undefined,
        tx_type: txType,
        quantity: isCashDividend ? 0 : rawQty,
        units: isCashDividend ? 0 : rawQty,
        price: isCashDividend ? priceVnd : priceVnd,
        price_per_unit: isCashDividend ? priceVnd : priceVnd,
        total_amount: isCashDividend ? totalVnd : totalVnd,
        fee: feeVnd,
        transaction_date: txDate,
        tx_date: txDate,
        note: txNotes || (txType === 'dividend' ? (dividendType === 'cash' ? 'Nhận cổ tức tiền mặt (tính vào chốt lời)' : 'Nhận cổ tức cổ phiếu/thưởng') : ''),
        notes: txNotes || (txType === 'dividend' ? (dividendType === 'cash' ? 'Nhận cổ tức tiền mặt (tính vào chốt lời)' : 'Nhận cổ tức cổ phiếu/thưởng') : ''),
        fee_currency: txFeeCurrency,
        usdt_rate: usdtRate,
        exchange_rate: txPriceCurrency === 'USDT' ? usdtRate : 1,
      });

      // Race with a 2-second timeout to guarantee the modal always closes quickly and never hangs
      await Promise.race([
        savePromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      onClose();
    } catch (err) {
      console.warn('Lỗi khi lưu giao dịch đầu tư:', err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Chỉnh Sửa Lệnh Giao Dịch' : 'Thêm Lệnh Giao Dịch Đầu Tư'}
      subtitle={
        txType === 'dividend'
          ? 'Ghi nhận Cổ tức Tiền mặt (tính vào Chốt Lời) hoặc Cổ tức Cổ phiếu (tăng số lượng & giảm giá vốn DCA)'
          : 'Ghi nhận lệnh Mua, Bán hoặc Cổ tức để hệ thống tự tính giá vốn (DCA)'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ========================================================================= */}
        {/* 📸 AI OCR BILL / RECEIPT SCANNER SECTION                                  */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-slate-50 dark:to-slate-900/60 p-3.5 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsScanPanelOpen(!isScanPanelOpen)}
              className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-200 transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                <Camera className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span>📸 Quét Ảnh Hóa Đơn / Bill Lệnh Bằng AI</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs">
                    Gemini OCR
                  </span>
                </div>
                <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  Tự động đọc mã tài sản, khối lượng, đơn giá, phí và ngày khớp lệnh
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSampleBillTest('binance')}
                disabled={isScanning}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                title="Dùng thử hóa đơn mẫu Binance Spot"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Hóa đơn mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScanPanelOpen(!isScanPanelOpen)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {isScanPanelOpen ? 'Thu gọn' : 'Mở quét'}
              </button>
            </div>
          </div>

          {isScanPanelOpen && (
            <div className="space-y-3 pt-2 border-t border-purple-100 dark:border-purple-900/40 animate-in fade-in duration-200">
              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleScanFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                  isScanning
                    ? 'border-purple-400 bg-purple-500/10'
                    : scanSuccess
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-500/5'
                    : scanError
                    ? 'border-rose-400 dark:border-rose-600 bg-rose-500/5'
                    : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-white/70 dark:bg-slate-800/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleScanFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {scannedBillPreview ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <img
                      src={scannedBillPreview}
                      alt="Bill Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    <div className="text-left space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                        <span>Đã tải ảnh hóa đơn / lệnh khớp</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Nhấn vào đây để chọn ảnh khác hoặc dán ảnh màn hình mới (Ctrl+V)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Kéo thả ảnh hóa đơn / bill lệnh vào đây hoặc <span className="text-purple-600 dark:text-purple-400 underline">chọn từ máy</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Hỗ trợ chụp từ điện thoại, biên lai TCBS, VPS, SSI, VNDirect, Binance, SJC... (Hỗ trợ dán ảnh bằng phím <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[9px] border">Ctrl+V</kbd>)
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Sample Bills (Binance, TCBS, SJC) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Bố cục mẫu:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSampleBillTest('binance')}
                    disabled={isScanning}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    🪙 Binance (BTC)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleBillTest('tcbs')}
                    disabled={isScanning}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    📈 CTCK TCBS (HPG)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleBillTest('sjc')}
                    disabled={isScanning}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-purple-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    🥇 Vàng SJC (2 lượng)
                  </button>
                </div>
              </div>

              {/* Progress Bar & Percentage Indicator */}
              {isScanning && (
                <div className="space-y-1.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      {scanStatusText || 'Đang quét ảnh hóa đơn...'}
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">{scanProgress}%</span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scan Success Banner */}
              {scanSuccess && !isScanning && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Quét Hóa Đơn Thành Công (100%)</span>
                    </span>
                    {scanConfidence && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        Độ tin cậy: {scanConfidence}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    {scannedSummary || 'Hệ thống đã tự động lọc các thông số vào form bên dưới. Bạn chỉ việc xác nhận nếu đúng dữ liệu.'}
                  </p>
                </div>
              )}

              {/* Scan Error Banner */}
              {scanError && !isScanning && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-200">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Quét thất bại hoặc ảnh mờ</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSampleBillTest('binance')}
                      className="text-[10px] font-bold text-rose-700 dark:text-rose-300 underline cursor-pointer"
                    >
                      Thử hóa đơn mẫu
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                    {scanError}. Hệ thống đã tô đỏ các ô cần thiết bên dưới để bạn điền bằng tay.
                  </p>
                </div>
              )}

              {/* Missing Fields Warning Notice */}
              {missingFields.length > 0 && !isScanning && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    ⚠️ Hóa đơn còn <strong className="text-rose-600 dark:text-rose-400">{missingFields.length} thông tin chưa nhận diện được</strong> (các ô có <strong>viền màu đỏ</strong> bên dưới). Bạn vui lòng điền tay để tiếp tục xác nhận giao dịch.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tx Type Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTxType('buy')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              txType === 'buy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Mua (Buy)
          </button>
          <button
            type="button"
            onClick={() => setTxType('sell')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              txType === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Bán (Sell)
          </button>
          <button
            type="button"
            onClick={() => setTxType('dividend')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === 'dividend' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Cổ tức
          </button>
        </div>

        {/* Specialized Dividend Type Switcher */}
        {txType === 'dividend' && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Chọn hình thức nhận cổ tức:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDividendType('cash')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  dividendType === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Cổ tức Tiền Mặt</span>
                </div>
                <span className={`text-[10px] leading-tight ${dividendType === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  👉 Tính thẳng vào phần Chốt Lời (Realized Profit)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDividendType('stock')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  dividendType === 'stock'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Cổ tức Cổ Phiếu</span>
                </div>
                <span className={`text-[10px] leading-tight ${dividendType === 'stock' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  👉 Thêm cổ phiếu thưởng (Giá 0đ, giảm giá vốn DCA)
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Form Inputs Grid with Conditional RED Highlighting for missing data */}
        <div className="grid grid-cols-2 gap-3">
          {/* Asset Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chọn tài sản
              </label>
              {isScanPanelOpen && (missingFields.includes('asset_symbol') || !txAssetId) && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Chưa nhận diện
                </span>
              )}
            </div>
            <select
              value={txAssetId}
              onChange={(e) => {
                handleAssetChange(e.target.value);
                setMissingFields((prev) => prev.filter((f) => f !== 'asset_symbol'));
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl transition-all focus:outline-none focus:ring-2 ${
                isScanPanelOpen && (missingFields.includes('asset_symbol') || !txAssetId)
                  ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
              }`}
            >
              <option value="">-- Chọn tài sản mua/bán --</option>
              {investmentAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_symbol} - {a.asset_name}
                </option>
              ))}
            </select>
            {isScanPanelOpen && (missingFields.includes('asset_symbol') || !txAssetId) && (
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                ⚠️ Chưa quét được mã - Bắt buộc chọn tay
              </p>
            )}
          </div>

          {/* Transaction Date Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ngày giao dịch
              </label>
              {isScanPanelOpen && (missingFields.includes('transaction_date') || !txDate) && (
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
                  setMissingFields((prev) => prev.filter((f) => f !== 'transaction_date'));
                }
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl transition-all focus:outline-none focus:ring-2 ${
                isScanPanelOpen && (missingFields.includes('transaction_date') || !txDate)
                  ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
              }`}
            />
            {isScanPanelOpen && (missingFields.includes('transaction_date') || !txDate) && (
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                ⚠️ Thiếu ngày mua - Bắt buộc điền tay
              </p>
            )}
          </div>

          {/* Unmatched Symbol Prompt card */}
          {unmatchedSymbolPrompt && (
            <div className="col-span-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  💡 Tìm thấy mã <strong>{unmatchedSymbolPrompt.symbol}</strong> trên hóa đơn nhưng chưa có trong danh mục.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Bạn có muốn tự động tạo mã này vào danh mục đầu tư không?
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateAssetFromBill}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                + Tạo mã {unmatchedSymbolPrompt.symbol}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Fields Based On Transaction Type */}
        {txType === 'dividend' && dividendType === 'cash' ? (
          /* ========================================================================= */
          /* FORM NHẬN CỔ TỨC TIỀN MẶT                                                */
          /* ========================================================================= */
          <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Cách thức nhập số tiền cổ tức
              </label>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDividendCalcMode('direct')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    dividendCalcMode === 'direct'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Nhập tổng tiền
                </button>
                <button
                  type="button"
                  onClick={() => setDividendCalcMode('per_share')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    dividendCalcMode === 'per_share'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Tính theo CP × Đơn giá
                </button>
              </div>
            </div>

            {dividendCalcMode === 'direct' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tổng số tiền cổ tức nhận được
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTxPriceCurrency('VND')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txPriceCurrency === 'VND'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      VND
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxPriceCurrency('USDT')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txPriceCurrency === 'USDT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      USDT
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 60000 hoặc 1500000"
                    value={cashDividendTotal}
                    onChange={(e) => setCashDividendTotal(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txPriceCurrency}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng cổ phiếu nhận cổ tức
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 60"
                    value={dividendSharesCount}
                    onChange={(e) => setDividendSharesCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cổ tức / 1 Cổ phiếu ({txPriceCurrency})
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    placeholder="VD: 1000 (10%)"
                    value={cashDividendPerShare}
                    onChange={(e) => setCashDividendPerShare(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Thuế / Phí khấu trừ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thuế TNCN / Phí khấu trừ ({txPriceCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="VD: 0 hoặc 5%"
                  value={txFee}
                  onChange={(e) => setTxFee(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="Cổ tức tiền mặt đợt 1..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Highlight Realized Profit Boost Card */}
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Tính thẳng vào Lợi Nhuận Đã Chốt Lời:
                </span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Toàn bộ số tiền thực nhận <strong>+{formatCurrency(calculatedValues.totalVnd, 'VND')}</strong> sẽ được cộng trực tiếp vào mục <strong>Lợi Nhuận Đã Chốt Lời (Realized Profit)</strong> của mã <strong>{currentAsset?.asset_symbol || 'tài sản'}</strong> và tổng danh mục. Số lượng cổ phiếu nắm giữ không bị thay đổi.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FORM MUA, BÁN HOẶC CỔ TỨC CỔ PHIẾU                                       */
          /* ========================================================================= */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {txType === 'dividend' ? 'Khối lượng cổ phiếu nhận thêm' : 'Khối lượng / Số lượng'}
                  </label>
                  {isScanPanelOpen && (missingFields.includes('quantity') || !txQuantity || parseFloat(txQuantity) <= 0) && (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> Thiếu số lượng
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  required
                  step="any"
                  min="0.00000001"
                  placeholder="VD: 0.5 hoặc 100"
                  value={txQuantity}
                  onChange={(e) => {
                    setTxQuantity(e.target.value);
                    if (e.target.value && parseFloat(e.target.value) > 0) {
                      setMissingFields((prev) => prev.filter((f) => f !== 'quantity'));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    isScanPanelOpen && (missingFields.includes('quantity') || !txQuantity || parseFloat(txQuantity) <= 0)
                      ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                      : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500'
                  }`}
                />
                {isScanPanelOpen && (missingFields.includes('quantity') || !txQuantity || parseFloat(txQuantity) <= 0) && (
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    ⚠️ Thiếu số lượng mua/bán - Bắt buộc điền tay
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {txType === 'dividend' ? 'Đơn giá nhận (0đ)' : 'Đơn giá khớp lệnh'}
                  </label>
                  {txType !== 'dividend' && isScanPanelOpen && (missingFields.includes('price_per_unit') || !txPrice || parseFloat(txPrice) <= 0) && (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> Thiếu đơn giá
                    </span>
                  )}
                  {txType !== 'dividend' && (!isScanPanelOpen || (!missingFields.includes('price_per_unit') && txPrice && parseFloat(txPrice) > 0)) && (
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          if (txPriceCurrency === 'VND' && parseFloat(txPrice) > 0) {
                            setTxPrice((parseFloat(txPrice) / usdtRate).toFixed(2));
                          }
                          setTxPriceCurrency('USDT');
                        }}
                        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          txPriceCurrency === 'USDT'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        USDT
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (txPriceCurrency === 'USDT' && parseFloat(txPrice) > 0) {
                            setTxPrice(Math.round(parseFloat(txPrice) * usdtRate).toString());
                          }
                          setTxPriceCurrency('VND');
                        }}
                        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          txPriceCurrency === 'VND'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        VND
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required={txType !== 'dividend'}
                    disabled={txType === 'dividend'}
                    step="any"
                    min="0"
                    placeholder={txType === 'dividend' ? '0 đ (Cổ phiếu thưởng)' : txPriceCurrency === 'USDT' ? 'VD: 68500' : 'VD: 1740000000'}
                    value={txType === 'dividend' ? '0' : txPrice}
                    onChange={(e) => {
                      setTxPrice(e.target.value);
                      if (e.target.value && parseFloat(e.target.value) > 0) {
                        setMissingFields((prev) => prev.filter((f) => f !== 'price_per_unit'));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl transition-all focus:outline-none focus:ring-2 ${
                      txType !== 'dividend' && isScanPanelOpen && (missingFields.includes('price_per_unit') || !txPrice || parseFloat(txPrice) <= 0)
                        ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                        : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-purple-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/50'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txPriceCurrency}
                  </span>
                </div>
                {txPriceCurrency === 'USDT' && parseFloat(txPrice) > 0 && txType !== 'dividend' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ≈ {formatCurrency((parseFloat(txPrice) || 0) * usdtRate, 'VND')} (Tỷ giá: {usdtRate.toLocaleString('vi-VN')} đ)
                  </span>
                )}
                {txType !== 'dividend' && isScanPanelOpen && (missingFields.includes('price_per_unit') || !txPrice || parseFloat(txPrice) <= 0) && (
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    ⚠️ Thiếu giá mua/bán - Bắt buộc điền tay
                  </p>
                )}
              </div>
            </div>

            {txType === 'dividend' && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <Gift className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Nhận thêm <strong>+{calculatedValues.rawQty} cổ phiếu {currentAsset?.asset_symbol}</strong> với giá vốn 0đ. Hệ thống sẽ tự động cộng vào số lượng nắm giữ và <strong>kéo giảm giá vốn bình quân (DCA)</strong>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phí giao dịch
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/80 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('BNB')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'BNB'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Phí trả bằng BNB (giảm 25% trên Binance)"
                    >
                      BNB
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('USDT')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'USDT'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxFeeCurrency('VND')}
                      className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        txFeeCurrency === 'VND'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      VND
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={txFeeCurrency === 'BNB' ? 'VD: 0.0015' : txFeeCurrency === 'USDT' ? 'VD: 1.5' : 'VD: 15000'}
                    value={txFee}
                    onChange={(e) => setTxFee(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {txFeeCurrency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="Giao dịch sàn Binance / SSI..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </>
        )}

        {/* Optional Exchange Rate Config for Crypto */}
        {(txPriceCurrency === 'USDT' || txFeeCurrency === 'USDT' || txFeeCurrency === 'BNB') && (
          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Tỷ giá quy đổi quy về VNĐ:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1">
                1 USDT ={' '}
                <input
                  type="number"
                  value={usdtRate}
                  onChange={(e) => setUsdtRate(parseFloat(e.target.value) || 25400)}
                  className="w-16 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 text-right"
                />{' '}
                đ
              </span>
              {txFeeCurrency === 'BNB' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  1 BNB = ${bnbPriceUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
                  <button
                    type="button"
                    onClick={async () => {
                      const p = await priceService.fetchCryptoPriceUSDT('BNB');
                      if (p) setBnbPriceUsdt(p);
                    }}
                    className="p-0.5 text-amber-600 hover:text-amber-800 dark:text-amber-400 cursor-pointer"
                    title="Làm mới giá BNB trực tiếp"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live total calculated */}
        <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
          txType === 'dividend' && dividendType === 'cash'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60'
            : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-900/60'
        }`}>
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
            <span>
              {txType === 'dividend' && dividendType === 'cash'
                ? '💵 Tiền cổ tức thực nhận (Cộng thẳng vào Chốt Lời):'
                : 'Tổng thanh toán (VNĐ):'}
            </span>
            <span className={`text-base font-display ${
              txType === 'dividend' && dividendType === 'cash'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-purple-700 dark:text-purple-300'
            }`}>
              {formatCurrency(calculatedValues.totalVnd, 'VND')}
            </span>
          </div>
          {txPriceCurrency === 'USDT' && (
            <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-medium">
              <span>Quy đổi USDT:</span>
              <span>
                ≈ ${calculatedValues.totalUsdt.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USDT
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 ${
              txType === 'dividend' && dividendType === 'cash'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
            }`}
          >
            {isSubmitting
              ? 'Đang lưu...'
              : editingTransaction
              ? 'Cập Nhật Lệnh Giao Dịch'
              : txType === 'dividend' && dividendType === 'cash'
              ? 'Ghi Nhận Cổ Tức Tiền Mặt'
              : 'Ghi Nhận Lệnh'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
