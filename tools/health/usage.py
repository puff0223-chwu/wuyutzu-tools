#!/usr/bin/env python3
"""🔋 Firebase 資源報告（GitHub Action 用：每次部署後、每週一早上）

環境變數：
  GCP_TOKEN    Google 存取權杖（tools/health/get_token.py 用金鑰換來的）
  FULL_SCAN=1  連「很重的抽屜」（定向越野照片）也量（每週報告、手動執行才開，省下載額度）

用小學生的說法：Firebase 免費方案像一張「額度卡」——
  🗄️ 倉庫 1 GB：每個系統的抽屜各放了多少東西？→ 這支程式用管理員鑰匙把每個抽屜「秤重」
  🪑 同時連線 100 條、📦 每月下載 10 GB：這兩個只有 Google 的監控系統知道。
     監控 API 要專案綁信用卡（Blaze）才能讀，免費方案讀不到 → 報告附上 Firebase 用量頁的連結
"""
import datetime as dt, json, os, urllib.error, urllib.parse, urllib.request

TOKEN = os.environ.get('GCP_TOKEN', '')
PROJECT = os.environ.get('GCP_PROJECT', 'point-collection-stash')
DB = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app'
USAGE_URL = 'https://console.firebase.google.com/project/point-collection-stash/database/point-collection-stash-default-rtdb/usage'
FULL = os.environ.get('FULL_SCAN') == '1'
NOW = dt.datetime.now(dt.timezone.utc)
TW = dt.timezone(dt.timedelta(hours=8))
STORAGE_LIMIT = 1024 ** 3

# 抽屜 → 系統名稱（新系統記得加一行）
NAMES = {
    'missing-equipment': '🔍 消失的實驗器材', 'unit-convert': '📜 失落的配方（舊題組碼，唯讀）', 'ph-generator': '🧪 消失的指示劑（舊題組碼，唯讀）',
    'lab223': '⚗️ 化學實驗室 No.223（器材、pH、單位換算的活動）',
    'case-board': '📌 案件委託公告欄', 'excel-rescue': '📊 消失的實驗數據（舊連結）', 'excel-rescue-t': '📊 消失的實驗數據',
    'excel-rescue-owners': '📊 消失的實驗數據（老師清單）', 'fp': '🪙 集點小金庫', 'sci-history': '📖 時光手稿',
    'bond-society': '🕯️ 隱秘的鍵結社', 'bond-mp': '🕯️ 鍵結社多人連線', 'seating': '🪑 座位大作戰', 'orienteering': '🧭 遺落的地點',
    'secret-source': '📜 出處失傳的秘文', 'staff': '👥 會員中心', 'staffpre': '👥 會員中心（預先開通）', 'staffmemo': '👥 會員中心（備註）',
    'staffv': '👥 會員中心（驗證）', 'staffreq': '👥 會員中心（加開申請）',
}
HEAVY = {'orienteering'}  # 照片很多：只在每週報告／手動執行時秤重


def rtdb(path, **q):
    q = urllib.parse.urlencode(q)
    req = urllib.request.Request(f'{DB}/{path}.json' + (f'?{q}' if q else ''), headers={'Authorization': f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def human(b):
    for u in ('B', 'KB', 'MB', 'GB'):
        if b < 1024 or u == 'GB':
            return f'{int(b)} B' if u == 'B' else f'{b:.1f} {u}'
        b /= 1024


def light(pct):
    return '🟢' if pct < 60 else ('🟡' if pct < 85 else '🔴')


def storage():
    print('### 🗄️ 儲存空間（每個抽屜秤重）\n')
    try:
        keys = sorted(json.loads(rtdb('', shallow='true') or b'{}') or {})
    except Exception as e:
        print(f'⚠️ 讀不到資料庫清單：{type(e).__name__} {getattr(e, "code", "")}\n')
        return
    rows, total, skipped = [], 0, []
    for k in keys:
        if k in HEAVY and not FULL:
            skipped.append(k)
            continue
        try:
            raw = rtdb(urllib.parse.quote(k))
            n = len(json.loads(raw) or {}) if raw.strip().startswith(b'{') else 1
            rows.append((len(raw), k, n))
            total += len(raw)
        except Exception as e:
            rows.append((-1, k, type(e).__name__))
    rows.sort(key=lambda r: r[0], reverse=True)
    print('| 系統 | 抽屜 | 第一層筆數 | 大小 |\n|---|---|---|---|')
    for size, k, n in rows:
        print(f'| {NAMES.get(k, "❓ 未登記")} | `{k}` | {n} | {"—" if size < 0 else human(size)} |')
    for k in skipped:
        print(f'| {NAMES.get(k, k)} | `{k}` | — | 每週報告才秤（照片多，省下載額度） |')
    pct = total / STORAGE_LIMIT * 100
    note = '（不含沒秤的抽屜）' if skipped else ''
    print(f'\n**{light(pct)} 合計 {human(total)}{note}／1 GB，用了 {pct:.2f}%**\n')
    print(f'（這是 JSON 大小，和 Firebase 內部算法略有差異；這次秤重本身也用掉 {human(total)} 下載額度）\n')


def monitoring():
    """有綁帳單（Blaze）的專案才讀得到；免費方案會回 403 billing → 附連結"""
    q = {
        'filter': 'metric.type="firebasedatabase.googleapis.com/network/active_connections"',
        'interval.startTime': (NOW - dt.timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'interval.endTime': NOW.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'aggregation.alignmentPeriod': '3600s', 'aggregation.perSeriesAligner': 'ALIGN_MAX', 'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    }
    url = f'https://monitoring.googleapis.com/v3/projects/{PROJECT}/timeSeries?' + urllib.parse.urlencode(q)
    print('### 🪑 同時連線、📦 每月下載\n')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'}), timeout=30) as r:
            pts = [float(p['value'].get('int64Value', p['value'].get('doubleValue', 0))) for s in json.load(r).get('timeSeries', []) for p in s.get('points', [])]
        peak = max(pts or [0])
        print(f'{light(peak)} 7 天內同時連線最高 **{int(peak)} 條**／100 條；下載量請看 [Firebase 用量頁]({USAGE_URL})\n')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'ignore')
        if 'billing' in body.lower():
            print(f'免費方案讀不到這兩項（Google 的監控 API 要綁信用卡才開放）→ 點 [Firebase 用量頁]({USAGE_URL}) 看「連線」「下載」兩張圖。\n')
        else:
            print(f'⚠️ 讀不到（HTTP {e.code}）→ 點 [Firebase 用量頁]({USAGE_URL}) 看。\n')
    except Exception as e:
        print(f'⚠️ 讀不到（{type(e).__name__}）→ 點 [Firebase 用量頁]({USAGE_URL}) 看。\n')
    print('連線預算（2026-10-18 健檢後）：學生頁、老師頁背景 60 秒都會讓位；最大宗是遺落的地點（每組 1 條）＋公告欄（每人 1 條）＋鍵結社多人（每人 1 條）。**兩場大型即時活動不要同時開。**\n')


def main():
    print(f'## 🔋 Firebase 資源報告（{NOW.astimezone(TW):%Y-%m-%d %H:%M} 台灣時間）\n')
    if not TOKEN:
        if os.environ.get('AUTH_OUTCOME') == 'failure':
            print('🔴 有設定 `FIREBASE_SA` 金鑰，但換權杖失敗（金鑰貼錯或被停用？），請看 Actions 紀錄。')
        else:
            print('⚪ 還沒設定 `FIREBASE_SA` 金鑰，所以讀不到用量。設定方法見 DEVELOPMENT.md 7-14。')
        return
    storage()
    monitoring()


if __name__ == '__main__':
    main()
