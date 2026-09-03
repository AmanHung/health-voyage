# 健康航程：GitHub Pages + Google + LINE LIFF

目前為待設定與驗收版本，不可直接收集真實病人資料。與 handbook 完全獨立。

## 帳號與儲存

- 指定管理員：obm0304@gmail.com。只接受 Google 驗證過、audience 符合專案的 ID token；不是前端 Email 判斷。
- 個案：LINE LIFF 的原始 ID token 送後端驗證後，以一次性碼配對。
- 姓名名冊與紀錄各自建立獨立私人試算表。照片資料夾保持私人，不能開啟連結共用。
- 現有 Sites 展示版及資料不會自動移入；也不讀取 handbook 的資料。

## 1. Google Apps Script

1. 使用指定 Google 帳號建立獨立 Apps Script 專案。
2. `npm run build:github` 產生 `build/google/Code.gs`、`appsscript.json`。將這兩份檔案放入新專案。
3. 管理員先閱讀程式，執行 `setupHealthVoyage` 並親自授權。此版本使用 Apps Script 原生 DriveApp，Google 會要求雲端硬碟及試算表的廣泛權限，不是僅限單一資料夾。不同意時先停止，不繞過授權。
4. 初始化會建立兩份試算表與私人照片資料夾，ID 記錄於 Script Properties。可重複執行，不刪除既有資料。
5. 在 Script Properties 設定 `GOOGLE_CLIENT_ID`、`LINE_CHANNEL_ID`。`ACCEPT_PATIENTS` 預設 false，測試階段啟用前先確認全部只用虛構資料。
6. 部署 Web app（以擁有者執行）；必須先由管理員確認公開可呼叫的入口授權。入口的每個資料操作仍驗證 ID token 與個案權限。`doGet` 只回服務狀態。

## 2. 管理員 Google 登入

在自己管理的 Google Cloud 專案設定 OAuth 同意畫面與 Web client，允許網站的實際 HTTPS origin。只申請 openid/profile/email，不要求個案授權 Google Drive。將公開 client ID 同時設到 Google Script Properties 與 GitHub repository variable `GOOGLE_CLIENT_ID`。

目前透過 Google tokeninfo 驗證 Google 管理員 token，並檢查 issuer、audience、有效期限與 email_verified。此方式需納入正式環境可用性與配額驗收；若人數增加，改用受支援的伺服器端驗證套件／Firebase，不能省略 token 驗證。

## 3. LINE LIFF

建立獨立 LINE Login channel，建立 LIFF app，Endpoint 設成實際 GitHub Pages 網址，Scopes 至少 openid，依需要使用 profile。記錄公開 LIFF ID 與 Channel ID（不是 Channel Secret）。前端 LIFF ID → GitHub variable `LIFF_ID`；Channel ID → Script Properties `LINE_CHANNEL_ID`。

管理員及 LINE 身分不自動互認；同一人可使用兩種登入分別驗證兩種角色。邀請碼一次性且三天到期，已綁定的碼不能重新配對。

## 4. GitHub Pages

獨立 repository：AmanHung/health-voyage。先保留私人，未經確認不公開來源碼。私人 repository 使用 Pages 可能需要既有付費方案；不可自行升級。若帳號不支援，請管理員選擇公開已去除敏感資料的專案來源，或使用既有適用方案。

Repository variables（都不含機密）：`GOOGLE_API_URL`（Google /exec 部署網址）、`GOOGLE_CLIENT_ID`、`LIFF_ID`。
Settings → Pages → GitHub Actions。
三者未齊或 `DEPLOY_READY` 非 true 時只驗證、產出套件，不發布不完整網站。正式發布前須取得對外公開網站的確認。

## 5. 驗收與限制

- `npm test` 包含離線 Google 服務替身測試，不等於真實 Google/LINE 連線通過。
- 真實驗收：管理員登入 → 建立「測試個案 001」→ LINE 登入配對 → 上傳已壓縮餐盤、運動截圖、用藥 → 重新開啟確認仍存在 → 管理員查閱 → 第二個 LINE 帳號驗證無法讀取別人照片、不能使用管理操作。
- 對 Google Web app 使用 text/plain 的 HTTPS POST；不用 JSONP、不用 no-cors、不在瀏覽器 URL 放 token 或病人資料。CORS 讀不到結果就顯示失敗，不假裝保存成功。須在 iPhone/Android LINE 實測；若 Google 回應不允許此讀取方式，發布維持封鎖，改採經審核的傳輸方式再驗收。
- 病人照片最高 20 MB、48 MP，支援 JPEG/PNG；轉成無 EXIF 的 JPEG，餐盤長邊 1280、截圖 1920，輸出最大 800 KB。HEIC 不支援時明確提示轉成 JPG。伺服器再次檢查格式、位元組與尺寸。
- 同日同類紀錄只算最新一筆；原壓縮版修訂歷程保留，不重複加星。僅步數計入排行榜；測試個案不入榜。
- 試算表最後一欄為權威 JSON，不可手動修改角色或配對欄位；表格供閱讀、分析，修改透過網站。不能以隱藏分頁代替權限。
- Apps Script/Sheets 有配額；使用量到達試用上限會停止操作並提示，不靜默截斷。仍須規劃备份、還原、監控、資料保存與刪除政策後才可正式收案。

參考：LINE https://developers.line.biz/en/docs/liff/using-user-profile/ ；Google https://developers.google.com/apps-script/guides/web 。
