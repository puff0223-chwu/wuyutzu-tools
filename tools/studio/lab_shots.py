import bed, shot
from playwright.sync_api import sync_playwright
own = bed.db('GET', 'lab223/owners/wuadmin'); code = {v['sys']: k for k, v in own.items()}
for k in code.values(): bed.db('DELETE', f'lab223/m/{k}/r/301_26')
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}, device_scale_factor=1); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('ERR', e))
    # 1 pH 能力分析
    t.goto(bed.ORIGIN + '/chemistry/ph-generator-teacher.html'); t.wait_for_timeout(1500)
    t.locator('.lt-item', has_text=code['ph']).first.click() if t.locator('.lt-item', has_text=code['ph']).count() else None
    t.wait_for_timeout(1500); t.locator('button', has_text='能力分析').first.click(); t.wait_for_timeout(1500)
    shot.scroll_to(t, 'button.on, .tab.on, [aria-selected=true]', 80); shot.save(t, 'lab_ph_analysis')
    # 2 即時總表
    t.locator('button', has_text='即時總表').first.click(); t.wait_for_timeout(1500); t.evaluate('window.scrollTo(0,0)'); shot.save(t, 'lab_ph_live')
    # 3 器材排行榜／分析
    t.goto(bed.ORIGIN + '/chemistry/missing-equipment-teacher.html'); t.wait_for_timeout(2500)
    print(t.evaluate("Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(Boolean).join(' | ')"))
    for lab in ['排行榜', '能力分析']:
        bt = t.locator('button', has_text=lab).first
        if bt.count(): bt.click(); t.wait_for_timeout(1500); shot.scroll_to(t, '#main', 0); shot.save(t, 'lab_eq_' + ('rank' if lab == '排行榜' else 'ana'))
    # 4 學生 pH（手機）
    s = c.new_page(); s.set_viewport_size({'width': 390, 'height': 844})
    s.goto(bed.ORIGIN + f'/chemistry/ph-generator.html?a={code["ph"]}'); s.wait_for_selector('#lab-go')
    s.click('[data-use="正式進度"]'); s.fill('#lab-cls', '301'); s.fill('#lab-seat', '26'); s.fill('#lab-no', '11500126'); s.fill('#lab-name', '周品睿'); s.click('#lab-go')
    s.wait_for_function('typeof S !== "undefined" && S && S.qs && document.querySelector("#q0 input")')
    s.evaluate('''() => { const put=(i,ok)=>{const q=S.qs[i]; if(q.dir==='rev'){document.getElementById('a'+i).value=ok?String(q.coef.h/100):String(q.coef.h/100+1); document.getElementById('e'+i).value=String(-q.exp);} else document.getElementById('a'+i).value=ok?PH.fix2(q.ans):PH.fix2(1400-q.ans); check(i);}; put(0,true); put(1,false); put(2,true); }''')
    s.wait_for_timeout(500); s.evaluate('window.scrollTo(0, document.getElementById("q0").getBoundingClientRect().top + scrollY - 150)'); shot.save(s, 'lab_ph_student')
    # 5 學生 單位換算答錯看地圖（手機）
    s.goto(bed.ORIGIN + f'/chemistry/unit-generator.html?a={code["unit"]}'); s.evaluate('localStorage.clear()'); s.goto(bed.ORIGIN + f'/chemistry/unit-generator.html?a={code["unit"]}'); s.wait_for_selector('#lab-go')
    s.click('[data-use="考試複習"]'); s.fill('#lab-cls', '301'); s.fill('#lab-seat', '26'); s.fill('#lab-no', '11500126'); s.fill('#lab-name', '周品睿'); s.click('#lab-go')
    s.wait_for_function('typeof S !== "undefined" && S && S.qs && document.querySelector("#q0 input")')
    s.evaluate('''() => { const i=1, q=S.qs[i], v=q.ans*1000; if(q.kind==='sci'){const e=Math.floor(Math.log10(v)); document.getElementById('m'+i).value=(v/10**e).toFixed(2); document.getElementById('e'+i).value=e;} else document.getElementById('v'+i).value=v.toFixed(2); check(i); }''')
    s.wait_for_timeout(600); s.evaluate('window.scrollTo(0, document.getElementById("q1").getBoundingClientRect().top + scrollY - 20)'); shot.save(s, 'lab_unit_student')
    # 6 學生 器材遊戲（手機）
    s.evaluate('localStorage.clear()'); s.clock.install(); s.goto(bed.ORIGIN + f'/chemistry/missing-equipment.html?a={code["eq"]}'); s.wait_for_selector('#lab-go')
    s.click('[data-use="正式進度"]'); s.fill('#lab-cls', '301'); s.fill('#lab-seat', '26'); s.fill('#lab-no', '11500126'); s.fill('#lab-name', '周品睿'); s.click('#lab-go')
    s.wait_for_selector('#btn-start:visible'); s.click('#btn-start'); s.wait_for_timeout(200)
    for k in range(2):
        s.clock.run_for(2600); s.fill('#in-answer', s.evaluate('game.queue[game.index].name')); s.click('#btn-submit'); s.wait_for_timeout(100); s.clock.run_for(1300); s.wait_for_timeout(300)
    s.clock.run_for(3200); s.wait_for_timeout(800); shot.save(s, 'lab_eq_student')
    b.close()
