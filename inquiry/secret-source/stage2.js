/* ============================================================
 * 📜 出處失傳的秘文｜第 2 關「證詞重建」＋結案作業「我的文獻卷宗」（2026-10-19 第三階段）
 *  2-1 文中引用快問快答：一位、兩位、三位以上（等）、機構、英文（& / et al.），括號式與敘述式
 *  2-2 直接引用 vs. 間接引用：判斷每一句的引用寫法對不對、錯在哪
 *  2-3 這算不算抄襲：合格改寫／換字抄襲／漏標出處／直接抄沒加引號
 *  2-4 改寫練習：瀏覽器先算和原文的重複程度與引用格式，通過才送 AI 回饋（AI 只給提示、不幫忙改寫）
 *  結案：用線索卡裡自己找的文獻寫 150～300 字文獻探討＋參考文獻清單，系統檢查引用 ↔ 清單對應
 *
 * 格式依據：全國高級中等學校小論文寫作比賽《引註及參考文獻格式範例》
 *   一位（吳清山，2001）／吳清山（2001）；兩位（曾文星、徐靜，1982）／曾文星與徐靜（1982）；
 *   三位以上（吳裕益等，1998）／吳裕益等（1998）；直接引用加「」並設粗體、同一處不超過 50 字（不含標點）
 * 原文段落全部是練習用的虛構文獻
 * ============================================================ */
(function (root) {
  'use strict';
  var X = root.SecretSource;
  var pick = X.pick, shuffle = X.shuffle;

  /* ---------- 原文段落（虛構）：orig 原文、ex 可以直接引用的短句、lead＋body 合格改寫、swap 換字抄襲 ---------- */
  var PASS = [
    { id: 'a1', s: 'chem', au: ['林冠宇'], yr: 2021,
      orig: '蛋殼的主要成分是碳酸鈣。碳酸鈣遇到醋酸時會產生二氧化碳氣泡，蛋殼因此逐漸溶解，而且醋酸的濃度越高，氣泡產生得越快，蛋殼也溶解得越快。',
      ex: '蛋殼的主要成分是碳酸鈣',
      lead: '的研究說明，', body: '醋酸和蛋殼裡的碳酸鈣反應後會冒出二氧化碳，所以蛋殼會慢慢變薄；醋越濃，這個反應就進行得越快。',
      swap: '蛋殼的主要組成是碳酸鈣。碳酸鈣碰到醋酸時會生成二氧化碳泡泡，蛋殼所以慢慢溶化，而且醋酸的濃度愈高，泡泡產生得愈快，蛋殼也溶化得愈快。' },
    { id: 'a2', s: 'phy', au: ['陳怡君', '張家豪'], yr: 2019,
      orig: '輪胎的胎紋可以把路面上的水排開。在潮濕的路面上，胎紋較深的輪胎能維持較大的摩擦力，車輛也比較不容易打滑，因此胎紋磨平的輪胎應該及早更換。',
      ex: '輪胎的胎紋可以把路面上的水排開',
      lead: '指出，', body: '下雨時路面積水，胎紋能把水導開；溝槽越深，輪胎和地面之間越抓得住，車子就不容易失控，所以磨平的輪胎要早點換掉。',
      swap: '輪胎的花紋能夠把路上的水排除。在溼滑的路面上，花紋比較深的輪胎可以保持比較大的摩擦力，車子也較不容易打滑，所以花紋磨平的輪胎應該早點更換。' },
    { id: 'a3', s: 'bio', au: ['黃志明', '李雅婷', '王俊傑'], yr: 2022,
      orig: '酵母菌在無氧的環境下會分解糖類，產生酒精與二氧化碳。實驗發現，溫度在攝氏三十度左右時，酵母菌的發酵作用最旺盛，溫度太高反而會讓酵母菌死亡。',
      ex: '酵母菌在無氧的環境下會分解糖類',
      lead: '發現，', body: '沒有氧氣時，酵母菌會把糖變成酒精和二氧化碳；大約三十度最適合牠們發酵，但如果太熱，酵母菌就會被熱死。',
      swap: '酵母菌在缺氧的環境中會分解醣類，生成酒精及二氧化碳。實驗發現，溫度在攝氏三十度上下時，酵母菌的發酵作用最旺，溫度過高反倒會使酵母菌死掉。' },
    { id: 'a4', s: 'geo', au: ['海洋氣象研究中心'], org: true, yr: 2023,
      orig: '颱風的能量主要來自溫暖的海水。當海水表面溫度高於攝氏二十六度時，大量水氣蒸發並在高空凝結釋放潛熱，颱風就容易增強，甚至在短時間內快速增強。',
      ex: '颱風的能量主要來自溫暖的海水',
      lead: '說明，', body: '颱風是靠暖海水補充能量的：海面超過約二十六度時，水氣大量蒸發，到高空變回水滴時放出熱量，颱風就可能一下子變得很強。',
      swap: '颱風的能量大多來自溫暖的海水。當海水表層溫度超過攝氏二十六度時，大量水氣蒸發並在高空凝結放出潛熱，颱風就容易變強，甚至在短時間內迅速增強。' },
    { id: 'a5', s: 'phy', au: ['吳宗翰'], yr: 2020,
      orig: '金屬容器的導熱效果比陶瓷容器好。把熱水倒進金屬杯時，熱量會很快傳到杯壁，再從杯壁散失到空氣中，所以金屬杯裡的水溫下降得比陶瓷杯快。',
      ex: '金屬容器的導熱效果比陶瓷容器好',
      lead: '比較不同材質的杯子後指出，', body: '金屬比陶瓷更會傳熱，熱水的熱很快經過杯壁跑到空氣裡，因此用金屬杯裝的熱水會比較早變涼。',
      swap: '金屬杯子的傳熱效果比陶瓷杯子好。把熱水倒入金屬杯時，熱能會快速傳到杯壁，再從杯壁散失到空氣裡，所以金屬杯中的水溫下降得比陶瓷杯快。' },
    { id: 'a6', s: 'bio', au: ['劉佩珊', '蔡承恩'], yr: 2018,
      orig: '用肥皂洗手能把手上的油脂與細菌一起帶走。研究發現，雙手搓洗二十秒以上再用清水沖淨，手上的細菌數量會明顯減少，比只用清水沖洗的效果好很多。',
      ex: '用肥皂洗手能把手上的油脂與細菌一起帶走',
      lead: '的研究顯示，', body: '肥皂會讓細菌跟著油脂一起被沖掉；只要搓滿二十秒再沖水，手上的細菌就少很多，效果遠勝過只用水沖。',
      swap: '使用肥皂洗手可以把手上的油脂和細菌一併帶走。研究指出，雙手搓洗二十秒以上再用清水沖乾淨，手上的細菌數目會顯著減少，比只用清水沖的效果好很多。' }
  ];
  var PUNCT = /[\s，。、；：！？「」『』（）()〔〕［］\[\],.;:!?"'“”‘’…—\-－·]/g;
  var bare = function (s) { return String(s || '').replace(PUNCT, ''); };

  // 文中引用的寫法（小論文格式）
  function narr(p) { return (p.au.length >= 3 ? p.au[0] + '等' : p.au.join('與')) + '（' + p.yr + '）'; }
  function paren(p) { return '（' + (p.au.length >= 3 ? p.au[0] + '等' : p.au.join('、')) + '，' + p.yr + '）'; }
  function srcLabel(p) { return p.au.join('、') + '，' + p.yr; }

  // 每位學生用的段落：2-2、2-3 一段，2-4 改寫另一段（避免直接抄 2-3 的合格改寫）
  function passages(code, id) {
    var r = X.rngFor(code, id, 'S2P'), list = shuffle(r, PASS);
    return { judge: list[0], para: list[1] };
  }

  /* ======================= 2-1 文中引用快問快答 ======================= */
  var ZH_SUR = ['王', '李', '林', '陳', '張', '黃', '吳', '劉', '蔡', '楊'], ZH_GIV = ['小明', '大華', '小美', '志強', '雅芳', '家豪', '怡君', '冠宇'];
  var EN_SUR = ['Smith', 'Chen', 'Garcia', 'Lee', 'Brown', 'Wang', 'Miller', 'Lin'];
  var ORGS = ['國家海洋研究院', '環境保護研究中心', '國立自然科學博物館研究組'];
  function zhNames(r, n) { var a = [], s = shuffle(r, ZH_SUR); for (var i = 0; i < n; i++) a.push(s[i] + pick(r, ZH_GIV)); return a; }
  function makeCite(code, id) {
    var r = X.rngFor(code, id, 'S2C'), yr = function () { return X.int(r, 2015, 2025); }, out = [];
    var mk = function (kind, au, y, mode, ans, wrong, note) { out.push({ kind: kind, au: au, yr: y, mode: mode, ans: ans, opts: shuffle(r, [ans].concat(wrong)), note: note }); };
    var a1 = zhNames(r, 1), y1 = yr();
    mk('一位作者', a1, y1, '括號式', '（' + a1[0] + '，' + y1 + '）', ['(' + a1[0] + ', ' + y1 + ')', '（' + a1[0] + '，' + y1 + '年）', '（' + y1 + '，' + a1[0] + '）'], '中文用全形括號與逗號，年份不加「年」，作者在前');
    var a2 = zhNames(r, 2), y2 = yr();
    mk('兩位作者', a2, y2, '括號式', '（' + a2[0] + '、' + a2[1] + '，' + y2 + '）', ['（' + a2[0] + '等，' + y2 + '）', '（' + a2[0] + '與' + a2[1] + '，' + y2 + '）', '（' + a2[0] + '，' + a2[1] + '，' + y2 + '）'], '兩位作者都要寫，括號裡用頓號「、」');
    var a2b = zhNames(r, 2), y2b = yr();
    mk('兩位作者', a2b, y2b, '敘述式', a2b[0] + '與' + a2b[1] + '（' + y2b + '）指出', [a2b[0] + '、' + a2b[1] + '，' + y2b + '指出', a2b[0] + '等（' + y2b + '）指出', '（' + a2b[0] + '與' + a2b[1] + '）' + y2b + '指出'], '敘述式把作者寫進句子，兩位作者用「與」連接，年份放在括號裡');
    var a3 = zhNames(r, 3), y3 = yr();
    mk('三位以上作者', a3, y3, '括號式', '（' + a3[0] + '等，' + y3 + '）', ['（' + a3.join('、') + '，' + y3 + '）', '（' + a3[0] + '等人，' + y3 + '）', '（' + a3[0] + '，等，' + y3 + '）'], '三位以上只寫第一位作者再加「等」');
    var o = pick(r, ORGS), yo = yr();
    mk('機構作者', [o], yo, '括號式', '（' + o + '，' + yo + '）', ['（' + o.slice(0, 2) + '，' + yo + '）', '（無作者，' + yo + '）', '（' + o + '網站，' + yo + '）'], '機構（政府單位、學校、研究中心）就是作者，寫全名');
    var e = shuffle(r, EN_SUR), ye = yr(), en3 = X.int(r, 0, 1);
    if (en3) mk('英文三位以上', [e[0], e[1], e[2]], ye, '括號式', '(' + e[0] + ' et al., ' + ye + ')', ['（' + e[0] + '等，' + ye + '）', '(' + e[0] + ', ' + e[1] + ', ' + e[2] + ', ' + ye + ')', '(' + e[0] + ' et al. ' + ye + ')'], '英文用半形標點，三位以上寫「第一作者 et al.」，年份前有逗號');
    else mk('英文兩位作者', [e[0], e[1]], ye, '括號式', '(' + e[0] + ' & ' + e[1] + ', ' + ye + ')', ['(' + e[0] + ' and ' + e[1] + ' ' + ye + ')', '（' + e[0] + '、' + e[1] + '，' + ye + '）', '(' + e[0] + ' et al., ' + ye + ')'], '英文括號式兩位作者用「&」，年份前加逗號');
    return out;
  }
  function gradeCite(q, picks) { var res = q.map(function (it, i) { return picks[i] === it.ans; }); return { ok: res.every(Boolean), res: res, n: res.filter(Boolean).length }; }

  /* ======================= 2-2 直接引用 vs. 間接引用 ======================= */
  var QKIND = [
    ['ok_direct', '✅ 正確的直接引用'], ['ok_indirect', '✅ 正確的間接引用（改寫）'], ['no_quote', '❌ 直接引用沒加「」'],
    ['no_bold', '❌ 直接引用沒有粗體'], ['too_long', '❌ 直接引用超過 50 字'], ['no_cite', '❌ 沒有註明出處']
  ];
  // 句子用 segs（{t, b}）表示，才能顯示粗體
  function makeQuote(code, id) {
    var p = passages(code, id).judge, r = X.rngFor(code, id, 'S2Q'), n = narr(p);
    var items = [
      { k: 'ok_direct', segs: [{ t: n + '指出：「' }, { t: p.ex, b: 1 }, { t: '」。' }], why: '有出處、有「」、引用的文字設粗體，而且不到 50 字' },
      { k: 'ok_indirect', segs: [{ t: n + p.lead + p.body }], why: '用自己的話改寫，不加「」也不用粗體，但一樣註明出處' },
      { k: 'no_quote', segs: [{ t: n + '指出：' }, { t: p.ex, b: 1 }, { t: '。' }], why: '一字不改照抄原文就是直接引用，一定要用「」框起來' },
      { k: 'no_bold', segs: [{ t: n + '指出：「' + p.ex + '」。' }], why: '小論文規定直接引用的文字要設粗體' },
      { k: 'too_long', segs: [{ t: n + '指出：「' }, { t: p.orig, b: 1 }, { t: '」' }], why: '同一處直接引用不能超過 50 字（不含標點），這段有 ' + bare(p.orig).length + ' 字；太長就改用自己的話寫' },
      { k: 'no_cite', segs: [{ t: p.body }], why: '內容來自文獻，就算是改寫也要註明出處，否則會被當成抄襲' }
    ];
    return { p: p, items: shuffle(r, items) };
  }
  function gradeQuote(q, picks) { var res = q.items.map(function (it, i) { return picks[i] === it.k; }); return { ok: res.every(Boolean), res: res, n: res.filter(Boolean).length }; }

  /* ======================= 2-3 這算不算抄襲 ======================= */
  var PKIND = [['ok', '✅ 合格的改寫'], ['swap', '❌ 換字抄襲'], ['nocite', '❌ 漏標出處'], ['noquote', '❌ 照抄卻沒加「」']];
  function makePlag(code, id) {
    var p = passages(code, id).judge, r = X.rngFor(code, id, 'S2L');
    var items = [
      { k: 'ok', t: narr(p) + p.lead + p.body, why: '句子結構和用詞都換成自己的，也有註明出處' },
      { k: 'swap', t: p.swap.replace(/。$/, '') + paren(p) + '。', why: '雖然有出處，但只是把幾個詞換成同義詞，句子結構和原文幾乎一樣，還是抄襲' },
      { k: 'nocite', t: p.body, why: '是自己的話，但沒有寫出處，別人會以為是你自己的發現' },
      { k: 'noquote', t: p.orig.replace(/。$/, '') + paren(p) + '。', why: '一字不改照抄原文，就算有出處也要用「」標成直接引用（而且這段已經超過 50 字）' }
    ];
    return { p: p, items: shuffle(r, items) };
  }
  function gradePlag(q, picks) { var res = q.items.map(function (it, i) { return picks[i] === it.k; }); return { ok: res.every(Boolean), res: res, n: res.filter(Boolean).length }; }

  /* ======================= 2-4 改寫練習（本機檢查） ======================= */
  // 最長的「連續相同字」（不看標點）
  function longestCommon(a, b) {
    a = bare(a); b = bare(b);
    var best = 0, at = 0, prev = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var cur = new Array(b.length + 1).fill(0);
      for (var j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) { best = cur[j]; at = i; } }
      prev = cur;
    }
    return { len: best, str: a.slice(at - best, at) };
  }
  // 三字一組的重疊比例（學生的句子有多少「三字組」原文也有）
  function overlap(orig, text) {
    var g = function (s) { s = bare(s); var o = {}; for (var i = 0; i + 3 <= s.length; i++) o[s.substr(i, 3)] = 1; return o; };
    var A = g(orig), B = g(text), keys = Object.keys(B); if (!keys.length) return 0;
    return keys.filter(function (k) { return A[k]; }).length / keys.length;
  }
  // 文中引用：作者＋年份要對（括號式或敘述式都可以）
  function citeForms(p) {
    var y = String(p.yr), a = p.au, f = [];
    var who = a.length >= 3 ? [a[0] + '等'] : a.length === 2 ? [a[0] + '、' + a[1], a[0] + '與' + a[1]] : [a[0]];
    who.forEach(function (w) { f.push('（' + w + '，' + y + '）', w + '（' + y + '）'); });
    return f;
  }
  function checkPara(p, text) {
    var t = String(text || '').trim(), probs = [], n = bare(t).length;
    if (n < 30) probs.push('改寫太短了（現在 ' + n + ' 字），至少寫 30 字，把原文的重點都交代到');
    if (n > 200) probs.push('太長了（現在 ' + n + ' 字），改寫是「整理重點」，200 字以內就好');
    if (/[「」]/.test(t)) probs.push('改寫（間接引用）不用加「」；「」是一字不改照抄時才用的');
    var forms = citeForms(p), y = String(p.yr);
    if (!forms.some(function (f) { return t.indexOf(f) >= 0; })) {
      if (/[()]/.test(t) && t.indexOf(y) >= 0) probs.push('文中引用的括號要用全形「（ ）」，逗號也要全形「，」');
      else if (t.indexOf(y) < 0) probs.push('少了出處：要寫出作者和年份，例如「' + forms[1] + '」或「' + forms[0] + '」');
      else probs.push('出處的寫法不對，看一下規則：' + forms.slice(0, 2).join(' 或 ') + (p.au.length >= 3 ? '（三位以上作者寫「第一位＋等」）' : p.au.length === 2 ? '（兩位作者：括號裡用「、」，句子裡用「與」）' : ''));
    }
    var lc = longestCommon(p.orig, t.replace(new RegExp(forms.map(function (f) { return f.replace(/[()（）]/g, '\\$&'); }).join('|'), 'g'), ''));
    if (lc.len >= 10) probs.push('有一段連續 ' + lc.len + ' 個字和原文一模一樣：「' + lc.str + '」，要換成自己的說法');
    else if (overlap(p.orig, t) > 0.3) probs.push('和原文太像了，很多詞的順序都沒變；試著先讀懂、把原文蓋起來，再用自己的話寫');
    return { ok: !probs.length, probs: probs, n: n, lc: lc.len };
  }

  /* ======================= 結案作業：我的文獻卷宗 ======================= */
  var MIN_W = 150, MAX_W = 300;
  var WEBT = { essay: 1, fair: 1, web: 1, yt: 1, forum: 1 };
  var BOLDT = { book: 1, essay: 1, fair: 1, journal: 1, thesis: 1, news: 1, gov: 1 };
  // 一行參考文獻 → { first 第一作者, yr, en, bold }（segs＝這一行的 {t,b,i}）
  function parseRef(line) {
    var t = line.map(function (s) { return s.t; }).join('').trim();
    if (!t) return null;
    var en = /^[A-Za-z]/.test(t), m;
    var o = { text: t, en: en, bold: line.some(function (s) { return s.b && /[^\s，。、,.]/.test(s.t); }), italic: line.some(function (s) { return s.i && /\S/.test(s.t); }), probs: [] };
    if (en) {
      m = t.match(/^([A-Za-z'\-]+),.*?\((\d{4})\)\.\s/);
      if (!m) { o.probs.push('英文格式：Author, A. A. (Year). …（年份用半形括號，後面加句點和空格）'); m = t.match(/^([A-Za-z'\-]+)/); o.first = m ? m[1] : ''; o.yr = (t.match(/(19|20)\d{2}/) || [''])[0]; }
      else { o.first = m[1]; o.yr = m[2]; }
    } else {
      m = t.match(/^(.+?)（((?:19|20)\d{2})(?:年\d{1,2}月\d{1,2}日)?）。/);
      if (!m) {
        if (/^.+?\((19|20)\d{2}/.test(t)) o.probs.push('中文的年份括號要用全形「（ ）」');
        else o.probs.push('開頭要是「作者（年份）。」，例如：王小明（2023）。');
        var m2 = t.match(/^([^（(]+)[（(]?((?:19|20)\d{2})?/); o.first = m2 ? m2[1].split(/[、與,，]/)[0] : ''; o.yr = m2 && m2[2] ? m2[2] : (t.match(/(19|20)\d{2}/) || [''])[0];
      } else { o.first = m[1].split(/[、與]/)[0].replace(/（.*$/, ''); o.yr = m[2]; }
      if (/[,()]/.test(t.replace(/https?:\/\/\S+/g, ''))) o.probs.push('中文參考文獻要用全形標點（，（ ））');
      if (!/[。]$|https?:\/\/\S+$/.test(t)) o.probs.push('結尾要有「。」（網址結尾的不用）');
    }
    return o;
  }
  // 把線索卡對到參考文獻：第一作者（中文看開頭、英文看姓）＋年份
  function firstOf(au) { var s = String(au || '').trim(); return /^[A-Za-z]/.test(s) ? s.split(/[,\s]/)[0] : s.split(/[、與,，\s]/)[0]; }
  function checkDossier(paraSegs, refLines, cards) {
    var P = paraSegs.map(function (s) { return s.t; }).join(''), msgs = [], warn = [];
    var words = P.replace(/\s/g, '').length;
    if (words < MIN_W) msgs.push('文獻探討要 ' + MIN_W + '～' + MAX_W + ' 字（現在 ' + words + ' 字）');
    if (words > MAX_W) msgs.push('超過 ' + MAX_W + ' 字了（現在 ' + words + ' 字），挑最重要的寫');
    var refs = refLines.map(parseRef).filter(Boolean);
    if (!refs.length) msgs.push('下面還沒有列參考文獻');
    // 中文在前、英文在後
    var seenEn = false; refs.forEach(function (r) { if (r.en) seenEn = true; else if (seenEn) r.probs.push('中文文獻要排在英文文獻前面'); });
    // 對應線索卡
    var useCards = Array.isArray(cards); // 任務沒開第 1 關時（cards＝null）不對線索卡
    cards = (cards || []).filter(function (c) { return c && c.t; });
    if (useCards) refs.forEach(function (r) {
      r.card = cards.filter(function (c) { return firstOf(c.au) && r.first && (r.first.indexOf(firstOf(c.au)) === 0 || firstOf(c.au).indexOf(r.first) === 0) && String(c.yr) === String(r.yr); })[0] || null;
      if (!r.card) r.probs.push('在線索卡裡找不到這篇（作者或年份和線索卡不一樣？結案作業要用自己找的文獻）');
      else if (!r.en && BOLDT[r.card.t] && !r.bold) r.probs.push('這是' + ((X.TYPE[r.card.t] || {}).name || '這類文獻') + '，書名／刊名／篇名要設粗體');
      else if (!r.en && WEBT[r.card.t] && r.card.t !== 'essay' && r.card.t !== 'fair' && r.bold) r.probs.push('網路資源、影片不用粗體');
      if (r.en && r.card && !r.italic) r.probs.push('英文的書名或期刊名要設斜體');
    });
    // 文中引用：每個含年份的括號
    var cites = [], re = /[（(]([^（）()]{0,40}?)((?:19|20)\d{2})([^（）()]{0,12})[）)]/g, m;
    while ((m = re.exec(P))) {
      var before = P.slice(Math.max(0, m.index - 14), m.index), inside = m[1] + m[2] + m[3], yr = m[2];
      var hit = refs.filter(function (r) { return r.first && r.yr === yr && (inside.indexOf(r.first) >= 0 || before.indexOf(r.first) >= 0); })[0];
      if (/[()]/.test(m[0]) && !/^[A-Za-z]/.test(inside.trim()) && !/[A-Za-z]/.test(before.slice(-3))) warn.push('中文的文中引用要用全形括號：' + m[0]);
      cites.push({ text: m[0], ref: hit });
    }
    var cited = {}; cites.forEach(function (c) { if (c.ref) cited[refs.indexOf(c.ref)] = 1; });
    var orphan = cites.filter(function (c) { return !c.ref; });
    if (orphan.length) msgs.push('文中引用了「' + orphan.map(function (c) { return c.text; }).join('」「') + '」，但參考文獻裡找不到對應的那篇（作者、年份要一致）');
    var unused = refs.filter(function (r, i) { return !cited[i]; });
    if (unused.length) msgs.push('參考文獻列了「' + unused.map(function (r) { return r.first + '（' + r.yr + '）'; }).join('」「') + '」，但文中沒有引用（小論文：列了沒引用、引用了沒列都扣 4 分）');
    if (Object.keys(cited).length < 2) msgs.push('至少要引用 2 篇不同的文獻（現在 ' + Object.keys(cited).length + ' 篇）');
    if (useCards && refs.length && !refs.some(function (r) { return r.card && !WEBT[r.card.t]; })) msgs.push('參考文獻至少要有 1 篇書籍（或期刊、博碩士論文、報紙、政府出版品），不能全部是網路取得的資源');
    // 直接引用：「」裡的字要粗體、≤ 50 字、旁邊要有出處
    var pos = 0, qs = [];
    paraSegs.forEach(function (s) { s.from = pos; pos += s.t.length; });
    var qre = /「([^「」]*)」/g;
    while ((m = qre.exec(P))) {
      var inner = m[1], start = m.index + 1, n = bare(inner).length;
      var allBold = true; for (var k = start; k < start + inner.length; k++) { if (/[\s，。、；：！？]/.test(P[k])) continue; var sg = paraSegs.filter(function (s) { return k >= s.from && k < s.from + s.t.length; })[0]; if (!sg || !sg.b) { allBold = false; break; } }
      var near = P.slice(Math.max(0, m.index - 20), m.index) + P.slice(m.index + m[0].length, m.index + m[0].length + 20);
      if (n > 50) msgs.push('直接引用「' + inner.slice(0, 12) + '…」有 ' + n + ' 字，同一處不能超過 50 字');
      if (!allBold) msgs.push('直接引用「' + inner.slice(0, 12) + (inner.length > 12 ? '…' : '') + '」的文字要設粗體');
      if (!/[（(][^（）()]*(19|20)\d{2}[^（）()]*[）)]/.test(near)) msgs.push('直接引用「' + inner.slice(0, 12) + (inner.length > 12 ? '…' : '') + '」的前後要註明出處');
      qs.push(inner);
    }
    // 粗體只能用在直接引用
    var boldOut = paraSegs.some(function (s) { if (!s.b || !/[^\s，。、]/.test(s.t)) return false; var mid = s.from + Math.floor(s.t.length / 2), lq = P.lastIndexOf('「', mid), rq = P.lastIndexOf('」', mid); return !(lq >= 0 && lq > rq); });
    if (boldOut) msgs.push('文章內容不能用粗體，只有直接引用（「」裡的文字）才設粗體');
    var refBad = refs.filter(function (r) { return r.probs.length; }).length;
    if (refBad) msgs.push(refBad + ' 筆參考文獻還有地方要改（看每一筆下面的紅字）');
    return { ok: !msgs.length, msgs: msgs, warn: warn, words: words, refs: refs, cites: cites, quotes: qs };
  }
  function dossierCode(code, id) { return X.closeCode(code, id + '|DOSSIER'); }

  // 存雲端用：segs → 只保留 <b>／<i> 的簡單標記
  function toMark(segs) { return segs.map(function (s) { var t = X.escapeHtml(s.t); if (s.b) t = '<b>' + t + '</b>'; if (s.i) t = '<i>' + t + '</i>'; return t; }).join(''); }
  // 安全顯示：先全部跳脫，再只把 <b> <i> <br> 還原
  function showMark(s) { return X.escapeHtml(String(s || '')).replace(/&lt;(\/?)(b|i|br)&gt;/g, '<$1$2>').replace(/&amp;(amp|lt|gt|quot|#39);/g, '&$1;'); }

  var API = 'https://reading-quiz-system.vercel.app/api/src-feedback';
  function aiFeedback(body) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (tm) clearTimeout(tm); return r.json(); }, function (e) { if (tm) clearTimeout(tm); throw e; });
  }

  root.SecretSourceS2 = {
    PASS: PASS, narr: narr, paren: paren, srcLabel: srcLabel, passages: passages, bare: bare,
    makeCite: makeCite, gradeCite: gradeCite, QKIND: QKIND, makeQuote: makeQuote, gradeQuote: gradeQuote,
    PKIND: PKIND, makePlag: makePlag, gradePlag: gradePlag,
    longestCommon: longestCommon, overlap: overlap, citeForms: citeForms, checkPara: checkPara,
    MIN_W: MIN_W, MAX_W: MAX_W, parseRef: parseRef, checkDossier: checkDossier, dossierCode: dossierCode,
    toMark: toMark, showMark: showMark, API: API, aiFeedback: aiFeedback
  };
})(typeof window !== 'undefined' ? window : globalThis);
