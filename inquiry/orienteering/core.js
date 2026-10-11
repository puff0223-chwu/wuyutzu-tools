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

  window.GPS = {
    DB_URL, VIEW_DIST, VIEW_ANGLE, DIRS, ZONE_COLORS,
    esc, rid, mulberry, shuffle,
    normPoint, normalizeBank, packBank, sortedPoints, zoneById, zoneCenters, dist, inNoGo, viewLabel,
    photoURL, loadPhoto, compressImage, makeVersions,
    cachePhoto: (id, data) => { photoCache[id] = data; }
  };
})();
