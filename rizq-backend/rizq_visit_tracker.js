/**
 * rizq_visit_tracker.js
 * ══════════════════════════════════════════════════════════════════
 * عدّاد زيارات حقيقي لصفحات المشتركين العامة (rizq_store.html /
 * rizq_office.html / rizq_corp.html) — لم يكن موجوداً إطلاقاً قبل هذا
 * الإصلاح. لوحات التحكم كانت تعرض رقم "إحصائيات الزيارات" إما ثابتاً
 * بالكامل بالكود (مثلاً "1,240" في داشبورد الشركة) أو عشوائياً
 * (Math.random() في داشبورد المحل/المكتب) — أي رقم مختلف مزيَّف في كل
 * مرة، بلا أي علاقة بزيارات حقيقية. هذا الملف يبني عداداً حقيقياً بسيطاً:
 *
 *   - كل صفحة عامة (بعد رفع الخادم فعلياً) ترسل ping واحد لكل زائر عند
 *     تحميل الصفحة (مع تفادي عدّ نفس الزائر مرتين بنفس اليوم عبر
 *     localStorage في متصفحه هو، لا الخادم).
 *   - يُخزَّن العدد بملف JSON بسيط (نفس نمط site-config.json/ads-
 *     requests.json المستخدم فعلاً في هذا المشروع) — بيانات مشتركة بين
 *     كل الزوار فعلياً، لا محصورة في متصفح صاحب الحساب فقط.
 *   - قراءة الإحصائيات من الداشبورد محمية بنفس accessToken الخاص بكل
 *     حساب (المُصدَر أصلاً في rizq_package_lifecycle_agent.js عند أول
 *     تفعيل باقة) — لا سرّ الأدمن العام، فلا يمكن لمشترك رؤية زيارات غيره.
 * ══════════════════════════════════════════════════════════════════
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');

const SOURCES = ['direct', 'whatsapp', 'facebook', 'google', 'other'];
const KEEP_DAYS = 100; // كافٍ لعرض آخر 3 أشهر (~90 يوماً) + هامش، بلا تضخّم غير محدود للملف

function _load() {
  try { return JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8')); } catch (e) { return {}; }
}
function _save(store) {
  try { fs.writeFileSync(VISITS_FILE, JSON.stringify(store, null, 2), 'utf8'); }
  catch (e) { console.error('⚠️ فشل حفظ visits.json:', e.message); }
}

function _todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function _bucketSource(referrer) {
  const r = String(referrer || '').toLowerCase();
  if (!r) return 'direct';
  if (r.includes('wa.me') || r.includes('whatsapp')) return 'whatsapp';
  if (r.includes('facebook') || r.includes('fb.com') || r.includes('instagram')) return 'facebook';
  if (r.includes('google')) return 'google';
  return 'other';
}

// ── تسجيل زيارة واحدة لحساب معيّن ────────────────────────────────────
function trackVisit(accountId, referrer) {
  if (!accountId) return { ok: false, error: 'accountId مطلوب' };
  const store = _load();
  const rec = store[accountId] || { total: 0, byDay: {}, bySource: {} };
  const day = _todayKey();
  const source = _bucketSource(referrer);

  rec.total = (rec.total || 0) + 1;
  rec.byDay[day] = (rec.byDay[day] || 0) + 1;
  rec.bySource[source] = (rec.bySource[source] || 0) + 1;

  // تنظيف الأيام القديمة جداً — لا داعي لحفظها للأبد
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  Object.keys(rec.byDay).forEach((d) => { if (d < cutoff) delete rec.byDay[d]; });

  store[accountId] = rec;
  _save(store);
  return { ok: true };
}

// ── قراءة إحصائيات حساب معيّن (آخر 90 يوماً يومياً + هذا الشهر + المصادر) ──
// last90 تُمكِّن الداشبورد من اشتقاق تبويبات "7 أيام / 30 يوماً / 3 أشهر"
// كلها من نفس المصفوفة (slice من النهاية) بلا نداء إضافي للخادم.
function getVisitStats(accountId) {
  const store = _load();
  const rec = store[accountId];
  if (!rec) return { total: 0, last90: [], monthTotal: 0, bySource: {} };

  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: rec.byDay[d] || 0 });
  }
  const monthPrefix = _todayKey().slice(0, 7); // YYYY-MM
  const monthTotal = Object.keys(rec.byDay)
    .filter((d) => d.startsWith(monthPrefix))
    .reduce((sum, d) => sum + rec.byDay[d], 0);

  return {
    total: rec.total || 0,
    last90: days,
    monthTotal,
    bySource: Object.assign({}, ...SOURCES.map((s) => ({ [s]: rec.bySource[s] || 0 }))),
  };
}

// ── نقاط الـ API ────────────────────────────────────────────────────
// getAccountRecord: من rizq_package_lifecycle_agent — يحمل accessToken
// خاصاً بسجل الباقة نفسه (يُولَّد مستقلاً عند أول تفعيل)، منفصل تماماً عن
// accessToken الحساب الأساسي في accounts.json.
// getMainAccount: إصلاح جوهري (2026-08-05) — سجل الباقة لا يُنشأ إلا بعد
// تفعيل باقة فعلياً، فكانت /api/visit-stats/:id ترفض بـ404 أي حساب بلا
// باقة نشطة رغم أن تتبّع الزيارات نفسه (POST) يعمل لكل الحسابات بلا شرط،
// ورغم أن هذا الـtoken المنفصل لم يكن يُسلَّم لأي واجهة أمامية إطلاقاً
// (لا داشبورد فردي ولا تاجر يعرفه) — أي أن نقطة القراءة كانت غير قابلة
// للاستخدام عملياً لأي حساب. الحل: التحقق أولاً من accessToken الحقيقي
// للحساب الأساسي (نفس المستخدم في كل نداءات الداشبورد الأخرى)، والرجوع
// لتوكن سجل الباقة فقط كخيار احتياطي متوافق مع الخلف.
function setupVisitTrackingAPI(app, trackVisitLimiter, getAccountRecord, getMainAccount) {
  // تسجيل زيارة — عام تماماً (زوار مجهولون، لا مصادقة)، محمي فقط بـ rate-limit
  app.post('/api/track-visit', trackVisitLimiter, (req, res) => {
    const { accountId, referrer } = req.body || {};
    const result = trackVisit(String(accountId || '').slice(0, 40), referrer);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ok: true });
  });

  // قراءة الإحصائيات — محمية بـ accessToken الحقيقي لصاحب الحساب.
  app.get('/api/visit-stats/:id', (req, res) => {
    const id = req.params.id;
    const token = req.header('x-account-token') || req.query.token;
    const mainAcc = getMainAccount ? getMainAccount(id) : null;
    const pkgRec = getAccountRecord ? getAccountRecord(id) : null;
    if (!mainAcc && !pkgRec) return res.status(404).json({ error: 'account_not_found' });
    const validToken = (mainAcc && mainAcc.accessToken) || (pkgRec && pkgRec.accessToken) || null;
    if (!token || !validToken || token !== validToken) return res.status(401).json({ error: 'unauthorized' });
    res.json({ ok: true, stats: getVisitStats(id) });
  });
}

module.exports = { trackVisit, getVisitStats, setupVisitTrackingAPI };
