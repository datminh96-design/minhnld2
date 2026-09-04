import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
const geminiNewsCache = new Map<string, { data: any; model: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const modelCooldowns = new Map<string, number>();

function isModelInCooldown(model: string): boolean {
  const expiresAt = modelCooldowns.get(model);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    modelCooldowns.delete(model);
    return false;
  }
  return true;
}

function setModelCooldown(model: string, durationMs: number = 60000) {
  modelCooldowns.set(model, Date.now() + durationMs);
}

function getCandidateModels(preferredModel?: string): string[] {
  const validModels = [
    preferredModel,
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-3.1-pro',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
  ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i);

  const available = validModels.filter((m) => !isModelInCooldown(m));
  return available.slice(0, 3);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, cycleTimestamp } = req.body || {};
  const chosenModel = model || 'gemini-3.1-flash-lite';
  const cacheKey = `news_${cycleTimestamp || Math.floor(Date.now() / (4 * 3600 * 1000))}_${chosenModel}`;

  const cached = geminiNewsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      data: cached.data,
      model: cached.model,
      cached: true,
      timestamp: new Date(cached.timestamp).toISOString(),
    });
  }

  const defaultNews = [
    {
      title: 'Dòng vốn tổ chức qua các quỹ Spot ETF duy trì mua ròng tích cực',
      source: 'CoinDesk / Bloomberg',
      timeAgo: 'Chu kỳ 4H mới nhất',
      impactedAssets: ['BTC', 'ETH', 'SOL', 'SUI'],
      impactType: 'BULLISH',
      impactSummary: 'Lực hấp thụ dòng tiền lớn từ các quỹ ETF hỗ trợ giữ vững các ngưỡng hỗ trợ kỹ thuật quan trọng của thị trường tiền mã hóa.',
    },
    {
      title: 'Ngân hàng Nhà nước định hướng thanh khoản dồi dào, thúc đẩy tăng trưởng tín dụng',
      source: 'VnEconomy',
      timeAgo: 'Chu kỳ 4H mới nhất',
      impactedAssets: ['TPB', 'VCB', 'MBB', 'TCB', 'VN-INDEX'],
      impactType: 'BULLISH',
      impactSummary: 'Tạo động lực tích cực cho nhóm cổ phiếu Ngân hàng và thúc đẩy dòng tiền nội vào thị trường chứng khoán.',
    },
    {
      title: 'Khối ngoại phân hóa dòng tiền, gia tăng giải ngân vào nhóm cổ phiếu cơ bản và công nghệ',
      source: 'Vietstock',
      timeAgo: 'Chu kỳ 4H mới nhất',
      impactedAssets: ['FPT', 'HPG', 'SSI', 'VN-INDEX'],
      impactType: 'BULLISH',
      impactSummary: 'Lực mua gom ròng tại các vùng hỗ trợ then chốt tạo bệ đỡ tâm lý vững chắc cho thị trường cơ sở.',
    },
    {
      title: 'Giá vàng thế giới và vàng miếng trong nước duy trì vị thế tài sản phòng hộ chiến lược',
      source: 'Reuters / Kitco',
      timeAgo: 'Chu kỳ 4H mới nhất',
      impactedAssets: ['SJC', 'PAXG', 'XAUT', 'VÀNG'],
      impactType: 'BULLISH',
      impactSummary: 'Dòng tiền luân chuyển cân bằng giữa kênh đầu tư tăng trưởng và kênh bảo toàn tài sản trước biến động vĩ mô.',
    },
    {
      title: 'Thanh khoản khớp lệnh nến 4H tập trung cao quanh các ngưỡng EMA20/EMA50',
      source: 'Market Sentiment',
      timeAgo: 'Chu kỳ 4H mới nhất',
      impactedAssets: ['BTC', 'ETH', 'VN-INDEX', 'TPB'],
      impactType: 'NEUTRAL',
      impactSummary: 'Giai đoạn tích lũy động lượng trước khi xuất hiện nhịp bứt phá mới; phù hợp chiến lược gom hàng theo từng mốc Entry DCA.',
    },
  ];

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json({
      success: true,
      data: defaultNews,
      model: `${chosenModel} (Quant News Feed)`,
      isOfflineFallback: true,
      timestamp: new Date().toISOString(),
    });
  }

  const prompt = `
Bạn là chuyên gia phân tích vĩ mô và tin tức thị trường tài chính cấp cao (Crypto, Chứng khoán Việt Nam, Vàng).
Hãy tổng hợp đúng 5 TIN TỨC / SỰ KIỆN TÀI CHÍNH quan trọng nhất có tác động trực tiếp đến GIÁ và DÒNG TIỀN trong chu kỳ nến 4H hiện tại:

Yêu cầu mỗi tin tức:
- "title": Tiêu đề súc tích, mang tính thời sự, nêu bật trọng tâm sự kiện.
- "source": Nguồn tin uy tín (ví dụ: CoinDesk, Bloomberg, Reuters, VnEconomy, Vietstock, CafeF...).
- "timeAgo": Thời gian (ví dụ: "30 phút trước", "1 giờ trước", "Chu kỳ 4H này").
- "impactedAssets": Mảng mã tài sản chịu tác động trực tiếp (ví dụ: ["BTC", "ETH"], ["TPB", "VCB", "VN-INDEX"], ["FPT"], ["SJC"]).
- "impactType": "BULLISH" (tích cực), "BEARISH" (tiêu cực), "NEUTRAL" (trung lập), hoặc "VOLATILE" (biến động mạnh).
- "impactSummary": 1-2 câu phân tích rõ tác động cụ thể đến giá hoặc dòng tiền của nhóm tài sản liên quan.
`;

  const candidateModels = getCandidateModels(chosenModel);

  for (const modelAttempt of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model: modelAttempt,
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
              required: ['title', 'source', 'timeAgo', 'impactedAssets', 'impactType', 'impactSummary'],
            },
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      );

      const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
      const text = response?.text;
      if (!text) continue;

      const parsedData = JSON.parse(text);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        geminiNewsCache.set(cacheKey, {
          data: parsedData,
          model: modelAttempt,
          timestamp: Date.now(),
        });

        return res.status(200).json({
          success: true,
          data: parsedData,
          model: modelAttempt,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      const errStr = String(err?.message || err || '');
      if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        setModelCooldown(modelAttempt, 3 * 60 * 1000);
      } else if (errStr.includes('503') || errStr.includes('UNAVAILABLE')) {
        setModelCooldown(modelAttempt, 30 * 1000);
      }
    }
  }

  return res.status(200).json({
    success: true,
    data: defaultNews,
    model: `${chosenModel} (Quant News Feed)`,
    isOfflineFallback: true,
    timestamp: new Date().toISOString(),
  });
}
