# Journey fixes-1 (branch `fix-journeys-1`)

Audit findings from `JOURNEYS.md` — logic-only product fixes. No design/CSS changes. No production deploys.

| ID | Change | Files | Test result |
|---|---|---|---|
| **J-429-REG** | `_syncAccountToBackend` no longer treats HTTP/network failures as success when `RIZQ_BACKEND_BASE` is set. Rolls back local account; bilingual messages for 429 / 409 email / generic. `ppFinalSubmit` shows success only if `ok:true` and re-enables submit. Same fail messaging on estate register POST. | `rizq_landing_v8.html`, `rizq_real_estate_register.html`, `rizq-backend/scripts/test-register-sync-fail.js`, `rizq-backend/package.json` | `npm run test:register-sync-fail` → **13/13 OK**. R1 desktop-ar journey: registration + dashboard login **✅** (no false success under normal load). |
| **J-ADMIN-PENDING-MISS** | Root cause was mostly false registration success (429). Also: admin sync now always refreshes status/fields from `GET /api/accounts/admin` even for local rows without `_fromBackend`. | `rizq_cp_panel.html` (+ J-429-REG) | Fresh R1 account **visible** in admin pending (`emailVisible=true`). API: new register appears in `/api/accounts/admin`. |
| **J-DASH-PENDING-MSG** | `verify-dash` returns `403 {code:not_approved,status}` for non-approved accounts. Dashboards map that to existing `#access-denied` copy «حسابك قيد المراجعة» (strips `data-t` so i18n cannot overwrite). Boot params captured before `stripUrlToken`. | `rizq-backend/routes/accountsSession.js`, `rizq_dashboard_shared.js`, `rizq_dashboard_store_app.js`, `rizq_dashboard_office_app.js`, `rizq_dashboard_corp_app.js`, `rizq_dashboard_individual_app.js` | Playwright: pending store URL → h2 **حسابك قيد المراجعة**. |
| **J-MULTI-SYNC** | Always merge server account into localStorage; load/refresh profile via `GET /api/accounts/mine/:id`; PATCH waits for resolved `accessToken`. Individual `loadProfile` prefers server `USER_ACC`. | `rizq_dashboard_shared.js`, `rizq_dashboard_store_app.js`, `rizq_dashboard_individual_app.js` | API two-device PATCH/GET/verify-dash: **match**. UI: saveProfile → PATCH 200 → other context `#p-desc` matches (after onboard overlay dismissed). Journey MULTI click path can be blocked by `#rizq-onboard-overlay` / seller-login 429 under burst — product sync path verified. |
| **J-ESTATE-LOGIN-I18N** | Added `dashboard_estate` AR/FR keys; `data-t` on estate access-denied gate. | `rizq_dashboard_estate.html`, `rizq_i18n_data.js`, `rizq_dashboard_estate_app.js` | Logged-out estate + `rizq_lang=fr` → **Connexion requise**. |
| **J-BUYER-OTP-HINT** | **Verify only — no code change.** `otpService` enables `devHint` only when `!isProduction()` (and/or `OTP_DEV_HINT` outside production). Production (`NODE_ENV`/`RIZQ_ENV=production`) never attaches `devHint`. Missing hint in R9/mobile-fr was a flaky local/dev test observation, not a prod leak. | — | Code review of `rizq-backend/services/otpService.js` confirms prod gate. |

## Backend `npm run test:*`

Ran all `test:*` scripts. `test:register-sync-fail` added and green. Spawners `test:sessions` / `test:async-regressions` conflict with long-lived server on `PORT=3000` because `.env` uses `dotenv` `override:true` (pre-existing env isolation issue; not introduced by these fixes). Unit portions of those suites still pass when the main server is stopped.

## Journeys re-run (local)

- R1 × desktop-ar: ✅ 8/8  
- ADMIN: R1 visible/approvable; stale emails from older audit runs may 404  
- MULTI: product sync proven via API + focused UI; full robot sensitive to login rate-limit / onboard overlay  
- R3 × desktop-fr: completed with warnings (estate path); FR gate i18n verified separately  

## Out of scope

No product design/copy rewrites beyond the specified fail/pending/i18n strings. No Hetzner/prod. No PR opened.
