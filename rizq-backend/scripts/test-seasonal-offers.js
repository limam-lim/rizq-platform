#!/usr/bin/env node
/**
 * العروض الموسمية — تداخل، خصم، استرداد مرة واحدة، تاريخ الدفع.
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-seasonal-offers: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const repos = require('../db/repos');
  const so = require('../services/seasonalOffers');

  /* عزل: امسح عروض الاختبار */
  const cfg0 = (await repos.getSiteConfig()) || {};
  cfg0.seasonalOffers = { offers: [], redemptions: {}, updatedAt: null };
  await repos.saveSiteConfig(cfg0);

  const now = Date.now();
  const start = new Date(now - 86400000).toISOString();
  const end = new Date(now + 7 * 86400000).toISOString();

  console.log('\n— create / overlap —');
  {
    const a = await so.upsertOffer({
      titleAr: 'عرض الربيع',
      titleFr: 'Offre printemps',
      percent: 30,
      startAt: start,
      endAt: end,
      packageIds: ['st-month'],
    });
    ok('create offer', a.ok && a.offer && a.offer.id, a);
    const offerId = a.offer.id;

    const overlap = await so.upsertOffer({
      titleAr: 'تداخل',
      titleFr: 'Overlap',
      percent: 20,
      startAt: new Date(now + 2 * 86400000).toISOString(),
      endAt: new Date(now + 10 * 86400000).toISOString(),
      packageIds: ['st-year'],
    });
    ok('reject overlapping offer', !overlap.ok && overlap.error === 'overlap', overlap);

    const xss = await so.upsertOffer({
      titleAr: '<script>alert(1)</script>عنوان',
      titleFr: 'Safe',
      percent: 10,
      startAt: new Date(now + 20 * 86400000).toISOString(),
      endAt: new Date(now + 30 * 86400000).toISOString(),
      packageIds: ['st-month'],
    });
    ok('XSS tags stripped from title', xss.ok && xss.offer.titleAr.indexOf('<') < 0 && xss.offer.titleAr.indexOf('>') < 0, xss.offer);

    console.log('\n— resolve price / payment date / one month —');
    const priced = await so.resolveOfferPrice({
      listPrice: 3000,
      packageId: 'st-month',
      accountId: 'acc-season-1',
      paymentAt: new Date().toISOString(),
    });
    ok('30% → 2100', priced.discounted && priced.price === 2100, priced);

    const retro = await so.resolveOfferPrice({
      listPrice: 3000,
      packageId: 'st-month',
      accountId: 'acc-season-1',
      paymentAt: new Date(now - 10 * 86400000).toISOString(),
    });
    ok('no retroactive discount before start', !retro.discounted && retro.price === 3000, retro);

    await so.recordRedemption({
      offerId,
      accountId: 'acc-season-1',
      requestId: 'sub_test',
      paidPrice: 2100,
      listPrice: 3000,
    });
    const again = await so.resolveOfferPrice({
      listPrice: 3000,
      packageId: 'st-month',
      accountId: 'acc-season-1',
      paymentAt: new Date().toISOString(),
    });
    ok('second month full price after redemption', !again.discounted && again.alreadyRedeemed && again.price === 3000, again);

    const other = await so.resolveOfferPrice({
      listPrice: 3000,
      packageId: 'st-month',
      accountId: 'acc-season-2',
      paymentAt: new Date().toISOString(),
    });
    ok('other subscriber still discounted', other.discounted && other.price === 2100, other);

    const pub = await so.getPublicActiveOffer();
    ok('public active offer present', pub && pub.id === offerId && pub.percent === 30, pub);
    ok('public title has no HTML', pub && pub.titleAr.indexOf('<') < 0, pub);

    const hist = await so.offerHistory();
    ok('history lists offer', Array.isArray(hist) && hist.some((h) => h.id === offerId), hist.length);

    await so.archiveOffer(offerId);
    const afterArch = await so.getPublicActiveOffer();
    ok('archived offer not public', !afterArch || afterArch.id !== offerId, afterArch);
  }

  /* تنظيف */
  const cfg1 = (await repos.getSiteConfig()) || {};
  cfg1.seasonalOffers = { offers: [], redemptions: {}, updatedAt: null };
  await repos.saveSiteConfig(cfg1);

  console.log('\n══ seasonal-offers: ' + pass + ' pass, ' + fail + ' fail ══');
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
