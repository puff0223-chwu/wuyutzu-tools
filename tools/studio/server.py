# 攝影棚：靜態網站＋假的 Firebase Realtime Database REST（只在本機測試用）
import json, os, sys, time, random, string, threading, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
ROOT = sys.argv[1]; PORT = int(sys.argv[2]); DBFILE = sys.argv[3] if len(sys.argv) > 3 else None
DB = {}; LOCK = threading.Lock()
if DBFILE and os.path.exists(DBFILE): DB = json.load(open(DBFILE))
PUSH = 'abcdefghijklmnopqrstuvwxyz0123456789'
def now(): return int(time.time() * 1000)
def sv(v):
    if isinstance(v, dict):
        if '.sv' in v and len(v) == 1:
            x = v['.sv']
            if x == 'timestamp': return now()
            return v
        return {k: sv(x) for k, x in v.items()}
    if isinstance(v, list): return [sv(x) for x in v]
    return v
def clean(v):
    if isinstance(v, dict):
        o = {k: clean(x) for k, x in v.items()}; o = {k: x for k, x in o.items() if x is not None}
        return o or None
    if isinstance(v, list):
        o = {str(i): clean(x) for i, x in enumerate(v)}; o = {k: x for k, x in o.items() if x is not None}
        return o or None
    return v
def parts(p): return [x for x in p.strip('/').split('/') if x]
def get(p):
    cur = DB
    for k in parts(p):
        if not isinstance(cur, dict) or k not in cur: return None
        cur = cur[k]
    return cur
def setp(p, v):
    global DB
    ks = parts(p); v = clean(sv(v))
    if not ks: DB = v or {}; return
    cur = DB
    for k in ks[:-1]:
        if not isinstance(cur.get(k), dict): cur[k] = {}
        cur = cur[k]
    if v is None: cur.pop(ks[-1], None)
    else: cur[ks[-1]] = v
    prune(DB)
def prune(d):
    if isinstance(d, dict):
        for k in list(d):
            if isinstance(d[k], dict):
                prune(d[k])
                if not d[k]: del d[k]
def arr(v):
    # Firebase：key 全是 0..n 的數字（且夠密）就變陣列
    if isinstance(v, dict):
        v = {k: arr(x) for k, x in v.items()}
        if v and all(k.isdigit() for k in v):
            n = max(int(k) for k in v)
            if len(v) * 2 > n:
                return [v.get(str(i)) for i in range(n + 1)]
        return v
    return v
class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def end_headers(s):
        s.send_header('Access-Control-Allow-Origin', '*'); s.send_header('Access-Control-Allow-Headers', '*')
        s.send_header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS'); s.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def dbpath(s):
        u = urllib.parse.urlparse(s.path)
        if not u.path.startswith('/__db'): return None, None
        p = urllib.parse.unquote(u.path[5:])
        if p.endswith('.json'): p = p[:-5]
        return p, urllib.parse.parse_qs(u.query)
    def body(s):
        n = int(s.headers.get('Content-Length') or 0)
        return json.loads(s.rfile.read(n) or b'null')
    def out(s, v, code=200):
        b = json.dumps(v, ensure_ascii=False).encode()
        s.send_response(code); s.send_header('Content-Type', 'application/json'); s.send_header('Content-Length', str(len(b))); s.end_headers(); s.wfile.write(b)
    def do_OPTIONS(s): s.send_response(204); s.end_headers()
    def do_GET(s):
        p, q = s.dbpath()
        if p is None: return super().do_GET()
        if s.headers.get('Accept') == 'text/event-stream': return s.out({'error': 'no sse'}, 404)
        with LOCK:
            v = get(p)
            if q.get('shallow') and isinstance(v, dict): v = {k: True for k in v}
            if q.get('orderBy') and isinstance(v, dict):
                pass
            s.out(arr(json.loads(json.dumps(v))))
    def do_PUT(s):
        p, q = s.dbpath()
        if p is None: return s.out({}, 405)
        b = s.body()
        with LOCK: setp(p, b); s.out(get(p))
    def do_PATCH(s):
        p, q = s.dbpath(); b = s.body() or {}
        with LOCK:
            for k, v in b.items(): setp(p.rstrip('/') + '/' + k, v)
            s.out(b)
    def do_POST(s):
        p, q = s.dbpath()
        if p == '/__dump': 
            with LOCK: return s.out(DB)
        b = s.body(); key = '-N' + hex(now())[2:] + ''.join(random.choice(PUSH) for _ in range(8))
        with LOCK: setp(p.rstrip('/') + '/' + key, b); s.out({'name': key})
    def do_DELETE(s):
        p, q = s.dbpath()
        with LOCK: setp(p, None); s.out(None)
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
