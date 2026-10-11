/* 🧭 遺落的地點：共用核心（老師頁、學生頁共用）
   - 題庫資料格式與整理（normalizeBank）
   - 照片網址（r: 放在網站 p/ 資料夾；f: 老師上傳、存在 Firebase）
   - 照片壓縮、區域中心與距離、固定亂數
   - 紙本版組題（makeVersions）
*/
(function () {
  'use strict';
  const DB_URL = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app/';
  const VIEW_DIST = [['', '未標'], ['far', '遠景'], ['mid', '中景'], ['close', '特寫'], ['macro', '超特寫']];
  const VIEW_ANGLE = [['', '未標'], ['level', '平視'], ['up', '仰角'], ['down', '俯角'], ['tilt', '斜角']];
  const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北']; // 地圖上方＝北
  const ZONE_COLORS = ['#2f6db5', '#1f9e8f', '#7a4fd0', '#d9822b', '#c94f7c', '#3f9d4a', '#b8860b', '#8b5a2b', '#e4572e', '#6b7280', '#5a8fd6', '#a0522d'];

  // ---------- 小工具 ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = (n) => { const a = new Uint8Array(n || 5); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); };
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- 題庫整理 ----------
  function normPoint(p, key) {
    p = p || {};
    const no = parseInt(p.no, 10) || 0;
    const accept = (Array.isArray(p.accept) ? p.accept : String(p.accept || '').split(/[,，、\s]+/)).map((x) => parseInt(x, 10)).filter((x) => x > 0);
    return {
      no, name: String(p.name || ''), x: +p.x || 50, y: +p.y || 50, zone: p.zone || '',
      photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : [],
      accept: accept.length ? Array.from(new Set(accept)) : (no ? [no] : []),
      enabled: p.enabled !== false, teach: !!p.teach, base: +p.base || 10,
      hint1: String(p.hint1 || ''), hint2: String(p.hint2 || ''),
      view: { dist: (p.view && p.view.dist) || '', angle: (p.view && p.view.angle) || '', odd: !!(p.view && p.view.odd) },
      cam: p.cam && p.cam.x != null ? { x: +p.cam.x, y: +p.cam.y, dir: (+p.cam.dir || 0) % 8 } : null,
      reveal: p.reveal || '', task: p.task && p.task.q ? { q: String(p.task.q), a: String(p.task.a || ''), open: !!p.task.open, bonus: +p.task.bonus || 5 } : null,
      author: String(p.author || ''), note: String(p.note || ''), key
    };
  }
  function normalizeBank(b) {
    b = b || {};
    const zones = (Array.isArray(b.zones) ? b.zones : Object.values(b.zones || {})).filter(Boolean).map((z, i) => ({ id: z.id || 'z' + rid(3), name: z.name || '區域' + (i + 1), color: z.color || ZONE_COLORS[i % ZONE_COLORS.length], cap: Math.max(1, +z.cap || 2) }));
    const noGo = (Array.isArray(b.noGo) ? b.noGo : Object.values(b.noGo || {})).filter(Boolean).map((r) => ({ id: r.id || 'ng' + rid(3), label: r.label || '教學區', x: +r.x, y: +r.y, w: +r.w, h: +r.h }));
    const points = {};
    Object.entries(b.points || {}).forEach(([k, p]) => { if (p) points[k] = normPoint(p, k); });
    return {
      owner: b.owner || '', name: b.name || '未命名題庫',
      map: b.map && b.map.src ? { src: b.map.src, w: +b.map.w || 1000, h: +b.map.h || 1400 } : { src: 'r:map', w: 1117, h: 1579 },
      zones, noGo, points, updatedAt: b.updatedAt || 0, version: b.version || 1
    };
  }
  // 存進 Firebase 前：拿掉 key、空值（Firebase 不收 undefined）
  function packBank(bank) {
    const out = JSON.parse(JSON.stringify(bank));
    Object.values(out.points).forEach((p) => { delete p.key; if (!p.cam) delete p.cam; if (!p.task) delete p.task; });
    return out;
  }
  const sortedPoints = (bank) => Object.values(bank.points).sort((a, b) => a.no - b.no);
  const zoneById = (bank) => Object.fromEntries(bank.zones.map((z) => [z.id, z]));
  function zoneCenters(bank) {
    const acc = {};
    Object.values(bank.points).forEach((p) => { const a = acc[p.zone] || (acc[p.zone] = { x: 0, y: 0, n: 0 }); a.x += p.x; a.y += p.y; a.n++; });
    const out = {};
    Object.entries(acc).forEach(([z, a]) => { out[z] = { x: a.x / a.n, y: a.y / a.n }; });
    return out;
  }
  // 地圖用百分比，換回同比例的距離（寬高比不同）
  function dist(bank, a, b) { const r = bank.map.h / bank.map.w; return Math.hypot(a.x - b.x, (a.y - b.y) * r); }
  function inNoGo(bank, p) { return bank.noGo.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) || null; }
  function viewLabel(v) {
    const d = (VIEW_DIST.find((x) => x[0] === v.dist) || [])[1], a = (VIEW_ANGLE.find((x) => x[0] === v.angle) || [])[1];
    return [v.dist ? d : '', v.angle ? a : '', v.odd ? '奇特視角' : ''].filter(Boolean).join('・');
  }

  // ---------- 照片 ----------
  const photoCache = {};
  function photoURL(ref, base) {
    base = base || '';
    if (!ref) return '';
    if (ref.startsWith('data:')) return ref;
    if (ref === 'r:map') return base + 'map.png';
    if (ref.startsWith('r:')) return base + 'p/' + ref.slice(2) + '.jpg';
    if (ref.startsWith('f:')) return photoCache[ref.slice(2)] || '';
    return ref;
  }
  // f: 照片要先從 Firebase 讀（REST，知道代碼才讀得到）
  async function loadPhoto(ref) {
    if (!ref || !ref.startsWith('f:')) return photoURL(ref);
    const id = ref.slice(2);
    if (photoCache[id]) return photoCache[id];
    const r = await fetch(DB_URL + 'orienteering/photos/' + id + '/data.json');
    const v = r.ok ? await r.json() : null;
    if (v) photoCache[id] = v;
    return v || '';
  }
  function compressImage(file, max, quality) {
    max = max || 800; quality = quality || 0.72;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight; const s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ data: c.toDataURL('image/jpeg', quality), w, h });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('讀不到這張圖片')); };
      img.src = url;
    });
  }

  // ---------- 紙本版組題 ----------
  // 每份盡量「一區一個點」分散全校；各份的第一個點落在不同區域；點不夠時才重複使用
  function makeVersions(bank, opt) {
    const n = Math.max(1, opt.n | 0), k = Math.max(1, opt.k | 0), rnd = mulberry(opt.seed || 1);
    const pool = sortedPoints(bank).filter((p) => p.photos.length && (!opt.onlyEnabled || p.enabled) && (!opt.noTeach || !p.teach));
    const zids = bank.zones.map((z) => z.id).filter((z) => pool.some((p) => p.zone === z));
    const others = pool.filter((p) => !zids.includes(p.zone));
    if (others.length) zids.push('__none');
    const byZone = {};
    zids.forEach((z) => { byZone[z] = shuffle(pool.filter((p) => (z === '__none' ? !bank.zones.some((x) => x.id === p.zone) : p.zone === z)), rnd); });
    const used = {}, L = zids.length;
    const remaining = (z) => (byZone[z] || []).filter((q) => !used[q.key]).length;
    const takeFrom = (z) => { const p = (byZone[z] || []).find((q) => !used[q.key]); if (p) used[p.key] = 1; return p; };
    const V = Array.from({ length: n }, () => ({ picks: [], zones: new Set() }));
    // 一輪一輪發點：每一輪每份拿一個；優先拿「這份還沒去過、剩最多點」的區域 → 每份都盡量分散、各區平均用掉
    for (let r = 0; r < k && L; r++) {
      for (let i = 0; i < n; i++) {
        const v = r % 2 ? n - 1 - i : i, cur = V[v];
        let pick = null;
        if (r === 0) { const off = Math.floor(v * L / n); for (let t = 0; t < L && !pick; t++) { const z = zids[(off + t) % L]; if (remaining(z)) pick = z; } }
        else { let bs = -1; zids.forEach((z) => { const rem = remaining(z); if (!rem) return; const sc = (cur.zones.has(z) ? 0 : 1000) + rem + rnd() * 0.9; if (sc > bs) { bs = sc; pick = z; } }); }
        if (pick) { cur.picks.push(takeFrom(pick)); cur.zones.add(pick); }
      }
    }
    const versions = V.map(({ picks }) => {
      // 點不夠：重複使用用過最少次的點
      for (const p of shuffle(pool, rnd).sort((a, b) => (used[a.key] || 0) - (used[b.key] || 0))) {
        if (picks.length >= k) break;
        if (!picks.includes(p)) { used[p.key] = (used[p.key] || 0) + 1; picks.push(p); }
      }
      return { points: picks, photoOrder: shuffle(picks, rnd) };
    });
    return versions;
  }


  // =====================================================================
  // 第二階段：活動（即時闖關）
  // =====================================================================
  const CODE_CH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function makeCode(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => CODE_CH[b % CODE_CH.length]).join(''); }
  async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32); }

  const DEFAULT_RUN = {
    mode: 'race', target: 13, batch: 3, limitMin: 40, easy: true, teaching: false, zones: [],
    cool: 30, wrongPenalty: 30, hintOn: true, hintCost: 60, passLimit: 2, passUnlock: 3, viewProg: false, pref: 0.7
  };

  // 視角難度：0＝遠景／中景／平視（或未標）、1＝特寫／仰俯斜角、2＝超特寫／奇特視角
  function viewLevel(p) { const v = p.view || {}; if (v.odd || v.dist === 'macro') return 2; if (v.dist === 'close' || ['up', 'down', 'tilt'].includes(v.angle)) return 1; return 0; }

  /* 自動派題：替某一組挑下一批題目
     st = { settings, teams:{ tid:{ done[], passed[], cards{cid:{key,state}}, zone } } }
     opt = { size, from(上一區), avoid(要避開的區域，例如開場錯開起點), rnd }
     回傳點位 key 陣列（可能少於 size，代表題庫用完了） */
  function chooseBatch(bank, st, tid, opt) {
    const S = st.settings, team = st.teams[tid], rnd = opt.rnd || Math.random, size = opt.size || 1;
    const zm = zoneById(bank), centers = zoneCenters(bank);
    const busy = {}, takenByOthers = new Set();
    Object.entries(st.teams).forEach(([id, t]) => {
      if (id === tid || t.finished) return;
      const open = Object.values(t.cards || {}).filter((c) => c.state === 'open');
      open.forEach((c) => takenByOthers.add(c.key));
      const zs = new Set(open.map((c) => (bank.points[c.key] || {}).zone).filter(Boolean));
      zs.forEach((z) => { busy[z] = (busy[z] || 0) + 1; });
    });
    const mine = new Set([...(team.done || []), ...(team.passed || []), ...Object.values(team.cards || {}).filter((c) => c.state === 'open').map((c) => c.key)]);
    let pool = sortedPoints(bank).filter((p) => p.enabled && p.photos.length && (!S.zones || !S.zones.length || S.zones.includes(p.zone)) && !(S.teaching && p.teach) && !mine.has(p.key));
    if (S.viewProg && pool.length) {
      const allow = Math.min(2, Math.floor(3 * (team.done || []).length / Math.max(1, S.target)));
      const easier = pool.filter((p) => viewLevel(p) <= allow);
      if (easier.length >= size) pool = easier;
    }
    if (!pool.length) return [];
    const byZone = {};
    pool.forEach((p) => { (byZone[p.zone] = byZone[p.zone] || []).push(p); });
    const from = opt.from && centers[opt.from];
    const spreadW = S.pref == null ? 0.7 : S.pref, distW = 1 - spreadW;
    let best = null, bs = Infinity;
    Object.keys(byZone).forEach((z) => {
      const list = byZone[z], crowd = busy[z] || 0, cap = (zm[z] && zm[z].cap) || 2;
      const free = list.filter((p) => !takenByOthers.has(p.key)).length;
      let sc = (crowd >= cap ? 100 : 0) + spreadW * crowd * 12 + (from && centers[z] ? distW * dist(bank, from, centers[z]) * 0.35 : 0);
      if (list.length < size) sc += 6;
      if (free < Math.min(size, list.length)) sc += 4;
      if (opt.avoid && opt.avoid.includes(z)) sc += 50;
      sc += rnd() * 3;
      if (sc < bs) { bs = sc; best = z; }
    });
    const prefer = (arr) => shuffle(arr, rnd).sort((a, b) => (takenByOthers.has(a.key) ? 1 : 0) - (takenByOthers.has(b.key) ? 1 : 0));
    const out = prefer(byZone[best]).slice(0, size);
    if (out.length < size) {
      // 這區不夠：從離這區最近的區域補
      const c0 = centers[best];
      const rest = pool.filter((p) => !out.includes(p)).sort((a, b) => dist(bank, a, c0) - dist(bank, b, c0) + (takenByOthers.has(a.key) ? 30 : 0) - (takenByOthers.has(b.key) ? 30 : 0));
      out.push(...rest.slice(0, size - out.length));
    }
    return out.map((p) => p.key);
  }

  // 遊戲時鐘（扣掉暫停時間），單位秒
  function gameSeconds(clock, now) {
    if (!clock || !clock.startAt) return 0;
    const end = clock.endAt || now;
    const paused = (clock.pausedTotal || 0) + (clock.pausedAt && !clock.endAt ? end - clock.pausedAt : 0);
    return Math.max(0, Math.floor((end - clock.startAt - paused) / 1000));
  }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec || 0)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }

  // 排名：完成的組依（用時＋罰秒），沒完成的依完成題數多→（用時＋罰秒）少
  function rankTeams(teams, nowSec) {
    const arr = Object.entries(teams || {}).map(([id, t]) => {
      const time = t.finished ? (t.finishSec || 0) : nowSec;
      return { id, ...t, score: time + (t.penalty || 0) };
    });
    arr.sort((a, b) => (b.finished ? 1 : 0) - (a.finished ? 1 : 0) || (a.finished ? a.score - b.score : (b.done || 0) - (a.done || 0) || a.score - b.score) || String(a.name).localeCompare(String(b.name), 'zh-Hant', { numeric: true }));
    let r = 0;
    arr.forEach((t, i) => { if (i === 0 || t.finished !== arr[i - 1].finished || t.score !== arr[i - 1].score || (!t.finished && t.done !== arr[i - 1].done)) r = i + 1; t.rank = r; });
    return arr;
  }

  // ---------- 戰況看板（老師頁投影與 board.html 共用） ----------
  const BOARD_CSS = `
  .gb{position:fixed;inset:0;background:#1f2a44;color:#fff;z-index:300;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;gap:14px;padding:16px 20px;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif}
  .gb-head{grid-column:1/3;display:flex;align-items:center;gap:18px}
  .gb-head h1{font-family:'Noto Serif TC',serif;font-weight:900;font-size:2.1em;letter-spacing:.04em}
  .gb-head .en{font-family:'Bebas Neue',sans-serif;letter-spacing:.2em;color:#f2b134;font-size:1em}
  .gb-clock{margin-left:auto;font-family:'Bebas Neue',sans-serif;font-size:3.2em;letter-spacing:.06em;color:#f2b134;line-height:1}
  .gb-clock small{display:block;font-family:'Noto Sans TC',sans-serif;font-size:.3em;letter-spacing:0;color:#c9d2ea;text-align:right}
  .gb-map{position:relative;background:#fff;border-radius:14px;overflow:hidden;align-self:stretch;display:flex;align-items:center;justify-content:center}
  .gb-map .mi{position:relative;height:100%;max-width:100%;aspect-ratio:var(--ar)}
  .gb-map .mi .in{position:absolute;left:0;width:100%}
  .gb-map img{width:100%;height:100%;display:block;opacity:.55}
  .gb-heat{position:absolute;transform:translate(-50%,-50%);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.25em;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transition:all .4s}
  .gb-heat small{position:absolute;top:100%;margin-top:3px;white-space:nowrap;font-size:.55em;color:#1f2a44;background:rgba(255,255,255,.9);padding:0 6px;border-radius:6px}
  .gb-rank{background:#fffdf8;color:#1f2a44;border-radius:14px;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column;gap:6px}
  .gb-row{display:grid;grid-template-columns:44px minmax(0,1fr) 120px 80px;align-items:center;gap:10px;padding:5px 8px;border-radius:10px;background:#f3eee2;font-size:1.15em}
  .gb-row.fin{background:#fdf1d6}
  .gb-row .rk{font-family:'Bebas Neue',sans-serif;font-size:1.6em;text-align:center;color:#e4572e}
  .gb-row .nm{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gb-row .bar{height:12px;border-radius:999px;background:#e2dccd;overflow:hidden}
  .gb-row .bar i{display:block;height:100%;background:linear-gradient(90deg,#f07c1f,#f2b134);border-radius:999px;transition:width .5s}
  .gb-row .tm{text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.3em;letter-spacing:.04em}
  .gb-foot{grid-column:1/3;display:flex;gap:12px;align-items:center;overflow:hidden;white-space:nowrap}
  .gb-ev{background:rgba(255,255,255,.1);border-radius:999px;padding:6px 14px;font-size:1.05em}
  .gb-badge{background:#f2b134;color:#1f2a44;border-radius:999px;padding:6px 14px;font-weight:900}
  .gb-close{position:absolute;bottom:14px;right:16px;background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:8px;padding:4px 12px;cursor:pointer;z-index:2}
  .gb-state{font-size:1.05em;background:#e4572e;border-radius:999px;padding:4px 14px;font-weight:900}
  @media(max-width:900px){.gb{grid-template-columns:1fr;grid-template-rows:auto auto auto auto}.gb-head,.gb-foot{grid-column:1}.gb-map{min-height:45vh}}`;
  // board：{ title, status, clock, target, teams{tid:{name,done,finished,finishSec,penalty}}, heat{zone:count}, events[], badges[] }
  // pub：{ map, zones[], crop{top,bot} }
  function boardHTML(board, pub, now, opt) {
    board = board || {}; pub = pub || {};
    const sec = gameSeconds(board.clock, now), lim = (board.limitMin || 0) * 60;
    const ranked = rankTeams(board.teams, sec);
    const crop = pub.crop || { top: 0, bot: 100 }, span = (crop.bot - crop.top) / 100;
    const map = pub.map || { src: 'r:map', w: 1117, h: 1579 };
    const heat = board.heat || {};
    const zones = (pub.zones || []).filter((z) => z.x != null);
    const stateTxt = { ready: '準備中', running: '', paused: '⏸ 暫停中', ended: '🏁 已結束' }[board.status] || '';
    return `<div class="gb">
      ${opt && opt.close ? '<button class="gb-close" data-gbclose>✕ 關閉投影</button>' : ''}
      <div class="gb-head"><div><div class="en">THE LOST PLACES</div><h1>🧭 ${esc(board.title || '遺落的地點')}</h1></div>
        ${stateTxt ? `<span class="gb-state">${stateTxt}</span>` : ''}
        <div class="gb-clock">${lim ? fmtTime(Math.max(0, lim - sec)) : fmtTime(sec)}<small>${lim ? '剩餘時間' : '經過時間'}</small></div></div>
      <div class="gb-map"><div class="mi" style="--ar:${map.w}/${(map.h * span).toFixed(1)}"><div class="in" style="top:${(-crop.top / span).toFixed(3)}%;height:${(100 / span).toFixed(3)}%">
        <img src="${esc(photoURL(map.src, opt && opt.base))}">
        ${zones.map((z) => { const n = heat[z.id] || 0; const s = 34 + n * 16; return `<div class="gb-heat" style="left:${z.x}%;top:${z.y}%;width:${s}px;height:${s}px;background:${n ? z.color : 'rgba(120,120,120,.35)'};opacity:${n ? 1 : .7}">${n || ''}<small>${esc(z.name)}</small></div>`; }).join('')}
      </div></div></div>
      <div class="gb-rank">${ranked.map((t) => `<div class="gb-row ${t.finished ? 'fin' : ''}"><div class="rk">${t.rank}</div><div class="nm">${t.finished ? '🏁 ' : ''}${esc(t.name)}</div>
        <div><div class="bar"><i style="width:${Math.min(100, Math.round((t.done || 0) / Math.max(1, board.target || 1) * 100))}%"></i></div><div style="font-size:.72em;text-align:center">${t.done || 0} / ${board.target || 0}</div></div>
        <div class="tm">${t.finished ? fmtTime(t.finishSec) : ''}</div></div>`).join('') || '<p style="opacity:.6">等待開始…</p>'}</div>
      <div class="gb-foot">${(board.badges || []).map((b) => `<span class="gb-badge">${esc(b)}</span>`).join('')}${(board.events || []).slice(-6).reverse().map((e) => `<span class="gb-ev">${esc(e)}</span>`).join('')}</div>
    </div>`;
  }

  window.GPS = {
    DB_URL, VIEW_DIST, VIEW_ANGLE, DIRS, ZONE_COLORS,
    esc, rid, mulberry, shuffle,
    normPoint, normalizeBank, packBank, sortedPoints, zoneById, zoneCenters, dist, inNoGo, viewLabel,
    photoURL, loadPhoto, compressImage, makeVersions,
    cachePhoto: (id, data) => { photoCache[id] = data; },
    // 第二階段
    CODE_CH, makeCode, sha, DEFAULT_RUN, viewLevel, chooseBatch, gameSeconds, fmtTime, rankTeams, boardHTML, BOARD_CSS
  };
})();
