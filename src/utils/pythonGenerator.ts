import { ParserConfig } from '../types/parser';

export function generatePythonScript(config: ParserConfig): string {
  const enabledFields = config.fields.filter((f) => f.enabled);
  const fieldDefs = enabledFields
    .map((f) => {
      const aliases = Array.from(new Set([f.label, ...f.keyAliases]))
        .map((a) => JSON.stringify(a))
        .join(', ');
      return `    (${JSON.stringify(f.label)}, [${aliases}]),`;
    })
    .join('\n');

  const bodyCol = JSON.stringify(config.bodyColumnName.trim() || '內文');
  const dividerPattern = JSON.stringify(config.dividerPattern.trim() || '^={10,}\\s*$');
  const encodingPy = config.includeBom ? 'utf-8-sig' : 'utf-8';
  const delimiterPy = config.csvDelimiter === '\t' ? '\\t' : ',';

  const bodyTransformCode =
    config.bodyNewlineMode === 'space'
      ? `    body = re.sub(r"\\s*\\n+\\s*", " ", body).strip()`
      : config.bodyNewlineMode === 'literal'
      ? `    body = body.replace("\\n", "\\\\n")`
      : config.trimBodyWhitespace
      ? `    body = body.strip()`
      : `    # 保留原始內文換行與空白`;

  return `#!/usr/bin/env python3
"""
ZIP 批量規範 TXT 轉結構化 CSV 自動整編腳本
僅使用 Python 標準函式庫（zipfile, csv, re, pathlib），免安裝第三方套件。

使用方式：
    python zip_to_csv.py input_archive.zip output_table.csv
"""

import csv
import re
import sys
import zipfile
from pathlib import Path

# 欄位定義：(輸出 CSV 欄名, 對應標頭鍵名別名列表)
FIELD_RULES = [
${fieldDefs}
]

BODY_COLUMN = ${bodyCol}
DIVIDER_REGEX = re.compile(r${dividerPattern})
INCLUDE_SOURCE_FILE = ${config.includeSourceFile ? 'True' : 'False'}
INCLUDE_FOLDER_PATH = ${config.includeFolderPath ? 'True' : 'False'}

# 自動編碼偵測順序（相容 UTF-8 BOM、繁體 Big5、簡體 GB18030）
ENCODING_CANDIDATES = ("utf-8-sig", "utf-8", "cp950", "big5", "gb18030")


def decode_bytes(raw: bytes) -> str:
    for enc in ENCODING_CANDIDATES:
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def parse_txt_content(text: str) -> dict[str, str]:
    normalized = text.replace("\\r\\n", "\\n").replace("\\r", "\\n")
    lines = normalized.split("\\n")

    divider_idx = next(
        (i for i, line in enumerate(lines) if DIVIDER_REGEX.match(line.strip())),
        -1,
    )

    header_lines = lines[:divider_idx] if divider_idx != -1 else lines
    body_lines = lines[divider_idx + 1 :] if divider_idx != -1 else []

    alias_map: dict[str, str] = {}
    record: dict[str, str] = {}
    for col_name, aliases in FIELD_RULES:
        record[col_name] = ""
        for alias in aliases:
            alias_map[alias.strip().lower()] = col_name

    kv_pattern = re.compile(r"^\\s*([^:：\\n]{1,40}?)\\s*[：:]\\s*(.*)$")
    last_col: str | None = None

    for raw_line in header_lines:
        stripped = raw_line.strip()
        if not stripped:
            continue
        match = kv_pattern.match(raw_line)
        if match:
            key, val = match.group(1).strip(), match.group(2).strip()
            target_col = alias_map.get(key.lower())
            if target_col:
                record[target_col] = (
                    f"{record[target_col]} {val}".strip() if record[target_col] else val
                )
                last_col = target_col
            elif key.lower() in ("http", "https") and last_col:
                record[last_col] = f"{record[last_col]}\\n{stripped}".strip()
        elif last_col:
            record[last_col] = f"{record[last_col]}\\n{stripped}".strip()

    body = "\\n".join(body_lines)
${bodyTransformCode}
    record[BODY_COLUMN] = body
    return record


def should_skip_entry(entry_path: str) -> bool:
    name = Path(entry_path).name
    if entry_path.endswith("/"):
        return True
    if "__MACOSX" in entry_path.split("/") or name.startswith("._") or name == ".DS_Store":
        return True
    return not name.lower().endswith(".txt")


def convert_zip_to_csv(zip_path: Path, output_csv: Path) -> None:
    columns: list[str] = []
    if INCLUDE_SOURCE_FILE:
        columns.append("來源檔案")
    if INCLUDE_FOLDER_PATH:
        columns.append("所屬資料夾")
    columns.extend(col for col, _ in FIELD_RULES)
    columns.append(BODY_COLUMN)

    rows: list[dict[str, str]] = []
    skipped = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in sorted(zf.infolist(), key=lambda x: x.filename):
            if should_skip_entry(info.filename):
                skipped += 1
                continue
            raw_bytes = zf.read(info.filename)
            text = decode_bytes(raw_bytes)
            parsed = parse_txt_content(text)
            if INCLUDE_SOURCE_FILE:
                parsed["來源檔案"] = Path(info.filename).name
            if INCLUDE_FOLDER_PATH:
                parent = str(Path(info.filename).parent)
                parsed["所屬資料夾"] = "" if parent == "." else parent
            rows.append(parsed)

    # 使用 ${encodingPy} 與 QUOTE_MINIMAL 確保 Excel 開啟繁體中文不亂碼，且多行內文不破版
    with output_csv.open("w", encoding="${encodingPy}", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=columns,
            delimiter="${delimiterPy}",
            quoting=csv.QUOTE_MINIMAL,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"完成匯出：{output_csv}（共整理 {len(rows)} 篇 TXT，略過 {skipped} 個非目標項目）")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python zip_to_csv.py <來源.zip> [輸出.csv]")
        sys.exit(1)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) >= 3 else src.with_suffix(".csv")
    convert_zip_to_csv(src, dst)
`;
}
