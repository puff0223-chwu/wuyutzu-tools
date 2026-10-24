import json, shot
from playwright.sync_api import sync_playwright
db = json.load(open('/tmp/gq_saved.json'))
vis = lambda c: c['type'] in ('subtotal', 'total') or c.get('visible') is not False
tname = {t['id']: t['name'] for t in db['course_types']}
def view(sid, sem):
    out = []
    for e in [x for x in db['enrollments'] if x['sid'] == sid]:
        c = next(x for x in db['courses'] if x['id'] == e['course_id'])
        if c['semester_id'] != sem: continue
        base = {'id': c['id'], 'name': c['name'], 'type': tname.get(c['type_id'], ''), 'open': c['open'], 'state': 'on' if c['open'] else 'off', 'open_from': None, 'open_until': None}
        if c['open']:
            cols = [{'id': k['id'], 'name': k['name'], 'group': k.get('group', ''), 'type': k['type'], 'decimals': k.get('decimals', ''), 'note': k.get('note', '')} for k in c['columns'] if vis(k)]
            base.update({'columns': cols, 'values': {k['id']: e['scores'][k['id']] for k in cols if e['scores'].get(k['id']) not in (None, '')}})
        out.append(base)
    return out
e = [x for x in db['enrollments'] if x['class_name'] == '301' and x['seat'] == 7][0]
sem = [s for s in db['semesters'] if s['is_current']][0]
bundle = {'token': 'demo', 'teacher': '巫魚子老師', 'name': e['name'], 'isDefault': True, 'semesters': [{'id': s['id'], 'name': s['name']} for s in db['semesters'][:1]], 'current': sem['id'], 'courses': view(e['sid'], sem['id'])}
def api(route):
    u = route.request.url
    if '/login' in u or '/me' in u: return route.fulfill(json=bundle)
    if '/grades' in u: return route.fulfill(json={'courses': bundle['courses']})
    route.fulfill(json={'ok': True})
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag in [(390, 844, 'phone'), (1366, 860, 'desk')]:
        c = b.new_context(viewport={'width': w, 'height': h}); c.route('**/api/student/**', api)
        c.route('**/fonts.googleapis.com/**', lambda r: r.abort()); c.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        s = c.new_page(); s.on('pageerror', lambda e: print('ERR', e))
        s.goto('http://127.0.0.1:5199/s/WUYU23'); s.wait_for_timeout(1500)
        if tag == 'phone': shot.save(s, 'grade_student_login')
        s.fill('input[placeholder="例：311"]', '301'); s.fill('input[placeholder="例：5"]', '7'); s.locator('label', has_text='姓名').locator('input').fill(e['name']); s.fill('input[type=password]', e['sid'])
        s.locator('button', has_text='調閱檔案').click(); s.wait_for_timeout(1500)
        shot.save(s, 'grade_student_' + tag)
        c.close()
    b.close()
