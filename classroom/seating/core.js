/* =====================================================================
   🪑 座位大作戰：共用核心（core.js）
   - 資料格式與預設值、教室地圖（含視角轉換）
   - 相鄰判斷（忽略整排／整列走道）
   - 受限隨機分配（Fisher–Yates ＋ 回溯）、違規檢查、衝突診斷
   - 名單與打掃結果匯入解析
   瀏覽器：window.SeatCore；Node 測試：module.exports
   ===================================================================== */
(function (root) {
  'use strict';

  const VERSION = '20261009a';

  /* ---------------- 小工具 ---------------- */
  const key = (r, c) => r + '-' + c;
  const parseKey = (k) => { const [r, c] = String(k).split('-').map(Number); return { r, c }; };
  const pad2 = (n) => String(n).padStart(2, '0');
  const uid = (p) => (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const toArr = (v) => Array.isArray(v) ? v.filter((x) => x != null) : (v && typeof v === 'object' ? Object.values(v).filter((x) => x != null) : []);
  const toNum = (v) => { const n = parseInt(String(v == null ? '' : v).replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 65248)).trim(), 10); return Number.isFinite(n) ? n : null; };
  const clean = (s) => String(s == null ? '' : s).replace(/　/g, ' ').trim();

  /** 洗牌：Fisher–Yates（公平），rng 可替換以便測試 */
  function shuffle(arr, rng) {
    const a = arr.slice(); const R = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /** 座號清單 → "8.19.32"（由小到大） */
  const seatsText = (seats) => toArr(seats).map(Number).filter(Number.isFinite).sort((a, b) => a - b).join('.');

  /* ---------------- 預設值 ---------------- */
  const DEFAULT_CADRES = [
    ['班長', 0], ['副班長', 1], ['風紀', 0], ['學藝1', 0], ['學藝2', 1], ['總務', 0], ['公保', 1],
    ['衛生', 0], ['環保', 1], ['體育1', 0], ['體育2', 1], ['資訊', 0], ['圖書', 1], ['輔導', 0], ['班代', 1], ['豆奶長', 0]
  ].map(([role, join]) => ({ id: uid('c'), role, seat: null, join: !!join }));   // join=true：和上一個職位放同一個框

  const DEFAULT_CLEANING = [
    { id: uid('a'), name: '教室', items: ['地板', '黑板桌', '各種櫃', '垃圾桶', '抬餐', '洗手台', '門窗'] },
    { id: uid('a'), name: '外掃', items: ['樓梯', '地板', '門窗', '洗手台', '垃圾桶'] }
  ].map((a) => ({ id: a.id, name: a.name, items: a.items.map((n) => ({ id: uid('i'), name: n, seats: [] })) }));

  const DEFAULT_NOTE = '※請本班任課老師協助注意，如有同學在未被您允許的情況下，不在屬於自己的位置上學習時，可視同曠課登記，感謝!';

  /* ---------------- 教室地圖 ----------------
     資料座標一律用「學生視角」：r=0 是最前排（靠講台），c=0 是學生的左手邊
     cells：{ "r-c": 's' 座位 | 'x' 關閉座位 | 'a' 走道 }，沒寫的格子＝座位
     marks：周邊標示 [{ id, type:'door'|'board'|'desk'|'text', side:'front'|'back'|'left'|'right', pos, span, label }]
       front／back：pos＝起始列、span＝橫跨幾列；left／right：pos＝第幾排 */
  function newLayout(rows, cols) {
    rows = rows || 7; cols = cols || 6;
    return {
      rows, cols, cells: {},
      marks: [
        { id: uid('m'), type: 'desk', side: 'front', pos: Math.max(0, Math.floor(cols / 2) - 1), span: Math.min(2, cols), label: '講桌' },
        { id: uid('m'), type: 'board', side: 'back', pos: Math.max(0, Math.floor((cols - 4) / 2)), span: Math.min(4, cols), label: '布告欄' },
        { id: uid('m'), type: 'door', side: 'left', pos: 0, span: 1, label: '門' },
        { id: uid('m'), type: 'door', side: 'left', pos: rows - 1, span: 1, label: '門' }
      ]
    };
  }

  const cellType = (layout, k) => (layout.cells && layout.cells[k]) || 's';

  /** 改變行列數：保留原本的格子設定，超出範圍的丟掉、標示夾回範圍內 */
  function resizeLayout(layout, rows, cols) {
    const L = JSON.parse(JSON.stringify(layout));
    L.rows = rows; L.cols = cols;
    const cells = {};
    Object.entries(L.cells || {}).forEach(([k, v]) => { const { r, c } = parseKey(k); if (r < rows && c < cols && v !== 's') cells[k] = v; });
    L.cells = cells;
    L.marks = toArr(L.marks).map((m) => {
      if (m.side === 'front' || m.side === 'back') {
        const span = Math.max(1, Math.min(m.span || 1, cols)); return { ...m, span, pos: Math.max(0, Math.min(m.pos || 0, cols - span)) };
      }
      return { ...m, pos: Math.max(0, Math.min(m.pos || 0, rows - 1)) };
    });
    return L;
  }

  /** 所有可坐的座位（不含關閉、走道） */
  const seatKeys = (layout) => {
    const out = [];
    for (let r = 0; r < layout.rows; r++) for (let c = 0; c < layout.cols; c++) if (cellType(layout, key(r, c)) === 's') out.push(key(r, c));
    return out;
  };

  /** 視角轉換：view='student'（講台在上）或 'teacher'（講台在下，整張圖轉 180°）
      回傳 { grid: [[資料key,…],…]（依畫面由上而下、由左而右）, side(m)→畫面上的邊, start(m)→畫面上的起始位置 } */
  function viewOf(layout, view) {
    const T = view === 'teacher', R = layout.rows, C = layout.cols;
    const grid = [];
    for (let dr = 0; dr < R; dr++) {
      const row = [];
      for (let dc = 0; dc < C; dc++) row.push(T ? key(R - 1 - dr, C - 1 - dc) : key(dr, dc));
      grid.push(row);
    }
    const SIDE = T ? { front: 'bottom', back: 'top', left: 'right', right: 'left' } : { front: 'top', back: 'bottom', left: 'left', right: 'right' };
    const side = (m) => SIDE[m.side];
    const start = (m) => {
      if (m.side === 'front' || m.side === 'back') return T ? C - (m.pos || 0) - (m.span || 1) : (m.pos || 0);
      return T ? R - 1 - (m.pos || 0) : (m.pos || 0);
    };
    return { grid, side, start };
  }

  /* ---------------- 相鄰判斷 ----------------
     老師決定：中間隔著走道「也算相鄰」。做法：把整排都是走道的排、整列都是走道的列抽掉後，
     周圍八格（前後左右斜角）內就算相鄰。 */
  function adjacency(layout) {
    const R = layout.rows, C = layout.cols;
    const rowKeep = [], colKeep = [];
    for (let r = 0; r < R; r++) { let keep = false; for (let c = 0; c < C; c++) if (cellType(layout, key(r, c)) !== 'a') keep = true; rowKeep.push(keep); }
    for (let c = 0; c < C; c++) { let keep = false; for (let r = 0; r < R; r++) if (cellType(layout, key(r, c)) !== 'a') keep = true; colKeep.push(keep); }
    const rIdx = [], cIdx = []; let n = 0;
    rowKeep.forEach((k, i) => { rIdx[i] = n; if (k) n++; }); n = 0;
    colKeep.forEach((k, i) => { cIdx[i] = n; if (k) n++; });
    return function adjacent(k1, k2) {
      if (k1 === k2) return false;
      const a = parseKey(k1), b = parseKey(k2);
      return Math.abs(rIdx[a.r] - rIdx[b.r]) <= 1 && Math.abs(cIdx[a.c] - cIdx[b.c]) <= 1;
    };
  }

  /* ---------------- 秘密規則 ----------------
     { id, type:'apart', a, b, on }          兩人不相鄰
     { id, type:'zone', who, mode:'rows'|'cols'|'cells', list:[], on }   某人只能坐在：某幾排（0＝最前排）／某幾列（0＝學生左手邊）／指定座位 */
  function zoneAllows(rule, k) {
    const { r, c } = parseKey(k); const list = toArr(rule.list);
    if (rule.mode === 'rows') return list.map(Number).includes(r);
    if (rule.mode === 'cols') return list.map(Number).includes(c);
    return list.includes(k);
  }
  const activeRules = (rules) => toArr(rules).filter((x) => x && x.on !== false);

  /** 檢查一張完整座位圖違反哪些規則。assign：{ key: 座號 } */
  function violations(layout, assign, rules) {
    const adj = adjacency(layout);
    const where = {}; Object.entries(assign || {}).forEach(([k, s]) => { if (s != null) where[s] = k; });
    const out = [];
    activeRules(rules).forEach((rule) => {
      if (rule.type === 'apart') {
        const ka = where[rule.a], kb = where[rule.b];
        if (ka && kb && adj(ka, kb)) out.push({ rule, seats: [rule.a, rule.b], keys: [ka, kb] });
      } else if (rule.type === 'zone') {
        const k = where[rule.who];
        if (k && !zoneAllows(rule, k)) out.push({ rule, seats: [rule.who], keys: [k] });
      }
    });
    return out;
  }

  /** 受限隨機分配
      input: { layout, locked:{key:座號}, students:[座號…]（全班）, rules, rng, maxSteps, restarts }
      回傳 { ok, assign:{key:座號}（含 locked）, reason, detail } */
  function solve(input) {
    const { layout, rules, rng } = input;
    const R = rng || Math.random;
    const locked = {}; Object.entries(input.locked || {}).forEach(([k, s]) => { if (s != null && cellType(layout, k) === 's') locked[k] = Number(s); });
    const lockedSeats = new Set(Object.values(locked));
    const students = [...new Set(toArr(input.students).map(Number))].filter((s) => !lockedSeats.has(s));
    const free = seatKeys(layout).filter((k) => !(k in locked));
    if (students.length > free.length) return { ok: false, reason: 'capacity', detail: { students: students.length, seats: free.length } };

    const act = activeRules(rules);
    const adj = adjacency(layout);
    const apart = {}; // 座號 → [對象座號]
    act.filter((x) => x.type === 'apart').forEach((x) => {
      const a = Number(x.a), b = Number(x.b);
      (apart[a] = apart[a] || []).push(b); (apart[b] = apart[b] || []).push(a);
    });
    const domain = {};
    for (const s of students) {
      let d = free;
      act.filter((x) => x.type === 'zone' && Number(x.who) === s).forEach((x) => { d = d.filter((k) => zoneAllows(x, k)); });
      if (!d.length) return { ok: false, reason: 'empty-zone', detail: { seat: s } };
      domain[s] = d;
    }
    const lockedWhere = {}; Object.entries(locked).forEach(([k, s]) => { lockedWhere[s] = k; });

    // 沒有任何規則 → 直接洗牌
    const constrained = students.filter((s) => apart[s] || domain[s].length < free.length);
    if (!constrained.length) {
      const sh = shuffle(free, R); const assign = { ...locked };
      shuffle(students, R).forEach((s, i) => { assign[sh[i]] = s; });
      return { ok: true, assign };
    }

    const maxSteps = input.maxSteps || 20000, restarts = input.restarts || 40;
    for (let t = 0; t < restarts; t++) {
      // 限制多的先排：可坐位置少 → 有不相鄰對象 → 隨機
      const order = shuffle(students, R).sort((a, b) => (domain[a].length - domain[b].length) || ((apart[b] ? 1 : 0) - (apart[a] ? 1 : 0)));
      const placed = {}; const used = new Set(); let steps = 0;
      const ok = (s, k) => (apart[s] || []).every((p) => { const kp = placed[p] || lockedWhere[p]; return !kp || !adj(k, kp); });
      const dfs = (i) => {
        if (i === order.length) return true;
        if (++steps > maxSteps) return false;
        const s = order[i];
        for (const k of shuffle(domain[s], R)) {
          if (used.has(k) || !ok(s, k)) continue;
          placed[s] = k; used.add(k);
          if (dfs(i + 1)) return true;
          delete placed[s]; used.delete(k);
          if (steps > maxSteps) return false;
        }
        return false;
      };
      if (dfs(0)) {
        const assign = { ...locked };
        Object.entries(placed).forEach(([s, k]) => { assign[k] = Number(s); });
        return { ok: true, assign };
      }
    }
    return { ok: false, reason: 'rules' };
  }

  /** 分配失敗時找原因：逐條暫停規則，看停掉哪一條就能成功 */
  function diagnose(input) {
    const first = solve(input);
    if (first.ok) return { ok: true, culprits: [] };
    if (first.reason === 'capacity') return { ok: false, reason: 'capacity', detail: first.detail, culprits: [] };
    const act = activeRules(input.rules);
    const culprits = act.filter((rule) => solve({ ...input, rules: act.filter((x) => x !== rule), restarts: 10, maxSteps: 8000 }).ok);
    return { ok: false, reason: first.reason, detail: first.detail, culprits };
  }

  /* ---------------- 匯入解析 ---------------- */
  /** 名單：rows 可以是 Excel 轉出的物件陣列，或貼上的文字 */
  function parseRoster(rows) {
    const out = [], errors = [];
    let list = rows;
    if (typeof rows === 'string') {
      list = rows.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
        const p = l.split(/[\s,，\t]+/).filter(Boolean);
        return { 座號: p[0], 學號: p[1], 姓名: p.slice(2).join(' ') };
      }).filter((o) => !/座號/.test(o['座號']));   // 跳過標題列
    }
    list.forEach((o, i) => {
      const line = i + 1;
      const seat = toNum(o['座號']), sid = clean(o['學號']), name = clean(o['姓名']);
      if (seat == null && !sid && !name) return;
      if (seat == null || seat < 1 || seat > 99) return errors.push(`第 ${line} 筆：座號「${clean(o['座號'])}」不是 1～99 的數字`);
      if (!name) return errors.push(`第 ${line} 筆：缺少姓名`);
      if (!sid) errors.push(`第 ${line} 筆（${seat} 號 ${name}）：缺少學號（線上暗標時需要）`);
      out.push({ seat, sid, name });
    });
    const seen = {}, seenSid = {};
    out.forEach((s) => {
      if (seen[s.seat]) errors.push(`座號 ${s.seat} 重複（${seen[s.seat]}、${s.name}）`); else seen[s.seat] = s.name;
      if (s.sid) { if (seenSid[s.sid]) errors.push(`學號 ${s.sid} 重複（${seenSid[s.sid]}、${s.name}）`); else seenSid[s.sid] = s.name; }
    });
    out.sort((a, b) => a.seat - b.seat);
    return { students: out, errors };
  }

  /** 打掃徵才結果（依項目）：支援 v4「打掃項目」與 v3.4「中籤打掃項目」
      「[教室]地板天花板」→ 區域「教室」、項目「地板天花板」 */
  function parseCleaning(rows) {
    const items = [], index = {}, errors = [];
    toArr(rows).forEach((o, i) => {
      const raw = clean(o['打掃項目'] != null ? o['打掃項目'] : o['中籤打掃項目']);
      const seat = toNum(o['座號']);
      if (!raw) return;
      if (seat == null) return errors.push(`第 ${i + 1} 筆：座號不是數字`);
      const m = raw.match(/^[\[［【](.+?)[\]］】]\s*(.+)$/);
      const area = m ? clean(m[1]) : '', name = m ? clean(m[2]) : raw;
      const k = area + '|' + name;
      if (!index[k]) { index[k] = { area, name, seats: [], names: [] }; items.push(index[k]); }
      if (!index[k].seats.includes(seat)) { index[k].seats.push(seat); index[k].names.push(clean(o['姓名'])); }
    });
    if (!items.length) errors.push('找不到「打掃項目」或「中籤打掃項目」欄位的資料，請確認是打掃徵才系統「依項目」匯出的檔案');
    return { items, errors };
  }

  /* ---------------- 班級資料正規化（Firebase 會把陣列存成物件、空陣列會消失） ---------------- */
  function newClass(name) {
    return {
      id: uid('cls'), name: name || '', teacherTitle: '', roster: [],
      layout: newLayout(7, 6),
      cadres: DEFAULT_CADRES.map((c) => ({ ...c, id: uid('c') })),
      cleaning: DEFAULT_CLEANING.map((a) => ({ id: uid('a'), name: a.name, items: a.items.map((it) => ({ ...it, id: uid('i'), seats: [] })) })),
      secret: [], rounds: [], currentRound: null,
      settings: { note: DEFAULT_NOTE, stageView: 'student', printView: 'teacher', gameMode: 'game' },
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }

  function normalizeLayout(L) {
    L = L || newLayout(7, 6);
    return { rows: Number(L.rows) || 7, cols: Number(L.cols) || 6, cells: L.cells || {}, marks: toArr(L.marks) };
  }

  function normalizeClass(c) {
    const d = newClass(c && c.name);
    c = c || {};
    const out = { ...d, ...c };
    out.roster = toArr(c.roster).map((s) => ({ seat: Number(s.seat), sid: s.sid || '', name: s.name || '' })).sort((a, b) => a.seat - b.seat);
    out.layout = normalizeLayout(c.layout);
    out.cadres = c.cadres ? toArr(c.cadres).map((x) => ({ id: x.id || uid('c'), role: x.role || '', seat: x.seat == null ? null : Number(x.seat), join: !!x.join })) : d.cadres;
    out.cleaning = c.cleaning ? toArr(c.cleaning).map((a) => ({ id: a.id || uid('a'), name: a.name || '', items: toArr(a.items).map((it) => ({ id: it.id || uid('i'), name: it.name || '', seats: toArr(it.seats).map(Number) })) })) : d.cleaning;
    out.secret = toArr(c.secret).map((x) => ({ ...x, list: toArr(x.list) }));
    out.settings = { ...d.settings, ...(c.settings || {}) };
    out.rounds = toArr(c.rounds).map((rd) => ({
      id: rd.id || uid('rd'), title: rd.title || '換座位', period: rd.period || '', createdAt: rd.createdAt || Date.now(),
      status: rd.status || 'prep', layout: normalizeLayout(rd.layout),
      locked: rd.locked || {}, lockInfo: rd.lockInfo || {}, assign: rd.assign || null,
      drawnAt: rd.drawnAt || null, finalAt: rd.finalAt || null
    })).sort((a, b) => a.createdAt - b.createdAt);
    return out;
  }

  /** 去掉 undefined（Firebase 不接受） */
  const sanitize = (o) => JSON.parse(JSON.stringify(o));

  const api = {
    VERSION, key, parseKey, pad2, uid, toArr, toNum, shuffle, seatsText,
    DEFAULT_CADRES, DEFAULT_CLEANING, DEFAULT_NOTE,
    newLayout, resizeLayout, cellType, seatKeys, viewOf, adjacency,
    zoneAllows, activeRules, violations, solve, diagnose,
    parseRoster, parseCleaning, newClass, normalizeClass, sanitize
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeatCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
