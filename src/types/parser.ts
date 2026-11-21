export type EncodingMode = 'auto' | 'utf-8' | 'big5' | 'gb18030';
export type BodyNewlineMode = 'preserve' | 'space' | 'literal';
export type CsvDelimiter = ',' | '\t';
export type RecordStatus = 'valid' | 'warning' | 'error';
export type NavView = 'workbench' | 'schema' | 'audit' | 'architecture';

export interface FieldRule {
  id: string;
  label: string;
  keyAliases: string[];
  required: boolean;
  enabled: boolean;
}

export interface ParserConfig {
  fields: FieldRule[];
  bodyColumnName: string;
  dividerPattern: string;
  encodingMode: EncodingMode;
  includeSourceFile: boolean;
  includeFolderPath: boolean;
  bodyNewlineMode: BodyNewlineMode;
  trimBodyWhitespace: boolean;
  includeBom: boolean;
  csvDelimiter: CsvDelimiter;
  captureExtraHeaders: boolean;
}

export interface RawArchiveFile {
  id: string;
  sourceFileName: string;
  sourcePath: string;
  folderPath: string;
  rawBytes: Uint8Array;
}

export interface ParsedRecord {
  id: string;
  sourceFileName: string;
  sourcePath: string;
  folderPath: string;
  detectedEncoding: string;
  rawText: string;
  headerText: string;
  dividerFound: boolean;
  dividerLineIndex: number;
  values: Record<string, string>;
  extraHeaders: Record<string, string>;
  body: string;
  status: RecordStatus;
  warnings: string[];
  charCount: number;
  lineCount: number;
  isEdited?: boolean;
}

export interface SkippedEntry {
  path: string;
  reason: string;
}

export interface BatchMeta {
  archiveName: string;
  processedAt: string;
  totalEntriesInZip: number;
  skippedEntries: SkippedEntry[];
}
