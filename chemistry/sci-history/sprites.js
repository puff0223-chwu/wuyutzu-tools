/* =========================================================
   時光手稿 — 像素美術
   ・角色用 16×16 的「字元圖」畫成，每個字元代表一種顏色
   ・地板、牆壁等圖塊用程式畫（有固定亂數，所以每次長一樣）
   ・畫好的圖會先存成小畫布（快取），遊戲時直接貼上去
   ========================================================= */
const SPR = (() => {
  const T = 16;
  const PAL = {
    k: '#1b1b2a', w: '#ffffff', s: '#f2c9a0', S: '#d9a37a', h: '#ece8e0', H: '#b9b3a8',
    b: '#2c4a7c', B: '#1f2f52', r: '#c0392b', R: '#7d1f1c', y: '#f3c64b', Y: '#c99a2a',
    g: '#4f9a52', G: '#2f6b35', o: '#f08a3a', O: '#c8571f', n: '#8a5a32', N: '#5a3a1e',
    p: '#eaa7bb', P: '#c06a86', l: '#a9dcf2', L: '#4d8fb8', m: '#b3b3c0', M: '#6b6b78',
    f: '#fff3b0', F: '#ffd25a', v: '#7a5aa8', V: '#4e3678', e: '#3a3a44', q: '#d7f0ff'
  };

  // ---------- 角色字元圖 ----------
  const ART = {
    hero_d: [
      '................',
      '.....kkkkkk.....',
      '....knnnnnnk....',
      '...knnNnnNnnk...',
      '..kNNNNNNNNNNk..',
      '...kssssssssk...',
      '...kskksskksk...',
      '...kssssssssk...',
      '....kssSSssk....',
      '...krrrrrrrrk...',
      '..kbbbrrrrbbbk..',
      '..kbsbbbbbbsbk..',
      '..kkbbbbbbbbkk..',
      '...kbbbkkbbbk...',
      '...kNNk..kNNk...',
      '....kk....kk....'],
    hero_u: [
      '................',
      '.....kkkkkk.....',
      '....knnnnnnk....',
      '...knnnnnnnnk...',
      '..kNNNNNNNNNNk..',
      '...kNNNNNNNNk...',
      '...kNNNNNNNNk...',
      '...kNNNNNNNNk...',
      '....kNNNNNNk....',
      '...krrrrrrrrk...',
      '..kbbbbbbbbbbk..',
      '..kbsbbbbbbsbk..',
      '..kkbbbbbbbbkk..',
      '...kbbbkkbbbk...',
      '...kNNk..kNNk...',
      '....kk....kk....'],
    hero_r: [
      '................',
      '.....kkkkkk.....',
      '....knnnnnnk....',
      '...knnnnnnnnk...',
      '...kNNNNNNNNNNk.',
      '...kNNssssssk...',
      '...kNsssssksk...',
      '...kNssssssssk..',
      '....kssssSSk....',
      '....krrrrrrk....',
      '...kbbbbrrbk....',
      '...kbbbbbbsk....',
      '...kbbbbbbbk....',
      '....kbbbbbk.....',
      '....kNNkNNk.....',
      '.....kk.kk......'],
    lavoisier: [
      '................',
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '..khHhhhhhhHhk..',
      '..khHssssssHhk..',
      '..khHskssksHhk..',
      '..kHHssssssHHk..',
      '..kHkssSSsskHk..',
      '...kkkwwwwkkk...',
      '..kBBbwwwwbBBk..',
      '..kBbbbwwbbbBk..',
      '..ksBbbbbbbBsk..',
      '...kBbbbbbbBk...',
      '...kBBk..kBBk...',
      '....kk....kk....'],
    marie: [
      '.....kkkkkk.....',
      '....kHHHHHHk....',
      '...kHhhhhhhHk...',
      '...kHhhhhhhhHk..',
      '...kHssssssHk...',
      '...kHskssksHk...',
      '...kHssssssHk...',
      '....kssPPssk....',
      '...kkpwwwwpkk...',
      '..kpppwwwwpppk..',
      '..kspppppppppsk.',
      '..kpppPpppPpppk.',
      '.kpppPpppPppppk.',
      '.kppPpppPppppPk.',
      '.kPPPPPPPPPPPPk.',
      '..kkkkkkkkkkkk..'],
    priestley: [
      '................',
      '.....kkkkkk.....',
      '....kmmmmmmk....',
      '...kmmmmmmmmk...',
      '..kmMmmmmmmMmk..',
      '..kmMssssssMmk..',
      '..kmMskssksMmk..',
      '..kMMssssssMMk..',
      '..kMkssSSsskMk..',
      '...kkkwwwwkkk...',
      '..kNNnwwwwnNNk..',
      '..kNnnnwwnnnNk..',
      '..ksNnnnnnnNsk..',
      '...kNnnnnnnNk...',
      '...kNNk..kNNk...',
      '....kk....kk....'],
    flame: [
      '................',
      '................',
      '.......k........',
      '......kok.......',
      '......kOok......',
      '.....kooook.....',
      '....kooffook....',
      '...koofffffok...',
      '...kofkfkffok...',
      '..kooffffffook..',
      '..koffffffffok..',
      '..kooffkkffook..',
      '..kOoofffffoOk..',
      '...kOOooooOOk...',
      '....kkOOOOkk....',
      '......kkkk......'],
    boss: [
      '..k..........k..',
      '..kk...kk...kk..',
      '..krk.krrk.krk..',
      '...krkrorrkrk...',
      '...krrooorrrk...',
      '..krroffforrrk..',
      '.krrofffffforrk.',
      '.kroffFfFfffork.',
      'krofkkFFFkkfffrk',
      'kroffkfFFfkfffrk',
      'krofffffffffffrk',
      'krroffkkkkkfforrk',
      '.krrofkwkwkforrk.',
      '.kRrrooffooorRk.',
      '..kRRrrrrrrRRk..',
      '...kkkkkkkkkk...'],
    elder: [
      '................',
      '.....kkkkkk.....',
      '....kHHHHHHk....',
      '...kHHHHHHHHk...',
      '...kssssssssk...',
      '...kskksskksk...',
      '...kssssssssk...',
      '...khhssssshk...',
      '....khhhhhhk....',
      '...kvvvhhvvvk...',
      '..kvvvvvvvvvvk..',
      '..ksvvvVvvvvsk..',
      '..kkvvvVvvvvkk..',
      '...kvvvVvvvvk...',
      '...kNNk..kNNk...',
      '....kk....kk....']
  };

  const cache = {};
  function fromArt(rows, flip = false) {
    const c = document.createElement('canvas'); c.width = T; c.height = T;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < T; x++) {
        const ch = row[x]; if (!ch || ch === '.') continue;
        const col = PAL[ch]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? T - 1 - x : x, y, 1, 1);
      }
    });
    return c;
  }
  function sprite(name) {
    if (cache[name]) return cache[name];
    if (name === 'hero_l') return (cache[name] = fromArt(ART.hero_r, true));
    if (ART[name]) return (cache[name] = fromArt(ART[name]));
    if (TILE_DRAW[name]) { const c = mk(); TILE_DRAW[name](c.getContext('2d')); return (cache[name] = c); }
    return null;
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = T; c.height = T; return c; };

  // ---------- 固定亂數 ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // ---------- 圖塊（程式繪製） ----------
  const TILE_DRAW = {
    floor(g) { R(g, '#c79a62', 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) { R(g, '#a97a46', 0, y + 3, 16, 1); R(g, '#a97a46', (y * 3) % 16, y, 1, 3); } R(g, '#d6ab74', 2, 1, 3, 1); R(g, '#d6ab74', 9, 9, 3, 1); },
    carpet(g) { R(g, '#8e2b2b', 0, 0, 16, 16); R(g, '#a63a35', 1, 1, 14, 14); for (let i = 2; i < 14; i += 4) { R(g, '#d9a441', i, 7, 2, 2); } },
    wall(g) { R(g, '#cbbd9f', 0, 0, 16, 16); R(g, '#a99a7c', 0, 15, 16, 1); for (let y = 0; y < 15; y += 5) { R(g, '#b4a688', 0, y + 4, 16, 1); const off = (y / 5) % 2 ? 4 : 10; R(g, '#b4a688', off, y, 1, 4); } R(g, '#8a7a5e', 0, 12, 16, 3); },
    window(g) { TILE_DRAW.wall(g); R(g, '#6b4e2e', 3, 1, 10, 11); R(g, '#bfe6f7', 4, 2, 8, 9); R(g, '#e9f8ff', 5, 3, 2, 3); R(g, '#6b4e2e', 7, 2, 1, 9); R(g, '#6b4e2e', 4, 6, 8, 1); },
    shelf(g) { R(g, '#5a3a1e', 0, 0, 16, 16); R(g, '#7b522a', 1, 1, 14, 14); const r = rng(7); for (let row = 0; row < 3; row++) { let x = 2; while (x < 14) { const w = 1 + Math.floor(r() * 2); const cols = ['#c0392b', '#2c4a7c', '#3a7d44', '#d9a441', '#6c3483', '#e8e4dc']; R(g, cols[Math.floor(r() * cols.length)], x, 2 + row * 5, w, 4); x += w + (r() > 0.7 ? 1 : 0); } R(g, '#4e3019', 1, 6 + row * 5, 14, 1); } },
    table(g) { TILE_DRAW.floor(g); R(g, '#5a3a1e', 1, 3, 14, 10); R(g, '#a97a46', 1, 3, 14, 7); R(g, '#c79a62', 2, 4, 12, 2); R(g, '#4e3019', 2, 13, 2, 3); R(g, '#4e3019', 12, 13, 2, 3); },
    dinner(g) { TILE_DRAW.carpet(g); R(g, '#f4f1ea', 0, 3, 16, 10); R(g, '#d8d2c4', 0, 11, 16, 2); R(g, '#e7c55a', 6, 5, 4, 4); R(g, '#fff', 7, 6, 2, 2); },
    furnace(g) { R(g, '#6e3b2a', 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) { R(g, '#8a4a34', 0, y, 16, 3); R(g, '#5a2e20', (y * 5) % 16, y, 1, 3); } R(g, '#2a1a14', 4, 8, 8, 6); R(g, '#f08a3a', 5, 10, 6, 4); R(g, '#ffd25a', 7, 11, 2, 3); },
    crate(g) { TILE_DRAW.floor(g); R(g, '#7b522a', 2, 3, 12, 12); R(g, '#a97a46', 3, 4, 10, 10); R(g, '#7b522a', 3, 8, 10, 1); R(g, '#7b522a', 8, 4, 1, 10); },
    plant(g) { TILE_DRAW.floor(g); R(g, '#8a4a34', 5, 10, 6, 5); R(g, '#2f6b35', 3, 3, 10, 7); R(g, '#4f9a52', 4, 2, 4, 5); R(g, '#4f9a52', 9, 4, 3, 4); },
    grass(g) { R(g, '#6fb35a', 0, 0, 16, 16); const r = rng(3); for (let i = 0; i < 10; i++) R(g, r() > 0.5 ? '#5a9a48' : '#86c56c', Math.floor(r() * 15), Math.floor(r() * 15), 1, 2); },
    path(g) { R(g, '#e3cf9f', 0, 0, 16, 16); const r = rng(11); for (let i = 0; i < 6; i++) R(g, '#cdb582', Math.floor(r() * 13), Math.floor(r() * 13), 3, 2); },
    tree(g) { TILE_DRAW.grass(g); R(g, '#5a3a1e', 7, 10, 3, 6); R(g, '#2f6b35', 2, 1, 12, 10); R(g, '#3f8a45', 3, 2, 6, 5); R(g, '#1f4f25', 4, 9, 9, 2); },
    hedge(g) { R(g, '#2f6b35', 0, 0, 16, 16); R(g, '#3f8a45', 1, 1, 6, 5); R(g, '#3f8a45', 9, 7, 6, 6); R(g, '#1f4f25', 0, 14, 16, 2); },
    water(g) { R(g, '#4d8fb8', 0, 0, 16, 16); R(g, '#7cc0e6', 2, 4, 5, 1); R(g, '#7cc0e6', 9, 10, 5, 1); },
    marble(g) { R(g, '#ecebe6', 0, 0, 16, 16); R(g, '#d5d3cc', 0, 0, 16, 1); R(g, '#d5d3cc', 0, 0, 1, 16); R(g, '#c8c4bb', 8, 8, 8, 8); R(g, '#e1dfd8', 9, 9, 6, 6); },
    column(g) { TILE_DRAW.marble(g); R(g, '#bdb8ad', 3, 0, 10, 16); R(g, '#f7f6f2', 4, 0, 2, 16); R(g, '#d9d6ce', 8, 0, 1, 16); R(g, '#a39d90', 2, 0, 12, 2); R(g, '#a39d90', 2, 14, 12, 2); },
    banner(g) { R(g, '#3b3361', 0, 0, 16, 16); R(g, '#2c264a', 0, 12, 16, 4); R(g, '#9c2b2b', 4, 1, 8, 11); R(g, '#e7c55a', 7, 4, 2, 2); R(g, '#e7c55a', 5, 8, 6, 1); },
    darkwall(g) { R(g, '#3b3361', 0, 0, 16, 16); R(g, '#2c264a', 0, 12, 16, 4); R(g, '#4a4175', 2, 2, 4, 3); R(g, '#4a4175', 10, 6, 4, 3); },
    door(g) { R(g, '#3a2414', 0, 0, 16, 16); R(g, '#5a3a1e', 2, 2, 12, 14); R(g, '#7b522a', 3, 3, 4, 13); R(g, '#7b522a', 9, 3, 4, 13); R(g, '#e7c55a', 11, 9, 1, 2); },
    mat(g) { TILE_DRAW.floor(g); R(g, '#7d1f1c', 2, 4, 12, 8); R(g, '#c0392b', 3, 5, 10, 6); },
    gate(g) { TILE_DRAW.path(g); R(g, '#3a3a44', 0, 0, 16, 2); R(g, '#3a3a44', 0, 0, 2, 16); R(g, '#3a3a44', 14, 0, 2, 16); },
    chair(g) { TILE_DRAW.carpet(g); R(g, '#5a3a1e', 4, 2, 8, 12); R(g, '#9c2b2b', 5, 7, 6, 4); R(g, '#7b522a', 5, 3, 6, 3); },
    void(g) { R(g, '#120f1f', 0, 0, 16, 16); }
  };

  // ---------- 物件（站在地板上的東西，透明背景） ----------
  const OBJ = {
    chest(g) { R(g, '#5a3a1e', 2, 5, 12, 10); R(g, '#a97a46', 3, 6, 10, 8); R(g, '#7b522a', 2, 9, 12, 1); R(g, '#e7c55a', 7, 8, 2, 3); R(g, '#1b1b2a', 2, 15, 12, 1); },
    chest_open(g) { R(g, '#5a3a1e', 2, 8, 12, 7); R(g, '#a97a46', 3, 9, 10, 5); R(g, '#3a2414', 3, 6, 10, 3); R(g, '#7b522a', 2, 3, 12, 3); },
    page(g) { R(g, '#1b1b2a', 4, 3, 9, 11); R(g, '#f6eedb', 5, 4, 7, 9); R(g, '#b9a77f', 6, 6, 5, 1); R(g, '#b9a77f', 6, 8, 4, 1); R(g, '#b9a77f', 6, 10, 5, 1); },
    balance(g) { R(g, '#6b6b78', 7, 3, 2, 10); R(g, '#b3b3c0', 2, 4, 12, 1); R(g, '#e7c55a', 1, 7, 4, 2); R(g, '#e7c55a', 11, 7, 4, 2); R(g, '#6b6b78', 2, 5, 1, 2); R(g, '#6b6b78', 13, 5, 1, 2); R(g, '#5a3a1e', 4, 13, 8, 2); },
    retort(g) { R(g, '#4d8fb8', 3, 7, 7, 7); R(g, '#a9dcf2', 4, 8, 5, 5); R(g, '#c0392b', 4, 11, 5, 2); R(g, '#4d8fb8', 9, 6, 5, 2); R(g, '#4d8fb8', 13, 6, 2, 6); R(g, '#3a3a44', 2, 14, 9, 1); },
    jar(g) { R(g, '#4d8fb8', 4, 3, 8, 11); R(g, '#d7f0ff', 5, 4, 6, 10); R(g, '#ffffff', 6, 5, 1, 6); R(g, '#4d8fb8', 7, 1, 2, 2); R(g, '#3a3a44', 3, 14, 10, 1); },
    lens(g) { R(g, '#5a3a1e', 2, 12, 12, 2); R(g, '#3a3a44', 3, 14, 2, 2); R(g, '#3a3a44', 11, 14, 2, 2); R(g, '#7b522a', 7, 8, 2, 4); R(g, '#e7c55a', 2, 0, 12, 9); R(g, '#bfe6f7', 3, 1, 10, 7); R(g, '#ffffff', 5, 2, 3, 2); },
    candle(g) { R(g, '#f4f1ea', 6, 7, 4, 7); R(g, '#e7c55a', 5, 14, 6, 1); R(g, '#f08a3a', 7, 3, 2, 4); R(g, '#fff3b0', 7, 4, 1, 2); },
    portal(g) { R(g, '#4e3678', 2, 1, 12, 14); R(g, '#7a5aa8', 3, 2, 10, 12); R(g, '#b9a4e0', 5, 4, 6, 8); R(g, '#ffffff', 7, 6, 2, 4); },
    lectern(g) { R(g, '#5a3a1e', 4, 6, 8, 9); R(g, '#a97a46', 3, 4, 10, 3); R(g, '#f6eedb', 4, 2, 8, 3); }
  };
  function obj(name) {
    const key = 'obj_' + name;
    if (cache[key]) return cache[key];
    if (!OBJ[name]) return null;
    const c = mk(); OBJ[name](c.getContext('2d')); return (cache[key] = c);
  }

  // 把精靈圖畫到 DOM 用的小畫布（對話頭像、背包）
  function toCanvas(name, size = 48, isObj = false) {
    const src = isObj ? obj(name) : sprite(name);
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (src) g.drawImage(src, 0, 0, size, size);
    return c;
  }

  return { T, PAL, sprite, obj, toCanvas };
})();
