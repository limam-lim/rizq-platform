/**
 * rizq-backend/server.js
 * ══════════════════════════════════════════════════════════════════
 * © Rizq ADMINIA SARL — Proprietary & Confidential
 * خادم خلفي صغير وآمن لمنصة رزق
 * ══════════════════════════════════════════════════════════════════
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
process.env.TZ = process.env.RIZQ_TIMEZONE || process.env.MAINTENANCE_CRON_TZ || 'Africa/Nouakchott';
const { ensureAnthropicEnv, getAnthropicApiKey, isAnthropicConfigured, getAgentModel, getAdvancedModel } = require('./config/anthropic');
ensureAnthropicEnv();
// ���� SQLite (data/rizq.db) � �&شتر���  + �&فض�ة � ا��&رح�ة 3 ��������������������������
require('./db');
const authRouter = require('./routes/auth');
const wishlistRouter = require('./routes/wishlist');
const BuyerModel = require('./models/buyer');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errors');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createAdminAuth } = require('./middleware/adminAuth');
const { isProdEnv, extractAccountToken, extractDashToken } = require('./middleware/accountAuth');
const { installAdminPanelGate } = require('./middleware/adminPanelGate');
const { registerSubscriber, getSubscriberProfile, getAllSubscriberProfiles, getSubscriberProfileByAccountId, upsertSubscriberKnowledgeFromAccount, upsertSubscriberInstructionsFromAccount } = require('../rizq_subscriber_agent');
const { normalizeAccountActivityFields, loadCatalog } = require('./services/merchantActivities');
const { refreshCurrencyRates, sanitizeCurrencyList, mergeCurrencyConfig } = require('./services/currencyRates');
const { parseKnowledgeFile, formatDynamicKnowledgeForPrompt } = require('./services/dynamicKnowledge');
const { recordUsage, setupQuotaGuardAPI } = require('../rizq_quota_guard_agent');

const app = express();

// ── ضغط الاستجابات (gzip/Brotli حسب ما يدعمه المتصفح) ──────────────
// خطوة خفّة حقيقية وقابلة للتنفيذ الآن (بخلاف CDN/Redis التي تحتاج نشراً
// فعلياً) — مهمة خصوصاً على إنترنت موريتانيا الضعيف، لأن كل استجابة JSON
// (site-config, ads/requests) تُضغط قبل الإرسال بدون أي تغيير في الشكل
// أو السلوك الظاهر للمستخدم.
app.use(compression());

// ── Security & IP protection headers (Contact Gate + platform copyright) ──
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Rizq-Platform', 'Rizq-ADMINIA-SARL');
  res.set('X-Copyright', '(c) Rizq ADMINIA SARL - Proprietary. Unauthorized copying prohibited.');
  next();
});

// إصلاح جوهري 29/07/2026: كان الحد 4mb كافياً فقط لصورة وصل دفع واحدة —
// إعلان واحد قد يحمل حتى 6 صور مضغوطة (~1-1.5MB لكل صورة بعد ضغط العميل)
// أي حتى ~9MB بالطلب الواحد. رُفع الحد هنا؛ الصور نفسها تُكتب كملفات على
// القرص فوراً (انظر _saveAdImages أدناه) ولا تبقى محفوظة كنص base64 ضخم
// داخل ads.json — فقط الحد الأقصى للطلب الوارد (قبل فك التشفير) يحتاج
// رفعاً هنا.
app.use(express.json({ limit: '20mb' }));

// ── تخزين بسيط على ملفات JSON على القرص ─────────────────────────────
// هذا ليس قاعدة بيانات حقيقية (المطلوبة قبل الإطلاق الكامل حسب خطة
// rizq_backend_plan.html) بل أصغر خطوة حقيقية ممكنة الآن: بيانات مشتركة
// بين كل الزوار فعلياً (بدل localStorage المحصور بمتصفح الأدمن فقط).
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SITE_CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const ADS_REQUESTS_FILE = path.join(DATA_DIR, 'ads-requests.json');

// ── نظام "إطلاق تدريجي" — طلب Limam 03/08/2026: إطلاق أولي بأقسام الأفراد
// والمحلات فقط، بينما تبقى بقية الأقسام (مكاتب/شركات/مناقصات/فيديوهات
// إعلانية) مبنية وجاهزة لكن مخفية خلف علم تفعيل، تُفتح لاحقاً من لوحة
// الأدمن بضغطة زر بلا أي تعديل كود أو إعادة نشر. ──
const DEFAULT_MODULE_FLAGS = { individual: true, store: true, office: false, corp: false, tenders: false, videoAds: false };
function getModuleFlags() {
  const cfg = readJson(SITE_CONFIG_FILE, {});
  return Object.assign({}, DEFAULT_MODULE_FLAGS, cfg.moduleFlags || {});
}

const DEFAULT_PLATFORM_FLAGS = {
  platformOpen: true,
  registrationOpen: true,
  adsOpen: true,
  moderationRequired: false,
  otpRequired: true,
  vpnBlock: false,
  sessionTimeoutMin: 60,
};
function getPlatformFlags() {
  const cfg = readJson(SITE_CONFIG_FILE, {});
  return Object.assign({}, DEFAULT_PLATFORM_FLAGS, cfg.platformFlags || {});
}

// ── محرك القواعد المشترك لكل قسم (وكيل واحد + قواعد منفصلة لكل قسم بدل
// وكيل منفصل لكل قسم — راجع RIZQ_SECTION_MANAGEMENT_RULES.md للمحتوى
// الكامل). كل قسم له: كلمات محظورة إضافية (فوق القائمة العامة)، وهل
// تُصعَّد كل حالة منه للمراجعة البشرية إلزامياً (المكاتب/الشركات/
// المناقصات تتطلب وثائق رسمية لا يمكن التحقق منها آلياً بثقة). ─────────
const DEFAULT_SECTION_RULES = {
  individual:  { extraBannedKeywords: [], escalateAlways: false, requiredDocsNote: 'رقم هاتف صالح + اسم كامل — لا وثائق رسمية' },
  store:       { extraBannedKeywords: [], escalateAlways: false, requiredDocsNote: 'بطاقة وطنية فقط' },
  office:      { extraBannedKeywords: ['علاج مضمون', 'كسب القضية أكيد', 'guérison garantie'], escalateAlways: true, requiredDocsNote: 'رخصة النشاط سارية + بطاقة وطنية' },
  corp:        { extraBannedKeywords: [], escalateAlways: true, requiredDocsNote: 'سجل تجاري/رخصة تأسيس + بطاقة وطنية للممثل القانوني' },
  tenders:     { extraBannedKeywords: [], escalateAlways: true, requiredDocsNote: 'حساب شركة/مكتب موافَق عليه مسبقاً + باقة مدفوعة نشطة' },
  videoAds:    { extraBannedKeywords: [], escalateAlways: true, requiredDocsNote: 'حساب مفتوح أصلاً (فرد/محل) — مراجعة الفيديو قبل النشر العام' },
};
function getSectionRules() {
  const cfg = readJson(SITE_CONFIG_FILE, {});
  const stored = (cfg.sectionRules && typeof cfg.sectionRules === 'object') ? cfg.sectionRules : {};
  const out = {};
  Object.keys(DEFAULT_SECTION_RULES).forEach((key) => {
    out[key] = Object.assign({}, DEFAULT_SECTION_RULES[key], stored[key] || {});
  });
  return out;
}

// ── ملفات إعلانات رزق الحقيقية تُخدَّم كملفات ثابتة عبر /uploads ────────
// (انظر قسم "إعلانات رزق الحقيقية" أسفل الملف لتفاصيل saveAdImages)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ���� CORS: أص��� �&س�&��حة (ALLOWED_ORIGIN � �ائ�&ة �&فص���ة بف��اص�) ��������������
// �&ثا� إ� تاج: https://rizq.mr,https://www.rizq.mr
// �&ثا� تط���`ر: أضف http://localhost:5500,http://127.0.0.1:5500
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];
LOCAL_DEV_ORIGINS.forEach((o) => { if (!ALLOWED_ORIGINS.includes(o)) ALLOWED_ORIGINS.push(o); });
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) {
      return cb(null, !isProdEnv());
    }
    if (origin === 'null') {
      return cb(null, !isProdEnv());
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // معاينة GitHub Pages (مثل limam-lim.github.io) — للاختبار قبل النطاق الرسمي
    if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return cb(null, true);
    cb(new Error('غير مسموح من هذا الأصل (CORS)'));
  },
}));

// ── Rate limit: حماية حصة Claude API من الاستهلاك العشوائي ─────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

// ── Rate limit مخصص أشد على /api/ads/submit ─────────────────────────
// هذا الـ endpoint عام بلا أي مصادقة (requireAdminAuth) لأنه مخصص
// لزوار حقيقيين يطلبون نشر إعلان — الحد العام أعلاه (60/15 دقيقة) لا
// يكفي وحده لمنع إغراق ملف ads-requests.json بطلبات مزيفة من IP واحد.
const adsSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
});

// ── سرّ مشترك / جلسة أدمن — يمنع استدعاء endpoints الإدارية من خارج الجلسة ──
// ══ مصادقة لوحة الإدارة (rizq_admin.html) — من طرف السيرفر فعلياً ═══
// كانت شاشة الدخول في rizq_admin.html تقارن كلمة السر بمصفوفة JS داخل
// الملف نفسه، أي أن كلمة سر المدير العام الحقيقية كانت تُرسَل كنص صريح
// لأي متصفح يفتح الصفحة (مرئية عبر "عرض المصدر")، بلا أي تحقق من طرف
// الخادم — ثغرة إفشاء بيانات اعتماد حرجة. الحل: الحسابات وكلمات السر
// (مُشفّرة bcrypt) موجودة هنا فقط (لا يصل هذا الملف أبداً لأي متصفح)،
// وتسجيل الدخول يمر عبر /api/admin/login الذي يتحقق من الهاش ويُصدر
// جلسة (token) عشوائية يتحقق منها الخادم في كل مرة عبر requireAdminSession.
//
// لإضافة حساب جديد أو تغيير كلمة سر موجودة، احسب الهاش بهذا الأمر ثم
// ضع الناتج في passHash أدناه:
//   node -e "console.log(require('bcryptjs').hashSync('كلمة_السر_الجديدة', 10))"
const bcrypt = require('bcryptjs');
const ADMIN_ACCOUNTS = [
  // إصلاح 22/07/2026: كلمات السر أُعيد توليدها لأن النسخة الأصلية (plaintext) لم تكن
  // محفوظة في أي مكان قابل للاسترجاع (bcrypt هاش لا يُفَكّ عكسياً). القيم الجديدة
  // أُرسلت لـ Limam مرة واحدة في المحادثة — احفظها فوراً في مدير كلمات سر.
  { user: 'admin', passHash: '$2a$10$P9STsJ2wU2iWUvL7IrtHl.KgOqcdRnUxCv7yOubuksk4zGbxo69Ki', name: 'M. LIMAM', role: 'super' },
  { user: 'mod1', passHash: '$2a$10$Pz58idNGtWx5zJh6D.wwtOlKDZaZm23h6XQivYWhSyDA43pApWriG', name: 'المشرف الأول', role: 'moderator' },
  { user: 'mod2', passHash: '$2a$10$j1o0c2FMvWxLsFJn5B5IMuCQ8GfJc46rsWwVz3Ho/Z8hkU/eRUfgW', name: 'المشرف الثاني', role: 'moderator' },
  // { user: 'mod3', passHash: '...', name: 'الاسم', role: 'moderator' },
];
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة
const adminSessions = new Map(); // token -> { user, name, role, expiresAt }
const { requireAdminSession, requireAdminAuth, requireSharedSecret } = createAdminAuth({ adminSessions });
function cleanExpiredAdminSessions() {
  const now = Date.now();
  for (const [tok, sess] of adminSessions) if (sess.expiresAt < now) adminSessions.delete(tok);
}
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة جداً — حاول مرة أخرى بعد قليل' },
});
app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
  cleanExpiredAdminSessions();
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'يرجى تعبئة الحقلين' });
  const acc = ADMIN_ACCOUNTS.find(a => a.user === String(user).trim());
  // مقارنة وهمية عند عدم وجود المستخدم لإبقاء زمن الاستجابة متقارباً
  // (يقلّل من إمكانية استكشاف أسماء المستخدمين الصحيحة عبر توقيت الرد).
  const ok = await bcrypt.compare(String(pass), acc ? acc.passHash : '$2b$10$........................................');
  if (!acc || !ok) return res.status(401).json({ error: '❌ بيانات غير صحيحة' });
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { user: acc.user, name: acc.name, role: acc.role, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
  res.json({ ok: true, token, name: acc.name, role: acc.role });
});
app.get('/api/admin/verify', requireAdminSession, (req, res) => {
  res.json({ ok: true, name: req.adminUser.name, role: req.adminUser.role });
});
app.post('/api/admin/logout', (req, res) => {
  const token = req.header('x-admin-token');
  if (token) adminSessions.delete(token);
  res.json({ ok: true });
});

function isAdminRequest(req) {
  const adminTok = req.header('x-admin-token');
  if (adminTok) {
    const sess = adminSessions.get(adminTok);
    if (sess && sess.expiresAt >= Date.now()) return true;
  }
  const got = req.header('x-rizq-secret');
  const secret = process.env.BACKEND_SHARED_SECRET || '';
  return !!(secret && got && got === secret);
}

const anthropic = new Anthropic({ apiKey: getAnthropicApiKey() });

app.get('/health', (req, res) => res.json({ ok: true }));

/**
 * POST /api/subscriber/register  و  GET /api/subscribers
 * ═══════════════════════════════════════════════════════════════
 * وجهة مسجَّلة من لوحة الأدمن (rizq_admin.html، تبويب "الوكلاء المشتركون")
 * فعلياً لأول مرة — كانت saveSubscriberAgent() تحفظ في localStorage المتصفح
 * فقط، بلا أي وصول لخادم المكالمات/واتساب (rizq_call_handler.js /
 * rizq_whatsapp_handler.js)، فالمكتب/المحل الذي يسجّله الأدمن هنا لم يكن
 * يظهر أبداً لأي مكالمة أو رسالة واتساب حقيقية. هذا الخادم (rizq-backend)
 * هو الوحيد المُهيَّأ فعلاً لطلبات المتصفح (CORS + سرّ مشترك)، فيستدعي هنا
 * مباشرة registerSubscriber() من نفس وحدة rizq_subscriber_agent.js التي
 * يقرأها خادما المكالمات/واتساب (ملف rizq_subscribers_store.json المشترك).
 */
app.post('/api/subscriber/register', requireAdminAuth, (req, res) => {
  const { subscriberId, ...profile } = req.body || {};
  if (!subscriberId || !profile.businessName) {
    return res.status(400).json({ error: 'subscriberId + businessName مطلوبان' });
  }
  try {
    registerSubscriber(String(subscriberId).slice(0, 40), Object.assign({
      plan: 'diamond',
      tier: 'diamond',
      widget_enabled: true,
      whatsapp_enabled: true,
      calls_enabled: true,
    }, profile));
    res.json({ ok: true, message: 'تم تسجيل ' + profile.businessName });
  } catch (err) {
    console.error('[subscriber/register] error:', err.message);
    res.status(500).json({ error: 'فشل التسجيل' });
  }
});

app.get('/api/subscriber/:id', requireAdminAuth, (req, res) => {
  const profile = getSubscriberProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'subscriber_not_found' });
  res.json({ ok: true, profile });
});

const { setActive, isActive, readAll: readAgentStatusAll } = require('./services/agentStatus');

function verifyAgentToggleSecret(secret) {
  const a = process.env.BACKEND_SHARED_SECRET || '';
  const b = process.env.RIZQ_API_SECRET || '';
  return secret && (secret === a || secret === b);
}

/** POST /api/agent/toggle — لوحات التحكم (Diamond) — تفعيل/إيقاف الوكيل الهاتفي */
app.post('/api/agent/toggle', (req, res) => {
  const { subscriberPhone, active, secret, accountId } = req.body || {};
  const token = extractAccountToken(req);
  let authorized = verifyAgentToggleSecret(secret);
  if (!authorized && accountId && token) {
    const acc = verifyAccountOwner(String(accountId).slice(0, 60), token);
    if (acc) {
      const want = String(subscriberPhone || '').replace(/\D/g, '').slice(-8);
      const accPh = String(acc.phone || '').replace(/\D/g, '').slice(-8);
      authorized = !!(want && accPh && want === accPh);
    }
  }
  if (!authorized) {
    return res.status(403).json({ ok: false, error: 'unauthorized' });
  }
  if (!subscriberPhone) return res.status(400).json({ ok: false, error: 'subscriberPhone required' });
  const row = setActive(subscriberPhone, active);
  let profile = null;
  try { profile = getSubscriberProfile(subscriberPhone); } catch (e) { /* optional */ }
  res.json({
    ok: true,
    phone: subscriberPhone,
    active: !!active,
    business: profile && profile.businessName ? profile.businessName : null,
    message: active
      ? 'Agent active — configure call forwarding to your Rizq number'
      : 'Agent paused — calls go directly to you',
    updatedAt: row && row.updatedAt,
  });
});

/** GET /api/agent/status/:phone — محمي (لا كشف عام لحالة الوكلاء) */
app.get('/api/agent/status/:phone', requireAdminAuth, (req, res) => {
  const phone = req.params.phone;
  let profile = null;
  try { profile = getSubscriberProfile(phone); } catch (e) { /* optional */ }
  res.json({
    ok: true,
    phone,
    active: isActive(phone),
    business: profile && profile.businessName ? profile.businessName : null,
  });
});

/** GET /api/agent/status — admin/debug */
app.get('/api/agent/status', requireAdminAuth, (req, res) => {
  res.json({ ok: true, status: readAgentStatusAll() });
});

/**
 * POST /api/verify-receipt
 * body: { imageBase64: "data:image/png;base64,...", expectedPrice: 3000, pkgName: "شهرية" }
 * يرجع: { extracted: {date, amount, reference, bankOrOperator}, plausibility: {level, notes[]} }
 *
 * ⚠️ هذا تحليل احتمالي يعتمد على ما يراه النموذج في الصورة فقط — لا يتحقق
 * من قاعدة بيانات بنكية حقيقية ولا "يثبت" أن الدفع تم أو لم يُزوَّر.
 * القرار النهائي يبقى دوماً بشرياً (الأدمين).
 */
app.post('/api/verify-receipt', requireAdminAuth, async (req, res) => {
  try {
    const { imageBase64, expectedPrice, pkgName } = req.body || {};
    const { analyzeReceiptImage } = require('./services/receiptVision');
    const analysis = await analyzeReceiptImage(imageBase64, {
      expectedPrice,
      pkgName,
      anthropic,
    });
    if (!analysis.ok && !analysis.result) {
      return res.status(400).json({ error: analysis.error || 'imageBase64 مطلوب (data URL لصورة)' });
    }
    res.json({ ok: true, result: analysis.result });
  } catch (err) {
    console.error('[verify-receipt] error:', err.message);
    res.status(500).json({ error: 'فشل التحليل — حاول مجدداً لاحقاً' });
  }
});

/**
 * POST /api/translate
 * أدمين فقط (سرّ مشترك) — محرك ترجمة حقيقي (Claude) عربي↔فرنسي لاستبدال
 * القواميس الثابتة الهشة (مثل PKG_TR في rizq_landing_v8.html) التي تتعطل
 * بصمت كلما أُدخل نص جديد لم يُكتب يدوياً في القاموس (هذا تحديداً ما كان
 * يسبب بقاء بعض مزايا الباقات بالعربية بعد التبديل للفرنسية).
 *
 * body: { items: [{ key:"0_feat_2", text:"فيديو 60 ثانية" }, ...], direction: "ar2fr"|"fr2ar" }
 * يرجع: { ok:true, translations: { "0_feat_2": "Vidéo 60 secondes", ... } }
 *
 * يُستخدم من لوحة الأدمن (rizq_admin.html) فقط — عند حفظ/تحميل باقات تنقصها
 * الحقول الفرنسية (_fr) فعلياً، فيُترجمها مرة واحدة وتُخزَّن النتيجة بشكل
 * دائم في الباقة نفسها (localStorage) — لا تُستدعى ثانية لكل زائر، ولا
 * تُستهلك حصة Claude إلا مرة واحدة لكل نص جديد فعلياً.
 *
 * ⚠️ ترجمة آلية بالذكاء الاصطناعي — جيدة جداً لنصوص واجهة قصيرة (أسماء
 * باقات، مزايا، أزرار) لكنها ليست بديلاً عن مراجعة بشرية لنصوص قانونية
 * حساسة (rizq_legal.html تبقى مكتوبة يدوياً بكل لغة).
 */
app.post('/api/translate', requireAdminAuth, async (req, res) => {
  try {
    const { items, direction } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items مطلوبة (مصفوفة غير فارغة)' });
    }
    if (items.length > 80) {
      return res.status(400).json({ error: 'عدد كبير جداً دفعة واحدة (الحد 80)' });
    }
    const dir = direction === 'fr2ar' ? 'fr2ar' : 'ar2fr'; // افتراضي: عربي→فرنسي
    const srcLang = dir === 'ar2fr' ? 'العربية' : 'الفرنسية';
    const dstLang = dir === 'ar2fr' ? 'الفرنسية' : 'العربية';

    const clean = items
      .filter((it) => it && typeof it.key === 'string' && typeof it.text === 'string' && it.text.trim())
      .map((it) => ({ key: it.key.slice(0, 100), text: it.text.slice(0, 500) }));
    if (!clean.length) return res.json({ ok: true, translations: {} });

    const prompt =
      'أنت تترجم نصوص واجهة مستخدم قصيرة (أسماء باقات، مزايا، أزرار) لمنصة إعلانات ' +
      'موريتانية اسمها "رزق"، من ' + srcLang + ' إلى ' + dstLang + '. ' +
      'قواعد صارمة: ' +
      '1) ترجمة طبيعية ومهنية تناسب واجهة تجارية، لا ترجمة حرفية ركيكة. ' +
      '2) احتفظ بالرموز التعبيرية (emoji) والأرقام والعلامات التجارية (MRU, VIP, Boost...) كما هي دون ترجمة. ' +
      '3) لا تضف أي شرح أو نص إضافي. ' +
      '4) أعد JSON فقط بالشكل: {"translations":{"<key>":"<النص المترجم>", ...}} لكل عنصر بنفس المفتاح key المُعطى تماماً. ' +
      'النصوص:\n' + JSON.stringify(clean.map((it) => ({ key: it.key, text: it.text })));

    const msg = await anthropic.messages.create({
      model: getAdvancedModel(),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (msg.content || []).map((c) => c.text || '').join('');
    let parsed;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : raw);
    } catch (e) {
      console.error('[translate] فشل تحليل رد النموذج:', raw.slice(0, 300));
      return res.status(502).json({ error: 'تعذّر تحليل رد محرك الترجمة — حاول مجدداً' });
    }
    const translations = (parsed && typeof parsed.translations === 'object') ? parsed.translations : {};
    res.json({ ok: true, translations });
  } catch (err) {
    console.error('[translate] error:', err.message);
    res.status(500).json({ error: 'فشلت الترجمة — حاول مجدداً لاحقاً' });
  }
});

/**
 * Rate limit مخصص لمحادثة الويدجت — عام بلا مصادقة (كل زوار الموقع)، لذا
 * يحتاج حداً أشد من الحد العام (60/15د) لمنع استنزاف حصة Claude من IP واحد.
 */
const widgetChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الرسائل — حاول مرة أخرى بعد قليل' },
});

const { handleWidgetChat } = require('./services/widgetChat');
const { moderatorAdMiddleware } = require('./services/moderatorServer');
const { readTickets, updateTicketStatus } = require('./services/agentTickets');
const {
  accountHasAiAgent,
  buildProfileFromAccount,
  maybeAutoReplyToInquiry,
} = require('./services/inquiryAutoReply');
const {
  assertDiamondWidgetAccess,
  resolveAccessDenialMessage,
  getAccountEntitlements,
  assertAiAgentAccess,
} = require('./services/packageAccessGuard');
const {
  getEntitlements,
  getTenderEntitlements,
  assertCanPostAd,
  assertCanAddCatalogItem,
  assertPhotoCount,
} = require('./services/entitlements');
const {
  resolveContactGate,
  toPublicAccountGated,
  toPublicAdGated,
  redactContactPatterns,
  notifyContactAttemptFomo,
  normalizeModule,
} = require('./services/contactGate');
const { canAutoApproveAccountType } = require('./config/verificationPolicy');
const { sendOtp, verifyOtp, sendBuyerOtp, verifyBuyerOtp, consumeBuyerVerificationByEmail, getPublicOtpConfig } = require('./services/otpService');
const {
  saveAdImages,
  saveCatalogImages,
  saveCatalogImage,
  saveTenderImages,
} = require('./services/imagePipeline');
const { startMaintenanceScheduler } = require('./services/maintenanceScheduler');
const { readAuditLog } = require('./services/adLifecycle');
const { readLatestBackupMeta } = require('./services/backupService');

/**
 * POST /api/widget/chat � function calling + س�`ا� ا�صفحة + �&راجعة ا�رد
 * body: { message, lang, profile?, history?, pageContext? }
 */
app.post('/api/widget/lead', widgetChatLimiter, async (req, res) => {
  try {
    const { createLeadAndNotify } = require('./services/leadEscalation');
    const body = req.body || {};
    const result = await createLeadAndNotify(body, {
      source: 'widget-api',
      channel: body.channel || 'widget',
      kind: body.kind || 'register_interest',
      lang: body.lang || 'ar',
      pageContext: body.pageContext || null,
      catalogHint: body.catalog_hint || body.catalogHint || null,
      userText: body.user_message || body.message || null,
      notes: body.notes || null,
      history: body.history || null,
    });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('[widget/lead] error:', err.message);
    res.status(500).json({ ok: false, error: err.message || 'lead_save_failed' });
  }
});

app.post('/api/leads', widgetChatLimiter, async (req, res) => {
  try {
    const { createLeadAndNotify } = require('./services/leadEscalation');
    const body = req.body || {};
    const result = await createLeadAndNotify(body, {
      source: 'widget-api',
      channel: body.channel || 'widget',
      kind: body.kind || 'register_interest',
      lang: body.lang || 'ar',
      pageContext: body.pageContext || null,
      catalogHint: body.catalog_hint || body.catalogHint || null,
      userText: body.user_message || body.message || null,
      notes: body.notes || null,
      history: body.history || null,
    });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('[api/leads] error:', err.message);
    res.status(500).json({ ok: false, error: err.message || 'lead_save_failed' });
  }
});

/** GET /api/telegram/status — diagnostic (requires X-Copyright admin secret) */
app.get('/api/telegram/status', requireAdminAuth, async (req, res) => {
  try {
    const {
      getTelegramDiagnostics,
      fetchRecentPrivateChatIds,
      validateAdminChatAtStartup,
    } = require('./services/telegramAdmin');
    const { readPersistedAdminChat } = require('./services/telegramChatStore');
    const diag = getTelegramDiagnostics();
    const persisted = readPersistedAdminChat();
    const discovered = await fetchRecentPrivateChatIds(15);
    const validation = diag.hasToken ? await validateAdminChatAtStartup() : { ok: false, reason: 'no_token' };
    res.json({
      ok: validation.ok,
      diagnostics: diag,
      persistedAdminChat: persisted,
      discoveredChats: discovered,
      validation,
      hint: validation.ok
        ? 'Telegram admin chat is valid.'
        : 'Message @RizqOficial_bot on Telegram and press Start — chat_id auto-saves to .env.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err && err.message });
  }
});

/** POST /api/telegram/test-lead-alert — diagnostic (requires X-Copyright admin secret) */
app.post('/api/telegram/test-lead-alert', requireAdminAuth, async (req, res) => {
  try {
    const { getTelegramDiagnostics, sendLeadEscalationAlert } = require('./services/telegramAdmin');
    const diag = getTelegramDiagnostics();
    if (!diag.configured) {
      return res.status(503).json({
        ok: false,
        error: 'telegram_not_configured',
        diagnostics: diag,
        hint: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID (or TELEGRAM_CHAT_ID) in rizq-backend/.env',
      });
    }
    const result = await sendLeadEscalationAlert({
      businessName: 'Test Rizq',
      whatsapp: '+22200000000',
      package: 'Test package',
      packagePriceLabel: '0 MRU',
      reason: 'Diagnostic ping from /api/telegram/test-lead-alert',
      leadId: 'TEST-' + Date.now(),
    });
    res.json({ ok: true, messageId: result && result.message_id, diagnostics: diag });
  } catch (err) {
    console.error('[telegram/test-lead-alert] FAILED:', err && err.message, {
      telegram: err && err.telegram,
      stack: err && err.stack,
    });
    res.status(500).json({
      ok: false,
      error: err && err.message,
      telegram: err && err.telegram,
    });
  }
});

app.post('/api/widget/chat', widgetChatLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const profileAccountId = String((body.profile && body.profile.accountId) || body.accountId || '').trim();
    if (profileAccountId) {
      const token = req.header('x-account-token') || '';
      const acc = verifyAccountOwner(profileAccountId, token);
      if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
      assertAiAgentAccess(acc, { channel: 'widget' });
    } else if (body.profile && (body.profile.accountId || body.profile.businessName)) {
      assertDiamondWidgetAccess(body, readAccounts);
    }
    const result = await handleWidgetChat(body);
    res.json(result);
  } catch (err) {
    console.error('[widget/chat] error:', err.message);
    const status = err.status && err.status >= 400 ? err.status : 500;
    res.status(status).json({ ok: false, error: err.message || 'تعذّر الرد الآلي', code: err.code || undefined });
  }
});

/** POST /api/ai/chat — alias for Diamond widget agent (same engine as /api/widget/chat) */
app.post('/api/ai/chat', widgetChatLimiter, async (req, res) => {
  try {
    const body = Object.assign({ agentTier: 'diamond' }, req.body || {});
    const profileAccountId = String((body.profile && body.profile.accountId) || body.accountId || '').trim();
    if (profileAccountId) {
      const token = req.header('x-account-token') || '';
      const acc = verifyAccountOwner(profileAccountId, token);
      if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
      assertAiAgentAccess(acc, { channel: 'widget' });
    } else if (body.profile && (body.profile.accountId || body.profile.businessName)) {
      assertDiamondWidgetAccess(body, readAccounts);
    }
    const result = await handleWidgetChat(body);
    res.json(result);
  } catch (err) {
    console.error('[ai/chat] error:', err.message);
    const status = err.status && err.status >= 400 ? err.status : 500;
    res.status(status).json({ ok: false, error: err.message || 'تعذّر الرد الآلي', code: err.code || undefined });
  }
});

/** GET /api/ai/status — هل مفتاح Claude مضبوط على الخادم؟ (بدون كشف المفتاح) */
app.get('/api/ai/status', (req, res) => {
  res.json({
    ok: true,
    configured: isAnthropicConfigured(),
    model: getAgentModel(),
    agentModel: getAgentModel(),
    advancedModel: getAdvancedModel(),
    haikuFallback: false,
  });
});

const subscriberChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الرسائل — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/subscriber/chat — محادثة الوكيل الذكي لمشترك (داشبورد / اختبار)
 * body: { accountId, message, history?, lang?, pageContext? }
 */
app.post('/api/subscriber/chat', subscriberChatLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    const accountId = String(b.accountId || '').trim();
    const message = String(b.message || '').trim();
    if (!accountId || !message) {
      return res.status(400).json({ ok: false, error: 'accountId و message مطلوبان' });
    }
    if (!isAnthropicConfigured()) {
      return res.status(503).json({ ok: false, error: 'AI غير مفعّل — أضف ANTHROPIC_API_KEY أو CLAUDE_API_KEY في .env' });
    }
    const acc = readAccounts().find((a) => a.id === accountId);
    if (!acc) return res.status(404).json({ ok: false, error: 'account_not_found' });
    const token = req.header('x-account-token') || '';
    if (!verifyAccountOwner(accountId, token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    try {
      assertAiAgentAccess(acc, { channel: 'dashboard' });
    } catch (e) {
      const ent = getAccountEntitlements(acc);
      const status = e.status && e.status >= 400 ? e.status : 403;
      return res.status(status).json({ ok: false, error: e.message || resolveAccessDenialMessage(ent), code: e.code || ent.subscriptionStatus });
    }
    const result = await handleWidgetChat({
      message,
      lang: b.lang || 'ar',
      uiLang: b.uiLang || b.lang || 'ar',
      profile: buildProfileFromAccount(acc),
      history: Array.isArray(b.history) ? b.history : [],
      pageContext: b.pageContext || { page: 'dashboard' },
    });
    try {
      await recordUsage({
        subscriberId: acc.phone || acc.whatsapp || accountId,
        accountId,
        businessName: acc.name || '',
        phone: acc.phone || acc.whatsapp || '',
        channel: 'dashboard',
        model: result.model,
        usage: result.usage,
      });
    } catch (qErr) {
      console.warn('[quota-guard] subscriber/chat:', qErr && qErr.message);
    }
    res.json(result);
  } catch (err) {
    console.error('[subscriber/chat] error:', err.message);
    const status = err.status && err.status >= 400 ? err.status : 500;
    res.status(status).json({ ok: false, error: err.message || 'تعذّر الرد' });
  }
});


/**
 * GET /api/site-config
 * عام — تقرأه صفحات الزوار (الفيديو الترويجي: popup + قسم ثابت) لتعرض
 * نفس الإعداد فعلياً لكل زائر، بدل أن يكون محصوراً بمتصفح الأدمن فقط.
 * Cache-Control قصير (60 ثانية): لا يغيّر أي بيانات، فقط يمنع كل زائر من
 * إعادة تحميل نفس الإعداد عند كل تنقل بين الصفحات على شبكة ضعيفة — أي
 * تعديل من الأدمن يظهر للزوار الجدد في أقل من دقيقة كحد أقصى.
 */
app.get('/api/site-config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  const cfg = readJson(SITE_CONFIG_FILE, {});
  cfg.moduleFlags = getModuleFlags(); // �`ض�&�  ظ�!��ر ا���`�& ا�افتراض�`ة حت�0 �ب� أ�` حفظ �&�  ا�أد�&� 
  cfg.sectionRules = getSectionRules(); // � فس ا��&بدأ � ���اعد ْ� �س�& دائ�&ا�9 ظا�!رة ب��`�&�!ا ا�افتراض�`ة
  cfg.otp = getPublicOtpConfig();
  res.json({ ok: true, config: cfg });
});

/**
 * مفاتيح أقسام القانون المسموحة فقط — أي مفتاح آخر يُرفض (لا يُسمح بحقن
 * مفاتيح عشوائية في الملف عبر الـ endpoint).
 */
const LEGAL_KEYS_AR = ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11'];
const LEGAL_KEYS_FR = ['f1','f2','f3','f4','f5','f6','f7','f8','f9','f10','f11'];
const LEGAL_MAX_LEN = 20000; // سخي بما يكفي لقسم قانوني كامل بصياغة HTML بسيطة

/**
 * POST /api/site-config
 * أدمين فقط (سرّ مشترك) — يحفظ إعدادات الفيديو الترويجي العامة + تعديلات
 * نصوص القانون/السياسة (rizq_legal.html) التي يضبطها المالك من لوحة الأدمن
 * بدل انتظار تعديل كود لكل تغيير.
 * body: { promoVideo: {...} }  -- يُستبدَل كاملاً (كما كان سابقاً)
 * body: { legalOverrides: { ar: {s1:"<html>", ...}, fr: {f1:"<html>", ...} } }
 *   -- يُدمَج مفتاحاً بمفتاح (لا يمسح أقساماً أخرى محفوظة سابقاً)
 *   -- قيمة نصية فارغة "" لمفتاح ما = إعادته للنص الافتراضي (حذف الـ override)
 */
app.post('/api/site-config', requireAdminAuth, (req, res) => {
  const body = req.body || {};
  const current = readJson(SITE_CONFIG_FILE, {});
  const next = Object.assign({}, current);

  if (body.promoVideo && typeof body.promoVideo === 'object') {
    // إصلاح: حقول "الموضع المميز" (heroActive/heroUrl/...) كانت موجودة في
    // واجهة الأدمن (rizq_admin.html) وفي landing_v8.html (تقرأها فعلياً)
    // لكن هذا الـ endpoint كان يتجاهلها تماماً عند الحفظ — أي تفعيل لهذا
    // الموضع من الأدمن كان يُفقَد فوراً بلا أي خطأ ظاهر. أضيفت هنا فعلياً.
    next.promoVideo = {
      url: String(body.promoVideo.url || '').slice(0, 500),
      title: String(body.promoVideo.title || '').slice(0, 200),
      subtitle: String(body.promoVideo.subtitle || '').slice(0, 300),
      delay: Math.max(0, Math.min(30, Number(body.promoVideo.delay) || 3)),
      popupActive: !!body.promoVideo.popupActive,
      sectionActive: !!body.promoVideo.sectionActive,
      heroActive: !!body.promoVideo.heroActive,
      heroUrl: String(body.promoVideo.heroUrl || '').slice(0, 500),
      heroViews: String(body.promoVideo.heroViews || '').slice(0, 40),
      heroAdvertiser: String(body.promoVideo.heroAdvertiser || '').slice(0, 120),
      heroAdvertiserLoc: String(body.promoVideo.heroAdvertiserLoc || '').slice(0, 120),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.legalOverrides && typeof body.legalOverrides === 'object') {
    const incoming = body.legalOverrides;
    const existing = (current.legalOverrides && typeof current.legalOverrides === 'object')
      ? current.legalOverrides : {};
    const mergedAr = Object.assign({}, existing.ar || {});
    const mergedFr = Object.assign({}, existing.fr || {});
    let touched = false;

    if (incoming.ar && typeof incoming.ar === 'object') {
      for (const key of LEGAL_KEYS_AR) {
        if (!(key in incoming.ar)) continue;
        const val = String(incoming.ar[key] || '').slice(0, LEGAL_MAX_LEN);
        touched = true;
        if (val === '') delete mergedAr[key]; else mergedAr[key] = val;
      }
    }
    if (incoming.fr && typeof incoming.fr === 'object') {
      for (const key of LEGAL_KEYS_FR) {
        if (!(key in incoming.fr)) continue;
        const val = String(incoming.fr[key] || '').slice(0, LEGAL_MAX_LEN);
        touched = true;
        if (val === '') delete mergedFr[key]; else mergedFr[key] = val;
      }
    }

    if (touched) {
      next.legalOverrides = { ar: mergedAr, fr: mergedFr, updatedAt: new Date().toISOString() };
    }
  }

  if (Array.isArray(body.bankCodes)) {
    // إصلاح جوهري: طرق الدفع (بنك/هاتف/رمز) التي يضبطها الأدمن كانت
    // rizq_bank_codes محلية 100% — لا يراها أي مشترك يفتح داشبورده من
    // جهازه الخاص، فتظهر له "لا توجد طرق دفع متاحة" رغم أنها مُعدَّة فعلياً.
    // نخزّنها هنا كقائمة كاملة (يستبدلها الأدمن دفعة واحدة، تماماً كما كان
    // يفعل محلياً عبر _saveBankCodes) ليقرأها أي جهاز عبر GET /api/site-config.
    const ALLOWED_TYPES = ['bank', 'mobile', 'code'];
    next.bankCodes = body.bankCodes.slice(0, 30).map((b) => ({
      id: String(b.id || ('bc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7))).slice(0, 60),
      type: ALLOWED_TYPES.includes(b.type) ? b.type : 'bank',
      bank: String(b.bank || '').slice(0, 120),
      code: String(b.code || '').slice(0, 120),
      instruction: String(b.instruction || '').slice(0, 300),
      active: b.active !== false,
      added: String(b.added || '').slice(0, 20),
    }));
  }

  if (body.packages && typeof body.packages === 'object') {
    // إصلاح جوهري: كتالوجات الأسعار (rizq_store_packages/office/corp/video/
    // individual/general) كانت محلية 100% — تعديل الأدمن لسعر باقة على جهازه
    // لا يظهر أبداً لمشترك يفتح داشبورده من جهاز آخر. نُدمج مفتاحاً بمفتاح
    // (كما legalOverrides) حتى لا يمحو حفظ فئة واحدة الفئات الأخرى المحفوظة.
    // إصلاح جوهري 28/07/2026: كانت القائمة تفتقد 'tender' (باقة المناقصة،
    // أُضيفت 23-24/07/2026) — أي تعديل سعر لباقة المناقصة من الأدمن لم يكن
    // يُحفَظ إطلاقاً في site-config.json (يُتجاهَل بصمت هنا)، فلا يظهر أبداً
    // لجهاز أدمن آخر يفتح نفس اللوحة، خلافاً لكل الفئات الأخرى المُصلَحة هنا
    // فعلياً. أضيفت 'tender' + 'verified_plus' (فئة "موثّق⁺" الجديدة).
    const PKG_CAT_KEYS = ['general', 'individual', 'office', 'store', 'corp', 'video', 'tender', 'verified_plus'];
    const existingPkgs = (current.packages && typeof current.packages === 'object') ? current.packages : {};
    const mergedPkgs = Object.assign({}, existingPkgs);
    PKG_CAT_KEYS.forEach((key) => {
      if (!Array.isArray(body.packages[key])) return;
      mergedPkgs[key] = body.packages[key].slice(0, 30).map((p) => ({
        id: String(p.id || ('pkg' + Date.now())).slice(0, 60),
        name: String(p.name || '').slice(0, 80),
        price: Number(p.price) || 0,
        period: String(p.period || '').slice(0, 60),
        durationDays: Math.max(1, Math.min(3650, Number(p.durationDays) || 30)),
        maxCatalogItems: p.maxCatalogItems != null ? Number(p.maxCatalogItems) : undefined,
        boostDays: Math.max(0, Math.min(365, Number(p.boostDays) || 0)),
        features: Array.isArray(p.features) ? p.features.slice(0, 20).map((f) => String(f).slice(0, 200)) : [],
        active: p.active !== false,
        diamondTier: String(p.diamondTier || '').slice(0, 30),
        audioAccess: p.audioAccess === true,
        quotaMessages: Math.max(0, Math.min(100000, Number(p.quotaMessages) || 0)),
        quotaMinutes: Math.max(0, Math.min(100000, Number(p.quotaMinutes) || 0)),
        aiModel: String(p.aiModel || '').slice(0, 80),
      }));
    });
    next.packages = mergedPkgs;
  }

  if (body.quotaConfig && typeof body.quotaConfig === 'object') {
    const existingQ = (current.quotaConfig && typeof current.quotaConfig === 'object') ? current.quotaConfig : {};
    next.quotaConfig = {
      diamond_standard: Object.assign({}, existingQ.diamond_standard || {}, body.quotaConfig.diamond_standard || {}),
      diamond_pro: Object.assign({}, existingQ.diamond_pro || {}, body.quotaConfig.diamond_pro || {}),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.quotaTopups && typeof body.quotaTopups === 'object') {
    const existingT = (current.quotaTopups && typeof current.quotaTopups === 'object') ? current.quotaTopups : {};
    next.quotaTopups = {
      text: Object.assign({}, existingT.text || {}, body.quotaTopups.text || {}),
      voice: Object.assign({}, existingT.voice || {}, body.quotaTopups.voice || {}),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.discNav && typeof body.discNav === 'object') {
    // إصلاح جوهري: نص شريط التنبيه القانوني المخصَّص (بديل النص الافتراضي)
    // كان rizq_disc_nav_ar/fr محلياً 100% — لا يظهر لأي زائر على جهاز آخر
    // مهما عدّله الأدمن من جهازه. القيمة الفارغة "" = إعادة للنص الافتراضي.
    next.discNav = {
      ar: String(body.discNav.ar || '').slice(0, 300),
      fr: String(body.discNav.fr || '').slice(0, 300),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.managerConfig && typeof body.managerConfig === 'object') {
    // إصلاح جوهري: إعدادات وكيل رزق الذكي (الاسم/الترحيب/الأسئلة الشائعة/
    // القيود) كانت rizq_manager_config محلية 100% — لا تظهر لزائر على جهاز
    // آخر مهما خصّصها الأدمن (راجع rizq_manager_agent_config.js).
    const mc = body.managerConfig;
    next.managerConfig = {
      name: String(mc.name || '').slice(0, 80),
      name_ar: String(mc.name_ar || '').slice(0, 80),
      email: String(mc.email || '').slice(0, 120),
      greeting_ar: String(mc.greeting_ar || '').slice(0, 1000),
      greeting_fr: String(mc.greeting_fr || '').slice(0, 1000),
      greeting_hs: String(mc.greeting_hs || '').slice(0, 1000),
      block_reply: String(mc.block_reply || '').slice(0, 500),
      blocked_topics: Array.isArray(mc.blocked_topics) ? mc.blocked_topics.slice(0, 50).map((t) => String(t).slice(0, 200)) : [],
      custom_faqs: Array.isArray(mc.custom_faqs) ? mc.custom_faqs.slice(0, 100).map((f) => ({
        keywords: String(f.keywords || '').slice(0, 300),
        answer: String(f.answer || '').slice(0, 1000),
      })) : [],
    };
  }

  if (body.moderatorConfig && typeof body.moderatorConfig === 'object') {
    // إصلاح جوهري: إعدادات "المشرف الآلي" (القواعد المعطَّلة/كلمات محظورة
    // مخصصة/عتبة الثقة/وضع مراجعة الكل) كانت rizq_moderator_overrides محلية
    // 100% ولم يكن محرك الفحص الفعلي (rizq_moderator_agent.js) يقرأها أصلاً
    // حتى على نفس الجهاز. الآن تُقرأ من المحرك وتُزامَن عبر الأجهزة.
    const modc = body.moderatorConfig;
    next.moderatorConfig = {
      disabledRules: Array.isArray(modc.disabledRules) ? modc.disabledRules.slice(0, 30).map((r) => String(r).slice(0, 10)) : [],
      customKeywords: String(modc.customKeywords || '').slice(0, 2000),
      threshold: Math.max(0, Math.min(100, Number(modc.threshold) || 70)),
      reviewMode: modc.reviewMode === true,
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.videoAds && typeof body.videoAds === 'object') {
    // إصلاح جوهري: قائمتا معلني Rizq ADS (Hero + Popup) كانتا rizq_video_ads
    // محلية 100% — أي تعديل يدوي للأدمن (إضافة/حذف/تفعيل معلن) على جهازه لا
    // يظهر أبداً لزائر يفتح المنصة من جهاز آخر لم يشارك فيه localStorage.
    const sanitizeAdList = (list) => (Array.isArray(list) ? list : []).slice(0, 50).map((a) => ({
      advertiser: String(a.advertiser || '').slice(0, 120),
      url: String(a.url || '').slice(0, 500),
      active: a.active !== false,
      accountId: a.accountId ? String(a.accountId).slice(0, 60) : '',
    }));
    next.videoAds = {
      hero: sanitizeAdList(body.videoAds.hero),
      popup: sanitizeAdList(body.videoAds.popup),
    };
  }

  if (body.moduleFlags && typeof body.moduleFlags === 'object') {
    // ── نظام "إطلاق تدريجي" (طلب Limam 03/08/2026): كل قسم من المنصة
    // (أفراد/محلات/مكاتب/شركات/مناقصات/فيديوهات إعلانية) له علم تفعيل مستقل
    // يُخزَّن هنا (لا localStorage — نفس المبدأ المطبَّق على كل الإعدادات في
    // هذا الملف) فيراه كل زائر من أي جهاز فوراً. القيمة الافتراضية عند عدم
    // وجود الملف بعد: individual/store مفعَّلان، الباقي مغلق — راجع
    // DEFAULT_MODULE_FLAGS و getModuleFlags() أدناه. ──
    const MODULE_KEYS = ['individual', 'store', 'office', 'corp', 'tenders', 'videoAds'];
    const existingFlags = Object.assign({}, DEFAULT_MODULE_FLAGS, current.moduleFlags || {});
    MODULE_KEYS.forEach((key) => {
      if (key in body.moduleFlags) existingFlags[key] = body.moduleFlags[key] === true;
    });
    next.moduleFlags = existingFlags;
  }

  if (body.sectionRules && typeof body.sectionRules === 'object') {
    // ── محرك القواعد المشترك (طلب Limam 03/08/2026): بدل وكيل منفصل لكل
    // قسم، وكيل واحد يقرأ "قواعد" مختلفة حسب نوع الحساب. تُدمَج هنا مفتاحاً
    // بمفتاح لكل قسم (لا يمسح قواعد أقسام أخرى محفوظة سابقاً)، بنفس مبدأ
    // moduleFlags أعلاه. راجع DEFAULT_SECTION_RULES/getSectionRules أعلاه. ──
    const SECTION_KEYS = ['individual', 'store', 'office', 'corp', 'tenders', 'videoAds'];
    const existingRules = getSectionRules(); // يبدأ من القيم الحالية (افتراضية+محفوظة) لا من الصفر
    SECTION_KEYS.forEach((key) => {
      if (!(key in body.sectionRules) || typeof body.sectionRules[key] !== 'object') return;
      const incoming = body.sectionRules[key];
      const rule = Object.assign({}, existingRules[key]);
      if (Array.isArray(incoming.extraBannedKeywords)) {
        rule.extraBannedKeywords = incoming.extraBannedKeywords
          .map((k) => String(k || '').trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 50);
      }
      if (typeof incoming.escalateAlways === 'boolean') rule.escalateAlways = incoming.escalateAlways;
      if (typeof incoming.requiredDocsNote === 'string') rule.requiredDocsNote = incoming.requiredDocsNote.slice(0, 500);
      existingRules[key] = rule;
    });
    next.sectionRules = existingRules;
  }

  if (body.prices && typeof body.prices === 'object') {
    const sanitizePriceList = (list) => (Array.isArray(list) ? list : []).slice(0, 40).map((it) => ({
      icon: String(it.icon || '').slice(0, 8),
      name: String(it.name || '').slice(0, 80),
      price: Number(it.price) || 0,
      unit: String(it.unit || '').slice(0, 40),
      trend: ['up', 'down', 'flat'].includes(it.trend) ? it.trend : 'flat',
    }));
    next.prices = {
      food: sanitizePriceList(body.prices.food),
      fuel: sanitizePriceList(body.prices.fuel),
      currencies: sanitizeCurrencyList(body.prices.currencies),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.site && typeof body.site === 'object') {
    const s = body.site;
    next.site = {
      sitename: String(s.sitename || '').slice(0, 80),
      tagline: String(s.tagline || '').slice(0, 200),
      phone: String(s.phone || '').slice(0, 40),
      whatsapp: String(s.whatsapp || '').slice(0, 40),
      email: String(s.email || '').slice(0, 120),
      reportEmail: String(s.reportEmail || '').slice(0, 120),
      address: String(s.address || '').slice(0, 200),
      adsCount: Math.max(0, Number(s.adsCount) || 0),
      usersCount: Math.max(0, Number(s.usersCount) || 0),
      wilayasCount: Math.max(0, Number(s.wilayasCount) || 0),
      bannerActive: !!s.bannerActive,
      bannerText: String(s.bannerText || '').slice(0, 300),
      updatedAt: new Date().toISOString(),
    };
  }

  if (body.platformFlags && typeof body.platformFlags === 'object') {
    const f = body.platformFlags;
    const existing = Object.assign({}, DEFAULT_PLATFORM_FLAGS, current.platformFlags || {});
    ['platformOpen', 'registrationOpen', 'adsOpen', 'moderationRequired', 'otpRequired', 'vpnBlock'].forEach((k) => {
      if (k in f) existing[k] = f[k] === true;
    });
    if (f.sessionTimeoutMin != null) {
      existing.sessionTimeoutMin = Math.max(5, Math.min(1440, Number(f.sessionTimeoutMin) || 60));
    }
    existing.updatedAt = new Date().toISOString();
    next.platformFlags = existing;
  }

  if (Array.isArray(body.extraCategories)) {
    next.extraCategories = body.extraCategories.slice(0, 20).map((c) => ({
      icon: String(c.icon || '').slice(0, 8),
      name: String(c.name || '').slice(0, 80),
      name_fr: String(c.name_fr || '').slice(0, 80),
      count: String(c.count || '').slice(0, 40),
      count_fr: String(c.count_fr || '').slice(0, 40),
      subs: Array.isArray(c.subs) ? c.subs.slice(0, 30).map((x) => String(x).slice(0, 80)) : [],
      subs_fr: Array.isArray(c.subs_fr) ? c.subs_fr.slice(0, 30).map((x) => String(x).slice(0, 80)) : [],
    }));
  }

  if (body.channelsPublic && typeof body.channelsPublic === 'object') {
    const c = body.channelsPublic;
    next.channelsPublic = {
      phoneNumber: String(c.phoneNumber || '').slice(0, 40),
      webhookUrl: String(c.webhookUrl || '').slice(0, 300),
      callGreeting: String(c.callGreeting || '').slice(0, 2000),
      ivr1: String(c.ivr1 || '').slice(0, 500),
      ivr2: String(c.ivr2 || '').slice(0, 500),
      ivr3: String(c.ivr3 || '').slice(0, 500),
      callClosing: String(c.callClosing || '').slice(0, 500),
      emailFrom: String(c.emailFrom || '').slice(0, 120),
      emailSubjInquiry: String(c.emailSubjInquiry || '').slice(0, 200),
      emailBodyInquiry: String(c.emailBodyInquiry || '').slice(0, 2000),
      emailBodySupport: String(c.emailBodySupport || '').slice(0, 2000),
      emailBodyPartner: String(c.emailBodyPartner || '').slice(0, 2000),
      updatedAt: new Date().toISOString(),
    };
  }

  writeJson(SITE_CONFIG_FILE, next);
  res.json({ ok: true, config: next });
});

/**
 * POST /api/currency-rates/refresh
 * أدمين — جلب أسعار العملات من الإنترنت (Frankfurter + fallback) مع تصحيح السوق %
 */
app.post('/api/currency-rates/refresh', requireAdminAuth, async (req, res) => {
  try {
    const current = readJson(SITE_CONFIG_FILE, {});
    const existing = (current.prices && current.prices.currencies) || [];
    const result = await refreshCurrencyRates(existing, { onlyEnabled: true });
    const next = Object.assign({}, current);
    next.prices = Object.assign({}, current.prices || {}, {
      food: (current.prices && current.prices.food) || [],
      fuel: (current.prices && current.prices.fuel) || [],
      currencies: result.currencies,
      currenciesUpdatedAt: result.updatedAt,
      updatedAt: new Date().toISOString(),
    });
    writeJson(SITE_CONFIG_FILE, next);
    res.json({ ok: true, currencies: result.currencies, errors: result.errors, updatedAt: result.updatedAt, config: next });
  } catch (err) {
    console.error('[currency-rates] refresh failed:', err.message);
    res.status(500).json({ ok: false, error: err.message || 'تعذّر تحديث أسعار العملات' });
  }
});

const CURRENCY_AUTO_REFRESH_MS = 12 * 60 * 60 * 1000;
let _currencyRefreshRunning = false;
async function autoRefreshCurrencyRatesIfStale() {
  if (_currencyRefreshRunning) return;
  _currencyRefreshRunning = true;
  try {
    const current = readJson(SITE_CONFIG_FILE, {});
    const prices = current.prices || {};
    const last = prices.currenciesUpdatedAt || prices.updatedAt;
    const stale = !last || (Date.now() - new Date(last).getTime() > CURRENCY_AUTO_REFRESH_MS);
    if (!stale && Array.isArray(prices.currencies) && prices.currencies.length) return;
    const merged = mergeCurrencyConfig(prices.currencies);
    const result = await refreshCurrencyRates(merged, { onlyEnabled: true });
    const next = Object.assign({}, current);
    next.prices = Object.assign({}, prices, {
      currencies: result.currencies,
      currenciesUpdatedAt: result.updatedAt,
      updatedAt: new Date().toISOString(),
    });
    writeJson(SITE_CONFIG_FILE, next);
    if (result.errors && result.errors.length) {
      console.warn('[currency-rates] partial refresh:', result.errors.map((e) => e.code).join(', '));
    } else {
      console.log('[currency-rates] auto-refreshed', result.currencies.length, 'currencies');
    }
  } catch (err) {
    console.warn('[currency-rates] auto-refresh skipped:', err.message);
  } finally {
    _currencyRefreshRunning = false;
  }
}

/**
 * POST /api/ads/submit
 * عام — صاحب معرض/محل يرسل طلب نشر فيديو إعلاني عبر Rizq ADS.
 * ⚠️ لا يُرفع ملف الفيديو نفسه هنا (لا توجد بنية تخزين فيديو حقيقية بعد —
 * تحتاج CDN/S3 حسب خطة rizq_backend_plan.html) — فقط بيانات الطلب +
 * معلومات تواصل، ليتواصل فريق رزق فعلياً ويستلم الفيديو وينشره يدوياً.
 * لا وعد بنشر تلقائي فوري لأنه غير موجود فعلاً.
 */
app.post('/api/ads/submit', adsSubmitLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.phone) return res.status(400).json({ error: 'العنوان ورقم التواصل مطلوبان' });
  const requests = readJson(ADS_REQUESTS_FILE, []);
  const id = 'ADREQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  requests.push({
    id,
    title: String(b.title).slice(0, 120),
    category: String(b.category || '').slice(0, 80),
    phone: String(b.phone).slice(0, 20),
    pkg: String(b.pkg || 'basic').slice(0, 20),
    hasVideoFile: !!b.hasVideoFile,
    videoFileName: String(b.videoFileName || '').slice(0, 200),
    status: 'pending_contact',
    createdAt: new Date().toISOString(),
  });
  writeJson(ADS_REQUESTS_FILE, requests);
  res.json({ ok: true, id });
});

/**
 * GET /api/ads/requests
 * أدمين فقط (سرّ مشترك) — لائحة طلبات نشر فيديو الإعلانات الواردة فعلياً،
 * حتى يكون وعد "سيتواصل معك رزق" قابلاً للتنفيذ حقاً.
 */
app.get('/api/ads/requests', requireAdminAuth, (req, res) => {
  res.json({ ok: true, requests: readJson(ADS_REQUESTS_FILE, []).reverse() });
});

// ══════════════════════════════════════════════════════════════════
// حسابات المشتركين (محل/مكتب/شركة/فرد) — تسجيل + موافقة الأدمن
// ══════════════════════════════════════════════════════════════════
// إصلاح جوهري: كانت rizq_pending_accounts (بيانات التسجيل + حالة الموافقة)
// مخزَّنة بالكامل في localStorage فقط — أي تاجر يسجّل من جهازه، وبيانات
// تسجيله لا تصل أبداً لجهاز الأدمن، والعكس صحيح لموافقة الأدمن. عملية
// "التسجيل ← المراجعة ← الموافقة" — نقطة الدخول لكل حساب تجاري على
// المنصة — لم تكن تعمل فعلياً بين جهازين مختلفين. هذا القسم يبني نقطة
// حقيقية مشتركة على القرص (accounts.json) بنفس نمط site-config/ads.
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

const ACCOUNT_PAYMENT_TYPES = ['bank', 'bankily', 'sedad', 'bimbam', 'mobile', 'cash', 'instore', 'custom'];
function normalizeAccountPaymentMethods(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 10).map((m) => ({
    type: ACCOUNT_PAYMENT_TYPES.includes(m && m.type) ? m.type : 'bank',
    bank: String((m && m.bank) || '').slice(0, 120),
    code: String((m && m.code) || '').slice(0, 120),
    note: String((m && m.note) || '').slice(0, 300),
    addedAt: String((m && m.addedAt) || new Date().toISOString()).slice(0, 30),
  })).filter((m) => m.bank || m.type === 'cash' || m.type === 'instore');
}

function readAccounts() { return readJson(ACCOUNTS_FILE, []); }
function writeAccounts(list) { writeJson(ACCOUNTS_FILE, list); }

/**
 * بعد التوثيق: تُحذف صورة الهوية فقط (idImage/id_image).
 * وثائق النشاط (licenseImage, activityImage2) تُحفظ — لا تُمسّ أبداً هنا.
 * يُحتفظ برقم NNI + id_verified لمكافحة تعدد الحسابات.
 */
function purgeAccountIdDocument(acc) {
  if (!acc || typeof acc !== 'object') return acc;
  delete acc.idImage;
  delete acc.id_image;
  acc.id_verified = true;
  acc.id_verified_at = new Date().toISOString();
  // licenseImage / activityImage2 — محفوظة عمداً (إثبات نشاط دائم)
  return acc;
}

/** رقم وطني: أرقام فقط، 6–15 خانة — يُحتفَظ به كمؤشر أمان فريد حتى بعد حذف الصورة. */
const NNI_RE = /^\d{6,15}$/;
function normalizeNni(raw) {
  return String(raw || '').replace(/\D+/g, '').slice(0, 20);
}
function findAccountByNni(list, nni, excludeId) {
  if (!nni) return null;
  return list.find((a) => normalizeNni(a.nni) === nni && a.id !== excludeId) || null;
}
function nniDuplicatePayload() {
  return {
    ok: false,
    code: 'nni_duplicate',
    error: 'رقم الهوية (NNI) مستخدم بالفعل لحساب آخر',
    error_fr: "Ce numéro d'identité (NNI) est déjà associé à un autre compte",
  };
}
function assertNniAssignable(list, rawNni, excludeId, acc) {
  const nni = normalizeNni(rawNni);
  if (!nni) {
    if (acc && normalizeNni(acc.nni)) {
      return { ok: false, status: 403, body: { ok: false, code: 'nni_locked', error: 'لا يمكن حذف رقم الهوية بعد تسجيله', error_fr: "Le numéro d'identité ne peut pas être effacé une fois enregistré" } };
    }
    return { ok: true, nni: '' };
  }
  if (!NNI_RE.test(nni)) {
    return { ok: false, status: 400, body: { ok: false, code: 'nni_invalid', error: 'رقم الهوية (NNI) غير صالح', error_fr: "Numéro d'identité (NNI) invalide" } };
  }
  if (acc && acc.id_verified && normalizeNni(acc.nni) && normalizeNni(acc.nni) !== nni) {
    return { ok: false, status: 403, body: { ok: false, code: 'nni_locked', error: 'لا يمكن تغيير رقم الهوية بعد التوثيق', error_fr: "Le numéro d'identité ne peut pas être modifié après vérification" } };
  }
  if (findAccountByNni(list, nni, excludeId)) {
    return { ok: false, status: 409, body: nniDuplicatePayload() };
  }
  return { ok: true, nni };
}

function resolveOptionalAccountViewer(req) {
  const accountId = req.header('x-account-id') || '';
  const token = req.header('x-account-token') || '';
  if (!accountId || !token) return null;
  const acc = readAccounts().find((a) => a.id === accountId);
  return (acc && acc.accessToken === token && !acc.suspended) ? accountId : null;
}

function genAccountId() {
  return 'acc_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}
function genAccessToken() {
  return crypto.randomBytes(20).toString('hex');
}

// الحقول الآمنة للعرض العام — بدون phone/email/whatsapp (Contact Gate يتحكم)
const ACCOUNT_PUBLIC_FIELDS = [
  'id', 'type', 'name', 'city', 'address', 'desc', 'promo_video', 'category',
  'facebook', 'thumb', 'tagline', 'status', 'approvedAt', 'createdAt',
];
function toPublicAccount(acc) {
  const viewerId = null;
  const gate = resolveContactGate(viewerId, acc && acc.id, acc && acc.type);
  return toPublicAccountGated(acc, gate);
}
function toPublicAccountForViewer(acc, viewerAccountId) {
  const gate = resolveContactGate(viewerAccountId, acc && acc.id, acc && acc.type);
  return toPublicAccountGated(acc, gate);
}
// نفس السجل بدون accessToken فقط (للأدمن أو لصاحب الحساب نفسه — كل الحقول
// عدا سرّ الوصول)
function stripToken(acc) {
  const { accessToken, ...safe } = acc;
  if (safe.id_verified) {
    delete safe.idImage;
    delete safe.id_image;
  }
  return safe;
}

const accountsRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من محاولات التسجيل — حاول مرة أخرى بعد قليل' },
});

/**
 * GET /api/accounts/nni-available?nni= — عام، بلا سرّ —
 * تحقق مبكر من فراغ رقم الهوية أثناء التسجيل/التوثيق. لا يُفصح عن صاحب الرقم.
 */
app.get('/api/accounts/nni-available', accountsRegisterLimiter, (req, res) => {
  const nniCheck = assertNniAssignable(readAccounts(), req.query.nni, null, null);
  if (!nniCheck.ok) {
    return res.status(nniCheck.status).json(Object.assign({ available: false }, nniCheck.body));
  }
  if (!nniCheck.nni) {
    return res.status(400).json({ ok: false, available: false, code: 'nni_invalid', error: 'رقم الهوية (NNI) غير صالح', error_fr: "Numéro d'identité (NNI) invalide" });
  }
  res.json({ ok: true, available: true });
});

/**
 * POST /api/accounts — عام (لا سرّ) — تسجيل حساب تجاري جديد (محل/مكتب/
 * شركة/فرد). يُعيد {id, accessToken} — الجهاز المسجِّل يحفظهما محلياً
 * ليتحقق لاحقاً من حالة الموافقة عبر GET /api/accounts/mine/:id.
 */
app.post('/api/accounts', accountsRegisterLimiter, (req, res) => {
  const b = req.body || {};
  const pFlags = getPlatformFlags();
  if (pFlags.platformOpen === false) return res.status(503).json({ error: 'المنصة مغلقة للصيانة حالياً' });
  if (pFlags.registrationOpen === false) return res.status(403).json({ error: 'التسجيل مغلق حالياً' });
  if (!b.name || !b.type) return res.status(400).json({ error: 'name و type مطلوبان' });
  // ── بوابة "الإطلاق التدريجي" — رفض تسجيل أي نوع حساب قسمه مغلق حالياً
  // (moduleFlags)، حتى لو تجاوز طالب التسجيل واجهة الموقع وأرسل الطلب
  // مباشرة لهذا الـ endpoint. الإخفاء في الواجهة وحده غير كافٍ أمنياً. ──
  const reqType = String(b.type || '').toLowerCase();
  const flags = getModuleFlags();
  if (Object.prototype.hasOwnProperty.call(flags, reqType) && !flags[reqType]) {
    return res.status(403).json({ error: 'هذا القسم غير مفتوح للتسجيل حالياً' });
  }

  let activityFields = { ok: true, activityId: null, activity: null, category: String(b.category || '').slice(0, 40) };
  if (['store', 'office', 'corp'].includes(reqType)) {
    activityFields = normalizeAccountActivityFields(b, reqType);
    if (!activityFields.ok) {
      return res.status(400).json({ ok: false, error: activityFields.error, code: activityFields.code });
    }
  }

  const list = readAccounts();
  // نقبل معرّفاً يُرسله العميل (نفس ACC_<timestamp> المُولَّد محلياً في
  // rizq_landing_v8.html) حتى يبقى معرّف الحساب موحّداً بين localStorage
  // والخادم — بدون هذا، لا يمكن لداشبورد الأدمن مطابقة الحساب المسجَّل محلياً
  // مع نسخته على الخادم عند المزامنة. نتحقق من الصيغة لمنع أي قيمة غريبة.
  const clientId = typeof b.id === 'string' && /^ACC_\d{10,20}$/.test(b.id) ? b.id : null;
  const id = clientId && !list.some((a) => a.id === clientId) ? clientId : genAccountId();
  const nniCheck = assertNniAssignable(list, b.nni, id, null);
  if (!nniCheck.ok) return res.status(nniCheck.status).json(nniCheck.body);
  const nni = nniCheck.nni;
  const accessToken = genAccessToken();
  const sellerEmail = String(b.email || '').trim().toLowerCase();
  let autoApproved = false;
  if (canAutoApproveAccountType(reqType) && sellerEmail) {
    const ver = consumeBuyerVerificationByEmail(sellerEmail);
    if (ver.ok) autoApproved = true;
  }
  const dashToken = autoApproved
    ? (String(b.dashToken || '').slice(0, 100) || ('TK_' + crypto.randomBytes(6).toString('hex').toUpperCase()))
    : null;
  const acc = {
    id,
    accessToken,
    type: String(b.type).slice(0, 30),
    name: String(b.name).slice(0, 120),
    phone: String(b.phone || '').slice(0, 30),
    phoneIntl: String(b.phoneIntl || b.phone_intl || '').slice(0, 30),
    email: String(b.email || '').slice(0, 120),
    city: String(b.city || '').slice(0, 60),
    category: activityFields.category || String(b.category || '').slice(0, 40),
    activityId: activityFields.activityId || String(b.activityId || '').slice(0, 80) || null,
    activity: activityFields.activity || String(b.activity || '').slice(0, 120) || null,
    packageId: String(b.packageId || b.package_id || '').slice(0, 40) || null,
    address: String(b.address || '').slice(0, 200),
    desc: String(b.desc || '').slice(0, 1000),
    promo_video: String(b.promo_video || '').slice(0, 500),
    whatsapp: String(b.whatsapp || '').slice(0, 60),
    facebook: String(b.facebook || '').slice(0, 300),
    thumb: String(b.thumb || '').slice(0, 2_000_000), // صورة base64 مصغّرة
    tagline: String(b.tagline || '').slice(0, 50),
    // إصلاح 13/08/2026: حقلا التوثيق (NNI + صورة بطاقة التعريف/جواز السفر)
    // كانا يُجمَعان في واجهة التسجيل (rizq_landing_v8.html) لكن لا يصلان
    // الخادم إطلاقاً — يبقيان في localStorage متصفح المسجِّل فقط، فتصبح
    // شارة "موثّق" غير قابلة للتحقق من أي جهاز آخر (بما فيها لوحة الأدمن
    // نفسها إن فُتحت من متصفح مختلف). الآن يصلان الخادم فعلياً ويُخزَّنان
    // هنا — idImage لا يظهر أبداً في ACCOUNT_PUBLIC_FIELDS (خاص بصاحب
    // الحساب + الأدمن فقط، مثل الهاتف/الإيميل تماماً).
    nni,
    // الحد 8 ملايين حرف (~5.8MB ثنائي بعد فك base64) لأن واجهة الرفع تعرض
    // "حجم أقصى 5MB" فعلياً — حد thumb (2M) أضيق بكثير وكان سيقصّ صورة
    // هوية حقيقية بحجمها الطبيعي فتفسدها (base64 يُضخّم الحجم ~37%).
    idImage: String(b.idImage || '').slice(0, 8_000_000),
    // وثيقة ثانوية (رخصة نشاط/سجل تجاري/ختم) — كانت تُجمَع في واجهة تسجيل
    // المكتب/الشركة (ofFile1/crFile2) وتُفقَد بالكامل، لا تُحفظ حتى محلياً.
    licenseImage: String(b.licenseImage || '').slice(0, 8_000_000),
    activityImage2: String(b.activityImage2 || b.activity_image2 || '').slice(0, 8_000_000),
    // برنامج الإحالة (جيب صاحبك واربح) — معرّف الحساب المُحيل (نفس صيغة id
    // القياسية ACC_<timestamp>) إن جاء الزائر عبر رابط ?ref=ACC_xxx. نتحقق
    // من الصيغة لمنع أي قيمة عشوائية، ونمنع أن يُحيل الحساب نفسه (لن يحدث
    // عملياً لأن id الجديد لم يُولَّد بعد، لكن حماية إضافية لا تضر).
    referredBy: (typeof b.referredBy === 'string' && /^ACC_\d{10,20}$/.test(b.referredBy) && b.referredBy !== clientId) ? b.referredBy : '',
    referralBonusGranted: false,
    // شارة "موثّق⁺" — تصحيح صريح من Limam (تمييز واضح عن verified/premium
    // أعلاه): تحقق هوية مُعزَّز مدفوع (وثائق إضافية + مراجعة يدوية من رزق)
    // يمنح شعار رزق الرسمي على الشارة بدل علامة الصح العادية. مستقل تماماً
    // عن الباقة العامة للحساب وعن vip_badge — يُفعَّل فقط عبر موافقة الأدمن
    // على طلب من فئة sub_requests.category==='verified_plus' (انظر
    // activateVerifiedPlusForRequest في rizq_admin.html) أو منحاً يدوياً.
    verifiedPlus: false,
    verifiedPlusExpiresAt: null,
    status: autoApproved ? 'approved' : 'pending',
    approvedAt: autoApproved ? new Date().toISOString() : null,
    dashToken: dashToken || undefined,
    autoVerified: autoApproved || false,
    createdAt: new Date().toISOString(),
  };
  list.push(acc);
  writeAccounts(list);
  if (autoApproved && canAutoApproveAccountType(reqType) && acc.idImage) {
    const idx = list.length - 1;
    purgeAccountIdDocument(list[idx]);
    writeAccounts(list);
  }
  res.json({ ok: true, id, accessToken, autoApproved: !!autoApproved });

  // إشعار الأدمن تلقائياً عند تسجيل حساب جديد (لا يُبطئ رد العميل)
  setImmediate(() => {
    try {
      const { sendTelegramAdminNotification } = require('./services/telegramAdmin');
      sendTelegramAdminNotification({
        businessName: acc.name,
        whatsapp: acc.phone || acc.whatsapp || '',
        package: acc.type,
        reason: autoApproved ? 'تسجيل حساب جديد — مُفعَّل تلقائياً' : 'تسجيل حساب جديد — بانتظار الموافقة',
        channel: 'registration',
      }).catch((err) => console.warn('[accounts/register] telegram:', err && err.message));
    } catch (e) { /* telegram optional */ }
  });
});

/**
 * GET /api/merchant-activities — قائمة الأنشطة التجارية حسب نوع الحساب/الباقة
 * (مصدر واحد قابل للتوسيع — للواجهات التي تفضّل الجلب الديناميكي بدل ملف JS).
 */
app.get('/api/merchant-activities', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  const cat = loadCatalog();
  const accountType = String(req.query.accountType || req.query.type || '').toLowerCase();
  const packageId = req.query.packageId || req.query.package || null;
  const lang = String(req.query.lang || 'ar').toLowerCase() === 'fr' ? 'fr' : 'ar';
  if (!accountType) {
    return res.json({
      ok: true,
      activities: (cat.ACTIVITIES || []).map((a) => ({
        id: a.id,
        name: lang === 'fr' ? (a.nameFr || a.nameAr) : (a.nameAr || a.nameFr),
        sectorId: a.sectorId,
        accountTypes: a.accountTypes,
      })),
      directoryCategories: typeof cat.listDirectoryFilterCategories === 'function'
        ? cat.listDirectoryFilterCategories()
        : [],
    });
  }
  const activities = typeof cat.listForPackage === 'function'
    ? cat.listForPackage(accountType, packageId, lang)
    : [];
  const sectors = typeof cat.getSectors === 'function' ? cat.getSectors(accountType, lang) : [];
  return res.json({ ok: true, accountType, packageId, activities, sectors });
});

/**
 * GET /api/accounts/public — عام، بلا سرّ — الحسابات الموافَق عليها فقط،
 * بحقول آمنة فقط. تستخدمه صفحات المحل/المكتب/الشركة العامة + شريط "آخر
 * المحلات/المكاتب/المعارض" بالرئيسية بدل قراءة localStorage المحلي.
 */
app.get('/api/accounts/public', (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  const viewerId = resolveOptionalAccountViewer(req);
  const list = readAccounts().filter((a) => a.status === 'approved' && !a.suspended && !String(a.id || '').startsWith('acc_demo'));
  res.json({
    ok: true,
    accounts: list.map((acc) => toPublicAccountForViewer(acc, viewerId)),
    viewerId: viewerId || null,
  });
});

/**
 * GET /api/accounts/mine/:id — يتطلب x-account-token مطابقاً — يقرأ
 * صاحب الحساب حالة طلبه (pending/approved/rejected) + كل بياناته لملء
 * لوحة تحكمه، من أي جهاز يملك فيه هذا التوكن (وليس فقط الجهاز الذي سجّل منه).
 */
app.get('/api/accounts/mine/:id', (req, res) => {
  const list = readAccounts();
  const acc = list.find((a) => a.id === req.params.id);
  if (!acc) return res.status(404).json({ error: 'account_not_found' });
  const token = extractAccountToken(req);
  if (!token || token !== acc.accessToken) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: true, account: stripToken(acc) });
});

/**
 * GET /api/accounts/mine/:id/referrals — يتطلب x-account-token مطابقاً —
 * عدد الأصدقاء الذين سجّلوا عبر رابط إحالة هذا الحساب وأصبحوا مشتركين
 * مدفوعين فعلاً (referralBonusGranted=true فقط — التسجيل وحده لا يُحتسب)،
 * + إجمالي أيام المكافأة المكتسبة. يغذّي بطاقة "برنامج الإحالة" بالداشبورد.
 */
app.get('/api/accounts/mine/:id/referrals', (req, res) => {
  const list = readAccounts();
  const acc = list.find((a) => a.id === req.params.id);
  if (!acc) return res.status(404).json({ error: 'account_not_found' });
  const token = extractAccountToken(req);
  if (!token || token !== acc.accessToken) return res.status(401).json({ error: 'unauthorized' });
  const count = list.filter((a) => a.referredBy === req.params.id && a.referralBonusGranted).length;
  res.json({ ok: true, count, bonusDaysPerReferral: REFERRAL_BONUS_DAYS, bonusDaysTotal: count * REFERRAL_BONUS_DAYS });
});

/**
 * PATCH /api/accounts/mine/:id — يتطلب x-account-token — صاحب الحساب
 * يحدّث ملفه الشخصي (الوصف، الفيديو، الصورة، رقم واتساب...) من أي جهاز.
 * لا يمكن تعديل status/accessToken/id عبر هذا المسار أبداً.
 */
app.patch('/api/accounts/mine/:id', (req, res) => {
  const list = readAccounts();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'account_not_found' });
  const acc = list[idx];
  const token = extractAccountToken(req);
  if (!token || token !== acc.accessToken) return res.status(401).json({ error: 'unauthorized' });
  // حساب مُعلَّق من الأدمن (suspended) لا يستطيع تعديل ملفه الشخصي أيضاً —
  // نفس منطق verifyAccountOwner (راجع تعريفها أعلاه).
  if (acc.suspended) return res.status(403).json({ error: 'account_suspended' });

  const EDITABLE = ['name', 'phone', 'email', 'city', 'category', 'activity', 'activityId', 'address', 'desc', 'promo_video', 'whatsapp', 'facebook', 'thumb', 'tagline', 'nni', 'idImage', 'licenseImage'];
  const b = req.body || {};
  if (b.nni !== undefined) {
    const nniCheck = assertNniAssignable(list, b.nni, acc.id, acc);
    if (!nniCheck.ok) return res.status(nniCheck.status).json(nniCheck.body);
    b.nni = nniCheck.nni;
  }
  if (b.activityId !== undefined || b.activity !== undefined) {
    const normalized = normalizeAccountActivityFields(Object.assign({}, acc, b), acc.type);
    if (!normalized.ok) {
      return res.status(400).json({ ok: false, error: normalized.error, code: normalized.code });
    }
    acc.activityId = normalized.activityId;
    acc.activity = normalized.activity;
    acc.category = normalized.category;
  }
  EDITABLE.forEach((k) => {
    if (b[k] === undefined) return;
    if (k === 'activityId' || k === 'activity') return;
    if (k === 'idImage' && acc.id_verified) return;
    acc[k] = String(b[k]).slice(0, k === 'thumb' ? 2_000_000 : (k === 'idImage' || k === 'licenseImage') ? 8_000_000 : k === 'desc' ? 1000 : k === 'tagline' ? 50 : k === 'nni' ? 20 : k === 'category' ? 40 : 500);
  });
  // hidePhone: تفضيل منطقي (boolean) لا نصّي — خارج حلقة EDITABLE أعلاه
  // حتى لا يتحوَّل إلى نص "true"/"false". لا علاقة له حالياً بأي عرض عام
  // فعلي: ACCOUNT_PUBLIC_FIELDS أصلاً لا يُخرج phone لغير صاحب الحساب أو
  // الأدمن بتاتاً (قرار خصوصية سابق) — هذا الحقل يُخزَّن فقط ليُستخدم
  // لاحقاً (مثلاً في نظام الرسائل) بدل أن يُفقَد كما كان الحال سابقاً.
  if (b.hidePhone !== undefined) acc.hidePhone = !!b.hidePhone;
  if (b.widget_enabled !== undefined) acc.widget_enabled = !!b.widget_enabled;
  if (b.whatsapp_enabled !== undefined) acc.whatsapp_enabled = !!b.whatsapp_enabled;
  if (b.calls_enabled !== undefined) acc.calls_enabled = !!b.calls_enabled;
  if (b.paymentMethods !== undefined) acc.paymentMethods = normalizeAccountPaymentMethods(b.paymentMethods);
  acc.updatedAt = new Date().toISOString();
  list[idx] = acc;
  writeAccounts(list);
  res.json({ ok: true, account: stripToken(acc) });
});

/**
 * GET /api/accounts/admin — أدمين فقط (سرّ مشترك) — كل الحسابات بكل
 * حقولها (عدا accessToken) لطابور المراجعة في rizq_admin.html.
 */
app.get('/api/accounts/admin', requireAdminAuth, (req, res) => {
  res.json({ ok: true, accounts: readAccounts().map(stripToken).reverse() });
});

/**
 * PATCH /api/accounts/admin/:id — تعديل حساب من الأدمن مباشرة (سرّ مشترك)،
 * نفس الحقول القابلة للتعديل في PATCH /api/accounts/mine/:id لكن بصلاحية
 * الأدمن بدل توكن صاحب الحساب — يغذّي زر "تعديل" في لوحة "المستخدمون"
 * بـrizq_admin.html، الذي كان يعدّل بيانات وهمية محلية فقط سابقاً.
 */
app.patch('/api/accounts/admin/:id', requireAdminAuth, (req, res) => {
  const list = readAccounts();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'account_not_found' });
  const acc = list[idx];
  const EDITABLE = ['name', 'phone', 'email', 'city', 'category', 'activity', 'activityId', 'address', 'desc', 'promo_video', 'whatsapp', 'facebook', 'thumb', 'tagline', 'nni', 'idImage', 'licenseImage'];
  const b = req.body || {};
  if (b.nni !== undefined) {
    const nniCheck = assertNniAssignable(list, b.nni, acc.id, acc);
    if (!nniCheck.ok) return res.status(nniCheck.status).json(nniCheck.body);
    b.nni = nniCheck.nni;
  }
  if (b.activityId !== undefined || b.activity !== undefined) {
    const normalized = normalizeAccountActivityFields(Object.assign({}, acc, b), acc.type);
    if (!normalized.ok) {
      return res.status(400).json({ ok: false, error: normalized.error, code: normalized.code });
    }
    acc.activityId = normalized.activityId;
    acc.activity = normalized.activity;
    acc.category = normalized.category;
  }
  EDITABLE.forEach((k) => {
    if (b[k] === undefined) return;
    if (k === 'activityId' || k === 'activity') return;
    if (k === 'idImage' && acc.id_verified) return;
    acc[k] = String(b[k]).slice(0, k === 'thumb' ? 2_000_000 : (k === 'idImage' || k === 'licenseImage') ? 8_000_000 : k === 'desc' ? 1000 : k === 'tagline' ? 50 : k === 'nni' ? 20 : k === 'category' ? 40 : 500);
  });
  if (b.hidePhone !== undefined) acc.hidePhone = !!b.hidePhone; // نفس منطق /mine أعلاه
  if (b.paymentMethods !== undefined) acc.paymentMethods = normalizeAccountPaymentMethods(b.paymentMethods);
  acc.updatedAt = new Date().toISOString();
  list[idx] = acc;
  writeAccounts(list);
  res.json({ ok: true, account: stripToken(acc) });
});

/**
 * POST /api/accounts/admin/:id/decision — أدمين فقط — body:{action:'approve'|'reject'}
 * يضبط status + approvedAt. هذا هو الفعل الذي يجعل الموافقة مرئية فعلياً
 * لصاحب الحساب من جهازه (عبر GET /api/accounts/mine/:id) وللزوار عبر
 * GET /api/accounts/public إن كانت موافقة.
 * عند approve: تُحذف صورة الهوية فوراً من accounts.json ويُثبَّت id_verified فقط.
 */
app.post('/api/accounts/admin/:id/decision', requireAdminAuth, (req, res) => {
  const body = req.body || {};
  const action = body.action;
  if (!['approve', 'reject', 'suspend', 'reactivate'].includes(action)) {
    return res.status(400).json({ error: "action يجب أن يكون 'approve' أو 'reject' أو 'suspend' أو 'reactivate'" });
  }
  const list = readAccounts();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'account_not_found' });

  // تعليق/إعادة تفعيل حساب مُعتمَد مسبقاً — مستقل تماماً عن status (approved/
  // rejected). طالما suspended=true: يختفي الحساب من GET /api/accounts/public
  // (صفحته العامة + شريط الرئيسية)، ويُرفَض verifyAccountOwner لأي فعل يتطلب
  // توكن الملكية (نشر إعلان جديد، تعديل الكتالوج، تعديل الملف الشخصي...).
  if (action === 'suspend' || action === 'reactivate') {
    list[idx].suspended = action === 'suspend';
    list[idx].suspendedAt = action === 'suspend' ? new Date().toISOString() : null;
    writeAccounts(list);
    return res.json({ ok: true, account: stripToken(list[idx]) });
  }

  if (action === 'approve') {
    const nniCheck = assertNniAssignable(list, list[idx].nni, list[idx].id, list[idx]);
    if (!nniCheck.ok) return res.status(nniCheck.status).json(nniCheck.body);
  }

  list[idx].status = action === 'approve' ? 'approved' : 'rejected';
  list[idx].approvedAt = action === 'approve' ? new Date().toISOString() : null;
  list[idx].reviewedAt = new Date().toISOString();
  if (action === 'approve') {
    // dashToken = نفس رمز TK_... الذي يولّده rizq_admin.html محلياً لبناء
    // رابط لوحة تحكم المشترك — نخزّنه هنا أيضاً حتى يتحقق منه /api/accounts/verify-dash
    // عندما يفتح المشترك رابطه من جهازه الخاص (لا يوجد لديه سجل محلي أصلاً).
    if (body.dashToken) list[idx].dashToken = String(body.dashToken).slice(0, 100);
    if (body.package) list[idx].package = String(body.package).slice(0, 60);
    if (body.package_price !== undefined) list[idx].package_price = Number(body.package_price) || 0;
    // التزام قانوني: بعد الموافقة تُحذف صورة الهوية من الخادم — ويبقى NNI + id_verified.
    purgeAccountIdDocument(list[idx]);
  }
  writeAccounts(list);
  res.json({ ok: true, account: stripToken(list[idx]) });
});

/**
 * POST /api/accounts/admin/:id/verified-plus — أدمين فقط — يمنح/يُلغي شارة
 * "موثّق⁺" المدفوعة لحساب. body:{action:'grant'|'revoke', durationDays}.
 * تُستدعى إما تلقائياً بعد موافقة الأدمن على طلب شراء (activateVerifiedPlusForRequest
 * في rizq_admin.html، فئة sub_requests.category==='verified_plus')، أو يدوياً
 * من الأدمن مباشرة (منح/سحب استثنائي بلا طلب شراء). مستقلة تماماً عن status
 * (التوثيق المجاني) وعن package (باقة الحساب العامة) — لا تُعدِّل أياً منهما.
 */
app.post('/api/accounts/admin/:id/verified-plus', requireAdminAuth, (req, res) => {
  const body = req.body || {};
  const action = body.action;
  if (action !== 'grant' && action !== 'revoke') return res.status(400).json({ error: "action يجب أن يكون 'grant' أو 'revoke'" });
  const list = readAccounts();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'account_not_found' });
  if (action === 'grant') {
    const days = Math.max(1, Math.min(3650, Number(body.durationDays) || 365));
    list[idx].verifiedPlus = true;
    list[idx].verifiedPlusExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
  } else {
    list[idx].verifiedPlus = false;
    list[idx].verifiedPlusExpiresAt = null;
  }
  writeAccounts(list);
  res.json({ ok: true, account: stripToken(list[idx]) });
});

const verifyDashLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من المحاولات — حاول مرة أخرى بعد قليل' },
});

/**
 * GET /api/accounts/verify-dash/:id?token=TK_... — عام، بلا سرّ أدمن —
 * يتحقق من رمز لوحة التحكم (dashToken، وليس accessToken الخاص بـ /mine)
 * ويعيد بيانات الحساب فقط إن كان مُوافَقاً عليه. هذا ما يسمح لداشبورد
 * المحل/المكتب/الشركة/الحساب الفردي بالعمل فعلياً عندما يفتحه صاحبه من
 * جهازه الخاص (لا يملك أي سجل محلي في localStorage على ذلك الجهاز أصلاً).
 */
function handleVerifyDash(req, res) {
  const list = readAccounts();
  const acc = list.find((a) => a.id === req.params.id);
  if (!acc) return res.status(404).json({ error: 'account_not_found' });
  const token = extractDashToken(req);
  if (acc.status !== 'approved' || !acc.dashToken || !token || token !== acc.dashToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { accessToken, dashToken, idImage, licenseImage, ...safeFields } = acc;
  res.json({ ok: true, account: Object.assign(safeFields, { accessToken }) });
}
app.post('/api/accounts/verify-dash/:id', verifyDashLimiter, handleVerifyDash);
if (!isProdEnv()) {
  app.get('/api/accounts/verify-dash/:id', verifyDashLimiter, handleVerifyDash);
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// حسابات "ا��&شتر�` ا�سر�`ع" � SQLite عبر /api/auth + /api/wishlist
// (ت��اف� رجع�`: /api/buyers/register �� /api/buyers/me)
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
const buyersRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من المحاولات — حاول مرة أخرى بعد قليل' },
});

app.use('/api/auth', authRouter);

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'عدد كبير من طلبات OTP — حاول لاحقاً' },
});

/** POST /api/otp/send — إرسال رمز تحقق (بائع بالهاتف / مشتري بالبريد) */
app.post('/api/otp/send', otpLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.channel === 'buyer' || (b.email && !b.phone)) {
      const result = await sendBuyerOtp(b);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    }
    const result = await sendOtp(b.phone, { email: b.email, name: b.name });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('[otp/send]', err.message);
    res.status(500).json({ ok: false, error: 'otp_send_failed' });
  }
});

/** POST /api/otp/verify — التحقق من الرمز */
app.post('/api/otp/verify', otpLimiter, (req, res) => {
  const b = req.body || {};
  if (b.channel === 'buyer' || (b.email && !b.phone)) {
    const result = verifyBuyerOtp(b.email, b.code);
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  }
  const result = verifyOtp(b.phone, b.code);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

/** GET /api/otp/config — إعدادات OTP العامة للواجهة */
app.get('/api/otp/config', (req, res) => {
  res.json({ ok: true, otp: getPublicOtpConfig() });
});
app.use('/api/wishlist', wishlistRouter);

/** @deprecated � استخد�& POST /api/auth/register */
app.post('/api/buyers/register', buyersRegisterLimiter, (req, res) => {
  res.status(410).json({ ok: false, error: 'deprecated', message: 'استخدم POST /api/auth/register بعد التحقق بـ OTP' });
});

/** @deprecated � استخد�& GET /api/auth/me */
app.get('/api/buyers/me', (req, res, next) => {
  try {
    const id = req.query.id;
    const token = req.query.token;
    if (!id || !token) return res.status(400).json({ ok: false, error: 'id �� token �&ط���با� ', code: 'AUTH_REQUIRED' });
    const row = BuyerModel.findByIdAndToken(id, token);
    if (!row) return res.status(401).json({ ok: false, error: 'unauthorized', code: 'UNAUTHORIZED' });
    res.json({ ok: true, buyer: BuyerModel.publicBuyer(row) });
  } catch (err) { next(err); }
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// ط�بات ا�اشتراْ/شراء ا�با�ة (ب�&ا ف�`�!ا ف�`د�`���!ات Rizq ADS) � ْا� ت
// rizq_sub_requests �&ح��`ة 100% ف�` localStorage: ا��&شترْ �`رس� ط�ب�! �&� 
// ج�!از�!�R ��ا�أد�&�  �ا �`را�! أبدا�9 إ�ا إ�  فتح تحد�`دا�9 � فس ا��&تصفح. � فس � �&ط
// /api/accounts با�ضبط � إرسا� عا�& + �&راجعة أد�&�`�  بسر� �&شترْ.
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
const SUB_REQUESTS_FILE = path.join(DATA_DIR, 'sub-requests.json');
function readSubRequests() { return readJson(SUB_REQUESTS_FILE, []); }
function writeSubRequests(list) { writeJson(SUB_REQUESTS_FILE, list); }

const subRequestsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/sub-requests — عام (بلا سرّ) — المشترك يرسل طلب شراء/تجديد
 * باقة (مع صورة وصل الدفع base64، حتى ~1.5MB مطابقاً للحد المحلي) من
 * داشبورده. نقبل معرّفاً من العميل (sub_<timestamp>) ليطابق نفس السجل
 * المحلي المعروض في rizq_admin.html بعد المزامنة.
 */
app.post('/api/sub-requests', subRequestsLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.pkg || !b.accountId) return res.status(400).json({ error: 'pkg و accountId مطلوبان' });
  const token = req.header('x-account-token') || '';
  const owner = verifyAccountOwner(String(b.accountId).slice(0, 60), token);
  if (!owner) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const list = readSubRequests();
  const clientId = typeof b.id === 'string' && /^sub_\d{10,20}$/.test(b.id) ? b.id : null;
  const id = clientId && !list.some((r) => r.id === clientId)
    ? clientId : ('sub_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'));
  const rec = {
    id,
    pkg: String(b.pkg).slice(0, 60),
    price: Number(b.price) || 0,
    expectedPrice: Number(b.expectedPrice) || Number(b.price) || 0,
    submittedAt: b.submittedAt || new Date().toISOString(),
    status: 'pending',
    account: String(b.account || '').slice(0, 120),
    accountId: String(b.accountId).slice(0, 60),
    // إصلاح جوهري 28/07/2026: كانت القيمة مقيَّدة بـ'video'/'package' فقط —
    // أي طلب category:'tender' أو 'ad_boost' (أو 'verified_plus' الجديدة)
    // يصل من جهاز غير جهاز الأدمن يُخزَّن هنا خطأً بفئة 'package'. عندما
    // يزامنه admin.html لاحقاً (syncSubRequestsFromBackend، لا وجود له محلياً
    // بعد لأنه من جهاز آخر) وتقرأ handleSubReq الفئة الخاطئة، تمر عبر
    // activateSubscriptionForAccount العامة فتُلغي/تكتب فوق باقة الحساب
    // الحقيقية النشطة — بالضبط الخطأ الذي حذّرت منه تعليقات #219 أعلاه، وكان
    // لا يزال ممكناً فعلياً لأي طلب معزول يصل من جهاز غير جهاز الأدمن.
    category: ['video', 'tender', 'ad_boost', 'verified_plus'].indexOf(b.category) !== -1 ? b.category : 'package',
    videoUrl: b.videoUrl ? String(b.videoUrl).slice(0, 500) : null,
    file: b.file ? String(b.file).slice(0, 200) : null,
    receiptImage: b.receiptImage ? String(b.receiptImage).slice(0, 2_500_000) : null,
    riskLevel: String(b.riskLevel || 'unreviewed').slice(0, 20),
    flags: Array.isArray(b.flags) ? b.flags.slice(0, 20) : [],
    // إصلاح مرافق: adId/adTitle (فئة 'ad_boost') لم تكونا تُخزَّنان إطلاقاً هنا،
    // فكان activateAdBoostForRequest (يتطلب req.adId) يفشل بصمت لأي طلب "مميزة"
    // معزول يصل من جهاز غير جهاز الأدمن — الزبون يدفع ولا يُفعَّل شيء.
    adId: b.adId ? String(b.adId).slice(0, 80) : null,
    adTitle: b.adTitle ? String(b.adTitle).slice(0, 200) : null,
  };
  list.push(rec);
  writeSubRequests(list);
  if (rec.category === 'package' && rec.accountId) {
    try {
      const accRow = readAccounts().find((a) => a.id === rec.accountId);
      createPendingPackageFromRequest({
        accountId: rec.accountId,
        accountName: rec.account || accRow?.name || rec.accountId,
        accountPhone: accRow?.phone || '',
        accountEmail: accRow?.email || '',
        accountType: accRow?.type || 'individual',
        pkgName: rec.pkg,
        price: rec.price,
        requestId: rec.id,
      });
    } catch (pendingErr) {
      console.warn('[sub-requests] pending package:', pendingErr.message);
    }
  }
  res.json({ ok: true, id });

  // إشعار Telegram + تحليل Claude Vision — غير متزامن (لا يُبطئ رد العميل)
  setImmediate(() => {
    try {
      const { getTelegramDeps } = require('./services/telegramDeps');
      const { processNewSubRequest } = require('./services/telegramAdmin');
      const deps = getTelegramDeps();
      if (deps) {
        processNewSubRequest(id, deps).catch((err) => {
          console.warn('[sub-requests] telegram pipeline:', err.message);
        });
      }
    } catch (pipeErr) {
      console.warn('[sub-requests] telegram pipeline init:', pipeErr.message);
    }
  });
});

/**
 * GET /api/sub-requests/admin — أدمين فقط (سرّ مشترك) — قائمة كل الطلبات
 * ليراها أي جهاز أدمن، وليس فقط جهاز المشترك الذي أرسل الطلب.
 */
app.get('/api/sub-requests/admin', requireAdminAuth, (req, res) => {
  res.json({ ok: true, requests: readSubRequests().reverse() });
});

/**
 * POST /api/sub-requests/admin/:id/decision — أدمين فقط — يسجّل قرار
 * الموافقة/الرفض. منطق التفعيل الفعلي (تفعيل الباقة، وضع الفيديو الإعلاني)
 * يبقى محلياً في rizq_admin.html كما هو؛ هذا فقط يجعل الحالة النهائية
 * مرئية عبر كل الأجهزة بدل الاقتصار على جهاز الأدمن الذي وافق فعلياً.
 */
app.post('/api/sub-requests/admin/:id/decision', requireAdminAuth, (req, res) => {
  const action = (req.body || {}).action;
  if (action !== 'approve' && action !== 'reject') return res.status(400).json({ error: 'action يجب أن يكون approve أو reject' });
  const list = readSubRequests();
  const idx = list.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'request_not_found' });
  list[idx].status = action === 'approve' ? 'approved' : 'rejected';
  list[idx].reviewedAt = new Date().toISOString();
  writeSubRequests(list);
  res.json({ ok: true, request: list[idx] });
});

// ── وكيل دورة حياة الباقات (تذكير قبل الانتهاء + إيقاف فوري عند periodEnd
//    + تسليم فاتورة فورية عبر واتساب/بريد عند كل تفعيل) — لم يكن موجوداً
//    إطلاقاً قبل هذا الإصلاح؛ راجع rizq_package_lifecycle_agent.js للتفصيل. ──
const {
  setupPackageLifecycleAPI,
  runLifecycleScan,
  broadcastSMS,
  getAccountRecord,
  getAllAccountPackageRecords,
  syncAccountPackage,
  createPendingPackageFromRequest,
  REFERRAL_BONUS_DAYS,
} = require('./rizq_package_lifecycle_agent');
// نمرّر readAccounts/writeAccounts (مُعرَّفتان أعلاه في هذا الملف) حتى يقدر
// معالج /api/account-package/sync (داخل الملف الآخر) أن يقرأ/يكتب حقل
// referredBy على accounts.json عند منح مكافأة إحالة — راجع rizq_package_
// lifecycle_agent.js لتفاصيل آلية "جيب صاحبك واربح".
setupPackageLifecycleAPI(app, requireAdminAuth, { readAccounts, writeAccounts });

/** GET /api/entitlements/:accountId — صلاحيات الحساب (محمي بـ x-account-token) */
app.get('/api/entitlements/:accountId', (req, res) => {
  const accountId = req.params.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const ent = getEntitlements(accountId, acc.type);
  res.json({ ok: true, entitlements: ent });
});

const contactGateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير من محاولات التواصل — حاول لاحقاً' },
});

/** GET /api/contact-gate/status — حالة بوابة التواصل لحساب مستهدف */
app.get('/api/contact-gate/status', (req, res) => {
  const targetAccountId = String(req.query.targetAccountId || '').trim();
  const module = normalizeModule(req.query.module || req.query.type || 'individual');
  if (!targetAccountId) return res.status(400).json({ ok: false, error: 'targetAccountId_required' });
  const viewerId = resolveOptionalAccountViewer(req);
  const gate = resolveContactGate(viewerId, targetAccountId, module);
  res.json({ ok: true, access: gate });
});

/** POST /api/contact-gate/attempt — FOMO trigger when masked contact clicked */
app.post('/api/contact-gate/attempt', contactGateLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const targetAccountId = String(body.targetAccountId || '').trim();
    const module = normalizeModule(body.module || body.type || 'individual');
    if (!targetAccountId) return res.status(400).json({ ok: false, error: 'targetAccountId_required' });
    const viewerId = resolveOptionalAccountViewer(req);
    const gate = resolveContactGate(viewerId, targetAccountId, module);
    let fomo = { ok: false, skipped: true };
    if (gate.fomoEligible) {
      fomo = await notifyContactAttemptFomo(targetAccountId, module, { lang: body.lang });
    }
    res.json({ ok: true, access: gate, fomo });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── عدّاد زيارات حقيقي لصفحات المشتركين العامة — لم يكن موجوداً إطلاقاً
//    قبل هذا الإصلاح (راجع rizq_visit_tracker.js للتفصيل). قراءة الإحصائيات
//    محمية بـaccessToken الحقيقي للحساب الأساسي (نفس accounts.json الذي
//    تعتمد عليه كل نداءات الداشبورد الأخرى) — راجع تعليق setupVisitTrackingAPI
//    بذلك الملف لتفاصيل سبب استبدال الاعتماد على سجل الباقة المنفصل. ──────
const { setupVisitTrackingAPI } = require('./rizq_visit_tracker');
const trackVisitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // عام بلا مصادقة (كل زوار المنصة) — حد سخي لأنه مجرد ping عند تحميل الصفحة
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
});
function _getMainAccountById(id) {
  const list = readAccounts();
  return list.find((a) => a.id === id) || null;
}
setupVisitTrackingAPI(app, trackVisitLimiter, getAccountRecord, _getMainAccountById);
const LIFECYCLE_SCAN_INTERVAL_MS = 60 * 60 * 1000; // كل ساعة
const _lifecycleHelpers = { readAccounts, writeAccounts };
setInterval(() => {
  runLifecycleScan(_lifecycleHelpers).catch((e) => console.error('[package-lifecycle] scan error:', e.message));
}, LIFECYCLE_SCAN_INTERVAL_MS);
// وفحص أول عند إقلاع الخادم مباشرة (لا ننتظر ساعة كاملة لأول مرة)
runLifecycleScan(_lifecycleHelpers).catch((e) => console.error('[package-lifecycle] initial scan error:', e.message));

// ── الملخص اليومي (Daily Digest) — يُستدعى من مهمة مجدولة خارجية (وكيل
// إدارة المنصة) وليس من أي صفحة عامة. مبني الآن كاملاً لكنه بلا فائدة
// حقيقية حتى تنطلق المنصة فعلياً على استضافة حقيقية وتستقبل مستخدمين —
// قبل ذلك سيعيد دائماً أصفاراً لأن data/ فارغة. لا يغيّر أي بيانات، قراءة
// فقط، ومحمي بنفس BACKEND_SHARED_SECRET العام لبقية نقاط لوحة الأدمن.
app.get('/api/admin/daily-digest', requireAdminAuth, (req, res) => {
  try {
    const pendingAccounts = readAccounts().filter((a) => a.status === 'pending');
    const pendingAds = readAds().filter((a) => a.status === 'pending');
    const pendingSubRequests = readSubRequests().filter((r) => r.status === 'pending');
    const pendingBizContacts = readJson(ADS_REQUESTS_FILE, []).filter((r) => r.status === 'pending_contact');
    const pendingTenders = readTenders().filter((t) => t.status === 'pending');

    const pkgRecords = getAllAccountPackageRecords();
    const expiringSoon = [];
    const suspended = [];
    Object.keys(pkgRecords).forEach((accountId) => {
      const rec = pkgRecords[accountId];
      if (!rec) return;
      if (rec.status === 'expiring_soon') expiringSoon.push({ accountId, periodEnd: rec.periodEnd || null });
      if (rec.status === 'suspended') suspended.push({ accountId, periodEnd: rec.periodEnd || null });
    });

    const maintenanceAudit = readAuditLog(DATA_DIR);
    const lastMaintenance = maintenanceAudit[0] || null;
    const lastBackup = readLatestBackupMeta(__dirname);

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      pendingAccounts: { count: pendingAccounts.length, items: pendingAccounts.slice(0, 20).map((a) => ({ id: a.id, name: a.name, type: a.type, createdAt: a.createdAt })) },
      pendingAds: { count: pendingAds.length, items: pendingAds.slice(0, 20).map((a) => ({ id: a.id, title: a.title, accountId: a.accountId })) },
      pendingSubRequests: { count: pendingSubRequests.length },
      pendingBizContacts: { count: pendingBizContacts.length },
      pendingTenders: { count: pendingTenders.length },
      expiringSoon: { count: expiringSoon.length, items: expiringSoon.slice(0, 20) },
      suspended: { count: suspended.length, items: suspended.slice(0, 20) },
      lastMaintenance,
      lastBackup,
    });
  } catch (err) {
    console.error('[daily-digest] error:', err.message);
    res.status(500).json({ error: 'فشل توليد الملخص اليومي' });
  }
});

// ── "قريباً + أعلمني عند التفعيل" — إشارة اهتمام حقيقية بدل التخمين (طلب
// Limam 03/08/2026): بدل تخمين أي قسم مغلق (مكاتب/شركات/مناقصات/فيديو)
// يُفتح تالياً، الزائر يسجّل اهتمامه بقسم واحد، والأدمن يرى الأرقام الفعلية
// من لوحة التحكم قبل القرار. لا علاقة لهذا بالتسجيل الفعلي في الحساب — مجرد
// نية اهتمام (لا تحتاج مصادقة، لكن محدودة المعدل لمنع الإغراق). ──────────
const INTEREST_FILE = path.join(DATA_DIR, 'section-interest.json');
function readInterest() { return readJson(INTEREST_FILE, []); }
function writeInterest(list) { writeJson(INTEREST_FILE, list); }
const INTEREST_SECTIONS = ['office', 'corp', 'tenders', 'videoAds'];

const interestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // عام بلا مصادقة — سخي بما يكفي لزائر حقيقي، يمنع إغراق آلي بسيط
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/section-interest
 * عام — يسجّل اهتمام زائر بقسم مغلق. body: { section, contact }
 * contact: رقم هاتف أو بريد إلكتروني (نص حر، تحقق بسيط فقط — ليس حساباً).
 */
app.post('/api/section-interest', interestLimiter, (req, res) => {
  const b = req.body || {};
  const section = String(b.section || '').trim();
  const contact = String(b.contact || '').trim().slice(0, 120);
  if (!INTEREST_SECTIONS.includes(section)) {
    return res.status(400).json({ error: 'قسم غير صالح' });
  }
  if (!contact || contact.length < 6) {
    return res.status(400).json({ error: 'الرجاء إدخال رقم هاتف أو بريد إلكتروني صالح' });
  }
  const list = readInterest();
  list.push({
    id: 'int_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    section,
    contact,
    createdAt: new Date().toISOString(),
  });
  writeInterest(list);
  res.json({ ok: true });
});

/**
 * GET /api/section-interest/admin
 * أدمين فقط — عدد التسجيلات لكل قسم مغلق + آخر المسجّلين، ليقرر الأدمن
 * أي قسم يفتحه تالياً بناءً على بيانات حقيقية لا تخميناً.
 */
app.get('/api/section-interest/admin', requireAdminAuth, (req, res) => {
  const list = readInterest();
  const bySection = {};
  INTEREST_SECTIONS.forEach((s) => { bySection[s] = { count: 0, items: [] }; });
  list.forEach((it) => {
    if (!bySection[it.section]) return;
    bySection[it.section].count += 1;
    bySection[it.section].items.push({ contact: it.contact, createdAt: it.createdAt });
  });
  INTEREST_SECTIONS.forEach((s) => { bySection[s].items = bySection[s].items.slice(-20).reverse(); });
  res.json({ ok: true, bySection });
});

/**
 * POST /api/broadcast-sms
 * أدمين فقط (سرّ مشترك) — بثّ SMS ترويجي يدوي لمشتركين حقيقيين عبر Twilio
 * (نفس رقم/حساب Twilio المستخدم فعلياً للمكالمات في rizq_call_handler.js).
 * ⚠️ إرسال يدوي بأمر صريح من الأدمن فقط — لا جدولة ولا إرسال تلقائي هنا.
 * body: { message, filterStatus? } — filterStatus اختياري لتصفية المشتركين
 * حسب حالة باقتهم (active/trial/expiring_soon/expired/suspended/all).
 */
app.post('/api/broadcast-sms', requireAdminAuth, async (req, res) => {
  try {
    const { message, filterStatus } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'message مطلوب' });
    const result = await broadcastSMS({ message, filterStatus });
    res.json(result);
  } catch (err) {
    console.error('[broadcast-sms] error:', err.message);
    res.status(500).json({ error: 'فشل إرسال SMS' });
  }
});

// ══════════════════════════════════════════════════════════════════
// المناقصات (Tenders) — ميزة جديدة 22/07/2026
// ══════════════════════════════════════════════════════════════════
// الفكرة: أي حساب (فرد/محل/مكتب/شركة) ينشر احتياجه بمواصفات ومهلة، وموردون
// آخرون يقدّمون عروض أسعار مغلقة لا يراها إلا صاحب المناقصة. كل من النشر
// وتقديم العروض محجوب خلف باقة واحدة ("غرفة المناقصات") — بوابة واحدة بسيطة،
// وليس نشراً مجانياً + عرضاً مدفوعاً (قرار مقصود لتبسيط البناء والتسويق).
//
// أمان الوصول: نتحقق من هويتين منفصلتين قبل أي عملية:
//  1) x-account-token يطابق accessToken الحقيقي لهذا الحساب في accounts.json
//     (يثبت "أنت فعلاً صاحب هذا الحساب" — نفس نمط /api/accounts/mine/:id).
//  2) getAccountRecord(accountId) من rizq_package_lifecycle_agent.js يثبت أن
//     باقة "غرفة المناقصات" فعّالة فعلاً على هذا الحساب من جهة الخادم — لا
//     يمكن تزويرها من المتصفح (خلافاً لو اعتمدنا فقط على localStorage).
//
// العروض المقدَّمة تبقى داخل ملف المناقصة نفسه لكن لا تُعاد أبداً في أي رد
// عام (GET /api/tenders أو GET /api/tenders/:id) — فقط صاحب المناقصة (عبر
// GET /api/tenders/mine بتوكنه الخاص) أو الأدمن يراها.
const TENDERS_FILE = path.join(DATA_DIR, 'tenders.json');
function readTenders() { return readJson(TENDERS_FILE, []); }
function writeTenders(list) { writeJson(TENDERS_FILE, list); }
function genTenderId() { return 'TND_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'); }

/**
 * saveTenderImages(tenderId, images) — صور مرجعية اختيارية لما يحتاجه
 * صاحب المناقصة (مثال: "20 كرسي بهذا الشكل" + صورة) ليفهم مقدّمو العروض
 * المطلوب بدقة. حد أقصى 3 صور (لا حاجة لمعرض كامل كصور منتج للبيع، هذه
 * مرجع فقط) — نفس منطق saveAdImages/saveCatalogImages.
 */
const TENDER_UPLOADS_DIR = path.join(__dirname, 'uploads', 'tenders');
if (!fs.existsSync(TENDER_UPLOADS_DIR)) fs.mkdirSync(TENDER_UPLOADS_DIR, { recursive: true });
function genBidId() { return 'BID_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'); }

const TENDER_PACKAGE_NAME = 'باقة المناقصة';
const TENDER_ACTIVE_STATUSES = ['active', 'expiring_soon'];
const TENDER_REQUIRES_PACKAGE = true;

function resolveOptionalTenderViewer(req) {
  return resolveOptionalAccountViewer(req);
}

function getTenderAccessForViewer(accountId) {
  return getTenderEntitlements(accountId || null);
}

function hasTenderPaidAccess(accountId) {
  const ent = getTenderEntitlements(accountId);
  return !!(ent && ent.canSubmitProposals && ent.subscribed);
}

/** توافق مع الاستدعاءات القديمة — يعني اشتراك مدفوع فعّال (ليس تجريبي) */
function hasTenderAccess(accountId) {
  return hasTenderPaidAccess(accountId);
}

// redactContactPatterns imported from contactGate.js

function resolveTenderOwnerContacts(t) {
  const owner = readAccounts().find((a) => a.id === t.ownerId) || {};
  const phone = String(t.ownerPhone || owner.phone || '').trim();
  const email = String(t.ownerEmail || owner.email || '').trim();
  const whatsapp = String(t.ownerWhatsApp || owner.whatsapp || phone || '').trim();
  return { phone, email, whatsapp };
}

function toPublicTender(t, access) {
  const now = Date.now();
  const deadlineMs = new Date(t.deadline).getTime();
  const ent = access || TENDER_PUBLIC_ACCESS_FALLBACK();
  const contactsUnlocked = !!ent.canUnlockContacts;
  const contacts = resolveTenderOwnerContacts(t);
  return {
    id: t.id,
    title: contactsUnlocked ? t.title : redactContactPatterns(t.title),
    desc: contactsUnlocked ? t.desc : redactContactPatterns(t.desc),
    category: t.category,
    city: t.city,
    budgetMin: t.budgetMin,
    budgetMax: t.budgetMax,
    deadline: t.deadline,
    images: Array.isArray(t.images) ? t.images : [],
    ownerName: t.ownerName,
    ownerId: t.ownerId || null,
    createdAt: t.createdAt,
    bidsCount: Array.isArray(t.bids) ? t.bids.length : 0,
    isOpen: !Number.isNaN(deadlineMs) && deadlineMs > now,
    contactsLocked: !contactsUnlocked,
    ownerPhone: contactsUnlocked ? (contacts.phone || null) : null,
    ownerEmail: contactsUnlocked ? (contacts.email || null) : null,
    ownerWhatsApp: contactsUnlocked ? (contacts.whatsapp || null) : null,
    canSubmitBid: !!ent.canSubmitProposals,
  };
}

function TENDER_PUBLIC_ACCESS_FALLBACK() {
  return getTenderEntitlements(null);
}

// يثبت أن accountId + token يطابقان حساباً حقيقياً في accounts.json، ويُعيده
function verifyAccountOwner(accountId, token) {
  if (!accountId || !token) return null;
  const acc = readAccounts().find((a) => a.id === accountId);
  // suspended=true (تعليق من الأدمن) يمنع صاحب الحساب من أي فعل يتطلب هذا
  // التحقق — نشر إعلان، تعديل الكتالوج، تعديل الملف الشخصي، إلخ — بغض
  // النظر عن صحة توكنه. هذا هو التطبيق الفعلي الوحيد لمعنى "تعليق مستخدم".
  return (acc && acc.status === 'approved' && acc.accessToken === token && !acc.suspended) ? acc : null;
}

const RizqPromptsServer = require('../rizq_ai_prompts');

/**
 * GET /api/subscriber/knowledge/mine/:accountId — معرفة ديناميكية للمالك (Diamond)
 * POST /api/subscriber/knowledge/upload — رفع Excel/CSV → dynamicKnowledge (معزول per subscriberId)
 */
app.get('/api/subscriber/knowledge/mine/:accountId', (req, res) => {
  const accountId = String(req.params.accountId || '').trim();
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const ent = getAccountEntitlements(acc);
  if (!accountHasAiAgent(acc)) {
    return res.status(403).json({ ok: false, error: resolveAccessDenialMessage(ent), code: ent.subscriptionStatus });
  }
  const row = getSubscriberProfileByAccountId(accountId);
  const prof = row && row.profile ? row.profile : null;
  const dk = prof && prof.dynamicKnowledge ? prof.dynamicKnowledge : null;
  res.json({
    ok: true,
    accountId,
    subscriberId: row ? row.subscriberId : null,
    dynamicKnowledge: dk,
    customInstructions: prof && prof.customInstructions ? prof.customInstructions : '',
    personaKey: prof ? RizqPromptsServer.resolveBusinessType(prof) : null,
    subscriptionStatus: ent.subscriptionStatus,
  });
});

app.post('/api/subscriber/knowledge/instructions', (req, res) => {
  const b = req.body || {};
  const accountId = String(b.accountId || '').trim();
  const token = req.header('x-account-token') || '';
  const customInstructions = String(b.customInstructions || '').trim().slice(0, 4000);
  if (!accountId) {
    return res.status(400).json({ ok: false, error: 'accountId مطلوب' });
  }
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
  if (!accountHasAiAgent(acc)) {
    const ent = getAccountEntitlements(acc);
    return res.status(403).json({ ok: false, error: resolveAccessDenialMessage(ent), code: ent.subscriptionStatus });
  }

  const upsert = upsertSubscriberInstructionsFromAccount(acc, customInstructions);
  if (!upsert.ok) {
    return res.status(500).json({ ok: false, error: upsert.error || 'save_failed' });
  }
  res.json({
    ok: true,
    subscriberId: upsert.subscriberId,
    customInstructions,
    message: 'تم حفظ التعليمات الخاصة — ستُطبَّق فوراً في المحادثات',
  });
});

app.post('/api/subscriber/knowledge/upload', (req, res) => {
  const b = req.body || {};
  const accountId = String(b.accountId || '').trim();
  const token = req.header('x-account-token') || '';
  const fileName = String(b.fileName || '').trim();
  const fileDataBase64 = String(b.fileDataBase64 || '').trim();
  if (!accountId || !fileName || !fileDataBase64) {
    return res.status(400).json({ ok: false, error: 'accountId, fileName, fileDataBase64 مطلوبة' });
  }
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const entUp = getAccountEntitlements(acc);
  if (!accountHasAiAgent(acc)) {
    return res.status(403).json({ ok: false, error: resolveAccessDenialMessage(entUp), code: entUp.subscriptionStatus });
  }

  let buffer;
  try {
    buffer = Buffer.from(fileDataBase64, 'base64');
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_base64' });
  }

  const parsed = parseKnowledgeFile(fileName, buffer);
  if (!parsed.ok) {
    return res.status(400).json({ ok: false, error: parsed.error || 'parse_failed', detail: parsed.detail });
  }

  const upsert = upsertSubscriberKnowledgeFromAccount(acc, parsed.dynamicKnowledge);
  if (!upsert.ok) {
    return res.status(500).json({ ok: false, error: upsert.error || 'save_failed' });
  }

  res.json({
    ok: true,
    subscriberId: upsert.subscriberId,
    dynamicKnowledge: parsed.dynamicKnowledge,
    preview: formatDynamicKnowledgeForPrompt(parsed.dynamicKnowledge).slice(0, 800),
    message: 'تم تحديث معرفة الوكيل — ستنعكس فوراً في المحادثات القادمة',
  });
});

setupQuotaGuardAPI(app, requireAdminAuth, {
  verifyAccountOwner,
  getAccountRecord,
  loadProfiles: () => {
    try {
      return getAllSubscriberProfiles().map((p) => {
        const prof = getSubscriberProfile(p.subscriberId) || {};
        return {
          subscriberId: p.subscriberId,
          accountId: p.accountId,
          businessName: prof.businessName || '',
          phone: p.subscriberId,
        };
      });
    } catch (e) {
      return [];
    }
  },
});

const tenderPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من المناقصات المنشورة — حاول مرة أخرى بعد قليل' },
});
const tenderBidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من العروض المقدَّمة — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/tenders — نشر مناقصة جديدة. يتطلب x-account-token + accountId
 * صالحين، وباقة "غرفة المناقصات" فعّالة على الحساب (وإلا 403 برسالة واضحة).
 */
app.post('/api/tenders', tenderPostLimiter, async (req, res) => {
  try {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  if (!hasTenderPaidAccess(b.accountId)) {
    return res.status(403).json({ error: 'tender_package_required', msg: 'تحتاج باقة مدفوعة فعّالة لنشر مناقصة — الباقة التجريبية للتصفّح فقط' });
  }
  if (!b.title || !b.deadline) return res.status(400).json({ error: 'title و deadline مطلوبان' });
  const deadlineMs = new Date(b.deadline).getTime();
  if (Number.isNaN(deadlineMs) || deadlineMs <= Date.now()) {
    return res.status(400).json({ error: 'الموعد النهائي يجب أن يكون تاريخاً صالحاً في المستقبل' });
  }
  const tenderId = genTenderId();
  const tender = {
    id: tenderId,
    ownerId: acc.id,
    ownerName: acc.name || '',
    ownerPhone: String(acc.phone || '').slice(0, 40),
    ownerEmail: String(acc.email || '').slice(0, 120),
    ownerWhatsApp: String(acc.whatsapp || acc.phone || '').slice(0, 40),
    title: String(b.title).slice(0, 150),
    desc: String(b.desc || '').slice(0, 1500),
    category: String(b.category || '').slice(0, 40),
    city: String(b.city || '').slice(0, 60),
    budgetMin: Number(b.budgetMin) || 0,
    budgetMax: Number(b.budgetMax) || 0,
    deadline: new Date(deadlineMs).toISOString(),
    // صور مرجعية اختيارية توضّح المطلوب بدقة (مثال: "20 كرسي بهذا الشكل")
    images: await saveTenderImages(tenderId, b.images),
    status: 'open',
    createdAt: new Date().toISOString(),
    bids: [],
  };
  const list = readTenders();
  list.unshift(tender);
  writeTenders(list);
  res.json({ ok: true, tender: toPublicTender(tender, getTenderAccessForViewer(b.accountId)) });
  } catch (err) {
    console.error('[tenders/post] image pipeline:', err.message);
    res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
  }
});

/**
 * GET /api/tenders/public-stats — عام بالكامل، بلا مصادقة.
 * يعرض عدد المناقصات المفتوحة + فئات آخر 3 مناقصات فقط (بلا حقول حسّاسة).
 */
app.get('/api/tenders/public-stats', (req, res) => {
  const now = Date.now();
  const openList = readTenders().filter((t) => {
    if (t.status === 'removed') return false;
    const deadlineMs = new Date(t.deadline).getTime();
    return !Number.isNaN(deadlineMs) && deadlineMs > now;
  });
  const recentCategories = openList.slice(0, 3).map((t) => t.category).filter(Boolean);
  res.json({ ok: true, count: openList.length, recentCategories });
});

/**
 * GET /api/tenders — تصفّح عام للمناقصات المفتوحة مع حماية بيانات التواصل.
 * الزائر/التجريبي يرى العنوان والوصف والمتطلبات؛ أرقام التواصل مخفية/مُشفّرة.
 * المشترك المدفوع يكشف التواصل ويمكنه تقديم العروض. يدعم ?cat=&city=
 */
app.get('/api/tenders', (req, res) => {
  const viewerId = resolveOptionalTenderViewer(req);
  const access = getTenderAccessForViewer(viewerId);
  const { cat, city } = req.query || {};
  const now = Date.now();
  let list = readTenders().filter((t) => {
    if (t.status === 'removed') return false;
    const deadlineMs = new Date(t.deadline).getTime();
    return !Number.isNaN(deadlineMs) && deadlineMs > now;
  });
  if (cat) list = list.filter((t) => t.category === cat);
  if (city) list = list.filter((t) => t.city === city);
  res.json({
    ok: true,
    tenders: list.map((t) => toPublicTender(t, access)),
    access: {
      contactsUnlocked: !!access.canUnlockContacts,
      canSubmitBid: !!access.canSubmitProposals,
      canPost: !!access.canPostTenders,
      isTrial: !!access.isTrial,
      subscribed: !!access.subscribed,
      planType: access.planType,
    },
  });
});

/**
 * POST /api/tenders/:id/bids — تقديم عرض على مناقصة. يتطلب x-account-token +
 * accountId صالحين، وباقة "غرفة المناقصات" فعّالة. لا يمكن لصاحب المناقصة
 * تقديم عرض على مناقصته هو نفسها. العرض لا يظهر لأي أحد إلا صاحب المناقصة.
 */
app.post('/api/tenders/:id/bids', tenderBidLimiter, (req, res) => {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  if (!hasTenderPaidAccess(b.accountId)) {
    return res.status(403).json({ error: 'tender_package_required', msg: 'تحتاج باقة مدفوعة فعّالة لتقديم عرض — الباقة التجريبية للتصفّح فقط' });
  }
  const bidderAccess = getTenderAccessForViewer(b.accountId);
  const list = readTenders();
  const idx = list.findIndex((t) => t.id === req.params.id && t.status !== 'removed');
  if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
  const t = list[idx];
  if (t.ownerId === acc.id) return res.status(400).json({ error: 'cannot_bid_own_tender' });
  const deadlineMs = new Date(t.deadline).getTime();
  if (Number.isNaN(deadlineMs) || deadlineMs <= Date.now()) {
    return res.status(400).json({ error: 'tender_closed', msg: 'انتهت مهلة تقديم العروض على هذه المناقصة' });
  }
  if (!b.price) return res.status(400).json({ error: 'price مطلوب' });
  const bid = {
    id: genBidId(),
    bidderId: acc.id,
    bidderName: acc.name || '',
    price: Number(b.price) || 0,
    deliveryDays: Number(b.deliveryDays) || 0,
    notes: String(b.notes || '').slice(0, 500),
    priority: !!bidderAccess.priorityPlacement,
    createdAt: new Date().toISOString(),
  };
  if (!Array.isArray(t.bids)) t.bids = [];
  t.bids.push(bid);
  if (bid.priority && t.bids.length > 1) {
    t.bids.sort((a, b2) => {
      if (!!a.priority !== !!b2.priority) return a.priority ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b2.createdAt).getTime();
    });
  }
  list[idx] = t;
  writeTenders(list);
  res.json({ ok: true });
});

/**
 * GET /api/tenders/mine — مناقصاتي (اللي نشرتها أنا) + كل العروض المقدَّمة
 * عليها كاملة. يتطلب x-account-token + accountId مطابقين.
 */
app.get('/api/tenders/mine', (req, res) => {
  const accountId = req.query.accountId || '';
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const mine = readTenders().filter((t) => t.ownerId === accountId && t.status !== 'removed');
  res.json({ ok: true, tenders: mine });
});

/**
 * GET /api/tenders/admin — أدمين فقط (سرّ مشترك) — كل المناقصات بكل حقولها
 * (بما فيها العروض) لأغراض المراجعة/إزالة السبام.
 */
app.get('/api/tenders/admin', requireAdminAuth, (req, res) => {
  res.json({ ok: true, tenders: readTenders() });
});

/**
 * GET /api/tenders/:id — محجوب أيضاً خلف نفس باقة "غرفة المناقصات" (تفاصيل
 * مناقصة واحدة، بلا عروض).
 * ⚠️ إصلاح جوهري 03/08/2026 (اكتُشف أثناء اختبار تجريبي شامل): كان هذا
 * المسار مُسجَّلاً في Express *قبل* /api/tenders/mine و/api/tenders/admin.
 * express يطابق المسارات بترتيب التسجيل لا بالتحديد — أي طلب لـ /api/tenders/
 * mine أو /api/tenders/admin كان يقع فعلياً هنا (يُعامَل "mine"/"admin" كقيمة
 * :id) ويُطبَّق عليه بوابة "غرفة المناقصات" الخاطئة بدل بوابته الحقيقية. أي
 * أن لوحة إشراف المناقصات في rizq_admin.html ولوحة "مناقصاتي" لدى التاجر لم
 * تعملا فعلياً من قبل. الإصلاح: نقل هذا المسار العام (:id) ليُسجَّل بعد كل
 * المسارات الثابتة الأكثر تحديداً (mine/admin) — قاعدة عامة في Express: أي
 * مسار به معامل (:id) يجب أن يُسجَّل دائماً بعد كل المسارات الثابتة المشابهة.
 */
app.get('/api/tenders/:id', (req, res) => {
  const viewerId = resolveOptionalTenderViewer(req);
  const access = getTenderAccessForViewer(viewerId);
  const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
  if (!t) return res.status(404).json({ error: 'tender_not_found' });
  res.json({
    ok: true,
    tender: toPublicTender(t, access),
    access: {
      contactsUnlocked: !!access.canUnlockContacts,
      canSubmitBid: !!access.canSubmitProposals,
      canPost: !!access.canPostTenders,
      isTrial: !!access.isTrial,
      subscribed: !!access.subscribed,
      planType: access.planType,
    },
  });
});

/**
 * POST /api/tenders/admin/:id/remove — أدمين فقط — يخفي مناقصة نهائياً من كل
 * الواجهات العامة (سبام/محتوى مخالف) دون حذف السجل فعلياً (نفس مبدأ عدم
 * الحذف النهائي المتَّبع في بقية المنصة).
 */
app.post('/api/tenders/admin/:id/remove', requireAdminAuth, (req, res) => {
  const list = readTenders();
  const idx = list.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
  list[idx].status = 'removed';
  writeTenders(list);
  res.json({ ok: true });
});

/**
 * POST /api/tenders/package/activate — أدمين فقط (سرّ مشترك) — يُفعّل/يجدّد
 * اشتراك "باقة المناقصة" لحساب معيّن بعد موافقة الأدمن على طلب اشتراك حقيقي
 * (rizq_sub_requests بفئة category:'tender'). يُستخدَم مفتاح معزول
 * (accountId + '::tender') داخل مخزن account-packages.json حتى لا يتصادم
 * إطلاقاً مع سجل الباقة العامة لنفس الحساب (راجع تعليق hasTenderAccess أعلاه
 * لتفصيل سبب هذا العزل). يدعم التجريبية (10 أيام) والباقات المدفوعة.
 */
app.post('/api/tenders/package/activate', requireAdminAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.accountId) return res.status(400).json({ error: 'accountId مطلوب' });
  const { findCatalogPackage, isTrialPackage } = require('./services/catalogConfig');
  const pkgName = b.pkgName || TENDER_PACKAGE_NAME;
  const pkgDef = findCatalogPackage(b.packageId || pkgName);
  const days = Number(b.days) || (pkgDef && pkgDef.durationDays) || 30;
  const price = Number(b.price) || (pkgDef && pkgDef.price) || 0;
  const isTrial = b.isTrial === true || isTrialPackage((pkgDef && pkgDef.name) || pkgName, price);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + days * 86400000);
  try {
    const result = await syncAccountPackage({
      accountId: b.accountId + '::tender',
      accountName: b.accountName || b.accountId,
      accountPhone: b.accountPhone || '',
      accountEmail: b.accountEmail || '',
      accountType: b.accountType || '',
      pkgName: (pkgDef && pkgDef.name) || pkgName,
      packageId: (pkgDef && pkgDef.id) || b.packageId || null,
      price,
      days,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      activatedBy: b.activatedBy || 'admin',
      isTrial,
      paymentConfirmed: !isTrial,
      paidAt: isTrial ? null : now.toISOString(),
    });
    if (!result.ok) return res.status(400).json(result);
    res.json({ ok: true, periodEnd: periodEnd.toISOString() });
  } catch (err) {
    console.error('[tenders/package/activate] error:', err.message);
    res.status(500).json({ error: 'فشل تفعيل باقة المناقصة' });
  }
});

/**
 * GET /api/tenders/package/status/:id — حالة اشتراك "باقة المناقصة" لحساب
 * معيّن، من طرف صاحب الحساب نفسه فقط (x-account-token يطابق accessToken
 * الحقيقي في accounts.json — نفس نمط /api/accounts/mine/:id). لا يستخدم
 * سرّ الأدمن العام لأن هذه النقطة تُستدعى من داشبورد المشترك مباشرة.
 */
app.get('/api/tenders/package/status/:id', (req, res) => {
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(req.params.id, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const ent = getTenderEntitlements(req.params.id);
  const rec = getAccountRecord(req.params.id + '::tender');
  const safeRec = rec ? (() => { const { accessToken, ...rest } = rec; return rest; })() : null;
  res.json({
    ok: true,
    subscribed: !!ent.subscribed,
    isTrial: !!ent.isTrial,
    contactsUnlocked: !!ent.canUnlockContacts,
    canSubmitBid: !!ent.canSubmitProposals,
    canPost: !!ent.canPostTenders,
    planType: ent.planType,
    pkgName: ent.pkgName || null,
    record: safeRec,
  });
});

// ══════════════════════════════════════════════════════════════════
// إعلانات رزق الحقيقية (ads.json) — البنية التحتية الأساسية للمنصة
// ══════════════════════════════════════════════════════════════════
// حتى الآن: كل إعلان يُنشر عبر rizq_post.html كان يُحفظ فقط في
// localStorage['rizq_ads'] بمتصفح الناشر — أي لا يظهر أبداً لأي زائر أو
// جهاز آخر (عرض تجريبي، ليس سوقاً حقيقياً). هذا القسم يبني المخزن الحقيقي
// المشترك بين كل الزوار والأجهزة، بنفس شكل بيانات الإعلان الذي يبنيه
// publishAd() في rizq_post.html (title/desc/price/category/subcat/wilaya/
// images/...) حتى لا تحتاج الواجهة لتغيير جوهري، فقط استبدال
// localStorage.setItem بطلب fetch حقيقي.
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
function readAds() { return readJson(ADS_FILE, []); }
function writeAds(list) { writeJson(ADS_FILE, list); }

// صور الإعلانات تُكتب كملفات حقيقية على القرص (لا base64 داخل ads.json) —
// قرار مبرَّر: كود publishAd() في rizq_post.html يحتوي أصلاً على منطق
// fallback عند quota exceeded في localStorage، أي أن base64 يصطدم بحد
// السعة القصوى فعلياً مع أول إعلان بصور متعددة. كل صورة تُحفَظ تحت
// uploads/ads/<adId>/<n>.<ext> وتُخدَّم عبر express.static أعلاه.
const ADS_UPLOADS_DIR = path.join(__dirname, 'uploads', 'ads');
if (!fs.existsSync(ADS_UPLOADS_DIR)) fs.mkdirSync(ADS_UPLOADS_DIR, { recursive: true });

function genAdId() {
  return 'RZQ-' + new Date().getFullYear() + '-' + String(Math.floor(10000 + Math.random() * 90000));
}

/**
 * withBoostFlag(ad) — يضيف علم boosted:true/false للإعلان حسب ad_boosts.json
 * (نفس المصدر الذي يقرأه GET /api/discovery/ending-soon). readAdBoosts معرَّفة
 * لاحقاً في الملف لكن يصح استدعاؤها هنا بفضل hoisting لتعريفات الدوال.
 */
function withBoostFlag(ad) {
  try {
    const boosts = readAdBoosts();
    const b = boosts[ad.id];
    const boosted = !!(b && b.endsAt && new Date(b.endsAt).getTime() > Date.now());
    return Object.assign({}, ad, { boosted });
  } catch (e) {
    return Object.assign({}, ad, { boosted: false });
  }
}

const adsPublishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الإعلانات المنشورة — حاول لاحقاً' },
});

/**
 * POST /api/ads — نشر إعلان حقيقي (عام، بلا سرّ مشترك — أي زائر ناشر
 * حقيقي). الإشراف (موافقة/رفض المبدئي) يبقى بمنطق RizqAgent في العميل
 * كما هو — status المُرسَل هنا (active أو pending) يُحفَظ كما هو فقط،
 * فيصبح مشتركاً بين الأجهزة بدل أن يبقى محبوساً في متصفح واحد.
 */
app.post('/api/ads', adsPublishLimiter, moderatorAdMiddleware, async (req, res) => {
  try {
  const pFlags = getPlatformFlags();
  if (pFlags.platformOpen === false) return res.status(503).json({ error: 'المنصة مغلقة للصيانة حالياً' });
  if (pFlags.adsOpen === false) return res.status(403).json({ error: 'نشر الإعلانات مغلق حالياً' });
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'العنوان مطلوب' });
  if (!b.category) return res.status(400).json({ error: 'الفئة مطلوبة' });
  if (b.accountId) {
    const token = extractAccountToken(req) || '';
    const ownerAcc = verifyAccountOwner(String(b.accountId).slice(0, 60), token);
    if (!ownerAcc) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const acc = ownerAcc;
    const ent = getEntitlements(b.accountId, acc ? acc.type : 'individual');
    const activeCount = readAds().filter((a) => a.accountId === b.accountId && a.status !== 'removed').length;
    try {
      assertCanPostAd(ent, activeCount);
      if (Array.isArray(b.images) && b.images.length) assertPhotoCount(ent, b.images.length);
    } catch (gateErr) {
      return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
    }
  }
  const list = readAds();
  let id = (typeof b.id === 'string' && /^RZQ-\d{4}-\d{4,6}$/.test(b.id)) ? b.id : genAdId();
  while (list.some((a) => a.id === id)) id = genAdId(); // تفادي تصادم نادر في المعرّف
  const images = await saveAdImages(id, b.images);
  const rec = {
    id,
    title: String(b.title).slice(0, 200),
    desc: String(b.desc || '').slice(0, 5000),
    titleFr: String(b.titleFr || '').slice(0, 200),
    descFr: String(b.descFr || '').slice(0, 5000),
    price: String(b.price || '').slice(0, 40),
    originalPrice: String(b.originalPrice || '').slice(0, 40), // سعر أصلي اختياري لعرض شارة الخصم (إلهام أمازون)
    stockQty: (b.stockQty !== undefined && b.stockQty !== '' && Number.isFinite(Number(b.stockQty)) && Number(b.stockQty) >= 0)
      ? Math.floor(Number(b.stockQty)) : null, // كمية متبقية اختيارية — شارة "متبقي X فقط" (إلهام أمازون/Temu)، null = غير محدود
    category: String(b.category).slice(0, 60),
    categoryLabel: String(b.categoryLabel || '').slice(0, 60),
    subcat: String(b.subcat || '').slice(0, 80),
    emoji: String(b.emoji || '').slice(0, 8),
    wilaya: String(b.wilaya || '').slice(0, 60),
    condition: String(b.condition || '').slice(0, 40),
    images,
    seller_trust_score: Number.isFinite(Number(b.seller_trust_score)) ? Number(b.seller_trust_score) : 60,
    accountId: b.accountId ? String(b.accountId).slice(0, 60) : null,
    // إصلاح ثغرة أمنية (2026-08-04): كان الحقل status قابلاً للتحكم من العميل
    // (b.status)، وبقيمة افتراضية 'active' إن لم يُرسَل شيء — أي أن أي طلب
    // مباشر لهذا الـ API (متجاوزاً rizq_moderator_agent.js الذي يعمل في
    // المتصفح فقط) كان يُنشر الإعلان مباشرة بلا أي مراجعة من السيرفر.
    // الآن: كل إعلان جديد يبدأ 'pending' إلزامياً بغضّ النظر عمّا يرسله
    // العميل — التفعيل الفعلي فقط عبر POST /api/ads/admin/:id/decision.
    status: 'pending',
    date: b.date ? String(b.date).slice(0, 40) : new Date().toLocaleDateString('ar'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(rec);
  writeAds(list);
  const out = { ok: true, id: rec.id, ad: rec };
  if (req.moderatorDecision) out.moderator = req.moderatorDecision;
  res.json(out);
  } catch (err) {
    console.error('[ads/post] image pipeline:', err.message);
    res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
  }
});

/**
 * GET /api/ads — تصفح عام (rizq_browse.html / rizq_search.html) — لا
 * يُرجع إلا status==='active' افتراضياً، مع فلاتر بسيطة + ترقيم صفحات.
 */
app.get('/api/ads', (req, res) => {
  const q = req.query || {};
  const viewerId = resolveOptionalAccountViewer(req);
  let list = readAds().filter((a) => a.status === 'active' && !String(a.accountId || '').startsWith('acc_demo') && !/^RZQ-2026-1000\d$/i.test(String(a.id || '')));
  if (q.category) list = list.filter((a) => a.category === q.category);
  if (q.subcat) list = list.filter((a) => a.subcat === q.subcat);
  if (q.wilaya) list = list.filter((a) => a.wilaya === q.wilaya);
  if (q.accountId) list = list.filter((a) => a.accountId === q.accountId);
  if (q.search) {
    const s = String(q.search).toLowerCase();
    list = list.filter((a) => (a.title + ' ' + a.desc).toLowerCase().indexOf(s) !== -1);
  }
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const limit = Math.max(1, Math.min(200, Number(q.limit) || 60));
  const offset = Math.max(0, Number(q.offset) || 0);
  const accounts = readAccounts();
  const page = list.slice(offset, offset + limit).map((ad) => {
    const seller = accounts.find((a) => a.id === ad.accountId);
    const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
    return toPublicAdGated(withBoostFlag(ad), gate, seller);
  });
  res.json({ ok: true, total: list.length, ads: page });
});

/**
 * GET /api/ads/batch?ids=RZQ-...,RZQ-... — جلب عدة إعلانات دفعة واحدة
 * (يستخدمه شريط "تابع التصفح" على الصفحة الرئيسية بدل استدعاء /api/ads/:id
 * مرة لكل إعلان شاهده الزائر). عام، لا يُرجع إلا status==='active'.
 */
app.get('/api/ads/batch', (req, res) => {
  const idsParam = String(req.query.ids || '');
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
  if (!ids.length) return res.json({ ok: true, ads: [] });
  const viewerId = resolveOptionalAccountViewer(req);
  const all = readAds();
  const accounts = readAccounts();
  const found = ids
    .map((id) => all.find((a) => a.id === id && a.status === 'active'))
    .filter(Boolean)
    .map((ad) => {
      const seller = accounts.find((a) => a.id === ad.accountId);
      const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
      return toPublicAdGated(withBoostFlag(ad), gate, seller);
    });
  res.json({ ok: true, ads: found });
});

/** GET /api/ads/mine — كل إعلانات حساب معيّن (كل الحالات)، لصاحبه فقط */
app.get('/api/ads/mine', (req, res) => {
  const accountId = req.query.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readAds().filter((a) => a.accountId === accountId);
  res.json({ ok: true, ads: list });
});

/** GET /api/ads/admin — لوحة إشراف الأدمن (كل الحالات، كل الإعلانات) */
app.get('/api/ads/admin', requireAdminAuth, (req, res) => {
  res.json({ ok: true, ads: readAds() });
});

/** GET /api/ads/:id — تفاصيل إعلان واحد (صفحة rizq_listing.html) */
app.get('/api/ads/:id', (req, res) => {
  const ad = readAds().find((a) => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'ad_not_found' });
  const isAdmin = isAdminRequest(req);
  const token = extractAccountToken(req) || '';
  const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
  if (ad.status !== 'active' && !isAdmin && !isOwner) {
    return res.status(404).json({ error: 'ad_not_found' });
  }
  const viewerId = resolveOptionalAccountViewer(req);
  const seller = readAccounts().find((a) => a.id === ad.accountId);
  const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
  res.json({ ok: true, ad: toPublicAdGated(withBoostFlag(ad), gate, seller), access: gate });
});

/**
 * PATCH /api/ads/:id — تعديل من صاحب الإعلان (x-account-token) أو الأدمن
 * (x-rizq-secret). يدعم تعديل الحقول الأساسية + تغيير الحالة (نشِط/مباع/
 * متوقف) + استبدال الصور.
 */
app.patch('/api/ads/:id', async (req, res) => {
  try {
  const list = readAds();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
  const ad = list[idx];
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body || {};
  const editable = ['title', 'desc', 'titleFr', 'descFr', 'price', 'originalPrice', 'subcat', 'wilaya', 'condition'];
  editable.forEach((k) => { if (typeof b[k] === 'string') ad[k] = b[k].slice(0, (k === 'desc' || k === 'descFr') ? 5000 : 200); });
  if (Object.prototype.hasOwnProperty.call(b, 'stockQty')) {
    ad.stockQty = (b.stockQty !== null && b.stockQty !== '' && Number.isFinite(Number(b.stockQty)) && Number(b.stockQty) >= 0)
      ? Math.floor(Number(b.stockQty)) : null;
  }
  if (Array.isArray(b.images)) ad.images = await saveAdImages(ad.id, b.images);
  // إصلاح ثغرة أمنية (2026-08-04): كان صاحب الإعلان (isOwner) قادراً على
  // تعيين status إلى 'active' مباشرة (نشر بلا مراجعة) أو حتى إعادته إلى
  // 'active' بعد رفضه من الأدمن — نفس قرار المراجعة (POST
  // /api/ads/admin/:id/decision) كان بلا قيمة فعلية. الآن: المالك يستطيع
  // فقط تعديل حالات إدارة ذاتية لا تحتاج مراجعة (sold/inactive/removed)،
  // أما active/pending/rejected فللأدمن حصراً (x-rizq-secret).
  if (typeof b.status === 'string') {
    const ownerAllowedStatus = ['sold', 'inactive', 'removed'];
    const adminAllowedStatus = ['active', 'pending', 'rejected', 'sold', 'inactive', 'removed'];
    const allowedStatus = isAdmin ? adminAllowedStatus : ownerAllowedStatus;
    if (allowedStatus.includes(b.status)) ad.status = b.status;
  }
  ad.updatedAt = new Date().toISOString();
  list[idx] = ad;
  writeAds(list);
  res.json({ ok: true, ad });
  } catch (err) {
    console.error('[ads/patch] image pipeline:', err.message);
    res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
  }
});

/**
 * DELETE /api/ads/:id — حذف ناعم (status='removed') وليس حذفاً نهائياً،
 * بنفس مبدأ عدم الحذف النهائي المتَّبع في بقية المنصة (المناقصات مثلاً).
 */
app.delete('/api/ads/:id', (req, res) => {
  const list = readAds();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
  const ad = list[idx];
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  list[idx].status = 'removed';
  list[idx].updatedAt = new Date().toISOString();
  writeAds(list);
  res.json({ ok: true });
});

/**
 * POST /api/ads/admin/:id/decision — قرار إشراف الأدمن (موافقة/رفض) —
 * يحلّ محل syncRealAdReviewStatus المحلي بالكامل في rizq_admin.html.
 */
app.post('/api/ads/admin/:id/decision', requireAdminAuth, (req, res) => {
  const action = (req.body || {}).action;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action يجب أن يكون 'approve' أو 'reject'" });
  const list = readAds();
  const idx = list.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
  list[idx].status = action === 'approve' ? 'active' : 'rejected';
  list[idx].updatedAt = new Date().toISOString();
  writeAds(list);
  res.json({ ok: true, ad: list[idx] });
});

// ══════════════════════════════════════════════════════════════════
// بلاغات الزوار عن الإعلانات — ميزة جديدة كاملة (بلا حساب مطلوب) —
// كانت لوحة "البلاغات" بـrizq_admin.html تعرض REPORTS_DATA وهمية فقط
// ولا توجد أي طريقة أصلاً ليبلّغ زائر عن إعلان مخالف. الآن: أي زائر
// (بلا تسجيل دخول) يمكنه إرسال بلاغ عن إعلان محدد، ويراجعه الأدمن هنا.
// ══════════════════════════════════════════════════════════════════
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
function readReports() { return readJson(REPORTS_FILE, []); }
function writeReports(list) { writeJson(REPORTS_FILE, list); }
function genReportId() { return 'RPT-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

const REPORT_REASONS = ['fake_photos', 'suspicious_item', 'fraud', 'banned_content', 'misleading_price', 'other'];

const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من البلاغات — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/reports — عام، بلا حساب مطلوب — بلاغ زائر عن إعلان محدد.
 * body: {adId, reason (من REPORT_REASONS), details?, reporterPhone?}.
 * نُخزِّن لقطة من عنوان الإعلان وaccountId صاحبه وقت الإبلاغ حتى تبقى
 * البيانات مفيدة للأدمن حتى لو تغيّر الإعلان لاحقاً.
 */
app.post('/api/reports', reportsLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.adId || typeof b.adId !== 'string') return res.status(400).json({ error: 'adId مطلوب' });
  if (!REPORT_REASONS.includes(b.reason)) return res.status(400).json({ error: 'reason غير صالح' });
  const ad = readAds().find((a) => a.id === b.adId);
  if (!ad) return res.status(404).json({ error: 'ad_not_found' });
  const list = readReports();
  const rec = {
    id: genReportId(),
    adId: ad.id,
    adTitle: ad.title || '',
    adAccountId: ad.accountId || null,
    reason: b.reason,
    details: String(b.details || '').slice(0, 1000),
    reporterPhone: String(b.reporterPhone || '').slice(0, 30),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  list.push(rec);
  writeReports(list);
  res.json({ ok: true, id: rec.id });
});

/** GET /api/reports/admin — أدمين فقط — كل البلاغات (المعلّقة أولاً، الأحدث أولاً) */
app.get('/api/reports/admin', requireAdminAuth, (req, res) => {
  const list = readReports().sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ ok: true, reports: list });
});

/** POST /api/reports/admin/:id/resolve — أدمين فقط — يُعلِّم البلاغ كمحلول */
app.post('/api/reports/admin/:id/resolve', requireAdminAuth, (req, res) => {
  const list = readReports();
  const idx = list.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'report_not_found' });
  list[idx].status = 'resolved';
  list[idx].resolvedAt = new Date().toISOString();
  writeReports(list);
  res.json({ ok: true, report: list[idx] });
});

/** GET /api/support-tickets/admin — admin list support tickets */
app.get('/api/support-tickets/admin', requireAdminAuth, (req, res) => {
  const list = readTickets().sort((a, b) => {
    if (a.status !== b.status) {
      const order = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ ok: true, tickets: list });
});

/** PATCH /api/support-tickets/admin/:id — update ticket status */
app.patch('/api/support-tickets/admin/:id', requireAdminAuth, (req, res) => {
  const { status, adminNote } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const updated = updateTicketStatus(req.params.id, status, adminNote);
  if (!updated) return res.status(404).json({ error: 'ticket_not_found' });
  res.json({ ok: true, ticket: updated });
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// ط�بات تعط�`� ا�حساب ا�ذات�`ة � �&�`زة جد�`دة ْا�&�ة (09/08/2026) � زر
// "تعط�`� ا�حساب �&ؤ�تا�9" ف�` ْ� ���حات ا�تحْ�& (فرد�`/�&ح�/�&ْتب) ْا�  �`عرض
// ت��ست � جاح ("س�`ُراج�}ع �&�  ا�إدارة") ب�ا أ�` إرسا� ح��`��` ��خاد�& إط�ا�ا�9 �
// �ا �`��جد أ�` طاب��ر إدارة �`ر�0 ا�ط�ب. ا�آ� : ط�ب ح��`��` �`ص� �طاب��ر �&راجعة
// ح��`��` ب���حة ا�أد�&� �R ��ا�تعط�`� ا�فع��` (suspended=true) �ا �`حدث إ�ا بعد
// �&��اف�ة ا�أد�&�  � � فس آ��`ة ا�تع��`� ا��&��ج��دة أص�ا�9 ب٬POST /api/accounts/
// admin/:id/decision (action='suspend')�R �ا � ُْرِ�ر�!ا ب� � ستدع�`�!ا �&باشرة.
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
const DEACTIVATION_REQUESTS_FILE = path.join(DATA_DIR, 'deactivation-requests.json');
function readDeactivationRequests() { return readJson(DEACTIVATION_REQUESTS_FILE, []); }
function writeDeactivationRequests(list) { writeJson(DEACTIVATION_REQUESTS_FILE, list); }
function genDeactivationRequestId() { return 'DEACT-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

const deactivationRequestsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
});

/**
 * POST /api/deactivation-requests — صاحب الحساب فقط (x-account-token
 * الحقيقي، نفس verifyAccountOwner المستخدم في كل مسارات الملكية الأخرى).
 * body: {accountId, reason?}. لا يُعطِّل الحساب فوراً — يُنشئ طلباً معلَّقاً
 * فقط. طلب معلَّق واحد كحد أقصى لكل حساب (لا تراكم عند نقرات متكررة).
 */
app.post('/api/deactivation-requests', deactivationRequestsLimiter, (req, res) => {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readDeactivationRequests();
  const existing = list.find((r) => r.accountId === acc.id && r.status === 'pending');
  if (existing) return res.json({ ok: true, id: existing.id, alreadyPending: true });
  const rec = {
    id: genDeactivationRequestId(),
    accountId: acc.id,
    accountName: acc.name || '',
    accountType: acc.type || '',
    reason: String(b.reason || '').slice(0, 500),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  list.push(rec);
  writeDeactivationRequests(list);
  res.json({ ok: true, id: rec.id });
});

/** GET /api/deactivation-requests/admin — أدمين فقط — المعلّقة أولاً، الأحدث أولاً */
app.get('/api/deactivation-requests/admin', requireAdminAuth, (req, res) => {
  const list = readDeactivationRequests().sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ ok: true, requests: list });
});

/**
 * POST /api/deactivation-requests/admin/:id/resolve — أدمين فقط —
 * body:{action:'approve'|'reject'}. approve: يُعلِّق الحساب فعلياً
 * (suspended=true، نفس أثر action='suspend' بمسار القرار الإداري
 * للحسابات) بالإضافة لتعليم الطلب كمحلول. reject: يُعلِّم الطلب كمحلول فقط.
 */
app.post('/api/deactivation-requests/admin/:id/resolve', requireAdminAuth, (req, res) => {
  const action = (req.body || {}).action;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action يجب أن يكون 'approve' أو 'reject'" });
  const list = readDeactivationRequests();
  const idx = list.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'request_not_found' });
  list[idx].status = 'resolved';
  list[idx].decision = action;
  list[idx].resolvedAt = new Date().toISOString();
  writeDeactivationRequests(list);
  if (action === 'approve') {
    const accs = readAccounts();
    const aidx = accs.findIndex((a) => a.id === list[idx].accountId);
    if (aidx !== -1) {
      accs[aidx].suspended = true;
      accs[aidx].suspendedAt = new Date().toISOString();
      writeAccounts(accs);
    }
  }
  res.json({ ok: true, request: list[idx] });
});

// ══════════════════════════════════════════════════════════════════
// كتالوج المنتجات/الخدمات (متجر/مكتب/شركة) + أوقات العمل — بنية حقيقية
// ══════════════════════════════════════════════════════════════════
// كانت store_products_<id> و office_services_<id> و rizq_corp_prods_<id>
// (بالإضافة لمفاتيح *_hours_<id>) كلها localStorage فقط بمتصفح صاحب
// الحساب — لا تظهر أبداً لزائر يفتح صفحة المتجر/المكتب/الشركة من جهاز
// آخر. مخزن واحد مشترك هنا (بحقل kind يميّز المنتج عن الخدمة، وaccountId
// يربطه بصاحبه) بدل ثلاثة أنظمة منفصلة، لأن الشكل والمنطق (ownership +
// CRUD) متطابق تماماً بين الثلاثة.
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
function readCatalog() { return readJson(CATALOG_FILE, []); }
function writeCatalog(list) { writeJson(CATALOG_FILE, list); }

const HOURS_FILE = path.join(DATA_DIR, 'business-hours.json');
function readAllHours() { return readJson(HOURS_FILE, {}); }
function writeAllHours(obj) { writeJson(HOURS_FILE, obj); }

function genCatalogId() { return 'CAT-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

// نفس منطق حفظ صور الإعلانات كملفات حقيقية بدل base64 داخل catalog.json
// (راجع saveAdImages أعلاه لتفصيل سبب القرار: base64 في localStorage
// يصطدم بحد السعة القصوى فعلياً).
const CATALOG_UPLOADS_DIR = path.join(__dirname, 'uploads', 'catalog');
if (!fs.existsSync(CATALOG_UPLOADS_DIR)) fs.mkdirSync(CATALOG_UPLOADS_DIR, { recursive: true });

/**
 * POST /api/catalog — إضافة منتج/خدمة (صاحب الحساب فقط عبر x-account-token)
 */
app.post('/api/catalog', async (req, res) => {
  try {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
  if (!['product', 'service'].includes(b.kind)) return res.status(400).json({ error: "kind يجب أن يكون 'product' أو 'service'" });
  const ent = getEntitlements(b.accountId, acc.type);
  const activeCount = readCatalog().filter((it) => it.accountId === b.accountId && it.status === 'active').length;
  const imageCount = Array.isArray(b.images) ? b.images.length : (b.image ? 1 : 0);
  try {
    assertCanAddCatalogItem(ent, activeCount);
    if (imageCount) assertPhotoCount(ent, imageCount);
  } catch (gateErr) {
    return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
  }
  const list = readCatalog();
  const id = genCatalogId();
  // images: مصفوفة (حتى 6) — الحقل الجديد للمعرض. image: الصورة الأولى
  // منها، يبقى محدَّثاً لتوافق أي كود قديم يقرأ item.image فقط. يدعم
  // كلا المسارين: عميل جديد يرسل images[]، أو عميل قديم يرسل image واحدة.
  let catImages;
  if (Array.isArray(b.images) && b.images.length) {
    catImages = await saveCatalogImages(id, b.images);
  } else {
    const single = await saveCatalogImage(id, b.image);
    catImages = single ? [single] : [];
  }
  const rec = {
    id,
    accountId: b.accountId,
    kind: b.kind,
    name: String(b.name).slice(0, 200),
    nameFr: String(b.nameFr || '').slice(0, 200),
    price: String(b.price || '').slice(0, 40),
    cat: String(b.cat || '').slice(0, 80),
    desc: String(b.desc || '').slice(0, 3000),
    descFr: String(b.descFr || '').slice(0, 3000),
    stock: String(b.stock || '').slice(0, 20),
    variants: String(b.variants || '').slice(0, 300),
    images: catImages,
    image: catImages[0] || null,
    emoji: String(b.emoji || '').slice(0, 8),
    status: ['active', 'inactive', 'pending_review'].includes(b.status) ? b.status : 'active',
    sold: Number.isFinite(Number(b.sold)) ? Number(b.sold) : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(rec);
  writeCatalog(list);
  res.json({ ok: true, item: rec });
  } catch (err) {
    console.error('[catalog/post] image pipeline:', err.message);
    res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
  }
});

/** GET /api/catalog?accountId=...&kind=... — عرض عام (فقط status active) لصفحات المتجر/المكتب/الشركة */
app.get('/api/catalog', (req, res) => {
  const q = req.query || {};
  let list = readCatalog().filter((it) => it.status === 'active');
  if (q.accountId) list = list.filter((it) => it.accountId === q.accountId);
  if (q.kind) list = list.filter((it) => it.kind === q.kind);
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, items: list });
});

/** GET /api/catalog/mine?accountId=... — كل عناصر صاحب الحساب (كل الحالات)، للوحة التحكم */
app.get('/api/catalog/mine', (req, res) => {
  const accountId = req.query.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readCatalog().filter((it) => it.accountId === accountId && it.status !== 'removed');
  res.json({ ok: true, items: list });
});

/** GET /api/catalog/:id */
app.get('/api/catalog/:id', (req, res) => {
  const item = readCatalog().find((it) => it.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'item_not_found' });
  res.json({ ok: true, item });
});

/** PATCH /api/catalog/:id — تعديل من صاحب الحساب أو الأدمن */
app.patch('/api/catalog/:id', async (req, res) => {
  try {
  const list = readCatalog();
  const idx = list.findIndex((it) => it.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
  const item = list[idx];
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!(item.accountId && verifyAccountOwner(item.accountId, token));
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body || {};
  const editable = ['name', 'nameFr', 'price', 'cat', 'desc', 'descFr', 'stock', 'variants', 'emoji'];
  editable.forEach((k) => { if (typeof b[k] === 'string') item[k] = b[k].slice(0, (k === 'desc' || k === 'descFr') ? 3000 : 200); });
  if (typeof b.sold !== 'undefined' && Number.isFinite(Number(b.sold))) item.sold = Number(b.sold);
  if (Array.isArray(b.images)) {
    item.images = await saveCatalogImages(item.id, b.images);
    item.image = item.images[0] || null;
  } else if (typeof b.image === 'string') {
    item.image = await saveCatalogImage(item.id, b.image);
    item.images = item.image ? [item.image] : [];
  }
  if (typeof b.status === 'string' && ['active', 'inactive', 'pending_review', 'removed'].includes(b.status)) item.status = b.status;
  item.updatedAt = new Date().toISOString();
  list[idx] = item;
  writeCatalog(list);
  res.json({ ok: true, item });
  } catch (err) {
    console.error('[catalog/patch] image pipeline:', err.message);
    res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
  }
});

/** DELETE /api/catalog/:id — حذف ناعم (status='removed') */
app.delete('/api/catalog/:id', (req, res) => {
  const list = readCatalog();
  const idx = list.findIndex((it) => it.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
  const item = list[idx];
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!(item.accountId && verifyAccountOwner(item.accountId, token));
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  list[idx].status = 'removed';
  list[idx].updatedAt = new Date().toISOString();
  writeCatalog(list);
  res.json({ ok: true });
});

/**
 * أوقات العمل — سجلّ واحد لكل حساب (وليس قائمة). POST يحفظ/يحدّث (صاحب
 * الحساب فقط)، GET عام (تعرضه صفحة المتجر/المكتب/الشركة العامة).
 */
app.post('/api/business-hours', (req, res) => {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  if (!b.hours || typeof b.hours !== 'object') return res.status(400).json({ error: 'hours مطلوب' });
  const all = readAllHours();
  all[b.accountId] = { hours: b.hours, updatedAt: new Date().toISOString() };
  writeAllHours(all);
  res.json({ ok: true });
});

app.get('/api/business-hours/:accountId', (req, res) => {
  const all = readAllHours();
  const rec = all[req.params.accountId];
  if (!rec) return res.json({ ok: true, hours: null });
  res.json({ ok: true, hours: rec.hours, updatedAt: rec.updatedAt });
});

// ══════════════════════════════════════════════════════════════════
// رسائل المشتري↔البائع — بنية حقيقية (تدعم الزائر غير المسجَّل + المحادثة
// الكاملة للمشتري صاحب حساب فردي معتمد)
// ══════════════════════════════════════════════════════════════════
// كان صندوق "الرسائل" في لوحات التجار يعرض بيانات تجريبية ثابتة فقط —
// لا يوجد أصلاً أي زر "راسل البائع" حقيقي في صفحات الإعلانات/المتجر
// العامة يكتب رسالة جديدة. القرار (بطلب Limam): ادعم الحالتين معاً —
// (1) زائر بلا حساب: اسم + هاتف + رسالة، بلا تسجيل دخول، يراها البائع في
//     صندوقه ويتصل به مباشرة (لا حاجة لإشعار فوري — SMTP/واتساب الحقيقي
//     مؤجَّل حسب قرار Limam السابق حتى تسجيل الشركة).
// (2) مشتري صاحب حساب فردي معتمد: محادثة ثنائية كاملة يراها في صندوقه
//     الخاص، ويقدر يرى ردود البائع لاحقاً.
// كل الرسائل تُجمَّع بمفتاح "محادثة" واحد لكل (بائع + مشتري)، سواء كان
// المشتري ضيفاً (بمفتاح مبني على رقم هاتفه) أو صاحب حساب حقيقي.
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
function readMessages() { return readJson(MESSAGES_FILE, []); }
function writeMessages(list) { writeJson(MESSAGES_FILE, list); }

function buildThreadKey(sellerAccountId, buyerAccountId, buyerPhone) {
  const buyerPart = buyerAccountId ? ('acc:' + buyerAccountId) : ('guest:' + String(buyerPhone || '').replace(/\D/g, ''));
  return sellerAccountId + '::' + buyerPart;
}

const messagesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الرسائل — حاول لاحقاً' },
});

/**
 * POST /api/messages — إرسال أول رسالة أو رسالة تكميلية من طرف المشتري.
 * body: { sellerAccountId, buyerAccountId?, buyerName, buyerPhone, adId?,
 *         adTitle?, body }
 * إن أُرسل buyerAccountId يجب أن يطابق x-account-token حقيقياً (لا يمكن
 * انتحال هوية مشترٍ آخر)؛ وإلا تُعامَل كرسالة زائر (guest) بمفتاح الهاتف.
 */
app.post('/api/messages', messagesLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.sellerAccountId) return res.status(400).json({ error: 'sellerAccountId مطلوب' });
  if (!b.body || !String(b.body).trim()) return res.status(400).json({ error: 'نص الرسالة مطلوب' });
  let buyerAccountId = null;
  if (b.buyerAccountId) {
    const token = req.header('x-account-token') || '';
    const buyerAcc = verifyAccountOwner(b.buyerAccountId, token);
    if (!buyerAcc) return res.status(401).json({ error: 'unauthorized' });
    buyerAccountId = b.buyerAccountId;
  } else if (!b.buyerPhone || !String(b.buyerPhone).trim()) {
    return res.status(400).json({ error: 'رقم الهاتف مطلوب للزائر غير المسجَّل' });
  }
  const threadKey = buildThreadKey(b.sellerAccountId, buyerAccountId, b.buyerPhone);
  const list = readMessages();
  const rec = {
    id: 'MSG-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    threadKey,
    sellerAccountId: b.sellerAccountId,
    buyerAccountId,
    buyerName: String(b.buyerName || '').slice(0, 100),
    buyerPhone: String(b.buyerPhone || '').slice(0, 30),
    adId: b.adId ? String(b.adId).slice(0, 80) : null,
    adTitle: b.adTitle ? String(b.adTitle).slice(0, 200) : null,
    body: String(b.body).slice(0, 3000),
    fromRole: 'buyer',
    read: false,
    createdAt: new Date().toISOString(),
  };
  list.push(rec);
  writeMessages(list);
  res.json({ ok: true, threadKey, message: rec });

  const sellerAcc = readAccounts().find((a) => a.id === b.sellerAccountId);
  if (sellerAcc) {
    setImmediate(() => {
      maybeAutoReplyToInquiry({
        sellerAccount: sellerAcc,
        buyerMessage: rec,
        threadKey,
        readMessagesFn: readMessages,
        writeMessagesFn: writeMessages,
      }).catch((e) => console.error('[inquiry-auto-reply]', e.message));
    });
  }
});

/**
 * POST /api/messages/reply — ردّ البائع (صاحب الحساب فقط، عبر x-account-token)
 * body: { sellerAccountId, threadKey, body }
 */
app.post('/api/messages/reply', messagesLimiter, (req, res) => {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const seller = verifyAccountOwner(b.sellerAccountId, token);
  if (!seller) return res.status(401).json({ error: 'unauthorized' });
  if (!b.threadKey || b.threadKey.indexOf(b.sellerAccountId + '::') !== 0) {
    return res.status(400).json({ error: 'threadKey غير صالح' });
  }
  if (!b.body || !String(b.body).trim()) return res.status(400).json({ error: 'نص الرسالة مطلوب' });
  const list = readMessages();
  const rec = {
    id: 'MSG-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    threadKey: b.threadKey,
    sellerAccountId: b.sellerAccountId,
    buyerAccountId: null,
    buyerName: '',
    buyerPhone: '',
    adId: null,
    adTitle: null,
    body: String(b.body).slice(0, 3000),
    fromRole: 'seller',
    read: true,
    createdAt: new Date().toISOString(),
  };
  list.push(rec);
  writeMessages(list);
  res.json({ ok: true, message: rec });
});

/** GET /api/messages/threads?accountId=...&token=... — صندوق وارد البائع: قائمة محادثات مجمّعة */
app.get('/api/messages/threads', (req, res) => {
  const accountId = req.query.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readMessages().filter((m) => m.sellerAccountId === accountId);
  const accountsById = new Map(readAccounts().map((a) => [a.id, a]));
  const byThread = new Map();
  list.forEach((m) => {
    if (!byThread.has(m.threadKey)) byThread.set(m.threadKey, []);
    byThread.get(m.threadKey).push(m);
  });
  const threads = Array.from(byThread.entries()).map(([threadKey, msgs]) => {
    msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const lastMessage = msgs[msgs.length - 1];
    // نجمع اسم/هاتف/إعلان المشتري من أي رسالة تحمله في المحادثة (لا نعتمد
    // فقط على آخر رسالة، لأن ردود البائع أو رسائل المشتري اللاحقة لا تحمل
    // هذه الحقول من الأساس) — ولحساب مسجَّل نعرض اسمه الحقيقي من accounts.json.
    const buyerAccountId = msgs.find((m) => m.buyerAccountId)?.buyerAccountId || null;
    const buyerAcc = buyerAccountId ? accountsById.get(buyerAccountId) : null;
    const buyerName = buyerAcc ? (buyerAcc.name || '') : (msgs.find((m) => m.buyerName)?.buyerName || '');
    const buyerPhone = buyerAcc ? (buyerAcc.phone || '') : (msgs.find((m) => m.buyerPhone)?.buyerPhone || '');
    const adRef = msgs.find((m) => m.adId);
    return {
      threadKey,
      buyerAccountId,
      buyerName,
      buyerPhone,
      adId: adRef ? adRef.adId : null,
      adTitle: adRef ? adRef.adTitle : null,
      lastMessage,
      unreadCount: msgs.filter((m) => m.fromRole === 'buyer' && !m.read).length,
    };
  }).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  res.json({ ok: true, threads });
});

/** GET /api/messages/mine?accountId=...&token=... — صندوق وارد المشتري صاحب حساب فردي: كل محادثاته عبر كل البائعين */
app.get('/api/messages/mine', (req, res) => {
  const accountId = req.query.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readMessages().filter((m) => m.buyerAccountId === accountId || (m.threadKey && m.threadKey.indexOf('::acc:' + accountId) !== -1));
  const byThread = new Map();
  list.forEach((m) => {
    const existing = byThread.get(m.threadKey);
    if (!existing || new Date(m.createdAt) > new Date(existing.lastMessage.createdAt)) {
      byThread.set(m.threadKey, { threadKey: m.threadKey, sellerAccountId: m.sellerAccountId, adId: m.adId, adTitle: m.adTitle, lastMessage: m });
    }
  });
  const threads = Array.from(byThread.values()).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  res.json({ ok: true, threads });
});

/**
 * GET /api/messages/thread/:threadKey — كل رسائل محادثة واحدة. مسموح
 * للبائع (صاحب threadKey) أو للمشتري صاحب الحساب (إن كانت محادثة مرتبطة
 * بحساب لا بضيف) — عبر x-account-token يطابق أحد الطرفين.
 */
app.get('/api/messages/thread/:threadKey', (req, res) => {
  const threadKey = req.params.threadKey;
  const sellerAccountId = threadKey.split('::')[0];
  const token = extractAccountToken(req) || '';
  const asSeller = verifyAccountOwner(sellerAccountId, token);
  let asBuyer = null;
  const buyerMatch = /::acc:(.+)$/.exec(threadKey);
  if (buyerMatch) asBuyer = verifyAccountOwner(buyerMatch[1], token);
  if (!asSeller && !asBuyer) return res.status(401).json({ error: 'unauthorized' });
  const list = readMessages().filter((m) => m.threadKey === threadKey).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ ok: true, messages: list });
});

/** PATCH /api/messages/thread/:threadKey/read — البائع يعلّم المحادثة كمقروءة */
app.patch('/api/messages/thread/:threadKey/read', (req, res) => {
  const threadKey = req.params.threadKey;
  const sellerAccountId = threadKey.split('::')[0];
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(sellerAccountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readMessages();
  let changed = 0;
  list.forEach((m) => { if (m.threadKey === threadKey && m.fromRole === 'buyer' && !m.read) { m.read = true; changed++; } });
  if (changed) writeMessages(list);
  res.json({ ok: true, updated: changed });
});

// ══════════════════════════════════════════════════════════════════
// التقييمات/المراجعات (rizq_reviews_engine.js سابقاً) — بنية حقيقية
// ══════════════════════════════════════════════════════════════════
// الملف الأصلي rizq_reviews_engine.js كان يحمل تعليقاً صريحاً يعترف بأنه
// "لا يوجد خادم/قاعدة بيانات حقيقية لهذا الجزء" — هذا القسم يبني ذلك
// الخادم فعلياً، بنفس توقيع الدوال (targetId + rating/comment/reviewerName)
// حتى تبقى واجهة rizq_reviews_engine.js قابلة للاستبدال بطبقة fetch رقيقة
// بلا تغيير جوهري في بقية الملفات المستهلِكة لها (task #245).
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
function readReviews() { return readJson(REVIEWS_FILE, {}); } // { [targetId]: [review, ...] }
function writeReviews(obj) { writeJson(REVIEWS_FILE, obj); }
function genReviewId() { return 'RV-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

const reviewsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من التقييمات — حاول لاحقاً' },
});

/**
 * POST /api/reviews — إضافة تقييم. body: { targetId, rating(1-5 صحيح),
 * comment?, reviewerName?, reviewerAccountId? }. إن أُرسل reviewerAccountId
 * (مشترٍ صاحب حساب) نتحقق من x-account-token الحقيقي ونمنع تكرار التقييم
 * لنفس الحساب على نفس الهدف بشكل حقيقي غير قابل للتجاوز (بخلاف حارس
 * localStorage القديم الذي كان يُلغى بمجرد مسح بيانات المتصفح).
 */
app.post('/api/reviews', reviewsLimiter, (req, res) => {
  const b = req.body || {};
  if (!b.targetId) return res.status(400).json({ error: 'targetId مطلوب' });
  const rating = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating);
  if (typeof rating !== 'number' || isNaN(rating) || !isFinite(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating يجب أن يكون عدداً صحيحاً بين 1 و5' });
  }
  let reviewerAccountId = null;
  if (b.reviewerAccountId) {
    const token = req.header('x-account-token') || '';
    const reviewerAcc = verifyAccountOwner(b.reviewerAccountId, token);
    if (!reviewerAcc) return res.status(401).json({ error: 'unauthorized' });
    reviewerAccountId = b.reviewerAccountId;
  }
  const all = readReviews();
  const list = all[b.targetId] || [];
  if (reviewerAccountId && list.some((r) => r.reviewerAccountId === reviewerAccountId)) {
    return res.status(409).json({ error: 'already_reviewed' });
  }
  const review = {
    id: genReviewId(),
    rating,
    comment: String(b.comment == null ? '' : b.comment).trim().slice(0, 500),
    reviewerName: String(b.reviewerName == null ? '' : b.reviewerName).trim().slice(0, 60),
    reviewerAccountId,
    createdAt: new Date().toISOString(),
  };
  list.unshift(review);
  all[b.targetId] = list;
  writeReviews(all);
  res.json({ ok: true, review });
});

/** GET /api/reviews/:targetId — أحدث تقييم أولاً (عام) */
app.get('/api/reviews/:targetId', (req, res) => {
  const all = readReviews();
  const list = (all[req.params.targetId] || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, reviews: list });
});

/** GET /api/reviews/:targetId/stats — {count, average} بلا قسمة على صفر (عام) */
app.get('/api/reviews/:targetId/stats', (req, res) => {
  const all = readReviews();
  const list = all[req.params.targetId] || [];
  const count = list.length;
  if (!count) return res.json({ ok: true, count: 0, average: 0 });
  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  res.json({ ok: true, count, average: Math.round((sum / count) * 10) / 10 });
});

/**
 * DELETE /api/reviews/:targetId/:reviewId — حذف تقييم (لموديريشن البائع
 * صاحب targetId، عبر x-account-token، أو الأدمن عبر x-rizq-secret).
 */
app.delete('/api/reviews/:targetId/:reviewId', (req, res) => {
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!verifyAccountOwner(req.params.targetId, token);
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  const all = readReviews();
  const list = all[req.params.targetId] || [];
  const next = list.filter((r) => r.id !== req.params.reviewId);
  if (next.length === list.length) return res.status(404).json({ error: 'review_not_found' });
  all[req.params.targetId] = next;
  writeReviews(all);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════
// فريق عمل الشركة/المعرض (task #246) — كان مبنياً بالكامل على
// localStorage['rizq_team_'+accountId] في rizq_dashboard_corp.html فقط
// (بلا أي حذف ممكن أصلاً، ولا أي مزامنة عبر الأجهزة). نفس نمط الكتالوج
// تماماً: صاحب الحساب (عبر x-account-token) يضيف/يحذف، والقائمة عامة
// (بلا أرقام هواتف) لصفحة المعرض العامة مستقبلاً إن رغب Limam بعرضها.
// ══════════════════════════════════════════════════════════════════
const TEAM_FILE = path.join(DATA_DIR, 'team.json');
function readTeam() { return readJson(TEAM_FILE, []); }
function writeTeam(list) { writeJson(TEAM_FILE, list); }
function genTeamId() { return 'TM-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

/** POST /api/team — إضافة عضو فريق (صاحب الحساب فقط) */
app.post('/api/team', (req, res) => {
  const b = req.body || {};
  const token = req.header('x-account-token') || '';
  const acc = verifyAccountOwner(b.accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
  const list = readTeam();
  const rec = {
    id: genTeamId(),
    accountId: b.accountId,
    name: String(b.name).slice(0, 100),
    role: String(b.role || '').slice(0, 100),
    phone: String(b.phone || '').slice(0, 40),
    emoji: String(b.emoji || '👤').slice(0, 8),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  list.push(rec);
  writeTeam(list);
  res.json({ ok: true, member: rec });
});

/** GET /api/team?accountId=... — عرض عام (بلا هاتف) لصفحة المعرض العامة */
app.get('/api/team', (req, res) => {
  const accountId = req.query.accountId;
  let list = readTeam().filter((m) => m.status === 'active');
  if (accountId) list = list.filter((m) => m.accountId === accountId);
  res.json({ ok: true, members: list.map((m) => ({ id: m.id, name: m.name, role: m.role, emoji: m.emoji })) });
});

/** GET /api/team/mine?accountId=... — كل بيانات الفريق (بما فيها الهاتف) لصاحب الحساب فقط */
app.get('/api/team/mine', (req, res) => {
  const accountId = req.query.accountId;
  const token = extractAccountToken(req) || '';
  const acc = verifyAccountOwner(accountId, token);
  if (!acc) return res.status(401).json({ error: 'unauthorized' });
  const list = readTeam().filter((m) => m.accountId === accountId && m.status !== 'removed');
  res.json({ ok: true, members: list });
});

/** DELETE /api/team/:id — حذف ناعم (صاحب الحساب أو الأدمن) */
app.delete('/api/team/:id', (req, res) => {
  const list = readTeam();
  const idx = list.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'member_not_found' });
  const member = list[idx];
  const isAdmin = isAdminRequest(req);
  const token = req.header('x-account-token') || '';
  const isOwner = !!(member.accountId && verifyAccountOwner(member.accountId, token));
  if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
  list[idx].status = 'removed';
  writeTeam(list);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════
// تثبيت إعلان محدَّد "مميزة" (task #219) — كان مخزَّناً بالكامل في
// localStorage['rizq_ad_boosts'] على جهاز المتصفح الذي وافق منه الأدمن
// فقط (RizqSub.activateAdBoost في rizq_subscription_engine.js)، فلا يظهر
// أبداً على أي جهاز آخر — بما في ذلك الصفحة الرئيسية نفسها. الآن يُخزَّن
// أيضاً هنا (الأدمن فقط عبر x-rizq-secret، بعد موافقته الحقيقية على طلب
// الاشتراك)، ليصبح مصدراً حقيقياً موحَّداً تقرأ منه مهمة #234 (قسم
// "ينتهي قريباً" على الرئيسية). لا يُغيَّر مسار isAdBoosted() المحلي
// الحالي المستخدم في browse/search/listing — إضافة صرفة فقط.
// ══════════════════════════════════════════════════════════════════
const AD_BOOSTS_FILE = path.join(DATA_DIR, 'ad_boosts.json');
function readAdBoosts() { return readJson(AD_BOOSTS_FILE, {}); }
function writeAdBoosts(obj) { writeJson(AD_BOOSTS_FILE, obj); }

/** POST /api/ad-boosts — الأدمن فقط، بعد موافقته الفعلية على طلب "مميزة" */
app.post('/api/ad-boosts', requireAdminAuth, (req, res) => {
  const b = req.body || {};
  if (!b.accountId || !b.adId) return res.status(400).json({ error: 'accountId و adId مطلوبان' });
  const days = Number(b.days) > 0 ? Number(b.days) : 3;
  const now = new Date();
  const ends = new Date(now.getTime() + days * 86400000);
  const all = readAdBoosts();
  all[b.adId] = {
    adId: b.adId,
    accountId: b.accountId,
    activatedAt: now.toISOString(),
    endsAt: ends.toISOString(),
    price: Number(b.price) || 0,
  };
  writeAdBoosts(all);
  res.json({ ok: true, boost: all[b.adId] });
});

/** GET /api/ad-boosts/:adId — عام، هل هذا الإعلان مثبَّت الآن؟ */
app.get('/api/ad-boosts/:adId', (req, res) => {
  const all = readAdBoosts();
  const b = all[req.params.adId];
  const active = !!(b && b.endsAt && new Date(b.endsAt) > new Date());
  res.json({ ok: true, active, boost: active ? b : null });
});

// ══════════════════════════════════════════════════════════════════
// Telegram Admin Bot — إشعار فوري + تفعيل/رفض مباشر من Inline Buttons
// متغيرات البيئة: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID
// اختياري: TELEGRAM_WEBHOOK_SECRET, PUBLIC_BASE_URL (لتسجيل webhook)
// ══════════════════════════════════════════════════════════════════
const { setTelegramDeps } = require('./services/telegramDeps');
const {
  isBotConfigured: isTelegramBotConfigured,
  isConfigured: isTelegramAdminConfigured,
  verifyWebhookSecret,
  handleWebhookUpdate,
  registerWebhook: registerTelegramWebhook,
  shouldUsePolling: shouldUseTelegramPolling,
  startPolling: startTelegramPolling,
  stopPolling: stopTelegramPolling,
  getBotIdentity,
  getTelegramDiagnostics,
  sendLeadEscalationAlert,
  validateAdminChatAtStartup,
} = require('./services/telegramAdmin');

async function logTelegramEnvStatus() {
  const diag = getTelegramDiagnostics();
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const placeholder = !token || token.includes('ضع_المفتاح') || token.includes('YOUR_');
  const tokenShapeOk = /^[0-9]+:[A-Za-z0-9_-]{20,}$/.test(token);
  if (placeholder || !tokenShapeOk) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN: missing or placeholder — webhook disabled');
  } else {
    const botId = token.split(':')[0];
    console.log('[telegram] TELEGRAM_BOT_TOKEN: loaded (bot ' + botId + ':***)');
    try {
      const me = await getBotIdentity();
      if (me && me.username) {
        console.log('[telegram] bot username: @' + me.username + ' — راسِل هذا البوت مباشرة (محادثة خاصة)');
      }
    } catch (e) { /* optional */ }
  }
  if (!diag.adminChatId || diag.adminChatId === '(empty)') {
    console.warn('[telegram] admin chat id not set — set TELEGRAM_ADMIN_CHAT_ID or TELEGRAM_CHAT_ID for lead alerts');
  } else {
    console.log('[telegram] admin chat id: ' + diag.adminChatId + ' (from ' + diag.adminChatIdSource + ')');
  }
  if (!isTelegramAdminConfigured()) {
    console.warn('[telegram] lead/subscription alerts NOT fully configured:', diag);
  } else {
    await validateAdminChatAtStartup();
  }
  if (isTelegramBotConfigured()) {
    if (shouldUseTelegramPolling()) {
      console.log('[telegram] mode: POLLING (dev — TELEGRAM_USE_POLLING or no PUBLIC_BASE_URL)');
    } else {
      console.log('[telegram] mode: WEBHOOK → POST /api/telegram/webhook');
    }
  }
}

async function handleTelegramWebhook(req, res) {
  if (!verifyWebhookSecret(req)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (!isTelegramBotConfigured()) {
    return res.status(503).json({ error: 'telegram_bot_not_configured' });
  }
  try {
    const { getTelegramDeps } = require('./services/telegramDeps');
    const result = await handleWebhookUpdate(req.body || {}, getTelegramDeps() || {});
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[telegram/webhook] error:', err.message);
    res.status(500).json({ error: 'webhook_handler_failed' });
  }
}

setTelegramDeps({
  readSubRequests,
  writeSubRequests,
  anthropic,
  readAccounts,
  writeAccounts,
  syncAccountPackage,
  getAccountRecord,
  readAdBoosts,
  writeAdBoosts,
  registerSubscriber,
});

/**
 * POST /api/telegram/webhook — Telegram Bot API webhook (رسائل + أزرار الأدمن)
 */
app.post('/api/telegram/webhook', handleTelegramWebhook);

/**
 * POST /api/telegram/webhook/:secret — مسار قديم (توافق خلفي)
 */
app.post('/api/telegram/webhook/:secret', handleTelegramWebhook);

/**
 * POST /api/telegram/setup-webhook — أدمين فقط — يسجّل webhook لدى Telegram
 * body: { publicBaseUrl?: "https://your-domain.com" }
 */
app.post('/api/telegram/setup-webhook', requireAdminAuth, async (req, res) => {
  if (!isTelegramBotConfigured()) {
    return res.status(503).json({ error: 'telegram_bot_not_configured', hint: 'TELEGRAM_BOT_TOKEN in .env' });
  }
  try {
    const publicBaseUrl = (req.body && req.body.publicBaseUrl) || process.env.PUBLIC_BASE_URL || '';
    const out = await registerTelegramWebhook(publicBaseUrl);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (err) {
    console.error('[telegram/setup-webhook] error:', err.message);
    res.status(500).json({ error: err.message || 'setup_failed' });
  }
});

// ══════════════════════════════════════════════════════════════════
// اكتشاف الرئيسية (homepage discovery) — مهام #234/#235: نقطتا نهاية
// عامتان بلا مصادقة، آمنتان تماماً (لا تكشفان بيانات حسّاسة قط):
// - "ينتهي قريباً": إعلانات مثبَّتة قاربت مهلتها + عدد/فئات مناقصات مفتوحة
//   قاربت مهلتها (بلا عنوان/ميزانية/صاحب — نفس منطق /api/tenders/public-stats
//   المحجوب أصلاً خلف باقة مدفوعة، فلا يجوز كشف تفاصيلها هنا مجاناً).
// - "بائعون موثوقون": أعلى الحسابات تقييماً فعلياً (من نظام المراجعات
//   الحقيقي #244)، بحقول عامة آمنة فقط (toPublicAccount).
// ══════════════════════════════════════════════════════════════════

/** GET /api/discovery/ending-soon?hours=48 — إعلانات مثبّتة + مناقصات مفتوحة قاربت الانتهاء */
app.get('/api/discovery/ending-soon', (req, res) => {
  const hours = Number(req.query.hours) > 0 ? Number(req.query.hours) : 48;
  const now = Date.now();
  const windowMs = hours * 3600 * 1000;

  const boosts = readAdBoosts();
  const ads = readAds();
  const boostedAds = Object.values(boosts)
    .filter((b) => {
      const endsMs = new Date(b.endsAt).getTime();
      return !Number.isNaN(endsMs) && endsMs > now && endsMs - now <= windowMs;
    })
    .map((b) => {
      const ad = ads.find((a) => a.id === b.adId && a.status === 'active');
      if (!ad) return null;
      return {
        type: 'ad',
        adId: ad.id,
        title: ad.title,
        emoji: ad.emoji,
        price: ad.price,
        originalPrice: ad.originalPrice || '', // لعرض شارة الخصم على الشريط أيضاً
        wilaya: ad.wilaya,
        category: ad.category,
        endsAt: b.endsAt,
      };
    })
    .filter(Boolean)
    .sort((a, b2) => new Date(a.endsAt) - new Date(b2.endsAt));

  const tenders = readTenders().filter((t) => {
    if (t.status === 'removed') return false;
    const deadlineMs = new Date(t.deadline).getTime();
    return !Number.isNaN(deadlineMs) && deadlineMs > now && deadlineMs - now <= windowMs;
  });
  const endingSoonTenders = tenders
    .map((t) => ({ type: 'tender', category: t.category || null, endsAt: t.deadline }))
    .sort((a, b2) => new Date(a.endsAt) - new Date(b2.endsAt));

  res.json({
    ok: true,
    ads: boostedAds.slice(0, 12),
    tenders: endingSoonTenders.slice(0, 6),
    tendersTotalOpen: tenders.length,
  });
});

/** GET /api/discovery/top-sellers?limit=8&minReviews=2 — بائعون موثوقون فعلياً حسب تقييمات حقيقية */
app.get('/api/discovery/top-sellers', (req, res) => {
  const limit = Math.min(Number(req.query.limit) > 0 ? Number(req.query.limit) : 8, 30);
  const minReviews = Number(req.query.minReviews) >= 0 ? Number(req.query.minReviews) : 2;
  const allReviews = readReviews();
  const accounts = readAccounts().filter((a) => a.status === 'approved');

  const ranked = Object.keys(allReviews)
    .map((targetId) => {
      const list = allReviews[targetId] || [];
      const count = list.length;
      if (count < minReviews) return null;
      const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
      const average = Math.round((sum / count) * 10) / 10;
      const acc = accounts.find((a) => a.id === targetId);
      if (!acc) return null; // فقط حسابات معتمَدة وموجودة فعلاً (لا حسابات محذوفة/مرفوضة)
      return Object.assign({ count, average }, toPublicAccount(acc));
    })
    .filter(Boolean)
    .sort((a, b) => (b.average - a.average) || (b.count - a.count))
    .slice(0, limit);

  res.json({ ok: true, sellers: ranked });
});

// ── Corp Diamond Pro API integration (ERP/PMS) — rizq_live_* keys ─────────
const { setupIntegrationAPI } = require('./routes/integration');
setupIntegrationAPI(app, {
  verifyAccountOwner,
  readAccounts,
  readCatalog,
  readMessages,
  writeMessages,
  requireAdminAuth,
});

// ── تطوير محلي: صفحات HTML + API على نفس المنفذ (localhost:3000) ──
const FRONTEND_ROOT = path.join(__dirname, '..');
installAdminPanelGate(app, FRONTEND_ROOT);
if (process.env.NODE_ENV !== 'production' && process.env.RIZQ_SERVE_STATIC !== '0') {
  app.get('/', (_req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/rizq-backend')) return notFoundHandler(req, res);
    next();
  });
  app.use(express.static(FRONTEND_ROOT, { index: false, dotfiles: 'ignore' }));
  console.log('[rizq-backend] dev static files → ' + FRONTEND_ROOT);
}

const PORT = process.env.PORT || 3000;
app.use(notFoundHandler);
app.use(globalErrorHandler);

startMaintenanceScheduler({
  readAds,
  writeAds,
  readAccounts,
  getAccountRecord,
  adsUploadsDir: ADS_UPLOADS_DIR,
  dataDir: DATA_DIR,
  backendRoot: __dirname,
});

app.listen(PORT, async () => {
  console.log('[rizq-backend] running on port ' + PORT);
  console.log('[rizq-backend] agent model (Sonnet only): ' + getAgentModel());
  await logTelegramEnvStatus();
  if (isTelegramAdminConfigured()) {
    console.log('[telegram-admin] subscription alerts enabled');
  }
  if (shouldUseTelegramPolling()) {
    const { getTelegramDeps } = require('./services/telegramDeps');
    startTelegramPolling(getTelegramDeps).then((out) => {
      if (out && out.ok) console.log('[telegram-polling] listening for messages…');
    }).catch((err) => {
      console.error('[telegram-polling] start failed:', err.message);
    });
  }
  autoRefreshCurrencyRatesIfStale().catch(function () {});
  setInterval(function () {
    autoRefreshCurrencyRatesIfStale().catch(function () {});
  }, CURRENCY_AUTO_REFRESH_MS);
});

process.on('SIGINT', () => { stopTelegramPolling(); process.exit(0); });
process.on('SIGTERM', () => { stopTelegramPolling(); process.exit(0); });
