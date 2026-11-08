# 🏠 首頁改版（2026-11-08）× 展覽館跟著搬 × 會員中心整套申請：用老師現在的展覽館資料＋新的首頁（預覽版）測
import os, sys, json, re
from bed import setup, db, ORIGIN
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out/'
os.makedirs(OUT, exist_ok=True)
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
errs = []
def ok(c, m):
    print(('✅ ' if c else '❌ ') + m)
    if not c: errs.append(m)
PUB = json.load(open(os.path.join(os.path.dirname(__file__), 'fixtures/showcase-pub-v2.json'), encoding='utf-8'))
db('PUT', 'showcase', None); db('PUT', 'showcase/pub', PUB)
NEW = open(os.path.join(ROOT, 'index-preview.html'), encoding='utf-8').read()
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); setup(ctx)
    ctx.route(re.compile(r'.*/wuyutzu-tools/index\.html.*'), lambda r: r.fulfill(body=NEW, content_type='text/html; charset=utf-8'))
    pg = ctx.new_page(); cons = []
    pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and '404' not in m.text else None)
    pg.on('pageerror', lambda e: cons.append(str(e)))
    pg.goto(ORIGIN + '/showcase/admin.html'); pg.wait_for_selector('.rows', timeout=10000); pg.wait_for_timeout(800)
    t = pg.inner_text('#view')
    for nm in ['成績調閱室', '謎案課堂', '英勇學院']:
        ok(f'首頁新加的「' in t and nm in t, f'📬 首頁新加的「{nm}」→ 建議對應展覽館的卡片')
    ok('線上桌遊系統' not in pg.inner_text('.inbox'), '🚧 籌備中的不算新工具')
    pg.screenshot(path=OUT + 'c1_inbox.png', full_page=True)
    for _ in range(3):
        pg.click('.ibx:has-text("首頁新加的") button:has-text("對應起來")'); pg.wait_for_timeout(900)
    L = db('GET', 'showcase/pub/list')
    ok(L['grade']['from'] == ['gradesys'] and L['cc']['from'] == ['caseclass'] and L['valor']['from'] == ['valor'] and L['grade']['sync'], '三個系統對應到首頁卡片、跟首頁同步')
    rows = pg.eval_on_selector_all('.dsec', 'e => e.map(d => d.querySelector("h3").innerText + "：" + Array.from(d.querySelectorAll(".r:not(.child) .nm b")).map(x => x.innerText).join("、"))')
    print('   ' + '\n   '.join(rows))
    ok(any('班級事務' in r and 'WYTClass' in r and '選人系統' in r for r in rows), '管理頁：課堂小鎮、選人系統跟著首頁搬到班級事務')
    ok(pg.query_selector('.r .mv span') is not None, '跟首頁同步的卡片：順序跟首頁（🔗）')
    pg.goto(ORIGIN + '/showcase/admin.html#tools'); pg.wait_for_selector('.mt'); pg.wait_for_timeout(300)
    ok('🚧 籌備中' in pg.inner_text('#view'), '首頁工具：線上桌遊顯示籌備中')
    pv = ctx.new_page(); pv.goto(ORIGIN + '/showcase/'); pv.wait_for_selector('a.card', timeout=8000); pv.wait_for_timeout(1500)
    cards = pv.eval_on_selector_all('a.card', 'e => e.map(a => a.getAttribute("href").split("=")[1])')
    ok('town' in cards and not any(c in cards for c in ['grade', 'cc', 'valor', 'exam']), '展覽館：課堂小鎮一張卡（成員都在裡面，不重複） ' + str(cards))
    ok('導師、任何課程都用得到' in pv.inner_text('body'), '展覽館的分類說明跟首頁一樣')
    pv.screenshot(path=OUT + 'c2_gallery.png', full_page=True)
    # 會員中心：整套申請
    pv.goto(ORIGIN + '/account/'); pv.wait_for_selector('[data-tab="list"]', timeout=10000)
    pv.click('[data-tab="list"]'); pv.wait_for_selector('#addBtn'); pv.click('#addBtn'); pv.wait_for_selector('.suite')
    pv.click('[data-allset]'); pv.wait_for_timeout(200)
    checked = pv.eval_on_selector_all('.suite .app input', 'e => e.filter(i => i.checked).map(i => i.value)')
    ok(sorted(checked) == ['cc', 'exam', 'game', 'grade'], '會員中心：☑ 整套申請一次勾四個 ' + str(checked))
    pv.screenshot(path=OUT + 'c3_suite.png')
    ok(not cons, '主控台沒有錯誤' + ('：' + ' | '.join(cons[:4]) if cons else ''))
    b.close()
print('—— 失敗', len(errs), '項' if errs else '，全部通過')
sys.exit(1 if errs else 0)
