/* =========================================================
   隱秘的鍵結社 —— 化學資料庫（元素 1～36、離子、化學式、命名）
   ---------------------------------------------------------
   ・元素：原子序 1～36（採礦國能開採的範圍）
   ・離子：主族常見離子＋過渡金屬「常見氧化態」＋常見多原子離子（老師決定 2026-10-14）
   ・化學式：依電荷求最簡整數比；多原子離子個數大於 1 時加括號
   ・命名：台灣高中用法（陰離子在前＋陽離子在後；低價態加「亞」）
   ========================================================= */
const CHEM = (() => {
  // [Z, 符號, 中文, 週期, 族, 類別]  類別：m 金屬、n 非金屬、s 類金屬、g 惰性氣體
  const RAW = [
    [1, 'H', '氫', 1, 1, 'n'], [2, 'He', '氦', 1, 18, 'g'],
    [3, 'Li', '鋰', 2, 1, 'm'], [4, 'Be', '鈹', 2, 2, 'm'], [5, 'B', '硼', 2, 13, 's'], [6, 'C', '碳', 2, 14, 'n'],
    [7, 'N', '氮', 2, 15, 'n'], [8, 'O', '氧', 2, 16, 'n'], [9, 'F', '氟', 2, 17, 'n'], [10, 'Ne', '氖', 2, 18, 'g'],
    [11, 'Na', '鈉', 3, 1, 'm'], [12, 'Mg', '鎂', 3, 2, 'm'], [13, 'Al', '鋁', 3, 13, 'm'], [14, 'Si', '矽', 3, 14, 's'],
    [15, 'P', '磷', 3, 15, 'n'], [16, 'S', '硫', 3, 16, 'n'], [17, 'Cl', '氯', 3, 17, 'n'], [18, 'Ar', '氬', 3, 18, 'g'],
    [19, 'K', '鉀', 4, 1, 'm'], [20, 'Ca', '鈣', 4, 2, 'm'], [21, 'Sc', '鈧', 4, 3, 'm'], [22, 'Ti', '鈦', 4, 4, 'm'],
    [23, 'V', '釩', 4, 5, 'm'], [24, 'Cr', '鉻', 4, 6, 'm'], [25, 'Mn', '錳', 4, 7, 'm'], [26, 'Fe', '鐵', 4, 8, 'm'],
    [27, 'Co', '鈷', 4, 9, 'm'], [28, 'Ni', '鎳', 4, 10, 'm'], [29, 'Cu', '銅', 4, 11, 'm'], [30, 'Zn', '鋅', 4, 12, 'm'],
    [31, 'Ga', '鎵', 4, 13, 'm'], [32, 'Ge', '鍺', 4, 14, 's'], [33, 'As', '砷', 4, 15, 's'], [34, 'Se', '硒', 4, 16, 'n'],
    [35, 'Br', '溴', 4, 17, 'n'], [36, 'Kr', '氪', 4, 18, 'g']
  ];
  const TYPE = { m: '金屬', n: '非金屬', s: '類金屬', g: '惰性氣體' };
  // 價電子：主族才有意義（過渡金屬不出這類線索）
  const valence = (g, z) => (z === 2 ? 2 : g <= 2 ? g : g >= 13 ? g - 10 : null);
  const ELEMENTS = RAW.map(([z, sym, zh, period, group, t]) => ({ z, sym, zh, period, group, type: t, typeZh: TYPE[t], val: valence(group, z), trans: group >= 3 && group <= 12 }));
  const EL = Object.fromEntries(ELEMENTS.map(e => [e.sym, e]));

  // 價格：常見便宜、過渡金屬貴一點、惰性氣體最貴（很難拿來用）
  const COMMON = ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu'];
  const price = sym => (COMMON.includes(sym) ? 5 : EL[sym].type === 'g' ? 12 : EL[sym].trans ? 9 : 7);

  /* ---------- 離子 ----------
     id：唯一代號；f：化學式（多原子用括號判斷）；q：電荷；zh：命名用的中文；els：組成元素（鑄造要消耗的原料） */
  const CATIONS = [
    { id: 'Li', f: 'Li', q: 1, zh: '鋰', els: ['Li'] }, { id: 'Na', f: 'Na', q: 1, zh: '鈉', els: ['Na'] }, { id: 'K', f: 'K', q: 1, zh: '鉀', els: ['K'] },
    { id: 'Mg', f: 'Mg', q: 2, zh: '鎂', els: ['Mg'] }, { id: 'Ca', f: 'Ca', q: 2, zh: '鈣', els: ['Ca'] }, { id: 'Al', f: 'Al', q: 3, zh: '鋁', els: ['Al'] },
    { id: 'Zn', f: 'Zn', q: 2, zh: '鋅', els: ['Zn'], tm: true },
    { id: 'Fe2', f: 'Fe', q: 2, zh: '亞鐵', els: ['Fe'], tm: true }, { id: 'Fe3', f: 'Fe', q: 3, zh: '鐵', els: ['Fe'], tm: true },
    { id: 'Cu1', f: 'Cu', q: 1, zh: '亞銅', els: ['Cu'], tm: true }, { id: 'Cu2', f: 'Cu', q: 2, zh: '銅', els: ['Cu'], tm: true },
    { id: 'Mn', f: 'Mn', q: 2, zh: '錳', els: ['Mn'], tm: true }, { id: 'Ni', f: 'Ni', q: 2, zh: '鎳', els: ['Ni'], tm: true },
    { id: 'NH4', f: 'NH4', q: 1, zh: '銨', els: ['N', 'H'], poly: true }
  ];
  const ANIONS = [
    { id: 'F', f: 'F', q: -1, zh: '氟化', els: ['F'] }, { id: 'Cl', f: 'Cl', q: -1, zh: '氯化', els: ['Cl'] }, { id: 'Br', f: 'Br', q: -1, zh: '溴化', els: ['Br'] },
    { id: 'O', f: 'O', q: -2, zh: '氧化', els: ['O'] }, { id: 'S', f: 'S', q: -2, zh: '硫化', els: ['S'] }, { id: 'N', f: 'N', q: -3, zh: '氮化', els: ['N'] },
    { id: 'OH', f: 'OH', q: -1, zh: '氫氧化', els: ['O', 'H'], poly: true }, { id: 'NO3', f: 'NO3', q: -1, zh: '硝酸', els: ['N', 'O'], poly: true },
    { id: 'SO4', f: 'SO4', q: -2, zh: '硫酸', els: ['S', 'O'], poly: true }, { id: 'CO3', f: 'CO3', q: -2, zh: '碳酸', els: ['C', 'O'], poly: true },
    { id: 'PO4', f: 'PO4', q: -3, zh: '磷酸', els: ['P', 'O'], poly: true }
  ];
  const CAT = Object.fromEntries(CATIONS.map(c => [c.id, c])), AN = Object.fromEntries(ANIONS.map(a => [a.id, a]));

  // 不常見或高一不談的組合排除掉
  function allowed(c, a) {
    if (c.id === 'NH4' && ['O', 'S', 'N', 'OH', 'F'].includes(a.id)) return false;
    if (a.id === 'N' && !['Li', 'Mg', 'Ca'].includes(c.id)) return false;           // 氮化物只出 Li3N、Mg3N2、Ca3N2
    if (c.id === 'Cu1' && !['Cl', 'O', 'S'].includes(a.id)) return false;            // 亞銅只出 CuCl、Cu2O、Cu2S
    if (['Fe2', 'Fe3', 'Mn', 'Ni', 'Cu1'].includes(c.id) && ['F', 'Br'].includes(a.id)) return false;
    if (a.id === 'PO4' && !['Na', 'K', 'Mg', 'Ca', 'Al', 'NH4', 'Fe3', 'Zn'].includes(c.id)) return false;
    if (a.id === 'CO3' && ['Al', 'Fe3'].includes(c.id)) return false;              // Al2(CO3)3、Fe2(CO3)3 不穩定
    if (a.id === 'S' && ['Al', 'Fe3'].includes(c.id)) return false;
    return true;
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // 依電荷求最簡整數比
  function ratio(c, a) { const qa = -a.q, g = gcd(c.q, qa); return [qa / g, c.q / g]; }
  const part = (ion, n) => (n === 1 ? ion.f : ion.poly ? `(${ion.f})${n}` : `${ion.f}${n}`);
  function formula(cid, aid) { const c = CAT[cid], a = AN[aid], [m, n] = ratio(c, a); return part(c, m) + part(a, n); }
  // 任意個數組成的化學式（學生拼出來的答案）
  const build = (cid, m, aid, n) => part(CAT[cid], m) + part(AN[aid], n);
  const name = (cid, aid) => AN[aid].zh + CAT[cid].zh;
  // 化學式的數字轉成下標 HTML
  const html = f => String(f).replace(/(\d+)/g, '<sub>$1</sub>');
  const ionHtml = ion => { const q = Math.abs(ion.q); return `${html(ion.f)}<sup>${q > 1 ? q : ''}${ion.q > 0 ? '+' : '−'}</sup>`; };
  // 化合物需要的原料元素（每種元素消耗 1 單位）
  const needs = (cid, aid) => [...new Set([...CAT[cid].els, ...AN[aid].els])];

  const PAIRS = [];
  CATIONS.forEach(c => ANIONS.forEach(a => { if (allowed(c, a)) PAIRS.push({ c: c.id, a: a.id }); }));

  return { ELEMENTS, EL, TYPE, price, CATIONS, ANIONS, CAT, AN, PAIRS, ratio, formula, build, name, html, ionHtml, needs };
})();
if (typeof module !== 'undefined') module.exports = CHEM;
