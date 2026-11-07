# 🏛️ 展覽館管理頁 v2 自動測試（2026-11-08 全面檢修）
# 用「線上真的資料快照」（showcase/share/pub.json，v1 舊格式）開始：
#   自動升級 → 📬 待處理（建議建立課堂小鎮、首頁改名、新工具）→ 建立套組卡 → 展覽館／說明頁 → 逐一切換開放
#   → 首頁改了功能清單也抓得到 → 編輯存檔讀回確認 → 斷線擋存檔 → 別的分頁改過自動更新 → 首頁工具（不放／加入）→ 刪除 → 手機
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
LIVE = json.load(open(os.path.join(ROOT, 'showcase/share/pub.json'), encoding='utf-8'))
db('PUT', 'showcase', None)
db('PUT', 'showcase/pub', LIVE)
MOTHER = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
STATE = {'mother': MOTHER}
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); setup(ctx)
    # 事務所首頁可以在測試中「改內容」，看管理頁抓不抓得到
    ctx.route(re.compile(r'.*/wuyutzu-tools/index\.html.*'), lambda r: r.fulfill(body=STATE['mother'], content_type='text/html; charset=utf-8'))
    pg = ctx.new_page(); cons = []
    pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and '404' not in m.text else None)
    pg.on('pageerror', lambda e: cons.append(str(e)))
    ANS = {'v': ''}
    pg.on('dialog', lambda d: d.accept(ANS['v'] if d.type == 'prompt' else None))
    def wait_saved(): pg.wait_for_timeout(900)
    pg.goto(ORIGIN + '/showcase/admin.html'); pg.wait_for_selector('.inbox', timeout=10000); wait_saved()
    pub = db('GET', 'showcase/pub')
    ok(pub.get('v') == 2, '舊資料自動升級到 v2')
    L = pub['list']
    ok(L['seat'].get('sync') is True and L['seat'].get('mref'), '名稱一樣的卡片（座位大作戰）打開同步、記下首頁快照')
    ok(L['grade'].get('sync') is False and L['cleaning'].get('sync') is False, '名稱不一樣的（成績調閱室、打掃）不自動同步')
    txt = pg.inner_text('.inbox')
    ok('現在是 4 個系統的大廳' in txt, '📬 建議建立課堂小鎮套組卡')
    ok('打掃徵才系統' in txt, '📬 首頁把「打掃工作分配」改名成「打掃徵才系統」抓得到')
    ok('化學尋寶' in txt and '集點小金庫' in txt, '📬 首頁的新工具（化學尋寶、集點小金庫）')
    ok('謎案課堂' not in txt.split('大廳')[1] if '大廳' in txt else True, '會員中心的謎案課堂、英勇學院交給套組建議處理（不重複提醒）')
    pg.screenshot(path=OUT + 'b1_cards_inbox.png', full_page=True)
    # 建立課堂小鎮
    pg.click('button:has-text("建立套組卡")'); pg.wait_for_selector('#s-suite', timeout=8000); wait_saved()
    L = db('GET', 'showcase/pub/list')
    ok(L.get('town') and L['town']['parts'] == ['grade', 'cc', 'valor', 'exam'], '套組卡 town：成績調閱室、謎案課堂、英勇學院、線上檢定所')
    ok(L['town']['on'] is True and L['town']['sync'] is True and L['town']['name'] == 'WYTClass 課堂小鎮', '套組卡看得見、跟首頁同步（原本成績調閱室看得見）')
    ok(L['grade'].get('from') in ([], None) and not L['grade'].get('sync'), '成績調閱室不再對應首頁的課堂小鎮')
    ok(L['exam'].get('solo') is True and not L['grade'].get('solo'), '線上檢定所「也單獨展出」、成績調閱室只在套組裡')
    ok(L['cc']['mode'] == 'apply' and L['cc']['app'] == 'cc' and L['valor']['mode'] == 'show', '謎案課堂開放申請、英勇學院只展示')
    pg.screenshot(path=OUT + 'b2_editor_suite.png', full_page=True)
    # 展覽館與說明頁
    pv = ctx.new_page(); pv.goto(ORIGIN + '/showcase/'); pv.wait_for_selector('.card.suite', timeout=8000); pv.wait_for_timeout(800)
    cards = pv.eval_on_selector_all('a.card', 'e => e.map(a => a.getAttribute("href").split("=")[1])')
    ok('town' in cards and 'grade' not in cards and 'exam' in cards, '展覽館：課堂小鎮一張卡、成績調閱室在裡面、線上檢定所也單獨展出 ' + str(cards))
    pv.screenshot(path=OUT + 'b3_gallery.png', full_page=True)
    pv.goto(ORIGIN + '/showcase/guide.html?app=town'); pv.wait_for_selector('.member', timeout=8000)
    links = pv.eval_on_selector_all('a[href*="account/"]', 'e => e.map(a => a.getAttribute("href"))')
    ok(any('app=grade,cc,exam' in h for h in links), '說明頁：「一次申請」帶 grade,cc,exam ' + str(links[:3]))
    ok(any(h.endswith('app=cc&from=showcase&back=town') for h in links), '說明頁：每個系統可以單獨申請')
    ok(pv.locator('.member').count() == 4, '說明頁：4 個系統小卡')
    pv.screenshot(path=OUT + 'b4_guide_town.png', full_page=True)
    pv.goto(ORIGIN + '/showcase/guide.html?app=cc'); pv.wait_for_selector('.hero', timeout=8000)
    ok('回WYTClass 課堂小鎮' in pv.inner_text('#topBack'), '謎案課堂說明頁返回鍵回到課堂小鎮')
    pv.goto(ORIGIN + '/account/?app=grade,cc&from=showcase&back=town'); pv.wait_for_timeout(1500)
    ok('guide.html?app=town' in (pv.get_attribute('#back', 'href') or ''), '會員中心返回鍵回到展覽館的課堂小鎮')
    # 卡片清單：英勇學院改成開放申請（下拉選單，馬上存）
    pg.goto(ORIGIN + '/showcase/admin.html#cards'); pg.wait_for_selector('[data-mode="valor"]'); pg.wait_for_timeout(300)
    pg.select_option('[data-mode="valor"]', 'apply'); wait_saved()
    ok(db('GET', 'showcase/pub/list/valor/mode') == 'apply', '英勇學院用下拉選單改成開放申請')
    pg.click('[data-tog="cc"]'); wait_saved()
    ok(db('GET', 'showcase/pub/list/cc/on') is False, '謎案課堂單獨關掉（看不見）')
    pv.goto(ORIGIN + '/showcase/guide.html?app=town'); pv.wait_for_selector('.member', timeout=8000)
    try: pv.wait_for_function('document.querySelectorAll(".member").length === 3', timeout=6000)
    except Exception: pass
    print('   來源：', pv.evaluate('SHOWCASE.SOURCE'), pv.evaluate('SHOWCASE.PUB.rev'), db('GET','showcase/pub/rev'), pv.eval_on_selector_all('.member b', 'e=>e.map(x=>x.textContent)'), pv.eval_on_selector_all('a[href*="account/"]', 'e=>e.map(a=>a.getAttribute("href"))')[:2])
    links = pv.eval_on_selector_all('a[href*="account/"]', 'e => e.map(a => a.getAttribute("href"))')
    ok(any('app=grade,game,exam' in h for h in links) and pv.locator('.member').count() == 3, '說明頁跟著變：謎案課堂不見了、英勇學院可以申請')
    pg.click('[data-tog="cc"]'); wait_saved()
    # 打掃：跟首頁同步
    pg.click('.ibx:has-text("打掃徵才系統") button:has-text("跟首頁同步")'); wait_saved()
    ok(db('GET', 'showcase/pub/list/cleaning/sync') is True, '打掃工作分配改成跟首頁同步')
    # 首頁改了線上檢定所的功能清單與一句話 → 抓得到
    m2 = MOTHER.replace('"name": "線上檢定所"', '"name": "線上檢定所 Pro"', 1)
    i = m2.index('"id": "onlineexam"'); j = m2.index('"features": [', i) + len('"features": [')
    m2 = m2[:j] + '"🆕 測試用的新功能", ' + m2[j:]
    STATE['mother'] = m2
    pg.reload(); pg.wait_for_selector('.inbox'); pg.wait_for_timeout(500)
    txt = pg.inner_text('.inbox')
    ok('線上檢定所 Pro' in txt and '＋🆕 測試用的新功能' in txt, '📬 首頁改了線上檢定所的名稱與功能清單（逐項比對）')
    pg.screenshot(path=OUT + 'b5_mother_changed.png', full_page=True)
    pv.goto(ORIGIN + '/showcase/'); pv.wait_for_selector('a.card', timeout=8000); pv.wait_for_timeout(1500)
    ok('線上檢定所 Pro' in pv.inner_text('#drawers'), '展覽館的線上檢定所名稱自動跟著首頁改（同步中）')
    pg.click('.ibx:has-text("線上檢定所 Pro") button:has-text("不用改")'); wait_saved()
    ok(not pg.query_selector('.ibx:has-text("線上檢定所 Pro")'), '按「✔ 不用改」後不再提醒')
    STATE['mother'] = MOTHER
    # 編輯頁：改內容、存檔讀回；擋住看得見卡片的錯誤
    pg.goto(ORIGIN + '/showcase/admin.html#edit/cc'); pg.wait_for_selector('#s-intro'); pg.wait_for_timeout(300)
    pg.fill('[data-it="intro"]', '測試簡介：<b>分組</b>。'); pg.click('#eSave'); wait_saved()
    ok(db('GET', 'showcase/pub/items/cc/intro') == '測試簡介：<b>分組</b>。', '編輯頁存檔（寫入後讀回確認）')
    pg.click('label:has([name=mode][value=apply])'); pg.select_option('[data-l="app"]', ''); pg.click('#eSave'); pg.wait_for_timeout(700)
    ok(db('GET', 'showcase/pub/list/cc/app') == 'cc', '看得見的卡片沒選系統代號 → 擋住不存')
    ok('⛔' in pg.inner_text('#health'), '健檢顯示 ⛔')
    pg.screenshot(path=OUT + 'b6_editor.png', full_page=True)
    pg.click('#eX'); pg.wait_for_selector('.rows')
    # 斷線：存檔按鈕擋住
    pg.evaluate('window.__fakeOffline = true'); pg.wait_for_timeout(600)
    ok(pg.is_disabled('[data-tog="seat"]') and '離線' in pg.inner_text('#conn'), '離線時燈號變紅、按鈕擋住')
    pg.evaluate('window.__fakeOffline = false'); pg.wait_for_timeout(600)
    ok(not pg.is_disabled('[data-tog="seat"]'), '連線恢復後可以存檔')
    # 別的分頁改過 → 自動更新
    db('PATCH', 'showcase/pub', {'list/seat/brief': '別的分頁改的一句話', 'rev': 1999999999999})
    pg.wait_for_timeout(1800)
    ok('別的分頁改的一句話' in pg.inner_text('#view'), '別的分頁改過，自動更新成最新內容')
    # 首頁工具：不放、加入
    pg.goto(ORIGIN + '/showcase/admin.html#tools'); pg.wait_for_selector('[data-skip="familypoints"]'); pg.wait_for_timeout(300)
    pg.click('[data-skip="familypoints"]'); wait_saved()
    ok(db('GET', 'showcase/pub/skip/familypoints') is True, '集點小金庫設為不放展覽館')
    pg.screenshot(path=OUT + 'b7_tools.png', full_page=True)
    pg.click('[data-add="treasure"]'); pg.wait_for_selector('#s-card'); pg.click('#eSaveX'); pg.wait_for_selector('.rows'); wait_saved()
    t = db('GET', 'showcase/pub/list/treasure')
    ok(t and t['on'] is False and t['sync'] is True and t['from'] == ['treasure'], '化學尋寶加入展覽館（看不見、跟首頁同步）')
    ok('首頁工具' in pg.inner_text('.nav') and not pg.query_selector('.nav a[href="#tools"] .n'), '首頁工具都決定了，紅色數字消失')
    ANS['v'] = '化學尋寶'; pg.click('[data-del="treasure"]'); wait_saved()
    ok(db('GET', 'showcase/pub/list/treasure') is None, '刪除卡片（輸入名稱確認）')
    # 手機
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '手機寬度：卡片清單沒有橫向捲動')
    pg.screenshot(path=OUT + 'b8_phone.png', full_page=True)
    pg.goto(ORIGIN + '/showcase/admin.html#edit/town'); pg.wait_for_selector('#s-suite'); pg.wait_for_timeout(400)
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '手機寬度：編輯頁沒有橫向捲動')
    pg.screenshot(path=OUT + 'b9_phone_editor.png')
    ok(not cons, '主控台沒有錯誤' + ('：' + ' | '.join(cons[:5]) if cons else ''))
    b.close()
print('—— 失敗', len(errs), '項' if errs else '，全部通過')
sys.exit(1 if errs else 0)
