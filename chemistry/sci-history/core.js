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
   ・總分＝剩餘金幣×1 − 借款次數×3 ＋ 還款次數×4 − 重來次數×1 ＋ 全對破關章數×5 − 按重玩次數×1
   ・重玩：「全部重玩」（還沒全破時）與「重玩某位科學家」都記錄、每次 −1 分；
     全部破關後的「全部重玩」是自由練習，不寫入正式紀錄
   ・學期由老師在老師頁設定（sci-history/config），學生身分＝學期_班級_座號
   ・每章記錄破關時間（只算畫面開著、正在玩的時間）
   資料：Firebase sci-history/players/<學年_班級_座號>（狀態＋排行榜用數字）
        sci-history/logs/<同上>（完整遊戲歷程）
   ========================================================= */
const SHC = (() => {
  const CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    START: 8, EXP_COST: 1, FAIL_COST: 3, SUBSIDY: 2, LOAN: 8, MAX_LOANS: 2,
    DICE: [1, 1, 2, 2, 2, 3],
    SCORE: { coin: 1, loan: -3, repay: 4, restart: -1, perfect: 5, replay: -1 },
    PURPOSES: ['正式進度', '考試複習', '重補修']
  };

  /* ---------- 身分 ---------- */
  // 學年度：8 月起算新學年，例如 2026 年 10 月 → 115 學年度
  const schoolYear = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1) - 1911;
  const toHalf = s => String(s ?? '').replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').trim();
  const clean = s => String(s).replace(/[.$#\[\]\/\x00-\x1F\x7F\s]/g, '_');
  const makeSid = (term, cls, seat) => clean(`${term}_${toHalf(cls).toUpperCase()}_${Number(seat)}`);
  // 預設學期：8 月～1 月為上學期（-1），2 月～7 月為下學期（-2）
  const defaultTerm = (d = new Date()) => { const m = d.getMonth(); return `${schoolYear(d)}-${m >= 7 || m === 0 ? 1 : 2}`; };
  const validTerm = t => /^\d{2,3}-[12]$/.test(t);

  /* ---------- 狀態 ---------- */
  // 重新開始一整局（replays、gameOvers 會保留下來）
  function freshRun(st) {
    Object.assign(st, { coins: CONFIG.START, loans: 0, repays: 0, restarts: 0, perfect: 0, chapters: {}, done: {}, started: 0 });
    return st;
  }
  function newState(p) {
    return freshRun({ v: 2, sid: p.sid, cls: p.cls, seat: p.seat, name: p.name, term: p.term, stuNo: p.stuNo, purpose: p.purpose, gameOvers: 0, replays: 0, createdAt: Date.now() });
  }
  const debt = st => Math.max(0, st.loans - st.repays) * CONFIG.LOAN;
  const net = st => st.coins - debt(st);
  function score(st) {
    const S = CONFIG.SCORE;
    return st.coins * S.coin + st.loans * S.loan + st.repays * S.repay + st.restarts * S.restart + st.perfect * S.perfect + (st.replays || 0) * S.replay;
  }
  // 排行榜看的數字（存在 players 節點上，老師頁也用）
  function summary(st) {
    return { ...st, score: score(st), net: net(st), updatedAt: Date.now() };
  }

  /* ---------- 歷程紀錄 ---------- */
  let LOG = [];
  let FREE = false;   // 自由重玩模式：不寫入正式紀錄
  function log(type, data = {}) { if (!FREE) LOG.push({ t: Date.now(), type, ...data }); }

  /* ---------- Firebase ---------- */
  const url = p => `${CONFIG.FIREBASE_URL}/sci-history/${p}.json`;
  async function req(u, method = 'GET', body) {
    const r = await fetch(u, { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const LKEY = sid => `sci-history-v2:${sid}`;
  async function load(p) {
    let st = null, lg = null, local = null;
    try { local = JSON.parse(localStorage.getItem(LKEY(p.sid))); } catch (e) {}
    let del = 0;   // 老師刪除這位學生資料的時間（刪除紀錄）
    try { [st, lg, del] = await Promise.all([req(url('players/' + p.sid)), req(url('logs/' + p.sid)), req(url('deleted/' + p.sid)).catch(() => 0)]); } catch (e) {}
    // 斷線時存在本機的進度比雲端新 → 用本機的（之後 persist 會補傳上去）
    const ts = x => (x && typeof x === 'object' && Number(x.updatedAt)) || 0;
    // 但如果本機的進度比「老師刪除」還舊，就是被刪掉的測試資料，不要再用
    if (local && local.st && typeof local.st === 'object' && ts(local.st) > ts(st) && ts(local.st) > (Number(del) || 0)) { st = local.st; lg = local.log; }
    if (!st || typeof st !== 'object') st = null;
    st = Object.assign(newState(p), st || {});
    Object.assign(st, { name: p.name, cls: p.cls, seat: p.seat, term: p.term, stuNo: p.stuNo, purpose: p.purpose, sid: p.sid });
    // 舊版或壞掉的存檔：數字欄位補預設值
    const num = (k, d) => { if (typeof st[k] !== 'number' || !isFinite(st[k])) st[k] = d; };
    num('coins', CONFIG.START); ['loans', 'repays', 'restarts', 'perfect', 'started', 'replays', 'gameOvers'].forEach(k => num(k, 0));
    if (!st.chapters || typeof st.chapters !== 'object') st.chapters = {};
    if (!st.done || typeof st.done !== 'object') st.done = {};
    LOG = Array.isArray(lg) ? lg : (lg ? Object.values(lg) : []);
    return st;
  }
  let saving = Promise.resolve(), lastOk = true;
  function save(st) {
    if (FREE) return Promise.resolve();
    const sum = summary(st);
    try { localStorage.setItem(LKEY(st.sid), JSON.stringify({ st: sum, log: LOG })); } catch (e) {}
    saving = saving.then(() => Promise.all([req(url('players/' + st.sid), 'PUT', sum), req(url('logs/' + st.sid), 'PUT', LOG)]))
      .then(() => { lastOk = true; }, e => { lastOk = false; console.warn(e); });
    return saving;
  }
  // 老師頁刪除學生資料：刪掉進度與歷程，並留下刪除時間（避免某台裝置的本機舊進度又被補傳回來）
  async function removePlayer(sid) {
    await Promise.all([req(url('players/' + sid), 'DELETE'), req(url('logs/' + sid), 'DELETE')]);
    try { await req(url('deleted/' + sid), 'PUT', Date.now()); } catch (e) {}
    try { localStorage.removeItem(LKEY(sid)); } catch (e) {}
  }
  const loadPlayers = async () => (await req(url('players'))) || {};
  // 學期設定：{ current: '115-1', terms: ['115-1', ...] }
  async function loadConfig() {
    try { const c = await req(url('config')); if (c && validTerm(c.current)) return { current: c.current, terms: (c.terms || []).filter(validTerm) }; } catch (e) {}
    return { current: defaultTerm(), terms: [defaultTerm()], fallback: true };
  }
  const saveConfig = cfg => req(url('config'), 'PUT', { current: cfg.current, terms: cfg.terms, updatedAt: Date.now() });
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
    CONFIG, schoolYear, defaultTerm, validTerm, toHalf, makeSid, newState, freshRun, debt, net, score, summary,
    log, getLog: () => LOG, load, save, removePlayer, loadPlayers, loadLogs, loadConfig, saveConfig, syncOk: () => lastOk,
    setFree: v => { FREE = !!v; }, isFree: () => FREE,
    roll, shuffle, fmtTime, esc, md
  };
})();
