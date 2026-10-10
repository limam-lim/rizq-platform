# MEMORY — Standing Agent Rules

**Updated:** 2026-10-10  
**Scope:** All future tasks on this repo (and mirrored in user store for all projects).

## Standing constitutions (do not erase)

| Layer | Repo / Store path |
|-------|-------------------|
| Security & Ethical Hacking Auditor | `docs/security/SECURITY_ETHICAL_HACKING_AUDITOR.md` · `/cursor/stores/user/security/…` |
| Performance, Clean Code & Self-Maintenance | `docs/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md` · `/cursor/stores/user/performance/…` |
| Global User Rules | `/cursor/stores/user/settings/cursorrules` |
| User memory mirror | `/cursor/stores/user/memory/MEMORY.md` |

When present from harness branch: L0 `MASTER_CONSTITUTION.md`, L1 `docs/ai-harness/AI_HARNESS_ENGINEERING.md`, `AGENTS.md`.

## Automatic gates (no user ask)

1. **Security Audit before push/deploy/publish** — ethical-hacking scan; fix CRITICAL/HIGH; block otherwise.
2. **Performance / clean-code pass before build/deploy/ship-ready push** — DRY, dead code, N+1, pagination, resource cleanup; deliver optimized code immediately.

## Skills (this repo)

`.cursor/skills/security-ethical-hacking-auditor`  
`.cursor/skills/performance-clean-code`

## Hygiene

Append-only updates to standing rules. Never wipe prior User Settings, security, performance, or harness layers.
