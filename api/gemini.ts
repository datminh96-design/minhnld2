import { GoogleGenAI, Type } from '@google/genai';

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function getSubpath(req: any): string {
  if (req.query?.subpath) {
    return Array.isArray(req.query.subpath) ? req.query.subpath.join('/') : String(req.query.subpath);
  }
  const urlPath = (req.url || '').split('?')[0];
  const match = urlPath.match(/\/api\/gemini\/(.*)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlPath.replace(/^\/(api\/)?gemini\/?/, '');
}

let geminiClientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({
      apiKey,
    });
  }
  return geminiClientInstance;
}

// Live RSS helper for Vercel
async function fetchLiveMarketNewsFeed(): Promise<any[]> {
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
      const res = await fetch(f.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
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
    } catch {
      // Continue
    }
  }
  return rawArticles;
}

function parseLiveNewsToImpactObjects(rawArticles: any[]): any[] {
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
      ['BITCOIN', 'CRYPTO', 'ETH', 'BTC', 'SOLANA', 'SOL', 'XRP', 'DOGE', 'ALTCOIN', 'TIỀN ĐIỆN TỬ', 'TIỀN MÃ HÓA', 'BLOCKCHAIN', 'DEFI', 'BINANCE', 'ETF BITCOIN'].some(k => txt.includes(k))
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
      timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
      impactedAssets: targetList,
      impactType,
      impactSummary,
      isCrypto,
    };
  };

  const cryptoPool: any[] = [];
  const stockPool: any[] = [];
  const seenTitles = new Set<string>();

  for (const raw of rawArticles) {
    if (!raw.title || seenTitles.has(raw.title)) continue;
    seenTitles.add(raw.title);
    const item = convertSingleArticle(raw);
    if (item.isCrypto) {
      cryptoPool.push(item);
    } else {
      stockPool.push(item);
    }
  }

  const results: any[] = [];
  let cIdx = 0;
  let sIdx = 0;

  // Interleave to guarantee 2-3 Crypto and 2-3 VN Stock/Macro
  while (results.length < 5 && (cIdx < cryptoPool.length || sIdx < stockPool.length)) {
    if (results.length % 2 === 0 && cIdx < cryptoPool.length) {
      results.push(cryptoPool[cIdx++]);
    } else if (sIdx < stockPool.length) {
      results.push(stockPool[sIdx++]);
    } else if (cIdx < cryptoPool.length) {
      results.push(cryptoPool[cIdx++]);
    }
  }

  return results.map(({ isCrypto, ...rest }) => rest);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const body = parseBody(req);

  // 1. Specialized Handler: Market News
  if (subpath === 'market-news') {
    try {
      const rawArticles = await fetchLiveMarketNewsFeed();
      const liveParsedNews = parseLiveNewsToImpactObjects(rawArticles);

      const ai = getClient();
      if (!ai) {
        return res.status(200).json({
          success: true,
          data: liveParsedNews,
          model: 'Live RSS & Quant Engine',
          timestamp: new Date().toISOString(),
        });
      }

      const headlinesList = rawArticles
        .slice(0, 16)
        .map((a, i) => `${i + 1}. [${a.source} - ${a.type}] ${a.title} - ${a.desc.slice(0, 120)}`)
        .join('\n');

      const prompt = `
Bạn là chuyên gia phân tích vĩ mô và dòng tiền tài chính quốc tế (Crypto, Chứng khoán Việt Nam, Vàng).
Thời điểm phân tích: ${new Date().toISOString()}.

DƯỚI ĐÂY LÀ CÁC TIÊU ĐỀ TIN TỨC VỪA ĐƯỢC CẬP NHẬT TRỰC TIẾP TỪ CẢ THỊ TRƯỜNG CRYPTO VÀ CHỨNG KHOÁN VN HÔM NAY (BlogTiềnẢo, CoinDesk, CoinTelegraph, CafeF, VnEconomy):
${headlinesList || 'Thị trường biến động, dòng tiền phân hóa mạnh mẽ giữa nhóm Crypto (BTC, ETH, SOL) và Cổ phiếu VN.'}

YÊU CẦU BẮT BUỘC:
Hãy chọn lọc và phân tích ĐÚNG 5 TIN TỨC / SỰ KIỆN QUAN TRỌNG NHẤT từ danh sách trên (hoặc diễn biến thực tế hôm nay) có tác động mạnh mẽ nhất tới GIÁ và DÒNG TIỀN:

1. QUY TẮC PHÂN BỔ BẮT BUỘC (MANDATORY BALANCE):
- BẮT BUỘC có từ 2 ĐẾN 3 TIN TỨC THUỘC MẢNG CRYPTO / TIỀN MÃ HÓA (Bitcoin BTC, Ethereum ETH, Solana SOL, XRP, Altcoins, dòng tiền ETF Bitcoin/Ethereum, quy định pháp lý tiền số, Onchain/Binance).
- BẮT BUỘC có từ 2 ĐẾN 3 TIN TỨC THUỘC MẢNG CHỨNG KHOÁN VIỆT NAM, VÀNG & VĨ MÔ (VN-Index, Cổ phiếu Ngân hàng TPB/VCB/MBB, FPT/HPG, Vàng SJC/Thế giới, Tỷ giá).
- TUYỆT ĐỐI KHÔNG để toàn bộ 5 tin chỉ nói về chứng khoán VN mà thiếu mảng Crypto! Phải luôn kết hợp đan xen cả Crypto và Cổ phiếu Việt Nam.

2. Cấu trúc mỗi tin tức (JSON array gồm ĐÚNG 5 phần tử):
- "title": Tiêu đề súc tích, phản ánh đúng tin tức thật mới nhất hôm nay (viết bằng tiếng Việt dễ hiểu).
- "source": Nguồn tin uy tín (BlogTiềnẢo, CoinDesk, CoinTelegraph, CafeF, VnEconomy, Bloomberg, Reuters).
- "timeAgo": "Vừa cập nhật (Chu kỳ 4H)"
- "impactedAssets": Mảng 2-4 mã tài sản chịu tác động trực tiếp (ví dụ: ["BTC", "ETH", "SOL"] hoặc ["VN-INDEX", "TPB", "MBB"] hoặc ["SJC", "PAXG"]).
- "impactType": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE"
- "impactSummary": 1-2 câu súc tích bằng tiếng Việt phân tích rõ tác động cụ thể đến giá và hướng dịch chuyển dòng tiền (rút ra hay bơm vào).
`;

      const response = await ai.models.generateContent({
        model: body?.model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                timeAgo: { type: Type.STRING },
                impactedAssets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                impactType: {
                  type: Type.STRING,
                  enum: ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'],
                },
                impactSummary: { type: Type.STRING },
              },
              required: ['title', 'source', 'impactedAssets', 'impactType', 'impactSummary'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.status(200).json({
        success: true,
        data: Array.isArray(parsed) && parsed.length > 0 ? parsed : liveParsedNews,
        model: body?.model || 'gemini-2.5-flash',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Vercel market-news error fallback:', err);
      const rawArticles = await fetchLiveMarketNewsFeed();
      const liveParsedNews = parseLiveNewsToImpactObjects(rawArticles);
      return res.status(200).json({
        success: true,
        data: liveParsedNews,
        model: 'Live RSS Engine',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 2. Specialized Handler: Batch Probabilities
  if (subpath === 'batch-probabilities') {
    const { items = [], model } = body || {};
    const chosenModel = model || 'gemini-2.5-flash';

    const buildFallback = () => {
      const fallbackResult: Record<string, any> = {};
      for (const item of (Array.isArray(items) ? items : [])) {
        const rsi = Number(item.rsi) || 50;
        const macdTrend = String(item.macdTrend || '');
        const emaTrend = String(item.emaTrend || '');
        const sym = String(item.symbol || 'ASSET');

        let baseScore = 50;
        if (rsi >= 50) {
          if (rsi <= 65) baseScore += ((rsi - 50) / 15) * 12;
          else if (rsi <= 75) baseScore += 12 - ((rsi - 65) / 10) * 8;
          else baseScore -= ((rsi - 75) / 25) * 14;
        } else {
          if (rsi >= 35) baseScore -= ((50 - rsi) / 15) * 12;
          else baseScore += ((35 - rsi) / 35) * 9;
        }

        if (macdTrend.includes('Bullish')) baseScore += 8;
        else if (macdTrend.includes('Bearish')) baseScore -= 8;

        if (emaTrend.includes('Strong Uptrend')) baseScore += 12;
        else if (emaTrend.includes('Uptrend')) baseScore += 6;
        else if (emaTrend.includes('Strong Downtrend')) baseScore -= 12;
        else if (emaTrend.includes('Downtrend')) baseScore -= 6;

        if (item.assetType === 'crypto') {
          baseScore += ((sym.charCodeAt(0) + sym.charCodeAt(sym.length - 1)) % 7) - 3;
        } else if (item.assetType === 'fund') {
          baseScore = 50 + (baseScore - 50) * 0.65;
        }

        const upProb = Math.min(82, Math.max(18, Math.round(baseScore)));
        const downProb = 100 - upProb;

        let primaryTrend = 'ĐI NGANG (SWING)';
        if (upProb >= 68) primaryTrend = 'TĂNG MẠNH';
        else if (upProb >= 55) primaryTrend = 'TĂNG TÍCH LŨY';
        else if (upProb <= 35) primaryTrend = 'GIẢM MẠNH';
        else if (upProb <= 45) primaryTrend = 'ĐIỀU CHỈNH GIẢM';

        fallbackResult[sym] = {
          upProbability: upProb,
          downProbability: downProb,
          primaryTrend,
          confidence: Math.round(75 + Math.abs(upProb - 50) * 0.4),
          marketCatalyst: `Chỉ báo kỹ thuật RSI(14) đạt ${rsi.toFixed(1)}, hệ EMA phản ánh ${emaTrend || 'tích lũy'}, động lượng ${macdTrend || 'cân bằng'}.`,
        };
      }
      return fallbackResult;
    };

    const ai = getClient();
    if (!ai) {
      return res.status(200).json({
        success: true,
        probabilities: buildFallback(),
        model: 'Quant Engine (Serverless)',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const prompt = `
Bạn là chuyên gia phân tích kỹ thuật định lượng và chiến lược dòng tiền thị trường tài chính cấp cao (CFA/CMT).
Dưới đây là danh sách các tài sản đầu tư trong danh mục và thông số kỹ thuật nến 4H hiện tại:
${JSON.stringify(items, null, 2)}

YÊU CẦU:
Hãy phân tích trạng thái thị trường thực tế và dữ liệu kỹ thuật của từng tài sản để ước lượng XÁC SUẤT TĂNG/GIẢM (Up/Down Probability) trên khung nến 4H tiếp theo.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG xuất các con số rập khuôn giống nhau (như cùng 84%, 82%). Mỗi tài sản PHẢI có tỉ lệ xác suất RIÊNG BIỆT (từ 15% đến 85%), phản ánh đúng cấu trúc nến, RSI, động lượng MACD, xu hướng EMA và tính chất của lớp tài sản:
   - Crypto (BTC, ETH, SOL...): Độ co giãn dòng tiền và biến động cao.
   - Cổ phiếu VN (TPB, HPG, FPT...): Phụ thuộc dòng tiền khối ngoại, nhóm ngành, thanh khoản VN-Index.
   - Quỹ mở (VEOF, VESAF, DCDS...): Bám sát tăng trưởng NAV của danh mục cổ phiếu cơ sở, biến động có kiểm soát.
   - Vàng (SJC, PAXG): Xu hướng phòng hộ, phản ứng theo lãi suất và địa chính trị.
2. "upProbability": Số nguyên từ 15 đến 85 (ví dụ: BTC 68, TPB 61, VEOF 56, SJC 52, HPG 44).
3. "downProbability": Phải bằng 100 - upProbability.
4. "primaryTrend": "TĂNG MẠNH" | "TĂNG TÍCH LŨY" | "ĐI NGANG (SWING)" | "ĐIỀU CHỈNH GIẢM" | "GIẢM MẠNH".
5. "confidence": Điểm tin cậy từ 65 đến 95.
6. "marketCatalyst": 1 câu súc tích bằng tiếng Việt giải thích động lực dòng tiền, hỗ trợ/kháng cự kỹ thuật hoặc xúc tác thị trường cho mã đó.
`;

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              probabilities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    upProbability: { type: Type.INTEGER },
                    downProbability: { type: Type.INTEGER },
                    primaryTrend: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                    marketCatalyst: { type: Type.STRING },
                  },
                  required: ['symbol', 'upProbability', 'downProbability', 'primaryTrend', 'confidence', 'marketCatalyst'],
                },
              },
            },
            required: ['probabilities'],
          },
        },
      });

      const parsedData = JSON.parse(response.text || '{}');
      const probArray = parsedData?.probabilities || [];
      const resultMap: Record<string, any> = {};

      for (const p of probArray) {
        if (p.symbol) {
          const up = Math.min(85, Math.max(15, Number(p.upProbability) || 50));
          resultMap[p.symbol] = {
            upProbability: up,
            downProbability: 100 - up,
            primaryTrend: p.primaryTrend || 'TĂNG TÍCH LŨY',
            confidence: p.confidence || 80,
            marketCatalyst: p.marketCatalyst || '',
          };
        }
      }

      for (const item of (Array.isArray(items) ? items : [])) {
        if (!resultMap[item.symbol]) {
          resultMap[item.symbol] = buildFallback()[item.symbol];
        }
      }

      return res.status(200).json({
        success: true,
        probabilities: resultMap,
        model: chosenModel,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        probabilities: buildFallback(),
        model: `${chosenModel} (Quant Fallback)`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const ai = getClient();
  if (!ai) {
    return res.status(200).json({
      success: false,
      error: 'GEMINI_API_KEY chưa được cấu hình trên môi trường máy chủ.',
    });
  }

  try {
    const prompt = body?.prompt || body?.message || 'Phân tích tài chính cá nhân';
    const model = body?.model || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return res.status(200).json({
      success: true,
      data: response.text,
      subpath,
    });
  } catch (err: any) {
    console.error('[Gemini API Serverless Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Lỗi xử lý yêu cầu Gemini AI',
    });
  }
}
