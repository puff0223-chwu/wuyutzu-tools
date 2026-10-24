import json, shot
from playwright.sync_api import sync_playwright
D = open('/tmp/gq_mock.json').read()
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860})
    c.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('gq-mock-db', {json.dumps(D)}); sessionStorage.setItem('seeded', '1'); }}")
    c.route('**/fonts.googleapis.com/**', lambda r: r.abort()); c.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    t = c.new_page(); t.on('pageerror', lambda e: print('ERR', e))
    t.goto('http://127.0.0.1:5199/'); t.wait_for_timeout(2500)
    t.get_by_text('化學 301').first.click(); t.wait_for_timeout(2500)
    shot.save(t, 'grade_grid'); print(t.evaluate("Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(Boolean).join(' | ')")[:800])
    t.locator('button', has_text='🧩 欄位設定').first.click(); t.wait_for_timeout(1200)
    t.locator('.col-item', has_text='ClassMana').last.click(); t.wait_for_timeout(800); shot.save(t, 'grade_cols')
    t.locator('button', has_text='🔓 開放查詢').first.click(); t.wait_for_timeout(1200); shot.save(t, 'grade_open')
    print(t.evaluate("Array.from(document.querySelectorAll('button,select')).map(b=>b.textContent.trim().slice(0,20)).filter(Boolean).join(' | ')")[:900])
    b.close()
