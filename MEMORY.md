# MEMORY.md

Architectural and harness decisions. Update immediately when decisions change.

## 2026-10-05 — SDD IDE prompt adopted (universal)

- **What it is:** Operating prompt for intelligent models inside development environments (Cursor, VS Code) to enforce Spec-Driven Development (SDD), DDD, and Defensive Programming.
- **File:** `docs/ai-harness/AI_HARNESS_ENGINEERING.md` (+ user settings store `/cursor/stores/user/ai-harness/`).
- **Scope:** All future work, any project.
- **Workflow:** Context → `spec.md` → clarification → `plan.md` → `tasks.md` → one task at a time → RF validation.
