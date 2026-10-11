# AGENTS.md

## Operating mode

Governed by a two-layer constitution:

| Layer | Name | File |
|-------|------|------|
| **L0 Master** | Universal Enterprise & Engineering Master Constitution (`SOVEREIGN_FRAMEWORK`) | `MASTER_CONSTITUTION.md` |
| **L1 IDE SDD** | AI Harness Engineering / Spec-Driven Development prompt | `docs/ai-harness/AI_HARNESS_ENGINEERING.md` |

**Skills (installed):**

`.cursor/skills/` (sovereign stack) and `.agents/skills/` (domain guards)

| Skill | Use |
|-------|-----|
| `/sovereign-preflight` | Mandatory reads + gates before any work |
| `/sdd-lifecycle` | Full 7-step SDD pipeline |
| `/circuit-breakers` | `HALT` / `REVERT` / `AUDIT ONLY` |
| `/security-data-shield` | Zero Trust, RBAC, validation, secrets |
| `/frontend-design` | Mobile-first UI, tokens, visual integrity |
| `/memory-guard` | Startup constitution reads + MEMORY.md shutdown updates |
| `/testing-validation` | Empirical tests + RF acceptance mapping before task complete |

**Universal scope:** binds every future task and every project unless the user explicitly suspends it.

Before any feature or change request:

1. Read `MASTER_CONSTITUTION.md` (L0)
2. Read `docs/ai-harness/AI_HARNESS_ENGINEERING.md` (L1)
3. Read this file, `MEMORY.md`, and `docs/constitution.md`
4. Prefer `/sovereign-preflight` then `/sdd-lifecycle`
5. Do not write or modify application code until `spec.md`, `plan.md`, and `tasks.md` are approved
6. Implement only one atomic task at a time, then stop and wait for the user
7. Obey circuit breakers immediately: `HALT`, `REVERT`, `AUDIT ONLY`

## Required artifacts (per change)

| Artifact | Purpose |
|----------|---------|
| `spec.md` | EARS requirements (RF) — source of truth |
| `plan.md` | Files, pure signatures, pseudocode, discarded alternatives |
| `tasks.md` | Micro-tasks T1, T2, T3… |
| `MEMORY.md` | Lasting architectural / stack decisions |

## Hard stops

- No premature implementation
- No unsanitized new dependencies
- No silent failures
- No forced TypeScript migration on JS stacks without approval
- No multi-task batches without user go-ahead after each task
