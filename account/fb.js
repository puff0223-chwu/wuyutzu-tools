/* 🔌 巫魚子教課事務所：老師頁共用的 Firebase 連線與登入（ES module）
   - Firebase 設定、SDK 版本只寫在這裡；各系統用 openFirebase('系統名') 拿到連線（2026-10-20 起全部共用同一個登入）
   - 登入：Email＋密碼，或 Google 帳號（popup，被擋時改用整頁跳轉）
   - 學生頁不用這個檔：學生頁用 REST（fetch / EventSource），不載 SDK，比較輕
   用法：const { FB } = await import('../account/fb.js?v=…');  const FB = await openFirebase('excel'); */
export const SDK = '10.14.1';
export const firebaseConfig = {
  apiKey: 'AIzaSyCRrmtcQ8INfbK0XgwkAZCx8V5wXCwU1lg',
  authDomain: 'point-collection-stash.firebaseapp.com',
  databaseURL: 'https://point-collection-stash-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'point-collection-stash',
  storageBucket: 'point-collection-stash.firebasestorage.app',
  messagingSenderId: '391627703615',
  appId: '1:391627703615:web:f9b8c358f147949a1d7f8a'
};
const B = `https://www.gstatic.com/firebasejs/${SDK}/`;
let libs = null;
const loadLibs = () => libs || (libs = Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-database.js')]));

// 登入錯誤訊息（各系統共用）
const ERR = {
  'auth/email-already-in-use': '這個 Email 已經註冊過了，請直接登入（忘記密碼可以按「忘記密碼」）',
  'auth/invalid-email': 'Email 格式不對', 'auth/weak-password': '密碼至少要 6 個字',
  'auth/invalid-credential': 'Email 或密碼不對', 'auth/wrong-password': 'Email 或密碼不對', 'auth/user-not-found': '找不到這個帳號，要先到會員中心申請',
  'auth/too-many-requests': '嘗試太多次了，請稍後再試',
  'auth/operation-not-allowed': '這種登入方式還沒開放（請聯絡巫魚子老師）',
  'auth/popup-closed-by-user': '登入視窗被關掉了，再按一次就好', 'auth/cancelled-popup-request': '登入視窗被關掉了，再按一次就好',
  'auth/unauthorized-domain': '這個網址還沒加入 Firebase 的「授權網域」（請聯絡巫魚子老師）',
  'auth/account-exists-with-different-credential': '這個 Email 之前是用密碼註冊的，請用 Email＋密碼登入',
  'auth/network-request-failed': '網路連不上，請確認網路後再試'
};
export const authErr = (e) => ERR[e && e.code] || ('登入失敗：' + ((e && (e.code || e.message)) || e));

// 2026-10-20：所有老師頁共用同一個 app 名稱 → 登入狀態存在同一個地方（瀏覽器的 IndexedDB），
// 在會員中心登入後，同一個瀏覽器打開座位大作戰、消失的實驗數據、遺落的地點、出處失傳的秘文都不用再登入；
// 任何一個分頁登出，其他分頁也會跟著登出。以前每個系統用自己的名字（'src'、'excel'…），登入狀態各存各的，才會一直要重新登入
const APP_NAME = 'wuyutzu';
export async function openFirebase(name) {
  const [{ initializeApp, getApps, deleteApp }, A, D] = await loadLibs();
  const old = getApps().find((a) => a.name === APP_NAME);
  const app = old || initializeApp(firebaseConfig, APP_NAME);
  const auth = A.getAuth(app), db = D.getDatabase(app);
  if (old) D.goOnline(db); // 同名的連線之前被關過的話，先接回來（不然讀寫會一直等）
  A.getRedirectResult(auth).catch(() => {}); // Google 整頁跳轉回來時，把登入結果收下
  const google = async () => {
    const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { return await A.signInWithPopup(auth, p); }
    catch (e) { if (e && e.code === 'auth/popup-blocked') return A.signInWithRedirect(auth, p); throw e; }
  };
  return {
    app, auth, db, A, D,
    user: () => auth.currentUser,
    onUser: (cb) => A.onAuthStateChanged(auth, cb),
    login: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
    google,
    register: (email, pw) => A.createUserWithEmailAndPassword(auth, email, pw),
    verify: (u) => A.sendEmailVerification(u || auth.currentUser),
    reload: async () => { await A.reload(auth.currentUser); await auth.currentUser.getIdToken(true); return auth.currentUser; },
    logout: () => A.signOut(auth),
    reset: (email) => A.sendPasswordResetEmail(auth, email),
    get: async (p) => (await D.get(D.ref(db, p))).val(),
    set: (p, v) => D.set(D.ref(db, p), v),
    update: (p, v) => D.update(D.ref(db, p), v),
    remove: (p) => D.remove(D.ref(db, p)),
    listen: (p, cb, onErr) => D.onValue(D.ref(db, p), (s) => cb(s.val()), (e) => (onErr ? onErr(e) : cb(null))),
    // 背景閒置省連線（2026-10-18 全站連線健檢）：分頁藏起來 ms 毫秒後 goOffline，回到前景 goOnline
    // SDK 回線後會自動重新同步 onValue、補送離線時排隊的寫入；⚠ 自動評分／裁判頁（定向越野 live.js）不要開
    idle: (ms = 60000) => {
      let t = null;
      const on = () => { clearTimeout(t); if (document.hidden) t = setTimeout(() => { try { D.goOffline(db); } catch (e) { } }, ms); else { try { D.goOnline(db); } catch (e) { } } };
      document.addEventListener('visibilitychange', on);
      return () => { clearTimeout(t); document.removeEventListener('visibilitychange', on); };
    },
    // 用完就整個拆掉（例如搬家用的第二個登入），不佔 Firebase 同時連線數；下次 openFirebase 同名會重新建立
    // ⚠ 2026-10-13 修正：原本只 goOffline，第二次搬家拿到同一條「已關掉」的連線，寫入一直等 → 卡住
    close: async () => { try { await A.signOut(auth); } catch (e) { } try { await deleteApp(app); } catch (e) { try { D.goOffline(db); } catch (x) { } } }
  };
}

// Google 按鈕（各系統登入畫面共用的樣子）
export const googleButtonHTML = (id, text) => `<button type="button" id="${id}" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#fff;color:#1f2a44;border:2px solid #1f2a44;border-radius:10px;padding:10px 14px;font-weight:900;font-size:1em;cursor:pointer;box-shadow:2px 2px 0 #1f2a44;font-family:inherit">
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
  ${text || '使用 Google 帳號登入'}</button>
  <div style="display:flex;align-items:center;gap:10px;margin:14px 0 2px;color:#7a8196;font-size:.85em"><span style="flex:1;height:1px;background:#d9d2c3"></span>或用 Email＋密碼<span style="flex:1;height:1px;background:#d9d2c3"></span></div>`;
