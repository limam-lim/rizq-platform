---
name: testing-validation
description: >
  Testing & Validation Harness. Use before marking any atomic SDD task
  complete. Requires empirical tests (e.g. node --test), captured
  stdout/stderr, and explicit mapping back to spec.md acceptance criteria.
icon: beaker
color: green
---

# Skill: Testing & Validation Harness

## Alignment (non-negotiable)

1. Implements SDD steps **6** (Isolated Task Execution) and **7** (Comprehensive Validation).
2. Use after code for the current atomic task (`T#`) is written — before declaring the task done.
3. Under `AUDIT ONLY`, run read-only checks only; do not modify product code to “make tests pass” unless the user lifts the breaker.
4. Do not install new test frameworks without approval (Zero Unsanitized Dependencies). Prefer `node --test` or the project’s existing test scripts.
5. No silent failures: failing tests block completion; log observable output.

## Verification Mandate

Never mark a task complete without **empirical** validation:

1. Identify the smallest relevant test command for this task (examples):
   - `node --test`
   - `node --test path/to/file.test.js`
   - existing project scripts under `scripts/` or `package.json` `test` / targeted harnesses
2. Run the command and capture **stdout and stderr** in full (or a faithful excerpt if huge — keep failures complete).
3. If no automated test yet exists for the change:
   - Prefer adding a minimal pure-function / script test in the same atomic task **only if** that was in `plan.md` / `tasks.md`
   - Otherwise perform an explicit manual/terminal verification checklist tied to RF ids, and record the evidence
4. UI tasks: also apply `/frontend-design` viewport checks when UI is in scope.

## Acceptance Mapping

Before marking `T#` complete in `tasks.md`:

1. Quote or list the relevant RF / acceptance lines from `spec.md`.
2. For each RF claim touched by this task, state **evidence** (test name, command, log line, or screenshot path under `/opt/cursor/artifacts/` when UI).
3. Prove the implementation maps **directly** to those criteria — not vibes, not “should work”.
4. If any RF is unmet: leave the task **incomplete**, report the gap, and wait for user direction (do not silently skip).

### Completion record template

```markdown
### T# validation
- **Command:** `…`
- **Result:** PASS | FAIL
- **RF mapping:**
  - RF-… → evidence …
- **stdout/stderr:** (paste or artifact path)
```

## Hard stops

- No “complete” without a run log
- No greenwash (ignoring failing assertions)
- No multi-task bundling of validation — validate **this** atomic task only, then STOP for the user
