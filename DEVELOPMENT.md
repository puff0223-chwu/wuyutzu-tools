# 🛠️ 巫魚子教學工具箱：開發與整合說明

> 給未來的自己（和 Claude）看的說明書：這個網站怎麼組成、資料放哪裡、要新增工具時怎麼接進來。
> **每次開發的過程與決定記在 [CHANGELOG.md](CHANGELOG.md)（開發歷程）**，每次開發結束都要同步更新本檔與 CHANGELOG。
> 最後更新：2026-10-09

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
│   ├── seating.html              # 舊版座位安排系統（新版確認可用前，首頁仍連到這裡）
│   ├── seating/                  # 🪑 座位大作戰（新版換座位整合系統，2026-10-09 第一階段）
│   │   ├── index.html            #   老師後台（登入、7 個分頁、投影舞台、A4 列印）
│   │   ├── app.js                #   老師後台程式
│   │   ├── core.js               #   共用核心：地圖、相鄰判斷、受限隨機分配、匯入解析
│   │   └── firebase-rules-merged.json # 加上 seating 後的完整 Firebase 規則
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
│   ├── case-board-teacher.html   # 案件委託公告欄：老師頁（開設、投影牆、統計）
│   ├── sci-history/              # 📖 時光手稿：科學史大冒險（抉擇＋平行時空版）
│   │   ├── index.html            #   學生頁：登入、知識網路、排行榜、劇本
│   │   ├── teacher.html          #   老師頁：QR、學生統計、遊戲歷程、抉擇分析、Excel
│   │   ├── core.js               #   規則（金幣、借款、計分）、Firebase 存取
│   │   ├── data.js               #   科學家知識網路（needs、LIS 影片）
│   │   ├── art.js                #   插圖庫（自繪 SVG：情境、證據圖示、實驗器材）
│   │   ├── ch-lavoisier.js       #   第一章劇本資料：拉瓦節
│   │   ├── ch-proust.js          #   第二章劇本資料：普魯斯特
│   │   ├── ch-dalton.js          #   第三章劇本資料：道耳頓
│   │   ├── ch-gaylussac.js       #   第四章劇本資料：給呂薩克
│   │   ├── ch-avogadro.js        #   第五章劇本資料：亞佛加厥
│   │   ├── ch-mendeleev.js       #   第六章劇本資料：門得列夫
│   │   ├── ch-thomson.js         #   第七章劇本資料：湯姆森
│   │   ├── ch-rutherford.js      #   第八章劇本資料：拉塞福
│   │   ├── ch-millikan.js        #   第九章劇本資料：密立根
│   │   ├── ch-bohr.js            #   第十章劇本資料：波耳
│   │   ├── ch-moseley.js         #   第十一章劇本資料：莫斯利
│   │   ├── ch-chadwick.js        #   第十二章劇本資料：查兌克
│   │   └── quiz.js               #   總結測驗「猜猜我是誰」題庫與出題（QUIZ）
│   └── sci-history-rpg/          # 🗄️ 舊的薩爾達式 RPG 試玩版（不在首頁，保留給未來其他領域參考）
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
| **瀏覽器 localStorage** | 舊版座位、打掃徵才管理頁、選人 | 只存在那一台電腦的瀏覽器，換電腦就沒了；常搭配 Excel 匯出備份 |
| **Google 表單無聲送出** | DISC、貝爾賓、打掃徵才學生頁 | 學生送出→進老師的 Google 表單；只能「寫入」，網頁讀不回來 |
| **Firebase Realtime Database** | 消失的實驗器材（排行榜）、pH 練習與單位換算練習（作答紀錄）、No.940 案件委託公告欄（委託與成員）、座位大作戰（老師登入後的班級資料） | 可寫可讀、即時；全班共用 |
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
└── seating/                                   ← 座位大作戰（需登入，只有班級擁有者能讀寫）
    ├── owners/<老師uid>/<班級id>: { name, updatedAt }   ← 班級清單索引
    └── classes/<班級id>: { owner, name, teacherTitle, roster[], layout, cadres[], cleaning[], secret[], settings, rounds[], currentRound, … }
```

- **安全規則**（2026-10-03 發布）：根目錄全部上鎖。
  - `missing-equipment/scores`：可讀；每位學生的紀錄只有在「分數更高，或同分但用時更短」時才能覆蓋，不能刪除；分數 0～3000。
  - `ph-generator/<題組碼>`、`unit-convert/<題組碼>`：可讀；題組碼必須是 7 碼合法字元；可新增或更新，但**交卷（submitted=true）後就不能再改**，不能刪除。
  - 規則全文見本檔最後的附錄。
- ⚠️ **之後新工具要用 Firebase**：要在規則裡為它新增一個抽屜的規則，否則會被擋（HTTP 401/403）。
- **`seating/` 抽屜（座位大作戰，2026-10-09）**：老師用 Email 登入（座位系統專用帳號），每個班級記錄 `owner`，規則只讓擁有者讀寫；未來分享給其他老師只要幫對方開帳號。
- **`fp/` 抽屜（集點小金庫，2026-10-06）**：使用 Firebase Authentication（登入）的工具，規則依登入身分判斷（admins／users／kids／config／ledger），詳見第 6 節「集點小金庫」與附錄規則。
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

### 📖 時光手稿：科學史大冒險（chemistry/sci-history/，2026-10-07）
- 定位：科學史抉擇遊戲。學生扮演**投資人**，在科學史的分岔點選擇支持哪個論點；重點是讓大腦花時間在推理，不是操作
- 規則（老師訂，數字都在 `core.js` 的 `CONFIG`）：
  - 起始 8 金幣；每個實驗固定 1 金幣（固定價格，避免價格暗示正確路線）
  - 支持錯誤論點 → 虛構的平行時空劇情（逐段顯示）→ 標示「純屬虛構」→ 真實歷史中這個論點的下落與未來可能的價值 → 扣 3 金幣，回到本章開頭
  - 已買過的實驗結果在重來時保留；重來時開場可快轉，但每個抉擇都要重新選
  - 分岔點「第一次就選對」→ 破關時擲一顆投資回報骰（1,1,2,2,2,3）；骰子在最後一個抉擇選對的當下就決定並存檔，結算畫面只是播放動畫（重新整理不能重擲）
  - 開啟第二位以後的科學家劇本，補助 2 金幣
  - 金幣 < 0＝破產 → 向大師銀行借 8 金幣（最多 2 次）；第 3 次破產整局重來（金幣、破關全部歸零，`gameOvers` 與歷程保留）
  - 錢包列有「還款 8 金幣」按鈕（有負債且金幣 ≥ 8 才出現）
  - 總分＝金幣 − 借款×3 ＋ 還款×4 − 重來×1 ＋ 全對破關章數×5（全對＝這章沒有掉進平行時空）
  - **重玩**（2026-10-07 晚加入）：知識網路下方「全部重玩」、已破關科學家卡片上「重玩劇本」；每按一次 `replays`+1、總分 −1，寫入歷程（replay_all／replay_ch）
    - 重玩單一科學家：先退回這章拿到的回報骰金幣、取消這章的全對獎勵（避免重玩刷分），再從頭挑戰
    - 全部重玩：金幣、借款、還款、重來、破關全部歸零（`freshRun`），但 `replays`、`gameOvers` 保留
    - **全部科學家都破關後**按全部重玩＝自由練習：先把正式紀錄存在記憶體，`SHC.setFree(true)` 後不寫 Firebase、不記歷程，排行榜關閉；按「結束自由重玩」回到正式紀錄
  - 破關時間：只計算劇本畫面開著、分頁在前景時的時間
- 抉擇頁版面（易讀性改版）：窄欄 760px，分成 ①發生了什麼事 ②目前知道的證據 ③實驗室（每個實驗一列，**結果直接展開在該實驗底下**）④你的決定；做實驗後畫面停在原位置
- 插圖（2026-10-07 晚）：全部自繪 SVG，放在 `art.js`（`ART.scene / icon / exp`），不需網路、沒有版權問題（工作環境連不到 Wikimedia，且外連圖片怕失效）
  - 劇本資料用 key 指定：分岔點 `pic`（區塊 1 情境圖）、`evIcons`（區塊 2 每條證據的小圖示，順序對應 evidence）、實驗 `pic`（區塊 3 結果裡的器材圖）
  - 新增科學家時，在 art.js 加對應的圖；沒給 key 就不顯示圖，不會壞
- 選項只顯示「論點 A／B／C」，**提出者在選完後才揭曉**（避免學生看到「拉瓦節」就直接選）；選項順序依學生＋分岔點固定亂序
- 錯誤選擇當下就扣錢、存檔，重新整理也躲不掉
- 防連點（崩潰測試後加入）：`choose` 確認後會檢查「目前仍是同一個抉擇且 phase = fork」，否則忽略；畫面先 render 再存檔；`checkBankrupt` 有 BANKRUPTING 鎖；登入有 JOINING 鎖；各「▶ 下一步」按鈕按下即 disabled
- 登入提示 `loginMsg(文字, info)`：info=true 用灰色（讀取中），否則紅色（錯誤）；讀取超過 3 秒顯示「網路比較慢」
- 讀檔：同時讀 localStorage 與 Firebase，比 `updatedAt`，本機較新（斷線時玩的）就用本機的；所有數字欄位缺漏時補預設值；進章節時 `fixChap()` 修正壞掉的 fork／phase／okFork／failed
- 登入：班級、座號、姓名、**學號**、**用途**（正式進度／考試複習／重補修，存最近一次，歷程 login 也記；破關紀錄 done 也記當時用途）
- 學期：老師在老師頁「學期設定」新增／切換／刪除（`sci-history/config` = {current, terms}）；刪除只移出清單、不刪學生資料；沒設定過時用日期推算（8～1 月 -1、2～7 月 -2）
- 身分：`學期_班級_座號`，例如 `115-1_101_7`；換裝置用同樣的班級座號就能接著玩
- 排行榜：總分、各科學家最快破關；範圍：本班／本學期跨班／歷屆全部
- Firebase：`sci-history/players/<sid>`（完整狀態＋分數，排行榜讀這裡）、`sci-history/logs/<sid>`（遊戲歷程陣列：join、start、subsidy、exp、choose、fail、loan、repay、clear、gameover）
- 老師頁（2026-10-07 晚改版，因應 300 位學生、12 位科學家的資料量）：
  - 上方左右並排：學生入口（小 QR）、學期設定
  - 學生統計：學期／班級／用途篩選＋搜尋（姓名、學號、座號）；摘要列一行；快速篩選籤（還沒破關、負資產、借過錢、按過重玩、3 天沒玩，附人數）
  - 表格固定高度 520px、標題列不動、每頁 30 人分頁；預設精簡欄位（狀態用小標籤顯示負資產／負債／重玩／破產重來／全對），勾「顯示完整欄位」才展開全部數字；破關時間欄用下拉選一位科學家，不會因為科學家變多而變寬
  - 點學生→個人卡片：數字摘要、各科學家狀態表、遊戲歷程（可篩選：抉擇／金錢／重玩破產，固定高度捲動）
  - 科學家分析：總覽表一位科學家一列（開始、破關、平均破關時間、一次全對率、各抉擇第一次答對率色塊）；點一列看該科學家每個抉擇的「堆疊色帶」（一個抉擇一行，綠色＝史實路線），選項文字收在「看選項內容與人數」
  - Excel 三張表：學生統計（含各科學家時間與結果）、抉擇分析、遊戲歷程；統計表可排序；點學生看完整歷程；**抉擇分析**＝每個分岔點學生「第一次」選擇的分布（找出常見迷思）；Excel 兩張表
- 已完成章節：拉瓦節（燃燒之謎）、普魯斯特（成分固定之戰）、道耳頓（看不見的原子）
  - 道耳頓三個分岔：怎麼秤原子（放棄／相對原子量／一直切）→ 水裡有幾顆氫（**道耳頓本人選的 HO 是錯的**／需要體積等別的證據／輕的就少）→ 原子可再分嗎（**道耳頓本人的「絕對不可分」是錯的**／化學反應中不可分但可修正／煉金術）
  - 設計重點：「通往真實未來的路」≠「科學家本人的選擇」；道耳頓的錯誤讓學生看到科學的暫時性
  - 給呂薩克三個分岔（**三題正解都是大膽的選擇**）：高空空氣（推理就好／山頂就夠／搭熱氣球到 7000 公尺）→ 體積整數比（誤差巧合／這是定律／例子太少先別下結論）→ 半顆原子（原子可分半／道耳頓：數據有誤／兩顆原子連在一起的新粒子＝分子伏筆）
  - 亞佛加厥三個分岔（橫跨 1811→1860→1909）：同體積同數目（道耳頓：數目不同／正解大膽／只能同種比）→ 被冷落五十年（聽權威貝吉里斯／各自假設／坎尼扎羅整理系統並開會說服）→ 分子真的存在嗎（奧士華：想像工具／佩蘭：多種方法數分子／不屬於科學）
  - 門得列夫三個分岔（1869→1871→1875）：63 張卡片怎麼排（金屬非金屬／依原子量找週期／只研究三元素組）→ 排不進去的元素（嚴守原子量不留空／留空格預言、原子量可能量錯／巧合放棄）→ 鎵的密度 4.7 vs 預言 5.9（認錯改表／寫信說樣品不純請重測／鎵不是類鋁）；嚴守原子量的「未來價值」接到莫斯利的原子序
  - 湯姆森三個分岔（1897→1897→1912–13）：陰極射線是波還是粒子（赫茲：波／改良真空再做一次／先不下結論）→ 粒子有多大（帶很多電的離子／比原子小、所有原子都有／每種金屬各自的粒子）→ 霓虹兩條線（新元素／同一元素不同質量＝同位素，阿斯頓／儀器誤差）；第一題刻意放「赫茲電場不偏轉」當誤導證據，實驗結果再暗示「管內殘留氣體」；葡萄乾布丁模型放在成功劇情與錯誤欄，接拉塞福
  - 原子結構線之後的章節（拉塞福、波耳、查兌克）要注意：湯姆森模型本身是「當時的正解、後來被推翻」，不要把它放成選項的正解
  - 拉塞福三個分岔（1899–1903→1909–11→1917–19）：放射性從哪裡來（化學反應／衰變成別的元素／吸收宇宙能量）→ 金箔散射（湯姆森：多次小散射累積／原子太陽系永遠穩定／原子核）→ 氮氣跑出氫原子核（氫雜質／打出質子／氮碎成 14 顆氫）
  - 密立根三個分岔（1906–09→1910–13→1914–16）：怎麼量 e（雲霧法多做幾百次／單一油滴／用 e/m 數學推導）→ 電荷連續嗎（連續／埃倫哈夫特次電子／一份一份）→ 數據支持自己不相信的愛因斯坦（不發表／光只是粒子／照實發表）
  - 防「選最大膽的就對」：從第八章起，每題刻意放一個「聽起來也很大膽、其實是錯的」選項（原子太陽系、氮碎成氫、次電子、光只是粒子）；密立根第三題的正解是「誠實」，不是大膽也不是謹慎
  - 波耳三個分岔（1912–13→1913→1913–26）：原子為什麼不塌（回到布丁／特定軌道不放能量／原子其實慢慢塌）→ 氫光譜亮線（原子樂器泛音／指紋就好不必解釋／能階躍遷）→ 多電子原子（繼續修補／每種原子各有物理定律／保留能階、需要全新力學）
  - 莫斯利三個分岔（1913→1914→1922–23）：X 光樓梯代表什麼（原子量換算／原子序＝核電荷／流水號巧合）→ 樓梯缺階（規律不可靠／元素有幾百種／只剩四個空位）→ 72 號在哪（于爾班：稀土礦／柯斯特與赫維西：鋯礦／只能人工製造）；第三題延伸到莫斯利過世後，接回波耳的電子排列
  - 查兌克三個分岔（1920→1930–32→1932–38）：原子核質量不夠（質子＋電子主流模型／不帶電的新粒子／能量變質量）→ 鈹射線（約里奧-居禮：γ 射線／不遵守能量守恆／中子）→ 中子能做什麼（沒用途／最好的子彈／煉金發大財）；結尾收束整套遊戲，核分裂一段同時提到核能與核武，語氣持平
  - 12 位科學家全部完成（2026-10-08）；知識網路上莫斯利節點移到 y=22，避免和波耳的星星重疊
- 總結測驗「猜猜我是誰」（2026-10-08，老師的規格）
  - 開放：12 位第一次全部破關時寫入 `ST.quiz.unlocked = true`，之後重玩某位科學家也不會再鎖上；自由重玩中按測驗會先回到正式紀錄
  - 題庫 `quiz.js` 的 `QUIZ.BANK`：86 題，每題 `{id, ch, k: life|contrib|mistake, q, ex}`；題目不能出現該科學家的名字（測試會檢查）；**不要改舊題 id**（老師頁用 id 統計）
  - 出題 `QUIZ.make(ids, 20)`：每位科學家先 1 題，再隨機挑 8 位各加 1 題（同一位最多 2 題），順序打亂；混淆選項從「年代最接近的 6 位」中挑 4 位。學生端說明**不告訴學生每位 1～2 題的規則**（避免暗示）
  - 選項用 A～E 紫色圓圈，不用科學家代表色（避免顏色變提示）
  - 成績獨立、不影響遊戲總分：`players/<sid>.quiz = {unlocked, started, n, first, best, last, total, at}`；每次完成記 log `quiz {n, score, total, ms, items:[[題id, 選的科學家, 1/0]]}`，開考記 `quiz_start`；中途離開只增加 started、不記成績
  - 老師頁：學生表「總結測驗」欄（最高／首次／次數，可排序）、快速篩選「可考但還沒考」、學生卡片顯示每次答錯哪些；「🎓 總結測驗分析」只統計每人**第一次完成**的測驗：各科學家答對率、最常被誤認成誰、最常答錯的 15 題；Excel 新增「總結測驗題目分析」工作表
  - 不需要改 Firebase 規則（存在原本的 players 與 logs 節點裡）
- 清除資料（老師頁 🧹）：`SHC.removePlayer(sid)` 刪除 players/logs、寫入 `deleted/<sid> = 時間`、清掉這台裝置的本機存檔；`SHC.load` 讀取 deleted，本機進度比刪除時間舊就不採用。規則需允許刪除（見附錄 2026-10-08 版）
  - 老師的測驗連結 `index.html?quiz`（老師頁「🎓 總結測驗連結」：複製／投影大 QR／開啟）：不必全破，登入後直接進測驗說明；`QZ.via = 'link'`，log 的 quiz／quiz_start 帶 `via`，`quiz.viaLink` 記次數；用連結考**不會**解鎖遊戲裡的測驗橫幅（一般入口仍顯示 x／12）
  - 情境文字也不能暗示答案（例如「某某科學家提出瘋狂的計畫」會讓學生直接選那一個）
  - 待注意：正解常是「最謹慎、留修正空間」的選項，學生可能學會「選最長最保守的」；之後的章節要讓正解有時是大膽的主張（例如拉塞福的原子核）
  - 普魯斯特三個分岔：化合物成分固定嗎（天然≠人工／定比／跟著原料走）→ 面對柏托雷的反對（放棄／分清混合物與化合物／忽略數據）→ 比例固定的背後（只做表格／原子／親和力表）；第三題的正解導向道耳頓
  - 錯誤論點的「真實歷史」重點：限量試劑、維勒合成尿素、非整比化合物（berthollides）、化學平衡、奧士華晚年才接受原子、親和力表→活性
- 畫插圖注意：**插圖不能洩漏答案**（例如分岔點情境圖不可畫出正解的主張；第三題問「原子」時，實驗圖不畫成小球，改用質量長條）
- 新增科學家：寫一份 `ch-<id>.js`（intro、forks〔scene、evidence、exps、options〔who、text、correct、fail.story、fail.real〕、success〕、ending、orbs、profile），在 index.html 與 teacher.html 的 `CHAPTERS` 註冊，data.js 該節點設 `ready: true`
- 已知限制：沒有登入，懂技術的學生可以直接改資料庫裡自己的分數（同其他小工具）
- 舊的 RPG 版移到 `sci-history-rpg/`：老師試玩後認為走路、閃躲佔掉太多思考時間、開發成本高，不適合科學史；鑑識課這類「探索本身就是學習」的主題可以再用

### 🪑 座位大作戰（classroom/seating/，2026-10-09 第一階段）

- 取代舊的 `classroom/seating.html`，把「Google 表單暗標 → 手動比序 → 舊座位系統 → 投影隨機 → Excel 座位表」整合成一個系統；完整規格見專案文件「座位大作戰_開發規格書.md」
- **登入**：Firebase Auth Email（座位系統專用帳號，和集點小金庫分開）；也可選「本機模式」（只存在那台裝置，給試用或沒有帳號的老師）
- **資料分兩層**：班級層（名單、地圖、幹部、打掃、秘密規則、設定，整學期沿用）＋回合層（每次換座位一個回合：地圖快照、鎖定座位、抽籤結果、狀態 prep → drawn → final）
- **地圖座標**一律存「學生視角」：r=0 最前排（靠講台）、c=0 學生左手邊；`cells` 只記關閉 `x`／走道 `a`；周邊標示 `marks` 的 side 是 front/back/left/right。`SeatCore.viewOf()` 負責轉成講台視角（整張圖轉 180°）
- **相鄰**（老師決定：隔走道也算相鄰）：先抽掉「整排或整列都是走道」的排／列，再看周圍八格
- **秘密規則**（2026-10-10 改成多人）：`{ type:'apart', who:[座號…] }` 這幾人彼此都不相鄰（2 人以上，所有兩兩組合都檢查）；`{ type:'zone', who:[座號…], mode, list }` 這幾人都只能坐某幾排／某幾列／指定座位。可新增、✏️ 修改、暫停、刪除；選學生用名單小圓鈕多選。舊格式（a、b／單一 who）讀取時由 `SeatCore.members()` 自動轉換。只在後台出現，投影舞台與座位表看不到
- **受限隨機**：沒有規則時直接 Fisher–Yates 洗牌（已測 4000 次，每格機率平均）；有規則時限制多的人先排＋隨機回溯；排不出來時投影只顯示「請老師確認設定」，後台的「檢查規則」會逐條暫停找出是哪幾條互相衝突
- **鎖定座位**（第一階段手動）：🏆 得標／📌 老師預留＋老師備註；鎖定的人違反「不相鄰」時標成「⏸ 待老師決定」，進投影舞台前會再確認
- **投影舞台**：🎯 抽一位同學（跑馬燈）→ 🎲 開始分配（先一次算好，再一格一格翻牌揭曉，可調速度、⏩ 全部揭曉）；自動螢幕常亮；預設學生視角
- **揭曉後**：後台點兩個座位互換（違反規則會提醒），✅ 定案
- **A4 座位表**：仿老師的 Excel 版面（座位圖＋幹部框＋打掃區域＋底部備註＋適用期間）；版面依內容自動分欄（幹部或打掃太長就分兩欄）、整體縮放、被寬度卡住時自動把格子拉高填滿；列印用 `@page A4 landscape`，只印座位表；也可下載 Excel（座位表／幹部／打掃三張表）
- **打掃匯入**（介面稱「匯入打掃工作內容」，不出現「打掃徵才」字樣）：Excel 一列一人，欄位 `打掃項目`（也接受打掃徵才 v3.4 的 `中籤打掃項目`）、`座號`、`姓名`（可省略）；「[教室]地板天花板」自動拆成區域＋項目；有「範例檔」可下載；單向匯入，不連動打掃徵才系統
- **備份**：班級資料可下載／還原 JSON；雲端寫入失敗時會在本機留一份暫存（`seating3_cache_<班級id>`）
- 第二階段（未做）：學生暗標頁 `bid.html`、比序規則編輯器、自動開標、截止時間、資源回收清單；Firebase 會再加 `seating/rounds/<回合代碼>`（規格書第 8 節）
- **兩種模式**（`settings.gameMode` = game／plain）：新增班級時選「🎮 巫魚子老師遊戲化模式」或「🪑 一般模式」，說明收在 ❓ 按鈕裡；之後在「班級資料」用「切換模式」改。一般模式下不出現任何暗標、得標、🏆 等遊戲用語與設定（「🎮 遊戲化設定」卡片也只在遊戲化模式出現），鎖定座位只叫「📌 指定」
- 遊戲化模式預設帶入 16 個幹部職位與任課老師備註；一般模式不預設幹部、座位表只印座位圖。新增班級可勾「複製目前班級的教室地圖、幹部職位與備註」。已存在的班級沒有幹部欄位時視為「清空」，不會補回預設（Firebase 會吃掉空陣列）
- **打掃工作跟著回合走**（2026-10-09 改）：老師換打掃的頻率不同（一學期一次、每次段考、每月），所以每個回合有自己的 `cleaning`；開新回合時選「沿用上一回合」或「先空白」，打掃分頁可切換回合、「📋 沿用上一回合」、匯入打掃徵才結果、手動新增。`cleaningSet` 旗標用來分辨「這回合清空了」與「舊資料還沒有自己的打掃」（後者沿用班級層 `cleaning`）。不再提供預設打掃項目
- **座位表版型**（下拉選單）：完整版（座位＋幹部＋打掃）／座位＋幹部／座位＋打掃／只有座位圖；標題可自訂（`settings.sheetTitle`，空白自動產生）
- **教室地圖頁**改成上方工具列（大小、畫筆、視角）＋左側地圖、右側周邊標示卡片
- **名單貼上順序**改為「座號 姓名 學號」；會自動找出含 4 位以上數字的那一欄當學號，所以舊順序也讀得懂；不使用暗標時學號可空著
- **📺 投影專用連結** `classroom/seating/#stage=<班級id>`：在投影裝置打開會直接進投影舞台（目前選取的回合），離開舞台只顯示待機畫面，要按「回後台」並確認才會出現後台
- **換座位頁**（2026-10-10 重排）：上方工具列（回合下拉、開新回合、名稱、適用期間、刪除）；左邊地圖（🔒 鎖定座位／✏️ 開關座位、視角）；右邊「🎬 投影抽籤」卡片：四格數字（全班、已鎖定、待分配、空位）、需要時才出現的紅色提醒（含自動試算秘密規則能否排出）、一顆「📺 開啟投影舞台」（在新分頁開投影專用連結，被擋時改在原分頁開）＋「複製投影連結」；抽籤後變成「✅ 定案」與「再開一次投影／清除結果重抽」
- **🙈 上課模式**（頂部按鈕，記在這台裝置）：藏起「秘密規則」分頁、違規紅框與相關提醒、「檢查規則」按鈕；關閉時要確認
- **多分頁同步**：回到分頁（focus／切回畫面）時，若雲端或本機有更新的版本就自動換成最新版，避免投影分頁的抽籤結果被後台分頁的舊資料蓋掉
- 第三階段（未做）：遊戲化關閉時的「志願模式」（學生線上選位、衝突抽籤）
- ⚠️ 需要老師在 Firebase 後台手動做：Authentication 新增座位系統專用帳號、貼上 `classroom/seating/firebase-rules-merged.json` 規則

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

## 附錄：Firebase 安全規則全文（2026-10-09，新增座位大作戰 seating：老師登入後只能讀寫自己的班級）

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
  },
  "sci-history": {
   "players": {
    ".read": true,
    "$sid": {
     ".write": "$sid.length <= 30",
     ".validate": "newData.hasChildren(['sid','cls','seat','name','term','coins','score','updatedAt']) && newData.child('sid').val() == $sid && newData.child('name').isString() && newData.child('name').val().length <= 12 && newData.child('cls').isString() && newData.child('cls').val().length <= 10 && newData.child('coins').isNumber() && newData.child('score').isNumber()"
    }
   },
   "logs": {
    ".read": true,
    "$sid": {
     ".write": "$sid.length <= 30",
     ".validate": "newData.hasChildren()"
    }
   },
   "config": {
    ".read": true,
    ".write": "newData.exists()",
    ".validate": "newData.hasChildren(['current','terms']) && newData.child('current').isString() && newData.child('current').val().length <= 6"
   },
   "deleted": {
    ".read": true,
    "$sid": {
     ".write": "$sid.length <= 30",
     ".validate": "newData.isNumber()"
    }
   }
  },
  "seating": {
   "owners": {
    "$uid": {
     ".read": "auth != null && auth.uid === $uid",
     ".write": "auth != null && auth.uid === $uid"
    }
   },
   "classes": {
    "$cid": {
     ".read": "auth != null && data.child('owner').val() === auth.uid",
     ".write": "auth != null && $cid.matches(/^cls[a-z0-9]{6,24}$/) && (data.exists() ? data.child('owner').val() === auth.uid : newData.child('owner').val() === auth.uid)",
     ".validate": "newData.child('owner').val() === auth.uid"
    }
   }
  }
 }
}
```
