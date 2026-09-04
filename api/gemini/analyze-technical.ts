import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
const geminiAnalysisCache = new Map<string, { data: any; model: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
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

  const {
    symbol,
    name,
    assetType,
    currentPrice,
    currentPriceUsdt,
    averageCost,
    averageCostUsdt,
    pnlPercent,
    currentQuantity,
    totalInvested,
    indicators,
    upProbability,
    downProbability,
    primaryTrend,
    buyLevels,
    sellLevels,
    model,
  } = req.body || {};

  const chosenModel = model || 'gemini-3.8-flash';
  const cacheKey = `${symbol}_${chosenModel}`;

  // 1. Check in-memory cache
  const cached = geminiAnalysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      data: cached.data,
      model: cached.model,
      cached: true,
      timestamp: new Date(cached.timestamp).toISOString(),
    });
  }

  const buildQuantFallback = (sourceLabel: string = 'Quant Engine') => {
    const fallbackVerdict =
      pnlPercent >= 20
        ? 'CHỐT LỜI TỪNG PHẦN'
        : upProbability >= 65
        ? 'TÍCH LŨY MUA THÊM'
        : downProbability >= 60
        ? 'HẠ TỶ TRỌNG PHÒNG THỦ'
        : 'GIỮ VỊ THẾ & QUAN SÁT';

    const fallbackDrivers = [
      `RSI(14) đạt ${indicators?.rsi14 ?? 55} (${indicators?.rsiSignal ?? 'Ổn định'})`,
      `MACD Histogram ${indicators?.macd?.histogram >= 0 ? 'dương ủng hộ bên mua' : 'hơi âm cần thận trọng'}`,
      `Độ rộng Bollinger Bands ${indicators?.bollinger?.bandWidthPercent ?? 8.5}%`,
    ];

    return {
      verdict: fallbackVerdict,
      confidence: Math.round(Math.max(upProbability, downProbability) * 0.95),
      trendAnalysis: `Trên khung 4H, ${symbol} đang ở trạng thái ${primaryTrend} với xác suất tăng ${upProbability}% và xác suất điều chỉnh ${downProbability}%. Hệ EMA đang phản ánh ${indicators?.ema?.trend ?? 'tích lũy quanh đường trung bình'}.`,
      keyDrivers: fallbackDrivers,
      customDcaAdvice:
        pnlPercent >= 0
          ? `Vị thế đang có lãi (+${pnlPercent.toFixed(1)}%). Nên giữ kỷ luật chốt lời từng phần tại các điểm kháng cự và nâng chặn lãi theo EMA20.`
          : `Vị thế đang âm (-${Math.abs(pnlPercent).toFixed(1)}%). Tránh hoảng loạn bán tháo, xem xét DCA bổ sung tỷ trọng nhỏ tại các vùng hỗ trợ mạnh (Điểm Mua 2 & 3).`,
      tacticalBuyNotes: `Điểm Mua 1 thăm dò 30%, Điểm Mua 2 là vùng hỗ trợ mạnh (40%), Điểm Mua 3 bắt đáy sâu (30%).`,
      tacticalSellNotes: `Điểm Bán 1 khóa 35% lợi nhuận ngắn hạn, Điểm Bán 2 chốt 45% chủ lực, giữ 20% gồng lãi dài.`,
      summaryReportMarkdown: `Báo cáo phân tích kỹ thuật 4H mã ${symbol}: Xu hướng chủ đạo ${primaryTrend} (Xác suất tăng ${upProbability}%). Các chỉ báo RSI và MACD cho thấy động lượng đang phù hợp với kế hoạch giải ngân/chốt lời theo từng mốc kỹ thuật.`,
    };
  };

  const ai = getGeminiClient();
  if (!ai) {
    const fallbackData = buildQuantFallback('Offline');
    return res.status(200).json({
      success: true,
      data: fallbackData,
      model: `${chosenModel} (Quant Engine)`,
      isOfflineFallback: true,
      timestamp: new Date().toISOString(),
    });
  }

  const prompt = `
Bạn là chuyên gia phân tích kỹ thuật định lượng và cố vấn quản lý danh mục đầu tư chuyên nghiệp (CFA/CMT).
Hãy phân tích tài sản sau đây theo khung thời gian nến 4 Giờ (4H):

THÔNG TIN TÀI SẢN & VỊ THẾ CỦA NGƯỜI DÙNG:
- Mã tài sản: ${symbol} (${name})
- Loại tài sản: ${assetType}
- Giá hiện tại: ${Number(currentPrice || 0).toLocaleString('vi-VN')} VND ${currentPriceUsdt ? `(~ $${currentPriceUsdt})` : ''}
- Giá vốn bình quân (KDA): ${Number(averageCost || 0).toLocaleString('vi-VN')} VND ${averageCostUsdt ? `(~ $${averageCostUsdt})` : ''}
- Số lượng nắm giữ: ${currentQuantity}
- Tổng vốn đã đầu tư: ${Number(totalInvested || 0).toLocaleString('vi-VN')} VND
- Lợi nhuận hiện tại (% PnL): ${(pnlPercent || 0) >= 0 ? '+' : ''}${(pnlPercent || 0).toFixed(2)}%

DỮ LIỆU CHỈ BÁO KỸ THUẬT ĐỊNH LƯỢNG KHUNG 4H:
- RSI (14): ${indicators?.rsi14 ?? 'N/A'} (Trạng thái: ${indicators?.rsiSignal ?? 'N/A'})
- MACD (12, 26, 9): Histogram ${indicators?.macd?.histogram ?? 'N/A'} - Xu hướng: ${indicators?.macd?.trend ?? 'N/A'}
- Hệ EMA (20, 50, 200): ${indicators?.ema?.trend ?? 'N/A'}
- Bollinger Bands (20, 2): Độ rộng dải sóng ${indicators?.bollinger?.bandWidthPercent ?? 'N/A'}%
- Đánh giá sơ bộ: Xu hướng ${primaryTrend}, Xác suất Tăng: ${upProbability}%, Xác suất Giảm: ${downProbability}%

GỢI Ý 3 VÙNG MUA (ENTRY) & 3 VÙNG BÁN (TAKE PROFIT):
- Vùng Mua dự kiến: ${JSON.stringify(buyLevels || [])}
- Vùng Bán dự kiến: ${JSON.stringify(sellLevels || [])}

YÊU CẦU PHÂN TÍCH:
Hãy đưa ra nhận định chuyên sâu và xuất kết quả theo định dạng JSON với cấu trúc:
1. "verdict": Nhận định ngắn gọn hành động khuyến nghị (ví dụ: "TÍCH LŨY MUA THÊM", "GIỮ VỊ THẾ & QUAN SÁT", "CHỐT LỜI TỪNG PHẦN", "HẠ TỶ TRỌNG PHÒNG THỦ").
2. "confidence": Điểm tin cậy của AI từ 0 đến 100 (số nguyên, ví dụ: 88).
3. "trendAnalysis": Phân tích kỹ thuật chi tiết về hành động giá, các vùng hỗ trợ/kháng cự quan trọng trên khung 4H, tín hiệu giao thoa RSI/MACD/EMA.
4. "keyDrivers": Mảng gồm 3 gạch đầu dòng ngắn gọn (mỗi câu tối đa 15 từ) về các yếu tố kỹ thuật then chốt dẫn dắt giá.
5. "customDcaAdvice": Lời khuyên tối ưu vị thế cá nhân hóa dựa trên Giá vốn KDA (${Number(averageCost || 0).toLocaleString('vi-VN')} đ) và mức Lãi/Lỗ hiện tại (${(pnlPercent || 0).toFixed(2)}%). Cụ thể: nếu đang lãi nên chặn lãi ở đâu, nếu đang lỗ có nên DCA thêm tại điểm mua nào hay không.
6. "tacticalBuyNotes": Đánh giá nhanh về 3 điểm mua (Entry 1, Entry 2, Entry 3).
7. "tacticalSellNotes": Đánh giá nhanh về 3 điểm chốt lời (TP 1, TP 2, TP 3).
8. "summaryReportMarkdown": Toàn văn bản báo cáo phân tích 4H tổng hợp hoàn chỉnh, súc tích, chuyên nghiệp bằng tiếng Việt.
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
              verdict: { type: Type.STRING },
              confidence: { type: Type.INTEGER },
              trendAnalysis: { type: Type.STRING },
              keyDrivers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              customDcaAdvice: { type: Type.STRING },
              tacticalBuyNotes: { type: Type.STRING },
              tacticalSellNotes: { type: Type.STRING },
              summaryReportMarkdown: { type: Type.STRING },
            },
            required: [
              'verdict',
              'confidence',
              'trendAnalysis',
              'keyDrivers',
              'customDcaAdvice',
              'tacticalBuyNotes',
              'tacticalSellNotes',
              'summaryReportMarkdown',
            ],
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 14000)
      );

      const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
      const text = response.text ? response.text.trim() : '';
      const parsed = JSON.parse(text);

      geminiAnalysisCache.set(cacheKey, {
        data: parsed,
        model: modelAttempt,
        timestamp: Date.now(),
      });

      return res.status(200).json({
        success: true,
        data: parsed,
        model: modelAttempt,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn(`[Vercel Serverless] Model ${modelAttempt} attempt error:`, err?.message || err);
    }
  }

  const fallbackData = buildQuantFallback('Algorithmic Fallback');
  return res.status(200).json({
    success: true,
    data: fallbackData,
    model: `${chosenModel} (Quant Hybrid)`,
    isOfflineFallback: true,
    timestamp: new Date().toISOString(),
  });
}
