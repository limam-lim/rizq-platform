# fix-ui-cls — تصنيف commits من #273 و#269

فرع التنفيذ: `cursor/fix-ui-cls-9d2d` من `main` @ `229ae84`.

## #273 (`cursor/fix-ui-2-9d2d`)

| Commit | تصنيف | ملاحظة |
|---|---|---|
| `b6a9ff0` fix(ui): ticks, brand strip, body-gap, browse, CLS | **مختلط** | لا يُطبَّق كاملاً |
| └ body-gap (`--rizq-mock-body-gap`) | تقني | يُنقل |
| └ mockup shrink-guard (JS) | تقني CLS | يُنقل |
| └ إخفاء meta فارغ في المعرض | تقني | يُنقل |
| └ عدّادات browse / dedupe / إيقاف infinite | تقني | يُنقل |
| └ min-height هيكل القوائم (426) | تقني مقبول | يُنقل إن لزم |
| └ ربط `/api/catalog/home` | تقني | مؤجّل — يتعارض مع نطاق #274 |
| └ تصغير شريط الماركات | **تصميمي — مرفوض** | |
| └ تغيير نصوص tick/reshuffle | **تصميمي — مرفوض** | |
| └ أي `height` ثابت + `overflow:hidden` | **مرفوض** | |
| `71621b1` FOUC color + A7/screens | مختلط | FOUC تقني؛ اللقطات/A7 لا تُنقل هنا |

## #269 (`cursor/fix-cls-fonts-1-9d2d`)

| Commit | تصنيف | ملاحظة |
|---|---|---|
| `6222daf` local Cairo + preload + metric fallback | **تقني** | يُنقل يدوياً (تعارض مع حذف `rizq_landing-main.css`) |
| `f926fc4` drop Google @import + CSP + bench docs | **تقني** | يُنقل |
| `b581502` A7 rebase notes | تقني توثيقي | اختياري |

Cherry-pick الآلي لـ `6222daf` فشل (modify/delete على ملفات أُزيلت بـ #272). النقل اليدوي المكافئ أدناه.
