// 隱秘的鍵結社 連線版 —— 平衡模擬（代理人模型）
// 每位玩家每回合答 Q 題，答對就依角色產出；交易需要「答對換來的交易許可」；勝利條件逐回合檢查
'use strict';
const DEF = {
  level: 'g11', N: 30, spies: true, games: 2000, seed: 1,
  Q: 3, ACC: 0.72, ACC_SD: 0.10, COIN: 8, START_COIN: 30, BUY: 12, SELL: 14, PERMIT: true,
  C: 0.6, MOM: 0.10, NOISE: 4, ATK_COST: 30, ATK: 3,
  // 勝利條件
  CO_N: 8, CO_F: 60, CO_TERR: 35, IO_N: 20, IO_M: 2, ME_X: 500, ME_K: 8, HB_N: 4, HB_F: 70, VW_X: 900, VW_R: 120,
  BS_LO: 75, BS_HI: 130, BS_SPREAD: 40,
  // 雙面人
  SP_C1: 10, SP_C2: 20, SP_UNLOCK: 6, SP_STEAL: 15, SP_DRAG: 4, SP_RUMOR: 10, SPY_HONEST: 0.5,
  SEC: { haul: 6, weaken: 95, block: 70, drain: 150, split: 45, slack: 50 },
  // 團隊任務門檻
  T_CORRECT: 0.62, T_DONATE: 12, T_MAKE: 0.5, T_FRIEND: 8, T_QUICK: 0.7,
  // 計分
  PT_OK: 40, PT_NO: 10, TW: 25, TL: 15, V: 60, PW: 1, CW: 1, ST: 40, PN: 0.5,
  log: false
};
const METALS = ['Li', 'Na', 'K', 'Mg', 'Ca', 'Al', 'Fe', 'Cu', 'Zn', 'Ni', 'Cr', 'Mn', 'Co', 'Ti'];
const HBX = ['N', 'O', 'F'], VWE = ['C', 'S', 'Cl', 'Br', 'P', 'Si'], JUNK = ['B', 'He', 'Ne', 'Ar', 'Se', 'Ga', 'Ge', 'As', 'Kr', 'Be', 'Sc', 'V'];
const ALL = [...METALS, 'H', ...HBX, ...VWE, ...JUNK];
const VWMASS = { C: 16, S: 64, Cl: 71, Br: 160, P: 137, Si: 170 }; // CH₄、SO₂、Cl₂、Br₂、PCl₃、SiCl₄ 的分子量（近似）
const ROLES = {
  co: ['builder', 'envoy', 'builder', 'mystic', 'miner', 'forger', 'mechanic', 'assayer', 'envoy'],
  io: ['miner', 'forger', 'envoy', 'mechanic', 'assayer', 'builder', 'miner', 'forger', 'envoy'],
  me: ['miner', 'miner', 'forger', 'mechanic', 'assayer', 'envoy', 'forger', 'miner', 'builder'],
  hb: ['miner', 'builder', 'envoy', 'mystic', 'mechanic', 'miner', 'builder', 'assayer', 'forger'],
  vw: ['builder', 'miner', 'forger', 'builder', 'mechanic', 'envoy', 'miner', 'assayer', 'forger']
};
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function play(P, r) {
  // 鍵結社人數：≥20 人每 10 人 1 名（2～3 名）；10～19 人 1 名；<10 人沒有
  const nb = P.N >= 20 ? Math.max(2, Math.min(3, Math.round(P.N / 10))) : P.N >= 10 ? 1 : 0, rest = P.N - nb;
  const g11 = P.level === 'g11' && rest >= 10;   // 人太少（每國不到 2 人）自動改用高一版
  const facs = g11 ? ['co', 'io', 'me', 'hb', 'vw'] : ['co', 'io', 'me'];
  const size = {};
  if (g11) { const b = rest >= 17 ? Math.floor((rest - 2) / 5) : Math.floor(rest / 5); facs.forEach(f => size[f] = b + (rest >= 17 && (f === 'hb' || f === 'vw') ? 1 : 0)); let left = rest - facs.reduce((a, f) => a + size[f], 0); for (const f of ['hb', 'vw', 'co', 'io', 'me']) { if (left <= 0) break; size[f]++; left--; } }
  else { const b = Math.floor(rest / 3); facs.forEach(f => size[f] = b); let left = rest - 3 * b; for (const f of facs) { if (left <= 0) break; size[f]++; left--; } }
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.sqrt(0.5); };
  const acc = () => Math.max(0.35, Math.min(0.97, P.ACC + P.ACC_SD * gauss()));
  // 勢力
  const F = {};
  const start = facs.map(() => 100 + (r() - 0.5) * 24); const m0 = start.reduce((a, b) => a + b, 0) / start.length;
  facs.forEach((f, i) => {
    F[f] = { id: f, rel: start[i] - m0 + 100, tre: 0, inv: {}, made: { hb: 0, vw: 0, H2O: 0, NH3: 0, HF: 0, comp: 0 }, vwMass: 0, buys: 0, sells: 0, sellTo: {}, fr: {}, teamOk: 0, teamN: 0, push: 0, shield: 0, sab: 0, attacks: 0, mem: [] };
  });
  facs.forEach(a => facs.forEach(b => { if (a !== b) F[a].fr[b] = (g11 && ((a === 'co' && (b === 'hb' || b === 'vw')) || (b === 'co' && (a === 'hb' || a === 'vw')))) ? 55 : 40; }));
  F.mine = { id: 'mine' };
  // 玩家
  const players = [];
  facs.forEach(f => {
    const base = size[f] <= 3 ? ROLES[f].map(() => 'flex') : (P.SMALL !== 0 && size[f] <= 5 ? ['leader'] : ['leader', 'knight', 'sage']).concat(ROLES[f].filter(x => g11 || x !== 'mystic'));
    for (let i = 0; i < size[f]; i++) {
      const p = { fac: f, origin: f, role: base[i] || ROLES[f].filter(x => g11 || x !== 'mystic')[i % ROLES[f].filter(x => g11 || x !== 'mystic').length], acc: acc(), wallet: P.START_COIN + Math.max(0, 100 - F[f].rel) * 1.5, inv: {}, correct: 0, roleOut: 0, spy: false, sec: null, secN: 0, lastStrong: -9, sent: 0 };
      players.push(p); F[f].mem.push(p);
    }
  });
  // 雙面人：每個勢力藏進來的數量依人數表，來源輪流
  const spyN = n => n <= 3 ? 0 : n <= 6 ? 1 : n <= 8 ? 2 : n <= 10 ? 3 : 4;
  if (P.spies) {
    const k = Math.min(...facs.map(f => spyN(size[f])));
    facs.forEach((f, i) => {
      const cand = F[f].mem.filter(p => p.role !== 'leader' && !p.spy);
      for (let j = 0; j < k; j++) {
        const p = cand.splice(Math.floor(r() * cand.length), 1)[0];
        const origin = facs[(i + 1 + j) % facs.length] === f ? facs[(i + 2 + j) % facs.length] : facs[(i + 1 + j) % facs.length];
        p.spy = true; p.origin = origin;
        const S = ['haul', 'weaken', 'block', 'drain', 'split', 'slack']; p.sec = S[Math.floor(r() * S.length)];
        p.target = facs.filter(x => x !== f)[Math.floor(r() * (facs.length - 1))];
      }
    });
  }
  // 門檻依勢力人數等比例調整（基準：高二高三版三大國 5 人、兩聯邦 6 人；高一版每國 9 人）
  if (P.SCALE) {
    const ref = f => g11 ? (f === 'hb' || f === 'vw' ? 6 : 5) : 9, k = f => !size[f] ? 1 : (size[f] - (P.spies ? spyN(size[f]) * 0 + F[f].mem.filter(p => p.spy).length : 0)) / (ref(f) - (P.spies ? 1 : 0) * (g11 ? 1 : 3)) * (P.DIFF || 1);
    P = Object.assign({}, P, { CO_N: Math.round(P.CO_N * k('co')), IO_N: Math.round(P.IO_N * k('io')), ME_X: Math.round(P.ME_X * k('me') / 10) * 10, HB_N: Math.max(2, Math.round(P.HB_N * k('hb'))), VW_X: Math.round(P.VW_X * k('vw') / 10) * 10 });
  }
  // 鍵結社
  const bs = []; for (let i = 0; i < nb; i++) bs.push({ acc: acc(), wallet: P.START_COIN, correct: 0, done: 0 });
  const add = (inv, el, n = 1) => { inv[el] = (inv[el] || 0) + n; };
  const take = (inv, el) => { if (inv[el] > 0) { inv[el]--; return true; } return false; };
  const kinds = f => METALS.filter(m => F[f].inv[m] > 0).length;
  const relOf = f => F[f].rel;
  // 每個勢力想要的元素（分數越高越想要）
  function want(f, el) {
    const x = F[f], has = x.inv[el] || 0;
    if (f === 'me') return METALS.includes(el) ? (has ? 0.2 : 3) : 0.1;
    if (f === 'hb') { if (el === 'H') return 2.5 - Math.min(2, has * 0.4); if (HBX.includes(el)) { const k = { N: 'NH3', O: 'H2O', F: 'HF' }[el]; return 2 + (P.HB_N - x.made[k]) * 0.3 - has * 0.5; } return 0.1; }
    if (f === 'co') { if (el === 'H') return 2 - has * 0.3; if (HBX.includes(el)) return x.made.hb < P.CO_N ? 1.8 - has * 0.4 : 0.2; if (VWE.includes(el)) return x.made.vw < P.CO_N ? 1.8 - has * 0.4 : 0.2; return 0.1; }
    if (f === 'vw') { if (VWE.includes(el)) return 1 + VWMASS[el] / 80 - has * 0.3; return 0.1; }
    if (f === 'io') return 1;
    return 0.5;
  }
  const best = (f, list) => list.reduce((a, b) => want(f, b) > want(f, a) ? b : a);
  // 團隊任務
  const TT = ['correct', 'donate', 'make', 'friend', 'quick'];
  let round = 0, winner = null;
  const hist = [];
  const sabLog = [];
  for (round = 1; round <= 8 && !winner; round++) {
    facs.forEach(f => { const x = F[f]; x.push = 0; x.rc = 0; x.rDon = 0; x.rMake = 0; x.rFr = 0; x.rQ = 0; x.rQok = 0; x.shield = 0; x.task = TT[Math.floor(r() * TT.length)]; x.ftarget = facs.filter(y => y !== f)[Math.floor(r() * (facs.length - 1))]; x.fr0 = x.fr[x.ftarget]; x.sabs = []; });
    // 1. 答題與角色產出
    players.forEach(p => {
      const x = F[p.fac]; p.rc = 0;
      for (let q = 0; q < P.Q; q++) {
        const ok = r() < (p.role === 'mechanic' ? Math.pow(p.acc, 1.4) : p.acc);
        // 雙面人「怠工」故意答錯一些
        if (!ok) continue;
        if (p.spy && p.sec === 'slack' && r() < 0.5) continue;
        p.correct++; p.rc++; p.wallet += P.COIN; x.rc++;
        const honest = !p.spy || r() < P.SPY_HONEST;
        if (!honest) { if (p.role === 'miner') add(p.inv, ALL[Math.floor(r() * ALL.length)]); continue; }
        p.roleOut++;
        let role = p.role; if (role === 'flex') { const RL = ROLES[p.fac].filter(x => g11 || x !== 'mystic'); role = (p.cyc = (p.cyc || 0) + 1) % 3 === 0 ? 'leader' : RL[p.cyc % RL.length]; }
        switch (role) {
          case 'leader': x.push += 2; break;
          case 'knight': x.push += 1; break;
          case 'sage': x.push += 0.5; break;
          case 'assayer': x.push += 1; break;
          case 'miner': { const c = [0, 1, 2].map(() => ALL[Math.floor(r() * ALL.length)]); add(x.inv, best(p.fac, c)); break; }
          case 'forger': { const els = Object.keys(x.inv).filter(e => x.inv[e] > 0 && want(p.fac, e) < 1); if (els.length) { take(x.inv, els[0]); x.push += 2; x.made.comp++; x.rMake++; } else x.push += 0.5; break; }
          case 'builder': {
            let made = false;
            if (p.fac === 'hb' || p.fac === 'co') {
              const opts = HBX.filter(e => x.inv[e] > 0 && x.inv.H > 0).sort((a, b) => x.made[{ N: 'NH3', O: 'H2O', F: 'HF' }[a]] - x.made[{ N: 'NH3', O: 'H2O', F: 'HF' }[b]]);
              const needHb = p.fac === 'hb' || x.made.hb <= x.made.vw;
              if (needHb && opts.length) { take(x.inv, 'H'); take(x.inv, opts[0]); x.made.hb++; x.made[{ N: 'NH3', O: 'H2O', F: 'HF' }[opts[0]]]++; made = true; }
            }
            if (!made && (p.fac === 'co' || p.fac === 'vw' || p.fac === 'io' || p.fac === 'me')) {
              const v = VWE.filter(e => x.inv[e] > 0).sort((a, b) => VWMASS[b] - VWMASS[a]);
              if (v.length) { take(x.inv, v[0]); x.made.vw++; x.vwMass += VWMASS[v[0]]; made = true; }
            }
            if (made) x.rMake++; else x.push += 0.5;
            break;
          }
          case 'envoy': { const t = x.task === 'friend' ? x.ftarget : p.fac === 'co' ? (g11 ? (x.fr.hb < x.fr.vw ? 'hb' : 'vw') : x.ftarget) : p.fac === 'hb' || p.fac === 'vw' ? 'co' : x.ftarget; x.fr[t] = Math.min(100, x.fr[t] + 5); F[t].fr[p.fac] = x.fr[t]; if (t === x.ftarget) x.rFr += 5; break; }
          case 'mystic': { const a = x.task === 'friend' && (p.fac === 'co' || x.ftarget === 'co' || x.ftarget === 'hb' || x.ftarget === 'vw') ? x.ftarget : p.fac === 'co' ? (x.fr.hb < x.fr.vw ? 'hb' : 'vw') : 'co'; x.fr[a] = Math.min(100, x.fr[a] + 5); F[a].fr[p.fac] = x.fr[a]; if (a === x.ftarget) x.rFr += 5; break; }
          case 'mechanic': if (x.shield < 1) x.shield++; else x.push += 1; break;
        }
      }
      // 干擾快問：每人每回合約 2.7 題
      for (let q = 0; q < 3; q++) if (r() < 0.9) { x.rQ++; if (r() < p.acc) x.rQok++; }
    });
    // 2. 交易（每答對 1 題換 1 張交易許可，每回合最多 3 筆）
    players.forEach(p => {
      const x = F[p.fac]; let perm = P.PERMIT ? Math.min(3, p.rc) : 3;
      if (p.spy) {
        if (p.sec === 'haul') { while (perm > 0 && p.wallet >= P.BUY + 5) { p.wallet -= P.BUY; perm--; p.sent++; add(F[p.origin].inv, ALL[Math.floor(r() * ALL.length)]); } }
        return;
      }
      if (p.fac === 'io') {
        const others = facs.filter(f => f !== 'io');
        if (x.buys <= x.sells) { while (perm > 0 && p.wallet >= P.BUY) { p.wallet -= P.BUY; x.buys++; perm--; add(x.inv, JUNK[Math.floor(r() * JUNK.length)]); } }
        else {
          while (perm > 0 && x.sells < x.buys) {
            const el = Object.keys(x.inv).find(e => x.inv[e] > 0); if (!el) break;
            const t = others.slice().sort((a, b) => (x.sellTo[a] || 0) - (x.sellTo[b] || 0))[0];
            take(x.inv, el); add(F[t].inv, el); x.sells++; x.sellTo[t] = (x.sellTo[t] || 0) + 1; p.wallet += P.SELL; perm--;
            x.fr[t] = Math.min(100, x.fr[t] + 1); F[t].fr.io = x.fr[t];
          }
        }
        return;
      }
      // 其他勢力：買自己最需要的元素（留一點錢捐國庫）
      const reserve = p.fac === 'me' ? 20 : 10;
      let n = Math.min(perm, p.fac === 'me' ? 1 : 2);
      while (n > 0 && p.wallet >= P.BUY + reserve) {
        const c = ALL.filter(e => want(p.fac, e) >= 1.5); if (!c.length) break;
        const el = best(p.fac, c.slice(0, 40)); p.wallet -= P.BUY; add(x.inv, el); n--;
      }
    });
    // 3. 捐國庫
    players.forEach(p => { if (p.spy) return; const k = p.fac === 'me' ? 0.85 : 0.4, d = Math.floor(p.wallet * k); p.wallet -= d; F[p.fac].tre += d; F[p.fac].rDon += d; });
    // 4. 雙面人的能力
    players.filter(p => p.spy).forEach(p => {
      const h = F[p.fac];
      const strongOK = p.correct >= P.SP_UNLOCK && round - p.lastStrong >= 3 && p.wallet >= P.SP_C2;
      let act = null;
      if (p.sec === 'weaken' || p.sec === 'block' || p.sec === 'slack') act = strongOK && p.sec !== 'slack' ? 'drag' : 'swap';
      else if (p.sec === 'drain') act = 'steal';
      else if (p.sec === 'split') act = strongOK ? 'rumor' : 'swap';
      else act = 'steal';
      const cost = act === 'drag' || act === 'rumor' ? P.SP_C2 : P.SP_C1;
      if (p.wallet < cost) return;
      p.wallet -= cost; if (cost === P.SP_C2) p.lastStrong = round;
      h.sabs.push({ p, act });
    });
    facs.forEach(f => {
      const h = F[f];
      h.sabs.forEach(({ p, act }) => {
        if (h.shield > 0) { h.shield--; sabLog.push('blocked'); return; }
        sabLog.push(act);
        if (act === 'swap') { const els = Object.keys(h.inv).filter(e => h.inv[e] > 0).sort((a, b) => want(f, b) - want(f, a)); if (els.length) { take(h.inv, els[0]); add(h.inv, 'He'); } else if (f === 'hb') { const k = ['H2O', 'NH3', 'HF'].sort((a, b) => h.made[b] - h.made[a])[0]; if (h.made[k] > 0) { h.made[k]--; } } }
        if (act === 'steal') { const s = Math.min(P.SP_STEAL, h.tre); h.tre -= s; F[p.origin].tre += s; }
        if (act === 'drag') h.push -= P.SP_DRAG;
        if (act === 'rumor') { const t = p.target; h.fr[t] = Math.max(0, h.fr[t] - P.SP_RUMOR); F[t].fr[f] = h.fr[t]; }
      });
    });
    // 5. 守護騎士出兵
    facs.forEach(f => {
      const x = F[f], wantPow = f === 'vw' || (!g11 && f === 'co') || x.rel < 85;
      if (!wantPow || x.tre < P.ATK_COST + (f === 'me' ? P.ME_X : 0)) return;
      const t = facs.filter(y => y !== f).sort((a, b) => F[b].rel - F[a].rel)[0];
      x.tre -= P.ATK_COST; x.rel += P.ATK; F[t].rel -= P.ATK; x.attacks++;
    });
    // 6. 鍵結社：接委託（幫最弱的）＋暗中行動
    const extra = {}; facs.forEach(f => { extra[f] = hist.length && hist[hist.length - 1].team[f] ? 1 : 0; });
    bs.forEach(b => {
      for (let q = 0; q < P.Q; q++) {
        if (r() >= b.acc) continue; b.correct++; b.wallet += 10;
        const offers = facs.filter(f => 1 + extra[f] > 0);
        const t = offers.sort((a, c) => F[a].rel - F[c].rel)[0]; F[t].push += 3; b.done++;
      }
      const o = facs.slice().sort((a, c) => F[a].rel - F[c].rel), lo = o[0], hi = o[o.length - 1];
      if (b.wallet >= 12) { if (F[hi].rel - F[lo].rel > 20 || F[hi].rel > 120) { F[hi].rel -= 4; b.wallet -= 12; } else if (F[lo].rel < 85) { F[lo].rel += 4; b.wallet -= 12; } }
    });
    // 7. 國力消長（零和）
    const mp = facs.reduce((a, f) => a + F[f].push, 0) / facs.length, mr = facs.reduce((a, f) => a + F[f].rel, 0) / facs.length;
    facs.forEach(f => { const x = F[f]; x.rel += P.C * (x.push - mp) + P.MOM * (x.rel - mr) + (r() - 0.5) * 2 * P.NOISE; });
    const m2 = facs.reduce((a, f) => a + F[f].rel, 0) / facs.length; facs.forEach(f => { F[f].rel = Math.max(20, F[f].rel - m2 + 100); });
    if (P.FR_DECAY) facs.forEach(a => facs.forEach(b => { if (a < b) { const v = Math.max(0, F[a].fr[b] - P.FR_DECAY); F[a].fr[b] = F[b].fr[a] = v; } }));
    // 8. 團隊任務
    const team = {};
    facs.forEach(f => {
      const x = F[f], m = x.mem.length; let ok = false;
      if (x.task === 'correct') ok = x.rc >= Math.ceil(m * P.Q * P.T_CORRECT);
      if (x.task === 'donate') ok = x.rDon >= m * P.T_DONATE;
      if (x.task === 'make') ok = x.rMake + 0 >= Math.ceil(m * P.T_MAKE);
      if (x.task === 'friend') ok = x.fr[x.ftarget] - x.fr0 >= P.T_FRIEND;
      if (x.task === 'quick') ok = x.rQ && x.rQok / x.rQ >= P.T_QUICK;
      x.teamN++; if (ok) x.teamOk++; team[f] = ok; x.tt = x.tt || {}; const tt = x.tt[x.task] = x.tt[x.task] || [0, 0]; tt[1]++; if (ok) tt[0]++;
    });
    // 9. 勝利條件
    const prog = {}; const terr = f => F[f].rel / facs.reduce((a, y) => a + F[y].rel, 0) * 100;
    facs.forEach(f => {
      const x = F[f]; let parts;
      if (f === 'co') parts = g11 ? [x.made.hb / P.CO_N, x.made.vw / P.CO_N, x.fr.hb / P.CO_F, x.fr.vw / P.CO_F] : [x.made.hb / P.CO_N, x.made.vw / P.CO_N, terr(f) / P.CO_TERR];
      if (f === 'io') { const o = facs.filter(y => y !== 'io'); parts = [Math.min(x.buys, x.sells) / P.IO_N, ...o.map(y => (x.sellTo[y] || 0) / P.IO_M), x.buys === x.sells ? 1 : 0.99]; }
      if (f === 'me') parts = [x.tre / P.ME_X, kinds(f) / P.ME_K];
      if (f === 'hb') parts = [x.made.H2O / P.HB_N, x.made.NH3 / P.HB_N, x.made.HF / P.HB_N, x.fr.co / P.HB_F];
      if (f === 'vw') parts = [x.vwMass / P.VW_X, x.rel / P.VW_R];
      prog[f] = Math.min(...parts.map(v => Math.min(1, v)));
    });
    hist.push({ team, prog, rel: Object.fromEntries(facs.map(f => [f, F[f].rel])) });
    const win = facs.filter(f => prog[f] >= 1);
    win.forEach(f => { if (!F[f].done) F[f].done = round; });
    if (win.length && !P.noEnd) winner = win.sort((a, b) => F[b].rel - F[a].rel)[0];
  }
  round--;
  const rels = facs.map(f => F[f].rel);
  let bsWin = false;
  if (!winner && round === 8) {
    bsWin = bs.length > 0 && rels.every(v => v >= P.BS_LO && v <= P.BS_HI) && Math.max(...rels) - Math.min(...rels) <= P.BS_SPREAD;
    if (bsWin) winner = 'bs';
  }
  // 計分
  const last = hist[hist.length - 1].prog;
  const corr = players.map(p => p.correct).sort((a, b) => a - b), pn = corr[Math.floor(corr.length * P.PN)];
  players.forEach(p => {
    const x = F[p.fac], rate = x.teamOk / x.teamN;
    p.personal = p.correct >= pn * round / 8;
    p.pts = (p.personal ? P.PT_OK : -P.PT_NO) + rate * P.TW - (1 - rate) * P.TL + p.correct * P.CW;
    if (p.spy) {
      const h = F[p.fac];
      const okSec = p.sec === 'haul' ? p.sent >= P.SEC.haul : p.sec === 'weaken' ? h.rel < P.SEC.weaken : p.sec === 'block' ? winner !== p.fac && last[p.fac] < P.SEC.block / 100 : p.sec === 'drain' ? h.tre < P.SEC.drain : p.sec === 'split' ? (P.SPLIT_LOW ? Object.keys(h.fr).every(o => h.fr[p.target] <= h.fr[o]) && h.fr[p.target] < P.SPLIT_LOW : h.fr[p.target] <= P.SEC.split) : (h.teamOk / h.teamN) * 100 <= P.SEC.slack;
      p.secOk = okSec; if (okSec) p.pts += P.ST;
      p.secVal = p.sec === 'haul' ? p.sent : p.sec === 'weaken' ? h.rel : p.sec === 'block' ? (winner === p.fac ? 999 : last[p.fac] * 100) : p.sec === 'drain' ? h.tre : p.sec === 'split' ? h.fr[p.target] : (h.teamOk / h.teamN) * 100;
    }
  });
  const fscore = {};
  facs.forEach(f => {
    const mem = players.filter(p => p.origin === f), avg = mem.reduce((a, p) => a + p.pts, 0) / mem.length;
    fscore[f] = Math.round((F[f].rel - 100) * P.PW + avg + (winner === f ? P.V : 0));
  });
  const topF = facs.slice().sort((a, b) => fscore[b] - fscore[a])[0];
  return { winner, round, rels, fscore, topF, players, F, facs, hist, sabLog, size, bsWin, bs, g11, thr: { CO_N: P.CO_N, IO_N: P.IO_N, ME_X: P.ME_X, HB_N: P.HB_N, VW_X: P.VW_X } };
}

function run(over = {}) {
  const P = Object.assign({}, DEF, over); P.SEC = Object.assign({}, DEF.SEC, over.SEC || {});
  const r = rng(P.seed * 7919 + 13);
  const A = { games: 0, win: {}, endR: {}, top: 0, topN: 0, team: {}, teamN: {}, sec: {}, secN: {}, personal: 0, pN: 0, sab: {}, size: null, prog8: {}, mpRank: 0, mpRankN: 0, corr: [], bsSpread: [] };
  for (let g = 0; g < P.games; g++) {
    const R = play(P, r); A.games++; A.size = R.size;
    A.win[R.winner || 'none'] = (A.win[R.winner || 'none'] || 0) + 1;
    A.endR[R.round] = (A.endR[R.round] || 0) + 1;
    A.done = A.done || {}; R.facs.forEach(f => { A.done[f] = A.done[f] || []; A.done[f].push(R.F[f].done || 99); });
    if (R.winner && R.winner !== 'bs') { A.topN++; if (R.topF === R.winner) A.top++; }
    R.facs.forEach(f => { A.tt = A.tt || {}; Object.entries(R.F[f].tt || {}).forEach(([k, v]) => { const a = A.tt[k] = A.tt[k] || [0, 0]; a[0] += v[0]; a[1] += v[1]; }); A.team[f] = (A.team[f] || 0) + R.F[f].teamOk; A.teamN[f] = (A.teamN[f] || 0) + R.F[f].teamN; });
    R.players.forEach(p => { A.pN++; if (p.personal) A.personal++; A.corr.push(p.correct); if (p.spy) { A.secV = A.secV || {}; (A.secV[p.sec] = A.secV[p.sec] || []).push(p.secVal); A.secN[p.sec] = (A.secN[p.sec] || 0) + 1; if (p.secOk) A.sec[p.sec] = (A.sec[p.sec] || 0) + 1; } });
    R.sabLog.forEach(s => { A.sab[s] = (A.sab[s] || 0) + 1; });
    if (R.round === 8 && (!R.winner || R.winner === 'bs')) A.bsSpread.push(Math.max(...R.rels) - Math.min(...R.rels));
  }
  return { P, A };
}
function report(res, label = '') {
  const { A } = res, n = A.games, pc = x => Math.round((x || 0) / n * 100) + '%';
  const facs = Object.keys(A.team);
  const out = [];
  out.push(`== ${label} 人數 ${JSON.stringify(A.size)}`);
  out.push('勝利：' + [...facs, 'bs', 'none'].map(f => `${f} ${pc(A.win[f])}`).join('｜'));
  out.push('結束回合：' + Object.keys(A.endR).sort((a, b) => a - b).map(k => `${k}:${pc(A.endR[k])}`).join(' '));
  out.push(`勝利勢力總分第一：${Math.round(A.top / Math.max(1, A.topN) * 100)}%`);
  out.push('團隊任務完成率：' + facs.map(f => `${f} ${Math.round(A.team[f] / A.teamN[f] * 100)}%`).join(' '));
  out.push(`個人任務完成：${Math.round(A.personal / A.pN * 100)}%`);
  if (A.done) out.push('各勢力 8 回合內自己能達成：' + facs.map(f => { const d = A.done[f]; const by = k => Math.round(d.filter(x => x <= k).length / d.length * 100); return `${f} ${by(8)}%(≤6:${by(6)}%)`; }).join(' '));
  const cs = A.corr.slice().sort((a, b) => a - b); out.push(`每人答對題數 P25/P50/P75：${cs[Math.floor(cs.length * .25)]}/${cs[Math.floor(cs.length * .5)]}/${cs[Math.floor(cs.length * .75)]}`);
  if (Object.keys(A.secN).length) out.push('秘密任務完成：' + Object.keys(A.secN).map(k => `${k} ${Math.round((A.sec[k] || 0) / A.secN[k] * 100)}%`).join(' '));
  return out.join('\n');
}
module.exports = { run, report, play, DEF };
if (require.main === module) {
  const over = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  console.log(report(run(over), JSON.stringify(over)));
}
