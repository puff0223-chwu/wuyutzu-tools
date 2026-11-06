const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: '/tmp/claude-0/state.json', viewport: { width: 1366, height: 860 } });
  const errs = [];
  const t = await ctx.newPage(); t.on('pageerror', e => errs.push('T:' + e.message));
  await t.goto('http://localhost:5179/caseclass'); await t.waitForTimeout(1000);
  const D = await t.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')));
  const task = D.cc_tasks[0]; const mem = D.cc_members; const g1 = D.cc_groups.find(g => g.name === '第1組');
  // projector
  const pj = await ctx.newPage(); pj.on('pageerror', e => errs.push('P:' + e.message));
  await pj.goto('http://localhost:5179/caseclass/live/' + task.id); await pj.waitForTimeout(1200);
  await pj.screenshot({ path: S + '10-projector.png' });
  // students: everyone not in G1 reviews G1
  const s = await ctx.newPage(); s.on('pageerror', e => errs.push('S:' + e.message));
  await s.setViewportSize({ width: 390, height: 844 });
  const notG1 = mem.filter(m => m.group_id !== g1.id);
  let first = true;
  for (const m of notG1.slice(0, 8)) {
    await s.goto('http://localhost:5179/cc/TEST23');
    await s.evaluate(() => sessionStorage.clear()); await s.reload();
    await s.fill('input[placeholder="例：207"]', '207'); await s.fill('input[placeholder="例：5"]', String(m.seat));
    await s.fill('form label:has-text("姓名") input', m.name); await s.fill('input[type=password]', m.sid);
    await s.click('text=🔍 報到'); await s.waitForTimeout(400);
    if (first) await s.screenshot({ path: S + '11-s-home.png' });
    await s.click('.cc-s-task'); await s.waitForTimeout(400);
    if (first) await s.screenshot({ path: S + '12-s-task.png', fullPage: true });
    await s.click('text=/幫 第1組 評分/'); await s.waitForTimeout(300);
    const crits = await s.$$('.cc-crit');
    for (let i = 0; i < crits.length; i++) { const lv = await crits[i].$$('.cc-level'); await lv[Math.floor(Math.random() * 2)].click(); }
    await s.fill('textarea', '報告很清楚，圖表可以再大一點 #' + m.seat);
    if (first) await s.screenshot({ path: S + '13-s-form.png' });
    await s.click('text=送出評分'); await s.waitForTimeout(400);
    if (first) await s.screenshot({ path: S + '14-s-after.png' });
    first = false;
  }
  await pj.waitForTimeout(1500);
  await pj.screenshot({ path: S + '15-projector-progress.png' });
  // teacher scores G1, opens peer
  await t.reload(); await t.waitForTimeout(800);
  const crits = await t.$$('.cc-tscore .cc-crit');
  for (const c of crits) { const lv = await c.$$('.cc-level'); await lv[0].click(); }
  await t.fill('.cc-tscore textarea', '主題明確，數據分析完整！'); await t.click('.cc-tscore >> text=💾 儲存'); await t.waitForTimeout(400);
  await t.click('text=開放密報'); await t.waitForTimeout(500);
  // G1 members peer review
  const g1m = mem.filter(m => m.group_id === g1.id);
  let k = 0;
  for (const m of g1m) {
    await s.goto('http://localhost:5179/cc/TEST23'); await s.evaluate(() => sessionStorage.clear()); await s.reload();
    await s.fill('input[placeholder="例：207"]', '207'); await s.fill('input[placeholder="例：5"]', String(m.seat));
    await s.fill('form label:has-text("姓名") input', m.name); await s.fill('input[type=password]', m.sid);
    await s.click('text=🔍 報到'); await s.waitForTimeout(300); await s.click('.cc-s-task'); await s.waitForTimeout(400);
    const mates = await s.$$('.cc-s-mate');
    for (let j = 0; j < mates.length; j++) { const lv = await mates[j].$$('.cc-level'); await lv[(j + k) % 3].click(); }
    if (k === 0) await s.screenshot({ path: S + '16-s-peer.png', fullPage: true });
    await s.click('text=🤫 送出密報'); await s.waitForTimeout(400); k++;
  }
  await t.waitForTimeout(800);
  await t.screenshot({ path: S + '17-console-after.png', fullPage: true });
  await t.click('text=📊 成績'); await t.waitForTimeout(400);
  await t.screenshot({ path: S + '18-results.png', fullPage: true });
  await t.click('.cc-tabbtn:has-text("個人")'); await t.waitForTimeout(300);
  await t.screenshot({ path: S + '19-results-people.png', fullPage: true });
  t.on('dialog', d => d.accept());
  await t.click('text=🔓 公布成績'); await t.waitForTimeout(600);
  // student sees result
  const m = g1m[0];
  await s.goto('http://localhost:5179/cc/TEST23'); await s.evaluate(() => sessionStorage.clear()); await s.reload();
  await s.fill('input[placeholder="例：207"]', '207'); await s.fill('input[placeholder="例：5"]', String(m.seat));
  await s.fill('form label:has-text("姓名") input', m.name); await s.fill('input[type=password]', m.sid);
  await s.click('text=🔍 報到'); await s.waitForTimeout(300); await s.click('.cc-s-task'); await s.waitForTimeout(500);
  await s.screenshot({ path: S + '20-s-result.png', fullPage: true });
  await ctx.storageState({ path: '/tmp/claude-0/state2.json' });
  console.log('ERRORS', JSON.stringify(errs.filter(e => !/TUNNEL/.test(e))));
  await b.close();
})();
