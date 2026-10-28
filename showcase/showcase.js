/* =========================================================
   🏛️ 教師展覽館：共用引擎（展覽館首頁、說明頁、分享頁產生器、管理頁都用這支）
   ---------------------------------------------------------
   2026-10-28 改版：展出內容改存 Firebase，老師用管理員帳號在 admin.html 自己新增、調整、下架
     showcase/pub = {
       drawers: { <分類id>: { name, tag, desc, color, soft, order } },
       list:    { <系統id>: { on 展出中, drawer, shelf, order, icon, name, brief, mode, app, url, from[] } },
       items:   { <系統id>: { sub, intro, facts, notice, tools, flow, feats, student, teacher, prep, faq, links, shots } },
       rev:     最後更新時間（GitHub 每 30 分鐘看到它變了就重做分享頁）
     }
     showcase/img/<圖片id> = { data: 原圖, t: 縮圖 }（老師上傳的截圖，dataURL）
   mode：apply＝要到會員中心申請（app＝會員中心系統代號）
         open ＝免登入，直接開啟（url＝工具網址，站內網址從網站根目錄算）
         show ＝只展示，想用請私訊巫魚子老師
   Firebase 讀不到時：用 data.js（＋drafts.js）內建的內容（seedPub），頁面不會空白
   ========================================================= */
(function (root) {
  var SC = root.SHOWCASE || { DRAWERS: [], GUIDES: {}, APPLY: [] };
  var W = root.WuStaff;
  var DB = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app';
  var SITE = 'https://puff0223-chwu.github.io/wuyutzu-tools/showcase/';
  var MODES = { apply: '🔐 開放申請', open: '🚀 免申請直接用', show: '👀 只展示' };
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // 說明文字可以用 <b> <i> <sub> <sup> <br>（其他一律跳脫）；CM 自動變成 C<sub>M</sub>
  function rich(s) {
    return esc(s).replace(/&lt;(\/?)(b|i|sub|sup)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>').replace(/\bCM\b/g, 'C<sub>M</sub>');
  }
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ''); }
  function arr(v) { return Array.isArray(v) ? v.filter(function (x) { return x != null; }) : v && typeof v === 'object' ? Object.keys(v).sort(function (a, b) { return a - b; }).map(function (k) { return v[k]; }) : []; }
  var safeURL = function (u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };

  /* ---------- 內建內容：data.js 的 7 個系統（展出中）＋ drafts.js 的初版說明（未展出） ---------- */
  var DCOL = ['d1', 'd2', 'd3', 'd4'];
  function seedPub() {
    var pub = { drawers: {}, list: {}, items: {}, rev: 0 };
    (SC.DRAWERS || []).forEach(function (d, i) { pub.drawers[DCOL[i] || ('d' + (i + 1))] = { name: d.name, tag: d.tag, desc: d.desc, color: d.color, soft: d.soft, order: i }; });
    var add = function (id, g, on, n) {
      var c = {}, l = { on: on, drawer: DCOL[g.drawer] || 'd1', shelf: g.shelf || '', order: n, icon: g.icon || '📁', name: g.name || id, brief: g.brief || '', mode: g.mode || 'apply', app: g.app || '', url: g.url || '', from: g.from || [] };
      ['sub', 'intro', 'facts', 'notice', 'tools', 'flow', 'feats', 'student', 'teacher', 'prep', 'faq', 'links', 'shots'].forEach(function (k) { if (g[k] != null) c[k] = g[k]; });
      pub.list[id] = l; pub.items[id] = c;
    };
    var n = 0;
    Object.keys(SC.GUIDES || {}).forEach(function (code) { var g = Object.assign({ app: code, mode: 'apply' }, SC.GUIDES[code]); add(code, g, true, n++); });
    Object.keys(SC.DRAFTS || {}).forEach(function (id) { if (!pub.list[id]) add(id, SC.DRAFTS[id], false, n++); });
    return pub;
  }

  /* ---------- 讀取：先用這台裝置存的上一份（馬上顯示），再向 Firebase 拿最新的 ---------- */
  var PUB = null, SOURCE = '';
  function setPub(p, src) { PUB = normalize(p); SOURCE = src; SC.PUB = PUB; SC.SOURCE = src; }
  function normalize(p) {
    p = p || {};
    var out = { drawers: p.drawers || {}, list: p.list || {}, items: p.items || {}, rev: +p.rev || 0 };
    Object.keys(out.list).forEach(function (id) { var l = out.list[id]; if (!l) { delete out.list[id]; return; } l.from = arr(l.from); });
    return out;
  }
  function cacheGet() { try { return JSON.parse(localStorage.getItem('sc-pub-v1')); } catch (e) { return null; } }
  function cachePut(p) { try { localStorage.setItem('sc-pub-v1', JSON.stringify(p)); } catch (e) { } }
  function fetchJSON(path, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 8000) : null;
    return fetch(DB + '/' + path + '.json', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  // cb 可能被呼叫兩次：第一次用裝置裡的舊資料（很快），第二次是 Firebase 的新資料（有變才再呼叫）
  function load(cb) {
    var cached = cacheGet();
    if (cached && cached.rev) { setPub(cached, 'cache'); cb(); }
    return fetchJSON('showcase/pub').then(function (p) {
      if (!p || !p.rev) {   // 還沒匯入過：用內建內容
        if (!PUB) { setPub(seedPub(), 'seed'); cb(); }
        return;
      }
      var changed = !cached || cached.rev !== p.rev;
      cachePut(p);
      if (changed || !PUB) { setPub(p, 'live'); cb(); }
      else SOURCE = SC.SOURCE = 'live';
    }).catch(function () { if (!PUB) { setPub(seedPub(), 'seed'); cb(); } });
  }

  /* ---------- 查詢 ---------- */
  function drawers() {
    var D = (PUB || {}).drawers || {};
    return Object.keys(D).map(function (id) { return Object.assign({ id: id }, D[id]); })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function drawerOf(t) {
    var D = (PUB || {}).drawers || {}, d = D[t.drawer];
    return d ? Object.assign({ id: t.drawer }, d) : { id: '', name: '其他', tag: 'Drawer +', desc: '', color: '#6d6a75', soft: '#efedf2' };
  }
  function get(id, opt) {
    if (!PUB || !PUB.list[id]) return null;
    var l = PUB.list[id];
    if (!l.on && !(opt && opt.all)) return null;
    var t = Object.assign({ code: id }, PUB.items[id] || {}, l);
    ['facts', 'tools', 'flow', 'feats', 'student', 'teacher', 'prep', 'faq', 'links', 'shots'].forEach(function (k) { t[k] = arr(t[k]).map(function (x) { return Array.isArray(x) ? x : x && typeof x === 'object' ? arr(x) : x; }); if (!t[k].length) delete t[k]; });
    t.mode = MODES[t.mode] ? t.mode : 'show';
    t.appInfo = t.mode === 'apply' && W && W.APPS ? W.APPS[t.app] || null : null;
    t.external = /^https?:\/\//.test((t.appInfo && t.appInfo.url) || t.url || '');
    t.ready = !!(t.intro || t.feats || t.flow);
    return t;
  }
  function list(opt) {
    if (!PUB) return [];
    var order = {}; drawers().forEach(function (d, i) { order[d.id] = i; });
    return Object.keys(PUB.list).map(function (id) { return get(id, opt); }).filter(Boolean)
      .sort(function (a, b) { return ((order[a.drawer] != null ? order[a.drawer] : 99) - (order[b.drawer] != null ? order[b.drawer] : 99)) || ((a.order || 0) - (b.order || 0)); });
  }
  function searchText(t) {
    return plain([t.name, t.brief, t.sub, t.shelf, t.intro || '', MODES[t.mode]].concat(
      (t.feats || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.tools || []).map(function (f) { return f[1] + ' ' + f[2]; }),
      (t.facts || []).map(function (f) { return f[1]; })
    ).join(' '));
  }
  // 網址（站內網址從 showcase/ 往上一層；base 讓分享頁可以多上一層）
  function appURL(t, base) { var u = t.appInfo && t.appInfo.url; return u ? (/^https?:/.test(u) ? u : (base || '../') + u) : ''; }
  function openURL(t, base) { var u = String(t.url || '').trim(); if (!u) return ''; return /^https?:\/\//.test(u) ? u : /^[\w\-./]+$/.test(u) && !/\.\./.test(u) ? (base || '../') + u.replace(/^\/+/, '') : ''; }
  function applyURL(code) { return '../account/?app=' + encodeURIComponent(code) + '&from=showcase'; }
  function shareURL(code) { return SITE + 'share/' + code + '.html'; }

  /* ---------- 📸 畫面預覽 ---------- */
  // 圖片來源：img/x.webp（網站檔案）、media/x.webp（分享頁用的下載檔）、f:<id>（老師上傳到 Firebase）
  function thumb(src) { return String(src).replace(/\/([^\/]+)$/, '/t/$1'); }
  function imgTag(src, alt) {
    src = String(src || '');
    if (src.indexOf('f:') === 0) return '<img src="' + BLANK + '" data-fimg="' + esc(src.slice(2)) + '" alt="' + esc(alt) + '">';
    return '<img src="' + esc(thumb(src)) + '" alt="' + esc(alt) + '" loading="lazy">';
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
     page：'guide'＝展覽館說明頁（有按鈕、返回展覽館）　'share'＝社群分享頁（完全沒有連結）
     ========================================================= */
  function sections(t, page) {
    var share = page === 'share', sec = [];
    var ul = function (a) { return '<ul class="clues">' + a.map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>'; };
    if (t.ready) {
      if (t.notice) sec.push(['notice', '📍 使用前請先看', '<div class="callout">' + rich(t.notice) + '</div>']);
      if (t.tools) sec.push(['tools', '🧪 包含哪些系統', t.tools.map(function (x) {
        return '<div class="sub-tool"><h3>' + esc(x[0]) + ' ' + esc(x[1]) + '</h3><p>' + rich(x[2]) + '</p></div>';
      }).join('')]);
      if (t.shots) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.flow) sec.push(['flow', '🗺️ 上課流程', '<div class="flow">' + t.flow.map(function (x, i) {
        return (i ? '<span class="arr" aria-hidden="true">→</span>' : '') +
          '<div class="node"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><b>' + rich(x[1]) + '</b><span>' + rich(x[2] || '') + '</span>' +
          '<span class="who ' + (x[3] === 's' ? 's">學生' : 't">老師') + '</span></div>';
      }).join('') + '</div><p class="act-note">深藍標籤＝老師做的事，黃色標籤＝學生做的事。</p>']);
      if (t.feats) sec.push(['features', '✨ 主要功能', '<div class="feats">' + t.feats.map(function (x) {
        return '<div class="feat"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><div><b>' + rich(x[1]) + '</b><span>' + rich(x[2] || '') + '</span></div></div>';
      }).join('') + '</div>']);
      if (t.student || t.teacher) sec.push(['sides', '👀 學生端與老師端', '<div class="two">' +
        (t.student ? '<div class="side"><h3>👩‍🎓 學生</h3>' + ul(t.student) + '</div>' : '') +
        (t.teacher ? '<div class="side"><h3>👨‍🏫 老師</h3>' + ul(t.teacher) + '</div>' : '') + '</div>']);
      if (t.prep) sec.push(['prep', '🧰 開始前要準備', ul(t.prep)]);
      if (!t.shots) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.faq) sec.push(['faq', '❓ 常見問題', '<dl class="faq">' + t.faq.map(function (x) { return '<dt>' + rich(x[0]) + '</dt><dd>' + rich(x[1] || '') + '</dd>'; }).join('') + '</dl>']);
    } else {
      sec.push(['about', '📄 這個系統', '<p>' + rich(t.brief) + '</p><div class="callout blue">📝 這個系統的詳細說明還在整理中。</div>']);
    }
    if (share) {
      var how = t.mode === 'apply' ? '目前開放給其他老師申請使用（需要巫魚子老師核准）。'
        : t.mode === 'open' ? '這是免登入的小工具，可以在「巫魚子教課事務所｜教師展覽館」找到它。' : '';
      sec.push(['apply', '🙋 想在自己的課堂使用？', '<p>這是巫魚子老師開發的教學系統。' + how + '</p><p>有興趣的話，歡迎直接私訊巫魚子老師 😊</p>']);
    } else if (t.mode === 'apply') {
      sec.push(['apply', '🚪 怎麼申請', '<ol class="steps">' + (SC.APPLY || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        (t.code === 'grade' ? '<div class="callout blue">🔑 成績調閱室<b>只能用 Google 帳號</b>登入，申請時也請用同一個 Google 帳號。</div>' : '') + actionsHTML(t, false)]);
    } else if (t.mode === 'open') {
      sec.push(['apply', '🚀 怎麼使用', '<p>不用申請帳號，按「🚀 直接開啟」就能使用。資料存在你自己的瀏覽器或裝置裡。</p>' + actionsHTML(t, false)]);
    } else {
      sec.push(['apply', '🙋 想在自己的課堂使用？', '<p>這個系統目前只展示、還沒開放其他老師使用。有興趣的話，歡迎私訊巫魚子老師 😊</p>' + actionsHTML(t, false)]);
    }
    return sec;
  }
  function actionsHTML(t, big) {
    var sm = big ? '' : ' small', b = '';
    if (t.mode === 'apply') {
      var a = appURL(t);
      b += '<a class="btn' + sm + '" href="' + esc(applyURL(t.app || t.code)) + '">📝 申請使用</a>' +
        (a ? '<a class="btn ghost' + sm + '" href="' + esc(a) + '"' + (t.external ? ' target="_blank" rel="noopener"' : '') + '>🔑 已開通，前往系統' + (t.external ? ' ↗' : ' →') + '</a>' : '');
    } else if (t.mode === 'open') {
      var o = openURL(t);
      if (o) b += '<a class="btn' + sm + '" href="' + esc(o) + '" target="_blank" rel="noopener">🚀 直接開啟 ↗</a>';
    }
    (t.links || []).forEach(function (l) { var u = safeURL(l[1]); if (u) b += '<a class="btn ghost' + sm + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; });
    if (t.ready) b += '<button type="button" class="btn ghost' + sm + '" data-share="' + esc(shareURL(t.code)) + '" title="複製一個只有這一頁、沒有其他連結的網址，適合貼到社群">📤 分享網址</button>';
    return '<div class="actions">' + b + '</div>';
  }
  function noteHTML(t) {
    if (t.mode === 'apply') return '還沒有帳號？先按「📝 申請使用」。' + (t.external ? '這是獨立網站，會在新分頁打開。' : '');
    if (t.mode === 'open') return '免登入，按「🚀 直接開啟」就能使用（會在新分頁打開）。';
    return '目前只展示，想在自己的課堂使用請私訊巫魚子老師。';
  }
  function pageHTML(t, page) {
    var share = page === 'share', d = drawerOf(t), sec = sections(t, page);
    var facts = (t.facts || []).map(function (f) { return '<div class="fact"><b>' + esc(f[0]) + '</b>' + rich(f[1] || '') + '</div>'; }).join('');
    return '<div class="gbody">' +
      '<nav class="toc" aria-label="目錄"><div class="toc-h">Contents</div>' +
        '<a href="#top">📘 簡介</a>' +
        sec.map(function (s) { return '<a href="#' + s[0] + '">' + esc(s[1]) + '</a>'; }).join('') +
        (share ? '' : '<a class="toc-back" href="./">← 回教師展覽館</a>') +
      '</nav>' +
      '<main>' +
        '<section class="hero" id="top" style="scroll-margin-top:76px">' +
          '<div class="hero-top"><div class="no">' + esc(d.tag) + ' · ' + esc(d.name) + (t.shelf ? ' · ' + esc(t.shelf) : '') + '</div>' +
            '<h1><span aria-hidden="true">' + esc(t.icon) + '</span>' + esc(t.name) + '</h1>' +
            '<div class="sub">' + rich(t.sub || t.brief) + '</div></div>' +
          '<div class="hero-body">' +
            (t.intro ? '<p class="intro">' + rich(t.intro) + '</p>' : '') +
            (facts ? '<div class="facts">' + facts + '</div>' : '') +
            (share ? '' : actionsHTML(t, true) + '<p class="act-note">' + noteHTML(t) + '</p>') +
          '</div>' +
        '</section>' +
        sec.map(function (s) { return '<section class="gcard" id="' + s[0] + '"><h2>' + esc(s[1]) + '</h2>' + s[2] + '</section>'; }).join('') +
        '<div class="foot-nav">' + (share ? '' : '<a class="btn ghost small" href="./">← 回教師展覽館</a>') + '<a class="btn ghost small" href="#top">↑ 回到最上面</a></div>' +
        (share ? '<p class="share-foot">巫魚子教課事務所｜教師展覽館　© 巫魚子老師</p>' : '') +
      '</main>' +
    '</div>';
  }

  /* ---------- 頁面動作：目錄捲動、Firebase 圖片、燈箱、複製分享網址（瀏覽器裡才跑） ---------- */
  var imgCache = {};
  function fimg(id, full) {
    var k = id + (full ? ':d' : ':t');
    return imgCache[k] || (imgCache[k] = fetchJSON('showcase/img/' + id + '/' + (full ? 'data' : 't'), 15000).catch(function () { delete imgCache[k]; return ''; }));
  }
  function loadImages(doc) {
    Array.prototype.forEach.call((doc || document).querySelectorAll('img[data-fimg]'), function (im) {
      var id = im.getAttribute('data-fimg'); im.removeAttribute('data-fimg');
      fimg(id, false).then(function (src) { if (src && /^data:image\//.test(src)) im.src = src; });
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
        if (f) { var me = box; fimg(src.slice(2), true).then(function (d) { if (me !== box || !d) return; me.querySelector('img').src = d; me.querySelector('figcaption').textContent = z.getAttribute('data-cap'); }); }
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
    DB: DB, SITE: SITE, MODES: MODES,
    esc: esc, rich: rich, plain: plain, arr: arr,
    seedPub: seedPub, setPub: setPub, normalize: normalize, load: load, fetchJSON: fetchJSON,
    drawers: drawers, drawerOf: drawerOf, get: get, list: list, searchText: searchText,
    appURL: appURL, openURL: openURL, applyURL: applyURL, shareURL: shareURL, thumb: thumb,
    sections: sections, pageHTML: pageHTML, enhance: enhance, loadImages: loadImages, fimg: fimg
  });
  root.SHOWCASE = SC;
})(this);
