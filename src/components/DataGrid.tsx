import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, ExternalLink, Eye } from 'lucide-react';
import { ParsedRecord, ParserConfig } from '../types/parser';

interface DataGridProps {
  records: ParsedRecord[];
  config: ParserConfig;
  onSelectRecord: (record: ParsedRecord) => void;
}

type StatusFilter = 'all' | 'valid' | 'issue';
type SortKey = 'sourceFileName' | 'code' | 'date' | 'title' | 'charCount';

export function DataGrid({ records, config, onSelectRecord }: DataGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const enabledFields = useMemo(
    () => config.fields.filter((f) => f.enabled),
    [config.fields]
  );

  const counts = useMemo(() => {
    let valid = 0;
    let issue = 0;
    for (const r of records) {
      if (r.status === 'valid') valid++;
      else issue++;
    }
    return { all: records.length, valid, issue };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = records.filter((rec) => {
      if (statusFilter === 'valid' && rec.status !== 'valid') return false;
      if (statusFilter === 'issue' && rec.status === 'valid') return false;
      if (!q) return true;

      if (rec.sourceFileName.toLowerCase().includes(q)) return true;
      if (rec.body.toLowerCase().includes(q)) return true;
      for (const val of Object.values(rec.values)) {
        if (val.toLowerCase().includes(q)) return true;
      }
      return false;
    });

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'charCount') {
        cmp = a.charCount - b.charCount;
      } else if (sortKey === 'sourceFileName') {
        cmp = a.sourceFileName.localeCompare(b.sourceFileName, 'zh-Hant');
      } else {
        const av = a.values[sortKey] ?? '';
        const bv = b.values[sortKey] ?? '';
        cmp = av.localeCompare(bv, 'zh-Hant', { numeric: true });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [records, searchQuery, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 {counts.all}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('valid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'valid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            完整通過 {counts.valid}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('issue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'issue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            待檢核 {counts.issue}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋標題、編號、標籤或內文..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
              <th className="py-2.5 pl-5 pr-3 w-12 text-right font-mono">#</th>
              <th className="py-2.5 px-3 whitespace-nowrap">狀態</th>
              {config.includeSourceFile && (
                <th className="py-2.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('sourceFileName')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>來源檔案</span>
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
              )}
              {enabledFields.map((field) => {
                const isSortable =
                  field.id === 'code' || field.id === 'date' || field.id === 'title';
                return (
                  <th key={field.id} className="py-2.5 px-3 whitespace-nowrap">
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(field.id as SortKey)}
                        className="inline-flex items-center gap-1 hover:text-slate-900"
                      >
                        <span>{field.label}</span>
                        <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    ) : (
                      field.label
                    )}
                  </th>
                );
              })}
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[240px]">
                {config.bodyColumnName || '內文'}摘要
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('charCount')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>內文字數</span>
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              </th>
              <th className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={enabledFields.length + (config.includeSourceFile ? 6 : 5)}
                  className="py-12 text-center text-sm text-slate-500"
                >
                  找不到符合篩選條件的文檔記錄
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const statusLabel =
                  record.status === 'valid'
                    ? '完整'
                    : record.status === 'warning'
                    ? '缺漏'
                    : '格式異常';
                const statusTextClass =
                  record.status === 'valid'
                    ? 'text-emerald-700'
                    : record.status === 'warning'
                    ? 'text-amber-700'
                    : 'text-red-700';

                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelectRecord(record)}
                    className="hover:bg-slate-50/90 cursor-pointer transition-colors align-top"
                  >
                    <td className="py-3 pl-5 pr-3 text-right font-mono text-xs tabular-nums text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${statusTextClass}`}>
                        {statusLabel}
                      </span>
                      {record.isEdited && (
                        <span className="ml-1.5 text-xs text-blue-700">· 已編修</span>
                      )}
                    </td>

                    {config.includeSourceFile && (
                      <td className="py-3 px-3 font-mono text-xs text-slate-600 max-w-[180px] truncate" title={record.sourcePath}>
                        {record.sourceFileName}
                      </td>
                    )}

                    {enabledFields.map((field) => {
                      const val = record.values[field.id] ?? '';
                      const isUrl =
                        field.id.includes('url') ||
                        /^https?:\/\//i.test(val);
                      const isMono = field.id === 'code' || field.id === 'date';

                      if (!val) {
                        return (
                          <td key={field.id} className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                            {field.required ? (
                              <span className="text-amber-700 font-medium">未填寫</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      }

                      if (isUrl) {
                        return (
                          <td key={field.id} className="py-3 px-3 max-w-[180px]">
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs font-mono text-blue-700 hover:underline max-w-full"
                              title={val}
                            >
                              <span className="truncate">{val.replace(/^https?:\/\//i, '')}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                            </a>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={field.id}
                          className={`py-3 px-3 ${
                            isMono
                              ? 'font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap'
                              : field.id === 'title'
                              ? 'font-medium text-slate-900 min-w-[210px] max-w-[280px]'
                              : 'text-xs text-slate-600 max-w-[180px]'
                          }`}
                        >
                          <div className="line-clamp-2" title={val}>
                            {val}
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-xs text-slate-600 max-w-[300px]">
                      <div className="line-clamp-2 leading-relaxed">
                        {record.body || <span className="text-slate-400">無內文</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {record.charCount.toLocaleString()}
                    </td>

                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(record);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>對照</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="tabular-nums">
          顯示 {filteredRecords.length} / {records.length} 筆文檔記錄
        </span>
        <span>點擊任一列即可展開原文對照與即時校正</span>
      </div>
    </div>
  );
}
