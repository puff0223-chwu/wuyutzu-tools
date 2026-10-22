/* =========================================================
   ⚗️ 化學實驗室 No.223：pH 與單位換算老師頁共用的「即時總表＋能力分析」
   每個老師頁提供一個轉接器 A：
     A.N                     每人題數
     A.qs(cls, seat)         這位學生的題目（和學生頁同一個種子）
     A.isCorrect(q, ans)     判斷對錯
     A.level(q)              難度序號（0～3）；A.LEVELS[i].name
     A.kind(q) / A.KIND      題型代號／名稱
     A.diagnose(q, ans) / A.DIAG   錯誤類型代號／名稱
     A.qText(q)  A.ansText(q)  A.fmt(ans)   題目、正解、學生答案的文字
     A.instant               即時對錯（有嘗試次數與作答歷程）或交卷批改
   ========================================================= */
const LabBoard = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arr = (v, n, fill) => { const o = Array(n).fill(fill); if (Array.isArray(v)) v.forEach((x, i) => { if (i < n && x != null) o[i] = x; }); else if (v && typeof v === 'object') Object.entries(v).forEach(([i, x]) => { if (+i < n && x != null) o[+i] = x; }); return o; };
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const heat = r => r == null ? '#f4f1ea' : r >= 80 ? '#bfe8c9' : r >= 60 ? '#e2f2c0' : r >= 40 ? '#ffe7a8' : '#f8c3b8';
  const ST = { doing: ['st-doing', '作答中'], sub: ['st-sub', '已交卷'], all: ['st-all', '全對'] };

  /* ---------- 整理資料 ---------- */
  function rows(recs, A) {
    const N = A.N;
    return Object.entries(recs || {}).filter(([, r]) => r && r.cls && r.seat).map(([sid, r]) => {
      const qs = A.qs(r.cls, r.seat);
      const answers = arr(r.answers, N, '').map(String), attempts = arr(r.attempts, N, 0).map(Number);
      const correct = qs.map((q, i) => A.isCorrect(q, answers[i]));
      const nCorrect = correct.filter(Boolean).length;
      const hist = (Array.isArray(r.history) ? r.history : Object.values(r.history || {})).filter(h => Array.isArray(h) || (h && typeof h === 'object'))
        .map(h => Array.isArray(h) ? h : [h[0], h[1], h[2], h[3]]);
      // 錯誤：即時模式看作答歷程裡每一次答錯；交卷模式看最後答案
      const wrongs = A.instant ? hist.filter(h => !h[2] && qs[h[0]]).map(h => ({ i: h[0], v: String(h[1]) }))
        : (r.submitted ? qs.map((q, i) => correct[i] ? null : { i, v: answers[i] }).filter(Boolean) : []);
      wrongs.forEach(w => { w.d = A.diagnose(qs[w.i], w.v); });
      const status = nCorrect === N ? 'all' : r.submitted ? 'sub' : 'doing';
      return { sid, cls: String(r.cls), seat: Number(r.seat), no: r.no || '', name: r.name || '', use: r.use || '', r, qs, answers, attempts, correct, nCorrect, wrongs, status, ts: r.ts || 0 };
    }).sort((a, b) => a.cls.localeCompare(b.cls, 'zh-Hant', { numeric: true }) || a.seat - b.seat);
  }
  function filterBar(id, all, sel, onChange) {
    const classes = [...new Set(all.map(x => x.cls))];
    const el = document.getElementById(id);
    el.innerHTML = `<label>班級 <select data-f="cls"><option value="">全部</option>${classes.map(c => `<option ${sel.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>用途 <select data-f="use"><option value="">全部</option>${['正式進度', '考試複習', '重補修'].map(u => `<option ${sel.use === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label>搜尋 <input data-f="q" value="${esc(sel.q || '')}" placeholder="姓名、學號、座號" style="width:150px"></label>`;
    el.querySelectorAll('[data-f]').forEach(x => x.oninput = () => { sel[x.dataset.f] = x.value.trim(); onChange(); });
  }
  const applyFilter = (all, sel) => all.filter(x => (!sel.cls || x.cls === sel.cls) && (!sel.use || x.use === sel.use) &&
    (!sel.q || [x.name, x.no, String(x.seat)].some(v => String(v).toUpperCase().includes(sel.q.toUpperCase()))));

  /* ---------- 即時總表 ---------- */
  function boardHTML(list, A) {
    if (!list.length) return '<p class="hint">還沒有學生進來（或篩選後沒有人）。</p>';
    const N = A.N;
    const head = `<tr><th>班級</th><th>座號</th><th>學號</th><th>姓名</th><th>用途</th>${Array.from({ length: N }, (_, i) => `<th>第 ${i + 1} 題</th>`).join('')}<th>答對</th><th>狀態</th><th>最後更新</th></tr>`;
    const body = list.map(x => `<tr><td>${esc(x.cls)}</td><td>${x.seat}</td><td class="mono">${esc(x.no)}</td><td>${esc(x.name)}</td><td>${esc(x.use)}</td>
      ${x.qs.map((q, i) => { const a = x.answers[i].trim(), c = a ? (x.correct[i] ? 'ok' : 'bad') : '';
        return `<td class="qcell"><div class="qtxt">${A.qHTML ? A.qHTML(q) : esc(A.qText(q))}</div><div class="key">解 ${esc(A.ansText(q))}</div>
          <div class="stu ${c}">${a ? esc(A.fmt(a)) + (x.correct[i] ? ' ✓' : ' ✗') : '—'}</div>${A.instant && x.attempts[i] ? `<div class="tries">試 ${x.attempts[i]} 次</div>` : ''}</td>`; }).join('')}
      <td><b>${x.nCorrect}</b></td><td><span class="status ${ST[x.status][0]}">${ST[x.status][1]}</span></td><td style="font-size:.8em">${x.ts ? new Date(x.ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : ''}</td></tr>`).join('');
    const rate = i => `${list.filter(x => x.correct[i]).length} / ${list.length}`;
    return `<table>${head}${body}<tr class="summary"><td colspan="5">答對人數 / 領題人數</td>${Array.from({ length: N }, (_, i) => `<td>${rate(i)}</td>`).join('')}<td colspan="3"></td></tr></table>`;
  }

  /* ---------- 能力分析 ---------- */
  function statsHTML(list, A) {
    if (!list.length) return '<p class="hint">還沒有作答資料（或篩選後沒有人）。</p>';
    const N = A.N, items = [];   // 每一題（學生 × 題目）
    list.forEach(x => x.qs.forEach((q, i) => items.push({ x, q, i, lv: A.level(q), k: A.kind(q), ans: x.answers[i].trim(), ok: x.correct[i], tries: x.attempts[i] || 0 })));
    const done = items.filter(t => t.ans || t.tries);
    const firstOk = t => A.instant ? t.ok && t.tries <= 1 : t.ok;
    const allOk = list.filter(x => x.status === 'all').length;
    const avgC = (list.reduce((s, x) => s + x.nCorrect, 0) / list.length).toFixed(1);
    const tries = done.reduce((s, t) => s + t.tries, 0);
    const kpi = `<div class="kpis"><div><b>${list.length}</b>領題人數</div><div><b>${allOk}</b>全部答對</div><div><b>${avgC}</b>平均答對（/${N}）</div>
      ${A.instant ? `<div><b>${pct(done.filter(firstOk).length, done.length) ?? '—'}%</b>一次就答對</div><div><b>${done.length ? (tries / done.length).toFixed(1) : '—'}</b>每題平均嘗試</div>` : `<div><b>${list.filter(x => x.r.submitted).length}</b>已交卷</div>`}</div>`;
    const group = (keyFn, names) => {
      const g = {}; items.forEach(t => { const k = keyFn(t); (g[k] = g[k] || []).push(t); });
      return Object.keys(names).filter(k => g[k]).map(k => { const a = g[k], d = a.filter(t => t.ans || t.tries), ok = a.filter(t => t.ok).length, fo = d.filter(firstOk).length, r = pct(ok, a.length);
        return `<tr><td style="text-align:left"><b>${names[k]}</b></td><td>${a.length}</td><td style="background:${heat(r)}"><b>${r}%</b>（${ok}）</td>${A.instant ? `<td>${pct(fo, d.length) ?? '—'}%</td><td>${d.length ? (d.reduce((s, t) => s + t.tries, 0) / d.length).toFixed(1) : '—'}</td>` : ''}
          <td style="text-align:left;min-width:140px"><div class="sbar"><i style="width:${r || 0}%"></i></div></td></tr>`; }).join('');
    };
    const thead = `<tr><th>分類</th><th>題數</th><th>答對率</th>${A.instant ? '<th>一次就答對</th><th>平均嘗試</th>' : ''}<th></th></tr>`;
    const LVN = Object.fromEntries(A.LEVELS.map((l, i) => [i, `${l.stars || ''} ${l.name}`]));
    // 錯誤類型
    const wr = []; list.forEach(x => x.wrongs.forEach(w => wr.push({ ...w, x })));
    const dc = {}; wr.forEach(w => { (dc[w.d] = dc[w.d] || []).push(w); });
    const diag = Object.keys(dc).sort((a, b) => dc[b].length - dc[a].length).map(k => { const a = dc[k], who = [...new Set(a.map(w => w.x.name))];
      const ex = a[0], q = ex.x.qs[ex.i];
      return `<tr><td style="text-align:left"><b>${esc(A.DIAG[k] || k)}</b></td><td>${a.length}</td><td>${pct(a.length, wr.length)}%</td><td>${who.length}</td>
        <td style="text-align:left;font-size:.85em">${who.slice(0, 12).map(esc).join('、')}${who.length > 12 ? '…' : ''}</td>
        <td style="text-align:left;font-size:.82em">例：${esc(A.qText(q))} → 寫 <b>${esc(A.fmt(ex.v))}</b>（正解 ${esc(A.ansText(q))}）</td></tr>`; }).join('');
    // 每位學生
    const stuRows = list.map(x => {
      const byLv = A.LEVELS.map((l, li) => { const a = x.qs.map((q, i) => ({ q, i })).filter(t => A.level(t.q) === li); if (!a.length) return '<td style="background:#f4f1ea;color:#aaa">—</td>';
        const ok = a.filter(t => x.correct[t.i]).length, r = pct(ok, a.length); return `<td style="background:${heat(r)}">${ok}/${a.length}</td>`; }).join('');
      const dd = {}; x.wrongs.forEach(w => { dd[w.d] = (dd[w.d] || 0) + 1; });
      const top = Object.keys(dd).sort((a, b) => dd[b] - dd[a]).slice(0, 2).map(k => `${A.DIAG[k] || k}${dd[k] > 1 ? ' ×' + dd[k] : ''}`).join('、');
      const tr = x.attempts.reduce((s, v) => s + v, 0);
      return `<tr><td>${esc(x.cls)}</td><td>${x.seat}</td><td>${esc(x.name)}</td><td>${esc(x.use)}</td>${byLv}<td><b>${x.nCorrect}</b>/${N}</td>${A.instant ? `<td>${tr}</td>` : ''}<td style="text-align:left;font-size:.85em">${esc(top) || '—'}</td></tr>`;
    }).join('');
    return `${kpi}
      <div class="stat-grid"><div><h3>📊 依難度</h3><table>${thead}${group(t => t.lv, LVN)}</table></div>
        <div><h3>🧭 依題型</h3><table>${thead}${group(t => t.k, A.KIND)}</table></div></div>
      <h3>🩺 常見錯誤類型 <span class="hint">（系統依學生寫出的數字判斷最像哪一種錯誤；${A.instant ? '算的是每一次答錯' : '算的是交卷後的錯題'}）</span></h3>
      ${wr.length ? `<div class="table-wrap"><table><tr><th>錯誤類型</th><th>次數</th><th>占全部錯誤</th><th>人數</th><th>哪些學生</th><th>例子</th></tr>${diag}</table></div>` : '<p class="hint">目前還沒有答錯的紀錄。</p>'}
      <h3>👩‍🎓 每位學生</h3><div class="table-wrap"><table><tr><th>班級</th><th>座號</th><th>姓名</th><th>用途</th>${A.LEVELS.map(l => `<th>${l.name}</th>`).join('')}<th>答對</th>${A.instant ? '<th>嘗試總數</th>' : ''}<th>主要錯誤</th></tr>${stuRows}</table></div>`;
  }

  /* ---------- Excel ---------- */
  function xlsx(list, A, file, extra = []) {
    if (typeof XLSX === 'undefined') { alert('Excel 元件載入失敗，請重新整理'); return; }
    const ST2 = { doing: '作答中', sub: '已交卷', all: '全對' };
    const s1 = list.map(x => { const o = { 班級: x.cls, 座號: x.seat, 學號: x.no, 姓名: x.name, 用途: x.use };
      x.qs.forEach((q, i) => { o[`第${i + 1}題 題目`] = A.qText(q); o[`第${i + 1}題 正解`] = A.ansText(q); o[`第${i + 1}題 作答`] = A.fmt(x.answers[i]); o[`第${i + 1}題 對錯`] = x.answers[i].trim() ? (x.correct[i] ? '✓' : '✗') : ''; if (A.instant) o[`第${i + 1}題 嘗試`] = x.attempts[i] || ''; });
      o['答對題數'] = x.nCorrect; o['狀態'] = ST2[x.status]; o['最後更新'] = x.ts ? new Date(x.ts).toLocaleString('zh-TW') : ''; return o; });
    const s2 = []; list.forEach(x => x.wrongs.forEach(w => s2.push({ 班級: x.cls, 座號: x.seat, 姓名: x.name, 題號: w.i + 1, 題目: A.qText(x.qs[w.i]), 學生作答: A.fmt(w.v), 正解: A.ansText(x.qs[w.i]), 錯誤類型: A.DIAG[w.d] || w.d })));
    const s3 = list.map(x => { const o = { 班級: x.cls, 座號: x.seat, 姓名: x.name, 用途: x.use };
      A.LEVELS.forEach((l, li) => { const a = x.qs.map((q, i) => i).filter(i => A.level(x.qs[i]) === li); o[l.name] = a.length ? `${a.filter(i => x.correct[i]).length}/${a.length}` : ''; });
      const dd = {}; x.wrongs.forEach(w => { dd[A.DIAG[w.d] || w.d] = (dd[A.DIAG[w.d] || w.d] || 0) + 1; }); o['錯誤類型'] = Object.entries(dd).map(([k, v]) => `${k}×${v}`).join('、'); return o; });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s1.length ? s1 : [{ 說明: '尚無資料' }]), '全班總表');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s3.length ? s3 : [{ 說明: '尚無資料' }]), '能力分析');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s2.length ? s2 : [{ 說明: '沒有答錯紀錄' }]), '錯誤紀錄');
    extra.forEach(([name, data]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length ? data : [{ 說明: '尚無資料' }]), name));
    XLSX.writeFile(wb, file);
  }
  const CSS = `.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:6px 0 10px}.kpis>div{background:#fff;border:2px solid var(--line,#e3ddca);border-radius:12px;padding:10px;text-align:center;font-size:.85em;color:#6b6248}.kpis b{display:block;font-size:1.7em;color:var(--text,#1f2d30)}
    .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sbar{height:10px;background:#eee6d2;border-radius:6px;overflow:hidden}.sbar i{display:block;height:100%;background:#2e9e5b}
    .filters{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:.9em;margin:6px 0}.filters select,.filters input{font:inherit;padding:6px 8px;border-radius:8px;border:2px solid var(--line,#e3ddca)}
    @media(max-width:800px){.stat-grid{grid-template-columns:1fr}}`;
  return { rows, filterBar, applyFilter, boardHTML, statsHTML, xlsx, CSS, esc, pct, heat };
})();
