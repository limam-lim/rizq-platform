# MEMORY.md

Architectural and harness decisions. Update immediately when decisions change.

## 2026-10-05 — Cursor Skills installed (sovereign stack)

- **Project skills:** `.cursor/skills/{sovereign-preflight,sdd-lifecycle,circuit-breakers,security-data-shield}/SKILL.md`
- **Mirrors:** `~/.cursor/skills/` (enable Sync Skills for Cloud Agents in Cursor Settings) and `/cursor/stores/user/skills/`
- **Invoke:** `/sovereign-preflight`, `/sdd-lifecycle`, `/circuit-breakers`, `/security-data-shield`

## 2026-10-05 — `.agents/skills` domain guards

- **`frontend-design`:** mobile-first from 375px; design tokens via project SSOT (Rizq = CSS variables, not forced Tailwind); no overflow/z-index/clipping; respects SDD + Zero Unsanitized Dependencies.
- **`memory-guard`:** startup reads Master/L1/`AGENTS.md`/`MEMORY.md`/`docs/constitution.md`; shutdown updates `MEMORY.md` after each atomic task; no secrets in memory; aligns with `/sovereign-preflight`.
- **`testing-validation`:** never mark T# complete without empirical run (`node --test` or project harness); capture stdout/stderr; map evidence to `spec.md` RF; no new test frameworks without approval.

## 2026-10-05 — Master Constitution adopted (L0) + SDD IDE prompt (L1)

- **L0:** `MASTER_CONSTITUTION.md` — Universal Enterprise & Engineering Master Constitution.
- **Second name:** `SOVEREIGN_FRAMEWORK` (الإطار السيادي والتشغيلي الموحد). Pointer: `docs/ai-harness/SOVEREIGN_FRAMEWORK.md`.
- **L1:** `docs/ai-harness/AI_HARNESS_ENGINEERING.md` — SDD operating prompt for Cursor / VS Code models.
- **Scope:** All future work, any project / company / platform.
- **Alignment corrections on L0 draft:**
  - No forced TypeScript on JS codebases (e.g. Rizq); zero-`any` only when TS/typed stack is in use.
  - Schema validation via Zod **or** project-equivalent; no impulsive package installs.
  - No silent failures — observable logs + safe user messages.
  - Zero Unsanitized Dependencies restated at Master level.
- **Circuit breakers:** `HALT`, `REVERT`, `AUDIT ONLY`.
- **Settings paths:** `/cursor/stores/user/ai-harness/MASTER_CONSTITUTION.md` (+ alias pointer).

## 2026-10-05 — SDD IDE prompt adopted (universal)

- **What it is:** Operating prompt for intelligent models inside development environments (Cursor, VS Code) to enforce Spec-Driven Development (SDD), DDD, and Defensive Programming.
- **File:** `docs/ai-harness/AI_HARNESS_ENGINEERING.md` (+ user settings store `/cursor/stores/user/ai-harness/`).
- **Workflow:** Context → `spec.md` → clarification → `plan.md` → `tasks.md` → one task at a time → RF validation.
