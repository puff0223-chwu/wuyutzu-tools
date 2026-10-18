/* ============================================================
 * 📜 出處失傳的秘文｜第 1 關「檔案庫搜查」（2026-10-18 第二階段）
 *  A．模擬檔案庫：每人一個專屬研究問題，在擬真的假資料庫裡搜尋、把可靠又相關的文獻收進卷宗
 *  B．線索卡（作業）：真實資料庫實戰，把自己找到的文獻填成線索卡
 *
 * 用小學生的說法：A 是「駕訓班」——在假的城市裡練開車，撞到陷阱也不會受傷，系統馬上告訴你哪裡錯；
 * B 是「上路」——到真的資料庫（中學生網站、科教館、圖書館）找文獻，記在線索卡上。
 *
 * ・檔案庫內容全部是虛構的（書名、作者、網站都是編的），只有研究問題是真的科學題目
 * ・每篇假文獻都事先標好：是哪個研究問題的、相關嗎、可靠嗎、是什麼陷阱
 * ============================================================ */
(function (root) {
  'use strict';
  var X = root.SecretSource;
  var makeRng = X.makeRng, hashStr = X.hashStr, int = X.int, pick = X.pick, shuffle = X.shuffle;

  /* ---------- 研究問題與檔案庫 ----------
   * good：相關＋可靠（書、小論文、科展、機構網頁、期刊或碩士論文）
   * trap：farm 內容農場、forum 論壇問答、wiki 維基百科內文、anon 無作者無日期網頁、yt 個人頻道影片
   * off ：可靠，但跟研究問題無關（只有部分關鍵字對上） */
  var QS = [
    { id: 'c1', s: 'chem', q: '不同濃度的醋酸對蛋殼溶解速率的影響', obj: '蛋殼', iv: '醋酸濃度', dv: '溶解速率', syn: '醋、碳酸鈣、反應速率',
      kw: ['醋酸', '蛋殼', '溶解', '碳酸鈣', '濃度', '反應速率', '醋'],
      good: { book: '化學反應速率：從廚房到實驗室', essay: '食醋濃度對蛋殼溶解速率之探討', fair: '「殼」不容緩──不同濃度醋酸對蛋殼溶解的影響', web: ['醋與蛋殼：碳酸鈣和酸的反應', '大學化學系科學教育推廣中心'], jn: ['濃度與溫度對碳酸鈣與醋酸反應速率的影響', '科學教育月刊'] },
      trap: { farm: '醋泡雞蛋竟然變成「軟蛋」？第3個步驟讓人驚呆了', forum: '急！醋為什麼可以溶解蛋殼？？明天要交報告', wiki: '碳酸鈣', anon: '我的醋泡蛋殼實驗紀錄', yt: '【實驗】把雞蛋泡在醋裡 72 小時會怎樣？' },
      off: [['book', '醋的料理百科：家常醬料一次學會'], ['essay', '蛋殼粉作為土壤改良劑對小白菜生長之研究']] },
    { id: 'c2', s: 'chem', q: '不同溫度對維生素C氧化速率的影響', obj: '果汁', iv: '溫度', dv: '維生素C的氧化速率', syn: '抗壞血酸、氧化、碘滴定',
      kw: ['維生素C', '氧化', '溫度', '抗壞血酸', '碘滴定', '果汁', '維他命C'],
      good: { book: '生活中的氧化還原', essay: '加熱溫度對果汁中維生素C含量之影響', fair: '「C」不見了──溫度與光照對維生素C氧化的探討', web: ['維生素C為什麼怕熱？談抗壞血酸的氧化', '食品科學系科普專欄'], jn: ['以碘滴定法探討溫度對抗壞血酸氧化速率之影響', '化學教育期刊'] },
      trap: { farm: '維他命C這樣吃等於白吃！營養師都不說的秘密', forum: '維他命C加熱就會消失嗎？求解', wiki: '維生素C', anon: '維C果汁加熱小實驗', yt: '維他命C錠丟進熱水會怎樣？超扯' },
      off: [['book', '維生素與健康飲食指南'], ['fair', '溫度對鐵釘生鏽速率的影響']] },
    { id: 'c3', s: 'chem', q: '不同金屬電極對水果電池電壓的影響', obj: '水果電池', iv: '電極金屬', dv: '電壓', syn: '電化學電池、伽凡尼電池、檸檬電池',
      kw: ['水果電池', '電極', '電壓', '金屬', '伽凡尼', '檸檬', '電化學', '電池'],
      good: { book: '電化學入門：電池的故事', essay: '電極材料與水果種類對水果電池電壓之影響', fair: '果「電」有力──不同金屬電極組合的水果電池研究', web: ['水果電池的原理：從伽凡尼到鋰電池', '大學應用化學系教學資源網'], jn: ['金屬活性與電極距離對水果電池輸出電壓之探討', '物理化學教學季刊'] },
      trap: { farm: '一顆檸檬就能幫手機充電？網友實測結果太驚人', forum: '水果電池為什麼燈泡不會亮？', wiki: '伽凡尼電池', anon: '水果電池 DIY 心得', yt: '用 100 顆檸檬發電！能點亮燈泡嗎？' },
      off: [['book', '檸檬的栽培與病蟲害防治'], ['essay', '廢電池回收制度之探討']] },
    { id: 'c4', s: 'chem', q: '酸鹼值對紫甘藍花青素顏色變化的影響', obj: '紫甘藍', iv: '酸鹼值', dv: '花青素的顏色', syn: '指示劑、pH、色素',
      kw: ['花青素', '酸鹼', '指示劑', '紫甘藍', 'pH', '顏色', '色素'],
      good: { book: '酸鹼與指示劑：看得見的化學', essay: '天然植物色素作為酸鹼指示劑之可行性研究', fair: '「紫」氣東來──紫甘藍花青素在不同酸鹼值下的顏色變化', web: ['廚房裡的指示劑：花青素的變色秘密', '師範大學化學系科學教育中心'], jn: ['花青素結構與酸鹼值之關係：以紫甘藍萃取液為例', '中等教育化學通訊'] },
      trap: { farm: '紫高麗菜汁會變色！看完這篇你一定想試試', forum: '紫甘藍汁為什麼會變綠色？？', wiki: '花青素', anon: '紫甘藍變色好好玩', yt: '神奇變色魔術！紫色高麗菜汁大挑戰' },
      off: [['book', '紫甘藍料理 50 道'], ['fair', '土壤酸鹼值對繡球花花色的影響']] },
    { id: 'p1', s: 'phy', q: '輪胎胎紋對四驅車摩擦力與速度的影響', obj: '四驅車', iv: '胎紋形狀', dv: '摩擦力與速度', syn: '輪胎、摩擦係數、抓地力',
      kw: ['四驅車', '胎紋', '摩擦力', '輪胎', '速度', '摩擦係數', '抓地力'],
      good: { book: '力學原理與生活應用', essay: '輪胎胎紋與材質對四驅車行駛速度之影響', fair: '「紋」風不動──胎紋形狀對四驅車摩擦力的探討', web: ['輪胎為什麼要有胎紋？摩擦力的科學', '大學機械系科普教育網'], jn: ['橡膠輪胎胎紋與接觸面摩擦係數之實驗研究', '物理教育學刊'] },
      trap: { farm: '四驅車改這裡速度暴增！老玩家私藏改裝術', forum: '四驅車換什麼輪胎最快？在線等', wiki: '摩擦力', anon: '我的四驅車改裝日記', yt: '四驅車輪胎大比拼！哪一款最快？' },
      off: [['book', '汽車保養與維修手冊'], ['essay', '跑鞋鞋底紋路對運動表現之調查']] },
    { id: 'p2', s: 'phy', q: '杯子材質對熱飲降溫速率的影響', obj: '熱飲', iv: '杯子材質', dv: '降溫速率', syn: '熱傳導、保溫、牛頓冷卻定律',
      kw: ['杯子', '材質', '降溫', '熱傳導', '保溫', '牛頓冷卻', '散熱', '熱飲'],
      good: { book: '熱學：溫度與熱的故事', essay: '不同材質杯子對熱水降溫速率之研究', fair: '「杯」中有熱──杯子材質與杯蓋對熱飲降溫的影響', web: ['為什麼保溫杯可以保溫？談熱的傳播', '大學物理系科學推廣網'], jn: ['以牛頓冷卻定律探討容器材質對液體降溫之影響', '物理教育學刊'] },
      trap: { farm: '用錯杯子喝熱水等於喝毒？專家緊急提醒', forum: '馬克杯跟紙杯哪個比較保溫？', wiki: '熱傳導', anon: '保溫杯實測心得', yt: '十款保溫杯開箱實測！第一名竟然是…' },
      off: [['book', '陶瓷杯彩繪技法'], ['fair', '冰塊形狀對融化速率的影響']] },
    { id: 'p3', s: 'phy', q: '機翼形狀對紙飛機飛行距離的影響', obj: '紙飛機', iv: '機翼形狀', dv: '飛行距離', syn: '升力、空氣動力學、滑翔',
      kw: ['紙飛機', '機翼', '飛行距離', '升力', '空氣動力', '滑翔', '飛行'],
      good: { book: '飛行的原理：從紙飛機到噴射機', essay: '機翼形狀與摺法對紙飛機飛行距離之探討', fair: '「翼」飛衝天──機翼面積與後掠角對紙飛機飛行的影響', web: ['紙飛機為什麼會飛？升力與阻力', '大學航太工程系科普網'], jn: ['紙飛機翼型對滑翔比與飛行距離之影響', '科學教育研究'] },
      trap: { farm: '世界紀錄紙飛機摺法曝光！飛超過 60 公尺', forum: '怎麼摺紙飛機才會飛最遠？', wiki: '紙飛機', anon: '紙飛機摺法大全', yt: '史上最強紙飛機！飛到隔壁教室' },
      off: [['book', '摺紙藝術入門'], ['essay', '無人機在農業噴藥之應用調查']] },
    { id: 'p4', s: 'phy', q: '線圈匝數對電磁鐵磁力的影響', obj: '電磁鐵', iv: '線圈匝數', dv: '磁力', syn: '電流磁效應、螺線管、磁場',
      kw: ['電磁鐵', '線圈', '匝數', '磁力', '電流', '螺線管', '磁場'],
      good: { book: '電與磁：看不見的力量', essay: '線圈匝數與電流大小對電磁鐵吸力之影響', fair: '「磁」力全開──線圈匝數與鐵芯材質對電磁鐵磁力的探討', web: ['電磁鐵的原理：電流的磁效應', '大學電機系科學教育網'], jn: ['螺線管匝數與磁場強度關係之教學實驗', '物理教育學刊'] },
      trap: { farm: '自製超強電磁鐵！一招吸起整台腳踏車', forum: '電磁鐵怎麼做才會比較強？', wiki: '電磁鐵', anon: '電磁鐵 DIY 筆記', yt: '超強電磁鐵吸起機車！？' },
      off: [['book', '磁療保健大全'], ['fair', '磁鐵形狀對指北針偏轉的影響']] },
    { id: 'b1', s: 'bio', q: '不同酸鹼值的土壤對綠豆發芽率的影響', obj: '綠豆', iv: '土壤酸鹼值', dv: '發芽率', syn: '種子萌發、pH、酸性土壤',
      kw: ['綠豆', '發芽', '土壤', '酸鹼', 'pH', '種子', '萌發'],
      good: { book: '植物生理學入門', essay: '土壤酸鹼值對綠豆種子萌發之影響', fair: '「豆」陣酸鹼──不同酸鹼值環境對綠豆發芽與生長的影響', web: ['種子怎麼發芽？談影響萌發的環境因素', '大學農藝系科普教育網'], jn: ['酸性土壤對豆科種子萌發率之影響', '植物科學教育期刊'] },
      trap: { farm: '綠豆這樣泡發芽率 100%！阿嬤的秘方', forum: '綠豆為什麼都不發芽？要加什麼？', wiki: '綠豆', anon: '綠豆發芽觀察日記', yt: '綠豆 7 天發芽縮時攝影' },
      off: [['book', '綠豆湯與傳統甜品'], ['essay', '酸雨對校園建築物侵蝕之調查']] },
    { id: 'b2', s: 'bio', q: '溫度對酵母菌發酵速率的影響', obj: '酵母菌', iv: '溫度', dv: '發酵速率', syn: '二氧化碳、無氧呼吸、麵團',
      kw: ['酵母菌', '發酵', '溫度', '二氧化碳', '無氧呼吸', '麵團', '酵母'],
      good: { book: '微生物的世界', essay: '溫度與糖濃度對酵母菌發酵產氣量之研究', fair: '「酵」力全開──溫度對酵母菌發酵速率的影響', web: ['酵母菌怎麼讓麵包膨脹？', '大學食品科學系科普網'], jn: ['溫度對釀酒酵母二氧化碳生成速率之影響', '生物學教育季刊'] },
      trap: { farm: '麵包發不起來？原來是這個步驟錯了', forum: '酵母菌要幾度才會發酵？', wiki: '酵母', anon: '自製麵包失敗紀錄', yt: '酵母菌吹氣球實驗！超神奇' },
      off: [['book', '烘焙新手的第一本書'], ['fair', '溫度對蟋蟀鳴叫頻率的影響']] },
    { id: 'b3', s: 'bio', q: '光的顏色對水蘊草光合作用的影響', obj: '水蘊草', iv: '光的顏色', dv: '光合作用速率', syn: '色光、波長、氧氣產生量',
      kw: ['水蘊草', '光合作用', '光的顏色', '色光', '氧氣', '波長', '光'],
      good: { book: '植物與光', essay: '不同色光對水蘊草光合作用產氧量之影響', fair: '「光」怪陸離──色光與光強度對水蘊草光合作用的探討', web: ['植物喜歡什麼顏色的光？葉綠素的吸收光譜', '大學生命科學系科學教育網'], jn: ['光波長對沉水植物光合作用速率之影響', '生物學教育季刊'] },
      trap: { farm: '植物燈買錯等於白買！這種顏色最好', forum: '光合作用需要什麼顏色的光？', wiki: '光合作用', anon: '水草缸燈光心得', yt: '紅光藍光綠光種菜大PK' },
      off: [['book', '水族造景入門'], ['essay', '藍光對學生睡眠品質影響之調查']] },
    { id: 'b4', s: 'bio', q: '洗手方式對手部細菌數量的影響', obj: '手部細菌', iv: '洗手方式', dv: '細菌數量', syn: '菌落數、肥皂、酒精消毒',
      kw: ['洗手', '細菌', '肥皂', '酒精', '菌落', '消毒', '手部'],
      good: { book: '看不見的鄰居：細菌與我們', essay: '不同洗手方式對手部菌落數之影響', fair: '「手」護健康──洗手時間與清潔劑對手部細菌數的影響', web: ['正確洗手五步驟：為什麼要搓 20 秒？', '大學公共衛生學系衛教網'], jn: ['肥皂與酒精乾洗手對手部菌落數減少效果之比較', '衛生教育學刊'] },
      trap: { farm: '你的手機比馬桶還髒？這樣洗手才有用', forum: '酒精跟肥皂哪個洗手比較乾淨？', wiki: '洗手', anon: '洗手實驗小報告', yt: '手上細菌培養 7 天！看完不敢不洗手' },
      off: [['book', '手部保養與美甲'], ['fair', '不同材質砧板的細菌殘留比較']] },
    { id: 'g1', s: 'geo', q: '校園不同地表材質的夏季溫度差異', obj: '校園地表', iv: '地表材質', dv: '地表溫度', syn: '都市熱島、柏油、草地',
      kw: ['地表', '溫度', '材質', '熱島', '柏油', '草地', '校園'],
      good: { book: '都市氣候與熱島效應', essay: '校園不同地表鋪面之夏季溫度比較', fair: '「地」表熱力學──校園鋪面材質與遮蔭對地表溫度的影響', web: ['城市為什麼比鄉下熱？認識都市熱島', '大學大氣科學系科普網'], jn: ['不同鋪面材質之表面溫度與熱島效應研究', '地理教育學刊'] },
      trap: { farm: '夏天柏油路可以煎蛋？實測結果超驚人', forum: '草地跟水泥地哪個比較熱？', wiki: '熱島效應', anon: '校園溫度測量心得', yt: '50 度柏油路煎蛋挑戰！' },
      off: [['book', '校園植物圖鑑'], ['essay', '學生夏季服裝材質偏好調查']] },
    { id: 'g2', s: 'geo', q: '坡度對土壤侵蝕量的影響', obj: '土壤', iv: '坡度', dv: '侵蝕量', syn: '地表逕流、水土保持、沖蝕',
      kw: ['坡度', '侵蝕', '土壤', '逕流', '水土保持', '沖蝕', '山坡'],
      good: { book: '水土保持概論', essay: '坡度與植被對土壤侵蝕量之模擬實驗', fair: '「坡」不及待──坡度與降雨強度對土壤侵蝕的探討', web: ['山坡地為什麼會崩塌？認識土壤侵蝕', '大學水土保持學系科普網'], jn: ['坡度與覆蓋度對土壤沖蝕量之影響', '地球科學教育季刊'] },
      trap: { farm: '颱風天住山上危險！這些地方千萬別去', forum: '為什麼山坡地容易土石流？', wiki: '土壤侵蝕', anon: '山坡土壤小實驗', yt: '土石流有多可怕？實拍畫面' },
      off: [['book', '山坡地果樹栽培'], ['fair', '坡度對自行車下坡速度的影響']] },
    { id: 'g3', s: 'geo', q: '顆粒大小對沉積物沉降速率的影響', obj: '沉積物', iv: '顆粒大小', dv: '沉降速率', syn: '粒徑、斯托克斯定律、河流搬運',
      kw: ['沉積物', '沉降', '顆粒', '粒徑', '河流', '沉積', '斯托克斯'],
      good: { book: '沉積學入門', essay: '粒徑對沉積物沉降速度之實驗探討', fair: '「沉」得住氣──顆粒大小與形狀對沉積物沉降速率的影響', web: ['河流怎麼搬運沙子？沉積物的故事', '大學地質科學系科普網'], jn: ['以斯托克斯定律探討粒徑與沉降速率之關係', '地球科學教育季刊'] },
      trap: { farm: '河邊撿到的石頭竟然價值百萬？', forum: '為什麼大石頭沉得比較快？', wiki: '沉積物', anon: '沙子沉降觀察', yt: '泥沙分層實驗超療癒' },
      off: [['book', '寶石與礦物鑑賞'], ['essay', '河川垃圾分布之調查']] },
    { id: 'g4', s: 'geo', q: '海水溫度對颱風強度的影響', obj: '颱風', iv: '海水溫度', dv: '颱風強度', syn: '海溫、熱帶氣旋、潛熱',
      kw: ['颱風', '海水溫度', '海溫', '強度', '熱帶氣旋', '氣象', '潛熱'],
      good: { book: '颱風：大氣中的巨獸', essay: '西北太平洋海表溫度與颱風強度之關係', fair: '「風」起雲湧──海水表面溫度與颱風增強的關聯分析', web: ['颱風的能量從哪裡來？', '大學大氣科學系科普網'], jn: ['海洋熱含量與颱風快速增強之關係', '大氣科學教育通訊'] },
      trap: { farm: '超級颱風要來了？氣象專家都不敢說的真相', forum: '颱風為什麼都在夏天？', wiki: '颱風', anon: '我的颱風觀測筆記', yt: '颱風眼內部長怎樣？驚人畫面' },
      off: [['book', '颱風天防災手冊'], ['fair', '溫度對海水鹽度測量的影響']] }
  ];
  var Q = {}; QS.forEach(function (q) { Q[q.id] = q; });

  // 來源類型（篩選器用的分類 → 顯示名稱）
  var KIND = {
    book: { name: '書籍', cat: 'book', icon: '📕' }, essay: { name: '小論文', cat: 'essay', icon: '📝' }, fair: { name: '科展作品', cat: 'fair', icon: '🏅' },
    web: { name: '網頁', cat: 'web', icon: '🌐' }, jn: { name: '期刊論文', cat: 'jn', icon: '📘' }, th: { name: '碩士論文', cat: 'th', icon: '🎓' },
    farm: { name: '網頁', cat: 'web', icon: '🌐' }, forum: { name: '網頁', cat: 'web', icon: '🌐' }, wiki: { name: '網頁', cat: 'web', icon: '🌐' },
    anon: { name: '網頁', cat: 'web', icon: '🌐' }, yt: { name: '影片', cat: 'yt', icon: '🎬' }
  };
  var CATS = [['', '全部類型'], ['book', '書籍'], ['essay', '小論文'], ['fair', '科展作品'], ['jn', '期刊論文'], ['web', '網頁'], ['yt', '影片']];

  // 調查員筆記（收錯的時候說明為什麼）
  var NOTE = {
    farm: '內容農場：標題聳動、大量轉貼、沒有作者也沒有出處，小論文不能用。',
    forum: '論壇／問答網站：小論文規定「嚴禁引用」，收進卷宗就直接不及格。',
    wiki: '維基百科內文任何人都能改，不建議直接引用；可以看它最下面列的參考文獻，再去找原始文獻。',
    anon: '沒有作者、沒有日期：不知道是誰寫的、什麼時候寫的，可靠度很低。',
    yt: '個人頻道的影片沒有經過審核，可靠度比較低；而且小論文的參考文獻不能全部是網路資源。',
    off: '這篇只有部分關鍵字對上，內容和你的研究問題無關。'
  };

  var SURN = ['王', '李', '林', '陳', '黃', '張', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '周', '賴', '徐', '葉'];
  var GIV = ['志明', '雅婷', '冠宇', '怡君', '家豪', '佩珊', '俊傑', '思穎', '柏翰', '宜蓁', '承恩', '子晴', '宗翰', '欣妤', '彥廷', '品妍', '育誠', '詩涵'];
  var PUBS = ['青林科學出版社', '藍海文化', '五南圖書', '遠流科普館', '曉明書局', '天下科學', '木鐸書房', '南天書局'];
  var FARMS = ['每日驚奇網', '生活好好玩', '爆料新鮮事', '健康知多少'];
  var CHANS = ['阿傑愛實驗', '小胖科學秀', '實驗狂人 Leo', '好奇寶寶頻道'];
  var NICK = ['小熊熊123', '路過的高中生', 'Momo醬', '吃貨阿凱', '熬夜考生'];
  var NOW_Y = 2026;

  /* ---------- 建立整個檔案庫（全班共用，固定種子） ---------- */
  var CACHE = {};
  function buildDB(subjects) {
    var key = (subjects || []).slice().sort().join(',');
    if (CACHE[key]) return CACHE[key];
    var docs = [];
    QS.forEach(function (q) {
      if (subjects && subjects.length && subjects.indexOf(q.s) < 0) return;
      var r = makeRng(hashStr('S1-DB|' + q.id));
      var person = function () { return pick(r, SURN) + pick(r, GIV); };
      var people = function (n) { var a = []; while (a.length < n) { var p = person(); if (a.indexOf(p) < 0) a.push(p); } return a; };
      var k = q.kw, add = function (d) { d.q = q.id; d.id = q.id + '-' + d.role; docs.push(d); };
      var g = q.good;
      add({ role: 'book', kind: 'book', rel: 1, ok: 1, title: g.book, au: people(int(r, 1, 2)), yr: int(r, 2014, 2024), src: pick(r, PUBS),
        abs: '本書從生活現象出發，介紹' + k[0] + '、' + k[1] + '與' + k[3] + '的基本原理，並以「' + q.q + '」這類實驗為例，說明如何控制變因、設計對照組與記錄數據。書末附有參考文獻與延伸閱讀。' });
      var batch = int(r, 110, 114);
      add({ role: 'essay', kind: 'essay', rel: 1, ok: 1, title: g.essay, au: people(int(r, 2, 3)), yr: batch + 1911, src: '中學生網站｜第' + batch + pick(r, ['0315', '1031']) + '梯次 小論文（' + X.SUBJECTS[q.s].essay + '）',
        abs: '本研究探討' + q.iv + '對' + q.dv + '的影響。以' + q.obj + '為材料，設計不同' + q.iv + '的實驗組，測量' + q.dv + '並比較差異。結果發現' + q.iv + '與' + q.dv + '有明顯關係，文末引用了 5 篇參考文獻。' });
      var th = int(r, 56, 65);
      add({ role: 'fair', kind: 'fair', rel: 1, ok: 1, title: g.fair, au: people(int(r, 2, 3)), yr: th + 1960, src: '國立臺灣科學教育館｜中華民國第' + th + '屆中小學科學展覽會（高級中等學校組 ' + X.SUBJECTS[q.s].fair + '）',
        abs: '研究動機來自課本中的' + k[3] + '單元。我們改變' + q.iv + '，觀察' + q.obj + '的' + q.dv + '，每組重複三次取平均，並討論誤差來源與改進方法。' });
      add({ role: 'web', kind: 'web', rel: 1, ok: 1, title: g.web[0], au: [person()], yr: int(r, 2018, 2025), src: g.web[1],
        abs: '由大學教授撰寫的科普文章，說明' + k[0] + '與' + k[1] + '背後的科學原理，以及' + k[2] + '的影響因素。文章標明作者、發布日期，文末附有參考資料。' });
      if (r() < 0.6) add({ role: 'jn', kind: 'jn', rel: 1, ok: 1, title: g.jn[0], au: people(int(r, 2, 3)), yr: int(r, 2010, 2023), src: g.jn[1] + '，第' + int(r, 20, 48) + '卷第' + int(r, 1, 4) + '期',
        abs: '本研究以實驗方法探討' + k[0] + '與' + k[1] + '的關係。研究控制' + k[3] + '等變因，結果顯示' + q.iv + '會影響' + q.dv + '。本文經同儕審查刊登。' });
      else add({ role: 'th', kind: 'th', rel: 1, ok: 1, title: g.jn[0], au: [person()], yr: int(r, 2010, 2023), src: '國立' + pick(r, ['臺灣師範', '彰化師範', '高雄師範']) + '大學' + X.SUBJECTS[q.s].name + '研究所 碩士論文',
        abs: '本論文以實驗方法探討' + k[0] + '與' + k[1] + '的關係，控制' + k[3] + '等變因，並與過去文獻比較。結果顯示' + q.iv + '會影響' + q.dv + '。' });
      var t = q.trap;
      add({ role: 'farm', kind: 'farm', rel: 0, ok: 0, trap: 'farm', title: t.farm, au: ['小編'], yr: int(r, 2019, 2025), src: pick(r, FARMS),
        abs: '你一定不知道！' + k[0] + '和' + k[1] + '竟然有這種關係，網友看完都嚇傻了……（文章下方有 12 則廣告、沒有附任何出處）' });
      add({ role: 'forum', kind: 'forum', rel: 1, ok: 0, trap: 'forum', title: t.forum, au: [pick(r, NICK)], yr: int(r, 2012, 2025), src: '知識問答網｜最佳解答',
        abs: '提問：' + t.forum + '　最佳解答（網友 ' + pick(r, NICK) + '）：' + k[0] + '會影響' + k[1] + '啦，我之前做過，應該是這樣吧，有錯請指正。' });
      add({ role: 'wiki', kind: 'wiki', rel: 1, ok: 0, trap: 'wiki', title: '維基百科：' + t.wiki, au: ['多人共同編輯'], yr: NOW_Y - 1, src: '維基百科，自由的百科全書',
        abs: t.wiki + '是……（條目內容任何人都可以編輯）。本條目介紹' + k[0] + '、' + k[3] + '等相關知識，頁面最下方列有參考文獻。' });
      add({ role: 'anon', kind: 'anon', rel: 1, ok: 0, trap: 'anon', title: t.anon, au: [], yr: 0, src: '個人網頁（無作者、無日期）',
        abs: '今天在家做了' + k[0] + '和' + k[1] + '的實驗，結果好像跟網路上說的不太一樣，不過應該差不多。（網頁沒有作者、日期與參考資料）' });
      add({ role: 'yt', kind: 'yt', rel: 1, ok: 0, trap: 'yt', title: t.yt, au: [pick(r, CHANS)], yr: int(r, 2020, 2025), src: 'YouTube｜個人頻道',
        abs: '影片實測' + k[0] + '和' + k[1] + '，觀看次數 ' + int(r, 3, 90) + ' 萬次。影片說明欄沒有列出任何資料來源。' });
      q.off.forEach(function (o, i) {
        add({ role: 'off' + i, kind: o[0], rel: 0, ok: 1, trap: 'off', title: o[1], au: people(int(r, 1, 2)), yr: int(r, 2012, 2024),
          src: o[0] === 'book' ? pick(r, PUBS) : o[0] === 'essay' ? '中學生網站｜小論文' : '國立臺灣科學教育館｜科展作品',
          abs: '本' + (o[0] === 'book' ? '書' : '研究') + '主題是「' + o[1].replace(/：.*/, '') + '」，內容提到' + k[pick(r, [0, 1])] + '，但重點不在' + q.iv + '與' + q.dv + '的關係。' });
      });
    });
    docs.forEach(function (d) { d.cat = KIND[d.kind].cat; d.text = (d.title + ' ' + d.abs + ' ' + d.src).toLowerCase(); });
    CACHE[key] = docs;
    return docs;
  }

  /* ---------- 每位學生的研究問題 ---------- */
  function question(code, id, subjects) {
    var list = QS.filter(function (q) { return !subjects || !subjects.length || subjects.indexOf(q.s) >= 0; });
    if (!list.length) list = QS;
    return pick(X.rngFor(code, id, 'S1A'), list);
  }

  /* ---------- 搜尋 ----------
   * terms：用空白、逗號、頓號分開的關鍵字；op：'and' 全部都要有、'or' 有一個就好 */
  function terms(qs) { return String(qs || '').toLowerCase().split(/[\s,，、;；+]+|\band\b|\bor\b/).map(function (t) { return t.trim(); }).filter(function (t) { return t; }).slice(0, 6); }
  function search(db, qs, op, cat, years) {
    var ts = terms(qs); if (!ts.length) return [];
    var out = [];
    db.forEach(function (d) {
      if (cat && d.cat !== cat) return;
      if (years && d.yr && d.yr < NOW_Y - years) return;
      if (years && !d.yr) return;
      var hit = ts.filter(function (t) { return d.text.indexOf(t) >= 0; }).length;
      if (op === 'or' ? hit > 0 : hit === ts.length) out.push({ d: d, s: hit * 10 + (d.title.toLowerCase().indexOf(ts[0]) >= 0 ? 3 : 0) + (d.yr % 7) / 10 });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 15).map(function (o) { return o.d; });
  }

  /* ---------- 卷宗鑑定 ----------
   * 過關：收 4 篇；至少 3 篇「相關＋可靠」；其中至少 1 篇書籍；不能有論壇問答、內容農場
   * 評等：S＝4 篇全對而且搜尋 ≤ 8 次；A＝過關而且（4 篇全對或搜尋 ≤ 15 次）；B＝過關 */
  var NEED = 4;
  function judge(qid, picks, db, searches) {
    var byId = {}; db.forEach(function (d) { byId[d.id] = d; });
    var items = (picks || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var res = items.map(function (d) {
      var good = d.q === qid && d.rel && d.ok;
      var why = good ? '' : d.q !== qid ? NOTE.off : NOTE[d.trap] || NOTE.off;
      return { id: d.id, good: !!good, fatal: d.trap === 'forum' || d.trap === 'farm', why: why };
    });
    var nGood = res.filter(function (x) { return x.good; }).length;
    var book = items.some(function (d) { return d.q === qid && d.kind === 'book' && d.ok && d.rel; });
    var fatal = res.some(function (x) { return x.fatal; });
    var msgs = [];
    if (items.length < NEED) msgs.push('卷宗要收滿 ' + NEED + ' 篇（現在 ' + items.length + ' 篇）');
    if (fatal) msgs.push('卷宗裡有論壇問答或內容農場，小論文不能用');
    if (nGood < 3) msgs.push('「跟研究問題相關又可靠」的文獻至少要 3 篇（現在 ' + nGood + ' 篇）');
    if (!book) msgs.push('至少要有 1 篇和研究問題相關的書籍（小論文的參考文獻不能全部是網路資源）');
    var ok = !msgs.length;
    var grade = !ok ? '' : nGood === NEED && searches <= 8 ? 'S' : (nGood === NEED || searches <= 15) ? 'A' : 'B';
    return { ok: ok, grade: grade, nGood: nGood, items: res, msgs: msgs };
  }

  /* ======================= 第 1 關 B：線索卡 ======================= */
  // 實戰主題庫：選真實資料庫（中學生網站、科教館、圖書館）確定找得到中文文獻的題目
  var TOPICS = {
    phy: ['四驅車的速度與摩擦力', '紙飛機的飛行', '隔熱材料與保溫', '太陽能電池的發電效率', '聲音的共振', '光的折射與色散', '單擺與週期運動', '電磁鐵與電磁感應'],
    chem: ['天然酸鹼指示劑', '水果電池', '金屬的生鏽與防鏽', '維生素C的檢測', '硬水與軟水', '塑膠微粒', '食品添加物（防腐劑）', '結晶的生長'],
    bio: ['酵母菌的發酵', '種子發芽的影響因素', '植物的向光性', '洗手與細菌', '光合作用', '蚯蚓與土壤', '豐年蝦的孵化', '校園植物多樣性'],
    geo: ['都市熱島效應', '土壤侵蝕與水土保持', '颱風', '空氣品質與懸浮微粒（PM2.5）', '地震與土壤液化', '河流的沉積作用', '月相觀測', '岩石的風化']
  };
  function topicLines(s) { return String(s || '').split(/[\n,，、]+/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 30); }
  // 主題分派：rand 依科目隨機（預設）、teacher 老師指定（多個主題時依學號平均分）、self 學生自選
  function topicMode(meta) { var m = meta && meta.tmode; return m === 'teacher' || m === 'self' ? m : 'rand'; }
  function topicFor(code, id, meta) {
    var mode = topicMode(meta), subj = X.settingsOf(meta).subjects;
    if (mode === 'self') return '';
    if (mode === 'teacher') { var list = topicLines(meta.topics); if (list.length) return list[hashStr(code + '|' + X.normId(id) + '|T') % list.length]; }
    var all = []; subj.forEach(function (s) { TOPICS[s].forEach(function (t) { all.push(t); }); });
    return pick(X.rngFor(code, id, 'S1B'), all);
  }

  // 線索卡的文獻類型
  var CTYPES = [
    { k: 'book', n: '書籍', web: 0 }, { k: 'essay', n: '小論文（中學生網站）', web: 1 }, { k: 'fair', n: '科展作品（科教館）', web: 1 },
    { k: 'web', n: '網路資源（網頁）', web: 1 }, { k: 'yt', n: 'YouTube 影片', web: 1 }, { k: 'journal', n: '期刊論文', web: 0 },
    { k: 'thesis', n: '博碩士論文', web: 0 }, { k: 'news', n: '報紙', web: 0 }, { k: 'gov', n: '政府出版品', web: 0 },
    { k: 'en', n: '英文文獻（期刊或書籍）', web: 0 }, { k: 'forum', n: '論壇／問答網站', web: 1 }
  ];
  var CT = {}; CTYPES.forEach(function (c) { CT[c.k] = c; });
  var NEED_URL = { essay: 1, fair: 1, web: 1, yt: 1 };
  var MIN_CARDS = 3, MAX_CARDS = 6;
  // 欄位：au 作者、yr 年份、ti 篇名／書名、src 出處（出版者、期刊名、網站名、系所）、vp 卷期頁碼、url 網址或 DOI、why 跟題目的關係
  function checkCard(c) {
    var p = [];
    if (!c || !CT[c.t]) return ['請選文獻類型'];
    if (c.t === 'forum') p.push('論壇／問答網站不能當參考文獻（小論文嚴禁引用），換一篇吧');
    if (!String(c.au || '').trim()) p.push('作者沒填（網頁沒有作者時，填網站或機構名稱）');
    if (!/^(19|20)\d{2}$/.test(String(c.yr || '').trim())) p.push('年份要填西元年 4 位數（民國年＋1911）');
    if (String(c.ti || '').trim().length < 2) p.push('篇名或書名沒填');
    if (!String(c.src || '').trim()) p.push(c.t === 'book' ? '出版者沒填' : c.t === 'journal' ? '期刊名稱沒填' : '出處沒填（網站、學校或出版單位）');
    if (c.t === 'journal' && !String(c.vp || '').trim()) p.push('期刊要填卷期與頁碼');
    if (NEED_URL[c.t] && !/^https?:\/\/\S+\.\S+/.test(String(c.url || '').trim())) p.push('要填網址（https:// 開頭，從網頁直接複製）');
    if (String(c.why || '').trim().length < 6) p.push('「跟我的題目有什麼關係」寫一句話（至少 6 個字）');
    return p;
  }
  function checkClues(clue) {
    var cards = (clue && clue.c) || [], per = cards.map(checkCard), msgs = [];
    var filled = cards.filter(function (c) { return c && c.t; });
    if (clue && clue.self && String(clue.topic || '').trim().length < 2) msgs.push('先寫下你自選的研究主題');
    if (filled.length < MIN_CARDS) msgs.push('至少要 ' + MIN_CARDS + ' 張線索卡（現在 ' + filled.length + ' 張）');
    if (!filled.some(function (c) { return CT[c.t] && !CT[c.t].web; })) msgs.push('至少要 1 篇書籍（或期刊、博碩士論文、報紙、政府出版品）：小論文和科展作品都是網站上取得的，評審可能當成網路資源，全部來自網路會被判不予評審');
    if (filled.some(function (c) { return c.t === 'forum'; })) msgs.push('有論壇／問答網站，小論文嚴禁引用');
    var bad = per.filter(function (p) { return p.length; }).length;
    if (bad) msgs.push(bad + ' 張線索卡還有欄位要補');
    return { ok: !msgs.length, msgs: msgs, cards: per };
  }
  // 存雲端前整理（長度限制和規則一致）
  var LIM = { t: 10, au: 120, yr: 4, ti: 200, src: 120, vp: 60, url: 300, why: 200 };
  function cleanCard(c) { var o = {}; Object.keys(LIM).forEach(function (k) { var v = String((c && c[k]) || '').trim().slice(0, LIM[k]); if (v) o[k] = v; }); return o; }

  /* ---------- DOI 查詢（Crossref 公開資料庫，免費、瀏覽器直接查） ---------- */
  function doiOf(s) { var m = String(s || '').match(/10\.\d{4,9}\/[^\s]+/); return m ? m[0].replace(/[.,;)]+$/, '') : ''; }
  function lookupDOI(doi) {
    return fetch('https://api.crossref.org/works/' + encodeURIComponent(doi)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      var m = j.message || {}, dp = (m.issued && m.issued['date-parts'] && m.issued['date-parts'][0]) || [];
      return {
        title: (m.title || [])[0] || '', year: dp[0] ? String(dp[0]) : '', journal: (m['container-title'] || [])[0] || '',
        authors: (m.author || []).map(function (a) { return (a.family || '') + (a.given ? ', ' + a.given.split(/[\s-]+/).map(function (g) { return g[0] + '.'; }).join(' ') : ''); }),
        vol: m.volume || '', iss: m.issue || '', page: m.page || ''
      };
    });
  }

  root.SecretSourceS1 = {
    QS: QS, Q: Q, KIND: KIND, CATS: CATS, NOTE: NOTE, NEED: NEED, NOW_Y: NOW_Y,
    buildDB: buildDB, question: question, terms: terms, search: search, judge: judge,
    TOPICS: TOPICS, topicLines: topicLines, topicMode: topicMode, topicFor: topicFor,
    CTYPES: CTYPES, CT: CT, MIN_CARDS: MIN_CARDS, MAX_CARDS: MAX_CARDS, checkCard: checkCard, checkClues: checkClues, cleanCard: cleanCard, LIM: LIM,
    doiOf: doiOf, lookupDOI: lookupDOI
  };
})(typeof window !== 'undefined' ? window : globalThis);
