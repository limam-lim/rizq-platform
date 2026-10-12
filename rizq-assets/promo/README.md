# Rizq platform promo (Hero + modules)

## Hero loop (existing)
- `rizq-platform-promo.mp4` — master (1920×1080)
- `rizq-platform-promo-light.mp4` — Hero default (1280×720, web-optimized)

Playback order (`rizq_video_ads.js`):
1. Platform promo
2. Paid Rizq ADS hero advertisers
3. Back to platform promo

Config: `site-config.videoAds.platformPromoUrl` / `platformPromoEnabled` / `adSlotSeconds`.

## Modules promo (stores / showrooms / offices / tenders / investments)
- `rizq-modules-promo-demo.mp4` — master (~63s, 1920×1080)
- `rizq-modules-promo-demo-light.mp4` — web cut (1280×720)

Walkthrough with promotional sample data for:
محلات · معارض · مكاتب · مناقصات · استثمارات

**Disclaimer burned into every live segment:**  
`بيانات ترويجية فقط — ليست بيانات حقيقية`

Open demos:
- `rizq_dashboard_store.html?demo=1`
- `rizq_dashboard_corp.html?demo=1`
- `rizq_dashboard_office.html?demo=1`
- `rizq_tenders.html` / `rizq_investments.html` (seeded API demo rows)

## Intro video = dashboard by account type (فيديو تعريفي)
Clips cut from the modules promo for the public “intro video” player
(`rizq_intro_video.js` / `RizqIntroVideo.demoDashboardVideo(type)`):

| Type | Video | Poster |
|------|-------|--------|
| store (محل) | `rizq-dashboard-store-demo-light.mp4` | `rizq-dashboard-store-demo-poster.jpg` |
| office (مكتب) | `rizq-dashboard-office-demo-light.mp4` | `rizq-dashboard-office-demo-poster.jpg` |
| corp / showroom (معرض) | `rizq-dashboard-corp-demo-light.mp4` | `rizq-dashboard-corp-demo-poster.jpg` |

Demo pages (`?demo=1`) use these instead of placeholder YouTube links.
Real subscribers still paste their own YouTube/Facebook URL in the dashboard.

## Public interfaces promo (storefronts — not dashboards)
- `rizq-public-interfaces-promo.mp4` — master (~100s, 1920×1080)
- `rizq-public-interfaces-promo-light.mp4` — web cut (1280×720)

Public visitor pages with seeded promo merchandise/services:
- `rizq_store.html?id=acc_promo_store_rizq`
- `rizq_office.html?id=acc_promo_office_rizq`
- `rizq_showroom.html?id=acc_promo_corp_rizq`
- `rizq_tenders.html` / `rizq_investments.html`

Seed: `scripts/seed-public-promo-interfaces.js`

**Disclaimer burned into every segment:**  
`بيانات ترويجية فقط — ليست بيانات حقيقية`
