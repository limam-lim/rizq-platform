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
