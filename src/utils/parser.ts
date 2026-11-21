import JSZip from 'jszip';
import {
  EncodingMode,
  FieldRule,
  ParsedRecord,
  ParserConfig,
  RawArchiveFile,
  RecordStatus,
  SkippedEntry,
} from '../types/parser';

export const DEFAULT_FIELDS: FieldRule[] = [
  { id: 'title', label: '標題', keyAliases: ['標題', 'Title', '題目'], required: true, enabled: true },
  { id: 'code', label: '編號', keyAliases: ['編號', 'ID', '序號'], required: true, enabled: true },
  { id: 'date', label: '日期', keyAliases: ['日期', '發布日期', 'Date'], required: true, enabled: true },
  { id: 'tags', label: '標籤', keyAliases: ['標籤', '分類標籤', 'Tags'], required: false, enabled: true },
  { id: 'source_url', label: '原始網址', keyAliases: ['原始網址', '來源網址', '網址', 'URL'], required: true, enabled: true },
  { id: 'video_url', label: '影片嵌入網址', keyAliases: ['影片嵌入網址', '嵌入網址', '影片網址'], required: false, enabled: true },
];

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  fields: DEFAULT_FIELDS,
  bodyColumnName: '內文',
  dividerPattern: '^={10,}\\s*$',
  encodingMode: 'auto',
  includeSourceFile: true,
  includeFolderPath: false,
  bodyNewlineMode: 'preserve',
  trimBodyWhitespace: true,
  includeBom: true,
  csvDelimiter: ',',
  captureExtraHeaders: false,
};

export function decodeBytes(
  bytes: Uint8Array,
  mode: EncodingMode
): { text: string; encoding: string } {
  // Check UTF-8 BOM explicitly
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder('utf-8');
    return { text: decoder.decode(bytes.subarray(3)), encoding: 'UTF-8 (BOM)' };
  }

  // Check UTF-16 LE/BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'UTF-16LE' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'UTF-16BE' };
  }

  if (mode !== 'auto') {
    const labelMap: Record<Exclude<EncodingMode, 'auto'>, string> = {
      'utf-8': 'UTF-8',
      big5: 'Big5',
      gb18030: 'GB18030',
    };
    const decoder = new TextDecoder(mode, { fatal: false });
    return { text: decoder.decode(bytes), encoding: labelMap[mode] };
  }

  // Auto-detect cascade: strict UTF-8 -> strict Big5 -> strict GB18030 -> lenient UTF-8
  const candidates: Array<{ enc: string; display: string }> = [
    { enc: 'utf-8', display: 'UTF-8' },
    { enc: 'big5', display: 'Big5' },
    { enc: 'gb18030', display: 'GB18030' },
  ];

  for (const candidate of candidates) {
    try {
      const decoder = new TextDecoder(candidate.enc, { fatal: true });
      const text = decoder.decode(bytes);
      return { text, encoding: candidate.display };
    } catch {
      // Try next encoding
    }
  }

  return { text: new TextDecoder('utf-8', { fatal: false }).decode(bytes), encoding: 'UTF-8 (相容模式)' };
}

function buildDividerRegex(pattern: string): RegExp {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return /^={10,}\s*$/;
  }
  try {
    return new RegExp(trimmed);
  } catch {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}\\s*$`);
  }
}

export function parseRawFile(rawFile: RawArchiveFile, config: ParserConfig): ParsedRecord {
  const { text: decodedText, encoding } = decodeBytes(rawFile.rawBytes, config.encodingMode);
  const normalizedText = decodedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');

  const dividerRegex = buildDividerRegex(config.dividerPattern);
  const dividerLineIndex = lines.findIndex((line) => dividerRegex.test(line.trim()));
  const dividerFound = dividerLineIndex !== -1;

  const headerLines = dividerFound ? lines.slice(0, dividerLineIndex) : lines;
  const bodyLines = dividerFound ? lines.slice(dividerLineIndex + 1) : [];

  const headerText = headerLines.join('\n');
  const rawBody = bodyLines.join('\n');
  const body = config.trimBodyWhitespace ? rawBody.trim() : rawBody;

  const enabledFields = config.fields.filter((f) => f.enabled);
  const values: Record<string, string> = {};
  for (const field of enabledFields) {
    values[field.id] = '';
  }

  // Build alias lookup (normalized without spaces)
  const aliasToFieldId = new Map<string, string>();
  for (const field of enabledFields) {
    aliasToFieldId.set(field.label.trim().toLowerCase(), field.id);
    for (const alias of field.keyAliases) {
      const clean = alias.trim().toLowerCase();
      if (clean) {
        aliasToFieldId.set(clean, field.id);
      }
    }
  }

  const extraHeaders: Record<string, string> = {};
  let lastMatchedKey: { type: 'field'; id: string } | { type: 'extra'; key: string } | null = null;

  for (const rawLine of headerLines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Match key + full-width or half-width colon + value
    const kvMatch = rawLine.match(/^\s*([^:：\n]{1,40}?)\s*[：:]\s*(.*)$/);
    if (kvMatch) {
      const rawKey = kvMatch[1].trim();
      const rawVal = kvMatch[2].trim();
      const fieldId = aliasToFieldId.get(rawKey.toLowerCase());

      if (fieldId) {
        values[fieldId] = values[fieldId] ? `${values[fieldId]} ${rawVal}`.trim() : rawVal;
        lastMatchedKey = { type: 'field', id: fieldId };
      } else {
        // Avoid misidentifying URLs on continuation lines (e.g. https://...)
        if (/^https?$/i.test(rawKey) && lastMatchedKey) {
          if (lastMatchedKey.type === 'field') {
            values[lastMatchedKey.id] = `${values[lastMatchedKey.id]}\n${line}`.trim();
          } else {
            extraHeaders[lastMatchedKey.key] = `${extraHeaders[lastMatchedKey.key]}\n${line}`.trim();
          }
        } else {
          extraHeaders[rawKey] = rawVal;
          lastMatchedKey = { type: 'extra', key: rawKey };
        }
      }
    } else if (lastMatchedKey) {
      // Continuation line of previous header field
      if (lastMatchedKey.type === 'field') {
        values[lastMatchedKey.id] = `${values[lastMatchedKey.id]}\n${line}`.trim();
      } else {
        extraHeaders[lastMatchedKey.key] = `${extraHeaders[lastMatchedKey.key]}\n${line}`.trim();
      }
    }
  }

  const warnings: string[] = [];
  let status: RecordStatus = 'valid';

  if (!dividerFound) {
    warnings.push('找不到分隔線（========），無法自動切分內文區塊');
    status = 'error';
  }

  for (const field of enabledFields) {
    if (field.required && !values[field.id]?.trim()) {
      warnings.push(`缺少必要欄位「${field.label}」`);
      if (status !== 'error') {
        status = 'warning';
      }
    }
  }

  if (dividerFound && !body.trim()) {
    warnings.push('分隔線後方內文為空');
    if (status === 'valid') {
      status = 'warning';
    }
  }

  return {
    id: rawFile.id,
    sourceFileName: rawFile.sourceFileName,
    sourcePath: rawFile.sourcePath,
    folderPath: rawFile.folderPath,
    detectedEncoding: encoding,
    rawText: normalizedText,
    headerText,
    dividerFound,
    dividerLineIndex,
    values,
    extraHeaders,
    body,
    status,
    warnings,
    charCount: body.length,
    lineCount: lines.length,
  };
}

export function applyDuplicateChecks(records: ParsedRecord[]): ParsedRecord[] {
  const codeCount = new Map<string, number>();
  for (const record of records) {
    const code = record.values['code']?.trim();
    if (code) {
      codeCount.set(code, (codeCount.get(code) ?? 0) + 1);
    }
  }

  return records.map((record) => {
    const code = record.values['code']?.trim();
    const cleanedWarnings = record.warnings.filter((w) => !w.startsWith('編號重複'));
    if (code && (codeCount.get(code) ?? 0) > 1) {
      cleanedWarnings.push(`編號重複（${code} 出現 ${codeCount.get(code)} 次）`);
      return {
        ...record,
        warnings: cleanedWarnings,
        status: record.status === 'error' ? 'error' : 'warning',
      };
    }
    return {
      ...record,
      warnings: cleanedWarnings,
    };
  });
}

export async function extractFilesFromZip(file: File): Promise<{
  rawFiles: RawArchiveFile[];
  skippedEntries: SkippedEntry[];
  totalEntries: number;
}> {
  const zip = await JSZip.loadAsync(file);
  const rawFiles: RawArchiveFile[] = [];
  const skippedEntries: SkippedEntry[] = [];
  let totalEntries = 0;

  const entryPaths = Object.keys(zip.files).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  for (const entryPath of entryPaths) {
    const entry = zip.files[entryPath];
    if (entry.dir) continue;
    totalEntries += 1;

    const segments = entryPath.split('/');
    const fileName = segments[segments.length - 1] || entryPath;
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

    // Skip macOS archive metadata and hidden system files
    if (
      entryPath.startsWith('__MACOSX/') ||
      entryPath.includes('/__MACOSX/') ||
      fileName === '.DS_Store' ||
      fileName.startsWith('._') ||
      fileName.toLowerCase() === 'thumbs.db'
    ) {
      skippedEntries.push({ path: entryPath, reason: '系統隱藏或 macOS 中繼檔案' });
      continue;
    }

    if (!fileName.toLowerCase().endsWith('.txt')) {
      skippedEntries.push({ path: entryPath, reason: '非 .txt 純文字檔案' });
      continue;
    }

    const rawBytes = await entry.async('uint8array');
    rawFiles.push({
      id: `${entryPath}-${rawFiles.length}-${Date.now()}`,
      sourceFileName: fileName,
      sourcePath: entryPath,
      folderPath,
      rawBytes,
    });
  }

  return { rawFiles, skippedEntries, totalEntries };
}

export async function extractFilesFromTxtList(files: File[]): Promise<{
  rawFiles: RawArchiveFile[];
  skippedEntries: SkippedEntry[];
  totalEntries: number;
}> {
  const rawFiles: RawArchiveFile[] = [];
  const skippedEntries: SkippedEntry[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.name.toLowerCase().endsWith('.txt')) {
      skippedEntries.push({ path: file.name, reason: '非 .txt 純文字檔案' });
      continue;
    }
    const buffer = await file.arrayBuffer();
    rawFiles.push({
      id: `${file.name}-${i}-${Date.now()}`,
      sourceFileName: file.name,
      sourcePath: file.name,
      folderPath: '',
      rawBytes: new Uint8Array(buffer),
    });
  }

  return { rawFiles, skippedEntries, totalEntries: files.length };
}

function escapeCsvCell(value: string, delimiter: string): string {
  const safe = value ?? '';
  const needsQuotes =
    safe.includes(delimiter) ||
    safe.includes('"') ||
    safe.includes('\n') ||
    safe.includes('\r');

  if (!needsQuotes) {
    return safe;
  }
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatBodyForExport(body: string, mode: ParserConfig['bodyNewlineMode']): string {
  if (mode === 'space') {
    return body.replace(/\s*\n+\s*/g, ' ').trim();
  }
  if (mode === 'literal') {
    return body.replace(/\n/g, '\\n');
  }
  return body;
}

export function getExtraHeaderKeys(records: ParsedRecord[]): string[] {
  const keySet = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record.extraHeaders)) {
      keySet.add(key);
    }
  }
  return Array.from(keySet);
}

export function buildCsvContent(records: ParsedRecord[], config: ParserConfig): string {
  const enabledFields = config.fields.filter((f) => f.enabled);
  const extraKeys = config.captureExtraHeaders ? getExtraHeaderKeys(records) : [];
  const delimiter = config.csvDelimiter;

  const headerRow: string[] = [];
  if (config.includeSourceFile) headerRow.push('來源檔案');
  if (config.includeFolderPath) headerRow.push('所屬資料夾');
  for (const field of enabledFields) {
    headerRow.push(field.label);
  }
  for (const extraKey of extraKeys) {
    headerRow.push(extraKey);
  }
  headerRow.push(config.bodyColumnName.trim() || '內文');

  const lines: string[] = [headerRow.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)];

  for (const record of records) {
    const row: string[] = [];
    if (config.includeSourceFile) row.push(record.sourceFileName);
    if (config.includeFolderPath) row.push(record.folderPath);
    for (const field of enabledFields) {
      row.push(record.values[field.id] ?? '');
    }
    for (const extraKey of extraKeys) {
      row.push(record.extraHeaders[extraKey] ?? '');
    }
    row.push(formatBodyForExport(record.body, config.bodyNewlineMode));

    lines.push(row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter));
  }

  const csvBody = lines.join('\r\n');
  return config.includeBom ? `\uFEFF${csvBody}` : csvBody;
}

export function buildJsonContent(records: ParsedRecord[], config: ParserConfig): string {
  const enabledFields = config.fields.filter((f) => f.enabled);
  const extraKeys = config.captureExtraHeaders ? getExtraHeaderKeys(records) : [];
  const bodyCol = config.bodyColumnName.trim() || '內文';

  const output = records.map((record) => {
    const obj: Record<string, string> = {};
    if (config.includeSourceFile) obj['來源檔案'] = record.sourceFileName;
    if (config.includeFolderPath) obj['所屬資料夾'] = record.folderPath;
    for (const field of enabledFields) {
      obj[field.label] = record.values[field.id] ?? '';
    }
    for (const extraKey of extraKeys) {
      obj[extraKey] = record.extraHeaders[extraKey] ?? '';
    }
    obj[bodyCol] = formatBodyForExport(record.body, config.bodyNewlineMode);
    return obj;
  });

  return JSON.stringify(output, null, 2);
}

export function triggerFileDownload(content: string | Blob, fileName: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
