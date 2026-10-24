import bed, shot, json
from playwright.sync_api import sync_playwright
bed.db('DELETE', 'exam/m'); bed.db('DELETE', 'exam/owners')
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1366, 'height': 860}); bed.setup(c)
    t = c.new_page(); t.on('pageerror', lambda e: print('TERR', e)); t.on('dialog', lambda d: d.accept())
    t.goto(bed.ORIGIN + '/game-design/exam/'); t.wait_for_timeout(2500)
    t.click('#xNew'); t.wait_for_timeout(800)
    t.fill('#fTitle', '遊戲設計思考 第一次段考'); t.fill('#fSubj', '遊戲設計思考'); t.select_option('#fUse', '期中考') if t.locator('#fUse option', has_text='期中考').count() else None
    t.click('#wSteps [data-st="pick"]'); t.wait_for_timeout(500); t.click('#pAll'); t.wait_for_timeout(300)
    t.click('#wSteps [data-st="time"]'); t.wait_for_timeout(300); t.fill('#fMins', '40')
    t.click('#wSteps [data-st="rule"]'); t.wait_for_timeout(300)
    for i in ['#fShufQ', '#fShufO', '#fNeed']:
        if not t.is_checked(i): t.check(i)
    t.click('#wSteps [data-st="done"]'); t.wait_for_timeout(500); shot.save(t, 'exam_wizard')
    t.click('#fSave'); t.wait_for_timeout(2500)
    code = list(bed.db('GET', 'exam/m').keys())[0]; print('code', code)
    print(json.dumps(bed.db('GET', f'exam/m/{code}/meta'), ensure_ascii=False)[:900])
    print(json.dumps(bed.db('GET', f'exam/m/{code}/paper/q01'), ensure_ascii=False)[:400])
    print(t.evaluate("Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(Boolean).join(' | ')")[:600])
    b.close()
