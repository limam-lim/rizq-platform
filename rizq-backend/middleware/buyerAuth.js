/**
 * مصادقة المشتري — Bearer / X-Buyer-Id + X-Buyer-Token (لا query في الإنتاج)
 */
const Buyer = require('../models/buyer');
const { sendError } = require('./errors');
const { isProdEnv } = require('./accountAuth');

function extractBuyerCredentials(req) {
  const auth = req.header('authorization') || '';
  let id = String(req.header('x-buyer-id') || '').trim();
  let token = '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token) token = String(req.header('x-buyer-token') || '').trim();
  if (!isProdEnv()) {
    if (!id) id = String(req.query.id || '').trim();
    if (!token) token = String(req.query.token || '').trim();
  }
  return { id, token };
}

function requireBuyerAuth(req, res, next) {
  const { id, token } = extractBuyerCredentials(req);
  if (!id || !token) {
    return sendError(res, 401, 'مصادقة مطلوبة — id و token', 'AUTH_REQUIRED');
  }
  const row = Buyer.findByIdAndToken(id, token);
  if (!row) {
    return sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
  }
  req.buyer = Buyer.publicBuyer(row);
  req.buyerToken = row.token;
  next();
}

module.exports = { extractBuyerCredentials, requireBuyerAuth };
