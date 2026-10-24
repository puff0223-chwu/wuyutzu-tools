"""🏛️ 教師展覽館：社群分享預覽圖 share/og/<代號>.jpg（1200×630）

貼到 LINE、Facebook 時出現的那張大圖。用每個系統的名稱、一句話介紹和第一張截圖排版。
要 Playwright（Claude 的工作環境有；老師的 Windows 電腦不用跑這支）：

    node showcase/tools/build_share.js
    python3 showcase/tools/make_og.py
"""
import json, os, subprocess, pathlib, html
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
items = json.loads(subprocess.check_output(['node', str(ROOT / 'tools/build_share.js'), '--json']))
OUT = ROOT / 'share/og'; OUT.mkdir(parents=True, exist_ok=True)
esc = html.escape

def page(it):
    shot = (ROOT / it['shot'][0]).as_uri() if it['shot'] else ''
    phone = bool(it['shot'] and it['shot'][2] < 600)
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1200px;height:630px;overflow:hidden;font-family:'Noto Sans CJK TC','Noto Sans TC',sans-serif;color:#1f2a44;
 background:#fbf6ec;background-image:linear-gradient(45deg,rgba(31,42,68,.04) 25%,transparent 25%,transparent 75%,rgba(31,42,68,.04) 75%),linear-gradient(45deg,rgba(31,42,68,.04) 25%,transparent 25%,transparent 75%,rgba(31,42,68,.04) 75%);
 background-size:26px 26px;background-position:0 0,13px 13px;position:relative}}
.bar{{position:absolute;left:0;top:0;bottom:0;width:22px;background:{it['color']}}}
.left{{position:absolute;left:70px;top:58px;width:{'600' if not phone else '720'}px}}
.eb{{font-family:'Noto Sans CJK TC',sans-serif;letter-spacing:.22em;color:#e4572e;font-weight:700;font-size:20px}}
.tag{{display:inline-block;margin-top:22px;background:{it['color']};color:#fff;font-weight:900;border-radius:10px;padding:4px 16px;font-size:24px}}
h1{{font-family:'Noto Serif CJK TC','Noto Serif TC',serif;font-weight:900;font-size:{74 if len(it['name']) <= 6 else 60}px;line-height:1.15;margin-top:18px;letter-spacing:.03em}}
h1 .ic{{margin-right:14px}}
.sub{{font-size:28px;line-height:1.5;margin-top:18px;color:#34405e;font-weight:700}}
.brief{{font-size:24px;line-height:1.55;margin-top:14px;color:#6d6a75}}
.foot{{position:absolute;left:70px;bottom:46px;display:flex;align-items:center;gap:16px}}
.badge{{width:62px;height:62px;border-radius:50%;background:#f2b134;display:grid;place-items:center;box-shadow:0 0 0 4px #fbf6ec,0 0 0 7px #1f2a44;transform:rotate(-8deg);font-size:30px}}
.brand b{{display:block;font-family:'Noto Serif CJK TC',serif;font-size:30px;font-weight:900}}
.brand span{{font-size:19px;color:#6d6a75;letter-spacing:.06em}}
.shot{{position:absolute;{'right:-40px;top:70px;width:520px;height:560px' if not phone else 'right:60px;top:40px;width:300px;height:640px'};border:5px solid #1f2a44;border-radius:22px;overflow:hidden;
 box-shadow:14px 14px 0 {it['color']};transform:rotate({'2.5' if not phone else '3'}deg);background:#fff}}
.shot img{{width:{'auto' if not phone else '100%'};height:{'100%' if not phone else 'auto'};display:block}}
.stamp{{position:absolute;right:{'470' if not phone else '330'}px;top:36px;transform:rotate(-10deg);border:4px solid #e4572e;color:#e4572e;border-radius:12px;padding:4px 14px;font-weight:900;font-size:26px;background:rgba(255,255,255,.75);letter-spacing:.1em}}
</style></head><body>
<div class="bar"></div>
<div class="left">
  <div class="eb">THE CASEBOOK OF WU YU-ZI</div>
  <div class="tag">{esc(it['drawer'])}</div>
  <h1><span class="ic">{esc(it['icon'])}</span>{esc(it['name'])}</h1>
  <div class="sub">{esc(it['sub'])}</div>
</div>
{f'<div class="shot"><img src="{shot}"></div>' if shot else ''}
<div class="stamp">教師展覽館</div>
<div class="foot"><div class="badge">🔍</div><div class="brand"><b>巫魚子教課事務所</b><span>巫魚子老師開發的教學系統</span></div></div>
</body></html>'''

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 630})
    for it in items:
        tmp = OUT / f'_{it["code"]}.html'; tmp.write_text(page(it), encoding='utf-8')
        pg.goto(tmp.as_uri()); pg.wait_for_timeout(300)
        png = OUT / f'_{it["code"]}.png'; pg.screenshot(path=str(png))
        from PIL import Image
        Image.open(png).convert('RGB').save(OUT / f'{it["code"]}.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
        png.unlink(); tmp.unlink(); print('✅ share/og/' + it['code'] + '.jpg')
    b.close()
