# حالة الفروع — بند 9 (#274)

تقرير فقط — **لا حذف** لأي فرع.

تاريخ الفحص: 2026-11-04 (مقابل `origin/main`).

## `feat/postgres-v2`

| | |
|--|--|
| على الريموت | نعم (`b2192d7`) |
| commits فريدة عن main | **0** (ahead 0 / behind 108) |
| المحتوى مدموج؟ | **نعم** — الفرع سلف كامل لـ main (لا commits متبقية). سبقه أيضاً مسار `cursor/postgres-v2-parity-d509` (#246, MERGED). |
| إجراء | الإبقاء؛ لا حذف. |

## `fix-home-commerce-1`

| | |
|--|--|
| على الريموت | نعم (`c1ad128`) |
| commits فريدة عن main | **6** (ahead 6 / behind 35) |
| المحتوى مدموج؟ | **جزئياً عبر مسار آخر** — #268 (`cursor/fix-home-commerce-9d2d`) دمج height parity + SQL `/api/catalog/home` + package credit. الـ 6 commits على هذا الفرع **ليست** أسلافاً لـ main (إعادة ترتيب أقسام الصفحة + phases refactor للـ landing قد تكون متعارضة مع قرار #274 بالإبقاء على ترتيب main). |
| commits المتبقية | `dab5258`…`c1ad128` (phase1–4 landing، reorder، catalog home، package credit) |
| إجراء | الإبقاء للمراجعة؛ لا حذف. أسلاك `/api/catalog/home` على `cursor/home-wiring-274` دون نقل أقسام الـ DOM. |

## `audit-agents-1`

| | |
|--|--|
| على الريموت | نعم (`566e7c5`) |
| commits فريدة عن main | **2** (ahead 2 / behind 53) |
| المحتوى مدموج؟ | **لا بالكامل** — تقارير QA فقط (`docs(qa): agents audit…`). على main توجد ملفات agents audit أخرى من مسارات #261/#262/#263، لكن هذين الـ commits ليسا أسلافاً لـ main. |
| إجراء | الإبقاء؛ لا حذف. |
