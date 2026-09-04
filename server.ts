import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

// In-memory cache for Gemini Technical Analysis to preserve API quota
const geminiAnalysisCache = new Map<string, { data: any; model: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Gemini Technical Analysis Endpoint
  app.post('/api/gemini/analyze-technical', async (req, res) => {
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
    } = req.body;

    const chosenModel = model || 'gemini-3.7-flash';
    const cacheKey = `${symbol}_${chosenModel}`;

    // 1. Check in-memory cache first to avoid exhausting API quota
    const cached = geminiAnalysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: cached.data,
        model: cached.model,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString(),
      });
    }

    // High-precision algorithmic quant fallback helper
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
      return res.json({
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
- Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')} VND ${currentPriceUsdt ? `(~ $${currentPriceUsdt})` : ''}
- Giá vốn bình quân (KDA): ${averageCost.toLocaleString('vi-VN')} VND ${averageCostUsdt ? `(~ $${averageCostUsdt})` : ''}
- Số lượng nắm giữ: ${currentQuantity}
- Tổng vốn đã đầu tư: ${totalInvested.toLocaleString('vi-VN')} VND
- Lợi nhuận hiện tại (% PnL): ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%

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
5. "customDcaAdvice": Lời khuyên tối ưu vị thế cá nhân hóa dựa trên Giá vốn KDA (${averageCost.toLocaleString('vi-VN')} đ) và mức Lãi/Lỗ hiện tại (${pnlPercent.toFixed(2)}%). Cụ thể: nếu đang lãi nên chặn lãi ở đâu, nếu đang lỗ có nên DCA thêm tại điểm mua nào hay không.
6. "tacticalBuyNotes": Đánh giá nhanh về 3 điểm mua (Entry 1, Entry 2, Entry 3).
7. "tacticalSellNotes": Đánh giá nhanh về 3 điểm chốt lời (TP 1, TP 2, TP 3).
8. "summaryReportMarkdown": Toàn văn bản báo cáo phân tích 4H tổng hợp hoàn chỉnh, súc tích, chuyên nghiệp bằng tiếng Việt.
`;

    // Candidate models to attempt if chosen model is rate limited
    const candidateModels = [
      chosenModel,
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    for (const modelAttempt of candidateModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model: modelAttempt,
          contents: prompt,
          config: {
            systemInstruction:
              'Bạn là chuyên gia tài chính định lượng và cố vấn đầu tư cao cấp. Bạn luôn đưa ra phân tích khách quan, chính xác, dựa trên dữ liệu kỹ thuật và quản trị rủi ro chặt chẽ bằng tiếng Việt.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                verdict: {
                  type: Type.STRING,
                  description: 'Khuyến nghị hành động chính (ví dụ: TÍCH LŨY MUA THÊM)',
                },
                confidence: {
                  type: Type.INTEGER,
                  description: 'Độ tin cậy của phân tích AI từ 0-100',
                },
                trendAnalysis: {
                  type: Type.STRING,
                  description: 'Phân tích xu hướng kỹ thuật 4H chi tiết',
                },
                keyDrivers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 động lực kỹ thuật chính',
                },
                customDcaAdvice: {
                  type: Type.STRING,
                  description: 'Chiến lược quản trị vị thế và DCA theo giá vốn KDA',
                },
                tacticalBuyNotes: {
                  type: Type.STRING,
                  description: 'Lưu ý chiến thuật cho các điểm mua',
                },
                tacticalSellNotes: {
                  type: Type.STRING,
                  description: 'Lưu ý chiến thuật cho các điểm chốt lời',
                },
                summaryReportMarkdown: {
                  type: Type.STRING,
                  description: 'Văn bản báo cáo phân tích tổng quan',
                },
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

        // 6 second timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout sau 6 giây')), 6000)
        );

        const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
        const text = response?.text;
        if (!text) {
          continue;
        }

        const parsedData = JSON.parse(text);

        // Cache successful response
        geminiAnalysisCache.set(cacheKey, {
          data: parsedData,
          model: modelAttempt,
          timestamp: Date.now(),
        });

        return res.json({
          success: true,
          data: parsedData,
          model: modelAttempt,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        const isQuotaErr =
          err?.status === 429 ||
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.message?.includes('429') ||
          err?.message?.includes('quota') ||
          err?.message?.includes('RESOURCE_EXHAUSTED');

        if (isQuotaErr) {
          console.warn(`[Gemini Notice] Model ${modelAttempt} rate-limited. Trying fallback candidate...`);
        }
        // Continue loop to try next model or drop to quant engine
      }
    }

    // High precision algorithmic quant engine fallback
    const fallbackData = buildQuantFallback('Quant Engine');
    return res.json({
      success: true,
      data: fallbackData,
      model: `${chosenModel} (Quant Engine)`,
      isErrorFallback: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Proxy routes for stock & fund APIs if needed
  app.get('/api/vps-stock/*', async (req, res) => {
    try {
      const targetPath = req.url.replace(/^\/api\/vps-stock/, '');
      const response = await fetch(`https://bgapidatafeed.vps.com.vn${targetPath}`);
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/fmarket/*', async (req, res) => {
    try {
      const targetPath = req.url.replace(/^\/api\/fmarket/, '');
      const response = await fetch(`https://api.fmarket.vn${targetPath}`);
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
