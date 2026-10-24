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

  /* =========================================================
     說明頁內容（guide.html 與分享頁 share/<代號>.html 共用同一支，內容永遠一致）
     mode：'guide'＝展覽館說明頁（有申請、前往系統、返回展覽館）
           'share'＝社群分享頁（完全沒有任何連結，只看這一頁）
     ========================================================= */
  var SITE = 'https://puff0223-chwu.github.io/wuyutzu-tools/showcase/';
  function shareURL(code) { return SITE + 'share/' + code + '.html'; }

  // 📸 畫面預覽：電腦畫面一區、手機畫面一區；點圖放大（放大不是連結，不會離開這一頁）
  function shotsHTML(t) {
    var shots = t.shots || [];
    if (!shots.length) return '<div class="shot"><div class="ic">📸</div><b>畫面截圖整理中</b></div>';
    var fig = function (s) {
      return '<figure class="sfig"><button type="button" class="szoom" data-zoom="' + esc(s[0]) + '" data-cap="' + esc(s[1]) + '" aria-label="放大：' + esc(s[1]) + '">' +
        '<img src="' + esc(s[0]) + '" alt="' + esc(s[1]) + '" loading="lazy"' + (s[2] ? ' width="' + s[2] + '" height="' + s[3] + '"' : '') + '></button>' +
        '<figcaption>' + esc(s[1]) + '</figcaption></figure>';
    };
    var wide = shots.filter(function (s) { return !(s[2] && s[2] < 600); }), phone = shots.filter(function (s) { return s[2] && s[2] < 600; });
    return (wide.length ? '<h3 class="shot-h">💻 老師端（電腦）</h3><div class="shot-wide">' + wide.map(fig).join('') + '</div>' : '') +
      (phone.length ? '<h3 class="shot-h">📱 學生端（手機）</h3><div class="shot-phone">' + phone.map(fig).join('') + '</div>' : '') +
      '<p class="act-note">畫面中的學生姓名、成績都是測試用的假資料。點圖片可以放大。</p>';
  }

  function sections(t, mode) {
    var share = mode === 'share', sec = [];
    var list = function (arr) { return '<ul class="clues">' + arr.map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>'; };
    if (t.ready) {
      if (t.notice) sec.push(['notice', '📍 使用前請先看', '<div class="callout">' + rich(t.notice) + '</div>']);
      if (t.tools) sec.push(['tools', '🧪 包含哪些系統', t.tools.map(function (x) {
        return '<div class="sub-tool"><h3>' + esc(x[0]) + ' ' + esc(x[1]) + '</h3><p>' + rich(x[2]) + '</p></div>';
      }).join('')]);
      if (t.shots && t.shots.length) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.flow) sec.push(['flow', '🗺️ 上課流程', '<div class="flow">' + t.flow.map(function (x, i) {
        return (i ? '<span class="arr" aria-hidden="true">→</span>' : '') +
          '<div class="node"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><b>' + rich(x[1]) + '</b><span>' + rich(x[2]) + '</span>' +
          '<span class="who ' + (x[3] === 's' ? 's">學生' : 't">老師') + '</span></div>';
      }).join('') + '</div><p class="act-note">深藍標籤＝老師做的事，黃色標籤＝學生做的事。</p>']);
      if (t.feats) sec.push(['features', '✨ 主要功能', '<div class="feats">' + t.feats.map(function (x) {
        return '<div class="feat"><span class="ic" aria-hidden="true">' + esc(x[0]) + '</span><div><b>' + rich(x[1]) + '</b><span>' + rich(x[2]) + '</span></div></div>';
      }).join('') + '</div>']);
      if (t.student || t.teacher) sec.push(['sides', '👀 學生端與老師端', '<div class="two">' +
        (t.student ? '<div class="side"><h3>👩‍🎓 學生</h3>' + list(t.student) + '</div>' : '') +
        (t.teacher ? '<div class="side"><h3>👨‍🏫 老師</h3>' + list(t.teacher) + '</div>' : '') + '</div>']);
      if (t.prep) sec.push(['prep', '🧰 開始前要準備', list(t.prep)]);
      if (!t.shots || !t.shots.length) sec.push(['shots', '📸 畫面預覽', shotsHTML(t)]);
      if (t.faq) sec.push(['faq', '❓ 常見問題', '<dl class="faq">' + t.faq.map(function (x) { return '<dt>' + rich(x[0]) + '</dt><dd>' + rich(x[1]) + '</dd>'; }).join('') + '</dl>']);
    } else {
      sec.push(['about', '📄 這個系統', '<p>' + esc(t.brief) + '</p><div class="callout blue">📝 這個系統的詳細說明還在整理中。</div>']);
    }
    if (share) {
      sec.push(['apply', '🙋 想在自己的課堂使用？', '<p>這是巫魚子老師開發的教學系統，目前開放給其他老師申請使用（需要巫魚子老師核准）。</p>' +
        '<p>有興趣的話，歡迎直接私訊巫魚子老師 😊</p>']);
    } else {
      sec.push(['apply', '🚪 怎麼申請', '<ol class="steps">' + SC.APPLY.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        (t.code === 'grade' ? '<div class="callout blue">🔑 成績調閱室<b>只能用 Google 帳號</b>登入，申請時也請用同一個 Google 帳號。</div>' : '') +
        actionsHTML(t, false)]);
    }
    return sec;
  }
  function actionsHTML(t, big) {
    var a = appURL(t), sm = big ? '' : ' small';
    return '<div class="actions">' +
      '<a class="btn' + sm + '" href="' + esc(applyURL(t.code)) + '">📝 申請使用</a>' +
      (a ? '<a class="btn ghost' + sm + '" href="' + esc(a) + '"' + (t.external ? ' target="_blank" rel="noopener"' : '') + '>🔑 已開通，前往系統' + (t.external ? ' ↗' : ' →') + '</a>' : '') +
      (t.links || []).map(function (l) { return '<a class="btn ghost' + sm + '" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; }).join('') +
      (t.ready ? '<button type="button" class="btn ghost' + sm + '" data-share="' + esc(shareURL(t.code)) + '" title="複製一個只有這一頁、沒有其他連結的網址，適合貼到社群">📤 分享網址</button>' : '') +
      '</div>';
  }
  // 整頁主體（左目錄＋右內容）
  function pageHTML(t, mode) {
    var share = mode === 'share', DR = drawers(), d = DR[t.drawer] || DR[0], sec = sections(t, mode);
    var facts = (t.facts || []).map(function (f) { return '<div class="fact"><b>' + esc(f[0]) + '</b>' + rich(f[1]) + '</div>'; }).join('');
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
            '<div class="sub">' + rich(t.sub) + '</div></div>' +
          '<div class="hero-body">' +
            (t.intro ? '<p class="intro">' + rich(t.intro) + '</p>' : '') +
            (facts ? '<div class="facts">' + facts + '</div>' : '') +
            (share ? '' : actionsHTML(t, true) + '<p class="act-note">還沒有帳號？先按「📝 申請使用」。' + (t.external ? '這是獨立網站，會在新分頁打開。' : '') + '</p>') +
          '</div>' +
        '</section>' +
        sec.map(function (s) { return '<section class="gcard" id="' + s[0] + '"><h2>' + esc(s[1]) + '</h2>' + s[2] + '</section>'; }).join('') +
        '<div class="foot-nav">' + (share ? '' : '<a class="btn ghost small" href="./">← 回教師展覽館</a>') + '<a class="btn ghost small" href="#top">↑ 回到最上面</a></div>' +
        (share ? '<p class="share-foot">巫魚子教課事務所｜教師展覽館　© 巫魚子老師</p>' : '') +
      '</main>' +
    '</div>';
  }

  // 頁面動作：目錄跟著捲動亮起、圖片放大、複製分享網址（只在瀏覽器裡跑）
  function enhance(doc) {
    doc = doc || document;
    var links = Array.prototype.slice.call(doc.querySelectorAll('.toc a[href^="#"]'));
    var targets = links.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
    var spy = function () {
      var y = window.scrollY + 110, on = 0;
      targets.forEach(function (el, i) { if (el && el.offsetTop <= y) on = i; });
      if (window.innerHeight + window.scrollY >= doc.body.scrollHeight - 4) on = targets.length - 1;
      links.forEach(function (a, i) { a.classList.toggle('on', i === on); });
    };
    window.addEventListener('scroll', spy, { passive: true }); spy();
    // 放大圖片（燈箱）：點圖、點背景或按 Esc 關閉
    var box = null;
    var close = function () { if (box) { box.remove(); box = null; } };
    doc.addEventListener('click', function (e) {
      var z = e.target.closest && e.target.closest('[data-zoom]');
      if (z) {
        close(); box = doc.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog');
        box.innerHTML = '<figure><img src="' + esc(z.getAttribute('data-zoom')) + '" alt=""><figcaption>' + esc(z.getAttribute('data-cap')) + '</figcaption></figure><button type="button" class="lb-x" aria-label="關閉">✕</button>';
        box.onclick = close; doc.body.appendChild(box); return;
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

  SC.esc = esc; SC.rich = rich; SC.plain = plain;
  SC.codes = codes; SC.drawers = drawers; SC.get = get; SC.list = list; SC.searchText = searchText;
  SC.appURL = appURL; SC.applyURL = applyURL; SC.shareURL = shareURL; SC.SITE = SITE;
  SC.sections = sections; SC.pageHTML = pageHTML; SC.enhance = enhance;
  root.SHOWCASE = SC;
})(this);
