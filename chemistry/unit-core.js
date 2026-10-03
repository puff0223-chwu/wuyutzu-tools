/* =========================================================
   化學單位換算練習 — 共用核心（學生頁、老師頁都會載入）
   ---------------------------------------------------------
   ・單位：質量 g、莫耳數 mol、分子數、原子數、CM、重量百分率 %、ppm
   ・只給原子量，學生自己算分子量；可用計算機
   ・一般答案到小數第二位；分子數、原子數用科學記號（係數到小數第二位）
   ・判分允許約 ±1% 誤差（容許中間步驟四捨五入）
   ・同一個「題組碼＋班級＋座號」永遠產生同一組題目（固定亂數）
   ========================================================= */
const UC = (() => {

  /* ---------- 設定區（老師可修改） ---------- */
  const CONFIG = {
    QUESTIONS: 5,
    NA: 6.02e23,
    NA_TEXT: '6.02×10²³',
    TOLERANCE: 0.01,              // 相對誤差 1%
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    DB_PATH: 'unit-convert',
    CODE_SALT: 13                 // 讓單位換算的題組碼和 pH 的題組碼不能互用
  };

  const ATOMIC = { H: 1, C: 12, N: 14, O: 16, F: 19, Na: 23, S: 32, Cl: 35.5, Ca: 40 };

  const LEVELS = [
    { key: 'basic', name: '基礎', stars: '⭐',       desc: '一步換算：g↔mol、mol↔分子數' },
    { key: 'adv',   name: '進階', stars: '⭐⭐',     desc: '兩步換算：g↔分子數、mol→總原子數' },
    { key: 'chal',  name: '挑戰', stars: '⭐⭐⭐',   desc: '溶液濃度：CM、重量百分率、ppm' },
    { key: 'boss',  name: '魔王', stars: '⭐⭐⭐⭐', desc: '濃度互換（密度）、g↔某種原子數' }
  ];

  /* ---------- 物質庫 ---------- */
  // atoms：每個分子（或化學式單位）含各元素幾個；molecular：分子化合物才問分子數、原子數
  // general：會出現在「純物質」換算題（g、mol、分子數）
  const SUBS = {
    H2O:       { f: 'H2O',       name: '水',       atoms: { H: 2, O: 1 },           molecular: true,  general: true,  scenes: ['一個馬克杯', '一個保溫瓶', '一瓶礦泉水'] },
    CO2:       { f: 'CO2',       name: '二氧化碳', atoms: { C: 1, O: 2 },           molecular: true,  general: true,  scenes: ['一塊乾冰', '一支二氧化碳滅火器', '一台氣泡水機的鋼瓶'] },
    CH4:       { f: 'CH4',       name: '甲烷',     atoms: { C: 1, H: 4 },           molecular: true,  general: true,  scenes: ['一個天然氣儲氣桶', '養豬場的沼氣收集袋'] },
    NH3:       { f: 'NH3',       name: '氨',       atoms: { N: 1, H: 3 },           molecular: true,  general: true,  scenes: ['肥料工廠的一個儲氣槽', '一個實驗室集氣瓶'] },
    O2:        { f: 'O2',        name: '氧氣',     atoms: { O: 2 },                 molecular: true,  general: true,  scenes: ['一支潛水用氧氣瓶', '一支醫療用氧氣鋼瓶'] },
    C3H8:      { f: 'C3H8',      name: '丙烷',     atoms: { C: 3, H: 8 },           molecular: true,  general: true,  scenes: ['一個露營用瓦斯罐', '一罐烤肉爐燃料'] },
    C2H5OH:    { f: 'C2H5OH',    name: '乙醇',     atoms: { C: 2, H: 6, O: 1 },     molecular: true,  general: true,  scenes: ['一瓶無水酒精', '一個實驗室燒杯'] },
    C6H12O6:   { f: 'C6H12O6',   name: '葡萄糖',   atoms: { C: 6, H: 12, O: 6 },    molecular: true,  general: true,  scenes: ['一包葡萄糖粉', '一包運動能量膠'] },
    C12H22O11: { f: 'C12H22O11', name: '蔗糖',     atoms: { C: 12, H: 22, O: 11 },  molecular: true,  general: true,  scenes: ['一包砂糖', '一罐烘焙糖粉'] },
    CH3COOH:   { f: 'CH3COOH',   name: '醋酸',     atoms: { C: 2, H: 4, O: 2 },     molecular: true,  general: true,  scenes: ['一瓶冰醋酸', '一個實驗室試劑瓶'] },
    HCl:       { f: 'HCl',       name: '氯化氫',   atoms: { H: 1, Cl: 1 },          molecular: true,  general: false, scenes: [] },
    H2SO4:     { f: 'H2SO4',     name: '硫酸',     atoms: { H: 2, S: 1, O: 4 },     molecular: true,  general: false, scenes: [] },
    HNO3:      { f: 'HNO3',      name: '硝酸',     atoms: { H: 1, N: 1, O: 3 },     molecular: true,  general: false, scenes: [] },
    NaCl:      { f: 'NaCl',      name: '氯化鈉',   atoms: { Na: 1, Cl: 1 },         molecular: false, general: true,  scenes: ['一包食鹽', '一袋海鹽'] },
    NaOH:      { f: 'NaOH',      name: '氫氧化鈉', atoms: { Na: 1, O: 1, H: 1 },    molecular: false, general: true,  scenes: ['一罐水管疏通粉', '一個實驗室秤量瓶'] },
    CaCO3:     { f: 'CaCO3',     name: '碳酸鈣',   atoms: { Ca: 1, C: 1, O: 3 },    molecular: false, general: true,  scenes: ['一盒粉筆', '一塊大理石'] },
    NaHCO3:    { f: 'NaHCO3',    name: '碳酸氫鈉', atoms: { Na: 1, H: 1, C: 1, O: 3 }, molecular: false, general: true, scenes: ['一包烘焙用小蘇打'] },
    NaF:       { f: 'NaF',       name: '氟化鈉',   atoms: { Na: 1, F: 1 },          molecular: false, general: false, scenes: [] }
  };
  const ELEMENT_NAME = { H: '氫', C: '碳', N: '氮', O: '氧', F: '氟', Na: '鈉', S: '硫', Cl: '氯', Ca: '鈣' };

  // 配溶液用的溶質與情境
  const SOLUTES = [
    { s: 'NaCl',      ctx: ['醫院的生理食鹽水', '醃泡菜用的鹽水', '海洋研究船採集的鹽水'], pctMax: 25 },
    { s: 'NaOH',      ctx: ['實驗室配製的氫氧化鈉溶液', '手工皂用的鹼液'], pctMax: 30 },
    { s: 'C6H12O6',   ctx: ['醫院的葡萄糖點滴', '自製運動飲料'], pctMax: 30 },
    { s: 'C12H22O11', ctx: ['手搖飲店的糖水', '做糖葫蘆用的糖漿'], pctMax: 40 },
    { s: 'CH3COOH',   ctx: ['廚房的食醋', '泡菜用的醋'], pctMax: 30 },
    { s: 'NaHCO3',    ctx: ['清潔用的小蘇打水'], pctMax: 8 },
    { s: 'HCl',       ctx: ['實驗室的稀鹽酸'], pctMax: 30 },
    { s: 'H2SO4',     ctx: ['汽車電瓶裡的稀硫酸'], pctMax: 35 }
  ];
  // 市售濃溶液（課本常見數據）
  const CONC_STOCK = [
    { s: 'H2SO4', p: 98,   d: 1.84, ctx: '實驗室的濃硫酸' },
    { s: 'HCl',   p: 36.5, d: 1.18, ctx: '市售的濃鹽酸' },
    { s: 'HNO3',  p: 63,   d: 1.40, ctx: '市售的濃硝酸' },
    { s: 'NaOH',  p: 50,   d: 1.52, ctx: '工業用的氫氧化鈉濃溶液' }
  ];
  // ppm 情境
  const PPM_MASS = [
    { s: 'NaF',   ctx: '牙膏檢驗', host: '含氟牙膏', ppm: [800, 2500], host_g: [50, 200] },
    { s: 'CaCO3', ctx: '土壤檢測', host: '土壤樣本', ppm: [200, 5000], host_g: [20, 500] }
  ];
  const PPM_VOL = [
    { s: 'O2',    ctx: '魚缸水質檢測', what: '溶解的氧氣', ppm: [4, 10] },
    { s: 'CaCO3', ctx: '自來水硬度檢測', what: '碳酸鈣', ppm: [50, 300] },
    { s: 'NaCl',  ctx: '河口水樣檢測', what: '氯化鈉', ppm: [100, 800] }
  ];

  /* ---------- 小工具 ---------- */
  const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const supText = n => String(n).split('').map(ch => SUP[ch]).join('');
  const fHTML = f => f.replace(/(\d+)/g, '<sub>$1</sub>');
  const fText = f => f.replace(/\d/g, d => SUB_DIGITS[d]);
  const molarMass = id => Object.entries(SUBS[id].atoms).reduce((s, [el, k]) => s + ATOMIC[el] * k, 0);
  const trimNum = x => String(Math.round(x * 1000) / 1000);
  const totalAtoms = id => Object.values(SUBS[id].atoms).reduce((a, b) => a + b, 0);

  function molarMassLine(id) {
    const parts = Object.entries(SUBS[id].atoms).map(([el, k]) => `${trimNum(ATOMIC[el])}×${k}`);
    return `M(${fText(SUBS[id].f)}) = ${parts.join(' + ')} = ${trimNum(molarMass(id))} g/mol`;
  }

  // 科學記號：回傳 {m, e}，係數四捨五入到小數第二位
  function sci(v) {
    let e = Math.floor(Math.log10(Math.abs(v)));
    let m = Math.round(v / 10 ** e * 100) / 100;
    if (m >= 10) { m = m / 10; e += 1; }
    return { m, e };
  }
  const sciText = v => { const { m, e } = sci(v); return `${m.toFixed(2)}×10${supText(e)}`; };
  const sciHTML = v => { const { m, e } = sci(v); return `${m.toFixed(2)} × 10<sup>${e}</sup>`; };
  const fix2 = v => (Math.round(v * 100) / 100).toFixed(2);
  // 中間步驟「算到小數第二位」：一般數字四捨五入到小數第二位，科學記號係數四捨五入到小數第二位
  const r2 = x => Math.round(x * 100) / 100;
  const sciR = v => { const { m, e } = sci(v); return m * 10 ** e; };

  /* ---------- 固定亂數 ---------- */
  function hash(str) {
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
  function rngFrom(str) {
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
  const between = (rng, lo, hi, dec) => { const f = 10 ** dec; return Math.round((lo + rng() * (hi - lo)) * f) / f; };
  // 給定的質量：小於 10 g 給兩位小數、其餘一位小數
  const massGiven = x => x < 10 ? Math.round(x * 100) / 100 : Math.round(x * 10) / 10;
  const massStr = x => x < 10 ? x.toFixed(2) : x.toFixed(1);
  // 給定的分子數（科學記號、係數兩位小數）
  const countGiven = v => { const { m, e } = sci(v); return { v: m * 10 ** e, html: `${m.toFixed(2)} × 10<sup>${e}</sup>`, text: `${m.toFixed(2)}×10${supText(e)}` }; };

  /* ---------- 題型 ---------- */
  // 每個題型回傳：{ type, html, route, kind:'plain'|'sci', unit, ans, steps, els }
  // route：換算地圖上要走的節點（atom 原子數、molecule 分子數、mol、g、CM、pct、ppm）
  const generalSubs = () => Object.keys(SUBS).filter(k => SUBS[k].general);
  const molecularSubs = () => Object.keys(SUBS).filter(k => SUBS[k].general && SUBS[k].molecular);
  const els = id => Object.keys(SUBS[id].atoms);
  const nameF = id => `${SUBS[id].name}（${fHTML(SUBS[id].f)}）`;
  const VOLS = [100, 200, 250, 500, 1000];
  const pickVol = rng => rng() < 0.6 ? pick(rng, VOLS) : Math.round(between(rng, 100, 2000, 0) / 10) * 10;
  // 讓溶質莫耳數至少 0.2 mol，中間步驟四捨五入到小數第二位才不會失真
  const pickCM = (rng, V) => { const lo = Math.max(0.1, 200 / V); return between(rng, lo, Math.max(3, lo + 1), 2); };

  const TYPES = {
    /* ⭐ 基礎 */
    g2mol(rng) {
      const id = pick(rng, generalSubs()), M = molarMass(id);
      const w = massGiven(between(rng, 0.1, 5, 2) * M);
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${massStr(w)} g 的${nameF(id)}，相當於多少莫耳？`,
        route: ['g', 'mol'], kind: 'plain', unit: 'mol', ans: w / M, els: els(id),
        steps: [molarMassLine(id), `n = ${massStr(w)} ÷ ${trimNum(M)} = ${fix2(w / M)} mol`] };
    },
    mol2g(rng) {
      const id = pick(rng, generalSubs()), M = molarMass(id);
      const n = between(rng, 0.1, 5, 2);
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${n.toFixed(2)} mol 的${nameF(id)}，質量是多少公克？`,
        route: ['mol', 'g'], kind: 'plain', unit: 'g', ans: n * M, els: els(id),
        steps: [molarMassLine(id), `W = ${n.toFixed(2)} × ${trimNum(M)} = ${fix2(n * M)} g`] };
    },
    mol2N(rng) {
      const id = pick(rng, molecularSubs());
      const n = between(rng, 0.1, 5, 2);
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${n.toFixed(2)} mol 的${nameF(id)}，共有多少個${SUBS[id].name}分子？`,
        route: ['mol', 'molecule'], kind: 'sci', unit: '個', ans: n * CONFIG.NA, els: [],
        steps: [`分子數 = ${n.toFixed(2)} × ${CONFIG.NA_TEXT} = ${sciText(n * CONFIG.NA)} 個`] };
    },
    N2mol(rng) {
      const id = pick(rng, molecularSubs());
      const N = countGiven(between(rng, 0.1, 5, 2) * CONFIG.NA);
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${N.html} 個${SUBS[id].name}分子（${fHTML(SUBS[id].f)}），相當於多少莫耳？`,
        route: ['molecule', 'mol'], kind: 'plain', unit: 'mol', ans: N.v / CONFIG.NA, els: [],
        steps: [`n = ${N.text} ÷ ${CONFIG.NA_TEXT} = ${fix2(N.v / CONFIG.NA)} mol`] };
    },

    /* ⭐⭐ 進階 */
    g2N(rng) {
      const id = pick(rng, molecularSubs()), M = molarMass(id);
      const w = massGiven(between(rng, 0.1, 5, 2) * M);
      const n = r2(w / M), N = n * CONFIG.NA;
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${massStr(w)} g 的${nameF(id)}，共有多少個${SUBS[id].name}分子？`,
        route: ['g', 'mol', 'molecule'], kind: 'sci', unit: '個', ans: N, alt: w / M * CONFIG.NA, els: els(id),
        steps: [molarMassLine(id), `n = ${massStr(w)} ÷ ${trimNum(M)} = ${fix2(n)} mol`, `分子數 = ${fix2(n)} × ${CONFIG.NA_TEXT} = ${sciText(N)} 個`] };
    },
    N2g(rng) {
      const id = pick(rng, molecularSubs()), M = molarMass(id);
      const N = countGiven(between(rng, 0.1, 5, 2) * CONFIG.NA);
      const n = r2(N.v / CONFIG.NA);
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${N.html} 個${SUBS[id].name}分子（${fHTML(SUBS[id].f)}），質量是多少公克？`,
        route: ['molecule', 'mol', 'g'], kind: 'plain', unit: 'g', ans: n * M, alt: N.v / CONFIG.NA * M, els: els(id),
        steps: [molarMassLine(id), `n = ${N.text} ÷ ${CONFIG.NA_TEXT} = ${fix2(n)} mol`, `W = ${fix2(n)} × ${trimNum(M)} = ${fix2(n * M)} g`] };
    },
    mol2atoms(rng) {
      const id = pick(rng, molecularSubs().filter(k => totalAtoms(k) > 1));
      const n = between(rng, 0.1, 5, 2), k = totalAtoms(id), A = sciR(n * CONFIG.NA) * k;
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${n.toFixed(2)} mol 的${nameF(id)}，總共含有多少個原子？`,
        route: ['mol', 'molecule', 'atom'], kind: 'sci', unit: '個', ans: A, alt: n * CONFIG.NA * k, els: [],
        steps: [`每個 ${fText(SUBS[id].f)} 分子含 ${k} 個原子`, `分子數 = ${n.toFixed(2)} × ${CONFIG.NA_TEXT} = ${sciText(n * CONFIG.NA)}`, `原子數 = ${sciText(n * CONFIG.NA)} × ${k} = ${sciText(A)} 個`] };
    },

    /* ⭐⭐⭐ 挑戰：溶液濃度 */
    g2CM(rng) {
      const so = pick(rng, SOLUTES), id = so.s, M = molarMass(id);
      const V = pickVol(rng), CM0 = pickCM(rng, V);
      const w = massGiven(CM0 * V / 1000 * M), n = r2(w / M), CM = n / (V / 1000), alt = w / M / (V / 1000);
      return { html: `${pick(rng, so.ctx)}：將 ${massStr(w)} g 的${nameF(id)}溶於水，配成 ${V} mL 的溶液，其體積莫耳濃度（C<sub>M</sub>）為多少 M？`,
        route: ['g', 'mol', 'CM'], kind: 'plain', unit: 'M', ans: CM, alt, els: els(id),
        steps: [molarMassLine(id), `n = ${massStr(w)} ÷ ${trimNum(M)} = ${fix2(n)} mol`, `C_M = ${fix2(n)} ÷ ${V / 1000} L = ${fix2(CM)} M`] };
    },
    CM2g(rng) {
      const so = pick(rng, SOLUTES), id = so.s, M = molarMass(id);
      const V = pickVol(rng), CM = pickCM(rng, V);
      const n = r2(CM * V / 1000);
      return { html: `${pick(rng, so.ctx)}：要配製 ${V} mL、${CM.toFixed(2)} M 的${nameF(id)}溶液，需要秤取多少公克的${SUBS[id].name}？`,
        route: ['CM', 'mol', 'g'], kind: 'plain', unit: 'g', ans: n * M, alt: CM * V / 1000 * M, els: els(id),
        steps: [molarMassLine(id), `n = ${CM.toFixed(2)} × ${V / 1000} L = ${fix2(n)} mol`, `W = ${fix2(n)} × ${trimNum(M)} = ${fix2(n * M)} g`] };
    },
    g2pct(rng) {
      const so = pick(rng, SOLUTES), id = so.s;
      const total = between(rng, 50, 1000, 0), p0 = between(rng, 1, so.pctMax, 1);
      const w1 = massGiven(total * p0 / 100), w2 = Math.round((total - w1) * 10) / 10;
      const p = w1 / (w1 + w2) * 100;
      return { html: `${pick(rng, so.ctx)}：將 ${massStr(w1)} g 的${nameF(id)}溶於 ${w2.toFixed(1)} g 的水中，此溶液的重量百分率濃度為多少 %？`,
        route: ['g', 'pct'], kind: 'plain', unit: '%', ans: p, els: [],
        steps: [`溶液質量 = ${massStr(w1)} + ${w2.toFixed(1)} = ${trimNum(w1 + w2)} g`, `重量百分率 = ${massStr(w1)} ÷ ${trimNum(w1 + w2)} × 100% = ${fix2(p)} %`] };
    },
    pct2g(rng) {
      const so = pick(rng, SOLUTES), id = so.s;
      const m = between(rng, 50, 1000, 0), p = between(rng, 1, so.pctMax, 1);
      return { html: `${pick(rng, so.ctx)}：${m} g、重量百分率 ${p.toFixed(1)}% 的${nameF(id)}溶液中，含有多少公克的${SUBS[id].name}？`,
        route: ['pct', 'g'], kind: 'plain', unit: 'g', ans: m * p / 100, els: [],
        steps: [`溶質質量 = ${m} × ${p.toFixed(1)}% = ${fix2(m * p / 100)} g`] };
    },
    ppmMass(rng) {
      const c = pick(rng, PPM_MASS), id = c.s;
      const host = between(rng, c.host_g[0], c.host_g[1], 0), ppm0 = between(rng, c.ppm[0], c.ppm[1], 0);
      const mg = Math.round(ppm0 * host / 1000 * 10) / 10, ppm = mg / 1000 / host * 1e6;
      return { html: `${c.ctx}：${host} g 的${c.host}中含有 ${mg.toFixed(1)} mg 的${nameF(id)}，${SUBS[id].name}的濃度為多少 ppm？<span class="note">（ppm 以質量計算：溶質質量 ÷ 溶液質量 × 10<sup>6</sup>）</span>`,
        route: ['g', 'ppm'], kind: 'plain', unit: 'ppm', ans: ppm, els: [],
        steps: [`${mg.toFixed(1)} mg = ${trimNum(mg / 1000)} g`, `ppm = ${trimNum(mg / 1000)} ÷ ${host} × 10⁶ = ${fix2(ppm)} ppm`] };
    },
    ppmVol(rng) {
      const c = pick(rng, PPM_VOL), id = c.s;
      const V = pickVol(rng), ppm0 = between(rng, c.ppm[0], c.ppm[1], 1);
      const mg = Math.round(ppm0 * V / 1000 * 100) / 100, ppm = mg / (V / 1000);
      return { html: `${c.ctx}：${V} mL 的水樣中含有 ${mg.toFixed(2)} mg 的${c.what}（${fHTML(SUBS[id].f)}），濃度為多少 ppm？<span class="note">（稀薄水溶液：1 ppm = 1 mg/L）</span>`,
        route: ['g', 'ppm'], kind: 'plain', unit: 'ppm', ans: ppm, els: [],
        steps: [`${V} mL = ${V / 1000} L`, `ppm = ${mg.toFixed(2)} mg ÷ ${V / 1000} L = ${fix2(ppm)} ppm`] };
    },
    ppm2mg(rng) {
      const c = pick(rng, PPM_VOL), id = c.s;
      const V = pickVol(rng), ppm = between(rng, c.ppm[0], c.ppm[1], 1);
      return { html: `${c.ctx}：水樣中${c.what}（${fHTML(SUBS[id].f)}）的濃度為 ${ppm.toFixed(1)} ppm，${V} mL 的水樣中含有多少 mg？<span class="note">（稀薄水溶液：1 ppm = 1 mg/L）</span>`,
        route: ['ppm', 'g'], kind: 'plain', unit: 'mg', ans: ppm * V / 1000, els: [],
        steps: [`${V} mL = ${V / 1000} L`, `質量 = ${ppm.toFixed(1)} mg/L × ${V / 1000} L = ${fix2(ppm * V / 1000)} mg`] };
    },

    /* ⭐⭐⭐⭐ 魔王 */
    pct2CM(rng) {
      let id, p, d, ctx;
      if (rng() < 0.5) { const c = pick(rng, CONC_STOCK); id = c.s; p = c.p; d = c.d; ctx = c.ctx; }
      else { const so = pick(rng, SOLUTES); id = so.s; p = between(rng, 5, so.pctMax, 1); d = Math.round((1 + p / 100 * 0.75) * 100) / 100; ctx = pick(rng, so.ctx); }
      const M = molarMass(id), mass = 1000 * d, solute = r2(mass * p / 100), n = r2(solute / M);
      return { html: `${ctx}：${nameF(id)}溶液的重量百分率為 ${trimNum(p)}%、密度為 ${d.toFixed(2)} g/mL，其體積莫耳濃度（C<sub>M</sub>）為多少 M？`,
        route: ['pct', 'g', 'mol', 'CM'], kind: 'plain', unit: 'M', ans: n, alt: mass * p / 100 / M, els: els(id),
        steps: [molarMassLine(id), `取 1 L（1000 mL）溶液：質量 = 1000 × ${d.toFixed(2)} = ${trimNum(mass)} g`,
          `溶質質量 = ${trimNum(mass)} × ${trimNum(p)}% = ${fix2(solute)} g`, `n = ${fix2(solute)} ÷ ${trimNum(M)} = ${fix2(n)} mol，C_M = ${fix2(n)} M`] };
    },
    CM2pct(rng) {
      const so = pick(rng, SOLUTES), id = so.s, M = molarMass(id);
      let CM = between(rng, 0.5, 5, 2);
      while (CM * M / 10 > so.pctMax) CM = Math.round(CM / 2 * 100) / 100;
      const pApprox = CM * M / 10, d = Math.round((1 + pApprox / 100 * 0.75) * 100) / 100;
      const solute = r2(CM * M), mass = 1000 * d, p = solute / mass * 100;
      return { html: `${pick(rng, so.ctx)}：${nameF(id)}溶液的濃度為 ${CM.toFixed(2)} M、密度為 ${d.toFixed(2)} g/mL，其重量百分率濃度為多少 %？`,
        route: ['CM', 'mol', 'g', 'pct'], kind: 'plain', unit: '%', ans: p, els: els(id),
        steps: [molarMassLine(id), `取 1 L 溶液：溶質 ${CM.toFixed(2)} mol × ${trimNum(M)} = ${fix2(solute)} g`,
          `溶液質量 = 1000 × ${d.toFixed(2)} = ${trimNum(mass)} g`, `重量百分率 = ${fix2(solute)} ÷ ${trimNum(mass)} × 100% = ${fix2(p)} %`] };
    },
    g2atomsEl(rng) {
      const id = pick(rng, molecularSubs()), M = molarMass(id);
      const el = pick(rng, els(id)), k = SUBS[id].atoms[el];
      const w = massGiven(between(rng, 0.1, 5, 2) * M), n = r2(w / M), A = sciR(n * CONFIG.NA) * k;
      return { html: `${pick(rng, SUBS[id].scenes)}中含有 ${massStr(w)} g 的${nameF(id)}，其中共有多少個${ELEMENT_NAME[el]}原子（${el}）？`,
        route: ['g', 'mol', 'molecule', 'atom'], kind: 'sci', unit: '個', ans: A, alt: w / M * CONFIG.NA * k, els: els(id),
        steps: [molarMassLine(id), `n = ${massStr(w)} ÷ ${trimNum(M)} = ${fix2(n)} mol`, `分子數 = ${fix2(n)} × ${CONFIG.NA_TEXT} = ${sciText(n * CONFIG.NA)}`,
          `每個分子含 ${k} 個 ${el}：${el} 原子數 = ${sciText(n * CONFIG.NA)} × ${k} = ${sciText(A)} 個`] };
    },
    atomsEl2g(rng) {
      const id = pick(rng, molecularSubs()), M = molarMass(id);
      const el = pick(rng, els(id)), k = SUBS[id].atoms[el];
      const A = countGiven(between(rng, 0.1, 5, 2) * CONFIG.NA * k);
      const N = sciR(A.v / k), n = r2(N / CONFIG.NA);
      return { html: `${pick(rng, SUBS[id].scenes)}中的${nameF(id)}共含有 ${A.html} 個${ELEMENT_NAME[el]}原子（${el}），這些${SUBS[id].name}的質量是多少公克？`,
        route: ['atom', 'molecule', 'mol', 'g'], kind: 'plain', unit: 'g', ans: n * M, alt: A.v / k / CONFIG.NA * M, els: els(id),
        steps: [molarMassLine(id), `每個分子含 ${k} 個 ${el}：分子數 = ${A.text} ÷ ${k} = ${sciText(N)}`,
          `n = ${sciText(N)} ÷ ${CONFIG.NA_TEXT} = ${fix2(n)} mol`, `W = ${fix2(n)} × ${trimNum(M)} = ${fix2(n * M)} g`] };
    },
    densityCM(rng) {
      const so = pick(rng, SOLUTES), id = so.s, M = molarMass(id);
      const w2 = between(rng, 250, 500, 0), CM0 = between(rng, 0.2, 2.5, 2), pmax = Math.min(so.pctMax, 25);
      const w1 = massGiven(Math.min(Math.max(CM0 * w2 / 1000 * M, 0.2 * M), w2 * pmax / (100 - pmax)));
      const total = w1 + w2, p = w1 / total * 100, d = Math.round((1 + p / 100 * 0.75) * 100) / 100;
      const V = r2(total / d), n = r2(w1 / M), CM = n / (V / 1000), alt = w1 / M / (total / d / 1000);
      return { html: `${pick(rng, so.ctx)}：將 ${massStr(w1)} g 的${nameF(id)}溶於 ${w2} g 的水中，所得溶液的密度為 ${d.toFixed(2)} g/mL，其體積莫耳濃度（C<sub>M</sub>）為多少 M？`,
        route: ['g', 'mol', 'CM'], kind: 'plain', unit: 'M', ans: CM, alt, els: els(id),
        steps: [molarMassLine(id), `n = ${massStr(w1)} ÷ ${trimNum(M)} = ${fix2(n)} mol`,
          `溶液體積 = (${massStr(w1)} + ${w2}) ÷ ${d.toFixed(2)} = ${fix2(V)} mL`, `C_M = ${fix2(n)} ÷ ${trimNum(V / 1000)} L = ${fix2(CM)} M`] };
    }
  };
  const LEVEL_TYPES = [
    ['g2mol', 'mol2g', 'mol2N', 'N2mol'],
    ['g2N', 'N2g', 'mol2atoms'],
    ['g2CM', 'CM2g', 'g2pct', 'pct2g', 'ppmMass', 'ppmVol', 'ppm2mg'],
    ['pct2CM', 'CM2pct', 'g2atomsEl', 'atomsEl2g', 'densityCM']
  ];

  /* ---------- 題組碼 ---------- */
  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const DISTS = [];
  for (let x = 0; x <= 5; x++) for (let y = 0; y <= 5 - x; y++) for (let z = 0; z <= 5 - x - y; z++)
    DISTS.push([x, y, z, 5 - x - y - z]);
  const ROUNDS = 32 ** 4;
  // 檢查碼的 salt 同時記錄「地圖是否顯示換算公式」：CODE_SALT＝顯示（舊題組碼都是這種）、CODE_SALT+1＝不顯示
  const checksum = (vals, salt) => (vals.reduce((s, v, i) => s + (i + 1) * v, 0) + salt) % 32;

  function makeCode({ dist, instant, hint, formula = true, round }) {
    const di = DISTS.findIndex(d => d.join() === dist.join());
    if (di < 0) throw new Error('難度分配加總必須是 5');
    if (round === undefined) round = Math.floor(Math.random() * ROUNDS);
    let P = (round * DISTS.length + di) * 4 + (instant ? 1 : 0) + (hint ? 2 : 0);
    const vals = [];
    for (let i = 0; i < 6; i++) { vals.unshift(P % 32); P = Math.floor(P / 32); }
    vals.push(checksum(vals, CONFIG.CODE_SALT + (formula ? 0 : 1)));
    return vals.map(v => ALPHA[v]).join('');
  }
  const normalizeCode = str => String(str || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  function parseCode(str) {
    const code = normalizeCode(str);
    if (code.length !== 7) return null;
    const vals = [...code].map(ch => ALPHA.indexOf(ch));
    if (vals.some(v => v < 0)) return null;
    let formula;
    if (checksum(vals.slice(0, 6), CONFIG.CODE_SALT) === vals[6]) formula = true;
    else if (checksum(vals.slice(0, 6), CONFIG.CODE_SALT + 1) === vals[6]) formula = false;
    else return null;
    let P = 0;
    for (let i = 0; i < 6; i++) P = P * 32 + vals[i];
    const flags = P % 4; P = Math.floor(P / 4);
    return { code, round: Math.floor(P / DISTS.length), dist: DISTS[P % DISTS.length].slice(), instant: !!(flags & 1), hint: !!(flags & 2), formula };
  }
  const prettyCode = code => code.slice(0, 3) + '-' + code.slice(3);

  /* ---------- 出題 ---------- */
  function generate(parsed, seedStr) {
    const rng = rngFrom(parsed.code + '|' + seedStr);
    const qs = [], usedTypes = new Set(), usedHtml = new Set();
    parsed.dist.forEach((count, lv) => {
      for (let i = 0; i < count; i++) {
        let q, tries = 0;
        do {
          const pool = LEVEL_TYPES[lv];
          const fresh = pool.filter(t => !usedTypes.has(t));
          const type = pick(rng, fresh.length ? fresh : pool);
          q = { level: lv, type, ...TYPES[type](rng) };
          tries++;
        } while (usedHtml.has(q.html) && tries < 20);
        usedTypes.add(q.type); usedHtml.add(q.html); qs.push(q);
      }
    });
    return qs;
  }
  function toHalf(s) {
    return String(s).replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ');
  }
  const normalizeClass = s => toHalf(String(s || '')).trim().toUpperCase();
  const forStudent = (parsed, cls, seat) => generate(parsed, `S|${normalizeClass(cls)}|${Number(seat)}`);

  /* ---------- 顯示 ---------- */
  const htmlToText = html => html
    .replace(/<sub>(\d+)<\/sub>/g, (_, d) => d.replace(/\d/g, x => SUB_DIGITS[x]))
    .replace(/<sup>(-?\d+)<\/sup>/g, (_, d) => supText(d))
    .replace(/<[^>]+>/g, '');
  const qText = q => htmlToText(q.html);
  const ansText = q => q.kind === 'sci' ? `${sciText(q.ans)} ${q.unit}` : `${fix2(q.ans)} ${q.unit}`;
  const ansHTML = q => q.kind === 'sci' ? `${sciHTML(q.ans)} ${q.unit}` : `${fix2(q.ans)} ${q.unit}`;
  function atomicHTML(q) {
    if (!q.els.length) return '';
    return q.els.map(el => `${el} = ${trimNum(ATOMIC[el])}`).join('　');
  }

  /* ---------- 答案（字串格式：一般 "0.50"；科學記號 "3.01e23"） ---------- */
  function parseAnswer(str) {
    const s = toHalf(str).replace(/\s+/g, '').replace(/[×xX]10\^?/, 'e');
    if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
    return Number(s);
  }
  // 中間步驟有沒有四捨五入，兩種算法的答案都接受（各自允許 ±1%）
  function closeTo(q, v, target) {
    const diff = Math.abs(v - target);
    if (q.kind === 'sci') return diff <= Math.abs(target) * Math.max(CONFIG.TOLERANCE, 0.0105 / sci(target).m);
    return diff <= Math.max(Math.abs(target) * CONFIG.TOLERANCE, 0.0105);
  }
  function isCorrect(q, str) {
    const v = parseAnswer(str);
    if (v === null || !isFinite(v)) return false;
    return closeTo(q, v, q.ans) || (q.alt !== undefined && closeTo(q, v, q.alt));
  }
  function formatAnswerStr(str) {
    const s = String(str || '').trim();
    const m = /^(.*)e(-?\d+)$/i.exec(s);
    return m ? `${m[1]}×10${supText(m[2])}` : s;
  }

  /* ---------- 換算地圖 ---------- */
  // 直式版面：手機上也看得清楚
  const NODES = {
    atom:     { x: 100, y: 36,  label: '原子數' },
    molecule: { x: 100, y: 126, label: '分子數' },
    mol:      { x: 100, y: 216, label: '莫耳數 mol' },
    g:        { x: 100, y: 306, label: '質量 g' },
    CM:       { x: 340, y: 216, label: '體積莫耳濃度 CM' },
    pct:      { x: 340, y: 306, label: '重量百分率 %' },
    ppm:      { x: 340, y: 396, label: 'ppm' }
  };
  // [起點, 終點, 說明, 說明位置 x, y, 對齊]
  const EDGES = [
    ['atom', 'molecule', '× / ÷ 每分子原子數', 112, 86, 'start'],
    ['molecule', 'mol', '× / ÷ 6.02×10²³', 112, 176, 'start'],
    ['mol', 'g', '× / ÷ 分子量 M', 112, 266, 'start'],
    ['mol', 'CM', '溶液體積 V(L)', 220, 206, 'middle'],
    ['g', 'pct', '溶液質量 ×100%', 220, 296, 'middle'],
    ['CM', 'pct', '密度', 352, 266, 'start'],
    ['g', 'ppm', '溶液質量 ×10⁶', 200, 384, 'middle']
  ];
  const edgeKey = (a, b) => [a, b].sort().join('-');
  // showFormula=false：只畫單位方塊和連線，不顯示「× 分子量 M」這類換算公式
  function mapSVG(route, showFormula = true) {
    const on = new Set(route || []);
    const onEdges = new Set();
    (route || []).forEach((n, i) => { if (i) onEdges.add(edgeKey(route[i - 1], n)); });
    const W = 130, H = 42;
    const lines = EDGES.map(([a, b, lab, lx, ly, anchor]) => {
      const A = NODES[a], B = NODES[b];
      return `<g class="edge${onEdges.has(edgeKey(a, b)) ? ' on' : ''}"><line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>
        ${showFormula ? `<text x="${lx}" y="${ly}" text-anchor="${anchor}">${lab}</text>` : ''}</g>`;
    }).join('');
    const nodes = Object.entries(NODES).map(([k, n]) => `<g class="node${on.has(k) ? ' on' : ''}">
      <rect x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" rx="10"/>
      <text x="${n.x}" y="${n.y + 5}" text-anchor="middle">${n.label}</text></g>`).join('');
    return `<svg class="umap" viewBox="20 8 400 412" role="img" aria-label="單位換算地圖">${lines}${nodes}</svg>`;
  }
  const routeText = route => route.map(k => NODES[k].label).join(' → ');

  /* ---------- Firebase ---------- */
  const studentId = (cls, seat) => `${normalizeClass(cls)}_${Number(seat)}`.replace(/[.$#\[\]\/\x00-\x1F\x7F]/g, '_');
  const recordUrl = (code, sid) => `${CONFIG.FIREBASE_URL}/${CONFIG.DB_PATH}/${code}/${encodeURIComponent(sid)}.json`;
  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }
  const fetchRecord = (code, sid) => getJSON(recordUrl(code, sid));
  const fetchAll = async code => (await getJSON(`${CONFIG.FIREBASE_URL}/${CONFIG.DB_PATH}/${code}.json`)) || {};
  async function saveRecord(code, sid, rec) {
    const res = await fetch(recordUrl(code, sid), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }
  function toArray(v, n, fill) {
    const out = Array(n).fill(fill);
    if (Array.isArray(v)) v.forEach((x, i) => { if (i < n && x !== null && x !== undefined) out[i] = x; });
    else if (v && typeof v === 'object') Object.entries(v).forEach(([i, x]) => { if (+i < n) out[+i] = x; });
    return out;
  }
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return {
    CONFIG, LEVELS, ATOMIC, SUBS, TYPES, LEVEL_TYPES, DISTS,
    makeCode, parseCode, normalizeCode, prettyCode,
    generate, forStudent, normalizeClass,
    qText, ansText, ansHTML, atomicHTML, sci, fix2,
    parseAnswer, isCorrect, formatAnswerStr,
    mapSVG, routeText,
    studentId, fetchRecord, fetchAll, saveRecord, toArray, escapeHtml
  };
})();
