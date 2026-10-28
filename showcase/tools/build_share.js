/* =========================================================
   🏛️ 教師展覽館：產生「社群分享頁」share/<代號>.html
   ---------------------------------------------------------
   為什麼要另外產生？LINE、Facebook 抓分享預覽時不會執行 JavaScript，
   所以每一頁要是「已經寫好內容」的 HTML，標題、介紹、預覽圖才抓得到。
   排版用 showcase.js 的 pageHTML(t, 'share')，和說明頁內容永遠一致。

   內容來源（2026-10-28 起由管理頁 admin.html 管理，存在 Firebase showcase/pub）：
     node showcase/tools/build_share.js --pub pub.json   ← GitHub Action 每 30 分鐘自動跑（.github/workflows/showcase-share.yml）
     node showcase/tools/build_share.js                  ← 沒給 --pub：用內建內容 data.js＋drafts.js
     python3 showcase/tools/make_og.py [--pub pub.json]  ← 重做社群預覽圖（要 Playwright）

   分享頁的規則：完全沒有任何 <a> 連結（不能連回展覽館、事務所、會員中心），
   圖片可以點開放大（不是連結）。只產生「展出中、而且有寫說明」的系統；下架或刪除時舊分享頁會移除。
   老師在管理頁上傳的截圖（f:<id>）會下載成 share/media/<id>.webp（縮圖 share/media/t/）。
   ========================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), SITE = path.join(ROOT, '..');
const VER = '20261028c';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const ctx = { console };
vm.createContext(ctx);
for (const f of [path.join(SITE, 'account/staff.js'), path.join(ROOT, 'data.js'), path.join(ROOT, 'drafts.js'), path.join(ROOT, 'showcase.js')]) {
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
}
const SC = ctx.SHOWCASE;
const esc = SC.esc;
const PUBFILE = arg('--pub');
const PUB = PUBFILE ? JSON.parse(fs.readFileSync(PUBFILE, 'utf8')) : null;
SC.setPub(PUB && PUB.rev ? PUB : SC.seedPub(), PUB ? 'file' : 'seed');
const items = SC.list().filter((t) => t.ready);

/* 老師上傳的截圖 f:<id> → share/media/<id>.<副檔名>（GitHub Action 有網路；沒網路時沿用舊檔） */
const MEDIA = path.join(ROOT, 'share/media');
const extOf = (d) => (/^data:image\/(\w+)/.exec(d) || [])[1] === 'jpeg' ? 'jpg' : ((/^data:image\/(\w+)/.exec(d) || [])[1] || 'webp');
const fileOf = (id) => { for (const e of ['webp', 'jpg', 'png']) if (fs.existsSync(path.join(MEDIA, id + '.' + e))) return id + '.' + e; return ''; };
async function media() {
  const need = new Set();
  items.forEach((t) => (t.shots || []).forEach((s) => { if (String(s[0]).startsWith('f:')) need.add(s[0].slice(2)); }));
  fs.mkdirSync(path.join(MEDIA, 't'), { recursive: true });
  for (const id of need) {
    if (!/^[a-z0-9]{10,20}$/.test(id) || fileOf(id)) continue;   // 已下載過（圖片內容不會變，換圖＝新 id）
    try {
      const r = await fetch(`${SC.DB}/showcase/img/${id}.json`); const j = await r.json();
      if (!j || !/^data:image\//.test(j.data)) throw new Error('沒有圖片');
      const e = extOf(j.data);
      fs.writeFileSync(path.join(MEDIA, id + '.' + e), Buffer.from(j.data.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(MEDIA, 't', id + '.' + e), Buffer.from((j.t || j.data).split(',')[1], 'base64'));
      console.log('⬇️ share/media/' + id + '.' + e);
    } catch (err) { console.log('⚠️ 下載不到截圖 ' + id + '：' + err.message); }
  }
  for (const f of fs.readdirSync(MEDIA)) {   // 不再用到的圖刪掉
    if (f !== 't' && !need.has(f.replace(/\.\w+$/, ''))) { fs.unlinkSync(path.join(MEDIA, f)); try { fs.unlinkSync(path.join(MEDIA, 't', f)); } catch (e) { } }
  }
}
// 分享頁（在 share/ 底下）用的圖片路徑；f: 換成下載好的檔案，找不到就略過
const shareShots = (t) => (t.shots || []).map((s) => {
  const src = String(s[0]);
  if (src.startsWith('f:')) { const f = fileOf(src.slice(2)); return f ? ['media/' + f].concat(s.slice(1)) : null; }
  return [/^media\//.test(src) ? src : '../' + src].concat(s.slice(1));
}).filter(Boolean);

(async () => {
if (PUB) await media();

if (process.argv.includes('--json')) {   // 給 make_og.py 用（shot 路徑相對 showcase/）
  console.log(JSON.stringify(items.map((t) => { const d = SC.drawerOf(t), s = shareShots(t)[0] || null;
    if (s) s[0] = s[0].startsWith('../') ? s[0].slice(3) : 'share/' + s[0];
    return { code: t.code, icon: t.icon, name: t.name, sub: SC.plain(t.sub || t.brief), brief: SC.plain(t.brief), color: d.color, soft: d.soft, drawer: d.name, shot: s }; })));
  return;
}

const OUT = path.join(ROOT, 'share');
fs.mkdirSync(OUT, { recursive: true });
const keep = new Set();
for (const t0 of items) {
  // 分享頁在 showcase/share/ 底下，圖片路徑要往上一層
  const t = Object.assign({}, t0, { shots: shareShots(t0) });
  const d = SC.drawerOf(t);
  const url = SC.shareURL(t.code), og = SC.SITE + 'share/og/' + t.code + '.jpg';
  const desc = SC.plain(t.intro || t.brief || '').replace(/\s+/g, ' ').slice(0, 150);
  const title = `${t.icon} ${t.name}｜巫魚子教課事務所 教師展覽館`;
  const html = `<!DOCTYPE html>
<html lang="zh-TW" style="--accent:${d.color};--soft:${d.soft}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- ⚠️ 這個檔案是 showcase/tools/build_share.js 自動產生的，請到展覽館管理頁修改（GitHub 會自動重新產生），不要手改 -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="巫魚子教課事務所｜教師展覽館">
<meta property="og:title" content="${esc(t.icon + ' ' + t.name + '｜' + SC.plain(t.sub || t.brief))}">
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
if (PUB && PUB.rev) fs.writeFileSync(path.join(OUT, 'rev.txt'), String(PUB.rev) + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
