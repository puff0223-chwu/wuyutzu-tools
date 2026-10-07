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

  // 原子核、氫光譜條、樓梯（第十～十二章用）
  const nuc = (x, y, np, nn, r = 5) => { const pts = []; const n = np + nn; for (let i = 0; i < n; i++) { const a = i * 2.4, d = r * .9 * Math.sqrt(i); pts.push(`<circle cx="${(x + d * Math.cos(a)).toFixed(1)}" cy="${(y + d * Math.sin(a)).toFixed(1)}" r="${r}" fill="${i % 2 && nn ? '#d6dbe3' : '#f6a29a'}" stroke="#555" stroke-width=".8"/>`); } return pts.join(''); };
  const hbar = (x, y, w, h, lines = [[656, '#ff3b30'], [486, '#22c3c3'], [434, '#3a5bff'], [410, '#8a3cff']]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111"/>` + lines.map(([nm, c]) => { const lx = x + (nm - 380) / (700 - 380) * w; return `<line x1="${lx.toFixed(1)}" y1="${y}" x2="${lx.toFixed(1)}" y2="${y + h}" stroke="${c}" stroke-width="3"/>`; }).join('');
  const stair = (x, y, n, sw, sh, skip = [], c = '#9fc3e6') => Array.from({ length: n }, (_, i) => skip.includes(i) ? `<rect x="${x + i * sw}" y="${y - (i + 1) * sh}" width="${sw - 1}" height="${(i + 1) * sh}" fill="none" stroke="${R}" stroke-dasharray="3 2"/>` : `<rect x="${x + i * sw}" y="${y - (i + 1) * sh}" width="${sw - 1}" height="${(i + 1) * sh}" fill="${c}" stroke="#557"/>`).join('');

  // α 粒子源、金箔、平行金屬板（第八、九章用）
  const src = (x, y) => `<rect x="${x - 14}" y="${y - 12}" width="28" height="24" rx="3" fill="#6b6f7a" stroke="#333"/><circle cx="${x + 4}" cy="${y}" r="4" fill="#ffd36b"/>`;
  const plates = (x, y, w, gap, sign = true) => `<rect x="${x}" y="${y}" width="${w}" height="7" fill="${R}"/><rect x="${x}" y="${y + gap}" width="${w}" height="7" fill="#4d8fb8"/>` + (sign ? `${T(x - 8, y + 7, '+', 12, R)}${T(x - 8, y + gap + 7, '−', 12, B)}` : '');

  // 元素卡片、陰極射線管（第六、七章用）
  const card = (x, y, sym, sub = '', c = '#fff', w = 34, h = 40) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c}" stroke="#8a7a5a" stroke-width="1.5"/>${T(x + w / 2, y + h / 2 + 3, sym, 13, K, 900)}${sub ? T(x + w / 2, y + h - 4, sub, 8, '#666', 400) : ''}`;
  const tube = (x, y, w = 200, beam = 'straight') => `<path d="M${x} ${y - 14} L${x + 40} ${y - 14} Q${x + 60} ${y - 34} ${x + w - 30} ${y - 34} Q${x + w} ${y - 34} ${x + w} ${y} Q${x + w} ${y + 34} ${x + w - 30} ${y + 34} Q${x + 60} ${y + 34} ${x + 40} ${y + 14} L${x} ${y + 14}Z" fill="${GL}" fill-opacity=".6" stroke="${B}" stroke-width="2"/><rect x="${x + 6}" y="${y - 8}" width="6" height="16" fill="#555"/>${T(x + 9, y + 28, '－', 12, K)}` +
    (beam === 'straight' ? `<path d="M${x + 12} ${y} L${x + w - 4} ${y}" stroke="#3fd16b" stroke-width="2.5" stroke-dasharray="6 4"/><circle cx="${x + w - 3}" cy="${y}" r="5" fill="#3fd16b"/>` : beam === 'up' ? `<path d="M${x + 12} ${y} L${x + 90} ${y} Q${x + w - 40} ${y} ${x + w - 8} ${y - 22}" stroke="#3fd16b" stroke-width="2.5" fill="none" stroke-dasharray="6 4"/><circle cx="${x + w - 8}" cy="${y - 22}" r="5" fill="#3fd16b"/>` : '');

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

    /* ---- 門得列夫 ---- */
    'men-f1': () => wrap(`<rect width="300" height="150" fill="#f6efe0"/>${T(150, 22, '63 張卡片，要怎麼排？', 14, R, 900)}
      ${[['O', 16, 30, 40, -8], ['Na', 23, 80, 70, 6], ['Cl', 35.5, 130, 38, 4], ['K', 39, 180, 74, -6], ['Ca', 40, 228, 44, 8], ['Li', 7, 46, 96, 5], ['Br', 80, 110, 98, -4], ['Fe', 56, 160, 104, 7], ['S', 32, 214, 98, -7], ['H', 1, 256, 92, 4]].map(([e, w, x, y, r]) => `<g transform="rotate(${r} ${x + 17} ${y + 20})">${card(x, y, e, String(w))}</g>`).join('')}`),
    'men-f2': () => wrap(`<rect width="300" height="150" fill="#f6efe0"/>${T(150, 22, '這個元素該放哪一行？', 14, R, 900)}
      ${[['B', 30, 40], ['C', 66, 40], ['N', 102, 40], ['Al', 30, 84], ['Si', 66, 84], ['P', 102, 84]].map(([e, x, y]) => card(x, y, e, '', '#fff', 32, 38)).join('')}
      ${card(168, 84, 'Zn', '65', '#fff', 32, 38)}${card(236, 60, 'As', '75', '#ffe9b0', 36, 42)}
      <path d="M232 80 Q200 70 140 102" stroke="${R}" stroke-width="2" fill="none" stroke-dasharray="4 3"/><path d="M236 92 Q210 130 150 128" stroke="${R}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>${T(150, 144, '？', 14, R, 900)}`),
    'men-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '鎵的密度：該相信誰？', 14, R, 900)}
      <rect x="28" y="40" width="104" height="90" rx="8" fill="#f6eedb" stroke="#b9a77f"/>${T(80, 62, '1871 預言', 12, '#8a6510')}${T(80, 98, '5.9', 28, '#2c4a7c', 900)}${T(80, 120, '類鋁的密度', 10, '#555', 400)}
      <rect x="168" y="40" width="104" height="90" rx="8" fill="#e8f3ff" stroke="${B}"/>${T(220, 62, '1875 實測', 12, B)}${T(220, 98, '4.7', 28, R, 900)}${T(220, 120, '鎵的密度', 10, '#555', 400)}${T(150, 92, '≠', 22, K, 900)}`),
    /* ---- 湯姆森 ---- */
    'tho-f1': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '陰極射線：是波？還是粒子？', 14, '#ffd36b', 900)}${tube(40, 86, 220, 'straight')}
      <path d="M150 64 v44" stroke="#bbb" stroke-width="3"/><path d="M140 86 h20" stroke="#bbb" stroke-width="3"/>${T(150, 140, '管壁發出綠光，留下十字的影子', 10, '#cfd6e6', 400)}`),
    'tho-f2': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '這種粒子，到底有多大？', 14, '#ffd36b', 900)}
      <circle cx="80" cy="86" r="34" fill="#e9f6ff" stroke="#8fb4d9" stroke-width="2"/>${T(80, 90, '氫原子', 12, K)}${T(80, 140, '已知最輕', 10, '#cfd6e6', 400)}
      ${T(150, 92, '？', 26, '#ffd36b', 900)}<circle cx="220" cy="86" r="5" fill="#3fd16b"/>${T(220, 116, '射線粒子', 11, '#cfd6e6', 400)}${T(220, 140, '荷質比大得驚人', 10, '#ffd36b', 400)}`),
    'tho-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '霓虹氣竟然畫出兩條線？', 14, R, 900)}
      <rect x="60" y="34" width="180" height="104" fill="#2b2b33" stroke="#555"/><path d="M80 120 Q150 110 220 46" stroke="#f0e6c8" stroke-width="2.5" fill="none"/><path d="M80 126 Q160 118 224 66" stroke="#f0e6c8" stroke-width="1.2" fill="none" opacity=".75"/>
      ${T(232, 44, '20', 11, R)}${T(236, 72, '22', 11, R)}${T(150, 148, '照相底片', 10, '#555', 400)}`),

    /* ---- 拉塞福 ---- */
    'ruth-f1': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '這些能量從哪裡來？', 14, '#ffd36b', 900)}
      <path d="M128 60 h44 v60 q0 10 -10 10 h-24 q-10 0 -10 -10Z" fill="#3a3f4f" stroke="#8fb4d9" stroke-width="2"/><rect x="138" y="96" width="24" height="24" rx="4" fill="#9fe6a0" opacity=".9"/>${T(150, 113, '釷', 12, K)}
      ${[[-1, -1], [1, -1], [-1, .2], [1, .2], [0, -1.3]].map(([dx, dy]) => `<path d="M${150 + dx * 30} ${92 + dy * 30} l${dx * 40} ${dy * 26}" stroke="#ffd36b" stroke-width="2" stroke-dasharray="4 3"/>`).join('')}
      ${T(60, 140, '用不完？', 12, '#cfd6e6', 400)}${T(240, 140, '來源？', 12, '#cfd6e6', 400)}`),
    'ruth-f2': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, 'α 粒子射向金箔，會怎樣？', 14, '#ffd36b', 900)}
      ${src(40, 86)}<path d="M54 86 L140 86" stroke="#ffd36b" stroke-width="2.5" stroke-dasharray="6 4"/><rect x="146" y="52" width="4" height="68" fill="#e8c35a"/>${T(148, 138, '薄金箔', 10, '#cfd6e6', 400)}
      <path d="M200 46 A70 70 0 0 1 200 126" stroke="#3fd16b" stroke-width="3" fill="none" opacity=".7"/>${T(236, 90, '？', 26, '#ffd36b', 900)}${T(222, 140, '螢光屏', 10, '#cfd6e6', 400)}`),
    'ruth-f3': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '射得特別遠的閃光是什麼？', 14, '#ffd36b', 900)}
      ${src(36, 84)}<rect x="60" y="56" width="150" height="56" rx="6" fill="#2b3a55" stroke="#8fb4d9" stroke-width="2"/>${T(135, 90, '氮氣', 14, '#cfd8ff')}<rect x="222" y="50" width="8" height="68" fill="#3fd16b" opacity=".8"/>
      ${[[226, 62], [226, 80], [226, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`).join('')}${T(262, 88, '✨？', 16, '#ffd36b', 900)}`),
    /* ---- 密立根 ---- */
    'mil-f1': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '一顆電子帶多少電？', 14, R, 900)}
      ${plates(60, 40, 180, 84)}${[[90, 60], [110, 72], [130, 58], [150, 76], [170, 64], [190, 82], [120, 90], [160, 96], [205, 70]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + (i % 3)}" fill="#cfe8f5" stroke="#7aa" opacity="${.5 + (i % 3) * .2}"/>`).join('')}
      ${T(150, 146, 'e = ？　（只知道 e/m）', 12, '#2c4a7c', 900)}`),
    'mil-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '電荷有沒有最小單位？', 14, R, 900)}
      <rect x="20" y="40" width="120" height="88" rx="8" fill="#e8f3ff" stroke="${B}"/>${T(80, 62, '芝加哥', 13, B)}<circle cx="80" cy="96" r="9" fill="${G}" stroke="#b08a20"/>${T(80, 122, '油滴', 10, '#555', 400)}
      <rect x="160" y="40" width="120" height="88" rx="8" fill="#fde3df" stroke="${R}"/>${T(220, 62, '維也納', 13, R)}<circle cx="220" cy="96" r="3" fill="#888"/>${T(220, 122, '極小金屬微粒', 10, '#555', 400)}${T(150, 92, 'vs', 14, K, 900)}`),
    'mil-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '數據會支持誰？', 14, R, 900)}
      <circle cx="40" cy="60" r="14" fill="${G}"/>${[0, 1, 2].map(i => `<path d="M56 ${56 + i * 6} L130 ${82 + i * 6}" stroke="#a678e6" stroke-width="2"/>`).join('')}<rect x="130" y="76" width="16" height="50" fill="#b8bec7" stroke="#777"/>${T(138, 140, '鈉', 10, '#555', 400)}
      ${[[170, 70], [196, 84], [180, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#3fd16b"/><path d="M${x - 14} ${y + 4} L${x - 5} ${y + 1}" stroke="#3fd16b" stroke-width="1.5"/>`).join('')}
      <rect x="216" y="56" width="74" height="48" rx="6" fill="#fff" stroke="${K}"/>${T(253, 76, '愛因斯坦', 11)}${T(253, 94, '的方程式？', 11)}`),

    /* ---- 波耳 ---- */
    'bohr-f1': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '電子為什麼不會掉進去？', 14, '#ffd36b', 900)}
      <circle cx="150" cy="86" r="5" fill="#f6a29a"/><path d="M150 86 m-50 0 a50 40 0 1 0 100 0 a46 36 0 1 0 -88 0 a40 30 0 1 0 74 0 a30 22 0 1 0 -56 0" stroke="#3fd16b" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/><circle cx="100" cy="86" r="4" fill="#8fc8ff"/>${T(258, 90, '塌掉？', 13, '#cfd6e6', 400)}`),
    'bohr-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '氫的光，為什麼只有這幾條？', 14, R, 900)}
      <defs><linearGradient id="rbw" x1="0" x2="1"><stop offset="0" stop-color="#8a3cff"/><stop offset=".3" stop-color="#3a8bff"/><stop offset=".5" stop-color="#3fd16b"/><stop offset=".75" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff3b30"/></linearGradient></defs>
      <rect x="40" y="40" width="220" height="30" fill="url(#rbw)"/>${T(150, 84, '白光：連續的彩虹', 10, '#555', 400)}${hbar(40, 96, 220, 30)}${T(150, 142, '氫氣：只有幾條亮線', 10, '#555', 400)}`),
    'bohr-f3': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '兩顆電子以上，怎麼算？', 14, '#ffd36b', 900)}
      <circle cx="80" cy="86" r="34" fill="none" stroke="#8fb4d9" stroke-dasharray="3 3"/>${nuc(80, 86, 1, 0, 4)}<circle cx="114" cy="86" r="4" fill="#8fc8ff"/>${T(80, 138, '氫：算得準', 11, '#3fd16b')}
      <circle cx="220" cy="86" r="34" fill="none" stroke="#8fb4d9" stroke-dasharray="3 3"/>${nuc(220, 86, 2, 2, 4)}<circle cx="254" cy="86" r="4" fill="#8fc8ff"/><circle cx="186" cy="86" r="4" fill="#8fc8ff"/>${T(220, 138, '氦：算不準？', 11, '#ff8a7a')}`),
    /* ---- 莫斯利 ---- */
    'mos-f1': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '這道樓梯代表什麼？', 14, R, 900)}${stair(40, 132, 10, 22, 9)}
      ${['Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu'].map((e, i) => T(51 + i * 22, 144, e, 8, '#555', 400)).join('')}${T(70, 60, '√頻率', 11, '#2c4a7c')}`),
    'mos-f2': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '從鋁到金，還有幾個元素沒找到？', 14, R, 900)}
      ${card(20, 56, 'Al', '13', '#fff', 40, 46)}<path d="M66 79 h168" stroke="${K}" stroke-width="2" stroke-dasharray="6 4"/>${T(150, 70, '？？？', 16, R, 900)}${card(240, 56, 'Au', '79', '#ffe9b0', 40, 46)}${T(150, 132, '稀土元素到底有幾種？', 11, '#555', 400)}`),
    'mos-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '72 號元素藏在哪裡？', 14, R, 900)}
      ${card(130, 40, '72', '？', '#ffe9b0', 40, 46)}<path d="M40 136 L70 96 L100 136Z" fill="#b9a7d6" stroke="#7a6a9a"/>${T(70, 148, '稀土礦？', 10, '#555', 400)}<path d="M200 136 L230 96 L260 136Z" fill="#c9b48a" stroke="#8a7449"/>${T(230, 148, '鋯礦？', 10, '#555', 400)}${T(150, 120, '還是根本不存在？', 10, '#555', 400)}`),
    /* ---- 查兌克 ---- */
    'chad-f1': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '多出來的質量是什麼？', 14, '#ffd36b', 900)}
      ${nuc(90, 84, 2, 0, 9)}${T(90, 132, '電荷 +2', 12, '#cfd6e6')}${T(150, 90, 'vs', 14, '#ffd36b', 900)}<rect x="186" y="62" width="70" height="44" rx="8" fill="#2b3a55" stroke="#8fb4d9"/>${T(221, 90, '質量 4', 16, '#fff', 900)}${T(221, 132, '氦原子核', 12, '#cfd6e6')}`),
    'chad-f2': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 22, '看不見的射線是什麼？', 14, '#ffd36b', 900)}
      ${src(30, 84)}<path d="M44 84 h20" stroke="#ffd36b" stroke-width="2" stroke-dasharray="4 3"/><rect x="66" y="66" width="22" height="36" fill="#9aa3b5"/>${T(77, 118, '鈹', 10, '#cfd6e6')}
      <path d="M90 84 h90" stroke="#cfd6e6" stroke-width="2" stroke-dasharray="2 5"/>${T(135, 72, '？？？', 14, '#ffd36b', 900)}<rect x="184" y="62" width="26" height="44" fill="#f4f1ea"/>${T(197, 122, '石蠟', 10, '#cfd6e6')}
      <path d="M212 84 h50" stroke="#f6a29a" stroke-width="2.5"/><circle cx="266" cy="84" r="6" fill="#f6a29a"/>${T(266, 104, '質子', 10, '#cfd6e6')}`),
    'chad-f3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 22, '中子可以拿來做什麼？', 14, R, 900)}
      <circle cx="150" cy="84" r="16" fill="#d6dbe3" stroke="#555" stroke-width="2"/>${T(150, 89, 'n', 16, K, 900)}${[[70, 50], [230, 50], [70, 120], [230, 120]].map(([x, y]) => `<path d="M${150 + (x - 150) * .25} ${84 + (y - 84) * .25} L${x} ${y}" stroke="#999" stroke-width="2" stroke-dasharray="3 3"/>${T(x, y + 4, '？', 14, R, 900)}`).join('')}`),
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

    triad: () => wrap(`${card(2, 10, 'Ca', '', '#fff', 14, 18).replace(/font-size="13"/, 'font-size="7"')}${card(17, 10, 'Sr', '', '#ffe9b0', 14, 18).replace(/font-size="13"/, 'font-size="7"')}${card(32, 10, 'Ba', '', '#fff', 14, 18).replace(/font-size="13"/, 'font-size="7"')}${T(24, 42, '三元素組', 8)}`, 48, 48),
    octave: () => wrap(`${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${3 + i * 5.5}" y="10" width="5" height="22" fill="${i === 0 || i === 7 ? R : '#fff'}" stroke="#555" stroke-width=".8"/>`).join('')}${T(24, 44, '八音律', 9)}`, 48, 48),
    atw: () => wrap(`<rect x="8" y="4" width="32" height="38" fill="#fff" stroke="${K}"/>${['H 1', 'O 16', 'Cl 35.5'].map((t, i) => T(24, 16 + i * 10, t, 7, '#333', 400)).join('')}${T(24, 47, '原子量', 7)}`, 48, 48),
    pertable: () => wrap(`${Array.from({ length: 12 }, (_, i) => `<rect x="${4 + (i % 4) * 10}" y="${6 + Math.floor(i / 4) * 10}" width="9" height="9" fill="${i % 4 === 0 ? '#f6c3bd' : '#e3f2c6'}" stroke="#777" stroke-width=".6"/>`).join('')}${T(24, 46, '大致整齊', 8)}`, 48, 48),
    misfit: () => wrap(`${card(2, 16, 'Zn', '', '#fff', 18, 20).replace(/font-size="13"/, 'font-size="8"')}<path d="M21 26 h5" stroke="${K}" stroke-width="2"/>${card(27, 16, 'As', '', '#ffe9b0', 18, 20).replace(/font-size="13"/, 'font-size="8"')}${T(24, 12, '65 → 75', 8, R)}${T(24, 46, '跑錯行', 8, R)}`, 48, 48),
    octbreak: () => wrap(`${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${4 + i * 7}" y="${10 + (i > 3 ? (i - 3) * 4 : 0)}" width="6" height="20" fill="#fff" stroke="#555" stroke-width=".8" transform="rotate(${i > 3 ? 12 : 0} ${7 + i * 7} 20)"/>`).join('')}${T(24, 44, '越排越亂', 8, R)}`, 48, 48),
    spectrum: () => wrap(`<defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#7a3cff"/><stop offset=".35" stop-color="#3a8bff"/><stop offset=".6" stop-color="#3fd16b"/><stop offset=".8" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff4a3a"/></linearGradient></defs><rect x="4" y="14" width="40" height="16" fill="#111"/><line x1="14" y1="14" x2="14" y2="30" stroke="#8a5cff" stroke-width="2"/><line x1="17" y1="14" x2="17" y2="30" stroke="#8a5cff" stroke-width="1.2"/>${T(24, 44, '新譜線', 8)}`, 48, 48),
    gallium: () => wrap(`<path d="M8 30 Q8 18 20 18 L30 18 Q40 18 40 30 Q40 38 30 38 L18 38 Q8 38 8 30Z" fill="#c8ccd4" stroke="#777" stroke-width="1.5"/><path d="M14 26 q8 -5 18 0" stroke="#fff" stroke-width="2" fill="none"/>${T(24, 46, '鎵', 9)}`, 48, 48),
    density2: () => wrap(`${T(14, 22, '5.9', 11, '#2c4a7c')}${T(34, 22, '4.7', 11, R)}${T(24, 22, '/', 11)}${T(24, 40, '預言/實測', 7)}`, 48, 48),
    crt: () => wrap(`<ellipse cx="28" cy="22" rx="18" ry="12" fill="${GL}" stroke="${B}" stroke-width="1.5"/><rect x="2" y="18" width="10" height="8" fill="${GL}" stroke="${B}"/><path d="M8 22 h36" stroke="#3fd16b" stroke-width="2" stroke-dasharray="3 2"/><path d="M28 14 v16 M22 22 h12" stroke="#777" stroke-width="2"/>${T(24, 44, '影子銳利', 8)}`, 48, 48),
    foil: () => wrap(`<path d="M4 22 h16" stroke="#3fd16b" stroke-width="2" stroke-dasharray="3 2"/><rect x="21" y="8" width="3" height="28" fill="#c9a24a"/><path d="M26 22 h16" stroke="#3fd16b" stroke-width="2" stroke-dasharray="3 2"/>${T(24, 46, '穿過金屬箔', 7)}`, 48, 48),
    eplate: () => wrap(`<rect x="8" y="8" width="32" height="4" fill="${R}"/><rect x="8" y="32" width="32" height="4" fill="#4d8fb8"/>${T(4, 13, '+', 9, R)}${T(4, 37, '−', 9, B)}<path d="M2 22 h44" stroke="#3fd16b" stroke-width="2" stroke-dasharray="3 2"/>${T(24, 47, '1883', 7)}`, 48, 48),
    deflect: () => wrap(`<rect x="8" y="6" width="32" height="3" fill="${R}"/><rect x="8" y="35" width="32" height="3" fill="#4d8fb8"/><path d="M2 24 L16 24 Q30 24 44 12" stroke="#3fd16b" stroke-width="2" fill="none"/>${T(24, 47, '帶負電', 8)}`, 48, 48),
    hlight: () => wrap(`<circle cx="24" cy="20" r="12" fill="#e9f6ff" stroke="${B}" stroke-width="2"/>${T(24, 24, 'H', 12, B)}${T(24, 44, '最輕的原子', 7)}`, 48, 48),
    travel: () => wrap(`<circle cx="6" cy="14" r="3" fill="#888"/><path d="M10 14 h10" stroke="#888" stroke-width="2"/><circle cx="6" cy="30" r="2" fill="#3fd16b"/><path d="M9 30 h36" stroke="#3fd16b" stroke-width="2"/>${T(24, 46, '走得比較遠', 7)}`, 48, 48),
    parabola: () => wrap(`<rect x="4" y="4" width="40" height="34" fill="#2b2b33"/><path d="M8 34 Q26 30 40 8" stroke="#f0e6c8" stroke-width="1.5" fill="none"/>${T(24, 47, '用磁場秤原子', 7)}`, 48, 48),
    ne202: () => wrap(`<rect x="6" y="8" width="36" height="24" rx="4" fill="#ffe0e8" stroke="${R}"/>${T(24, 25, 'Ne', 13, R)}${T(24, 44, '20.2', 9)}`, 48, 48),
    samemass: () => wrap(`${[10, 24, 38].map(x => `<circle cx="${x}" cy="20" r="6" fill="#e9e4f5" stroke="${K}"/>`).join('')}${T(24, 42, '質量都一樣?', 7)}`, 48, 48),

    rays: () => wrap(`<rect x="18" y="20" width="12" height="16" rx="2" fill="#9fe6a0" stroke="#555"/>${[[-1, -1], [1, -1], [0, -1.2], [-1, .3], [1, .3]].map(([dx, dy]) => `<path d="M${24 + dx * 8} ${28 + dy * 8} l${dx * 10} ${dy * 10}" stroke="${O}" stroke-width="1.5"/>`).join('')}${T(24, 46, '自己放射', 7)}`, 48, 48),
    endless: () => wrap(`<rect x="10" y="10" width="28" height="20" rx="3" fill="#9fe6a0" stroke="#555"/>${T(24, 25, '∞', 14, K)}${T(24, 44, '用不完？', 8)}`, 48, 48),
    pudding: () => wrap(`<circle cx="24" cy="22" r="17" fill="#ffd9c2" stroke="${BR}" stroke-width="1.5"/>${[[16, 16], [30, 14], [22, 26], [32, 28], [14, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#5a3a7a"/>`).join('')}${T(24, 46, '布丁模型', 7)}`, 48, 48),
    alpha: () => wrap(`<circle cx="18" cy="22" r="9" fill="#ffd36b" stroke="#b08a20"/>${T(18, 26, 'α', 11, K)}<path d="M30 22 h14 m-4 -4 l4 4 -4 4" stroke="${K}" stroke-width="2" fill="none"/>${T(24, 44, '帶正電、重', 7)}`, 48, 48),
    goldfoil: () => wrap(`<rect x="20" y="4" width="6" height="36" fill="#e8c35a" stroke="#b08a20"/>${T(24, 47, '薄金箔', 8)}`, 48, 48),
    collide: () => wrap(`<circle cx="12" cy="26" r="6" fill="#ffd36b"/><path d="M18 26 h8" stroke="${K}" stroke-width="2"/><circle cx="32" cy="26" r="6" fill="#cfd8ff" stroke="#555"/><path d="M36 22 l8 -10" stroke="#555" stroke-width="2"/>${T(24, 46, '撞飛', 8)}`, 48, 48),
    flash: () => wrap(`<rect x="6" y="6" width="36" height="32" fill="#1f2433"/>${[[14, 14], [30, 20], [20, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/>`).join('')}${T(24, 47, '閃光', 8)}`, 48, 48),
    hnuc: () => wrap(`<circle cx="24" cy="20" r="8" fill="#f6c3bd" stroke="${R}" stroke-width="2"/>${T(24, 24, '+', 11, R)}${T(24, 44, '氫原子核', 8)}`, 48, 48),
    emratio: () => wrap(`${T(24, 26, 'e/m', 15, '#2c4a7c')}${T(24, 44, 'e=? m=?', 8, R)}`, 48, 48),
    cloud: () => wrap(`<ellipse cx="24" cy="18" rx="18" ry="9" fill="#dfe6ee"/><ellipse cx="16" cy="14" rx="9" ry="7" fill="#dfe6ee"/><path d="M14 30 v6 M24 30 v8 M34 30 v6" stroke="#9cc" stroke-width="2"/>${T(24, 47, '雲霧法', 8)}`, 48, 48),
    evap: () => wrap(`<circle cx="12" cy="22" r="7" fill="#cfe8f5" stroke="#7aa"/><path d="M21 22 h6" stroke="${K}" stroke-width="2"/><circle cx="34" cy="22" r="3" fill="#cfe8f5" stroke="#7aa"/>${T(24, 44, '一直變小', 8, R)}`, 48, 48),
    hover: () => wrap(`<rect x="6" y="6" width="36" height="4" fill="${R}"/><rect x="6" y="34" width="36" height="4" fill="#4d8fb8"/><circle cx="24" cy="22" r="4" fill="${G}" stroke="#b08a20"/>${T(24, 47, '懸停', 8)}`, 48, 48),
    xray: () => wrap(`<path d="M6 10 l10 6 -6 4 10 6" stroke="#a678e6" stroke-width="2" fill="none"/><circle cx="32" cy="26" r="6" fill="${G}" stroke="#b08a20"/>${T(24, 46, 'X 光', 8)}`, 48, 48),
    tap: () => wrap(`<path d="M8 10 h22 v8 h-8 v4" stroke="#777" stroke-width="4" fill="none"/><path d="M22 26 q-3 6 0 12 q3 -6 0 -12" fill="#7cc0e6"/>${T(24, 46, '電像水流？', 7)}`, 48, 48),
    wave: () => wrap(`<path d="M4 22 q5 -10 10 0 t10 0 t10 0 t10 0" stroke="${B}" stroke-width="2" fill="none"/>${T(24, 42, '光是波', 9)}`, 48, 48),
    doubt: () => wrap(`<circle cx="24" cy="18" r="11" fill="#fde3df" stroke="${R}"/>${T(24, 23, '？', 14, R)}${T(24, 44, '不相信', 8)}`, 48, 48),

    nucmodel: () => wrap(`<circle cx="24" cy="22" r="17" fill="none" stroke="#8fb4d9" stroke-dasharray="2 2"/><circle cx="24" cy="22" r="3" fill="${R}"/><circle cx="41" cy="22" r="2.5" fill="${B}"/>${T(24, 46, '原子核', 8)}`, 48, 48),
    spiral: () => wrap(`<circle cx="24" cy="22" r="3" fill="${R}"/><path d="M24 22 m-16 0 a16 14 0 1 0 32 0 a13 11 0 1 0 -26 0 a9 7 0 1 0 18 0" stroke="${B}" fill="none" stroke-width="1.5"/>${T(24, 46, '越轉越近', 8)}`, 48, 48),
    quanta: () => wrap(`${stair(6, 38, 4, 9, 7, [], '#f6d68b')}${T(24, 46, '一份一份', 8)}`, 48, 48),
    prism: () => wrap(`<path d="M24 6 L40 34 L8 34Z" fill="${GL}" stroke="${B}" stroke-width="1.5"/><path d="M2 20 l14 2" stroke="#999" stroke-width="2"/>${['#ff3b30', '#ffd23f', '#3fd16b', '#3a8bff'].map((c, i) => `<path d="M32 ${22 + i} l14 ${-6 + i * 4}" stroke="${c}" stroke-width="1.5"/>`).join('')}${T(24, 46, '連續彩虹', 8)}`, 48, 48),
    hspec: () => wrap(`${hbar(4, 12, 40, 18)}${T(24, 44, '氫：幾條亮線', 7)}`, 48, 48),
    balmer: () => wrap(`<rect x="4" y="10" width="40" height="24" fill="#fff" stroke="${K}"/>${T(24, 27, '1/2²−1/n²', 8, '#2c4a7c')}${T(24, 46, '1885', 8)}`, 48, 48),
    helium: () => wrap(`${nuc(24, 22, 2, 2, 3)}<circle cx="10" cy="22" r="2.5" fill="${B}"/><circle cx="38" cy="22" r="2.5" fill="${B}"/>${T(24, 46, '氦：2 顆電子', 7)}`, 48, 48),
    zeeman: () => wrap(`<rect x="4" y="10" width="40" height="20" fill="#111"/>${[18, 22, 26].map(x => `<line x1="${x}" y1="10" x2="${x}" y2="30" stroke="#ffd23f" stroke-width="1.5"/>`).join('')}${T(24, 44, '磁場中分裂', 7)}`, 48, 48),
    ewave: () => wrap(`<circle cx="24" cy="22" r="3" fill="${R}"/><path d="${Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2, r = 15 + 2.5 * Math.sin(a * 6); return (i ? 'L' : 'M') + (24 + r * Math.cos(a)).toFixed(1) + ' ' + (22 + r * Math.sin(a)).toFixed(1); }).join(' ')}" stroke="${B}" fill="none" stroke-width="1.5"/>${T(24, 47, '電子是波？', 7)}`, 48, 48),
    vdbroek: () => wrap(`<circle cx="24" cy="14" r="7" fill="#f2d3b3" stroke="#555"/><path d="M12 36 q12 -14 24 0Z" fill="#2b2f3a"/>${T(24, 46, '業餘的猜測', 7)}`, 48, 48),
    crystal: () => wrap(`${[0, 1, 2].map(r => [0, 1, 2].map(c => `<circle cx="${14 + c * 10}" cy="${10 + r * 10}" r="3" fill="#8fb4d9" stroke="#557"/>`).join('')).join('')}<path d="M2 6 L22 20 L44 8" stroke="#a678e6" stroke-width="1.5" fill="none"/>${T(24, 46, 'X光＋晶體', 7)}`, 48, 48),
    ladder: () => wrap(`${stair(4, 38, 6, 7, 5)}${T(24, 46, '一元素一階', 7)}`, 48, 48),
    rareearth: () => wrap(`${[0, 1, 2, 3].map(i => `<circle cx="${10 + i * 9}" cy="20" r="5" fill="#d9c6f0" stroke="#7a6a9a"/>`).join('')}${T(24, 44, '長得好像', 8)}`, 48, 48),
    claims: () => wrap(`${[0, 1, 2].map(i => `<rect x="${6 + i * 4}" y="${6 + i * 6}" width="26" height="18" fill="#fff" stroke="${R}"/>`).join('')}${T(28, 30, '新!', 9, R)}${T(24, 47, '一堆新元素', 7)}`, 48, 48),
    seventytwo: () => wrap(`${card(8, 6, '72', '', '#ffe9b0', 32, 30)}${T(24, 46, '空位', 8)}`, 48, 48),
    celtium: () => wrap(`<path d="M6 38 L18 18 L30 38Z" fill="#b9a7d6" stroke="#7a6a9a"/>${T(36, 22, '?', 14, R)}${T(24, 47, '稀土裡？', 7)}`, 48, 48),
    zrlike: () => wrap(`${card(4, 4, 'Zr', '', '#fff', 20, 18).replace(/font-size="13"/, 'font-size="8"')}${card(4, 24, '72', '', '#ffe9b0', 20, 18).replace(/font-size="13"/, 'font-size="8"')}${T(36, 26, '≈', 12, '#2f9e5a')}${T(24, 47, '電子排列', 7)}`, 48, 48),
    he42: () => wrap(`${nuc(24, 20, 2, 2, 4.5)}${T(24, 44, '+2・質量4', 8)}`, 48, 48),
    squeeze: () => wrap(`<circle cx="24" cy="20" r="10" fill="#f6a29a" stroke="#555"/><circle cx="24" cy="20" r="2.5" fill="${B}"/><path d="M4 20 h8 M44 20 h-8" stroke="${R}" stroke-width="2"/>${T(24, 44, '原子核極小', 7)}`, 48, 48),
    beray: () => wrap(`<rect x="4" y="12" width="10" height="20" fill="#9aa3b5"/><path d="M16 22 h26" stroke="#888" stroke-width="2" stroke-dasharray="2 3"/>${T(30, 16, '?', 10, R)}${T(24, 44, '鈹射線', 8)}`, 48, 48),
    paraffin: () => wrap(`<rect x="8" y="10" width="16" height="24" fill="#f4f1ea" stroke="#aaa"/><path d="M26 22 h12" stroke="#f6a29a" stroke-width="2"/><circle cx="41" cy="22" r="3.5" fill="#f6a29a"/>${T(24, 46, '打出質子', 8)}`, 48, 48),
    gamma: () => wrap(`<path d="M4 22 l6 -8 6 16 6 -16 6 16 6 -16 6 8" stroke="#a678e6" stroke-width="1.8" fill="none"/>${T(24, 44, 'γ 射線＝光', 8)}`, 48, 48),
    repel: () => wrap(`<circle cx="30" cy="22" r="9" fill="#f6a29a" stroke="#555"/>${T(30, 26, '+', 11, R)}<circle cx="10" cy="22" r="4" fill="#ffd36b"/><path d="M8 16 l-4 -6" stroke="${R}" stroke-width="2"/>${T(24, 44, '推開', 8)}`, 48, 48),
    neutral: () => wrap(`<circle cx="24" cy="20" r="10" fill="#d6dbe3" stroke="#555" stroke-width="1.5"/>${T(24, 25, 'n', 12, K)}${T(24, 44, '不帶電', 8)}`, 48, 48),
    slow: () => wrap(`<circle cx="12" cy="22" r="5" fill="#d6dbe3" stroke="#555"/><rect x="20" y="10" width="12" height="24" fill="#cfe8f5"/><circle cx="40" cy="22" r="5" fill="#d6dbe3" stroke="#555"/>${T(24, 46, '先減速', 8)}`, 48, 48),
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

    'men-line': () => wrap(`<rect width="300" height="150" fill="#f6efe0"/>${T(150, 20, '照原子量排：活潑金屬每隔一段出現', 13, R)}
      ${[['Li', 1], ['Be'], ['B'], ['C'], ['N'], ['O'], ['F', 2], ['Na', 1], ['Mg'], ['Al'], ['Si'], ['P'], ['S'], ['Cl', 2]].map(([e, h], i) => card(6 + (i % 7) * 41, 38 + Math.floor(i / 7) * 50, e, '', h === 1 ? '#ffd9c2' : h === 2 ? '#d9f0c2' : '#fff', 36, 40)).join('')}
      ${T(150, 144, '橘色：活潑金屬　綠色：活潑非金屬', 10, '#555', 400)}`),
    'men-alkali': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '鋰、鈉、鉀丟進水裡', 13, R)}
      ${[['鋰 Li', 60, 1], ['鈉 Na', 150, 2], ['鉀 K', 240, 3]].map(([n, x, k]) => `<path d="M${x - 36} 52 L${x - 36} 116 Q${x - 36} 124 ${x - 28} 124 L${x + 28} 124 Q${x + 36} 124 ${x + 36} 116 L${x + 36} 52" fill="${GL}" stroke="${B}" stroke-width="2"/><rect x="${x - 35}" y="72" width="70" height="51" fill="#cfe8f5"/><rect x="${x - 6}" y="66" width="12" height="7" fill="#bbb"/>${Array.from({ length: k * 3 }, (_, i) => `<circle cx="${x - 18 + (i * 11) % 36}" cy="${64 - (i % 3) * 7}" r="2.5" fill="#fff" stroke="#9cc"/>`).join('')}${k === 3 ? flame(x, 66, .6) : ''}${T(x, 140, n, 11)}`).join('')}`),
    'men-oxide': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氧化物的化學式會循環', 13, R)}
      ${['R₂O', 'RO', 'R₂O₃', 'RO₂', 'R₂O₅'].map((f, i) => `<rect x="${12 + i * 56}" y="40" width="50" height="30" rx="4" fill="#fff" stroke="${R}"/>${T(37 + i * 56, 60, f, 12, R)}`).join('')}
      ${['Li₂O', 'BeO', 'B₂O₃', 'CO₂', 'N₂O₅'].map((f, i) => T(37 + i * 56, 88, f, 10, '#555', 400)).join('')}${['Na₂O', 'MgO', 'Al₂O₃', 'SiO₂', 'P₂O₅'].map((f, i) => T(37 + i * 56, 106, f, 10, '#555', 400)).join('')}
      ${T(150, 136, '……然後又從 R₂O 開始', 11, '#2c4a7c')}`),
    'men-as': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '砷比較像誰？', 13, R)}
      ${[['P', '磷', 110, 'P₂O₅', 'PH₃'], ['As', '砷', 185, 'As₂O₅', 'AsH₃'], ['Al', '鋁', 260, 'Al₂O₃', '—']].map(([e, n, x, o, h]) => `${card(x - 20, 34, e, n, e === 'As' ? '#ffe9b0' : '#fff', 40, 44)}${T(x, 102, o, 12, '#2c4a7c')}${T(x, 122, h, 12, '#2c4a7c')}`).join('')}
      ${T(38, 102, '氧化物', 10, '#888', 400)}${T(38, 122, '氫化物', 10, '#888', 400)}`),
    'men-tei': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '碲比碘重，可是……', 13, R)}
      ${card(40, 40, 'Se', '硒', '#e3f2c6', 40, 44)}${card(40, 92, 'Te', '127.6', '#e3f2c6', 40, 44)}${card(200, 40, 'Br', '溴', '#fde3df', 40, 44)}${card(200, 92, 'I', '126.9', '#fde3df', 40, 44)}
      ${T(150, 70, '性質相似 ↕', 11, '#555', 400)}${T(150, 120, '原子量：碲 ＞ 碘', 12, R)}`),
    'men-gapcalc': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '相鄰元素的原子量差距', 13, R)}
      ${[['Mg', 24.3], ['Al', 27], ['Si', 28.1], ['P', 31], ['S', 32.1]].map(([e, w], i) => `${card(14 + i * 40, 40, e, String(w), '#fff', 34, 40)}`).join('')}${T(110, 98, '差 1～4', 12, '#2c4a7c')}
      ${card(222, 40, 'Zn', '65.4', '#fff', 34, 40)}${card(262, 92, 'As', '74.9', '#ffe9b0', 34, 40)}<path d="M240 82 L270 92" stroke="${R}" stroke-width="2"/>${T(222, 120, '差將近 10！', 12, R)}`),
    'men-gaw': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '原子量：預言 vs 實測', 13, R)}
      <rect x="40" y="${130 - 68}" width="70" height="68" fill="#f6eedb" stroke="#b9a77f"/>${T(75, 56, '68', 16, '#2c4a7c', 900)}${T(75, 146, '類鋁（預言）', 10, '#555', 400)}
      <rect x="190" y="${130 - 70}" width="70" height="70" fill="#e8f3ff" stroke="${B}"/>${T(225, 54, '69.7', 16, '#2c4a7c', 900)}${T(225, 146, '鎵（實測）', 10, '#555', 400)}${T(150, 100, '≈', 22, '#2f9e5a', 900)}`),
    'men-ga2o3': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氧化物的化學式', 13, R)}
      ${T(80, 84, 'Ea₂O₃', 24, '#8a6510', 900)}${T(80, 112, '類鋁（預言）', 10, '#555', 400)}${T(150, 84, '＝', 22, '#2f9e5a', 900)}${T(220, 84, 'Ga₂O₃', 24, '#2c4a7c', 900)}${T(220, 112, '鎵（實測）', 10, '#555', 400)}`),
    'men-sample': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '鎵從哪裡來？', 13, R)}
      <path d="M20 128 L50 70 L80 96 L110 60 L140 128Z" fill="#9b8a72" stroke="#6b5a42" stroke-width="2"/>${T(80, 144, '一大堆礦石', 10, '#555', 400)}<path d="M150 96 h40 m-8 -6 l8 6 -8 6" stroke="${K}" stroke-width="2" fill="none"/>
      <circle cx="236" cy="96" r="5" fill="#c8ccd4" stroke="#777"/>${T(236, 124, '只得到一點點', 11, R)}${T(236, 140, '還沒完全純化', 10, '#555', 400)}`),
    'tho-magnet': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '磁鐵靠近：光點移動了', 13, '#ffd36b')}${tube(40, 84, 220, 'up')}
      <rect x="150" y="116" width="40" height="16" fill="${R}"/><rect x="190" y="116" width="40" height="16" fill="#4d8fb8"/>${T(170, 128, 'N', 10, '#fff')}${T(210, 128, 'S', 10, '#fff')}`),
    'tho-eweak': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '加上電場：幾乎沒偏轉', 13, '#ffd36b')}${tube(40, 84, 220, 'straight')}
      <rect x="120" y="62" width="70" height="5" fill="${R}"/><rect x="120" y="101" width="70" height="5" fill="#4d8fb8"/>${T(112, 68, '+', 12, '#ff8a7a')}${T(112, 108, '−', 12, '#8fc8ff')}
      ${[[90, 76], [150, 92], [210, 74], [236, 96], [70, 94]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#aab"/>`).join('')}${T(150, 142, '管內還殘留著氣體分子', 10, '#cfd6e6', 400)}`),
    'tho-cup': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '金屬筒收集射線', 13, '#ffd36b')}${tube(30, 80, 200, 'straight')}
      <path d="M236 64 h30 v32 h-30" fill="none" stroke="#c9a24a" stroke-width="4"/><path d="M266 80 h18 v40" stroke="#ccc" stroke-width="2"/><circle cx="284" cy="126" r="8" fill="#fff"/>${T(284, 130, '−', 12, B)}${T(150, 140, '金屬筒帶了負電', 11, '#cfd6e6')}`),
    'tho-metals': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '換不同的陰極金屬', 13, R)}
      ${[['鋁', 60], ['鐵', 150], ['鉑', 240]].map(([n, x]) => `<rect x="${x - 30}" y="44" width="60" height="40" rx="6" fill="#d8dce3" stroke="#777"/>${T(x, 70, n, 14)}${T(x, 112, '荷質比', 10, '#555', 400)}${T(x, 132, '相同', 14, '#2c4a7c', 900)}`).join('')}`),
    'tho-gases': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '換管內的氣體', 13, R)}
      ${[['空氣', '#eee', 60], ['氫氣', HC, 150], ['CO₂', '#ddd', 240]].map(([n, c, x]) => `<ellipse cx="${x}" cy="64" rx="34" ry="20" fill="${c}" stroke="${B}" stroke-width="2"/>${T(x, 69, n, 13)}${T(x, 112, '荷質比', 10, '#555', 400)}${T(x, 132, '相同', 14, '#2c4a7c', 900)}`).join('')}`),
    'tho-em': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '荷質比大比拚', 13, R)}
      <rect x="30" y="${128 - 8}" width="60" height="8" fill="#9fc3e6"/>${T(60, 112, '氫離子', 11)}
      <rect x="170" y="38" width="100" height="90" fill="#3fd16b" opacity=".8"/>${T(220, 80, '一千倍以上', 14, K, 900)}${T(220, 144, '射線粒子', 11)}`),
    'tho-diffuse': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '讓霓虹氣反覆穿過陶土管', 13, R)}
      <rect x="40" y="60" width="220" height="24" rx="12" fill="#d9b48a" stroke="#9a7449" stroke-width="2"/>${Array.from({ length: 18 }, (_, i) => `<circle cx="${54 + i * 11.5}" cy="72" r="2" fill="#9a7449"/>`).join('')}
      <rect x="20" y="104" width="100" height="32" rx="6" fill="#ffe0e8" stroke="${R}"/>${T(70, 125, '約 20.15', 13, R, 900)}<rect x="180" y="104" width="100" height="32" rx="6" fill="#ffe0e8" stroke="${R}"/>${T(230, 125, '約 20.28', 13, R, 900)}`),
    'tho-inert': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '兩部分的性質比一比', 13, R)}
      ${[60, 220].map((x, i) => `<rect x="${x - 40}" y="36" width="80" height="46" rx="6" fill="#ffe0e8" stroke="${R}"/>${T(x, 64, i ? '22 那份' : '20 那份', 12, R)}<rect x="${x - 40}" y="92" width="80" height="16" fill="#111"/><line x1="${x - 14}" y1="92" x2="${x - 14}" y2="108" stroke="#ff5a3a" stroke-width="2"/><line x1="${x + 6}" y1="92" x2="${x + 6}" y2="108" stroke="#ffb03a" stroke-width="2"/>${T(x, 128, '不反應', 11, '#555', 400)}`).join('')}${T(150, 104, '光譜 ＝', 11, '#2c4a7c')}`),
    'tho-repeat': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '換一批霓虹氣再做', 13, R)}
      ${[0, 1, 2].map(i => `<rect x="${24 + i * 88}" y="38" width="76" height="80" fill="#2b2b33"/><path d="M${30 + i * 88} 110 Q${62 + i * 88} 104 ${94 + i * 88} 48" stroke="#f0e6c8" stroke-width="2" fill="none"/><path d="M${30 + i * 88} 114 Q${66 + i * 88} 110 ${96 + i * 88} 64" stroke="#f0e6c8" stroke-width="1" fill="none" opacity=".6"/>${T(62 + i * 88, 136, `第 ${i + 1} 次`, 10, '#555', 400)}`).join('')}`),

    'ruth-thx': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '放射性隨時間的變化', 13, R)}<path d="M40 126 h240 M40 126 v-96" stroke="#555"/>${T(160, 144, '天數', 10, '#555', 400)}
      <path d="M40 40 Q90 96 150 112 T270 122" stroke="${R}" stroke-width="2.5" fill="none"/>${T(250, 108, '釷X：變少', 11, R)}
      <path d="M40 120 Q90 66 150 50 T270 42" stroke="#2f9e5a" stroke-width="2.5" fill="none"/>${T(244, 36, '剩下的釷：恢復', 11, '#2f9e5a')}`),
    'ruth-heat': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '加熱、冷卻、做成化合物', 13, R)}
      ${[['高溫', '#ffd2b0', 60], ['低溫', '#d7ecff', 150], ['化合物', '#e3f2c6', 240]].map(([n, c, x]) => `<rect x="${x - 36}" y="40" width="72" height="56" rx="8" fill="${c}" stroke="#777"/>${T(x, 64, n, 13)}${T(x, 86, '☢ 強度', 11, '#555', 400)}${T(x, 120, '不變', 14, '#2c4a7c', 900)}`).join('')}`),
    'ruth-he': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '密封的鐳，過了一段時間', 13, R)}
      <rect x="40" y="50" width="90" height="50" rx="20" fill="${GL}" stroke="${B}" stroke-width="2"/><rect x="74" y="68" width="22" height="14" fill="#9fe6a0"/>${T(85, 122, '密封管', 10, '#555', 400)}
      <rect x="160" y="60" width="120" height="30" fill="#111"/>${[[184, '#ffd23f'], [214, '#3fd16b'], [232, '#3a8bff']].map(([x, c]) => `<line x1="${x}" y1="60" x2="${x}" y2="90" stroke="${c}" stroke-width="3"/>`).join('')}${T(220, 116, '出現了氦的光譜！', 12, R)}`),
    'ruth-through': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '大多數 α 粒子直直穿過', 13, '#ffd36b')}${src(30, 80)}
      ${[60, 70, 80, 90, 100].map(y => `<path d="M44 ${y} L280 ${y + (y - 80) * .05}" stroke="#ffd36b" stroke-width="1.5" stroke-dasharray="5 3"/>`).join('')}<rect x="150" y="48" width="4" height="66" fill="#e8c35a"/>${T(152, 132, '金箔', 10, '#cfd6e6', 400)}`),
    'ruth-back': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '八千顆裡有一顆彈回來！', 13, '#ffd36b')}${src(30, 84)}
      <path d="M44 84 L150 84" stroke="#ffd36b" stroke-width="1.5" stroke-dasharray="5 3"/><path d="M150 84 Q120 70 70 52" stroke="${R}" stroke-width="2.5" fill="none"/><path d="M76 48 l-8 4 8 4" stroke="${R}" stroke-width="2" fill="none"/>
      <rect x="150" y="50" width="4" height="66" fill="#e8c35a"/><rect x="60" y="36" width="40" height="6" fill="#3fd16b" opacity=".8"/>${T(80, 32, '偵測屏', 9, '#cfd6e6', 400)}${T(230, 110, '像砲彈被衛生紙彈回來', 11, '#cfd6e6', 400)}`),
    'ruth-thick': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '金箔厚度 vs 反彈數量', 13, R)}
      <rect x="60" y="${126 - 30}" width="50" height="30" fill="#e8c35a" stroke="#b08a20"/>${T(85, 88, '1 份', 12)}${T(85, 142, '金箔 1 倍厚', 10, '#555', 400)}
      <rect x="190" y="${126 - 60}" width="50" height="60" fill="#e8c35a" stroke="#b08a20"/>${T(215, 58, '2 份', 12)}${T(215, 142, '金箔 2 倍厚', 10, '#555', 400)}${T(150, 90, '→', 18, K)}`),
    'ruth-dry': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '純化、乾燥過的氮氣', 13, '#ffd36b')}${src(36, 84)}
      <rect x="60" y="56" width="150" height="56" rx="6" fill="#2b3a55" stroke="#8fb4d9" stroke-width="2"/>${T(135, 82, '純氮氣', 13, '#cfd8ff')}${T(135, 100, '（沒有水氣、氫氣）', 9, '#cfd6e6', 400)}<rect x="222" y="50" width="8" height="68" fill="#3fd16b" opacity=".8"/>
      ${[[226, 60], [226, 82], [226, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`).join('')}${T(262, 88, '照樣出現', 10, '#ffd36b')}`),
    'ruth-oxy': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '換成別的氣體', 13, '#ffd36b')}
      ${[['氮氣', '✨✨✨', 60], ['氧氣', '·', 150], ['CO₂', '·', 240]].map(([n, f, x]) => `<rect x="${x - 38}" y="44" width="76" height="44" rx="6" fill="#2b3a55" stroke="#8fb4d9"/>${T(x, 72, n, 13, '#cfd8ff')}${T(x, 116, f, 16, '#fff')}`).join('')}${T(150, 142, '射得特別遠的閃光', 10, '#cfd6e6', 400)}`),
    'ruth-mag': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '用磁場秤這些粒子', 13, R)}
      <rect x="40" y="40" width="100" height="80" rx="6" fill="#f3f3f7" stroke="#777"/>${T(90, 70, '未知粒子', 12)}${T(90, 96, '質量 1・電荷 +1', 11, '#2c4a7c')}
      ${T(150, 84, '＝', 20, '#2f9e5a', 900)}<rect x="160" y="40" width="100" height="80" rx="6" fill="#fde3df" stroke="${R}"/>${T(210, 70, '氫原子核', 12, R)}${T(210, 96, '質量 1・電荷 +1', 11, '#2c4a7c')}`),
    'mil-cloud': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '雲一邊落下一邊蒸發', 13, R)}
      ${[0, 1, 2].map(i => `<ellipse cx="${70 + i * 80}" cy="${54 + i * 22}" rx="${40 - i * 9}" ry="${16 - i * 4}" fill="#dfe6ee" opacity="${1 - i * .25}"/>${T(70 + i * 80, 130, ['開始', '一會兒', '再一會兒'][i], 10, '#555', 400)}`).join('')}${T(150, 146, '雲頂越來越模糊、越來越小', 10, R, 400)}`),
    'mil-hover': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '強電場：幾顆水滴懸停了！', 13, R)}
      ${plates(60, 38, 180, 86)}<circle cx="120" cy="76" r="4" fill="#cfe8f5" stroke="#4d8fb8"/><circle cx="178" cy="90" r="4" fill="#cfe8f5" stroke="#4d8fb8"/>${T(150, 146, '其他水滴都被拉走了', 10, '#555', 400)}
      <circle cx="150" cy="82" r="30" fill="none" stroke="${K}" stroke-dasharray="3 3"/>`),
    'mil-oil': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '噴出鐘錶油的油霧', 13, R)}
      <ellipse cx="50" cy="84" rx="20" ry="26" fill="#e8d8b0" stroke="#8a7a5a" stroke-width="2"/><path d="M70 80 h24" stroke="#8a7a5a" stroke-width="5"/>
      ${[[120, 70], [140, 90], [160, 76], [180, 96], [200, 82], [150, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${G}" stroke="#b08a20"/>`).join('')}${T(220, 130, '幾乎不蒸發，可看好幾小時', 11, '#2c4a7c')}`),
    'mil-multi': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '同一顆油滴的電量變化', 13, R)}<path d="M40 128 h240 M40 128 v-100" stroke="#555"/>
      <path d="M40 110 h50 v-20 h50 v-20 h40 v40 h50 v-60 h50" stroke="${R}" stroke-width="2.5" fill="none"/>
      ${[[110, '1.6'], [90, '3.2'], [70, '4.8'], [50, '6.4']].map(([y, t]) => `<line x1="36" y1="${y}" x2="280" y2="${y}" stroke="#ccc" stroke-dasharray="2 3"/>${T(22, y + 4, t, 9, '#2c4a7c')}`).join('')}${T(160, 144, '時間（照 X 光改變電量）', 10, '#555', 400)}`),
    'mil-drops': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '幾百顆油滴的電量（×10⁻¹⁹ 庫侖）', 13, R)}
      ${[1, 2, 3, 4, 5, 6].map(n => `<line x1="${30 + n * 38}" y1="40" x2="${30 + n * 38}" y2="120" stroke="#ccc"/>${T(30 + n * 38, 136, (1.6 * n).toFixed(1), 10, '#2c4a7c')}`).join('')}
      ${[[1, 50], [1, 62], [2, 48], [2, 70], [2, 86], [3, 56], [3, 74], [4, 66], [4, 100], [5, 82], [6, 58], [1, 96], [3, 104]].map(([n, y]) => `<circle cx="${30 + n * 38 + ((y * 7) % 5 - 2)}" cy="${y}" r="4" fill="${G}" stroke="#b08a20"/>`).join('')}`),
    'mil-ehren': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '維也納：極小的金屬微粒', 13, R)}
      <circle cx="80" cy="80" r="40" fill="#f3f3f7" stroke="${K}" stroke-width="2"/><path d="M76 76 l6 2 -2 6 -5 -1Z" fill="#888"/>${T(80, 136, '形狀不規則、極小', 10, '#555', 400)}
      ${T(210, 70, '量到的電量', 12, '#555', 400)}${T(210, 100, '＜ 1.6 × 10⁻¹⁹ ！', 15, R, 900)}`),
    'mil-thresh': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '不同顏色的光照鈉金屬', 13, R)}
      ${[['紅光（很強）', '#e04a3a', 60, false], ['綠光', '#2fae5a', 150, true], ['紫光（很弱）', '#8a4ad6', 240, true]].map(([n, c, x, ok]) => `<path d="M${x - 20} 40 L${x} 80" stroke="${c}" stroke-width="${n.includes('強') ? 5 : 2}"/><rect x="${x - 26}" y="80" width="52" height="12" fill="#b8bec7"/>${ok ? `<circle cx="${x + 14}" cy="66" r="3.5" fill="#3fd16b"/>` : ''}${T(x, 112, n, 10, '#555', 400)}${T(x, 132, ok ? '有電子' : '沒有電子', 12, ok ? '#2f9e5a' : R)}`).join('')}`),
    'mil-line': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '電子最大動能 vs 光的頻率', 13, R)}<path d="M50 126 h220 M50 126 v-96" stroke="#555"/>
      <path d="M100 126 L260 40" stroke="${B}" stroke-width="2.5"/>${[[120, 115], [150, 99], [180, 83], [210, 67], [240, 51]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${R}"/>`).join('')}${T(160, 144, '頻率', 10, '#555', 400)}${T(30, 80, '動能', 10, '#555', 400)}`),
    'mil-h': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '直線的斜率', 13, R)}
      <rect x="30" y="44" width="110" height="70" rx="8" fill="#e8f3ff" stroke="${B}"/>${T(85, 70, '斜率（實驗）', 11, '#555', 400)}${T(85, 98, '6.57×10⁻³⁴', 14, '#2c4a7c', 900)}
      ${T(150, 84, '≈', 22, '#2f9e5a', 900)}<rect x="160" y="44" width="110" height="70" rx="8" fill="#f6eedb" stroke="#b9a77f"/>${T(215, 70, '普朗克常數', 11, '#555', 400)}${T(215, 98, '6.6×10⁻³⁴', 14, '#8a6510', 900)}`),

    'bohr-collapse': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '照電磁學計算……', 13, '#ffd36b')}<circle cx="90" cy="86" r="5" fill="#f6a29a"/><path d="M90 86 m-44 0 a44 36 0 1 0 88 0 a38 30 0 1 0 -76 0 a28 22 0 1 0 56 0 a16 12 0 1 0 -32 0" stroke="#3fd16b" stroke-width="1.5" fill="none"/>
      ${T(220, 76, '大約', 12, '#cfd6e6', 400)}${T(220, 102, '一千億分之一秒', 15, '#ffd36b', 900)}${T(220, 124, '就掉進去', 12, '#cfd6e6', 400)}`),
    'bohr-stable': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氫原子：穩定又一模一樣', 13, R)}
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${50 + i * 50}" cy="76" r="18" fill="${HC}" stroke="${B}"/>${T(50 + i * 50, 80, 'H', 12, B)}`).join('')}${T(150, 130, '放了好幾年，性質完全不變', 11, '#2c4a7c')}`),
    'bohr-planck': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '普朗克：能量一份一份的', 13, R)}
      <path d="M40 120 Q120 40 260 40" stroke="#bbb" stroke-width="3" fill="none"/>${T(120, 60, '連續的坡道？', 11, '#888', 400)}${stair(150, 124, 6, 20, 12, [], '#f6d68b')}${T(210, 140, '一階一階的樓梯！', 11, '#8a6510')}`),
    'bohr-lines': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氫氣的可見光譜', 13, R)}${hbar(30, 40, 240, 60)}
      ${[[410, '紫'], [434, '藍'], [486, '藍綠'], [656, '紅']].map(([nm, n]) => T(30 + (nm - 380) / 320 * 240, 118, n, 10, '#555', 400) + T(30 + (nm - 380) / 320 * 240, 132, String(nm), 9, '#888', 400)).join('')}${T(150, 146, '（奈米）', 9, '#888', 400)}`),
    'bohr-balmer': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '巴耳末公式（1885）', 13, R)}<rect x="40" y="38" width="220" height="44" rx="8" fill="#fff" stroke="${K}"/>${T(150, 66, '1/λ ∝ 1/2² − 1/n²', 16, '#2c4a7c', 900)}
      ${[3, 4, 5, 6].map((n, i) => T(60 + i * 60, 108, `n = ${n}`, 12, '#555', 400) + T(60 + i * 60, 128, ['紅', '藍綠', '藍', '紫'][i], 11, ['#e04a3a', '#22a3a3', '#3a5bff', '#8a3cff'][i])).join('')}`),
    'bohr-calc': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '電子從第 3 階掉到第 2 階', 13, R)}
      ${[[1, 130], [2, 92], [3, 66], [4, 52], [5, 44]].map(([n, y]) => `<line x1="40" y1="${y}" x2="170" y2="${y}" stroke="#557" stroke-width="2"/>${T(28, y + 4, 'n=' + n, 9, '#555', 400)}`).join('')}
      <path d="M110 66 L110 90" stroke="${R}" stroke-width="2.5"/><path d="M104 84 l6 7 6 -7" stroke="${R}" stroke-width="2" fill="none"/><path d="M120 78 q14 -8 28 0 t28 0 t28 0" stroke="#ff3b30" stroke-width="2" fill="none"/>${T(240, 100, '656 奈米', 16, '#e04a3a', 900)}${T(240, 120, '＝ 紅線！', 12, '#e04a3a')}`),
    'bohr-he': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '氦的光譜：計算 vs 實驗', 13, R)}
      ${T(60, 58, '計算', 11, '#555', 400)}${hbar(90, 44, 180, 22, [[447, '#3a5bff'], [520, '#3fd16b'], [610, '#ffb03a']])}${T(60, 100, '實驗', 11, '#555', 400)}${hbar(90, 86, 180, 22, [[402, '#8a3cff'], [471, '#3a8bff'], [501, '#3fd16b'], [588, '#ffd23f'], [668, '#ff3b30']])}${T(150, 134, '對不上！', 13, R, 900)}`),
    'bohr-ellipse': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '索末菲：加上橢圓軌道', 13, R)}<circle cx="150" cy="84" r="4" fill="${R}"/>
      <ellipse cx="150" cy="84" rx="40" ry="40" fill="none" stroke="${B}"/><ellipse cx="160" cy="84" rx="70" ry="30" fill="none" stroke="#2f9e5a"/><ellipse cx="170" cy="84" rx="100" ry="22" fill="none" stroke="#a678e6"/>${T(150, 144, '補丁越來越多……', 11, '#888', 400)}`),
    'bohr-wave': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '電子的波要剛好接起來', 13, R)}
      ${[[80, 4, true], [220, 4.5, false]].map(([cx, k, ok]) => `<circle cx="${cx}" cy="80" r="4" fill="${R}"/><path d="${Array.from({ length: 61 }, (_, i) => { const a = i / 60 * Math.PI * 2 * (ok ? 1 : 1.04), r = 40 + 5 * Math.sin(a * k * 1.5); return (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (80 + r * Math.sin(a)).toFixed(1); }).join(' ')}" stroke="${ok ? '#2f9e5a' : R}" fill="none" stroke-width="2"/>${T(cx, 140, ok ? '接得起來 ✓' : '接不起來 ✗', 11, ok ? '#2f9e5a' : R)}`).join('')}`),
    'mos-stair': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '√X 光頻率，依序號排列', 13, R)}${stair(40, 128, 10, 22, 9)}
      ${['Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu'].map((e, i) => T(51 + i * 22, 142, e, 8, '#555', 400)).join('')}${T(110, 52, '每一階都一樣高', 11, '#2c4a7c')}`),
    'mos-coni': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '鈷和鎳', 13, R)}
      ${card(60, 40, 'Co', '58.9', '#e8f3ff', 44, 50)}${card(196, 40, 'Ni', '58.7', '#fff', 44, 50)}${T(150, 64, '原子量：鈷 ＞ 鎳', 11, '#555', 400)}${T(150, 112, 'X 光樓梯：鈷在前 → 鎳在後', 12, '#2c4a7c')}${T(150, 134, '（和門得列夫依性質排的一樣）', 10, '#888', 400)}`),
    'mos-atw': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '原子量 vs 序號', 13, R)}<path d="M40 126 h230 M40 126 v-96" stroke="#555"/>
      <path d="M50 116 L74 104 L98 96 L122 80 L146 76 L170 62 L194 58 L218 56 L242 40" stroke="#c9a24a" stroke-width="2" fill="none"/>${T(250, 60, '原子量：忽大忽小', 10, '#8a6510')}<path d="M50 118 L242 44" stroke="${B}" stroke-width="2" stroke-dasharray="4 3"/>${T(120, 112, '序號：均勻', 10, B)}`),
    'mos-gaps': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '從鋁到金：有四階是空的', 13, R)}${stair(16, 128, 26, 10.4, 3.6, [8, 15, 19, 21])}
      ${[[8, 43], [15, 61], [19, 72], [21, 75]].map(([i, z]) => T(21 + i * 10.4, 128 - (i + 1) * 3.6 - 6, String(z), 9, R)).join('')}${T(150, 144, '（示意圖）', 9, '#888', 400)}`),
    'mos-rare': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '鑭到鎦：階數是固定的', 13, R)}
      ${Array.from({ length: 15 }, (_, i) => `<rect x="${22 + i * 17.5}" y="54" width="16" height="40" rx="2" fill="#d9c6f0" stroke="#7a6a9a"/>${T(30 + i * 17.5, 78, String(57 + i), 8, '#555', 400)}`).join('')}${T(150, 120, '不多也不少', 13, '#2c4a7c', 900)}`),
    'mos-urbain': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '于爾班的稀土樣品', 13, R)}
      <rect x="30" y="44" width="100" height="70" rx="8" fill="#f6eedb" stroke="#b9a77f"/>${T(80, 72, '化學分離', 12, '#8a6510')}${T(80, 96, '好多年', 14, '#8a6510', 900)}
      <rect x="170" y="44" width="100" height="70" rx="8" fill="#e8f3ff" stroke="${B}"/>${T(220, 72, 'X 光分析', 12, B)}${T(220, 96, '很快', 14, B, 900)}${T(150, 82, 'vs', 13, K, 900)}`),
    'mos-place': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '72 號在週期表上的位置', 13, R)}
      ${[['Ti', 22], ['Zr', 40], ['72', '']].map(([e, z], i) => card(130, 32 + i * 36, e, String(z), e === '72' ? '#ffe9b0' : '#fff', 40, 34)).join('')}${T(220, 70, '第 4 族', 12, '#2c4a7c')}<rect x="20" y="104" width="90" height="30" rx="4" fill="#d9c6f0" stroke="#7a6a9a"/>${T(65, 124, '稀土到 71 結束', 10, '#555', 400)}`),
    'mos-noline': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '于爾班樣品的 X 光', 13, R)}<rect x="40" y="44" width="220" height="40" fill="#111"/>${[70, 112, 150, 196, 232].map(x => `<line x1="${x}" y1="44" x2="${x}" y2="84" stroke="#ddd" stroke-width="2"/>`).join('')}
      <line x1="170" y1="40" x2="170" y2="88" stroke="${R}" stroke-width="2" stroke-dasharray="3 3"/>${T(170, 104, '72 號應該在這裡', 11, R)}${T(170, 124, '→ 沒有線', 12, R, 900)}`),
    'mos-zr': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '鋯的礦物', 13, R)}<path d="M60 128 L110 50 L160 128Z" fill="#c9b48a" stroke="#8a7449" stroke-width="2"/>
      ${[[96, 100], [110, 82], [124, 108], [104, 116]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5" fill="${i === 2 ? '#ffe9b0' : '#fff'}" stroke="#555"/>`).join('')}${T(230, 76, '性質相似的元素', 11, '#555', 400)}${T(230, 98, '常混在一起', 13, '#2c4a7c', 900)}`),
    'chad-table': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '原子核的電荷 vs 質量', 13, R)}
      ${[['氦', 2, 4], ['碳', 6, 12], ['氧', 8, 16], ['鐵', 26, 56]].map(([n, z, a], i) => `${T(50, 52 + i * 24, n, 12)}<rect x="74" y="${42 + i * 24}" width="${z * 3}" height="10" fill="#f6a29a"/><rect x="74" y="${53 + i * 24}" width="${a * 3}" height="5" fill="#9aa3b5"/>${T(272, 54 + i * 24, `${z} / ${a}`, 10, '#555', 400)}`).join('')}${T(150, 144, '紅：電荷　灰：質量', 10, '#888', 400)}`),
    'chad-squeeze': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '把電子關進原子核？', 13, '#ffd36b')}<circle cx="100" cy="84" r="22" fill="#f6a29a" stroke="#fff"/><circle cx="100" cy="84" r="4" fill="#8fc8ff"/>
      ${[[60, 84], [140, 84], [100, 44], [100, 124]].map(([x, y]) => `<path d="M${x} ${y} L${100 + (x - 100) * .55} ${84 + (y - 84) * .55}" stroke="#ff8a7a" stroke-width="2.5"/>`).join('')}${T(215, 80, '需要的能量', 12, '#cfd6e6', 400)}${T(215, 104, '大得不合理', 15, '#ffd36b', 900)}`),
    'chad-iso': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '霓虹-20 和 霓虹-22', 13, R)}${nuc(80, 78, 10, 10, 4)}${nuc(220, 78, 10, 12, 4)}
      ${T(80, 124, '電荷 +10・質量 20', 10, '#555', 400)}${T(220, 124, '電荷 +10・質量 22', 10, '#555', 400)}${T(150, 142, '化學性質完全一樣', 11, '#2c4a7c')}`),
    'chad-energy': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '如果是 γ 射線，要多強？', 13, R)}
      <rect x="60" y="${128 - 16}" width="60" height="16" fill="#a678e6"/>${T(90, 104, '已知的 γ 射線', 10, '#555', 400)}<rect x="180" y="34" width="60" height="94" fill="#ff8a7a"/>${T(210, 80, '需要的', 11, '#fff')}${T(210, 98, '十倍以上', 12, '#fff', 900)}`),
    'chad-recoil': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '撞氫 vs 撞氮', 13, R)}
      <circle cx="60" cy="64" r="7" fill="#d6dbe3" stroke="#555"/><path d="M68 64 h20" stroke="#999" stroke-dasharray="3 2"/><circle cx="100" cy="64" r="6" fill="#f6a29a"/><path d="M108 64 h120" stroke="#f6a29a" stroke-width="3"/>${T(240, 68, '快', 12, R)}
      <circle cx="60" cy="112" r="7" fill="#d6dbe3" stroke="#555"/><path d="M68 112 h20" stroke="#999" stroke-dasharray="3 2"/><circle cx="104" cy="112" r="11" fill="#cfd8ff" stroke="#555"/><path d="M116 112 h34" stroke="#8fa0d9" stroke-width="3"/>${T(162, 116, '慢', 12, B)}${T(240, 116, '→ 質量 ≈ 質子', 11, '#2c4a7c')}`),
    'chad-lead': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, '厚厚的鉛板也擋不住', 13, '#ffd36b')}${[90, 130, 170].map(x => `<rect x="${x}" y="44" width="16" height="80" fill="#7a7f8a" stroke="#aab"/>`).join('')}
      <path d="M30 84 h250" stroke="#cfd6e6" stroke-width="2" stroke-dasharray="2 5"/>${T(150, 140, '電場、磁場也偏轉不了它', 10, '#cfd6e6', 400)}`),
    'chad-repel': () => wrap(`<rect width="300" height="150" fill="#1f2433"/>${T(150, 20, 'α 粒子撞重原子核', 13, '#ffd36b')}${nuc(200, 84, 18, 18, 3.6)}${T(200, 140, '帶很多正電', 10, '#cfd6e6', 400)}
      ${src(40, 84)}<path d="M54 84 L130 84 Q150 84 160 60" stroke="#ffd36b" stroke-width="2" fill="none" stroke-dasharray="4 3"/>${T(150, 52, '被推開', 11, '#ff8a7a')}`),
    'chad-fermi': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '費米：用中子撞幾十種元素', 13, R)}
      ${['Al', 'Cu', 'Ag', 'I', 'Au', 'U'].map((e, i) => `${card(24 + i * 44, 50, e, '', '#fff', 36, 40)}${T(42 + i * 44, 112, '☢', 14, '#c9a24a')}`).join('')}${T(150, 136, '很多變成新的放射性原子', 11, '#2c4a7c')}`),
    'chad-slowx': () => wrap(`<rect width="300" height="150" fill="${W}"/>${T(150, 20, '先讓中子變慢', 13, R)}
      <circle cx="40" cy="80" r="7" fill="#d6dbe3" stroke="#555"/><path d="M48 80 h40" stroke="#999" stroke-width="2"/><rect x="92" y="52" width="60" height="56" fill="#cfe8f5" stroke="${B}"/>${T(122, 84, '水／石蠟', 11, B)}
      <path d="M154 80 h30" stroke="#999" stroke-width="2" stroke-dasharray="2 4"/><circle cx="190" cy="80" r="7" fill="#d6dbe3" stroke="#555"/>${nuc(250, 80, 5, 5, 4)}${T(220, 130, '反而更容易被吸收', 12, '#2c4a7c')}`),
  };

  const get = (lib, k) => (lib[k] ? lib[k]() : '');
  return { scene: k => get(SCENES, k), icon: k => get(ICONS, k), exp: k => get(EXPS, k) };
})();
