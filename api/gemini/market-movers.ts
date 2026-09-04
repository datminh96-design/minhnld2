import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
const geminiMoversCache = new Map<string, { data: any; model: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
  const chosenModel = model || 'gemini-3.8-flash';
  const cacheKey = `movers_${cycleTimestamp || Math.floor(Date.now() / (4 * 3600 * 1000))}_${chosenModel}`;

  const cached = geminiMoversCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      data: cached.data,
      model: cached.model,
      cached: true,
      timestamp: new Date(cached.timestamp).toISOString(),
    });
  }

  const defaultMovers = {
    cryptoGainers: [
      {
        symbol: 'SUI',
        name: 'Sui Network',
        priceFormatted: '$3.42',
        changePercent: 15.6,
        type: 'gain',
        category: 'crypto',
        reason: 'Dòng tiền hệ sinh thái bùng nổ, TVL DeFi vượt mốc kỷ lục và khối lượng giao dịch phái sinh tăng vọt.',
      },
      {
        symbol: 'RENDER',
        name: 'Render Network',
        priceFormatted: '$6.85',
        changePercent: 12.4,
        type: 'gain',
        category: 'crypto',
        reason: 'Nhu cầu hạ tầng điện toán AI phi tập trung tăng cao và dòng vốn tổ chức mua gom trên các sàn lớn.',
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        priceFormatted: '$188.50',
        changePercent: 8.9,
        type: 'gain',
        category: 'crypto',
        reason: 'Khối lượng giao dịch DEX trên chuỗi áp đảo, dòng tiền kỳ vọng sản phẩm Spot ETF mở rộng.',
      },
      {
        symbol: 'NEAR',
        name: 'NEAR Protocol',
        priceFormatted: '$5.20',
        changePercent: 7.8,
        type: 'gain',
        category: 'crypto',
        reason: 'Mở rộng tính năng User-Owned AI và số lượng tài khoản hoạt động tích cực đạt đỉnh mới.',
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        priceFormatted: '$0.26',
        changePercent: 6.9,
        type: 'gain',
        category: 'crypto',
        reason: 'Động lực mua từ cộng đồng và khối lượng giao dịch giao ngay tăng trở lại khi dòng tiền luân chuyển sang memecoin.',
      },
    ],
    cryptoLosers: [
      {
        symbol: 'STRK',
        name: 'Starknet',
        priceFormatted: '$0.38',
        changePercent: -9.4,
        type: 'loss',
        category: 'crypto',
        reason: 'Áp lực nguồn cung lớn từ lịch mở khóa token định kỳ của đội ngũ phát triển và nhà đầu tư sớm.',
      },
      {
        symbol: 'WLD',
        name: 'Worldcoin',
        priceFormatted: '$1.65',
        changePercent: -8.2,
        type: 'loss',
        category: 'crypto',
        reason: 'Lo ngại thanh tra dữ liệu sinh trắc học tại một số quốc gia khiến lực bán phòng thủ gia tăng.',
      },
      {
        symbol: 'ARB',
        name: 'Arbitrum',
        priceFormatted: '$0.54',
        changePercent: -6.8,
        type: 'loss',
        category: 'crypto',
        reason: 'Cạnh tranh gay gắt giữa các Layer 2 và sự sụt giảm nhẹ của tổng doanh thu phí mạng lưới.',
      },
      {
        symbol: 'TIA',
        name: 'Celestia',
        priceFormatted: '$4.10',
        changePercent: -6.1,
        type: 'loss',
        category: 'crypto',
        reason: 'Lực chốt lời sau nhịp hồi kỹ thuật và thị trường dự báo lượng token mở khóa trong quý tới.',
      },
      {
        symbol: 'OP',
        name: 'Optimism',
        priceFormatted: '$1.42',
        changePercent: -5.5,
        type: 'loss',
        category: 'crypto',
        reason: 'Hoạt động chuyển dịch dòng vốn sang các hệ sinh thái Layer 1 mới nổi gây áp lực điều chỉnh.',
      },
    ],
    stockGainers: [
      {
        symbol: 'TPB',
        name: 'Ngân hàng Tiên Phong',
        priceFormatted: '18,650 đ',
        changePercent: 6.8,
        type: 'gain',
        category: 'stock',
        reason: 'Khối ngoại mua ròng mạnh mẽ, tăng trưởng tín dụng vượt trội và biên lãi thuần (NIM) duy trì mức cao.',
      },
      {
        symbol: 'FPT',
        name: 'Tập đoàn FPT',
        priceFormatted: '138,500 đ',
        changePercent: 5.4,
        type: 'gain',
        category: 'stock',
        reason: 'Doanh thu mảng xuất khẩu phần mềm & dịch vụ AI toàn cầu tăng trưởng kỷ lục.',
      },
      {
        symbol: 'VCB',
        name: 'Vietcombank',
        priceFormatted: '94,200 đ',
        changePercent: 4.6,
        type: 'gain',
        category: 'stock',
        reason: 'Dòng tiền tổ chức và quỹ ETF giải ngân đón đầu lộ trình tăng vốn điều lệ và trả cổ tức.',
      },
      {
        symbol: 'HPG',
        name: 'Tập đoàn Hòa Phát',
        priceFormatted: '27,800 đ',
        changePercent: 4.2,
        type: 'gain',
        category: 'stock',
        reason: 'Sản lượng tiêu thụ thép xây dựng và HRC phục hồi tích cực, đại dự án Dung Quất 2 đúng tiến độ.',
      },
      {
        symbol: 'SSI',
        name: 'Chứng khoán SSI',
        priceFormatted: '34,500 đ',
        changePercent: 3.8,
        type: 'gain',
        category: 'stock',
        reason: 'Thanh khoản toàn thị trường bùng nổ và kỳ vọng hưởng lợi lớn từ hệ thống KRX cùng tiến trình nâng hạng thị trường.',
      },
    ],
    stockLosers: [
      {
        symbol: 'NVL',
        name: 'Novaland',
        priceFormatted: '10,200 đ',
        changePercent: -4.8,
        type: 'loss',
        category: 'stock',
        reason: 'Áp lực đáo hạn trái phiếu doanh nghiệp và tiến độ tháo gỡ pháp lý một số dự án còn chậm.',
      },
      {
        symbol: 'DIG',
        name: 'Tổng CTCP Đầu tư Phát triển Xây dựng',
        priceFormatted: '22,400 đ',
        changePercent: -3.9,
        type: 'loss',
        category: 'stock',
        reason: 'Áp lực chốt lời ngắn hạn của nhóm nhà đầu tư cá nhân sau nhịp phục hồi kỹ thuật.',
      },
      {
        symbol: 'PDR',
        name: 'Bất động sản Phát Đạt',
        priceFormatted: '20,800 đ',
        changePercent: -3.5,
        type: 'loss',
        category: 'stock',
        reason: 'Dòng tiền nhóm bất động sản phân hóa mạnh và áp lực chi phí vốn trong ngắn hạn.',
      },
      {
        symbol: 'VHM',
        name: 'Vinhomes',
        priceFormatted: '41,200 đ',
        changePercent: -2.8,
        type: 'loss',
        category: 'stock',
        reason: 'Khối ngoại bán ròng cơ cấu danh mục và sự thận trọng của thị trường trước các đợt mở bán dự án mới.',
      },
      {
        symbol: 'VRE',
        name: 'Vincom Retail',
        priceFormatted: '18,300 đ',
        changePercent: -2.4,
        type: 'loss',
        category: 'stock',
        reason: 'Tỷ lệ lấp đầy TTTM ổn định nhưng chịu ảnh hưởng tâm lý chung từ áp lực bán ròng của khối ngoại.',
      },
    ],
  };

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json({
      success: true,
      data: defaultMovers,
      model: `${chosenModel} (Quant Engine)`,
      isOfflineFallback: true,
      timestamp: new Date().toISOString(),
    });
  }

  const prompt = `
Bạn là chuyên gia thị trường tài chính cấp cao (Crypto & Thị trường Chứng khoán Việt Nam).
Hãy cung cấp danh sách phân tích thị trường theo chu kỳ nến 4H hiện tại:

1. Top 5 Đồng Coin Tăng Cao Nhất (cryptoGainers): 5 mã coin có mức tăng trưởng hàng đầu trong chu kỳ 4H gần nhất.
2. Top 5 Đồng Coin Giảm Sâu Nhất (cryptoLosers): 5 mã coin chịu áp lực điều chỉnh mạnh nhất.
3. Top 5 Cổ Phiếu Việt Nam Tăng Cao Nhất (stockGainers): 5 mã cổ phiếu (HOSE/HNX/VN30) tăng mạnh nhất.
4. Top 5 Cổ Phiếu Việt Nam Giảm Sâu Nhất (stockLosers): 5 mã cổ phiếu (HOSE/HNX/VN30) giảm nhiều nhất.

Với MỖI MÃ tài sản:
- "symbol": Mã giao dịch (ví dụ: SUI, SOL, TPB, FPT, NVL...)
- "name": Tên đầy đủ của đồng coin hoặc doanh nghiệp
- "priceFormatted": Giá thị trường hiển thị định dạng chuẩn (ví dụ "$3.42", "18,650 đ")
- "changePercent": Số % tăng (+) hoặc giảm (-) dưới dạng số thập phân (ví dụ 15.6 hoặc -9.4)
- "type": "gain" (nếu tăng) hoặc "loss" (nếu giảm)
- "category": "crypto" hoặc "stock"
- "reason": 1-2 câu giải thích súc tích, chuyên sâu và thuyết phục về LÝ DO TĂNG hoặc LÝ DO GIẢM (về dòng tiền, thông tin kết quả kinh doanh, khối ngoại, sự kiện công nghệ, mở khóa token, hoặc yếu tố vĩ mô).
`;

  const candidateModels = [
    chosenModel,
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ].filter((m, i, arr) => !!m && arr.indexOf(m) === i);

  for (const modelAttempt of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model: modelAttempt,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cryptoGainers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    name: { type: Type.STRING },
                    priceFormatted: { type: Type.STRING },
                    changePercent: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['gain', 'loss'] },
                    category: { type: Type.STRING, enum: ['crypto', 'stock'] },
                    reason: { type: Type.STRING },
                  },
                  required: ['symbol', 'name', 'priceFormatted', 'changePercent', 'type', 'category', 'reason'],
                },
              },
              cryptoLosers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    name: { type: Type.STRING },
                    priceFormatted: { type: Type.STRING },
                    changePercent: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['gain', 'loss'] },
                    category: { type: Type.STRING, enum: ['crypto', 'stock'] },
                    reason: { type: Type.STRING },
                  },
                  required: ['symbol', 'name', 'priceFormatted', 'changePercent', 'type', 'category', 'reason'],
                },
              },
              stockGainers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    name: { type: Type.STRING },
                    priceFormatted: { type: Type.STRING },
                    changePercent: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['gain', 'loss'] },
                    category: { type: Type.STRING, enum: ['crypto', 'stock'] },
                    reason: { type: Type.STRING },
                  },
                  required: ['symbol', 'name', 'priceFormatted', 'changePercent', 'type', 'category', 'reason'],
                },
              },
              stockLosers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: { type: Type.STRING },
                    name: { type: Type.STRING },
                    priceFormatted: { type: Type.STRING },
                    changePercent: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['gain', 'loss'] },
                    category: { type: Type.STRING, enum: ['crypto', 'stock'] },
                    reason: { type: Type.STRING },
                  },
                  required: ['symbol', 'name', 'priceFormatted', 'changePercent', 'type', 'category', 'reason'],
                },
              },
            },
            required: ['cryptoGainers', 'cryptoLosers', 'stockGainers', 'stockLosers'],
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 14000)
      );

      const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
      const text = response?.text;
      if (!text) continue;

      const parsedData = JSON.parse(text);

      geminiMoversCache.set(cacheKey, {
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
    } catch (err: any) {
      console.warn(`[Vercel Serverless Movers] Model ${modelAttempt} attempt error:`, err?.message || err);
    }
  }

  return res.status(200).json({
    success: true,
    data: defaultMovers,
    model: `${chosenModel} (Quant Engine)`,
    isOfflineFallback: true,
    timestamp: new Date().toISOString(),
  });
}
