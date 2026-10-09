/* =====================================================================
   🪑 座位大作戰：老師後台（app.js）
   分頁：班級資料｜教室地圖｜幹部｜打掃｜秘密規則｜換座位｜座位表
   投影舞台（抽籤儀式）與 A4 座位表也在這裡
   ===================================================================== */
const SC = window.SeatCore;
const { key, pad2, uid, toArr, seatsText } = SC;

/* ---------------- 小工具 ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 私密視窗等情況 */ } }
};
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), err ? 4200 : 2400);
}
function modal(html, opts = {}) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg && !opts.sticky) close(); });
  $$('[data-close]', bg).forEach((b) => b.addEventListener('click', close));
  if (opts.mount) opts.mount(bg.firstElementChild, close);
  return close;
}
function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const readSheet = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => { try { const wb = XLSX.read(fr.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })); } catch (e) { rej(e); } };
  fr.onerror = rej; fr.readAsArrayBuffer(file);
});
const pickFile = (accept) => new Promise((res) => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = () => res(i.files[0] || null); i.click();
});

/* ---------------- 儲存：雲端（Firebase）或本機 ---------------- */
const Store = {
  mode: 'local', uid: null, email: '',
  async list() {
    if (this.mode === 'cloud') {
      const idx = (await FB.get('seating/owners/' + this.uid)) || {};
      return Object.entries(idx).map(([id, v]) => ({ id, name: v.name || '', updatedAt: v.updatedAt || 0 }));
    }
    const all = LS.get('seating3_local', { classes: {} }).classes;
    return Object.values(all).map((c) => ({ id: c.id, name: c.name, updatedAt: c.updatedAt }));
  },
  async load(id) {
    if (this.mode === 'cloud') { const v = await FB.get('seating/classes/' + id); return v ? SC.normalizeClass(v) : null; }
    const v = LS.get('seating3_local', { classes: {} }).classes[id];
    return v ? SC.normalizeClass(v) : null;
  },
  async save(cls) {
    const obj = SC.sanitize(cls);
    LS.set('seating3_cache_' + cls.id, obj);              // 雲端失敗時的保險
    if (this.mode === 'cloud') {
      obj.owner = this.uid;
      await FB.set('seating/classes/' + cls.id, obj);
      await FB.set('seating/owners/' + this.uid + '/' + cls.id, { name: cls.name || '', updatedAt: cls.updatedAt });
      return;
    }
    const all = LS.get('seating3_local', { classes: {} }); all.classes[cls.id] = obj; LS.set('seating3_local', all);
  },
  async remove(id) {
    if (this.mode === 'cloud') { await FB.remove('seating/classes/' + id); await FB.remove('seating/owners/' + this.uid + '/' + id); }
    else { const all = LS.get('seating3_local', { classes: {} }); delete all.classes[id]; LS.set('seating3_local', all); }
    try { localStorage.removeItem('seating3_cache_' + id); } catch (e) { }
  }
};

/* ---------------- 狀態 ---------------- */
const S = {
  classes: [], cls: null, tab: LS.get('seating3_tab', 'info'),
  roundId: null, roundMode: 'lock', swapSel: null,
  paint: 's', editView: 'teacher', ruleDraft: { type: 'apart', mode: 'rows', list: [] },
  saveState: '', saveErr: '', rosterDraft: null, cloudErr: '',
  privacy: LS.get('seating3_privacy', false),           // 🙈 上課模式：藏起秘密規則與相關提醒
  stageOnly: /^#stage/.test(location.hash)               // 📺 投影專用連結：直接進投影舞台、不顯示後台
};
const isGame = () => !C() || C().settings.gameMode !== 'plain';
let saveTimer = null;
function touch(rerender) {
  if (!S.cls) return;
  S.cls.updatedAt = Date.now();
  S.saveState = '儲存中…'; S.saveErr = ''; paintSave();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await Store.save(S.cls); S.saveState = (Store.mode === 'cloud' ? '☁️ 已存到雲端 ' : '💾 已存在本機 ') + new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }); }
    catch (e) { console.error(e); S.saveErr = '⚠️ 雲端儲存失敗（' + (e.code || e.message) + '），資料暫存在這台裝置'; }
    paintSave();
    const sel = $('#clsSel'); if (sel) { const o = sel.querySelector(`option[value="${S.cls.id}"]`); if (o) o.textContent = S.cls.name ? S.cls.name + ' 班' : '（未命名班級）'; }
  }, 600);
  if (rerender) render();
}
function paintSave() { const el = $('#saveState'); if (el) { el.textContent = S.saveErr || S.saveState; el.classList.toggle('err', !!S.saveErr); } }

const C = () => S.cls;
const stu = (seat) => C().roster.find((s) => s.seat === Number(seat));
const stuLabel = (seat) => { const s = stu(seat); return s ? `${pad2(s.seat)} ${s.name}` : `${pad2(seat)}（名單外）`; };
const round = () => C() && C().rounds.find((r) => r.id === S.roundId) || null;
const rosterSeats = () => C().roster.map((s) => s.seat);
function ruleText(r) {
  if (r.type === 'apart') return `🚫 ${stuLabel(r.a)} 與 ${stuLabel(r.b)} 不相鄰`;
  const list = toArr(r.list);
  const where = r.mode === 'rows' ? '第 ' + list.map((x) => Number(x) + 1).sort((a, b) => a - b).join('、') + ' 排'
    : r.mode === 'cols' ? '左起第 ' + list.map((x) => Number(x) + 1).sort((a, b) => a - b).join('、') + ' 列'
      : `指定的 ${list.length} 個座位`;
  return `📍 ${stuLabel(r.who)} 只能坐在 ${where}`;
}
function studentOptions(selected, opts = {}) {
  return `<option value="">${opts.blank || '（選擇學生）'}</option>` + C().roster.map((s) =>
    `<option value="${s.seat}" ${Number(selected) === s.seat ? 'selected' : ''}>${pad2(s.seat)} ${esc(s.name)}${opts.note ? esc(opts.note(s.seat)) : ''}</option>`).join('');
}

/* ---------------- 啟動 ---------------- */
async function enterCloud(user) {
  if (Store.mode === 'cloud' && Store.uid === user.uid) return;
  Store.mode = 'cloud'; Store.uid = user.uid; Store.email = user.email || '';
  await loadClasses();
}
async function boot() {
  const pref = LS.get('seating3_mode', '');
  if (window.FB) {
    let first = true;
    FB.onUser((user) => {
      if (user && LS.get('seating3_mode', '') !== 'local') enterCloud(user);
      else if (!user && first && LS.get('seating3_mode', '') !== 'local') renderLogin();
      first = false;
    });
  }
  if (pref === 'local') return enterLocal();
  if (!window.FB) return renderLogin('雲端服務載入失敗（可能沒有網路），可以先用本機模式。');
}
async function enterLocal() { Store.mode = 'local'; LS.set('seating3_mode', 'local'); await loadClasses(); }
async function loadClasses() {
  S.cloudErr = '';
  const want = (location.hash.match(/^#stage=(.+)$/) || [])[1];
  if (want) LS.set('seating3_last', decodeURIComponent(want));
  try { S.classes = await Store.list(); }
  catch (e) { console.error(e); S.classes = []; S.cloudErr = e.code || e.message || String(e); }
  S.classes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const last = LS.get('seating3_last', '');
  const pick = S.classes.find((c) => c.id === last) || S.classes[0];
  if (pick) await openClass(pick.id); else { S.cls = null; render(); }
}
async function openClass(id) {
  let c = null;
  try { c = await Store.load(id); } catch (e) { console.error(e); S.cloudErr = e.code || e.message; }
  if (!c) { const cache = LS.get('seating3_cache_' + id, null); if (cache) { c = SC.normalizeClass(cache); toast('雲端讀取失敗，先使用這台裝置上的暫存資料', true); } }
  S.cls = c; LS.set('seating3_last', id);
  S.roundId = c && (c.currentRound && c.rounds.find((r) => r.id === c.currentRound) ? c.currentRound : (c.rounds[c.rounds.length - 1] || {}).id) || null;
  S.rosterDraft = null; S.swapSel = null;
  S.saveState = c ? (Store.mode === 'cloud' ? '☁️ 雲端' : '💾 本機') : '';
  render();
  if (S.stageOnly && !S.stageAuto && round()) { S.stageAuto = true; openStage(); }
}

/* ---------- 📺 投影專用連結的待機畫面（不顯示任何後台內容） ---------- */
function renderStandby() {
  const c = C(), rd = round();
  $('#app').innerHTML = `<div id="standby" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(ellipse at top,#2b3a60 0%,#141b2e 70%);color:#fff;text-align:center;padding:20px">
    <div style="font-family:'Bebas Neue',sans-serif;letter-spacing:.25em;color:var(--gold)">SEAT AUCTION</div>
    <div style="font-family:'Noto Serif TC',serif;font-weight:900;font-size:clamp(32px,6vw,64px)">🪑 座位大作戰</div>
    <div style="font-size:1.3em">${c ? esc(c.name) + ' 班' : ''}${rd ? '｜' + esc(rd.title) : ''}</div>
    ${!c ? '<p>找不到班級資料，請確認連結是否正確。</p>' : !rd ? '<p>這個班級還沒有換座位回合。</p>' : rd.assign ? '<p>✅ 本回合已分配完成</p>' : '<p>準備好了就開始吧！</p>'}
    ${rd ? '<button class="st-btn" data-act="standbyStage">🎬 開啟投影舞台</button>' : ''}
    <button class="st-btn ghost" data-act="standbyBack" style="margin-top:30px;font-size:.8em">回後台</button>
  </div>`;
}

/* ---------- 另一個分頁（例如投影用的分頁）改過資料時，回到這個分頁就自動換成最新版 ---------- */
let refreshing = false;
async function refreshIfNewer() {
  if (!C() || refreshing || S.saveState === '儲存中…' || ST.busy) return;
  refreshing = true;
  try {
    const fresh = await Store.load(C().id);
    if (fresh && (fresh.updatedAt || 0) > (C().updatedAt || 0)) {
      const keepRound = S.roundId;
      S.cls = fresh;
      if (!fresh.rounds.find((r) => r.id === keepRound)) S.roundId = fresh.currentRound || (fresh.rounds[fresh.rounds.length - 1] || {}).id || null;
      if ($('#stage')) paintStage(); else if (!$('.modal-bg')) render();
    }
  } catch (e) { /* 網路斷線時略過 */ }
  refreshing = false;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshIfNewer(); });
window.addEventListener('focus', refreshIfNewer);
window.addEventListener('storage', (e) => { if (e.key === 'seating3_local' && Store.mode === 'local') refreshIfNewer(); });

/* ---------------- 登入畫面 ---------------- */
function renderLogin(msg) {
  $('#app').innerHTML = `
  <div class="login">
    <div class="en">SEAT AUCTION · TEACHER</div>
    <h1>🪑 座位大作戰</h1>
    <p class="muted" style="margin-bottom:14px">老師後台登入（座位系統專用帳號）</p>
    ${msg ? `<div class="alert red">${esc(msg)}</div>` : ''}
    ${window.FB ? `
    <label class="f">Email</label><input type="email" id="lgEmail" autocomplete="username">
    <label class="f">密碼</label><input type="password" id="lgPw" autocomplete="current-password">
    <div class="row" style="margin-top:16px"><button class="btn primary" data-act="login">登入</button>
      <button class="btn ghost sm" data-act="forgot">忘記密碼</button></div>
    <hr style="border:none;border-top:1.5px dashed var(--line);margin:20px 0">` : ''}
    <p class="small muted">還沒有帳號，或只想先試用？</p>
    <button class="btn sm" data-act="useLocal" style="margin-top:6px">💾 用本機模式（資料只存在這台裝置）</button>
    <p class="small" style="margin-top:18px"><a href="../../index.html">🏠 回事務所首頁</a></p>
  </div>`;
  const pw = $('#lgPw'); if (pw) pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') act.login(); });
}

/* ---------------- 主畫面 ---------------- */
const TABS = [
  ['info', '📋 班級資料'], ['map', '🗺️ 教室地圖'], ['cadres', '🎖️ 幹部'], ['cleaning', '🧹 打掃'],
  ['rules', '🔒 秘密規則'], ['round', '🎲 換座位'], ['print', '🖨️ 座位表']
];
function visibleTabs() { return TABS.filter(([k]) => !(S.privacy && k === 'rules')); }
function render() {
  const cls = C();
  if (S.stageOnly) return renderStandby();
  if (S.privacy && S.tab === 'rules') S.tab = 'info';
  const top = `
  <header class="topbar">
    <div class="brand">🪑 座位大作戰<small>SEAT AUCTION</small></div>
    <select id="clsSel" title="切換班級">${S.classes.map((c) => `<option value="${c.id}" ${cls && c.id === cls.id ? 'selected' : ''}>${c.name ? esc(c.name) + ' 班' : '（未命名班級）'}</option>`).join('')}${!S.classes.length ? '<option>（尚無班級）</option>' : ''}</select>
    <button class="tb-btn" data-act="newClass">➕ 新增班級</button>
    <span class="save-state" id="saveState"></span>
    <span class="spacer"></span>
    ${cls ? `<button class="tb-btn" data-act="privacy" title="上課時開啟：藏起不想讓學生看到的設定">${S.privacy ? '🙈 上課模式：開' : '👀 上課模式：關'}</button>` : ''}
    <span class="save-state">${Store.mode === 'cloud' ? '👤 ' + esc(Store.email) : '💾 本機模式'}</span>
    <button class="tb-btn" data-act="logout">${Store.mode === 'cloud' ? '登出' : '切換到登入'}</button>
    <a class="home" href="../../index.html">🏠 回事務所首頁</a>
  </header>`;
  if (!cls) {
    $('#app').innerHTML = top + `<div class="panel" style="margin-top:24px">
      ${S.cloudErr ? cloudErrHTML() : ''}
      <h2>歡迎來到座位大作戰 👋</h2><p class="lead">先建立一個班級，接著設定名單、教室地圖、幹部與打掃，之後每次換座位都開一個新回合。</p>
      <button class="btn primary" data-act="newClass">➕ 建立第一個班級</button></div>`;
    paintSave(); return;
  }
  $('#app').innerHTML = top + `
  <nav class="tabs">${visibleTabs().map(([k, t]) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${t}</button>`).join('')}</nav>
  <main class="panel" id="panel">${S.cloudErr ? cloudErrHTML() : ''}${(TABV[S.tab] || TABV.info)()}</main>`;
  paintSave();
  afterRender();
}
function cloudErrHTML() {
  return `<div class="alert red">⚠️ 讀取雲端資料失敗（${esc(S.cloudErr)}）。如果是第一次使用，可能是 Firebase 安全規則還沒貼上「seating」這一段，請依開發說明貼上規則後重新整理。</div>`;
}
function afterRender() {
  $$('.sheet-holder[data-auto]').forEach((h) => mountPreview(h));
  if (S.tab === 'map') bindPaint();
}

/* =====================================================================
   教室地圖（螢幕版）
   ===================================================================== */
const SIDE_NAME = { front: '前方（講台側）', back: '後方', left: '左側', right: '右側' };
const MARK_NAME = { door: '🚪 門', board: '📌 布告欄', desk: '🎓 講桌', text: '🏷️ 文字' };
function mapHTML(layout, o = {}) {
  const V = SC.viewOf(layout, o.view || 'teacher'), R = layout.rows, Cc = layout.cols;
  const cells = [];
  V.grid.forEach((row, dr) => row.forEach((k, dc) => {
    const t = SC.cellType(layout, k);
    const c = o.cell ? o.cell(k, t) : {};
    cells.push(`<div class="cell ${t === 's' ? '' : t} ${c.cls || ''}" data-k="${k}" ${o.act ? `data-act="${o.act}"` : ''} style="grid-row:${dr + 2};grid-column:${dc + 2}">${c.html || ''}</div>`);
  }));
  const marks = toArr(layout.marks).map((m) => {
    const sd = V.side(m), st = V.start(m);
    const pos = sd === 'top' || sd === 'bottom'
      ? `grid-row:${sd === 'top' ? 1 : R + 2};grid-column:${st + 2} / span ${m.span || 1}`
      : `grid-row:${st + 2};grid-column:${sd === 'left' ? 1 : Cc + 2}`;
    const vertical = (sd === 'left' || sd === 'right');
    return `<div class="mark ${vertical ? 'door' : m.type}" style="${pos}">${esc(m.label || '')}</div>`;
  }).join('');
  return `<div class="cmap" ${o.id ? `id="${o.id}"` : ''} style="grid-template-columns:28px repeat(${Cc},var(--cw)) 28px;grid-template-rows:auto repeat(${R},var(--ch)) auto;${o.style || ''}">${marks}${cells.join('')}</div>`;
}

/* =====================================================================
   分頁內容
   ===================================================================== */
const TABV = {};

/* ---------- 📋 班級資料 ---------- */
TABV.info = () => {
  const c = C(), d = S.rosterDraft;
  return `
  <div class="cols">
    <div>
      <h2>📋 班級資料</h2>
      <p class="lead">這些資料整學期共用；每次換座位會自動沿用。</p>
      <div class="card">
        <label class="f">班級名稱</label><input type="text" data-bind="name" value="${esc(c.name)}" placeholder="例如：309">
        <label class="f">導師稱謂（印在座位表右上角）</label><input type="text" data-bind="teacherTitle" value="${esc(c.teacherTitle)}" placeholder="例如：巫昶昕 老師">
        <label class="f">座位表底部備註</label><textarea data-bind="settings.note" rows="3">${esc(c.settings.note)}</textarea>
        <p class="small muted">每次換座位設定的「適用期間」會自動接在備註後面。</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">🎮 遊戲化模式</h3>
        <div class="seg" style="margin:4px 0 8px">
          <button class="${isGame() ? 'on' : ''}" data-act="gameMode" data-v="game">🎮 開：暗標換座位</button>
          <button class="${!isGame() ? 'on' : ''}" data-act="gameMode" data-v="plain">🪑 關：一般換座位</button>
        </div>
        <p class="small muted">${isGame() ? '學生用王牌、簽名卡、Mana 幣等資源投標座位，得標者先鎖定，其餘同學抽籤分配。（學生線上暗標頁會在第二階段加入）' : '不使用暗標：老師可以先指定部分同學的座位，其餘同學抽籤分配。介面不會出現暗標、得標等遊戲用語。'}</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">🗄️ 備份與還原</h3>
        <p class="small muted">建議每學期下載一份備份檔，萬一雲端出問題也能救回來。</p>
        <div class="row" style="margin-top:8px">
          <button class="btn sm" data-act="backup">⬇️ 下載備份（JSON）</button>
          <button class="btn sm" data-act="restore">⬆️ 用備份檔還原這個班級</button>
          <span class="spacer"></span>
          <button class="btn sm red" data-act="deleteClass">🗑️ 刪除這個班級</button>
        </div>
      </div>
    </div>
    <div>
      <h2>👥 學生名單 <span class="chip teal">${c.roster.length} 人</span></h2>
      <p class="lead">欄位：<b>座號、姓名、學號</b>${isGame() ? '（之後學生線上暗標時，三項都對才能投標）' : '（不使用暗標時，學號可以先空著）'}。</p>
      <div class="card">
        <div class="row">
          <button class="btn sm primary" data-act="rosterFile">📄 上傳 Excel</button>
          <button class="btn sm ghost" data-act="rosterSample">下載名單範例</button>
        </div>
        <label class="f">或直接貼上（每行：座號 姓名 學號，用空白或 Tab 隔開；可直接從 Excel 複製貼上）</label>
        <textarea id="rosterText" rows="5" placeholder="1 王宥翎 1130101&#10;2 李○○ 1130102"></textarea>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="rosterPaste">檢查貼上的名單</button></div>
        ${d ? rosterDraftHTML(d) : ''}
      </div>
      ${c.roster.length ? `<div class="card" style="max-height:420px;overflow:auto">
        <table class="list"><thead><tr><th>座號</th><th>姓名</th><th>學號</th></tr></thead><tbody>
        ${c.roster.map((s) => `<tr><td>${pad2(s.seat)}</td><td>${esc(s.name)}</td><td>${esc(s.sid) || (isGame() ? '<span class="chip red">缺學號</span>' : '<span class="muted">—</span>')}</td></tr>`).join('')}
        </tbody></table></div>` : ''}
    </div>
  </div>`;
};
function rosterDraftHTML(d) {
  const old = C().roster, oldMap = {}; old.forEach((s) => { oldMap[s.seat] = s; });
  const newMap = {}; d.students.forEach((s) => { newMap[s.seat] = s; });
  const added = d.students.filter((s) => !oldMap[s.seat]), removed = old.filter((s) => !newMap[s.seat]);
  const renamed = d.students.filter((s) => oldMap[s.seat] && oldMap[s.seat].name !== s.name);
  return `<div class="alert ${d.errors.length ? 'red' : 'teal'}" style="margin-top:12px">
    <b>讀到 ${d.students.length} 位學生</b>
    ${d.errors.length ? '<ul style="margin:6px 0 0 18px">' + d.errors.map((e) => `<li>${esc(e)}</li>`).join('') + '</ul>' : ''}
    ${old.length ? `<div class="small" style="margin-top:6px">和目前名單比較：新增 ${added.length} 人、移除 ${removed.length} 人、姓名變更 ${renamed.length} 人
      ${removed.length ? `<br>移除：${removed.map((s) => esc(pad2(s.seat) + ' ' + s.name)).join('、')}（幹部、打掃、秘密規則、鎖定座位裡的這些人會一併清掉）` : ''}</div>` : ''}
    <div class="row" style="margin-top:10px"><button class="btn sm primary" data-act="rosterApply" ${d.students.length ? '' : 'disabled'}>✅ 套用這份名單</button>
    <button class="btn sm ghost" data-act="rosterCancel">取消</button></div></div>`;
}

/* ---------- 🗺️ 教室地圖 ---------- */
TABV.map = () => {
  const L = C().layout;
  const seats = SC.seatKeys(L).length;
  return `
  <h2>🗺️ 教室地圖</h2>
  <p class="lead">這是班級的「基本地圖」。每次開新回合會複製一份，回合裡還可以再微調（例如這次要關閉某些座位）。</p>
  <div class="cols">
    <div>
      <div class="row" style="margin-bottom:10px">
        <span class="bold">畫筆：</span>
        <div class="seg">${[['s', '🪑 座位'], ['x', '❌ 關閉'], ['a', '⬜ 走道']].map(([v, t]) => `<button class="${S.paint === v ? 'on' : ''}" data-act="paint" data-v="${v}">${t}</button>`).join('')}</div>
        <span class="spacer"></span>
        <div class="seg">${[['teacher', '講台視角'], ['student', '學生視角']].map(([v, t]) => `<button class="${S.editView === v ? 'on' : ''}" data-act="editView" data-v="${v}">${t}</button>`).join('')}</div>
      </div>
      <p class="small muted">點一下或按住拖曳就能畫。可坐座位：<b id="seatCount">${seats}</b> 個（全班 ${C().roster.length} 人）</p>
      <div class="map-wrap" style="--cw:62px;--ch:46px">${mapHTML(L, { view: S.editView, id: 'editMap', cell: (k, t) => ({ html: t === 'x' ? '' : t === 'a' ? '走道' : '' }) })}</div>
    </div>
    <div>
      <div class="card">
        <h3 style="margin-top:0">📐 大小</h3>
        <div class="row">
          <label>排數 <input class="inline" type="number" min="1" max="12" id="mapRows" value="${L.rows}" style="width:70px"></label>
          <label>列數 <input class="inline" type="number" min="1" max="12" id="mapCols" value="${L.cols}" style="width:70px"></label>
          <button class="btn sm" data-act="mapResize">套用</button>
        </div>
        <p class="small muted" style="margin-top:6px">改大小會保留已畫好的格子，不會整個清空。</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">🚪 周邊標示</h3>
        <p class="small muted">「左右」以學生面向講台為準；切換視角時會自動轉向。</p>
        <table class="list" style="margin-top:6px"><thead><tr><th>類型</th><th>位置</th><th>從第幾</th><th>寬</th><th>文字</th><th></th></tr></thead><tbody>
        ${toArr(L.marks).map((m) => {
          const lr = m.side === 'left' || m.side === 'right';
          const max = lr ? L.rows : L.cols;
          return `<tr>
          <td><select data-mark="${m.id}" data-f="type">${Object.entries(MARK_NAME).map(([v, t]) => `<option value="${v}" ${m.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
          <td><select data-mark="${m.id}" data-f="side">${Object.entries(SIDE_NAME).map(([v, t]) => `<option value="${v}" ${m.side === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
          <td><select data-mark="${m.id}" data-f="pos">${Array.from({ length: max }, (_, i) => `<option value="${i}" ${Number(m.pos) === i ? 'selected' : ''}>${lr ? `第${i + 1}排` : `左起第${i + 1}列`}</option>`).join('')}</select></td>
          <td>${lr ? '—' : `<input type="number" min="1" max="${L.cols}" data-mark="${m.id}" data-f="span" value="${m.span || 1}" style="width:56px">`}</td>
          <td><input type="text" data-mark="${m.id}" data-f="label" value="${esc(m.label)}" style="width:80px"></td>
          <td><button class="btn sm ghost" data-act="markDel" data-v="${m.id}">✕</button></td></tr>`;
        }).join('')}
        </tbody></table>
        <div class="row" style="margin-top:8px">
          <button class="btn sm" data-act="markAdd" data-v="door">＋ 門</button>
          <button class="btn sm" data-act="markAdd" data-v="board">＋ 布告欄</button>
          <button class="btn sm" data-act="markAdd" data-v="desk">＋ 講桌</button>
          <button class="btn sm" data-act="markAdd" data-v="text">＋ 文字</button>
        </div>
        <p class="small muted" style="margin-top:8px">第 1 排＝最前排（靠講台）；「左起第幾列」以學生面向講台的左手邊開始算。</p>
      </div>
    </div>
  </div>`;
};
function bindPaint() {
  const map = $('#editMap'); if (!map) return;
  let drag = false;
  const paintAt = (el) => {
    const cell = el && el.closest && el.closest('#editMap .cell'); if (!cell) return;
    const k = cell.dataset.k, L = C().layout;
    if (SC.cellType(L, k) === S.paint) return;
    if (S.paint === 's') delete L.cells[k]; else L.cells[k] = S.paint;
    cell.className = 'cell ' + (S.paint === 's' ? '' : S.paint);
    cell.textContent = S.paint === 'a' ? '走道' : '';
    const sc = $('#seatCount'); if (sc) sc.textContent = SC.seatKeys(L).length;
    touch();
  };
  map.addEventListener('pointerdown', (e) => { drag = true; map.setPointerCapture && map.setPointerCapture(e.pointerId); paintAt(e.target); e.preventDefault(); });
  map.addEventListener('pointermove', (e) => { if (drag) paintAt(document.elementFromPoint(e.clientX, e.clientY)); });
  const stop = () => { drag = false; };
  map.addEventListener('pointerup', stop); map.addEventListener('pointercancel', stop);
}

/* ---------- 🎖️ 幹部 ---------- */
TABV.cadres = () => {
  const list = C().cadres;
  return `
  <div class="cols wide-left">
    <div>
      <h2>🎖️ 幹部名單</h2>
      <p class="lead">職位可以新增、刪除、改名、調整順序。勾「同一框」會和上一個職位印在同一個框裡。</p>
      <table class="list"><thead><tr><th style="width:70px">順序</th><th>職位</th><th>學生</th><th style="width:70px">同一框</th><th></th></tr></thead><tbody>
      ${list.map((x, i) => `<tr>
        <td><button class="btn sm ghost" data-act="cadreMove" data-v="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑</button><button class="btn sm ghost" data-act="cadreMove" data-v="${i}" data-d="1" ${i < list.length - 1 ? '' : 'disabled'}>↓</button></td>
        <td><input type="text" data-cadre="${x.id}" data-f="role" value="${esc(x.role)}"></td>
        <td><select data-cadre="${x.id}" data-f="seat">${studentOptions(x.seat, { blank: '（未定）' })}</select></td>
        <td style="text-align:center"><input type="checkbox" data-cadre="${x.id}" data-f="join" ${x.join ? 'checked' : ''} ${i ? '' : 'disabled'}></td>
        <td><button class="btn sm ghost" data-act="cadreDel" data-v="${x.id}">✕</button></td></tr>`).join('')}
      </tbody></table>
      <div class="row" style="margin-top:10px">
        <button class="btn sm primary" data-act="cadreAdd">＋ 新增職位</button>
        <button class="btn sm ghost" data-act="cadreReset">套用巫魚子老師的預設職位</button>
        <button class="btn sm ghost" data-act="cadreClear">全部清空</button>
      </div>
    </div>
    <div>${previewCard()}</div>
  </div>`;
};

/* ---------- 🧹 打掃 ---------- */
const parseSeats = (s) => [...new Set(String(s || '').split(/[^0-9０-９]+/).map(SC.toNum).filter((n) => n != null && n > 0))].sort((a, b) => a - b);
TABV.cleaning = () => {
  const areas = C().cleaning;
  return `
  <div class="cols wide-left">
    <div>
      <h2>🧹 打掃工作</h2>
      <p class="lead">一學期只換一次也沒關係：這裡的資料每次換座位都會沿用。座號用空白、逗號或「.」分隔都可以。</p>
      <div class="row" style="margin-bottom:12px">
        <button class="btn sm primary" data-act="cleanImport">📥 匯入打掃徵才結果（Excel）</button>
        <button class="btn sm" data-act="areaAdd">＋ 新增區域</button>
        <button class="btn sm ghost" data-act="cleanPreset">套用巫魚子老師的預設項目</button>
      </div>
      ${!areas.length ? '<p class="muted">目前沒有打掃工作。可以匯入打掃徵才的結果、套用預設項目，或自己新增區域；不需要的話座位表也可以不印打掃欄。</p>' : ''}
      ${areas.map((a, ai) => `<div class="card">
        <div class="row"><b>區域</b><input type="text" class="inline" data-area="${a.id}" data-f="name" value="${esc(a.name)}" style="width:140px">
          <span class="spacer"></span>
          <button class="btn sm ghost" data-act="areaMove" data-v="${ai}" data-d="-1" ${ai ? '' : 'disabled'}>↑</button>
          <button class="btn sm ghost" data-act="areaMove" data-v="${ai}" data-d="1" ${ai < areas.length - 1 ? '' : 'disabled'}>↓</button>
          <button class="btn sm ghost" data-act="areaDel" data-v="${a.id}">刪除區域</button></div>
        <table class="list" style="margin-top:8px"><thead><tr><th style="width:62px"></th><th>項目</th><th>座號</th><th>對應姓名</th><th></th></tr></thead><tbody>
        ${a.items.map((it, ii) => `<tr>
          <td><button class="btn sm ghost" data-act="itemMove" data-a="${a.id}" data-v="${ii}" data-d="-1" ${ii ? '' : 'disabled'}>↑</button><button class="btn sm ghost" data-act="itemMove" data-a="${a.id}" data-v="${ii}" data-d="1" ${ii < a.items.length - 1 ? '' : 'disabled'}>↓</button></td>
          <td><input type="text" data-item="${it.id}" data-a="${a.id}" data-f="name" value="${esc(it.name)}"></td>
          <td><input type="text" data-item="${it.id}" data-a="${a.id}" data-f="seats" value="${esc(seatsText(it.seats))}" placeholder="8.19.32" style="width:130px"></td>
          <td class="small muted">${it.seats.map((s) => stu(s) ? esc(stu(s).name) : `<span class="chip red">${s}號不在名單</span>`).join('、')}</td>
          <td><button class="btn sm ghost" data-act="itemDel" data-a="${a.id}" data-v="${it.id}">✕</button></td></tr>`).join('')}
        </tbody></table>
        <button class="btn sm" data-act="itemAdd" data-v="${a.id}" style="margin-top:8px">＋ 新增項目</button>
      </div>`).join('')}
    </div>
    <div>${previewCard()}</div>
  </div>`;
};

/* ---------- 🔒 秘密規則 ---------- */
TABV.rules = () => {
  const c = C(), rules = c.secret, d = S.ruleDraft;
  const L = (round() || {}).layout || c.layout;
  return `
  <div class="row"><h2>🔒 秘密規則</h2><span class="secret-badge">🙈 這一頁請勿投影</span></div>
  <p class="lead">只在抽籤分配時默默生效，投影舞台與座位表上完全不會出現。</p>
  <div class="cols">
    <div>
      <div class="card">
        <h3 style="margin-top:0">目前的規則（${rules.length}）</h3>
        ${rules.length ? `<table class="list"><tbody>${rules.map((r) => `<tr style="${r.on === false ? 'opacity:.45' : ''}">
          <td>${esc(ruleText(r))}</td>
          <td style="width:150px;text-align:right"><button class="btn sm ghost" data-act="ruleToggle" data-v="${r.id}">${r.on === false ? '▶️ 啟用' : '⏸ 暫停'}</button>
          <button class="btn sm ghost" data-act="ruleDel" data-v="${r.id}">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">還沒有規則。</p>'}
      </div>
      <div class="card">
        <h3 style="margin-top:0">🔍 規則能不能同時成立？</h3>
        <p class="small muted">用「${esc((round() || {}).title || '班級地圖')}」的座位與鎖定狀態試算。</p>
        <button class="btn sm" data-act="ruleCheck" style="margin-top:6px">開始檢查</button>
        <div id="ruleCheckOut"></div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">＋ 新增規則</h3>
      <div class="seg" style="margin-bottom:10px">
        <button class="${d.type === 'apart' ? 'on' : ''}" data-act="ruleType" data-v="apart">🚫 兩人不相鄰</button>
        <button class="${d.type === 'zone' ? 'on' : ''}" data-act="ruleType" data-v="zone">📍 限定區域</button>
      </div>
      ${d.type === 'apart' ? `
        <p class="small muted">周圍八格（前後左右、斜角）都不能是對方；中間隔著走道也算相鄰。</p>
        <label class="f">學生 A</label><select id="rA">${studentOptions(d.a)}</select>
        <label class="f">學生 B</label><select id="rB">${studentOptions(d.b)}</select>
        <button class="btn primary" data-act="ruleAdd" style="margin-top:12px">加入規則</button>` : `
        <label class="f">學生</label><select id="rWho">${studentOptions(d.who)}</select>
        <label class="f">只能坐在</label>
        <div class="seg">${[['rows', '某幾排'], ['cols', '某幾列'], ['cells', '指定座位']].map(([v, t]) => `<button class="${d.mode === v ? 'on' : ''}" data-act="ruleMode" data-v="${v}">${t}</button>`).join('')}</div>
        <div style="margin-top:10px">
        ${d.mode === 'rows' ? Array.from({ length: L.rows }, (_, i) => `<label style="margin-right:12px;white-space:nowrap"><input type="checkbox" data-zone="${i}" ${d.list.includes(i) ? 'checked' : ''}> 第${i + 1}排${i === 0 ? '（最前）' : ''}</label>`).join('')
          : d.mode === 'cols' ? Array.from({ length: L.cols }, (_, i) => `<label style="margin-right:12px;white-space:nowrap"><input type="checkbox" data-zone="${i}" ${d.list.includes(i) ? 'checked' : ''}> 左起第${i + 1}列</label>`).join('')
            : `<p class="small muted">點地圖上的座位來選取（講台視角）。已選 ${d.list.length} 個。</p>
               <div class="map-wrap" style="--cw:48px;--ch:36px">${mapHTML(L, { view: 'teacher', act: 'zoneCell', cell: (k) => ({ cls: d.list.includes(k) ? 'filled' : '' }) })}</div>`}
        </div>
        <button class="btn primary" data-act="ruleAdd" style="margin-top:12px">加入規則</button>`}
    </div>
  </div>`;
};

/* ---------- 🎲 換座位回合 ---------- */
TABV.round = () => {
  const c = C(), rd = round();
  const roundList = `<div class="row" style="margin-bottom:14px">
    ${c.rounds.map((r) => `<button class="btn sm ${r.id === S.roundId ? 'ink' : ''}" data-act="pickRound" data-v="${r.id}">${esc(r.title)} ${r.status === 'final' ? '✅' : r.status === 'drawn' ? '🎲' : '📝'}</button>`).join('')}
    <button class="btn sm primary" data-act="newRound">➕ 開新回合</button></div>`;
  if (!rd) return `<h2>🎲 換座位</h2><p class="lead">每次換座位開一個「回合」：先${isGame() ? '鎖定得標與老師預留的座位' : '指定需要固定的座位'}，再到投影舞台抽籤。</p>${roundList}
    ${!c.roster.length ? '<div class="alert red">請先到「📋 班級資料」匯入學生名單。</div>' : ''}`;
  const L = rd.layout, drawn = !!rd.assign, final = rd.status === 'final';
  const lockedSeats = Object.values(rd.locked).map(Number);
  const free = SC.seatKeys(L).filter((k) => !(k in rd.locked));
  const toPlace = c.roster.filter((s) => !lockedSeats.includes(s.seat));
  const lockViol = SC.violations(L, rd.locked, c.secret);
  const assignViol = drawn ? SC.violations(L, rd.assign, c.secret) : [];
  const hide = S.privacy;            // 上課模式：不顯示任何和秘密規則有關的提醒
  const unseated = drawn ? c.roster.filter((s) => !Object.values(rd.assign).map(Number).includes(s.seat)) : [];
  const mode = drawn ? 'swap' : S.roundMode;
  const showMap = drawn ? rd.assign : rd.locked;
  const cellFn = (k, t) => {
    if (t !== 's') return { cls: S.swapSel === k ? 'sel' : '' };
    const s = showMap[k]; const info = rd.lockInfo[k] || {};
    const lockedHere = k in rd.locked;
    let cls = s != null ? (lockedHere ? 'lock-' + (info.kind || 'reserve') : 'filled') : '';
    if (S.swapSel === k) cls += ' sel';
    if (!hide && (drawn ? assignViol : lockViol).some((v) => v.keys.includes(k))) cls += ' warn';
    const tag = lockedHere && s != null ? `<span class="tag">${info.kind === 'bid' && isGame() ? '🏆' : '📌'}</span>` : '';
    return { cls, html: s != null ? `${tag}<span class="no">${pad2(s)}</span><span class="nm">${esc((stu(s) || {}).name || '')}</span>` : '' };
  };
  return `
  <div class="row"><h2>🎲 換座位</h2>${hide ? '' : '<span class="secret-badge">🙈 後台畫面請勿投影，投影請用「📺 投影專用連結」</span>'}</div>
  ${roundList}
  <div class="cols wide-left">
    <div>
      <div class="row" style="margin-bottom:8px">
        <input type="text" class="inline" data-round="title" value="${esc(rd.title)}" style="width:190px" ${final ? 'disabled' : ''}>
        <span class="small">適用期間</span><input type="text" class="inline" data-round="period" value="${esc(rd.period)}" placeholder="開學－1段之間" style="width:170px">
        <span class="chip ${final ? 'teal' : drawn ? 'blue' : ''}">${final ? '✅ 已定案' : drawn ? '🎲 已抽籤（可微調）' : '📝 準備中'}</span>
      </div>
      ${!drawn ? `<div class="row" style="margin-bottom:8px"><div class="seg">
        <button class="${mode === 'lock' ? 'on' : ''}" data-act="roundMode" data-v="lock">🔒 鎖定座位</button>
        <button class="${mode === 'paint' ? 'on' : ''}" data-act="roundMode" data-v="paint">✏️ 調整本回合座位</button></div>
        <span class="small muted">${mode === 'lock' ? (isGame() ? '點座位 → 指定得標者或老師預留的同學' : '點座位 → 指定這個座位給哪位同學') : '點座位切換「座位 ↔ 關閉」'}</span></div>`
      : `<p class="small muted" style="margin-bottom:8px">${final ? '已定案；如需修改請按右側「解除定案」。' : '🔁 互換模式：先點一個座位、再點另一個座位，兩人就會交換（也可以移到空位）。'}</p>`}
      <div class="legend">
        <span style="--c:#d79a1e;--b:var(--gold-soft)">📌 ${isGame() ? '老師預留' : '指定座位'}</span>${isGame() ? '<span style="--c:var(--purple);--b:var(--purple-soft)">🏆 得標</span>' : ''}
        <span style="--c:var(--blue);--b:var(--blue-soft)">抽籤分配</span><span style="--c:#e4a594;--b:#fbe9e5">關閉</span>
        ${hide ? '' : '<span style="--c:var(--red);--b:#fff">違反秘密規則</span>'}
      </div>
      <div class="map-wrap" style="--cw:72px;--ch:54px">${mapHTML(L, { view: c.settings.printView || 'teacher', act: final ? '' : 'roundCell', cell: cellFn })}</div>
      <div class="row small muted"><span>地圖視角：</span><div class="seg">${[['teacher', '講台視角'], ['student', '學生視角']].map(([v, t]) => `<button class="${(c.settings.printView || 'teacher') === v ? 'on' : ''}" data-act="printView" data-v="${v}">${t}</button>`).join('')}</div></div>
    </div>
    <div>
      <div class="card">
        <h3 style="margin-top:0">📊 本回合</h3>
        <p>全班 <b>${c.roster.length}</b> 人｜已鎖定 <b>${lockedSeats.length}</b> 人｜可分配座位 <b>${free.length}</b> 個｜待分配 <b>${toPlace.length}</b> 人</p>
        ${toPlace.length > free.length ? `<div class="alert red">座位不夠：還差 ${toPlace.length - free.length} 個座位，請先開放座位。</div>` : ''}
        ${hide && (lockViol.length || assignViol.length) ? '<div class="alert">⚙️ 有設定需要確認（關閉上課模式後查看）</div>' : ''}
        ${!hide && lockViol.length && !drawn ? `<div class="alert red"><b>⏸ 待老師決定：</b>已鎖定的座位違反秘密規則<ul style="margin:4px 0 0 18px">${lockViol.map((v) => `<li>${esc(ruleText(v.rule))}</li>`).join('')}</ul><span class="small">可以維持（暗標是學生用資源換來的），或點座位改成其他同學。</span></div>` : ''}
        ${!hide && assignViol.length ? `<div class="alert red"><b>⚠️ 目前座位違反秘密規則：</b><ul style="margin:4px 0 0 18px">${assignViol.map((v) => `<li>${esc(ruleText(v.rule))}</li>`).join('')}</ul></div>` : ''}
        ${unseated.length ? `<div class="alert red">還沒有座位：${unseated.map((s) => esc(pad2(s.seat) + ' ' + s.name)).join('、')}</div>` : ''}
        <div class="row" style="margin-top:12px">
          <button class="btn primary" data-act="stageLink" ${c.roster.length ? '' : 'disabled'}>📺 投影專用連結</button>
          <button class="btn sm" data-act="openStage" ${c.roster.length ? '' : 'disabled'}>🎬 在這裡開投影舞台</button>
          ${!drawn && !hide ? '<button class="btn sm" data-act="ruleCheckRound">🔍 先檢查規則</button>' : ''}
          ${drawn && !final ? '<button class="btn teal" data-act="finalize">✅ 定案</button><button class="btn sm ghost" data-act="redraw">🔁 清除結果、重新抽籤</button>' : ''}
          ${final ? '<button class="btn sm ghost" data-act="unfinal">解除定案</button>' : ''}
          <button class="btn sm" data-act="tab" data-v="print">🖨️ 座位表</button>
        </div>
        <div id="ruleCheckOut"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">🔒 已鎖定（${lockedSeats.length}）</h3>
        ${lockedSeats.length ? `<table class="list"><tbody>${Object.entries(rd.locked).sort((a, b) => a[1] - b[1]).map(([k, s]) => {
          const info = rd.lockInfo[k] || {};
          return `<tr><td>${!isGame() ? '📌 指定' : info.kind === 'bid' ? '🏆 得標' : '📌 預留'}</td><td>${esc(stuLabel(s))}</td><td class="small muted">${esc(info.note || '')}</td>
          <td>${drawn ? '' : `<button class="btn sm ghost" data-act="unlock" data-v="${k}">解除</button>`}</td></tr>`;
        }).join('')}</tbody></table>` : `<p class="small muted">還沒有。${isGame() ? '暗標得標者與老師指定的座位' : '老師指定的座位'}都在這裡鎖定，抽籤時不會被動到。</p>`}
        ${drawn || !isGame() ? '' : '<p class="small muted" style="margin-top:8px">（線上暗標與自動開標會在第二階段加入）</p>'}
      </div>
      <div class="row"><span class="spacer"></span><button class="btn sm ghost" data-act="roundDel">🗑️ 刪除這個回合</button></div>
    </div>
  </div>`;
};

/* ---------- 🖨️ 座位表 ---------- */
TABV.print = () => {
  const c = C(), st = c.settings;
  return `
  <h2>🖨️ A4 橫式座位表</h2>
  <p class="lead">幹部、打掃項目變多變少時，版面會自動分欄與縮放，保證一頁印完。</p>
  <div class="row" style="margin-bottom:12px">
    <span class="bold">回合</span>
    <select class="inline" id="printRound">${c.rounds.map((r) => `<option value="${r.id}" ${r.id === S.roundId ? 'selected' : ''}>${esc(r.title)}${r.status === 'final' ? '（已定案）' : r.assign ? '（已抽籤）' : '（尚未抽籤）'}</option>`).join('')}${!c.rounds.length ? '<option value="">（尚無回合：只印空白地圖）</option>' : ''}</select>
    <div class="seg">${[['teacher', '講台視角'], ['student', '學生視角']].map(([v, t]) => `<button class="${(st.printView || 'teacher') === v ? 'on' : ''}" data-act="printView" data-v="${v}">${t}</button>`).join('')}</div>
    <span class="spacer"></span>
    <button class="btn primary" data-act="print">🖨️ 列印 / 存成 PDF</button>
    <button class="btn sm" data-act="exportXlsx">⬇️ 下載 Excel</button>
  </div>
  <div class="row" style="margin-bottom:12px">
    <span class="bold">版型</span>
    <div class="seg">${SHEET_TPL.map(([v, t, a, b]) => `<button class="${(st.showCadres !== false) === a && (st.showCleaning !== false) === b ? 'on' : ''}" data-act="sheetTpl" data-v="${v}">${t}</button>`).join('')}</div>
    <span class="bold" style="margin-left:8px">標題</span>
    <input type="text" class="inline" data-bind="settings.sheetTitle" value="${esc(st.sheetTitle || '')}" placeholder="${esc(autoTitle(c))}" style="width:260px">
  </div>
  <div class="sheet-preview"><div class="sheet-holder" data-auto="1"></div></div>
  <p class="small muted" id="fitNote" style="margin-top:8px"></p>
  <p class="small muted">標題空著會自動產生；底部備註在「📋 班級資料」修改。列印時請在印表機設定選「橫向」、邊界「預設」；想存檔可選「另存為 PDF」。</p>`;
};
function previewCard() {
  return `<div class="card" style="position:sticky;top:70px"><h3 style="margin-top:0">👀 版面預覽</h3>
    <div class="sheet-preview" style="padding:8px"><div class="sheet-holder" data-auto="1"></div></div>
    <p class="small muted" id="fitNote" style="margin-top:6px"></p></div>`;
}

/* =====================================================================
   A4 座位表（列印版）
   ===================================================================== */
const SHEET_TPL = [['full', '📋 巫魚子老師版（座位＋幹部＋打掃）', true, true], ['cadres', '座位＋幹部', true, false], ['cleaning', '座位＋打掃', false, true], ['seats', '🪑 只有座位圖', false, false]];
const autoTitle = (c) => `${c.name || ''}班 座位表${c.settings.showCadres !== false && c.cadres.length ? '與幹部資訊' : ''}`;
const SH = { cw: 70, ch: 50, gap: 6, row: 25, side: 22, mark: 26 };
function sheetHTML(c, rd, opt = {}) {
  const view = opt.view || c.settings.printView || 'teacher';
  const vk = opt.vk || 1, CH = Math.round(SH.ch * vk), ROW = Math.round(SH.row * vk);   // vk：直向拉高倍率（內容被寬度卡住時用來填滿 A4）
  const L = rd ? rd.layout : c.layout;
  const amap = rd ? (rd.assign || rd.locked || {}) : {};
  const V = SC.viewOf(L, view), R = L.rows, Cc = L.cols;
  const X = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="0" x2="100" y2="100" stroke="#000" stroke-width="1.3" vector-effect="non-scaling-stroke"/><line x1="100" y1="0" x2="0" y2="100" stroke="#000" stroke-width="1.3" vector-effect="non-scaling-stroke"/></svg>';
  let cells = '';
  V.grid.forEach((row, dr) => row.forEach((k, dc) => {
    const t = SC.cellType(L, k), pos = `grid-row:${dr + 2};grid-column:${dc + 2}`;
    if (t === 'a') { cells += `<div class="sh-cell a" style="${pos}"></div>`; return; }
    if (t === 'x') { cells += `<div class="sh-cell" style="${pos}">${X}</div>`; return; }
    const s = amap[k], p = s != null ? stu(s) : null;
    cells += `<div class="sh-cell" style="${pos}">${s != null ? `<span class="no">${pad2(s)}</span><span class="nm">${esc(p ? p.name : '')}</span>` : ''}</div>`;
  }));
  const marks = toArr(L.marks).map((m) => {
    const sd = V.side(m), st = V.start(m);
    if (sd === 'top' || sd === 'bottom') return `<div class="sh-mark" style="grid-row:${sd === 'top' ? 1 : R + 2};grid-column:${st + 2} / span ${m.span || 1}">${esc(m.label)}</div>`;
    return `<div class="sh-door" style="grid-row:${st + 2};grid-column:${sd === 'left' ? 1 : Cc + 2}">${esc(m.label)}</div>`;
  }).join('');
  const hasTop = toArr(L.marks).some((m) => V.side(m) === 'top'), hasBot = toArr(L.marks).some((m) => V.side(m) === 'bottom');
  const mapBox = `<div class="sh-map" style="grid-template-columns:${SH.side}px repeat(${Cc},${SH.cw}px) ${SH.side}px;grid-template-rows:${hasTop ? SH.mark + 'px' : '0'} repeat(${R},${CH}px) ${hasBot ? SH.mark + 'px' : '0'}">${marks}${cells}</div>`;
  const mapH = R * (CH + SH.gap) + 2 * (SH.mark + SH.gap) + 18;

  // 依高度把區塊分成幾欄（內容多就分欄，避免一欄太長）
  const splitCols = (blocks, limit) => {
    const total = blocks.reduce((s, b) => s + b.h, 0);
    if (total <= limit || blocks.length < 2) return [blocks];
    const half = total / 2, a = [], b = []; let acc = 0;
    blocks.forEach((x) => { if (acc + x.h / 2 <= half || !a.length) { a.push(x); acc += x.h; } else b.push(x); });
    return [a, b];
  };
  const showCad = c.settings.showCadres !== false && c.cadres.length;
  const showCln = c.settings.showCleaning !== false && c.cleaning.some((a) => a.items.length);
  let cadCols = '';
  if (showCad) {
    const groups = [];
    c.cadres.forEach((x, i) => { if (!i || !x.join) groups.push([]); groups[groups.length - 1].push(x); });
    const blocks = groups.map((g) => ({
      h: g.length * ROW + 7,
      html: `<table class="sh-group"><tbody>${g.map((x) => { const p = x.seat != null ? stu(x.seat) : null; return `<tr><td class="role">${esc(x.role)}</td><td class="who">${p ? `${p.seat} ${esc(p.name)}` : ''}</td></tr>`; }).join('')}</tbody></table>`
    }));
    cadCols = splitCols(blocks, mapH * 1.12).map((col) => `<div class="sh-col">${col.map((b) => b.html).join('')}</div>`).join('');
  }
  let clnCols = '';
  if (showCln) {
    const blocks = [];
    c.cleaning.filter((a) => a.items.length).forEach((a) => {
      const itemsH = a.items.length * ROW;
      const mk = (items, cont) => ({ h: 30 + items.length * ROW + 10, html: `<div><div class="sh-area">打掃區域(${esc(a.name)})${cont ? '（續）' : ''}</div><table class="sh-group clean" style="width:100%"><tbody>${items.map((it) => `<tr><td class="role">${esc(it.name)}</td><td class="who">${esc(seatsText(it.seats))}</td></tr>`).join('')}</tbody></table></div>` });
      if (itemsH > mapH * 1.12 && a.items.length > 3) { const h = Math.ceil(a.items.length / 2); blocks.push(mk(a.items.slice(0, h)), mk(a.items.slice(h), true)); }
      else blocks.push(mk(a.items));
    });
    clnCols = splitCols(blocks, mapH * 1.12).map((col) => `<div class="sh-col" style="gap:10px">${col.map((b) => b.html).join('')}</div>`).join('');
  }
  const title = esc(c.settings.sheetTitle || autoTitle(c));
  const period = rd && rd.period ? `(適用期間：${esc(rd.period)})` : '';
  return `<div class="sheet-inner" style="--rh:${ROW}px">
    <div class="sh-head"><div class="t">${title}</div>${c.teacherTitle ? `<div class="tc">導師：${esc(c.teacherTitle)}</div>` : ''}</div>
    <div class="sh-body">${mapBox}${cadCols ? `<div class="sh-cols">${cadCols}</div>` : ''}${clnCols ? `<div class="sh-cols">${clnCols}</div>` : ''}</div>
    ${(c.settings.note || period) ? `<div class="sh-foot">${esc(c.settings.note || '')}${period}</div>` : ''}
  </div>`;
}
/** 量測後縮放到 A4 可列印範圍（1062×733 px ＝ 281×194 mm） */
function fitSheet(sheet) {
  const inner = sheet.querySelector('.sheet-inner'); if (!inner) return 1;
  inner.style.transform = 'none';
  const W = 1062, H = 733, w = inner.offsetWidth, h = inner.offsetHeight;
  const s = Math.min(W / w, H / h, 1.35);
  const x = Math.max(0, (W - w * s) / 2), y = Math.max(0, (H - h * s) / 2);
  inner.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  return s;
}
/** 畫出座位表並縮放；內容被寬度卡住、下方留白太多時，自動把格子拉高再量一次 */
function renderSheet(sheet, rd) {
  sheet.innerHTML = sheetHTML(C(), rd);
  let s = fitSheet(sheet);
  const inner = sheet.querySelector('.sheet-inner');
  const room = 733 / (inner.offsetHeight * s);
  if (room > 1.08) {
    const vk = Math.min(1.7, room * 0.97);
    sheet.innerHTML = sheetHTML(C(), rd, { vk });
    s = fitSheet(sheet);
  }
  return s;
}
function printRound() {
  const sel = $('#printRound'); const id = sel ? sel.value : S.roundId;
  return C().rounds.find((r) => r.id === id) || round();
}
function mountPreview(holder) {
  const box = holder.parentElement;
  holder.innerHTML = '<div class="sheet"></div>';
  const rd = S.tab === 'print' ? printRound() : round();
  const doFit = () => {
    const s = renderSheet(holder.firstElementChild, rd);
    const k = (box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2) / 1062;
    holder.style.transform = `scale(${k})`; holder.style.height = (733 * k) + 'px'; holder.style.width = '1062px';
    box.style.height = (733 * k + parseFloat(getComputedStyle(box).paddingTop) * 2) + 'px';
    const note = $('#fitNote');
    if (note) note.innerHTML = s < 0.62 ? `⚠️ 內容很多，字已縮到 ${Math.round(s * 100)}%，建議精簡幹部或打掃項目，或取消勾選其中一欄。` : `版面縮放 ${Math.round(s * 100)}%`;
  };
  doFit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(doFit);
}
async function doPrint() {
  const root = $('#printRoot');
  root.innerHTML = '<div class="sheet"></div>';
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  renderSheet(root.firstElementChild, printRound());
  setTimeout(() => window.print(), 60);
}
function exportXlsx() {
  const c = C(), rd = printRound(), L = rd ? rd.layout : c.layout, amap = rd ? (rd.assign || rd.locked || {}) : {};
  const V = SC.viewOf(L, c.settings.printView || 'teacher');
  const rows = [[`${c.name}班 座位表`, '', '', c.teacherTitle ? '導師：' + c.teacherTitle : '']];
  const top = Array(L.cols + 2).fill(''), bot = Array(L.cols + 2).fill('');
  const sideRows = {};
  toArr(L.marks).forEach((m) => {
    const sd = V.side(m), st = V.start(m);
    if (sd === 'top') top[st + 1] = m.label; else if (sd === 'bottom') bot[st + 1] = m.label;
    else (sideRows[st] = sideRows[st] || {})[sd] = m.label;
  });
  rows.push(top);
  V.grid.forEach((row, dr) => rows.push([(sideRows[dr] || {}).left || '', ...row.map((k) => {
    const t = SC.cellType(L, k); if (t === 'a') return ''; if (t === 'x') return '╳';
    const s = amap[k]; return s != null ? `${pad2(s)} ${(stu(s) || {}).name || ''}` : '';
  }), (sideRows[dr] || {}).right || '']));
  rows.push(bot);
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(rows); ws1['!cols'] = Array(L.cols + 2).fill({ wch: 12 });
  XLSX.utils.book_append_sheet(wb, ws1, '座位表');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['職位', '座號', '姓名'], ...c.cadres.map((x) => [x.role, x.seat || '', x.seat ? (stu(x.seat) || {}).name || '' : ''])]), '幹部');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['區域', '項目', '座號'], ...c.cleaning.flatMap((a) => a.items.map((it) => [a.name, it.name, seatsText(it.seats)]))]), '打掃');
  XLSX.writeFile(wb, `${c.name}班_座位表_${rd ? rd.title + '_' : ''}${today()}.xlsx`);
}

/* =====================================================================
   投影舞台（抽籤儀式）
   ===================================================================== */
const Snd = (() => {
  let ctx = null, on = LS.get('seating3_sound', true);
  const beep = (f, d = 0.08, type = 'triangle', vol = 0.18) => {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
    } catch (e) { }
  };
  return {
    tick: () => beep(880, 0.04, 'square', 0.06), pop: () => beep(660 + Math.random() * 300, 0.12),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.2), i * 120)),
    toggle() { on = !on; LS.set('seating3_sound', on); return on; }, get on() { return on; }
  };
})();
const Awake = (() => {
  let lock = null, video = null;
  async function on() {
    if ('wakeLock' in navigator) { try { if (!lock || lock.released) lock = await navigator.wakeLock.request('screen'); return; } catch (e) { } }
    try {
      if (!video) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 2; const g = cv.getContext('2d');
        setInterval(() => { g.fillStyle = Date.now() % 2000 < 1000 ? '#000' : '#010101'; g.fillRect(0, 0, 2, 2); }, 1000);
        video = document.createElement('video'); Object.assign(video, { muted: true, loop: true, playsInline: true });
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;bottom:0;left:0';
        video.srcObject = cv.captureStream(1); document.body.appendChild(video);
      }
      await video.play();
    } catch (e) { }
  }
  async function off() { try { if (lock) await lock.release(); } catch (e) { } lock = null; if (video) video.pause(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#stage')) on(); });
  return { on, off };
})();

const ST = { busy: false, skip: false, speed: LS.get('seating3_speed', 'normal'), revealed: null };
const SPEED = { slow: 900, normal: 420, fast: 140 };
function openStage() {
  const c = C(), rd = round(); if (!rd) return;
  ST.busy = false; ST.skip = false; ST.revealed = rd.assign ? null : new Set();
  const el = document.createElement('div'); el.id = 'stage';
  el.innerHTML = `
    <div class="st-top">
      <div class="st-title"><small>SEAT AUCTION · ${esc(c.name)}班</small>${esc(rd.title)}</div>
      <div class="st-count" id="stCount"></div>
      <span class="spacer"></span>
      <button class="st-btn ghost" data-st="pick">🎯 抽一位同學</button>
      <button class="st-btn" data-st="draw" id="stDraw">🎲 開始分配</button>
      <select class="st-btn ghost" id="stSpeed" style="padding:7px 8px;width:auto">${[['slow', '🐢 慢'], ['normal', '🚶 中'], ['fast', '🐇 快']].map(([v, t]) => `<option value="${v}" ${ST.speed === v ? 'selected' : ''} style="color:#000">${t}</option>`).join('')}</select>
      <button class="st-btn ghost hidden" data-st="skip" id="stSkip">⏩ 全部揭曉</button>
      <button class="st-btn ghost" data-st="sound" id="stSound">${Snd.on ? '🔊' : '🔇'}</button>
      <button class="st-btn ghost" data-st="full">⛶</button>
      <button class="st-btn ghost" data-st="exit">✕ 離開</button>
    </div>
    <div class="st-body" id="stBody"></div>`;
  document.body.appendChild(el);
  Awake.on();
  el.addEventListener('click', stageClick);
  $('#stSpeed').onchange = (e) => { ST.speed = e.target.value; LS.set('seating3_speed', ST.speed); };
  window.addEventListener('resize', paintStage);
  document.addEventListener('keydown', stageKey);
  paintStage();
}
function stageKey(e) { if (e.key === 'Escape' && !document.fullscreenElement) closeStage(); }
function closeStage() {
  const el = $('#stage'); if (!el) return;
  ST.skip = true; el.remove(); Awake.off();
  window.removeEventListener('resize', paintStage); document.removeEventListener('keydown', stageKey);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  render();
}
function paintStage() {
  const body = $('#stBody'); if (!body) return;
  const c = C(), rd = round(), L = rd.layout;
  const W = body.clientWidth - 30, H = body.clientHeight - 20;
  const gap = Math.max(4, Math.min(10, W / 140));
  let cw = (W - 2 * 34 - gap * (L.cols + 3)) / L.cols, ch = (H - 2 * 40 - gap * (L.rows + 3)) / L.rows;
  cw = Math.max(40, Math.min(cw, 170)); ch = Math.max(32, Math.min(ch, cw * 0.72, 120));
  const fs = Math.max(11, Math.min(cw / 5, ch / 2.7, 30));
  const amap = rd.assign || rd.locked;
  const freeSeats = SC.seatKeys(L).filter((k) => !(k in rd.locked));
  const cellFn = (k, t) => {
    if (t !== 's') return {};
    const lockedHere = k in rd.locked, info = rd.lockInfo[k] || {};
    let s = amap[k];
    if (!lockedHere && ST.revealed && !ST.revealed.has(k)) s = null;   // 揭曉中：還沒翻開
    if (s == null) return { cls: rd.assign && !ST.revealed ? '' : 'pending', html: '' };
    const tag = lockedHere && info.kind === 'bid' && isGame() ? '<span class="tag">🏆</span>' : '';
    return { cls: lockedHere ? 'lock-' + (isGame() ? info.kind || 'reserve' : 'reserve') : 'filled', html: `${tag}<span class="no">${pad2(s)}</span><span class="nm">${esc((stu(s) || {}).name || '')}</span>` };
  };
  body.innerHTML = mapHTML(L, { view: c.settings.stageView || 'student', cell: cellFn, style: `--cw:${cw}px;--ch:${ch}px;--fs:${fs}px;--gap:${gap}px` });
  const toPlace = c.roster.filter((s) => !Object.values(rd.locked).map(Number).includes(s.seat)).length;
  $('#stCount').textContent = rd.assign && !ST.busy ? `✅ 分配完成：全班 ${c.roster.length} 人` : `待分配 ${toPlace} 位同學｜空位 ${freeSeats.length} 個`;
  $('#stDraw').disabled = !!rd.assign || ST.busy;
  $('#stDraw').textContent = rd.assign && !ST.busy ? '✨ 分配完成' : '🎲 開始分配';
}
function stageMsg(html, btn) {
  const m = document.createElement('div'); m.className = 'st-msg';
  m.innerHTML = html + `<div style="margin-top:16px"><button class="btn primary">${btn || '好'}</button></div>`;
  $('#stage').appendChild(m); m.querySelector('button').onclick = () => m.remove();
}
async function stageClick(e) {
  const b = e.target.closest('[data-st]'); if (!b) return;
  const a = b.dataset.st;
  if (a === 'exit') return closeStage();
  if (a === 'full') { const el = $('#stage'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => { }); setTimeout(paintStage, 300); Awake.on(); return; }
  if (a === 'sound') { b.textContent = Snd.toggle() ? '🔊' : '🔇'; return; }
  if (a === 'skip') { ST.skip = true; return; }
  if (a === 'pick') return pickVolunteer();
  if (a === 'draw') return runDraw();
}
function pickVolunteer() {
  const list = C().roster; if (!list.length || ST.busy) return;
  ST.busy = true;
  const ov = document.createElement('div'); ov.className = 'st-pick';
  ov.innerHTML = `<div class="sub">🎯 誰來幫大家按下按鈕？</div><div class="big" id="pkName"></div><div id="pkBtn"></div>`;
  $('#stage').appendChild(ov);
  const order = SC.shuffle(list);
  let i = 0, delay = 45;
  const step = () => {
    const s = order[i % order.length]; $('#pkName').textContent = `${pad2(s.seat)} ${s.name}`; Snd.tick(); i++;
    if (delay < 420) { delay *= 1.09; setTimeout(step, delay); }
    else {
      Snd.win();
      $('#pkName').style.transform = 'scale(1.12)';
      $('.sub', ov).textContent = '🎉 請這位同學上台按下「開始分配」！';
      $('#pkBtn').innerHTML = '<button class="st-btn">好！</button>';
      $('#pkBtn button').onclick = () => { ov.remove(); ST.busy = false; paintStage(); };
    }
  };
  step();
}
async function runDraw() {
  const c = C(), rd = round(); if (!rd || rd.assign || ST.busy) return;
  const res = SC.solve({ layout: rd.layout, locked: rd.locked, students: rosterSeats(), rules: c.secret });
  if (!res.ok) { Snd.tick(); return stageMsg('⚠️ 目前無法完成分配<br><span style="font-size:.75em;font-weight:500">請老師回到後台確認設定</span>', '知道了'); }
  ST.busy = true; ST.skip = false; ST.revealed = new Set();
  rd.assign = res.assign; rd.status = 'drawn'; rd.drawnAt = Date.now(); C().currentRound = rd.id;
  touch();
  const order = SC.shuffle(Object.keys(res.assign).filter((k) => !(k in rd.locked)));
  $('#stSkip').classList.remove('hidden'); $('#stDraw').disabled = true;
  paintStage();
  for (const k of order) {
    if (!$('#stage')) return;
    ST.revealed.add(k);
    if (!ST.skip) {
      paintStage();
      const cell = $(`#stage .cell[data-k="${k}"]`); if (cell) cell.classList.add('flip', 'glow');
      Snd.pop();
      await new Promise((r) => setTimeout(r, SPEED[ST.speed] || 420));
    }
  }
  ST.revealed = null; ST.busy = false;
  if (!$('#stage')) return;
  $('#stSkip').classList.add('hidden');
  paintStage(); Snd.win();
  stageMsg('✨ 分配完成！<br><span style="font-size:.75em;font-weight:500">請大家依照座位圖開始移動座位</span>', '好');
}

/* =====================================================================
   動作
   ===================================================================== */
const act = {};
act.login = async () => {
  const email = $('#lgEmail').value.trim(), pw = $('#lgPw').value;
  if (!email || !pw) return toast('請輸入 Email 與密碼', true);
  try { const cred = await FB.login(email, pw); LS.set('seating3_mode', 'cloud'); await enterCloud(cred.user); }
  catch (e) { toast('登入失敗：' + (/invalid|wrong|not-found/.test(e.code || '') ? 'Email 或密碼不正確' : (e.code || e.message)), true); }
};
act.forgot = async () => {
  const email = $('#lgEmail').value.trim(); if (!email) return toast('請先輸入 Email', true);
  try { await FB.reset(email); toast('已寄出重設密碼信，請到信箱查看'); } catch (e) { toast('寄送失敗：' + (e.code || e.message), true); }
};
act.useLocal = () => enterLocal();
act.logout = async () => {
  LS.set('seating3_mode', '');
  if (Store.mode === 'cloud' && window.FB) await FB.logout();
  Store.mode = 'local'; Store.uid = null;
  S.cls = null; S.classes = []; renderLogin();
};
act.tab = (b) => { S.tab = b.dataset.v; LS.set('seating3_tab', S.tab); S.swapSel = null; render(); window.scrollTo(0, 0); };
act.newClass = () => modal(`<h3>➕ 新增班級</h3>
  <label class="f">班級名稱</label><input type="text" id="ncName" placeholder="例如：309">
  <label class="f">導師稱謂</label><input type="text" id="ncTeacher" placeholder="例如：巫昶昕 老師" value="${esc((C() || {}).teacherTitle || '')}">
  <label class="f">起始設定</label>
  <label style="display:block"><input type="radio" name="ncTpl" value="author" ${C() ? '' : 'checked'}> 📋 套用巫魚子老師的預設（暗標換座位、16 個幹部職位、教室與外掃打掃項目、任課老師備註）</label>
  <label style="display:block"><input type="radio" name="ncTpl" value="blank"> 🪑 從簡單開始（一般換座位、不預設幹部與打掃，座位表只印座位圖）</label>
  ${C() ? `<label style="display:block"><input type="radio" name="ncTpl" value="copy" checked> 📑 複製「${esc(C().name)} 班」的設定（地圖、幹部職位、打掃項目、備註；不含名單）</label>` : ''}
  <div class="row" style="margin-top:16px"><button class="btn primary" id="ncOk">建立</button><button class="btn ghost" data-close>取消</button></div>`,
  { mount: (m, close) => {
    $('#ncName', m).focus();
    $('#ncOk', m).onclick = async () => {
      const name = $('#ncName', m).value.trim(); if (!name) return toast('請輸入班級名稱', true);
      const tpl = ($('input[name=ncTpl]:checked', m) || {}).value || 'author';
      const n = SC.newClass(name, tpl === 'blank' ? 'blank' : ''); n.teacherTitle = $('#ncTeacher', m).value.trim();
      if (tpl === 'copy' && C()) {
        const o = JSON.parse(JSON.stringify(C()));
        n.layout = o.layout; n.settings = { ...n.settings, ...o.settings, sheetTitle: '' };
        n.cadres = o.cadres.map((x) => ({ ...x, seat: null })); n.cleaning = o.cleaning.map((a) => ({ ...a, items: a.items.map((it) => ({ ...it, seats: [] })) }));
      }
      S.cls = n; S.classes.unshift({ id: n.id, name: n.name, updatedAt: n.updatedAt }); S.roundId = null;
      LS.set('seating3_last', n.id); S.tab = 'info'; close(); touch(true);
    };
  } });
act.deleteClass = () => modal(`<h3>🗑️ 刪除班級</h3><p>確定要刪除「${esc(C().name)} 班」的所有資料嗎？這個動作無法復原。</p>
  <p class="small muted">建議先「下載備份」。請輸入班級名稱確認：</p><input type="text" id="dcName">
  <div class="row" style="margin-top:14px"><button class="btn red" id="dcOk">刪除</button><button class="btn ghost" data-close>取消</button></div>`,
  { mount: (m, close) => {
    $('#dcOk', m).onclick = async () => {
      if ($('#dcName', m).value.trim() !== C().name) return toast('班級名稱不符', true);
      try { await Store.remove(C().id); } catch (e) { return toast('刪除失敗：' + (e.code || e.message), true); }
      close(); S.cls = null; await loadClasses();
    };
  } });
act.backup = () => download(`${C().name}班_座位大作戰備份_${today()}.json`, new Blob([JSON.stringify(SC.sanitize(C()), null, 2)], { type: 'application/json' }));
act.restore = async () => {
  const f = await pickFile('.json,application/json'); if (!f) return;
  try {
    const obj = JSON.parse(await f.text());
    if (!obj || !obj.layout) throw new Error('不是座位大作戰的備份檔');
    if (!confirm(`要用備份檔「${obj.name || ''}班」覆蓋目前的「${C().name}班」嗎？`)) return;
    const n = SC.normalizeClass(obj); n.id = C().id; S.cls = n;
    S.roundId = (n.rounds[n.rounds.length - 1] || {}).id || null; touch(true); toast('已還原');
  } catch (e) { toast('還原失敗：' + e.message, true); }
};
act.rosterSample = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['座號', '姓名', '學號'], [1, '王小明', '1130101'], [2, '李小華', '1130102']]), '學生名單');
  XLSX.writeFile(wb, '座位大作戰_名單範例.xlsx');
};
act.rosterFile = async () => {
  const f = await pickFile('.xlsx,.xls,.csv'); if (!f) return;
  try { S.rosterDraft = SC.parseRoster(await readSheet(f)); render(); } catch (e) { toast('讀取失敗：' + e.message, true); }
};
act.rosterPaste = () => { S.rosterDraft = SC.parseRoster($('#rosterText').value); render(); };
act.rosterCancel = () => { S.rosterDraft = null; render(); };
act.rosterApply = () => {
  const c = C(), list = S.rosterDraft.students, ok = new Set(list.map((s) => s.seat));
  c.roster = list;
  c.cadres.forEach((x) => { if (x.seat != null && !ok.has(x.seat)) x.seat = null; });
  c.cleaning.forEach((a) => a.items.forEach((it) => { it.seats = it.seats.filter((s) => ok.has(s)); }));
  c.secret = c.secret.filter((r) => r.type === 'apart' ? ok.has(Number(r.a)) && ok.has(Number(r.b)) : ok.has(Number(r.who)));
  c.rounds.forEach((rd) => {
    Object.entries(rd.locked).forEach(([k, s]) => { if (!ok.has(Number(s))) { delete rd.locked[k]; delete rd.lockInfo[k]; } });
    if (rd.assign) Object.entries(rd.assign).forEach(([k, s]) => { if (!ok.has(Number(s))) delete rd.assign[k]; });
  });
  S.rosterDraft = null; touch(true); toast(`✅ 已套用 ${list.length} 位學生`);
};
/* 地圖 */
act.paint = (b) => { S.paint = b.dataset.v; render(); };
act.editView = (b) => { S.editView = b.dataset.v; render(); };
act.mapResize = () => {
  const r = Math.max(1, Math.min(12, Number($('#mapRows').value) || 1)), c = Math.max(1, Math.min(12, Number($('#mapCols').value) || 1));
  C().layout = SC.resizeLayout(C().layout, r, c); touch(true);
};
act.markAdd = (b) => {
  const t = b.dataset.v, L = C().layout;
  const m = { id: uid('m'), type: t, side: t === 'door' ? 'left' : t === 'desk' ? 'front' : 'back', pos: 0, span: t === 'door' ? 1 : Math.min(2, L.cols), label: { door: '門', board: '布告欄', desk: '講桌', text: '' }[t] };
  L.marks.push(m); touch(true);
};
act.markDel = (b) => { C().layout.marks = C().layout.marks.filter((m) => m.id !== b.dataset.v); touch(true); };
/* 幹部 */
act.cadreAdd = () => { C().cadres.push({ id: uid('c'), role: '新職位', seat: null, join: false }); touch(true); };
act.cadreDel = (b) => { C().cadres = C().cadres.filter((x) => x.id !== b.dataset.v); if (C().cadres[0]) C().cadres[0].join = false; touch(true); };
act.cadreMove = (b) => { const a = C().cadres, i = Number(b.dataset.v), j = i + Number(b.dataset.d); [a[i], a[j]] = [a[j], a[i]]; if (a[0]) a[0].join = false; touch(true); };
act.cadreReset = () => { if (!confirm('恢復預設職位？目前的職位與人選會被取代。')) return; C().cadres = SC.DEFAULT_CADRES.map((x) => ({ ...x, id: uid('c') })); touch(true); };
/* 打掃 */
const area = (id) => C().cleaning.find((a) => a.id === id);
act.areaAdd = () => { C().cleaning.push({ id: uid('a'), name: '新區域', items: [] }); touch(true); };
act.areaDel = (b) => { const a = area(b.dataset.v); if (a.items.length && !confirm(`刪除「${a.name}」和裡面的 ${a.items.length} 個項目？`)) return; C().cleaning = C().cleaning.filter((x) => x !== a); touch(true); };
act.areaMove = (b) => { const a = C().cleaning, i = Number(b.dataset.v), j = i + Number(b.dataset.d); [a[i], a[j]] = [a[j], a[i]]; touch(true); };
act.itemAdd = (b) => { area(b.dataset.v).items.push({ id: uid('i'), name: '', seats: [] }); touch(true); };
act.itemDel = (b) => { const a = area(b.dataset.a); a.items = a.items.filter((x) => x.id !== b.dataset.v); touch(true); };
act.itemMove = (b) => { const a = area(b.dataset.a).items, i = Number(b.dataset.v), j = i + Number(b.dataset.d); [a[i], a[j]] = [a[j], a[i]]; touch(true); };
act.cleanImport = async () => {
  const f = await pickFile('.xlsx,.xls,.csv'); if (!f) return;
  let parsed; try { parsed = SC.parseCleaning(await readSheet(f)); } catch (e) { return toast('讀取失敗：' + e.message, true); }
  if (!parsed.items.length) return toast(parsed.errors[0] || '檔案裡沒有打掃資料', true);
  const areaNames = [...new Set([...C().cleaning.map((a) => a.name), ...parsed.items.map((i) => i.area).filter(Boolean)])];
  const mism = [];
  parsed.items.forEach((it) => it.seats.forEach((s, i) => { const p = stu(s); if (!p) mism.push(`${s} 號不在名單`); else if (it.names[i] && it.names[i] !== p.name) mism.push(`${s} 號：檔案是「${it.names[i]}」，名單是「${p.name}」`); }));
  modal(`<h3>📥 匯入打掃結果</h3>
    <p class="small muted">讀到 ${parsed.items.length} 個項目。沒有標示區域的項目，請選擇要放在哪個區域。</p>
    ${mism.length ? `<div class="alert red small">姓名比對提醒（${mism.length} 筆，請確認座號是否正確）：<br>${mism.slice(0, 6).map(esc).join('<br>')}${mism.length > 6 ? `<br>…還有 ${mism.length - 6} 筆` : ''}</div>` : ''}
    <table class="list"><thead><tr><th>區域</th><th>項目</th><th>座號</th></tr></thead><tbody>
    ${parsed.items.map((it, i) => `<tr><td><select data-imp="${i}">${areaNames.map((n) => `<option ${n === (it.area || areaNames[0]) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></td><td>${esc(it.name)}</td><td>${seatsText(it.seats)}</td></tr>`).join('')}
    </tbody></table>
    <div style="margin-top:12px"><label><input type="radio" name="impMode" value="replace" checked> 整個取代目前的打掃工作</label><br>
    <label><input type="radio" name="impMode" value="merge"> 只更新同名項目（其他項目保留）</label></div>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="impOk">匯入</button><button class="btn ghost" data-close>取消</button></div>`,
  { wide: true, mount: (m, close) => {
    $('#impOk', m).onclick = () => {
      const mode = $('input[name=impMode]:checked', m).value;
      const c = C();
      if (mode === 'replace') c.cleaning = [];
      parsed.items.forEach((it, i) => {
        const an = $(`[data-imp="${i}"]`, m).value;
        let a = c.cleaning.find((x) => x.name === an); if (!a) { a = { id: uid('a'), name: an, items: [] }; c.cleaning.push(a); }
        const ex = a.items.find((x) => x.name === it.name);
        if (ex) ex.seats = it.seats.slice().sort((x, y) => x - y); else a.items.push({ id: uid('i'), name: it.name, seats: it.seats.slice().sort((x, y) => x - y) });
      });
      close(); touch(true); toast('✅ 已匯入打掃工作');
    };
  } });
};
/* 秘密規則 */
act.ruleType = (b) => { S.ruleDraft = { type: b.dataset.v, mode: 'rows', list: [] }; render(); };
act.ruleMode = (b) => { S.ruleDraft.who = ($('#rWho') || {}).value; S.ruleDraft.mode = b.dataset.v; S.ruleDraft.list = []; render(); };
act.zoneCell = (b) => {
  const k = b.dataset.k, d = S.ruleDraft; if (SC.cellType(((round() || {}).layout || C().layout), k) !== 's') return;
  d.who = ($('#rWho') || {}).value; d.list = d.list.includes(k) ? d.list.filter((x) => x !== k) : [...d.list, k]; render();
};
act.ruleAdd = () => {
  const d = S.ruleDraft, c = C();
  if (d.type === 'apart') {
    const a = Number($('#rA').value), b = Number($('#rB').value);
    if (!a || !b) return toast('請選兩位學生', true); if (a === b) return toast('請選兩位不同的學生', true);
    c.secret.push({ id: uid('r'), type: 'apart', a, b, on: true });
  } else {
    const who = Number($('#rWho').value); if (!who) return toast('請選學生', true);
    const list = d.mode === 'cells' ? d.list : $$('[data-zone]:checked').map((x) => Number(x.dataset.zone));
    if (!list.length) return toast('請至少選一個範圍', true);
    c.secret.push({ id: uid('r'), type: 'zone', who, mode: d.mode, list, on: true });
  }
  S.ruleDraft = { type: d.type, mode: d.mode, list: [] }; touch(true); toast('🔒 已加入規則');
};
act.ruleToggle = (b) => { const r = C().secret.find((x) => x.id === b.dataset.v); r.on = r.on === false; touch(true); };
act.ruleDel = (b) => { C().secret = C().secret.filter((x) => x.id !== b.dataset.v); touch(true); };
act.ruleCheck = act.ruleCheckRound = () => {
  const out = $('#ruleCheckOut'); if (!out) return;
  out.innerHTML = '<p class="small muted">計算中…</p>';
  setTimeout(() => {
    const c = C(), rd = round();
    const d = SC.diagnose({ layout: rd ? rd.layout : c.layout, locked: rd ? rd.locked : {}, students: rosterSeats(), rules: c.secret });
    if (d.ok) out.innerHTML = '<div class="alert teal">✅ 目前的規則可以同時成立，抽籤不會卡住。</div>';
    else if (d.reason === 'capacity') out.innerHTML = `<div class="alert red">座位不夠：要排 ${d.detail.students} 人，但只有 ${d.detail.seats} 個空位。</div>`;
    else if (d.reason === 'empty-zone') out.innerHTML = `<div class="alert red">${esc(stuLabel(d.detail.seat))} 的限定區域裡沒有空位（可能都被鎖定或關閉了）。</div>`;
    else out.innerHTML = `<div class="alert red">❌ 規則無法同時成立。${d.culprits.length ? '只要暫停下面任一條就能排出來：<ul style="margin:4px 0 0 18px">' + d.culprits.map((r) => `<li>${esc(ruleText(r))}</li>`).join('') + '</ul>' : '請試著暫停幾條規則，或開放更多座位。'}</div>`;
  }, 30);
};
/* 回合 */
act.pickRound = (b) => { S.roundId = b.dataset.v; C().currentRound = S.roundId; S.swapSel = null; touch(true); };
act.newRound = () => {
  const c = C(), n = c.rounds.length + 1, prev = c.rounds[c.rounds.length - 1];
  modal(`<h3>➕ 開新回合</h3>
    <label class="f">名稱</label><input type="text" id="nrTitle" value="第${n}次換座位">
    <label class="f">適用期間（印在座位表備註）</label><input type="text" id="nrPeriod" placeholder="例如：開學－1段之間">
    <label class="f">座位地圖</label>
    <label><input type="radio" name="nrFrom" value="class" checked> 用班級的基本地圖</label><br>
    ${prev ? `<label><input type="radio" name="nrFrom" value="prev"> 沿用上一回合（${esc(prev.title)}）的地圖</label>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn primary" id="nrOk">建立</button><button class="btn ghost" data-close>取消</button></div>`,
  { mount: (m, close) => {
    $('#nrOk', m).onclick = () => {
      const from = ($('input[name=nrFrom]:checked', m) || {}).value;
      const rd = { id: uid('rd'), title: $('#nrTitle', m).value.trim() || `第${n}次換座位`, period: $('#nrPeriod', m).value.trim(), createdAt: Date.now(),
        status: 'prep', layout: JSON.parse(JSON.stringify(from === 'prev' && prev ? prev.layout : c.layout)), locked: {}, lockInfo: {}, assign: null };
      c.rounds.push(rd); c.currentRound = rd.id; S.roundId = rd.id; S.roundMode = 'lock'; close(); touch(true);
    };
  } });
};
act.roundDel = () => {
  const c = C(), rd = round(); if (!confirm(`刪除「${rd.title}」？`)) return;
  c.rounds = c.rounds.filter((x) => x !== rd); S.roundId = (c.rounds[c.rounds.length - 1] || {}).id || null; c.currentRound = S.roundId; touch(true);
};
act.roundMode = (b) => { S.roundMode = b.dataset.v; render(); };
act.roundCell = (b) => {
  const rd = round(), k = b.dataset.k, t = SC.cellType(rd.layout, k);
  if (rd.assign) return swapCell(k, t);
  if (S.roundMode === 'paint') {
    if (t === 'a') return;
    if (t === 's') { rd.layout.cells[k] = 'x'; delete rd.locked[k]; delete rd.lockInfo[k]; } else delete rd.layout.cells[k];
    return touch(true);
  }
  if (t !== 's') return;
  lockModal(k);
};
function lockModal(k) {
  const rd = round(), cur = rd.locked[k], info = rd.lockInfo[k] || { kind: 'bid' };
  const where = {}; Object.entries(rd.locked).forEach(([kk, s]) => { where[s] = kk; });
  const { r, c } = SC.parseKey(k);
  const game = isGame();
  modal(`<h3>🔒 ${game ? '鎖定座位' : '指定座位'}（第 ${r + 1} 排、左起第 ${c + 1} 列）</h3>
    <label class="f">同學</label><select id="lkWho">${studentOptions(cur, { note: (s) => where[s] && where[s] !== k ? '（已在別的座位，選了會移過來）' : '' })}</select>
    ${game ? `<label class="f">類型</label>
    <label><input type="radio" name="lkKind" value="bid" ${info.kind !== 'reserve' ? 'checked' : ''}> 🏆 暗標得標</label>
    <label style="margin-left:16px"><input type="radio" name="lkKind" value="reserve" ${info.kind === 'reserve' ? 'checked' : ''}> 📌 老師預留</label>` : '<input type="radio" name="lkKind" value="reserve" checked hidden>'}
    <label class="f">備註（只有老師看得到${game ? '，例如：王牌×1' : ''}）</label><input type="text" id="lkNote" value="${esc(info.note || '')}">
    <div class="row" style="margin-top:14px"><button class="btn primary" id="lkOk">確定</button>
    ${cur != null ? '<button class="btn red" id="lkDel">解除鎖定</button>' : ''}<button class="btn ghost" data-close>取消</button></div>`,
  { mount: (m, close) => {
    $('#lkOk', m).onclick = () => {
      const s = Number($('#lkWho', m).value); if (!s) return toast('請選同學', true);
      if (where[s] && where[s] !== k) { delete rd.locked[where[s]]; delete rd.lockInfo[where[s]]; }
      rd.locked[k] = s; rd.lockInfo[k] = { kind: $('input[name=lkKind]:checked', m).value, note: $('#lkNote', m).value.trim() };
      close(); touch(true);
    };
    const del = $('#lkDel', m); if (del) del.onclick = () => { delete rd.locked[k]; delete rd.lockInfo[k]; close(); touch(true); };
  } });
}
function swapCell(k, t) {
  const rd = round(); if (rd.status === 'final' || t !== 's') return;
  if (!S.swapSel) { S.swapSel = k; return render(); }
  if (S.swapSel === k) { S.swapSel = null; return render(); }
  const a = S.swapSel, A = rd.assign;
  const before = SC.violations(rd.layout, A, C().secret).length;
  const va = A[a], vb = A[k];
  if (vb == null) delete A[a]; else A[a] = vb;
  if (va == null) delete A[k]; else A[k] = va;
  S.swapSel = null;
  const after = SC.violations(rd.layout, A, C().secret);
  if (after.length > before) toast('⚠️ 換完後違反秘密規則：' + after.map((v) => ruleText(v.rule)).join('；'), true);
  touch(true);
}
act.unlock = (b) => { const rd = round(); delete rd.locked[b.dataset.v]; delete rd.lockInfo[b.dataset.v]; touch(true); };
act.openStage = () => {
  const rd = round();
  if (!rd.assign) {
    const freeN = SC.seatKeys(rd.layout).filter((k) => !(k in rd.locked)).length;
    const need = C().roster.filter((s) => !Object.values(rd.locked).map(Number).includes(s.seat)).length;
    if (need > freeN) return toast(`座位不夠：還差 ${need - freeN} 個`, true);
    if (SC.violations(rd.layout, rd.locked, C().secret).length && !confirm(S.privacy ? '有設定尚待確認，確定要繼續嗎？' : '有鎖定的座位違反秘密規則（右側紅框「待老師決定」）。確定維持現狀、進入投影舞台嗎？')) return;
  }
  openStage();
};
act.privacy = () => {
  if (S.privacy && !confirm('關閉上課模式？秘密規則與相關提醒會重新出現，請確認畫面沒有在投影。')) return;
  S.privacy = !S.privacy; LS.set('seating3_privacy', S.privacy); render();
};
act.gameMode = (b) => { C().settings.gameMode = b.dataset.v; touch(true); };
act.cadreClear = () => { if (!confirm('清空所有幹部職位？')) return; C().cadres = []; touch(true); };
act.cleanPreset = () => {
  if (C().cleaning.some((a) => a.items.length) && !confirm('套用預設項目會取代目前的打掃工作，確定嗎？')) return;
  C().cleaning = SC.DEFAULT_CLEANING.map((a) => ({ id: uid('a'), name: a.name, items: a.items.map((it) => ({ id: uid('i'), name: it.name, seats: [] })) })); touch(true);
};
act.sheetTpl = (b) => { const t = SHEET_TPL.find((x) => x[0] === b.dataset.v); C().settings.showCadres = t[2]; C().settings.showCleaning = t[3]; touch(true); };
act.stageLink = () => {
  const c = C(); c.currentRound = S.roundId; touch();
  const url = location.href.split('#')[0] + '#stage=' + encodeURIComponent(c.id);
  modal(`<h3>📺 投影專用連結</h3>
    <p>在<b>要接投影機的那台裝置</b>（平板或教室電腦）打開這個連結，會<b>直接進入投影舞台</b>，完全不會出現後台畫面。</p>
    <input type="text" readonly value="${esc(url)}" id="slUrl" style="margin:10px 0">
    <ul class="small" style="margin:0 0 0 18px;line-height:1.8">
      <li>第一次在那台裝置打開需要登入一次，之後就會記住</li>
      <li>建議加入書籤；連結會自動打開「目前選取的回合」</li>
      <li>在後台改了設定，回到投影分頁時會自動更新成最新版</li>
    </ul>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="slCopy">📋 複製連結</button><button class="btn" id="slOpen">↗️ 在新分頁開啟</button><button class="btn ghost" data-close>關閉</button></div>`,
  { mount: (m) => {
    $('#slCopy', m).onclick = async () => { try { await navigator.clipboard.writeText(url); toast('已複製連結'); } catch (e) { $('#slUrl', m).select(); toast('請按 Ctrl+C 複製', true); } };
    $('#slOpen', m).onclick = () => window.open(url, '_blank');
  } });
};
act.standbyStage = () => { if (round()) openStage(); };
act.standbyBack = () => {
  if (!confirm('要切換到後台嗎？（如果正在投影，學生會看到後台畫面）')) return;
  S.stageOnly = false; history.replaceState(null, '', location.href.split('#')[0]); render();
};
act.finalize = () => { const rd = round(); rd.status = 'final'; rd.finalAt = Date.now(); touch(true); toast('✅ 已定案'); };
act.unfinal = () => { const rd = round(); rd.status = 'drawn'; touch(true); };
act.redraw = () => { if (!confirm('清除這一回合的抽籤結果？鎖定的座位會保留。')) return; const rd = round(); rd.assign = null; rd.status = 'prep'; rd.drawnAt = null; touch(true); };
/* 座位表 */
act.printView = (b) => { C().settings.printView = b.dataset.v; touch(true); };
act.print = () => doPrint();
act.exportXlsx = () => exportXlsx();

/* ---------------- 事件委派 ---------------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled || e.target.closest('#stage')) return;
  const f = act[b.dataset.act]; if (f) f(b, e);
});
const setPath = (obj, path, v) => { const p = path.split('.'); let o = obj; while (p.length > 1) o = o[p.shift()]; o[p[0]] = v; };
document.addEventListener('input', (e) => {
  const t = e.target; if (!C()) return;
  if (t.dataset.bind) { setPath(C(), t.dataset.bind, t.value); return touch(); }
  if (t.dataset.round) { round()[t.dataset.round] = t.value; return touch(); }
});
document.addEventListener('change', (e) => {
  const t = e.target; if (!C()) return;
  if (t.id === 'clsSel') return openClass(t.value);
  if (t.id === 'printRound') return render();
  if (t.dataset.bind || t.dataset.round) return refreshPreview();
  if (t.dataset.opt) { C().settings[t.dataset.opt] = t.checked; return touch(true); }
  if (t.dataset.mark) {
    const m = C().layout.marks.find((x) => x.id === t.dataset.mark), f = t.dataset.f;
    m[f] = f === 'pos' || f === 'span' ? Number(t.value) : t.value;
    if (f === 'side') m.pos = 0;
    if (f === 'span') m.span = Math.max(1, Math.min(C().layout.cols, m.span || 1));
    C().layout = SC.resizeLayout(C().layout, C().layout.rows, C().layout.cols);   // 夾回範圍
    return touch(true);
  }
  if (t.dataset.cadre) {
    const x = C().cadres.find((y) => y.id === t.dataset.cadre), f = t.dataset.f;
    x[f] = f === 'seat' ? (t.value ? Number(t.value) : null) : f === 'join' ? t.checked : t.value;
    return touch(f !== 'role') || (f === 'role' && refreshPreview());
  }
  if (t.dataset.area) { area(t.dataset.area).name = t.value; touch(); return refreshPreview(); }
  if (t.dataset.item) {
    const it = area(t.dataset.a).items.find((x) => x.id === t.dataset.item);
    if (t.dataset.f === 'seats') { it.seats = parseSeats(t.value); return touch(true); }
    it.name = t.value; touch(); return refreshPreview();
  }
  if (t.dataset.zone != null) return;
});
function refreshPreview() { $$('.sheet-holder[data-auto]').forEach((h) => mountPreview(h)); }
window.addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(refreshPreview, 200); });
window.addEventListener('beforeunload', (e) => { if (S.saveState === '儲存中…') { e.preventDefault(); e.returnValue = ''; } });

boot();
