# Rizq Platform — Agent instructions

## Cursor Cloud specific instructions

### Never stall waiting for the user
- When the user sends a Master Task, refactor, or “نفّذ / ابدأ / اصلح”, **start execution immediately**. Do not ask for a second confirmation (“اكتب ابدأ”) and do not sit idle.
- If a clarification is truly required, ask **one** short question, then continue with the safest default after one reply — or proceed with an explicit assumption stated in one sentence.
- Idle gaps of many minutes with no tools and no user-visible text are a failure mode. Prefer progress over waiting.

### Keep the chat visibly alive
- Desktop UI often freezes on **“Planning next moves”** or shows an empty pane while the cloud run is fine (or already IDLE). Users may not see messages even when they arrived server-side.
- Write a short user-visible status line every few tool batches (what you finished, what is next). Do not spend long stretches in tools/thinking only.
- Prefer finishing with a commit + draft PR so progress is visible on GitHub even if Desktop desyncs.

### If the user reports “stuck / spinning / no messages on screen”
- Do not restart the same huge task from zero until checking whether a branch/PR already exists for the work.
- Tell them to open `https://cursor.com/agents` (or Reload Window) — Desktop indicators are unreliable when desynced.
- Continue or finish the remaining work on the existing branch when possible.

### Task sizing
- Split “Final Phase / Deep Refactoring” style prompts into shippable slices (one vertical or one HTML extraction pass per turn) when the scope is huge, so each turn ends with a PR update instead of a long silent plan.

### Environment
- Install: `cd rizq-backend && npm install` (see `.cursor/environment.json`).
- App: `cd rizq-backend && npm start` → http://localhost:3000
- Prefer curl/script checks for API/routing smoke tests; browser/computerUse UI demos often fail in this environment.
