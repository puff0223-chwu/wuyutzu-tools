/* =========================================================
   🔍 消失的實驗器材：題庫與判分（學生頁、老師頁共用；2026-10-22 從學生頁搬出來）
   新增器材：把圖片放進 images/equipment/<id>.jpg，在 ITEMS 加一行即可
   ========================================================= */
const EQ = (() => {
/* ========== 題庫：33 種實驗器材 ==========
   name：標準答案；aliases：其他也算對的寫法；marked：圖片上有紅圈 */
  const ITEMS = [
    {id:'volumetric-flask',    name:'容量瓶',     aliases:[], category:'精準刻度類'},
    {id:'graduated-cylinder',  name:'量筒',       aliases:[], category:'精準刻度類'},
    {id:'latex-dropper',       name:'乳膠滴管',   aliases:[], category:'精準刻度類'},
    {id:'plastic-dropper',     name:'塑膠滴管',   aliases:[], category:'精準刻度類'},
    {id:'burette',             name:'滴定管',     aliases:[], category:'精準刻度類'},
    {id:'graduated-pipette',   name:'分度吸量管', aliases:[], category:'精準刻度類', marked:true},
    {id:'pipette-bulb',        name:'安全吸球',   aliases:[], category:'精準刻度類', marked:true},
    {id:'distilling-flask',    name:'蒸餾瓶',     aliases:[], category:'容器類'},
    {id:'wide-mouth-bottle',   name:'廣口瓶',     aliases:[], category:'容器類'},
    {id:'beaker',              name:'燒杯',       aliases:[], category:'容器類'},
    {id:'round-flask',         name:'燒瓶',       aliases:[], category:'容器類'},
    {id:'erlenmeyer-flask',    name:'錐形瓶',     aliases:[], category:'容器類'},
    {id:'conical-test-tube',   name:'錐形試管',   aliases:[], category:'容器類'},
    {id:'round-test-tube',     name:'圓形試管',   aliases:[], category:'容器類'},
    {id:'alcohol-lamp',        name:'酒精燈',     aliases:[], category:'裝置類'},
    {id:'electronic-balance',  name:'電子天平',   aliases:[], category:'裝置類'},
    {id:'thermometer',         name:'溫度計',     aliases:[], category:'裝置類', marked:true},
    {id:'digital-thermometer', name:'電子溫度計', aliases:[], category:'裝置類', marked:true},
    {id:'hot-plate',           name:'加熱器',     aliases:[], category:'裝置類'},
    {id:'separatory-funnel',   name:'分液漏斗',   aliases:[], category:'漏斗類'},
    {id:'buchner-funnel',      name:'布氏漏斗',   aliases:[], category:'漏斗類'},
    {id:'thistle-funnel',      name:'薊頭漏斗',   aliases:[], category:'漏斗類'},
    {id:'funnel',              name:'普通漏斗',   aliases:[], category:'漏斗類'},
    {id:'weighing-paper',      name:'秤量紙',     aliases:[], category:'耗材類'},
    {id:'label-paper',         name:'標籤紙',     aliases:[], category:'耗材類'},
    {id:'filter-paper',        name:'濾紙',       aliases:[], category:'耗材類'},
    {id:'iron-stand',          name:'鐵架',       aliases:[], category:'其他專用器材', marked:true},
    {id:'burette-clamp',       name:'滴定夾',     aliases:['蝴蝶夾','滴定夾(蝴蝶夾)'], category:'其他專用器材', marked:true},
    {id:'spatula',             name:'刮勺',       aliases:[], category:'其他專用器材'},
    {id:'condenser',           name:'蒸餾管',     aliases:[], category:'其他專用器材'},
    {id:'combustion-spoon',    name:'燒匙',       aliases:[], category:'其他專用器材'},
    {id:'mortar',              name:'研缽',       aliases:[], category:'其他專用器材'},
    {id:'stirring-rod',        name:'攪拌棒',     aliases:[], category:'其他專用器材'}
  ];

  const CATS = [...new Set(ITEMS.map(it => it.category))];
  // 只忽略空白與全形/半形差異，錯字一律算錯
  const normalize = s => String(s).replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').toLowerCase();
  const isCorrect = (item, input) => { const ans = normalize(input); return [item.name, ...(item.aliases || [])].some(a => normalize(a) === ans); };
  const BY = Object.fromEntries(ITEMS.map(it => [it.id, it]));
  // 活動設定字串："題數|命數|類別"（類別＝all，或 CATS 的序號用逗號隔開）
  const DEFAULT = { n: 30, lives: 3, cats: 'all' };
  function parseSet(str) {
    const [n, lives, cats] = String(str || '').split('|');
    return { n: Math.max(5, Math.min(30, parseInt(n, 10) || 30)), lives: Math.max(1, Math.min(5, parseInt(lives, 10) || 3)), cats: cats || 'all' };
  }
  const makeSet = o => `${o.n}|${o.lives}|${o.cats}`;
  const poolOf = set => set.cats === 'all' ? ITEMS : ITEMS.filter(it => set.cats.split(',').map(Number).includes(CATS.indexOf(it.category)));
  const isStandard = set => set.n === 30 && set.lives === 3 && set.cats === 'all';   // 標準設定才上全站名人堂
  return { ITEMS, CATS, BY, normalize, isCorrect, DEFAULT, parseSet, makeSet, poolOf, isStandard };
})();
if (typeof module !== 'undefined') module.exports = EQ;
