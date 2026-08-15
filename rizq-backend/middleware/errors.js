/**
 * معالجة أخطاء API موحّدة — رموز HTTP + JSON { ok, error, code? }
 */

function HttpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function sendError(res, status, message, code) {
  const body = { ok: false, error: message };
  if (code) body.code = code;
  return res.status(status).json(body);
}

/** يلتقط async errors في مسارات Express */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  sendError(res, 404, 'المسار غير موجود', 'NOT_FOUND');
}

function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.message && err.message.includes('CORS')) {
    return sendError(res, 403, 'غير مسموح من هذا الأصل (CORS)', 'CORS_DENIED');
  }
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('[rizq-api]', req.method, req.path, err.message);
  sendError(res, status, err.message || 'خطأ داخلي في الخادم', err.code);
}

module.exports = {
  HttpError,
  sendError,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
};
