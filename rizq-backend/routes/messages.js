/**
 * مسارات رسائل المشتري↔البائع (/api/messages*) — زائر + صاحب حساب.
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك (بما فيها بوابة هاتف الضيف).
 */
'use strict';

const rateLimit = require('express-rate-limit');

function buildThreadKey(sellerAccountId, buyerAccountId, buyerPhone) {
  const buyerPart = buyerAccountId ? ('acc:' + buyerAccountId) : ('guest:' + String(buyerPhone || '').replace(/\D/g, ''));
  return sellerAccountId + '::' + buyerPart;
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountMessagesRoutes(app, deps) {
  const {
    verifyAccountOwner,
    extractAccountToken,
    readMessages,
    writeMessages,
    readAccounts,
    maybeAutoReplyToInquiry,
  } = deps;

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
    let asGuest = false;
    const guestMatch = /::guest:(\d+)$/.exec(threadKey);
    if (!asSeller && !asBuyer && guestMatch) {
      const phoneDigits = String(req.query.buyerPhone || req.header('x-guest-phone') || '').replace(/\D/g, '');
      if (phoneDigits && phoneDigits === guestMatch[1]) asGuest = true;
    }
    if (!asSeller && !asBuyer && !asGuest) return res.status(401).json({ error: 'unauthorized' });
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
}

module.exports = { mountMessagesRoutes };
