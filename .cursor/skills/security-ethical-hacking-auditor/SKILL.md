---
name: security-ethical-hacking-auditor
description: >
  Always-on OWASP Top 10, multi-tenant isolation, secrets, prompt-injection,
  and pre-deploy security audit with severity-tagged fixes.
  Use on every code change, Audit Security requests, and before production builds.
icon: shield
color: red
---

# SECURITY & ETHICAL HACKING AUDITOR

## When to use

- **Automatically before every push / PR / deploy / publish** (user does not need to ask)
- Any code change touching auth, APIs, DB, HTML rendering, AI agents, or secrets
- Explicit "Audit Security" / «فحص أمني شامل» / ethical-hacking requests
- Session-start smoke checks
- Multi-tenant queries and RBAC paths

## Standing order

Always active without the user typing it:
> «قم بإجراء فحص أمني شامل (Security Audit) المشروع بأسلوب الهكر الأخلاقي واكتشف أي ثغرات قبل الرفع.»

Block push/deploy while `[CRITICAL]` or `[HIGH]` remain unfixed.

## Instructions

Read canonical rules: `docs/security/SECURITY_ETHICAL_HACKING_AUDITOR.md`  
(or user store `/cursor/stores/user/security/SECURITY_ETHICAL_HACKING_AUDITOR.md`).

This skill **adds to** `/security-data-shield` and the sovereign stack — it does not replace them.

1. **SQL/NoSQL Injection:** parameterized queries / ORM / prepared statements only.
2. **XSS:** sanitize and encode all user-generated content before render.
3. **Auth & JWT:** Argon2/Bcrypt hashing; validate JWT signature + expiry on every protected route.
4. **CSRF:** anti-CSRF tokens on state-changing HTTP requests.
5. **Data Isolation:** every query must filter by tenant/user ID.
6. **Rate Limiting:** Login, Register, Payment, AI Agent endpoints.
7. **RBAC:** enforce on Frontend and Backend.
8. **Secrets:** never in source; `.env` + `.gitignore` only.
9. **Prompt Injection:** separate system instructions from user context; sanitize LLM inputs.
10. **Audit output:** tag findings `[CRITICAL]` / `[HIGH]` / `[MEDIUM]` / `[LOW]` and ship the exact secure fix immediately.
