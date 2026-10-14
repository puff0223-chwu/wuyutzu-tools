/* =========================================================
   隱秘的鍵結社 —— 快問題庫（2026-10-14 深夜，第三次試玩後新增）
   ---------------------------------------------------------
   用在：⚡ 干擾快問（限時彈出）、📚 題組委託（連續 3 小題）
   每題都是 4 選 1，並標上「知識點」tag，記錄到知識點圖鑑
   ========================================================= */
const QUIZ = (() => {
  const C = typeof CHEM !== 'undefined' ? CHEM : require('./data.js');
  const FX = typeof FACTS !== 'undefined' ? FACTS : require('./facts.js');

  // 知識點圖鑑：tag → 名稱
  const TAGS = {
    pos: '週期表位置', val: '價電子', ion: '離子電荷', poly: '多原子離子', formula: '離子化合物化學式', name: '化合物命名',
    prop: '元素的性質與用途', bond: '鍵結類型判斷', detect: '物質鑑定', mp: '熔沸點比較', trend: '週期趨勢', balance: '反應式平衡', lewis: '路易斯結構', imf: '分子間作用力'
  };
  const qtxt = q => `${Math.abs(q) > 1 ? Math.abs(q) : ''}${q > 0 ? '+' : '−'}`;
  const ionStr = ion => `${C.html(ion.f)}<sup>${qtxt(ion.q)}</sup>`;

  function mk(rnd, tag, q, right, wrongs) {
    const opts = [right, ...[...new Set(wrongs)].filter(w => w !== right).slice(0, 3)].map(v => [rnd(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
    return { tag, q, opts, ans: right };
  }
  const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
  const shuf = (rnd, a) => a.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
  const mainEls = C.ELEMENTS.filter(e => !e.trans);

  const GEN = {
    pos: rnd => { const e = pick(rnd, mainEls.filter(x => x.z > 2)); const r = `第 ${e.period} 週期、第 ${e.group} 族`;
      return mk(rnd, 'pos', `<b>${e.sym}（${e.zh}）</b>在週期表的哪個位置？`, r, shuf(rnd, [`第 ${e.period + (e.period < 4 ? 1 : -1)} 週期、第 ${e.group} 族`, `第 ${e.period} 週期、第 ${e.group === 1 ? 2 : e.group - 1} 族`, `第 ${e.group % 10 || 1} 週期、第 ${e.period} 族`, `第 ${e.period + (e.period > 1 ? -1 : 2)} 週期、第 ${e.group === 18 ? 17 : e.group + 1} 族`])); },
    val: rnd => { const e = pick(rnd, mainEls.filter(x => x.type !== 'g' && x.val != null)); return mk(rnd, 'val', `<b>${e.sym}（${e.zh}）</b>有幾個價電子？`, `${e.val} 個`, shuf(rnd, [1, 2, 3, 4, 5, 6, 7].filter(v => v !== e.val).map(v => `${v} 個`))); },
    ion: rnd => { const c = pick(rnd, [...C.CATIONS, ...C.ANIONS].filter(x => !x.poly && !x.tm)); const e = C.EL[c.f];
      return mk(rnd, 'ion', `<b>${e.zh}</b>最常形成的離子是哪一個？`, ionStr(c), [-3, -2, -1, 1, 2, 3].filter(q => q !== c.q).map(q => `${c.f}<sup>${qtxt(q)}</sup>`)); },
    poly: rnd => { const p = pick(rnd, [...C.ANIONS, ...C.CATIONS].filter(x => x.poly)); const name = p.zh.replace(/化$/, '') + '根';
      const fakes = [...C.ANIONS, ...C.CATIONS].filter(x => x.poly && x.id !== p.id).map(ionStr);
      return mk(rnd, 'poly', `「${name}」的化學式是哪一個？`, ionStr(p), shuf(rnd, [`${C.html(p.f)}<sup>${qtxt(p.q > 0 ? p.q + 1 : p.q - 1)}</sup>`, ...fakes])); },
    formula: rnd => { const pr = pick(rnd, C.PAIRS.filter(x => !(C.CAT[x.c].q === -C.AN[x.a].q))); const right = C.formula(pr.c, pr.a), c = C.CAT[pr.c], a = C.AN[pr.a];
      const part = (ion, n) => (n === 1 ? ion.f : ion.poly ? `(${ion.f})${n}` : `${ion.f}${n}`);
      const w = [part(c, 1) + part(a, 1), part(c, -a.q) + part(a, c.q) === right ? part(c, 1) + part(a, 2) : part(c, -a.q) + part(a, c.q), part(c, c.q) + part(a, -a.q), part(c, 2) + part(a, 3), part(c, 3) + part(a, 2)];
      return mk(rnd, 'formula', `「${C.name(pr.c, pr.a)}」的化學式是哪一個？`, C.html(right), w.map(C.html)); },
    name: rnd => { const pr = pick(rnd, C.PAIRS); const right = C.name(pr.c, pr.a);
      const SIB = { Fe2: 'Fe3', Fe3: 'Fe2', Cu1: 'Cu2', Cu2: 'Cu1' }, CON = { S: 'SO4', SO4: 'S', N: 'NO3', NO3: 'N', O: 'OH', OH: 'O', CO3: 'O', Cl: 'Br', F: 'Cl', Br: 'Cl', PO4: 'SO4' };
      const w = []; if (SIB[pr.c]) w.push(C.AN[pr.a].zh + C.CAT[SIB[pr.c]].zh); if (CON[pr.a]) w.push(C.AN[CON[pr.a]].zh + C.CAT[pr.c].zh);
      shuf(rnd, C.ANIONS).forEach(a => w.push(a.zh + C.CAT[pr.c].zh));
      return mk(rnd, 'name', `<b>${C.html(C.formula(pr.c, pr.a))}</b> 的名稱是？`, right, w); },
    prop: rnd => { const f = pick(rnd, FX.ELFACTS.filter(x => x.els.length === 1)); const e = C.EL[f.els[0]];
      const near = shuf(rnd, C.ELEMENTS.filter(x => x.sym !== e.sym && (x.type === e.type || Math.abs(x.z - e.z) < 4)));
      return mk(rnd, 'prop', `哪一種元素${f.t.replace(/^這種氣體/, '是一種氣體，').replace(/^它的/, '的')}？`, `${e.sym}（${e.zh}）`, near.map(x => `${x.sym}（${x.zh}）`)); },
    bond: rnd => { const s = pick(rnd, FX.SUBST); const B = { io: '離子化合物（離國）', me: '金屬（金國）', mol: '分子物質（共國的分子村落）', net: '網狀共價固體（共國的城牆）' };
      const lbl = s.id === 'dia' ? 'C（鑽石）' : s.id === 'gra' ? 'C（石墨）' : C.html(s.f);
      return mk(rnd, 'bond', `<b>${lbl}</b> 屬於哪一類物質？`, B[s.bond], Object.values(B)); },
    detect: rnd => { const s = pick(rnd, FX.SUBST); const t = pick(rnd, ['cond', 'flame', 'acid', 'melt', 'hit'].filter(k => FX.SUBST.filter(x => x.r[k] === s.r[k]).length === 1));
      if (!t) return GEN.bond(rnd);
      const T = FX.TESTS.find(x => x.id === t), lbl = x => (x.id === 'dia' ? 'C（鑽石）' : x.id === 'gra' ? 'C（石墨）' : C.html(x.f));
      return mk(rnd, 'detect', `某樣本「${T.name}」的結果是：<b>${s.r[t]}</b>。它最可能是？`, lbl(s), shuf(rnd, FX.SUBST.filter(x => x.id !== s.id && x.f !== s.f)).map(lbl)); },
    mp: rnd => { const d = pick(rnd, FX.SORTS.filter(x => x.lv === 'all' && !['alkali', 'radius3'].includes(x.id))); const it = shuf(rnd, d.items).slice(0, 4);
      const hi = d.dir === 'desc' ? 'max' : 'min', best = it.reduce((a, b) => ((hi === 'max' ? b[1] > a[1] : b[1] < a[1]) ? b : a));
      const ask = d.title.replace(/由.+到.+$/, ''), word = d.dir === 'desc' ? '最高（最大）' : '最低（最小）';
      return mk(rnd, 'mp', `下列哪一個的${ask}${word}？`, best[0], it.filter(x => x !== best).map(x => x[0])); },
    trend: rnd => { const g = pick(rnd, [1, 2, 17]); const col = C.ELEMENTS.filter(x => x.group === g && x.period > 1); const big = col[col.length - 1];
      return mk(rnd, 'trend', `第 ${g} 族的 ${col.map(x => x.sym).join('、')} 中，哪一個原子半徑最大？`, big.sym, col.filter(x => x !== big).map(x => x.sym).concat(['一樣大'])); },
    lewis: rnd => { const m = pick(rnd, FX.LEWIS); const k = rnd() < 0.5 ? 'bp' : 'lp';
      return mk(rnd, 'lewis', `<b>${m.f}</b> 的路易斯結構中，${k === 'bp' ? '共用電子' : '孤對電子'}共有幾對？`, `${m[k]} 對`, shuf(rnd, [0, 1, 2, 3, 4, 5, 6].filter(v => v !== m[k])).map(v => `${v} 對`)); },
    imf: rnd => { const it = pick(rnd, FX.CLASSIFY.imf.items); const yes = it[1][0] === 'hb';
      return mk(rnd, 'imf', `<b>${it[0]}</b> 的分子之間有沒有氫鍵？`, yes ? '有氫鍵' : '沒有，只有凡得瓦力', [yes ? '沒有，只有凡得瓦力' : '有氫鍵', '分子之間是共價鍵', '分子之間是離子鍵']); }
  };
  const LEVEL_TAGS = { g10: ['pos', 'val', 'ion', 'poly', 'formula', 'name', 'prop', 'bond', 'detect', 'mp', 'trend', 'lewis'], g11: Object.keys(GEN) };
  // 出題：優先挑學生還沒練過的知識點
  function make(rnd, level, prac = {}, avoid = []) {
    const tags = LEVEL_TAGS[level] || LEVEL_TAGS.g10;
    const order = shuf(rnd, tags).sort((a, b) => ((prac[a] || {}).ok ? 1 : 0) - ((prac[b] || {}).ok ? 1 : 0) || avoid.includes(a) - avoid.includes(b));
    for (const t of order) { const q = GEN[t](rnd); if (q && q.opts.length === 4) return q; }
    return GEN.name(rnd);
  }
  return { TAGS, GEN, make, LEVEL_TAGS };
})();
if (typeof module !== 'undefined') module.exports = QUIZ;
