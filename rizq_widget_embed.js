/**
 * rizq_widget_embed.js — مدير رزق الذكي (embed + drag)
 * يُحقن في أي صفحة بسطرين:
 *   <script src="rizq_packages_config.js"><\/script>
 *   <script src="rizq_manager_agent_config.js"><\/script>
 *   <script src="rizq_widget_embed.js"><\/script>
 */
(function () {
  'use strict';
  if (document.getElementById('rizq-chat-toggle')) return;

  /* ══════════════ CSS ══════════════ */
  var styleEl = document.createElement('style');
  styleEl.id = 'rizq-widget-css';
  styleEl.textContent = [
    /* إصلاح/تحسين 28/07/2026 (طلب Limam: "أيقونة جذابة تلفت الانتباه" بدل
       الأيقونة السابقة الثابتة): overflow:hidden على الزر كان يقصّ أي عنصر
       يخرج قليلاً عن حدود الدائرة — بما فيها شارة الإشعار الحمراء "1" نفسها
       (top:-4px;right:-4px) وأي حلقة توهّج نضيفها الآن. أُزيل overflow:hidden،
       وأُضيفت حلقة نبض ذهبية متحركة حول الزر (::before) تلفت الانتباه فعلياً
       عبر الحركة، لا فقط عبر شكل ثابت. */
    '#rizq-chat-toggle{position:fixed;bottom:28px;right:28px;width:64px;height:64px;border-radius:50%;',
    'background:radial-gradient(circle at 35% 30%,#2a5aa8 0%,#1B3A6B 55%,#0F2347 100%);border:3px solid #C9A84C;',
    'cursor:grab;box-shadow:0 8px 32px rgba(27,58,107,.28),inset 0 0 14px rgba(201,168,76,.18);display:flex;align-items:center;',
    'justify-content:center;z-index:99999;transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;}',
    '#rizq-chat-toggle:hover{transform:scale(1.1);box-shadow:0 12px 40px rgba(27,58,107,.4),inset 0 0 18px rgba(201,168,76,.28);}',
    '#rizq-chat-toggle.rw-dragging{cursor:grabbing;transform:scale(1.08);transition:none;}',
    '#rizq-chat-toggle::before{content:"";position:absolute;inset:-6px;border-radius:50%;',
    'border:2px solid rgba(201,168,76,.55);pointer-events:none;animation:rwRing 2.6s ease-out infinite;z-index:-1;}',
    '#rizq-chat-toggle::after{content:"";position:absolute;inset:-6px;border-radius:50%;',
    'border:2px solid rgba(201,168,76,.35);pointer-events:none;animation:rwRing 2.6s ease-out infinite 1.3s;z-index:-1;}',
    '@keyframes rwRing{0%{transform:scale(.85);opacity:.9}100%{transform:scale(1.45);opacity:0}}',
    '#rizq-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:10px;',
    'font-weight:700;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;border:2px solid #fff;animation:rwPulse 2s infinite;}',
    '@keyframes rwPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}',
    '.rizq-avatar-icon{width:44px;height:44px;pointer-events:none;display:flex;align-items:center;',
    'justify-content:center;animation:rwFloat 3.2s ease-in-out infinite;',
    'filter:drop-shadow(0 0 5px rgba(232,201,106,.55));}',
    '@keyframes rwFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
    '.rw-spark{transform-box:fill-box;transform-origin:center;animation:rwSparkle 1.8s ease-in-out infinite;}',
    '@keyframes rwSparkle{0%,100%{opacity:.35;transform:scale(.75) rotate(0deg)}50%{opacity:1;transform:scale(1.2) rotate(20deg)}}',
    '.rw-orbit{transform-box:fill-box;transform-origin:center;animation:rwTwinkle 2.4s ease-in-out infinite;}',
    '.rw-orbit-2{animation-delay:.7s}.rw-orbit-3{animation-delay:1.4s}',
    '@keyframes rwTwinkle{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1.35)}}',
    '#rizq-chat-window{position:fixed;bottom:104px;right:28px;width:380px;max-height:520px;',
    'background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(27,58,107,.22);',
    'display:flex;flex-direction:column;z-index:99998;overflow:hidden;',
    'transform:scale(.8) translateY(20px);opacity:0;pointer-events:none;',
    'transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s;',
    "font-family:'Segoe UI',Tahoma,Arial,sans-serif;border:1.5px solid rgba(201,168,76,.25);}",
    '#rizq-chat-window.visible{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
    '#rizq-chat-window[dir="ltr"] .rw-header-info{text-align:left;}',
    '#rizq-chat-window[dir="rtl"] .rw-header-info{text-align:right;}',
    '#rizq-chat-window[dir="ltr"] .rw-quick-actions{justify-content:flex-start;}',
    '#rizq-chat-window[dir="ltr"] .rw-input{direction:ltr;text-align:left;}',
    '#rizq-chat-window[dir="rtl"] .rw-input{direction:rtl;text-align:right;}',
    '.rw-header{background:linear-gradient(135deg,#0f2347 0%,#1B3A6B 60%,#234d8f 100%);',
    'padding:16px 18px;display:flex;align-items:center;gap:12px;position:relative;flex-shrink:0;}',
    '.rw-header::after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;',
    'background:linear-gradient(90deg,transparent,#C9A84C,transparent);}',
    '.rw-header-avatar{width:48px;height:48px;border-radius:50%;border:2.5px solid #C9A84C;',
    'overflow:hidden;flex-shrink:0;background:#0f2347;}',
    '.rw-header-avatar img,.rw-header-avatar svg{width:100%;height:100%;object-fit:cover;display:block;}',
    '.rw-header-info{flex:1;}',
    '.rw-header-name{font-size:15px;font-weight:700;color:#e8c96a;line-height:1.2;}',
    '.rw-header-status{font-size:11px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px;margin-top:2px;}',
    '.rw-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:rwPulse 2s infinite;}',
    '.rw-header-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:32px;height:32px;',
    'border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;',
    'transition:background .2s;flex-shrink:0;}',
    '.rw-header-close:hover{background:rgba(255,255,255,.25);}',
    '.rw-quick-actions{padding:10px 14px;display:flex;gap:6px;flex-wrap:wrap;',
    'background:#f5f5f5;border-bottom:1px solid #e8e8e8;flex-shrink:0;}',
    '.rw-quick-btn{background:#fff;border:1.5px solid #1B3A6B;color:#1B3A6B;font-size:11px;',
    "font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:5px 10px;border-radius:20px;",
    'cursor:pointer;transition:all .2s;white-space:nowrap;}',
    '.rw-quick-btn:hover{background:#1B3A6B;color:#fff;}',
    '.rw-messages{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;',
    'gap:10px;min-height:180px;scroll-behavior:smooth;}',
    '.rw-messages::-webkit-scrollbar{width:4px;}',
    '.rw-messages::-webkit-scrollbar-thumb{background:#e8e8e8;border-radius:2px;}',
    '.rw-msg{display:flex;align-items:flex-end;gap:8px;animation:rwMsgIn .3s ease-out;}',
    '@keyframes rwMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
    '.rw-msg.agent{flex-direction:row;}.rw-msg.user{flex-direction:row-reverse;}',
    '.rw-msg-avatar{width:32px;height:32px;border-radius:50%;border:1.5px solid #C9A84C;',
    'overflow:hidden;flex-shrink:0;background:#0f2347;}',
    '.rw-msg-avatar img,.rw-msg-avatar svg{width:100%;height:100%;object-fit:cover;display:block;}',
    '.rw-bubble{max-width:75%;padding:10px 13px;border-radius:14px;font-size:13px;',
    'line-height:1.55;white-space:pre-wrap;word-break:break-word;}',
    '.rw-msg.agent .rw-bubble{background:#f5f5f5;color:#222;border-bottom-right-radius:4px;border:1px solid #e8e8e8;}',
    '.rw-msg.user .rw-bubble{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;border-bottom-left-radius:4px;}',
    '.rw-typing .rw-bubble{background:#f5f5f5;border:1px solid #e8e8e8;padding:12px 16px;}',
    '.typing-dots{display:flex;gap:4px;}',
    '.typing-dots span{width:7px;height:7px;background:#888;border-radius:50%;animation:rwTyping 1.2s infinite;}',
    '.typing-dots span:nth-child(2){animation-delay:.2s}.typing-dots span:nth-child(3){animation-delay:.4s}',
    '@keyframes rwTyping{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}',
    '.rw-ts{font-size:10px;color:#888;margin-top:3px;text-align:center;}',
    '.rw-input-area{padding:12px 14px;border-top:1px solid #e8e8e8;background:#fff;',
    'display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}',
    '.rw-input{flex:1;border:1.5px solid #e8e8e8;border-radius:22px;padding:10px 16px;',
    "font-size:13px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;resize:none;outline:none;",
    'max-height:100px;overflow-y:auto;line-height:1.4;transition:border-color .2s;direction:rtl;text-align:right;}',
    '.rw-input:focus{border-color:#1B3A6B;}',
    '.rw-input::placeholder{color:#888;}',
    '.rw-send-btn{width:40px;height:40px;background:linear-gradient(135deg,#1B3A6B,#234d8f);',
    'border:none;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;',
    'justify-content:center;transition:transform .2s,background .2s;flex-shrink:0;}',
    '.rw-send-btn:hover{transform:scale(1.1);background:linear-gradient(135deg,#a07820,#C9A84C);}',
    '.rw-send-btn:active{transform:scale(.95);}',
    '.rw-send-btn svg{width:18px;height:18px;}',
    '.rw-footer{text-align:center;font-size:10px;color:#888;padding:6px;',
    'background:#f5f5f5;border-top:1px solid #e8e8e8;flex-shrink:0;}',
    '@media(max-width:440px){',
    '#rizq-chat-window{width:calc(100vw - 20px);right:10px;bottom:90px;max-height:75vh;}',
    '#rizq-chat-toggle{right:16px;bottom:16px;}}',
    '#rizq-prompt-bubbles{position:fixed;bottom:100px;right:28px;z-index:99998;pointer-events:none}',
    'html[dir="ltr"] #rizq-prompt-bubbles{right:auto;left:28px}',
    '.rw-prompt-bubble{position:relative;background:#fff;border:1.5px solid rgba(201,168,76,.35);',
    'border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:12px;font-weight:700;color:#1B3A6B;',
    'box-shadow:0 8px 28px rgba(27,58,107,.18);opacity:0;transform:translateY(8px) scale(.95);',
    'transition:all .4s cubic-bezier(.34,1.56,.64,1);pointer-events:auto;cursor:pointer;',
    'max-width:220px;line-height:1.45;font-family:\'Segoe UI\',Tahoma,Arial,sans-serif;direction:inherit;text-align:start}',
    '.rw-prompt-bubble.visible{opacity:1;transform:translateY(0) scale(1)}',
    '.rw-prompt-bubble::after{content:"";position:absolute;bottom:-6px;right:18px;width:10px;height:10px;',
    'background:#fff;border-right:1.5px solid rgba(201,168,76,.3);border-bottom:1.5px solid rgba(201,168,76,.3);transform:rotate(45deg)}',
    'html[dir="ltr"] .rw-prompt-bubble::after{right:auto;left:18px}',
    '@media(max-width:768px){#rizq-prompt-bubbles{bottom:150px;right:16px}.rw-prompt-bubble{font-size:11px;padding:8px 12px;max-width:180px}}'
  ].join('');
  document.head.appendChild(styleEl);

  /* إصلاح/تحسين 28/07/2026: أيقونة "مدير رزق" الجديدة — طلب صريح من Limam
     ("الإيموجي/الشعار السابق لم يعجبني، أريد شيئاً جذاباً يلفت الانتباه"،
     ثم "حطّ فيها شعار رزق"). الحل النهائي: نفس شعار رزق الموحَّد المستخدم
     في كل الصفحات (حرفا R / ر الذهبيان بخط Georgia — نفس العلامة تماماً
     الموجودة في .fixed-rizq-logo وrizq-promo-mark بكل الصفحات، لا شعار
     جديد مختلف)، مرسوم كـ SVG داخلي بدل صورة PNG ثابتة (أوضح، بلا اعتماد
     على ملف خارجي)، مع شرارة ذهبية صغيرة متحركة + حلقة نبض حول الزر
     (::before/::after في CSS أعلاه) تمنحه حركة فعلية تلفت الانتباه دون
     التخلي عن هوية العلامة التجارية. */
  function _rizqAvatarSvg(size) {
    var gid = 'rwGoldTxt' + size;
    return '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#F3DE9C"/><stop offset=".5" stop-color="#E8C96A"/><stop offset="1" stop-color="#C9A84C"/>' +
      '</linearGradient></defs>' +
      '<circle class="rw-orbit" cx="6" cy="9" r="1.1" fill="#F3DE9C"/>' +
      '<circle class="rw-orbit rw-orbit-2" cx="35" cy="14" r="1" fill="#F3DE9C"/>' +
      '<circle class="rw-orbit rw-orbit-3" cx="8" cy="33" r="0.9" fill="#F3DE9C"/>' +
      '<text x="15" y="18" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="16" font-weight="900" fill="url(#' + gid + ')">R</text>' +
      '<text x="27" y="28" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="url(#' + gid + ')">ر</text>' +
      '<path class="rw-spark" d="M34 5l1.5 3.8 3.8 1.5-3.8 1.5-1.5 3.8-1.5-3.8-3.8-1.5 3.8-1.5z" fill="#fff"/>' +
      '</svg>';
  }

  /* ══════════════ HTML ══════════════ */
  var wrapper = document.createElement('div');
  wrapper.id = 'rizq-widget-root';
  wrapper.innerHTML = [
    '<button id="rizq-chat-toggle" aria-label="مدير رزق - الدعم الذكي">',
    '  <span id="rizq-badge" style="display:none">1</span>',
    '  <span class="rizq-avatar-icon">' + _rizqAvatarSvg(38) + '</span>',
    '</button>',
    '<div id="rizq-prompt-bubbles" aria-hidden="true">',
    '  <button type="button" class="rw-prompt-bubble" id="rw-prompt-bubble"></button>',
    '</div>',
    '<div id="rizq-chat-window" role="dialog" aria-label="مدير رزق — الدعم الذكي">',
    '  <div class="rw-header">',
    '    <div class="rw-header-avatar">' + _rizqAvatarSvg(48) + '</div>',
    '    <div class="rw-header-info">',
    '      <div class="rw-header-name">مدير رزق الذكي</div>',
    '      <div class="rw-header-status"><span class="rw-status-dot"></span><span>متاح الآن · يرد خلال ثوانٍ</span></div>',
    '    </div>',
    '    <button class="rw-header-close" id="rw-header-close" aria-label="إغلاق">✕</button>',
    '  </div>',
    '  <div class="rw-quick-actions" id="rw-quick-actions">',
    '    <button class="rw-quick-btn" data-action="nav:rizq_post.html">نشر إعلان</button>',
    '    <button class="rw-quick-btn" data-action="nav:rizq_landing_v8.html#pricing">الاشتراكات</button>',
    '    <button class="rw-quick-btn" data-action="nav:rizq_landing_v8.html">التوثيق</button>',
    '    <button class="rw-quick-btn" data-action="report">شكوى</button>',
    '    <button class="rw-quick-btn" data-action="chat:طرق الدفع">الدفع</button>',
    '  </div>',
    '  <div class="rw-messages" id="rw-messages"></div>',
    '  <div class="rw-input-area">',
    '    <textarea id="rw-input" class="rw-input" placeholder="اكتب رسالتك هنا..." rows="1" dir="rtl"></textarea>',
    '    <button class="rw-send-btn" id="rw-send-btn" aria-label="إرسال">',
    '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div class="rw-footer">مدعوم بـ <strong style="color:#1B3A6B">رزق AI</strong> · منصة رزق للتجارة الإلكترونية</div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(wrapper);

  /* ══════════════ Engine ══════════════ */
  window.RizqWidget = (function () {
    var _open = false;
    var _typing = false;
    var _history = [];
    var _ctx = { tier: 'visitor', lang: 'ar' };
    var _AVATAR = _rizqAvatarSvg(32);

    /* ══════════════════════════════════════════════════════
       _loadPageProfile — يُحمِّل بيانات المتجر/المكتب/المعرض
       من 3 مصادر بالأولوية:
         1) window._rizqProfile (تُعيّنه الصفحة صراحةً)
         2) localStorage rizq_pending_accounts (صاحب المتجر)
         3) DOM scraping (fallback للزوار)
    ══════════════════════════════════════════════════════ */
    function _loadPageProfile() {
      // المصدر 1: الصفحة تُعيّن البيانات صراحةً
      if (window._rizqProfile && window._rizqProfile.businessName) {
        return window._rizqProfile;
      }

      // المصدر 2: صاحب المتجر مسجّل دخول في نفس المتصفح
      // إصلاح جوهري 27/07/2026: كان هذا المصدر يخصّص الويدجت بالكامل (اسم
      // المنشأة + منتجاتها) لأي حساب موافَق عليه بلا أي تحقق من الباقة — أي
      // ميزة "الوكيل الذكي الكامل" (ai_agent_full) الحصرية لمشتركي الباقة
      // الماسية (انظر TIER_FEATURES في rizq_subscription_engine.js) كانت
      // متاحة فعلياً مجاناً لكل تاجر موافَق عليه. الآن نتحقق فعلياً قبل
      // التخصيص — بلا الميزة يبقى الويدجت "مدير رزق" العام فقط.
      try {
        var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
        var acc  = accs.find(function(a) {
          return a.status === 'approved' && (a.type === 'store' || a.type === 'corp' || a.type === 'office');
        });
        if (acc && typeof RizqSub !== 'undefined' && (RizqSub.hasFeature(acc.id, 'ai_agent_full') || RizqSub.hasFeature(acc.id, 'widget_channel'))) {
          var prods = [];
          try { prods = JSON.parse(localStorage.getItem('store_products_' + acc.id) || '[]'); } catch(e2){}
          return {
            businessName: acc.name || acc.businessName || 'رزق',
            tier: 'diamond',
            channels: {
              phone:    acc.phone    || '',
              whatsapp: acc.whatsapp || '',
              email:    acc.email    || '',
              location: acc.address  || acc.city || ''
            },
            workingHours: acc.workingHours || '8:00 - 22:00',
            products: prods.slice(0, 8).map(function(p) {
              return { name: p.name || '', price: p.price || '' };
            }),
            policies: {
              delivery: acc.delivery || '',
              return:   acc.returnPolicy || ''
            }
          };
        }
      } catch(e) {}

      // المصدر 3: DOM scraping — للزوار الذين لا يملكون localStorage للمتجر
      // نفس الإصلاح: نحدّد accountId الحقيقي من رابط الصفحة (?id=/?store=/
      // ?office=/?corp= — نفس الاتفاقية المستخدمة في resolveStoreAccount/
      // resolveOfficeAccount وrizq_secretary_agent.js) ونتحقق من الباقة قبل
      // أي تخصيص، بدل تخصيص الويدجت لأي عمل ظاهر بالصفحة بلا شرط إطلاقاً.
      try {
        var _domParams = new URLSearchParams(location.search);
        var _domAccId  = _domParams.get('id') || _domParams.get('store') || _domParams.get('office') || _domParams.get('corp');
        if (_domAccId && typeof RizqSub !== 'undefined' && !RizqSub.hasFeature(_domAccId, 'ai_agent_full') && !RizqSub.hasFeature(_domAccId, 'widget_channel')) {
          return null; // حساب حقيقي معروف لكن بلا باقة ماسية — لا تخصيص
        }

        var nameEl = document.querySelector(
          '.store-name, .office-name, .corp-name, .biz-name, ' +
          'h1.page-title, .hero-title, [data-biz-name]'
        );
        var phoneEl  = document.querySelector('[href^="tel"]');
        var waEl     = document.querySelector('[href*="wa.me"]');
        var locEl    = document.querySelector('.address, .location-text, [data-location]');
        var hoursEl  = document.querySelector('.hours-text, .working-hours, [data-hours]');
        var prodEls  = document.querySelectorAll('.prod-card, .product-card, .item-card');

        var domProducts = [];
        prodEls.forEach(function(el) {
          var n = el.querySelector('.prod-name, .item-name, h3');
          var p = el.querySelector('.prod-price, .item-price, .price');
          if (n) domProducts.push({ name: n.textContent.trim(), price: p ? p.textContent.trim() : '' });
        });

        var bizName = nameEl ? nameEl.textContent.trim() : (document.title.split('|')[0].trim() || 'رزق');

        if (bizName && bizName !== 'رزق') {
          return {
            businessName: bizName,
            tier: _domAccId ? 'diamond' : '',
            channels: {
              phone:    phoneEl ? phoneEl.href.replace('tel:','') : '',
              whatsapp: waEl    ? waEl.href : '',
              email:    '',
              location: locEl   ? locEl.textContent.trim() : ''
            },
            workingHours: hoursEl ? hoursEl.textContent.trim() : '',
            products: domProducts.slice(0, 8),
            policies: {}
          };
        }
      } catch(e) {}

      return null;
    }

    /* ── ترجمة الويدجت (يعمل في أي صفحة، بمحرك RizqI18n الموحّد أو بدونه) ── */
    var _WDICT = {
      ar: {
        toggleAria: 'مدير رزق - الدعم الذكي',
        dialogAria: 'مدير رزق — الدعم الذكي',
        headerName: 'مدير رزق الذكي',
        headerStatus: 'متاح الآن · يرد خلال ثوانٍ',
        closeAria: 'إغلاق',
        sendAria: 'إرسال',
        inputPh: 'اكتب رسالتك هنا...',
        footerHtml: 'مدعوم بـ <strong style="color:#1B3A6B">رزق AI</strong> · منصة رزق للتجارة الإلكترونية',
        greeting: 'أهلاً وسهلاً بك في رزق! 👋✨\nأنا مدير رزق الذكي، كيف أخدمك اليوم؟',
        defaultReply: 'أهلاً بك في رزق! 😊 كيف أساعدك اليوم؟'
      },
      fr: {
        toggleAria: 'Gestionnaire Rizq - Support intelligent',
        dialogAria: 'Gestionnaire Rizq — Support intelligent',
        headerName: 'Gestionnaire Rizq IA',
        headerStatus: 'Disponible maintenant · répond en quelques secondes',
        closeAria: 'Fermer',
        sendAria: 'Envoyer',
        inputPh: 'Écrivez votre message ici...',
        footerHtml: 'Propulsé par <strong style="color:#1B3A6B">Rizq AI</strong> · plateforme Rizq e-commerce',
        greeting: 'Bienvenue chez Rizq ! 👋✨\nJe suis le Gestionnaire Rizq IA, comment puis-je vous aider aujourd\'hui ?',
        defaultReply: 'Bienvenue chez Rizq ! 😊 Comment puis-je vous aider aujourd\'hui ?'
      }
    };
    var _quickActions = [
      { ar: { label: 'نشر إعلان', action: 'nav:rizq_post.html' }, fr: { label: 'Publier une annonce', action: 'nav:rizq_post.html' } },
      { ar: { label: 'الاشتراكات', action: 'nav:rizq_landing_v8.html#pricing' }, fr: { label: 'Abonnements', action: 'nav:rizq_landing_v8.html#pricing' } },
      { ar: { label: 'التوثيق', action: 'nav:rizq_landing_v8.html' }, fr: { label: 'Vérification', action: 'nav:rizq_landing_v8.html' } },
      { ar: { label: 'شكوى', action: 'report' }, fr: { label: 'Réclamation', action: 'report' } },
      { ar: { label: 'الدفع', action: 'chat:طرق الدفع' }, fr: { label: 'Paiement', action: 'chat:Méthodes de paiement' } }
    ];

    /** سياق الصفحة — إعلان مفتوح، URL، نوع الصفحة (للـ Backend + fallback محلي) */
    function _collectPageContext() {
      var ctx = {
        page: (location.pathname.split('/').pop() || 'index.html'),
        path: location.pathname,
        search: location.search,
        lang: _ctx.lang
      };
      try {
        var qp = new URLSearchParams(location.search);
        if (qp.get('id')) ctx.urlAdId = qp.get('id');
        if (qp.get('cat')) ctx.category = qp.get('cat');
        if (qp.get('q')) ctx.searchQuery = qp.get('q');
      } catch (e) {}
      if (window._currentAd && window._currentAd.id) {
        var ad = window._currentAd;
        ctx.ad = {
          id: String(ad.id),
          title: ad.title || '',
          titleFr: ad.titleFr || '',
          price: ad.price || '',
          category: ad.cat || ad.category || '',
          subcat: ad.subcat || '',
          wilaya: ad.wilaya || '',
          accountId: ad.accountId || '',
          seller_trust_score: ad.seller_trust_score,
          verified: !!ad.verified,
          boosted: !!ad.boosted
        };
      }
      if (window._rizqProfile && window._rizqProfile.businessName) {
        ctx.store = { name: window._rizqProfile.businessName, tier: window._rizqProfile.tier || '' };
      }
      return ctx;
    }

    function _contextGreetingSuffix() {
      var ad = window._currentAd;
      if (!ad || !ad.id) return '';
      var isFr = _ctx.lang === 'fr';
      var title = isFr ? (ad.titleFr || ad.title) : (ad.title || ad.titleFr);
      var price = ad.price ? (' — ' + ad.price) : '';
      return isFr
        ? '\n\n📌 Annonce ouverte: «' + title + '»' + price + '\nPosez-moi des questions sur ce produit (prix, confiance, vendeur).'
        : '\n\n📌 الإعلان المفتوح: «' + title + '»' + price + '\nاسألني عن هذا المنتج (السعر، الموثوقية، البائع).';
    }

    /* إصلاح جوهري 11/08/2026: بعض الصفحات (rizq_landing_v8.html وغيرها) لديها
       دالة toggleLang() محلية خاصة بها تُبدّل اللغة فعلياً (تكتب في localStorage
       وdocument.documentElement.lang مباشرة) دون المرور إطلاقاً بمحرك RizqI18n
       المركزي (applyLang/setLang) — أي أن RizqI18n.getLang() يبقى عالقاً على
       آخر قيمة حُمِّلت بها الصفحة ولا يتحدّث أبداً بعد ذلك على تلك الصفحات.
       كان _detectLang() يُعطي RizqI18n.getLang() الأولوية القصوى، فيرجع "ar"
       بشكل ثابت (أو أي قيمة قديمة) حتى لو بدّل الزائر فعلياً إلى الفرنسية —
       ويدجت "مدير رزق الذكي" يبقى بالعربية رغم أن باقي الصفحة أصبحت فرنسية.
       document.documentElement.lang هو الإشارة الوحيدة التي تُحدَّث فعلياً من
       كل آليات تبديل اللغة الموجودة في المنصة (المركزية والمحلية على حدٍّ سواء)
       — لذا أصبحت المرجع الأول، وRizqI18n.getLang() احتياطي فقط لو غاب الوسم. */
    function _detectLang() {
      var htmlLang = document.documentElement.getAttribute('lang');
      if (htmlLang === 'fr' || htmlLang === 'ar') return htmlLang;
      try {
        if (window.RizqI18n && typeof window.RizqI18n.getLang === 'function') return window.RizqI18n.getLang();
      } catch (e) {}
      try { return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar'; } catch (e) { return 'ar'; }
    }

    function _applyWidgetLang() {
      var lang = _detectLang();
      var isFr = lang === 'fr';
      _ctx.lang = lang;
      var d = isFr ? _WDICT.fr : _WDICT.ar;
      var toggleBtn = document.getElementById('rizq-chat-toggle');
      if (toggleBtn) toggleBtn.setAttribute('aria-label', d.toggleAria);
      var win = document.getElementById('rizq-chat-window');
      if (win) {
        win.setAttribute('aria-label', d.dialogAria);
        win.setAttribute('dir', isFr ? 'ltr' : 'rtl');
      }
      var nameEl = document.querySelector('.rw-header-name');
      if (nameEl) nameEl.textContent = d.headerName;
      var statusEl = document.querySelector('.rw-header-status span:last-child');
      if (statusEl) statusEl.textContent = d.headerStatus;
      var closeBtnEl = document.getElementById('rw-header-close');
      if (closeBtnEl) closeBtnEl.setAttribute('aria-label', d.closeAria);
      var sendBtnEl = document.getElementById('rw-send-btn');
      if (sendBtnEl) sendBtnEl.setAttribute('aria-label', d.sendAria);
      var inputElLang = document.getElementById('rw-input');
      if (inputElLang) {
        inputElLang.setAttribute('placeholder', d.inputPh);
        inputElLang.setAttribute('dir', isFr ? 'ltr' : 'rtl');
        inputElLang.style.textAlign = isFr ? 'left' : 'right';
      }
      var footerEl = document.querySelector('.rw-footer');
      if (footerEl) footerEl.innerHTML = d.footerHtml;
      var qaButtons = document.querySelectorAll('.rw-quick-btn');
      qaButtons.forEach(function (b2, i) {
        var qa = _quickActions[i];
        if (!qa) return;
        var item = isFr ? qa.fr : qa.ar;
        b2.textContent = item.label;
        b2.setAttribute('data-action', item.action);
        b2.removeAttribute('data-q');
      });
    }

    /* ── سطر الحالة الخاص بسياق المتجر (اسم النشاط التجاري) ──
       دالة واحدة مشتركة يستدعيها open() و_refreshWidgetLang() لتفادي ازدواج نفس المنطق
       في مكانين قد ينحرفان عن بعضهما مستقبلاً. لا تُغيّر أبداً اسم/هوية الويدجت نفسها —
       "مدير رزق الذكي" يبقى ثابتاً؛ هذا السطر إضافي فقط تحت الاسم. */
    function _applyBusinessStatus() {
      if (!_ctx.profile || !_ctx.profile.businessName || _ctx.profile.businessName === 'رزق') return;
      var statusEl = document.querySelector('.rw-header-status span:last-child');
      var dotEl = document.querySelector('.rw-status-dot');
      var isFrNow = _ctx.lang === 'fr';
      // إصلاح: profile.isOffHours (يصل الآن من rizq_secretary_agent.js) لم يكن
      // يُستخدَم في أي مكان — الويدجت لا يظهر أي فرق فعلي خارج ساعات الدوام رغم
      // أن هذا كان الغرض المُعلَن لخدمة "السكرتير الذكي" الحصرية للباقة الماسية.
      // الآن: يتحول الخط ولون النقطة إلى وضع "سكرتير آلي خارج الدوام" فعلياً.
      if (_ctx.profile.isOffHours) {
        if (statusEl) statusEl.textContent = isFrNow
          ? ('Secrétaire IA (hors horaires) · ' + _ctx.profile.businessName)
          : ('سكرتير آلي (خارج الدوام) · ' + _ctx.profile.businessName);
        if (dotEl) dotEl.style.background = '#f59e0b';
        return;
      }
      if (statusEl) statusEl.textContent = isFrNow
        ? ('En ligne · assiste ' + _ctx.profile.businessName)
        : ('متاح الآن · يخدمك في ' + _ctx.profile.businessName);
      if (dotEl) dotEl.style.background = '#22c55e';
    }

    function _ts() {
      var d = new Date();
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    function _esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function _scroll() {
      var el = document.getElementById('rw-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }

    function _addMessage(text, role) {
      var msgs = document.getElementById('rw-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'rw-msg ' + role;
      var av = role === 'agent' ? '<div class="rw-msg-avatar">' + _AVATAR + '</div>' : '';
      div.innerHTML = av + '<div><div class="rw-bubble">' + _esc(text) + '</div><div class="rw-ts">' + _ts() + '</div></div>';
      msgs.appendChild(div);
      _scroll();
      _history.push({ role: role, text: text, ts: _ts() });
    }

    function _showTyping() {
      var msgs = document.getElementById('rw-messages');
      if (!msgs || _typing) return;
      _typing = true;
      var div = document.createElement('div');
      div.className = 'rw-msg agent rw-typing';
      div.id = 'rw-typing-indicator';
      div.innerHTML = '<div class="rw-msg-avatar">' + _AVATAR + '</div>' +
        '<div class="rw-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
      msgs.appendChild(div);
      _scroll();
    }

    function _hideTyping() {
      _typing = false;
      var el = document.getElementById('rw-typing-indicator');
      if (el) el.parentNode.removeChild(el);
    }

    function _detectMessageLang(userText) {
      var t = String(userText || '').trim();
      var lower = t.toLowerCase();
      if (!t) return _ctx.lang || 'ar';
      if (/كيفاش|شنهو|شنو\s*هو|نعاونك|بغيت|شحال|ماكو|كاين|واش\s*راك/.test(t)) return 'hs';
      if (/[\u0600-\u06FF]/.test(t)) return 'ar';
      if (/bonjour|merci|comment|prix|acheter|vendre|combien|annonce|forfait|svp|je\s+veux|puis-je/.test(lower)) return 'fr';
      if (/hola|gracias|precio|quiero|vender|comprar|cu[aá]nto|anuncio|confianza/.test(lower)) return 'es';
      if (/hello|thanks|how|what|price|buy|sell|help|please|trust|seller|package/.test(lower)) return 'en';
      if (/[a-z]/i.test(t)) return 'en';
      return _ctx.lang || 'ar';
    }

    // ── ردّ محلي (محرك الكلمات المفتاحية الثابت) — يُستخدم كخط دفاع أخير ──
    function _localReply(userText) {
      var mgr = window.RizqManager;
      var pageCtx = _collectPageContext();
      var msgLang = _detectMessageLang(userText);
      var result = (mgr && typeof mgr.processMessage === 'function')
        ? mgr.processMessage(userText, Object.assign({}, _ctx, { uiLang: _ctx.lang, lang: msgLang, pageContext: pageCtx }))
        : { reply: _WDICT[msgLang === 'fr' ? 'fr' : 'ar'].defaultReply };
      return result.reply || result;
    }

    /* ══════════════════════════════════════════════════════
       _reply — إصلاح جوهري: كان الويدجت يعتمد حصرياً على محرك كلمات
       مفتاحية ثابت محلياً (RizqManager.processMessage) — لا ذكاء اصطناعي
       حقيقي إطلاقاً مهما كان السؤال. الآن يحاول أولاً خادم rizq-backend
       (POST /api/widget/chat، مدعوم بـ Claude) الذي يرد بردود حقيقية
       وواعية بالسياق (اسم المنشأة، ساعات الدوام، حالة خارج الدوام...)،
       وإن تعذّر (لا رابط خادم مضبوط / انقطاع شبكة / تأخر أكثر من 7 ثوانٍ)
       يعود فوراً وبصمت للمحرك المحلي — لا عطل ظاهر للزائر أبداً في أي حال.
    ══════════════════════════════════════════════════════ */
    function _reply(userText) {
      _showTyping();
      var minDelay = new Promise(function (resolve) { setTimeout(resolve, 500); });

      var smartReply = (function () {
        if (!window.RIZQ_BACKEND_BASE) return Promise.reject(new Error('no_backend_configured'));
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 7000) : null;
        return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/widget/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            lang: _detectMessageLang(userText),
            uiLang: _ctx.lang,
            profile: _ctx.profile || null,
            history: (_history || []).slice(-6),
            pageContext: _collectPageContext()
          }),
          signal: controller ? controller.signal : undefined
        }).then(function (res) {
          if (timeoutId) clearTimeout(timeoutId);
          if (!res.ok) throw new Error('http_' + res.status);
          return res.json();
        })        .then(function (data) {
          if (!data || !data.ok || !data.reply) throw new Error('bad_response');
          return { text: data.reply, grounded: !!data.grounded };
        });
      })();

      Promise.all([smartReply.catch(function () { return null; }), minDelay])
        .then(function (r) {
          var aiResult = r[0];
          _hideTyping();
          var replyText = aiResult && aiResult.text ? aiResult.text : _localReply(userText);
          _addMessage(replyText, 'agent');
        });
    }

    function open() {
      _open = true;

      // مزامنة لغة الويدجت في كل مرة يُفتح فيها (كانت _applyWidgetLang لا تُستدعى أبداً سابقاً،
      // فيبقى _ctx.lang = 'ar' دائماً حتى لو كانت الصفحة بالفرنسية، فتُرسَل الردود بالعربية دوماً)
      _applyWidgetLang();

      // تحميل بيانات المتجر/المكتب في كل مرة يُفتح فيها الـ widget
      // ملاحظة: لا نُغيّر أبداً اسم/هوية الويدجت إلى "مساعد <اسم المتجر>" —
      // مدير رزق الذكي يبقى هو نفسه في كل صفحات المنصة (متجر/مكتب/شركة/عام).
      // بدلاً من ذلك نعرض اسم المتجر في سطر الحالة فقط عبر _applyBusinessStatus()، كسياق إضافي وليس كهوية بديلة.
      var profile = _loadPageProfile();
      if (profile) {
        _ctx.profile = profile;
        _ctx.tier    = profile.tier || 'visitor';
        _applyBusinessStatus();
      }

      var w = document.getElementById('rizq-chat-window');
      var t = document.getElementById('rizq-chat-toggle');
      var b = document.getElementById('rizq-badge');
      if (w) w.classList.add('visible');
      if (t) t.classList.add('open');
      if (b) b.style.display = 'none';
      var msgs = document.getElementById('rw-messages');
      if (msgs && msgs.children.length === 0) {
        var glang = _ctx.lang === 'fr' ? 'fr' : 'ar';
        // تحية مُخصَّصة باسم المتجر الحقيقي
        var bizName = (_ctx.profile && _ctx.profile.businessName) || 'رزق';
        var greeting = (window.RizqManager && window.RizqManager.IDENTITY &&
          window.RizqManager.IDENTITY.greeting && window.RizqManager.IDENTITY.greeting[glang]) ||
          (glang === 'fr'
            ? 'Bienvenue chez ' + bizName + '! 👋\nJe suis le Gestionnaire Rizq IA. Comment puis-je vous aider?'
            : 'أهلاً بك في ' + bizName + '! 👋\nأنا مدير رزق الذكي، كيف أخدمك اليوم؟');
        greeting += _contextGreetingSuffix();
        setTimeout(function () { _addMessage(greeting, 'agent'); }, 300);
      }
      var input = document.getElementById('rw-input');
      if (input) setTimeout(function () { input.focus(); }, 400);
      var pb = document.getElementById('rizq-prompt-bubbles');
      if (pb) pb.style.display = 'none';
    }

    function close() {
      _open = false;
      var w = document.getElementById('rizq-chat-window');
      var t = document.getElementById('rizq-chat-toggle');
      if (w) w.classList.remove('visible');
      if (t) t.classList.remove('open');
      var pb = document.getElementById('rizq-prompt-bubbles');
      if (pb) pb.style.display = 'block';
    }

    function toggle() { _open ? close() : open(); }

    function send() {
      var input = document.getElementById('rw-input');
      if (!input) return;
      var txt = input.value.trim();
      if (!txt) return;
      input.value = '';
      input.style.height = 'auto';
      _addMessage(txt, 'user');
      var qa = document.getElementById('rw-quick-actions');
      if (qa) qa.style.display = 'none';
      _reply(txt);
    }

    function _handleQuickAction(action) {
      if (!action) return;
      if (action.indexOf('nav:') === 0) {
        window.location.href = action.slice(4);
        return;
      }
      if (action === 'report') {
        if (typeof window.openReportModal === 'function') {
          open();
          window.openReportModal();
          return;
        }
        quickSend(_ctx.lang === 'fr' ? "J'ai une réclamation sur une annonce" : 'عندي شكوى على إعلان');
        return;
      }
      if (action.indexOf('chat:') === 0) {
        quickSend(action.slice(5));
      }
    }

    function quickSend(txt) {
      var input = document.getElementById('rw-input');
      if (input) { input.value = ''; input.style.height = 'auto'; }
      _addMessage(txt, 'user');
      var qa = document.getElementById('rw-quick-actions');
      if (qa) qa.style.display = 'none';
      _reply(txt);
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }

    /* ── ربط الأحداث عبر addEventListener (دل onclick inline) ── */
    var btn = document.getElementById('rizq-chat-toggle');
    var closeBtn = document.getElementById('rw-header-close');
    var sendBtn = document.getElementById('rw-send-btn');
    var inputEl = document.getElementById('rw-input');
    var quickBtns = document.querySelectorAll('.rw-quick-btn');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (sendBtn) sendBtn.addEventListener('click', send);
    if (inputEl) {
      inputEl.addEventListener('keydown', handleKey);
      inputEl.addEventListener('input', function () { autoResize(this); });
    }
    quickBtns.forEach(function (b2) {
      b2.addEventListener('click', function () {
        var act = this.getAttribute('data-action');
        if (act) return _handleQuickAction(act);
        var q = this.getAttribute('data-q');
        if (q) quickSend(q);
      });
    });

    /* ── Drag ── */
    (function () {
      if (!btn) return;
      var dragging = false, moved = false, startX, startY, origLeft, origTop;

      // استعادة الموضع المحفوظ
      try {
        var saved = JSON.parse(localStorage.getItem('rizq_widget_pos') || 'null');
        if (saved) _applyPos(saved.left, saved.top);
      } catch (e) {}

      function _applyPos(x, y) {
        var maxX = window.innerWidth  - btn.offsetWidth  - 8;
        var maxY = window.innerHeight - btn.offsetHeight - 8;
        btn.style.left   = Math.max(8, Math.min(x, maxX)) + 'px';
        btn.style.top    = Math.max(8, Math.min(y, maxY)) + 'px';
        btn.style.right  = 'auto';
        btn.style.bottom = 'auto';
      }

      function _xy(e) {
        return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                         : { x: e.clientX,             y: e.clientY };
      }

      function onStart(e) {
        var p = _xy(e);
        dragging = true; moved = false;
        startX = p.x; startY = p.y;
        var rect = btn.getBoundingClientRect();
        origLeft = rect.left; origTop = rect.top;
        btn.classList.add('rw-dragging');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      }

      function onMove(e) {
        if (!dragging) return;
        if (e.cancelable) e.preventDefault();
        var p = _xy(e); var dx = p.x - startX, dy = p.y - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
        if (moved) _applyPos(origLeft + dx, origTop + dy);
      }

      function onEnd() {
        if (!dragging) return;
        dragging = false;
        btn.classList.remove('rw-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        if (moved) {
          var rect = btn.getBoundingClientRect();
          try { localStorage.setItem('rizq_widget_pos', JSON.stringify({ left: rect.left, top: rect.top })); } catch (e) {}
        } else {
          toggle();
        }
      }

      btn.addEventListener('mousedown', onStart);
      btn.addEventListener('touchstart', onStart, { passive: true });
    })();

    /* ── إعادة تطبيق سطر الحالة الخاص بالمتجر بعد أي تحديث للغة ──
       (_applyWidgetLang() تكتب نص الحالة العام دائماً؛ إن كان لدينا profile
       محمَّل مسبقاً من فتحة سابقة، نُعيد كتابة السطر باسم المتجر فوق النص العام
       بدل أن يبقى النص العام ظاهراً حتى إغلاق الويدجت وإعادة فتحه) */
    function _refreshWidgetLang() {
      _applyWidgetLang();
      _applyBusinessStatus();
    }

    /* ── مزامنة اللغة عند التحميل + عند أي تبديل لغة في الصفحة ──
       إصلاح 11/08/2026: كان الاستماع على window بينما RizqI18n.applyLang()
       يُطلق الحدث على document فعلياً (بلا bubbles:true) — أي أن الحدث لا
       يصل أبداً إلى مستمع مسجَّل على window. صُحِّح إلى document (يطابق
       rizq_footer_toggle.js). هذا يُصلح الصفحات ذات محرك RizqI18n المركزي.
       لكن صفحات أخرى (rizq_landing_v8.html وغيرها) لديها toggleLang() محلية
       لا تُطلق هذا الحدث إطلاقاً مهما كان — لذا أضفنا أيضاً MutationObserver
       يراقب تغيّر خاصية lang على <html> مباشرة، وهي الإشارة الوحيدة التي
       تُحدَّث فعلياً من كل آليات تبديل اللغة الموجودة في المنصة بلا استثناء،
       فيعمل الويدجت بشكل صحيح على كل الصفحات دون أي تعديل يدوي لكل صفحة. */
    _applyWidgetLang();
    document.addEventListener('rizq:langchange', _refreshWidgetLang);
    try {
      new MutationObserver(_refreshWidgetLang)
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch (e) {}

    /* ── Prompt bubbles فوق أيقونة الشات — تشجيع على بدء المحادثة ── */
    (function initPromptBubbles() {
      var bubble = document.getElementById('rw-prompt-bubble');
      var wrap = document.getElementById('rizq-prompt-bubbles');
      if (!bubble || !wrap) return;
      var prompts = {
        ar: ['💡 كيف أنشر إعلاني؟', '🛡️ هل رزق آمن؟', '💳 طرق الدفع؟', '🔍 ابحث عن سيارة', '📦 ما هي الباقات؟'],
        fr: ['💡 Comment publier ?', '🛡️ Rizq est-il sûr ?', '💳 Modes de paiement ?', '🔍 Chercher une voiture', '📦 Quels forfaits ?']
      };
      var idx = 0;
      function langNow() { return _ctx.lang === 'fr' ? 'fr' : 'ar'; }
      function showPrompt() {
        if (_open) { wrap.style.display = 'none'; return; }
        wrap.style.display = 'block';
        var list = prompts[langNow()] || prompts.ar;
        bubble.classList.remove('visible');
        setTimeout(function () {
          bubble.textContent = list[idx % list.length];
          idx++;
          bubble.classList.add('visible');
        }, 120);
      }
      bubble.addEventListener('click', function () {
        var txt = bubble.textContent.replace(/^[^\s]+\s*/, '').trim();
        open();
        if (txt) setTimeout(function () { quickSend(txt); }, 450);
      });
      setTimeout(showPrompt, 3500);
      setInterval(function () {
        if (!_open) showPrompt();
      }, 7000);
    })();

    return { toggle: toggle, open: open, close: close, send: send, quickSend: quickSend, handleKey: handleKey, autoResize: autoResize };
  })();

  window.openRizqWidget = function () {
    if (window.RizqWidget && typeof window.RizqWidget.open === 'function') window.RizqWidget.open();
  };
  window.toggleRizqWidget = function () {
    if (window.RizqWidget && typeof window.RizqWidget.toggle === 'function') window.RizqWidget.toggle();
  };

})();
