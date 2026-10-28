---
name: frontend-design
description: >
  Frontend Design & Responsive Guard. Use when building or changing UI,
  layouts, CSS, landing pages, dashboards, or responsive behavior.
  Enforces mobile-first viewports, design tokens, and visual integrity
  without contradicting Master Constitution / SDD.
icon: layout
color: cyan
---

# Skill: Frontend Design & Responsive Guard

## Alignment (non-negotiable)

1. Run `/sovereign-preflight` (or equivalent L0/L1 reads) before non-trivial UI work.
2. No application UI code until `spec.md` / `plan.md` / `tasks.md` are approved when SDD applies.
3. **Zero Unsanitized Dependencies:** do not install Tailwind, UI kits, or icon packs unless approved. Prefer the project’s existing CSS system.
4. **Stack-aware tokens:** use the project’s unified design variables. On Rizq that means CSS custom properties (e.g. `rizq-theme.css` / `--rizq-*`). Use Tailwind tokens **only** if the project already uses Tailwind.
5. Preserve existing design systems; do not invent a parallel look.

## Mandatory viewports

- Design **mobile-first**.
- Prioritize critical widths starting from **375px**, then validate larger breakpoints used by the product (tablet/desktop).
- Verify both LTR and RTL when the product is bilingual (e.g. Rizq AR/FR).

## Design tokens

- Prefer CSS variables / existing theme tokens over hardcoded arbitrary values (magic hex, one-off px sprawl).
- When a new token is required, define it in the theme/token source of truth (SSOT), then consume it — do not scatter literals.
- If removing a border/shadow/radius does not hurt interaction or understanding, do not wrap content in decorative cards (especially not in heroes).

## Visual integrity

Prevent:

- Layout overflow (horizontal scroll, clipped containers)
- Z-index stacking conflicts (modals, sticky headers, overlays)
- Text clipping / overflow ellipsis bugs that hide critical content

Also guard:

- Sticky header collision with content
- Safe-area / notch padding on mobile when relevant
- Focus visibility for interactive controls

## Composition rules (when building promotional / landing UI)

Unless the existing design system requires otherwise:

- First viewport = one composition (not a dashboard dump)
- Brand-first hierarchy; avoid generic AI-default themes (purple-on-white, cream+terracotta clichés, etc.)
- Full-bleed hero when the surface is promotional; no hero overlays/badges/chips
- One job per section; reduce clutter
- At least 2–3 intentional motions for visually led work — motion for hierarchy, not noise

## Validation checklist (before marking a UI task done)

- [ ] Checked at ~375px width (and primary desktop width)
- [ ] No horizontal overflow
- [ ] No clipped text / broken stacking
- [ ] Tokens used; no unjustified hardcodes
- [ ] No new CSS framework installed without approval
- [ ] RF / task acceptance criteria still mapped (SDD step 7)
