import { useMemo, useState } from 'react';
import { Download, FileJson } from 'lucide-react';
import {
  BatchMeta,
  NavView,
  ParsedRecord,
  ParserConfig,
  RawArchiveFile,
} from './types/parser';
import {
  DEFAULT_PARSER_CONFIG,
  applyDuplicateChecks,
  buildCsvContent,
  buildJsonContent,
  extractFilesFromTxtList,
  extractFilesFromZip,
  parseRawFile,
  triggerFileDownload,
} from './utils/parser';
import { createSampleRawArchive, generateSampleZipBlob } from './utils/sampleArchive';
import { Sidebar } from './components/Sidebar';
import { ImportDropzone } from './components/ImportDropzone';
import { DataGrid } from './components/DataGrid';
import { RecordInspectorDrawer } from './components/RecordInspectorDrawer';
import { SchemaConfigView } from './components/SchemaConfigView';
import { AuditView } from './components/AuditView';
import { ArchitectureView } from './components/ArchitectureView';

const VIEW_TITLES: Record<NavView, string> = {
  workbench: '檔案匯入與整理',
  schema: '欄位規則設定',
  audit: '異常與品質稽核',
  architecture: '自動化架構與腳本',
};

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('workbench');
  const [config, setConfig] = useState<ParserConfig>(DEFAULT_PARSER_CONFIG);
  const [rawFiles, setRawFiles] = useState<RawArchiveFile[]>([]);
  const [manualEdits, setManualEdits] = useState<
    Record<string, { values: Record<string, string>; body: string }>
  >({});
  const [batchMeta, setBatchMeta] = useState<BatchMeta | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Re-parse reactively whenever rawFiles, config, or manual overrides change
  const records: ParsedRecord[] = useMemo(() => {
    const parsed = rawFiles.map((raw) => {
      const base = parseRawFile(raw, config);
      const override = manualEdits[raw.id];
      if (!override) return base;

      const enabledFields = config.fields.filter((f) => f.enabled);
      const nextWarnings: string[] = [];
      let nextStatus: ParsedRecord['status'] = base.dividerFound ? 'valid' : 'warning';

      for (const field of enabledFields) {
        if (field.required && !override.values[field.id]?.trim()) {
          nextWarnings.push(`缺少必要欄位「${field.label}」`);
          nextStatus = 'warning';
        }
      }
      if (!override.body.trim()) {
        nextWarnings.push('內文為空');
        nextStatus = 'warning';
      }
      if (nextWarnings.length === 0) {
        nextStatus = 'valid';
      }

      return {
        ...base,
        values: { ...base.values, ...override.values },
        body: override.body,
        charCount: override.body.length,
        warnings: nextWarnings,
        status: nextStatus,
        isEdited: true,
      };
    });

    return applyDuplicateChecks(parsed);
  }, [rawFiles, config, manualEdits]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  const summaryStats = useMemo(() => {
    let validCount = 0;
    let issueCount = 0;
    let totalBodyChars = 0;
    for (const r of records) {
      if (r.status === 'valid') validCount++;
      else issueCount++;
      totalBodyChars += r.charCount;
    }
    return { validCount, issueCount, totalBodyChars };
  }, [records]);

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const zipFile = files.find((f) => f.name.toLowerCase().endsWith('.zip'));

      if (zipFile) {
        const result = await extractFilesFromZip(zipFile);
        if (result.rawFiles.length === 0) {
          setErrorMessage('此 ZIP 壓縮檔中未找到任何 .txt 文字檔案，請確認壓縮內容。');
          return;
        }
        setRawFiles(result.rawFiles);
        setManualEdits({});
        setBatchMeta({
          archiveName: zipFile.name,
          processedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
          totalEntriesInZip: result.totalEntries,
          skippedEntries: result.skippedEntries,
        });
      } else {
        const result = await extractFilesFromTxtList(files);
        if (result.rawFiles.length === 0) {
          setErrorMessage('請選擇 .zip 壓縮檔或至少一個 .txt 純文字檔案。');
          return;
        }
        setRawFiles(result.rawFiles);
        setManualEdits({});
        setBatchMeta({
          archiveName:
            result.rawFiles.length === 1
              ? result.rawFiles[0].sourceFileName
              : `${result.rawFiles.length} 個文字檔批次`,
          processedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
          totalEntriesInZip: result.totalEntries,
          skippedEntries: result.skippedEntries,
        });
      }
      setActiveView('workbench');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `解壓或讀取失敗：${err.message}`
          : '無法讀取檔案，請確認 ZIP 壓縮檔未損毀且未加密。'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    setErrorMessage(null);
    const sample = createSampleRawArchive();
    setRawFiles(sample.rawFiles);
    setManualEdits({});
    setBatchMeta({
      archiveName: sample.archiveName,
      processedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      totalEntriesInZip: sample.totalEntries,
      skippedEntries: sample.skippedEntries,
    });
    setActiveView('workbench');
  };

  const handleDownloadSampleZip = async () => {
    const blob = await generateSampleZipBlob();
    triggerFileDownload(blob, 'sample_structured_texts.zip', 'application/zip');
  };

  const handleClearAll = () => {
    setRawFiles([]);
    setManualEdits({});
    setBatchMeta(null);
    setSelectedRecordId(null);
    setErrorMessage(null);
  };

  const handleSaveRecordEdits = (
    recordId: string,
    updatedValues: Record<string, string>,
    updatedBody: string
  ) => {
    setManualEdits((prev) => ({
      ...prev,
      [recordId]: { values: updatedValues, body: updatedBody },
    }));
  };

  const handleExportCsv = () => {
    if (records.length === 0) return;
    const csvContent = buildCsvContent(records, config);
    const baseName = (batchMeta?.archiveName || 'structured_archive').replace(/\.zip$/i, '');
    const ext = config.csvDelimiter === '\t' ? 'tsv' : 'csv';
    const mime =
      config.csvDelimiter === '\t'
        ? 'text/tab-separated-values;charset=utf-8'
        : 'text/csv;charset=utf-8';
    triggerFileDownload(csvContent, `${baseName}_整理結果.${ext}`, mime);
  };

  const handleExportJson = () => {
    if (records.length === 0) return;
    const jsonContent = buildJsonContent(records, config);
    const baseName = (batchMeta?.archiveName || 'structured_archive').replace(/\.zip$/i, '');
    triggerFileDownload(jsonContent, `${baseName}_整理結果.json`, 'application/json;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        totalRecords={records.length}
        validCount={summaryStats.validCount}
        issueCount={summaryStats.issueCount}
        batchMeta={batchMeta}
        onDownloadSampleZip={handleDownloadSampleZip}
        onClearAll={handleClearAll}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1–2 primary export actions on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 whitespace-nowrap shrink-0">文檔整編</span>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <h1 className="font-semibold text-slate-900 truncate">
              {VIEW_TITLES[activeView]}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {records.length > 0 && (
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileJson className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>匯出 JSON</span>
              </button>
            )}

            <button
              type="button"
              disabled={records.length === 0}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {config.csvDelimiter === '\t' ? '匯出 TSV 表格' : '匯出 CSV 表格'}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto space-y-6">
          {activeView === 'workbench' && (
            <>
              {records.length === 0 ? (
                <ImportDropzone
                  isProcessing={isProcessing}
                  encodingMode={config.encodingMode}
                  onEncodingChange={(mode) => setConfig((prev) => ({ ...prev, encodingMode: mode }))}
                  onFilesSelected={handleFilesSelected}
                  onLoadSample={handleLoadSample}
                  onDownloadSampleZip={handleDownloadSampleZip}
                  errorMessage={errorMessage}
                />
              ) : (
                <>
                  <ImportDropzone
                    compact
                    isProcessing={isProcessing}
                    encodingMode={config.encodingMode}
                    onEncodingChange={(mode) =>
                      setConfig((prev) => ({ ...prev, encodingMode: mode }))
                    }
                    onFilesSelected={handleFilesSelected}
                    onLoadSample={handleLoadSample}
                    onDownloadSampleZip={handleDownloadSampleZip}
                    errorMessage={errorMessage}
                  />

                  {/* Clean flat metric strip with hairline dividers (zero nested cards) */}
                  <section
                    aria-label="批次解析統計"
                    className="rounded-xl border border-slate-200 bg-white grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
                  >
                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-500">已擷取 TXT 篇數</p>
                      <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
                        {records.length}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate" title={batchMeta?.archiveName}>
                        {batchMeta?.archiveName}
                      </p>
                    </div>

                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-500">欄位完整通過</p>
                      <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-emerald-700">
                        {summaryStats.validCount}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                        合格率 {Math.round((summaryStats.validCount / records.length) * 100)}%
                      </p>
                    </div>

                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-500">待檢核異常</p>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <p
                          className={`text-2xl font-semibold font-mono tabular-nums ${
                            summaryStats.issueCount > 0 ? 'text-amber-700' : 'text-slate-900'
                          }`}
                        >
                          {summaryStats.issueCount}
                        </p>
                        {summaryStats.issueCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveView('audit')}
                            className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                          >
                            前往稽核
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        缺漏欄位、分隔線或編號重複
                      </p>
                    </div>

                    <div className="px-5 py-4">
                      <p className="text-xs text-slate-500">彙總內文總字數</p>
                      <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
                        {summaryStats.totalBodyChars.toLocaleString()}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        輸出編碼：{config.includeBom ? 'UTF-8 BOM' : 'UTF-8'} ·{' '}
                        {config.fields.filter((f) => f.enabled).length +
                          1 +
                          (config.includeSourceFile ? 1 : 0) +
                          (config.includeFolderPath ? 1 : 0)}{' '}
                        欄
                      </p>
                    </div>
                  </section>

                  <DataGrid
                    records={records}
                    config={config}
                    onSelectRecord={(rec) => setSelectedRecordId(rec.id)}
                  />
                </>
              )}
            </>
          )}

          {activeView === 'schema' && (
            <SchemaConfigView
              config={config}
              onChangeConfig={setConfig}
              hasLoadedData={rawFiles.length > 0}
            />
          )}

          {activeView === 'audit' && (
            <AuditView
              records={records}
              batchMeta={batchMeta}
              onInspectRecord={(rec) => setSelectedRecordId(rec.id)}
              onGoToWorkbench={() => setActiveView('workbench')}
            />
          )}

          {activeView === 'architecture' && <ArchitectureView config={config} />}
        </main>
      </div>

      <RecordInspectorDrawer
        record={selectedRecord}
        config={config}
        onClose={() => setSelectedRecordId(null)}
        onSaveEdits={handleSaveRecordEdits}
      />
    </div>
  );
}
