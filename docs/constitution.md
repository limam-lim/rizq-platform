# Project Constitution

**L0 Master:** `MASTER_CONSTITUTION.md` (alias: `SOVEREIGN_FRAMEWORK`)  
**L1 IDE SDD prompt:** `docs/ai-harness/AI_HARNESS_ENGINEERING.md`

L0 = sovereign business + security + ops umbrella.  
L1 = Spec-Driven Development operating prompt for intelligent models in Cursor / VS Code.

**Applies to all future work and all projects.** Read both before any implementation.

## Absolute laws

1. No application code until `spec.md`, `plan.md`, and `tasks.md` are designed, reviewed, and explicitly approved.
2. Specification is the single source of truth; code maps to Requirements (RF).
3. Separate presentation, pure business logic, and state/storage.
4. Prefer pure, testable functions with explicit inputs/outputs.
5. Do not install dependencies without constitution authorization or user approval.
6. Problem-First + DDD + SSOT + Zero Trust + RBAC + secret isolation (see Master).
7. Obey `HALT` / `REVERT` / `AUDIT ONLY` immediately.

## Mandatory 7-step SDD lifecycle

1. Read Master + L1 + `AGENTS.md` + `MEMORY.md` + this file
2. Write `spec.md` (EARS)
3. Clarify ambiguities — wait for resolution
4. Write `plan.md`
5. Write `tasks.md` (T1, T2, …)
6. Execute one atomic task only — validate — STOP for user prompt
7. Validate against RF (+ UI where applicable)

## Memory

Log architectural decisions, stack choices, and structural patterns in `MEMORY.md` immediately when they change.
