/* =========================================================
   時光手稿：科學史大冒險 — 科學家知識網路資料
   ---------------------------------------------------------
   ・每位科學家是一個節點，needs 是「先攻略哪些人才會亮起」
   ・needs 全部完成才會亮起（知識要先有基礎）
   ・ready: true 代表章節已經做好可以玩
   ・videos 是 LIS 情境科學教材的 YouTube 影片 ID（只嵌入播放，不下載）
   ・x, y 是知識網路地圖上的位置（0～100）
   ========================================================= */
const SH_DATA = (() => {
  const NODES = [
    { id: 'lavoisier', name: '拉瓦節', en: 'Antoine Lavoisier', life: '1743–1794', year: 1774, x: 10, y: 50,
      tag: '質量守恆・燃燒與氧', needs: [], ready: true, color: '#e4572e',
      teaser: '金屬燒過之後為什麼反而變重了？一個用天平挑戰全世界的人。',
      videos: [
        { id: 'zFk0-oRJOuk', title: '燃燒和生鏽其實是同一件事！？（拉瓦節－氧化還原）' },
        { id: 'YAgsPrNdK1Y', title: '水火土氣真的是元素嗎？（拉瓦節－元素的定義）' }
      ] },
    { id: 'proust', name: '普魯斯特', en: 'Joseph Proust', life: '1754–1826', year: 1799, x: 26, y: 26,
      tag: '定比定律', needs: ['lavoisier'], ready: true, color: '#d08a1e',
      teaser: '不管從哪裡來的碳酸銅，成分比例都一樣？一場打了八年的筆戰。', videos: [] },
    { id: 'dalton', name: '道耳頓', en: 'John Dalton', life: '1766–1844', year: 1808, x: 40, y: 50,
      tag: '原子說', needs: ['lavoisier', 'proust'], color: '#1f9e8f',
      teaser: '如果把一滴水一直切下去，最後會剩下什麼？',
      videos: [{ id: 'fo8OnaecUac', title: '如果把一滴水對切1萬次會怎麼樣？（道耳頓－原子說）' }] },
    { id: 'gaylussac', name: '給呂薩克', en: 'Joseph Gay-Lussac', life: '1778–1850', year: 1808, x: 52, y: 22,
      tag: '氣體化合體積定律', needs: ['dalton'], color: '#2f6db5',
      teaser: '氣體反應的體積竟然是簡單整數比，這讓道耳頓很頭痛。', videos: [] },
    { id: 'avogadro', name: '亞佛加厥', en: 'Amedeo Avogadro', life: '1776–1856', year: 1811, x: 64, y: 34,
      tag: '分子說', needs: ['dalton', 'gaylussac'], color: '#7b5ea7',
      teaser: '道耳頓先生，您的原子說怪怪的喔？',
      videos: [{ id: 'WoLjMZ-d9a8', title: '道耳頓先生，您的原子說怪怪的喔？（亞佛加厥－分子說）' }] },
    { id: 'mendeleev', name: '門得列夫', en: 'Dmitri Mendeleev', life: '1834–1907', year: 1869, x: 78, y: 22,
      tag: '週期表', needs: ['avogadro'], color: '#b0413e',
      teaser: '把元素排成一張表，還敢預言「還沒被發現的元素」長什麼樣子。',
      videos: [{ id: 'H8Z7Srshbfw', title: '門得列夫怎麼發明元素週期表的！？（門得列夫－週期表）' }] },
    { id: 'thomson', name: '湯姆森', en: 'J. J. Thomson', life: '1856–1940', year: 1897, x: 56, y: 70,
      tag: '電子的發現', needs: ['dalton'], color: '#3a7d44',
      teaser: '說好的原子是最小單位呢？比原子還輕兩千倍的神祕粒子登場！',
      videos: [{ id: 'FYl8wOgvyug', title: '比原子還輕兩千倍的神祕物質登場！（湯姆森－電子發現）' }] },
    { id: 'millikan', name: '密立根', en: 'Robert Millikan', life: '1868–1953', year: 1909, x: 68, y: 88,
      tag: '油滴實驗・基本電荷', needs: ['thomson'], color: '#8a6d3b',
      teaser: '用一顆顆小油滴，量出電子帶的電量。', videos: [] },
    { id: 'rutherford', name: '拉塞福', en: 'Ernest Rutherford', life: '1871–1937', year: 1911, x: 74, y: 62,
      tag: '原子核・質子', needs: ['thomson'], color: '#c0392b',
      teaser: '像用砲彈射衛生紙，砲彈卻被彈回來了！',
      videos: [{ id: '0TTThybVbG4', title: '原子內的重量級角色現身！（拉塞福－質子發現）' }] },
    { id: 'bohr', name: '波耳', en: 'Niels Bohr', life: '1885–1962', year: 1913, x: 88, y: 50,
      tag: '原子模型・能階', needs: ['rutherford'], color: '#16708a',
      teaser: '電子繞著原子核轉，為什麼不會掉進去？', videos: [] },
    { id: 'moseley', name: '莫斯利', en: 'Henry Moseley', life: '1887–1915', year: 1913, x: 92, y: 28,
      tag: '原子序', needs: ['rutherford', 'mendeleev'], color: '#5d6d7e',
      teaser: '週期表真正的排列依據，不是原子量。', videos: [] },
    { id: 'chadwick', name: '查兌克', en: 'James Chadwick', life: '1891–1974', year: 1932, x: 90, y: 78,
      tag: '中子的發現', needs: ['rutherford'], color: '#6c3483',
      teaser: '原子中的隱藏角色，元素最大的祕密就在它身上？',
      videos: [{ id: 'mCBSpY1NsGg', title: '原子中的隱藏角色（查兌克－中子的發現）' }] }
  ];
  const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
  // 狀態：done 已攻略、open 已亮起、locked 未亮起
  const status = (id, done) => done[id] ? 'done' : (byId[id].needs.every(n => done[n]) ? 'open' : 'locked');
  // 攻略 id 之後，新亮起的節點
  const unlockedBy = (id, done) => NODES.filter(n => !done[n.id] && n.needs.includes(id) && n.needs.every(x => x === id || done[x])).map(n => n.id);
  return { NODES, byId, status, unlockedBy };
})();
