/* 🧭 遺落的地點：第二階段「🏁 活動」
   - 開活動（設定、組別通行碼）
   - 自動裁判：讀學生送出的答案與求助 → 判對錯、算分、自動派題（挑人最少的區域）、給提示
   - 戰況看板：各組卡片、PASS 裁決、投影畫面、成績與 Excel
   老師只要開著這一頁，派題全部自動進行。 */
const { S, LS, $, $$, esc, toast, modal, confirmBox, zoomImg, imgTag, download, render } = window.TT;
const G = window.GPS;

const R = {
  code: null, meta: null, st: null, members: {}, unsubs: [], hostId: G.rid(4),
  active: false, lost: false, queue: Promise.resolve(), tick: null, dirty: new Set(), boardDirty: false,
  runs: {}, proj: null, wake: null, seenPass: new Set(), drawT: null, sig: {}, heatSig: ''
};
const base = () => 'orienteering/runs/' + R.code;
const bank = () => S.bank;

export const isRefereeing = () => R.active && R.meta && R.meta.status === 'running';
export function renderBadge() {
  const t = $('.tab[data-tab="live"]'); if (!t) return;
  const pend = R.st ? pendingPasses().length + pendingJudges().length : 0;
  t.innerHTML = '🏁 活動' + (R.active && R.meta && R.meta.status === 'running' ? ' <span class="chip red">進行中</span>' : '') + (pend ? ` <span class="chip red">🙋 ${pend}</span>` : '');
}

// ---------- 活動列表 ----------
export async function renderLiveTab() {
  if (R.code && R.meta) return drawDash();
  const panel = $('#panel');
  delete panel.dataset.dash; R.lastDash = null;
  panel.innerHTML = '<p class="muted">讀取活動中…</p>';
  try { R.runs = (await FB.get('orienteering/myruns/' + S.user.uid)) || {}; } catch (e) { panel.innerHTML = `<div class="alert red">讀取失敗：${esc(e.code || e.message)}（Firebase 規則可能還沒更新）</div>`; return; }
  const last = LS.get('gps_live', '');
  if (last && R.runs[last] && R.runs[last].status !== 'ended' && !R._autoTried) { R._autoTried = true; return openRun(last); }
  const list = Object.entries(R.runs).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  const stTxt = { ready: '<span class="chip">準備中</span>', running: '<span class="chip red">進行中</span>', paused: '<span class="chip">暫停中</span>', ended: '<span class="chip gray">已結束</span>' };
  panel.innerHTML = `
  <div class="row"><h2 style="margin:0">🏁 活動</h2><span class="spacer"></span><button class="btn primary" id="newRun">➕ 開新活動</button></div>
  <p class="lead" style="margin-top:6px">每次上課開一場活動。開好後把「學生連結」和各組「通行碼」發給學生，按 ▶ 開始，系統就會自動派題、判對錯、給提示；你只要看戰況、裁決 PASS。</p>
  <table class="list"><thead><tr><th>活動名稱</th><th>代碼</th><th>題庫</th><th>狀態</th><th>建立時間</th><th></th></tr></thead><tbody>
  ${list.map(([c, r]) => `<tr><td><b>${esc(r.title)}</b></td><td><code>${c}</code></td><td class="small">${esc((S.banks[r.bankId] || {}).name || '')}</td><td>${stTxt[r.status] || ''}</td><td class="small">${new Date(r.createdAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
    <td class="row" style="flex-wrap:nowrap"><button class="btn sm primary" data-open="${c}">進入戰況</button><button class="btn sm ghost" data-del="${c}">🗑</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">還沒有活動，按右上角「➕ 開新活動」。</td></tr>'}
  </tbody></table>`;
  $('#newRun').onclick = newRunModal;
  $$('[data-open]').forEach((b) => { b.onclick = () => openRun(b.dataset.open); });
  $$('[data-del]').forEach((b) => {
    b.onclick = async () => {
      const c = b.dataset.del;
      if (!(await confirmBox(`刪除活動「${R.runs[c].title}」（${c}）？\n所有作答紀錄都會刪掉，建議先下載成績 Excel。`, '刪除'))) return;
      try { await FB.remove('orienteering/runs/' + c); await FB.remove(`orienteering/myruns/${S.user.uid}/${c}`); toast('已刪除'); renderLiveTab(); } catch (e) { toast('刪除失敗：' + (e.code || e.message), true); }
    };
  });
}

// ---------- 開新活動 ----------
const PRESETS = [
  { id: 'quick', name: '⚡ 快速版', sub: '約 15 分鐘', v: { limitMin: 15, target: 6, pc: '2-7', route: 'near', passUnlock: 2 }, sc: { limitMin: 15, wall: 3 } },
  { id: 'half', name: '⏱ 半節課', sub: '約 25 分鐘', v: { limitMin: 25, target: 9, pc: '2-7', route: 'near', passUnlock: 3 }, sc: { limitMin: 25, wall: 4 } },
  { id: 'full', name: '🏁 整節課', sub: '約 40 分鐘', v: { limitMin: 40, target: 13, pc: '2-7', route: 'spread', passUnlock: 3 }, sc: { limitMin: 40, wall: 4 } }
];
const newRunModal = () => runModal(null);
const tip = (t) => `<i class="tipi" tabindex="0" data-tip="${esc(t)}">?</i>`;
/* 開新活動，或在「開始前」修改設定（edit＝目前活動）
   2026-10-12 改版：第一屏只有 名稱、賽制、組數、活動時間、上課中；其他用建議值，收在「⚙️ 自訂進階設定」 */
function runModal(edit) {
  const b = bank(), d = edit ? { ...G.DEFAULT_RUN, ...edit.settings } : { ...G.DEFAULT_RUN, ...LS.get('gps_runset', {}) };
  const now = new Date();
  const all = TT.pts(), nCam = all.filter((p) => p.cam).length, nTask = all.filter((p) => p.task).length;
  let names = [];
  const num = (id, label, v, min, max, t, cls) => `<div class="${cls || ''}"><label class="f">${label}${t ? tip(t) : ''}</label><input type="number" id="${id}" value="${v}" min="${min}" max="${max}"></div>`;
  const chk = (id, on, label, t, cls) => `<label class="chk ${cls || ''}" style="margin-top:8px"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}${t ? tip(t) : ''}</label>`;
  const m = modal(`
    <h2>${edit ? '⚙️ 修改活動設定' : '➕ 開新活動'}</h2>
    <label class="f">活動名稱</label><input type="text" id="rTitle" value="${esc(edit ? edit.title : `探究與實作 校園定向 ${now.getMonth() + 1}/${now.getDate()}`)}">
    <label class="f">賽制</label>
    <div class="modes"><button type="button" data-mode="race"><b>🏁 闖關競速</b><span>找齊指定數量的地點，比誰快</span></button><button type="button" data-mode="score"><b>🎯 積分賽</b><span>限時搶分，自己挑照片、分數會浮動</span></button></div>
    <select id="rMode" style="display:none"><option value="race">race</option><option value="score">score</option></select>
    <div class="grid2">
      ${edit ? '' : `<div><label class="f">組數</label><input type="number" id="rN" value="${LS.get('gps_teams', 10)}" min="1" max="60"></div>`}
      <div><label class="f">活動時間</label><div class="seg" id="rSeg">${PRESETS.map((p) => `<button type="button" data-preset="${p.id}">${p.name.split(' ')[0]} ${p.id === 'quick' ? 15 : p.id === 'half' ? 25 : 40} 分</button>`).join('')}</div></div>
    </div>
    ${chk('rTeach', d.teaching, '🤫 其他班正在上課', '勾了就不派「教學區鄰近」的點，學生不會經過正在上課的教室走廊。')}
    <div class="sumbox" id="rSum"></div>
    ${edit ? '<p class="small muted" style="margin-top:6px">組數與通行碼建立後就固定了（小紙條可能已經發出去）。</p>' : `<div style="margin-top:10px"><div class="row"><b>隊名</b>${tip('系統隨機取探險風隊名。學生進入後可以自己改一次隊名，老師也能在戰況頁按 ✏️ 改。')}<span class="spacer"></span><button type="button" class="btn sm ghost" id="rReroll">🎲 重抽</button></div><div class="namechips" id="rNames"></div></div>`}
    <details class="adv" id="rAdv"><summary>⚙️ 自訂進階設定 <span class="small muted" style="font-weight:400">（不打開就用上面的建議值）</span></summary><div class="advb">
      <h4>📸 題目</h4>
      <div class="grid2">
        ${num('rTarget', '每組要找到幾個地點', d.target, 1, 60, '', 'raceOnly')}
        <div class="raceOnly"><label class="f">每關的題目${tip('2 張照片時：兩張一定在不同區域，7 個候選分在 4 個區域。1 張照片時：候選分在 3 個區域。每關都換到上一關沒去過的區域。')}</label><select id="rCands">${[['2-7', '2 張照片・7 個候選'], ['2-6', '2 張照片・6 個候選'], ['1-5', '1 張照片・5 個候選'], ['1-4', '1 張照片・4 個候選'], ['1-3', '1 張照片・3 個候選']].map(([v, t]) => `<option value="${v}" ${`${d.photos || 1}-${d.cands || 5}` === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="raceOnly"><label class="f">派發方式${tip('全校分散：下一關可能在校園任何地方。就近派發：一樣換區域，但挑附近的區域，大約少跑 3 成路。')}</label><select id="rRoute"><option value="spread" ${d.route !== 'near' ? 'selected' : ''}>🌏 全校分散</option><option value="near" ${d.route === 'near' ? 'selected' : ''}>👣 就近派發</option></select></div>
        <div class="scoreOnly"><label class="f">任務牆同時幾張照片${tip('學生手機上同時亮出幾張照片（分在不同區域），找到或放棄就補一張新的。')}</label><select id="rWall">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${+d.wall === n ? 'selected' : ''}>${n} 張</option>`).join('')}</select></div>
        <div class="scoreOnly"><label class="f">每張照片的候選地點</label><select id="rWallCands">${[3, 4, 5].map((n) => `<option value="${n}" ${+d.wallCands === n ? 'selected' : ''}>${n} 個</option>`).join('')}</select></div>
        ${num('rLimit', '時間限制（分鐘）', d.limitMin, 0, 180, '闖關競速填 0＝不限時；積分賽一定要有時間。')}
      </div>
      <label class="f">使用的區域</label>
      <div class="row small" id="rZones">${b.zones.map((z) => `<label class="chk"><input type="checkbox" value="${z.id}" ${!d.zones.length || d.zones.includes(z.id) ? 'checked' : ''}> <span style="color:${z.color}">●</span>${esc(z.name)}</label>`).join('')}</div>
      <h4 class="scoreOnly">🎯 積分規則</h4>
      <div class="grid2 scoreOnly">
        ${num('rPtsWrong', '答錯扣幾分', d.ptsWrong, 0, 50)}
        ${num('rHintPct', '💡 每層提示扣這張的 %', d.hintPct, 0, 100)}
        ${num('rSkipCool', '⏭ 放棄後幾秒才能再放棄', d.skipCool, 0, 600)}
      </div>
      ${chk('rViewBonus', d.viewBonus !== false, '👁️ 視角越難分數越高', '特寫、仰俯斜角 ×1.5；超特寫、奇特視角 ×2。要先在題庫標視角。', 'scoreOnly')}
      ${chk('rCheckin', d.checkin, '🚩 時間到要回集合點報到', '老師在戰況頁按該組的「報到」；超過寬限時間，每分鐘扣分。也可以提早回來報到收工。', 'scoreOnly')}
      <div class="grid2 scoreOnly">${num('rGrace', '寬限幾分鐘不扣分', d.grace, 0, 15)}${num('rLatePts', '之後每分鐘扣幾分', d.latePts, 0, 50)}</div>
      <h4>🎁 加分挑戰（答對地點後跳出來問要不要挑戰）</h4>
      ${chk('rStance', d.stanceOn, `🦶 站位挑戰 <span class="small muted">（題庫有 ${nCam} 個點標了站位）</span>`, '在地圖上點出拍照的人站哪裡、鏡頭朝哪個方向。站位和方向都對＝全部獎勵；只有站位對＝一半。')}
      ${chk('rTask', d.taskOn, `🔍 現場觀察任務 <span class="small muted">（題庫有 ${nTask} 個點設了題目）</span>`, '有標準答案的由系統直接判（錯字算錯）；沒填標準答案的由老師判。')}
      <div class="grid2">
        ${num('rBonusSec', '每答對一題，減幾秒', d.bonusSec, 0, 300, '', 'raceOnly')}
        ${num('rStancePts', '站位挑戰全對加幾分', d.stancePts, 0, 50, '觀察任務的分數在題庫每個點設定。', 'scoreOnly')}
        ${num('rCamTol', '站位誤差容許（%）', d.camTol, 2, 20, '地圖寬度的幾 %。6 大約是教室 2～3 間的距離。')}
      </div>
      <h4>❌ 答錯、求助${'<span class="raceOnly">、PASS</span>'}</h4>
      <div class="grid2">
        ${num('rCool', '答錯後等幾秒才能再答', d.cool, 0, 300)}
        ${num('rWrongPen', '答錯罰幾秒', d.wrongPenalty, 0, 600, '', 'raceOnly')}
        ${num('rHintCost', '💡 每層提示罰幾秒', d.hintCost, 0, 600, '', 'raceOnly')}
        ${num('rPassLimit', '🙋 每組 PASS 上限', d.passLimit, 0, 10, '', 'raceOnly')}
        ${num('rPassUnlock', '卡關幾分鐘後可申請 PASS', d.passUnlock, 0, 30, '', 'raceOnly')}
      </div>
      ${chk('rHintOn', d.hintOn, '開放 💡 求助')}
      ${chk('rViewProg', d.viewProg, '👁️ 視角循序漸進', '前面先派遠景、平視，後面才派特寫與奇特視角。要先在題庫標視角。', 'raceOnly')}
    </div></details>
    <div id="rWarn"></div>
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-x>取消</button><button class="btn primary" id="rGo">${edit ? '儲存設定' : '建立活動'}</button></div>`, { sticky: true });
  const v = (id) => $('#' + id, m.el);
  v('rMode').value = d.mode === 'score' ? 'score' : 'race';
  const modeNow = () => v('rMode').value;
  const showMode = () => {
    const sc = modeNow() === 'score';
    $$('.raceOnly', m.el).forEach((e) => { e.style.display = sc ? 'none' : ''; }); $$('.scoreOnly', m.el).forEach((e) => { e.style.display = sc ? '' : 'none'; });
    $$('[data-mode]', m.el).forEach((bt) => bt.classList.toggle('on', bt.dataset.mode === modeNow()));
  };
  const applyPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (modeNow() === 'score') { v('rLimit').value = p.sc.limitMin; v('rWall').value = p.sc.wall; }
    else { const x = p.v; v('rLimit').value = x.limitMin; v('rTarget').value = x.target; v('rCands').value = x.pc; v('rRoute').value = x.route; v('rPassUnlock').value = x.passUnlock; }
  };
  $$('[data-mode]', m.el).forEach((bt) => { bt.onclick = () => { v('rMode').value = bt.dataset.mode; const on = $('#rSeg .on', m.el); if (on) applyPreset(on.dataset.preset); else if (bt.dataset.mode === 'score' && !+v('rLimit').value) applyPreset('half'); check(); }; });
  $$('[data-preset]', m.el).forEach((bt) => { bt.onclick = () => { applyPreset(bt.dataset.preset); check(); }; });
  const drawNames = () => { const el = $('#rNames', m.el); if (!el) return; const n = Math.max(1, Math.min(60, +v('rN').value || 1)); if (names.length !== n) names = G.teamNames(n); el.innerHTML = names.map((x) => `<span>${esc(x)}</span>`).join(''); };
  if (v('rReroll')) v('rReroll').onclick = () => { names = []; drawNames(); };
  $('[data-x]', m.el).onclick = m.close;
  const read = () => {
    const zones = $$('#rZones input', m.el).filter((i) => i.checked).map((i) => i.value);
    return {
      mode: modeNow(), target: +v('rTarget').value || 13, photos: +v('rCands').value.split('-')[0] || 2, cands: +v('rCands').value.split('-')[1] || 7, route: v('rRoute').value, limitMin: Math.max(0, +v('rLimit').value || 0),
      teaching: v('rTeach').checked, zones: zones.length === b.zones.length ? [] : zones,
      cool: +v('rCool').value || 0, wrongPenalty: +v('rWrongPen').value || 0, hintOn: v('rHintOn').checked, hintCost: +v('rHintCost').value || 0,
      passLimit: +v('rPassLimit').value || 0, passUnlock: +v('rPassUnlock').value || 0, viewProg: v('rViewProg').checked,
      wall: +v('rWall').value || 4, wallCands: +v('rWallCands').value || 4, skipCool: Math.max(0, +v('rSkipCool').value || 0), ptsWrong: Math.max(0, +v('rPtsWrong').value || 0),
      hintPct: Math.max(0, Math.min(100, +v('rHintPct').value || 0)), viewBonus: v('rViewBonus').checked, checkin: v('rCheckin').checked, grace: Math.max(0, +v('rGrace').value || 0), latePts: Math.max(0, +v('rLatePts').value || 0),
      stanceOn: v('rStance').checked, taskOn: v('rTask').checked, bonusSec: Math.max(0, +v('rBonusSec').value || 0), stancePts: Math.max(0, +v('rStancePts').value || 0), camTol: Math.max(2, +v('rCamTol').value || 6)
    };
  };
  const check = () => {
    showMode(); drawNames();
    const set = read(), n = edit ? Object.keys(R.st.teams).length : +v('rN').value || 0;
    // 時間按鈕：目前設定剛好是哪個建議值就亮哪個
    $$('#rSeg [data-preset]', m.el).forEach((bt) => { const p = PRESETS.find((x) => x.id === bt.dataset.preset), x = set.mode === 'score' ? p.sc : p.v; bt.classList.toggle('on', set.limitMin === x.limitMin && (set.mode === 'score' ? set.wall === x.wall : set.target === x.target)); });
    const pool = TT.pts().filter((p) => p.enabled && p.photos.length && (!set.zones.length || set.zones.includes(p.zone)) && !(set.teaching && p.teach));
    const cap = b.zones.filter((z) => !set.zones.length || set.zones.includes(z.id)).reduce((s, z) => s + z.cap, 0);
    const bonus = [set.stanceOn && nCam ? '🦶 站位' : '', set.taskOn && nTask ? '🔍 觀察' : ''].filter(Boolean).join('、');
    $('#rSum', m.el).innerHTML = '📋 ' + (set.mode === 'score'
      ? `<b>${set.limitMin || '？'} 分鐘</b>限時搶分・任務牆 ${set.wall} 張照片（各 ${set.wallCands} 個候選）・答錯扣 ${set.ptsWrong} 分・${set.checkin ? `🚩 時間到回集合點報到（寬限 ${set.grace} 分）` : '不用回集合點報到'}`
      : `每組找 <b>${set.target} 個地點</b>・每關 ${set.photos} 張照片／${set.cands} 個候選・${set.route === 'near' ? '👣 就近派發' : '🌏 全校分散'}・${set.limitMin ? `${set.limitMin} 分鐘` : '不限時'}・答錯罰 ${set.wrongPenalty} 秒`)
      + `・🎁 加分挑戰：${bonus || '無（題庫還沒設定站位或觀察任務）'}<br><span class="muted">可用點位 ${pool.length} 個${set.zones.length ? `（${set.zones.length} 個區域）` : ''}。要改細節請打開下面的「⚙️ 自訂進階設定」。</span>`;
    const w = [];
    if (set.mode === 'score') {
      if (pool.length < set.wall + 3) w.push(`可用點位只有 ${pool.length} 個，任務牆至少要 ${set.wall + 3} 個點才補得了卡，請多選區域。`);
      if (!set.limitMin) w.push('積分賽要設定時間：按上面的時間按鈕。');
    } else if (pool.length < set.target) w.push(`可用點位只有 ${pool.length} 個，少於每組要找的 ${set.target} 個，請減少數量或多選區域。`);
    const nz = b.zones.filter((z) => !set.zones.length || set.zones.includes(z.id)).length || 1;
    if (n > cap) w.push(`ℹ️ ${n} 組比區域容量（合計 ${cap} 組）多，系統會平均分散，每區大約同時 ${Math.ceil(n / nz)} 組。`);
    $('#rWarn', m.el).innerHTML = w.map((x) => `<div class="alert ${x.startsWith('ℹ️') ? 'blue' : 'red'} small">${x}</div>`).join('');
    return !w.some((x) => !x.startsWith('ℹ️'));
  };
  m.el.addEventListener('change', check); m.el.addEventListener('input', (e) => { if (e.target.id === 'rN') check(); }); check();
  $('#rGo', m.el).onclick = async () => {
    if (!check()) return toast('設定還有問題，請看紅色提醒', true);
    if (edit) {
      const set = read(), title = $('#rTitle', m.el).value.trim() || R.meta.title;
      LS.set('gps_runset', set);
      await enqueue((ctx) => { if (R.meta.status !== 'ready') return; R.meta.settings = { ...R.meta.settings, ...set }; R.meta.mode = set.mode; R.meta.title = title; ctx.up['meta/title'] = title; ctx.up['meta/mode'] = set.mode; ctx.up['pub/title'] = title; ctx.all = true; });
      FB.update(`orienteering/myruns/${S.user.uid}/${R.code}`, { title }).catch(() => {});
      m.close(); toast('✅ 設定已更新'); R.lastDash = null; drawDash(); return;
    }
    const set = read(), n = Math.max(1, Math.min(60, +v('rN').value || 10));
    drawNames();
    LS.set('gps_runset', set); LS.set('gps_teams', n);
    $('#rGo', m.el).disabled = true;
    try { const code = await createRun($('#rTitle', m.el).value.trim() || '校園定向', set, n, names.slice()); m.close(); await openRun(code); }
    catch (e) { $('#rGo', m.el).disabled = false; toast('建立失敗：' + (e.code || e.message), true); }
  };
}

async function createRun(title, set, n, names) {
  const b = bank();
  let code = G.makeCode(6);
  for (let i = 0; i < 5 && await FB.get(`orienteering/runs/${code}/meta`); i++) code = G.makeCode(6);
  const centers = G.zoneCenters(b);
  const ys = Object.values(b.points).map((p) => p.y);
  const pub = {
    title, map: b.map, noGo: b.noGo,
    zones: b.zones.map((z) => ({ id: z.id, name: z.name, color: z.color, x: centers[z.id] ? +centers[z.id].x.toFixed(2) : null, y: centers[z.id] ? +centers[z.id].y.toFixed(2) : null })),
    crop: { top: Math.max(0, Math.min(12.5, Math.min(...ys) - 9)), bot: Math.min(100, Math.max(88, Math.max(...ys) + 4)) }
  };
  const teams = {}, keys = {}, state = { teams: {}, clock: {}, events: [], badges: [] };
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const tid = 'tm' + G.rid(4);
    let pass = G.makeCode(4); while (used.has(pass)) pass = G.makeCode(4); used.add(pass);
    const h = await G.sha(code + '|' + pass);
    const name = names[i] || `第 ${i + 1} 組`;
    keys[h] = tid;
    state.teams[tid] = { name, pass, order: i, done: [], passed: [], skipped: [], cards: {}, chal: {}, zone: '', wrong: 0, hints: 0, passes: 0, skips: 0, penalty: 0, pts: 0, bon: 0, finished: false, finishSec: 0, batchNo: 0 };
  }
  const meta = { owner: S.user.uid, bankId: S.bankId, title, mode: set.mode, status: 'ready', createdAt: Date.now(), settings: set };
  R.code = code; R.meta = meta; R.st = state;
  Object.keys(state.teams).forEach((tid) => { teams[tid] = { view: viewFor(tid) }; });
  await FB.set('orienteering/runs/' + code, { meta, pub, keys, teams, state: packState(state), board: boardFor() });
  await FB.set(`orienteering/myruns/${S.user.uid}/${code}`, { title, bankId: S.bankId, createdAt: meta.createdAt, status: 'ready' });
  return code;
}

// ---------- 開啟活動＝啟動自動裁判 ----------
async function openRun(code) {
  stopReferee();
  $('#panel').innerHTML = '<p class="muted">開啟活動中…</p>';
  try {
    const all = await FB.get('orienteering/runs/' + code);
    if (!all || !all.meta) { toast('找不到這個活動', true); R.code = null; LS.set('gps_live', ''); return renderLiveTab(); }
    if (all.meta.bankId && all.meta.bankId !== S.bankId && S.banks[all.meta.bankId]) { toast('切換到這個活動用的題庫…'); await TT.openBankSilently(all.meta.bankId); }
    R.code = code; R.meta = all.meta; R.meta.settings = { ...G.DEFAULT_RUN, ...(all.meta.settings && !all.meta.settings.photos ? { photos: 1, cands: all.meta.settings.cands || 5 } : {}), ...(all.meta.settings || {}) };
    R.st = unpackState(all.state || {});
    R.members = {}; Object.entries(all.teams || {}).forEach(([tid, t]) => { R.members[tid] = mergeMembers(t.members); });
    LS.set('gps_live', code);
    await startReferee(all);
    drawDash();
  } catch (e) { toast('開啟失敗：' + (e.code || e.message), true); R.code = null; renderLiveTab(); }
}
// 每支手機各自登記座號，合併成一串（去掉重複、依數字排序）
function mergeMembers(v) {
  const all = Object.values(v || {}).flatMap((x) => String((x && x.list) || '').split(/[\s,，、]+/)).filter(Boolean);
  return Array.from(new Set(all)).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)).join(' ');
}
function unpackState(s) {
  const st = { teams: {}, clock: s.clock || {}, events: s.events || [], badges: s.badges || [] };
  Object.entries(s.teams || {}).forEach(([tid, t]) => {
    st.teams[tid] = { ...t, done: t.done || [], passed: t.passed || [], skipped: t.skipped || [], cards: t.cards || {}, chal: t.chal || {}, wrong: t.wrong || 0, hints: t.hints || 0, passes: t.passes || 0, skips: t.skips || 0, penalty: t.penalty || 0, pts: t.pts || 0, bon: t.bon || 0, batchNo: t.batchNo || 0 };
  });
  return st;
}
const packState = (st) => JSON.parse(JSON.stringify(st));

async function startReferee() {
  R.active = true; R.lost = false;
  const bp = base();
  // 先把「我是裁判」寫進去，再開始監聽，才不會誤以為被別台接手
  try { await FB.set(bp + '/host', { id: R.hostId, beat: Date.now() }); } catch (e) { }
  R.unsubs.push(FB.listen(bp + '/host', (v) => {
    if (v && v.id && v.id !== R.hostId && R.active) { R.active = false; R.lost = true; toast('另一台裝置接手了自動裁判，這一頁改成只看不判', true); drawDash(); }
  }));
  Object.keys(R.st.teams).forEach((tid) => {
    R.unsubs.push(FB.onChild(`${bp}/teams/${tid}/subs`, (k, v) => enqueue((ctx) => onSub(ctx, tid, k, v))));
    R.unsubs.push(FB.onChild(`${bp}/teams/${tid}/reqs`, (k, v) => enqueue((ctx) => onReq(ctx, tid, k, v))));
    R.unsubs.push(FB.listen(`${bp}/teams/${tid}/members`, (v) => { R.members[tid] = mergeMembers(v); redraw(); }));
    // 學生改隊名（規則限制只能寫一次）
    R.unsubs.push(FB.listen(`${bp}/teams/${tid}/rename`, (v) => { if (v && v.name) enqueue((ctx) => onRename(ctx, tid, v.name)); }));
  });
  let n = 0;
  R.tick = setInterval(() => {
    n++;
    if (!R.active) return;
    const st = R.st, set = R.meta.settings;
    if (R.meta.status === 'running' && set.limitMin && G.gameSeconds(st.clock, Date.now()) >= set.limitMin * 60) { endRun(isScore() && set.checkin ? '⏰ 時間到！請回集合點報到' : '⏰ 時間到！'); return; }
    if (isScore() && R.meta.status === 'running' && n % 15 === 0) enqueue(() => {}); // 分值會隨時間變（位置 6 分鐘後失效），定時檢查
    if (n % 10 === 0) { // 心跳：學生端用來確認「大師在線」
      const now = Date.now(), up = { host: { id: R.hostId, beat: now } };
      Object.keys(st.teams).forEach((tid) => { up[`teams/${tid}/view/beat`] = now; });
      FB.update(bp, up).catch(() => {});
    }
    updateClock();
  }, 1000);
  wakeOn();
}
export function stopReferee() {
  R.unsubs.forEach((u) => { try { u(); } catch (e) { } }); R.unsubs = [];
  clearInterval(R.tick); R.tick = null; R.active = false; R.lastDash = null;
  if (R.proj) closeProj();
}
/* 裁判佇列（2026-10-12 為 50 組改成「整批處理」）：
   學生的答案、求助、老師的按鈕都先排進佇列；裁判一次把排隊中的全部在記憶體判完，
   再「一次」寫回雲端。50 組同時送答案也只要寫一兩次，不會一個一個排隊等。 */
const Q = { list: [], busy: false, waiters: [] };
function enqueue(fn) {
  return new Promise((res) => { Q.list.push(fn); Q.waiters.push(res); pump(); });
}
async function pump() {
  if (Q.busy) return; Q.busy = true;
  try {
    while (Q.list.length) {
      const batch = Q.list.splice(0, 300), done = Q.waiters.splice(0, 300);
      const ctx = { up: {}, tids: new Set(), all: false };
      batch.forEach((fn) => { try { fn(ctx); } catch (e) { console.error(e); } });
      await flush(ctx);
      done.forEach((r) => r());
    }
  } catch (e) { console.error(e); toast('裁判處理失敗：' + (e.code || e.message), true); }
  finally { Q.busy = false; }
}

// ---------- 判題 ----------
const P = (key) => bank().points[key];
const isScore = () => R.meta && R.meta.mode === 'score';
const openCards = (t) => Object.entries(t.cards || {}).filter(([, c]) => c.state === 'open');
function logEntry(tid, kind, extra) { return { t: Date.now(), tid, kind, ...extra }; }
const addLog = (ctx, entry) => { ctx.up[`log/${FB.pushKey(base() + '/log')}`] = entry; };
// 積分賽：各區現在有幾組（用「最近答對的區域」推算，不算自己）＋平均每區幾組
function heatCtx(tid, now) {
  const set = R.meta.settings, crowd = G.crowdByLoc(R.st.teams, now, tid);
  return { crowd, avg: G.crowdAvg(crowd, (set.zones && set.zones.length) || bank().zones.length), zm: G.zoneById(bank()) };
}
const heatOf = (h, p) => G.heatLevel(h.crowd[p.zone] || 0, (h.zm[p.zone] || {}).cap, h.avg);
const valWith = (h, p, hint) => G.cardValue(p, R.meta.settings, h.crowd[p.zone] || 0, (h.zm[p.zone] || {}).cap, hint || 0, h.avg);
// 積分賽：這一組現在看到的這張卡值幾分
function valueOf(tid, c, now) { return valWith(heatCtx(tid, now), P(c.key), c.hint); }
function onSub(ctx, tid, sid, sub) {
  if (!R.active) return;
  const up = ctx.up; up[`teams/${tid}/subs/${sid}`] = null;
  const t = R.st.teams[tid], card = t && t.cards[sub.cid], now = Date.now(), set = R.meta.settings;
  let log;
  if (R.meta.status !== 'running' || !card || card.state !== 'open' || t.finished) log = logEntry(tid, 'ignore', { ans: sub.ans });
  else if (card.coolUntil && now < card.coolUntil) log = logEntry(tid, 'cool', { ans: sub.ans, no: P(card.key).no });
  else {
    const p = P(card.key), ok = p && p.accept.includes(+sub.ans);
    if (ok) {
      const val = isScore() ? valueOf(tid, card, now) : 0;
      card.state = 'ok'; card.okAt = now; t.done.push(card.key); t.lastOk = now; t.loc = { z: p.zone, at: now };
      const sec = G.gameSeconds(R.st.clock, now), dur = Math.round((now - card.at) / 1000);
      if (!R.st.badges.some((b) => b.startsWith('⚡'))) R.st.badges.push(`⚡ 首破：${t.name}`);
      log = logEntry(tid, 'ok', { ans: +sub.ans, no: p.no, sec, dur, by: sub.by || '' });
      addChal(t, card.key, now);
      if (isScore()) {
        card.got = val; t.pts += val; log.pts = val;
        event(`🎯 ${t.name} 找到第 ${p.no} 號，拿到 ${val} 分`);
        fillWall(tid, now);
      } else {
        event(`🎉 ${t.name} 找到第 ${t.done.length} 個地點`);
        if (t.done.length >= set.target) finishTeam(tid, now);
        else if (!openCards(t).length) dispatch(tid, now);
      }
    } else {
      card.coolUntil = now + set.cool * 1000; card.wrong = (card.wrong || 0) + 1;
      card.tried = Array.from(new Set([...(card.tried || []), +sub.ans]));
      t.wrong++;
      if (isScore()) t.pts = Math.max(0, t.pts - (set.ptsWrong || 0)); else t.penalty += set.wrongPenalty;
      log = logEntry(tid, 'wrong', { ans: +sub.ans, no: p ? p.no : 0, by: sub.by || '' });
    }
  }
  addLog(ctx, log);
  ctx.tids.add(tid);
}
function onReq(ctx, tid, rid, req) {
  if (!R.active) return;
  const up = ctx.up; up[`teams/${tid}/reqs/${rid}`] = null;
  if (req.type === 'cam' || req.type === 'task' || req.type === 'cskip') return onChal(ctx, tid, req);
  const t = R.st.teams[tid], card = t && t.cards[req.cid], set = R.meta.settings, now = Date.now();
  if (R.meta.status !== 'running' || !card || card.state !== 'open' || t.finished) return;
  const p = P(card.key);
  if (req.type === 'hint' && set.hintOn && (card.hint || 0) < 2) {
    card.hint = (card.hint || 0) + 1; t.hints++;
    if (!isScore()) t.penalty += set.hintCost;
    addLog(ctx, logEntry(tid, 'hint', { no: p.no, level: card.hint }));
  } else if (req.type === 'pass' && !isScore() && card.pass !== 'pending' && t.passes < set.passLimit && now - card.at >= set.passUnlock * 60000 - 5000) {
    card.pass = 'pending'; card.passAt = now; card.passNote = String(req.note || '').slice(0, 60);
    addLog(ctx, logEntry(tid, 'passReq', { no: p.no, note: card.passNote }));
    beep();
  } else if (req.type === 'skip' && isScore() && now >= (t.skipUntil || 0) - 2000) {
    // ⏭ 放棄：換一張新的，這組要隔一段時間才能再放棄
    card.state = 'gone'; t.skipped.push(card.key); t.skips++; t.skipUntil = now + (set.skipCool || 0) * 1000;
    addLog(ctx, logEntry(tid, 'giveup', { no: p.no }));
    fillWall(tid, now);
  } else return;
  ctx.tids.add(tid);
}

// ---------- ✏️ 改隊名 ----------
function onRename(ctx, tid, raw) {
  const t = R.st.teams[tid]; if (!t || t.renamed) return;
  const n = G.cleanName(raw); if (!n) return;
  event(`✏️ ${t.name} 改名為「${n}」`);
  t.name = n; t.renamed = true;
  addLog(ctx, logEntry(tid, 'rename', { text: n }));
  ctx.tids.add(tid);
}
function teacherRename(tid) {
  const t = R.st.teams[tid];
  const m = modal(`<h2>✏️ 改隊名</h2><input type="text" id="tnName" maxlength="10" value="${esc(t.name)}"><p class="small muted" style="margin-top:6px">最多 10 個字。${t.renamed ? '學生已經用掉自己改名的機會。' : '學生還有一次自己改名的機會。'}</p>
    <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn ghost" data-x>取消</button><button class="btn primary" data-ok>儲存</button></div>`);
  $('[data-x]', m.el).onclick = m.close;
  $('[data-ok]', m.el).onclick = () => { const n = G.cleanName($('#tnName', m.el).value); if (!n) return toast('隊名不能空白', true); m.close(); enqueue((ctx) => { t.name = n; ctx.tids.add(tid); }); };
}

// ---------- 🎁 加分挑戰（答對地點後才出現） ----------
function addChal(t, key, now) {
  const p = P(key), set = R.meta.settings;
  if (set.stanceOn && p.cam) t.chal[G.rid(3)] = { kind: 'cam', key, state: 'open', at: now };
  if (set.taskOn && p.task) t.chal[G.rid(3)] = { kind: 'task', key, state: 'open', at: now };
  // 已經作答過的只留最近 4 筆（學生畫面看結果用），其餘移掉，資料才不會越長越大
  const doneOnes = Object.entries(t.chal).filter(([, c]) => !['open', 'judge'].includes(c.state)).sort((a, b) => (b[1].doneAt || 0) - (a[1].doneAt || 0));
  doneOnes.slice(4).forEach(([id]) => delete t.chal[id]);
}
// 加分：闖關競速＝減秒、積分賽＝加分
function award(t, c, amount) { const v = Math.round(amount); c.pts = v; t.bon = (t.bon || 0) + v; }
function onChal(ctx, tid, req) {
  const t = R.st.teams[tid], c = t && t.chal[req.cid], set = R.meta.settings, now = Date.now();
  if (R.meta.status !== 'running' || !c || c.state !== 'open') return;
  const p = P(c.key); if (!p) return;
  if (req.type === 'cskip') { // 學生按「略過」：這個挑戰就消失（老師決定：略過不能回頭）
    c.state = 'skipped'; c.doneAt = now;
    addLog(ctx, logEntry(tid, 'chalSkip', { no: p.no, kind: c.kind }));
  } else if (c.kind === 'cam' && req.type === 'cam' && p.cam) {
    const ans = { x: Math.max(0, Math.min(100, +req.x || 0)), y: Math.max(0, Math.min(100, +req.y || 0)), dir: (((+req.dir | 0) % 8) + 8) % 8 };
    const j = G.judgeCam(bank(), p.cam, ans, set.camTol);
    c.ans = ans; c.got = j.got; c.d = j.d; c.state = j.got === 1 ? 'ok' : j.got ? 'half' : 'no'; c.doneAt = now;
    if (j.got) award(t, c, j.got * (isScore() ? set.stancePts : set.bonusSec));
    if (j.got === 1) event(`🦶 ${t.name} 站位挑戰全對！`);
    addLog(ctx, logEntry(tid, 'cam', { no: p.no, got: j.got, d: j.d, dd: j.dd }));
  } else if (c.kind === 'task' && req.type === 'task' && p.task) {
    c.text = String(req.text || '').slice(0, 60); c.doneAt = now;
    if (p.task.open) { c.state = 'judge'; beep(); }
    else { const ok = G.judgeTask(p.task, c.text); c.state = ok ? 'ok' : 'no'; if (ok) award(t, c, isScore() ? p.task.bonus : set.bonusSec); }
    addLog(ctx, logEntry(tid, 'task', { no: p.no, text: c.text, ok: c.state === 'ok' ? 1 : c.state === 'judge' ? -1 : 0 }));
  } else return;
  ctx.tids.add(tid);
  maybeAutoEnd();
}
const pendingJudges = () => Object.entries(R.st.teams).flatMap(([tid, t]) => Object.entries(t.chal || {}).filter(([, c]) => c.state === 'judge').map(([bid, c]) => ({ tid, bid, t, c })));
function judgeOpen(ctx, tid, bid, ok) {
  const t = R.st.teams[tid], c = t && t.chal[bid]; if (!c || c.state !== 'judge') return;
  const p = P(c.key), set = R.meta.settings;
  c.state = ok ? 'ok' : 'no'; c.doneAt = Date.now();
  if (ok) award(t, c, isScore() ? p.task.bonus : set.bonusSec);
  addLog(ctx, logEntry(tid, 'taskJudge', { no: p.no, text: c.text, ok: ok ? 1 : 0 }));
  ctx.tids.add(tid);
}

// 派下一關：1～2 張照片＋共用的候選地點；上一關答對的卡留著給學生看揭曉
function dispatch(tid, now, avoid) {
  const t = R.st.teams[tid], set = R.meta.settings;
  const prevRound = t.batchNo || 0;
  Object.keys(t.cards).forEach((c) => { const x = t.cards[c]; if (x.state === 'open') return; if (x.state === 'ok' && (x.round || 0) === prevRound) x.prev = true; else delete t.cards[c]; });
  const size = Math.min(set.photos || 1, set.target - t.done.length);
  const pick = G.chooseNext(bank(), { settings: set, teams: R.st.teams }, tid, { size, avoid });
  if (!pick) { t.empty = true; event(`⚠ ${t.name} 已經沒有可派的題目`); return; }
  t.batchNo = prevRound + 1;
  pick.keys.forEach((k) => { t.cards[G.rid(3)] = { key: k, cands: pick.cands, round: t.batchNo, state: 'open', at: now, hint: 0, wrong: 0, tried: [] }; });
  const zs = pick.keys.map((k) => P(k).zone);
  t.zone = zs[0]; t.recent = [...zs, ...(t.recent || []).filter((x) => !zs.includes(x))].slice(0, 4);
  t.msg = `第 ${t.batchNo} 關`;
}
// 🎯 積分賽：把任務牆補滿（每張 1 張照片＋自己的候選地點，牆上的照片分散在不同區域、優先冷門區）
function fillWall(tid, now, avoid) {
  const t = R.st.teams[tid], set = R.meta.settings;
  Object.keys(t.cards).forEach((c) => { if (t.cards[c].state === 'gone') delete t.cards[c]; });
  Object.entries(t.cards).filter(([, c]) => c.state === 'ok').sort((a, b) => b[1].okAt - a[1].okAt).slice(3).forEach(([c]) => delete t.cards[c]);
  const busy = G.crowdByLoc(R.st.teams, now, tid);
  let open = openCards(t), guard = 0;
  while (open.length < (set.wall || 4) && guard++ < 12) {
    const exclude = new Set(open.map(([, c]) => c.key)), wallZones = open.map(([, c]) => (P(c.key) || {}).zone);
    const pick = G.chooseNext(bank(), { settings: { ...set, photos: 1 }, teams: R.st.teams }, tid, { size: 1, exclude, wallZones, busy, K: set.wallCands || 4, avoid });
    if (!pick) { if (!open.length) { t.empty = true; event(`⚠ ${t.name} 已經沒有可派的題目`); } break; }
    t.cards[G.rid(3)] = { key: pick.keys[0], cands: pick.cands, round: 0, state: 'open', at: now, hint: 0, wrong: 0, tried: [] };
    open = openCards(t);
  }
  t.zone = open.length ? (P(open[0][1].key) || {}).zone : '';
  t.batchNo = (t.batchNo || 0) + 1; // 學生端用來知道「牆換過了」
}
function finishTeam(tid, now) {
  const t = R.st.teams[tid];
  t.finished = true; t.finishSec = G.gameSeconds(R.st.clock, now);
  Object.values(t.cards).forEach((c) => { if (c.state === 'open') c.state = 'gone'; });
  const n = Object.values(R.st.teams).filter((x) => x.finished).length;
  if (isScore()) event(`🚩 ${t.name} 回到集合點報到`);
  else { if (n === 1) R.st.badges.push(`🏆 最快完成：${t.name}`); event(`🏁 ${t.name} 完成！第 ${n} 個抵達`); }
  maybeAutoEnd();
}
// 全部組別都完成：還有加分挑戰沒做完就先等（不然最後一組永遠沒機會做），做完才自動結束
const openChals = () => Object.values(R.st.teams).reduce((n, t) => n + Object.values(t.chal || {}).filter((c) => c.state === 'open').length, 0);
function maybeAutoEnd() {
  if (R.meta.status !== 'running' || !Object.values(R.st.teams).every((x) => x.finished)) return;
  const why = isScore() ? '🚩 全部組別都報到了！' : '🏁 全部組別都完成了！';
  if (openChals()) { if (!R.waitChal) { R.waitChal = true; event(why + '還有加分挑戰沒做完，做完會自動結束（或按 ⏹ 結束）'); } return; }
  setTimeout(() => endRun(why), 50);
}
// 🚩 積分賽報到：進行中＝這組提早收工；時間到之後＝記下回來的時間，超過寬限就扣分
function checkIn(ctx, tid, undo) {
  const t = R.st.teams[tid], now = Date.now(); if (!t) return;
  if (undo) { if (R.meta.status !== 'ended') return; delete t.checkAt; event(`↩️ 取消 ${t.name} 的報到`); }
  else {
    if (t.checkAt) return;
    t.checkAt = now;
    if (R.meta.status === 'running' || R.meta.status === 'paused') finishTeam(tid, now);
    else { const late = G.lateMin(t, R.meta.settings, R.st.clock); event(`🚩 ${t.name} 報到${late ? `（遲到 ${late} 分鐘，扣 ${late * R.meta.settings.latePts} 分）` : ''}`); }
  }
  addLog(ctx, logEntry(tid, undo ? 'uncheck' : 'checkin', {}));
  ctx.tids.add(tid);
}
function event(text) { R.st.events.push(text); if (R.st.events.length > 15) R.st.events.splice(0, R.st.events.length - 15); }

// ---------- PASS／換題 ----------
const pendingPasses = () => Object.entries(R.st.teams).flatMap(([tid, t]) => Object.entries(t.cards).filter(([, c]) => c.state === 'open' && c.pass === 'pending').map(([cid, c]) => ({ tid, cid, t, c })));
function decidePass(ctx, tid, cid, ok, byTeacher) {
  const t = R.st.teams[tid], c = t.cards[cid], now = Date.now(); if (!c || c.state !== 'open') return;
  if (ok) {
    c.state = 'gone'; c.pass = 'ok'; t.passed.push(c.key);
    if (!byTeacher) t.passes++;
    event(byTeacher ? `🔄 大師幫 ${t.name} 換了一題` : `🙋 ${t.name} PASS 一題`);
    if (isScore()) fillWall(tid, now);
    else if (!openCards(t).length) dispatch(tid, now);
  } else { c.pass = 'no'; c.passNo = now; }
  addLog(ctx, logEntry(tid, ok ? (byTeacher ? 'skip' : 'passOK') : 'passNo', { no: P(c.key).no }));
  ctx.tids.add(tid);
}

// ---------- 寫回雲端 ----------
function chalView(t) {
  const out = {};
  Object.entries(t.chal || {}).forEach(([bid, c]) => {
    const p = P(c.key); if (!p || c.state === 'skipped') return;
    const done = c.state !== 'open';
    out[bid] = {
      kind: c.kind, state: c.state, at: c.at, no: p.no, name: p.name, photo: p.photos[0] || '', x: p.x, y: p.y, pts: c.pts || 0,
      ...(c.kind === 'cam' ? { ans: c.ans || null, cam: done && p.cam ? p.cam : null } : { q: p.task ? p.task.q : '', bonus: p.task ? p.task.bonus : 0, text: c.text || '', a: done && c.state !== 'judge' && p.task && !p.task.open ? p.task.a.split(/[\/|｜]/)[0].trim() : '', open: !!(p.task && p.task.open) })
    };
  });
  return out;
}
function viewFor(tid) {
  const t = R.st.teams[tid], set = R.meta.settings, b = bank(), now = Date.now(), score = isScore();
  const cards = {}, pins = [], round = t.batchNo || 0;
  const solved = new Set(Object.values(t.cards || {}).filter((c) => c.state === 'ok' && (c.round || 0) === round).map((c) => c.key));
  const h = score ? heatCtx(tid, now) : null, sig = [];
  Object.entries(t.cards || {}).forEach(([cid, c]) => {
    const p = b.points[c.key]; if (!p || c.state === 'gone') return;
    const v = {
      photo: p.photos[0], state: c.state, at: c.at, coolUntil: c.coolUntil || 0, wrong: c.wrong || 0, tried: c.tried || [], prev: !score && (c.round || 0) !== round,
      hint1: c.hint >= 1 ? p.hint1 || '（沒有提示）' : '', hint2: c.hint >= 2 ? p.hint2 || '（沒有提示）' : '',
      pass: c.pass || '', no: c.state === 'ok' ? p.no : 0, name: c.state === 'ok' ? p.name : '', reveal: c.state === 'ok' ? p.reveal || '' : ''
    };
    if (score) {
      if (c.state === 'open') {
        v.val = valWith(h, p, c.hint); v.heat = heatOf(h, p);
        v.cn = (c.cands || [c.key]).map((k) => (b.points[k] || {}).no).filter(Boolean).sort((x, y) => x - y);
        sig.push(cid + ':' + v.val);
        (c.cands || [c.key]).forEach((k) => { const q = b.points[k]; if (q && !pins.some((x) => x.no === q.no)) pins.push({ no: q.no, x: q.x, y: q.y }); });
      } else v.got = c.got || 0;
      v.okAt = c.okAt || 0;
    }
    cards[cid] = v;
    // 闖關競速：地圖只標「這一關的候選地點」（不告訴你答案在哪一區）；這關已找到的打勾
    if (!score && (c.round || 0) === round) (c.cands || [c.key]).forEach((k) => { const q = b.points[k]; if (q && !pins.some((x) => x.no === q.no)) pins.push({ no: q.no, x: q.x, y: q.y, ok: solved.has(k) }); });
  });
  pins.sort((a, b2) => a.no - b2.no);
  if (score) R.sig[tid] = sig.join(',');
  return {
    name: t.name, status: R.meta.status, mode: R.meta.mode, target: set.target, done: t.done.length,
    penalty: t.penalty, wrong: t.wrong, hints: t.hints, passes: t.passes, skips: t.skips || 0, finished: !!t.finished, finishSec: t.finishSec || 0,
    pts: t.pts || 0, bon: t.bon || 0, total: score ? G.teamTotal(t, set, R.st.clock) : 0, skipUntil: t.skipUntil || 0, checkAt: t.checkAt || 0,
    msg: score ? '' : t.msg || '', batchNo: t.batchNo, empty: !!t.empty, renamed: !!t.renamed,
    pins, cards, chal: chalView(t), clock: R.st.clock, beat: now,
    set: {
      photos: set.photos || 1, cands: set.cands || 5, cool: set.cool, hintOn: set.hintOn, hintCost: set.hintCost, passLimit: score ? 0 : set.passLimit, passUnlock: set.passUnlock, wrongPenalty: set.wrongPenalty, limitMin: set.limitMin,
      wall: set.wall, skipCool: set.skipCool, ptsWrong: set.ptsWrong, hintPct: set.hintPct, viewBonus: set.viewBonus !== false, checkin: !!set.checkin, grace: set.grace, latePts: set.latePts,
      stanceOn: !!set.stanceOn, taskOn: !!set.taskOn, bonusSec: set.bonusSec, stancePts: set.stancePts
    }
  };
}
// 積分賽：分值有沒有變（別組移動了）→ 只更新分值真的變了的組，不必 50 組全部重寫
function scoreSig(tid) {
  const t = R.st.teams[tid], h = heatCtx(tid, Date.now());
  return openCards(t).map(([cid, c]) => cid + ':' + valWith(h, P(c.key), c.hint)).join(',');
}
function boardFor() {
  const teams = {}, set = R.meta.settings, score = isScore();
  let heat = {};
  Object.entries(R.st.teams).forEach(([tid, t]) => {
    teams[tid] = score ? { name: t.name, done: t.done.length, total: G.teamTotal(t, set, R.st.clock), finished: !!t.checkAt, lastOk: t.lastOk || 0 }
      : { name: t.name, done: t.done.length, finished: !!t.finished, finishSec: t.finishSec || 0, penalty: t.penalty, bon: t.bon || 0 };
    if (!score && !t.finished) { const zs = new Set(openCards(t).map(([, c]) => (P(c.key) || {}).zone)); zs.forEach((z) => { if (z) heat[z] = (heat[z] || 0) + 1; }); }
  });
  if (score) heat = G.crowdByLoc(R.st.teams, Date.now(), null);
  return { title: R.meta.title, mode: R.meta.mode, status: R.meta.status, clock: R.st.clock, limitMin: set.limitMin, target: set.target, teams, heat, events: R.st.events, badges: R.st.badges };
}
async function flush(ctx) {
  const up = ctx.up, tids = ctx.all ? Object.keys(R.st.teams) : [...ctx.tids];
  let boardNeed = tids.length > 0;
  if (isScore() && R.meta.status === 'running') {
    Object.keys(R.st.teams).forEach((tid) => { if (!tids.includes(tid) && !R.st.teams[tid].finished && scoreSig(tid) !== R.sig[tid]) tids.push(tid); });
    const hs = JSON.stringify(G.crowdByLoc(R.st.teams, Date.now(), null));
    if (hs !== R.heatSig) { R.heatSig = hs; boardNeed = true; }
  }
  if (ctx.all) Object.assign(up, { 'meta/status': R.meta.status, 'meta/settings': R.meta.settings, 'state/clock': R.st.clock });
  tids.forEach((tid) => { up[`teams/${tid}/view`] = viewFor(tid); up[`state/teams/${tid}`] = packState(R.st.teams[tid]); });
  if (boardNeed) { up['state/events'] = R.st.events; up['state/badges'] = R.st.badges; up.board = boardFor(); }
  if (!Object.keys(up).length) return;
  try { await FB.update(base(), up); } catch (e) { toast('寫入雲端失敗：' + (e.code || e.message), true); }
  if (ctx.all) FB.update(`orienteering/myruns/${S.user.uid}/${R.code}`, { status: R.meta.status }).catch(() => {});
  redraw();
}

// ---------- 開始、暫停、結束 ----------
async function startRun() {
  if (!R.active) return toast('這一頁不是裁判（另一台裝置接手了）', true);
  await enqueue((ctx) => startNow(ctx));
  toast('▶ 開始！系統已自動派出第一關');
}
function startNow(ctx) {
  if (R.meta.status !== 'ready') return;
  const now = Date.now();
  R.meta.status = 'running'; R.st.clock = { startAt: now };
  const order = G.shuffle(Object.keys(R.st.teams), Math.random);
  const starts = [];
  order.forEach((tid) => {
    const t = R.st.teams[tid];
    t.cards = {}; t.recent = []; t.batchNo = 0;
    if (isScore()) fillWall(tid, now, starts); else dispatch(tid, now, starts);
    if (t.zone) starts.push(t.zone);
  });
  event('🚩 活動開始！');
  ctx.all = true;
}
function pauseRun() { return enqueue((ctx) => pauseNow(ctx)); }
function pauseNow(ctx) {
  const now = Date.now();
  if (R.meta.status === 'running') { R.meta.status = 'paused'; R.st.clock.pausedAt = now; event('⏸ 暫停'); }
  else if (R.meta.status === 'paused') {
    const d = now - (R.st.clock.pausedAt || now);
    R.st.clock.pausedTotal = (R.st.clock.pausedTotal || 0) + d; delete R.st.clock.pausedAt;
    Object.values(R.st.teams).forEach((t) => {
      Object.values(t.cards).forEach((c) => { if (c.state === 'open') { c.at += d; if (c.coolUntil) c.coolUntil += d; } });
      if (t.skipUntil) t.skipUntil += d; if (t.loc) t.loc.at += d;
    });
    R.meta.status = 'running'; event('▶ 繼續');
  }
  ctx.all = true;
}
async function endRun(why) {
  if (R.meta.status === 'ended' || R.ending) return;
  R.ending = true;
  await enqueue((ctx) => endNow(ctx, why));
  R.ending = false;
  toast(why || '🏁 活動結束');
}
function endNow(ctx, why) {
  if (R.meta.status === 'ended') return;
  const now = Date.now();
  if (R.st.clock.pausedAt) { R.st.clock.pausedTotal = (R.st.clock.pausedTotal || 0) + now - R.st.clock.pausedAt; delete R.st.clock.pausedAt; }
  R.meta.status = 'ended'; R.st.clock.endAt = now;
  Object.values(R.st.teams).forEach((t) => {
    Object.values(t.cards).forEach((c) => { if (c.state === 'open') c.state = 'gone'; });
    Object.keys(t.chal || {}).forEach((b) => { if (t.chal[b].state === 'open') delete t.chal[b]; });
  });
  event(why || '🏁 活動結束');
  ctx.all = true;
}
async function extendRun(min) { await enqueue((ctx) => { R.meta.settings.limitMin = (R.meta.settings.limitMin || 0) + min; event(`⏱ 延長 ${min} 分鐘`); ctx.all = true; }); toast(`已延長 ${min} 分鐘`); }

// ---------- 戰況看板 ----------
// 看板最多每 0.4 秒重畫一次（50 組同時答題時不會一直重畫）
function redraw() { renderBadge(); if (R.proj) drawProj(); if (S.tab !== 'live' || !R.code || R.drawT) return; R.drawT = setTimeout(() => { R.drawT = null; drawDash(); }, 400); }
function updateClock() {
  const el = $('#lvClock'); if (!el || !R.st) return;
  const sec = G.gameSeconds(R.st.clock, Date.now()), lim = (R.meta.settings.limitMin || 0) * 60;
  el.innerHTML = lim ? `${G.fmtTime(Math.max(0, lim - sec))}<small>剩餘</small>` : `${G.fmtTime(sec)}<small>經過</small>`;
  $$('[data-stuck]').forEach((s) => { const a = +s.dataset.stuck; const m = (Date.now() - a) / 60000; s.textContent = a ? `卡 ${Math.floor(m)}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}` : ''; s.className = 'chip ' + (m >= 5 ? 'red' : m >= 3 ? '' : 'gray'); });
  if (R.proj) drawProj();
}
function rankedNow(now) {
  const st = R.st, set = R.meta.settings, sec = G.gameSeconds(st.clock, now);
  if (isScore()) return G.rankScore(Object.fromEntries(Object.entries(st.teams).map(([id, t]) => [id, { ...t, done: t.done.length, total: G.teamTotal(t, set, st.clock) }])));
  return G.rankTeams(Object.fromEntries(Object.entries(st.teams).map(([id, t]) => [id, { ...t, done: t.done.length }])), sec);
}
function drawDash() {
  if (S.tab !== 'live' || !R.code) return;
  const panel = $('#panel'); if (!panel) return;
  const m = R.meta, st = R.st, set = m.settings, now = Date.now(), zm = G.zoneById(bank()), score = isScore();
  const ranked = rankedNow(now);
  const pend = pendingPasses(), judges = pendingJudges();
  const stTxt = { ready: '<span class="chip">準備中</span>', running: '<span class="chip red">進行中</span>', paused: '<span class="chip">⏸ 暫停中</span>', ended: '<span class="chip gray">🏁 已結束</span>' }[m.status];
  const nT = ranked.length, vmode = LS.get('gps_dashview', 'auto'), compact = vmode === 'compact' || (vmode === 'auto' && nT > 16);
  const sortBy = LS.get('gps_dashsort', 'rank');
  const oldestOf = (t) => { const o = openCards(t); return o.length ? Math.min(...o.map(([, c]) => c.at)) : Infinity; };
  const list = sortBy === 'stuck' ? ranked.slice().sort((a, b) => oldestOf(st.teams[a.id]) - oldestOf(st.teams[b.id]))
    : sortBy === 'order' ? ranked.slice().sort((a, b) => (st.teams[a.id].order || 0) - (st.teams[b.id].order || 0)) : ranked;
  const needCheck = score && set.checkin && m.status !== 'ready';
  const notIn = needCheck ? ranked.filter((r) => !st.teams[r.id].checkAt) : [];
  const ckBtn = (r, sm) => { const t = st.teams[r.id]; if (!needCheck) return ''; if (t.checkAt) { const late = G.lateMin(t, set, st.clock); return `<button class="btn sm ${sm ? 'ghost' : ''}" style="${sm ? 'padding:0 6px' : ''}" data-uncheck="${r.id}" title="報到時間 ${new Date(t.checkAt).toLocaleTimeString('zh-TW', { hour12: false })}${m.status === 'ended' ? '（按一下可以取消報到）' : ''}">✅${sm ? '' : ' 已報到'}${late ? ` 遲 ${late}′` : ''}</button>`; } return `<button class="btn sm teal" style="${sm ? 'padding:0 6px' : ''}" data-checkin="${r.id}">🚩${sm ? '' : ' 報到'}</button>`; };
  const valChip = (tid, c) => { if (!score) return ''; const h = heatCtx(tid, now), p = P(c.key), lv = heatOf(h, p); return `<span class="chip ${lv === 'hot' ? 'gray' : lv === 'cold' ? 'red' : ''}" title="${lv === 'hot' ? '熱門區 ×0.5' : lv === 'cold' ? '冷門區 ×1.5' : ''}" style="position:absolute;top:-6px;right:-4px;font-size:.66em;padding:0 5px">${valWith(h, p, c.hint)}</span>`; };
  const keepY = window.scrollY;
  const html = `
  <div class="toolbar" style="align-items:center">
    <button class="btn sm ghost" id="lvBack">← 活動列表</button>
    <div><div class="bold" style="font-size:1.15em">${esc(m.title)}</div><div class="small muted">代碼 <b style="font-size:1.2em;color:var(--ink);letter-spacing:.1em">${R.code}</b>・${score ? `🎯 積分賽・任務牆 ${set.wall} 張・每張 ${set.wallCands} 個候選${set.checkin ? '・🚩 回集合點報到' : ''}` : `🏁 每組找 ${set.target} 個地點・每關 ${set.photos || 1} 張照片／${set.cands || 5} 個候選・${set.route === 'near' ? '👣 就近' : '🌏 分散'}`}${set.limitMin ? `・${set.limitMin} 分鐘` : ''}${set.teaching ? '・🤫 避開教學區' : ''}${set.stanceOn || set.taskOn ? `・🎁${set.stanceOn ? '🦶' : ''}${set.taskOn ? '🔍' : ''}` : ''}</div></div>
    ${stTxt}
    <div id="lvClock" style="font-family:'Bebas Neue',sans-serif;font-size:2.1em;line-height:1;color:var(--orange)"></div>
    <span class="spacer"></span>
    ${m.status === 'ready' ? '<button class="btn sm" id="lvEdit">⚙️ 修改設定</button><button class="btn primary" id="lvStart">▶ 開始</button>' : ''}
    ${m.status === 'running' || m.status === 'paused' ? `<button class="btn" id="lvPause">${m.status === 'running' ? '⏸ 暫停' : '▶ 繼續'}</button><button class="btn sm" id="lvExt">＋5 分</button><button class="btn red" id="lvEnd">⏹ 結束</button>` : ''}
    <button class="btn ink" id="lvProj">📺 投影畫面</button>
    <button class="btn sm" id="lvLink">🔗 學生連結</button>
    <button class="btn sm" id="lvSlips">🔑 通行碼小紙條</button>
    ${m.status !== 'ready' ? '<button class="btn sm" id="lvStats">📊 統計</button><button class="btn sm" id="lvReplay">🗺️ 路線回放</button>' : ''}
  </div>
  ${R.lost ? '<div class="alert red">另一台裝置接手了自動裁判，這一頁只能看。要在這台繼續判題，請按 <button class="btn sm" id="lvTake">🤖 由這台接手</button></div>'
    : m.status === 'ended' ? '' : `<div class="alert teal small" style="margin-top:0">🤖 <b>自動裁判運作中</b>：派題、判對錯、${score ? '算分（冷熱門浮動）' : '給提示'}都由系統處理。<b>請保持這一頁開著</b>（可以切到其他分頁，但不要關掉或登出）。${R.wake ? '☀️ 螢幕常亮已開。' : ''}</div>`}
  ${needCheck && m.status === 'ended' && notIn.length ? `<div class="alert red"><b>🚩 還有 ${notIn.length} 組沒報到</b>：${notIn.map((r) => esc(r.name)).join('、')}　每組回來時按該組的「🚩 報到」（超過 ${set.grace} 分鐘每分鐘扣 ${set.latePts} 分）。<button class="btn sm" id="lvCheckAll">全部以現在時間報到</button></div>` : ''}
  ${pend.length ? `<div class="card" style="border-color:var(--red);background:var(--red-soft)"><h3 style="margin-top:0">🙋 PASS 申請（${pend.length}）</h3>
    ${pend.map(({ tid, cid, t, c }) => { const p = P(c.key); return `<div class="row" style="background:#fff;border-radius:10px;padding:8px;margin-top:6px;align-items:center">
      ${imgTag(p.photos[0], 'thumb', 'style="width:64px;height:64px" data-zoomsrc')}
      <div style="flex:1;min-width:180px"><b>${esc(t.name)}</b>　正確答案：<b>${p.no}</b> ${esc(p.name)}<div class="small muted">卡 ${Math.floor((now - c.at) / 60000)} 分鐘・用了 ${c.hint || 0} 層提示・答錯 ${c.wrong || 0} 次・已 PASS ${t.passes}/${set.passLimit}${c.passNote ? `<br>💬「${esc(c.passNote)}」` : ''}</div></div>
      <button class="btn teal" data-pass="${tid}|${cid}|1">✅ 准許（換一題）</button><button class="btn" data-pass="${tid}|${cid}|0">❌ 再找找</button></div>`; }).join('')}</div>` : ''}
  ${judges.length ? `<div class="card" style="border-color:var(--blue,#2f6db5);background:var(--blue-soft,#e4eefb)"><h3 style="margin-top:0">🔍 觀察任務待判定（${judges.length}）</h3>
    ${judges.map(({ tid, bid, t, c }) => { const p = P(c.key); return `<div class="row" style="background:#fff;border-radius:10px;padding:8px;margin-top:6px;align-items:center">
      <div style="flex:1;min-width:200px"><b>${esc(t.name)}</b>・第 ${p.no} 號 ${esc(p.name)}<div class="small">❓ ${esc(p.task.q)}${p.task.a ? `<span class="muted">（參考答案：${esc(p.task.a)}）</span>` : ''}</div><div style="font-size:1.1em;margin-top:2px">💬 <b>${esc(c.text)}</b></div></div>
      <button class="btn teal" data-judge="${tid}|${bid}|1">✅ 答對（${score ? `+${p.task.bonus} 分` : `−${set.bonusSec} 秒`}）</button><button class="btn" data-judge="${tid}|${bid}|0">❌ 不對</button></div>`; }).join('')}</div>` : ''}
  <div class="row small" style="margin-top:10px">
    <b>${nT} 組</b>・${score ? `已報到 ${ranked.filter((r) => st.teams[r.id].checkAt).length}` : `完成 ${ranked.filter((r) => r.finished).length}・進行中 ${ranked.filter((r) => !r.finished).length}`}<span class="spacer"></span>
    排序 <select class="inline" id="lvSort">${[['rank', '名次'], ['stuck', '卡最久的在前面'], ['order', '組別順序']].map(([v, t]) => `<option value="${v}" ${sortBy === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    顯示 <select class="inline" id="lvView">${[['auto', '自動（16 組以上精簡）'], ['card', '詳細卡片'], ['compact', '精簡']].map(([v, t]) => `<option value="${v}" ${vmode === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
  </div>
  ${compact ? `<div class="dgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:6px;margin-top:8px">${list.map((r) => { const t = st.teams[r.id], open = openCards(t), oldest = open.length ? Math.min(...open.map(([, c]) => c.at)) : 0, z = zm[t.zone];
    return `<div class="card" style="padding:6px 9px;${t.finished ? 'background:var(--gold-soft)' : ''}">
      <div class="row" style="gap:5px;flex-wrap:nowrap"><span style="font-family:'Bebas Neue',sans-serif;font-size:1.25em;color:var(--red);min-width:20px">${m.status === 'ready' ? '' : r.rank}</span>${z && !t.finished && !score ? `<i title="${esc(z.name)}" style="width:10px;height:10px;border-radius:50%;background:${z.color};flex:none"></i>` : ''}<b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.finished ? (score ? '✅ ' : '🏁 ') : ''}${esc(t.name)}</b><span class="spacer"></span><b>${score ? `${r.total} 分` : `${t.done.length}/${set.target}`}</b></div>
      <div class="row small" style="gap:4px;margin-top:2px;flex-wrap:nowrap">${!t.finished && m.status === 'running' && oldest && !score ? `<span data-stuck="${oldest}" class="chip gray"></span>` : t.finished && !score ? `<span class="chip teal">${G.fmtTime(t.finishSec)}</span>` : ''}<span class="muted" style="white-space:nowrap">${score ? `✅${t.done.length} ❌${t.wrong} ⏭${t.skips || 0}${t.bon ? ` 🎁${t.bon}` : ''}` : `❌${t.wrong} 💡${t.hints} 🙋${t.passes}${t.bon ? ` 🎁−${t.bon}s` : ''}`}</span><span class="spacer"></span>${ckBtn(r, true)}${!t.finished && open.length && m.status === 'running' ? `<button class="btn sm ghost" style="padding:0 6px" data-skip="${r.id}" title="換掉卡最久的那題">🔄</button>` : ''}</div></div>`; }).join('')}</div>` : `
  <div class="dgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-top:12px">
  ${list.map((r) => { const t = st.teams[r.id]; const open = openCards(t); const oldest = open.length ? Math.min(...open.map(([, c]) => c.at)) : 0; const z = zm[t.zone];
    return `<div class="card" style="${t.finished ? 'background:var(--gold-soft)' : ''}">
      <div class="row"><span style="font-family:'Bebas Neue',sans-serif;font-size:1.6em;color:var(--red)">${m.status === 'ready' ? '' : r.rank}</span><b style="font-size:1.1em">${t.finished ? (score ? '✅ ' : '🏁 ') : ''}${esc(t.name)}</b><button class="btn sm ghost" style="padding:0 5px;margin-left:-4px" data-rename="${r.id}" title="改隊名">✏️</button><span class="spacer"></span><span class="chip blue" title="通行碼">🔑 ${t.pass}</span></div>
      <div class="small muted">${R.members[r.id] ? '座號 ' + esc(R.members[r.id]) : '還沒登入'}</div>
      ${score ? `<div class="row" style="margin:6px 0 2px"><span style="font-family:'Bebas Neue',sans-serif;font-size:2em;line-height:1;color:var(--orange)">${r.total}</span><span class="small">分</span><span class="small muted">（答題 ${t.pts}${t.bon ? `＋加分 ${t.bon}` : ''}${G.lateMin(t, set, st.clock) ? `－遲到 ${G.lateMin(t, set, st.clock) * set.latePts}` : ''}）</span><span class="spacer"></span>${ckBtn(r)}</div>`
      : `<div style="height:10px;border-radius:999px;background:#eee;margin:8px 0 4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, t.done.length / set.target * 100)}%;background:linear-gradient(90deg,var(--orange),var(--gold))"></i></div>
      <div class="row small"><b>${t.done.length} / ${set.target}</b>${t.finished ? `<span class="chip teal">完成 ${G.fmtTime(t.finishSec)}</span>` : z ? `<span class="chip" style="background:${z.color};color:#fff">${esc(z.name)}</span>` : ''}
        ${!t.finished && m.status === 'running' && oldest ? `<span data-stuck="${oldest}" class="chip gray"></span>` : ''}<span class="spacer"></span></div>`}
      <div class="small" style="margin-top:4px">${score ? `✅ ${t.done.length}　❌ ${t.wrong}　💡 ${t.hints}　⏭ ${t.skips || 0}` : `❌ ${t.wrong}　💡 ${t.hints}　🙋 ${t.passes}　⏱ 罰 ${t.penalty} 秒${t.bon ? `　🎁 減 ${t.bon} 秒` : ''}`}</div>
      ${!t.finished && m.status !== 'ready' && m.status !== 'ended' ? `<div class="row" style="margin-top:6px;gap:4px">${open.map(([cid, c]) => { const p = P(c.key); return `<span title="${esc(p.name)}" style="position:relative">${imgTag(p.photos[0], 'thumb', 'data-zoomsrc')}<span class="chip" style="position:absolute;bottom:-4px;left:0;font-size:.68em;padding:0 5px">${p.no}</span>${valChip(r.id, c)}</span>`; }).join('')}
        <span class="spacer"></span>${open.length ? `<button class="btn sm ghost" data-skip="${r.id}" title="把卡最久的那題換掉（不算完成、不算 PASS 次數）">🔄 換題</button>` : ''}</div>` : ''}
      ${t.empty ? '<div class="small" style="color:var(--red)">⚠ 題庫沒有可派的題目了</div>' : ''}
    </div>`; }).join('')}
  </div>`}
  <div class="card" style="margin-top:14px"><div class="row"><h3 style="margin:0">📜 動態</h3><span class="spacer"></span>${st.badges.map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div>
    <div class="small" style="margin-top:6px">${st.events.slice(-8).reverse().map((e) => esc(e)).join('<br>') || '<span class="muted">還沒有動態</span>'}</div></div>
  <div class="card" style="margin-top:14px"><div class="row"><h3 style="margin:0">📊 成績</h3><span class="spacer"></span><button class="btn sm primary" id="lvXlsx">⬇️ 下載成績 Excel</button></div>
    <p class="small muted" style="margin-top:4px">${score ? `排名規則：總分（答題得分＋加分挑戰${set.checkin ? '－遲到扣分' : ''}）高的在前；同分比較早拿到最後一分的。` : `排名規則：完成的組比「用時＋罰秒${set.stanceOn || set.taskOn ? '－加分挑戰減秒' : ''}」；沒完成的組比完成題數，再比用時＋罰秒。`}</p></div>`;
  if (html === R.lastDash && panel.dataset.dash === R.code) return; // 沒變就不重畫
  R.lastDash = html; panel.dataset.dash = R.code;
  panel.innerHTML = html;
  window.scrollTo(0, keepY);
  updateClock();
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('lvBack', () => { if (isRefereeing()) return toast('活動進行中，請先結束或暫停再離開（這一頁是自動裁判）', true); stopReferee(); R.code = null; R.meta = null; LS.set('gps_live', ''); renderLiveTab(); });
  on('lvStart', async () => { if (await confirmBox('開始活動？\n系統會馬上替每一組派出第一關，計時開始。', '▶ 開始')) startRun(); });
  on('lvPause', pauseRun);
  on('lvEdit', () => runModal(R.meta));
  on('lvExt', () => extendRun(5));
  on('lvEnd', async () => { if (await confirmBox('結束活動？結束後學生就不能再作答。', '⏹ 結束')) endRun(isScore() && set.checkin ? '⏹ 活動結束！請回集合點報到' : undefined); });
  on('lvProj', openProj);
  on('lvLink', linkModal);
  on('lvSlips', printSlips);
  on('lvStats', () => STATS().then((m2) => m2.openStats(statsCtx())));
  on('lvReplay', () => STATS().then((m2) => m2.openReplay(statsCtx())));
  on('lvCheckAll', async () => { if (await confirmBox(`把還沒報到的 ${notIn.length} 組，全部以現在的時間報到？`, '🚩 全部報到')) enqueue((ctx) => notIn.forEach((r) => checkIn(ctx, r.id))); });
  const so = $('#lvSort'); if (so) so.onchange = () => { LS.set('gps_dashsort', so.value); drawDash(); };
  const vw = $('#lvView'); if (vw) vw.onchange = () => { LS.set('gps_dashview', vw.value); drawDash(); };
  on('lvXlsx', exportXlsx);
  on('lvTake', () => { R.lost = false; R.active = true; FB.set(base() + '/host', { id: R.hostId, beat: Date.now() }); toast('已由這台裝置接手自動裁判'); drawDash(); });
  $$('[data-pass]').forEach((b) => { b.onclick = () => { const [tid, cid, ok] = b.dataset.pass.split('|'); enqueue((ctx) => decidePass(ctx, tid, cid, ok === '1')); }; });
  $$('[data-rename]').forEach((b) => { b.onclick = () => teacherRename(b.dataset.rename); });
  $$('[data-judge]').forEach((b) => { b.onclick = () => { const [tid, bid, ok] = b.dataset.judge.split('|'); enqueue((ctx) => judgeOpen(ctx, tid, bid, ok === '1')); }; });
  $$('[data-checkin]').forEach((b) => {
    b.onclick = async () => {
      const t = st.teams[b.dataset.checkin];
      if ((m.status === 'running' || m.status === 'paused') && !(await confirmBox(`${t.name} 回到集合點報到？\n報到後這一組就收工，不能再作答（分數保留）。`, '🚩 報到'))) return;
      enqueue((ctx) => checkIn(ctx, b.dataset.checkin));
    };
  });
  $$('[data-uncheck]').forEach((b) => { b.onclick = async () => { if (m.status !== 'ended') return toast('進行中報到的組已經收工，不能取消'); const t = st.teams[b.dataset.uncheck]; if (await confirmBox(`取消 ${t.name} 的報到？（按錯時用）`, '↩️ 取消報到')) enqueue((ctx) => checkIn(ctx, b.dataset.uncheck, true)); }; });
  $$('[data-skip]').forEach((b) => {
    b.onclick = async () => {
      const t = st.teams[b.dataset.skip]; const open = openCards(t).sort((a, c) => a[1].at - c[1].at); if (!open.length) return;
      const p = P(open[0][1].key);
      if (await confirmBox(`把 ${t.name} 卡最久的第 ${p.no} 號（${p.name}）換掉？\n不算完成，也不算他們的 PASS 次數。`, '🔄 換題')) enqueue((ctx) => decidePass(ctx, b.dataset.skip, open[0][0], true, true));
    };
  });
  $$('[data-zoomsrc]').forEach((im) => { im.style.cursor = 'zoom-in'; im.onclick = () => zoomImg(im.src); });
}
// 統計與路線回放放在另一個檔案，用到才載入
const STATS = () => import('./stats.js?v=20261012f');
function statsCtx() {
  const b = bank(), centers = G.zoneCenters(b), ys = Object.values(b.points).map((p) => p.y);
  return {
    bank: b, meta: R.meta, st: R.st, members: R.members, ranked: rankedNow(Date.now()), isScore: isScore(),
    pub: { map: b.map, crop: { top: Math.max(0, Math.min(12.5, Math.min(...ys) - 9)), bot: Math.min(100, Math.max(88, Math.max(...ys) + 4)) } },
    getLog: async () => { try { return (await FB.get(base() + '/log')) || {}; } catch (e) { return {}; } },
    centers
  };
}

// ---------- 學生連結、通行碼小紙條 ----------
const playURL = () => new URL('play.html?code=' + R.code, location.href).href;
function qrData(text, size) {
  return new Promise((res) => {
    if (typeof QRCode === 'undefined') return res('');
    const box = document.createElement('div');
    new QRCode(box, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
    setTimeout(() => { const c = box.querySelector('canvas'), i = box.querySelector('img'); res(c ? c.toDataURL() : i ? i.src : ''); }, 60);
  });
}
async function linkModal() {
  const url = playURL(), qr = await qrData(url, 260);
  const m = modal(`<h2>🔗 學生連結</h2><p class="small muted">學生用手機掃 QR 或開連結，再輸入自己組別的 4 碼通行碼。</p>
    <div style="text-align:center;margin:12px 0">${qr ? `<img src="${qr}" style="width:260px;height:260px">` : ''}<div style="font-size:1.6em;font-weight:900;letter-spacing:.12em;margin-top:6px">活動代碼 ${R.code}</div></div>
    <input type="text" readonly value="${esc(url)}" id="lkUrl">
    <p class="small muted" style="margin-top:10px">📺 投影用另一台裝置（例如教室電腦接投影機）？開這個連結，不用登入、不會顯示答案：<br><a href="${esc(new URL('board.html?code=' + R.code, location.href).href)}" target="_blank">${esc(new URL('board.html?code=' + R.code, location.href).href)}</a></p>
    <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" id="lkCopy">📋 複製連結</button><button class="btn primary" data-x>關閉</button></div>`);
  $('[data-x]', m.el).onclick = m.close;
  $('#lkCopy', m.el).onclick = () => { navigator.clipboard.writeText(url).then(() => toast('已複製'), () => { $('#lkUrl', m.el).select(); }); };
}
async function printSlips() {
  const url = playURL(), qr = await qrData(url, 200);
  const teams = Object.values(R.st.teams).sort((a, b) => (a.order || 0) - (b.order || 0));
  const per = 10, pages = [];
  for (let i = 0; i < teams.length; i += per) pages.push(teams.slice(i, i + per));
  $('#printRoot').innerHTML = pages.map((pg) => `<div class="sheet" style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(5,1fr);gap:0;padding:6mm">
    ${pg.map((t) => `<div style="border:1px dashed #999;display:flex;align-items:center;gap:5mm;padding:3mm 5mm">
      ${qr ? `<img src="${qr}" style="width:30mm;height:30mm">` : ''}
      <div style="flex:1"><div style="font-size:11pt">🧭 遺落的地點・${esc(R.meta.title)}</div><div style="font-size:17pt;font-weight:900">${esc(t.name)}</div>
      <div style="font-size:10pt">通行碼</div><div style="font-size:28pt;font-weight:900;letter-spacing:.18em;font-family:monospace">${t.pass}</div>
      <div style="font-size:8pt;color:#555;word-break:break-all">${esc(url)}</div></div></div>`).join('')}</div>`).join('');
  const imgs = $$('#printRoot img');
  Promise.all(imgs.map((im) => im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; }))).then(() => setTimeout(() => window.print(), 100));
}

// ---------- 投影畫面 ----------
function openProj() {
  if (!$('#gbStyle')) { const s = document.createElement('style'); s.id = 'gbStyle'; s.textContent = G.BOARD_CSS; document.head.appendChild(s); }
  R.proj = document.createElement('div'); document.body.appendChild(R.proj);
  R.proj.addEventListener('click', (e) => { if (e.target.closest('[data-gbclose]')) closeProj(); });
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { }
  drawProj(); wakeOn();
}
function drawProj() {
  if (!R.proj) return;
  const b = bank(), centers = G.zoneCenters(b), ys = Object.values(b.points).map((p) => p.y);
  const pub = { map: b.map, zones: b.zones.map((z) => ({ ...z, ...(centers[z.id] || {}) })), crop: { top: Math.max(0, Math.min(12.5, Math.min(...ys) - 9)), bot: Math.min(100, Math.max(88, Math.max(...ys) + 4)) } };
  G.boardPaint(R.proj, boardFor(), pub, Date.now(), { close: true });
}
function closeProj() { if (R.proj) R.proj.remove(); R.proj = null; try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { } }

// ---------- 螢幕常亮、提示音 ----------
async function wakeOn() {
  try { if ('wakeLock' in navigator && !R.wake) { R.wake = await navigator.wakeLock.request('screen'); R.wake.addEventListener('release', () => { R.wake = null; }); } } catch (e) { R.wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && R.active) wakeOn(); });
function beep() {
  try {
    const ctx = R.audio || (R.audio = new (window.AudioContext || window.webkitAudioContext)());
    [0, 0.18].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = i ? 990 : 660; g.gain.value = 0.18; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15); });
  } catch (e) { }
}

// ---------- 成績 Excel ----------
async function exportXlsx() {
  if (typeof XLSX === 'undefined') return toast('Excel 元件載入失敗', true);
  const st = R.st, set = R.meta.settings, score = isScore(), ctx = statsCtx(), ranked = ctx.ranked;
  const rows = ranked.map((r) => {
    const t = st.teams[r.id];
    if (score) {
      const late = G.lateMin(t, set, st.clock);
      return { 名次: r.rank, 組別: r.name, 座號: R.members[r.id] || '', 總分: r.total, 答題得分: t.pts, 加分挑戰: t.bon || 0, 遲到分鐘: late, 遲到扣分: late * (set.latePts || 0), 找到地點數: t.done.length, 答錯次數: t.wrong, 提示次數: t.hints, 放棄次數: t.skips || 0, 報到時間: t.checkAt ? new Date(t.checkAt).toLocaleTimeString('zh-TW', { hour12: false }) : '' };
    }
    return { 名次: r.rank, 組別: r.name, 座號: R.members[r.id] || '', 完成題數: r.done, 目標題數: set.target, 是否完成: r.finished ? '是' : '否', 用時: r.finished ? G.fmtTime(r.finishSec) : '', 答錯次數: r.wrong, 提示次數: r.hints, PASS次數: r.passes, 罰秒: r.penalty, 加分挑戰減秒: t.bon || 0, '用時＋罰秒－減秒': r.finished ? G.fmtTime(r.finishSec + r.penalty - (t.bon || 0)) : '' };
  });
  const log = await ctx.getLog();
  const SM = await STATS();
  const S2 = SM.computeStats(ctx, log);
  const byNo = Object.fromEntries(G.sortedPoints(bank()).map((p) => [p.no, p]));
  const kind = { rename: '✏️ 改隊名', chalSkip: '🎁 略過挑戰', ok: '✅ 答對', wrong: '❌ 答錯', cool: '冷卻中（未判）', hint: '💡 提示', passReq: '🙋 申請 PASS', passOK: '🙋 PASS 准許', passNo: '🙋 PASS 駁回', skip: '🔄 老師換題', giveup: '⏭ 放棄', cam: '🦶 站位挑戰', task: '🔍 觀察任務', taskJudge: '🔍 老師判定', checkin: '🚩 報到', uncheck: '↩️ 取消報到', ignore: '（略過）' };
  const det = Object.values(log).filter((l) => l.kind !== 'ignore').sort((a, b) => a.t - b.t).map((l) => {
    const t = st.teams[l.tid] || {}, p = byNo[l.no] || {};
    return { 時間: new Date(l.t).toLocaleTimeString('zh-TW', { hour12: false }), 組別: t.name || '', 事件: kind[l.kind] || l.kind, 地點編號: l.no || '', 地點: p.name || '', 學生回答: l.ans != null ? l.ans : l.text != null ? l.text : '', 得分: l.pts != null ? l.pts : l.got != null ? (l.got === 1 ? '全對' : l.got ? '一半' : '0') : l.ok != null ? (l.ok === 1 ? '對' : l.ok === -1 ? '待老師判' : '錯') : '', 提示層級: l.level || '', 'PASS 留言': l.note || '' };
  });
  const wb = XLSX.utils.book_new();
  const add = (data, name, empty) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length ? data : [empty]), name);
  add(rows, '排名', { 名次: '' });
  add(det, '作答明細', { 時間: '' });
  add(S2.points.map((x) => ({ 地點編號: x.no, 地點: x.name, 區域: x.zone, 視角: x.view || '未標', 答對: x.ok, 答錯: x.wrong, 提示: x.hint, 'PASS／換題／放棄': x.pass, '平均找到時間（分）': x.avg != null ? +(x.avg / 60).toFixed(1) : '', 難度指數: x.diff })), '點位統計', { 地點編號: '' });
  add(S2.views.map((x) => ({ 視角: x.label, 類別: x.group, 答對: x.ok, 答錯: x.wrong, '答錯率%': x.wrongRate, '平均找到時間（分）': x.avg != null ? +(x.avg / 60).toFixed(1) : '', 站位挑戰次數: x.camN, '站位全對率%': x.camRate })), '視角統計', { 視角: '' });
  add(S2.chal.map((x) => ({ 時間: x.time, 組別: x.team, 類型: x.kind, 地點編號: x.no, 地點: x.name, 題目: x.q, 回答: x.text, 結果: x.result })), '加分挑戰', { 時間: '' });
  XLSX.writeFile(wb, `遺落的地點_${R.meta.title}_${R.code}.xlsx`);
}
