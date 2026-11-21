import JSZip from 'jszip';
import { RawArchiveFile, SkippedEntry } from '../types/parser';

interface SampleDoc {
  path: string;
  content: string;
}

const SAMPLE_DOCS: SampleDoc[] = [
  {
    path: '2026_Q1/DOC-2026-001_太陽能微電網佈建紀實.txt',
    content: `標題：偏鄉太陽能微電網佈建紀實與儲能調度分析
編號：ARC-2026-001
日期：2026-01-14
標籤：再生能源, 微電網, 基礎建設
原始網址：https://archive.example.org/reports/arc-2026-001
影片嵌入網址：https://www.youtube.com/embed/microgrid2026a
========================================
本案紀錄東部山區三處聚落於冬季日照縮減期間的微電網運轉數據。
透過磷酸鐵鋰儲能櫃與智慧逆變器協同運作，系統在連續陰雨 72 小時後仍維持 98.4% 供電穩定度。

現場訪談摘要：
「過去只要颱風過境，停電動輒三天，現在醫療站與通訊基地台都能全天候不斷電。」—— 當地巡檢組長陳先生。

後續建議於第二期工程增設高空風速感測節點，並將異常告警直接串接至區域維運中心。`,
  },
  {
    path: '2026_Q1/DOC-2026-002_古建築木構數位測繪.txt',
    content: `標題：百年書院大木構架三維雷射掃描與榫卯建檔
編號：ARC-2026-002
日期：2026-01-29
標籤：文化保存, 建築測繪, 點雲資料
原始網址：https://archive.example.org/reports/arc-2026-002
影片嵌入網址：https://www.youtube.com/embed/heritage3dscan
========================================
本次保存計畫採用地面式光達（LiDAR）搭配無人機近景攝影測量，共採集 1.8 億筆空間點雲資料，精度控制在 ±1.5 毫米以內。

團隊針對正殿斗栱、瓜筒與穿斗式構架建立完整零件編號，讓未來修復匠師可直接比對受力位移曲線，無須拆解原構件即可評估白蟻蛀蝕風險。`,
  },
  {
    path: '2026_Q1/DOC-2026-003_低軌衛星海運通訊實測.txt',
    content: `標題：遠洋漁船低軌衛星寬頻與即時海象回傳實測
編號：ARC-2026-003
日期：2026-02-11
標籤：海事通訊, 衛星網路, 遠洋作業
原始網址：https://archive.example.org/reports/arc-2026-003
影片嵌入網址：https://vimeo.com/embed/maritime-sat-003
========================================
在北太平洋冬季湧浪高度達 4.5 公尺的海況下，船載相位陣列天線於 14 天航程中維持平均下載 142 Mbps、上傳 26 Mbps 的連線品質。

重點紀錄：
1. 遠距醫療視訊問診全程無中斷，延遲維持在 42ms 至 58ms 之間。
2. 電子漁獲日誌可於每日 20:00 自動加密同步至岸上總部資料庫，大幅減少返港後紙本補登錯誤。`,
  },
  {
    path: '2026_Q2/DOC-2026-004_都市雨水花園滯洪評估.txt',
    content: `標題：海綿城市示範街區雨水花園與透水鋪面滯洪評估
編號：ARC-2026-004
日期：2026-03-05
標籤：都市防災, 水資源, 景觀工程
原始網址：https://archive.example.org/reports/arc-2026-004
影片嵌入網址：
========================================
針對去年梅雨季三場短延時強降雨事件（時雨量超過 75mm），研究團隊比對改造前後的路面逕流峰值時間。

觀測顯示，配置多層級碎石蓄水層的透水人行道可將尖峰排水延後 28 分鐘，並減少約 34% 的下水道瞬時負荷。由於本篇僅有文字與測站紀錄，未附現場訪談影片。`,
  },
  {
    path: '2026_Q2/DOC-2026-005_精密農業溫室微氣候控制.txt',
    content: `標題：高海拔溫室微氣候感測與自動遮陰簾控制模型
編號：ARC-2026-005
日期：2026-03-19
標籤：智慧農業, 物聯網, 溫室管理
原始網址：https://archive.example.org/reports/arc-2026-005
影片嵌入網址：https://www.youtube.com/embed/alpine-greenhouse-05
========================================
透過每 5 分鐘回傳一次的溫濕度、光合有效輻射（PAR）與葉面結露數據，系統自動調節天窗開度與內遮陰網。

與傳統定時開關相比，本季試種的高冷蔬菜平均減少 22% 灌溉用水，且因避免正午過熱與清晨露水滯留，病害通報率下降近四成。`,
  },
  {
    path: '2026_Q2/DOC-2026-006_工業餘熱回收待補網址.txt',
    content: `標題：食品加工廠鍋爐餘熱回收與熱泵系統效益追蹤
編號：ARC-2026-006
日期：2026-04-02
標籤：節能減碳, 工業熱泵, 能源管理
原始網址：
影片嵌入網址：https://www.youtube.com/embed/heat-recovery-006
========================================
本追蹤報告彙整中南部兩座食品廠導入高溫熱泵回收殺菌釜廢熱後的年度帳單對照。
系統將原本排入冷卻水塔的 65°C 廢水轉換為 88°C 預熱給水，使天然氣鍋爐燃料耗量降低 19.6%。

註：此檔案刻意留空「原始網址」欄位，用以展示品質稽核與線上補齊功能。`,
  },
];

export function createSampleRawArchive(): {
  rawFiles: RawArchiveFile[];
  skippedEntries: SkippedEntry[];
  totalEntries: number;
  archiveName: string;
} {
  const encoder = new TextEncoder();
  const rawFiles: RawArchiveFile[] = SAMPLE_DOCS.map((doc, idx) => {
    const parts = doc.path.split('/');
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1).join('/');
    return {
      id: `sample-${idx}-${Date.now()}`,
      sourceFileName: fileName,
      sourcePath: doc.path,
      folderPath,
      rawBytes: encoder.encode(doc.content),
    };
  });

  const skippedEntries: SkippedEntry[] = [
    { path: '__MACOSX/2026_Q1/._DOC-2026-001.txt', reason: '系統隱藏或 macOS 中繼檔案' },
    { path: '2026_Q1/README.md', reason: '非 .txt 純文字檔案' },
  ];

  return {
    rawFiles,
    skippedEntries,
    totalEntries: rawFiles.length + skippedEntries.length,
    archiveName: 'archive_batch_2026_sample.zip',
  };
}

export async function generateSampleZipBlob(): Promise<Blob> {
  const zip = new JSZip();
  for (const doc of SAMPLE_DOCS) {
    zip.file(doc.path, doc.content);
  }
  zip.file('2026_Q1/README.md', '# 檔案說明\n本壓縮檔包含 6 篇規範格式文字檔，用於測試 ZIP 轉 CSV 自動整編工具。\n');
  return zip.generateAsync({ type: 'blob' });
}
