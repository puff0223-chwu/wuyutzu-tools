#!/bin/bash
# 📸 攝影棚：從空白假資料庫開始，依序拍 6 個 Firebase 系統（成績調閱室另外跑 run_grade.sh）
set -e
cd "$(dirname "$0")"
export STUDIO_NM="${STUDIO_NM:-$PWD/libs/node_modules/}"
mkdir -p out
fuser -k 8790/tcp 2>/dev/null || true
python3 server.py ../.. 8790 & SRV=$!; sleep 1
trap "kill $SRV" EXIT
echo "⚗️ 化學實驗室";   python3 lab_sim.py ph; python3 lab_sim.py unit; python3 eq_sim.py; python3 lab_shots.py
echo "📊 消失的實驗數據"; python3 ex_shots.py
echo "📜 出處失傳的秘文"; python3 src2.py; python3 src_shots.py; python3 src_arc.py
echo "🪑 座位大作戰";   python3 seat_put.py; python3 seat2.py
echo "🧭 遺落的地點";   python3 gps_run.py
echo "🎲 線上檢定所";   python3 exam_bank.py; python3 exam1.py; python3 exam_seed.py; python3 exam2.py; python3 exam3.py; python3 exam4.py
echo "✅ 完成，截圖在 out/"
