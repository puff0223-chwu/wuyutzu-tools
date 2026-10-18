/* ============================================================
 * 📜 出處失傳的秘文｜共用核心（學生頁、老師頁都載入）
 * 第 3 關「出處鑑識」：每位學生的證物卡（文獻原始資料）＋標準答案
 *
 * ・種子＝任務代碼｜學號｜關卡，同一個人永遠拿到同一張證物卡；老師頁用同一支程式重算，不用存答案
 * ・格式依據：全國高級中等學校小論文寫作比賽《引註及參考文獻格式範例》（參考 APA 精神）
 *   老師 2026-10-18 決定：書名、期刊名＋卷數、博碩士論文題目、報紙名稱、小論文篇名、科展作品名稱設粗體
 *   小論文、科展作品的格式官方範例沒有，為本系統依比賽格式精神自訂（老師已確認）
 * ・證物內容全部是練習用的虛構資料（作者、書名、篇名、網址都是編的）
 * ============================================================ */
(function (root) {
  'use strict';

  var CONFIG = {
    FIREBASE_URL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
    DB: 'secret-source'
  };

  /* ---------- 亂數：同一顆種子永遠長出同一棵樹 ---------- */
  function hashStr(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normId(id) { return String(id || '').trim().toUpperCase(); }
  function rngFor(code, id, part) { return makeRng(hashStr(String(code || '') + '|' + normId(id) + '|' + part)); }
  function int(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickN(r, arr, n) { return shuffle(r, arr).slice(0, n); }

  /* ======================= 題材資料庫（全部自然科學） ======================= */
  var SUBJECTS = {
    phy: { name: '物理', essay: '物理類', fair: '物理與天文學科' },
    chem: { name: '化學', essay: '化學類', fair: '化學科' },
    bio: { name: '生物', essay: '生物類', fair: '生物科' },
    geo: { name: '地科', essay: '地球科學類', fair: '地球與行星科學科' }
  };
  var SUBJ_KEYS = ['phy', 'chem', 'bio', 'geo'];

  // 研究題目的「變因 → 結果」
  var VARS = {
    phy: [['斜面角度', '滾動物體的速度'], ['胎紋形狀', '四驅車的摩擦力'], ['擺長', '單擺的週期'], ['杯子材質', '熱飲的降溫速率'], ['水量', '玻璃杯的發聲頻率'], ['機翼形狀', '紙飛機的飛行距離'], ['線圈匝數', '電磁鐵的磁力'], ['入射角', '光在水中的折射']],
    chem: [['醋酸濃度', '蛋殼的溶解速率'], ['溫度', '維生素C的氧化速率'], ['電極金屬', '水果電池的電壓'], ['酸鹼值', '花青素的顏色變化'], ['冷卻速率', '明礬結晶的大小'], ['水溫', '鹽類的溶解度'], ['界面活性劑種類', '油汙的去除效果'], ['過氧化氫濃度', '產生氧氣的速率']],
    bio: [['土壤酸鹼值', '綠豆的發芽率'], ['光照時間', '豆芽菜的生長'], ['溫度', '酵母菌的發酵速率'], ['洗手方式', '手上的細菌數量'], ['鹽度', '豐年蝦的孵化率'], ['光的顏色', '水蘊草的光合作用'], ['食物種類', '果蠅的繁殖數量'], ['葉片厚度', '植物的蒸散作用']],
    geo: [['地表材質', '夏季地面溫度'], ['坡度', '土壤的侵蝕量'], ['降雨強度', '地表逕流量'], ['顆粒大小', '沉積物的沉降速率'], ['海拔高度', '山區的氣溫'], ['建築物配置', '校園的風速'], ['雲量', '日夜溫差'], ['海水溫度', '颱風的強度']]
  };
  var TITLE_TPL = [
    function (x, y) { return '不同' + x + '對' + y + '的影響'; },
    function (x, y) { return x + '與' + y + '之關係探討'; },
    function (x, y) { return '探討' + x + '對' + y + '的影響'; },
    function (x, y) { return x + '對' + y + '影響之研究'; }
  ];
  var BOOKS = {
    phy: ['生活物理學', '從單擺到宇宙', '聲音的秘密', '光的旅程', '力與運動的日常', '電從哪裡來', '用物理看運動場', '熱的科學', '飛行的原理', '看得見的物理'],
    chem: ['生活中的化學', '廚房裡的化學實驗', '看得見的分子', '元素的故事', '塑膠的前世今生', '酸鹼大冒險', '水的化學', '色彩的化學', '反應的藝術', '化學偵探手冊'],
    bio: ['植物的秘密生活', '細胞的旅程', '微生物大觀園', '校園植物圖鑑', '昆蟲的生存策略', '人體的奧秘', '基因的故事', '森林裡的生物學', '海洋生物探索', '演化的足跡'],
    geo: ['地球的故事', '看懂岩石', '臺灣地質之旅', '天氣與氣候', '海洋與地球', '地震的科學', '星空導覽', '河流的力量', '火山與板塊', '臺灣的天空']
  };
  var CONCEPTS = {
    phy: ['摩擦力', '浮力', '折射', '共振', '電磁感應', '熱對流', '槓桿原理', '白努利定律'],
    chem: ['氧化還原', '酸鹼中和', '催化劑', '結晶', '溶解度', '界面活性劑', '化學電池', '焰色反應'],
    bio: ['光合作用', '發酵作用', '蒸散作用', '細菌培養', '種子發芽', '食物鏈', '酵素', '細胞分裂'],
    geo: ['颱風', '地震波', '岩石循環', '溫室效應', '潮汐', '土壤液化', '板塊運動', '月相']
  };
  var EN_TOPICS = {
    phy: ['friction in model car racing', 'heat loss from insulated cups', 'pendulum motion', 'sound frequency of water glasses'],
    chem: ['eggshell dissolution in acetic acid', 'vitamin C oxidation', 'fruit battery voltage', 'anthocyanin as a pH indicator'],
    bio: ['mung bean germination', 'yeast fermentation', 'brine shrimp hatching', 'photosynthesis in aquatic plants'],
    geo: ['urban heat islands', 'soil erosion on slopes', 'sediment settling', 'typhoon intensity']
  };
  var EN_TITLE_TPL = [
    function (t) { return 'Effects of temperature on ' + t; },
    function (t) { return 'A classroom study of ' + t; },
    function (t) { return 'Investigating ' + t + ' with low-cost sensors'; },
    function (t) { return 'Factors affecting ' + t; }
  ];
  var EN_BOOKS = {
    phy: ['Physics in everyday life', 'The science of motion', 'Understanding light and sound'],
    chem: ['Chemistry in the kitchen', 'The world of molecules', 'Acids, bases, and you'],
    bio: ['The secret life of plants', 'Microbes all around us', 'Cells and living systems'],
    geo: ['Our restless Earth', 'Weather and climate basics', 'Rocks, minerals, and landforms']
  };

  /* ---------- 人名 ---------- */
  var SURNAMES = ['王', '李', '林', '張', '陳', '黃', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '洪', '郭', '曾', '邱', '廖', '賴', '周', '葉', '蘇', '莊', '呂', '江', '何', '蕭', '羅', '高', '潘', '簡', '朱', '彭', '游', '詹', '胡', '施', '沈', '趙', '盧', '梁', '顏', '柯', '翁', '魏', '孫'];
  // 排序題專用：筆畫各不相同、不容易數錯的姓氏（教育部標準字筆畫）
  var STROKE_SURNAMES = { '丁': 2, '王': 4, '白': 5, '朱': 6, '李': 7, '林': 8, '洪': 9, '高': 10, '張': 11, '黃': 12, '楊': 13, '趙': 14, '劉': 15, '盧': 16, '謝': 17 };
  var GIVEN = '志明家豪建宏俊傑冠宇承恩柏翰宇軒子晴雅婷怡君佳穎詩涵欣妤品妍宜蓁思妤育誠哲瑋彥廷昱辰語彤芷瑜睿恩書豪靖雯佩珊立婷宏偉孟儒以安文彬玉珍淑芬振宇宗翰';
  function givenName(r) { var a = int(r, 0, GIVEN.length / 2 - 1) * 2; return GIVEN.substr(a, 2); }
  function personName(r, surname) { return (surname || pick(r, SURNAMES)) + givenName(r); }
  function otherName(r, list) { var p; do { p = personName(r); } while (list.some(function (x) { return x[0] === p[0]; })); return p; }
  function people(r, n) { var out = [], used = {}; while (out.length < n) { var p = personName(r); if (!used[p[0]]) { used[p[0]] = 1; out.push(p); } } return out; }
  var EN_SURNAMES = ['Anderson', 'Brown', 'Carter', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris', 'Ito', 'Johnson', 'Kim', 'Lopez', 'Miller', 'Nguyen', 'Owens', 'Parker', 'Quinn', 'Robinson', 'Smith', 'Turner', 'Walker', 'Young'];
  var EN_FIRST = [['Emily', 'J.'], ['Daniel', 'R.'], ['Sarah', 'L.'], ['Michael', 'T.'], ['Olivia', 'K.'], ['David', 'A.'], ['Grace', 'M.'], ['Kevin', 'S.'], ['Hannah', 'E.'], ['Ryan', 'P.']];
  function enPeople(r, n) {
    var sn = pickN(r, EN_SURNAMES, n);
    return sn.map(function (s) { var f = pick(r, EN_FIRST); return { first: f[0], mid: f[1], last: s, ref: s + ', ' + f[0][0] + '. ' + f[1] }; });
  }

  /* ---------- 出版者、網站、頻道（虛構） ---------- */
  var PUBLISHERS = ['青松出版社', '星河文化', '知行出版社', '晨光書局', '遠望圖書公司', '拾光文化', '藍海科學出版社', '木鐸書房'];
  var EN_PUBLISHERS = ['Bluefield Press', 'Northbridge Books', 'Clearwater Publishing', 'Harbor Science Press'];
  var SITES = [['科學探索網', 'kexue'], ['自然觀察誌', 'nature-note'], ['生活科學館', 'sci-life'], ['科普小學堂', 'kepu-school'], ['好奇心實驗室', 'curious-lab']];
  var CHANNELS = ['實驗室小偵探', '物理大叔聊科學', '化學不NG', '地科好好玩', '生物迷因研究所', '科學一分鐘'];
  var JOURNALS_VI = [['中學科學教育', 1], ['自然科學學報', 1], ['探究與實作季刊', 0]]; // 1＝有卷期，0＝只有期數
  var EN_JOURNALS = ['Journal of Student Science Research', 'Science Education Letters', 'International Journal of Inquiry Learning'];
  var NEWSPAPERS = ['新時代日報', '海島日報', '大眾晨報'];
  var UNIS = {
    phy: ['國立臺灣師範大學物理學系', '國立彰化師範大學物理學系', '國立中央大學物理學系'],
    chem: ['國立臺灣師範大學化學系', '國立清華大學化學系', '國立成功大學化學系'],
    bio: ['國立臺灣大學生命科學系', '國立中興大學生命科學系', '國立高雄師範大學生物科技系'],
    geo: ['國立臺灣師範大學地球科學系', '國立中央大學地球科學學系', '國立成功大學地球科學系']
  };
  var SCIED = ['國立臺灣師範大學科學教育研究所', '國立彰化師範大學科學教育研究所', '國立高雄師範大學科學教育暨環境教育研究所'];
  var GOV = {
    phy: [['經濟部能源署', '能源統計年報']],
    chem: [['環境部', '空氣品質監測年報'], ['衛生福利部食品藥物管理署', '食品化學檢驗方法彙編']],
    bio: [['農業部', '農業統計年報'], ['衛生福利部疾病管制署', '傳染病防治年報']],
    geo: [['交通部中央氣象署', '颱風調查報告'], ['經濟部地質調查及礦業管理中心', '臺灣地質調查年報']]
  };

  /* ======================= 文獻類型 ======================= */
  // order：關卡順序；def：預設開啟（老師開設任務時可改）
  var TYPES = [
    { key: 'book', name: '書籍', icon: '📕', lang: 'zh', def: true },
    { key: 'web', name: '網路資源', icon: '🌐', lang: 'zh', def: true },
    { key: 'yt', name: 'YouTube 影片', icon: '▶️', lang: 'zh', def: true },
    { key: 'essay', name: '小論文', icon: '📝', lang: 'zh', def: true },
    { key: 'fair', name: '科展作品', icon: '🔬', lang: 'zh', def: true },
    { key: 'journal', name: '期刊論文', icon: '📰', lang: 'zh', def: false },
    { key: 'thesis', name: '博碩士論文', icon: '🎓', lang: 'zh', def: false },
    { key: 'news', name: '報紙', icon: '🗞️', lang: 'zh', def: false },
    { key: 'gov', name: '政府出版品', icon: '🏛️', lang: 'zh', def: false },
    { key: 'ejournal', name: '英文期刊', icon: '🌍', lang: 'en', def: false },
    { key: 'ebook', name: '英文書籍', icon: '📘', lang: 'en', def: false }
  ];
  var TYPE = {}; TYPES.forEach(function (t) { TYPE[t.key] = t; });

  /* ---------- 標準答案：一段一段的文字＋欄位＋粗體斜體 ---------- */
  function S(t, f, st) { return { t: String(t), f: f, b: !!(st && st.b), i: !!(st && st.i) }; }
  var B = { b: 1 }, I = { i: 1 };
  var FIELD = {
    au: '作者', yr: '年份', date: '日期', ti: '書名', title: '篇名', ed: '版次', pub: '出版者', site: '網站名稱',
    url: '網址', ch: '頻道名稱', vtitle: '影片標題', tag: '類型標示', yt: '平台', etitle: '篇名', contest: '比賽名稱',
    cat: '類別', shs: '中學生網站', fair: '展覽名稱', group: '組別科別', org: '出版單位', jn: '期刊名', vol: '卷數',
    iss: '期數', pg: '頁碼', inst: '系所', deg: '學位', np: '報紙名稱', sec: '版次', doi: 'DOI', p: '標點'
  };
  function auSegs(names) { // 中文作者：頓號分隔
    var out = [];
    names.forEach(function (n, i) { if (i) out.push(S('、', 'p')); out.push(S(n, 'au')); });
    return out;
  }
  function yrSegs(y) { return [S('（', 'p'), S(y, 'yr'), S('）', 'p'), S('。', 'p')]; }
  function dateStr(y, m, d) { return y + '年' + m + '月' + d + '日'; }
  function dateSegs(y, m, d) { return [S('（', 'p'), S(dateStr(y, m, d), 'date'), S('）', 'p'), S('。', 'p')]; }
  function randDate(r, y) { return { y: y, m: int(r, 1, 12), d: int(r, 1, 28) }; }
  function slug(r, n) { var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < n; i++) s += c[Math.floor(r() * c.length)]; return s; }
  function ytId(r) { var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', s = ''; for (var i = 0; i < 11; i++) s += c[Math.floor(r() * c.length)]; return s; }
  function researchTitle(r, subj) { var v = pick(r, VARS[subj]); return pick(r, TITLE_TPL)(v[0], v[1]); }

  function subjOf(r, opts) {
    var list = (opts && opts.subjects && opts.subjects.length) ? opts.subjects : SUBJ_KEYS;
    return pick(r, list);
  }

  /* ======================= 各類證物卡 ======================= */
  var GEN = {};

  GEN.book = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 1, 2, 2, 3]), au = people(r, n), y = int(r, 2012, 2025);
    var title = pick(r, BOOKS[subj]), pub = pick(r, PUBLISHERS), ed = r() < 0.3 ? '修訂版' : '';
    var segs = auSegs(au).concat(yrSegs(y), [S(title, 'ti', B)]);
    if (ed) segs.push(S('（', 'p'), S(ed, 'ed'), S('）', 'p'));
    segs.push(S('。', 'p'), S(pub, 'pub'), S('。', 'p'));
    var print = ed ? '修訂版 第' + int(r, 1, 3) + '刷' : '初版 第' + int(r, 1, 5) + '刷';
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'book', title: title, authors: au, pub: pub, year: y, month: int(r, 1, 12), print: print, ed: ed,
        isbn: '978-626-' + int(r, 10, 99) + '-' + int(r, 100, 999) + '-' + int(r, 0, 9), price: int(r, 28, 58) * 10, editor: personName(r) },
      distract: { isbn: 'ISBN', price: '定價', editor: '責任編輯', print: '印刷刷次' }
    };
  };

  GEN.web = function (r, o) {
    var subj = subjOf(r, o), site = pick(r, SITES), concept = pick(r, CONCEPTS[subj]);
    var title = pick(r, ['什麼是' + concept + '？', concept + '的原理', '生活中的' + concept, '一次看懂' + concept]);
    var d = randDate(r, int(r, 2019, 2025)), hasAuthor = r() < 0.55, author = personName(r);
    var url = 'https://' + site[1] + '.example.tw/article/' + int(r, 10000, 99999);
    var head = hasAuthor ? [S(author, 'au')] : [S(site[0], 'site')];
    var segs = head.concat(dateSegs(d.y, d.m, d.d), [S(title, 'title'), S('。', 'p'), S(url, 'url')]);
    return {
      subj: subj, segs: segs, authors: hasAuthor ? [author] : [],
      card: { kind: 'web', site: site[0], url: url, title: title, author: hasAuthor ? author : '', date: d, views: int(r, 1200, 98000), updated: dateStr(Math.min(2026, d.y + 1), int(r, 1, 12), int(r, 1, 28)) },
      distract: { views: '瀏覽次數' }
    };
  };

  GEN.yt = function (r, o) {
    var subj = subjOf(r, o), ch = pick(r, CHANNELS), concept = pick(r, CONCEPTS[subj]);
    var title = pick(r, [concept + '其實很簡單！', '3 分鐘看懂' + concept, '在家就能做的' + concept + '實驗', concept + '到底是什麼？']);
    var d = randDate(r, int(r, 2018, 2025)), url = 'https://www.youtube.com/watch?v=' + ytId(r);
    var segs = [S(ch, 'ch')].concat(dateSegs(d.y, d.m, d.d), [S(title, 'vtitle'), S('［', 'p'), S('影片', 'tag'), S('］', 'p'), S('。', 'p'), S('YouTube', 'yt'), S('。', 'p'), S(url, 'url')]);
    return {
      subj: subj, segs: segs, authors: [],
      card: { kind: 'yt', channel: ch, title: title, date: d, url: url, views: int(r, 3000, 900000), subs: int(r, 2, 80) + '萬', likes: int(r, 100, 9000) },
      distract: { views: '觀看次數', subs: '訂閱人數', likes: '按讚數' }
    };
  };

  GEN.essay = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 2, 2, 3]), au = people(r, n), roc = int(r, 108, 114), md = pick(r, ['0315', '1031']);
    var y = roc + 1911, batch = roc + md, title = researchTitle(r, subj), cat = SUBJECTS[subj].essay;
    var url = 'https://www.shs.edu.tw/works/essay/' + y + '/' + md + '/' + slug(r, 10) + '.pdf';
    var segs = auSegs(au).concat(yrSegs(y), [S(title, 'title', B), S('。', 'p'), S('全國高級中等學校小論文寫作比賽', 'contest'), S('（', 'p'), S('第' + batch + '梯次', 'contest'), S('）', 'p'), S('，', 'p'), S(cat, 'cat'), S('。', 'p'), S('中學生網站', 'shs'), S('。', 'p'), S(url, 'url')]);
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'essay', title: title, authors: au, school: pick(r, ['國立青松高級中學', '市立星河高級中學', '私立知行高級中學']), batch: batch, cat: cat, award: pick(r, ['特優', '優等', '甲等']), url: url, teacher: otherName(r, au) },
      distract: { award: '得獎等第', school: '學校名稱', teacher: '指導老師' }
    };
  };

  GEN.fair = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 2, 2, 3]), au = people(r, n), y = int(r, 2018, 2025), th = y - 1960;
    var title = researchTitle(r, subj), sci = SUBJECTS[subj].fair, group = '高級中等學校組 ' + sci;
    var url = 'https://twsf.ntsec.gov.tw/works/' + th + '/' + slug(r, 8) + '.pdf';
    var segs = auSegs(au).concat(yrSegs(y), [S(title, 'title', B), S('。', 'p'), S('中華民國第' + th + '屆中小學科學展覽會作品說明書', 'fair'), S('（', 'p'), S(group, 'group'), S('）', 'p'), S('。', 'p'), S('國立臺灣科學教育館', 'org'), S('。', 'p'), S(url, 'url')]);
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'fair', title: title, authors: au, th: th, year: y, sci: sci, award: pick(r, ['第一名', '第二名', '第三名', '佳作']), url: url, teacher: otherName(r, au), no: '0' + int(r, 30, 59) + int(r, 100, 999) },
      distract: { teacher: '指導老師', award: '得獎名次', no: '作品編號' }
    };
  };

  GEN.journal = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 2, 3]), au = people(r, n), y = int(r, 2012, 2025), j = pick(r, JOURNALS_VI);
    var title = researchTitle(r, subj), p1 = int(r, 1, 80), p2 = p1 + int(r, 6, 22), vol = y - 1960 + int(r, 0, 2), iss = int(r, 1, 6), num = int(r, 120, 380);
    var segs = auSegs(au).concat(yrSegs(y), [S(title, 'title'), S('。', 'p'), S(j[0], 'jn', B), S('，', 'p', B)]);
    if (j[1]) segs.push(S(String(vol), 'vol', B), S('（', 'p'), S(String(iss), 'iss'), S('）', 'p'));
    else segs.push(S(String(num), 'iss', B));
    segs.push(S('，', 'p'), S(p1 + '-' + p2, 'pg'), S('。', 'p'));
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'journal', title: title, authors: au, journal: j[0], hasVol: !!j[1], vol: vol, iss: iss, num: num, year: y, month: int(r, 1, 12), p1: p1, p2: p2, received: dateStr(y - 1, int(r, 1, 12), int(r, 1, 28)), email: 'author' + int(r, 10, 99) + '@mail.example.edu.tw' },
      distract: { received: '收稿日期', email: '通訊作者信箱' }
    };
  };

  GEN.thesis = function (r, o) {
    var subj = subjOf(r, o), au = people(r, 1), y = int(r, 2012, 2025), title = researchTitle(r, subj);
    var inst = pick(r, UNIS[subj].concat(SCIED)), deg = r() < 0.85 ? '碩士論文' : '博士論文';
    var segs = auSegs(au).concat(yrSegs(y), [S(title, 'title', B), S('。', 'p'), S(inst, 'inst'), S('：', 'p'), S(deg, 'deg'), S('。', 'p')]);
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'thesis', title: title, author: au[0], inst: inst, deg: deg, year: y, roc: y - 1911, month: int(r, 1, 12), advisor: personName(r) + ' 博士' },
      distract: { advisor: '指導教授' }
    };
  };

  GEN.news = function (r, o) {
    var subj = subjOf(r, o), au = people(r, 1), d = randDate(r, int(r, 2015, 2025)), np = pick(r, NEWSPAPERS), concept = pick(r, CONCEPTS[subj]);
    var title = pick(r, ['高中生研究' + concept + '　獲科展肯定', concept + '進校園　學生動手做實驗', '專家解析' + concept + '與日常生活', '從' + concept + '看科學教育新趨勢']);
    var sec = pick(r, ['A', 'B']) + int(r, 2, 12);
    var segs = auSegs(au).concat(dateSegs(d.y, d.m, d.d), [S(title, 'title'), S('。', 'p'), S(np, 'np', B), S('，', 'p'), S(sec + '版', 'sec'), S('。', 'p')]);
    return {
      subj: subj, segs: segs, authors: au,
      card: { kind: 'news', np: np, date: d, title: title, author: au[0], sec: sec, city: pick(r, ['臺北', '臺中', '高雄', '桃園']), photo: personName(r) },
      distract: { city: '報導地點', photo: '攝影記者' }
    };
  };

  GEN.gov = function (r, o) {
    var subj = subjOf(r, o), g = pick(r, GOV[subj]), y = int(r, 2018, 2025), roc = y - 1911;
    var title = (roc - 1) + '年' + g[1];
    var segs = [S(g[0], 'au')].concat(yrSegs(y), [S(title, 'ti', B), S('。', 'p'), S(g[0], 'pub'), S('。', 'p')]);
    return {
      subj: subj, segs: segs, authors: [g[0]],
      card: { kind: 'gov', org: g[0], title: title, year: y, roc: roc, month: int(r, 1, 12), gpn: '10' + int(r, 10000000, 99999999), editor: personName(r) },
      distract: { gpn: 'GPN 統一編號', editor: '編輯者' }
    };
  };

  GEN.ejournal = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 2, 3]), au = enPeople(r, n), y = int(r, 2012, 2025), j = pick(r, EN_JOURNALS);
    var title = pick(r, EN_TITLE_TPL)(pick(r, EN_TOPICS[subj])), vol = int(r, 8, 45), iss = int(r, 1, 6), p1 = int(r, 1, 300), p2 = p1 + int(r, 8, 24);
    var doi = 'https://doi.org/10.' + int(r, 1000, 9999) + '/' + slug(r, 4) + '.' + y + '.' + int(r, 100, 999);
    var segs = [];
    au.forEach(function (a, i) {
      if (i) segs.push(S(n === 2 ? ', & ' : (i === n - 1 ? ', & ' : ', '), 'p'));
      segs.push(S(a.ref, 'au'));
    });
    segs.push(S(' (', 'p'), S(String(y), 'yr'), S('). ', 'p'), S(title, 'etitle'), S('. ', 'p'), S(j, 'jn', I), S(', ', 'p', I), S(String(vol), 'vol', I), S('(', 'p'), S(String(iss), 'iss'), S('), ', 'p'), S(p1 + '-' + p2, 'pg'), S('. ', 'p'), S(doi, 'doi'));
    return {
      subj: subj, segs: segs, authors: au.map(function (a) { return a.last; }), en: true,
      card: { kind: 'ejournal', title: title, authors: au, journal: j, vol: vol, iss: iss, year: y, p1: p1, p2: p2, doi: doi, received: 'Received ' + int(r, 1, 28) + ' March ' + (y - 1) },
      distract: { received: '收稿日期' }
    };
  };

  GEN.ebook = function (r, o) {
    var subj = subjOf(r, o), n = pick(r, [1, 2]), au = enPeople(r, n), y = int(r, 2010, 2025), title = pick(r, EN_BOOKS[subj]), pub = pick(r, EN_PUBLISHERS), ed = r() < 0.35 ? '2nd ed.' : '';
    var segs = [];
    au.forEach(function (a, i) { if (i) segs.push(S(', & ', 'p')); segs.push(S(a.ref, 'au')); });
    segs.push(S(' (', 'p'), S(String(y), 'yr'), S('). ', 'p'), S(title, 'ti', I));
    if (ed) segs.push(S(' (', 'p'), S(ed, 'ed'), S(')', 'p'));
    segs.push(S('. ', 'p'), S(pub, 'pub'), S('.', 'p'));
    return {
      subj: subj, segs: segs, authors: au.map(function (a) { return a.last; }), en: true,
      card: { kind: 'ebook', title: title, authors: au, pub: pub, year: y, ed: ed, isbn: '978-1-' + int(r, 1000, 9999) + '-' + int(r, 1000, 9999) + '-' + int(r, 0, 9), price: '$' + int(r, 19, 49) + '.95' },
      distract: { isbn: 'ISBN', price: 'Price' }
    };
  };

  function evidence(code, id, type, opts) {
    var r = rngFor(code, id, 'S3|' + type);
    var e = GEN[type](r, opts || {});
    e.type = type;
    return e;
  }

  /* ---------- 文字版（給老師看答案、匯出 Excel） ---------- */
  function plain(segs) { return segs.map(function (s) { return s.t; }).join('').trim(); }
  function html(segs) {
    return segs.map(function (s) {
      var t = escapeHtml(s.t);
      if (s.b) t = '<b>' + t + '</b>';
      if (s.i) t = '<i>' + t + '</i>';
      return t;
    }).join('').trim();
  }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ======================= 任務設定 ======================= */
  var DEFAULT_SETTINGS = {
    subjects: { phy: true, chem: true, bio: true, geo: true },
    types: { book: true, web: true, yt: true, essay: true, fair: true },
    en: true
  };
  function settingsOf(meta) {
    meta = meta || {};
    var subj = SUBJ_KEYS.filter(function (k) { return meta.subj ? meta.subj[k] : DEFAULT_SETTINGS.subjects[k]; });
    if (!subj.length) subj = SUBJ_KEYS.slice();
    var types = TYPES.filter(function (t) { return t.lang === 'zh' && (meta.types ? meta.types[t.key] : t.def); }).map(function (t) { return t.key; });
    if (!types.length) types = ['book', 'web', 'yt', 'essay', 'fair'];
    return { subjects: subj, types: types, en: meta.en !== false && meta.en !== 0 };
  }

  /* ---------- 第 3 關的關卡清單 ---------- */
  function levels(meta) {
    var st = settingsOf(meta), out = [];
    st.types.forEach(function (k) { out.push({ key: k, kind: 'write', type: k, name: TYPE[k].name, icon: TYPE[k].icon, required: true }); });
    out.push({ key: 'spot', kind: 'spot', name: '找出破綻', icon: '🔎', required: true });
    out.push({ key: 'sort', kind: 'sort', name: '整理參考文獻清單', icon: '🗂️', required: true });
    if (st.en) ['ejournal', 'ebook'].forEach(function (k) { out.push({ key: k, kind: 'write', type: k, name: TYPE[k].name, icon: TYPE[k].icon, required: false }); });
    return out;
  }
  /* ---------- 第 2 關的關卡（meta.s2 === false 時不開）、結案作業（meta.dos === false 時不開） ---------- */
  function levels2(meta) {
    if (meta && meta.s2 === false) return [];
    return [{ key: 'cite', kind: 'cite', name: '文中引用快問快答', icon: '⚡', sub: '一位、兩位、三位以上、機構、英文' },
      { key: 'quote', kind: 'quote', name: '直接引用？間接引用？', icon: '🔍', sub: '6 句引用，判斷對錯與錯在哪' },
      { key: 'plag', kind: 'plag', name: '這算不算抄襲', icon: '⚖️', sub: '4 種寫法，分辨合格改寫與抄襲' },
      { key: 'para', kind: 'para', name: '改寫練習', icon: '✍️', sub: '用自己的話改寫並註明出處' + (meta && meta.ai === false ? '' : '（AI 回饋）') }];
  }
  function levelsDos(meta) { return meta && meta.dos === false ? [] : [{ key: 'dossier', kind: 'dossier', name: '我的文獻卷宗', icon: '📁', sub: '用自己找的文獻寫 150～300 字文獻探討＋參考文獻' }]; }
  /* ---------- 第 1 關的關卡（meta.s1 === false 時不開） ---------- */
  function levels1(meta) {
    if (meta && meta.s1 === false) return [];
    return [{ key: 'archive', kind: 'archive', name: '模擬檔案庫', icon: '🗄️', sub: '拆關鍵字、搜尋、收 4 篇可靠文獻' },
      { key: 'clues', kind: 'clues', name: '線索卡（作業）', icon: '🗂️', sub: '到真實資料庫找 3 篇以上，至少 1 本書' }];
  }

  /* ---------- 結案代碼 ---------- */
  var ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function code6(s) { var h = hashStr(s), out = ''; for (var i = 0; i < 6; i++) { out += ALPH[h % 32]; h = Math.floor(h / 32); } return out; }
  function closeCode(code, id) { return code6(code + '|' + normId(id) + '|S3-CLOSED'); }
  function enBadge(code, id) { return code6(code + '|' + normId(id) + '|S3-EN'); }
  function validCode(c) { return /^[A-HJ-NP-Z2-9]{6}$/.test(String(c || '')); }
  function newCode() { var s = ''; for (var i = 0; i < 6; i++) s += ALPH[Math.floor(Math.random() * 32)]; return s; }

  /* ---------- 雲端（學生頁用 REST，問完就走） ---------- */
  function cloudFetch(url, opt) {
    opt = opt || {};
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opt.timeout || 8000) : null;
    return fetch(url, { method: opt.method || 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined,
      headers: opt.body ? { 'Content-Type': 'application/json' } : undefined, body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (res) { if (timer) clearTimeout(timer); if (!res.ok) { var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; } return res.json(); },
        function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function base(code) { return CONFIG.FIREBASE_URL + '/' + CONFIG.DB + '/m/' + code; }
  function getMeta(code) { return cloudFetch(base(code) + '/meta.json'); }
  function getRec(code, id) { return cloudFetch(base(code) + '/r/' + encodeURIComponent(normId(id)) + '.json'); }
  function getGrade(code, id) { return cloudFetch(base(code) + '/g/' + encodeURIComponent(normId(id)) + '.json'); } // 老師評等（2026-10-19）
  function putRec(code, id, rec) { return cloudFetch(base(code) + '/r/' + encodeURIComponent(normId(id)) + '.json', { method: 'PUT', body: rec }); }

  var LV_KEY = /^[a-z][a-z0-9]{1,11}$/;
  function mergeProgress(a, b) {
    a = a || {}; b = b || {};
    var out = { passed: {}, att: {} }, keys = {};
    [a.passed, b.passed, a.att, b.att].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { if (LV_KEY.test(k)) keys[k] = 1; }); });
    Object.keys(keys).forEach(function (k) {
      var ta = +((a.passed || {})[k]) || 0, tb = +((b.passed || {})[k]) || 0;
      if (ta || tb) out.passed[k] = ta && tb ? Math.min(ta, tb) : (ta || tb);
      var n = Math.max(+((a.att || {})[k]) || 0, +((b.att || {})[k]) || 0);
      if (n) out.att[k] = n;
    });
    var ca = +a.closedAt || 0, cb = +b.closedAt || 0;
    if (ca || cb) out.closedAt = ca && cb ? Math.min(ca, cb) : (ca || cb);
    return out;
  }
  function toRecord(name, prog) {
    var rec = { name: String(name || '').slice(0, 12), ts: Date.now(), passed: prog.passed || {}, att: prog.att || {} };
    if (prog.closedAt) rec.closedAt = prog.closedAt;
    // 第 1 關（2026-10-18）：arc＝模擬檔案庫的卷宗與評等；clue＝線索卡
    if (prog.arc && prog.arc.q) rec.arc = { q: String(prog.arc.q).slice(0, 4), g: String(prog.arc.g || '').slice(0, 1), n: Math.min(9999, +prog.arc.n || 0), p: (prog.arc.p || []).slice(0, 4).map(function (x) { return String(x).slice(0, 12); }) };
    if (prog.clue && (prog.clue.c || []).length) {
      var cc = {}; prog.clue.c.slice(0, 6).forEach(function (c, i) { if (c && Object.keys(c).length) cc[i] = c; });
      rec.clue = { at: +prog.clue.at || Date.now(), c: cc };
      if (prog.clue.topic) rec.clue.topic = String(prog.clue.topic).slice(0, 60);
    }
    // 結案作業（2026-10-19）：p 文獻探討、r 參考文獻（只保留 <b><i><br> 的標記）、ok 系統檢查通過、ai AI 回饋
    if (prog.dos && (prog.dos.p || prog.dos.r)) {
      rec.dos = { at: +prog.dos.at || Date.now(), p: String(prog.dos.p || '').slice(0, 2500), r: String(prog.dos.r || '').slice(0, 3500), ok: !!prog.dos.ok };
      if (prog.dos.ai) rec.dos.ai = String(prog.dos.ai).slice(0, 500);
    }
    return rec;
  }

  root.SecretSource = {
    CONFIG: CONFIG, SUBJECTS: SUBJECTS, SUBJ_KEYS: SUBJ_KEYS, TYPES: TYPES, TYPE: TYPE, FIELD: FIELD,
    STROKE_SURNAMES: STROKE_SURNAMES, EN_SURNAMES: EN_SURNAMES,
    hashStr: hashStr, makeRng: makeRng, rngFor: rngFor, normId: normId, int: int, pick: pick, shuffle: shuffle, pickN: pickN,
    people: people, personName: personName, givenName: givenName, enPeople: enPeople, GEN: GEN, S: S,
    evidence: evidence, plain: plain, html: html, escapeHtml: escapeHtml,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS, settingsOf: settingsOf, levels: levels, levels1: levels1, levels2: levels2, levelsDos: levelsDos,
    closeCode: closeCode, enBadge: enBadge, validCode: validCode, newCode: newCode,
    getMeta: getMeta, getRec: getRec, getGrade: getGrade, putRec: putRec, mergeProgress: mergeProgress, toRecord: toRecord, LV_KEY: LV_KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
