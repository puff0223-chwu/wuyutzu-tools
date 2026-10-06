/* ============================================================
 * 消失的實驗數據 — Excel 數據救援任務｜共用核心
 * 學號當「種子」→ 產生專屬數據 → 算出標準答案 → 對答案
 * 學生頁與老師頁都載入這支檔案，保證兩邊算出來一模一樣。
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------- 設定區：SEMESTER 是「預設」學期，老師頁可以隨時換，換了會放進學生連結 ?s=… ---------- */
  var CONFIG = {
    SEMESTER: '115-1',          // 預設學期代碼（學生連結沒帶 ?s= 時用這個）
    STDEV_ACCEPT: ['S', 'P']    // 標準差接受 STDEV（＝STDEV.S，樣本）與 STDEV.P（母體）兩種結果
  };

  /* ---------- 亂數：同一顆種子永遠長出同一棵樹 ---------- */
  function hashStr(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);   // 53 位元以內，數字不會失真
  }
  function makeRng(seedNum) {
    var a = seedNum >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normId(id) { return String(id || '').trim().toUpperCase(); }
  function rngFor(id, part) { return makeRng(hashStr(CONFIG.SEMESTER + '|' + normId(id) + '|' + part)); }

  function uni(r, a, b) { return a + (b - a) * r(); }
  function int(r, a, b) { return Math.floor(uni(r, a, b + 1)); }
  function round(x, d) { var p = Math.pow(10, d); return Math.round(x * p) / p; }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- 統計小工具（跟 Excel 算法一致） ---------- */
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function stdev(a, sample) {
    var m = mean(a), ss = a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0);
    return Math.sqrt(ss / (a.length - (sample ? 1 : 0)));
  }
  function linreg(xs, ys) {   // 線性趨勢線 y = mx + b 與 R²
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < xs.length; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my);
    }
    var m = sxy / sxx, b = my - m * mx;
    return { m: m, b: b, r2: (sxy * sxy) / (sxx * syy) };
  }

  /* ======================= 各關卡數據 ======================= */

  // 關卡 1｜長條圖：六件金屬證物與鹽酸反應 3 分鐘收集的氫氣體積
  function genL1(id) {
    var r = rngFor(id, 'L1');
    var codes = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];
    var vols;
    do {
      vols = codes.map(function () { return round(uni(r, 12, 95), 1); });
      var s = vols.slice().sort(function (a, b) { return a - b; });
      var ok = true;
      for (var i = 1; i < s.length; i++) if (s[i] - s[i - 1] < 4) ok = false;
    } while (!ok);
    var rows = codes.map(function (c, i) { return { code: c, vol: vols[i] }; });
    var sorted = rows.slice().sort(function (a, b) { return b.vol - a.vol; });
    var k = int(r, 2, 4);
    return {
      rows: rows, k: k,
      answers: {
        rankCode: sorted[k - 1].code,
        diff: round(sorted[0].vol - sorted[sorted.length - 1].vol, 1)
      }
    };
  }

  // 關卡 2｜折線圖：未知物質 X 的加熱曲線（讀出轉折點）
  function genL2(id) {
    var r = rngFor(id, 'L2');
    var mp = int(r, -10, 70), bp = mp + int(r, 60, 140);
    var T0 = mp - int(r, 12, 25);
    var d1 = int(r, 4, 6), d2 = int(r, 4, 7), d3 = int(r, 6, 9), d4 = int(r, 5, 8), d5 = 3;
    var r1 = (mp - T0) / d1, r2 = (bp - mp) / d3, r3 = int(r, 6, 10);
    var rows = [], total = d1 + d2 + d3 + d4 + d5;
    for (var t = 0; t <= total; t++) {
      var T;
      if (t <= d1) T = T0 + r1 * t;
      else if (t <= d1 + d2) T = mp;
      else if (t <= d1 + d2 + d3) T = mp + r2 * (t - d1 - d2);
      else if (t <= d1 + d2 + d3 + d4) T = bp;
      else T = bp + r3 * (t - d1 - d2 - d3 - d4);
      var noise = (t === 0) ? 0 : uni(r, -0.2, 0.2);
      rows.push({ t: t, T: round(T + noise, 1) });
    }
    return {
      rows: rows,
      answers: { mp: mp, bp: bp, boilStart: d1 + d2 + d3, meltStart: d1 }
    };
  }

  // 關卡 3｜圓餅圖：神秘合金成分（質量 g）
  function genL3(id) {
    var r = rngFor(id, 'L3');
    var pool = ['銅', '鋅', '錫', '鎳', '鋁', '鐵', '鉛', '銀'];
    var n = int(r, 4, 5);
    var names = shuffle(r, pool).slice(0, n);
    var masses, pct, maxIdx;
    do {
      masses = names.map(function () { return round(uni(r, 3, 60), 1); });
      var tot = masses.reduce(function (s, x) { return s + x; }, 0);
      pct = masses.map(function (m) { return m / tot * 100; });
      var s = pct.slice().sort(function (a, b) { return b - a; });
      maxIdx = pct.indexOf(s[0]);
    } while (s[0] - s[1] < 3);
    var target;
    do { target = int(r, 0, n - 1); } while (target === maxIdx);
    return {
      rows: names.map(function (nm, i) { return { name: nm, mass: masses[i] }; }),
      target: names[target],
      answers: { largest: names[maxIdx], targetPct: pct[target] }
    };
  }

  // 關卡 4｜散佈圖：比爾定律標準曲線（含一個被污染的離群值）＋ 隱藏關卡
  function genL4(id) {
    var r = rngFor(id, 'L4');
    var concs = [0, 1, 2, 3, 4, 5, 6, 7];
    var k = round(uni(r, 0.045, 0.12), 4), b0 = round(uni(r, 0.002, 0.015), 4);
    var abs, outIdx, withO, noO;
    for (var tries = 0; tries < 500; tries++) {
      abs = concs.map(function (c) { return round(k * c + b0 + uni(r, -0.004, 0.004), 3); });
      outIdx = int(r, 2, 6);
      var sign = r() < 0.5 ? -1 : 1;
      abs[outIdx] = round(abs[outIdx] + sign * uni(r, 0.10, 0.18) * (k * concs[outIdx] + b0) * 1.6, 3);
      withO = linreg(concs, abs);
      var xs = concs.filter(function (_, i) { return i !== outIdx; });
      var ys = abs.filter(function (_, i) { return i !== outIdx; });
      noO = linreg(xs, ys);
      if (withO.r2 >= 0.93 && withO.r2 <= 0.985 && noO.r2 >= 0.995) break;
    }
    var trueC = round(uni(r, 1.5, 6.0), 2);
    var unknownA = round(k * trueC + b0, 3);
    return {
      rows: concs.map(function (c, i) { return { c: c, A: abs[i] }; }),
      unknownA: unknownA,
      answers: {
        slope: withO.m, r2: withO.r2, conc: (unknownA - withO.b) / withO.m,
        intercept: withO.b
      },
      hidden: {
        outlierConc: concs[outIdx],
        slope: noO.m, r2: noO.r2, conc: (unknownA - noO.b) / noO.m, intercept: noO.b
      }
    };
  }

  // 關卡 5｜函數：全班 30 組醋酸滴定所用 NaOH 體積 (mL)
  function genL5(id) {
    var r = rngFor(id, 'L5');
    var mu = uni(r, 12, 25), sd = uni(r, 0.3, 0.8);
    var vals = [], seen = {};
    while (vals.length < 30) {
      var u1 = r() || 1e-9, u2 = r();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      var v = round(mu + sd * z, 2);
      if (!seen[v]) { seen[v] = 1; vals.push(v); }
    }
    var desc = vals.slice().sort(function (a, b) { return b - a; });
    var asc = vals.slice().sort(function (a, b) { return a - b; });
    return {
      vals: vals,
      answers: {
        avg: mean(vals), max: desc[0], min: asc[0],
        large3: desc[2], small2: asc[1],
        stdevS: stdev(vals, true), stdevP: stdev(vals, false)
      }
    };
  }

  // 關卡 6｜格式化條件：20 個採樣點的鉛濃度（ppb），標準 10 ppb
  function genL6(id) {
    var r = rngFor(id, 'L6');
    var n = 20, exceed = int(r, 3, 8);
    var flags = shuffle(r, Array.apply(null, Array(n)).map(function (_, i) { return i < exceed; }));
    var vals = flags.map(function (f) { return f ? round(uni(r, 10.3, 18), 1) : round(uni(r, 1.5, 9.7), 1); });
    var mx = Math.max.apply(null, vals);
    while (vals.filter(function (v) { return v === mx; }).length > 1) {
      vals[vals.lastIndexOf(mx)] = round(mx - 0.4, 1);
      mx = Math.max.apply(null, vals);
    }
    var rows = vals.map(function (v, i) { return { code: 'W' + String(i + 1).padStart(2, '0'), pb: v }; });
    return {
      rows: rows, limit: 10,
      answers: { count: exceed, worst: rows[vals.indexOf(mx)].code }
    };
  }

  function generate(id) {
    id = normId(id);
    return { id: id, semester: CONFIG.SEMESTER, L1: genL1(id), L2: genL2(id), L3: genL3(id), L4: genL4(id), L5: genL5(id), L6: genL6(id) };
  }

  /* ======================= 關卡題目與對答案 ======================= */
  // type: num = 數字（容許誤差）｜choice = 選擇
  function near(a, b, tol) { return Math.abs(a - b) <= tol; }
  function rel(a, b, tolRatio) { return Math.abs(a - b) <= Math.abs(b) * tolRatio; }

  var LEVELS = [
    {
      key: 'L1', no: 1, icon: '📊', title: '證物氣體大比拚', chart: '長條圖',
      story: '鑑識組在現場撿到六片金屬碎片（E1～E6），分別丟進鹽酸 3 分鐘，收集到的氫氣體積被記錄在工作表「L1_長條圖」。',
      tasks: ['用數據做出「群組直條圖」', '加上圖表標題、X 軸與 Y 軸座標軸標題（Y 軸要寫單位 mL）', '把 Y 軸標題文字轉成垂直', '叫出每根長條的資料標籤'],
      questions: function (d) {
        return [
          { f: 'rankCode', label: '產氣量排名第 ' + d.L1.k + ' 多的是哪一件證物？', type: 'choice', options: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'] },
          { f: 'diff', label: '產氣最多與最少的證物相差幾 mL？', type: 'num', unit: 'mL' }
        ];
      },
      check: function (d, a) {
        return { rankCode: a.rankCode === d.L1.answers.rankCode, diff: near(+a.diff, d.L1.answers.diff, 0.05) };
      }
    },
    {
      key: 'L2', no: 2, icon: '📈', title: '未知物質 X 的加熱曲線', chart: '折線圖',
      story: '實驗紀錄本只剩下一張表：持續加熱未知物質 X，每分鐘記錄一次溫度（工作表「L2_折線圖」）。曲線上的「平台」藏著它的身分。',
      tasks: ['用數據做出「含資料標記的折線圖」（X 軸為時間）', '加上圖表標題與兩個座標軸標題（含單位）', '把 Y 軸標題文字轉成垂直', '叫出資料標籤', '從曲線找出兩段平台（轉折點）'],
      questions: function () {
        return [
          { f: 'mp', label: '物質 X 的熔點約是幾 °C？', type: 'num', unit: '°C' },
          { f: 'bp', label: '物質 X 的沸點約是幾 °C？', type: 'num', unit: '°C' },
          { f: 'boilStart', label: '第幾分鐘時開始沸騰（溫度第二次停住不動）？', type: 'num', unit: '分鐘' }
        ];
      },
      check: function (d, a) {
        var x = d.L2.answers;
        return { mp: near(+a.mp, x.mp, 1), bp: near(+a.bp, x.bp, 1), boilStart: +a.boilStart === x.boilStart };
      }
    },
    {
      key: 'L3', no: 3, icon: '🥧', title: '神秘合金的配方', chart: '圓餅圖',
      story: '現場留下一塊來路不明的合金，化驗室測出各成分的質量（工作表「L3_圓餅圖」），只是沒有人算百分比。',
      tasks: ['用數據做出「圓餅圖」', '加上圖表標題', '叫出資料標籤，並讓標籤顯示「百分比」與「類別名稱」'],
      questions: function (d) {
        return [
          { f: 'largest', label: '占比最大的成分是？', type: 'choice', options: d.L3.rows.map(function (x) { return x.name; }) },
          { f: 'targetPct', label: '「' + d.L3.target + '」占整塊合金的百分之幾？（看圓餅圖標籤，填整數）', type: 'num', unit: '%' }
        ];
      },
      check: function (d, a) {
        return { largest: a.largest === d.L3.answers.largest, targetPct: near(+a.targetPct, d.L3.answers.targetPct, 1) };
      }
    },
    {
      key: 'L4', no: 4, icon: '🔬', title: '比爾定律：找出未知濃度', chart: '散佈圖',
      story: '分光光度計測了 8 瓶已知濃度的標準溶液（工作表「L4_散佈圖」），還有一瓶從現場帶回的未知樣品。用標準曲線算出它的濃度！',
      tasks: ['用數據做出「散佈圖」（X 軸濃度、Y 軸吸光度）', '加上圖表標題與兩個座標軸標題（含單位）', '把 Y 軸標題文字轉成垂直', '加上「線性趨勢線」，並勾選「在圖表上顯示方程式」與「顯示 R 平方值」', '用趨勢線方程式反推未知樣品的濃度'],
      questions: function () {
        return [
          { f: 'slope', label: '趨勢線方程式的斜率（x 前面的數字）是？', type: 'num' },
          { f: 'r2', label: '決定係數 R² 是？', type: 'num' },
          { f: 'conc', label: '未知樣品的濃度是幾 ppm？（四捨五入到小數第 2 位）', type: 'num', unit: 'ppm' }
        ];
      },
      check: function (d, a) {
        var x = d.L4.answers;
        return { slope: rel(+a.slope, x.slope, 0.015), r2: near(+a.r2, x.r2, 0.002), conc: rel(+a.conc, x.conc, 0.03) };
      }
    },
    {
      key: 'L5', no: 5, icon: '🧮', title: '全班滴定數據總整理', chart: '函數',
      story: '全班 30 組做了同一瓶醋的酸鹼滴定，記下用掉的 NaOH 體積（工作表「L5_函數」）。用函數幫報告算出統計數字。',
      tasks: ['在 E 欄「答案」用函數計算：AVERAGE、MAX、MIN', '用 LARGE 找第三大值、用 SMALL 找第二小值', '用 STDEV 計算標準差（STDEV、STDEV.S、STDEV.P 都可以）', '不准手算！要讓 Excel 幫你算'],
      questions: function () {
        return [
          { f: 'avg', label: '平均值（小數第 2 位）', type: 'num', unit: 'mL' },
          { f: 'max', label: '最大值', type: 'num', unit: 'mL' },
          { f: 'min', label: '最小值', type: 'num', unit: 'mL' },
          { f: 'large3', label: '第三大值', type: 'num', unit: 'mL' },
          { f: 'small2', label: '第二小值', type: 'num', unit: 'mL' },
          { f: 'stdev', label: '標準差（小數第 2 位）', type: 'num', unit: 'mL' }
        ];
      },
      check: function (d, a) {
        var x = d.L5.answers, sd = +a.stdev;
        var sdOk = (CONFIG.STDEV_ACCEPT.indexOf('S') >= 0 && near(sd, x.stdevS, 0.006)) ||
                   (CONFIG.STDEV_ACCEPT.indexOf('P') >= 0 && near(sd, x.stdevP, 0.006));
        return {
          avg: near(+a.avg, x.avg, 0.006), max: near(+a.max, x.max, 0.001), min: near(+a.min, x.min, 0.001),
          large3: near(+a.large3, x.large3, 0.001), small2: near(+a.small2, x.small2, 0.001), stdev: sdOk
        };
      }
    },
    {
      key: 'L6', no: 6, icon: '🚨', title: '水源鉛污染警報', chart: '格式化條件',
      story: '環保局送來 20 個採樣點的自來水鉛濃度（工作表「L6_格式化條件」）。飲用水標準是鉛 10 ppb 以下，超標的要立刻標出來！',
      tasks: ['選取鉛濃度欄位，使用「設定格式化的條件」', '規則：大於 10 的儲存格自動變成紅色', '數一數有幾個採樣點超標'],
      questions: function (d) {
        return [
          { f: 'count', label: '有幾個採樣點超標？', type: 'num', unit: '個' },
          { f: 'worst', label: '鉛濃度最高的採樣點是？', type: 'choice', options: d.L6.rows.map(function (x) { return x.code; }) }
        ];
      },
      check: function (d, a) {
        return { count: +a.count === d.L6.answers.count, worst: a.worst === d.L6.answers.worst };
      }
    }
  ];

  var HIDDEN = {
    key: 'H', no: '？', icon: '🕵️', title: '被污染的標準品', chart: '隱藏關卡',
    requires: 'L4',
    story: '你的 R² 是不是看起來「不夠漂亮」？調查員筆記上寫著：「八瓶標準溶液中，有一瓶在配製時被污染了。」找出它，把它排除，重新算一次！',
    tasks: ['觀察散佈圖，找出明顯偏離趨勢線的那一個點', '複製一份數據，刪掉那一點後重新做散佈圖與趨勢線', '比較刪掉前後的 R²，並重新計算未知樣品濃度'],
    questions: function () {
      return [
        { f: 'outlierConc', label: '被污染的是哪一瓶標準溶液？', type: 'choice', options: ['0 ppm', '1 ppm', '2 ppm', '3 ppm', '4 ppm', '5 ppm', '6 ppm', '7 ppm'] },
        { f: 'slope', label: '排除後的新斜率', type: 'num' },
        { f: 'r2', label: '排除後的新 R²', type: 'num' },
        { f: 'conc', label: '修正後的未知樣品濃度（ppm，小數第 2 位）', type: 'num', unit: 'ppm' }
      ];
    },
    check: function (d, a) {
      var x = d.L4.hidden;
      return {
        outlierConc: a.outlierConc === x.outlierConc + ' ppm',
        slope: rel(+a.slope, x.slope, 0.015), r2: near(+a.r2, x.r2, 0.0015), conc: rel(+a.conc, x.conc, 0.03)
      };
    }
  };

  /* ---------- 結案代碼：老師頁可以反算驗證 ---------- */
  var ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function code6(s) {
    var h = hashStr(s), out = '';
    for (var i = 0; i < 6; i++) { out += ALPH[h % 32]; h = Math.floor(h / 32); }
    return out;
  }
  function closeCode(id) { return code6(CONFIG.SEMESTER + '|' + normId(id) + '|CASE-CLOSED'); }
  function hiddenCode(id) { return code6(CONFIG.SEMESTER + '|' + normId(id) + '|HIDDEN-BADGE'); }
  function fragment(id, key) { return code6(CONFIG.SEMESTER + '|' + normId(id) + '|' + key).slice(0, 2); }

  /* ---------- 匯出專屬 Excel 的工作表內容（陣列形式，交給 SheetJS） ---------- */
  function sheets(d) {
    var head = function (t) { return [[t], ['調查員學號：' + d.id + '　｜　學期：' + d.semester], []]; };
    var L1 = head('關卡 1｜長條圖　證物與鹽酸反應 3 分鐘收集的氫氣體積')
      .concat([['證物編號', '氫氣體積 (mL)']]).concat(d.L1.rows.map(function (x) { return [x.code, x.vol]; }));
    var L2 = head('關卡 2｜折線圖　未知物質 X 的加熱曲線')
      .concat([['時間 (分鐘)', '溫度 (°C)']]).concat(d.L2.rows.map(function (x) { return [x.t, x.T]; }));
    var L3 = head('關卡 3｜圓餅圖　神秘合金的成分')
      .concat([['成分', '質量 (g)']]).concat(d.L3.rows.map(function (x) { return [x.name, x.mass]; }));
    var L4 = head('關卡 4｜散佈圖　比爾定律標準曲線')
      .concat([['濃度 (ppm)', '吸光度 A']]).concat(d.L4.rows.map(function (x) { return [x.c, x.A]; }))
      .concat([[], ['未知樣品的吸光度 A', d.L4.unknownA], ['未知樣品濃度 (ppm)', '← 用趨勢線方程式算出來填這裡']]);
    var L5 = head('關卡 5｜函數　全班 30 組醋酸滴定所用 NaOH 體積')
      .concat([['組別', 'NaOH 體積 (mL)', '', '統計項目', '答案（請用函數）']]);
    var labels = ['平均值', '最大值', '最小值', '第三大值', '第二小值', '標準差'];
    d.L5.vals.forEach(function (v, i) { L5.push([i + 1, v, '', labels[i] || '', '']); });
    var L6 = head('關卡 6｜格式化條件　自來水鉛濃度（飲用水標準：10 ppb 以下）')
      .concat([['採樣點', '鉛濃度 (ppb)']]).concat(d.L6.rows.map(function (x) { return [x.code, x.pb]; }));
    var info = [
      ['消失的實驗數據 — Excel 數據救援任務'], ['調查員學號：' + d.id], ['學期：' + d.semester], [],
      ['這份數據只屬於你，跟別人的都不一樣，抄答案會被系統識破喔！'], [],
      ['怎麼玩：'],
      ['1. 每一關都有自己的工作表（下方分頁），照網頁上的任務清單做出圖表。'],
      ['2. 從你做好的圖表或函數讀出答案，回到網頁輸入。'],
      ['3. 六關全破就能拿到「結案代碼」。'],
      ['4. 把這個 Excel 檔和結案證明截圖一起交到課程平台。'], [],
      ['據說…散佈圖那一關藏著一個秘密。']
    ];
    return [
      { name: '任務說明', aoa: info, cols: [70] },
      { name: 'L1_長條圖', aoa: L1, cols: [14, 16] },
      { name: 'L2_折線圖', aoa: L2, cols: [14, 14] },
      { name: 'L3_圓餅圖', aoa: L3, cols: [14, 14] },
      { name: 'L4_散佈圖', aoa: L4, cols: [22, 32] },
      { name: 'L5_函數', aoa: L5, cols: [8, 16, 4, 12, 18] },
      { name: 'L6_格式化條件', aoa: L6, cols: [12, 14] }
    ];
  }

  /* ---------- 換學期：只接受英數與連字號，最多 16 字 ---------- */
  function validSemester(s) { return /^[A-Za-z0-9-]{1,16}$/.test(String(s || '').trim()); }
  function setSemester(s) {
    s = String(s || '').trim().toUpperCase();
    if (!validSemester(s)) return false;
    CONFIG.SEMESTER = s; return true;
  }
  function isCodeLike(s) { return /^[A-HJ-NP-Z2-9]{6}$/.test(String(s || '').toUpperCase()); }

  var API = {
    CONFIG: CONFIG, validSemester: validSemester, setSemester: setSemester, isCodeLike: isCodeLike, normId: normId, generate: generate, LEVELS: LEVELS, HIDDEN: HIDDEN,
    closeCode: closeCode, hiddenCode: hiddenCode, fragment: fragment, sheets: sheets, linreg: linreg
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ExcelRescue = API;
})(this);
