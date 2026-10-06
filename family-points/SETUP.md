# 集點小金庫（獨立版）設定與部署說明

這個版本是一個獨立網頁（`index.html`），資料存在 Firebase Realtime Database，
登入用 Firebase Authentication。不再依賴 claude.ai，孩子不需要 Claude 帳號。

## 一、Firebase 後台要做的事（約 10 分鐘，只做一次）

### 1. 開啟 Email/Password 登入
Firebase 控制台 → 建構 (Build) → Authentication → 開始使用 → Sign-in method
→ 選「電子郵件/密碼 (Email/Password)」→ 啟用第一個開關 → 儲存。
（不用開「電子郵件連結」那個。）

### 2. 建立爸爸（管理員）帳號
Authentication → Users → 新增使用者 → 輸入你的 Email 和密碼 → 新增。
建立後，在使用者列表找到這一列，複製「使用者 UID」（一長串英數字）。

### 3. 把這個 UID 登記成管理員
Realtime Database → 資料 (Data) 分頁 → 在資料庫根目錄新增：

    fp
     └─ admins
         └─ <貼上你的 UID>: true

做法：把滑鼠移到最上面那一列（資料庫網址），點右邊出現的「＋」，
「名稱」欄位直接輸入完整路徑：

    fp/admins/<貼上你的 UID>

「值」欄位輸入 `true`（不要加引號），按「新增」。

注意：
- `true` 要是布林值，不是文字 "true"。
- **不要使用「匯入 JSON」放在最上面那一列**：匯入會把那個位置的資料整個蓋掉，
  包含你其他工具（例如排行榜）已經存的資料。

### 4. 更新資料庫規則（重要：合併，不是整份取代）
Realtime Database → 規則 (Rules) 分頁。

你的資料庫裡已經有別的工具在用（例如排行榜的規則區塊），**請保留原有區塊**，
只把 `firebase-rules-fp.json` 裡 `"fp": { ... }` 那一整段，
貼到現有 `"rules": { ... }` 裡面，和其他區塊並列（記得逗號）。

合併後長這樣（示意）：

    {
      "rules": {
        ...你原本的規則（例如 missing-equipment 等）...,
        "fp": {
          ...firebase-rules-fp.json 裡 fp 的內容...
        }
      }
    }

按「發布」。以前那種 `".read": true, ".write": true` 的全開規則請不要再用，
否則孩子可以直接改資料庫。

## 二、放上網站

建議放在 wuyutzu-tools 專案裡的獨立資料夾，**不要**從首頁或任何學生頁面連過去：

    family-points/index.html

網址會是：
https://puff0223-chwu.github.io/wuyutzu-tools/family-points/

（網頁已加上 noindex，搜尋引擎不會收錄。）
部署後約 5 分鐘生效，用 Ctrl+Shift+R 或無痕視窗測試。

## 三、第一次使用

1. 打開網址 →「爸爸登入」→ 輸入第二步建立的 Email 和密碼。
2. 第一次進入會自動建立示範的表現行為、獎品與骰子倍數，可到各分頁修改。
3. 到「人員」分頁新增小孩：填顯示名字、登入名稱（英數字）、PIN（至少 4 個字，數字或英文都可以）。
4. 孩子在自己的裝置打開網址 →「我是小孩」→ 輸入登入名稱和 PIN。
   瀏覽器會記住登入狀態，之後直接打開就能用。

## 四、日常維運

- 孩子忘記 PIN：「人員」分頁 →「忘記 PIN / 換登入帳號」→ 換發新的登入名稱和 PIN，點數紀錄會接回來。
- 爸爸忘記密碼：登入畫面「忘記密碼？寄重設信」。
- 孩子可自己在右上角「改密碼」改成自己好記的 PIN（至少 4 個字）。
- 備份：「備份/帳號」分頁 → 匯出 CSV。

## 五、給 Claude Code 的部署指令（複製貼上即可）

    請把 family-points/ 資料夾（index.html、firebase-rules-fp.json、SETUP.md）
    加到 wuyutzu-tools 專案的 family-points/ 目錄，commit 並 push 到 GitHub（main）。
    依照既有流程：clone 到 Temp、使用 PAT、push 後刪除 clone。
    不要在首頁 index.html 或任何學生頁面加入連結。
    完成後依照常規，把這次開發紀錄與重要設計（資料結構、規則、帳號機制）
    同步寫進 repo 的 DEVELOPMENT.md。

## 附：資料結構（給未來的會員網站參考）

    fp/
      admins/{uid}: true               管理員名單
      users/{uid}: {kidId, loginName}  登入帳號 → 小孩的對應
      kids/{kidId}: {name}             小孩基本資料（與登入帳號分開）
      config/{behaviors, rewards, diceFaces}
      ledger/{kidId}/{entryId}: {kidId, kind, refName, basePoints?, multiplier?, amount, status, createdAt, resolvedAt?}

- kind：earn（孩子回報）、redeem（兌換）、adjust（爸爸手動加扣）
- status：pending → approved / rejected
- 孩子只能新增自己的 pending 紀錄，無法改點數或核准；只有管理員能審核。
- 小孩資料與登入帳號分開存，之後做會員網站可直接沿用。
