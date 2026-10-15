/* =========================================================
   隱秘的鍵結社 —— 連線版雲端（Firebase REST＋即時串流）
   ---------------------------------------------------------
   抽屜 bond-mp/<房間代碼>/
     lobby/<sid>      學生進大廳（姓名、班級、座號）
     act/<push id>    學生送出的動作（老師端處理後刪掉）
     pub              大家都看得到的畫面資料（老師端寫）
     fac/<勢力>        勢力內部資料（倉庫、國庫、團隊任務、勝利進度）
     priv/<sid>       個人資料（角色、錢包、雙面人秘密）
     host             老師端完整狀態（重新整理可接著主持）
   即時：EventSource 串流；連不上就每 1.5 秒輪詢
   ========================================================= */
const MPC = (() => {
  const BASE = (typeof BSC !== 'undefined' ? BSC.CONFIG.FIREBASE_URL : 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app') + '/bond-mp';
  const url = p => `${BASE}/${p}.json`;
  async function req(p, method = 'GET', body) {
    const r = await fetch(url(p), { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const get = p => req(p), put = (p, v) => req(p, 'PUT', v), patch = (p, v) => req(p, 'PATCH', v), post = (p, v) => req(p, 'POST', v), del = p => req(p, 'DELETE');
  const roomCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  // 套用串流事件（path 是相對於監聽位置的路徑）
  function applyAt(root, path, data, merge) {
    const ks = path.split('/').filter(Boolean);
    if (!ks.length) { if (merge) { root = root && typeof root === 'object' ? root : {}; Object.entries(data || {}).forEach(([k, v]) => { if (v === null) delete root[k]; else root[k] = v; }); return root; } return data; }
    root = root && typeof root === 'object' ? root : {};
    let cur = root;
    for (let i = 0; i < ks.length - 1; i++) { if (!cur[ks[i]] || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {}; cur = cur[ks[i]]; }
    const last = ks[ks.length - 1];
    if (merge) { cur[last] = cur[last] && typeof cur[last] === 'object' ? cur[last] : {}; Object.entries(data || {}).forEach(([k, v]) => { if (v === null) delete cur[last][k]; else cur[last][k] = v; }); }
    else if (data === null) delete cur[last]; else cur[last] = data;
    return root;
  }
  // 監聽：cb(整份資料, 事件)；回傳 { close }
  function listen(path, cb, { poll = false, every = 1500 } = {}) {
    let data = null, es = null, timer = null, closed = false, last = '', got = false;
    const startPoll = () => {
      if (timer || closed) return;
      const tick = async () => { try { const d = await get(path); const s = JSON.stringify(d); if (s !== last) { last = s; data = d; cb(data, { type: 'poll' }); } } catch (e) {} if (!closed) timer = setTimeout(tick, every); };
      tick();
    };
    const usePoll = poll || typeof EventSource === 'undefined' || (typeof location !== 'undefined' && /[?&]poll=1/.test(location.search));
    if (usePoll) startPoll();
    else {
      try {
        es = new EventSource(url(path));
        const on = merge => e => { try { got = true; const m = JSON.parse(e.data); data = applyAt(data, m.path, m.data, merge); cb(data, { type: merge ? 'patch' : 'put', path: m.path }); } catch (err) {} };
        es.addEventListener('put', on(false)); es.addEventListener('patch', on(true));
        es.addEventListener('cancel', () => { es.close(); startPoll(); });
        es.onerror = () => { if (es.readyState === 2) startPoll(); };
        // 10 秒內都沒有收到資料，就改用輪詢
        setTimeout(() => { if (!got && !timer && !closed) { try { es.close(); } catch (e) {} startPoll(); } }, 10000);
      } catch (e) { startPoll(); }
    }
    return { close: () => { closed = true; if (es) es.close(); if (timer) clearTimeout(timer); } };
  }
  return { BASE, get, put, patch, post, del, listen, roomCode, applyAt };
})();
if (typeof module !== 'undefined') module.exports = MPC;
