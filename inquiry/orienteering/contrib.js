/* 🧭 遺落的地點：第四階段「📸 學生投稿」老師端
   - 開投稿活動（投稿代碼、截止日、發獎碼、選填名單）
   - 審核佇列：照片、位置、站位、視角、自動提醒（禁行區、附近已有點位）
   - ✅ 通過＝照片複製到題庫照片區、新增點位（標記學生出題）；✏️ 退回＝選原因，學生看得到可重投
   - 🏆 發獎：學生拿「通過畫面」來，老師在他手機輸入發獎碼＝已領取（防止拿舊畫面重複領）
   資料：orienteering/contrib/<代碼>/{meta, keys, items/<學生雜湊>/<id>, pics/<照片id>, claims/<雜湊>/<id>, secret}
   照片和投稿資料分開放：老師即時監聽 items（很小），照片要看才讀一次，Firebase 用量省很多 */
const { S, Store, LS, $, $$, esc, toast, modal, confirmBox, zoomImg, imgTag, pts, nearestZone } = window.TT;
const G = window.GPS;

const C = { code: null, meta: null, items: {}, claims: {}, unsubs: [], view: 'pending', list: {}, pics: {}, lastHTML: '' };
const base = () => 'orienteering/contrib/' + C.code;
const REASONS = ['照片太模糊', '在教室／辦公室或禁行區內', '照片裡有人臉', '拍的是會移動的東西', '和現有題目重複', '位置或站位標錯了', '太難辨認（再拍近一點）'];

export function stopContrib() { C.unsubs.forEach((u) => { try { u(); } catch (e) { } }); C.unsubs = []; }
export function contribBadge() { return Object.values(C.items).filter((x) => !x.status).length; }

// ---------- 列表 ----------
export async function renderContribTab() {
  if (C.code && C.meta) return drawReview();
  const panel = $('#panel');
  panel.innerHTML = '<p class="muted">讀取中…</p>';
  try { C.list = (await FB.get('orienteering/mycontrib/' + S.user.uid)) || {}; } catch (e) { panel.innerHTML = `<div class="alert red">讀取失敗：${esc(e.code || e.message)}（Firebase 規則可能還沒更新）</div>`; return; }
  const last = LS.get('gps_contrib', '');
  if (last && C.list[last] && !C._auto) { C._auto = true; return openContrib(last); }
  const list = Object.entries(C.list).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  panel.innerHTML = `
  <div class="row"><h2 style="margin:0">📸 學生投稿</h2><span class="spacer"></span><button class="btn primary" id="cNew">➕ 開投稿活動</button></div>
  <p class="lead" style="margin-top:6px">讓學生拍校園照片出題：學生用手機投稿（照片、位置、站位、視角），你在這裡審核；通過的照片直接進題庫，學生拿著「通過畫面」找你領獎。</p>
  <table class="list"><thead><tr><th>名稱</th><th>投稿代碼</th><th>狀態</th><th>建立時間</th><th></th></tr></thead><tbody>
  ${list.map(([c, r]) => `<tr><td><b>${esc(r.title)}</b></td><td><code>${c}</code></td><td>${r.open ? '<span class="chip teal">收件中</span>' : '<span class="chip gray">已停止</span>'}</td><td class="small">${new Date(r.createdAt).toLocaleDateString('zh-TW')}</td>
    <td class="row" style="flex-wrap:nowrap"><button class="btn sm primary" data-open="${c}">進入審核</button><button class="btn sm ghost" data-del="${c}">🗑</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">還沒有投稿活動，按右上角「➕ 開投稿活動」。</td></tr>'}
  </tbody></table>`;
  $('#cNew').onclick = newModal;
  $$('[data-open]').forEach((b) => { b.onclick = () => openContrib(b.dataset.open); });
  $$('[data-del]').forEach((b) => {
    b.onclick = async () => {
      const c = b.dataset.del;
      if (!(await confirmBox(`刪除投稿活動「${C.list[c].title}」？\n已經通過、進了題庫的點位不會被刪；還沒審核的投稿會一起刪掉。`, '刪除'))) return;
      try { await FB.remove('orienteering/contrib/' + c); await FB.remove(`orienteering/mycontrib/${S.user.uid}/${c}`); toast('已刪除'); renderContribTab(); } catch (e) { toast('刪除失敗：' + (e.code || e.message), true); }
    };
  });
}

const tip = (t) => `<i class="tipi" tabindex="0" data-tip="${esc(t)}">?</i>`;
function newModal() {
  const pin = String(1000 + Math.floor(Math.random() * 9000));
  const m = modal(`<h2>➕ 開投稿活動</h2>
    <label class="f">名稱</label><input type="text" id="cTitle" value="校園出題大賽 ${new Date().getMonth() + 1}/${new Date().getDate()}">
    <div class="grid2">
      <div><label class="f">截止日期（選填）${tip('到期後學生就不能再投稿。空白＝一直開著，之後可以手動停止收件。')}</label><input type="date" id="cDead"></div>
      <div><label class="f">🏆 發獎碼${tip('學生拿「投稿通過」畫面來找你時，你在他的手機上輸入這 4 碼，就會變成「已領取」，同一張不能再領第二次。不要告訴學生。')}</label><input type="text" id="cPin" value="${pin}" maxlength="8"></div>
    </div>
    <label class="f">學生名單（選填）${tip('一行一位：「座號 姓名」，例如「20105 王小明」。有填名單：只有名單上的學生能投稿。空白：知道投稿代碼的人都能投。名單不會公開，系統只存加密後的雜湊。')}</label>
    <textarea id="cRoster" placeholder="20101 王小明&#10;20102 李小華" style="min-height:80px"></textarea>
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-x>取消</button><button class="btn primary" id="cGo">建立</button></div>`, { sticky: true });
  $('[data-x]', m.el).onclick = m.close;
  $('#cGo', m.el).onclick = async () => {
    const title = $('#cTitle', m.el).value.trim() || '校園出題', pinV = $('#cPin', m.el).value.trim();
    if (!/^\w{3,8}$/.test(pinV)) return toast('發獎碼請用 3～8 個英數字', true);
    const dead = $('#cDead', m.el).value ? new Date($('#cDead', m.el).value + 'T23:59:59').getTime() : 0;
    const roster = $('#cRoster', m.el).value.split('\n').map((l) => l.trim().split(/[\s,，、]+/)).filter((a) => a.length >= 2 && a[0] && a[1]).map(([seat, ...n]) => ({ seat: seat.replace(/\D/g, ''), name: n.join('') })).filter((r) => r.seat);
    $('#cGo', m.el).disabled = true;
    try { const code = await createContrib(title, dead, pinV, roster); m.close(); toast(roster.length ? `✅ 已建立（名單 ${roster.length} 人）` : '✅ 已建立'); openContrib(code); }
    catch (e) { $('#cGo', m.el).disabled = false; toast('建立失敗：' + (e.code || e.message), true); }
  };
}
async function createContrib(title, deadline, pin, roster) {
  const b = S.bank;
  let code = G.makeCode(6);
  for (let i = 0; i < 5 && await FB.get(`orienteering/contrib/${code}/meta`); i++) code = G.makeCode(6);
  const ys = Object.values(b.points).map((p) => p.y);
  const meta = {
    owner: S.user.uid, bankId: S.bankId, title, open: true, createdAt: Date.now(), roster: roster.length > 0,
    map: b.map, noGo: b.noGo, crop: { top: Math.max(0, Math.min(12.5, Math.min(...ys) - 9)), bot: Math.min(100, Math.max(88, Math.max(...ys) + 4)) }
  };
  if (deadline) meta.deadline = deadline;
  const keys = {};
  for (const r of roster) keys[await G.sha(code + '|' + r.seat + '|' + r.name)] = true;
  await FB.set('orienteering/contrib/' + code, { meta, keys, secret: { pin } });
  await FB.set(`orienteering/mycontrib/${S.user.uid}/${code}`, { title, createdAt: meta.createdAt, open: true });
  return code;
}

// ---------- 審核 ----------
async function openContrib(code) {
  stopContrib();
  $('#panel').innerHTML = '<p class="muted">讀取中…</p>';
  try {
    const meta = await FB.get(`orienteering/contrib/${code}/meta`);
    if (!meta) { LS.set('gps_contrib', ''); C.code = null; toast('找不到這個投稿活動', true); return renderContribTab(); }
    if (meta.bankId && meta.bankId !== S.bankId && S.banks[meta.bankId]) { toast('切換到這個投稿活動用的題庫…'); await TT.openBankSilently(meta.bankId); }
    C.code = code; C.meta = meta; C.items = {}; C.claims = {}; C.lastHTML = '';
    C.pin = await FB.get(`orienteering/contrib/${code}/secret/pin`);
    LS.set('gps_contrib', code);
    C.unsubs.push(FB.listen(base() + '/items', (v) => { C.items = {}; Object.entries(v || {}).forEach(([h, o]) => Object.entries(o || {}).forEach(([id, it]) => { C.items[h + '/' + id] = { ...it, h, id }; })); syncClaims(); drawReview(); badge(); }));
    C.unsubs.push(FB.listen(base() + '/claims', (v) => { C.claims = v || {}; syncClaims(); drawReview(); }));
    purgeOld();
  } catch (e) { toast('開啟失敗：' + (e.code || e.message), true); C.code = null; renderContribTab(); }
}
function badge() { const t = $('.tab[data-tab="contrib"]'); if (!t) return; const n = contribBadge(); t.innerHTML = '📸 投稿' + (n ? ` <span class="chip red">${n}</span>` : ''); }
// 學生在手機上領獎（寫 claims）→ 老師這邊把 item 也標成已領取（學生的畫面就會同步顯示）
function syncClaims() {
  const up = {};
  Object.entries(C.claims || {}).forEach(([h, o]) => Object.keys(o || {}).forEach((id) => { const it = C.items[h + '/' + id]; if (it && it.status === 'ok' && !it.claimed) up[`items/${h}/${id}/claimed`] = Date.now(); }));
  if (Object.keys(up).length) FB.update(base(), up).catch(() => {});
}
// 退回超過 30 天的投稿：照片刪掉（省空間），文字紀錄留著
function purgeOld() {
  const up = {}, lim = Date.now() - 30 * 86400000;
  Object.values(C.items).forEach((it) => { if (it.status === 'back' && (it.backAt || 0) < lim && it.pic && !it.picGone) { up['pics/' + it.pic] = null; up[`items/${it.h}/${it.id}/picGone`] = true; } });
  if (Object.keys(up).length) FB.update(base(), up).catch(() => {});
}
async function picData(it) {
  if (it.okPhoto) return G.loadPhoto(it.okPhoto);
  if (!it.pic || it.picGone) return '';
  if (C.pics[it.pic]) return C.pics[it.pic];
  try { const d = await FB.get(`${base()}/pics/${it.pic}/data`); if (d) C.pics[it.pic] = d; return d || ''; } catch (e) { return ''; }
}
const contribURL = () => new URL('contribute.html?c=' + C.code, location.href).href;

// 自動提醒：禁行區、附近已有點位（可能重複）
function warnings(it) {
  const w = [], b = S.bank;
  const ng = G.inNoGo(b, it); if (ng) w.push(`📍 位置在禁行區「${ng.label}」裡（一樓或不同樓層可忽略）`);
  if (it.cam && G.inNoGo(b, it.cam)) w.push('🦶 站位在禁行區裡');
  const near = pts().map((p) => ({ p, d: G.dist(b, p, it) })).filter((x) => x.d < 2.2).sort((a, c) => a.d - c.d)[0];
  if (near) w.push(`👀 附近已經有第 ${near.p.no} 號「${esc(near.p.name)}」，可能重複 <span data-cmp="${near.p.key}" style="text-decoration:underline;cursor:pointer">看照片</span>`);
  return w;
}
function miniMapHTML(it, w) {
  const b = S.bank, map = b.map, crop = C.meta.crop || { top: 0, bot: 100 }, span = (crop.bot - crop.top) / 100;
  // 以投稿位置為中心、放大 2.4 倍的小地圖（用背景圖定位，不用捲動）
  const z = 2.4, W = w || 260, H = Math.round(W * 0.72), fullW = W * z, fullH = fullW * map.h / map.w;
  const px = it.x / 100 * fullW, py = it.y / 100 * fullH;
  const ox = Math.max(0, Math.min(fullW - W, px - W / 2)), oy = Math.max(crop.top / 100 * fullH, Math.min(fullH * crop.bot / 100 - H, py - H / 2));
  const dot = (x, y, html) => `<div style="position:absolute;left:${(x / 100 * fullW - ox).toFixed(1)}px;top:${(y / 100 * fullH - oy).toFixed(1)}px;transform:translate(-50%,-50%)">${html}</div>`;
  return `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;border:2px solid var(--line);border-radius:10px;background:#fff url('${esc(G.photoURL(map.src))}') no-repeat;background-size:${fullW}px ${fullH}px;background-position:${-ox}px ${-oy}px">
    ${it.cam ? dot(it.cam.x, it.cam.y, `<div style="width:26px;height:26px;border-radius:50%;background:#1f9e8f;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:900;transform:rotate(${it.cam.dir * 45}deg);box-shadow:0 1px 4px rgba(0,0,0,.4)">↑</div>`) : ''}
    ${dot(it.x, it.y, '<div style="font-size:24px;transform:translateY(-40%)">📍</div>')}
  </div>`;
}
const who = (it) => `${esc(it.seat || '')} ${esc(it.who || '')}`.trim();
function itemCard(it) {
  const w = warnings(it), v = it.view || {};
  return `<div class="card" style="padding:12px">
    <div class="row" style="align-items:flex-start;gap:12px;flex-wrap:nowrap">
      <img data-pic="${it.h}/${it.id}" style="width:230px;height:172px;object-fit:cover;border-radius:10px;border:2px solid var(--ink);background:#eee;cursor:zoom-in;flex:none" alt="">
      ${miniMapHTML(it, 230)}
    </div>
    <div style="margin-top:8px"><b style="font-size:1.1em">${esc(it.name)}</b>　<span class="small muted">${who(it)}・${new Date(it.ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="small" style="margin-top:2px">👁️ ${G.viewLabel({ dist: v.dist || '', angle: v.angle || '', odd: !!v.odd }) || '未標'}　🦶 ${it.cam ? `鏡頭朝${G.DIRS[it.cam.dir]}` : '未標'}${it.hint ? `　💡 ${esc(it.hint)}` : ''}</div>
    ${it.task && it.task.q ? `<div class="small">🔍 ${esc(it.task.q)}${it.task.a ? `（答案：${esc(it.task.a)}）` : ''}</div>` : ''}
    ${w.map((x) => `<div class="alert red small" style="margin:6px 0 0;padding:5px 10px">${x}</div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn teal" data-ok="${it.h}/${it.id}">✅ 通過，放進題庫</button><button class="btn" data-back="${it.h}/${it.id}">✏️ 退回</button></div>
  </div>`;
}
function drawReview() {
  if (S.tab !== 'contrib' || !C.code) return;
  const panel = $('#panel'); if (!panel) return;
  badge();
  const all = Object.values(C.items).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const pend = all.filter((x) => !x.status), ok = all.filter((x) => x.status === 'ok'), back = all.filter((x) => x.status === 'back');
  const closed = !C.meta.open || (C.meta.deadline && Date.now() > C.meta.deadline);
  const view = C.view;
  const html = `
  <div class="toolbar" style="align-items:center">
    <button class="btn sm ghost" id="cBack">← 投稿活動列表</button>
    <div><div class="bold" style="font-size:1.15em">${esc(C.meta.title)}</div><div class="small muted">投稿代碼 <b style="font-size:1.2em;color:var(--ink);letter-spacing:.1em">${C.code}</b>${C.meta.deadline ? `・截止 ${new Date(C.meta.deadline).toLocaleDateString('zh-TW')}` : ''}${C.meta.roster ? '・限名單' : '・知道代碼就能投'}</div></div>
    ${closed ? '<span class="chip gray">已停止收件</span>' : '<span class="chip teal">收件中</span>'}
    <span class="spacer"></span>
    <span class="chip" style="font-size:1em" title="學生拿通過畫面來，在他手機上輸入">🏆 發獎碼 <b>${esc(C.pin || '')}</b></span>
    <button class="btn sm" id="cLink">🔗 學生連結</button>
    <button class="btn sm" id="cOpen">${C.meta.open ? '⏸ 停止收件' : '▶ 開放收件'}</button>
    <button class="btn ink sm" id="cShow">📺 新入庫展示</button>
  </div>
  <div class="row" style="gap:6px;margin:4px 0 10px">${[['pending', `⏳ 待審核（${pend.length}）`], ['ok', `✅ 已通過（${ok.length}）`], ['back', `✏️ 已退回（${back.length}）`]].map(([k, t]) => `<button class="btn sm ${view === k ? 'primary' : 'ghost'}" data-view="${k}">${t}</button>`).join('')}</div>
  ${view === 'pending' ? (pend.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(500px,1fr));gap:12px">${pend.map(itemCard).join('')}</div>` : '<div class="card muted" style="text-align:center;padding:30px">🎉 目前沒有待審核的投稿</div>')
    : view === 'ok' ? `<table class="list"><thead><tr><th></th><th>點位</th><th>投稿者</th><th>通過時間</th><th>🏆 獎勵</th></tr></thead><tbody>${ok.map((it) => `<tr><td><img data-pic="${it.h}/${it.id}" class="thumb" alt=""></td><td><b>${it.pointNo || ''}</b> ${esc(it.name)}</td><td>${who(it)}</td><td class="small">${it.okAt ? new Date(it.okAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td>
        <td>${it.claimed ? '<span class="chip teal">✅ 已領取</span>' : `<span class="chip">還沒領</span> <button class="btn sm ghost" data-claim="${it.h}/${it.id}">標記已發獎</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">還沒有通過的投稿</td></tr>'}</tbody></table>`
    : `<table class="list"><thead><tr><th></th><th>地點描述</th><th>投稿者</th><th>退回原因</th></tr></thead><tbody>${back.map((it) => `<tr><td><img data-pic="${it.h}/${it.id}" class="thumb" alt=""></td><td>${esc(it.name)}</td><td>${who(it)}</td><td class="small">${esc(it.reason || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">沒有退回的投稿</td></tr>'}</tbody></table>`}
  <p class="small muted" style="margin-top:12px">💡 退回超過 30 天的投稿照片會自動刪除（省空間）。通過的照片會搬到題庫，投稿區的原檔同時刪除。</p>`;
  if (html === C.lastHTML && panel.dataset.contrib === C.code) return;
  C.lastHTML = html; panel.dataset.contrib = C.code;
  const y = window.scrollY; panel.innerHTML = html; window.scrollTo(0, y);
  $$('img[data-pic]', panel).forEach(async (im) => { const it = C.items[im.dataset.pic]; const d = it ? await picData(it) : ''; if (d) im.src = d; im.onclick = () => im.src && zoomImg(im.src); });
  $$('[data-cmp]', panel).forEach((s) => { s.onclick = () => { const p = S.bank.points[s.dataset.cmp]; if (p && p.photos[0]) G.loadPhoto(p.photos[0]).then((u) => zoomImg(u || G.photoURL(p.photos[0]))); }; });
  $('#cBack').onclick = () => { stopContrib(); C.code = null; C.meta = null; LS.set('gps_contrib', ''); delete panel.dataset.contrib; renderContribTab(); };
  $('#cLink').onclick = linkModal;
  $('#cOpen').onclick = async () => { const open = !C.meta.open; await FB.update(base() + '/meta', { open }); FB.update(`orienteering/mycontrib/${S.user.uid}/${C.code}`, { open }).catch(() => {}); C.meta.open = open; C.lastHTML = ''; drawReview(); toast(open ? '▶ 開放收件' : '⏸ 已停止收件'); };
  $('#cShow').onclick = showcase;
  $$('[data-view]', panel).forEach((b) => { b.onclick = () => { C.view = b.dataset.view; C.lastHTML = ''; drawReview(); }; });
  $$('[data-ok]', panel).forEach((b) => { b.onclick = () => approveModal(C.items[b.dataset.ok]); });
  $$('[data-back]', panel).forEach((b) => { b.onclick = () => rejectModal(C.items[b.dataset.back]); });
  $$('[data-claim]', panel).forEach((b) => { b.onclick = async () => { const it = C.items[b.dataset.claim]; if (await confirmBox(`把 ${who(it)} 的「${it.name}」標記為已發獎？`, '🏆 已發獎')) FB.update(base(), { [`items/${it.h}/${it.id}/claimed`]: Date.now() }); }; });
}

// ✅ 通過：可以順手修改，按下就新增點位（照片搬到題庫照片區）
async function approveModal(it) {
  const b = S.bank, no = Math.max(0, ...pts().map((q) => q.no)) + 1, zone = nearestZone(it), v = it.view || {};
  const zm = G.zoneById(b);
  const m = modal(`<h2>✅ 通過，放進題庫</h2>
    <div class="row" style="gap:12px;align-items:flex-start;flex-wrap:nowrap"><img id="apImg" style="width:180px;height:135px;object-fit:cover;border-radius:10px;border:2px solid var(--ink);background:#eee" alt="">
      <div class="small">投稿者：<b>${who(it)}</b><br>${warnings(it).map((x) => `<div style="color:var(--red)">${x}</div>`).join('') || '<span class="muted">沒有自動提醒 👍</span>'}</div></div>
    <div class="grid2">
      <div><label class="f">地點編號</label><input type="number" id="apNo" value="${no}"></div>
      <div><label class="f">區域</label><select id="apZone">${b.zones.map((z) => `<option value="${z.id}" ${z.id === zone ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></div>
    </div>
    <label class="f">地點名稱</label><input type="text" id="apName" value="${esc(it.name)}">
    <div class="grid2">
      <div><label class="f">距離</label><select id="apDist">${G.VIEW_DIST.map(([k, t]) => `<option value="${k}" ${(v.dist || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="f">角度</label><select id="apAngle">${G.VIEW_ANGLE.map(([k, t]) => `<option value="${k}" ${(v.angle || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="f">提示一（大範圍）</label><input type="text" id="apH1" value="${esc((zm[zone] || {}).name || '')}"></div>
      <div><label class="f">提示二（更精確）</label><input type="text" id="apH2" value="${esc(it.hint || it.name)}"></div>
    </div>
    <label class="f">🔍 觀察任務（選填）</label>
    <div class="grid2"><input type="text" id="apTq" value="${esc((it.task && it.task.q) || '')}" placeholder="題目"><input type="text" id="apTa" value="${esc((it.task && it.task.a) || '')}" placeholder="標準答案（空白＝老師判）"></div>
    <label class="f">出題者（答對的學生會看到「本題由 ○○ 出題」）</label><input type="text" id="apBy" value="${who(it)}">
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-x>取消</button><button class="btn teal" id="apGo">✅ 通過</button></div>`, { sticky: true, wide: true });
  picData(it).then((d) => { if (d && $('#apImg', m.el)) $('#apImg', m.el).src = d; });
  $('[data-x]', m.el).onclick = m.close;
  $('#apGo', m.el).onclick = async () => {
    const data = await picData(it); if (!data) return toast('讀不到投稿照片', true);
    $('#apGo', m.el).disabled = true;
    try {
      const pid = G.rid(6);
      await FB.set('orienteering/photos/' + pid, { owner: S.user.uid, data, ts: Date.now() });
      G.cachePhoto(pid, data);
      const key = 'pt' + G.rid(4), n = parseInt($('#apNo', m.el).value, 10) || no;
      const tq = $('#apTq', m.el).value.trim(), ta = $('#apTa', m.el).value.trim();
      b.points[key] = G.normPoint({
        no: n, name: $('#apName', m.el).value.trim() || it.name, x: +(+it.x).toFixed(2), y: +(+it.y).toFixed(2), zone: $('#apZone', m.el).value, accept: [n],
        photos: ['f:' + pid], hint1: $('#apH1', m.el).value.trim(), hint2: $('#apH2', m.el).value.trim(),
        view: { dist: $('#apDist', m.el).value, angle: $('#apAngle', m.el).value, odd: !!(it.view && it.view.odd) },
        cam: it.cam ? { x: +it.cam.x, y: +it.cam.y, dir: +it.cam.dir } : null, task: tq ? { q: tq, a: ta, bonus: 5 } : null,
        author: $('#apBy', m.el).value.trim(), contrib: C.code
      }, key);
      Store.save();
      await FB.update(base(), { [`items/${it.h}/${it.id}/status`]: 'ok', [`items/${it.h}/${it.id}/okAt`]: Date.now(), [`items/${it.h}/${it.id}/pointNo`]: n, [`items/${it.h}/${it.id}/pointKey`]: key, [`items/${it.h}/${it.id}/okPhoto`]: 'f:' + pid, ['pics/' + it.pic]: null });
      m.close(); toast(`✅ 已放進題庫：第 ${n} 號`);
    } catch (e) { $('#apGo', m.el).disabled = false; toast('通過失敗：' + (e.code || e.message), true); }
  };
}
function rejectModal(it) {
  const m = modal(`<h2>✏️ 退回</h2><p class="small muted">學生看得到原因，可以修正後重新投稿。</p>
    <div class="row" style="gap:6px;margin-top:8px">${REASONS.map((r) => `<button class="btn sm ghost" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <label class="f">原因</label><input type="text" id="rjText" maxlength="60" placeholder="點上面的常用原因，或自己寫">
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-x>取消</button><button class="btn red" id="rjGo">退回</button></div>`);
  $$('[data-r]', m.el).forEach((b) => { b.onclick = () => { const t = $('#rjText', m.el); t.value = t.value ? t.value + '、' + b.dataset.r : b.dataset.r; }; });
  $('[data-x]', m.el).onclick = m.close;
  $('#rjGo', m.el).onclick = async () => {
    const reason = $('#rjText', m.el).value.trim(); if (!reason) return toast('請寫一下原因，學生才知道怎麼改', true);
    try { await FB.update(base(), { [`items/${it.h}/${it.id}/status`]: 'back', [`items/${it.h}/${it.id}/reason`]: reason.slice(0, 60), [`items/${it.h}/${it.id}/backAt`]: Date.now() }); m.close(); toast('已退回'); }
    catch (e) { toast('失敗：' + (e.code || e.message), true); }
  };
}
async function linkModal() {
  const url = contribURL();
  let qr = '';
  if (typeof QRCode !== 'undefined') { const box = document.createElement('div'); new QRCode(box, { text: url, width: 260, height: 260 }); await new Promise((r) => setTimeout(r, 60)); const c = box.querySelector('canvas'), i = box.querySelector('img'); qr = c ? c.toDataURL() : i ? i.src : ''; }
  const m = modal(`<h2>🔗 學生投稿連結</h2><p class="small muted">學生用手機掃 QR 或開連結，輸入座號、姓名就能投稿。</p>
    <div style="text-align:center;margin:12px 0">${qr ? `<img src="${qr}" style="width:260px;height:260px">` : ''}<div style="font-size:1.6em;font-weight:900;letter-spacing:.12em;margin-top:6px">投稿代碼 ${C.code}</div></div>
    <input type="text" readonly value="${esc(url)}" id="clUrl">
    <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" id="clCopy">📋 複製連結</button><button class="btn primary" data-x>關閉</button></div>`);
  $('[data-x]', m.el).onclick = m.close;
  $('#clCopy', m.el).onclick = () => navigator.clipboard.writeText(url).then(() => toast('已複製'), () => $('#clUrl', m.el).select());
}
// 📺 新入庫展示：投影最近通過的照片與出題者
function showcase() {
  const ok = Object.values(C.items).filter((x) => x.status === 'ok').sort((a, b) => (b.okAt || 0) - (a.okAt || 0)).slice(0, 12);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#1f2a44;color:#fff;z-index:300;padding:20px 26px;overflow:auto;font-family:inherit';
  el.innerHTML = `<div style="display:flex;align-items:center;gap:16px"><div><div style="font-family:'Bebas Neue',sans-serif;letter-spacing:.2em;color:#f2b134">THE LOST PLACES</div><h1 style="font-family:'Noto Serif TC',serif;font-size:2.2em">📸 新入庫題目・${esc(C.meta.title)}</h1></div><span style="flex:1"></span><button data-close style="background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:8px;padding:6px 14px;cursor:pointer">✕ 關閉</button></div>
    ${ok.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-top:14px">${ok.map((it) => `<div style="background:#fffdf8;color:#1f2a44;border-radius:14px;overflow:hidden"><img data-pic="${it.h}/${it.id}" style="width:100%;height:200px;object-fit:cover;display:block;background:#ddd"><div style="padding:8px 12px"><b style="font-size:1.2em">第 ${it.pointNo} 號</b><div>📸 ${who(it)} 出題</div></div></div>`).join('')}</div>` : '<p style="opacity:.7;margin-top:30vh;text-align:center;font-size:1.3em">還沒有通過的投稿</p>'}`;
  document.body.appendChild(el);
  el.querySelector('[data-close]').onclick = () => { el.remove(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { } };
  $$('img[data-pic]', el).forEach(async (im) => { const it = C.items[im.dataset.pic]; const d = it ? await picData(it) : ''; if (d) im.src = d; });
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { }
}
