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

console.log('— 座位大作戰 —');
expect('核准且開通的老師可以建班級', base, TEA, W, '/seating/classes/clsnew0001', newClass('TEA'), true);
expect('核准但沒開通座位的老師不能建班級', base, NOAPP, W, '/seating/classes/clsnew0002', newClass('NOAPP'), false);
expect('停用的老師不能建班級', base, OFF, W, '/seating/classes/clsnew0003', newClass('OFF'), false);
expect('主帳號可以建自己的班級', base, MAIN, W, '/seating/classes/clsnew0004', newClass('MAIN'), true);
expect('舊 +seat 帳號搬家前照常能用', base, SEAT, W, '/seating/classes/clsseat001/name', 'A2', true);
expect('舊 +seat 帳號退休後不能用', retired, SEAT, W, '/seating/classes/clsseat001/name', 'A2', false);
expect('老師不能改別人的班級', base, TEA, W, '/seating/classes/clsseat001/name', 'hack', false);

console.log('— 舊帳號搬家 —');
expect('舊帳號可以登記搬家', base, SEAT, W, '/xfer/OLDSEAT', true, true);
expect('一般老師不能登記搬家', base, TEA, W, '/xfer/TEA', true, false);
expect('沒登記搬家：主帳號不能接手舊班級', base, MAIN, W, '/seating/classes/clsseat001/owner', 'MAIN', false);
expect('登記搬家後：主帳號可以接手舊班級', withXfer, MAIN, W, '/seating/classes/clsseat001/owner', 'MAIN', true);
expect('接手時只能改成自己', withXfer, MAIN, W, '/seating/classes/clsseat001/owner', 'TEA', false);
expect('主帳號不能接手一般老師的班級', withXfer, MAIN, W, '/seating/classes/clstea0001/owner', 'MAIN', false);
expect('登記搬家後：接手暗標', withXfer, MAIN, W, '/seating/rounds/ABCDEF/meta/owner', 'MAIN', true);
expect('登記搬家後：接手題庫', withXfer, MAIN, W, '/orienteering/banks/bkold001/owner', 'MAIN', true);
expect('登記搬家後：接手照片', withXfer, MAIN, W, '/orienteering/photos/abcdefgh12/owner', 'MAIN', true);
expect('登記搬家後：接手活動', withXfer, MAIN, W, '/orienteering/runs/QWERTY/meta/owner', 'MAIN', true);
expect('登記搬家後：接手投稿活動', withXfer, MAIN, W, '/orienteering/contrib/ZXCVBN/meta/owner', 'MAIN', true);
expect('登記搬家後：接手老師代碼', withXfer, MAIN, W, '/excel-rescue-t/AAAAAA/meta/owner', 'MAIN', true);
expect('只有主帳號能讓舊帳號退休', base, TEA, W, '/sys/retired/seat', true, false);
expect('主帳號讓舊帳號退休', base, MAIN, W, '/sys/retired/seat', true, true);

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

console.log(`\n${fail ? '❌' : '✅'} 通過 ${pass} 項，失敗 ${fail} 項`);
process.exit(fail ? 1 : 0);
