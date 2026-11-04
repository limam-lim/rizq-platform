# fix-ui-cls — تصنيف commits من #273 و#269 + إجابات ما قبل الدمج

فرع التنفيذ: `cursor/fix-ui-cls-9d2d` من `main` @ `229ae84`.
PR: **#275** — لا يُدمَج قبل موافقة المالك.

## 1) `home-catalog` من 23 إلى 16 — أين ذهبت السبعة؟

مصدر العدّ 23: فرع `fix-logic-3` (`rg -c "ok("` ≈ 24 = تعريف الدالة + **23** استدعاء `ok()`).

| # | الاختبار | المصير |
|---|---|---|
| 1 | `client pickHomeStoreProducts max 8` | **أُعيد** في `test-home-catalog.js` (كان على fix-logic-3 فقط بعد #272) |
| 2 | `client pickHomeStoreProducts 1 per store` | **أُعيد** |
| 3 | `interleave does not put all stores first` | **أُعيد** |
| 4 | `interleave preserves ad+store counts` | **أُعيد** |
| 5 | `styles client uses home API` | **PENDING / #274** (`fix-home-wiring-1`) — لا يُحسب في العدّ إلا مع `STRICT_HOME_WIRING=1` |
| 6 | `showrooms client single home request` | **PENDING / #274** |
| 7 | `stores client wires home API into hero-listings` | **PENDING / #274** |

النتيجة الحالية: **ALL OK / 20** + 3 PENDING (ليست حذفاً بلا بديل: 1–4 مُستعادة؛ 5–7 مؤجّلة عمداً لنطاق #274 بعد استعادة التصميم d9 في #272).

## 2) fadeUp

- الحركة ظاهرة: `@keyframes fadeUp` = `opacity` + `transform: translateY(24px→0)` فقط (بلا top/margin/height).
- مكرّر قديم «opacity-only» أُزيل؛ `fadeUpMotion` يبقى للترجمة الأطول تحت الطية.
- عيّنة: `/opt/cursor/artifacts/fix-ui-cls/premerge/fadeup/` (`fadeup-early` + `fadeup-settled` + `fadeup-metrics.json`).

## 3) التيكر الفارغ

| حالة | سلوك |
|---|---|
| أول طلاء (HTML) | `ticker-wrap.is-invite` + نص الدعوة محجوز الارتفاع (`--rizq-ticker-h` / min-height) |
| بعد fetch وقائمة فارغة | `showInviteStrip` — **لا إخفاء** |
| أدمن أخفى الشريط | `is-empty` فقط (server flag `civicTickerHidden`) |

القرار: **حجز من الخادم في HTML + حسم بعد fetch على العميل** (ليست قفزة بعد الشبكة). الرسالة: «كن أول من ينشر إعلانه على رزق» / FR المكافئ. لا FALLBACK طوارئ بعد الطلاء (كان يسبب CLS ~1.2).

## 4) PWA / service worker

| عنصر | قيمة |
|---|---|
| `ASSET_V` / `SW_URL` | `31.28` → `sw.js?v=31.28` |
| `MOCK_HDR_V` | `5.93` |
| `CACHE_NAME` / `SW_CACHE` | `rizq-cache-v31.28` |
| activate | يحذف كل كاش ≠ الحالي ثم `clients.claim` |
| تحديث | `SKIP_WAITING` فقط إن وُجد controller سابق → reload مرة واحدة (بلا boot أول زيارة) |
| أصول CORE | `?v=` ممزوج مع الإصدار |

اختبار: `node qa/cls-1/test-sw-cache-bump.js` — كاش قديم يُمسح؛ هيدر واحد؛ بدون double-boot.

## 5) e2e روابط المتاجر

`node qa/cls-1/test-store-links.js` — من شريط `#hero-listings` ومن CTA الأنماط → `rizq_store.html` (+ `id` أو `demo`).

## 6) لقطات بصرية 2/4/5/6/7/8

`qa/cls-1/capture-premerge-artifacts.js` → `/opt/cursor/artifacts/fix-ui-cls/premerge/visuals/` (390/1440 × ar/fr) + `before/` من `qa/visual-diff` إن وُجد.

| # | ماذا |
|---|---|
| 2 | placeholders كحلي/ذهبي |
| 4 | padding-end / FAB clearance |
| 5 | scroll-margin على styles/models |
| 6 | CTA em-dash + bidi سعر |
| 7 | لا pad-duplicates في discovery |
| 8 | `<a href>` آمن للأنماط |

## 7) #273 و#269 — cherry-pick

### #273 (`cursor/fix-ui-2-9d2d`) — لا cherry-pick كامل لـ `b6a9ff0` / `71621b1` (مختلط تصميم/تقني)

| Commit / جزء | القرار | السبب |
|---|---|---|
| `b6a9ff0` كاملاً | **مرفوض ككتلة** | يخلط تصميم وتقني |
| └ `--rizq-mock-body-gap` | **مأخوذ** → `16a21d5` | تقني CLS |
| └ mockup shrink-guard | **مأخوذ** → `16a21d5` | تقني CLS |
| └ تصغير شريط الماركات | **مرفوض** | تصميمي |
| └ نصوص tick/reshuffle | **مرفوض** | تصميمي |
| └ `height` ثابت + `overflow:hidden` | **مرفوض** | يكسر المحتوى |
| └ ربط `/api/catalog/home` | **مرفوض هنا** | نطاق #274 |
| └ meta فارغ / browse counts | مصنّف للنقل؛ **غير منقول في 16a21d5** | خارج نطاق الهيدر لهذا المسار |
| `71621b1` FOUC color | FOUC تقني مقبول جزئياً عبر commits CLS لاحقة؛ **لقطات A7 غير منقولة** | |

### #269 (`cursor/fix-cls-fonts-1-9d2d`)

| Commit | القرار | السبب |
|---|---|---|
| `6222daf` Cairo local + preload + metric fallback | **مأخوذ يدوياً** → `88b77a4` | cherry-pick الآلي فشل (modify/delete بعد حذف CSS الموحّد في #272) |
| `f926fc4` drop Google @import + CSP + bench | **مأخوذ** (ضمن منفذ الخطوط/CSP) | تقني |
| `b581502` A7 rebase notes | **مرفوض/اختياري** | توثيقي فقط |

PRs **#273** و **#269** تبقى مفتوحة (لا تُغلَق من هذا المسار).
