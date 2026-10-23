/* 🎲 線上檢定所：共用核心（老師頁、學生頁、測試共用）
   - 設定、代碼、學號格式、亂數（依學號固定的題目順序與選項順序）
   - 計分：單選、多重選擇題（每錯一個選項倒扣 1/5，等於扣 2/5 題分，扣完為止）、簡答（老師給分）、多次作答採計方式
   - Word 考卷解析（mammoth 轉出的 HTML → 題目）、Excel 範本解析
   - 雲端：學生頁用 REST（fetch），問完就走，不長期佔連線
   ⚠ 這個檔案不能放正確答案：答案只存在 Firebase 的 exam/m/<代碼>/key（只有出題老師讀得到） */
(function (root) {
  'use strict';
  var CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    DB: 'exam',
    GRACE: 15000,          // 作答時間到了以後，再給 15 秒讓最後一筆答案送達（規則同樣寬限 15 秒）
    MAX_TRIES: 20          // 「不限次數」＝最多 20 次（規則逐次檢查）
  };

  var TYPES = { s: '單選題', m: '多重選擇題', a: '簡答題' };
  // 多重選擇題（老師 2026-10-23 更正）：每錯一個選項「倒扣」1/5——那個選項本身的 1/5 拿不到、再倒扣 1/5，
  // 所以每錯一個實際扣 2/5 題分，扣到 0 分為止（跟學測多選題一樣：錯 1 個 3/5、錯 2 個 1/5、錯 3 個以上 0）
  var MULTI_PENALTY = 0.4;
  var TYPE_ICON = { s: '🔘', m: '☑️', a: '✏️' };
  var DIFFS = ['易', '中', '難'];
  var POLICY = {
    max: { name: '🏆 最高分', desc: '取各次中最高的一次' },
    first: { name: '1️⃣ 第一次', desc: '只算第一次，後面僅供練習' },
    last: { name: '🔚 最後一次', desc: '算最後一次' },
    avg: { name: '➗ 平均', desc: '各次平均' }
  };
  var BY = {
    self: { icon: '👤', name: '本人交卷' },
    time: { icon: '⏰', name: '時間到・系統收卷' },
    teacher: { icon: '🛑', name: '老師收卷' },
    guard: { icon: '🚨', name: '系統代結' }
  };
  var WHY = { fs: '離開全螢幕', hide: '切換到其他頁面或 App', blur: '視窗失去焦點（分割畫面／浮動視窗）', idle: '太久沒有動作' };
  var LETTERS = 'ABCDEFGH';

  var DEFAULT_META = {
    title: '', desc: '', open: false, openAt: 0, closeAt: 0, mins: 40, tries: 1, policy: 'max', gap: 0,
    draw: 0, shufQ: true, shufO: true, reshuf: false, rosterOnly: false, showNeed: false,
    guard: { on: true, max: 2, idle: 5, blur: 3 },
    pub: false, pubPaper: false, pubKey: false,
    term: '', subj: '', use: '平時測驗', date: 0,   // 學期、科目、用途、測驗日期時間（2026-10-23：為了開放給其他老師，測驗要能分類）
    pts: { s: 2, m: 2, a: 5 }                        // 配分由老師在測驗裡依題型設定（題庫不記配分）
  };
  var USES = ['平時測驗', '小考', '期中考', '期末考', '補考', '課堂練習', '其他'];
  var SUBJECTS = ['遊戲設計思考', '化學', '探究與實作', '自然科學', '其他'];
  // 台灣的學期：8 月～隔年 1 月＝上學期（1），2～7 月＝下學期（2）；學年＝西元－1911（下學期用前一年）
  function currentTerm(ms) {
    var d = new Date(ms || Date.now()), y = d.getFullYear(), mo = d.getMonth() + 1;
    if (mo >= 8) return (y - 1911) + '-1';
    if (mo === 1) return (y - 1912) + '-1';
    return (y - 1912) + '-2';
  }
  function validTerm(t) { return /^[0-9]{2,3}-[12]$/.test(String(t || '')); }
  function termName(t) { var m = /^(\d+)-([12])$/.exec(String(t || '')); return m ? m[1] + ' 學年度第' + (m[2] === '1' ? '一' : '二') + '學期' : (t || '未分學期'); }

  /* ---------- 小工具 ---------- */
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function decodeEntities(s) {
    return String(s || '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); }).replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); }).replace(/&amp;/g, '&');
  }
  function plain(html) { return decodeEntities(String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|div|li)>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); }
  function hasImg(html) { return /<img\b/i.test(String(html || '')); }
  function isEmptyHtml(html) { return !plain(html) && !hasImg(html); }
  function normId(s) { return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function validId(s) { return /^[A-Z0-9]{3,12}$/.test(String(s || '')); }
  var ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function validCode(c) { return /^[A-HJ-NP-Z2-9]{6}$/.test(String(c || '')); }
  function newCode() { var s = ''; for (var i = 0; i < 6; i++) s += ALPH[Math.floor(Math.random() * 32)]; return s; }
  function newId(n) { var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < (n || 12); i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function round2(x) { return Math.round((+x || 0) * 100) / 100; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ms) { if (!ms) return '—'; var d = new Date(ms); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fmtClock(ms) { var d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  function fmtLeft(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); s = s % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s); }

  /* ---------- 亂數（同一個種子永遠得到同樣的結果） ---------- */
  function hashStr(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function makeRng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- 這位學生這一次拿到的考卷（題目、順序、選項順序） ----------
     paper：{ 題目id: { i 排序, t 題型, o 選項, l 鎖定選項順序, p 配分 } }；回傳 { ids:[題目id], opt:{題目id:[原本選項的位置]} } */
  function sheetFor(paper, meta, code, sid, k) {
    meta = meta || {};
    var ids = Object.keys(paper || {}).sort(function (a, b) { return ((paper[a].i || 0) - (paper[b].i || 0)) || (a < b ? -1 : 1); });
    var seed = code + '|' + normId(sid) + (meta.reshuf ? '|' + k : '');
    var rng = makeRng(hashStr(seed));
    var draw = +meta.draw || 0;
    if (draw > 0 && draw < ids.length) {
      var picked = shuffle(ids, rng).slice(0, draw), set = {};
      picked.forEach(function (x) { set[x] = 1; });
      ids = ids.filter(function (x) { return set[x]; }); // 抽到的題目照老師排的順序
    }
    if (meta.shufQ) ids = shuffle(ids, rng);
    var opt = {};
    ids.forEach(function (id) {
      var q = paper[id], n = (q.o || []).length, ord = [];
      for (var i = 0; i < n; i++) ord.push(i);
      opt[id] = (meta.shufO && !q.l && q.t !== 'a') ? shuffle(ord, makeRng(hashStr(seed + '|' + id))) : ord;
    });
    return { ids: ids, opt: opt };
  }

  /* ---------- 答案的寫法 ----------
     單選：數字（原本選項的位置，0＝A）；複選：字串 "0,2"；簡答：字串 */
  function multiToSet(v) {
    var o = {};
    if (v == null || v === '') return o;
    String(v).split(',').forEach(function (x) { if (x !== '' && !isNaN(+x)) o[+x] = 1; });
    return o;
  }
  function setToMulti(o) { return Object.keys(o).filter(function (k) { return o[k]; }).map(Number).sort(function (a, b) { return a - b; }).join(','); }
  function answered(t, v) {
    if (t === 's') return typeof v === 'number';
    if (t === 'm') return Object.keys(multiToSet(v)).length > 0;
    return typeof v === 'string' && v.trim() !== '';
  }

  /* ---------- 計分 ----------
     回傳 { s 分數（簡答未批＝null）, ok 全對, wrong 錯幾個選項 } */
  function scoreOne(q, key, v, manual) {
    var pts = +q.p || 0;
    if (q.t === 'a') {
      if (manual != null && manual !== '') return { s: Math.max(0, Math.min(pts, +manual)), ok: +manual >= pts, pend: false };
      if (!answered('a', v)) return { s: 0, ok: false, blank: true }; // 沒寫＝0 分，不用老師批
      return { s: null, ok: false, pend: true };
    }
    var ans = (key && key.a) || [];
    if (manual != null && manual !== '') return { s: Math.max(0, Math.min(pts, +manual)), ok: +manual >= pts, adj: true };
    if (q.t === 's') { var ok = typeof v === 'number' && ans.indexOf(v) >= 0; return { s: ok ? pts : 0, ok: ok }; }
    // 多重選擇題：每個選項逐一判斷，「該選沒選」「不該選卻選」各算錯一個；每錯一個扣 2/5 題分（倒扣 1/5），扣完為止；沒作答＝0 分
    var sel = multiToSet(v), n = (q.o || []).length || 1;
    if (!Object.keys(sel).length) return { s: 0, ok: false, wrong: n, blank: true };
    var right = {}; ans.forEach(function (a) { right[a] = 1; });
    var wrong = 0;
    for (var i = 0; i < n; i++) if (!!sel[i] !== !!right[i]) wrong++;
    return { s: round2(pts * Math.max(0, 1 - wrong * MULTI_PENALTY)), ok: wrong === 0, wrong: wrong };
  }

  /* 一次作答的成績：att＝{ ans, end, … }；manual＝{ 題目id: 老師給的分數 } */
  function gradeAttempt(paper, key, meta, code, sid, k, att, manual) {
    var sh = sheetFor(paper, meta, code, sid, k), ans = (att && att.ans) || {}, total = 0, full = 0, pend = 0, auto = 0, detail = {};
    manual = manual || {};
    sh.ids.forEach(function (id) {
      var q = paper[id], r = scoreOne(q, (key || {})[id], ans[id], manual[id]);
      full += +q.p || 0;
      if (r.s == null) { if (r.pend) pend++; } else { total += r.s; if (q.t !== 'a') auto += r.s; }
      detail[id] = r;
    });
    return { s: round2(total), full: round2(full), auto: round2(auto), pend: pend, n: sh.ids.length, detail: detail };
  }

  /* 多次作答 → 採計分數 */
  function finalScore(list, policy) {
    list = (list || []).filter(function (x) { return x && typeof x.s === 'number'; });
    if (!list.length) return null;
    if (policy === 'first') return list[0].s;
    if (policy === 'last') return list[list.length - 1].s;
    if (policy === 'avg') return round2(list.reduce(function (a, x) { return a + x.s; }, 0) / list.length);
    return Math.max.apply(null, list.map(function (x) { return x.s; }));
  }

  /* 作答期限：開始時間＋作答時間（＋老師延長的分鐘 ext），但不超過截止時間 */
  function deadlineOf(meta, att, ext) {
    var d = (+att.st || 0) + ((+meta.mins || 0) + (+ext || 0)) * 60000;
    if (+meta.closeAt) d = Math.min(d, +meta.closeAt);
    return d;
  }
  /* 測驗目前狀態：wait 還沒開放、open 開放中、closed 已結束 */
  function stateOf(meta, now) {
    if (!meta) return 'none';
    now = now || Date.now();
    if (!meta.open) return (+meta.closeAt && now >= +meta.closeAt) ? 'closed' : 'off';
    if (+meta.openAt && now < +meta.openAt) return 'wait';
    if (+meta.closeAt && now >= +meta.closeAt) return 'closed';
    return 'open';
  }
  var STATE = { none: '找不到', off: '⏸ 未開放', wait: '⏳ 尚未開始', open: '🟢 開放中', closed: '🔒 已結束' };

  /* ---------- Word 考卷解析 ----------
     輸入：mammoth 轉出的 HTML（styleMap 'u => u' 保留底線）
     格式（舊考卷）：
       1.  題幹……（可接圖片）
       單選題（難易度:中）／多重選擇題（舊考卷的「複選題」也收，自動改成多重選擇題）／簡答題
       A.  選項  B.  選項 …（同一段落用換行分開；選項文字可能跑到下一行）
       正確答案：A C
       正確答案解釋：……（或「答案解釋：」，「暫無」＝空白；解析裡的「1. 2.」不會被當成新題目，因為新題目一定在段落開頭）
     回傳 { qs:[{ num, t, d, s, o:[], a:[], e }], warn:[文字] } */
  var RE_NUM = /^\s*(\d{1,3})\s*[.．、]\s*/;
  var RE_TYPE = /^\s*(單選題|單選|複選題|複選|多選題|多重選擇題|簡答題|簡答|問答題)\s*(?:[（(]\s*(?:難易度|難度)?\s*[:：]?\s*([易中難])?\s*[）)])?\s*$/;
  var RE_OPT = /^\s*[（(]?\s*([A-Ha-h])\s*[)）.．、]\s*/;
  var RE_ANS = /^\s*(?:正確)?答案\s*[:：]\s*(.*)$/;
  var RE_EXP = /^\s*(?:正確)?(?:答案)?(?:解釋|解析|詳解)\s*[:：]\s*/;
  function stripPrefix(html, re) {
    // 去掉 HTML 開頭符合 re 的純文字（例如「1.    」、「A.    」），保留後面的格式
    html = String(html);
    var m = re.exec(decodeEntities(html.replace(/<[^>]+>/g, '')));
    if (!m) return html;
    var need = m[0].replace(/\s+/g, '').length, i = 0, out = '', skipping = true;
    while (i < html.length) {
      var ch = html[i];
      if (ch === '<') { var j = html.indexOf('>', i); j = j < 0 ? html.length - 1 : j; out += html.slice(i, j + 1); i = j + 1; continue; }
      var len = 1, txt = ch;
      if (ch === '&') { var e = html.indexOf(';', i); if (e > i && e - i < 10) { len = e - i + 1; txt = decodeEntities(html.slice(i, e + 1)); } }
      if (skipping) {
        if (/^\s$/.test(txt) || txt === ' ') { i += len; continue; }
        if (need > 0) { need--; i += len; continue; }
        skipping = false;
      }
      out += html.slice(i, i + len); i += len;
    }
    return cleanEdges(out);
  }
  function cleanEdges(h) {
    return String(h).replace(/^(\s|&nbsp;|<br\s*\/?>)+/i, '').replace(/(\s|&nbsp;|<br\s*\/?>)+$/i, '')
      .replace(/<(strong|u|em|b|i)>\s*<\/\1>/gi, '').trim();
  }
  function joinLines(arr) { return arr.map(cleanEdges).filter(function (x) { return !isEmptyHtml(x); }).join('<br>'); }
  function docLines(html) {
    // 段落 → 行（<br> 分開），記住是不是段落第一行
    var out = [];
    String(html).replace(/<\/?(h\d|li|ul|ol|table|tbody|tr|td|th)[^>]*>/gi, function (t) { return /^<\//.test(t) || /^<(h\d|li|tr)/i.test(t) ? '</p><p>' : ''; })
      .split(/<\/p>/i).forEach(function (p) {
        p = p.replace(/^[\s\S]*?<p[^>]*>/i, function (m) { return /<p/i.test(m) ? '' : m; });
        var first = true;
        p.split(/<br\s*\/?>/i).forEach(function (l) {
          if (isEmptyHtml(l)) return;
          out.push({ html: l, text: plain(l), first: first });
          first = false;
        });
      });
    return out;
  }
  function parseDocHtml(html) {
    var lines = docLines(html), qs = [], warn = [], cur = null, mode = '', buf = [];
    var flush = function () {
      if (!cur) return;
      if (mode === 'stem') cur._s = cur._s.concat(buf);
      else if (mode === 'opt') cur._o[cur._o.length - 1] = cur._o[cur._o.length - 1].concat(buf);
      else if (mode === 'exp') cur._e = cur._e.concat(buf);
      buf = [];
    };
    var finish = function () {
      if (!cur) return;
      flush();
      var q = { num: cur.num, t: cur.t || '', d: cur.d || '中', s: joinLines(cur._s), o: cur._o.map(joinLines), a: cur.a || [], e: joinLines(cur._e) };
      if (/^\s*暫無\s*$/.test(plain(q.e))) q.e = '';
      if (!q.t) q.t = q.o.length ? (q.a.length > 1 ? 'm' : 's') : 'a';
      if (q.t === 'a') q.o = [];
      var w = [];
      if (!cur.t) w.push('沒有寫題型，自動判斷為' + TYPES[q.t]);
      if (isEmptyHtml(q.s)) w.push('題幹是空的');
      if (q.t !== 'a' && q.o.length < 2) w.push('選項少於 2 個');
      if (q.t !== 'a' && !q.a.length) w.push('沒有正確答案');
      if (q.t === 's' && q.a.length > 1) w.push('單選題卻有 ' + q.a.length + ' 個答案');
      if (cur.t === 'm' && /複選/.test(cur._tname || '')) q.conv = true; // 原本是複選題 → 多重選擇題
      if (q.a.some(function (x) { return x >= q.o.length; })) w.push('答案超出選項範圍');
      q.warn = w;
      if (w.length) warn.push('第 ' + q.num + ' 題：' + w.join('、'));
      qs.push(q); cur = null; mode = ''; buf = [];
    };
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], t = L.text, m;
      var expectNext = cur ? cur.num + 1 : (qs.length ? qs[qs.length - 1].num + 1 : null);
      m = RE_NUM.exec(t);
      if (m && L.first && (!cur || +m[1] === expectNext || mode === 'exp' || mode === 'ans' || mode === 'opt')) {
        var isQ = !cur || +m[1] === expectNext;
        // 新題目要在後面幾行內看到題型或選項，避免把解析裡的「1.」當成題目
        if (isQ) {
          var ok = false;
          for (var j = i + 1; j < Math.min(lines.length, i + 40); j++) {
            if (RE_TYPE.test(lines[j].text) || RE_OPT.test(lines[j].text)) { ok = true; break; }
            if (RE_ANS.test(lines[j].text) || (RE_NUM.test(lines[j].text) && lines[j].first)) break;
          }
          if (ok || !cur) {
            if (!cur && !ok && !qs.length) { /* 標題列：略過 */ continue; }
            finish();
            cur = { num: +m[1], _s: [], _o: [], _e: [] }; mode = 'stem';
            buf.push(stripPrefix(L.html, RE_NUM));
            continue;
          }
        }
      }
      if (!cur) continue; // 第一題之前的標題、說明
      if ((m = RE_TYPE.exec(t)) && (mode === 'stem' || mode === 'type')) {
        flush();
        var k = m[1];
        cur.t = /單/.test(k) ? 's' : (/複|多/.test(k) ? 'm' : 'a'); cur._tname = k;
        if (m[2]) cur.d = m[2];
        mode = 'type';
        continue;
      }
      if ((m = RE_ANS.exec(t)) && !RE_EXP.test(t) && mode !== 'exp') {
        flush();
        var letters = (m[1].toUpperCase().match(/[A-H]/g) || []);
        cur.a = letters.map(function (c) { return LETTERS.indexOf(c); }).filter(function (x, i2, arr) { return arr.indexOf(x) === i2; }).sort(function (a, b) { return a - b; });
        if (cur.t !== 'a' && !letters.length && plain(m[1])) { cur._ref = m[1]; }
        mode = 'ans';
        continue;
      }
      if (RE_EXP.test(t) && mode !== 'stem') {
        flush();
        mode = 'exp';
        buf.push(stripPrefix(L.html, RE_EXP));
        continue;
      }
      if ((m = RE_OPT.exec(t)) && (mode === 'type' || mode === 'opt' || (mode === 'stem' && cur._s.length + buf.length > 0)) && m[1].toUpperCase() === LETTERS[cur._o.length]) {
        flush();
        cur._o.push([]);
        mode = 'opt';
        buf.push(stripPrefix(L.html, RE_OPT));
        continue;
      }
      if (mode === 'type') { mode = 'stem'; } // 題型後面又出現題幹文字
      if (mode === 'ans') { mode = 'exp'; }  // 答案後面直接接說明
      buf.push(L.html);
    }
    finish();
    return { qs: qs, warn: warn };
  }

  /* ---------- Excel／CSV 範本 ----------
     欄位：題型、題幹、A～H、答案、解析、難易度、標籤（配分在建立測驗時依題型設定） */
  var SHEET_HEAD = ['題型', '題幹', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '答案', '解析', '難易度', '標籤'];
  function parseRows(rows) {
    var qs = [], warn = [];
    if (!rows || !rows.length) return { qs: qs, warn: ['檔案是空的'] };
    var head = rows[0].map(function (x) { return String(x == null ? '' : x).trim(); }), col = {};
    head.forEach(function (h, i) { col[h.replace(/^選項/, '')] = i; });
    if (col['題幹'] == null) return { qs: qs, warn: ['第一列要是標題列，至少要有「題幹」欄（可以先下載範本）'] };
    var get = function (r, k) { var i = col[k]; return i == null ? '' : String(r[i] == null ? '' : r[i]).trim(); };
    rows.slice(1).forEach(function (r, ri) {
      if (!r || !r.some(function (x) { return String(x == null ? '' : x).trim(); })) return;
      var stem = get(r, '題幹'); if (!stem) return;
      var opts = []; for (var i = 0; i < 8; i++) { var o = get(r, LETTERS[i]); if (o) opts.push(escapeHtml(o).replace(/\n/g, '<br>')); else break; }
      var tt = get(r, '題型'), t = /複|多/.test(tt) ? 'm' : /簡|問/.test(tt) ? 'a' : /單/.test(tt) ? 's' : '';
      var ansText = get(r, '答案').toUpperCase(), a = [];
      (ansText.match(/[A-H]/g) || []).forEach(function (c) { var x = LETTERS.indexOf(c); if (a.indexOf(x) < 0) a.push(x); });
      a.sort(function (x, y) { return x - y; });
      if (!t) t = opts.length ? (a.length > 1 ? 'm' : 's') : 'a';
      var d = get(r, '難易度'); d = DIFFS.indexOf(d) >= 0 ? d : (/難/.test(d) ? '難' : /易|簡單/.test(d) ? '易' : '中');
      var q = { num: ri + 1, t: t, d: d, s: escapeHtml(stem).replace(/\n/g, '<br>'), o: t === 'a' ? [] : opts, a: t === 'a' ? [] : a, e: escapeHtml(get(r, '解析')).replace(/\n/g, '<br>'),
        tags: get(r, '標籤').split(/[,，、;；]/).map(function (x) { return x.trim(); }).filter(Boolean) };
      if (t === 'a' && ansText) q.r = escapeHtml(get(r, '答案')).replace(/\n/g, '<br>');
      var w = [];
      if (t !== 'a' && opts.length < 2) w.push('選項少於 2 個');
      if (t !== 'a' && !a.length) w.push('沒有正確答案');
      if (t === 's' && a.length > 1) w.push('單選題卻有 ' + a.length + ' 個答案');
      if (a.some(function (x) { return x >= opts.length; })) w.push('答案超出選項範圍');
      q.warn = w; if (w.length) warn.push('第 ' + (ri + 2) + ' 列：' + w.join('、'));
      qs.push(q);
    });
    return { qs: qs, warn: warn };
  }

  /* ---------- 題目 HTML 清理（學生頁顯示前用 DOMPurify，這裡只做格式統一） ---------- */
  // 題目裡的圖片寫成 <img data-img="代號">（圖片本體在 exam/img/<代號>），顯示時再補上 src
  function imgIds(html) { var out = [], re = /data-img="([a-z0-9]{8,24})"/g, m; while ((m = re.exec(String(html || '')))) if (out.indexOf(m[1]) < 0) out.push(m[1]); return out; }
  function stripImgSrc(html) {
    return String(html || '').replace(/<img\b[^>]*>/gi, function (tag) {
      var id = /data-img="([a-z0-9]{8,24})"/.exec(tag);
      if (!id) return tag;
      var w = /\swidth="(\d+)"/.exec(tag);
      return '<img data-img="' + id[1] + '"' + (w ? ' width="' + w[1] + '"' : '') + '>';
    });
  }

  /* ---------- 圖片壓縮（瀏覽器才有） ---------- */
  function compressImage(src, max, q) {
    max = max || 1000; q = q || 0.72;
    return new Promise(function (ok, bad) {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/jpeg', q);
        // 透明背景的 PNG 小圖（例如圖示）保留 PNG
        if (/^data:image\/png/.test(String(src)) && c.width * c.height < 160000) { var p = c.toDataURL('image/png'); if (p.length < data.length * 1.5) data = p; }
        ok({ data: data, w: c.width, h: c.height });
      };
      img.onerror = function () { bad(new Error('圖片讀不出來')); };
      if (typeof src !== 'string') { var fr = new FileReader(); fr.onload = function () { img.src = fr.result; }; fr.onerror = bad; fr.readAsDataURL(src); }
      else img.src = src;
    });
  }

  /* ---------- 雲端（REST） ---------- */
  function cloudFetch(path, opt) {
    opt = opt || {};
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opt.timeout || 10000) : null;
    var url = CONFIG.FIREBASE_URL + '/' + path + '.json' + (opt.query ? '?' + opt.query : '');
    return fetch(url, { method: opt.method || 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined,
      headers: opt.body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined })
      .then(function (res) { if (timer) clearTimeout(timer); if (!res.ok) { var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; } return res.json(); },
        function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  var NOW = { '.sv': 'timestamp' };
  function P(code) { return CONFIG.DB + '/m/' + code; }
  var REST = {
    meta: function (code) { return cloudFetch(P(code) + '/meta'); },
    paper: function (code) { return cloudFetch(P(code) + '/paper'); },
    key: function (code) { return cloudFetch(P(code) + '/key'); },
    student: function (code, sid) { return cloudFetch(P(code) + '/s/' + normId(sid)); },
    grade: function (code, sid) { return cloudFetch(P(code) + '/g/' + normId(sid)); },
    img: function (id) { return cloudFetch(CONFIG.DB + '/img/' + id); },
    start: function (code, sid, k, info, dev) { return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k, { method: 'PUT', body: { info: info, st: NOW, dev: dev } }); },
    answer: function (code, sid, k, qid, v) { return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k + '/ans/' + qid, { method: v == null || v === '' ? 'DELETE' : 'PUT', body: v == null || v === '' ? undefined : v }); },
    event: function (code, sid, k, kind, detail) { var b = { t: NOW, k: kind }; if (detail) b.d = String(detail).slice(0, 80); return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k + '/ev', { method: 'POST', body: b }); },
    end: function (code, sid, k, by, why) { var b = { t: NOW, by: by }; if (why) b.why = String(why).slice(0, 40); return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k + '/end', { method: 'PUT', body: b }); },
    ext: function (code, sid) { return cloudFetch(P(code) + '/x/' + normId(sid)); },     // 老師延長的分鐘 { 第幾次: 分鐘 }
    bonus: function (code, sid) { return cloudFetch(P(code) + '/bt/' + normId(sid)); },   // 老師多給的作答次數
    hb: function (code, sid, k) { return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k + '/hb', { method: 'PUT', body: NOW }); }, // 心跳（老師頁看失聯）
    claim: function (code, sid, k, dev) { return cloudFetch(P(code) + '/s/' + normId(sid) + '/' + k + '/dev', { method: 'PUT', body: dev }); }
  };

  root.ExamCore = {
    CONFIG: CONFIG, TYPES: TYPES, MULTI_PENALTY: MULTI_PENALTY, TYPE_ICON: TYPE_ICON, DIFFS: DIFFS, POLICY: POLICY, BY: BY, WHY: WHY, LETTERS: LETTERS, DEFAULT_META: DEFAULT_META, STATE: STATE, USES: USES, SUBJECTS: SUBJECTS, currentTerm: currentTerm, validTerm: validTerm, termName: termName,
    escapeHtml: escapeHtml, plain: plain, hasImg: hasImg, isEmptyHtml: isEmptyHtml, normId: normId, validId: validId, validCode: validCode, newCode: newCode, newId: newId,
    round2: round2, fmtTime: fmtTime, fmtClock: fmtClock, fmtLeft: fmtLeft, hashStr: hashStr, makeRng: makeRng, shuffle: shuffle,
    sheetFor: sheetFor, multiToSet: multiToSet, setToMulti: setToMulti, answered: answered, scoreOne: scoreOne, gradeAttempt: gradeAttempt, finalScore: finalScore,
    deadlineOf: deadlineOf, stateOf: stateOf,
    parseDocHtml: parseDocHtml, parseRows: parseRows, SHEET_HEAD: SHEET_HEAD, imgIds: imgIds, stripImgSrc: stripImgSrc, compressImage: compressImage,
    cloudFetch: cloudFetch, REST: REST, NOW: NOW
  };
})(typeof window !== 'undefined' ? window : globalThis);
