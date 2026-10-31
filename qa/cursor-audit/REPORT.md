# Rizq Cursor Audit Report

Generated: 2026-10-31 17:46 Europe/Madrid (from UTC 16:45Z)

Scope: local PostgreSQL database `rizq_audit` + `http://127.0.0.1:3000` only. Never production / Hetzner.  
Branch: `audit-cursor`. Only files added under `qa/cursor-audit/`. No application code changes. No PR opened.

## Summary

### Backend `npm run test:*` suites — **14/14 pass**

| Suite | Status | Seconds | Log |
|---|---|---:|---|
| `test:pg-repos` | **pass** | 0 | `results/test_pg-repos.log` |
| `test:backup` | **pass** | 0 | `results/test_backup.log` |
| `test:lifecycle` | **pass** | 0 | `results/test_lifecycle.log` |
| `test:ops` | **pass** | 1 | `results/test_ops.log` |
| `test:prefix` | **pass** | 0 | `results/test_prefix.log` |
| `test:images` | **pass** | 0 | `results/test_images.log` |
| `test:widget-lang` | **pass** | 0 | `results/test_widget-lang.log` |
| `test:hardening` | **pass** | 30 | `results/test_hardening.log` |
| `test:admin-roles` | **pass** | 0 | `results/test_admin-roles.log` |
| `test:await` | **pass** | 1 | `results/test_await.log` |
| `test:async-regressions` | **pass** | 2 | `results/test_async-regressions.log` |
| `test:kyc` | **pass** | 45 | `results/test_kyc.log` |
| `test:2fa` | **pass** | 76 | `results/test_2fa.log` |
| `test:sessions` | **pass** | 2 | `results/test_sessions.log` |

Note: first attempts of `test:async-regressions` / `test:sessions` failed when `rizq-backend/.env` forced `PORT=3000` via dotenv `override:true` (spawned child ignored its random PORT). Re-run without that override → both pass. Final recorded status = pass.

### Audit scripts — all executed

`01` IDOR/mass-assign · `02` upload/XSS/injection/rate · `03` admin roles · `04` business rules · `05` buttons/API map · `06` personas API · `07` perf/edge · `08` Playwright UI · `09` contact scrub deep

### Findings by severity

| critical | high | medium | low | **total** |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 3 | 2 | 0 | **5** |

### Personas matrix (API)

| Type | Auth path | Package | Content create | Public visible | Notes |
|---|---|---|---|---|---|
| store | seed+token OK | seeded | 200 (`pending_review`) | false* | *audit used `status=approved`; product expects admin `status=active` |
| corp | seed+token OK | seeded | 200 | false* | same approve-status quirk in harness |
| estate | register 200 + token | seeded | ads path | OK when not rate-limited | |
| office | seed+token OK | seeded | 200 | false* | same |
| individual | seed+token OK | seeded | ads | OK / rate-limit 429 under burst | |
| tender publisher | seed+tender pkg | — | POST /api/tenders **200** | — | without pkg → **403** (verified) |
| investment publisher | seed+invest pkg | — | POST submit **200** | — | without pkg → **403** (verified) |
| visitor | — | — | browse/search **200** | report endpoint 400 (validation) | buyer register returns **410** |

### Personas / UI matrix (Playwright Chromium)

| Viewport × Lang | Landing | Browse | Store XSS executed? | Listing XSS | Profile XSS | Dash store XSS |
|---|---|---|---|---|---|---|
| desktop 1366 × AR | OK | OK | **no** | **no** | **no** | **no** |
| desktop 1366 × FR | OK | OK | **no** | **no** | **no** | **no** |
| mobile 390 × AR | OK | OK | **no** | **no** | **no** | **no** |
| mobile 390 × FR | OK | OK | **no** | **no** | **no** | **no** |

Screenshots: `screenshots/landing_*.png`, `store_xss_*.png`, `profile_xss_*.png`, `dash_store_*.png`, `landing_4g_weak.png`.

Network: normal 4G landing ~1.5s DCL; weak 4G (1.5 Mbps / 300 ms) ~17.5s — see `evidence/network-4g_weak.json`.

### Page weights (HTML body only)

| Page | Status | KB | ms |
|---|---:|---:|---:|
| `/rizq_landing_v8.html` | 200 | **1046** | 45 |
| `/rizq_browse.html` | 200 | 281 | 8 |
| `/rizq_store.html` | 200 | 231 | 7 |
| `/rizq_dashboard_store.html` | 200 | 74 | 2 |
| `/rizq_dashboard_office.html` | 200 | 55 | 2 |
| `/rizq_dashboard_corp.html` | 200 | 74 | 3 |
| `/rizq_dashboard_estate.html` | 200 | 38 | 2 |
| `/rizq_listing.html` | 200 | 1 | 2 |
| `/rizq_post.html` | 200 | 150 | 5 |
| `/rizq_register.html` | 200 | 50 | 2 |

### Buttons / API map

- Static onclick scan across front HTML/JS: **0** unresolved handlers (after excluding keywords / resolving `closeDisc`, `rizqRequireAuth`, dashboard `*_app.js`).
- Frontend `fetch('/api/…')` paths: **0** missing server routes.
- Key pages + `/cp-test` all HTTP 200.

### Admin roles

Matrix (`evidence/admin-roles-matrix.json`): `super`, `admin`, `finance`, `moderator`, `support`, `commercial` — authorization checks passed (403 when out of scope, including finance → telegram setup / launch-config / team).

## Findings (verified only)

| ID | Severity | Status (fix-audit-1) | Page or file | What breaks for the user | Exact repro / verification | Evidence |
|---|---|---|---|---|---|---|
| AUD-CONTACT-TAGLINE | **high** | **FIXED** | `GET /api/accounts/public/:id` (`tagline`) | Was: phone digits in tagline while `contactsLocked`. | Re-run `09`: tagline scrubbed via `stripContactLeak`. Profile PATCH with phone → 422 (`test:contact-scrub`). | `results/09-contact-and-authz-deep.json` |
| AUD-CONTACT-ADDRESS | **high** | **FIXED** | `GET /api/accounts/public/:id` (`address`) | Was: phone digits in address while locked. | Re-run `09`: address scrubbed. | same |
| AUD-CONTACT-FACEBOOK | **high** | **FIXED** | `GET /api/accounts/public/:id` (`facebook`) | Was: `wa.me` returned publicly. | Re-run `09`: `facebook=null` for wa.me; facebook.com accepted on PATCH. | same |
| AUD-UPLOAD-OVERSIZE | **medium** | **FIXED** | `POST/PATCH /api/catalog` | Was: ~2MB image accepted with `200`. | Re-run `02`: oversize → **413** `image_too_large`. `test:contact-scrub` POST+PATCH 2MB → 413. | `results/02-security-upload-xss-injection.json` |
| AUD-LANDING-WEIGHT | **medium** | **ANALYSIS ONLY** (no HTML change) | `rizq_landing_v8.html` | Landing HTML **1046 KB**; weak-4G DCL ~17s. | Breakdown + identical-look extract options in `LANDING_WEIGHT.md`. | `LANDING_WEIGHT.md`, `evidence/landing-weight.json` |

### Fix summary (branch `fix-audit-1`)

- `rizq-backend/services/contactGate.js` — locked viewers: `stripContactLeak` on `tagline`/`address`; `facebook` via `sanitizePublicFacebookUrl` always.
- `rizq-backend/services/contactLeakGuard.js` — added `sanitizePublicFacebookUrl`.
- `rizq-backend/routes/accountsManage.js` — PATCH mine: `scanContactLeakFields` on tagline/address/name → 422; facebook host check → 400.
- `rizq-backend/services/imagePipeline.js` — throw `image_too_large` before processing; catalog default 1.5MB when entitlement missing.
- `rizq-backend/routes/catalog.js` — POST/PATCH catch → **413** `{error:'image_too_large'}`; pass maxPhotos/maxImageBytes.
- Tests: `npm run test:contact-scrub` (22/22). All `test:*` green after env PORT/TRUST_PROXY isolation for spawners.

## Already-fixed items (spot-checked — still holding)

| Item | Result this run |
|---|---|
| Multi-device sessions / concurrent writes | `test:sessions` pass |
| Atomic payment approval → 409 on second | Exercised in script 01 when sub-request created |
| Contact phone nulling on `/api/ads` | Anonymous `phone/whatsapp/sellerPhone/contactPhone` all `null` |
| Unique email/NNI | Covered by migrate + existing suites |
| KYC on-demand | `test:kyc` pass |
| Encoded `/uploads` path bypass | `GET /uploads/%2e%2e%2frizq-backend%2f.env` does not leak secrets |
| Admin team cannot edit higher / finance≠super | Script 03 + 09 → 403 |
| Telegram webhook setup super-only | Finance → 403 |
| Ad text contact scan | POST ad with digits in desc → rejected (`contact_in_text_forbidden`) |
| Catalog badges / status mass-assign | Owner cannot set `status=active`; admin `approved` ignored (must use `active`) |
| Suspend revokes device sessions | `test:sessions` pass |
| XSS profile / dashboards | Playwright `__rizq_xss` never set (AR/FR × desktop/mobile) |
| Purchase category bound to package | Mismatch rejected |
| Investment/tender require package | 403 without package |
| Second package / expiry | Expired `periodEnd` blocks catalog; stacked sub-requests recorded |

## Method notes

- DB: `postgres://…@127.0.0.1:5432/rizq_audit`, `DB_DRIVER=postgres`, `NODE_ENV=test`, `OTP_DEV_HINT=true`, `ADMIN_PANEL_PATH=cp-test`, `BACKEND_SHARED_SECRET=audit-secret` (local only, not committed).
- Accounts: `repos.accounts.upsert` + bcrypt `passHash`, `status:'approved'`.
- Admin: `createAdminSessionStore().set(token,{user,role,permissions,expiresAt})` + header `x-admin-token`.
- Seller: `POST /api/accounts/seller-login` → `x-account-token` (harness mints DB token when login rate-limited).
- Playwright: Chromium, 1366×768 & 390×844, `ar` / `fr`.
- Secrets never printed or committed.

## How to re-run

```bash
cd qa/cursor-audit && npm install && npx playwright install chromium && node run-all.js
# report: qa/cursor-audit/REPORT.md
```
