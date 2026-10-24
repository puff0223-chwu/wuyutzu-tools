/* 🎲 線上檢定所：匯出與列印（2026-10-24）
   - 題庫 → Word（.docx，格式跟老師舊考卷一樣，可以再匯回來）、Excel（跟匯入範本同欄位）
   - 測驗 → 紙本列印版 HTML（A4，開頭有班級座號姓名學號得分欄；瀏覽器列印時可「另存為 PDF」）
   需要的外部函式庫由呼叫的人先載好：docx（window.docx）、JSZip、XLSX
   imgOf(id) → Promise<dataURL>：圖片代號換成圖片資料 */
(function (root) {
  'use strict';
  var X = root.ExamCore;
  var TYPE_WORD = { s: '單選題', m: '多重選擇題', a: '簡答題' };

  /* ---------- HTML → 段落（每段是一串「文字片段／圖片」） ---------- */
  function blocks(html, doc) {
    doc = doc || root.document;
    var box = doc.createElement('div'); box.innerHTML = String(html || '');
    var paras = [[]], cur = function () { return paras[paras.length - 1]; };
    var walk = function (node, st) {
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) { var t = n.nodeValue.replace(/[\r\n\t]+/g, ' '); if (t) cur().push(Object.assign({ t: t }, st)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toLowerCase();
        if (tag === 'br') { paras.push([]); return; }
        if (tag === 'img') { cur().push({ img: n.getAttribute('data-img') || '', src: n.getAttribute('src') || '', w: +n.getAttribute('width') || 0 }); return; }
        var block = /^(p|div|li|h[1-6]|ol|ul)$/.test(tag);
        if (block && cur().length) paras.push([]);
        var ns = Object.assign({}, st);
        if (tag === 'strong' || tag === 'b') ns.b = 1;
        if (tag === 'em' || tag === 'i') ns.i = 1;
        if (tag === 'u') ns.u = 1;
        if (tag === 's' || tag === 'strike') ns.s = 1;
        if (tag === 'sub') ns.sub = 1;
        if (tag === 'sup') ns.sup = 1;
        if (tag === 'a') ns.href = n.getAttribute('href') || '';
        walk(n, ns);
        if (block) paras.push([]);
      });
    };
    walk(box, {});
    return paras.map(function (p) { // 去掉段落頭尾空白
      while (p.length && p[0].t != null && !p[0].t.trim()) p.shift();
      while (p.length && p[p.length - 1].t != null && !p[p.length - 1].t.trim()) p.pop();
      return p;
    }).filter(function (p) { return p.length; });
  }
  function plainWithImg(html) { return X.plain(String(html || '').replace(/<img\b[^>]*>/gi, ' [圖片] ')).replace(/\s+/g, ' ').trim(); }

  /* ---------- 圖片資料 ---------- */
  function dataUrlBytes(u) {
    var m = /^data:image\/(png|jpe?g|gif|bmp|webp);base64,(.*)$/i.exec(String(u || ''));
    if (!m) return null;
    var bin = root.atob ? root.atob(m[2]) : Buffer.from(m[2], 'base64').toString('binary'), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    var type = m[1].toLowerCase(); if (type === 'jpeg') type = 'jpg';
    return { bytes: out, type: type === 'webp' ? 'png' : type };
  }
  function imgSize(u) {
    return new Promise(function (ok) {
      if (!root.Image) return ok({ w: 400, h: 300 });
      var im = new root.Image(); im.onload = function () { ok({ w: im.naturalWidth || 400, h: im.naturalHeight || 300 }); }; im.onerror = function () { ok({ w: 400, h: 300 }); }; im.src = u;
    });
  }

  /* ---------- 題庫 → Word ---------- */
  async function runs(D, segs, imgOf, maxW) {
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (g.t != null) {
        var r = new D.TextRun({ text: g.t, bold: !!g.b, italics: !!g.i, underline: g.u ? {} : undefined, strike: !!g.s, subScript: !!g.sub, superScript: !!g.sup, color: g.href ? '1F5FBF' : undefined });
        out.push(g.href ? new D.ExternalHyperlink({ link: g.href, children: [new D.TextRun({ text: g.t, underline: {}, color: '1F5FBF', bold: !!g.b })] }) : r);
      } else {
        var src = g.src && /^data:/.test(g.src) ? g.src : (g.img ? await imgOf(g.img) : '');
        var b = dataUrlBytes(src); if (!b) { out.push(new D.TextRun({ text: '[圖片]' })); continue; }
        var sz = await imgSize(src), w = Math.min(maxW || 450, g.w || sz.w), h = Math.round(sz.h * w / (sz.w || 1));
        out.push(new D.ImageRun({ type: b.type, data: b.bytes, transformation: { width: w, height: h } }));
      }
    }
    return out;
  }
  // 一段 HTML → 好幾個 Word 段落；prefix 加在第一段前面（例如「1.  」「A.  」「正確答案解釋：」）
  async function paras(D, html, imgOf, prefix, doc) {
    var bs = blocks(html, doc), out = [];
    if (!bs.length) bs = [[]];
    for (var i = 0; i < bs.length; i++) {
      var ch = await runs(D, bs[i], imgOf);
      if (i === 0 && prefix) ch.unshift(new D.TextRun({ text: prefix }));
      out.push(new D.Paragraph({ children: ch, spacing: { after: 60 } }));
    }
    return out;
  }
  function orderOf(bank) { return Object.keys(bank.q || {}).sort(function (a, b) { return ((bank.q[a].i || 0) - (bank.q[b].i || 0)) || (a < b ? -1 : 1); }); }
  async function bankDocx(bank, imgOf, opt) {
    opt = opt || {};
    var D = root.docx, ids = orderOf(bank), kids = [], doc = opt.doc;
    kids.push(new D.Paragraph({ children: [new D.TextRun({ text: '📚 ' + bank.name, bold: true, size: 36 })], spacing: { after: 120 } }));
    kids.push(new D.Paragraph({ children: [new D.TextRun({ text: '線上檢定所題庫匯出｜' + (bank.subj ? '科目：' + bank.subj + '｜' : '') + '共 ' + ids.length + ' 題｜' + new Date().toLocaleDateString('zh-TW'), color: '6F7588', size: 20 })], spacing: { after: 240 } }));
    kids.push(new D.Paragraph({ children: [new D.TextRun({ text: '（這個檔案可以直接用「📥 匯入 Word 考卷」匯回線上檢定所。）', color: '6F7588', size: 18 })], spacing: { after: 240 } }));
    for (var n = 0; n < ids.length; n++) {
      var q = bank.q[ids[n]], o = q.o || [], a = q.a || [];
      kids = kids.concat(await paras(D, q.s, imgOf, (n + 1) + '.  ', doc));
      kids.push(new D.Paragraph({ children: [new D.TextRun({ text: TYPE_WORD[q.t] + '（難易度:' + (q.d || '中') + '）', color: '7B5EA7' })] }));
      for (var k = 0; k < o.length; k++) kids = kids.concat(await paras(D, o[k], imgOf, X.LETTERS[k] + '.  ', doc));
      if (q.t !== 'a') kids.push(new D.Paragraph({ children: [new D.TextRun({ text: '正確答案：' + a.map(function (i) { return X.LETTERS[i]; }).join(' '), bold: true })] }));
      if (q.t === 'a' && q.r) kids = kids.concat(await paras(D, q.r, imgOf, '參考答案：', doc));
      if ((q.tags || []).length) kids.push(new D.Paragraph({ children: [new D.TextRun({ text: '標籤：' + q.tags.join('、'), color: '6F7588' })] }));
      kids = kids.concat(await paras(D, q.e || '暫無', imgOf, '正確答案解釋：', doc));
      kids.push(new D.Paragraph({ children: [] }));
    }
    var d = new D.Document({ creator: '線上檢定所', title: bank.name, styles: { default: { document: { run: { font: 'Microsoft JhengHei', size: 24 } } } }, sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: kids }] });
    return opt.buffer ? D.Packer.toBuffer(d) : D.Packer.toBlob(d);
  }

  /* ---------- 題庫 → Excel（跟匯入範本同欄位，可以再匯回來；圖片寫成 [圖片]） ---------- */
  function bankRows(bank) {
    var rows = [X.SHEET_HEAD.slice()];
    orderOf(bank).forEach(function (id) {
      var q = bank.q[id], o = (q.o || []).map(plainWithImg), r = [q.t === 's' ? '單選' : q.t === 'm' ? '多重選擇' : '簡答', plainWithImg(q.s)];
      for (var k = 0; k < 8; k++) r.push(o[k] || '');
      r.push(q.t === 'a' ? plainWithImg(q.r) : (q.a || []).map(function (i) { return X.LETTERS[i]; }).join(' '));
      r.push(plainWithImg(q.e)); r.push(q.d || '中'); r.push((q.tags || []).join('、'));
      rows.push(r);
    });
    return rows;
  }
  function sheetName(name, used) {
    var s = String(name || '題庫').replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 28) || '題庫', t = s, n = 2;
    while (used[t]) t = s.slice(0, 26) + '_' + (n++);
    used[t] = 1; return t;
  }
  function fileSafe(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60) || '題庫'; }

  /* ---------- 測驗 → 紙本列印版 ---------- */
  var CH = ['一', '二', '三', '四'];
  function esc(s) { return X.escapeHtml(s); }
  function shuffleBy(arr, seed) { return X.shuffle(arr, X.makeRng(X.hashStr(seed))); }
  /* 一個版本的題目順序與選項順序
     opt：{ shufQ, shufO, group }；回傳 [{ type, ids:[{ id, opt:[原本選項位置] }] }] */
  function paperVersion(paper, code, v, opt) {
    var ids = Object.keys(paper).sort(function (a, b) { return (paper[a].i || 0) - (paper[b].i || 0); });
    var groups = opt.group ? ['s', 'm', 'a'].map(function (t) { return { type: t, ids: ids.filter(function (id) { return paper[id].t === t; }) }; }).filter(function (g) { return g.ids.length; }) : [{ type: '', ids: ids }];
    return groups.map(function (g, gi) {
      var list = opt.shufQ ? shuffleBy(g.ids, code + '|print|' + v + '|' + gi) : g.ids.slice();
      return { type: g.type, ids: list.map(function (id) {
        var q = paper[id], n = (q.o || []).length, ord = []; for (var k = 0; k < n; k++) ord.push(k);
        return { id: id, opt: opt.shufO && !q.l && q.t !== 'a' ? shuffleBy(ord, code + '|print|' + v + '|' + id) : ord };
      }) };
    });
  }
  function fillImgs(html, imgMap) { return String(html || '').replace(/<img data-img="([a-z0-9]+)"/g, function (m, id) { return '<img src="' + (imgMap[id] || '') + '" data-img="' + id + '"'; }); }
  function clean(html, imgMap) {
    var h = fillImgs(html, imgMap);
    if (root.DOMPurify) h = root.DOMPurify.sanitize(h, { ADD_ATTR: ['data-img'] });
    return h.replace(/<a\b[^>]*>/gi, '<span>').replace(/<\/a>/gi, '</span>');
  }
  function shortOpts(q) { return (q.o || []).every(function (o) { return !X.hasImg(o) && X.plain(o).length <= 14; }); }
  function examPrintHTML(meta, paper, key, code, opt, imgMap) {
    opt = opt || {}; imgMap = imgMap || {};
    var vers = Math.max(1, Math.min(4, +opt.versions || 1)), V = 'ABCD';
    var ids = Object.keys(paper), n = ids.length, total = ids.reduce(function (a, id) { return a + (+paper[id].p || 0); }, 0);
    var cnt = { s: 0, m: 0, a: 0 }, pts = { s: 0, m: 0, a: 0 }; ids.forEach(function (id) { cnt[paper[id].t]++; pts[paper[id].t] = +paper[id].p || 0; });
    var when = meta.date || meta.openAt || 0;
    var info = [meta.subj, meta.term ? X.termName(meta.term) : '', meta.use, when ? new Date(when).toLocaleDateString('zh-TW') : ''].filter(Boolean).map(esc).join('｜');
    var head = function (v) {
      return '<header class="top"><div class="tt"><h1>' + esc(meta.title) + '</h1>' + (vers > 1 ? '<span class="ver">' + V[v] + ' 卷</span>' : '') + '</div>' +
        (info ? '<div class="info">' + info + '</div>' : '') +
        '<table class="who"><tr><th>班級</th><td></td><th>座號</th><td></td><th>姓名</th><td class="wide"></td><th>學號</th><td class="mid"></td><th>得分</th><td class="mid"></td></tr></table>' +
        '<div class="rule">本測驗共 <b>' + n + '</b> 題，滿分 <b>' + X.round2(total) + '</b> 分' + (meta.mins ? '，作答時間 <b>' + meta.mins + '</b> 分鐘' : '') + '。' +
        (cnt.m ? '多重選擇題每題有一個或多個正確選項，每錯一個選項（該選沒選、不該選卻選）倒扣 1/5，等於扣該題配分 2/5，扣到 0 分為止；未作答不給分。' : '') +
        (opt.group ? '' : '選擇題請把答案寫在題號前的括號內。') + '</div></header>';
    };
    var qHTML = function (no, item, q) {
      var o = item.opt, h = '<div class="q"><div class="qh">' + (q.t !== 'a' ? '<span class="ab">（　　）</span>' : '') + '<span class="no">' + no + '.</span>' +
        (!opt.group ? '<span class="tp">' + (q.t === 's' ? '單選' : q.t === 'm' ? '多重選擇' : '簡答') + '・' + q.p + ' 分</span>' : '') +
        (q.t === 'm' && q.need && opt.need ? '<span class="tp">應選 ' + q.need + ' 項</span>' : '') + '<div class="stem qhtml">' + clean(q.s, imgMap) + '</div></div>';
      if (q.t === 'a') {
        var lines = Math.max(4, Math.min(12, Math.round((+q.p || 4) * 1.5)));
        h += '<div class="lines" style="height:' + (lines * 2.1) + 'em"></div>';
      } else {
        h += '<ol class="opts ' + (shortOpts(q) ? 'grid' : '') + '">' + o.map(function (orig, k) { return '<li><b>(' + X.LETTERS[k] + ')</b> <span class="qhtml">' + clean(q.o[orig], imgMap) + '</span></li>'; }).join('') + '</ol>';
      }
      return h + '</div>';
    };
    var keyRows = [], body = '';
    for (var v = 0; v < vers; v++) {
      var groups = paperVersion(paper, code, v, opt), no = 0, krow = [];
      body += '<section class="paper' + (v ? ' pb' : '') + '">' + head(v) + '<div class="qs ' + (opt.cols === 2 ? 'two' : '') + '">';
      groups.forEach(function (g, gi) {
        if (opt.group) body += '<h2>' + CH[gi] + '、' + TYPE_WORD[g.type] + '（每題 ' + pts[g.type] + ' 分，共 ' + X.round2(pts[g.type] * g.ids.length) + ' 分）</h2>';
        g.ids.forEach(function (item) {
          var q = paper[item.id]; no++;
          body += qHTML(no, item, q);
          var k = key[item.id] || {}, right = (k.a || []).map(function (orig) { return item.opt.indexOf(orig); }).filter(function (x) { return x >= 0; }).sort(function (a, b) { return a - b; });
          krow.push({ no: no, id: item.id, t: q.t, ans: q.t === 'a' ? '' : right.map(function (x) { return X.LETTERS[x]; }).join(''), r: k.r || '', e: k.e || '' });
        });
      });
      body += '</div></section>';
      keyRows.push(krow);
    }
    if (opt.key) {
      keyRows.forEach(function (kr, v) {
        body += '<section class="paper pb keyp"><header class="top"><div class="tt"><h1>' + esc(meta.title) + '</h1><span class="ver">' + (vers > 1 ? V[v] + ' 卷' : '') + ' 答案卷（教師用）</span></div>' + (info ? '<div class="info">' + info + '</div>' : '') + '</header>' +
          '<table class="kt"><tbody>' + chunk(kr.filter(function (x) { return x.t !== 'a'; }), 10).map(function (row) { return '<tr>' + row.map(function (x) { return '<th>' + x.no + '</th><td>' + esc(x.ans || '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
          kr.filter(function (x) { return x.t === 'a'; }).map(function (x) { return '<div class="kref"><b>' + x.no + '.（簡答）參考答案：</b>' + (x.r ? '<span class="qhtml">' + clean(x.r, imgMap) + '</span>' : '（無，由老師評閱）') + '</div>'; }).join('') +
          (opt.exp ? '<h2>💡 解析</h2>' + (opt.shufO ? '<p style="font-size:.85em;color:#555">※ 解析裡提到的選項字母是題庫原本的順序；這一卷的選項有打亂，請以上面的答案表為準。</p>' : '') + kr.filter(function (x) { return x.e; }).map(function (x) { return '<div class="kexp"><b>' + x.no + '.</b> ' + (x.ans ? '（' + esc(x.ans) + '）' : '') + '<span class="qhtml">' + clean(x.e, imgMap) + '</span></div>'; }).join('') : '') +
          '</section>';
      });
    }
    var fs = opt.size === 'l' ? 13.5 : opt.size === 's' ? 10.5 : 12;
    return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>' + esc(meta.title) + '｜紙本測驗</title><style>' +
      '@page{size:A4;margin:14mm 13mm}*{box-sizing:border-box}body{margin:0;font-family:"Microsoft JhengHei","Noto Sans TC","PingFang TC",sans-serif;color:#111;font-size:' + fs + 'pt;line-height:1.55;background:#e9e6df}' +
      '.bar{position:sticky;top:0;z-index:5;background:#1f2a44;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-family:sans-serif;font-size:14px}.bar button{font:inherit;font-weight:800;background:#f2b134;border:2px solid #fff;border-radius:8px;padding:6px 14px;cursor:pointer}' +
      '.paper{background:#fff;width:210mm;min-height:297mm;margin:12px auto;padding:14mm 13mm;box-shadow:0 2px 10px rgba(0,0,0,.15)}' +
      '.top{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px}.tt{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}h1{font-size:1.55em;margin:0}.ver{font-weight:800;border:2px solid #111;border-radius:6px;padding:0 8px}' +
      '.info{color:#444;margin:2px 0 6px}.who{width:100%;border-collapse:collapse;margin:6px 0}.who th,.who td{border:1.5px solid #111;padding:6px 6px;font-size:.95em}.who th{background:#f1f1f1;white-space:nowrap;width:1%}.who td{height:2.1em}.who td.wide{width:26%}.who td.mid{width:13%}' +
      '.rule{font-size:.9em;color:#222;margin-top:4px}h2{font-size:1.08em;margin:12px 0 6px;border-left:6px solid #111;padding-left:8px;column-span:all;break-after:avoid}' +
      '.qs.two{column-count:2;column-gap:9mm;column-rule:1px solid #ccc}.q{break-inside:avoid;margin:0 0 10px}.qh{display:flex;gap:4px;align-items:flex-start;flex-wrap:wrap}.ab{white-space:nowrap}.no{font-weight:800;white-space:nowrap}' +
      '.tp{font-size:.78em;border:1px solid #888;border-radius:4px;padding:0 4px;margin:2px 4px 0 0;white-space:nowrap;color:#444}.stem{flex:1 1 70%;min-width:60%}' +
      '.qhtml p{margin:0}.qhtml img{max-width:100%;max-height:55mm;height:auto;display:block;margin:4px 0}.qhtml .ql-align-center{text-align:center}.qhtml .ql-size-small{font-size:.85em}.qhtml .ql-size-large{font-size:1.25em}' +
      '.opts{list-style:none;margin:4px 0 0 4.2em;padding:0}.opts li{margin:2px 0;display:flex;gap:4px}.opts.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(9em,1fr));gap:2px 14px}' +
      '.lines{margin:6px 0 0 1.6em;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(2.1em - 1px),#999 calc(2.1em - 1px),#999 2.1em);border:1px solid #bbb;border-radius:4px}' +
      '.kt{border-collapse:collapse;width:100%;margin:8px 0}.kt th,.kt td{border:1px solid #111;padding:4px 6px;text-align:center}.kt th{background:#f1f1f1;width:5%}.kt td{font-weight:800;width:5%}.kref,.kexp{margin:6px 0;break-inside:avoid}' +
      '@media print{body{background:#fff}.bar{display:none}.paper{margin:0;box-shadow:none;width:auto;min-height:0;padding:0}.pb{break-before:page}}' +
      '</style></head><body><div class="bar"><button onclick="window.print()">🖨️ 列印／另存為 PDF</button><span>按下後在「目的地」選「另存為 PDF」就能存成 PDF 檔；建議勾選「背景圖形」，邊界選「預設」。</span></div>' + body + '</body></html>';
  }
  function chunk(a, n) { var out = []; for (var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }

  root.ExamExport = { blocks: blocks, plainWithImg: plainWithImg, bankDocx: bankDocx, bankRows: bankRows, sheetName: sheetName, fileSafe: fileSafe, orderOf: orderOf, paperVersion: paperVersion, examPrintHTML: examPrintHTML, dataUrlBytes: dataUrlBytes };
})(typeof window !== 'undefined' ? window : globalThis);
