# 核可航程正式整合（2026-09-24）

本次由登入效能基準 8718534 整合已核可的五項導覽、日週曆、簽到、五島貝殼航程、成就推薦及素材。正式版不包含展示身份、模擬 API、routeTest 控制或本機簽到資料。

## 登入及負載
- login.tsx、auth.ts、login-flow.ts 保留原版本：登入介面獨立載入，後續功能於身份驗證時平行下載，具逾時、取消與競態處理。
- bootstrap 保留 Records／MedicationPlans 批次讀取，不取得寫入鎖，不自動簽到；checkinDays 隨原 profile 回傳，不增加資料表讀取。
- 簽到點擊才另送出 checkin，伺服器使用臺灣日期、已驗證身份及既有短期寫入鎖；同日重試不重複新增。沒有資料庫結構遷移。
- 排行榜改進入運動頁才讀取，避免每次登入／首頁簽到同時掃描全部紀錄。
- 新地圖 WebP 320588 bytes，僅航程頁顯示並 lazy load；海星 24186 bytes，船 11506 bytes。原始素材保留在工作區預覽。
- 貝殼總額由已驗證伺服器回傳之紀錄和簽到日期衍生；修訂後重算，不另存可重複累加的餘額。獎勵僅視覺用途。

## 驗證與限制
- 167 項本機測試通過，含 500 筆紀錄單次資料讀取、10 個合成身份交錯登入、鎖忙碌下其他身份仍可 bootstrap、簽到去重／跨日／隔離、路線停點與出發點。
- 上述為模擬 Apps Script 服務的自動測試，不能當成 10 人真實同時登入的實測容量。
- Windows 首次完整 build 通過；壓縮素材後再建置在 modules transformed 後失敗，最終版本須以 Linux CI 建置結果核對。
- Apps Script 官方配額為每使用者同時執行 30、每指令碼 1000，且試算表讀取及外部驗證仍可能延遲；此架構不能保證任意人數無延遲。未對真實個案進行壓力測試。
- 來源：https://developers.google.com/apps-script/guides/services/quotas
- 正式前端需依 commit 核對 Actions 部署；後端需更新既有 Apps Script 部署並確認服務版本 8 dailyCheckin，權限／網址不變。
