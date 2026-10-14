/* =========================================================
   隱秘的鍵結社 —— 委託與任務產生器（⛏️ 尋礦、⚒️ 鑄造、🔍 偵探鑑定）
   ---------------------------------------------------------
   ・每回合 3～4 件委託（第 1～2 回合 3 件），一定有尋礦與鑄造各至少一件
   ・委託影響用「委託國標準國力的百分比」；強國出價比較高（誘惑學生偏袒強國）
   ・「暗中削弱」委託：委託國小幅上升、目標國大幅下降
   ・難度分三階：第 1～2 回合、第 3～5 回合、第 6～8 回合
   ・題目全部由程式自動組合，每局不同
   ========================================================= */
const TASKS = (() => {
  const C = typeof CHEM !== 'undefined' ? CHEM : require('./data.js');
  const Wd = typeof WORLD !== 'undefined' ? WORLD : require('./world.js');
  const tierOf = round => (round <= 2 ? 1 : round <= 5 ? 2 : 3);

  /* ---------- 尋礦：線索 ---------- */
  const POOL = {
    me: ['Li', 'Be', 'Na', 'Mg', 'Al', 'K', 'Ca', 'Ti', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga'],
    co: ['H', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'Se', 'Br'],
    io: ['Li', 'Na', 'K', 'Mg', 'Ca', 'Al', 'F', 'Cl', 'Br', 'O', 'S', 'N'],
    hb: ['H', 'N', 'O', 'F'],
    vw: ['He', 'Ne', 'Ar', 'Kr', 'F', 'Cl', 'Br', 'C'],
    mine: C.ELEMENTS.map(e => e.sym)
  };
  // 元素的常見離子（只看單原子離子）
  function ionsOf(sym) {
    const qs = [...C.CATIONS.filter(c => !c.poly && c.f === sym).map(c => c.q), ...C.ANIONS.filter(a => !a.poly && a.f === sym).map(a => a.q)];
    return [...new Set(qs)].sort((a, b) => a - b);
  }
  const qtxt = q => `${q > 0 ? '+' : '−'}${Math.abs(q)}`;
  const FX = typeof FACTS !== 'undefined' ? FACTS : require('./facts.js');
  /* 線索分家族，同一家族只出一條（避免「第 2 族」又「價電子 2 個」這種同義線索）
     row 週期｜col 族／族名／價電子／離子電荷（四選一）｜kind 類別｜prop 物理性質｜react 化學反應｜use 生活用途｜num 推理 */
  const FAMLBL = { row: '位置', col: '位置', kind: '類別', prop: '物理性質', react: '化學反應', use: '生活用途', num: '推理線索' };
  function clueBank(e, rnd) {
    const out = [];
    out.push({ fam: 'row', t: `位在第 ${e.period} 週期`, ok: x => x.period === e.period });
    const col = [{ fam: 'col', t: `位在第 ${e.group} 族`, ok: x => x.group === e.group }];
    if (FX.FAMILY[e.group] && e.sym !== 'H') col.push({ fam: 'col', t: `屬於${FX.FAMILY[e.group]}家族`, ok: x => x.group === e.group && x.sym !== 'H' });
    if (e.val != null && !e.trans && e.type !== 'g') col.push({ fam: 'col', t: `價電子有 ${e.val} 個`, ok: x => x.val === e.val && !x.trans && x.type !== 'g' });
    const qs = ionsOf(e.sym);
    if (qs.length) col.push({ fam: 'col', t: qs.length > 1 ? `常見的離子有 ${qs.map(qtxt).join(' 和 ')} 兩種` : `常形成帶 ${qtxt(qs[0])} 電荷的離子`, ok: x => JSON.stringify(ionsOf(x.sym)) === JSON.stringify(qs) });
    out.push(col[Math.floor(rnd() * col.length)]);
    out.push({ fam: 'kind', t: `是${e.typeZh}`, ok: x => x.type === e.type });
    ['prop', 'react', 'use'].forEach(cat => {
      const fs = FX.ELFACTS.filter(f => f.cat === cat && f.els.includes(e.sym));
      if (fs.length) { const f = fs[Math.floor(rnd() * fs.length)]; out.push({ fam: cat, t: f.t, ok: x => f.els.includes(x.sym) }); }
    });
    const nums = [];
    const up = C.ELEMENTS.find(x => x.group === e.group && x.period === e.period - 1);
    if (up) nums.push({ fam: 'num', t: `和 ${up.sym}（${up.zh}）同一族，在它的下一個週期`, ok: x => x.group === up.group && x.period === up.period + 1 });
    const k = 1 + Math.floor(rnd() * 3), ref = C.ELEMENTS.find(x => x.z === e.z - k);
    if (ref) nums.push({ fam: 'num', t: `原子序比 ${ref.sym}（${ref.zh}）多 ${k}`, ok: x => x.z === ref.z + k });
    const lo = Math.max(1, e.z - Math.floor(rnd() * 6)), hi = Math.min(36, lo + 7);
    nums.push({ fam: 'num', t: `原子序介於 ${lo}～${hi} 之間`, ok: x => x.z >= lo && x.z <= hi });
    out.push(nums[Math.floor(rnd() * nums.length)]);
    return out;
  }
  const left = clues => C.ELEMENTS.filter(x => clues.every(c => c.ok(x))).length;
  function mineTask(sym, tier, rnd) {
    const e = C.EL[sym];
    const shuffle = a => a.map(v => [rnd(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const bank = clueBank(e, rnd);
    const isFact = c => ['prop', 'react', 'use'].includes(c.fam);
    const facts = shuffle(bank.filter(isFact));
    const fNU = facts.filter(c => left([c]) > 1), fU = facts.filter(c => left([c]) === 1);   // fU：一條就猜得到的特性
    const pos = shuffle(bank.filter(c => ['row', 'col', 'kind'].includes(c.fam)));
    const num = bank.filter(c => c.fam === 'num');
    // 第一階「特性＋位置」、第二階「特性＋特性／推理」、第三階「推理＋特性」
    const order = tier === 3 ? [...num, ...fNU, ...pos, ...fU] : tier === 2 ? [...fNU, ...num, ...pos, ...fU] : [...fNU, ...pos, ...fU];
    const clues = [];
    for (const c of order) {
      if (left(clues) === 1) break;
      if (clues.some(x => x.fam === c.fam)) continue;
      if (!clues.length && left([c]) === 1) continue;                  // 第一條不能一次就猜到
      if (left([...clues, c]) < left(clues)) clues.push(c);           // 只加能縮小範圍的線索（避免同義重複）
    }
    for (let i = 0; i < clues.length && clues.length > 2; i++) { if (left(clues.filter((_, j) => j !== i)) === 1) { clues.splice(i, 1); i--; } }
    // 整題沒有任何「特性」線索時，換成一條特性線索，讓學生學到元素的性質與用途
    if (!clues.some(isFact) && fU.length && clues.length) clues.splice(clues.length - 1, 1, fU[0]);
    if (left(clues) !== 1) { clues.length = 0; clues.push(bank[0], { fam: 'col', t: `位在第 ${e.group} 族`, ok: x => x.group === e.group }); }
    const fmt = tier === 1 ? (rnd() < 0.5 ? 'list' : 'report') : ['list', 'story', 'report'][Math.floor(rnd() * 3)];
    return { kind: 'mine', answer: sym, clues: clues.map(c => ({ fam: c.fam, lbl: FAMLBL[c.fam], t: c.t })), fmt, qty: 2 };
  }

  /* ---------- 偵探鑑定 ---------- */
  // 第一階：判斷是哪一種鍵結（哪一國的物質）；第二、三階：從 4 種可疑物質中找出真正的那一個（第三階的嫌疑物質更相像）
  function detectTask(tier, rnd) {
    const S = FX.SUBST, pick = a => a[Math.floor(rnd() * a.length)];
    const target = pick(S);
    if (tier === 1) return { kind: 'detect', mode: 'type', answer: target.id, bond: target.bond, opts: ['io', 'me', 'mol', 'net'], done: ['look'] };
    const same = S.filter(x => x.id !== target.id && x.bond === target.bond), other = S.filter(x => x.id !== target.id && x.bond !== target.bond);
    const sh = a => a.map(v => [rnd(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const nSame = tier === 3 ? Math.min(2, same.length) : Math.min(1, same.length);
    const cand = [target, ...sh(same).slice(0, nSame), ...sh(other).slice(0, 3 - nSame)];
    return { kind: 'detect', mode: 'which', answer: target.id, bond: target.bond, opts: sh(cand).map(x => x.id), done: ['look'] };
  }
  const subst = id => FX.SUBST.find(x => x.id === id);
  // 還沒做的檢驗中，最能分辨選項的那一個（給提示用）
  const TEST_ORDER = { type: ['cond', 'melt', 'cond2', 'hit', 'water'], which: ['flame', 'acid', 'base', 'mag', 'cond', 'ph', 'water', 'hit', 'melt', 'cond2'] };
  function bestTest(t) {
    const T = id => FX.TESTS.find(x => x.id === id);
    const tgt = subst(t.answer);
    const others = t.mode === 'type' ? FX.SUBST.filter(x => x.bond !== t.bond) : t.opts.filter(id => id !== t.answer).map(subst);
    let best = null, bv = 0;
    TEST_ORDER[t.mode].filter(id => !t.done.includes(id)).forEach(id => { const v = others.filter(o => o.r[id] !== tgt.r[id]).length; if (v > bv) { bv = v; best = T(id); } });
    return best;
  }
  /* ---------- 鑄造：化學式與命名 ---------- */
  const isTM = p => C.CAT[p.c].tm && p.c !== 'Zn';
  const poly = p => C.CAT[p.c].poly || C.AN[p.a].poly;
  function pairFor(tier, from, rnd) {
    let list = C.PAIRS.filter(p => {
      if (tier === 1) return !poly(p) && !C.CAT[p.c].tm;
      if (tier === 2) return !isTM(p);
      return isTM(p) || (poly(p) && Math.max(...C.ratio(C.CAT[p.c], C.AN[p.a])) > 1) || rnd() < 0.25;
    });
    if (from === 'me') { const ore = list.filter(p => ['O', 'S', 'CO3'].includes(p.a) && p.c !== 'NH4'); if (ore.length) list = ore; }
    return list[Math.floor(rnd() * list.length)];
  }
  const CONFUSE = { S: ['SO4'], SO4: ['S'], N: ['NO3'], NO3: ['N'], CO3: ['O'], O: ['CO3', 'OH'], OH: ['O'], Cl: ['Br'], F: ['Cl'], Br: ['Cl'], PO4: ['SO4'] };
  const SIBLING = { Fe2: 'Fe3', Fe3: 'Fe2', Cu1: 'Cu2', Cu2: 'Cu1' };
  function distract(ids, right, rnd, pool) {
    const out = [right];
    ids.forEach(i => { if (i && !out.includes(i)) out.push(i); });
    while (out.length < 3) { const x = pool[Math.floor(rnd() * pool.length)]; if (!out.includes(x)) out.push(x); }
    return out.slice(0, 3).map(v => [rnd(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
  }
  function forgeTask(tier, from, rnd) {
    const p = pairFor(tier, from, rnd), cat = C.CAT[p.c], an = C.AN[p.a];
    const [m, n] = C.ratio(cat, an);
    const base = { kind: 'forge', c: p.c, a: p.a, m, n, formula: C.formula(p.c, p.a), name: C.name(p.c, p.a), needs: C.needs(p.c, p.a) };
    const mode = tier === 1 ? 'ions' : rnd() < 0.55 ? 'name2f' : 'f2name';
    if (mode === 'ions') return { ...base, mode };
    if (mode === 'name2f') {
      const catPool = C.CATIONS.map(c => c.id), anPool = C.ANIONS.map(a => a.id);
      const cOpts = distract([SIBLING[p.c], ...catPool.filter(x => C.CAT[x].q !== cat.q && rnd() < 0.3)], p.c, rnd, catPool);
      const aOpts = distract([...(CONFUSE[p.a] || [])], p.a, rnd, anPool);
      return { ...base, mode, cOpts, aOpts };
    }
    // f2name：看化學式選名稱（4 選 1）
    const names = new Set([base.name]);
    const add = (cid, aid) => { if (cid && aid && C.CAT[cid] && C.AN[aid]) names.add(C.name(cid, aid)); };
    add(SIBLING[p.c], p.a); (CONFUSE[p.a] || []).forEach(x => add(p.c, x)); (CONFUSE[p.a] || []).forEach(x => add(SIBLING[p.c], x));
    let guard = 0;
    while (names.size < 4 && guard++ < 80) { const q = C.PAIRS[Math.floor(rnd() * C.PAIRS.length)]; if (q.c === p.c || q.a === p.a || guard > 40) add(q.c, q.a); }
    C.ANIONS.forEach(x => { if (names.size < 4) add(p.c, x.id); });   // 保底：同一個陽離子配別的陰離子
    const opts = [...names].slice(0, 4).map(v => [rnd(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return { ...base, mode, opts };
  }
  // 檢查學生的鑄造答案，回傳 { ok, msg }
  function checkForge(t, ans) {
    if (t.mode === 'f2name') return ans.name === t.name ? { ok: true } : { ok: false, msg: '名稱不對。先拆開化學式：前面是陽離子、後面是陰離子；同一種金屬有兩種電荷時，電荷小的要加「亞」。' };
    const { c, a, m, n } = ans;
    if (c !== t.c) return { ok: false, msg: t.mode === 'ions' ? '' : '陽離子選錯了。名稱的後半段是陽離子（例如「硫酸**銅**」的銅）。' };
    if (a !== t.a) return { ok: false, msg: '陰離子選錯了。名稱的前半段是陰離子，注意「硫化」和「硫酸」、「氮化」和「硝酸」不一樣。' };
    const cq = C.CAT[c].q * m, aq = -C.AN[a].q * n;
    if (cq !== aq) return { ok: false, msg: `電荷沒有抵消：正電荷總共 +${cq}，負電荷總共 −${aq}，要相等才是電中性的化合物。` };
    if (m !== t.m || n !== t.n) return { ok: false, msg: '電荷平衡了，但化學式要寫成**最簡整數比**。' };
    return { ok: true };
  }
  // 提示（第一次答錯後顯示）
  function hint(t) {
    if (t.kind === 'mine') return '一條一條縮小範圍：先用「位置」或「類別」圈出一區，再用性質、反應、用途的線索刪去不符合的元素。橫列是週期、直行是族。';
    if (t.kind === 'detect') { const b = bestTest(t); return t.mode === 'type' ? `想一想：固體能導電的是金屬（或石墨）；固體不導電、溶於水或熔融後能導電的是離子化合物；熔點很低的是分子物質；又硬、熔點又極高、不導電的是網狀共價固體。${b ? `試試「${b.name}」。` : ''}` : `${b ? `「${b.name}」最能分辨這幾種嫌疑物質。` : '比較每種嫌疑物質的特性，找出和檢驗結果不符合的。'}`; }
    if (t.mode === 'f2name') return `這個化合物由 ${C.ionHtml(C.CAT[t.c])} 和 ${C.ionHtml(C.AN[t.a])} 組成。`;
    return `陽離子 ${C.ionHtml(C.CAT[t.c])}、陰離子 ${C.ionHtml(C.AN[t.a])}：讓正負電荷總和為零，再化成最簡整數比。`;
  }

  /* ---------- 委託 ---------- */
  const FL = {
    mine: {
      me: ['金國的工匠公會要打造新兵器，急需一種金屬礦。', '金國的鑄幣廠缺貨了，他們開出高價找礦。'],
      co: ['共國的分子村落要蓋新的村莊，需要一種非金屬元素。', '共國的煉丹師在找一種元素，據說能做出新的分子。'],
      io: ['離國要擴建晶格大陣，需要能形成離子的元素。', '離國的鹽田總管在找一種元素，好讓陣列更穩固。'],
      hb: ['氫聯邦的使節悄悄來找你：他們需要一種能形成氫鍵的元素。'],
      vw: ['凡聯邦的議員小聲地說：他們想找一種元素，加入聯邦。'],
      mine: ['採礦國的礦工頭目說：山裡有一條礦脈，找到就分你一些。']
    },
    forge: {
      io: ['離國的軍需官要一批離子化合物補給品。', '離國的鹽商公會下了訂單，要鑄造一種化合物。', '離國的晶格工程師需要一種化合物來修補陣列。'],
      me: ['金國的冶煉場需要一批礦石樣本來研究。', '金國想知道對手的礦石成分，請你鑄造一份樣本。'],
      co: ['共國的學者想研究離國的物質，請你暗中鑄造一份樣本。', '共國的分子村落需要一種離子化合物當作工業原料。']
    },
    detect: {
      co: ['共國的邊境哨站攔下一包來路不明的物質，請你鑑定它到底是什麼。', '共國的煉丹師把標籤弄丟了，只好請鍵結社來鑑定。'],
      io: ['離國的海關查獲一批走私品，要你查出它的真面目。', '離國的倉庫裡多了一箱沒有標籤的貨，總管懷疑是間諜放的。'],
      me: ['金國的鑄幣廠發現一塊可疑的原料，想知道它是什麼。', '金國的將軍收到一份「禮物」，擔心有詐，請你鑑定。'],
      hb: ['氫聯邦的使節帶來一份神秘樣本，請你查明身分。'],
      vw: ['凡聯邦的商隊收到一批貨，懷疑被調包了。']
    }
  };
  function makeBoard(s) {
    const rnd = Wd.rngFrom(s), tier = tierOf(s.round);
    const n = s.round <= 2 ? 3 : 4, pick = a => a[Math.floor(rnd() * a.length)];
    const facs = s.facs, kinds = ['mine', 'forge', 'detect'];
    while (kinds.length < n) kinds.push(['mine', 'forge', 'detect'][Math.floor(rnd() * 3)]);
    const used = new Set();
    const board = kinds.map((kind, k) => {
      let from;
      if (kind === 'forge') { const x = rnd(); from = x < 0.5 ? 'io' : x < 0.8 ? 'me' : 'co'; }   // 鑄造委託分散來源，練化學式不必一直幫離國
      else if (kind === 'detect') from = pick(facs);
      else { const cand = [...facs, 'mine'].filter(f => !used.has(f)); from = rnd() < 0.2 ? 'mine' : pick(cand.filter(f => f !== 'mine').length ? cand.filter(f => f !== 'mine') : facs); }
      used.add(from);
      const task = kind === 'mine' ? mineTask(pick(POOL[from] || POOL.mine), tier, rnd) : kind === 'detect' ? detectTask(tier, rnd) : forgeTask(tier, from, rnd);
      let effects = {}, shady = null, reward;
      if (from === 'mine') { reward = 12; task.qty = 3; }
      else {
        const r = Wd.rel(s, from);
        reward = Math.round(22 + tier * 6 + r * 0.15 + rnd() * 6 + (kind === 'detect' ? 6 : 0));
        if (rnd() < 0.28) {   // 暗中削弱委託
          const targets = facs.filter(f => f !== from);
          shady = pick(targets);
          effects = { [from]: 4, [shady]: -(8 + Math.round(rnd() * 4)) };
          reward += 10;
        } else {
          effects = { [from]: 7 + Math.round(rnd() * 5) };
          const rv = Wd.RIVAL[from]; if (rv && facs.includes(rv)) effects[rv] = -(2 + Math.round(rnd() * 2));
        }
      }
      return { id: `r${s.round}k${k}`, from, kind, shady, text: pick((FL[kind][from]) || FL[kind].io), reward, effects, task, tries: 0, state: 'open' };
    });
    return board;
  }
  return { tierOf, mineTask, forgeTask, detectTask, bestTest, subst, checkForge, hint, makeBoard, ionsOf, FAMLBL };
})();
if (typeof module !== 'undefined') module.exports = TASKS;
