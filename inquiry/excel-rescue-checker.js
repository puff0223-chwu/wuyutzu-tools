/* ============================================================
 * 消失的實驗數據 — Excel 鑑識核心（第二階段）
 * 把學生交的 .xlsx 拆開（它其實是一個壓縮包），檢查：
 *   圖表類型、數據是不是自己的、標題、座標軸標題、Y 軸文字方向、
 *   資料標籤、趨勢線（方程式／R²）、函數、設定格式化的條件
 * 全部在瀏覽器裡完成，檔案不會上傳到任何地方。
 * 需要：JSZip、SheetJS（XLSX）、excel-rescue-core.js
 * ============================================================ */
(function (root) {
  'use strict';
  var X = root.ExcelRescue;

  /* ---------- 老師可調整 ---------- */
  var RULES = {
    // Y 軸標題「轉垂直」接受哪些文字方向：
    //   'upright' ＝ 中文一字一字直排（Excel「文字方向」選垂直／堆疊）
    //   'rotated' ＝ 整行轉 90°（Excel 加座標軸標題時的預設樣子）
    Y_TITLE_ACCEPT: ['upright', 'rotated']   // 老師 2026-10-06 決定：直排最好，旋轉 90° 也算對（Google 試算表沒有直排）
  };

  var DEFAULT_TITLES = ['圖表標題', 'Chart Title', '图表标题'];
  var DEFAULT_AXIS_TITLES = ['座標軸標題', 'Axis Title', '坐标轴标题', '座标轴标题'];

  /* ---------- XML 小工具（不管前綴是 c: 還是別的都抓得到） ---------- */
  function kids(node, local) {
    var out = [];
    if (!node) return out;
    for (var c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.localName === local) out.push(c);
    return out;
  }
  function kid(node, local) { return kids(node, local)[0] || null; }
  function all(node, local) { return node ? Array.prototype.slice.call(node.getElementsByTagNameNS('*', local)) : []; }
  function val(node, local) { var k = kid(node, local); return k ? k.getAttribute('val') : null; }
  function on(node, local) { var v = val(node, local); return v === '1' || v === 'true'; }
  function parseXml(text) { return new DOMParser().parseFromString(text, 'application/xml'); }
  function texts(node) { return all(node, 't').map(function (t) { return t.textContent; }).join(''); }

  function close(a, b) { return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)); }
  // 看 chartVals 裡有幾個值能對上 target（一對一配對）
  function matchCount(chartVals, target) {
    var used = [], n = 0;
    target.forEach(function (t) {
      for (var i = 0; i < chartVals.length; i++) {
        if (!used[i] && close(chartVals[i], t)) { used[i] = true; n++; return; }
      }
    });
    return n;
  }
  function hasValue(vals, x) { return vals.some(function (v) { return close(v, x); }); }

  /* ---------- 讀活頁簿 ---------- */
  async function openBook(buf) {
    var zip = await JSZip.loadAsync(buf);
    var wb = XLSX.read(buf, { type: 'array', cellFormula: true, sheetStubs: true });
    // 工作表名稱 → XML 路徑（格式化條件要讀原始 XML）
    var paths = {};
    try {
      var wbx = parseXml(await zip.file('xl/workbook.xml').async('string'));
      var rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
      var target = {};
      all(rels, 'Relationship').forEach(function (r) { target[r.getAttribute('Id')] = r.getAttribute('Target'); });
      all(wbx, 'sheet').forEach(function (s) {
        var rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id');
        var t = target[rid]; if (!t) return;
        t = t.replace(/^\//, '');
        paths[s.getAttribute('name')] = t.indexOf('xl/') === 0 ? t : 'xl/' + t;
      });
    } catch (e) {}
    return { zip: zip, wb: wb, paths: paths };
  }

  function cellText(ws, addr) { var c = ws && ws[addr]; return c ? String(c.v != null ? c.v : '') : ''; }

  // 依 A1 標題找工作表（學生改了工作表名稱也找得到）
  function findSheet(book, prefix, fallbackName) {
    var names = book.wb.SheetNames;
    for (var i = 0; i < names.length; i++) if (cellText(book.wb.Sheets[names[i]], 'A1').indexOf(prefix) === 0) return names[i];
    return names.indexOf(fallbackName) >= 0 ? fallbackName : null;
  }

  function readIdentity(book) {
    var id = '', sem = '';
    var ws = book.wb.Sheets['任務說明'];
    var lines = [];
    if (ws) lines.push(cellText(ws, 'A2'), cellText(ws, 'A3'));
    book.wb.SheetNames.forEach(function (n) { lines.push(cellText(book.wb.Sheets[n], 'A2')); });
    lines.forEach(function (t) {
      var m = t.match(/調查員學號：\s*([A-Za-z0-9]+)/); if (m && !id) id = m[1];
      var s = t.match(/學期：\s*([A-Za-z0-9-]+)/); if (s && !sem) sem = s[1];
    });
    return { id: X.normId(id), semester: sem.toUpperCase() };
  }

  // 用參照位址（例如 'L1_長條圖'!$B$5:$B$10）回頭到工作表取值：檔案沒存圖表快取時用
  function resolveRef(book, f) {
    if (!f) return [];
    var m = f.match(/^\(?'?(.*?)'?!(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)\)?$/);
    if (!m) return [];
    var ws = book.wb.Sheets[m[1].replace(/''/g, "'")]; if (!ws) return [];
    var r = XLSX.utils.decode_range(m[2].replace(/\$/g, '')), out = [];
    for (var R = r.s.r; R <= r.e.r; R++) for (var C = r.s.c; C <= r.e.c; C++) {
      var c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      out.push(c ? c.v : null);
    }
    return out;
  }
  function numbersOf(book, dataNode) {
    if (!dataNode) return [];
    var ref = kid(dataNode, 'numRef') || kid(dataNode, 'strRef'), lit = kid(dataNode, 'numLit') || kid(dataNode, 'strLit');
    var holder = ref ? (kid(ref, 'numCache') || kid(ref, 'strCache')) : lit;
    var vals = [];
    if (holder) {
      var pts = kids(holder, 'pt').map(function (p) { return { i: +p.getAttribute('idx'), v: kid(p, 'v') ? kid(p, 'v').textContent : '' }; });
      pts.sort(function (a, b) { return a.i - b.i; });
      vals = pts.map(function (p) { return p.v; });
    }
    if (!vals.length && ref) vals = resolveRef(book, (kid(ref, 'f') || {}).textContent);
    return vals.map(Number).filter(function (v) { return isFinite(v); });
  }

  /* ---------- 解析一張圖表 ---------- */
  function titleInfo(titleNode) {
    if (!titleNode) return null;
    var tx = kid(titleNode, 'tx'), text = '', auto = false;
    if (tx) {
      var rich = kid(tx, 'rich'), sref = kid(tx, 'strRef');
      text = rich ? texts(rich) : sref ? all(sref, 'v').map(function (v) { return v.textContent; }).join('') : '';
    } else auto = true;
    // 文字方向：先看 rich 裡的 bodyPr，再看 txPr
    var bp = null;
    if (tx && kid(tx, 'rich')) bp = kid(kid(tx, 'rich'), 'bodyPr');
    if ((!bp || (!bp.getAttribute('vert') && !bp.getAttribute('rot'))) && kid(titleNode, 'txPr')) bp = kid(kid(titleNode, 'txPr'), 'bodyPr') || bp;
    var vert = bp ? (bp.getAttribute('vert') || 'horz') : 'horz', rot = bp ? +(bp.getAttribute('rot') || 0) : 0;
    var dir = 'horizontal';
    if (/^(eaVert|wordArtVert|wordArtVertRtl|mongolianVert)$/.test(vert)) dir = 'upright';
    else if (vert === 'vert' || vert === 'vert270' || Math.abs(rot) === 5400000) dir = 'rotated';
    return { text: text.trim(), auto: auto, dir: dir };
  }

  function parseChart(book, doc, file) {
    var chart = all(doc, 'chart').filter(function (n) { return n.parentNode && n.parentNode.localName === 'chartSpace'; })[0];
    if (!chart) return null;
    var plot = kid(chart, 'plotArea');
    var deletedTitle = on(chart, 'autoTitleDeleted');
    var info = {
      file: file,
      title: titleInfo(kid(chart, 'title')),
      titleDeleted: deletedTitle && !kid(chart, 'title'),
      groups: [], axes: []
    };
    for (var c = plot && plot.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      var ln = c.localName;
      if (/Chart$/.test(ln)) {
        var groupLbls = kid(c, 'dLbls');
        info.groups.push({
          type: ln, barDir: val(c, 'barDir'),
          axIds: kids(c, 'axId').map(function (a) { return a.getAttribute('val'); }),
          series: kids(c, 'ser').map(function (s) {
            var tl = kid(s, 'trendline'), mk = kid(s, 'marker');
            return {
              y: numbersOf(book, kid(s, 'val') || kid(s, 'yVal')),
              x: numbersOf(book, kid(s, 'cat') || kid(s, 'xVal')),
              dLbls: kid(s, 'dLbls') || groupLbls,
              trend: tl ? { type: val(tl, 'trendlineType'), eq: on(tl, 'dispEq'), r2: on(tl, 'dispRSqr') } : null,
              noMarker: mk ? val(mk, 'symbol') === 'none' : false
            };
          })
        });
      } else if (/Ax$/.test(ln)) {
        info.axes.push({ id: val(c, 'axId'), kind: ln, pos: val(c, 'axPos'), title: titleInfo(kid(c, 'title')), deleted: on(c, 'delete') });
      }
    }
    return info;
  }

  async function readCharts(book) {
    var files = Object.keys(book.zip.files).filter(function (n) { return /^xl\/charts\/chart\d+\.xml$/.test(n); });
    var out = [];
    for (var i = 0; i < files.length; i++) {
      try { var c = parseChart(book, parseXml(await book.zip.file(files[i]).async('string')), files[i]); if (c) out.push(c); } catch (e) {}
    }
    return out;
  }

  /* ---------- 圖表共用檢查 ---------- */
  function allY(ch) { var a = []; ch.groups.forEach(function (g) { g.series.forEach(function (s) { a = a.concat(s.y); }); }); return a; }
  function mainSeries(ch, target) {   // 跟目標數據最像的那條數列
    var best = null, bn = -1;
    ch.groups.forEach(function (g) { g.series.forEach(function (s) { var n = matchCount(s.y, target); if (n > bn) { bn = n; best = { s: s, g: g }; } }); });
    return best;
  }
  function axis(ch, which) {   // which: 'x' 或 'y'
    // 圖表群組連到的第一條軸是 X（類別／水平）、第二條是 Y（數值／垂直）
    var g = ch.groups.filter(function (g) { return g.axIds && g.axIds.length >= 2; })[0];
    if (g) {
      var id = g.axIds[which === 'x' ? 0 : 1];
      var hit = ch.axes.filter(function (a) { return a.id === id; })[0];
      if (hit) return hit;
    }
    var want = which === 'x' ? /^[bt]$/ : /^[lr]$/;   // 備用：用位置判斷（下方＝X、左邊＝Y）
    return ch.axes.filter(function (a) { return want.test(a.pos || ''); })[0] || null;
  }
  function item(key, label, ok, note) { return { key: key, label: label, ok: !!ok, note: note || '' }; }

  function chartTitleItem(ch) {
    var t = ch.title;
    if (!t) return item('title', '圖表標題', false, '沒有圖表標題');
    if (!t.auto && DEFAULT_TITLES.indexOf(t.text) >= 0) return item('title', '圖表標題', false, '標題還是預設的「' + t.text + '」，請改成有意義的名稱');
    return item('title', '圖表標題', true, t.auto ? '（使用自動標題）' : '「' + t.text + '」');
  }
  function axisTitleItem(ch, which) {
    var a = axis(ch, which), label = (which === 'x' ? 'X' : 'Y') + ' 軸座標軸標題';
    if (!a || !a.title) return item(which + 'Title', label, false, '沒有' + (which === 'x' ? 'X' : 'Y') + ' 軸標題');
    if (a.title.auto || !a.title.text) return item(which + 'Title', label, false, '標題是空的');
    if (DEFAULT_AXIS_TITLES.indexOf(a.title.text) >= 0) return item(which + 'Title', label, false, '還是預設的「' + a.title.text + '」，要改成名稱與單位');
    return item(which + 'Title', label, true, '「' + a.title.text + '」');
  }
  function yUprightItem(ch) {
    var a = axis(ch, 'y'), label = 'Y 軸標題文字轉垂直';
    if (!a || !a.title) return item('yVert', label, false, '還沒有 Y 軸標題');
    var names = { upright: '垂直直排', rotated: '旋轉 90°', horizontal: '水平' };
    var ok = RULES.Y_TITLE_ACCEPT.indexOf(a.title.dir) >= 0;
    var note = '目前是「' + names[a.title.dir] + '」';
    if (!ok) note += '，請在「文字方向」改成垂直';
    else if (a.title.dir === 'rotated' && RULES.Y_TITLE_ACCEPT.indexOf('upright') >= 0) note += '（也算對；用 Excel 可以改成中文直排，更好讀）';
    return item('yVert', label, ok, note);
  }
  function labelsItem(found, need) {   // need: ['val'] 或 ['percent','cat']
    var d = found.s.dLbls;
    var flags = { val: d && on(d, 'showVal'), percent: d && on(d, 'showPercent'), cat: d && on(d, 'showCatName') };
    if (need.length === 1) return item('labels', '資料標籤', flags.val, flags.val ? '' : '沒有顯示資料標籤');
    return [
      item('pct', '資料標籤顯示百分比', flags.percent, flags.percent ? '' : '標籤沒有顯示百分比'),
      item('catName', '資料標籤顯示類別名稱', flags.cat, flags.cat ? '' : '標籤沒有顯示類別名稱（成分）')
    ];
  }
  function dataItem(found, target, what) {
    var n = matchCount(found.s.y, target);
    if (n === target.length) return item('data', '使用自己的完整數據', true, what + ' ' + n + ' 筆');
    return item('data', '使用自己的完整數據', false, '只對上 ' + n + '／' + target.length + ' 筆，可能少選了數據');
  }

  /* ---------- 各關卡檢查 ---------- */
  function levelChart(charts, key, target, extraTest) {
    var cands = charts.filter(function (ch) {
      var ys = allY(ch);
      return matchCount(ys, target) >= Math.ceil(target.length * 0.8) && (!extraTest || extraTest(ch));
    });
    cands.forEach(function (ch) { ch.usedBy = (ch.usedBy || []).concat(key); });
    return cands;
  }
  function pickBest(cands, build) {
    var best = null;
    cands.forEach(function (ch) { var items = build(ch); var sc = items.filter(function (i) { return i.ok; }).length; if (!best || sc > best.sc) best = { sc: sc, items: items }; });
    return best ? best.items : null;
  }
  function missingChart(labels, why) { return labels.map(function (l) { return item(l[0], l[1], false, why); }); }

  function checkL1(charts, d) {
    var vols = d.L1.rows.map(function (r) { return r.vol; });
    var items = pickBest(levelChart(charts, 'L1', vols), function (ch) {
      var f = mainSeries(ch, vols), isCol = f.g.type === 'barChart' && f.g.barDir === 'col', isBar = f.g.type === 'barChart';
      return [
        item('type', '群組直條圖', isCol, isCol ? '' : isBar ? '做成橫條圖了，要用直條圖' : '圖表類型不對（目前是 ' + f.g.type.replace('Chart', '') + '）'),
        dataItem(f, vols, '氫氣體積'),
        chartTitleItem(ch), axisTitleItem(ch, 'x'), axisTitleItem(ch, 'y'), yUprightItem(ch),
        labelsItem(f, ['val'])
      ];
    });
    return items || missingChart([['type', '群組直條圖'], ['data', '使用自己的完整數據'], ['title', '圖表標題'], ['xTitle', 'X 軸座標軸標題'], ['yTitle', 'Y 軸座標軸標題'], ['yVert', 'Y 軸標題文字轉垂直'], ['labels', '資料標籤']], '找不到用你「氫氣體積」數據做的圖表');
  }

  function checkL2(charts, d) {
    var temps = d.L2.rows.map(function (r) { return r.T; }), times = d.L2.rows.map(function (r) { return r.t; });
    var items = pickBest(levelChart(charts, 'L2', temps), function (ch) {
      // 老師 2026-10-07：上課用「框起數據直接插入」的方式，不特別指定 X 軸，所以不檢查 X 軸是不是時間
      var f = mainSeries(ch, temps), isLine = f.g.type === 'lineChart';
      return [
        item('type', '折線圖', isLine, isLine ? '' : '圖表類型不對（目前是 ' + f.g.type.replace('Chart', '') + '）'),
        dataItem(f, temps, '溫度'),
        item('marker', '有資料標記', isLine && !f.s.noMarker, isLine && f.s.noMarker ? '要選「含資料標記的折線圖」' : ''),
        chartTitleItem(ch), axisTitleItem(ch, 'x'), axisTitleItem(ch, 'y'), yUprightItem(ch),
        labelsItem(f, ['val'])
      ];
    });
    return items || missingChart([['type', '折線圖'], ['data', '使用自己的完整數據'], ['marker', '有資料標記'], ['title', '圖表標題'], ['xTitle', 'X 軸座標軸標題'], ['yTitle', 'Y 軸座標軸標題'], ['yVert', 'Y 軸標題文字轉垂直'], ['labels', '資料標籤']], '找不到用你「加熱曲線溫度」數據做的圖表');
  }

  function checkL3(charts, d) {
    var masses = d.L3.rows.map(function (r) { return r.mass; });
    var items = pickBest(levelChart(charts, 'L3', masses), function (ch) {
      var f = mainSeries(ch, masses), isPie = /^(pie|pie3D|ofPie)Chart$/.test(f.g.type);
      return [
        item('type', '圓餅圖', isPie, isPie ? '' : '圖表類型不對（目前是 ' + f.g.type.replace('Chart', '') + '）'),
        dataItem(f, masses, '成分質量'),
        chartTitleItem(ch)
      ].concat(labelsItem(f, ['percent', 'cat']));
    });
    return items || missingChart([['type', '圓餅圖'], ['data', '使用自己的完整數據'], ['title', '圖表標題'], ['pct', '資料標籤顯示百分比'], ['catName', '資料標籤顯示類別名稱']], '找不到用你「合金成分」數據做的圖表');
  }

  function trendItems(f) {
    var t = f.s.trend, lin = t && t.type === 'linear';
    return [
      item('trend', '線性趨勢線', lin, !t ? '還沒加趨勢線' : lin ? '' : '趨勢線類型要選「線性」'),
      item('eq', '顯示方程式', t && t.eq, t && t.eq ? '' : '趨勢線要勾「在圖表上顯示方程式」'),
      item('r2', '顯示 R 平方值', t && t.r2, t && t.r2 ? '' : '趨勢線要勾「在圖表上顯示 R 平方值」')
    ];
  }

  function checkL4(book, charts, d) {
    var abs = d.L4.rows.map(function (r) { return r.A; }), concs = d.L4.rows.map(function (r) { return r.c; });
    var outA = abs[concs.indexOf(d.L4.hidden.outlierConc)];
    var items = pickBest(levelChart(charts, 'L4', abs, function (ch) { return hasValue(allY(ch), outA); }), function (ch) {
      var f = mainSeries(ch, abs), isSc = f.g.type === 'scatterChart';
      return [
        item('type', '散佈圖', isSc, isSc ? '' : '圖表類型不對（目前是 ' + f.g.type.replace('Chart', '') + '）'),
        dataItem(f, abs, '吸光度'),
        chartTitleItem(ch), axisTitleItem(ch, 'x'), axisTitleItem(ch, 'y'), yUprightItem(ch)
      ].concat(trendItems(f));
    });
    items = items || missingChart([['type', '散佈圖'], ['data', '使用自己的完整數據'], ['title', '圖表標題'], ['xTitle', 'X 軸座標軸標題'], ['yTitle', 'Y 軸座標軸標題'], ['yVert', 'Y 軸標題文字轉垂直'], ['trend', '線性趨勢線'], ['eq', '顯示方程式'], ['r2', '顯示 R 平方值']], '找不到用你「標準曲線」數據做的散佈圖');
    // 「算出未知樣品濃度」屬於判讀內容：學生在網頁上回答，Excel 鑑識不檢查（老師 2026-10-07）
    return items;
  }

  function checkHidden(charts, d) {
    // 只檢查操作：刪掉一個點後重做散佈圖＋趨勢線；「刪的是不是被污染的那瓶」是判讀，學生在網頁上回答（老師 2026-10-07）
    var abs = d.L4.rows.map(function (r) { return r.A; });
    var cands = charts.filter(function (ch) {
      if ((ch.usedBy || []).indexOf('L4') >= 0) return false;
      var n = matchCount(allY(ch), abs);
      return n === abs.length - 1;
    });
    var items = pickBest(cands, function (ch) {
      var f = mainSeries(ch, abs), isSc = f.g.type === 'scatterChart';
      return [item('redo', '刪掉一個點後重做散佈圖', isSc, isSc ? '用了 ' + matchCount(f.s.y, abs) + ' 筆標準溶液數據' : '要用散佈圖')].concat(trendItems(f));
    });
    return items || [item('redo', '刪掉一個點後重做散佈圖', false, '沒有找到刪掉一個點後重做的散佈圖'), item('trend', '線性趨勢線', false, ''), item('eq', '顯示方程式', false, ''), item('r2', '顯示 R 平方值', false, '')];
  }


  function checkL5(book, d) {
    var name = findSheet(book, '關卡 5', 'L5_函數'), ws = name && book.wb.Sheets[name], a = d.L5.answers;
    var defs = [
      ['avg', '平均值 AVERAGE', /AVERAGE\s*\(/i, function (v) { return Math.abs(v - a.avg) < 0.01; }],
      ['max', '最大值 MAX', /(^|[^A-Z.])MAX\s*\(/i, function (v) { return close(v, a.max); }],
      ['min', '最小值 MIN', /(^|[^A-Z.])MIN\s*\(/i, function (v) { return close(v, a.min); }],
      ['large3', '第三大值 LARGE(…,3)', /LARGE\s*\([^,]+,\s*3\s*\)/i, function (v) { return close(v, a.large3); }],
      ['small2', '第二小值 SMALL(…,2)', /SMALL\s*\([^,]+,\s*2\s*\)/i, function (v) { return close(v, a.small2); }],
      ['stdev', '標準差 STDEV', /STDEV/i, function (v) {
        return (X.CONFIG.STDEV_ACCEPT.indexOf('S') >= 0 && Math.abs(v - a.stdevS) < 0.001) || (X.CONFIG.STDEV_ACCEPT.indexOf('P') >= 0 && Math.abs(v - a.stdevP) < 0.001);
      }]
    ];
    if (!ws) return defs.map(function (x) { return item(x[0], x[1], false, '找不到「L5_函數」工作表'); });
    function calc(c) { return c.t !== 'z' && typeof c.v === 'number'; }
    function clean(f) { return String(f).replace(/_xlfn\./g, ''); }
    // 公式裡的 B 欄範圍要涵蓋 B5:B34（整欄 B:B 也算）
    function coversData(f) {
      f = String(f).replace(/\$/g, '').toUpperCase();
      if (/(^|[^A-Z])B:B([^0-9]|$)/.test(f)) return true;
      var m, re = /B(\d+):B(\d+)/g, ok = false;
      while ((m = re.exec(f))) if (+m[1] <= 5 && +m[2] >= 34) ok = true;
      return ok;
    }
    var keys = Object.keys(ws).filter(function (k) { return k[0] !== '!'; });
    var cells = keys.map(function (k) { return ws[k]; });
    var typedCells = keys.filter(function (k) { return !/^[AB]\d+$/.test(k); }).map(function (k) { return ws[k]; })
      .filter(function (c) { return !c.f && typeof c.v === 'number'; });
    return defs.map(function (x) {
      var withF = cells.filter(function (c) { return c.f && x[2].test(c.f); });
      var fullF = withF.filter(function (c) { return coversData(c.f); });
      var good = fullF.filter(function (c) { return calc(c) && x[3](c.v); });
      if (good.length) return item(x[0], x[1], true, '=' + clean(good[0].f));
      var noCalc = fullF.filter(function (c) { return !calc(c); });
      if (noCalc.length) return item(x[0], x[1], true, '=' + clean(noCalc[0].f) + '（檔案沒有存計算結果，無法核對數值）');
      if (withF.length && !fullF.length) return item(x[0], x[1], false, '=' + clean(withF[0].f) + '：範圍要包含全部 30 筆（B5:B34）');
      if (withF.length) return item(x[0], x[1], false, '=' + clean(withF[0].f) + '：結果不對，檢查一下函數');
      // 手打的數字：數據欄（A、B 欄）以外有正確數字卻沒有公式
      var typed = typedCells.filter(function (c) { return x[3](c.v); });
      return item(x[0], x[1], false, typed.length ? '有答案但沒有用函數，要讓 Excel 幫你算' : '還沒用這個函數');
    });
  }

  async function checkL6(book, d) {
    var labels = [['cf', '有設定格式化的條件'], ['range', '範圍涵蓋全部鉛濃度'], ['rule', '規則是「大於 10」'], ['red', '超標標成紅色']];
    var name = findSheet(book, '關卡 6', 'L6_格式化條件'), path = name && book.paths[name];
    if (!path || !book.zip.file(path)) return labels.map(function (l) { return item(l[0], l[1], false, '找不到「L6_格式化條件」工作表'); });
    var doc = parseXml(await book.zip.file(path).async('string'));
    var dxfs = [];
    try { var st = parseXml(await book.zip.file('xl/styles.xml').async('string')); dxfs = kids(all(st, 'dxfs')[0], 'dxf'); } catch (e) {}
    // 規則可能在主區或 extLst（x14）裡
    var rules = [];
    all(doc, 'conditionalFormatting').forEach(function (cf) {
      var sq = cf.getAttribute('sqref') || (all(cf, 'sqref')[0] || {}).textContent || '';
      all(cf, 'cfRule').forEach(function (r) {
        var fml = all(r, 'formula').concat(all(r, 'f')).map(function (n) { return n.textContent.trim(); });
        var dxf = all(r, 'dxf')[0] || (r.getAttribute('dxfId') != null ? dxfs[+r.getAttribute('dxfId')] : null);
        rules.push({ sqref: sq, type: r.getAttribute('type'), op: r.getAttribute('operator'), f: fml, dxf: dxf });
      });
    });
    if (!rules.length) return labels.map(function (l, i) { return item(l[0], l[1], false, i === 0 ? '還沒設定格式化的條件' : ''); });
    var first = 4, last = 4 + d.L6.rows.length - 1;   // 數據在 B5:B24（0 起算的列號 4～23）
    function covers(sq) {
      return sq.split(/\s+/).filter(Boolean).some(function (rg) {
        try { var r = XLSX.utils.decode_range(rg.replace(/\$/g, '')); return r.s.c <= 1 && r.e.c >= 1 && r.s.r <= first && r.e.r >= last; } catch (e) { return false; }
      });
    }
    function isGT10(r) {
      var f0 = (r.f[0] || '').replace(/^=/, '');
      if (r.type === 'cellIs' && /^greaterThan(OrEqual)?$/.test(r.op || '')) return Math.abs(+f0 - 10) < 0.3;
      if (r.type === 'expression') return /^\$?B\$?\d+\s*>=?\s*10(\.0+)?$/i.test(f0.replace(/\s/g, ''));
      return false;
    }
    function redOf(dxf) {
      if (!dxf) return 'none';
      var colors = all(dxf, 'color').concat(all(dxf, 'fgColor'), all(dxf, 'bgColor'));
      if (!colors.length) return 'none';
      var any = colors.some(function (c) {
        var rgb = (c.getAttribute('rgb') || '').slice(-6); if (rgb.length !== 6) return false;
        var R = parseInt(rgb.slice(0, 2), 16), G = parseInt(rgb.slice(2, 4), 16), B = parseInt(rgb.slice(4, 6), 16);
        return R >= 150 && R > G + 40 && R > B + 40;
      });
      if (any) return 'red';
      return colors.some(function (c) { return c.getAttribute('rgb'); }) ? 'other' : 'theme';
    }
    var good = rules.filter(isGT10), inRange = rules.filter(function (r) { return covers(r.sqref); });
    var best = good.filter(function (r) { return covers(r.sqref); })[0] || good[0] || inRange[0] || rules[0];
    var red = redOf(best.dxf);
    return [
      item('cf', labels[0][1], true, rules.length + ' 條規則'),
      item('range', labels[1][1], covers(best.sqref), covers(best.sqref) ? best.sqref : '目前範圍是 ' + (best.sqref || '（空）') + '，要包含 B5:B24'),
      item('rule', labels[2][1], isGT10(best), isGT10(best) ? '' : '規則要設成「大於 10」'),
      item('red', labels[3][1], red === 'red' || red === 'theme', red === 'red' ? '' : red === 'theme' ? '（用主題色，無法判斷是不是紅色）' : red === 'none' ? '沒有設定顏色' : '有設定格式但不是紅色')
    ];
  }

  /* ---------- 總檢查 ---------- */
  var LEVEL_NAMES = { L1: '長條圖', L2: '折線圖', L3: '圓餅圖', L4: '散佈圖', L5: '函數', L6: '格式化條件', H: '隱藏關卡' };

  async function check(buf, opts) {
    opts = opts || {};
    var book;
    try { book = await openBook(buf); }
    catch (e) { return { ok: false, error: '這個檔案打不開，請確認是用 Excel 存的 .xlsx 檔' }; }
    var who = readIdentity(book), warnings = [];
    var id = who.id || X.normId(opts.expectedId || '');
    if (!id) return { ok: false, error: '檔案裡找不到調查員學號，請用系統下載的專屬檔案作答' };
    if (opts.expectedId && who.id && who.id !== X.normId(opts.expectedId)) warnings.push('⚠️ 這個檔案的學號是 ' + who.id + '，不是 ' + X.normId(opts.expectedId) + '！');
    var curSem = X.CONFIG.SEMESTER, sem = who.semester && X.validSemester(who.semester) ? who.semester : curSem;
    if (sem !== curSem) warnings.push('檔案的學期是 ' + sem + '（目前選的是 ' + curSem + '），已用檔案的學期來核對');
    X.setSemester(sem);
    var d;
    try {
      d = X.generate(id);
      var charts = await readCharts(book);
      var levels = {
        L1: checkL1(charts, d), L2: checkL2(charts, d), L3: checkL3(charts, d),
        L4: checkL4(book, charts, d), L5: checkL5(book, d), L6: await checkL6(book, d),
        H: checkHidden(charts, d)
      };
    } finally { X.setSemester(curSem); }
    var stray = charts.filter(function (ch) { return !ch.usedBy && allY(ch).length >= 3; }).filter(function (ch) {
      // 隱藏關卡的圖不算陌生圖
      var abs = d.L4.rows.map(function (r) { return r.A; });
      return matchCount(allY(ch), abs) < abs.length - 2;
    });
    if (stray.length) warnings.push('有 ' + stray.length + ' 張圖表的數據跟你的專屬數據對不上（是不是用到別人的檔案？）');
    if (!charts.length) warnings.push('檔案裡一張圖表都沒有');
    var score = 0, max = 0, summary = {};
    Object.keys(levels).forEach(function (k) {
      var got = levels[k].filter(function (i) { return i.ok; }).length, n = levels[k].length;
      summary[k] = { got: got, max: n, name: LEVEL_NAMES[k] };
      if (k !== 'H') { score += got; max += n; }
    });
    return { ok: true, id: id, semester: sem, fileHasId: !!who.id, warnings: warnings, levels: levels, summary: summary, score: score, max: max, charts: charts.length };
  }

  /* ---------- 鑑識報告（學生頁、老師頁共用的顯示方式） ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ICON = { L1: '📊', L2: '📈', L3: '🥧', L4: '🔬', L5: '🧮', L6: '🚨', H: '🕵️' };
  function reportHtml(r, opts) {
    opts = opts || {};
    if (!r.ok) return '<div class="er-err">' + esc(r.error) + '</div>';
    var pct = Math.round(r.score / r.max * 100);
    var h = '<div class="er-head"><div class="er-score"><b>' + r.score + '</b> / ' + r.max + '<span>' + pct + '%</span></div>' +
      '<div class="er-meta">學號 <b>' + esc(r.id) + '</b>｜學期 <b>' + esc(r.semester) + '</b>｜找到 ' + r.charts + ' 張圖表</div></div>';
    if (r.warnings.length) h += '<div class="er-warn">' + r.warnings.map(esc).join('<br>') + '</div>';
    var keysShown = Object.keys(r.summary).filter(function (k) { return !(k === 'H' && opts.hideHidden && r.summary.H.got === 0); });
    h += '<div class="er-chips">' + keysShown.map(function (k) {
      var s = r.summary[k], full = s.got === s.max;
      return '<span class="er-chip' + (full ? ' full' : s.got === 0 ? ' zero' : '') + (k === 'H' ? ' hid' : '') + '">' + ICON[k] + ' ' + s.name + ' ' + s.got + '/' + s.max + '</span>';
    }).join('') + '</div>';
    Object.keys(r.levels).forEach(function (k) {
      var s = r.summary[k], list = r.levels[k];
      if (opts.failsOnly) list = list.filter(function (i) { return !i.ok; });
      if (k === 'H' && s.got === 0 && !opts.showHiddenEmpty) return;   // 沒挑戰隱藏關卡就不顯示
      if (!list.length) return;
      h += '<details class="er-lv"' + (s.got < s.max && k !== 'H' ? ' open' : '') + '><summary>' + ICON[k] + ' ' + (k === 'H' ? '隱藏關卡' : '關卡 ' + k.slice(1)) + '｜' + s.name +
        '<span class="er-n' + (s.got === s.max ? ' full' : '') + '">' + s.got + '/' + s.max + '</span></summary><ul>' +
        list.map(function (i) { return '<li class="' + (i.ok ? 'ok' : 'ng') + '"><span class="er-mk">' + (i.ok ? '✓' : '✗') + '</span><span><b>' + esc(i.label) + '</b>' + (i.note ? '<small>' + esc(i.note) + '</small>' : '') + '</span></li>'; }).join('') +
        '</ul></details>';
    });
    return h;
  }

  root.ExcelRescueChecker = { RULES: RULES, LEVEL_NAMES: LEVEL_NAMES, check: check, reportHtml: reportHtml };
})(this);
