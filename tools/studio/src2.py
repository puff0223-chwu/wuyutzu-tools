import bed, shot, json, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e))
    t.goto(bed.ORIGIN + '/inquiry/secret-source/teacher.html'); t.wait_for_timeout(1500)
    t.click('#btnNew'); t.wait_for_timeout(600); t.fill('#mk_fName', '115-1 高一探究 301'); t.click('#mkGo'); t.wait_for_timeout(1500)
    link = re.search(r'https://\S+secret-source/index\.html\?\S+|https://\S+secret-source/\?\S+', t.inner_text('body'))
    print('link', link and link.group(0)); print(json.dumps(bed.db('GET', 'secret-source'), ensure_ascii=False)[:600])
    s = c.new_page(); s.on('pageerror', lambda e: print('SERR', e)); s.goto(link.group(0)); s.wait_for_timeout(1500)
    print(s.evaluate("Array.from(document.querySelectorAll('input,button')).slice(0,15).map(e=>e.tagName+'#'+e.id+' '+e.textContent.trim().slice(0,20)).join('\\n')"))
    b.close()
