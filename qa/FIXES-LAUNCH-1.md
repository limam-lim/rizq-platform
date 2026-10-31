# FIXES-LAUNCH-1

Branch: `fix-launch-1`

## A) Demo ads/stores flash

- `rizq_backend_config.js`: cache `launchDate` (+ `minActiveAdsToShow`) in `localStorage` key `rizq_launch_cache_v1`; restore before paint.
- `RizqDemo.inventoryAllowed()` returns false until cache or `/api/site-config` is ready, and false when `launchDate` is set.
- Landing/browse: skip embedded DEMO (cards, featured, fashion/showroom demos, discovery showcase) when not allowed; keep existing skeleton / empty containers.
- No new CSS.

## B) `minActiveAdsToShow`

- Default `0` (current behavior).
- Stored in site-config; exposed on `config.launch` via `publicLaunchConfig`.
- Admin field `#launch-min-active-ads` beside launch free-days.
- Landing hides only the «إعلان نشط» stat cell when `adsActive < min` (other three stats stay).

## Tests

| Test | Result |
|------|--------|
| `npm run test:launch-demo` | pass |
| `npm run test:a1-launch` (incl. minActiveAds) | pass |
| Full `test:*` suite (HTTP + spawners) | pass (sessions/async known dotenv port flake if conflict) |
