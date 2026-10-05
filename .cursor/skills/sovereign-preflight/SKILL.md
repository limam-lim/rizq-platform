---
name: sovereign-preflight
description: >
  Mandatory pre-work gate for any feature, fix, audit, or new project.
  Use before writing code, when starting a task, or when the user asks to
  follow MASTER_CONSTITUTION / SOVEREIGN_FRAMEWORK / SDD.
icon: shield
color: brand
---

# Sovereign Preflight (L0 + L1)

## When to use

- Start of any coding or architecture request
- User mentions constitution, harness, SDD, Master, or SOVEREIGN_FRAMEWORK
- Before creating `spec.md` / `plan.md` / `tasks.md`

## Instructions

1. Read in order:
   - `MASTER_CONSTITUTION.md` (alias `SOVEREIGN_FRAMEWORK`)
   - `docs/ai-harness/AI_HARNESS_ENGINEERING.md`
   - `AGENTS.md`, `MEMORY.md`, `docs/constitution.md` (when present)
2. Confirm Problem-First / DDD / SSOT gates if a new product or feature is requested.
3. Do **not** write or modify application code until `spec.md`, `plan.md`, and `tasks.md` are approved.
4. If the user issues `HALT`, `REVERT`, or `AUDIT ONLY`, stop the normal pipeline and obey that circuit breaker immediately (see `/circuit-breakers`).
5. Log lasting architectural decisions in `MEMORY.md`.
6. Do not install new packages without explicit approval (Zero Unsanitized Dependencies).
7. Stack-aware: do not force TypeScript onto JavaScript projects (e.g. Rizq).
