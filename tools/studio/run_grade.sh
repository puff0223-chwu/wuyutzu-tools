#!/bin/bash
# 🗂️ 成績調閱室（另一個 repo）：GQ＝grade-query-system 的資料夾
set -e
cd "$(dirname "$0")"; GQ="${GQ:-../../../grade-query-system}"
(cd "$GQ" && VITE_MOCK=1 npx vite --port 5199 --host 127.0.0.1 >/tmp/gq-vite.log 2>&1 &) ; sleep 5
python3 grade_seed.py; python3 grade1.py; python3 grade2.py; python3 grade3.py; python3 grade4.py
pkill -f "vite --port 5199" || true
