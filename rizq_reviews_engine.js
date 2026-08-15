/**
 * rizq_reviews_engine.js
 * ═══════════════════════════════════════════════════════════════════
 * محرك التقييمات والمراجعات — رزق
 * ────────────────────────────────────────────────────────────────
 * تخزين محلي بالكامل عبر localStorage — بنفس معمارية باقي المنصة
 * (لا يوجد خادم/قاعدة بيانات حقيقية لهذا الجزء، تماماً كالإعلانات
 * rizq_ads والحسابات rizq_pending_accounts). كل تقييم مرتبط بمعرّف
 * الهدف targetId — نفس القيمة المستخدمة كـ sellerKey/sellerId في
 * نظام المراسلة الآمنة rizq_messenger.js، حتى يبقى التقييم مرتبطاً
 * بنفس البائع/المتجر الذي تراسله أو تشتري منه.
 *
 * البنية المخزَّنة في rizq_reviews:
 *   { [targetId]: [ {id, rating, comment, reviewerName, createdAt}, ... ] }
 *
 * حماية بسيطة من التكرار (rizq_reviewed_targets): متصفح واحد = تقييم
 * واحد لكل هدف. هذه ليست حماية "حقيقية" لا يمكن تجاوزها — مسح
 * localStorage يلغيها فوراً — لكنها كافية لمنع السبام العرضي، بنفس
 * منطق حد النشر اليومي المضاف سابقاً في rizq_post.html.
 * ═══════════════════════════════════════════════════════════════════
 */
(function(global){
  'use strict';

  var STORAGE_KEY  = 'rizq_reviews';
  var REVIEWED_KEY = 'rizq_reviewed_targets';
  var MAX_COMMENT_LEN = 500;
  var MAX_NAME_LEN    = 60;

  // ── localStorage helpers ──────────────────────────────────────────
  function _getAll(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function _saveAll(all){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
    catch(e){ /* مساحة localStorage ممتلئة أو غير متاحة — نفشل بصمت كباقي المنصة */ }
  }
  function _getReviewedTargets(){
    try{ return JSON.parse(localStorage.getItem(REVIEWED_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function _markReviewed(targetId){
    try{
      var arr = _getReviewedTargets();
      if(arr.indexOf(targetId) === -1){
        arr.push(targetId);
        localStorage.setItem(REVIEWED_KEY, JSON.stringify(arr));
      }
    }catch(e){}
  }
  function _hasReviewed(targetId){
    return _getReviewedTargets().indexOf(targetId) !== -1;
  }
  function _genId(){
    return 'RV-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ── getReviews(targetId): أحدث تقييم أولاً ──────────────────────
  function getReviews(targetId){
    if(!targetId) return [];
    var all = _getAll();
    var list = all[targetId] || [];
    return list.slice().sort(function(a, b){
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // ── getStats(targetId): {count, average} — بدون قسمة على صفر ────
  function getStats(targetId){
    var list = getReviews(targetId);
    var count = list.length;
    if(count === 0) return { count: 0, average: 0 };
    var sum = list.reduce(function(s, r){ return s + (Number(r.rating) || 0); }, 0);
    var average = Math.round((sum / count) * 10) / 10;
    return { count: count, average: average };
  }

  // ── addReview(targetId, {rating, comment, reviewerName}) ─────────
  function addReview(targetId, opts){
    opts = opts || {};
    if(!targetId){
      return { ok: false, error: 'invalid_target' };
    }

    // تحقق صارم: عدد صحيح بين 1 و5 (وليس "3.5" أو نص عشوائي)
    var rawRating = opts.rating;
    var rating = (typeof rawRating === 'number') ? rawRating : parseFloat(rawRating);
    if(typeof rating !== 'number' || isNaN(rating) || !isFinite(rating) ||
       !Number.isInteger(rating) || rating < 1 || rating > 5){
      return { ok: false, error: 'invalid_rating' };
    }

    // حارس بسيط ضد التكرار — متصفح واحد = تقييم واحد لكل هدف (غير مضمون 100%، انظر التعليق أعلاه)
    if(_hasReviewed(targetId)){
      return { ok: false, error: 'already_reviewed' };
    }

    var comment = (opts.comment == null ? '' : String(opts.comment)).trim().slice(0, MAX_COMMENT_LEN);
    var reviewerName = (opts.reviewerName == null ? '' : String(opts.reviewerName)).trim().slice(0, MAX_NAME_LEN);

    var review = {
      id: _genId(),
      rating: rating,
      comment: comment,
      reviewerName: reviewerName,
      createdAt: new Date().toISOString()
    };

    var all = _getAll();
    if(!all[targetId]) all[targetId] = [];
    all[targetId].unshift(review);
    _saveAll(all);
    _markReviewed(targetId);

    return { ok: true, review: review };
  }

  // ── deleteReview(targetId, reviewId) — لموديريشن البائع لاحقاً (اختياري) ──
  function deleteReview(targetId, reviewId){
    if(!targetId || !reviewId) return { ok: false, error: 'invalid_input' };
    var all = _getAll();
    var list = all[targetId] || [];
    var next = list.filter(function(r){ return r.id !== reviewId; });
    if(next.length === list.length) return { ok: false, error: 'not_found' };
    all[targetId] = next;
    _saveAll(all);
    return { ok: true };
  }

  global.RizqReviews = {
    addReview: addReview,
    getReviews: getReviews,
    getStats: getStats,
    deleteReview: deleteReview
  };

  if(global.console) console.log('[RIZQ-REVIEWS] Reviews Engine v1.0 loaded ✅');

})(typeof window !== 'undefined' ? window : global);
