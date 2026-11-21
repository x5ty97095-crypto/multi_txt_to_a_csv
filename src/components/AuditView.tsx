import { Eye } from 'lucide-react';
import { BatchMeta, ParsedRecord } from '../types/parser';

interface AuditViewProps {
  records: ParsedRecord[];
  batchMeta: BatchMeta | null;
  onInspectRecord: (record: ParsedRecord) => void;
  onGoToWorkbench: () => void;
}

export function AuditView({
  records,
  batchMeta,
  onInspectRecord,
  onGoToWorkbench,
}: AuditViewProps) {
  const flaggedRecords = records.filter((r) => r.status !== 'valid' || r.warnings.length > 0);
  const skippedEntries = batchMeta?.skippedEntries ?? [];

  if (records.length === 0 && skippedEntries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <h2 className="text-base font-semibold text-slate-900 mb-1.5">尚無可稽核的批次資料</h2>
        <p className="text-sm text-slate-600 mb-5">
          請先匯入 ZIP 壓縮檔或載入範例資料集，系統將自動檢查遺漏欄位、重複編號、缺少分隔線與被略過的非文字檔案。
        </p>
        <button
          type="button"
          onClick={onGoToWorkbench}
          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          前往檔案匯入
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">異常偵測與品質稽核報告</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          匯出 CSV 前檢視缺漏欄位、未切分分隔線、編號重複項目，以及壓縮檔內自動略過的系統或非 TXT 檔案。
        </p>
      </div>

      {/* Flagged TXT Records */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            待檢核文字檔（<span className="font-mono tabular-nums">{flaggedRecords.length}</span> 篇）
          </h3>
          <span className="text-xs text-slate-500">點擊「檢視並修訂」可直接補齊欄位</span>
        </div>

        {flaggedRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-700 font-medium">
            所有 {records.length} 篇文字檔均通過必要欄位、分隔線與編號唯一性檢查。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pl-5 pr-3 whitespace-nowrap">嚴重度</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">來源檔案</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">編號</th>
                  <th className="py-2.5 px-3">偵測到的問題說明</th>
                  <th className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {flaggedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pl-5 pr-3 whitespace-nowrap text-xs font-medium">
                      <span className={rec.status === 'error' ? 'text-red-700' : 'text-amber-700'}>
                        {rec.status === 'error' ? '格式異常' : '欄位缺漏'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {rec.sourcePath}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {rec.values['code'] || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700">
                      {rec.warnings.join(' · ')}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectRecord(rec)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>檢視並修訂</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Skipped ZIP entries */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            壓縮檔內自動略過項目（<span className="font-mono tabular-nums">{skippedEntries.length}</span> 件）
          </h3>
          <span className="text-xs text-slate-500">不會寫入最終 CSV 表格</span>
        </div>

        {skippedEntries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            此壓縮檔中沒有被略過的系統隱藏檔或非 TXT 項目。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pl-5 pr-3">壓縮檔內路徑</th>
                  <th className="py-2.5 pl-3 pr-5">略過原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {skippedEntries.map((entry, idx) => (
                  <tr key={`${entry.path}-${idx}`}>
                    <td className="py-2.5 pl-5 pr-3 font-mono text-slate-700">{entry.path}</td>
                    <td className="py-2.5 pl-3 pr-5 text-slate-500">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
