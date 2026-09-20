/**
 * مسارات إدارة الحسابات (عام / ملكية / أدمن) —
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 * (التسجيل وجلسة الدخول/OTP في server.js و routes/accountsSession.js)
 */
'use strict';

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountAccountsManageRoutes(app, deps) {
  const {
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
  } = deps;

  const requireAccountsAdmin = typeof requireAdminPermission === 'function'
    ? requireAdminPermission('accounts')
    : requireAdminAuth;

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
   * GET /api/accounts/public/:id — حساب موافَق واحد بحقول عامة فقط
   * (منها thumb) لصفحة الملف الشخصي، دون تنزيل قائمة الحسابات كلها.
   */
  app.get('/api/accounts/public/:id', (req, res) => {
    res.set('Cache-Control', 'public, max-age=30');
    const viewerId = resolveOptionalAccountViewer(req);
    const acc = readAccounts().find((a) => a && a.id === req.params.id);
    if (!acc || acc.status !== 'approved' || acc.suspended || String(acc.id || '').startsWith('acc_demo')) {
      return res.status(404).json({ ok: false, error: 'account_not_found' });
    }
    res.json({ ok: true, account: toPublicAccountForViewer(acc, viewerId) });
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
    if (!token || !timingSafeEqualStr(token, acc.accessToken)) return res.status(401).json({ error: 'unauthorized' });
    if (acc.suspended) return res.status(403).json({ error: 'account_suspended' });
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
    if (!token || !timingSafeEqualStr(token, acc.accessToken)) return res.status(401).json({ error: 'unauthorized' });
    if (acc.suspended) return res.status(403).json({ error: 'account_suspended' });
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
    if (!token || !timingSafeEqualStr(token, acc.accessToken)) return res.status(401).json({ error: 'unauthorized' });
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
  app.get('/api/accounts/admin', requireAccountsAdmin, (req, res) => {
    res.json({ ok: true, accounts: readAccounts().map(stripToken).reverse() });
  });

  /**
   * PATCH /api/accounts/admin/:id — تعديل حساب من الأدمن مباشرة (سرّ مشترك)،
   * نفس الحقول القابلة للتعديل في PATCH /api/accounts/mine/:id لكن بصلاحية
   * الأدمن بدل توكن صاحب الحساب — يغذّي زر "تعديل" في لوحة "المستخدمون"
   * بـrizq_admin.html، الذي كان يعدّل بيانات وهمية محلية فقط سابقاً.
   */
  app.patch('/api/accounts/admin/:id', requireAccountsAdmin, (req, res) => {
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
  app.post('/api/accounts/admin/:id/decision', requireAccountsAdmin, (req, res) => {
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
      if (action === 'suspend') {
        // إبطال الجلسات المسروقة فور التعليق
        list[idx].dashToken = typeof genDashToken === 'function' ? genDashToken() : list[idx].dashToken;
        list[idx].accessToken = typeof genAccessToken === 'function' ? genAccessToken() : list[idx].accessToken;
      }
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
      // أمان داخلي: dashToken يُولَّد على الخادم فقط — لا يُقبل من العميل/الأدمن
      list[idx].dashToken = genDashToken();
      if (body.package) list[idx].package = String(body.package).slice(0, 60);
      if (body.package_price !== undefined) list[idx].package_price = Number(body.package_price) || 0;
      // التزام قانوني: بعد الموافقة تُحذف صورة الهوية من الخادم — ويبقى NNI + id_verified.
      purgeAccountIdDocument(list[idx]);
    }
    writeAccounts(list);
    const safe = stripToken(list[idx]);
    // كشف لمرة واحدة بعد الموافقة — الأدمن يحتاج dashToken لرابط لوحة المشترك
    if (action === 'approve' && list[idx].dashToken) {
      safe.dashToken = list[idx].dashToken;
      safe.token = list[idx].dashToken;
    }
    res.json({ ok: true, account: safe });
  });

  /**
   * POST /api/accounts/admin/:id/verified-plus — أدمين فقط — يمنح/يُلغي شارة
   * "موثّق⁺" المدفوعة لحساب. body:{action:'grant'|'revoke', durationDays}.
   * تُستدعى إما تلقائياً بعد موافقة الأدمن على طلب شراء (activateVerifiedPlusForRequest
   * في rizq_admin.html، فئة sub_requests.category==='verified_plus')، أو يدوياً
   * من الأدمن مباشرة (منح/سحب استثنائي بلا طلب شراء). مستقلة تماماً عن status
   * (التوثيق المجاني) وعن package (باقة الحساب العامة) — لا تُعدِّل أياً منهما.
   */
  app.post('/api/accounts/admin/:id/verified-plus', requireAccountsAdmin, (req, res) => {
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
}

module.exports = { mountAccountsManageRoutes };
