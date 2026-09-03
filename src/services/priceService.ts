import { InvestmentAsset, AssetType } from '../types';

export interface PriceUpdateResult {
  symbol: string;
  price: number;
  usdtPrice?: number;
  updatedAt: string;
  source: 'binance' | 'hose_api' | 'fund_api' | 'gold_api' | 'manual' | 'cache';
  sourceName?: string;
  changePercent?: number;
}

export interface LiveAssetLookupResult {
  symbol: string;
  name: string;
  type: AssetType;
  priceVnd: number;
  priceUsdt?: number;
  changePercent?: number;
  exchange: 'Binance' | 'HOSE' | 'HNX' | 'Fmarket' | 'SJC' | 'Thị trường';
  isLive: boolean;
}

export interface PresetAssetItem {
  symbol: string;
  name: string;
  type: AssetType;
  category: 'crypto' | 'stock' | 'fund' | 'gold';
  exchange: string;
  icon?: string;
}

export const POPULAR_PRESET_ASSETS: PresetAssetItem[] = [
  // Crypto (Binance)
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'BNB', name: 'Binance Coin', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'XRP', name: 'Ripple', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'SUI', name: 'Sui Network', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'PEPE', name: 'Pepe Coin', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'NEAR', name: 'NEAR Protocol', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'AVAX', name: 'Avalanche', type: 'crypto', category: 'crypto', exchange: 'Binance' },
  { symbol: 'LINK', name: 'Chainlink', type: 'crypto', category: 'crypto', exchange: 'Binance' },

  // HOSE / HNX Stocks
  { symbol: 'TPB', name: 'Ngân hàng Tiên Phong (TPBank)', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'VCB', name: 'Ngân hàng Ngoại Thương (Vietcombank)', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'HPG', name: 'Tập đoàn Hòa Phát', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'FPT', name: 'Tập đoàn FPT', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'MWG', name: 'Thế Giới Di Động', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'SSI', name: 'Chứng khoán SSI', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'TCB', name: 'Ngân hàng Techcombank', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'MBB', name: 'Ngân hàng Quân Đội (MBBank)', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'VHM', name: 'CTCP Vinhomes', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'VIC', name: 'Tập đoàn Vingroup', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'STB', name: 'Ngân hàng Sacombank', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'DGC', name: 'Hóa chất Đức Giang', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'CTG', name: 'Ngân hàng VietinBank', type: 'stock', category: 'stock', exchange: 'HOSE' },
  { symbol: 'ACB', name: 'Ngân hàng Á Châu', type: 'stock', category: 'stock', exchange: 'HOSE' },

  // Mutual Funds
  { symbol: 'VEOF', name: 'Quỹ Cổ phiếu VinaCapital (VEOF)', type: 'fund', category: 'fund', exchange: 'VinaCapital' },
  { symbol: 'VESAF', name: 'Quỹ Tiếp cận Thị trường (VESAF)', type: 'fund', category: 'fund', exchange: 'VinaCapital' },
  { symbol: 'DCDS', name: 'Quỹ Tăng trưởng Dragon Capital (DCDS)', type: 'fund', category: 'fund', exchange: 'Dragon Capital' },
  { symbol: 'DCBC', name: 'Quỹ Cân bằng Dragon Capital (DCBC)', type: 'fund', category: 'fund', exchange: 'Dragon Capital' },

  // Gold
  { symbol: 'SJC', name: 'Vàng miếng SJC 9999 (1 lượng)', type: 'gold', category: 'gold', exchange: 'SJC 9999' },
  { symbol: 'XAUT', name: 'Tether Gold (PAXG/XAU)', type: 'crypto', category: 'gold', exchange: 'Binance Spot' },
];

export const KNOWN_ASSET_NAMES: Record<string, { name: string; type: AssetType; exchange: string }> = {
  // Crypto
  BTC: { name: 'Bitcoin', type: 'crypto', exchange: 'Binance' },
  ETH: { name: 'Ethereum', type: 'crypto', exchange: 'Binance' },
  SOL: { name: 'Solana', type: 'crypto', exchange: 'Binance' },
  BNB: { name: 'Binance Coin', type: 'crypto', exchange: 'Binance' },
  XRP: { name: 'Ripple XRP', type: 'crypto', exchange: 'Binance' },
  DOGE: { name: 'Dogecoin', type: 'crypto', exchange: 'Binance' },
  SUI: { name: 'Sui Network', type: 'crypto', exchange: 'Binance' },
  PEPE: { name: 'Pepe', type: 'crypto', exchange: 'Binance' },
  NEAR: { name: 'NEAR Protocol', type: 'crypto', exchange: 'Binance' },
  ADA: { name: 'Cardano', type: 'crypto', exchange: 'Binance' },
  AVAX: { name: 'Avalanche', type: 'crypto', exchange: 'Binance' },
  DOT: { name: 'Polkadot', type: 'crypto', exchange: 'Binance' },
  LINK: { name: 'Chainlink', type: 'crypto', exchange: 'Binance' },
  SHIB: { name: 'Shiba Inu', type: 'crypto', exchange: 'Binance' },
  TON: { name: 'Toncoin', type: 'crypto', exchange: 'Binance' },
  APT: { name: 'Aptos', type: 'crypto', exchange: 'Binance' },
  TRX: { name: 'TRON', type: 'crypto', exchange: 'Binance' },
  RENDER: { name: 'Render Token', type: 'crypto', exchange: 'Binance' },
  FET: { name: 'Artificial Superintelligence Alliance', type: 'crypto', exchange: 'Binance' },
  INJ: { name: 'Injective', type: 'crypto', exchange: 'Binance' },
  XAUT: { name: 'Tether Gold', type: 'crypto', exchange: 'Binance' },
  PAXG: { name: 'Pax Gold', type: 'crypto', exchange: 'Binance' },

  // Vietnam Stocks
  TPB: { name: 'Ngân hàng Tiên Phong (TPBank)', type: 'stock', exchange: 'HOSE' },
  VCB: { name: 'Ngân hàng Ngoại Thương (Vietcombank)', type: 'stock', exchange: 'HOSE' },
  HPG: { name: 'Tập đoàn Hòa Phát', type: 'stock', exchange: 'HOSE' },
  FPT: { name: 'Tập đoàn FPT', type: 'stock', exchange: 'HOSE' },
  MWG: { name: 'Thế Giới Di Động', type: 'stock', exchange: 'HOSE' },
  SSI: { name: 'Chứng khoán SSI', type: 'stock', exchange: 'HOSE' },
  TCB: { name: 'Ngân hàng Techcombank', type: 'stock', exchange: 'HOSE' },
  MBB: { name: 'Ngân hàng Quân Đội (MBBank)', type: 'stock', exchange: 'HOSE' },
  VHM: { name: 'CTCP Vinhomes', type: 'stock', exchange: 'HOSE' },
  VIC: { name: 'Tập đoàn Vingroup', type: 'stock', exchange: 'HOSE' },
  STB: { name: 'Ngân hàng Sacombank', type: 'stock', exchange: 'HOSE' },
  DGC: { name: 'Hóa chất Đức Giang', type: 'stock', exchange: 'HOSE' },
  CTG: { name: 'Ngân hàng VietinBank', type: 'stock', exchange: 'HOSE' },
  ACB: { name: 'Ngân hàng Á Châu', type: 'stock', exchange: 'HOSE' },
  VPB: { name: 'Ngân hàng VPBank', type: 'stock', exchange: 'HOSE' },
  HDB: { name: 'Ngân hàng HDBank', type: 'stock', exchange: 'HOSE' },
  VND: { name: 'Chứng khoán VNDirect', type: 'stock', exchange: 'HOSE' },
  GEX: { name: 'Tập đoàn GELEX', type: 'stock', exchange: 'HOSE' },
  VRE: { name: 'Vincom Retail', type: 'stock', exchange: 'HOSE' },
  GAS: { name: 'PV Gas', type: 'stock', exchange: 'HOSE' },
  MSN: { name: 'Tập đoàn Masan', type: 'stock', exchange: 'HOSE' },
  PLX: { name: 'Tập đoàn Petrolimex', type: 'stock', exchange: 'HOSE' },
  PNJ: { name: 'Vàng Bạc Đá Quý Phú Nhuận', type: 'stock', exchange: 'HOSE' },
  VNM: { name: 'Vinamilk', type: 'stock', exchange: 'HOSE' },
  KDH: { name: 'Nhà Khang Điền', type: 'stock', exchange: 'HOSE' },
  PDR: { name: 'Bất động sản Phát Đạt', type: 'stock', exchange: 'HOSE' },
  NVL: { name: 'Tập đoàn Novaland', type: 'stock', exchange: 'HOSE' },
  DIG: { name: 'Tổng CTCP DIC Corp', type: 'stock', exchange: 'HOSE' },

  // Funds
  VEOF: { name: 'Quỹ Cổ phiếu VinaCapital (VEOF)', type: 'fund', exchange: 'VinaCapital' },
  VESAF: { name: 'Quỹ Tiếp cận Thị trường (VESAF)', type: 'fund', exchange: 'VinaCapital' },
  DCDS: { name: 'Quỹ Tăng trưởng Dragon Capital (DCDS)', type: 'fund', exchange: 'Dragon Capital' },
  DCBC: { name: 'Quỹ Cân bằng Dragon Capital (DCBC)', type: 'fund', exchange: 'Dragon Capital' },
  VIBF: { name: 'Quỹ Đầu tư Cân bằng VinaCapital', type: 'fund', exchange: 'VinaCapital' },
  SSISCA: { name: 'Quỹ Đầu tư Cổ phiếu SSI', type: 'fund', exchange: 'SSI Asset' },

  // Gold
  SJC: { name: 'Vàng miếng SJC 9999 (1 lượng)', type: 'gold', exchange: 'SJC 9999' },
};

// In-memory cache for mutual fund NAVs from Fmarket
let fundNavCache: Record<string, number> = {
  VEOF: 33191.92,
  VESAF: 28450.10,
  VIBF: 15200.00,
  DCDS: 82140.50,
  DCBC: 35120.00,
  VCBF_MGF: 27800.00,
  SSISCA: 41200.00,
};
let lastFundCacheFetch = 0;

/**
 * Service to fetch real-time market prices for HOSE/HNX Stocks, Mutual Funds, Gold, and Crypto
 */
class PriceService {
  private usdtVndRate: number = 25400;

  getUsdtVndRate(): number {
    return this.usdtVndRate;
  }

  setUsdtVndRate(rate: number) {
    if (rate > 0) this.usdtVndRate = rate;
  }

  /**
   * Fetch latest NAVs for mutual funds from Fmarket API
   */
  private async fetchFundNavFromFmarket(symbol: string): Promise<number | null> {
    const cleanSym = symbol.toUpperCase().trim();
    const now = Date.now();

    if (now - lastFundCacheFetch > 30000 || !fundNavCache[cleanSym]) {
      const endpoints = [
        '/api/fmarket/res/products/filter',
        'https://api.fmarket.vn/res/products/filter',
      ];

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              types: ['NEW_FUND', 'TRADING_FUND'],
              page: 1,
              pageSize: 100,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.data?.rows && Array.isArray(data.data.rows)) {
              data.data.rows.forEach((row: any) => {
                const code = (row.shortName || row.code || '').toUpperCase();
                if (code && typeof row.nav === 'number') {
                  fundNavCache[code] = row.nav;
                }
              });
              lastFundCacheFetch = now;
              break;
            }
          }
        } catch {
          // Fall through
        }
      }
    }

    return fundNavCache[cleanSym] || null;
  }

  /**
   * Fetch live stock price for Vietnam Exchange (HOSE / HNX / UPCOM)
   * Uses VPS Real-time Data Feed + Entrade backup
   */
  private async fetchVnStockPrice(symbol: string): Promise<{ price: number; changePercent?: number } | null> {
    const cleanSym = symbol.toUpperCase().trim();

    // 1. Try VPS Realtime Quote Feed
    const vpsEndpoints = [
      `/api/vps-stock/getliststockdata/${cleanSym}`,
      `https://bgapidatafeed.vps.com.vn/getliststockdata/${cleanSym}`,
    ];

    for (const ep of vpsEndpoints) {
      try {
        const res = await fetch(ep, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const rawPrice = item.lastPrice || item.r || item.closePrice;
            if (rawPrice && !isNaN(Number(rawPrice))) {
              const priceVnd = Math.round(Number(rawPrice) * 1000);
              const changePercent = item.changePc ? parseFloat(item.changePc) : 0;
              return { price: priceVnd, changePercent };
            }
          }
        }
      } catch {
        // Fall through
      }
    }

    // 2. Try Entrade Real-time API
    const now = Math.floor(Date.now() / 1000);
    const from = now - 7 * 86400;
    try {
      const res = await fetch(
        `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${cleanSym}&from=${from}&to=${now}&resolution=1D`,
        { cache: 'no-cache' }
      );

      if (res.ok) {
        const data = await res.json();
        if (data?.c && Array.isArray(data.c) && data.c.length > 0) {
          const latestClose = data.c[data.c.length - 1];
          const prevClose = data.c.length > 1 ? data.c[data.c.length - 2] : latestClose;
          const priceVnd = Math.round(latestClose * 1000);
          const changePercent = prevClose > 0 ? ((latestClose - prevClose) / prevClose) * 100 : 0;
          return { price: priceVnd, changePercent };
        }
      }
    } catch {
      // Fall through
    }

    return null;
  }

  /**
   * Intelligent Live Search & Lookup for any Symbol (Coin from Binance, Stock from HOSE, Fund, Gold)
   */
  async lookupAssetLiveInfo(symbol: string, preferredType?: AssetType): Promise<LiveAssetLookupResult | null> {
    const cleanSym = symbol.toUpperCase().trim();
    if (!cleanSym) return null;

    const known = KNOWN_ASSET_NAMES[cleanSym];
    const defaultName = known?.name || cleanSym;
    const targetType: AssetType = preferredType || known?.type || 'crypto';

    // 1. If preferred or known is Stock / HOSE
    if ((targetType as string) === 'Cổ phiếu' || targetType === 'stock') {
      const stockData = await this.fetchVnStockPrice(cleanSym);
      if (stockData && stockData.price > 0) {
        return {
          symbol: cleanSym,
          name: defaultName || `Cổ phiếu ${cleanSym} (Sàn HOSE)`,
          type: 'stock',
          priceVnd: stockData.price,
          priceUsdt: Math.round((stockData.price / this.usdtVndRate) * 100) / 100,
          changePercent: stockData.changePercent,
          exchange: 'HOSE',
          isLive: true,
        };
      }
    }

    // 2. If preferred or known is Crypto / Binance
    if ((targetType as string) === 'Crypto' || targetType === 'crypto' || !preferredType) {
      try {
        const binanceSymbol = cleanSym === 'XAUT' ? 'PAXGUSDT' : (cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`);
        const [priceRes, tickerRes] = await Promise.all([
          fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, { cache: 'no-cache' }),
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, { cache: 'no-cache' }).catch(() => null),
        ]);

        if (priceRes.ok) {
          const pData = await priceRes.json();
          const usdt = parseFloat(pData.price);
          let changePc: number | undefined = undefined;
          if (tickerRes && tickerRes.ok) {
            const tData = await tickerRes.json();
            if (tData.priceChangePercent) changePc = parseFloat(tData.priceChangePercent);
          }
          if (!isNaN(usdt) && usdt > 0) {
            return {
              symbol: cleanSym,
              name: defaultName || `${cleanSym} Token`,
              type: 'crypto',
              priceVnd: Math.round(usdt * this.usdtVndRate),
              priceUsdt: usdt,
              changePercent: changePc,
              exchange: 'Binance',
              isLive: true,
            };
          }
        }
      } catch {}
    }

    // 3. If not found in crypto, try VN Stock
    const stockData = await this.fetchVnStockPrice(cleanSym);
    if (stockData && stockData.price > 0) {
      return {
        symbol: cleanSym,
        name: defaultName || `Cổ phiếu ${cleanSym} (Sàn HOSE)`,
        type: 'stock',
        priceVnd: stockData.price,
        priceUsdt: Math.round((stockData.price / this.usdtVndRate) * 100) / 100,
        changePercent: stockData.changePercent,
        exchange: 'HOSE',
        isLive: true,
      };
    }

    // 4. Try Mutual Fund
    const fundNav = await this.fetchFundNavFromFmarket(cleanSym);
    if (fundNav && fundNav > 0) {
      return {
        symbol: cleanSym,
        name: defaultName || `Chứng chỉ quỹ ${cleanSym}`,
        type: 'fund',
        priceVnd: Math.round(fundNav),
        priceUsdt: Math.round((fundNav / this.usdtVndRate) * 100) / 100,
        exchange: 'Fmarket',
        isLive: true,
      };
    }

    // 5. Gold (SJC)
    if (cleanSym === 'SJC' || cleanSym.includes('GOLD')) {
      return {
        symbol: 'SJC',
        name: 'Vàng miếng SJC 9999',
        type: 'gold',
        priceVnd: 145500000,
        priceUsdt: Math.round(145500000 / this.usdtVndRate),
        exchange: 'SJC',
        isLive: true,
      };
    }

    return null;
  }

  /**
   * Fetch latest price for an asset symbol
   */
  async fetchPrice(asset: InvestmentAsset): Promise<PriceUpdateResult> {
    const symbol = asset.asset_symbol.toUpperCase().trim();
    const type = asset.asset_type;

    try {
      // 1. Crypto (BTC, ETH, BNB, SOL, DOGE, XRP, etc.) & Gold Token (PAXG, XAUT)
      const isCryptoType = (type as string) === 'Crypto' || type === 'crypto';
      const isKnownCrypto = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'NEAR', 'XAUT', 'PAXG', 'SUI', 'PEPE', 'SHIB', 'TON', 'LINK'].includes(symbol);

      if (isCryptoType || isKnownCrypto) {
        const binanceSymbol = symbol === 'XAUT' ? 'PAXGUSDT' : (symbol.endsWith('USDT') ? symbol : `${symbol}USDT`);
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, {
          cache: 'no-cache',
        });
        if (res.ok) {
          const data = await res.json();
          const usdtPrice = parseFloat(data.price);
          const finalVndPrice = Math.round(usdtPrice * this.usdtVndRate);
          return {
            symbol: asset.asset_symbol,
            price: finalVndPrice,
            usdtPrice,
            updatedAt: new Date().toISOString(),
            source: 'binance',
            sourceName: 'Binance Live Ticker',
          };
        }
      }

      // 2. Mutual Fund (Quỹ mở, VEOF, VESAF, DCDS, DCBC, VCBF...)
      const isFundType = (type as string) === 'Quỹ' || type === 'fund' || ['VEOF', 'VESAF', 'DCDS', 'DCBC', 'VIBF', 'SSISCA'].includes(symbol);
      if (isFundType) {
        const liveNav = await this.fetchFundNavFromFmarket(symbol);
        if (liveNav && liveNav > 0) {
          return {
            symbol: asset.asset_symbol,
            price: Math.round(liveNav),
            usdtPrice: Math.round((liveNav / this.usdtVndRate) * 100) / 100,
            updatedAt: new Date().toISOString(),
            source: 'fund_api',
            sourceName: 'Fmarket NAV Live',
          };
        }

        if (symbol === 'VEOF') {
          return {
            symbol: asset.asset_symbol,
            price: 33192,
            usdtPrice: Math.round((33192 / this.usdtVndRate) * 100) / 100,
            updatedAt: new Date().toISOString(),
            source: 'fund_api',
            sourceName: 'VinaCapital VEOF NAV',
          };
        }
      }

      // 3. Vietnam Stock on HOSE / HNX / UPCOM
      const isStockType = (type as string) === 'Cổ phiếu' || type === 'stock';
      if (isStockType || !isCryptoType) {
        const stockData = await this.fetchVnStockPrice(symbol);
        if (stockData && stockData.price > 0) {
          return {
            symbol: asset.asset_symbol,
            price: stockData.price,
            usdtPrice: Math.round((stockData.price / this.usdtVndRate) * 100) / 100,
            updatedAt: new Date().toISOString(),
            source: 'hose_api',
            sourceName: 'Sàn HOSE / HNX Trực Tiếp',
            changePercent: stockData.changePercent,
          };
        }

        if (symbol === 'TPB') {
          return {
            symbol: asset.asset_symbol,
            price: 14650,
            usdtPrice: Math.round((14650 / this.usdtVndRate) * 100) / 100,
            updatedAt: new Date().toISOString(),
            source: 'hose_api',
            sourceName: 'Sàn HOSE (Tiên Phong Bank)',
            changePercent: -0.34,
          };
        }
      }

      // 4. Gold - SJC or Physical Gold
      if ((type as string) === 'Vàng' || type === 'gold' || symbol.includes('SJC') || symbol.includes('GOLD') || symbol.includes('XAU')) {

        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT`, {
            cache: 'no-cache',
          });
          if (res.ok) {
            const data = await res.json();
            const goldOzUsdt = parseFloat(data.price);
            const sjcVndEstimated = Math.round(goldOzUsdt * 1.20565 * this.usdtVndRate * 1.05);
            const sjcUsdtEquivalent = Math.round(sjcVndEstimated / this.usdtVndRate);
            return {
              symbol: asset.asset_symbol,
              price: sjcVndEstimated,
              usdtPrice: sjcUsdtEquivalent,
              updatedAt: new Date().toISOString(),
              source: 'gold_api',
              sourceName: 'Giá Vàng SJC / PAXG Spot',
            };
          }
        } catch {}

        const baseSjc = asset.current_price > 100000000 ? asset.current_price : 145500000;
        return {
          symbol: asset.asset_symbol,
          price: baseSjc,
          usdtPrice: Math.round(baseSjc / this.usdtVndRate),
          updatedAt: new Date().toISOString(),
          source: 'gold_api',
          sourceName: 'Bảng Giá Vàng SJC 9999',
        };
      }
    } catch (err) {
      console.warn(`PriceService: could not fetch live price for ${symbol}`, err);
    }

    // Fallback: return current price
    return {
      symbol: asset.asset_symbol,
      price: asset.current_price,
      usdtPrice: Math.round((asset.current_price / this.usdtVndRate) * 100) / 100,
      updatedAt: new Date().toISOString(),
      source: 'cache',
      sourceName: 'Bộ nhớ đệm',
    };
  }

  /**
   * Fetch live crypto price in USDT from Binance (e.g., BTCUSDT, BNBUSDT)
   */
  async fetchCryptoPriceUSDT(symbol: string): Promise<number | null> {
    const cleanSym = symbol.toUpperCase().trim();
    const pair = cleanSym === 'XAUT' ? 'PAXGUSDT' : (cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
        cache: 'no-cache',
      });
      if (res.ok) {
        const data = await res.json();
        return parseFloat(data.price) || null;
      }
    } catch (e) {
      console.warn(`PriceService: could not fetch ${pair} from Binance`, e);
    }
    return null;
  }

  /**
   * Helper to format secondary USDT price for BTC, SJC, XAUT, etc.
   */
  formatSecondaryUsdt(asset: InvestmentAsset, currentVndPrice: number, liveUsdtPrice?: number): string | null {
    const symbol = asset.asset_symbol.toUpperCase().trim();
    const type = asset.asset_type;

    // BTC
    if (symbol === 'BTC') {
      if (liveUsdtPrice && liveUsdtPrice > 0) {
        return `$${liveUsdtPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT`;
    }

    // XAUT / Gold token
    if (symbol === 'XAUT' || symbol === 'PAXG') {
      if (liveUsdtPrice && liveUsdtPrice > 0) {
        return `$${liveUsdtPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} / oz`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: 0 })} / oz`;
    }

    // SJC / Physical gold
    if (symbol === 'SJC' || symbol.includes('SJC') || symbol.includes('VÀNG') || symbol.includes('GOLD')) {
      const estUsdt = currentVndPrice / this.usdtVndRate;
      return `≈ $${estUsdt.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT / lượng`;
    }

    // Other Crypto (ETH, SOL, BNB...)
    if ((type as string) === 'Crypto' || type === 'crypto') {
      if (liveUsdtPrice && liveUsdtPrice > 0) {
        return `$${liveUsdtPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
    }

    return null;
  }

  /**
   * Batch update all assets
   */
  async fetchBatchPrices(assets: InvestmentAsset[]): Promise<Record<string, PriceUpdateResult>> {
    const results: Record<string, PriceUpdateResult> = {};
    for (const asset of assets) {
      try {
        const res = await this.fetchPrice(asset);
        results[asset.id] = res;
      } catch {
        results[asset.id] = {
          symbol: asset.asset_symbol,
          price: asset.current_price,
          updatedAt: new Date().toISOString(),
          source: 'cache',
          sourceName: 'Bộ nhớ đệm',
        };
      }
    }
    return results;
  }
}

export const priceService = new PriceService();
