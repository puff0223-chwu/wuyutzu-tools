/* =========================================================
   pH 值計算練習 — 共用核心（學生頁、老師頁都會載入）
   ---------------------------------------------------------
   ・係數只由 2、3、5、7、10 相乘或相除組成
   ・log 值統一用兩位小數：log2=0.30 log3=0.48 log5=0.70 log7=0.85
   ・所有計算都用「整數百分位」進行，答案不會有浮點誤差
   ・同一個「題組碼＋班級＋座號」永遠產生同一組題目（固定亂數）
   ・題目方向：正向（濃度 → pH）、反向（pH／pOH → 濃度），老師可選只正向、只反向或混合
   ========================================================= */
const PH = (() => {

  /* ---------- 設定區（老師可修改） ---------- */
  const CONFIG = {
    QUESTIONS: 5,                 // 每人題數（題組碼的難度分配固定加總為 5）
    LOG: { 2: 30, 3: 48, 5: 70, 7: 85 },   // log 值 × 100
    MAX_COST: 3,                  // 係數最多用幾個數字組成
    EXP_MIN: 2, EXP_MAX: 12,      // 係數不是 1 時，10 的次方範圍（讓 pH 落在 1～13）
    EXP1_MIN: 1, EXP1_MAX: 13,    // 係數是 1 時的次方範圍
    CHALLENGE_OH_RATIO: 0.5,      // 挑戰題中 [OH⁻] 題的比例
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    DB_PATH: 'ph-generator'
  };

  const LEVELS = [
    { key: 'basic', name: '基礎', stars: '⭐',       desc: '係數為 1：[H⁺] ↔ pH' },
    { key: 'adv',   name: '進階', stars: '⭐⭐',     desc: '係數 2、3、5、7：[H⁺] ↔ pH（反向也有 pOH → [OH⁻]）' },
    { key: 'chal',  name: '挑戰', stars: '⭐⭐⭐',   desc: '[OH⁻] ↔ pH，或兩數組合（如 1.5、4、6）' },
    { key: 'boss',  name: '魔王', stars: '⭐⭐⭐⭐', desc: '三數組合（如 1.2、7.5、8）' }
  ];

  /* ---------- 係數表：列出所有可用 2、3、5、7、10 組出的係數 ---------- */
  // 每個係數記錄：h（係數×100）、cost（用了幾個 2/3/5/7）、組成方式、近似 log（×100）
  const COEFS = (() => {
    const best = new Map();
    for (let a = -4; a <= 6; a++)
      for (let b = 0; b <= 2; b++)
        for (let c = -4; c <= 4; c++)
          for (let d = 0; d <= 2; d++) {
            const cost = Math.abs(a) + b + Math.abs(c) + d;
            if (cost > CONFIG.MAX_COST) continue;
            let num = 2 ** Math.max(a, 0) * 3 ** b * 5 ** Math.max(c, 0) * 7 ** d;
            let den = 2 ** Math.max(-a, 0) * 5 ** Math.max(-c, 0);
            let k = 0;                              // 係數 = 數值 × 10^k
            while (num < den) { num *= 10; k++; }
            while (num >= 10 * den) { den *= 10; k--; }
            if ((num * 100) % den !== 0) continue;  // 只要小數兩位以內
            const h = num * 100 / den;
            if (h % 10 !== 0 && h % 25 !== 0) continue;   // 三位數只留 1.25、1.75 這種好算的
            const L = CONFIG.LOG[2] * a + CONFIG.LOG[3] * b + CONFIG.LOG[5] * c + CONFIG.LOG[7] * d + 100 * k;
            if (L < 0 || L >= 100) continue;
            // 近似 log 和真實 log 差太多（例如 9.8）就不用
            if (Math.abs(L - 100 * Math.log10(h / 100)) > 1.5) continue;
            const prev = best.get(h);
            if (!prev || cost < prev.cost || (cost === prev.cost && Math.abs(k) < Math.abs(prev.k)))
              best.set(h, { h, cost, a, b, c, d, k, L });
          }
    return [...best.values()].sort((x, y) => x.h - y.h);
  })();
  const poolByCost = cost => COEFS.filter(x => x.cost === cost);
  // 反向題要從 log 值推回係數，所以同一個 log 值只能對應一個係數（例如 4.9 和 5 的 log 都是 0.70，只留 5）
  const REV_OK = new Set(COEFS.filter(c => !COEFS.some(o => o !== c && o.L === c.L && (o.cost < c.cost || (o.cost === c.cost && o.h < c.h)))).map(c => c.h));
  const revPool = cost => poolByCost(cost).filter(c => REV_OK.has(c.h));

  /* ---------- 固定亂數 ---------- */
  function hash(str) {                       // cyrb53 → 32 位元種子
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 ^ h1) >>> 0;
  }
  function rngFrom(str) {                    // mulberry32
    let s = hash(str);
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  /* ---------- 題組碼：把「難度分配＋作答方式＋顯示 log」藏進 7 個字 ---------- */
  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 32 字，去掉 0 1 I O 避免看錯
  const DISTS = [];                                   // 5 題分到 4 種難度的所有組合（56 種）
  for (let x = 0; x <= 5; x++) for (let y = 0; y <= 5 - x; y++) for (let z = 0; z <= 5 - x - y; z++)
    DISTS.push([x, y, z, 5 - x - y - z]);
  const ROUNDS = 32 ** 4;

  // 檢查碼的 salt 同時記錄「題目方向」：0＝只正向（舊題組碼都是這種）、1＝正反混合、2＝只反向
  const DIRS = ['fwd', 'mix', 'rev'];
  function checksum(vals, salt = 0) { return (vals.reduce((s, v, i) => s + (i + 1) * v, 0) + salt) % 32; }

  function makeCode({ dist, instant, showLog, dir = 'fwd', round }) {
    const di = DISTS.findIndex(d => d.join() === dist.join());
    if (di < 0) throw new Error('難度分配加總必須是 5');
    if (round === undefined) round = Math.floor(Math.random() * ROUNDS);
    let P = (round * DISTS.length + di) * 4 + (instant ? 1 : 0) + (showLog ? 2 : 0);
    const vals = [];
    for (let i = 0; i < 6; i++) { vals.unshift(P % 32); P = Math.floor(P / 32); }
    vals.push(checksum(vals, Math.max(0, DIRS.indexOf(dir))));
    return vals.map(v => ALPHA[v]).join('');
  }

  function normalizeCode(str) {
    return String(str || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  }
  function parseCode(str) {
    const code = normalizeCode(str);
    if (code.length !== 7) return null;
    const vals = [...code].map(ch => ALPHA.indexOf(ch));
    if (vals.some(v => v < 0)) return null;
    const salt = [0, 1, 2].find(x => checksum(vals.slice(0, 6), x) === vals[6]);
    if (salt === undefined) return null;
    let P = 0;
    for (let i = 0; i < 6; i++) P = P * 32 + vals[i];
    const flags = P % 4; P = Math.floor(P / 4);
    const di = P % DISTS.length; const round = Math.floor(P / DISTS.length);
    return { code, round, dist: DISTS[di].slice(), instant: !!(flags & 1), showLog: !!(flags & 2), dir: DIRS[salt] };
  }
  const prettyCode = code => code.slice(0, 3) + '-' + code.slice(3);

  /* ---------- 出題 ---------- */
  function makeQuestion(rng, levelIdx) {
    let type = 'H', coef, exp;
    if (levelIdx === 0) coef = poolByCost(0)[0];
    else if (levelIdx === 1) coef = pick(rng, poolByCost(1));
    else if (levelIdx === 2) {
      if (rng() < CONFIG.CHALLENGE_OH_RATIO) { type = 'OH'; coef = pick(rng, [...poolByCost(0), ...poolByCost(1)]); }
      else coef = pick(rng, poolByCost(2));
    } else coef = pick(rng, poolByCost(3));
    exp = coef.h === 100 ? randInt(rng, CONFIG.EXP1_MIN, CONFIG.EXP1_MAX) : randInt(rng, CONFIG.EXP_MIN, CONFIG.EXP_MAX);
    const p = 100 * exp - coef.L;             // pH 或 pOH（×100）
    const ans = type === 'H' ? p : 1400 - p;  // pH × 100
    return { dir: 'fwd', level: levelIdx, type, coef, exp, ans, key: `${type}${coef.h}e${exp}` };
  }

  // 反向題：已知 pH 或 pOH，求濃度（答案為 係數 × 10^次方）
  //   pH2H：pH → [H⁺]　pOH2OH：pOH → [OH⁻]　pH2OH：pH → [OH⁻]（先算 pOH）
  function makeReverse(rng, levelIdx) {
    let kind, coef;
    const either = () => rng() < 0.5 ? 'pH2H' : 'pOH2OH';
    if (levelIdx === 0) { kind = 'pH2H'; coef = revPool(0)[0]; }
    else if (levelIdx === 1) { kind = either(); coef = pick(rng, revPool(1)); }
    else if (levelIdx === 2) {
      if (rng() < CONFIG.CHALLENGE_OH_RATIO) { kind = 'pH2OH'; coef = pick(rng, [...revPool(0), ...revPool(1)]); }
      else { kind = either(); coef = pick(rng, revPool(2)); }
    } else { kind = either(); coef = pick(rng, revPool(3)); }
    const exp = coef.h === 100 ? randInt(rng, CONFIG.EXP1_MIN, CONFIG.EXP1_MAX) : randInt(rng, CONFIG.EXP_MIN, CONFIG.EXP_MAX);
    const p = 100 * exp - coef.L;                    // 與答案濃度對應的 pH（[H⁺] 題）或 pOH（[OH⁻] 題），×100
    const type = kind === 'pH2H' ? 'H' : 'OH';
    const given = kind === 'pOH2OH' ? 'pOH' : 'pH';
    const gv = kind === 'pH2OH' ? 1400 - p : p;      // 題目給的數值（×100）
    return { dir: 'rev', kind, level: levelIdx, type, given, gv, coef, exp,
      val: coef.h / 100 * 10 ** -exp, key: `R${kind}${coef.h}e${exp}` };
  }

  // 依題組碼＋種子產生一組題目（由易到難排序）
  function generate(parsed, seedStr) {
    const rng = rngFrom(parsed.code + '|' + seedStr);
    const qs = [], seen = new Set(), seenCoef = new Set();
    parsed.dist.forEach((count, lv) => {
      for (let i = 0; i < count; i++) {
        let q, tries = 0;
        // 同一組裡盡量不出現相同係數，真的抽不到才放寬
        // 只正向時不多抽亂數，舊題組碼的題目完全不變
        do {
          const rev = parsed.dir === 'rev' || (parsed.dir === 'mix' && rng() < 0.5);
          q = rev ? makeReverse(rng, lv) : makeQuestion(rng, lv);
          tries++;
        }
        while (tries < 60 && (seen.has(q.key) || (tries < 30 && q.coef.h !== 100 && seenCoef.has(q.type + q.coef.h))));
        seen.add(q.key); seenCoef.add(q.type + q.coef.h); qs.push(q);
      }
    });
    return qs;
  }
  function normalizeClass(s) { return toHalf(String(s || '')).trim().toUpperCase(); }
  function studentSeed(cls, seat) { return `S|${normalizeClass(cls)}|${Number(seat)}`; }
  function forStudent(parsed, cls, seat) { return generate(parsed, studentSeed(cls, seat)); }

  /* ---------- 顯示 ---------- */
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const coefText = h => (h / 100).toString();
  const fix2 = n => (n / 100).toFixed(2);
  const num2 = n => (n / 100).toFixed(2);

  const supText = n => String(n).split('').map(ch => SUP[ch]).join('');
  const ionHTML = q => q.type === 'H' ? '[H<sup>+</sup>]' : '[OH<sup>−</sup>]';
  const ionText = q => q.type === 'H' ? '[H⁺]' : '[OH⁻]';
  const givenStr = q => q.gv % 100 === 0 ? String(q.gv / 100) : fix2(q.gv);   // 整數 pH 不寫 .00
  // 題目（HTML）：正向「[H⁺] = 1.5 × 10⁻⁵ M」；反向「pH = 4.82，求 [H⁺]」
  function concHTML(q) {
    if (q.dir === 'rev') return `${q.given} = ${givenStr(q)}，求 ${ionHTML(q)}`;
    return `${ionHTML(q)} = ${coefText(q.coef.h)} × 10<sup>−${q.exp}</sup> M`;
  }
  // 題目（純文字，Excel 用）
  function concText(q) {
    if (q.dir === 'rev') return `${q.given} = ${givenStr(q)}，求 ${ionText(q)}`;
    return `${ionText(q)} = ${coefText(q.coef.h)}×10${supText(-q.exp)} M`;
  }
  // 作答欄前面的標籤
  const askHTML = q => q.dir === 'rev' ? `${ionHTML(q)} =` : 'pH =';
  // 正確答案
  function ansHTML(q) {
    if (q.dir === 'rev') return `${ionHTML(q)} = ${coefText(q.coef.h)} × 10<sup>−${q.exp}</sup> M`;
    return `pH = ${fix2(q.ans)}`;
  }
  function ansText(q) {
    if (q.dir === 'rev') return `${ionText(q)} = ${coefText(q.coef.h)}×10${supText(-q.exp)} M`;
    return `pH = ${fix2(q.ans)}`;
  }
  // 列印學習單的作答欄
  const blankHTML = q => q.dir === 'rev' ? `${ionHTML(q)} = ＿＿＿ × 10<sup>＿＿</sup> M` : 'pH = ＿＿＿＿＿＿';
  // 學生作答字串顯示：反向題存成 "1.5e-5"，顯示成 1.5×10⁻⁵
  function formatAnswerStr(str) {
    const m = /^(.*)e(-?\d+)$/i.exec(String(str || '').trim());
    return m ? `${m[1]}×10${supText(m[2])}` : String(str || '');
  }

  // 係數拆解，例如 1.5 → 「3 ÷ 2」，log → 「0.48 − 0.30」
  function decompose(coef) {
    const top = [], bottom = [];
    const add = (arr, n, times) => { for (let i = 0; i < times; i++) arr.push(n); };
    add(top, 2, Math.max(coef.a, 0)); add(top, 3, coef.b); add(top, 5, Math.max(coef.c, 0)); add(top, 7, coef.d);
    add(bottom, 2, Math.max(-coef.a, 0)); add(bottom, 5, Math.max(-coef.c, 0));
    add(top, 10, Math.max(coef.k, 0)); add(bottom, 10, Math.max(-coef.k, 0));
    const expr = (top.length ? top.join(' × ') : '1') + bottom.map(x => ' ÷ ' + x).join('');
    const terms = [...top.map(x => ({ s: 1, x })), ...bottom.map(x => ({ s: -1, x }))];
    const val = x => x === 10 ? 100 : CONFIG.LOG[x];
    const logExpr = terms.map((t, i) => (i === 0 ? (t.s < 0 ? '−' : '') : (t.s < 0 ? ' − ' : ' + ')) + num2(val(t.x))).join('');
    return { expr, logExpr, single: terms.length === 1 && top.length === 1 };
  }

  // 解題過程（純文字，一行一步）
  function solution(q) {
    if (q.dir === 'rev') return solutionRev(q);
    const steps = [];
    const c = coefText(q.coef.h);
    const label = q.type === 'H' ? 'pH' : 'pOH';
    if (q.coef.h === 100) {
      steps.push(`${label} = −log(10${supText(-q.exp)}) = ${q.exp}`);
    } else {
      const d = decompose(q.coef);
      if (d.single) steps.push(`log ${c} = ${num2(q.coef.L)}`);
      else steps.push(`${c} = ${d.expr}，log ${c} = ${d.logExpr} = ${num2(q.coef.L)}`);
      steps.push(`${label} = ${q.exp} − ${num2(q.coef.L)} = ${fix2(100 * q.exp - q.coef.L)}`);
    }
    if (q.type === 'OH') steps.push(`pH = 14 − ${fix2(100 * q.exp - q.coef.L)} = ${fix2(q.ans)}`);
    return steps;
  }

  function solutionRev(q) {
    const steps = [], c = coefText(q.coef.h), ion = ionText(q);
    const p = 100 * q.exp - q.coef.L;
    const label = q.type === 'H' ? 'pH' : 'pOH';
    if (q.kind === 'pH2OH') steps.push(`pOH = 14 − ${givenStr(q)} = ${fix2(p)}`);
    if (q.coef.h === 100) {
      steps.push(`${ion} = 10^(−${label}) = 10${supText(-q.exp)} = 1×10${supText(-q.exp)} M`);
      return steps;
    }
    steps.push(`${ion} = 10^(−${fix2(p)}) = 10^${num2(q.coef.L)} × 10${supText(-q.exp)}`);
    const d = decompose(q.coef);
    if (d.single) steps.push(`${num2(q.coef.L)} = log ${c}，所以 10^${num2(q.coef.L)} = ${c}`);
    else steps.push(`${num2(q.coef.L)} = ${d.logExpr} = log(${d.expr}) = log ${c}，所以 10^${num2(q.coef.L)} = ${c}`);
    steps.push(`${ion} = ${c}×10${supText(-q.exp)} M`);
    return steps;
  }

  /* ---------- 判斷答案 ---------- */
  function toHalf(s) {
    return String(s).replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ');
  }
  function parseAnswer(input) {
    const s = toHalf(input).replace(/\s+/g, '').replace(/^ph=?/i, '').replace(/[−–]/g, '-');
    if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
    return Number(s);
  }
  function isCorrect(q, input) {
    const v = parseAnswer(input);
    if (v === null || !isFinite(v)) return false;
    // 反向題：係數要是 2、3、5、7 組出的那個值（允許 1.50、15×10⁻⁶ 這類等價寫法）
    if (q.dir === 'rev') return Math.abs(v - q.val) <= q.val * 0.005;
    return Math.abs(v * 100 - q.ans) < 1e-6;
  }

  /* ---------- Firebase ---------- */
  function studentId(cls, seat) {
    return `${normalizeClass(cls)}_${Number(seat)}`.replace(/[.$#\[\]\/\x00-\x1F\x7F]/g, '_');
  }
  const recordUrl = (code, sid) => `${CONFIG.FIREBASE_URL}/${CONFIG.DB_PATH}/${code}/${encodeURIComponent(sid)}.json`;
  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }
  const fetchRecord = (code, sid) => getJSON(recordUrl(code, sid));
  const fetchAll = async code => (await getJSON(`${CONFIG.FIREBASE_URL}/${CONFIG.DB_PATH}/${code}.json`)) || {};
  async function saveRecord(code, sid, rec) {
    const res = await fetch(recordUrl(code, sid), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }
  // Firebase 會把陣列存成物件，讀回來時統一轉成長度固定的陣列
  function toArray(v, n, fill) {
    const out = Array(n).fill(fill);
    if (Array.isArray(v)) v.forEach((x, i) => { if (i < n && x !== null && x !== undefined) out[i] = x; });
    else if (v && typeof v === 'object') Object.entries(v).forEach(([i, x]) => { if (+i < n) out[+i] = x; });
    return out;
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    CONFIG, LEVELS, COEFS, DISTS,
    makeCode, parseCode, normalizeCode, prettyCode,
    generate, forStudent, normalizeClass,
    concHTML, concText, askHTML, ansHTML, ansText, blankHTML, formatAnswerStr, solution, fix2, isCorrect, parseAnswer, DIRS,
    studentId, fetchRecord, fetchAll, saveRecord, toArray, escapeHtml
  };
})();
