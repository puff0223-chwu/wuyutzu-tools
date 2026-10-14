/* =========================================================
   隱秘的鍵結社 —— 回合規則（畫面與平衡模擬共用）
   ---------------------------------------------------------
   一回合：情勢報告 → 委託公告板（最多接 2 件）→ 交易所 → 結算（自然消長＋蠶食）→ 隨機事件
   ・委託成功：拿報酬（用了提示只拿 7 成）、套用影響；尋礦得元素、鑄造消耗元素
   ・委託失敗（答錯兩次）：隱密度 −10、委託國 −3%
   ・交易所（2026-10-14 試玩後改版）
     - 暗中行動：每回合只能做 1 次、只能選 1 國（資助 +6% 或散播謠言＝下次結算成長減半）
     - 買賣：每回合選「買」或「賣」其中一種，最多 3 筆（1 單位＝1 筆）；只能賣自己倉庫裡有的
     - 買賣不改變國力，只改變「友好度」（0～100）；友好度越高，賣價越好、向採礦國買越便宜
     - 浮動礦價：買越多越貴、賣越多越便宜；每回合回穩 4 成；公告板上鑄造委託要用的元素是熱門貨（漲價）
     - 解委託時缺原料可「緊急調貨」：不算交易筆數，但價格 ×1.3
   ========================================================= */
const GAME = (() => {
  const Wd = typeof WORLD !== 'undefined' ? WORLD : require('./world.js');
  const T = typeof TASKS !== 'undefined' ? TASKS : require('./tasks.js');
  const C = typeof CHEM !== 'undefined' ? CHEM : require('./data.js');
  const EV = typeof EVENTS !== 'undefined' ? EVENTS : require('./events.js');
  const FX = typeof FACTS !== 'undefined' ? FACTS : require('./facts.js');
  const PRICE = { subsidy: r => 25 + r * 3, rumor: r => 20 + r * 2, intel: () => 10, markup: r => 1 + (r - 1) * 0.05 };
  const SUBSIDY = 6, FAIL_STEALTH = 10, TRADE_MAX = 3, RUSH = 1.3;
  /* 🕵️ 隱密度（第四次試玩後）：做太多引人注目的事會被盯上；≤25 就曝光
     ・暗中削弱委託 −4、暗中資助 −3、散播謠言 −4、委託失敗 −10
     ・偏袒：最近兩回合幫同一國完成第 3 件以上委託，每件 −5
     ・財富招搖：結算時資金超過 120，每多 40 金幣 −3
     ・低調：本回合沒有做任何暗中的事（削弱委託、資助、謠言），結算時 +3
     ・掩護行動（交易所）：花錢 +10，每回合一次
     ・隱密度 <50：各國起疑，委託報酬打 85 折；<40：公告板少一件委託 */
  const ST = { shady: 4, subsidy: 3, rumor: 4, favor: 5, wealth: 120, wealthStep: 40, wealthCost: 3, calm: 3, cover: 10 };
  const coverCost = r => 18 + r * 3;
  function sus(s, d, why) { s.stealth += d; (s.susLog = s.susLog || []).push({ d, why }); }
  const ROUND_SEC = 240, QUICK_EVERY = 90, QUICK_SEC = 20, FAST = [0, 60, 75, 90];   // 計時模式：每回合 4 分鐘、每 75 秒一題干擾快問（20 秒）、委託在 60／75／90 秒內完成有快手獎金
  /* 友好度 */
  const TIERS = [
    { min: 80, name: '盟友', sell: 0.95, buy: 0.8 },
    { min: 60, name: '友好', sell: 0.85, buy: 0.9 },
    { min: 30, name: '普通', sell: 0.75, buy: 1 },
    { min: 0, name: '冷淡', sell: 0.6, buy: 1.15 }
  ];
  const tier = (s, f) => TIERS.find(t => (s.friend[f] || 0) >= t.min);
  function befriend(s, f, d) { if (s.friend[f] == null) return; s.friend[f] = Math.max(0, Math.min(100, s.friend[f] + d)); }
  /* 浮動礦價：mkt[sym] 是價格指數（1＝原價），0.5～2.2 */
  const idx = (s, sym) => (s.mkt && s.mkt[sym]) || 1;
  function bump(s, sym, d) { s.mkt[sym] = Math.round(Math.max(0.5, Math.min(2.2, idx(s, sym) + d)) * 100) / 100; }
  function marketTick(s) {
    const rnd = Wd.rngFrom(s);
    Object.keys(s.mkt).forEach(k => { s.mkt[k] = Math.round((1 + (s.mkt[k] - 1) * 0.6) * 100) / 100; if (Math.abs(s.mkt[k] - 1) < 0.03) delete s.mkt[k]; });
    const hot = [...new Set(s.board.filter(c => c.task.kind === 'forge').flatMap(c => c.task.needs || []))];
    hot.forEach(sym => bump(s, sym, 0.25));
    // 大陸行情：一種元素被搶購、一種元素豐收
    const pool = C.ELEMENTS.filter(e => e.type !== 'g');
    const up = pool[Math.floor(rnd() * pool.length)], dn = pool[Math.floor(rnd() * pool.length)];
    bump(s, up.sym, 0.4); if (dn.sym !== up.sym) bump(s, dn.sym, -0.3);
    s.news = { hot, up: up.sym, dn: dn.sym === up.sym ? null : dn.sym };
  }

  function startRound(s) {
    s.friend = s.friend || {}; s.mkt = s.mkt || {};
    s.susLog = []; s.loud = false;
    s.board = T.makeBoard(s); s.ap = 2; s.step = 'board'; s.timeCrisis = null; s.tLeft = ROUND_SEC; s.trade = { mode: null, n: 0, covert: null, intel: false, cover: false }; s.lastEvent = null; s.settle = null;
    marketTick(s);
    return s.board;
  }
  const buyPrice = (s, sym) => Math.max(1, Math.ceil(C.price(sym) * PRICE.markup(s.round) * idx(s, sym) * tier(s, 'mine').buy));
  const sellPrice = (s, sym, f) => Math.max(1, Math.floor(C.price(sym) * idx(s, sym) * tier(s, f).sell));
  const rushPrice = (s, sym) => Math.ceil(buyPrice(s, sym) * RUSH);
  const missing = (s, task) => (task.needs || []).filter(sym => !(s.inv[sym] > 0));
  const canTrade = (s, mode) => (!s.trade.mode || s.trade.mode === mode) && s.trade.n < TRADE_MAX;
  // 交易所買入：算交易筆數
  function buy(s, sym) {
    const cost = buyPrice(s, sym);
    if (!canTrade(s, 'buy') || s.money < cost) return false;
    s.money -= cost; s.inv[sym] = (s.inv[sym] || 0) + 1; s.trade.mode = 'buy'; s.trade.n++;
    bump(s, sym, 0.15); befriend(s, 'mine', 3); return true;
  }
  // 解委託時缺原料：緊急調貨，不算筆數但比較貴
  function rush(s, sym) {
    const cost = rushPrice(s, sym);
    if (s.money < cost) return false;
    s.money -= cost; s.inv[sym] = (s.inv[sym] || 0) + 1; bump(s, sym, 0.15); return true;
  }
  // 完成委託：result = { ok, first, hinted }
  function resolve(s, c, result) {
    const kind = c.task.kind;
    if (kind === 'set') c.task.qs.forEach((q, i) => practice(s, q.tag, (result.answers || [])[i] === q.ans));
    else practice(s, tagsOf(c.task), result.ok);
    s.stats.tasks++; if (result.ok && result.first) s.stats.firstOk++;
    const bt = (s.stats.byType[kind] = s.stats.byType[kind] || { n: 0, first: 0, fail: 0 });
    bt.n++; if (result.ok && result.first) bt.first++; if (!result.ok) bt.fail++;
    s.ap = Math.max(0, s.ap - 1);
    let applied = {};
    if (result.ok) {
      c.paid = Math.round(c.reward * (result.first ? 1 : 0.7) * (result.fast ? 1.2 : 1));
      s.money += c.paid;
      applied = Wd.apply(s, c.effects);
      befriend(s, c.from, 10); if (c.shady) { befriend(s, c.shady, -8); sus(s, -ST.shady, `暗中削弱${Wd.FACTIONS[c.shady].name}`); s.loud = true; }
      if (c.from !== 'mine') {
        s.helpLog = (s.helpLog || []).filter(h => h.r >= s.round - 1); s.helpLog.push({ r: s.round, f: c.from });
        if (s.helpLog.filter(h => h.f === c.from).length >= 3) sus(s, -ST.favor, `一直幫${Wd.FACTIONS[c.from].name}，被其他國家注意到了`);
      }
      if (kind === 'mine') s.inv[c.task.answer] = (s.inv[c.task.answer] || 0) + (c.task.qty || 2);
      if (kind === 'forge') (c.task.needs || []).forEach(sym => { s.inv[sym] = Math.max(0, (s.inv[sym] || 0) - 1); });
      c.state = 'done';
    } else {
      sus(s, -FAIL_STEALTH, '委託失敗，留下了痕跡'); s.stats.fails++;
      if (c.from !== 'mine') applied = Wd.apply(s, { [c.from]: -3 });
      befriend(s, c.from, -8);
      c.state = 'failed';
    }
    return applied;
  }
  function skip(s, c) { c.state = 'skipped'; }
  /* 交易所 */
  // 暗中行動：每回合一次、一國
  const subsidyCost = (s, f) => Math.round(PRICE.subsidy(s.round) * (s.friend[f] >= 60 ? 0.8 : 1));
  function subsidy(s, f) {
    const cost = subsidyCost(s, f); if (s.trade.covert || s.money < cost) return false;
    s.money -= cost; s.trade.covert = { type: 'subsidy', f }; Wd.apply(s, { [f]: SUBSIDY }); befriend(s, f, 8); sus(s, -ST.subsidy, '暗中資助'); s.loud = true; return true;
  }
  function rumor(s, f) {
    const cost = PRICE.rumor(s.round); if (s.trade.covert || s.money < cost) return false;
    s.money -= cost; s.rumor[f] = 1; s.trade.covert = { type: 'rumor', f }; befriend(s, f, -6); sus(s, -ST.rumor, '散播謠言'); s.loud = true; return true;
  }
  // 🧥 掩護行動：花錢打點、製造假線索，隱密度 +10（每回合一次，上限 100）
  function cover(s) {
    const cost = coverCost(s.round); if (s.trade.cover || s.money < cost || s.stealth >= 100) return false;
    s.money -= cost; s.trade.cover = true; sus(s, Math.min(ST.cover, 100 - s.stealth), '掩護行動'); return true;
  }
  function intel(s) {
    if (s.trade.intel || s.money < PRICE.intel()) return null;
    s.money -= PRICE.intel(); s.trade.intel = true;
    return forecast(s);
  }
  // 下回合自然消長的預估（不含隨機）
  const forecast = s => {
    const raw = Object.fromEntries(s.facs.map(f => [f, Wd.rawGrowth(s, f)])), mean = s.facs.reduce((a, f) => a + raw[f], 0) / s.facs.length;
    return Object.fromEntries(s.facs.map(f => { let g = raw[f] - mean; if (s.rumor[f] && g > 0) g /= 2; return [f, Math.round(g * 10) / 10]; }));
  };
  // 賣元素：只能賣倉庫裡有的；不改變國力，只提升友好度、壓低行情
  function sell(s, sym, f) {
    if (!(s.inv[sym] > 0) || !canTrade(s, 'sell') || !buyers(s, sym).includes(f)) return false;
    s.money += sellPrice(s, sym, f); s.inv[sym]--; s.trade.mode = 'sell'; s.trade.n++;
    bump(s, sym, -0.15); befriend(s, f, 4); return true;
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
  // 結算：自然消長 →（太平靜就爆發危機）→ 領土重分 → 判定
  const CALM = 15;   // 最強和最弱的相對國力差距小於 15%，就算「太平靜」
  function settle(s, map) {
    const before = Object.fromEntries(s.facs.map(f => [f, Wd.rel(s, f)]));
    const drift = Wd.drift(s);
    let crisis = null;
    const rels = s.facs.map(f => Wd.rel(s, f));
    if (Math.max(...rels) - Math.min(...rels) < CALM) {
      const rnd = Wd.rngFrom(s), f = s.facs[Math.floor(rnd() * s.facs.length)], up = rnd() < 0.5, d = up ? 12 : -12;
      Wd.apply(s, { [f]: d }); crisis = { f, d, kind: up ? 'boom' : 'plague' };
    }
    const ann = Wd.annex(s, map);
    // 隱密度的回合結算
    if (s.money > ST.wealth) { const d = Math.floor((s.money - ST.wealth) / ST.wealthStep) * ST.wealthCost; if (d) sus(s, -d, `資金 ${s.money} 太招搖`); }
    if (!s.loud && s.stealth < 100) sus(s, Math.min(ST.calm, 100 - s.stealth), '這回合很低調');
    const fail = Wd.checkFail(s);
    const worked = !!(s.board && s.board.some(c => c.state === 'done'));
    const balanced = Wd.closeRound(s, worked);
    s.settle = { before, drift, annex: ann, balanced, worked, crisis, timeCrisis: s.timeCrisis || null, susLog: (s.susLog || []).slice() };
    return { drift, annex: ann, fail, balanced, before, worked, crisis };
  }
  // ⏰ 回合時間到還沒結束：最強國趁機擴張、最弱國陷入動亂，鍵結社的拖延也被注意到
  function timeUp(s) {
    if (s.timeCrisis) return null;
    const sorted = [...s.facs].sort((a, b) => Wd.rel(s, b) - Wd.rel(s, a)), top = sorted[0], low = sorted[sorted.length - 1];
    const applied = Wd.apply(s, { [top]: 6, [low]: -6 }); sus(s, -5, '時間到，行動拖延被注意到');
    s.timeCrisis = { top, low }; s.ap = 0;
    return { applied, fail: Wd.checkFail(s) };
  }
  /* 知識點圖鑑 */
  function practice(s, tags, ok) {
    s.prac = s.prac || {};
    [].concat(tags).forEach(t => { const p = (s.prac[t] = s.prac[t] || { n: 0, ok: 0 }); p.n++; if (ok) p.ok++; });
  }
  function tagsOf(t) {
    if (t.kind === 'mine') return t.clues.some(c => ['prop', 'react', 'use'].includes(c.fam)) ? ['pos', 'prop'] : ['pos'];
    if (t.kind === 'detect') return t.mode === 'type' ? ['bond'] : ['detect'];
    if (t.kind === 'forge') { if (t.mode === 'f2name') return ['name']; const tg = ['formula', 'ion']; if (C.CAT[t.c].poly || C.AN[t.a].poly) tg.push('poly'); return tg; }
    return [];
  }
  /* ⚡ 干擾快問 */
  function quick(s) { const Q = typeof QUIZ !== 'undefined' ? QUIZ : require('./quiz.js'); return Q.make(Wd.rngFrom(s), s.level, s.prac); }
  // 干擾快問（從進入遊戲就獨立計時，每 90 秒一題）：答對 💰+5；答錯 隱密度 −2；沒作答（超時）隱密度 −4、最強國趁亂 +2%
  function answerQuick(s, q, ans) {
    const ok = ans === q.ans, timeout = ans === null;
    practice(s, q.tag, ok); s.stats.quick = (s.stats.quick || 0) + 1;
    let applied = {};
    if (ok) { s.stats.quickOk = (s.stats.quickOk || 0) + 1; s.money += 5; }
    else if (timeout) { sus(s, -4, '干擾快問沒有作答'); const top = [...s.facs].sort((a, b) => Wd.rel(s, b) - Wd.rel(s, a))[0]; applied = Wd.apply(s, { [top]: 2 }); }
    else sus(s, -2, '干擾快問答錯');
    return { ok, timeout, applied };
  }
  /* 偵探鑑定：花錢做檢驗 */
  function runTest(s, c, id) {
    const t = c.task, test = FX.TESTS.find(x => x.id === id);
    if (!test || t.done.includes(id) || s.money < test.cost) return false;
    s.money -= test.cost; t.done.push(id); t.spent = (t.spent || 0) + test.cost; return true;
  }
  function checkDetect(t, ans) {
    const tg = T.subst(t.answer);
    if (t.mode === 'type') return ans === t.bond ? { ok: true } : { ok: false, msg: `檢驗結果不符合${FX.BOND[ans]}的特性。` };
    if (ans === t.answer) return { ok: true };
    const wrong = T.subst(ans), diff = FX.TESTS.find(x => t.done.includes(x.id) && wrong.r[x.id] !== tg.r[x.id]);
    return { ok: false, msg: diff ? `如果是${wrong.zh}，「${diff.name}」的結果會是「${wrong.r[diff.id]}」，和樣本不一樣。` : `${wrong.zh}和樣本的特性不符，再做一些檢驗比對看看。` };
  }

  /* 事件：約 1/4 純劇情、3/4 化學（選擇題或互動題） */
  const PUZ = ['sort', 'classify', 'balance', 'lewis'];
  function pickEvent(s) {
    const rnd = Wd.rngFrom(s), pick = a => a[Math.floor(rnd() * a.length)];
    s.seenEv = s.seenEv || [];
    const fresh = e => (!e.lv || e.lv === s.level) && !s.seenEv.includes(e.id);
    const x = rnd();
    let ev = null;
    if (x < 0.25) { const pool = EV.filter(e => e.plot && fresh(e)); if (pool.length) ev = pick(pool); }
    else if (x < 0.5) { const pool = EV.filter(e => !e.plot && fresh(e)); if (pool.length) ev = pick(pool); }
    if (!ev) ev = makePuzzle(s, rnd);
    s.seenEv.push(ev.id); s.lastEvent = { id: ev.id }; s.curEv = ev.kind ? ev : null; if (ev.kind) s.lastPuz = ev.kind;
    return ev;
  }
  // 互動題事件：每局內容都不同
  function makePuzzle(s, rnd) {
    const pick = a => a[Math.floor(rnd() * a.length)], sh = a => a.map(v => [rnd(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const used = new Set(s.seenEv), tier = T.tierOf(s.round), who = pick(s.facs), N = Wd.FACTIONS[who].name;
    const usedN = k => s.seenEv.filter(id => id.startsWith({ sort: 'sort:', classify: 'cls:', balance: 'bal:', lewis: 'lew:' }[k])).length;
    const kinds = sh(PUZ).sort((a, b) => usedN(a) - usedN(b) || (a === s.lastPuz) - (b === s.lastPuz));   // 出現次數少的題型優先、不連續同一種
    for (const kind of kinds) {
      if (kind === 'sort') {
        const pool = FX.SORTS.filter(x => (x.lv === 'all' || x.lv === s.level) && !used.has('sort:' + x.id)); if (!pool.length) continue;
        const d = pick(pool);
        return { id: 'sort:' + d.id, kind, who, chem: true, title: '📜 學者的大辯論', text: `${N}的學者們為了「${d.title}」吵得不可開交，請你排出正確的順序，平息爭論。`, data: { ...d, shown: sh(d.items.map(i => i[0])) } };
      }
      if (kind === 'classify') {
        const sets = Object.entries(FX.CLASSIFY).filter(([k, v]) => (!v.lv || v.lv === s.level) && !used.has('cls:' + k)); if (!sets.length) continue;
        const [k, v] = pick(sets), cats = Object.keys(v.cats);
        const single = c => sh(v.items.filter(i => i[1].length === 1 && i[1][0] === c));
        const items = v.multi ? sh([...sh(v.items.filter(i => i[1].length > 1)).slice(0, 2), ...single('io').slice(0, 1), ...single('co').slice(0, 2), ...single('me').slice(0, 2)])
          : sh(cats.flatMap(c => single(c).slice(0, 3)));
        return { id: 'cls:' + k, kind, who, chem: true, title: k === 'imf' ? '🤝 兩聯邦搶成員' : '🗂️ 大陸人口普查', text: k === 'imf' ? '幾個分子村落想加入聯邦，氫聯邦和凡聯邦吵著要人。請你當公證人，依「分子之間有沒有氫鍵」分配。' : `${N}主辦全大陸的物質普查，請你判斷每一種物質裡含有哪些化學鍵（屬於哪些國家）。`, data: { title: v.title, cats: v.cats, items, multi: !!v.multi } };
      }
      if (kind === 'balance') {
        const pool = FX.EQUATIONS.filter((q, i) => q.t <= tier && !used.has('bal:' + i)); if (!pool.length) continue;
        const q = pick(pool), i = FX.EQUATIONS.indexOf(q);
        return { id: 'bal:' + i, kind, who, chem: true, title: '⚖️ 條約天平', text: `${N}要和採礦國簽一份貿易條約。條約上寫著一條化學反應式，只有兩邊每種原子的數目都相等，天平才會平衡、條約才簽得成。`, data: q };
      }
      if (kind === 'lewis') {
        const pool = FX.LEWIS.filter(x => !used.has('lew:' + x.f)); if (!pool.length) continue;
        const m = pick(pool);
        return { id: 'lew:' + m.f, kind, who, chem: true, title: '🧩 分子村落的戶口調查', text: `${s.facs.includes('co') ? '共國' : N}要清點「${m.zh}（${m.f}）」分子村落裡的電子：畫出路易斯結構，數一數有幾對共用電子、幾對孤對電子。`, data: m };
      }
    }
    return EV[0];
  }
  // 檢查互動題；回傳 { ok, near, msg }
  function checkPuzzle(ev, ans) {
    const d = ev.data;
    if (ev.kind === 'sort') {
      const right = [...d.items].sort((a, b) => (d.dir === 'asc' ? a[1] - b[1] : b[1] - a[1])).map(i => i[0]);
      const ok = right.every((x, i) => ans[i] === x);
      return { ok, msg: `正確順序：${right.join(' → ')}（${d.items.slice().sort((a, b) => (d.dir === 'asc' ? a[1] - b[1] : b[1] - a[1])).map(i => `${i[0]} ${i[1]}${d.unit && d.unit.startsWith('°') ? d.unit : ''}`).join('、')}）。${d.why}` };
    }
    if (ev.kind === 'classify') {
      const same = (x, y) => [...(x || [])].sort().join() === [...y].sort().join();
      const wrong = d.items.filter((it, i) => !same(ans[i], it[1]));
      return { ok: !wrong.length, near: wrong.length === 1, wrong: wrong.map(w => w[0]), msg: d.items.map(it => `${it[0]} → ${it[1].map(x => d.cats[x]).join('＋')}（${it[2]}）`).join('<br>') };
    }
    if (ev.kind === 'balance') {
      const all = [...d.l, ...d.r], cnt = side => { const o = {}; side.forEach((f, i) => Object.entries(FX.atoms(f)).forEach(([k, v]) => { o[k] = (o[k] || 0) + v * ans[side === d.l ? i : d.l.length + i]; })); return o; };
      const L = cnt(d.l), R = cnt(d.r), even = Object.keys({ ...L, ...R }).every(k => L[k] === R[k]);
      const g = ans.reduce((a, b) => { const gg = (x, y) => (y ? gg(y, x % y) : x); return gg(a, b); });
      const ok = even && g === 1;
      const eq = `${d.l.map((f, i) => `${d.ans[i] > 1 ? d.ans[i] : ''}${C.html(f)}`).join(' + ')} → ${d.r.map((f, i) => `${d.ans[d.l.length + i] > 1 ? d.ans[d.l.length + i] : ''}${C.html(f)}`).join(' + ')}`;
      return { ok, msg: even && !ok ? `原子數相等了，但係數要化成<b>最簡整數比</b>。正確答案：${eq}` : `正確答案：${eq}` };
    }
    if (ev.kind === 'lewis') {
      const ok = ans.bp === d.bp && ans.lp === d.lp;
      return { ok, msg: `${d.f}：共用電子 ${d.bp} 對、孤對電子 ${d.lp} 對。${d.draw}。` };
    }
    return { ok: false, msg: '' };
  }
  // 互動題結算：成功 → 金幣 +12、該國 +4；差一點（只錯一個）→ 金幣 +5；失敗 → 該國 −3、隱密度 −5
  const PUZ_TAG = ev => ev.kind === 'balance' ? 'balance' : ev.kind === 'lewis' ? 'lewis' : ev.kind === 'classify' ? (ev.id === 'cls:imf' ? 'imf' : 'bond')
    : ['sort:radius3', 'sort:alkali'].includes(ev.id) ? 'trend' : ['sort:force', 'sort:bp-hb'].includes(ev.id) ? 'imf' : 'mp';
  function solvePuzzle(s, ev, res) {
    let applied = {};
    practice(s, PUZ_TAG(ev), res.ok);
    s.stats.evChem = (s.stats.evChem || 0) + 1;
    if (res.ok) { s.stats.evChemOk = (s.stats.evChemOk || 0) + 1; s.money += 12; applied = Wd.apply(s, { [ev.who]: 4 }); befriend(s, ev.who, 5); }
    else if (res.near) s.money += 5;
    else { s.stealth -= 5; applied = Wd.apply(s, { [ev.who]: -3 }); }
    s.lastEvent = { id: ev.id, k: res.ok ? 'ok' : res.near ? 'near' : 'fail' };
    return { applied, fail: Wd.checkFail(s) };
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
  return { ST, cover, coverCost, sus, ROUND_SEC, QUICK_EVERY, QUICK_SEC, FAST, tagsOf, PRICE, SUBSIDY, TRADE_MAX, TIERS, tier, idx, sellPrice, rushPrice, rush, canTrade, subsidyCost, startRound, buyPrice, missing, buy, resolve, skip, subsidy, rumor, intel, forecast, sell, buyers, settle, pickEvent, evById, chooseEvent, resolveTarget, nextRound, timeUp, practice, quick, answerQuick, CALM, runTest, checkDetect, makePuzzle, checkPuzzle, solvePuzzle };
})();
if (typeof module !== 'undefined') module.exports = GAME;
