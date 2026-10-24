import json, random, uuid
from names import roster
r = random.Random(12)
U = lambda: str(uuid.UUID(int=r.getrandbits(128)))
sem = {'id': U(), 'name': '115-1', 'sort': 0, 'is_current': True}
sem0 = {'id': U(), 'name': '114-2', 'sort': 1, 'is_current': False}
types = [{'id': U(), 'name': n, 'sort': i} for i, n in enumerate(['一般科目', '探究與實作', '多元選修'])]
classes, cs, enr = [], [], []
studs = {}
for cname, seed in (('301', 41), ('302', 42)):
    c = {'id': U(), 'semester_id': sem['id'], 'name': cname}; classes.append(c)
    for _, seat, no, name in roster(cname, 32, seed):
        no = f'115{cname}{seat:02d}'
        cs.append({'id': U(), 'class_id': c['id'], 'seat': seat, 'name': name, 'sid': no}); studs.setdefault(cname, []).append((seat, name, no))
def col(name, typ, group='', formula='', visible=True, decimals=''):
    return {'id': U(), 'name': name, 'group': group, 'type': typ, 'formula': formula, 'visible': visible, 'decimals': decimals, 'note': ''}
cols = [col('學習單1', 'input', '平時作業(40%)'), col('學習單2', 'input', '平時作業(40%)'), col('學習單3', 'input', '平時作業(40%)'), col('學習單4', 'input', '平時作業(40%)'),
        col('作業小計', 'subtotal', '平時作業(40%)', 'ROUND(AVERAGE({學習單1}:{學習單4})*0.4, 1)'),
        col('期初等級', 'input', 'ClassMana(30%)', visible=False), col('期末等級', 'input', 'ClassMana(30%)', visible=False), col('等級差', 'calc', 'ClassMana(30%)', '{期末等級} - {期初等級}'),
        col('ClassMana', 'subtotal', 'ClassMana(30%)', 'MIN(10 + {等級差}*4, 30)'),
        col('小考', 'input', '小考(30%)'), col('小考小計', 'subtotal', '小考(30%)', 'ROUND({小考}*0.3, 1)'),
        col('老師備註', 'input', '', visible=False),
        col('總分', 'total', '', 'ROUND({作業小計} + {ClassMana} + {小考小計}, 0)')]
courses = []
for k, cname in enumerate(['301', '302']):
    cid = U(); courses.append({'id': cid, 'semester_id': sem['id'], 'type_id': types[0]['id'], 'name': f'化學 {cname}', 'columns': cols, 'settings': {}, 'open': True, 'open_from': None, 'open_until': None, 'sort': k})
    for seat, name, no in studs[cname]:
        sk = r.uniform(0.55, 1)
        sc = {cols[i]['id']: (round(min(100, max(40, r.gauss(85 * sk + 10, 8)))) if r.random() > 0.06 else None) for i in range(4)}
        a = r.randint(3, 8); sc[cols[5]['id']] = a; sc[cols[6]['id']] = a + r.randint(0, 6)
        sc[cols[9]['id']] = round(min(100, max(30, r.gauss(90 * sk, 10))))
        if r.random() < 0.12: sc[cols[11]['id']] = r.choice(['補交 1 次', '請假', '小組長'])
        enr.append({'id': U(), 'course_id': cid, 'sid': no, 'name': name, 'class_name': cname, 'seat': seat, 'scores': sc, 'sort': seat})
courses.append({'id': U(), 'semester_id': sem['id'], 'type_id': types[1]['id'], 'name': '探究與實作 301', 'columns': [col('總分', 'total', '', '')], 'settings': {}, 'open': False, 'open_from': None, 'open_until': None, 'sort': 2})
D = {'session': {'user': {'id': 'mock-teacher', 'email': 'teacher@example.com'}}, 'teachers': [{'id': 'mock-teacher', 'name': '巫魚子老師', 'code': 'WUYU23'}],
     'semesters': [sem, sem0], 'course_types': types, 'classes': classes, 'class_students': cs, 'courses': courses, 'enrollments': enr,
     'accounts': {e['sid']: ('2026-10-20T08:00:00Z' if r.random() < 0.3 else None) for e in enr}}
json.dump(D, open('/tmp/gq_mock.json', 'w'), ensure_ascii=False)
print(len(enr), 'enrollments')
