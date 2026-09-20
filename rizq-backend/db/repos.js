/**
 * مستودعات المنصة الموحّدة — الواجهة الوحيدة لمسارات API والخدمات.
 * عمليات ذرّية: get / upsert / remove / list — بلا إعادة كتابة عشوائية للقائمة كاملة من الـ API.
 */
'use strict';

const path = require('path');
const { createCollection, DATA_DIR } = require('./docStore');
const platformStore = require('./platformStore');

function arrayBackup(entries) {
  return entries.map((e) => e.data);
}

function mapBackup(entries) {
  const out = {};
  entries.forEach((e) => { out[e.id] = e.data; });
  return out;
}

function singletonBackup(entries) {
  const root = entries.find((e) => e.id === '_root');
  return root ? root.data : {};
}

/* ── HOT ─────────────────────────────────────────────────── */

const packages = createCollection('account_packages', {
  backupFile: 'account-packages.json',
  onBackup: mapBackup,
});

const otp = createCollection('otp', {
  backupFile: 'otp-store.json',
  onBackup: arrayBackup,
});

const adminTeam = createCollection('admin_team', {
  backupFile: 'admin-team.json',
  onBackup: arrayBackup,
});

const subRequests = createCollection('sub_requests', {
  backupFile: 'sub-requests.json',
  onBackup: arrayBackup,
});

const siteConfig = createCollection('site_config', {
  backupFile: 'site-config.json',
  onBackup: singletonBackup,
});

/* ── WARM ────────────────────────────────────────────────── */

const adBoosts = createCollection('ad_boosts', {
  backupFile: 'ad_boosts.json',
  onBackup: mapBackup,
});

const messages = createCollection('messages', {
  backupFile: 'messages.json',
  onBackup: arrayBackup,
});

const reviews = createCollection('reviews', {
  backupFile: 'reviews.json',
  onBackup: mapBackup,
});

const leads = createCollection('leads', {
  backupFile: 'leads.json',
  onBackup: arrayBackup,
});

const supportTickets = createCollection('support_tickets', {
  backupFile: 'support-tickets.json',
  onBackup: arrayBackup,
});

const reports = createCollection('reports', {
  backupFile: 'reports.json',
  onBackup: arrayBackup,
});

const deactivationRequests = createCollection('deactivation_requests', {
  backupFile: 'deactivation-requests.json',
  onBackup: arrayBackup,
});

const adsRequests = createCollection('ads_requests', {
  backupFile: 'ads-requests.json',
  onBackup: arrayBackup,
});

const investments = createCollection('investments', {
  backupFile: 'investments.json',
  onBackup: (entries) => {
    const meta = entries.find((e) => e.id === '_meta');
    const opportunities = entries
      .filter((e) => e.id !== '_meta')
      .map((e) => e.data);
    return {
      opportunities,
      updatedAt: (meta && meta.data && meta.data.updatedAt) || new Date().toISOString(),
    };
  },
});

const investmentEvents = createCollection('investment_events', {
  backupFile: 'investment-events.json',
  onBackup: (entries) => ({
    events: entries.map((e) => e.data),
  }),
});

const agentStatus = createCollection('agent_status', {
  backupFile: 'agent-status.json',
  onBackup: mapBackup,
});

/* ── COLD ────────────────────────────────────────────────── */

const visits = createCollection('visits', {
  backupFile: 'visits.json',
  onBackup: mapBackup,
});

const businessHours = createCollection('business_hours', {
  backupFile: 'business-hours.json',
  onBackup: mapBackup,
});

const corpTeam = createCollection('corp_team', {
  backupFile: 'team.json',
  onBackup: arrayBackup,
});

const sectionInterest = createCollection('section_interest', {
  backupFile: 'section-interest.json',
  onBackup: arrayBackup,
});

const telegramAdminChat = createCollection('telegram_admin_chat', {
  backupFile: 'telegram-admin-chat.json',
  onBackup: singletonBackup,
});

const contactFomo = createCollection('contact_fomo', {
  backupFile: 'contact-fomo-log.json',
  onBackup: mapBackup,
});

const maintenanceAudit = createCollection('maintenance_audit', {
  backupFile: 'maintenance-audit.json',
  onBackup: arrayBackup,
});

const subscribers = createCollection('subscribers', {
  backupFile: 'rizq_subscribers_store.json',
  onBackup: mapBackup,
});

/* ── Helpers خاصّة بالأشكال ──────────────────────────────── */

function getSiteConfig() {
  return siteConfig.get('_root') || {};
}

function saveSiteConfig(cfg) {
  return siteConfig.upsert('_root', cfg && typeof cfg === 'object' ? cfg : {});
}

function getTelegramChat() {
  return telegramAdminChat.get('_root') || null;
}

function saveTelegramChat(obj) {
  return telegramAdminChat.upsert('_root', obj && typeof obj === 'object' ? obj : {});
}

function listInvestmentOpportunities() {
  return investments.listEntries()
    .filter((e) => e.id !== '_meta')
    .map((e) => e.data);
}

function upsertInvestment(opp) {
  if (!opp || !opp.id) return null;
  investments.upsert(String(opp.id), opp);
  investments.upsert('_meta', { updatedAt: new Date().toISOString() });
  return opp;
}

function removeInvestment(id) {
  const ok = investments.remove(String(id));
  if (ok) investments.upsert('_meta', { updatedAt: new Date().toISOString() });
  return ok;
}

function listInvestmentEvents() {
  return investmentEvents.list();
}

function pushInvestmentEvent(ev) {
  if (!ev || !ev.id) return null;
  return investmentEvents.upsert(String(ev.id), ev);
}

/** مراجعات: القيمة مخزّنة كمصفوفة تحت مفتاح الهدف */
function getReviewsFor(targetId) {
  const row = reviews.get(String(targetId || ''));
  return Array.isArray(row) ? row : [];
}

function setReviewsFor(targetId, list) {
  return reviews.upsert(String(targetId), Array.isArray(list) ? list : []);
}

function getHoursFor(accountId) {
  return businessHours.get(String(accountId || '')) || null;
}

function setHoursFor(accountId, hours) {
  return businessHours.upsert(String(accountId), hours);
}

function getVisitStats(accountId) {
  return visits.get(String(accountId || '')) || null;
}

function setVisitStats(accountId, stats) {
  return visits.upsert(String(accountId), stats);
}

function getAdBoost(adId) {
  return adBoosts.get(String(adId || '')) || null;
}

function setAdBoost(adId, boost) {
  return adBoosts.upsert(String(adId), boost);
}

function removeAdBoost(adId) {
  return adBoosts.remove(String(adId));
}

function getPackage(accountId) {
  return packages.get(String(accountId || '')) || null;
}

function setPackage(accountId, rec) {
  return packages.upsert(String(accountId), rec);
}

function getPackageMeta() {
  return packages.get('__meta') || { invoiceSeq: 0 };
}

function setPackageMeta(meta) {
  return packages.upsert('__meta', meta && typeof meta === 'object' ? meta : { invoiceSeq: 0 });
}

function listPackagesMap() {
  const map = packages.asMap();
  delete map.__meta;
  // توافق مع الشكل القديم (__invoiceSeq على الجذر)
  const meta = packages.get('__meta');
  if (meta && typeof meta.invoiceSeq === 'number') {
    map.__invoiceSeq = meta.invoiceSeq;
  }
  return map;
}

/** OTP: المفتاح = phone أو key المركّب */
function otpKeyOf(rec) {
  if (!rec) return null;
  if (rec.key) return String(rec.key);
  if (rec.phone) return 'phone:' + String(rec.phone);
  if (rec.email) return 'email:' + String(rec.email).toLowerCase();
  return null;
}

function listOtp() {
  return otp.list();
}

function upsertOtp(rec) {
  const key = otpKeyOf(rec);
  if (!key) return null;
  const withKey = Object.assign({}, rec, { key: rec.key || key });
  return otp.upsert(key, withKey);
}

function removeOtp(keyOrRec) {
  if (typeof keyOrRec === 'string') return otp.remove(keyOrRec);
  const key = otpKeyOf(keyOrRec);
  return key ? otp.remove(key) : false;
}

function replaceOtpStore(list) {
  const entries = (list || []).map((rec, i) => {
    const key = otpKeyOf(rec) || ('legacy_' + i);
    return { id: key, data: Object.assign({}, rec, { key: rec.key || key }) };
  });
  otp.replaceAll(entries);
}

/* ── ترحيل لمرة واحدة ─────────────────────────────────────── */

function migrateAllSecondaryStores() {
  const p = (f) => path.join(DATA_DIR, f);

  // packages: خريطة — انقل __invoiceSeq إلى __meta
  if (packages.count() === 0) {
    const raw = require('./docStore').readLegacyJson(p('account-packages.json'), {});
    if (raw && typeof raw === 'object') {
      const invoiceSeq = raw.__invoiceSeq || 0;
      delete raw.__invoiceSeq;
      packages.migrateFromMap(raw);
      if (invoiceSeq) packages.upsert('__meta', { invoiceSeq });
    }
  }

  otp.migrateFromArray(p('otp-store.json'), 'key');
  // OTP قديم بلا key — أعِد الترحيل بمفتاح مشتق إن لزم
  if (otp.count() === 0) {
    const legacy = require('./docStore').readLegacyJson(p('otp-store.json'), []);
    if (Array.isArray(legacy) && legacy.length) {
      legacy.forEach((rec, i) => {
        const key = otpKeyOf(rec) || ('legacy_' + i);
        otp.upsert(key, Object.assign({}, rec, { key }));
      });
      console.log('[repos] migrated otp rows with derived keys');
    }
  }

  adminTeam.migrateFromArray(p('admin-team.json'), 'id');
  subRequests.migrateFromArray(p('sub-requests.json'), 'id');
  siteConfig.migrateSingleton(p('site-config.json'), '_root');

  adBoosts.migrateFromMap(p('ad_boosts.json'));
  messages.migrateFromArray(p('messages.json'), 'id');
  reviews.migrateFromMap(p('reviews.json'));
  leads.migrateFromArray(p('leads.json'), 'id');
  supportTickets.migrateFromArray(p('support-tickets.json'), 'id');
  reports.migrateFromArray(p('reports.json'), 'id');
  deactivationRequests.migrateFromArray(p('deactivation-requests.json'), 'id');
  adsRequests.migrateFromArray(p('ads-requests.json'), 'id');

  if (investments.count() === 0) {
    const inv = require('./docStore').readLegacyJson(p('investments.json'), null);
    if (inv && Array.isArray(inv.opportunities)) {
      inv.opportunities.forEach((opp) => {
        if (opp && opp.id) investments.upsert(String(opp.id), opp);
      });
      investments.upsert('_meta', { updatedAt: inv.updatedAt || new Date().toISOString() });
      if (inv.opportunities.length) {
        console.log('[repos] migrated ' + inv.opportunities.length + ' investment(s)');
      }
    }
  }

  if (investmentEvents.count() === 0) {
    const evFile = require('./docStore').readLegacyJson(p('investment-events.json'), null);
    const events = (evFile && Array.isArray(evFile.events)) ? evFile.events
      : (Array.isArray(evFile) ? evFile : []);
    events.forEach((ev, i) => {
      const id = (ev && ev.id) ? String(ev.id) : ('ev_' + i);
      investmentEvents.upsert(id, Object.assign({}, ev, { id }));
    });
    if (events.length) console.log('[repos] migrated ' + events.length + ' investment event(s)');
  }

  agentStatus.migrateFromMap(p('agent-status.json'));
  visits.migrateFromMap(p('visits.json'));
  businessHours.migrateFromMap(p('business-hours.json'));
  corpTeam.migrateFromArray(p('team.json'), 'id');
  sectionInterest.migrateFromArray(p('section-interest.json'), 'id');
  telegramAdminChat.migrateSingleton(p('telegram-admin-chat.json'), '_root');
  contactFomo.migrateFromMap(p('contact-fomo-log.json'));
  maintenanceAudit.migrateFromArray(p('maintenance-audit.json'), 'id');

  // ملف المشتركين الماسيين — كان JSON مشتركاً بين عمليات منفصلة
  if (subscribers.count() === 0) {
    const legacyPaths = [
      p('rizq_subscribers_store.json'),
      path.join(__dirname, '..', '..', 'rizq_subscribers_store.json'),
    ];
    for (const lp of legacyPaths) {
      const raw = require('./docStore').readLegacyJson(lp, null);
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length) {
        subscribers.migrateFromMap(lp);
        console.log('[repos] migrated subscribers from', lp);
        break;
      }
    }
  }

  return {
    packages: packages.count(),
    otp: otp.count(),
    adminTeam: adminTeam.count(),
    messages: messages.count(),
    siteConfig: siteConfig.count(),
  };
}

const migrated = migrateAllSecondaryStores();
console.log('[repos] secondary stores ready', JSON.stringify(migrated));

module.exports = {
  // platform (typed tables)
  accounts: {
    getById: (id) => platformStore.getAccountById(id),
    getByEmail: (email) => platformStore.getAccountByEmail(email),
    upsert: (acc) => platformStore.upsertAccount(acc),
    list: () => platformStore.readAccounts(),
    /** @deprecated استخدم upsert — بقي للتوافق مع مسارات قديمة تكتب القائمة */
    replaceAll: (list) => platformStore.writeAccounts(list),
  },
  ads: {
    getById: (id) => platformStore.getAdById(id),
    list: () => platformStore.readAds(),
    upsert: (ad) => platformStore.upsertAd(ad),
    remove: (id) => platformStore.deleteAd(id),
    replaceAll: (list) => platformStore.writeAds(list),
  },
  catalog: {
    list: () => platformStore.readCatalog(),
    upsert: (item) => platformStore.upsertCatalogItem(item),
    remove: (id) => platformStore.deleteCatalogItem(id),
    replaceAll: (list) => platformStore.writeCatalog(list),
  },
  tenders: {
    list: () => platformStore.readTenders(),
    upsert: (t) => platformStore.upsertTender(t),
    remove: (id) => platformStore.deleteTender(id),
    replaceAll: (list) => platformStore.writeTenders(list),
  },

  packages,
  otp,
  adminTeam,
  subRequests,
  siteConfig,
  adBoosts,
  messages,
  reviews,
  leads,
  supportTickets,
  reports,
  deactivationRequests,
  adsRequests,
  investments,
  investmentEvents,
  agentStatus,
  visits,
  businessHours,
  corpTeam,
  sectionInterest,
  telegramAdminChat,
  contactFomo,
  maintenanceAudit,
  subscribers,

  getSiteConfig,
  saveSiteConfig,
  getTelegramChat,
  saveTelegramChat,
  listInvestmentOpportunities,
  upsertInvestment,
  removeInvestment,
  listInvestmentEvents,
  pushInvestmentEvent,
  getReviewsFor,
  setReviewsFor,
  getHoursFor,
  setHoursFor,
  getVisitStats,
  setVisitStats,
  getAdBoost,
  setAdBoost,
  removeAdBoost,
  getPackage,
  setPackage,
  getPackageMeta,
  setPackageMeta,
  listPackagesMap,
  listOtp,
  upsertOtp,
  removeOtp,
  replaceOtpStore,
  migrateAllSecondaryStores,
  platformStore,
  DATA_DIR,
};
