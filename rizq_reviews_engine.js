/**
 * rizq_reviews_engine.js
 * ═══════════════════════════════════════════════════════════════════
 * محرك التقييمات — مصدر الحقيقة = الخادم (/api/reviews).
 * التخزين المحلي كاش عرض فقط بعد نجاح POST/GET — لا نجاح وهمي بلا مصادقة.
 * ═══════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'rizq_reviews';
  var REVIEWED_KEY = 'rizq_reviewed_targets';
  var MAX_COMMENT_LEN = 500;
  var MAX_NAME_LEN = 60;

  function _getAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _saveAll(all) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
    catch (e) { /* ignore */ }
  }
  function _getReviewedTargets() {
    try { return JSON.parse(localStorage.getItem(REVIEWED_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function _markReviewed(targetId) {
    try {
      var arr = _getReviewedTargets();
      if (arr.indexOf(targetId) === -1) {
        arr.push(targetId);
        localStorage.setItem(REVIEWED_KEY, JSON.stringify(arr));
      }
    } catch (e) {}
  }
  function _hasReviewed(targetId) {
    return _getReviewedTargets().indexOf(targetId) !== -1;
  }

  function apiBase() {
    try {
      if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
        return String(global.RIZQ_BACKEND_BASE).replace(/\/$/, '');
      }
    } catch (e) {}
    return '';
  }

  /** جلسة مشتري أو حساب بائع للمصادقة */
  function resolveAuth() {
    // مشتري Guest Gate
    try {
      if (global.RizqAuthGate && typeof global.RizqAuthGate.getSession === 'function') {
        var bs = global.RizqAuthGate.getSession();
        if (bs && bs.id && bs.token && String(bs.token).length >= 20) {
          return { kind: 'buyer', id: String(bs.id), token: String(bs.token), name: bs.name || '' };
        }
      }
    } catch (e1) {}
    try {
      var raw = localStorage.getItem('rizq_buyer_session');
      var s = raw ? JSON.parse(raw) : null;
      if (s && s.id && s.token && String(s.token).length >= 20) {
        return { kind: 'buyer', id: String(s.id), token: String(s.token), name: s.name || '' };
      }
    } catch (e2) {}
    // حساب بائع / محل
    try {
      var keys = ['rizq_account_session', 'rizq_session', 'rizq_active_account'];
      for (var i = 0; i < keys.length; i++) {
        var a = JSON.parse(localStorage.getItem(keys[i]) || 'null');
        if (!a) continue;
        var tok = a.backendAccessToken || a.accessToken || a.token || '';
        var id = a.id || a.accountId || '';
        if (id && tok && String(tok).length >= 16) {
          return { kind: 'account', id: String(id), token: String(tok), name: a.name || a.businessName || '' };
        }
      }
    } catch (e3) {}
    return null;
  }

  function getReviews(targetId) {
    if (!targetId) return [];
    var list = (_getAll()[targetId] || []).slice();
    return list.sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  function getStats(targetId) {
    var list = getReviews(targetId);
    var count = list.length;
    if (count === 0) return { count: 0, average: 0 };
    var sum = list.reduce(function (s, r) { return s + (Number(r.rating) || 0); }, 0);
    return { count: count, average: Math.round((sum / count) * 10) / 10 };
  }

  function cacheReview(targetId, review) {
    var all = _getAll();
    if (!all[targetId]) all[targetId] = [];
    all[targetId] = all[targetId].filter(function (r) { return r.id !== review.id; });
    all[targetId].unshift(review);
    _saveAll(all);
    _markReviewed(targetId);
  }

  function replaceCache(targetId, reviews) {
    var all = _getAll();
    all[targetId] = Array.isArray(reviews) ? reviews.slice() : [];
    _saveAll(all);
  }

  /**
   * addReview — يعيد Promise. لا يكتب محلياً إلا بعد نجاح الخادم.
   * opts: { rating, comment, reviewerName, adId }
   */
  function addReview(targetId, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!targetId) {
        resolve({ ok: false, error: 'invalid_target' });
        return;
      }
      var rawRating = opts.rating;
      var rating = (typeof rawRating === 'number') ? rawRating : parseFloat(rawRating);
      if (typeof rating !== 'number' || isNaN(rating) || !isFinite(rating)
        || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        resolve({ ok: false, error: 'invalid_rating' });
        return;
      }
      if (_hasReviewed(targetId)) {
        resolve({ ok: false, error: 'already_reviewed' });
        return;
      }
      var auth = resolveAuth();
      if (!auth) {
        resolve({ ok: false, error: 'auth_required' });
        return;
      }
      var base = apiBase();
      if (!base) {
        resolve({ ok: false, error: 'backend_unavailable' });
        return;
      }
      var comment = (opts.comment == null ? '' : String(opts.comment)).trim().slice(0, MAX_COMMENT_LEN);
      var reviewerName = (opts.reviewerName == null ? '' : String(opts.reviewerName)).trim().slice(0, MAX_NAME_LEN)
        || auth.name || '';
      var headers = { 'Content-Type': 'application/json' };
      var body = {
        targetId: targetId,
        rating: rating,
        comment: comment,
        reviewerName: reviewerName
      };
      if (opts.adId) body.adId = String(opts.adId).slice(0, 80);
      if (auth.kind === 'buyer') {
        headers['Authorization'] = 'Bearer ' + auth.token;
        headers['X-Buyer-Id'] = auth.id;
        headers['X-Buyer-Token'] = auth.token;
      } else {
        headers['x-account-token'] = auth.token;
        body.reviewerAccountId = auth.id;
      }
      fetch(base + '/api/reviews', {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(body)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { status: res.status, data: data || {} };
          });
        })
        .then(function (pack) {
          if (pack.status === 401) {
            resolve({ ok: false, error: 'auth_required' });
            return;
          }
          if (pack.status === 403 || (pack.data && pack.data.error === 'interaction_required')) {
            resolve({ ok: false, error: 'interaction_required', message: (pack.data && pack.data.message) || '' });
            return;
          }
          if (pack.status === 409 || (pack.data && pack.data.error === 'already_reviewed')) {
            _markReviewed(targetId);
            resolve({ ok: false, error: 'already_reviewed' });
            return;
          }
          if (pack.status === 400 && pack.data && pack.data.error === 'cannot_review_self') {
            resolve({ ok: false, error: 'cannot_review_self' });
            return;
          }
          if (pack.status >= 200 && pack.status < 300 && pack.data && pack.data.ok && pack.data.review) {
            cacheReview(targetId, pack.data.review);
            resolve({ ok: true, review: pack.data.review });
            return;
          }
          resolve({ ok: false, error: (pack.data && pack.data.error) || 'server_error' });
        })
        .catch(function () {
          resolve({ ok: false, error: 'network_error' });
        });
    });
  }

  /** مزامنة قائمة التقييمات من الخادم إلى الكاش المحلي */
  function hydrate(targetId) {
    return new Promise(function (resolve) {
      var base = apiBase();
      if (!base || !targetId) {
        resolve({ ok: false, reviews: getReviews(targetId) });
        return;
      }
      fetch(base + '/api/reviews/' + encodeURIComponent(targetId))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.reviews)) {
            replaceCache(targetId, data.reviews);
            resolve({ ok: true, reviews: data.reviews });
            return;
          }
          resolve({ ok: false, reviews: getReviews(targetId) });
        })
        .catch(function () {
          resolve({ ok: false, reviews: getReviews(targetId) });
        });
    });
  }

  function deleteReview() {
    return { ok: false, error: 'admin_only' };
  }

  /** إزالة أعداد التقييمات الوهمية من نصوص العرض (ديمو) */
  function scrubFakeReviewMeta(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(/\(\s*\d+\s*تقييم(?:ات)?\s*\)/g, '');
    s = s.replace(/\(\s*\d+\s*avis\s*\)/gi, '');
    s = s.replace(/\s{2,}/g, ' ').replace(/\s+—/g, ' —').trim();
    return s;
  }

  global.RizqReviews = {
    addReview: addReview,
    getReviews: getReviews,
    getStats: getStats,
    deleteReview: deleteReview,
    hydrate: hydrate,
    resolveAuth: resolveAuth,
    scrubFakeReviewMeta: scrubFakeReviewMeta
  };

  if (global.console) console.log('[RIZQ-REVIEWS] Reviews Engine v2.0 (API source of truth)');
})(typeof window !== 'undefined' ? window : global);
