/* =========================================================
   ⚗️ 化學實驗室 No.223：三個系統共用的「活動」核心（學生頁、老師頁都會載入）
   消失的實驗器材（eq）、消失的指示劑（ph）、失落的配方（unit）
   ---------------------------------------------------------
   雲端抽屜 lab223/（2026-10-22 新增）
     owners/<老師 uid>/<活動代碼>  { sys, term, item, name, at, open }   老師自己的活動清單
     m/<活動代碼>/meta              { owner, sys, term, item, name, open, at, set }
                                     set：ph／unit＝7 碼題組碼（題目設定都在裡面）；eq＝"題數|命數|類別"
     m/<活動代碼>/r/<班級_座號>      學生紀錄 { cls, seat, no, name, use, ts, …各系統自己的欄位 }
   學生頁只用 REST（fetch），不載 Firebase SDK；活動「停止」後規則會擋學生寫入
   ========================================================= */
const LAB = (() => {
  const FB_URL = 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app';
  const ROOT = 'lab223';
  const SYS = {
    eq: { name: '消失的實驗器材', icon: '🔍', page: 'missing-equipment.html', teacher: 'missing-equipment-teacher.html', case: '第一案' },
    ph: { name: '消失的指示劑', icon: '🧪', page: 'ph-generator.html', teacher: 'ph-generator-teacher.html', case: '第二案' },
    unit: { name: '失落的配方', icon: '📜', page: 'unit-generator.html', teacher: 'unit-generator-teacher.html', case: '第三案' }
  };
  const USES = ['正式進度', '考試複習', '重補修'];
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 不用 I、O、0、1，避免看錯
  const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

  /* ---------- 小工具 ---------- */
  const toHalf = s => String(s ?? '').replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normCode = s => toHalf(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normClass = s => toHalf(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const sidOf = (cls, seat) => `${normClass(cls)}_${Number(seat)}`;
  function newCode() { let c = ''; const a = new Uint32Array(6); crypto.getRandomValues(a); a.forEach(v => { c += CODE_CH[v % CODE_CH.length]; }); return c; }
  // 學期：8 月～隔年 1 月是上學期，2～7 月是下學期（民國年）
  function defaultTerm(d = new Date()) {
    const y = d.getFullYear() - 1911, m = d.getMonth() + 1;
    return m >= 8 ? `${y}-1` : m >= 2 ? `${y - 1}-2` : `${y - 1}-1`;
  }
  const validTerm = t => /^[0-9]{2,3}-[12]$/.test(String(t || ''));
  const label = m => m ? `${m.term} 第 ${m.item} 次${m.name ? '・' + m.name : ''}` : '';

  /* ---------- 雲端（REST） ---------- */
  const url = p => `${FB_URL}/${ROOT}/${p}.json`;
  async function req(p, method = 'GET', body) {
    const r = await fetch(url(p), { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return r.json();
  }
  const getMeta = code => req(`m/${code}/meta`);
  const getRec = (code, sid) => req(`m/${code}/r/${encodeURIComponent(sid)}`);
  const putRec = (code, sid, rec) => req(`m/${code}/r/${encodeURIComponent(sid)}`, 'PUT', rec);
  const patchRec = (code, sid, obj) => req(`m/${code}/r/${encodeURIComponent(sid)}`, 'PATCH', obj);
  const getAll = code => req(`m/${code}/r`);

  /* ---------- 學生登入（用途、班級、座號、學號、姓名） ----------
     LAB.studentLogin({ el, sys, onReady })：畫出表單；按「進入」→ 讀活動 → 檢查系統與開放狀態 → onReady(info)
     info = { code, meta, cls, seat, no, name, use, sid }                                                */
  const KEY = 'lab223-student';
  let css = false;
  function injectCSS() {
    if (css) return; css = true;
    const st = document.createElement('style');
    st.textContent = `
    .lab-login { display: grid; gap: 12px; }
    .lab-login .lab-g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lab-login .lab-w { grid-column: 1 / -1; }
    .lab-login label.lab-l { display: block; font-size: .82em; font-weight: 700; color: var(--lab-label, #6b6248); margin-bottom: 4px; }
    .lab-login input.lab-in { width: 100%; font: inherit; font-size: 1.05em; padding: 11px 12px; border-radius: 10px; border: 2px solid var(--lab-line, #e3ddca); background: #fff; color: var(--lab-text, #1f2d30); outline: none; }
    .lab-login input.lab-in:focus { border-color: var(--lab-accent, #ffb627); }
    .lab-login .lab-code { font-family: 'JetBrains Mono', monospace; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; }
    .lab-uses { display: flex; gap: 8px; flex-wrap: wrap; }
    .lab-uses button { flex: 1 1 0; min-width: 92px; font: inherit; font-weight: 800; padding: 10px 8px; border-radius: 10px; border: 2px solid var(--lab-line, #e3ddca); background: #fff; color: var(--lab-text, #1f2d30); cursor: pointer; }
    .lab-uses button.on { background: var(--lab-accent, #ffb627); border-color: var(--lab-accent, #ffb627); color: #1a1a1a; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
    .lab-err { color: #d6403a; font-weight: 700; min-height: 1.3em; font-size: .92em; }
    .lab-actchip { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: rgba(0,0,0,.05); border-radius: 10px; padding: 8px 12px; font-size: .92em; color: var(--lab-text, #1f2d30); }
    .lab-actchip b { font-family: 'JetBrains Mono', monospace; letter-spacing: .12em; }
    .lab-actchip button { margin-left: auto; font: inherit; font-size: .85em; background: none; border: none; text-decoration: underline; cursor: pointer; color: inherit; }
    .lab-wait { text-align: center; padding: 18px 8px; color: var(--lab-text, #1f2d30); line-height: 1.8; }
    .lab-wait .big { font-size: 2.4em; }
    .lab-stop { position: fixed; inset: 0; z-index: 900; background: rgba(10,14,20,.82); display: flex; align-items: center; justify-content: center; padding: 18px; }
    .lab-stop > div { background: #fffaf0; color: #222; border-radius: 16px; padding: 22px; max-width: 420px; text-align: center; line-height: 1.8; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
    .lab-stop .big { font-size: 2.6em; }
    @media (max-width: 480px) { .lab-login .lab-g { grid-template-columns: 1fr 1fr; } }`;
    document.head.appendChild(st);
  }
  function studentLogin({ el, sys, onReady, intro = '' }) {
    injectCSS();
    const qs = new URLSearchParams(location.search);
    const fromUrl = normCode(qs.get('a') || '');
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    let use = saved.use || '';
    let codeLocked = CODE_RE.test(fromUrl);
    const draw = (err = '') => {
      el.innerHTML = `<div class="lab-login">${intro}
        ${codeLocked ? `<div class="lab-actchip">🔑 活動代碼 <b>${fromUrl}</b><button type="button" id="lab-chg">換一個代碼</button></div>`
          : `<div><label class="lab-l" for="lab-code">活動代碼（老師給的 6 個字）</label><input class="lab-in lab-code" id="lab-code" maxlength="8" autocomplete="off" placeholder="例：K7QH3M" value="${esc(saved.code || '')}"></div>`}
        <div><label class="lab-l">用途</label><div class="lab-uses">${USES.map(u => `<button type="button" data-use="${u}" class="${use === u ? 'on' : ''}">${u}</button>`).join('')}</div></div>
        <div class="lab-g">
          <div><label class="lab-l" for="lab-cls">班級</label><input class="lab-in" id="lab-cls" maxlength="8" placeholder="例：101" value="${esc(saved.cls || '')}"></div>
          <div><label class="lab-l" for="lab-seat">座號</label><input class="lab-in" id="lab-seat" type="number" inputmode="numeric" min="1" max="99" placeholder="例：7" value="${esc(saved.seat || '')}"></div>
          <div><label class="lab-l" for="lab-no">學號</label><input class="lab-in" id="lab-no" maxlength="12" autocomplete="off" placeholder="例：1150123" value="${esc(saved.no || '')}"></div>
          <div><label class="lab-l" for="lab-name">姓名</label><input class="lab-in" id="lab-name" maxlength="12" placeholder="你的名字" value="${esc(saved.name || '')}"></div>
        </div>
        <div class="lab-err" id="lab-err">${esc(err)}</div>
        <button type="button" class="btn" id="lab-go" style="width:100%">進入活動 ▶</button></div>`;
      el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { use = b.dataset.use; el.querySelectorAll('[data-use]').forEach(x => x.classList.toggle('on', x === b)); });
      const chg = el.querySelector('#lab-chg'); if (chg) chg.onclick = () => { codeLocked = false; saved.code = ''; draw(); };
      el.querySelector('#lab-go').onclick = go;
      el.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) go(); }));
    };
    async function go() {
      const v = id => (el.querySelector('#' + id) || {}).value || '';
      const code = codeLocked ? fromUrl : normCode(v('lab-code'));
      const cls = normClass(v('lab-cls')), seat = parseInt(toHalf(v('lab-seat')), 10), no = toHalf(v('lab-no')).trim().toUpperCase(), name = v('lab-name').trim();
      saved = { code, cls, seat: isNaN(seat) ? '' : seat, no, name, use };
      const bad = m => draw(m);
      if (!CODE_RE.test(code)) return bad('活動代碼是 6 個英文或數字，請再確認一次');
      if (!use) return bad('請先選「用途」');
      if (!cls) return bad('請填班級');
      if (!(seat >= 1 && seat <= 99)) return bad('座號要是 1～99 的數字');
      if (!/^[A-Z0-9]{3,12}$/.test(no)) return bad('學號要是 3～12 個英文或數字');
      if (!name) return bad('請填姓名');
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
      const btn = el.querySelector('#lab-go'); btn.disabled = true; btn.textContent = '連線中…';
      let meta = null;
      try { meta = await getMeta(code); } catch (e) { return bad('連不上伺服器，請確認網路後再試一次'); }
      if (!meta) return bad('找不到這個活動代碼，請向老師確認');
      if (meta.sys !== sys && SYS[meta.sys]) { location.href = SYS[meta.sys].page + '?a=' + code; return; }   // 代碼是別的系統的 → 自動帶過去
      const info = { code, meta, cls, seat, no, name: name.slice(0, 12), use, sid: sidOf(cls, seat) };
      if (meta.open !== true) return waitOpen(info);
      onReady(info);
    }
    // 活動還沒開始（或已停止）：每 5 秒看一次，老師按「開始」就自動進入
    function waitOpen(info) {
      el.innerHTML = `<div class="lab-wait"><div class="big">⏳</div><b>${esc(label(info.meta))}</b><br>老師還沒開始這個活動（或活動已經結束）。<br>老師按下「開始」後，這裡會自動進入。<div style="margin-top:10px;font-size:.85em;opacity:.75">${esc(info.cls)} 班 ${info.seat} 號 ${esc(info.name)}・${esc(info.use)}</div>
        <button type="button" class="btn dark" id="lab-back" style="margin-top:12px">← 改資料</button></div>`;
      el.querySelector('#lab-back').onclick = () => { clearInterval(t); draw(); };
      const t = setInterval(async () => {
        if (document.hidden) return;
        try { const m = await getMeta(info.code); if (m && m.open === true) { clearInterval(t); info.meta = m; onReady(info); } } catch (e) {}
      }, 5000);
    }
    if (saved.use && !use) use = saved.use;
    draw();
  }

  /* ---------- 作答中：老師按「停止」就鎖住 ----------
     LAB.watch(code, onChange)：每 15 秒看一次活動是否開放；onChange(open) 只在狀態改變時呼叫
     LAB.stopOverlay(show, meta)：顯示／移除「活動已停止」遮罩                                     */
  function watch(code, onChange) {
    let last = true;
    const check = async () => {
      if (document.hidden) return;
      try { const m = await getMeta(code); const open = !!(m && m.open === true); if (open !== last) { last = open; onChange(open, m); } } catch (e) {}
    };
    const t = setInterval(check, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    return { check, stop: () => clearInterval(t), get open() { return last; }, set open(v) { last = v; } };
  }
  function stopOverlay(show, meta) {
    injectCSS();
    let ov = document.getElementById('lab-stop');
    if (!show) { if (ov) ov.remove(); return; }
    if (!ov) { ov = document.createElement('div'); ov.id = 'lab-stop'; ov.className = 'lab-stop'; document.body.appendChild(ov); }
    ov.innerHTML = `<div><div class="big">⏸</div><b>老師已經停止這個活動</b><br>${esc(label(meta))}<br>作答已經鎖住，你的紀錄都已存好。<br><span style="font-size:.85em;opacity:.7">老師重新開始後，這個畫面會自動消失。</span></div>`;
  }
  // 寫入失敗時判斷是不是因為活動停止了（規則擋下會回 401／403）
  async function isClosed(code) { try { const m = await getMeta(code); return !(m && m.open === true); } catch (e) { return false; } }

  return { FB_URL, ROOT, SYS, USES, CODE_RE, esc, toHalf, normCode, normClass, sidOf, newCode, defaultTerm, validTerm, label,
    req, getMeta, getRec, putRec, patchRec, getAll, studentLogin, watch, stopOverlay, isClosed, injectCSS };
})();
if (typeof module !== 'undefined') module.exports = LAB;
