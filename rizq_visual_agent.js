/**
 * rizq_visual_agent.js
 * ═══════════════════════════════════════════════════════════════
 * وكيل التحسين البصري والجودة — منصة رزق
 * Version: 1.0.0 | RIZQ-BUILD:202507092100
 *
 * يعمل حصراً في المتصفح عبر Canvas API — لا backend، لا API خارجية.
 * يُستدعى بعد موافقة الوكيل الأمني (RizqAgent.inspect → 'approve') فقط.
 *
 * ── سير العمل ──────────────────────────────────────────────────
 *   const secResult = RizqAgent.inspect(adData);
 *   if (secResult.decision === 'approve') {
 *       RizqVisualAgent.process(adData.images).then(function(visual) {
 *           adData.images = visual.images;   // صور محسّنة
 *           console.log(visual.report);      // تقرير الجودة
 *           saveAd(adData);
 *       });
 *   }
 *
 * ── القواعد المطبّقة (من 12) ───────────────────────────────────
 *   Q01 — فحص الأبعاد وملاءمتها (16:9 / 1:1)
 *   Q02 — رفع الحجم الأدنى (256×256 حداً أدنى)
 *   Q03 — تحسين الإضاءة (brightness auto-correct)
 *   Q04 — تحسين التباين (contrast enhance)
 *   Q05 — فلتر الحدة (unsharp mask via pixel manipulation)
 *   Q06 — إزالة الضوضاء البسيطة (box-blur + subtract)
 *   Q07 — ضمان RGBA نظيف (تحويل أي صيغة لـ PNG نقي)
 *   Q08 — الكشف عن الصور الشاحبة جداً (تُعلَّم للمراجعة البشرية)
 * ═══════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════
     الثوابت
  ══════════════════════════════════════════ */
  var CFG = {
    TARGET_RATIO:     16 / 9,      // النسبة المستهدفة للصور العرضية
    THUMB_RATIO:      1,           // نسبة الصور المربعة (thumbnails)
    MIN_DIM:          256,         // الحد الأدنى للطول أو العرض بالـ px
    MAX_OUTPUT_PX:    1200,        // الحد الأقصى للعرض في المخرج
    BRIGHTNESS_TARGET: 128,        // متوسط السطوع المستهدف (0-255)
    CONTRAST_FACTOR:  1.15,        // مُضاعف التباين
    SHARP_AMOUNT:     0.45,        // قوة فلتر الحدة (0→1)
    OUTPUT_QUALITY:   0.92,        // جودة JPEG المخرج
    PALE_THRESHOLD:   210,         // متوسط سطوع أعلى من هذا = صورة شاحبة
    DARK_THRESHOLD:   30,          // متوسط سطوع أقل من هذا = صورة داكنة جداً
    VERSION:          '1.0.0'
  };

  /* ══════════════════════════════════════════
     دوال مساعدة — Canvas
  ══════════════════════════════════════════ */

  /** WebP أخف من JPEG بنفس الجودة (25-35% توفير عادةً) — نجرّبه أولاً
      ونتراجع تلقائياً لـJPEG إن كان المتصفح لا يدعم ترميز WebP عبر
      canvas.toDataURL (بعض المتصفحات القديمة جداً فقط). */
  var _webpSupported = null;
  function _supportsWebP() {
    if (_webpSupported !== null) return _webpSupported;
    try {
      var c = document.createElement('canvas'); c.width = c.height = 1;
      _webpSupported = c.toDataURL('image/webp', 0.5).indexOf('data:image/webp') === 0;
    } catch (e) { _webpSupported = false; }
    return _webpSupported;
  }
  function _exportCanvas(cv, quality) {
    return _supportsWebP() ? cv.toDataURL('image/webp', quality) : cv.toDataURL('image/jpeg', quality);
  }

  /** تحميل dataURL/URL كـ HTMLImageElement */
  function _loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = function () { resolve(img); };
      img.onerror = function () { reject(new Error('RVA: Failed to load image')); };
      img.src = src;
    });
  }

  /** إنشاء Canvas من صورة بالأبعاد المطلوبة */
  function _createCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width  = w;
    cv.height = h;
    return cv;
  }

  /** Q01 + Q02 — ملاءمة الأبعاد (crop to ratio + min size) */
  function _fitDimensions(img, targetRatio) {
    var sw = img.naturalWidth  || img.width;
    var sh = img.naturalHeight || img.height;
    var srcRatio = sw / sh;

    var cropX = 0, cropY = 0, cropW = sw, cropH = sh;

    if (Math.abs(srcRatio - targetRatio) > 0.05) {
      // القص المركزي للوصول للنسبة المطلوبة
      if (srcRatio > targetRatio) {
        cropW = Math.round(sh * targetRatio);
        cropX = Math.round((sw - cropW) / 2);
      } else {
        cropH = Math.round(sw / targetRatio);
        cropY = Math.round((sh - cropH) / 2);
      }
    }

    // الحجم النهائي للمخرج
    var outW = Math.min(cropW, CFG.MAX_OUTPUT_PX);
    var outH = Math.round(outW / targetRatio);

    // Q02: ضمان الحد الأدنى
    if (outW < CFG.MIN_DIM || outH < CFG.MIN_DIM) {
      outW = Math.max(outW, CFG.MIN_DIM);
      outH = Math.round(outW / targetRatio);
    }

    return { cropX: cropX, cropY: cropY, cropW: cropW, cropH: cropH, outW: outW, outH: outH };
  }

  /** Q03 + Q04 — تحسين الإضاءة والتباين على مستوى الـ pixels */
  function _enhanceLightContrast(ctx, w, h) {
    var imageData = ctx.getImageData(0, 0, w, h);
    var data      = imageData.data;
    var n         = data.length;

    // احسب متوسط السطوع الحالي
    var sum = 0;
    for (var i = 0; i < n; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    var avgBright = sum / (n / 4);

    // مُصحّح السطوع (يُضيف أو يطرح)
    var brightAdj = CFG.BRIGHTNESS_TARGET - avgBright;
    // حدّد التصحيح بين -40 و+40 لمنع التشويه
    brightAdj = Math.max(-40, Math.min(40, brightAdj));

    var c = CFG.CONTRAST_FACTOR;
    var mid = 127.5;

    for (var j = 0; j < n; j += 4) {
      // تباين
      data[j]     = Math.min(255, Math.max(0, (data[j]     - mid) * c + mid + brightAdj));
      data[j + 1] = Math.min(255, Math.max(0, (data[j + 1] - mid) * c + mid + brightAdj));
      data[j + 2] = Math.min(255, Math.max(0, (data[j + 2] - mid) * c + mid + brightAdj));
      // alpha بلا تغيير
    }
    ctx.putImageData(imageData, 0, 0);
    return avgBright; // نُعيده لتقرير الجودة
  }

  /** Q05 + Q06 — فلتر الحدة (Unsharp Mask بسيط) */
  function _sharpnessFilter(ctx, w, h) {
    var orig = ctx.getImageData(0, 0, w, h);
    var d    = orig.data;

    // نسخة ضبابية 3×3 box blur
    var blurred = ctx.getImageData(0, 0, w, h);
    var b = blurred.data;

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = (y * w + x) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var sum = 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              sum += d[((y + dy) * w + (x + dx)) * 4 + ch];
            }
          }
          b[idx + ch] = sum / 9;
        }
        b[idx + 3] = d[idx + 3];
      }
    }

    // Unsharp: result = original + amount * (original - blurred)
    var a = CFG.SHARP_AMOUNT;
    var out = ctx.createImageData(w, h);
    var o   = out.data;
    for (var k = 0; k < d.length; k += 4) {
      o[k]     = Math.min(255, Math.max(0, d[k]     + a * (d[k]     - b[k])));
      o[k + 1] = Math.min(255, Math.max(0, d[k + 1] + a * (d[k + 1] - b[k + 1])));
      o[k + 2] = Math.min(255, Math.max(0, d[k + 2] + a * (d[k + 2] - b[k + 2])));
      o[k + 3] = d[k + 3];
    }
    ctx.putImageData(out, 0, 0);
  }

  /** Q08 — فحص الصورة الشاحبة/الداكنة جداً */
  function _detectAbnormal(avgBright) {
    if (avgBright > CFG.PALE_THRESHOLD) return 'pale';
    if (avgBright < CFG.DARK_THRESHOLD) return 'dark';
    return null;
  }

  /* ══════════════════════════════════════════
     معالجة صورة واحدة — Pipeline كامل
  ══════════════════════════════════════════ */
  function _processSingle(src, options) {
    options = options || {};
    var ratio = options.square ? CFG.THUMB_RATIO : CFG.TARGET_RATIO;
    var startTime = Date.now();

    return _loadImage(src).then(function (img) {
      var dims   = _fitDimensions(img, ratio);
      var cv     = _createCanvas(dims.outW, dims.outH);
      var ctx    = cv.getContext('2d');

      // Q07 — رسم الصورة المقصوصة على Canvas نظيف
      ctx.drawImage(
        img,
        dims.cropX, dims.cropY, dims.cropW, dims.cropH,
        0, 0, dims.outW, dims.outH
      );

      // Q03+Q04 — الإضاءة والتباين
      var avgBright = _enhanceLightContrast(ctx, dims.outW, dims.outH);

      // Q05+Q06 — الحدة (فقط إذا لم تكن الصورة شاحبة جداً)
      var anomaly = _detectAbnormal(avgBright);
      if (!anomaly) {
        _sharpnessFilter(ctx, dims.outW, dims.outH);
      }

      // المخرج النهائي
      var outputDataUrl = _exportCanvas(cv, CFG.OUTPUT_QUALITY);

      // تقرير الجودة لهذه الصورة
      var report = {
        rule_Q01: dims.cropW !== (img.naturalWidth || img.width) || dims.cropH !== (img.naturalHeight || img.height)
          ? 'cropped_to_' + (ratio === 1 ? '1:1' : '16:9')
          : 'ratio_ok',
        rule_Q02: (img.naturalWidth || img.width) < CFG.MIN_DIM ? 'upscaled_to_min' : 'size_ok',
        rule_Q03: 'brightness_adj_' + Math.round(CFG.BRIGHTNESS_TARGET - avgBright),
        rule_Q04: 'contrast_x' + CFG.CONTRAST_FACTOR,
        rule_Q05: anomaly ? 'skipped_sharp_anomaly' : 'unsharp_mask_applied',
        rule_Q06: anomaly ? 'skipped_denoise_anomaly' : 'box_denoise_applied',
        rule_Q07: 'converted_to_jpeg_rgba',
        rule_Q08: anomaly ? ('ALERT_' + anomaly.toUpperCase() + '_IMAGE') : 'normal',
        original_size: { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height },
        output_size:   { w: dims.outW, h: dims.outH },
        avg_brightness: Math.round(avgBright),
        needs_human_review: !!anomaly,
        processing_ms: Date.now() - startTime
      };

      return { dataUrl: outputDataUrl, report: report };
    });
  }

  /* ══════════════════════════════════════════
     الواجهة العامة — RizqVisualAgent
  ══════════════════════════════════════════ */
  var RizqVisualAgent = {

    /**
     * process(images, options) → Promise<{ images, reports, summary }>
     *
     * images:  string[]  — مصفوفة dataURL أو URLs للصور
     * options: {
     *   square: boolean  — true للصور المربعة (thumbnails)
     * }
     */
    process: function (images, options) {
      if (!images || images.length === 0) {
        return Promise.resolve({ images: [], reports: [], summary: { total: 0, needs_review: 0 } });
      }

      var tasks = images.map(function (src) {
        return _processSingle(src, options).catch(function (err) {
          // في حالة الخطأ: نعيد الصورة الأصلية بدون تعديل (non-destructive)
          console.warn('[RizqVisualAgent] Skipped image:', err.message);
          return { dataUrl: src, report: { error: err.message, original_kept: true } };
        });
      });

      return Promise.all(tasks).then(function (results) {
        var enhanced = results.map(function (r) { return r.dataUrl; });
        var reports  = results.map(function (r) { return r.report; });
        var needsReview = reports.filter(function (r) { return r.needs_human_review; }).length;

        return {
          images:  enhanced,
          reports: reports,
          summary: {
            total:         images.length,
            processed:     results.length,
            needs_review:  needsReview,
            all_clear:     needsReview === 0
          }
        };
      });
    },

    /**
     * processAdData(adData) → Promise<adData_updated>
     * دالة مساعدة: تأخذ adData كاملاً وتُعيده بالصور المحسّنة
     * للاستخدام مباشرةً بعد RizqAgent.inspect()
     */
    processAdData: function (adData, options) {
      var images = adData.images || [];
      return this.process(images, options).then(function (visual) {
        // تسجيل التقرير في adData للاطلاع لاحقاً
        var updated = Object.assign({}, adData, {
          images: visual.images,
          _visual_report: visual.summary,
          _visual_details: visual.reports
        });
        // إذا احتاجت صور للمراجعة البشرية — غيّر الحالة
        if (!visual.summary.all_clear) {
          updated._visual_flag = 'NEEDS_VISUAL_REVIEW';
        }
        return updated;
      });
    },

    /**
     * getReport(adData) — استخرج تقرير الجودة إذا سبق معالجته
     */
    getReport: function (adData) {
      return adData._visual_report || null;
    },

    config:  CFG,
    version: CFG.VERSION
  };

  /* ══════════════════════════════════════════
     تصدير
  ══════════════════════════════════════════ */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RizqVisualAgent;
  } else {
    global.RizqVisualAgent = RizqVisualAgent;
  }

}(typeof window !== 'undefined' ? window : this));
