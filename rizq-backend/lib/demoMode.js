'use strict';
/**
 * DEMO_MODE — حكم الخادم لمخزون الديمو في الواجهة.
 * - true (افتراضي في مرحلة ما قبل الإطلاق): يُسمح بحقن الديمو بلا ?demo=1
 * - false (إنتاج): يُرفض أي ديمو ويُتجاهل ?demo=1 تماماً
 */
function parseDemoModeEnv(raw) {
  if (raw == null || String(raw).trim() === '') return true;
  const s = String(raw).trim().toLowerCase();
  if (s === '0' || s === 'false' || s === 'off' || s === 'no') return false;
  if (s === '1' || s === 'true' || s === 'on' || s === 'yes') return true;
  return true;
}

function isDemoModeEnabled() {
  return parseDemoModeEnv(process.env.DEMO_MODE);
}

function demoModeBootScript(enabled) {
  const flag = enabled ? 'true' : 'false';
  return (
    '<script>(function(){try{'
    + 'Object.defineProperty(window,"__RIZQ_DEMO_MODE",{'
    + 'value:' + flag + ',writable:false,configurable:false,enumerable:true'
    + '});'
    + '}catch(e){window.__RIZQ_DEMO_MODE=' + flag + ';}})();</script>'
  );
}

function injectDemoMode(html, enabled) {
  if (typeof html !== 'string' || !html) return html;
  const snip = demoModeBootScript(!!enabled);
  let out = html.replace(
    /<script>\(function\(\)\{try\{Object\.defineProperty\(window,"__RIZQ_DEMO_MODE"[\s\S]*?<\/script>/g,
    ''
  );
  if (/<head[^>]*>/i.test(out)) {
    return out.replace(/<head([^>]*)>/i, (m) => m + snip);
  }
  return snip + out;
}

module.exports = {
  parseDemoModeEnv,
  isDemoModeEnabled,
  demoModeBootScript,
  injectDemoMode,
};
