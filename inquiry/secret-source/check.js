/* ============================================================
 * 📜 出處失傳的秘文｜鑑識批改（參考文獻逐項比對）＋找錯題＋排序題
 * 需要先載入 core.js
 *
 * 批改原理（用小學生聽得懂的方式說）：
 *   把「標準答案」和「學生寫的」兩串字排在一起，找出最長的相同部分（LCS 對齊），
 *   對不上的字就是寫錯、漏寫或多寫的地方；每個字都知道自己屬於哪個欄位（作者、年份、書名…），
 *   所以可以告訴學生「書名要粗體」「括號要用全形」，而不是只說「錯了」。
 * ============================================================ */
(function (root) {
  'use strict';
  var X = root.SecretSource;

  /* ---------- 標點對照 ---------- */
  var HALF2FULL = { '(': '（', ')': '）', ',': '，', '.': '。', ':': '：', ';': '；', '[': '［', ']': '］', '?': '？', '!': '！' };
  var PUNCT_NAME = { '（': '括號', '）': '括號', '，': '逗號', '。': '句號', '、': '頓號', '：': '冒號', '［': '方括號', '］': '方括號', '(': '括號', ')': '括號', ',': '逗號', '.': '句點', '&': '&', ':': '冒號', '-': '連接號' };
  function isCJK(c) { return /[⺀-鿿　-〿＀-￯]/.test(c); }
  function isWordChar(c) { return /[0-9A-Za-z㐀-鿿]/.test(c); }

  /* ---------- 把一串 {t,b,i} 變成一個一個字，順便整理空白 ---------- */
  function toChars(segs, withField) {
    var arr = [];
    segs.forEach(function (s, si) {
      var t = String(s.t).replace(/ /g, ' ').replace(/[–—－−]/g, '-');
      for (var k = 0; k < t.length; k++) {
        var c = t[k];
        if (/\s/.test(c)) c = ' ';
        arr.push({ c: c, b: !!s.b, i: !!s.i, f: withField ? s.f : null, seg: si });
      }
    });
    // 空白：連續空白變一個；中文或全形符號旁邊的空白拿掉；頭尾空白拿掉
    var out = [];
    for (var j = 0; j < arr.length; j++) {
      var ch = arr[j];
      if (ch.c === ' ') {
        if (!out.length || out[out.length - 1].c === ' ') continue;
        var prev = out[out.length - 1], next = null;
        for (var m = j + 1; m < arr.length; m++) if (arr[m].c !== ' ') { next = arr[m]; break; }
        if (!next || isCJK(prev.c) || isCJK(next.c)) continue;
      }
      out.push(ch);
    }
    while (out.length && out[out.length - 1].c === ' ') out.pop();
    return out;
  }

  /* ---------- LCS 對齊 ---------- */
  function align(E, Sx) {
    var n = E.length, m = Sx.length, i, j;
    var dp = []; for (i = 0; i <= n; i++) { dp.push(new Uint16Array(m + 1)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = E[i].c === Sx[j].c ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var ops = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (E[i].c === Sx[j].c) { ops.push({ op: 'm', e: i, s: j }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ op: 'd', e: i }); i++; }
      else { ops.push({ op: 'i', s: j }); j++; }
    }
    while (i < n) { ops.push({ op: 'd', e: i }); i++; }
    while (j < m) { ops.push({ op: 'i', s: j }); j++; }
    return ops;
  }

  /* ---------- 欄位名稱（依類型調整說法） ---------- */
  function fieldLabel(f, type) {
    if (f === 'ti') return type === 'gov' ? '報告名稱' : '書名';
    if (f === 'title') return { essay: '小論文篇名', fair: '作品名稱', thesis: '論文題目', news: '新聞標題', web: '文章名稱', journal: '篇名' }[type] || '篇名';
    if (f === 'au') return type === 'gov' ? '機構作者' : '作者';
    if (f === 'yr' || f === 'date') return f === 'date' ? '日期' : '年份';
    return X.FIELD[f] || f;
  }

  /* ---------- 主程式：批改一筆參考文獻 ----------
     answer：標準答案 segs（{t,f,b,i}）；student：學生輸入 segs（{t,b,i}）
     ev：證物（拿來辨認「多寫了干擾資訊」） */
  function gradeEntry(answer, student, ev) {
    var type = ev && ev.type, en = !!(ev && ev.en);
    var E = toChars(answer, true), Sx = toChars(student, false);
    var issues = [], add = function (field, msg, kind) { issues.push({ field: field, label: field ? fieldLabel(field, type) : '', msg: msg, kind: kind || 'text' }); };
    if (!Sx.length) return { ok: false, issues: [{ field: '', label: '', msg: '還沒有輸入參考文獻', kind: 'empty' }], fields: [] };
    var sTxt = Sx.map(function (c) { return c.c; }).join('');

    var ops = align(E, Sx);
    // 每個標準答案字元：對上的學生字元
    var matchS = new Array(E.length).fill(-1), sUsed = new Array(Sx.length).fill(false);
    ops.forEach(function (o) { if (o.op === 'm') { matchS[o.e] = o.s; sUsed[o.s] = true; } });

    // 「區段」＝標準答案裡連續、同一段 seg 的字元
    var runs = [];
    E.forEach(function (ch, idx) {
      var last = runs[runs.length - 1];
      if (last && last.seg === ch.seg) last.idx.push(idx); else runs.push({ seg: ch.seg, f: ch.f, idx: [idx] });
    });
    runs.forEach(function (rn) { rn.text = rn.idx.map(function (k) { return E[k].c; }).join(''); rn.miss = rn.idx.filter(function (k) { return matchS[k] < 0; }); rn.extra = []; });
    // 多出來的學生字元歸給「前一個對上的標準字元」所屬區段（開頭的歸給第一段）
    var runOfE = new Array(E.length); runs.forEach(function (rn, ri) { rn.idx.forEach(function (k) { runOfE[k] = ri; }); });
    var lastE = -1, pendingHead = [];
    ops.forEach(function (o) {
      if (o.op === 'm' || o.op === 'd') { lastE = o.e; return; }
      if (lastE < 0) pendingHead.push(o.s); else runs[runOfE[lastE]].extra.push(o.s);
    });
    if (pendingHead.length && runs.length) runs[0].extraHead = pendingHead;

    var ignore = new Array(Sx.length).fill(false);
    // 把學生字串裡「沒對上的」某段文字標成已處理（多寫的干擾資訊、放錯位置的欄位），避免重複報錯
    function markIgnore(v) {
      if (!v) return false;
      var hit = false, from = 0, at;
      while ((at = sTxt.indexOf(v, from)) >= 0) {
        var ok = true; for (var q = at; q < at + v.length; q++) if (sUsed[q]) { ok = false; break; }
        if (ok) {
          hit = true;
          var a = at, b = at + v.length - 1;
          while (a > 0 && !sUsed[a - 1]) a--; while (b < Sx.length - 1 && !sUsed[b + 1]) b++;
          for (q = a; q <= b; q++) ignore[q] = true;
        }
        from = at + 1;
      }
      return hit;
    }
    var extraText = function (list) { return list.filter(function (k) { return !ignore[k]; }).map(function (k) { return Sx[k].c; }).join(''); };
    var distract = ev && ev.card ? Object.keys(ev.distract || {}).map(function (k) { return { label: ev.distract[k], val: String(ev.card[k] == null ? '' : ev.card[k]) }; }).filter(function (d) { return d.val.length >= 2; }) : [];
    var reported = {};
    var once = function (key, fn) { if (!reported[key]) { reported[key] = 1; fn(); } };

    // 1) 干擾資訊：學生多寫了證物卡上「不該寫進參考文獻」的東西
    var ansTxt = plainAns(answer);
    var teacher = ev && ev.card && ev.card.teacher;
    if (teacher && ansTxt.indexOf(teacher) < 0 && markIgnore(teacher)) once('teacher', function () { add('au', '指導老師不列為作者，只寫學生作者', 'extra'); });
    distract.forEach(function (d) {
      if (d.val === teacher) return;
      if (ansTxt.indexOf(d.val) < 0 && markIgnore(d.val)) once('dis' + d.label, function () { add('', '「' + d.label + '」不用寫進參考文獻', 'extra'); });
    });
    // 放錯位置的欄位：整段沒對上、但學生其實有寫 → 只說「位置不對」，那段文字不再算成「多寫」
    var misplaced = {};
    runs.forEach(function (rn, ri) { if (rn.f !== 'p' && rn.miss.length === rn.idx.length && rn.text.length >= 2 && markIgnore(rn.text)) misplaced[ri] = 1; });

    // 2) 逐區段檢查
    runs.forEach(function (rn, ri) {
      var f = rn.f, ex = rn.extra.filter(function (k) { return !ignore[k]; }), head = (rn.extraHead || []).filter(function (k) { return !ignore[k]; });
      var allMiss = rn.miss.length === rn.idx.length;
      if (f === 'p') {
        if (!rn.miss.length && !ex.length) return;
        var want = rn.miss.map(function (k) { return E[k].c; }).join('');
        var got = extraText(ex);
        var prevRun = runs[ri - 1], after = prevRun ? '「' + prevRun.text.trim().slice(-6) + '」後面' : '開頭';
        if (rn.miss.length) {
          // 半形寫成全形以外的情況
          var wantC = want.replace(/\s/g, '');
          var gotC = got.replace(/\s/g, '');
          if (!wantC && !gotC) { once('sp' + ri, function () { add('p', after + (en ? '要空一格（英文標點後面空一格）' : '的空格不對'), 'space'); }); return; }
          if (gotC && wantC.split('').every(function (c, k) { return HALF2FULL[gotC[k]] === c; }) && gotC.length === wantC.length)
            once('w' + ri, function () { add('p', after + '的' + wantC.split('').map(function (c) { return PUNCT_NAME[c] || c; }).filter(uniq).join('、') + '要用全形「' + wantC + '」', 'width'); });
          else if (wantC === '、' && /^[，,和與及]$/.test(gotC)) once('sep' + ri, function () { add('au', '作者和作者之間要用頓號「、」', 'punct'); });
          else if (en && wantC.indexOf('&') >= 0 && gotC.indexOf('&') < 0) once('amp' + ri, function () { add('au', '英文最後一位作者前面要加「, &」', 'punct'); });
          else if (!gotC) once('mp' + ri, function () { add('p', after + '少了「' + (wantC || '空格') + '」', 'punct'); });
          else once('wp' + ri, function () { add('p', after + '應該是「' + (wantC || '空格') + '」，不是「' + gotC + '」', 'punct'); });
        } else if (ex.length) {
          var g2 = got.replace(/\s/g, '');
          if (!g2) { if (en) once('xs' + ri, function () { add('p', after + '多了空格', 'space'); }); }
          else if (ri === runs.length - 1 || /^[。.]$/.test(g2) && runs[ri + 1] == null) once('xe' + ri, function () { add('p', '最後多了「' + g2 + '」', 'extra'); });
          else once('xp' + ri, function () { add('p', after + '多了「' + g2 + '」', 'extra'); });
        }
        return;
      }
      // 內容欄位
      var label = fieldLabel(f, type);
      if (rn.miss.length || ex.length || head.length) {
        var txt = rn.text;
        if (misplaced[ri]) once('pos' + f + ri, function () { add(f, label + '的位置不對，檢查一下順序', 'order'); });
        else if (allMiss && f === 'ed') once('ed', function () { add(f, '少了版次「（' + txt + '）」：證物卡上不是初版，要寫出來', 'text'); });
        else if (allMiss && f === 'url') once('url', function () { add(f, '少了網址（可以從證物卡複製）', 'text'); });
        else if (allMiss) once('m' + f + ri, function () { add(f, '少了' + label, 'text'); });
        else if (f === 'yr' || f === 'date') {
          var gotY = extraText(ex) + rn.idx.filter(function (k) { return matchS[k] >= 0; }).map(function (k) { return E[k].c; }).join('');
          var y = +String(txt).slice(0, 4), roc = String(y - 1911);
          if (String(sTxt).indexOf(roc) >= 0 && String(sTxt).indexOf(String(y)) < 0) once('roc', function () { add(f, '年份要寫西元年（' + roc + ' 是民國年，民國年＋1911＝西元年）', 'text'); });
          else once('y' + ri, function () { add(f, label + '和證物卡上的不一樣' + (f === 'date' ? '（格式：2023年5月1日）' : ''), 'text'); });
        }
        else if (f === 'url') once('url', function () { add(f, '網址和證物卡上的不一樣（建議直接複製）', 'text'); });
        else once('t' + f + ri, function () { add(f, label + '和證物卡上的不一樣（檢查有沒有錯字、漏字或多字）', 'text'); });
      }
    });

    // 3) 粗體、斜體（標點與空白不檢查樣式）
    var styleBad = {};
    E.forEach(function (ch, k) {
      var s = matchS[k]; if (s < 0 || !isWordChar(ch.c)) return;
      var st = Sx[s], rn = runs[runOfE[k]];
      if (ch.b !== st.b) styleBad[rn.f + '|b|' + ch.b] = rn.f;
      if (ch.i !== st.i) styleBad[rn.f + '|i|' + ch.i] = rn.f;
    });
    Object.keys(styleBad).forEach(function (key) {
      var parts = key.split('|'), f = parts[0], kind = parts[1], want = parts[2] === 'true', label = fieldLabel(f, type);
      if (kind === 'b') add(f, want ? label + '要設粗體' : label + (f === 'iss' ? '不用粗體（只有卷數粗體，期數放括號不粗體）' : '不用粗體'), 'style');
      else add(f, want ? label + '要設斜體' : label + (en ? '不用斜體' : '不用斜體（中文不用斜體）'), 'style');
    });
    // 多寫的字也可能被設成粗體，不另外說

    // 欄位總覽（給畫面上的小標籤用）
    var fields = [];
    runs.forEach(function (rn) {
      if (rn.f === 'p') return;
      var bad = issues.some(function (is) { return is.field === rn.f; });
      var last = fields[fields.length - 1];
      if (last && last.f === rn.f) { last.ok = last.ok && !bad; return; }
      fields.push({ f: rn.f, label: fieldLabel(rn.f, type), ok: !bad });
    });
    var punctBad = issues.some(function (is) { return is.field === 'p' || is.kind === 'width' || is.kind === 'space'; });
    fields.push({ f: 'p', label: '標點', ok: !punctBad });
    return { ok: issues.length === 0, issues: issues, fields: fields };
  }
  function uniq(v, i, a) { return a.indexOf(v) === i; }
  function plainAns(segs) { return segs.map(function (s) { return s.t; }).join(''); }

  /* ======================= 🔎 找出破綻（找錯題） ======================= */
  // 每筆文獻切成幾塊（欄位＋後面的標點），學生點出「哪一塊有錯」，也可能整筆都對
  function chunksOf(segs) {
    var out = [], cur = null;
    segs.forEach(function (s) {
      if (s.f === 'p' && cur) { cur.segs.push(s); return; }
      if (!cur || cur.f !== s.f || true) { cur = { f: s.f, segs: [s] }; out.push(cur); }
    });
    // 開頭的括號（年份前的「（」）併到年份那塊：作者｜（年）。｜書名。…
    var merged = [];
    out.forEach(function (c) {
      var prev = merged[merged.length - 1];
      if (prev && c.f === 'p') { prev.segs = prev.segs.concat(c.segs); return; }
      merged.push(c);
    });
    // 把「、作者」的頓號跟前一個作者合併成同一塊作者
    var res = [];
    merged.forEach(function (c) {
      var prev = res[res.length - 1];
      if (prev && prev.f === 'au' && c.f === 'au') { prev.segs = prev.segs.concat(c.segs); return; }
      res.push(c);
    });
    // 前一塊尾巴的左括號「（」「［」「(」移到下一塊開頭：（2021）、（修訂版）、［影片］各自完整
    for (var i = 0; i + 1 < res.length; i++) {
      var a = res[i], b = res[i + 1], tail = a.segs[a.segs.length - 1];
      if (a.segs.length > 1 && tail.f === 'p' && /^\s*[（(［\[]\s*$/.test(tail.t)) { a.segs.pop(); b.segs.unshift(tail); }
    }
    return res;
  }

  var SPOT_ERRORS = [
    { k: 'bold-missing', test: function (e) { return e.segs.some(function (s) { return s.b && s.f !== 'p'; }); }, apply: function (e) { var f = null; e.segs.forEach(function (s) { if (s.b && s.f !== 'p' && !f) f = s.f; }); e.segs.forEach(function (s) { if (s.f === f || (s.f === 'p' && s.b)) s.b = false; }); return { f: f, why: function (L) { return L + '少了粗體'; } }; } },
    { k: 'bold-extra', test: function (e) { return e.segs.some(function (s) { return (s.f === 'title' || s.f === 'vtitle') && !s.b; }); }, apply: function (e) { var f = null; e.segs.forEach(function (s) { if ((s.f === 'title' || s.f === 'vtitle') && !s.b && !f) { f = s.f; } }); e.segs.forEach(function (s) { if (s.f === f) s.b = true; }); return { f: f, why: function (L) { return L + '不用粗體'; } }; } },
    { k: 'paren-half', test: function (e) { return e.segs.some(function (s) { return s.f === 'yr' || s.f === 'date'; }); }, apply: function (e) { var f = null; for (var i = 0; i < e.segs.length; i++) { var s = e.segs[i]; if (s.f === 'yr' || s.f === 'date') { f = s.f; if (e.segs[i - 1] && e.segs[i - 1].t === '（') e.segs[i - 1].t = '('; if (e.segs[i + 1] && e.segs[i + 1].t === '）') e.segs[i + 1].t = ')'; break; } } return { f: f, why: function () { return '年份的括號用了半形「( )」，中文要用全形「（）」'; } }; } },
    { k: 'roc-year', test: function (e) { return e.segs.some(function (s) { return s.f === 'yr' && /^\d{4}$/.test(s.t); }); }, apply: function (e) { e.segs.forEach(function (s) { if (s.f === 'yr' && /^\d{4}$/.test(s.t)) s.t = String(+s.t - 1911); }); return { f: 'yr', why: function () { return '年份寫成民國年了，要寫西元年'; } }; } },
    { k: 'sep', test: function (e) { return e.segs.filter(function (s) { return s.f === 'au'; }).length >= 2; }, apply: function (e) { e.segs.forEach(function (s) { if (s.f === 'p' && s.t === '、') s.t = '，'; }); return { f: 'au', why: function () { return '作者之間要用頓號「、」，不是逗號'; } }; } },
    { k: 'extra', test: function (e) { return !!e.distractVal; }, apply: function (e) { var at = e.segs.length; e.segs.forEach(function (s, i) { if (s.f === 'url' || s.f === 'doi') at = i; }); var d = e.distractVal; e.segs.splice(at, 0, X.S(d.label + '：' + d.val, 'xtra'), X.S('。', 'p')); return { f: 'xtra', why: function () { return '「' + d.label + '」不用寫進參考文獻'; } }; } }
  ];

  function makeSpot(code, id, meta) {
    var st = X.settingsOf(meta), r = X.rngFor(code, id, 'S3|spot');
    var types = X.shuffle(r, st.types);
    while (types.length < 5) types = types.concat(X.shuffle(r, st.types));
    types = types.slice(0, 5);
    var correctAt = X.int(r, 0, 4), usedErr = {}, items = [];
    types.forEach(function (t, i) {
      var e = X.GEN[t](r, { subjects: st.subjects });
      e.type = t;
      var segs = e.segs.map(function (s) { return X.S(s.t, s.f, { b: s.b, i: s.i }); });
      var entry = { segs: segs };
      var dk = Object.keys(e.distract || {}).filter(function (k) { var v = String(e.card[k] == null ? '' : e.card[k]); return v.length >= 2 && v.length <= 24; });
      if (dk.length) { var k0 = X.pick(r, dk); entry.distractVal = { label: e.distract[k0], val: String(e.card[k0]) }; }
      var err = null, wrongF = null;
      if (i !== correctAt) {
        var cand = SPOT_ERRORS.filter(function (x) { return x.test(entry); });
        var fresh = cand.filter(function (x) { return !usedErr[x.k]; });
        var pickE = X.pick(r, fresh.length ? fresh : cand);
        usedErr[pickE.k] = 1;
        var res = pickE.apply(entry); wrongF = res.f; err = res.why(fieldLabel(res.f, t));
      }
      var chunks = chunksOf(entry.segs).map(function (c, ci) { return { i: ci, f: c.f, segs: c.segs }; });
      var answer = wrongF ? chunks.filter(function (c) { return c.f === wrongF || (wrongF === 'xtra' && c.segs.some(function (s) { return s.f === 'xtra'; })); }).map(function (c) { return c.i; }) : [];
      items.push({ type: t, chunks: chunks, answer: answer, why: err });
    });
    return { items: items };
  }
  // pick：每筆學生選的塊編號（-1＝這筆沒有錯）
  function gradeSpot(spot, picks) {
    var res = spot.items.map(function (it, k) {
      var p = picks[k];
      if (p == null) return { ok: false, empty: true };
      if (!it.answer.length) return { ok: p === -1 };
      return { ok: it.answer.indexOf(p) >= 0 };
    });
    return { ok: res.every(function (x) { return x.ok; }), items: res };
  }

  /* ======================= 🗂️ 整理參考文獻清單（排序題） ======================= */
  function makeSort(code, id, meta) {
    var st = X.settingsOf(meta), r = X.rngFor(code, id, 'S3|sort');
    var surn = X.pickN(r, Object.keys(X.STROKE_SURNAMES), 5);
    var personTypes = st.types.filter(function (t) { return t !== 'gov' && t !== 'web' && t !== 'yt'; });
    if (!personTypes.length) personTypes = ['book'];
    var entries = surn.map(function (sn, k) {
      var t = personTypes[k % personTypes.length];
      var e = X.GEN[t](r, { subjects: st.subjects });
      // 第一位作者換成指定姓氏（排序靠它）
      var first = true;
      e.segs.forEach(function (s) { if (s.f === 'au' && first) { s.t = sn + s.t.slice(1); first = false; } });
      return { segs: e.segs, key: 'zh', stroke: X.STROKE_SURNAMES[sn], surname: sn, lang: 'zh' };
    });
    if (st.en) {
      X.pickN(r, ['ejournal', 'ebook'], 2).forEach(function (t) {
        var e = X.GEN[t](r, { subjects: st.subjects });
        var guard = 0;
        while (entries.some(function (x) { return x.lang === 'en' && x.surname === e.authors[0]; }) && guard++ < 20) e = X.GEN[t](r, { subjects: st.subjects });
        entries.push({ segs: e.segs, lang: 'en', surname: e.authors[0] });
      });
    }
    var correct = entries.slice().sort(function (a, b) {
      if (a.lang !== b.lang) return a.lang === 'zh' ? -1 : 1;
      if (a.lang === 'zh') return a.stroke - b.stroke;
      return a.surname.localeCompare(b.surname);
    });
    entries.forEach(function (e) { e.id = correct.indexOf(e); });
    // 打亂（確保不是原本就排好的）
    var shown;
    do { shown = X.shuffle(r, entries); } while (shown.every(function (e, i) { return e.id === i; }));
    return { entries: shown, n: entries.length };
  }
  function gradeSort(sortQ, order) { // order：學生排好的 id 陣列
    var right = order.filter(function (id, i) { return id === i; }).length;
    return { ok: right === sortQ.n, right: right, n: sortQ.n };
  }

  root.SecretSourceCheck = { gradeEntry: gradeEntry, toChars: toChars, align: align, fieldLabel: fieldLabel, makeSpot: makeSpot, gradeSpot: gradeSpot, makeSort: makeSort, gradeSort: gradeSort, chunksOf: chunksOf, HALF2FULL: HALF2FULL };
})(typeof window !== 'undefined' ? window : globalThis);
