/* =========================================================
   隱秘的鍵結社 —— 連線版引擎（第三階段，2026-10-15）
   ---------------------------------------------------------
   老師的控制台是「權威主機」：整局狀態 R 只在老師端，學生送出「動作」，
   老師端用 MPE.act() 處理、MPE.settle() 結算，再把 MPE.views() 產生的畫面資料寫回雲端。
   規格：Claude 專案《隱秘的鍵結社 多人連線版規格書》v0.6；數字來自 dev/ 的平衡模擬
   ========================================================= */
const MPE = (() => {
  const Wd = typeof WORLD !== 'undefined' ? WORLD : require('./world.js');
  const TB = typeof MPDATA !== 'undefined' ? MPDATA : require('./mp-data.js');
  const FN = Wd.FACTIONS;

  /* ---------- 常數 ---------- */
  const K = {
    ROUND_SEC: 240, ROUNDS: 8, COIN: 8, START_COIN: 30, BUY_ADD: 2, ATK_COST: 30, ATK: 3, C: 0.6, MOM: 0.10, NOISE: 4,
    SP_C1: 10, SP_C2: 20, SP_UNLOCK: 6, SP_STEAL: 15, SP_DRAG: 4, SP_RUMOR: 10, BS_COST: 12, BS_SHIFT: 4, BS_PAY: 10,
    PT_OK: 40, PT_NO: 10, TW: 25, TL: 15, ST: 40, PERSONAL_N: 15, QUICK_OK: 5,
    DIFF: { easy: 0.88, normal: 1, hard: 1.12 }
  };
  const METALS = ['Li', 'Na', 'K', 'Mg', 'Ca', 'Al', 'Fe', 'Cu', 'Zn', 'Ni', 'Cr', 'Mn', 'Co', 'Ti'];
  const HBX = ['N', 'O', 'F'], VWE = ['C', 'S', 'Cl', 'Br', 'P', 'Si'], JUNK = ['B', 'He', 'Ne', 'Ar', 'Se', 'Ga', 'Ge', 'As', 'Kr', 'Be', 'Sc', 'V'];
  const ALL = [...METALS, 'H', ...HBX, ...VWE, ...JUNK];
  const VEINS = {
    metal: { name: '金屬礦脈', els: METALS, icon: '🪙' },
    hbond: { name: '氫鍵礦脈（H、N、O、F）', els: ['H', 'H', 'N', 'O', 'F'], icon: '💧' },
    nonmetal: { name: '非金屬礦脈（C、S、P、Si、Cl、Br）', els: VWE, icon: '🪨' },
    any: { name: '綜合礦脈（什麼都可能）', els: ALL, icon: '🎲' }
  };
  // 分子：氫鍵型（H＋N/O/F）與凡得瓦型（遊戲簡化：只消耗主要元素）
  const MOLS = {
    H2O: { f: 'H₂O', type: 'hb', need: ['H', 'O'], m: 18 }, NH3: { f: 'NH₃', type: 'hb', need: ['H', 'N'], m: 17 }, HF: { f: 'HF', type: 'hb', need: ['H', 'F'], m: 20 },
    CH4: { f: 'CH₄', type: 'vw', need: ['C'], m: 16 }, SO2: { f: 'SO₂', type: 'vw', need: ['S'], m: 64 }, Cl2: { f: 'Cl₂', type: 'vw', need: ['Cl'], m: 71 },
    Br2: { f: 'Br₂', type: 'vw', need: ['Br'], m: 160 }, PCl3: { f: 'PCl₃', type: 'vw', need: ['P'], m: 137 }, SiCl4: { f: 'SiCl₄', type: 'vw', need: ['Si'], m: 170 }
  };
  const PRICE0 = el => METALS.includes(el) ? 12 : ['H', 'N', 'O', 'F'].includes(el) ? 10 : el === 'Br' ? 16 : VWE.includes(el) ? 12 : 6;
  // 角色
  const ROLE = {
    leader: { name: '大煉金師', icon: '👑', tags: ['concept', 'bond', 'app'], does: '答對觀念題提升國力；決定勢力行動' },
    knight: { name: '守護騎士', icon: '🛡️', tags: ['concept', 'mp', 'trend'], does: '答對提升國力；可花國庫 30 攻占敵國 1 格' },
    sage: { name: '智者', icon: '🦉', tags: ['concept', 'app', 'bond'], does: '本回合完成團隊任務後，可以多發委託給鍵結社' },
    miner: { name: '尋礦者', icon: '⛏️', tags: ['pos', 'val', 'prop', 'trend'], does: '選礦脈 → 答對得到 1 份元素' },
    forger: { name: '鑄晶師', icon: '⚒️', tags: ['formula', 'name', 'ion', 'poly'], does: '答對把倉庫的 1 份元素鑄成化合物，提升國力' },
    assayer: { name: '試金師', icon: '🔍', tags: ['detect', 'app', 'bond'], does: '答對提升國力，並得到 1 次情報偵察（看任一勢力的勝利進度）' },
    builder: { name: '結構師', icon: '🧱', tags: ['lewis', 'struct', 'imf'], does: '選分子 → 答對用倉庫的元素做出分子；也可以建城牆' },
    envoy: { name: '盟約使', icon: '📜', tags: ['balance'], does: '選勢力 → 答對友好度 +5' },
    mechanic: { name: '機巧師', icon: '⚙️', tags: ['eng'], does: '答對工程題得到 1 面盾牌，擋下本回合 1 次破壞（每回合最多 1 面）' },
    mystic: { name: '秘學者', icon: '📖', tags: ['imf', 'mp'], does: '選兩國 → 答對讓兩國友好度 +5（要有聯邦）' },
    flex: { name: '萬能學徒', icon: '🌀', tags: [], does: '人很少的勢力：每題自己選要做哪個角色的工作' },
    bs: { name: '燭影使', icon: '🕯️', tags: [], does: '接各國的委託、暗中資助或散播謠言，讓天下保持均勢' }
  };
  const ROT = {
    co: ['builder', 'envoy', 'builder', 'mystic', 'miner', 'forger', 'mechanic', 'assayer', 'envoy'],
    io: ['miner', 'forger', 'envoy', 'mechanic', 'assayer', 'builder', 'miner', 'forger', 'envoy'],
    me: ['miner', 'miner', 'forger', 'mechanic', 'assayer', 'envoy', 'forger', 'miner', 'builder'],
    hb: ['miner', 'builder', 'envoy', 'mystic', 'mechanic', 'miner', 'builder', 'assayer', 'forger'],
    vw: ['builder', 'miner', 'forger', 'builder', 'mechanic', 'envoy', 'miner', 'assayer', 'forger']
  };
  const SECRET = {
    haul: { name: '📦 搬運', text: n => `把元素送回母國（交易所「送回母國」）至少 ${n} 份` },
    weaken: { name: '📉 削弱', text: n => `遊戲結束時，潛伏國的相對國力低於 ${n}%` },
    block: { name: '🚧 阻撓', text: n => `潛伏國沒有達成勝利條件，而且進度低於 ${n}%` },
    drain: { name: '💸 散財', text: n => `遊戲結束時，潛伏國國庫低於 ${n} 金幣` },
    split: { name: '🗡️ 離間', text: (n, t) => `遊戲結束時，潛伏國和${FN[t].name}的友好度不超過 ${n}` },
    slack: { name: '😴 怠工', text: n => `潛伏國的團隊任務完成率不超過 ${n}%` }
  };
  const ABIL = {
    swap: { name: '🔄 掉包', cost: K.SP_C1, strong: false, text: '把潛伏國倉庫最有用的 1 份東西換成沒用的元素' },
    leak: { name: '📣 走漏', cost: K.SP_C1, strong: false, text: '把潛伏國的國庫與勝利進度傳給母國的大煉金師' },
    steal: { name: '🪙 挪用', cost: K.SP_C1, strong: false, text: `從潛伏國國庫拿走 ${K.SP_STEAL} 金幣，暗中轉進母國國庫` },
    rumor: { name: '🗯️ 造謠', cost: K.SP_C2, strong: true, text: `潛伏國和指定勢力的友好度 −${K.SP_RUMOR}` },
    drag: { name: '🪢 扯後腿', cost: K.SP_C2, strong: true, text: `潛伏國本回合國力推進 −${K.SP_DRAG}` }
  };
  const TEAM = {
    correct: { text: n => `全隊本回合合計答對 ${n} 題` },
    donate: { text: n => `全隊本回合捐進國庫 ${n} 金幣` },
    make: { text: n => `本回合做出 ${n} 個化合物或分子` },
    friend: { text: (n, t) => `本回合和${FN[t].name}的友好度提升 ${n}` },
    quick: { text: () => '本回合全隊干擾快問答對率 ≥ 68%' }
  };

  /* ---------- 小工具 ---------- */
  // 時間一律用「伺服器時間」：老師端與學生端各自量出和 Firebase 伺服器的時差，避免手機時鐘不準
  let OFF = 0; const now = () => Date.now() + OFF; const setOffset = o => { OFF = Number(o) || 0; };
  const rng = R => Wd.rngFrom(R);
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const add = (inv, el, n = 1) => { inv[el] = (inv[el] || 0) + n; if (inv[el] <= 0) delete inv[el]; };
  const has = (inv, el) => (inv[el] || 0) > 0;
  const facOf = (R, sid) => (R.players[sid] || {}).fac;
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const kinds = inv => METALS.filter(m => has(inv, m)).length;
  const log = (R, f, t) => { const L = R.F[f].log; L.unshift({ r: R.round, t }); if (L.length > 30) L.length = 30; };
  const feed = (R, t) => { R.feed.unshift({ at: now(), t }); if (R.feed.length > 40) R.feed.length = 40; };
  const msg = (p, t) => { p.msgs = p.msgs || []; p.msgs.unshift({ at: now(), t }); if (p.msgs.length > 12) p.msgs.length = 12; };

  /* ---------- 開房 ---------- */
  function newRoom({ room, level = 'g11', diff = 'normal', code } = {}) {
    const seed = code ? Wd.seedOf(code) : Math.floor(Math.random() * 36 ** 6);
    return { v: 1, room, level, diff, seed, code: Wd.codeOf(seed), rs: (seed * 2654435761) >>> 0, phase: 'lobby', round: 0, created: now(), lobby: {}, players: {}, feed: [] };
  }
  function join(R, { sid, name, cls, seat }) {
    if (!sid) return null;
    R.lobby[sid] = { sid, name: String(name || '').slice(0, 12), cls: String(cls || '').slice(0, 10), seat: Math.max(0, Math.min(99, +seat || 0)), at: now() };
    if (R.phase !== 'lobby' && !R.players[sid]) lateJoin(R, sid);
    return R.lobby[sid];
  }
  // 人數 → 鍵結社、勢力、每國人數
  function layout(level, N) {
    const nb = N >= 20 ? Math.max(2, Math.min(3, Math.round(N / 10))) : N >= 10 ? 1 : 0, rest = N - nb;
    const g11 = level === 'g11' && rest >= 20;   // 高二高三版 ≥22 人才開五勢力
    const facs = g11 ? ['co', 'io', 'me', 'hb', 'vw'] : ['co', 'io', 'me'];
    const size = {};
    if (g11) { const b = Math.floor((rest - 2) / 5); facs.forEach(f => size[f] = b + (f === 'hb' || f === 'vw' ? 1 : 0)); let left = rest - facs.reduce((a, f) => a + size[f], 0); for (const f of ['hb', 'vw', 'co', 'io', 'me']) { if (left <= 0) break; size[f]++; left--; } }
    else { const b = Math.floor(rest / 3); facs.forEach(f => size[f] = b); let left = rest - 3 * b; for (const f of facs) { if (left <= 0) break; size[f]++; left--; } }
    return { nb, g11, facs, size };
  }
  const spyN = n => n <= 3 ? 0 : n <= 6 ? 1 : n <= 8 ? 2 : n <= 10 ? 3 : 4;
  const rolesFor = (f, n, g11) => {
    const rot = ROT[f].filter(x => g11 || x !== 'mystic');
    if (n <= 3) return Array(n).fill('flex').map((x, i) => i === 0 ? 'leader+flex' : 'flex');
    const head = n <= 5 ? ['leader'] : ['leader', 'knight', 'sage'];
    return Array.from({ length: n }, (_, i) => head[i] || rot[(i - head.length) % rot.length]);
  };
  function thresholds(R, N) {
    const row = TB.TABLE[R.g11 ? 'g11' : 'g10'][Math.max(3, Math.min(50, N))] || TB.TABLE.g10[30];
    const d = K.DIFF[R.diff] || 1, T = { ...row, IO_M: 2 };
    ['CO_N', 'IO_N', 'HB_N'].forEach(k => { if (T[k] != null) T[k] = Math.max(1, Math.round(T[k] * d)); });
    ['ME_X', 'VW_X'].forEach(k => { if (T[k] != null) T[k] = Math.max(10, Math.round(T[k] * d / 10) * 10); });
    T.BS = R.g11 ? { lo: 85, hi: 115, spread: 18 } : { lo: 90, hi: 110, spread: 10 };
    T.PW = R.g11 ? 4 : 5; T.V = R.g11 ? 35 : 15;
    T.SEC = Object.assign({ haul: 9, split: 50, slack: 55, drain: 300, block: 85, weaken: 99 }, T.SEC || {});
    return T;
  }
  // 老師按「開始分配」
  function start(R) {
    const r = rng(R), sids = Object.keys(R.lobby);
    for (let i = sids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sids[i], sids[j]] = [sids[j], sids[i]]; }
    const N = sids.length, L = layout(R.level, N);
    Object.assign(R, { g11: L.g11, facs: L.facs, N, size: L.size, round: 0 });
    R.T = thresholds(R, N);
    // 勢力
    R.F = {};
    const st = L.facs.map(() => 100 + (r() - 0.5) * 24), m0 = mean(st);
    L.facs.forEach((f, i) => {
      R.F[f] = { rel: Math.round((st[i] - m0 + 100) * 10) / 10, tre: 0, inv: {}, made: { hb: 0, vw: 0, H2O: 0, NH3: 0, HF: 0, comp: 0 }, mols: {}, vwMass: 0, buys: 0, sells: 0, sellTo: {}, fr: {}, teamOk: 0, teamN: 0, push: 0, shield: 0, walls: 0, sabs: [], log: [], mem: [], spiesIn: [], spiesOut: [], prog: 0, parts: [], evBonus: 0 };
    });
    L.facs.forEach(a => L.facs.forEach(b => { if (a !== b) R.F[a].fr[b] = (R.g11 && ((a === 'co' && (b === 'hb' || b === 'vw')) || (b === 'co' && (a === 'hb' || a === 'vw')))) ? 55 : 40; }));
    // 地圖（領土跟著國力）
    const map = Wd.makeMap(R.seed, L.facs);
    R.owner = map.owner.slice();
    Wd.redraw(pseudo(R), map, 99);
    // 玩家
    R.players = {}; R.bs = [];
    let k = 0;
    const mk = (sid, extra) => { const l = R.lobby[sid]; R.players[sid] = { sid, name: l.name, cls: l.cls, seat: l.seat, wallet: K.START_COIN, correct: 0, rc: 0, permits: 0, trades: 0, stash: {}, sent: 0, cnt: { mined: {}, comp: 0, mol: 0, walls: 0, intel: 0, intelTok: 0, attacks: 0, issued: 0, repairs: 0, friend: 0, bsDone: 0, quick: 0, quickOk: 0, roleOk: 0 }, msgs: [], ack: {}, ...extra }; };
    for (let i = 0; i < L.nb; i++) mk(sids[k++], { fac: 'bs', origin: 'bs', role: 'bs' });
    R.bs = sids.slice(0, L.nb);
    L.facs.forEach(f => {
      const roles = rolesFor(f, L.size[f], L.g11);
      for (let i = 0; i < L.size[f]; i++) {
        const sid = sids[k++], role = roles[i];
        mk(sid, { fac: f, origin: f, role: role === 'leader+flex' ? 'flex' : role, leader: role === 'leader' || role === 'leader+flex', merged: role === 'leader' && L.size[f] <= 5 });
        R.F[f].mem.push(sid);
      }
      const weak = Math.max(0, 100 - R.F[f].rel); R.F[f].mem.forEach(sid => { R.players[sid].wallet += Math.round(weak * 1.5); });
    });
    // 雙面人：每國藏一樣多，來源輪流
    const ks = Math.min(...L.facs.map(f => spyN(L.size[f])));
    const SKEYS = Object.keys(SECRET);
    L.facs.forEach((f, i) => {
      const cand = R.F[f].mem.filter(sid => !R.players[sid].leader);
      for (let j = 0; j < ks && cand.length; j++) {
        const sid = cand.splice(Math.floor(r() * cand.length), 1)[0], p = R.players[sid];
        let origin = L.facs[(i + 1 + j) % L.facs.length]; if (origin === f) origin = L.facs[(i + 2 + j) % L.facs.length];
        const others = L.facs.filter(x => x !== f);
        Object.assign(p, { spy: true, origin, sec: SKEYS[Math.floor(r() * SKEYS.length)], target: others[Math.floor(r() * others.length)], lastStrong: -9, abilRound: 0 });
        R.F[f].spiesIn.push(sid); R.F[origin].spiesOut.push(sid);
      }
    });
    // 市場
    R.market = Object.fromEntries(ALL.map(e => [e, { p: PRICE0(e), b: 0, s: 0 }]));
    R.history = []; R.news = null; R.feed = []; R.winner = null; R.final = null;
    R.phase = 'intro';
    feed(R, `分配完成：${N} 人，${L.facs.map(f => `${FN[f].name} ${L.size[f]} 人`).join('、')}${L.nb ? `，鍵結社 ${L.nb} 人` : ''}`);
    return R;
  }
  // 晚到的人：加入人數最少的勢力，當一般成員
  function lateJoin(R, sid) {
    if (!R.F) return;
    const f = R.facs.slice().sort((a, b) => R.F[a].mem.length - R.F[b].mem.length)[0], l = R.lobby[sid];
    const rot = ROT[f].filter(x => R.g11 || x !== 'mystic'), role = R.F[f].mem.some(id => R.players[id] && R.players[id].role === 'flex') ? 'flex' : rot[R.F[f].mem.length % rot.length];   // 小勢力的晚到同學也當萬能學徒
    R.players[sid] = { sid, name: l.name, cls: l.cls, seat: l.seat, fac: f, origin: f, role, wallet: K.START_COIN, correct: 0, rc: 0, permits: 0, trades: 0, stash: {}, sent: 0, cnt: { mined: {}, comp: 0, mol: 0, walls: 0, intel: 0, intelTok: 0, attacks: 0, issued: 0, repairs: 0, friend: 0, bsDone: 0, quick: 0, quickOk: 0, roleOk: 0 }, msgs: [], ack: {}, late: true };
    R.F[f].mem.push(sid);
    feed(R, `${l.name} 加入了${FN[f].name}`);
  }
  const pseudo = R => ({ facs: R.facs, owner: R.owner, power: Object.fromEntries(R.facs.map(f => [f, R.F[f].rel])), base: Object.fromEntries(R.facs.map(f => [f, 100])) });

  /* ---------- 回合 ---------- */
  function beginRound(R) {
    const r = rng(R);
    R.round++; R.phase = 'act'; R.tEnd = now() + K.ROUND_SEC * 1000; R.paused = false; R.pauseLeft = 0;
    Object.values(R.players).forEach(p => { p.rc = 0; p.permits = 0; p.trades = 0; p.abilUsed = false; p.bsCovert = false; p.bsTook = 0; });
    R.facs.forEach(f => {
      const x = R.F[f], m = x.mem.length;
      Object.assign(x, { push: 0, rc: 0, rDon: 0, rMake: 0, rQ: 0, rQok: 0, shield: 0, sabs: [], issued: 0, attacked: false, frStart: { ...x.fr } });
      const canFriend = x.mem.some(sid => ['envoy', 'mystic', 'flex'].includes(R.players[sid].role));
      const types = ['correct', 'donate', 'make', 'quick'].concat(canFriend ? ['friend'] : []);
      const type = pick(r, types), target = pick(r, R.facs.filter(g => g !== f));
      const thr = type === 'correct' ? Math.ceil(m * 3 * 0.64) : type === 'donate' ? m * 9 : type === 'make' ? Math.max(1, Math.ceil(m * 0.19)) : type === 'friend' ? 4 : 68;
      x.team = { type, target, thr, prog: 0, done: false, text: TEAM[type].text(thr, target) };
    });
    // 鍵結社的委託：每國 1 件
    R.board = R.facs.map((f, i) => ({ id: `${R.round}-${i}`, from: f, tag: pick(r, ['concept', 'app', 'bond', 'pos', 'formula', 'name', 'detect', 'balance', 'lewis', 'mp', 'trend'].concat(R.g11 ? ['imf'] : [])), by: null, done: false }));
    R.event = null;
    feed(R, `第 ${R.round} 回合開始`);
  }
  // 學生的動作 → 回傳給學生看的結果文字
  function act(R, a) {
    if (!a || typeof a !== 'object' || typeof a.type !== 'string' || typeof a.sid !== 'string') return { ok: false };
    const p = R.players[a.sid];
    if (a.type === 'join') { join(R, a); return { ok: true }; }
    if (!p) return { ok: false, t: '你還沒有被分配到勢力，請等老師開始。' };
    if (a.id && p.ack[a.id]) return p.ack[a.id];
    const res = handle(R, p, a) || { ok: true };
    if (a.id) { p.ack[a.id] = res; const ks = Object.keys(p.ack); if (ks.length > 12) delete p.ack[ks[0]]; }
    return res;
  }
  const inAct = R => R.phase === 'act' && !R.paused && (!R.tEnd || now() <= R.tEnd + 3000);
  function handle(R, p, a) {
    const r = rng(R);
    if (a.type === 'quick') {
      if (p.fac === 'bs') return { ok: true };
      const x = R.F[p.fac]; p.cnt.quick++; x.rQ = (x.rQ || 0) + 1;
      if (a.ok) { p.cnt.quickOk++; x.rQok = (x.rQok || 0) + 1; p.wallet += K.QUICK_OK; return { ok: true, t: `⚡ 答對！💰+${K.QUICK_OK}` }; }
      if (a.timeout) { x.push -= 1; return { ok: false, t: '⚡ 沒作答，勢力國力推進 −1' }; }
      return { ok: false, t: '⚡ 答錯了' };
    }
    if (a.type === 'evans') { if (R.phase === 'event' && R.event && !R.event.reveal) { R.event.ans[p.sid] = String(a.pick).slice(0, 200); } return { ok: true }; }
    if (!inAct(R)) return { ok: false, t: '現在不是行動時間。' };
    if (p.fac === 'bs' && !['bsdo', 'bscovert'].includes(a.type)) return { ok: false, t: '鍵結社不能做這件事。' };
    const x = R.F[p.fac];
    switch (a.type) {
      case 'ans': return answer(R, p, a, r);
      case 'bsdo': {
        if (p.fac !== 'bs') return { ok: false };
        const c = (R.board || []).find(b => b.id === a.cid); if (!c || c.done) return { ok: false, t: '這件委託已經有人完成了。' };
        if (!a.ok) return { ok: false, t: '答錯了，委託還在，可以再試。' };
        c.done = true; c.by = p.sid; p.cnt.bsDone++; p.correct++; p.wallet += K.BS_PAY; R.F[c.from].push += 3;
        log(R, c.from, `鍵結社完成了我們的委託（國力推進 +3）`); feed(R, `🕯️ 鍵結社替${FN[c.from].name}完成一件委託`);
        return { ok: true, t: `委託完成！💰+${K.BS_PAY}，${FN[c.from].name}國力推進 +3` };
      }
      case 'bscovert': {
        if (p.fac !== 'bs' || p.bsCovert) return { ok: false, t: '每回合只能暗中行動一次。' };
        if (p.wallet < K.BS_COST) return { ok: false, t: '金幣不夠。' };
        if (!R.F[a.f]) return { ok: false };
        p.wallet -= K.BS_COST; p.bsCovert = true; R.covert = R.covert || []; R.covert.push({ f: a.f, d: a.kind === 'sub' ? K.BS_SHIFT : -K.BS_SHIFT });
        return { ok: true, t: `${a.kind === 'sub' ? '暗中資助' : '散播謠言'}：結算時${FN[a.f].name}相對國力 ${a.kind === 'sub' ? '+' : '−'}${K.BS_SHIFT}%` };
      }
      case 'buy': {
        const n = Math.max(1, Math.min(3, Math.floor(+a.n) || 1)), m = ALL.includes(a.el) && R.market[a.el]; if (!m) return { ok: false, t: '沒有這種元素。' };
        if (p.trades + n > Math.min(3, p.permits)) return { ok: false, t: `交易許可不夠（答對 1 題換 1 張，本回合最多 3 筆；你還剩 ${Math.max(0, Math.min(3, p.permits) - p.trades)} 張）。` };
        const cost = (m.p + K.BUY_ADD) * n; if (p.wallet < cost) return { ok: false, t: '金幣不夠。' };
        p.wallet -= cost; p.trades += n; m.b += n;
        if (p.spy && a.dest === 'stash') add(p.stash, a.el, n); else add(x.inv, a.el, n);
        if (p.fac === 'io' && !(p.spy && a.dest === 'stash')) x.buys += n;
        if (!(p.spy && a.dest === 'stash')) log(R, p.fac, `${p.name} 向採礦國買了 ${a.el}×${n}`);
        return { ok: true, t: `買到 ${a.el}×${n}（花 💰${cost}）` };
      }
      case 'sell': {
        const to = a.to, src = p.spy && a.from === 'stash' ? p.stash : x.inv;
        if (!ALL.includes(a.el)) return { ok: false, t: '沒有這種元素。' };
        if (!R.F[to] || to === p.fac) return { ok: false };
        if (!has(src, a.el)) return { ok: false, t: '倉庫沒有這個元素。' };
        if (p.trades + 1 > Math.min(3, p.permits)) return { ok: false, t: '交易許可不夠（答對 1 題換 1 張）。' };
        const m = R.market[a.el], price = m.p + Math.round((x.fr[to] - 40) / 20);
        add(src, a.el, -1); add(R.F[to].inv, a.el, 1); p.trades++; m.s++; p.wallet += price;
        if (p.fac === 'io') { x.sells++; x.sellTo[to] = (x.sellTo[to] || 0) + 1; }
        x.fr[to] = Math.min(100, x.fr[to] + 1); R.F[to].fr[p.fac] = x.fr[to];
        log(R, p.fac, `${p.name} 把 ${a.el} 賣給${FN[to].name}（💰${price}）`); log(R, to, `${FN[p.fac].name}賣給我們 ${a.el}`);
        if (p.spy && to === p.origin) p.sent++;
        return { ok: true, t: `賣出 ${a.el} 給${FN[to].name}，得到 💰${price}` };
      }
      case 'send': {   // 雙面人把私藏的元素送回母國（搬運）
        if (!p.spy || !ALL.includes(a.el) || !has(p.stash, a.el)) return { ok: false, t: '私藏裡沒有這個元素。' };
        if (p.trades + 1 > Math.min(3, p.permits)) return { ok: false, t: '交易許可不夠。' };
        add(p.stash, a.el, -1); add(R.F[p.origin].inv, a.el, 1); p.trades++; p.sent++;
        log(R, p.origin, `神秘商人送來 ${a.el}`);
        return { ok: true, t: `已把 ${a.el} 暗中送回${FN[p.origin].name}（搬運 ${p.sent}）` };
      }
      case 'donate': {
        const n = Math.max(0, Math.min(p.wallet, Math.floor(+a.n || 0))); if (!n) return { ok: false, t: '金額不對。' };
        p.wallet -= n; x.tre += n; x.rDon += n; if (x.team.type === 'donate') x.team.prog += n;
        log(R, p.fac, `${p.name} 捐了 💰${n} 進國庫`);
        if (!x.team.done && teamReached(x)) { x.team.done = true; log(R, p.fac, `🎉 團隊任務完成：${x.team.text}`); feed(R, `🎉 ${FN[p.fac].name}完成本回合的團隊任務`); }
        return { ok: true, t: `捐進國庫 💰${n}` };
      }
      case 'attack': {
        if (!(p.role === 'knight' || p.merged || (p.leader && p.role === 'flex'))) return { ok: false, t: '只有守護騎士（或兼任的大煉金師）可以出兵。' };
        if (x.attacked) return { ok: false, t: '本回合已經出兵過了。' };
        const t = a.to; if (!R.F[t] || t === p.fac) return { ok: false };
        if (x.tre < K.ATK_COST) return { ok: false, t: `國庫要有 💰${K.ATK_COST}。` };
        x.tre -= K.ATK_COST; x.attacked = true; p.cnt.attacks++;
        if (R.F[t].walls > 0) { R.F[t].walls--; log(R, t, `城牆擋下了${FN[p.fac].name}的進攻`); log(R, p.fac, `進攻${FN[t].name}被城牆擋下`); feed(R, `🧱 ${FN[t].name}的城牆擋下${FN[p.fac].name}的進攻`); return { ok: true, t: '對方的城牆擋下了這次進攻（國庫已花掉）。' }; }
        R.F[p.fac].rel += K.ATK; R.F[t].rel -= K.ATK;
        const cell = takeCell(R, p.fac, t);
        log(R, p.fac, `出兵攻占${FN[t].name}${cell != null ? '一個省分' : ''}`); log(R, t, `${FN[p.fac].name}攻打我們`); feed(R, `🛡️ ${FN[p.fac].name}出兵攻打${FN[t].name}`);
        return { ok: true, t: `出兵成功：國力 +${K.ATK}%，${FN[t].name} −${K.ATK}%`, cell };
      }
      case 'issue': {
        if (!(p.role === 'sage' || p.merged || (p.leader && p.role === 'flex'))) return { ok: false, t: '只有智者（或兼任的大煉金師）可以發委託。' };
        if (!x.team.done) return { ok: false, t: '本回合完成團隊任務後才能多發委託。' };
        if (x.issued >= 2) return { ok: false, t: '本回合最多多發 2 件。' };
        if (!R.bs.length) return { ok: false, t: '這一局沒有鍵結社。' };
        x.issued++; p.cnt.issued++;
        R.board.push({ id: `${R.round}-x${R.board.length}`, from: p.fac, tag: pick(r, ['concept', 'app', 'formula', 'name', 'balance', 'detect']), by: null, done: false, extra: true });
        feed(R, `🦉 ${FN[p.fac].name}的智者向鍵結社多發了一件委託`);
        return { ok: true, t: '委託已送到鍵結社的公告板。' };
      }
      case 'intel': {
        if (p.cnt.intelTok <= 0) return { ok: false, t: '沒有情報偵察的機會了（答對鑑定題可以得到）。' };
        const t = a.to; if (!R.F[t]) return { ok: false };
        p.cnt.intelTok--; p.cnt.intel++;
        const pr = progress(R, t);
        const text = `🔍 ${FN[t].name}的勝利進度 ${Math.round(pr.v * 100)}%：${pr.parts.map(q => `${q.l} ${q.have}/${q.need}`).join('；')}`;
        msg(p, text); return { ok: true, t: text };
      }
      case 'spy': return spyAct(R, p, a);
    }
    return { ok: false };
  }
  function takeCell(R, f, t) {
    const map = Wd.makeMap(R.seed, R.facs);
    const caps = Object.values(map.capitals);
    const c = map.cells.find(c => c.land && R.owner[c.i] === t && !caps.includes(c.i) && c.nb.some(j => R.owner[j] === f));
    if (!c) return null; R.owner[c.i] = f; return c.i;
  }
  // 答題
  function answer(R, p, a, r) {
    const x = R.F[p.fac];
    if (p.fac === 'bs') return { ok: false };
    if (!a.ok) return { ok: false, t: '答錯了，這題沒有成果。再接一題吧！' };
    p.correct++; p.rc++; p.permits++; p.wallet += K.COIN; x.rc++; p.cnt.roleOk++;
    if (x.team.type === 'correct') x.team.prog++;
    let role = p.role === 'flex' ? (a.as || 'miner') : p.role;
    if (p.role === 'flex' && !['miner', 'forger', 'builder', 'envoy', 'assayer', 'mechanic', 'mystic', 'leader'].includes(role)) role = 'miner';
    const hide = p.spy && a.hide;   // 雙面人可以把成果偷偷藏起來（只有元素）
    let t = `答對！💰+${K.COIN}，交易許可 +1`;
    switch (role) {
      case 'leader': x.push += 2; t += '；國力推進 +2'; break;
      case 'knight': x.push += 1; t += '；國力推進 +1'; break;
      case 'sage': x.push += 0.5; t += '；國力推進 +0.5'; break;
      case 'assayer': x.push += 1; p.cnt.intelTok++; t += '；國力推進 +1，得到 1 次情報偵察'; break;
      case 'miner': {
        const v = VEINS[a.vein] || VEINS.any; let el = pick(r, v.els);
        if (a.vein === 'metal' && x.inv[el] && r() < 0.5) el = pick(r, v.els.filter(e => !has(x.inv, e)).concat([el]));
        if (hide) add(p.stash, el); else add(x.inv, el);
        p.cnt.mined[el] = 1;
        if (!hide) log(R, p.fac, `${p.name} 挖到 ${el}`);
        t += `；挖到 ${el}${hide ? '（偷偷藏進你的私藏）' : ''}`; break;
      }
      case 'forger': {
        const els = Object.keys(x.inv).filter(e => has(x.inv, e)).sort((a1, b1) => wantScore(R, p.fac, a1) - wantScore(R, p.fac, b1));
        const el = a.el && has(x.inv, a.el) ? a.el : els[0];
        if (el) { add(x.inv, el, -1); x.push += 2; x.made.comp++; x.rMake++; p.cnt.comp++; if (x.team.type === 'make') x.team.prog++; log(R, p.fac, `${p.name} 用 ${el} 鑄成化合物`); t += `；用 ${el} 鑄成化合物，國力推進 +2`; }
        else { x.push += 0.5; t += '；倉庫沒有元素可以鑄造，國力推進 +0.5'; }
        break;
      }
      case 'builder': {
        if (a.mol === 'wall') { x.walls++; p.cnt.walls++; log(R, p.fac, `${p.name} 建了一道城牆`); t += '；建好一道城牆（擋下 1 次進攻）'; break; }
        const M = MOLS[a.mol];
        if (M && M.need.every(e => has(x.inv, e))) {
          M.need.forEach(e => add(x.inv, e, -1));
          x.made[M.type]++; if (x.made[a.mol] != null) x.made[a.mol]++; x.mols[a.mol] = (x.mols[a.mol] || 0) + 1;
          if (M.type === 'vw') x.vwMass += M.m;
          x.rMake++; p.cnt.mol++; if (x.team.type === 'make') x.team.prog++;
          log(R, p.fac, `${p.name} 做出 ${M.f}`); t += `；做出 ${M.f}`;
        } else { x.push += 0.5; t += '；倉庫元素不夠做這個分子，國力推進 +0.5'; }
        break;
      }
      case 'envoy': case 'mystic': {
        let pair = role === 'envoy' ? [p.fac, a.to] : (a.pair || '').split('|');
        if (!pair.every(f => R.F[f]) || pair[0] === pair[1]) pair = [p.fac, R.facs.find(f => f !== p.fac)];
        if (role === 'mystic' && R.g11 && !pair.some(f => f === 'hb' || f === 'vw')) pair = [p.fac === 'co' ? 'co' : p.fac, p.fac === 'hb' ? 'co' : 'hb'];
        const [f1, f2] = pair, v = Math.min(100, R.F[f1].fr[f2] + 5); R.F[f1].fr[f2] = v; R.F[f2].fr[f1] = v; p.cnt.friend++;
        log(R, p.fac, `${p.name} 讓${FN[f1].name}和${FN[f2].name}友好度 +5（${v}）`); t += `；${FN[f1].name}和${FN[f2].name}友好度 +5（現在 ${v}）`; break;
      }
      case 'mechanic': if (x.shield < 1) { x.shield = 1; t += '；得到 1 面盾牌（本回合擋下 1 次破壞）'; } else { x.push += 1; t += '；盾牌已經有了，國力推進 +1'; } break;
    }
    if (x.team.type === 'friend') x.team.prog = Math.max(0, x.fr[x.team.target] - x.frStart[x.team.target]);
    if (!x.team.done && teamReached(x)) { x.team.done = true; log(R, p.fac, `🎉 團隊任務完成：${x.team.text}`); feed(R, `🎉 ${FN[p.fac].name}完成本回合的團隊任務`); }
    return { ok: true, t };
  }
  const teamReached = x => x.team.type === 'quick' ? false : x.team.prog >= x.team.thr;
  function wantScore(R, f, el) {
    const x = R.F[f];
    if (f === 'me') return METALS.includes(el) ? (x.inv[el] > 1 ? 0.5 : 3) : 0;
    if (['H', 'N', 'O', 'F'].includes(el)) return (f === 'hb' || f === 'co') ? 3 : 0.3;
    if (VWE.includes(el)) return (f === 'vw' || f === 'co') ? 2.5 : 0.3;
    return JUNK.includes(el) ? 0 : 0.5;
  }
  // 雙面人的秘密能力
  function spyAct(R, p, a) {
    if (!p.spy) return { ok: false };
    const ab = ABIL[a.ab]; if (!ab) return { ok: false };
    if (p.abilUsed) return { ok: false, t: '每回合只能發動 1 個能力。' };
    if (ab.strong) { if (p.correct < K.SP_UNLOCK) return { ok: false, t: `要累積答對 ${K.SP_UNLOCK} 題才解鎖（目前 ${p.correct}）。` }; if (R.round - p.lastStrong < 3) return { ok: false, t: `每 3 回合只能用 1 次（下次：第 ${p.lastStrong + 3} 回合）。` }; }
    if (p.wallet < ab.cost) return { ok: false, t: '金幣不夠。' };
    p.wallet -= ab.cost; p.abilUsed = true; if (ab.strong) p.lastStrong = R.round;
    const h = R.F[p.fac];
    if (a.ab === 'leak') {
      const pr = progress(R, p.fac), text = `📣 雙面人 ${p.name} 回報：${FN[p.fac].name}國庫 💰${h.tre}，勝利進度 ${Math.round(pr.v * 100)}%（${pr.parts.map(q => `${q.l} ${q.have}/${q.need}`).join('；')}）`;
      R.F[p.origin].mem.filter(s => R.players[s].leader).forEach(s => msg(R.players[s], text));
      return { ok: true, t: '情報已送給母國的大煉金師。' };
    }
    h.sabs.push({ sid: p.sid, ab: a.ab, target: a.ab === 'rumor' ? (R.F[a.to] && a.to !== p.fac ? a.to : p.target) : null });
    return { ok: true, t: `${ab.name} 已安排，結算時生效（如果對方的機巧師有盾牌就會被擋下）。` };
  }

  /* ---------- 勝利進度 ---------- */
  function progress(R, f) {
    const x = R.F[f], T = R.T, parts = [];
    const tot = R.facs.reduce((a, g) => a + R.F[g].rel, 0), terr = x.rel / tot * 100;
    if (f === 'co') {
      parts.push({ l: '有氫鍵的分子', have: x.made.hb, need: T.CO_N }, { l: '只有凡得瓦力的分子', have: x.made.vw, need: T.CO_N });
      if (R.g11) parts.push({ l: '和氫聯邦友好度', have: x.fr.hb, need: T.CO_F }, { l: '和凡聯邦友好度', have: x.fr.vw, need: T.CO_F });
      else parts.push({ l: '領土 %', have: Math.round(terr * 10) / 10, need: T.CO_TERR });
    }
    if (f === 'io') {
      parts.push({ l: '買入筆數', have: x.buys, need: T.IO_N }, { l: '賣出筆數', have: x.sells, need: T.IO_N });
      R.facs.filter(g => g !== 'io').forEach(g => parts.push({ l: `賣給${FN[g].name}`, have: x.sellTo[g] || 0, need: T.IO_M }));
      parts.push({ l: '買賣筆數相等', have: x.buys === x.sells ? 1 : 0, need: 1 });
    }
    if (f === 'me') parts.push({ l: '國庫', have: x.tre, need: T.ME_X }, { l: '金屬種類', have: kinds(x.inv), need: T.ME_K });
    if (f === 'hb') ['H2O', 'NH3', 'HF'].forEach(k => parts.push({ l: MOLS[k].f, have: x.made[k], need: T.HB_N })), parts.push({ l: '和共國友好度', have: x.fr.co, need: T.HB_F });
    if (f === 'vw') parts.push({ l: '分子量總和', have: x.vwMass, need: T.VW_X }, { l: '相對國力 %', have: Math.round(x.rel), need: T.VW_R });
    const v = Math.min(...parts.map(q => Math.min(1, q.have / q.need)));
    return { v, parts, done: parts.every(q => q.have >= q.need) };
  }

  /* ---------- 結算 ---------- */
  function settle(R) {
    const r = rng(R), news = { round: R.round, sab: {}, moves: [], team: {}, cells: [] };
    // 1. 破壞（盾牌先擋）
    R.facs.forEach(f => {
      const h = R.F[f]; news.sab[f] = { blocked: 0, hit: [] };
      h.sabs.forEach(s => {
        const sp = R.players[s.sid];
        if (h.shield > 0) { h.shield--; news.sab[f].blocked++; h.mem.filter(id => R.players[id].role === 'mechanic' || R.players[id].role === 'flex').forEach(id => R.players[id].cnt.repairs++); msg(sp, `${ABIL[s.ab].name} 被機巧師的盾牌擋下了`); return; }
        if (s.ab === 'swap') {
          const els = Object.keys(h.inv).filter(e => has(h.inv, e) && !JUNK.includes(e)).sort((a, b) => wantScore(R, f, b) - wantScore(R, f, a));
          if (els.length) { add(h.inv, els[0], -1); add(h.inv, 'He'); news.sab[f].hit.push(`倉庫的 ${els[0]} 被掉包成 He`); }
          else if (f === 'hb') { const k = ['H2O', 'NH3', 'HF'].sort((a, b) => h.made[b] - h.made[a])[0]; if (h.made[k] > 0) { h.made[k]--; h.made.hb--; news.sab[f].hit.push(`一份 ${MOLS[k].f} 被掉包`); } }
        }
        if (s.ab === 'steal') { const n = Math.min(K.SP_STEAL, h.tre); h.tre -= n; R.F[sp.origin].tre += n; news.sab[f].hit.push(`國庫少了 💰${n}`); }
        if (s.ab === 'drag') { h.push -= K.SP_DRAG; news.sab[f].hit.push('國力推進被扯後腿'); }
        if (s.ab === 'rumor') { const t = s.target, v = Math.max(0, h.fr[t] - K.SP_RUMOR); h.fr[t] = v; R.F[t].fr[f] = v; news.sab[f].hit.push(`和${FN[t].name}的友好度被謠言破壞 −${K.SP_RUMOR}`); }
        msg(sp, `${ABIL[s.ab].name} 成功了`);
      });
      if (news.sab[f].hit.length) log(R, f, `⚠️ 有內鬼！${news.sab[f].hit.join('；')}`);
    });
    // 2. 事件加成、國力消長（零和）、鍵結社暗中行動
    R.facs.forEach(f => { R.F[f].push += R.F[f].evBonus || 0; R.F[f].evBonus = 0; });
    const mp = mean(R.facs.map(f => R.F[f].push)), mr = mean(R.facs.map(f => R.F[f].rel)), before = Object.fromEntries(R.facs.map(f => [f, R.F[f].rel]));
    R.facs.forEach(f => { const x = R.F[f]; x.rel += K.C * (x.push - mp) + K.MOM * (x.rel - mr) + (r() - 0.5) * 2 * K.NOISE; });
    (R.covert || []).forEach(c => { R.F[c.f].rel += c.d; }); R.covert = [];
    const m2 = mean(R.facs.map(f => R.F[f].rel)); R.facs.forEach(f => { R.F[f].rel = Math.round(Math.max(20, R.F[f].rel - m2 + 100) * 10) / 10; });
    news.delta = Object.fromEntries(R.facs.map(f => [f, Math.round((R.F[f].rel - before[f]) * 10) / 10]));
    // 3. 領土
    const map = Wd.makeMap(R.seed, R.facs), ps = pseudo(R), rd = Wd.redraw(ps, map, 3); R.owner = ps.owner; news.moves = rd.moves; news.cells = rd.cells;
    // 4. 團隊任務
    R.facs.forEach(f => {
      const x = R.F[f];
      if (x.team.type === 'friend') { x.team.prog = Math.max(0, x.fr[x.team.target] - x.frStart[x.team.target]); if (x.team.prog >= x.team.thr) x.team.done = true; }
      if (x.team.type === 'quick') { x.team.prog = x.rQ ? Math.round(x.rQok / x.rQ * 100) : 0; x.team.done = x.rQ > 0 && x.team.prog >= 68; }
      x.teamN++; if (x.team.done) x.teamOk++; news.team[f] = x.team.done;
    });
    // 5. 勝利
    const prog = {}; R.facs.forEach(f => { prog[f] = progress(R, f); R.F[f].prog = prog[f].v; R.F[f].parts = prog[f].parts; });
    const win = R.facs.filter(f => prog[f].done).sort((a, b) => R.F[b].rel - R.F[a].rel);
    // 6. 市場
    Object.values(R.market).forEach(m => { m.p = Math.max(5, Math.min(30, m.p + Math.round((m.b - m.s) / 2))); m.b = 0; m.s = 0; });
    R.history.push({ round: R.round, rel: Object.fromEntries(R.facs.map(f => [f, R.F[f].rel])), team: news.team });
    R.news = news; R.phase = 'settle';
    if (win.length) R.winner = win[0];
    else if (R.round >= K.ROUNDS) {
      const rels = R.facs.map(f => R.F[f].rel), B = R.T.BS;
      if (R.bs.length && rels.every(v => v >= B.lo && v <= B.hi) && Math.max(...rels) - Math.min(...rels) <= B.spread) R.winner = 'bs';
      else R.winner = 'none';
    }
    feed(R, `第 ${R.round} 回合結算${R.winner ? '：遊戲結束' : ''}`);
    return news;
  }
  // 結算後：市場微調（老師 ▲▼）
  function nudge(R, el, d) { const m = R.market[el]; if (m) m.p = Math.max(5, Math.min(30, m.p + d)); }
  // 隨機事件：全班一起答一題，勢力答對率 ≥70% 下回合國力推進 +2
  function setEvent(R, q) { R.phase = 'event'; R.event = { q: q.q, opts: q.opts, ans: {}, right: q.ans, tag: q.tag, id: q.id, reveal: false, endAt: now() + 30000 }; }
  function revealEvent(R) {
    const E = R.event; if (!E) return null; E.reveal = true; const res = {};
    R.facs.forEach(f => { const mem = R.F[f].mem, n = mem.filter(s => E.ans[s] != null).length, ok = mem.filter(s => E.ans[s] === E.right).length; const rate = n ? ok / mem.length : 0; res[f] = Math.round(rate * 100); if (rate >= 0.7) R.F[f].evBonus = 2; });
    E.res = res; return res;
  }

  /* ---------- 結束：計分與揭曉 ---------- */
  function finish(R) {
    R.phase = 'end';
    const T = R.T, rounds = R.round, need = Math.max(1, Math.round(K.PERSONAL_N * rounds / K.ROUNDS));
    const rankFac = R.facs.slice().sort((a, b) => R.F[b].rel - R.F[a].rel);
    const P = Object.values(R.players);
    P.forEach(p => {
      const c = p.cnt;
      let ok2 = true, t2 = '';
      if (p.fac === 'bs') { ok2 = R.winner === 'bs'; t2 = '鍵結社達成天下均勢'; }
      else {
        const x = R.F[p.fac];
        switch (p.role) {
          case 'leader': case 'flex': ok2 = rankFac.indexOf(p.fac) < Math.ceil(R.facs.length / 2); t2 = '勢力國力排名在前半'; break;
          case 'knight': ok2 = c.attacks >= 1; t2 = '成功出兵至少 1 次'; break;
          case 'sage': ok2 = c.issued >= 1; t2 = '多發委託至少 1 件'; break;
          case 'miner': ok2 = Object.keys(c.mined).length >= 5; t2 = '挖到至少 5 種不同元素'; break;
          case 'forger': ok2 = c.comp >= 4; t2 = '鑄造至少 4 個化合物'; break;
          case 'assayer': ok2 = c.intel >= 2; t2 = '情報偵察至少 2 次'; break;
          case 'builder': ok2 = c.mol >= 3 && c.walls >= 1; t2 = '做出至少 3 個分子＋建 1 道城牆'; break;
          case 'envoy': ok2 = R.facs.filter(g => g !== p.fac && x.fr[g] >= 60).length >= 2; t2 = '2 個勢力和我方友好度 ≥ 60'; break;
          case 'mechanic': ok2 = c.repairs >= 1 || !x.spiesIn.length; t2 = '成功擋下破壞至少 1 次'; break;
          case 'mystic': ok2 = R.g11 ? R.F.hb.fr.vw >= 60 || R.F.co.fr.hb >= 70 : true; t2 = '聯邦之間友好度 ≥ 60'; break;
        }
      }
      const n1 = p.fac === 'bs' ? c.bsDone : p.correct, need1 = p.fac === 'bs' ? Math.max(1, Math.round(8 * rounds / K.ROUNDS)) : need;
      p.personal = { ok: n1 >= need1 && ok2, t1: p.fac === 'bs' ? `完成委託 ${n1} 件（目標 ${need1}）` : `答對 ${n1} 題（目標 ${need1}）`, t2, ok1: n1 >= need1, ok2 };
      let pts = (p.personal.ok ? K.PT_OK : -K.PT_NO) + p.correct;
      if (p.fac !== 'bs') { const x = R.F[p.fac], rate = x.teamN ? x.teamOk / x.teamN : 0; pts += Math.round(rate * K.TW - (1 - rate) * K.TL); }
      if (p.spy) {
        const h = R.F[p.fac], S = T.SEC, pr = progress(R, p.fac).v * 100;
        const okS = p.sec === 'haul' ? p.sent >= S.haul : p.sec === 'weaken' ? h.rel < S.weaken : p.sec === 'block' ? R.winner !== p.fac && pr < S.block : p.sec === 'drain' ? h.tre < S.drain : p.sec === 'split' ? h.fr[p.target] <= S.split : (h.teamOk / Math.max(1, h.teamN)) * 100 <= S.slack;
        p.secOk = okS; if (okS) pts += K.ST;
      }
      p.pts = pts;
    });
    const fscore = {};
    R.facs.forEach(f => {
      const mem = P.filter(p => p.origin === f), avg = mem.length ? mem.reduce((a, p) => a + p.pts, 0) / mem.length : 0;
      fscore[f] = Math.round((R.F[f].rel - 100) * T.PW + avg + (R.winner === f ? T.V : 0));
    });
    const bsAvg = R.bs.length ? Math.round(R.bs.reduce((a, s) => a + R.players[s].pts, 0) / R.bs.length + (R.winner === 'bs' ? T.V : 0)) : null;
    R.final = {
      winner: R.winner, rounds, fscore, bsScore: bsAvg,
      rank: R.facs.slice().sort((a, b) => fscore[b] - fscore[a]),
      mvp: P.slice().sort((a, b) => b.pts - a.pts).slice(0, 10).map(p => ({ sid: p.sid, name: p.name, fac: p.fac, origin: p.origin, role: p.role, pts: p.pts, spy: !!p.spy })),
      spies: P.filter(p => p.spy).map(p => ({ name: p.name, sid: p.sid, host: p.fac, origin: p.origin, sec: p.sec, secText: secText(R, p), ok: p.secOk }))
    };
    return R.final;
  }
  const secText = (R, p) => SECRET[p.sec].text(R.T.SEC[p.sec], p.target);

  /* ---------- 畫面資料 ---------- */
  function views(R) {
    const pub = {
      phase: R.phase, round: R.round, rounds: K.ROUNDS, tEnd: R.tEnd || 0, paused: !!R.paused, pauseLeft: R.pauseLeft || 0, level: R.level, g11: !!R.g11, diff: R.diff,
      lobbyN: Object.keys(R.lobby).length, facs: R.facs || [], code: R.code,
      rel: R.F ? Object.fromEntries(R.facs.map(f => [f, R.F[f].rel])) : {},
      names: R.F ? Object.fromEntries(R.facs.map(f => [f, R.F[f].mem.map(s => R.players[s].name)])) : {},
      bsNames: (R.bs || []).map(s => R.players[s].name),
      market: R.market ? Object.fromEntries(Object.entries(R.market).map(([e, m]) => [e, m.p])) : {},
      news: R.news || null, winner: R.winner || null, final: R.phase === 'end' ? R.final : null,
      event: R.event ? { q: R.event.q, opts: R.event.opts, endAt: R.event.endAt, reveal: R.event.reveal, right: R.event.reveal ? R.event.right : null, res: R.event.res || null, tag: R.event.tag, id: R.event.id } : null,
      board: R.board || [], feed: (R.feed || []).slice(0, 12), owner: R.owner || [], seed: R.seed
    };
    const fac = {};
    (R.facs || []).forEach(f => {
      const x = R.F[f];
      fac[f] = { inv: x.inv, tre: x.tre, made: x.made, mols: x.mols, vwMass: x.vwMass, fr: x.fr, buys: x.buys, sells: x.sells, sellTo: x.sellTo, walls: x.walls, shield: x.shield, team: x.team, teamOk: x.teamOk, teamN: x.teamN, log: x.log.slice(0, 20), parts: progress(R, f).parts, prog: progress(R, f).v,
        mem: x.mem.map(s => { const p = R.players[s]; return { name: p.name, role: p.role, leader: !!p.leader, merged: !!p.merged }; }), attacked: !!x.attacked };
    });
    const priv = {};
    Object.values(R.players || {}).forEach(p => {
      const o = { sid: p.sid, name: p.name, fac: p.fac, role: p.role, leader: !!p.leader, merged: !!p.merged, wallet: p.wallet, correct: p.correct, rc: p.rc, permits: Math.min(3, p.permits), trades: p.trades, cnt: p.cnt, msgs: p.msgs || [], ack: p.ack || {}, abilUsed: !!p.abilUsed, bsCovert: !!p.bsCovert };
      if (p.spy) Object.assign(o, { spy: { origin: p.origin, sec: p.sec, secName: SECRET[p.sec].name, secText: secText(R, p), target: p.target, stash: p.stash, sent: p.sent, lastStrong: p.lastStrong, leader: R.F[p.origin].mem.filter(s => R.players[s].leader).map(s => R.players[s].name) } });
      if (p.leader && p.fac !== 'bs') o.mySpies = R.F[p.fac].spiesOut.map(s => ({ name: R.players[s].name, host: R.players[s].fac }));
      if (R.phase === 'end') o.personal = p.personal, o.pts = p.pts, o.secOk = p.secOk;
      priv[p.sid] = o;
    });
    return { pub, fac, priv };
  }

  // 每位學生一份畫面資料（一條連線就夠）：g＝公開、f＝自己勢力、p＝個人
  function studentViews(R) {
    const V = views(R), out = {};
    const g = { ...V.pub }; delete g.feed; delete g.board;
    Object.keys(R.lobby || {}).forEach(sid => {
      const p = V.priv[sid];
      if (!p) { out[sid] = { g: { phase: R.phase, lobbyN: g.lobbyN, round: R.round, level: R.level, waiting: true } }; return; }
      const gg = p.fac === 'bs' ? { ...g, board: V.pub.board } : g;
      out[sid] = { g: gg, f: p.fac !== 'bs' ? V.fac[p.fac] : null, p };
    });
    return { out, V };
  }
  return { now, setOffset, studentViews, K, ROLE, ROT, VEINS, MOLS, METALS, ALL, SECRET, ABIL, TEAM, newRoom, join, layout, thresholds, start, beginRound, act, settle, nudge, setEvent, revealEvent, finish, progress, views, pseudo, takeCell };
})();
if (typeof module !== 'undefined') module.exports = MPE;
