import bed, json, random, time
from names import roster
code = list(bed.db('GET', 'exam/m').keys())[0]
bed.db('PATCH', f'exam/m/{code}/meta', {'pts': {'s': 5, 'm': 5, 'a': 15}, 'total': 100, 'open': True})
paper = bed.db('GET', f'exam/m/{code}/paper')
for k in paper: paper[k]['p'] = {'s': 5, 'm': 5, 'a': 15}[paper[k]['t']]
bed.db('PUT', f'exam/m/{code}/paper', paper)
key = bed.db('GET', f'exam/m/{code}/key')
rnd = random.Random(31); now = int(time.time() * 1000)
studs = []
for i, (_, seat, no, name) in enumerate(roster('3', 30, 17)):
    cls = str(301 + (i * 7) % 9); studs.append((cls, (i * 3) % 38 + 1, f'1150{cls[-2:]}{(i*3)%38+1:02d}', name))
bed.db('PUT', f'exam/m/{code}/roster', {no: {'cls': cls, 'seat': seat, 'name': name} for cls, seat, no, name in studs})
ids = sorted(paper)
SA = ['我們的核心循環是：收集資源 → 建造設施 → 用設施換分數。例如第一回合先拿 2 木頭，再蓋伐木場，下一回合木頭變成 3 個。',
      '玩家在交易階段常常不知道能換什麼，我們打算做一張交易對照表放在桌上。', '先拿資源再蓋房子，然後得分。', '規則太多，想減少卡牌種類。']
for i, (cls, seat, no, name) in enumerate(studs):
    if i >= 26: continue   # 4 位還沒進來
    skill = rnd.choice([0.95, 0.85, 0.75, 0.65, 0.5])
    st = now - rnd.randint(25, 38) * 60000
    ans = {}
    n_ans = len(ids) if i < 22 else rnd.randint(6, 12)
    for qid in ids[:n_ans]:
        q = paper[qid]; a = key[qid].get('a') if key.get(qid) else None
        if q['t'] == 's': ans[qid] = a[0] if rnd.random() < skill else rnd.choice([x for x in range(len(q['o'])) if x != a[0]])
        elif q['t'] == 'm':
            sel = set(a)
            if rnd.random() > skill: sel ^= {rnd.randrange(len(q['o']))}
            if rnd.random() > skill + 0.1: sel ^= {rnd.randrange(len(q['o']))}
            ans[qid] = ','.join(str(x) for x in sorted(sel)) or '0'
        else: ans[qid] = rnd.choice(SA)
    rec = {'info': {'cls': cls, 'seat': seat, 'name': name}, 'st': st, 'dev': 'd' + str(rnd.randint(10**8, 10**9)), 'ans': ans}
    ev = {}
    if rnd.random() < 0.25: ev['-Nv1' + str(i)] = {'t': st + 600000, 'k': 'v', 'd': '離開全螢幕'}
    if i in (5, 17): ev['-Nv2' + str(i)] = {'t': st + 900000, 'k': 'v', 'd': '切換到其他 App'}; ev['-Nv3' + str(i)] = {'t': st + 960000, 'k': 'v', 'd': '切換到其他 App'}
    if ev: rec['ev'] = ev
    if i < 22:
        by = 'guard' if i in (5, 17) else 'self'
        rec['end'] = {'t': st + (960000 + 2000 if by == 'guard' else rnd.randint(18, 36) * 60000), 'by': by}
    else:
        rec['hb'] = now - (rnd.randint(5, 25) * 1000 if i != 25 else 140000)
    bed.db('PUT', f'exam/m/{code}/s/{no}/1', rec)
print('seeded', code)
