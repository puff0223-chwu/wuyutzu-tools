/* =========================================================
   🏛️ 教師展覽館：共用小工具
   「哪些系統要展出」＝會員中心 account/staff.js 的 APPS（一處維護）
   說明內容＝data.js 的 GUIDES
   ========================================================= */
(function (root) {
  var SC = root.SHOWCASE || { DRAWERS: [], GUIDES: {}, APPLY: [] };
  var W = root.WuStaff;
  // 沒寫說明的系統放在這個抽屜
  var OTHER = { name: '其他開放系統', tag: 'Drawer +', desc: '說明整理中', color: '#6d6a75', soft: '#efedf2' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 我們自己寫在 data.js 的內容可以有少量 HTML；其他來源一律跳脫
  function rich(s) { return String(s == null ? '' : s).replace(/\bCM\b/g, 'C<sub>M</sub>'); }
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ''); }

  // 開放清單：以 APPS 為準（APPS 讀不到時才退回說明檔，避免整頁空白）
  function codes() {
    if (W && W.APPS) return Object.keys(W.APPS);
    return Object.keys(SC.GUIDES);
  }
  function drawers() {
    var list = SC.DRAWERS.slice();
    if (codes().some(function (k) { return !SC.GUIDES[k]; })) list.push(OTHER);
    return list;
  }
  function get(code) {
    var all = codes();
    if (all.indexOf(code) < 0) return null;
    var g = SC.GUIDES[code], a = W && W.APPS ? W.APPS[code] : null;
    if (g) {
      var t = {}; for (var k in g) t[k] = g[k];
      t.code = code; t.app = a; t.ready = true;
      return t;
    }
    // APPS 有、說明還沒寫：用 APPS 的名稱與一句話介紹
    var nm = String(a.name || code), m = nm.match(/^(\S+)\s+(.+)$/);
    return {
      code: code, app: a, ready: false, drawer: SC.DRAWERS.length, shelf: '',
      icon: m ? m[1] : '📁', name: m ? m[2] : nm, brief: a.desc || '', sub: a.desc || '',
      external: /^https?:\/\//.test(a.url || '')
    };
  }
  function list() { return codes().map(get).filter(Boolean); }
  function searchText(t) {
    return plain([t.name, t.brief, t.sub, t.shelf, t.intro || ''].concat(
      (t.feats || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.tools || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.facts || []).map(function (f) { return f[1]; })
    ).join(' '));
  }
  // 「前往系統」網址（站內網址從 showcase/ 往上一層）
  function appURL(t) { return t.app && t.app.url ? (W ? W.href(t.app.url, '../') : '../' + t.app.url) : ''; }
  function applyURL(code) { return '../account/?app=' + encodeURIComponent(code) + '&from=showcase'; }

  SC.esc = esc; SC.rich = rich; SC.plain = plain;
  SC.codes = codes; SC.drawers = drawers; SC.get = get; SC.list = list; SC.searchText = searchText;
  SC.appURL = appURL; SC.applyURL = applyURL;
  root.SHOWCASE = SC;
})(this);
