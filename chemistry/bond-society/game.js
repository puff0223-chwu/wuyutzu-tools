/* =========================================================
   隱秘的鍵結社 —— 回合規則（畫面與平衡模擬共用）
   ---------------------------------------------------------
   一回合：情勢報告 → 委託公告板（最多接 2 件）→ 交易所 → 結算（自然消長＋蠶食）→ 隨機事件
   ・委託成功：拿報酬（用了提示只拿 7 成）、套用影響；尋礦得元素、鑄造消耗元素
   ・委託失敗（答錯兩次）：隱密度 −10、委託國 −3%
   ・交易所：買元素、暗中資助（+6%）、散播謠言（下回合成長減半）、打探情報、賣元素
   ========================================================= */
const GAME = (() => {
  const Wd = typeof WORLD !== 'undefined' ? WORLD : require('./world.js');
  const T = typeof TASKS !== 'undefined' ? TASKS : require('./tasks.js');
  const C = typeof CHEM !== 'undefined' ? CHEM : require('./data.js');
  const EV = typeof EVENTS !== 'undefined' ? EVENTS : require('./events.js');
  const PRICE = { subsidy: r => 25 + r * 3, rumor: r => 20 + r * 2, intel: () => 10, markup: r => 1 + (r - 1) * 0.05 };
  const SUBSIDY = 6, FAIL_STEALTH = 10, RUMOR_STEALTH = 8;

  function startRound(s) {
    s.board = T.makeBoard(s); s.ap = 2; s.step = 'board'; s.trade = { rumor: 0, subsidy: 0, intel: false, buys: 0 }; s.lastEvent = null; s.settle = null;
    return s.board;
  }
  const buyPrice = (s, sym) => Math.ceil(C.price(sym) * PRICE.markup(s.round));
  const missing = (s, task) => (task.needs || []).filter(sym => !(s.inv[sym] > 0));
  function buy(s, sym, n = 1) {
    const cost = buyPrice(s, sym) * n;
    if (s.money < cost) return false;
    s.money -= cost; s.inv[sym] = (s.inv[sym] || 0) + n; s.trade.buys += n; return true;
  }
  // 完成委託：result = { ok, first, hinted }
  function resolve(s, c, result) {
    const kind = c.task.kind;
    s.stats.tasks++; if (result.ok && result.first) s.stats.firstOk++;
    const bt = (s.stats.byType[kind] = s.stats.byType[kind] || { n: 0, first: 0, fail: 0 });
    bt.n++; if (result.ok && result.first) bt.first++; if (!result.ok) bt.fail++;
    s.ap = Math.max(0, s.ap - 1);
    let applied = {};
    if (result.ok) {
      s.money += Math.round(c.reward * (result.first ? 1 : 0.7));
      applied = Wd.apply(s, c.effects);
      if (kind === 'mine') s.inv[c.task.answer] = (s.inv[c.task.answer] || 0) + (c.task.qty || 2);
      if (kind === 'forge') (c.task.needs || []).forEach(sym => { s.inv[sym] = Math.max(0, (s.inv[sym] || 0) - 1); });
      c.state = 'done';
    } else {
      s.stealth -= FAIL_STEALTH; s.stats.fails++;
      if (c.from !== 'mine') applied = Wd.apply(s, { [c.from]: -3 });
      c.state = 'failed';
    }
    return applied;
  }
  function skip(s, c) { c.state = 'skipped'; }
  /* 交易所 */
  function subsidy(s, f) { const cost = PRICE.subsidy(s.round); if (s.money < cost) return false; s.money -= cost; s.trade.subsidy++; Wd.apply(s, { [f]: SUBSIDY }); return true; }
  function rumor(s, f) {
    const cost = PRICE.rumor(s.round); if (s.money < cost || s.rumor[f]) return false;
    s.money -= cost; s.rumor[f] = 1; s.trade.rumor++;
    if (s.trade.rumor >= 2) s.stealth -= RUMOR_STEALTH;   // 同一回合散播太多謠言，容易被發現
    return true;
  }
  function intel(s) {
    if (s.trade.intel || s.money < PRICE.intel()) return null;
    s.money -= PRICE.intel(); s.trade.intel = true;
    return forecast(s);
  }
  // 下回合自然消長的預估（不含隨機）
  const forecast = s => Object.fromEntries(s.facs.map(f => [f, Math.round((1 + (s.trend ? s.trend[f] : 0) + 0.12 * (Wd.rel(s, f) - 100)) * (s.rumor[f] ? 0.5 : 1) * 10) / 10]));
  function sell(s, sym, f) {
    if (!(s.inv[sym] > 0)) return false;
    s.inv[sym]--; s.money += Math.floor(C.price(sym) * 0.8); Wd.apply(s, { [f]: 1 }); return true;
  }
  // 誰會收購這個元素
  function buyers(s, sym) {
    const e = C.EL[sym], out = [];
    if (e.type === 'm' && s.facs.includes('me')) out.push('me');
    if ((e.type === 'n' || e.type === 's') && s.facs.includes('co')) out.push('co');
    if ((e.type === 'm' && !e.trans) || ['F', 'Cl', 'Br', 'O', 'S', 'N'].includes(sym)) out.push('io');
    return out;
  }
  /* 結算 */
  function settle(s, map) {
    const before = Object.fromEntries(s.facs.map(f => [f, Wd.rel(s, f)]));
    const drift = Wd.drift(s);
    const ann = Wd.annex(s, map);
    const fail = Wd.checkFail(s);
    const balanced = Wd.closeRound(s);
    s.settle = { before, drift, annex: ann, balanced };
    return { drift, annex: ann, fail, balanced, before };
  }
  /* 事件 */
  function pickEvent(s) {
    const rnd = Wd.rngFrom(s);
    s.seenEv = s.seenEv || [];
    const pool = EV.filter(e => (!e.lv || e.lv === s.level) && !s.seenEv.includes(e.id));
    const ev = pool.length ? pool[Math.floor(rnd() * pool.length)] : EV[Math.floor(rnd() * EV.length)];
    s.seenEv.push(ev.id); s.lastEvent = { id: ev.id };
    return ev;
  }
  const evById = id => EV.find(e => e.id === id);
  function resolveTarget(s, eff) {
    const sorted = [...s.facs].sort((a, b) => Wd.rel(s, b) - Wd.rel(s, a));
    const out = {};
    Object.entries(eff || {}).forEach(([k, v]) => { const f = k === '$top' ? sorted[0] : k === '$low' ? sorted[sorted.length - 1] : k; if (s.facs.includes(f)) out[f] = (out[f] || 0) + v; });
    return out;
  }
  function chooseEvent(s, ev, k) {
    const ch = ev.choices[k];
    if (ch.money && ch.money < 0 && s.money < -ch.money) return { ok: false, msg: '資金不夠' };
    s.money += ch.money || 0; s.stealth += ch.stealth || 0;
    const applied = Wd.apply(s, resolveTarget(s, ch.eff));
    const gifts = [];
    if (ch.gift) { const rnd = Wd.rngFrom(s); for (let i = 0; i < ch.gift; i++) { const e = C.ELEMENTS.filter(x => x.type !== 'g')[Math.floor(rnd() * 32)]; s.inv[e.sym] = (s.inv[e.sym] || 0) + 1; gifts.push(e.sym); } }
    if (ev.chem) { s.stats.evChem = (s.stats.evChem || 0) + 1; if (ch.ok) s.stats.evChemOk = (s.stats.evChemOk || 0) + 1; }
    s.lastEvent = { id: ev.id, k };
    return { ok: true, applied, gifts, fail: Wd.checkFail(s) };
  }
  function nextRound(s) {
    if (s.round >= Wd.RULE.ROUNDS) { s.ended = Wd.finalEnding(s); s.step = 'end'; return false; }
    s.round++; s.step = 'report'; return true;
  }
  return { PRICE, SUBSIDY, startRound, buyPrice, missing, buy, resolve, skip, subsidy, rumor, intel, forecast, sell, buyers, settle, pickEvent, evById, chooseEvent, resolveTarget, nextRound };
})();
if (typeof module !== 'undefined') module.exports = GAME;
