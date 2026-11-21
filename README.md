# 文檔整編工作台 — ZIP 批量文字檔轉 CSV 工具

純前端執行的 ZIP 規範文字檔自動整理工具，支援拖曳 `.zip` 或批次 `.txt` 檔案，於瀏覽器內完成解壓、編碼偵測、標頭與內文切分、異常稽核，並匯出相容 Excel 的 UTF-8 BOM CSV 檔案。

## 本機開發

```bash
npm install
npm run dev
```

啟動後於瀏覽器開啟 `http://localhost:3000`。

## 部署至 GitHub Pages

本專案已內建 `.github/workflows/deploy.yml` 自動部署流程與相對路徑設定（`vite.config.ts`）：

1. 將此專案推送至您的 GitHub 儲存庫（預設分支 `main`）。
2. 前往該 GitHub 儲存庫的 **Settings → Pages**。
3. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
4. 推送後會自動觸發建置並發佈至 `https://<您的帳號>.github.io/<儲存庫名稱>/`。
