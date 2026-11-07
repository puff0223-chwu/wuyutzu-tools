/* =========================================================
   📊 會員中心「使用狀況」（2026-11-08，只有管理員看得到）
   ---------------------------------------------------------
   三層：
   ① 🔋 資料庫額度：Firebase（事務所的系統）、Supabase（課堂小鎮）各用了多少、燈號、成長曲線與預估
   ② 👥 每位老師 × 每個系統：建了幾個測驗／活動／班級、多少學生作答
   ③ 🕐 最後使用日：老師打開系統時記下（staffseen），久沒用的一眼看出來
   資料來源：
   - stats/summary、stats/history：課堂小鎮伺服器（/api/teacher/stats）盤點後寫入；每週一自動，也可以按「🔄 現在重新統計」
   - staffseen：各系統打開時寫入
   免費方案「看不到」的數字（Firebase 每月下載、同時連線；Supabase 每月流量）在 summary 裡是 null，
   這裡就顯示「到控制台看」的按鈕；以後升級、伺服器填了數字，這裡會自動變成量表，不用改程式。
   ========================================================= */
const TOWN = 'https://grade-query-system-coral.vercel.app';
const FB_USAGE = 'https://console.firebase.google.com/project/point-collection-stash/database/point-collection-stash-default-rtdb/usage';
const SB_USAGE = 'https://supabase.com/dashboard/projects';
const DAY = 86400e3;
// 每個系統要顯示哪些數字
const METRICS = {
  exam: [['tests', '測驗'], ['banks', '題庫'], ['answers', '作答']],
  lab: [['acts', '活動'], ['records', '紀錄']],
  src: [['tasks', '任務'], ['records', '作答']],
  seat: [['classes', '班級']],
  gps: [['banks', '題庫'], ['runs', '場次']],
  excel: [['codes', '代碼'], ['students', '學生']],
  grade: [['courses', '課程'], ['students', '學生']],
  cc: [['cases', '課堂'], ['groups', '小隊']],
  game: [['classes', '班級'], ['players', '勇者']],
};
const DRAWER_NAME = {
  exam: '📝 線上檢定所', 'bond-society': '🕯️ 隱秘的鍵結社', 'sci-history': '📖 時光手稿', 'secret-source': '📜 出處失傳的秘文', showcase: '🏛️ 教師展覽館',
  lab223: '⚗️ 化學實驗室', seating: '🪑 座位大作戰', 'unit-convert': '📜 失落的配方（舊）', fp: '🪙 集點小金庫', 'ph-generator': '🧪 消失的指示劑（舊）',
  'excel-rescue': '📊 消失的實驗數據（舊）', 'excel-rescue-t': '📊 消失的實驗數據', 'case-board': '📌 案件委託公告欄', 'missing-equipment': '🔍 消失的實驗器材',
  staff: '👥 會員中心', orienteering: '🧭 遺落的地點', stats: '📊 使用統計', staffseen: '📊 最後使用日',
};
const C = { data: null, loading: false, err: '', auto: false, filter: 'all', app: '' };

const fmtB = (b) => (b == null ? '—' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB');
const light = (p) => (p == null ? ['⚪', 'na', '看不到'] : p >= 80 ? ['🔴', 'red', '該準備升級了'] : p >= 50 ? ['🟡', 'yel', '開始注意'] : ['🟢', 'grn', '很充足']);
const ago = (t) => { if (!t) return '從來沒有'; const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? '今天' : d === 1 ? '昨天' : d < 30 ? d + ' 天前' : d < 365 ? Math.floor(d / 30) + ' 個月前' : '一年以上'; };
const dayOf = (s) => (s ? Date.parse(s + 'T00:00:00+08:00') : 0);

function css() {
  if (document.getElementById('stCss')) return;
  const s = document.createElement('style'); s.id = 'stCss';
  s.textContent = `
  .st-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 6px}.st-head h2{font-family:'Noto Serif TC',serif;font-size:1.25em}.st-head .sp{flex:1}
  .st-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:10px 0}
  .st-card{background:#fff;border:2px solid var(--ink);border-radius:14px;padding:14px 16px;box-shadow:3px 3px 0 var(--ink)}
  .st-card h3{font-size:1.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
  .meter{margin:10px 0}.meter .lb{display:flex;justify-content:space-between;font-size:.9em;font-weight:700;gap:8px;flex-wrap:wrap}
  .meter .bar{height:14px;border-radius:999px;background:#efe9dc;overflow:hidden;margin-top:4px;border:1.5px solid var(--line)}
  .meter .bar i{display:block;height:100%;border-radius:999px;background:var(--teal)}.meter.yel .bar i{background:var(--gold)}.meter.red .bar i{background:var(--red)}
  .meter .na{font-size:.86em;color:var(--muted);margin-top:4px}.meter .na a{color:var(--ink);font-weight:800}
  .st-list{font-size:.85em;margin-top:6px}.st-list div{display:flex;justify-content:space-between;border-top:1px dashed var(--line);padding:3px 0}
  .st-note{background:var(--gold-soft);border:1.5px solid var(--gold);border-radius:10px;padding:8px 12px;font-size:.9em;margin:8px 0;line-height:1.7}
  .st-note.grn{background:var(--teal-soft);border-color:#9fd6cd}.st-note.red{background:var(--red-soft);border-color:#f2b3a0}
  .st-chart{width:100%;height:150px;background:#fffdf8;border:1.5px solid var(--line);border-radius:10px}
  .tu{display:flex;flex-wrap:wrap;gap:6px}.tu .ap{border:1.5px solid var(--line);border-radius:10px;padding:4px 9px;font-size:.84em;line-height:1.45;background:#fff;min-width:130px}
  .tu .ap b{display:block}.tu .ap.zzz{border-style:dashed;background:#f6f5f2;color:var(--muted)}.tu .ap .seen{font-size:.86em;color:var(--muted)}
  .st-help li{margin:6px 0 6px 1.2em;line-height:1.7;font-size:.94em}
  @media(max-width:700px){.st-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}

async function load(FB) {
  const [summary, history, seen] = await Promise.all(['stats/summary', 'stats/history', 'staffseen'].map((p) => FB.get(p).catch(() => null)));
  C.data = { summary, history: history || {}, seen: seen || {} };
}
async function refresh(FB, force) {
  C.loading = true; C.err = '';
  try {
    const tok = await FB.user().getIdToken();
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 45000);
    const r = await fetch(TOWN + '/api/teacher/stats' + (force ? '?force=1' : ''), { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    await load(FB);
    return j;
  } catch (e) { C.err = e.name === 'AbortError' ? '統計太久沒有回應，請稍後再試' : (e.message || String(e)); return null; }
  finally { C.loading = false; }
}

export async function renderStats(box, ctx) {
  const { FB, W, esc, toast } = ctx;
  css();
  if (!C.data && !C.loading) {
    box.innerHTML = '<p class="muted" style="margin:16px 0">讀取使用狀況…</p>';
    await load(FB);
  }
  const S = C.data && C.data.summary;
  // 沒有統計過、或超過 7 天 → 自動重新統計一次
  if ((!S || Date.now() - S.at > 7 * DAY) && !C.auto && !C.loading) {
    C.auto = true;
    box.innerHTML = '<p class="muted" style="margin:16px 0">⏳ 第一次（或超過一週）打開：正在盤點兩個資料庫，大約 10～20 秒…</p>';
    await refresh(FB);
    return renderStats(box, ctx);
  }
  draw(box, ctx);
}

function meter(label, used, limit, extraNa) {
  if (used == null) return `<div class="meter"><div class="lb"><span>${label}</span><span class="muted">⚪ 免費方案看不到</span></div><div class="na">${extraNa}</div></div>`;
  const p = limit ? Math.min(100, (used / limit) * 100) : null, [ic, cls, tx] = light(p);
  return `<div class="meter ${cls}"><div class="lb"><span>${label}</span><span>${ic} ${fmtB(used)}／${fmtB(limit)}（${p < 1 ? p.toFixed(2) : p.toFixed(1)}%・${tx}）</span></div><div class="bar"><i style="width:${Math.max(p, 0.6)}%"></i></div></div>`;
}

function chart(hist, limits) {
  const pts = Object.values(hist || {}).filter((h) => h && h.at).sort((a, b) => a.at - b.at);
  if (pts.length < 2) return { svg: '<div class="st-note">📈 成長曲線要累積兩次以上的統計（每週一自動一次）才畫得出來。</div>', pred: '' };
  const W = 600, H = 150, P = 26, t0 = pts[0].at, t1 = pts[pts.length - 1].at || t0 + 1;
  const maxP = Math.max(5, ...pts.map((p) => Math.max((p.fb || 0) / limits.fb, (p.sb || 0) / limits.sb) * 100)) * 1.2;
  const x = (t) => P + ((t - t0) / Math.max(1, t1 - t0)) * (W - P * 2), y = (pc) => H - P - (pc / maxP) * (H - P * 2);
  const line = (k, lim, color) => { const q = pts.filter((p) => p[k] != null); if (q.length < 2) return ''; return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${q.map((p) => `${x(p.at).toFixed(1)},${y((p[k] / lim) * 100).toFixed(1)}`).join(' ')}"/>`; };
  const svg = `<svg class="st-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="用量成長曲線">
    <line x1="${P}" x2="${W - P}" y1="${y(0)}" y2="${y(0)}" stroke="#d9d2c3"/><text x="4" y="${y(maxP / 1.2) + 4}" font-size="11" fill="#7a8196">${(maxP / 1.2).toFixed(0)}%</text><text x="4" y="${y(0) + 4}" font-size="11" fill="#7a8196">0%</text>
    ${line('fb', limits.fb, '#1f9e8f')}${line('sb', limits.sb, '#e4572e')}
    <text x="${P}" y="14" font-size="12" fill="#1f9e8f">━ Firebase 存放</text><text x="${P + 130}" y="14" font-size="12" fill="#e4572e">━ 課堂小鎮資料庫</text></svg>`;
  // 預估：照最近的成長速度，幾個月後到 80%
  const est = (k, lim, name) => {
    const q = pts.filter((p) => p[k] != null); if (q.length < 2) return '';
    const a = q[0], b = q[q.length - 1], perDay = (b[k] - a[k]) / Math.max(1, (b.at - a.at) / DAY);
    if (perDay <= 0) return `${name}：最近沒有變大。`;
    const days = (lim * 0.8 - b[k]) / perDay;
    return `${name}：每天約多 ${fmtB(perDay)}，${days <= 0 ? '已經超過 80%' : `照這個速度約 <b>${days > 3650 ? '10 年以上' : days > 60 ? Math.round(days / 30) + ' 個月' : Math.round(days) + ' 天'}</b>後到 80%`}。`;
  };
  return { svg, pred: [est('fb', limits.fb, 'Firebase'), est('sb', limits.sb, '課堂小鎮')].filter(Boolean).join('<br>') };
}

function draw(box, { FB, W, esc, toast }) {
  const D = C.data || {}, S = D.summary;
  const head = `<div class="st-head"><h2>📊 使用狀況</h2><span class="small muted">${S ? `上次統計：${new Date(S.at).toLocaleString('zh-TW')}（${S.by === 'cron' ? '每週自動' : '手動'}）` : '還沒有統計'}</span><span class="sp"></span>
    <button class="btn sm" id="stGo" ${C.loading ? 'disabled' : ''}>${C.loading ? '⏳ 統計中…' : '🔄 現在重新統計'}</button></div>
    ${C.err ? `<div class="st-note red">😵 統計沒有成功：${esc(C.err)}</div>` : ''}`;
  if (!S) { box.innerHTML = head + '<p class="muted">還沒有統計資料。按「🔄 現在重新統計」試試看。</p>'; bind(); return; }
  const Q = S.quota || {}, F = Q.firebase || {}, B = Q.supabase || {};
  const fs = F.storage || {}, sdb = B.db || {};
  const pf = fs.used != null ? (fs.used / fs.limit) * 100 : null, ps = sdb.used != null ? (sdb.used / sdb.limit) * 100 : null;
  const worst = Math.max(pf || 0, ps || 0), [wi] = light(worst);
  const drawers = Object.entries(F.drawers || {}).sort((a, b) => (b[1].bytes || 0) - (a[1].bytes || 0));
  const { svg, pred } = chart(D.history, { fb: fs.limit || 1, sb: sdb.limit || 1 });
  const quota = `<div class="st-note ${worst >= 80 ? 'red' : worst >= 50 ? '' : 'grn'}">${wi} ${worst >= 80 ? '有資料庫超過 80%，該準備升級或清理舊資料了。' : worst >= 50 ? '有資料庫超過一半，開始注意成長速度。' : '兩個資料庫的存放量都很充足。'}</div>
    <div class="st-grid">
      <div class="st-card"><h3>🔥 Firebase<span class="small muted">（事務所的系統）</span></h3>
        ${meter('🗄️ 存放', fs.used, fs.limit)}${fs.partial ? '<div class="small muted">（🧭 遺落的地點的照片沒有算進來，看 GitHub 每週報告）</div>' : ''}
        ${meter('📦 每月下載', (F.download || {}).used, (F.download || {}).limit, `額度 10 GB／月。<a href="${FB_USAGE}" target="_blank" rel="noopener">打開 Firebase 用量圖表 ↗</a>`)}
        ${meter('🪑 同時連線', (F.conn || {}).used, (F.conn || {}).limit, `上限 100 條。<a href="${FB_USAGE}" target="_blank" rel="noopener">看連線圖表 ↗</a>　兩場大型即時活動不要同時開。`)}
        <details><summary class="small" style="cursor:pointer;font-weight:700">每個系統各佔多少</summary><div class="st-list">${drawers.slice(0, 14).map(([k, d]) => `<div><span>${esc(DRAWER_NAME[k] || k)}</span><span>${d.heavy ? '（照片多，另外秤）' : fmtB(d.bytes)}</span></div>`).join('')}</div></details></div>
      <div class="st-card"><h3>🏘️ 課堂小鎮<span class="small muted">（Supabase）</span></h3>
        ${B.error ? `<div class="st-note red">讀不到課堂小鎮：${esc(B.error)}</div>` : sdb.needSql ? `<div class="st-note">🧩 要量資料庫大小，請到 Supabase → SQL Editor 貼上 <b>supabase/018_stats.sql</b> 按 Run（只要一次）。</div>` : meter('🗄️ 資料庫', sdb.used, sdb.limit)}
        ${meter('📦 每月流量', (B.egress || {}).used, (B.egress || {}).limit, `額度 5 GB／月。<a href="${SB_USAGE}" target="_blank" rel="noopener">打開 Supabase 用量頁 ↗</a>`)}
        <div class="small muted" style="margin-top:6px">⚠️ 免費方案一週沒人用會暫停（已經有每週兩次的保活排程）。</div>
        ${(B.tables || []).length ? `<details><summary class="small" style="cursor:pointer;font-weight:700">最大的幾張表</summary><div class="st-list">${B.tables.slice(0, 10).map((t) => `<div><span>${esc(t.name)}</span><span>${fmtB(t.bytes)}</span></div>`).join('')}</div></details>` : ''}</div>
    </div>
    <div class="st-card"><h3>📈 成長曲線</h3>${svg}${pred ? `<p class="small" style="margin-top:6px;line-height:1.8">${pred}</p>` : ''}</div>`;

  // ② ③ 每位老師
  const T = Object.entries(S.teachers || {}).map(([k, t]) => ({ k, ...t }));
  const seen = D.seen || {};
  const rows = T.map((t) => {
    const apps = Object.keys(METRICS).filter((a) => (t.apps || {})[a] || (t.use || {})[a] || (seen[t.k] || {})[a] || t.admin);
    const cells = apps.map((a) => {
      const u = (t.use || {})[a] || {}, s = dayOf((seen[t.k] || {})[a]) || (['grade', 'cc', 'game'].includes(a) && t.town && t.town.checked && (u && Object.keys(u).length) ? 0 : 0);
      const nums = METRICS[a].map(([key, lab]) => `${u[key] || 0} ${lab}`).join('・');
      const empty = !METRICS[a].some(([key]) => u[key]) && !s;
      return { a, empty, s, html: `<div class="ap ${empty ? 'zzz' : ''}"><b>${W.APPS[a] ? esc(W.APPS[a].name) : a}</b>${nums}<div class="seen">${empty ? '💤 核准了還沒用' : '🕐 上次 ' + ago(s)}</div></div>` };
    }).filter((c) => !C.app || c.a === C.app);
    const score = cells.reduce((n, c) => n + (c.empty ? 0 : 1), 0), last = Math.max(0, ...cells.map((c) => c.s || 0));
    return { t, cells, score, last, zzz: cells.some((c) => c.empty) };
  }).filter((r) => r.cells.length && (C.filter === 'all' || (C.filter === 'zzz' ? r.zzz : C.filter === 'old' ? r.last && Date.now() - r.last > 60 * DAY : true)))
    .sort((a, b) => (b.t.admin ? 1 : 0) - (a.t.admin ? 1 : 0) || b.score - a.score || b.last - a.last);
  const people = `<div class="st-head"><h2 style="font-size:1.1em">👥 每位老師的使用情況</h2><span class="sp"></span>
      <select id="stApp" style="padding:4px 8px;border:2px solid var(--line);border-radius:8px"><option value="">全部系統</option>${Object.keys(METRICS).map((a) => `<option value="${a}" ${C.app === a ? 'selected' : ''}>${W.APPS[a] ? esc(W.APPS[a].name) : a}</option>`).join('')}</select></div>
    <div class="tabs">${[['all', '全部'], ['zzz', '💤 核准了還沒用'], ['old', '🕸️ 超過兩個月沒用']].map(([k, t]) => `<button data-sf="${k}" class="${C.filter === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="tblw"><table class="tbl"><thead><tr><th>老師</th><th>各系統的使用情況（數量・上次使用）</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td style="min-width:150px"><b>${esc(r.t.name || r.t.email)}</b>${r.t.admin ? ' <span class="chip ink">管理員</span>' : ''}<div class="small muted">${esc(r.t.school || '')}</div><div class="small muted">${esc(r.t.email)}</div>${r.t.status && r.t.status !== 'approved' ? `<span class="chip ${r.t.status === 'pre' ? 'pre' : 'bad'}">${esc(W.STATUS[r.t.status] || (r.t.status === 'pre' ? '🎫 預先開通' : r.t.status))}</span>` : ''}</td>
      <td><div class="tu">${r.cells.map((c) => c.html).join('')}</div></td></tr>`).join('') || '<tr><td colspan="2" class="muted" style="text-align:center;padding:16px">沒有符合的老師</td></tr>'}
    </tbody></table></div>
    <p class="small muted" style="margin-top:6px">「上次使用」從 2026-11-08 開始記錄，之前的會顯示「從來沒有」。數量是統計當下的數字（每週一更新）。</p>`;

  const help = `<div class="st-card" style="margin-top:14px"><h3>📖 什麼時候該升級？</h3><ul class="st-help">
    <li><b>🟢 50% 以下</b>：放心用。<b>🟡 50～80%</b>：注意「成長曲線」的預估；可以先清掉舊學期的測試資料。<b>🔴 80% 以上</b>：準備升級。</li>
    <li><b>Firebase 最容易先滿的通常是「同時連線 100 條」</b>（大型即時活動），其次才是每月下載 10 GB。這兩個要到控制台看圖表；如果常常碰到上限，就是升級的時候。</li>
    <li><b>課堂小鎮（Supabase）</b>：資料庫 500 MB、每月流量 5 GB。老師和學生變多時，流量通常比資料庫先滿。</li>
    <li><b>升級之後</b>：現在「⚪ 免費方案看不到」的數字，伺服器就能讀到；只要在盤點程式補上那幾個數字，這一頁會自動變成量表與曲線，不用重做。</li></ul></div>`;

  box.innerHTML = head + quota + people + help;
  bind();
  function bind() {
    const go = document.getElementById('stGo');
    if (go) go.onclick = async () => { go.disabled = true; go.textContent = '⏳ 統計中…'; const r = await refresh(FB); if (r && r.skipped === 'recent') toast('10 分鐘內剛統計過，先顯示上一次的結果'); else if (r) toast('✅ 統計完成'); draw(box, { FB, W, esc, toast }); };
    box.querySelectorAll('[data-sf]').forEach((b) => { b.onclick = () => { C.filter = b.dataset.sf; draw(box, { FB, W, esc, toast }); }; });
    const ap = document.getElementById('stApp'); if (ap) ap.onchange = () => { C.app = ap.value; draw(box, { FB, W, esc, toast }); };
  }
}
