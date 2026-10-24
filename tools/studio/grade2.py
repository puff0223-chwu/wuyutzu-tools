import json, shot
from playwright.sync_api import sync_playwright
D = open('/tmp/gq_mock.json').read()
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860})
    c.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('gq-mock-db', {json.dumps(D)}); sessionStorage.setItem('seeded', '1'); }}")
    c.route('**/fonts.googleapis.com/**', lambda r: r.abort()); c.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    t = c.new_page()
    t.goto('http://127.0.0.1:5199/'); t.wait_for_timeout(2000)
    for name in ['化學 301', '化學 302']:
        t.get_by_text(name).first.click(); t.wait_for_timeout(1500)
        if t.locator('button', has_text='💾 存檔').count(): t.locator('button', has_text='💾 存檔').first.click(); t.wait_for_timeout(1500)
    db = json.loads(t.evaluate("localStorage.getItem('gq-mock-db')"))
    json.dump(db, open('/tmp/gq_saved.json', 'w'), ensure_ascii=False)
    e = [x for x in db['enrollments'] if x['class_name'] == '301' and x['seat'] == 7][0]
    print(e['name'], e['scores'])
    b.close()
