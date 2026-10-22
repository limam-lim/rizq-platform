---
name: sdd-lifecycle
description: >
  Run the 7-step Spec-Driven Development lifecycle: context, EARS spec,
  clarification, plan, atomic tasks, one-task execution, RF validation.
  Use when implementing features, fixing bugs under SDD, or when the user
  asks for spec.md / plan.md / tasks.md.
icon: beaker
color: green
---

# SDD Lifecycle (7 Steps)

## When to use

- Any new feature or non-trivial change under the Master Constitution
- User asks to write or follow `spec.md`, `plan.md`, or `tasks.md`
- After `/sovereign-preflight`

## Instructions

Follow rigidly; do not skip stages.

### 1. Context Ingestion

Run `/sovereign-preflight` (or perform the same reads).

### 2. Specification (`spec.md`)

Write requirements in EARS only:

`WHEN [trigger], THE [system] SHALL [behavior]`

Map each requirement to an RF id (RF-1, RF-2, …).

### 3. Clarification Phase

List ambiguities, edge cases, and architectural conflicts. **Stop and wait** for user resolution.

### 4. Technical Planning (`plan.md`)

Include:

- Affected files
- Pure function signatures (inputs/outputs)
- Pseudocode for non-trivial logic
- Alternatives considered and discarded (with reason)
- Security notes (auth, validation, secrets) when relevant

### 5. Atomic Task Decomposition (`tasks.md`)

Break into micro-tasks T1, T2, T3… Each task must be independently testable.

### 6. Isolated Task Execution

- Implement **exactly one** task
- Run `/testing-validation` (empirical tests; capture stdout/stderr; RF mapping)
- Run `/memory-guard` shutdown update when decisions/state changed
- Mark the task complete in `tasks.md` **only after** validation passes
- **STOP** and wait for the user before the next task

### 7. Comprehensive Validation

Map every completed task back to RF ids (via `/testing-validation` evidence). Verify UI with `/frontend-design` when applicable. No silent failures.

## Hard stops

- No premature application code before approved spec/plan/tasks
- No multi-task batches without user go-ahead after each task
- No new dependencies without approval
