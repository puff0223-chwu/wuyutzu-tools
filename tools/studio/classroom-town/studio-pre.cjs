// 攝影棚前置：把測試網址換成正式網址、截圖存到 studio/
const pw = require('playwright');
const FIX = `(() => { const fix = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/localhost:5179|127\\.0\\.0\\.1/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/https?:\\/\\/localhost:5179|localhost:5179|127\\.0\\.0\\.1:\\d+/g, 'grade-query-system-coral.vercel.app'); } };
  const go = () => { fix(); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true, characterData: true }); };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go); })();`;
const orig = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await orig(...a);
  const nc = b.newContext.bind(b);
  b.newContext = async (o = {}) => { const c = await nc(o); await c.addInitScript(FIX); return c; };
  const np = b.newPage.bind(b);
  b.newPage = async (o = {}) => { const c = await b.newContext(o); return c.newPage(); };
  return b;
};
