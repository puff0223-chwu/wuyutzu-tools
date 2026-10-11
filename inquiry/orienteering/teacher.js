/* 🧭 遺落的地點：老師後台（第一階段：題庫、地圖、點位、區域與禁行區、紙本版、備份） */
const G = window.GPS, esc = G.esc;
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

const S = {
  user: null, banks: {}, bankId: null, bank: null,
  tab: LS.get('gps_tab', 'map'), sel: null, mode: 'view', zoom: LS.get('gps_zoom', 1),
  filter: { zone: '', q: '', flag: '' }, checked: new Set(), showNoGo: true, zoneFilter: '',
  paper: { n: 10, k: 13, onlyEnabled: true, noTeach: false, seed: 0, versions: null }
};

// ---------- 小工具 ----------
function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), err ? 4200 : 2400); }
function modal(html, opt) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${opt && opt.wide ? 'wide' : ''}">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('mousedown', (e) => { if (e.target === bg && !(opt && opt.sticky)) close(); });
  return { el: bg, close };
}
function confirmBox(msg, okText) {
  return new Promise((res) => {
    const m = modal(`<p style="white-space:pre-line">${msg}</p><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-no>取消</button><button class="btn primary" data-ok>${okText || '確定'}</button></div>`);
    $('[data-ok]', m.el).onclick = () => { m.close(); res(true); };
    $('[data-no]', m.el).onclick = () => { m.close(); res(false); };
  });
}
function zoomImg(src) { const z = document.createElement('div'); z.className = 'zoom-bg'; z.innerHTML = `<img src="${esc(src)}">`; z.onclick = () => z.remove(); document.body.appendChild(z); }
const zoneMap = () => G.zoneById(S.bank);
const pts = () => G.sortedPoints(S.bank);
const curPoint = () => (S.sel && S.bank.points[S.sel]) || null;
function imgSrc(ref) {
  const u = G.photoURL(ref);
  if (!u && ref && ref.startsWith('f:')) G.loadPhoto(ref).then((d) => { $$(`img[data-ref="${ref}"]`).forEach((im) => { im.src = d; }); });
  return u;
}
const imgTag = (ref, cls, extra) => `<img class="${cls || ''}" data-ref="${esc(ref || '')}" src="${esc(imgSrc(ref) || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=')}" loading="lazy" ${extra || ''}>`;
function readFileText(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); }); }
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function pickFile(accept, multiple) {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.onchange = () => res(Array.from(i.files || [])); i.click(); });
}

// ---------- 雲端存取 ----------
const Store = {
  async index() { return (await FB.get('orienteering/owners/' + S.user.uid)) || {}; },
  async load(id) { const v = await FB.get('orienteering/banks/' + id); return v ? G.normalizeBank(v) : null; },
  _t: null,
  save(now) {
    clearTimeout(this._t);
    setSave('尚未儲存…');
    this._t = setTimeout(() => this.flush(), now ? 0 : 800);
  },
  async flush() {
    const b = S.bank, id = S.bankId; if (!b || !id) return;
    b.updatedAt = Date.now(); b.owner = S.user.uid;
    try {
      await FB.set('orienteering/banks/' + id, G.packBank(b));
      await FB.set('orienteering/owners/' + S.user.uid + '/' + id, { name: b.name, updatedAt: b.updatedAt });
      S.banks[id] = { name: b.name, updatedAt: b.updatedAt };
      setSave('✔ 已存到雲端 ' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
      LS.set('gps_cache_' + id, null);
    } catch (e) {
      LS.set('gps_cache_' + id, G.packBank(b));
      setSave('⚠ 雲端儲存失敗（已在本機暫存）', true);
      toast('雲端儲存失敗：' + (e.code || e.message), true);
    }
  },
  async uploadPhoto(file) {
    const c = await G.compressImage(file, 800, 0.72);
    const id = G.rid(6);
    await FB.set('orienteering/photos/' + id, { owner: S.user.uid, data: c.data, w: c.w, h: c.h, ts: Date.now() });
    G.cachePhoto(id, c.data);
    return 'f:' + id;
  }
};
function setSave(t, err) { S.saveMsg = [t, !!err]; const el = $('#saveState'); if (el) { el.textContent = t; el.classList.toggle('err', !!err); } }

// ---------- 登入 ----------
function renderLogin(msg) {
  $('#app').innerHTML = `
  <div class="login">
    <div class="en">THE LOST PLACES</div>
    <h1>🧭 遺落的地點</h1>
    <p class="muted" style="margin-bottom:14px">校園照片定向越野・老師後台</p>
    ${msg ? `<div class="alert red">${esc(msg)}</div>` : ''}
    <label class="f">Email</label><input type="email" id="lgEmail" value="${esc(LS.get('gps_email', 'puff0223+gps@gmail.com'))}" autocomplete="username">
    <label class="f">密碼</label><input type="password" id="lgPw" autocomplete="current-password">
    <div class="row" style="margin-top:16px"><button class="btn primary" id="lgGo">🔓 登入</button><span class="spacer"></span><button class="btn ghost sm" id="lgReset">忘記密碼</button></div>
    <p class="small muted" style="margin-top:14px">帳號由 Firebase 後台建立（Authentication → 新增使用者）。重設密碼的信會寄到原本的信箱。</p>
  </div>`;
  const go = async () => {
    const email = $('#lgEmail').value.trim(), pw = $('#lgPw').value;
    if (!email || !pw) return toast('請輸入 Email 和密碼', true);
    LS.set('gps_email', email);
    $('#lgGo').disabled = true;
    try { await FB.login(email, pw); } catch (e) { $('#lgGo').disabled = false; toast('登入失敗：' + (e.code || e.message), true); }
  };
  $('#lgGo').onclick = go; $('#lgPw').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('#lgReset').onclick = async () => { const email = $('#lgEmail').value.trim(); if (!email) return toast('請先輸入 Email', true); try { await FB.reset(email); toast('已寄出重設密碼信'); } catch (e) { toast('寄送失敗：' + (e.code || e.message), true); } };
}

async function enter(user) {
  S.user = user;
  $('#app').innerHTML = '<p style="text-align:center;margin-top:20vh" class="muted">讀取題庫中…</p>';
  try { S.banks = await Store.index(); } catch (e) { return renderLogin('讀取失敗：' + (e.code || e.message) + '（Firebase 規則可能還沒貼上 orienteering 區塊）'); }
  const ids = Object.keys(S.banks).sort((a, b) => (S.banks[b].updatedAt || 0) - (S.banks[a].updatedAt || 0));
  const want = LS.get('gps_bank', '') ;
  const id = ids.includes(want) ? want : ids[0];
  if (id) await openBank(id); else { S.bank = null; render(); }
}
async function openBank(id) {
  try {
    let b = await Store.load(id);
    const cache = LS.get('gps_cache_' + id, null);
    if (cache && (!b || (cache.updatedAt || 0) > (b.updatedAt || 0))) {
      if (await confirmBox('這台電腦有一份還沒存上雲端的題庫暫存（比雲端新），要用暫存版嗎？', '用暫存版')) { b = G.normalizeBank(cache); setTimeout(() => Store.save(true), 50); }
    }
    if (!b) return toast('找不到這個題庫', true);
    S.bankId = id; S.bank = b; S.sel = null; S.checked.clear(); S.paper.versions = null;
    LS.set('gps_bank', id);
    render();
  } catch (e) { toast('讀取題庫失敗：' + (e.code || e.message), true); }
}

// ---------- 主畫面 ----------
const TABS = [['live', '🏁 活動'], ['map', '🗺️ 地圖與點位'], ['list', '📋 點位清單'], ['zones', '🧩 區域與禁行區'], ['paper', '🖨️ 紙本版'], ['backup', '💾 備份與說明']];
function render() {
  const ids = Object.keys(S.banks);
  $('#app').innerHTML = `
  <div class="topbar">
    <div class="brand">🧭 遺落的地點<small>THE LOST PLACES</small></div>
    ${S.bank && ids.length > 1 ? `<select id="bankSel" class="inline" style="background:#2c3a5c;color:#fff;border:1.5px solid #51608a;border-radius:8px;padding:4px 8px">${ids.map((i) => `<option value="${i}" ${i === S.bankId ? 'selected' : ''}>${esc(S.banks[i].name)}</option>`).join('')}</select>` : (S.bank ? `<span>${esc(S.bank.name)}</span>` : '')}
    <span class="save-state ${S.saveMsg && S.saveMsg[1] ? 'err' : ''}" id="saveState">${esc(S.saveMsg ? S.saveMsg[0] : '')}</span>
    <span class="spacer"></span>
    <span class="tb-email small" style="opacity:.75">${esc(S.user.email || '')}</span>
    <button class="tb-btn" id="tbLogout">登出</button>
    <a class="home" href="../../index.html">🏠 回事務所首頁</a>
  </div>
  ${S.bank ? `<div class="tabs">${TABS.map(([k, t]) => `<div class="tab ${S.tab === k ? 'on' : ''}" data-tab="${k}">${t}</div>`).join('')}</div>
  <div class="panel" id="panel"></div>` : `<div class="panel" style="margin-top:20px" id="panel"></div>`}`;
  $('#tbLogout').onclick = async () => { if (L.isRefereeing() && !(await confirmBox('活動進行中，登出後系統會停止自動派題。確定登出？', '登出'))) return; L.stopReferee(); await Store.flush(); await FB.logout(); };
  if ($('#bankSel')) $('#bankSel').onchange = (e) => openBank(e.target.value);
  $$('.tab').forEach((t) => { t.onclick = () => { S.tab = t.dataset.tab; LS.set('gps_tab', S.tab); S.mode = 'view'; render(); }; });
  L.renderBadge();
  if (!S.bank) return renderWelcome();
  ({ live: () => L.renderLiveTab(), map: renderMapTab, list: renderListTab, zones: renderZonesTab, paper: renderPaperTab, backup: renderBackupTab }[S.tab] || renderMapTab)();
}

function renderWelcome() {
  $('#panel').innerHTML = `
  <h2>👋 歡迎！先建立第一個題庫</h2>
  <p class="lead">題庫＝校園地圖＋所有點位（照片、位置、答案、提示）。整學期、跨年度都用同一個題庫，每次上課再從題庫開活動。</p>
  <div class="card"><h3 style="margin-top:0">📥 匯入題庫檔（推薦）</h3>
    <p class="small muted">選擇 Claude 幫你整理好的「遺落的地點_題庫.json」（130 個點位、區域、提示都已設好），或之前「💾 備份」下載的檔案。</p>
    <button class="btn primary" id="wImport" style="margin-top:8px">選擇題庫檔…</button></div>
  <div class="card"><h3 style="margin-top:0">🆕 從空白開始</h3>
    <p class="small muted">使用大溪高中校園地圖，自己一個一個新增點位。</p>
    <button class="btn" id="wBlank" style="margin-top:8px">建立空白題庫</button></div>`;
  $('#wImport').onclick = () => importBank(true);
  $('#wBlank').onclick = async () => {
    const zones = [{ id: 'z' + G.rid(3), name: '區域 1', color: G.ZONE_COLORS[0], cap: 2 }];
    await createBank(G.normalizeBank({ name: '大溪高中校園', zones, points: {} }));
  };
}
async function createBank(bank) {
  const id = 'bk' + G.rid(5);
  S.bankId = id; S.bank = bank; S.banks[id] = { name: bank.name, updatedAt: Date.now() };
  LS.set('gps_bank', id);
  await Store.flush();
  render();
}
async function importBank(asNew) {
  const [f] = await pickFile('.json,application/json');
  if (!f) return;
  let data;
  try { data = JSON.parse(await readFileText(f)); } catch (e) { return toast('這不是正確的題庫檔', true); }
  const raw = data.bank || data;
  if (!raw.points) return toast('檔案裡找不到點位資料', true);
  const bank = G.normalizeBank(raw);
  const embedded = data.photoData || {};
  const need = Object.keys(embedded);
  if (need.length) {
    toast(`上傳 ${need.length} 張照片中…`);
    for (const id of need) { await FB.set('orienteering/photos/' + id, { owner: S.user.uid, data: embedded[id], ts: Date.now() }); G.cachePhoto(id, embedded[id]); }
  }
  if (asNew || !S.bank) { await createBank(bank); toast(`✅ 已匯入「${bank.name}」：${Object.keys(bank.points).length} 個點位`); }
  else {
    if (!(await confirmBox(`要用檔案內容「取代」目前的題庫「${S.bank.name}」嗎？\n（目前的點位會被覆蓋，建議先備份）`, '取代'))) return;
    S.bank = bank; S.sel = null; Store.save(true); render(); toast('✅ 已取代');
  }
}

// ---------- 地圖元件 ----------
function mapHTML(id, opt) {
  const b = S.bank, zm = zoneMap(), sel = curPoint();
  const pins = pts().map((p) => {
    const z = zm[p.zone]; const dim = (opt.zoneFilter && p.zone !== opt.zoneFilter);
    return `<div class="pin ${p.enabled ? '' : 'off'} ${p.teach ? 'teach' : ''} ${p.key === S.sel ? 'sel' : ''} ${dim ? 'dim' : ''}" data-k="${p.key}" style="left:${p.x}%;top:${p.y}%;background:${z ? z.color : '#555'}" title="${esc(p.no + ' ' + p.name)}">${p.no}</div>`;
  }).join('');
  const ng = S.showNoGo ? b.noGo.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="url(#hatch)" stroke="#e4572e" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join('') : '';
  let cam = '';
  if (sel && sel.cam) {
    cam = `<line x1="${sel.cam.x}" y1="${sel.cam.y}" x2="${sel.x}" y2="${sel.y}" stroke="#1f2a44" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`;
  }
  const camDot = sel && sel.cam ? `<div class="camdot" style="left:${sel.cam.x}%;top:${sel.cam.y}%"><span style="display:inline-block;transform:rotate(${sel.cam.dir * 45}deg)">⬆️</span></div><div class="camdot" style="left:${sel.cam.x}%;top:${sel.cam.y}%;font-size:13px;margin-top:20px">📷</div>` : '';
  const draft = S._draftNoGo ? `<rect x="${S._draftNoGo.x}" y="${S._draftNoGo.y}" width="${S._draftNoGo.w}" height="${S._draftNoGo.h}" fill="rgba(228,87,46,.25)" stroke="#e4572e" stroke-width="2" vector-effect="non-scaling-stroke"/>` : '';
  return `<div class="mapscroll" id="${id}Scroll"><div class="mapwrap ${S.mode === 'move' ? 'moving' : ''} ${['add', 'cam', 'nogo'].includes(S.mode) ? 'picking' : ''}" id="${id}" style="width:${Math.round(S.zoom * 100)}%">
    <img class="base" src="${esc(G.photoURL(b.map.src))}" alt="校園地圖">
    <svg class="ov" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(228,87,46,.10)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(228,87,46,.45)" stroke-width="2"/></pattern></defs>${ng}${draft}${cam}</svg>
    ${pins}${camDot}
  </div></div>`;
}
function bindMap(id, h) {
  const wrap = $('#' + id); if (!wrap) return;
  const pos = (e) => { const r = wrap.getBoundingClientRect(); return { x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) }; };
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    const pin = e.target.closest('.pin');
    const p = pos(e);
    if (S.mode === 'move' && pin) { drag = { k: pin.dataset.k, el: pin, moved: false }; wrap.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (S.mode === 'nogo') { drag = { nogo: true, x0: p.x, y0: p.y }; wrap.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    if (pin && S.mode === 'view') return h.select(pin.dataset.k);
    if (S.mode === 'add') return h.add(p);
    if (S.mode === 'cam') return h.cam(p);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    if (drag.nogo) {
      S._draftNoGo = { x: Math.min(drag.x0, p.x), y: Math.min(drag.y0, p.y), w: Math.abs(p.x - drag.x0), h: Math.abs(p.y - drag.y0) };
      const svg = $('svg.ov', wrap); let r = $('#draftRect', svg);
      if (!r) { r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.id = 'draftRect'; r.setAttribute('fill', 'rgba(228,87,46,.25)'); r.setAttribute('stroke', '#e4572e'); r.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(r); }
      ['x', 'y', 'w', 'h'].forEach((k) => r.setAttribute({ w: 'width', h: 'height' }[k] || k, S._draftNoGo[k]));
      return;
    }
    drag.moved = true; drag.el.style.left = p.x + '%'; drag.el.style.top = p.y + '%'; drag.p = p;
  });
  wrap.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.nogo) { const r = S._draftNoGo; S._draftNoGo = null; if (r && r.w > 0.8 && r.h > 0.5) h.nogo(r); else h.refresh(); return; }
    if (d.moved && d.p) h.moved(d.k, d.p); else h.select(d.k);
  });
}

// ---------- 分頁一：地圖與點位 ----------
function renderMapTab() {
  const b = S.bank, zm = zoneMap();
  const modeTip = { view: '點地圖上的編號可以編輯點位', move: '✋ 拖曳編號可以移動位置（放開自動存檔）', add: '➕ 在地圖上點一下，新增一個點位', cam: '📷 在地圖上點出「拍照的人站在哪裡」', nogo: '🚫 在地圖上拖曳拉出一個方框（禁行區）' }[S.mode];
  $('#panel').innerHTML = `
  <div class="toolbar">
    <div class="tool-grp"><b>模式</b>
      <button class="btn sm ${S.mode === 'view' ? 'on' : ''}" data-mode="view">👆 選取</button>
      <button class="btn sm ${S.mode === 'move' ? 'on' : ''}" data-mode="move">✋ 移動</button>
      <button class="btn sm ${S.mode === 'add' ? 'on' : ''}" data-mode="add">➕ 新增點位</button>
      <button class="btn sm ${S.mode === 'nogo' ? 'on' : ''}" data-mode="nogo">🚫 畫禁行區</button></div>
    <div class="tool-grp"><b>縮放</b><button class="btn sm" id="zOut">－</button><span class="small">${Math.round(S.zoom * 100)}%</span><button class="btn sm" id="zIn">＋</button></div>
    <div class="tool-grp"><b>只亮</b><select class="inline" id="zFilter"><option value="">全部區域</option>${b.zones.map((z) => `<option value="${z.id}" ${S.zoneFilter === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select>
      <label class="chk small"><input type="checkbox" id="showNoGo" ${S.showNoGo ? 'checked' : ''}> 顯示禁行區</label></div>
  </div>
  <div class="alert ${S.mode === 'view' ? 'blue' : ''}" style="margin-top:0">${modeTip}</div>
  <div class="mapcols">
    <div class="mapcol">${mapHTML('mapA', { zoneFilter: S.zoneFilter })}
      <div class="legend">${b.zones.map((z) => `<span><i style="background:${z.color}"></i>${esc(z.name)}（${pts().filter((p) => p.zone === z.id).length}）</span>`).join('')}
        <span><i style="background:#aaa"></i>停用</span><span><i style="background:#fff;outline:2px dashed var(--red)"></i>🤫 教學區鄰近</span></div>
    </div>
    <div class="card ed" id="editor"></div>
  </div>`;
  $$('[data-mode]').forEach((bt) => { bt.onclick = () => { S.mode = bt.dataset.mode; renderMapTab(); }; });
  $('#zOut').onclick = () => { S.zoom = Math.max(0.6, +(S.zoom - 0.2).toFixed(1)); LS.set('gps_zoom', S.zoom); renderMapTab(); };
  $('#zIn').onclick = () => { S.zoom = Math.min(3, +(S.zoom + 0.2).toFixed(1)); LS.set('gps_zoom', S.zoom); renderMapTab(); };
  $('#zFilter').onchange = (e) => { S.zoneFilter = e.target.value; renderMapTab(); };
  $('#showNoGo').onchange = (e) => { S.showNoGo = e.target.checked; renderMapTab(); };
  const keepScroll = () => { const sc = $('#mapAScroll'); const t = sc ? [sc.scrollLeft, sc.scrollTop] : null; renderMapTab(); if (t) { const s2 = $('#mapAScroll'); s2.scrollLeft = t[0]; s2.scrollTop = t[1]; } };
  bindMap('mapA', {
    select: (k) => { S.sel = k; keepScroll(); },
    moved: (k, p) => { const q = b.points[k]; q.x = +p.x.toFixed(2); q.y = +p.y.toFixed(2); S.sel = k; Store.save(); keepScroll(); },
    add: (p) => {
      const no = Math.max(0, ...pts().map((q) => q.no)) + 1, key = 'pt' + G.rid(4);
      const near = nearestZone(p);
      b.points[key] = G.normPoint({ no, name: '新地點 ' + no, x: +p.x.toFixed(2), y: +p.y.toFixed(2), zone: near, accept: [no], author: '巫魚子老師' }, key);
      S.sel = key; S.mode = 'view'; Store.save(); keepScroll(); toast(`已新增第 ${no} 號點位，記得加照片`);
    },
    cam: (p) => { const q = curPoint(); if (!q) return; q.cam = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), dir: q.cam ? q.cam.dir : guessDir(p, q) }; S.mode = 'view'; Store.save(); keepScroll(); },
    nogo: (r) => {
      const label = prompt('這個禁行區叫什麼？（例如：學思樓教室走廊）', '教學區');
      if (label === null) return keepScroll();
      b.noGo.push({ id: 'ng' + G.rid(3), label: label || '教學區', x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.w.toFixed(2), h: +r.h.toFixed(2) });
      Store.save(); keepScroll(); toast('已新增禁行區');
    },
    refresh: keepScroll
  });
  renderEditor();
}
function nearestZone(p) {
  const c = G.zoneCenters(S.bank); let best = S.bank.zones[0] ? S.bank.zones[0].id : '', bd = 1e9;
  Object.entries(c).forEach(([z, q]) => { const d = G.dist(S.bank, p, q); if (d < bd && S.bank.zones.some((x) => x.id === z)) { bd = d; best = z; } });
  return best;
}
function guessDir(cam, p) { const r = S.bank.map.h / S.bank.map.w; const a = Math.atan2(p.x - cam.x, -(p.y - cam.y) * r) * 180 / Math.PI; return ((Math.round(a / 45) % 8) + 8) % 8; }

function renderEditor() {
  const el = $('#editor'); const p = curPoint();
  if (!p) {
    const b = S.bank, all = pts();
    el.innerHTML = `<h3>📍 點位編輯</h3><p class="muted">在左邊地圖點一個編號開始編輯。</p>
      <h3>📊 題庫概況</h3>
      <table class="list"><tr><td>點位總數</td><td><b>${all.length}</b></td></tr>
      <tr><td>啟用中</td><td>${all.filter((q) => q.enabled).length}</td></tr>
      <tr><td>🤫 教學區鄰近</td><td>${all.filter((q) => q.teach).length}</td></tr>
      <tr><td>區域</td><td>${b.zones.length} 區</td></tr>
      <tr><td>還沒標視角</td><td>${all.filter((q) => !q.view.dist && !q.view.angle).length}</td></tr>
      <tr><td>還沒標拍攝站位</td><td>${all.filter((q) => !q.cam).length}</td></tr>
      <tr><td>沒有照片</td><td>${all.filter((q) => !q.photos.length).length}</td></tr></table>`;
    return;
  }
  const zm = zoneMap(), ng = G.inNoGo(S.bank, p);
  el.innerHTML = `
    <div class="row"><h3 style="margin:0">📍 第 ${p.no} 號</h3><span class="chip" style="background:${(zm[p.zone] || {}).color || '#888'};color:#fff">${esc((zm[p.zone] || {}).name || '未分區')}</span>
      ${p.enabled ? '' : '<span class="chip gray">停用</span>'}${p.teach ? '<span class="chip red">🤫 教學區鄰近</span>' : ''}<span class="spacer"></span><button class="btn sm ghost" id="edClose">✕</button></div>
    ${ng ? `<div class="alert red small">這個點落在禁行區「${esc(ng.label)}」範圍內（若是一樓或不同樓層可以忽略，或勾選 🤫）</div>` : ''}
    <label class="f">照片（第一張＝題目照片，其他＝備用）</label>
    <div class="photos">${p.photos.map((r, i) => `<div class="ph">${imgTag(r, '', `data-zoom="${i}"`)}${i === 0 ? '<span class="main">題目</span>' : `<button data-main="${i}" style="right:auto;left:3px">★設為題目</button>`}<button data-rm="${i}">✕</button></div>`).join('')}
      <div class="addph" id="addPh">＋<br>加照片</div></div>
    <div class="grid2">
      <div><label class="f">地點編號</label><input type="number" data-f="no" value="${p.no}"></div>
      <div><label class="f">基本分（積分賽）</label><input type="number" data-f="base" value="${p.base}"></div>
    </div>
    <label class="f">地點名稱（老師看）</label><input type="text" data-f="name" value="${esc(p.name)}">
    <div class="grid2">
      <div><label class="f">區域</label><select data-f="zone">${S.bank.zones.map((z) => `<option value="${z.id}" ${z.id === p.zone ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></div>
      <div><label class="f">可接受答案</label><input type="text" data-f="accept" value="${esc(p.accept.join(', '))}" placeholder="例：19, 119"></div>
    </div>
    <div class="row" style="margin-top:8px"><label class="chk"><input type="checkbox" data-f="enabled" ${p.enabled ? 'checked' : ''}> 啟用</label>
      <label class="chk"><input type="checkbox" data-f="teach" ${p.teach ? 'checked' : ''}> 🤫 教學區鄰近（其他班上課時不派）</label></div>
    <h3>💡 求助提示</h3>
    <label class="f">提示一（大範圍）</label><input type="text" data-f="hint1" value="${esc(p.hint1)}" placeholder="例：科學館區・3F">
    <label class="f">提示二（更精確）</label><input type="text" data-f="hint2" value="${esc(p.hint2)}" placeholder="例：管樂室外的欄杆">
    <h3>👁️ 視角</h3>
    <div class="grid2">
      <div><label class="f">距離</label><select data-f="vdist">${G.VIEW_DIST.map(([v, t]) => `<option value="${v}" ${p.view.dist === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="f">角度</label><select data-f="vangle">${G.VIEW_ANGLE.map(([v, t]) => `<option value="${v}" ${p.view.angle === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <label class="chk" style="margin-top:6px"><input type="checkbox" data-f="vodd" ${p.view.odd ? 'checked' : ''}> 奇特視角（倒置、局部、反光…）</label>
    <h3>🦶 拍攝站位</h3>
    <div class="row" style="align-items:flex-start">
      <div>
        <button class="btn sm ${S.mode === 'cam' ? 'on' : ''}" id="camPick">📷 在地圖上點站位</button>
        ${p.cam ? `<button class="btn sm ghost" id="camClear" style="margin-top:6px">清除站位</button><p class="small muted" style="margin-top:6px">鏡頭朝向：<b>${G.DIRS[p.cam.dir]}</b>（地圖上方＝北）</p>` : '<p class="small muted" style="margin-top:6px">還沒標。站位挑戰會用到。</p>'}
      </div>
      ${p.cam ? `<div class="dirs">${[7, 0, 1, 6, -1, 2, 5, 4, 3].map((d) => d < 0 ? '<span></span>' : `<button data-dir="${d}" class="${p.cam.dir === d ? 'on' : ''}" title="${G.DIRS[d]}">${['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][d]}</button>`).join('')}</div>` : ''}
    </div>
    <h3>🖼️ 揭曉照片（答對後顯示的全景，選填）</h3>
    <div class="photos">${p.reveal ? `<div class="ph">${imgTag(p.reveal, '', 'data-zoomrev="1"')}<button id="revRm">✕</button></div>` : ''}<div class="addph" id="addRev">＋<br>${p.reveal ? '換一張' : '加揭曉照片'}</div></div>
    <h3>🔍 現場觀察任務（選填）</h3>
    <input type="text" data-f="tq" value="${esc(p.task ? p.task.q : '')}" placeholder="題目，例：這塊牌子上寫的年份是？">
    <div class="grid2" style="margin-top:6px">
      <div><input type="text" data-f="ta" value="${esc(p.task ? p.task.a : '')}" placeholder="標準答案（開放作答可空白）"></div>
      <div class="row"><label class="chk small"><input type="checkbox" data-f="topen" ${p.task && p.task.open ? 'checked' : ''}> 開放作答</label>
        <span class="small">加分</span><input type="number" class="inline" style="width:64px" data-f="tbonus" value="${p.task ? p.task.bonus : 5}"></div>
    </div>
    <label class="f">出題者</label><input type="text" data-f="author" value="${esc(p.author)}">
    <label class="f">老師備註</label><input type="text" data-f="note" value="${esc(p.note)}">
    <div class="row" style="margin-top:16px"><button class="btn sm red" id="delPt">🗑 刪除這個點位</button></div>`;
  $('#edClose').onclick = () => { S.sel = null; renderMapTab(); };
  $$('[data-zoom]', el).forEach((im) => { im.onclick = () => zoomImg(im.src); });
  $$('[data-zoomrev]', el).forEach((im) => { im.onclick = () => zoomImg(im.src); });
  $$('[data-rm]', el).forEach((bt) => { bt.onclick = async () => { if (!(await confirmBox('移除這張照片？'))) return; p.photos.splice(+bt.dataset.rm, 1); Store.save(); renderEditor(); }; });
  $$('[data-main]', el).forEach((bt) => { bt.onclick = () => { const i = +bt.dataset.main; const [x] = p.photos.splice(i, 1); p.photos.unshift(x); Store.save(); renderEditor(); }; });
  $('#addPh').onclick = async () => {
    const files = await pickFile('image/*', true); if (!files.length) return;
    toast('照片壓縮上傳中…');
    try { for (const f of files) p.photos.push(await Store.uploadPhoto(f)); Store.save(); renderEditor(); toast('✅ 已加入照片'); } catch (e) { toast('上傳失敗：' + (e.code || e.message), true); }
  };
  $('#addRev').onclick = async () => {
    const [f] = await pickFile('image/*'); if (!f) return;
    try { p.reveal = await Store.uploadPhoto(f); Store.save(); renderEditor(); } catch (e) { toast('上傳失敗：' + (e.code || e.message), true); }
  };
  if ($('#revRm')) $('#revRm').onclick = () => { p.reveal = ''; Store.save(); renderEditor(); };
  $('#camPick').onclick = () => { S.mode = S.mode === 'cam' ? 'view' : 'cam'; renderMapTab(); };
  if ($('#camClear')) $('#camClear').onclick = () => { p.cam = null; Store.save(); renderMapTab(); };
  $$('[data-dir]', el).forEach((bt) => { bt.onclick = () => { p.cam.dir = +bt.dataset.dir; Store.save(); renderMapTab(); }; });
  $('#delPt').onclick = async () => { if (!(await confirmBox(`確定刪除第 ${p.no} 號點位？`, '刪除'))) return; delete S.bank.points[p.key]; S.sel = null; Store.save(); renderMapTab(); };
  $$('[data-f]', el).forEach((inp) => {
    inp.addEventListener('change', () => {
      const f = inp.dataset.f, v = inp.type === 'checkbox' ? inp.checked : inp.value;
      const redraw = applyField(p, f, v);
      Store.save();
      if (redraw) { const sc = $('#mapAScroll'); const t = [sc.scrollLeft, sc.scrollTop]; renderMapTab(); $('#mapAScroll').scrollLeft = t[0]; $('#mapAScroll').scrollTop = t[1]; }
    });
  });
}
function applyField(p, f, v) {
  switch (f) {
    case 'no': { const n = parseInt(v, 10); if (!(n > 0)) return true; const dup = pts().find((q) => q.no === n && q.key !== p.key); if (dup) toast(`⚠ 第 ${n} 號已經有點位了（${dup.name}），兩個點會同號`, true); if (p.accept.length === 1 && p.accept[0] === p.no) p.accept = [n]; p.no = n; return true; }
    case 'base': p.base = Math.max(1, parseInt(v, 10) || 10); return false;
    case 'accept': { const a = String(v).split(/[,，、\s]+/).map((x) => parseInt(x, 10)).filter((x) => x > 0); p.accept = a.length ? Array.from(new Set(a)) : [p.no]; return false; }
    case 'enabled': case 'teach': p[f] = !!v; return true;
    case 'zone': p.zone = v; return true;
    case 'vdist': p.view.dist = v; return false;
    case 'vangle': p.view.angle = v; return false;
    case 'vodd': p.view.odd = !!v; return false;
    case 'tq': case 'ta': case 'topen': case 'tbonus': {
      const t = p.task || { q: '', a: '', open: false, bonus: 5 };
      if (f === 'tq') t.q = v.trim(); if (f === 'ta') t.a = v.trim(); if (f === 'topen') t.open = !!v; if (f === 'tbonus') t.bonus = Math.max(0, parseInt(v, 10) || 0);
      p.task = t.q ? t : null; return false;
    }
    default: p[f] = String(v).trim(); return f === 'name';
  }
}

// ---------- 分頁二：點位清單 ----------
function filteredPoints() {
  const f = S.filter, q = f.q.trim();
  return pts().filter((p) => {
    if (f.zone && p.zone !== f.zone) return false;
    if (q && !(String(p.no) === q || p.name.includes(q) || p.hint1.includes(q) || p.hint2.includes(q))) return false;
    switch (f.flag) {
      case 'on': return p.enabled; case 'off': return !p.enabled; case 'teach': return p.teach;
      case 'noview': return !p.view.dist && !p.view.angle; case 'nocam': return !p.cam; case 'task': return !!p.task; case 'nophoto': return !p.photos.length;
      default: return true;
    }
  });
}
function renderListTab() {
  const b = S.bank, zm = zoneMap(), list = filteredPoints();
  [...S.checked].forEach((k) => { if (!b.points[k]) S.checked.delete(k); });
  $('#panel').innerHTML = `
  <div class="toolbar">
    <div class="tool-grp"><b>區域</b><select class="inline" id="fZone"><option value="">全部</option>${b.zones.map((z) => `<option value="${z.id}" ${S.filter.zone === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></div>
    <div class="tool-grp"><b>篩選</b><select class="inline" id="fFlag">${[['', '全部'], ['on', '啟用中'], ['off', '停用'], ['teach', '🤫 教學區鄰近'], ['noview', '還沒標視角'], ['nocam', '還沒標站位'], ['task', '有觀察任務'], ['nophoto', '沒有照片']].map(([v, t]) => `<option value="${v}" ${S.filter.flag === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="tool-grp"><b>搜尋</b><input type="text" class="inline" id="fQ" value="${esc(S.filter.q)}" placeholder="編號或名稱" style="width:160px"></div>
    <span class="small muted">共 ${list.length} 個</span>
  </div>
  <div class="toolbar" style="background:#fff">
    <div class="tool-grp"><b>勾選的 <span id="nChk">${S.checked.size}</span> 個 →</b>
      <select class="inline" id="bZone"><option value="">改區域…</option>${b.zones.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select>
      <button class="btn sm" data-batch="on">啟用</button><button class="btn sm" data-batch="off">停用</button>
      <button class="btn sm" data-batch="teach">標 🤫</button><button class="btn sm" data-batch="unteach">取消 🤫</button>
      <select class="inline" id="bDist"><option value="">標距離…</option>${G.VIEW_DIST.filter((x) => x[0]).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      <select class="inline" id="bAngle"><option value="">標角度…</option>${G.VIEW_ANGLE.filter((x) => x[0]).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
    </div>
  </div>
  <div style="max-height:70vh;overflow:auto;border:2px solid var(--line);border-radius:10px">
  <table class="list"><thead><tr><th><input type="checkbox" id="chkAll" ${list.length && list.every((p) => S.checked.has(p.key)) ? 'checked' : ''}></th><th>照片</th><th>編號</th><th>名稱</th><th>區域</th><th>答案</th><th>提示一</th><th>視角</th><th>狀態</th></tr></thead><tbody>
  ${list.map((p) => { const z = zm[p.zone]; return `<tr data-k="${p.key}" class="${S.checked.has(p.key) ? 'sel' : ''} ${p.enabled ? '' : 'off'}" style="cursor:pointer">
    <td><input type="checkbox" data-chk="${p.key}" ${S.checked.has(p.key) ? 'checked' : ''}></td>
    <td>${p.photos[0] ? imgTag(p.photos[0], 'thumb') : '<span class="chip red">無</span>'}</td>
    <td><b>${p.no}</b></td><td>${esc(p.name)}</td>
    <td>${z ? `<span class="chip" style="background:${z.color};color:#fff">${esc(z.name)}</span>` : '<span class="chip red">未分區</span>'}</td>
    <td>${p.accept.join('、')}</td><td class="small">${esc(p.hint1)}</td><td class="small">${esc(G.viewLabel(p.view)) || '<span class="muted">—</span>'}</td>
    <td>${p.enabled ? '' : '<span class="chip gray">停用</span>'} ${p.teach ? '<span class="chip red">🤫</span>' : ''} ${p.cam ? '<span class="chip teal">🦶</span>' : ''} ${p.task ? '<span class="chip blue">🔍</span>' : ''} ${p.photos.length > 1 ? `<span class="chip">${p.photos.length} 張</span>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>
  <p class="small muted" style="margin-top:8px">點一列可以到地圖上編輯那個點位。</p>`;
  const rerender = () => { const sc = $('#panel > div[style*="overflow"]'); const t = sc ? sc.scrollTop : 0; renderListTab(); const s2 = $('#panel > div[style*="overflow"]'); if (s2) s2.scrollTop = t; };
  $('#fZone').onchange = (e) => { S.filter.zone = e.target.value; renderListTab(); };
  $('#fFlag').onchange = (e) => { S.filter.flag = e.target.value; renderListTab(); };
  $('#fQ').oninput = (e) => { S.filter.q = e.target.value; clearTimeout(S._qt); S._qt = setTimeout(() => { renderListTab(); const i = $('#fQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
  $('#chkAll').onchange = (e) => { list.forEach((p) => e.target.checked ? S.checked.add(p.key) : S.checked.delete(p.key)); rerender(); };
  $$('[data-chk]').forEach((c) => { c.onclick = (e) => e.stopPropagation(); c.onchange = () => { c.checked ? S.checked.add(c.dataset.chk) : S.checked.delete(c.dataset.chk); c.closest('tr').classList.toggle('sel', c.checked); $('#nChk').textContent = S.checked.size; }; });
  $$('tbody tr').forEach((tr) => { tr.onclick = (e) => { if (e.target.closest('input')) return; S.sel = tr.dataset.k; S.tab = 'map'; S.mode = 'view'; LS.set('gps_tab', 'map'); render(); }; });
  const batch = (fn, msg) => { if (!S.checked.size) return toast('請先勾選點位', true); S.checked.forEach((k) => fn(b.points[k])); Store.save(); rerender(); toast(msg + `（${S.checked.size} 個）`); };
  $('#bZone').onchange = (e) => { const z = e.target.value; if (z) batch((p) => { p.zone = z; }, '已改區域'); };
  $('#bDist').onchange = (e) => { const v = e.target.value; if (v) batch((p) => { p.view.dist = v; }, '已標距離'); };
  $('#bAngle').onchange = (e) => { const v = e.target.value; if (v) batch((p) => { p.view.angle = v; }, '已標角度'); };
  $$('[data-batch]').forEach((bt) => {
    bt.onclick = () => {
      const t = bt.dataset.batch;
      batch((p) => { if (t === 'on') p.enabled = true; if (t === 'off') p.enabled = false; if (t === 'teach') p.teach = true; if (t === 'unteach') p.teach = false; }, '已更新');
    };
  });
}

// ---------- 分頁三：區域與禁行區 ----------
function renderZonesTab() {
  const b = S.bank, all = pts();
  const noZone = all.filter((p) => !b.zones.some((z) => z.id === p.zone));
  const inNg = all.filter((p) => G.inNoGo(b, p) && !p.teach);
  const cap = b.zones.reduce((s, z) => s + z.cap, 0);
  $('#panel').innerHTML = `
  <h2>🧩 區域</h2>
  <p class="lead">系統派題時會把同一批題目放在同一區，並優先派到「目前人最少的區域」。「同時最多幾組」是派題時的上限，人數超過就盡量不再派進來。</p>
  <table class="list" style="max-width:820px"><thead><tr><th>顏色</th><th>區域名稱</th><th>點位數</th><th>啟用</th><th>同時最多幾組</th><th></th></tr></thead><tbody>
  ${b.zones.map((z, i) => { const zp = all.filter((p) => p.zone === z.id); return `<tr>
    <td><input type="color" data-zc="${i}" value="${z.color}" style="width:42px;height:30px;border:none;background:none"></td>
    <td><input type="text" data-zn="${i}" value="${esc(z.name)}"></td>
    <td>${zp.length}</td><td>${zp.filter((p) => p.enabled).length}</td>
    <td><input type="number" data-zcap="${i}" value="${z.cap}" min="1" max="10" style="width:70px"></td>
    <td class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-zup="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm ghost" data-zdel="${i}">🗑</button></td></tr>`; }).join('')}
  </tbody></table>
  <div class="row" style="margin-top:10px"><button class="btn sm" id="zAdd">＋ 新增區域</button><span class="small muted">全部區域合計可容納 <b>${cap}</b> 組同時進行</span></div>
  ${noZone.length ? `<div class="alert red">有 ${noZone.length} 個點位沒有區域：${noZone.map((p) => p.no).join('、')}（到點位清單批次改區域）</div>` : ''}
  <h2 style="margin-top:26px">🚫 禁行區</h2>
  <p class="lead">學生地圖上會用紅色斜線標出，提醒「教學區請繞道」。到「🗺️ 地圖與點位」用「🚫 畫禁行區」拖曳拉框新增。地圖是平面的，所以一樓的點位落在框內不一定有問題。</p>
  <table class="list" style="max-width:820px"><thead><tr><th>名稱</th><th>框內的點位</th><th></th></tr></thead><tbody>
  ${b.noGo.map((r, i) => `<tr><td><input type="text" data-ngn="${i}" value="${esc(r.label)}"></td><td class="small">${all.filter((p) => G.inNoGo({ noGo: [r] }, p)).map((p) => p.no).join('、') || '—'}</td><td><button class="btn sm ghost" data-ngdel="${i}">🗑</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">還沒有禁行區</td></tr>'}
  </tbody></table>
  ${inNg.length ? `<div class="alert">這些點位在禁行區框內、但沒有標 🤫：${inNg.map((p) => `<b>${p.no}</b> ${esc(p.name)}`).join('、')}。如果它們在一樓或不會吵到上課，可以不用理會。</div>` : ''}`;
  $$('[data-zc]').forEach((i) => { i.onchange = () => { b.zones[+i.dataset.zc].color = i.value; Store.save(); }; });
  $$('[data-zn]').forEach((i) => { i.onchange = () => { b.zones[+i.dataset.zn].name = i.value.trim() || '未命名區域'; Store.save(); }; });
  $$('[data-zcap]').forEach((i) => { i.onchange = () => { b.zones[+i.dataset.zcap].cap = Math.max(1, Math.min(10, parseInt(i.value, 10) || 1)); Store.save(); renderZonesTab(); }; });
  $$('[data-zup]').forEach((bt) => { bt.onclick = () => { const i = +bt.dataset.zup; [b.zones[i - 1], b.zones[i]] = [b.zones[i], b.zones[i - 1]]; Store.save(); renderZonesTab(); }; });
  $$('[data-zdel]').forEach((bt) => {
    bt.onclick = async () => {
      const z = b.zones[+bt.dataset.zdel]; const n = all.filter((p) => p.zone === z.id).length;
      if (b.zones.length <= 1) return toast('至少要保留一個區域', true);
      if (!(await confirmBox(n ? `「${z.name}」還有 ${n} 個點位，刪除後它們會變成「未分區」，要繼續嗎？` : `刪除區域「${z.name}」？`, '刪除'))) return;
      b.zones.splice(+bt.dataset.zdel, 1); Store.save(); renderZonesTab();
    };
  });
  $('#zAdd').onclick = () => { b.zones.push({ id: 'z' + G.rid(3), name: '新區域', color: G.ZONE_COLORS[b.zones.length % G.ZONE_COLORS.length], cap: 2 }); Store.save(); renderZonesTab(); };
  $$('[data-ngn]').forEach((i) => { i.onchange = () => { b.noGo[+i.dataset.ngn].label = i.value.trim() || '教學區'; Store.save(); }; });
  $$('[data-ngdel]').forEach((bt) => { bt.onclick = async () => { if (!(await confirmBox('刪除這個禁行區？'))) return; b.noGo.splice(+bt.dataset.ngdel, 1); Store.save(); renderZonesTab(); }; });
}

// ---------- 分頁四：紙本版 ----------
function renderPaperTab() {
  const P = S.paper, b = S.bank;
  if (!P.seed) P.seed = Math.floor(Math.random() * 1e9);
  const pool = pts().filter((p) => p.photos.length && (!P.onlyEnabled || p.enabled) && (!P.noTeach || !p.teach));
  $('#panel').innerHTML = `
  <h2>🖨️ 紙本版學習單</h2>
  <p class="lead">從題庫自動組出 N 份不同的學習單（沒網路、下雨或想用紙本時用）。每份盡量「一區一個點」分散全校，各份的第一個點落在不同區域，減少擠在一起；照片順序自動打亂，最後一頁是答案表。</p>
  <div class="toolbar">
    <div class="tool-grp"><b>份數</b><input type="number" class="inline" id="pN" value="${P.n}" min="1" max="30" style="width:70px"></div>
    <div class="tool-grp"><b>每份幾個點</b><input type="number" class="inline" id="pK" value="${P.k}" min="1" max="14" style="width:70px"></div>
    <label class="chk small"><input type="checkbox" id="pOn" ${P.onlyEnabled ? 'checked' : ''}> 只用啟用中的點</label>
    <label class="chk small"><input type="checkbox" id="pNt" ${P.noTeach ? 'checked' : ''}> 排除 🤫 教學區鄰近</label>
    <button class="btn primary" id="pGen">🎲 ${P.versions ? '重新組題' : '組題'}</button>
    ${P.versions ? '<button class="btn ink" id="pPrint">🖨️ 列印（A4 橫式）</button>' : ''}
  </div>
  <p class="small muted">可用點位 ${pool.length} 個；${P.n} 份 × ${P.k} 點 = ${P.n * P.k} 個${P.n * P.k > pool.length ? `，<b style="color:var(--red)">超過可用點位，會有點位重複出現在不同份</b>` : '，每個點只會出現在一份'}。每份最多 14 個點（版面放得下的數量）。</p>
  <div id="pvSummary"></div>
  <div class="pv-wrap ${P.versions ? '' : 'hidden'}" id="pv"></div>`;
  const read = () => { P.n = Math.max(1, Math.min(30, parseInt($('#pN').value, 10) || 10)); P.k = Math.max(1, Math.min(14, parseInt($('#pK').value, 10) || 13)); P.onlyEnabled = $('#pOn').checked; P.noTeach = $('#pNt').checked; };
  ['#pN', '#pK', '#pOn', '#pNt'].forEach((s) => { $(s).onchange = () => { read(); P.versions = null; renderPaperTab(); }; });
  $('#pGen').onclick = async () => { read(); P.seed = Math.floor(Math.random() * 1e9); P.versions = G.makeVersions(b, { n: P.n, k: P.k, onlyEnabled: P.onlyEnabled, noTeach: P.noTeach, seed: P.seed }); await renderPaperPreview(); renderPaperTab(); };
  if ($('#pPrint')) $('#pPrint').onclick = () => printPaper();
  if (P.versions) { $('#pv').innerHTML = P._html || ''; renderVersionSummary(); }
}
function renderVersionSummary() {
  const zm = zoneMap(), V = S.paper.versions;
  $('#pvSummary').innerHTML = `<table class="list" style="margin:8px 0 14px"><thead><tr><th>份</th><th>第一站區域</th><th>點位（依地圖編號）</th><th>涵蓋區域數</th></tr></thead><tbody>
  ${V.map((v, i) => `<tr><td><b>${i + 1}</b></td><td>${esc((zm[v.points[0] && v.points[0].zone] || {}).name || '')}</td><td>${v.points.map((p) => p.no).sort((a, b) => a - b).join('、')}</td><td>${new Set(v.points.map((p) => p.zone)).size}</td></tr>`).join('')}</tbody></table>`;
}
async function renderPaperPreview() {
  const b = S.bank, V = S.paper.versions;
  const refs = new Set(); V.forEach((v) => v.points.forEach((p) => refs.add(p.photos[0])));
  await Promise.all([...refs].map((r) => G.loadPhoto(r).catch(() => '')));
  // 紙本地圖裁掉上方的大標題與下方空白（只保留有點位的範圍）
  const ys = Object.values(b.points).map((p) => p.y);
  const top = Math.max(0, Math.min(12.5, Math.min(...ys) - 4)), bot = Math.min(100, Math.max(88, Math.max(...ys) + 4)), span = (bot - top) / 100;
  const ar = `${b.map.w}/${(b.map.h * span).toFixed(1)}`;
  const sheets = V.map((v, i) => `
  <div class="sheet">
    <div class="sh-head"><b>🧭 遺落的地點</b><span>第 ${i + 1} 組</span><span style="flex:1"></span><span>請到地圖上的地點，找到對應的照片景象，並在照片旁寫出地圖上的地點編號</span></div>
    <div class="sh-body">
      <div class="sh-map" style="--ar:${ar}"><div class="inner" style="top:${(-top / span).toFixed(3)}%;height:${(100 / span).toFixed(3)}%"><img src="${esc(G.photoURL(b.map.src))}">${v.points.map((p) => `<div class="ring" style="left:${p.x}%;top:${p.y}%">${p.no}</div>`).join('')}</div></div>
      <div class="sh-photos" style="grid-template-rows:repeat(${Math.ceil(v.photoOrder.length / 2)},1fr)">${v.photoOrder.map((p) => `<div class="c"><img src="${esc(G.photoURL(p.photos[0]))}"><div class="ln"></div></div>`).join('')}</div>
    </div>
  </div>`).join('');
  const cols = 5, rowsPer = Math.max(...V.map((v) => v.photoOrder.length));
  let ans = '';
  for (let s = 0; s < V.length; s += cols) {
    const grp = V.slice(s, s + cols);
    ans += `<table class="ans" style="margin-bottom:4mm"><tr>${grp.map((_, j) => `<th colspan="2">第 ${s + j + 1} 組</th>`).join('')}</tr>`;
    for (let r = 0; r < Math.ceil(rowsPer / 2); r++) {
      ans += '<tr>' + grp.map((v) => [0, 1].map((c) => { const p = v.photoOrder[r * 2 + c]; const alt = p ? p.accept.filter((x) => x !== p.no) : []; return `<td>${p ? p.no + (alt.length ? `(${alt.join('/')})` : '') : ''}</td>`; }).join('')).join('') + '</tr>';
    }
    ans += '</table>';
  }
  const ansSheet = `<div class="sheet"><div class="sh-head"><b>🧭 遺落的地點｜各組答案</b><span>（依照片順序：左→右、上→下）</span></div>${ans}</div>`;
  S.paper._html = sheets + ansSheet;
}
function printPaper() {
  const root = $('#printRoot'); root.innerHTML = S.paper._html || '';
  const imgs = $$('img', root);
  Promise.all(imgs.map((im) => im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; }))).then(() => setTimeout(() => window.print(), 100));
}

// ---------- 分頁五：備份與說明 ----------
function renderBackupTab() {
  const b = S.bank;
  $('#panel').innerHTML = `
  <h2>💾 備份</h2>
  <div class="card"><label class="f" style="margin-top:0">題庫名稱</label><div class="row"><input type="text" id="bkName" value="${esc(b.name)}" style="max-width:420px"></div></div>
  <div class="card"><h3 style="margin-top:0">⬇️ 下載備份</h3><p class="small muted">整個題庫（含你自己上傳的照片）存成一個 .json 檔，放在電腦裡保管。網站內建的 130 張照片不會重複打包。</p>
    <button class="btn primary" id="bkDown" style="margin-top:8px">下載題庫備份</button></div>
  <div class="card"><h3 style="margin-top:0">⬆️ 還原／匯入</h3><p class="small muted">用備份檔取代目前題庫，或匯入成另一個新題庫（例如給其他校區）。</p>
    <div class="row" style="margin-top:8px"><button class="btn" id="bkReplace">用檔案取代目前題庫</button><button class="btn" id="bkNew">匯入成新題庫</button></div></div>
  <div class="card"><h3 style="margin-top:0">🗑 刪除題庫</h3><p class="small muted">刪除後無法復原，請先下載備份。</p><button class="btn sm red" id="bkDel" style="margin-top:8px">刪除「${esc(b.name)}」</button></div>
  <h2 style="margin-top:26px">❓ 說明</h2>
  <div class="card small">
    <p><b>這個後台目前可以做：</b>管理題庫（照片、地圖位置、答案、提示、視角、拍攝站位、觀察任務）、分區域與畫禁行區、自動組紙本版學習單。</p>
    <p style="margin-top:6px"><b>下一階段：</b>學生手機闖關、系統自動派題（挑人最少的區域）、💡 求助提示、🙋 PASS 申請、老師戰況看板。</p>
    <p style="margin-top:6px"><b>小技巧：</b>點位清單可以一次勾很多點，批次改區域、標視角、標 🤫；地圖分頁的「✋ 移動」可以直接拖曳編號微調位置。</p>
    <p style="margin-top:6px"><b>照片：</b>上傳時會自動縮小到最長邊 800px，手機照片直接選就好。</p>
  </div>`;
  $('#bkName').onchange = (e) => { b.name = e.target.value.trim() || '未命名題庫'; Store.save(); render(); };
  $('#bkDown').onclick = async () => {
    const refs = new Set(); Object.values(b.points).forEach((p) => { p.photos.forEach((r) => refs.add(r)); if (p.reveal) refs.add(p.reveal); });
    const photoData = {};
    for (const r of refs) if (r.startsWith('f:')) { const d = await G.loadPhoto(r); if (d) photoData[r.slice(2)] = d; }
    const name = `遺落的地點_${b.name}_${new Date().toISOString().slice(0, 10)}.json`;
    download(name, JSON.stringify({ app: 'lost-places', exportedAt: Date.now(), bank: G.packBank(b), photoData }, null, 1));
    toast('已下載備份');
  };
  $('#bkReplace').onclick = () => importBank(false);
  $('#bkNew').onclick = () => importBank(true);
  $('#bkDel').onclick = async () => {
    if (!(await confirmBox(`確定刪除題庫「${b.name}」？無法復原。`, '刪除'))) return;
    try {
      await FB.remove('orienteering/banks/' + S.bankId); await FB.remove('orienteering/owners/' + S.user.uid + '/' + S.bankId);
      delete S.banks[S.bankId]; S.bank = null; S.bankId = null; LS.set('gps_bank', '');
      const next = Object.keys(S.banks)[0]; if (next) await openBank(next); else render();
      toast('已刪除');
    } catch (e) { toast('刪除失敗：' + (e.code || e.message), true); }
  };
}

// ---------- 啟動 ----------
async function openBankSilently(id) { const b = await Store.load(id); if (b) { S.bankId = id; S.bank = b; LS.set('gps_bank', id); } }
window.TT = { S, Store, LS, $, $$, esc, toast, modal, confirmBox, zoomImg, imgTag, download, render, pts, openBankSilently };
const L = await import('./live.js?v=20261012d');
window.addEventListener('beforeunload', (e) => {
  if (Store._t && $('#saveState') && $('#saveState').textContent.includes('尚未')) { Store.flush(); e.preventDefault(); e.returnValue = ''; }
  if (L.isRefereeing()) { e.preventDefault(); e.returnValue = ''; }
});
if (!window.FB) renderLogin('雲端服務載入失敗（可能沒有網路），請重新整理。');
else FB.onUser((u) => { if (u) enter(u); else { S.user = null; S.bank = null; renderLogin(); } });
