import bed, shot
from playwright.sync_api import sync_playwright
code = list(bed.db('GET', 'secret-source/m').keys())[0]
bed.db('DELETE', f'secret-source/m/{code}/r/11500128')
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    s = c.new_page(); s.on('pageerror', lambda e: print('SERR', e)); s.goto(bed.ORIGIN + f'/inquiry/secret-source/?m={code}'); s.wait_for_timeout(1000)
    s.fill('#inId', '11500128'); s.fill('#inName', '陳小馨'); s.click('#btnStart'); s.wait_for_timeout(1500)
    s.click('[data-k="archive"]'); s.wait_for_timeout(1000)
    q = s.locator('.panel, #panel').first.inner_text()
    kw = s.locator('input[placeholder="研究「誰」？"]'); kw.fill('維生素C'); s.locator('input[placeholder="實驗中你改變的東西"]').fill('溫度'); s.locator('input[placeholder="你要測量的結果"]').fill('氧化')
    s.locator('input[placeholder="一個詞，例如：研究對象"]').fill('維生素C'); s.locator('input[placeholder="再一個詞，例如：觀察什麼"]').fill('氧化')
    s.click('#qGo'); s.wait_for_timeout(800)
    btns = s.locator('#back button', has_text='＋ 收')
    print('collect buttons', btns.count())
    for i in range(min(2, btns.count())): s.locator('#back button', has_text='＋ 收').nth(0 if i == 0 else 1).click(); s.wait_for_timeout(300)
    s.evaluate("(() => { const p = document.querySelector('#qGo'); p.scrollIntoView({block:'start'}); })()"); s.wait_for_timeout(400)
    shot.save(s, 'src_archive_res')
    s.evaluate("document.querySelector('.ptag').scrollIntoView({block:'start'})"); s.wait_for_timeout(300); shot.save(s, 'src_archive')
    b.close()
