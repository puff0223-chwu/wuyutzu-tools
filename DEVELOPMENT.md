# 🛠️ 巫魚子教學工具箱：開發與整合說明

> 給未來的自己（和 Claude）看的說明書：這個網站怎麼組成、資料放哪裡、要新增工具時怎麼接進來。
> 最後更新：2026-10-03

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
├── index.html                    # 工具導覽首頁（卡片＋說明彈窗）
├── DEVELOPMENT.md                # 本說明檔
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
│   └── images/equipment/         # 33 張器材圖片（檔名＝題庫 id）
│
├── gamification/                 # 🎲 課堂遊戲化
│   ├── system.html               # 選人系統＋陣亡詛咒系統
│   ├── poke-game.html            # 戳戳樂
│   └── truth-or-dare.html        # 真心話大冒險
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
| ⚗️ 化學課堂工具 | 🔬 化學學習遊戲 | 消失的實驗器材 |
| | 🎲 課堂遊戲化 | 選人系統、陣亡詛咒、戳戳樂、真心話大冒險 |
| 🎮 遊戲設計思考 | — | 巴圖玩家類型 |

---

## 4. 資料存在哪裡？（四種方式）

| 方式 | 用在 | 特性 |
|---|---|---|
| **不存資料** | 詩籤、金曲歌王、真心話、抽籤、形容詞 | 打開就能用，最單純 |
| **瀏覽器 localStorage** | 座位、打掃徵才管理頁、選人 | 只存在那一台電腦的瀏覽器，換電腦就沒了；常搭配 Excel 匯出備份 |
| **Google 表單無聲送出** | DISC、貝爾賓、打掃徵才學生頁 | 學生送出→進老師的 Google 表單；只能「寫入」，網頁讀不回來 |
| **Firebase Realtime Database** | 消失的實驗器材（排行榜） | 可寫可讀、即時；全班共用排行榜 |

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
```

- **安全規則**（2026-10-03 發布）：根目錄全部上鎖；只開放 `missing-equipment/scores` 可讀；每位學生的紀錄只有在「分數更高，或同分但用時更短」時才能覆蓋，不能刪除；分數 0～3000。
- ⚠️ **之後新工具要用 Firebase**：要在規則裡為它新增一個抽屜的規則，否則會被擋（HTTP 401/403）。
- 與「科學任務偵探所」的 Supabase 完全分開：**Supabase 給大系統、Firebase 給輕量小工具**。

---

## 5. 新增一個工具的步驟

1. 在對應資料夾新增 `新工具.html`（單一檔案，CSS/JS 都寫在裡面）
2. 頁面左上角放一個「← 回到巫魚子的教學工具箱」連結（`../index.html`）
3. 在 `index.html`：
   - 對應分類的 `tool-grid` 裡加一張 `tool-card`（`onclick="openModal('代號')"`）
   - 在 `<!-- ===== MODALS ===== -->` 區加一個 `id="modal-代號"` 的說明彈窗
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

### 🧹 打掃徵才 v4

- 老師在管理頁產生學生登記連結；學生資料透過 Google 表單送出
- 志願 1～5 是表單「文字題」，避免老師調整打掃項目後送出失敗

---

## 7. 已知注意事項

- 部署後看不到更新 → 多半是瀏覽器快取，用無痕視窗或 `Ctrl+Shift+R`
- Claude Artifact 裡的網頁連不到 Firebase／外部網站；GitHub Pages 上的網頁可以
- Google Apps Script 在學校與個人帳號都被擋，不要用來當後端
