
import React, { useState, useCallback, useEffect } from 'react';
import { generateReview } from './services/geminiService';
import { ReviewItem, ReviewResult } from './types';
import { extractTextFromFile } from './utils/fileReader';
import { FileUploadIcon, CheckCircleIcon, DocumentTextIcon, XCircleIcon, AiRobotIcon, ThinkingIcon } from './components/Icons';

// --- Thinking Steps Definition ---
const thinkingSteps = [
  "正在初始化審查模組...",
  "分析文件結構與章節...",
  "審核：基本資料與計畫範圍...",
  "比對：土地合法性與權屬...",
  "分析：坡度與地形判釋...",
  "驗證：水文資料與降雨強度計算...",
  "比對：《水土保持技術規範》第16條...",
  "檢核：逕流量估算參數合理性...",
  "審查：地質鑽探與土壤力學參數...",
  "驗證：排水系統設計流量...",
  "比對：《水土保持技術規範》第84條...",
  "檢核：滯洪沉砂設施容量計算...",
  "驗證：邊坡穩定性分析 (FS)...",
  "比對：《水土保持技術規範》第73條...",
  "審查：植生工程與防災計畫...",
  "正在整合審查意見...",
  "生成整體綜合評估...",
  "最終格式化報告..."
];


// --- Helper Components ---

const AiThinkingIndicator: React.FC<{ currentStep: string }> = ({ currentStep }) => {
    return (
        <div className="mt-6 p-4 glass-card rounded-lg flex items-center space-x-4 animate-fade-in">
            <ThinkingIcon className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            <div>
                <p className="font-semibold text-gray-200">AI 審查中...</p>
                <p className="text-sm text-gray-400">{currentStep}</p>
            </div>
        </div>
    );
};

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  file: File | null;
  clearFile: () => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, file, clearFile, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  if (file) {
    return (
      <div className="bg-gray-700/50 p-4 rounded-lg border border-dashed border-gray-600 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center space-x-3 overflow-hidden">
          <DocumentTextIcon className="h-6 w-6 text-indigo-400 flex-shrink-0" />
          <span className="text-gray-300 font-medium truncate" title={file.name}>{file.name}</span>
        </div>
        <button onClick={clearFile} disabled={disabled} className="p-1 rounded-full hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <XCircleIcon className="h-6 w-6 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ease-in-out ${
        isDragging ? 'border-indigo-400 bg-gray-700/60 scale-105' : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50 hover:border-gray-500'
      }`}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <FileUploadIcon className="w-12 h-12 text-gray-500 mb-3" />
      <p className="mb-2 text-sm text-gray-400">
        <span className="font-semibold text-indigo-400">點擊上傳</span> 或拖放檔案至此
      </p>
      <p className="text-xs text-gray-500">支援 PDF, DOC, DOCX, TXT 文件格式</p>
      <input id="dropzone-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleFileChange} disabled={disabled} />
    </label>
  );
};

interface ReviewReportProps {
  reviewItems: ReviewItem[];
}

const ReviewReport: React.FC<ReviewReportProps> = ({ reviewItems }) => {
  return (
    <div className="glass-card rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-100 p-6 border-b border-white/10">
        細項審查意見
      </h2>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full table-fixed divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">編號</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/2">初審意見</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">對應頁碼</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">引用法規/規範</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reviewItems.map((item, index) => (
              <tr key={item.id} className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/5' : ''} hover:bg-indigo-900/20`}>
                <td className="px-4 py-4 text-sm font-medium text-gray-300 text-center">{item.id}</td>
                <td className="px-6 py-4 text-sm text-gray-300 break-words"><div className="prose prose-sm prose-invert max-w-none">{item.opinion}</div></td>
                <td className="px-6 py-4 text-sm text-gray-400 break-words">{item.page_number}</td>
                <td className="px-6 py-4 text-sm text-gray-400 break-words">{item.regulation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewed, setIsReviewed] = useState<boolean>(false);
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      intervalId = setInterval(() => {
        setThinkingStepIndex((prevIndex) => (prevIndex + 1) % thinkingSteps.length);
      }, 1500);
    }
    return () => clearInterval(intervalId);
  }, [isLoading]);


  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setReviewResult(null);
    setError(null);
    setIsReviewed(false);
  };

  const handleClearFile = () => {
    if (isLoading) return;
    setFile(null);
    setReviewResult(null);
    setError(null);
    setIsReviewed(false);
  };

  const handleGenerateReview = useCallback(async () => {
    if (!file) {
      setError('請先上傳文件。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReviewResult(null);
    setIsReviewed(false);
    setThinkingStepIndex(0);

    try {
      const fileContent = await extractTextFromFile(file);
      if (!fileContent || fileContent.trim().length === 0) {
          setError('無法從檔案中提取有效文字內容，或文件為空。');
          setIsLoading(false);
          return;
      }
      const result = await generateReview(fileContent);
      setReviewResult(result);
      setIsReviewed(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '處理檔案時發生未知錯誤。';
      setError(`審查失敗：${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [file]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col animated-gradient bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900/30">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>

      <header className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <AiRobotIcon className="w-10 h-10 text-indigo-400 flex-shrink-0" />
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-indigo-300">
                    AI 水土保持計畫審查輔助
                </h1>
                <p className="text-sm text-gray-400 mt-1">智慧化審查，提升效率與準確性</p>
            </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-sm font-semibold text-gray-300">逢甲×研邦</p>
            <p className="text-xs text-gray-500">AI研究團隊</p>
        </div>
      </header>
      
      <main className="flex-grow w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          <div className="max-w-none mb-8 text-gray-300 space-y-4 text-base">
            <p>
              身為一位水土保持工作者，深知審查工作繁重、專業性強，且背負著重大的法定責任。本系統旨在審查的各個環節為您分擔繁瑣的工作、驗證數據的準確性、並擴展您的審查維度，從而提升效率、強化精度、降低疏漏風險。
            </p>
            <p>
              請上傳您的水土保持計畫書，AI 將根據相關法規進行初步審查。
            </p>
          </div>

          <FileUpload onFileUpload={handleFileUpload} file={file} clearFile={handleClearFile} disabled={isLoading} />

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center" role="alert">
              <XCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {isLoading && <AiThinkingIndicator currentStep={thinkingSteps[thinkingStepIndex]} />}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerateReview}
              disabled={!file || isLoading}
              className="relative inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden group"
            >
              <span className="absolute left-0 top-0 w-full h-full bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-10"></span>
              {isLoading ? '審查中...' : '產生初審意見'}
            </button>
          </div>
        </div>

        {isReviewed && reviewResult && !error && (
          <div className="mt-12 space-y-8 animate-fade-in">
            {/* Summary Section */}
            <div className="glass-card rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-100 p-6 border-b border-white/10">
                整體綜合評估
              </h2>
              <div className="p-6 prose prose-base prose-invert max-w-none">
                <p>{reviewResult.summary}</p>
              </div>
            </div>

            {/* Detailed Findings Section */}
            {reviewResult.review_items.length > 0 ? (
               <ReviewReport reviewItems={reviewResult.review_items} />
            ) : (
              <div className="bg-green-900/50 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg flex items-center" role="status">
                <CheckCircleIcon className="h-6 w-6 mr-3"/>
                <div>
                  <strong className="font-bold">審查完成：</strong>
                  <span className="block sm:inline">AI 未發現具體待改善項目，計畫內容大致符合規範。</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full">
        <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} AI 水土保持計畫審查輔助 by 逢甲×研邦 AI研究團隊. 版權所有.
        </div>
      </footer>
    </div>
  );
};

export default App;
