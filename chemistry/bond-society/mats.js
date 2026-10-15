/* =========================================================
   隱秘的鍵結社 —— 📚 材料圖鑑＋🏗️ 工程應用題庫（2026-10-15 改版）
   ---------------------------------------------------------
   MATS：材料性質表（數值取常見教科書／手冊的近似值，遊戲用，取整）
     cls  metal 金屬｜ionic 離子化合物｜network 共價網狀｜molecular 分子物質
     st   室溫狀態 s/l/g
     mp   熔點 °C（昇華、分解的物質放「開始變化的溫度」，另寫 mpT 說明）
     bp   沸點 °C（沒有就 null）
     sub  一大氣壓下會直接昇華
     sc   固態導電 y/n/semi（半導體）｜lc 熔融（液態）導電 y/n/null（不適用）
     aq   水溶液導電 y/n/weak/null（不溶或不適用）
     sol  在水中 insol 不溶｜slight 微溶｜sol 易溶｜mix 互溶｜react 會和水反應
     hard 莫氏硬度（null＝不常用）
     mech duct 可延展（能拉成線、敲成薄片）｜brittle 脆｜soft 軟（可塑形）｜flaky 層狀易剝落｜liquid｜gas
     dens 密度 g/cm³｜cond 導電度（銅＝100，只列金屬與石墨）
     price 1 便宜｜2 中等｜3 貴｜4 非常貴
     air  在空氣中 stable 穩定｜slow 表面慢慢氧化｜rust 會生鏽｜fast 很快就氧化（要泡在油裡）
     clear 透明
     s    一句結構說明（鍵結）
   ENG：工程題
     pick  多條件選材：need 需求、cons 條件、cands 候選（4 種）、r 原因追問 [題目, 正解, 錯×2]
     fail  失敗分析：story 情境、q 問題、ok 正解、no 錯×3、r 原因追問
     ※ pick 題用圖鑑資料自動檢查「只有一個候選全部符合」
   ========================================================= */
const MATS = (() => {
  const M = [
    // ---------- 金屬 ----------
    { id: 'Na', n: '鈉', f: 'Na', cls: 'metal', st: 's', mp: 98, bp: 883, sc: 'y', lc: 'y', aq: null, sol: 'react', hard: 0.5, mech: 'soft', dens: 0.97, cond: 36, price: 2, air: 'fast', s: '金屬鍵；只有 1 個價電子，金屬鍵弱，軟到能用刀切', note: '遇水劇烈反應產生氫氣，要泡在煤油裡保存' },
    { id: 'Mg', n: '鎂', f: 'Mg', cls: 'metal', st: 's', mp: 650, bp: 1091, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 2.5, mech: 'duct', dens: 1.74, cond: 38, price: 2, air: 'slow', s: '金屬鍵；2 個價電子', note: '點燃會發出強烈白光' },
    { id: 'Al', n: '鋁', f: 'Al', cls: 'metal', st: 's', mp: 660, bp: 2470, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 3, mech: 'duct', dens: 2.70, cond: 61, price: 1, air: 'slow', s: '金屬鍵；3 個價電子', note: '表面很快長出一層緻密的氧化鋁保護膜' },
    { id: 'Fe', n: '鐵', f: 'Fe', cls: 'metal', st: 's', mp: 1538, bp: 2862, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 4, mech: 'duct', dens: 7.87, cond: 17, price: 1, air: 'rust', s: '金屬鍵', note: '在潮濕空氣中會生鏽' },
    { id: 'Cu', n: '銅', f: 'Cu', cls: 'metal', st: 's', mp: 1085, bp: 2562, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 3, mech: 'duct', dens: 8.96, cond: 100, price: 2, air: 'slow', s: '金屬鍵', note: '久了表面會長出綠色的銅綠' },
    { id: 'Zn', n: '鋅', f: 'Zn', cls: 'metal', st: 's', mp: 420, bp: 907, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 2.5, mech: 'duct', dens: 7.14, cond: 28, price: 2, air: 'slow', s: '金屬鍵', note: '常鍍在鐵皮上防鏽（白鐵皮）' },
    { id: 'Ag', n: '銀', f: 'Ag', cls: 'metal', st: 's', mp: 962, bp: 2162, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 2.5, mech: 'duct', dens: 10.49, cond: 106, price: 4, air: 'slow', s: '金屬鍵', note: '導電度是所有金屬中最好的；遇到含硫的物質會變黑' },
    { id: 'Au', n: '金', f: 'Au', cls: 'metal', st: 's', mp: 1064, bp: 2856, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 2.5, mech: 'duct', dens: 19.3, cond: 69, price: 4, air: 'stable', s: '金屬鍵', note: '延展性最好的金屬，可以敲成比紙還薄的金箔；幾乎不會氧化' },
    { id: 'W', n: '鎢', f: 'W', cls: 'metal', st: 's', mp: 3422, bp: 5555, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 7.5, mech: 'duct', dens: 19.3, cond: 30, price: 3, air: 'stable', s: '金屬鍵；金屬鍵非常強', note: '熔點最高的金屬，可以拉成燈絲' },
    { id: 'Pb', n: '鉛', f: 'Pb', cls: 'metal', st: 's', mp: 327, bp: 1749, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: 1.5, mech: 'duct', dens: 11.3, cond: 8, price: 1, air: 'slow', s: '金屬鍵', note: '很軟、很重；有毒' },
    { id: 'Hg', n: '汞（水銀）', f: 'Hg', cls: 'metal', st: 'l', mp: -39, bp: 357, sc: 'y', lc: 'y', aq: null, sol: 'insol', hard: null, mech: 'liquid', dens: 13.5, cond: 2, price: 3, air: 'stable', s: '金屬鍵；金屬鍵弱，室溫是液體', note: '唯一在室溫是液體的金屬，液態也能導電；蒸氣有毒' },
    // ---------- 離子化合物 ----------
    { id: 'NaCl', n: '氯化鈉（食鹽）', f: 'NaCl', cls: 'ionic', st: 's', mp: 801, bp: 1465, sc: 'n', lc: 'y', aq: 'y', sol: 'sol', hard: 2.5, mech: 'brittle', dens: 2.16, price: 1, air: 'stable', clear: true, s: '離子鍵；Na⁺ 和 Cl⁻ 排成晶格', note: '固體不導電，熔化或溶於水才導電' },
    { id: 'CaCl2', n: '氯化鈣', f: 'CaCl₂', cls: 'ionic', st: 's', mp: 772, bp: 1935, sc: 'n', lc: 'y', aq: 'y', sol: 'sol', hard: null, mech: 'brittle', dens: 2.15, price: 1, air: 'stable', s: '離子鍵', note: '很會吸水，常用作乾燥劑與融雪劑' },
    { id: 'MgO', n: '氧化鎂', f: 'MgO', cls: 'ionic', st: 's', mp: 2852, bp: 3600, sc: 'n', lc: 'y', aq: null, sol: 'insol', hard: 5.5, mech: 'brittle', dens: 3.58, price: 2, air: 'stable', s: '離子鍵；Mg²⁺、O²⁻ 帶 2 個電荷而且離子小，吸引力很強', note: '耐火材料、電熱管裡的絕緣填充粉' },
    { id: 'CaO', n: '氧化鈣（生石灰）', f: 'CaO', cls: 'ionic', st: 's', mp: 2613, bp: 2850, sc: 'n', lc: 'y', aq: 'y', sol: 'react', hard: 3.5, mech: 'brittle', dens: 3.34, price: 1, air: 'stable', s: '離子鍵', note: '遇水反應放出大量熱，變成氫氧化鈣（食品乾燥劑）' },
    { id: 'Al2O3', n: '氧化鋁（剛玉）', f: 'Al₂O₃', cls: 'ionic', st: 's', mp: 2072, bp: 2977, sc: 'n', lc: 'y', aq: null, sol: 'insol', hard: 9, mech: 'brittle', dens: 3.95, price: 2, air: 'stable', s: '離子鍵；Al³⁺ 和 O²⁻ 電荷大、離子小', note: '紅寶石、藍寶石的主成分；砂紙上的研磨顆粒' },
    { id: 'CaCO3', n: '碳酸鈣（大理石）', f: 'CaCO₃', cls: 'ionic', st: 's', mp: 825, mpT: '約 825°C（分解）', bp: null, sc: 'n', lc: null, aq: null, sol: 'insol', hard: 3, mech: 'brittle', dens: 2.71, price: 1, air: 'stable', s: '離子鍵；Ca²⁺ 和多原子離子 CO₃²⁻', note: '加熱會分解成 CaO 和 CO₂；遇酸冒泡' },
    // ---------- 共價網狀 ----------
    { id: 'dia', n: '鑽石', f: 'C', cls: 'network', st: 's', mp: 3550, mpT: '3500°C 以上', bp: null, sc: 'n', lc: null, aq: null, sol: 'insol', hard: 10, mech: 'brittle', dens: 3.51, price: 4, air: 'stable', clear: true, s: '共價網狀；每個 C 和 4 個 C 形成共價鍵，連成立體網', note: '最硬的天然物質；不導電' },
    { id: 'gra', n: '石墨', f: 'C', cls: 'network', st: 's', mp: 3650, mpT: '約 3650°C（昇華）', bp: null, sub: true, sc: 'y', lc: null, aq: null, sol: 'insol', hard: 1.5, mech: 'flaky', dens: 2.2, cond: 1, price: 1, air: 'stable', s: '共價網狀（層狀）；每個 C 和 3 個 C 鍵結，剩下的電子能在層內移動；層與層之間只有微弱作用力', note: '非金屬卻能導電；軟、滑，可做鉛筆芯與潤滑劑，但拉不成線' },
    { id: 'SiO2', n: '二氧化矽（石英）', f: 'SiO₂', cls: 'network', st: 's', mp: 1713, bp: 2230, sc: 'n', lc: 'n', aq: null, sol: 'insol', hard: 7, mech: 'brittle', dens: 2.65, price: 1, air: 'stable', clear: true, s: '共價網狀；Si 和 O 以共價鍵連成立體網', note: '玻璃、光纖的原料' },
    { id: 'Si', n: '矽', f: 'Si', cls: 'network', st: 's', mp: 1414, bp: 3265, sc: 'semi', lc: 'y', aq: null, sol: 'insol', hard: 6.5, mech: 'brittle', dens: 2.33, price: 2, air: 'stable', s: '共價網狀（和鑽石同一種排列）', note: '半導體：導電性介於導體和絕緣體之間，晶片的材料' },
    // ---------- 分子物質 ----------
    { id: 'H2O', n: '水（冰）', f: 'H₂O', cls: 'molecular', st: 'l', mp: 0, bp: 100, sc: 'n', lc: 'n', aq: null, sol: 'mix', hard: 1.5, mech: 'liquid', dens: 1.00, price: 1, air: 'stable', clear: true, s: '分子物質；分子之間有氫鍵', note: '純水幾乎不導電' },
    { id: 'EtOH', n: '乙醇（酒精）', f: 'C₂H₅OH', cls: 'molecular', st: 'l', mp: -114, bp: 78, sc: 'n', lc: 'n', aq: 'n', sol: 'mix', hard: null, mech: 'liquid', dens: 0.79, price: 1, air: 'stable', clear: true, s: '分子物質；每個分子只有 1 個 –OH 能形成氫鍵', note: '易燃；常染色後用在溫度計裡' },
    { id: 'sug', n: '蔗糖', f: 'C₁₂H₂₂O₁₁', cls: 'molecular', st: 's', mp: 186, mpT: '約 186°C（分解焦化）', bp: null, sc: 'n', lc: null, aq: 'n', sol: 'sol', hard: null, mech: 'brittle', dens: 1.59, price: 1, air: 'stable', s: '分子物質；分子之間有很多氫鍵', note: '易溶於水，但溶解後仍是分子，糖水不導電' },
    { id: 'wax', n: '石蠟', f: 'CₙH₂ₙ₊₂', cls: 'molecular', st: 's', mp: 55, mpT: '約 50～60°C', bp: null, sc: 'n', lc: 'n', aq: null, sol: 'insol', hard: 1, mech: 'soft', dens: 0.90, price: 1, air: 'stable', s: '分子物質；很長的碳氫分子，分子間只有凡得瓦力', note: '蠟燭的原料，低溫就能熔化塑形' },
    { id: 'I2', n: '碘', f: 'I₂', cls: 'molecular', st: 's', mp: 114, bp: 184, sub: true, sc: 'n', lc: 'n', aq: 'n', sol: 'slight', hard: null, mech: 'brittle', dens: 4.93, price: 3, air: 'stable', s: '分子物質；I₂ 分子之間只有凡得瓦力', note: '紫黑色晶體，稍微加熱就昇華成紫色氣體' },
    { id: 'S', n: '硫磺', f: 'S₈', cls: 'molecular', st: 's', mp: 115, bp: 445, sc: 'n', lc: 'n', aq: null, sol: 'insol', hard: 2, mech: 'brittle', dens: 2.07, price: 1, air: 'stable', s: '分子物質；S₈ 環狀分子之間只有凡得瓦力', note: '黃色、易碎，燃燒產生有刺激味的 SO₂' },
    { id: 'CO2', n: '乾冰（固態二氧化碳）', f: 'CO₂', cls: 'molecular', st: 'g', mp: -78.5, mpT: '−78.5°C（昇華）', bp: null, sub: true, sc: 'n', lc: null, aq: 'weak', sol: 'slight', hard: null, mech: 'brittle', dens: 1.56, price: 1, air: 'stable', s: '分子物質；非極性小分子，分子間只有微弱的凡得瓦力', note: '室溫下直接昇華，體積變成約 800 倍的氣體' },
    { id: 'Ar', n: '氬', f: 'Ar', cls: 'molecular', st: 'g', mp: -189, bp: -186, sc: 'n', lc: 'n', aq: null, sol: 'slight', hard: null, mech: 'gas', dens: 0.0018, price: 1, air: 'stable', s: '單原子分子（惰性氣體）；原子之間只有凡得瓦力', note: '化學性質非常穩定，燈泡裡用來保護燈絲' }
  ];
  const BY = Object.fromEntries(M.map(m => [m.id, m]));

  const CLS = { metal: '金屬', ionic: '離子化合物', network: '共價網狀固體', molecular: '分子物質' };
  const ST = { s: '固體', l: '液體', g: '氣體' };
  const SOL = { insol: '不溶', slight: '微溶', sol: '易溶', mix: '互溶', react: '會和水反應' };
  const MECH = { duct: '可延展（能拉成線）', brittle: '脆、易碎', soft: '軟、可塑形', flaky: '層狀易剝落（拉不成線）', liquid: '液體', gas: '氣體' };
  const MECH_S = { duct: '可延展', brittle: '脆', soft: '軟', flaky: '層狀易剝落', liquid: '液體', gas: '氣體' };
  const PRICE = ['', '便宜', '中等', '貴', '非常貴'];
  const AIR = { stable: '穩定', slow: '表面慢慢氧化', rust: '會生鏽', fast: '很快就氧化' };
  const YN = { y: '✔ 導電', n: '✘ 不導電', semi: '△ 半導體', weak: '△ 微弱', null: '—' };
  const deg = v => v == null ? '—' : String(v).replace('-', '−') + '°C';
  const mpTxt = m => m.mpT || deg(m.mp);

  /* ---------- 條件 ---------- */
  const isWater = m => m.sol === 'insol' || m.sol === 'slight';
  const C = {
    sc: (m, v) => v ? m.sc === 'y' : m.sc === 'n',
    lc: m => m.lc === 'y',
    aq: m => m.aq === 'y',
    mpGt: (m, v) => m.mp > v,
    mpLt: (m, v) => m.mp < v,
    mpIn: (m, a, b) => m.mp >= a && m.mp <= b,
    bpGt: (m, v) => m.bp != null && m.bp > v,
    st: (m, v) => m.st === v,
    water: isWater,
    sol: m => m.sol === 'sol' || m.sol === 'mix',
    duct: m => m.mech === 'duct',
    hardGe: (m, v) => m.hard != null && m.hard >= v,
    hardLe: (m, v) => m.hard != null && m.hard <= v,
    densLt: (m, v) => m.dens < v,
    condGe: (m, v) => (m.cond || 0) >= v,
    priceLe: (m, v) => m.price <= v,
    stable: m => m.air === 'stable',
    subLow: m => !!m.sub && m.mp < 0,
    clear: m => !!m.clear
  };
  const TXT = {
    sc: v => v ? '固態就能導電' : '固態不能導電（絕緣）', lc: () => '熔化後能導電', aq: () => '溶在水裡能導電',
    mpGt: v => `熔點（或開始變化的溫度）高於 ${deg(v)}`, mpLt: v => `熔點低於 ${deg(v)}`, mpIn: (a, b) => `熔點在 ${deg(a)}～${deg(b)} 之間`,
    bpGt: v => `沸點高於 ${deg(v)}`, st: v => `室溫下是${ST[v]}`, water: () => '受潮或碰到水不會溶解、不會反應', sol: () => '易溶於水',
    duct: () => '能拉成細線（有延展性）', hardGe: v => `莫氏硬度 ≥ ${v}`, hardLe: v => `莫氏硬度 ≤ ${v}`, densLt: v => `密度小於 ${v} g/cm³`,
    condGe: v => `導電度 ≥ ${v}（銅＝100）`, priceLe: v => v === 1 ? '價格便宜' : `價格中等或更便宜`, stable: () => '在空氣中不會氧化、不會生鏽',
    subLow: () => '在 0°C 以下就直接昇華（不經過液態）', clear: () => '透明'
  };
  const VAL = {
    sc: m => YN[m.sc], lc: m => YN[m.lc], aq: m => YN[m.aq] + (m.aq == null ? `（${SOL[m.sol]}）` : ''),
    mpGt: mpTxt, mpLt: mpTxt, mpIn: mpTxt, bpGt: m => deg(m.bp), st: m => ST[m.st], water: m => SOL[m.sol], sol: m => SOL[m.sol],
    duct: m => MECH[m.mech], hardGe: m => m.hard == null ? '—' : m.hard, hardLe: m => m.hard == null ? '—' : m.hard, densLt: m => m.dens + ' g/cm³',
    condGe: m => m.cond ? m.cond : '幾乎不導電', priceLe: m => PRICE[m.price], stable: m => AIR[m.air], subLow: m => m.sub ? `會昇華（熔點／昇華點 ${mpTxt(m)}）` : '不會直接昇華', clear: m => m.clear ? '透明' : '不透明'
  };
  const ok = (m, c) => C[c[0]](m, c[1], c[2]);
  const conTxt = c => TXT[c[0]](c[1], c[2]);
  const whyNot = (m, cons) => { const c = cons.find(x => !ok(m, x)); return c ? `${m.n}：不符合「${conTxt(c)}」（圖鑑：${VAL[c[0]](m)}）` : ''; };

  /* ---------- 🏗️ 工程題 ---------- */
  const PICK = [
    { id: 'p1', need: '工廠要把電極插進 900°C 的熔融食鹽裡通電電解', cons: [['sc', true], ['mpGt', 900]], cands: ['Al', 'NaCl', 'gra', 'dia'],
      r: ['石墨和鑽石都是碳，為什麼只有石墨能導電？', '石墨的每個 C 只和 3 個 C 形成共價鍵，剩下的電子可以在層內自由移動', ['石墨裡有可以自由移動的離子', '石墨的碳原子之間是金屬鍵']] },
    { id: 'p2', need: '要架一條跨越山谷的高壓電線：越輕越好，鐵塔負擔才小', cons: [['duct'], ['densLt', 5], ['condGe', 50], ['priceLe', 2]], cands: ['Ag', 'Cu', 'Al', 'gra'],
      r: ['金屬為什麼能拉成細長的電線而不會斷？', '金屬原子層滑動後，自由電子仍包圍著陽離子，金屬鍵不會被破壞', ['金屬原子之間的共價鍵可以彎曲', '金屬由分子組成，分子之間可以滑動']] },
    { id: 'p3', need: '電熱水壺的發熱管裡，要用一種粉末包住發熱線', cons: [['sc', false], ['mpGt', 1000], ['water']], cands: ['MgO', 'NaCl', 'sug', 'Fe'],
      r: ['MgO 和 NaCl 都是離子化合物，為什麼 MgO 的熔點高這麼多？', 'Mg²⁺、O²⁻ 帶的電荷比 Na⁺、Cl⁻ 多，離子也比較小，離子之間吸引力強得多', ['MgO 的分子量比較大，凡得瓦力比較強', 'MgO 是共價網狀固體，NaCl 是分子物質']] },
    { id: 'p4', need: '要做一把能在玻璃上刻出刮痕的刀頭（玻璃的莫氏硬度約 5.5，刀頭必須比石英還硬）', cons: [['hardGe', 8]], cands: ['dia', 'SiO2', 'Fe', 'gra'],
      r: ['鑽石為什麼是最硬的天然物質？', '每個 C 以共價鍵和 4 個 C 連成立體網狀，要刮出痕跡就得打斷大量共價鍵', ['鑽石的分子之間有很強的凡得瓦力', '鑽石裡有電子海把原子固定住']] },
    { id: 'p5', need: '白熾燈泡的燈絲：通電後會熱到 2500°C 以上發光', cons: [['sc', true], ['mpGt', 2500], ['duct']], cands: ['W', 'Cu', 'gra', 'Al2O3'],
      r: ['同樣是金屬，鎢的熔點（3422°C）為什麼比銅（1085°C）高很多？', '鎢的金屬鍵非常強，要讓原子離開固定位置需要很多能量', ['鎢是共價網狀固體', '鎢的原子之間有氫鍵']] },
    { id: 'p6', need: '要做一支能量 −30°C 到 300°C 的液體溫度計（液柱要一直保持液態）', cons: [['st', 'l'], ['mpLt', -30], ['bpGt', 300]], cands: ['Hg', 'EtOH', 'H2O', 'Na'],
      r: ['為什麼酒精溫度計不能拿來量 100°C 的沸水？', '乙醇分子之間的作用力比水弱，沸點只有 78°C，在沸水裡會先沸騰', ['乙醇在高溫下會導電', '乙醇和水會發生化學反應']] },
    { id: 'p7', need: '要做一條保險絲：電流太大、溫度升到 400°C 前就要先熔斷', cons: [['sc', true], ['st', 's'], ['mpLt', 400], ['water']], cands: ['Pb', 'Na', 'Hg', 'Cu'],
      r: ['電流太大時，保險絲為什麼會先熔斷？', '電流通過會發熱，鉛的金屬鍵較弱、熔點低，溫度一高就先熔化，電路就斷了', ['鉛遇到大電流會變成離子化合物', '鉛的共價鍵被電流打斷']] },
    { id: 'p8', need: '要做耐高溫、透明又便宜的實驗室玻璃器材（還要能碰水）', cons: [['clear'], ['mpGt', 1000], ['water'], ['priceLe', 2]], cands: ['SiO2', 'dia', 'NaCl', 'H2O'],
      r: ['二氧化矽的熔點為什麼這麼高？', 'Si 和 O 以共價鍵連成立體網狀，熔化時要打斷大量共價鍵', ['SiO₂ 分子之間有氫鍵', 'SiO₂ 是離子化合物，離子鍵很強']] },
    { id: 'p9', need: '舞台要做「白色煙霧」：一種固體，0°C 以下就直接變成氣體，不能留下液體', cons: [['subLow']], cands: ['CO2', 'I2', 'gra', 'H2O'],
      r: ['乾冰為什麼這麼容易昇華？', 'CO₂ 是非極性小分子，分子之間只有微弱的凡得瓦力', ['C＝O 雙鍵很弱，一加熱就斷開', 'CO₂ 分子之間有很強的氫鍵']] },
    { id: 'p10', need: '手作蠟燭：要在 100°C 以下就能熔化倒進模具，凝固後不導電、碰水也不會溶', cons: [['st', 's'], ['mpIn', 40, 100], ['sc', false], ['water']], cands: ['wax', 'sug', 'S', 'Na'],
      r: ['石蠟分子很長、含有很多共價鍵，為什麼熔點還是很低？', '熔化只要克服分子之間的凡得瓦力，不必打斷分子裡的共價鍵', ['石蠟分子裡的共價鍵很弱', '石蠟是離子晶體，離子鍵弱']] },
    { id: 'p11', need: '要調一杯「電解液」讓燈泡亮起來，原料要便宜', cons: [['aq'], ['sol'], ['priceLe', 1]], cands: ['NaCl', 'sug', 'EtOH', 'CaCO3'],
      r: ['食鹽固體不導電，溶在水裡為什麼就能導電？', '溶解後 Na⁺、Cl⁻ 離開晶格，可以在水中自由移動', ['溶解時食鹽產生了自由電子', '水分子把電子交給了 Cl']] },
    { id: 'p12', need: '要做砂紙上的研磨顆粒：比石英硬、碰水不會壞、價格不能太貴', cons: [['hardGe', 8], ['water'], ['priceLe', 2]], cands: ['Al2O3', 'dia', 'SiO2', 'Fe'],
      r: ['氧化鋁為什麼又硬、熔點又高？', 'Al³⁺ 和 O²⁻ 帶的電荷大、離子小，離子鍵非常強', ['氧化鋁裡有自由電子', '氧化鋁的分子之間有很強的氫鍵']] },
    { id: 'p13', need: '衛星電路板上的接點鍍層：要導電好、能敲成薄層，幾十年都不能氧化（價格不是問題）', cons: [['condGe', 50], ['duct'], ['stable']], cands: ['Au', 'Ag', 'Cu', 'Al'],
      r: ['金為什麼能敲成比紙還薄的金箔？', '金屬鍵沒有方向性，原子層滑動後仍然被自由電子結合在一起', ['金原子之間有很強的共價鍵', '金是網狀固體，原子排得很緊密']] },
    { id: 'p14', need: '做鉛筆芯兼乾式潤滑劑：要很軟（莫氏硬度 ≤ 2），但機器發燙到 1000°C 也不能熔化', cons: [['hardLe', 2], ['mpGt', 1000]], cands: ['gra', 'Pb', 'wax', 'NaCl'],
      r: ['石墨又軟又滑，為什麼熔點卻非常高？', '層內的碳以共價鍵相連（要熔化得打斷），層與層之間只有微弱作用力（所以容易滑開）', ['石墨是金屬，金屬鍵很強', '石墨的層與層之間有氫鍵']] }
  ];
  const FAIL = [
    { id: 'f1', story: '小明把一大塊透明的食鹽晶體接進電路當導線，通電後燈泡完全不亮。', q: '最主要的原因是？', ok: '食鹽晶體中的離子被固定在晶格裡，不能移動', no: ['食鹽裡沒有任何帶電的粒子', '食鹽的熔點太低', '電池的電壓不夠大'],
      r: ['下列哪一個做法能讓燈泡亮起來？', '把食鹽加熱到熔化，或溶在水裡', ['把食鹽磨成更細的粉末', '把食鹽冷凍到 −20°C']] },
    { id: 'f2', story: '設計師用一大塊岩鹽（NaCl）雕出漂亮的槌子，第一次敲釘子就碎裂了；同樣大小的銅槌只凹了一點點。', q: '岩鹽槌子為什麼會碎？', ok: '受力時離子層錯開，同性電荷對齊而互相排斥，晶體就裂開', no: ['岩鹽的離子鍵比凡得瓦力還弱', '岩鹽分子之間只有凡得瓦力', '受力時岩鹽產生了自由電子'],
      r: ['為什麼銅槌受力只會凹下去，不會碎？', '銅的原子層滑動後，電子海仍把陽離子結合在一起', ['銅的共價鍵比較多', '銅離子帶的電荷比較大']] },
    { id: 'f3', story: '小華用濃濃的糖水當電池的電解液，接上燈泡卻一點都不亮。', q: '最主要的原因是？', ok: '蔗糖是分子物質，溶在水裡仍是分子，沒有能移動的離子', no: ['糖水太濃，電子跑不動', '蔗糖溶解時把電子吸走了', '糖會把電極黏住'],
      r: ['把糖換成下列哪一種，溶液就能導電？', '氯化鈣', ['乙醇', '碘']] },
    { id: 'f4', story: '實驗課有人把紅色酒精溫度計插進沸騰的熱水，溫度計的玻璃泡竟然裂開了。', q: '最主要的原因是？', ok: '乙醇的沸點只有 78°C，在 100°C 的水中沸騰成氣體，壓力撐破玻璃', no: ['乙醇在高溫下會導電發熱', '乙醇會和玻璃發生化學反應', '乙醇受熱後體積反而縮小'],
      r: ['乙醇的分子比水大，沸點卻比水低，主要是因為？', '每個乙醇分子能形成的氫鍵比水少，分子之間作用力較弱', ['乙醇分子裡沒有共價鍵', '乙醇是離子化合物']] },
    { id: 'f5', story: '有人把一大塊乾冰塞進寶特瓶並鎖緊瓶蓋，幾分鐘後瓶子「砰」一聲爆開。', q: '最主要的原因是？', ok: '乾冰在室溫迅速昇華成大量 CO₂ 氣體，瓶內壓力太大', no: ['乾冰和塑膠瓶發生化學反應而爆炸', '乾冰熔化成液體，體積變大', '乾冰會導電發熱'],
      r: ['乾冰在室溫就會昇華，是因為？', 'CO₂ 分子之間只有微弱的凡得瓦力，很容易分開', ['C＝O 雙鍵在室溫就會斷開', 'CO₂ 分子之間有氫鍵']] },
    { id: 'f6', story: '工程師想把便宜的石墨拉成細細的電線，結果一拉就碎成片片。', q: '最主要的原因是？', ok: '石墨是層狀結構，層與層之間作用力弱、容易剝落，不能像金屬一樣延展', no: ['石墨的熔點太低', '石墨完全不能導電', '石墨碰到空氣就會溶解'],
      r: ['為什麼金屬就能拉成細線？', '金屬鍵沒有方向性，原子層滑動後仍能結合', ['金屬原子之間有氫鍵', '金屬由分子組成，分子會滑動']] },
    { id: 'f7', story: '有人想用很軟、熔點低的鈉來做保險絲，結果放在潮濕的機房裡沒幾天就冒煙起火。', q: '最主要的原因是？', ok: '鈉非常活潑，碰到空氣中的水氣就會劇烈反應', no: ['鈉的熔點太高', '鈉不能導電', '鈉吸水後變成離子晶體'],
      r: ['鈉為什麼這麼容易失去電子？', '鈉只有 1 個價電子，失去後就變成穩定的鈍氣電子排列', ['鈉有 7 個價電子，很想再得到 1 個', '鈉的原子核電荷特別大']] },
    { id: 'f8', story: '有人把紫黑色的碘晶體擺在暖氣旁當裝飾，幾天後晶體變小了，旁邊還飄著淡淡的紫色氣體。', q: '最主要的原因是？', ok: '碘分子之間只有凡得瓦力，稍微加熱就昇華成氣體', no: ['碘和空氣中的氧燃燒了', '碘變成離子跑到空氣中', '碘熔化後流走了'],
      r: ['同樣擺在暖氣旁，食鹽晶體卻不會變小，因為？', '食鹽是離子晶體，要打斷很強的離子鍵才能熔化或汽化', ['食鹽的分子比碘分子大', '食鹽裡有電子海']] }
  ];

  // 檢查：pick 題只有一個候選全部符合
  function check() {
    const errs = [];
    PICK.forEach(p => {
      p.cands.forEach(id => { if (!BY[id]) errs.push(`${p.id} 沒有材料 ${id}`); });
      const good = p.cands.filter(id => BY[id] && p.cons.every(c => ok(BY[id], c)));
      if (good.length !== 1) errs.push(`${p.id} 符合條件的有 ${good.length} 個：${good.join(',')}`);
    });
    return errs;
  }
  const answerOf = p => p.cands.find(id => p.cons.every(c => ok(BY[id], c)));

  return { LIST: M, BY, CLS, ST, SOL, MECH, MECH_S, PRICE, AIR, YN, deg, mpTxt, ok, conTxt, whyNot, PICK, FAIL, check, answerOf };
})();
if (typeof module !== 'undefined') module.exports = MATS;
