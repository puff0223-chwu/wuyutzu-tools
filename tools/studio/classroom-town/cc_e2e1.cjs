const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:5179/caseclass');
  // seed
  await p.evaluate(() => {
    const names = ['陳小安','林大明','黃小華','張大偉','李小美','王大同','吳小芸','劉大志','蔡小婷','楊大翔','許小涵','鄭大宇','謝小柔','郭大成','洪小琪','曾大豪','邱小晴','廖大凱','賴小真','周大文','葉小妮','蘇大華','莊小玉','呂大銘'];
    const D = { session: { user: { id: 'mock-teacher', email: 'teacher@example.com' } }, teachers: [{ id: 'mock-teacher', name: '巫魚子老師', code: 'TEST23' }],
      semesters: [{ id: 'sem1', name: '115-1', is_current: true, sort: 0 }], course_types: [], classes: [{ id: 'k207', semester_id: 'sem1', name: '207' }],
      class_students: names.map((n, i) => ({ id: 'cs' + i, class_id: 'k207', seat: i + 1, name: n, sid: String(1140001 + i) })), courses: [], enrollments: [], accounts: {} };
    localStorage.setItem('gq-mock-db', JSON.stringify(D));
  });
  await p.reload(); await p.waitForTimeout(800);
  await p.screenshot({ path: S + '01-board-empty.png' });
  await p.click('text=＋ 開新課堂 >> nth=0'); await p.waitForTimeout(300);
  await p.fill('input[placeholder^="例：207"]', '207 探究與實作');
  await p.click('button.cc-pick'); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '02-newcase.png' });
  await p.click('.modal-foot >> text=開課'); await p.waitForTimeout(800);
  await p.screenshot({ path: S + '03-case.png' });
  await p.click('text=🕵️ 偵探小隊'); await p.waitForTimeout(300);
  await p.fill('input.num', '6'); await p.click('text=建立小隊'); await p.waitForTimeout(600);
  await p.click('text=🎲 隨機平均分組'); await p.waitForTimeout(800);
  await p.screenshot({ path: S + '04-squads.png', fullPage: true });
  // rubric library
  await p.click('text=📚 規準庫'); await p.waitForTimeout(300);
  await p.click('text=📦 從範本新增'); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '05-templates.png' });
  await p.click('.cc-rub-card.tpl:has-text("期中報告｜PPT") >> text=＋ 加入規準庫'); await p.waitForTimeout(400);
  await p.click('.cc-tabbtn:has-text("小隊密報")'); await p.click('text=📦 從範本新增'); await p.click('.cc-rub-card.tpl:has-text("通用") >> text=＋ 加入規準庫'); await p.waitForTimeout(400);
  await p.click('.cc-tabbtn:has-text("作品評分")'); await p.click('.cc-rub-card:has-text("期中報告｜PPT") >> [title=編輯]'); await p.waitForTimeout(300);
  await p.screenshot({ path: S + '06-editor.png', fullPage: true });
  await p.click('.modal .cc-back'); await p.click('.modal-head .icon-btn');
  // task
  await p.click('text=📜 委託任務'); await p.click('text=發布委託任務'); await p.waitForTimeout(300); await p.click('.cc-kind:has-text("分組上台報告")'); await p.waitForTimeout(300);
  await p.fill('input[placeholder^="例：期中報告"]', '期中報告'); await p.fill('.modal input.num', '5');
  await p.click('text=下一步 ›'); await p.click('text=📚 打開規準庫選擇'); await p.waitForTimeout(300);
  await p.screenshot({ path: S + '07a-picker.png' });
  await p.click('.cc-rub-card:has-text("期中報告｜PPT") >> text=✔ 選這份'); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '07-wizard2.png' });
  await p.click('text=下一步 ›'); await p.click('text=📚 打開規準庫選擇'); await p.waitForTimeout(300);
  await p.screenshot({ path: S + '07b-picker-peer.png' });
  await p.click('.cc-rub-card:has-text("通用") >> text=✔ 選這份');
  await p.click('text=下一步 ›'); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '08-wizard4.png' });
  await p.click('text=🚀 發布任務'); await p.waitForTimeout(800);
  await p.click('.cc-now-btns .btn.accent'); await p.waitForTimeout(600);
  await p.screenshot({ path: S + '09-console.png', fullPage: true });
  await ctx.storageState({ path: '/tmp/claude-0/state.json' });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
