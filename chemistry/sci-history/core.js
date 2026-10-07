/* =========================================================
   時光手稿：科學史大冒險 — 規則與存檔核心（學生頁、老師頁共用）
   ---------------------------------------------------------
   老師訂的規則（2026-10-07）：
   ・學生扮演投資人，一開始 8 金幣；每做一個實驗固定 1 金幣
   ・支持錯誤論點 → 進入虛構平行時空 → 扣 3 金幣，回到本章開頭重來
   ・每個分岔點「第一次就選對」→ 結算時擲一顆投資回報骰（1,1,2,2,2,3）
   ・開啟下一位科學家的劇本時，補助 2 金幣
   ・金幣變負數＝破產 → 向大師銀行借 8 金幣（最多 2 次）；第 3 次破產整個遊戲重來
   ・金幣夠時可以還款（一次還 8 金幣）
   ・總分＝剩餘金幣×1 − 借款次數×3 ＋ 還款次數×4 − 重來次數×1 ＋ 全對破關章數×5
   ・每章記錄破關時間（只算畫面開著、正在玩的時間）
   資料：Firebase sci-history/players/<學年_班級_座號>（狀態＋排行榜用數字）
        sci-history/logs/<同上>（完整遊戲歷程）
   ========================================================= */
const SHC = (() => {
  const CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    START: 8, EXP_COST: 1, FAIL_COST: 3, SUBSIDY: 2, LOAN: 8, MAX_LOANS: 2,
    DICE: [1, 1, 2, 2, 2, 3],
    SCORE: { coin: 1, loan: -3, repay: 4, restart: -1, perfect: 5 }
  };

  /* ---------- 身分 ---------- */
  // 學年度：8 月起算新學年，例如 2026 年 10 月 → 115 學年度
  const schoolYear = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1) - 1911;
  const toHalf = s => String(s ?? '').replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').trim();
  const clean = s => String(s).replace(/[.$#\[\]\/\x00-\x1F\x7F\s]/g, '_');
  const makeSid = (year, cls, seat) => clean(`${year}_${toHalf(cls).toUpperCase()}_${Number(seat)}`);

  /* ---------- 狀態 ---------- */
  function freshRun(st) {
    Object.assign(st, { coins: CONFIG.START, loans: 0, repays: 0, restarts: 0, perfect: 0, chapters: {}, done: {}, started: 0 });
    return st;
  }
  function newState(p) {
    return freshRun({ v: 1, sid: p.sid, cls: p.cls, seat: p.seat, name: p.name, year: p.year, gameOvers: 0, createdAt: Date.now() });
  }
  const debt = st => Math.max(0, st.loans - st.repays) * CONFIG.LOAN;
  const net = st => st.coins - debt(st);
  function score(st) {
    const S = CONFIG.SCORE;
    return st.coins * S.coin + st.loans * S.loan + st.repays * S.repay + st.restarts * S.restart + st.perfect * S.perfect;
  }
  // 排行榜看的數字（存在 players 節點上，老師頁也用）
  function summary(st) {
    return { ...st, score: score(st), net: net(st), updatedAt: Date.now() };
  }

  /* ---------- 歷程紀錄 ---------- */
  let LOG = [];
  function log(type, data = {}) { LOG.push({ t: Date.now(), type, ...data }); }

  /* ---------- Firebase ---------- */
  const url = p => `${CONFIG.FIREBASE_URL}/sci-history/${p}.json`;
  async function req(u, method = 'GET', body) {
    const r = await fetch(u, { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const LKEY = sid => `sci-history-v2:${sid}`;
  async function load(p) {
    let st = null, lg = null;
    try { [st, lg] = await Promise.all([req(url('players/' + p.sid)), req(url('logs/' + p.sid))]); }
    catch (e) { try { const c = JSON.parse(localStorage.getItem(LKEY(p.sid))); if (c) { st = c.st; lg = c.log; } } catch (e2) {} }
    if (!st) st = newState(p);
    Object.assign(st, { name: p.name, cls: p.cls, seat: p.seat, year: p.year, sid: p.sid });
    st.chapters = st.chapters || {}; st.done = st.done || {};
    LOG = Array.isArray(lg) ? lg : (lg ? Object.values(lg) : []);
    return st;
  }
  let saving = Promise.resolve(), lastOk = true;
  function save(st) {
    const sum = summary(st);
    try { localStorage.setItem(LKEY(st.sid), JSON.stringify({ st: sum, log: LOG })); } catch (e) {}
    saving = saving.then(() => Promise.all([req(url('players/' + st.sid), 'PUT', sum), req(url('logs/' + st.sid), 'PUT', LOG)]))
      .then(() => { lastOk = true; }, e => { lastOk = false; console.warn(e); });
    return saving;
  }
  const loadPlayers = async () => (await req(url('players'))) || {};
  const loadLogs = async sid => { const l = await req(url('logs/' + sid)); return Array.isArray(l) ? l : (l ? Object.values(l) : []); };

  /* ---------- 小工具 ---------- */
  const roll = () => CONFIG.DICE[Math.floor(Math.random() * CONFIG.DICE.length)];
  // 固定亂序：同一個學生、同一個分岔點，選項順序固定（避免背位置，但重來時不會亂跳）
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(arr, seed) { const a = [...arr]; let x = hash(seed) || 1; for (let i = a.length - 1; i > 0; i--) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  return {
    CONFIG, schoolYear, toHalf, makeSid, newState, freshRun, debt, net, score, summary,
    log, getLog: () => LOG, load, save, loadPlayers, loadLogs, syncOk: () => lastOk,
    roll, shuffle, fmtTime, esc, md
  };
})();
