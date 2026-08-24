'use strict';

const fs = require('fs');
const {
  findCatalogPackage,
  isDiamondPackageRef,
  isTrialPackage,
  readSiteConfigRaw,
  SITE_CONFIG_FILE,
} = require('./catalogConfig');

const TENDER_PACKAGE_NAME = 'باقة المناقصة';

const PLAUSIBILITY_AR = {
  clear: 'واضح ✅',
  low: 'منخفض',
  medium: 'متوسط ⚠️',
  high: 'مرتفع 🚨',
  unreviewed: 'لم يُراجع',
};

function resolvePackageDurationDays(pkgName) {
  const pkg = findCatalogPackage(pkgName);
  if (pkg && pkg.durationDays) return Math.max(1, Number(pkg.durationDays) || 30);
  return 30;
}

function computeActivationPeriod(days, existingRecord) {
  const now = new Date();
  let ends = new Date(now.getTime() + days * 86400000);
  if (existingRecord && existingRecord.periodEnd) {
    const existingEnd = new Date(existingRecord.periodEnd);
    if (!Number.isNaN(existingEnd.getTime()) && existingEnd > now) {
      ends = new Date(existingEnd.getTime() + days * 86400000);
    }
  }
  return { periodStart: now.toISOString(), periodEnd: ends.toISOString(), now };
}

function getAccountInfo(accountId, readAccounts) {
  const list = typeof readAccounts === 'function' ? readAccounts() : [];
  return list.find((a) => a.id === accountId) || null;
}

function activateVideoAdOnServer(req) {
  if (!req.videoUrl) return { ok: true, skipped: true, reason: 'no_video_url' };
  const cfg = readSiteConfigRaw();
  const videoAds = cfg.videoAds && typeof cfg.videoAds === 'object'
    ? { hero: cfg.videoAds.hero || [], popup: cfg.videoAds.popup || [] }
    : { hero: [], popup: [] };

  const videoPkgs = (cfg.packages && Array.isArray(cfg.packages.video)) ? cfg.packages.video.filter((p) => p && p.active !== false) : [];
  const defaults = [{ price: 5000 }, { price: 12000 }, { price: 25000 }];
  const pkgs = videoPkgs.length ? videoPkgs : defaults;
  const maxPrice = Math.max.apply(null, pkgs.map((p) => Number(p.price) || 0));
  const target = (maxPrice > 0 && Number(req.price) >= maxPrice) ? 'hero' : 'popup';
  const other = target === 'hero' ? 'popup' : 'hero';

  videoAds[other] = (videoAds[other] || []).filter((a) => !req.accountId || a.accountId !== req.accountId);
  const list = videoAds[target] || [];
  const existing = req.accountId ? list.find((a) => a.accountId === req.accountId) : null;
  if (existing) {
    existing.url = req.videoUrl;
    existing.advertiser = req.account || '';
    existing.active = true;
  } else {
    list.push({
      advertiser: req.account || '',
      url: req.videoUrl,
      active: true,
      accountId: req.accountId || '',
    });
  }
  videoAds[target] = list.slice(0, 50);

  const next = Object.assign({}, cfg, { videoAds });
  fs.writeFileSync(SITE_CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8');
  return { ok: true, slot: target };
}

/**
 * تفعيل طلب اشتراك من الخادم (Telegram / API) — يطابق منطق handleSubReq في rizq_admin.html
 */
async function activateSubRequest(req, deps) {
  deps = deps || {};
  if (!req || !req.id) return { ok: false, error: 'invalid_request' };
  if (req.status !== 'pending') return { ok: false, error: 'not_pending', status: req.status };

  const {
    syncAccountPackage,
    getAccountRecord,
    readAccounts,
    writeAccounts,
    readAdBoosts,
    writeAdBoosts,
    registerSubscriber,
  } = deps;

  if (typeof syncAccountPackage !== 'function') {
    return { ok: false, error: 'syncAccountPackage_missing' };
  }

  const accRow = getAccountInfo(req.accountId, readAccounts);
  const accountName = req.account || accRow?.name || req.accountId;
  const accountPhone = accRow?.phone || '';
  const accountEmail = accRow?.email || '';
  const accountType = accRow?.type || 'individual';
  const days = resolvePackageDurationDays(req.pkg);
  const category = req.category || 'package';

  try {
    if (category === 'tender') {
      const { periodStart, periodEnd, now } = computeActivationPeriod(days, getAccountRecord(req.accountId + '::tender'));
      const result = await syncAccountPackage({
        accountId: req.accountId + '::tender',
        accountName,
        accountPhone,
        accountEmail,
        accountType,
        pkgName: TENDER_PACKAGE_NAME,
        price: Number(req.price) || 0,
        days,
        periodStart,
        periodEnd,
        activatedBy: 'admin',
        paymentConfirmed: true,
        paidAt: now.toISOString(),
      });
      if (!result.ok) return result;
      return { ok: true, category, result, accountName };
    }

    if (category === 'verified_plus') {
      if (typeof readAccounts !== 'function' || typeof writeAccounts !== 'function') {
        return { ok: false, error: 'accounts_io_missing' };
      }
      const list = readAccounts();
      const idx = list.findIndex((a) => a.id === req.accountId);
      if (idx === -1) return { ok: false, error: 'account_not_found' };
      const grantDays = resolvePackageDurationDays(req.pkg) || 365;
      list[idx].verifiedPlus = true;
      list[idx].verifiedPlusExpiresAt = new Date(Date.now() + grantDays * 86400000).toISOString();
      writeAccounts(list);
      return { ok: true, category, verifiedPlusExpiresAt: list[idx].verifiedPlusExpiresAt, accountName };
    }

    if (category === 'ad_boost') {
      if (!req.adId) return { ok: false, error: 'adId_required' };
      if (typeof readAdBoosts !== 'function' || typeof writeAdBoosts !== 'function') {
        return { ok: false, error: 'ad_boosts_io_missing' };
      }
      const boostDays = resolvePackageDurationDays(req.pkg) || 3;
      const now = new Date();
      const ends = new Date(now.getTime() + boostDays * 86400000);
      const all = readAdBoosts();
      all[req.adId] = {
        adId: req.adId,
        accountId: req.accountId,
        activatedAt: now.toISOString(),
        endsAt: ends.toISOString(),
        price: Number(req.price) || 0,
      };
      writeAdBoosts(all);
      return { ok: true, category, boost: all[req.adId], accountName };
    }

    // package + video (default)
    const existingPkg = getAccountRecord(req.accountId);
    const { periodStart, periodEnd, now } = computeActivationPeriod(days, existingPkg);
    const isTrial = isTrialPackage(req.pkg, req.price);

    const result = await syncAccountPackage({
      accountId: req.accountId,
      accountName,
      accountPhone,
      accountEmail,
      accountType,
      pkgName: req.pkg,
      price: Number(req.price) || 0,
      days,
      periodStart,
      periodEnd,
      activatedBy: 'admin',
      paymentConfirmed: !isTrial,
      paidAt: isTrial ? null : now.toISOString(),
      isTrial,
    });
    if (!result.ok) return result;

    if (category === 'video') {
      activateVideoAdOnServer(req);
    }

    if (!isTrial && isDiamondPackageRef(req.pkg) && accountPhone && typeof registerSubscriber === 'function') {
      try {
        registerSubscriber(String(accountPhone).replace(/[^0-9+]/g, '').slice(0, 40), {
          businessName: accountName,
          accountId: req.accountId,
          plan: 'diamond',
          tier: 'diamond',
          package: req.pkg,
          pkgName: req.pkg,
          widget_enabled: true,
          whatsapp_enabled: true,
          calls_enabled: true,
          channels: { widget: true, whatsapp: true, calls: true },
        });
      } catch (e) { /* best-effort */ }
    }

    return { ok: true, category, result, accountName };
  } catch (err) {
    return { ok: false, error: err.message || 'activation_failed' };
  }
}

function rejectSubRequest(req) {
  if (!req || req.status !== 'pending') {
    return { ok: false, error: 'not_pending', status: req && req.status };
  }
  return { ok: true, accountName: req.account || req.accountId };
}

function formatPlausibility(level) {
  return PLAUSIBILITY_AR[String(level || 'unreviewed').toLowerCase()] || level || PLAUSIBILITY_AR.unreviewed;
}

module.exports = {
  TENDER_PACKAGE_NAME,
  resolvePackageDurationDays,
  activateSubRequest,
  rejectSubRequest,
  formatPlausibility,
  activateVideoAdOnServer,
};
