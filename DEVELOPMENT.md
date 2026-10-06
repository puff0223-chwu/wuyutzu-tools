# 🛠️ 巫魚子教學工具箱：開發與整合說明

> 給未來的自己（和 Claude）看的說明書：這個網站怎麼組成、資料放哪裡、要新增工具時怎麼接進來。
> **每次開發的過程與決定記在 [CHANGELOG.md](CHANGELOG.md)（開發歷程）**，每次開發結束都要同步更新本檔與 CHANGELOG。
> 最後更新：2026-10-06

---

## 1. 整體架構（一句話版）

**一個 GitHub 倉庫＝一個網站**。每個工具都是「一個獨立的 HTML 檔」，首頁 `index.html` 用卡片把它們串起來。
不需要安裝、不需要編譯，檔案推上 GitHub，約 5 分鐘後網站就會更新。

| 項目 | 內容 |
|---|---|
| 網站網址 | https://puff0223-chwu.github.io/wuyutzu-tools/ |
| GitHub 倉庫 | `puff0223-chwu/wuyutzu-tools`（`main` 分支） |
| 主機 | GitHub Pages（免費） |
| 電腦本機資料夾 | `桌面\系統工具開發\巫魚子教學工具wuyutzu-tools\wuyutzu-tools` |
| 以哪邊為準 | **GitHub 上的版本最新**，本機資料夾是它的副本 |

---

## 2. 資料夾結構

```
wuyutzu-tools/
├── index.html                    # 首頁「巫魚子教課事務所」（資料驅動：工具清單 TOOLS 陣列）
├── index-preview.html            # 首頁預覽區（改版時先在這裡試，滿意再複製成 index.html）
├── DEVELOPMENT.md                # 本說明檔（結構、資料、規則）
├── CHANGELOG.md                  # 開發歷程（每次開發的內容與老師的決定）
├── README.md                     # 專案簡介
│
├── classroom/                    # 🏫 導師班工具
│   ├── seating.html              # 座位安排系統
│   ├── cleaning-jobs-admin.html  # 打掃徵才 v4：老師管理頁
│   ├── cleaning-jobs-signup.html # 打掃徵才 v4：學生志願登記頁
│   ├── cleaning-jobs.html        # 打掃徵才 v3.4（舊版，首頁已不連結）
│   ├── README_cleaning.md        # 打掃徵才說明
│   ├── disc.html                 # DISC 人格測驗
│   ├── belbin.html               # 貝爾賓團隊角色測驗
│   ├── bartle.html               # 巴圖玩家類型測驗（首頁放在「遊戲設計思考」）
│   ├── golden-hits.html          # 金曲歌王
│   └── poetry_fortune.html       # 詩籤系統
│
├── chemistry/                    # ⚗️ 化學學習遊戲
│   ├── missing-equipment.html    # 消失的實驗器材
│   ├── images/equipment/         # 33 張器材圖片（檔名＝題庫 id）
│   ├── ph-core.js                # 🧪 消失的指示劑（pH 練習）：共用核心（出題、題組碼、解法、Firebase）
│   ├── ph-generator.html         # pH 練習：學生作答頁
│   ├── ph-generator-teacher.html # pH 練習：老師頁（首頁卡片連到這裡，請勿給學生）
│   ├── unit-core.js              # 📜 失落的配方（單位換算）：共用核心（物質庫、題型、題組碼、判分、換算地圖）
│   ├── unit-generator.html       # 單位換算：學生作答頁
│   ├── unit-generator-teacher.html # 單位換算：老師頁（首頁卡片連到這裡）
│   ├── case-board-core.js        # 📌 No.940 案件委託公告欄：共用核心（代碼、即時同步、統計）
│   ├── case-board.html           # 案件委託公告欄：學生頁
│   └── case-board-teacher.html   # 案件委託公告欄：老師頁（開設、投影牆、統計）
│
├── gamification/                 # 🎲 課堂遊戲化
│   ├── system.html               # 選人系統＋陣亡詛咒系統
│   ├── poke-game.html            # 戳戳樂
│   └── truth-or-dare.html        # 真心話大冒險
│
├── inquiry/                      # 🔬 探究與實作課程
│   ├── excel-rescue-core.js      # 📊 消失的實驗數據：共用核心（學號→專屬數據、標準答案、對答案、結案代碼）
│   ├── excel-rescue-checker.js   # 📊 消失的實驗數據：Excel 鑑識核心（拆開 .xlsx 檢查圖表／函數／格式化條件）
│   ├── excel-rescue.html         # 消失的實驗數據：學生闖關頁
│   └── excel-rescue-teacher.html # 消失的實驗數據：老師答案頁（首頁卡片連到這裡，請勿給學生）
│
└── christmas/                    # 🎄 聖誕節系列
    ├── lottery.html              # 交換禮物抽籤
    └── adjectives.html           # 禮物形容詞產生器
```

---

## 3. 首頁分類（index.html）

首頁的分類和資料夾**不是一對一**，是依「上課情境」分組：

| 首頁大分類 | 小分類 | 工具 |
|---|---|---|
| 🏫 導師班工具 | 📋 班級行政 | 座位安排、打掃徵才 |
| | 🧠 認識學生 | DISC、貝爾賓 |
| | 🎉 班級氣氛 | 金曲歌王、詩籤、聖誕抽籤、形容詞產生器 |
| ⚗️ 化學課堂工具 | 🔬 化學學習遊戲 | 消失的實驗器材、消失的指示劑（pH）、失落的配方（單位換算）（後兩者連到老師頁） |
| | 🎲 課堂遊戲化 | 選人系統、陣亡詛咒、戳戳樂、真心話大冒險 |
| 🎮 遊戲設計思考 | — | 巴圖玩家類型 |
| 🔬 探究與實作 | Excel 數據處理 | 消失的實驗數據（連到老師頁） |
| 👨‍👩‍👧 親子 | 家庭與親子互動 | 集點小金庫（連到 `family-points/`，給家長與孩子用） |

> 首頁是老師專用的工具箱，不會提供給學生；學生只會拿到各工具的「學生頁」連結（學生頁不連回首頁）。

---

### 首頁（index.html，2026-10-03 上線「巫魚子教課事務所」）

- 風格（第二版，明亮有活力的偵探風）：米白底＋淡千鳥格紋、深藍大衣色 `#1f2a44` 粗框卡片與位移陰影、芥末黃 `#f2b134` 放大鏡徽章與重點按鈕、線索紅 `#e4572e`；抽屜各有代表色（班級事務 藍綠、化學實驗室 紅橘、遊戲研究室 紫、探究與實作 藍 `#2f6db5`）；標題 Noto Serif TC，英文標籤 Bebas Neue
- 五個抽屜：Drawer I 班級事務、Drawer II 化學實驗室 No.223、Drawer III 遊戲研究室、Drawer IV 探究與實作（2026-10-06 新增）、Drawer V 親子（2026-10-06 新增，目前只有集點小金庫）；卷宗自動編號（No. I-01…，顯示在說明卷宗上）
- **資料驅動**：所有工具寫在檔案裡的 `TOOLS` 陣列，新增工具只要加一筆（drawer、shelf、icon、name、brief、title、sub、features、href、btn，選填 teacher／case／note）
- `teacher: true` 顯示「🔒 老師專用」標籤並在卷宗內加警語；`case` 顯示紅色「CASE 01」標籤；`DRAWERS` 陣列設定抽屜名稱與代表色
- 搜尋框（按 `/` 可快速聚焦）＋抽屜篩選；不做「最近開啟」
- 正式首頁＝第二版；預覽頁＝第三版（拿掉格紋、細框柔和陰影），老師評估**沒有比較好、不上線**，待日後研究（筆記見 CHANGELOG「首頁視覺花待研究筆記」）
- 舊版紫色首頁可從 git 歷史找回（commit 226f6ec 之後、ac464b8 之前的 index.html）
- 之後要改版：先改 index-preview.html 給老師看，確認後再複製成 index.html

## 4. 資料存在哪裡？（四種方式）

| 方式 | 用在 | 特性 |
|---|---|---|
| **不存資料** | 詩籤、金曲歌王、真心話、抽籤、形容詞 | 打開就能用，最單純 |
| **瀏覽器 localStorage** | 座位、打掃徵才管理頁、選人 | 只存在那一台電腦的瀏覽器，換電腦就沒了；常搭配 Excel 匯出備份 |
| **Google 表單無聲送出** | DISC、貝爾賓、打掃徵才學生頁 | 學生送出→進老師的 Google 表單；只能「寫入」，網頁讀不回來 |
| **Firebase Realtime Database** | 消失的實驗器材（排行榜）、pH 練習與單位換算練習（作答紀錄）、No.940 案件委託公告欄（委託與成員） | 可寫可讀、即時；全班共用 |
| **固定亂數（不存資料）** | pH 練習、單位換算練習的出題 | 同一個「題組碼＋班級＋座號」永遠算出同一組題目，老師頁可重算全班題目與答案 |

### Firebase 設定

- 專案：**Point-Collection Stash**（Spark 免費方案，新加坡 asia-southeast1）
- 網址：`https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app`
- 存取方式：網頁直接用 `fetch` 呼叫 REST API（`.json` 結尾），不需要載入 Firebase SDK
- 資料位置（每個工具一個「抽屜」）：

```
/
└── missing-equipment/
    └── scores/
        └── <班級_座號_姓名>: { cls, seat, name, score, correct, wrong, total, cleared, seconds, ts }
            （每位學生一筆，只保留最佳成績）
└── ph-generator/
    └── <題組碼 7 碼>/
        └── <班級_座號>: { cls, seat, name, answers[5], attempts[5], history[[題號,作答,對錯,時間]…], submitted, firstTs, ts }
            （不存正確答案，老師頁用固定亂數重算後比對）
└── unit-convert/
│   └── <題組碼 7 碼>/
│       └── <班級_座號>: 格式同 ph-generator；科學記號答案存成 "3.01e23"
└── case-board/
    └── <公告欄代碼 6 碼>/
        ├── meta: { title, createdAt, open }                    ← 老師頁寫入；open=false 停止收件
        ├── members/<班級_座號>: { cls, seat, name, joinedAt }
        └── tasks/<委託 id>: { sid, cls, seat, name, src, vol, page, num, note, status,
                              solver, solverName, solverSeat, solverCls, stars, tries[], reopened,
                              createdAt, takenAt, doneAt }
              status：open 待承接 → taken 偵辦中 → done 已破案；另有 cancelled（委託人撤回）、removed（老師移除）
```

- **安全規則**（2026-10-03 發布）：根目錄全部上鎖。
  - `missing-equipment/scores`：可讀；每位學生的紀錄只有在「分數更高，或同分但用時更短」時才能覆蓋，不能刪除；分數 0～3000。
  - `ph-generator/<題組碼>`、`unit-convert/<題組碼>`：可讀；題組碼必須是 7 碼合法字元；可新增或更新，但**交卷（submitted=true）後就不能再改**，不能刪除。
  - 規則全文見本檔最後的附錄。
- ⚠️ **之後新工具要用 Firebase**：要在規則裡為它新增一個抽屜的規則，否則會被擋（HTTP 401/403）。
- **`fp/` 抽屜（集點小金庫，2026-10-06）**：唯一使用 Firebase Authentication（登入）的工具，規則依登入身分判斷（admins／users／kids／config／ledger），詳見第 6 節「集點小金庫」與附錄規則。
- 與「科學任務偵探所」的 Supabase 完全分開：**Supabase 給大系統、Firebase 給輕量小工具**。

---

## 5. 新增一個工具的步驟

1. 在對應資料夾新增 `新工具.html`（單一檔案，CSS/JS 都寫在裡面）
2. **學生使用的頁面不要放回首頁的連結**（老師不希望學生連到工具首頁）；**老師頁一律在右上角放「🏠 回事務所首頁」**（`../index.html`，2026-10-06 老師確認）
3. 在 `index.html` 的 `TOOLS` 陣列加一筆資料（卡片和說明卷宗會自動產生）：
   `{ id, drawer, shelf, icon, name, brief, title, sub, features: [...], href, btn }`，老師頁加 `teacher: true`，系列案件加 `case: 'CASE 04'`
4. 需要存資料 → 先依第 4 節選擇方式；用 Firebase 記得改規則
5. 更新本檔第 2、3 節的結構表
6. Commit → Push → 等約 5 分鐘 → 用無痕視窗或 `Ctrl+Shift+R` 檢查

---

## 6. 各工具重點備忘

### 🔍 消失的實驗器材（chemistry/missing-equipment.html）

- 題庫在檔案中的 `ITEMS` 陣列：`id`（圖片檔名）、`name`（標準答案）、`aliases`（其他可接受寫法）、`category`、`marked`（圖上有紅圈）
- 遊戲參數集中在 `CONFIG`：每局 30 題、3 條命、5 秒內 100 分、之後每秒 −5、最低 30 分、排行榜前 30 名
- 判分只忽略空白與全形/半形差異，錯字一律算錯；「滴定夾」也接受「蝴蝶夾」
- 排行榜：資料庫裡每位學生（班級＋座號＋姓名）只存一筆最佳成績，分數更高（或同分但更快）才會覆蓋；排序依總分 → 答對數 → 用時
- 圖片來源：老師自製的器材簡報 PDF（6 頁、6 大類）；同框器材用遮白或紅圈處理
- **新增器材**：把圖片放進 `images/equipment/<id>.jpg`，在 `ITEMS` 加一行即可

### 🧪 消失的指示劑：pH 值計算練習（chemistry/ph-*.html）

- 故事：實驗室 No.223 第二案，指示劑全被偷走，只能靠計算鑑定每瓶溶液的 pH；題目稱為「樣本」
- 配色：深藍綠＋pH 彩虹條

- **出題規則都在 `ph-core.js` 的 `CONFIG`**：log 值兩位小數（0.30/0.48/0.70/0.85）、10 次方範圍（pH 落在 1～13）、挑戰題中 [OH⁻] 的比例
- 係數只由 2、3、5、7、10 相乘相除組成，程式自動列舉；所有計算用「整數百分位」，不會有小數誤差
- 難度（正向）：⭐基礎（[H⁺]，係數 1）／⭐⭐進階（[H⁺]，2、3、5、7）／⭐⭐⭐挑戰（[OH⁻] 題，或 [H⁺] 兩數組合）／⭐⭐⭐⭐魔王（[H⁺] 三數組合）
- **題組碼**（7 碼，例 `4TJ-6NKY`）裡藏了：難度分配、作答方式（即時對錯／交卷批改）、是否顯示 log、隨機輪次，還有 1 碼檢查碼防打錯
- 題目種子＝題組碼＋班級＋座號（不含姓名，打錯名字題目也不變）；投影用的共同題目種子＝題組碼＋`PROJECT|n`
- **題目方向**（2026-10-04 新增）：老師頁三選一——只正向（濃度 → pH）、只反向（pH／pOH → 濃度）、正反混合
  - 方向記在題組碼**檢查碼 salt**：0＝只正向（舊題組碼都是，題目完全不變）、1＝混合、2＝只反向
  - 反向題型：`pH2H`（pH → [H⁺]）、`pOH2OH`（pOH → [OH⁻]）、`pH2OH`（pH → [OH⁻]，先算 pOH，放挑戰）
  - 難度對應：基礎＝係數 1（pH 整數）；進階＝2/3/5/7（pH→[H⁺] 或 pOH→[OH⁻]）；挑戰＝pH→[OH⁻] 或兩數組合；魔王＝三數組合
  - 答案輸入「係數 × 10^次方」兩格，存成 `"1.5e-5"`；係數必須是 2、3、5、7 組出的值（±0.5%），1.50、15×10⁻⁶ 等等價寫法也算對
  - 同一個 log 值只對應一個係數：反向題排除 4.9（log 4.9 ＝ log 5 ＝ 0.70）
  - 顯示函式：`concHTML`／`concText`（題目）、`askHTML`（作答欄標籤）、`ansHTML`／`ansText`（正解）、`blankHTML`（列印作答欄）、`formatAnswerStr`（學生作答顯示）
- 學生頁：`ph-generator.html?code=題組碼`；答案只判對錯不給解；重新整理會從 Firebase 接回進度
- 老師頁四個分頁：出題設定（產生題組碼＋QR）、投影（共同題目＋逐題解法）、列印（每人學習單＋解答表）、全班總表（即時作答、每 10 秒自動更新、匯出 Excel：總表／作答歷程／題目與解法）
- 限制：答案是在學生瀏覽器裡算的，懂程式的學生理論上能從原始碼推出答案；屬於練習工具，不適合正式考試

### 📜 失落的配方：化學單位換算練習（chemistry/unit-*.html）

- 故事：實驗室 No.223 第三案，老化學家的配方筆記單位被打亂，要換算回正確份量；題目稱為「配方第 n 頁」
- 配色：深咖啡＋羊皮紙＋銅色，標題用 Noto Serif TC；地圖路線為藍綠色

- 架構完全比照 pH 練習（題組碼、固定亂數、即時對錯／交卷批改、投影、列印、全班總表、Excel）
- 題組碼的檢查碼加了 `CODE_SALT`，所以 pH 的題組碼不能拿來這裡用（反之亦然）；題組碼第 2 個旗標改為「顯示換算地圖與路線提示」
- **物質庫** `SUBS`、**溶液情境** `SOLUTES`、**市售濃溶液** `CONC_STOCK`、**ppm 情境** `PPM_MASS`／`PPM_VOL` 都在 `unit-core.js` 上方，新增物質只要加一行（原子量表 `ATOMIC`）
- 只給原子量（H1 C12 N14 O16 F19 Na23 S32 Cl35.5 Ca40），N<sub>A</sub> = 6.02×10²³
- 難度與題型（`LEVEL_TYPES`）：
  - ⭐ 基礎：g→mol、mol→g、mol→分子數、分子數→mol
  - ⭐⭐ 進階：g→分子數、分子數→g、mol→總原子數
  - ⭐⭐⭐ 挑戰：g＋體積→C<sub>M</sub>、C<sub>M</sub>＋體積→g、重量百分率（兩向）、ppm（質量定義、1 ppm = 1 mg/L 定義、反算 mg）
  - ⭐⭐⭐⭐ 魔王：重量百分率＋密度→C<sub>M</sub>、C<sub>M</sub>＋密度→重量百分率、g↔某種原子數、溶質＋水＋密度→C<sub>M</sub>
- 數字規則：一般答案到小數第二位；分子數／原子數用科學記號（係數兩位小數）；中間步驟也四捨五入到小數第二位（`ans`），同時保留不四捨五入的精確值（`alt`），**兩種算法都接受，各自允許 ±1%**
- 為了讓中間步驟四捨五入不失真，溶液題的溶質莫耳數至少 0.2 mol
- **符號規則**：體積莫耳濃度一律寫成 C<sub>M</sub>（M 下標）。程式裡的資料用純文字 `CM`，顯示時經 `UC.richText()`（HTML 轉成 `C<sub>M</sub>`）或 `svgLabel()`（SVG 用 tspan 下標）；首頁用 `rich()`。Excel 匯出為純文字，仍顯示 CM
- 換算地圖 `mapSVG(route, showFormula)`：直式版面，`route` 是題目要走的節點；即時對錯模式下答錯會亮出路線
- 老師頁「單位換算地圖」只有兩個選項：① 顯示路徑，不顯示公式（預設）② 顯示路徑，也顯示公式（如「× / ÷ 分子量 M」）
  - 「是否顯示公式」記在題組碼的**檢查碼 salt** 裡（`CODE_SALT`＝顯示、`CODE_SALT+1`＝不顯示）；新題組碼的 hint 旗標一律為開
  - 老師投影頁的地圖一律顯示公式
- 學生頁、老師頁載入核心檔時加了版本號（`unit-core.js?v=…`、`ph-core.js?v=…`，目前 ph-core 為 `20261004a`），**改核心檔後記得一起改版本號**，避免瀏覽器用到舊的快取

### 📌 No.940 案件委託公告欄（chemistry/case-board*.html，2026-10-05 新增）

- 用途：期中／期末考前的解題時間，同儕互助解題（老師一人無法回答所有問題）
- 流程：老師開設公告欄（6 碼代碼＋QR）→ 學生加入 → 發布委託（出處：課本／習作／講義／考卷／其他＋冊別、頁數、題號、卡在哪裡）→ 會的同學承接，教室內面對面講解 → 委託人按「完成」給 1～3 顆星
- 規則：
  - 一人同時只能承接 1 案（學生頁檢查）；不能承接自己的委託（規則檢查）
  - 兩人同時搶同一案：Firebase 規則只允許「待承接 → 偵辦中」一次，慢的人會被拒絕並看到「慢了一步」
  - 委託人可以「沒解決，重新委託」，接案者可以「放棄承接」，都會記錄在 `tries`（老師統計的「放回次數」）
  - 委託人可撤回尚未被接的委託；老師可在投影牆點卡片「老師承接」、「放回待承接」或「移除」
  - 老師可「停止收件」（meta.open=false），學生就不能再發布新委託
- 獎勵：每破一案 1 點（`CONFIG.POINTS_PER_CASE`）；星數 1～3，學生自己要累積 5 個評價（`CONFIG.STAR_MIN_COUNT`）才看得到平均，老師隨時看得到
- 投影牆不顯示星數（避免尷尬）；同一公告欄有多班時名字前自動加班級
- 即時同步：Firebase REST 的 EventSource 串流；連不上時改成每 4 秒輪詢；每次自己寫入後也會立刻重抓一次
- 老師統計：參與人數、委託總數、已破案、尚未破案、老師出馬；每人的發布委託、已被解決、破案數、點數、平均星數、評價數、放回次數（可排序）；Excel 兩張表「學生統計」「委託紀錄」
- 限制：沒有登入機制，學生理論上能冒用別人座號；星數存在資料庫中、懂技術的學生可讀到；屬課堂互助工具
- 第一版不支援拍照上傳（老師決定用順了再升級）
- **螢幕常亮**（2026-10-05 加入，老師用平板投影會暗掉、投影中斷）：投影牆的「☀️ 螢幕常亮」按鈕
  - 優先用 Screen Wake Lock API（`navigator.wakeLock.request('screen')`）；不支援或被拒時，後備方案是播放一段看不見的 1px 靜音影片（canvas.captureStream）
  - 打開投影牆、按全螢幕時自動申請；切到別的 App 回來（visibilitychange）會自動重新申請，因為系統會收回鎖
  - 預設開啟，關閉狀態記在 localStorage `case-board-awake`
  - 按鈕狀態：「開」＝成功；「點我開啟」＝瀏覽器需要使用者點一下才給；「無法常亮」＝請改裝置的自動鎖定設定
  - 需要 HTTPS（GitHub Pages 符合）；iPad 需 iPadOS 16.4 以上
  - 之後其他投影頁（如 pH／單位換算的投影解法）若也需要，可把 `Awake` 搬到共用檔

### 📊 消失的實驗數據：Excel 數據救援任務（inquiry/excel-rescue*.html，2026-10-06 新增）

- 探究與實作課「Excel 作圖與常用函數」單元的 Ending 作業。**第一階段（輕量版）**：不用資料庫，全部在瀏覽器裡算
- **學號＝種子**：`學期代碼 SEMESTER + 學號` 經雜湊產生亂數，同一個學號永遠得到同一份數據；老師頁用同一支 core 重算，所以不用存答案
- 學生流程：輸入學號＋姓名 → 下載專屬 Excel（SheetJS 產生，一關一張工作表）→ 做圖表／函數 → 網頁回報答案 → 每關得 2 碼密碼碎片 → 六關全破顯示結案證明（結案代碼 6 碼）
- 進度存學生瀏覽器 localStorage（`excelRescue:<學期>:<學號>`），換電腦要重填答案，但數據不變
- 關卡（老師 2026-10-06 定案）：
  1. 長條圖：六件金屬證物與鹽酸的氫氣體積｜座標軸標題、Y 軸文字垂直、資料標籤｜答：第 k 多的證物、最多最少差值
  2. 折線圖：未知物質 X 加熱曲線｜Y 軸文字垂直、資料標籤、讀出轉折點｜答：熔點、沸點（±1 °C）、開始沸騰的分鐘
  3. 圓餅圖：神秘合金成分質量｜資料標籤顯示百分比｜答：最大成分、指定成分百分比（±1%）
  4. 散佈圖：比爾定律標準曲線 8 點＋未知樣品｜線性趨勢線、方程式、R²｜答：斜率（±1.5%）、R²（±0.002）、未知濃度（±3%）。**數據含一個被污染的離群值，答案以含離群值計算**（R² 落在 0.93～0.985）
  5. 函數：30 組滴定數據｜AVERAGE、MAX、MIN、LARGE 第三大、SMALL 第二小、STDEV（**不教 IF、COUNTIF**）｜標準差 STDEV／STDEV.S／STDEV.P 都接受
  6. 格式化條件：20 採樣點鉛濃度，大於 10 ppb 標紅｜答：超標點數、最高的採樣點
  - 隱藏關卡「被污染的標準品」：第 4 關過關才解鎖並出現暗示；找出離群點、排除後重算斜率、R²（排除後都 ≥ 0.999）、修正濃度；過關得隱藏徽章代碼
- 老師頁右上角有「🏠 回事務所首頁」（老師頁可以連回首頁；學生頁不連）
- 老師頁：學期設定、學生連結＋QR Code＋全螢幕投影；① 貼學號清單（可含姓名）產生全班答案表、匯出 Excel、下載任一學生的數據檔；② 批次驗證結案代碼
- **學期（2026-10-06 改成老師頁可切換）**：老師頁「學期設定」輸入代碼（英數與 `-`，最多 16 字，自動轉大寫）→ 數據、答案、代碼整批換新；學期藏在學生連結 `excel-rescue.html?s=學期`，QR Code 跟著換。學生頁讀 `?s=`，沒帶就用 core 裡的預設 `SEMESTER`（`115-1`）。老師頁記住上次學期與最近 8 個（localStorage `excelRescue-teacher:sem`／`:recentSem`）。同學期不同班想用不同數據可加班級代號，如 `115-2A`
- **批次驗證**：一行一位「學號 姓名 結案代碼 隱藏徽章」，空白／Tab／逗號皆可，可從 Excel 或表單回覆直接貼；6 碼代碼自動辨認，其餘文字當姓名。結果：✅ 正確／❌ 錯誤／未填／學號格式錯＋隱藏徽章；**代碼是別的同學的會直接指出是誰的**（比對範圍＝② 貼上的人＋① 名單）；列出 ① 名單中還沒交的人；可匯出驗證結果 Excel（含未繳交）
- 已驗證：2000 個學號的標準答案全部能過關；斜率、R² 與 numpy 獨立計算一致；Excel 檔可用 LibreOffice／openpyxl 開啟
- **第二階段：Excel 鑑識（2026-10-06）** `excel-rescue-checker.js`，需要 JSZip（cdnjs 3.10.1）＋ SheetJS
  - 原理：.xlsx 是壓縮包，用 JSZip 解開讀 `xl/charts/chart*.xml`（圖表）、工作表 XML（格式化條件）、`styles.xml`（格式顏色）；儲存格與公式用 SheetJS 讀（`cellFormula`、`sheetStubs`）。全部在瀏覽器裡，檔案不上傳
  - 學號與學期從檔案「任務說明」A2／A3（或各工作表 A2）讀出，用**檔案的學期**產生標準數據（和老師頁目前學期不同會提醒）
  - **圖表靠數據認**：比對圖表裡的數字（圖表快取 numCache，沒有就回頭讀參照的儲存格）跟該生專屬數據，≥80% 對上才算那一關的圖 → 改工作表名稱也找得到；用別人的數據會出現「有 N 張圖表的數據跟你的對不上」
  - 散佈圖：含離群值那張算第 4 關；另外一張只有 7 個標準點的散佈圖算隱藏關卡（可以放在任何工作表）
  - X／Y 軸：用圖表群組的 axId 順序認（第一條＝X、第二條＝Y），備用才看 axPos
  - **原則（老師 2026-10-07）**：只檢查上課教過的基本操作；需要判讀的內容（未知濃度、被污染的是哪一瓶等）由學生在網頁上回答，Excel 鑑識不檢查（下載的 Excel 仍保留提問列）。折線圖只要溫度一條線，X 軸有沒有設成時間都算對；散佈圖的 X 軸一定要是濃度（XY 散佈圖本身的特性）
  - 檢查項目（每項 1 分，六關共 41 分，隱藏關 4 分另計）：
    - L1（7）直條圖 barDir=col、完整自己的數據、圖表標題、X／Y 軸標題（不能是預設「座標軸標題」）、Y 軸標題垂直、資料標籤 showVal
    - L2（9）折線圖、數據、**只畫溫度一條折線**（框起兩欄時「時間」被畫成另一條線＝不通過；X 軸有沒有用時間都算對）、有資料標記（series marker 不是 none）、標題、X／Y 軸標題、Y 垂直、資料標籤
    - L3（5）圓餅圖、數據、標題、標籤顯示百分比 showPercent、類別名稱 showCatName
    - L4（10）散佈圖、數據、X 軸是濃度、標題、X／Y 軸標題、Y 垂直、線性趨勢線、顯示方程式 dispEq、顯示 R² dispRSqr
    - L5（6）AVERAGE、MAX、MIN、LARGE(…,3)、SMALL(…,2)、STDEV：要有公式、範圍涵蓋 B5:B34（或 B:B）、計算結果正確；手打數字會提醒「沒有用函數」
    - L6（4）有格式化條件、範圍涵蓋 B5:B24、規則 cellIs 大於（或大於等於）10／運算式 B5>10、格式顏色偏紅（主題色無法判斷時給過並註明）
    - 隱藏（4）刪掉一個點後重做散佈圖（8 點中對上 7 點、且不是第 4 關那張；不判斷刪的是哪一瓶）、線性趨勢線、方程式、R²
  - **Y 軸標題「轉垂直」**：`RULES.Y_TITLE_ACCEPT = ['upright','rotated']`。upright＝中文直排（bodyPr vert＝eaVert／wordArtVert），rotated＝整行旋轉 90°（rot＝-5400000，Excel 預設）。老師 2026-10-06 決定：直排最好，但 Google 試算表沒有直排，所以旋轉 90° 也算對（通過時附註建議改直排）；只有水平才不過
  - 學生頁：「🔬 上傳作業自我檢查」看鑑識報告；第 4 關沒過時不顯示隱藏關卡的分數（不劇透）；檔案學號跟登入學號不同會警告
  - 老師頁 ③：一次選或拖進全班 .xlsx → 每人每關分數、總分、提醒（同學號多份檔案、數據對不上、打不開）、「詳情」只列未達成項目；列出 ① 名單中沒交檔案的人；匯出 Excel（批改總表＋逐項明細 ✓／✗）
  - 測試：用 openpyxl 產生的作業檔與 LibreOffice 另存的版本（模擬 Excel 存檔、含計算結果）：全對 41/41、隱藏關 4/4（2026-10-07 調整後）；各種常見錯誤都有對應提示；改用別人數據會被抓到
  - 限制：只認 Excel 的 .xlsx（Google 試算表下載的 .xlsx 理論上可讀但未實測）；Excel 2016 新圖表類型（chartEx）不支援
- **第三階段：雲端紀錄＋即時進度＋破案牆（2026-10-06）**
  - Firebase 路徑 `excel-rescue/<學期>/<學號>`：`name`、`ts`（最後更新）、`passed: {L1…L6,H: 過關時間}`、`att: {同上: 嘗試次數}`、`closedAt`（六關全破時間）、`check: {score,max,at,lv}`（最近一次 Excel 自我檢查）。安全規則見附錄（學期與學號格式檢查、欄位型別檢查、不能刪除、不允許其他欄位）
  - core 新增 `cloudGet／cloudPut／cloudAll`（REST，8 秒逾時，問完就走不佔連線）、`mergeProgress`（過關取聯集、時間取早；嘗試次數取大；自我檢查取最新）、`toRecord`
  - 學生頁：登入時讀回雲端進度並合併（**換電腦可以接續**）；每次作答、過關、自我檢查後上傳整筆紀錄；連不上時照常可玩，顯示「📴 進度先存在這台裝置」，恢復網路或下次作答時補傳。localStorage 的 `passed` 由 true 改成過關時間（舊資料自動轉成 1＝時間不明）
  - 老師頁改成分頁：🗂️ 設定與名單（學期、學生連結、全班名單）／📡 即時進度／🖥️ 破案牆／🔍 驗證代碼／🔬 批改 Excel／🔑 答案表；記住上次開的分頁
  - 📡 即時進度：人數、已結案、隱藏徽章、「有一關試 3 次以上還沒過」人數；各關破解人數、卡關人數、過關平均嘗試次數、🔥 最卡的一關；每人每關 ✓n／✗n／·、結案時間、自我檢查分數、最後活動；可依學號／進度排序；勾「只看全班名單」會補上未開始的人；匯出 Excel（闖關進度＋嘗試次數）
  - 🖥️ 破案牆（投影）：調查員數、已結案、隱藏徽章；六個案件的破解進度條與 🥇 首破；🏆 最速結案前 5 名；📰 即時動態（最新 7 則）；可全螢幕、可遮名字中間（王○明）
  - **只有在「即時進度」或「破案牆」分頁、而且畫面看得到時才每 10 秒讀一次**（讀整個學期節點）。流量估算：每位學生約 0.3～0.5 KB，一班 35 人每次約 15 KB，開一節課約 6 MB；若全年級共用同一個學期代碼（300 人）每次約 120 KB、一節課約 40 MB，仍遠低於每月 10 GB。想更省就用「學期＋班級」代碼（如 115-1A）
  - **要在 Firebase 後台貼上新規則才會生效**（附錄全文，或 `family-points/firebase-rules-merged.json`）；規則還沒更新前，學生寫入會被拒絕，學生頁顯示離線、進度只存在本機
  - 測試：假 Firebase 模擬 28 人闖關（各種進度、卡關、結案、隱藏徽章）→ 儀表板數字、排序、最卡的一關、破案牆、自動更新都正確；換裝置接回 2 關進度；離線可玩
- 已知限制：Firebase 規則開放寫入（跟其他工具一樣），懂技術的學生可以偽造進度；正式成績建議以「批改 Excel」為準，進度與代碼當作參考

### 💰 集點小金庫（family-points/index.html，2026-10-06 新增）

- 用途：家庭用的集點系統（爸爸＝管理員、小孩＝使用者）。孩子回報表現得點、兌換獎品；爸爸審核。
- **入口**：2026-10-06 起，首頁「Drawer V 親子」抽屜有「集點小金庫」卡片（`family-points/`）。**`family-points/` 頁面本身不放任何連回首頁的連結**（孩子會用這一頁）。網址：`https://puff0223-chwu.github.io/wuyutzu-tools/family-points/`；頁面有 `noindex`，搜尋引擎不收錄。
- 資料夾內三個檔：`index.html`（整個系統，單檔）、`firebase-rules-merged.json`（合併後的完整規則）、`SETUP.md`（Firebase 後台設定步驟）。
- **與其他工具最大的差別：用 Firebase Authentication 登入**，並載入 Firebase SDK（ES module）；其他工具都是 REST 免登入。
  - 爸爸：Email＋密碼（Firebase 後台手動建立帳號，再把 UID 登記到 `fp/admins/<UID> = true`）。
  - 小孩：爸爸在「人員」分頁建立「登入名稱＋PIN」（PIN 最短 4 字，數字或英文皆可，見下方「PIN 補尾巴」），系統在背後用第二個 Firebase app（`"secondary"`）建帳號，這樣建立小孩帳號時爸爸不會被登出。孩子忘記 PIN 可由爸爸換發，點數紀錄會接回來。
  - 瀏覽器會記住登入狀態。
- firebaseConfig：與既有頁面同一個專案（Point-Collection Stash，`point-collection-stash`，新加坡 asia-southeast1）。既有頁面只用 `databaseURL`（REST），沒有 apiKey 等欄位可對照；`databaseURL` 一致，未做修改。
- **PIN 補尾巴機制（2026-10-06）**：Firebase 密碼至少 6 字元，但孩子的 PIN 最短 4 字。程式在 PIN 後面自動補固定尾巴 `-fp-kid`（孩子看不到）再送給 Firebase。
  - 登入：先用「PIN＋尾巴」；失敗且 PIN 長度 ≥ 6，才再試原始 PIN，以相容最早建立的 6 碼帳號（當時沒有補尾巴）。
  - 孩子「改密碼」最短 4 字；爸爸改密碼維持最短 6 碼（爸爸是 Email 帳號，沒有補尾巴）。
- **重複回報（2026-10-06）**：孩子可對同一個表現項目重複回報（以前送出後會鎖成「等審核中」）。每個項目下方顯示「已送出 N 次，等爸爸審核」；爸爸在「待審核」逐筆核准或退回。每次回報都是 `ledger` 裡一筆獨立的 `pending` 紀錄，規則不需修改。
- **資料結構（`fp/` 抽屜）**：

```
fp/
├── admins/<uid>: true                      管理員名單（布林值 true，不是字串）
├── users/<uid>: { kidId, loginName }       登入帳號 → 小孩的對應
├── kids/<kidId>: { name }                  小孩基本資料（與登入帳號分開，之後做會員網站可沿用）
├── config/{ behaviors, rewards, diceFaces } 表現行為、獎品、骰子倍數（第一次進入自動建立示範資料）
└── ledger/<kidId>/<entryId>: { kidId, kind, refName, basePoints?, multiplier?, amount, status, createdAt, resolvedAt? }
      kind：earn（孩子回報）／redeem（兌換）／adjust（爸爸手動加扣）
      status：pending → approved／rejected
```

- **規則設計（`fp` 區塊，併入原有規則，其他抽屜不動）**：
  - `fp/admins/<uid>`：只有本人能讀，**沒有任何人能寫**（只能在 Firebase 後台手動加，避免被提權）。
  - `fp/users`：管理員可讀全部、可寫；每個人只能讀自己的 `<uid>`。
  - `fp/kids`：管理員可讀寫；小孩只能讀 `users/<自己uid>/kidId` 對應的那一筆。
  - `fp/config`：管理員與已登記的小孩可讀；只有管理員能寫。
  - `fp/ledger/<kidId>`：管理員可讀寫全部；小孩只能讀自己的；小孩**只能新增**自己的紀錄，且必須 `status=pending`、`kind` 為 earn 或 redeem、`amount > 0`，不能改、不能刪、不能自己核准。`.validate` 要求必填欄位、`kidId` 與路徑一致、`refName` 為字串且 < 60 字、`status` 只能是三種之一。
  - 根目錄仍全部上鎖；**不要再用 `.read/.write: true` 全開規則**。
- ⚠️ 規則是**合併**進現有規則，不是整份取代；後台貼上時要保留原有 missing-equipment、ph-generator、unit-convert、case-board 區塊。
- ⚠️ 需要在 Firebase 後台手動做（程式碼無法代勞）：啟用 Email/Password 登入、建立爸爸帳號、登記 `fp/admins/<UID>`、貼上並發布規則。步驟見 `family-points/SETUP.md`。
- 備份：「備份/帳號」分頁可匯出 CSV。

### 🧹 打掃徵才 v4

- 老師在管理頁產生學生登記連結；學生資料透過 Google 表單送出
- 志願 1～5 是表單「文字題」，避免老師調整打掃項目後送出失敗

---

### 兩個老師頁共通

- 所有老師頁（pH、單位換算、公告欄、消失的實驗數據）右上角都有「🏠 回事務所首頁」，列印時自動隱藏

- 「最近用過」題組碼清單存在老師瀏覽器的 localStorage（最多 20 筆），每個題組碼旁有 ✕ 可移除，也可「全部清除」
- 移除只影響清單，**學生的作答紀錄仍在 Firebase**；要再看某個題組碼，在「載入以前的題組碼」輸入即可；真的要刪作答資料，請到 Firebase 後台刪 `ph-generator/<題組碼>` 或 `unit-convert/<題組碼>`
- 「消失的實驗器材」是第一案，三個工具共用「化學實驗室 No.223」的故事世界

## 7. 已知注意事項

- **Firebase 免費額度（Spark，2026-10-06 查）**：儲存 1 GB、每月下載 10 GB、同時連線 100 條。估計每月下載不到 1 GB；要留意的是同時連線。pH、單位換算、器材排行榜都是「問完就走」的一次性請求，不長期佔連線；**長期佔連線的只有公告欄（SSE 即時同步）和集點小金庫**。公告欄學生頁切到背景超過 60 秒或關閉分頁就自動斷線、回到畫面自動重連（2026-10-06）。用量看 Firebase 控制台 → Realtime Database →「用量」

- 部署後看不到更新 → 多半是瀏覽器快取，用無痕視窗或 `Ctrl+Shift+R`
- Claude Artifact 裡的網頁連不到 Firebase／外部網站；GitHub Pages 上的網頁可以
- Google Apps Script 在學校與個人帳號都被擋，不要用來當後端

---

## 附錄：Firebase 安全規則全文（2026-10-06，含集點小金庫 fp、消失的實驗數據 excel-rescue）

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "missing-equipment": {
      "scores": {
        ".read": true,
        "$id": {
          ".write": "newData.exists() && (!data.exists() || newData.child('score').val() > data.child('score').val() || (newData.child('score').val() == data.child('score').val() && newData.child('seconds').val() < data.child('seconds').val()))",
          ".validate": "newData.hasChildren(['cls','seat','name','score','correct','wrong','seconds','ts']) && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 3000 && newData.child('seconds').isNumber() && newData.child('correct').isNumber() && newData.child('correct').val() <= 30 && newData.child('name').isString() && newData.child('name').val().length <= 12"
        }
      }
    },
    "unit-convert": {
      "$code": {
        ".read": "$code.matches(/^[2-9A-HJ-NP-Z]{7}$/)",
        "$sid": {
          ".write": "newData.exists() && $code.matches(/^[2-9A-HJ-NP-Z]{7}$/) && data.child('submitted').val() != true",
          ".validate": "newData.hasChildren(['cls','seat','name','ts']) && newData.child('cls').isString() && newData.child('cls').val().length <= 10 && newData.child('seat').isNumber() && newData.child('name').isString() && newData.child('name').val().length <= 12"
        }
      }
    },
    "ph-generator": {
      "$code": {
        ".read": "$code.matches(/^[2-9A-HJ-NP-Z]{7}$/)",
        "$sid": {
          ".write": "newData.exists() && $code.matches(/^[2-9A-HJ-NP-Z]{7}$/) && data.child('submitted').val() != true",
          ".validate": "newData.hasChildren(['cls','seat','name','ts']) && newData.child('cls').isString() && newData.child('cls').val().length <= 10 && newData.child('seat').isNumber() && newData.child('name').isString() && newData.child('name').val().length <= 12"
        }
      }
    },
    "case-board": {
      "$code": {
        ".read": "$code.matches(/^[2-9A-HJ-NP-Z]{6}$/)",
        "meta": {
          ".write": "$code.matches(/^[2-9A-HJ-NP-Z]{6}$/) && newData.exists()",
          ".validate": "newData.hasChildren(['title','createdAt']) && newData.child('title').isString() && newData.child('title').val().length <= 40"
        },
        "members": {
          "$sid": {
            ".write": "newData.exists() && root.child('case-board').child($code).child('meta').exists()",
            ".validate": "newData.hasChildren(['cls','seat','name']) && newData.child('cls').isString() && newData.child('cls').val().length <= 10 && newData.child('name').isString() && newData.child('name').val().length <= 12"
          }
        },
        "tasks": {
          "$tid": {
            ".write": "newData.exists() && root.child('case-board').child($code).child('meta').exists() && (data.exists() || (newData.child('status').val() == 'open' && root.child('case-board').child($code).child('meta').child('open').val() != false))",
            ".validate": "newData.hasChildren(['sid','name','seat','status','createdAt']) && newData.child('status').val().matches(/^(open|taken|done|cancelled|removed)$/) && (!data.exists() || newData.child('sid').val() == data.child('sid').val()) && (!(data.child('status').val() == 'taken' && newData.child('status').val() == 'taken') || newData.child('solver').val() == data.child('solver').val()) && (data.child('status').val() != 'done' || newData.child('status').val() == 'done' || newData.child('status').val() == 'removed') && (newData.child('status').val() != 'taken' || (newData.child('solver').isString() && newData.child('solver').val() != newData.child('sid').val())) && (newData.child('status').val() != 'done' || (newData.child('stars').isNumber() && newData.child('stars').val() >= 1 && newData.child('stars').val() <= 3)) && (!newData.child('note').exists() || (newData.child('note').isString() && newData.child('note').val().length <= 80))"
          }
        }
      }
    },
    "excel-rescue": {
      "$sem": {
        ".read": "$sem.matches(/^[A-Z0-9-]{1,16}$/)",
        "$id": {
          ".write": "newData.exists() && $sem.matches(/^[A-Z0-9-]{1,16}$/) && $id.matches(/^[A-Z0-9]{3,12}$/)",
          ".validate": "newData.hasChildren(['name','ts']) && newData.child('name').isString() && newData.child('name').val().length <= 12 && newData.child('ts').isNumber()",
          "name": {
            ".validate": "newData.isString()"
          },
          "ts": {
            ".validate": "newData.isNumber()"
          },
          "passed": {
            "$lv": {
              ".validate": "$lv.matches(/^(L[1-6]|H)$/) && newData.isNumber()"
            }
          },
          "att": {
            "$lv": {
              ".validate": "$lv.matches(/^(L[1-6]|H)$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999"
            }
          },
          "closedAt": {
            ".validate": "newData.isNumber()"
          },
          "check": {
            ".validate": "newData.hasChildren(['score','max','at']) && newData.child('score').isNumber() && newData.child('max').isNumber() && newData.child('at').isNumber()"
          },
          "$other": {
            ".validate": false
          }
        }
      }
    },
    "fp": {
      "admins": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid"
        }
      },
      "users": {
        ".read": "auth != null && root.child('fp/admins').child(auth.uid).val() === true",
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && root.child('fp/admins').child(auth.uid).val() === true"
        }
      },
      "kids": {
        ".read": "auth != null && root.child('fp/admins').child(auth.uid).val() === true",
        "$kid": {
          ".read": "auth != null && root.child('fp/users').child(auth.uid).child('kidId').val() === $kid",
          ".write": "auth != null && root.child('fp/admins').child(auth.uid).val() === true"
        }
      },
      "config": {
        ".read": "auth != null && (root.child('fp/admins').child(auth.uid).val() === true || root.child('fp/users').child(auth.uid).exists())",
        ".write": "auth != null && root.child('fp/admins').child(auth.uid).val() === true"
      },
      "ledger": {
        ".read": "auth != null && root.child('fp/admins').child(auth.uid).val() === true",
        "$kid": {
          ".read": "auth != null && root.child('fp/users').child(auth.uid).child('kidId').val() === $kid",
          "$entry": {
            ".write": "auth != null && (root.child('fp/admins').child(auth.uid).val() === true || (root.child('fp/users').child(auth.uid).child('kidId').val() === $kid && !data.exists() && newData.exists() && newData.child('status').val() === 'pending' && (newData.child('kind').val() === 'earn' || newData.child('kind').val() === 'redeem') && newData.child('amount').val() > 0))",
            ".validate": "newData.hasChildren(['kidId', 'kind', 'refName', 'amount', 'status', 'createdAt']) && newData.child('kidId').val() === $kid && newData.child('amount').isNumber() && newData.child('refName').isString() && newData.child('refName').val().length < 60 && (newData.child('status').val() === 'pending' || newData.child('status').val() === 'approved' || newData.child('status').val() === 'rejected')"
          }
        }
      }
    }
  }
}
```
