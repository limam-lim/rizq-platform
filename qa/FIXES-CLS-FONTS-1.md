# FIXES-CLS-FONTS-1 — Cairo محلي + metric fallback

## الهدف
إزالة FOUT/FOUC من Google Fonts عبر استضافة Cairo محلياً، مع `font-display: swap` وخط احتياطي بمقاييس مطابقة، و`landing-lang-boot.js` متزامن قبل أول رسم.

## التغييرات
1. **`fonts/`** — ملفات `cairo-arabic.woff2` / `cairo-latin.woff2` / `cairo-latin-ext.woff2` (أوزان 400–900 عبر variable face) + `fonts/cairo.css`.
2. **`@font-face`** — `font-display: swap` + عائلة `CairoFallback` بـ `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override`.
3. **Preload** على Landing / Browse / Products / Store للـ woff2 العربية + اللاتينية، وربط `fonts/cairo.css` مبكراً في `<head>`.
4. **إزالة Google Fonts** من هذه الصفحات + `@import` في `rizq_header.css` و`rizq-theme.css` + حقن `rizq_pwa.js`.
5. **CSP** — `font-src 'self'` في meta الصفحات، `deploy/hetzner/Caddyfile`، و`rizq-backend/server.js`؛ إضافة `/fonts/*` و`/landing-*.js` للقائمة البيضاء في Caddy.
6. **`landing-lang-boot.js`** — يبقى متزامناً في `<head>` (Landing + Browse/Products/Store).

## قياس CLS (3 بارد + 3 دافئ) — هدف وسيط &lt; 0.05

المصدر: `qa/cls-fonts-1/cls-fonts-report.json` (بعد إزالة `@import` جوجل).

| صفحة | عرض | لغة | cold median | warm median | &lt;0.05؟ |
|------|------|------|-------------|-------------|---------|
| landing | 390 | ar | 0.2011 | 0.5835 | لا |
| landing | 390 | fr | 0.1126 | 1.1396 | لا |
| landing | 768 | ar | 0.0112 | 1.2231 | لا (دافئ) |
| landing | 768 | fr | 0.4008 | 1.3615 | لا |
| landing | 1440 | ar | 0.0180 | 0.0140 | نعم |
| landing | 1440 | fr | 0.0192 | 0.0844 | لا (دافئ) |
| browse | * | * | ≤0.0447 | ≤0.0447 | نعم (عدا 390/fr ≈0.060) |
| products | * | * | ≤0.0281 | ≤0.0281 | نعم (عدا 768/fr warm لمرة) |
| store | ≤768 | * | ≤0.0089 | ≤0.0089 | نعم |
| store | 1440 | ar | 0.0506 | 0.0506 | حدّي |
| store | 1440 | fr | 0.0494 | 0.0494 | نعم |

**ملاحظات**
- طلبات `fonts.googleapis` / `fonts.gstatic` على الصفحات المستهدفة = **0** بعد الإصلاح.
- وجوه Cairo المحمّلة محلياً تُرى في `document.fonts` (≈6–9 faces).
- فشل Landing على الهاتف/التابلت دافئاً مصدره تخطيط الهيدر/`applyMockLang` (نفس فئة انحدار #268)، وليس تحميل الخط — يُعالَج في متابعة layout، لا في استضافة الخط.
- ارتفاع أقسام Landing بقي ضمن حجز FOUC الحالي (pad 160/171/192).

## تشغيل القياس
```bash
node qa/cls-fonts-1/bench-cls-fonts.js
```

## الحالة
فرع فقط — **بدون دمج**.
