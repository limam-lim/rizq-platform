/**
 * مصادقة المشتري — Bearer token + X-Buyer-Id أو query id&token
 */
const Buyer = require('../models/buyer');
const { sendError } = require('./errors');

function extractBuyerCredentials(req) {
  const auth = req.header('authorization') || '';
  let id = req.header('x-buyer-id') || req.query.id;
  let token = req.query.token;
  if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
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
