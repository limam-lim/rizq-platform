/**
 * اختبار أدوات مدير رزق الذكي (بدون Claude API)
 */
const { executeWidgetTool, resolvePageContextFacts } = require('../services/widgetAgentTools');

(async () => {
  const tests = [];

  tests.push(['get_ad_details missing', !(await executeWidgetTool('get_ad_details', { ad_id: 'NOPE' })).ok]);
  tests.push(['search_ads ok', (await executeWidgetTool('search_ads', { limit: 3 })).ok]);
  const pkgsAr = await executeWidgetTool('get_packages_info', { lang: 'ar' });
  // المصدر الحي (site-config) هو المرجع؛ rizq_packages_config احتياطي فقط
  tests.push(['packages source', pkgsAr.ok && ['live_catalog', 'rizq_packages_config'].includes(pkgsAr.source)]);
  tests.push(['packages ar count', Array.isArray(pkgsAr.packages) && pkgsAr.packages.length >= 4]);
  tests.push(['packages not old silver', !pkgsAr.packages.some((p) => /فضي|Argent|Silver/i.test(p.name || ''))]);
  // الأسعار تُدار من لوحة الأدمن — نتحقق من وجود باقة تجريبية وباقات مدفوعة بأسعار رقمية موجبة
  tests.push(['packages has trial + paid prices', pkgsAr.packages.some((p) => Number(p.price) === 0)
    && pkgsAr.packages.filter((p) => Number(p.price) > 0).length >= 3]);
  tests.push(['page context empty', (await resolvePageContextFacts(null)).ads.length === 0]);

  console.log('\n=== Widget Agent Tools ===');
  tests.forEach(([n, pass]) => console.log((pass ? 'OK' : 'FAIL') + ' ' + n));
  const ok = tests.every(([, p]) => p);
  console.log(ok ? '\nALL PASSED' : '\nFAILED');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
