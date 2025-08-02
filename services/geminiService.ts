import { ReviewResult } from '../types';

export const generateReview = async (fileContent: string): Promise<ReviewResult> => {
  try {
    const response = await fetch('/api/generate-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileContent }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `伺服器發生錯誤 (狀態碼: ${response.status})`);
    }

    const result: ReviewResult = await response.json();
    return result;

  } catch (error) {
    console.error("呼叫後端審查 API 時發生錯誤:", error);
    if (error instanceof Error) {
        throw new Error(`無法從後端獲取回應：${error.message}`);
    }
    throw new Error("無法從後端獲取有效回應，請稍後再試。");
  }
};
