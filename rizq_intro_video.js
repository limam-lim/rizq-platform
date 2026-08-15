/**
 * rizq_intro_video.js — فيديو تعريفي مضمَّن (Embed) لصفحات المشتركين العامة
 * ═══════════════════════════════════════════════════════════════════
 * سابقاً: كان حقل "promo_video" (رابط يوتيوب/فيسبوك يُدخله المشترك من
 * داشبورده) موجوداً وحقيقياً فعلاً، لكن الصفحة العامة (rizq_store.html /
 * rizq_office.html) كانت تعرضه فقط كزر "مشاهدة الفيديو ↗" يفتح في تبويب
 * خارجي — لا فيديو متحرك فعلي على الصفحة نفسها. rizq_corp.html لم يكن
 * فيه القسم إطلاقاً رغم أن داشبورد الشركة يحفظ نفس الحقل.
 *
 * هذا الملف يبني نفس تقنية التضمين المستخدمة فعلاً في rizq_video_ads.js
 * (لا فيديو يُرفع على خادمنا أبداً — كله embed من يوتيوب/فيسبوك) لكن
 * لفيديو تعريفي واحد ثابت للمشترك نفسه بدل قائمة إعلانات دوّارة، مع
 * إطار بصري مُبهر (توهّج ذهبي متحرك + دخول متدرّج) يطابق هوية رزق.
 * ═══════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  function ytId(url) {
    var m = String(url || '').match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }
  function isFB(url) { return /facebook\.com|fb\.watch/.test(url || ''); }

  // MAX_SECONDS: الحد الأقصى لطول "الفيديو التعريفي" — 15-20 ثانية فقط (طلب
  // صريح من محمد: مقطع تعريفي قصير جداً، لا فيديو كامل). يُطبَّق فعلياً
  // (لا مجرد نصيحة) على يوتيوب عبر باراميتر &end= المدعوم رسمياً في يوتيوب
  // إمبيد — يوقف التشغيل تلقائياً عند هذه الثانية حتى لو كان الفيديو الأصلي
  // أطول بكثير. فيسبوك لا يدعم قصّ مدة عبر رابط الـ embed (لا API لذلك)،
  // فيبقى الاعتماد هناك على إرشاد المشترك برفع مقطع قصير أصلاً من جهته.
  var MAX_SECONDS = 20;

  function buildEmbedSrc(url, muted, maxSeconds) {
    var cap = Number(maxSeconds) > 0 ? Number(maxSeconds) : MAX_SECONDS;
    var id = ytId(url);
    if (id) {
      return 'https://www.youtube.com/embed/' + id +
        '?autoplay=1&mute=' + (muted ? 1 : 0) +
        '&start=0&end=' + cap +
        '&controls=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=' + id;
    }
    if (isFB(url)) {
      // ⚠️ لا يوجد باراميتر قصّ مدة رسمي بإمبيد فيسبوك — الحد هنا إرشادي فقط
      // (نص مساعد بحقل الرابط بالداشبورد)، وليس تطبيقاً تقنياً فعلياً كيوتيوب.
      return 'https://www.facebook.com/plugins/video.php' +
        '?href=' + encodeURIComponent(url) +
        '&autoplay=1&mute=' + (muted ? 1 : 0) + '&show_text=0';
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var CSS_INJECTED = false;
  function injectCSS() {
    if (CSS_INJECTED) return; CSS_INJECTED = true;
    var s = document.createElement('style');
    s.textContent =
      '@keyframes rzqIvGlow{0%,100%{box-shadow:0 0 0 1.5px rgba(201,168,76,.5),0 20px 60px rgba(0,0,0,.55)}50%{box-shadow:0 0 0 1.5px rgba(201,168,76,.9),0 20px 70px rgba(201,168,76,.18)}}' +
      '@keyframes rzqIvIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}' +
      '.rzq-iv-wrap{max-width:560px;margin:0 auto;animation:rzqIvIn .7s cubic-bezier(.16,1,.3,1) both}' +
      '.rzq-iv-frame{position:relative;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:16/9;animation:rzqIvGlow 3.2s ease-in-out infinite}' +
      '.rzq-iv-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
      '.rzq-iv-badge{position:absolute;top:10px;right:10px;z-index:3;background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#0f2347;font-size:10.5px;font-weight:900;padding:5px 12px;border-radius:20px;letter-spacing:.4px;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none}' +
      '.rzq-iv-sound{position:absolute;bottom:10px;left:10px;z-index:3;background:rgba(10,22,40,.75);backdrop-filter:blur(6px);border:1px solid rgba(201,168,76,.5);color:#e8c96a;font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px;cursor:pointer;transition:background .2s}' +
      '.rzq-iv-sound:hover{background:rgba(201,168,76,.25)}' +
      '.rzq-iv-src{display:block;text-align:center;margin-top:12px;font-size:11.5px;color:rgba(201,168,76,.65);text-decoration:none;transition:color .2s}' +
      '.rzq-iv-src:hover{color:#e8c96a}';
    document.head.appendChild(s);
  }

  /**
   * mount(hostEl, url, opts) — يبني الفيديو التعريفي داخل hostEl.
   * opts: { title: '🎬 فيديو تعريفي', linkLabel: 'شاهد على المصدر الأصلي ↗' }
   * يُرجع true إن نجح التضمين، false إن كان الرابط غير مدعوم (يُترك hostEl فارغاً
   * ليقرر المستدعي إخفاء القسم كاملاً).
   */
  function mount(hostEl, url, opts) {
    if (!hostEl || !url) return false;
    var src = buildEmbedSrc(url, true);
    if (!src) return false;
    opts = opts || {};
    injectCSS();

    var muted = true;
    hostEl.innerHTML =
      '<div class="rzq-iv-wrap">' +
        '<div class="rzq-iv-frame" id="rzq-iv-frame">' +
          '<div class="rzq-iv-badge">' + esc(opts.title || '🎬 فيديو تعريفي') + '</div>' +
          '<iframe id="rzq-iv-iframe" src="' + src + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="eager"></iframe>' +
          '<button type="button" class="rzq-iv-sound" id="rzq-iv-sound-btn">🔇 ' + (opts.mutedLabel || 'اضغط لتفعيل الصوت') + '</button>' +
        '</div>' +
        '<a class="rzq-iv-src" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(opts.linkLabel || 'شاهد على المصدر الأصلي ↗') + '</a>' +
      '</div>';

    var btn = hostEl.querySelector('#rzq-iv-sound-btn');
    var frame = hostEl.querySelector('#rzq-iv-frame');
    if (btn) {
      btn.addEventListener('click', function () {
        muted = !muted;
        var newSrc = buildEmbedSrc(url, muted);
        var iframe = hostEl.querySelector('#rzq-iv-iframe');
        if (iframe && newSrc) iframe.src = newSrc;
        btn.textContent = muted ? '🔇 ' + (opts.mutedLabel || 'اضغط لتفعيل الصوت') : '🔊 ' + (opts.unmutedLabel || 'الصوت مفعّل');
      });
    }
    return true;
  }

  global.RizqIntroVideo = { mount: mount, buildEmbedSrc: buildEmbedSrc, ytId: ytId, isFB: isFB };
})(typeof window !== 'undefined' ? window : this);
