/* =========================================================
   ⚗️ 化學實驗室 No.223：老師頁共用的「登入＋活動管理」（ES module）
   三個老師頁（器材、pH、單位換算）都用這一份：
     const T = await startTeacher({ sys, gate, main, panel, settings, readSettings, describe, onSelect })
   ・登入：會員中心帳號（系統代號 lab），各系統共用同一個登入
   ・活動：開新活動（學期、項次、名稱＋各系統自己的題目設定）、▶ 開始／⏸ 停止、編輯、刪除、QR、投影
   ・T.listen(code, cb)：即時監聽這個活動全部學生紀錄（只在分頁看得到時連線，背景 60 秒自動斷線）
   ========================================================= */
const W = window.WuStaff;   // LAB（lab223.js）是一般 script 的全域常數，模組裡直接用名字就拿得到
const esc = LAB.esc;

let cssDone = false;
function injectCSS() {
  if (cssDone) return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
  .lt-gate { max-width: 460px; margin: 10vh auto; background: #fffaf0; color: #222; border-radius: 14px; padding: 26px; box-shadow: 0 10px 40px rgba(0,0,0,.35); line-height: 1.7; }
  .lt-gate h1 { font-size: 1.4rem; margin-bottom: 6px; }
  .lt-gate input { width: 100%; font: inherit; padding: 10px 12px; border: 2px solid #ddd3bd; border-radius: 10px; }
  .lt-gate .note { font-size: .9em; color: #6b6248; } .lt-gate .bad { color: #c0392b; font-weight: 700; }
  .lt-btn { font: inherit; font-weight: 800; border: none; border-radius: 10px; padding: 9px 14px; cursor: pointer; background: var(--lab-accent, #ffb627); color: #1a1a1a; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
  .lt-btn:disabled { opacity: .45; cursor: default; }
  .lt-btn.dark { background: #26323a; color: #fff; } .lt-btn.ghost { background: transparent; color: inherit; border: 2px solid currentColor; box-shadow: none; }
  .lt-btn.go { background: #2fa55f; color: #fff; } .lt-btn.stop { background: #d6403a; color: #fff; } .lt-btn.sm { padding: 6px 10px; font-size: .88em; }
  .lt-link { background: none; border: none; font: inherit; text-decoration: underline; cursor: pointer; color: inherit; padding: 0; }
  .lt-who { display: flex; gap: 10px; align-items: center; justify-content: flex-end; flex-wrap: wrap; font-size: .9em; margin-bottom: 10px; opacity: .9; }
  .lt-who a { color: inherit; }
  .lt-wrap { display: grid; grid-template-columns: 300px 1fr; gap: 14px; align-items: start; }
  .lt-box { background: #fffaf0; color: #222; border-radius: 14px; padding: 16px; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
  .lt-box h3 { font-size: 1.05em; margin-bottom: 8px; }
  .lt-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .lt-list { display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow: auto; margin-top: 8px; }
  .lt-item { display: flex; gap: 8px; align-items: center; border: 2px solid #e6dcc6; border-radius: 10px; padding: 8px 10px; cursor: pointer; background: #fff; }
  .lt-item.cur { border-color: var(--lab-accent, #ffb627); background: #fff6dc; }
  .lt-item .tx { flex: 1; min-width: 0; } .lt-item .tx b { display: block; } .lt-item .tx small { color: #7a6f55; font-family: 'JetBrains Mono', monospace; }
  .lt-dot { width: 12px; height: 12px; border-radius: 50%; background: #b9b2a0; flex: none; } .lt-dot.on { background: #2fa55f; box-shadow: 0 0 0 3px #2fa55f33; }
  .lt-form { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 10px; margin: 8px 0 12px; }
  .lt-form label { display: block; font-size: .8em; font-weight: 800; color: #6b6248; margin-bottom: 3px; }
  .lt-form input { width: 100%; font: inherit; padding: 9px 10px; border: 2px solid #ddd3bd; border-radius: 10px; }
  .lt-cur { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center; }
  .lt-qr { background: #fff; padding: 8px; border-radius: 10px; line-height: 0; }
  .lt-code { font-family: 'JetBrains Mono', monospace; font-size: 2.4em; font-weight: 900; letter-spacing: .14em; }
  .lt-url { font-size: .82em; word-break: break-all; color: #6b6248; margin: 2px 0 8px; }
  .lt-state { display: inline-flex; gap: 6px; align-items: center; font-weight: 900; border-radius: 999px; padding: 4px 12px; }
  .lt-state.on { background: #dff5e7; color: #1d6a3a; } .lt-state.off { background: #f3e9e7; color: #9a3a2c; }
  .lt-sum { font-size: .9em; color: #4b4436; margin-top: 6px; }
  .lt-ov { position: fixed; inset: 0; z-index: 999; background: #0f1418; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 20px; }
  .lt-ov .c { font-family: 'JetBrains Mono', monospace; font-size: clamp(3em, 10vw, 6em); font-weight: 900; letter-spacing: .16em; color: var(--lab-accent, #ffb627); }
  .lt-ov .q { background: #fff; padding: 14px; border-radius: 14px; line-height: 0; }
  .lt-ov .x { position: absolute; top: 14px; right: 14px; }
  .lt-modal { position: fixed; inset: 0; z-index: 998; background: rgba(0,0,0,.6); display: flex; align-items: flex-start; justify-content: center; padding: 4vh 12px; overflow: auto; }
  .lt-modal > div { background: #fffaf0; color: #222; border-radius: 14px; padding: 20px; width: min(860px, 100%); }
  .lt-banner { margin-top: 10px; border-radius: 10px; padding: 8px 12px; font-weight: 700; font-size: .92em; }
  .lt-banner.off { background: #fff1d6; color: #7a4d00; } .lt-banner.on { background: #e3f6ea; color: #1d6a3a; }
  @media (max-width: 860px) { .lt-wrap { grid-template-columns: 1fr; } .lt-form { grid-template-columns: 1fr 1fr; } .lt-form .w { grid-column: 1 / -1; } .lt-cur { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
}

export async function startTeacher(opt) {
  injectCSS(); LAB.injectCSS();
  const { sys, gate, main, panel } = opt;
  const S = LAB.SYS[sys];
  let FB = null, authErr = e => String((e && (e.code || e.message)) || e), gBtn = () => '';
  try {
    const M = await import('../account/fb.js?v=20261020a');
    FB = await M.openFirebase('lab'); FB.idle(60000); authErr = M.authErr; gBtn = M.googleButtonHTML;
  } catch (e) { console.warn(e); }
  const box = h => `<div class="lt-gate">${h}</div>`;
  const API = { FB: null, ME: null, cur: null, meta: null, mine: {} };

  function renderLogin(msg) {
    main.classList.add('hidden');
    gate.innerHTML = box(`<h1>${S.icon} ${S.name}｜老師登入</h1>
      <p class="note">開活動、看學生作答需要登入。各系統共用同一個老師帳號。</p>
      ${msg ? `<p class="note bad">${esc(msg)}</p>` : ''}${!FB ? '<p class="note bad">雲端服務載入失敗，請確認網路後重新整理。</p>' : ''}
      <div style="margin-top:12px">${gBtn('ltG')}</div>
      <label class="note" style="display:block;margin-top:10px;font-weight:700">Email</label><input type="email" id="ltE" autocomplete="username">
      <label class="note" style="display:block;margin-top:8px;font-weight:700">密碼</label><input type="password" id="ltP" autocomplete="current-password">
      <div class="lt-row" style="margin-top:14px"><button class="lt-btn" id="ltGo">🔓 登入</button><button class="lt-link" id="ltReset" style="margin-left:auto">忘記密碼</button></div>
      <p class="note" style="margin-top:14px">還沒有帳號？<a href="${W.centerURL('../', 'lab')}" style="font-weight:700;color:#222">👥 到會員中心申請使用</a>（巫魚子老師核准後就能用）</p>`);
    if (!FB) return;
    const go = async () => { const e = gate.querySelector('#ltE').value.trim(), p = gate.querySelector('#ltP').value; if (!e || !p) return; gate.querySelector('#ltGo').disabled = true; try { await FB.login(e, p); } catch (err) { renderLogin(authErr(err)); } };
    const gg = gate.querySelector('#ltG'); if (gg) gg.onclick = async () => { gg.disabled = true; try { await FB.google(); } catch (err) { renderLogin(authErr(err)); } };
    gate.querySelector('#ltGo').onclick = go; gate.querySelector('#ltP').onkeydown = ev => { if (ev.key === 'Enter') go(); };
    gate.querySelector('#ltReset').onclick = async () => { const e = gate.querySelector('#ltE').value.trim(); if (!e) return alert('先輸入 Email'); try { await FB.reset(e); alert('重設密碼的信已寄出'); } catch (err) { alert('寄送失敗：' + (err.code || err.message)); } };
  }

  /* ---------- 活動清單與目前活動 ---------- */
  const studentURL = code => new URL(S.page, location.href).href + '?a=' + code;
  const curKey = 'lab223-teacher:' + sys;
  async function loadMine(want) {
    const all = (await FB.get('lab223/owners/' + API.ME.uid)) || {};
    API.mine = Object.fromEntries(Object.entries(all).filter(([, v]) => v && v.sys === sys));
    let last = null; try { last = localStorage.getItem(curKey); } catch (e) {}
    const codes = sorted();
    const pick = want || (API.mine[API.cur] ? API.cur : API.mine[last] ? last : codes[0]);
    if (pick) await select(pick); else { API.cur = null; API.meta = null; draw(); opt.onSelect && opt.onSelect(null, null); }
  }
  const sorted = () => Object.keys(API.mine).sort((a, b) => (API.mine[b].at || 0) - (API.mine[a].at || 0));
  async function select(code) {
    const meta = await FB.get('lab223/m/' + code + '/meta');
    if (!meta) { delete API.mine[code]; return loadMine(); }
    API.cur = code; API.meta = meta;
    try { localStorage.setItem(curKey, code); } catch (e) {}
    draw();
    opt.onSelect && opt.onSelect(meta, code);
  }
  function draw() {
    const codes = sorted(), m = API.meta, c = API.cur;
    panel.innerHTML = `<div class="lt-who">👤 ${esc(API.ME.name)}<a href="${W.centerURL('../', 'lab')}">👥 會員中心</a><button class="lt-link" id="ltOut">登出</button></div>
      <div class="lt-wrap">
        <div class="lt-box"><div class="lt-row" style="justify-content:space-between"><h3 style="margin:0">🗂️ 我的活動</h3><button class="lt-btn sm" id="ltNew">➕ 開新活動</button></div>
          <div class="lt-list">${codes.length ? codes.map(k => { const x = API.mine[k]; return `<div class="lt-item ${k === c ? 'cur' : ''}" data-k="${k}"><span class="lt-dot ${x.open ? 'on' : ''}" title="${x.open ? '進行中' : '未開始／已停止'}"></span><div class="tx"><b>${esc(LAB.label(x))}</b><small>${k}${x.from ? '・📦 改版前搬來' : ''}</small></div></div>`; }).join('') : '<p style="font-size:.9em;color:#6b6248">還沒有活動，按「➕ 開新活動」開始。</p>'}</div>
          ${opt.legacy ? '<button class="lt-link" id="ltMig" style="margin-top:10px;font-size:.88em">📦 搬移改版前的紀錄（舊題組碼）</button>' : ''}</div>
        <div class="lt-box">${m ? `
          <div class="lt-cur"><div class="lt-qr" id="ltQR"></div><div>
            <div class="lt-row" style="justify-content:space-between"><b style="font-size:1.1em">${esc(LAB.label(m))}</b><span class="lt-state ${m.open ? 'on' : 'off'}">${m.open ? '🟢 進行中' : '⏸ 未開始／已停止'}</span></div>
            <div class="lt-code">${c}</div><div class="lt-url">${esc(studentURL(c))}</div>
            <div class="lt-row">${m.open ? '<button class="lt-btn stop" id="ltTog">⏹ 停止活動</button>' : '<button class="lt-btn go" id="ltTog">▶ 開始活動</button>'}
              <button class="lt-btn dark" id="ltShow">🖥️ 全螢幕投影</button><button class="lt-btn ghost sm" id="ltCopy">📋 複製連結</button><button class="lt-btn ghost sm" id="ltEdit">✏️ 學期／項次</button><button class="lt-btn ghost sm" id="ltDel">🗑 刪除</button></div>
            <div class="lt-sum">⚙️ ${esc(opt.describe ? opt.describe(m) : '')}</div>
            <div class="lt-banner ${m.open ? 'on' : 'off'}">${m.open ? '學生正在作答。結算完記得按「⏹ 停止活動」，學生就不能再作答。' : '學生進來會看到「等老師開始」，按「▶ 開始活動」後自動進入。停止後作答會鎖住，紀錄都保留。'}</div>
          </div></div>` : '<p>先在左邊選一個活動，或按「➕ 開新活動」。</p>'}</div>
      </div>`;
    panel.querySelector('#ltOut').onclick = async () => { await FB.logout(); location.reload(); };
    panel.querySelector('#ltNew').onclick = () => openForm();
    const mg = panel.querySelector('#ltMig'); if (mg) mg.onclick = migrate;
    panel.querySelectorAll('[data-k]').forEach(b => b.onclick = () => select(b.dataset.k));
    if (!m) return;
    if (typeof QRCode !== 'undefined') new QRCode(panel.querySelector('#ltQR'), { text: studentURL(c), width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
    panel.querySelector('#ltTog').onclick = () => toggle(!m.open);
    panel.querySelector('#ltShow').onclick = projector;
    panel.querySelector('#ltCopy').onclick = async e => { try { await navigator.clipboard.writeText(studentURL(c)); e.target.textContent = '✔ 已複製'; } catch (x) { e.target.textContent = '請手動複製'; } setTimeout(() => { e.target.textContent = '📋 複製連結'; }, 1600); };
    panel.querySelector('#ltEdit').onclick = () => openForm(m);
    panel.querySelector('#ltDel').onclick = del;
  }
  async function toggle(open) {
    const c = API.cur;
    try {
      await FB.update('lab223', { [`m/${c}/meta/open`]: open, [`owners/${API.ME.uid}/${c}/open`]: open });
      API.meta.open = open; API.mine[c].open = open; draw(); opt.onSelect && opt.onSelect(API.meta, c);
      const ov = document.getElementById('lt-ov'); if (ov) projector();
    } catch (e) { alert('切換失敗：' + (e.code || e.message)); }
  }
  async function del() {
    const c = API.cur, m = API.meta;
    if (!confirm(`確定刪除活動「${LAB.label(m)}」（${c}）？\n\n學生的作答紀錄會一起刪除，學生連結也會失效，無法復原。`)) return;
    try { await FB.remove('lab223/m/' + c); await FB.remove(`lab223/owners/${API.ME.uid}/${c}`); API.cur = null; await loadMine(); }
    catch (e) { alert('刪除失敗：' + (e.code || e.message)); }
  }
  function projector() {
    let ov = document.getElementById('lt-ov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'lt-ov'; ov.className = 'lt-ov'; document.body.appendChild(ov); }
    const m = API.meta, c = API.cur;
    ov.innerHTML = `<button class="lt-btn dark x" id="ltX">✕ 關閉（Esc）</button><div style="font-size:1.4em">${S.icon} ${S.name}｜${esc(LAB.label(m))}</div>
      <div class="q" id="ltBigQR"></div><div class="c">${c}</div><div style="opacity:.8;word-break:break-all">${esc(studentURL(c))}</div>
      <div class="lt-row" style="justify-content:center"><span class="lt-state ${m.open ? 'on' : 'off'}" style="font-size:1.2em">${m.open ? '🟢 活動進行中' : '⏸ 等老師開始'}</span>
        ${m.open ? '<button class="lt-btn stop" id="ltOvTog">⏹ 停止活動</button>' : '<button class="lt-btn go" id="ltOvTog">▶ 開始活動</button>'}</div>`;
    if (typeof QRCode !== 'undefined') new QRCode(ov.querySelector('#ltBigQR'), { text: studentURL(c), width: Math.min(460, innerHeight * 0.5), height: Math.min(460, innerHeight * 0.5), correctLevel: QRCode.CorrectLevel.M });
    ov.querySelector('#ltX').onclick = () => ov.remove();
    ov.querySelector('#ltOvTog').onclick = () => toggle(!m.open);
    keepAwake();
  }
  // 平板投影時螢幕不要自動變暗（支援的瀏覽器用 Wake Lock；切回分頁時重新要求）
  async function keepAwake() { try { if ('wakeLock' in navigator && !document.hidden) await navigator.wakeLock.request('screen'); } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && API.ME) keepAwake(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const ov = document.getElementById('lt-ov'); if (ov) ov.remove(); } });

  /* ---------- 開新活動／編輯 ---------- */
  function openForm(edit) {
    const term = edit ? edit.term : LAB.defaultTerm();
    const nextItem = t => 1 + Math.max(0, ...Object.values(API.mine).filter(x => x.term === t).map(x => +x.item || 0));
    const md = document.createElement('div'); md.className = 'lt-modal';
    md.innerHTML = `<div><h3 style="margin-bottom:6px">${edit ? '✏️ 編輯活動' : '➕ 開新活動'}｜${S.icon} ${S.name}</h3>
      <div class="lt-form"><div><label>學期</label><input id="lfT" value="${esc(term)}" placeholder="例：115-1"></div>
        <div><label>項次（第幾次）</label><input id="lfI" type="number" min="1" max="99" value="${edit ? edit.item : nextItem(term)}"></div>
        <div class="w"><label>名稱（選填，例：301 班、期中複習）</label><input id="lfN" maxlength="30" value="${esc(edit ? edit.name || '' : '')}"></div></div>
      ${edit ? `<p style="font-size:.9em;color:#6b6248">題目設定：${esc(opt.describe ? opt.describe(edit) : '')}（建立後不能改，要換設定請開新活動）</p>` : '<div id="lfSet"></div>'}
      <p class="lt-err" id="lfErr" style="color:#c0392b;font-weight:700;min-height:1.2em"></p>
      <div class="lt-row"><button class="lt-btn" id="lfOk">${edit ? '💾 儲存' : '✨ 建立活動'}</button><button class="lt-btn dark" id="lfX">取消</button>${edit ? '' : '<span style="font-size:.85em;color:#6b6248">建立後是「未開始」，按 ▶ 開始活動學生才能作答</span>'}</div></div>`;
    document.body.appendChild(md);
    const $f = id => md.querySelector('#' + id);
    if (!edit && opt.settings) { $f('lfSet').appendChild(opt.settings); opt.settings.classList.remove('hidden'); }
    const close = () => { if (!edit && opt.settings) { opt.settings.classList.add('hidden'); document.body.appendChild(opt.settings); } md.remove(); };
    $f('lfX').onclick = close;
    $f('lfT').onchange = () => { if (!edit) $f('lfI').value = nextItem($f('lfT').value.trim()); };
    $f('lfOk').onclick = async () => {
      const t = LAB.toHalf($f('lfT').value).trim(), it = parseInt($f('lfI').value, 10), nm = $f('lfN').value.trim().slice(0, 30);
      if (!LAB.validTerm(t)) return ($f('lfErr').textContent = '學期格式像「115-1」（民國年－1 或 2）');
      if (!(it >= 1 && it <= 99)) return ($f('lfErr').textContent = '項次要是 1～99');
      $f('lfOk').disabled = true;
      try {
        if (edit) {
          const c = API.cur;
          await FB.update('lab223', { [`m/${c}/meta/term`]: t, [`m/${c}/meta/item`]: it, [`m/${c}/meta/name`]: nm, [`owners/${API.ME.uid}/${c}/term`]: t, [`owners/${API.ME.uid}/${c}/item`]: it, [`owners/${API.ME.uid}/${c}/name`]: nm });
          close(); API.mine[c] = { ...API.mine[c], term: t, item: it, name: nm }; await select(c); return;
        }
        const set = opt.readSettings ? opt.readSettings() : '';
        if (set === null) { $f('lfOk').disabled = false; return ($f('lfErr').textContent = '題目設定還沒完成，請檢查上面的設定'); }
        let code = null;
        for (let k = 0; k < 6 && !code; k++) { const c = LAB.newCode(); if (!(await FB.get('lab223/m/' + c + '/meta'))) code = c; }
        const at = Date.now();
        const meta = { owner: API.ME.uid, sys, term: t, item: it, name: nm, open: false, at, set: String(set) };
        if (API.ME.admin) meta.admin = true;   // 管理員沒有會員中心紀錄，學生寫入規則看這個旗標
        await FB.set(`lab223/m/${code}/meta`, meta);
        await FB.set(`lab223/owners/${API.ME.uid}/${code}`, { sys, term: t, item: it, name: nm, at, open: false });
        close(); API.mine[code] = { sys, term: t, item: it, name: nm, at, open: false }; await select(code);
      } catch (e) { $f('lfOk').disabled = false; $f('lfErr').textContent = '儲存失敗：' + (e.code || e.message) + '（Firebase 規則可能還沒更新）'; }
    };
  }


  /* ---------- 📦 搬移改版前的紀錄（2026-10-22）----------
     舊題組碼的學生紀錄 → 新活動（set＝同一個題組碼，題目和以前完全一樣）；學號留空、用途由老師整批指定；活動維持「未開始」
     opt.legacy = { parse(code), fetch(code), pretty(code), recentKey } */
  function migrate() {
    const L = opt.legacy, done = Object.fromEntries(Object.entries(API.mine).filter(([, v]) => v.from).map(([k, v]) => [v.from, k]));
    let recent = []; try { recent = JSON.parse(localStorage.getItem(L.recentKey) || '[]').filter(x => L.parse(x.code)); } catch (e) {}
    const md = document.createElement('div'); md.className = 'lt-modal';
    md.innerHTML = `<div><h3 style="margin-bottom:6px">📦 搬移改版前的紀錄｜${S.icon} ${S.name}</h3>
      <p style="font-size:.9em;color:#6b6248;line-height:1.7">每個舊題組碼搬成一個新活動：題目設定相同，學生的題目和作答完全對得上，即時總表、能力分析、Excel 都能用。舊紀錄沒有學號（留空）和用途（下面整批指定）；搬好的活動維持「未開始」，舊紀錄也不會被刪掉。</p>
      <b style="font-size:.9em">這台裝置最近用過的題組碼</b>
      <div class="lt-list" id="mgList" style="max-height:200px">${recent.length ? recent.map(x => `<div class="lt-item" data-c="${x.code}"><div class="tx"><b class="mono">${esc(L.pretty(x.code))}</b><small>${new Date(x.t).toLocaleDateString('zh-TW')}${done[x.code] ? `・✅ 已搬到 ${done[x.code]}` : ''}</small></div></div>`).join('') : '<p style="font-size:.88em;color:#6b6248">這台裝置沒有紀錄（可能是在別台電腦／平板出的題），請在下面手動輸入。</p>'}</div>
      <div class="lt-row" style="margin:10px 0"><input id="mgIn" placeholder="手動輸入題組碼，例：4TJ-6NKY" style="font:inherit;padding:8px 10px;border:2px solid #ddd3bd;border-radius:10px;width:220px;text-transform:uppercase"><button class="lt-btn dark sm" id="mgRead">讀取</button></div>
      <div id="mgInfo"></div>
      <div class="lt-row" style="margin-top:12px"><button class="lt-btn dark" id="mgX">關閉</button></div></div>`;
    document.body.appendChild(md);
    const $m = id => md.querySelector('#' + id);
    $m('mgX').onclick = () => md.remove();
    md.querySelectorAll('[data-c]').forEach(b => b.onclick = () => load(b.dataset.c));
    $m('mgRead').onclick = () => { const p = L.parse($m('mgIn').value); if (!p) return ($m('mgInfo').innerHTML = '<p style="color:#c0392b;font-weight:700">題組碼不正確，請再確認一次</p>'); load(p.code); };
    async function load(code) {
      md.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('cur', b.dataset.c === code));
      $m('mgInfo').innerHTML = '<p>讀取中…</p>';
      let recs = {}; try { recs = (await L.fetch(code)) || {}; } catch (e) { return ($m('mgInfo').innerHTML = `<p style="color:#c0392b;font-weight:700">讀不到這個題組碼的紀錄：${esc(e.message)}</p>`); }
      const list = Object.values(recs).filter(r => r && r.cls && r.seat);
      if (!list.length) return ($m('mgInfo').innerHTML = '<p style="color:#c0392b;font-weight:700">這個題組碼沒有學生紀錄。</p>');
      const ts = list.map(r => r.ts || r.firstTs || 0).filter(Boolean), first = new Date(Math.min(...ts) || Date.now());
      const classes = [...new Set(list.map(r => String(r.cls)))], term = LAB.defaultTerm(first);
      const nextItem = 1 + Math.max(0, ...Object.values(API.mine).filter(x => x.term === term).map(x => +x.item || 0));
      $m('mgInfo').innerHTML = `<div style="background:#fff;border-radius:10px;padding:12px;border:2px solid #e6dcc6">
        <b class="mono">${esc(L.pretty(code))}</b>：${list.length} 位學生・班級 ${classes.map(esc).join('、')}・${first.toLocaleDateString('zh-TW')} 起${done[code] ? `<br><b style="color:#9a3a2c">⚠️ 這個題組碼已經搬到 ${done[code]}，再搬會多一個活動</b>` : ''}
        <div class="lt-form" style="margin-top:10px"><div><label>學期</label><input id="mgT" value="${esc(term)}"></div><div><label>項次</label><input id="mgI" type="number" min="1" max="99" value="${nextItem}"></div>
          <div class="w"><label>名稱</label><input id="mgN" maxlength="30" value="改版前 ${esc(classes.slice(0, 3).join('、'))}"></div></div>
        <label style="font-size:.8em;font-weight:800;color:#6b6248">這批學生的用途</label><div class="lab-uses" id="mgU" style="margin:4px 0 10px">${LAB.USES.map(u => `<button type="button" data-u="${u}">${u}</button>`).join('')}</div>
        <p id="mgErr" style="color:#c0392b;font-weight:700;min-height:1.2em"></p><button class="lt-btn" id="mgGo">📦 搬成新活動</button></div>`;
      let use = '';
      md.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { use = b.dataset.u; md.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', x === b)); });
      $m('mgGo').onclick = async () => {
        const t = LAB.toHalf($m('mgT').value).trim(), it = parseInt($m('mgI').value, 10), nm = $m('mgN').value.trim().slice(0, 30);
        if (!LAB.validTerm(t)) return ($m('mgErr').textContent = '學期格式像「115-1」');
        if (!(it >= 1 && it <= 99)) return ($m('mgErr').textContent = '項次要是 1～99');
        if (!use) return ($m('mgErr').textContent = '請選這批學生的用途');
        $m('mgGo').disabled = true; $m('mgGo').textContent = '搬移中…';
        try {
          let nc = null; for (let k = 0; k < 6 && !nc; k++) { const c = LAB.newCode(); if (!(await FB.get('lab223/m/' + c + '/meta'))) nc = c; }
          const at = Date.now(), meta = { owner: API.ME.uid, sys, term: t, item: it, name: nm, open: false, at, set: code, from: code };
          if (API.ME.admin) meta.admin = true;
          await FB.set(`lab223/m/${nc}/meta`, meta);
          await FB.set(`lab223/owners/${API.ME.uid}/${nc}`, { sys, term: t, item: it, name: nm, at, open: false, from: code });
          let ok = 0; const skip = [];
          for (const r of list) {
            const cls = String(r.cls).trim().toUpperCase(), sid = LAB.sidOf(cls, r.seat);
            if (!/^[A-Z0-9]{1,8}_[0-9]{1,2}$/.test(sid) || cls.length > 8) { skip.push(`${r.cls} ${r.seat} 號`); continue; }
            const rec = { ...r, cls, seat: Number(r.seat), name: String(r.name || '').slice(0, 12) || '（無名）', no: '', use, ts: r.ts || at };
            try { await FB.set(`lab223/m/${nc}/r/${sid}`, rec); ok++; } catch (e) { skip.push(`${r.cls} ${r.seat} 號`); }
          }
          API.mine[nc] = { sys, term: t, item: it, name: nm, at, open: false, from: code };
          md.remove(); await select(nc);
          alert(`📦 搬好了：${ok} 位學生搬到新活動 ${nc}${skip.length ? `\n\n這幾筆沒搬（班級格式不符）：${skip.join('、')}` : ''}\n\n活動維持「未開始」，舊紀錄沒有刪除。`);
        } catch (e) { $m('mgGo').disabled = false; $m('mgGo').textContent = '📦 搬成新活動'; $m('mgErr').textContent = '搬移失敗：' + (e.code || e.message); }
      };
    }
  }

  /* ---------- 即時監聽學生紀錄 ---------- */
  let unsub = null;
  API.listen = (code, cb) => {
    if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
    if (!code) return;
    unsub = FB.listen(`lab223/m/${code}/r`, v => cb(v || {}), e => { console.warn(e); cb(null, e); });
  };
  API.studentURL = studentURL;
  API.reload = () => loadMine(API.cur);

  /* ---------- 啟動 ---------- */
  if (!FB) { renderLogin(); return API; }
  API.FB = FB;
  FB.onUser(async u => {
    if (!u) return renderLogin();
    gate.innerHTML = box('<p class="note">檢查帳號中…</p>');
    const res = await W.check(FB.get, u, 'lab');
    if (!res.ok) { gate.innerHTML = W.blockedHTML(res, 'lab', '../', u.email); const lo = gate.querySelector('[data-staff-logout]'); if (lo) lo.onclick = () => FB.logout(); return; }
    API.ME = { uid: u.uid, email: u.email, name: (res.rec && res.rec.name) || u.email, admin: W.isAdmin(u) };
    gate.innerHTML = ''; main.classList.remove('hidden'); keepAwake();
    try { await loadMine(); } catch (e) { console.error(e); panel.innerHTML = `<div class="lt-box"><p style="color:#c0392b;font-weight:700">讀取活動失敗：${esc(e.code || e.message)}（Firebase 規則可能還沒更新）</p></div>`; }
  });
  return API;
}
