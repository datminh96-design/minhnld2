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
    { name: 'CafeF Chứng khoán', source: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.rss', type: 'VN_STOCK' },
    { name: 'VnEconomy Chứng khoán', source: 'VnEconomy', url: 'https://vneconomy.vn/chung-khoan.rss', type: 'VN_STOCK' },
    { name: 'CafeF Tài chính', source: 'CafeF', url: 'https://cafef.vn/tai-chinh-quoc-te.rss', type: 'MACRO' },
    { name: 'CoinDesk Crypto', source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'CRYPTO' },
  ];

  const rawArticles: { title: string; desc: string; source: string; pubDate: string; type: string }[] = [];

  for (const f of feeds) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
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
        while ((match = itemRegex.exec(text)) !== null && count < 5) {
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

  const results: any[] = [];
  const seenTitles = new Set<string>();

  for (const raw of rawArticles) {
    if (seenTitles.has(raw.title) || results.length >= 5) continue;
    seenTitles.add(raw.title);

    const fullText = `${raw.title} ${raw.desc}`.toUpperCase();
    const impactedAssets: string[] = [];

    for (const tick of KNOWN_TICKERS) {
      const reg = new RegExp(`(^|[^A-Z0-9])${tick}([^A-Z0-9]|$)`, 'i');
      if (reg.test(fullText)) {
        impactedAssets.push(tick);
      }
    }

    if (impactedAssets.length === 0) {
      if (raw.type === 'CRYPTO' || fullText.includes('BITCOIN') || fullText.includes('CRYPTO') || fullText.includes('TOKEN')) {
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

    const bullishWords = ['TĂNG', 'MUA RÒNG', 'BỐC ĐẦU', 'KỶ TÍCH', 'LẬP ĐỈNH', 'GOM RÒNG', 'HÚT TIỀN', 'LÃI', 'BỨT PHÁ', 'PHỤC HỒI', 'VƯỢT ĐỈNH', 'TĂNG TRƯỞNG', 'SURGE', 'RALLY', 'BULL', 'RECORD', 'GAIN', 'TOKENIZING'];
    const bearishWords = ['GIẢM', 'RƠI', 'THỦNG', 'BÁN RÒNG', 'XẢ', 'BÁN THÁO', 'LỖ', 'LAO DỐC', 'ÉP', 'ÁP LỰC', 'SUY GIẢM', 'ĐỎ', 'PHÁ SẢN', 'LO NGẠI', 'DROP', 'FALL', 'LOSS', 'BEAR', 'PLUNGE', 'CRASH', 'XẢ MẠNH'];
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
    if (impactType === 'BULLISH') {
      impactSummary = `Lực cầu và dòng tiền gia tăng tích cực, tạo động lực nâng đỡ kỳ vọng bứt phá cho nhóm ${targetList.join(', ')}.`;
    } else if (impactType === 'BEARISH') {
      impactSummary = `Áp lực bán tháo và điều chỉnh ngắn hạn gia tăng; cần quan sát kỹ các mốc hỗ trợ nến 4H của ${targetList.join(', ')}.`;
    } else if (impactType === 'VOLATILE') {
      impactSummary = `Thị trường xuất hiện rung lắc mạnh theo diễn biến tin tức; ưu tiên quản trị tỷ trọng và giải ngân chia nhỏ DCA.`;
    } else {
      impactSummary = `Dòng tiền đang ở trạng thái tích lũy thận trọng, tạo vùng đệm cân bằng cho ${targetList.join(', ')}.`;
    }

    results.push({
      title: raw.title,
      source: raw.source || 'Tin tức Thị trường',
      timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
      impactedAssets: targetList,
      impactType,
      impactSummary,
    });
  }

  return results;
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
        .slice(0, 10)
        .map((a, i) => `${i + 1}. [${a.source}] ${a.title} - ${a.desc.slice(0, 120)}`)
        .join('\n');

      const prompt = `
Bạn là chuyên gia phân tích vĩ mô và dòng tiền tài chính quốc tế (Crypto, Chứng khoán Việt Nam, Vàng).
Thời điểm phân tích: ${new Date().toISOString()}.

DƯỚI ĐÂY LÀ CÁC TIÊU ĐỀ TIN TỨC VỪA ĐƯỢC CẬP NHẬT TRỰC TIẾP TỪ THỊ TRƯỜNG HÔM NAY (CafeF, VnEconomy, CoinDesk, Vietstock):
${headlinesList || 'Thị trường biến động, dòng tiền phân hóa mạnh mẽ giữa nhóm Crypto, Ngân hàng và Quỹ đầu tư.'}

YÊU CẦU:
Hãy chọn lọc và phân tích ĐÚNG 5 TIN TỨC / SỰ KIỆN QUAN TRỌNG NHẤT từ danh sách trên (hoặc tổng hợp diễn biến thực tế mới nhất hôm nay) có tác động mạnh mẽ nhất tới GIÁ và DÒNG TIỀN:
1. "title": Tiêu đề súc tích, phản ánh đúng tin tức thật mới nhất hôm nay.
2. "source": Nguồn tin uy tín (CafeF, VnEconomy, CoinDesk, Bloomberg, Vietstock, Reuters).
3. "timeAgo": "Vừa cập nhật (Chu kỳ 4H)"
4. "impactedAssets": Mảng 2-4 mã tài sản chịu tác động trực tiếp (ví dụ: ["VN-INDEX", "TPB", "MBB"] hoặc ["BTC", "ETH", "SOL"]).
5. "impactType": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE"
6. "impactSummary": 1-2 câu súc tích bằng tiếng Việt phân tích rõ tác động cụ thể đến giá và hướng dịch chuyển dòng tiền (rút ra hay bơm vào).
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
