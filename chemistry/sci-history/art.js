/* =========================================================
   時光手稿 — 插圖庫（全部自己畫的 SVG，沒有版權問題、不需網路）
   ART.scene(key)  情境插圖（區塊 1），300×150
   ART.icon(key)   證據小圖示（區塊 2），48×48
   ART.exp(key)    實驗器材插圖（區塊 3 實驗結果），300×150
   風格：深色線條＋羊皮紙底，重點用金、紅、藍
   ========================================================= */
const ART = (() => {
  const K = '#2a2238', G = '#f3c64b', R = '#c0392b', B = '#4d8fb8', GL = '#d7f0ff', W = '#fffaf0', M = '#b8bec7', O = '#f08a3a', F = '#fff3b0', BR = '#7b522a';
  const wrap = (inner, w = 300, h = 150) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
  const T = (x, y, s, size = 12, c = K, w = 700) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${w}" fill="${c}" font-family="Noto Sans TC, sans-serif">${s}</text>`;
  const flame = (x, y, s = 1, big = false) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 0 C-7 -8 -6 -18 0 -28 C6 -18 7 -8 0 0Z" fill="${big ? '#ffb347' : O}"/><path d="M0 -2 C-3 -6 -3 -12 0 -17 C3 -12 3 -6 0 -2Z" fill="${F}"/></g>`;
  const candle = (x, y, state = 'burn') => `<rect x="${x - 6}" y="${y - 30}" width="12" height="30" fill="#f4f1ea" stroke="#bbb"/>` +
    (state === 'out' ? `<path d="M${x} ${y - 32} q-6 -8 2 -14 q-8 -6 0 -12" stroke="#999" fill="none" stroke-width="2"/>` : flame(x, y - 31, state === 'bright' ? 1.6 : 0.8, state === 'bright'));
  const jar = (x, y, w, h) => `<path d="M${x} ${y + h} L${x} ${y + 14} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + 14} L${x + w} ${y + h}" fill="${GL}" fill-opacity=".55" stroke="${B}" stroke-width="2"/>`;
  const balance = (y, reading) => `<rect x="70" y="${y}" width="160" height="24" rx="5" fill="#2b2f3a"/><rect x="95" y="${y + 4}" width="110" height="16" rx="3" fill="#a9f0b0"/>${T(150, y + 17, reading, 13, '#123')}<rect x="40" y="${y + 24}" width="220" height="10" rx="3" fill="${BR}"/>`;
  const retort = (x, y, o = {}) => `<ellipse cx="${x}" cy="${y}" rx="28" ry="20" fill="${GL}" stroke="${B}" stroke-width="2"/><path d="M${x + 24} ${y - 10} L${x + 76} ${y - 26} L${x + 79} ${y - 20} L${x + 27} ${y - 2}Z" fill="${GL}" stroke="${B}" stroke-width="2"/>` +
    (o.sealed ? `<rect x="${x + 74}" y="${y - 31}" width="9" height="11" rx="2" fill="${BR}"/>` : '') +
    `<ellipse cx="${x}" cy="${y + 12}" rx="16" ry="4" fill="${o.calx ? '#d9d6cf' : M}"/>` +
    (o.hiss ? `${T(x + 104, y - 26, '嘶～', 15, '#2c4a7c')}<path d="M${x + 84} ${y - 30} l14 -6 M${x + 84} ${y - 24} l16 0" stroke="${B}" stroke-width="2"/>` : '');
  const tri = (x, y, up, bar, c) => `<path d="${up ? `M${x} ${y - 14} L${x + 14} ${y + 10} L${x - 14} ${y + 10}Z` : `M${x} ${y + 10} L${x + 14} ${y - 14} L${x - 14} ${y - 14}Z`}" fill="none" stroke="${c}" stroke-width="3"/>` + (bar ? `<line x1="${x - 9}" y1="${y + (up ? 2 : -6)}" x2="${x + 9}" y2="${y + (up ? 2 : -6)}" stroke="${c}" stroke-width="3"/>` : '');

  // 氣體體積方塊：n 格，每格 22 寬
  const vol = (x, y, n, label, c, sz = 22) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * (sz + 2)}" y="${y}" width="${sz}" height="${sz}" rx="3" fill="${c}" stroke="#555"/>`).join('') + (label ? T(x + (n * (sz + 2)) / 2 - 1, y + sz + 14, label, 10, '#555', 400) : '');
  const HC = '#e9f6ff', OC = '#fde3df', NC = '#cfd8ff', CLC = '#e3f2c6', PC = '#f3e6c4';

  /* ---------- 情境插圖 ---------- */
  const SCENES = {
    // 金屬燒完變重：天平向煅灰那一邊傾斜
    'lav-f1': () => wrap(`
      <rect width="300" height="150" fill="${W}"/>
      <rect x="146" y="40" width="8" height="90" fill="${BR}"/><rect x="110" y="126" width="80" height="10" rx="3" fill="${BR}"/>
      <g transform="rotate(-10 150 42)"><rect x="60" y="38" width="180" height="7" rx="3" fill="#8a6a3a"/>
        <line x1="72" y1="44" x2="72" y2="70" stroke="#555"/><line x1="228" y1="44" x2="228" y2="70" stroke="#555"/></g>
      <path d="M44 86 Q72 98 100 86Z" fill="#e7c55a" stroke="#8a6a3a"/><path d="M200 54 Q228 66 256 54Z" fill="#e7c55a" stroke="#8a6a3a"/>
      <ellipse cx="72" cy="82" rx="18" ry="7" fill="#d9d6cf" stroke="#999"/><rect x="214" y="42" width="28" height="10" rx="2" fill="${M}" stroke="#777"/>
      ${T(72, 112, '煅灰（燒過）', 13)}${T(228, 86, '錫（燒之前）', 13)}
      ${T(150, 24, '燒完反而變重？', 15, R, 900)}`),
    // 晚宴：大透鏡聚光加熱紅色汞煅灰，蠟燭燒得特別旺
    'lav-f2': () => wrap(`
      <rect width="300" height="150" fill="${W}"/>
      <circle cx="34" cy="28" r="16" fill="${G}"/><g stroke="${G}" stroke-width="2">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="${34 + Math.cos(i * 0.785) * 20}" y1="${28 + Math.sin(i * 0.785) * 20}" x2="${34 + Math.cos(i * 0.785) * 26}" y2="${28 + Math.sin(i * 0.785) * 26}"/>`).join('')}</g>
      <path d="M48 40 L110 50 M48 40 L110 80" stroke="${G}" stroke-width="2" stroke-dasharray="4 3"/>
      <ellipse cx="114" cy="65" rx="8" ry="26" fill="${GL}" stroke="${B}" stroke-width="2"/>
      <path d="M120 45 L160 92 M120 85 L160 92" stroke="${G}" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M150 96 L150 82 L170 82 L170 96 Q174 112 160 114 Q146 112 150 96Z" fill="${GL}" stroke="${B}" stroke-width="2"/><ellipse cx="160" cy="108" rx="8" ry="3" fill="${R}"/>
      <rect x="0" y="122" width="300" height="28" fill="#f4f1ea"/><rect x="0" y="120" width="300" height="4" fill="#d8d2c4"/>
      ${candle(240, 120, 'bright')}<circle cx="240" cy="70" r="26" fill="${F}" opacity=".35"/>
      ${T(160, 140, '紅色的汞煅灰', 11, '#555', 400)}${T(240, 140, '燒得特別旺！', 11, R)}`),
    // 什麼是元素：四元素符號 vs 水被拆成兩種氣體
    'lav-f3': () => wrap(`
      <rect width="300" height="150" fill="${W}"/>
      ${tri(40, 54, true, false, R)}${tri(80, 54, false, false, B)}${tri(40, 104, true, true, '#7aa6c2')}${tri(80, 104, false, true, BR)}
      ${T(40, 82, '火', 11)}${T(80, 82, '水', 11)}${T(40, 132, '氣', 11)}${T(80, 132, '土', 11)}
      ${T(60, 22, '兩千年的四元素', 12, '#555')}
      ${T(150, 86, 'VS', 18, R, 900)}
      <path d="M208 70 L208 50 L224 50 L224 70 Q236 82 236 98 Q236 120 216 120 Q196 120 196 98 Q196 82 208 70Z" fill="${GL}" stroke="${B}" stroke-width="2"/>
      <path d="M200 100 Q216 92 232 100 L232 104 Q232 118 216 118 Q200 118 200 104Z" fill="#7cc0e6"/>
      <circle cx="252" cy="58" r="12" fill="#fff" stroke="${B}" stroke-width="2"/>${T(252, 62, '氫', 11)}
      <circle cx="270" cy="92" r="12" fill="#fff" stroke="${R}" stroke-width="2"/>${T(270, 96, '氧', 11)}
      <path d="M228 74 Q238 64 240 62 M232 88 Q246 90 256 92" stroke="#888" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/>
      ${T(222, 22, '水能被拆開？', 12, '#555')}`),

    /* ---- 普魯斯特 ---- */
    // 天然孔雀石 vs 實驗室做的碳酸銅
    'pro-f1': () => wrap(`<rect width="300" height="150" fill="${W}"/>
      <path d="M30 108 L44 70 L72 58 L98 72 L106 104 L80 118 L46 118Z" fill="#2f8f5a" stroke="#1f5f3a" stroke-width="2"/>
      <path d="M48 96 Q66 80 92 92 M44 80 Q70 70 96 82" stroke="#7fd3a0" stroke-width="3" fill="none"/>${T(68, 138, '天然孔雀石', 12)}
      ${T(150, 90, '＝？', 26, R, 900)}
      <path d="M212 50 L212 74 L190 112 Q186 122 198 122 L246 122 Q258 122 254 112 L232 74 L232 50Z" fill="${GL}" stroke="${B}" stroke-width="2"/>
      <path d="M196 106 L248 106 L254 116 Q256 122 246 122 L198 122 Q188 122 192 114Z" fill="#3aa86b"/>${T(222, 140, '實驗室做的碳酸銅', 12)}
      ${T(150, 24, '成分一樣嗎？', 15, R, 900)}`),
    // 柏托雷的例子 vs 普魯斯特的回應
    'pro-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>
      ${T(75, 22, '柏托雷：成分可以變！', 12, '#8a3a12')}
      <rect x="18" y="40" width="34" height="14" rx="3" fill="#c98a3a" stroke="#7b522a"/>${T(35, 70, '合金', 10, '#555', 400)}
      <path d="M64 38 L64 64 Q64 70 76 70 Q88 70 88 64 L88 38" fill="${GL}" stroke="${B}" stroke-width="2"/><rect x="65" y="50" width="22" height="14" fill="#cfe8f5"/>${T(76, 84, '糖水', 10, '#555', 400)}
      <path d="M104 40 L132 40 L126 70 L110 70Z" fill="#e6f4ff" stroke="#8ab" stroke-width="2"/>${T(118, 84, '玻璃', 10, '#555', 400)}
      <path d="M30 100 L50 120 L70 100 L90 120 L110 100 L130 120" stroke="${G}" stroke-width="3" fill="none"/>${T(80, 140, '比例連續變化？', 11, '#555', 400)}
      <line x1="150" y1="30" x2="150" y2="140" stroke="#ddd" stroke-width="2"/>
      ${T(225, 22, '普魯斯特：該怎麼回應？', 12, '#2c4a7c')}
      <circle cx="225" cy="84" r="34" fill="#fff" stroke="#2c4a7c" stroke-width="3"/>${T(225, 98, '？', 40, '#2c4a7c', 900)}`),
    // 錫的兩種氧化物：氧的量 1:2
    'pro-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>
      ${T(150, 22, '為什麼剛好是整數比？', 15, R, 900)}
      <rect x="40" y="50" width="60" height="24" fill="${M}" stroke="#777"/>${T(70, 66, '錫', 12)}<rect x="100" y="50" width="30" height="24" fill="#f6c3bd" stroke="${R}"/>${T(115, 66, '氧', 11, R)}
      <rect x="40" y="96" width="60" height="24" fill="${M}" stroke="#777"/>${T(70, 112, '錫', 12)}<rect x="100" y="96" width="30" height="24" fill="#f6c3bd" stroke="${R}"/><rect x="130" y="96" width="30" height="24" fill="#f6c3bd" stroke="${R}"/>${T(130, 112, '氧 氧', 11, R)}
      ${T(210, 66, '氧化物一', 12, '#555', 400)}${T(210, 112, '氧化物二', 12, '#555', 400)}
      <circle cx="262" cy="88" r="20" fill="#fff" stroke="${K}" stroke-width="2"/>${T(262, 93, '1:2', 13, K, 900)}`),
    /* ---- 道耳頓 ---- */
    'dal-f1': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '怎麼秤一顆看不見的原子？', 14, R, 900)}
      ${balance(104, '? ? ? g')}<circle cx="150" cy="80" r="5" fill="${K}"/><circle cx="150" cy="80" r="16" fill="none" stroke="${R}" stroke-dasharray="3 3"/>
      <path d="M170 64 L200 44" stroke="${R}" stroke-width="1.5"/>${T(232, 42, '一顆原子', 12, R)}`),
    'dal-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '一個水粒子裡，各有幾顆？', 14, R, 900)}
      <path d="M150 38 C120 76 112 92 112 106 C112 128 130 140 150 140 C170 140 188 128 188 106 C188 92 180 76 150 38Z" fill="#7cc0e6" stroke="${B}" stroke-width="2"/>
      ${T(150, 112, '氫 ? 顆', 13, '#fff')}${T(150, 130, '氧 ? 顆', 13, '#fff')}
      ${T(58, 80, 'HO ？', 18, '#2c4a7c', 900)}${T(242, 80, 'H₂O ？', 18, '#2c4a7c', 900)}`),
    'dal-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '原子可以再分割嗎？', 14, R, 900)}
      <circle cx="150" cy="86" r="40" fill="#e9e4f5" stroke="${K}" stroke-width="3"/>${T(150, 98, '？', 34, '#7b5ea7', 900)}
      <path d="M70 86 h28 m-6 -6 l6 6 -6 6" stroke="${K}" stroke-width="3" fill="none"/>${T(52, 80, '🔨', 22)}${T(250, 92, '能不能打開？', 12, '#555', 400)}`),
    /* ---- 給呂薩克 ---- */
    'gay-f1': () => wrap(`<rect width="300" height="150" fill="#eaf6ff"/><path d="M0 150 L70 70 L110 104 L160 50 L230 150Z" fill="#9fb8a6"/><path d="M148 64 L160 50 L172 66 Q160 70 148 64Z" fill="#fff"/>
      ${T(160, 140, '最高的山', 10, '#3a5a46', 400)}
      <ellipse cx="240" cy="40" rx="22" ry="26" fill="${R}"/><path d="M222 54 Q240 66 258 54" fill="none" stroke="#7d1f1c"/><line x1="226" y1="60" x2="234" y2="76" stroke="#555"/><line x1="254" y1="60" x2="246" y2="76" stroke="#555"/><rect x="232" y="76" width="16" height="10" fill="${BR}"/>
      ${T(78, 26, '高空的空氣成分一樣嗎？', 13, R, 900)}${T(240, 100, '？ 公尺', 11, K)}`),
    'gay-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '巧合？還是定律？', 14, R, 900)}
      ${vol(20, 46, 2, '氫', HC)}${T(76, 62, '＋', 16, K)}${vol(88, 46, 1, '氧', OC)}${T(138, 62, '2 : 1', 13, '#2c4a7c')}
      ${vol(20, 96, 1, '氨', NC)}${T(52, 112, '＋', 16, K)}${vol(64, 96, 1, '氯化氫', CLC)}${T(138, 112, '1 : 1', 13, '#2c4a7c')}
      ${vol(180, 46, 2, '一氧化碳', '#ddd')}${T(236, 62, '＋', 16, K)}${vol(248, 46, 1, '氧', OC)}${T(240, 112, '2 : 1', 13, '#2c4a7c')}`),
    'gay-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '每個氯化氫只分到半顆氫？', 14, R, 900)}
      ${vol(30, 54, 1, '氫 1 體積', HC, 34)}${T(86, 76, '＋', 18, K)}${vol(104, 54, 1, '氯 1 體積', CLC, 34)}${T(160, 76, '→', 18, K)}${vol(180, 54, 2, '氯化氫 2 體積', PC, 34)}
      ${T(214, 124, '½ ?', 16, R, 900)}${T(250, 124, '½ ?', 16, R, 900)}`),
    /* ---- 亞佛加厥 ---- */
    'avo-f1': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '同一瓶，粒子數目一樣嗎？', 14, R, 900)}
      ${[[90, '氫氣', HC, '輕'], [210, '氧氣', OC, '重 16 倍']].map(([x, n, c, w]) => `<path d="M${x - 14} 40 L${x - 14} 52 L${x - 34} 70 L${x - 34} 128 L${x + 34} 128 L${x + 34} 70 L${x + 14} 52 L${x + 14} 40Z" fill="${c}" stroke="${B}" stroke-width="2"/>${T(x, 98, '？ 個', 16, '#2c4a7c', 900)}${T(x, 144, `${n}（${w}）`, 11, '#555', 400)}`).join('')}
      ${T(150, 98, '＝？', 18, R, 900)}`),
    'avo-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '被冷落的五十年', 14, R, 900)}
      <rect x="30" y="52" width="70" height="86" fill="#f6eedb" stroke="#b9a77f"/>${T(65, 72, '1811', 12, '#8a6510')}${T(65, 92, '論文', 11, '#555', 400)}<path d="M34 120 h62" stroke="#ccc"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${40 + i * 13}" cy="${110 - (i % 2) * 6}" r="2" fill="#bbb"/>`).join('')}
      ${T(65, 148, '積滿灰塵', 10, '#888', 400)}
      ${[['HO', 140, 50], ['H₂O', 210, 62], ['H₂O₂', 160, 96], ['HO₂', 236, 104], ['?', 196, 128]].map(([t, x, y]) => `<rect x="${x - 24}" y="${y - 14}" width="48" height="22" rx="4" fill="#fff" stroke="${R}"/>${T(x, y + 2, t, 12, R)}`).join('')}`),
    'avo-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '分子到底有幾個？真的存在嗎？', 14, R, 900)}
      <circle cx="90" cy="88" r="44" fill="#eef9ff" stroke="${K}" stroke-width="3"/>${[[70, 70], [104, 78], [84, 104], [112, 100], [76, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#c9a24a"/><path d="M${x} ${y} l${(x % 7) - 3} ${(y % 5) - 2} l4 -3" stroke="#c9a24a" stroke-width="1" fill="none"/>`).join('')}
      ${T(90, 146, '顯微鏡下亂動的微粒', 10, '#555', 400)}${T(220, 90, '× ？？？', 22, '#2c4a7c', 900)}`),
  };

  /* ---------- 證據小圖示 ---------- */
  const ICONS = {
    ash: () => wrap(`<rect x="6" y="14" width="22" height="9" rx="3" fill="${BR}"/><path d="M30 20 l6 0 m-3 -3 l3 3 -3 3" stroke="${K}" stroke-width="2" fill="none"/><ellipse cx="41" cy="34" rx="6" ry="3" fill="#aaa"/>${T(24, 44, '變輕', 9, R)}`, 48, 48),
    calx: () => wrap(`<rect x="4" y="14" width="18" height="8" rx="2" fill="${M}" stroke="#777"/><path d="M24 18 l6 0 m-3 -3 l3 3 -3 3" stroke="${K}" stroke-width="2" fill="none"/><ellipse cx="39" cy="20" rx="8" ry="5" fill="#d9d6cf" stroke="#999"/>${T(24, 42, '變重', 9, R)}`, 48, 48),
    jarCandle: () => wrap(`${jar(10, 6, 28, 36)}<rect x="21" y="26" width="6" height="16" fill="#f4f1ea" stroke="#bbb"/><path d="M24 24 q-4 -5 1 -9" stroke="#999" fill="none" stroke-width="1.5"/>`, 48, 48),
    absorb: () => wrap(`<rect x="16" y="16" width="16" height="16" fill="${M}" stroke="#777"/><g stroke="${B}" stroke-width="2"><path d="M4 24 h9 m-3 -3 l3 3 -3 3"/><path d="M44 24 h-9 m3 -3 l-3 3 3 3"/><path d="M24 4 v9 m-3 -3 l3 3 3 -3"/></g>`, 48, 48),
    bright: () => wrap(`<circle cx="24" cy="22" r="18" fill="${F}" opacity=".5"/>${candle(24, 46, 'bright')}`, 48, 48),
    mouse: () => wrap(`<ellipse cx="24" cy="30" rx="14" ry="9" fill="#9a9aa8"/><circle cx="12" cy="24" r="5" fill="#9a9aa8"/><circle cx="10" cy="22" r="1.5" fill="${K}"/><path d="M38 32 q8 4 6 10" stroke="#9a9aa8" stroke-width="2" fill="none"/><text x="34" y="16" font-size="12">♥</text>`, 48, 48),
    mix: () => wrap(`<circle cx="14" cy="18" r="9" fill="#fff" stroke="${R}" stroke-width="2"/><circle cx="34" cy="18" r="9" fill="#fff" stroke="${B}" stroke-width="2"/><path d="M24 30 v6 m-3 -3 l3 3 3 -3" stroke="${K}" stroke-width="2" fill="none"/><circle cx="24" cy="42" r="5" fill="${GL}" stroke="${K}"/>`, 48, 48),
    elements: () => wrap(`${tri(14, 18, true, false, R)}${tri(34, 18, false, false, B)}`.replace(/stroke-width="3"/g, 'stroke-width="2"') + `${T(24, 44, '四元素', 9)}`, 48, 48),
    alchemy: () => wrap(`<circle cx="12" cy="20" r="8" fill="#7d7d8a"/><path d="M22 20 h6 m-3 -3 l3 3 -3 3" stroke="${K}" stroke-width="2" fill="none"/><circle cx="38" cy="20" r="8" fill="${G}"/><path d="M28 8 L46 34 M46 8 L28 34" stroke="${R}" stroke-width="2.5"/>${T(24, 44, '鉛→金', 9)}`, 48, 48),

    mass: () => wrap(`<rect x="22" y="10" width="4" height="28" fill="${BR}"/><rect x="8" y="12" width="32" height="3" fill="#8a6a3a"/><path d="M4 22 Q10 28 16 22Z M32 22 Q38 28 44 22Z" fill="${G}"/><rect x="14" y="38" width="20" height="4" fill="${BR}"/>`, 48, 48),
    malachite: () => wrap(`<path d="M8 36 L14 16 L28 10 L40 18 L42 34 L28 42 L14 42Z" fill="#2f8f5a" stroke="#1f5f3a" stroke-width="2"/><path d="M14 30 Q24 22 36 28" stroke="#7fd3a0" stroke-width="2.5" fill="none"/>`, 48, 48),
    flask: () => wrap(`<path d="M19 6 L19 18 L8 38 Q6 44 12 44 L36 44 Q42 44 40 38 L29 18 L29 6Z" fill="${GL}" stroke="${B}" stroke-width="2"/><path d="M11 34 L37 34 L40 40 Q41 44 36 44 L12 44 Q7 44 8 40Z" fill="#3aa86b"/>`, 48, 48),
    sugarwater: () => wrap(`<path d="M12 10 L12 38 Q12 44 24 44 Q36 44 36 38 L36 10" fill="${GL}" stroke="${B}" stroke-width="2"/><rect x="13" y="22" width="22" height="20" fill="#cfe8f5"/>${[[18, 28], [26, 34], [30, 26], [20, 38]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" fill="#fff" stroke="#aaa" stroke-width=".5"/>`).join('')}`, 48, 48),
    alloy: () => wrap(`<rect x="6" y="18" width="36" height="14" rx="3" fill="#c98a3a" stroke="#7b522a" stroke-width="2"/><path d="M12 22 l6 6 M22 22 l6 6 M32 22 l6 6" stroke="#e7b36a" stroke-width="2"/>${T(24, 44, '青銅', 9)}`, 48, 48),
    egypt: () => wrap(`<path d="M4 40 L20 12 L36 40Z" fill="#e3c27a" stroke="#a8843a" stroke-width="2"/><ellipse cx="38" cy="40" rx="9" ry="3" fill="#7cc0e6"/><circle cx="38" cy="12" r="5" fill="${G}"/>`, 48, 48),
    ratio: () => wrap(`<rect x="6" y="18" width="20" height="12" fill="${M}" stroke="#777"/><rect x="26" y="18" width="16" height="12" fill="#f6c3bd" stroke="${R}"/>${T(24, 44, '固定比例', 8)}`, 48, 48),
    tinox: () => wrap(`<rect x="4" y="10" width="18" height="10" fill="${M}"/><rect x="22" y="10" width="9" height="10" fill="#f6c3bd"/><rect x="4" y="28" width="18" height="10" fill="${M}"/><rect x="22" y="28" width="9" height="10" fill="#f6c3bd"/><rect x="31" y="28" width="9" height="10" fill="#f6c3bd"/>`, 48, 48),
    affinity: () => wrap(`<rect x="6" y="6" width="36" height="36" fill="#fff" stroke="${K}" stroke-width="1.5"/>${[14, 22, 30].map(y => `<line x1="10" y1="${y}" x2="38" y2="${y}" stroke="#aaa"/>`).join('')}<path d="M24 6 v36" stroke="#aaa"/>${T(24, 46, '親和力表', 7)}`, 48, 48),
    balloon: () => wrap(`<ellipse cx="24" cy="18" rx="12" ry="14" fill="#e9f6ff" stroke="${B}" stroke-width="2"/><path d="M24 32 q-3 6 0 12" stroke="#888" fill="none"/>${T(24, 22, 'H', 12, B)}`, 48, 48),
    waterratio: () => wrap(`<rect x="6" y="16" width="5" height="14" fill="${B}"/><rect x="11" y="16" width="31" height="14" fill="#f6c3bd"/>${T(24, 44, '氫:氧=1:8', 8)}`, 48, 48),
    onlyone: () => wrap(`<path d="M24 6 C14 20 12 26 12 31 C12 39 17 44 24 44 C31 44 36 39 36 31 C36 26 34 20 24 6Z" fill="#7cc0e6" stroke="${B}" stroke-width="2"/>${T(24, 34, '1', 14, '#fff')}`, 48, 48),
    simple: () => wrap(`<circle cx="14" cy="22" r="8" fill="#fff" stroke="${K}" stroke-width="2"/><circle cx="34" cy="22" r="8" fill="#fff" stroke="${K}" stroke-width="2"/><line x1="22" y1="22" x2="26" y2="22" stroke="${K}" stroke-width="2"/>${T(24, 44, '一對一？', 9)}`, 48, 48),
    nochange: () => wrap(`<rect x="4" y="12" width="16" height="16" fill="${M}" stroke="#777"/><path d="M22 20 h6 m-3 -3 l3 3 -3 3" stroke="${K}" stroke-width="2" fill="none"/><rect x="30" y="12" width="16" height="16" fill="${M}" stroke="#777"/>${T(24, 42, '元素不變', 8)}`, 48, 48),
    mountain: () => wrap(`<path d="M2 42 L20 12 L30 26 L36 18 L46 42Z" fill="#9fb8a6"/><path d="M16 18 L20 12 L24 18Z" fill="#fff"/>`, 48, 48),
    mixgas: () => wrap(`${[[10, 12], [22, 20], [34, 10], [14, 30], [30, 32], [38, 24]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="${i % 2 ? '#fde3df' : '#cfd8ff'}" stroke="#777"/>`).join('')}`, 48, 48),
    balloonhot: () => wrap(`<ellipse cx="24" cy="16" rx="12" ry="14" fill="${R}"/><line x1="16" y1="28" x2="20" y2="36" stroke="#555"/><line x1="32" y1="28" x2="28" y2="36" stroke="#555"/><rect x="19" y="36" width="10" height="7" fill="${BR}"/>`, 48, 48),
    ho21: () => wrap(`${vol(2, 14, 2, '', HC, 12)}${vol(32, 14, 1, '', OC, 12)}${T(24, 42, '2 : 1', 10)}`, 48, 48),
    nh3hcl: () => wrap(`${vol(6, 14, 1, '', NC, 14)}${vol(28, 14, 1, '', CLC, 14)}${T(24, 42, '1 : 1', 10)}`, 48, 48),
    cooo: () => wrap(`${vol(2, 14, 2, '', '#ddd', 12)}${vol(32, 14, 1, '', OC, 12)}${T(24, 42, '2 : 1', 10)}`, 48, 48),
    hcl2: () => wrap(`${vol(2, 8, 1, '', HC, 10)}${vol(14, 8, 1, '', CLC, 10)}<path d="M28 13 h4" stroke="${K}" stroke-width="2"/>${vol(34, 2, 1, '', PC, 10)}${vol(34, 14, 1, '', PC, 10)}${T(24, 40, '1+1→2', 9)}`, 48, 48),
    atomwhole: () => wrap(`<circle cx="24" cy="20" r="12" fill="#e9e4f5" stroke="${K}" stroke-width="2"/><path d="M14 36 L34 36" stroke="${R}" stroke-width="2"/>${T(24, 46, '不可分', 9, R)}`, 48, 48),
    samevol: () => wrap(`<rect x="4" y="8" width="18" height="24" fill="${HC}" stroke="#555"/><rect x="26" y="8" width="18" height="24" fill="${OC}" stroke="#555"/>${T(13, 24, 'n', 11)}${T(35, 24, 'n', 11)}${T(24, 44, '同體積同數目?', 7)}`, 48, 48),
    heatsame: () => wrap(`${flame(24, 46, .7)}${vol(4, 4, 3, '', HC, 11)}<path d="M4 20 h36" stroke="${R}" stroke-width="1.5"/>`, 48, 48),
    density: () => wrap(`<rect x="4" y="20" width="16" height="20" fill="${HC}" stroke="#555"/><rect x="28" y="20" width="16" height="20" fill="${OC}" stroke="#555"/>${T(12, 14, '1', 10)}${T(36, 14, '16', 10, R)}`, 48, 48),
    berz: () => wrap(`<circle cx="16" cy="22" r="9" fill="#fff" stroke="${R}" stroke-width="2"/>${T(16, 26, '+', 12, R)}<circle cx="34" cy="22" r="9" fill="#fff" stroke="${R}" stroke-width="2"/>${T(34, 26, '+', 12, R)}<path d="M4 40 l6 -4 M44 40 l-6 -4" stroke="${K}" stroke-width="2"/>${T(24, 46, '互斥', 8, R)}`, 48, 48),
    paper: () => wrap(`<rect x="10" y="6" width="28" height="36" fill="#f6eedb" stroke="#b9a77f"/>${[14, 20, 26, 32].map(y => `<line x1="14" y1="${y}" x2="34" y2="${y}" stroke="#ccc"/>`).join('')}${T(24, 46, '1811', 8)}`, 48, 48),
    formulas: () => wrap(`${T(14, 16, 'HO', 10, R)}${T(34, 24, 'H₂O', 10, R)}${T(18, 34, 'H₂O₂', 9, R)}${T(36, 42, '?', 12, R)}`, 48, 48),
    brown: () => wrap(`<circle cx="24" cy="24" r="18" fill="#eef9ff" stroke="${K}" stroke-width="2"/><path d="M14 26 l6 -6 l4 8 l6 -10 l4 6" stroke="#c9a24a" stroke-width="2" fill="none"/>`, 48, 48),
    oilfilm: () => wrap(`<rect x="2" y="28" width="44" height="14" fill="#7cc0e6"/><ellipse cx="24" cy="28" rx="18" ry="2.5" fill="${G}"/><circle cx="24" cy="12" r="4" fill="${G}"/>`, 48, 48),
    einstein: () => wrap(`<rect x="8" y="8" width="32" height="30" fill="#fff" stroke="${K}"/>${T(24, 24, '理論', 10)}${T(24, 46, '1905', 9)}`, 48, 48),
  };

  /* ---------- 實驗器材插圖 ---------- */
  const EXPS = {
    'lav-sealed': () => wrap(`<rect width="300" height="150" fill="${W}"/>${retort(120, 70, { sealed: true, calx: true })}${flame(120, 106, .7)}${balance(108, '500.0 g → 500.0 g')}${T(150, 22, '密封加熱：整瓶質量不變', 13, R)}`),
    'lav-open': () => wrap(`<rect width="300" height="150" fill="${W}"/>${retort(110, 76, { calx: true, hiss: true })}${balance(108, '500.0 g → 500.8 g')}${T(150, 22, '拔開瓶塞：空氣衝進去', 13, R)}`),
    'lav-phos': () => wrap(`<rect width="300" height="150" fill="${W}"/><rect x="70" y="112" width="160" height="18" rx="4" fill="#7cc0e6"/>${jar(110, 40, 80, 82)}<rect x="111" y="98" width="78" height="22" fill="#7cc0e6" opacity=".8"/>
      <rect x="140" y="84" width="20" height="8" fill="#ddd"/>${flame(150, 84, .9)}<path d="M200 104 l0 -14 m-4 4 l4 -4 4 4" stroke="${B}" stroke-width="2" fill="none"/>${T(236, 96, '水面上升', 11, B)}
      ${T(150, 22, '磷燃燒：吸收了大量空氣', 13, R)}`),
    'lav-mercury': () => wrap(`<rect width="300" height="150" fill="${W}"/>
      <ellipse cx="55" cy="80" rx="30" ry="20" fill="${GL}" stroke="${B}" stroke-width="2"/><ellipse cx="55" cy="92" rx="20" ry="5" fill="${M}"/><ellipse cx="55" cy="90" rx="14" ry="3" fill="${R}"/>
      ${flame(55, 116, .8)}<path d="M80 68 Q130 26 185 40 L185 46 Q132 34 84 74Z" fill="${GL}" stroke="${B}" stroke-width="2"/>
      <rect x="160" y="110" width="120" height="26" rx="4" fill="#9aa0a8" stroke="#555"/>${jar(180, 34, 78, 92)}<rect x="181" y="86" width="76" height="38" fill="${M}"/>
      ${T(219, 66, '空氣 50→42', 12, '#2c4a7c')}${T(150, 18, '十二天後：空氣少了約 1/6', 13, R)}${T(55, 140, '紅色汞煅灰', 11, '#555', 400)}`),
    'lav-lens': () => wrap(`<rect width="300" height="150" fill="${W}"/><circle cx="26" cy="26" r="13" fill="${G}"/>
      <ellipse cx="74" cy="52" rx="7" ry="24" fill="${GL}" stroke="${B}" stroke-width="2"/><path d="M38 30 L70 32 M38 30 L70 72 M80 34 L110 92 M80 72 L110 92" stroke="${G}" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M100 96 L100 82 L120 82 L120 96 Q124 112 110 114 Q96 112 100 96Z" fill="${GL}" stroke="${B}" stroke-width="2"/><ellipse cx="110" cy="108" rx="7" ry="3" fill="#c4c8cf"/>
      <path d="M120 86 Q160 70 196 90" stroke="${B}" stroke-width="3" fill="none"/>${jar(190, 60, 64, 62)}<rect x="170" y="118" width="104" height="14" rx="3" fill="#9aa0a8"/>
      ${T(222, 96, '≈8', 14, '#2c4a7c')}${T(150, 18, '紅色煅灰變回汞，放出氣體', 13, R)}`),
    'lav-mix': () => wrap(`<rect width="300" height="150" fill="${W}"/>${jar(20, 40, 60, 70)}${T(50, 84, '42', 14, '#555')}${T(50, 130, '剩下的空氣', 11, '#555', 400)}
      ${T(100, 82, '＋', 22, K)}${jar(118, 56, 44, 54)}${T(140, 90, '8', 14, R)}${T(140, 130, '新氣體', 11, '#555', 400)}
      ${T(186, 82, '＝', 22, K)}${jar(210, 34, 70, 76)}${T(245, 80, '50', 14, '#2c4a7c')}${T(245, 130, '和普通空氣一樣', 11, R)}${T(150, 18, '兩種氣體混合', 13, R)}`),
    'lav-h2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${jar(100, 30, 100, 92)}<rect x="146" y="98" width="8" height="34" fill="#888"/>${flame(150, 98, .9)}
      ${[[118, 60], [178, 56], [126, 92], [182, 88], [150, 48]].map(([x, y]) => `<path d="M${x} ${y} q-4 6 0 9 q4 -3 0 -9Z" fill="#7cc0e6"/>`).join('')}
      ${T(150, 18, '可燃空氣燃燒：只生成水', 13, R)}${T(240, 92, '水珠', 11, B)}`),
    'lav-barrel': () => wrap(`<rect width="300" height="150" fill="${W}"/><rect x="100" y="70" width="100" height="56" rx="6" fill="#8a4a34"/>${flame(130, 120, .8)}${flame(170, 120, .8)}
      <rect x="40" y="76" width="220" height="12" rx="3" fill="#c0563a" stroke="${K}"/>
      <path d="M20 82 h18 m-5 -4 l5 4 -5 4" stroke="#7cc0e6" stroke-width="3" fill="none"/>${T(28, 70, '水蒸氣', 11, B)}
      <path d="M262 82 h20 m-5 -4 l5 4 -5 4" stroke="${G}" stroke-width="3" fill="none"/>${T(272, 70, '可燃空氣', 11, '#8a6510')}
      ${T(150, 64, '燒紅的鐵管（生鏽變重）', 11, '#555', 400)}${T(150, 22, '水被拆開了！', 13, R)}`),
    'lav-simple': () => wrap(`<rect width="300" height="150" fill="${W}"/>
      ${[['金', G, 60], ['汞', M, 150], ['硫', '#e8d44d', 240]].map(([n, c, x]) => `<circle cx="${x}" cy="76" r="24" fill="${c}" stroke="${K}" stroke-width="2"/>${T(x, 82, n, 16)}<path d="M${x - 10} 112 l20 16 M${x + 10} 112 l-20 16" stroke="${R}" stroke-width="3"/>`).join('')}
      ${T(150, 22, '怎麼加熱、怎麼反應，都拆不開', 13, R)}`),

    'pro-cu': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '天然與人工：比例一樣', 13, R)}
      ${[[80, '天然'], [220, '人工']].map(([x, n]) => `<g><rect x="${x - 60}" y="40" width="64" height="26" fill="#c98a3a"/><rect x="${x + 4}" y="40" width="12" height="26" fill="#555"/><rect x="${x + 16}" y="40" width="48" height="26" fill="#f6c3bd"/>
        ${T(x - 28, 58, '銅 5.3', 11, '#fff')}${T(x + 10, 80, '碳1', 9, '#555', 400)}${T(x + 40, 58, '氧 4', 11, R)}${T(x, 104, n, 13)}</g>`).join('')}
      ${T(150, 132, '銅 : 碳 : 氧 ≈ 5.3 : 1 : 4', 13, '#2c4a7c')}`),
    'pro-excess': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '多放的銅，剩下沒反應', 13, R)}
      <circle cx="50" cy="76" r="18" fill="#c98a3a"/><circle cx="90" cy="76" r="18" fill="#c98a3a"/>${T(70, 110, '兩倍的銅', 11, '#555', 400)}
      ${T(132, 82, '→', 24, K)}
      <rect x="160" y="60" width="60" height="30" rx="6" fill="#3aa86b"/>${T(190, 80, '碳酸銅', 11, '#fff')}${T(190, 110, '比例不變', 11, '#2f9e5a')}
      <circle cx="252" cy="76" r="18" fill="#c98a3a" stroke="${R}" stroke-dasharray="4 3" stroke-width="2"/>${T(252, 110, '剩下的銅', 11, R)}`),
    'pro-mines': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '不同礦山，成分相同', 13, R)}
      ${[[60, '#2f8f5a'], [150, '#3aa86b'], [240, '#57b98a']].map(([x, c], i) => `<path d="M${x - 30} 90 L${x - 20} 56 L${x} 48 L${x + 24} 58 L${x + 30} 88 L${x + 10} 100 L${x - 18} 100Z" fill="${c}" stroke="#1f5f3a" stroke-width="2"/>${T(x, 122, `礦山 ${'ABC'[i]}`, 11, '#555', 400)}${T(x, 140, '5.3 : 1 : 4', 11, '#2c4a7c')}`).join('')}`),
    'pro-midox': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '「中間顏色」其實是混合物', 13, R)}
      <circle cx="70" cy="80" r="30" fill="#e0a040"/>${[[58, 70], [76, 66], [64, 90], [84, 86], [70, 80]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5" fill="${i % 2 ? '#c0392b' : '#f3d34a'}"/>`).join('')}${T(70, 128, '看起來是一種顏色', 11, '#555', 400)}
      ${T(140, 86, '→', 24, K)}
      <circle cx="200" cy="80" r="20" fill="#f3d34a"/>${T(200, 118, '氧化物一', 11, '#555', 400)}<circle cx="256" cy="80" r="20" fill="${R}"/>${T(256, 118, '氧化物二', 11, '#555', 400)}`),
    'pro-evap': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '加熱就能分開：混合物', 13, R)}
      <path d="M70 50 L70 100 Q70 110 100 110 Q130 110 130 100 L130 50" fill="${GL}" stroke="${B}" stroke-width="2"/><rect x="71" y="70" width="58" height="38" fill="#cfe8f5"/>${flame(100, 132, .8)}${T(100, 46, '糖水', 11, '#555', 400)}
      <path d="M90 60 q-6 -10 2 -16 M110 60 q-6 -10 2 -16" stroke="#9cc" fill="none" stroke-width="2"/>
      ${T(170, 86, '→', 24, K)}
      <path d="M200 70 Q200 100 240 100 Q280 100 280 70" fill="#fff" stroke="${B}" stroke-width="2"/>${[[222, 88], [236, 92], [250, 88], [242, 84], [230, 82]].map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="6" fill="#fff" stroke="#999"/>`).join('')}${T(240, 120, '剩下糖', 11, '#555', 400)}${T(255, 50, '水蒸氣跑掉', 11, B)}`),
    'pro-tin2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '錫的氧化物只有兩種', 13, R)}
      <line x1="30" y1="96" x2="270" y2="96" stroke="${K}" stroke-width="2"/>${T(150, 132, '和錫結合的氧（越右越多）', 11, '#555', 400)}
      <circle cx="100" cy="96" r="10" fill="#d9d6cf" stroke="${K}" stroke-width="2"/>${T(100, 76, '氧化物一', 11)}
      <circle cx="210" cy="96" r="10" fill="#fff" stroke="${K}" stroke-width="2"/>${T(210, 76, '氧化物二', 11)}
      ${T(155, 100, '？？ 找不到 ？？', 11, R)}`),
    'pro-tinratio': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '100 g 錫結合的氧：1 : 2', 13, R)}
      <rect x="40" y="46" width="120" height="26" fill="${M}"/>${T(100, 64, '錫 100 g', 12)}<rect x="160" y="46" width="34" height="26" fill="#f6c3bd" stroke="${R}"/>${T(177, 64, '13.5', 11, R)}
      <rect x="40" y="94" width="120" height="26" fill="${M}"/>${T(100, 112, '錫 100 g', 12)}<rect x="160" y="94" width="68" height="26" fill="#f6c3bd" stroke="${R}"/>${T(194, 112, '27 g 氧', 11, R)}
      ${T(262, 92, '×2', 18, R, 900)}`),
    'pro-co': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '12 g 碳結合的氧：1 : 2', 13, R)}
      <rect x="40" y="46" width="48" height="26" fill="#555"/>${T(64, 64, '碳 12 g', 11, '#fff')}<rect x="88" y="46" width="64" height="26" fill="#f6c3bd" stroke="${R}"/>${T(120, 64, '氧 16 g', 11, R)}${T(210, 64, '氧化物一', 12, '#555', 400)}
      <rect x="40" y="94" width="48" height="26" fill="#555"/>${T(64, 112, '碳 12 g', 11, '#fff')}<rect x="88" y="94" width="128" height="26" fill="#f6c3bd" stroke="${R}"/>${T(152, 112, '氧 32 g', 11, R)}${T(256, 112, '氧化物二', 12, '#555', 400)}`),
    'pro-affinity': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '親和力表：只有順序，沒有比例', 13, R)}
      <rect x="60" y="34" width="180" height="96" fill="#fff" stroke="${K}" stroke-width="2"/>${[0, 1, 2, 3].map(i => `<line x1="60" y1="${58 + i * 24}" x2="240" y2="${58 + i * 24}" stroke="#ccc"/>`).join('')}
      ${['硫酸', '鉀', '鈉', '鈣'].map((n, i) => `${T(150, 50 + i * 24, `${i + 1}. ${n}`, 12, '#555', 400)}`).join('')}
      ${T(268, 90, '比例？', 13, R)}`),
    'dal-sand': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '一粒沙也有數不清的原子', 13, R)}
      ${balance(100, '0.0010 g')}<circle cx="150" cy="90" r="4" fill="#c9a24a"/>
      <circle cx="240" cy="62" r="34" fill="#fff" stroke="${K}"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${218 + (i % 6) * 9}" cy="${44 + Math.floor(i / 6) * 9}" r="3" fill="#c9a24a"/>`).join('')}${T(240, 108, '放大……還是好多', 10, '#555', 400)}
      <line x1="156" y1="88" x2="208" y2="70" stroke="#999" stroke-dasharray="3 3"/>`),
    'dal-h2o': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '比例永遠是 1 : 8', 13, R)}
      <ellipse cx="50" cy="74" rx="22" ry="26" fill="#e9f6ff" stroke="${B}" stroke-width="2"/>${T(50, 79, '氫 1 g', 11, B)}${T(92, 80, '＋', 20, K)}
      <ellipse cx="140" cy="74" rx="30" ry="32" fill="#fde3df" stroke="${R}" stroke-width="2"/>${T(140, 79, '氧 8 g', 12, R)}${T(188, 80, '→', 20, K)}
      <path d="M248 40 C232 64 226 76 226 88 C226 104 236 114 248 114 C260 114 270 104 270 88 C270 76 264 64 248 40Z" fill="#7cc0e6" stroke="${B}" stroke-width="2"/>${T(248, 96, '水 9 g', 11, '#fff')}`),
    'dal-gold': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '薄到透光，還是看不到原子', 13, R)}
      <circle cx="80" cy="80" r="22" fill="${G}"/>${T(80, 120, '金塊', 11, '#555', 400)}<path d="M110 80 h30 m-6 -6 l6 6 -6 6" stroke="${K}" stroke-width="3" fill="none"/>
      <rect x="160" y="44" width="110" height="72" fill="${G}" opacity=".35" stroke="#c99a2a"/>${T(215, 84, '約萬分之一毫米', 11, '#8a6510')}${T(215, 134, '金箔：可以透光', 11, '#555', 400)}`),
    'dal-trial': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '兩種假設都符合 1 : 8', 13, R)}
      <rect x="14" y="36" width="130" height="96" rx="8" fill="#fff" stroke="${K}"/>${T(79, 56, '假設：一氫一氧', 12)}
      <circle cx="52" cy="86" r="10" fill="#e9f6ff" stroke="${B}"/>${T(52, 90, 'H', 10, B)}<circle cx="96" cy="86" r="20" fill="#fde3df" stroke="${R}"/>${T(96, 90, 'O', 12, R)}${T(79, 124, '氧＝氫的 8 倍', 11, R)}
      <rect x="156" y="36" width="130" height="96" rx="8" fill="#fff" stroke="${K}"/>${T(221, 56, '假設：兩氫一氧', 12)}
      <circle cx="186" cy="86" r="10" fill="#e9f6ff" stroke="${B}"/><circle cx="208" cy="86" r="10" fill="#e9f6ff" stroke="${B}"/><circle cx="248" cy="86" r="24" fill="#fde3df" stroke="${R}"/>${T(248, 90, 'O', 12, R)}${T(221, 124, '氧＝氫的 16 倍', 11, R)}`),
    'dal-elec': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '電解水：氫氣的體積是氧氣的 2 倍', 13, R)}
      <rect x="40" y="110" width="220" height="24" rx="4" fill="#cfe8f5" stroke="${B}"/>
      <rect x="80" y="34" width="34" height="80" fill="#fff" stroke="${B}" stroke-width="2"/><rect x="81" y="35" width="32" height="60" fill="#e9f6ff"/>${T(97, 68, '氫', 12, B)}${T(97, 84, '2', 14, B)}
      <rect x="186" y="34" width="34" height="80" fill="#fff" stroke="${B}" stroke-width="2"/><rect x="187" y="35" width="32" height="30" fill="#fde3df"/>${T(203, 56, '氧 1', 12, R)}
      <rect x="132" y="118" width="36" height="14" fill="#555"/>${T(150, 129, '電池', 9, '#fff')}`),
    'dal-search': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氫和氧的化合物：目前只找到一種', 13, R)}
      <path d="M90 44 C74 70 70 80 70 92 C70 108 80 118 90 118 C100 118 110 108 110 92 C110 80 106 70 90 44Z" fill="#7cc0e6" stroke="${B}" stroke-width="2"/>${T(90, 136, '水', 12)}
      <rect x="170" y="50" width="80" height="70" rx="8" fill="#fff" stroke="#bbb" stroke-dasharray="5 4"/>${T(210, 92, '？', 30, '#bbb', 900)}${T(210, 136, '第二種？（1818 年才發現）', 10, '#555', 400)}`),
    'dal-react': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '各種化學方法：元素都沒變', 13, R)}
      ${[['加熱', 50], ['燃燒', 120], ['溶解', 190], ['通電', 260]].map(([n, x]) => `<rect x="${x - 26}" y="46" width="52" height="40" rx="6" fill="#fff" stroke="${K}"/>${T(x, 72, n, 12)}${T(x, 108, '元素不變', 10, '#2f9e5a')}`).join('')}`),
    'dal-nox': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '同量的氮結合的氧：1 : 2 : 4', 13, R)}
      ${[1, 2, 4].map((k, i) => `<rect x="40" y="${38 + i * 34}" width="60" height="24" fill="#cfd8ff" stroke="#556"/>${T(70, 55 + i * 34, '氮', 11, '#334')}<rect x="100" y="${38 + i * 34}" width="${k * 30}" height="24" fill="#f6c3bd" stroke="${R}"/>${T(100 + k * 15, 55 + i * 34, '氧×' + k, 11, R)}`).join('')}`),
    'dal-weights': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '每種元素都有自己的原子量', 13, R)}
      ${[['氫', 1, '#e9f6ff', 50], ['碳', 12, '#555', 120], ['氮', 14, '#cfd8ff', 190], ['氧', 16, '#fde3df', 260]].map(([n, w, c, x]) => `<circle cx="${x}" cy="74" r="${10 + w}" fill="${c}" stroke="${K}"/>${T(x, 78, n, 11, w === 12 ? '#fff' : K)}${T(x, 122, String(w), 13)}`).join('')}
      ${T(150, 142, '（今天的數值）', 10, '#888', 400)}`),
    'gay-mount': () => wrap(`<rect width="300" height="150" fill="#eaf6ff"/>${T(150, 20, '山頂空氣成分和地面一樣', 13, R)}
      <path d="M20 140 L120 50 L220 140Z" fill="#9fb8a6"/><path d="M106 63 L120 50 L134 63Z" fill="#fff"/><rect x="112" y="40" width="16" height="10" rx="2" fill="${GL}" stroke="${B}"/>
      ${T(250, 60, '更高的地方？', 12, '#2c4a7c')}${T(250, 82, '沒有人量過', 11, '#555', 400)}`),
    'gay-diffuse': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '分層的氣體會自己混合', 13, R)}
      <rect x="40" y="36" width="70" height="96" fill="#fff" stroke="${B}" stroke-width="2"/><rect x="41" y="37" width="68" height="47" fill="#cfd8ff"/><rect x="41" y="84" width="68" height="47" fill="#fde3df"/>${T(75, 146, '一開始', 10, '#555', 400)}
      ${T(150, 90, '→', 24, K)}
      <rect x="190" y="36" width="70" height="96" fill="#fff" stroke="${B}" stroke-width="2"/>${Array.from({ length: 24 }, (_, i) => `<circle cx="${198 + (i % 6) * 11}" cy="${46 + Math.floor(i / 6) * 22}" r="4" fill="${(i * 7) % 3 ? '#fde3df' : '#cfd8ff'}" stroke="#999"/>`).join('')}${T(225, 146, '一段時間後', 10, '#555', 400)}`),
    'gay-weather': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '晴天雨天，成分幾乎一樣', 13, R)}
      <circle cx="80" cy="66" r="20" fill="${G}"/>${T(80, 118, '晴天', 12)}<ellipse cx="220" cy="62" rx="34" ry="18" fill="#bbb"/>${[200, 214, 228, 242].map(x => `<line x1="${x}" y1="84" x2="${x - 4}" y2="98" stroke="${B}" stroke-width="2"/>`).join('')}${T(220, 118, '雨天', 12)}
      ${T(150, 70, '＝', 22, K)}`),
    'gay-hcl': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氫：氯 ＝ 1 : 1', 13, R)}${vol(70, 56, 1, '氫 1', HC, 40)}${T(136, 82, '＋', 20, K)}${vol(160, 56, 1, '氯 1', CLC, 40)}`),
    'gay-nh3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氮 1 ＋ 氫 3 → 氨 2', 13, R)}${vol(16, 60, 1, '氮 1', NC, 28)}${T(56, 80, '＋', 16, K)}${vol(70, 60, 3, '氫 3', HC, 28)}${T(172, 80, '→', 16, K)}${vol(190, 60, 2, '氨 2', '#e8dcf8', 28)}`),
    'gay-same': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '同溫同壓下，一直是整數比', 13, R)}
      ${[['0°C', 50], ['100°C', 150], ['高壓', 250]].map(([n, x]) => `<rect x="${x - 40}" y="44" width="80" height="70" rx="8" fill="#fff" stroke="${K}"/>${T(x, 62, n, 11, '#555', 400)}${T(x, 92, '2 : 1', 16, '#2c4a7c', 900)}`).join('')}
      ${T(150, 136, '（反應前後都在同樣條件下比較）', 10, '#888', 400)}`),
    'gay-remeasure': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '重做好幾次：都是 2 體積', 13, R)}
      ${[1, 2, 3].map(i => `${T(40, 40 + i * 30, `第 ${i} 次`, 11, '#555', 400)}${vol(80, 26 + i * 30, 2, '', PC, 20)}${T(150, 40 + i * 30, '✓', 14, '#2f9e5a')}`).join('')}
      ${T(230, 84, '產物＝2 體積', 13, '#2c4a7c')}`),
    'gay-half': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '如果每個粒子只有一顆原子……', 13, R)}
      <circle cx="50" cy="76" r="14" fill="${HC}" stroke="${B}" stroke-width="2"/>${T(50, 81, 'H', 12, B)}${T(80, 82, '＋', 16, K)}<circle cx="110" cy="76" r="14" fill="${CLC}" stroke="#6a8a3a" stroke-width="2"/>${T(110, 81, 'Cl', 11)}
      ${T(142, 82, '→', 16, K)}
      ${[190, 250].map(x => `<rect x="${x - 24}" y="56" width="48" height="40" rx="6" fill="${PC}" stroke="#555"/>${T(x, 72, '½H ½Cl', 11, R)}${T(x, 90, '？', 12, R)}`).join('')}
      ${T(220, 124, '原子被分成兩半？矛盾！', 12, R)}`),
    'gay-steam': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氫 2 ＋ 氧 1 → 水蒸氣 2', 13, R)}${vol(20, 60, 2, '氫 2', HC, 30)}${T(98, 80, '＋', 16, K)}${vol(114, 60, 1, '氧 1', OC, 30)}${T(164, 80, '→', 16, K)}${vol(184, 60, 2, '水蒸氣 2', '#cfe8f5', 30)}
      ${T(150, 132, '氧只有 1 份，怎麼出現在 2 份水蒸氣裡？', 11, R)}`),
    'avo-heat': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '加熱：各種氣體膨脹比例相同', 13, R)}
      ${[['氫', HC, 50], ['氧', OC, 120], ['氮', NC, 190], ['CO₂', '#ddd', 260]].map(([n, c, x]) => `<rect x="${x - 18}" y="50" width="36" height="40" fill="${c}" stroke="#555"/><rect x="${x - 18}" y="40" width="36" height="10" fill="${c}" stroke="#555" stroke-dasharray="3 2"/>${flame(x, 120, .6)}${T(x, 104, n, 11)}`).join('')}
      ${T(150, 142, '體積增加的比例都一樣', 11, '#2c4a7c')}`),
    'avo-press': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '壓力加倍：體積都縮小一半', 13, R)}
      ${[['氫', HC, 80], ['氧', OC, 220]].map(([n, c, x]) => `<rect x="${x - 50}" y="50" width="40" height="70" fill="${c}" stroke="#555"/>${T(x - 30, 136, n + ' 原本', 10, '#555', 400)}<rect x="${x + 6}" y="85" width="40" height="35" fill="${c}" stroke="#555"/><rect x="${x + 4}" y="78" width="44" height="7" fill="#777"/>${T(x + 26, 136, '加壓後', 10, '#555', 400)}`).join('')}`),
    'avo-weigh': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '同一瓶：氧約是氫的 16 倍重', 13, R)}
      ${balance(104, '1  :  16')}<rect x="90" y="66" width="30" height="36" fill="${HC}" stroke="#555"/>${T(105, 90, '氫', 11)}<rect x="180" y="66" width="30" height="36" fill="${OC}" stroke="#555"/>${T(195, 90, '氧', 11)}`),
    'avo-acetic': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '醋酸竟然有 19 種化學式！', 13, R)}
      ${Array.from({ length: 19 }, (_, i) => `<rect x="${20 + (i % 7) * 38}" y="${36 + Math.floor(i / 7) * 34}" width="34" height="26" rx="4" fill="#fff" stroke="${R}"/>${T(37 + (i % 7) * 38, 54 + Math.floor(i / 7) * 34, `#${i + 1}`, 10, R)}`).join('')}
      ${T(150, 142, '（1861 年凱庫勒的教科書）', 10, '#888', 400)}`),
    'avo-recalc': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '用分子說重算：數據全部吻合', 13, R)}
      ${[['氫氣', 'H₂', 40], ['水', 'H₂O', 80], ['氧的原子量', '16', 120]].map(([a, b, y]) => `${T(90, y + 10, a, 12, '#555', 400)}${T(190, y + 10, b, 15, '#2c4a7c', 900)}${T(250, y + 10, '✓', 16, '#2f9e5a')}`).join('')}`),
    'avo-vapor': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '同體積比質量 → 分子量', 13, R)}
      ${[['氫分子', 2, HC, 50], ['氧分子', 32, OC, 130], ['水蒸氣', 18, '#cfe8f5', 210]].map(([n, w, c, x]) => `<rect x="${x - 26}" y="46" width="52" height="52" rx="6" fill="${c}" stroke="#555"/>${T(x, 76, String(w), 16, '#2c4a7c', 900)}${T(x, 116, n, 11, '#555', 400)}`).join('')}
      ${T(150, 140, '（以今天的數值表示）', 10, '#888', 400)}`),
    'avo-brown': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '追蹤微粒的亂動', 13, R)}
      <circle cx="90" cy="84" r="48" fill="#eef9ff" stroke="${K}" stroke-width="3"/><path d="M60 92 l12 -18 l10 20 l8 -26 l14 12 l6 -18 l10 24" stroke="#c9a24a" stroke-width="2" fill="none"/>${[[60, 92], [72, 74], [82, 94], [90, 68], [104, 80], [110, 62], [120, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#c9a24a"/>`).join('')}
      ${T(220, 74, '2 g 氫氣裡', 12, '#555', 400)}${T(220, 100, '約 6 × 10²³ 個', 15, '#2c4a7c', 900)}`),
    'avo-oil': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '油膜：薄到只剩一層分子', 13, R)}
      <rect x="20" y="90" width="260" height="40" fill="#7cc0e6"/><ellipse cx="150" cy="90" rx="110" ry="6" fill="${G}" opacity=".85"/><circle cx="150" cy="52" r="7" fill="${G}"/><path d="M150 60 v18" stroke="${G}" stroke-width="2" stroke-dasharray="3 3"/>
      ${T(150, 146, '由厚度推算分子大小 → 同樣的數量級', 11, '#2c4a7c')}`),
    'avo-sky': () => wrap(`<rect width="300" height="150" fill="#cfe6ff"/>${T(150, 20, '天空為什麼是藍的？', 13, R)}
      <circle cx="40" cy="56" r="18" fill="${G}"/>${[0, 1, 2].map(i => `<path d="M60 ${56 + i * 6} L${140 + i * 20} ${70 + i * 10}" stroke="${G}" stroke-width="2"/>`).join('')}
      ${[[150, 76], [180, 64], [170, 96], [210, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#555"/><path d="M${x} ${y} l12 -16 M${x} ${y} l-14 -10 M${x} ${y} l14 10" stroke="#4d8fb8" stroke-width="1.5"/>`).join('')}
      ${T(150, 136, '藍光被空氣分子散射 → 也能估算分子數', 11, '#2c4a7c')}`),
  };

  const get = (lib, k) => (lib[k] ? lib[k]() : '');
  return { scene: k => get(SCENES, k), icon: k => get(ICONS, k), exp: k => get(EXPS, k) };
})();
