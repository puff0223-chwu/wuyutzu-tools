# 🕳️ 踩雷清單

> 開發手冊的「字典」：用到才查。開工必讀的是 [`HANDBOOK.md`](../HANDBOOK.md)（小抄）。格式：踩到什麼 → 以後怎麼做。
> 2026-11-12 從第二版完整手冊拆出，內容沒有刪減。

> 格式：**踩到什麼 → 以後怎麼做**。依平台與主題分類。

### 6-A 平台限制（一開始就要知道）

- **Claude 網頁成品（Artifact）連不到外部資料庫**（Firebase、Google Sheets 都不行）→ 要存資料的系統一開始就做成 GitHub Pages／Vercel 的獨立網站（集點小金庫就是從 Artifact 搬出來的）。
- **Google Apps Script 在學校與個人帳號都被擋** → 不要拿來當後端。
- **Google 表單 API 不能自動建立連結試算表、不能刪單筆回覆** → 要老師手動做；**表單「無聲送出」只能寫、不能讀** → 適合問卷，不適合要讀回來的系統。
- Google OAuth 桌面應用程式在測試模式：要把自己的 Gmail 加進 Test Users，不然授權會卡住。
- **GitHub Pages 是靜態、公開的網站**：沒地方藏金鑰（要用 AI 就借 Vercel 系統的 API）；答案、照片對應表不能放在網站檔案裡。
- **Google 學術搜尋在學校網路常被擋**（「異常流量」），家用網路 IPv4／IPv6 混用也會 → 註明換網路，提供 Semantic Scholar 當備案。
- **Supabase 免費方案一個人最多 2 個專案**（跨所有組織；開新組織不會多；GitHub 登入永遠是同一個身分）→ 新系統優先放進課堂小鎮；真的要新專案只能用另一個 Email 註冊。

### 6-B 答案與資料保護

- **學生手機拿得到的東西，打開開發者工具就看得到** → 判對錯放在老師端、伺服器或規則裡；學生只送答案。自我練習、不上傳成績的工具（化學尋寶）可以接受答案在檔案裡，要變成「老師收成績」就得搬走。
- 正確答案放在只有出題老師讀得到的位置（例：線上檢定所的 `key`）。
- 照片改亂數檔名，「幾號＝哪張」只放在需登入的資料庫。
- 老師給的評等／回饋存在**學生寫不到**的地方（存進學生紀錄會被學生下次同步蓋掉）。
- 給學生的參考答案 PDF 要拿掉驗證代碼。
- 「只能做一次的事」交給規則擋（`!data.exists()`），不要靠前端記。
- 學生寫的 HTML 不能直接顯示：只留 `<b><i><br>`，顯示前先全部跳脫；React 系統一律過 DOMPurify。
- **匿名只對同學匿名**：資料庫存真的學號（老師要看得到），學生 API 一律不帶學號。**雙盲互評**：還沒公布前學生 API 不回傳作者，互評時拿掉會露出名字的欄位。
- 學生看到協同老師時只顯示稱呼，不露 Email。

### 6-C Firebase 規則

- **任何人都能自己註冊 Firebase 帳號** → 權限一定要另外記（會員中心的 status＋apps），不能只看「有登入」。
- 用 Email 當管理員要加 `email_verified === true`，不然別人可以先註冊那個 Email 冒名。
- 規則沒有函式 → 用 `rules.src.json` 寫縮寫（`{{ADMIN}}`、`{{STAFF:app}}`、`{{EKEY}}`），`build_rules.py` 展開；**不要手改 `firebase-rules.json`**。
- 規則不能「數字轉字串」→ 只能逐次展開（線上檢定所 1～20 次讓規則從 35 KB 變 71 KB，上限 256 KB），新系統不要再大量展開。
- 規則裡沒有資料時 `val()` 是 null，加減會讓整條失敗 → 用 `exists() ? val() : 0`。
- OR 條件把「可能拼出奇怪路徑」的放後面，前面先擋。
- 「本人可以改，但只能改某幾格」→ 寫成「其他重要欄位改完後必須跟原本一樣」；新增系統代號時，會員中心「老師改自己的資料」那條也要檢查新的 `apps/<代號>` 沒變（加 src 時漏過）。
- **apps 的值只能是 true**（沒勾＝沒有那一格）→ 想表達「以前沒有這一格的舊資料」要另外加記號（拆出謎案課堂的證時用核准日期＋`wyt` 記號判斷舊老師，管理員頁一次補發），記號也要鎖住不讓老師自己改。
- 舊入口要一起關：改用新代碼後，舊的寫入路徑改唯讀，不然學生拿舊連結能繞過「停止活動」。
- 公開排行榜要另開一個只放名字＋成績的抽屜（整班紀錄含學號，不能公開）。
- 只給伺服器用的節點（`staffnote`、`stats` 寫入）不寫任何網頁規則＝網頁讀寫不到，伺服器用服務帳戶照樣能寫。

### 6-D Firebase 連線與免費額度

- **最容易爆的是「同時連線 100 條」**（像只有 100 個座位的教室），背景分頁、忘了關的分頁也佔位子：
  - 長時間連線的頁面背景 60 秒斷線、回到畫面自動重連（`FB.idle()`、`MPC.idle()`）；
  - 一場 50 組定向越野＋一班公告欄 ≈ 90 條 → **兩場大型即時活動不要同時開**；
  - 刻意常駐的頁面（定向越野自動裁判、投影排行榜、鍵結社主持機）登記在健檢工具的 `ALWAYS_ON`。
- 學生頁盡量用 REST「問完就走」，不要每支手機都開即時連線；要即時就只監聽自己需要的小節點。
- 大檔案（照片）和小資料分開放，照片要看時才讀；照片存進學生手機的 Cache Storage，第二次不用下載。
- 用量：1 GB 儲存、每月 10 GB 下載、100 條連線；看 repo 的「🔋 Firebase 資源報告」議題、會員中心「📊 使用狀況」或 Firebase 控制台。

### 6-E Firebase 程式（SDK）

- 同一個 app 只能有一個登入者；用完的第二個 app 要 `deleteApp` 整個拆掉（只 `goOffline` 下次拿回來還是離線，寫入會一直等）。
- 「忙碌中先不重畫」之後一定要補畫一次（真的 Firebase 只通知一次）。
- **Firebase 不會存空陣列**（`from: []` 讀回來是沒有這個欄位）→ 讀取一律用 `arr()` 補回，測試也要用 `.get()`。

### 6-F Supabase

- **RLS 政策正確 ≠ 能存取**：GRANT（能不能碰）、RLS（能碰哪幾列）、Storage 的 `storage.objects` 政策，三件事缺一個都是 permission denied。
- **2026-10-30 起新建的 public 資料表不會自動授權** → 建表 SQL 後面一定自己加 grant。
- Storage bucket 設 public 只代表「可讀」，上傳要另外設政策。
- 建表、改表（DDL）只能在 SQL Editor 執行 → 寫成 `supabase/0NN_*.sql` 存進 repo（照編號），**在對話裡給老師完整 SQL** 貼上執行並註明順序；**SQL 先跑、程式後上線**。
- **欄位名稱不要用 Postgres 保留字**（`values`、`order`、`user`…）。交給老師前先在本機用 PGlite（WASM 版 Postgres，自己建 `auth.uid()` 與 anon／authenticated 角色，service_role 要 bypassrls）把 schema、RLS、GRANT 跑過一次；`pgcrypto` 不需要（`gen_random_uuid` 內建）。
- 想讓老師看到學生帳號、但看不到密碼雜湊 → **欄位層級 GRANT**（`grant select (id, sid, name, …) on students to authenticated`）；老師只能改自己的 `name`，不能把 `active` 改成 true（同樣用欄位層級 GRANT）。
- 老師從「Data API」頁複製的網址常帶 `/rest/v1/` → 「Invalid path specified in request URL」→ 程式一律 `new URL(網址).origin`。
- 改 Auth 使用者的 Email：SQL Editor `update auth.users set email=…, email_confirmed_at=now() where email=…`。
- 忘記密碼：Redirect URL 要加進白名單，四步（按忘記密碼→收信→點連結→新密碼登入）都走過才算完成；首頁換成大廳後，舊的 `/?reset=1#type=recovery` 要在載入 Supabase **之前**就轉走。
- Google 登入回來會導回 Site URL（首頁）→ 按登入前把要回去的路徑存在 `localStorage.auth-return`，首頁拿到登入狀態再送回去（不用加 Redirect URL）。
- 免費 Email 每小時約 4 封。
- **免費專案連續 7 天沒有資料庫查詢會被暫停** → cron-job.org 每 3～4 天打一支「真的會查資料庫」的 API（打首頁沒用）；**保活一律用正式網域**（部署專用網址會導去登入頁，回 308），設好按「測試執行」確認 200；**保活排程不要刪**。
- PostgREST 批次 insert 每筆欄位要一樣，沒值填 null；`onConflict` 要跟著唯一鍵改。
- 偶發 522 重試即可；次要寫入（學習紀錄）fire-and-forget，不要擋住學生。
- Supabase 的查詢物件每次 `await` 都會重新送出 → 可以直接再 await 一次來重試。

### 6-G Vercel／部署

- 前端 `VITE_` 開頭的變數會被打包進瀏覽器 → 只放 publishable key；secret／service_role 只放後端環境變數。
- Vercel 環境變數會**蓋過**程式裡的預設值 → 不想被覆蓋的值（例如登入頁預填信箱）直接寫在程式。
- 分支預覽網址要看得到畫面：環境變數也要勾 Preview，設完 Redeploy；換分支交付時一定給**該分支的預覽網址**。
- SPA 深層網址 404 → `vercel.json` rewrite 到 `/index.html`。
- **Vercel API 預設跑在美國東岸**：新專案一開始就在 `vercel.json` 設 `regions`，和 Supabase 同區（首爾 icn1、新加坡 sin1、東京 hnd1；先到 Supabase → Project Settings → General 看 Project region）。
- 專案名稱被別人用掉時網址會自動加尾巴（`grade-query-system-coral.vercel.app`）→ 部署後請老師給**實際網址**，不要用猜的（猜的可能是別人的網站）。
- `api/` 裡底線開頭的檔案（`_lib.js`）不會變成 API，適合放共用程式；Hobby 方案每個專案最多 12 支 API → 合併成 `[action].js`。
- Vercel 排程（crons）寫在 `vercel.json`，時間是 UTC；排程要「沒事就幾秒結束」（例：超過 6 天才做），別人亂打也不浪費額度。
- 新增 API 只加新檔、不改原本流程；推上去前先本機 `vite build`，部署後用 GET 健康檢查。
- CORS 只擋瀏覽器讀結果、不擋請求本身 → 伺服器端也要檢查 Origin，再加驗證與限流。
- 寄信用 Resend：要老師註冊（主帳號）、建 API Key、貼 `RESEND_API_KEY`、Redeploy；沒設就不寄也不記（下次補）。

### 6-H GitHub 與工作流程

- **私有 repo** 要另外授權「Claude」GitHub App（`github.com/apps/claude/installations/select_target`），跟 Vercel App 是兩件事。
- 推送前先合併多次修改成一次推送；推送失敗多半是 GitHub 短暫出錯，重推即可；推之前 `git pull --rebase`（別的對話可能同時推）。
- 部署後看不到更新，九成是瀏覽器快取 → 無痕視窗或 `Ctrl+Shift+R`；共用 JS／CSS 加 `?v=` 版本號。
  - ⚠️ **同一天改第二次也要換版本號**（`20261108a` → `b` → `c`…）：展覽館管理頁改了三次都用同一個 `?v=`，老師的瀏覽器一直用舊程式，以為「說改好了卻沒改」。每次推上去前檢查：改過的 .js／.css，引用它的頁面版本號有沒有跟著換。
- 階段順序要先確認（化學系統曾經跳過 Phase 1.5）；順序對調時先做「交叉相容性對照」。
- 測試資料加記號（ZZ、TEST 班級），測完清掉；**絕不動老師的真實資料**。
- 大量重做（例：重拍截圖）先放分支（`wip/…`），完成再併入 main，避免正式網站出現破圖；完成後教老師刪分支。
- GitHub Action 用內建 `GITHUB_TOKEN` 推回 main：要寫 `permissions: contents: write`；推之前 `git pull --rebase`；定時任務用 `rev` 比對、沒變就幾秒結束，省 Actions 時間。

### 6-I AI（Gemini）

- 模型名稱用別名 `gemini-flash-latest`，`GEMINI_MODEL` 環境變數可覆寫。
- **新一代模型帶 `temperature`／`top_p`／`top_k`／`thinking_budget` 會直接報錯** → 全部拿掉；要變化性就隨機加一個「切入角度」到提示詞。
- **HTTP 402＝預付額度用完** → 學生看到「老師的 AI 批改額度暫時用完，請通知老師」，後台錯誤紀錄標【AI 額度用完】；建議老師開 Auto-reload。
- 出題提示詞：每題只問一件事（禁止「以及／並且」）、具體但不能一句話答完；規準像規準不像範例答案；開放題規準不限定立場。
- AI 的「判定」和「回饋文字」要一致：回饋開頭寫「過關！」或「還差一點：」。
- 能在瀏覽器算的先算（格式、重複度），通過才呼叫 AI；AI 失敗時先算過關，不讓網路問題卡住全班。
- 門檻用資料定（先量合格與不合格樣本的分布）。
- 不做即時餘額查詢（要串帳單 API，不成比例）→ 記呼叫次數＋連到 AI Studio。
- 三家最低階模型對短文字批改價差可忽略，不為省小錢換服務商。

### 6-J 前端畫面

- **整頁重畫的副作用**：照片閃爍、游標跳走、打到一半的字消失、捲動歸零 → 先算出 HTML、跟上次一樣就不重畫；要重畫就先記下輸入框內容與捲動位置再放回（`data-keep`）。
- 搜尋框每打一個字不要重畫整頁，只藏／顯示表格列。
- 同一頁兩份表單不能共用 id／name（加前綴）；**class 名稱別撞**（`.x` 撞到關閉鈕、成績調閱室的 `.cc-tab` 撞謎案課堂的分頁鈕）→ 新增 class 前先 `grep` 樣式檔；全域 `.code` 是紅色打字機字體，輸入框不要取名 `code`。
- **全域 `label > input { display:block; width:100% }`** 會把 radio、checkbox、小數字框撐開，還會蓋掉 `hidden` → 個別蓋回 `auto`、檔案上傳鈕另外 `display:none !important`。
- `<button>` 裡不能放 `<button>` → 卡片用 `div role=button`，裡面的按鈕 `stopPropagation`。
- 用 `absolute` 疊在內容上的小元件，內容很短時會被蓋住 → 用 flex 並排。
- 說明框（tooltip）放在有 overflow 的彈窗、表格裡會被切掉 → 用 portal 放到 body 最上層、`position: fixed`，放不下就翻到上面，捲動或縮放時關閉。
- 瀑布流：CSS columns 在項目少時分配不均 → 用「字數估高度、放到最矮那一欄」的 JS 版，或改成格子＋同列等高。
- 一般 script 的 `const` 不會掛在 `window` 上；ES module 用 `file://` 開不了（本機測試要開 http 伺服器）；`.js` 檔裡不能寫 JSX（放元件要用 `.jsx`）。
- 一行寫完的程式不要在中間插 `//` 註解。
- 下載檔案：`<a download>` 要先 `appendChild` 再 `click()`；新視窗（列印頁）要在按下按鈕的當下就 `window.open`，之後再填內容，不然會被擋。
- 彈出視窗放在會被即時重畫的容器外面，不然會被洗掉；同一個彈窗連續換對象 → 用對象 id 當 `key`。
- 下拉選單的值在寫入前被畫面還原 → 先把選的值記下來再寫入（英勇學院換風格沒存）。
- contenteditable 貼上要轉純文字。
- 全形／半形在輸入框看起來一樣 → 半形括號逗號自動換成全形再比對，只給「小提醒」不算錯。
- 洗牌用 Fisher–Yates＋`crypto.getRandomValues`，不要用 `sort(() => Math.random() - 0.5)`（有偏差）。
- iPad 要使用者先點一下才會出聲 → 按抽的當下 `sfx.unlock()`。
- 螢幕常亮：Wake Lock API，失敗時播放隱形靜音影片；被系統收回、切回分頁、全螢幕、點畫面都要重新申請，每 30 秒檢查；需要 HTTPS。
- 記住「上次打開的項目」時，避免初始化時把 null 寫回去（曾導致重新整理後回到卡片頁）。
- 地圖、畫布上的位置用**百分比**存（換螢幕、換手機都在同一個地方）；背景圖先在瀏覽器壓縮（最寬 1600px）再存，大資料不要放進每幾秒的定時更新裡，打開那一頁再讀。

### 6-K 比對與判分

- 「對答案」不能只比整串字 → 用 LCS 對齊，才說得出是哪個欄位錯；一個錯不要報三次：先認出學生常見的「多寫」（初版、第幾刷、ISBN），標成已處理再對齊。
- 粗體斜體只看文字，標點空白不檢查樣式。
- 錯誤診斷用「差幾倍」判斷：×1000（單位）、6.02×10²³（亞佛加厥數）、10 的整數次方（科學記號）、14−答案（pH／pOH 搞混）——老師要看「哪一種錯」。
- 判定要接受合理的不同做法（見 2-8）。
- 隨機產生的干擾項要避開正解（干擾人名剛好和作者同名）。
- **把別人的題庫搬進系統，跑一次「答案唯一嗎」檢查**：化學尋寶原作有 4 題兩種配法看到的照片完全一樣 → 跟觀察結果一致的配法都算對（窮舉排列，8 杯 40320 種，瀏覽器一下就算完）。
- **把別人的試算表公式搬進系統，一定要驗算**：換算後用系統再算一遍，和試算表存好的結果逐格比對；換不過來的（跨工作表、整欄範圍）不要硬換，改成匯入算好的值並告訴老師。
- 公式引擎要和 Excel 一樣：空白＝0；範圍略過空白與文字；ROUND 四捨五入遠離 0；MOD 負數、INT 往下取；浮點誤差用 `toPrecision` 清掉。
- 分派互評要平均：每人挑「被評次數最少」的作品，最後修補到最多和最少差不超過 1；補分派只動新抽的，已評過的配對一定保留。
- 組內貢獻用 WebPA：每位評分者給的分數先除以他給出的總分、再乘上評了幾個人，組員收到的取平均。
- 撞題雷達：比對「兩個字一組」的重疊比例（分母用較短那篇），只比老師指定的「點子欄」。

### 6-L 測試工具的坑

- 假的資料庫沒有延遲，看不出瓶頸 → 每次寫入加 0.2 秒；壓力測試要模擬「伺服器做完了、但回應掉了」（`lost`），才測得出重送會不會重複。
- Playwright sync API 不能用 `time.sleep`，用 `page.wait_for_timeout`；`dialog`（confirm／prompt）處理函式裡不能再呼叫 `page.evaluate`（會卡死）→ 答案先放在變數。
- Playwright `text=…` 會先點到同字的標題 → 按鈕用 `button:has-text()`；input 的 value 用 has-text 找不到，要用順序選。
- 網頁讀完 `data-xxx` 後會移除屬性時，測試不要用那個屬性找元素。
- 全頁截圖會改變視窗高度，用 `vh` 的捲動框會被拉高，是測試假象。
- 模擬模式的 localStorage 跨分頁同步是非同步的，偶爾會漏（正式資料庫是原子操作不會）。
- 介面改版後舊測試失敗：先確認是「設計就是這樣」再改測試，不要為了測試改設計；先分清楚是網頁的問題還是測試工具的問題（輪詢太快會塞車）。
- 檢查工具的「警告」也要看（漏 import 只有警告）。
- 測試裡的隨機性：短字串可能剛好出現在雜湊裡，用不可能出現的字當測試答案。
- Python 檔名別跟內建模組撞名（`token.py`）。

### 6-M 老師的 Windows 電腦

- **給老師執行的 .bat 不要用「`-ExecutionPolicy Bypass`＋iex 執行自己」**：惡意程式常見手法，會被防毒擋，老師就得用系統管理員硬跑（更危險）。只用 Windows 內建的 curl／tar／robocopy；全英文 ASCII、CRLF 換行；**絕不需要管理員權限**。
- 沒有 python、gh；Node 用完整路徑 `C:\Program Files\nodejs\node.exe`。
- 中文內容寫成 UTF-8 檔案再傳，不要在指令列內嵌中文。
- git 後檔案變 CRLF，腳本比對前先正規化；Python 寫 CRLF 檔用 `newline='\r\n'`；sed 遇到中文、emoji、`#` 容易壞，改用 Edit 或 node 腳本。
- PowerShell 5.1 不能用 `-Headers` 設 Accept／User-Agent → 用 `-UserAgent`。
- Claude Code 推 GitHub：在暫存資料夾 clone、推完刪掉，不在電腦上留憑證。
- 本機資料夾是一般資料夾、不是 git：同步時只覆蓋不同的檔案、不刪除本機檔案；要刪的先移到 `_to_delete`。
