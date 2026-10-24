# 共用：開瀏覽器、把 fb.js 換成假的、把真的 Firebase 網址導到本機假資料庫
import os, re, json, urllib.request
from playwright.sync_api import sync_playwright
LOCAL = 'http://127.0.0.1:8790'
ORIGIN = 'https://puff0223-chwu.github.io/wuyutzu-tools'
HOSTRE = re.compile(r'https://puff0223-chwu\.github\.io/(.*)')
FAKE = open(os.path.join(os.path.dirname(__file__), 'fakefb.js'), encoding='utf-8').read()
FBRE = re.compile(r'https://point-collection-stash-default-rtdb\.asia-southeast1\.firebasedatabase\.app/(.*)')
def route_db(route):
    u = route.request.url; m = FBRE.match(u); rest = m.group(1)
    if route.request.headers.get('accept') == 'text/event-stream':
        # 假推送：回傳一次目前資料就結束，瀏覽器 1.5 秒後自動重連＝輪詢
        with urllib.request.urlopen(LOCAL + '/__db/' + rest.split('?')[0]) as resp: data = resp.read().decode()
        body = 'event: put\ndata: {"path":"/","data":' + data + '}\n\nevent: cancel\ndata: null\n\n'
        return route.fulfill(status=200, body=body, headers={'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*'})
    r = urllib.request.Request(LOCAL + '/__db/' + rest, data=route.request.post_data_buffer, method=route.request.method, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r) as resp: body = resp.read(); st = resp.status
    except urllib.error.HTTPError as e: body = e.read(); st = e.code
    route.fulfill(status=st, body=body, headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'})
def route_host(route):
    # 正式網址 → 本機攝影棚（網頁檔案與假資料庫）
    rest = HOSTRE.match(route.request.url).group(1)
    if rest.startswith('__db/'): target = LOCAL + '/' + rest
    elif rest.startswith('wuyutzu-tools/'): target = LOCAL + '/' + rest[len('wuyutzu-tools/'):]
    else: return route.fulfill(status=404, body='')
    r = urllib.request.Request(target, data=route.request.post_data_buffer, method=route.request.method, headers={'Content-Type': route.request.headers.get('content-type', 'application/json')})
    try:
        with urllib.request.urlopen(r) as resp: body = resp.read(); st = resp.status; ct = resp.headers.get('Content-Type', '')
    except urllib.error.HTTPError as e: body = e.read(); st = e.code; ct = 'text/plain'
    route.fulfill(status=st, body=body, headers={'Content-Type': ct})
def setup(ctx):
    ctx.route(HOSTRE, route_host)
    ctx.route(re.compile(r'.*/account/fb\.js.*'), lambda r: r.fulfill(body=FAKE, content_type='application/javascript'))
    ctx.route(FBRE, route_db)
    ctx.route(re.compile(r'fonts\.(googleapis|gstatic)\.com'), lambda r: r.abort())
    ctx.route(re.compile(r'https://www\.gstatic\.com/firebasejs/.*'), lambda r: r.abort())
def db(method, path, val=None):
    data = None if val is None and method in ('GET', 'DELETE') else json.dumps(val).encode()
    r = urllib.request.Request(LOCAL + '/__db/' + path.strip('/') + '.json', data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read())

# CDN 函式庫改由本機 npm 套件提供（攝影棚連不到 CDN）
NM = os.environ.get('STUDIO_NM', os.path.join(os.path.dirname(__file__), 'libs/node_modules/'))
CDN = {
    'qrcode.min.js': NM + 'qrcodejs/qrcode.min.js', 'quill.js': NM + 'quill/dist/quill.js', 'quill.snow.css': NM + 'quill/dist/quill.snow.css',
    'mammoth.browser.min.js': NM + 'mammoth/mammoth.browser.min.js', 'purify.min.js': NM + 'dompurify/dist/purify.min.js',
    'exceljs.min.js': NM + 'exceljs/dist/exceljs.min.js', 'jszip.min.js': NM + 'jszip/dist/jszip.min.js', 'xlsx.full.min.js': NM + 'xlsx/dist/xlsx.full.min.js',
}
def route_cdn(route):
    name = route.request.url.split('?')[0].rsplit('/', 1)[-1]
    f = CDN.get(name)
    if not f: return route.abort()
    route.fulfill(body=open(f, 'rb').read(), content_type='text/css' if f.endswith('.css') else 'application/javascript')
_setup0 = setup
def setup(ctx):
    _setup0(ctx)
    ctx.route(re.compile(r'https://(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)/.*'), route_cdn)
