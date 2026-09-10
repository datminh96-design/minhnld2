import { GoogleGenAI } from '@google/genai';

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subpath = getSubpath(req);
  const body = parseBody(req);

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
