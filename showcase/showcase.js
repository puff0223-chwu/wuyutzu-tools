/* =========================================================
   🏛️ 教師展覽館：共用引擎 v2（展覽館首頁、說明頁、管理頁、分享頁產生器都用這支）
   ---------------------------------------------------------
   2026-11-08 全面檢修（v2）：
   ① 和事務所首頁（母頁）連動：卡片勾「跟母頁同步」→ 圖示、名稱直接讀母頁 index.html 的 TOOLS，
      母頁改了展覽館馬上跟著改；母頁的一句話、網址改了，管理頁會列在「📬 需要你看一下」
   ② 套組卡（例：🏘️ WYTClass 課堂小鎮）：一張大卡片裡有好幾個系統（parts），
      整個套組有一個「看得見」開關，每個系統也有自己的開關和「只展示／開放申請／免申請」
   ③ 讀取三層備援：Firebase（最新）→ GitHub 上的快照 share/pub.json → 這台裝置上次的資料 → 內建內容
      先只問 Firebase 的「版本號 rev」（很小），和快照一樣就直接用快照，不用整包下載（省 Firebase 流量）

   資料（Firebase showcase/pub）：
     v: 2, rev: 最後修改時間（GitHub 每 30 分鐘看到它變了就重做分享頁＋快照）
     drawers: { <分類id>: { name, tag, desc, color, soft, order } }
     list:    { <卡片id>: { on 看得見, drawer, shelf 小分類, order, icon, name, brief,
                            mode（show 只展示／apply 開放申請／open 免申請直接用）, app 會員中心代號, url,
                            from[] 對應母頁 TOOLS 的 id, sync 跟母頁同步, mref 上次確認過的母頁內容,
                            parts[] 套組裡的卡片 id（有＝套組卡）, solo 套組成員也單獨放在展覽館上 } }
     items:   { <卡片id>: { sub, intro, facts, notice, tools, flow, feats, student, teacher, prep, faq, links, shots } }
     skip:    { <母頁工具id>: true }  決定不放展覽館的母頁工具（管理頁不再提醒）
   showcase/img/<圖片id> = { data: 原圖, t: 縮圖 }（老師上傳的截圖，dataURL）
   ========================================================= */
(function (root) {
  var SC = root.SHOWCASE || { DRAWERS: [], GUIDES: {}, APPLY: [] };
  var W = root.WuStaff;
  var DB = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app';
  var SITE = 'https://puff0223-chwu.github.io/wuyutzu-tools/showcase/';
  var SCHEMA = 2;
  var MODES = { show: '👀 只展示', apply: '🔐 開放申請', open: '🚀 免申請直接用' };
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  var ITEM_KEYS = ['sub', 'intro', 'facts', 'notice', 'tools', 'flow', 'feats', 'student', 'teacher', 'prep', 'faq', 'links', 'shots'];
  var LIST_KEYS = ['facts', 'tools', 'flow', 'feats', 'student', 'teacher', 'prep', 'faq', 'links', 'shots'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 說明文字可以用 <b> <i> <sub> <sup> <br>（其他一律跳脫）；CM 自動變成 C<sub>M</sub>
  function rich(s) {
    return esc(s).replace(/&lt;(\/?)(b|i|sub|sup)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>').replace(/\bCM\b/g, 'C<sub>M</sub>');
  }
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ''); }
  // Firebase 會把陣列存成 {0:…,1:…}，刪掉中間一筆會變成有洞的物件 → 一律轉回乾淨的陣列
  function arr(v) { return Array.isArray(v) ? v.filter(function (x) { return x != null; }) : v && typeof v === 'object' ? Object.keys(v).sort(function (a, b) { return a - b; }).map(function (k) { return v[k]; }).filter(function (x) { return x != null; }) : []; }
  function rows(v) { return arr(v).map(function (x) { return Array.isArray(x) ? x : x && typeof x === 'object' ? arr(x) : x; }); }
  var safeURL = function (u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };
  var isSiteURL = function (u) { return /^[\w\-./]+$/.test(u) && !/\.\./.test(u) && !/^\//.test(u); };

  /* =========================================================
     🏠 母頁（事務所首頁 index.html）的工具清單
     index.html 裡 `const TOOLS = [` 到 `];` 是一段 JSON（一行一個工具）
     ========================================================= */
  var MOTHER = null;   // { tools: {id: tool}, order: [id], drawers: [名稱] }
  function parseMother(html) {
    html = String(html || '');
    var a = html.indexOf('const TOOLS = ['), b = html.indexOf('\n];', a);
    if (a < 0 || b < 0) throw new Error('母頁裡找不到工具清單 TOOLS');
    var tools = JSON.parse(html.slice(a + 'const TOOLS = '.length, b + 2)), out = { tools: {}, order: [], drawers: [] };
    tools.forEach(function (t) { if (t && t.id) { out.tools[t.id] = t; out.order.push(t.id); } });
    var d0 = html.indexOf('const DRAWERS = ['), d1 = html.indexOf('];', d0);
    out.dmeta = [];
    if (d0 >= 0) {
      html.slice(d0, d1).split('\n').forEach(function (line) {
        var g = function (k) { var m = new RegExp(k + ":\\s*'([^']*)'").exec(line); return m ? m[1] : ''; };
        if (g('name')) { out.drawers.push(g('name')); out.dmeta.push({ name: g('name'), tag: g('tag'), desc: g('desc'), color: g('color'), soft: g('soft') }); }
      });
    }
    return out;
  }
  function setMother(m) { MOTHER = m || null; SC.MOTHER = MOTHER; }
  function motherTool(id) { return MOTHER && MOTHER.tools[id] || null; }
  // 母頁工具的「快照」：存在卡片的 mref，下次和母頁比對就知道改了哪裡（連功能清單、說明都比）
  var MKEYS = ['icon', 'name', 'brief', 'href', 'sub', 'title', 'features', 'note', 'btn', 'teacher', 'use', 'place'];
  var MLABEL = { icon: '圖示', name: '名稱', brief: '一句話', href: '網址', sub: '副標題', title: '標題', features: '功能清單', note: '備註', btn: '按鈕文字', teacher: '老師專用標記', use: '誰在用', place: '放在首頁哪裡' };
  function motherFace(t) {
    if (!t) return null;
    var f = {};
    MKEYS.forEach(function (k) {
      var v = k === 'place' ? ((MOTHER && MOTHER.drawers[t.drawer]) || '') + '・' + (t.shelf || '') : t[k];
      f[k] = k === 'features' ? arr(v).map(String) : k === 'teacher' ? !!v : String(v == null ? '' : v);
    });
    return f;
  }
  function fval(f, k) { var v = f ? f[k] : ''; return k === 'features' ? JSON.stringify(arr(v)) : k === 'teacher' ? String(!!v) : String(v == null ? '' : v); }
  // 比對兩份快照，回傳改了哪些欄位（舊資料的快照只有前 4 個欄位 → 只比有記到的）
  function faceDiff(ref, cur) {
    if (!ref || !cur) return [];
    return MKEYS.filter(function (k) { return (k in ref) && fval(ref, k) !== fval(cur, k); });
  }
  function sameFace(a, b) { return faceDiff(a, b).length === 0; }

  /* =========================================================
     內建內容：data.js 的系統（看得見）＋ drafts.js 的初版說明（看不見）
     ========================================================= */
  var DCOL = ['d1', 'd2', 'd3', 'd4'];
  function seedPub() {
    var pub = { v: SCHEMA, drawers: {}, list: {}, items: {}, skip: {}, rev: 0 };
    (SC.DRAWERS || []).forEach(function (d, i) { pub.drawers[DCOL[i] || ('d' + (i + 1))] = { name: d.name, tag: d.tag, desc: d.desc, color: d.color, soft: d.soft, order: i }; });
    var n = 0;
    var add = function (id, g, on) {
      var c = {}, l = {
        on: on, drawer: DCOL[g.drawer] || 'd1', shelf: g.shelf || '', order: n++, icon: g.icon || '📁', name: g.name || id, brief: g.brief || '',
        mode: g.mode || 'apply', app: g.app || '', url: g.url || '', from: g.from || [], sync: g.sync != null ? !!g.sync : (g.from || []).length === 1,
        parts: g.parts || [], solo: !!g.solo
      };
      ITEM_KEYS.forEach(function (k) { if (g[k] != null) c[k] = g[k]; });
      pub.list[id] = l; pub.items[id] = c;
    };
    Object.keys(SC.GUIDES || {}).forEach(function (code) { add(code, Object.assign({ app: code, mode: 'apply' }, SC.GUIDES[code]), SC.GUIDES[code].on !== false); });
    Object.keys(SC.DRAFTS || {}).forEach(function (id) { if (!pub.list[id]) add(id, SC.DRAFTS[id], !!SC.DRAFTS[id].on); });
    return pub;
  }

  /* ---------- 整理資料：補齊預設值，舊版（v1）資料也能用 ---------- */
  function normalize(p) {
    p = p || {};
    var out = { v: +p.v || 1, drawers: p.drawers || {}, list: {}, items: p.items || {}, skip: p.skip || {}, rev: +p.rev || 0 };
    Object.keys(p.list || {}).forEach(function (id) {
      var l = p.list[id];
      if (!l || typeof l !== 'object') return;
      var from = arr(l.from).filter(function (x) { return typeof x === 'string' && x; });
      out.list[id] = {
        on: !!l.on, drawer: l.drawer || '', shelf: l.shelf || '', order: +l.order || 0,
        icon: l.icon || '📁', name: l.name || id, brief: l.brief || '',
        mode: MODES[l.mode] ? l.mode : 'show', app: l.app || '', url: l.url || '',
        from: from, sync: !!l.sync,   // 沒寫＝不同步（舊資料不會突然改名）；管理頁第一次打開會幫名稱一樣的卡片打開同步
        mref: l.mref && typeof l.mref === 'object' ? l.mref : null,
        parts: arr(l.parts).filter(function (x) { return typeof x === 'string' && x && x !== id; }),
        solo: !!l.solo
      };
    });
    // 套組成員只能屬於一個套組；套組不能放進別的套組
    var owner = {};
    Object.keys(out.list).forEach(function (id) {
      out.list[id].parts = out.list[id].parts.filter(function (c) {
        if (!out.list[c] || owner[c] || out.list[c].parts.length) return false;
        owner[c] = id; return true;
      });
    });
    return out;
  }

  /* =========================================================
     讀取：Firebase（最新）→ 快照 share/pub.json → 這台裝置上次的資料 → 內建內容
     cb 可能被呼叫好幾次（先用快的、再換成新的；母頁讀到後也會再畫一次）
     ========================================================= */
  var PUB = null, SOURCE = '';
  function setPub(p, src) { PUB = normalize(p); SOURCE = src; SC.PUB = PUB; SC.SOURCE = src; }
  var CKEY = 'sc-pub-v2';
  function cacheGet() { try { return JSON.parse(localStorage.getItem(CKEY)); } catch (e) { return null; } }
  function cachePut(p) { try { localStorage.setItem(CKEY, JSON.stringify(p)); } catch (e) { } }
  function timed(url, ms, asText) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 8000) : null;
    return fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return asText ? r.text() : r.json(); })
      .catch(function (e) { if (t) clearTimeout(t); throw e; });
  }
  function fetchJSON(path, ms) { return timed(DB + '/' + path + '.json', ms); }
  function loadMother(base) {
    return timed((base == null ? '../' : base) + 'index.html', 6000, true).then(function (h) { setMother(parseMother(h)); return MOTHER; });
  }
  function load(cb, opt) {
    opt = opt || {};
    var done = false, shown = 0;
    var show = function (p, src) {
      if (!p || !p.rev) return false;
      if (PUB && PUB.rev === +p.rev && SOURCE !== 'seed') { SOURCE = SC.SOURCE = src; return true; }
      setPub(p, src); shown++; cb(); return true;
    };
    var cached = cacheGet();
    if (cached && cached.rev) show(cached, 'cache');
    // 母頁（同一個網站，很穩）：讀到後再畫一次，讓「跟母頁同步」的卡片顯示最新名稱
    loadMother(opt.base).then(function () { if (PUB) cb(); }).catch(function () { });
    var snap = timed('share/pub.json', 6000).catch(function () { return null; });
    return fetchJSON('showcase/pub/rev', 7000).then(function (rev) {
      if (!rev) return snap.then(function (s) { if (!show(s, 'snapshot') && !PUB) { setPub(seedPub(), 'seed'); cb(); } });
      if (PUB && PUB.rev === +rev && SOURCE !== 'seed') { SOURCE = SC.SOURCE = 'live'; return; }
      return snap.then(function (s) {
        if (s && +s.rev === +rev) { cachePut(s); show(s, 'live'); return; }          // 快照就是最新的：不用向 Firebase 下載整包
        return fetchJSON('showcase/pub', 10000).then(function (p) { cachePut(p); show(p, 'live'); });
      });
    }).catch(function () {
      // Firebase 連不上：改用快照 → 裝置上次的資料 → 內建內容
      return snap.then(function (s) {
        if (s && s.rev && (!PUB || +s.rev > PUB.rev)) { show(s, 'snapshot'); return; }
        if (!PUB) { setPub(seedPub(), 'seed'); cb(); }
      });
    }).then(function () { done = true; });
  }

  /* =========================================================
     查詢
     ========================================================= */
  function drawers() {
    var D = (PUB || {}).drawers || {};
    // 和首頁同名的分類：說明、顏色、標籤跟首頁一致
    var M = {}; ((MOTHER && MOTHER.dmeta) || []).forEach(function (d) { M[d.name] = d; });
    return Object.keys(D).map(function (id) { var m = M[D[id].name], o = Object.assign({ id: id }, D[id]); if (m) ['tag', 'desc', 'color', 'soft'].forEach(function (k) { if (m[k]) o[k] = m[k]; }); return o; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  var NO_DRAWER = { id: '', name: '其他', tag: 'Drawer +', desc: '', color: '#6d6a75', soft: '#efedf2' };
  function drawerOf(t) {
    var d = drawers().filter(function (x) { return x.id === t.drawer; })[0];
    return d || NO_DRAWER;
  }
  function suiteOf(id) {
    if (!PUB) return '';
    var L = PUB.list;
    for (var k in L) if (L[k].parts.indexOf(id) >= 0) return k;
    return '';
  }
  // 這張卡片是會員中心的哪個系統？自動判斷：卡片記的代號 → 卡片代號本身 → 對應的首頁工具網址和會員中心網址一樣
  var normU = function (u) { return String(u || '').replace(/[?#].*$/, '').replace(/index\.html$/, '').replace(/\/+$/, '').toLowerCase(); };
  function appOf(l, id) {
    var A = (W && W.APPS) || {};
    if (!l || arr(l.parts).length) return '';   // 套組卡本身不是一個系統
    if (l.app && A[l.app]) return l.app;
    if (id && A[id]) return id;
    var urls = arr(l.from).map(function (tid) { var m = motherTool(tid); return m && normU(m.href); }).concat([normU(l.url)]).filter(Boolean);
    for (var k in A) { var au = normU(A[k].url); if (au && urls.some(function (u) { return u === au || u.indexOf(au + '/') === 0; })) return k; }
    return '';
  }
  // 卡片外觀：勾了「跟母頁同步」而且母頁有這個工具 → 用母頁的圖示、名稱（免申請的網址也跟母頁）
  function face(id) {
    var l = PUB && PUB.list[id];
    if (!l) return null;
    var f = { icon: l.icon, name: l.name, brief: l.brief, url: l.url, synced: false, drawer: null };
    var m = l.sync && l.from[0] && motherTool(l.from[0]);
    if (m) {
      f.icon = m.icon || f.icon; f.name = m.name || f.name; f.synced = true;   // 一句話不跟（展覽館常會寫給外校老師看的版本），母頁改了管理頁會提醒
      if (l.mode === 'open' && m.href && (isSiteURL(m.href) || safeURL(m.href))) f.url = m.href;
      // 抽屜、小分類、順序也跟首頁（2026-11-08）：首頁搬家，展覽館跟著搬（展覽館要有同名的分類）
      var dn = MOTHER.drawers[m.drawer], D = (PUB || {}).drawers || {};
      for (var k in D) if (D[k].name === dn) { f.drawer = k; f.shelf = m.shelf || ''; f.order = 1000 + MOTHER.order.indexOf(m.id); f.placed = true; break; }
    }
    if (f.drawer == null) { f.drawer = l.drawer; f.shelf = l.shelf; f.order = l.order; }
    return f;
  }
  // 看得見嗎：自己的開關打開；套組成員（沒有單獨展出）還要套組也看得見
  function visible(id) {
    var l = PUB && PUB.list[id];
    if (!l || !l.on) return false;
    if (l.parts.length) return l.parts.some(function (c) { return PUB.list[c] && PUB.list[c].on; });
    var s = suiteOf(id);
    return !s || l.solo || !!(PUB.list[s] && PUB.list[s].on);
  }
  function get(id, opt) {
    var all = opt && opt.all;
    if (!PUB || !PUB.list[id]) return null;
    if (!all && !visible(id)) return null;
    var l = PUB.list[id], f = face(id);
    var t = Object.assign({ code: id }, PUB.items[id] || {}, l, { icon: f.icon, name: f.name, brief: f.brief, url: f.url, synced: f.synced, drawer: f.drawer, shelf: f.shelf, order: f.order });
    LIST_KEYS.forEach(function (k) { t[k] = rows(t[k]); if (!t[k].length) delete t[k]; });
    // 會員中心的系統：自動對應（不用老師選代號）；「開放使用」但沒有接會員中心的工具 → 當成免申請直接用
    t.app = appOf(l, id);
    if (t.mode === 'apply' && !t.app) t.mode = openURL(t) ? 'open' : 'show';
    t.appInfo = t.mode === 'apply' && W && W.APPS ? W.APPS[t.app] || null : null;
    t.external = /^https?:\/\//.test((t.appInfo && t.appInfo.url) || t.url || '');
    t.ready = !!(t.intro || t.feats || t.flow);
    t.suite = l.parts.length > 0;
    if (t.suite) {
      t.members = l.parts.map(function (c) { return get(c, { all: all }); }).filter(Boolean);
      if (!all) t.members = t.members.filter(function (m) { return m.on; });
    }
    var s = suiteOf(id);
    if (s) { var sl = PUB.list[s], sf = face(s); t.parent = { code: s, icon: sf.icon, name: sf.name, on: sl.on }; }
    return t;
  }
  // 展覽館首頁的卡片：套組成員（沒有單獨展出的）不另外列，放在套組卡裡
  function list(opt) {
    if (!PUB) return [];
    var all = opt && opt.all, order = {};
    drawers().forEach(function (d, i) { order[d.id] = i; });
    // 套組成員：沒有「也單獨展出」就不另外列；就算有，跟套組在同一個抽屜也不重複列
    return Object.keys(PUB.list).filter(function (id) { var s = suiteOf(id); return !s || all || (PUB.list[id].solo && face(id).drawer !== face(s).drawer); })
      .map(function (id) { return get(id, opt); }).filter(Boolean)
      .sort(function (a, b) { return ((order[a.drawer] != null ? order[a.drawer] : 99) - (order[b.drawer] != null ? order[b.drawer] : 99)) || ((a.order || 0) - (b.order || 0)); });
  }
  function searchText(t) {
    return plain([t.name, t.brief, t.sub, t.shelf, t.intro || '', MODES[t.mode]].concat(
      (t.feats || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.tools || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.facts || []).map(function (f) { return f[1]; }),
      (t.members || []).map(function (m) { return m.name + ' ' + m.brief; })
    ).join(' '));
  }

  // 母頁改過了嗎：卡片的 mref ＝ { 母頁工具id: 上次確認過的快照 }
  // 有快照 → 和快照比（名稱、一句話、功能清單…任何一欄改了都抓得到）；沒有快照 → 只比圖示、名稱
  function mrefOf(l) { return mrefMap(l) || {}; }
  function mrefMap(l) { var r = l && l.mref; if (!r || typeof r !== 'object') return null; if (typeof r.name === 'string' && l.from.length === 1) { var o = {}; o[l.from[0]] = r; return o; } return r; }
  function snapMref(from) { var o = {}; arr(from).forEach(function (tid) { var m = motherTool(tid); if (m) o[tid] = motherFace(m); }); return Object.keys(o).length ? o : null; }
  function motherChanges(id) {
    var l = PUB.list[id], out = [];
    if (!l || !MOTHER) return out;
    var ref = mrefOf(l);
    l.from.forEach(function (tid) {
      var m = motherTool(tid); if (!m) return;
      var cur = motherFace(m), r = ref[tid];
      if (r) { var k = faceDiff(r, cur); if (k.length) out.push({ tid: tid, keys: k, ref: r, cur: cur }); }
      else if (l.from.length === 1 && !l.sync) {
        var k2 = ['icon', 'name'].filter(function (x) { return String(l[x] || '') !== cur[x]; });
        if (k2.length) out.push({ tid: tid, keys: k2, ref: { icon: l.icon, name: l.name }, cur: cur });
      }
    });
    return out;
  }
  function motherChanged(id) { return motherChanges(id).length > 0; }
  /* ---------- 健檢：管理頁用，列出每張卡片的問題（err 一定要修才能讓人看見；warn 建議修；info 提醒） ---------- */
  function check(id) {
    var out = [], L = PUB.list, l = L[id], it = PUB.items[id] || {};
    if (!l) return out;
    var p = function (lv, msg, key) { out.push({ lv: lv, msg: msg, key: key || '' }); };
    var f = face(id);
    if (!String(f.name || '').trim()) p('err', '還沒有系統名稱', 'name');
    if (l.parts.length) {
      if (!l.parts.some(function (c) { return L[c] && L[c].on; })) p('err', '套組裡沒有任何「看得見」的系統，套組不會出現在展覽館', 'parts');
    } else if (l.mode === 'apply' && !appOf(l, id)) {
      p('err', '這個工具沒有接上會員中心（沒有帳號系統），不能「要申請」；請改成「✅ 開放使用」（免申請直接用）', 'app');
    } else if (l.mode === 'open') {
      if (!f.url) p('err', '「🚀 免申請直接用」要填工具網址', 'url');
      else if (!isSiteURL(f.url) && !safeURL(f.url)) p('err', '工具網址的格式不對（站內網址從網站根目錄寫起，或完整的 https:// 網址）', 'url');
    }
    if (!(it.intro || arr(it.feats).length || arr(it.flow).length)) p('warn', '還沒寫說明（簡介／功能／流程），說明頁會顯示「整理中」', 'intro');
    if (!arr(it.shots).length) p('warn', '還沒有截圖', 'shots');
    if (l.from.length && MOTHER) {
      l.from.forEach(function (tid) { if (!MOTHER.tools[tid]) p('warn', '母頁已經沒有「' + tid + '」這個工具', 'from'); });
      if (motherChanged(id)) p('info', l.sync ? '首頁改過這個工具（名稱、圖示已自動跟著改），一句話和說明要不要也看一下？' : '首頁的這個工具改過了，卡片要不要跟著改？', 'mother');
    }
    var s = suiteOf(id);
    if (s && l.on && !l.solo && !L[s].on) p('info', '所屬的套組「' + face(s).name + '」看不見，所以這個系統目前也看不見', 'suite');
    return out;
  }

  /* ---------- 網址（站內網址從 showcase/ 往上一層；base 讓分享頁可以多上一層） ---------- */
  function appURL(t, base) { var u = t.appInfo && t.appInfo.url; return u ? (/^https?:/.test(u) ? u : (base || '../') + u) : ''; }
  function openURL(t, base) { var u = String(t.url || '').trim(); if (!u) return ''; return safeURL(u) || (isSiteURL(u) ? (base || '../') + u : ''); }
  // 會員中心：可以一次帶好幾個系統（app=grade,cc），back＝申請完要回到展覽館哪一頁
  function applyURL(apps, back) {
    apps = [].concat(apps || []).filter(Boolean);
    return '../account/?app=' + apps.map(encodeURIComponent).join(',') + '&from=showcase' + (back ? '&back=' + encodeURIComponent(back) : '');
  }
  function shareURL(code) { return SITE + 'share/' + code + '.html'; }

  /* ---------- 📸 畫面預覽 ---------- */
  // 圖片來源：img/x.webp（網站檔案）、media/x.webp（分享頁用的下載檔）、f:<id>（老師上傳到 Firebase）
  function thumb(src) { return String(src).replace(/\/([^\/]+)$/, '/t/$1'); }
  function imgTag(src, alt) {
    src = String(src || '');
    if (src.indexOf('f:') === 0) return '<img src="' + BLANK + '" data-fimg="' + esc(src.slice(2)) + '" alt="' + esc(alt) + '">';
    return '<img src="' + esc(thumb(src)) + '" alt="' + esc(alt) + '" loading="lazy" onerror="if(!this.dataset.r){this.dataset.r=1;this.src=this.closest(\'[data-zoom]\').getAttribute(\'data-zoom\')}">';
  }
  function shotsHTML(t) {
    var shots = t.shots || [];
    if (!shots.length) return '<div class="shot"><div class="ic">📸</div><b>畫面截圖整理中</b></div>';
    var fig = function (s) {
      return '<figure class="sfig"><button type="button" class="szoom" data-zoom="' + esc(s[0]) + '" data-cap="' + esc(s[1]) + '" aria-label="放大：' + esc(s[1]) + '">' +
        imgTag(s[0], s[1]) + '</button><figcaption>' + esc(s[1]) + '</figcaption></figure>';
    };
    var isPhone = function (s) { return s[2] && s[2] < 600; };
    var wide = shots.filter(function (s) { return !isPhone(s); }), phone = shots.filter(isPhone);
    return (wide.length ? '<h3 class="shot-h">💻 老師端（電腦）</h3><div class="shot-wide">' + wide.map(fig).join('') + '</div>' : '') +
      (phone.length ? '<h3 class="shot-h">📱 學生端（手機）</h3><div class="shot-phone">' + phone.map(fig).join('') + '</div>' : '') +
      '<p class="act-note">畫面中的學生姓名、成績都是測試用的假資料。點圖片可以放大。</p>';
  }

  /* =========================================================
     說明頁內容（guide.html 與分享頁 share/<代號>.html 共用，內容永遠一致）
     page：'guide'＝展覽館說明頁（有按鈕）　'share'＝社群分享頁（完全沒有連結）
     ========================================================= */
  var ul = function (a) { return '<ul class="clues">' + a.map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>'; };
  // 套組裡的系統：一張一張小卡，各自的狀態與按鈕（可以分開申請）
  function membersHTML(t, share) {
    var ms = t.members || [];
    if (!ms.length) return '<p>系統整理中。</p>';
    var applyApps = ms.filter(function (m) { return m.mode === 'apply' && m.appInfo; }).map(function (m) { return m.app; });
    return '<div class="members">' + ms.map(function (m) {
      var btn = '';
      if (!share) {
        if (m.ready) btn += '<a class="btn ghost small" href="guide.html?app=' + encodeURIComponent(m.code) + '">📘 詳細說明</a>';
        if (m.mode === 'apply' && m.appInfo) btn += '<a class="btn small" href="' + esc(applyURL([m.app], t.code)) + '">📝 申請這一個</a>';
        if (m.mode === 'open' && openURL(m)) btn += '<a class="btn small" href="' + esc(openURL(m)) + '" target="_blank" rel="noopener">🚀 直接開啟 ↗</a>';
      }
      return '<div class="member mode-' + esc(m.mode) + '"><div class="m-top"><span class="ic" aria-hidden="true">' + esc(m.icon) + '</span><div><b>' + esc(m.name) + '</b>' +
        '<span class="pill mode-' + esc(m.mode) + '">' + esc(MODES[m.mode]) + '</span></div></div>' +
        '<p>' + rich(m.brief) + '</p>' + (btn ? '<div class="actions">' + btn + '</div>' : '') + '</div>';
    }).join('') + '</div>' +
      (!share && applyApps.length > 1 ? '<div class="apply-all"><div><b>📝 想一次申請好幾個？</b><span>會員中心會先幫你勾好下面這些，不需要的取消勾選就好：' +
        ms.filter(function (m) { return applyApps.indexOf(m.app) >= 0; }).map(function (m) { return esc(m.icon + ' ' + m.name); }).join('、') + '</span></div>' +
        '<a class="btn" href="' + esc(applyURL(applyApps, t.code)) + '">📝 一次申請</a></div>' : '') +
      (ms.some(function (m) { return m.mode === 'show'; }) ? '<p class="act-note">「👀 只展示」的系統還沒開放其他老師使用，有興趣請私訊巫魚子老師。</p>' : '');
  }
  function sections(t, page) {
    var share = page === 'share', sec = [];
    if (t.suite) sec.push(['members', '🏘️ 包含的系統', membersHTML(t, share)]);
    if (t.ready) {
      if (t.notice) sec.push(['notice', '📍 使用前請先看', '<div class="callout">' + rich(t.notice) + '</div>']);
      if (t.tools) sec.push(['tools', '🧪 包含哪些系統', t.tools.map(function (x) {
        return '<div class="sub-tool"><h3>' + esc(x[0]) + ' ' + esc(x[1]) + '</h3><p>' + rich(x[2]) + '</p></div>';
      }).join('')]);
      if (t.shots) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.flow) sec.push(['flow', t.suite ? '🔗 系統之間怎麼連' : '🗺️ 上課流程', '<div class="flow">' + t.flow.map(function (x, i) {
        return (i ? '<span class="arr" aria-hidden="true">→</span>' : '') +
          '<div class="node"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><b>' + rich(x[1]) + '</b><span>' + rich(x[2] || '') + '</span>' +
          (x[3] ? '<span class="who ' + (x[3] === 's' ? 's">學生' : 't">老師') + '</span>' : '') + '</div>';
      }).join('') + '</div>' + (t.flow.some(function (x) { return x[3]; }) ? '<p class="act-note">深藍標籤＝老師做的事，黃色標籤＝學生做的事。</p>' : '')]);
      if (t.feats) sec.push(['features', '✨ 主要功能', '<div class="feats">' + t.feats.map(function (x) {
        return '<div class="feat"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><div><b>' + rich(x[1]) + '</b><span>' + rich(x[2] || '') + '</span></div></div>';
      }).join('') + '</div>']);
      if (t.student || t.teacher) sec.push(['sides', '👀 學生端與老師端', '<div class="two">' +
        (t.student ? '<div class="side"><h3>👩‍🎓 學生</h3>' + ul(t.student) + '</div>' : '') +
        (t.teacher ? '<div class="side"><h3>👨‍🏫 老師</h3>' + ul(t.teacher) + '</div>' : '') + '</div>']);
      if (t.prep) sec.push(['prep', '🧰 開始前要準備', ul(t.prep)]);
      if (!t.shots && !t.suite) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.faq) sec.push(['faq', '❓ 常見問題', '<dl class="faq">' + t.faq.map(function (x) { return '<dt>' + rich(x[0]) + '</dt><dd>' + rich(x[1] || '') + '</dd>'; }).join('') + '</dl>']);
    } else if (!t.suite) {
      sec.push(['about', '📄 這個系統', '<p>' + rich(t.brief) + '</p><div class="callout blue">📝 這個系統的詳細說明還在整理中。</div>']);
    }
    if (share) {
      var how = t.suite ? '裡面的系統可以分開申請，也可以一起用（需要巫魚子老師核准）。'
        : t.mode === 'apply' ? '目前開放給其他老師申請使用（需要巫魚子老師核准）。'
        : t.mode === 'open' ? '這是免登入的小工具，可以在「巫魚子教課事務所｜教師展覽館」找到它。' : '';
      sec.push(['apply', '🙋 想在自己的課堂使用？', '<p>這是巫魚子老師開發的教學系統。' + how + '</p><p>有興趣的話，歡迎直接私訊巫魚子老師 😊</p>']);
    } else if (t.suite) {
      sec.push(['apply', '🚪 怎麼申請', '<ol class="steps">' + applySteps().map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        '<p>上面「🏘️ 包含的系統」每一個都可以<b>單獨申請</b>，也可以按「📝 一次申請」一起申請。</p>' + actionsHTML(t, false)]);
    } else if (t.mode === 'apply') {
      sec.push(['apply', '🚪 怎麼申請', '<ol class="steps">' + applySteps().map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        (t.external && /grade-query-system/.test(appURL(t)) ? '<div class="callout blue">🔑 課堂小鎮的系統<b>只能用 Google 帳號</b>登入，申請時也請用同一個 Google 帳號。</div>' : '') + actionsHTML(t, false)]);
    } else if (t.mode === 'open') {
      sec.push(['apply', '🚀 怎麼使用', '<p>不用申請帳號，按「🚀 直接開啟」就能使用。資料存在你自己的瀏覽器或裝置裡。</p>' + actionsHTML(t, false)]);
    } else {
      sec.push(['apply', '🙋 想在自己的課堂使用？', '<p>這個系統目前只展示、還沒開放其他老師使用。有興趣的話，歡迎私訊巫魚子老師 😊</p>' + actionsHTML(t, false)]);
    }
    return sec;
  }
  function applySteps() {
    return (SC.APPLY && SC.APPLY.length ? SC.APPLY : ['到<b>會員中心</b>用 Google 帳號登入，勾選想用的系統。', '等巫魚子老師核准。', '核准後就能打開系統。']);
  }
  function actionsHTML(t, big) {
    var sm = big ? '' : ' small', b = '';
    if (t.suite) {
      var apps = (t.members || []).filter(function (m) { return m.mode === 'apply' && m.appInfo; }).map(function (m) { return m.app; });
      if (apps.length) b += '<a class="btn' + sm + '" href="' + esc(applyURL(apps, t.code)) + '">📝 申請使用' + (apps.length > 1 ? '（可以只勾需要的）' : '') + '</a>';
      var o = openURL(t);
      if (o) b += '<a class="btn ghost' + sm + '" href="' + esc(o) + '" target="_blank" rel="noopener">🔑 已開通，前往' + esc(t.name) + ' ↗</a>';
    } else if (t.mode === 'apply' && t.appInfo) {
      var a = appURL(t);
      b += '<a class="btn' + sm + '" href="' + esc(applyURL([t.app], t.code)) + '">📝 申請使用</a>' +
        (a ? '<a class="btn ghost' + sm + '" href="' + esc(a) + '"' + (t.external ? ' target="_blank" rel="noopener"' : '') + '>🔑 已開通，前往系統' + (t.external ? ' ↗' : ' →') + '</a>' : '');
    } else if (t.mode === 'open') {
      var u = openURL(t);
      if (u) b += '<a class="btn' + sm + '" href="' + esc(u) + '" target="_blank" rel="noopener">🚀 直接開啟 ↗</a>';
    }
    (t.links || []).forEach(function (l) { var u2 = safeURL(l[1]); if (u2) b += '<a class="btn ghost' + sm + '" href="' + esc(u2) + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; });
    if (t.ready || t.suite) b += '<button type="button" class="btn ghost' + sm + '" data-share="' + esc(shareURL(t.code)) + '" title="複製一個只有這一頁、沒有其他連結的網址，適合貼到社群">📤 分享網址</button>';
    return '<div class="actions">' + b + '</div>';
  }
  function noteHTML(t) {
    if (t.suite) return '裡面的系統可以分開申請、任意組合；申請過的系統之間會自動連動。';
    if (t.mode === 'apply') return '還沒有帳號？先按「📝 申請使用」。' + (t.external ? '這是獨立網站，會在新分頁打開。' : '');
    if (t.mode === 'open') return '免登入，按「🚀 直接開啟」就能使用（會在新分頁打開）。';
    return '目前只展示，想在自己的課堂使用請私訊巫魚子老師。';
  }
  // 返回鍵：套組成員回套組那一頁，其他回展覽館
  function backOf(t) { return t.parent && t.parent.on ? { href: 'guide.html?app=' + encodeURIComponent(t.parent.code), text: '← 回' + t.parent.name } : { href: './', text: '← 回教師展覽館' }; }
  function pageHTML(t, page) {
    var share = page === 'share', d = drawerOf(t.parent && PUB.list[t.parent.code] && !t.solo ? PUB.list[t.parent.code] : t), sec = sections(t, page), bk = backOf(t);
    var facts = (t.facts || []).map(function (f) { return '<div class="fact"><b>' + esc(f[0]) + '</b>' + rich(f[1] || '') + '</div>'; }).join('');
    var inSuite = t.parent ? '<div class="callout blue in-suite">🏘️ 這是「' + esc(t.parent.icon + ' ' + t.parent.name) + '」裡的其中一個系統，可以單獨申請，也可以和其他系統一起用。' +
      (share || !t.parent.on ? '' : ' <a href="guide.html?app=' + encodeURIComponent(t.parent.code) + '">看整個' + esc(t.parent.name) + ' →</a>') + '</div>' : '';
    return '<div class="gbody">' +
      '<nav class="toc" aria-label="目錄"><div class="toc-h">Contents</div>' +
        '<a href="#top">📘 簡介</a>' +
        sec.map(function (s) { return '<a href="#' + s[0] + '">' + esc(s[1]) + '</a>'; }).join('') +
        (share ? '' : '<a class="toc-back" href="' + esc(bk.href) + '">' + esc(bk.text) + '</a>') +
      '</nav>' +
      '<main>' +
        '<section class="hero" id="top" style="scroll-margin-top:76px">' +
          '<div class="hero-top"><div class="no">' + esc(d.tag) + ' · ' + esc(d.name) + (t.shelf ? ' · ' + esc(t.shelf) : '') + '</div>' +
            '<h1><span aria-hidden="true">' + esc(t.icon) + '</span>' + esc(t.name) + '</h1>' +
            '<div class="sub">' + rich(t.sub || t.brief) + '</div></div>' +
          '<div class="hero-body">' + inSuite +
            (t.intro ? '<p class="intro">' + rich(t.intro) + '</p>' : '') +
            (facts ? '<div class="facts">' + facts + '</div>' : '') +
            (share ? '' : actionsHTML(t, true) + '<p class="act-note">' + noteHTML(t) + '</p>') +
          '</div>' +
        '</section>' +
        sec.map(function (s) { return '<section class="gcard" id="' + s[0] + '"><h2>' + esc(s[1]) + '</h2>' + s[2] + '</section>'; }).join('') +
        '<div class="foot-nav">' + (share ? '' : '<a class="btn ghost small" href="' + esc(bk.href) + '">' + esc(bk.text) + '</a>') + '<a class="btn ghost small" href="#top">↑ 回到最上面</a></div>' +
        (share ? '<p class="share-foot">巫魚子教課事務所｜教師展覽館　© 巫魚子老師</p>' : '') +
      '</main>' +
    '</div>';
  }

  /* ---------- 頁面動作：目錄捲動、Firebase 圖片、燈箱、複製分享網址（瀏覽器裡才跑） ---------- */
  var imgCache = {};
  function fimg(id, full) {
    var k = id + (full ? ':d' : ':t');
    // 讀不到時再試一次（學校網路偶爾會斷一下）
    var once = function () { return fetchJSON('showcase/img/' + id + '/' + (full ? 'data' : 't'), 15000); };
    return imgCache[k] || (imgCache[k] = once().catch(function () { return new Promise(function (r) { setTimeout(r, 1200); }).then(once); })
      .then(function (d) { return d && /^data:image\//.test(d) ? d : ''; }).catch(function () { delete imgCache[k]; return ''; }));
  }
  function loadImages(doc) {
    Array.prototype.forEach.call((doc || document).querySelectorAll('img[data-fimg]'), function (im) {
      var id = im.getAttribute('data-fimg'); im.removeAttribute('data-fimg');
      fimg(id, false).then(function (src) { if (src) im.src = src; else im.alt = '（圖片暫時讀不到）'; });
    });
  }
  var wired = false;
  function enhance(doc) {
    doc = doc || document;
    loadImages(doc);
    var links = Array.prototype.slice.call(doc.querySelectorAll('.toc a[href^="#"]'));
    var targets = links.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
    var spy = function () {
      var y = window.scrollY + 110, on = 0;
      targets.forEach(function (el, i) { if (el && el.offsetTop <= y) on = i; });
      if (window.innerHeight + window.scrollY >= doc.body.scrollHeight - 4) on = targets.length - 1;
      links.forEach(function (a, i) { a.classList.toggle('on', i === on); });
    };
    window.onscroll = spy; spy();
    if (wired) return; wired = true;
    var box = null;
    var close = function () { if (box) { box.remove(); box = null; } };
    doc.addEventListener('click', function (e) {
      var z = e.target.closest && e.target.closest('[data-zoom]');
      if (z) {
        close(); box = doc.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog');
        var src = z.getAttribute('data-zoom'), f = src.indexOf('f:') === 0;
        box.innerHTML = '<figure><img src="' + (f ? BLANK : esc(src)) + '" alt=""><figcaption>' + esc(z.getAttribute('data-cap')) + (f ? '（載入中…）' : '') + '</figcaption></figure><button type="button" class="lb-x" aria-label="關閉">✕</button>';
        box.onclick = close; doc.body.appendChild(box);
        if (f) { var me = box; fimg(src.slice(2), true).then(function (d) { if (me !== box) return; me.querySelector('figcaption').textContent = z.getAttribute('data-cap') + (d ? '' : '（圖片暫時讀不到）'); if (d) me.querySelector('img').src = d; }); }
        return;
      }
      var sh = e.target.closest && e.target.closest('[data-share]');
      if (sh) {
        var url = sh.getAttribute('data-share'), old = sh.textContent;
        var done = function (ok) { sh.textContent = ok ? '✅ 已複製分享網址' : '⚠️ 請手動複製'; if (!ok) window.prompt('分享網址（只有這一頁）', url); setTimeout(function () { sh.textContent = old; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      }
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    if (location.hash) { var el = doc.getElementById(location.hash.slice(1)); if (el) setTimeout(function () { el.scrollIntoView(); }, 0); }
  }

  Object.assign(SC, {
    DB: DB, SITE: SITE, SCHEMA: SCHEMA, MODES: MODES, ITEM_KEYS: ITEM_KEYS, LIST_KEYS: LIST_KEYS, NO_DRAWER: NO_DRAWER,
    esc: esc, rich: rich, plain: plain, arr: arr, rows: rows, safeURL: safeURL, isSiteURL: isSiteURL,
    parseMother: parseMother, setMother: setMother, loadMother: loadMother, motherTool: motherTool, motherFace: motherFace, sameFace: sameFace, faceDiff: faceDiff, MLABEL: MLABEL,
    seedPub: seedPub, setPub: setPub, normalize: normalize, load: load, fetchJSON: fetchJSON, timed: timed,
    drawers: drawers, drawerOf: drawerOf, suiteOf: suiteOf, appOf: appOf, motherChanged: motherChanged, motherChanges: motherChanges, snapMref: snapMref, mrefOf: mrefOf, face: face, visible: visible, get: get, list: list, searchText: searchText, check: check,
    appURL: appURL, openURL: openURL, applyURL: applyURL, shareURL: shareURL, thumb: thumb,
    sections: sections, pageHTML: pageHTML, backOf: backOf, enhance: enhance, loadImages: loadImages, fimg: fimg
  });
  root.SHOWCASE = SC;
})(this);
