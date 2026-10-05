# Project Constitution

This file is the project-facing copy of the AI Harness Engineering constitution.
Full text: `docs/ai-harness/AI_HARNESS_ENGINEERING.md`

## Absolute laws

1. No application code until `spec.md`, `plan.md`, and `tasks.md` are designed, reviewed, and explicitly approved.
2. Specification is the single source of truth; code maps to Requirements (RF).
3. Separate presentation, pure business logic, and state/storage.
4. Prefer pure, testable functions with explicit inputs/outputs.
5. Do not install dependencies without constitution authorization or user approval.

## Mandatory 7-step SDD lifecycle

1. Read `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`
2. Write `spec.md` (EARS)
3. Clarify ambiguities — wait for resolution
4. Write `plan.md`
5. Write `tasks.md` (T1, T2, …)
6. Execute one atomic task only — validate — STOP for user prompt
7. Validate against RF (+ UI where applicable)

## Memory

Log architectural decisions, stack choices, and structural patterns in `MEMORY.md` immediately when they change.
