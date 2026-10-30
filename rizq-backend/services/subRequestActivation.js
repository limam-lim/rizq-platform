'use strict';

const {
  findCatalogPackage,
  isDiamondPackageRef,
  isTrialPackage,
  readSiteConfigRaw,
  resolvePackageBoostDays,
} = require('./catalogConfig');
const {
  resolveMediaPlanFromPackageRef,
  assertCanAddMediaVideo,
} = require('./entitlements');
const repos = require('../db/repos');

const TENDER_PACKAGE_NAME = 'باقة المناقصة';

const PLAUSIBILITY_AR = {
  clear: 'واضح ✅',
  low: 'منخفض',
  medium: 'متوسط ⚠️',
  high: 'مرتفع 🚨',
  unreviewed: 'لم يُراجع',
};

async function resolvePackageDurationDays(pkgName) {
  const pkg = await findCatalogPackage(pkgName);
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

async function getAccountInfo(accountId, readAccounts) {
  const raw = typeof readAccounts === 'function' ? await readAccounts() : [];
  const list = Array.isArray(raw) ? raw : [];
  return list.find((a) => a && a.id === accountId) || null;
}

async function activateVideoAdOnServer(req) {
  if (!req.videoUrl) return { ok: true, skipped: true, reason: 'no_video_url' };
  const cfg = (await readSiteConfigRaw()) || {};
  const prev = (cfg.videoAds && typeof cfg.videoAds === 'object') ? cfg.videoAds : {};
  const videoAds = {
    hero: prev.hero || [],
    popup: prev.popup || [],
    platformPromoUrl: prev.platformPromoUrl || 'rizq-assets/promo/rizq-platform-promo-light.mp4',
    platformPromoEnabled: prev.platformPromoEnabled !== false,
    adSlotSeconds: Number(prev.adSlotSeconds) || 25,
    stats: prev.stats && typeof prev.stats === 'object' ? prev.stats : {},
  };

  const pkgDef = await findCatalogPackage(req.pkg);
  const packageId = (pkgDef && pkgDef.id) || req.packageId || null;
  const plan = resolveMediaPlanFromPackageRef(req.pkg, packageId, req.price);
  const target = plan.heroPlacement ? 'hero' : 'popup';
  const other = target === 'hero' ? 'popup' : 'hero';

  // حصة الفيديوهات: استبدال URL لنفس الحساب لا يزيد العدد؛ إضافة جديد يخضع للحد
  const existingAnywhere = ['hero', 'popup'].some((slot) =>
    (videoAds[slot] || []).some((a) => req.accountId && a.accountId === req.accountId)
  );
  if (!existingAnywhere && req.accountId) {
    const gate = await assertCanAddMediaVideo(req.accountId, videoAds);
    // عند أول تفعيل مباشرة بعد sync قد لا يكون السجل جاهزاً — نستخدم خطة الباقة كحد
    if (!gate.ok && gate.code === 'media_video_quota') {
      return { ok: false, error: gate.code, message: gate.message, limit: gate.limit };
    }
    if (!gate.ok && gate.code === 'media_not_subscribed') {
      const limit = plan.maxVideosPerMonth;
      const current = (videoAds.hero || []).concat(videoAds.popup || [])
        .filter((a) => a && a.accountId === req.accountId && a.active !== false).length;
      if (limit !== Infinity && current >= limit) {
        return { ok: false, error: 'media_video_quota', message: 'حد فيديوهات الباقة', limit, current };
      }
    }
  }

  videoAds[other] = (videoAds[other] || []).filter((a) => !req.accountId || a.accountId !== req.accountId);
  const list = videoAds[target] || [];
  const existing = req.accountId ? list.find((a) => a.accountId === req.accountId) : null;
  const meta = {
    advertiser: req.account || '',
    url: req.videoUrl,
    active: true,
    accountId: req.accountId || '',
    packageId: packageId || '',
    pkgName: req.pkg || '',
    featuredBadge: !!plan.featuredBadge,
    vipBadge: !!plan.vipBadge,
    prioritySearch: !!plan.prioritySearch,
    heroPlacement: !!plan.heroPlacement,
    basicStats: !!plan.basicStats,
    automatedReports: !!plan.automatedReports,
  };
  if (existing) {
    Object.assign(existing, meta);
  } else {
    list.push(meta);
  }
  // أولوية البحث: رتّب عناصر الـ popup/hero بحيث prioritySearch أولاً
  videoAds[target] = list
    .slice()
    .sort((a, b) => Number(!!b.prioritySearch) - Number(!!a.prioritySearch))
    .slice(0, 50);

  const next = Object.assign({}, cfg, { videoAds });
  await repos.saveSiteConfig(next);
  return { ok: true, slot: target, planType: plan.planType };
}

async function maybeGrantReferralBonus(req, accRow, readAccounts, writeAccounts) {
  try {
    const price = Number(req.price) || 0;
    if (price <= 0 || !accRow || !accRow.referredBy || accRow.referralBonusGranted) return;
    if (typeof readAccounts !== 'function' || typeof writeAccounts !== 'function') return;
    const { applyReferralBonusDays, REFERRAL_BONUS_DAYS } = require('../rizq_package_lifecycle_agent');
    const bonus = await applyReferralBonusDays(accRow.referredBy, REFERRAL_BONUS_DAYS || 15);
    if (!bonus || !bonus.ok) return;
    const list = await readAccounts();
    const idx = list.findIndex((a) => a.id === req.accountId);
    if (idx > -1) {
      list[idx].referralBonusGranted = true;
      await writeAccounts(list);
    }
  } catch (refErr) {
    console.warn('[subRequestActivation] referral bonus:', refErr.message);
  }
}

/**
 * تفعيل طلب اشتراك من الخادم (Telegram / API) — يطابق منطق handleSubReq في rizq_admin.html
 */
/**
 * مطالبة ذرّية بطلب اشتراك قبل تفعيله: pending → activating في عبارة SQL واحدة.
 * موافقتان متزامنتان (لوحة + Telegram + الوكيل الآلي) لا تفعّلان الباقة مرتين
 * (أيام مضاعفة، فاتورتان، مكافأة إحالة مزدوجة). الثانية تتلقى already_processed.
 */
async function claimSubRequest(id) {
  const sql = require('../db/sql');
  const rows = await sql.query(
    `UPDATE documents SET data = jsonb_set(data, '{status}', '"activating"'), updated_at_ts = NOW()
     WHERE collection = 'sub_requests' AND id = ? AND data->>'status' = 'pending'
     RETURNING id`,
    [String(id)]
  );
  return Array.isArray(rows) && rows.length === 1;
}

async function releaseSubRequestClaim(id) {
  const sql = require('../db/sql');
  await sql.execute(
    `UPDATE documents SET data = jsonb_set(data, '{status}', '"pending"'), updated_at_ts = NOW()
     WHERE collection = 'sub_requests' AND id = ? AND data->>'status' = 'activating'`,
    [String(id)]
  );
}

async function activateSubRequest(req, deps) {
  deps = deps || {};
  if (!req || !req.id) return { ok: false, error: 'invalid_request' };
  if (req.status !== 'pending') return { ok: false, error: 'not_pending', status: req.status };
  let claimed = false;
  try {
    claimed = await claimSubRequest(req.id);
  } catch (eClaim) {
    console.error('[sub-activation] claim failed:', eClaim && eClaim.message);
    return { ok: false, error: 'claim_failed' };
  }
  if (!claimed) return { ok: false, error: 'already_processed', status: 'processing_or_done' };
  let result;
  try {
    result = await _activateClaimed(req, deps);
  } catch (eAct) {
    result = { ok: false, error: 'activation_exception', message: eAct && eAct.message };
  }
  if (!result || !result.ok) {
    // فشل التفعيل: أعِد الطلب إلى pending ليُعاد المحاولة لاحقاً
    try { await releaseSubRequestClaim(req.id); } catch (eRel) { /* */ }
  }
  return result;
}

async function _activateClaimed(req, deps) {

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

  const accRow = await getAccountInfo(req.accountId, readAccounts);
  const accountName = req.account || accRow?.name || req.accountId;
  const accountPhone = accRow?.phone || '';
  const accountEmail = accRow?.email || '';
  const accountType = accRow?.type || 'individual';
  const days = await resolvePackageDurationDays(req.pkg);
  const category = req.category || 'package';

  try {
    if (category === 'tender') {
      const pkgDef = await findCatalogPackage(req.pkg);
      const isTrial = isTrialPackage(req.pkg, req.price);
      const { periodStart, periodEnd, now } = computeActivationPeriod(days, await getAccountRecord(req.accountId + '::tender'));
      const result = await syncAccountPackage({
        accountId: req.accountId + '::tender',
        accountName,
        accountPhone,
        accountEmail,
        accountType,
        pkgName: (pkgDef && pkgDef.name) || req.pkg || 'شهرية',
        packageId: (pkgDef && pkgDef.id) || null,
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
      await maybeGrantReferralBonus(req, accRow, readAccounts, writeAccounts);
      return { ok: true, category, result, accountName };
    }

    if (category === 'investment') {
      const pkgDef = await findCatalogPackage(req.pkg);
      const isTrial = isTrialPackage(req.pkg, req.price);
      const { periodStart, periodEnd, now } = computeActivationPeriod(days, await getAccountRecord(req.accountId + '::investment'));
      const result = await syncAccountPackage({
        accountId: req.accountId + '::investment',
        accountName,
        accountPhone,
        accountEmail,
        accountType,
        pkgName: (pkgDef && pkgDef.name) || req.pkg || 'شهرية',
        packageId: (pkgDef && pkgDef.id) || null,
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
      await maybeGrantReferralBonus(req, accRow, readAccounts, writeAccounts);
      return { ok: true, category, result, accountName };
    }

    if (category === 'verified_plus') {
      if (typeof readAccounts !== 'function' || typeof writeAccounts !== 'function') {
        return { ok: false, error: 'accounts_io_missing' };
      }
      const list = await readAccounts();
      const idx = list.findIndex((a) => a.id === req.accountId);
      if (idx === -1) return { ok: false, error: 'account_not_found' };
      const grantDays = (await resolvePackageDurationDays(req.pkg)) || 365;
      list[idx].verifiedPlus = true;
      list[idx].verifiedPlusExpiresAt = new Date(Date.now() + grantDays * 86400000).toISOString();
      await writeAccounts(list);
      return { ok: true, category, verifiedPlusExpiresAt: list[idx].verifiedPlusExpiresAt, accountName };
    }

    if (category === 'ad_boost') {
      if (!req.adId) return { ok: false, error: 'adId_required' };
      if (typeof readAdBoosts !== 'function' || typeof writeAdBoosts !== 'function') {
        return { ok: false, error: 'ad_boosts_io_missing' };
      }
      const boostDays = (await resolvePackageBoostDays(req.pkg)) || 3;
      const now = new Date();
      const ends = new Date(now.getTime() + boostDays * 86400000);
      const all = (await readAdBoosts()) || {};
      all[req.adId] = {
        adId: req.adId,
        accountId: req.accountId,
        activatedAt: now.toISOString(),
        endsAt: ends.toISOString(),
        price: Number(req.price) || 0,
      };
      await writeAdBoosts(all);
      return { ok: true, category, boost: all[req.adId], accountName };
    }

    // باقة Rizq ADS / الفيديو — معزولة بمفتاح accountId::video (مثل المناقصات)
    // حتى لا تستبدل باقة الحساب العامة (محل/مكتب/فرد).
    if (category === 'video') {
      const pkgDef = await findCatalogPackage(req.pkg);
      const packageId = (pkgDef && pkgDef.id) || req.packageId || null;
      const isVidId = !!(packageId && /^vid-/.test(String(packageId)));
      // رفض تفعيل أسماء باقات غير فيديو عبر فئة video (حماية من منح ماسية بالخطأ)
      if (!isVidId && ((await isDiamondPackageRef(req.pkg)) || !/فيديو|video|rizq\s*ads|إعلان/i.test(String(req.pkg || '')))) {
        return { ok: false, error: 'invalid_video_package', message: 'باقة الفيديو غير صالحة' };
      }
      const { periodStart, periodEnd, now } = computeActivationPeriod(
        days,
        await getAccountRecord(req.accountId + '::video')
      );
      const isTrial = isTrialPackage(req.pkg, req.price);
      const result = await syncAccountPackage({
        accountId: req.accountId + '::video',
        accountName,
        accountPhone,
        accountEmail,
        accountType: 'video',
        pkgName: (pkgDef && pkgDef.name) || req.pkg || 'أساسي فيديو',
        packageId,
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
      const adResult = await activateVideoAdOnServer(Object.assign({}, req, {
        pkg: (pkgDef && pkgDef.name) || req.pkg,
        packageId,
      }));
      if (adResult && adResult.ok === false) {
        return { ok: false, error: adResult.error || 'video_slot_failed', message: adResult.message, category };
      }
      await maybeGrantReferralBonus(req, accRow, readAccounts, writeAccounts);
      return { ok: true, category, result, adResult, accountName, isolated: true };
    }

    // package (default) — باقات الحساب العامة فقط
    const existingPkg = await getAccountRecord(req.accountId);
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

    if (!isTrial && (await isDiamondPackageRef(req.pkg)) && accountPhone && typeof registerSubscriber === 'function') {
      try {
        await registerSubscriber(String(accountPhone).replace(/[^0-9+]/g, '').slice(0, 40), {
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

    await maybeGrantReferralBonus(req, accRow, readAccounts, writeAccounts);

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
