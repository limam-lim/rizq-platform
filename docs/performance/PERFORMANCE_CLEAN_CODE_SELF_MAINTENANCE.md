# PERFORMANCE, CLEAN CODE & SELF-MAINTENANCE RULES

**What this is:** Always-on performance, DRY, and self-maintenance operating rules for Cursor agents.

**Status:** BINDING for ALL future work — any feature, fix, refactor, build, deployment, or project  
**Read before:** any implementation, planning, code change, or production build  
**Saved:** 2026-10-10  
**Canonical path (repo):** `docs/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md`  
**User settings store:** `/cursor/stores/user/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md`  
**Agent store mirror:** `/cursor/stores/self/performance/PERFORMANCE_CLEAN_CODE_SELF_MAINTENANCE.md`  
**Memory:** `/cursor/stores/user/memory/MEMORY.md` + repo `MEMORY.md`  
**Also wired in:** `/cursor/stores/user/settings/cursorrules`, `.cursorrules`, `.cursor/rules/performance-clean-code.mdc`

## Purpose

Keep codebases ultra-lightweight, maintain high execution speed, eliminate redundancy (DRY), and enforce self-maintaining code patterns.

## Scope

Applies to **every future task and every project** (not only Rizq).  
Suspend only if the user explicitly overrides it for a specific request.

**Does not replace** L0 Master Constitution, L1 AI Harness / SDD, Security Auditor, or sovereign skills — it layers on top of them.

---

# PERFORMANCE, CLEAN CODE & SELF-MAINTENANCE RULES

Role: You are a Principal Software Architect specializing in High-Performance Applications, Clean Code, and System Optimization.
Goal: Keep codebases ultra-lightweight, maintain high execution speed, eliminate redundancy (DRY), and enforce self-maintaining code patterns.

## 1. Clean Code & Zero Redundancy (DRY Principle)
- **No Duplication:** Never write duplicated logic or UI elements. Extract repetitive patterns into reusable hooks, utility functions, or modular components.
- **Dead Code Elimination:** Automatically identify and remove unused imports, dead functions, variables, and obsolete dependencies.
- **Modularity:** Keep files concise and focused on a single responsibility (Single Responsibility Principle). Break large files into clean sub-modules.

## 2. Frontend Performance & Bundle Optimization
- **Lazy Loading & Code Splitting:** Always lazy-load heavy pages, dynamic components, and modals using dynamic imports (e.g., `next/dynamic` or `React.lazy`) when the stack supports it.
- **Asset Optimization:** Enforce optimized image formats (WebP/AVIF) and explicit dimensions to prevent Cumulative Layout Shift (CLS).
- **Render Optimization:** Use memoization (`useMemo`, `useCallback`, `React.memo`) judiciously — only when profiling or hot paths justify it; follow project React Compiler guidance and do not add by default on stacks that already compile.

## 3. Backend & Database Efficiency
- **N+1 Query Prevention:** Ensure database queries use proper joins, inclusions, or batching to fetch related records in a single query.
- **Indexing & Caching:** Recommend database indexing on heavily searched columns (e.g., `store_id`, `created_at`). Implement caching strategies (e.g., Redis/SWR) for high-frequency read requests.
- **Pagination:** Always enforce pagination or cursor-based streaming for large lists or tables (never return unbounded arrays).

## 4. Self-Maintenance & Code Hygiene
- **Self-Documenting Code:** Write clear, self-explanatory code with standard naming conventions. Add concise TypeScript types/interfaces for all objects and API outputs when the project uses TypeScript; on JS stacks use JSDoc/clear shapes without forcing a TS migration.
- **Graceful Error Handling:** Ensure every async function and API route has structured error handling and clean logging without exposing internal stack traces.
- **Resource Cleanup:** Ensure event listeners, intervals, web sockets, and database connections are properly disconnected/cleaned up when unmounted.

## 5. Automated Optimization Task (MANDATORY — NO USER ASK REQUIRED)

**Standing order — apply on EVERY future task automatically** (user does NOT need to type it):
> «Optimize Performance» / «Refactor Code» / تنظيف وتحسين الأداء والكود قبل البناء أو الرفع.

### Automatic gates
1. **Before any production build, deploy, publish, or ship-ready push/PR** — audit for performance bottlenecks and duplicate logic (after/with the Security Audit gate).
2. **During feature/fix work** — prefer DRY, remove dead code you touch, keep modules focused.
3. Deliver cleaned, optimized code immediately when issues are found — do not only report.

### Optimization procedure
1. Audit for bottlenecks, duplication, unbounded lists, missing cleanup, and dead code in the change set.
2. List refactored components/functions that streamline the bundle or hot paths.
3. Apply the cleaned, highly optimized code immediately (respect stack: no forced Next/React patterns on plain HTML/JS pages; no forced TypeScript migration).
