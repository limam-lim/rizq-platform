# THE UNIVERSAL ENTERPRISE & ENGINEERING MASTER CONSTITUTION

**Filename:** `MASTER_CONSTITUTION.md`  
**Second name (alias):** `SOVEREIGN_FRAMEWORK` — الإطار السيادي والتشغيلي الموحد  
**Arabic title:** دستور المشاريع والأنظمة الشامل  
**Status:** Enforced globally across all ventures (after alignment review 2026-10-05)  
**Core Philosophy:** Zero Waste, Absolute Security, Spec-Driven Sovereignty, Autonomous AI Harness.

## Document hierarchy (no contradiction)

| Layer | File | Role |
|-------|------|------|
| **L0 — Master (this file)** | `MASTER_CONSTITUTION.md` | Sovereign business + security + ops + engineering umbrella for any company/platform/project |
| **L1 — IDE SDD prompt** | `docs/ai-harness/AI_HARNESS_ENGINEERING.md` | Operating prompt for AI models in Cursor / VS Code (7-step SDD execution) |

L1 implements Section II of this Master. If wording ever conflicts, **this Master wins on business/security/ops**; **L1 wins on IDE task execution detail** — and both must stay aligned via the corrections below.

**Persistent agent settings copies:**

- `/cursor/stores/user/ai-harness/MASTER_CONSTITUTION.md`
- `/cursor/stores/user/ai-harness/SOVEREIGN_FRAMEWORK.md` (alias pointer)
- `/cursor/stores/self/ai-harness/MASTER_CONSTITUTION.md`

---

## Alignment corrections applied (vs draft + existing Rizq / SDD work)

1. **TypeScript / Zero `any`:** Do **not** force TypeScript onto JS stacks (e.g. Rizq). WHEN the project uses TypeScript (or another typed language), THE system SHALL forbid `any` / equivalent escape hatches. WHEN the project is untyped JS, THE agent SHALL preserve the approved stack and SHALL NOT migrate languages without explicit user approval in `spec.md`.
2. **Zod:** Prefer schema validation; do **not** install Zod (or any package) without Zero Unsanitized Dependencies approval. Use Zod **or** the project’s existing equivalent validators.
3. **“Silent” error logging:** Forbidden. Align with L1: **no silent failures**. Log observably for operators; return safe messages to users; never swallow errors.
4. **Zero Unsanitized Dependencies:** Restated here so Master never overrides L1’s ban on impulsive package installs.
5. **Circuit breakers:** User/owner commands; agent must obey immediately without requiring a new SDD cycle for the halt itself.

---

## SECTION I: Business & Architectural Alignment

No production feature or product ships without clearing this strategic gate:

1. **Problem-First Rule:** Building a feature or product without a documented real market problem (Market Validation) is forbidden.
2. **Domain-Driven Design (DDD):** Code structure and data models MUST reflect the real business model, with Bounded Contexts isolated.
3. **Single Source of Truth (SSOT):** No duplicated business data or logic; each Entity / datastore has one authoritative reference.
4. **Spec-Driven Sovereignty:** No application code until `spec.md`, `plan.md`, and `tasks.md` are designed, reviewed, and explicitly approved (same gate as L1).

---

## SECTION II: The 7-Step Spec-Driven Development (SDD) Lifecycle

Any future project or feature MUST pass through this pipeline; skipping stages is forbidden:

1. **Context Ingestion:** Read `MASTER_CONSTITUTION.md` (this file), `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`, and `docs/ai-harness/AI_HARNESS_ENGINEERING.md` before acting.
2. **Specification (`spec.md`):** Requirements exclusively in EARS form: `WHEN [trigger], THE [system] SHALL [behavior]`.
3. **Clarification Phase:** Surface conflicts or gaps; wait until resolved.
4. **Technical Planning (`plan.md`):** Affected files, pure function signatures, discarded alternatives.
5. **Atomic Task Decomposition (`tasks.md`):** Micro-tasks T1, T2, T3…
6. **Isolated Task Execution:** Implement **exactly one** task, test it, record stdout/stderr, mark complete, then **STOP** and wait for the next user command.
7. **Comprehensive Validation:** Map outputs to RF requirements and verify stability (and UI where applicable).

---

## SECTION III: Universal Cybersecurity & Data Shield

Apply to every future system or server:

1. **Zero Trust Architecture:** No API endpoint is public by default; authentication and authorization are mandatory server-side.
2. **Strict RBAC:** Hard isolation among roles (e.g. end users, buyers, sellers, admins) as defined per product.
3. **Input Sanitization & Schema Validation:** Unchecked inputs are forbidden. Every inbound payload passes a strict validator (Zod **or** project-equivalent) to prevent SQL/NoSQL/XSS injection. New validation libraries require explicit approval.
4. **Secret Isolation:** API keys and tokens MUST NOT live in source. Use environment variables (`.env` / secret managers) only. Never commit secrets.

---

## SECTION IV: Clean Code & Defensive Engineering

1. **Pure & Testable Logic:** Business logic as pure functions, isolated from UI and storage side effects.
2. **Typed Discipline (stack-aware):**
   - TypeScript (or typed languages): zero `any`; precise types required.
   - Existing JavaScript codebases: keep the approved language; strengthen validation and contracts without unauthorized stack rewrites.
3. **Graceful Fail-Safe & Error Boundaries:** Prevent full-app crashes via error isolation. User-facing messages stay safe; operator logs are **observable** (not silent). No swallowed failures.
4. **Separation of Concerns:** Presentation, pure domain logic, and state/storage remain decoupled.
5. **Zero Unsanitized Dependencies:** No new packages without constitution authorization or explicit user approval.

---

## SECTION V: Operational Circuit Breakers

The principal engineer / owner may issue these at any time; the agent obeys immediately:

| Command | Effect |
|---------|--------|
| **`HALT`** | Stop writing code immediately; return to manual review. |
| **`REVERT`** | Undo the last technical change; restore the last stable Git point (no force-push unless explicitly ordered). |
| **`AUDIT ONLY`** | No modifications; read-only inspection, reports, and defect listing only. |

---

## Pre-work checklist

1. Read this Master (`MASTER_CONSTITUTION.md` / `SOVEREIGN_FRAMEWORK`).
2. Read L1 IDE prompt `docs/ai-harness/AI_HARNESS_ENGINEERING.md`.
3. Read `AGENTS.md`, `MEMORY.md`, `docs/constitution.md` when present.
4. No application code until `spec.md` + `plan.md` + `tasks.md` are approved.
5. One atomic task only, then stop — unless a circuit breaker (`HALT` / `REVERT` / `AUDIT ONLY`) is active.

---

This constitution is the legal-technical shield for every new company or platform. Drop it at project root so AI and humans operate as a disciplined engineering system without hallucination-driven drift.
