---
name: memory-guard
description: >
  Memory & Context Guard. Use at the start of any task or session and after
  completing any atomic SDD task. Ensures MEMORY.md, AGENTS.md, and
  constitution files are read on startup and MEMORY.md is updated on shutdown.
icon: book-open
color: blue
---

# Skill: Memory & Context Guard

## Alignment (non-negotiable)

1. Complements `/sovereign-preflight` and L1 SDD — does **not** replace them.
2. Startup reads must include L0 + L1 when present (see order below).
3. Shutdown updates apply after **each** atomic task (SDD step 6), not only at end of a multi-task epic.
4. Never invent or overwrite history; append dated entries. No silent omission of architectural decisions.
5. Obey `HALT` / `REVERT` / `AUDIT ONLY`: under `AUDIT ONLY`, do not edit `MEMORY.md` unless the user explicitly allows a memory note.

## Startup Rule

At the **absolute beginning** of any task or session, read in this order:

1. `MASTER_CONSTITUTION.md` (alias `SOVEREIGN_FRAMEWORK`) when present
2. `docs/ai-harness/AI_HARNESS_ENGINEERING.md` when present
3. `AGENTS.md`
4. `MEMORY.md`
5. `docs/constitution.md` when present

Then proceed to `/sdd-lifecycle` (or the approved next step). Do not write application code before these reads.

## Shutdown Rule

At the **completion of any atomic task**, update `MEMORY.md` when any of the following occurred:

- Architectural decisions
- Tech stack / dependency choices (including explicit refusals to add packages)
- Structural patterns (new modules, SSOT moves, Bounded Context boundaries)
- Security posture changes (auth, RBAC, validation, secrets handling)
- Circuit-breaker events that change operating mode
- Durable state changes the next session must know

### Entry format

```markdown
## YYYY-MM-DD — short title

- **Decision:** …
- **Why:** …
- **Files / areas:** …
- **RF / task:** RF-… / T…
```

## Anti-patterns (forbidden)

- Skipping startup reads because “context seemed familiar”
- Dumping raw chat logs into `MEMORY.md`
- Storing secrets, tokens, or passwords in `MEMORY.md`
- Replacing the whole file instead of appending
- Claiming completion without a MEMORY update when a lasting decision was made
