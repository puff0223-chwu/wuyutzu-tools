import bed, shot, json, random, time
from playwright.sync_api import sync_playwright
bed.db('DELETE', 'orienteering')
bank = json.load(open('gps_demo_bank.json'))
rnd = random.Random(8)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e)); t.on('dialog', lambda d: d.accept())
    t.clock.install()
    t.goto(bed.ORIGIN + '/inquiry/orienteering/'); t.wait_for_timeout(2500)
    with t.expect_file_chooser() as fc: t.click('#wImport')
    fc.value.set_files('gps_demo_bank.json'); t.wait_for_timeout(2500)
    t.get_by_text('🏁 活動').first.click(); t.wait_for_timeout(800)
    t.click('#newRun'); t.wait_for_timeout(800)
    t.fill('#rTitle', '高一探究 302 校園定向越野'); t.fill('#rN', '8'); t.get_by_text('⚡ 15 分').click(); t.wait_for_timeout(200)
    t.evaluate("(() => { const e = document.getElementById('rCool'); e.value = 8; e.dispatchEvent(new Event('change', {bubbles:true})); })()")
    t.click('#rGo'); t.wait_for_timeout(2000)
    if t.locator('[data-open]').count(): t.locator('[data-open]').first.click(); t.wait_for_timeout(1500)
    code = list(bed.db('GET', 'orienteering/runs').keys())[0]
    t.click('#lvStart'); t.wait_for_timeout(500); t.locator('button:visible', has_text='▶ 開始').last.click(); t.wait_for_timeout(2500); print('status', bed.db('GET', f'orienteering/runs/{code}/meta/status'))
    teams = bed.db('GET', f'orienteering/runs/{code}/state/teams')
    order = sorted(teams.items(), key=lambda kv: kv[1]['order'])
    phones = []
    for i, (tid, tm) in enumerate(order):
        pc = b.new_context(viewport={'width': 390, 'height': 844}); bed.setup(pc); pg = pc.new_page(); pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=t.evaluate('Date.now()'))
        pg.goto(bed.ORIGIN + f'/inquiry/orienteering/play.html?code={code}'); pg.wait_for_selector('#jPass')
        pg.fill('#jPass', tm['pass']); pg.click('#jGo'); pg.wait_for_selector('#mList', timeout=15000)
        seats = ' '.join(str(x) for x in rnd.sample(range(1, 33), 4)); pg.fill('#mList', seats); pg.click('#mGo'); pg.wait_for_timeout(300)
        phones.append((tid, pg, rnd.choice([0.9, 0.8, 0.7, 0.55])))
    print('teams in')
    t0 = time.time(); shot_chal = [False]
    for rd in range(40):
        if time.time() - t0 > 400 or all((bed.db('GET', f'orienteering/runs/{code}/state/teams/{x}/finished') for x, _, _ in phones)): break
        if rd == 5:
            t.wait_for_timeout(1200); shot.save(t, 'gps_board_mid')
            live = [x for x in phones if not bed.db('GET', f'orienteering/runs/{code}/state/teams/{x[0]}/finished')]
            pgA = live[0][1]; pgA.evaluate("() => { for (const b of document.querySelectorAll('button')) if (/略過/.test(b.textContent) && b.offsetParent) b.click(); }"); pgA.wait_for_timeout(1800); pgA.evaluate('window.scrollTo(0,0)'); shot.save(pgA, 'gps_student')
            pgB = (live[1] if len(live) > 1 else live[0])[1]; pgB.evaluate("() => { const c = document.querySelector('[data-card]'); if (c) c.scrollIntoView({block:'start'}); }"); shot.save(pgB, 'gps_student2')
            t.click('#lvProj'); t.wait_for_timeout(3000); shot.save(t, 'gps_proj'); t.keyboard.press('Escape'); t.wait_for_timeout(500)
            if t.locator('button:visible', has_text='關閉').count(): t.locator('button:visible', has_text='關閉').first.click()
        for tid, pg, skill in phones:
            if (skill < 0.75 and rnd.random() < 0.45) or (skill < 0.6 and rnd.random() < 0.3): continue   # 慢的組偶爾停下來
            st = bed.db('GET', f'orienteering/runs/{code}/state/teams/{tid}') or {}
            if st.get('finished'): continue
            # 加分挑戰：直接略過
            if rd == 3 and not shot_chal[0] and pg.locator('button:visible', has_text='挑戰！').count(): shot.save(pg, 'gps_challenge'); shot_chal[0] = True
            pg.evaluate("() => { for (const b of document.querySelectorAll('button')) if (/略過|繼續找下一題|知道了/.test(b.textContent) && b.offsetParent) { b.click(); break; } }"); pg.wait_for_timeout(150)
            cards = st.get('cards') or {}
            for cid in pg.evaluate("Array.from(document.querySelectorAll('[data-card]')).map(e=>e.dataset.card)"):
                cd = cards.get(cid)
                if not cd or cd.get('ok') or cd.get('state') == 'ok': continue
                pt = bank['points'].get(cd.get('pt') or cd.get('key') or '', None)
                nums = pg.evaluate(f"Array.from(document.querySelectorAll('[data-num^=\"{cid}|\"]')).map(e=>+e.dataset.num.split('|')[1])")
                if not nums: continue
                right = pt['no'] if pt else None
                ans = right if (right in nums and rnd.random() < skill) else rnd.choice(nums)
                pg.evaluate('(s) => { const e = document.querySelector(s); if (e && !e.disabled) e.click(); }', f'[data-num="{cid}|{ans}"]'); pg.wait_for_timeout(120)
                pg.evaluate('(s) => { const e = document.querySelector(s); if (e && !e.disabled) e.click(); }', f'[data-send="{cid}"]'); pg.wait_for_timeout(120)
        time.sleep(2.2)
        jump = rnd.randint(40, 75) * 1000
        t.clock.fast_forward(jump)
        for _, pg, _ in phones: pg.clock.fast_forward(jump)
        time.sleep(1.5)
    print(json.dumps({k: (v.get('done'), v.get('finished')) for k, v in bed.db('GET', f'orienteering/runs/{code}/state/teams').items()}, ensure_ascii=False))
    print('sample card', json.dumps(list((bed.db('GET', f'orienteering/runs/{code}/state/teams/{phones[0][0]}/cards') or {}).values())[:1], ensure_ascii=False)[:400])
    t.reload(); t.wait_for_timeout(3000)
    if t.locator('[data-open]').count(): t.locator('[data-open]').first.click(); t.wait_for_timeout(2500)
    shot.save(t, 'gps_board_end')
    if t.locator('#lvStats').count(): t.click('#lvStats'); t.wait_for_timeout(2500); shot.save(t, 'gps_stats'); t.screenshot(path='out/raw_gps_stats_full.png', full_page=True)
    json.dump({'code': code}, open('out/gps_code.json', 'w'))
    b.close()
