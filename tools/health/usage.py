#!/usr/bin/env python3
"""🔋 Firebase 資源報告：從 Google Cloud Monitoring 讀「現在用了多少」

給 GitHub Action 用（每次部署後、每週一早上各跑一次）。需要環境變數：
  GCP_TOKEN   Google 存取權杖（Action 裡由 google-github-actions/auth 產生）
  GCP_PROJECT Firebase 專案 ID（預設 point-collection-stash）

用小學生的說法：Firebase 免費方案像一張「每月額度卡」——
  🪑 同時連線：教室只有 100 個座位
  📦 每月下載：每個月可以搬 10 GB 的資料出門
  🗄️ 儲存空間：倉庫 1 GB
  🏋️ 資料庫負載：工友有多忙（100% 就會開始排隊變慢）
這支程式就是去看「每張卡用掉幾格」。
"""
import datetime as dt, json, os, sys, urllib.error, urllib.parse, urllib.request

TOKEN = os.environ.get('GCP_TOKEN', '')
PROJECT = os.environ.get('GCP_PROJECT', 'point-collection-stash')
NOW = dt.datetime.now(dt.timezone.utc)
TW = dt.timezone(dt.timedelta(hours=8))

LIMIT = {'conn': 100, 'sent': 10 * 1024 ** 3, 'storage': 1 * 1024 ** 3}


def ts(d):
    return d.strftime('%Y-%m-%dT%H:%M:%SZ')


def series(metric, days, aligner, period='3600s'):
    """回傳 [(時間, 數值)]，抓不到就丟例外"""
    q = {
        'filter': f'metric.type="firebasedatabase.googleapis.com/{metric}"',
        'interval.startTime': ts(NOW - dt.timedelta(days=days)),
        'interval.endTime': ts(NOW),
        'aggregation.alignmentPeriod': period,
        'aggregation.perSeriesAligner': aligner,
        'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    }
    url = f'https://monitoring.googleapis.com/v3/projects/{PROJECT}/timeSeries?' + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    out = []
    for s in data.get('timeSeries', []):
        for p in s.get('points', []):
            v = p['value']
            val = float(v.get('doubleValue', v.get('int64Value', 0)))
            out.append((p['interval']['endTime'], val))
    return sorted(out)


def light(pct):
    return '🟢' if pct < 60 else ('🟡' if pct < 85 else '🔴')


def human(b):
    for u in ('B', 'KB', 'MB', 'GB'):
        if b < 1024 or u == 'GB':
            return f'{b:.1f} {u}' if u != 'B' else f'{int(b)} B'
        b /= 1024


def main():
    print(f'## 🔋 Firebase 資源報告（{NOW.astimezone(TW):%Y-%m-%d %H:%M} 台灣時間）\n')
    if not TOKEN:
        print('⚪ 還沒設定 `FIREBASE_SA` 金鑰，所以讀不到用量。設定方法見 DEVELOPMENT.md 7-14。')
        return
    rows, errs = [], []

    def get(name, *a):
        try:
            return series(*a)
        except urllib.error.HTTPError as e:
            errs.append(f'{name}：HTTP {e.code}' + ('（服務帳號少了「Monitoring 檢視者」角色）' if e.code == 403 else ''))
        except Exception as e:
            errs.append(f'{name}：{type(e).__name__}')
        return None

    c = get('同時連線', 'network/active_connections', 7, 'ALIGN_MAX')
    if c is not None:
        now = c[-1][1] if c else 0
        peak = max([v for _, v in c] or [0])
        when = max(c, key=lambda x: x[1])[0] if c else ''
        when = dt.datetime.fromisoformat(when.replace('Z', '+00:00')).astimezone(TW).strftime('%m/%d %H:%M') if when else '—'
        pct = peak / LIMIT['conn'] * 100
        rows.append((light(pct), '🪑 同時連線（7 天最高）', f'{int(peak)} 條（{when}）；現在 {int(now)} 條', f'{LIMIT["conn"]} 條', f'{pct:.0f}%'))

    days = NOW.astimezone(TW).day
    s = get('本月下載', 'network/monthly_sent', 2, 'ALIGN_MAX')
    if s is not None:
        used = s[-1][1] if s else 0
        if not s:  # 有些專案沒有 monthly_sent，就自己把這個月每天的下載量加起來
            d = get('本月下載', 'network/sent_bytes_count', days, 'ALIGN_SUM', '86400s') or []
            used = sum(v for _, v in d)
        pct = used / LIMIT['sent'] * 100
        guess = used / max(days, 1) * 30
        rows.append((light(max(pct, guess / LIMIT['sent'] * 100)), '📦 本月下載', f'{human(used)}（照這速度整月約 {human(guess)}）', '10 GB', f'{pct:.1f}%'))

    st = get('儲存空間', 'storage/total_bytes', 2, 'ALIGN_MAX')
    if st is not None:
        used = st[-1][1] if st else 0
        pct = used / LIMIT['storage'] * 100
        rows.append((light(pct), '🗄️ 儲存空間', human(used), '1 GB', f'{pct:.1f}%'))

    ld = get('資料庫負載', 'io/database_load', 7, 'ALIGN_MAX')
    if ld is not None:
        peak = max([v for _, v in ld] or [0]) * 100
        rows.append((light(peak), '🏋️ 資料庫負載（7 天最高）', f'{peak:.0f}%', '100%', f'{peak:.0f}%'))

    if rows:
        print('| | 項目 | 用量 | 免費上限 | 使用率 |\n|---|---|---|---|---|')
        for r in rows:
            print('| ' + ' | '.join(r) + ' |')
        worst = '🔴' if any(r[0] == '🔴' for r in rows) else ('🟡' if any(r[0] == '🟡' for r in rows) else '🟢')
        print(f'\n**整體：{worst}** 🟢 < 60%　🟡 60–85% 要留意　🔴 > 85% 該處理了\n')
    if errs:
        print('⚠️ 有些數字讀不到：' + '；'.join(errs) + '\n')


if __name__ == '__main__':
    main()
