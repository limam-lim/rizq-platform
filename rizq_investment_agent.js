/**
 * rizq_investment_agent.js
 * وكيل غرفة الاستثمارات — يحوّل فكرة المشروع إلى مخطط واضح للمستثمرين.
 */
(function (global) {
  'use strict';

  function apiBase() {
    try {
      if (global.RIZQ_API_BASE) return String(global.RIZQ_API_BASE).replace(/\/$/, '');
      if (location.port === '3000' || /localhost|127\.0\.0\.1/.test(location.hostname)) {
        return location.origin;
      }
    } catch (e) {}
    return '';
  }

  function localPlan(input) {
    var title = (input.title || '').trim() || 'مشروع استثماري';
    var sector = (input.sector || '').trim() || 'عام';
    var capital = (input.capital || '').trim() || 'غير محدد';
    var stage = (input.stage || '').trim() || 'فكرة';
    var desc = (input.description || '').trim() || '';
    var lang = input.lang === 'fr' ? 'fr' : 'ar';

    if (lang === 'fr') {
      return {
        executiveSummary: title + ' — opportunité dans le secteur « ' + sector + ' » (stade: ' + stage + ').',
        businessModel: 'Modèle à préciser avec le porteur: revenus, clients cibles, canaux de vente, et avantages concurrentiels en Mauritanie.',
        capitalUse: 'Capital demandé: ' + capital + '. Répartition indicative: lancement, opérations, marketing, réserve.',
        risks: 'Risques marché, exécution, réglementation, et liquidité. Due diligence obligatoire avant tout engagement.',
        ask: 'Partenariat / prise de participation selon négociation. Contact via un intermédiaire local agréé Rizq.',
        investorPitch: desc || 'Décrire clairement la proposition de valeur, le marché cible, et le retour attendu.'
      };
    }

    return {
      executiveSummary: title + ' — فرصة في قطاع « ' + sector + ' » (المرحلة: ' + stage + ').',
      businessModel: 'نموذج العمل يُفصَّل مع صاحب الفكرة: مصادر الدخل، العملاء المستهدفون، قنوات البيع، والميزة التنافسية داخل موريتانيا.',
      capitalUse: 'رأس المال المطلوب: ' + capital + '. توزيع إرشادي: إطلاق، تشغيل، تسويق، واحتياطي.',
      risks: 'مخاطر السوق والتنفيذ والتنظيم والسيولة. يلزم فحص عناية واجبة قبل أي التزام.',
      ask: 'شراكة / مساهمة حسب التفاوض. التواصل عبر وسيط محلي معتمد في رزق.',
      investorPitch: desc || 'اشرح بوضوح قيمة المشروع، السوق المستهدف، والعائد المتوقع.'
    };
  }

  function renderPlan(plan, mount, lang) {
    if (!mount || !plan) return;
    var isFr = lang === 'fr';
    var blocks = [
      { k: 'executiveSummary', ar: 'الملخص التنفيذي', fr: 'Résumé exécutif' },
      { k: 'businessModel', ar: 'نموذج العمل', fr: 'Modèle économique' },
      { k: 'capitalUse', ar: 'استخدام رأس المال', fr: 'Usage du capital' },
      { k: 'risks', ar: 'المخاطر والتنويه', fr: 'Risques & avertissement' },
      { k: 'ask', ar: 'طلب الشراكة', fr: 'Demande de partenariat' },
      { k: 'investorPitch', ar: 'عرض للمستثمر', fr: 'Pitch investisseur' },
      { k: 'disclaimer', ar: 'إخلاء مسؤولية', fr: 'Avertissement' }
    ];
    mount.innerHTML = blocks.map(function (b) {
      var body = plan[b.k] || '';
      return '<article class="inv-plan-card"><h4>' + (isFr ? b.fr : b.ar) + '</h4><p>' +
        String(body).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></article>';
    }).join('');
    mount.hidden = false;
  }

  async function generatePlan(input) {
    var base = apiBase();
    if (base) {
      try {
        var res = await fetch(base + '/api/investments/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
        if (res.ok) {
          var data = await res.json();
          if (data && data.ok && data.plan) return data.plan;
        }
      } catch (e) {}
    }
    return localPlan(input);
  }

  function bindForm(formId, outId) {
    var form = document.getElementById(formId);
    var out = document.getElementById(outId);
    if (!form || !out) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var lang = 'ar';
      try { lang = localStorage.getItem('rizq_lang') || 'ar'; } catch (e) {}
      var input = {
        title: (form.querySelector('[name="title"]') || {}).value || '',
        sector: (form.querySelector('[name="sector"]') || {}).value || '',
        capital: (form.querySelector('[name="capital"]') || {}).value || '',
        stage: (form.querySelector('[name="stage"]') || {}).value || '',
        description: (form.querySelector('[name="description"]') || {}).value || '',
        lang: lang
      };
      if (btn) {
        btn.disabled = true;
        btn.dataset.prev = btn.textContent;
        btn.textContent = lang === 'fr' ? 'Préparation…' : 'جاري إعداد المخطط…';
      }
      out.hidden = false;
      out.innerHTML = '<p class="inv-plan-loading">' + (lang === 'fr' ? 'Le conseiller investissement prépare le dossier…' : 'وكيل الاستثمار يجهّز الملف…') + '</p>';
      generatePlan(input).then(function (plan) {
        renderPlan(plan, out, lang);
      }).finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.prev || btn.textContent;
        }
      });
    });
  }

  global.RizqInvestmentAgent = {
    generatePlan: generatePlan,
    renderPlan: renderPlan,
    bindForm: bindForm,
    localPlan: localPlan
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindForm('inv-agent-form', 'inv-agent-out');
  });
})(typeof window !== 'undefined' ? window : this);
