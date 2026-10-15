/* 隱秘的鍵結社 連線版：畫六角格地圖（老師控制台、學生頁共用） */
const MPMAP = (() => {
  const cache = {};
  function draw(svg, { seed, facs, owner, rel }, flash = []) {
    if (!svg || !facs || !facs.length || !owner) return;
    const key = seed + facs.join(''), M = cache[key] || (cache[key] = WORLD.makeMap(seed, facs)), F = WORLD.FACTIONS, W = WORLD;
    svg.setAttribute('viewBox', `0 0 ${M.width.toFixed(0)} ${M.height.toFixed(0)}`);
    const colorOf = o => (o ? (o === 'mine' ? '#b9a98c' : F[o].light) : null);
    let h = `<rect width="100%" height="100%" fill="#bcd6df"/>`;
    M.cells.forEach(c => { if (c.land) h += `<polygon class="hex ${flash.includes(c.i) ? 'flash' : ''}" points="${W.hexPath(c.x, c.y)}" fill="${colorOf(owner[c.i])}"/>`; });
    M.cells.forEach(c => {
      if (!c.land) return; const o = owner[c.i];
      for (let k = 0; k < 6; k++) {
        const ang = 60 * k * Math.PI / 180, nx = c.x + Math.cos(ang) * M.S * 1.73, ny = c.y + Math.sin(ang) * M.S * 1.73;
        const nb = c.nb.map(j => M.cells[j]).find(d => Math.hypot(d.x - nx, d.y - ny) < M.S * 0.5), no = nb && nb.land ? owner[nb.i] : 'sea';
        if (no === o) continue;
        const a1 = (60 * k - 30) * Math.PI / 180, a2 = (60 * k + 30) * Math.PI / 180;
        h += `<line x1="${(c.x + M.S * Math.cos(a1)).toFixed(1)}" y1="${(c.y + M.S * Math.sin(a1)).toFixed(1)}" x2="${(c.x + M.S * Math.cos(a2)).toFixed(1)}" y2="${(c.y + M.S * Math.sin(a2)).toFixed(1)}" stroke="${no === 'sea' || o === 'mine' ? '#5a4a2e' : F[o].color}" stroke-width="${no === 'sea' ? 2.2 : 1.8}" stroke-linecap="round"/>`;
      }
    });
    M.cells.forEach(c => {
      if (!c.land) return;
      if (c.terrain === 'mount') h += `<path d="M${c.x - 8} ${c.y + 6} L${c.x - 2} ${c.y - 6} L${c.x + 4} ${c.y + 6}Z M${c.x - 1} ${c.y + 6} L${c.x + 4} ${c.y - 2} L${c.x + 9} ${c.y + 6}Z" fill="#7a6a52" opacity=".8"/>`;
      else if (c.terrain === 'forest') h += `<circle cx="${c.x - 4}" cy="${c.y + 2}" r="3.2" fill="#4c7a4a" opacity=".55"/><circle cx="${c.x + 3}" cy="${c.y - 2}" r="3.6" fill="#4c7a4a" opacity=".55"/>`;
    });
    facs.forEach(f => {
      let cap = M.cells[M.capitals[f]];
      if (owner[cap.i] !== f) { const own = M.cells.filter(c => owner[c.i] === f); if (!own.length) return; cap = own[0]; }
      const w = F[f].name.length > 2 ? 86 : 76, r = rel && rel[f] != null ? Math.round(rel[f]) : '';
      h += `<g><rect x="${cap.x - w / 2}" y="${cap.y - 9}" width="${w}" height="17" rx="8" fill="${F[f].color}" stroke="#fff" stroke-width="1.2"/><text class="cap-tag" x="${cap.x}" y="${cap.y + 3.5}" text-anchor="middle" fill="#fff">🏰${F[f].name} ${r}%</text></g>`;
    });
    svg.innerHTML = h;
  }
  const territory = (owner, f) => Object.values(owner || {}).filter(o => o === f).length;
  return { draw, territory };
})();
