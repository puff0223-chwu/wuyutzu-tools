const SC = require(require('path').join(__dirname, '../../classroom/seating/core.js'));
const r = require('./r301.json');
const c = SC.newClass('301', '');
c.teacherTitle = '巫昶昕 老師';
c.roster = r.map(([seat, name], i) => ({ seat, name, sid: '115' + String(seat).padStart(4, '0') }));
c.layout = SC.newLayout(6, 6);
// 走道：第 3 列後面；最後一排兩個角落關閉（36 → 32 個座位，30 人）
c.layout.cells = { '5-0': 'x', '5-5': 'x', '0-5': 'x', '0-0': 'x' };
c.cadres = c.cadres.map((x, i) => ({ ...x, seat: i < 16 ? (i * 7) % 30 + 1 : null }));
c.cleaning = [{ id: 'a1', name: '教室', items: [{ id: 'i1', name: '黑板、講桌', seats: [3, 17] }, { id: 'i2', name: '地板（前半）', seats: [5, 9, 22] }, { id: 'i3', name: '地板（後半）', seats: [11, 26, 28] }, { id: 'i4', name: '垃圾、回收', seats: [2, 14] }, { id: 'i5', name: '窗戶', seats: [8, 19] }] },
  { id: 'a2', name: '外掃', items: [{ id: 'i6', name: '三樓走廊', seats: [4, 12, 20] }, { id: 'i7', name: '樓梯', seats: [6, 24] }, { id: 'i8', name: '廁所', seats: [10, 15, 29] }] }];
c.secret = [{ id: 's1', type: 'apart', who: [7, 12], on: true }, { id: 's2', type: 'zone', who: [3, 25], mode: 'rows', list: [0, 1], on: true }];
console.log(JSON.stringify(SC.sanitize(c)));
