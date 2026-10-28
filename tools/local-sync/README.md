# 本機資料夾同步

## 目前做法（2026-10-28 老師決定）
系統量體還不大 → **每次開發或調整完成，同步本機一次**，先不做定時自動化。

- **主要：GitHub Desktop（官方免費程式，有數位簽章，不需要腳本、不需要系統管理員）**
  - 打開 GitHub Desktop → 左上選 `wuyutzu-tools` → 按「Fetch origin」→ 出現「Pull origin」再按一次
  - 私人 repo（例如 `grade-query-system`）也可以用同一個程式同步
  - 這個資料夾只拿來「看」，不要在裡面直接改檔案（改了會和 GitHub 版本打架）；真的改到了，在 GitHub Desktop 的 Changes 對檔案按右鍵「Discard changes」就會還原
- **備用：`sync-now.bat`（簡單版）**：只用 Windows 內建的 curl、tar、robocopy，不用 PowerShell；**一般雙擊就好，不要用系統管理員執行**
  - 第一次被 Windows 擋：先用記事本打開確認內容（只連 github.com），再右鍵 →「內容」→ 勾「解除封鎖」→ 確定
  - 只新增／覆蓋、不刪除本機檔案；會略過 `.git`（GitHub Desktop 的資料）
  - 同步紀錄：`Claude-Code\sync-log.txt`
- 這次對話**有連線老師電腦**：Claude 推上 GitHub 後直接在老師電腦同步並告知
- **沒有連線**（雲端對話）：交付訊息最後提醒一句「開 GitHub Desktop 按 Fetch／Pull（或雙擊 sync-now.bat）」

### 為什麼換掉舊版 sync-now.bat（2026-10-28）
舊版用「`powershell -ExecutionPolicy Bypass` ＋ 把自己的內容當指令執行（iex）」讓一個檔案就能雙擊，**這正是惡意程式常用的手法**，防毒軟體會攔下來，老師只好用系統管理員執行——反而更危險。新規則：**給老師執行的檔案不用繞過安全檢查的寫法，也不需要管理員權限**。

## 未來自動化用（目前不使用；⚠️ 仍是舊寫法，會被防毒擋，真的要自動化時改用 GitHub Desktop／git 的排程重寫）

老師電腦（Windows）的 `桌面\系統工具開發\Claude-Code\wuyutzu-tools` 要和 GitHub 一樣（GitHub 為準）。

- **安裝一次**：雙擊 `install-auto-sync.bat` → 建立「工作排程器」工作 `WuyutzuToolsAutoSync`，並馬上先同步一次
- **只有新的開發才更新**（2026-10-25 老師要求，不要定時整包下載）：每小時只問 GitHub 最新 commit 編號（`api.github.com/repos/…/git/refs/heads/main`，回應不到 1 KB、1 秒結束、不常駐；Windows PowerShell 5.1 不能用 -Headers 設 Accept／User-Agent，所以用 -UserAgent ＋ ConvertFrom-Json），和 `%LOCALAPPDATA%\WuyutzuSync\last-commit.txt` 一樣就直接結束；不一樣才下載 main 分支 zip、robocopy 複製進本機資料夾，紀錄也只在真的更新時才寫
- 不需要 git、不需要系統管理員；**只新增／覆蓋、不刪除**本機檔案（GitHub 上刪掉的檔案本機會留著）
- 紀錄：`桌面\系統工具開發\Claude-Code\自動同步紀錄.txt`
- 停止：工作排程器程式庫 → `WuyutzuToolsAutoSync` → 刪除
- 只同步公開的 wuyutzu-tools；私人 repo（grade-query-system 等）下載 zip 需要登入，不在這個排程裡
