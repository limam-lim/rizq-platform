---
name: security-data-shield
description: >
  Apply Master Constitution Section III security rules: Zero Trust APIs,
  RBAC, input sanitization/schema validation, and secret isolation.
  Use when designing endpoints, auth, validation, or reviewing security.
icon: lock
color: orange
---

# Universal Cybersecurity & Data Shield

## When to use

- New or changed API endpoints
- Auth / roles / permissions work
- Input handling, forms, query params, webhooks
- Secrets, env vars, tokens, API keys
- Security audits

## Instructions

1. **Zero Trust:** No endpoint is public by default. Authenticate and authorize server-side.
2. **Strict RBAC:** Isolate roles (e.g. end user, buyer, seller, admin) per product rules.
3. **Input validation:** Every inbound payload through a strict schema (Zod **or** project-equivalent). Do not install Zod without approval.
4. **Secret isolation:** Never put secrets in source. Use `.env` / secret managers. Never commit secrets.
5. **No silent failures:** Observable operator logs; safe user-facing errors.
6. Capture security requirements in `spec.md` (EARS) and threats/mitigations in `plan.md` before coding.
7. Prefer pure validation helpers with explicit inputs/outputs for testability.
