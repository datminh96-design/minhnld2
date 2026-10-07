import { GoogleGenAI } from '@google/genai';
import { InvestmentAsset, InvestmentTxType } from '../types';

export interface ExtractedBillData {
  asset_symbol: string;
  asset_name?: string;
  asset_type?: 'stock' | 'crypto' | 'gold' | 'fund' | 'other';
  transaction_type: InvestmentTxType;
  quantity: number | null;
  price_per_unit: number | null;
  fee?: number | null;
  fee_currency?: 'BNB' | 'USDT' | 'VND' | string;
  tax?: number | null;
  total_amount?: number | null;
  currency?: 'VND' | 'USDT' | 'USD';
  transaction_date: string | null;
  broker_name?: string | null;
  order_id?: string | null;
  notes?: string | null;
  missing_fields: string[];
  confidence?: number;
}

export interface ScanBillResponse {
  success: boolean;
  data?: ExtractedBillData;
  error?: string;
  message?: string;
}

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
  unit?: string | null;
}

export interface ExtractedExpenseData {
  name: string;
  amount: number | null;
  transaction_date: string | null;
  fee: number | null;
  category: string;
  transaction_type: 'expense' | 'income';
  document_layout?: 'supermarket_pos' | 'fnb_dining' | 'ride_delivery' | 'bank_transfer' | 'utility_bill' | 'ecommerce' | 'general';
  layout_label?: string;
  items?: ReceiptLineItem[];
  total_quantity?: number | null;
  items_summary?: string;
  notes?: string;
  currency?: string;
  tax?: number | null;
  raw_detected_date?: string;
  raw_detected_amount?: string;
  missing_fields: string[];
  confidence?: number;
}

export interface ScanExpenseResponse {
  success: boolean;
  data?: ExtractedExpenseData;
  raw_output?: string | null;
  used_model?: string;
  error?: string;
  message?: string;
}

function parseFlexibleNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) || val <= 0 ? null : val;
  if (typeof val !== 'string') return null;

  let str = val.trim().toLowerCase();
  if (!str) return null;

  const kMatch = str.match(/^([\d\.,]+)\s*k$/i);
  if (kMatch) {
    const base = parseFlexibleNumber(kMatch[1]);
    return base !== null ? Math.round(base * 1000) : null;
  }
  const trMatch = str.match(/^([\d\.,]+)\s*(?:tr|triệu|m)$/i);
  if (trMatch) {
    const base = parseFlexibleNumber(trMatch[1]);
    return base !== null ? Math.round(base * 1000000) : null;
  }

  str = str.replace(/[đvndvnđ\$usdusdtbnbcp\s]/gi, '');

  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) > 0 && !str.startsWith('0,')) {
      str = parts.join('');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) > 0 && !str.startsWith('0.')) {
      str = parts.join('');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
}

function parseFlexibleDateToISO(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed)) return trimmed.substring(0, 10);

  const dmyMatch = trimmed.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const ymdMatch = trimmed.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  return null;
}

export const billScannerService = {
  /**
   * Convert file to base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * Compress image on client side if too large, while maintaining high crispness for OCR
   */
  async compressImage(dataUrl: string, maxWidth = 2400, maxHeight = 2400, quality = 0.95): Promise<string> {
    if (typeof window === 'undefined') return dataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxWidth && height <= maxHeight && dataUrl.length < 5 * 1024 * 1024) {
          resolve(dataUrl);
          return;
        }

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  /**
   * Client-side Gemini fallback for Expense Scan (runs directly in browser if server API fails or unavailable)
   */
  async clientSideExpenseScan(
    compressedBase64: string,
    existingCategories: any[] = [],
    preferredModel?: string
  ): Promise<ScanExpenseResponse | null> {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)) ||
      (typeof process !== 'undefined' && process.env ? process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY : '') ||
      (typeof window !== 'undefined' && ((window as any).VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY));

    if (!apiKey) return null;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const cleanBase64 = compressedBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
      const detectedMimeType = compressedBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

      const categoriesListStr = Array.isArray(existingCategories) && existingCategories.length > 0
        ? existingCategories.map((c: any) => typeof c === 'string' ? c : c.name).join(', ')
        : 'Ăn uống, Mua sắm, Di chuyển, Hóa đơn & Tiện ích, Y tế, Giải trí, Giáo dục, Nhà cửa, Công việc, Khác';

      const prompt = `Bạn là hệ thống AI OCR thị giác máy tính chuyên sâu về bóc tách và phân tích các loại hóa đơn, biên lai chi tiêu, phiếu thu, phiếu chi, chuyển khoản ngân hàng và chứng từ tài chính với độ chính xác tuyệt đối.

CÁC DẠNG HÓA ĐƠN & BỐ CỤC (DOCUMENT LAYOUTS) CẦN XỬ LÝ:
1. 'supermarket_pos': Hóa đơn siêu thị / bán lẻ in nhiệt dài hẹp (WinMart, Co.opmart, Bách Hóa Xanh, Aeon, Lotte Mart, BigC/GO!, Circle K, 7-Eleven, Ministop, Guardian, Watson, Pharmacity, Long Châu...).
2. 'fnb_dining': Hóa đơn dịch vụ ăn uống, nhà hàng, quán cafe, trà sữa (Highlands Coffee, Phúc Long, The Coffee House, Starbucks, Katinat, Phở, Pizza, BBQ...).
3. 'ride_delivery': Biên lai chuyến đi xe công nghệ hoặc cước vận chuyển giao hàng (GrabCar, GrabBike, Be, Xanh SM, ShopeeFood, Gojek, Viettel Post, GHTK...).
4. 'bank_transfer': Ảnh chụp màn hình chuyển khoản ngân hàng, ví điện tử (Vietcombank, Techcombank, MB Bank, TPBank, VPBank, ACB, BIDV, MoMo, ZaloPay, VNPay, ShopeePay...).
5. 'utility_bill': Hóa đơn tiền điện (EVN), tiền nước, cước internet viễn thông (Viettel, VNPT, FPT), vé trạm thu phí VETC/ePass, học phí, viện phí.
6. 'ecommerce': Đơn mua hàng thương mại điện tử trực tuyến (Shopee, Lazada, Tiki, TikTok Shop).
7. 'general': Các loại hóa đơn thanh toán / phiếu thu khác.

QUY TẮC BẮT BUỘC VỀ BÓC TÁCH CHI TIẾT TỪNG MẶT HÀNG & SỐ LƯỢNG (MANDATORY QUANTITY & LINE ITEMS EXTRACTION):
1. TRƯỜNG "items": Bắt buộc bóc tách toàn bộ danh sách các mặt hàng / dịch vụ có trong hóa đơn. Mỗi phần tử là 1 object có cấu trúc:
   - "name": Tên mặt hàng / sản phẩm / dịch vụ (chuỗi string).
   - "quantity": SỐ LƯỢNG MẶT HÀNG (kiểu NUMBER dương, ví dụ: 1, 2, 0.5, 3).
     + Nếu hóa đơn ghi "x2", "SL: 2", "Qty: 2", "2 ly", "2 cái", "0.5 kg" -> quantity: 2 hoặc 0.5.
     + Nếu không ghi rõ số lượng từng món, mặc định quantity: 1.
     + TUYỆT ĐỐI KHÔNG ĐỂ quantity = null hoặc 0.
   - "unit_price": Đơn giá của 1 đơn vị (kiểu NUMBER, ví dụ: 36000).
   - "total_price": Thành tiền của món = quantity * unit_price (kiểu NUMBER, ví dụ: 72000).
   - "unit": Đơn vị tính nếu có ("hộp", "ly", "cái", "kg", "chai", "suất", "gói"...).
2. TRƯỜNG "total_quantity": Tổng số lượng tất cả các sản phẩm mua trên hóa đơn (kiểu NUMBER, ví dụ: 5).
3. TRƯỜNG "items_summary": Chuỗi tóm tắt các món kèm số lượng và thành tiền (ví dụ: "2x Sữa tươi Vinamilk 1L (72.000 đ), 1x Trứng gà Ba Huân hộp 10 quả (34.000 đ)").

QUY TẮC BÓC TÁCH CÁC TRƯỜNG CHÍNH:
A. SỐ TIỀN THANH TOÁN THỰC TẾ (amount):
- Bắt buộc tìm và trích xuất SỐ TIỀN THỰC TẾ ĐÃ THANH TOÁN (Final Payable / Charged Amount).
- Tìm các từ khóa: "TỔNG TIỀN THANH TOÁN", "TỔNG CỘNG", "THÀNH TIỀN", "CẦN THANH TOÁN", "TIỀN PHẢI TRẢ", "Grand Total", "Total Amount", "Amount Paid", "Số tiền giao dịch", "Số tiền chuyển".
- NẾU CÓ CHIẾT KHẤU / GIẢM GIÁ / VOUCHER: Số tiền 'amount' PHẢI LÀ số tiền sau khi đã trừ giảm giá.
- Chuyển đổi định dạng số Việt Nam & quốc tế sang dạng NUMBER dương: "205.000 đ" -> 205000, "1,250,000" -> 1250000.

B. NGÀY GIAO DỊCH (transaction_date):
- Tìm ngày thực hiện giao dịch hoặc ngày xuất hóa đơn (chuẩn hóa về định dạng duy nhất: YYYY-MM-DD, ví dụ: "2026-10-07").

C. TÊN GIAO DỊCH / CỬA HÀNG (name):
- Tên thương hiệu, cửa hàng, người nhận hoặc dịch vụ (ví dụ: "Siêu thị WinMart+", "Highlands Coffee - Vincom", "GrabCar", "Chuyển tiền cho Nguyễn Văn A", "EVN TP.HCM").

D. CÁC TRƯỜNG KHÁC:
- fee: Phụ phí dịch vụ, phí ship, phí cầu đường (nếu có ghi riêng) bằng số, hoặc 0.
- tax: Tiền thuế VAT nếu có ghi riêng bằng số, hoặc 0.
- category: Chọn 1 danh mục phù hợp nhất từ [${categoriesListStr}].
- transaction_type: 'expense' (chi tiêu) hoặc 'income' (thu nhập / nhận tiền).
- document_layout: 1 trong các giá trị ['supermarket_pos', 'fnb_dining', 'ride_delivery', 'bank_transfer', 'utility_bill', 'ecommerce', 'general'].
- layout_label: Tên tiếng Việt của bố cục (ví dụ: "Hóa đơn Siêu thị / Bán lẻ", "Hóa đơn F&B / Nhà hàng").
- notes: Ghi chú thêm chi tiết (mã hóa đơn, địa chỉ, phương thức thanh toán...).
- missing_fields: Danh sách các trường quan trọng còn thiếu trong mảng ['name', 'amount', 'transaction_date']. Nếu đủ thì để mảng rỗng [].
- confidence: Điểm tin cậy từ 0-100.

CẤU TRÚC JSON MẪU BẮT BUỘC TRẢ VỀ:
{
  "name": "Siêu thị WinMart+",
  "amount": 215000,
  "transaction_date": "2026-10-07",
  "fee": 0,
  "tax": 0,
  "category": "Ăn uống",
  "transaction_type": "expense",
  "document_layout": "supermarket_pos",
  "layout_label": "Hóa đơn Siêu thị / Bán lẻ",
  "total_quantity": 5,
  "items": [
    {
      "name": "Sữa tươi tiệt trùng Vinamilk 1L",
      "quantity": 2,
      "unit_price": 36000,
      "total_price": 72000,
      "unit": "hộp"
    }
  ],
  "items_summary": "2x Sữa tươi Vinamilk 1L (72.000 đ)",
  "notes": "Hóa đơn HD-8849204",
  "missing_fields": [],
  "confidence": 98
}

Danh mục có sẵn: [${categoriesListStr}].
Chỉ trả về JSON thuần túy theo đúng cấu trúc trên.`;

      const candidateModels = [
        preferredModel,
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
      ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              { inlineData: { mimeType: detectedMimeType, data: cleanBase64 } },
              { text: prompt },
            ],
            config: { responseMimeType: 'application/json' },
          });

          const resText = response?.text || '';
          if (resText.trim()) {
            const cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJson);
            if (parsedData && (parsedData.name || parsedData.amount)) {
              parsedData.amount = parseFlexibleNumber(parsedData.amount);
              parsedData.fee = parseFlexibleNumber(parsedData.fee) ?? 0;
              parsedData.transaction_date = parseFlexibleDateToISO(parsedData.transaction_date) || new Date().toISOString().split('T')[0];

              if (Array.isArray(parsedData.items) && parsedData.items.length > 0) {
                parsedData.items = parsedData.items.map((it: any) => ({
                  name: typeof it.name === 'string' ? it.name.trim() : 'Mặt hàng',
                  quantity: parseFlexibleNumber(it.quantity) || 1,
                  unit_price: parseFlexibleNumber(it.unit_price) || null,
                  total_price: parseFlexibleNumber(it.total_price) || null,
                  unit: typeof it.unit === 'string' ? it.unit.trim() : null,
                }));
                parsedData.total_quantity = parsedData.total_quantity || parsedData.items.reduce((s: number, it: any) => s + (it.quantity || 1), 0);
              } else {
                parsedData.items = [];
                parsedData.total_quantity = 1;
              }

              const missing: string[] = [];
              if (!parsedData.name) missing.push('name');
              if (!parsedData.amount || parsedData.amount <= 0) missing.push('amount');
              if (!parsedData.transaction_date) missing.push('transaction_date');
              parsedData.missing_fields = missing;

              return {
                success: true,
                data: parsedData,
                raw_output: resText,
                used_model: modelName,
                message: 'Quét hóa đơn chi tiêu bằng Client Gemini AI hoàn tất 100%!',
              };
            }
          }
        } catch (err) {
          console.warn(`[Client Gemini Expense Scan] Error with ${modelName}:`, err);
        }
      }
    } catch (err) {
      console.error('[Client Gemini Expense Scan] Initialization error:', err);
    }
    return null;
  },

  /**
   * Client-side Gemini fallback for Investment Scan
   */
  async clientSideInvestmentScan(
    compressedBase64: string,
    currentAssets: InvestmentAsset[] = [],
    preferredModel?: string
  ): Promise<ScanBillResponse | null> {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)) ||
      (typeof process !== 'undefined' && process.env ? process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY : '') ||
      (typeof window !== 'undefined' && ((window as any).VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY));

    if (!apiKey) return null;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const cleanBase64 = compressedBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
      const detectedMimeType = compressedBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

      const prompt = `Bạn là chuyên gia thị giác AI phân tích ảnh chụp màn hình biên lai lệnh giao dịch tài chính cực kỳ chính xác.
ĐẶC BIỆT THÔNG THẠO GIAO DIỆN SÀN GIAO DỊCH:
1. Sàn Crypto (Binance, OKX, Bybit, KuCoin, Gate.io):
   - MỤC TIÊU: Tìm cặp giao dịch, khối lượng đã khớp, đơn giá, phí và ngày giờ.
   - TRƯỜNG "Đã khớp lệnh (BTC)" hoặc "Đã khớp lệnh" hoặc "Khối lượng" hoặc "Executed" hoặc "Filled": ĐÂY CHÍNH LÀ QUANTITY (ví dụ: "0,00102" -> quantity: 0.00102).
   - TRƯỜNG "Giá (USDT)" hoặc "Giá trung bình" hoặc "Price": ĐÂY CHÍNH LÀ PRICE_PER_UNIT (ví dụ: "84.300,00" -> price_per_unit: 84300).
   - TRƯỜNG "Phí (BNB)" hoặc "Phí (USDT)" hoặc "Fee": ĐÂY CHÍNH LÀ FEE (ví dụ: "0,00008404" -> fee: 0.00008404, fee_currency: "BNB").
   - TRƯỜNG "Tổng (USDT)" hoặc "Total" hoặc "Số tiền": ĐÂY CHÍNH LÀ TOTAL_AMOUNT (ví dụ: "85,986" -> total_amount: 85.986).
   - TRƯỜNG "Lệnh số" hoặc "Order ID": ĐÂY CHÍNH LÀ ORDER_ID (ví dụ: "67232813680").
   - TRƯỜNG "Cặp giao dịch" hoặc "BTC/USDT": asset_symbol: "BTC", currency: "USDT".
   - TRƯỜNG "Mua" (màu xanh) -> transaction_type: "buy", "Bán" (màu đỏ) -> transaction_type: "sell".
   - TRƯỜNG "2026-10-07 09:00:57" -> transaction_date: "2026-10-07".
   - Sàn: broker_name: "Binance".

2. Sàn Chứng khoán Việt Nam (TCBS, VPS SmartOne, SSI iBoard, VNDIRECT, BSC, Mirae Asset):
   - Mã cổ phiếu: "HPG", "FPT", "VCB", "SSI"...
   - Khối lượng: "500" CP -> quantity: 500.
   - Đơn giá: "28.500" -> price_per_unit: 28500.
   - Phí: "15.000" -> fee: 15000, fee_currency: "VND".

3. Vàng miếng & Vàng nhẫn (SJC, DOJI, PNJ, Bảo Tín Minh Châu):
   - Số lượng: 1 lượng, 2 chỉ... -> quantity: 1 hoặc 2.
   - Đơn giá: 89.500.000 -> price_per_unit: 89500000.

HÃY TRÍCH XUẤT CÁC TRƯỜNG SAU (TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON):
{
  "asset_symbol": "BTC",
  "asset_name": "Bitcoin",
  "asset_type": "crypto",
  "transaction_type": "buy",
  "quantity": 0.00102,
  "price_per_unit": 84300,
  "fee": 0.00008404,
  "fee_currency": "BNB",
  "total_amount": 85.986,
  "currency": "USDT",
  "transaction_date": "2026-10-07",
  "broker_name": "Binance",
  "order_id": "67232813680",
  "notes": "Khớp lệnh Mua 0.00102 BTC @ 84300 USDT trên Binance",
  "missing_fields": [],
  "confidence": 99
}

QUY TẮC BẮT BUỘC:
- Tất cả các trường số (quantity, price_per_unit, fee, total_amount) PHẢI là NUMBER (ví dụ: 0.00102, 84300, 0.00008404), KHÔNG trả về chuỗi string có dấu phẩy.
- Nếu thấy trường "Đã khớp lệnh" hoặc "Số lượng" trong ảnh, TUYỆT ĐỐI KHÔNG ĐƯỢC để quantity = null.

Danh sách tài sản của người dùng:
${JSON.stringify(currentAssets.map((a: any) => ({ symbol: a.asset_symbol || a.symbol, name: a.asset_name || a.name, type: a.asset_type || a.type })))}

Chỉ trả về JSON thuần túy theo đúng cấu trúc trên.`;

      const candidateModels = [
        preferredModel,
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
      ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              { inlineData: { mimeType: detectedMimeType, data: cleanBase64 } },
              { text: prompt },
            ],
            config: { responseMimeType: 'application/json' },
          });

          const resText = response?.text || '';
          if (resText.trim()) {
            const cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJson);
            if (parsedData && (parsedData.asset_symbol || parsedData.quantity || parsedData.price_per_unit)) {
              parsedData.quantity = parseFlexibleNumber(parsedData.quantity);
              parsedData.price_per_unit = parseFlexibleNumber(parsedData.price_per_unit);
              parsedData.fee = parseFlexibleNumber(parsedData.fee) ?? 0;
              parsedData.total_amount = parseFlexibleNumber(parsedData.total_amount);
              parsedData.transaction_date = parseFlexibleDateToISO(parsedData.transaction_date) || new Date().toISOString().split('T')[0];

              const missingFields: string[] = [];
              if (!parsedData.asset_symbol || !parsedData.asset_symbol.trim()) missingFields.push('asset_symbol');
              if (parsedData.quantity === null || parsedData.quantity <= 0) missingFields.push('quantity');
              if (parsedData.price_per_unit === null || parsedData.price_per_unit <= 0) missingFields.push('price_per_unit');
              if (!parsedData.transaction_date) missingFields.push('transaction_date');
              parsedData.missing_fields = missingFields;

              return {
                success: true,
                data: parsedData,
                message: missingFields.length === 0
                  ? 'Quét hóa đơn đầu tư bằng Client Gemini AI hoàn tất 100%!'
                  : `Đã quét hóa đơn, còn ${missingFields.length} thông tin cần bổ sung`,
              };
            }
          }
        } catch (err) {
          console.warn(`[Client Gemini Investment Scan] Error with ${modelName}:`, err);
        }
      }
    } catch (err) {
      console.error('[Client Gemini Investment Scan] Initialization error:', err);
    }
    return null;
  },

  /**
   * Call server Gemini OCR endpoint for general expense bills & receipts with client-side fallback
   */
  async scanExpenseBill(
    fileOrBase64: File | string,
    existingCategories: any[] = [],
    onProgress?: (percent: number, statusText: string) => void,
    preferredModel?: string
  ): Promise<ScanExpenseResponse> {
    let interval: any = null;
    try {
      onProgress?.(10, 'Đang chuẩn bị ảnh hóa đơn...');

      let base64String = '';
      if (typeof fileOrBase64 === 'string') {
        base64String = fileOrBase64;
      } else {
        base64String = await this.fileToBase64(fileOrBase64);
      }

      onProgress?.(25, 'Đang tối ưu & nén hình ảnh biên lai...');
      const compressedBase64 = await this.compressImage(base64String);

      onProgress?.(45, 'Đang gửi ảnh tới AI Gemini OCR...');

      let simulatedPercent = 45;
      interval = setInterval(() => {
        if (simulatedPercent < 88) {
          simulatedPercent += Math.floor(Math.random() * 8) + 4;
          if (simulatedPercent > 88) simulatedPercent = 88;
          let statusText = 'AI đang nhận diện chữ & số trên biên lai...';
          if (simulatedPercent > 65) statusText = 'Đang bóc tách tên cửa hàng, số tiền, ngày và phụ phí...';
          onProgress?.(simulatedPercent, statusText);
        }
      }, 350);

      const payload = {
        imageBase64: compressedBase64,
        mimeType: 'image/jpeg',
        existingCategories: existingCategories.map((c) => (typeof c === 'string' ? c : c.name)),
        model: preferredModel,
      };

      let resJson: ScanExpenseResponse | null = null;

      try {
        const response = await fetch('/api/expenses/scan-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          resJson = await response.json();
          if (resJson && resJson.success && resJson.data && (resJson.data.name || resJson.data.amount)) {
            console.group('🔍 [DEBUG Mode - Expense Scanner RAW Gemini Output]');
            console.log('API Success Status:', resJson.success);
            console.log('Model Used:', resJson.used_model);
            console.log('Parsed Data Structure:', resJson.data);
            console.log('Extracted Line Items (with Quantities):', resJson.data?.items);
            console.log('Total Quantity:', resJson.data?.total_quantity);
            console.log('Raw JSON String from Gemini API:\n', resJson.raw_output || JSON.stringify(resJson.data, null, 2));
            console.groupEnd();

            clearInterval(interval);
            onProgress?.(100, 'Quét hóa đơn chi tiêu hoàn tất 100%!');
            return resJson;
          }
        }
      } catch (fetchErr) {
        console.warn('[scanExpenseBill] Fetch failed, switching to client-side Gemini fallback:', fetchErr);
      }

      // If server API was unavailable or returned error (e.g. on Vercel), try direct client-side Gemini scan
      onProgress?.(75, 'Đang quét trực tiếp bằng Gemini Vision (Chế độ Client Direct)...');
      const clientResult = await this.clientSideExpenseScan(compressedBase64, existingCategories, preferredModel);
      clearInterval(interval);

      if (clientResult && clientResult.success && clientResult.data) {
        onProgress?.(100, 'Quét hóa đơn chi tiêu bằng Client AI hoàn tất 100%!');
        return clientResult;
      }

      // Fallback draft if network and client AI unavailable
      onProgress?.(100, 'Quét hóa đơn hoàn tất!');
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        success: true,
        data: {
          name: 'Hóa đơn chi tiêu',
          amount: null,
          transaction_date: todayStr,
          fee: 0,
          category: 'Ăn uống',
          transaction_type: 'expense',
          items_summary: 'Hóa đơn chi tiêu',
          notes: 'Vui lòng kiểm tra và điền các thông tin còn thiếu',
          missing_fields: ['name', 'amount'],
          confidence: 0,
        },
        message: 'Chưa bóc tách được chi tiết, vui lòng điền thông tin bổ sung.',
      };
    } catch (err: any) {
      console.error('[scanExpenseBill] error:', err);
      if (interval) clearInterval(interval);
      onProgress?.(100, 'Quét hoàn tất');
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        success: true,
        data: {
          name: 'Hóa đơn chi tiêu',
          amount: null,
          transaction_date: todayStr,
          fee: 0,
          category: 'Ăn uống',
          transaction_type: 'expense',
          items_summary: 'Hóa đơn mua sắm',
          notes: 'Vui lòng điền các thông tin còn thiếu',
          missing_fields: ['name', 'amount'],
          confidence: 0,
        },
        message: 'Vui lòng điền thông tin bổ sung.',
      };
    }
  },

  /**
   * Call server Gemini OCR endpoint with real-time percentage progress callback and client-side fallback
   */
  async scanBill(
    fileOrBase64: File | string,
    currentAssets: InvestmentAsset[] = [],
    onProgress?: (percent: number, statusText: string) => void,
    preferredModel?: string
  ): Promise<ScanBillResponse> {
    let interval: any = null;
    try {
      onProgress?.(10, 'Đang chuẩn bị và đọc dữ liệu hình ảnh...');

      let base64String = '';
      if (typeof fileOrBase64 === 'string') {
        base64String = fileOrBase64;
      } else {
        base64String = await this.fileToBase64(fileOrBase64);
      }

      onProgress?.(25, 'Đang nén & tối ưu ảnh chụp hóa đơn...');
      const compressedBase64 = await this.compressImage(base64String);

      onProgress?.(45, 'Đang gửi ảnh tới AI Gemini Vision OCR...');

      let simulatedPercent = 45;
      interval = setInterval(() => {
        if (simulatedPercent < 88) {
          simulatedPercent += Math.floor(Math.random() * 8) + 4;
          if (simulatedPercent > 88) simulatedPercent = 88;
          let statusText = 'AI đang nhận diện chữ và số trên hóa đơn...';
          if (simulatedPercent > 65) statusText = 'Đang bóc tách mã tài sản, số lượng, giá và ngày...';
          onProgress?.(simulatedPercent, statusText);
        }
      }, 350);

      const payload = {
        imageBase64: compressedBase64,
        mimeType: 'image/jpeg',
        currentAssets: currentAssets.map((a) => ({
          symbol: a.asset_symbol,
          name: a.asset_name,
          type: a.asset_type,
        })),
        model: preferredModel,
      };

      let resJson: ScanBillResponse | null = null;
      try {
        const response = await fetch('/api/investments/scan-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          resJson = await response.json();
          if (resJson && resJson.success && resJson.data && (resJson.data.asset_symbol || resJson.data.quantity || resJson.data.price_per_unit)) {
            clearInterval(interval);
            onProgress?.(100, 'Quét hóa đơn hoàn tất 100%!');
            return resJson;
          }
        }
      } catch (fetchErr) {
        console.warn('[scanBill] Fetch failed, switching to client-side fallback:', fetchErr);
      }

      // If server API was unavailable or returned error (e.g. on Vercel), try direct client-side Gemini scan
      onProgress?.(75, 'Đang quét trực tiếp bằng Gemini Vision (Chế độ Client Direct)...');
      const clientResult = await this.clientSideInvestmentScan(compressedBase64, currentAssets, preferredModel);
      clearInterval(interval);

      if (clientResult && clientResult.success && clientResult.data) {
        onProgress?.(100, 'Quét hóa đơn đầu tư bằng Client AI hoàn tất 100%!');
        return clientResult;
      }

      // Fallback draft if network and client AI unavailable
      onProgress?.(100, 'Quét hóa đơn hoàn tất!');
      const defaultAsset = currentAssets[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        success: true,
        data: {
          asset_symbol: defaultAsset?.asset_symbol || '',
          asset_name: defaultAsset?.asset_name || '',
          asset_type: defaultAsset?.asset_type || 'stock',
          transaction_type: 'buy',
          quantity: null,
          price_per_unit: null,
          fee: 0,
          fee_currency: 'VND',
          tax: 0,
          total_amount: null,
          currency: 'VND',
          transaction_date: todayStr,
          broker_name: null,
          order_id: null,
          notes: 'Vui lòng bổ sung các thông tin còn thiếu',
          missing_fields: ['asset_symbol', 'quantity', 'price_per_unit'],
          confidence: 0,
        },
        message: 'Chưa bóc tách được chi tiết, vui lòng nhập bổ sung bằng tay.',
      };
    } catch (err: any) {
      console.error('[billScannerService] error:', err);
      if (interval) clearInterval(interval);
      onProgress?.(100, 'Quét hoàn tất');
      const defaultAsset = currentAssets[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        success: true,
        data: {
          asset_symbol: defaultAsset?.asset_symbol || '',
          asset_name: defaultAsset?.asset_name || '',
          asset_type: defaultAsset?.asset_type || 'stock',
          transaction_type: 'buy',
          quantity: null,
          price_per_unit: null,
          fee: 0,
          fee_currency: 'VND',
          tax: 0,
          total_amount: null,
          currency: 'VND',
          transaction_date: todayStr,
          broker_name: null,
          order_id: null,
          notes: 'Vui lòng nhập bổ sung thông tin',
          missing_fields: ['asset_symbol', 'quantity', 'price_per_unit'],
          confidence: 0,
        },
        message: 'Chưa bóc tách được số liệu, vui lòng nhập bổ sung bằng tay.',
      };
    }
  },
};
