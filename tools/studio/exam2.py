import bed, shot, json
from playwright.sync_api import sync_playwright
code = list(bed.db('GET', 'exam/m').keys())[0]
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e)); t.on('dialog', lambda d: d.accept())
    t.goto(bed.ORIGIN + '/game-design/exam/'); t.wait_for_timeout(2500)
    t.locator('.ecard').first.click(); t.wait_for_timeout(4000)
    shot.save(t, 'exam_monitor'); t.screenshot(path='out/raw_exam_monitor_full.png', full_page=True)
    g = bed.db('GET', f'exam/m/{code}/g') or {}; print('graded', len(g), json.dumps(list(g.values())[:1], ensure_ascii=False)[:300])
    for lab in ['📋 成績', '✏️ 閱卷', '📊 統計']:
        t.locator('button', has_text=lab).first.click(); t.wait_for_timeout(2500); shot.save(t, 'exam_' + {'📋 成績': 'grades', '✏️ 閱卷': 'mark', '📊 統計': 'stats'}[lab])
    t.screenshot(path='out/raw_exam_stats_full.png', full_page=True)
    b.close()
