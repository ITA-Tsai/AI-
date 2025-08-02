
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// This is required for pdf.js to find its worker script.
// The global variable is set in index.html.
declare global {
    interface Window {
        pdfjsWorker: string;
    }
}
pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfjsWorker;


export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (fileExtension === 'pdf') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error("無法讀取 PDF 檔案。"));
            try {
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    // 'str' in item is a type guard to ensure item is TextItem
                    textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ');
                    textContent += '\n\n';
                }
                resolve(textContent);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                reject(new Error(`解析 PDF 時發生錯誤： ${message}`));
            }
        };
        reader.onerror = () => reject(new Error("讀取 PDF 檔案緩衝區失敗。"));
        reader.readAsArrayBuffer(file);
    });
  }

  if (fileExtension === 'doc' || fileExtension === 'docx') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error("無法讀取 DOC/DOCX 檔案。"));
            try {
                const result = await mammoth.extractRawText({ arrayBuffer: event.target.result as ArrayBuffer });
                resolve(result.value);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                reject(new Error(`解析 DOC/DOCX 時發生錯誤： ${message}`));
            }
        };
        reader.onerror = () => reject(new Error("讀取 DOC/DOCX 檔案緩衝區失敗。"));
        reader.readAsArrayBuffer(file);
    });
  }

  // Default to text reader for .txt, .md, etc.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('無法將檔案讀取為文字。'));
      }
    };
    reader.onerror = () => reject(new Error('讀取文字檔案失敗。'));
    reader.readAsText(file);
  });
};
