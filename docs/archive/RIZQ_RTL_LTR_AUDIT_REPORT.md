# تقرير مراجعة RTL/LTR وتسرب اللغة
**التاريخ:** 13 أغسطس 2026

---

## ملخص تنفيذي

| المحور | الحالة |
|--------|--------|
| `dir="rtl"` افتراضي للعربية | ✅ 22/22 صفحة HTML |
| محرك `RizqI18n` يضبط `lang` + `dir` | ✅ 20/22 صفحة |
| جسر `data-t-fr` مركزي | ✅ **جديد** في `rizq_i18n.js` |
| محاذاة النماذج RTL/LTR | ✅ **جديد** في `rizq-theme.css` |
| ويدجت المساعد الذكي | ✅ `dir` ديناميكي على نافذة الدردشة |
| تسرب لغوي في النماذج الرئيسية | ✅ مُصلَح (cart, store, corp, showroom) |

---

## 1. التعديلات المُطبَّقة

### أ) `rizq_i18n.js` — محرك موحّد
- **`applyLegacyBridge()`**: يطبّق `data-t-fr` / `data-ph-fr` / `option[data-t-fr]` تلقائياً عند كل تبديل لغة
- **`applyDocumentTitle()`**: عناوين منفصلة عبر `data-t-ar` / `data-t-fr` على `<title>`
- **فئات body**: `rizq-lang-ar` / `rizq-lang-fr` لتنسيق CSS

### ب) `rizq-theme.css` — محاذاة RTL/LTR
```css
html[dir="rtl"] .form-group label { text-align: right; }
html[dir="ltr"] .form-group label { text-align: left; }
html[dir="ltr"] .fixed-rizq-logo { left: 0; ... }
[dir="ltr"] input[type="tel"] { direction: ltr; text-align: left; }
```

### ج) إصلاح تسرب اللغة (Language Leakage)

| الملف | قبل | بعد |
|-------|-----|-----|
| `rizq_cart.html` | `الاسم الكامل / Nom complet` | `الاسم الكامل *` (فرنسي في `data-t-fr` فقط) |
| `rizq_cart.html` | `✅ تأكيد الطلب — Commander` | `✅ تأكيد الطلب` |
| `rizq_cart.html` | `نواكشوط / Nouakchott` | `نواكشوط` + `data-t-fr="Nouakchott"` |
| `rizq_store.html` | tagline بالفرنسية افتراضياً | `متجر النور — أزياء ونمط حياة` |
| `rizq_store.html` | `📲 واتساب / WhatsApp` | `📲 واتساب` |
| `rizq_corp.html` / `rizq_showroom.html` | `الهاتف / WhatsApp` | `الهاتف وواتساب` |
| `rizq_showroom_directory.html` | زر اللغة لا يعمل | ✅ تحميل `rizq_i18n.js` + ربط `rizq:langchange` |

### د) `rizq_widget_embed.js`
- `dir="rtl"` / `dir="ltr"` على `#rizq-chat-window`
- محاذاة الحقل والأزرار السريعة حسب اللغة

### هـ) سكربت الفحص
```bash
node scripts/audit-i18n-rtl.js
```

---

## 2. آلية التبديل (كيف تعمل)

```
المستخدم يضغط FR/AR
    ↓
RizqI18n.applyLang()
    ↓
html[lang] + html[dir] + applyStaticDom + applyLegacyBridge
    ↓
rizq:langchange → الصفحات تعيد رسم المحتوى الديناميكي
    ↓
rizq_widget_embed.js يحدّث الويدجت (lang + dir + نصوص)
```

---

## 3. ما تبقى (أولوية لاحقة — ليس blocker)

| الأولوية | الملف | الملاحظة |
|----------|-------|----------|
| P1 | `rizq_landing_v8.html` | ~7000 سطر — نظام `LANG` محلي منفصل (لا يحمّل `rizq_i18n.js`) |
| P1 | `rizq_tenders.html` | `data-t-fr` فقط — يحتاج ربط بالمحرك المركزي |
| P2 | `rizq_browse.html`, `rizq_search.html` | قاموس `TRANSLATIONS` مكرر — دمج في `rizq_i18n_data.js` |
| P3 | تذييلات `© رزق \| Rizq` | مقصودة كعلامة تجارية — ليست تسرباً وظيفياً |
| P3 | `ar.json` / `fr.json` | المصدر الرسمي غير موجود — التعديل يدوي على `rizq_i18n_data.js` |

---

## 4. قائمة تحقق للمطور

- [x] العربية = `dir="rtl"` على `<html>`
- [x] الفرنسية = `dir="ltr"` عند التبديل
- [x] لا نصوص `AR / FR` في labels افتراضية (cart, store, corp)
- [x] حقول الهاتف/البريد `dir="ltr"` دائماً
- [x] ويدجت المساعد يتبع لغة الصفحة
- [ ] ترحيل landing + tenders للمحرك المركزي (مرحلة 2)

---

## 5. الملفات المعدّلة

- `rizq_i18n.js`
- `rizq_i18n_data.js`
- `rizq-theme.css`
- `rizq_cart.html`
- `rizq_store.html`
- `rizq_corp.html`
- `rizq_showroom.html`
- `rizq_showroom_directory.html`
- `rizq_widget_embed.js`
- `scripts/audit-i18n-rtl.js` *(جديد)*
