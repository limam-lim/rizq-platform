/**
 * rizq_dashboard_shared.js — دوال مشتركة بين لوحات التحكم الأربع
 * بدون تغيير الهوية/التصميم — منطق فقط.
 */
(function (global) {
  'use strict';
  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }
  function showToast(msg, type) {
    var el = document.getElementById('toast') || document.getElementById('rizq-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rizq-toast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = String(msg || '');
    el.style.background = type === 'bad' || type === 'error' ? '#991b1b' : (type === 'ok' || type === 'success' ? '#166534' : '#0f172a');
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.display = 'none'; }, 3200);
  }
  function closePayModal(){
    document.getElementById('pay-modal').style.display = 'none';
    document.body.style.overflow = '';
  }
  function copyReferralLink(){
    var input = document.getElementById('referral-link-input');
    if(!input || !input.value) return;
    var msg = (typeof _t2 === 'function')
      ? _t2('✅ تم نسخ الرابط', '✅ Lien copié')
      : '✅ تم نسخ الرابط';
    navigator.clipboard.writeText(input.value).then(function(){
      if(typeof showToast==='function') showToast(msg,'success');
    }).catch(function(){});
  }
  function _tenderPkgList(){
    try{
      var list = JSON.parse(localStorage.getItem('rizq_tender_packages')||'null');
      if(Array.isArray(list) && list.length) return list;
    }catch(e){}
    return [
      {name:'تجريبية', price:0,     duration:'10 أيام'},
      {name:'شهرية', price:5000,  duration:'شهر'},
      {name:'ربعية', price:13500, duration:'3 أشهر'},
      {name:'سنوية', price:45000, duration:'12 شهر'}
    ];
  }
  function _tenderStatusBadgeOwner(t, fr){
    var s = t.status || 'open';
    if(s==='pending_review') return '<span style="font-size:11px;font-weight:700;color:#92400e;background:#fffbeb;padding:2px 8px;border-radius:6px;margin-left:6px">⏳ '+(fr?'En révision':'قيد المراجعة')+'</span>';
    if(s==='rejected') return '<span style="font-size:11px;font-weight:700;color:#b91c1c;background:#fef2f2;padding:2px 8px;border-radius:6px;margin-left:6px">❌ '+(fr?'Refusée':'مرفوضة')+'</span>';
    if(s==='open') return '<span style="font-size:11px;font-weight:700;color:#065f46;background:#ecfdf5;padding:2px 8px;border-radius:6px;margin-left:6px">✅ '+(fr?'Publiée':'منشورة')+'</span>';
    return '';
  }
  function _verifiedPlusPkgList(){
    try{
      var list = JSON.parse(localStorage.getItem('rizq_verified_plus_packages')||'null');
      if(Array.isArray(list) && list.length) return list;
    }catch(e){}
    return [{name:'سنوية', price:5000, duration:'سنة'}];
  }

  global.escapeHtml = escapeHtml;
  global.escapeAttr = escapeAttr;
  global.showToast = showToast;
  global.closePayModal = closePayModal;
  global.copyReferralLink = copyReferralLink;
  global._tenderPkgList = _tenderPkgList;
  global._tenderStatusBadgeOwner = _tenderStatusBadgeOwner;
  global._verifiedPlusPkgList = _verifiedPlusPkgList;
})(typeof window !== 'undefined' ? window : this);
