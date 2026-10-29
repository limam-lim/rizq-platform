/**
 * Unified platform repos — async API over documents + typed tables.
 * Call await migrateAllSecondaryStores() after db.ready() (not at require-time).
 */
'use strict';

const path = require('path');
const { createCollection, DATA_DIR, readLegacyJson } = require('./docStore');
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

const guestThreadSecrets = createCollection('guest_thread_secrets', {
  backupFile: 'guest-thread-secrets.json',
  onBackup: mapBackup,
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

const contactClicks = createCollection('contact_clicks', {
  backupFile: 'contact-clicks.json',
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

const marketingCampaigns = createCollection('marketing_campaigns', {
  backupFile: 'marketing-campaigns.json',
  onBackup: arrayBackup,
});

const marketingSettings = createCollection('marketing_settings', {
  backupFile: 'marketing-settings.json',
  onBackup: singletonBackup,
});

const agentMisses = createCollection('agent_misses', {
  backupFile: 'agent-misses.json',
  onBackup: arrayBackup,
});

const agentOpsSettings = createCollection('agent_ops_settings', {
  backupFile: 'agent-ops-settings.json',
  onBackup: singletonBackup,
});

const quotaUsage = createCollection('quota_usage', {
  backupFile: 'quota-usage.json',
  onBackup: singletonBackup,
});

const secretsVault = createCollection('secrets_vault', {
  backupFile: 'secrets-vault.json',
  onBackup: singletonBackup,
});

const serviceRequests = createCollection('service_requests', {
  backupFile: 'service-requests.json',
  onBackup: arrayBackup,
});

const accountNotifications = createCollection('account_notifications', {
  backupFile: 'account-notifications.json',
  onBackup: arrayBackup,
});

const weeklyOpsReports = createCollection('weekly_ops_reports', {
  backupFile: 'weekly-ops-reports.json',
  onBackup: arrayBackup,
});

/** سجل تدقيق عرض وثائق KYC — بلا ملف JSON احتياطي (يحوي IP؛ يبقى في Postgres فقط) */
const kycAccessAudit = createCollection('kyc_access_audit', {});

/** 2FA للأدمن — المفتاح مشفّر AES-GCM (ADMIN_2FA_KEY)؛ بلا ملف JSON احتياطي */
const adminTwoFactor = createCollection('admin_two_factor', {});

/* ── Helpers ─────────────────────────────────────────────── */

async function getSiteConfig() {
  return (await siteConfig.get('_root')) || {};
}

async function saveSiteConfig(cfg) {
  return siteConfig.upsert('_root', cfg && typeof cfg === 'object' ? cfg : {});
}

async function getTelegramChat() {
  return (await telegramAdminChat.get('_root')) || null;
}

async function saveTelegramChat(obj) {
  return telegramAdminChat.upsert('_root', obj && typeof obj === 'object' ? obj : {});
}

async function listInvestmentOpportunities() {
  const entries = await investments.listEntries();
  return entries.filter((e) => e.id !== '_meta').map((e) => e.data);
}

async function upsertInvestment(opp) {
  if (!opp || !opp.id) return null;
  await investments.upsert(String(opp.id), opp);
  await investments.upsert('_meta', { updatedAt: new Date().toISOString() });
  return opp;
}

async function removeInvestment(id) {
  const ok = await investments.remove(String(id));
  if (ok) await investments.upsert('_meta', { updatedAt: new Date().toISOString() });
  return ok;
}

async function listInvestmentEvents() {
  return investmentEvents.list();
}

async function pushInvestmentEvent(ev) {
  if (!ev || !ev.id) return null;
  return investmentEvents.upsert(String(ev.id), ev);
}

async function getReviewsFor(targetId) {
  const row = await reviews.get(String(targetId || ''));
  return Array.isArray(row) ? row : [];
}

async function setReviewsFor(targetId, list) {
  return reviews.upsert(String(targetId), Array.isArray(list) ? list : []);
}

async function getHoursFor(accountId) {
  return (await businessHours.get(String(accountId || ''))) || null;
}

async function setHoursFor(accountId, hours) {
  return businessHours.upsert(String(accountId), hours);
}

async function getVisitStats(accountId) {
  return (await visits.get(String(accountId || ''))) || null;
}

async function setVisitStats(accountId, stats) {
  return visits.upsert(String(accountId), stats);
}

async function getContactStats(accountId) {
  return (await contactClicks.get(String(accountId || ''))) || null;
}

async function setContactStats(accountId, stats) {
  return contactClicks.upsert(String(accountId), stats);
}

async function getAdBoost(adId) {
  return (await adBoosts.get(String(adId || ''))) || null;
}

async function setAdBoost(adId, boost) {
  return adBoosts.upsert(String(adId), boost);
}

async function removeAdBoost(adId) {
  return adBoosts.remove(String(adId));
}

async function getPackage(accountId) {
  return (await packages.get(String(accountId || ''))) || null;
}

async function setPackage(accountId, rec) {
  return packages.upsert(String(accountId), rec);
}

async function getPackageMeta() {
  return (await packages.get('__meta')) || { invoiceSeq: 0 };
}

async function setPackageMeta(meta) {
  return packages.upsert('__meta', meta && typeof meta === 'object' ? meta : { invoiceSeq: 0 });
}

async function listPackagesMap() {
  const map = await packages.asMap();
  delete map.__meta;
  const meta = await packages.get('__meta');
  if (meta && typeof meta.invoiceSeq === 'number') {
    map.__invoiceSeq = meta.invoiceSeq;
  }
  return map;
}

function otpKeyOf(rec) {
  if (!rec) return null;
  if (rec.key) return String(rec.key);
  if (rec.phone) return 'phone:' + String(rec.phone);
  if (rec.email) return 'email:' + String(rec.email).toLowerCase();
  return null;
}

async function listOtp() {
  return otp.list();
}

async function upsertOtp(rec) {
  const key = otpKeyOf(rec);
  if (!key) return null;
  const withKey = Object.assign({}, rec, { key: rec.key || key });
  return otp.upsert(key, withKey);
}

async function removeOtp(keyOrRec) {
  if (typeof keyOrRec === 'string') return otp.remove(keyOrRec);
  const key = otpKeyOf(keyOrRec);
  return key ? otp.remove(key) : false;
}

async function replaceOtpStore(list) {
  const entries = (list || []).map((rec, i) => {
    const key = otpKeyOf(rec) || ('legacy_' + i);
    return { id: key, data: Object.assign({}, rec, { key: rec.key || key }) };
  });
  await otp.replaceAll(entries);
}

async function migrateAllSecondaryStores() {
  const p = (f) => path.join(DATA_DIR, f);

  if ((await packages.count()) === 0) {
    const raw = readLegacyJson(p('account-packages.json'), {});
    if (raw && typeof raw === 'object') {
      const invoiceSeq = raw.__invoiceSeq || 0;
      delete raw.__invoiceSeq;
      await packages.migrateFromMap(raw);
      if (invoiceSeq) await packages.upsert('__meta', { invoiceSeq });
    }
  }

  await otp.migrateFromArray(p('otp-store.json'), 'key');
  if ((await otp.count()) === 0) {
    const legacy = readLegacyJson(p('otp-store.json'), []);
    if (Array.isArray(legacy) && legacy.length) {
      for (let i = 0; i < legacy.length; i++) {
        const rec = legacy[i];
        const key = otpKeyOf(rec) || ('legacy_' + i);
        await otp.upsert(key, Object.assign({}, rec, { key }));
      }
      console.log('[repos] migrated otp rows with derived keys');
    }
  }

  await adminTeam.migrateFromArray(p('admin-team.json'), 'id');
  await subRequests.migrateFromArray(p('sub-requests.json'), 'id');
  await siteConfig.migrateSingleton(p('site-config.json'), '_root');

  await adBoosts.migrateFromMap(p('ad_boosts.json'));
  await messages.migrateFromArray(p('messages.json'), 'id');
  await guestThreadSecrets.migrateFromMap(p('guest-thread-secrets.json'));
  await reviews.migrateFromMap(p('reviews.json'));
  await leads.migrateFromArray(p('leads.json'), 'id');
  await supportTickets.migrateFromArray(p('support-tickets.json'), 'id');
  await reports.migrateFromArray(p('reports.json'), 'id');
  await deactivationRequests.migrateFromArray(p('deactivation-requests.json'), 'id');
  await adsRequests.migrateFromArray(p('ads-requests.json'), 'id');

  if ((await investments.count()) === 0) {
    const inv = readLegacyJson(p('investments.json'), null);
    if (inv && Array.isArray(inv.opportunities)) {
      for (const opp of inv.opportunities) {
        if (opp && opp.id) await investments.upsert(String(opp.id), opp);
      }
      await investments.upsert('_meta', { updatedAt: inv.updatedAt || new Date().toISOString() });
      if (inv.opportunities.length) {
        console.log('[repos] migrated ' + inv.opportunities.length + ' investment(s)');
      }
    }
  }

  if ((await investmentEvents.count()) === 0) {
    const evFile = readLegacyJson(p('investment-events.json'), null);
    const events = (evFile && Array.isArray(evFile.events)) ? evFile.events
      : (Array.isArray(evFile) ? evFile : []);
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const id = (ev && ev.id) ? String(ev.id) : ('ev_' + i);
      await investmentEvents.upsert(id, Object.assign({}, ev, { id }));
    }
    if (events.length) console.log('[repos] migrated ' + events.length + ' investment event(s)');
  }

  await agentStatus.migrateFromMap(p('agent-status.json'));
  await visits.migrateFromMap(p('visits.json'));
  await contactClicks.migrateFromMap(p('contact-clicks.json'));
  await businessHours.migrateFromMap(p('business-hours.json'));
  await corpTeam.migrateFromArray(p('team.json'), 'id');
  await sectionInterest.migrateFromArray(p('section-interest.json'), 'id');
  await telegramAdminChat.migrateSingleton(p('telegram-admin-chat.json'), '_root');
  await contactFomo.migrateFromMap(p('contact-fomo-log.json'));
  await maintenanceAudit.migrateFromArray(p('maintenance-audit.json'), 'id');

  if ((await subscribers.count()) === 0) {
    const legacyPaths = [
      p('rizq_subscribers_store.json'),
      path.join(__dirname, '..', '..', 'rizq_subscribers_store.json'),
    ];
    for (const lp of legacyPaths) {
      const raw = readLegacyJson(lp, null);
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length) {
        await subscribers.migrateFromMap(lp);
        console.log('[repos] migrated subscribers from', lp);
        break;
      }
    }
  }

  await marketingCampaigns.migrateFromArray(p('marketing-campaigns.json'), 'id');
  await marketingSettings.migrateSingleton(p('marketing-settings.json'), '_root');
  await agentMisses.migrateFromArray(p('agent-misses.json'), 'id');
  await serviceRequests.migrateFromArray(p('service-requests.json'), 'id');
  await agentOpsSettings.migrateSingleton(p('agent-ops-settings.json'), '_root');
  {
    const legacyQuota = [
      p('quota-usage.json'),
      path.join(__dirname, '..', 'data', 'quota-usage.json'),
      path.join(__dirname, '..', '..', 'rizq-backend', 'data', 'quota-usage.json'),
    ];
    if ((await quotaUsage.count()) === 0) {
      for (const lp of legacyQuota) {
        const raw = readLegacyJson(lp, null);
        if (raw && typeof raw === 'object') {
          await quotaUsage.migrateSingleton(lp, '_root');
          console.log('[repos] migrated quota usage from', lp);
          break;
        }
      }
    }
  }
  await secretsVault.migrateSingleton(p('secrets-vault.json'), '_root');
  await accountNotifications.migrateFromArray(p('account-notifications.json'), 'id');
  await weeklyOpsReports.migrateFromArray(p('weekly-ops-reports.json'), 'id');

  return {
    packages: await packages.count(),
    otp: await otp.count(),
    adminTeam: await adminTeam.count(),
    messages: await messages.count(),
    siteConfig: await siteConfig.count(),
    marketingCampaigns: await marketingCampaigns.count(),
    accountNotifications: await accountNotifications.count(),
    weeklyOpsReports: await weeklyOpsReports.count(),
  };
}

module.exports = {
  accounts: {
    getById: (id) => platformStore.getAccountById(id),
    getByEmail: (email) => platformStore.getAccountByEmail(email),
    upsert: (acc) => platformStore.upsertAccount(acc),
    update: (id, fn) => platformStore.updateAccount(id, fn),
    list: () => platformStore.readAccounts(),
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
  guestThreadSecrets,
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
  contactClicks,
  businessHours,
  corpTeam,
  sectionInterest,
  telegramAdminChat,
  contactFomo,
  maintenanceAudit,
  subscribers,
  marketingCampaigns,
  marketingSettings,
  agentMisses,
  agentOpsSettings,
  quotaUsage,
  secretsVault,
  serviceRequests,
  accountNotifications,
  weeklyOpsReports,
  kycAccessAudit,
  adminTwoFactor,

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
  getContactStats,
  setContactStats,
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
