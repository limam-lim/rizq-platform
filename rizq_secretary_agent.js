/**
 * rizq_secretary_agent.js  v3.0
 * ══════════════════════════════════════════════════════════
 * وكيل السكرتير الذكي — مشروط بالباقة الماسية بعد تحقق خادمي فقط
 *
 * بوابة الأمان (مرحلة 2):
 *   → يقرأ ACC_ID من ?id= في URL
 *   → يستدعي GET /api/agent/public-eligibility/:id (مصدر الحقيقة)
 *   → فشل/غياب التحقق أو eligible=false = لا يُحقن أي ويدجت/ملف شخصي
 *   → لا قراءة لباقة أو هاتف من localStorage إطلاقاً
 * ══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var ACC_ID = params.get('id') || params.get('store') || params.get('office') || params.get('corp');
  if (!ACC_ID) return;

  function backendBase() {
    if (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE) {
      return String(window.RIZQ_BACKEND_BASE).replace(/\/$/, '');
    }
    if (typeof window.RizqBackendConfig === 'object' && window.RizqBackendConfig && window.RizqBackendConfig.backendUrl) {
      return String(window.RizqBackendConfig.backendUrl).replace(/\/$/, '');
    }
    try {
      if (typeof getAgentConfig === 'function') {
        var cfg = getAgentConfig();
        if (cfg && cfg.backendUrl) return String(cfg.backendUrl).replace(/\/$/, '');
      }
    } catch (e0) { /* ignore */ }
    return location.origin ? String(location.origin).replace(/\/$/, '') : '';
  }

  function applyServerProfile(data) {
    if (!data || !data.eligible || !data.profile) return;
    var p = data.profile;
    var ch = p.channels || {};
    window._rizqProfile = {
      businessName: p.businessName || '',
      businessType: p.businessType || 'default',
      tier: 'diamond',
      accountId: ACC_ID,
      channels: {
        phone: ch.phone || '',
        whatsapp: ch.whatsapp || '',
        email: ch.email || '',
        location: ch.location || ''
      },
      workingHours: p.workingHours || '',
      isOffHours: !!p.isOffHours,
      products: [],
      services: [],
      policies: {},
      dynamicKnowledge: null,
      persona: p.persona && typeof p.persona === 'object' ? p.persona : {
        key: p.businessType || '',
        label: '',
        tone: '',
        agentTitle: p.agentTitle || ''
      }
    };
  }

  var base = backendBase();
  if (!base) return;

  fetch(base + '/api/agent/public-eligibility/' + encodeURIComponent(ACC_ID), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store'
  })
    .then(function (r) {
      if (!r || !r.ok) return null;
      return r.json();
    })
    .then(function (data) {
      if (!data || data.ok !== true || !data.eligible) return;
      applyServerProfile(data);
    })
    .catch(function () {
      /* فشل الشبكة = لا ويدجت */
    });
})();
