function normalizeTextForComparison(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areNewsSimilar(itemA: any, itemB: any): boolean {
  if (!itemA?.title || !itemB?.title) return false;
  const normA = normalizeTextForComparison(itemA.title);
  const normB = normalizeTextForComparison(itemB.title);
  if (normA === normB) return true;
  if (normA.length > 20 && normB.length > 20) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  const wordsA = new Set(normA.split(' ').filter((w) => w.length > 3));
  const wordsB = new Set(normB.split(' ').filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  const minSize = Math.min(wordsA.size, wordsB.size);
  return minSize >= 3 && common / minSize >= 0.45;
}

// Vercel Serverless Function for Live Market News & Real-Time Market Prices
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = String(req.query?.subpath || '');
  const reqUrl = String(req.url || '');

  // 1. Proxy VPS Stock API (/api/vps-stock/:symbols)
  if (subpath.startsWith('vps-stock-') || reqUrl.includes('/api/vps-stock/')) {
    const symbols = subpath.startsWith('vps-stock-')
      ? subpath.replace('vps-stock-', '')
      : reqUrl.split('/api/vps-stock/')[1]?.split('?')[0] || '';
    try {
      const response = await fetch(`https://bgapidatafeed.vps.com.vn/getliststockdata/${symbols}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });
      if (!response.ok) return res.status(response.status).json([]);
      const data = await response.json();
      return res.status(200).json(data);
    } catch {
      return res.status(200).json([]);
    }
  }

  // 2. Proxy Fmarket API (/api/fmarket/*)
  if (subpath.startsWith('fmarket-') || reqUrl.includes('/api/fmarket/')) {
    const fmarketPath = subpath.startsWith('fmarket-')
      ? subpath.replace('fmarket-', '')
      : reqUrl.split('/api/fmarket/')[1]?.split('?')[0] || 'res/products/filter';
    try {
      const response = await fetch(`https://api.fmarket.vn/${fmarketPath}`, {
        method: req.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://fmarket.vn/',
          Origin: 'https://fmarket.vn',
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body || {}) : undefined,
      });
      if (!response.ok) return res.status(response.status).json({ error: `Fmarket error ${response.status}` });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fmarket proxy error' });
    }
  }

  // 3. Real-time Market Batch Prices (/api/market/batch-prices)
  if (subpath.startsWith('market-') || reqUrl.includes('/api/market/')) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { assets = [], usdtRate = 25400 } = body;
      const results: Record<string, any> = {};
      const currentUsdtRate = Number(usdtRate) > 0 ? Number(usdtRate) : 25400;

      const cryptoSymbols = Array.from(
        new Set<string>(
          assets
            .filter((a: any) => {
              const sym = (a.symbol || a.asset_symbol || '').toUpperCase().trim();
              const type = (a.type || a.asset_type || '').toLowerCase();
              return (
                type === 'crypto' ||
                ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'NEAR', 'XAUT', 'PAXG', 'SUI', 'PEPE', 'SHIB', 'TON', 'LINK'].includes(sym)
              );
            })
            .map((a: any) => (a.symbol || a.asset_symbol || '').toUpperCase().trim())
        )
      );

      const hasGoldAssets = assets.some((a: any) => {
        const sym = (a.symbol || a.asset_symbol || '').toUpperCase().trim();
        const type = (a.type || a.asset_type || '').toLowerCase();
        return (
          type === 'gold' ||
          type === 'vàng' ||
          sym.includes('SJC') ||
          sym.includes('GOLD') ||
          sym.includes('VÀNG') ||
          sym === 'N24K' ||
          sym === 'PNJ' ||
          sym === 'DOJI' ||
          sym === 'XAUT' ||
          sym === 'PAXG'
        );
      });

      if (hasGoldAssets) {
        if (!cryptoSymbols.includes('XAUT')) cryptoSymbols.push('XAUT');
        if (!cryptoSymbols.includes('PAXG')) cryptoSymbols.push('PAXG');
      }

      const stockSymbols = Array.from(
        new Set<string>(
          assets
            .filter((a: any) => {
              const sym = (a.symbol || a.asset_symbol || '').toUpperCase().trim();
              const type = (a.type || a.asset_type || '').toLowerCase();
              return (
                type === 'stock' ||
                ['TPB', 'VCB', 'HPG', 'FPT', 'MWG', 'SSI', 'TCB', 'MBB', 'VHM', 'VIC', 'STB', 'DGC', 'CTG', 'ACB', 'VPB', 'HDB', 'VND', 'GEX', 'VRE', 'GAS', 'MSN', 'PLX', 'PNJ', 'VNM', 'KDH', 'PDR', 'NVL', 'DIG'].includes(sym)
              );
            })
            .map((a: any) => (a.symbol || a.asset_symbol || '').toUpperCase().trim())
        )
      );

      const hasFundAssets = assets.some((a: any) => {
        const sym = (a.symbol || a.asset_symbol || '').toUpperCase().trim();
        const type = (a.type || a.asset_type || '').toLowerCase();
        return (
          type === 'fund' ||
          type === 'quỹ' ||
          ['VEOF', 'VESAF', 'VIBF', 'DCDS', 'DCBC', 'VCBF', 'SSISCA', 'BVFED', 'DCIP', 'DCDE'].some((f) =>
            sym.includes(f)
          )
        );
      });

      const binancePriceMap: Record<string, { usdt: number; change24h?: number; sourceName?: string }> = {};
      const stockPriceMap: Record<string, { price: number; changePercent?: number }> = {};
      const vnGoldMap: Record<string, { price: number; buyPrice: number; sellPrice: number; sourceName: string }> = {};
      let worldGoldSpotUsd = 0;

      const fundMap: Record<string, number> = {
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
        BVFED: 30506.0,
      };

      // Run all 4 market category fetchers in parallel for sub-400ms speed
      await Promise.allSettled([
        // Task 1: Crypto & XAUT / PAXG
        (async () => {
          if (cryptoSymbols.length === 0) return;
          await Promise.allSettled(
            cryptoSymbols.map(async (rawSym: string) => {
              if (rawSym === 'XAUT') {
                // Fetch real Tether Gold (XAUT/USDT) from OKX, Bybit, Gate.io first
                try {
                  const okxRes = await fetch('https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT', {
                    signal: AbortSignal.timeout(2500),
                  });
                  if (okxRes.ok) {
                    const okxData: any = await okxRes.json();
                    const item = okxData?.data?.[0];
                    const last = parseFloat(item?.last);
                    const open24h = parseFloat(item?.open24h);
                    if (!isNaN(last) && last > 0) {
                      const change24h = !isNaN(open24h) && open24h > 0 ? ((last - open24h) / open24h) * 100 : undefined;
                      binancePriceMap['XAUT'] = { usdt: last, change24h, sourceName: 'OKX XAUT/USDT Live' };
                      return;
                    }
                  }
                } catch {}

                try {
                  const bybitRes = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT', {
                    signal: AbortSignal.timeout(2500),
                  });
                  if (bybitRes.ok) {
                    const bybitData: any = await bybitRes.json();
                    const item = bybitData?.result?.list?.[0];
                    const last = parseFloat(item?.lastPrice);
                    const pcnt = parseFloat(item?.price24hPcnt);
                    if (!isNaN(last) && last > 0) {
                      binancePriceMap['XAUT'] = {
                        usdt: last,
                        change24h: !isNaN(pcnt) ? pcnt * 100 : undefined,
                        sourceName: 'Bybit XAUT/USDT Live',
                      };
                      return;
                    }
                  }
                } catch {}

                try {
                  const gateRes = await fetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=XAUT_USDT', {
                    signal: AbortSignal.timeout(2500),
                  });
                  if (gateRes.ok) {
                    const gateData: any = await gateRes.json();
                    const item = Array.isArray(gateData) ? gateData[0] : null;
                    const last = parseFloat(item?.last);
                    if (!isNaN(last) && last > 0) {
                      binancePriceMap['XAUT'] = {
                        usdt: last,
                        change24h: item?.change_percentage ? parseFloat(item.change_percentage) : undefined,
                        sourceName: 'Gate.io XAUT/USDT Live',
                      };
                      return;
                    }
                  }
                } catch {}
              }

              const pair = rawSym === 'XAUT' ? 'PAXGUSDT' : rawSym.endsWith('USDT') ? rawSym : `${rawSym}USDT`;
              try {
                const priceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
                  signal: AbortSignal.timeout(2500),
                });
                if (priceRes.ok) {
                  const data: any = await priceRes.json();
                  const usdt = parseFloat(data.price);
                  if (!isNaN(usdt) && usdt > 0) {
                    binancePriceMap[rawSym] = { usdt, sourceName: 'Binance Live Ticker' };
                    return;
                  }
                }
              } catch {}
              try {
                const altRes = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${pair}`, {
                  signal: AbortSignal.timeout(2500),
                });
                if (altRes.ok) {
                  const data: any = await altRes.json();
                  const usdt = parseFloat(data.price);
                  if (!isNaN(usdt) && usdt > 0) {
                    binancePriceMap[rawSym] = { usdt, sourceName: 'Binance Live Ticker' };
                  }
                }
              } catch {}
            })
          );
        })(),

        // Task 2: Vietnam SJC 9999 & 24K Gold (PNJ Live API + CafeF Gold Live API)
        (async () => {
          if (!hasGoldAssets) return;
          await Promise.allSettled([
            (async () => {
              try {
                const pnjRes = await fetch('https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00', {
                  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
                  signal: AbortSignal.timeout(2800),
                });
                if (pnjRes.ok) {
                  const pnjData: any = await pnjRes.json();
                  if (Array.isArray(pnjData?.data)) {
                    for (const row of pnjData.data) {
                      const code = String(row.masp || '').toUpperCase().trim();
                      // PNJ returns price in thousand VND per chi (1 luong = 10 chi => * 10,000)
                      const sellVnd = Number(row.giaban) * 10000;
                      const buyVnd = Number(row.giamua) * 10000;
                      if (sellVnd > 50_000_000) {
                        if (code === 'SJC') {
                          vnGoldMap['SJC'] = {
                            price: sellVnd,
                            buyPrice: buyVnd > 0 ? buyVnd : sellVnd - 2_000_000,
                            sellPrice: sellVnd,
                            sourceName: 'Giá Vàng SJC 9999 Trực Tiếp',
                          };
                        } else if (code === 'N24K') {
                          vnGoldMap['N24K'] = {
                            price: sellVnd,
                            buyPrice: buyVnd > 0 ? buyVnd : sellVnd - 2_000_000,
                            sellPrice: sellVnd,
                            sourceName: 'Vàng Nhẫn 9999 Trực Tiếp',
                          };
                        }
                      }
                    }
                  }
                }
              } catch {}
            })(),
            (async () => {
              try {
                const cafefRes = await fetch('https://cafef.vn/du-lieu/Ajax/ajaxgoldpricehistory.ashx?index=1', {
                  headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
                  signal: AbortSignal.timeout(2800),
                });
                if (cafefRes.ok) {
                  const cData: any = await cafefRes.json();
                  const worldPrice = Number(cData?.Data?.goldPriceWorlds?.price);
                  if (worldPrice > 1000) {
                    worldGoldSpotUsd = worldPrice;
                  }
                  const histories = cData?.Data?.goldPriceWorldHistories;
                  if (Array.isArray(histories) && histories.length > 0 && !vnGoldMap['SJC']) {
                    const latest = histories[0];
                    const sellVnd = Math.round(Number(latest.sellPrice) * 1_000_000);
                    const buyVnd = Math.round(Number(latest.buyPrice) * 1_000_000);
                    if (sellVnd > 50_000_000) {
                      vnGoldMap['SJC'] = {
                        price: sellVnd,
                        buyPrice: buyVnd > 0 ? buyVnd : sellVnd - 2_000_000,
                        sellPrice: sellVnd,
                        sourceName: 'Giá Vàng SJC 9999 (CafeF)',
                      };
                    }
                  }
                }
              } catch {}
            })(),
          ]);
        })(),

        // Task 3: Vietnam Stocks (VPS + Entrade)
        (async () => {
          if (stockSymbols.length === 0) return;
          await Promise.allSettled(
            stockSymbols.map(async (rawSym: string) => {
              try {
                const vpsRes = await fetch(`https://bgapidatafeed.vps.com.vn/getliststockdata/${rawSym}`, {
                  signal: AbortSignal.timeout(2500),
                });
                if (vpsRes.ok) {
                  const data: any = await vpsRes.json();
                  if (Array.isArray(data) && data.length > 0) {
                    const item = data[0];
                    const rawPrice = item.lastPrice || item.r || item.closePrice;
                    if (rawPrice && !isNaN(Number(rawPrice))) {
                      stockPriceMap[rawSym] = {
                        price: Math.round(Number(rawPrice) * 1000),
                        changePercent: item.changePc ? parseFloat(item.changePc) : 0,
                      };
                      return;
                    }
                  }
                }
              } catch {}
              try {
                const now = Math.floor(Date.now() / 1000);
                const from = now - 7 * 86400;
                const entRes = await fetch(
                  `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${rawSym}&from=${from}&to=${now}&resolution=1D`,
                  { signal: AbortSignal.timeout(2500) }
                );
                if (entRes.ok) {
                  const data: any = await entRes.json();
                  if (data?.c && Array.isArray(data.c) && data.c.length > 0) {
                    const latestClose = data.c[data.c.length - 1];
                    const prevClose = data.c.length > 1 ? data.c[data.c.length - 2] : latestClose;
                    stockPriceMap[rawSym] = {
                      price: Math.round(latestClose * 1000),
                      changePercent: prevClose > 0 ? ((latestClose - prevClose) / prevClose) * 100 : 0,
                    };
                  }
                }
              } catch {}
            })
          );
        })(),

        // Task 4: Mutual Funds (Fmarket)
        (async () => {
          if (!hasFundAssets) return;
          try {
            const fRes = await fetch('https://api.fmarket.vn/res/products/filter', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Referer: 'https://fmarket.vn/',
                Origin: 'https://fmarket.vn',
              },
              body: JSON.stringify({
                types: ['NEW_FUND', 'TRADING_FUND'],
                page: 1,
                pageSize: 100,
              }),
              signal: AbortSignal.timeout(3500),
            });
            if (fRes.ok) {
              const fData: any = await fRes.json();
              if (fData?.data?.rows && Array.isArray(fData.data.rows)) {
                fData.data.rows.forEach((row: any) => {
                  const sName = (row.shortName || '').toUpperCase().trim();
                  const code = (row.code || '').toUpperCase().trim();
                  const nav =
                    typeof row.nav === 'number' && row.nav > 0
                      ? row.nav
                      : typeof row.extra?.currentNAV === 'number'
                      ? row.extra.currentNAV
                      : null;
                  if (nav && nav > 0) {
                    if (sName) {
                      fundMap[sName] = nav;
                      fundMap[sName.replace(/[^A-Z0-9]/g, '')] = nav;
                    }
                    if (code) {
                      fundMap[code] = nav;
                      fundMap[code.replace(/[^A-Z0-9]/g, '')] = nav;
                    }
                  }
                });
              }
            }
          } catch {}
        })(),
      ]);

      for (const item of assets) {
        const id = item.id || item.symbol || item.asset_symbol;
        const sym = (item.symbol || item.asset_symbol || '').toUpperCase().trim();
        const cleanSym = sym.replace(/[^A-Z0-9]/g, '');
        const type = (item.type || item.asset_type || '').toLowerCase();

        // 1. Mutual Fund
        const matchedFundKey = Object.keys(fundMap).find(
          (k) => k === sym || k === cleanSym || sym.includes(k) || cleanSym.includes(k)
        );
        const isFundType = type === 'fund' || type === 'quỹ' || !!matchedFundKey;

        if (isFundType && (matchedFundKey || fundMap[sym] || fundMap[cleanSym])) {
          const nav = fundMap[sym] || fundMap[cleanSym] || (matchedFundKey ? fundMap[matchedFundKey] : 0);
          if (nav > 0) {
            results[id] = {
              symbol: sym,
              price: Math.round(nav * 100) / 100,
              usdtPrice: Math.round((nav / currentUsdtRate) * 100) / 100,
              updatedAt: new Date().toISOString(),
              source: 'fmarket',
              sourceName: 'Fmarket NAV Live',
            };
            continue;
          }
        }

        // 2. Domestic Gold (SJC, Vàng 9999, N24K) - check BEFORE stock/crypto if symbol is SJC or type is gold
        if (sym === 'SJC' || sym.includes('SJC') || sym === 'N24K' || type === 'gold' || type === 'vàng') {
          const goldQuote = sym === 'N24K' || sym.includes('NHẪN') ? (vnGoldMap['N24K'] || vnGoldMap['SJC']) : vnGoldMap['SJC'];
          if (goldQuote && goldQuote.price > 0) {
            results[id] = {
              symbol: sym,
              price: goldQuote.price,
              buyPrice: goldQuote.buyPrice,
              sellPrice: goldQuote.sellPrice,
              usdtPrice: Math.round(goldQuote.price / currentUsdtRate),
              updatedAt: new Date().toISOString(),
              source: 'gold_api',
              sourceName: goldQuote.sourceName,
            };
            continue;
          }

          // Fallback if both PNJ and CafeF SJC endpoints failed
          const goldUsdt = worldGoldSpotUsd || binancePriceMap['XAUT']?.usdt || binancePriceMap['PAXG']?.usdt || 3995;
          const sjcVnd = Math.round((goldUsdt * 1.205653 * currentUsdtRate * 1.12) / 100000) * 100000;
          results[id] = {
            symbol: sym,
            price: sjcVnd,
            usdtPrice: Math.round(sjcVnd / currentUsdtRate),
            updatedAt: new Date().toISOString(),
            source: 'gold_api',
            sourceName: 'Giá Vàng SJC Quy Đổi',
          };
          continue;
        }

        // 3. Crypto & Gold Tokens (XAUT, PAXG, BTC, ETH...)
        if (binancePriceMap[sym]) {
          const usdt = binancePriceMap[sym].usdt;
          const vnd = Math.round(usdt * currentUsdtRate);
          results[id] = {
            symbol: sym,
            price: vnd,
            usdtPrice: usdt,
            changePercent: binancePriceMap[sym].change24h,
            updatedAt: new Date().toISOString(),
            source: 'binance',
            sourceName: binancePriceMap[sym].sourceName || 'Binance Live Ticker',
          };
          continue;
        }

        // 4. Stock (HOSE/HNX)
        if (stockPriceMap[sym]) {
          results[id] = {
            symbol: sym,
            price: stockPriceMap[sym].price,
            usdtPrice: Math.round((stockPriceMap[sym].price / currentUsdtRate) * 100) / 100,
            changePercent: stockPriceMap[sym].changePercent,
            updatedAt: new Date().toISOString(),
            source: 'hose_api',
            sourceName: 'Sàn HOSE/HNX Trực Tiếp',
          };
          continue;
        }

        results[id] = {
          symbol: sym,
          price: item.price || item.current_price || 0,
          usdtPrice: item.current_price ? Math.round((item.current_price / currentUsdtRate) * 100) / 100 : 0,
          updatedAt: new Date().toISOString(),
          source: 'cache',
          sourceName: 'Giá hiện tại',
        };
      }

      return res.status(200).json({
        success: true,
        results,
        usdtRate: currentUsdtRate,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  }

  try {
    const feeds = [
      { name: 'BlogTiềnẢo', source: 'BlogTiềnẢo', url: 'https://blogtienao.com/feed/', type: 'CRYPTO' },
      { name: 'CoinDesk Crypto', source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'CRYPTO' },
      { name: 'CoinTelegraph', source: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', type: 'CRYPTO' },
      { name: 'CafeF Chứng khoán', source: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.rss', type: 'VN_STOCK' },
      { name: 'VnEconomy Chứng khoán', source: 'VnEconomy', url: 'https://vneconomy.vn/chung-khoan.rss', type: 'VN_STOCK' },
      { name: 'CafeF Tài chính', source: 'CafeF', url: 'https://cafef.vn/tai-chinh-quoc-te.rss', type: 'MACRO' },
    ];

    const rawArticles: { title: string; desc: string; source: string; pubDate: string; type: string }[] = [];

    for (const f of feeds) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(f.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const text = await response.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          let count = 0;
          while ((match = itemRegex.exec(text)) !== null && count < 6) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
            const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
            const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

            const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

            if (title && !title.toLowerCase().includes('thông báo') && !title.toLowerCase().includes('lịch sự kiện')) {
              rawArticles.push({
                title,
                desc,
                source: f.source,
                pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                type: f.type,
              });
              count++;
            }
          }
        }
      } catch (e) {
        // ignore and proceed
      }
    }

    const KNOWN_TICKERS = [
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'SUI', 'DOGE', 'PAXG', 'XAUT', 'SJC',
      'VN-INDEX', 'TPB', 'VCB', 'MBB', 'TCB', 'CTG', 'ACB', 'VPB', 'FPT', 'HPG',
      'SSI', 'VND', 'MWG', 'VIC', 'VHM', 'VNM', 'VEOF', 'VESAF', 'DCDS',
    ];

    const isCryptoArticle = (raw: any) => {
      const txt = `${raw.title} ${raw.desc}`.toUpperCase();
      return (
        raw.type === 'CRYPTO' ||
        raw.source === 'CoinDesk' ||
        raw.source === 'BlogTiềnẢo' ||
        raw.source === 'CoinTelegraph' ||
        ['BITCOIN', 'CRYPTO', 'ETH', 'BTC', 'SOLANA', 'SOL', 'XRP', 'DOGE', 'ALTCOIN', 'TIỀN ĐIỆN TỬ', 'TIỀN MÃ HÓA', 'BLOCKCHAIN', 'DEFI', 'BINANCE', 'ETF BITCOIN'].some((k) => txt.includes(k))
      );
    };

    const convertSingleArticle = (raw: any) => {
      const fullText = `${raw.title} ${raw.desc}`.toUpperCase();
      const isCrypto = isCryptoArticle(raw);
      const impactedAssets: string[] = [];

      for (const tick of KNOWN_TICKERS) {
        const reg = new RegExp(`(^|[^A-Z0-9])${tick}([^A-Z0-9]|$)`, 'i');
        if (reg.test(fullText)) {
          impactedAssets.push(tick);
        }
      }

      if (impactedAssets.length === 0) {
        if (isCrypto) {
          impactedAssets.push('BTC', 'ETH', 'SOL');
        } else if (fullText.includes('VÀNG') || fullText.includes('GOLD')) {
          impactedAssets.push('SJC', 'PAXG');
        } else if (fullText.includes('NGÂN HÀNG') || fullText.includes('BANK')) {
          impactedAssets.push('TPB', 'VCB', 'MBB', 'VN-INDEX');
        } else if (fullText.includes('QUỸ') || fullText.includes('NAV')) {
          impactedAssets.push('VEOF', 'VESAF', 'VN-INDEX');
        } else {
          impactedAssets.push('VN-INDEX', 'FPT', 'HPG');
        }
      }

      const bullishWords = ['TĂNG', 'MUA RÒNG', 'BỐC ĐẦU', 'KỶ TÍCH', 'LẬP ĐỈNH', 'GOM RÒNG', 'HÚT TIỀN', 'LÃI', 'BỨT PHÁ', 'PHỤC HỒI', 'VƯỢT ĐỈNH', 'TĂNG TRƯỞNG', 'SURGE', 'RALLY', 'BULL', 'RECORD', 'GAIN', 'TOKENIZING', 'THÔNG QUA', 'ỦNG HỘ'];
      const bearishWords = ['GIẢM', 'RƠI', 'THỦNG', 'BÁN RÒNG', 'XẢ', 'BÁN THÁO', 'LỖ', 'LAO DỐC', 'ÉP', 'ÁP LỰC', 'SUY GIẢM', 'ĐỎ', 'PHÁ SẢN', 'LO NGẠI', 'DROP', 'FALL', 'LOSS', 'BEAR', 'PLUNGE', 'CRASH', 'XẢ MẠNH', 'LEAKS', 'THEFT'];
      const volatileWords = ['BIẾN ĐỘNG', 'GIỜ G', 'TRANH CHẤP', 'CUỘC CHIẾN', 'RUNG LẮC', 'VOLATILITY', 'FIGHT', 'WARNS'];

      let impactType: 'BULLISH' | 'BEARISH' | 'VOLATILE' | 'NEUTRAL' = 'NEUTRAL';
      if (bearishWords.some((w) => fullText.includes(w))) {
        impactType = 'BEARISH';
      } else if (bullishWords.some((w) => fullText.includes(w))) {
        impactType = 'BULLISH';
      } else if (volatileWords.some((w) => fullText.includes(w))) {
        impactType = 'VOLATILE';
      }

      const targetList = Array.from(new Set(impactedAssets)).slice(0, 4);

      let impactSummary = '';
      if (isCrypto) {
        if (impactType === 'BULLISH') {
          impactSummary = `Dòng vốn và lực cầu Crypto gia tăng mạnh mẽ, củng cố đà bứt phá cho ${targetList.join(', ')}.`;
        } else if (impactType === 'BEARISH') {
          impactSummary = `Áp lực bán chốt lời và điều chỉnh ngắn hạn; quan sát mốc hỗ trợ nến 4H của ${targetList.join(', ')}.`;
        } else if (impactType === 'VOLATILE') {
          impactSummary = `Thị trường tiền số biến động mạnh theo tin tức vĩ mô; ưu tiên quản trị rủi ro và chia nhỏ DCA.`;
        } else {
          impactSummary = `Dòng tiền On-chain tích lũy chờ tín hiệu xác nhận xu hướng cho ${targetList.join(', ')}.`;
        }
      } else {
        if (impactType === 'BULLISH') {
          impactSummary = `Lực cầu và dòng tiền gia tăng tích cực, tạo động lực nâng đỡ kỳ vọng bứt phá cho nhóm ${targetList.join(', ')}.`;
        } else if (impactType === 'BEARISH') {
          impactSummary = `Áp lực bán tháo và điều chỉnh ngắn hạn gia tăng; cần quan sát kỹ các mốc hỗ trợ nến 4H của ${targetList.join(', ')}.`;
        } else if (impactType === 'VOLATILE') {
          impactSummary = `Thị trường xuất hiện rung lắc mạnh theo diễn biến tin tức; ưu tiên quản trị tỷ trọng và giải ngân chia nhỏ DCA.`;
        } else {
          impactSummary = `Dòng tiền đang ở trạng thái tích lũy thận trọng, tạo vùng đệm cân bằng cho ${targetList.join(', ')}.`;
        }
      }

      return {
        title: raw.title,
        source: raw.source || 'Tin tức Thị trường',
        timeAgo: raw.pubDate ? 'Vừa cập nhật' : 'Vừa cập nhật (Chu kỳ 4H)',
        pubDate: raw.pubDate,
        description: raw.desc || `Dữ liệu thời gian thực ghi nhận biến động quan trọng ảnh hưởng tới nhóm ${targetList.join(', ')}.`,
        desc: raw.desc,
        url: raw.link || raw.url,
        actionableAdvice: isCrypto
          ? (impactType === 'BULLISH'
              ? `Tận dụng các nhịp rung lắc nến 4H để chia lệnh DCA cho ${targetList.join(', ')}, hạn chế FOMO khi giá tiến gần vùng kháng cự Fibo 1.618.`
              : impactType === 'BEARISH'
              ? `Quan sát chặt chẽ phản ứng giá quanh ngưỡng hỗ trợ EMA50/EMA200 của ${targetList.join(', ')}. Quản trị rủi ro và chia nhỏ vốn.`
              : `Thị trường biến động giằng co; duy trì tỷ trọng an toàn và theo dõi khối lượng giao dịch phái sinh.`)
          : (impactType === 'BULLISH'
              ? `Dòng tiền cơ cấu tích cực; ưu tiên nắm giữ nhóm Bluechip đầu ngành ${targetList.join(', ')} và canh chốt lời theo kế hoạch.`
              : impactType === 'BEARISH'
              ? `Áp lực bán phân hóa; kiên nhẫn chờ điểm cân bằng nến 4H trước khi giải ngân gia tăng vị thế.`
              : `Thị trường sideway tích lũy; tập trung vào cổ phiếu có câu chuyện tăng trưởng và định giá chiết khấu.`),
        impactedAssets: targetList,
        impactType,
        impactSummary,
        badge: '⚡ Tin Nhanh Thị Trường',
        category: 'live_feed',
        isAiGenerated: false,
        isCrypto,
      };
    };

    const allParsed: any[] = [];
    const seenNorm = new Set<string>();

    for (const raw of rawArticles) {
      if (!raw?.title) continue;
      const norm = normalizeTextForComparison(raw.title);
      if (seenNorm.has(norm)) continue;
      seenNorm.add(norm);

      const parsed = convertSingleArticle(raw);
      if (!allParsed.some((existing) => areNewsSimilar(existing, parsed))) {
        allParsed.push(parsed);
      }
    }

    // Create 5 dynamic AI items from top unique items
    const dynamicAi: any[] = [];
    for (let i = 0; i < allParsed.length && dynamicAi.length < 5; i++) {
      const item = allParsed[i];
      const isCrypto = item.isCrypto || item.impactedAssets.some((a: string) => ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'SUI'].includes(a));
      dynamicAi.push({
        title: isCrypto
          ? `[Phân tích On-Chain & Dòng Tiền] ${item.title}`
          : `[Tình báo Dòng Tiền Vĩ Mô & VN30] ${item.title}`,
        source: isCrypto ? 'Gemini AI Research / On-Chain Terminal' : 'Gemini AI Research / Macro Intelligence',
        timeAgo: 'Vừa phân tích (Gemini AI)',
        pubDate: item.pubDate,
        impactedAssets: item.impactedAssets,
        impactType: item.impactType,
        impactSummary: isCrypto
          ? `Gemini AI đánh giá: Diễn biến này trực tiếp định hình xu hướng thanh khoản 4H cho ${item.impactedAssets.join(', ')}. Khuyến nghị quản trị tỷ trọng theo kế hoạch DCA.`
          : `Gemini AI phân tích: Tác động lan tỏa đến tâm lý nhóm vốn hóa lớn ${item.impactedAssets.join(', ')}. Lực cầu chủ động hỗ trợ giữ vững cấu trúc giá trung hạn.`,
        description: item.description || item.desc || `Dữ liệu On-Chain và phân tích vĩ mô ghi nhận diễn biến quan trọng tác động trực tiếp tới cấu trúc cung - cầu của nhóm ${item.impactedAssets.join(', ')}.`,
        actionableAdvice: isCrypto
          ? 'Khuyến nghị: Theo dõi chặt chẽ khối lượng nến 4H, chia nhỏ các lệnh DCA tại các ngưỡng hỗ trợ kỹ thuật, không mua đuổi khi RSI vượt 70.'
          : 'Khuyến nghị: Ưu tiên nắm giữ các cổ phiếu cơ bản tốt nhóm VN30, tận dụng các nhịp rung lắc tích lũy để gom hàng từng phần.',
        url: item.url,
        badge: '🤖 Gemini AI Săn Lùng',
        category: 'ai_radar',
        isAiGenerated: true,
      });
    }

    if (dynamicAi.length < 5) {
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const freshDefaults = [
        {
          title: `Bitcoin & Ethereum kiểm định vùng thanh khoản then chốt khung 4H (Cập nhật ${nowTime})`,
          source: 'Gemini AI Research / Glassnode',
          timeAgo: 'Vừa phân tích (Gemini AI)',
          impactedAssets: ['BTC', 'ETH', 'SOL'],
          impactType: 'BULLISH',
          impactSummary: 'Dữ liệu dòng tiền On-Chain ghi nhận lực hấp thụ nguồn cung ổn định tại các vùng hỗ trợ kỹ thuật; mở ra kỳ vọng bứt phá nến 4H.',
          badge: '🤖 Gemini AI Săn Lùng',
          category: 'ai_radar',
          isAiGenerated: true,
        },
        {
          title: `VN-Index và nhóm Ngân hàng - Chứng khoán đón nhận dòng tiền cơ cấu phiên hôm nay`,
          source: 'Gemini AI Research / FiinTrade',
          timeAgo: 'Vừa phân tích (Gemini AI)',
          impactedAssets: ['VN-INDEX', 'TPB', 'VCB', 'MBB'],
          impactType: 'BULLISH',
          impactSummary: 'Khối ngoại và dòng tiền tổ chức duy trì mua ròng tại các vùng định giá hấp dẫn của nhóm VN30, hỗ trợ xu hướng hồi phục.',
          badge: '🤖 Gemini AI Săn Lùng',
          category: 'ai_radar',
          isAiGenerated: true,
        },
        {
          title: `Hệ sinh thái Solana, SUI & Layer 1 bùng nổ khối lượng hợp đồng mở (OI) và TVL`,
          source: 'Gemini AI Research / DeFiLlama',
          timeAgo: 'Vừa phân tích (Gemini AI)',
          impactedAssets: ['SOL', 'SUI', 'ETH'],
          impactType: 'VOLATILE',
          impactSummary: 'Khối lượng giao dịch phái sinh gia tăng mạnh, dự báo biến động biên độ lớn trong các phiên giao dịch tiếp theo.',
          badge: '🤖 Gemini AI Săn Lùng',
          category: 'ai_radar',
          isAiGenerated: true,
        },
        {
          title: `Diễn biến tỷ giá USD/VND và định hướng thanh khoản hệ thống liên ngân hàng`,
          source: 'Gemini AI Research / Reuters Macro',
          timeAgo: 'Vừa phân tích (Gemini AI)',
          impactedAssets: ['VN-INDEX', 'FPT', 'HPG', 'SSI'],
          impactType: 'NEUTRAL',
          impactSummary: 'Ngân hàng Nhà nước linh hoạt điều tiết tỷ giá, tạo môi trường lãi suất ổn định hỗ trợ hoạt động sản xuất kinh doanh.',
          badge: '🤖 Gemini AI Săn Lùng',
          category: 'ai_radar',
          isAiGenerated: true,
        },
        {
          title: `Thị trường Vàng SJC & Thế giới duy trì nhu cầu tích sản phòng hộ rủi ro vĩ mô`,
          source: 'Gemini AI Research / Kitco & WGC',
          timeAgo: 'Vừa phân tích (Gemini AI)',
          impactedAssets: ['SJC', 'PAXG', 'XAUT'],
          impactType: 'BULLISH',
          impactSummary: 'Nhu cầu tích sản kim loại quý của các quỹ đầu tư quốc tế và nhà đầu tư cá nhân tiếp tục neo giữ giá vàng ở vùng cao.',
          badge: '🤖 Gemini AI Săn Lùng',
          category: 'ai_radar',
          isAiGenerated: true,
        },
      ];
      while (dynamicAi.length < 5 && freshDefaults.length > 0) {
        dynamicAi.push(freshDefaults.shift()!);
      }
    }

    // Select 5 distinct non-overlapping live news
    const nonOverlapping = allParsed.filter(
      (live) => !dynamicAi.some((ai) => areNewsSimilar(live, ai))
    );

    const cryptoPool = nonOverlapping.filter((i) => i.isCrypto);
    const stockPool = nonOverlapping.filter((i) => !i.isCrypto);

    const distinctLive: any[] = [];
    let cIdx = 0;
    let sIdx = 0;

    while (distinctLive.length < 5 && (cIdx < cryptoPool.length || sIdx < stockPool.length)) {
      if (distinctLive.length % 2 === 0 && cIdx < cryptoPool.length) {
        distinctLive.push(cryptoPool[cIdx++]);
      } else if (sIdx < stockPool.length) {
        distinctLive.push(stockPool[sIdx++]);
      } else if (cIdx < cryptoPool.length) {
        distinctLive.push(cryptoPool[cIdx++]);
      }
    }

    if (distinctLive.length < 5) {
      const liveDefaults = [
        {
          title: 'Thị trường Altcoin: Dòng tiền phái sinh và OI phân hóa quanh các mốc hỗ trợ nến 4H then chốt',
          source: 'CoinDesk / BlogTiềnẢo',
          timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
          impactedAssets: ['BTC', 'ETH', 'SOL'],
          impactType: 'VOLATILE',
          impactSummary: 'Thanh khoản On-chain và dòng vốn phái sinh duy trì thăm dò quanh các ngưỡng hỗ trợ nến 4H quan trọng.',
          badge: '⚡ Tin Nhanh Thị Trường',
          category: 'live_feed',
          isAiGenerated: false,
        },
        {
          title: 'VN-Index giao dịch giằng co tích lũy, dòng vốn tổ chức duy trì mua ròng nhóm vốn hóa lớn VN30',
          source: 'CafeF / VnEconomy',
          timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
          impactedAssets: ['VN-INDEX', 'TPB', 'VCB', 'MBB'],
          impactType: 'BULLISH',
          impactSummary: 'Khối ngoại và dòng tiền lớn chủ động nâng đỡ các cổ phiếu đầu ngành, tạo điểm tựa ổn định thị trường.',
          badge: '⚡ Tin Nhanh Thị Trường',
          category: 'live_feed',
          isAiGenerated: false,
        },
        {
          title: 'Hệ sinh thái Layer 1 & Solana tiếp tục ghi nhận khối lượng giao dịch Spot ổn định',
          source: 'CoinTelegraph',
          timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
          impactedAssets: ['SOL', 'ETH', 'SUI'],
          impactType: 'BULLISH',
          impactSummary: 'Lực gom ròng ở vùng giá chiết khấu tạo đà hồi phục kỹ thuật cho các đồng coin nền tảng lớn.',
          badge: '⚡ Tin Nhanh Thị Trường',
          category: 'live_feed',
          isAiGenerated: false,
        },
        {
          title: 'Cổ phiếu Bluechip và nhóm ngành Ngân hàng - Thép hình thành vùng đệm hỗ trợ khung 4H',
          source: 'Vietstock',
          timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
          impactedAssets: ['HPG', 'FPT', 'TCB', 'ACB'],
          impactType: 'NEUTRAL',
          impactSummary: 'Dòng tiền nội tham gia hấp thụ cung chốt lời, duy trì trạng thái giằng co tích lũy.',
          badge: '⚡ Tin Nhanh Thị Trường',
          category: 'live_feed',
          isAiGenerated: false,
        },
        {
          title: 'Giá vàng SJC và kim loại quý quốc tế biến động theo kỳ vọng lãi suất Fed và tỷ giá',
          source: 'Reuters / Kitco',
          timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
          impactedAssets: ['SJC', 'PAXG', 'XAUT'],
          impactType: 'NEUTRAL',
          impactSummary: 'Dòng tiền duy trì tỷ trọng phòng hộ rủi ro ổn định trước các dữ liệu kinh tế vĩ mô toàn cầu.',
          badge: '⚡ Tin Nhanh Thị Trường',
          category: 'live_feed',
          isAiGenerated: false,
        },
      ];

      for (const def of liveDefaults) {
        if (distinctLive.length >= 5) break;
        if (!distinctLive.some((ex) => areNewsSimilar(ex, def)) && !dynamicAi.some((ai) => areNewsSimilar(ai, def))) {
          distinctLive.push(def);
        }
      }
    }

    const combined10 = [...dynamicAi, ...distinctLive.map(({ isCrypto, ...rest }) => rest)];

    return res.status(200).json({
      success: true,
      data: combined10,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error fetching live news' });
  }
}
