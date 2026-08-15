/**
 * اختبار Go-Live — أدوات الويدجت + Fallback محلي + Claude حي (إن وُجد المفتاح)
 * + فحص المشرف على جانب الخادم
 *
 * الاستخدام:
 *   node scripts/live-widget-test.js           # أدوات + fallback + moderator
 *   node scripts/live-widget-test.js --seed    # يزرع 5 إعلانات تجريبية إن كانت القاعدة فارغة
 *   node scripts/live-widget-test.js --live    # يتطلب ANTHROPIC_API_KEY في .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { executeWidgetTool, resolvePageContextFacts } = require('../services/widgetAgentTools');
const { inspectAdForPublish } = require('../services/moderatorServer');
const { handleWidgetChat } = require('../services/widgetChat');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

const args = process.argv.slice(2);
const DO_SEED = args.includes('--seed');
const DO_LIVE = args.includes('--live');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const SAMPLE_ADS = [
  { id: 'RZQ-2026-10001', title: 'آيفون 14 برو ماكس 256GB', desc: 'حالة ممتازة مع الكرتونة', price: '185000', category: 'electronics', wilaya: 'نواكشوط', seller_trust_score: 82, status: 'active', accountId: 'acc_demo_store_1', createdAt: '2026-08-01T10:00:00.000Z' },
  { id: 'RZQ-2026-10002', title: 'طقم صالون 7 مقاعد', desc: 'خشب زان طبيعي', price: '45000', category: 'furniture', wilaya: 'نواذيبو', seller_trust_score: 71, status: 'active', accountId: 'acc_demo_store_1', createdAt: '2026-08-02T10:00:00.000Z' },
  { id: 'RZQ-2026-10003', title: 'دراجة نارية Yamaha 125', desc: 'موديل 2024', price: '320000', category: 'vehicles', wilaya: 'نواكشوط', seller_trust_score: 65, status: 'active', accountId: 'acc_demo_ind_1', createdAt: '2026-08-03T10:00:00.000Z' },
  { id: 'RZQ-2026-10004', title: 'شقة 3 غرف للإيجار', desc: 'حي تفرغ زينة', price: '25000', category: 'real_estate', wilaya: 'نواكشوط', seller_trust_score: 88, status: 'active', accountId: 'acc_demo_office_1', createdAt: '2026-08-04T10:00:00.000Z' },
  { id: 'RZQ-2026-10005', title: 'ثلاجة LG 450 لتر', desc: 'نظيفة جداً', price: '28000', category: 'appliances', wilaya: 'كيفة', seller_trust_score: 74, status: 'active', accountId: 'acc_demo_store_1', createdAt: '2026-08-05T10:00:00.000Z' },
];

const SAMPLE_ACCOUNTS = [
  { id: 'acc_demo_store_1', type: 'store', name: 'متجر النجمة', city: 'نواكشوط', status: 'approved', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'acc_demo_ind_1', type: 'individual', name: 'محمد ولد أحمد', city: 'نواكشوط', status: 'approved', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'acc_demo_office_1', type: 'office', name: 'مكتب العقارات الذهبية', city: 'نواكشوط', status: 'approved', createdAt: '2026-01-01T00:00:00.000Z' },
];

function seedIfNeeded() {
  let ads = readJson(ADS_FILE, []);
  if (!ads.length && DO_SEED) {
    ads = SAMPLE_ADS.slice();
    writeJson(ADS_FILE, ads);
    console.log('[seed] wrote', ads.length, 'sample ads to ads.json');
  }
  let accounts = readJson(ACCOUNTS_FILE, []);
  if (!accounts.length && DO_SEED) {
    writeJson(ACCOUNTS_FILE, SAMPLE_ACCOUNTS);
    console.log('[seed] wrote sample accounts');
  }
  return ads.filter((a) => a.status === 'active');
}

function runToolTests(activeAds) {
  const results = [];
  const push = (name, pass, detail) => results.push({ name, pass, detail });

  if (!activeAds.length) {
    push('active ads available', false, 'ads.json فارغ — شغّل مع --seed');
    return results;
  }

  push('active ads available', true, activeAds.length + ' إعلان');

  activeAds.slice(0, 5).forEach((ad) => {
    const r = executeWidgetTool('get_ad_details', { ad_id: ad.id });
    push('get_ad_details ' + ad.id, r.ok && r.ad && r.ad.price === ad.price, r.ok ? 'price=' + r.ad.price : r.error);
  });

  const search = executeWidgetTool('search_ads', { search: 'آيفون', limit: 3 });
  push('search_ads', search.ok && search.ads.length >= 1, 'found=' + (search.ads && search.ads.length));

  const firstAcc = activeAds[0].accountId;
  if (firstAcc) {
    const seller = executeWidgetTool('get_seller_profile', { account_id: firstAcc });
    push('get_seller_profile', seller.ok && seller.seller, seller.ok ? seller.seller.name : seller.error);
    const rep = executeWidgetTool('get_seller_reputation', { account_id: firstAcc, ad_id: activeAds[0].id });
    push('get_seller_reputation', rep.ok, rep.ok ? 'trust=' + rep.seller_trust_score : rep.error);
  }

  const ctx = resolvePageContextFacts({ page: 'browse', urlAdId: activeAds[0].id });
  push('page context facts', ctx.ads.length >= 1, 'ads=' + ctx.ads.length);

  return results;
}

function runFallbackTests(activeAds) {
  const results = [];
  const push = (name, pass, detail) => results.push({ name, pass, detail });

  let RizqManager;
  try {
    RizqManager = require('../../rizq_manager_agent_config.js');
  } catch (e) {
    push('RizqManager load', false, e.message);
    return results;
  }

  push('RizqManager load', !!RizqManager.processMessage, 'ok');

  const ad = activeAds[0];
  const pageContext = ad ? {
    page: 'browse',
    ad: { id: ad.id, title: ad.title, price: ad.price, seller_trust_score: ad.seller_trust_score },
  } : null;
  const priceQ = RizqManager.processMessage('كم سعر هذا الإعلان؟', { uiLang: 'ar', pageContext });
  const hasPriceReply = priceQ && priceQ.reply && /185000|السعر/.test(priceQ.reply);
  push('local fallback price question', hasPriceReply, hasPriceReply ? priceQ.reply.slice(0, 80) : (priceQ.reply || 'no reply'));

  const timeoutSim = RizqManager.processMessage('ما هي طرق الدفع؟', { uiLang: 'ar' });
  push('local fallback payment FAQ', !!(timeoutSim && timeoutSim.reply), timeoutSim.reply ? timeoutSim.reply.slice(0, 60) : '');

  return results;
}

function runModeratorTests() {
  const results = [];
  const push = (name, pass, detail) => results.push({ name, pass, detail });

  const clean = inspectAdForPublish({ title: 'ثلاجة LG', desc: 'نظيفة', price: '28000', category: 'appliances' });
  push('moderator clean ad', clean.decision === 'approve' || clean.decision === 'review_human', clean.decision);

  const alcohol = inspectAdForPublish({ title: 'بيع خمر فرنسي', desc: 'زجاجة ويسكي', price: '5000', category: 'other' });
  push('moderator reject alcohol', alcohol.decision === 'reject', alcohol.decision + ' ' + (alcohol.codes && alcohol.codes[0] && alcohol.codes[0].code));

  const fraud = inspectAdForPublish({
    title: 'فرصة ذهبية',
    desc: 'تحويل مسبق ودفع أولاً قبل الاستلام western union',
    price: '1000',
    category: 'other',
  });
  push('moderator reject fraud', fraud.decision === 'reject', fraud.decision);

  const url = inspectAdForPublish({ title: 'منتج', desc: 'زور https://spam.com', price: '100', category: 'other' });
  push('moderator reject external URL', url.decision === 'reject', url.decision);

  return results;
}

async function runLiveClaudeTests(activeAds) {
  const results = [];
  const push = (name, pass, detail) => results.push({ name, pass, detail });

  if (!process.env.ANTHROPIC_API_KEY) {
    push('ANTHROPIC_API_KEY', false, 'غير موجود في .env — أضف المفتاح ثم --live');
    return results;
  }

  push('ANTHROPIC_API_KEY', true, 'present');

  const queries = activeAds.slice(0, 3).map((ad, i) => ({
    ad,
    message: i === 0 ? 'كم سعر هذا الإعلان؟' : i === 1 ? 'هل البائع موثوق؟' : 'ما تفاصيل الإعلان ' + ad.title + '؟',
  }));

  for (const q of queries) {
    try {
      const start = Date.now();
      const result = await handleWidgetChat({
        message: q.message,
        lang: 'ar',
        pageContext: { page: 'browse', urlAdId: q.ad.id },
        history: [],
      });
      const ms = Date.now() - start;
      const pass = result.ok && result.reply && (result.toolsUsed > 0 || result.grounded);
      push('live Claude ad ' + q.ad.id, pass, ms + 'ms tools=' + result.toolsUsed + ' grounded=' + result.grounded);
    } catch (e) {
      push('live Claude ad ' + q.ad.id, false, e.message);
    }
  }

  return results;
}

function printSection(title, results) {
  console.log('\n=== ' + title + ' ===');
  results.forEach((r) => console.log((r.pass ? 'OK' : 'FAIL') + '  ' + r.name + (r.detail ? ' — ' + r.detail : '')));
  return results.every((r) => r.pass);
}

async function main() {
  console.log('\nRIZQ Go-Live Live Test');
  console.log('Date:', new Date().toISOString());

  const activeAds = seedIfNeeded();
  if (!activeAds.length && !DO_SEED) {
    console.log('\n[WARN] ads.json فارغ. استخدم: node scripts/live-widget-test.js --seed');
  }

  const sections = [
    ['Deterministic Tools', runToolTests(activeAds)],
    ['Local Fallback (7s path)', runFallbackTests(activeAds)],
    ['Server Moderator', runModeratorTests()],
  ];

  if (DO_LIVE) {
    sections.push(['Live Claude API', await runLiveClaudeTests(activeAds)]);
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n[INFO] ANTHROPIC_API_KEY موجود — أضف --live لتشغيل Claude حي');
  } else {
    console.log('\n[INFO] ANTHROPIC_API_KEY غير موجود في .env');
  }

  let allOk = true;
  sections.forEach(([title, res]) => {
    if (!printSection(title, res)) allOk = false;
  });

  console.log(allOk ? '\n=== ALL SECTIONS PASSED ===' : '\n=== SOME CHECKS FAILED ===');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
