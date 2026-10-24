// 攝影棚用的假 account/fb.js：登入＝管理員；讀寫走本機假資料庫（/__db），監聽用輪詢
const BASE = location.origin + "/__db/";
export const SDK = 'fake';
export const firebaseConfig = { databaseURL: location.origin + '/__db' };
export const authErr = (e) => '登入失敗：' + (e && (e.code || e.message) || e);
export const googleButtonHTML = (id, text) => `<button type="button" id="${id}">${text || 'Google'}</button>`;
const USER = { uid: 'wuadmin', email: 'puff0223@gmail.com', emailVerified: true, displayName: '巫魚子', getIdToken: async () => 'fake' };
const url = (p) => BASE + String(p || '').replace(/^\/+/, '') + '.json';
const sv = (v) => v;
const req = async (m, p, v) => { const r = await fetch(url(p), { method: m, headers: { 'Content-Type': 'application/json' }, body: v === undefined ? undefined : JSON.stringify(v) }); return r.json(); };
const pid = () => '-N' + Date.now().toString(16) + Math.random().toString(36).slice(2, 10);
const D = {
  ref: (db, p) => ({ path: p || '' }),
  push: (r) => ({ key: pid(), path: r.path }),
  onValue: (r, cb) => poll(r.path, (v) => cb({ val: () => v, key: r.path.split('/').pop(), exists: () => v != null })),
  onChildAdded: (r, cb) => { const seen = new Set(); return poll(r.path, (v) => { if (v && typeof v === 'object') for (const k of Object.keys(v)) if (!seen.has(k)) { seen.add(k); cb({ key: k, val: () => v[k] }); } }); },
  serverTimestamp: () => ({ '.sv': 'timestamp' }), goOnline() {}, goOffline() {}
};
function poll(p, cb) {
  let last = undefined, stop = false;
  const tick = async () => { if (stop) return; try { const v = await req('GET', p); const s = JSON.stringify(v); if (s !== last) { last = s; cb(v); } } catch (e) {} setTimeout(tick, 400); };
  tick(); return () => { stop = true; };
}
export async function openFirebase() {
  return {
    app: {}, auth: { currentUser: USER }, db: {}, A: {}, D,
    user: () => USER, onUser: (cb) => { setTimeout(() => cb(USER), 0); return () => {}; },
    login: async () => ({ user: USER }), google: async () => ({ user: USER }), register: async () => ({ user: USER }),
    verify: async () => {}, reload: async () => USER, logout: async () => {}, reset: async () => {},
    get: (p) => req('GET', p), set: (p, v) => req('PUT', p, v === undefined ? null : v), update: (p, v) => req('PATCH', p, v), remove: (p) => req('DELETE', p),
    listen: (p, cb) => poll(p, cb), idle: () => () => {}, close: async () => {}
  };
}
