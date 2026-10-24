import os
FINAL = os.environ.get('STUDIO_OUT', os.path.join(os.path.dirname(__file__), 'out/'))
os.makedirs(FINAL, exist_ok=True)

# 📛 拍照前的「名字濾鏡」（老師 2026-10-24 要求）
#  - 巫昶昕 → 巫魚子
#  - 系統自己產生的虛構人名（例如出處失傳的秘文證物卡上的作者「張宏偉」）→ 同一個姓氏＋大／小＋一個字
#    判斷方式：常見姓氏開頭、剛好 3 個中文字、前後是標點／空白／字串頭尾；第二個字已經是大／小的不動
#    同一個名字永遠換成同一個新名字（整個畫面一致）。故意不收「高、簡、連、程、段、方、石…」這些常當一般詞開頭的姓氏
NAME_FILTER = r'''() => {
  const SUR = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周徐蘇葉莊呂江何蕭羅潘朱鍾彭詹胡施沈趙盧梁顏柯孫魏翁戴鄧杜傅侯曹薛卓阮董唐藍蔣紀姚馮歐湯姜汪鄒尤黎涂嚴韓袁陸邵倪溫譚駱熊秦顧俞';
  const ONE = '安宇明華文婷晴君涵翔傑美雯豪恩芸軒庭瑜萱凱寧誠妍睿琪彤廷哲穎妤翰承柔嘉樂';
  const B = '、｜|「」『』（）()，,。：:；;／/\\s·・—\\-';
  const re = new RegExp('(^|[' + B + '])([' + SUR + '])([\\u4e00-\\u9fff])([\\u4e00-\\u9fff])(?=$|[' + B + '])', 'g');
  const map = {};
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const fix = (txt) => txt.replace(/巫昶昕/g, '巫魚子').replace(re, (m, pre, s, a, b) => {
    if (a === '大' || a === '小') return m;
    const k = s + a + b; if (!map[k]) { const h = hash(k); map[k] = s + (h % 2 ? '大' : '小') + ONE[(h >> 1) % ONE.length]; }
    return pre + map[k];
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  document.querySelectorAll('input, textarea').forEach((i) => { const v = fix(i.value); if (v !== i.value) i.value = v; });
  return Object.keys(map).length;
}'''

def save(pg, name, full=False, el=None):
    pg.wait_for_timeout(500)
    try: pg.evaluate(NAME_FILTER)
    except Exception as e: print('name filter failed', name, e)
    path = FINAL + name + '.png'
    if el: pg.locator(el).first.screenshot(path=path)
    else: pg.screenshot(path=path, full_page=full)
    return path
def scroll_to(pg, sel, offset=10):
    pg.evaluate(f"(() => {{ const e = document.querySelector({sel!r}); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - {offset}); }})()")
    pg.wait_for_timeout(300)
