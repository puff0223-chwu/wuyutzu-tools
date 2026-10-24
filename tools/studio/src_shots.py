import bed, shot, json, re, random, time
from names import roster
from playwright.sync_api import sync_playwright
code = list(bed.db('GET', 'secret-source/m').keys())[0]
studs = roster('301', 30, 9)
ORDER = ['archive', 'cite', 'quote', 'plag', 'para', 'book', 'web', 'yt', 'essay', 'fair', 'spot', 'sort', 'ejournal', 'ebook']
rnd = random.Random(21); now = int(time.time() * 1000)
for k, (_, _, no, name) in enumerate(studs[:26]):
    n = rnd.choice([3, 5, 6, 7, 8, 9, 10, 11, 12, 12, 12, 13, 14]); t0 = now - 80 * 60000; passed, att = {}, {}
    for key in ORDER[:n]:
        t0 += rnd.randint(2, 7) * 60000; passed[key] = min(t0, now - 30000); att[key] = rnd.choice([1, 1, 2, 2, 3, 4, 5])
    if n < len(ORDER): att[ORDER[n]] = rnd.choice([1, 2, 3, 6])
    rec = {'name': name, 'ts': max(passed.values()), 'passed': passed, 'att': att, 'arc': {'q': 'c' + str(rnd.randint(1, 4)), 'g': rnd.choice('SAAB'), 'n': rnd.randint(3, 9), 'p': []}}
    bed.db('PUT', f'secret-source/m/{code}/r/{no}', rec)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e))
    t.goto(bed.ORIGIN + '/inquiry/secret-source/teacher.html'); t.wait_for_timeout(2000)
    print(t.evaluate("Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(Boolean).join(' | ')"))
    bt = t.locator('button', has_text='即時進度').first
    if bt.count(): bt.click(); t.wait_for_timeout(2500)
    shot.save(t, 'src_live'); t.screenshot(path='out/raw_src_live_full.png', full_page=True)
    # 學生：書籍證物卡，寫錯幾個地方
    s = c.new_page(); s.on('pageerror', lambda e: print('SERR', e)); s.goto(bed.ORIGIN + f'/inquiry/secret-source/?m={code}'); s.wait_for_timeout(1000)
    s.fill('#inId', '11500127'); s.fill('#inName', '許大廷'); s.click('#btnStart'); s.wait_for_timeout(1500)
    s.click('[data-k="book"]'); s.wait_for_timeout(800)
    s.evaluate('''() => { const ev = SecretSource.evidence(new URLSearchParams(location.search).get('m'), '11500127', 'book', {});
      let h = SecretSource.html(ev.segs); h = h.replace(/<\\/?b>/g, '').replace('（', '(').replace('）', ')');
      const ed = document.getElementById('ed'); ed.innerHTML = h; ed.dispatchEvent(new Event('input', {bubbles: true})); }''')
    s.click('#btnCheck'); s.wait_for_timeout(800)
    shot.scroll_to(s, '.ptag', 20); shot.save(s, 'src_student'); s.screenshot(path='out/raw_src_student_full.png', full_page=True)
    b.close()
