import bed, json, random
from names import roster
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 850}); bed.setup(c)
    t = c.new_page()
    t.goto(bed.ORIGIN + '/chemistry/missing-equipment-teacher.html'); t.wait_for_timeout(1200)
    t.click('#ltNew'); t.wait_for_timeout(500); t.fill('#lfN', '301 班'); t.select_option('#s-n', '10'); t.click('#lfOk'); t.wait_for_timeout(1200); t.click('#ltTog'); t.wait_for_timeout(800)
    owners = bed.db('GET', 'lab223/owners/wuadmin'); code = [k for k, v in owners.items() if v['sys'] == 'eq'][-1]; print('code', code)
    rnd = random.Random(11)
    for k, (cls, seat, no, name) in enumerate(roster('301', 26, 3)[:18]):
        pg = c.new_page(); pg.on('pageerror', lambda e: print('SERR', e)); pg.clock.install()
        pg.goto(bed.ORIGIN + f'/chemistry/missing-equipment.html?a={code}'); pg.wait_for_selector('#lab-go')
        pg.click('[data-use="正式進度"]'); pg.fill('#lab-cls', cls); pg.fill('#lab-seat', str(seat)); pg.fill('#lab-no', no); pg.fill('#lab-name', name); pg.click('#lab-go')
        pg.wait_for_selector('#btn-start:visible'); pg.wait_for_timeout(300)
        skill = rnd.choice([0.95, 0.85, 0.75, 0.6]); speed = rnd.choice([2500, 4000, 6000, 9000])
        games = 1 if k > 12 else rnd.choice([1, 2])
        for g in range(games):
            pg.click('#btn-start')
            for q in range(25):
                if pg.evaluate('game.over || !document.getElementById("screen-game") || document.getElementById("screen-game").classList.contains("hidden")'): break
                pg.clock.run_for(int(rnd.uniform(0.5, 1.6) * speed))
                item = pg.evaluate('({name: game.queue[game.index].name, all: EQ.ITEMS.map(x=>x.name)})')
                if rnd.random() < skill: ans = item['name']
                else: ans = rnd.choice([x for x in item['all'] if x != item['name']])
                pg.fill('#in-answer', ans); pg.click('#btn-submit'); pg.wait_for_timeout(120)
                pg.clock.run_for(1700); pg.wait_for_timeout(150)
            pg.clock.run_for(2000); pg.wait_for_timeout(500)
            again = pg.locator('button:visible', has_text='再玩')
            if g + 1 < games:
                if again.count(): again.first.click()
                else: pg.evaluate('showReady()')
                pg.wait_for_timeout(300)
        pg.wait_for_timeout(400); pg.close()
    r = bed.db('GET', f'lab223/m/{code}/r') or {}
    print(len(r), 'records', sum(1 for v in r.values() if v.get('best')), 'with best')
    b.close()
