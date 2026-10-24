import os
FINAL = os.environ.get('STUDIO_OUT', os.path.join(os.path.dirname(__file__), 'out/'))
os.makedirs(FINAL, exist_ok=True)
def save(pg, name, full=False, el=None):
    pg.wait_for_timeout(500)
    path = FINAL + name + '.png'
    if el: pg.locator(el).first.screenshot(path=path)
    else: pg.screenshot(path=path, full_page=full)
    return path
def scroll_to(pg, sel, offset=10):
    pg.evaluate(f"(() => {{ const e = document.querySelector({sel!r}); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - {offset}); }})()")
    pg.wait_for_timeout(300)
