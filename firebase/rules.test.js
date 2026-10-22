/* Firebase 規則自動測試（不連網路，用 targaryen 模擬 Firebase 判斷規則）
   用法：npm i targaryen@3.1.0 → python3 firebase/build_rules.py → node firebase/rules.test.js
   每次改規則都跑一次：全部 ✅ 才貼到 Firebase */
const path = require('path');
const t = require(process.env.TARGARYEN || 'targaryen');
const rules = require(path.join(__dirname, '..', 'firebase-rules.json'));

const U = (uid, email, verified) => ({ uid, provider: 'password', token: { email, email_verified: !!verified } });
const MAIN = U('MAIN', 'puff0223@gmail.com', true);
const MAIN_UNVERIFIED = U('FAKE', 'puff0223@gmail.com', false);
const SEAT = U('OLDSEAT', 'puff0223+seat@gmail.com', false);
const GPS = U('OLDGPS', 'puff0223+gps@gmail.com', false);
const EXCEL = U('OLDEXCEL', 'puff0223+excel@gmail.com', false);
const TEA = U('TEA', 'tea@school.edu.tw', true);      // 核准、開通座位與 excel
const NOAPP = U('NOAPP', 'no@school.edu.tw', true);   // 核准但沒開通座位
const OFF = U('OFF', 'off@school.edu.tw', true);      // 停用
const STRANGER = U('BAD', 'bad@evil.com', true);

const base = {
  staff: {
    TEA: { email: 'tea@school.edu.tw', name: 'T', school: 'S', purpose: 'p', want: { seat: true }, at: 1, status: 'approved', apps: { seat: true, excel: true, gps: true } },
    NOAPP: { email: 'no@school.edu.tw', name: 'N', school: 'S', purpose: 'p', want: { seat: true }, at: 1, status: 'approved', apps: { excel: true } },
    OFF: { email: 'off@school.edu.tw', name: 'O', school: 'S', purpose: 'p', want: { excel: true }, at: 1, status: 'disabled' }
  },
  seating: {
    classes: { clsseat001: { owner: 'OLDSEAT', name: 'A' }, clstea0001: { owner: 'TEA', name: 'B' } },
    rounds: { ABCDEF: { meta: { owner: 'OLDSEAT', open: true, deadline: 9e12 } } }
  },
  orienteering: {
    banks: { bkold001: { owner: 'OLDGPS', name: 'x' } },
    photos: { abcdefgh12: { owner: 'OLDGPS', data: 'data:image/jpeg;base64,xx' } },
    runs: { QWERTY: { meta: { owner: 'OLDGPS', status: 'ended' } } },
    contrib: { ZXCVBN: { meta: { owner: 'OLDGPS', open: false } } }
  },
  'excel-rescue-t': {
    AAAAAA: { meta: { owner: 'OLDEXCEL', at: 1, admin: true } },
    BBBBBB: { meta: { owner: 'TEA', at: 1 } },
    CCCCCC: { meta: { owner: 'OFF', at: 1 } }
  },
  'excel-rescue': { '115-1': { S001: { name: 'a', ts: 1 } } }
};
const withXfer = Object.assign({}, base, { xfer: { OLDSEAT: true, OLDGPS: true, OLDEXCEL: true } });
const ZOO = U('ZOO', 'Zoo@dssh.tyc.edu.tw', true), ZOO_UNV = U('ZOO', 'zoo@dssh.tyc.edu.tw', false);
const withPre = Object.assign({}, base, { staffpre: { 'zoo@dssh,tyc,edu,tw': { email: 'zoo@dssh.tyc.edu.tw', apps: { seat: true }, at: 1, name: '動物老師' } } });
const claim = (apps) => ({ email: 'Zoo@dssh.tyc.edu.tw', name: '動物老師', school: '大溪高中', purpose: '管理員手動開通', want: apps, at: 1, status: 'approved', apps });
const retired = Object.assign({}, base, { sys: { retired: { seat: true } } });

let pass = 0, fail = 0;
function expect(name, data, who, op, p, val, want) {
  const db = t.database(rules, data).with({ debug: false });
  const as = who ? db.as(who) : db;
  let r;
  if (op === 'read') r = as.read(p);
  else if (op === 'update') r = as.update(p, val);
  else r = as.write(p, val);
  const ok = r.allowed === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `（預期 ${want ? '允許' : '拒絕'}，實際 ${r.allowed ? '允許' : '拒絕'}）`}`);
  if (!ok && process.env.DEBUG) console.log(r.info);
}
const W = 'write', R = 'read';
const newClass = (owner) => ({ owner, name: 'new' });
const pending = (email) => ({ email, name: 'n', school: 's', purpose: 'p', want: { seat: true }, at: 1, status: 'pending' });

console.log('— 會員中心 —');
expect('主帳號（已驗證）可以核准老師', base, MAIN, W, '/staff/NOAPP/status', 'approved', true);
expect('冒名的主帳號（未驗證）不能核准', base, MAIN_UNVERIFIED, W, '/staff/NOAPP/status', 'approved', false);
expect('舊 +excel 帳號不再是管理員', base, EXCEL, W, '/staff/NOAPP/status', 'approved', false);
expect('新老師可以送出自己的申請', base, STRANGER, W, '/staff/BAD', pending('bad@evil.com'), true);
expect('新老師不能自己核准自己', base, STRANGER, W, '/staff/BAD', Object.assign(pending('bad@evil.com'), { status: 'approved', apps: { seat: true } }), false);
expect('不能用別人的 Email 申請', base, STRANGER, W, '/staff/BAD', pending('tea@school.edu.tw'), false);
expect('只有管理員看得到全部申請', base, TEA, R, '/staff', null, false);
expect('主帳號看得到全部申請', base, MAIN, R, '/staff', null, true);

console.log('— 手動管理：預先開通、修改資料、管理員備註 —');
expect('主帳號可以預先開通一個 Email', base, MAIN, W, '/staffpre/new@school,edu,tw', { email: 'new@school.edu.tw', apps: { seat: true }, at: 1 }, true);
expect('預先開通的位置要跟 Email 對得上', base, MAIN, W, '/staffpre/new@school,edu,tw', { email: 'other@school.edu.tw', apps: { seat: true }, at: 1 }, false);
expect('一般老師不能預先開通別人', base, TEA, W, '/staffpre/new@school,edu,tw', { email: 'new@school.edu.tw', apps: { seat: true }, at: 1 }, false);
expect('被預先開通的老師看得到自己那筆', withPre, ZOO, R, '/staffpre/zoo@dssh,tyc,edu,tw', null, true);
expect('別人看不到預先開通名單', withPre, TEA, R, '/staffpre/zoo@dssh,tyc,edu,tw', null, false);
expect('信箱已驗證：可以領取預先開通', withPre, ZOO, W, '/staff/ZOO', claim({ seat: true }), true);
expect('信箱沒驗證：不能領取（防冒名）', withPre, ZOO_UNV, W, '/staff/ZOO', claim({ seat: true }), false);
expect('領取時不能多開沒給的系統', withPre, ZOO, W, '/staff/ZOO', claim({ seat: true, gps: true }), false);
expect('沒被預先開通的人不能自己核准', base, ZOO, W, '/staff/ZOO', claim({ seat: true }), false);
expect('領取後可以刪掉自己的預先開通', withPre, ZOO, W, '/staffpre/zoo@dssh,tyc,edu,tw', null, true);
expect('核准的老師可以改自己的姓名', base, TEA, W, '/staff/TEA/name', '新名字', true);
expect('核准的老師可以改自己的學校', base, TEA, W, '/staff/TEA/school', '新學校', true);
expect('老師不能自己加開系統', base, NOAPP, W, '/staff/NOAPP/apps/seat', true, false);
expect('停用的老師不能把自己改回核准', base, OFF, W, '/staff/OFF/status', 'approved', false);
expect('老師不能刪掉自己的紀錄', base, TEA, W, '/staff/TEA', null, false);
expect('老師不能改管理員給的說明', base, TEA, W, '/staff/TEA/note', '我很棒', false);
expect('老師不能改別人的資料', base, TEA, W, '/staff/NOAPP/name', 'hack', false);
expect('管理員可以手動新增（直接核准）', base, MAIN, W, '/staff/NEW', { email: 'n@x.tw', name: 'N', school: 'S', purpose: '手動', want: { seat: true }, at: 1, status: 'approved', apps: { seat: true } }, true);
expect('系統名稱只能是三個系統之一', base, MAIN, W, '/staff/TEA/apps/hack', true, false);
expect('管理員可以寫私人備註', base, MAIN, W, '/staffmemo/TEA', '研習認識的老師', true);
expect('老師看不到管理員備註', Object.assign({}, base, { staffmemo: { TEA: 'x' } }), TEA, R, '/staffmemo/TEA', null, false);

console.log('— 座位大作戰 —');
expect('核准且開通的老師可以建班級', base, TEA, W, '/seating/classes/clsnew0001', newClass('TEA'), true);
expect('核准但沒開通座位的老師不能建班級', base, NOAPP, W, '/seating/classes/clsnew0002', newClass('NOAPP'), false);
expect('停用的老師不能建班級', base, OFF, W, '/seating/classes/clsnew0003', newClass('OFF'), false);
expect('主帳號可以建自己的班級', base, MAIN, W, '/seating/classes/clsnew0004', newClass('MAIN'), true);
expect('舊 +seat 帳號已移除：不能再用（2026-10-18 規則瘦身）', base, SEAT, W, '/seating/classes/clsseat001/name', 'A2', false);
expect('舊 +seat 帳號退休後不能用', retired, SEAT, W, '/seating/classes/clsseat001/name', 'A2', false);
expect('老師不能改別人的班級', base, TEA, W, '/seating/classes/clsseat001/name', 'hack', false);

console.log('— 舊帳號搬家（2026-10-18 已移除）—');
expect('不能再登記搬家（xfer 已移除）', base, SEAT, W, '/xfer/OLDSEAT', true, false);
expect('就算資料庫還有 xfer 紀錄，主帳號也不能接手別人的班級', withXfer, MAIN, W, '/seating/classes/clsseat001/owner', 'MAIN', false);
expect('就算有 xfer 紀錄，主帳號也不能接手題庫', withXfer, MAIN, W, '/orienteering/banks/bkold001/owner', 'MAIN', false);
expect('就算有 xfer 紀錄，主帳號也不能接手老師代碼', withXfer, MAIN, W, '/excel-rescue-t/AAAAAA/meta/owner', 'MAIN', false);
expect('sys/retired 已移除，主帳號也不能寫', base, MAIN, W, '/sys/retired/seat', true, false);
expect('舊 +gps 帳號不能建題庫', base, GPS, W, '/orienteering/banks/bkgps0001', { owner: 'OLDGPS', name: 'x' }, false);
expect('舊 +excel 帳號不能建老師代碼', base, EXCEL, W, '/excel-rescue-t/EEEEEE/meta', { owner: 'OLDEXCEL', at: 1 }, false);
console.log('— 消失的實驗數據 —');
const rec = { name: '小明', ts: 1 };
expect('學生寫入管理員代碼', base, null, W, '/excel-rescue-t/AAAAAA/115-1/S001', rec, true);
expect('學生寫入核准老師的代碼', base, null, W, '/excel-rescue-t/BBBBBB/115-1/S001', rec, true);
expect('停用老師的學生不能寫入', base, null, W, '/excel-rescue-t/CCCCCC/115-1/S001', rec, false);
expect('一般老師不能建管理員代碼', base, TEA, W, '/excel-rescue-t/DDDDDD/meta', { owner: 'TEA', at: 1, admin: true }, false);
expect('主帳號可以建管理員代碼', base, MAIN, W, '/excel-rescue-t/DDDDDD/meta', { owner: 'MAIN', at: 1, admin: true }, true);
expect('舊版學期整班紀錄只有主帳號看得到', base, TEA, R, '/excel-rescue/115-1', null, false);
expect('主帳號看得到舊版學期整班紀錄', base, MAIN, R, '/excel-rescue/115-1', null, true);
expect('學生看得到自己的舊版紀錄', base, null, R, '/excel-rescue/115-1/S001', null, true);

console.log('— 隱秘的鍵結社 —');
const bsP = { sid: '115-1_101_7', cls: '101', seat: 7, name: '小明', term: '115-1', updatedAt: 1, games: 1 };
expect('學生寫入自己的成績', base, null, W, '/bond-society/players/115-1_101_7', bsP, true);
expect('sid 和路徑不同不能寫', base, null, W, '/bond-society/players/115-1_101_8', bsP, false);
expect('名字太長不能寫', base, null, W, '/bond-society/players/115-1_101_7', Object.assign({}, bsP, { name: '一二三四五六七八九十一二三' }), false);
expect('任何人都能讀排行榜', base, null, R, '/bond-society/players', null, true);
expect('學生存進行中的一局', base, null, W, '/bond-society/saves/115-1_101_7', { v: 5, updatedAt: 1, level: 'g10' }, true);
expect('存檔缺欄位不能寫', base, null, W, '/bond-society/saves/115-1_101_7', { foo: 1 }, false);
expect('學生新增一筆歷程', base, null, W, '/bond-society/logs/115-1_101_7/-abc', { t: 1, type: 'end', score: 300 }, true);
expect('不能整批覆蓋歷程', base, null, W, '/bond-society/logs/115-1_101_7', { x: { t: 1, type: 'end' } }, false);
expect('老師頁可以刪除整份歷程', Object.assign({}, base, { 'bond-society': { logs: { '115-1_101_7': { a: { t: 1, type: 'end' } } } } }), null, W, '/bond-society/logs/115-1_101_7', null, true);
expect('學期設定', base, null, W, '/bond-society/config', { current: '115-1', terms: ['115-1'] }, true);
console.log('— 隱秘的鍵結社 連線版 —');
expect('老師開房間', base, null, W, '/bond-mp/ABCD', { host: { v: 1 } }, true);
expect('房間代碼要 4 碼', base, null, W, '/bond-mp/ABCDE', { host: { v: 1 } }, false);
expect('學生進大廳', base, null, W, '/bond-mp/ABCD/lobby/115-1_101_7', { sid: '115-1_101_7', name: '小明', cls: '101', seat: 7 }, true);
expect('大廳 sid 要和路徑一樣', base, null, W, '/bond-mp/ABCD/lobby/115-1_101_7', { sid: 'x', name: '小明' }, false);
expect('學生送出動作', base, null, W, '/bond-mp/ABCD/act/-k1', { sid: '115-1_101_7', type: 'ans', ok: true }, true);
expect('動作缺欄位不能寫', base, null, W, '/bond-mp/ABCD/act/-k1', { ok: true }, false);
expect('任何人都能讀房間', base, null, R, '/bond-mp/ABCD/pub', null, true);
expect('不能整個抽屜一起讀', base, null, R, '/bond-mp', null, false);
console.log('— 📜 出處失傳的秘文 —');
const SRC_TEA = U('SRCT', 'src@school.edu.tw', true);
const ss = Object.assign({}, base, {
  staff: Object.assign({}, base.staff, { SRCT: { email: 'src@school.edu.tw', name: 'S', school: 'S', purpose: 'p', want: { src: true }, at: 1, status: 'approved', apps: { src: true } } }),
  'secret-source': { m: {
    MMMMMM: { meta: { owner: 'SRCT', at: 1, name: '301' }, r: { S001: { name: '小明', ts: 1, passed: { book: 5 }, att: { book: 1 } } } },
    NNNNNN: { meta: { owner: 'TEA', at: 1, name: 'x' } },
    PPPPPP: { meta: { owner: 'MAIN', at: 1, name: 'y', admin: true } },
    QQQQQQ: { meta: { owner: 'SRCT', at: 1, name: 'z', closed: true } } },
    owners: { SRCT: { MMMMMM: { name: '301', at: 1 } } } }
});
const srec = { name: '小華', ts: 2, passed: { book: 9, spot: 10 }, att: { book: 2, spot: 1 } };
expect('開通 src 的老師建任務', ss, SRC_TEA, W, '/secret-source/m/ABCDEF/meta', { owner: 'SRCT', at: 1, name: '302', subj: { chem: true }, types: { book: true }, en: true }, true);
expect('沒開通 src 的老師不能建任務', ss, TEA, W, '/secret-source/m/ABCDEF/meta', { owner: 'TEA', at: 1, name: '302' }, false);
expect('任務 owner 不能寫成別人', ss, SRC_TEA, W, '/secret-source/m/ABCDEF/meta', { owner: 'TEA', at: 1, name: '302' }, false);
expect('任務代碼格式要對', ss, SRC_TEA, W, '/secret-source/m/abc/meta', { owner: 'SRCT', at: 1, name: '302' }, false);
expect('一般老師不能設 admin 旗標', ss, SRC_TEA, W, '/secret-source/m/ABCDEF/meta', { owner: 'SRCT', at: 1, name: '302', admin: true }, false);
expect('主帳號建任務（含 admin）', ss, MAIN, W, '/secret-source/m/ABCDEF/meta', { owner: 'MAIN', at: 1, name: 'm', admin: true }, true);
expect('擁有者改任務設定', ss, SRC_TEA, 'update', '/secret-source/m/MMMMMM/meta', { name: '301 改', en: false }, true);
expect('別人不能改任務設定', ss, MAIN, 'update', '/secret-source/m/MMMMMM/meta', { name: 'hack' }, false);
expect('擁有者刪除整個任務', ss, SRC_TEA, W, '/secret-source/m/MMMMMM', null, true);
expect('別人不能刪任務', ss, SRC_TEA, W, '/secret-source/m/NNNNNN', null, false);
expect('任何人讀得到任務設定（學生頁）', ss, null, R, '/secret-source/m/MMMMMM/meta', null, true);
expect('學生讀不到全班紀錄', ss, null, R, '/secret-source/m/MMMMMM/r', null, false);
expect('擁有者讀得到全班紀錄', ss, SRC_TEA, R, '/secret-source/m/MMMMMM/r', null, true);
expect('別的老師讀不到全班紀錄', ss, TEA, R, '/secret-source/m/MMMMMM/r', null, false);
expect('學生讀自己的紀錄', ss, null, R, '/secret-source/m/MMMMMM/r/S001', null, true);
expect('學生寫自己的紀錄', ss, null, W, '/secret-source/m/MMMMMM/r/S002', srec, true);
expect('學號格式不對不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/s-2', srec, false);
expect('紀錄多了奇怪欄位不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({ hack: 1 }, srec), false);
expect('關卡名稱格式不對不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { passed: { 'Bad Key': 1 } }), false);
expect('學生不能刪紀錄', ss, null, W, '/secret-source/m/MMMMMM/r/S001', null, false);
expect('任務不存在不能寫', ss, null, W, '/secret-source/m/ZZZZZZ/r/S002', srec, false);
expect('沒開通 src 的老師開的任務，學生不能寫', ss, null, W, '/secret-source/m/NNNNNN/r/S002', srec, false);
expect('主帳號（admin 旗標）的任務，學生可以寫', ss, null, W, '/secret-source/m/PPPPPP/r/S002', srec, true);
expect('關閉的任務不能寫', ss, null, W, '/secret-source/m/QQQQQQ/r/S002', srec, false);
// 第 1 關（2026-10-18）：模擬檔案庫卷宗 arc、線索卡 clue
const arc = { q: 'c1', g: 'S', n: 5, p: { 0: 'c1-book', 1: 'c1-essay', 2: 'c1-fair', 3: 'c1-web' } };
const clue = { at: 1, topic: '水果電池', c: { 0: { t: 'book', au: '王小明', yr: '2020', ti: '電池的故事', src: '藍海文化', why: '介紹電池原理' }, 2: { t: 'web', url: 'https://a.b/c' } } };
expect('學生寫模擬檔案庫卷宗', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { arc }), true);
expect('卷宗評等只能是 S／A／B', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { arc: Object.assign({}, arc, { g: 'Z' }) }), false);
expect('卷宗最多 4 篇', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { arc: Object.assign({}, arc, { p: { 4: 'x' } }) }), false);
expect('學生寫線索卡', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { clue }), true);
expect('線索卡最多 6 張', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { clue: { at: 1, c: { 6: { t: 'book' } } } }), false);
expect('線索卡欄位太長不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { clue: { at: 1, c: { 0: { why: 'x'.repeat(201) } } } }), false);
expect('線索卡多了奇怪欄位不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { clue: { at: 1, c: { 0: { hack: 'x' } } } }), false);
// 結案作業（2026-10-19）：dos
const dos = { at: 1, ok: true, p: '王小明（2023）指出<b>…</b>', r: '王小明（2023）。<b>書名</b>。出版者。', ai: '寫得很好' };
expect('學生寫結案作業', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { dos }), true);
expect('結案作業文獻探討太長不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { dos: Object.assign({}, dos, { p: 'x'.repeat(2501) }) }), false);
expect('結案作業 ok 要是 true/false', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { dos: Object.assign({}, dos, { ok: 'yes' }) }), false);
expect('結案作業多了奇怪欄位不能寫', ss, null, W, '/secret-source/m/MMMMMM/r/S002', Object.assign({}, srec, { dos: Object.assign({}, dos, { hack: 1 }) }), false);
// 老師評等（2026-10-19）：g/<學號>
expect('任務老師給評等', ss, SRC_TEA, W, '/secret-source/m/MMMMMM/g/S001', { g: 'A', at: 1, c: '引用很完整' }, true);
expect('評等只能是 S／A／B／C', ss, SRC_TEA, W, '/secret-source/m/MMMMMM/g/S001', { g: 'D', at: 1 }, false);
expect('學生不能自己給評等', ss, null, W, '/secret-source/m/MMMMMM/g/S001', { g: 'S', at: 1 }, false);
expect('別的老師不能給評等', ss, TEA, W, '/secret-source/m/MMMMMM/g/S001', { g: 'S', at: 1 }, false);
expect('學生讀得到自己的評等', ss, null, R, '/secret-source/m/MMMMMM/g/S001', null, true);
expect('學生讀不到全班評等', ss, null, R, '/secret-source/m/MMMMMM/g', null, false);
expect('評語太長不能寫', ss, SRC_TEA, W, '/secret-source/m/MMMMMM/g/S001', { g: 'A', at: 1, c: 'x'.repeat(301) }, false);
expect('任務老師刪除一筆打錯學號的紀錄', ss, SRC_TEA, W, '/secret-source/m/MMMMMM/r/S001', null, true);
expect('別的老師不能刪學生紀錄', ss, TEA, W, '/secret-source/m/MMMMMM/r/S001', null, false);
expect('任務老師刪除評等', ss, SRC_TEA, W, '/secret-source/m/MMMMMM/g/S001', null, true);
expect('老師讀自己的任務清單', ss, SRC_TEA, R, '/secret-source/owners/SRCT', null, true);
expect('老師寫自己的任務清單', ss, SRC_TEA, W, '/secret-source/owners/SRCT/ABCDEF', { name: 'x', at: 1, roster: '110 a' }, true);
expect('不能寫別人的任務清單', ss, SRC_TEA, W, '/secret-source/owners/TEA/ABCDEF', { name: 'x', at: 1 }, false);
expect('會員申請可以選 src', ss, STRANGER, W, '/staff/BAD', { email: 'bad@evil.com', name: 'B', school: 'S', purpose: 'p', want: { src: true }, at: 1, status: 'pending' }, true);
// ⚗️ 化學實驗室 No.223（2026-10-22）：lab223 活動
console.log('— ⚗️ 化學實驗室 No.223 —');
const LAB_TEA = U('LABT', 'labt@school.edu.tw', true);
const labBase = Object.assign({}, base, { staff: Object.assign({}, base.staff, { LABT: { email: 'labt@school.edu.tw', name: 'L', school: 'S', purpose: 'p', want: { lab: true }, at: 1, status: 'approved', apps: { lab: true } } }),
  lab223: { m: {
    KPENAA: { meta: { owner: 'LABT', sys: 'ph', term: '115-1', item: 1, name: '', open: true, at: 1, set: 'ABCDEFG' } },
    SHUTAA: { meta: { owner: 'LABT', sys: 'ph', term: '115-1', item: 2, name: '', open: false, at: 1, set: 'ABCDEFG' } },
    ADMNAA: { meta: { owner: 'MAIN', sys: 'eq', term: '115-1', item: 1, open: true, at: 1, set: '30|3|all', admin: true } },
    DXNEAA: { meta: { owner: 'LABT', sys: 'ph', term: '115-1', item: 3, open: true, at: 1, set: 'ABCDEFG' }, r: { '101_1': { cls: '101', seat: 1, no: '1150001', name: 'a', use: '正式進度', ts: 1, submitted: true } } }
  } } });
const lrec = { cls: '101', seat: 7, no: '1150007', name: '王小明', use: '考試複習', ts: 1, answers: ['1'] };
const lmeta = { owner: 'LABT', sys: 'unit', term: '115-1', item: 4, name: '301', open: false, at: 1, set: 'ABCDEFG' };
expect('開通 lab 的老師開活動', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', lmeta, true);
expect('沒開通 lab 的老師不能開活動', labBase, TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { owner: 'TEA' }), false);
expect('活動 owner 不能寫成別人', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { owner: 'TEA' }), false);
expect('學期格式要對', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { term: '2026' }), false);
expect('項次要 1～99', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { item: 0 }), false);
expect('系統代號只能 eq／ph／unit', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { sys: 'xx' }), false);
expect('一般老師不能自己加 admin 旗標', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { admin: true }), false);
expect('管理員開活動可以加 admin 旗標', labBase, MAIN, W, '/lab223/m/NEWAD2/meta', Object.assign({}, lmeta, { owner: 'MAIN', admin: true }), true);
expect('老師開始／停止自己的活動', labBase, LAB_TEA, W, '/lab223/m/SHUTAA/meta/open', true, true);
expect('老師改學期、項次', labBase, LAB_TEA, 'update', '/lab223/m/SHUTAA/meta', { term: '115-2', item: 5, name: '改名' }, true);
expect('活動建好後題目設定不能改', labBase, LAB_TEA, W, '/lab223/m/SHUTAA/meta/set', 'ZZZZZZZ', false);
expect('別的老師不能停止別人的活動', labBase, MAIN_UNVERIFIED, W, '/lab223/m/KPENAA/meta/open', false, false);
expect('學生（沒登入）不能開始活動', labBase, null, W, '/lab223/m/SHUTAA/meta/open', true, false);
expect('任何人讀得到活動資訊（學生要知道開了沒）', labBase, null, R, '/lab223/m/KPENAA/meta', null, true);
expect('活動進行中學生可以寫自己的紀錄', labBase, null, W, '/lab223/m/KPENAA/r/101_7', lrec, true);
expect('活動停止後學生不能寫', labBase, null, W, '/lab223/m/SHUTAA/r/101_7', lrec, false);
expect('管理員的活動學生可以寫（admin 旗標）', labBase, null, W, '/lab223/m/ADMNAA/r/101_7', lrec, true);
expect('學生紀錄要有學號、用途', labBase, null, W, '/lab223/m/KPENAA/r/101_7', { cls: '101', seat: 7, name: 'a', ts: 1 }, false);
expect('用途只能三種', labBase, null, W, '/lab223/m/KPENAA/r/101_7', Object.assign({}, lrec, { use: '好玩' }), false);
expect('學號格式要對', labBase, null, W, '/lab223/m/KPENAA/r/101_7', Object.assign({}, lrec, { no: '王' }), false);
expect('紀錄位置要是 班級_座號', labBase, null, W, '/lab223/m/KPENAA/r/abc', lrec, false);
expect('學生 PATCH 更新自己的紀錄', labBase, null, 'update', '/lab223/m/KPENAA/r/101_7', Object.assign({}, lrec, { 'it/beaker': { o: 1, x: 0 } }), true);
expect('交卷後不能再改', labBase, null, W, '/lab223/m/DXNEAA/r/101_1', { cls: '101', seat: 1, no: '1150001', name: 'a', use: '正式進度', ts: 2 }, false);
expect('學生讀得到自己的紀錄', labBase, null, R, '/lab223/m/KPENAA/r/101_7', null, true);
expect('學生讀不到全班紀錄', labBase, null, R, '/lab223/m/KPENAA/r', null, false);
expect('活動老師讀得到全班紀錄', labBase, LAB_TEA, R, '/lab223/m/KPENAA/r', null, true);
expect('學生不能刪自己的紀錄', labBase, null, W, '/lab223/m/DXNEAA/r/101_1', null, false);
expect('活動老師刪一筆學生紀錄', labBase, LAB_TEA, W, '/lab223/m/DXNEAA/r/101_1', null, true);
expect('活動老師刪除整個活動', labBase, LAB_TEA, W, '/lab223/m/DXNEAA', null, true);
expect('別的老師不能刪整個活動', labBase, TEA, W, '/lab223/m/DXNEAA', null, false);
expect('活動老師搬移改版前的紀錄（沒有學號）', labBase, LAB_TEA, W, '/lab223/m/SHUTAA/r/101_7', Object.assign({}, lrec, { no: '' }), true);
expect('活動停止時學生還是不能寫（老師搬移不受影響）', labBase, null, W, '/lab223/m/SHUTAA/r/101_7', Object.assign({}, lrec, { no: '' }), false);
expect('別的老師不能寫別人（已停止）活動的學生紀錄', labBase, TEA, W, '/lab223/m/SHUTAA/r/101_7', lrec, false);
expect('活動記下搬移來源的舊題組碼', labBase, LAB_TEA, W, '/lab223/m/NEWACT/meta', Object.assign({}, lmeta, { from: 'ABCDEFG' }), true);
const lb = { cls: '101', seat: 7, name: '王小明', score: 900, correct: 10, total: 10, seconds: 40, cleared: true, at: 1 };
expect('活動排行榜：學生寫自己的最佳成績', labBase, null, W, '/lab223/m/KPENAA/lb/101_7', lb, true);
expect('活動排行榜：停止後不能寫', labBase, null, W, '/lab223/m/SHUTAA/lb/101_7', lb, false);
expect('活動排行榜：分數超過上限不行', labBase, null, W, '/lab223/m/KPENAA/lb/101_7', Object.assign({}, lb, { score: 99999 }), false);
expect('活動排行榜：不能塞學號等其他欄位', labBase, null, W, '/lab223/m/KPENAA/lb/101_7', Object.assign({}, lb, { no: '1150007' }), false);
expect('任何人讀得到活動排行榜', labBase, null, R, '/lab223/m/KPENAA/lb', null, true);
expect('老師讀自己的活動清單', labBase, LAB_TEA, R, '/lab223/owners/LABT', null, true);
expect('老師寫自己的活動清單', labBase, LAB_TEA, W, '/lab223/owners/LABT/NEWACT', { sys: 'ph', term: '115-1', item: 1, at: 1, open: false }, true);
expect('不能讀別人的活動清單', labBase, LAB_TEA, R, '/lab223/owners/TEA', null, false);
expect('舊題組碼抽屜改成唯讀（pH）', labBase, null, W, '/ph-generator/ABCDEFG/101_7', { cls: '101', seat: 7, name: 'a', ts: 1 }, false);
expect('舊題組碼抽屜改成唯讀（單位換算）', labBase, null, W, '/unit-convert/ABCDEFG/101_7', { cls: '101', seat: 7, name: 'a', ts: 1 }, false);
expect('舊題組碼紀錄還讀得到', labBase, null, R, '/ph-generator/ABCDEFG', null, true);
expect('會員申請可以選 lab', labBase, STRANGER, W, '/staff/BAD', { email: 'bad@evil.com', name: 'B', school: 'S', purpose: 'p', want: { lab: true }, at: 1, status: 'pending' }, true);
expect('核准的老師不能自己加開 lab', labBase, TEA, W, '/staff/TEA', Object.assign({}, base.staff.TEA, { apps: Object.assign({}, base.staff.TEA.apps, { lab: true }) }), false);
expect('核准的老師不能自己加開 src（補洞）', labBase, TEA, W, '/staff/TEA', Object.assign({}, base.staff.TEA, { apps: Object.assign({}, base.staff.TEA.apps, { src: true }) }), false);
expect('核准的老師可以改自己的姓名學校', labBase, TEA, W, '/staff/TEA', Object.assign({}, base.staff.TEA, { name: '新名字' }), true);
// 🎲 線上檢定所（2026-10-23）：exam
console.log('— 🎲 線上檢定所 —');
const EX_TEA = U('EXT', 'ext@school.edu.tw', true);
const NOW_ = Date.now(), SV = { '.sv': 'timestamp' };
const emeta = (o) => Object.assign({ owner: 'EXT', at: 1, title: '期中檢定', open: true, openAt: 0, closeAt: 0, mins: 40, tries: 2, policy: 'max', gap: 0, guard: { on: true, max: 2, idle: 5, blur: 3 } }, o || {});
const info = { cls: '201', seat: 7, name: '王小明' };
const exBase = Object.assign({}, base, {
  staff: Object.assign({}, base.staff, { EXT: { email: 'ext@school.edu.tw', name: 'E', school: 'S', purpose: 'p', want: { exam: true }, at: 1, status: 'approved', apps: { exam: true } } }),
  exam: {
    bk: { EXT: { bank0001: { name: '遊戲設計思考', at: 1 } } },
    m: {
      KPENAA: { meta: emeta(), paper: { q0000001: { i: 0, t: 's', s: '題目', o: ['a', 'b'], p: 2 } }, key: { q0000001: { a: [1] } },
        s: { S1150007: { '1': { info, st: NOW_ - 60000, dev: 'd1', ans: { q0000001: 0 } } },
             S1150008: { '1': { info, st: NOW_ - 3600000, dev: 'd1' } },
             S1150009: { '1': { info, st: NOW_ - 600000, dev: 'd1', end: { t: NOW_ - 300000, by: 'self' } } },
             S1150010: { '1': { info, st: NOW_ - 600000, dev: '' } } } },
      SHUTAA: { meta: emeta({ open: false }), paper: { q0000001: { i: 0, t: 's', s: '題目', o: ['a', 'b'], p: 2 } } },
      LATEAA: { meta: emeta({ closeAt: NOW_ - 1000 }) },
      SXXNAA: { meta: emeta({ openAt: NOW_ + 3600000 }) },
      GAPAAA: { meta: emeta({ gap: 30 }), s: { S1150009: { '1': { info, st: NOW_ - 600000, dev: 'd', end: { t: NOW_ - 300000, by: 'self' } } } } },
      RXSTER: { meta: emeta({ rosterOnly: true }), roster: { S1150007: { cls: '201', seat: 7, name: '王小明' } } },
      PUBLAA: { meta: emeta({ open: false, pub: true, pubPaper: true, pubKey: false }), paper: { q0000001: { i: 0, t: 's', s: '題目', o: ['a', 'b'], p: 2 } }, key: { q0000001: { a: [1] } }, g: { S1150007: { f: 2 } } },
      XFFTEA: { meta: emeta({ owner: 'OFF' }) }
    }
  }
});
const start = { info, st: SV, dev: 'abc123' };
expect('開通 exam 的老師建立測驗', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta(), true);
expect('沒開通 exam 的老師不能建立測驗', exBase, TEA, W, '/exam/m/NEWEXM/meta', emeta({ owner: 'TEA' }), false);
expect('測驗 owner 不能寫成別人', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ owner: 'TEA' }), false);
expect('計分方式只能四種', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ policy: 'best' }), false);
expect('作答次數最多 20 次', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ tries: 21 }), false);
expect('違規上限 1～5 次', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ guard: { on: true, max: 0, idle: 5, blur: 3 } }), false);
expect('一般老師不能自己加 admin 旗標', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ admin: true }), false);
expect('meta 不能塞奇怪欄位', exBase, EX_TEA, W, '/exam/m/NEWEXM/meta', emeta({ hack: 1 }), false);
expect('老師手動開放／關閉', exBase, EX_TEA, W, '/exam/m/SHUTAA/meta/open', true, true);
expect('學生不能開放測驗', exBase, null, W, '/exam/m/SHUTAA/meta/open', true, false);
expect('任何人讀得到測驗資訊', exBase, null, R, '/exam/m/KPENAA/meta', null, true);
expect('開放中學生讀得到題目', exBase, null, R, '/exam/m/KPENAA/paper', null, true);
expect('未開放時學生讀不到題目', exBase, null, R, '/exam/m/SHUTAA/paper', null, false);
expect('截止後學生讀不到題目', exBase, null, R, '/exam/m/LATEAA/paper', null, false);
expect('還沒到開放時間讀不到題目', exBase, null, R, '/exam/m/SXXNAA/paper', null, false);
expect('學生讀不到正確答案', exBase, null, R, '/exam/m/KPENAA/key', null, false);
expect('出題老師讀得到正確答案', exBase, EX_TEA, R, '/exam/m/KPENAA/key', null, true);
expect('公布題目後學生讀得到題目', exBase, null, R, '/exam/m/PUBLAA/paper', null, true);
expect('沒勾公布正解時讀不到答案', exBase, null, R, '/exam/m/PUBLAA/key', null, false);
expect('公布後學生讀得到自己的成績', exBase, null, R, '/exam/m/PUBLAA/g/S1150007', null, true);
expect('還沒公布讀不到成績', exBase, null, R, '/exam/m/KPENAA/g/S1150007', null, false);
expect('學生讀不到全班成績', exBase, null, R, '/exam/m/PUBLAA/g', null, false);
expect('學生開始第 1 次作答（伺服器時間）', exBase, null, W, '/exam/m/KPENAA/s/S1150001/1', start, true);
expect('開始時間不能自己填', exBase, null, W, '/exam/m/KPENAA/s/S1150001/1', Object.assign({}, start, { st: NOW_ + 999999 }), false);
expect('未開放不能開始', exBase, null, W, '/exam/m/SHUTAA/s/S1150001/1', start, false);
expect('截止後不能開始', exBase, null, W, '/exam/m/LATEAA/s/S1150001/1', start, false);
expect('不能跳過第 1 次直接第 2 次', exBase, null, W, '/exam/m/KPENAA/s/S1150001/2', start, false);
expect('第 1 次還沒交卷不能開第 2 次', exBase, null, W, '/exam/m/KPENAA/s/S1150007/2', start, false);
expect('第 1 次交卷後可以開第 2 次', exBase, null, W, '/exam/m/KPENAA/s/S1150009/2', start, true);
expect('超過可作答次數不行', exBase, null, W, '/exam/m/KPENAA/s/S1150009/3', start, false);
expect('不能覆蓋已經開始的作答', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1', start, false);
expect('間隔時間還沒到不能重考', exBase, null, W, '/exam/m/GAPAAA/s/S1150009/2', start, false);
expect('名單限定：資料吻合才能開始', exBase, null, W, '/exam/m/RXSTER/s/S1150007/1', start, true);
expect('名單限定：姓名不對不行', exBase, null, W, '/exam/m/RXSTER/s/S1150007/1', Object.assign({}, start, { info: { cls: '201', seat: 7, name: '王大明' } }), false);
expect('名單限定：不在名單不行', exBase, null, W, '/exam/m/RXSTER/s/S1150099/1', start, false);
expect('學號格式要對', exBase, null, W, '/exam/m/KPENAA/s/abc/1', start, false);
expect('停用帳號老師的測驗學生不能考', exBase, null, W, '/exam/m/XFFTEA/s/S1150001/1', start, false);
expect('作答中寫答案（單選）', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ans/q0000001', 1, true);
expect('作答中寫答案（複選字串）', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ans/q0000001', '0,2', true);
expect('作答中清掉答案', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ans/q0000001', null, true);
expect('簡答太長不行', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ans/q0000001', 'x'.repeat(3001), false);
expect('時間到了不能再寫答案', exBase, null, W, '/exam/m/KPENAA/s/S1150008/1/ans/q0000001', 1, false);
expect('交卷後不能再改答案', exBase, null, W, '/exam/m/KPENAA/s/S1150009/1/ans/q0000001', 1, false);
expect('還沒開始不能寫答案', exBase, null, W, '/exam/m/KPENAA/s/S1150001/1/ans/q0000001', 1, false);
expect('學生不能改開始時間', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/st', NOW_, false);
expect('學生不能改自己的班級座號姓名', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/info/name', '別人', false);
expect('本人交卷', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/end', { t: SV, by: 'self' }, true);
expect('系統代結（附原因）', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/end', { t: SV, by: 'guard', why: '切換到其他頁面' }, true);
expect('時間到之後還是可以交卷（答案已經鎖住）', exBase, null, W, '/exam/m/KPENAA/s/S1150008/1/end', { t: SV, by: 'time' }, true);
expect('學生不能冒充老師收卷', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/end', { t: SV, by: 'teacher' }, false);
expect('交卷時間不能自己填', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/end', { t: 1, by: 'self' }, false);
expect('已交卷不能再改交卷方式', exBase, null, W, '/exam/m/KPENAA/s/S1150009/1/end', { t: SV, by: 'self' }, false);
expect('老師收卷', exBase, EX_TEA, W, '/exam/m/KPENAA/s/S1150007/1/end', { t: NOW_, by: 'teacher' }, true);
expect('記錄違規事件', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ev/e1', { t: SV, k: 'v', d: 'hide' }, true);
expect('記錄第二個事件', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/ev/e1', { t: SV, k: 'v' }, true);
expect('交卷後不能再記事件', exBase, null, W, '/exam/m/KPENAA/s/S1150009/1/ev/e1', { t: SV, k: 'v' }, false);
expect('裝置被老師解除後可以重新認領', exBase, null, W, '/exam/m/KPENAA/s/S1150010/1/dev', 'newdev', true);
expect('作答中的裝置不能被搶走', exBase, null, W, '/exam/m/KPENAA/s/S1150007/1/dev', 'other', false);
expect('老師解除裝置鎖', exBase, EX_TEA, W, '/exam/m/KPENAA/s/S1150007/1/dev', '', true);
expect('學生讀得到自己的作答', exBase, null, R, '/exam/m/KPENAA/s/S1150007', null, true);
expect('學生讀不到全班作答', exBase, null, R, '/exam/m/KPENAA/s', null, false);
expect('出題老師讀得到全班作答', exBase, EX_TEA, R, '/exam/m/KPENAA/s', null, true);
expect('別的老師讀不到全班作答', exBase, TEA, R, '/exam/m/KPENAA/s', null, false);
expect('老師寫成績', exBase, EX_TEA, W, '/exam/m/KPENAA/g/S1150007', { f: 2, k: { '1': { s: 2 } } }, true);
expect('學生不能寫成績', exBase, null, W, '/exam/m/KPENAA/g/S1150007', { f: 100 }, false);
expect('老師給簡答分數', exBase, EX_TEA, W, '/exam/m/KPENAA/mg/S1150007/1/q0000001', 4, true);
expect('學生不能給自己簡答分數', exBase, null, W, '/exam/m/KPENAA/mg/S1150007/1/q0000001', 4, false);
expect('老師匯入名單', exBase, EX_TEA, W, '/exam/m/KPENAA/roster/S1150001', { cls: '201', seat: 1, name: '林一' }, true);
expect('學生讀不到名單', exBase, null, R, '/exam/m/RXSTER/roster', null, false);
expect('老師寫題目快照', exBase, EX_TEA, W, '/exam/m/KPENAA/paper/q0000002', { i: 1, t: 'm', s: '<b>題</b>', o: ['a', 'b', 'c'], p: 2 }, true);
expect('學生不能改題目', exBase, null, W, '/exam/m/KPENAA/paper/q0000002', { i: 1, t: 'm', s: 'x', o: ['a'], p: 2 }, false);
expect('老師刪除整份測驗', exBase, EX_TEA, W, '/exam/m/KPENAA', null, true);
expect('別的老師不能刪測驗', exBase, TEA, W, '/exam/m/KPENAA', null, false);
expect('老師寫自己的題庫', exBase, EX_TEA, W, '/exam/bk/EXT/bank0001/q/q0000009', { t: 's', s: '題', o: ['a', 'b'], a: [0], d: '中', tags: ['機制'], p: 2, i: 1, at: 1 }, true);
expect('題庫難易度只能易中難', exBase, EX_TEA, W, '/exam/bk/EXT/bank0001/q/q0000009', { t: 's', s: '題', d: '超難' }, false);
expect('讀不到別人的題庫', exBase, TEA, R, '/exam/bk/EXT', null, false);
expect('沒開通 exam 不能建題庫', exBase, TEA, W, '/exam/bk/TEA/bank0001', { name: 'x', at: 1 }, false);
expect('老師上傳題目圖片', exBase, EX_TEA, W, '/exam/img/abcdefgh1234', { owner: 'EXT', data: 'data:image/jpeg;base64,xx' }, true);
expect('圖片只能是 data:image', exBase, EX_TEA, W, '/exam/img/abcdefgh1234', { owner: 'EXT', data: 'javascript:alert(1)' }, false);
expect('學生讀得到題目圖片（知道代號）', exBase, null, R, '/exam/img/abcdefgh1234', null, true);
expect('學生不能列出全部圖片', exBase, null, R, '/exam/img', null, false);
expect('學生不能上傳圖片', exBase, null, W, '/exam/img/abcdefgh1234', { owner: 'x', data: 'data:image/png;base64,xx' }, false);
expect('老師寫自己的測驗清單', exBase, EX_TEA, W, '/exam/owners/EXT/NEWEXM', { title: '期中', at: 1 }, true);
expect('不能讀別人的測驗清單', exBase, EX_TEA, R, '/exam/owners/TEA', null, false);
expect('會員申請可以選 exam', exBase, STRANGER, W, '/staff/BAD', { email: 'bad@evil.com', name: 'B', school: 'S', purpose: 'p', want: { exam: true }, at: 1, status: 'pending' }, true);
expect('核准的老師不能自己加開 exam', exBase, TEA, W, '/staff/TEA', Object.assign({}, base.staff.TEA, { apps: Object.assign({}, base.staff.TEA.apps, { exam: true }) }), false);
expect('管理員可以開通 exam', exBase, MAIN, W, '/staff/NOAPP/apps/exam', true, true);
expect('預先開通可以勾 exam', exBase, MAIN, W, '/staffpre/new@school,edu,tw', { email: 'new@school.edu.tw', apps: { exam: true }, at: 1 }, true);
console.log(`\n${fail ? '❌' : '✅'} 通過 ${pass} 項，失敗 ${fail} 項`);
process.exit(fail ? 1 : 0);
