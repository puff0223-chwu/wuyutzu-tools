/* 👥 巫魚子教課事務所：會員（老師帳號）共用設定與核准檢查
   - 老師在會員中心（account/）自己申請帳號 → 管理員核准，並勾選可以用哪些系統
   - 資料：staff/<uid> = { email, name, school, purpose, want{app:true}, at, status: pending|approved|rejected|disabled, apps{app:true}, note }
   - 各系統的「系統擁有者帳號」（巫魚子自己的 +gps、+seat、+excel）不用申請，直接可以用
   ⚠ 這裡的檢查只負責「畫面」；真正擋資料的是 Firebase 安全規則（規則裡有同樣的條件） */
(function (root) {
  var ADMIN = 'puff0223+excel@gmail.com';
  var APPS = {
    excel: { name: '📊 消失的實驗數據', desc: 'Excel 作圖與函數 Ending 作業（每位學生專屬數據）', url: 'inquiry/excel-rescue-teacher.html', owner: 'puff0223+excel@gmail.com' },
    gps: { name: '🧭 遺落的地點', desc: '校園照片定向越野（學生手機闖關）', url: 'inquiry/orienteering/', owner: 'puff0223+gps@gmail.com' },
    seat: { name: '🪑 座位大作戰', desc: '換座位：暗標、規則、隨機排位、A4 座位表', url: 'classroom/seating/', owner: 'puff0223+seat@gmail.com' }
  };
  var STATUS = { pending: '⏳ 等待核准', approved: '✅ 已核准', rejected: '❌ 未通過', disabled: '⏸ 已停用' };
  function lower(s) { return String(s || '').trim().toLowerCase(); }
  function isAdmin(user) { return !!user && lower(user.email) === ADMIN; }
  function isOwner(user, app) { return !!user && !!APPS[app] && lower(user.email) === APPS[app].owner; }
  // getFn(path) → Promise(value)；回傳 { ok, rec, reason }
  function check(getFn, user, app) {
    if (!user) return Promise.resolve({ ok: false, reason: 'login' });
    if (isOwner(user, app) || isAdmin(user)) return Promise.resolve({ ok: true, owner: true });
    return Promise.resolve(getFn('staff/' + user.uid)).then(function (rec) {
      if (!rec) return { ok: false, reason: 'none' };
      if (rec.status === 'approved' && rec.apps && rec.apps[app]) return { ok: true, rec: rec };
      return { ok: false, rec: rec, reason: rec.status === 'approved' ? 'noapp' : rec.status || 'none' };
    }, function () { return { ok: false, reason: 'error' }; });
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
      error: '讀取帳號資料失敗（可能是網路問題），請重新整理。'
    }[res.reason] || '這個帳號目前不能使用' + a.name + '。';
    return '<div style="max-width:460px;margin:10vh auto;background:#fffdf8;border:2px solid #1f2a44;border-radius:18px;box-shadow:4px 4px 0 #f2b134;padding:26px;font-family:\'Noto Sans TC\',sans-serif;color:#1f2a44;line-height:1.7">' +
      '<div style="font-size:2.4em">🔐</div><h2 style="margin:6px 0">' + a.name + '</h2>' +
      (email ? '<div style="color:#7a8196;font-size:.9em">目前登入：' + String(email).replace(/</g, '&lt;') + '</div>' : '') +
      '<p style="margin:12px 0">' + msg + '</p>' +
      '<a href="' + url + '" style="display:inline-block;background:#f2b134;border:2px solid #1f2a44;border-radius:10px;padding:8px 16px;font-weight:900;color:#1f2a44;text-decoration:none">👥 前往會員中心</a> ' +
      '<button data-staff-logout style="background:#fff;border:2px solid #1f2a44;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;margin-left:6px">登出</button></div>';
  }
  root.WuStaff = { ADMIN: ADMIN, APPS: APPS, STATUS: STATUS, isAdmin: isAdmin, isOwner: isOwner, check: check, centerURL: centerURL, blockedHTML: blockedHTML };
})(this);
