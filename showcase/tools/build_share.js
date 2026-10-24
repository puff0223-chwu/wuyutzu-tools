/* =========================================================
   🏛️ 教師展覽館：產生「社群分享頁」share/<代號>.html
   ---------------------------------------------------------
   為什麼要另外產生？LINE、Facebook 抓分享預覽時不會執行 JavaScript，
   所以每一頁要是「已經寫好內容」的 HTML，標題、介紹、預覽圖才抓得到。
   內容和說明頁一樣來自 data.js，排版用 showcase.js 的 pageHTML(t, 'share')，
   所以改了 data.js 之後要重新執行：

     node showcase/tools/build_share.js          ← 產生分享頁
     python3 showcase/tools/make_og.py           ← 重做社群預覽圖（要 Playwright，在 Claude 那邊跑）

   分享頁的規則：完全沒有任何 <a> 連結（不能連回展覽館、事務所、會員中心），
   圖片可以點開放大（不是連結）。只產生「會員中心 APPS 有、而且 data.js 寫好說明」的系統；
   系統從 APPS 拿掉時，舊的分享頁會被刪除。
   ========================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), SITE = path.join(ROOT, '..');
const VER = '20261024b';

const ctx = { console };
vm.createContext(ctx);
for (const f of [path.join(SITE, 'account/staff.js'), path.join(ROOT, 'data.js'), path.join(ROOT, 'showcase.js')]) {
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
}
const SC = ctx.SHOWCASE;
const esc = SC.esc;
const items = SC.list().filter((t) => t.ready);

if (process.argv.includes('--json')) {   // 給 make_og.py 用
  const DR = SC.drawers();
  console.log(JSON.stringify(items.map((t) => ({ code: t.code, icon: t.icon, name: t.name, sub: SC.plain(t.sub), brief: SC.plain(t.brief),
    color: (DR[t.drawer] || DR[0]).color, soft: (DR[t.drawer] || DR[0]).soft, drawer: (DR[t.drawer] || DR[0]).name, shot: (t.shots || [])[0] || null }))));
  process.exit(0);
}

const OUT = path.join(ROOT, 'share');
fs.mkdirSync(OUT, { recursive: true });
const keep = new Set();
for (const t0 of items) {
  // 分享頁在 showcase/share/ 底下，圖片路徑要往上一層
  const t = Object.assign({}, t0, { shots: (t0.shots || []).map((s) => ['../' + s[0]].concat(s.slice(1))) });
  const DR = SC.drawers(), d = DR[t.drawer] || DR[0];
  const url = SC.shareURL(t.code), og = SC.SITE + 'share/og/' + t.code + '.jpg';
  const desc = SC.plain(t.intro || t.brief).replace(/\s+/g, ' ').slice(0, 150);
  const title = `${t.icon} ${t.name}｜巫魚子教課事務所 教師展覽館`;
  const html = `<!DOCTYPE html>
<html lang="zh-TW" style="--accent:${d.color};--soft:${d.soft}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- ⚠️ 這個檔案是 showcase/tools/build_share.js 自動產生的，請改 data.js 後重新產生，不要手改 -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="巫魚子教課事務所｜教師展覽館">
<meta property="og:title" content="${esc(t.icon + ' ' + t.name + '｜' + SC.plain(t.sub))}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@700;900&family=Bebas+Neue&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../showcase.css?v=${VER}">
</head>
<body class="share">
<div class="gtop share-top">
  <div class="brand"><small>WU YU-ZI TEACHING STUDIO · TEACHER GALLERY</small><span class="t">${esc(t.icon + ' ' + t.name)}・巫魚子教課事務所</span></div>
</div>
${SC.pageHTML(t, 'share')}
<script src="../showcase.js?v=${VER}"></script>
<script>SHOWCASE.enhance();</script>
</body>
</html>
`;
  // 安全檢查：分享頁不能有任何連結（目錄的 #錨點除外）
  const bad = (html.match(/<a\s[^>]*href="([^"]*)"/g) || []).filter((a) => !/href="#/.test(a));
  if (bad.length) throw new Error(`${t.code} 的分享頁出現連結：${bad.join(' ')}`);
  fs.writeFileSync(path.join(OUT, t.code + '.html'), html);
  keep.add(t.code + '.html');
  console.log('✅ share/' + t.code + '.html');
}
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith('.html') && !keep.has(f)) { fs.unlinkSync(path.join(OUT, f)); console.log('🗑 已移除（系統不再開放）：share/' + f); }
}
