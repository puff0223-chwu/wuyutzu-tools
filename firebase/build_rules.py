#!/usr/bin/env python3
"""把 firebase/rules.src.json（有縮寫）展開成要貼到 Firebase 的 firebase-rules.json

為什麼要這樣做：Firebase 規則沒有「函式」，同一段「是不是管理員」「有沒有核准」要重複貼很多次，
改一個地方就要改十幾處。所以原始檔只寫縮寫，由這支程式統一展開。

縮寫（只在 rules.src.json 裡用）：
  {{ADMIN}}          管理員：puff0223@gmail.com，而且信箱已驗證（Google 登入一定是已驗證）
  {{STAFF:app}}      可以使用某系統的老師：管理員、該系統的舊專用帳號（還沒搬家退休）、或會員中心核准且開通該系統
  {{XFER:節點}}       舊帳號搬家：管理員可以接手「已登記搬家（xfer/<舊uid>）」的舊帳號資料
  {{LEGACY_ANY}}     三個舊專用帳號（+seat、+gps、+excel）之一
  {{EKEY}}           登入者 Email 當成資料位置的寫法（小寫、. 換成 ,），預先開通 staffpre/<EKEY> 用

用法：python3 firebase/build_rules.py   → 產生 repo 根目錄的 firebase-rules.json
"""
import json, os, re, sys

ADMIN_EMAIL = 'puff0223@gmail.com'
LEGACY = {'seat': 'puff0223+seat@gmail.com', 'gps': 'puff0223+gps@gmail.com', 'excel': 'puff0223+excel@gmail.com'}

ADMIN = f"(auth != null && auth.token.email === '{ADMIN_EMAIL}' && auth.token.email_verified === true)"


def staff(app):
    return ("(auth != null && (" + ADMIN +
            f" || (auth.token.email === '{LEGACY[app]}' && root.child('sys/retired/{app}').val() !== true)" +
            f" || (root.child('staff/'+auth.uid+'/status').val() === 'approved' && root.child('staff/'+auth.uid+'/apps/{app}').val() === true)))")


def xfer(node):
    return f"({ADMIN} && {node}.exists() && root.child('xfer/'+{node}.val()).val() === true)"


LEGACY_ANY = '(' + ' || '.join(f"auth.token.email === '{e}'" for e in LEGACY.values()) + ')'
EKEY = "auth.token.email.toLowerCase().replace('.', ',')"


def expand(s):
    s = s.replace('{{ADMIN}}', ADMIN).replace('{{LEGACY_ANY}}', LEGACY_ANY).replace('{{EKEY}}', EKEY)
    s = re.sub(r'\{\{STAFF:(\w+)\}\}', lambda m: staff(m.group(1)), s)
    s = re.sub(r"\{\{XFER:(data\.child\('[\w/]+'\))\}\}", lambda m: xfer(m.group(1)), s)
    return s


def walk(o):
    if isinstance(o, dict): return {k: walk(v) for k, v in o.items()}
    if isinstance(o, str): return expand(o)
    return o


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = json.load(open(os.path.join(root, 'firebase', 'rules.src.json'), encoding='utf-8'))
    out = walk(src)
    text = json.dumps(out, ensure_ascii=False, indent=1)
    left = re.findall(r'\{\{[^}]*\}\}', text)
    if left: sys.exit('還有沒展開的縮寫：' + ', '.join(sorted(set(left))))
    # 每條規則的括號要成對（貼到 Firebase 前先抓明顯的錯）
    def check(o, path=''):
        if isinstance(o, dict):
            for k, v in o.items(): check(v, path + '/' + k)
        elif isinstance(o, str) and o.count('(') != o.count(')'):
            sys.exit('括號不成對：' + path)
    check(out)
    dst = os.path.join(root, 'firebase-rules.json')
    open(dst, 'w', encoding='utf-8').write(text + '\n')
    print(f'✅ 已產生 firebase-rules.json（{len(text):,} 字元，上限 256 KB）')


if __name__ == '__main__':
    main()
