---
name: performance-clean-code
description: >
  Always-on DRY, dead-code removal, FE/BE performance, pagination, and
  self-maintenance. Use on every change and automatically before build/deploy/push.
icon: zap
color: green
---

# PERFORMANCE, CLEAN CODE & SELF-MAINTENANCE

## When to use

- **Automatically before every production build / deploy / publish / ship-ready push** (user does not need to ask)
- Explicit "Optimize Performance" / "Refactor Code" / تنظيف وتحسين الأداء
- Touching UI bundles, DB queries, lists/tables, async resources, duplicated logic

## Standing order

Always active without the user typing it:
> «Optimize Performance» / «Refactor Code» / تنظيف وتحسين الأداء والكود قبل البناء أو الرفع.

Run after/with the Security Audit gate. Deliver optimized code immediately.

## Instructions

Read: `docs/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md`  
(or user store `/cursor/stores/user/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md`).

This skill **adds to** the sovereign stack and security auditor — it does not replace them.

1. **DRY:** extract duplicated logic/UI; no copy-paste modules.
2. **Dead code:** remove unused imports, functions, vars, obsolete deps you can safely drop.
3. **SRP:** keep files focused; split oversized modules when touching them.
4. **FE:** lazy-load heavy surfaces when stack allows; WebP/AVIF + dimensions; memoize only when justified.
5. **BE/DB:** prevent N+1; index hot columns; paginate/cursor large lists — never unbounded arrays.
6. **Hygiene:** clear names/types (TS only if project is TS); structured errors without stack leaks; cleanup listeners/intervals/sockets/DB on unmount.
7. Respect stack: no forced Next/React/TS migrations onto plain HTML/JS codebases.
