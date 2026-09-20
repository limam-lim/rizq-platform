/**
 * مسارات جلسة المشترك (دخول / OTP تفعيل / كلمة المرور / verify-dash)
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const rateLimit = require('express-rate-limit');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountAccountsSessionRoutes(app, deps) {
  const {
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
  } = deps;

  const sellerLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' },
  });

  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'محاولات كثيرة — حاول لاحقاً' },
  });

  const verifyDashLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير جداً من المحاولات — حاول مرة أخرى بعد قليل' },
  });

  /** POST /api/accounts/seller-login */
  app.post('/api/accounts/seller-login', sellerLoginLimiter, async (req, res) => {
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 120);
    const pass = String((req.body || {}).password || '');
    if (!email || !pass) {
      return res.status(400).json({ ok: false, code: 'missing_credentials', error: 'البريد وكلمة المرور مطلوبان' });
    }
    if (pass.length > 200 || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, code: 'invalid', error: 'بيانات الدخول غير صحيحة' });
    }
    const dummyHash = '$2a$10$Cr7J1rfztqkXC9ZpESd5qO2PLvx6D3SJKxfBjfX3DXVMuu3YBVDYy';
    const list = readAccounts();
    const acc = list.find((a) => String(a.email || '').trim().toLowerCase() === email);
    let ok = false;
    try {
      ok = acc && acc.passHash ? await bcrypt.compare(pass, acc.passHash) : await bcrypt.compare(pass, dummyHash);
    } catch (eCmp) {
      ok = false;
    }
    if (!acc || !acc.passHash || !ok) {
      res.set('Cache-Control', 'no-store');
      return res.status(401).json({ ok: false, code: 'invalid', error: 'بيانات الدخول غير صحيحة' });
    }
    if (acc.suspended) {
      return res.status(403).json({ ok: false, code: 'suspended', error: 'الحساب معلّق' });
    }
    if (acc.status !== 'approved') {
      return res.status(403).json({
        ok: false,
        code: 'not_approved',
        status: acc.status,
        error: 'الحساب لم تتم الموافقة عليه بعد',
      });
    }
    if (!acc.dashToken) {
      acc.dashToken = genDashToken();
      const idx = list.findIndex((a) => a.id === acc.id);
      if (idx !== -1) {
        list[idx].dashToken = acc.dashToken;
        writeAccounts(list);
      }
    }
    const { accessToken, passHash: _ph, dashToken, idImage, licenseImage, id_image, ...safeFields } = acc;
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      account: Object.assign(safeFields, {
        accessToken,
        dashToken,
        token: dashToken,
      }),
    });
  });

  /** POST /api/accounts/activate-by-otp */
  app.post('/api/accounts/activate-by-otp', accountsRegisterLimiter, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const b = req.body || {};
    const id = String(b.id || '').slice(0, 60);
    const token = String(b.accessToken || extractAccountToken(req) || '').trim();
    if (!id || !token) {
      return res.status(400).json({ ok: false, code: 'missing', error: 'معرّف الحساب والتوكن مطلوبان' });
    }
    const list = readAccounts();
    const idx = list.findIndex((a) => a.id === id);
    if (idx < 0) return res.status(404).json({ ok: false, code: 'not_found', error: 'الحساب غير موجود' });
    const acc = list[idx];
    if (!timingSafeEqualStr(acc.accessToken, token)) {
      return res.status(401).json({ ok: false, code: 'unauthorized', error: 'unauthorized' });
    }
    if (acc.suspended) {
      return res.status(403).json({ ok: false, code: 'suspended', error: 'الحساب معلّق' });
    }
    if (acc.status === 'approved' && acc.dashToken) {
      const { accessToken, passHash: _ph, dashToken, idImage, licenseImage, id_image, ...safeFields } = acc;
      return res.json({
        ok: true,
        already: true,
        account: Object.assign(safeFields, { accessToken, dashToken, token: dashToken }),
      });
    }
    if (!canAutoApproveAccountType(acc.type)) {
      return res.status(403).json({
        ok: false,
        code: 'admin_review_required',
        error: 'هذا النوع يتطلب موافقة الإدارة',
      });
    }
    const email = String(acc.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ ok: false, code: 'email_required', error: 'البريد مطلوب للتفعيل' });
    }
    const ver = consumeBuyerVerificationByEmail(email);
    if (!ver.ok) {
      return res.status(403).json({
        ok: false,
        code: ver.error || 'otp_required',
        error: ver.message || 'يجب التحقق من البريد برمز OTP أولاً',
        otpRequired: true,
      });
    }
    acc.status = 'approved';
    acc.approvedAt = new Date().toISOString();
    acc.autoVerified = true;
    acc.dashToken = genDashToken();
    if (acc.idImage) purgeAccountIdDocument(acc);
    list[idx] = acc;
    writeAccounts(list);
    const { accessToken, passHash: _ph, dashToken, idImage, licenseImage, id_image, ...safeFields } = acc;
    res.json({
      ok: true,
      autoApproved: true,
      account: Object.assign(safeFields, { accessToken, dashToken, token: dashToken }),
    });
  });

  /** POST /api/accounts/password-reset/request */
  app.post('/api/accounts/password-reset/request', passwordResetLimiter, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 120);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, code: 'invalid_email', error: 'بريد إلكتروني غير صالح' });
    }
    const acc = readAccounts().find((a) => String(a.email || '').trim().toLowerCase() === email);
    const accountExists = !!(acc && !acc.suspended && acc.email);
    try {
      const result = await sendSellerResetOtp(email, {
        accountExists,
        name: acc && acc.name ? acc.name : '',
      });
      if (!result.ok) {
        return res.status(400).json({ ok: false, code: result.error || 'invalid', error: result.message || 'تعذّر الإرسال' });
      }
      const out = {
        ok: true,
        expiresIn: result.expiresIn,
        message: result.message || 'إن وُجد حساب بهذا البريد فسيصلك رمز خلال دقائق',
      };
      if (result.devHint) out.devHint = result.devHint;
      if (result.emailWarning) out.emailWarning = result.emailWarning;
      return res.json(out);
    } catch (eReq) {
      return res.status(500).json({ ok: false, code: 'send_failed', error: 'تعذّر إرسال الرمز' });
    }
  });

  /** POST /api/accounts/password-reset/confirm */
  app.post('/api/accounts/password-reset/confirm', passwordResetLimiter, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    const code = String(b.code || '').replace(/\D/g, '').slice(0, 6);
    const newPassword = String(b.newPassword || b.password || '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, code: 'invalid_email', error: 'بريد إلكتروني غير صالح' });
    }
    if (code.length !== 6) {
      return res.status(400).json({ ok: false, code: 'invalid_code', error: 'رمز غير صحيح' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ ok: false, code: 'weak_password', error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const list = readAccounts();
    const idx = list.findIndex((a) => String(a.email || '').trim().toLowerCase() === email);
    if (idx < 0) {
      return res.status(404).json({ ok: false, code: 'not_found', error: 'الحساب غير موجود' });
    }
    const acc = list[idx];
    if (acc.suspended) {
      return res.status(403).json({ ok: false, code: 'suspended', error: 'الحساب معلّق' });
    }

    const verified = verifySellerResetOtp(email, code);
    if (!verified.ok) {
      return res.status(400).json({ ok: false, code: verified.error || 'invalid_code', error: verified.message || 'رمز غير صحيح' });
    }
    const consumed = consumeSellerResetVerification(email);
    if (!consumed.ok) {
      return res.status(400).json({ ok: false, code: consumed.error || 'otp_required', error: consumed.message || 'تحقق مطلوب' });
    }

    try {
      acc.passHash = bcrypt.hashSync(newPassword, 10);
    } catch (eHash) {
      return res.status(500).json({ ok: false, code: 'hash_failed', error: 'تعذّر حفظ كلمة المرور' });
    }
    acc.accessToken = genAccessToken();
    acc.dashToken = genDashToken();
    acc.passwordChangedAt = new Date().toISOString();
    acc.updatedAt = acc.passwordChangedAt;
    list[idx] = acc;
    writeAccounts(list);

    const { accessToken, passHash: _ph, dashToken, idImage, licenseImage, id_image, ...safeFields } = acc;
    res.json({
      ok: true,
      account: Object.assign(safeFields, {
        accessToken,
        dashToken,
        token: dashToken,
      }),
    });
  });

  /** POST /api/accounts/mine/:id/password */
  app.post('/api/accounts/mine/:id/password', sellerLoginLimiter, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const list = readAccounts();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx < 0) return res.status(404).json({ ok: false, error: 'account_not_found' });
    const acc = list[idx];
    const token = extractAccountToken(req);
    if (!token || !timingSafeEqualStr(token, acc.accessToken)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    if (acc.suspended) return res.status(403).json({ ok: false, error: 'account_suspended' });

    const b = req.body || {};
    const currentPassword = String(b.currentPassword || '');
    const newPassword = String(b.newPassword || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, code: 'missing', error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ ok: false, code: 'weak_password', error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }
    if (!acc.passHash) {
      return res.status(400).json({
        ok: false,
        code: 'no_password',
        error: 'لا توجد كلمة مرور على الحساب — استخدم استعادة كلمة المرور',
      });
    }
    let okCur = false;
    try {
      okCur = await bcrypt.compare(currentPassword, acc.passHash);
    } catch (eCmp) {
      okCur = false;
    }
    if (!okCur) {
      return res.status(401).json({ ok: false, code: 'invalid_current', error: 'كلمة المرور الحالية غير صحيحة' });
    }
    try {
      acc.passHash = bcrypt.hashSync(newPassword, 10);
    } catch (eHash) {
      return res.status(500).json({ ok: false, code: 'hash_failed', error: 'تعذّر حفظ كلمة المرور' });
    }
    // إبطال الجلسات القديمة فور تغيير كلمة المرور
    acc.accessToken = genAccessToken();
    acc.dashToken = genDashToken();
    acc.passwordChangedAt = new Date().toISOString();
    acc.updatedAt = acc.passwordChangedAt;
    list[idx] = acc;
    writeAccounts(list);
    res.json({
      ok: true,
      accessToken: acc.accessToken,
      dashToken: acc.dashToken,
      token: acc.dashToken,
    });
  });

  function handleVerifyDash(req, res) {
    const list = readAccounts();
    const acc = list.find((a) => a.id === req.params.id);
    if (!acc) return res.status(404).json({ error: 'account_not_found' });
    const token = extractDashToken(req);
    if (
      acc.suspended
      || acc.status !== 'approved'
      || !acc.dashToken
      || !token
      || !timingSafeEqualStr(token, acc.dashToken)
    ) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    res.json({ ok: true, account: stripToken(acc) });
  }

  function handleExchangeDashToken(req, res) {
    const list = readAccounts();
    const acc = list.find((a) => a.id === req.params.id);
    if (!acc) return res.status(404).json({ error: 'account_not_found' });
    const token = extractDashToken(req);
    if (
      acc.suspended
      || acc.status !== 'approved'
      || !acc.dashToken
      || !token
      || !timingSafeEqualStr(token, acc.dashToken)
    ) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    res.json({ ok: true, accessToken: acc.accessToken });
  }

  app.post('/api/accounts/verify-dash/:id', verifyDashLimiter, handleVerifyDash);
  app.post('/api/accounts/exchange-dash-token/:id', verifyDashLimiter, handleExchangeDashToken);
  if (!isProdEnv()) {
    app.get('/api/accounts/verify-dash/:id', verifyDashLimiter, handleVerifyDash);
  }
}

module.exports = { mountAccountsSessionRoutes };
