const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: '/tmp/claude-0/state.json', viewport: { width: 1366, height: 860 } });
  const errs = []; const t = await ctx.newPage(); t.on('pageerror', e => errs.push('T:' + e.message)); t.on('dialog', (d) => d.accept());
  await t.goto('http://localhost:5179/caseclass'); await t.waitForTimeout(900);
  await t.click('.cc-back'); await t.waitForTimeout(400);
  await t.click('.cc-tabbtn:has-text("委託任務")'); await t.click('text=發布委託任務'); await t.waitForTimeout(300);
  await t.screenshot({ path: S + 'b00-pick.png' });
  await t.click('.cc-kind:has-text("情報板")');
  await t.click('.cc-purpose-chip button:has-text("提問牆")');
  await t.fill('.modal textarea', '關於反應速率，你還有什麼不懂的地方？');
  await t.screenshot({ path: S + 'b01-wizard.png' });
  await t.fill('.modal input[placeholder^="自己取名"]', '實驗討論'); await t.click('.cc-menu-item:has-text("小隊頻道")'); await t.click('.cc-purpose-add'); await t.waitForTimeout(300);
  await t.click('.cc-menu-item:has-text("小隊頻道")'); await t.fill('.modal input[placeholder^="自己取名"]', '提問牆');
  await t.screenshot({ path: S + 'b02-wizard-rules.png' });
  await t.click('text=🚀 開啟情報板'); await t.waitForTimeout(900);
  const D = await t.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')));
  const task = D.cc_tasks.find((x) => x.kind === 'board');
  const mem = D.cc_members.filter((m) => m.case_id === task.case_id).slice(0, 4);
  const proj = await ctx.newPage(); proj.on('pageerror', e => errs.push('P:' + e.message));
  await proj.goto('http://localhost:5179/caseclass/live/' + task.id); await proj.waitForTimeout(1500);
  await proj.screenshot({ path: S + 'b03-proj-empty.png' });
  const login = async (p, m) => {
    await p.goto('http://localhost:5179/cc/TEST23'); await p.evaluate(() => sessionStorage.clear()); await p.reload();
    await p.fill('input[placeholder="例：207"]', String(m.class_name)); await p.fill('input[placeholder="例：5"]', String(m.seat));
    await p.fill('form label:has-text("姓名") input', m.name); await p.fill('input[type=password]', m.sid);
    await p.click('text=🔍 報到'); await p.waitForTimeout(500);
  };
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', e => errs.push('S:' + e.message)); s.on('dialog', (d) => d.accept());
  const Q = ['為什麼溫度越高反應越快？', '催化劑會不會被消耗掉？我覺得課本說的跟實驗結果不太一樣', '活化能可以用生活例子解釋嗎？像是推石頭過山丘那樣？', '濃度和表面積哪個影響比較大？'];
  for (let i = 0; i < 4; i++) {
    await login(s, mem[i]); await s.click('.cc-s-task:has-text("提問牆")'); await s.waitForTimeout(500);
    if (i === 1) await s.click('.cc-s-compose label:has-text("匿名")');
    await s.fill('.cc-s-compose textarea', Q[i]); await s.click('.cc-s-compose .cc-s-go'); await s.waitForTimeout(500);
    const likeBtns = await s.$$('.cc-s-post:not(.mine) .cc-s-post-acts .cc-like:first-child');
    for (const lb of likeBtns.slice(0, 2)) { await lb.click(); await s.waitForTimeout(250); }
  }
  // 回覆
  await s.click('.cc-s-post >> nth=1 >> .cc-like:has-text("回覆")'); await s.fill('.cc-reply-box textarea', '我覺得是因為分子碰撞次數變多'); await s.click('.cc-reply-box button'); await s.waitForTimeout(500);
  await s.screenshot({ path: S + 'b04-stu.png', fullPage: true });
  await t.bringToFront(); await t.waitForTimeout(3500);
  await t.screenshot({ path: S + 'b05-wall.png', fullPage: true });
  // 老師：投影聚焦第一則、回覆
  await t.click('.cc-post >> nth=0 >> button[title="在投影畫面放大這則"]'); await t.waitForTimeout(600);
  await t.click('.cc-post >> nth=1 >> .btn:has-text("回覆")'); await t.waitForTimeout(200);
  await t.fill('.cc-post >> nth=1 >> .cc-reply-box textarea', '好問題！下節課用實驗來看看 https://phet.colorado.edu/zh_TW/');
  await t.click('.cc-post >> nth=1 >> .cc-reply-box button'); await t.waitForTimeout(700);
  await t.screenshot({ path: S + 'b06-wall2.png', fullPage: true });
  await proj.bringToFront(); await proj.waitForTimeout(3500);
  await proj.screenshot({ path: S + 'b07-proj-spot.png' });
  await t.bringToFront(); await t.click('.cc-post.spot button[title="取消投影聚焦"]'); await t.waitForTimeout(500);
  await proj.bringToFront(); await proj.waitForTimeout(3500); await proj.screenshot({ path: S + 'b08-proj-wall.png' });
  await t.bringToFront(); await t.click('.cc-tabbtn:has-text("參與統計")'); await t.waitForTimeout(300); await t.screenshot({ path: S + 'b09-stats.png', fullPage: true });
  await t.click('.cc-tabbtn:has-text("任務設定")'); await t.waitForTimeout(300); await t.screenshot({ path: S + 'b10-settings.png', fullPage: true });
  await s.bringToFront(); await s.reload(); await s.waitForTimeout(800); await s.screenshot({ path: S + 'b11-stu2.png', fullPage: true });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
