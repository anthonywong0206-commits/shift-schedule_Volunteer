# 義工編更系統 v1.8

可直接部署到 GitHub Pages 或 Vercel 的靜態義工編更網站。v1.8 延續 **Supabase 雲端儲存＋管理員登入模式**，並強化專屬更表及 PDF 輸出。

## v1.7 基礎更新
- 義工主檔不再保存可服務時段；新增／編輯／Excel 匯入／名單輸出均只處理個人、中心／組別、電話及緊急聯絡資料。
- 服務時段改在活動編更頁設定：拖放義工到崗位後，按當日編更模式選擇固定更期或自訂開始／結束時間。
- 同一多日活動可為每個日期獨立設定固定／浮動／混合模式及不同固定更期。
- 舊 v1.6 活動會自動把原本共用的編更模式／更期複製到各日期，再容許逐日修改。

## v1.6 雲端功能保留
- Supabase Auth 管理員登入；未登入或未獲授權帳戶不能讀取義工及更表資料。
- Supabase Postgres 雲端儲存，活動、義工、緊急聯絡資料、更表及午膳安排可跨裝置同步。
- RLS（Row Level Security）已在 Supabase 端設定，瀏覽器只使用公開的 publishable key，**沒有放置 service role / secret key**。
- 管理員登入後可新增、修改及刪除活動／更表，修改會自動同步。
- 側欄顯示管理員模式及登出；頂部顯示「同步中／雲端已同步／同步失敗」。
- 設定頁可「立即同步」或「從雲端重新載入」。
- 第一次登入時：如果 Supabase 尚未有雲端工作區，系統會將同一網站來源的 v1.5 本機資料自動建立成第一份雲端資料；否則使用現有雲端資料。
- 瀏覽器仍保留一份 localStorage 備份，用作網絡短暫失敗時的本機保護，但 Supabase 是正式資料來源。

## 原有功能保留
- 多日活動；共用分組、崗位及義工名單，每日編更模式／更期／班次／午膳可獨立。
- 固定時段、浮動時段、混合模式及自訂固定更期。
- 編更頁左側未編配義工拖拉到崗位。
- 多人同時段、自動增高、拖動及伸縮班次。
- 統一／分段午膳，午膳在時間軸以紅色顯示。
- 義工批量刪除、篩選、按中心／組別分組。
- Excel/CSV 批量匯入義工基本及緊急聯絡資料。
- 緊急聯絡人、關係及電話。
- 義工名單輸出、個人／中心／組別專屬更表 Excel / PDF。

## Supabase 連線
網站已連接到已設定的 Supabase project。`supabase-config.js` 只包含 Project URL 及 **publishable key**；publishable key 本來就是供瀏覽器使用，真正資料存取權限由 Auth + RLS 控制。

Supabase 使用的獨立資料表：
- `volunteer_roster_admins`
- `volunteer_roster_state`
- `volunteer_roster_audit_logs`

請不要把 Supabase `service_role` / secret key 放入 GitHub 或前端檔案。

## 部署到 GitHub / Vercel
你只需要將這個版本的檔案更新到原本 GitHub repository。

### Vercel
`vercel.json` 已設定 build command 及 `dist` 輸出；GitHub 更新後 Vercel 可照原本流程自動重新部署。

### GitHub Pages
執行：
```bash
npm run build
```
然後發布 `dist/`。`dist/` 會包含：
- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`

## 本機預覽
```bash
npm run build
npm run preview
```
然後開啟 `http://localhost:4173`。

> Supabase JavaScript SDK 以固定版本 CDN 載入，因此預覽及正式使用時需要網絡連線。

## v1.8 專屬更表輸出更新
- 個人／所屬中心更表可自訂四層排序優先次序，Excel 與 PDF 共用同一排序結果。
- 新增「圖表式全活動更表」，可輸出全部編更分組或指定編更分組，按活動日期逐日產生 A4 橫式時間軸 PDF。
- 所有 PDF 在下載前均先產生預覽；預覽與下載 PDF 共用同一批 Canvas 頁面影像，以避免字型替換、欄位走位及預覽／下載資料不一致。

## v1.9 手機介面更新
- 700px 以下自動切換至獨立手機 UI；桌面版維持原有時間軸介面。
- 手機首頁使用大按鈕、摘要卡片與活動卡片。
- 手機更表使用日期切換、組別快速篩選、卡片式班次及未編配義工清單。
- 點擊班次沿用原有班次視窗，可修改時間、崗位及固定／浮動更期。
- 未編配義工可在手機直接選擇崗位再進行時段編配。
- 底部導覽可收起／展開。
- Supabase、PDF、Excel、活動／義工管理資料結構不變。
