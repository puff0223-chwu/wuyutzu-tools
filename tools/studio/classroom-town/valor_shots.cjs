const { chromium } = require('playwright');
const S = '/tmp/claude-0/studio/'; const U = 'http://localhost:5179';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: '/tmp/claude-0/state.json', viewport: { width: 1440, height: 900 } });
  const errs = []; const r = {};
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? '移除' : undefined));
  await p.goto(U + '/valor'); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.removeItem('gq-mock-apps'); localStorage.setItem('vc-tab', 'board'); localStorage.setItem('vc-board-mode', 'one'); });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.removeItem('gq-mock-apps'); localStorage.removeItem('vc-class'); const D = JSON.parse(localStorage.getItem('gq-mock-db')); for (const t of ['vc_classes','vc_players','vc_teams','vc_log','vc_requests','vc_presets']) D[t] = []; localStorage.setItem('gq-mock-db', JSON.stringify(D)); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: S + 'vc-board0.png' });
  await p.click('.vc-class-card.new'); await p.waitForTimeout(600);
  await p.click('.vc-pick >> nth=0'); await p.click('.modal button:has-text("開班")'); await p.waitForTimeout(1500);
  r.cards = await p.$$eval('.vc-card', (a) => a.length);
  // 分隊、職業（直接改模擬資料）
  const MAP = 'data:image/jpeg;base64,' + require('fs').readFileSync(__dirname + '/quest-map.jpg').toString('base64');
  await p.evaluate((MAP) => {
    const D = JSON.parse(localStorage.getItem('gq-mock-db')); const cl = D.vc_classes[0];
    const jobs = ['warrior', 'priest', 'alchemist']; const cols = ['#c8442b', '#2f5d8a', '#2e7d6f', '#d9a21b', '#7b4fa0', '#c2607a'];
    for (let t = 0; t < 6; t++) D.vc_teams.push({ id: 'tm' + t, class_id: cl.id, teacher_id: 'mock-teacher', name: ['火焰騎士團', '藍鯨艦隊', '翡翠森林', '黃金獅子', '紫晶法師', '櫻花小隊'][t], color: cols[t], sort: t });
    const XP = [12400, 5300, 8800, 3100, 15600, 7200, 9900, 2400, 6100, 10800, 4700, 14200, 3800, 11300, 6600, 1500, 8200, 13100, 5600, 2900, 9400, 16300, 7700, 4100];
    const MAXHP = { warrior: 8, priest: 5, alchemist: 4 }, MAXMP = { warrior: 3, priest: 5, alchemist: 7 };
    D.vc_players.forEach((p, i) => { const j = jobs[(i * 7 + 1) % 3]; p.job = j; p.team_id = 'tm' + (Math.floor(i / 4) % 6); p.style = (i * 5) % 3 === 0 ? 'f' : (i % 2 ? 'f' : 'm');
      p.xp = XP[i % XP.length]; const lv = Math.floor(p.xp / 1000) + 1; const tiers = [1, 3, 6, 10, 15].filter((l) => lv >= l).length; p.skin = String(Math.max(1, tiers - (i % 3 === 2 ? 1 : 0)));
      p.hp = Math.max(1, MAXHP[j] - (i % 4 === 1 ? 2 : i % 5 === 3 ? 1 : 0)); p.mp = Math.max(0, MAXMP[j] - (i % 3)); p.gold = (i * 37) % 160 + 12; p.restored_at = new Date().toISOString(); });
    const N = (id, name, info, x, y, reward) => ({ id, name, info, x, y, reward });
    D.vc_quests = [{ id: 'q1', class_id: cl.id, teacher_id: 'mock-teacher', name: '化學王國大冒險', info: '完成第一章的五個關卡，解鎖「分子塔」的寶藏！', active: true, bg: MAP, ratio: 1.6, sort: 0, created_at: new Date().toISOString(),
      nodes: [N('a', '元素村', '默寫週期表前 20 號，拍照上傳', 21.7, 74.7, { xp: 100 }), N('b', '原子森林', '完成原子結構學習單', 43.3, 50.7, { xp: 150, gold: 10 }), N('c', '分子塔', '用模型組出 3 種分子並拍照', 58.3, 44, { xp: 200 }),
        N('d', '反應河', '完成反應式平衡練習 10 題', 71.7, 56, { xp: 200, gold: 20 }), N('e', '莫耳港', '小組上台講解莫耳的概念', 90, 86.7, { xp: 300, gold: 30 }), N('f', '雪山實驗室', '挑戰題：自己設計一個小實驗', 25, 27, { xp: 400, mp: 1 })],
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['b', 'f']], bonus: { xp: 300, gold: 50 } }];
    D.vc_players.forEach((p, i) => { const k = (i * 3) % 6; p.quests = { q1: { done: ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, k), bonus: false, rej: {} } }; });
    localStorage.setItem('gq-mock-db', JSON.stringify(D));
  }, MAP);
  await p.reload(); await p.waitForTimeout(1800);
  await p.screenshot({ path: S + 'v-board.png' });
  await p.click('.vc-seg button:has-text("團隊")'); await p.waitForTimeout(700);
  await p.screenshot({ path: S + 'v-team.png' });
  await p.click('.vc-seg button:has-text("個人")'); await p.waitForTimeout(500);
  // 隊友互助小卡：勾第一隊的非戰士扣血
  const info = await p.evaluate(() => JSON.parse(localStorage.getItem('gq-mock-db')).vc_players);
  const idx = info.map((x, i) => [x, i]).filter(([x]) => x.team_id === 'tm0' && x.job !== 'warrior').map(([, i]) => i).slice(0, 2);
  r.idx = idx;
  for (const i of idx) await p.click(`.vc-list tbody tr >> nth=${i} >> .ck input`);
  await p.click('.vc-bulk button:has-text("扣血")'); await p.waitForTimeout(300);
  await p.click('.vc-pop .vc-pop-list button >> nth=0'); await p.waitForTimeout(1500);
  await p.screenshot({ path: S + 'v-ask.png' });
  r.ask = await p.$$eval('.vc-ask-row', (a) => a.map((x) => x.textContent.slice(0, 60)));
  // 道具箱：隨機事件
  await p.click('.vc-tabbtn:has-text("道具箱")'); await p.waitForTimeout(400);
  await p.click('.vc-tool:has-text("隨機事件")'); await p.waitForTimeout(300);
  await p.click('.vc-bigbtn'); await p.waitForTimeout(4300);
  await p.screenshot({ path: S + 'v-event.png' });
  await p.click('.vc-stage-x'); await p.waitForTimeout(300);
  await p.click('.vc-tool:has-text("選人")'); await p.waitForTimeout(300);
  await p.click('.vc-bigbtn'); await p.waitForTimeout(4300);
  await p.screenshot({ path: S + 'v-pick.png' });
  await p.click('.vc-stage-x').catch(() => {}); await p.waitForTimeout(300);
  // 任務地圖
  await p.click('.vc-tabbtn:has-text("任務")'); await p.waitForTimeout(800);
  await p.click('.vc-qnode >> nth=2').catch(() => {}); await p.waitForTimeout(400);
  await p.screenshot({ path: S + 'v-quest.png' });
  // 規則設定
  await p.click('.vc-tabbtn:has-text("規則設定")'); await p.waitForTimeout(800);
  await p.screenshot({ path: S + 'v-rules.png' });
  // 學生手機
  const st = await ctx.newPage(); st.on('pageerror', (e) => errs.push('S:' + e.message)); st.on('dialog', (d) => d.accept());
  await st.setViewportSize({ width: 390, height: 844 });
  const w = info[4];
  await st.goto(U + '/v/TEST23'); await st.evaluate(() => sessionStorage.clear()); await st.reload(); await st.waitForTimeout(600);
  await st.fill('input >> nth=0', String(w.class_name)); await st.fill('input >> nth=1', String(w.seat)); await st.fill('input >> nth=2', w.name); await st.fill('input >> nth=3', w.sid);
  await st.click('button:has-text("進入學院")'); await st.waitForTimeout(1800);
  await st.screenshot({ path: S + 'v-s-home.png' });
  await st.click('.vcs-ava-btn'); await st.waitForTimeout(700);
  await st.screenshot({ path: S + 'v-s-skin.png' });
  await st.keyboard.press('Escape'); await st.reload(); await st.waitForTimeout(1500);
  await st.click('.vcs-tabs button:has-text("商店")').catch(() => {}); await st.waitForTimeout(600);
  await st.screenshot({ path: S + 'v-s-shop.png' });
  await st.click('.vcs-tabs button:has-text("任務")').catch(() => {}); await st.waitForTimeout(900);
  await st.screenshot({ path: S + 'v-s-quest.png' });
  await st.click('.vcs-tabs button:has-text("隊友")').catch(() => {}); await st.waitForTimeout(600);
  await st.screenshot({ path: S + 'v-s-mates.png' });
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
