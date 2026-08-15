/**
 * أدوات مدير رزق الذكي — استعلامات حتمية من قاعدة البيانات (JSON/SQLite)
 * بدون تخمين — تُستدعى عبر function calling في /api/widget/chat
 */
const fs = require('fs');
const path = require('path');
const { saveTicket } = require('./agentTickets');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const AD_BOOSTS_FILE = path.join(DATA_DIR, 'ad_boosts.json');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function readAds() { return readJson(ADS_FILE, []); }
function readAccounts() { return readJson(ACCOUNTS_FILE, []); }
function readReviews() { return readJson(REVIEWS_FILE, {}); }
function readAdBoosts() { return readJson(AD_BOOSTS_FILE, {}); }

const ACCOUNT_PUBLIC = [
  'id', 'type', 'name', 'city', 'address', 'desc', 'promo_video', 'category',
  'whatsapp', 'facebook', 'thumb', 'tagline', 'status', 'approvedAt', 'createdAt',
];

function isBoosted(adId) {
  const b = readAdBoosts()[adId];
  return !!(b && b.endsAt && new Date(b.endsAt).getTime() > Date.now());
}

function publicAd(ad) {
  if (!ad) return null;
  return {
    id: ad.id,
    title: ad.title,
    titleFr: ad.titleFr || '',
    desc: String(ad.desc || '').slice(0, 400),
    descFr: String(ad.descFr || '').slice(0, 400),
    price: ad.price,
    originalPrice: ad.originalPrice || '',
    category: ad.category,
    subcat: ad.subcat || '',
    wilaya: ad.wilaya || '',
    accountId: ad.accountId || '',
    seller_trust_score: ad.seller_trust_score,
    status: ad.status,
    boosted: isBoosted(ad.id),
    stockQty: ad.stockQty,
    hasPhone: !!(ad.phone && String(ad.phone).trim()),
    hasWhatsapp: !!(ad.whatsapp && String(ad.whatsapp).trim()),
    createdAt: ad.createdAt,
  };
}

function publicAccount(acc) {
  if (!acc) return null;
  const out = {};
  ACCOUNT_PUBLIC.forEach((k) => { if (acc[k] !== undefined) out[k] = acc[k]; });
  out.verified = acc.status === 'approved';
  out.suspended = !!acc.suspended;
  return out;
}

function reviewStats(targetId) {
  const list = readReviews()[targetId] || [];
  if (!list.length) return { count: 0, average: 0 };
  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return { count: list.length, average: Math.round((sum / list.length) * 10) / 10 };
}

const WIDGET_TOOLS = [
  {
    name: 'get_ad_details',
    description: 'جلب تفاصيل إعلان محدد من قاعدة البيانات (السعر، الوصف، الثقة، البائع) — استخدمها عند سؤال عن إعلان معيّن',
    input_schema: {
      type: 'object',
      properties: {
        ad_id: { type: 'string', description: 'معرّف الإعلان مثل RZQ-... أو رقم' },
      },
      required: ['ad_id'],
    },
  },
  {
    name: 'search_ads',
    description: 'بحث في الإعلانات النشطة حسب كلمة أو فئة أو ولاية — للأسعار والعروض المتاحة فعلياً',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'كلمة بحث في العنوان/الوصف' },
        category: { type: 'string', description: 'فئة الإعلان' },
        wilaya: { type: 'string', description: 'الولاية' },
        limit: { type: 'number', description: 'عدد النتائج (1-10)' },
      },
    },
  },
  {
    name: 'get_seller_profile',
    description: 'بيانات التاجر/المكتب/الشركة العامة (الاسم، المدينة، التوثيق) — بلا أرقام هواتف خاصة',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'معرّف الحساب ACC_...' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_seller_reputation',
    description: 'تقييمات ودرجة ثقة البائع (متوسط النجوم، عدد التقييمات، درجة الثقة على الإعلان)',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'معرّف حساب البائع' },
        ad_id: { type: 'string', description: 'معرّف إعلان اختياري لدرجة الثقة عليه' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_packages_info',
    description: 'باقات الاشتراك وأسعارها الرسمية في رزق',
    input_schema: {
      type: 'object',
      properties: {
        lang: { type: 'string', enum: ['ar', 'hs', 'fr', 'en', 'es'], description: 'Reply language for package names (auto-detected from user message)' },
      },
    },
  },
  {
    name: 'create_support_ticket',
    description: 'فتح تذكرة دعم/شكوى عند مشكلة تقنية أو بلاغ — لا تستخدمها للأسئلة العامة',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['technical', 'billing', 'account', 'report', 'other'] },
        summary: { type: 'string', description: 'ملخص المشكلة' },
        ad_id: { type: 'string', description: 'معرّف إعلان مرتبط إن وُجد' },
      },
      required: ['type', 'summary'],
    },
  },
];

function executeWidgetTool(toolName, input) {
  switch (toolName) {
    case 'get_ad_details': {
      const id = String((input || {}).ad_id || '').trim();
      const ad = readAds().find((a) => String(a.id) === id);
      if (!ad) return { ok: false, error: 'ad_not_found', ad_id: id };
      if (ad.status !== 'active') return { ok: false, error: 'ad_not_active', status: ad.status };
      return { ok: true, ad: publicAd(ad) };
    }
    case 'search_ads': {
      const q = input || {};
      let list = readAds().filter((a) => a.status === 'active');
      if (q.category) list = list.filter((a) => a.category === q.category);
      if (q.wilaya) list = list.filter((a) => a.wilaya === q.wilaya);
      if (q.search) {
        const s = String(q.search).toLowerCase();
        list = list.filter((a) => (a.title + ' ' + (a.desc || '')).toLowerCase().includes(s));
      }
      list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const limit = Math.max(1, Math.min(10, Number(q.limit) || 5));
      return { ok: true, total: list.length, ads: list.slice(0, limit).map(publicAd) };
    }
    case 'get_seller_profile': {
      const accId = String((input || {}).account_id || '').trim();
      const acc = readAccounts().find((a) => a.id === accId && a.status === 'approved' && !a.suspended);
      if (!acc) return { ok: false, error: 'seller_not_found', account_id: accId };
      return { ok: true, seller: publicAccount(acc) };
    }
    case 'get_seller_reputation': {
      const accId = String((input || {}).account_id || '').trim();
      const stats = reviewStats(accId);
      let trust = null;
      if (input.ad_id) {
        const ad = readAds().find((a) => String(a.id) === String(input.ad_id));
        if (ad) trust = ad.seller_trust_score;
      }
      return { ok: true, account_id: accId, reviews: stats, seller_trust_score: trust };
    }
    case 'get_packages_info': {
      const raw = (input && input.lang) ? String(input.lang).toLowerCase() : 'ar';
      const lang = raw === 'fr' ? 'fr' : raw === 'en' ? 'en' : raw === 'es' ? 'es' : 'ar';
      if (lang === 'fr') {
        return {
          ok: true,
          packages: [
            { name: 'Gratuit', ads: 3, photos: 1, duration: '∞', price: '0 MRU' },
            { name: 'Argent', ads: 10, photos: 3, duration: '30j', price: '500 MRU/mois' },
            { name: 'Or', ads: 30, photos: 5, duration: '60j', price: '1200 MRU/mois' },
            { name: 'Diamant', ads: 100, photos: 10, duration: '365j', price: '3500 MRU/an' },
          ],
        };
      }
      if (lang === 'en') {
        return {
          ok: true,
          packages: [
            { name: 'Free', ads: 3, photos: 1, duration: '∞', price: '0 MRU' },
            { name: 'Silver', ads: 10, photos: 3, duration: '30 days', price: '500 MRU/month' },
            { name: 'Gold', ads: 30, photos: 5, duration: '60 days', price: '1200 MRU/month' },
            { name: 'Diamond', ads: 100, photos: 10, duration: '365 days', price: '3500 MRU/year' },
          ],
        };
      }
      if (lang === 'es') {
        return {
          ok: true,
          packages: [
            { name: 'Gratis', ads: 3, photos: 1, duration: '∞', price: '0 MRU' },
            { name: 'Plata', ads: 10, photos: 3, duration: '30 días', price: '500 MRU/mes' },
            { name: 'Oro', ads: 30, photos: 5, duration: '60 días', price: '1200 MRU/mes' },
            { name: 'Diamante', ads: 100, photos: 10, duration: '365 días', price: '3500 MRU/año' },
          ],
        };
      }
      return {
        ok: true,
        packages: [
          { name: 'مجانية', ads: 3, photos: 1, duration: 'دائمة', price: '0 MRU' },
          { name: 'فضية', ads: 10, photos: 3, duration: '30 يوم', price: '500 MRU/شهر' },
          { name: 'ذهبية', ads: 30, photos: 5, duration: '60 يوم', price: '1200 MRU/شهر' },
          { name: 'ماسية', ads: 100, photos: 10, duration: '365 يوم', price: '3500 MRU/سنة' },
        ],
      };
    }
    case 'create_support_ticket': {
      const rec = saveTicket({
        source: 'widget',
        type: (input || {}).type,
        summary: (input || {}).summary,
        adId: (input || {}).ad_id,
      });
      return {
        ok: true,
        ticket_id: rec.id,
        message: 'تم تسجيل طلبك — سيتواصل فريق رزق خلال 24 ساعة',
      };
    }
    default:
      return { ok: false, error: 'unknown_tool' };
  }
}

/** تحميل سياق الصفحة من الخادم (تحقق من DB) */
function resolvePageContextFacts(pageContext) {
  const facts = { ads: [], sellers: [] };
  if (!pageContext || typeof pageContext !== 'object') return facts;

  const adIds = [];
  if (pageContext.ad && pageContext.ad.id) adIds.push(String(pageContext.ad.id));
  if (pageContext.urlAdId) adIds.push(String(pageContext.urlAdId));

  const seen = new Set();
  adIds.forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const r = executeWidgetTool('get_ad_details', { ad_id: id });
    if (r.ok && r.ad) {
      facts.ads.push(r.ad);
      if (r.ad.accountId) {
        const seller = executeWidgetTool('get_seller_profile', { account_id: r.ad.accountId });
        const rep = executeWidgetTool('get_seller_reputation', { account_id: r.ad.accountId, ad_id: r.ad.id });
        if (seller.ok) facts.sellers.push(Object.assign({}, seller.seller, { reputation: rep }));
      }
    }
  });
  return facts;
}

module.exports = {
  WIDGET_TOOLS,
  executeWidgetTool,
  resolvePageContextFacts,
  publicAd,
};
