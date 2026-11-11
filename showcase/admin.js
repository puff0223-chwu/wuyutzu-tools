/* =========================================================
   🔧 教師展覽館管理頁 v2（2026-11-08 全面檢修）
   ---------------------------------------------------------
   用小學生的話說：
   - 展覽館的內容存在 Firebase 的 showcase/pub（像一本公開的目錄），只有管理員能改
   - 「母頁」＝事務所首頁 index.html；這一頁會讀母頁的工具清單，母頁改了就列在「📬 需要你看一下」
   - 每次存檔都會「寫進去 → 再讀回來確認」，畫面上看到的永遠是資料庫裡真正的內容
   - 上方燈號：🟢 已連線才能存檔；🔴 斷線時存檔按鈕會擋住，不會以為存了其實沒存
   分頁（網址 # 後面）：#cards 卡片清單、#edit/<id> 編輯、#tools 母頁工具、#drawers 分類、#help 使用說明
   ========================================================= */
const SC = window.SHOWCASE, W = window.WuStaff, esc = SC.esc;
const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const tip = (t) => `<span class="tip" tabindex="0" data-tip="${esc(t)}">?</span>`;
const toast = (m, err) => { $$('.toast').forEach((x) => x.remove()); const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 2800); };
const rid = (n) => { const c = 'abcdefghijklmnopqrstuvwxyz0123456789', a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, (v) => c[v % c.length]).join(''); };
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));
const copy = (o) => JSON.parse(JSON.stringify(o));
const MODE_TXT = { show: ['👀 只展示', '其他老師只看得到說明和截圖，不能使用。想用的人請私訊你。'], apply: ['🔐 開放申請', '其他老師到會員中心申請帳號，你核准後才能用。'], open: ['🚀 免申請直接用', '不用帳號，按一下就能用（免登入的小工具）。'] };
// 「開放使用」實際是哪一種：會員中心有這個系統（自動對應）→ 要申請；沒有帳號系統的工具 → 免申請直接用
const useMode = (l, id) => (SC.appOf(l, id) ? 'apply' : 'open');
const useLabel = (l, id) => (SC.appOf(l, id) ? '🔐 開放使用（要申請）' : '🚀 開放使用（免申請）');
// 首頁工具是不是會員中心的系統、展覽館已經有那個系統的卡片（例：首頁新加的「成績調閱室」卡＝展覽館的 grade 卡）
const linkable = (tid) => { const a = SC.appOf({ from: [tid], url: '' }, ''); if (!a) return ''; return Object.keys(S.pub.list).find((id) => S.pub.list[id].app === a && !S.pub.list[id].from.length && !S.pub.list[id].parts.length) || ''; };
const isSoon = (tid) => !!(SC.MOTHER && SC.MOTHER.tools[tid] && SC.MOTHER.tools[tid].soon);
const S = { user: null, pub: null, conn: null, ownRevs: new Set(), filter: 'all', q: '', safety: {}, ed: null, stale: false };
let FB, M;

/* =========================================================
   登入
   ========================================================= */
async function boot() {
  try { M = await import('../account/fb.js?v=20261020a'); FB = await M.openFirebase('showcase'); }
  catch (e) { $('#app').innerHTML = `<div class="panel gate"><h2>😵 連不上 Firebase</h2><p class="muted">請確認網路後重新整理。（${esc(e.message || e)}）</p></div>`; return; }
  FB.listen('.info/connected', (v) => { S.conn = !!v; paintConn(); });
  FB.onUser(async (u) => {
    S.user = u;
    if (!u) return renderLogin();
    if (!W.isAdmin(u)) return renderNotAdmin();
    FB.idle(60000);   // 分頁藏到背景 60 秒讓出連線，回來自動重連（手冊 6-D）
    await loadAll(true);
    FB.listen('showcase/pub/rev', onRemoteRev);
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', (e) => { if (S.ed && S.ed.dirty) { e.preventDefault(); e.returnValue = ''; } });
}
function paintConn() {
  const c = $('#conn'); if (!c) return;
  c.className = 'conn ' + (S.conn ? 'on' : S.conn === false ? 'off' : '');
  c.querySelector('span').textContent = S.conn ? '已連線' : S.conn === false ? '離線：先不要存檔' : '連線中…';
  $$('[data-needconn]').forEach((b) => { b.disabled = S.conn === false; });
}
function topLinks() {
  $('#topLinks').innerHTML = S.user && W.isAdmin(S.user)
    ? `<span class="who">${esc(S.user.email)}</span> <a href="./" target="_blank" rel="noopener">👀 看展覽館 ↗</a> <a href="../index.html">🏠 事務所首頁</a> <button id="out">登出</button>`
    : (S.user ? '<button id="out">登出</button>' : '');
  const o = $('#out'); if (o) o.onclick = () => FB.logout();
}
function renderLogin(err) {
  topLinks();
  $('#app').innerHTML = `<div class="panel gate"><h2>🔐 管理員登入</h2>
    <p class="muted small" style="margin:4px 0 14px">這一頁只有巫魚子老師的管理員帳號可以使用。</p>
    ${M.googleButtonHTML('gG', '使用 Google 帳號登入')}
    <label class="f">Email</label><input type="text" id="lE" autocomplete="username"><label class="f">密碼</label><input type="password" id="lP" autocomplete="current-password">
    <div class="row" style="margin-top:14px"><button class="btn" id="lGo">登入</button></div>${err ? `<div class="warn">${esc(err)}</div>` : ''}</div>`;
  $('#gG').onclick = async () => { try { await FB.google(); } catch (e) { renderLogin(M.authErr(e)); } };
  $('#lGo').onclick = async () => { try { await FB.login($('#lE').value.trim(), $('#lP').value); } catch (e) { renderLogin(M.authErr(e)); } };
}
function renderNotAdmin() {
  topLinks();
  $('#app').innerHTML = `<div class="panel gate"><h2>🙅 這個帳號不能管理展覽館</h2><p class="muted" style="margin-top:8px">目前登入：${esc(S.user.email)}。只有巫魚子老師的管理員帳號可以使用這一頁。</p><div class="row" style="margin-top:12px"><a class="btn ghost" href="./">← 回教師展覽館</a></div></div>`;
}

/* =========================================================
   讀資料：展覽館（Firebase）＋母頁工具清單
   ========================================================= */
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error(msg), { code: 'timeout' })), ms))]);
async function readPub() { return withTimeout(FB.get('showcase/pub'), 15000, '讀取展覽館逾時'); }
async function loadAll(first) {
  topLinks();
  if (first) $('#app').innerHTML = '<p class="muted" style="text-align:center;margin-top:16vh">讀取展覽館與事務所首頁…</p>';
  let raw;
  try { raw = await readPub(); }
  catch (e) { $('#app').innerHTML = `<div class="panel gate"><h2>😵 讀不到展覽館資料</h2><p class="muted">${esc(e.code === 'timeout' ? 'Firebase 一直沒有回應，可能是網路不穩。' : (e.code || e.message))}</p><div class="row" style="margin-top:12px"><button class="btn" id="retry">🔄 再試一次</button></div></div>`; $('#retry').onclick = () => loadAll(true); return; }
  try { await SC.loadMother('../'); S.motherErr = ''; } catch (e) { S.motherErr = e.message || String(e); }
  if (!raw || !raw.rev) return renderWelcome();
  S.raw = raw;
  SC.setPub(raw, 'admin'); S.pub = SC.PUB; S.stale = false;
  if ((+raw.v || 1) < 2) { await upgradeV2(raw); return; }
  // 以前選了「開放申請」但其實沒有帳號系統的工具（例：化學尋寶）→ 自動改成免申請直接用
  const fix = {}, fixed = [];
  Object.keys(S.pub.list).forEach((id) => { const l = S.pub.list[id]; if (l.mode === 'apply' && !l.parts.length && !SC.appOf(l, id)) { fix[`list/${id}/mode`] = SC.face(id).url ? 'open' : 'show'; fixed.push(SC.face(id).name); } });
  if (fixed.length && S.conn !== false) { try { await commit(fix, false); toast(`🔧 已自動修正：${fixed.join('、')} 沒有帳號系統，改成「開放使用（免申請）」`); } catch (e) { } }
  route();
}
// 被別的分頁、別台電腦改過：沒有在編輯就直接重新整理，正在編輯就提醒
function onRemoteRev(rev) {
  if (!rev || !S.pub || +rev === S.pub.rev || S.ownRevs.has(+rev)) return;
  if (S.ed && S.ed.dirty) { S.stale = true; paintBanner(); return; }
  loadAll(false).then(() => toast('🔄 展覽館在別的地方被改過，已更新成最新內容'));
}
function paintBanner() {
  const b = $('#banner'); if (!b) return;
  b.innerHTML = S.stale ? `<div class="warn row"><span class="grow">⚠️ 展覽館剛剛在別的分頁或電腦被改過。你這裡的修改還沒存；存檔只會寫入這張卡片，其他卡片不受影響。</span><button class="btn xs" id="bnReload">放棄修改、重新載入</button></div>` : '';
  const r = $('#bnReload'); if (r) r.onclick = () => { S.ed = null; loadAll(false); };
}

/* ---------- v1 → v2 自動升級（只做一次）：名稱和母頁一樣的卡片打開「跟母頁同步」 ---------- */
async function upgradeV2(raw) {
  const paths = {}, L = S.pub.list;
  Object.keys(L).forEach((id) => {
    const l = L[id], m = l.from.length === 1 && SC.motherTool(l.from[0]);
    const same = !!m && m.name === l.name;
    paths[`list/${id}/sync`] = same;
    // 名稱一樣的卡片：記下首頁現在的樣子（之後首頁任何一欄改了都抓得到）；名稱不一樣的留給「📬 需要你看一下」問老師
    if (same || l.from.length > 1) paths[`list/${id}/mref`] = SC.snapMref(l.from);
  });
  if (!SC.MOTHER) { route(); return; }   // 讀不到母頁就先不升級，下次再說
  try { await commit(paths, false); toast('⬆️ 展覽館資料已升級到新版（名稱和事務所首頁一樣的卡片，之後會自動跟著首頁改）'); }
  catch (e) { toast('升級沒有成功：' + errText(e), true); }
  route();
}

/* =========================================================
   存檔：寫入 → 讀回來確認 → 重畫
   ========================================================= */
const errText = (e) => e && e.code === 'timeout' ? 'Firebase 沒有回應（網路不穩）。連線恢復後會自動送出，請先不要關掉這一頁。'
  : e && /permission/i.test(e.code || e.message || '') ? '沒有權限（請確認是用管理員 Google 帳號登入）'
  : (e && (e.code || e.message)) || String(e);
async function commit(paths, msg) {
  if (S.conn === false) throw Object.assign(new Error('目前離線，請等右上角燈號變綠再存檔'), { code: 'offline' });
  const rev = Date.now();
  S.ownRevs.add(rev);
  const up = clean(Object.assign({}, paths, { rev, v: SC.SCHEMA }));
  await withTimeout(FB.update('showcase/pub', up), 15000, '儲存逾時');
  const raw = await readPub();   // 讀回來確認真的存進去了
  if (!raw || +raw.rev !== rev) { S.raw = raw; SC.setPub(raw, 'admin'); S.pub = SC.PUB; throw new Error('存檔後讀回來的內容不一樣（可能同時有別的分頁在改），請重新檢查'); }
  S.raw = raw; SC.setPub(raw, 'admin'); S.pub = SC.PUB; S.stale = false;
  if (msg !== false) toast(msg || '💾 已儲存，展覽館已更新（分享頁約 30 分鐘內更新）');
}

/* =========================================================
   免申請工具的安全檢查：頁面不能有「回事務所首頁」的按鈕
   ========================================================= */
const HOME_RE = /回事務所首頁|返回工具箱首頁|href="(\.\.\/)+(index\.html)?"|href="\/wuyutzu-tools\/?(index\.html)?"/;
function safety(url) {
  url = String(url || '').trim();
  if (!url) return Promise.resolve('none');
  if (/^https?:\/\//.test(url)) return Promise.resolve('ext');
  if (!SC.isSiteURL(url)) return Promise.resolve('missing');
  if (S.safety[url]) return S.safety[url];
  return (S.safety[url] = fetch('../' + url, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then((t) => (HOME_RE.test(t) ? 'bad' : 'ok')).catch(() => { delete S.safety[url]; return 'missing'; }));
}
const SAFE_TXT = { ok: '<span class="st ok">✅ 可以免申請開放</span>', bad: '<span class="st bad">⚠️ 頁面有回首頁按鈕</span>', ext: '<span class="st ext">🌐 外部網站</span>', missing: '<span class="st bad">❓ 找不到頁面</span>', none: '' };
// 完整健檢（含網址檢查）
async function health(id) {
  const out = SC.check(id), l = S.pub.list[id];
  if (l && !l.parts.length && l.mode === 'open') {
    const s = await safety(SC.face(id).url);
    if (s === 'bad') out.unshift({ lv: 'err', msg: '工具頁面有「回事務所首頁」的按鈕，不能免申請開放（改成「👀 只展示」，或請 Claude 拿掉按鈕）', key: 'url' });
    if (s === 'missing') out.unshift({ lv: 'err', msg: '工具網址打開是「找不到頁面」', key: 'url' });
  }
  return out;
}
const blocking = (hs) => hs.filter((h) => h.lv === 'err');

/* =========================================================
   📬 需要你看一下（待處理）：母頁改過、母頁沒有了、新工具、建議建立套組、看得見的卡片有問題
   ========================================================= */
function draftFor(tid) {
  const D = SC.DRAFTS || {};
  if (D[tid] && !(D[tid].parts || []).length) return D[tid];
  return Object.values(D).find((d) => (d.from || [])[0] === tid && !(d.parts || []).length) || null;
}
function suiteDraftFor(tid) { const D = SC.DRAFTS || {}; const k = Object.keys(D).find((k) => (D[k].parts || []).length && (D[k].from || [])[0] === tid); return k ? Object.assign({ id: k }, D[k]) : null; }
function inbox() {
  const L = S.pub.list, items = [], MO = SC.MOTHER;
  if (S.motherErr) items.push({ ic: '⚠️', html: `讀不到事務所首頁的工具清單，「母頁連動」暫時停用。<small>${esc(S.motherErr)}</small>`, ops: [['🔄 重新讀取', () => loadAll(false)]] });
  const used = new Set(); Object.values(L).forEach((l) => l.from.forEach((t) => used.add(t)));
  const suggested = new Set();
  if (MO) {
    // ① 母頁的工具變成好幾個系統的「大廳」（例：成績調閱室 → 課堂小鎮），而且已經準備好套組初版
    MO.order.forEach((tid) => {
      const sd = suiteDraftFor(tid); if (!sd || L[sd.id]) return;
      const t = MO.tools[tid], cur = Object.keys(L).filter((id) => L[id].from.includes(tid));
      suggested.add(tid); cur.forEach((id) => suggested.add('card:' + id));
      items.push({ ic: '🏘️', html: `事務所首頁的「<b>${esc(t.icon + ' ' + t.name)}</b>」現在是 ${sd.parts.length} 個系統的大廳。<small>建議在展覽館建立「套組卡」：整個${esc(t.name)}一個開關，裡面的 ${sd.parts.length} 個系統也可以一個一個決定要「開放申請」還是「只展示」。${cur.length ? `原本的「${esc(cur.map((id) => L[id].name).join('、'))}」會變成套組裡的一個系統（內容保留）。` : ''}</small>`, ops: [['🏘️ 建立套組卡（推薦）', () => createSuite(sd, tid), 'btn']] });
    });
    // ② 卡片對應的母頁工具改過了／沒有了
    Object.keys(L).forEach((id) => {
      const l = L[id];
      if (suggested.has('card:' + id)) return;
      l.from.forEach((tid) => { if (!MO.tools[tid]) items.push({ ic: '❓', html: `「<b>${esc(l.name)}</b>」對應的首頁工具「${esc(tid)}」已經不在事務所首頁了。<small>卡片會照原本的內容顯示。</small>`, ops: [['✏️ 編輯', () => go('edit/' + id)], ['解除對應', () => unlinkMother(id, tid)]] }); });
      SC.motherChanges(id).forEach((ch) => {
        const diffs = ch.keys.map((k) => diffHTML(k, ch.ref[k], ch.cur[k])).join('');
        const nm = esc(ch.cur.icon + ' ' + ch.cur.name);
        if (l.sync && l.from.length === 1) items.push({ ic: '🔗', html: `首頁改過「<b>${nm}</b>」${ch.keys.some((k) => k === 'name' || k === 'icon') ? '，展覽館的名稱、圖示已經自動跟著改' : ''}。<br>${diffs}<small>展覽館的一句話、說明內容要不要也跟著調整？</small>`, ops: [['✏️ 去調整', () => go('edit/' + id)], ['✔ 不用改', () => ackMother(id)]] });
        else if (l.from.length === 1) items.push({ ic: '🏠', html: `首頁的「<b>${nm}</b>」和展覽館卡片「${esc(l.name)}」不一樣了。<br>${diffs}`, ops: [['🔗 名稱圖示跟首頁同步', () => syncMother(id), 'btn'], ['✏️ 自己調整', () => go('edit/' + id)], ['✔ 保持不一樣', () => ackMother(id)]] });
        else items.push({ ic: '🏠', html: `「<b>${esc(l.name)}</b>」包含的首頁工具「${nm}」改過了。<br>${diffs}`, ops: [['✏️ 去調整', () => go('edit/' + id)], ['✔ 不用改', () => ackMother(id)]] });
      });
    });
    // ③ 首頁新加的卡片就是展覽館已經有的系統 → 對應起來（之後名稱、位置跟著首頁）
    MO.order.forEach((tid) => {
      if (used.has(tid) || isSoon(tid)) return;
      const cid = linkable(tid); if (!cid) return;
      suggested.add(tid);
      const t = MO.tools[tid];
      items.push({ ic: '🔗', html: `首頁新加的「<b>${esc(t.icon + ' ' + t.name)}</b>」就是展覽館的「${esc(L[cid].name)}」卡片。<small>對應起來之後，名稱、圖示、放在哪個分類都會跟著首頁。</small>`, ops: [['🔗 對應起來', () => linkTool(cid, tid), 'btn']] });
    });
    // ④ 首頁的新工具還沒決定要不要放展覽館（🚧 籌備中的不算）
    const fresh = MO.order.filter((tid) => !used.has(tid) && !S.pub.skip[tid] && !suggested.has(tid) && !isSoon(tid));
    if (fresh.length) items.push({ ic: '🆕', html: `事務所首頁有 <b>${fresh.length}</b> 個工具還沒決定要不要放展覽館：${fresh.map((t) => esc(MO.tools[t].icon + ' ' + MO.tools[t].name)).join('、')}`, ops: [['🧰 去決定', () => go('tools')]] });
  }
  // ④ 會員中心有這個系統可以申請，展覽館卻沒有卡片（例：新接上會員中心的系統）
  const pendingSuiteApps = new Set();
  Object.keys(SC.DRAFTS || {}).forEach((k) => { const d = SC.DRAFTS[k]; if ((d.parts || []).length && !L[k]) d.parts.forEach((p) => { const g = (SC.DRAFTS[p] || (SC.GUIDES || {})[p]); if (g) pendingSuiteApps.add(g.app || p); }); });
  const usedApps = new Set(Object.values(L).map((l) => l.app).filter(Boolean));
  Object.keys(W.APPS || {}).forEach((code) => {
    if (usedApps.has(code) || pendingSuiteApps.has(code)) return;
    const a = W.APPS[code];
    items.push({ ic: '👥', html: `會員中心可以申請「<b>${esc(a.name)}</b>」，但展覽館還沒有它的卡片。<small>${esc(a.desc || '')}</small>`, ops: [['➕ 建立卡片', () => addFromApp(code), 'btn']] });
  });
  // ④ 看得見的卡片有一定要修的問題
  Object.keys(L).forEach((id) => {
    if (!SC.visible(id)) return;
    const errs = SC.check(id).filter((h) => h.lv === 'err');
    if (errs.length) items.push({ ic: '⛔', html: `「<b>${esc(SC.face(id).name)}</b>」${esc(errs.map((h) => h.msg).join('；'))}`, ops: [['✏️ 修正', () => go('edit/' + id)]] });
  });
  return items;
}
// 比對結果怎麼顯示：功能清單列出加了哪些、拿掉哪些；其他欄位「舊 → 新」
function diffHTML(k, a, b) {
  const lab = SC.MLABEL[k] || k;
  if (k === 'features') {
    const A = SC.arr(a), B = SC.arr(b), add = B.filter((x) => !A.includes(x)), del = A.filter((x) => !B.includes(x));
    return `<span class="diff">${lab}：${add.map((x) => `<ins>＋${esc(x)}</ins>`).join('、')}${add.length && del.length ? '；' : ''}${del.map((x) => `<del>－${esc(x)}</del>`).join('、')}${!add.length && !del.length ? '順序改了' : ''}</span>`;
  }
  if (k === 'teacher') return `<span class="diff">${lab}：<ins>${b ? '老師專用' : '不是老師專用'}</ins></span>`;
  const cut = (v) => { v = String(v || ''); return v.length > 60 ? v.slice(0, 60) + '…' : v; };
  return `<span class="diff">${lab}：<del>${esc(cut(a) || '（空）')}</del> → <ins>${esc(cut(b) || '（空）')}</ins></span>`;
}
// 「看過了」＝把首頁現在的樣子記成新的快照
async function linkTool(id, tid) { try { await commit({ [`list/${id}/from`]: [tid], [`list/${id}/sync`]: true, [`list/${id}/mref`]: SC.snapMref([tid]) }, '🔗 已對應，之後跟著首頁'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }
async function ackMother(id) { try { await commit({ [`list/${id}/mref`]: SC.snapMref(S.pub.list[id].from) }, '✔ 已記下，之後首頁再改才會提醒'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }
async function syncMother(id) { try { await commit({ [`list/${id}/sync`]: true, [`list/${id}/mref`]: SC.snapMref(S.pub.list[id].from) }, '🔗 已改成跟首頁同步'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }
async function unlinkMother(id, tid) { const f = S.pub.list[id].from.filter((x) => x !== tid); try { await commit({ [`list/${id}/from`]: f, [`list/${id}/sync`]: f.length === 1 && S.pub.list[id].sync, [`list/${id}/mref`]: SC.snapMref(f) }, '已解除對應'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }

/* ---------- 🏘️ 建立套組卡（照 drafts.js 的初版） ---------- */
async function createSuite(sd, tid) {
  const L = S.pub.list, D = SC.DRAFTS || {}, paths = {};
  const old = Object.keys(L).filter((id) => L[id].from.includes(tid));
  const base = old.map((id) => L[id])[0];
  const drawerId = (k) => (S.pub.drawers['d' + (+k + 1)] ? 'd' + (+k + 1) : (SC.drawers()[0] || {}).id || '');
  const parts = [];
  for (const pid of sd.parts) {
    if (L[pid]) {
      if (SC.suiteOf(pid)) continue;   // 已經在別的套組裡
      parts.push(pid);
      if (L[pid].from.includes(tid)) { paths[`list/${pid}/from`] = []; paths[`list/${pid}/sync`] = false; paths[`list/${pid}/mref`] = null; }
      const sg = (SC.GUIDES || {})[pid];
      paths[`list/${pid}/solo`] = !!(sg && sg.solo) || (L[pid].drawer !== (base ? base.drawer : drawerId(sd.drawer)));   // 原本在別的抽屜（例：線上檢定所）→ 也單獨展出
    } else if (D[pid]) {
      const g = D[pid];
      parts.push(pid);
      paths[`list/${pid}`] = { on: g.on !== false, drawer: drawerId(g.drawer), shelf: g.shelf || '', order: 0, icon: g.icon, name: g.name, brief: g.brief, mode: g.mode || 'show', app: g.app || '', url: g.url || '', from: g.from || [], sync: false, mref: null, parts: [], solo: false };
      const it = {}; SC.ITEM_KEYS.forEach((k) => { if (g[k] != null) it[k] = g[k]; });
      paths[`items/${pid}`] = it;
    }
  }
  const t = SC.MOTHER.tools[tid];
  paths[`list/${sd.id}`] = { on: base ? base.on : true, drawer: base ? base.drawer : drawerId(sd.drawer), shelf: base ? base.shelf : (sd.shelf || ''), order: base ? base.order : 0,
    icon: t.icon, name: t.name, brief: sd.brief || t.brief, mode: 'show', app: '', url: sd.url || t.href || '', from: [tid], sync: true, mref: SC.snapMref([tid]), parts, solo: false };
  const it = {}; SC.ITEM_KEYS.forEach((k) => { if (sd[k] != null) it[k] = sd[k]; });
  paths[`items/${sd.id}`] = it;
  try {
    await commit(paths, `🏘️ 已建立「${t.name}」套組卡`);
    go('edit/' + sd.id);
  } catch (e) { toast('建立失敗：' + errText(e), true); }
}

/* =========================================================
   畫面路由
   ========================================================= */
function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
function route() {
  if (!S.pub) return;
  const h = location.hash.replace(/^#/, '') || 'cards';
  if (S.ed && S.ed.dirty && !h.startsWith('edit/' + S.ed.id) && !confirm('這張卡片有還沒儲存的修改，確定要離開嗎？')) { history.replaceState(null, '', '#edit/' + S.ed.id); return; }
  if (!h.startsWith('edit/')) S.ed = null;
  const [view, arg] = h.split('/');
  const n = inbox().length, MO = SC.MOTHER;
  const fresh = MO ? MO.order.filter((t) => !Object.values(S.pub.list).some((l) => l.from.includes(t)) && !S.pub.skip[t] && !isSoon(t)).length : 0;
  const nav = [['cards', `🖼️ 展覽館卡片${n ? `<span class="n">${n}</span>` : ''}`], ['tools', `🧰 首頁工具${fresh ? `<span class="n">${fresh}</span>` : ''}`], ['drawers', '🗂️ 分類'], ['help', '❓ 使用說明']];
  $('#app').innerHTML = `<div id="banner" class="banner"></div><div class="nav">${nav.map(([k, t]) => `<a href="#${k}" class="${(view === k || (view === 'edit' && k === 'cards')) ? 'on' : ''}">${t}</a>`).join('')}<span class="grow"></span>
    <span class="muted small" style="align-self:center">最後更新：${new Date(S.pub.rev).toLocaleString('zh-TW')}</span></div><div id="view"></div>`;
  paintBanner(); paintConn();
  if (view === 'edit' && (S.pub.list[arg] || (S.ed && S.ed.id === arg))) return renderEditor(arg);
  ({ tools: renderTools, drawers: renderDrawers, help: renderHelp }[view] || renderCards)();
}

/* =========================================================
   🖼️ 展覽館卡片：分類 → 卡片（套組卡下面縮排列出裡面的系統）
   ========================================================= */
function renderCards() {
  const L = S.pub.list, box = $('#view');
  const items = inbox();
  const top = Object.keys(L).filter((id) => !SC.suiteOf(id));
  const vis = (id) => SC.visible(id);
  const errOf = (id) => SC.check(id).filter((h) => h.lv === 'err').length;
  const pass = (id) => {
    const kids = L[id].parts, all = [id].concat(kids);
    const okF = S.filter === 'all' || (S.filter === 'on' ? all.some(vis) : S.filter === 'off' ? all.some((x) => !vis(x)) : all.some((x) => SC.check(x).some((h) => h.lv !== 'info')));
    const q = S.q.trim().toLowerCase();
    return okF && (!q || all.some((x) => (SC.face(x).name + L[x].brief + L[x].shelf + x).toLowerCase().includes(q)));
  };
  const cnt = { all: top.length, on: Object.keys(L).filter(vis).length, off: Object.keys(L).filter((x) => !vis(x)).length, bad: Object.keys(L).filter((x) => SC.check(x).some((h) => h.lv !== 'info')).length };
  let html = items.length ? `<div class="panel inbox"><h2>📬 需要你看一下（${items.length}）</h2>${items.map((it, i) => `<div class="ibx"><span class="ic">${it.ic}</span><div class="tx">${it.html}</div><div class="ops">${it.ops.map((o, j) => `<button class="${o[2] || 'btn ghost'} xs" data-ib="${i}:${j}" data-needconn>${o[0]}</button>`).join('')}</div></div>`).join('')}</div>` : '';
  html += `<div class="panel"><div class="toolbar"><div class="chips2">${[['all', `全部（${cnt.all}）`], ['on', `👁️ 看得見（${cnt.on}）`], ['off', `🙈 看不見（${cnt.off}）`], ['bad', `⚠️ 待補（${cnt.bad}）`]].map(([k, t]) => `<button data-f="${k}" class="${S.filter === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <input type="search" id="q" placeholder="🔍 搜尋卡片" value="${esc(S.q)}" style="max-width:200px"><span class="grow"></span>
    <button class="btn small ghost" id="addTool">➕ 從首頁加入</button><button class="btn small ghost" id="addSuite">＋ 套組卡</button></div>
    <p class="hint">👁️ 開關＝展覽館上看不看得見。下拉選單＝其他老師可以怎麼用（改了馬上存）。套組卡（🏘️）下面縮排的是裡面的系統，每一個都可以分開設定。</p>`;
  const groups = SC.drawers().concat([Object.assign({}, SC.NO_DRAWER, { id: '__none', name: '未分類' })]);
  let any = false;
  groups.forEach((d) => {
    const ids = top.filter((id) => { const dr = SC.face(id).drawer; return (d.id === '__none' ? !S.pub.drawers[dr] : dr === d.id) && pass(id); }).sort((a, b) => SC.face(a).order - SC.face(b).order);   // 跟首頁同步的卡片：分類、順序用首頁的
    if (!ids.length) return; any = true;
    html += `<div class="dsec" style="--soft:${esc(d.soft)}"><h3><span class="tag" style="background:${esc(d.color)}">${esc(d.tag || '')}</span>${esc(d.name)}</h3>
      <div class="rh"><span>順序</span><span>卡片</span><span>展覽館</span><span>其他老師可以</span><span>健檢</span><span></span></div><div class="rows">` +
      ids.map((id) => rowHTML(id, false) + L[id].parts.map((c) => rowHTML(c, true)).join('')).join('') + '</div></div>';
  });
  if (!any) html += '<p class="empty-s">沒有符合的卡片</p>';
  box.innerHTML = html + '</div>';
  // 動作
  $$('[data-ib]', box).forEach((b) => { b.onclick = () => { const [i, j] = b.dataset.ib.split(':').map(Number); items[i].ops[j][1](); }; });
  $$('[data-f]', box).forEach((b) => { b.onclick = () => { S.filter = b.dataset.f; renderCards(); }; });
  const qi = $('#q'); qi.oninput = () => { S.q = qi.value; const p = qi.selectionStart; renderCards(); const n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
  $('#addTool').onclick = () => go('tools');
  $('#addSuite').onclick = () => newCard(true);
  $$('[data-edit]', box).forEach((b) => { b.onclick = () => go('edit/' + b.dataset.edit); });
  $$('[data-tog]', box).forEach((b) => { b.onclick = () => toggle(b.dataset.tog); });
  $$('[data-mode]', box).forEach((s) => { s.onchange = () => setMode(s.dataset.mode, s.value); });
  $$('[data-mv]', box).forEach((b) => { b.onclick = () => move(b.dataset.mv, +b.dataset.d); });
  $$('[data-del]', box).forEach((b) => { b.onclick = () => delCard(b.dataset.del); });
  $$('[data-hl]', box).forEach((el) => { el.onclick = () => go('edit/' + el.dataset.hl); });
  paintConn();
}
function rowHTML(id, child) {
  const L = S.pub.list, l = L[id], f = SC.face(id), d = SC.drawerOf(l), hs = SC.check(id), v = SC.visible(id);
  const e = hs.filter((h) => h.lv === 'err').length, w = hs.filter((h) => h.lv === 'warn').length;
  const hl = e ? `<span class="hl err" data-hl="${esc(id)}" title="${esc(hs.map((h) => h.msg).join('\n'))}">⛔ ${e} 個問題</span>` : w ? `<span class="hl warn" data-hl="${esc(id)}" title="${esc(hs.map((h) => h.msg).join('\n'))}">⚠️ 待補 ${w}</span>` : '<span class="hl ok">✅ 完整</span>';
  const tags = [];
  if (l.parts.length) tags.push(`<span class="st suite">🏘️ 套組・${l.parts.length} 個系統</span>`);
  if (f.synced) tags.push('<span class="st sync" title="名稱、圖示跟著事務所首頁">🔗 跟首頁同步</span>');
  if (child && l.solo) tags.push(`<span class="st solo" title="也單獨放在展覽館的「${esc(d.name)}」">📌 也單獨展出</span>`);
  if (child && l.on && !v) tags.push('<span class="st hid">套組看不見</span>');
  const mode = l.parts.length ? '<span class="muted small">看下面每個系統</span>'
    : `<select data-mode="${esc(id)}" aria-label="其他老師可以怎麼用" data-needconn><option value="show" ${l.mode === 'show' ? 'selected' : ''}>👀 只展示</option><option value="use" ${l.mode !== 'show' ? 'selected' : ''}>${useLabel(l, id)}</option></select>`;
  return `<div class="r ${l.on ? '' : 'off'} ${child ? 'child' : ''}" style="--soft:${esc(d.soft)}">
    ${!child && f.placed ? '<div class="mv" title="跟首頁同步：分類和順序跟著首頁"><span class="muted small" style="text-align:center">🔗</span></div>' : `<div class="mv"><button data-mv="${esc(id)}" data-d="-1" title="往前" data-needconn>▲</button><button data-mv="${esc(id)}" data-d="1" title="往後" data-needconn>▼</button></div>`}
    <div class="main" data-edit="${esc(id)}" role="button" tabindex="0"><span class="ico">${child ? '' : ''}${esc(f.icon)}</span><span class="nm"><b>${child ? '└ ' : ''}${esc(f.name)}</b><span class="br">${esc(SC.plain(l.brief))}</span>${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}</span></div>
    <div class="c-sw"><button class="sw ${l.on ? 'on' : ''}" data-tog="${esc(id)}" title="展覽館上看不看得見" data-needconn><i></i>${l.on ? '👁️ 看得見' : '🙈 看不見'}</button></div>
    <div class="c-mode">${mode}</div>
    <div class="c-health">${hl}</div>
    <div class="ops"><button data-edit="${esc(id)}">✏️ 編輯</button><button data-del="${esc(id)}" title="刪除" data-needconn>🗑</button></div></div>`;
}
async function toggle(id) {
  const l = S.pub.list[id];
  if (!l.on) {
    const errs = blocking(await health(id));
    if (errs.length) { toast('還不能讓人看見：' + errs.map((h) => h.msg).join('；'), true); return; }
  }
  try { await commit({ [`list/${id}/on`]: !l.on }, !l.on ? `👁️ 「${SC.face(id).name}」展覽館看得見了` : `🙈 「${SC.face(id).name}」展覽館看不見了（內容保留）`); route(); }
  catch (e) { toast('儲存失敗：' + errText(e), true); route(); }
}
async function setMode(id, val) {
  const l = S.pub.list[id], mode = val === 'show' ? 'show' : useMode(l, id), app = SC.appOf(l, id);
  if (l.on && mode === 'open') {
    const s = await safety(SC.face(id).url || l.url);
    if (s === 'bad' || s === 'missing' || s === 'none') { toast(s === 'bad' ? '這個工具頁面有回事務所首頁的按鈕，還不能開放使用' : '還沒有工具網址 → 已打開編輯頁', true); return s === 'bad' ? route() : go('edit/' + id); }
  }
  const paths = { [`list/${id}/mode`]: mode }; if (app) paths[`list/${id}/app`] = app;
  try { await commit(paths, mode === 'show' ? '已改成「👀 只展示」' : `已改成「${useLabel(l, id)}」`); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); route(); }
}
async function move(id, dir) {
  const L = S.pub.list, s = SC.suiteOf(id), paths = {};
  if (s) {   // 套組裡：改 parts 的順序
    const p = L[s].parts.slice(), i = p.indexOf(id), j = i + dir;
    if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j], p[i]]; paths[`list/${s}/parts`] = p;
  } else {
    if (!s && SC.face(id).placed) { toast('這張卡片跟首頁同步：順序跟著首頁（要改順序請改首頁）', true); return; }
    const sib = Object.keys(L).filter((k) => !SC.suiteOf(k) && !SC.face(k).placed && SC.face(k).drawer === SC.face(id).drawer).sort((a, b) => L[a].order - L[b].order);
    const i = sib.indexOf(id), j = i + dir;
    if (j < 0 || j >= sib.length) return;
    [sib[i], sib[j]] = [sib[j], sib[i]];
    sib.forEach((k, n) => { if (L[k].order !== n + 1) paths[`list/${k}/order`] = n + 1; });
  }
  try { await commit(paths, false); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); }
}
async function delCard(id) {
  const L = S.pub.list, l = L[id], it = S.pub.items[id] || {}, name = SC.face(id).name, s = SC.suiteOf(id);
  const shared = (SC.GUIDES || {})[id] || /^(seat|lab|grade|exam|excel|gps|src|town)$/.test(id);
  const msg = `確定要刪除「${name}」嗎？說明與上傳的截圖會一起刪掉。` +
    (l.parts.length ? `\n\n🏘️ 這是套組卡：裡面的 ${l.parts.length} 個系統不會被刪，會變成單獨的卡片。` : '') +
    (shared ? '\n\n⚠️ 這張卡片的分享網址可能已經發出去過，刪除後網址會失效。只是暫時不想給人看，用「🙈 看不見」就好。' : '') +
    '\n\n請輸入卡片名稱確認：';
  const ans = prompt(msg, ''); if (ans === null) return;
  if (ans.trim() !== name.trim()) return toast('名稱不符，沒有刪除', true);
  const paths = { [`list/${id}`]: null, [`items/${id}`]: null };
  if (s) paths[`list/${s}/parts`] = L[s].parts.filter((x) => x !== id);
  l.parts.forEach((c) => { paths[`list/${c}/solo`] = false; if (!S.pub.drawers[L[c].drawer]) paths[`list/${c}/drawer`] = l.drawer; });
  try {
    await commit(paths, `🗑 已刪除「${name}」`);
    for (const sh of SC.rows(it.shots)) { const src = String(sh[0] || ''); if (src.startsWith('f:')) await FB.remove('showcase/img/' + src.slice(2)).catch(() => {}); }
    route();
  } catch (e) { toast('刪除失敗：' + errText(e), true); }
}
function newCard(suite) {
  const id = (suite ? 'set' : 'sys') + rid(5), dr = SC.drawers()[0] || {};
  S.ed = { id, isNew: true, l: { on: false, drawer: dr.id || '', shelf: '', order: nextOrder(), icon: suite ? '🏘️' : '📁', name: suite ? '新的套組' : '新的系統', brief: '', mode: 'show', app: '', url: '', from: [], sync: false, mref: null, parts: [], solo: false, _suite: suite }, it: {}, dirty: true };
  history.replaceState(null, '', '#edit/' + id);
  route();
}
const nextOrder = () => Math.max(0, ...Object.values(S.pub.list).map((l) => +l.order || 0)) + 1;

/* =========================================================
   🧰 首頁工具：事務所首頁 TOOLS 一覽
   ========================================================= */
function renderTools() {
  const L = S.pub.list, MO = SC.MOTHER, box = $('#view');
  if (!MO) { box.innerHTML = `<div class="panel"><div class="warn">讀不到事務所首頁的工具清單。${esc(S.motherErr || '')}</div><button class="btn small" id="rt">🔄 重新讀取</button></div>`; $('#rt').onclick = () => loadAll(false); return; }
  const byTool = {}; Object.keys(L).forEach((id) => L[id].from.forEach((t) => { (byTool[t] = byTool[t] || []).push(id); }));
  const groups = {}; MO.order.forEach((tid) => { const t = MO.tools[tid]; (groups[t.drawer] = groups[t.drawer] || []).push(t); });
  let html = `<div class="panel"><h2>🧰 事務所首頁的工具</h2><p class="hint" style="margin-bottom:8px">首頁新增工具，這裡會自動出現 🆕。「➕ 加入展覽館」會建立一張<b>🙈 看不見</b>的卡片（有 Claude 寫的說明初版就帶入），確認後再打開。不想放的按「🙅 不放展覽館」，就不會再提醒。</p>`;
  Object.keys(groups).sort((a, b) => a - b).forEach((di) => {
    html += `<div class="dsec"><h3>${esc(MO.drawers[di] || '其他')}</h3></div><table class="mt"><thead><tr><th>首頁工具</th><th>展覽館</th><th>免申請檢查</th><th></th></tr></thead><tbody>` +
      groups[di].map((t) => {
        if (t.soon) return `<tr class="skip"><td>${esc(t.icon)} <b>${esc(t.name)}</b><div class="muted small">${esc(t.brief)}</div></td><td><span class="st no">🚧 籌備中</span></td><td></td><td></td></tr>`;
        const ins = byTool[t.id] || [], skip = S.pub.skip[t.id];
        const st = ins.length ? ins.map((id) => `<span class="st ${SC.visible(id) ? 'on' : 'hid'}">${SC.visible(id) ? '看得見' : '看不見'}・${esc(SC.face(id).name)}</span>`).join(' ') : skip ? '<span class="st no">🙅 不放展覽館</span>' : '<span class="st no">還沒決定</span>';
        const ops = ins.length ? `<button class="btn xs ghost" data-edit="${esc(ins[0])}">✏️ 編輯</button>`
          : skip ? `<button class="btn xs ghost" data-unskip="${esc(t.id)}" data-needconn>↩ 取消不放</button>`
          : `<button class="btn xs" data-add="${esc(t.id)}">➕ 加入展覽館</button> <button class="btn xs ghost" data-skip="${esc(t.id)}" data-needconn>🙅 不放</button>`;
        return `<tr class="${ins.length ? '' : skip ? 'skip' : 'new'}"><td>${esc(t.icon)} <b>${esc(t.name)}</b>${ins.length || skip ? '' : ' 🆕'}<div class="muted small">${esc(t.brief)}</div></td><td>${st}</td><td data-safe="${esc(t.href)}"><span class="muted small">檢查中…</span></td><td style="text-align:right;white-space:nowrap">${ops}</td></tr>`;
      }).join('') + '</tbody></table>';
  });
  box.innerHTML = html + '</div>';
  $$('[data-safe]', box).forEach((td) => safety(td.dataset.safe).then((s) => { td.innerHTML = SAFE_TXT[s] || ''; }));
  $$('[data-edit]', box).forEach((b) => { b.onclick = () => go('edit/' + b.dataset.edit); });
  $$('[data-add]', box).forEach((b) => { b.onclick = () => addFromTool(b.dataset.add); });
  $$('[data-skip]', box).forEach((b) => { b.onclick = async () => { try { await commit({ [`skip/${b.dataset.skip}`]: true }, '🙅 已設為不放展覽館'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }; });
  $$('[data-unskip]', box).forEach((b) => { b.onclick = async () => { try { await commit({ [`skip/${b.dataset.unskip}`]: null }, '↩ 已取消'); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } }; });
  paintConn();
}
// 從會員中心的系統代號建立卡片（有 Claude 寫的初版就用）
function addFromApp(code) {
  const a = W.APPS[code], D = SC.DRAFTS || {};
  const k = Object.keys(D).find((x) => D[x].app === code && !(D[x].parts || []).length);
  const g = k ? D[k] : null;
  let id = k && !S.pub.list[k] ? k : code; while (S.pub.list[id]) id += rid(1);
  const dr = SC.drawers()[0] || {};
  const l = { on: false, drawer: g && S.pub.drawers['d' + (+g.drawer + 1)] ? 'd' + (+g.drawer + 1) : dr.id || '', shelf: (g && g.shelf) || '', order: nextOrder(),
    icon: g ? g.icon : (a.name.split(' ')[0] || '📁'), name: g ? g.name : a.name.replace(/^\S+\s/, ''), brief: g ? g.brief : a.desc || '', mode: 'apply', app: code, url: '', from: (g && g.from) || [], sync: false, mref: null, parts: [], solo: false };
  const it = g ? Object.fromEntries(SC.ITEM_KEYS.filter((x) => g[x] != null).map((x) => [x, copy(g[x])])) : { intro: a.desc || '' };
  S.ed = { id, isNew: true, l, it, dirty: true };
  history.replaceState(null, '', '#edit/' + id);
  route();
}
function addFromTool(tid) {
  const t = SC.MOTHER.tools[tid]; if (!t) return;
  const sd = suiteDraftFor(tid);
  if (sd && !S.pub.list[sd.id]) return createSuite(sd, tid);
  let id = tid.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'sys' + rid(5); while (S.pub.list[id]) id += rid(1);
  const dr = SC.drawers(), byName = dr.find((d) => d.name === SC.MOTHER.drawers[t.drawer]);
  const g = draftFor(tid);
  const l = { on: false, drawer: (byName || dr[0] || {}).id || '', shelf: (g && g.shelf) || t.shelf || '', order: nextOrder(), icon: t.icon, name: t.name, brief: (g && g.brief) || t.brief,
    mode: g ? (g.mode || 'show') : 'show', app: (g && g.app) || '', url: (g && g.url) || t.href || '', from: [tid], sync: true, mref: SC.snapMref([tid]), parts: [], solo: false };
  if (g && g.drawer != null && S.pub.drawers['d' + (+g.drawer + 1)]) l.drawer = 'd' + (+g.drawer + 1);
  if (SC.appOf(l, id)) l.app = SC.appOf(l, id);   // 會員中心有這個系統 → 自動對應
  const it = g ? Object.fromEntries(SC.ITEM_KEYS.filter((k) => g[k] != null).map((k) => [k, copy(g[k])]))
    // 沒有 Claude 寫的初版：用首頁卡片的內容先填（功能清單「標題：說明」拆成兩欄）
    : { sub: t.sub || '', intro: [t.brief, t.note].filter(Boolean).join('。').replace(/。。/g, '。'), feats: (t.features || []).map((f) => { const m = /^(\S+?)[：:](.+)$/.exec(f); return m ? ['✨', m[1], m[2]] : ['✨', f, '']; }) };
  S.ed = { id, isNew: true, l, it, dirty: true };
  history.replaceState(null, '', '#edit/' + id);
  route();
}

/* =========================================================
   🗂️ 分類
   ========================================================= */
function renderDrawers() {
  const DR = SC.drawers(), L = S.pub.list, used = (id) => Object.keys(L).filter((k) => L[k].drawer === id && !SC.suiteOf(k)).length, box = $('#view');
  box.innerHTML = `<div class="panel"><h2>🗂️ 分類（展覽館的抽屜）</h2><p class="hint">可以改名稱、英文標籤、說明、顏色、順序。裡面還有卡片的分類不能刪（先把卡片移到別的分類）。小分類在每張卡片的編輯頁設定。</p>
    <div class="drow muted small" style="font-weight:800"><span>顏色</span><span>名稱</span><span>英文標籤</span><span>說明</span><span>卡片</span><span></span></div>
    ${DR.map((d, i) => `<div class="drow" data-d="${esc(d.id)}"><input type="color" value="${esc(d.color || '#6d6a75')}" data-k="color"><input type="text" value="${esc(d.name)}" data-k="name" maxlength="20"><input type="text" value="${esc(d.tag || '')}" data-k="tag" maxlength="20"><input type="text" value="${esc(d.desc || '')}" data-k="desc" maxlength="40">
      <span class="muted small">${used(d.id)} 張</span><span class="row" style="flex-wrap:nowrap"><button class="btn xs ghost" data-dmv="${i}" data-dir="-1">▲</button><button class="btn xs ghost" data-dmv="${i}" data-dir="1">▼</button><button class="btn xs ghost" data-ddel="${esc(d.id)}" ${used(d.id) ? 'disabled title="還有卡片"' : ''}>🗑</button></span></div>`).join('')}
    <div class="row" style="margin-top:12px"><button class="btn small ghost" id="dAdd" data-needconn>＋ 新增分類</button><span class="grow"></span><button class="btn" id="dSave" data-needconn>💾 儲存分類</button></div></div>`;
  const soft = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (c) => Math.round(c + (255 - c) * 0.86); return '#' + [m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, '0')).join(''); };
  const collect = () => { const out = {}; $$('.drow[data-d]', box).forEach((r, i) => { const v = (k) => $(`[data-k="${k}"]`, r).value.trim(); out[r.dataset.d] = { name: v('name') || '未命名分類', tag: v('tag'), desc: v('desc'), color: v('color'), soft: soft(v('color')), order: i }; }); return out; };
  const save = async (d, msg) => { try { await commit({ drawers: d }, msg); route(); } catch (e) { toast('儲存失敗：' + errText(e), true); } };
  $('#dSave').onclick = () => save(collect(), '💾 分類已儲存');
  $('#dAdd').onclick = () => { const d = collect(), id = 'd' + rid(5); d[id] = { name: '新的分類', tag: 'Drawer ' + (Object.keys(d).length + 1), desc: '', color: '#2f6db5', soft: soft('#2f6db5'), order: Object.keys(d).length }; save(d, '➕ 已新增分類'); };
  $$('[data-dmv]', box).forEach((b) => { b.onclick = () => { const d = collect(), ks = Object.keys(d), i = +b.dataset.dmv, j = i + +b.dataset.dir; if (j < 0 || j >= ks.length) return; [ks[i], ks[j]] = [ks[j], ks[i]]; ks.forEach((k, n) => { d[k].order = n; }); save(d, false); }; });
  $$('[data-ddel]', box).forEach((b) => { b.onclick = () => { if (b.disabled || !confirm('確定刪除這個分類？')) return; const d = collect(); delete d[b.dataset.ddel]; save(d, '🗑 已刪除分類'); }; });
  paintConn();
}

/* =========================================================
   ❓ 使用說明
   ========================================================= */
function renderHelp() {
  const card = (ic, title, body) => `<div class="hcard"><h3><span>${ic}</span>${title}</h3>${body}</div>`;
  const li = (a) => `<ul class="hl-list">${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  $('#view').innerHTML = `<div class="panel"><h2>🔧 怎麼管理展覽館</h2>
    <div class="howto3"><div class="step"><span class="n">1</span><div><b>🧰 從首頁加入</b><span>「首頁工具」按 ➕，自動帶入說明初版</span></div></div>
      <div class="step"><span class="n">2</span><div><b>✏️ 檢查內容</b><span>右邊「健檢」：⛔ 一定要修，⚠️ 建議補</span></div></div>
      <div class="step"><span class="n">3</span><div><b>👁️ 打開看得見</b><span>展覽館馬上更新，分享頁約 30 分鐘</span></div></div></div></div>
    <div class="hgrid">
      ${card('🎛️', '每張卡片的兩個設定', `<table class="htab"><tr><th>👁️ 看得見<br>🙈 看不見</th><td>展覽館上有沒有這張卡片。看不見的內容會保留，隨時可以再打開。</td></tr>
        <tr><th>其他老師<br>可以…</th><td><span class="st hid">👀 只展示</span> 只能看說明<br><span class="st ok">✅ 開放使用</span> 系統自動判斷怎麼用：<br>　有帳號的系統 → 🔐 到會員中心申請、你核准<br>　沒有帳號的工具 → 🚀 免申請，直接開啟</td></tr></table>`)}
      ${card('🏘️', '套組卡（例：WYTClass 課堂小鎮）', li(['整個套組一個「看得見」開關', '裡面每個系統按「✏️ 設定」就地展開，分開決定看不看得見、能不能申請', '其他老師可以<b>一個一個申請</b>，也可以按「📝 一次申請」', '「📌 也單獨放一張卡片」通常不用勾（例外：線上檢定所也放在遊戲研究室）']))}
      ${card('🔗', '跟事務所首頁連動', li(['卡片記得首頁「上次的樣子」，首頁改了哪一欄都會比對出來', '打開「跟首頁同步」：名稱、圖示自動跟著首頁', '一句話、說明不會自動改，改了會提醒你看一下']))}
      ${card('📬', '需要你看一下', li(['首頁改過的工具、首頁的新工具', '會員中心有、展覽館卻沒有的系統', '看得見但有 ⛔ 問題的卡片', '每一項都有按鈕，按了就處理好']))}
      ${card('🛡️', '安全與連線', li(['右上燈號 🟢 才能存檔；🔴 離線時會擋住', '每次存檔都會「寫進去再讀回來確認」', '免申請的工具頁面不能有「回事務所首頁」按鈕（自動檢查）']))}
      ${card('📸', '截圖與新系統', li(['上傳時自動壓縮；學生姓名請用假名', '第一張截圖也是社群分享預覽圖', '想讓免登入的工具改成「要申請帳號」：請 Claude 幫它接上會員中心，展覽館會自動變成 🔐']))}
    </div>`;
}

/* =========================================================
   ✏️ 編輯頁（一整頁、分段往下捲；右邊是健檢與存檔）
   ========================================================= */
const LINES = (v, n) => SC.rows(v).map((x) => { const c = (Array.isArray(x) ? x : [x]).map((y) => String(y == null ? '' : y)).slice(0, n); while (c.length > 1 && !c[c.length - 1]) c.pop(); return c.join('｜'); }).join('\n');   // 後面空的欄位不顯示「｜」
const PARSE = (t, n, fix) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const a = s.split(/[｜|]/).map((x) => x.trim()); while (a.length < n) a.push(''); return fix ? fix(a.slice(0, n)) : a.slice(0, n); });
const ONE = (v) => SC.arr(v).join('\n'), PONE = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
const BOLD = '\n可以用 <b>粗體</b>、<i>斜體</i>、<sub>下標</sub>。';
function renderEditor(id) {
  const L = S.pub.list;
  if (!S.ed || S.ed.id !== id) {
    if (!L[id]) return go('cards');
    S.ed = { id, isNew: false, l: copy(L[id]), it: copy(S.pub.items[id] || {}), dirty: false };
  }
  const E = S.ed, l = E.l, it = E.it;
  it.shots = SC.rows(it.shots);
  const isSuite = (l.parts || []).length > 0 || l._suite, suiteId = !isSuite && !E.isNew ? SC.suiteOf(E.id) : '';
  const MO = SC.MOTHER, mt = l.from.length === 1 && MO ? MO.tools[l.from[0]] : null;
  const shown = { icon: l.sync && mt ? mt.icon : l.icon, name: l.sync && mt ? mt.name : l.name };
  const DR = SC.drawers();
  const shelves = Array.from(new Set(Object.values(L).filter((x) => x.drawer === l.drawer && x.shelf).map((x) => x.shelf)));
  const field = (k, label, help, rows) => `<label class="f">${label}${help ? tip(help) : ''}</label><textarea data-it="${k}" rows="${rows || 4}">${esc(it[k] == null ? '' : it[k])}</textarea>`;
  const lineField = (k, n, label, help, rows) => `<label class="f">${label}${tip(help)}</label><textarea data-lines="${k}" data-n="${n}" rows="${rows || 5}">${esc(LINES(it[k], n))}</textarea>`;
  const oneField = (k, label, help) => `<label class="f">${label}${tip(help)}</label><textarea data-one="${k}" rows="4">${esc(ONE(it[k]))}</textarea>`;
  const secs = [...(isSuite ? [['s-suite', '🏘️ 套組裡的系統']] : []), ['s-card', '🪪 卡片'], ['s-show', '👁️ 展出'], ...(suiteId ? [['s-suite', '🏘️ 套組']] : []), ['s-intro', '📄 簡介'], ['s-flow', '🗺️ 流程與功能'], ['s-sides', '👥 學生／老師'], ['s-faq', '❓ 常見問題'], ['s-shots', '📸 截圖']];
  const motherOpts = MO ? MO.order.map((tid) => { const t = MO.tools[tid]; return `<option value="${esc(tid)}" ${l.from[0] === tid ? 'selected' : ''}>${esc(t.icon + ' ' + t.name)}</option>`; }).join('') : '';
  const extraFrom = l.from.length > 1 ? `<div class="hint">這張卡片對應首頁的 ${l.from.length} 個工具（${esc(l.from.map((t) => (MO && MO.tools[t] ? MO.tools[t].name : t)).join('、'))}），所以不跟首頁同步名稱。</div>` : '';

  const cardSec = `<section class="panel sec" id="s-card"><h3>🪪 卡片</h3>
    ${l.from.length <= 1 ? `<label class="f">對應事務所首頁的工具${tip('對應後，首頁改了這個工具，這裡會提醒你；也可以讓名稱、圖示自動跟著首頁。')}</label>
      <select data-l="from0"><option value="">（不對應）</option>${motherOpts}</select>` : extraFrom}
    ${mt ? `<div style="margin-top:8px"><button type="button" class="sw ${l.sync ? 'on' : ''}" id="eSync"><i></i>🔗 名稱、圖示、分類跟首頁同步</button><div class="hint">${l.sync ? `打開中：名稱、圖示、放在哪個分類都跟首頁的「${esc(mt.icon + ' ' + mt.name)}」，首頁改了展覽館馬上跟著改。` : '關閉中：名稱、圖示用下面自己填的。'}</div></div>` : ''}
    <div class="grid3"><div><label class="f">圖示</label><input type="text" data-l="icon" value="${esc(shown.icon)}" maxlength="4" ${l.sync && mt ? 'disabled' : ''}></div>
      <div><label class="f">名稱</label><input type="text" data-l="name" value="${esc(shown.name)}" maxlength="30" ${l.sync && mt ? 'disabled' : ''}></div></div>
    <label class="f">一句話介紹${tip('顯示在展覽館的卡片上，約 20～30 字。這一句不跟首頁同步（可以寫給外校老師看的版本）。')}</label><input type="text" data-l="brief" value="${esc(l.brief)}" maxlength="60">
    ${mt && mt.brief !== l.brief ? `<div class="hint">首頁的一句話：「${esc(mt.brief)}」 <button type="button" class="btn xs ghost" id="useMB">套用首頁的</button></div>` : ''}
    ${suiteId && !l.solo ? `<div class="hint">📍 這個系統放在套組「${esc(SC.face(suiteId).name)}」裡，分類跟著套組。</div>` : l.sync && mt && SC.face(E.id) && SC.face(E.id).placed ? `<div class="hint">🔗 跟首頁同步中：分類、小分類、順序都跟首頁（現在在「${esc(SC.drawerOf({ drawer: SC.face(E.id).drawer }).name)}・${esc(SC.face(E.id).shelf)}」）。要搬家請改首頁。</div>` : `<div class="grid2"><div><label class="f">分類（抽屜）</label><select data-l="drawer">${DR.map((d) => `<option value="${esc(d.id)}" ${l.drawer === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div><label class="f">小分類${tip('同一個抽屜裡的分組標題，例如「課堂遊戲化」。可以留空。')}</label><input type="text" data-l="shelf" value="${esc(l.shelf || '')}" list="shelfL" maxlength="20"><datalist id="shelfL">${shelves.map((s) => `<option>${esc(s)}</option>`).join('')}</datalist></div></div>`}
    <p class="hint" style="margin-top:10px">網址代號：<b>${esc(E.id)}</b>（說明頁 guide.html?app=${esc(E.id)}、分享頁 share/${esc(E.id)}.html，建立後不能改）</p></section>`;

  const showSec = `<section class="panel sec" id="s-show"><h3>👁️ 展出</h3>
    <label class="f">展覽館上看得見嗎？</label>
    <div class="choice"><label class="${l.on ? '' : 'on'}"><input type="radio" name="see" value="0" ${l.on ? '' : 'checked'}><b>🙈 看不見</b>先藏起來，只有你在這裡看得到。</label><label class="${l.on ? 'on' : ''}"><input type="radio" name="see" value="1" ${l.on ? 'checked' : ''}><b>👁️ 看得見</b>放在展覽館上給其他老師看。</label></div>
    ${isSuite ? `<div class="info">🏘️ 套組卡本身不用選「其他老師可以…」，到下面「🏘️ 套組」一個一個設定裡面的系統。</div>
      <label class="f">「已開通，前往」的網址（選填）${tip('例如課堂小鎮的大廳網址。說明頁會放一顆「🔑 已開通，前往…」的按鈕。')}</label><input type="text" data-l="url" value="${esc(l.url || '')}" placeholder="https://…">`
    : `<label class="f">其他老師可以怎麼用？</label>
    <div class="choice"><label class="${l.mode === 'show' ? 'on' : ''}"><input type="radio" name="mode" value="show" ${l.mode === 'show' ? 'checked' : ''}><b>👀 只展示</b>${MODE_TXT.show[1]}</label>
      <label class="${l.mode !== 'show' ? 'on' : ''}"><input type="radio" name="mode" value="use" ${l.mode !== 'show' ? 'checked' : ''}><b>✅ 開放使用</b>${SC.appOf(l, E.id) ? '其他老師到會員中心申請，你核准後就能用。' : '不用申請，其他老師按一下就能直接用。'}</label></div>
    <div id="modeExtra"></div>`}</section>`;

  let suiteSec = '';
  if (isSuite) {
    const cands = Object.keys(L).filter((k) => k !== E.id && !L[k].parts.length && !(l.parts || []).includes(k) && (!SC.suiteOf(k) || SC.suiteOf(k) === E.id));
    // 每個系統一行；按「✏️ 設定」就在那一行下面展開，直接改這個系統（存檔只存這一個系統，不影響上面套組的其他修改）
    const M = E.m && l.parts.includes(E.m.id) ? E.m : null;
    const chip = (cl, c) => `<span class="st ${cl.on ? 'on' : 'hid'}">${cl.on ? '👁️ 看得見' : '🙈 看不見'}</span> <span class="st ${cl.mode === 'show' ? 'hid' : 'ok'}">${esc(MODE_TXT[cl.mode][0])}</span>${cl.solo ? ` <span class="st solo">📌 也單獨展出</span>` : ''}${SC.check(c).some((h) => h.lv === 'err') ? ' <span class="st bad">⛔ 有問題</span>' : ''}`;
    suiteSec = `<section class="panel sec" id="s-suite"><h3>🏘️ 套組裡的系統</h3>
      <p class="hint">其他老師在說明頁看到的就是這幾個系統。每個系統可以分開決定「看不看得見」「其他老師可以怎麼用」——按右邊的「✏️ 設定」。</p>
      <div class="mlist">${(l.parts || []).map((c, i) => { const cl = L[c]; if (!cl) return ''; const cf = SC.face(c), open = M && M.id === c; return `<div class="mitem ${open ? 'open' : ''}">
        <div class="mrow"><span class="mv"><button type="button" data-pm="${i}" data-d="-1" title="往前">▲</button><button type="button" data-pm="${i}" data-d="1" title="往後">▼</button></span>
          <div class="mnm"><b>${esc(cf.icon + ' ' + cf.name)}</b><div class="mchips">${chip(cl, c)}</div></div>
          <span class="row mops"><button type="button" class="btn xs ${open ? 'ghost' : ''}" data-mopen="${esc(c)}">${open ? '收起 ▴' : '✏️ 設定 ▾'}</button><button type="button" class="btn xs ghost" data-prm="${esc(c)}">移出</button></span></div>
        ${open ? memberPanel(M, cl) : ''}</div>`; }).join('') || '<p class="muted small">還沒有系統。</p>'}</div>
      <div class="row" style="margin-top:10px"><select id="pAdd" style="max-width:280px"><option value="">＋ 加入一張現有的卡片…</option>${cands.map((k) => `<option value="${esc(k)}">${esc(SC.face(k).icon + ' ' + SC.face(k).name)}</option>`).join('')}</select></div>
      <p class="hint">新系統：先到「🧰 首頁工具」把它加入展覽館，再回來這裡加入套組。「移出」不會刪掉卡片，會變成單獨的卡片（按上面「💾 儲存」才生效）。</p></section>`;
  } else if (suiteId) {
    suiteSec = `<section class="panel sec" id="s-suite"><h3>🏘️ 套組</h3>
      <p>這個系統在套組「<b>${esc(SC.face(suiteId).icon + ' ' + SC.face(suiteId).name)}</b>」裡。${L[suiteId].on ? '' : '<span class="st hid">套組目前看不見</span>'}</p>
      <div class="row" style="margin-top:6px"><button type="button" class="sw ${l.solo ? 'on' : ''}" id="eSolo"><i></i>📌 也單獨放在展覽館的分類裡</button></div>
      <p class="hint">打開：除了在套組裡，展覽館的「${esc(SC.drawerOf(l).name)}」也會有一張自己的卡片（例：線上檢定所）。</p>
      <a class="btn xs ghost" href="#edit/${esc(suiteId)}">✏️ 編輯整個套組</a></section>`;
  }

  function memberPanel(M, cl) {
    const m = M.l, d = SC.drawerOf(cl);
    return `<div class="mpanel">
      <label class="f">展覽館上看得見嗎？</label>
      <div class="choice"><label class="${m.on ? '' : 'on'}"><input type="radio" name="m-see" value="0" ${m.on ? '' : 'checked'}><b>🙈 看不見</b>說明頁不會列出這個系統。</label><label class="${m.on ? 'on' : ''}"><input type="radio" name="m-see" value="1" ${m.on ? 'checked' : ''}><b>👁️ 看得見</b>列在套組的說明頁裡。</label></div>
      <label class="f">其他老師可以怎麼用？</label>
      <div class="choice"><label class="${m.mode === 'show' ? 'on' : ''}"><input type="radio" name="m-mode" value="show" ${m.mode === 'show' ? 'checked' : ''}><b>👀 只展示</b>只看得到說明，不能使用。</label>
        <label class="${m.mode !== 'show' ? 'on' : ''}"><input type="radio" name="m-mode" value="use" ${m.mode !== 'show' ? 'checked' : ''}><b>✅ 開放使用</b>${SC.appOf(m, M.id) ? `到會員中心申請「${esc((W.APPS[SC.appOf(m, M.id)] || {}).name || '')}」，你核准後就能用（自動對應）。` : '不用申請，按一下就能直接用。'}</label></div>
      ${m.mode === 'open' ? `<div class="sub-choice"><label class="f">工具網址</label><input type="text" data-ml="url" value="${esc(m.url || '')}"></div>` : ''}
      <label class="f">一句話介紹</label><input type="text" data-ml="brief" value="${esc(m.brief || '')}" maxlength="60">
      <label class="chk"><input type="checkbox" id="mSolo" ${m.solo ? 'checked' : ''}><span><b>📌 也單獨放一張卡片</b>（通常不用勾）<br><span class="hint">勾了：除了在套組裡，展覽館的「${esc(d.name)}」也會另外出現一張「${esc(SC.face(M.id).name)}」的卡片。例：線上檢定所同時放在遊戲研究室。</span></span></label>
      <div id="mErr"></div>
      <div class="row" style="margin-top:12px"><button type="button" class="btn small" id="mSave" data-needconn>💾 存這個系統</button><button type="button" class="btn small ghost" id="mClose">收起</button><span class="grow"></span><a class="btn small ghost" href="#edit/${esc(M.id)}">📄 完整說明與截圖 →</a></div></div>`;
  }
  const shotsSec = `<section class="panel sec" id="s-shots"><h3>📸 截圖</h3>
    <div class="info small">可以一次選好幾張，會自動壓縮；寬度小於 600 的（手機截圖）會放在「📱 學生端」那一區。<b>畫面裡的學生姓名請用假名。</b>第一張也是社群分享預覽圖的底圖。</div>
    <div class="row"><label class="btn small"><input type="file" id="upl" accept="image/*" multiple hidden>⬆️ 上傳截圖</label><span id="uplMsg" class="muted small"></span></div>
    <div id="shotList">${it.shots.length ? it.shots.map((s, i) => `<div class="shotrow"><img data-src="${esc(s[0])}" alt=""><div><input type="text" data-cap="${i}" value="${esc(s[1] || '')}" placeholder="圖說"><div class="muted small">${s[2] && s[2] < 600 ? '📱 手機畫面' : '💻 電腦畫面'}・${s[2] || '?'}×${s[3] || '?'}${String(s[0]).startsWith('f:') ? '・你上傳的' : '・Claude 拍的'}</div></div>
      <div class="ops"><button type="button" data-smv="${i}" data-d="-1">▲</button> <button type="button" data-smv="${i}" data-d="1">▼</button> <button type="button" data-sdel="${i}">🗑</button></div></div>`).join('') : '<p class="muted" style="padding:12px 0">還沒有截圖。</p>'}</div></section>`;

  $('#view').innerHTML = `<div class="ed-head">${suiteId ? `<a class="btn small ghost" href="#edit/${esc(suiteId)}">← 回套組「${esc(SC.face(suiteId).name)}」</a>` : ''}<a class="btn small ghost" href="#cards">← 回卡片清單</a><h2>${esc(shown.icon)} ${esc(shown.name)}</h2>${E.isNew ? '<span class="st solo">新卡片・還沒存</span>' : ''}${isSuite ? '<span class="st suite">🏘️ 套組卡</span>' : ''}</div>
    <div class="jump">${secs.map(([k, t]) => `<a href="javascript:void 0" data-jump="${k}">${t}</a>`).join('')}</div>
    <div class="ed"><div class="ed-main">
      ${isSuite ? suiteSec + cardSec + showSec : cardSec + showSec + suiteSec}
      <section class="panel sec" id="s-intro"><h3>📄 簡介</h3>
        <label class="f">副標題${tip('說明頁大標題下面的一行')}</label><input type="text" data-it="sub" value="${esc(it.sub || '')}" maxlength="80">
        ${field('intro', '簡介', '說明頁最上面的一段介紹，3～5 句最好。' + BOLD, 5)}
        ${lineField('facts', 2, '快速資訊（小方塊）', '一行一個：標題｜內容\n例：適合｜高一化學\n例：學生要準備｜手機', 4)}
        ${field('notice', '使用前請先看（選填）', '有特別要提醒的事才填，黃色方塊顯示在最前面。' + BOLD, 3)}
        ${lineField('links', 2, '額外按鈕（選填）', '一行一個：按鈕文字｜網址（https:// 開頭）\n分享頁不會顯示這些按鈕。', 2)}</section>
      <section class="panel sec" id="s-flow"><h3>🗺️ 流程與功能</h3>
        ${lineField('flow', 4, isSuite ? '系統之間怎麼連' : '上課流程', '一行一個步驟：圖示｜步驟｜小字說明｜老師或學生（可以留空）\n例：📱｜學生加入｜輸入代碼｜學生', 5)}
        ${lineField('feats', 3, '主要功能', '一行一個：圖示｜功能名稱｜一句話說明\n例：📊｜能力分析｜依難度統計答對率', 6)}
        ${lineField('tools', 3, '包含哪些小系統（選填）', '一張卡片裡有好幾個小工具時才填：圖示｜名稱｜說明\n（要「分開申請」的系統請用套組卡）', 3)}</section>
      <section class="panel sec" id="s-sides"><h3>👥 學生端／老師端／準備</h3>${oneField('student', '👩‍🎓 學生端', '一行一點')}${oneField('teacher', '👨‍🏫 老師端', '一行一點')}${oneField('prep', '🧰 開始前要準備', '一行一點')}</section>
      <section class="panel sec" id="s-faq"><h3>❓ 常見問題</h3>${lineField('faq', 2, '一行一題', '問題｜回答\n例：要付費嗎？｜不用。', 7)}</section>
      ${shotsSec}
    </div>
    <aside class="side">
      <div class="panel"><h3 style="margin-bottom:4px">🩺 健檢</h3><ul class="health" id="health"><li class="muted">檢查中…</li></ul></div>
      <div class="panel save-panel"><div class="savebar">
        <button class="btn" id="eSave" data-needconn>💾 儲存</button><button class="btn ghost" id="eSaveX" data-needconn>💾 儲存並回清單</button><a class="btn ghost" id="eX" href="#cards">↩ 取消返回</a>
        ${E.isNew ? '' : `<a class="btn ghost" href="guide.html?app=${encodeURIComponent(E.id)}&preview=1" target="_blank" rel="noopener">👀 預覽說明頁 ↗</a>`}
        <span class="muted small" id="eDirty">${E.dirty ? '● 有還沒儲存的修改' : ''}</span></div></div>
    </aside></div>`;

  const V = $('#view');
  const dirty = () => { E.dirty = true; const d = $('#eDirty'); if (d) d.textContent = '● 有還沒儲存的修改'; };
  const repaint = () => { collect(); const y = window.scrollY; renderEditor(E.id); window.scrollTo(0, y); };
  $$('input, textarea, select', V).filter((x) => !x.closest('.mpanel')).forEach((x) => { x.addEventListener('input', () => { dirty(); refreshHealth(); }); if (x.tagName === 'SELECT') x.addEventListener('change', () => refreshHealth()); });
  $$('[data-jump]', V).forEach((a) => { a.onclick = () => { const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth' }); }; });
  $$('[name=see]', V).forEach((r) => { r.onchange = () => { l.on = r.value === '1'; dirty(); repaint(); }; });
  $$('[name=mode]', V).forEach((r) => { r.onchange = () => { collect(); l.mode = r.value === 'show' ? 'show' : useMode(l, E.id); if (SC.appOf(l, E.id)) l.app = SC.appOf(l, E.id); dirty(); repaint(); }; });
  const fs = $('[data-l="from0"]', V); if (fs) fs.onchange = () => { collect(); l.from = fs.value ? [fs.value] : []; const t = fs.value && MO.tools[fs.value]; l.sync = !!t; l.mref = SC.snapMref(l.from); if (t && !l.url && l.mode === 'open') l.url = t.href; dirty(); repaint(); };
  const sy = $('#eSync', V); if (sy) sy.onclick = () => { collect(); l.sync = !l.sync; if (!l.sync && mt) { l.icon = mt.icon; l.name = mt.name; } dirty(); repaint(); };
  const mb = $('#useMB', V); if (mb) mb.onclick = () => { collect(); l.brief = mt.brief; dirty(); repaint(); };
  const ds = $('[data-l="drawer"]', V); if (ds) ds.onchange = () => { dirty(); repaint(); };
  const so = $('#eSolo', V); if (so) so.onclick = () => { collect(); l.solo = !l.solo; dirty(); repaint(); };
  $$('[data-pm]', V).forEach((b) => { b.onclick = () => { collect(); const i = +b.dataset.pm, j = i + +b.dataset.d; if (j < 0 || j >= l.parts.length) return; [l.parts[i], l.parts[j]] = [l.parts[j], l.parts[i]]; dirty(); repaint(); }; });
  $$('[data-prm]', V).forEach((b) => { b.onclick = () => { collect(); l.parts = l.parts.filter((x) => x !== b.dataset.prm); if (E.m && E.m.id === b.dataset.prm) E.m = null; dirty(); repaint(); }; });
  const pa = $('#pAdd', V); if (pa) pa.onchange = () => { if (!pa.value) return; collect(); l.parts = (l.parts || []).concat(pa.value); dirty(); repaint(); };
  // 套組成員的「✏️ 設定」：在那一行下面展開
  $$('[data-mopen]', V).forEach((b) => { b.onclick = () => { collect(); const c = b.dataset.mopen; E.m = E.m && E.m.id === c ? null : { id: c, l: copy(L[c]) }; repaint(); }; });
  if (E.m && $('.mpanel', V)) {
    const P = $('.mpanel', V), m = E.m.l;
    const mcollect = () => { $$('[data-ml]', P).forEach((x) => { m[x.dataset.ml] = x.value.trim(); }); m.solo = $('#mSolo', P).checked; };
    $$('[name=m-see]', P).forEach((r) => { r.onchange = () => { mcollect(); m.on = r.value === '1'; repaint(); }; });
    $$('[name=m-mode]', P).forEach((r) => { r.onchange = () => { mcollect(); m.mode = r.value === 'show' ? 'show' : useMode(m, E.m.id); if (SC.appOf(m, E.m.id)) m.app = SC.appOf(m, E.m.id); repaint(); }; });
    $('#mClose', P).onclick = () => { E.m = null; repaint(); };
    $('#mSave', P).onclick = async () => {
      mcollect();
      const id = E.m.id, old = S.pub.list[id];
      S.pub.list[id] = Object.assign({}, old, m);
      let hs; try { hs = await health(id); } finally { S.pub.list[id] = old; }
      const errs = blocking(hs);
      if (m.on && errs.length) { $('#mErr', P).innerHTML = `<div class="warn">⛔ ${esc(errs.map((h) => h.msg).join('；'))}</div>`; return; }
      const paths = {};
      ['on', 'mode', 'app', 'url', 'brief', 'solo'].forEach((k) => { paths[`list/${id}/${k}`] = m[k]; });   // 系統代號留著（改回開放申請不用重選）
      try { collect(); await commit(paths, `💾 已儲存「${SC.face(id).name}」`); E.m = { id, l: copy(S.pub.list[id]) }; repaint(); }
      catch (e) { toast('儲存失敗：' + errText(e), true); }
    };
  }
  $('#eSave').onclick = () => saveEditor(false);
  $('#eSaveX').onclick = () => saveEditor(true);
  $('#eX').onclick = (e) => { e.preventDefault(); S.ed = null; go('cards'); };   // 取消返回：不存、不再問
  if (!isSuite) modeExtra();
  shotsWire();
  refreshHealth();
  paintConn();

  function modeExtra() {
    const box = $('#modeExtra', V); if (!box) return;
    if (l.mode === 'apply') {
      const a = W.APPS[SC.appOf(l, E.id)] || {};
      box.innerHTML = `<div class="sub-choice"><div class="okbox">🔐 這是會員中心的「${esc(a.name || '')}」：其他老師在說明頁按「📝 申請使用」，到會員中心申請，你核准後就能用。<br><span class="small">（系統自動對應，不用設定）</span></div></div>`;
    } else if (l.mode === 'open') {
      const synced = l.sync && mt;
      box.innerHTML = `<div class="sub-choice"><div class="info">🚀 這個工具不用帳號（沒有接會員中心）：其他老師在說明頁按「🚀 直接開啟」就能用。</div><label class="f">工具網址${tip('站內網址從網站根目錄寫起，例如 gamification/picker.html；外部網站寫完整 https:// 網址。')}</label>
        <input type="text" data-l="url" value="${esc(synced ? mt.href : (l.url || ''))}" ${synced ? 'disabled' : ''}>${synced ? '<div class="hint">🔗 跟首頁同步中：網址用首頁的。</div>' : ''}<div id="safeBox" class="small muted" style="margin-top:6px">檢查中…</div></div>`;
      const inp = $('[data-l="url"]', box);
      const run = () => safety(inp.value).then((s) => { const b = $('#safeBox', V); if (!b) return; b.innerHTML = s === 'bad' ? '<div class="warn">⚠️ 這個頁面有「回事務所首頁」的按鈕，其他老師點了會看到你的私人首頁。請改成「👀 只展示」，或請 Claude 拿掉那顆按鈕。</div>' : s === 'ok' ? '<div class="okbox">✅ 頁面沒有回事務所首頁的按鈕，可以免申請開放。</div>' : s === 'ext' ? '<div class="okbox">🌐 外部網站，會在新分頁打開。</div>' : '<div class="warn">❓ 找不到這個頁面，請確認網址。</div>'; refreshHealth(); });
      run(); inp.addEventListener('change', run);
    } else box.innerHTML = '';
  }
  function shotsWire() {
    $$('img[data-src]', V).forEach((im) => { const s = im.dataset.src; if (s.startsWith('f:')) SC.fimg(s.slice(2), false).then((d) => { if (d) im.src = d; }); else im.src = SC.thumb(s); });
    $$('[data-cap]', V).forEach((x) => { x.oninput = () => { it.shots[+x.dataset.cap][1] = x.value; dirty(); }; });
    $$('[data-smv]', V).forEach((b) => { b.onclick = () => { collect(); const i = +b.dataset.smv, j = i + +b.dataset.d; if (j < 0 || j >= it.shots.length) return; [it.shots[i], it.shots[j]] = [it.shots[j], it.shots[i]]; dirty(); repaint(); }; });
    $$('[data-sdel]', V).forEach((b) => { b.onclick = () => { collect(); const s = it.shots[+b.dataset.sdel]; if (!confirm('刪除這張截圖？')) return; it.shots.splice(+b.dataset.sdel, 1); if (String(s[0]).startsWith('f:')) (E.gone = E.gone || []).push(s[0].slice(2)); dirty(); repaint(); }; });
    $('#upl', V).onchange = async (e) => {
      const files = Array.from(e.target.files || []); if (!files.length) return;
      if (S.conn === false) return toast('目前離線，等燈號變綠再上傳', true);
      collect();
      for (let k = 0; k < files.length; k++) {
        $('#uplMsg', V).textContent = `壓縮並上傳第 ${k + 1}／${files.length} 張…`;
        try { const r = await compress(files[k]); const iid = rid(14); await withTimeout(FB.set('showcase/img/' + iid, { data: r.data, t: r.t }), 30000, '上傳逾時'); it.shots.push(['f:' + iid, files[k].name.replace(/\.[^.]+$/, ''), r.w, r.h]); (E.uploaded = E.uploaded || []).push(iid); dirty(); }
        catch (err) { toast(`「${files[k].name}」上傳失敗：${errText(err)}`, true); }
      }
      repaint(); toast('📸 上傳完成，記得按 💾 儲存');
    };
  }
  async function refreshHealth() {
    collect();
    const hs = await draftHealth();
    const ul = $('#health'); if (!ul) return;
    ul.innerHTML = hs.length ? hs.map((h) => `<li data-key="${esc(h.key)}">${h.lv === 'err' ? '⛔' : h.lv === 'warn' ? '⚠️' : '💡'} ${esc(h.msg)}</li>`).join('') : '<li>✅ 都沒問題</li>';
    if (hs.some((h) => h.lv === 'err')) ul.insertAdjacentHTML('beforeend', `<li class="muted small">⛔ 要修好才能讓人看見${l.on ? '（現在是「看得見」，存檔會被擋住）' : ''}</li>`);
    const K = { name: 's-card', from: 's-card', mother: 's-card', app: 's-show', url: 's-show', parts: 's-suite', suite: 's-suite', intro: 's-intro', shots: 's-shots' };
    $$('[data-key]', ul).forEach((li) => { li.onclick = () => { const el = document.getElementById(K[li.dataset.key] || 's-card'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }; });
  }
  // 用「還沒存的內容」做健檢：暫時放進 PUB 算完再放回去
  async function draftHealth() {
    const P = S.pub, oldL = P.list[E.id], oldI = P.items[E.id];
    P.list[E.id] = SC.normalize({ list: { [E.id]: l } }).list[E.id] || copy(l); P.list[E.id].parts = (l.parts || []).filter((c) => P.list[c]); P.list[E.id].name = l.name || ''; P.items[E.id] = it;
    try { return await health(E.id); }
    finally { if (oldL) P.list[E.id] = oldL; else delete P.list[E.id]; if (oldI) P.items[E.id] = oldI; else delete P.items[E.id]; }
  }
  function collect() {
    $$('[data-l]', V).forEach((x) => { if (x.disabled) return; if (x.dataset.l === 'from0') return; l[x.dataset.l] = x.value.trim(); });
    $$('[data-it]', V).forEach((x) => { it[x.dataset.it] = x.value.trim(); });
    $$('[data-lines]', V).forEach((x) => { const k = x.dataset.lines, n = +x.dataset.n; it[k] = PARSE(x.value, n, k === 'flow' ? (a) => { a[3] = !a[3] ? '' : /學|^s$/i.test(a[3]) ? 's' : 't'; return a; } : null); });
    $$('[data-one]', V).forEach((x) => { it[x.dataset.one] = PONE(x.value); });
  }
  async function saveEditor(close) {
    collect();
    if (!String(l.sync && mt ? mt.name : l.name).trim()) return toast('請填名稱', true);
    const hs = await draftHealth(), errs = blocking(hs);
    if (l.on && errs.length) { refreshHealth(); return toast('「看得見」的卡片不能有 ⛔ 問題：' + errs.map((h) => h.msg).join('；'), true); }
    const item = {}; Object.entries(it).forEach(([k, v]) => { if (SC.ITEM_KEYS.includes(k) && (Array.isArray(v) ? v.length : v)) item[k] = v; });
    const lst = {}; ['on', 'drawer', 'shelf', 'order', 'icon', 'name', 'brief', 'mode', 'app', 'url', 'from', 'sync', 'mref', 'parts', 'solo'].forEach((k) => { lst[k] = l[k] == null ? null : l[k]; });
    if (l.sync && mt) { lst.icon = mt.icon; lst.name = mt.name; }   // 同步中也存一份，首頁讀不到時用
    lst.mref = SC.snapMref(l.from);   // 存檔＝看過首頁現在的樣子（下次首頁再改才提醒）
    if (!isSuite && lst.mode !== 'show') { lst.mode = useMode(l, E.id); if (SC.appOf(l, E.id)) lst.app = SC.appOf(l, E.id); }
    lst.parts = (l.parts || []).filter((c) => L[c]);
    const paths = { [`list/${E.id}`]: lst, [`items/${E.id}`]: item };
    // 套組：移出的系統、也單獨展出
    if (isSuite) {
      (L[E.id] ? L[E.id].parts : []).filter((c) => !lst.parts.includes(c) && L[c]).forEach((c) => { paths[`list/${c}/solo`] = false; if (!S.pub.drawers[L[c].drawer]) paths[`list/${c}/drawer`] = lst.drawer; });
      // 從別的套組搬過來的卡片：從舊套組移除
      lst.parts.forEach((c) => { const o = SC.suiteOf(c); if (o && o !== E.id) paths[`list/${o}/parts`] = L[o].parts.filter((x) => x !== c); });
      if (!lst.parts.length) delete lst.parts;
    }
    if (suiteId && !lst.solo) lst.drawer = L[suiteId].drawer;   // 只在套組裡的系統：分類跟著套組
    delete lst._suite;
    try {
      await commit(paths, l.on ? '💾 已儲存，展覽館已更新（分享頁約 30 分鐘內更新）' : '💾 已儲存（展覽館目前看不見）');
      for (const g of E.gone || []) await FB.remove('showcase/img/' + g).catch(() => {});
      const id = E.id; S.ed = null;
      if (close) go('cards'); else { history.replaceState(null, '', '#edit/' + id); route(); }
    } catch (e) { toast('儲存失敗：' + errText(e), true); }
  }
}

/* ---------- 截圖壓縮：最長邊 1200、WebP（不支援就 JPEG），超過大小就降品質；縮圖寬 600（手機 240） ---------- */
async function compress(file) {
  const img = await new Promise((ok, bad) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => bad(new Error('不是圖片檔')); i.src = u; });
  const draw = (w) => { const c = document.createElement('canvas'); c.width = w; c.height = Math.round(img.height * w / img.width); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; };
  const enc = (c, q) => { let d = c.toDataURL('image/webp', q); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', q); return d; };
  let w = Math.min(1200, img.width), c = draw(w), q = 0.82, data = enc(c, q);
  while (data.length > 430000 && (q > 0.45 || w > 600)) { if (q > 0.45) q -= 0.08; else { w = Math.round(w * 0.8); c = draw(w); } data = enc(c, q); }
  if (data.length > 430000) throw new Error('圖片太大，請先裁小一點');
  const tw = w >= 600 ? 600 : 240, t = enc(draw(Math.min(tw, w)), 0.76);
  return { data, t, w, h: c.height };
}

/* ---------- 第一次使用：匯入內建內容 ---------- */
function renderWelcome() {
  topLinks();
  const seed = SC.seedPub(), n = Object.keys(seed.list).length, on = Object.values(seed.list).filter((l) => l.on).length;
  $('#app').innerHTML = `<div class="panel" style="max-width:640px;margin:6vh auto"><h2>🌱 第一次使用：把展覽館搬進資料庫</h2>
    <p style="margin:10px 0;line-height:1.8">按下去之後，展覽館的內容會存進 Firebase，之後就由你在這一頁自己管理。</p>
    <div class="info">會匯入 <b>${on}</b> 張看得見的卡片，以及 <b>${n - on}</b> 張 Claude 寫好初版、先設成看不見的卡片。</div>
    <div class="row" style="margin-top:12px"><button class="btn" id="seed" data-needconn>🌱 匯入並開始管理</button></div></div>`;
  paintConn();
  $('#seed').onclick = async () => {
    $('#seed').disabled = true;
    const p = SC.seedPub(); p.rev = Date.now(); p.v = SC.SCHEMA;
    Object.keys(p.list).forEach((id) => { const l = p.list[id]; l.mref = SC.snapMref(l.from); });
    try { S.ownRevs.add(p.rev); await withTimeout(FB.set('showcase/pub', clean(p)), 20000, '匯入逾時'); toast('✅ 匯入完成'); await loadAll(true); }
    catch (e) { $('#seed').disabled = false; toast('匯入失敗：' + errText(e), true); }
  };
}

boot();
