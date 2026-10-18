#!/usr/bin/env python3
"""🩺 巫魚子教課事務所：全站連線健檢（靜態掃描 + 公開節點大小）

用法：
  python3 tools/health/check.py            # 印出 Markdown 報告
  python3 tools/health/check.py --strict   # 有 ⚠️ 就回傳錯誤碼 1（給 GitHub Action 擋關用）
  python3 tools/health/check.py --no-net   # 不連 Firebase（離線時）

它在檢查什麼（用小學生的說法）：
  Firebase 免費方案像一間只有 100 個座位的教室。每個開著的分頁，只要有「即時連線」就佔一個位子。
  1. 會一直佔位子的頁面（串流 EventSource、SDK 即時監聽），有沒有「切到背景 60 秒就讓位」？
  2. 定時去問雲端的頁面（setInterval 輪詢），分頁藏起來時有沒有暫停？
  3. 會「整包下載」的大節點，現在多大了？超過門檻就該改成只抓這學期。
"""
import json, os, re, sys, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app'

# 刻意「一直連著」的頁面：它們本來就要待在前景（投影、裁判、主持），寫在這裡才不會被當成問題
ALWAYS_ON = {
    'inquiry/orienteering/index.html': '定向越野老師頁（live.js 自動裁判，斷線會漏判）',
    'inquiry/orienteering/board.html': '定向越野投影排行榜',
    'chemistry/bond-society/mp-host.html': '鍵結社多人連線主持機（遊戲狀態的主人）',
    'inquiry/orienteering/live.js': '定向越野老師頁的自動裁判模組',
    'inquiry/orienteering/contrib.js': '定向越野老師頁的投稿審核模組（跟老師頁同一條連線）',
}

# 「會開即時連線」的記號 → 連線種類
LIVE = [
    (r'new EventSource\(', 'SSE 串流'),
    (r'MPC\.listen\(', 'SSE 串流（mp-cloud）'),
    (r'CB\.subscribe\(', 'SSE 串流（case-board）'),
    (r'\bonValue\(|FB\.listen\(|D\.onValue|onChildAdded', 'SDK 即時監聽'),
    (r"openFirebase\(", 'SDK 連線（websocket）'),
]
# 「會讓位」的記號
IDLE = r'goOffline|\.idle\(|\.pause\(\)|disconnect\(|SUB\.close\(\)|es\.close\(\)'
VIS = r'visibilitychange|document\.hidden|visibilityState'

# 會整包下載的公開節點：(路徑, 門檻 key 數, 說明)
NODES = [
    ('sci-history/logs', 500, '科學史老師頁一次全抓'),
    ('sci-history/players', 500, '科學史老師頁一次全抓'),
    ('bond-society/logs', 500, '鍵結社老師頁一次全抓'),
    ('bond-society/players', 500, '鍵結社老師頁、排行榜一次全抓'),
    ('missing-equipment/scores', 500, '消失的器材排行榜一次全抓'),
]


def files():
    for d, _, fs in os.walk(ROOT):
        if any(x in d for x in ('.git', 'node_modules', '/tools', '/firebase')):
            continue
        for f in fs:
            if f.endswith(('.html', '.js')):
                p = os.path.join(d, f)
                yield os.path.relpath(p, ROOT).replace(os.sep, '/'), open(p, encoding='utf-8', errors='ignore').read()


def scan():
    rows = []
    for rel, s in sorted(files()):
        if rel.endswith(('mp-cloud.js', 'case-board-core.js', 'account/fb.js')):
            continue  # 共用工具本身：看「誰在用它」就好
        kinds = [k for pat, k in LIVE if re.search(pat, s)]
        polls = re.findall(r'setInterval\(([^\n]{0,160})', s)
        net_polls = [p for p in polls if re.search(r'fetch|api\(|refresh|get\(|load|poll', p) and not re.search(r'clock|render\b|updateTimer|spin', p)]
        if not kinds and not net_polls:
            continue
        idle = bool(re.search(r'\.idle\(', s)) or (bool(re.search(IDLE, s)) and bool(re.search(VIS, s)))  # .idle() 是共用工具，裡面已經聽 visibilitychange
        gated = all(re.search(VIS, p) or 'hidden' in p for p in net_polls) if net_polls else True
        if rel in ALWAYS_ON:
            st, note = '🟦', ALWAYS_ON[rel]
        elif kinds and not idle:
            st, note = '⚠️', '背景不會讓出連線'
        elif net_polls and not gated and not idle:
            st, note = '⚠️', '背景還在輪詢'
        else:
            st, note = '✅', '背景會讓位' if kinds else '背景暫停輪詢'
        rows.append((st, rel, '、'.join(dict.fromkeys(kinds)) or '輪詢', note))
    return rows


def node_sizes():
    out = []
    for path, limit, why in NODES:
        try:
            with urllib.request.urlopen(f'{DB}/{path}.json?shallow=true', timeout=15) as r:
                n = len(json.loads(r.read() or b'null') or {})
            out.append(('⚠️' if n > limit else '✅', path, n, limit, why))
        except Exception as e:
            out.append(('❔', path, None, limit, f'讀不到（{type(e).__name__}）'))
    return out


def main():
    strict, net = '--strict' in sys.argv, '--no-net' not in sys.argv
    rows = scan()
    print('## 🩺 全站連線健檢\n')
    print('### 1. 即時連線與輪詢頁面\n')
    print('| 狀態 | 檔案 | 連線方式 | 說明 |\n|---|---|---|---|')
    for r in rows:
        print('| ' + ' | '.join(r) + ' |')
    print('\n✅ 背景會讓位　🟦 刻意常駐（投影／裁判／主持）　⚠️ 需要處理\n')
    bad = [r for r in rows if r[0] == '⚠️']
    if net:
        print('### 2. 整包下載的大節點\n')
        print('| 狀態 | 節點 | 筆數 | 門檻 | 誰在抓 |\n|---|---|---|---|---|')
        for st, p, n, lim, why in node_sizes():
            print(f'| {st} | `{p}` | {"—" if n is None else n} | {lim} | {why} |')
            if st == '⚠️':
                bad.append(p)
        print('\n超過門檻 → 改成只抓目前學期（key 開頭是學期，用 `orderBy="$key"&startAt="115-1_"&endAt="115-1_\\uf8ff"`）\n')
    size = len(open(os.path.join(ROOT, 'firebase-rules.json'), encoding='utf-8').read())
    print(f'### 3. 規則檔\n\n`firebase-rules.json` {size:,} 字（上限 256 KB，目前用了 {size / 262144:.0%}）\n')
    print(f'**結論：{"全部健康 🎉" if not bad else f"有 {len(bad)} 項要處理"}**')
    if strict and bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
