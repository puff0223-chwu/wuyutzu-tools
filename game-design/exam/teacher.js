/* 🎲 線上檢定所：老師後台（ES module）
   - 登入：會員中心共用帳號（app＝exam）
   - 📚 題庫：Quill 編輯器（貼圖、拖曳、連結）、Word／Excel／JSON 匯入、備份
   - 📝 測驗：建立（選題、時間、次數、計分方式、打亂、反作弊、名單）、分享 QR、成績、名單、公布
   - 自動閱卷官：打開某份測驗時，監聽學生作答 → 時間到的自動收卷、算分、寫 g/<學號>（公布後學生讀得到） */
const X = window.ExamCore, W = window.WuStaff;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = X.escapeHtml;
const LIB = {
  mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
};
let FB = null, authErr = (e) => String((e && (e.code || e.message)) || e), gBtn = () => '';
try {
  const M = await import('../../account/fb.js?v=20261020a');
  FB = await M.openFirebase('exam'); FB.idle(60000); authErr = M.authErr; gBtn = M.googleButtonHTML;
} catch (e) { console.warn(e); }

/* ---------- 小工具 ---------- */
const toast = (t, ms) => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms || 2400); };
const loaded = {};
const loadScript = (url) => loaded[url] || (loaded[url] = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => { delete loaded[url]; bad(new Error('載入失敗：' + url)); }; document.head.appendChild(s); }));
function modal(html, opt) {
  opt = opt || {};
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box ${opt.wide ? 'wide' : ''}"><button class="x" title="關閉">×</button>${html}</div>`;
  $('#modals').appendChild(m);
  const close = () => { if (opt.onClose && opt.onClose() === false) return; m.remove(); };
  m.close = () => m.remove();
  $('.x', m).onclick = close;
  m.addEventListener('mousedown', (e) => { if (e.target === m && !opt.sticky) close(); });
  return m;
}
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const letterList = (arr) => (arr || []).map((i) => X.LETTERS[i]).join(' ') || '—';
// ❓ 說明小圖示：滑鼠移過去（手機點一下）才顯示說明，畫面保持乾淨
const tip = (text) => `<button type="button" class="tip" aria-label="說明" data-tip="${esc(text)}">?</button>`;
const typeChip = (t) => `<span class="chip ${t === 's' ? 'blue' : t === 'm' ? '' : 'warn'}">${X.TYPE_ICON[t]} ${X.TYPES[t]}</span>`;
const toLocalInput = (ms) => { if (!ms) return ''; const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v) => v ? new Date(v).getTime() : 0;
const clean = (o) => { const out = {}; Object.keys(o).forEach((k) => { const v = o[k]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return; out[k] = v; }); return out; };
const arr = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a - b).map((k) => v[k]) : []);

/* ---------- 圖片 ---------- */
const IMG = {};
async function getImg(id) {
  if (IMG[id] !== undefined) return IMG[id];
  try { const r = await FB.get('exam/img/' + id); IMG[id] = (r && r.data) || ''; } catch (e) { IMG[id] = ''; }
  return IMG[id];
}
async function hydrate(html) {
  const ids = X.imgIds(html); await Promise.all(ids.map(getImg));
  return String(html || '').replace(/<img data-img="([a-z0-9]+)"/g, (m, id) => `<img src="${IMG[id] || ''}" data-img="${id}"`);
}
function sanitize(html, noLinks) {
  let h = window.DOMPurify ? DOMPurify.sanitize(String(html || ''), { ADD_ATTR: ['data-img', 'target'], FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'] }) : esc(X.plain(html));
  if (noLinks) h = h.replace(/<a\b[^>]*>/gi, '<span class="nolink">').replace(/<\/a>/gi, '</span>');
  else h = h.replace(/<a\b/gi, '<a target="_blank" rel="noopener"');
  return h;
}
function renderInto(el, html, noLinks) {
  el.innerHTML = sanitize(html, noLinks);
  $$('img[data-img]', el).forEach(async (img) => { img.src = await getImg(img.getAttribute('data-img')); });
}
async function uploadImg(src) {
  const c = await X.compressImage(src, 1000, 0.72);
  const id = X.newId(14);
  await FB.set('exam/img/' + id, { owner: ME.uid, data: c.data, w: c.w, h: c.h, at: Date.now() });
  IMG[id] = c.data;
  return { id, data: c.data, w: c.w };
}
// HTML 裡還是 data: 開頭的圖片 → 壓縮、上傳、換成 <img data-img="代號">
async function uploadHtmlImages(html, onOne) {
  const tags = String(html || '').match(/<img\b[^>]*src="data:image\/[^"]+"[^>]*>/gi) || [];
  let out = String(html || '');
  for (const tag of tags) {
    const src = /src="([^"]+)"/.exec(tag)[1];
    try { const r = await uploadImg(src); out = out.replace(tag, `<img data-img="${r.id}">`); } catch (e) { console.warn(e); out = out.replace(tag, ''); }
    if (onOne) onOne();
  }
  return out;
}
const countDataImgs = (html) => (String(html || '').match(/<img\b[^>]*src="data:image\/[^"]+"/gi) || []).length;

/* ---------- Quill 編輯器 ---------- */
let quillReady = false;
function setupQuill() {
  if (quillReady || !window.Quill) return; quillReady = true;
  const Base = Quill.import('formats/image');
  class ExImg extends Base {
    static create(v) {
      const src = typeof v === 'string' ? v : (v && v.src) || '';
      const n = super.create(src);
      if (v && typeof v === 'object') { if (v.id) n.setAttribute('data-img', v.id); if (v.w) n.setAttribute('width', v.w); }
      return n;
    }
    static value(n) { const id = n.getAttribute('data-img'); return id ? { src: n.getAttribute('src') || '', id, w: n.getAttribute('width') || '' } : n.getAttribute('src'); }
    static sanitize(u) { return /^(data:image\/|https?:)/.test(String(u)) || u === '' ? u : ''; }
  }
  ExImg.blotName = 'image'; ExImg.tagName = 'IMG';
  Quill.register(ExImg, true);
}
const TB_FULL = [[{ size: ['small', false, 'large'] }], ['bold', 'italic', 'underline', 'strike'], [{ color: [] }, { background: [] }], [{ script: 'sub' }, { script: 'super' }], [{ align: [] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']];
const TB_MINI = [['bold', 'italic', 'underline'], [{ color: [] }], [{ script: 'sub' }, { script: 'super' }], ['link', 'image'], ['clean']];
async function makeEditor(host, html, opt) {
  setupQuill();
  opt = opt || {};
  host.classList.add('ed'); if (opt.mini) host.classList.add('mini');
  const box = document.createElement('div'); host.appendChild(box);
  const tools = document.createElement('div'); tools.className = 'imgtools';
  tools.innerHTML = '🖼️ 圖片寬度：<button type="button" class="btn ghost sm" data-w="25">小</button><button type="button" class="btn ghost sm" data-w="50">中</button><button type="button" class="btn ghost sm" data-w="80">大</button><button type="button" class="btn ghost sm" data-w="0">原始</button>';
  host.appendChild(tools);
  const q = new Quill(box, { theme: 'snow', placeholder: opt.placeholder || '', modules: {
    toolbar: { container: opt.mini ? TB_MINI : TB_FULL, handlers: { image: () => pickImage(q) } },
    uploader: { mimetypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'], handler: (range, files) => insertFiles(q, range, files) }
  } });
  if (html) q.clipboard.dangerouslyPasteHTML(await hydrate(html), 'silent');
  let selImg = null;
  q.root.addEventListener('click', (e) => {
    $$('img.sel', q.root).forEach((i) => i.classList.remove('sel'));
    if (e.target.tagName === 'IMG') { selImg = e.target; selImg.classList.add('sel'); tools.classList.add('on'); } else { selImg = null; tools.classList.remove('on'); }
  });
  tools.onclick = (e) => {
    const b = e.target.closest('[data-w]'); if (!b || !selImg) return;
    const pct = +b.dataset.w;
    const blot = Quill.find(selImg); if (!blot) return;
    const w = pct ? Math.round(q.root.clientWidth * pct / 100) : '';
    blot.format('width', w ? String(w) : null);
    if (opt.onChange) opt.onChange();
  };
  const fixing = new Set();
  q.on('text-change', () => {
    if (opt.onChange) opt.onChange();
    // 從 Word、網頁貼上的圖片（還沒有代號）→ 壓縮上傳
    $$('img', q.root).forEach(async (img) => {
      if (img.getAttribute('data-img') || fixing.has(img)) return;
      const src = img.getAttribute('src') || '';
      if (!/^data:image\//.test(src)) return;
      fixing.add(img);
      try { const r = await uploadImg(src); img.setAttribute('data-img', r.id); img.setAttribute('src', r.data); if (opt.onChange) opt.onChange(); } catch (e) { toast('圖片上傳失敗：' + e.message); }
      fixing.delete(img);
    });
  });
  q.getHtml = () => {
    let h = X.stripImgSrc(q.root.innerHTML).replace(/(<p><br><\/p>)+$/, '').replace(/^(<p><br><\/p>)+/, '');
    if (X.isEmptyHtml(h)) return '';
    return h;
  };
  q.busy = () => fixing.size > 0;
  return q;
}
function pickImage(q) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = () => insertFiles(q, q.getSelection(true), Array.from(inp.files));
  inp.click();
}
async function insertFiles(q, range, files) {
  files = Array.from(files || []).filter((f) => /^image\//.test(f.type));
  if (!files.length) return;
  let at = range ? range.index : q.getLength();
  for (const f of files) {
    try {
      toast('🖼️ 圖片壓縮上傳中…', 1200);
      const r = await uploadImg(f);
      q.insertEmbed(at, 'image', { src: r.data, id: r.id }, 'user'); at++;
      q.setSelection(at, 0, 'silent');
    } catch (e) { toast('圖片上傳失敗：' + e.message); }
  }
}

/* ---------- 登入 ---------- */
const gate = $('#gate');
const gbox = (inner) => `<div class="card" style="max-width:460px;margin:9vh auto">${inner}</div>`;
function renderLogin(msg) {
  $('#main').classList.add('hidden');
  gate.innerHTML = gbox(`<h1 style="font-size:1.45rem">🎲 線上檢定所｜老師登入</h1>
    <p class="muted small">老師後台有題庫與學生成績，需要登入。各系統共用同一個老師帳號。</p>
    ${msg ? `<p class="small" style="color:var(--bad)">${esc(msg)}</p>` : ''}${!FB ? '<p class="small" style="color:var(--bad)">雲端服務載入失敗，請確認網路後重新整理。</p>' : ''}
    <div style="margin-top:14px">${gBtn('gG')}</div>
    <label class="f">Email</label><input type="email" id="gE" autocomplete="username">
    <label class="f">密碼</label><input type="password" id="gP" autocomplete="current-password">
    <div class="row" style="margin-top:14px"><button class="btn" id="gGo">🔓 登入</button><span class="sp"></span><button class="linkbtn" id="gReset">忘記密碼</button></div>
    <p class="small muted" style="margin-top:14px">還沒有帳號？<a href="${W.centerURL('../../', 'exam')}" style="font-weight:800;color:var(--ink)">👥 到會員中心申請使用</a>（巫魚子老師核准後就能用）</p>`);
  if (!FB) return;
  const go = async () => { const e = $('#gE').value.trim(), p = $('#gP').value; if (!e || !p) return; $('#gGo').disabled = true; try { await FB.login(e, p); } catch (err) { renderLogin(authErr(err)); } };
  const gg = $('#gG'); if (gg) gg.onclick = async () => { gg.disabled = true; try { await FB.google(); } catch (err) { renderLogin(authErr(err)); } };
  $('#gGo').onclick = go; $('#gP').onkeydown = (ev) => { if (ev.key === 'Enter') go(); };
  $('#gReset').onclick = async () => { const e = $('#gE').value.trim(); if (!e) return toast('先輸入 Email'); try { await FB.reset(e); toast('重設密碼的信已寄出'); } catch (err) { toast('寄送失敗：' + (err.code || err.message)); } };
}

let ME = null, ADMIN = false;
let BANKS = {}, CURB = '', FILTER = { t: '', d: '', tag: '', kw: '' }, SEL = new Set();
let EXAMS = {}, CUR = null;

if (!FB) renderLogin();
else FB.onUser(async (u) => {
  if (!u) { ME = null; return renderLogin(); }
  gate.innerHTML = gbox('<p class="muted">檢查帳號中…</p>');
  const res = await W.check(FB.get, u, 'exam');
  if (!res.ok) { gate.innerHTML = W.blockedHTML(res, 'exam', '../../', u.email); const b = gate.querySelector('[data-staff-logout]'); if (b) b.onclick = () => FB.logout(); return; }
  ME = u; ADMIN = !!res.admin;
  gate.innerHTML = ''; $('#main').classList.remove('hidden');
  $('#who').textContent = u.email;
  $('#logout').onclick = () => FB.logout();
  await loadBanks();
  await loadExams();
  loadCmts();
  const m = /#e=([A-HJ-NP-Z2-9]{6})/.exec(location.hash);
  if (m && EXAMS[m[1]]) openExam(m[1]); else renderExams();
});

$('#tabs').onclick = (e) => {
  const b = e.target.closest('button[data-t]'); if (!b) return;
  $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $('#t-exams').classList.toggle('hidden', b.dataset.t !== 'exams');
  $('#t-bank').classList.toggle('hidden', b.dataset.t !== 'bank');
  if (b.dataset.t === 'bank') renderBank(); else if (!CUR) renderExams();
};
const showTab = (t) => $(`#tabs button[data-t="${t}"]`).click();

/* =====================================================================
   📚 題庫（2026-10-23 改版：題庫小首頁＋題目分頁；題庫不記配分）
   ===================================================================== */
const PAGE_N = 20; // 一頁最多 20 題（老師建議 15～20）
let BVIEW = 'home', PAGE = 1, IMPORT_TO = '';
async function loadBanks() {
  try { BANKS = (await FB.get('exam/bk/' + ME.uid)) || {}; } catch (e) { BANKS = {}; toast('讀取題庫失敗：' + e.message); }
  Object.values(BANKS).forEach((b) => { b.q = b.q || {}; Object.values(b.q).forEach(normQ); });
  if (!BANKS[CURB]) CURB = '';
}
function normQ(q) { q.o = arr(q.o); q.a = arr(q.a); q.tags = arr(q.tags); q.d = q.d || '中'; return q; }
const qOrder = (b) => Object.keys(b.q || {}).sort((x, y) => ((b.q[x].i || 0) - (b.q[y].i || 0)) || ((b.q[x].at || 0) - (b.q[y].at || 0)) || (x < y ? -1 : 1));
const bankTags = (b) => { const s = new Set(); Object.values((b && b.q) || {}).forEach((q) => (q.tags || []).forEach((t) => s.add(t))); return Array.from(s).sort(); };
const bankCnt = (b) => { const c = { s: 0, m: 0, a: 0, n: 0, last: b.at || 0 }; Object.values(b.q || {}).forEach((q) => { c[q.t]++; c.n++; c.last = Math.max(c.last, q.at || 0); }); return c; };
const bankIds = () => Object.keys(BANKS).sort((x, y) => bankCnt(BANKS[y]).last - bankCnt(BANKS[x]).last);
function matchQ(q, f) {
  if (f.t && q.t !== f.t) return false;
  if (f.d && q.d !== f.d) return false;
  if (f.tag && !(q.tags || []).includes(f.tag)) return false;
  if (f.kw) { const k = f.kw.toLowerCase(); const txt = (X.plain(q.s) + ' ' + q.o.map(X.plain).join(' ') + ' ' + (q.tags || []).join(' ')).toLowerCase(); if (!txt.includes(k)) return false; }
  return true;
}
async function newBank(name, subj) {
  const id = X.newId(10);
  const b = clean({ name: String(name || '新題庫').slice(0, 40), at: Date.now(), subj: String(subj || '').slice(0, 20) });
  await FB.set(`exam/bk/${ME.uid}/${id}`, b);
  BANKS[id] = Object.assign(b, { q: {} });
  return id;
}
function openBank(id) { CURB = id; BVIEW = 'detail'; PAGE = 1; SEL.clear(); FILTER = { t: '', d: '', tag: '', kw: '' }; renderBank(); window.scrollTo(0, 0); }
function renderBank() { if (BVIEW !== 'detail' || !BANKS[CURB]) { BVIEW = 'home'; return renderBankHome(); } renderBankDetail(); }
// 分頁按鈕：« ‹ 1 2 3 › »
function pagerHTML(total, page, size) {
  const pages = Math.max(1, Math.ceil(total / size)); if (pages <= 1) return '';
  const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return `<div class="pager"><button class="btn ghost sm" data-pg="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ 上一頁</button>${nums.map((n) => n === '…' ? '<span class="muted">…</span>' : `<button class="btn sm ${n === page ? 'ink' : 'ghost'}" data-pg="${n}">${n}</button>`).join('')}<button class="btn ghost sm" data-pg="${page + 1}" ${page >= pages ? 'disabled' : ''}>下一頁 ›</button><span class="small muted">第 ${(page - 1) * size + 1}～${Math.min(total, page * size)} 題，共 ${total} 題</span></div>`;
}
function renderBankHome() {
  const el = $('#t-bank'), ids = bankIds();
  el.innerHTML = `<div class="card"><div class="row"><h2>📚 我的題庫</h2><span class="sp"></span><button class="btn" id="bNew">＋ 新題庫</button></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="bWord">📥 匯入 Word 考卷</button><button class="btn ghost" id="bXls">📥 匯入 Excel</button><button class="linkbtn small" id="bTpl">⬇ Excel 範本</button><span class="sp"></span><button class="btn ghost sm" id="bIn">📂 匯入備份</button></div>
    <p class="small muted" style="margin:8px 0 0">匯入時可以選擇建立新題庫，或加到已經有的題庫。題庫只記錄題目；配分在建立測驗時依題型設定。</p>
    ${ids.length ? `<div class="elist" style="margin-top:14px">${ids.map((id) => { const b = BANKS[id], c = bankCnt(b), tags = bankTags(b); return `<div class="ecard" role="button" tabindex="0" data-b="${id}"><button type="button" class="cardx" data-del="${id}" title="刪除這個題庫">🗑</button>
      <div class="row" style="gap:6px">${b.subj ? `<span class="chip">${esc(b.subj)}</span>` : ''}<span class="chip gray">${c.n} 題</span></div>
      <b style="margin-top:6px">${esc(b.name)}</b>${b.desc ? `<div class="small muted">${esc(b.desc)}</div>` : ''}
      <div class="small muted">單選 ${c.s}・多重選擇 ${c.m}・簡答 ${c.a}</div>
      ${tags.length ? `<div class="row small" style="gap:4px;margin-top:4px">${tags.slice(0, 5).map((t) => `<span class="chip gray">#${esc(t)}</span>`).join('')}${tags.length > 5 ? `<span class="muted">…等 ${tags.length} 個標籤</span>` : ''}</div>` : ''}
      <div class="small muted" style="margin-top:4px">最後更新 ${X.fmtTime(c.last)}</div></div>`; }).join('')}</div>`
    : `<div class="empty"><div style="font-size:3rem">📚</div><h3>還沒有題庫</h3><p>按「＋ 新題庫」自己出題，或直接匯入 Word 考卷、Excel 題目檔。</p></div>`}</div>`;
  $('#bNew').onclick = () => bankSettings(null);
  $('#bWord').onclick = () => { IMPORT_TO = ''; pickFile('.docx', importWord); };
  $('#bXls').onclick = () => { IMPORT_TO = ''; pickFile('.xlsx,.xls,.csv', importExcel); };
  $('#bTpl').onclick = downloadTemplate;
  $('#bIn').onclick = () => pickFile('.json', importBackup);
  $$('#t-bank .ecard').forEach((b) => { b.onclick = (e) => { if (e.target.closest('[data-del]')) return; openBank(b.dataset.b); }; b.onkeydown = (e) => { if (e.key === 'Enter') openBank(b.dataset.b); }; });
  $$('#t-bank [data-del]').forEach((x) => { x.onclick = (e) => { e.stopPropagation(); deleteBank(x.dataset.del); }; });
}
function bankSettings(id) {
  const b = id ? BANKS[id] : { name: '', subj: lastUsed().subj || '', desc: '' };
  const subs = Array.from(new Set(X.SUBJECTS.concat(Object.values(BANKS).map((x) => x.subj).filter(Boolean))));
  const m = modal(`<h2>${id ? '⚙️ 題庫設定' : '＋ 新題庫'}</h2>
    <label class="f">題庫名稱</label><input type="text" id="sbN" maxlength="40" value="${esc(b.name)}" placeholder="例如：遊戲設計思考課程考題">
    <label class="f">科目</label><input type="text" id="sbS" maxlength="20" list="sbSL" value="${esc(b.subj || '')}" placeholder="例如：遊戲設計思考"><datalist id="sbSL">${subs.map((x) => `<option>${esc(x)}</option>`).join('')}</datalist>
    <label class="f">說明（選填）</label><input type="text" id="sbD" maxlength="200" value="${esc(b.desc || '')}" placeholder="例如：115-1 期末考題">
    <div class="row" style="margin-top:14px"><button class="btn" id="sbGo">${id ? '💾 儲存' : '＋ 建立'}</button></div>`);
  setTimeout(() => $('#sbN', m).focus(), 30);
  $('#sbGo', m).onclick = async () => {
    const name = $('#sbN', m).value.trim(); if (!name) return toast('請輸入題庫名稱');
    const subj = $('#sbS', m).value.trim().slice(0, 20), desc = $('#sbD', m).value.trim().slice(0, 200);
    if (id) { await FB.update(`exam/bk/${ME.uid}/${id}`, { name: name.slice(0, 40), subj: subj || null, desc: desc || null }); Object.assign(b, { name: name.slice(0, 40), subj, desc }); m.close(); renderBank(); toast('✅ 已儲存'); }
    else { const nid = await newBank(name, subj); if (desc) { await FB.set(`exam/bk/${ME.uid}/${nid}/desc`, desc); BANKS[nid].desc = desc; } m.close(); openBank(nid); }
  };
}
// 刪除題庫：空題庫按確定就刪；有題目要輸入題庫名稱確認
async function deleteBank(id) {
  const b = BANKS[id]; if (!b) return;
  const n = Object.keys(b.q || {}).length;
  if (n) { const x = prompt(`確定要刪除題庫「${b.name}」和裡面 ${n} 題嗎？\n（已經建立的測驗不受影響）\n請輸入題庫名稱確認：`); if (x !== b.name) { if (x != null) toast('名稱不一樣，沒有刪除'); return; } }
  else if (!confirm(`確定要刪除空的題庫「${b.name}」嗎？`)) return;
  await FB.remove(`exam/bk/${ME.uid}/${id}`); delete BANKS[id];
  if (CURB === id) { CURB = ''; BVIEW = 'home'; }
  SEL.clear(); renderBank(); toast('🗑 已刪除題庫');
}
function renderBankDetail() {
  const el = $('#t-bank'), b = BANKS[CURB];
  const all = qOrder(b), list = all.filter((id) => matchQ(b.q[id], FILTER));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_N)); if (PAGE > pages) PAGE = pages; if (PAGE < 1) PAGE = 1;
  const pageIds = list.slice((PAGE - 1) * PAGE_N, PAGE * PAGE_N);
  const cnt = bankCnt(b);
  SEL.forEach((id) => { if (!b.q[id]) SEL.delete(id); });
  const tags = bankTags(b);
  el.innerHTML = `<div class="card">
    <div class="row"><button class="btn ghost sm" id="bHome">← 所有題庫</button><h2>${esc(b.name)}</h2>${b.subj ? `<span class="chip">${esc(b.subj)}</span>` : ''}<span class="sp"></span>
      <button class="btn ghost sm" id="bSet">⚙️ 題庫設定</button><button class="btn danger sm" id="bDel">🗑 刪除題庫</button></div>
    ${b.desc ? `<p class="small muted" style="margin:4px 0 0">${esc(b.desc)}</p>` : ''}
    <div class="row" style="margin-top:12px">
      <button class="btn" id="qNew">＋ 新增題目</button>
      <button class="btn ghost" id="bWord">📥 匯入 Word 考卷</button>
      <button class="btn ghost" id="bXls">📥 匯入 Excel</button>
      <button class="linkbtn small" id="bTpl">⬇ Excel 範本</button>
      <span class="sp"></span>
      <button class="btn ghost sm" id="bOut">💾 備份下載</button>
    </div>
    <div class="filters">
      <select id="fT"><option value="">全部題型</option>${Object.keys(X.TYPES).map((t) => `<option value="${t}" ${FILTER.t === t ? 'selected' : ''}>${X.TYPES[t]}</option>`).join('')}</select>
      <select id="fD"><option value="">全部難易度</option>${X.DIFFS.map((d) => `<option ${FILTER.d === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select id="fG"><option value="">全部標籤</option>${tags.map((t) => `<option ${FILTER.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <input type="text" id="fK" placeholder="🔍 搜尋題目、選項、標籤" value="${esc(FILTER.kw)}">
    </div>
    <div class="row small" style="margin-top:10px"><label class="ck"><input type="checkbox" id="selAll" ${list.length && list.every((id) => SEL.has(id)) ? 'checked' : ''}>全選${list.length !== all.length ? '篩選出來的' : ''} ${list.length} 題</label>
      <span class="muted">共 ${all.length} 題（單選 ${cnt.s}・多重選擇 ${cnt.m}・簡答 ${cnt.a}）${list.length !== all.length ? `｜篩選後 ${list.length} 題` : ''}</span></div>
    <div id="pgTop">${pagerHTML(list.length, PAGE, PAGE_N)}</div>
    <div class="qlist" id="qList">${pageIds.length ? pageIds.map((id) => qRow(b, id, all.indexOf(id) + 1)).join('') : `<div class="empty">${all.length ? '沒有符合篩選的題目' : '這個題庫還沒有題目。按「＋ 新增題目」，或「📥 匯入 Word 考卷」「📥 匯入 Excel」。'}</div>`}</div>
    <div id="pgBot">${pagerHTML(list.length, PAGE, PAGE_N)}</div>
    <div class="batch ${SEL.size ? '' : 'hidden'}" id="batch">已選 <b>${SEL.size}</b> 題
      <button class="btn sm" data-b="tag">🏷️ 加標籤</button><button class="btn sm" data-b="untag">🏷️ 移除標籤</button>
      <button class="btn sm" data-b="diff">⭐ 改難易度</button>
      <button class="btn sm" data-b="copy">⧉ 複製到其他題庫</button><button class="btn danger sm" data-b="del">🗑 刪除</button>
      <span class="sp"></span><button class="btn ghost sm" data-b="none">取消選取</button></div>
  </div>`;
  $('#bHome').onclick = () => { BVIEW = 'home'; SEL.clear(); renderBank(); };
  $('#bSet').onclick = () => bankSettings(CURB);
  $('#bDel').onclick = () => deleteBank(CURB);
  $('#qNew').onclick = () => openEditor(CURB, null);
  $('#bWord').onclick = () => { IMPORT_TO = CURB; pickFile('.docx', importWord); };
  $('#bXls').onclick = () => { IMPORT_TO = CURB; pickFile('.xlsx,.xls,.csv', importExcel); };
  $('#bTpl').onclick = downloadTemplate;
  $('#bOut').onclick = () => exportBank(CURB);
  $('#fT').onchange = (e) => { FILTER.t = e.target.value; PAGE = 1; renderBank(); };
  $('#fD').onchange = (e) => { FILTER.d = e.target.value; PAGE = 1; renderBank(); };
  $('#fG').onchange = (e) => { FILTER.tag = e.target.value; PAGE = 1; renderBank(); };
  let kt = null; $('#fK').oninput = (e) => { clearTimeout(kt); kt = setTimeout(() => { FILTER.kw = e.target.value.trim(); PAGE = 1; renderBank(); const k = $('#fK'); k.focus(); k.setSelectionRange(k.value.length, k.value.length); }, 350); };
  $('#selAll').onchange = (e) => { list.forEach((id) => e.target.checked ? SEL.add(id) : SEL.delete(id)); renderBank(); };
  [$('#pgTop'), $('#pgBot')].forEach((p) => { p.onclick = (e) => { const x = e.target.closest('[data-pg]'); if (!x || x.disabled) return; PAGE = +x.dataset.pg; renderBank(); $('#pgTop').scrollIntoView({ block: 'start' }); }; });
  $('#qList').onclick = (e) => {
    const r = e.target.closest('[data-q]'); if (!r) return;
    const id = r.dataset.q, act = e.target.closest('[data-a]');
    if (e.target.matches('input[type=checkbox]')) { e.target.checked ? SEL.add(id) : SEL.delete(id); $('#batch').classList.toggle('hidden', !SEL.size); $('#batch b').textContent = SEL.size; return; }
    if (!act) return openEditor(CURB, id);
    const a = act.dataset.a;
    if (a === 'edit') openEditor(CURB, id);
    else if (a === 'view') previewQ(b.q[id]);
    else if (a === 'dup') dupQ(CURB, id);
    else if (a === 'up' || a === 'down') moveQ(CURB, id, a === 'up' ? -1 : 1);
    else if (a === 'del') delQs(CURB, [id]);
  };
  $('#batch').onclick = (e) => { const x = e.target.closest('[data-b]'); if (x) batchOp(x.dataset.b); };
}
function qRow(b, id, no) {
  const q = b.q[id];
  return `<div class="qrow" data-q="${id}"><input type="checkbox" ${SEL.has(id) ? 'checked' : ''}><div class="no">${no}</div>
    <div class="txt"><div class="stem">${esc(X.plain(q.s).slice(0, 160)) || '<span class="muted">（題幹空白）</span>'}${X.hasImg(q.s) ? ' 🖼️' : ''}</div>
      <div class="meta">${typeChip(q.t)}<span class="chip gray">${esc(q.d)}</span>${q.t !== 'a' ? `<span class="chip ok">答 ${letterList(q.a)}</span><span class="chip gray">${q.o.length} 選項</span>` : ''}${(q.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div></div>
    <div class="acts"><button class="btn ghost sm" data-a="view" title="預覽">👁</button><button class="btn ghost sm" data-a="edit">✏️ 編輯</button><button class="btn ghost sm" data-a="dup" title="複製">⧉</button><button class="btn ghost sm" data-a="up" title="上移">↑</button><button class="btn ghost sm" data-a="down" title="下移">↓</button><button class="btn danger sm" data-a="del" title="刪除">🗑</button></div></div>`;
}
async function saveQ(bank, id, q) {
  const data = clean({ t: q.t, s: q.s, o: q.t === 'a' ? [] : q.o, a: q.t === 'a' ? [] : q.a, r: q.t === 'a' ? q.r : '', e: q.e, d: q.d, tags: q.tags, l: q.l ? true : null, i: q.i, at: q.at || Date.now(), src: q.src });
  await FB.set(`exam/bk/${ME.uid}/${bank}/q/${id}`, data);
  BANKS[bank].q[id] = normQ(Object.assign({}, data));
}
const nextI = (bank) => Object.values(BANKS[bank].q || {}).reduce((m, q) => Math.max(m, q.i || 0), 0) + 1;
async function dupQ(bank, id) { const q = Object.assign({}, BANKS[bank].q[id]); const nid = X.newId(10); q.i = (q.i || 0) + 0.5; q.at = Date.now(); await saveQ(bank, nid, q); await renumber(bank); renderBank(); toast('已複製一題'); }
async function renumber(bank) {
  const b = BANKS[bank], ids = qOrder(b), up = {};
  ids.forEach((id, k) => { if (b.q[id].i !== k + 1) { b.q[id].i = k + 1; up[id + '/i'] = k + 1; } });
  if (Object.keys(up).length) await FB.update(`exam/bk/${ME.uid}/${bank}/q`, up);
}
async function moveQ(bank, id, dir) {
  const b = BANKS[bank], ids = qOrder(b), k = ids.indexOf(id), j = k + dir;
  if (j < 0 || j >= ids.length) return;
  [ids[k], ids[j]] = [ids[j], ids[k]];
  const up = {}; ids.forEach((x, n) => { if (b.q[x].i !== n + 1) { b.q[x].i = n + 1; up[x + '/i'] = n + 1; } });
  await FB.update(`exam/bk/${ME.uid}/${bank}/q`, up); renderBank();
}
async function delQs(bank, ids) {
  if (!confirm(`確定要刪除 ${ids.length} 題嗎？（已經建立的測驗不受影響）`)) return;
  const up = {}; ids.forEach((id) => { up[id] = null; delete BANKS[bank].q[id]; SEL.delete(id); });
  await FB.update(`exam/bk/${ME.uid}/${bank}/q`, up); renderBank(); toast(`已刪除 ${ids.length} 題`);
}
async function batchOp(op) {
  const b = BANKS[CURB], ids = Array.from(SEL).filter((id) => b.q[id]);
  if (op === 'none') { SEL.clear(); return renderBank(); }
  if (!ids.length) return;
  if (op === 'del') return delQs(CURB, ids);
  const up = {};
  if (op === 'tag' || op === 'untag') {
    const t = (prompt(op === 'tag' ? '要加上的標籤（多個用逗號分開）' : '要移除的標籤') || '').split(/[,，、]/).map((x) => x.trim().slice(0, 20)).filter(Boolean);
    if (!t.length) return;
    ids.forEach((id) => { const q = b.q[id]; let tg = q.tags || []; tg = op === 'tag' ? Array.from(new Set(tg.concat(t))) : tg.filter((x) => !t.includes(x)); q.tags = tg; up[id + '/tags'] = tg.length ? tg : null; });
  } else if (op === 'diff') {
    const d = prompt('難易度（易／中／難）', '中'); if (!X.DIFFS.includes(d)) return d && toast('只能填 易、中、難');
    ids.forEach((id) => { b.q[id].d = d; up[id + '/d'] = d; });
  } else if (op === 'copy') {
    const others = bankIds().filter((x) => x !== CURB);
    const names = others.map((x, k) => `${k + 1}. ${BANKS[x].name}`).join('\n');
    const ans = prompt(`複製 ${ids.length} 題到哪一個題庫？輸入編號，或輸入新名稱建立新題庫：\n${names}`);
    if (!ans) return;
    let target = others[+ans - 1];
    if (!target) target = await newBank(ans, b.subj);
    let i = nextI(target);
    const add = {}; ids.forEach((id) => { const q = Object.assign({}, b.q[id], { i: i++, at: Date.now() }); delete q.p; add[X.newId(10)] = clean(Object.assign({}, q, { l: q.l || null })); });
    await FB.update(`exam/bk/${ME.uid}/${target}/q`, add);
    Object.keys(add).forEach((k) => { BANKS[target].q[k] = normQ(add[k]); });
    toast(`已複製 ${ids.length} 題到「${BANKS[target].name}」`);
    return renderBank();
  }
  await FB.update(`exam/bk/${ME.uid}/${CURB}/q`, up); renderBank(); toast('已更新 ' + ids.length + ' 題');
}

/* ---------- 題目預覽（學生看到的樣子＋答案） ---------- */
function qViewHTML(q, no, opt) {
  opt = opt || {};
  return `<div class="qview"><div class="head"><b>${no ? '第 ' + no + ' 題' : '預覽'}</b>${typeChip(q.t)}${q.d ? `<span class="chip gray">${esc(q.d)}</span>` : ''}${q.p != null ? `<span class="chip gray">${q.p} 分</span>` : ''}${q.l ? '<span class="chip gray">🔒 選項順序固定</span>' : ''}</div>
    <div class="qhtml" data-h="s"></div>
    ${q.t !== 'a' ? q.o.map((o, i) => `<div class="op ${(q.a || []).includes(i) ? 'right' : ''}"><b>${X.LETTERS[i]}.</b><div class="qhtml" data-h="o${i}"></div>${(q.a || []).includes(i) ? ' ✅' : ''}</div>`).join('') : `<div class="small muted" style="margin-top:6px">✏️ 學生在這裡打字作答</div>${q.r ? '<div class="exp"><b>參考答案：</b><div class="qhtml" data-h="r"></div></div>' : ''}`}
    ${q.e && !opt.noExp ? '<div class="exp"><b>💡 解析：</b><div class="qhtml" data-h="e"></div></div>' : ''}</div>`;
}
function fillQView(el, q) {
  const s = $('[data-h="s"]', el); if (s) renderInto(s, q.s);
  (q.o || []).forEach((o, i) => { const x = $(`[data-h="o${i}"]`, el); if (x) renderInto(x, o); });
  const r = $('[data-h="r"]', el); if (r) renderInto(r, q.r);
  const e = $('[data-h="e"]', el); if (e) renderInto(e, q.e);
}
function previewQ(q) { const m = modal(`<h2>👁 題目預覽</h2>${qViewHTML(q)}`); fillQView($('.qview', m), q); }

/* ---------- 題目編輯器 ---------- */
async function openEditor(bank, id, preset) {
  const b = BANKS[bank], isNew = !id;
  const q0 = id ? JSON.parse(JSON.stringify(b.q[id])) : Object.assign({ t: 's', s: '', o: ['', '', '', ''], a: [], e: '', d: '中', tags: [] }, preset || {});
  if (isNew && q0.t === 'm' && q0.o.length < 5) while (q0.o.length < 5) q0.o.push('');
  const qid = id || X.newId(10);
  let saved = !isNew, dirty = false, autoT = null, lastSaved = '', savedT = q0.t;
  const m = modal(`<h2>${isNew ? '＋ 新增題目' : '✏️ 編輯題目'}<span class="small muted" id="eNo" style="font-weight:500;margin-left:8px"></span></h2>
    <div class="typepick" id="eType">${Object.keys(X.TYPES).map((t) => `<label class="${q0.t === t ? 'on' : ''}"><input type="radio" name="et" value="${t}" ${q0.t === t ? 'checked' : ''}>${X.TYPE_ICON[t]} ${X.TYPES[t]}</label>`).join('')}</div>
    <p class="small muted" id="eRule" style="margin:6px 0 0"></p>
    <label class="f">題目（可直接貼上圖片、截圖，或把圖片拖進來）</label><div id="eStem"></div>
    <div id="eOptsBox"><label class="f">選項 <span class="small muted" id="eOptHint"></span></label><div id="eOpts"></div>
      <div class="row"><button type="button" class="btn ghost sm" id="eAdd">＋ 選項</button><label class="ck small"><input type="checkbox" id="eLock" ${q0.l ? 'checked' : ''}>🔒 選項順序固定（例如有「以上皆是」時）</label></div></div>
    <div id="eRefBox"><label class="f">參考答案（只有老師閱卷時看得到，可以空白）</label><div id="eRef"></div></div>
    <label class="f">💡 解析（成績公布時，老師可以選擇讓學生看）</label><div id="eExp"></div>
    <div class="grid3" style="margin-top:6px">
      <div><label class="f">難易度</label><select id="eDiff">${X.DIFFS.map((d) => `<option ${q0.d === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div style="grid-column:span 2"><label class="f">標籤（按 Enter 加入）</label><div class="tagbox" id="eTags"><input list="eTagList" id="eTagIn" placeholder="例如：BGG 機制"></div><datalist id="eTagList">${bankTags(b).map((t) => `<option>${esc(t)}</option>`).join('')}</datalist></div>
    </div>
    <div class="row" style="margin-top:16px"><button class="btn" id="eSave">💾 儲存</button><button class="btn ghost" id="eSaveNext">💾 儲存並新增下一題</button><button class="btn ghost" id="ePrev">👁 預覽</button><span class="sp"></span><span class="small muted" id="eMsg"></span></div>`,
    { wide: true, sticky: true, onClose: () => { if (dirty && !confirm('還有沒儲存的修改，確定要關閉嗎？')) return false; renderBank(); } });
  let t = q0.t, tags = (q0.tags || []).slice(), right = new Set(q0.a || []);
  // 自動儲存只在「題型沒變」時進行：改題型（例如單選改簡答會清掉選項）一定要老師自己按儲存，避免不小心把選項存掉
  const onChange = () => { dirty = true; clearTimeout(autoT); if (saved && t === savedT) { $('#eMsg', m).textContent = '✏️ 修改中…'; autoT = setTimeout(() => doSave(false, true), 1200); } else if (saved) $('#eMsg', m).textContent = '⚠️ 題型改了，要按「💾 儲存」才會存（不會自動儲存）'; else $('#eMsg', m).textContent = '✏️ 修改中…'; };
  const stemQ = await makeEditor($('#eStem', m), q0.s, { placeholder: '輸入題目…', onChange });
  const expQ = await makeEditor($('#eExp', m), q0.e, { placeholder: '（選填）答案的說明', onChange });
  const refQ = await makeEditor($('#eRef', m), q0.r || '', { mini: true, placeholder: '（選填）', onChange });
  let opts = []; // { q, row }
  async function addOpt(html) {
    const row = document.createElement('div'); row.className = 'optrow';
    row.innerHTML = `<label class="mark"><span class="L"></span><input type="checkbox"></label><div class="oed"></div><button type="button" class="btn ghost sm odel" title="刪除這個選項">✕</button>`;
    $('#eOpts', m).appendChild(row);
    const o = { row, q: await makeEditor($('.oed', row), html, { mini: true, placeholder: '選項內容', onChange }) };
    opts.push(o);
    $('.mark input', row).onchange = (e) => { const k = opts.indexOf(o); if (t === 's') { right = new Set(e.target.checked ? [k] : []); } else { e.target.checked ? right.add(k) : right.delete(k); } paintOpts(); onChange(); };
    $('.odel', row).onclick = () => {
      if (opts.length <= 2) return toast('至少要有 2 個選項');
      const k = opts.indexOf(o); opts.splice(k, 1); row.remove();
      right = new Set(Array.from(right).filter((x) => x !== k).map((x) => x > k ? x - 1 : x)); paintOpts(); onChange();
    };
    paintOpts();
  }
  function paintOpts() {
    opts.forEach((o, k) => { $('.L', o.row).textContent = X.LETTERS[k]; const c = $('.mark input', o.row); c.type = t === 's' ? 'radio' : 'checkbox'; c.name = 'eright'; c.checked = right.has(k); o.row.classList.toggle('right', right.has(k)); });
    $('#eAdd', m).disabled = opts.length >= 8;
  }
  for (const o of q0.o) await addOpt(o);
  function paintType() {
    $$('#eType label', m).forEach((l) => l.classList.toggle('on', $('input', l).value === t));
    $('#eOptsBox', m).classList.toggle('hidden', t === 'a');
    $('#eRefBox', m).classList.toggle('hidden', t !== 'a');
    $('#eOptHint', m).textContent = t === 's' ? '（點左邊的圓圈標出正確答案）' : t === 'm' ? '（勾選所有正確答案，可以不只一個）' : '';
    $('#eRule', m).textContent = t === 's' ? '🔘 單選：答對得全部配分（配分在建立測驗時依題型設定）。' : t === 'm' ? '☑️ 多重選擇題：每錯一個選項（該選沒選、不該選卻選）倒扣 1/5，等於扣該題配分 2/5，扣到 0 分為止；沒作答 0 分。建議 5 個選項。' : '✏️ 簡答：學生打字作答，由老師批閱給分。';
    if (t === 's' && right.size > 1) right = new Set([Math.min(...right)]);
    paintOpts();
  }
  $('#eType', m).onchange = async (e) => {
    const nt = e.target.value; if (nt === t) return;
    t = nt;
    if (t === 'm') while (opts.length < 5) await addOpt('');
    paintType(); onChange();
  };
  $('#eAdd', m).onclick = async () => { await addOpt(''); onChange(); opts[opts.length - 1].q.focus(); };
  $('#eLock', m).onchange = onChange; $('#eDiff', m).onchange = onChange;
  function paintTags() {
    $$('#eTags .chip', m).forEach((c) => c.remove());
    tags.forEach((tg, k) => { const c = document.createElement('span'); c.className = 'chip'; c.innerHTML = `#${esc(tg)}<button type="button" data-k="${k}">×</button>`; $('#eTagIn', m).before(c); });
  }
  $('#eTags', m).onclick = (e) => { const x = e.target.closest('[data-k]'); if (x) { tags.splice(+x.dataset.k, 1); paintTags(); onChange(); } else $('#eTagIn', m).focus(); };
  const addTag = () => { const v = $('#eTagIn', m).value.split(/[,，、]/).map((x) => x.trim().slice(0, 20)).filter(Boolean); v.forEach((x) => { if (!tags.includes(x)) tags.push(x); }); $('#eTagIn', m).value = ''; paintTags(); if (v.length) onChange(); };
  $('#eTagIn', m).onkeydown = (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } };
  $('#eTagIn', m).onblur = addTag;
  paintTags(); paintType();
  $('#eNo', m).textContent = isNew ? '' : `（第 ${qOrder(b).indexOf(id) + 1} 題）`;
  function collect() {
    const q = { t, s: stemQ.getHtml(), e: expQ.getHtml(), d: $('#eDiff', m).value, tags: tags.slice(), l: $('#eLock', m).checked, i: q0.i, at: q0.at, src: q0.src };
    if (t === 'a') { q.r = refQ.getHtml(); q.o = []; q.a = []; }
    else { q.o = opts.map((o) => o.q.getHtml()); q.a = Array.from(right).filter((k) => k < q.o.length).sort((x, y) => x - y); }
    return q;
  }
  function check(q) {
    if (!q.s) return '題目還沒有內容';
    if (q.t !== 'a') {
      if (q.o.length < 2) return '至少要有 2 個選項';
      const empty = q.o.findIndex((o) => !o); if (empty >= 0) return `選項 ${X.LETTERS[empty]} 是空的（不需要的選項按 ✕ 刪掉）`;
      if (!q.a.length) return q.t === 's' ? '請點選正確答案' : '請勾選正確答案';
      if (q.t === 's' && q.a.length !== 1) return '單選題只能有 1 個正確答案';
    }
    return '';
  }
  async function doSave(close, auto) {
    const busy = [stemQ, expQ, refQ].concat(opts.map((o) => o.q)).some((x) => x.busy());
    if (busy) { if (!auto) toast('圖片還在上傳，請稍等一下'); else { clearTimeout(autoT); autoT = setTimeout(() => doSave(false, true), 1200); } return false; }
    const q = collect(), err = check(q);
    if (err) { if (!auto) toast('⚠️ ' + err); else $('#eMsg', m).textContent = '⚠️ ' + err + '（還沒自動儲存）'; return false; }
    if (!q.i) q.i = nextI(bank);
    const sig = JSON.stringify(q);
    if (sig === lastSaved && auto) return true;
    try {
      await saveQ(bank, qid, q); q0.i = q.i; q0.at = BANKS[bank].q[qid].at; saved = true; dirty = false; lastSaved = sig; savedT = q.t;
      $('#eMsg', m).textContent = (auto ? '☁️ 已自動儲存 ' : '✅ 已儲存 ') + X.fmtClock(Date.now());
      $('#eNo', m).textContent = `（第 ${qOrder(b).indexOf(qid) + 1} 題）`;
      return true;
    } catch (e) { toast('儲存失敗：' + e.message); return false; }
  }
  $('#eSave', m).onclick = async () => { if (await doSave(true)) { m.close(); renderBank(); toast('✅ 已儲存'); } };
  $('#eSaveNext', m).onclick = async () => { if (await doSave(true)) { m.close(); renderBank(); openEditor(bank, null, { t, d: $('#eDiff', m).value, tags: tags.slice(), o: t === 'a' ? [] : (t === 'm' ? ['', '', '', '', ''] : ['', '', '', '']) }); } };
  $('#ePrev', m).onclick = () => previewQ(collect());
  m.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(false); } });
  setTimeout(() => stemQ.focus(), 50);
}

/* ---------- 匯入 ---------- */
function pickFile(accept, fn) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.onchange = () => inp.files[0] && fn(inp.files[0]); inp.click(); }
async function importWord(file) {
  const t = toast('📄 讀取 Word 檔中…', 4000); void t;
  try {
    await loadScript(LIB.mammoth);
    const ab = await file.arrayBuffer();
    const res = await window.mammoth.convertToHtml({ arrayBuffer: ab }, { styleMap: ['u => u', 'strike => s'] });
    const p = X.parseDocHtml(res.value);
    if (!p.qs.length) return toast('⚠️ 這個檔案裡找不到題目，請確認格式（題號「1.」開頭、選項「A.」、正確答案：B）', 5000);
    importPreview(p, file.name.replace(/\.docx$/i, ''), 'Word');
  } catch (e) { console.error(e); toast('讀取失敗：' + e.message, 4000); }
}
async function importExcel(file) {
  try {
    await loadScript(LIB.xlsx);
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const p = X.parseRows(rows);
    if (!p.qs.length) return toast('⚠️ ' + (p.warn[0] || '找不到題目'), 5000);
    importPreview(p, file.name.replace(/\.(xlsx|xls|csv)$/i, ''), 'Excel');
  } catch (e) { console.error(e); toast('讀取失敗：' + e.message, 4000); }
}
async function downloadTemplate() {
  await loadScript(LIB.xlsx);
  const XL = window.XLSX;
  const rows = [X.SHEET_HEAD,
    ['單選', '《哆寶》最主要的遊戲機制為何？', '圖像辨識', '競速', '動作', '快速配對', '', '', '', '', 'A', 'BGG 上的分類是 Speed Matching', '中', 'BGG 機制'],
    ['多重選擇', '下列哪些是巴圖理論的玩家類型？', '殺手型', '成就型', '探索型', '封閉型', '社交型', '', '', '', 'A B C E', '四種類型：成就、探索、社交、殺手', '中', '巴圖理論'],
    ['簡答', '請說明你的桌遊最想帶給玩家的感受，並舉一個機制說明。', '', '', '', '', '', '', '', '', '參考：成就感／新奇感…', '', '難', '期末作品']];
  const ws = XL.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 8 }, { wch: 40 }].concat(new Array(8).fill({ wch: 14 })).concat([{ wch: 10 }, { wch: 30 }, { wch: 6 }, { wch: 12 }]);
  const wb = XL.utils.book_new(); XL.utils.book_append_sheet(wb, ws, '題目'); XL.writeFile(wb, '線上檢定所_題目範本.xlsx');
}
function importPreview(p, name, kind) {
  const qs = p.qs, cnt = { s: 0, m: 0, a: 0 }; let imgs = 0, conv = 0;
  qs.forEach((q) => { cnt[q.t]++; imgs += countDataImgs(q.s) + q.o.reduce((a, o) => a + countDataImgs(o), 0) + countDataImgs(q.e); if (q.conv) conv++; });
  const banks = Object.keys(BANKS);
  const m = modal(`<h2>📥 匯入 ${kind}：${esc(name)}</h2>
    <div class="stats"><div class="stat"><b>${qs.length}</b><span>題目</span></div><div class="stat"><b>${cnt.s}</b><span>單選</span></div><div class="stat"><b>${cnt.m}</b><span>多重選擇</span></div><div class="stat"><b>${cnt.a}</b><span>簡答</span></div><div class="stat"><b>${imgs}</b><span>張圖片</span></div></div>
    ${conv ? `<p class="small" style="background:var(--soft);border-radius:10px;padding:8px 12px">☑️ 有 <b>${conv}</b> 題原本寫「複選題」，已改成<b>多重選擇題</b>（每錯一個選項倒扣 1/5，等於扣 2/5 題分，扣到 0 分為止）。</p>` : ''}
    ${p.warn.length ? `<div class="small" style="background:var(--warnbg);border-radius:10px;padding:8px 12px;margin-bottom:10px"><b>⚠️ 有 ${p.warn.length} 題需要檢查（黃色列）：</b><br>${p.warn.slice(0, 12).map(esc).join('<br>')}${p.warn.length > 12 ? '<br>…' : ''}</div>` : '<p class="small" style="color:var(--ok);font-weight:700">✅ 全部題目都讀得懂</p>'}
    <div class="scroll"><table class="t"><thead><tr><th class="num">#</th><th>題型</th><th>難</th><th>題目</th><th>選項</th><th>答案</th><th>解析</th></tr></thead><tbody>
      ${qs.map((q) => `<tr class="${q.warn && q.warn.length ? 'warn' : ''}"><td class="num">${q.num}</td><td>${X.TYPES[q.t]}</td><td>${q.d}</td><td>${esc(X.plain(q.s).slice(0, 60))}${countDataImgs(q.s) ? ' 🖼️' : ''}</td><td>${q.o.length || '—'}</td><td>${q.t === 'a' ? '—' : letterList(q.a)}</td><td>${q.e ? '✔' : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="grid2" style="margin-top:10px">
      <div><label class="f">匯入到哪個題庫</label><select id="iBank">${banks.map((id) => `<option value="${id}" ${id === IMPORT_TO ? 'selected' : ''}>${esc(BANKS[id].name)}</option>`).join('')}<option value="__new" ${IMPORT_TO && BANKS[IMPORT_TO] ? '' : 'selected'}>＋ 新題庫：${esc(name)}</option></select></div>
      <div><label class="f">幫這批題目加標籤（選填）</label><input type="text" id="iTag" value="${esc(name.slice(0, 20))}"></div>
    </div>
    <div id="iProg" class="hidden" style="margin-top:12px"><div class="prog"><i></i></div><p class="small muted" id="iProgT"></p></div>
    <div class="row" style="margin-top:14px"><button class="btn" id="iGo">📥 匯入 ${qs.length} 題</button><span class="small muted">圖片會自動壓縮（最長邊 1000px）再存到雲端</span></div>`, { wide: true, sticky: true });
  $('#iGo', m).onclick = async () => {
    const btn = $('#iGo', m); btn.disabled = true; $('.x', m).disabled = true;
    try {
      let bank = $('#iBank', m).value;
      if (bank === '__new') bank = await newBank(name);
      const tag = $('#iTag', m).value.trim().slice(0, 20);
      $('#iProg', m).classList.remove('hidden');
      let done = 0; const bar = $('#iProg i', m), txt = $('#iProgT', m);
      const tick = () => { done++; bar.style.width = Math.round(done / Math.max(1, imgs) * 100) + '%'; txt.textContent = `🖼️ 圖片壓縮上傳 ${done}／${imgs}`; };
      if (!imgs) txt.textContent = '寫入題目中…';
      let i = nextI(bank); const add = {};
      for (const q of qs) {
        const s = await uploadHtmlImages(q.s, tick), o = []; for (const x of q.o) o.push(await uploadHtmlImages(x, tick));
        const e = await uploadHtmlImages(q.e, tick);
        const tags = (q.tags || []).slice(); if (tag && !tags.includes(tag)) tags.push(tag);
        add[X.newId(10)] = clean({ t: q.t, s, o: q.t === 'a' ? [] : o, a: q.t === 'a' ? [] : q.a, r: q.r || '', e, d: q.d || '中', tags, i: i++, at: Date.now(), src: name.slice(0, 60) });
      }
      txt.textContent = '寫入題目中…';
      const keys = Object.keys(add);
      for (let k = 0; k < keys.length; k += 40) { const part = {}; keys.slice(k, k + 40).forEach((x) => { part[x] = add[x]; }); await FB.update(`exam/bk/${ME.uid}/${bank}/q`, part); }
      keys.forEach((x) => { BANKS[bank].q[x] = normQ(add[x]); });
      SEL.clear(); m.close(); showTab('bank'); openBank(bank); toast(`✅ 已匯入 ${keys.length} 題`, 3500);
    } catch (e) { console.error(e); toast('匯入失敗：' + e.message, 5000); btn.disabled = false; $('.x', m).disabled = false; }
  };
}
async function exportBank(bank) {
  const b = BANKS[bank]; if (!b) return;
  const img = {};
  for (const q of Object.values(b.q)) { const h = [q.s, q.e, q.r].concat(q.o || []).join(' '); for (const id of X.imgIds(h)) img[id] = await getImg(id); }
  download(`線上檢定所題庫_${b.name}_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'wuyutzu-exam', v: 1, name: b.name, subj: b.subj || '', at: Date.now(), q: b.q, img }));
  toast(`💾 已下載（${Object.keys(b.q).length} 題、${Object.keys(img).length} 張圖）`);
}
async function importBackup(file) {
  let d; try { d = JSON.parse(await file.text()); } catch (e) { return toast('這不是題庫備份檔'); }
  if (!d || d.app !== 'wuyutzu-exam' || !d.q) return toast('這不是線上檢定所的題庫備份檔');
  const n = Object.keys(d.q).length;
  if (!confirm(`要把「${d.name}」（${n} 題）匯入成一個新題庫嗎？`)) return;
  toast('匯入中…', 5000);
  const bank = await newBank(d.name + '（匯入）', d.subj), map = {};
  for (const id of Object.keys(d.img || {})) { if (!d.img[id]) continue; try { const r = await uploadImg(d.img[id]); map[id] = r.id; } catch (e) { console.warn(e); } }
  const fix = (h) => String(h || '').replace(/data-img="([a-z0-9]+)"/g, (m0, id) => map[id] ? `data-img="${map[id]}"` : m0);
  const add = {}; let i = 1;
  Object.keys(d.q).sort((a, b) => (d.q[a].i || 0) - (d.q[b].i || 0)).forEach((id) => { const q = normQ(Object.assign({}, d.q[id])); add[X.newId(10)] = clean({ t: q.t, s: fix(q.s), o: q.t === 'a' ? [] : q.o.map(fix), a: q.t === 'a' ? [] : q.a, r: fix(q.r), e: fix(q.e), d: q.d, tags: q.tags, l: q.l || null, i: i++, at: Date.now(), src: q.src }); });
  await FB.update(`exam/bk/${ME.uid}/${bank}/q`, add);
  Object.keys(add).forEach((x) => { BANKS[bank].q[x] = normQ(add[x]); });
  openBank(bank); toast(`✅ 已匯入 ${n} 題`);
}

/* =====================================================================
   📝 測驗（2026-10-23 改版：學期、科目、用途、日期；建立測驗改成分頁精靈；配分依題型）
   ===================================================================== */
const lastUsed = () => { try { return JSON.parse(localStorage.getItem('exam:last')) || {}; } catch (e) { return {}; } };
const saveLast = (o) => { try { localStorage.setItem('exam:last', JSON.stringify(Object.assign(lastUsed(), o))); } catch (e) { } };
const termOptions = (extra) => { const cur = X.currentTerm(), [y, s] = cur.split('-').map(Number); const list = [s === 1 ? `${y - 1}-2` : `${y}-1`, cur, s === 1 ? `${y}-2` : `${y + 1}-1`, s === 1 ? `${y - 1}-1` : `${y - 1}-2`]; (extra || []).forEach((t) => { if (X.validTerm(t) && !list.includes(t)) list.push(t); }); return list.sort().reverse(); };
const examWhen = (e) => e.date || e.openAt || e.at || 0;
let EF = { term: null, subj: '', use: '', kw: '' };
async function loadExams() {
  let own = {}; try { own = (await FB.get('exam/owners/' + ME.uid)) || {}; } catch (e) { toast('讀取測驗清單失敗'); }
  EXAMS = {};
  await Promise.all(Object.keys(own).map(async (code) => { try { const meta = await FB.get(`exam/m/${code}/meta`); if (meta) EXAMS[code] = meta; } catch (e) { } }));
}
const stChip = (meta) => { const s = X.stateOf(meta); return `<span class="chip ${s === 'open' ? 'ok' : s === 'closed' ? 'gray' : 'warn'}">${X.STATE[s]}</span>`; };
const tagChips = (e) => `${e.term ? `<span class="chip blue">${esc(e.term)}</span>` : '<span class="chip gray">未分學期</span>'}${e.subj ? `<span class="chip">${esc(e.subj)}</span>` : ''}${e.use ? `<span class="chip warn">${esc(e.use)}</span>` : ''}`;
function renderExams() {
  CUR = null; stopGrader(); history.replaceState(null, '', location.pathname + location.search);
  const all = Object.keys(EXAMS);
  const terms = Array.from(new Set(all.map((c) => EXAMS[c].term || ''))).sort().reverse();
  if (EF.term === null && all.length) EF.term = terms.includes(X.currentTerm()) ? X.currentTerm() : '';
  const subs = Array.from(new Set(all.map((c) => EXAMS[c].subj).filter(Boolean))).sort();
  const uses = Array.from(new Set(all.map((c) => EXAMS[c].use).filter(Boolean)));
  const codes = all.filter((c) => { const e = EXAMS[c]; if (EF.term && (e.term || '') !== (EF.term === '-' ? '' : EF.term)) return false; if (EF.subj && e.subj !== EF.subj) return false; if (EF.use && e.use !== EF.use) return false; if (EF.kw && !(e.title + ' ' + c).toLowerCase().includes(EF.kw.toLowerCase())) return false; return true; })
    .sort((a, b) => examWhen(EXAMS[b]) - examWhen(EXAMS[a]));
  $('#t-exams').innerHTML = `<div class="card"><div class="row"><h2>📝 我的測驗</h2><span class="sp"></span><button class="btn" id="xNew">＋ 新測驗</button></div>
    ${all.length ? `<div class="filters"><select id="eT"><option value="">全部學期</option>${terms.map((t) => `<option value="${t || '-'}" ${(EF.term === t && t) || (EF.term === '-' && !t) ? 'selected' : ''}>${t ? esc(X.termName(t)) : '未分學期'}</option>`).join('')}</select>
      <select id="eS"><option value="">全部科目</option>${subs.map((s) => `<option ${EF.subj === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select id="eU"><option value="">全部用途</option>${uses.map((s) => `<option ${EF.use === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <input type="text" id="eK" placeholder="🔍 搜尋名稱或代碼" value="${esc(EF.kw)}"></div>
      <p class="small muted" style="margin:8px 0 0">共 ${all.length} 份${codes.length !== all.length ? `，篩選後 ${codes.length} 份` : ''}（依測驗日期排序，新的在前）</p>` : ''}
    ${codes.length ? `<div class="elist" style="margin-top:14px">${codes.map((c) => { const e = EXAMS[c]; return `<div class="ecard" role="button" tabindex="0" data-c="${c}"><button type="button" class="cardx" data-del="${c}" title="刪除這份測驗">🗑</button><div class="row" style="gap:6px"><span class="code">${c}</span>${stChip(e)}${e.pub ? '<span class="chip ok">📣 已公布</span>' : ''}</div>
      <b style="margin-top:6px">${esc(e.title)}</b><div class="row" style="gap:4px;margin:4px 0">${tagChips(e)}</div>
      <div class="small muted">📅 ${examWhen(e) ? X.fmtTime(examWhen(e)) : '—'}・${e.n || 0} 題・滿分 ${e.total || 0}・${e.mins} 分鐘・${e.tries >= 20 ? '不限次數' : e.tries + ' 次'}</div>
      <div class="small muted">${e.openAt ? '開放 ' + X.fmtTime(e.openAt) : '手動開放'}${e.closeAt ? '｜截止 ' + X.fmtTime(e.closeAt) : ''}</div></div>`; }).join('')}</div>`
    : `<div class="empty"><div style="font-size:3rem">📝</div><p>${all.length ? '沒有符合篩選的測驗。' : Object.keys(BANKS).length ? '還沒有測驗。按「＋ 新測驗」從題庫挑題目。' : '先到「📚 題庫」建立題目（可以直接匯入 Word 考卷或 Excel），再回來建立測驗。'}</p></div>`}</div>`;
  $('#xNew').onclick = () => { if (!Object.keys(BANKS).some((id) => Object.keys(BANKS[id].q || {}).length)) { toast('題庫裡還沒有題目，先去建題庫吧'); return showTab('bank'); } examForm(null); };
  const on = (id, k) => { const x = $('#' + id); if (x) x.onchange = (e) => { EF[k] = e.target.value; renderExams(); }; };
  on('eT', 'term'); on('eS', 'subj'); on('eU', 'use');
  const kk = $('#eK'); if (kk) { let t = null; kk.oninput = (e) => { clearTimeout(t); t = setTimeout(() => { EF.kw = e.target.value.trim(); renderExams(); const k = $('#eK'); k.focus(); k.setSelectionRange(k.value.length, k.value.length); }, 350); }; }
  $$('#t-exams .ecard').forEach((b) => { b.onclick = (e) => { if (e.target.closest('[data-del]')) return; openExam(b.dataset.c); }; b.onkeydown = (e) => { if (e.key === 'Enter') openExam(b.dataset.c); }; });
  $$('#t-exams [data-del]').forEach((x) => { x.onclick = (e) => { e.stopPropagation(); deleteExam(x.dataset.del); }; });
}

/* ---------- 建立／修改測驗（分頁精靈） ---------- */
const STEPS = [['basic', '① 基本資料'], ['pick', '② 選題'], ['score', '③ 配分'], ['time', '④ 時間與次數'], ['rule', '⑤ 打亂與反作弊'], ['done', '⑥ 名單與確認']];
async function examForm(code) {
  const old = code ? EXAMS[code] : null, last = lastUsed();
  const meta = JSON.parse(JSON.stringify(Object.assign({}, X.DEFAULT_META, old || {})));
  meta.guard = Object.assign({}, X.DEFAULT_META.guard, meta.guard || {});
  let paper = {}, picked = new Set(), attempts = 0, onlyPicked = false, pg = 1;
  if (code) {
    paper = (await FB.get(`exam/m/${code}/paper`)) || {};
    Object.keys(paper).forEach((id) => { picked.add(id); paper[id].o = arr(paper[id].o); });
    try { attempts = Object.keys((await FB.get(`exam/m/${code}/s`)) || {}).length; } catch (e) { }
  }
  // 配分：舊測驗沒有 pts 時，從題目快照推回來
  const pts = Object.assign({}, X.DEFAULT_META.pts, last.pts || {}, old && old.pts || {});
  if (old && !old.pts) Object.values(paper).forEach((q) => { if (q.p != null) pts[q.t] = q.p; });
  if (!code) { meta.term = X.currentTerm(); meta.subj = last.subj || ''; meta.use = last.use || '平時測驗'; meta.date = 0; }
  if (!meta.term) meta.term = X.currentTerm();
  let bank = (old && old.bank && BANKS[old.bank]) ? old.bank : (BANKS[CURB] && Object.keys(BANKS[CURB].q).length ? CURB : bankIds().find((id) => Object.keys(BANKS[id].q || {}).length));
  const f = { t: '', d: '', tag: '', kw: '' };
  const missing = code ? Object.keys(paper).filter((id) => !(BANKS[bank] && BANKS[bank].q[id])) : [];
  const subs = Array.from(new Set(X.SUBJECTS.concat(Object.values(EXAMS).map((e) => e.subj), Object.values(BANKS).map((b) => b.subj)).filter(Boolean)));
  let step = 'basic';
  const m = modal(`<h2>${code ? '⚙️ 修改測驗' : '＋ 新測驗'}</h2>
    ${attempts ? `<p class="small" style="background:var(--warnbg);border-radius:10px;padding:8px 12px">⚠️ 已經有 ${attempts} 位學生作答。改時間、次數不影響已交的考卷；<b>改題目或配分會重新計分</b>。</p>` : ''}
    <div class="tabs subtabs" id="wSteps">${STEPS.map(([k, n]) => `<button type="button" data-st="${k}">${n}</button>`).join('')}</div>
    <section data-step="basic"><div class="grid2">
      <div style="grid-column:1/-1"><label class="f">測驗名稱</label><input type="text" id="fTitle" maxlength="60" value="${esc(meta.title)}" placeholder="例如：遊戲設計思考 期末檢定"></div>
      <div><label class="f">學期</label><select id="fTerm">${termOptions([meta.term]).map((t) => `<option value="${t}" ${meta.term === t ? 'selected' : ''}>${esc(X.termName(t))}（${t}）</option>`).join('')}</select></div>
      <div><label class="f">科目</label><input type="text" id="fSubj" maxlength="20" list="fSubjL" value="${esc(meta.subj || '')}" placeholder="例如：遊戲設計思考"><datalist id="fSubjL">${subs.map((s) => `<option>${esc(s)}</option>`).join('')}</datalist></div>
      <div><label class="f">測驗用途</label><select id="fUse">${X.USES.concat(X.USES.includes(meta.use) || !meta.use ? [] : [meta.use]).map((u) => `<option ${meta.use === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
      <div><label class="f">測驗日期時間（記錄與排序用）</label><input type="datetime-local" id="fDate" value="${toLocalInput(meta.date || meta.openAt || Date.now())}"></div>
      <div style="grid-column:1/-1"><label class="f">說明（學生進場前會看到，選填）</label><textarea id="fDesc" rows="2" maxlength="1000" placeholder="例如：範圍是第 1～8 週，可以用平板作答。">${esc(meta.desc || '')}</textarea></div></div>
      <p class="small muted">學期、科目、用途會顯示在學生的測驗首頁，也用來在「我的測驗」分類篩選、匯出成績。</p></section>
    <section data-step="pick">
      ${missing.length ? `<p class="small" style="color:var(--warn)">有 ${missing.length} 題在題庫裡找不到（可能被刪掉或換了題庫），會保留原本的題目。</p>` : ''}
      <div class="row"><b>題庫</b><select id="fBank" style="width:auto">${bankIds().map((id) => `<option value="${id}" ${id === bank ? 'selected' : ''}>${esc(BANKS[id].name)}${BANKS[id].subj ? '｜' + esc(BANKS[id].subj) : ''}（${Object.keys(BANKS[id].q || {}).length}）</option>`).join('')}</select></div>
      <div class="filters"><select id="pT"><option value="">全部題型</option>${Object.keys(X.TYPES).map((t) => `<option value="${t}">${X.TYPES[t]}</option>`).join('')}</select>
        <select id="pD"><option value="">全部難易度</option>${X.DIFFS.map((d) => `<option>${d}</option>`).join('')}</select><select id="pG"></select><input type="text" id="pK" placeholder="🔍 搜尋"></div>
      <div class="row small" style="margin:8px 0"><button type="button" class="btn ghost sm" id="pAll">☑ 全選篩選出來的題目</button><button type="button" class="btn ghost sm" id="pNone">☐ 取消篩選出來的題目</button><label class="ck"><input type="checkbox" id="pOnly">只看已選的題目</label></div>
      <div id="pPgT"></div><div class="pick" id="pList"></div><div id="pPgB"></div>
      <div class="sumbar" id="pSum"></div>
      <div class="row" style="margin-top:10px"><b>每位學生隨機抽</b><input type="number" id="fDraw" min="0" max="500" value="${meta.draw || 0}" style="width:90px">題<span class="small muted">（0＝選的題目全部都考；抽題時每個人拿到的題目不同）</span></div></section>
    <section data-step="score">
      <p class="small muted" style="margin-top:0">配分由老師依題型設定（題庫只記題目，不記配分）。</p>
      <div class="tscroll" style="max-height:none"><table class="t"><thead><tr><th>題型</th><th class="num">題數</th><th>每題配分</th><th class="num">小計</th></tr></thead><tbody id="sBody"></tbody></table></div>
      <div class="sumbar" id="sSum"></div>
      <p class="small" style="background:var(--soft);border-radius:10px;padding:8px 12px">☑️ 多重選擇題：每錯一個選項（該選沒選、不該選卻選都算）<b>倒扣 1/5</b>，也就是扣該題配分的 <b>2/5</b>，扣到 0 分為止；沒作答 0 分。例：配分 2 分，錯 1 個得 1.2 分、錯 2 個得 0.4 分、錯 3 個以上 0 分。</p></section>
    <section data-step="time">
      <div class="row"><label class="ck"><input type="radio" name="om" value="manual" ${!meta.openAt ? 'checked' : ''}>手動開放（建立後在測驗頁按「▶ 開放作答」）</label><label class="ck"><input type="radio" name="om" value="time" ${meta.openAt ? 'checked' : ''}>排程：到時間自動開放</label></div>
      <div class="grid2"><div id="oaBox"><label class="f">開放時間</label><input type="datetime-local" id="fOpenAt" value="${toLocalInput(meta.openAt)}"></div>
        <div><label class="f"><label class="ck" style="margin:0"><input type="checkbox" id="fHasClose" ${meta.closeAt ? 'checked' : ''}>截止時間（時間到自動關閉）</label></label><input type="datetime-local" id="fCloseAt" value="${toLocalInput(meta.closeAt)}"></div>
        <div><label class="f">作答時間（分鐘，按「開始作答」起算）</label><input type="number" id="fMins" min="1" max="600" value="${meta.mins}"></div></div>
      <p class="small muted">不論哪一種，老師都可以隨時在測驗頁按「⏹ 關閉並收卷」。離截止時間不到作答時間時，以截止時間為準。</p>
      <div class="grid2" style="margin-top:6px"><div><label class="f">可以作答幾次</label><select id="fTries">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}" ${meta.tries === n ? 'selected' : ''}>${n} 次</option>`).join('')}<option value="20" ${meta.tries >= 20 ? 'selected' : ''}>不限（最多 20 次）</option></select></div>
        <div id="polBox"><label class="f">多次作答怎麼採計</label><select id="fPolicy">${Object.keys(X.POLICY).map((k) => `<option value="${k}" ${meta.policy === k ? 'selected' : ''}>${X.POLICY[k].name}：${X.POLICY[k].desc}</option>`).join('')}</select></div></div>
      <div id="gapBox" class="row" style="margin-top:8px"><label class="ck"><input type="checkbox" id="fGapOn" ${meta.gap ? 'checked' : ''}>⏳ 兩次作答之間至少間隔</label><input type="number" id="fGap" min="1" max="10080" value="${meta.gap || 10}" style="width:90px">分鐘
        <label class="ck"><input type="checkbox" id="fReshuf" ${meta.reshuf ? 'checked' : ''}>🔀 每次重考都重新抽題／打亂</label></div></section>
    <section data-step="rule">
      <h3>🔀 打亂與提示</h3>
      <div class="row" style="gap:4px 16px">
        <span class="ckt"><label class="ck"><input type="checkbox" id="fShufQ" ${meta.shufQ ? 'checked' : ''}>題目順序打亂</label>${tip('依學號固定打亂：同一個人重新整理，順序不會變；不同同學看到的順序不一樣。')}</span>
        <span class="ckt"><label class="ck"><input type="checkbox" id="fShufO" ${meta.shufO ? 'checked' : ''}>選項順序打亂</label>${tip('題庫裡標「🔒 選項順序固定」的題目（例如有「以上皆是」）不會打亂。')}</span>
        <span class="ckt"><label class="ck"><input type="checkbox" id="fNeed" ${meta.showNeed ? 'checked' : ''}>多重選擇題提示</label>${tip('學生作答時，在多重選擇題旁邊顯示「本題應選 N 項」。')}</span>
      </div>
      <h3 style="margin-top:16px">🛡️ 反作弊</h3>
      <span class="ckt"><label class="ck"><input type="checkbox" id="gOn" ${meta.guard.on ? 'checked' : ''}>開啟反作弊</label>${tip('作答時進入全螢幕。會偵測：離開全螢幕、切換分頁或 App、視窗失去焦點、太久沒動作（「你還在嗎？」30 秒沒回應直接代結）。iPhone 的 Safari 不支援網頁全螢幕，只偵測切換頁面與閒置。')}</span>
      <div class="grid3" id="gBox"><div><label class="f">違規幾次就由系統代結 ${tip('第 1 次到上限前一次只會跳警告；達到上限時系統用已存的答案代為交卷，成績單標「🚨 系統代結」。')}</label><select id="gMax">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${meta.guard.max === n ? 'selected' : ''}>${n} 次${n === 1 ? '（一違規就代結）' : n === 2 ? '（預設：第 1 次警告）' : ''}</option>`).join('')}</select></div>
        <div><label class="f">幾分鐘沒動作算閒置 ${tip('填 0＝不偵測閒置。')}</label><input type="number" id="gIdle" min="0" max="60" value="${meta.guard.idle}"></div>
        <div><label class="f">失焦幾秒算違規 ${tip('平板開分割畫面、浮動視窗時會失去焦點。填 0＝不偵測失焦。')}</label><input type="number" id="gBlur" min="0" max="60" value="${meta.guard.blur}"></div></div>
    </section>
    <section data-step="done">
      <h3>👥 學生名單</h3>
      <label class="ck"><input type="checkbox" id="fRoster" ${meta.rosterOnly ? 'checked' : ''}>只限名單內的學生進入（班級、座號、姓名、學號都要對得上）</label>
      <p class="small muted">名單在測驗頁的「👥 名單」分頁匯入。不勾也可以匯入名單，用來核對誰還沒考。</p>
      <h3 style="margin-top:12px">📋 確認設定</h3><div id="wSum" class="small"></div></section>
    <div class="row" style="margin-top:16px;border-top:2px solid var(--line);padding-top:12px"><button type="button" class="btn ghost" id="wPrev">← 上一步</button><button type="button" class="btn ghost" id="wNext">下一步 →</button><span class="sp"></span><span class="small muted" id="fMsg"></span><button class="btn lg" id="fSave">${code ? '💾 儲存修改' : '✅ 建立測驗'}</button></div>`, { wide: true, sticky: true });
  const B = () => BANKS[bank] || { q: {} };
  const qOf = (id) => B().q[id] || (paper[id] ? { t: paper[id].t, s: paper[id].s, d: '' } : null);
  const curPts = () => ({ s: +$('#ptS', m)?.value || 0, m: +$('#ptM', m)?.value || 0, a: +$('#ptA', m)?.value || 0 });
  const counts = () => { const c = { s: 0, m: 0, a: 0 }; picked.forEach((id) => { const q = qOf(id); if (q) c[q.t]++; }); return c; };
  function go(k) {
    step = k;
    $$('section[data-step]', m).forEach((s) => s.classList.toggle('hidden', s.dataset.step !== k));
    $$('#wSteps button', m).forEach((b) => b.classList.toggle('on', b.dataset.st === k));
    const i = STEPS.findIndex((s) => s[0] === k);
    $('#wPrev', m).disabled = i === 0; $('#wNext', m).classList.toggle('hidden', i === STEPS.length - 1);
    if (k === 'score') paintScore(); if (k === 'done') paintWSum(); if (k === 'pick') paintPick();
    m.scrollTop = 0;
  }
  $('#wSteps', m).onclick = (e) => { const b = e.target.closest('[data-st]'); if (b) go(b.dataset.st); };
  $('#wPrev', m).onclick = () => { const i = STEPS.findIndex((s) => s[0] === step); if (i > 0) go(STEPS[i - 1][0]); };
  $('#wNext', m).onclick = () => { const i = STEPS.findIndex((s) => s[0] === step); if (i < STEPS.length - 1) go(STEPS[i + 1][0]); };
  function paintPick() {
    const b = B(), order = qOrder(b), ids = order.filter((id) => matchQ(b.q[id], f) && (!onlyPicked || picked.has(id)));
    const pages = Math.max(1, Math.ceil(ids.length / PAGE_N)); if (pg > pages) pg = pages;
    $('#pG', m).innerHTML = `<option value="">全部標籤</option>${bankTags(b).map((t) => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
    $('#pList', m).innerHTML = ids.length ? ids.slice((pg - 1) * PAGE_N, pg * PAGE_N).map((id) => { const q = b.q[id]; return `<label><input type="checkbox" data-id="${id}" ${picked.has(id) ? 'checked' : ''}><span class="small muted mono">${order.indexOf(id) + 1}</span><span>${esc(X.plain(q.s).slice(0, 120))}${X.hasImg(q.s) ? ' 🖼️' : ''}</span><span class="row" style="gap:4px">${typeChip(q.t)}<span class="chip gray">${q.d}</span></span></label>`; }).join('') : '<div class="empty small">沒有符合的題目</div>';
    const ph = pagerHTML(ids.length, pg, PAGE_N); $('#pPgT', m).innerHTML = ph; $('#pPgB', m).innerHTML = ph;
    paintSum();
  }
  function paintSum() {
    const c = counts(), n = c.s + c.m + c.a;
    const draw = +$('#fDraw', m).value || 0;
    $('#pSum', m).innerHTML = `已選 <span class="chip">${n} 題</span> 單選 ${c.s}・多重選擇 ${c.m}・簡答 ${c.a}<span class="sp"></span>${draw > 0 && draw < n ? `每人抽 ${draw} 題` : ''}`;
    const w = $('#wSteps button[data-st="pick"]', m); if (w) w.textContent = `② 選題（${n}）`;
  }
  function paintScore() {
    const c = counts(), p = pts;
    $('#sBody', m).innerHTML = ['s', 'm', 'a'].map((t) => `<tr><td>${typeChip(t)}</td><td class="num">${c[t]}</td><td><input type="number" id="pt${t === 's' ? 'S' : t === 'm' ? 'M' : 'A'}" min="0" max="100" step="0.5" value="${p[t]}" style="width:100px"> 分</td><td class="num" data-sub="${t}"></td></tr>`).join('');
    const upd = () => { const q = curPts(); Object.assign(pts, q); let tot = 0; ['s', 'm', 'a'].forEach((t) => { const v = X.round2(c[t] * q[t]); tot += v; $(`[data-sub="${t}"]`, m).textContent = v; }); const draw = +$('#fDraw', m).value || 0, n = c.s + c.m + c.a; $('#sSum', m).innerHTML = draw > 0 && draw < n ? `每人隨機抽 ${draw} 題，滿分依抽到的題目計算（全部 ${n} 題合計 ${X.round2(tot)} 分）` : `滿分 <span class="chip ok">${X.round2(tot)} 分</span>`; };
    $$('#sBody input', m).forEach((i) => { i.oninput = upd; }); upd();
  }
  function paintWSum() {
    const c = counts(), n = c.s + c.m + c.a, tries = +$('#fTries', m).value, om = $('input[name=om]:checked', m).value;
    const tot = X.round2(c.s * pts.s + c.m * pts.m + c.a * pts.a);
    $('#wSum', m).innerHTML = `<ul style="margin:4px 0;padding-left:1.3em;line-height:1.9">
      <li><b>${esc($('#fTitle', m).value.trim() || '（還沒取名）')}</b>｜${esc(X.termName($('#fTerm', m).value))}｜${esc($('#fSubj', m).value.trim() || '（未填科目）')}｜${esc($('#fUse', m).value)}｜📅 ${esc(($('#fDate', m).value || '').replace('T', ' '))}</li>
      <li>題目：${n} 題（單選 ${c.s}・多重選擇 ${c.m}・簡答 ${c.a}）${+$('#fDraw', m).value > 0 ? `，每人抽 ${+$('#fDraw', m).value} 題` : ''}；配分 單選 ${pts.s}・多重選擇 ${pts.m}・簡答 ${pts.a}，滿分 ${tot}</li>
      <li>時間：${om === 'time' ? '排程 ' + esc(($('#fOpenAt', m).value || '').replace('T', ' ')) + ' 自動開放' : '手動開放'}${$('#fHasClose', m).checked ? '，截止 ' + esc(($('#fCloseAt', m).value || '').replace('T', ' ')) : ''}；作答 ${$('#fMins', m).value} 分鐘</li>
      <li>次數：${tries >= 20 ? '不限' : tries + ' 次'}${tries > 1 ? `，${X.POLICY[$('#fPolicy', m).value].name}${$('#fGapOn', m).checked ? `，間隔 ${$('#fGap', m).value} 分鐘` : ''}` : ''}</li>
      <li>打亂：題目${$('#fShufQ', m).checked ? '✅' : '—'} 選項${$('#fShufO', m).checked ? '✅' : '—'}；反作弊：${$('#gOn', m).checked ? `開（違規 ${$('#gMax', m).value} 次代結、閒置 ${$('#gIdle', m).value} 分）` : '關'}</li></ul>`;
  }
  $('#fBank', m).onchange = (e) => { bank = e.target.value; pg = 1; paintPick(); };
  $('#pT', m).onchange = (e) => { f.t = e.target.value; pg = 1; paintPick(); };
  $('#pD', m).onchange = (e) => { f.d = e.target.value; pg = 1; paintPick(); };
  $('#pG', m).onchange = (e) => { f.tag = e.target.value; pg = 1; paintPick(); };
  $('#pK', m).oninput = (e) => { f.kw = e.target.value.trim(); pg = 1; paintPick(); };
  $('#pOnly', m).onchange = (e) => { onlyPicked = e.target.checked; pg = 1; paintPick(); };
  [$('#pPgT', m), $('#pPgB', m)].forEach((p) => { p.onclick = (e) => { const x = e.target.closest('[data-pg]'); if (!x || x.disabled) return; pg = +x.dataset.pg; paintPick(); }; });
  $('#pList', m).onchange = (e) => { const id = e.target.dataset.id; if (!id) return; e.target.checked ? picked.add(id) : picked.delete(id); paintSum(); };
  $('#pAll', m).onclick = () => { qOrder(B()).filter((id) => matchQ(B().q[id], f)).forEach((id) => picked.add(id)); paintPick(); };
  $('#pNone', m).onclick = () => { qOrder(B()).filter((id) => matchQ(B().q[id], f)).forEach((id) => picked.delete(id)); paintPick(); };
  $('#fDraw', m).oninput = paintSum;
  const paintTime = () => {
    $('#oaBox', m).classList.toggle('hidden', $('input[name=om]:checked', m).value !== 'time');
    $('#fCloseAt', m).disabled = !$('#fHasClose', m).checked;
    const tr = +$('#fTries', m).value; $('#polBox', m).classList.toggle('hidden', tr < 2); $('#gapBox', m).classList.toggle('hidden', tr < 2);
    $('#fGap', m).disabled = !$('#fGapOn', m).checked;
    $('#gBox', m).classList.toggle('hidden', !$('#gOn', m).checked);
  };
  ['fHasClose', 'fTries', 'fGapOn', 'gOn'].forEach((id) => { $('#' + id, m).onchange = paintTime; });
  $$('input[name=om]', m).forEach((r) => { r.onchange = paintTime; });
  $('#fOpenAt', m).onchange = () => { if ($('#fOpenAt', m).value && !code) $('#fDate', m).value = $('#fOpenAt', m).value; };
  paintTime(); go('basic'); paintSum();
  $('#fSave', m).onclick = async () => {
    const msg = (t, st) => { $('#fMsg', m).textContent = t; toast(t); if (st) go(st); };
    const title = $('#fTitle', m).value.trim();
    if (!title) return msg('⚠️ 請輸入測驗名稱', 'basic');
    const subj = $('#fSubj', m).value.trim().slice(0, 20);
    if (!subj) return msg('⚠️ 請填科目', 'basic');
    const date = fromLocalInput($('#fDate', m).value);
    if (!date) return msg('⚠️ 請設定測驗日期時間', 'basic');
    const ids = Array.from(picked).filter((id) => B().q[id] || paper[id]);
    if (!ids.length) return msg('⚠️ 請至少選一題', 'pick');
    if ($('#ptS', m)) Object.assign(pts, curPts());
    if (['s', 'm', 'a'].some((t) => !(pts[t] >= 0 && pts[t] <= 100))) return msg('⚠️ 配分要 0～100', 'score');
    const om = $('input[name=om]:checked', m).value;
    const openAt = om === 'time' ? fromLocalInput($('#fOpenAt', m).value) : 0;
    const closeAt = $('#fHasClose', m).checked ? fromLocalInput($('#fCloseAt', m).value) : 0;
    if (om === 'time' && !openAt) return msg('⚠️ 請設定開放時間', 'time');
    if ($('#fHasClose', m).checked && !closeAt) return msg('⚠️ 請設定截止時間', 'time');
    if (closeAt && openAt && closeAt <= openAt) return msg('⚠️ 截止時間要比開放時間晚', 'time');
    const mins = Math.round(+$('#fMins', m).value);
    if (!(mins >= 1 && mins <= 600)) return msg('⚠️ 作答時間要 1～600 分鐘', 'time');
    const tries = +$('#fTries', m).value;
    // 題目快照（照題庫順序）；配分＝老師設定的題型配分
    const order = qOrder(B()).filter((id) => picked.has(id)).concat(ids.filter((id) => !B().q[id]));
    const np = {}, nk = {}; let total = 0;
    const need = $('#fNeed', m).checked;
    order.forEach((id, i) => {
      const q = B().q[id];
      if (!q) { np[id] = Object.assign({}, paper[id], { i, p: pts[paper[id].t] }); total += np[id].p; return; }
      const p = pts[q.t]; total += p;
      np[id] = clean({ i, t: q.t, s: q.s, o: q.t === 'a' ? [] : q.o, l: q.l ? true : null, p, need: need && q.t === 'm' ? q.a.length : null });
      nk[id] = clean({ a: q.t === 'a' ? [] : q.a, r: q.r || '', e: q.e || '' });
    });
    const draw = Math.max(0, Math.min(500, Math.round(+$('#fDraw', m).value || 0)));
    const nm = Object.assign({}, meta, {
      title: title.slice(0, 60), desc: $('#fDesc', m).value.trim().slice(0, 1000), term: $('#fTerm', m).value, subj, use: $('#fUse', m).value, date,
      pts: { s: pts.s, m: pts.m, a: pts.a }, openAt, closeAt, mins, tries,
      policy: $('#fPolicy', m).value, gap: tries > 1 && $('#fGapOn', m).checked ? Math.max(1, Math.round(+$('#fGap', m).value || 0)) : 0,
      reshuf: $('#fReshuf', m).checked, draw: draw >= order.length ? 0 : draw, shufQ: $('#fShufQ', m).checked, shufO: $('#fShufO', m).checked, showNeed: need,
      rosterOnly: $('#fRoster', m).checked, n: order.length, total: X.round2(total), bank: bank || '',
      guard: { on: $('#gOn', m).checked, max: +$('#gMax', m).value, idle: Math.max(0, Math.min(60, Math.round(+$('#gIdle', m).value || 0))), blur: Math.max(0, Math.min(60, Math.round(+$('#gBlur', m).value || 0))) }
    });
    if (!code) { nm.owner = ME.uid; nm.at = Date.now(); nm.open = om === 'time'; if (ADMIN) nm.admin = true; }
    else if (om === 'time' && !old.openAt) nm.open = true;                       // 改成排程 → 到時間自動開放
    else if (om === 'manual' && old.openAt && Date.now() < old.openAt) nm.open = false; // 排程還沒到就改回手動 → 先不開放
    $('#fSave', m).disabled = true;
    try {
      let c = code;
      if (!c) { for (let k = 0; k < 8; k++) { const t = X.newCode(); if (!(await FB.get(`exam/m/${t}/meta`))) { c = t; break; } } if (!c) throw new Error('產生代碼失敗，請再試一次'); }
      // 順序很重要：先寫 meta（規則要看得到擁有者），再寫題目與答案
      await FB.set(`exam/m/${c}/meta`, nm);
      if (code) { const ok = (await FB.get(`exam/m/${c}/key`)) || {}; order.forEach((id) => { if (!nk[id] && ok[id]) nk[id] = ok[id]; }); }
      await FB.set(`exam/m/${c}/paper`, np);
      await FB.set(`exam/m/${c}/key`, nk);
      await FB.set(`exam/owners/${ME.uid}/${c}`, ownerRec(nm));
      saveLast({ subj, use: nm.use, pts: nm.pts });
      EXAMS[c] = nm; m.close();
      toast(code ? '✅ 已儲存' : `✅ 測驗建立好了！代碼 ${c}`, 3500);
      if (code && CUR === code) { PAPER = np; KEY = nk; META = nm; regrade(); renderExam(); } else openExam(c, 'share');
    } catch (e) { console.error(e); msg('儲存失敗：' + e.message); $('#fSave', m).disabled = false; }
  };
}
const ownerRec = (nm) => clean({ title: nm.title, at: nm.at, term: nm.term, subj: nm.subj, use: nm.use, date: nm.date });

/* ---------- 測驗頁 ---------- */
let META = null, PAPER = {}, KEY = {}, SUBS = {}, MG = {}, GRADES = {}, ROSTER = {}, unsub = [], gradeT = null, sub = 'share', lastG = {}, endsSent = {};
// 第二階段：XT 延長分鐘 x/<學號>/<次>、BT 再給幾次機會 bt/<學號>、MC 評語 mc/<學號>/<次>/<題>、SEEN 看過的違規事件、FEED 即時動態
let XT = {}, BT = {}, MC = {}, SEEN = null, FEED = [];
const studentLink = (code) => new URL('take.html?code=' + code, location.href).href;
function stopGrader() { unsub.forEach((f) => { try { f(); } catch (e) { } }); unsub = []; clearInterval(gradeT); gradeT = null; }
async function openExam(code, tab) {
  stopGrader();
  CUR = code; META = EXAMS[code]; sub = tab || (X.stateOf(META) === 'open' ? 'mon' : 'share');
  history.replaceState(null, '', '#e=' + code);
  showTab('exams'); CUR = code;
  $('#t-exams').innerHTML = '<div class="card"><p class="muted">讀取中…</p></div>';
  try { [PAPER, KEY, ROSTER] = await Promise.all([FB.get(`exam/m/${code}/paper`), FB.get(`exam/m/${code}/key`), FB.get(`exam/m/${code}/roster`)]); } catch (e) { toast('讀取失敗：' + e.message); }
  PAPER = PAPER || {}; KEY = KEY || {}; ROSTER = ROSTER || {}; SUBS = {}; MG = {}; GRADES = {}; lastG = {}; endsSent = {}; XT = {}; BT = {}; MC = {}; SEEN = null; FEED = [];
  Object.values(PAPER).forEach((q) => { q.o = arr(q.o); });
  Object.values(KEY).forEach((k) => { k.a = arr(k.a); });
  // 🧑‍⚖️ 自動閱卷官：這份測驗打開時一直聽學生作答
  unsub.push(FB.listen(`exam/m/${code}/s`, (v) => { SUBS = v || {}; watchEvents(); regrade(); paintLive(); }));
  unsub.push(FB.listen(`exam/m/${code}/x`, (v) => { XT = v || {}; regrade(); paintLive(); }));
  unsub.push(FB.listen(`exam/m/${code}/bt`, (v) => { BT = v || {}; paintLive(); }));
  unsub.push(FB.listen(`exam/m/${code}/mc`, (v) => { MC = v || {}; regrade(); }));
  unsub.push(FB.listen(`exam/m/${code}/mg`, (v) => { MG = v || {}; regrade(); paintLive(); }));
  unsub.push(FB.listen(`exam/m/${code}/g`, (v) => { GRADES = v || {}; Object.keys(GRADES).forEach((sid) => { lastG[sid] = sigG(GRADES[sid]); }); }));
  unsub.push(FB.listen(`exam/m/${code}/meta`, (v) => { if (v && CUR === code) { META = EXAMS[code] = v; paintHead(); } }));
  gradeT = setInterval(() => { regrade(); paintLive(); paintHead(); }, 5000);
  renderExam();
}
const sigG = (g) => { if (!g) return ''; const c = Object.assign({}, g); delete c.at; return JSON.stringify(c); };
function attemptsOf(sid) { const s = SUBS[sid] || {}; return Object.keys(s).filter((k) => /^\d+$/.test(k) && s[k] && s[k].st).sort((a, b) => a - b).map((k) => Object.assign({ k: +k }, s[k])); }
function infoOf(sid) { const at = attemptsOf(sid); const last = at[at.length - 1]; return (last && last.info) || ROSTER[sid] || {}; }
function gradeOf(sid, a) { return X.gradeAttempt(PAPER, KEY, META, CUR, sid, a.k, a, (MG[sid] || {})[a.k]); }
function violations(a) { return Object.values(a.ev || {}).filter((e) => e.k === 'v').length; }
function regrade() {
  if (!CUR || !META) return;
  const now = Date.now();
  Object.keys(SUBS).forEach((sid) => {
    const list = attemptsOf(sid); if (!list.length) return;
    const ks = {}, done = [];
    list.forEach((a) => {
      if (!a.end) {
        // 時間到還沒交卷 → 閱卷官代收（交卷時間記成期限）
        const dl = X.deadlineOf(META, a, extOf(sid, a.k)), late = now > dl + X.CONFIG.GRACE, shut = META.open === false;
        if ((late || shut) && !endsSent[sid + '/' + a.k]) {
          endsSent[sid + '/' + a.k] = 1;
          const by = late ? 'time' : 'teacher';
          FB.set(`exam/m/${CUR}/s/${sid}/${a.k}/end`, { t: by === 'time' ? dl : now, by }).catch((e) => { delete endsSent[sid + '/' + a.k]; console.warn(e); });
        }
        return;
      }
      const g = gradeOf(sid, a);
      const d = {}; Object.keys(g.detail).forEach((id) => { const r = g.detail[id]; d[id] = r.s == null ? -1 : r.s; });
      const cm = ((MC[sid] || {})[a.k]) || null;
      ks['a' + a.k] = clean({ s: g.s, full: g.full, p: g.pend, by: a.end.by, d, c: cm && Object.keys(cm).length ? cm : null }); // key 用 a1、a2（純數字 key 會被 Firebase 變成陣列）
      done.push({ s: g.s });
    });
    if (!done.length) return;
    const gr = { k: ks, f: X.finalScore(done, META.policy), fp: Object.values(ks).some((x) => x.p > 0), n: done.length, policy: META.policy, at: now };
    const sig = sigG(gr);
    if (sig !== lastG[sid]) { lastG[sid] = sig; FB.set(`exam/m/${CUR}/g/${sid}`, gr).catch((e) => { lastG[sid] = ''; console.warn(e); }); }
  });
}
function rows() {
  const sids = new Set(Object.keys(ROSTER).concat(Object.keys(SUBS)));
  const now = Date.now();
  return Array.from(sids).map((sid) => {
    const info = infoOf(sid), list = attemptsOf(sid), last = list[list.length - 1];
    const graded = list.filter((a) => a.end).map((a) => Object.assign({ a }, gradeOf(sid, a)));
    let st = 'none', left = 0, prog = '';
    let off = 0;
    if (last && !last.end) { st = 'doing'; left = X.deadlineOf(META, last, extOf(sid, last.k)) - now; off = last.hb ? now - last.hb : now - last.st; const sh = X.sheetFor(PAPER, META, CUR, sid, last.k); prog = sh.ids.filter((id) => X.answered(PAPER[id].t, (last.ans || {})[id])).length + '/' + sh.ids.length; }
    else if (last) st = last.end.by;
    return { sid, info, list, last, graded, st, left, prog, off, ext: last ? extOf(sid, last.k) : 0, bonus: +BT[sid] || 0, inRoster: !!ROSTER[sid], f: X.finalScore(graded, META.policy), pend: graded.reduce((a, g) => a + g.pend, 0), viol: list.reduce((a, x) => a + violations(x), 0) };
  }).sort((a, b) => String(a.info.cls || '').localeCompare(String(b.info.cls || '')) || (a.info.seat || 0) - (b.info.seat || 0) || a.sid.localeCompare(b.sid));
}
function renderExam() {
  const c = CUR;
  $('#t-exams').innerHTML = `<div class="card"><div class="ehead" id="eHead"></div>
    <div class="tabs subtabs" id="subT" style="margin:14px 0 0">${[['share', '🔗 分享'], ['mon', '📡 監控'], ['grade', '📋 成績'], ['mark', '✏️ 閱卷'], ['paper', '🧾 題目'], ['roster', '👥 名單'], ['set', '⚙️ 設定']].map(([k, n]) => `<button data-s="${k}" class="${sub === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div id="subBody"></div>`;
  $('#subT').onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; sub = b.dataset.s; $$('#subT button').forEach((x) => x.classList.toggle('on', x === b)); paintSub(); };
  paintHead(); paintSub();
  void c;
}
function paintHead() {
  const el = $('#eHead'); if (!el || !META) return;
  const s = X.stateOf(META);
  el.innerHTML = `<button class="btn ghost sm" id="hBack">← 我的測驗</button><h2>${esc(META.title)}</h2><span class="bigcode" style="font-size:1.25rem">${CUR}</span>${stChip(META)}${META.pub ? '<span class="chip ok">📣 成績已公布</span>' : ''}
    <span class="sp"></span>
    ${s === 'open' || s === 'wait' ? '<button class="btn danger" id="hClose">⏹ 關閉並收卷</button>' : '<button class="btn" id="hOpen">▶ 開放作答</button>'}
    <div class="row" style="flex-basis:100%;gap:6px">${tagChips(META)}<span class="small muted">📅 ${examWhen(META) ? X.fmtTime(examWhen(META)) : '—'}</span></div>
    <div class="small muted" style="flex-basis:100%">${META.n} 題・滿分 ${META.total}${META.pts ? `（單選 ${META.pts.s}・多重選擇 ${META.pts.m}・簡答 ${META.pts.a} 分）` : ''}・作答 ${META.mins} 分鐘・${META.tries >= 20 ? '不限次數' : '可作答 ' + META.tries + ' 次'}${META.tries > 1 ? '（' + X.POLICY[META.policy].name + '）' : ''}・${META.openAt ? '開放 ' + X.fmtTime(META.openAt) : '手動開放'}${META.closeAt ? '・截止 ' + X.fmtTime(META.closeAt) : ''}・反作弊${META.guard && META.guard.on ? '開（違規 ' + META.guard.max + ' 次代結）' : '關'}</div>`;
  $('#hBack').onclick = () => renderExams();
  const op = $('#hOpen'); if (op) op.onclick = async () => {
    const up = { open: true };
    if (META.closeAt && Date.now() >= META.closeAt) { if (!confirm('截止時間已經過了。要取消截止時間並重新開放嗎？')) return; up.closeAt = 0; }
    if (META.openAt && Date.now() < META.openAt) { if (confirm('還沒到排程的開放時間。要現在就開放嗎？')) up.openAt = 0; }
    await FB.update(`exam/m/${CUR}/meta`, up); Object.assign(META, up); paintHead(); toast('▶ 已開放');
  };
  const cl = $('#hClose'); if (cl) cl.onclick = async () => {
    const doing = rows().filter((r) => r.st === 'doing').length;
    if (!confirm(doing ? `還有 ${doing} 位學生正在作答，關閉後會由老師收卷（用他們已經存下的答案）。確定關閉嗎？` : '確定要關閉這份測驗嗎？')) return;
    await FB.update(`exam/m/${CUR}/meta`, { open: false }); META.open = false;
    const now = Date.now();
    await Promise.all(rows().filter((r) => r.st === 'doing').map((r) => { endsSent[r.sid + '/' + r.last.k] = 1; return FB.set(`exam/m/${CUR}/s/${r.sid}/${r.last.k}/end`, { t: now, by: 'teacher' }).catch(() => { }); }));
    paintHead(); toast('⏹ 已關閉並收卷');
  };
}
function paintSub() {
  const el = $('#subBody'); if (!el) return;
  if (sub === 'share') paintShare(el);
  else if (sub === 'grade') paintGrade(el);
  else if (sub === 'mon') paintMon(el);
  else if (sub === 'mark') paintMark(el);
  else if (sub === 'paper') paintPaper(el);
  else if (sub === 'roster') paintRoster(el);
  else if (sub === 'set') paintSet(el);
}
function paintLive() { if (sub === 'grade' && $('#gTable')) paintGrade($('#subBody'), true); else if (sub === 'mon' && $('#monGrid')) paintMon($('#subBody'), true); if (PROJ) PROJ(); }

/* 🔗 分享 */
function qrInto(el, text, size) { el.innerHTML = ''; if (window.QRCode) new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M }); else el.textContent = text; }
function paintShare(el) {
  const link = studentLink(CUR);
  el.innerHTML = `<div class="card"><div class="share"><div class="qr" id="sQr"></div><div>
    <h3>學生作答連結</h3><div class="link" id="sLink">${esc(link)}</div>
    <div class="row" style="margin-top:10px"><button class="btn" id="sCopy">📋 複製連結</button><button class="btn purple" id="sProj">📺 全螢幕投影</button><a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener">👀 用學生畫面看看</a></div>
    <p class="small muted" style="margin-top:10px">學生掃 QR Code 或開連結 → 輸入班級、座號、姓名、學號 → 看規則、勾誠信宣言 → 開始作答。<br>測驗代碼：<b class="mono">${CUR}</b>（學生也可以在連結後面看到）</p></div></div></div>`;
  qrInto($('#sQr'), link, 200);
  $('#sCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('📋 已複製'); } catch (e) { prompt('複製這個連結', link); } };
  $('#sProj').onclick = () => {
    const p = document.createElement('div'); p.className = 'proj';
    p.innerHTML = `<button class="x">✕ 關閉</button><div class="badge" style="font-size:1.1rem">🎲 線上檢定所</div><h1>${esc(META.title)}</h1><div class="qrbox" id="pQr"></div><div class="bigcode">${CUR}</div><div id="pInfo" style="font-size:1.3rem;font-weight:700"></div>`;
    document.body.appendChild(p); qrInto($('#pQr', p), link, Math.min(420, Math.round(window.innerHeight * 0.45)));
    const info = () => { const r = rows(); $('#pInfo', p).textContent = `${X.STATE[X.stateOf(META)]}｜作答中 ${r.filter((x) => x.st === 'doing').length} 人・已交卷 ${r.filter((x) => x.graded.length).length} 人`; };
    info(); const t = setInterval(info, 3000);
    $('.x', p).onclick = () => { clearInterval(t); p.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); };
    if (p.requestFullscreen) p.requestFullscreen().catch(() => { });
  };
}

/* 📋 成績 */
const byChip = (by, why) => by ? `<span class="chip ${by === 'self' ? 'ok' : by === 'guard' ? 'bad' : by === 'time' ? 'blue' : 'warn'}" title="${esc(why ? X.WHY[why] || why : '')}">${X.BY[by].icon} ${X.BY[by].name}</span>` : '';
function paintGrade(el, live) {
  const R = rows(), done = R.filter((r) => r.f != null), sc = done.map((r) => r.f);
  const avg = sc.length ? X.round2(sc.reduce((a, b) => a + b, 0) / sc.length) : '—';
  const pend = R.reduce((a, r) => a + r.pend, 0);
  const html = `<div class="stats">
      ${Object.keys(ROSTER).length ? `<div class="stat"><b>${Object.keys(ROSTER).length}</b><span>名單人數</span></div><div class="stat"><b>${R.filter((r) => r.inRoster && !r.list.length).length}</b><span>⚪ 未進入</span></div>` : ''}
      <div class="stat"><b>${R.filter((r) => r.st === 'doing').length}</b><span>🔵 作答中</span></div><div class="stat"><b>${done.length}</b><span>已交卷人數</span></div>
      <div class="stat"><b>${avg}</b><span>平均（滿分 ${META.total}）</span></div><div class="stat"><b>${sc.length ? Math.max(...sc) : '—'}</b><span>最高</span></div><div class="stat"><b>${sc.length ? Math.min(...sc) : '—'}</b><span>最低</span></div>
      <div class="stat"><b>${R.filter((r) => r.graded.some((g) => g.a.end.by === 'guard')).length}</b><span>🚨 系統代結</span></div>${pend ? `<div class="stat"><b>${pend}</b><span>✏️ 簡答待批</span></div>` : ''}</div>
    <div class="row" style="margin-bottom:10px"><button class="btn ghost" id="gXls">⬇ 匯出 Excel</button><button class="btn purple" id="gPub">📣 公布成績…</button><span class="sp"></span><span class="small muted">點一列看作答明細、批閱簡答 ✏️ ｜ 採計：${X.POLICY[META.policy].name}</span></div>
    <div class="tscroll" id="gTable"><table class="t"><thead><tr><th>班級</th><th class="num">座號</th><th>姓名</th><th>學號</th><th>狀態</th><th>各次成績</th><th class="num">採計</th><th class="num">違規</th></tr></thead><tbody>
    ${R.length ? R.map((r) => `<tr class="click" data-sid="${r.sid}"><td>${esc(r.info.cls || '')}</td><td class="num">${r.info.seat || ''}</td><td>${esc(r.info.name || '')}${r.inRoster || !Object.keys(ROSTER).length ? '' : ' <span class="chip warn" title="不在名單裡">名單外</span>'}</td><td class="mono">${r.sid}</td>
      <td>${r.st === 'none' ? '<span class="chip gray">⚪ 未進入</span>' : r.st === 'doing' ? `<span class="chip blue">🔵 作答中 ${r.prog}・剩 ${X.fmtLeft(r.left)}</span>` : byChip(r.st, r.last.end.why)}</td>
      <td>${r.graded.map((g) => `<span class="chip gray" title="第 ${g.a.k} 次・${X.BY[g.a.end.by].name}">${g.a.k}️⃣ ${g.s}${g.pend ? '<b style="color:var(--warn)">＋✏️' + g.pend + '</b>' : ''} ${X.BY[g.a.end.by].icon}</span>`).join(' ') || '—'}</td>
      <td class="num"><b>${r.f == null ? '—' : r.f}</b>${r.pend ? '<span class="small" style="color:var(--warn)"> 暫定</span>' : ''}</td><td class="num">${r.viol ? `<b style="color:var(--bad)">${r.viol}</b>` : '0'}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">還沒有學生作答。到「🔗 分享」把連結或 QR Code 給學生。</td></tr>'}
    </tbody></table></div>`;
  if (live) { const keep = $('#gTable') ? $('#gTable').scrollTop : 0; el.innerHTML = html; $('#gTable').scrollTop = keep; } else el.innerHTML = html;
  $('#gXls').onclick = exportXls;
  $('#gPub').onclick = publishDlg;
  $('#gTable').onclick = (e) => { const tr = e.target.closest('tr[data-sid]'); if (tr) studentDlg(tr.dataset.sid); };
}
function ansText(q, v, opt) {
  if (q.t === 's') return typeof v === 'number' ? X.LETTERS[v] : '（未作答）';
  if (q.t === 'm') { const s = Object.keys(X.multiToSet(v)).map(Number).sort((a, b) => a - b); return s.length ? s.map((i) => X.LETTERS[i]).join(' ') : '（未作答）'; }
  return v ? (opt && opt.html ? esc(v).replace(/\n/g, '<br>') : v) : '（未作答）';
}
function studentDlg(sid) {
  const info = infoOf(sid);
  const m = modal(`<h2>🧑‍🎓 ${esc(info.cls || '')} ${info.seat || ''} 號 ${esc(info.name || '')} <span class="mono small muted">${sid}</span></h2>
    <div class="row small" id="sdTop"></div><div id="sdBody"></div>`, { wide: true });
  const paintTop = () => { const used = attemptsOf(sid).length, total = Math.min(20, META.tries + (+BT[sid] || 0)); $('#sdTop', m).innerHTML = `<span class="chip gray">已作答 ${used} 次／可作答 ${META.tries >= 20 ? '不限' : total + ' 次'}${BT[sid] ? `（含老師多給 ${BT[sid]} 次）` : ''}</span>${META.tries < 20 ? `<button class="btn ghost sm" data-act="bonus">🔄 再給一次機會</button>${BT[sid] ? '<button class="btn ghost sm" data-act="unbonus">↩️ 收回一次</button>' : ''}` : ''}`; };
  const paint = () => {
    const list = attemptsOf(sid);
    if (!list.length) { $('#sdBody', m).innerHTML = '<p class="muted">還沒有作答紀錄。</p>'; return; }
    $('#sdBody', m).innerHTML = list.map((a) => {
      const g = gradeOf(sid, a), sh = X.sheetFor(PAPER, META, CUR, sid, a.k), ev = Object.values(a.ev || {}).sort((x, y) => x.t - y.t);
      const isLast = a.k === list[list.length - 1].k;
      return `<div class="card" style="box-shadow:none;border-width:1.5px"><div class="row"><h3>第 ${a.k} 次</h3>${a.end ? byChip(a.end.by, a.end.why) : '<span class="chip blue">🔵 作答中</span>'}
        <span class="chip ${a.end ? 'ok' : 'gray'}">${g.s} / ${g.full} 分${g.pend ? `（簡答 ${g.pend} 題待批）` : ''}</span><span class="sp"></span>
        ${!a.end ? `<span class="chip blue">剩 ${X.fmtLeft(X.deadlineOf(META, a, extOf(sid, a.k)) - Date.now())}${extOf(sid, a.k) ? `（已延長 ${extOf(sid, a.k)} 分）` : ''}</span><button class="btn ghost sm" data-act="ext" data-k="${a.k}">⏱ 延長時間</button><button class="btn danger sm" data-act="end" data-k="${a.k}">⏹ 收卷</button>${a.dev ? `<button class="btn ghost sm" data-act="unlock" data-k="${a.k}" title="學生換平板繼續作答時使用">🔓 解除裝置鎖</button>` : '<span class="chip gray">已解除裝置鎖</span>'}` : ''}
        ${isLast ? `<button class="btn danger sm" data-act="del" data-k="${a.k}" title="刪除後學生可以重新作答這一次">🗑 刪除這次作答</button>` : ''}</div>
        <div class="tl"><div>▶ ${X.fmtClock(a.st)} 開始作答</div>${ev.map((e) => `<div class="${e.k === 'v' ? 'v' : ''}">${e.k === 'v' ? '⚠️' : 'ℹ️'} ${X.fmtClock(e.t)} ${e.k === 'v' ? '違規：' + esc(X.WHY[e.d] || e.d || '') : e.k === 'resume' ? '重新進入作答頁' : e.k === 'idle' ? '閒置提醒' : esc(e.k + ' ' + (e.d || ''))}</div>`).join('')}
          ${a.end ? `<div>${X.BY[a.end.by].icon} ${X.fmtClock(a.end.t)} ${X.BY[a.end.by].name}${a.end.why ? '：' + esc(X.WHY[a.end.why] || a.end.why) : ''}（作答 ${Math.max(0, Math.round((a.end.t - a.st) / 60000))} 分鐘）</div>` : ''}</div>
        <div class="tscroll" style="margin-top:10px;max-height:none"><table class="t"><thead><tr><th class="num">#</th><th>題目</th><th>學生答案</th><th>正解</th><th class="num">得分</th></tr></thead><tbody>
        ${sh.ids.map((id, n) => { const q = PAPER[id], r = g.detail[id], v = (a.ans || {})[id], key = KEY[id] || {};
          return `<tr><td class="num">${n + 1}</td><td style="max-width:420px">${typeChip(q.t)} ${esc(X.plain(q.s).slice(0, 80))}</td>
            <td>${q.t === 'a' ? `<div style="white-space:pre-wrap;max-width:360px">${ansText(q, v, { html: true })}</div>` : `<b style="color:${r.ok ? 'var(--ok)' : 'var(--bad)'}">${ansText(q, v)}</b>`}</td>
            <td>${q.t === 'a' ? (key.r ? '<span class="small muted">見題目</span>' : '—') : letterList(key.a)}</td>
            <td class="num">${q.t === 'a' ? `<input type="number" min="0" max="${q.p}" step="0.5" style="width:76px" data-mg="${a.k}/${id}" value="${((MG[sid] || {})[a.k] || {})[id] != null ? MG[sid][a.k][id] : ''}" placeholder="／${q.p}">` : `${r.s} <span class="small muted">/ ${q.p}</span>`}</td></tr>${q.t === 'a' && X.answered('a', v) ? `<tr><td></td><td colspan="4"><input type="text" maxlength="300" data-mc="${a.k}/${id}" value="${esc(((MC[sid] || {})[a.k] || {})[id] || '')}" placeholder="💬 評語（選填，公布題目時學生看得到）"></td></tr>` : ''}`; }).join('')}
        </tbody></table></div></div>`;
    }).join('') + `<p class="small muted">字母是題庫裡的原始順序（學生看到的選項可能被打亂過）。</p>`;
  };
  paint(); paintTop();
  const onAct = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const k = b.dataset.k;
    if (b.dataset.act === 'bonus' || b.dataset.act === 'unbonus') { await giveBonus(sid, b.dataset.act === 'bonus' ? 1 : -1); setTimeout(() => { paintTop(); paint(); }, 400); return; }
    if (b.dataset.act === 'ext') { await extendTime(sid, +k); setTimeout(paint, 400); return; }
    if (b.dataset.act === 'end') { if (!confirm('用學生目前存下的答案收卷？')) return; endsSent[sid + '/' + k] = 1; await FB.set(`exam/m/${CUR}/s/${sid}/${k}/end`, { t: Date.now(), by: 'teacher' }); toast('已收卷'); }
    else if (b.dataset.act === 'unlock') { await FB.set(`exam/m/${CUR}/s/${sid}/${k}/dev`, ''); toast('🔓 已解除，學生可以在新裝置輸入同樣的資料繼續作答'); }
    else if (b.dataset.act === 'del') { if (!confirm(`確定要刪除第 ${k} 次作答嗎？刪除後學生可以重新作答這一次（紀錄無法復原）。`)) return; await FB.remove(`exam/m/${CUR}/s/${sid}/${k}`); await FB.remove(`exam/m/${CUR}/mg/${sid}/${k}`).catch(() => { }); toast('已刪除'); }
    setTimeout(paint, 400);
  };
  $('#sdBody', m).onclick = onAct; $('#sdTop', m).onclick = onAct;
  $('#sdBody', m).onchange = async (e) => {
    const c = e.target.closest('[data-mc]');
    if (c) { const [k, id] = c.dataset.mc.split('/'); const v = c.value.trim().slice(0, 300); await FB.set(`exam/m/${CUR}/mc/${sid}/${k}/${id}`, v || null); toast('💬 已存評語'); return; }
    const x = e.target.closest('[data-mg]'); if (!x) return;
    const [k, id] = x.dataset.mg.split('/'), q = PAPER[id];
    const v = x.value === '' ? null : Math.max(0, Math.min(q.p, +x.value));
    await FB.set(`exam/m/${CUR}/mg/${sid}/${k}/${id}`, v);
    x.value = v == null ? '' : v; toast('✅ 已給分');
  };
}
async function publishDlg() {
  const R = rows(), pend = R.reduce((a, r) => a + r.pend, 0);
  const m = modal(`<h2>📣 公布成績</h2>
    ${pend ? `<p class="small" style="background:var(--warnbg);border-radius:10px;padding:8px 12px">⚠️ 還有 <b>${pend}</b> 份簡答沒批完。現在公布的話，學生會看到「批閱中」，總分標「暫定」。</p>` : '<p class="small" style="color:var(--ok);font-weight:700">✅ 全部都批完了</p>'}
    <p>學生用同一個連結，輸入學號＋姓名就能查詢。要公布哪些內容？</p>
    <label class="ck" style="display:flex"><input type="checkbox" checked disabled>成績：採計分數、各次分數、交卷方式（一定公布）</label>
    <label class="ck" style="display:flex"><input type="checkbox" id="pPaper" ${META.pubPaper ? 'checked' : ''}>題目：學生看得到題目、自己的作答、每題對錯與得分</label>
    <label class="ck" style="display:flex"><input type="checkbox" id="pKey" ${META.pubKey ? 'checked' : ''}>正解與解析（要先勾「題目」）</label>
    <div class="row" style="margin-top:14px"><button class="btn purple" id="pGo">📣 ${META.pub ? '更新公布內容' : '公布'}</button>${META.pub ? '<button class="btn danger" id="pOff">撤回公布</button>' : ''}</div>`);
  const sync = () => { if (!$('#pPaper', m).checked) $('#pKey', m).checked = false; $('#pKey', m).disabled = !$('#pPaper', m).checked; };
  $('#pPaper', m).onchange = sync; sync();
  $('#pGo', m).onclick = async () => {
    regrade();
    const up = { pub: true, pubPaper: $('#pPaper', m).checked, pubKey: $('#pKey', m).checked };
    await FB.update(`exam/m/${CUR}/meta`, up); Object.assign(META, up); m.close(); paintHead(); toast('📣 已公布');
  };
  const off = $('#pOff', m); if (off) off.onclick = async () => { await FB.update(`exam/m/${CUR}/meta`, { pub: false }); META.pub = false; m.close(); paintHead(); toast('已撤回公布'); };
}
async function exportXls() {
  await loadScript(LIB.xlsx);
  const XL = window.XLSX, R = rows();
  const maxK = Math.max(1, ...R.map((r) => r.list.length));
  const head = ['班級', '座號', '姓名', '學號', '狀態'].concat(Array.from({ length: maxK }, (_, i) => `第${i + 1}次`), Array.from({ length: maxK }, (_, i) => `第${i + 1}次交卷方式`), ['採計分數', '滿分', '簡答待批', '違規次數']);
  const sheet1 = [head].concat(R.map((r) => [r.info.cls || '', r.info.seat || '', r.info.name || '', r.sid, r.st === 'none' ? '未進入' : r.st === 'doing' ? '作答中' : '已交卷']
    .concat(Array.from({ length: maxK }, (_, i) => { const g = r.graded.find((x) => x.a.k === i + 1); return g ? g.s : ''; }),
      Array.from({ length: maxK }, (_, i) => { const a = r.list.find((x) => x.k === i + 1); return a && a.end ? X.BY[a.end.by].name + (a.end.why ? '：' + (X.WHY[a.end.why] || a.end.why) : '') : ''; }),
      [r.f == null ? '' : r.f, META.total, r.pend || '', r.viol])));
  const sheet2 = [['班級', '座號', '姓名', '學號', '第幾次', '題號（學生看到的）', '題庫順序', '題型', '題目', '作答', '正解', '得分', '配分']];
  R.forEach((r) => r.graded.forEach((g) => { const sh = X.sheetFor(PAPER, META, CUR, r.sid, g.a.k); sh.ids.forEach((id, n) => { const q = PAPER[id], d = g.detail[id]; sheet2.push([r.info.cls || '', r.info.seat || '', r.info.name || '', r.sid, g.a.k, n + 1, (q.i || 0) + 1, X.TYPES[q.t], X.plain(q.s).slice(0, 200), ansText(q, (g.a.ans || {})[id]), q.t === 'a' ? '' : letterList((KEY[id] || {}).a), d.s == null ? '待批' : d.s, q.p]); }); }));
  const ids = Object.keys(PAPER).sort((a, b) => PAPER[a].i - PAPER[b].i);
  const sheet3 = [['題庫順序', '題型', '題目', '作答人次', '答對人次', '答對率', '平均得分', '配分']].concat(ids.map((id) => {
    const q = PAPER[id]; let n = 0, ok = 0, sum = 0;
    R.forEach((r) => r.graded.forEach((g) => { const d = g.detail[id]; if (!d || d.s == null) return; n++; sum += d.s; if (d.ok) ok++; }));
    return [(q.i || 0) + 1, X.TYPES[q.t], X.plain(q.s).slice(0, 200), n, ok, n ? Math.round(ok / n * 100) + '%' : '', n ? X.round2(sum / n) : '', q.p];
  }));
  const info = [['測驗名稱', META.title], ['測驗代碼', CUR], ['學期', META.term ? X.termName(META.term) + '（' + META.term + '）' : ''], ['科目', META.subj || ''], ['用途', META.use || ''], ['測驗日期時間', examWhen(META) ? new Date(examWhen(META)).toLocaleString('zh-TW') : ''],
    ['題數', META.n], ['滿分', META.total], ['配分', META.pts ? `單選 ${META.pts.s}、多重選擇 ${META.pts.m}、簡答 ${META.pts.a}` : ''], ['作答時間（分鐘）', META.mins], ['可作答次數', META.tries >= 20 ? '不限' : META.tries], ['採計方式', X.POLICY[META.policy].name], ['匯出時間', new Date().toLocaleString('zh-TW')]];
  const wb = XL.utils.book_new();
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(info), '測驗資訊');
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(sheet1), '成績總表');
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(sheet2), '作答明細');
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(sheet3), '每題分析');
  XL.writeFile(wb, `線上檢定所_${[META.term, META.subj, META.use, META.title].filter(Boolean).join('_')}_${CUR}.xlsx`.replace(/[\\/:*?"<>|]/g, ''));
}

/* 🧾 題目 */
function paintPaper(el) {
  const ids = Object.keys(PAPER).sort((a, b) => PAPER[a].i - PAPER[b].i);
  el.innerHTML = `<div class="card"><div class="row"><h3>🧾 這份測驗的題目（${ids.length} 題・滿分 ${META.total}）</h3><span class="sp"></span><button class="btn ghost sm" id="ppEdit">✏️ 修改題目與配分</button></div>
    <p class="small muted">這是建立測驗時的「快照」：之後改題庫不會影響這份測驗。要更新請按「修改題目與配分」重新選題。${META.shufQ ? '學生看到的題目順序會打亂。' : ''}${META.draw ? `每位學生隨機抽 ${META.draw} 題。` : ''}</p>
    <div id="ppList">${ids.map((id, n) => qViewHTML(Object.assign({}, PAPER[id], { a: (KEY[id] || {}).a || [], r: (KEY[id] || {}).r, e: (KEY[id] || {}).e }), n + 1)).join('')}</div></div>`;
  $$('#ppList .qview').forEach((v, n) => { const id = ids[n]; fillQView(v, Object.assign({}, PAPER[id], { a: (KEY[id] || {}).a || [], r: (KEY[id] || {}).r, e: (KEY[id] || {}).e })); });
  $('#ppEdit').onclick = () => examForm(CUR);
}

/* 👥 名單 */
function parseRoster(text) {
  const out = {}, bad = [];
  String(text || '').split(/\r?\n/).forEach((line, n) => {
    const t = line.trim(); if (!t) return;
    const p = t.split(/[\t,，;；]+|\s{1,}/).map((x) => x.trim()).filter(Boolean);
    if (p.length < 4) { if (!/班級|座號|姓名|學號/.test(t)) bad.push(`第 ${n + 1} 行欄位不夠`); return; }
    const [cls, seat, name, no] = p, sid = X.normId(no);
    if (/班級/.test(cls)) return;
    if (!X.validId(sid) || !(+seat >= 1 && +seat <= 99)) { bad.push(`第 ${n + 1} 行：${t}`); return; }
    out[sid] = { cls: String(cls).slice(0, 8), seat: +seat, name: String(name).slice(0, 12) };
  });
  return { out, bad };
}
function paintRoster(el) {
  const sids = Object.keys(ROSTER).sort((a, b) => String(ROSTER[a].cls).localeCompare(String(ROSTER[b].cls)) || ROSTER[a].seat - ROSTER[b].seat);
  el.innerHTML = `<div class="card"><h3>👥 學生名單（${sids.length} 人）</h3>
    <p class="small muted">${META.rosterOnly ? '🔒 這份測驗<b>只限名單內的學生</b>進入（班級、座號、姓名、學號都要對得上）。' : '目前不限名單，任何人都能進入；名單用來核對誰還沒考（成績頁會出現「⚪ 未進入」）。'}要改請到「⚙️ 設定」。</p>
    <label class="f">貼上名單：一行一位，依序「班級 座號 姓名 學號」（從 Excel 直接複製四欄貼上即可）</label>
    <textarea id="rTxt" rows="6" placeholder="201	1	林小華	1150001&#10;201	2	王小明	1150002"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn" id="rSave">💾 取代成這份名單</button><button class="btn ghost" id="rAdd">＋ 加到現有名單</button><button class="btn ghost" id="rXls">📂 從 Excel 匯入</button><span class="sp"></span>${sids.length ? '<button class="btn danger sm" id="rClear">🗑 清空名單</button>' : ''}</div>
    <p class="small" id="rMsg"></p>
    ${sids.length ? `<div class="tscroll" style="margin-top:8px"><table class="t"><thead><tr><th>班級</th><th class="num">座號</th><th>姓名</th><th>學號</th><th>作答</th></tr></thead><tbody>${sids.map((sid) => { const n = attemptsOf(sid).length; return `<tr><td>${esc(ROSTER[sid].cls)}</td><td class="num">${ROSTER[sid].seat}</td><td>${esc(ROSTER[sid].name)}</td><td class="mono">${sid}</td><td>${n ? `<span class="chip ok">${n} 次</span>` : '<span class="chip gray">⚪ 未進入</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : ''}</div>`;
  const save = async (mode, text) => {
    const { out, bad } = parseRoster(text != null ? text : $('#rTxt').value);
    if (!Object.keys(out).length) { $('#rMsg').textContent = '⚠️ 沒有讀到任何學生' + (bad.length ? '：' + bad.slice(0, 3).join('；') : ''); return; }
    const next = mode === 'add' ? Object.assign({}, ROSTER, out) : out;
    await FB.set(`exam/m/${CUR}/roster`, next); ROSTER = next;
    paintRoster(el); $('#rMsg').textContent = `✅ 已儲存 ${Object.keys(out).length} 位${bad.length ? `；有 ${bad.length} 行看不懂：` + bad.slice(0, 3).join('；') : ''}`;
  };
  $('#rSave').onclick = () => save('replace');
  $('#rAdd').onclick = () => save('add');
  $('#rXls').onclick = () => pickFile('.xlsx,.xls,.csv', async (file) => {
    await loadScript(LIB.xlsx);
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rws = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const head = (rws[0] || []).map(String), col = (k) => head.findIndex((h) => h.includes(k));
    const ix = [col('班級'), col('座號'), col('姓名'), col('學號')];
    const body = ix.every((i) => i >= 0) ? rws.slice(1).map((r) => ix.map((i) => r[i]).join('\t')) : rws.map((r) => r.slice(0, 4).join('\t'));
    $('#rTxt').value = body.join('\n'); $('#rMsg').textContent = '已讀入，確認後按「取代」或「加到現有名單」';
  });
  const cl = $('#rClear'); if (cl) cl.onclick = async () => { if (!confirm('確定清空名單？（不影響學生作答紀錄）')) return; await FB.remove(`exam/m/${CUR}/roster`); ROSTER = {}; paintRoster(el); };
}

/* ⚙️ 設定 */
function paintSet(el) {
  el.innerHTML = `<div class="card"><h3>⚙️ 設定</h3><div class="row" style="margin-top:10px"><button class="btn" id="stEdit">✏️ 修改測驗設定與題目</button><button class="btn ghost" id="stCopy">⧉ 複製成新測驗</button><span class="sp"></span><button class="btn danger" id="stDel">🗑 刪除這份測驗</button></div>
    <p class="small muted" style="margin-top:10px">刪除會連同所有學生作答與成績一起刪掉，無法復原（建議先在「📋 成績」匯出 Excel）。</p></div>`;
  $('#stEdit').onclick = () => examForm(CUR);
  $('#stCopy').onclick = async () => {
    const nm = Object.assign({}, META, { title: (META.title + '（複製）').slice(0, 60), at: Date.now(), date: Date.now(), term: META.term || X.currentTerm(), owner: ME.uid, open: false, openAt: 0, closeAt: 0, pub: false, pubPaper: false, pubKey: false });
    if (!ADMIN) delete nm.admin;
    let c = null; for (let k = 0; k < 8; k++) { const t = X.newCode(); if (!(await FB.get(`exam/m/${t}/meta`))) { c = t; break; } }
    await FB.set(`exam/m/${c}/meta`, nm); await FB.set(`exam/m/${c}/paper`, PAPER); await FB.set(`exam/m/${c}/key`, KEY);
    if (Object.keys(ROSTER).length) await FB.set(`exam/m/${c}/roster`, ROSTER);
    await FB.set(`exam/owners/${ME.uid}/${c}`, ownerRec(nm));
    EXAMS[c] = nm; toast(`⧉ 已複製成新測驗 ${c}（未開放）`); openExam(c, 'set');
  };
  $('#stDel').onclick = () => deleteExam(CUR);
}
// 刪除測驗：沒有人作答過按確定就刪；有作答紀錄要輸入測驗代碼確認（建議先匯出 Excel）
async function deleteExam(code) {
  const e = EXAMS[code]; if (!e) return;
  let n = 0; try { n = Object.keys((await FB.get(`exam/m/${code}/s`)) || {}).length; } catch (x) { }
  if (n) { const t = prompt(`「${e.title}」已經有 ${n} 位學生的作答紀錄，刪除後成績一起消失、無法復原（建議先匯出 Excel）。\n確定要刪除的話，請輸入測驗代碼 ${code}：`); if ((t || '').toUpperCase() !== code) { if (t != null) toast('代碼不對，沒有刪除'); return; } }
  else if (!confirm(`確定要刪除測驗「${e.title}」（${code}）嗎？還沒有學生作答。`)) return;
  if (CUR === code) stopGrader();
  await FB.remove(`exam/m/${code}`); await FB.remove(`exam/owners/${ME.uid}/${code}`);
  delete EXAMS[code]; toast('🗑 已刪除測驗'); renderExams();
}

/* =====================================================================
   第二階段（2026-10-23）：📡 監控牆、📺 考場投影看板、✏️ 依題目閱卷、送分、延長時間、再給一次機會、違規即時提醒
   ===================================================================== */
const extOf = (sid, k) => +(((XT[sid] || {})[k])) || 0;
let MZ = (() => { try { return Math.max(0.7, Math.min(1.5, +localStorage.getItem('exam:monZoom') || 1)); } catch (e) { return 1; } })(); // 監控清單縮放（記在這台電腦）
let CMTS = null, PROJ = null, MF = 'all', MK = { qid: '', anon: false, todo: false };
const OFFLINE_MS = 75000; // 學生頁每 30 秒回報一次心跳；超過 75 秒沒消息＝失聯（可能斷網、螢幕關掉）
const who = (info) => `${esc(info.cls || '')}${info.seat ? '-' + info.seat : ''} ${esc(info.name || '')}`;
async function loadCmts() { if (CMTS) return CMTS; try { CMTS = arr(await FB.get(`exam/pref/${ME.uid}/cmts`)); } catch (e) { CMTS = []; } if (!CMTS.length) CMTS = ['說明清楚、有舉例 👍', '方向對，再具體一點', '有寫到重點，但少了機制的說明', '請再對照課堂講義']; return CMTS; }
const saveCmts = () => FB.set(`exam/pref/${ME.uid}/cmts`, CMTS.slice(0, 40)).catch((e) => toast('常用評語存檔失敗：' + e.message));
async function extendTime(sid, k) {
  const now = extOf(sid, k), v = prompt(`幫 ${infoOf(sid).name || sid}（第 ${k} 次）延長幾分鐘？\n（目前已延長 ${now} 分鐘；輸入的分鐘數會加上去，輸入負數可以減少）`, '5');
  if (v == null || v.trim() === '' || isNaN(+v)) return;
  const nv = Math.max(0, Math.min(600, now + Math.round(+v)));
  await FB.set(`exam/m/${CUR}/x/${sid}/${k}`, nv || null);
  const a = attemptsOf(sid).find((x) => x.k === k), capped = META.closeAt && a && a.st + (META.mins + nv) * 60000 > META.closeAt;
  toast(`⏱ 已延長，合計 ${nv} 分鐘${capped ? '（⚠️ 延長不能超過截止時間，要更晚請到「⚙️ 設定」改截止時間）' : ''}`, 3500);
}
async function giveBonus(sid, d) {
  const nv = Math.max(0, Math.min(19, (+BT[sid] || 0) + d));
  await FB.set(`exam/m/${CUR}/bt/${sid}`, nv || null);
  toast(d > 0 ? `🔄 已多給 ${infoOf(sid).name || sid} 一次作答機會（學生回到測驗首頁就能再考）` : '↩️ 已收回一次機會');
}
// 新的違規、交卷事件 → 跳提醒＋記到即時動態
function watchEvents() {
  const first = SEEN === null; if (first) SEEN = new Set();
  Object.keys(SUBS).forEach((sid) => attemptsOf(sid).forEach((a) => {
    const info = infoOf(sid);
    let n = 0;
    Object.keys(a.ev || {}).sort((x, y) => (a.ev[x].t || 0) - (a.ev[y].t || 0)).forEach((id) => {
      const e = a.ev[id]; if (e.k === 'v') n++;
      const key = sid + '/' + a.k + '/' + id; if (SEEN.has(key)) return; SEEN.add(key);
      if (e.k !== 'v' && e.k !== 'resume') return;
      const text = e.k === 'v' ? `⚠️ ${who(info)}：${esc(X.WHY[e.d] || e.d || '違規')}（第 ${n} 次）` : `ℹ️ ${who(info)}：重新進入作答頁`;
      FEED.unshift({ t: e.t, text, bad: e.k === 'v' });
      if (!first && e.k === 'v') toast(text.replace(/<[^>]+>/g, ''), 4000);
    });
    const sk = sid + '/' + a.k + '/st'; if (!SEEN.has(sk)) { SEEN.add(sk); FEED.unshift({ t: a.st, text: `▶ ${who(info)}：開始第 ${a.k} 次作答` }); }
    if (a.end) { const ek = sid + '/' + a.k + '/end'; if (!SEEN.has(ek)) { SEEN.add(ek); FEED.unshift({ t: a.end.t, text: `${X.BY[a.end.by].icon} ${who(info)}：${X.BY[a.end.by].name}${a.end.why ? '（' + esc(X.WHY[a.end.why] || a.end.why) + '）' : ''}`, bad: a.end.by === 'guard' }); if (!first && a.end.by === 'guard') toast(`🚨 ${infoOf(sid).name || sid} 被系統代結（${X.WHY[a.end.why] || ''}）`, 4000); } }
  }));
  FEED.sort((x, y) => y.t - x.t); FEED = FEED.slice(0, 80);
}

/* 📡 監控 */
function monCount(R) { return { roster: Object.keys(ROSTER).length, none: R.filter((r) => r.st === 'none').length, doing: R.filter((r) => r.st === 'doing').length, done: R.filter((r) => r.graded.length && r.st !== 'doing').length, guard: R.filter((r) => r.st === 'guard').length, off: R.filter((r) => r.st === 'doing' && r.off > OFFLINE_MS).length, viol: R.filter((r) => r.viol).length }; }
function paintMon(el, live) {
  const R = rows(), c = monCount(R);
  const used = (r) => r.list.length, allow = (r) => Math.min(20, META.tries + r.bonus);
  const show = R.filter((r) => MF === 'all' || (MF === 'doing' && r.st === 'doing') || (MF === 'none' && r.st === 'none') || (MF === 'done' && r.st !== 'doing' && r.st !== 'none') || (MF === 'viol' && r.viol) || (MF === 'off' && r.st === 'doing' && r.off > OFFLINE_MS));
  const cls = (r) => r.st === 'doing' ? (r.off > OFFLINE_MS ? 'off' : 'doing') : r.st === 'none' ? 'none' : r.st;
  const html = `<div class="stats">${c.roster ? `<div class="stat"><b>${c.roster}</b><span>名單人數</span></div><div class="stat"><b>${c.none}</b><span>⚪ 未進入</span></div>` : ''}
      <div class="stat"><b>${c.doing}</b><span>🔵 作答中</span></div><div class="stat"><b>${c.done}</b><span>✅ 已交卷</span></div><div class="stat"><b>${c.guard}</b><span>🚨 系統代結</span></div><div class="stat"><b>${c.off}</b><span>📴 失聯</span></div></div>
    <div class="row" style="margin-bottom:10px"><div class="tabs subtabs" id="monF" style="margin:0">${[['all', '全部'], ['doing', '🔵 作答中'], ['none', '⚪ 未進入'], ['done', '✅ 已交卷'], ['viol', '⚠️ 有違規'], ['off', '📴 失聯']].map(([k, n]) => `<button data-f="${k}" class="${MF === k ? 'on' : ''}">${n}</button>`).join('')}</div><span class="sp"></span><button class="btn purple" id="monProj">📺 考場投影看板</button></div>
    <div class="monwrap"><div><div class="row small" style="margin-bottom:6px"><span class="muted">點一列看作答明細</span><span class="sp"></span>🔍 縮放<button class="btn ghost sm" data-z="-1" title="縮小">－</button><b class="mono" style="min-width:44px;text-align:center">${Math.round(MZ * 100)}%</b><button class="btn ghost sm" data-z="1" title="放大">＋</button><button class="btn ghost sm" data-z="0" title="恢復 100%">↺</button></div>
      <div class="tscroll" id="monGrid" style="font-size:${MZ * 100}%"><table class="t mon"><thead><tr><th>狀態</th><th>班級</th><th class="num">座號</th><th>姓名</th><th>學號</th><th class="num">次</th><th>進度</th><th class="num">剩餘</th><th class="num">違規</th><th>連線</th><th class="num">採計</th><th>操作</th></tr></thead><tbody>
      ${show.length ? show.map((r) => `<tr class="click mrow ${cls(r)}" data-sid="${r.sid}">
        <td>${r.st === 'doing' ? '<span class="chip blue">🔵 作答中</span>' : r.st === 'none' ? '<span class="chip gray">⚪ 未進入</span>' : byChip(r.st, r.last.end.why)}</td>
        <td>${esc(r.info.cls || '')}</td><td class="num">${r.info.seat || ''}</td><td><b>${esc(r.info.name || '')}</b></td><td class="mono">${r.sid}</td>
        <td class="num">${r.list.length ? r.last.k + (r.bonus ? `<span class="small muted">／${allow(r)}</span>` : '') : '—'}</td>
        <td>${r.st === 'doing' ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><div class="pbar" style="width:80px;margin:0"><i style="width:${(() => { const [a, b] = r.prog.split('/').map(Number); return b ? Math.round(a / b * 100) : 0; })()}%"></i></div><span class="mono">${r.prog}</span></div>` : r.graded.length ? '<span class="muted">—</span>' : ''}</td>
        <td class="num mono">${r.st === 'doing' ? X.fmtLeft(r.left) + (r.ext ? `<div class="small muted">＋${r.ext} 分</div>` : '') : ''}</td>
        <td class="num">${r.viol ? `<b style="color:var(--bad)">⚠️ ${r.viol}</b>` : '0'}</td>
        <td>${r.st !== 'doing' ? '' : r.off > OFFLINE_MS ? `<span class="chip warn">📴 失聯 ${Math.floor(r.off / 60000)} 分</span>` : '<span class="chip ok">🟢 連線中</span>'}</td>
        <td class="num"><b>${r.f == null ? '—' : r.f}</b>${r.pend ? '<div class="small" style="color:var(--warn)">✏️ 待批</div>' : ''}</td>
        <td><div class="row" style="gap:4px;flex-wrap:nowrap">${r.st === 'doing' ? `<button class="btn ghost sm" data-m="ext">⏱ 延長</button><button class="btn danger sm" data-m="end">⏹ 收卷</button>${r.last.dev ? '<button class="btn ghost sm" data-m="unlock" title="解除裝置鎖（換裝置繼續作答）">🔓</button>' : ''}`
          : r.st !== 'none' && META.tries < 20 && used(r) >= allow(r) ? '<button class="btn ghost sm" data-m="bonus">🔄 再給一次</button>' : r.st !== 'none' && used(r) < allow(r) ? `<span class="small muted">還可再考 ${allow(r) - used(r)} 次</span>` : ''}</div></td></tr>`).join('') : '<tr><td colspan="12" class="empty small">沒有符合的學生</td></tr>'}
      </tbody></table></div></div>
      <div class="feed"><b>📰 即時動態</b>${FEED.length ? FEED.slice(0, 40).map((f) => `<div class="${f.bad ? 'bad' : ''}"><span class="mono muted">${X.fmtClock(f.t)}</span> ${f.text}</div>`).join('') : '<div class="muted small">學生開始作答後，違規、交卷會即時出現在這裡。</div>'}</div></div>`;
  const keep = $('#monGrid') ? $('#monGrid').scrollTop : 0;
  el.innerHTML = html; if (live && $('#monGrid')) $('#monGrid').scrollTop = keep;
  $('#monF').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; MF = b.dataset.f; paintMon(el); };
  $('#monProj').onclick = projBoard;
  $$('[data-z]', el).forEach((b) => { b.onclick = () => { const d = +b.dataset.z; MZ = d ? Math.max(0.7, Math.min(1.5, Math.round((MZ + d * 0.1) * 10) / 10)) : 1; try { localStorage.setItem('exam:monZoom', MZ); } catch (e) { } paintMon(el); }; });
  $('#monGrid').onclick = async (e) => {
    const card = e.target.closest('[data-sid]'); if (!card) return;
    const sid = card.dataset.sid, b = e.target.closest('[data-m]'), r = rows().find((x) => x.sid === sid);
    if (!b) return studentDlg(sid);
    const k = r && r.last && r.last.k;
    if (b.dataset.m === 'ext') await extendTime(sid, k);
    else if (b.dataset.m === 'end') { if (!confirm(`用 ${r.info.name || sid} 目前存下的答案收卷？`)) return; endsSent[sid + '/' + k] = 1; await FB.set(`exam/m/${CUR}/s/${sid}/${k}/end`, { t: Date.now(), by: 'teacher' }); toast('已收卷'); }
    else if (b.dataset.m === 'unlock') { await FB.set(`exam/m/${CUR}/s/${sid}/${k}/dev`, ''); toast('🔓 已解除裝置鎖'); }
    else if (b.dataset.m === 'bonus') await giveBonus(sid, 1);
  };
}

/* 📺 考場投影看板：只有人數、狀態顏色（座號），不顯示姓名、分數、答案 */
function projBoard() {
  const p = document.createElement('div'); p.className = 'proj projb';
  document.body.appendChild(p);
  const paint = () => {
    const R = rows(), c = monCount(R), now = Date.now();
    const byCls = {}; R.forEach((r) => { const k = r.info.cls || '—'; (byCls[k] = byCls[k] || []).push(r); });
    const col = (r) => r.st === 'doing' ? (r.off > OFFLINE_MS ? 'off' : 'doing') : r.st === 'none' ? 'none' : r.st === 'guard' ? 'guard' : 'done';
    p.innerHTML = `<button class="x">✕ 關閉</button>
      <div class="row" style="gap:14px;justify-content:center"><span class="badge" style="font-size:1rem">🎲 線上檢定所</span><h1 style="margin:0">${esc(META.title)}</h1><span class="bigcode" style="font-size:2rem">${CUR}</span></div>
      <div style="font-size:1.25rem;font-weight:700">${X.STATE[X.stateOf(META)]}・現在 <span class="mono">${X.fmtClock(now)}</span>${META.closeAt ? `・截止 <span class="mono">${X.fmtTime(META.closeAt)}</span>` : ''}・作答 ${META.mins} 分鐘</div>
      <div class="pstats">${c.roster ? `<div><b>${c.none}</b>⚪ 未進入</div>` : ''}<div><b>${c.doing}</b>🔵 作答中</div><div><b>${c.done}</b>✅ 已交卷</div><div><b>${c.guard}</b>🚨 系統代結</div>${c.off ? `<div><b>${c.off}</b>📴 失聯</div>` : ''}</div>
      <div class="pseats">${Object.keys(byCls).sort().map((k) => `<div class="pcls"><span>${esc(k)}</span>${byCls[k].map((r) => `<i class="${col(r)}" title="${esc(k)}-${r.info.seat || ''}">${r.info.seat || '?'}</i>`).join('')}</div>`).join('')}</div>
      <div class="small" style="opacity:.75">⚪ 未進入　🔵 作答中　🟢 已交卷　🔴 系統代結　🟠 失聯｜畫面不顯示姓名與分數</div>`;
    $('.x', p).onclick = () => { PROJ = null; clearInterval(t); p.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); };
  };
  PROJ = paint; paint();
  const t = setInterval(paint, 2000);
  if (p.requestFullscreen) p.requestFullscreen().catch(() => { });
}

/* ✏️ 閱卷：一題看全班 */
function markItems(qid) {
  const out = [];
  Object.keys(SUBS).forEach((sid) => attemptsOf(sid).forEach((a) => {
    if (!a.end) return;
    const sh = X.sheetFor(PAPER, META, CUR, sid, a.k); if (!sh.ids.includes(qid)) return;
    const v = (a.ans || {})[qid], mg = ((MG[sid] || {})[a.k] || {})[qid], cm = ((MC[sid] || {})[a.k] || {})[qid] || '';
    out.push({ sid, k: a.k, info: a.info || infoOf(sid), v, mg: mg == null ? null : +mg, cm, opt: sh.opt[qid] });
  }));
  return out.sort((x, y) => String(x.info.cls).localeCompare(String(y.info.cls)) || (x.info.seat || 0) - (y.info.seat || 0) || x.k - y.k);
}
async function paintMark(el) {
  await loadCmts();
  const ids = Object.keys(PAPER).sort((a, b) => PAPER[a].i - PAPER[b].i);
  const shorts = ids.filter((id) => PAPER[id].t === 'a'), choices = ids.filter((id) => PAPER[id].t !== 'a');
  if (!MK.qid || !PAPER[MK.qid]) MK.qid = shorts[0] || choices[0] || '';
  const prog = (id) => { const it = markItems(id).filter((x) => X.answered('a', x.v)); return { n: it.length, done: it.filter((x) => x.mg != null).length }; };
  const rate = (id) => { const it = markItems(id); if (!it.length) return null; const ok = it.filter((x) => X.scoreOne(PAPER[id], KEY[id] || {}, x.v, x.mg).ok).length; return Math.round(ok / it.length * 100); };
  el.innerHTML = `<div class="markwrap"><div class="card marklist" style="margin:0">
      <b>✏️ 簡答題</b>${shorts.length ? shorts.map((id) => { const p = prog(id); return `<button class="mq ${MK.qid === id ? 'on' : ''}" data-q="${id}"><span>第 ${PAPER[id].i + 1} 題</span><span class="muted small">${esc(X.plain(PAPER[id].s).slice(0, 28))}</span><span class="chip ${p.n && p.done === p.n ? 'ok' : p.n ? 'warn' : 'gray'}">${p.done}/${p.n}</span></button>`; }).join('') : '<div class="small muted">這份測驗沒有簡答題</div>'}
      <b style="display:block;margin-top:12px">🔘 選擇題（看答對率、送分）</b>${choices.map((id) => { const r = rate(id); return `<button class="mq ${MK.qid === id ? 'on' : ''}" data-q="${id}"><span>第 ${PAPER[id].i + 1} 題</span><span class="muted small">${esc(X.plain(PAPER[id].s).slice(0, 28))}</span><span class="chip ${r == null ? 'gray' : r >= 70 ? 'ok' : r >= 40 ? 'warn' : 'bad'}">${r == null ? '—' : r + '%'}</span></button>`; }).join('')}
    </div><div id="markBody"></div></div>`;
  $$('.marklist .mq', el).forEach((b) => { b.onclick = () => { MK.qid = b.dataset.q; paintMark(el); }; });
  const body = $('#markBody', el), q = PAPER[MK.qid];
  if (!q) { body.innerHTML = '<div class="card empty">還沒有題目</div>'; return; }
  const items = markItems(MK.qid), key = KEY[MK.qid] || {};
  if (q.t === 'a') {
    const ans = items.filter((x) => X.answered('a', x.v)), blank = items.length - ans.length;
    let list = MK.todo ? ans.filter((x) => x.mg == null) : ans;
    if (MK.anon) list = list.slice().sort((x, y) => X.hashStr(x.sid + x.k + CUR) - X.hashStr(y.sid + y.k + CUR));
    body.innerHTML = `<div class="card" style="margin:0"><div class="row"><h3>第 ${q.i + 1} 題・簡答（${q.p} 分）</h3><span class="sp"></span><label class="ck"><input type="checkbox" id="mkAnon" ${MK.anon ? 'checked' : ''}>🙈 匿名閱卷</label>${tip('隱藏班級座號姓名，並把答案順序打亂，避免印象分數。')}<label class="ck"><input type="checkbox" id="mkTodo" ${MK.todo ? 'checked' : ''}>只看未批</label><button class="btn ghost sm" id="mkRe">🔄 重新整理</button></div>
      <div class="qview" style="margin-top:8px"><div class="qhtml" id="mkStem"></div>${key.r ? '<div class="exp"><b>參考答案：</b><div class="qhtml" id="mkRef"></div></div>' : ''}</div>
      <div class="row small" style="margin:6px 0"><span class="chip ${ans.filter((x) => x.mg != null).length === ans.length && ans.length ? 'ok' : 'warn'}">已批 ${ans.filter((x) => x.mg != null).length}／${ans.length} 份</span>${blank ? `<span class="chip gray">空白 ${blank} 份（自動 0 分）</span>` : ''}<span class="sp"></span><span class="muted">輸入分數或按快速鍵就會存；評語可以點常用評語加入</span></div>
      <div class="row small cmts" id="mkCm"><b>💬 常用評語</b>${CMTS.map((t, i) => `<span class="chip"><button type="button" class="linkbtn" data-ci="${i}" style="text-decoration:none;color:inherit">${esc(t)}</button><button type="button" data-cdel="${i}" title="刪掉這個常用評語" style="border:0;background:none;cursor:pointer;color:inherit">×</button></span>`).join('')}<button class="btn ghost sm" id="mkCAdd">＋ 新增</button><span class="muted">（點了會加到你最後點的那份評語）</span></div>
      <div id="mkList">${list.length ? list.map((x, n) => `<div class="mkitem ${x.mg != null ? 'done' : ''}" data-key="${x.sid}/${x.k}"><div class="row small"><b>${MK.anon ? '答案 #' + (n + 1) : who(x.info) + ` <span class="mono muted">${x.sid}</span>・第 ${x.k} 次`}</b><span class="sp"></span>${x.mg != null ? '<span class="chip ok">✅ 已批</span>' : '<span class="chip warn">未批</span>'}</div>
        <div class="mkans">${esc(x.v).replace(/\n/g, '<br>')}</div>
        <div class="row"><input type="number" class="mkscore" min="0" max="${q.p}" step="0.5" value="${x.mg == null ? '' : x.mg}" placeholder="／${q.p}" style="width:90px"><span class="small muted">／${q.p} 分</span><button class="btn ghost sm" data-quick="0">0</button><button class="btn ghost sm" data-quick="${X.round2(q.p / 2)}">${X.round2(q.p / 2)}</button><button class="btn ghost sm" data-quick="${q.p}">滿分 ${q.p}</button>
          <input type="text" class="mkcm" maxlength="300" value="${esc(x.cm)}" placeholder="💬 評語（選填，公布題目時學生看得到）" style="flex:1;min-width:200px"></div></div>`).join('') : `<div class="empty small">${ans.length ? '這題都批完了 🎉' : '還沒有人作答這題（或都是空白）'}</div>`}</div></div>`;
    renderInto($('#mkStem', body), q.s, true); if (key.r) renderInto($('#mkRef', body), key.r);
    $('#mkAnon', body).onchange = (e) => { MK.anon = e.target.checked; paintMark(el); };
    $('#mkTodo', body).onchange = (e) => { MK.todo = e.target.checked; paintMark(el); };
    $('#mkRe', body).onclick = () => paintMark(el);
    let lastCm = null;
    const saveScore = async (item, v) => {
      const [sid, k] = item.dataset.key.split('/');
      const val = v === '' || v == null ? null : Math.max(0, Math.min(q.p, +v));
      await FB.set(`exam/m/${CUR}/mg/${sid}/${k}/${MK.qid}`, val);
      $('.mkscore', item).value = val == null ? '' : val; item.classList.toggle('done', val != null);
      const ch = item.querySelector('.chip'); if (ch) { ch.className = 'chip ' + (val != null ? 'ok' : 'warn'); ch.textContent = val != null ? '✅ 已批' : '未批'; }
      toast(val == null ? '已清除分數' : `✅ ${val} 分`, 1200);
    };
    const saveCm = async (input) => { const item = input.closest('.mkitem'), [sid, k] = item.dataset.key.split('/'); await FB.set(`exam/m/${CUR}/mc/${sid}/${k}/${MK.qid}`, input.value.trim().slice(0, 300) || null); toast('💬 已存評語', 1200); };
    $('#mkList', body).onchange = (e) => { const it = e.target.closest('.mkitem'); if (!it) return; if (e.target.matches('.mkscore')) saveScore(it, e.target.value); else if (e.target.matches('.mkcm')) saveCm(e.target); };
    $('#mkList', body).onclick = (e) => { const b = e.target.closest('[data-quick]'); if (b) saveScore(b.closest('.mkitem'), b.dataset.quick); };
    $('#mkList', body).addEventListener('focusin', (e) => { if (e.target.matches('.mkcm')) lastCm = e.target; });
    $('#mkCm', body).onclick = async (e) => {
      const add = e.target.closest('#mkCAdd'), ci = e.target.closest('[data-ci]'), cd = e.target.closest('[data-cdel]');
      if (add) { const t = (prompt('新增常用評語（最多 120 字）') || '').trim().slice(0, 120); if (!t) return; CMTS.push(t); await saveCmts(); return paintMark(el); }
      if (cd) { CMTS.splice(+cd.dataset.cdel, 1); await saveCmts(); return paintMark(el); }
      if (ci) { const tgt = lastCm || $('.mkcm', body); if (!tgt) return; const t = CMTS[+ci.dataset.ci]; tgt.value = tgt.value ? tgt.value + '；' + t : t; await saveCm(tgt); tgt.focus(); }
    };
  } else {
    const n = items.length, cnt = q.o.map(() => 0); let blank = 0, ok = 0;
    items.forEach((x) => { if (!X.answered(q.t, x.v)) blank++; const sel = q.t === 's' ? (typeof x.v === 'number' ? [x.v] : []) : Object.keys(X.multiToSet(x.v)).map(Number); sel.forEach((i) => { if (cnt[i] != null) cnt[i]++; }); if (X.scoreOne(q, key, x.v).ok) ok++; });
    const gift = n && items.every((x) => x.mg != null && +x.mg === +q.p);
    body.innerHTML = `<div class="card" style="margin:0"><div class="row"><h3>第 ${q.i + 1} 題・${X.TYPES[q.t]}（${q.p} 分）</h3><span class="sp"></span>${gift ? '<span class="chip ok">🎁 已全體送分</span><button class="btn ghost sm" id="mkUngift">↩️ 取消送分</button>' : `<button class="btn purple sm" id="mkGift" ${n ? '' : 'disabled'}>🎁 全體送分</button>`}${tip('題目有爭議時使用：每位作答過這題的同學（含空白）這題都給滿分。取消送分會恢復系統原本的判分。')}</div>
      <div class="qview" style="margin-top:8px" id="mkQ"></div>
      <div class="stats"><div class="stat"><b>${n}</b><span>作答人次</span></div><div class="stat"><b>${n ? Math.round(ok / n * 100) : '—'}%</b><span>原本的答對率</span></div><div class="stat"><b>${blank}</b><span>沒作答</span></div></div>
      <table class="t"><thead><tr><th>選項</th><th>內容</th><th class="num">選的人次</th><th style="width:40%">比例</th></tr></thead><tbody>${q.o.map((o, i) => `<tr><td><b>${X.LETTERS[i]}</b>${(key.a || []).includes(i) ? ' ✅' : ''}</td><td>${esc(X.plain(o).slice(0, 60))}</td><td class="num">${cnt[i]}</td><td><div class="pbar ${(key.a || []).includes(i) ? 'ok' : ''}"><i style="width:${n ? Math.round(cnt[i] / n * 100) : 0}%"></i></div></td></tr>`).join('')}</tbody></table>
      <p class="small muted">字母是題庫原始順序。錯誤選項選的人多，代表誘答力強，可以回頭講解。</p></div>`;
    $('#mkQ', body).innerHTML = qViewHTML(Object.assign({}, q, { a: key.a || [], e: key.e }), q.i + 1, { noExp: true }); fillQView($('#mkQ .qview', body), Object.assign({}, q, { a: key.a || [] }));
    const set = async (val) => { const up = {}; items.forEach((x) => { up[`${x.sid}/${x.k}/${MK.qid}`] = val; }); await FB.update(`exam/m/${CUR}/mg`, up); setTimeout(() => paintMark(el), 700); };
    const g1 = $('#mkGift', body); if (g1) g1.onclick = async () => { if (!confirm(`第 ${q.i + 1} 題全體送分：${n} 份作答這題都給滿分 ${q.p} 分？`)) return; await set(q.p); toast('🎁 已全體送分'); };
    const g2 = $('#mkUngift', body); if (g2) g2.onclick = async () => { if (!confirm('取消送分，恢復系統原本的判分？')) return; await set(null); toast('↩️ 已取消送分'); };
  }
}
