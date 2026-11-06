const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: '/tmp/claude-0/state.json', viewport: { width: 1366, height: 860 } });
  const errs = []; const t = await ctx.newPage(); t.on('pageerror', e => errs.push('T:' + e.message)); t.on('console', (m) => { if (m.text().includes('[assign]') || m.type() === 'error') errs.push('C:' + m.text()); }); t.on('dialog', (d) => { errs.push('DIALOG:' + d.message()); d.accept(); });
  await t.goto('http://localhost:5179/caseclass'); await t.waitForTimeout(900);
  await t.click('.cc-back'); await t.waitForTimeout(400);
  await t.click('.cc-tabbtn:has-text("委託任務")'); await t.click('text=發布委託任務'); await t.waitForTimeout(300);
  await t.click('.cc-kind:has-text("繳交型任務")'); await t.fill('input[placeholder^="例：期中海報"]', '期中海報');
  await t.fill('.modal textarea', '用 Canva 做一張 A3 海報。');
  await t.screenshot({ path: S + 'a01-wizard-basic.png' });
  await t.click('text=下一步 ›'); await t.click('text=下一步 ›');
  await t.screenshot({ path: S + 'a02-wizard-time.png' });
  await t.click('text=下一步 ›');
  await t.click('text=📚 打開規準庫選擇'); await t.waitForTimeout(400);
  const pick = t.locator('.modal .btn:has-text("✔ 選這份")');
  if (await pick.count()) await pick.first().click(); else await t.locator('.modal button:has-text("加入規準庫")').first().click();
  await t.waitForTimeout(400);
  await t.fill('.modal label:has-text("每人評幾份") input', '2');
  await t.screenshot({ path: S + 'a03-wizard-review.png' });
  await t.click('text=下一步 ›'); await t.screenshot({ path: S + 'a04-wizard-score.png' });
  await t.click('text=🚀 發布任務'); await t.waitForTimeout(900);
  await t.screenshot({ path: S + 'a05-stats-empty.png', fullPage: true });
  const D = await t.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')));
  const caseId = D.cc_tasks.find((x) => x.name === '期中海報').case_id;
  const mem = D.cc_members.filter((m) => m.case_id === caseId).slice(0, 5);
  const login = async (p, m) => {
    await p.goto('http://localhost:5179/cc/TEST23'); await p.evaluate(() => sessionStorage.clear()); await p.reload();
    await p.fill('input[placeholder="例：207"]', String(m.class_name)); await p.fill('input[placeholder="例：5"]', String(m.seat));
    await p.fill('form label:has-text("姓名") input', m.name); await p.fill('input[type=password]', m.sid);
    await p.click('text=🔍 報到'); await p.waitForTimeout(500);
  };
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', e => errs.push('S:' + e.message)); s.on('dialog', (d) => d.accept());
  const r = {};
  for (let i = 0; i < 4; i++) {
    await login(s, mem[i]);
    if (i === 0) await s.screenshot({ path: S + 'a06-stu-home.png' });
    await s.click('.cc-s-task:has-text("期中海報")'); await s.waitForTimeout(400);
    if (i === 0) await s.screenshot({ path: S + 'a07-stu-work.png', fullPage: true });
    await s.fill('.cc-s-field:has-text("作品連結") textarea', 'https://canva.com/poster-' + i);
    await s.fill('.cc-s-field:has-text("作品說明") textarea', '這是我的海報，主題是第 ' + i + ' 號實驗');
    await s.click('.cc-s-go:has-text("交出")'); await s.waitForTimeout(600);
    if (i === 0) await s.screenshot({ path: S + 'a08-stu-submitted.png', fullPage: true });
  }
  await t.bringToFront(); await t.waitForTimeout(4500);
  await t.screenshot({ path: S + 'a09-stats.png', fullPage: true });
  await t.click('.cc-tabbtn:has-text("互評進度")'); await t.waitForTimeout(300);
  await t.click('button:has-text("🎲 分派互評")'); await t.waitForTimeout(900); await t.screenshot({ path: S + 'a10a.png', fullPage: true }); console.log('DIALOGS', JSON.stringify(errs), await t.evaluate(() => { const D = JSON.parse(localStorage.getItem('gq-mock-db')); const x = D.cc_tasks.find((k) => k.name === '期中海報'); return JSON.stringify(x.state) + ' subs=' + D.cc_subs.filter((s) => s.task_id === x.id).map((s) => s.status).join(); }));
  await t.click('.cc-stepcard button:has-text("開放互評")'); await t.waitForTimeout(700);
  await t.screenshot({ path: S + 'a10-review.png', fullPage: true });
  // 學生互評
  for (let i = 0; i < 2; i++) {
    await login(s, mem[i]); await s.click('.cc-s-task:has-text("期中海報")'); await s.waitForTimeout(500);
    if (i === 0) await s.screenshot({ path: S + 'a11-stu-reviewlist.png', fullPage: true });
    const items = await s.$$('.cc-s-week');
    for (let k = 0; k < items.length; k++) {
      await s.click('.cc-s-week >> nth=' + k); await s.waitForTimeout(300);
      for (const grp of await s.$$('.cc-crit')) { const btns = await grp.$$('.cc-level'); await btns[k % btns.length].click(); }
      await s.fill('.cc-s-comment textarea', '圖表很清楚，建議加上單位');
      if (i === 0 && k === 0) await s.screenshot({ path: S + 'a12-stu-reviewitem.png', fullPage: true });
      await s.click('.cc-s-go'); await s.waitForTimeout(600);
    }
  }
  await t.bringToFront(); await t.waitForTimeout(4500);
  await t.click('.cc-tabbtn:has-text("作品與評分")'); await t.waitForTimeout(400);
  await t.screenshot({ path: S + 'a13-subs.png', fullPage: true });
  await t.click('.cc-review tr >> nth=1 >> button'); await t.waitForTimeout(400);
  for (const grp of await t.$$('.modal .cc-crit')) { const btns = await grp.$$('.cc-level'); await btns[0].click(); }
  await t.fill('.modal .cc-fb-edit textarea', '主題明確，版面清楚！');
  await t.screenshot({ path: S + 'a14-modal.png' });
  await t.click('.modal button:has-text("儲存評分")'); await t.waitForTimeout(600);
  const pt = t.locator('.modal .cc-tabbtn:has-text("同學互評")'); if (await pt.count()) { await pt.click(); await t.waitForTimeout(200); await t.screenshot({ path: S + 'a15-modal-peer.png' }); }
  await t.click('.modal-head .icon-btn'); await t.waitForTimeout(200);
  await t.click('.cc-tabbtn:has-text("統計")'); await t.waitForTimeout(300); await t.screenshot({ path: S + 'a16-stats2.png', fullPage: true });
  await t.click('.cc-tabbtn:has-text("成績")'); await t.waitForTimeout(300);
  await t.click('button:has-text("🔓 公布成績")'); await t.waitForTimeout(700);
  await t.screenshot({ path: S + 'a17-results.png', fullPage: true });
  await t.click('.cc-tabbtn:has-text("任務設定")'); await t.waitForTimeout(300); await t.screenshot({ path: S + 'a18-settings.png', fullPage: true });
  // 學生看成績
  const D2 = await t.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')));
  const tk = D2.cc_tasks.find((x) => x.name === '期中海報');
  const scored = D2.cc_subs.find((x) => x.task_id === tk.id && D2.cc_sreviews.some((rv) => rv.sub_id === x.id && rv.reviewer === '#teacher'));
  const who = mem.find((m) => m.sid === scored.owner);
  await login(s, who); await s.click('.cc-s-task:has-text("期中海報")'); await s.waitForTimeout(500);
  await s.screenshot({ path: S + 'a19-stu-result.png', fullPage: true });
  r.result = await s.isVisible('text=CASE CLOSED');
  console.log(JSON.stringify(r), 'ERRORS', JSON.stringify(errs));
  await b.close();
})();
