/* =========================================================
   隱秘的鍵結社 —— 連線版雲端（Firebase REST＋即時串流）
   ---------------------------------------------------------
   抽屜 bond-mp/<房間代碼>/
     lobby/<sid>      學生進大廳（姓名、班級、座號）
     act/<push id>    學生送出的動作（老師端處理後刪掉）
     v/<sid>          每位學生自己的畫面資料 { g 公開, f 自己勢力, p 個人 }（老師端只改有變的欄位）
     host             老師端完整狀態（重新整理可接著主持）
     clock/<id>       量伺服器時間用
   即時：每位學生只開 1 條 EventSource 串流（Firebase 免費方案同時連線上限 100）；
        串流斷線會自動重連，45 秒沒有任何訊息（含心跳）就重開，連不上改每 1.5 秒輪詢
   ========================================================= */
const MPC = (() => {
  const BASE = (typeof BSC !== 'undefined' ? BSC.CONFIG.FIREBASE_URL : 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app') + '/bond-mp';
  let base = BASE;
  const url = p => `${base}/${p}.json`;
  async function req(p, method = 'GET', body, timeout = 12000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url(p), { method, cache: 'no-store', signal: ctl ? ctl.signal : undefined, headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { if (tm) clearTimeout(tm); }
  }
  const get = p => req(p), put = (p, v) => req(p, 'PUT', v), patch = (p, v) => req(p, 'PATCH', v), post = (p, v) => req(p, 'POST', v), del = p => req(p, 'DELETE');
  // 失敗自動重試（網路不穩時）
  async function retry(fn, n = 3) { let e; for (let i = 0; i < n; i++) { try { return await fn(); } catch (err) { e = err; await new Promise(r => setTimeout(r, 400 * (i + 1))); } } throw e; }
  const roomCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  // 量伺服器時間：伺服器時間 ≈ Date.now() + offset
  async function serverOffset(room) {
    let best = null;
    for (let i = 0; i < 3; i++) {
      try {
        const id = Math.random().toString(36).slice(2, 8), t0 = Date.now();
        const ts = await req(`${room}/clock/${id}`, 'PUT', { '.sv': 'timestamp' }), t1 = Date.now();
        req(`${room}/clock/${id}`, 'DELETE').catch(() => {});
        if (typeof ts === 'number' && (!best || t1 - t0 < best.rtt)) best = { rtt: t1 - t0, off: ts - (t0 + t1) / 2 };
      } catch (e) {}
    }
    return best ? Math.round(best.off) : 0;
  }
  // 把串流事件套用到本地副本（patch 的 key 可能是多層路徑）
  function setAt(root, ks, data) {
    if (!ks.length) return data;
    root = root && typeof root === 'object' ? root : {};
    let cur = root;
    for (let i = 0; i < ks.length - 1; i++) { if (!cur[ks[i]] || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {}; cur = cur[ks[i]]; }
    const last = ks[ks.length - 1];
    if (data === null) delete cur[last]; else cur[last] = data;
    return root;
  }
  const split = p => String(p || '').split('/').filter(Boolean);
  function applyAt(root, path, data, merge) {
    if (!merge) return setAt(root, split(path), data);
    Object.entries(data || {}).forEach(([k, v]) => { root = setAt(root, [...split(path), ...split(k)], v); });
    return root;
  }
  // 監聽：cb(整份資料, 事件)；回傳 { close, refresh, mode }
  function listen(path, cb, { poll = false, every = 1500 } = {}) {
    let data = null, es = null, timer = null, wd = null, closed = false, paused = false, last = '', lastMsg = 0, mode = '';
    const forcePoll = poll || typeof EventSource === 'undefined' || (typeof location !== 'undefined' && /[?&]poll=1/.test(location.search));
    const emit = ev => { try { cb(data, ev); } catch (e) { console.warn(e); } };
    const startPoll = () => {
      if (timer || closed || paused) return; mode = 'poll';
      const tick = async () => { try { const d = await get(path); const s = JSON.stringify(d); if (s !== last) { last = s; data = d; emit({ type: 'poll' }); } } catch (e) {} if (!closed && !paused) timer = setTimeout(tick, every); else timer = null; };
      tick();
    };
    const startStream = () => {
      if (closed || paused) return;
      try { if (es) es.close(); } catch (e) {}
      mode = 'stream'; lastMsg = Date.now(); let got = false;
      es = new EventSource(url(path));
      const on = merge => e => { lastMsg = Date.now(); try { got = true; const m = JSON.parse(e.data); data = applyAt(data, m.path, m.data, merge); emit({ type: merge ? 'patch' : 'put', path: m.path }); } catch (err) {} };
      es.addEventListener('put', on(false)); es.addEventListener('patch', on(true));
      es.addEventListener('keep-alive', () => { lastMsg = Date.now(); });
      es.addEventListener('cancel', () => { try { es.close(); } catch (e) {} es = null; startPoll(); });
      es.addEventListener('auth_revoked', () => { try { es.close(); } catch (e) {} es = null; startPoll(); });
      es.onerror = () => { if (es && es.readyState === 2) { es = null; if (!got) startPoll(); else setTimeout(startStream, 1500); } };
      setTimeout(() => { if (!got && !closed && mode === 'stream') { try { es.close(); } catch (e) {} es = null; startPoll(); } }, 10000);
    };
    if (forcePoll) startPoll(); else startStream();
    // 看門狗：串流 45 秒沒任何訊息（Firebase 約 30 秒送一次心跳）就重開
    wd = setInterval(() => { if (!closed && !paused && mode === 'stream' && Date.now() - lastMsg > 45000) startStream(); }, 10000);
    return {
      close: () => { closed = true; try { if (es) es.close(); } catch (e) {} if (timer) clearTimeout(timer); clearInterval(wd); },
      // 暫停：背景分頁先放掉連線（Spark 方案同時連線上限 100），refresh() 再接回來
      pause: () => { if (closed || paused) return; paused = true; try { if (es) es.close(); } catch (e) {} es = null; if (timer) { clearTimeout(timer); timer = null; } },
      refresh: () => { if (closed) return; paused = false; if (mode === 'stream' || !mode) startStream(); else { if (timer) { clearTimeout(timer); timer = null; } startPoll(); } },
      get mode() { return paused ? 'paused' : mode; }
    };
  }
  // 背景閒置：分頁藏起來 ms 毫秒後 pause()，回到前景立刻 refresh()
  function idle(lis, ms = 60000) {
    let t = null;
    const on = () => { if (typeof document === 'undefined') return; if (document.hidden) { clearTimeout(t); t = setTimeout(() => lis && lis.pause(), ms); } else { clearTimeout(t); t = null; if (lis) lis.refresh(); } };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', on);
    return () => { clearTimeout(t); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', on); };
  }
  return { idle, BASE, setBase: b => { base = b; }, get, put, patch, post, del, retry, listen, roomCode, applyAt, serverOffset };
})();
if (typeof module !== 'undefined') module.exports = MPC;
