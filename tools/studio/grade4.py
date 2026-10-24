import json, shot
from playwright.sync_api import sync_playwright
D = open('/tmp/gq_mock.json').read()
FIX = "() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/http:\\/\\/127\\.0\\.0\\.1:5199/g, 'https://grade-query-system-coral.vercel.app'); document.querySelectorAll('input').forEach(i => { i.value = i.value.replace(/http:\\/\\/127\\.0\\.0\\.1:5199/g, 'https://grade-query-system-coral.vercel.app'); }); }"
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860})
    c.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('gq-mock-db', {json.dumps(D)}); sessionStorage.setItem('seeded', '1'); }}")
    c.route('**/fonts.googleapis.com/**', lambda r: r.abort()); c.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    t = c.new_page(); t.goto('http://127.0.0.1:5199/'); t.wait_for_timeout(2000)
    t.get_by_text('化學 301').first.click(); t.wait_for_timeout(1500)
    t.locator('button', has_text='🔓 開放查詢').first.click(); t.wait_for_timeout(1200)
    t.evaluate(FIX); t.wait_for_timeout(200); shot.save(t, 'grade_open')
    print('127' in t.inner_text('body'))
    b.close()
