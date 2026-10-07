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
      ${T(222, 22, '水能被拆開？', 12, '#555')}`)
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
    alchemy: () => wrap(`<circle cx="12" cy="20" r="8" fill="#7d7d8a"/><path d="M22 20 h6 m-3 -3 l3 3 -3 3" stroke="${K}" stroke-width="2" fill="none"/><circle cx="38" cy="20" r="8" fill="${G}"/><path d="M28 8 L46 34 M46 8 L28 34" stroke="${R}" stroke-width="2.5"/>${T(24, 44, '鉛→金', 9)}`, 48, 48)
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
      ${T(150, 22, '怎麼加熱、怎麼反應，都拆不開', 13, R)}`)
  };

  const get = (lib, k) => (lib[k] ? lib[k]() : '');
  return { scene: k => get(SCENES, k), icon: k => get(ICONS, k), exp: k => get(EXPS, k) };
})();
