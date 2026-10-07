import { InvestmentAsset, InvestmentTxType } from '../types';

export interface ExtractedBillData {
  asset_symbol: string;
  asset_name?: string;
  asset_type?: 'stock' | 'crypto' | 'gold' | 'fund' | 'other';
  transaction_type: InvestmentTxType;
  quantity: number | null;
  price_per_unit: number | null;
  fee?: number | null;
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

export interface ExtractedExpenseData {
  name: string;
  amount: number | null;
  transaction_date: string | null;
  fee: number | null;
  category: string;
  transaction_type: 'expense' | 'income';
  items_summary?: string;
  notes?: string;
  missing_fields: string[];
  confidence?: number;
}

export interface ScanExpenseResponse {
  success: boolean;
  data?: ExtractedExpenseData;
  error?: string;
  message?: string;
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
   * Compress image on client side if too large
   */
  async compressImage(dataUrl: string, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<string> {
    if (typeof window === 'undefined') return dataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
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

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  /**
   * Call server Gemini OCR endpoint for general expense bills & receipts
   */
  async scanExpenseBill(
    fileOrBase64: File | string,
    existingCategories: any[] = [],
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<ScanExpenseResponse> {
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
      const interval = setInterval(() => {
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
      };

      const response = await fetch('/api/expenses/scan-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Máy chủ phản hồi lỗi ${response.status}`);
      }

      const resJson: ScanExpenseResponse = await response.json();

      if (resJson.success && resJson.data) {
        onProgress?.(100, 'Quét hóa đơn chi tiêu hoàn tất 100%!');
        return resJson;
      } else {
        throw new Error(resJson.error || 'Không thể trích xuất thông tin từ hóa đơn chi tiêu');
      }
    } catch (err: any) {
      console.error('[scanExpenseBill] error:', err);
      onProgress?.(100, 'Quét thất bại');
      return {
        success: false,
        error: err?.message || 'Không thể quét hóa đơn. Vui lòng kiểm tra lại ảnh hoặc điền tay.',
      };
    }
  },

  /**
   * Call server Gemini OCR endpoint with real-time percentage progress callback
   */
  async scanBill(
    fileOrBase64: File | string,
    currentAssets: InvestmentAsset[] = [],
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<ScanBillResponse> {
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

      // Smooth progress ticker
      let simulatedPercent = 45;
      const interval = setInterval(() => {
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
      };

      const response = await fetch('/api/investments/scan-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Máy chủ phản hồi lỗi ${response.status}`);
      }

      const resJson: ScanBillResponse = await response.json();

      if (resJson.success && resJson.data) {
        onProgress?.(100, 'Quét hóa đơn hoàn tất 100%!');
        return resJson;
      } else {
        throw new Error(resJson.error || 'Không thể trích xuất thông tin từ hóa đơn');
      }
    } catch (err: any) {
      console.error('[billScannerService] error:', err);
      onProgress?.(100, 'Quét thất bại');
      return {
        success: false,
        error: err?.message || 'Không thể quét hóa đơn. Vui lòng thử lại hoặc điền tay.',
      };
    }
  },
};
