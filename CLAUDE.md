# 巫魚子教課事務所（wuyutzu-tools）— 給 Claude 的開工說明

開工前請依序讀：

1. **`HANDBOOK.md`（開發手冊）**：第 1 章「新案件需求檢核表」、第 2 章「踩雷清單」一定要讀。新系統第一版就照檢核表做，交付時逐項對照。
2. `DEVELOPMENT.md`：資料夾結構、資料位置、Firebase 規則、第 7 節分段開發經驗。
3. `CHANGELOG.md` 最上面幾筆：最近的老師決定。

固定規則（細節見手冊 1-C、1-E、1-I）：

- 學生頁不連回事務所首頁；分享給其他老師的系統與會員中心也不連回首頁（改連會員中心）。
- 首頁改版先放 `index-preview.html`，老師說「上線」才換 `index.html`。
- Firebase 規則改 `firebase/rules.src.json` → `python3 firebase/build_rules.py` → `node firebase/rules.test.js`，不要手改 `firebase-rules.json`。
- 金鑰、密碼不進 repo（這是公開 repo）。
- 每次開發結束：更新 `CHANGELOG.md`、`DEVELOPMENT.md`，有新的通用經驗補進 `HANDBOOK.md`；推上 GitHub 後請老師（或透過連線的電腦）把本機資料夾同步。
- 和老師溝通用繁體中文、白話、親切；技術概念用小學生聽得懂的比喻。
