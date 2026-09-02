/**
 * استخراج توكن الحساب — في الإنتاج: رأس فقط (لا query string)
 */
function isProdEnv() {
  return process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
}

function extractAccountToken(req) {
  const header = String(req.header('x-account-token') || '').trim();
  if (header) return header;
  if (!isProdEnv()) {
    const q = req.query && req.query.token;
    return q ? String(q).trim() : '';
  }
  return '';
}

function extractDashToken(req) {
  const header = String(req.header('x-dash-token') || '').trim();
  if (header) return header;
  const body = req.body && req.body.dashToken;
  if (body) return String(body).trim();
  if (!isProdEnv() && req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  return '';
}

module.exports = { isProdEnv, extractAccountToken, extractDashToken };
