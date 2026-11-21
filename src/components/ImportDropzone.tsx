import React, { useRef, useState } from 'react';
import { Upload, FolderOpen, FileDown } from 'lucide-react';
import { EncodingMode } from '../types/parser';

interface ImportDropzoneProps {
  compact?: boolean;
  isProcessing: boolean;
  encodingMode: EncodingMode;
  onEncodingChange: (mode: EncodingMode) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSample: () => void;
  onDownloadSampleZip: () => void;
  errorMessage: string | null;
}

const ENCODING_OPTIONS: Array<{ value: EncodingMode; label: string }> = [
  { value: 'auto', label: '自動偵測（UTF-8 / Big5 / GB18030）' },
  { value: 'utf-8', label: '強制 UTF-8' },
  { value: 'big5', label: '強制 Big5（繁體舊編碼）' },
  { value: 'gb18030', label: '強制 GB18030' },
];

export function ImportDropzone({
  compact = false,
  isProcessing,
  encodingMode,
  onEncodingChange,
  onFilesSelected,
  onLoadSample,
  onDownloadSampleZip,
  errorMessage,
}: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border border-dashed px-5 py-3.5 transition-colors flex flex-wrap items-center justify-between gap-4 ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.txt"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex items-center gap-3 min-w-0">
          <Upload className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <p className="text-sm text-slate-700 truncate">
            {isProcessing
              ? '正在解壓並解析文字檔...'
              : '拖曳新的 .zip 壓縮檔或多個 .txt 檔案至此以替換資料'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span className="whitespace-nowrap">編碼</span>
            <select
              value={encodingMode}
              onChange={(e) => onEncodingChange(e.target.value as EncodingMode)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {ENCODING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            選擇檔案
          </button>
        </div>

        {errorMessage && (
          <p className="w-full text-xs text-red-700 mt-1" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? 'border-blue-600 bg-blue-50/60'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.txt"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="mx-auto w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
          <FolderOpen className="w-5 h-5 text-slate-700" aria-hidden="true" />
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-1.5">
          匯入打包的 ZIP 壓縮檔或批次 TXT 檔案
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
          所有解壓縮與欄位解析完全於本機瀏覽器執行，檔案不會上傳至外部伺服器。支援巢狀子資料夾、自動排除 macOS 中繼檔，並依「========」分隔線自動拆解標頭與內文。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
            className="px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isProcessing ? '正在解壓與解析...' : '選擇 ZIP 或 TXT 檔案'}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onLoadSample}
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            載入範例資料集（6 篇文檔）
          </button>

          <button
            type="button"
            onClick={onDownloadSampleZip}
            className="px-4 py-2.5 rounded-lg text-slate-600 text-sm font-medium hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>下載範例 .zip</span>
          </button>
        </div>

        <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <label className="inline-flex items-center gap-2">
            <span>文字編碼模式</span>
            <select
              value={encodingMode}
              onChange={(e) => onEncodingChange(e.target.value as EncodingMode)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {ENCODING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">·</span>
          <span>預設輸出 UTF-8 BOM CSV（相容 Excel 繁體中文）</span>
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-700 font-medium" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-slate-900">預設辨識之規範 TXT 結構</h3>
          <span className="text-xs text-slate-500">
            支援全形「：」與半形「:」冒號，亦可於「欄位規則設定」自訂增刪欄位
          </span>
        </div>
        <pre className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs font-mono text-slate-700 leading-relaxed overflow-x-auto">{`標題：文章或檔案標題
編號：ARC-2026-001
日期：2026-01-14
標籤：再生能源, 微電網, 基礎建設
原始網址：https://example.org/post/001
影片嵌入網址：https://www.youtube.com/embed/xxxxxxx
========================================
此分隔線以後的所有段落文字皆會完整擷取至「內文」欄位，
並於匯出 CSV 時依 RFC 4180 規範自動以雙引號包覆與跳脫，
確保多行換行與逗號在 Excel 與 Google 試算表中不破版。`}</pre>
      </div>
    </div>
  );
}
