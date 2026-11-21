import {
  FileArchive,
  SlidersHorizontal,
  ShieldAlert,
  Workflow,
  FileDown,
  RotateCcw,
} from 'lucide-react';
import { BatchMeta, NavView } from '../types/parser';

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  totalRecords: number;
  validCount: number;
  issueCount: number;
  batchMeta: BatchMeta | null;
  onDownloadSampleZip: () => void;
  onClearAll: () => void;
}

const NAV_ITEMS: Array<{
  id: NavView;
  label: string;
  icon: typeof FileArchive;
}> = [
  { id: 'workbench', label: '檔案匯入與整理', icon: FileArchive },
  { id: 'schema', label: '欄位規則設定', icon: SlidersHorizontal },
  { id: 'audit', label: '異常與品質稽核', icon: ShieldAlert },
  { id: 'architecture', label: '自動化架構與腳本', icon: Workflow },
];

export function Sidebar({
  activeView,
  onSelectView,
  totalRecords,
  validCount,
  issueCount,
  batchMeta,
  onDownloadSampleZip,
  onClearAll,
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between">
      <div>
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            文檔整編工作台
          </span>
        </div>

        <nav className="p-4 flex lg:flex-col gap-1 overflow-x-auto" aria-label="主要功能導覽">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'audit' && issueCount > 0 && (
                  <span className="font-mono text-xs tabular-nums text-amber-700 font-semibold">
                    {issueCount}
                  </span>
                )}
                {item.id === 'workbench' && totalRecords > 0 && (
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {totalRecords}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {batchMeta && (
          <div className="hidden lg:block px-6 py-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">目前批次摘要</p>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500 shrink-0">來源壓縮檔</dt>
                <dd
                  className="font-mono text-slate-800 truncate max-w-[130px]"
                  title={batchMeta.archiveName}
                >
                  {batchMeta.archiveName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500">已解析篇數</dt>
                <dd className="font-mono tabular-nums text-slate-900 font-medium">
                  {totalRecords} 篇
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500">欄位完整</dt>
                <dd className="font-mono tabular-nums text-emerald-700 font-medium">
                  {validCount} 篇
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500">待檢核項目</dt>
                <dd
                  className={`font-mono tabular-nums font-medium ${
                    issueCount > 0 ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  {issueCount} 篇
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500">略過非文字檔</dt>
                <dd className="font-mono tabular-nums text-slate-600">
                  {batchMeta.skippedEntries.length} 件
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onDownloadSampleZip}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
        >
          <FileDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>下載範例 .zip 測試檔</span>
        </button>

        {totalRecords > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>清空目前資料</span>
          </button>
        )}
      </div>
    </aside>
  );
}
