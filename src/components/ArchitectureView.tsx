import { useMemo, useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { ParserConfig } from '../types/parser';
import { generatePythonScript } from '../utils/pythonGenerator';
import { triggerFileDownload } from '../utils/parser';

interface ArchitectureViewProps {
  config: ParserConfig;
}

const PIPELINE_STEPS = [
  {
    step: '01',
    title: '串流解壓與雜訊過濾',
    detail:
      '遞迴掃描 ZIP 內所有目錄層級，僅鎖定 .txt 純文字檔，自動剔除 macOS 打包殘留的 __MACOSX/、._* 中繼檔與 .DS_Store，並依檔名自然排序確保輸出順序穩定。',
  },
  {
    step: '02',
    title: '多編碼自動偵測與正規化',
    detail:
      '逐檔檢查 UTF-8 BOM 與 UTF-16 標記，若無 BOM 則依序以嚴格模式嘗試 UTF-8 → Big5 → GB18030 解碼，並統一將 Windows (CRLF) 與舊版 Mac (CR) 換行符號正規化為 LF。',
  },
  {
    step: '03',
    title: '分隔線切分標頭與內文',
    detail:
      '以正則表達式 ^={10,}\\s*$ 定位第一條等號分隔線，將上方區塊交由鍵值解析器處理，下方所有行完整保留為「內文」，即使內文中再出現冒號或等號也不會誤判為標頭。',
  },
  {
    step: '04',
    title: '結構化欄位擷取與品質稽核',
    detail:
      '同時相容全形「：」與半形「:」冒號、鍵名前後空白與多行網址折行；擷取後自動驗證必填欄位缺漏、分隔線遺失及跨檔案「編號」重複異常。',
  },
  {
    step: '05',
    title: 'RFC 4180 安全轉譯與 UTF-8 BOM 輸出',
    detail:
      '所有含逗號、雙引號或換行符號的「內文」欄位皆依 RFC 4180 以雙引號包覆並跳脫內部引號，搭配 UTF-8 BOM（utf-8-sig）檔頭，讓 Excel 與 Google 試算表直接雙擊開啟不亂碼、不破欄。',
  },
];

export function ArchitectureView({ config }: ArchitectureViewProps) {
  const [copied, setCopied] = useState(false);

  const pythonCode = useMemo(() => generatePythonScript(config), [config]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  const handleDownloadPy = () => {
    triggerFileDownload(pythonCode, 'zip_to_csv.py', 'text/x-python;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ZIP 轉 CSV 自動化整編架構與本機腳本</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          除直接在上方工作台拖曳處理外，若您有數千份大型壓縮檔需納入排程或本機批次作業，以下呈現完整處理管線設計與即時同步您目前欄位規則的 Python 3 獨立腳本。
        </p>
      </div>

      {/* 5-Stage Pipeline Architecture */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">五階段自動化資料處理管線</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {PIPELINE_STEPS.map((item) => (
            <div key={item.step} className="px-5 py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5">
              <span className="font-mono text-xs font-semibold tabular-nums text-blue-700 shrink-0 w-8">
                {item.step}.
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Synced Python CLI Script */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              同步產生的 Python 3 自動化腳本（zip_to_csv.py）
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              僅使用 Python 內建標準庫，已自動帶入您在「欄位規則設定」所調整的欄位、分隔線與 BOM 選項。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-700">已複製程式碼</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>複製腳本</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadPy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>下載 .py 檔</span>
            </button>
          </div>
        </div>

        <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-[520px]">
          <code>{pythonCode}</code>
        </pre>
      </section>
    </div>
  );
}
