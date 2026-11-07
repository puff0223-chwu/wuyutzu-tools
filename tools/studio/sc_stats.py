# 📊 會員中心「使用狀況」自動測試（2026-11-08）：假的統計資料 → 畫面、燈號、篩選、重新統計按鈕
import os, sys, json, re, time
from bed import setup, db, ORIGIN
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out/'
os.makedirs(OUT, exist_ok=True)
errs = []
def ok(c, m):
    print(('✅ ' if c else '❌ ') + m)
    if not c: errs.append(m)
now = int(time.time() * 1000); D = 86400000
summary = {'at': now - 2 * D, 'by': 'cron', 'took': 5000, 'v': 1,
  'quota': {'firebase': {'storage': {'used': 620 * 1024 * 1024, 'limit': 1024 ** 3, 'partial': True}, 'download': {'used': None, 'limit': 10 * 1024 ** 3}, 'conn': {'used': None, 'limit': 100},
             'drawers': {'exam': {'bytes': 4800000}, 'orienteering': {'bytes': None, 'heavy': True}, 'seating': {'bytes': 32000}}},
            'supabase': {'db': {'used': 12 * 1024 * 1024, 'limit': 500 * 1024 * 1024, 'needSql': False}, 'egress': {'used': None, 'limit': 5 * 1024 ** 3}, 'tables': [{'name': 'enrollments', 'bytes': 3000000}]}},
  'teachers': {
    'puff0223@gmail,com': {'email': 'puff0223@gmail.com', 'name': '巫魚子', 'admin': True, 'apps': {}, 'use': {'exam': {'tests': 12, 'banks': 5, 'answers': 900}, 'grade': {'courses': 6, 'students': 240}, 'cc': {'cases': 2, 'groups': 18}}},
    'wang@school,tw': {'email': 'wang@school.tw', 'name': '王大明', 'school': '甲高中', 'status': 'approved', 'apps': {'exam': True, 'seat': True}, 'use': {'exam': {'tests': 1, 'banks': 1, 'answers': 30}}},
    'lin@school,tw': {'email': 'lin@school.tw', 'name': '林小華', 'school': '乙高中', 'status': 'approved', 'apps': {'lab': True}, 'use': {}}}}
db('PUT', 'stats', {'summary': summary, 'history': {'d20261020': {'at': now - 19 * D, 'fb': 560 * 1024 * 1024, 'sb': 9 * 1024 * 1024}, 'd20261106': {'at': now - 2 * D, 'fb': 620 * 1024 * 1024, 'sb': 12 * 1024 * 1024}}})
db('PUT', 'staffseen', {'wang@school,tw': {'exam': '2026-11-07'}, 'puff0223@gmail,com': {'exam': '2026-11-08'}})
CALLS = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); setup(ctx)
    def town(route):
        CALLS.append(route.request.headers.get('authorization', ''))
        route.fulfill(status=200, body=json.dumps({'ok': True, 'at': now}), headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'})
    ctx.route(re.compile(r'https://grade-query-system-coral\.vercel\.app/.*'), town)
    pg = ctx.new_page(); cons = []
    pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and '404' not in m.text else None)
    pg.on('pageerror', lambda e: cons.append(str(e)))
    pg.goto(ORIGIN + '/account/'); pg.wait_for_selector('[data-tab="stats"]', timeout=10000)
    pg.click('[data-tab="stats"]'); pg.wait_for_selector('.st-card', timeout=8000); pg.wait_for_timeout(600)
    t = pg.inner_text('#statsBox')
    ok('🟡' in t and '開始注意' in t, 'Firebase 用了 60% → 🟡 開始注意')
    ok('免費方案看不到' in t and pg.query_selector('a[href*="console.firebase.google.com"]') is not None, '看不到的數字：給控制台連結')
    ok('個月' in t or '天' in t, '成長曲線有預估幾個月後到 80%')
    ok(pg.query_selector('.st-chart polyline') is not None, '畫出成長曲線')
    ok('王大明' in t and '1 測驗' in t and '上次 昨天' in t or '天前' in t, '王大明：線上檢定所 1 測驗、上次使用')
    ok('林小華' in t and '核准了還沒用' in t, '林小華：核准了還沒用 💤')
    ok(not CALLS, '統計還新（2 天前）：不會自動重新統計')
    pg.screenshot(path=OUT + 's1_stats.png', full_page=True)
    pg.click('[data-sf="zzz"]'); pg.wait_for_timeout(200)
    ok('林小華' in pg.inner_text('.tbl') and '王大明' in pg.inner_text('.tbl') and '巫魚子' not in pg.inner_text('.tbl'), '篩選：只看核准了還沒用（王大明的座位大作戰也沒用）')
    pg.click('[data-sf="all"]'); pg.click('#stGo'); pg.wait_for_timeout(1200)
    ok(len(CALLS) == 1 and CALLS[0].startswith('Bearer '), '按「重新統計」會帶通行證呼叫課堂小鎮')
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '手機寬度沒有橫向捲動')
    pg.screenshot(path=OUT + 's2_phone.png', full_page=True)
    ok(not cons, '主控台沒有錯誤' + ('：' + ' | '.join(cons[:4]) if cons else ''))
    b.close()
print('—— 失敗', len(errs), '項' if errs else '，全部通過')
sys.exit(1 if errs else 0)
