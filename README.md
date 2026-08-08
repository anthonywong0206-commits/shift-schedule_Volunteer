# 義工編更系統 v1.6

可直接部署到 GitHub Pages 或 Vercel 的靜態義工編更網站。v1.6 已由單機 `localStorage` 升級為 **Supabase 雲端儲存＋管理員登入模式**。

## v1.6 新增
- Supabase Auth 管理員登入；未登入或未獲授權帳戶不能讀取義工及更表資料。
- Supabase Postgres 雲端儲存，活動、義工、緊急聯絡資料、更表及午膳安排可跨裝置同步。
- RLS（Row Level Security）已在 Supabase 端設定，瀏覽器只使用公開的 publishable key，**沒有放置 service role / secret key**。
- 管理員登入後可新增、修改及刪除活動／更表，修改會自動同步。
- 側欄顯示管理員模式及登出；頂部顯示「同步中／雲端已同步／同步失敗」。
- 設定頁可「立即同步」或「從雲端重新載入」。
- 第一次登入時：如果 Supabase 尚未有雲端工作區，系統會將同一網站來源的 v1.5 本機資料自動建立成第一份雲端資料；否則使用現有雲端資料。
- 瀏覽器仍保留一份 localStorage 備份，用作網絡短暫失敗時的本機保護，但 Supabase 是正式資料來源。

## 原有功能保留
- 多日活動；共用分組、崗位及義工名單，每日班次／午膳獨立。
- 固定時段、浮動時段、混合模式及自訂固定更期。
- 編更頁左側未編配義工拖拉到崗位。
- 多人同時段、自動增高、拖動及伸縮班次。
- 統一／分段午膳，午膳在時間軸以紅色顯示。
- 義工批量刪除、篩選、按中心／組別分組。
- Excel/CSV 批量匯入義工及固定／混合可服務時段。
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
