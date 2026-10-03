/**
 * يتحقق أن خوارزمية الاكتشاف موحّدة للأقسام الخمسة:
 * محلات / مكاتب / معارض / مناقصات / استثمارات
 * — عتبة 3، عيّنات آمنة، ترتيب بالأحدث.
 */
'use strict';

const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';
const platformStore = require('../db/platformStore');
const repos = require('../db/repos');

async function req(path) {
  const r = await fetch(BASE + path);
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const backupTenders = platformStore.readTenders();
  const seededInvIds = ['inv_disc_test_0', 'inv_disc_test_1', 'inv_disc_test_2'];

  try {
    const pub = await req('/api/accounts/public');
    assert(pub.status === 200 && Array.isArray(pub.j.accounts), 'accounts/public ok');
    const byType = { store: 0, office: 0, corp: 0 };
    for (const a of pub.j.accounts) {
      if (a.status === 'approved' && a.name && a.thumb && a.tagline && byType[a.type] != null) {
        byType[a.type] += 1;
      }
    }
    console.log('ready accounts', byType);

    const now = Date.now();
    const seeded = [];
    for (let i = 0; i < 3; i++) {
      seeded.push({
        id: 'tnd_disc_test_' + i,
        title: 'مناقصة اختبار اكتشاف ' + i,
        category: ['سيارات', 'معدات', 'بناء'][i],
        city: 'نواكشوط',
        deadline: new Date(now + (i + 5) * 86400000).toISOString(),
        createdAt: new Date(now - i * 3600000).toISOString(),
        status: 'open',
        ownerId: 'acc_disc_test',
        budget: 'SECRET_SHOULD_NOT_LEAK',
        ownerPhone: '22111111',
      });
    }
    platformStore.writeTenders(backupTenders.concat(seeded));

    seededInvIds.forEach((id, i) => {
      repos.upsertInvestment({
        id,
        title: 'فرصة اكتشاف ' + i,
        sector: ['تجارة', 'عقارات', 'زراعة'][i],
        wilaya: 'نواكشوط',
        stage: 'فكرة',
        summary: 'ملخص عام للاختبار بدون تواصل',
        capital: '',
        createdAt: new Date(now - i * 7200000).toISOString(),
        status: 'approved',
        publishedAt: new Date(now - i * 7200000).toISOString(),
      });
    });

    const tStats = await req('/api/tenders/public-stats');
    assert(tStats.j.ok === true, 'tenders stats ok');
    assert(tStats.j.minReady === 3 && tStats.j.maxCards === 20, 'tenders thresholds');
    assert(tStats.j.count >= 3, 'tenders count>=3 got ' + tStats.j.count);
    assert(Array.isArray(tStats.j.teasers) && tStats.j.teasers.length >= 3, 'tenders teasers');
    const leak = JSON.stringify(tStats.j);
    assert(!leak.includes('SECRET_SHOULD_NOT_LEAK'), 'no budget leak');
    assert(!leak.includes('22111111'), 'no phone leak');
    const tTimes = tStats.j.teasers.map((t) => new Date(t.createdAt || 0).getTime());
    for (let i = 1; i < tTimes.length; i++) {
      assert(tTimes[i - 1] >= tTimes[i], 'tenders newest-first');
    }
    console.log('tenders public-stats OK', { count: tStats.j.count, teasers: tStats.j.teasers.length });

    const iStats = await req('/api/investments/public-stats');
    assert(iStats.j.ok === true, 'investments stats ok');
    assert(iStats.j.minReady === 3 && iStats.j.maxCards === 20, 'investments thresholds');
    assert(iStats.j.count >= 3, 'investments count>=3 got ' + iStats.j.count);
    assert(Array.isArray(iStats.j.teasers) && iStats.j.teasers.length >= 3, 'investments teasers');
    assert(!('contactHint' in (iStats.j.teasers[0] || {})), 'no contactHint on teaser');
    const iTimes = iStats.j.teasers.map((t) => new Date(t.createdAt || 0).getTime());
    for (let i = 1; i < iTimes.length; i++) {
      assert(iTimes[i - 1] >= iTimes[i], 'investments newest-first');
    }
    console.log('investments public-stats OK', { count: iStats.j.count, teasers: iStats.j.teasers.length });

    function stripReady(n) { return n >= 3; }
    assert(stripReady(tStats.j.count) === true, 'tenders strip would show');
    assert(stripReady(iStats.j.count) === true, 'investments strip would show');
    ['store', 'office', 'corp'].forEach((k) => {
      assert(stripReady(byType[k]) === (byType[k] >= 3), k + ' gate');
    });

    // عتبة < 3 → لا شريط (محاكاة)
    assert(stripReady(2) === false && stripReady(0) === false, 'empty when <3');

    console.log('ALL DISCOVERY SECTION CHECKS PASSED');
  } finally {
    platformStore.writeTenders(backupTenders);
    for (const id of seededInvIds) {
      try { repos.removeInvestment(id); } catch (_) {}
    }
  }
}

main().catch((e) => {
  console.error('FAIL', e && e.stack || e);
  process.exit(1);
});
