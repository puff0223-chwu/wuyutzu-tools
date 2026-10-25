# 本機資料夾自動同步

老師電腦（Windows）的 `桌面\系統工具開發\Claude-Code\wuyutzu-tools` 要和 GitHub 一樣（GitHub 為準）。

- **安裝一次**：雙擊 `install-auto-sync.bat` → 建立「工作排程器」工作 `WuyutzuToolsAutoSync`，每 30 分鐘從 GitHub 下載 main 分支的 zip，用 robocopy 複製進本機資料夾，並馬上先同步一次
- 不需要 git、不需要系統管理員；**只新增／覆蓋、不刪除**本機檔案（GitHub 上刪掉的檔案本機會留著）
- 紀錄：`桌面\系統工具開發\Claude-Code\自動同步紀錄.txt`
- 停止：工作排程器程式庫 → `WuyutzuToolsAutoSync` → 刪除
- 只同步公開的 wuyutzu-tools；私人 repo（grade-query-system 等）下載 zip 需要登入，不在這個排程裡
