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
      reveal: p.reveal || '', task: p.task && p.task.q ? { q: String(p.task.q), a: String(p.task.a || '').trim(), open: !String(p.task.a || '').trim(), bonus: p.task.bonus != null && p.task.bonus !== '' ? +p.task.bonus || 0 : 5 } : null, // 有標準答案＝系統判，空白＝老師判
      author: String(p.author || ''), note: String(p.note || ''), contrib: String(p.contrib || ''), key
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
  // 2026-10-13：讀過的照片存在這台裝置（Cache Storage），重新整理、下一場活動都不用再下載
  //   → 省 Firebase 免費版每月 10 GB 下載量；照片編號每次上傳都是新的，同一個編號內容不會變，所以可以放心一直存
  const PHOTO_STORE = 'gps-photos-v1', photoKey = (id) => new URL('__gps_photo/' + id, location.href).href;
  async function storeGet(id) { try { if (!window.caches) return null; const r = await (await caches.open(PHOTO_STORE)).match(photoKey(id)); return r ? await r.text() : null; } catch (e) { return null; } }
  function storePut(id, v) { try { if (window.caches && v) caches.open(PHOTO_STORE).then((c) => c.put(photoKey(id), new Response(v))).catch(() => {}); } catch (e) { } }
  const photoWait = {};
  async function loadPhoto(ref) {
    if (!ref || !ref.startsWith('f:')) return photoURL(ref);
    const id = ref.slice(2);
    if (photoCache[id]) return photoCache[id];
    return photoWait[id] || (photoWait[id] = (async () => {
      let v = await storeGet(id);
      if (!v) {
        const r = await fetch(DB_URL + 'orienteering/photos/' + id + '/data.json');
        v = r.ok ? await r.json() : null;
        if (v) storePut(id, v);
      }
      if (v) photoCache[id] = v;
      delete photoWait[id];
      return v || '';
    })());
  }
  // maxChars：結果太大就降品質、再縮小，直到放得進 Firebase（學生投稿上限 40 萬字、老師照片 60 萬字）
  function compressImage(file, max, quality, maxChars) {
    max = max || 800; quality = quality || 0.72;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const draw = (m, q) => {
          let w = img.naturalWidth, h = img.naturalHeight; const s = Math.min(1, m / Math.max(w, h));
          w = Math.round(w * s); h = Math.round(h * s);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          return { data: c.toDataURL('image/jpeg', q), w, h };
        };
        let m = max, q = quality, out = draw(m, q);
        for (let i = 0; maxChars && out.data.length > maxChars && i < 6; i++) { if (q > 0.5) q -= 0.1; else m = Math.round(m * 0.8); out = draw(m, q); }
        URL.revokeObjectURL(url);
        resolve(out);
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
    mode: 'race', target: 13, photos: 2, cands: 7, route: 'spread', limitMin: 40, teaching: false, zones: [],
    cool: 30, wrongPenalty: 30, hintOn: true, hintCost: 60, passLimit: 2, passUnlock: 3, viewProg: false,
    // 第三階段：🎯 積分賽
    wall: 4, wallCands: 4, skipCool: 120, ptsWrong: 2, hintPct: 30, viewBonus: true, checkin: false, grace: 2, latePts: 5,
    // 第三階段：🎁 加分挑戰（答對後才出現）
    stanceOn: true, taskOn: true, bonusSec: 30, stancePts: 5, camTol: 6
  };

  // 視角難度：0＝遠景／中景／平視（或未標）、1＝特寫／仰俯斜角、2＝超特寫／奇特視角
  function viewLevel(p) { const v = p.view || {}; if (v.odd || v.dist === 'macro') return 2; if (v.dist === 'close' || ['up', 'down', 'tilt'].includes(v.angle)) return 1; return 0; }

  /* 自動派題（2026-10-12 改版）：每關 1～2 張照片＋候選地點
     - 每關 2 張（預設）：7 個候選地點，分在 4 個不同區域（2 個答案區＋2 個區各 1 個干擾），剩下 3 個從這 4 區隨機
     - 每關 1 張：3～5 個候選地點，分在 3 個不同區域，剩下的從這 3 區隨機
     答案的區域：避開這組最近去過的區域、避開人多的區域、加大隨機；同一關的兩個答案在不同區域
     st = { settings, teams:{ tid:{ done[], passed[], cards{cid:{key,state}}, recent[] } } }
     opt = { size(這關幾張), avoid(開場要避開的區域), rnd,
             積分賽補卡用：exclude(不能當答案的點 key)、wallZones(牆上已有的區域)、busy(各區人數，覆蓋預設算法)、K(候選數) }
     回傳 { keys:[答案…], cands:[候選…] }，題庫用完回傳 null */
  function chooseNext(bank, st, tid, opt) {
    opt = opt || {};
    const S = st.settings, team = st.teams[tid], rnd = opt.rnd || Math.random;
    const size = Math.max(1, Math.min(2, opt.size || S.photos || 1));
    const K = Math.max(size + 2, Math.min(9, opt.K || S.cands || (size === 2 ? 7 : 5)));
    const zm = zoneById(bank);
    const busy = {}, takenByOthers = new Set();
    Object.entries(st.teams).forEach(([id, t]) => {
      if (id === tid || t.finished) return;
      Object.values(t.cards || {}).filter((c) => c.state === 'open').forEach((c) => {
        takenByOthers.add(c.key);
        const z = (bank.points[c.key] || {}).zone; if (z && !opt.busy) busy[z] = (busy[z] || 0) + 1;
      });
    });
    if (opt.busy) Object.assign(busy, opt.busy);
    const usable = (p) => p.enabled && p.photos.length && (!S.zones || !S.zones.length || S.zones.includes(p.zone)) && !(S.teaching && p.teach);
    const done = new Set([...(team.done || []), ...(team.passed || []), ...(team.skipped || [])]);
    const excl = opt.exclude || new Set();
    let pool = sortedPoints(bank).filter((p) => usable(p) && !done.has(p.key) && !excl.has(p.key));
    // 放棄過的點：題庫快用完時才再派
    if (!pool.length && (team.skipped || []).length) pool = sortedPoints(bank).filter((p) => usable(p) && !excl.has(p.key) && !(team.done || []).includes(p.key) && !(team.passed || []).includes(p.key));
    if (S.viewProg && pool.length) {
      const allow = Math.min(2, Math.floor(3 * (team.done || []).length / Math.max(1, S.target)));
      const easier = pool.filter((p) => viewLevel(p) <= allow);
      if (easier.length >= size) pool = easier;
    }
    if (!pool.length) return null;
    const recent = team.recent || [];
    // 「就近派發」：仍然換區域，但優先挑離上一關近的區域（時間短時少跑一點路）
    const near = S.route === 'near', centers = near ? zoneCenters(bank) : null, here = near && recent[0] && centers[recent[0]];
    const answers = [];
    for (let n = 0; n < size; n++) {
      const byZone = {};
      pool.filter((p) => !answers.includes(p)).forEach((p) => { (byZone[p.zone] = byZone[p.zone] || []).push(p); });
      const zs = Object.keys(byZone); if (!zs.length) break;
      let best = null, bs = Infinity;
      zs.forEach((z) => {
        const crowd = busy[z] || 0, cap = (zm[z] && zm[z].cap) || 2;
        let sc = (crowd >= cap ? 60 : 0) + crowd * 10 + rnd() * 25;
        // 上一關的區域（2 張照片＝2 個區）大扣分，再前一點的小扣分 → 每關都換區
        const r = recent.indexOf(z), ph = S.photos || 1; if (r >= 0 && r < ph) sc += 150; else if (r >= 0 && r < ph * 2) sc += 40;
        if (answers.some((a) => a.zone === z)) sc += 200; // 同一關的兩張照片放在不同區域
        if (opt.avoid && opt.avoid.includes(z)) sc += 30;
        if (opt.wallZones && opt.wallZones.includes(z)) sc += 200; // 積分賽：任務牆上的照片分散在不同區
        if (here && centers[z]) sc += dist(bank, here, centers[z]) * 0.9;
        if (near && answers.length && centers[z] && centers[answers[0].zone]) sc += dist(bank, centers[answers[0].zone], centers[z]) * 0.9;
        if (sc < bs) { bs = sc; best = z; }
      });
      const inZone = shuffle(byZone[best], rnd).sort((a, b) => (takenByOthers.has(a.key) ? 1 : 0) - (takenByOthers.has(b.key) ? 1 : 0));
      answers.push(inZone[0]); busy[best] = (busy[best] || 0) + 1;
    }
    // 候選地點（干擾選項）：可以是任何可用的點，但不放這組已經找過的
    const decoyPool = sortedPoints(bank).filter((p) => usable(p) && !answers.includes(p) && !(team.done || []).includes(p.key));
    const dz = {};
    decoyPool.forEach((p) => { (dz[p.zone] = dz[p.zone] || []).push(p); });
    const ansZones = Array.from(new Set(answers.map((a) => a.zone)));
    const needZones = size + 2; // 1 張→3 區、2 張→4 區
    let otherZones = shuffle(Object.keys(dz).filter((z) => !ansZones.includes(z)), rnd);
    if (near) { const c0 = centers[ansZones[0]]; otherZones = otherZones.sort((a, b) => dist(bank, c0, centers[a] || c0) - dist(bank, c0, centers[b] || c0)).slice(0, 4); otherZones = shuffle(otherZones, rnd); }
    otherZones = otherZones.slice(0, Math.max(0, needZones - ansZones.length));
    const zonesUsed = [...ansZones, ...otherZones];
    const picked = [...answers];
    otherZones.forEach((z) => { const p = shuffle(dz[z], rnd)[0]; if (p) picked.push(p); });
    let extra = shuffle(decoyPool.filter((p) => zonesUsed.includes(p.zone) && !picked.includes(p)), rnd);
    if (picked.length + extra.length < K) extra = extra.concat(shuffle(decoyPool.filter((p) => !picked.includes(p) && !extra.includes(p)), rnd));
    while (picked.length < K && extra.length) picked.push(extra.shift());
    return { keys: answers.map((a) => a.key), cands: shuffle(picked, rnd).map((p) => p.key) };
  }

  /* （舊版，保留給模擬比較用）替某一組挑下一批題目
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
      return { id, ...t, score: time + (t.penalty || 0) - (t.bon || 0) };
    });
    arr.sort((a, b) => (b.finished ? 1 : 0) - (a.finished ? 1 : 0) || (a.finished ? a.score - b.score : (b.done || 0) - (a.done || 0) || a.score - b.score) || String(a.name).localeCompare(String(b.name), 'zh-Hant', { numeric: true }));
    let r = 0;
    arr.forEach((t, i) => { if (i === 0 || t.finished !== arr[i - 1].finished || t.score !== arr[i - 1].score || (!t.finished && t.done !== arr[i - 1].done)) r = i + 1; t.rank = r; });
    return arr;
  }

  /* 隨機隊名（2026-10-12 老師要求：不用自己輸入組名，選風格就好）
     detective 偵探風：開頭＋結尾組合；chem 化學元素風：先用諧音梗，不夠再用「元素＋小隊」；animal 形容詞＋動物
     同一場盡量不重複開頭與結尾 */
  const NAME_STYLES = {
    detective: { label: '🕵️ 偵探風', a: ['午夜', '迷霧', '暗巷', '月光', '隱形', '秘密', '黃昏', '雨夜', '失落', '星夜', '晨霧', '幽靈', '羅盤', '密室', '鐘樓', '影子', '銀狐', '暗號', '時光', '閃電'], b: ['偵探團', '密探', '追蹤者', '解謎社', '搜查隊', '調查組', '鑑識隊', '線人', '守望者', '探險隊', '地圖師', '觀星者', '巡守隊', '尋寶團', '情報站', '神探', '特派員', '暗探', '旅人', '遊俠'] },
    chem: { label: '🧪 化學元素風', puns: ['氦氦笑隊', '鈉些年', '碳險隊', '氧氣滿滿', '鋁行團', '銅心協力', '鐵三角', '鈣世英雄', '硫星雨', '氫鬆過關', '鉀油隊', '氖得住隊', '鎂少女戰士', '矽望之光', '氮定自若', '碘到為止'], a: ['氫', '鋰', '碳', '氮', '氧', '氟', '氖', '鈉', '鎂', '鋁', '矽', '磷', '硫', '氯', '鉀', '鈣', '鐵', '銅', '鋅', '銀', '金', '汞'], b: ['原子隊', '分子幫', '離子團', '電子組', '催化劑', '燒杯隊', '試管隊', '結晶派', '火焰隊', '滴定社', '反應爐', '元素幫'] },
    animal: { label: '🐾 形容詞＋動物', a: ['害羞的', '暴走的', '愛睡的', '閃亮的', '勇敢的', '迷路的', '超快的', '優雅的', '吵鬧的', '神秘的', '餓扁的', '微笑的', '倔強的', '跳舞的', '冷靜的', '好奇的'], b: ['水豚', '柴犬', '企鵝', '樹懶', '狐獴', '貓熊', '刺蝟', '海獺', '章魚', '浣熊', '長頸鹿', '河馬', '石虎', '黑熊', '藍鵲', '穿山甲'] }
  };
  function teamNames(n, rnd, style) {
    if (typeof rnd === 'string') { style = rnd; rnd = null; }
    rnd = rnd || Math.random;
    const S = NAME_STYLES[style] || NAME_STYLES.detective;
    const out = [], used = new Set();
    const puns = S.puns ? shuffle(S.puns, rnd) : [];
    let A = [], B = [];
    for (let i = 0; i < n; i++) {
      let name = puns.length ? puns.pop() : '';
      if (!name) {
        if (!A.length) A = shuffle(S.a, rnd); if (!B.length) B = shuffle(S.b, rnd);
        name = A.pop() + B.pop();
        let g = 0; while (used.has(name) && g++ < 80) name = S.a[Math.floor(rnd() * S.a.length)] + S.b[Math.floor(rnd() * S.b.length)];
      }
      used.add(name); out.push(name);
    }
    return out;
  }
  // 學生改隊名：最多 10 個字，去掉奇怪符號
  const cleanName = (s) => String(s || '').replace(/[<>&"'`\\/{}\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 10);

  // =====================================================================
  // 第三階段：🎯 積分賽、🎁 加分挑戰
  // =====================================================================
  /* 動態分值（像桌遊的浮動市場）
     老師看不到學生在哪裡，所以用「這組最近一次答對的區域」當作他們的位置（6 分鐘內有效）
     冷門區 ×1.5、一般 ×1、熱門區 ×0.5（門檻見下面 heatLevel） */
  const LOC_MIN = 6;
  function crowdByLoc(teams, now, exceptTid) {
    const c = {};
    Object.entries(teams || {}).forEach(([id, t]) => { if (id === exceptTid || t.finished || !t.loc || now - t.loc.at > LOC_MIN * 60000) return; c[t.loc.z] = (c[t.loc.z] || 0) + 1; });
    return c;
  }
  /* 冷熱門要跟「平均每區幾組」比（2026-10-13 模擬發現：50 組時每區都超過容量 2，結果 95% 的卡都是熱門 ×0.5，浮動就沒意義了）
     熱門：人數 ≥ 區域容量，而且 ≥ 平均的 1.6 倍；冷門：人數 ≤ 平均的 0.4 倍（組少時＝沒有人） */
  const crowdAvg = (crowd, nZones) => Object.values(crowd || {}).reduce((s, v) => s + v, 0) / Math.max(1, nZones || 1);
  function heatLevel(crowd, cap, avg) { if (!avg) return ''; /* 還沒有任何組答對過：分不出冷熱，全部一般 */ const hot = Math.max(cap || 2, Math.ceil((avg || 0) * 1.6)), cold = Math.floor((avg || 0) * 0.4); return crowd >= hot ? 'hot' : crowd <= cold ? 'cold' : ''; }
  const zoneMult = (crowd, cap, avg) => ({ hot: 0.5, cold: 1.5, '': 1 })[heatLevel(crowd, cap, avg)];
  const viewMult = (p) => [1, 1.5, 2][viewLevel(p)];
  // 一張卡現在值幾分：基本分 ×（視角難度）×（冷熱門）×（用了幾層提示就打折）
  function cardValue(p, set, crowd, cap, hint, avg) {
    let v = (p.base || 10) * (set.viewBonus !== false ? viewMult(p) : 1) * zoneMult(crowd, cap, avg);
    v *= Math.max(0, 1 - (set.hintPct || 0) / 100 * (hint || 0));
    return Math.max(1, Math.round(v));
  }
  // 積分賽總分＝答題得分＋加分挑戰－遲到扣分
  const lateMin = (t, set, clock) => (!set.checkin || !clock || !clock.endAt || !t.checkAt ? 0 : Math.max(0, Math.ceil((t.checkAt - clock.endAt) / 60000 - (set.grace || 0))));
  function teamTotal(t, set, clock) { return (t.pts || 0) + (t.bon || 0) - lateMin(t, set, clock) * (set.latePts || 0); }
  // 積分賽排名：總分高的在前；同分比較早拿到最後一分的
  function rankScore(teams) {
    const arr = Object.entries(teams || {}).map(([id, t]) => ({ id, ...t }));
    arr.sort((a, b) => (b.total || 0) - (a.total || 0) || (a.lastOk || 9e15) - (b.lastOk || 9e15) || String(a.name).localeCompare(String(b.name), 'zh-Hant', { numeric: true }));
    let r = 0;
    arr.forEach((t, i) => { if (i === 0 || t.total !== arr[i - 1].total) r = i + 1; t.rank = r; });
    return arr;
  }
  /* 🦶 站位挑戰判定：站的位置在誤差內＋方向對（容許相鄰一格）＝1；只有位置對＝0.5；位置不對＝0 */
  function judgeCam(bank, cam, ans, tol) {
    if (!cam || !ans) return { got: 0, d: 999, dd: 8 };
    const d = dist(bank, cam, ans), dd = Math.min((ans.dir - cam.dir + 8) % 8, (cam.dir - ans.dir + 8) % 8);
    return { got: d <= (tol || 6) ? (dd <= 1 ? 1 : 0.5) : 0, d: Math.round(d * 10) / 10, dd };
  }
  /* 🔍 觀察任務自動判定：全形半形、大小寫、空白都不計較；標準答案可用 / 分隔多個 */
  const normAns = (s) => String(s || '').replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s+/g, '').replace(/[。．.,，、!！?？]+$/, '').toLowerCase();
  function judgeTask(task, text) {
    const a = normAns(text); if (!a) return false;
    return String(task.a || '').split(/[\/|｜]/).map(normAns).filter(Boolean).some((x) => x === a || (!isNaN(+x) && !isNaN(+a) && +x === +a));
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
  .gb-rank.c2,.gb-rank.c3{display:grid;grid-auto-flow:column;gap:5px 10px;align-content:start}
  .gb-rank.c2{grid-template-columns:1fr 1fr;grid-template-rows:repeat(13,auto)}
  .gb-rank.c3{grid-template-columns:1fr 1fr 1fr;grid-template-rows:repeat(20,auto)}
  .gb-rank.c2 .gb-row{font-size:.92em;grid-template-columns:30px minmax(0,1fr) 70px 46px;padding:3px 6px;gap:6px}
  .gb-rank.c3 .gb-row{font-size:.74em;grid-template-columns:24px minmax(0,1fr) 54px 40px;padding:2px 5px;gap:5px;border-radius:7px}
  .gb-rank.c2 .rk,.gb-rank.c3 .rk{font-size:1.3em}
  .gb-rank.c3 .bar{height:8px}
  .gb-row .dn{font-size:.72em;text-align:center}
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
  // 看板拆成幾塊：地圖底圖固定不動，時鐘、人數圈、排行、動態有變才更新（50 組時也不會閃）
  function boardParts(board, pub, now, opt) {
    board = board || {}; pub = pub || {};
    const sec = gameSeconds(board.clock, now), lim = (board.limitMin || 0) * 60;
    const score = board.mode === 'score';
    const ranked = score ? rankScore(board.teams) : rankTeams(board.teams, sec), n = ranked.length;
    const maxPts = score ? Math.max(1, ...ranked.map((t) => t.total || 0)) : 1;
    const heat = board.heat || {};
    const zones = (pub.zones || []).filter((z) => z.x != null);
    const stateTxt = { ready: '準備中', running: '', paused: '⏸ 暫停中', ended: '🏁 已結束' }[board.status] || '';
    const cols = n > 26 ? 3 : n > 12 ? 2 : 1;
    return {
      head: `<div><div class="en">THE LOST PLACES</div><h1>🧭 ${esc(board.title || '遺落的地點')}</h1></div>
        ${stateTxt ? `<span class="gb-state">${stateTxt}</span>` : ''}
        <div class="gb-clock">${lim ? fmtTime(Math.max(0, lim - sec)) : fmtTime(sec)}<small>${lim ? '剩餘時間' : '經過時間'}${n > 12 ? `・${n} 組` : ''}</small></div>`,
      heat: zones.map((z) => { const k = heat[z.id] || 0; const sz = 30 + Math.min(k, 6) * 7; return `<div class="gb-heat" style="left:${z.x}%;top:${z.y}%;width:${sz}px;height:${sz}px;background:${k ? z.color : 'rgba(120,120,120,.35)'};opacity:${k ? 1 : .7}">${k || ''}<small>${esc(z.name)}</small></div>`; }).join(''),
      rankCls: 'gb-rank c' + cols,
      rank: score ? ranked.map((t) => `<div class="gb-row ${t.finished ? 'fin' : ''}"><div class="rk">${t.rank}</div><div class="nm">${t.finished ? '✅ ' : ''}${esc(t.name)}</div>
        <div><div class="bar"><i style="width:${Math.max(0, Math.min(100, Math.round((t.total || 0) / maxPts * 100)))}%"></i></div><div class="dn">找到 ${t.done || 0} 個</div></div>
        <div class="tm">${t.total || 0}<span style="font-size:.55em"> 分</span></div></div>`).join('') || '<p style="opacity:.6">等待開始…</p>' : ranked.map((t) => `<div class="gb-row ${t.finished ? 'fin' : ''}"><div class="rk">${t.rank}</div><div class="nm">${t.finished ? '🏁 ' : ''}${esc(t.name)}</div>
        <div><div class="bar"><i style="width:${Math.min(100, Math.round((t.done || 0) / Math.max(1, board.target || 1) * 100))}%"></i></div><div class="dn">${t.done || 0} / ${board.target || 0}</div></div>
        <div class="tm">${t.finished ? fmtTime(t.finishSec) : ''}</div></div>`).join('') || '<p style="opacity:.6">等待開始…</p>',
      foot: (board.badges || []).map((b) => `<span class="gb-badge">${esc(b)}</span>`).join('') + (board.events || []).slice(-6).reverse().map((e) => `<span class="gb-ev">${esc(e)}</span>`).join('')
    };
  }
  function boardHTML(board, pub, now, opt) {
    pub = pub || {};
    const P = boardParts(board, pub, now, opt);
    const crop = pub.crop || { top: 0, bot: 100 }, span = (crop.bot - crop.top) / 100;
    const map = pub.map || { src: 'r:map', w: 1117, h: 1579 };
    return `<div class="gb">
      ${opt && opt.close ? '<button class="gb-close" data-gbclose>✕ 關閉投影</button>' : ''}
      <div class="gb-head" data-p="head">${P.head}</div>
      <div class="gb-map"><div class="mi" style="--ar:${map.w}/${(map.h * span).toFixed(1)}"><div class="in" style="top:${(-crop.top / span).toFixed(3)}%;height:${(100 / span).toFixed(3)}%">
        <img src="${esc(photoURL(map.src, opt && opt.base))}"><div data-p="heat">${P.heat}</div>
      </div></div></div>
      <div class="${P.rankCls}" data-p="rank">${P.rank}</div>
      <div class="gb-foot" data-p="foot">${P.foot}</div>
    </div>`;
  }
  // 已經畫過就只換有變的那幾塊
  function boardPaint(el, board, pub, now, opt) {
    if (!el.querySelector('.gb')) { el.innerHTML = boardHTML(board, pub, now, opt); return; }
    const P = boardParts(board, pub, now, opt);
    ['head', 'heat', 'rank', 'foot'].forEach((k) => { const box = el.querySelector(`[data-p="${k}"]`); if (box && box.innerHTML !== P[k] && box._last !== P[k]) { box.innerHTML = P[k]; box._last = P[k]; } });
    const rk = el.querySelector('[data-p="rank"]'); if (rk && rk.className !== P.rankCls) rk.className = P.rankCls;
  }


  window.GPS = {
    DB_URL, VIEW_DIST, VIEW_ANGLE, DIRS, ZONE_COLORS,
    esc, rid, mulberry, shuffle,
    normPoint, normalizeBank, packBank, sortedPoints, zoneById, zoneCenters, dist, inNoGo, viewLabel,
    photoURL, loadPhoto, compressImage, makeVersions,
    cachePhoto: (id, data) => { photoCache[id] = data; storePut(id, data); },
    // 第二階段
    CODE_CH, makeCode, sha, DEFAULT_RUN, viewLevel, chooseBatch, chooseNext, gameSeconds, fmtTime, rankTeams, boardHTML, boardPaint, BOARD_CSS,
    // 第三階段
    NAME_STYLES, teamNames, cleanName, LOC_MIN, crowdByLoc, crowdAvg, heatLevel, zoneMult, viewMult, cardValue, lateMin, teamTotal, rankScore, judgeCam, judgeTask, normAns
  };
})();
