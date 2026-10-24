import bed, shot, json
from playwright.sync_api import sync_playwright
code = list(bed.db('GET', 'exam/m').keys())[0]
bed.db('DELETE', f'exam/m/{code}/s/11503099')
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e)); t.on('dialog', lambda d: d.accept())
    t.goto(bed.ORIGIN + '/game-design/exam/'); t.wait_for_timeout(2500)
    t.locator('.ecard').first.click(); t.wait_for_timeout(4000)
    t.locator('button', has_text='📊 統計').first.click(); t.wait_for_timeout(2500); shot.save(t, 'exam_stats')
    t.screenshot(path='out/raw_exam_stats_full.png', full_page=True)
    t.locator('button', has_text='📡 監控').first.click(); t.wait_for_timeout(2000)
    t.locator('button', has_text='考場投影看板').first.click(); t.wait_for_timeout(2500); shot.save(t, 'exam_board')
    # 學生手機
    s = c.new_page(); s.set_viewport_size({'width': 390, 'height': 844}); s.on('pageerror', lambda e: print('SERR', e)); s.on('dialog', lambda d: d.accept())
    s.goto(bed.ORIGIN + f'/game-design/exam/take.html?code={code}'); s.wait_for_timeout(1500)
    s.fill('#iCls', '309'); s.fill('#iSeat', '99'); s.fill('#iName', '黃小晴'); s.fill('#iNo', '11503099'); s.click('#iGo'); s.wait_for_timeout(1500)
    shot.save(s, 'exam_student_lobby')
    if s.locator('#lPledge').count(): s.check('#lPledge')
    s.click('#lStart'); s.wait_for_timeout(1500)
    if s.locator('#oFs:visible').count(): s.click('#oFs'); s.wait_for_timeout(500)
    # 回答幾題
    for k in range(5):
        opts = s.locator('#xOpts button.opt')
        n = opts.count()
        if n:
            opts.nth(1).click(); s.wait_for_timeout(200)
            if 'm' in (opts.nth(0).get_attribute('class') or '') and k == 4: opts.nth(3).click(); s.wait_for_timeout(200); break
        if s.locator('#xN').count(): s.click('#xN'); s.wait_for_timeout(300)
    s.wait_for_timeout(800); shot.save(s, 'exam_student'); s.screenshot(path='out/raw_exam_student_full.png', full_page=True)
    print(s.inner_text('body')[:600])
    b.close()
