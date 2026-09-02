import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatCurrency(
  amount: number | undefined | null,
  currency: 'VND' | 'USD' = 'VND',
  compact: boolean = false
): string {
  const value = amount || 0;
  if (currency === 'USD') {
    if (compact && Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (compact && Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  // VND format
  if (compact && Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} tỷ ₫`;
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} tr ₫`;
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(num: number | undefined | null, decimals: number = 2): string {
  const val = num ?? 0;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(percent: number | undefined | null, showSign: boolean = true): string {
  const val = percent ?? 0;
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDay();
  switch (day) {
    case 0: return 'Chủ Nhật';
    case 1: return 'Thứ 2';
    case 2: return 'Thứ 3';
    case 3: return 'Thứ 4';
    case 4: return 'Thứ 5';
    case 5: return 'Thứ 6';
    case 6: return 'Thứ 7';
    default: return '';
  }
}

export function getShortDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDay();
  switch (day) {
    case 0: return 'CN';
    case 1: return 'T2';
    case 2: return 'T3';
    case 3: return 'T4';
    case 4: return 'T5';
    case 5: return 'T6';
    case 6: return 'T7';
    default: return '';
  }
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToHours(minutes: number): number {
  return Number((Math.max(0, minutes) / 60).toFixed(2));
}

/**
 * Format số phút thành chuỗi dễ đọc (VD: 90 => '90 phút' hoặc '1h 30p')
 */
export function formatMinutes(minutes: number | undefined | null): string {
  const mins = Math.round(minutes || 0);
  if (mins === 0) return '0 phút';
  return `${mins} phút`;
}

/**
 * Format số phút thành dạng '1h 30p' hoặc '45p'
 */
export function formatMinutesToHM(minutes: number | undefined | null): string {
  const mins = Math.round(minutes || 0);
  if (mins === 0) return '0p';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}p`;
  if (h > 0) return `${h}h`;
  return `${m}p`;
}

/**
 * Format hiển thị kết hợp Phút và Giờ (VD: '90 phút (1.5h)')
 */
export function formatMinutesDetailed(minutes: number | undefined | null, hours?: number): string {
  const mins = Math.round(minutes || 0);
  const hrs = hours !== undefined ? hours : Number((mins / 60).toFixed(2));
  if (mins === 0) return '0 phút';
  return `${mins} phút (${hrs.toFixed(1)}h)`;
}

/**
 * Tính giờ làm và tăng ca (OT) tự động chính xác theo TỪNG PHÚT:
 * 1. Tổng phút làm việc = (Giờ ra - Giờ vào) - Số phút nghỉ trưa thực tế
 * 2. Phút tăng ca (OT) = Tổng phút làm - Số phút làm việc chuẩn (standardHours * 60)
 * 3. Phút thiếu hụt = Số phút làm việc chuẩn - Tổng phút làm
 * Quy đổi sang giờ thập phân (làm tròn 2 chữ số) phục vụ báo cáo và lương.
 */
export function calculateWorkHours(
  checkIn: string,
  checkOut: string,
  breakStart: string,
  breakEnd: string,
  standardHours: number = 8.0,
  workStatus: string = 'Làm việc'
) {
  const standardMinutes = Math.round(standardHours * 60);

  if (workStatus === 'Nghỉ phép' || workStatus === 'Nghỉ lễ') {
    return {
      breakDurationMinutes: 0,
      breakDurationHours: 0,
      totalMinutes: 0,
      totalHours: 0,
      overtimeMinutes: 0,
      overtimeHours: 0,
      missingMinutes: 0,
      missingHours: 0,
    };
  }

  if (workStatus === 'Nghỉ không lương') {
    return {
      breakDurationMinutes: 0,
      breakDurationHours: 0,
      totalMinutes: 0,
      totalHours: 0,
      overtimeMinutes: 0,
      overtimeHours: 0,
      missingMinutes: standardMinutes,
      missingHours: standardHours,
    };
  }

  const inMinutes = parseTimeToMinutes(checkIn);
  const outMinutes = parseTimeToMinutes(checkOut);
  const bStartMinutes = parseTimeToMinutes(breakStart);
  const bEndMinutes = parseTimeToMinutes(breakEnd);

  let rawMinutes = outMinutes - inMinutes;
  if (rawMinutes < 0) rawMinutes = 0;

  // Tính thời gian nghỉ trưa nằm trong khoảng làm việc
  let breakMinutes = 0;
  if (bEndMinutes > bStartMinutes) {
    const effectiveBreakStart = Math.max(inMinutes, bStartMinutes);
    const effectiveBreakEnd = Math.min(outMinutes, bEndMinutes);
    if (effectiveBreakEnd > effectiveBreakStart) {
      breakMinutes = effectiveBreakEnd - effectiveBreakStart;
    }
  }

  const workMinutes = Math.max(0, rawMinutes - breakMinutes);
  const totalHours = minutesToHours(workMinutes);
  const breakDurationHours = minutesToHours(breakMinutes);

  let overtimeMinutes = 0;
  let missingMinutes = 0;

  const targetMinutes = workStatus === 'Làm nửa ngày' ? Math.round(standardMinutes / 2) : standardMinutes;

  if (workMinutes > targetMinutes) {
    overtimeMinutes = workMinutes - targetMinutes;
  } else if (workMinutes < targetMinutes) {
    missingMinutes = targetMinutes - workMinutes;
  }

  const overtimeHours = minutesToHours(overtimeMinutes);
  const missingHours = minutesToHours(missingMinutes);

  return {
    breakDurationMinutes: breakMinutes,
    breakDurationHours,
    totalMinutes: workMinutes,
    totalHours,
    overtimeMinutes,
    overtimeHours,
    missingMinutes,
    missingHours,
  };
}

export function calculateInvestmentHoldings(assets: any[], transactions: any[], method: string): any[] {
  let totalPortfolioValue = 0;
  
  const holdings = assets.map(asset => {
    const txs = transactions.filter(t => t.asset_id === asset.id).sort((a,b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    let currentQuantity = 0;
    let totalInvested = 0;
    let realizedProfit = 0;
    
    // Simple weighted average implementation
    txs.forEach(tx => {
      if (tx.transaction_type === 'buy') {
        currentQuantity += tx.quantity;
        totalInvested += (tx.quantity * (tx.price || tx.price_per_unit || 0)) + (tx.fee || 0);
      } else if (tx.transaction_type === 'sell') {
        if (currentQuantity > 0) {
          const avgBuyPrice = totalInvested / currentQuantity;
          const costOfSold = avgBuyPrice * tx.quantity;
          const revenue = (tx.quantity * (tx.price || tx.price_per_unit || 0)) - (tx.fee || 0);
          realizedProfit += revenue - costOfSold;
          currentQuantity -= tx.quantity;
          totalInvested -= costOfSold;
        }
      } else if (tx.transaction_type === 'dividend' || tx.transaction_type === 'reward') {
         // Free coins/money
         if (tx.price === 0 || !tx.price) {
            currentQuantity += tx.quantity;
         } else {
            // cash dividend treated as realized profit if quantity is 0?
            if (tx.quantity === 0 && tx.total_amount) {
               realizedProfit += tx.total_amount;
            }
         }
      }
    });

    const currentPrice = asset.current_price || 0;
    const currentValue = currentQuantity * currentPrice;
    const avgBuyPrice = currentQuantity > 0 ? totalInvested / currentQuantity : 0;
    const totalProfit = currentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    totalPortfolioValue += currentValue;

    return {
      asset,
      currentQuantity,
      totalQuantity: currentQuantity,
      totalInvested,
      avgBuyPrice,
      averageCost: avgBuyPrice,
      currentPrice,
      currentValue,
      totalProfit,
      profitPercentage,
      realizedProfit,
      portfolioWeight: 0,
      transactionsCount: txs.length
    };
  });

  return holdings.map(h => {
    h.portfolioWeight = totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0;
    return h;
  });
}
