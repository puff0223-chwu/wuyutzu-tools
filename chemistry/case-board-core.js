/* =========================================================
   No.940 案件委託公告欄 — 共用核心（學生頁、老師頁都會載入）
   ---------------------------------------------------------
   ・老師開一個公告欄（6 碼代碼），學生用代碼加入
   ・學生發布「委託」（問題），其他同學「承接」後面對面講解
   ・委託人按「完成」並給 1～3 顆星；接案偵探每破一案得 1 點
   ・資料放在 Firebase：case-board/<代碼>/{meta, members, tasks}
   ・畫面用 Firebase 即時推送（EventSource）自動更新，連不上時改成每 4 秒輪詢
   ========================================================= */
const CB = (() => {

  const CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    DB_PATH: 'case-board',
    STAR_MIN_COUNT: 5,          // 累積幾個評價後，偵探才看得到自己的平均星數
    POINTS_PER_CASE: 1,         // 每破一案得幾點
    POLL_MS: 4000
  };

  // 委託出處
  const SOURCES = [
    { key: 'book',  label: '課本',     vol: '冊別（選填）',       volPh: '例：第一冊',     page: true },
    { key: 'work',  label: '習作',     vol: '冊別（選填）',       volPh: '例：第一冊',     page: true },
    { key: 'note',  label: '講義',     vol: '講義名稱（選填）',   volPh: '例：複習講義',   page: true },
    { key: 'exam',  label: '考卷',     vol: '哪一份考卷',         volPh: '例：第 3 回小考', page: false },
    { key: 'other', label: '其他',     vol: '出處說明',           volPh: '例：學測考古題 110 年', page: false }
  ];
  const STATUS = {
    open:      { label: '待承接', icon: '📌' },
    taken:     { label: '偵辦中', icon: '🔍' },
    done:      { label: '已破案', icon: '✅' },
    cancelled: { label: '已撤回', icon: '↩️' },
    removed:   { label: '已移除', icon: '🗑️' }
  };

  /* ---------- 代碼 ---------- */
  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const makeCode = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * 32)]).join('');
  const normalizeCode = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const validCode = s => /^[2-9A-HJ-NP-Z]{6}$/.test(normalizeCode(s));
  const prettyCode = c => c.slice(0, 3) + '-' + c.slice(3);

  /* ---------- 小工具 ---------- */
  const toHalf = s => String(s ?? '').replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ');
  const normalizeClass = s => toHalf(s).trim().toUpperCase();
  const studentId = (cls, seat) => `${normalizeClass(cls)}_${Number(seat)}`.replace(/[.$#\[\]\/\x00-\x1F\x7F]/g, '_');
  const newTaskId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const who = (seat, name) => `${seat} 號 ${name}`;

  // 委託出處的一行文字，例如「課本 第一冊 p.45 第 3 題」
  function sourceText(t) {
    const src = SOURCES.find(s => s.key === t.src) || SOURCES[4];
    const parts = [src.label];
    if (t.vol) parts.push(t.vol);
    if (t.page) parts.push(`p.${t.page}`);
    if (t.num) parts.push(`第 ${t.num} 題`);
    return parts.join(' ');
  }
  // 經過多久，例如「3 分鐘」
  function ago(ts, now = Date.now()) {
    const s = Math.max(0, Math.floor((now - ts) / 1000));
    if (s < 60) return '剛剛';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} 分鐘`;
    return `${Math.floor(m / 60)} 小時 ${m % 60} 分`;
  }

  /* ---------- Firebase ---------- */
  const base = code => `${CONFIG.FIREBASE_URL}/${CONFIG.DB_PATH}/${code}`;
  async function req(url, method = 'GET', body) {
    const res = await fetch(url, {
      method, cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const getMeta = code => req(`${base(code)}/meta.json`);
  const getAll = async code => (await req(`${base(code)}.json`)) || {};
  const putMeta = (code, meta) => req(`${base(code)}/meta.json`, 'PUT', meta);
  const putMember = (code, sid, m) => req(`${base(code)}/members/${encodeURIComponent(sid)}.json`, 'PUT', m);
  const putTask = (code, id, t) => req(`${base(code)}/tasks/${encodeURIComponent(id)}.json`, 'PUT', t);

  // 即時訂閱：onChange(state) 會在資料變動時被呼叫
  function subscribe(code, onChange, onStatus = () => {}) {
    let state = {}, es = null, pollTimer = null, closed = false;
    const emit = () => onChange(state);
    const setAt = (path, data) => {
      const keys = path.split('/').filter(Boolean);
      if (!keys.length) { state = data || {}; return; }
      let o = state;
      for (let i = 0; i < keys.length - 1; i++) { if (typeof o[keys[i]] !== 'object' || o[keys[i]] === null) o[keys[i]] = {}; o = o[keys[i]]; }
      const last = keys[keys.length - 1];
      if (data === null) delete o[last]; else o[last] = data;
    };
    const poll = async () => {
      try { state = await getAll(code); emit(); onStatus('poll'); }
      catch (e) { onStatus('offline'); }
    };
    const startPolling = () => {
      if (pollTimer || closed) return;
      poll(); pollTimer = setInterval(poll, CONFIG.POLL_MS);
    };
    if (typeof EventSource !== 'undefined') {
      try {
        es = new EventSource(`${base(code)}.json`);
        es.addEventListener('put', e => { const d = JSON.parse(e.data); setAt(d.path, d.data); emit(); onStatus('live'); });
        es.addEventListener('patch', e => { const d = JSON.parse(e.data); Object.entries(d.data || {}).forEach(([k, v]) => setAt(`${d.path}/${k}`, v)); emit(); onStatus('live'); });
        es.addEventListener('cancel', () => { es.close(); startPolling(); });
        es.addEventListener('auth_revoked', () => { es.close(); startPolling(); });
        es.onerror = () => { if (es.readyState === 2) startPolling(); else onStatus('reconnect'); };
      } catch (e) { startPolling(); }
    } else startPolling();
    return {
      refresh: poll,
      get: () => state,
      close() { closed = true; if (es) es.close(); clearInterval(pollTimer); }
    };
  }

  /* ---------- 整理資料 ---------- */
  const taskList = state => Object.entries(state.tasks || {}).map(([id, t]) => ({ id, ...t }));

  // 每位學生的統計：發布數、被解決數、解題數、點數、評價
  function stats(state) {
    const map = new Map();
    const get = (sid, cls, seat, name) => {
      if (!map.has(sid)) map.set(sid, { sid, cls: cls ?? '', seat: seat ?? '', name: name ?? '', posted: 0, solvedMine: 0, openMine: 0, cases: 0, points: 0, stars: [], tried: 0 });
      const s = map.get(sid);
      if (name) s.name = name; if (seat !== undefined && seat !== '') s.seat = seat; if (cls) s.cls = cls;
      return s;
    };
    Object.entries(state.members || {}).forEach(([sid, m]) => get(sid, m.cls, m.seat, m.name));
    taskList(state).forEach(t => {
      if (t.status === 'removed') return;
      if (t.sid && t.sid !== 'TEACHER') {
        const r = get(t.sid, t.cls, t.seat, t.name);
        if (t.status !== 'cancelled') r.posted++;
        if (t.status === 'done') r.solvedMine++;
        if (t.status === 'open' || t.status === 'taken') r.openMine++;
      }
      if (t.status === 'done' && t.solver && t.solver !== 'TEACHER') {
        const s = get(t.solver, t.solverCls, t.solverSeat, t.solverName);
        s.cases++; s.points += CONFIG.POINTS_PER_CASE;
        if (t.stars) s.stars.push(t.stars);
      }
      (Array.isArray(t.tries) ? t.tries : Object.values(t.tries || {})).forEach(x => {
        if (x && x.solver && x.solver !== 'TEACHER') get(x.solver, x.cls, x.seat, x.name).tried++;
      });
    });
    return [...map.values()].map(s => ({ ...s, avg: s.stars.length ? s.stars.reduce((a, b) => a + b, 0) / s.stars.length : null }))
      .sort((a, b) => String(a.cls).localeCompare(String(b.cls)) || Number(a.seat) - Number(b.seat));
  }

  return {
    CONFIG, SOURCES, STATUS,
    makeCode, normalizeCode, validCode, prettyCode,
    normalizeClass, studentId, newTaskId, esc, who, sourceText, ago,
    getMeta, getAll, putMeta, putMember, putTask, subscribe, taskList, stats
  };
})();
