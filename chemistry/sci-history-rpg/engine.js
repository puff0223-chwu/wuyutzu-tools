/* =========================================================
   時光手稿 — 遊戲引擎（薩爾達式俯視角探險）
   ---------------------------------------------------------
   給「章節檔」用的工具：
     SH.say(誰, 文字)          → 對話框（await 等學生按下一步）
     SH.choose(誰, 文字, 選項)  → 選擇題對話（回傳選了第幾個）
     SH.panel(標題)            → 打開實驗台視窗（回傳 {body, close, wait}）
     SH.give(道具) / SH.addEvidence(證據) / SH.flag(名稱, 值)
     SH.toast(文字)、SH.goto(房間, x, y)、SH.finish(結果)
   地圖 16 × 11 格，每格 16 像素，畫面用整數倍放大保持像素風
   ========================================================= */
const SH = (() => {
  const T = 16, COLS = 16, ROWS = 11, W = COLS * T, H = ROWS * T;
  const STEP = 0.15;                 // 走一格幾秒
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TILES = {
    '#': 'wall', 'w': 'window', 'S': 'shelf', 'T': 'table', 'F': 'furnace', 'X': 'crate', 'P': 'plant',
    '.': 'floor', 'c': 'carpet', 'g': 'grass', 'p': 'path', 't': 'tree', 'h': 'hedge', '~': 'water',
    'm': 'marble', '|': 'column', 'b': 'banner', 'd': 'darkwall', 'D': 'door', '_': 'mat', 'G': 'gate',
    'n': 'dinner', 'q': 'chair', ' ': 'void'
  };
  const SOLID = new Set(['#', 'w', 'S', 'T', 'F', 'X', 'P', 't', 'h', '~', '|', 'b', 'd', 'n', 'q', ' ']);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  let cv, ctx, scale = 3, bg = null, last = 0, running = false;
  let G = null;           // 遊戲狀態
  let CH = null;          // 目前章節
  let PLAYER = { name: '偵探', sid: 'guest' };
  let onFinish = () => {}, onExit = () => {};
  const keys = new Set();

  /* ---------- 音效（很小聲的嗶嗶聲） ---------- */
  let actx = null, soundOn = true;
  function beep(freq = 660, dur = 0.05, type = 'square', vol = 0.04) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) {}
  }
  const SFX = {
    talk: () => beep(880, 0.02, 'square', 0.015),
    get: () => { beep(660, 0.08); setTimeout(() => beep(990, 0.12), 90); },
    hurt: () => beep(160, 0.18, 'sawtooth', 0.06),
    hit: () => { beep(300, 0.06, 'square', 0.06); setTimeout(() => beep(600, 0.1), 60); },
    wrong: () => beep(120, 0.25, 'triangle', 0.08),
    door: () => beep(440, 0.06, 'triangle', 0.05),
    puff: () => beep(220, 0.12, 'triangle', 0.05)
  };

  /* ---------- 存檔 ---------- */
  const SAVE_KEY = () => `sci-history-v1:${PLAYER.sid}`;
  function loadAll() { try { return JSON.parse(localStorage.getItem(SAVE_KEY())) || { done: {}, chapters: {} }; } catch (e) { return { done: {}, chapters: {} }; } }
  function saveAll(d) { try { localStorage.setItem(SAVE_KEY(), JSON.stringify(d)); } catch (e) {} }
  function save() {
    if (!G || !CH) return;
    const d = loadAll();
    d.chapters[CH.id] = {
      room: G.roomId, x: Math.round(G.px), y: Math.round(G.py), dir: G.dir, hearts: G.hearts, maxHearts: G.maxHearts,
      items: G.items, evidence: G.evidence, flags: G.flags, stats: { ...G.stats, playMs: G.stats.playMs + (Date.now() - G.sessionStart) }
    };
    G.stats.playMs = d.chapters[CH.id].stats.playMs; G.sessionStart = Date.now();
    saveAll(d);
  }

  /* ---------- 地圖工具 ---------- */
  const room = () => CH.rooms[G.roomId];
  const tileAt = (x, y) => { const r = room().map[y]; return r ? (r[x] ?? ' ') : ' '; };
  const visibleEnts = () => (room().ents || []).filter(e => !e.show || e.show(G));
  function blocked(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    if (SOLID.has(tileAt(x, y))) return true;
    if (visibleEnts().some(e => e.x === x && e.y === y && e.solid !== false)) return true;
    if (G.boss && G.boss.alive && Math.abs(x - G.boss.x - 0.5) < 1.2 && Math.abs(y - G.boss.y - 0.5) < 1.2) return true;
    return false;
  }

  function buildBg() {
    bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const g = bg.getContext('2d');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const s = SPR.sprite(TILES[tileAt(x, y)] || 'floor');
      if (s) g.drawImage(s, x * T, y * T);
    }
  }

  /* ---------- 進入房間 ---------- */
  function enterRoom(id, x, y, dir) {
    G.roomId = id; G.px = G.tx = x; G.py = G.ty = y; if (dir) G.dir = dir; G.moving = false;
    const r = room();
    G.minions = (r.minions || []).filter(m => !(G.flags.killed || []).includes(m.id))
      .map(m => ({ ...m, fx: m.x, fy: m.y, vx: 0, vy: 0, t: 0, alive: true }));
    G.projectiles = []; G.fireballs = []; G.fx = [];
    G.boss = null; $('banner').classList.add('hidden');
    buildBg();
    $('room-name').textContent = r.name;
    save();
    if (r.onEnter) run(() => r.onEnter(G));
  }

  /* ---------- 對話 ---------- */
  let dlg = null;   // {resolve, typing, full}
  function speaker(who) {
    if (who === 'me') return { name: PLAYER.name, spr: 'hero_d' };
    return (CH.cast && CH.cast[who]) || { name: who || '', spr: null };
  }
  function showDlg(who, text) {
    const sp = speaker(who);
    $('dlg').classList.remove('hidden');
    const face = $('dlg-face'); face.innerHTML = '';
    if (sp.spr) face.appendChild(SPR.toCanvas(sp.spr, 56, !!sp.isObj)); face.classList.toggle('hidden', !sp.spr);
    $('dlg-name').textContent = sp.name || '';
    $('dlg-name').classList.toggle('hidden', !sp.name);
    $('dlg-choices').innerHTML = '';
    const el = $('dlg-text'); el.innerHTML = '';
    // 打字機效果；支援 **粗體**
    const html = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    return new Promise(res => {
      const plain = html.replace(/<[^>]+>/g, '');
      let i = 0;
      dlg = { typing: true, finish: () => { clearInterval(dlg.timer); el.innerHTML = html; dlg.typing = false; }, resolve: res };
      dlg.timer = setInterval(() => {
        i++;
        if (i % 3 === 0) SFX.talk();
        if (i >= plain.length) { dlg.finish(); return; }
        // 逐字顯示：用純文字截斷（粗體在打完後才套用）
        el.textContent = plain.slice(0, i);
      }, 22);
    });
  }
  function say(who, text) {
    return new Promise(async res => {
      showDlg(who, text);
      $('dlg-next').classList.remove('hidden');
      dlg.done = () => { dlg = null; $('dlg').classList.add('hidden'); res(); };
    });
  }
  function choose(who, text, options) {
    return new Promise(res => {
      showDlg(who, text);
      $('dlg-next').classList.add('hidden');
      const wrap = $('dlg-choices');
      const pick = i => { if (!dlg) return; clearInterval(dlg.timer); dlg = null; $('dlg').classList.add('hidden'); wrap.innerHTML = ''; SFX.door(); res(i); };
      options.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `<span class="ck">${i + 1}</span>${esc(o)}`;
        b.onclick = e => { e.stopPropagation(); pick(i); }; wrap.appendChild(b);
      });
      dlg.choice = pick; dlg.nOpts = options.length;
    });
  }
  function advance() {
    if (!dlg) return;
    if (dlg.typing) { dlg.finish(); return; }
    if (dlg.choice) return;
    const d = dlg.done; if (d) d();
  }

  /* ---------- 實驗台視窗 ---------- */
  function panel(title) {
    $('panel').classList.remove('hidden');
    $('panel-title').textContent = title;
    const body = $('panel-body'); body.innerHTML = '';
    body.scrollTop = 0;
    return {
      body,
      close() { $('panel').classList.add('hidden'); body.innerHTML = ''; },
      // 等某個按鈕被按，回傳按鈕的 data-v
      wait(sel = 'button[data-v]') {
        return new Promise(res => {
          const btns = [...body.querySelectorAll(sel)];
          btns.forEach(b => b.onclick = () => { if (b.disabled) return; SFX.door(); res(b.dataset.v); });
        });
      }
    };
  }

  /* ---------- 腳本執行（執行中玩家不能移動） ---------- */
  async function run(fn) {
    G.busy++;
    try { await fn(); } catch (e) { console.error(e); }
    G.busy = Math.max(0, G.busy - 1);
    keys.clear();
    save(); renderHud();
  }

  /* ---------- 道具與證據 ---------- */
  function give(id) {
    if (!G.items.includes(id)) { G.items.push(id); SFX.get(); const d = CH.items[id]; toast(`獲得道具：${d.icon} ${d.name}`); if (!G.selected) G.selected = id; }
    renderHud(); save();
  }
  function addEvidence(id) {
    if (!G.evidence.includes(id)) { G.evidence.push(id); SFX.get(); const d = CH.evidence[id]; toast(`📜 證據入手：${d.name}`); }
    renderHud(); save();
  }
  const has = id => G.items.includes(id) || G.evidence.includes(id);
  const flag = (k, v) => { if (v === undefined) return G.flags[k]; G.flags[k] = v; save(); return v; };

  /* ---------- 提示訊息 ---------- */
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* ---------- 抬頭顯示（愛心、背包） ---------- */
  function renderHud() {
    if (!G) return;
    let s = '';
    for (let i = 0; i < G.maxHearts; i++) s += `<span class="heart ${i < G.hearts ? '' : 'empty'}">♥</span>`;
    $('hearts').innerHTML = s;
    const sel = G.selected && (CH.items[G.selected] || CH.evidence[G.selected]);
    $('btn-b').innerHTML = sel ? `<span>${sel.icon}</span><small>B</small>` : '<span>🎒</span><small>B</small>';
    $('ev-count').textContent = G.evidence.length;
  }

  function openBag() {
    if (!G || G.busy) return;
    G.bagOpen = true;
    const list = (ids, defs, kind) => ids.length ? ids.map(id => {
      const d = defs[id];
      return `<button class="bag-item ${G.selected === id ? 'on' : ''}" data-id="${id}">
        <span class="bi">${d.icon}</span><span class="bt"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></span>
        <span class="sel">${G.selected === id ? '使用中' : '選用'}</span></button>`;
    }).join('') : `<p class="empty">${kind === 'item' ? '還沒有道具' : '還沒有找到證據'}</p>`;
    $('bag-body').innerHTML = `
      <h3>🧰 道具</h3>${list(G.items, CH.items, 'item')}
      <h3>📜 證據筆記本 <small>（按 B 可以把證據「丟」向迷思魔）</small></h3>${list(G.evidence, CH.evidence, 'ev')}`;
    $('bag-body').querySelectorAll('.bag-item').forEach(b => b.onclick = () => { G.selected = b.dataset.id; SFX.door(); closeBag(); renderHud(); });
    $('bag').classList.remove('hidden');
  }
  function closeBag() { G.bagOpen = false; $('bag').classList.add('hidden'); }

  /* ---------- 互動：A 鍵 ---------- */
  function front() { const [dx, dy] = DIRS[G.dir]; return [Math.round(G.px) + dx, Math.round(G.py) + dy]; }
  function interact() {
    if (G.busy || G.moving) return;
    const [fx, fy] = front();
    const e = visibleEnts().find(e => e.x === fx && e.y === fy) || visibleEnts().find(e => e.solid === false && e.x === Math.round(G.px) && e.y === Math.round(G.py));
    if (e && e.act) { run(() => e.act(G)); return; }
    const r = room();
    if (r.inspect) { const msg = r.inspect(tileAt(fx, fy), fx, fy, G); if (msg) { run(() => say(null, msg)); return; } }
  }

  /* ---------- 使用：B 鍵 ---------- */
  function useSelected() {
    if (G.busy) return;
    if (!G.selected) { openBag(); return; }
    const id = G.selected;
    if (CH.evidence[id]) {
      if (!G.boss || !G.boss.alive) { toast('證據要拿去對付迷思魔才有用！'); return; }
      if (G.projectiles.length) return;
      const [dx, dy] = DIRS[G.dir];
      G.projectiles.push({ x: G.px, y: G.py, dx, dy, life: 1.4, ev: id });
      beep(520, 0.05, 'triangle', 0.05);
      return;
    }
    const item = CH.items[id];
    if (item && item.use) { item.use(G, api); return; }
    toast(`${item ? item.icon + ' ' + item.name : ''}：這裡用不到`);
  }

  /* ---------- 受傷與昏倒 ---------- */
  function hurt() {
    if (G.inv > 0 || G.busy) return;
    G.hearts--; G.inv = 1.3; SFX.hurt(); G.shake = 0.25; renderHud();
    if (G.hearts <= 0) {
      G.stats.faints++;
      run(async () => {
        await say(null, '💫 你被迷思的火焰燙暈了……\n（別擔心，科學家也是跌倒好幾次才找到答案的）');
        G.hearts = G.maxHearts;
        const sp = room().spawn || [Math.round(G.px), Math.round(G.py)];
        enterRoom(G.roomId, sp[0], sp[1], 'up');   // Boss 房的 onEnter 會重新開戰（護盾進度保留）
      });
    }
  }

  /* ---------- Boss 戰 ---------- */
  function startBoss(def, retry) {
    G.bossDef = def;
    G.boss = { x: def.x, y: def.y, alive: true, phase: G.bossPhase || 0, t: 0, shot: 1.8, dir: 1, flash: 0, wrongs: 0 };
    showClaim();
  }
  function showClaim(extra = '') {
    const b = G.boss, def = G.bossDef; if (!b) return;
    const ph = def.phases[b.phase];
    const bar = def.phases.map((_, i) => `<i class="${i < b.phase ? 'broken' : ''}"></i>`).join('');
    $('banner').innerHTML = `<div class="shield">${bar}</div><div class="claim">🔥 ${esc(ph.claim)}</div>${extra ? `<div class="extra">${extra}</div>` : ''}`;
    $('banner').classList.remove('hidden');
  }
  function bossHit(ev) {
    const b = G.boss, def = G.bossDef, ph = def.phases[b.phase];
    if (ph.answer === ev) {
      SFX.hit(); b.flash = 0.6; G.shake = 0.3;
      G.stats.bossHits = (G.stats.bossHits || 0) + 1;
      b.phase++; G.bossPhase = b.phase; b.wrongs = 0;
      burst(b.x + 1, b.y + 1, '#fff3b0', 18);
      if (b.phase >= def.phases.length) {
        b.alive = false; G.fireballs = []; G.minions.forEach(m => m.alive = false);
        $('banner').classList.add('hidden');
        burst(b.x + 1, b.y + 1, '#a9dcf2', 40);
        run(async () => { await wait(900); await def.onWin(G); });
      } else {
        run(async () => { await say(null, ph.win); showClaim(); });
      }
    } else {
      SFX.wrong(); G.stats.wrongEvidence++; b.wrongs++;
      const d = CH.evidence[ev];
      const hint = b.wrongs >= 2 ? `💡 提示：${ph.hint}` : `「${d.name}」打不倒這個說法！`;
      showClaim(hint);
      // 打錯會冒出一隻小火焰
      if (G.minions.filter(m => m.alive).length < 3) G.minions.push({ id: 'spawn' + Date.now(), fx: b.x + 0.5, fy: b.y + 2, vx: 0, vy: 0, t: 0, alive: true, spawned: true });
    }
  }

  /* ---------- 特效 ---------- */
  function burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, color }); } }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 主迴圈 ---------- */
  function heldDir() {
    for (const d of ['up', 'down', 'left', 'right']) if (keys.has(d)) return d;
    return null;
  }
  function update(dt) {
    if (!G) return;
    if (G.inv > 0) G.inv -= dt;
    if (G.shake > 0) G.shake -= dt;
    const frozen = G.busy || G.bagOpen;

    // 玩家移動（一格一格走）
    if (G.moving) {
      G.moveT += dt / STEP;
      if (G.moveT >= 1) {
        G.px = G.tx; G.py = G.ty; G.moving = false;
        const door = (room().doors || []).find(d => d.x === G.px && d.y === G.py);
        if (door) {
          if (door.cond && !door.cond(G)) { run(() => say(null, door.locked || '現在還不能過去。')); G.ty = G.py = G.py - DIRS[G.dir][1]; G.tx = G.px = G.px - DIRS[G.dir][0]; }
          else { SFX.door(); fade(() => enterRoom(door.to, door.tx, door.ty, door.dir)); return; }
        }
      } else {
        G.px = G.ox + (G.tx - G.ox) * G.moveT; G.py = G.oy + (G.ty - G.oy) * G.moveT;
      }
    }
    if (!G.moving && !frozen) {
      const d = heldDir();
      if (d) {
        G.dir = d;
        const [dx, dy] = DIRS[d]; const nx = Math.round(G.px) + dx, ny = Math.round(G.py) + dy;
        if (!blocked(nx, ny)) { G.ox = G.px; G.oy = G.py; G.tx = nx; G.ty = ny; G.moveT = 0; G.moving = true; G.walk = (G.walk || 0) + 1; }
      }
    }

    // 小火焰（迷思的火苗）亂飄
    G.minions.forEach(m => {
      if (!m.alive) return;
      m.t -= dt;
      if (m.t <= 0 && !frozen) { const a = Math.floor(Math.random() * 4); const sp = m.speed || 1.4; [m.vx, m.vy] = [[sp, 0], [-sp, 0], [0, sp], [0, -sp]][a]; m.t = 0.8 + Math.random() * 1.4; }
      if (frozen) return;
      const nx = m.fx + m.vx * dt, ny = m.fy + m.vy * dt;
      const cx = Math.round(nx + Math.sign(m.vx) * 0.45), cy = Math.round(ny + Math.sign(m.vy) * 0.45);
      if (SOLID.has(tileAt(cx, cy)) || cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || visibleEnts().some(e => e.x === cx && e.y === cy && e.solid !== false)) { m.vx = -m.vx; m.vy = -m.vy; }
      else { m.fx = nx; m.fy = ny; }
      if (Math.hypot(m.fx - G.px, m.fy - G.py) < 0.7) hurt();
    });

    // Boss
    const b = G.boss;
    if (b && b.alive && !frozen) {
      b.t += dt; if (b.flash > 0) b.flash -= dt;
      b.x += b.dir * dt * 1.6;
      if (b.x < 2) { b.x = 2; b.dir = 1; } if (b.x > 12) { b.x = 12; b.dir = -1; }
      b.y = G.bossDef.y + Math.sin(b.t * 2) * 0.4;
      b.shot -= dt;
      if (b.shot <= 0) {
        b.shot = Math.max(1.4, 2.6 - b.phase * 0.4);
        const ox = b.x + 1, oy = b.y + 1.6;
        const ang = Math.atan2(G.py + 0.5 - oy, G.px + 0.5 - ox);
        [-0.35, 0, 0.35].forEach(da => G.fireballs.push({ x: ox, y: oy, vx: Math.cos(ang + da) * 3, vy: Math.sin(ang + da) * 3, life: 4 }));
        beep(200, 0.08, 'sawtooth', 0.03);
      }
    }
    if (!frozen) {
      G.fireballs = G.fireballs.filter(f => {
        f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
        if (Math.hypot(f.x - G.px - 0.5, f.y - G.py - 0.5) < 0.55) { hurt(); return false; }
        return f.life > 0 && !SOLID.has(tileAt(Math.floor(f.x), Math.floor(f.y)));
      });
      G.projectiles = G.projectiles.filter(p => {
        p.x += p.dx * dt * 8; p.y += p.dy * dt * 8; p.life -= dt;
        if (b && b.alive && p.x + 0.5 > b.x && p.x + 0.5 < b.x + 2 && p.y + 0.5 > b.y && p.y + 0.5 < b.y + 2) { bossHit(p.ev); return false; }
        return p.life > 0 && !SOLID.has(tileAt(Math.round(p.x), Math.round(p.y)));
      });
    }
    G.fx = G.fx.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; return p.life > 0; });
  }

  function draw(now) {
    if (!G || !bg) return;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    ctx.drawImage(bg, 0, 0);
    // 物件與角色，依 y 排序
    const list = visibleEnts().map(e => ({ y: e.y, draw: () => {
      const img = e.obj ? SPR.obj(typeof e.obj === 'function' ? e.obj(G) : e.obj) : SPR.sprite(e.spr);
      if (img) ctx.drawImage(img, e.x * T, e.y * T - (e.spr ? 2 : 0));
      if (e.mark && e.mark(G)) { ctx.fillStyle = '#f3c64b'; ctx.fillRect(e.x * T + 6, e.y * T - 9 + Math.sin(now / 200) * 1.5, 4, 5); ctx.fillStyle = '#1b1b2a'; ctx.fillRect(e.x * T + 7, e.y * T - 8 + Math.sin(now / 200) * 1.5, 2, 2); }
    } }));
    list.push({ y: G.py, draw: () => {
      if (G.inv > 0 && Math.floor(now / 80) % 2) return;
      const name = G.dir === 'up' ? 'hero_u' : G.dir === 'left' ? 'hero_l' : G.dir === 'right' ? 'hero_r' : 'hero_d';
      const bob = G.moving && Math.floor(G.moveT * 2) % 2 ? -1 : 0;
      ctx.drawImage(SPR.sprite(name), G.px * T, G.py * T - 3 + bob);
    } });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    // 小火焰
    G.minions.forEach(m => { if (!m.alive) return; const s = SPR.sprite('flame'); const fl = Math.sin(now / 90 + m.fx) * 1; ctx.drawImage(s, m.fx * T, m.fy * T + fl); });
    // Boss
    const b = G.boss;
    if (b && b.alive) {
      if (!(b.flash > 0 && Math.floor(now / 60) % 2)) ctx.drawImage(SPR.sprite('boss'), b.x * T, b.y * T, 32, 32);
      // 護盾
      ctx.strokeStyle = `rgba(255,210,90,${0.35 + 0.2 * Math.sin(now / 150)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x * T + 16, b.y * T + 16, 20 - b.phase * 2, 0, Math.PI * 2); ctx.stroke();
    }
    G.fireballs.forEach(f => { ctx.fillStyle = '#f08a3a'; ctx.beginPath(); ctx.arc(f.x * T, f.y * T, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3b0'; ctx.fillRect(f.x * T - 1, f.y * T - 1, 2, 2); });
    G.projectiles.forEach(p => { ctx.fillStyle = '#1b1b2a'; ctx.fillRect(p.x * T + 4, p.y * T + 5, 9, 7); ctx.fillStyle = '#f6eedb'; ctx.fillRect(p.x * T + 5, p.y * T + 6, 7, 5); ctx.fillStyle = '#c0392b'; ctx.fillRect(p.x * T + 7, p.y * T + 8, 3, 1); });
    G.fx.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x * T, p.y * T, 2, 2); });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    update(dt); draw(t);
    requestAnimationFrame(loop);
  }

  function fade(fn) {
    const f = $('fade'); f.classList.add('on'); G.busy++;
    setTimeout(() => { fn(); setTimeout(() => { f.classList.remove('on'); G.busy = Math.max(0, G.busy - 1); }, 120); }, 220);
  }

  /* ---------- 畫面大小 ---------- */
  function resize() {
    if (!cv) return;
    const wrap = $('stage');
    const padH = getComputedStyle($('pad')).position === 'absolute' ? 0 : $('pad').offsetHeight;
    const aw = wrap.clientWidth, ah = Math.max(160, window.innerHeight - $('hud').offsetHeight - padH - 24);
    let s = Math.min(aw / W, ah / H);
    s = Math.max(1, Math.floor(s * 2) / 2);   // 以 0.5 倍為單位放大，像素才不會糊
    scale = s * (window.devicePixelRatio || 1);
    cv.width = W * scale; cv.height = H * scale;
    cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
    ctx.imageSmoothingEnabled = false;
  }

  /* ---------- 操作：鍵盤與觸控 ---------- */
  function bindInput() {
    const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', e => {
      if (!running) return;
      if (e.target.tagName === 'INPUT') return;
      if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); return; }
      if (dlg && dlg.choice && /^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < dlg.nOpts) dlg.choice(i); return; }
      if (['KeyZ', 'Space', 'Enter'].includes(e.code)) {
        e.preventDefault();
        if (dlg) return advance();
        if (!$('panel').classList.contains('hidden')) return;
        if (G.bagOpen) return closeBag();
        return interact();
      }
      if (e.code === 'KeyX') { if (!dlg && !G.bagOpen) useSelected(); return; }
      if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); G.bagOpen ? closeBag() : openBag(); return; }
      if (e.code === 'Escape' && G.bagOpen) closeBag();
    });
    window.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
    window.addEventListener('blur', () => keys.clear());
    document.querySelectorAll('#pad [data-k]').forEach(b => {
      const k = b.dataset.k;
      const on = e => { e.preventDefault(); keys.clear(); keys.add(k); b.classList.add('down'); };
      const off = e => { e.preventDefault(); keys.delete(k); b.classList.remove('down'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    $('btn-a').addEventListener('pointerdown', e => { e.preventDefault(); if (dlg) return advance(); if (G.bagOpen) return closeBag(); interact(); });
    $('btn-b').addEventListener('pointerdown', e => { e.preventDefault(); if (!dlg && !G.bagOpen) useSelected(); });
    $('dlg').addEventListener('click', () => advance());
    $('btn-bag').onclick = () => G.bagOpen ? closeBag() : openBag();
    $('bag-close').onclick = closeBag;
    $('btn-sound').onclick = () => { soundOn = !soundOn; $('btn-sound').textContent = soundOn ? '🔊' : '🔇'; };
    $('btn-exit').onclick = () => { if (G.busy) return toast('先把眼前的事情做完喔'); save(); stop(); onExit(); };
    window.addEventListener('resize', resize);
  }

  /* ---------- 開始／結束章節 ---------- */
  function start(chapter, player, opts = {}) {
    CH = chapter; PLAYER = player; onFinish = opts.onFinish || onFinish; onExit = opts.onExit || onExit;
    if (!cv) { cv = $('cv'); ctx = cv.getContext('2d'); bindInput(); }
    const saved = opts.fresh ? null : loadAll().chapters[CH.id];
    G = {
      roomId: null, px: 0, py: 0, dir: 'down', moving: false, busy: 0, bagOpen: false, inv: 0, shake: 0,
      hearts: 3, maxHearts: 3, items: [], evidence: [], selected: null, flags: {}, minions: [], projectiles: [], fireballs: [], fx: [],
      stats: { playMs: 0, predictions: {}, wrongEvidence: 0, faints: 0, startedAt: Date.now() }, sessionStart: Date.now()
    };
    if (saved) Object.assign(G, { hearts: saved.hearts, maxHearts: saved.maxHearts, items: saved.items, evidence: saved.evidence, flags: saved.flags, stats: saved.stats, dir: saved.dir });
    G.selected = G.items[0] || null;
    running = true; resize(); renderHud();
    requestAnimationFrame(t => { last = t; loop(t); });
    if (saved) { enterRoom(saved.room, saved.x, saved.y, saved.dir); toast('📖 從上次的進度繼續'); }
    else { const s = CH.start; enterRoom(s.room, s.x, s.y, s.dir); if (CH.intro) run(() => CH.intro(G)); }
    setTimeout(resize, 50);
  }
  function stop() { running = false; keys.clear(); }
  function finish(result) {
    save();
    const d = loadAll();
    const st = { ...G.stats, playMs: G.stats.playMs + (Date.now() - G.sessionStart) };
    d.done[CH.id] = { at: Date.now(), stats: st, evidence: G.evidence.length, ...result };
    delete d.chapters[CH.id];
    saveAll(d);
    stop();
    onFinish(CH.id, d.done[CH.id]);
  }

  const api = {
    say, choose, panel, give, addEvidence, has, flag, toast, wait, run, burst, startBoss, finish,
    goto: (r, x, y, dir) => fade(() => enterRoom(r, x, y, dir)),
    heal: () => { G.hearts = G.maxHearts; renderHud(); },
    addHeart: () => { G.maxHearts++; G.hearts = G.maxHearts; renderHud(); },
    killMinionInFront() {
      const [fx, fy] = front();
      const m = G.minions.find(m => m.alive && Math.hypot(m.fx - fx, m.fy - fy) < 0.9);
      if (!m) return null;
      m.alive = false; burst(m.fx + 0.5, m.fy + 0.5, '#9a907f', 14); SFX.puff();
      if (!m.spawned) { G.flags.killed = [...(G.flags.killed || []), m.id]; }
      save(); return m;
    },
    minionsLeft: () => G.minions.filter(m => m.alive).length,
    state: () => G, player: () => PLAYER, loadAll, saveAll, renderHud,
    setSound: v => { soundOn = v; }
  };
  return { ...api, start, stop, SFX };
})();
