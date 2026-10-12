/* 🧭 遺落的地點：第三階段「📊 統計」與「🗺️ 路線回放」
   資料來源：活動的作答紀錄（log），老師按按鈕時才讀一次，不會多花即時連線。
   - 點位統計：哪些點最難（答錯多、PASS 多、找很久）
   - 視角統計：遠景／特寫、平視／仰角…哪一種全班最弱；站位挑戰的答對率
   - 路線回放：把各組「依序找到的地點」連成線，拉時間軸看大家怎麼跑 */
const { $, $$, esc, modal, imgTag, zoomImg } = window.TT;
const G = window.GPS;

const DIST_L = Object.fromEntries(G.VIEW_DIST), ANGLE_L = Object.fromEntries(G.VIEW_ANGLE);

export function computeStats(ctx, log) {
  const b = ctx.bank, byNo = {}, zm = G.zoneById(b);
  G.sortedPoints(b).forEach((p) => { byNo[p.no] = p; });
  const L = Object.values(log || {}).sort((a, c) => a.t - c.t);
  // ---- 點位 ----
  const pts = {};
  const P = (no) => pts[no] || (pts[no] = { no, ok: 0, wrong: 0, hint: 0, pass: 0, durs: [], cam: 0, camFull: 0 });
  L.forEach((l) => {
    if (!l.no) return;
    const x = P(l.no);
    if (l.kind === 'ok') { x.ok++; if (l.dur != null) x.durs.push(l.dur); }
    else if (l.kind === 'wrong') x.wrong++;
    else if (l.kind === 'hint') x.hint++;
    else if (['passOK', 'skip', 'giveup'].includes(l.kind)) x.pass++;
    else if (l.kind === 'cam') { x.cam++; if (l.got === 1) x.camFull++; }
  });
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const points = Object.values(pts).filter((x) => byNo[x.no]).map((x) => {
    const p = byNo[x.no], a = avg(x.durs);
    // 難度指數：答錯 1、提示 0.5、放棄／PASS 2、平均每多找 1 分鐘 0.5（只是拿來排序的參考值）
    const diff = +(x.wrong + x.hint * 0.5 + x.pass * 2 + (a != null ? a / 120 : 0)).toFixed(1);
    return { ...x, name: p.name, zone: (zm[p.zone] || {}).name || '', view: G.viewLabel(p.view), photo: p.photos[0], avg: a, diff, tries: x.ok + x.wrong + x.pass };
  }).sort((a, c) => c.diff - a.diff || a.no - c.no);
  // ---- 視角 ----
  const groups = [];
  const addG = (group, label, test) => {
    const sel = points.filter((x) => test(byNo[x.no]));
    const ok = sel.reduce((s, x) => s + x.ok, 0), wrong = sel.reduce((s, x) => s + x.wrong, 0), durs = sel.flatMap((x) => x.durs);
    const camN = sel.reduce((s, x) => s + x.cam, 0), camF = sel.reduce((s, x) => s + x.camFull, 0);
    if (!ok && !wrong && !camN) return;
    groups.push({ group, label, ok, wrong, wrongRate: ok + wrong ? Math.round(wrong / (ok + wrong) * 100) : 0, avg: avg(durs), camN, camRate: camN ? Math.round(camF / camN * 100) : null, n: sel.length });
  };
  G.VIEW_DIST.forEach(([k, l]) => addG('距離', l, (p) => (p.view.dist || '') === k));
  G.VIEW_ANGLE.forEach(([k, l]) => addG('角度', l, (p) => (p.view.angle || '') === k));
  addG('特殊', '奇特視角', (p) => p.view.odd);
  // 最弱：至少 3 次作答、答錯率最高的
  const cand = groups.filter((g) => g.ok + g.wrong >= 3 && g.label !== '未標');
  const weakest = cand.length ? cand.slice().sort((a, c) => c.wrongRate - a.wrongRate || (c.avg || 0) - (a.avg || 0))[0] : null;
  // ---- 加分挑戰 ----
  const teamName = (tid) => ((ctx.st.teams || {})[tid] || {}).name || '';
  const chal = L.filter((l) => ['cam', 'task', 'taskJudge'].includes(l.kind)).map((l) => {
    const p = byNo[l.no] || {};
    return {
      time: new Date(l.t).toLocaleTimeString('zh-TW', { hour12: false }), team: teamName(l.tid), kind: l.kind === 'cam' ? '🦶 站位挑戰' : l.kind === 'task' ? '🔍 觀察任務' : '🔍 老師判定',
      no: l.no, name: p.name || '', q: l.kind === 'cam' ? '拍照的人站哪裡、朝哪個方向' : (p.task || {}).q || '', text: l.kind === 'cam' ? `距離差 ${l.d}、方向差 ${l.dd} 格` : l.text || '',
      result: l.kind === 'cam' ? (l.got === 1 ? '全對' : l.got ? '站位對（方向錯）' : '不對') : l.ok === 1 ? '對' : l.ok === -1 ? '等老師判定' : '錯'
    };
  });
  const camAll = L.filter((l) => l.kind === 'cam'), taskAll = L.filter((l) => l.kind === 'task' || l.kind === 'taskJudge');
  const oks = L.filter((l) => l.kind === 'ok');
  return {
    points, views: groups, weakest, chal,
    sum: {
      ok: oks.length, wrong: L.filter((l) => l.kind === 'wrong').length, hint: L.filter((l) => l.kind === 'hint').length, pass: L.filter((l) => ['passOK', 'skip', 'giveup'].includes(l.kind)).length,
      avg: avg(oks.map((l) => l.dur).filter((v) => v != null)), cam: camAll.length, camFull: camAll.filter((l) => l.got === 1).length, camHalf: camAll.filter((l) => l.got === 0.5).length,
      task: L.filter((l) => l.kind === 'task').length, taskOk: taskAll.filter((l) => l.ok === 1).length
    }
  };
}

const mins = (s) => (s == null ? '—' : `${(s / 60).toFixed(1)} 分鐘`);
export async function openStats(ctx) {
  const m = modal('<p class="muted">讀取作答紀錄中…</p>', { wide: true });
  const log = await ctx.getLog();
  const S = computeStats(ctx, log), s = S.sum;
  const card = (x) => `<div style="display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid var(--line);border-radius:10px;padding:6px">
    ${imgTag(x.photo, 'thumb', 'style="width:56px;height:56px" data-zoomsrc')}<div class="small"><b>${x.no} 號</b> ${esc(x.name)}<br><span class="muted">${esc(x.zone)}${x.view ? '・' + esc(x.view) : ''}</span><br>✅${x.ok} ❌${x.wrong} 💡${x.hint} ⏭${x.pass}・平均 ${mins(x.avg)}</div></div>`;
  const hard = S.points.filter((x) => x.tries).slice(0, 5);
  const easy = S.points.filter((x) => x.ok >= 1).slice().sort((a, c) => a.diff - c.diff).slice(0, 5);
  const maxW = Math.max(1, ...S.views.map((g) => g.wrongRate));
  m.el.querySelector('.modal').innerHTML = `
    <div class="row"><h2 style="margin:0">📊 統計：${esc(ctx.meta.title)}</h2><span class="spacer"></span><button class="btn ghost" data-x>關閉</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px">
      ${[['✅ 找到', s.ok], ['❌ 答錯', s.wrong], ['💡 提示', s.hint], ['⏭ PASS／放棄', s.pass], ['⏱ 平均找到', mins(s.avg)], ['🦶 站位全對', s.cam ? `${s.camFull}/${s.cam}` : '—'], ['🔍 觀察答對', s.task ? `${s.taskOk}/${s.task}` : '—']].map(([k, v]) => `<div class="card" style="margin:0;padding:8px;text-align:center"><div class="small muted">${k}</div><div style="font-size:1.4em;font-weight:900">${v}</div></div>`).join('')}
    </div>
    ${!s.ok && !s.wrong ? '<div class="alert blue" style="margin-top:12px">還沒有作答紀錄。活動進行一陣子再來看！</div>' : ''}
    <h3 style="margin-top:16px">👁️ 視角統計</h3>
    ${S.weakest ? `<div class="alert red small" style="margin-top:4px">全班最弱的視角：<b>${esc(S.weakest.label)}</b>（答錯率 ${S.weakest.wrongRate}%，平均 ${mins(S.weakest.avg)}）→ 下次可以多派這類照片練習。</div>` : ''}
    ${S.views.length ? `<table class="list"><thead><tr><th>類別</th><th>視角</th><th>答對</th><th>答錯</th><th style="width:30%">答錯率</th><th>平均找到</th><th>站位全對率</th></tr></thead><tbody>
      ${S.views.map((g) => `<tr${S.weakest && g === S.weakest ? ' style="background:var(--red-soft)"' : ''}><td class="small muted">${g.group}</td><td><b>${esc(g.label)}</b></td><td>${g.ok}</td><td>${g.wrong}</td><td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:10px;background:#eee;border-radius:999px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(g.wrongRate / maxW * 100)}%;background:var(--red)"></i></div>${g.wrongRate}%</div></td><td>${mins(g.avg)}</td><td>${g.camRate == null ? '—' : g.camRate + '%'}</td></tr>`).join('')}
    </tbody></table>` : '<p class="small muted">還沒有資料。</p>'}
    <p class="small muted">題庫的點位如果還沒標「視角」，都會算在「未標」。到「🗺️ 地圖」或「📋 點位清單」頁可以批次標。</p>
    <div class="grid2" style="margin-top:12px">
      <div><h3>🔥 最難的點</h3>${hard.map(card).join('') || '<p class="small muted">—</p>'}</div>
      <div><h3>🌱 最容易的點</h3>${easy.map(card).join('') || '<p class="small muted">—</p>'}</div>
    </div>
    <details style="margin-top:12px"><summary class="bold" style="cursor:pointer">📋 全部點位（${S.points.length} 個，依難度排序）</summary>
      <table class="list"><thead><tr><th>編號</th><th>地點</th><th>區域</th><th>視角</th><th>✅</th><th>❌</th><th>💡</th><th>⏭</th><th>平均</th><th>難度</th></tr></thead><tbody>
      ${S.points.map((x) => `<tr><td>${x.no}</td><td>${esc(x.name)}</td><td class="small">${esc(x.zone)}</td><td class="small">${esc(x.view || '未標')}</td><td>${x.ok}</td><td>${x.wrong}</td><td>${x.hint}</td><td>${x.pass}</td><td>${mins(x.avg)}</td><td>${x.diff}</td></tr>`).join('')}
      </tbody></table></details>
    ${S.chal.length ? `<details style="margin-top:12px"><summary class="bold" style="cursor:pointer">🎁 加分挑戰紀錄（${S.chal.length}）</summary>
      <table class="list"><thead><tr><th>時間</th><th>組別</th><th>類型</th><th>地點</th><th>回答</th><th>結果</th></tr></thead><tbody>
      ${S.chal.map((x) => `<tr><td class="small">${x.time}</td><td>${esc(x.team)}</td><td class="small">${x.kind}</td><td class="small">${x.no} ${esc(x.name)}</td><td>${esc(x.text)}</td><td>${esc(x.result)}</td></tr>`).join('')}
      </tbody></table></details>` : ''}`;
  $('[data-x]', m.el).onclick = m.close;
  $$('[data-zoomsrc]', m.el).forEach((im) => { im.style.cursor = 'zoom-in'; im.onclick = () => zoomImg(im.src); });
}

// ---------- 🗺️ 路線回放 ----------
const colorOf = (i) => `hsl(${(i * 137.5) % 360},70%,42%)`;
export async function openReplay(ctx) {
  const m = modal('<p class="muted">讀取作答紀錄中…</p>', { wide: true });
  m.el.querySelector('.modal').style.maxWidth = '1100px';
  const log = await ctx.getLog(), b = ctx.bank;
  const byNo = {}; G.sortedPoints(b).forEach((p) => { byNo[p.no] = p; });
  const order = ctx.ranked.map((r) => r.id);
  const routes = order.map((tid, i) => {
    const steps = Object.values(log).filter((l) => l.tid === tid && l.kind === 'ok' && byNo[l.no]).sort((a, c) => (a.sec || 0) - (c.sec || 0)).map((l) => ({ no: l.no, x: byNo[l.no].x, y: byNo[l.no].y, sec: l.sec || 0 }));
    return { tid, name: ctx.st.teams[tid].name, color: colorOf(i), steps };
  });
  const endSec = Math.max(60, G.gameSeconds(ctx.st.clock, Date.now()), ...routes.flatMap((r) => r.steps.map((s) => s.sec)));
  const map = b.map, crop = ctx.pub.crop, span = (crop.bot - crop.top) / 100;
  const R = { t: endSec, solo: '', play: null };
  m.el.querySelector('.modal').innerHTML = `
    <div class="row"><h2 style="margin:0">🗺️ 路線回放</h2><span class="small muted">把每一組「依序找到的地點」連成線（中間怎麼走的系統不知道，只畫直線）</span><span class="spacer"></span><button class="btn ghost" data-x>關閉</button></div>
    <div class="row" style="margin-top:8px">
      <button class="btn sm primary" id="rpPlay">▶ 播放</button>
      <input type="range" id="rpT" min="0" max="${endSec}" value="${endSec}" style="flex:1;min-width:200px">
      <b id="rpClock" style="font-family:'Bebas Neue',sans-serif;font-size:1.6em;min-width:64px;text-align:right"></b>
      <select class="inline" id="rpTeam"><option value="">全部組別</option>${routes.map((r) => `<option value="${r.tid}">${esc(r.name)}（${r.steps.length} 點）</option>`).join('')}</select>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:10px;margin-top:8px">
      <div style="border:2px solid var(--ink);border-radius:12px;overflow:hidden;background:#fff">
        <div style="position:relative;width:min(100%, calc(70vh * ${(map.w / (map.h * span)).toFixed(4)}));margin:0 auto;aspect-ratio:${map.w}/${(map.h * span).toFixed(1)};overflow:hidden">
          <div id="rpIn" style="position:absolute;left:0;width:100%;top:${(-crop.top / span).toFixed(3)}%;height:${(100 / span).toFixed(3)}%">
            <img src="${esc(G.photoURL(map.src))}" style="width:100%;height:100%;display:block;opacity:.6">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" id="rpSvg"></svg>
            <div id="rpDots"></div>
          </div></div></div>
      <div id="rpLegend" class="small" style="max-height:72vh;overflow:auto"></div>
    </div>`;
  const draw = () => {
    const show = routes.filter((r) => !R.solo || r.tid === R.solo);
    let svg = '', dots = '';
    show.forEach((r) => {
      const st = r.steps.filter((s) => s.sec <= R.t); if (!st.length) return;
      if (st.length > 1) svg += `<polyline points="${st.map((s) => `${s.x},${s.y}`).join(' ')}" fill="none" stroke="${r.color}" stroke-width="${R.solo ? 3.5 : 2.5}" stroke-opacity="${R.solo ? 1 : .75}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
      st.forEach((s, i) => {
        const head = i === st.length - 1;
        if (R.solo || head) dots += `<div style="position:absolute;left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%);width:${head ? 20 : 16}px;height:${head ? 20 : 16}px;border-radius:50%;background:${r.color};color:#fff;border:2px solid #fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.4)">${R.solo ? i + 1 : ''}</div>`;
        if (head) dots += `<div style="position:absolute;left:${s.x}%;top:${s.y}%;transform:translate(10px,-50%);font-size:11px;font-weight:900;color:${r.color};background:rgba(255,255,255,.85);padding:0 4px;border-radius:4px;white-space:nowrap">${esc(r.name)}</div>`;
      });
    });
    $('#rpSvg', m.el).innerHTML = svg; $('#rpDots', m.el).innerHTML = dots;
    $('#rpClock', m.el).textContent = G.fmtTime(R.t);
    $('#rpLegend', m.el).innerHTML = routes.map((r) => { const n = r.steps.filter((s) => s.sec <= R.t).length; return `<div data-solo="${r.tid}" style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:8px;cursor:pointer;${R.solo === r.tid ? 'background:var(--gold-soft)' : ''}${R.solo && R.solo !== r.tid ? ';opacity:.45' : ''}"><i style="width:12px;height:12px;border-radius:50%;background:${r.color};flex:none"></i><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</span><b>${n}</b></div>`; }).join('');
    $$('[data-solo]', m.el).forEach((d) => { d.onclick = () => { R.solo = R.solo === d.dataset.solo ? '' : d.dataset.solo; $('#rpTeam', m.el).value = R.solo; draw(); }; });
  };
  const stop = () => { clearInterval(R.play); R.play = null; $('#rpPlay', m.el).textContent = '▶ 播放'; };
  $('#rpT', m.el).oninput = (e) => { R.t = +e.target.value; stop(); draw(); };
  $('#rpTeam', m.el).onchange = (e) => { R.solo = e.target.value; draw(); };
  $('#rpPlay', m.el).onclick = () => {
    if (R.play) return stop();
    if (R.t >= endSec) R.t = 0;
    $('#rpPlay', m.el).textContent = '⏸ 暫停';
    R.play = setInterval(() => { if (!m.el.isConnected) { clearInterval(R.play); return; } R.t = Math.min(endSec, R.t + endSec / 200); $('#rpT', m.el).value = R.t; draw(); if (R.t >= endSec) stop(); }, 100); // 整場約 20 秒播完
  };
  const close = () => { stop(); m.close(); };
  $('[data-x]', m.el).onclick = close;
  draw();
}
