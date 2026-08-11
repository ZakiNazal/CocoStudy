# CocoStudy P1 — Design System, Shell, Intake, and the Ritual

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue/glassmorphism UI with the MARKED UP identity, establish the motion system, and rebuild the shell, sidebar, intake screen, and processing state.

**Architecture:** `lib/motion.ts` owns every duration and ease; no component defines its own. Presentation primitives live in `components/ui/`. The shell splits into `AppShell`, `Sidebar`, and `TopBar`. Intake becomes `Intake` + `DropZone` + `Ritual`, replacing `UploadArea`.

**Tech Stack:** Tailwind v4 `@theme`, GSAP 3.13 + `@gsap/react`, self-hosted Fontsource variable fonts.

## Global Constraints

- Motion personality is **Premium/deliberate**: signature ease `cubic-bezier(0.4, 0, 0.2, 1)`, 0% overshoot anywhere except the highlighter's custom marker ease.
- Every duration and ease comes from `lib/motion.ts`. A literal duration in a component is a defect.
- All GSAP runs inside `useGSAP` with a `scope` ref. No `useEffect` + manual `gsap.to`.
- `prefers-reduced-motion: reduce` must collapse all motion. Verified by toggling the OS/DevTools setting, not assumed.
- No `rounded-[2.5rem]`, no `backdrop-filter`, no blue `#4169E1` anywhere after this phase.
- Colours come from the CSS custom properties (`var(--ink)`, `var(--pink)`…) or their Tailwind token equivalents. No hex literals in components.
- Every interactive element has a visible focus ring and an accessible name.
- Layout must hold at 360px wide with no horizontal page scroll.
- Commit after every task.

---

### Task 1: Motion system and fonts

**Files:**
- Create: `src/lib/motion.ts`
- Modify: `src/index.css` (font imports, font-family tokens)
- Modify: `src/main.tsx` (register plugins once)

**Interfaces:**
- Produces: `DUR`, `EASE`, `registerMotion()`, `prefersReducedMotion()`, `MARKER_EASE`

- [ ] **Step 1: Write `src/lib/motion.ts`**

```ts
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { CustomEase } from 'gsap/CustomEase';

/** Duration palette. Premium archetype: deliberate, no bounce. */
export const DUR = {
  instant: 0.12,
  quick: 0.18,
  base: 0.34,
  slow: 0.56,
  ritual: 1.2,
} as const;

export const EASE = {
  /** Signature curve — 80% of all motion. */
  signature: 'power2.inOut',
  out: 'power3.out',
  in: 'power2.in',
  /** Highlighter drag: fast entry, slight drag, clean lift. */
  marker: 'marker',
} as const;

let registered = false;

export function registerMotion(): void {
  if (registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, Observer, CustomEase);
  CustomEase.create('marker', 'M0,0 C0.15,0.6 0.3,0.94 0.5,0.97 0.7,0.99 0.85,1 1,1');
  gsap.defaults({ ease: EASE.signature, duration: DUR.base });
  registered = true;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export { gsap, ScrollTrigger, Flip, Observer };
```

- [ ] **Step 2: Import fonts and register motion in `src/main.tsx`**

```tsx
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/martian-mono';
import { registerMotion } from './lib/motion';

registerMotion();
```

- [ ] **Step 3: Point the font tokens at the variable families**

In `src/index.css`, the `--font-display` / `--font-body` / `--font-mono` tokens must name the `Variable` family names Fontsource ships: `"Bricolage Grotesque Variable"`, `"Source Serif 4 Variable"`, `"Martian Mono Variable"`.

- [ ] **Step 4: Verify a font actually loads**

Run `npm run dev`, then in the console: `document.fonts.check('1em "Bricolage Grotesque Variable"')` → `true`.

- [ ] **Step 5: Commit**

---

### Task 2: UI primitives

**Files:**
- Create: `src/components/ui/Button.tsx`, `Banner.tsx`, `Rule.tsx`, `Stat.tsx`

**Interfaces:**
- Produces: `<Button variant="primary"|"ghost"|"danger" size="sm"|"md">`, `<Banner tone="error"|"info" onDismiss?>`, `<Rule />`, `<Stat label value />`

Press feedback is scale `0.97` at `DUR.instant`, applied via CSS `active:` so it needs no JS.

- [ ] Steps: write each primitive, render them in the app, confirm focus rings are visible on keyboard tab, commit.

---

### Task 3: Shell and sidebar

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`
- Delete: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

The sidebar is a ruled index, not a card list: hairline separators, Martian Mono counters, mastery bar per set, no glass. TopBar carries the set title, mastery percentage, and due count.

- [ ] Steps: build, wire, verify at 360px, commit.

---

### Task 4: Intake and DropZone

**Files:**
- Create: `src/components/intake/Intake.tsx`, `DropZone.tsx`
- Delete: `src/components/UploadArea.tsx`

The hero is the thesis: a sheet of ruled paper with the headline set into it, not a centered gradient headline. Drag-active state is a marker stroke around the sheet edge, not a color wash.

- [ ] Steps: build, verify drop and paste paths, verify unsupported-file error, commit.

---

### Task 5: The Ritual

**Files:**
- Create: `src/components/intake/Ritual.tsx`

One GSAP timeline synced to real `ProcessingStatus` transitions. Holds at each beat until the next real status arrives; never reports progress that has not happened. Under reduced motion it renders a static status line instead.

- [ ] Steps: build, drive it through the three statuses with a stub, verify reduced-motion fallback, commit.

---

### Task 6: StudySession token pass

**Files:**
- Modify: `src/components/StudySession.tsx`
- Modify: `src/index.css` (delete the compat block)

P1 does not redesign the notes, flashcards, quiz, or tutor — that is P2–P5. It only swaps the compat tokens for MARKED UP ones so the app is visually coherent and the compat block can be deleted. Squircles become 4px radii, glass becomes paper tones, blue becomes ink.

- [ ] Steps: swap tokens, confirm no `bg-background` / `shadow-soft` / `text-primary` / `rounded-[2.5rem]` remain anywhere, delete the compat block, verify the app renders, commit.

---

## Self-Review

Covers the spec's P1 row: "Design tokens, shell, sidebar, intake, the Ritual." Task 6 is an addition not in the spec — without it, deleting the compat block leaves `StudySession` visually broken, and keeping the compat block leaves two competing design languages in the codebase. It is a token swap only, explicitly not the P2 notes redesign.

ScrollTrigger and Flip are registered in Task 1 but first used in P2 and P3. Registering once at startup is simpler than adding plugins per-phase, and unused registration costs nothing at runtime.
