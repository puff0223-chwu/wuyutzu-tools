/* =========================================================
   隱秘的鍵結社 —— 世界引擎（地圖、國力、蠶食、結局、總分）
   ---------------------------------------------------------
   老師的決定（2026-10-14）：
   ・開局國力依鍵能比例隨機：共國、離國 300～400；金國 100～140；氫聯邦 25～40；凡聯邦 2.5～4.0
   ・國力變化一律用「自己標準國力的百分比」；均勢與勝敗看「相對國力＝目前÷標準國力×100%」
   ・天下一統（任一國 ≥170%，或連續 2 回合 ≥150%）、一國滅亡（≤45%）（第三次試玩後依模擬收緊，原本 200／170／30、安全 60～150）、組織曝光（隱密度 0）都算失敗
   ・高一版：共國、離國、金國三國；高二高三版：再加氫聯邦、凡聯邦
   第一次試玩後調整（2026-10-14 下午）：
   ・開局不再全部 100%：一強（115～127%）、一弱（76～86%），其他 90～108%，第一回合就有消長與蠶食
   ・起始資金 40、倉庫是空的；友好度（0～100）與浮動礦價見 game.js
   第二次試玩後調整（2026-10-14 晚）：
   ・自然消長改成「零和」：各國漲跌先算好，再扣掉平均值，有人漲就有人跌
   ・領土跟著國力走：大陸面積固定，各國應得面積＝總面積×自己的相對國力÷各國相對國力總和；
     結算時領土不足的國家向領土過多的鄰國奪地（每國每回合最多 ±3 格，首都不會被攻下）；開局就先分好
   地圖：六角格奇幻大陸（亂數種子＝地圖代碼），中央山脈是中立的採礦國（不會被併吞）
   ========================================================= */
const WORLD = (() => {
  /* ---------- 亂數（可重現） ---------- */
  function rngFrom(state) {   // state.rs 會被推進，存檔後接著玩結果一致
    return () => { let t = (state.rs = (state.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const seeded = seed => rngFrom({ rs: seed >>> 0 });
  const codeOf = seed => (seed >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
  const seedOf = code => parseInt(String(code).trim().toLowerCase(), 36) >>> 0;
  const newSeed = () => Math.floor(Math.random() * 36 ** 6);

  /* ---------- 勢力 ---------- */
  const FACTIONS = {
    co: { id: 'co', name: '共國', full: '共價之國', bond: '共價鍵', color: '#2f6db5', light: '#cfe0f5', icon: '🔵', base: [300, 400], dec: 0 },
    io: { id: 'io', name: '離國', full: '離子之國', bond: '離子鍵', color: '#c0392b', light: '#f6d2cc', icon: '🔴', base: [300, 400], dec: 0 },
    me: { id: 'me', name: '金國', full: '金屬之國', bond: '金屬鍵', color: '#c99a2a', light: '#f5e6b8', icon: '🟡', base: [100, 140], dec: 0 },
    hb: { id: 'hb', name: '氫聯邦', full: '氫聯邦帝國', bond: '氫鍵', color: '#178f8f', light: '#c9eeee', icon: '🩵', base: [25, 40], dec: 0 },
    vw: { id: 'vw', name: '凡聯邦', full: '凡聯邦帝國', bond: '凡得瓦力', color: '#7b5ea7', light: '#e3d9f2', icon: '🟣', base: [2.5, 4.0], dec: 1 },
    mine: { id: 'mine', name: '採礦國', full: '中立採礦國', bond: '元素週期表', color: '#8a7a62', light: '#e7ddcb', icon: '⛏️' }
  };
  const RIVAL = { co: 'io', io: 'me', me: 'co', hb: 'vw', vw: 'hb' };
  const factionsOf = level => (level === 'g11' ? ['co', 'io', 'me', 'hb', 'vw'] : ['co', 'io', 'me']);
  const RULE = { ROUNDS: 8, SAFE: [75, 130], UNIFY: 170, UNIFY_SOFT: 150, DESTROY: 45, MONEY0: 40, STEALTH0: 100, EXPOSE: 25 };   // 隱密度 ≤25 就曝光

  /* ---------- 六角格地圖 ---------- */
  const W = 15, H = 11, S = 20, SQ3 = Math.sqrt(3);
  const center = (q, r) => [S * SQ3 * (q + 0.5 * (r & 1)) + S * SQ3 / 2 + 6, S * 1.5 * r + S + 6];
  function neighbors(q, r) {
    const odd = r & 1, d = odd ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]] : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
    return d.map(([dq, dr]) => [q + dq, r + dr]).filter(([a, b]) => a >= 0 && a < W && b >= 0 && b < H).map(([a, b]) => b * W + a);
  }
  function makeMap(seed, facs) {
    const rnd = seeded(seed);
    // 平滑雜訊：幾個隨機「丘」疊加，再扣掉離中心的距離 → 大陸形狀
    const blobs = Array.from({ length: 7 }, () => ({ x: 2 + rnd() * (W - 4), y: 1.5 + rnd() * (H - 3), r: 2 + rnd() * 3, h: 0.5 + rnd() * 0.6 }));
    const cells = [];
    for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) {
      const dx = (q - (W - 1) / 2) / (W / 2), dy = (r - (H - 1) / 2) / (H / 2);
      let v = 1.1 - Math.sqrt(dx * dx + dy * dy) * 1.05;
      blobs.forEach(b => { const d = Math.hypot(q - b.x, r - b.y); v += b.h * Math.exp(-(d * d) / (b.r * b.r)) * 0.55; });
      v += (rnd() - 0.5) * 0.18;
      const [x, y] = center(q, r);
      cells.push({ i: r * W + q, q, r, x, y, v, nb: neighbors(q, r) });
    }
    // 調整門檻，讓陸地有 66～80 格，並只保留最大的一塊陸地
    const sorted = cells.map(c => c.v).sort((a, b) => b - a);
    const thr = sorted[74];
    cells.forEach(c => { c.land = c.v > thr && c.q > 0 && c.q < W - 1 && c.r > 0 && c.r < H - 1; });
    const comp = new Array(cells.length).fill(-1); let best = -1, bestN = 0;
    cells.forEach(c => {
      if (!c.land || comp[c.i] >= 0) return;
      const st = [c.i]; comp[c.i] = c.i; let n = 0;
      while (st.length) { const k = st.pop(); n++; cells[k].nb.forEach(j => { if (cells[j].land && comp[j] < 0) { comp[j] = c.i; st.push(j); } }); }
      if (n > bestN) { bestN = n; best = c.i; }
    });
    cells.forEach(c => { if (c.land && comp[c.i] !== best) c.land = false; });
    const land = cells.filter(c => c.land);
    // 採礦國：最靠近陸地重心的一格＋周圍的陸地（中央山脈）
    const cx = land.reduce((a, c) => a + c.x, 0) / land.length, cy = land.reduce((a, c) => a + c.y, 0) / land.length;
    const core = land.reduce((a, c) => (Math.hypot(c.x - cx, c.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? c : a));
    const owner = new Array(cells.length).fill(null);
    owner[core.i] = 'mine'; core.nb.filter(j => cells[j].land).slice(0, 5).forEach(j => { owner[j] = 'mine'; });
    // 各國首都：彼此最遠（最遠點取樣），再輪流向外擴張，讓每國領土差不多大
    const free = land.filter(c => !owner[c.i]);
    const caps = [];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let first = free.reduce((a, c) => (dist(c, core) > dist(a, core) ? c : a));
    caps.push(first);
    while (caps.length < facs.length) caps.push(free.reduce((a, c) => (Math.min(...caps.map(k => dist(k, c))) > Math.min(...caps.map(k => dist(k, a))) ? c : a)));
    const order = facs.map((f, k) => ({ f, cap: caps[k] }));
    order.forEach(o => { owner[o.cap.i] = o.f; });
    let grew = true;
    while (grew) {
      grew = false;
      const cnt = f => owner.filter(o => o === f).length;
      for (const o of [...order].sort((a, b) => cnt(a.f) - cnt(b.f))) {
        const front = cells.filter(c => owner[c.i] === o.f).flatMap(c => c.nb).filter(j => cells[j].land && !owner[j]);
        if (front.length) { front.sort((a, b) => dist(cells[a], o.cap) - dist(cells[b], o.cap)); owner[front[0]] = o.f; grew = true; break; }
      }
      if (!grew) { // 沒有國家能再擴張但仍有空地（被包住）：給最近的國家
        const left = land.find(c => !owner[c.i]);
        if (left) { const near = order.reduce((a, o) => (dist(left, o.cap) < dist(left, a.cap) ? o : a)); owner[left.i] = near.f; grew = true; }
      }
    }
    // 裝飾地形
    cells.forEach(c => { if (!c.land) return; const t = rnd(); c.terrain = owner[c.i] === 'mine' ? 'mount' : t < 0.18 ? 'forest' : t < 0.28 ? 'hill' : 'plain'; c.deco = rnd(); });
    const capitals = Object.fromEntries(order.map(o => [o.f, o.cap.i]));
    return { W, H, S, cells, owner, capitals, width: S * SQ3 * (W + 0.5) + 12, height: S * 1.5 * (H - 1) + 2 * S + 12 };
  }
  const hexPath = (x, y, s = S) => Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`; }).join(' ');

  /* ---------- 新的一局 ---------- */
  function newGame({ level = 'g10', code } = {}) {
    const seed = code ? seedOf(code) : newSeed();
    const facs = factionsOf(level);
    const rnd = seeded(seed ^ 0x5eed);
    const base = {}, power = {};
    facs.forEach(f => { const [a, b] = FACTIONS[f].base; const v = a + rnd() * (b - a); base[f] = FACTIONS[f].dec ? Math.round(v * 10) / 10 : Math.round(v); });
    // 開局相對國力：洗牌後第 1 國最強、第 2 國最弱，其餘中間
    const order = facs.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((f, k) => { const r0 = k === 0 ? 115 + rnd() * 12 : k === 1 ? 76 + rnd() * 10 : 90 + rnd() * 18; power[f] = base[f] * Math.round(r0) / 100; });
    const map = makeMap(seed, facs);
    redraw({ facs, power, base, owner: map.owner }, map, 99);   // 開局地圖就反映強弱
    return {
      v: 5, level, seed, code: codeOf(seed), facs, round: 1, step: 'report',
      base, power, owner: map.owner.slice(), rs: (seed * 2654435761) >>> 0,
      money: RULE.MONEY0, stealth: RULE.STEALTH0, inv: {},
      friend: Object.fromEntries([...facs, 'mine'].map(f => [f, 40])), mkt: {},
      stats: { tasks: 0, firstOk: 0, fails: 0, byType: {} }, balanceRounds: 0, hi: {}, rumor: {},
      trend: rollTrend(facs, seeded(seed ^ 0x7e2d)),
      board: null, done: [], ap: 2, history: [snapshot({ facs, power, base })], startedAt: Date.now(), ended: null
    };
  }
  // 國運趨勢：每國有自己的長期走勢（每 3 回合重抽一次），放著不管就會失衡
  function rollTrend(facs, rnd) { const t = {}; facs.forEach(f => { t[f] = Math.round((rnd() * 13 - 6.5) * 10) / 10; }); return t; }
  function snapshot(s) { return Object.fromEntries(s.facs.map(f => [f, Math.round(rel(s, f))])); }

  /* ---------- 國力 ---------- */
  const rel = (s, f) => (s.power[f] / s.base[f]) * 100;
  const fmtPower = (s, f) => { const v = s.power[f]; return FACTIONS[f].dec ? v.toFixed(1) : Math.round(v).toString(); };
  const territory = (s, f) => s.owner.filter(o => o === f).length;
  // 套用影響（百分比，以標準國力計）；高二高三版共國的變化會帶動兩聯邦（×0.3）
  function apply(s, eff, note) {
    const out = {};
    const add = (f, pct) => { if (!s.facs.includes(f) || !pct) return; s.power[f] = Math.max(0, s.power[f] + s.base[f] * pct / 100); out[f] = (out[f] || 0) + pct; };
    Object.entries(eff || {}).forEach(([f, p]) => add(f, p));
    if (eff && eff.co && s.level === 'g11') { add('hb', eff.co * 0.3); add('vw', eff.co * 0.3); }
    return out;
  }
  // 每回合自然消長（零和）：國運趨勢 ＋ 強者越強（和平均比）＋ 運氣，再扣掉各國平均 → 有人漲就有人跌
  const avgRel = s => s.facs.reduce((a, f) => a + rel(s, f), 0) / s.facs.length;
  function rawGrowth(s, f, noise = 0) { return (s.trend ? s.trend[f] : 0) + (MOMENTUM[s.level] || 0.2) * (rel(s, f) - avgRel(s)) + noise; }
  function drift(s) {
    const rnd = rngFrom(s), raw = {}, out = {};
    s.facs.forEach(f => { raw[f] = rawGrowth(s, f, rnd() * 2 * DRIFT.NOISE - DRIFT.NOISE); });
    const mean = s.facs.reduce((a, f) => a + raw[f], 0) / s.facs.length;
    s.facs.forEach(f => {
      let g = raw[f] - mean;
      if (s.rumor[f] && g > 0) g /= 2;   // 謠言：成長減半
      g = Math.max(-DRIFT.CAP, Math.min(DRIFT.CAP, g));   // 單回合最多 ±8%：努力不會一次被抵銷
      g = Math.round(g * 10) / 10;
      s.power[f] = Math.max(0, s.power[f] + s.base[f] * g / 100); out[f] = g;
    });
    s.rumor = {};
    if (s.round % 3 === 0) s.trend = rollTrend(s.facs, rnd);
    return out;
  }
  // 2026-10-16 依學生回饋改版：運氣 ±8→±4、強者越強 ×1.2、單回合上限 ±8%（模擬：高手撐過率 95/89% → 97/93%，最大單回合變動 30% → 8%）
  const DRIFT = { NOISE: 4, CAP: 8 };
  const MOMENTUM = { g10: 0.31, g11: 0.19 };   // 強者越強係數
  // 各國應得的省分數（採礦國不算）
  function shares(s) {
    const land = s.owner.filter(o => o && o !== 'mine').length, tot = s.facs.reduce((a, f) => a + rel(s, f), 0);
    return Object.fromEntries(s.facs.map(f => [f, land * rel(s, f) / tot]));
  }
  // 領土跟著國力走：領土不足的國家向領土過多的鄰國奪地；limit＝每國每回合最多增減幾格
  function redraw(s, map, limit = 3) {
    const want = shares(s), gain = {}, lose = {}, moves = [], cells = [];
    const own = f => s.owner.filter(o => o === f).length;
    for (let guard = 0; guard < 400; guard++) {
      const need = s.facs.filter(f => want[f] - own(f) >= 0.7 && (gain[f] || 0) < limit).sort((a, b) => (want[b] - own(b)) - (want[a] - own(a)));
      let done = false;
      for (const f of need) {
        // 相鄰、領土過多、而且還能再失地的國家
        const adj = new Set();
        map.cells.forEach(c => { if (s.owner[c.i] === f) c.nb.forEach(j => { const o = s.owner[j]; if (o && o !== f && o !== 'mine') adj.add(o); }); });
        const from = [...adj].filter(g => own(g) - want[g] >= 0.3 && (lose[g] || 0) < limit).sort((a, b) => (own(b) - want[b]) - (own(a) - want[a]))[0];
        if (!from) continue;
        const capF = map.cells[map.capitals[f]];
        const border = map.cells.filter(c => s.owner[c.i] === from && c.i !== map.capitals[from] && c.nb.some(j => s.owner[j] === f));
        if (!border.length) continue;
        border.sort((a, b) => Math.hypot(a.x - capF.x, a.y - capF.y) - Math.hypot(b.x - capF.x, b.y - capF.y));
        s.owner[border[0].i] = f; cells.push(border[0].i);
        gain[f] = (gain[f] || 0) + 1; lose[from] = (lose[from] || 0) + 1;
        const m = moves.find(x => x.to === f && x.from === from); if (m) m.n++; else moves.push({ to: f, from, n: 1 });
        done = true; break;
      }
      if (!done) break;
    }
    return { moves, cells, want };
  }
  // 舊名稱保留：結算時呼叫
  const annex = (s, map) => redraw(s, map, 3);

  /* ---------- 結局 ---------- */
  const inSafe = (s, f) => { const r = rel(s, f); return r >= RULE.SAFE[0] && r <= RULE.SAFE[1]; };
  // 回合中途的失敗判定（每次結算、事件之後都檢查）
  function checkFail(s) {
    if (s.stealth <= RULE.EXPOSE) return { id: 'exposed' };
    for (const f of s.facs) {
      if (rel(s, f) >= RULE.UNIFY || (s.hi[f] || 0) >= 2) return { id: 'unify', f };
      if (rel(s, f) <= RULE.DESTROY || territory(s, f) === 0) return { id: 'destroy', f };
    }
    return null;
  }
  // 回合結束時更新「連續 ≥UNIFY_SOFT」計數與均勢回合數
  // worked：本回合有沒有完成至少 1 件委託（沒做事就拿不到均勢回合分）
  function closeRound(s, worked = true) {
    s.facs.forEach(f => { s.hi[f] = rel(s, f) >= RULE.UNIFY_SOFT ? (s.hi[f] || 0) + 1 : 0; });
    const ok = s.facs.every(f => inSafe(s, f));
    if (ok && worked) s.balanceRounds++;
    s.history.push(snapshot(s));
    return ok;
  }
  function finalEnding(s) {
    if (s.facs.every(f => { const r = rel(s, f); return r >= 90 && r <= 110; })) return { id: 'harmony' };
    if (s.facs.every(f => inSafe(s, f))) return { id: 'peace' };
    return { id: 'shaky' };
  }
  const END_BONUS = { harmony: 150, peace: 100, shaky: 40, unify: 0, destroy: 0, exposed: 0 };
  const FAIL_ENDS = ['unify', 'destroy', 'exposed'];
  const CONFISCATE = 0.3;   // 鍵結社被消滅：資產被沒收，只留 3 成
  function score(s) {
    const t = s.stats.tasks, rate = t ? s.stats.firstOk / t : 0;
    const parts = {
      money: Math.round(s.money * (s.ended && FAIL_ENDS.includes(s.ended.id) ? CONFISCATE : 1)), balance: s.balanceRounds * 20, learn: Math.round(rate * 200),
      stealth: Math.max(0, Math.round(s.stealth - RULE.EXPOSE)), ending: END_BONUS[(s.ended && s.ended.id) || 'shaky'] || 0,
      practice: Object.values(s.prac || {}).filter(p => p.ok > 0).length * 10   // 知識點圖鑑：每練成一種知識點 +10
    };
    return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), rate };
  }

  return { FAIL_ENDS, CONFISCATE, FACTIONS, RIVAL, RULE, factionsOf, rngFrom, seeded, codeOf, seedOf, makeMap, hexPath, newGame, rel, fmtPower, territory, apply, drift, annex, redraw, shares, rawGrowth, avgRel, MOMENTUM, DRIFT, inSafe, checkFail, closeRound, finalEnding, score, snapshot };
})();
if (typeof module !== 'undefined') module.exports = WORLD;
