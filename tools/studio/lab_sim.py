import bed, json, random, sys
from names import roster
from playwright.sync_api import sync_playwright
SYS = sys.argv[1]  # ph / unit
PAGE = {'ph': 'ph-generator', 'unit': 'unit-generator'}[SYS]
SOLVE = r'''([i, mode]) => {
  const q = S.qs[i];
  
  let val;
  if (typeof PH !== 'undefined') {
    if (q.dir === 'rev') { const right = [(q.coef.h/100).toString(), String(-q.exp)]; const wrong = mode==='a' ? [right[0], String(-q.exp+1)] : [String(Math.round(q.coef.h/100*10)/10+1), right[1]]; val = mode==='ok' ? right : wrong;
      document.getElementById('a'+i).value = val[0]; document.getElementById('e'+i).value = val[1]; }
    else { const a = q.ans; const w = mode==='a' ? (1400-a) : Math.round(a/100)*100; document.getElementById('a'+i).value = PH.fix2(mode==='ok' ? a : w); }
  } else {
    let v = q.ans; const mm = q.mm || 18;
    if (mode !== 'ok') { const f = [1000, 0.001, mm, 1/mm, 1.18, 100][Math.floor(Math.random()*6)]; v = v * f; }
    if (q.kind === 'sci') { const e = Math.floor(Math.log10(Math.abs(v))); document.getElementById('m'+i).value = (v/Math.pow(10,e)).toFixed(2); document.getElementById('e'+i).value = String(e); }
    else document.getElementById('v'+i).value = (Math.round(v*100)/100).toString();
  }
  check(i);
  return S.solved[i];
}'''
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 850}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e))
    t.goto(bed.ORIGIN + f'/chemistry/{PAGE}-teacher.html'); t.wait_for_timeout(1200)
    t.click('#ltNew'); t.wait_for_timeout(500); t.fill('#lfN', '301 班'); t.click('#lfOk'); t.wait_for_timeout(1200); t.click('#ltTog'); t.wait_for_timeout(800)
    owners = bed.db('GET', 'lab223/owners/wuadmin'); code = [k for k, v in owners.items() if v['sys'] == SYS][-1]; print('code', code)
    s = c.new_page(); s.on('pageerror', lambda e: print('SERR', e))
    rnd = random.Random(7)
    studs = roster('301', 26, 3)
    for k, (cls, seat, no, name) in enumerate(studs):
        if k == 23: break   # 最後幾位還沒進來（老師頁會顯示）
        s.evaluate('localStorage.clear()') if k else None
        s.goto(bed.ORIGIN + f'/chemistry/{PAGE}.html?a={code}'); s.wait_for_selector('#lab-go')
        s.click('[data-use="正式進度"]'); s.fill('#lab-cls', cls); s.fill('#lab-seat', str(seat)); s.fill('#lab-no', no); s.fill('#lab-name', name); s.click('#lab-go')
        s.wait_for_function('typeof S !== "undefined" && S && S.qs && document.querySelector("#q0 input")')
        skill = rnd.choice([0.92, 0.8, 0.65, 0.5, 0.4])
        for i in range(5):
            if k >= 20 and i >= 3: break  # 還在作答中
            for tr in range(3):
                ok = rnd.random() < skill or tr == 2 and rnd.random() < 0.5
                mode = 'ok' if ok else rnd.choice(['a', 'b'])
                if s.evaluate(SOLVE, [i, mode]): break
                if tr == 2: break
        s.wait_for_timeout(250)
    s.wait_for_timeout(1500)
    json.dump(bed.db('GET', f'lab223/m/{code}'), open(f'out/raw_lab_{SYS}.json', 'w'), ensure_ascii=False)
    print(len(bed.db('GET', f'lab223/m/{code}/r') or {}), 'records')
    b.close()
