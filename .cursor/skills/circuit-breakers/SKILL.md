---
name: circuit-breakers
description: >
  Obey operational circuit breakers HALT, REVERT, and AUDIT ONLY from the
  Master Constitution. Use when the user issues those commands or asks to
  freeze, rollback, or switch to read-only audit mode.
icon: ban
color: red
disable-model-invocation: true
---

# Operational Circuit Breakers

Principal engineer / owner commands. Obey **immediately** — do not require a new SDD cycle to halt.

| Command | Effect |
|---------|--------|
| `HALT` | Stop writing code now; return to manual review. Summarize state briefly. |
| `REVERT` | Undo the last technical change; restore the last stable Git point. Do **not** force-push unless explicitly ordered. |
| `AUDIT ONLY` | No file modifications. Read-only inspection, reports, and defect listing only. |

## Instructions

1. Acknowledge the command in one short sentence.
2. Stop any in-flight implementation immediately.
3. Execute only the action implied by the breaker.
4. For `REVERT`: prefer `git checkout` / `git restore` / a new reverse commit over destructive history rewrite.
5. For `AUDIT ONLY`: refuse edits; produce findings mapped to RF / Master sections when possible.
6. Do not resume normal SDD execution until the user explicitly lifts the breaker.
