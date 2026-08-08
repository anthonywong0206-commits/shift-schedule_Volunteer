# 義工編更系統 Volunteer Roster System

按概念圖製作的可運作網站版本，**無需資料庫、無需 API Key、無第三方 npm 套件**，可直接部署至 Vercel 或 GitHub Pages。

## 主要功能

- 自訂「編更分組」：新增、修改、刪除分組及自訂顏色。
- 自訂崗位：名稱、所需人數、所屬編更分組及顏色。
- 主更表時間軸：08:00–18:00。
- 互動拖拉編更：
  - 整段班次水平拖動以改變服務時間。
  - 班次垂直拖到其他崗位時，自動更新崗位及編更分組。
  - 左／右邊緣可拉長或縮短班次。
  - 時間以 15 分鐘為單位吸附。
- 雙擊更表空白時段可快速新增班次。
- 午膳時間：自訂開關、開始及結束時間；於主更表以色帶顯示，重疊班次會有斜紋提示。
- 義工資料：姓名、所屬中心、所屬組別、電話、電郵、可服務開始及結束時間。
- **Excel 義工資料匯入**：
  - 支援 `.xlsx` 及 `.csv`。
  - 內置匯入預覽。
  - 可下載 Excel 可開啟的 CSV 範本。
  - `.xlsx` 由網站本身直接解析，不依賴外部 CDN。
- 主更表可匯出 Excel 可開啟的 UTF-8 CSV。
- 專屬圖表：按義工本人、所屬中心、所屬組別統計。
- 圖表包括總服務時數、班次數、涉及義工、涉及崗位、崗位時數分佈及編更分組時數。
- 圖表可使用瀏覽器「列印／儲存 PDF」。
- 資料自動儲存到瀏覽器 `localStorage`。
- Desktop / Tablet / Mobile responsive layout；複雜更表在手機上以橫向捲動方式使用。

## Excel 匯入欄位

建議第一個工作表使用以下欄位：

| 欄位 | 範例 |
|---|---|
| 姓名 | 陳大文 |
| 所屬中心 | 社區中心A |
| 所屬組別 | 青年組 |
| 電話 | 91234567 |
| 電郵 | example@email.com |
| 可服務開始 | 09:00 |
| 可服務結束 | 18:00 |

系統亦接受部分英文欄位名稱，例如 `Name`、`Center`、`Group`、`Phone`、`Email`。

> 舊式 `.xls` 檔案請先在 Excel 另存為 `.xlsx` 或 `.csv`。

## 本機預覽

網站本身是純靜態 HTML/CSS/JavaScript，直接放到任何靜態伺服器即可。

如電腦有 Node.js：

```bash
node scripts/build.mjs
python3 -m http.server 4173 -d dist
```

然後瀏覽 `http://localhost:4173`。

## 建置

```bash
npm run build
```

或者：

```bash
node scripts/build.mjs
```

完成後會建立 `dist/`。

## 部署到 Vercel

1. 將整個專案上載到 GitHub repository。
2. 在 Vercel 選擇 **Add New → Project**。
3. Import repository。
4. Vercel 會讀取已附上的 `vercel.json`：
   - Build Command：`node scripts/build.mjs`
   - Output Directory：`dist`
5. 按 Deploy。

## 部署到 GitHub Pages

專案已附有：

```text
.github/workflows/deploy-pages.yml
```

步驟：

1. 將專案 push 到 GitHub `main` branch。
2. Repository → **Settings → Pages**。
3. Source 選 **GitHub Actions**。
4. 之後每次 push 到 `main`，GitHub Actions 都會自動 build 及 deploy。

## 資料儲存說明

目前版本使用瀏覽器 `localStorage`，因此：

- 適合單一工作人員／單一裝置使用及先測試整個編更流程。
- 不需要 Supabase、Firebase 或任何伺服器。
- 不同電腦／瀏覽器不會自動同步資料。

如果日後要多人共同使用，可以在這個前端版本上接駁 Supabase，加入登入、跨裝置雲端同步、活動／日期資料庫、多人即時編更、歷史版本、權限管理及後台備份。

## 瀏覽器建議

Chrome、Edge、Safari、Firefox 的近期版本均可使用主要功能。直接解析 `.xlsx` 使用瀏覽器原生解壓功能；如較舊瀏覽器未支援，可將 Excel 另存為 CSV 後匯入。
