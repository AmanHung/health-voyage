# 手機登入效能修正

2026-09-22，基準 `780b32b`。僅修正登入與資料讀取，未套用未採用的 design-* 預覽。

## 查明的問題

- SDK script 載入與 LIFF init 原本無 deadline，網路未完成時可無限等待。
- 自動登入的 LINE 初始化期間沒有共同的 busy 鎖；按鈕可另啟登入，外部瀏覽器可能登出／跳轉而干擾原請求。
- 個案 Records／MedicationPlans 原本先讀 ID 欄，再對每個匹配項目逐筆 getValues；500 筆紀錄需要 501 次資料讀取。
- 原登入入口同步載入完整首頁、管理與食物查詢模組。公開正式版主 JS 為 602,738 bytes；本次初次本機成功建置的登入主 JS 約 198 KB、獨立 CSS 約 1.3 KB，其他功能在取得 LINE／Google identity 後與 bootstrap 並行載入。這不是實機秒數量測。

## 行為

登入改由 login.tsx／login-flow.ts 統一負責，避免重複請求；取消等待會 abort bootstrap，遲到的回應不得覆蓋新登入。SDK 下載及初始化各限 15 秒，bootstrap 限 30 秒，畫面模組限 25 秒；8 秒顯示等待提示與取消入口。未完成的 LIFF 初始化不在同頁重啟，指引重新載入。

後端單次讀取 ID 至 JSON 欄，在伺服器依已驗證個案 ID 過濾後才解析並回傳；保持原始列號、資料上限、身分驗證、私人照片及權限規則。不缓存個案健康資料、不記錄 token，也不自動重試寫入。

## 驗證與部署

- 新測試涵蓋 SDK／init 卡住、重試、取消後不得跳轉、登入去重、遲到回應隔離、500 筆紀錄單次讀取及跨個案排除。既有全套測試亦需通過。
- 本機合成資料頁驗證登入失敗可恢复及登入後原版首頁；不操作真實個案。
- Windows 完整建置曾成功，後續重建遇到既有 -1073740791 程序終止；發布以相同 commit 的 GitHub Actions 型別檢查、測試與 Linux 建置為準。
- Apps Script 須更新原部署，服務版本 7、能力 fastBootstrap；僅推送前端不會更新後端。
- 仍需 iPhone／Android LINE 實機驗收，記錄首次／再次登入秒數及錯誤階段；Google／LINE 外部服務與手機網路延遲無法由離線測試排除。

参考：[LINE LIFF 初始化](https://developers.line.biz/en/reference/liff/#initialize-liff-app)、[Apps Script 批次讀取建議](https://developers.google.com/apps-script/guides/support/best-practices#use_batch_operations)。
