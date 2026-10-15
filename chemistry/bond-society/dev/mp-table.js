// 依全班人數（3～50）產生勝利條件門檻對照表：每個勢力用一個「難度係數 s」等比例調整自己的條件，
// 二分搜尋到「8 回合內自己能達成」約 T（高二高三版 25%、高一版 33%）
const { run } = require('./sim.js'); const { G11, G10 } = require('./mp-presets.js');
const lvl = process.argv[2], from = +process.argv[3], to = +process.argv[4];
const KN = {
  co: (s, g11) => ({ CO_N: Math.max(1, Math.round((g11 ? 7 : 8) * s)), CO_F: Math.round(40 + 30 * Math.min(1.3, s)), CO_TERR: Math.round((30 + 5 * Math.min(1.4, s)) * 10) / 10 }),
  io: (s, g11) => ({ IO_N: Math.max(1, Math.round((g11 ? 27 : 41) * s)) }),
  me: (s, g11) => ({ ME_X: Math.max(10, Math.round((g11 ? 670 : 880) * s / 10) * 10), ME_K: Math.max(2, Math.min(8, Math.round(8 * s))) }),
  hb: s => ({ HB_N: Math.max(1, Math.round(5 * s)), HB_F: Math.round(40 + 20 * Math.min(1.5, s)) }),
  vw: s => ({ VW_X: Math.max(20, Math.round(1800 * s / 10) * 10), VW_R: Math.round(100 + 15 * Math.min(1.4, s)) })
};
const out = {};
for (let N = from; N <= to; N++) {
  const B = lvl === 'g11' ? G11 : G10;
  const probe = run({ ...B, N, games: 1 });
  const g11 = lvl === 'g11' && Object.keys(probe.A.size).length === 5;
  const T = g11 ? 0.25 : 0.33, facs = g11 ? ['co', 'io', 'me', 'hb', 'vw'] : ['co', 'io', 'me'];
  const br = Object.fromEntries(facs.map(f => [f, [0.05, 3]]));
  const S = () => Object.fromEntries(facs.map(f => [f, (br[f][0] + br[f][1]) / 2]));
  const params = s => Object.assign({}, ...facs.map(f => KN[f](s[f], g11)));
  const base = { ...B, level: g11 ? 'g11' : 'g10', N };
  for (let it = 0; it < 11; it++) {
    const s = S(), A = run({ ...base, ...params(s), games: 400, seed: it + 1, noEnd: true }).A;
    facs.forEach(f => { const d = A.done[f], r = d.filter(x => x <= 8).length / d.length; if (r > T) br[f][0] = s[f]; else br[f][1] = s[f]; });
  }
  if (process.env.DBG) console.error('st1', JSON.stringify(S()));
  // 第二階段：用完整對局的勝率，把各勢力的勝率拉平
  let s = S(), best = null;
  for (let it = 0; it < 10; it++) {
    const A = run({ ...base, ...params(s), games: 800, seed: 50 + it }).A, n = A.games;
    const sh = Object.fromEntries(facs.map(f => [f, (A.win[f] || 0) / n])), mean = facs.reduce((a, f) => a + sh[f], 0) / facs.length;
    const dev = Math.max(...facs.map(f => Math.abs(sh[f] - mean))); if (!best || dev < best.dev) best = { dev, s: { ...s } };
    if (process.env.DBG) console.error('st2', it, JSON.stringify(Object.fromEntries(facs.map(f => [f, s[f].toFixed(2)]))), JSON.stringify(sh));
    const g0 = facs.reduce((a, f) => a + Math.log(s[f]), 0);
    facs.forEach(f => { s[f] *= Math.pow((sh[f] + 0.03) / (mean + 0.03), 0.12 * (1 - it / 12)); });
    const g1 = facs.reduce((a, f) => a + Math.log(s[f]), 0), adj = Math.exp((g0 - g1) / facs.length);
    facs.forEach(f => { s[f] = Math.max(0.05, Math.min(3, s[f] * adj)); });
  }
  s = best.s;
  const P = params(s), R = run({ ...base, ...P, games: 1200, seed: 99 }), A = R.A;
  const med = (v, st = 1) => { if (!v || !v.length) return null; const x = v.slice().sort((a, b) => a - b); return Math.round(x[x.length >> 1] / st) * st; };
  const SEC = A.secV ? { haul: med(A.secV.haul), split: med(A.secV.split, 5), slack: med(A.secV.slack, 5), drain: med(A.secV.drain, 10), block: med(A.secV.block, 5), weaken: med(A.secV.weaken) } : null;
  const win = Object.fromEntries(Object.entries(A.win).map(([k, v]) => [k, Math.round(v / A.games * 100)]));
  out[N] = { level: g11 ? 'g11' : 'g10', size: A.size, s: Object.fromEntries(facs.map(f => [f, +s[f].toFixed(2)])), ...P, SEC, win, top: A.topN ? Math.round(A.top / A.topN * 100) : null };
  console.error(lvl, N, JSON.stringify(out[N]));
}
require('fs').writeFileSync(`table-${lvl}-${from}-${to}.json`, JSON.stringify(out));
