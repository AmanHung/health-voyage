# 健康航程

獨立於 `AmanHung/handbook` 的健康任務網站。前端使用 GitHub Pages，資料由 Google Apps Script 寫入私人 Google 試算表與雲端硬碟，個案以 LINE LIFF 登入。

## 目前狀態

部署準備版本，尚未完成真實 Google／LINE 串接驗收，**請勿輸入真實病人資料**。登入設定不齊時，網站會停留在設定中，不模擬登入或宣稱已儲存。

- 每日運動、飲食及用藥紀錄；單一任務月曆及自願參加的暱稱排行榜。
- 運動截圖本機 OCR，步數或分鐘擇一，可手動修正。
- 每日一餐照片搭配簡單食物分類與回饋；目前不呼叫付費食物 AI。
- 照片上傳前縮小、重編碼為 JPEG；儲存壓縮佐證，不保留完整原始大圖。
- 管理員建立測試個案與一次性邀請碼，後端驗證身分及資料權限。

## 開發與驗證

需要 Node.js 22.13 或更新的相容版本。

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

本機入口：`http://localhost:3001/health-voyage/`。

`production/` 是正式版本入口；`google/` 是 Google 後端；`app/`、`server/` 等保留展示版元件與回歸測試，不是 GitHub Pages 的後端。

建置結果：`build/github/` 為 Pages 靜態網站，`build/google/` 為 Apps Script 程式。金鑰、病人資料、`.env.local` 及舊網站部署設定不納入此儲存庫。

## 部署

依 [部署與驗收說明](google/DEPLOYMENT.md) 完成 Google 授權、Google 登入 Client ID 與 LINE LIFF 設定。GitHub Actions 會先測試及建置，`PAGES_ENABLED=true` 時發布網站。公開入口與開放收案分開控制：識別碼未齊時只顯示「網站設定中」，不開放登入或上傳；後端 `ACCEPT_PATIENTS` 另行管制個案使用。

離線測試使用替身 Google 服務，不能取代真實裝置與帳號驗收。完成測試個案端到端驗收及資料管理規範前，不開放正式收案。
