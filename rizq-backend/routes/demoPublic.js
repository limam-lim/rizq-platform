/**
 * مسارات عامة لبيانات العرض الوهمية (graduation demo) — ليست للإنتاج الحي.
 * تُستخدم كمصدر احتياطي للأدلة عندما يكون /api/accounts/public فارغاً
 * أو عندما تريد الواجهة قراءة الـ fixture دون المسار المحجوب /rizq-backend/*.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isProdEnv } = require('../middleware/accountAuth');

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'graduation-demo.json');

function allowGraduationFixture() {
  if (!isProdEnv()) return true;
  return process.env.RIZQ_ALLOW_GRADUATION_SEED === '1'
    || process.env.RIZQ_ALLOW_GRADUATION_FIXTURE === '1';
}

function readFixture() {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  if (!raw || !Array.isArray(raw.accounts)) {
    const err = new Error('graduation_fixture_invalid');
    err.status = 500;
    throw err;
  }
  return raw;
}

function mountDemoPublicRoutes(app) {
  /**
   * GET /api/demo/graduation
   * يُرجع fixture العرض الوهمي (حسابات + إعلانات) للاختبار قبل الإطلاق.
   * محظور في الإنتاج ما لم يُضبط RIZQ_ALLOW_GRADUATION_FIXTURE=1.
   */
  app.get('/api/demo/graduation', (req, res) => {
    if (!allowGraduationFixture()) {
      return res.status(404).json({
        ok: false,
        error: 'demo_fixture_disabled',
        message: 'بيانات العرض الوهمية غير متاحة في هذا الخادم',
      });
    }
    try {
      const data = readFixture();
      res.set('Cache-Control', 'public, max-age=60');
      res.set('X-Rizq-Demo', 'graduation-fiction');
      res.json({
        ok: true,
        fictional: true,
        wipeBeforeLaunch: true,
        wipeCommand: 'node scripts/seed-graduation-demo.js --clear',
        meta: data.meta || null,
        accounts: data.accounts || [],
        ads: data.ads || [],
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'fixture_read_failed' });
    }
  });
}

module.exports = { mountDemoPublicRoutes, allowGraduationFixture, readFixture };
