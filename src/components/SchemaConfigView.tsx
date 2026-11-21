import { useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, RotateCcw } from 'lucide-react';
import {
  BodyNewlineMode,
  CsvDelimiter,
  EncodingMode,
  FieldRule,
  ParserConfig,
} from '../types/parser';
import { DEFAULT_PARSER_CONFIG } from '../utils/parser';

interface SchemaConfigViewProps {
  config: ParserConfig;
  onChangeConfig: (next: ParserConfig) => void;
  hasLoadedData: boolean;
}

export function SchemaConfigView({
  config,
  onChangeConfig,
  hasLoadedData,
}: SchemaConfigViewProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newAliases, setNewAliases] = useState('');

  const updateField = (index: number, patch: Partial<FieldRule>) => {
    const nextFields = config.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChangeConfig({ ...config, fields: nextFields });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.fields.length) return;
    const nextFields = [...config.fields];
    const [item] = nextFields.splice(index, 1);
    nextFields.splice(target, 0, item);
    onChangeConfig({ ...config, fields: nextFields });
  };

  const removeField = (index: number) => {
    const nextFields = config.fields.filter((_, i) => i !== index);
    onChangeConfig({ ...config, fields: nextFields });
  };

  const handleAddField = () => {
    const cleanLabel = newLabel.trim();
    if (!cleanLabel) return;
    const aliases = newAliases
      .split(/[,，/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const mergedAliases = aliases.length > 0 ? aliases : [cleanLabel];
    const nextField: FieldRule = {
      id: `custom_${Date.now()}`,
      label: cleanLabel,
      keyAliases: mergedAliases,
      required: false,
      enabled: true,
    };
    onChangeConfig({ ...config, fields: [...config.fields, nextField] });
    setNewLabel('');
    setNewAliases('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">欄位解析與 CSV 輸出規則</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            調整標頭鍵名對應、分隔線規則與匯出編碼；{hasLoadedData ? '修改後會即時重新解析已載入的檔案。' : '匯入 ZIP 檔案時將自動套用此組規則。'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChangeConfig(DEFAULT_PARSER_CONFIG)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>恢復預設規範</span>
        </button>
      </div>

      {/* Header Fields Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">標頭欄位順序與別名對應</h3>
          <span className="text-xs text-slate-500">冒號前後空白與全半形（：/ :）會自動相容</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 pl-5 pr-3 w-16">啟用</th>
                <th className="py-2.5 px-3 w-44">CSV 輸出欄名</th>
                <th className="py-2.5 px-3">TXT 標頭鍵名別名（逗號分隔）</th>
                <th className="py-2.5 px-3 w-24 text-center">必填檢核</th>
                <th className="py-2.5 pl-3 pr-5 w-28 text-right">排序 / 移除</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {config.fields.map((field, index) => (
                <tr key={field.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pl-5 pr-3">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(e) => updateField(index, { enabled: e.target.checked })}
                      aria-label={`啟用 ${field.label}`}
                      className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={field.keyAliases.join(', ')}
                      onChange={(e) =>
                        updateField(index, {
                          keyAliases: e.target.value
                            .split(/[,，]/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      aria-label={`${field.label} 為必填欄位`}
                      className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveField(index, -1)}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                        aria-label="上移欄位"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === config.fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                        aria-label="下移欄位"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-700"
                        aria-label="移除欄位"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="新增欄名（例如：作者）"
            className="w-44 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="text"
            value={newAliases}
            onChange={(e) => setNewAliases(e.target.value)}
            placeholder="對應 TXT 鍵名別名（選填，逗號分隔）"
            className="flex-1 min-w-[200px] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="button"
            onClick={handleAddField}
            disabled={!newLabel.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>新增欄位</span>
          </button>
        </div>
      </section>

      {/* Divider, Body & CSV Serialization Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">標頭與內文切分規則</h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              分隔線正則表達式（Divider Pattern）
            </label>
            <input
              type="text"
              value={config.dividerPattern}
              onChange={(e) => onChangeConfig({ ...config, dividerPattern: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              預設 <code className="font-mono text-slate-700">^=&#123;10,&#125;\s*$</code> 可相容 10 個以上等號組成的分隔線（包含標準 40 個等號）。
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              內文欄位輸出名稱
            </label>
            <input
              type="text"
              value={config.bodyColumnName}
              onChange={(e) => onChangeConfig({ ...config, bodyColumnName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              內文換行處理方式
            </label>
            <select
              value={config.bodyNewlineMode}
              onChange={(e) =>
                onChangeConfig({ ...config, bodyNewlineMode: e.target.value as BodyNewlineMode })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="preserve">保留原始段落換行（RFC 4180 儲存格內換行，建議）</option>
              <option value="space">合併為單行（換行改為空白字元）</option>
              <option value="literal">轉為明文跳脫符號（\n）</option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={config.trimBodyWhitespace}
              onChange={(e) =>
                onChangeConfig({ ...config, trimBodyWhitespace: e.target.checked })
              }
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              自動清除內文開頭與結尾多餘空行
            </span>
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">來源追蹤與 CSV 相容設定</h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              來源文字檔編碼解讀策略
            </label>
            <select
              value={config.encodingMode}
              onChange={(e) =>
                onChangeConfig({ ...config, encodingMode: e.target.value as EncodingMode })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="auto">自動偵測（依序嘗試 UTF-8 → Big5 → GB18030）</option>
              <option value="utf-8">強制使用 UTF-8</option>
              <option value="big5">強制使用 Big5（傳統繁體中文）</option>
              <option value="gb18030">強制使用 GB18030</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              表格分隔符號
            </label>
            <select
              value={config.csvDelimiter}
              onChange={(e) =>
                onChangeConfig({ ...config, csvDelimiter: e.target.value as CsvDelimiter })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value=",">標準逗號分隔（.csv）</option>
              <option value={'\t'}>Tab 定位字元分隔（.tsv）</option>
            </select>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeBom}
                onChange={(e) => onChangeConfig({ ...config, includeBom: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                寫入 UTF-8 BOM 檔頭（強烈建議開啟，防止 Microsoft Excel 開啟中文 CSV 出現亂碼）
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeSourceFile}
                onChange={(e) =>
                  onChangeConfig({ ...config, includeSourceFile: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                附帶「來源檔案」欄位，便於事後回溯原始 TXT 檔名
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeFolderPath}
                onChange={(e) =>
                  onChangeConfig({ ...config, includeFolderPath: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                附帶「所屬資料夾」欄位，保留 ZIP 內部的子目錄分類結構
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.captureExtraHeaders}
                onChange={(e) =>
                  onChangeConfig({ ...config, captureExtraHeaders: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                自動將未列於上方規則的額外標頭鍵值動態擴充為 CSV 欄位
              </span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
