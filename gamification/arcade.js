/* =========================================================
   🎲 課堂遊戲化・共用核心 Arcade（2026-10-20）
   用在：picker.html（選人）、curse.html（陣亡詛咒）、truth-or-dare.html
   - Arcade.store   ：存在這台裝置瀏覽器的設定（localStorage，失敗也不會壞）
   - Arcade.sfx     ：用 Web Audio 現場合成的音效（不用下載音檔）
   - Arcade.awake   ：投影時螢幕不要暗掉（Wake Lock，後備：隱形影片）
   - Arcade.confetti：彩帶
   - Arcade.rand / shuffle / weighted：公平的亂數
   - Arcade.toolbar ：右上角 🔊 ☀️ ⛶ 🏠 按鈕
   - Arcade.exportJSON / importJSON：設定檔備份與搬家
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 存檔 ---------- */
  const store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? def : JSON.parse(raw);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* 不能存也沒關係 */ } }
  };

  /* ---------- 亂數（用 crypto，比 Math.random 更均勻） ---------- */
  function rand(n) {
    if (n <= 0) return 0;
    try {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / n) * n;
      do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % n;
    } catch (e) { return Math.floor(Math.random() * n); }
  }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // items: [{ w: 權重, ... }]，權重 0 的不會被抽到
  function weighted(items, getW) {
    const w = getW || (x => x.w);
    const list = items.filter(x => (+w(x) || 0) > 0);
    if (!list.length) return null;
    const total = list.reduce((s, x) => s + (+w(x)), 0);
    let r = (rand(1000000) / 1000000) * total;
    for (const x of list) { r -= +w(x); if (r < 0) return x; }
    return list[list.length - 1];
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 音效（Web Audio 合成） ---------- */
  const SOUND_KEY = 'wu-game-sound';
  let ctx = null, master = null;
  let soundOn = store.get(SOUND_KEY, true);
  function ac() {
    if (!soundOn) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, opt) {
    const c = ac(); if (!c) return;
    const o = opt || {};
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, opt) {
    const c = ac(); if (!c) return;
    const o = opt || {};
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 1200; f.Q.value = o.q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  const sfx = {
    get on() { return soundOn; },
    set on(v) { soundOn = !!v; store.set(SOUND_KEY, soundOn); },
    unlock() { ac(); },
    // 轉盤喀噠聲（pitch 0～1 越高越尖）
    tick(p) { tone(900 + (p || 0) * 700, 0.045, { type: 'square', vol: 0.12 }); noise(0.03, { freq: 3000, vol: 0.08 }); },
    // 停下來的「卡」
    clunk() { tone(160, 0.18, { type: 'triangle', vol: 0.45, to: 70 }); noise(0.08, { freq: 500, vol: 0.25, filter: 'lowpass' }); },
    // 小鼓連打（秒）
    drumroll(sec) {
      const c = ac(); if (!c) return;
      const n = Math.floor(sec / 0.055);
      for (let i = 0; i < n; i++) noise(0.05, { delay: i * 0.055, freq: 1800, q: 0.7, vol: 0.06 + 0.14 * (i / n) });
    },
    // 公布結果：小號式琶音
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.28, delay: i * 0.09 }));
      tone(1047, 0.7, { type: 'triangle', vol: 0.25, delay: 0.38 });
      tone(784, 0.7, { type: 'sine', vol: 0.18, delay: 0.38 });
      noise(0.5, { freq: 6000, vol: 0.05, delay: 0.38, filter: 'highpass' });
    },
    // 詛咒降臨：低沉不和諧＋鐘聲
    doom() {
      tone(110, 1.6, { type: 'sawtooth', vol: 0.22, to: 55, attack: 0.03 });
      tone(116.5, 1.6, { type: 'sawtooth', vol: 0.16, to: 58, attack: 0.03 });
      tone(233, 1.1, { type: 'sine', vol: 0.18, delay: 0.05 });
      noise(1.2, { freq: 200, vol: 0.35, filter: 'lowpass' });
    },
    // 好運／復活：亮晶晶
    magic() {
      [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.35, { type: 'sine', vol: 0.2, delay: i * 0.07 }));
      tone(2349, 0.9, { type: 'sine', vol: 0.12, delay: 0.38 });
    },
    // 翻牌／刷卡
    whoosh() { noise(0.22, { freq: 2400, q: 0.5, vol: 0.18 }); },
    // 按鈕輕點
    blip() { tone(660, 0.06, { type: 'sine', vol: 0.15 }); }
  };

  /* ---------- 減速計時（轉盤用）：回傳每一格之間的間隔毫秒 ---------- */
  // 總時間 total 毫秒內，從 fast 慢慢變成 slow
  function easeTicks(total, fast, slow) {
    const out = []; let t = 0;
    while (t < total) {
      const p = t / total;
      const gap = fast + (slow - fast) * p * p;
      out.push(gap); t += gap;
    }
    return out;
  }

  /* ---------- 螢幕常亮 ---------- */
  const AWAKE_KEY = 'wu-game-awake';
  const awake = {
    want: store.get(AWAKE_KEY, true),
    lock: null, video: null, state: 'off', onchange: null,
    async on() {
      this.want = true; store.set(AWAKE_KEY, true);
      try {
        if ('wakeLock' in navigator) {
          this.lock = await navigator.wakeLock.request('screen');
          this.lock.addEventListener('release', () => { this.lock = null; if (this.state === 'on') this._set('need'); });
          this._set('on'); return;
        }
      } catch (e) { /* 改用後備 */ }
      try {
        if (!this.video) {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1;
          const g = cv.getContext('2d'); g.fillRect(0, 0, 1, 1);
          const v = document.createElement('video');
          v.muted = true; v.playsInline = true; v.loop = true;
          v.setAttribute('playsinline', ''); v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0';
          v.srcObject = cv.captureStream(1);
          document.body.appendChild(v); this.video = v;
        }
        await this.video.play();
        this._set('on');
      } catch (e) { this._set('need'); }
    },
    off() {
      this.want = false; store.set(AWAKE_KEY, false);
      try { if (this.lock) this.lock.release(); } catch (e) { /* 忽略 */ }
      this.lock = null;
      if (this.video) { try { this.video.pause(); } catch (e) { /* 忽略 */ } }
      this._set('off');
    },
    _set(s) { this.state = s; if (this.onchange) this.onchange(s); }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && awake.want) awake.on();
  });

  /* ---------- 全螢幕 ---------- */
  function toggleFullscreen() {
    const d = document;
    const isFs = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (isFs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen).call(d.documentElement);
    } catch (e) { toast('這台裝置不支援全螢幕，可用瀏覽器的「加入主畫面」'); }
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
    document.body.classList.toggle('is-fs', !!(document.fullscreenElement || document.webkitFullscreenElement));
  }));

  /* ---------- 提示泡泡 ---------- */
  let toastEl = null, toastTimer = 0;
  function toast(msg, ms) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 2200);
  }

  /* ---------- 彩帶 ---------- */
  let fxCv = null, fxCtx = null, parts = [], fxRun = false;
  function confetti(opt) {
    const o = opt || {};
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!fxCv) {
      fxCv = document.createElement('canvas'); fxCv.className = 'fx-canvas'; document.body.appendChild(fxCv);
      fxCtx = fxCv.getContext('2d');
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fxCv.width = innerWidth * dpr; fxCv.height = innerHeight * dpr; fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = o.colors || ['#f2b134', '#e4572e', '#1f9e8f', '#7b5ea7', '#1f2a44', '#ffffff'];
    const n = o.count || 140;
    const x0 = o.x == null ? innerWidth / 2 : o.x, y0 = o.y == null ? innerHeight * 0.4 : o.y;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({
        x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4,
        c: colors[i % colors.length], life: 0, max: 90 + Math.random() * 60, star: o.stars && Math.random() < .5
      });
    }
    if (!fxRun) { fxRun = true; requestAnimationFrame(fxTick); }
  }
  function fxTick() {
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life < p.max);
    for (const p of parts) {
      p.life++; p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      fxCtx.save(); fxCtx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      fxCtx.translate(p.x, p.y); fxCtx.rotate(p.r); fxCtx.fillStyle = p.c;
      if (p.star) { fxCtx.font = (p.w + 8) + 'px sans-serif'; fxCtx.fillText('✦', -p.w / 2, p.h / 2); }
      else fxCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      fxCtx.restore();
    }
    if (parts.length) requestAnimationFrame(fxTick); else { fxRun = false; fxCtx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ---------- 右上角工具列 ---------- */
  function toolbar(el, opt) {
    const o = opt || {};
    el.innerHTML = `
      <button class="btn sm" id="ab-sound" type="button" title="音效開關"></button>
      <button class="btn sm" id="ab-awake" type="button" title="投影時螢幕不要變暗"></button>
      <button class="btn sm" id="ab-fs" type="button" title="全螢幕">⛶ 全螢幕</button>
      ${o.home === false ? '' : '<a class="btn sm navy" href="../index.html" title="回事務所首頁">🏠 回事務所首頁</a>'}`;
    const bs = el.querySelector('#ab-sound'), ba = el.querySelector('#ab-awake');
    const paintS = () => { bs.textContent = sfx.on ? '🔊 音效開' : '🔇 音效關'; bs.className = 'btn sm ' + (sfx.on ? '' : 'off'); };
    const paintA = s => {
      const map = { on: '☀️ 常亮開', need: '☀️ 點我常亮', off: '🌙 常亮關' };
      ba.textContent = map[s] || map.off; ba.className = 'btn sm ' + (s === 'on' ? '' : 'off');
    };
    bs.onclick = () => { sfx.on = !sfx.on; paintS(); if (sfx.on) sfx.blip(); };
    ba.onclick = () => { if (awake.state === 'on') awake.off(); else awake.on(); };
    el.querySelector('#ab-fs').onclick = toggleFullscreen;
    awake.onchange = paintA;
    paintS(); paintA(awake.state);
    if (awake.want) {
      awake.on();
      // 有些瀏覽器要先點一下畫面才肯常亮
      const once = () => { if (awake.want && awake.state !== 'on') awake.on(); sfx.unlock(); };
      document.addEventListener('pointerdown', once, { once: true });
    }
  }

  /* ---------- 設定檔匯出／匯入 ---------- */
  function exportJSON(filename, data) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { toast('匯出失敗：這個瀏覽器不支援下載'); }
  }
  function importJSON() {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => { try { resolve(JSON.parse(r.result)); } catch (e) { toast('這個檔案看不懂，請選之前匯出的 .json'); resolve(null); } };
        r.readAsText(f);
      };
      inp.click();
    });
  }

  /* ---------- 小工具 ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = s => String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const hhmm = (d) => { const x = d ? new Date(d) : new Date(); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
  function modal(backEl, open) {
    backEl.classList.toggle('hidden', !open);
    if (open) {
      const onKey = e => { if (e.key === 'Escape') { modal(backEl, false); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
      backEl.onclick = e => { if (e.target === backEl) modal(backEl, false); };
    }
  }

  window.Arcade = { store, rand, pick, shuffle, weighted, sleep, sfx, easeTicks, awake, toggleFullscreen, toast, confetti, toolbar, exportJSON, importJSON, esc, lines, hhmm, modal };
})();
