# AGENTS.md

## Operating mode

This repository is governed by **AI Harness Engineering / Spec-Driven Development**.

Before any feature or change request:

1. Read this file, `MEMORY.md`, and `docs/constitution.md`
2. Follow the full constitution in `docs/ai-harness/AI_HARNESS_ENGINEERING.md`
3. Do not write or modify application code until `spec.md`, `plan.md`, and `tasks.md` are approved
4. Implement only one atomic task at a time, then stop and wait for the user

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
- No multi-task batches without user go-ahead after each task
