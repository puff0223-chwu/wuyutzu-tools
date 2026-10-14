/* =========================================================
   隱秘的鍵結社 —— 雲端存檔、成績與歷程（第二階段，2026-10-15）
   ---------------------------------------------------------
   登入方式同時光手稿：學期由老師設定（bond-society/config），學生填班級、座號、姓名、學號、用途
   身分 sid＝學期_班級_座號（例：115-1_101_7），換裝置用同樣的班級座號就能接著玩
   Firebase 抽屜 bond-society/
     players/<sid>  學生的累積成績（排行榜、老師頁讀這裡）
       { sid, cls, seat, name, term, stuNo, purpose, updatedAt,
         games 完成局數, best: { g10|g11: { score, end, code, at, timed } },
         hist: [最近 30 局摘要], prac: { 知識點: { n, ok } }（累積）,
         qs: { 題目代號: { q, a, n, w, p: { 錯誤答案: 次數 } } }（錯題統計，最多 120 題）,
         tot: { tasks, firstOk, quick, quickOk } }
     saves/<sid>    進行中的這一局（整個遊戲狀態，換裝置接著玩）
     logs/<sid>/<push id>  歷程：login、start、end（end 帶這局的分數、錯題）
     config         { current: '115-1', terms: [...] }
     deleted/<sid>  老師刪除資料的時間（避免舊裝置把刪掉的資料又傳回來）
   ========================================================= */
const BSC = (() => {
  const CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    PURPOSES: ['正式進度', '考試複習', '重補修'], HIST: 30, QS_MAX: 120
  };
  const schoolYear = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1) - 1911;
  const toHalf = s => String(s ?? '').replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').trim();
  const clean = s => String(s).replace(/[.$#\[\]\/\x00-\x1F\x7F\s]/g, '_');
  const makeSid = (term, cls, seat) => clean(`${term}_${toHalf(cls).toUpperCase()}_${Number(seat)}`);
  const defaultTerm = (d = new Date()) => { const m = d.getMonth(); return `${schoolYear(d)}-${m >= 7 || m === 0 ? 1 : 2}`; };
  const validTerm = t => /^\d{2,3}-[12]$/.test(t);
  // 題目代號 → Firebase 可用的 key
  const qkey = id => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return 'q' + (h >>> 0).toString(36); };

  const url = p => `${CONFIG.FIREBASE_URL}/bond-society/${p}.json`;
  async function req(u, method = 'GET', body) {
    const r = await fetch(u, { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  let online = true;
  const ok = () => { online = true; }, fail = e => { online = false; console.warn(e); };

  /* ---------- 學期設定 ---------- */
  async function loadConfig() {
    try { const c = await req(url('config')); if (c && validTerm(c.current)) return { current: c.current, terms: (c.terms || []).filter(validTerm) }; } catch (e) {}
    return { current: defaultTerm(), terms: [defaultTerm()], fallback: true };
  }
  const saveConfig = cfg => req(url('config'), 'PUT', { current: cfg.current, terms: cfg.terms, updatedAt: Date.now() });

  /* ---------- 學生 ---------- */
  const PKEY = 'bond-society-profile', LKEY = sid => `bond-society-player:${sid}`, GKEY = sid => `bond-society-game:${sid}`;
  function blank(p) { return { sid: p.sid, cls: p.cls, seat: p.seat, name: p.name, term: p.term, stuNo: p.stuNo, purpose: p.purpose, games: 0, best: {}, hist: [], prac: {}, qs: {}, tot: { tasks: 0, firstOk: 0, quick: 0, quickOk: 0 }, createdAt: Date.now(), updatedAt: Date.now() }; }
  const ts = x => (x && typeof x === 'object' && Number(x.updatedAt)) || 0;
  // 登入：同時讀雲端與本機，較新的為準；本機舊資料比「老師刪除時間」還舊就丟掉
  async function login(p) {
    let pl = null, sv = null, del = 0, lp = null, lg = null;
    try { lp = JSON.parse(localStorage.getItem(LKEY(p.sid))); lg = JSON.parse(localStorage.getItem(GKEY(p.sid))); } catch (e) {}
    try { [pl, sv, del] = await Promise.all([req(url('players/' + p.sid)), req(url('saves/' + p.sid)), req(url('deleted/' + p.sid)).catch(() => 0)]); ok(); } catch (e) { fail(e); }
    del = Number(del) || 0;
    if (lp && ts(lp) > ts(pl) && ts(lp) > del) pl = lp;
    if (lg && ts(lg) > ts(sv) && ts(lg) > del) sv = lg;
    const P = Object.assign(blank(p), pl && typeof pl === 'object' ? pl : {});
    Object.assign(P, { name: p.name, cls: p.cls, seat: p.seat, term: p.term, stuNo: p.stuNo, purpose: p.purpose, sid: p.sid });
    ['best', 'prac', 'qs', 'tot'].forEach(k => { if (!P[k] || typeof P[k] !== 'object') P[k] = {}; });
    if (!Array.isArray(P.hist)) P.hist = P.hist ? Object.values(P.hist) : [];
    try { localStorage.setItem(PKEY, JSON.stringify({ cls: p.cls, seat: p.seat, name: p.name, stuNo: p.stuNo, purpose: p.purpose })); } catch (e) {}
    log(P.sid, 'login', { purpose: p.purpose });
    return { player: P, game: sv && typeof sv === 'object' && !sv.ended ? sv : null };
  }
  const lastProfile = () => { try { return JSON.parse(localStorage.getItem(PKEY)); } catch (e) { return null; } };

  let pTimer = null, gTimer = null, lastGame = null;
  function savePlayer(P) {
    P.updatedAt = Date.now();
    try { localStorage.setItem(LKEY(P.sid), JSON.stringify(P)); } catch (e) {}
    return req(url('players/' + P.sid), 'PUT', P).then(ok, fail);
  }
  // 遊戲進度：本機每一步都存，雲端最多每 8 秒存一次
  function saveGame(P, S) {
    if (!P) return;
    S.updatedAt = Date.now();
    try { localStorage.setItem(GKEY(P.sid), JSON.stringify(S)); } catch (e) {}
    lastGame = S;
    if (gTimer) return;
    gTimer = setTimeout(() => { gTimer = null; req(url('saves/' + P.sid), 'PUT', lastGame).then(ok, fail); }, 8000);
  }
  function flushGame(P) { if (gTimer) { clearTimeout(gTimer); gTimer = null; } if (P && lastGame) return req(url('saves/' + P.sid), 'PUT', lastGame).then(ok, fail); }
  const clearGame = P => { try { localStorage.removeItem(GKEY(P.sid)); } catch (e) {} lastGame = null; if (gTimer) { clearTimeout(gTimer); gTimer = null; } return req(url('saves/' + P.sid), 'DELETE').then(ok, fail); };
  function log(sid, type, data = {}) { return req(url('logs/' + sid), 'POST', { t: Date.now(), type, ...data }).then(ok, fail); }

  // 一局結束：把這局併入累積成績（只做一次：S.reported）
  function finishGame(P, S, sc) {
    if (!P || S.reported) return;
    S.reported = true;
    const end = (S.ended && S.ended.id) || 'shaky', at = Date.now();
    const rec = { at, level: S.level, code: S.code, timed: !!S.timed, score: sc.total, end, rounds: S.round, rate: Math.round((sc.rate || 0) * 100), prac: sc.practice / 10, money: sc.money, stealth: Math.round(S.stealth) };
    P.games = (P.games || 0) + 1;
    const b = P.best[S.level];
    if (!b || sc.total > b.score) P.best[S.level] = { score: sc.total, end, code: S.code, at, timed: !!S.timed };
    P.hist = [rec, ...(P.hist || [])].slice(0, CONFIG.HIST);
    Object.entries(S.prac || {}).forEach(([t, v]) => { const x = (P.prac[t] = P.prac[t] || { n: 0, ok: 0 }); x.n += v.n; x.ok += v.ok; });
    const st = S.stats || {}, T = P.tot;
    T.tasks = (T.tasks || 0) + (st.tasks || 0); T.firstOk = (T.firstOk || 0) + (st.firstOk || 0); T.quick = (T.quick || 0) + (st.quick || 0); T.quickOk = (T.quickOk || 0) + (st.quickOk || 0);
    (S.ansLog || []).forEach(a => {
      const k = qkey(a.id), x = P.qs[k] || (P.qs[k] = { id: a.id, q: a.q, a: a.ans, tag: a.tag, n: 0, w: 0, p: {} });
      x.n++; if (!a.ok) { x.w++; const pk = (a.pick || '（空白）').slice(0, 40).replace(/[.$#\[\]\/]/g, '_'); x.p[pk] = (x.p[pk] || 0) + 1; }
    });
    // 錯題統計太多時，留下答錯最多、最近的
    const ks = Object.keys(P.qs);
    if (ks.length > CONFIG.QS_MAX) ks.sort((a, b) => P.qs[a].w - P.qs[b].w).slice(0, ks.length - CONFIG.QS_MAX).forEach(k => delete P.qs[k]);
    savePlayer(P);
    log(P.sid, 'end', { ...rec, wrong: (S.ansLog || []).filter(a => !a.ok).slice(0, 40) });
    clearGame(P);
  }

  /* ---------- 老師頁 ---------- */
  const loadPlayers = async () => (await req(url('players'))) || {};
  const loadLogs = async sid => { const l = await req(url('logs/' + sid)); return l ? Object.values(l).sort((a, b) => a.t - b.t) : []; };
  async function removePlayer(sid) {
    await Promise.all([req(url('players/' + sid), 'DELETE'), req(url('logs/' + sid), 'DELETE'), req(url('saves/' + sid), 'DELETE')]);
    try { await req(url('deleted/' + sid), 'PUT', Date.now()); } catch (e) {}
    try { localStorage.removeItem(LKEY(sid)); localStorage.removeItem(GKEY(sid)); } catch (e) {}
  }
  return { CONFIG, toHalf, makeSid, defaultTerm, validTerm, loadConfig, saveConfig, login, lastProfile, savePlayer, saveGame, flushGame, clearGame, log, finishGame, loadPlayers, loadLogs, removePlayer, qkey, isOnline: () => online };
})();
if (typeof module !== 'undefined') module.exports = BSC;
