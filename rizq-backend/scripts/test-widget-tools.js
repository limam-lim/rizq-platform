/**
 * اختبار أدوات مدير رزق الذكي (بدون Claude API)
 */
const { executeWidgetTool, resolvePageContextFacts } = require('../services/widgetAgentTools');

const tests = [];

tests.push(['get_ad_details missing', !executeWidgetTool('get_ad_details', { ad_id: 'NOPE' }).ok]);
tests.push(['search_ads ok', executeWidgetTool('search_ads', { limit: 3 }).ok]);
const pkgsAr = executeWidgetTool('get_packages_info', { lang: 'ar' });
tests.push(['packages source', pkgsAr.ok && pkgsAr.source === 'rizq_packages_config']);
tests.push(['packages ar count', Array.isArray(pkgsAr.packages) && pkgsAr.packages.length >= 4]);
tests.push(['packages not old silver', !pkgsAr.packages.some((p) => /فضي|Argent|Silver/i.test(p.name || ''))]);
tests.push(['packages has approved prices', pkgsAr.packages.some((p) => p.price === 1500) && pkgsAr.packages.some((p) => p.price === 5000)]);
tests.push(['page context empty', resolvePageContextFacts(null).ads.length === 0]);

console.log('\n=== Widget Agent Tools ===');
tests.forEach(([n, pass]) => console.log((pass ? 'OK' : 'FAIL') + ' ' + n));
const ok = tests.every(([, p]) => p);
console.log(ok ? '\nALL PASSED' : '\nFAILED');
process.exit(ok ? 0 : 1);
