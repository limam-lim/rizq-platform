# Landing weight analysis — `rizq_landing_v8.html` (AUD-LANDING-WEIGHT)

**Analysis only — no HTML/CSS/JS moved in this change.**  
Generated: 2026-10-31 Europe/Madrid.

| Metric | Value |
|---|---|
| File | `rizq_landing_v8.html` |
| Total size | **1 071 455 bytes (1046 KB)** |
| Measurement | UTF-8 byte length of the HTML document only (before linked CSS/JS/images) |

## Top 15 contributors (by byte size)

| # | Kind | Label | Lines (approx) | Bytes | Share |
|---:|---|---|---|---:|---:|
| 1 | inline `<script>` | Mega page script (DEMO + i18n + prices + UI logic) | 7176–15948 | **539 299** | 50.3% |
| 2 | inline `<style>` | Primary page stylesheet | 160–5234 | **267 642** | 25.0% |
| 3 | inline `<script>` | Secondary DEMO / showcase block | 16431–17301 | **51 052** | 4.8% |
| 4 | inline `<script>` | Prices / market helpers | 16106–16320 | **12 022** | 1.1% |
| 5 | inline `<script>` | Smaller UI helper block | 15960–16061 | **7 096** | 0.7% |
| 6 | inline `<style>` | Early/critical CSS block | 72–155 | **4 672** | 0.4% |
| 7 | inline `<script>` | Boot / early script | 5235–5272 | **1 480** | 0.1% |
| 8 | inline `<style>` | Late style patch | 5305–5335 | **1 285** | 0.1% |
| 9 | inline `<style>` | Head critical CSS | 5–22 | **1 119** | 0.1% |
| 10 | inline `<script>` | Small helper | 5336–5358 | **1 109** | 0.1% |
| 11 | inline `<script>` | Tiny helper | 16322–16340 | **580** | <0.1% |
| 12 | inline `<script>` | Tiny helper | 16355–16371 | **575** | <0.1% |
| 13 | inline `<script>` | Tiny helper | 16083–16087 | **303** | <0.1% |
| 14 | inline `<script>` | Prices snippet | 6311 | **299** | <0.1% |
| 15 | inline `<script>` | Head boot | 56–65 | **259** | <0.1% |

Remaining ~185 KB is markup, external `<script src>` tags (tiny references), attributes, and whitespace.

### Inside the mega script (#1) — large bindings

| Binding | Approx line | Bytes | Role |
|---|---:|---:|---|
| `FEATURED_ADS` | ~7269 | 39 302 | Featured ad DEMO payload |
| `LANG` | ~11059 | 33 778 | Language / copy table |
| `PKG_TR` | ~15318 | 13 797 | Package i18n |
| `TR` | ~12158 | 13 728 | UI translation map |
| `ADS` | ~7251 | 12 925 | Ad DEMO array |
| `SUB_FR` | ~11445 | 10 207 | French subscription strings |

Rough signal counts in mega script: ~142 i18n-related matches, ~322 `function` declarations, DEMO fixture markers present.

**Inline base64 images / large SVG:** no individual `data:image/…;base64,…` blobs ≥200 chars and no oversized inline `<svg>` blocks were found as top contributors — weight is dominated by **inline JS + CSS text**, not embedded media.

## Why this hurts weak 4G

Playwright CDP weak profile (~1.5 Mbps, 300 ms RTT) measured landing DCL ≈ **17.5 s**. A 1 MB HTML document must download before the parser finishes; inline CSS/JS cannot be cached across navigations the way fingerprinted `.css` / `.js` files can.

## Options that keep the visual design 100% identical

These are **extract/defer** moves only — no layout, color, typography, or content changes.

1. **Extract mega inline `<script>` → cached external file(s)**  
   Move lines ~7176–15948 into e.g. `rizq_landing_v8.app.js?v=…` (same bytes, but `Cache-Control` + compression reuse on repeat visits). Optionally split DEMO fixtures (`FEATURED_ADS` / `ADS`) into `rizq_landing_demo.js` loaded only when launch/demo mode needs them.

2. **Extract primary inline `<style>` → cached CSS**  
   Move lines ~160–5234 into `rizq_landing_v8.css?v=…`. Keep a tiny critical CSS in `<head>` (the ~1–5 KB blocks) if FOUC must stay zero; load the rest as `<link rel="stylesheet">` with the same rules — pixel-identical once applied.

3. **Defer non-critical scripts**  
   Mark below-the-fold / interaction scripts with `defer` (or `type="module"` + dynamic `import()` after first paint): package tables, secondary DEMO block (16431–17301), market-price helpers. Hero HTML + critical CSS stay first; behavior unchanged after load.

4. **Lazy-load below-the-fold images**  
   Ensure carousel / section images use `loading="lazy"` (and width/height) so weak networks prioritize LCP hero. Does not change visuals when scrolled into view.

5. **Serve DEMO / i18n as separate JSON**  
   Keep `LANG` / `TR` / `PKG_TR` / `FEATURED_ADS` as `fetch('/rizq-landing-*.json')` after first paint when the UI needs them — same strings on screen, smaller first HTML byte.

6. **Brotli/gzip at the edge** (ops, not markup)  
   1046 KB HTML typically compresses well; ensure production nginx/CDN compresses `text/html`. Complements (1)–(2); does not replace them for cacheability.

### Suggested sequencing (still no visual change)

| Step | Expected first-visit HTML drop | Cache win on revisit |
|---|---|---|
| A. Extract mega JS | ~500 KB off HTML | High |
| B. Extract main CSS | ~260 KB off HTML | High |
| C. Defer secondary DEMO script | ~50 KB delayed | Medium |
| D. Lazy images + compress | TTI / LCP, not raw HTML | Medium |

**Do not implement in this PR** — backend contact/upload fixes only; this file is the analysis deliverable for AUD-LANDING-WEIGHT.
