import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants/prompts';

// 從 Vercel 的環境變數中讀取 API 金鑰
const API_KEY = process.env.API_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 只接受 POST 請求
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '僅允許 POST 方法' });
  }

  if (!API_KEY) {
    console.error("API 金鑰未在伺服器環境中設定。");
    return res.status(500).json({ error: "伺服器設定錯誤：API 金鑰遺失。" });
  }

  const { fileContent } = req.body;

  if (!fileContent) {
    return res.status(400).json({ error: '缺少 `fileContent` 欄位。' });
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const fullPrompt = `${SYSTEM_PROMPT}

<uploaded_plan_content>
${fileContent}
</uploaded_plan_content>
`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A high-level, comprehensive overview of the plan." },
              review_items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER, description: "Sequential number for the review item." },
                    opinion: { type: Type.STRING, description: "The detailed review comment or finding." },
                    page_number: { type: Type.STRING, description: "The page number or section in the document where the issue is found. Can be 'N/A'." },
                    regulation: { type: Type.STRING, description: "The specific law, article, or specification that applies. Can be 'N/A'." },
                  },
                   required: ["id", "opinion", "page_number", "regulation"]
                }
              }
            },
            required: ["summary", "review_items"]
          }
        }
    });
    
    const responseText = response.text.trim();
    const parsedJson = JSON.parse(responseText);

    // 設定快取控制標頭，指示 CDN 和瀏覽器不要快取此 API 回應
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(parsedJson);

  } catch (error) {
    console.error("在 Serverless Function 中呼叫 Gemini API 失敗:", error);
    const errorMessage = error instanceof Error ? error.message : "未知的 AI 服務錯誤";
    return res.status(500).json({ error: `AI 服務處理失敗: ${errorMessage}` });
  }
}
