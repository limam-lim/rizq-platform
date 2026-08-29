/**
 * rizq_widget_embed.js — مدير رزق الذكي (embed + drag)
 * يُحقن في أي صفحة بسطرين:
 *   <script src="rizq_packages_config.js"><\/script>
 *   <script src="rizq_agent.js"><\/script>
 *   <script src="rizq_manager_agent_config.js"><\/script>
 *   <script src="rizq_widget_markdown.js"><\/script>
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
    'justify-content:center;z-index:400;transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;}',
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
    '#rizq-chat-window{position:fixed;top:72px;bottom:20px;right:20px;left:auto;width:min(308px,calc(100vw - 40px));',
    'height:auto;max-height:none;min-height:340px;',
    'background:#fff;border-radius:16px;',
    'box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);',
    'display:flex;flex-direction:column;z-index:9999;overflow:hidden;',
    'transform:scale(.96) translateY(12px);opacity:0;pointer-events:none;',
    'transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s;',
    "font-family:'Cairo',system-ui,sans-serif;border:1.5px solid rgba(201,168,76,.25);}",
    '#rizq-chat-window.visible{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
    '#rizq-chat-toggle.open{display:none!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;}',
    '#rizq-chat-window[dir="ltr"] .rw-header-info{text-align:left;}',
    '#rizq-chat-window[dir="rtl"] .rw-header-info{text-align:right;}',
    'html[dir="ltr"] #rizq-chat-window{left:20px !important;right:auto !important;}',
    'html[dir="ltr"] #rizq-chat-toggle{left:28px !important;right:auto !important;}',
    'html[dir="rtl"] #rizq-chat-window{right:20px !important;left:auto !important;}',
    'html[dir="rtl"] #rizq-chat-toggle{right:28px !important;left:auto !important;}',
    '.rw-header{background:linear-gradient(135deg,#0f2347 0%,#1B3A6B 60%,#234d8f 100%);',
    'padding:14px 14px 12px;display:flex;align-items:center;gap:10px;position:relative;flex-shrink:0;',
    'min-height:68px;overflow:visible;}',
    '.rw-header::after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;',
    'background:linear-gradient(90deg,transparent,#C9A84C,transparent);}',
    '.rw-header-avatar{width:42px;height:42px;border-radius:50%;border:2.5px solid #C9A84C;',
    'overflow:hidden;flex-shrink:0;background:#0f2347;}',
    '.rw-header-avatar img,.rw-header-avatar svg{width:100%;height:100%;object-fit:cover;display:block;}',
    '.rw-header-info{flex:1;min-width:0;overflow:visible;}',
    '.rw-header-name{font-size:15px;font-weight:700;color:#e8c96a;line-height:1.35;overflow:visible;white-space:normal;}',
    '.rw-header-status{font-size:11px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:5px;margin-top:3px;',
    'line-height:1.35;overflow:visible;white-space:normal;flex-wrap:wrap;}',
    '.rw-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:rwPulse 2s infinite;}',
    '.rw-header-close{background:rgba(255,255,255,.12);border:none;color:#fff;width:32px;height:32px;',
    'border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;',
    'transition:background .2s;flex-shrink:0;}',
    '.rw-header-close:hover{background:rgba(255,255,255,.25);}',
    '.rw-quick-actions{padding:8px 10px 10px;display:flex;gap:6px 5px;flex-wrap:wrap;align-content:flex-start;',
    'overflow:visible;max-height:none;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0;}',
    '#rizq-chat-window[dir="rtl"] .rw-quick-actions{direction:rtl;}',
    '#rizq-chat-window[dir="ltr"] .rw-quick-actions{direction:ltr;justify-content:flex-start;}',
    '.rw-quick-btn{background:#f1f5f9;border:1px solid #cbd5e1;color:#0c1220;font-size:.7rem;',
    "font-weight:700;font-family:'Cairo',system-ui,sans-serif;padding:5px 10px;border-radius:18px;",
    'cursor:pointer;transition:all .2s ease;white-space:normal;flex-shrink:0;line-height:1.35;max-width:100%;}',
    '.rw-quick-btn:hover{background:#1b3a6b;color:#fff;border-color:#1b3a6b;}',
    '.rw-messages{flex:1 1 auto;overflow-y:auto;padding:12px;display:flex;flex-direction:column;',
    'gap:8px;min-height:100px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}',
    '.rw-messages::-webkit-scrollbar{width:4px;}',
    '.rw-messages::-webkit-scrollbar-thumb{background:#e8e8e8;border-radius:2px;}',
    '.rw-msg{display:flex;align-items:flex-end;gap:8px;max-width:88%;animation:rwMsgIn .3s ease-out;flex-shrink:0;}',
    '@keyframes rwMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
    '.rw-msg.agent{align-self:flex-start;flex-direction:row;max-width:88%!important;}',
    '.rw-msg.user,.chat-msg.user{align-self:flex-end;flex-direction:row-reverse;max-width:80%!important;}',
    '.rw-msg-body,.rw-msg>div:not(.rw-msg-avatar){flex:1;min-width:0;max-width:100%;display:flex;flex-direction:column;}',
    '.rw-msg.user .rw-msg-body,.rw-msg.user>div:not(.rw-msg-avatar){align-items:flex-end;}',
    '.rw-msg.agent .rw-msg-body,.rw-msg.agent>div:not(.rw-msg-avatar){align-items:flex-start;}',
    '.rw-msg-avatar{width:32px;height:32px;border-radius:50%;border:1.5px solid #C9A84C;',
    'overflow:hidden;flex-shrink:0;background:#0f2347;}',
    '.rw-msg-avatar img,.rw-msg-avatar svg{width:100%;height:100%;object-fit:cover;display:block;}',
    '.rw-bubble,.chat-bubble,.message-bubble{max-width:100%!important;min-width:60px!important;width:fit-content!important;',
    'padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.55;direction:rtl;unicode-bidi:plaintext;',
    'word-wrap:break-word!important;word-break:normal!important;overflow-wrap:break-word!important;white-space:pre-wrap!important;}',
    '.rw-bubble .rw-num,.rw-bubble .rw-ltr{display:inline-block;direction:ltr;unicode-bidi:isolate;text-align:left;font-variant-numeric:lining-nums;}',
    '.rw-bubble strong{font-weight:700;}',
    '.rw-bubble em{font-style:italic;}',
    '.rw-bubble .rw-md-h{font-weight:700;font-size:14px;margin:6px 0 4px;color:#1B3A6B;}',
    '.rw-bubble .rw-md-ul{margin:4px 0 6px;padding-right:18px;padding-left:0;list-style:disc;}',
    '.rw-bubble .rw-md-li{margin:2px 0;line-height:1.5;}',
    '.rw-bubble .rw-ltr{display:inline-block;direction:ltr;unicode-bidi:isolate;text-align:left;}',
    '.rw-bubble .rw-md-ul,.rw-bubble .rw-md-li{word-break:normal!important;white-space:normal!important;}',
    '.rw-msg.agent .rw-bubble{background:#f5f5f5;color:#222;border-bottom-right-radius:4px;border:1px solid #e8e8e8;}',
    '.rw-msg.user .rw-bubble{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;border-bottom-left-radius:4px;}',
    '.rw-typing .rw-bubble{background:#f5f5f5;border:1px solid #e8e8e8;padding:12px 16px;}',
    '.typing-dots{display:flex;gap:4px;}',
    '.typing-dots span{width:7px;height:7px;background:#888;border-radius:50%;animation:rwTyping 1.2s infinite;}',
    '.typing-dots span:nth-child(2){animation-delay:.2s}.typing-dots span:nth-child(3){animation-delay:.4s}',
    '@keyframes rwTyping{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}',
    '.rw-ts{font-size:10px;color:#888;margin-top:3px;text-align:center;}',
    '.rw-input-area{padding:12px 16px;border-top:1px solid #e2e8f0;background:#fff;',
    'display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '.rw-input-area input,.rw-input-area textarea,.rw-input{direction:ltr!important;text-align:left!important;unicode-bidi:plaintext;font-variant-numeric:lining-nums;}',
    '.rw-input{flex:1;border:1px solid #cbd5e1;border-radius:24px;padding:10px 18px;',
    "font-size:.9rem;font-family:'Cairo',sans-serif;resize:none;outline:none;background:#f8fafc;",
    'max-height:100px;overflow-y:auto;line-height:1.4;transition:border-color .2s,background .2s;}',
    '.rw-input:focus{border-color:#1B3A6B;background:#fff;}',
    '.rw-input::placeholder{color:#94a3b8;}',
    '.rw-send-btn{width:42px;height:42px;background:#1b3a6b;',
    'border:none;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;',
    'justify-content:center;transition:transform .2s,background .2s;flex-shrink:0;}',
    '.rw-send-btn:hover{transform:scale(1.06);background:#234d8f;}',
    '.rw-send-btn:active{transform:scale(.95);}',
    '.rw-send-btn svg{width:18px;height:18px;}',
    '.rw-attach-btn{width:38px;height:38px;background:#f1f5f9;border:1px solid #cbd5e1;',
    'border-radius:50%;color:#475569;cursor:pointer;display:flex;align-items:center;',
    'justify-content:center;transition:background .2s,border-color .2s;flex-shrink:0;}',
    '.rw-attach-btn:hover{background:#e2e8f0;border-color:#94a3b8;}',
    '.rw-attach-btn svg{width:18px;height:18px;}',
    '.rw-attach-preview{display:none;padding:8px 16px 0;background:#fff;border-top:1px solid #f1f5f9;}',
    '.rw-attach-preview.visible{display:flex;align-items:center;gap:10px;}',
    '.rw-attach-preview img{width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;}',
    '.rw-attach-preview span{flex:1;font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.rw-attach-remove{background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;line-height:1;padding:4px;}',
    '.rw-msg-image{margin-bottom:8px;}',
    '.rw-msg-image img{max-width:180px;max-height:140px;border-radius:10px;border:1px solid rgba(0,0,0,.08);display:block;}',
    '.rw-footer{text-align:center;font-size:10px;color:#888;padding:7px 8px;line-height:1.4;',
    'background:#f5f5f5;border-top:1px solid #e8e8e8;flex-shrink:0;}',
    '@media(max-width:440px){',
    '#rizq-chat-window{top:64px;bottom:calc(12px + env(safe-area-inset-bottom,0));',
    'width:min(292px,calc(100vw - 28px));right:14px;left:auto;min-height:320px;}',
    '#rizq-chat-toggle{right:14px;bottom:calc(84px + env(safe-area-inset-bottom,0));}',
    'html[dir="ltr"] #rizq-chat-window{left:14px !important;right:auto !important;}',
    'html[dir="ltr"] #rizq-chat-toggle{left:14px !important;right:auto !important;}',
    '.rw-header-name{font-size:14px;}.rw-header-status{font-size:10px;}',
    '.rw-quick-btn{font-size:.68rem;padding:4px 8px;}}',
    '@media(max-width:768px) and (min-width:441px){',
    '#rizq-chat-window{top:68px;bottom:16px;width:min(300px,calc(100vw - 32px));}}',
    '#rizq-prompt-bubbles{position:fixed;bottom:100px;right:28px;z-index:500;pointer-events:none}',
    'html[dir="ltr"] #rizq-prompt-bubbles{right:auto;left:28px}',
    '.rw-prompt-bubble{position:relative;background:#fff;border:1.5px solid rgba(201,168,76,.35);',
    'border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:12px;font-weight:700;color:#1B3A6B;',
    'box-shadow:0 8px 28px rgba(27,58,107,.18);opacity:0;transform:translateY(8px) scale(.95);',
    'transition:all .4s cubic-bezier(.34,1.56,.64,1);pointer-events:auto;cursor:pointer;',
    'max-width:220px;line-height:1.45;font-family:\'Cairo\',system-ui,sans-serif;direction:inherit;text-align:start}',
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
      '<rect x="1" y="1" width="38" height="38" rx="9" fill="#0f172a"/>' +
      '<circle class="rw-orbit" cx="6" cy="9" r="1.1" fill="#F3DE9C"/>' +
      '<circle class="rw-orbit rw-orbit-2" cx="35" cy="14" r="1" fill="#F3DE9C"/>' +
      '<circle class="rw-orbit rw-orbit-3" cx="8" cy="33" r="0.9" fill="#F3DE9C"/>' +
      '<text x="18" y="27" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="18" font-weight="700" fill="url(#' + gid + ')">R</text>' +
      '<text x="30" y="29" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="700" fill="url(#' + gid + ')">,</text>' +
      '<path class="rw-spark" d="M34 5l1.5 3.8 3.8 1.5-3.8 1.5-1.5 3.8-1.5-3.8-3.8-1.5 3.8-1.5z" fill="#fff"/>' +
      '</svg>';
  }

  /* ══════════════ HTML ══════════════ */
  var wrapper = document.createElement('div');
  wrapper.id = 'rizq-widget-root';
  wrapper.innerHTML = [
    '<button id="rizq-chat-toggle" aria-label="رزق ذكي — مساعدك على المنصة">',
    '  <span id="rizq-badge" style="display:none">1</span>',
    '  <span class="rizq-avatar-icon">' + _rizqAvatarSvg(38) + '</span>',
    '</button>',
    '<div id="rizq-prompt-bubbles" aria-hidden="true">',
    '  <button type="button" class="rw-prompt-bubble" id="rw-prompt-bubble"></button>',
    '</div>',
    '<div id="rizq-chat-window" role="dialog" aria-label="رزق ذكي — مساعدك على المنصة">',
    '  <div class="rw-header">',
    '    <div class="rw-header-avatar">' + _rizqAvatarSvg(48) + '</div>',
    '    <div class="rw-header-info">',
    '      <div class="rw-header-name">✨ رزق ذكي</div>',
      '      <div class="rw-header-status"><span class="rw-status-dot"></span><span>متاح الآن · يرد خلال ثوانٍ</span></div>',
    '    </div>',
    '    <button class="rw-header-close" id="rw-header-close" aria-label="إغلاق">✕</button>',
    '  </div>',
    '  <div class="rw-quick-actions" id="rw-quick-actions"></div>',
    '  <div class="rw-messages" id="rw-messages"></div>',
    '  <div class="rw-attach-preview" id="rw-attach-preview">',
    '    <img id="rw-attach-thumb" alt="" />',
    '    <span id="rw-attach-label"></span>',
    '    <button type="button" class="rw-attach-remove" id="rw-attach-remove" aria-label="إزالة">×</button>',
    '  </div>',
    '  <div class="rw-input-area">',
    '    <input type="file" id="rw-attach-input" accept="image/jpeg,image/png,image/webp" hidden />',
    '    <button type="button" class="rw-attach-btn" id="rw-attach-btn" aria-label="إرفاق صورة">',
    '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    '      </svg>',
    '    </button>',
    '    <textarea id="rw-input" class="rw-input" dir="ltr" placeholder="اكتب رسالتك هنا..." rows="1"></textarea>',
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
    var _pendingAttachment = null;
    var _catalogPollTimer = null;
    var _CATALOG_POLL_MS = 60000;
    var _MAX_ATTACH_BYTES = 3 * 1024 * 1024;
    var _ctx = { tier: 'visitor', lang: 'ar', chatLang: null };
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
        toggleAria: 'رزق ذكي — مساعدك على المنصة',
        dialogAria: 'رزق ذكي — مساعدك على المنصة',
        headerName: '✨ رزق ذكي',
        headerStatus: 'متاح الآن · يرد خلال ثوانٍ',
        closeAria: 'إغلاق',
        sendAria: 'إرسال',
        attachAria: 'إرفاق صورة أو إيصال',
        attachLabel: 'صورة مرفقة — جاهزة للإرسال',
        attachOnly: '📎 صورة / إيصال مرفق',
        attachTooLarge: '⚠️ حجم الصورة كبير (الحد 3 ميغابايت).',
        attachInvalid: '⚠️ نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP.',
        inputPh: 'اكتب رسالتك هنا...',
        footerHtml: 'مدعوم بـ <strong style="color:#1B3A6B">رزق AI</strong> · منصة رزق للتجارة الإلكترونية',
        greeting: 'أهلاً! 👋\nأنا رزق ذكي — مساعدك على المنصة. كيف أساعدك؟',
        errNoBackend: '⚠️ خدمة الذكاء الاصطناعي غير متصلة بالخادم حالياً. حاول لاحقاً أو راسل direction@rizq.mr',
        errNetwork: '⚠️ تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
        errTimeout: '⚠️ استغرق الرد وقتاً طويلاً. أعد إرسال رسالتك من فضلك.',
        errServer: '⚠️ حدث خطأ في الخادم. حاول بعد قليل أو تواصل مع direction@rizq.mr',
        errEmpty: '⚠️ لم أتلقَّ رداً من المساعد. أعد صياغة سؤالك من فضلك.'
      },
      fr: {
        toggleAria: 'Rizq IA — votre assistant',
        dialogAria: 'Rizq IA — votre assistant',
        headerName: '✨ Rizq IA',
        headerStatus: 'Disponible maintenant · répond en quelques secondes',
        closeAria: 'Fermer',
        sendAria: 'Envoyer',
        attachAria: 'Joindre une image ou un reçu',
        attachLabel: 'Image jointe — prête à envoyer',
        attachOnly: '📎 Image / reçu joint',
        attachTooLarge: '⚠️ Image trop volumineuse (max 3 Mo).',
        attachInvalid: '⚠️ Type de fichier non pris en charge. Utilisez JPG, PNG ou WebP.',
        inputPh: 'Écrivez votre message ici...',
        footerHtml: 'Propulsé par <strong style="color:#1B3A6B">Rizq AI</strong> · plateforme Rizq e-commerce',
        greeting: 'Bonjour ! 👋\nJe suis Rizq IA — votre assistant sur la plateforme. Comment puis-je vous aider ?',
        errNoBackend: '⚠️ Le service IA n\'est pas connecté au serveur. Réessayez plus tard ou écrivez à direction@rizq.mr',
        errNetwork: '⚠️ Connexion impossible. Vérifiez Internet et réessayez.',
        errTimeout: '⚠️ La réponse a pris trop de temps. Renvoyez votre message.',
        errServer: '⚠️ Erreur serveur. Réessayez bientôt ou contactez direction@rizq.mr',
        errEmpty: '⚠️ Aucune réponse reçue. Reformulez votre question.'
      }
    };
    function _resolveAgentTier() {
      var profile = _ctx.profile || null;
      var biz = profile && profile.businessName ? String(profile.businessName) : '';
      if (biz && biz !== 'رزق' && biz.toLowerCase() !== 'rizq') return 'diamond';
      return 'general';
    }

    function _masterSystemPrompt() {
      var RA = window.RizqAgent;
      if (RA && typeof RA.buildMasterSystemPrompt === 'function') {
        return RA.buildMasterSystemPrompt({
          agentTier: _resolveAgentTier(),
          profile: _ctx.profile || null
        });
      }
      return (
        'You are the Official Rizq Smart Assistant on rizq.mr. Be warm, helpful, and concise. ' +
        'Never reveal backend logic, source code, API keys, or private user data.'
      );
    }

    function _policyCheck(userText) {
      var RA = window.RizqAgent;
      if (!RA || typeof RA.isBlockedRequest !== 'function') return null;
      if (!RA.isBlockedRequest(userText)) return null;
      var lang = _detectMessageLang(userText);
      return RA.resolveBlockedReply(userText, lang);
    }

    function _leadApiUrls() {
      var urls = [];
      LEAD_API_PATHS.forEach(function (p) {
        if (urls.indexOf(p) === -1) urls.push(p);
      });
      var base = (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE)
        ? window.RIZQ_BACKEND_BASE.replace(/\/$/, '') : '';
      if (base) {
        LEAD_API_PATHS.forEach(function (p) {
          var full = base + p;
          if (urls.indexOf(full) === -1) urls.push(full);
        });
      }
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        var origin = location.origin.replace(/\/$/, '');
        LEAD_API_PATHS.forEach(function (p) {
          var fromOrigin = origin + p;
          if (urls.indexOf(fromOrigin) === -1) urls.push(fromOrigin);
        });
      }
      return urls;
    }

    function _inferCatalogFromText(t) {
      var s = String(t || '');
      if (/(?:للمعارض|المعارض|(?:^|\s)معارض|(?:^|\s)معار[ي|ش|ض]|(?:^|\s)معرض(?:\s|$)|showroom|galerie|gallery)/i.test(s)) return 'corp';
      if (/(?:لا|ليس|غير|مو|ليسة)\s*[\w\u0600-\u06FF\s،,.]{0,32}(?:محلات|محل|متجر)/i.test(s) && /(?:معارض|معرض|showroom)/i.test(s)) return 'corp';
      if (/(?:مكاتب|مكتب|office|bureau|of-diam)/i.test(s)) return 'office';
      if (/(?:محلات|محل|متجر|store|boutique|st-diam)/i.test(s)) return 'store';
      if (/(?:شركات|شركة|corp|entreprise|cp-diam)/i.test(s)) return 'corp';
      return null;
    }

    function _resolveCatalogHintForMessage(text) {
      var hint = _inferCatalogFromText(text);
      if (hint) return hint;
      var hist = (_history || []).slice(-6);
      for (var i = hist.length - 1; i >= 0; i--) {
        hint = _inferCatalogFromText(hist[i].text || '');
        if (hint) return hint;
      }
      var page = (location.pathname.split('/').pop() || '');
      if (/office|مكتب|bureau/i.test(page)) return 'office';
      if (/store|محل|boutique/i.test(page)) return 'store';
      if (/corp|company|شركة/i.test(page)) return 'corp';
      return null;
    }

    function _inferPackageRefFromConversation(text) {
      var msgs = [String(text || '')];
      (_history || []).slice(-10).reverse().forEach(function (h) {
        if (!h || !h.text) return;
        if (h.role === 'agent' || h.role === 'assistant' || h.role === 'bot') return;
        msgs.push(String(h.text));
      });
      var catalogHint = _resolveCatalogHintForMessage(text);
      for (var mi = 0; mi < msgs.length; mi++) {
        var m = msgs[mi];
        var hint = _resolveCatalogHintForMessage(m) || catalogHint;
        if (/^(of|st|cp)-diam-(std|pro)$/i.test(m)) {
          var idm = m.match(/^(of|st|cp)-diam-(std|pro)$/i);
          return idm[1].toLowerCase() + '-diam-' + idm[2].toLowerCase();
        }
        var hasPro = /(?:\bpro\b|برو|متقد|advanced|premium)/i.test(m);
        var negBasic = /(?:لا|ليس|غير|مو)\s*[\w\u0600-\u06FF\s،,.]{0,22}(?:أساس(?:ية)?|standard|basic)/i.test(m);
        var affirmPro = /(?:بل|أريد|اريد|بغيت|ودي)\s*[\w\u0600-\u06FF\s،,.]{0,28}(?:pro|برو|متقد)/i.test(m);
        if (hint === 'office') {
          if (hasPro || negBasic || affirmPro || /ماس\s*pro|pro\s*ماس|ماسية\s*pro|برو/i.test(m)) return 'of-diam-pro';
          if (/ماس|diamond/i.test(m)) return 'of-diam-std';
        }
        if (hint === 'store') {
          if (hasPro || negBasic || affirmPro || /ماس\s*pro|pro\s*ماس|ماسية\s*pro|برو/i.test(m)) return 'st-diam-pro';
          if (/ماس|diamond/i.test(m)) return 'st-diam-std';
        }
        if (hint === 'corp') {
          if (hasPro || negBasic || affirmPro || /ماس\s*pro|pro\s*ماس|ماسية\s*pro|برو/i.test(m)) return 'cp-diam-pro';
          if (/ماس|diamond/i.test(m)) return 'cp-diam-std';
        }
      }
      return null;
    }

    function _extractLeadPayload(text) {
      var t = String(text || '');
      var isCorrection = /(?:لا|ليس|غير|مو|ليسة|بل|قصدي|أريد|اريد|ودي|بغيت).*?(?:pro|برو|ماس|أساس|standard|basic|مكتب|مكاتب|محل|محلات|معارض|معرض|showroom|شركات)/i.test(t);
      var hasIntent = /(?:اشتراك|تفعيل|باق|ماس|سنو|تجرب|subscribe|forfait|diamond|pro|trial|register)/i.test(t);
      if (!hasIntent && !isCorrection) return null;

      var phoneMatch = t.match(/(?:\+222|00222)[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}|\+222[\d\s\-]{8,18}|\b(?:2|3|4)\d{7}\b/);
      if (!phoneMatch) {
        var histChunks = [t];
        (_history || []).slice(-8).reverse().forEach(function (h) {
          if (!h || !h.text) return;
          if (h.role === 'agent' || h.role === 'assistant' || h.role === 'bot') return;
          histChunks.push(String(h.text));
        });
        phoneMatch = histChunks.join('\n').match(/(?:\+222|00222)[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}|\+222[\d\s\-]{8,18}|\b(?:2|3|4)\d{7}\b/);
      }
      if (!phoneMatch) return null;

      var bizMatch = t.match(/(?:اسم|شركة|محل|منشأة|تاجر|مكتب)[:\s]+([^\n،,]+)/i);
      if (!bizMatch) {
        (_history || []).slice(-8).reverse().some(function (h) {
          if (!h || !h.text || h.role === 'agent') return false;
          var bm = String(h.text).match(/(?:اسم|شركة|محل|منشأة|تاجر|مكتب)[:\s]+([^\n،,]+)/i);
          if (bm) { bizMatch = bm; return true; }
          return false;
        });
      }

      var catalogHint = _resolveCatalogHintForMessage(t);
      var inferred = _inferPackageRefFromConversation(t);
      var pkg = inferred || 'غير محددة';
      if (!inferred) {
        if (/ماس\s*pro|diamond\s*pro|pro\s*ماس/i.test(t) && catalogHint === 'office') pkg = 'of-diam-pro';
        else if (/ماس\s*pro|diamond\s*pro|pro\s*ماس/i.test(t) && catalogHint === 'store') pkg = 'st-diam-pro';
        else if (/ماس\s*pro|diamond\s*pro|pro\s*ماس/i.test(t) && catalogHint === 'corp') pkg = 'cp-diam-pro';
        else if (/ماس\s*pro|diamond\s*pro|الماسية\s*المتقدمة|pro\s*ماس/i.test(t)) pkg = 'الماسية Pro';
        else if (/ماس|diamond/i.test(t) && catalogHint === 'office') pkg = 'of-diam-std';
        else if (/ماس|diamond/i.test(t) && catalogHint === 'store') pkg = 'st-diam-std';
        else if (/ماس|diamond/i.test(t) && catalogHint === 'corp') pkg = 'cp-diam-std';
        else if (/ماس|diamond/i.test(t)) pkg = 'الماسية الأساسية';
        else if (/سنو|year|annuel/i.test(t)) pkg = 'السنوية';
        else if (/\bpro\b/i.test(t)) pkg = 'Pro';
        else if (/تجرب|trial/i.test(t)) pkg = 'التجريبية';
      }
      return {
        business_name: bizMatch ? bizMatch[1].trim().slice(0, 120) : 'غير محدد',
        whatsapp: phoneMatch[0].replace(/\s+/g, ' ').trim(),
        package_requested: pkg,
        catalog_hint: catalogHint,
        pageContext: _collectPageContext(),
        user_message: t.slice(0, 500),
        history: (_history || []).slice(-10),
        notes: 'طلب من ويدجت الموقع',
        channel: 'widget',
      };
    }

    function _submitLeadToBackend(leadPayload) {
      if (!leadPayload || !leadPayload.whatsapp) return Promise.resolve(null);
      var urls = _leadApiUrls();
      function tryLead(idx) {
        if (idx >= urls.length) return Promise.resolve(null);
        return fetch(urls[idx], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload),
        }).then(function (res) {
          if (!res.ok) throw new Error('http_' + res.status);
          return res.json();
        }).catch(function () {
          return tryLead(idx + 1);
        });
      }
      return tryLead(0).then(function (data) {
        if (data && data.lead_id) {
          console.log('[rizq-widget] lead saved', data.lead_id, 'telegram:', data.telegram_sent);
        }
        return data;
      }).catch(function (e) {
        console.error('[rizq-widget] lead API failed', e);
        return null;
      });
    }

    var AGENT_CHAT_PATHS = ['/api/ai/chat', '/api/widget/chat'];
    var LEAD_API_PATHS = ['/api/widget/lead', '/api/leads'];
    var _quickActions = [
      { ar: { label: 'التسجيل', action: 'chat:كيف أسجل' }, fr: { label: 'Inscription', action: 'chat:comment creer un compte' } },
      { ar: { label: 'أنواع الحسابات', action: 'chat:أنواع الحسابات' }, fr: { label: 'Types de comptes', action: 'chat:types de comptes' } },
      { ar: { label: 'نشر إعلان', action: 'nav:rizq_post.html' }, fr: { label: 'Publier', action: 'nav:rizq_post.html' } },
      { ar: { label: 'كيف أشتري', action: 'chat:كيف أشتري' }, fr: { label: 'Acheter', action: 'chat:comment acheter' } },
      { ar: { label: 'الباقات', action: 'chat:الباقات' }, fr: { label: 'Abonnements', action: 'chat:abonnements' } },
      { ar: { label: 'طرق الدفع', action: 'chat:طرق الدفع' }, fr: { label: 'Paiement', action: 'chat:méthodes de paiement' } },
      { ar: { label: 'التوثيق', action: 'chat:توثيق الهوية' }, fr: { label: 'Vérification', action: 'chat:vérification identité' } },
      { ar: { label: 'لوحة التحكم', action: 'chat:لوحة التحكم' }, fr: { label: 'Dashboard', action: 'chat:tableau de bord' } },
      { ar: { label: 'المتجر', action: 'chat:متجر افتراضي' }, fr: { label: 'Boutique', action: 'chat:boutique virtuelle' } },
      { ar: { label: 'المكتب', action: 'chat:مكتب افتراضي' }, fr: { label: 'Bureau', action: 'chat:bureau virtuel' } },
      { ar: { label: 'RIZQ ADS', action: 'chat:rizq ads' }, fr: { label: 'RIZQ ADS', action: 'chat:rizq ads' } },
      { ar: { label: 'الأقسام', action: 'chat:الفئات' }, fr: { label: 'Catégories', action: 'chat:catégories' } },
      { ar: { label: 'عن رزق', action: 'chat:ما هي رزق' }, fr: { label: 'À propos', action: 'chat:qu est ce que rizq' } },
      { ar: { label: 'تواصل', action: 'chat:تواصل' }, fr: { label: 'Contact', action: 'chat:contact support' } },
      { ar: { label: 'شكوى', action: 'report' }, fr: { label: 'Réclamation', action: 'report' } }
    ];

    /** سياق الصفحة — إعلان مفتوح، URL، نوع الصفحة (للـ Backend) */
    function _isPackagePricingQuery(text) {
      return /(?:باق|باقة|اشتراك|سعر|ثمن|كم|كلف|تكلف|تجرب|forfait|package|plan|abonn|pricing|price|cost|subscribe|acheter|comprar|cu[aá]nto|how much|mru|أوقية|ouguiya|ماس|diamond|diamant|pro\b|trial|tarif|precio)/i.test(String(text || ''));
    }

    function _ensureLiveCatalog(force) {
      var cfg = window.RizqPackagesConfig;
      if (cfg && typeof cfg.syncCatalogFromBackend === 'function') {
        return cfg.syncCatalogFromBackend({ force: !!force }).catch(function () { return false; });
      }
      if (window.RizqPackagesUI && typeof window.RizqPackagesUI.syncAllFromBackend === 'function') {
        return new Promise(function (resolve) {
          window.RizqPackagesUI.syncAllFromBackend(function (ok) { resolve(!!ok); });
        });
      }
      return Promise.resolve(false);
    }

    function _refreshManagerSubscriptions() {
      if (window.RizqManager && typeof window.RizqManager.refreshSubscriptionsFromCatalog === 'function') {
        try { window.RizqManager.refreshSubscriptionsFromCatalog(); } catch (eRef) { /* ignore */ }
      }
    }

    function _syncLiveCatalogQuiet() {
      return _ensureLiveCatalog(true).then(function () {
        _refreshManagerSubscriptions();
      });
    }

    function _startCatalogPoll() {
      if (_catalogPollTimer) return;
      _catalogPollTimer = setInterval(function () {
        if (!_open) return;
        _syncLiveCatalogQuiet();
      }, _CATALOG_POLL_MS);
    }

    function _stopCatalogPoll() {
      if (!_catalogPollTimer) return;
      clearInterval(_catalogPollTimer);
      _catalogPollTimer = null;
    }

    function _attachLiveCatalogToContext(ctx) {
      var cfg = window.RizqPackagesConfig;
      if (!cfg) return ctx;
      try {
        var lang = _ctx.lang === 'fr' ? 'fr' : 'ar';
        if (typeof cfg.buildPublicSummary === 'function') ctx.livePackagesSummary = cfg.buildPublicSummary(lang);
        if (typeof cfg.buildPublicOverview === 'function') ctx.livePackagesOverview = cfg.buildPublicOverview(lang);
        ctx.livePackagesFetchedAt = new Date().toISOString();
        if (typeof cfg.getPackagesForTool === 'function') {
          ctx.livePackages = cfg.getPackagesForTool(lang).map(function (p) {
            return { id: p.id, name: p.name, price: p.price, priceLabel: p.priceLabel };
          });
        }
      } catch (eCtx) { /* ignore */ }
      return ctx;
    }

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
      return _attachLiveCatalogToContext(ctx);
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

    function _renderQuickActions() {
      var qaWrap = document.getElementById('rw-quick-actions');
      if (!qaWrap) return;
      var isFr = _ctx.lang === 'fr';
      qaWrap.innerHTML = '';
      _quickActions.forEach(function (qa) {
        var item = isFr ? qa.fr : qa.ar;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rw-quick-btn';
        b.textContent = item.label;
        b.setAttribute('data-action', item.action);
        qaWrap.appendChild(b);
      });
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
      var attachBtnEl = document.getElementById('rw-attach-btn');
      if (attachBtnEl) attachBtnEl.setAttribute('aria-label', d.attachAria);
      var attachLabelEl = document.getElementById('rw-attach-label');
      if (attachLabelEl && _pendingAttachment) attachLabelEl.textContent = d.attachLabel;
      var inputElLang = document.getElementById('rw-input');
      if (inputElLang) {
        inputElLang.setAttribute('placeholder', d.inputPh);
        inputElLang.setAttribute('dir', 'ltr');
        inputElLang.style.textAlign = 'left';
        inputElLang.style.direction = 'ltr';
      }
      var footerEl = document.querySelector('.rw-footer');
      if (footerEl) footerEl.innerHTML = d.footerHtml;
      _renderQuickActions();
      _dockWidgetForLang(isFr);
    }

    function _dockWidgetForLang(isFr) {
      var btn = document.getElementById('rizq-chat-toggle');
      var win = document.getElementById('rizq-chat-window');
      var bubbles = document.getElementById('rizq-prompt-bubbles');
      [btn, win, bubbles].forEach(function (el) {
        if (!el) return;
        el.style.left = '';
        el.style.right = '';
        el.style.top = '';
      });
      try { localStorage.removeItem('rizq_widget_pos'); } catch (eDock) {}
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
      if (window.RizqWidgetMarkdown && typeof window.RizqWidgetMarkdown.formatLocalTime === 'function') {
        return window.RizqWidgetMarkdown.formatLocalTime(new Date());
      }
      try {
        return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) {
        var d = new Date();
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      }
    }
    function _esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    var _BIDI_CTRL_RE = /[\u200E\u200F\u2066\u2067\u2068\u2069\u202A-\u202E]/g;
    var _NUM_RUN_RE = /(?:\+[\d\s\-().]+|[\d][\d\s\-.,()/]*[\d+]|\d+)/g;
    function _westernizeDigits(s) {
      return String(s || '')
        .replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
        .replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); });
    }
    function _stripBidiControls(s) {
      return String(s || '').replace(_BIDI_CTRL_RE, '');
    }
    function _cleanOutgoingText(s) {
      return _westernizeDigits(_stripBidiControls(s)).trim();
    }
    function _isolateNumberRuns(text) {
      return _westernizeDigits(_stripBidiControls(text));
    }
    function _wrapLtrNumbers(html) {
      return html.replace(_NUM_RUN_RE, function (m) {
        if (!/[+\d]/.test(m)) return m;
        return '<bdi dir="ltr" class="rw-ltr">' + m + '</bdi>';
      });
    }
    function _formatAgentHtml(text) {
      if (window.RizqWidgetMarkdown && typeof window.RizqWidgetMarkdown.formatAgentMarkdown === 'function') {
        return window.RizqWidgetMarkdown.formatAgentMarkdown(text);
      }
      return _esc(String(text || '')).replace(/\n/g, '<br>');
    }
    function _bubbleHtml(text, role) {
      if (role === 'user') {
        return _wrapLtrNumbers(_esc(_stripBidiControls(text)));
      }
      if (window.RizqWidgetMarkdown && typeof window.RizqWidgetMarkdown.formatPlainChatText === 'function') {
        text = window.RizqWidgetMarkdown.formatPlainChatText(text);
      } else if (window.RizqWidgetMarkdown && typeof window.RizqWidgetMarkdown.sanitizeAgentText === 'function') {
        text = window.RizqWidgetMarkdown.sanitizeAgentText(text);
      } else {
        text = _stripBidiControls(text);
      }
      return _formatAgentHtml(text);
    }
    function _normalizeInputBidi(el) {
      if (!el) return;
      var v = el.value;
      var sel = el.selectionStart;
      var out = _isolateNumberRuns(v);
      if (out !== v) {
        var delta = out.length - v.length;
        el.value = out;
        try { el.setSelectionRange(sel + delta, sel + delta); } catch (e) {}
      }
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
    }
    function _handleInputKeydown(e) {
      var el = e.target;
      if (!el || e.ctrlKey || e.metaKey || e.altKey) return;
      var key = e.key;
      if (/[\u0660-\u0669\u06F0-\u06F9]/.test(key)) {
        e.preventDefault();
        var western = _westernizeDigits(key);
        var start = el.selectionStart;
        var end = el.selectionEnd;
        el.value = el.value.slice(0, start) + western + el.value.slice(end);
        el.setSelectionRange(start + western.length, start + western.length);
        _normalizeInputBidi(el);
        autoResize(el);
      }
    }
    function _handleInputPaste(e) {
      var el = e.target;
      if (!el) return;
      var pasted = (e.clipboardData || window.clipboardData).getData('text');
      if (!pasted) return;
      e.preventDefault();
      var start = el.selectionStart;
      var end = el.selectionEnd;
      var val = el.value;
      var insert = _isolateNumberRuns(pasted);
      el.value = val.slice(0, start) + insert + val.slice(end);
      var pos = start + insert.length;
      el.setSelectionRange(pos, pos);
      _normalizeInputBidi(el);
      autoResize(el);
    }
    function _scroll() {
      var el = document.getElementById('rw-messages');
      if (!el) return;
      requestAnimationFrame(function () { el.scrollTop = el.scrollHeight; });
    }

    function _dict() {
      return _ctx.lang === 'fr' ? _WDICT.fr : _WDICT.ar;
    }

    function _clearAttachPreview() {
      var preview = document.getElementById('rw-attach-preview');
      var thumb = document.getElementById('rw-attach-thumb');
      var label = document.getElementById('rw-attach-label');
      if (preview) preview.classList.remove('visible');
      if (thumb) thumb.removeAttribute('src');
      if (label) label.textContent = '';
      var fileInput = document.getElementById('rw-attach-input');
      if (fileInput) fileInput.value = '';
    }

    function _setPendingAttachment(dataUri, previewUrl, fileName) {
      _pendingAttachment = { dataUri: dataUri, previewUrl: previewUrl, name: fileName || 'attachment.jpg' };
      var preview = document.getElementById('rw-attach-preview');
      var thumb = document.getElementById('rw-attach-thumb');
      var label = document.getElementById('rw-attach-label');
      var d = _dict();
      if (preview) preview.classList.add('visible');
      if (thumb) thumb.src = previewUrl;
      if (label) label.textContent = (fileName || d.attachLabel);
    }

    function _removePendingAttachment() {
      _pendingAttachment = null;
      _clearAttachPreview();
    }

    function _readFileAsDataUri(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function _handleAttachFile(file) {
      if (!file) return;
      var d = _dict();
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type || '')) {
        _addMessage(d.attachInvalid, 'agent');
        return;
      }
      if (file.size > _MAX_ATTACH_BYTES) {
        _addMessage(d.attachTooLarge, 'agent');
        return;
      }
      _readFileAsDataUri(file).then(function (dataUri) {
        _setPendingAttachment(dataUri, dataUri, file.name);
      }).catch(function () {
        _addMessage(d.attachInvalid, 'agent');
      });
    }

    function _addMessage(text, role, attachmentPreview) {
      var msgs = document.getElementById('rw-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'rw-msg chat-msg ' + (role === 'user' ? 'user' : 'agent');
      var av = role === 'agent' ? '<div class="rw-msg-avatar">' + _AVATAR + '</div>' : '';
      var imgHtml = attachmentPreview
        ? '<div class="rw-msg-image"><img src="' + _esc(attachmentPreview) + '" alt="attachment" /></div>'
        : '';
      var bubbleText = text ? _bubbleHtml(text, role) : '';
      div.innerHTML = av + '<div class="rw-msg-body"><div class="rw-bubble">' + imgHtml + bubbleText + '</div><div class="rw-ts">' + _ts() + '</div></div>';
      msgs.appendChild(div);
      _scroll();
      _history.push({ role: role, text: text || (attachmentPreview ? _dict().attachOnly : ''), ts: _ts() });
    }

    function _showTyping() {
      var msgs = document.getElementById('rw-messages');
      if (!msgs || _typing) return;
      _typing = true;
      var div = document.createElement('div');
      div.className = 'rw-msg agent rw-typing typing-indicator';
      div.id = 'rw-typing-indicator';
      div.innerHTML = '<div class="rw-msg-avatar">' + _AVATAR + '</div>' +
        '<div class="rw-msg-body"><div class="rw-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>';
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
      if (!t) return _ctx.chatLang || _ctx.lang || 'ar';
      if (window.RizqManager && typeof window.RizqManager.detectLangSwitchRequest === 'function') {
        var sw = window.RizqManager.detectLangSwitchRequest(t);
        if (sw) return sw;
      }
      if (/كيفاش|شنهو|شنو|واش|بغيت|شحال|ماكو|كاين|نعاونك|راك|الزين|ما\s*كاين|دراري|بزاف|واخا|علاش|فين|دابا|يلاه|ماشي|هادشي|حسانية|شنهي/.test(t)) return 'hs';
      if (/[\u0600-\u06FF]/.test(t)) return _ctx.chatLang || _ctx.lang || 'ar';
      if (/bonjour|merci|comment|prix|acheter|vendre|combien|annonce|forfait|svp|je\s+veux|puis-je|salut|bonjour/.test(lower)) return 'fr';
      if (/hola|gracias|precio|quiero|vender|comprar|cu[aá]nto|anuncio|confianza/.test(lower)) return 'es';
      if (/hello|thanks|how|what|price|buy|sell|help|please|trust|seller|package|hi\b|hey\b/.test(lower)) return 'en';
      if (/[a-z]/i.test(t)) return 'en';
      return _ctx.chatLang || _ctx.lang || 'ar';
    }

    function _agentFetchUrls() {
      var urls = [];
      var paths = AGENT_CHAT_PATHS.slice();
      paths.forEach(function (p) {
        if (urls.indexOf(p) === -1) urls.push(p);
      });
      var base = (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE)
        ? window.RIZQ_BACKEND_BASE.replace(/\/$/, '') : '';
      if (base) {
        paths.forEach(function (p) {
          var full = base + p;
          if (urls.indexOf(full) === -1) urls.push(full);
        });
      }
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        var origin = location.origin.replace(/\/$/, '');
        paths.forEach(function (p) {
          var fromOrigin = origin + p;
          if (urls.indexOf(fromOrigin) === -1) urls.push(fromOrigin);
        });
      }
      return urls;
    }

    function _offlineAgentReply(userText) {
      var msgLang = _detectMessageLang(userText);
      var pageCtx = _collectPageContext();
      var mgr = window.RizqManager;
      if (mgr && typeof mgr.processMessage === 'function') {
        try {
          var result = mgr.processMessage(userText, Object.assign({}, _ctx, {
            uiLang: _ctx.lang,
            lang: _ctx.chatLang || msgLang,
            pageContext: pageCtx
          }));
          var reply = result && (result.reply != null ? result.reply : result);
          if (result && result.lang) _ctx.chatLang = result.lang;
          if (reply) return String(reply);
        } catch (eMgr) {
          console.error('Widget Chat Error: offline RizqManager fallback failed', eMgr);
        }
      }
      return _inlineOfflineReply(userText, msgLang);
    }

    function _inlineOfflineReply(text, lang) {
      var lower = String(text || '').toLowerCase();
      var L = lang === 'fr' ? 'fr' : lang === 'es' ? 'es' : lang === 'en' ? 'en' : 'ar';
      var pick = function (map) {
        return map[L] || map.ar || map.en;
      };
      if (window.RizqManager && typeof window.RizqManager.detectLangSwitchRequest === 'function') {
        var sw = window.RizqManager.detectLangSwitchRequest(text);
        if (sw) {
          _ctx.chatLang = sw;
          var ls = {
            ar: 'بكل سرور! 😊 اكتب سؤالك بالعربية — كيف أساعدك؟',
            hs: 'واخا! 😊 شنو بغيتي؟',
            fr: 'Bien sûr ! 😊 Comment puis-je vous aider ?',
            en: 'Of course! 😊 What would you like to know?',
            es: '¡Claro! 😊 ¿En qué puedo ayudarte?'
          };
          return ls[sw] || ls.ar;
        }
      }
      if (/^(hi|hello|hey|hola|bonjour|salut|مرحب|اهلا|أهلا|السلام)/.test(lower)) {
        return pick({
          ar: 'أهلاً! 👋 أنا مدير رزق الذكي (وضع محلي — الخادم غير متصل). كيف أساعدك؟',
          fr: 'Bonjour ! 👋 Je suis le Gestionnaire Rizq (mode local — serveur hors ligne). Comment puis-je vous aider ?',
          es: '¡Hola! 👋 Soy el Gestor Inteligente de Rizq (modo local — servidor sin conexión). ¿En qué puedo ayudarte?',
          en: 'Hello! 👋 I\'m the Rizq Smart Manager (local mode — server offline). How can I help?'
        });
      }
      if (/نشر|إعلان|publier|annonce|post|publicar|sell|vender/.test(lower)) {
        return pick({
          ar: 'لنشر إعلان مجاني: افتح rizq_post.html ← اختر القسم ← أضف الصور والسعر ← انشر.\nالنشر الأساسي مجاني على رزق.',
          fr: 'Pour publier: ouvrez rizq_post.html → choisissez la catégorie → ajoutez photos et prix → publiez.\nL\'annonce de base est gratuite sur Rizq.',
          es: 'Para publicar: abra rizq_post.html → elija categoría → añada fotos y precio → publique.\nPublicar en Rizq es gratis.',
          en: 'To post an ad: open rizq_post.html → pick a category → add photos & price → publish.\nBasic posting is free on Rizq.'
        });
      }
      if (/باق|forfait|package|plan|abonn|precio|pricing|tarif/.test(lower)) {
        var pkgCfg = window.RizqPackagesConfig;
        if (pkgCfg && typeof pkgCfg.buildPublicSummary === 'function') {
          return pkgCfg.buildPublicSummary(L);
        }
        return pick({
          ar: '🌟 باقات رزق متعددة (تجريبية، شهرية، ربع سنوية، سنوية، وماسية 💎).\n\nللأسعار الحالية، افتح rizq_landing_v8.html#pricing أو أعد المحاولة عندما يكون الخادم متصلاً.',
          fr: 'Forfaits Rizq : essai, mensuel, trimestriel, annuel et Diamant 💎.\n\nPour les prix actuels : rizq_landing_v8.html#pricing ou réessayez lorsque le serveur est en ligne.',
          es: 'Planes Rizq: prueba, mensual, trimestral, anual y Diamante 💎.\n\nPrecios actuales: rizq_landing_v8.html#pricing o reintente cuando el servidor esté en línea.',
          en: 'Rizq plans: trial, monthly, quarterly, yearly, and Diamond 💎.\n\nLive prices: rizq_landing_v8.html#pricing or retry when the server is online.'
        });
      }
      if (/دفع|payment|paiement|bankily|sedad|pago|pay/.test(lower)) {
        return pick({
          ar: 'طرق الدفع على رزق: Bankily، Sedad، أو نقداً مع البائع بعد المعاينة. لا تدفع مقدماً قبل التحقق من المنتج.',
          fr: 'Paiements sur Rizq: Bankily, Sedad ou espèces avec le vendeur après inspection. Ne payez pas avant de vérifier.',
          es: 'Pagos en Rizq: Bankily, Sedad o efectivo con el vendedor tras inspeccionar. No pague antes de verificar.',
          en: 'Payments on Rizq: Bankily, Sedad, or cash with the seller after inspection. Don\'t pay before verifying the item.'
        });
      }
      if (/آمن|trust|sûr|segur|safe|موثوق|fiab/.test(lower)) {
        return pick({
          ar: 'رزق وسيط إلكتروني — عاين قبل الدفع. فضّل البائعين الموثّقين ✅ وتواصل عبر المنصة.',
          fr: 'Rizq est un intermédiaire — inspectez avant paiement. Privilégiez les vendeurs vérifiés ✅.',
          es: 'Rizq es intermediario — inspeccione antes de pagar. Prefiera vendedores verificados ✅.',
          en: 'Rizq is a marketplace intermediary — inspect before paying. Prefer verified sellers ✅.'
        });
      }
      if (/محل|store|boutique|مكتب|office|مناقص|tender|browse|تصفح|cherch|search|buscar/.test(lower)) {
        return pick({
          ar: 'تصفح: rizq_browse.html للإعلانات · rizq_store.html للمحلات · rizq_office.html للمكاتب · rizq_tenders.html للمناقصات.',
          fr: 'Parcourir: rizq_browse.html (annonces) · rizq_store.html (boutiques) · rizq_office.html (bureaux) · rizq_tenders.html (appels d\'offres).',
          es: 'Explorar: rizq_browse.html (anuncios) · rizq_store.html (tiendas) · rizq_office.html (oficinas) · rizq_tenders.html (licitaciones).',
          en: 'Browse: rizq_browse.html (ads) · rizq_store.html (stores) · rizq_office.html (offices) · rizq_tenders.html (tenders).'
        });
      }
      return pick({
        ar: 'أنا في الوضع المحلي (الخادم غير متصل). اسأل عن: نشر إعلان، الباقات، الدفع، أو الأمان — أو راسل direction@rizq.mr',
        fr: 'Je suis en mode local (serveur hors ligne). Demandez: publication, forfaits, paiement, sécurité — ou écrivez à direction@rizq.mr',
        es: 'Estoy en modo local (servidor sin conexión). Pregunte: publicar, planes, pago, seguridad — o escriba a direction@rizq.mr',
        en: 'I\'m in local mode (server offline). Ask about: posting, plans, payment, safety — or email direction@rizq.mr'
      });
    }

    function _postAgentChat(url, payload, signal) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: signal
      }).then(function (res) {
        if (!res.ok) {
          var err = new Error('http_' + res.status);
          err.code = 'http_' + res.status;
          err.url = url;
          console.error('Widget Chat Error:', err, 'status:', res.status, 'url:', url);
          throw err;
        }
        return res.json();
      }).catch(function (err) {
        if (!err.url) err.url = url;
        console.error('Widget Chat Error:', err, 'url:', url);
        throw err;
      });
    }

    function _callDiamondAgent(userText, attachData) {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 45000) : null;
      var payload = {
        message: userText,
        lang: _ctx.chatLang || _detectMessageLang(userText || _dict().attachOnly),
        uiLang: _ctx.lang,
        autoLang: true,
        agentTier: _resolveAgentTier(),
        systemInstruction: _masterSystemPrompt(),
        profile: _ctx.profile || null,
        history: (_history || []).slice(-10),
        catalogHint: _resolveCatalogHintForMessage(userText),
        pageContext: _collectPageContext()
      };
      if (attachData && attachData.dataUri) {
        payload.attachment = {
          dataUri: attachData.dataUri,
          fileName: attachData.name || 'attachment.jpg',
          kind: 'receipt_or_screenshot'
        };
      }
      var urls = _agentFetchUrls();
      function tryUrl(idx) {
        if (idx >= urls.length) {
          var e1 = new Error('all_urls_failed');
          e1.code = 'network';
          return Promise.reject(e1);
        }
        return _postAgentChat(urls[idx], payload, controller ? controller.signal : undefined)
          .then(function (data) {
            if (timeoutId) clearTimeout(timeoutId);
            if (!data || !data.ok || !data.reply) {
              var e2 = new Error('empty_reply');
              e2.code = 'empty_reply';
              throw e2;
            }
            return String(data.reply);
          })
          .catch(function (err) {
            if (idx + 1 < urls.length) return tryUrl(idx + 1);
            if (timeoutId) clearTimeout(timeoutId);
            if (err && err.name === 'AbortError') {
              var e3 = new Error('timeout');
              e3.code = 'timeout';
              throw e3;
            }
            throw err;
          });
      }
      return tryUrl(0);
    }

    function _reply(userText, attachData) {
      var blocked = _policyCheck(userText);
      if (blocked) {
        _appendAgentMessageStream(blocked);
        return;
      }
      var leadPayload = _extractLeadPayload(userText);
      if (leadPayload) {
        _submitLeadToBackend(leadPayload);
      }
      _showTyping();
      var needsCatalog = _isPackagePricingQuery(userText);
      _ensureLiveCatalog(needsCatalog)
        .then(function () {
          if (needsCatalog) _refreshManagerSubscriptions();
          return _callDiamondAgent(userText, attachData);
        })
        .then(function (replyText) {
          _appendAgentMessageStream(replyText);
        })
        .catch(function (err) {
          console.error('Widget Chat Error: API unavailable, using offline agent', err);
          if (attachData) {
            _appendAgentMessageStream(_ctx.lang === 'fr'
              ? '✅ Image/reçu reçu(e). En mode hors ligne — réessayez lorsque le serveur est connecté pour la transmission à l\'administration.'
              : '✅ تم استلام المرفق. في الوضع المحلي — أعد الإرسال عند اتصال الخادم ليتم تحويله للإدارة.');
            return;
          }
          _ensureLiveCatalog(true)
            .then(function () {
              _refreshManagerSubscriptions();
              _appendAgentMessageStream(_offlineAgentReply(userText));
            })
            .catch(function () {
              _appendAgentMessageStream(_offlineAgentReply(userText));
            });
        });
    }

    function _appendAgentMessageStream(text) {
      _hideTyping();
      var msgs = document.getElementById('rw-messages');
      if (!msgs) return;
      var full = String(text || '');
      if (!full) return;
      var div = document.createElement('div');
      div.className = 'rw-msg agent chat-msg agent';
      div.innerHTML = '<div class="rw-msg-avatar">' + _AVATAR + '</div>' +
        '<div class="rw-msg-body"><div class="rw-bubble">' + _formatAgentHtml(full) + '</div><div class="rw-ts">' + _ts() + '</div></div>';
      msgs.appendChild(div);
      _history.push({ role: 'agent', text: full, ts: _ts() });
      _scroll();
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
        var d = glang === 'fr' ? _WDICT.fr : _WDICT.ar;
        var bizName = (_ctx.profile && _ctx.profile.businessName) || (glang === 'fr' ? 'Rizq' : 'رزق');
        var greeting = (glang === 'fr'
          ? 'Bienvenue chez ' + bizName + ' ! 👋\nJe suis le Gestionnaire Rizq IA officiel. Comment puis-je vous aider ?'
          : 'أهلاً بك في ' + bizName + ' ! 👋\nأنا مدير رزق الذكي الرسمي، كيف أخدمك اليوم؟');
        if (!(_ctx.profile && _ctx.profile.businessName)) greeting = d.greeting;
        greeting += _contextGreetingSuffix();
        setTimeout(function () { _addMessage(greeting, 'agent'); }, 300);
      }
      var input = document.getElementById('rw-input');
      if (input) setTimeout(function () { input.focus(); }, 400);
      var pb = document.getElementById('rizq-prompt-bubbles');
      if (pb) pb.style.display = 'none';
      _syncLiveCatalogQuiet();
      _startCatalogPoll();
    }

    function close() {
      _open = false;
      _stopCatalogPoll();
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
      var txt = _cleanOutgoingText(input.value);
      if (!txt && !_pendingAttachment) return;
      var attachData = _pendingAttachment;
      var attachPreview = attachData ? attachData.previewUrl : null;
      var displayText = txt || (attachData ? _dict().attachOnly : '');
      input.value = '';
      input.style.height = 'auto';
      _removePendingAttachment();
      _addMessage(displayText, 'user', attachPreview);
      _reply(txt, attachData);
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
    var attachBtn = document.getElementById('rw-attach-btn');
    var attachInput = document.getElementById('rw-attach-input');
    var attachRemove = document.getElementById('rw-attach-remove');
    var inputEl = document.getElementById('rw-input');
    var qaContainer = document.getElementById('rw-quick-actions');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (sendBtn) sendBtn.addEventListener('click', send);
    if (attachBtn && attachInput) {
      attachBtn.addEventListener('click', function () { attachInput.click(); });
      attachInput.addEventListener('change', function () {
        var file = attachInput.files && attachInput.files[0];
        if (file) _handleAttachFile(file);
      });
    }
    if (attachRemove) attachRemove.addEventListener('click', _removePendingAttachment);
    if (inputEl) {
      inputEl.setAttribute('dir', 'ltr');
      inputEl.style.direction = 'ltr';
      inputEl.style.textAlign = 'left';
      inputEl.addEventListener('keydown', function (e) {
        _handleInputKeydown(e);
        handleKey(e);
      });
      inputEl.addEventListener('input', function () {
        _normalizeInputBidi(this);
        autoResize(this);
      });
      inputEl.addEventListener('paste', _handleInputPaste);
    }
    if (qaContainer) {
      qaContainer.addEventListener('click', function (e) {
        var b2 = e.target.closest('.rw-quick-btn');
        if (!b2) return;
        var act = b2.getAttribute('data-action');
        if (act) return _handleQuickAction(act);
        var q = b2.getAttribute('data-q');
        if (q) quickSend(q);
      });
    }

    /* ── Drag ── */
    (function () {
      if (!btn) return;

      /* على شاشات اللمس: لا سحب إطلاقاً — الزر كان يلتصق بالإصبع أثناء
         التمرير ويتحرك معه كأنه مؤشر ماوس أسود ثم يعلق في مكان عشوائي.
         يبقى الزر مثبتاً في ركنه واللمسة تفتح/تغلق المحادثة فقط. */
      var isTouchDevice = window.matchMedia('(pointer:coarse)').matches;
      if (isTouchDevice) {
        try { localStorage.removeItem('rizq_widget_pos'); } catch (e) {}
        btn.style.left = ''; btn.style.top = '';
        btn.style.right = ''; btn.style.bottom = '';
        btn.addEventListener('click', function () { toggle(); });
        return;
      }

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
    _ensureLiveCatalog(false);
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
