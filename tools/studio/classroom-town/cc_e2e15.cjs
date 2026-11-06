const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/';
const U = 'http://localhost:5179';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: '/tmp/claude-0/state.json', viewport: { width: 1366, height: 860 } });
  const errs = []; const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('T:' + e.message)); t.on('dialog', (d) => d.accept());
  t.on('console', (m) => { if (m.type() === 'error') errs.push('TC:' + m.text()); });
  const r = {};
  const DB = () => t.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')));
  const put = (fn, arg) => t.evaluate(([f, a]) => { const D = JSON.parse(localStorage.getItem('gq-mock-db')); new Function('D', 'a', f)(D, a); localStorage.setItem('gq-mock-db', JSON.stringify(D)); }, [fn, arg]);
  await t.goto(U + '/caseclass'); await t.waitForTimeout(900);
  for (let i = 0; i < 3 && !(await t.isVisible('button:has-text("＋ 開新課堂")')); i++) { await t.click('.cc-back'); await t.waitForTimeout(400); }
  r.newBtn = await t.isVisible('button:has-text("＋ 開新課堂")');
  await t.screenshot({ path: S + 'g01-board.png' });
  // 開新課堂（同時建立成績表）
  await t.click('button:has-text("＋ 開新課堂")'); await t.waitForTimeout(400);
  r.withCourse = await t.isChecked('.modal label:has-text("同時在成績調閱室建立成績表") input');
  await t.screenshot({ path: S + 'g02-newcase.png' });
  await t.click('.modal-head .icon-btn'); await t.waitForTimeout(200);
  // 舊的案件：🏆 成績總覽 → 建立成績表
  await t.click('.cc-case-card >> nth=0'); await t.waitForTimeout(700);
  await t.click('.cc-tabbtn:has-text("成績總覽")'); await t.waitForTimeout(500);
  if (await t.isVisible('button:has-text("🔗 建立成績表")')) { await t.click('button:has-text("🔗 建立成績表")'); await t.waitForTimeout(1200); }
  let D = await DB();
  const caseRow = D.cc_cases[0];
  r.linked = !!caseRow.course_id && D.courses.length === 1 && D.enrollments.length;
  await t.screenshot({ path: S + 'g03-overview-empty.png', fullPage: true });
  // 假資料：老師幫 6 隊評上台報告
  const task = D.cc_tasks.find((x) => x.kind === 'present');
  const crit = task.rubric.criteria;
  await put(`const t = D.cc_tasks.find((x) => x.id === a.tid); D.cc_reviews = D.cc_reviews || [];
    D.cc_groups.filter((g) => g.case_id === t.case_id).forEach((g, i) => { const sc = {}; a.crit.forEach((c, k) => { const L = c.levels.map((l) => l.score); sc[c.id] = L[(i + k) % L.length]; });
      D.cc_reviews.push({ id: 'rv' + i, task_id: t.id, reviewer: '#teacher', group_id: g.id, scores: sc, comment: '', hidden: false }); });`, { tid: task.id, crit });
  await t.reload(); await t.waitForTimeout(800);
  await t.click('.cc-tabbtn:has-text("委託任務")'); await t.click('.cc-task-card:has-text("期中報告")'); await t.waitForTimeout(700);
  await t.click('.cc-tabbtn:has-text("成績")'); await t.waitForTimeout(500);
  r.beforePub = await t.textContent('.cc-sync-note').catch(() => '');
  await t.click('button:has-text("🔓 公布成績")'); await t.waitForTimeout(1500);
  r.afterPub = await t.textContent('.cc-sync-note').catch(() => '');
  await t.screenshot({ path: S + 'g04-present-pub.png', fullPage: true });
  D = await DB();
  r.ledgerPresent = D.grade_ledger.filter((x) => x.ref === task.id && x.metric === 'personal').length;
  r.courseCols = D.courses[0].columns.map((c) => c.name + ':' + c.type).join(' | ');
  // 公布後改加減分 → 提醒 → 儲存並更新
  await t.click('.cc-tabs.small .cc-tabbtn:has-text("個人")'); await t.waitForTimeout(300);
  await t.fill('input[aria-label="加減分"] >> nth=0', '5'); await t.click('h1'); await t.waitForTimeout(1000);
  r.warn = await t.textContent('.cc-sync-note').catch(() => '');
  await t.screenshot({ path: S + 'g05-present-dirty.png' });
  await t.click('.cc-sync-note button:has-text("儲存並更新")'); await t.waitForTimeout(1500);
  r.fixed = await t.textContent('.cc-sync-note').catch(() => '');
  // 偵查日誌：精靈的計分方式
  await t.click('.cc-back'); await t.waitForTimeout(500);
  await t.click('text=發布委託任務'); await t.waitForTimeout(300); await t.click('.cc-kind:has-text("偵查日誌")');
  await t.fill('.modal input[placeholder^="例：桌遊"]', '專題週進度');
  for (let i = 0; i < 4; i++) { await t.click('.modal button:has-text("下一步")'); await t.waitForTimeout(250); }
  await t.screenshot({ path: S + 'g06-journal-wizard.png', fullPage: true });
  await t.click('.modal button:has-text("發布日誌")'); await t.waitForTimeout(900);
  D = await DB();
  const jt = D.cc_tasks.find((x) => x.name === '專題週進度');
  r.jGrade = JSON.stringify(jt.settings.grade);
  // 假資料：第一週 6 隊的日誌，前 4 隊打分數、第 5 隊交了沒評、第 6 隊沒交；燈號
  const w1 = jt.settings.weeks[0].id;
  await put(`const gs = D.cc_groups.filter((g) => g.case_id === a.cid); D.cc_logs = D.cc_logs || [];
    gs.forEach((g, i) => { if (i === 5) return; D.cc_logs.push({ id: 'lg' + i, task_id: a.tid, group_id: g.id, week_id: a.w, data: { done: '完成實驗' }, status: 'submitted', rev: 1, updated_by: '', submitted_by: '', feedback: i < 4 ? { points: 70 + i * 10, light: i === 0 ? 'red' : 'green', comment: i === 0 ? '再加油' : '' } : {} }); });`, { tid: jt.id, cid: caseRow.id, w: w1 });
  await t.reload(); await t.waitForTimeout(900);
  await t.click('.cc-tabbtn:has-text("成績")'); await t.waitForTimeout(600);
  await t.screenshot({ path: S + 'g07-journal-grade.png', fullPage: true });
  r.jUnscored = await t.isVisible('text=還沒打分數');
  // 點「待評」格子 → 打分數
  await t.click('.cc-gcell:has-text("待評")'); await t.waitForTimeout(500);
  await t.screenshot({ path: S + 'g08-feedback.png', fullPage: true });
  await t.fill('.cc-fb-edit input[type=number]', '85'); await t.click('button:has-text("儲存回饋")'); await t.waitForTimeout(900);
  await t.click('button:has-text("🔓 公布成績")'); await t.waitForTimeout(1500);
  await t.screenshot({ path: S + 'g09-journal-pub.png', fullPage: true });
  // 第二份日誌：評分規準＋自訂公式
  await t.click('.cc-back'); await t.waitForTimeout(500);
  await t.click('text=發布委託任務'); await t.waitForTimeout(300); await t.click('.cc-kind:has-text("偵查日誌")');
  await t.fill('.modal input[placeholder^="例：桌遊"]', '規準日誌');
  for (let i = 0; i < 4; i++) { await t.click('.modal button:has-text("下一步")'); await t.waitForTimeout(250); }
  await t.click('.modal .cc-radio:has-text("評分規準")'); await t.waitForTimeout(200);
  await t.click('.modal button:has-text("從規準庫選擇評分規準")'); await t.waitForTimeout(500);
  await t.click('.modal >> nth=1 >> button:has-text("選這份") >> nth=0'); await t.waitForTimeout(400);
  if (!(await t.isVisible(".modal .cc-pick:has-text(\"自訂公式\")"))) await t.click(".modal .cc-adv-head").catch(() => {});
  await t.click('.modal .cc-pick:has-text("自訂公式")'); await t.fill('.modal textarea.formula', 'MIN(100, 50+{得分}*3)'); await t.waitForTimeout(300);
  await t.screenshot({ path: S + 'g18-rubric-wizard.png', fullPage: true });
  r.tryRow = await t.textContent('.cc-convert-try').catch(() => '');
  await t.click('.modal button:has-text("發布日誌")'); await t.waitForTimeout(900);
  await t.click('.cc-tabbtn:has-text("成績")'); await t.waitForTimeout(500);
  await t.click('.cc-gcell >> nth=0'); await t.waitForTimeout(500);
  const lv = await t.$$('.cc-fb-rubric .cc-crit'); for (const c of lv) { await (await c.$('.cc-level')).click(); }
  await t.screenshot({ path: S + 'g19-rubric-feedback.png', fullPage: true });
  await t.click('button:has-text("儲存回饋")'); await t.waitForTimeout(900);
  await t.screenshot({ path: S + 'g20-rubric-grade.png', fullPage: true });
  r.rubricCell = await t.textContent('.cc-gcell >> nth=0');
  r.rubricGroup = await t.textContent('.cc-grade-grid tbody tr >> nth=0 >> td.sum');
  // 成績總覽：自訂 %
  await t.click('.cc-back'); await t.waitForTimeout(500);
  await t.click('.cc-tabbtn:has-text("成績總覽")'); await t.waitForTimeout(700);
  await t.screenshot({ path: S + 'g10-overview-equal.png', fullPage: true });
  await t.click('button:has-text("自訂 %")');
  await t.fill('input[aria-label="期中報告 比例"]', '40'); await t.fill('input[aria-label="專題週進度 比例"]', '60');
  await t.click('button:has-text("💾 儲存並更新")'); await t.waitForTimeout(1500);
  await t.screenshot({ path: S + 'g11-overview-custom.png', fullPage: true });
  D = await DB();
  const tot = D.grade_ledger.filter((x) => x.ref === 'total:' + caseRow.id);
  r.totals = tot.slice(0, 4).map((x) => x.value).join(',');
  // 成績調閱室
  const g = await ctx.newPage(); g.on('pageerror', (e) => errs.push('G:' + e.message)); g.on('dialog', (d) => d.accept());
  await g.goto(U + '/?course=' + D.courses[0].id); await g.waitForTimeout(1500);
  await g.screenshot({ path: S + 'g12-grade-table.png' });
  r.gridHead = (await g.$$eval('.colh .colh-name', (els) => els.map((e) => e.textContent))).join(' | ');
  await g.click('td.cell.linked >> nth=0'); await g.keyboard.press('Enter'); await g.waitForTimeout(300);
  r.flash = await g.textContent('.grid-flash, .flash').catch(() => '');
  await g.screenshot({ path: S + 'g13-linked-click.png' });
  await g.click('.tab:has-text("欄位設定")'); await g.waitForTimeout(400);
  await g.click('.col-item:has-text("謎案課堂總成績")'); await g.waitForTimeout(300);
  await g.screenshot({ path: S + 'g14-col-editor.png' });
  // 學生
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('S:' + e.message));
  const m = D.cc_members.find((x) => x.case_id === caseRow.id && x.group_id === D.cc_groups.filter((gg) => gg.case_id === caseRow.id)[0].id);
  await s.goto(U + '/cc/TEST23'); await s.evaluate(() => sessionStorage.clear()); await s.reload();
  await s.fill('input[placeholder="例：207"]', String(m.class_name)); await s.fill('input[placeholder="例：5"]', String(m.seat));
  await s.fill('form label:has-text("姓名") input', m.name); await s.fill('input[type=password]', m.sid);
  await s.click('text=🔍 報到'); await s.waitForTimeout(700);
  await s.screenshot({ path: S + 'g15-stu-home.png', fullPage: true });
  await s.click('.sys-stu:has-text("🏆")'); await s.waitForTimeout(700);
  await s.screenshot({ path: S + 'g16-stu-grades.png', fullPage: true });
  r.stuTotal = await s.textContent('.cc-s-total b').catch(() => '');
  await s.click('.cc-s-back'); await s.waitForTimeout(400);
  await s.click('.cc-s-task:has-text("專題週進度")'); await s.waitForTimeout(700);
  await s.screenshot({ path: S + 'g17-stu-journal.png', fullPage: true });
  r.stuSeesLight = await s.isVisible('text=🔴');
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
