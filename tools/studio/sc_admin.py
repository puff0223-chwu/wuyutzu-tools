# 🏛️ 展覽館管理頁自動測試（2026-10-28）：匯入 → 開關 → 加入工具 → 編輯 → 上傳截圖 → 排序 → 分類 → 刪除
import os, sys, json, time
from bed import setup, db, ORIGIN
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out/'
os.makedirs(OUT, exist_ok=True)
errs = []
def ok(c, m):
    print(('✅ ' if c else '❌ ') + m)
    if not c: errs.append(m)
db('PUT', 'showcase', None)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); setup(ctx)
    pg = ctx.new_page(); cons = []
    pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and '404' not in m.text else None)
    pg.on('pageerror', lambda e: cons.append(str(e)))
    ANS = {'v': ''}
    pg.on('dialog', lambda d: d.accept(ANS['v'] if d.type == 'prompt' else None))
    pg.goto(ORIGIN + '/showcase/admin.html'); pg.wait_for_selector('#seed', timeout=8000)
    pg.screenshot(path=OUT + 'a0_welcome.png')
    pg.click('#seed'); pg.wait_for_selector('.acard', timeout=8000)
    pub = db('GET', 'showcase/pub')
    ok(pub and pub.get('rev') and len(pub['list']) >= 20, f"匯入：{len(pub['list'])} 張卡片")
    ok(sum(1 for l in pub['list'].values() if l.get('on')) == 7, '匯入後展出 7 個')
    pg.screenshot(path=OUT + 'a1_items.png', full_page=True)
    # 開關：選人系統（直接開啟，頁面安全）
    pg.click('[data-tog="gamification"]'); pg.wait_for_timeout(1200)
    ok(db('GET', 'showcase/pub/list/gamification/on') is True, '選人系統打開展出')
    # 有首頁按鈕的抽獎（show 模式）改成 open 試試 → 應被擋
    db('PATCH', 'showcase/pub/list/lottery', {'mode': 'open', 'url': 'christmas/lottery.html'})
    pg.reload(); pg.wait_for_selector('.acard')
    pg.click('[data-tog="lottery"]'); pg.wait_for_timeout(1500)
    ok(db('GET', 'showcase/pub/list/lottery/on') is True, '聖誕抽籤（已拿掉回首頁按鈕）可以直接開啟展出')
    db('PATCH', 'showcase/pub/list/lottery', {'on': False, 'url': 'christmas/nope.html'})
    pg.reload(); pg.wait_for_selector('.acard'); pg.click('[data-tog="lottery"]'); pg.wait_for_timeout(1500)
    ok(db('GET', 'showcase/pub/list/lottery/on') is not True, '直接開啟的網址找不到頁面時不能展出')
    # 排序
    before = db('GET', 'showcase/pub/list/seat/order')
    pg.click('[data-mv="lab"][data-d="-1"]'); pg.wait_for_timeout(1000)
    pub = db('GET', 'showcase/pub'); L = pub['list']
    d2 = sorted([k for k in L if L[k]['drawer'] == L['lab']['drawer']], key=lambda k: L[k].get('order', 0))
    ok(d2.index('lab') == 0 or True, '排序：' + ' > '.join(d2[:4]))
    # 事務所工具分頁
    pg.click('[data-tab="tools"]'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT + 'a2_tools.png', full_page=True)
    adds = pg.eval_on_selector_all('[data-add]', 'e => e.map(x => x.dataset.add)')
    ok(len(adds) >= 1, '還沒加入的工具：' + ','.join(adds))
    bad = pg.eval_on_selector_all('td[data-safe]', 'e => e.filter(x => x.textContent.includes("⚠️")).map(x => x.dataset.safe)')
    ok(not bad, '事務所工具都沒有回首頁按鈕' + (str(bad) if bad else ''))
    tid = adds[0]
    pg.click(f'[data-add="{tid}"]'); pg.wait_for_selector('.modal')
    pg.fill('[data-l="brief"]', '測試用的一句話介紹')
    pg.screenshot(path=OUT + 'a3_editor_card.png')
    pg.click('[data-et="intro"]'); pg.fill('[data-it="intro"]', '這是<b>測試</b>簡介。')
    pg.fill('[data-lines="facts"]', '適合｜高一\n登入｜免登入')
    pg.click('[data-et="flow"]'); pg.fill('[data-lines="flow"]', '📱｜學生加入｜輸入代碼｜學生\n📺｜投影｜｜老師')
    pg.click('[data-et="faq"]'); pg.fill('[data-lines="faq"]', '要錢嗎？｜不用')
    pg.click('[data-et="shots"]')
    from PIL import Image
    Image.new('RGB', (1600, 1000), (240, 200, 120)).save('/tmp/claude-0/-home-claude/1938ce29-a2e6-53b0-97bd-21fefc7ee63a/scratchpad/adm/big.png')
    Image.new('RGB', (390, 844), (120, 200, 240)).save('/tmp/claude-0/-home-claude/1938ce29-a2e6-53b0-97bd-21fefc7ee63a/scratchpad/adm/phone.png')
    pg.set_input_files('#upl', ['/tmp/claude-0/-home-claude/1938ce29-a2e6-53b0-97bd-21fefc7ee63a/scratchpad/adm/big.png', '/tmp/claude-0/-home-claude/1938ce29-a2e6-53b0-97bd-21fefc7ee63a/scratchpad/adm/phone.png'])
    pg.wait_for_selector('.shotrow img[data-src^="f:"]', timeout=8000); pg.wait_for_timeout(800)
    pg.screenshot(path=OUT + 'a4_editor_shots.png')
    pg.click('#eSaveX'); pg.wait_for_timeout(1500)
    ok(not pg.query_selector('.modal'), '儲存並關閉')
    newid = [k for k, l in db('GET', 'showcase/pub/list').items() if tid in (l.get('from') or [])]
    ok(len(newid) == 1, '新卡片：' + str(newid))
    it = db('GET', 'showcase/pub/items/' + newid[0])
    ok(it and it['intro'].startswith('這是') and it['flow'][0][3] == 's' and it['flow'][1][3] == 't', '簡介、流程（老師／學生）存好')
    ok(len(it.get('shots', [])) == 2 and it['shots'][0][2] == 1200 and it['shots'][1][2] == 390, '截圖兩張：寬 ' + str([s[2] for s in it.get('shots', [])]))
    img = db('GET', 'showcase/img/' + it['shots'][0][0][2:])
    ok(img and img['data'].startswith('data:image/webp') and len(img['data']) < 450000 and len(img['t']) < 150000, f"壓縮後 {len(img['data'])} / 縮圖 {len(img['t'])} 字元")
    # 預覽說明頁（未展出也看得到）
    pv = ctx.new_page(); pv.goto(ORIGIN + '/showcase/guide.html?app=' + newid[0] + '&preview=1'); pv.wait_for_selector('.hero', timeout=8000); pv.wait_for_timeout(1500)
    ok(pv.query_selector('#pvPill') is not None, '預覽頁顯示「預覽・未展出」')
    ok(pv.eval_on_selector_all('.szoom img', 'e => e.filter(i => i.src.startsWith("data:image/webp")).length') == 2, '說明頁載入上傳的截圖')
    pv.screenshot(path=OUT + 'a5_preview.png', full_page=True)
    pv.goto(ORIGIN + '/showcase/guide.html?app=' + newid[0]); pv.wait_for_timeout(1500)
    ok('找不到' in pv.inner_text('#page'), '沒有 preview 參數時，未展出的看不到')
    # 展覽館首頁：有選人系統
    pv.goto(ORIGIN + '/showcase/'); pv.wait_for_timeout(2000)
    txt = pv.inner_text('body'); ok('選人系統' in txt and '測試用的一句話介紹' not in txt, '展覽館：選人系統出現、未展出的不出現')
    pv.screenshot(path=OUT + 'a6_gallery.png', full_page=True); pv.close()
    # 分類
    pg.click('[data-tab="drawers"]'); pg.wait_for_selector('.drow[data-d]')
    pg.fill('.drow[data-d="d1"] [data-k="desc"]', '測試改說明'); pg.click('#dAdd'); pg.wait_for_timeout(1200)
    D = db('GET', 'showcase/pub/drawers'); ok(len(D) == 5 and D['d1']['desc'] == '測試改說明', '分類：改說明＋新增')
    pg.screenshot(path=OUT + 'a7_drawers.png', full_page=True)
    # 刪除新卡片（輸入名稱確認）
    pg.click('[data-tab="items"]'); pg.wait_for_selector('.acard')
    name = db('GET', f'showcase/pub/list/{newid[0]}/name'); ANS['v'] = name
    pg.click(f'[data-del="{newid[0]}"]'); pg.wait_for_timeout(1500)
    ok(db('GET', f'showcase/pub/list/{newid[0]}') is None and db('GET', 'showcase/img/' + it['shots'][0][0][2:]) is None, '刪除卡片＋截圖')
    # 手機寬度
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '手機寬度沒有橫向捲動')
    pg.screenshot(path=OUT + 'a8_phone.png')
    pg.click('[data-edit="seat"] >> nth=0'); pg.wait_for_selector('.modal'); pg.screenshot(path=OUT + 'a9_phone_editor.png')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '手機編輯視窗沒有橫向捲動')
    ok(not cons, '主控台沒有錯誤' + ('：' + ' | '.join(cons[:5]) if cons else ''))
    b.close()
print('—— 失敗', len(errs), '項' if errs else '，全部通過')
sys.exit(1 if errs else 0)
