# 📸 攝影棚（教師展覽館的畫面截圖）

> 2026-10-24 為「教師展覽館」拍各系統的畫面預覽建立。**只在 Claude 的工作環境跑**（要 Python、Playwright、Chromium），老師的電腦不用跑。

## 原理（用小學生的話）

真的系統要連 Firebase、要登入。攝影棚搭了一個「假舞台」：

- `server.py`：在本機開一個小網站，把 wuyutzu-tools 的網頁放上去，另外假裝自己是 Firebase 資料庫（`/__db/…`）。資料只存在記憶體，關掉就沒了，**完全不碰真正的 Firebase**
- `bed.py`：瀏覽器打開「正式網址」時，偷偷改成去拿本機的檔案；`account/fb.js` 換成 `fakefb.js`（直接當成管理員登入）；CDN 函式庫改用本機 npm 套件（攝影棚連不到 CDN）
- `names.py`：假的學生名字（姓＋名隨機組合，不是真實學生）
- 各系統的 `*_sim.py`、`*_seed.py`：用網頁本身的程式模擬「全班在上課」（例如 23 位道具學生一題一題作答），再由 `*_shots.py` 拍照

## 怎麼重拍

```bash
cd tools/studio
python3 server.py ../.. 8790 &          # 開假舞台（網站根目錄＝wuyutzu-tools）
npm i --prefix libs quill@2.0.3 mammoth@1.8.0 dompurify@3.1.6 exceljs@4.4.0 jszip@3.10.1 xlsx@0.18.5 qrcodejs@1.0.0
# 化學實驗室
python3 lab_sim.py ph; python3 lab_sim.py unit; python3 eq_sim.py; python3 lab_shots.py
# 消失的實驗數據／出處失傳的秘文
python3 ex_shots.py; python3 src2.py; python3 src_shots.py; python3 src_arc.py
# 座位大作戰
node seat_seed.js > /tmp/seatcls.json   # 再用 bed.db 寫進 seating/classes（見 DEVELOPMENT.md）
python3 seat2.py
# 遺落的地點（展示用題庫 gps_demo_bank.json：38 點，照片沿用網站上的亂數檔名照片，點位編號與真實題庫無關）
python3 gps_run.py
# 線上檢定所
python3 exam_bank.py; python3 exam1.py; python3 exam_seed.py; python3 exam2.py; python3 exam3.py; python3 exam4.py
# 成績調閱室（另一個 repo；要先在 grade-query-system 跑 VITE_MOCK=1 npx vite --port 5199）
python3 grade_seed.py; python3 grade1.py; python3 grade2.py; python3 grade3.py; python3 grade4.py
```

截圖輸出到 `out/`，挑好後壓成 WebP 放進 `showcase/img/`，在 `showcase/data.js` 的 `shots` 登記；最後：

```bash
node showcase/tools/build_share.js     # 重新產生分享頁
python3 showcase/tools/make_og.py      # 重新產生社群預覽圖
```

## 注意

- 截圖裡**不能出現測試機網址**（`127.0.0.1`）：成績調閱室的「學生查詢網址」要換成正式網址再拍（`grade4.py` 的 `FIX`）
- 遺落的地點：快轉時鐘（`clock.fast_forward`）讓比賽時間看起來像真的；推送（EventSource）用「回一次就關」模擬
- 拍之前先清掉上一輪同一位道具學生的紀錄，不然系統會「貼心地」接回進度
