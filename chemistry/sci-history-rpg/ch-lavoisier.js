/* =========================================================
   時光手稿 第一章：拉瓦節 —— 燃素魔的謊言
   ---------------------------------------------------------
   主線（約 15 分鐘）：
     實驗室 → 找瑪麗－安拿玻璃鐘罩 → 儲藏室熄滅火苗拿精密天平
     → 實驗①煅燒錫（開放）→ 實驗②密封曲頸瓶 → 沙龍見普利斯特里
     → 庭院拿大透鏡 → 實驗③汞的十二天實驗 → 科學院打倒燃素魔
   支線：瑪麗－安的三張手稿、三則拉瓦節傳說真假
   史實依據：拉瓦節《化學基本論述》(1789)、錫的密封煅燒實驗 (1774)、
            普利斯特里 1774 年 8 月以透鏡加熱汞煅灰、同年 10 月訪問巴黎
   ========================================================= */
const CH_LAVOISIER = (() => {
  const S = SH;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 角色 ---------- */
  const cast = {
    lavoisier: { name: '拉瓦節', spr: 'lavoisier' },
    marie: { name: '瑪麗－安（拉瓦節夫人）', spr: 'marie' },
    priestley: { name: '普利斯特里', spr: 'priestley' },
    book: { name: '時光手稿', spr: 'portal', isObj: true },
    boss: { name: '燃素魔', spr: 'boss' }
  };

  /* ---------- 道具與證據 ---------- */
  const items = {
    jar: { icon: '🫙', name: '玻璃鐘罩', desc: '罩住燃燒的東西，火很快就會熄滅。面對火苗按 B 使用。',
      use(G) {
        const m = S.killMinionInFront();
        if (!m) { S.toast('🫙 前面沒有火苗'); return; }
        S.toast('🫙 火苗熄滅了！');
        if (!S.flag('jarTalk')) {
          S.flag('jarTalk', true);
          S.run(async () => {
            await S.say(null, '罩住的火苗很快就熄了。\n燃素說的解釋是：「鐘罩裡的空氣吸飽了燃素，吸不下了，所以火熄了。」');
            await S.say(null, '真的是這樣嗎？先把這個問題記在心裡。');
          });
        }
        if (S.minionsLeft() === 0 && S.state().roomId === 'storage') S.toast('火苗都熄滅了！寶箱可以打開了');
      } },
    balance: { icon: '⚖️', name: '精密天平', desc: '拉瓦節最自豪的天平，能量出非常小的質量變化。' },
    lens: { icon: '🔍', name: '取火大透鏡', desc: '把陽光聚成一點，溫度高到可以分解紅色的汞煅灰。' }
  };
  const evidence = {
    ev_heavier: { icon: '📜', name: '煅灰比金屬重', desc: '錫在空氣中加熱變成煅灰，質量反而增加了。' },
    ev_sealed: { icon: '📜', name: '密封加熱，總質量不變', desc: '錫放在密封的曲頸瓶裡加熱，整瓶的質量前後一樣。' },
    ev_airin: { icon: '📜', name: '開瓶時空氣衝進去', desc: '打開曲頸瓶會「嘶」一聲，空氣衝進去；增加的質量和錫增加的一樣多。' },
    ev_part: { icon: '📜', name: '空氣少了約 1/6', desc: '汞在密閉空氣中加熱 12 天，空氣減少約六分之一，剩下的空氣讓火焰熄滅。' },
    ev_vital: { icon: '📜', name: '紅色煅灰放出助燃的氣體', desc: '強熱紅色的汞煅灰會放出氣體，蠟燭在裡面燒得特別旺。' },
    ev_mix: { icon: '📜', name: '兩種氣體混合又變回空氣', desc: '把兩種氣體混合，又得到和普通空氣一樣的氣體。' }
  };

  /* ---------- 小工具 ---------- */
  const F = k => S.flag(k);
  const pages = () => ['page1', 'page2', 'page3'].filter(k => F(k)).length;
  function record(key, ok, pick) { const st = S.state().stats; st.predictions[key] = { ok, pick }; }

  // 實驗台：顯示內容＋按鈕，等學生按
  async function step(p, html, buttons) {
    p.body.innerHTML = `<div class="exp">${html}</div><div class="exp-btns">${buttons.map(b => `<button class="btn ${b.cls || ''}" data-v="${b.v}">${b.label}</button>`).join('')}</div>`;
    return p.wait();
  }
  // 預測／推理題：回傳選的 index
  async function ask(p, key, html, options, correct, feedback) {
    const v = await step(p, html + `<p class="q">🤔 ${feedback.q}</p>`, options.map((o, i) => ({ v: i, label: o, cls: 'opt' })));
    const i = +v, ok = correct === null || i === correct;
    if (key) record(key, correct === null ? null : ok, options[i]);
    const fb = (feedback.each && feedback.each[i]) || (ok ? feedback.ok : feedback.no);
    await step(p, html + `<div class="fb ${correct === null ? 'neutral' : ok ? 'ok' : 'no'}">${correct === null ? '💭' : ok ? '✅' : '💡'} ${fb}</div>`, [{ v: 'go', label: '繼續 ▶' }]);
    return i;
  }

  /* ---------- 實驗插圖（SVG） ---------- */
  const svg = (inner, h = 150) => `<svg class="exp-svg" viewBox="0 0 300 ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  function balanceSVG(reading, label, color = '#9aa3ad') {
    return svg(`
      <rect x="40" y="118" width="220" height="16" rx="4" fill="#7b522a"/>
      <rect x="70" y="92" width="160" height="26" rx="5" fill="#2b2f3a"/>
      <rect x="95" y="97" width="110" height="16" rx="3" fill="#a9f0b0"/>
      <text x="150" y="110" text-anchor="middle" font-family="monospace" font-size="14" fill="#123">${reading}</text>
      <rect x="110" y="84" width="80" height="8" rx="2" fill="#555"/>
      <g>${label}</g>`);
  }
  const crucible = (state) => {
    const fill = state === 'calx' ? '#d9d6cf' : state === 'heat' ? '#e9a35b' : '#b8bec7';
    return `<path d="M120 50 L180 50 L172 82 L128 82 Z" fill="#c9b49a" stroke="#6b4e2e" stroke-width="2"/>
      <ellipse cx="150" cy="58" rx="24" ry="5" fill="${fill}"/>
      ${state === 'heat' ? '<path d="M135 86 q5 -12 10 0 q5 -14 10 0 q5 -12 10 0" fill="#f08a3a"/>' : ''}
      <text x="150" y="40" text-anchor="middle" font-size="12" fill="#555">${state === 'calx' ? '錫的煅灰（灰白色粉末）' : state === 'heat' ? '加熱中……' : '錫（銀白色金屬）'}</text>`;
  };
  const retort = (opts = {}) => `
      <ellipse cx="135" cy="62" rx="30" ry="22" fill="#d7f0ff" stroke="#4d8fb8" stroke-width="2"/>
      <path d="M160 50 L215 34 L218 40 L163 58 Z" fill="#d7f0ff" stroke="#4d8fb8" stroke-width="2"/>
      ${opts.sealed ? '<rect x="212" y="30" width="10" height="12" rx="2" fill="#7b522a"/>' : ''}
      <ellipse cx="135" cy="76" rx="18" ry="5" fill="${opts.calx ? '#d9d6cf' : '#b8bec7'}"/>
      ${opts.heat ? '<path d="M118 88 q5 -12 10 0 q5 -14 10 0 q5 -12 10 0" fill="#f08a3a"/>' : ''}
      ${opts.hiss ? '<text x="232" y="34" font-size="16" fill="#2c4a7c" font-weight="bold">嘶～</text><path d="M226 38 l14 -6 M226 44 l16 0" stroke="#4d8fb8" stroke-width="2"/>' : ''}`;
  function mercurySVG(day, vol, opts = {}) {   // 空氣變少時，鐘罩內的汞面會上升
    return svg(`
      <rect x="10" y="96" width="70" height="8" fill="#8a4a34"/>
      <path d="M22 96 q8 -14 14 0 q6 -16 14 0 q6 -14 14 0" fill="#f08a3a" opacity="${opts.heat ? 1 : 0}"/>
      <ellipse cx="45" cy="74" rx="30" ry="20" fill="#d7f0ff" stroke="#4d8fb8" stroke-width="2"/>
      <ellipse cx="45" cy="86" rx="20" ry="5" fill="#c4c8cf"/>
      ${day > 0 ? `<ellipse cx="45" cy="84" rx="${Math.min(18, day * 1.5)}" ry="3" fill="#c0392b" opacity="0.85"/>` : ''}
      <path d="M70 62 Q120 20 175 34 L175 40 Q122 28 74 68 Z" fill="#d7f0ff" stroke="#4d8fb8" stroke-width="2"/>
      <rect x="150" y="104" width="120" height="30" rx="4" fill="#9aa0a8" stroke="#555"/>
      <path d="M170 30 Q170 18 210 18 Q250 18 250 30 L250 120 L170 120 Z" fill="#eef9ff" stroke="#4d8fb8" stroke-width="2"/>
      <rect x="171" y="${108 - (50 - vol) * 3.2}" width="78" height="${12 + (50 - vol) * 3.2}" fill="#b8bec7"/>
      <text x="210" y="60" text-anchor="middle" font-size="13" fill="#2c4a7c" font-weight="bold">空氣 ${vol} 立方英寸</text>
      <text x="45" y="125" text-anchor="middle" font-size="12" fill="#555">曲頸瓶裡的汞</text>
      <text x="210" y="148" text-anchor="middle" font-size="11" fill="#555">倒扣在汞槽上的鐘罩</text>
      <text x="100" y="14" text-anchor="middle" font-size="13" fill="#c0392b" font-weight="bold">${day ? `第 ${day} 天` : ''}</text>`, 155);
  }
  const candle = state => svg(`
      <path d="M110 30 Q110 14 150 14 Q190 14 190 30 L190 120 L110 120 Z" fill="#eef9ff" stroke="#4d8fb8" stroke-width="2"/>
      <rect x="143" y="80" width="14" height="40" fill="#f4f1ea" stroke="#ccc"/>
      ${state === 'out' ? '<path d="M150 78 q-6 -10 2 -18 q-8 -6 0 -14" stroke="#999" fill="none" stroke-width="2"/>' : ''}
      ${state === 'burn' ? '<ellipse cx="150" cy="70" rx="5" ry="10" fill="#f08a3a"/><ellipse cx="150" cy="72" rx="2.5" ry="5" fill="#fff3b0"/>' : ''}
      ${state === 'bright' ? '<ellipse cx="150" cy="62" rx="11" ry="20" fill="#ffb347"/><ellipse cx="150" cy="66" rx="6" ry="11" fill="#fff3b0"/><circle cx="150" cy="60" r="30" fill="#fff3b0" opacity="0.25"/>' : ''}
      <rect x="100" y="120" width="100" height="8" fill="#9aa0a8"/>
      <text x="150" y="145" text-anchor="middle" font-size="12" fill="#555">${state === 'out' ? '蠟燭熄滅了' : state === 'bright' ? '火焰變得又大又亮！' : '點燃的蠟燭'}</text>`, 150);

  /* ---------- 實驗①：在空氣中煅燒錫 ---------- */
  async function exp1() {
    const p = S.panel('🔬 實驗台①：在空氣中加熱錫（1772–1774）');
    await step(p, `${balanceSVG('100.0 g', crucible('tin'))}<p>把 <b>100.0 g</b> 的錫放進坩堝，在空氣中強熱，讓它完全變成「煅灰」。</p>`, [{ v: 1, label: '開始推理 ▶' }]);
    await ask(p, 'exp1_phlogiston', `${balanceSVG('100.0 g', crucible('tin'))}`, ['變輕', '不變', '變重'], 0,
      { q: '依照<b>燃素說</b>（燃燒時燃素會跑掉），錫變成煅灰後，質量應該會？', ok: '對！照燃素說的想法，燃素跑掉了，應該<b>變輕</b>。木頭燒完剩下一點灰，看起來也確實如此。', no: '照燃素說的想法，燃燒會放出燃素，東西應該<b>變輕</b>才對。木頭燒完剩下一點灰，看起來也確實如此。' });
    await step(p, `${balanceSVG('100.0 g', crucible('heat'))}<p>用熔爐強熱……</p>`, [{ v: 1, label: '🔥 加熱完成，放上天平秤！' }]);
    S.SFX.get();
    await step(p, `${balanceSVG('127.0 g', crucible('calx'))}<p class="big">⚖️ 煅灰的質量：<b>127.0 g</b></p><p>比原本的錫<b>重了 27.0 g</b>！和燃素說的預測<b>相反</b>。</p>`, [{ v: 1, label: '怎麼會這樣？ ▶' }]);
    S.addEvidence('ev_heavier');
    await ask(p, 'exp1_hypo', `<p>當時的科學家對「金屬燒過反而變重」提出了好幾種解釋：</p>`,
      ['燃素有「負的重量」，燃素跑掉，金屬就變重了', '火的微粒穿過容器，鑽進金屬裡（波以耳的想法）', '金屬和空氣中的某種東西結合了'], null,
      { q: '你覺得哪一種最有可能？', each: [
        '很多燃素說的支持者真的這樣想！但「負的重量」很奇怪：其他東西燒完明明變輕了。',
        '這是英國化學家波以耳的解釋，他曾經這樣解釋金屬變重。',
        '這是拉瓦節的想法！不過，光是「覺得」還不夠。'] });
    await ask(p, 'exp1_design', `<p>三種說法都有人支持。科學家不會憑感覺選，要<b>設計實驗</b>把錯的說法淘汰掉！</p>`,
      ['把錫放進密封的玻璃瓶再加熱，比較加熱前後整瓶的質量', '加熱更久一點，看會不會更重', '換成鐵再做一次'], 0,
      { q: '要怎麼分辨「火的微粒從外面鑽進來」和「金屬跟空氣結合」？',
        ok: '好設計！如果火的微粒從瓶外鑽進來，<b>整瓶</b>應該會變重；如果是跟瓶子裡的空氣結合，整瓶就不會變。',
        no: '這樣只會得到更多「變重」的結果，分辨不出是哪個原因。拉瓦節的做法是：<b>把錫密封在玻璃瓶裡加熱</b>，比較整瓶的質量。' });
    p.close();
    S.flag('exp1', true);
    await S.say('lavoisier', '密封的曲頸瓶就在熔爐旁邊，我們去試試看！');
  }

  /* ---------- 實驗②：密封曲頸瓶 ---------- */
  async function exp2() {
    const p = S.panel('🔬 實驗台②：密封的曲頸瓶（1774）');
    const lbl = o => `<g transform="translate(0,-8)">${retort(o)}</g>`;
    await step(p, `${balanceSVG('500.0 g', lbl({ sealed: true }))}<p>把錫放進曲頸瓶，<b>封住瓶口</b>（瓶子裡還有空氣），連瓶子一起秤：<b>500.0 g</b>。</p>`, [{ v: 1, label: '下一步 ▶' }]);
    await ask(p, 'exp2_predict', `${balanceSVG('500.0 g', lbl({ sealed: true }))}`, ['增加', '不變', '減少'], 0,
      { q: '如果「火的微粒穿過玻璃，鑽進錫裡」是對的，密封加熱後，<b>整瓶</b>的質量應該會？',
        ok: '沒錯！外面的東西鑽進來，整瓶就會<b>增加</b>。我們來看看實驗結果。', no: '如果有東西從瓶外鑽進來，整瓶應該會<b>增加</b>才對。我們來看看實驗結果。' });
    await step(p, `${balanceSVG('500.0 g', lbl({ sealed: true, heat: true }))}<p>加熱……瓶子裡的錫，表面慢慢變成灰白色的煅灰。</p>`, [{ v: 1, label: '冷卻後秤整瓶 ⚖️' }]);
    S.SFX.get();
    await step(p, `${balanceSVG('500.0 g', lbl({ sealed: true, calx: true }))}<p class="big">⚖️ 整瓶的質量：<b>500.0 g</b>，完全沒變！</p><p>如果有「火的微粒」從外面鑽進來，整瓶一定會變重。<b>這個說法被淘汰了！</b></p>`, [{ v: 1, label: '可是……錫明明變成煅灰了？ ▶' }]);
    S.addEvidence('ev_sealed');
    await step(p, `${balanceSVG('500.0 g', lbl({ sealed: true, calx: true }))}<p>瓶子裡的錫有一部分變成了煅灰。如果錫變重了，增加的質量是從哪裡來的？</p><p>拉瓦節決定：<b>打開瓶塞</b>。</p>`, [{ v: 1, label: '🍾 打開瓶塞' }]);
    S.SFX.puff();
    await step(p, `${balanceSVG('500.8 g', lbl({ calx: true, hiss: true }))}<p class="big">「嘶——！」<b>空氣衝進了瓶子裡！</b></p><p>再秤一次整瓶：<b>500.8 g</b>，增加了 0.8 g。<br>把錫和煅灰倒出來秤，也剛好比原本的錫重了 <b>0.8 g</b>。</p>`, [{ v: 1, label: '這代表什麼？ ▶' }]);
    S.addEvidence('ev_airin');
    await ask(p, 'exp2_meaning', `<p>開瓶後衝進去的空氣：0.8 g　｜　錫增加的質量：0.8 g</p>`,
      ['錫增加的質量，來自瓶子裡被「用掉」的那部分空氣', '燃素有負的重量', '天平壞了'], 0,
      { q: '這兩個數字一樣，代表什麼？',
        ok: '完全正確！瓶子裡有一部分空氣跟錫結合了，所以開瓶時，外面的空氣才會衝進來補上。<b>質量沒有憑空出現，也沒有憑空消失。</b>',
        no: '其實是：瓶子裡有一部分空氣<b>跟錫結合了</b>，所以開瓶時外面的空氣才衝進來補上。增加的質量都來自空氣，<b>沒有憑空出現，也沒有憑空消失</b>。' });
    p.close();
    S.flag('exp2', true);
    await S.say('lavoisier', '金屬煅燒，是跟空氣中的「某種成分」結合！可是……空氣裡的哪一種成分？');
    await S.say('lavoisier', '聽說英國的普利斯特里先生今晚來巴黎，在我家沙龍吃晚餐。他最近做了一個很有意思的實驗。');
    await S.say('lavoisier', '沙龍在庭院的西邊，去找他聊聊吧！');
  }

  /* ---------- 實驗③：汞的十二天實驗 ---------- */
  async function exp3() {
    const p = S.panel('🔬 實驗台③：汞與空氣的十二天實驗');
    await step(p, `${mercurySVG(0, 50)}<p>拉瓦節的設計：曲頸瓶裡放汞，瓶口彎進一個<b>倒扣在汞槽上的鐘罩</b>，裡面關著約 <b>50 立方英寸</b>的空氣。</p><p>這樣就能看出空氣的體積有沒有改變。</p>`, [{ v: 1, label: '下一步 ▶' }]);
    await ask(p, 'exp3_predict', `${mercurySVG(0, 50)}`, ['變多', '不變', '變少'], 2,
      { q: '連續加熱很多天後，鐘罩裡空氣的體積會？', ok: '你想得跟拉瓦節一樣！如果汞跟空氣的某種成分結合，空氣就會<b>變少</b>。', no: '想想實驗②：金屬會<b>用掉</b>一部分空氣。那空氣的體積應該會變少才對。' });
    const vols = [50, 49, 48, 47.5, 46.5, 45.5, 45, 44, 43.5, 43, 42.5, 42, 42];
    let day = 0;
    while (day < 12) {
      const v = await step(p, `${mercurySVG(day, vols[day], { heat: true })}<p>持續加熱，讓汞保持在快要沸騰的溫度……</p>`, [{ v: 'next', label: day === 0 ? '🔥 開始加熱' : '⏩ 快轉 3 天' }]);
      day = Math.min(12, day + (day === 0 ? 1 : 3)); if (v === 'skip') day = 12;
    }
    S.SFX.get();
    await step(p, `${mercurySVG(12, 42)}<p class="big">第 12 天：汞的表面出現許多<b style="color:#c0392b">紅色的煅灰</b>，空氣只剩約 <b>42 立方英寸</b>。</p>`, [{ v: 1, label: '計算看看 ▶' }]);
    await ask(p, 'exp3_fraction', `${mercurySVG(12, 42)}<p>50 立方英寸 → 42 立方英寸</p>`, ['約 1/2', '約 1/6', '約 1/10'], 1,
      { q: '空氣大約少了幾分之幾？',
        ok: '對！8 ÷ 50 ≈ 0.16，大約 <b>1/6</b>。現在我們知道氧氣約佔空氣的 21%（約 1/5）。當年的器材有誤差，但已經非常接近了！',
        no: '少了 50 − 42 = 8，8 ÷ 50 ≈ 0.16，大約 <b>1/6</b>。現在我們知道氧氣約佔空氣的 21%（約 1/5），拉瓦節當年的結果已經很接近了！' });
    await step(p, `${candle('burn')}<p>把點燃的蠟燭放進<b>剩下的空氣</b>裡……</p>`, [{ v: 1, label: '放進去 ▶' }]);
    S.SFX.puff();
    await step(p, `${candle('out')}<p class="big">蠟燭立刻熄滅了！</p><p>剩下的空氣不能幫助燃燒（當年把小動物放進去，也很快就窒息了）。</p>`, [{ v: 1, label: '繼續 ▶' }]);
    S.addEvidence('ev_part');
    await step(p, `<p>接著，把收集到的<b style="color:#c0392b">紅色煅灰</b>放進小曲頸瓶，用<b>🔍 取火大透鏡</b>聚光強熱……</p><p>紅色煅灰慢慢消失，變回亮晶晶的汞，同時放出一種氣體，收集到約 <b>8 立方英寸</b>。</p>`, [{ v: 1, label: '用蠟燭測試這種氣體 ▶' }]);
    S.SFX.get();
    await step(p, `${candle('bright')}<p class="big">蠟燭燒得又大又亮！</p><p>這就是普利斯特里說的那種氣體。</p>`, [{ v: 1, label: '繼續 ▶' }]);
    S.addEvidence('ev_vital');
    await ask(p, 'exp3_compare', `<p>空氣減少了約 8 立方英寸；紅色煅灰放出的氣體約 8 立方英寸。</p>`, ['差不多', '多很多', '少很多'], 0,
      { q: '這兩個量相比？', ok: '<b>差不多！</b>汞從空氣中拿走的成分，加熱煅灰時又被放了出來。', no: '其實兩個量<b>差不多</b>：汞從空氣中拿走的成分，加熱煅灰時又被放了出來。' });
    await step(p, `${candle('burn')}<p>最後，把這 8 立方英寸的氣體，加回剩下的 42 立方英寸空氣裡……</p>`, [{ v: 1, label: '混合 ▶' }]);
    await step(p, `${candle('burn')}<p class="big">混合後的氣體，性質又和<b>普通空氣一模一樣</b>了！</p>`, [{ v: 1, label: '繼續 ▶' }]);
    S.addEvidence('ev_mix');
    await ask(p, 'exp3_air', `<p>空氣可以分成兩種性質相反的氣體，混合後又變回空氣。</p>`, ['一種不能再分的元素', '至少由兩種氣體混合而成', '燃素和水的混合物'], 1,
      { q: '所以，空氣是什麼？', ok: '正確！空氣<b>不是元素</b>，而是混合物。', no: '空氣能拆成兩種氣體、又能混回來，所以空氣<b>不是元素</b>，而是至少由兩種氣體混合成的。' });
    p.close();
    S.flag('exp3', true);
    await S.say('lavoisier', '空氣裡有一種成分，能讓物質燃燒、讓動物呼吸。我後來把它命名為 **oxygène**，也就是「氧」。');
    await S.say('lavoisier', '燃燒，就是物質和氧結合！根本不需要什麼燃素。');
    await S.say('lavoisier', '我要到皇家科學院發表這些結果。科學院在庭院的東邊……不過，我感覺燃素魔不會輕易認輸。');
    await S.say('book', '把蒐集到的證據帶好，前往科學院吧！');
  }

  /* ---------- Boss：燃素魔 ---------- */
  const BOSS = {
    x: 7, y: 1.5,
    phases: [
      { claim: '東西燃燒時會放出燃素，就是我！所以燒過的東西一定會變輕！', answer: 'ev_heavier',
        hint: '找一個「燒完反而變重」的證據。', win: '燃素魔：「什、什麼？金屬燒完反而變重……」\n第一層護盾碎了！' },
      { claim: '那是因為火的微粒穿過玻璃，鑽進金屬裡，金屬才變重的！', answer: 'ev_sealed',
        hint: '如果有東西從外面鑽進容器，整個容器的質量會怎樣？', win: '燃素魔：「密封起來，整瓶都沒變重……可惡！」\n第二層護盾碎了！' },
      { claim: '哼！那就是燃素有「負的重量」！燃素跑出來，金屬當然變重！', answer: 'ev_airin',
        hint: '金屬增加的質量，跟哪一樣東西「剛好一樣多」？', win: '燃素魔：「增加的質量剛好等於衝進去的空氣……」\n第三層護盾碎了！' },
      { claim: '空氣是一種元素！燃燒只是燃素跑進空氣裡，空氣吸飽了，火就熄了！', answer: 'ev_mix',
        hint: '空氣真的不能再分了嗎？', win: '' }
    ],
    async onWin() {
      S.flag('bossDone', true);
      await S.say('boss', '不……不可能……我明明可以解釋所有的現象……');
      await S.say('book', '燃素說確實能「解釋」很多現象，但它通不過<b>精確的測量</b>。'.replace(/<\/?b>/g, '**'));
      await S.say('book', '這就是拉瓦節帶來的改變：**讓天平來說話**。');
      await ending();
    }
  };

  async function ending() {
    await S.say('lavoisier', '謝謝你！我們一起找到的，可以整理成三件事：');
    await S.say('lavoisier', '一、**質量守恆**：化學反應前後，物質的總質量不變。物質不會憑空產生，也不會憑空消失。');
    await S.say('lavoisier', '二、**燃燒是物質和氧結合**，不是放出燃素。金屬的煅燒（生鏽）也是一樣的道理。');
    await S.say('lavoisier', '三、**元素**是用化學方法無法再分解的物質。空氣能分成兩種氣體，所以不是元素；後來我們也證明了水是氫和氧組成的化合物。');
    await S.say('book', '不過，故事還沒結束。拉瓦節也犯過錯喔！');
    await S.say('book', '1789 年出版的《化學基本論述》裡，他列出 33 種元素，其中竟然有「光」和「熱質」。他用一種看不見的「熱的物質」，取代了燃素。');
    await S.say('book', '他把氧取名為「生成酸的元素」，以為所有的酸都含有氧；後來發現鹽酸裡根本沒有氧。');
    await S.say('book', '科學不是一次就找到標準答案，而是不斷用證據修正。拉瓦節修正了燃素說，後人也修正了拉瓦節。');
    await S.say('book', '1794 年 5 月 8 日，拉瓦節因為曾經擔任「包稅官」，在法國大革命中被送上斷頭台，享年 50 歲。');
    const c = await S.choose('book', '關於拉瓦節，流傳著幾則有名的傳說。要猜猜看它們是真是假嗎？（支線）', ['好啊！', '下次再說']);
    if (c === 0) await legends();
    await S.say('book', '「質量守恆」、「燃燒與氧」、「元素」三頁手稿回來了！知識網路上，新的科學家亮了起來……');
    S.finish({ legends: S.flag('legendScore') ?? null, pages: pages(), extraHeart: !!F('pagesDone') });
  }

  async function legends() {
    const L = [
      { t: '傳說一：審判時，法官說「共和國不需要科學家」。', a: 1, e: '這句話非常有名，但<b>找不到可靠的當時紀錄</b>，史學家認為很可能是後人編出來的。'.replace(/<\/?b>/g, '**') },
      { t: '傳說二：拉瓦節和朋友約好，被斬首後盡量眨眼，用來研究人頭落地後還有沒有意識。', a: 1, e: '這個故事流傳很廣，但**沒有任何當時的紀錄**，屬於傳說。' },
      { t: '傳說三：數學家拉格朗日感嘆：「砍下這顆頭只要一瞬間，但再過一百年，也未必長得出一顆一樣的。」', a: 0, e: '這段話記載在後人為拉格朗日寫的傳記中，**一般認為可信**。' }
    ];
    let score = 0;
    for (const q of L) {
      const i = await S.choose('book', q.t, ['真的', '假的（查無實據）']);
      if (i === q.a) score++;
      await S.say('book', (i === q.a ? '答對了！' : '其實……') + q.e);
    }
    S.flag('legendScore', score);
    await S.say('book', `三則傳說你猜對了 ${score} 則。查證「誰在什麼時候留下了紀錄」，也是科學史研究的一部分喔！`);
  }

  /* ---------- 地圖 ---------- */
  const rooms = {
    lab: {
      name: '拉瓦節的實驗室・巴黎 1774',
      spawn: [7, 8],
      map: [
        '##w###SSSS###w##',
        '#..............#',
        '#.TTT......FFT.#',
        '#..............#',
        '#.....cccc.....#',
        '#.....cccc....._',
        '#.....cccc.....#',
        '#..............#',
        '#.TT........P..#',
        '#..............#',
        '#######__#######'],
      doors: [
        { x: 15, y: 5, to: 'storage', tx: 1, ty: 5, dir: 'right' },
        { x: 7, y: 10, to: 'yard', tx: 7, ty: 1, dir: 'down' },
        { x: 8, y: 10, to: 'yard', tx: 8, ty: 1, dir: 'down' }
      ],
      ents: [
        { id: 'lavoisier', x: 7, y: 3, spr: 'lavoisier', mark: () => !F('metL'), act: talkLavoisier },
        { id: 'marie', x: 12, y: 7, spr: 'marie', mark: () => (F('metL') && !S.has('jar')) || (pages() === 3 && !F('pagesDone')), act: talkMarie },
        { id: 'st1', x: 3, y: 2, obj: () => S.has('balance') ? 'balance' : null, mark: () => S.has('balance') && !F('exp1'), act: async () => {
          if (F('exp1')) return S.say(null, '實驗①已完成：錫在空氣中加熱變成煅灰，質量反而增加了。');
          if (!S.has('balance')) return S.say(null, '實驗桌上放著錫和坩堝，可是少了一台夠精密的天平。\n（拉瓦節說天平在東邊的儲藏室）');
          await exp1();
        } },
        { id: 'st2', x: 13, y: 2, obj: 'retort', mark: () => F('exp1') && !F('exp2'), act: async () => {
          if (F('exp2')) return S.say(null, '實驗②已完成：密封加熱總質量不變；開瓶時空氣衝進去。');
          if (!F('exp1')) return S.say(null, '熔爐旁放著一個可以封口的玻璃曲頸瓶。先完成實驗桌上的實驗①吧。');
          await exp2();
        } },
        { id: 'st3', x: 3, y: 8, obj: 'jar', mark: () => S.has('lens') && !F('exp3'), act: async () => {
          if (F('exp3')) return S.say(null, '實驗③已完成：空氣是由兩種氣體混合成的。');
          if (!F('exp2')) return S.say(null, '桌上放著汞槽和大鐘罩。先完成前面的實驗吧。');
          if (!F('metP')) return S.say(null, '桌上放著汞槽和大鐘罩。拉瓦節說，要先聽聽普利斯特里的發現。（沙龍在庭院西邊）');
          if (!S.has('lens')) return S.say(null, '要分解紅色的汞煅灰需要非常高的溫度……\n普利斯特里提過庭院裡的取火大透鏡。');
          await exp3();
        } },
        { id: 'page1', x: 1, y: 9, obj: 'page', solid: false, show: () => !F('page1'), act: () => getPage('page1') }
      ],
      inspect: (ch) => ({
        S: '書架上排滿了書，其中一本是波以耳的《懷疑的化學家》（1661）。他質疑「水火土氣四元素」的說法。',
        w: '窗外是 1774 年的巴黎。',
        F: '熔爐燒得正旺，可以把金屬加熱到很高的溫度。',
        T: '實驗桌，擺滿了玻璃器材。',
        P: '一盆植物。'
      })[ch]
    },
    storage: {
      name: '儲藏室',
      spawn: [1, 5],
      map: [
        '################',
        '#XX....SS....XX#',
        '#X............X#',
        '#.....X..X.....#',
        '#..............#',
        '_..............#',
        '#..............#',
        '#.....X..X.....#',
        '#X............X#',
        '#XX..........XX#',
        '################'],
      doors: [{ x: 0, y: 5, to: 'lab', tx: 14, ty: 5, dir: 'left' }],
      minions: [{ id: 'f1', x: 6, y: 5 }, { id: 'f2', x: 10, y: 2 }, { id: 'f3', x: 10, y: 8 }],
      ents: [
        { id: 'chest', x: 13, y: 5, obj: () => F('chestOpen') ? 'chest_open' : 'chest', act: async () => {
          if (F('chestOpen')) return S.say(null, '寶箱已經空了。');
          if (S.minionsLeft() > 0) return S.say(null, '寶箱四周都是迷思的火苗，太危險了！\n先用 🫙 玻璃鐘罩把火苗罩熄吧。');
          S.flag('chestOpen', true); S.give('balance');
          await S.say(null, '⚖️ 找到了拉瓦節的**精密天平**！\n回實驗室的實驗桌（左上）做實驗吧。');
        } },
        { id: 'page2', x: 2, y: 8, obj: 'page', solid: false, show: () => !F('page2'), act: () => getPage('page2') }
      ],
      onEnter: async () => {
        if (!S.has('jar')) await S.say(null, '儲藏室裡飄著好幾團迷思的火苗！碰到會受傷。\n先去找瑪麗－安想辦法吧。');
      },
      inspect: ch => ({ X: '堆滿化學藥品的木箱。', S: '一排排裝著粉末的玻璃瓶。' })[ch]
    },
    yard: {
      name: '庭院',
      spawn: [7, 1],
      map: [
        'hhhhhhh__hhhhhhh',
        'htgggggppgggggth',
        'hggggggppggggggh',
        'hggggggppggggggh',
        'hgg~~ggppggggggh',
        '_ppppppppppppppG',
        'hgg~~ggppggggggh',
        'hggggggppgggtggh',
        'hggggggppggggggh',
        'htgggggggggggtgh',
        'hhhhhhhhhhhhhhhh'],
      doors: [
        { x: 7, y: 0, to: 'lab', tx: 7, ty: 9, dir: 'up' },
        { x: 8, y: 0, to: 'lab', tx: 8, ty: 9, dir: 'up' },
        { x: 0, y: 5, to: 'salon', tx: 14, ty: 5, dir: 'left' },
        { x: 15, y: 5, to: 'academy', tx: 1, ty: 5, dir: 'right', cond: () => F('exp3'), locked: '這是通往皇家科學院的大門。\n拉瓦節還沒準備好發表，先完成實驗吧！' }
      ],
      ents: [
        { id: 'lens', x: 11, y: 3, obj: 'lens', show: () => !S.has('lens'), mark: () => F('metP'), act: async () => {
          if (!F('metP')) return S.say(null, '一面巨大的取火透鏡，可以把陽光聚成一個非常熱的小點。\n（現在好像還用不到）');
          S.give('lens');
          await S.say(null, '🔍 拿到了**取火大透鏡**！\n回實驗室，到左下的實驗桌做實驗③。');
        } }
      ],
      inspect: ch => ({ '~': '水池裡的水清清涼涼的。', t: '一棵大樹。', h: '修剪整齊的樹籬。' })[ch]
    },
    salon: {
      name: '拉瓦節家的沙龍・1774 年 10 月',
      spawn: [14, 5],
      map: [
        '##w##w####w##w##',
        '#cccccccccccccc#',
        '#cqnnnnnnnnqccc#',
        '#cqnnnnnnnnqccc#',
        '#cccccccccccccc#',
        '#cccccccccccccc_',
        '#cccccccccccccc#',
        '#cP..........Pc#',
        '#cccccccccccccc#',
        '#ccccccSSSccccc#',
        '################'],
      doors: [{ x: 15, y: 5, to: 'yard', tx: 1, ty: 5, dir: 'right' }],
      ents: [
        { id: 'priestley', x: 6, y: 4, spr: 'priestley', mark: () => F('exp2') && !F('metP'), act: talkPriestley },
        { id: 'page3', x: 13, y: 8, obj: 'page', solid: false, show: () => !F('page3'), act: () => getPage('page3') }
      ],
      inspect: ch => ({ n: '晚餐桌上擺著精緻的餐具。拉瓦節夫婦常在家裡招待各國的科學家。', w: '窗外是 1774 年秋天的巴黎。', q: '一張鋪著紅絨布的椅子。', S: '書櫃裡有幾本英文書。' })[ch]
    },
    academy: {
      name: '法國皇家科學院',
      spawn: [1, 5],
      map: [
        'dddbddddddddbddd',
        'd|mmmmmmmmmmmm|d',
        'dmmmmmmmmmmmmmmd',
        'dmmmmmmmmmmmmmmd',
        'dmmmmmmmmmmmmmmd',
        '_mmmmmmmmmmmmmmd',
        'dmmmmmmmmmmmmmmd',
        'dmmmmmmmmmmmmmmd',
        'dmmmmmmmmmmmmmmd',
        'd|mmmmmmmmmmmm|d',
        'dddddddddddddddd'],
      doors: [{ x: 0, y: 5, to: 'yard', tx: 14, ty: 5, dir: 'left' }],
      onEnter: async () => {
        if (F('bossDone')) return;
        if (!F('bossIntro')) {
          S.flag('bossIntro', true);
          await S.say('boss', '哈哈哈！我是燃素魔！一百年來，全歐洲的化學家都相信我！');
          await S.say('boss', '想推翻我？拿出證據來啊！');
          await S.say('book', '打開 🎒 背包選一張「證據」，面向燃素魔按 **B** 丟出去！\n選對證據才能打破它的護盾。小心火球！');
        }
        S.startBoss(BOSS);
      },
      inspect: ch => ({ '|': '大理石柱。', b: '科學院的旗幟。' })[ch]
    }
  };

  /* ---------- 對話 ---------- */
  async function talkLavoisier() {
    if (!F('metL')) {
      await S.say('lavoisier', '啊，你就是來幫忙的年輕人嗎？歡迎來到我的實驗室！我是安托萬．拉瓦節。');
      await S.say('lavoisier', '現在大家都相信「燃素說」：能燃燒的東西裡面含有一種叫「燃素」的物質，燃燒就是燃素跑出去。');
      await S.say('lavoisier', '木頭燒完只剩一點點灰，變輕了，好像很合理，對吧？');
      await S.say('lavoisier', '可是有一件怪事讓我很在意：金屬在空氣中加熱變成「煅灰」以後，反而<b>變重</b>了！'.replace(/<\/?b>/g, '**'));
      await S.say('lavoisier', '我相信，要回答這個問題，不能只靠想，要靠**精確的測量**。');
      await S.say('lavoisier', '可是我的精密天平放在東邊的儲藏室，最近那裡冒出了好多奇怪的火苗……');
      await S.say('lavoisier', '我太太瑪麗－安有辦法對付它們，去找她聊聊吧！（右下方）');
      S.flag('metL', true); return;
    }
    // 依進度給提示
    const hint = !S.has('jar') ? '去找瑪麗－安（右下方），她有對付火苗的辦法。'
      : !S.has('balance') ? '精密天平在東邊的儲藏室，記得用鐘罩熄滅火苗。'
      : !F('exp1') ? '天平拿到了！到左上的實驗桌，在空氣中加熱錫看看。'
      : !F('exp2') ? '去熔爐旁（右上）用密封的曲頸瓶再做一次。'
      : !F('metP') ? '普利斯特里先生在沙龍（庭院往西走）。'
      : !S.has('lens') ? '取火大透鏡在庭院裡。'
      : !F('exp3') ? '到左下的實驗桌，做汞的十二天實驗。'
      : '去庭院東邊的皇家科學院，打倒燃素魔吧！';
    await S.say('lavoisier', hint);
  }

  async function talkMarie() {
    if (!F('metL')) return S.say('marie', '你好！我先生在實驗室中間，先去跟他打聲招呼吧。');
    if (!S.has('jar')) {
      await S.say('marie', '你好！我是瑪麗－安。我負責幫我先生記錄實驗數據、畫實驗器材的圖。');
      await S.say('marie', '儲藏室的火苗？那是「迷思的火苗」。我想到一個好辦法……');
      const i = await S.choose('marie', '你覺得，要怎麼讓一根蠟燭熄滅，又不用碰到它？', ['用玻璃鐘罩把它罩起來', '對它潑水', '用力吹氣']);
      await S.say('marie', i === 0 ? '沒錯！' : '這也可以，不過那些火苗會亂跑，潑水吹氣都追不上。');
      await S.say('marie', '用玻璃鐘罩把蠟燭罩起來，過一會兒火就會熄滅。很多人都看過這個現象，但「為什麼」會熄滅，大家的解釋都不一樣，這正是我們要研究的！');
      S.give('jar');
      await S.say('marie', '這個 🫙 玻璃鐘罩給你。面對火苗按 **B** 就能罩住它。');
      await S.say('marie', '對了，我的實驗筆記散落了三張，如果你看到了，可以幫我撿回來嗎？');
      return;
    }
    if (pages() === 3 && !F('pagesDone')) {
      S.flag('pagesDone', true);
      await S.say('marie', '三張筆記都找回來了！太感謝你了！');
      await S.say('marie', '我跟畫家大衛學過繪畫，1789 年《化學基本論述》裡的 13 幅實驗器材圖，都是我畫的。');
      await S.say('marie', '我也懂英文，翻譯了一本支持燃素說的英文著作，法文版裡還加上了我們逐條反駁的註解。');
      await S.say('marie', '很多人只記得拉瓦節，但實驗室裡的紀錄、繪圖和翻譯，也是科學的一部分喔！');
      S.addHeart();
      await S.say(null, '❤️ 瑪麗－安的鼓勵讓你的生命上限 +1！');
      return;
    }
    await S.say('marie', pages() < 3 ? `我的筆記還有 ${3 - pages()} 張沒找到，可能在儲藏室或沙龍。` : '加油！我先生需要你的幫忙。');
  }

  async function talkPriestley() {
    if (!F('exp2')) return S.say('priestley', '幸會！我是普利斯特里，從英國來的。拉瓦節先生好像還在實驗室忙呢。');
    if (F('metP')) return S.say('priestley', '取火大透鏡就在庭院裡，拉瓦節先生一定用得上。');
    await S.say('priestley', '幸會！我是約瑟夫．普利斯特里，是牧師，也是熱愛做實驗的化學家。');
    await S.say('priestley', '今年 8 月，我用一面大透鏡把陽光聚焦，加熱一種紅色的粉末：「汞的煅灰」。');
    await S.say('priestley', '結果它放出了一種氣體！蠟燭放進去，火焰燒得非常旺盛！');
    await S.say('priestley', '我認為這是一種「完全不含燃素」的空氣，特別能吸收燃素，所以我叫它「脫燃素空氣」。');
    const i = await S.choose('me', '（普利斯特里用燃素說解釋了他的發現。你覺得拉瓦節聽了會怎麼想？）', ['這種氣體，可能就是金屬煅燒時從空氣中吸走的成分！', '這證明燃素說是對的']);
    record('priestley', i === 0, i === 0 ? '從空氣中被吸走的成分' : '燃素說是對的');
    await S.say(null, i === 0 ? '很敏銳！拉瓦節正是這樣想的。' : '普利斯特里一輩子都這樣相信。');
    await S.say(null, '同一個實驗結果，不同的理論會給出不同的解釋。要分出誰對，就需要更多證據！');
    await S.say('priestley', '對了，拉瓦節先生也有一面很大的取火透鏡，就放在庭院裡。');
    S.flag('metP', true);
  }

  async function getPage(k) {
    S.flag(k, true); S.SFX.get();
    const n = pages();
    const text = {
      page1: '📄 瑪麗－安的筆記：「每一次實驗，都要把反應前後的東西全部秤過。」',
      page2: '📄 瑪麗－安的筆記：「器材要畫得精確，別人才能照著重做一次。」',
      page3: '📄 瑪麗－安的筆記：「別人的實驗結果，也要用我們自己的實驗再檢查一次。」'
    }[k];
    await S.say(null, `${text}\n（筆記 ${n}/3）`);
  }

  /* ---------- 開場 ---------- */
  async function intro() {
    await S.say('book', '（一本發光的書翻開了……）');
    await S.say('book', '我是「時光手稿」，記錄著科學家們一步步想出答案的過程。');
    await S.say('book', '可是「迷思魔」把書頁燒掉了！少了思考的過程，大家只會背結論……');
    await S.say('book', '請你回到 1774 年的巴黎，幫拉瓦節找回燃燒真正的祕密。');
    await S.say('book', '記得：要用那個時代的工具和證據來推理，不能偷用課本的答案喔！');
    await S.say(null, '🎮 操作：方向鍵／左下十字鍵移動，**A** 調查與對話，**B** 使用道具，🎒 打開背包。\n頭上有 ❗ 的人或東西，代表有事情可以做。');
  }

  /* ---------- 科學家檔案（破關後在知識網路查看） ---------- */
  const profile = {
    life: '1743 年 8 月 26 日出生於巴黎，1794 年 5 月 8 日在法國大革命中被處死。',
    roles: '大學念法律，後來成為化學家；擔任過包稅官（替政府收稅）、火藥管理局官員、皇家科學院院士。',
    contributions: [
      '用精密天平做定量實驗，提出**質量守恆**：化學反應前後總質量不變',
      '證明燃燒與金屬煅燒是物質**和氧結合**，推翻燃素說',
      '把氧、氫命名，證明水是氫和氧的化合物（1783）',
      '提出**元素**是「用化學方法無法再分解的物質」，1789 年《化學基本論述》列出 33 種元素',
      '1787 年和同伴建立新的化學命名法，許多化合物名稱沿用至今'
    ],
    mistakes: ['元素表中包含「光」和「熱質」', '以為所有的酸都含有氧（後來發現鹽酸不含氧）'],
    others: '同一時期，瑞典的舍勒和英國的普利斯特里也各自製得了氧氣；舍勒最早做出，但較晚發表。拉瓦節的貢獻在於正確解釋了它在燃燒中的角色。'
  };

  return {
    id: 'lavoisier', title: '第一章：拉瓦節 —— 燃素魔的謊言',
    cast, items, evidence, rooms, intro, profile,
    clear: { line: '你和拉瓦節一起，用天平和證據打倒了燃素魔！', orbs: [['⚖️', '質量守恆'], ['🔥', '燃燒是和氧結合'], ['🧪', '元素的新定義']] },
    start: { room: 'lab', x: 7, y: 7, dir: 'up' },
    predictionKeys: ['exp1_phlogiston', 'exp1_design', 'exp2_predict', 'exp2_meaning', 'exp3_predict', 'exp3_fraction', 'exp3_compare', 'exp3_air', 'priestley']
  };
})();
