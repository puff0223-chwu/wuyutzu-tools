/* 👥 巫魚子教課事務所：會員（老師帳號）共用設定與核准檢查
   - 老師在會員中心（account/）自己申請帳號 → 管理員核准，並勾選可以用哪些系統
   - 資料：staff/<uid> = { email, name, school, purpose, want{app:true}, at, status: pending|approved|rejected|disabled, apps{app:true}, note }
   - 管理員＝主帳號 puff0223@gmail.com（信箱要已驗證；用 Google 登入一定是已驗證），所有系統都能用
   - 舊的系統專用帳號（+gps、+seat、+excel）2026-10-18 已搬家完成並從 Firebase 刪除，規則與這裡都不再特別處理
   ⚠ 這裡的檢查只負責「畫面」；真正擋資料的是 Firebase 安全規則（規則裡有同樣的條件） */
(function (root) {
  var ADMIN = 'puff0223@gmail.com';
  var APPS = {
    excel: { name: '📊 消失的實驗數據', desc: 'Excel 作圖與函數 Ending 作業（每位學生專屬數據）', url: 'inquiry/excel-rescue-teacher.html' },
    gps: { name: '🧭 遺落的地點', desc: '校園照片定向越野（學生手機闖關）', url: 'inquiry/orienteering/' },
    seat: { name: '🪑 座位大作戰', desc: '換座位：暗標、規則、隨機排位、A4 座位表', url: 'classroom/seating/' },
    src: { name: '📜 出處失傳的秘文', desc: '文獻查詢、引用與參考文獻格式（小論文 APA）', url: 'inquiry/secret-source/teacher.html' },
    lab: { name: '⚗️ 化學實驗室 No.223', desc: '消失的實驗器材、消失的指示劑（pH）、失落的配方（單位換算）：開活動、即時統計', url: 'chemistry/lab223.html' }
  };
  var STATUS = { pending: '⏳ 等待核准', approved: '✅ 已核准', rejected: '❌ 未通過', disabled: '⏸ 已停用' };
  function lower(s) { return String(s || '').trim().toLowerCase(); }
  function isAdmin(user) { return !!user && lower(user.email) === ADMIN && user.emailVerified === true; }
  // 舊的系統專用帳號已經全部移除（保留函式名稱，舊程式呼叫不會壞）
  function isOwner() { return false; }
  // Email 當成資料位置的寫法（小寫、. 換成 ,）：預先開通 staffpre/<ekey>，規則裡用同樣的算法核對
  function ekey(email) { return lower(email).replace(/\./g, ','); }
  function legacyApp(user) { for (var k in APPS) if (isOwner(user, k)) return k; return ''; }
  // getFn(path) → Promise(value)；回傳 { ok, rec, reason }
  function check(getFn, user, app) {
    if (!user) return Promise.resolve({ ok: false, reason: 'login' });
    if (isAdmin(user)) return Promise.resolve({ ok: true, owner: true, admin: true });
    return Promise.resolve().then(function () {
      return Promise.resolve(getFn('staff/' + user.uid)).then(function (rec) {
        if (rec && rec.status === 'approved' && rec.apps && rec.apps[app]) return { ok: true, rec: rec };
        if (!rec || rec.status === 'pending') {
          // 管理員預先開通了這個 Email → 請他到會員中心啟用（第一次登入，一下子就好）
          return Promise.resolve(getFn('staffpre/' + ekey(user.email))).then(function (pre) { return pre ? { ok: false, rec: rec, reason: 'pre' } : (rec ? { ok: false, rec: rec, reason: 'pending' } : { ok: false, reason: 'none' }); }, function () { return rec ? { ok: false, rec: rec, reason: 'pending' } : { ok: false, reason: 'none' }; });
        }
        return { ok: false, rec: rec, reason: rec.status === 'approved' ? 'noapp' : rec.status || 'none' };
      });
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }
  // 從某個系統頁面連到會員中心的網址（base＝那個頁面到網站根目錄的相對路徑，例如 '../../'）
  function centerURL(base, app) { return (base || '') + 'account/' + (app ? '?app=' + app : ''); }
  // 沒有權限時顯示的說明（各系統自己決定放在哪裡）
  function blockedHTML(res, app, base, email) {
    var a = APPS[app] || { name: '這個系統' }, url = centerURL(base, app);
    var msg = {
      none: '這個帳號還沒有申請使用' + a.name + '。',
      pending: '你的帳號申請已送出，<b>正在等待大師核准</b>。核准後重新整理這一頁就能使用。',
      noapp: '你的帳號已核准，但還沒有開通' + a.name + '。可以到會員中心申請加開。',
      rejected: '你的帳號申請沒有通過。如有疑問請聯絡巫魚子老師。',
      disabled: '你的帳號已暫停使用。如有疑問請聯絡巫魚子老師。',
      pre: '🎫 巫魚子老師已經幫你開通了！請到會員中心按一下就能啟用（第一次需要）。',
      retired: '這個舊的系統專用帳號已經搬家到主帳號，資料都在主帳號裡了。請登出，改用主帳號（Google 登入）。',
      error: '讀取帳號資料失敗（可能是網路問題），請重新整理。'
    }[res.reason] || '這個帳號目前不能使用' + a.name + '。';
    return '<div style="max-width:460px;margin:10vh auto;background:#fffdf8;border:2px solid #1f2a44;border-radius:18px;box-shadow:4px 4px 0 #f2b134;padding:26px;font-family:\'Noto Sans TC\',sans-serif;color:#1f2a44;line-height:1.7">' +
      '<div style="font-size:2.4em">🔐</div><h2 style="margin:6px 0">' + a.name + '</h2>' +
      (email ? '<div style="color:#7a8196;font-size:.9em">目前登入：' + String(email).replace(/</g, '&lt;') + '</div>' : '') +
      '<p style="margin:12px 0">' + msg + '</p>' +
      '<a href="' + url + '" style="display:inline-block;background:#f2b134;border:2px solid #1f2a44;border-radius:10px;padding:8px 16px;font-weight:900;color:#1f2a44;text-decoration:none">' + (res.reason === 'pre' ? '🎫 到會員中心啟用' : '👥 前往會員中心') + '</a> ' +
      '<button data-staff-logout style="background:#fff;border:2px solid #1f2a44;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;margin-left:6px">登出</button></div>';
  }
  root.WuStaff = { ADMIN: ADMIN, APPS: APPS, STATUS: STATUS, isAdmin: isAdmin, isOwner: isOwner, legacyApp: legacyApp, ekey: ekey, check: check, centerURL: centerURL, blockedHTML: blockedHTML };
})(this);
