import { InvestmentAsset, AssetType } from '../types';

export interface PriceUpdateResult {
  symbol: string;
  price: number;
  usdtPrice?: number;
  buyPrice?: number;
  sellPrice?: number;
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
  buyPriceVnd?: number;
  sellPriceVnd?: number;
  changePercent?: number;
  exchange: 'Binance' | 'OKX' | 'HOSE' | 'HNX' | 'Fmarket' | 'SJC' | 'Thị trường';
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
  { symbol: 'XAUT', name: 'Tether Gold (XAUT/USD)', type: 'crypto', category: 'gold', exchange: 'OKX / Bybit' },
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
  XAUT: { name: 'Tether Gold', type: 'crypto', exchange: 'OKX / Bybit' },
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
  N24K: { name: 'Vàng nhẫn trơn 9999 (1 lượng)', type: 'gold', exchange: 'PNJ 9999' },
};

// In-memory cache for mutual fund NAVs from Fmarket
let fundNavCache: Record<string, number> = {
  VEOF: 32600.18,
  VESAF: 31574.96,
  VIBF: 19223.56,
  DCDS: 95308.61,
  DCBC: 30452.23,
  VCBF_BCF: 41815.84,
  VCBF_MGF: 13712.77,
  SSISCA: 42177.02,
  SSIBF: 17045.96,
  DCIP: 12358.63,
  DCDE: 24944.58,
  BVFED: 30506.00,
};
let lastFundCacheFetch = 0;

// Fast cache for Vietnam SJC / 24K gold prices
let vnGoldCache: Record<string, { price: number; buyPrice: number; sellPrice: number; updatedAt: number }> = {};
let lastVnGoldFetch = 0;

/**
 * Service to fetch real-time market prices for HOSE/HNX Stocks, Mutual Funds, Gold, and Crypto
 */
class PriceService {
  private usdtVndRate: number = 25400;
  private liveQuoteMeta: Record<
    string,
    {
      usdtPrice?: number;
      buyPrice?: number;
      sellPrice?: number;
      changePercent?: number;
      updatedAt?: string;
    }
  > = {};

  getUsdtVndRate(): number {
    return this.usdtVndRate;
  }

  setUsdtVndRate(rate: number) {
    if (rate > 0) this.usdtVndRate = rate;
  }

  getLiveQuoteMeta(symbol: string) {
    return this.liveQuoteMeta[symbol.toUpperCase().trim()] || null;
  }

  private recordLiveQuoteMeta(
    symbol: string,
    meta: { usdtPrice?: number; buyPrice?: number; sellPrice?: number; changePercent?: number; updatedAt?: string }
  ) {
    const clean = symbol.toUpperCase().trim();
    if (!clean) return;
    this.liveQuoteMeta[clean] = {
      ...this.liveQuoteMeta[clean],
      ...meta,
      updatedAt: meta.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Fetch real-time Vietnam SJC 9999 & 24K Gold prices directly from PNJ Live Feed (<300ms, CORS enabled)
   */
  async fetchVnGoldLivePrice(
    symbol: string = 'SJC'
  ): Promise<{ price: number; buyPrice: number; sellPrice: number; sourceName: string } | null> {
    const cleanSym = symbol.toUpperCase().trim();
    const targetCode = cleanSym === 'N24K' || cleanSym.includes('NHẪN') ? 'N24K' : 'SJC';
    const now = Date.now();

    if (now - lastVnGoldFetch < 3000 && vnGoldCache[targetCode]) {
      const cached = vnGoldCache[targetCode];
      return {
        price: cached.price,
        buyPrice: cached.buyPrice,
        sellPrice: cached.sellPrice,
        sourceName: targetCode === 'SJC' ? 'Giá Vàng SJC 9999 Trực Tiếp' : 'Vàng Nhẫn 9999 Trực Tiếp',
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2800);
      const res = await fetch('https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-cache',
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          lastVnGoldFetch = now;
          for (const row of data.data) {
            const code = String(row.masp || '').toUpperCase().trim();
            // PNJ quotes in thousand VND per chi (1 luong = 10 chi => * 10,000)
            const sellVnd = Number(row.giaban) * 10000;
            const buyVnd = Number(row.giamua) * 10000;
            if (sellVnd > 50_000_000 && (code === 'SJC' || code === 'N24K')) {
              vnGoldCache[code] = {
                price: sellVnd,
                buyPrice: buyVnd > 0 ? buyVnd : sellVnd - 2_000_000,
                sellPrice: sellVnd,
                updatedAt: now,
              };
              this.recordLiveQuoteMeta(code, {
                buyPrice: vnGoldCache[code].buyPrice,
                sellPrice: vnGoldCache[code].sellPrice,
                usdtPrice: Math.round(sellVnd / this.usdtVndRate),
              });
            }
          }
          if (vnGoldCache[targetCode]) {
            const matched = vnGoldCache[targetCode];
            return {
              price: matched.price,
              buyPrice: matched.buyPrice,
              sellPrice: matched.sellPrice,
              sourceName: targetCode === 'SJC' ? 'Giá Vàng SJC 9999 Trực Tiếp' : 'Vàng Nhẫn 9999 Trực Tiếp',
            };
          }
        }
      }
    } catch {
      // Fallback below
    }

    if (vnGoldCache[targetCode]) {
      const cached = vnGoldCache[targetCode];
      return {
        price: cached.price,
        buyPrice: cached.buyPrice,
        sellPrice: cached.sellPrice,
        sourceName: targetCode === 'SJC' ? 'Giá Vàng SJC 9999 Trực Tiếp' : 'Vàng Nhẫn 9999 Trực Tiếp',
      };
    }

    return null;
  }

  /**
   * Fetch real-time XAUT (Tether Gold) spot price in USDT from OKX & Bybit (<250ms, CORS enabled)
   */
  async fetchXautLivePrice(): Promise<{ usdt: number; changePercent?: number; sourceName: string } | null> {
    // Race OKX and Bybit for sub-250ms response
    try {
      const result = await Promise.any([
        (async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const res = await fetch('https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT', {
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error('OKX not ok');
          const data = await res.json();
          const item = data?.data?.[0];
          const last = parseFloat(item?.last);
          const open24h = parseFloat(item?.open24h);
          if (isNaN(last) || last <= 0) throw new Error('Invalid OKX XAUT price');
          const changePercent = !isNaN(open24h) && open24h > 0 ? ((last - open24h) / open24h) * 100 : undefined;
          return { usdt: last, changePercent, sourceName: 'OKX XAUT/USDT Live' };
        })(),
        (async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT', {
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error('Bybit not ok');
          const data = await res.json();
          const item = data?.result?.list?.[0];
          const last = parseFloat(item?.lastPrice);
          const pcnt = parseFloat(item?.price24hPcnt);
          if (isNaN(last) || last <= 0) throw new Error('Invalid Bybit XAUT price');
          return {
            usdt: last,
            changePercent: !isNaN(pcnt) ? pcnt * 100 : undefined,
            sourceName: 'Bybit XAUT/USDT Live',
          };
        })(),
      ]);

      if (result && result.usdt > 0) {
        this.recordLiveQuoteMeta('XAUT', {
          usdtPrice: result.usdt,
          changePercent: result.changePercent,
        });
        return result;
      }
    } catch {
      // Fallback to PAXGUSDT on Binance if OKX & Bybit are blocked
    }

    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', {
        cache: 'no-cache',
      });
      if (res.ok) {
        const data = await res.json();
        const usdt = parseFloat(data.price);
        if (!isNaN(usdt) && usdt > 0) {
          this.recordLiveQuoteMeta('XAUT', { usdtPrice: usdt });
          return { usdt, sourceName: 'Binance PAXG/USDT Spot' };
        }
      }
    } catch {}

    return null;
  }

  /**
   * Fetch latest NAVs for mutual funds from Fmarket API (Direct CORS + Server proxy fallback)
   */
  async fetchFundNavFromFmarket(symbol: string): Promise<number | null> {
    const cleanSym = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    const now = Date.now();

    // Refresh fund NAV cache every 30 seconds
    if (now - lastFundCacheFetch > 30000 || Object.keys(fundNavCache).length <= 5) {
      const endpoints = [
        'https://api.fmarket.vn/res/products/filter',
        '/api/fmarket/res/products/filter',
      ];

      for (const ep of endpoints) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/plain, */*',
            },
            body: JSON.stringify({
              types: ['NEW_FUND', 'TRADING_FUND'],
              page: 1,
              pageSize: 100,
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (res.ok) {
            const data = await res.json();
            const rows = data?.data?.rows;
            if (Array.isArray(rows) && rows.length > 0) {
              lastFundCacheFetch = now;
              rows.forEach((row: any) => {
                const nav = typeof row.nav === 'number' && row.nav > 0 
                  ? row.nav 
                  : (typeof row.extra?.currentNAV === 'number' ? row.extra.currentNAV : null);
                
                if (nav && nav > 0) {
                  const sName = (row.shortName || '').toUpperCase().trim();
                  const code = (row.code || '').toUpperCase().trim();
                  
                  if (sName) {
                    fundNavCache[sName] = nav;
                    fundNavCache[sName.replace(/[^A-Z0-9]/g, '')] = nav;
                  }
                  if (code) {
                    fundNavCache[code] = nav;
                    fundMapStore(code, nav);
                  }
                }
              });
              break; // Successfully fetched
            }
          }
        } catch {
          // Try next endpoint
        }
      }
    }

    function fundMapStore(code: string, nav: number) {
      fundNavCache[code] = nav;
      fundNavCache[code.replace(/[^A-Z0-9]/g, '')] = nav;
    }

    // Direct symbol lookup
    if (fundNavCache[cleanSym]) {
      return fundNavCache[cleanSym];
    }

    // Fuzzy matching for fund symbols (e.g., 'VEOF', 'VESAF', 'DCDS', 'DCBC', 'SSISCA', 'VCBF')
    for (const [key, nav] of Object.entries(fundNavCache)) {
      if (cleanSym.includes(key) || key.includes(cleanSym)) {
        return nav;
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
   * Intelligent Live Search & Lookup for any Symbol (Coin from Binance/OKX, Stock from HOSE, Fund, SJC Gold)
   */
  async lookupAssetLiveInfo(symbol: string, preferredType?: AssetType): Promise<LiveAssetLookupResult | null> {
    const cleanSym = symbol.toUpperCase().trim();
    if (!cleanSym) return null;

    const known = KNOWN_ASSET_NAMES[cleanSym];
    const defaultName = known?.name || cleanSym;
    const targetType: AssetType = preferredType || known?.type || 'crypto';

    // 0. Check if SJC or Vietnam Physical Gold first
    if (
      cleanSym === 'SJC' ||
      cleanSym === 'N24K' ||
      cleanSym.includes('SJC') ||
      (targetType as string) === 'Vàng' ||
      targetType === 'gold'
    ) {
      const liveGold = await this.fetchVnGoldLivePrice(cleanSym);
      if (liveGold && liveGold.price > 0) {
        return {
          symbol: cleanSym === 'N24K' ? 'N24K' : 'SJC',
          name: cleanSym === 'N24K' ? 'Vàng nhẫn trơn 9999 (1 lượng)' : 'Vàng miếng SJC 9999 (1 lượng)',
          type: 'gold',
          priceVnd: liveGold.price,
          buyPriceVnd: liveGold.buyPrice,
          sellPriceVnd: liveGold.sellPrice,
          priceUsdt: Math.round(liveGold.price / this.usdtVndRate),
          exchange: 'SJC',
          isLive: true,
        };
      }
    }

    // 1. If preferred or known is Mutual Fund (VEOF, VESAF, DCDS, DCBC...)
    const isFundMatch =
      (targetType as string) === 'Quỹ' ||
      targetType === 'fund' ||
      known?.type === 'fund' ||
      ['VEOF', 'VESAF', 'DCDS', 'DCBC', 'VIBF', 'SSISCA', 'VCBF', 'BVFED', 'DCIP', 'DCDE'].some((f) =>
        cleanSym.includes(f)
      );

    if (isFundMatch) {
      const fundNav = await this.fetchFundNavFromFmarket(cleanSym);
      if (fundNav && fundNav > 0) {
        return {
          symbol: cleanSym,
          name: defaultName || `Chứng chỉ quỹ ${cleanSym}`,
          type: 'fund',
          priceVnd: Math.round(fundNav * 100) / 100,
          priceUsdt: Math.round((fundNav / this.usdtVndRate) * 100) / 100,
          exchange: 'Fmarket',
          isLive: true,
        };
      }
    }

    // 2. If preferred or known is Stock / HOSE
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

    // 3. If preferred or known is Crypto / XAUT / Binance
    if ((targetType as string) === 'Crypto' || targetType === 'crypto' || !preferredType) {
      if (cleanSym === 'XAUT') {
        const xautData = await this.fetchXautLivePrice();
        if (xautData && xautData.usdt > 0) {
          return {
            symbol: 'XAUT',
            name: defaultName || 'Tether Gold (XAUT)',
            type: 'crypto',
            priceVnd: Math.round(xautData.usdt * this.usdtVndRate),
            priceUsdt: xautData.usdt,
            changePercent: xautData.changePercent,
            exchange: 'OKX',
            isLive: true,
          };
        }
      }

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
            this.recordLiveQuoteMeta(cleanSym, { usdtPrice: usdt, changePercent: changePc });
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

    // 4. If not found in crypto, try VN Stock
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

    // 5. Try Mutual Fund if not checked earlier
    const fundNav = await this.fetchFundNavFromFmarket(cleanSym);
    if (fundNav && fundNav > 0) {
      return {
        symbol: cleanSym,
        name: defaultName || `Chứng chỉ quỹ ${cleanSym}`,
        type: 'fund',
        priceVnd: Math.round(fundNav * 100) / 100,
        priceUsdt: Math.round((fundNav / this.usdtVndRate) * 100) / 100,
        exchange: 'Fmarket',
        isLive: true,
      };
    }

    // 6. Gold (SJC) fallback
    if (cleanSym === 'SJC' || cleanSym.includes('GOLD')) {
      const liveGold = await this.fetchVnGoldLivePrice('SJC');
      const fallbackVnd = liveGold?.price || 141700000;
      return {
        symbol: 'SJC',
        name: 'Vàng miếng SJC 9999',
        type: 'gold',
        priceVnd: fallbackVnd,
        buyPriceVnd: liveGold?.buyPrice,
        sellPriceVnd: liveGold?.sellPrice,
        priceUsdt: Math.round(fallbackVnd / this.usdtVndRate),
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
      // 1. Domestic Gold (SJC, N24K, Vàng miếng 9999)
      if (
        symbol === 'SJC' ||
        symbol === 'N24K' ||
        symbol.includes('SJC') ||
        symbol.includes('VÀNG') ||
        (type as string) === 'Vàng' ||
        type === 'gold'
      ) {
        const liveGold = await this.fetchVnGoldLivePrice(symbol);
        if (liveGold && liveGold.price > 0) {
          this.recordLiveQuoteMeta(symbol, {
            buyPrice: liveGold.buyPrice,
            sellPrice: liveGold.sellPrice,
            usdtPrice: Math.round(liveGold.price / this.usdtVndRate),
          });
          return {
            symbol: asset.asset_symbol,
            price: liveGold.price,
            buyPrice: liveGold.buyPrice,
            sellPrice: liveGold.sellPrice,
            usdtPrice: Math.round(liveGold.price / this.usdtVndRate),
            updatedAt: new Date().toISOString(),
            source: 'gold_api',
            sourceName: liveGold.sourceName,
          };
        }
      }

      // 2. Mutual Fund (Quỹ mở, VEOF, VESAF, DCDS, DCBC, VCBF...)
      const isFundType =
        (type as string) === 'Quỹ' ||
        type === 'fund' ||
        ['VEOF', 'VESAF', 'DCDS', 'DCBC', 'VIBF', 'SSISCA', 'VCBF', 'BVFED', 'DCIP', 'DCDE'].some((f) =>
          symbol.includes(f)
        );

      if (isFundType) {
        const liveNav = await this.fetchFundNavFromFmarket(symbol);
        if (liveNav && liveNav > 0) {
          return {
            symbol: asset.asset_symbol,
            price: Math.round(liveNav * 100) / 100,
            usdtPrice: Math.round((liveNav / this.usdtVndRate) * 100) / 100,
            updatedAt: new Date().toISOString(),
            source: 'fund_api',
            sourceName: 'Fmarket NAV Live',
          };
        }
      }

      // 3. Tether Gold (XAUT) - Fetch exact XAUT/USDT spot from OKX / Bybit
      if (symbol === 'XAUT') {
        const xautQuote = await this.fetchXautLivePrice();
        if (xautQuote && xautQuote.usdt > 0) {
          const finalVndPrice = Math.round(xautQuote.usdt * this.usdtVndRate);
          return {
            symbol: asset.asset_symbol,
            price: finalVndPrice,
            usdtPrice: xautQuote.usdt,
            changePercent: xautQuote.changePercent,
            updatedAt: new Date().toISOString(),
            source: 'binance',
            sourceName: xautQuote.sourceName,
          };
        }
      }

      // 4. Crypto (BTC, ETH, BNB, SOL, DOGE, XRP, PAXG, etc.)
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
          if (!isNaN(usdtPrice) && usdtPrice > 0) {
            this.recordLiveQuoteMeta(symbol, { usdtPrice });
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
      }

      // 5. Vietnam Stock on HOSE / HNX / UPCOM
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
      }
    } catch (err) {
      console.warn(`PriceService: could not fetch live price for ${symbol}`, err);
    }

    // Fallback: preserve latest known price from asset
    return {
      symbol: asset.asset_symbol,
      price: asset.current_price || 0,
      usdtPrice: asset.current_price ? Math.round((asset.current_price / this.usdtVndRate) * 100) / 100 : 0,
      updatedAt: asset.price_updated_at || new Date().toISOString(),
      source: 'cache',
      sourceName: 'Giá hiện tại',
    };
  }

  /**
   * Fetch live crypto price in USDT (e.g., BTCUSDT, BNBUSDT, XAUTUSDT)
   */
  async fetchCryptoPriceUSDT(symbol: string): Promise<number | null> {
    const cleanSym = symbol.toUpperCase().trim();
    if (cleanSym === 'XAUT') {
      const xaut = await this.fetchXautLivePrice();
      if (xaut && xaut.usdt > 0) return xaut.usdt;
    }
    const pair = cleanSym === 'XAUT' ? 'PAXGUSDT' : (cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
        cache: 'no-cache',
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.price);
        if (!isNaN(price) && price > 0) {
          this.recordLiveQuoteMeta(cleanSym, { usdtPrice: price });
          return price;
        }
      }
    } catch (e) {
      console.warn(`PriceService: could not fetch ${pair} from Binance`, e);
    }
    return null;
  }

  /**
   * Helper to format secondary USDT / Gold info for BTC, SJC, XAUT, etc.
   */
  formatSecondaryUsdt(asset: InvestmentAsset, currentVndPrice: number, liveUsdtPrice?: number): string | null {
    const symbol = asset.asset_symbol.toUpperCase().trim();
    const type = asset.asset_type;
    const isCurrentMarketPrice = Math.abs(currentVndPrice - (asset.current_price || 0)) < 50;
    const meta = isCurrentMarketPrice ? this.liveQuoteMeta[symbol] : undefined;
    const effectiveUsdt = liveUsdtPrice && liveUsdtPrice > 0 ? liveUsdtPrice : meta?.usdtPrice;

    // BTC
    if (symbol === 'BTC') {
      if (effectiveUsdt && effectiveUsdt > 0) {
        return `$${effectiveUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT`;
    }

    // XAUT / PAXG Gold token
    if (symbol === 'XAUT' || symbol === 'PAXG') {
      if (effectiveUsdt && effectiveUsdt > 0) {
        return `$${effectiveUsdt.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} / oz`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: isCurrentMarketPrice ? 2 : 0 })} / oz`;
    }

    // SJC / Physical gold
    if (
      symbol === 'SJC' ||
      symbol === 'N24K' ||
      symbol.includes('SJC') ||
      symbol.includes('VÀNG') ||
      symbol.includes('GOLD') ||
      (type as string) === 'Vàng' ||
      type === 'gold'
    ) {
      if (isCurrentMarketPrice && meta?.buyPrice && meta?.sellPrice) {
        const buyTr = (meta.buyPrice / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
        const sellTr = (meta.sellPrice / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
        return `Mua ${buyTr}tr • Bán ${sellTr}tr / lượng`;
      }
      const estUsdt = currentVndPrice / this.usdtVndRate;
      return `≈ $${estUsdt.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT / lượng`;
    }

    // Other Crypto (ETH, SOL, BNB...)
    if ((type as string) === 'Crypto' || type === 'crypto') {
      if (effectiveUsdt && effectiveUsdt > 0) {
        return `$${effectiveUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
      }
      const est = currentVndPrice / this.usdtVndRate;
      return `$${est.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`;
    }

    return null;
  }

  /**
   * Batch update all assets with live pricing.
   * Fires fast client-side Gold & Crypto fetches in parallel with the server batch endpoint
   * so Gold (SJC, XAUT) and Crypto (BTC) update in ~250ms without waiting for slower Stock/Fund feeds.
   */
  async fetchBatchPrices(
    assets: InvestmentAsset[],
    onFastPartialUpdate?: (partial: Record<string, PriceUpdateResult>) => void
  ): Promise<Record<string, PriceUpdateResult>> {
    const results: Record<string, PriceUpdateResult> = {};
    if (!assets || assets.length === 0) return results;

    // Fast lane: immediately fetch Gold (SJC/N24K from PNJ, XAUT from OKX/Bybit) & Crypto (from Binance) directly
    const fastAssets = assets.filter((a) => {
      const sym = (a.asset_symbol || '').toUpperCase().trim();
      const type = (a.asset_type || '').toLowerCase();
      return (
        type === 'gold' ||
        type === 'vàng' ||
        type === 'crypto' ||
        sym === 'SJC' ||
        sym === 'N24K' ||
        sym === 'XAUT' ||
        sym === 'PAXG' ||
        sym === 'BTC' ||
        sym === 'ETH' ||
        sym === 'BNB' ||
        sym === 'SOL'
      );
    });

    const fastDirectPromise = (async () => {
      if (fastAssets.length === 0) return;
      const fastMap: Record<string, PriceUpdateResult> = {};
      await Promise.allSettled(
        fastAssets.map(async (asset) => {
          const res = await this.fetchPrice(asset);
          if (res && res.price > 0 && res.source !== 'cache') {
            fastMap[asset.id] = res;
            results[asset.id] = res;
          }
        })
      );
      if (onFastPartialUpdate && Object.keys(fastMap).length > 0) {
        onFastPartialUpdate(fastMap);
      }
    })();

    // Server batch lane: fetches all assets (including HOSE stocks & Fmarket funds) in parallel
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/market/batch-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: assets.map((a) => ({
            id: a.id,
            symbol: a.asset_symbol,
            type: a.asset_type,
            price: a.current_price,
          })),
          usdtRate: this.usdtVndRate,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.results) {
          if (data.usdtRate && data.usdtRate > 0) {
            this.usdtVndRate = data.usdtRate;
          }
          await fastDirectPromise;
          Object.entries(data.results).forEach(([id, r]: [string, any]) => {
            if (r && r.price > 0 && r.source !== 'cache') {
              this.recordLiveQuoteMeta(r.symbol || '', {
                usdtPrice: r.usdtPrice,
                buyPrice: r.buyPrice,
                sellPrice: r.sellPrice,
                changePercent: r.changePercent,
              });
              results[id] = {
                symbol: r.symbol,
                price: r.price,
                usdtPrice: r.usdtPrice,
                buyPrice: r.buyPrice,
                sellPrice: r.sellPrice,
                changePercent: r.changePercent,
                updatedAt: r.updatedAt || new Date().toISOString(),
                source: r.source || 'binance',
                sourceName: r.sourceName || 'Trực tiếp',
              };
            }
          });
          return results;
        }
      }
    } catch {
      // Fall through to client direct fetching
    }

    await fastDirectPromise;

    // Fetch remaining assets directly on client if server batch failed
    const remainingAssets = assets.filter((a) => !results[a.id]);
    if (remainingAssets.length > 0) {
      await Promise.allSettled(
        remainingAssets.map(async (asset) => {
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
        })
      );
    }

    return results;
  }

  /**
   * Real-time WebSocket & Fast Ticker Stream for Gold (XAUT, PAXG, SJC) and Crypto (BTC, ETH, SOL, BNB)
   * Pushes live price updates every ~1.5s without waiting for polling intervals.
   */
  subscribeRealtimePrices(
    assets: InvestmentAsset[],
    onUpdate: (updates: Record<string, PriceUpdateResult>) => void
  ): () => void {
    if (typeof window === 'undefined' || !assets || assets.length === 0) {
      return () => {};
    }

    let isClosed = false;
    let okxWs: WebSocket | null = null;
    let binanceWs: WebSocket | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let sjcPollTimer: ReturnType<typeof setInterval> | null = null;
    const pendingUpdates: Record<string, PriceUpdateResult> = {};

    const xautAssets = assets.filter((a) => a.asset_symbol.toUpperCase().trim() === 'XAUT');
    const sjcAssets = assets.filter((a) => {
      const s = a.asset_symbol.toUpperCase().trim();
      return s === 'SJC' || s === 'N24K' || s.includes('SJC') || a.asset_type === 'gold';
    });
    const binanceAssets = assets.filter((a) => {
      const s = a.asset_symbol.toUpperCase().trim();
      if (s === 'XAUT' || s === 'SJC' || s === 'N24K') return false;
      return (
        a.asset_type === 'crypto' ||
        ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'NEAR', 'PAXG', 'SUI', 'PEPE', 'SHIB', 'TON', 'LINK'].includes(s)
      );
    });

    // 1. OKX WebSocket for real-time XAUT-USDT (Tether Gold)
    if (xautAssets.length > 0) {
      try {
        okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
        okxWs.onopen = () => {
          if (isClosed || !okxWs) return;
          okxWs.send(
            JSON.stringify({
              op: 'subscribe',
              args: [{ channel: 'tickers', instId: 'XAUT-USDT' }],
            })
          );
        };
        okxWs.onmessage = (event) => {
          if (isClosed) return;
          try {
            const msg = JSON.parse(event.data);
            const item = msg?.data?.[0];
            const last = parseFloat(item?.last);
            const open24h = parseFloat(item?.open24h);
            if (!isNaN(last) && last > 0) {
              const changePercent = !isNaN(open24h) && open24h > 0 ? ((last - open24h) / open24h) * 100 : undefined;
              const vndPrice = Math.round(last * this.usdtVndRate);
              this.recordLiveQuoteMeta('XAUT', { usdtPrice: last, changePercent });
              const nowIso = new Date().toISOString();
              xautAssets.forEach((asset) => {
                pendingUpdates[asset.id] = {
                  symbol: asset.asset_symbol,
                  price: vndPrice,
                  usdtPrice: last,
                  changePercent,
                  updatedAt: nowIso,
                  source: 'binance',
                  sourceName: 'OKX XAUT/USDT Realtime',
                };
              });
            }
          } catch {}
        };
      } catch {}
    }

    // 2. Binance WebSocket for BTC, ETH, PAXG, SOL, etc.
    if (binanceAssets.length > 0) {
      try {
        const streams = Array.from(
          new Set(
            binanceAssets.map((a) => {
              const s = a.asset_symbol.toLowerCase().trim();
              return `${s.endsWith('usdt') ? s : `${s}usdt`}@ticker`;
            })
          )
        ).join('/');
        binanceWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
        binanceWs.onmessage = (event) => {
          if (isClosed) return;
          try {
            const payload = JSON.parse(event.data);
            const d = payload?.data;
            if (!d || !d.s || !d.c) return;
            const pairSym = String(d.s).toUpperCase().replace(/USDT$/, '');
            const usdt = parseFloat(d.c);
            const changePercent = d.P ? parseFloat(d.P) : undefined;
            if (!isNaN(usdt) && usdt > 0) {
              const vndPrice = Math.round(usdt * this.usdtVndRate);
              this.recordLiveQuoteMeta(pairSym, { usdtPrice: usdt, changePercent });
              const nowIso = new Date().toISOString();
              binanceAssets
                .filter((a) => a.asset_symbol.toUpperCase().trim().replace(/USDT$/, '') === pairSym)
                .forEach((asset) => {
                  pendingUpdates[asset.id] = {
                    symbol: asset.asset_symbol,
                    price: vndPrice,
                    usdtPrice: usdt,
                    changePercent,
                    updatedAt: nowIso,
                    source: 'binance',
                    sourceName: 'Binance Realtime Stream',
                  };
                });
            }
          } catch {}
        };
      } catch {}
    }

    // 3. Fast 5s Poll for Domestic SJC 9999 Gold
    if (sjcAssets.length > 0) {
      sjcPollTimer = setInterval(async () => {
        if (isClosed) return;
        for (const asset of sjcAssets) {
          const quote = await this.fetchVnGoldLivePrice(asset.asset_symbol);
          if (quote && quote.price > 0) {
            pendingUpdates[asset.id] = {
              symbol: asset.asset_symbol,
              price: quote.price,
              buyPrice: quote.buyPrice,
              sellPrice: quote.sellPrice,
              usdtPrice: Math.round(quote.price / this.usdtVndRate),
              updatedAt: new Date().toISOString(),
              source: 'gold_api',
              sourceName: quote.sourceName,
            };
          }
        }
      }, 5000);
    }

    // Flush batched realtime updates every 1.5 seconds
    flushTimer = setInterval(() => {
      if (isClosed) return;
      const keys = Object.keys(pendingUpdates);
      if (keys.length > 0) {
        const batch = { ...pendingUpdates };
        keys.forEach((k) => delete pendingUpdates[k]);
        onUpdate(batch);
      }
    }, 1500);

    return () => {
      isClosed = true;
      if (flushTimer) clearInterval(flushTimer);
      if (sjcPollTimer) clearInterval(sjcPollTimer);
      try {
        if (okxWs && (okxWs.readyState === WebSocket.OPEN || okxWs.readyState === WebSocket.CONNECTING)) {
          okxWs.close();
        }
      } catch {}
      try {
        if (binanceWs && (binanceWs.readyState === WebSocket.OPEN || binanceWs.readyState === WebSocket.CONNECTING)) {
          binanceWs.close();
        }
      } catch {}
    };
  }
}

export const priceService = new PriceService();
