# 📸 攝影棚：WYTClass 課堂小鎮（英勇學院、謎案課堂）

> 2026-11-07 為小鎮首頁的系統介紹拍的。用 grade-query-system 的**模擬模式**（假資料、假名字），不碰正式資料庫。

## 用小學生的話說

小鎮的網站有一個「玩具模式」（`VITE_MOCK=1`）：資料只存在瀏覽器裡。這裡的腳本像機器人一樣在玩具模式裡開課、分組、評分、抽事件，
走到漂亮的畫面就拍照。`studio-pre.cjs` 會把畫面上的測試網址（localhost）換成正式網址再拍。

## 怎麼重拍

```bash
# 1. 在 grade-query-system 開玩具模式
VITE_MOCK=1 npx vite --port 5179 --strictPort &
# 2. 先產生一個已登入的瀏覽器狀態 /tmp/claude-0/state.json（cc_e2e1 會建立；其他腳本會讀它）
# 3. 拍照（輸出到 /tmp/claude-0/studio/）
node -r ./studio-pre.cjs cc_e2e1.cjs     # 謎案課堂：開課、分組、上台報告
node -r ./studio-pre.cjs cc_e2e2.cjs     # 上台報告投影、學生評分、結案報告
node -r ./studio-pre.cjs cc_e2e9.cjs     # 繳交型任務、互評
node -r ./studio-pre.cjs cc_e2e11.cjs    # 情報板
node -r ./studio-pre.cjs cc_e2e15.cjs    # 成績總覽
node -r ./studio-pre.cjs valor_shots.cjs # 英勇學院：戰況、隊友互助、道具箱、任務地圖（quest-map.jpg 是程式畫的示範地圖）、學生手機
```

挑好的照片：老師頁縮成 1200 寬、裁成 1200×750，學生手機 390×844，存成 WebP：

- `showcase/img/valor-1~7.webp`、`showcase/img/cc-1~7.webp`（教師展覽館用）
- 同一批也放在 grade-query-system 的 `public/town/`（小鎮首頁用，說明文字在 `src/lib/townIntro.js`）
