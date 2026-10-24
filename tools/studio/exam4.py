import bed, shot, time
from playwright.sync_api import sync_playwright
code = list(bed.db('GET', 'exam/m').keys())[0]
s = bed.db('GET', f'exam/m/{code}/s'); now = int(time.time() * 1000)
for no, att in s.items():
    a = att.get('1') if isinstance(att, dict) else att[1]
    if a and not a.get('end') and no != '11503099': bed.db('PUT', f'exam/m/{code}/s/{no}/1/hb', now - 8000)
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, name in [(1920, 1080, 'exam_board'), (1366, 860, 'exam_board_1366')]:
        c = b.new_context(viewport={'width': w, 'height': h}); bed.setup(c)
        t = c.new_page(); t.on('dialog', lambda d: d.accept())
        t.goto(bed.ORIGIN + '/game-design/exam/'); t.wait_for_timeout(2500)
        t.locator('.ecard').first.click(); t.wait_for_timeout(3500)
        t.locator('button', has_text='考場投影看板').first.click(); t.wait_for_timeout(2500); shot.save(t, name)
        pass
        c.close()
    b.close()
