import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { ParsedRecord, ParserConfig } from '../types/parser';

interface RecordInspectorDrawerProps {
  record: ParsedRecord | null;
  config: ParserConfig;
  onClose: () => void;
  onSaveEdits: (recordId: string, updatedValues: Record<string, string>, updatedBody: string) => void;
}

export function RecordInspectorDrawer({
  record,
  config,
  onClose,
  onSaveEdits,
}: RecordInspectorDrawerProps) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftBody, setDraftBody] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (record) {
      setDraftValues({ ...record.values });
      setDraftBody(record.body);
      setSavedNotice(false);
    }
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [record, onClose]);

  if (!record) return null;

  const enabledFields = config.fields.filter((f) => f.enabled);
  const rawLines = record.rawText.split('\n');

  const handleSave = () => {
    onSaveEdits(record.id, draftValues, draftBody);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="原文與解析欄位對照"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white h-full flex flex-col border-l border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {record.sourceFileName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
              <span>{record.sourcePath}</span>
              <span aria-hidden="true">·</span>
              <span>編碼：{record.detectedEncoding}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{record.lineCount} 行</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="關閉對照視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {record.warnings.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
            <span className="font-semibold mr-2">解析提醒：</span>
            <span>{record.warnings.join(' · ')}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          {/* Left Pane: Raw TXT */}
          <div className="flex flex-col min-h-0 bg-slate-50/70">
            <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600 shrink-0">
              <span>原始 TXT 全文</span>
              <span className="font-mono tabular-nums text-slate-500">
                {record.dividerFound
                  ? `分隔線位於第 ${record.dividerLineIndex + 1} 行`
                  : '未偵測到分隔線'}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
              {rawLines.map((line, i) => {
                const isDivider = record.dividerFound && i === record.dividerLineIndex;
                return (
                  <div
                    key={i}
                    className={`flex gap-3 px-2 py-0.5 rounded-xs ${
                      isDivider ? 'bg-blue-100/80 text-blue-900 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="w-7 text-right text-slate-400 select-none shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Structured Fields Editor */}
          <div className="flex flex-col min-h-0 bg-white">
            <div className="px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600 shrink-0">
              <span>擷取欄位預覽（可直接修訂並同步至 CSV）</span>
              {savedNotice && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  已更新至匯出表格
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              {enabledFields.map((field) => (
                <div key={field.id}>
                  <label className="flex items-baseline justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>
                      {field.label}
                      {field.required && <span className="text-amber-700 ml-1">*</span>}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      對應鍵名：{field.keyAliases.join(' / ')}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={draftValues[field.id] ?? ''}
                    onChange={(e) =>
                      setDraftValues((prev) => ({
                        ...prev,
                        [field.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              ))}

              {Object.keys(record.extraHeaders).length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    額外偵測到的標頭鍵值（非預設欄位）
                  </p>
                  <dl className="space-y-1 text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {Object.entries(record.extraHeaders).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="font-semibold text-slate-800 shrink-0">{k}：</dt>
                        <dd className="break-all">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div>
                <label className="flex items-baseline justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>{config.bodyColumnName || '內文'}</span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    {draftBody.length.toLocaleString()} 字元
                  </span>
                </label>
                <textarea
                  rows={10}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                關閉
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                套用欄位修訂
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
