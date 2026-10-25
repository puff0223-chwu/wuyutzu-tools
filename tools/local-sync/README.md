# 本機資料夾同步

## 目前做法（2026-10-25 老師決定）
系統量體還不大 → **每次開發或調整完成，由 Claude 幫忙更新本機一次**，先不做定時自動化。
- 這次對話**有連線老師電腦**（有 device 檔案／指令工具）：推上 GitHub 後，Claude 直接在老師電腦執行同步（git pull 或下載 zip），完成後在交付訊息說一聲
- **沒有連線**（雲端對話）：Claude 做不到 → 交付訊息最後提醒一句「雙擊 `sync-now.bat` 同步本機」（一次就好，跑完即結束，不常駐）；也可以請老師用 Claude 桌面版把對話連到電腦
- `sync-now.bat`：同步一次就結束；若之前裝過每小時排程，會順便移除
- 以後開發量變大，再改用下面的 `install-auto-sync.bat`（每小時只檢查版本號，有新版才下載）

## 未來自動化用（目前不使用）

老師電腦（Windows）的 `桌面\系統工具開發\Claude-Code\wuyutzu-tools` 要和 GitHub 一樣（GitHub 為準）。

- **安裝一次**：雙擊 `install-auto-sync.bat` → 建立「工作排程器」工作 `WuyutzuToolsAutoSync`，並馬上先同步一次
- **只有新的開發才更新**（2026-10-25 老師要求，不要定時整包下載）：每小時只問 GitHub 最新 commit 編號（`api.github.com/repos/…/git/refs/heads/main`，回應不到 1 KB、1 秒結束、不常駐；Windows PowerShell 5.1 不能用 -Headers 設 Accept／User-Agent，所以用 -UserAgent ＋ ConvertFrom-Json），和 `%LOCALAPPDATA%\WuyutzuSync\last-commit.txt` 一樣就直接結束；不一樣才下載 main 分支 zip、robocopy 複製進本機資料夾，紀錄也只在真的更新時才寫
- 不需要 git、不需要系統管理員；**只新增／覆蓋、不刪除**本機檔案（GitHub 上刪掉的檔案本機會留著）
- 紀錄：`桌面\系統工具開發\Claude-Code\自動同步紀錄.txt`
- 停止：工作排程器程式庫 → `WuyutzuToolsAutoSync` → 刪除
- 只同步公開的 wuyutzu-tools；私人 repo（grade-query-system 等）下載 zip 需要登入，不在這個排程裡
