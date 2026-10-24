import bed, shot, random, json, time
from names import roster
from playwright.sync_api import sync_playwright
studs = roster('301', 30, 5)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e))
    t.goto(bed.ORIGIN + '/inquiry/excel-rescue-teacher.html'); t.wait_for_timeout(2000)
    t.click('#semAdd summary'); t.fill('#semIn', '115-1A'); t.fill('#semNote', '高一探究與實作'); t.click('#btnSem'); t.wait_for_timeout(1500)
    import re as _re
    link = _re.search(r'https://\S+excel-rescue\.html\?\S+', t.inner_text('body')).group(0); print('link', link)
    # 名單
    t.fill('#ids', '\n'.join(f'{no} {name}' for _, _, no, name in studs)); t.locator('button', has_text='讀取名單').first.click(); t.wait_for_timeout(800)
    # 學生頁：用頁面自己的程式寫入 27 位學生的雲端進度（3 位還沒開始）
    s = c.new_page(); s.goto(link); s.wait_for_timeout(1200)
    now = int(time.time() * 1000); rnd = random.Random(4); recs = []
    for k, (_, _, no, name) in enumerate(studs[:27]):
        lv = rnd.choice([1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 7, 7]); start = now - 45 * 60000 + rnd.randint(0, 300000)
        passed, att = {}, {}; tt = start
        for i, key in enumerate(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'H'][:lv]):
            tt += rnd.randint(3, 9) * 60000 // (2 if key != 'L4' else 1); passed[key] = min(tt, now - 20000); att[key] = rnd.choice([1, 1, 1, 2, 2, 3, 4])
        if lv < 7:
            nxt = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'H'][lv]
            if rnd.random() < 0.6: att[nxt] = rnd.choice([1, 2, 3, 4, 5])
        rec = {'name': name, 'ts': max(passed.values()) if passed else start, 'passed': passed, 'att': att}
        if all(k in passed for k in ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']): rec['closedAt'] = passed['L6']
        if lv >= 5 and rnd.random() < 0.6: rec['check'] = {'score': rnd.randint(28, 41), 'max': 41, 'at': rec['ts'], 'lv': {}}
        recs.append([no, rec])
    s.evaluate('async (recs) => { for (const [id, r] of recs) await ExcelRescue.cloudPut(id, r); }', recs)
    # 老師：即時進度、破案牆
    t.locator('#tabs button, #tabs a', has_text='即時進度').first.click(); t.wait_for_timeout(2500); shot.save(t, 'excel_live')
    t.locator('#tabs button, #tabs a', has_text='破案牆').first.click(); t.wait_for_timeout(2500); shot.scroll_to(t, '#wall', 0); shot.save(t, 'excel_wall')
    # 學生手機：一位進行到第 4 關的學生
    m = c.new_page(); m.set_viewport_size({'width': 390, 'height': 844}); m.goto(link); m.wait_for_timeout(800)
    no, name = studs[27][2], studs[27][3]
    m.evaluate('async ([id, name]) => { const now = Date.now(); await ExcelRescue.cloudPut(id, { name, ts: now, passed: { L1: now - 1800000, L2: now - 1200000, L3: now - 600000 }, att: { L1: 1, L2: 2, L3: 1, L4: 2 } }); }', [no, name])
    m.fill('#inId', no); m.fill('#inName', name); m.click('#btnStart'); m.wait_for_timeout(2500); shot.save(m, 'excel_student')
    m.evaluate("document.querySelector('[data-k=\"L4\"]').click()"); m.wait_for_timeout(800); shot.save(m, 'excel_student_lv')
    b.close()
