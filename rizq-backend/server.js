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
const repos = require('./db/repos');
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
const { timingSafeEqualStr } = require('./lib/secureCompare');
const { normalizeDisplayName, normalizeEmailSafe, stripBidiControls } = require('./lib/sanitizeText');
const { installAdminPanelGate } = require('./middleware/adminPanelGate');
const { registerSubscriber, getSubscriberProfile, getAllSubscriberProfiles, getSubscriberProfileByAccountId, upsertSubscriberKnowledgeFromAccount, upsertSubscriberInstructionsFromAccount } = require('../rizq_subscriber_agent');
const { normalizeAccountActivityFields, loadCatalog } = require('./services/merchantActivities');
const { refreshCurrencyRates, sanitizeCurrencyList, mergeCurrencyConfig } = require('./services/currencyRates');
const { parseKnowledgeFile, formatDynamicKnowledgeForPrompt } = require('./services/dynamicKnowledge');
const { recordUsage, setupQuotaGuardAPI } = require('../rizq_quota_guard_agent');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

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
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.set('Cross-Origin-Resource-Policy', 'same-site');
  res.set('X-DNS-Prefetch-Control', 'off');
  res.set('X-Rizq-Platform', 'Rizq-ADMINIA-SARL');
  res.set('X-Copyright', '(c) Rizq ADMINIA SARL - Proprietary. Unauthorized copying prohibited.');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; "
    + "img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; "
    + "font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; "
    + "script-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:;"
  );
  try {
    if (req.secure || String(req.headers['x-forwarded-proto'] || '') === 'https') {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  } catch (eHsts) {}
  /* لا تخزين مؤقت لاستجابات المصادقة/الجلسات */
  if (/^\/api\/(admin\/login|admin\/verify|accounts\/seller-login|accounts\/password|auth\/|otp\/)/i.test(req.path)) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
  }
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
const DEFAULT_MODULE_FLAGS = { individual: true, store: true, office: true, corp: true, tenders: true, videoAds: true };
function getModuleFlags() {
  const cfg = repos.getSiteConfig();
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
  const cfg = repos.getSiteConfig();
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
  const cfg = repos.getSiteConfig();
  const stored = (cfg.sectionRules && typeof cfg.sectionRules === 'object') ? cfg.sectionRules : {};
  const out = {};
  Object.keys(DEFAULT_SECTION_RULES).forEach((key) => {
    out[key] = Object.assign({}, DEFAULT_SECTION_RULES[key], stored[key] || {});
  });
  return out;
}

// ── ملفات إعلانات رزق الحقيقية تُخدَّم كملفات ثابتة عبر /uploads ────────
// (انظر قسم "إعلانات رزق الحقيقية" أسفل الملف لتفاصيل saveAdImages)
// مرفقات المناقصات والاستثمارات — لا تُخدم مباشرة عبر static
app.use('/uploads/tenders', (req, res) => {
  res.status(403).json({
    error: 'tender_assets_forbidden',
    msg: 'مرفقات المناقصة محمية — يلزم اشتراك للوصول',
    msg_fr: 'Pièces jointes protégées — abonnement requis',
  });
});
app.use('/uploads/investments', (req, res) => {
  res.status(403).json({
    error: 'investment_assets_forbidden',
    msg: 'مرفقات الاستثمار محمية — للمراجعة الداخلية فقط',
    msg_fr: 'Pièces jointes d\'investissement protégées — revue interne uniquement',
  });
});
// وسائط الإعلانات/الكتالوج — عامة فقط إن كانت الحالة منشورة/نشطة
app.use('/uploads/ads', (req, res, next) => {
  try {
    const adId = String(req.path || '').split('/').filter(Boolean)[0] || '';
    const ad = adId ? repos.ads.getById(adId) : null;
    const st = String(ad && ad.status || '');
    if (!ad || !['active', 'approved', 'published'].includes(st)) {
      return res.status(403).json({ error: 'ad_media_forbidden', msg: 'وسائط الإعلان غير متاحة' });
    }
    return next();
  } catch (e) {
    return res.status(403).json({ error: 'ad_media_forbidden' });
  }
});
app.use('/uploads/catalog', (req, res, next) => {
  try {
    const itemId = String(req.path || '').split('/').filter(Boolean)[0] || '';
    const item = itemId
      ? (repos.catalog.list().find((c) => c && c.id === itemId) || null)
      : null;
    const st = String(item && item.status || '');
    if (!item || st !== 'active') {
      return res.status(403).json({ error: 'catalog_media_forbidden', msg: 'وسائط الكتالوج غير متاحة' });
    }
    return next();
  } catch (e) {
    return res.status(403).json({ error: 'catalog_media_forbidden' });
  }
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── CORS: أصول مسموحة (ALLOWED_ORIGIN قائمة مفصولة بفواصل)
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
/* أمان خارجي: أصول التطوير المحلية تُضاف فقط خارج الإنتاج */
if (!isProdEnv()) {
  LOCAL_DEV_ORIGINS.forEach((o) => { if (!ALLOWED_ORIGINS.includes(o)) ALLOWED_ORIGINS.push(o); });
}
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) {
      return cb(null, !isProdEnv());
    }
    if (origin === 'null') {
      return cb(null, !isProdEnv());
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // معاينة GitHub Pages — للتطوير/الاختبار فقط، وليس في الإنتاج
    if (!isProdEnv() && /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return cb(null, true);
    cb(new Error('غير مسموح من هذا الأصل (CORS)'));
  },
}));

// ── Rate limit: حماية حصة Claude API من الاستهلاك العشوائي ─────────
// في التطوير/المراجعة ارفع السقف كثيراً حتى لا تُغلق المنصة بعد اختبارات الأمان.
// الإنتاج يبقى صارماً (60 / 15 دقيقة). يمكن تجاوز السقف بـ API_RATE_LIMIT_MAX.
const API_RATE_MAX = Number(process.env.API_RATE_LIMIT_MAX)
  || (isProdEnv() ? 60 : 5000);
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: API_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // مسارات القراءة العامة للواجهة — لا تُحسب ضد حد الحماية من الاستهلاك العشوائي
    // ملاحظة: عند mount على /api/ يكون req.path نسبياً (/site-config) وليس /api/site-config
    const p = String(req.path || '');
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    return p === '/health'
      || p === '/site-config'
      || p === '/otp/config'
      || p === '/merchant-activities'
      || p === '/ads'
      || p === '/ads/batch'
      || p.startsWith('/discovery/');
  },
}));

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
// سوبر أدمن المالك — الهاش من البيئة فقط في الإنتاج؛ لا هاشات تشغيلية في المصدر.
const OWNER_SUPER_ADMIN = {
  user: String(process.env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_USER || '').trim().toLowerCase() || 'owner@localhost',
  email: String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
  name: String(process.env.SUPER_ADMIN_NAME || 'Owner').trim() || 'Owner',
  role: 'super',
  passHash: String(process.env.SUPER_ADMIN_PASS_HASH || '').trim(),
};
const ADMIN_ACCOUNTS = OWNER_SUPER_ADMIN.passHash && OWNER_SUPER_ADMIN.passHash.startsWith('$2')
  ? [OWNER_SUPER_ADMIN]
  : [];
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة
const adminSessions = new Map(); // token -> { user, name, role, expiresAt }
const adminTeamService = require('./services/adminTeam');
const { hasAdminPermission, PANEL_PERMISSION_MAP } = require('./services/adminPermissions');
if (ADMIN_ACCOUNTS.length) adminTeamService.seedFromLegacyAccounts(ADMIN_ACCOUNTS);
if (OWNER_SUPER_ADMIN.passHash && OWNER_SUPER_ADMIN.passHash.startsWith('$2') && OWNER_SUPER_ADMIN.email) {
  adminTeamService.ensureOwnerSuperAdmin(OWNER_SUPER_ADMIN);
}
const { requireAdminSession, requireAdminAuth, requireAdminPermission, requireSharedSecret } = createAdminAuth({
  adminSessions,
  hasAdminPermission,
});
// مسارات /api/admin/login|verify|permissions|team|logout|daily-digest — في routes/adminCore.js عبر mountAdminCoreRoutes

function isBrowserLikeRequest(req) {
  const origin = req.header('origin');
  if (origin && origin !== 'null') return true;
  const secFetchSite = String(req.header('sec-fetch-site') || '').toLowerCase();
  return secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'cross-site';
}

/** يحلّ هوية الأدمن من الجلسة أو السرّ الخادمي */
function resolveAdminUser(req) {
  const adminTok = req.header('x-admin-token');
  if (adminTok) {
    const sess = adminSessions.get(adminTok);
    if (sess && sess.expiresAt >= Date.now()) return sess;
  }
  const got = req.header('x-rizq-secret');
  const secret = process.env.BACKEND_SHARED_SECRET || '';
  if (secret && got && timingSafeEqualStr(got, secret)) {
    if (isProdEnv() && isBrowserLikeRequest(req)) return null;
    return { user: 'server', name: 'Server', role: 'super', permissions: ['*'] };
  }
  return null;
}

function isAdminRequest(req) {
  return !!resolveAdminUser(req);
}

/** فحص صلاحية RBAC لمسارات تستخدم isAdminRequest بدل middleware */
function adminHasPermission(req, ...keys) {
  const u = resolveAdminUser(req);
  if (!u) return false;
  return hasAdminPermission(u.permissions || [], keys.length ? keys : ['*']);
}

const anthropic = new Anthropic({ apiKey: getAnthropicApiKey() });

app.get('/health', (req, res) => res.json({ ok: true }));

// دليل المساعدة العام للزوّار = HTML فقط.
// الأدلة التقنية (MD) محجوبة عن الزوّار وتتطلّب مصادقة أدمن.
const HELP_PUBLIC_HTML = path.join(__dirname, '..', 'rizq_help.html');
const HELP_GUIDE_FILES = {
  'help-visual': HELP_PUBLIC_HTML,
  'dashboard-guide-visual': HELP_PUBLIC_HTML,
  'platform-manual': path.join(__dirname, '..', 'RIZQ_PLATFORM_MANUAL.md'),
  'dashboard-guide': path.join(__dirname, 'help', 'dashboard-guide.md'),
};
const HELP_ADMIN_ONLY_SLUGS = new Set(['platform-manual', 'dashboard-guide']);

app.get('/api/help-guide/:slug', (req, res, next) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (HELP_ADMIN_ONLY_SLUGS.has(slug)) {
    return requireAdminAuth(req, res, () => {
      const filePath = HELP_GUIDE_FILES[slug];
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ ok: false, error: 'guide_not_found', slug });
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="rizq-${slug}.md"`);
      return res.send(fs.readFileSync(filePath, 'utf8'));
    });
  }
  const filePath = HELP_GUIDE_FILES[slug];
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'guide_not_found', slug });
  }
  const ext = path.extname(filePath).toLowerCase();
  const inline = String(req.query.inline || '') === '1';
  if (ext === '.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!inline) res.setHeader('Content-Disposition', `inline; filename="rizq-${slug}.html"`);
    return res.send(fs.readFileSync(filePath, 'utf8'));
  }
  return res.status(404).json({ ok: false, error: 'guide_not_found', slug });
});
app.get('/api/help-guide', (req, res) => {
  res.json({
    ok: true,
    visualUrl: '/api/help-guide/help-visual?inline=1',
    guides: [
      { id: 'help-visual', url: '/api/help-guide/help-visual', visual: true, public: true, available: fs.existsSync(HELP_PUBLIC_HTML) },
    ],
  });
});

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
app.post('/api/subscriber/register', requireAdminPermission('subscriber-agents'), (req, res) => {
  const { subscriberId, ...profile } = req.body || {};
  if (!subscriberId || !profile.businessName) {
    return res.status(400).json({ error: 'subscriberId + businessName مطلوبان' });
  }
  try {
    const safeId = String(subscriberId).replace(/[^\w+\-@.]/g, '').slice(0, 40);
    const safeProfile = {
      plan: 'diamond',
      tier: 'diamond',
      widget_enabled: true,
      whatsapp_enabled: true,
      calls_enabled: true,
      businessName: normalizeDisplayName(profile.businessName, 120),
      businessType: String(profile.businessType || '').slice(0, 40),
      accountId: profile.accountId ? String(profile.accountId).slice(0, 60) : undefined,
      phone: profile.phone ? String(profile.phone).replace(/[^\d+]/g, '').slice(0, 20) : undefined,
      activity: profile.activity ? stripBidiControls(String(profile.activity)).normalize('NFC').slice(0, 200) : undefined,
    };
    registerSubscriber(safeId, safeProfile);
    res.json({ ok: true, message: 'تم تسجيل ' + safeProfile.businessName });
  } catch (err) {
    console.error('[subscriber/register] error:', err.message);
    res.status(500).json({ error: 'فشل التسجيل' });
  }
});

app.get('/api/subscriber/:id', requireAdminPermission('subscriber-agents'), (req, res) => {
  const profile = getSubscriberProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'subscriber_not_found' });
  // لا نُعيد حقولاً داخلية حساسة إن وُجدت
  const {
    apiKey, apiKeyHash, accessToken, dashToken, passHash, password,
    ...safe
  } = profile;
  res.json({ ok: true, profile: safe });
});

app.get('/api/subscribers', requireAdminPermission('subscriber-agents'), (req, res) => {
  try {
    const list = getAllSubscriberProfiles().map((row) => {
      const p = getSubscriberProfile(row.subscriberId) || {};
      return {
        id: row.subscriberId,
        accountId: row.accountId || null,
        name: p.businessName || '',
        type: p.businessType || '',
        plan: p.plan || '',
      };
    });
    res.json({ ok: true, count: list.length, subscribers: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'تعذّر جلب القائمة' });
  }
});

const { setActive, isActive, readAll: readAgentStatusAll } = require('./services/agentStatus');

function verifyAgentToggleSecret(secret) {
  const a = String(process.env.BACKEND_SHARED_SECRET || '');
  const b = String(process.env.RIZQ_API_SECRET || '');
  const got = String(secret || '');
  if (!got) return false;
  if (a && timingSafeEqualStr(got, a)) return true;
  if (b && timingSafeEqualStr(got, b)) return true;
  return false;
}

/** POST /api/agent/toggle — لوحات التحكم (Diamond) — تفعيل/إيقاف الوكيل الهاتفي */
app.post('/api/agent/toggle', (req, res) => {
  const b = req.body || {};
  const subscriberPhone = b.subscriberPhone;
  const active = b.active;
  const accountId = b.accountId;
  const token = extractAccountToken(req);
  // السرّ من الرأس فقط في الإنتاج؛ body مسموح في التطوير للتوافق مع خوادم المكالمات
  const secretHdr = req.header('x-rizq-secret') || '';
  const secretBody = (!isProdEnv() && b.secret) ? b.secret : '';
  let authorized = verifyAgentToggleSecret(secretHdr) || verifyAgentToggleSecret(secretBody);
  if (!authorized && accountId && token) {
    const acc = verifyAccountOwner(String(accountId).slice(0, 60), token);
    if (acc) {
      try {
        assertAiAgentAccess(acc, { channel: 'dashboard' });
      } catch (eAi) {
        return res.status(403).json({ ok: false, error: eAi.message || 'unauthorized', code: eAi.code });
      }
      const want = String(subscriberPhone || '').replace(/\D/g, '').slice(-8);
      const accPh = String(acc.phone || acc.whatsapp || '').replace(/\D/g, '').slice(-8);
      // يجب ربط التبديل برقم الحساب — لا IDOR عند غياب الهاتف
      if (!want || !accPh || want !== accPh) {
        return res.status(403).json({ ok: false, error: 'phone_mismatch', code: 'phone_mismatch' });
      }
      authorized = true;
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
app.get('/api/agent/status/:phone', requireAdminPermission('subscriber-agents'), (req, res) => {
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
app.get('/api/agent/status', requireAdminPermission('subscriber-agents'), (req, res) => {
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
app.post('/api/verify-receipt', requireAdminPermission('payments'), async (req, res) => {
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
app.post('/api/translate', requireAdminPermission('ai-manager'), async (req, res) => {
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
const { scanContactLeakFields } = require('./services/contactLeakGuard');
const { canAutoApproveAccountType } = require('./config/verificationPolicy');
const { sendOtp, verifyOtp, sendBuyerOtp, verifyBuyerOtp, consumeBuyerVerificationByEmail, sendSellerResetOtp, verifySellerResetOtp, consumeSellerResetVerification, getPublicOtpConfig } = require('./services/otpService');
const {
  saveAdImages,
  saveCatalogImages,
  saveCatalogImage,
  saveTenderImages,
  saveInvestmentImages,
} = require('./services/imagePipeline');
const {
  saveTenderDocument,
  saveInvestmentDocument,
  resolveTenderDocumentAbsPath,
  resolveTenderUploadAbsPath,
  extractPdfTextFromDataUri,
} = require('./services/tenderDocument');
const {
  buildSignedTenderAssetUrl,
  verifyTenderAssetSig,
} = require('./services/tenderAssetAuth');
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
app.get('/api/telegram/status', requireAdminPermission('channels'), async (req, res) => {
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
app.post('/api/telegram/test-lead-alert', requireAdminPermission('channels'), async (req, res) => {
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
    const token = extractAccountToken(req) || '';
    const accountId = String(
      (body.profile && body.profile.accountId) || body.accountId || ''
    ).trim();

    if (accountId) {
      let acc = null;
      if (token) {
        acc = verifyAccountOwner(accountId, token);
        if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
      } else {
        // زائر عام على صفحة التاجر — نثق بالخادم فقط لا بـ profile العميل
        acc = readAccounts().find((a) => a.id === accountId) || null;
        if (!acc || acc.status !== 'approved' || acc.suspended) {
          return res.status(403).json({ ok: false, error: 'الوكيل غير متاح', code: 'merchant_inactive' });
        }
      }
      try {
        assertAiAgentAccess(acc, { channel: 'widget' });
      } catch (e) {
        const ent = getAccountEntitlements(acc);
        const status = e.status && e.status >= 400 ? e.status : 403;
        return res.status(status).json({
          ok: false,
          error: e.code === 'quota_exhausted' ? (e.message || 'تم استنفاد الحصة') : resolveAccessDenialMessage(ent),
          code: e.code || ent.subscriptionStatus,
        });
      }
      body.accountId = accountId;
      body.profile = buildProfileFromAccount(acc);
      body.agentTier = 'diamond';
    } else {
      // مساعد المنصة العام — امنع انتحال الباقة الماسية من العميل
      if (body.profile && typeof body.profile === 'object') {
        delete body.profile.tier;
        delete body.profile.plan;
        delete body.profile.dynamicKnowledge;
        delete body.profile.customInstructions;
        delete body.profile.accountId;
      }
      if (String(body.agentTier || '').toLowerCase() === 'diamond') {
        body.agentTier = 'standard';
      }
    }

    const result = await handleWidgetChat(body);
    res.json(result);
  } catch (err) {
    console.error('[widget/chat] error:', err.message);
    const status = err.status && err.status >= 400 ? err.status : 500;
    res.status(status).json({
      ok: false,
      error: status >= 500 ? 'تعذّر الرد الآلي' : (err.message || 'تعذّر الرد الآلي'),
      code: err.code || undefined,
    });
  }
});

/** POST /api/ai/chat — alias for Diamond widget agent (same engine as /api/widget/chat) */
app.post('/api/ai/chat', widgetChatLimiter, async (req, res) => {
  try {
    const body = Object.assign({}, req.body || {});
    const token = extractAccountToken(req) || '';
    const accountId = String(
      (body.profile && body.profile.accountId) || body.accountId || ''
    ).trim();

    if (accountId) {
      let acc = null;
      if (token) {
        acc = verifyAccountOwner(accountId, token);
        if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
      } else {
        acc = readAccounts().find((a) => a.id === accountId) || null;
        if (!acc || acc.status !== 'approved' || acc.suspended) {
          return res.status(403).json({ ok: false, error: 'الوكيل غير متاح', code: 'merchant_inactive' });
        }
      }
      try {
        assertAiAgentAccess(acc, { channel: 'widget' });
      } catch (e) {
        const ent = getAccountEntitlements(acc);
        const status = e.status && e.status >= 400 ? e.status : 403;
        return res.status(status).json({
          ok: false,
          error: e.code === 'quota_exhausted' ? (e.message || 'تم استنفاد الحصة') : resolveAccessDenialMessage(ent),
          code: e.code || ent.subscriptionStatus,
        });
      }
      body.accountId = accountId;
      body.profile = buildProfileFromAccount(acc);
      body.agentTier = 'diamond';
    } else {
      if (body.profile && typeof body.profile === 'object') {
        delete body.profile.tier;
        delete body.profile.plan;
        delete body.profile.dynamicKnowledge;
        delete body.profile.customInstructions;
        delete body.profile.accountId;
      }
      if (String(body.agentTier || '').toLowerCase() === 'diamond') {
        body.agentTier = 'standard';
      }
    }

    const result = await handleWidgetChat(body);
    res.json(result);
  } catch (err) {
    console.error('[ai/chat] error:', err.message);
    const status = err.status && err.status >= 400 ? err.status : 500;
    res.status(status).json({
      ok: false,
      error: status >= 500 ? 'تعذّر الرد الآلي' : (err.message || 'تعذّر الرد الآلي'),
      code: err.code || undefined,
    });
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
    const acc = readAccounts().find((a) => a.id === accountId);
    if (!acc) return res.status(404).json({ ok: false, error: 'account_not_found' });
    const token = extractAccountToken(req) || req.header('x-account-token') || '';
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
    if (!isAnthropicConfigured()) {
      return res.status(503).json({ ok: false, error: 'AI غير مفعّل حالياً', code: 'ai_unavailable' });
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
    res.status(status).json({
      ok: false,
      error: status >= 500 ? 'تعذّر الرد' : (err.message || 'تعذّر الرد'),
      code: err.code || undefined,
    });
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
  // Short cache so admin package/announcement edits reach visitors quickly.
  res.set('Cache-Control', 'public, max-age=10');
  const raw = repos.getSiteConfig() || {};
  const publicCfg = {
    moduleFlags: getModuleFlags(),
    platformFlags: getPlatformFlags(),
    sectionRules: getSectionRules(),
    otp: getPublicOtpConfig(),
    packages: raw.packages || undefined,
    prices: raw.prices || undefined,
    promoVideo: raw.promoVideo || undefined,
    videoAds: raw.videoAds || undefined,
    announcements: raw.announcements || undefined,
    legalOverrides: raw.legalOverrides || undefined,
    currency: raw.currency || undefined,
    quotaConfig: raw.quotaConfig || undefined,
    quotaTopups: raw.quotaTopups || undefined,
    bankCodes: Array.isArray(raw.bankCodes) ? raw.bankCodes : undefined,
  };
  // لا نُسرّب webhookUrl / قنوات داخلية / أسرار تشغيل
  if (raw.channelsPublic && typeof raw.channelsPublic === 'object') {
    publicCfg.channelsPublic = {
      phone: raw.channelsPublic.phone || '',
      whatsapp: raw.channelsPublic.whatsapp || '',
      email: raw.channelsPublic.email || '',
      // webhookUrl محذوف عمداً من الواجهة العامة
    };
  }
  res.json({ ok: true, config: publicCfg });
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
app.post('/api/site-config', requireAdminPermission('siteconfig'), (req, res) => {
  const body = req.body || {};
  const current = repos.getSiteConfig();
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

  if (Array.isArray(body.announcements)) {
    // إشعارات المنصة (شريط + بطاقة مميزة) — كانت localStorage فقط فلا تصل
    // للزوار على أجهزة أخرى. تُزامَن هنا مثل الباقات وmanagerConfig.
    next.announcements = body.announcements.slice(0, 40).map((a) => ({
      id: String(a.id || ('ann_' + Date.now())).slice(0, 60),
      type: String(a.type || 'info').slice(0, 20),
      titleAr: String(a.titleAr || '').slice(0, 200),
      titleFr: String(a.titleFr || '').slice(0, 200),
      textAr: String(a.textAr || '').slice(0, 500),
      textFr: String(a.textFr || '').slice(0, 500),
      ctaTextAr: String(a.ctaTextAr || '').slice(0, 80),
      ctaTextFr: String(a.ctaTextFr || '').slice(0, 80),
      ctaUrl: String(a.ctaUrl || '').slice(0, 500),
      pages: String(a.pages || 'all').slice(0, 80),
      expires: String(a.expires || '').slice(0, 20),
      showBar: a.showBar !== false,
      showSpotlight: !!a.showSpotlight,
      isPaid: !!a.isPaid,
      active: a.active !== false,
      createdAt: String(a.createdAt || new Date().toISOString()).slice(0, 40),
    }));
    next.announcementsUpdatedAt = new Date().toISOString();
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

  repos.saveSiteConfig(next);
  if (body.packages) {
    try {
      const pkgCfg = require('../rizq_packages_config');
      if (pkgCfg && typeof pkgCfg.invalidateRemoteCatalogCache === 'function') {
        pkgCfg.invalidateRemoteCatalogCache();
      }
    } catch (eInv) { /* ignore */ }
  }
  // لا نُعيد webhookUrl في ردّ الأدمن للمتصفح
  const { scrubSecretsForBackup } = require('./lib/scrubSecrets');
  res.json({ ok: true, config: scrubSecretsForBackup(next) });
});

/**
 * POST /api/currency-rates/refresh
 * أدمين — جلب أسعار العملات من الإنترنت (Frankfurter + fallback) مع تصحيح السوق %
 */
app.post('/api/currency-rates/refresh', requireAdminPermission('prices'), async (req, res) => {
  try {
    const current = repos.getSiteConfig();
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
    repos.saveSiteConfig(next);
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
    const current = repos.getSiteConfig();
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
    repos.saveSiteConfig(next);
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

// مسارات /api/ads/submit و /api/ads/requests — في routes/ads.js عبر mountAdsRoutes

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

const platformStore = require('./db/platformStore');
function readAccounts() { return repos.accounts.list(); }
function writeAccounts(list) { return repos.accounts.replaceAll(list); }

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
  // رسالة عامة — لا تؤكد وجود حساب آخر (تخفيف تعداد NNI)
  return {
    ok: false,
    code: 'nni_unavailable',
    error: 'تعذّر استخدام رقم الهوية هذا — تحقّق من الرقم أو تواصل مع الدعم',
    error_fr: "Ce numéro d'identité ne peut pas être utilisé — vérifiez-le ou contactez le support",
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
  const token = extractAccountToken(req);
  if (!accountId || !token) return null;
  const acc = readAccounts().find((a) => a.id === accountId);
  return (acc
    && acc.status === 'approved'
    && !acc.suspended
    && timingSafeEqualStr(acc.accessToken, token)) ? accountId : null;
}

function genAccountId() {
  return 'acc_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}
function genAccessToken() {
  return crypto.randomBytes(20).toString('hex');
}
function genDashToken() {
  return 'TK_' + crypto.randomBytes(32).toString('hex').toUpperCase();
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
  if (!acc) return null;
  const {
    accessToken,
    passHash,
    dashToken,
    idImage,
    id_image,
    licenseImage,
    activityImage2,
    activity_image2,
    receiptImage,
    ...safe
  } = acc;
  if (safe.id_verified) {
    delete safe.idImage;
    delete safe.id_image;
  }
  delete safe.password;
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
 * يتحقق من صيغة الرقم فقط. لا يكشف إن كان الرقم مستخدماً (تخفيف تعداد).
 * الفحص الحقيقي للتكرار يحدث عند POST /api/accounts.
 */
app.get('/api/accounts/nni-available', accountsRegisterLimiter, (req, res) => {
  const nni = normalizeNni(req.query.nni);
  if (!nni || !NNI_RE.test(nni)) {
    return res.status(400).json({
      ok: false,
      available: false,
      code: 'nni_invalid',
      error: 'رقم الهوية (NNI) غير صالح',
      error_fr: "Numéro d'identité (NNI) invalide",
    });
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
  const reqType = String(b.type || '').toLowerCase().trim();
  const ALLOWED_ACCOUNT_TYPES = ['individual', 'store', 'office', 'corp'];
  if (!ALLOWED_ACCOUNT_TYPES.includes(reqType)) {
    return res.status(400).json({ ok: false, error: 'نوع الحساب غير مدعوم', code: 'invalid_type' });
  }
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
  const sellerPassword = String(b.password || '').slice(0, 128);
  if (sellerEmail) {
    const emailTaken = list.some((a) => String(a.email || '').trim().toLowerCase() === sellerEmail);
    if (emailTaken) {
      return res.status(409).json({
        ok: false,
        code: 'email_in_use',
        error: 'البريد الإلكتروني مستخدم مسبقاً — سجّل الدخول أو استخدم بريداً آخر',
      });
    }
  }
  if (sellerPassword && sellerPassword.length < 8) {
    return res.status(400).json({
      ok: false,
      code: 'weak_password',
      error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    });
  }
  const passHash = sellerPassword ? bcrypt.hashSync(sellerPassword, 10) : null;
  // فرد/محل: تفعيل فوري فقط بعد إثبات ملكية البريد بـ OTP (عند otpRequired)
  // + كلمة مرور ≥8. لا يُقبل dashToken من العميل أبداً — الخادم يولّده.
  const platformFlags = getPlatformFlags();
  let autoApproved = false;
  let otpGate = null;
  if (canAutoApproveAccountType(reqType) && sellerEmail && sellerPassword.length >= 8) {
    if (platformFlags.otpRequired === false) {
      autoApproved = true;
    } else {
      try {
        otpGate = consumeBuyerVerificationByEmail(sellerEmail);
      } catch (eOtp) {
        otpGate = { ok: false, error: 'otp_required' };
      }
      autoApproved = !!(otpGate && otpGate.ok);
    }
  }
  const dashToken = autoApproved ? genDashToken() : null;
  const acc = {
    id,
    accessToken,
    type: reqType,
    name: normalizeDisplayName(b.name, 120),
    phone: String(b.phone || '').slice(0, 30),
    phoneIntl: String(b.phoneIntl || b.phone_intl || '').slice(0, 30),
    email: normalizeEmailSafe(b.email || ''),
    city: stripBidiControls(String(b.city || '')).normalize('NFC').slice(0, 60),
    category: activityFields.category || String(b.category || '').slice(0, 40),
    activityId: activityFields.activityId || String(b.activityId || '').slice(0, 80) || null,
    activity: activityFields.activity || String(b.activity || '').slice(0, 120) || null,
    packageId: String(b.packageId || b.package_id || '').slice(0, 40) || null,
    address: stripBidiControls(String(b.address || '')).normalize('NFC').slice(0, 200),
    desc: stripBidiControls(String(b.desc || '')).normalize('NFC').slice(0, 1000),
    promo_video: String(b.promo_video || '').slice(0, 500),
    whatsapp: String(b.whatsapp || '').slice(0, 60),
    facebook: String(b.facebook || '').slice(0, 300),
    thumb: String(b.thumb || '').slice(0, 2_000_000), // صورة base64 مصغّرة
    tagline: stripBidiControls(String(b.tagline || '')).normalize('NFC').slice(0, 50),
    // إصلاح 13/08/2026: حقلا التوثيق (NNI + صورة بطاقة التعريف/جواز السفر)
    // كانا يُجمَعان في واجهة التسجيل (rizq_landing_v8.html) لكن لا يصلان
    // الخادم إطلاقاً — يبقيان في localStorage متصفح المسجِّل فقط، فتصبح
    // شارة "موثّق" غير قابلة للتحقق من أي جهاز آخر (بما فيها لوحة الأدمن
    // نفسها إن فُتحت من متصفح مختلف). الآن يصلان الخادم فعلياً ويُخزَّنان
    // هنا — idImage لا يظهر أبداً في ACCOUNT_PUBLIC_FIELDS (خاص بصاحب
    // الحساب + الأدمن فقط، مثل الهاتف/الإيميل تماماً).
    nni,
    foreignId: String(b.foreignId || b.foreign_id || '').slice(0, 40),
    nationality: String(b.nationality || '').slice(0, 20),
    nationalityCountry: String(b.nationalityCountry || b.nationality_country || '').slice(0, 60),
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
    passHash: passHash || undefined,
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
  const regOut = {
    ok: true,
    id,
    accessToken,
    autoApproved: !!autoApproved,
    status: acc.status,
    type: acc.type,
    dashToken: dashToken || undefined,
  };
  if (!autoApproved && canAutoApproveAccountType(reqType) && platformFlags.otpRequired !== false) {
    regOut.otpRequired = true;
    regOut.code = (otpGate && otpGate.error) || 'otp_required';
    regOut.message = (otpGate && otpGate.message) || 'فعّل البريد برمز OTP لتفعيل الحساب فوراً، أو انتظر موافقة الإدارة';
  }
  res.json(regOut);

  // إشعار الأدمن تلقائياً عند تسجيل حساب جديد (لا يُبطئ رد العميل)
  setImmediate(() => {
    try {
      const { sendTelegramAdminNotification } = require('./services/telegramAdmin');
      sendTelegramAdminNotification({
        businessName: acc.name,
        whatsapp: acc.phone || acc.whatsapp || '',
        package: acc.type,
        reason: autoApproved ? 'تسجيل حساب جديد — مُفعَّل تلقائياً بعد OTP' : 'تسجيل حساب جديد — بانتظار الموافقة',
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
 * مسارات جلسة المشترك — مستخرجة إلى routes/accountsSession.js
 * (seller-login / activate-by-otp / password-reset / verify-dash)
 */
const { mountAccountsSessionRoutes } = require('./routes/accountsSession');
mountAccountsSessionRoutes(app, {
  bcrypt,
  readAccounts,
  writeAccounts,
  genDashToken,
  genAccessToken,
  extractAccountToken,
  extractDashToken,
  timingSafeEqualStr,
  canAutoApproveAccountType,
  consumeBuyerVerificationByEmail,
  sendSellerResetOtp,
  verifySellerResetOtp,
  consumeSellerResetVerification,
  purgeAccountIdDocument,
  accountsRegisterLimiter,
  isProdEnv,
  stripToken,
});

/**
 * مسارات إدارة الحسابات (عام / ملكية / أدمن) —
 * مستخرجة إلى routes/accountsManage.js
 */
const { REFERRAL_BONUS_DAYS } = require('./rizq_package_lifecycle_agent');
const { mountAccountsManageRoutes } = require('./routes/accountsManage');
mountAccountsManageRoutes(app, {
  requireAdminAuth,
  requireAdminPermission,
  readAccounts,
  writeAccounts,
  extractAccountToken,
  timingSafeEqualStr,
  stripToken,
  resolveOptionalAccountViewer,
  toPublicAccountForViewer,
  assertNniAssignable,
  normalizeAccountActivityFields,
  normalizeAccountPaymentMethods,
  genDashToken,
  genAccessToken,
  purgeAccountIdDocument,
  REFERRAL_BONUS_DAYS,
});

// ═══════════════════════════════════════════════════════════════
// حسابات "المشتري السريع" — SQLite عبر /api/auth + /api/wishlist
// (توافق رجعي: /api/buyers/register و /api/buyers/me)
// ═══════════════════════════════════════════════════════════════
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
  max: 8,
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

/** @deprecated — استخدم GET /api/auth/me (بدون توكن في query) */
app.get('/api/buyers/me', (req, res) => {
  res.status(410).json({
    ok: false,
    error: 'deprecated',
    code: 'GONE',
    message: 'استخدم GET /api/auth/me مع ترويسات المصادقة — توكنات الـ query لم تعد مدعومة',
  });
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// ط�بات ا�اشتراْ/شراء ا�با�ة (ب�&ا ف�`�!ا ف�`د�`���!ات Rizq ADS) � ْا� ت
// rizq_sub_requests �&ح��`ة 100% ف�` localStorage: ا��&شترْ �`رس� ط�ب�! �&� 
// ج�!از�!�R ��ا�أد�&�  �ا �`را�! أبدا�9 إ�ا إ�  فتح تحد�`دا�9 � فس ا��&تصفح. � فس � �&ط
// /api/accounts با�ضبط � إرسا� عا�& + �&راجعة أد�&�`�  بسر� �&شترْ.
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
const SUB_REQUESTS_FILE = path.join(DATA_DIR, 'sub-requests.json');
function readSubRequests() { return repos.subRequests.list(); }
function writeSubRequests(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.subRequests.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}

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
    // لا نخزّن riskLevel/flags من العميل — السيرفر فقط يحدّدهما بعد التحليل
    riskLevel: 'unreviewed',
    flags: [],
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

  // تحليل الوصل + موافقة مبدئية (أخضر) أو تعليق — ثم Telegram إن وُجد
  setImmediate(() => {
    try {
      const { getTelegramDeps } = require('./services/telegramDeps');
      const { processNewSubRequest } = require('./services/telegramAdmin');
      const deps = getTelegramDeps() || {
        readSubRequests,
        writeSubRequests,
        anthropic,
        readAccounts,
      };
      processNewSubRequest(id, deps).catch((err) => {
        console.warn('[sub-requests] provisional pipeline:', err.message);
      });
    } catch (pipeErr) {
      console.warn('[sub-requests] provisional pipeline init:', pipeErr.message);
    }
  });
});

/**
 * GET /api/sub-requests/admin — أدمين فقط (سرّ مشترك) — قائمة كل الطلبات
 * ليراها أي جهاز أدمن، وليس فقط جهاز المشترك الذي أرسل الطلب.
 */
app.get('/api/sub-requests/admin', requireAdminPermission('payments'), (req, res) => {
  res.json({ ok: true, requests: readSubRequests().reverse() });
});

/**
 * POST /api/sub-requests/admin/:id/decision — أدمين فقط — يسجّل قرار
 * الموافقة/الرفض. منطق التفعيل الفعلي (تفعيل الباقة، وضع الفيديو الإعلاني)
 * يبقى محلياً في rizq_admin.html كما هو؛ هذا فقط يجعل الحالة النهائية
 * مرئية عبر كل الأجهزة بدل الاقتصار على جهاز الأدمن الذي وافق فعلياً.
 */
app.post('/api/sub-requests/admin/:id/decision', requireAdminPermission('payments'), (req, res) => {
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
} = require('./rizq_package_lifecycle_agent');
// نمرّر readAccounts/writeAccounts (مُعرَّفتان أعلاه في هذا الملف) حتى يقدر
// معالج /api/account-package/sync (داخل الملف الآخر) أن يقرأ/يكتب حقل
// referredBy على accounts.json عند منح مكافأة إحالة — راجع rizq_package_
// lifecycle_agent.js لتفاصيل آلية "جيب صاحبك واربح".
setupPackageLifecycleAPI(app, requireAdminPermission('payments'), { readAccounts, writeAccounts });

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

/**
 * مسارات نواة الأدمن (login/verify/permissions/team/logout/daily-digest)
 * — مستخرجة إلى routes/adminCore.js
 */
const { mountAdminCoreRoutes } = require('./routes/adminCore');
mountAdminCoreRoutes(app, {
  requireAdminSession,
  requireAdminAuth,
  requireAdminPermission,
  adminSessions,
  adminTeamService,
  ADMIN_SESSION_TTL_MS,
  PANEL_PERMISSION_MAP,
  readAccounts,
  readAds,
  readSubRequests,
  readAdsRequests: () => repos.adsRequests.list(),
  readTenders,
  getAllAccountPackageRecords,
  readAuditLog,
  DATA_DIR,
  readLatestBackupMeta,
  backendRootDir: __dirname,
});

// ── "قريباً + أعلمني عند التفعيل" — إشارة اهتمام حقيقية بدل التخمين (طلب
// Limam 03/08/2026): بدل تخمين أي قسم مغلق (مكاتب/شركات/مناقصات/فيديو)
// يُفتح تالياً، الزائر يسجّل اهتمامه بقسم واحد، والأدمن يرى الأرقام الفعلية
// من لوحة التحكم قبل القرار. لا علاقة لهذا بالتسجيل الفعلي في الحساب — مجرد
// نية اهتمام (لا تحتاج مصادقة، لكن محدودة المعدل لمنع الإغراق). ──────────
const INTEREST_FILE = path.join(DATA_DIR, 'section-interest.json');
function readInterest() { return repos.sectionInterest.list(); }
function writeInterest(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.sectionInterest.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}
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
app.get('/api/section-interest/admin', requireAdminPermission('analytics'), (req, res) => {
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
app.post('/api/broadcast-sms', requireAdminPermission('announcements'), async (req, res) => {
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
function readTenders() { return repos.tenders.list(); }
function writeTenders(list) { return repos.tenders.replaceAll(list); }

/**
 * saveTenderImages(tenderId, images) — صور مرجعية اختيارية لما يحتاجه
 * صاحب المناقصة (مثال: "20 كرسي بهذا الشكل" + صورة) ليفهم مقدّمو العروض
 * المطلوب بدقة. حد أقصى 3 صور (لا حاجة لمعرض كامل كصور منتج للبيع، هذه
 * مرجع فقط) — نفس منطق saveAdImages/saveCatalogImages. التنفيذ في
 * services/imagePipeline؛ مسارات /api/tenders* في routes/tenders.js.
 */
const TENDER_UPLOADS_DIR = path.join(__dirname, 'uploads', 'tenders');
if (!fs.existsSync(TENDER_UPLOADS_DIR)) fs.mkdirSync(TENDER_UPLOADS_DIR, { recursive: true });

// يثبت أن accountId + token يطابقان حساباً حقيقياً في accounts.json، ويُعيده
function verifyAccountOwner(accountId, token) {
  if (!accountId || !token) return null;
  const acc = readAccounts().find((a) => a.id === accountId);
  // suspended=true (تعليق من الأدمن) يمنع صاحب الحساب من أي فعل يتطلب هذا
  // التحقق — نشر إعلان، تعديل الكتالوج، تعديل الملف الشخصي، إلخ — بغض
  // النظر عن صحة توكنه. هذا هو التطبيق الفعلي الوحيد لمعنى "تعليق مستخدم".
  return (acc && acc.status === 'approved' && !acc.suspended && timingSafeEqualStr(acc.accessToken, token)) ? acc : null;
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
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'file_too_large', message: 'الحد الأقصى لملف المعرفة 2 ميجابايت' });
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

setupQuotaGuardAPI(app, requireAdminPermission('quota-guard'), {
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

/**
 * مسارات /api/tenders* — مستخرجة إلى routes/tenders.js
 */
const { mountTendersRoutes } = require('./routes/tenders');
mountTendersRoutes(app, {
  requireAdminAuth,
  requireAdminPermission,
  extractAccountToken,
  verifyAccountOwner,
  resolveOptionalAccountViewer,
  getTenderEntitlements,
  scanContactLeakFields,
  redactContactPatterns,
  saveTenderImages,
  saveTenderDocument,
  extractPdfTextFromDataUri,
  resolveTenderDocumentAbsPath,
  resolveTenderUploadAbsPath,
  buildSignedTenderAssetUrl,
  verifyTenderAssetSig,
  readAccounts,
  readTenders,
  writeTenders,
  syncAccountPackage,
  getAccountRecord,
});

// ── غرفة الاستثمارات ──────────────────────────────────────────────
const investmentRoom = require('./services/investmentRoom');
/**
 * مسارات /api/investments* و /api/admin/investments* — مستخرجة إلى routes/investments.js
 */
const { mountInvestmentsRoutes } = require('./routes/investments');
mountInvestmentsRoutes(app, {
  requireAdminAuth,
  requireAdminPermission,
  investmentRoom,
  anthropic,
  verifyAccountOwner,
  extractAccountToken,
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
function readAds() { return repos.ads.list(); }
function writeAds(list) { return repos.ads.replaceAll(list); }

// صور الإعلانات تُكتب كملفات حقيقية على القرص (لا base64 داخل ads.json) —
// قرار مبرَّر: كود publishAd() في rizq_post.html يحتوي أصلاً على منطق
// fallback عند quota exceeded في localStorage، أي أن base64 يصطدم بحد
// السعة القصوى فعلياً مع أول إعلان بصور متعددة. كل صورة تُحفَظ تحت
// uploads/ads/<adId>/<n>.<ext> وتُخدَّم عبر express.static أعلاه.
const ADS_UPLOADS_DIR = path.join(__dirname, 'uploads', 'ads');
if (!fs.existsSync(ADS_UPLOADS_DIR)) fs.mkdirSync(ADS_UPLOADS_DIR, { recursive: true });

/**
 * مسارات /api/ads* — مستخرجة إلى routes/ads.js
 * (submit / requests / publish / browse / batch / mine / admin / :id / decision)
 */
const { mountAdsRoutes } = require('./routes/ads');
mountAdsRoutes(app, {
  requireAdminAuth,
  requireAdminPermission,
  moderatorAdMiddleware,
  getPlatformFlags,
  extractAccountToken,
  verifyAccountOwner,
  getEntitlements,
  assertCanPostAd,
  assertPhotoCount,
  scanContactLeakFields,
  saveAdImages,
  resolveOptionalAccountViewer,
  resolveContactGate,
  toPublicAdGated,
  isAdminRequest,
  adminHasPermission,
  readAccounts,
  readAdsRequests: () => repos.adsRequests.list(),
  writeAdsRequests: (list) => {
    const rows = Array.isArray(list) ? list : [];
    repos.adsRequests.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
  },
  readAds,
  writeAds,
  readAdBoosts,
});

// ══════════════════════════════════════════════════════════════════
// بلاغات الزوار عن الإعلانات — ميزة جديدة كاملة (بلا حساب مطلوب) —
// كانت لوحة "البلاغات" بـrizq_admin.html تعرض REPORTS_DATA وهمية فقط
// ولا توجد أي طريقة أصلاً ليبلّغ زائر عن إعلان مخالف. الآن: أي زائر
// (بلا تسجيل دخول) يمكنه إرسال بلاغ عن إعلان محدد، ويراجعه الأدمن هنا.
// ══════════════════════════════════════════════════════════════════
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
function readReports() { return repos.reports.list(); }
function writeReports(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.reports.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}
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
app.get('/api/reports/admin', requireAdminPermission('reports'), (req, res) => {
  const list = readReports().sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ ok: true, reports: list });
});

/** POST /api/reports/admin/:id/resolve — أدمين فقط — يُعلِّم البلاغ كمحلول */
app.post('/api/reports/admin/:id/resolve', requireAdminPermission('reports'), (req, res) => {
  const list = readReports();
  const idx = list.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'report_not_found' });
  list[idx].status = 'resolved';
  list[idx].resolvedAt = new Date().toISOString();
  writeReports(list);
  res.json({ ok: true, report: list[idx] });
});

/** GET /api/support-tickets/admin — admin list support tickets */
app.get('/api/support-tickets/admin', requireAdminPermission('users'), (req, res) => {
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
app.patch('/api/support-tickets/admin/:id', requireAdminPermission('users'), (req, res) => {
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
function readDeactivationRequests() { return repos.deactivationRequests.list(); }
function writeDeactivationRequests(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.deactivationRequests.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}
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
app.get('/api/deactivation-requests/admin', requireAdminPermission('accounts'), (req, res) => {
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
app.post('/api/deactivation-requests/admin/:id/resolve', requireAdminPermission('accounts'), (req, res) => {
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
function readCatalog() { return repos.catalog.list(); }
function writeCatalog(list) { return repos.catalog.replaceAll(list); }

const HOURS_FILE = path.join(DATA_DIR, 'business-hours.json');
function readAllHours() { return repos.businessHours.asMap(); }
function writeAllHours(obj) {
  const map = obj && typeof obj === 'object' ? obj : {};
  repos.businessHours.replaceAll(Object.keys(map).map((k) => ({ id: k, data: map[k] })));
}

// نفس منطق حفظ صور الإعلانات كملفات حقيقية بدل base64 داخل catalog.json
// (راجع saveAdImages أعلاه لتفصيل سبب القرار: base64 في localStorage
// يصطدم بحد السعة القصوى فعلياً).
const CATALOG_UPLOADS_DIR = path.join(__dirname, 'uploads', 'catalog');
if (!fs.existsSync(CATALOG_UPLOADS_DIR)) fs.mkdirSync(CATALOG_UPLOADS_DIR, { recursive: true });

/**
 * مسارات /api/catalog* — مستخرجة إلى routes/catalog.js
 * (POST / GET / mine / :id / PATCH / DELETE)
 */
const { mountCatalogRoutes } = require('./routes/catalog');
mountCatalogRoutes(app, {
  verifyAccountOwner,
  getEntitlements,
  assertCanAddCatalogItem,
  assertPhotoCount,
  readCatalog,
  writeCatalog,
  saveCatalogImages,
  saveCatalogImage,
  extractAccountToken,
  isAdminRequest,
  adminHasPermission,
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
  if (!b.hours || typeof b.hours !== 'object' || Array.isArray(b.hours)) {
    return res.status(400).json({ error: 'hours مطلوب' });
  }
  const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri',
    'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const clean = {};
  const keys = Object.keys(b.hours).slice(0, 14);
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(Object.prototype, k)) continue;
    if (!DAYS.includes(k) && !/^[a-zA-Z\u0600-\u06FF]{2,20}$/.test(k)) continue;
    const v = b.hours[k];
    if (v == null) continue;
    if (typeof v === 'string') clean[k] = String(v).slice(0, 40);
    else if (typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = {
        open: String(v.open || '').slice(0, 16),
        close: String(v.close || '').slice(0, 16),
        closed: !!v.closed,
      };
    }
  }
  const all = readAllHours();
  all[b.accountId] = { hours: clean, updatedAt: new Date().toISOString() };
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
function readMessages() { return repos.messages.list(); }
function writeMessages(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.messages.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}

/**
 * مسارات /api/messages* — مستخرجة إلى routes/messages.js
 * (POST / /reply · GET /threads /mine /thread/:key · PATCH .../read)
 */
const { mountMessagesRoutes } = require('./routes/messages');
mountMessagesRoutes(app, {
  verifyAccountOwner,
  extractAccountToken,
  readMessages,
  writeMessages,
  readAccounts,
  maybeAutoReplyToInquiry,
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
function readReviews() { return repos.reviews.asMap(); }
function writeReviews(obj) {
  const map = obj && typeof obj === 'object' ? obj : {};
  repos.reviews.replaceAll(Object.keys(map).map((k) => ({ id: k, data: map[k] })));
}
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
  // تقييمات مجهولة ممنوعة — يلزم حساب مشتري/بائع موثّق
  const token = req.header('x-account-token') || '';
  const buyerId = String(b.reviewerAccountId || '').slice(0, 60);
  if (!buyerId) return res.status(401).json({ error: 'unauthorized', code: 'auth_required' });
  const reviewerAcc = verifyAccountOwner(buyerId, token);
  if (!reviewerAcc) return res.status(401).json({ error: 'unauthorized' });
  if (buyerId === String(b.targetId)) {
    return res.status(400).json({ error: 'cannot_review_self' });
  }
  const reviewerAccountId = buyerId;
  const all = readReviews();
  const list = all[b.targetId] || [];
  if (list.some((r) => r.reviewerAccountId === reviewerAccountId)) {
    return res.status(409).json({ error: 'already_reviewed' });
  }
  const review = {
    id: genReviewId(),
    rating,
    comment: String(b.comment == null ? '' : b.comment).trim().slice(0, 500),
    reviewerName: String((b.reviewerName || reviewerAcc.name || '')).trim().slice(0, 60),
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
 * DELETE /api/reviews/:targetId/:reviewId — حذف تقييم للأدمن فقط
 * (البائع لا يمسح تقييمات الزبائن — كان يسمح بمسح السلبي).
 */
app.delete('/api/reviews/:targetId/:reviewId', requireAdminPermission('moderation'), (req, res) => {
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
function readTeam() { return repos.corpTeam.list(); }
function writeTeam(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.corpTeam.replaceAll(rows.filter((r) => r && r.id).map((r) => ({ id: String(r.id), data: r })));
}
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
function readAdBoosts() { return repos.adBoosts.asMap(); }
function writeAdBoosts(obj) {
  const map = obj && typeof obj === 'object' ? obj : {};
  repos.adBoosts.replaceAll(Object.keys(map).map((k) => ({ id: k, data: map[k] })));
}

/** POST /api/ad-boosts — الأدمن فقط، بعد موافقته الفعلية على طلب "مميزة" */
app.post('/api/ad-boosts', requireAdminPermission('payments'), (req, res) => {
  const b = req.body || {};
  if (!b.accountId || !b.adId) return res.status(400).json({ error: 'accountId و adId مطلوبان' });
  const ad = readAds().find((a) => a.id === b.adId);
  if (!ad || ad.accountId !== b.accountId) {
    return res.status(400).json({ error: 'ad_ownership_mismatch' });
  }
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

/** GET /api/ad-boosts/:adId — عام، هل هذا الإعلان مثبَّت الآن؟ (بدون بيانات دفع) */
app.get('/api/ad-boosts/:adId', (req, res) => {
  const all = readAdBoosts();
  const b = all[req.params.adId];
  const active = !!(b && b.endsAt && new Date(b.endsAt) > new Date());
  res.json({ ok: true, active, boosted: active, endsAt: active ? b.endsAt : null });
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
  readAds,
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
app.post('/api/telegram/setup-webhook', requireAdminPermission('channels'), async (req, res) => {
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
    // Canonical home is rizq_landing_v8.html (index.html is a thin redirect stub).
    res.sendFile(path.join(FRONTEND_ROOT, 'rizq_landing_v8.html'));
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/rizq-backend')) return notFoundHandler(req, res);
    // أدلة تقنية داخلية — لا تُعرض للزوّار عبر الملفات الثابتة
    const p = String(req.path || '').toLowerCase();
    if (
      p === '/rizq_platform_manual.md' ||
      p.endsWith('/rizq_platform_manual.md') ||
      p.includes('platform_manual') ||
      p.includes('dashboard-guide.md') ||
      (p.endsWith('.md') && (p.includes('manual') || p.includes('audit') || p.includes('rules')))
    ) {
      return notFoundHandler(req, res);
    }
    next();
  });
  app.use(express.static(FRONTEND_ROOT, { index: false, dotfiles: 'ignore', extensions: ['html'] }));
  console.log('[rizq-backend] dev static files → ' + FRONTEND_ROOT);
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
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

function assertProductionSecrets() {
  if (!isProdEnv()) return;
  const required = ['BACKEND_SHARED_SECRET', 'RIZQ_API_SECRET', 'SUPER_ADMIN_PASS_HASH', 'SUPER_ADMIN_EMAIL'];
  const missing = required.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length) {
    console.error('[FATAL] Missing required env in production:', missing.join(', '));
    process.exit(1);
  }
  if (!String(process.env.OTP_PEPPER || process.env.BACKEND_SHARED_SECRET || '').trim()) {
    console.error('[FATAL] OTP_PEPPER or BACKEND_SHARED_SECRET required in production');
    process.exit(1);
  }
  const hash = String(process.env.SUPER_ADMIN_PASS_HASH || '');
  if (!hash.startsWith('$2')) {
    console.error('[FATAL] SUPER_ADMIN_PASS_HASH must be a bcrypt hash');
    process.exit(1);
  }
}
assertProductionSecrets();

app.listen(PORT, HOST, async () => {
  console.log('[rizq-backend] running on http://' + HOST + ':' + PORT + '/');
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
  try {
    const invSched = investmentRoom.startDailyOpsScheduler();
    if (invSched && invSched.started) {
      console.log('[investments] daily ops report scheduler started');
    }
  } catch (e) {
    console.warn('[investments] scheduler:', e && e.message);
  }
});

process.on('SIGINT', () => { stopTelegramPolling(); process.exit(0); });
process.on('SIGTERM', () => { stopTelegramPolling(); process.exit(0); });
