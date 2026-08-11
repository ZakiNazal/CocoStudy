# CocoStudy P0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CDN/importmap toolchain with a real Vite + Tailwind v4 + Vitest build, and extract every piece of domain logic out of `App.tsx` into pure, tested modules backed by IndexedDB.

**Architecture:** All domain logic moves into `src/lib/` as pure functions that take data and return data — `srs.ts` schedules, `mastery.ts` derives presentation, `extract.ts` turns files into text, `db.ts` is the only module touching IndexedDB, `services/ai.ts` is the only module making network calls. React consumes them through hooks in `src/store/`. At the end of P0 the app looks unchanged but has no CDN dependencies, no `eval`, no `alert`, and a passing test suite.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), GSAP 3.13 + `@gsap/react`, `@google/genai`, `idb`, Vitest + `fake-indexeddb`.

## Global Constraints

- Source moves under `src/`. Every import path in this plan is relative to the repo root.
- No CDN dependencies. `index.html` must contain no `<script src="https://...">`, no importmap, and no inline `tailwind.config`.
- `package.json` is the single source of truth for every dependency version. React is 19.x in `package.json` and nowhere else.
- No `eval` anywhere. `@google/genai` is a normal typed import.
- No `alert()` anywhere. Errors surface through returned error values in P0; the toast UI arrives in P1.
- `createdAt` and `updatedAt` are ISO 8601 strings, never `Date` objects, in every persisted shape.
- Every module in `src/lib/` must be importable in a Node test environment — no DOM globals at module top level.
- Pure modules (`srs.ts`, `mastery.ts`) must not import React, `db.ts`, or `services/`.
- Existing user data under `localStorage['coco_study_sets']` must survive. The key is never deleted.
- Design tokens are the MARKED UP values from the spec, defined once in `src/index.css`. A clearly-marked compat block keeps the old class names alive until P1 replaces the components; it is deleted in P1.
- Commit after every task. Branch is `redesign/marked-up`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Dependency truth. React 19, Tailwind v4, GSAP, idb, Vitest. |
| `vite.config.ts` | Vite + React + Tailwind plugins, Vitest config. No externals, no defines. |
| `index.html` | Bare shell. No CDN, no importmap, no inline config. |
| `src/index.css` | Tailwind import, `@theme` tokens, compat block. |
| `src/main.tsx` | React root. |
| `src/types.ts` | All persisted and domain types. |
| `src/lib/srs.ts` | SM-2-lite scheduler. Pure. |
| `src/lib/mastery.ts` | SRS state → ink and coverage. Pure. |
| `src/lib/db.ts` | IndexedDB repository + migration. Only module touching IDB. |
| `src/lib/extract.ts` | File → text or inline data. |
| `src/services/prompts.ts` | Prompt strings. No transport. |
| `src/services/ai.ts` | Typed Gemini client. Only module making network calls. |
| `src/store/useSettings.ts` | Theme, API key, focus prefs. |
| `src/store/useStudySets.ts` | Set CRUD, persistence, AI orchestration. |
| `src/App.tsx` | Shell only. |
| `src/components/*` | Existing three components, moved and re-pathed. Redesigned in P1. |

---

### Task 1: Toolchain migration

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `index.html`
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/vitest.setup.ts`
- Delete: `index.tsx`, `types/google-genai.d.ts`, `localtest.env`
- Move: `App.tsx` → `src/App.tsx`, `components/` → `src/components/`, `services/` → `src/services/`, `types.ts` → `src/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run dev`, `npm run build`, and `npm test`. Every later task assumes `src/` layout and that `vitest` is runnable.

- [ ] **Step 1: Install dependencies**

```bash
npm install react@^19.2.0 react-dom@^19.2.0 react-markdown@^10.1.0 \
  @google/genai@^1.30.0 gsap@^3.13.0 @gsap/react@^2.1.2 idb@^8.0.3 \
  jszip@^3.10.1 mammoth@^1.11.0 lucide-react@^0.555.0

npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0 \
  @vitejs/plugin-react@^5.1.1 tailwindcss@^4.1.0 @tailwindcss/vite@^4.1.0 \
  vitest@^3.2.0 fake-indexeddb@^6.0.1 typescript@^5.7.0 vite@^7.2.4
```

Then remove `react-router-dom` — it is imported only as an unused `HashRouter` wrapper and the spec's non-goals rule out routing:

```bash
npm uninstall react-router-dom
```

- [ ] **Step 2: Move source into `src/`**

```bash
mkdir -p src/lib src/store
git mv App.tsx src/App.tsx
git mv types.ts src/types.ts
git mv components src/components
git mv services src/services
git rm -r --cached types && rm -rf types
git rm index.tsx localtest.env
```

- [ ] **Step 3: Write `src/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Write `src/index.css` with MARKED UP tokens**

```css
@import "tailwindcss";

@theme {
  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Source Serif 4", ui-serif, Georgia, serif;
  --font-mono: "Martian Mono", ui-monospace, SFMono-Regular, monospace;

  --color-paper: #EEEDE8;
  --color-paper-2: #F7F6F2;
  --color-paper-3: #E3E1DA;
  --color-ink: #16151A;
  --color-ink-2: #56545C;
  --color-ink-3: #8B8A85;
  --color-pink: #FF5FA2;
  --color-yellow: #F5E663;
  --color-green: #9BEE5C;
  --color-cyan: #43D9E8;
  --color-red: #E5484D;

  --text-2xs: 0.6875rem;
  --text-xs: 0.8125rem;
  --text-sm: 0.9375rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.625rem;
  --text-2xl: 2.25rem;
  --text-3xl: 3.25rem;
  --text-4xl: 4.5rem;
}

:root {
  --paper: #EEEDE8;
  --paper-2: #F7F6F2;
  --paper-3: #E3E1DA;
  --ink: #16151A;
  --ink-2: #56545C;
  --ink-3: #8B8A85;
  --pink: #FF5FA2;
  --yellow: #F5E663;
  --green: #9BEE5C;
  --cyan: #43D9E8;
  --red: #E5484D;
}

[data-theme="dark"] {
  --paper: #0F0E12;
  --paper-2: #1A1920;
  --paper-3: #24232C;
  --ink: #EDECE7;
  --ink-2: #A9A7B0;
  --ink-3: #6E6C77;
  --pink: #FF7FB6;
  --yellow: #F8EE86;
  --green: #B2F27C;
  --cyan: #6FE4F0;
  --red: #FF6369;
}

html, body, #root { height: 100%; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* ---------------------------------------------------------------
   COMPAT BLOCK — keeps the pre-redesign components rendering until
   P1 replaces them. DELETE THIS ENTIRE BLOCK IN P1.
   --------------------------------------------------------------- */
@theme {
  --color-primary: #4169E1;
  --color-primary-dark: #2F4FDB;
  --color-secondary: #93C5FD;
  --color-accent: #EFF8FF;
  --color-background: #F0F8FF;
  --color-surface: #FFFFFF;
  --color-dark: #2D3748;
  --shadow-soft: 0 20px 40px -15px rgba(65, 105, 225, 0.12);
  --shadow-glow: 0 0 20px rgba(65, 105, 225, 0.18);
  --shadow-card: 0 4px 16px -4px rgba(0, 0, 0, 0.06);
  --animate-fade-in: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-slide-up: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  --animate-float: float 6s ease-in-out infinite;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes scaleIn { from { transform: scale(0.9); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes float { 0%, 100% { transform: none } 50% { transform: translateY(-10px) } }
.perspective-1000 { perspective: 1000px }
.transform-style-3d { transform-style: preserve-3d }
.backface-hidden { backface-visibility: hidden }
.rotate-y-180 { transform: rotateY(180deg) }
.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.no-scrollbar::-webkit-scrollbar { display: none }
/* --------------------------- END COMPAT --------------------------- */
```

- [ ] **Step 5: Rewrite `index.html` as a bare shell**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="CocoStudy - Your AI-powered study companion" />
  <meta name="author" content="Zaki Nazzal" />
  <title>CocoStudy</title>
  <link rel="icon"
    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23EEEDE8'/%3E%3Cpath d='M3 6h18v3H3z' fill='%23FF5FA2'/%3E%3Cpath d='M3 12h13v3H3z' fill='%23F5E663'/%3E%3Cpath d='M3 18h8v3H3z' fill='%239BEE5C'/%3E%3C/svg%3E" />
</head>

<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>

</html>
```

- [ ] **Step 6: Rewrite `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    setupFiles: ['./src/vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: Write `src/vitest.setup.ts`**

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 8: Update `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "vite",
  "start": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 10: Fix import paths in moved components**

`src/App.tsx` — remove the `HashRouter` import and both wrapper tags, remove the unused `GraduationCap` import. Its imports of `./components/...`, `./services/geminiService`, and `./types` already resolve correctly after the move.

In `src/services/geminiService.ts`, replace the eval loader with a real import:

```ts
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '' });
  }
  return aiInstance;
};
```

Every `await getAi()` becomes `getAi()`. This file is replaced entirely in Task 7; this step only keeps the app booting.

- [ ] **Step 11: Verify the app builds and runs**

Run: `npm run build`
Expected: succeeds with no TypeScript errors and no unresolved imports.

Run: `npm run dev`, open the printed URL.
Expected: the app renders as before. Confirm in DevTools Network that no request goes to `cdn.tailwindcss.com`, `aistudiocdn.com`, or `fonts.googleapis.com`.

- [ ] **Step 12: Verify the test harness runs**

Run: `npm test`
Expected: exits 0 with "No test files found" — the harness works, tests arrive in Task 2.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "build: replace CDN toolchain with Vite + Tailwind v4 + Vitest

Move source under src/, pin React 19 in package.json only, drop the
importmap and CDN Tailwind, remove the eval-based genai loader, and add
a Vitest harness with fake-indexeddb."
```

---

### Task 2: Domain types and the SRS scheduler

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/srs.ts`
- Create: `src/lib/srs.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Grade = 1 | 2 | 3 | 4`
  - `type MasteryState = 'new' | 'learning' | 'review' | 'lapsed'`
  - `interface SrsState { due: string; interval: number; ease: number; reps: number; lapses: number; state: MasteryState; lastGrade?: Grade; lastReviewed?: string }`
  - `interface Flashcard { id: string; front: string; back: string; term?: string; srs: SrsState }`
  - `interface StudySet` with ISO string dates, `tags`, `archived`, `quizAttempts`
  - `interface AppMeta`
  - `newCardState(now: Date): SrsState`
  - `schedule(state: SrsState, grade: Grade, now: Date): SrsState`
  - `isDue(state: SrsState, now: Date): boolean`
  - Constants `EASE_MIN = 1.3`, `EASE_MAX = 2.8`, `INTERVAL_MAX = 365`

- [ ] **Step 1: Rewrite `src/types.ts`**

```ts
export enum ContentType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
}

export type Grade = 1 | 2 | 3 | 4;

export type MasteryState = 'new' | 'learning' | 'review' | 'lapsed';

export interface SrsState {
  /** ISO 8601 timestamp when this card is next due. */
  due: string;
  /** Days until the next review. 0 means intraday. */
  interval: number;
  /** Difficulty multiplier, clamped to [EASE_MIN, EASE_MAX]. */
  ease: number;
  reps: number;
  lapses: number;
  state: MasteryState;
  lastGrade?: Grade;
  lastReviewed?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  /** Term in the notes this card teaches. Drives the highlighter. */
  term?: string;
  srs: SrsState;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  takenAt: string;
  answers: number[];
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StudySet {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  originalContent: string | null;
  contentType: ContentType;
  chatHistory: ChatMessage[];
  /** Keys into the blobs store, not base64 data. */
  images: string[];
  tags: string[];
  archived: boolean;
}

export interface AppMeta {
  schemaVersion: number;
  theme: 'light' | 'dark' | 'system';
  apiKey: string | null;
  streak: { current: number; longest: number; lastStudiedDay: string | null };
  focus: { totalMs: number; sessions: number; durationMin: number };
}

export type ProcessingStatus =
  | 'idle'
  | 'analyzing'
  | 'generating_flashcards'
  | 'generating_quiz'
  | 'complete'
  | 'error';
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/srs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newCardState, schedule, isDue, EASE_MIN, EASE_MAX, INTERVAL_MAX } from './srs';
import type { SrsState } from '../types';

const NOW = new Date('2026-08-10T12:00:00.000Z');
const DAY = 86_400_000;

const reviewCard = (over: Partial<SrsState> = {}): SrsState => ({
  due: NOW.toISOString(),
  interval: 10,
  ease: 2.5,
  reps: 4,
  lapses: 0,
  state: 'review',
  ...over,
});

describe('newCardState', () => {
  it('starts due immediately with a neutral ease', () => {
    const s = newCardState(NOW);
    expect(s).toMatchObject({ interval: 0, ease: 2.5, reps: 0, lapses: 0, state: 'new' });
    expect(s.due).toBe(NOW.toISOString());
  });
});

describe('schedule — Again (1)', () => {
  it('lapses the card, zeroes the interval, and re-queues it in 10 minutes', () => {
    const next = schedule(reviewCard(), 1, NOW);
    expect(next.state).toBe('lapsed');
    expect(next.interval).toBe(0);
    expect(next.lapses).toBe(1);
    expect(new Date(next.due).getTime()).toBe(NOW.getTime() + 10 * 60_000);
  });

  it('drops ease by 0.20', () => {
    expect(schedule(reviewCard({ ease: 2.5 }), 1, NOW).ease).toBeCloseTo(2.3, 5);
  });

  it('never drops ease below the floor', () => {
    expect(schedule(reviewCard({ ease: 1.35 }), 1, NOW).ease).toBe(EASE_MIN);
  });
});

describe('schedule — Hard (2)', () => {
  it('grows the interval by 1.2 and drops ease by 0.15', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 2, NOW);
    expect(next.interval).toBe(12);
    expect(next.ease).toBeCloseTo(2.35, 5);
  });

  it('gives a new card a one-day interval rather than zero', () => {
    const next = schedule(newCardState(NOW), 2, NOW);
    expect(next.interval).toBe(1);
    expect(next.state).toBe('learning');
  });

  it('returns a lapsed card to learning, not straight to review', () => {
    expect(schedule(reviewCard({ state: 'lapsed', interval: 0 }), 2, NOW).state).toBe('learning');
  });
});

describe('schedule — Good (3)', () => {
  it('multiplies the interval by ease and leaves ease alone', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 3, NOW);
    expect(next.interval).toBe(25);
    expect(next.ease).toBe(2.5);
  });

  it('graduates a new card to review with a one-day interval', () => {
    const next = schedule(newCardState(NOW), 3, NOW);
    expect(next.state).toBe('review');
    expect(next.interval).toBe(1);
    expect(new Date(next.due).getTime()).toBe(NOW.getTime() + DAY);
  });
});

describe('schedule — Easy (4)', () => {
  it('multiplies by ease and 1.3, and raises ease by 0.15', () => {
    const next = schedule(reviewCard({ interval: 10, ease: 2.5 }), 4, NOW);
    expect(next.ease).toBeCloseTo(2.65, 5);
    expect(next.interval).toBe(35); // round(10 * 2.65 * 1.3)
  });

  it('graduates a new card straight to a three-day interval', () => {
    const next = schedule(newCardState(NOW), 4, NOW);
    expect(next.state).toBe('review');
    expect(next.interval).toBe(3);
  });

  it('never raises ease above the ceiling', () => {
    expect(schedule(reviewCard({ ease: 2.75 }), 4, NOW).ease).toBe(EASE_MAX);
  });
});

describe('schedule — invariants', () => {
  it('caps the interval at one year', () => {
    const next = schedule(reviewCard({ interval: 300, ease: 2.5 }), 4, NOW);
    expect(next.interval).toBe(INTERVAL_MAX);
  });

  it('increments reps and records the grade and review time on every grade', () => {
    for (const g of [1, 2, 3, 4] as const) {
      const next = schedule(reviewCard({ reps: 7 }), g, NOW);
      expect(next.reps).toBe(8);
      expect(next.lastGrade).toBe(g);
      expect(next.lastReviewed).toBe(NOW.toISOString());
    }
  });

  it('does not mutate the input state', () => {
    const input = reviewCard();
    const snapshot = JSON.parse(JSON.stringify(input));
    schedule(input, 1, NOW);
    expect(input).toEqual(snapshot);
  });
});

describe('isDue', () => {
  it('is true when the due time has passed', () => {
    expect(isDue(reviewCard({ due: new Date(NOW.getTime() - 1000).toISOString() }), NOW)).toBe(true);
  });

  it('is true at exactly the due time', () => {
    expect(isDue(reviewCard({ due: NOW.toISOString() }), NOW)).toBe(true);
  });

  it('is false when the due time is in the future', () => {
    expect(isDue(reviewCard({ due: new Date(NOW.getTime() + 1000).toISOString() }), NOW)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/srs.test.ts`
Expected: FAIL — `Failed to resolve import "./srs"`.

- [ ] **Step 4: Write `src/lib/srs.ts`**

```ts
import type { Grade, SrsState } from '../types';

export const EASE_MIN = 1.3;
export const EASE_MAX = 2.8;
export const INTERVAL_MAX = 365;
export const EASE_DEFAULT = 2.5;

const MINUTE = 60_000;
const DAY = 86_400_000;
const LAPSE_DELAY = 10 * MINUTE;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function newCardState(now: Date): SrsState {
  return {
    due: now.toISOString(),
    interval: 0,
    ease: EASE_DEFAULT,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

function nextEase(ease: number, grade: Grade): number {
  const delta = grade === 1 ? -0.2 : grade === 2 ? -0.15 : grade === 4 ? 0.15 : 0;
  return clamp(ease + delta, EASE_MIN, EASE_MAX);
}

/** Interval in days. Uses the post-grade ease so Easy compounds correctly. */
function nextInterval(current: number, ease: number, grade: Grade): number {
  if (grade === 1) return 0;
  if (grade === 2) return clamp(Math.max(1, Math.round(current * 1.2)), 0, INTERVAL_MAX);
  if (grade === 3) {
    return clamp(current === 0 ? 1 : Math.round(current * ease), 0, INTERVAL_MAX);
  }
  return clamp(current === 0 ? 3 : Math.round(current * ease * 1.3), 0, INTERVAL_MAX);
}

function nextState(current: SrsState['state'], grade: Grade): SrsState['state'] {
  if (grade === 1) return 'lapsed';
  if (grade === 2) return current === 'new' || current === 'lapsed' ? 'learning' : 'review';
  return 'review';
}

export function schedule(state: SrsState, grade: Grade, now: Date): SrsState {
  const ease = nextEase(state.ease, grade);
  const interval = nextInterval(state.interval, ease, grade);
  const dueAt = interval === 0 ? now.getTime() + LAPSE_DELAY : now.getTime() + interval * DAY;

  return {
    due: new Date(dueAt).toISOString(),
    interval,
    ease,
    reps: state.reps + 1,
    lapses: state.lapses + (grade === 1 ? 1 : 0),
    state: nextState(state.state, grade),
    lastGrade: grade,
    lastReviewed: now.toISOString(),
  };
}

export function isDue(state: SrsState, now: Date): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/srs.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/srs.ts src/lib/srs.test.ts
git commit -m "feat: add SM-2-lite spaced repetition scheduler

Domain types move to ISO string dates and gain SRS, tags, and quiz
attempt fields. schedule() is pure and fully covered."
```

---

### Task 3: Mastery derivation

**Files:**
- Create: `src/lib/mastery.ts`
- Create: `src/lib/mastery.test.ts`

**Interfaces:**
- Consumes: `SrsState`, `Flashcard` from `src/types.ts`; nothing from `srs.ts`.
- Produces:
  - `type Ink = 'none' | 'pink' | 'yellow' | 'green'`
  - `interface MasteryMark { ink: Ink; coverage: number }` where `coverage` is 0–1
  - `cardMastery(state: SrsState): MasteryMark`
  - `setMastery(cards: Flashcard[]): number` — mean coverage, 0–1
  - `MATURE_INTERVAL_DAYS = 21`
  - `inkVar(ink: Ink): string` — CSS custom property reference, or `'transparent'` for `'none'`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/mastery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cardMastery, setMastery, inkVar, MATURE_INTERVAL_DAYS } from './mastery';
import type { Flashcard, SrsState } from '../types';

const state = (over: Partial<SrsState> = {}): SrsState => ({
  due: '2026-08-10T12:00:00.000Z',
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  state: 'new',
  ...over,
});

const card = (over: Partial<SrsState>): Flashcard => ({
  id: 'c', front: 'f', back: 'b', srs: state(over),
});

describe('cardMastery', () => {
  it('leaves a new card unmarked', () => {
    expect(cardMastery(state({ state: 'new' }))).toEqual({ ink: 'none', coverage: 0 });
  });

  it('marks a learning card in pink', () => {
    expect(cardMastery(state({ state: 'learning' }))).toEqual({ ink: 'pink', coverage: 0.33 });
  });

  it('marks a lapsed card in pink, same as learning', () => {
    expect(cardMastery(state({ state: 'lapsed' }))).toEqual({ ink: 'pink', coverage: 0.33 });
  });

  it('marks a young review card in yellow', () => {
    const m = cardMastery(state({ state: 'review', interval: MATURE_INTERVAL_DAYS - 1 }));
    expect(m).toEqual({ ink: 'yellow', coverage: 0.66 });
  });

  it('marks a card in green the day it reaches maturity', () => {
    const m = cardMastery(state({ state: 'review', interval: MATURE_INTERVAL_DAYS }));
    expect(m).toEqual({ ink: 'green', coverage: 1 });
  });
});

describe('setMastery', () => {
  it('returns zero for an empty set rather than NaN', () => {
    expect(setMastery([])).toBe(0);
  });

  it('averages coverage across cards', () => {
    const cards = [
      card({ state: 'new' }),                                             // 0
      card({ state: 'review', interval: MATURE_INTERVAL_DAYS }),          // 1
    ];
    expect(setMastery(cards)).toBeCloseTo(0.5, 5);
  });

  it('reports full mastery when every card is mature', () => {
    const cards = [
      card({ state: 'review', interval: 30 }),
      card({ state: 'review', interval: 90 }),
    ];
    expect(setMastery(cards)).toBe(1);
  });
});

describe('inkVar', () => {
  it('maps each ink to its CSS custom property', () => {
    expect(inkVar('pink')).toBe('var(--pink)');
    expect(inkVar('yellow')).toBe('var(--yellow)');
    expect(inkVar('green')).toBe('var(--green)');
  });

  it('renders an unmarked term as transparent, not as a color', () => {
    expect(inkVar('none')).toBe('transparent');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/mastery.test.ts`
Expected: FAIL — `Failed to resolve import "./mastery"`.

- [ ] **Step 3: Write `src/lib/mastery.ts`**

```ts
import type { Flashcard, SrsState } from '../types';

export type Ink = 'none' | 'pink' | 'yellow' | 'green';

export interface MasteryMark {
  ink: Ink;
  /** 0–1. Drives highlighter stroke length and set-level progress. */
  coverage: number;
}

/** Days of interval at which a card counts as mastered. */
export const MATURE_INTERVAL_DAYS = 21;

const UNMARKED: MasteryMark = { ink: 'none', coverage: 0 };
const LEARNING: MasteryMark = { ink: 'pink', coverage: 0.33 };
const REVIEWING: MasteryMark = { ink: 'yellow', coverage: 0.66 };
const MASTERED: MasteryMark = { ink: 'green', coverage: 1 };

export function cardMastery(srs: SrsState): MasteryMark {
  if (srs.state === 'new') return UNMARKED;
  if (srs.state === 'learning' || srs.state === 'lapsed') return LEARNING;
  return srs.interval >= MATURE_INTERVAL_DAYS ? MASTERED : REVIEWING;
}

export function setMastery(cards: Flashcard[]): number {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, c) => sum + cardMastery(c.srs).coverage, 0);
  return total / cards.length;
}

export function inkVar(ink: Ink): string {
  return ink === 'none' ? 'transparent' : `var(--${ink})`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/mastery.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mastery.ts src/lib/mastery.test.ts
git commit -m "feat: derive highlighter ink and coverage from SRS state"
```

---

### Task 4: IndexedDB repository

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `StudySet`, `AppMeta` from `src/types.ts`.
- Produces:
  - `SCHEMA_VERSION = 1`
  - `DEFAULT_META: AppMeta`
  - `getAllSets(): Promise<StudySet[]>` — newest `updatedAt` first
  - `getSet(id: string): Promise<StudySet | undefined>`
  - `putSet(set: StudySet): Promise<void>`
  - `deleteSet(id: string): Promise<void>` — also deletes the set's blobs
  - `getMeta(): Promise<AppMeta>` — returns `DEFAULT_META` merged over stored values
  - `putMeta(patch: Partial<AppMeta>): Promise<AppMeta>`
  - `putBlob(blob: Blob): Promise<string>` — returns the generated key
  - `getBlob(key: string): Promise<Blob | undefined>`
  - `getBlobUrl(key: string): Promise<string | undefined>` — object URL, caller revokes
  - `resetDb(): Promise<void>` — test and "wipe data" support

- [ ] **Step 1: Write the failing tests**

Create `src/lib/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllSets, getSet, putSet, deleteSet,
  getMeta, putMeta, putBlob, getBlob, resetDb,
  DEFAULT_META, SCHEMA_VERSION,
} from './db';
import { ContentType, type StudySet } from '../types';

const makeSet = (over: Partial<StudySet> = {}): StudySet => ({
  id: 's1',
  title: 'Cellular Respiration',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  summary: '# Cellular Respiration',
  flashcards: [],
  quiz: [],
  quizAttempts: [],
  originalContent: null,
  contentType: ContentType.TEXT,
  chatHistory: [],
  images: [],
  tags: [],
  archived: false,
  ...over,
});

beforeEach(async () => {
  await resetDb();
});

describe('sets', () => {
  it('returns an empty library before anything is stored', async () => {
    expect(await getAllSets()).toEqual([]);
  });

  it('round-trips a set', async () => {
    const set = makeSet();
    await putSet(set);
    expect(await getSet('s1')).toEqual(set);
  });

  it('overwrites a set with the same id rather than duplicating it', async () => {
    await putSet(makeSet());
    await putSet(makeSet({ title: 'Renamed' }));
    const all = await getAllSets();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Renamed');
  });

  it('lists sets newest-updated first', async () => {
    await putSet(makeSet({ id: 'old', updatedAt: '2026-08-01T00:00:00.000Z' }));
    await putSet(makeSet({ id: 'new', updatedAt: '2026-08-09T00:00:00.000Z' }));
    expect((await getAllSets()).map(s => s.id)).toEqual(['new', 'old']);
  });

  it('deletes a set', async () => {
    await putSet(makeSet());
    await deleteSet('s1');
    expect(await getSet('s1')).toBeUndefined();
  });

  it('deletes the set\'s blobs along with it', async () => {
    const key = await putBlob(new Blob(['png bytes']));
    await putSet(makeSet({ images: [key] }));
    await deleteSet('s1');
    expect(await getBlob(key)).toBeUndefined();
  });

  it('resolves rather than throwing when deleting a set that is not there', async () => {
    await expect(deleteSet('missing')).resolves.toBeUndefined();
  });
});

describe('meta', () => {
  it('returns defaults before anything is written', async () => {
    expect(await getMeta()).toEqual({ ...DEFAULT_META, schemaVersion: SCHEMA_VERSION });
  });

  it('merges a patch over existing values instead of replacing them', async () => {
    await putMeta({ theme: 'dark' });
    await putMeta({ apiKey: 'k-123' });
    const meta = await getMeta();
    expect(meta.theme).toBe('dark');
    expect(meta.apiKey).toBe('k-123');
  });

  it('returns the merged result from putMeta', async () => {
    expect((await putMeta({ theme: 'dark' })).theme).toBe('dark');
  });
});

describe('blobs', () => {
  it('round-trips a blob under a generated key', async () => {
    const key = await putBlob(new Blob(['hello'], { type: 'text/plain' }));
    expect(typeof key).toBe('string');
    expect(await (await getBlob(key))!.text()).toBe('hello');
  });

  it('generates a distinct key per blob', async () => {
    const a = await putBlob(new Blob(['a']));
    const b = await putBlob(new Blob(['b']));
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/db.test.ts`
Expected: FAIL — `Failed to resolve import "./db"`.

- [ ] **Step 3: Write `src/lib/db.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppMeta, StudySet } from '../types';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'cocostudy';
const META_KEY = 'app';

interface CocoDB extends DBSchema {
  sets: { key: string; value: StudySet };
  meta: { key: string; value: AppMeta };
  blobs: { key: string; value: Blob };
}

export const DEFAULT_META: AppMeta = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'system',
  apiKey: null,
  streak: { current: 0, longest: 0, lastStudiedDay: null },
  focus: { totalMs: 0, sessions: 0, durationMin: 25 },
};

let dbPromise: Promise<IDBPDatabase<CocoDB>> | null = null;

function db(): Promise<IDBPDatabase<CocoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CocoDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('sets')) {
          database.createObjectStore('sets', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('meta')) {
          database.createObjectStore('meta');
        }
        if (!database.objectStoreNames.contains('blobs')) {
          database.createObjectStore('blobs');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllSets(): Promise<StudySet[]> {
  const all = await (await db()).getAll('sets');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSet(id: string): Promise<StudySet | undefined> {
  return (await db()).get('sets', id);
}

export async function putSet(set: StudySet): Promise<void> {
  await (await db()).put('sets', set);
}

export async function deleteSet(id: string): Promise<void> {
  const database = await db();
  const set = await database.get('sets', id);
  if (set) {
    await Promise.all(set.images.map(key => database.delete('blobs', key)));
  }
  await database.delete('sets', id);
}

export async function getMeta(): Promise<AppMeta> {
  const stored = await (await db()).get('meta', META_KEY);
  return { ...DEFAULT_META, ...stored, schemaVersion: SCHEMA_VERSION };
}

export async function putMeta(patch: Partial<AppMeta>): Promise<AppMeta> {
  const merged = { ...(await getMeta()), ...patch };
  await (await db()).put('meta', merged, META_KEY);
  return merged;
}

export async function putBlob(blob: Blob): Promise<string> {
  const key = `blob-${crypto.randomUUID()}`;
  await (await db()).put('blobs', blob, key);
  return key;
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return (await db()).get('blobs', key);
}

export async function getBlobUrl(key: string): Promise<string | undefined> {
  const blob = await getBlob(key);
  return blob ? URL.createObjectURL(blob) : undefined;
}

/** Clears every store. Backs "wipe all data" in Settings and test isolation. */
export async function resetDb(): Promise<void> {
  const database = await db();
  await Promise.all([
    database.clear('sets'),
    database.clear('meta'),
    database.clear('blobs'),
  ]);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/db.test.ts`
Expected: PASS, 13 tests.

If `crypto.randomUUID` is unavailable in the Node test environment, add `import 'node:crypto'`-free fallback by changing the key line to:
`const key = \`blob-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}-${Date.now()}\`;`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/db.test.ts
git commit -m "feat: add IndexedDB repository for sets, meta, and blobs

Replaces the 5MB localStorage quota that base64 images silently overran."
```

---

### Task 5: Migration from localStorage

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/migrate.ts`
- Create: `src/lib/migrate.test.ts`

**Interfaces:**
- Consumes: `putSet`, `getAllSets`, `putBlob`, `putMeta`, `getMeta` from `db.ts`; `newCardState` from `srs.ts`.
- Produces:
  - `LEGACY_KEY = 'coco_study_sets'`
  - `interface MigrationResult { migrated: number; skipped: boolean; error?: string }`
  - `migrateLegacyData(now: Date): Promise<MigrationResult>`

Behaviour contract, taken from the spec:
1. Reads `localStorage[LEGACY_KEY]`. Absent or empty → `{ migrated: 0, skipped: true }`.
2. IndexedDB already holds sets → `{ migrated: 0, skipped: true }`. Migration is idempotent.
3. Each legacy set gains ISO `createdAt`/`updatedAt`, fresh `newCardState` on every card, `tags: []`, `archived: false`, `quizAttempts: []`, `chatHistory` defaulted to `[]`.
4. Base64 data-URI images become blobs; `images` holds blob keys.
5. The legacy key is never deleted.
6. Any thrown error returns `{ migrated: 0, skipped: false, error }` with nothing written.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/migrate.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateLegacyData, LEGACY_KEY } from './migrate';
import { getAllSets, getBlob, resetDb } from './db';

const NOW = new Date('2026-08-10T12:00:00.000Z');

const legacySet = (over: Record<string, unknown> = {}) => ({
  id: '1700000000000',
  title: 'Photosynthesis',
  createdAt: '2026-07-01T09:30:00.000Z',
  summary: '# Photosynthesis\n\nLight reactions.',
  flashcards: [
    { id: 'card-0', front: 'What is ATP?', back: 'Adenosine triphosphate.' },
    { id: 'card-1', front: 'Where?', back: 'Thylakoid membrane.' },
  ],
  quiz: [{ id: 'q-0', question: 'Q', options: ['a', 'b'], correctAnswerIndex: 0, explanation: 'E' }],
  originalContent: 'raw notes',
  contentType: 'TEXT',
  chatHistory: [{ role: 'user', text: 'hi' }],
  images: [],
  ...over,
});

// 1x1 transparent PNG
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

beforeEach(async () => {
  await resetDb();
  localStorage.clear();
});

describe('migrateLegacyData', () => {
  it('skips when there is nothing to migrate', async () => {
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 0, skipped: true });
  });

  it('skips when the legacy value is an empty array', async () => {
    localStorage.setItem(LEGACY_KEY, '[]');
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 0, skipped: true });
  });

  it('migrates a legacy set into IndexedDB', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 1, skipped: false });

    const [set] = await getAllSets();
    expect(set.id).toBe('1700000000000');
    expect(set.title).toBe('Photosynthesis');
    expect(set.summary).toContain('Photosynthesis');
    expect(set.quiz).toHaveLength(1);
    expect(set.chatHistory).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('seeds every card with fresh new-card scheduling state', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.flashcards).toHaveLength(2);
    for (const card of set.flashcards) {
      expect(card.srs).toMatchObject({ state: 'new', interval: 0, reps: 0, lapses: 0, ease: 2.5 });
      expect(card.srs.due).toBe(NOW.toISOString());
    }
  });

  it('adds the new set fields with safe defaults', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.tags).toEqual([]);
    expect(set.archived).toBe(false);
    expect(set.quizAttempts).toEqual([]);
    expect(set.updatedAt).toBe(NOW.toISOString());
  });

  it('normalises a Date-serialised createdAt to an ISO string', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ createdAt: '2026-07-01T09:30:00.000Z' })]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(typeof set.createdAt).toBe('string');
    expect(set.createdAt).toBe('2026-07-01T09:30:00.000Z');
  });

  it('falls back to now when createdAt is missing or unparseable', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ createdAt: 'not a date' })]));
    await migrateLegacyData(NOW);

    expect((await getAllSets())[0].createdAt).toBe(NOW.toISOString());
  });

  it('moves base64 images into the blob store and stores keys', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ images: [PNG] })]));
    await migrateLegacyData(NOW);

    const [set] = await getAllSets();
    expect(set.images).toHaveLength(1);
    expect(set.images[0]).not.toContain('base64');
    const blob = await getBlob(set.images[0]);
    expect(blob).toBeDefined();
    expect(blob!.type).toBe('image/png');
  });

  it('drops an unreadable image rather than failing the whole migration', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet({ images: ['not-a-data-uri'] })]));
    expect(await migrateLegacyData(NOW)).toEqual({ migrated: 1, skipped: false });
    expect((await getAllSets())[0].images).toEqual([]);
  });

  it('is idempotent — a second run does not duplicate anything', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);
    const second = await migrateLegacyData(NOW);

    expect(second).toEqual({ migrated: 0, skipped: true });
    expect(await getAllSets()).toHaveLength(1);
  });

  it('never deletes the legacy key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([legacySet()]));
    await migrateLegacyData(NOW);
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('reports an error and writes nothing when the payload is corrupt', async () => {
    localStorage.setItem(LEGACY_KEY, '{ not json');
    const result = await migrateLegacyData(NOW);

    expect(result.skipped).toBe(false);
    expect(result.migrated).toBe(0);
    expect(result.error).toBeTruthy();
    expect(await getAllSets()).toEqual([]);
  });
});
```

- [ ] **Step 2: Add a localStorage stub to the test setup**

The Node test environment has no `localStorage`. Replace `src/vitest.setup.ts` with:

```ts
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number) { return [...this.store.keys()][i] ?? null; }
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/migrate.test.ts`
Expected: FAIL — `Failed to resolve import "./migrate"`.

- [ ] **Step 4: Write `src/lib/migrate.ts`**

```ts
import { getAllSets, putBlob, putSet } from './db';
import { newCardState } from './srs';
import { ContentType, type ChatMessage, type Flashcard, type QuizQuestion, type StudySet } from '../types';

export const LEGACY_KEY = 'coco_study_sets';

export interface MigrationResult {
  migrated: number;
  skipped: boolean;
  error?: string;
}

function isoOr(fallback: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback;
}

function dataUriToBlob(uri: string): Blob | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(uri);
  if (!match) return null;
  try {
    const [, mime, b64] = match;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function migrateImages(images: unknown, ): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const keys: string[] = [];
  for (const entry of images) {
    if (typeof entry !== 'string') continue;
    const blob = dataUriToBlob(entry);
    if (!blob) continue;
    keys.push(await putBlob(blob));
  }
  return keys;
}

function migrateCards(cards: unknown, now: Date): Flashcard[] {
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((c): c is { id?: string; front?: string; back?: string } => typeof c === 'object' && c !== null)
    .map((c, i) => ({
      id: typeof c.id === 'string' ? c.id : `card-${i}-${now.getTime()}`,
      front: String(c.front ?? ''),
      back: String(c.back ?? ''),
      srs: newCardState(now),
    }));
}

function migrateQuiz(quiz: unknown, now: Date): QuizQuestion[] {
  if (!Array.isArray(quiz)) return [];
  return quiz
    .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null)
    .map((q, i) => ({
      id: typeof q.id === 'string' ? q.id : `quiz-${i}-${now.getTime()}`,
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswerIndex: Number(q.correctAnswerIndex ?? 0),
      explanation: String(q.explanation ?? ''),
    }));
}

function migrateChat(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m): m is { role?: unknown; text?: unknown } => typeof m === 'object' && m !== null)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: String(m.text ?? ''),
    }));
}

function migrateContentType(value: unknown): ContentType {
  return value === 'AUDIO' ? ContentType.AUDIO
    : value === 'DOCUMENT' ? ContentType.DOCUMENT
    : ContentType.TEXT;
}

/**
 * Copies pre-IndexedDB data forward. Idempotent, and never deletes the
 * legacy localStorage key — it stays as a fallback copy.
 */
export async function migrateLegacyData(now: Date): Promise<MigrationResult> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return { migrated: 0, skipped: true };
  }
  if (!raw) return { migrated: 0, skipped: true };

  if ((await getAllSets()).length > 0) return { migrated: 0, skipped: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { migrated: 0, skipped: true };
    }

    const nowIso = now.toISOString();
    const migrated: StudySet[] = [];

    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const legacy = entry as Record<string, unknown>;

      migrated.push({
        id: typeof legacy.id === 'string' ? legacy.id : `set-${now.getTime()}-${migrated.length}`,
        title: String(legacy.title ?? 'Untitled Note'),
        createdAt: isoOr(nowIso, legacy.createdAt),
        updatedAt: nowIso,
        summary: String(legacy.summary ?? ''),
        flashcards: migrateCards(legacy.flashcards, now),
        quiz: migrateQuiz(legacy.quiz, now),
        quizAttempts: [],
        originalContent: typeof legacy.originalContent === 'string' ? legacy.originalContent : null,
        contentType: migrateContentType(legacy.contentType),
        chatHistory: migrateChat(legacy.chatHistory),
        images: await migrateImages(legacy.images),
        tags: [],
        archived: false,
      });
    }

    for (const set of migrated) await putSet(set);
    return { migrated: migrated.length, skipped: false };
  } catch (e) {
    return { migrated: 0, skipped: false, error: e instanceof Error ? e.message : String(e) };
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/migrate.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS, 55 tests across four files.

- [ ] **Step 7: Commit**

```bash
git add src/lib/migrate.ts src/lib/migrate.test.ts src/vitest.setup.ts
git commit -m "feat: migrate localStorage study sets into IndexedDB

Idempotent, moves base64 images into the blob store, seeds SRS state on
every card, and never deletes the legacy key."
```

---

### Task 6: Content extraction

**Files:**
- Create: `src/lib/extract.ts`
- Create: `src/lib/extract.test.ts`
- Modify: `src/App.tsx` (remove the extraction helpers)

**Interfaces:**
- Consumes: `jszip`, `mammoth`.
- Produces:
  - `type ExtractedInput = { kind: 'text'; text: string } | { kind: 'inline'; data: string; mimeType: string; }`
  - `interface ExtractResult { input: ExtractedInput; contentType: ContentType; originalText: string | null }`
  - `extractFromFile(file: File): Promise<ExtractResult>` — throws `UnsupportedFileError` for unknown types
  - `extractFromText(text: string): ExtractResult`
  - `class UnsupportedFileError extends Error` with a `fileName` property
  - `slideNumber(path: string): number` — exported for testing pptx ordering
  - `fileToBase64(file: Blob): Promise<string>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/extract.test.ts`. The pptx and docx paths need real binaries, so the tests cover the pure ordering logic, the text path, and the dispatch/rejection behaviour — the parts where bugs actually live:

```ts
import { describe, it, expect } from 'vitest';
import { extractFromText, extractFromFile, slideNumber, UnsupportedFileError } from './extract';
import { ContentType } from '../types';

describe('extractFromText', () => {
  it('returns the text as both input and original content', () => {
    const result = extractFromText('some notes');
    expect(result.input).toEqual({ kind: 'text', text: 'some notes' });
    expect(result.originalText).toBe('some notes');
    expect(result.contentType).toBe(ContentType.TEXT);
  });
});

describe('slideNumber', () => {
  it('reads the slide index out of a pptx entry path', () => {
    expect(slideNumber('ppt/slides/slide7.xml')).toBe(7);
  });

  it('orders slide 10 after slide 9, not after slide 1', () => {
    const paths = ['ppt/slides/slide10.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide1.xml'];
    const sorted = [...paths].sort((a, b) => slideNumber(a) - slideNumber(b));
    expect(sorted).toEqual([
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml',
      'ppt/slides/slide10.xml',
    ]);
  });

  it('returns zero for a path with no slide number', () => {
    expect(slideNumber('ppt/slides/notes.xml')).toBe(0);
  });
});

describe('extractFromFile', () => {
  it('rejects an unsupported file type by name', async () => {
    const file = new File(['x'], 'archive.zip', { type: 'application/zip' });
    await expect(extractFromFile(file)).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it('names the offending file in the error', async () => {
    const file = new File(['x'], 'archive.zip', { type: 'application/zip' });
    await expect(extractFromFile(file)).rejects.toMatchObject({ fileName: 'archive.zip' });
  });

  it('routes audio to inline data as an AUDIO set', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'lecture.mp3', { type: 'audio/mpeg' });
    const result = await extractFromFile(file);
    expect(result.contentType).toBe(ContentType.AUDIO);
    expect(result.input.kind).toBe('inline');
    if (result.input.kind === 'inline') expect(result.input.mimeType).toBe('audio/mpeg');
    expect(result.originalText).toBeNull();
  });

  it('routes a PDF to inline data as a DOCUMENT set', async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], 'slides.pdf', { type: 'application/pdf' });
    const result = await extractFromFile(file);
    expect(result.contentType).toBe(ContentType.DOCUMENT);
    if (result.input.kind === 'inline') expect(result.input.mimeType).toBe('application/pdf');
  });

  it('recognises a PDF by extension when the browser reports no MIME type', async () => {
    const file = new File([new Uint8Array([37])], 'slides.pdf', { type: '' });
    await expect(extractFromFile(file)).resolves.toMatchObject({ contentType: ContentType.DOCUMENT });
  });
});
```

- [ ] **Step 2: Switch the test environment so `File` and `Blob` exist**

Node 24 provides `File`, `Blob`, and `FileReader` is not needed if `extract.ts` uses `Blob.arrayBuffer()`. Keep `environment: 'node'` and implement `fileToBase64` on `arrayBuffer()` rather than `FileReader`, which is a DOM-only API.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/extract.test.ts`
Expected: FAIL — `Failed to resolve import "./extract"`.

- [ ] **Step 4: Write `src/lib/extract.ts`**

```ts
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { ContentType } from '../types';

export type ExtractedInput =
  | { kind: 'text'; text: string }
  | { kind: 'inline'; data: string; mimeType: string };

export interface ExtractResult {
  input: ExtractedInput;
  contentType: ContentType;
  /** Plain text for the tutor's context, when the format yields any. */
  originalText: string | null;
}

export class UnsupportedFileError extends Error {
  constructor(public readonly fileName: string) {
    super(`CocoStudy can't read ${fileName}. Try a PDF, Word, PowerPoint, or audio file.`);
    this.name = 'UnsupportedFileError';
  }
}

const BASE64_CHUNK = 0x8000;

/** Base64-encodes a Blob without FileReader, so this module runs under Node. */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function slideNumber(path: string): number {
  const match = /slide(\d+)\.xml$/.exec(path);
  return match ? Number(match[1]) : 0;
}

export function extractFromText(text: string): ExtractResult {
  return {
    input: { kind: 'text', text },
    contentType: ContentType.TEXT,
    originalText: text,
  };
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPptx(file: File): Promise<string> {
  const zip = await new JSZip().loadAsync(file);
  const slides = Object.keys(zip.files)
    .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const parser = new DOMParser();
  let out = '';

  for (const path of slides) {
    const xml = await zip.files[path].async('string');
    const doc = parser.parseFromString(xml, 'text/xml');
    const nodes = doc.getElementsByTagName('a:t');
    let text = '';
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent) text += `${nodes[i].textContent} `;
    }
    if (text.trim()) out += `[Slide ${slideNumber(path)}]\n${text.trim()}\n\n`;
  }

  return out.trim() || 'No text found in slides.';
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return {
      input: { kind: 'inline', data: await fileToBase64(file), mimeType: type },
      contentType: ContentType.AUDIO,
      originalText: null,
    };
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      input: { kind: 'inline', data: await fileToBase64(file), mimeType: 'application/pdf' },
      contentType: ContentType.DOCUMENT,
      originalText: null,
    };
  }

  if (name.endsWith('.docx')) {
    const text = await extractDocx(file);
    return { input: { kind: 'text', text }, contentType: ContentType.DOCUMENT, originalText: text };
  }

  if (name.endsWith('.pptx')) {
    const text = await extractPptx(file);
    return { input: { kind: 'text', text }, contentType: ContentType.DOCUMENT, originalText: text };
  }

  throw new UnsupportedFileError(file.name);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/extract.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Delete the extraction helpers from `src/App.tsx`**

Remove `extractTextFromDocx`, `extractTextFromPptx`, and `fileToBase64`, along with the `mammoth` and `JSZip` imports and their `@ts-ignore` comments. `handleProcess` is rewritten in Task 8; leave it calling the removed helpers for now only if the build still passes — otherwise inline `extractFromFile` immediately.

- [ ] **Step 7: Commit**

```bash
git add src/lib/extract.ts src/lib/extract.test.ts src/App.tsx
git commit -m "feat: extract document parsing into a tested lib module

Fixes pptx slide ordering past slide 10 and replaces the FileReader
base64 path with an arrayBuffer one that runs outside a browser."
```

---

### Task 7: AI service and prompts

**Files:**
- Create: `src/services/prompts.ts`
- Create: `src/services/ai.ts`
- Delete: `src/services/geminiService.ts`

**Interfaces:**
- Consumes: `ExtractedInput` from `lib/extract.ts`; `getMeta` from `lib/db.ts`.
- Produces:
  - `class MissingApiKeyError extends Error`
  - `class AiError extends Error` with `kind: 'invalid-key' | 'rate-limit' | 'network' | 'unknown'`
  - `setApiKey(key: string | null): void` — resets the cached client
  - `generateSummary(input: ExtractedInput): Promise<string>`
  - `generateFlashcards(summary: string): Promise<Flashcard[]>` — cards arrive with `srs: newCardState(new Date())` already applied and a `term` field when the model supplies one
  - `generateQuiz(summary: string): Promise<QuizQuestion[]>`
  - `chatWithContext(message, context, history): Promise<string>`
  - `generateStudyImage(topic: string): Promise<Blob | null>` — a Blob, not a data URI

- [ ] **Step 1: Write `src/services/prompts.ts`**

Move the four prompt strings out of `geminiService.ts` verbatim, with one change: the flashcard prompt now asks for a `term`.

```ts
export const SUMMARY_PROMPT = `
You are an expert academic editor and professional curriculum writer. Given any input (text, lecture transcript, audio, slides or documents), produce an authoritative, concise, and highly-organized study guide in strict Markdown format.

REQUIREMENTS (MUST FOLLOW EXACTLY):

1) Top-level title (H1) — descriptive and professional (no emojis here).
2) One-sentence TL;DR (single line, <= 20 words).
3) Executive summary (1 short paragraph — 2–4 sentences) that explains what the content covers and why it matters.
4) Learning objectives (bullet list of 3–5 measurable objectives; each starts with a verb such as "Explain", "Identify", "Apply").
5) Structured outline (H2) — short table-of-contents style bullets linking to the sections you will cover.
6) Detailed notes (H2) with clear H3 subsections. Follow this pattern for each major section:
   - H3 subsection title
   - Short explanatory paragraph (1–3 sentences)
   - Key points (1–6 bullets) with bolded terms and short supporting sentences
   - If applicable, include an example, formula (in a fenced code block), or a short step-by-step process.
7) Glossary (H2) — 6–10 key terms, each formatted as **Term** — short concise definition (one line).
8) Study plan (H2) — 2–3 short sessions with time estimates and focus areas.
9) Practice questions (H2) — 5 questions total: 3 conceptual, 1 applied, 1 challenge. After the questions, include an **Answers** section with succinct answers.
10) Key takeaways (H2) — 3–6 short, memorable lines.

FORMAT RULES (MANDATORY):
- Output only the study guide in valid Markdown. No commentary outside the requested sections.
- Use consistent heading hierarchy and spacing. Keep tone professional and clear.
- Keep the executive summary and TL;DR short and sharp.
- Avoid producing more than ~1200 words total.
`;

export const flashcardPrompt = (summary: string) => `
Based on the following notes, create 8-12 high-quality flashcards for studying.
Return a JSON array where each object has "front", "back", and "term" properties.
Keep the front concise (question/term) and the back informative (answer/definition).
"term" must be the exact key phrase from the notes that this card teaches, copied
verbatim from the notes so it can be located in the text. If no single phrase fits,
use an empty string.

Notes:
${summary.substring(0, 10000)}
`;

export const quizPrompt = (summary: string) => `
Based on the following notes, create a multiple-choice quiz with 5 challenging questions.
Return a JSON array.

Notes:
${summary.substring(0, 10000)}
`;

export const tutorSystemInstruction = (context: string) => `You are a dedicated and focused AI study assistant.
Your sole purpose is to help the student master the material in the provided notes.

STRICT GUIDELINES:
1. ONLY answer questions related to the provided study notes, academic concepts, or learning strategies.
2. If the user asks about unrelated topics, politely refuse: "I am focused on helping you study. Let's get back to the notes."
3. Be concise, encouraging, and clear.
4. Use formatting (bold, bullet points) to make explanations easy to read.

STUDY NOTES CONTEXT:
${context}`;

export const imagePrompt = (topic: string) => `Create a clean, aesthetic, educational illustration that clearly explains the concept of: ${topic}

STYLE REQUIREMENTS:
- Minimalist vector-art look
- Flat-design shapes and smooth edges
- Balanced composition with clean spacing
- Modern, academic, student-friendly aesthetic

CONTENT REQUIREMENTS:
- Present the core idea of ${topic} visually and accurately
- Use simple shapes, icons, labels, or annotation-style callouts
- Keep all text minimal, clear, and easy to read
- Avoid clutter and maintain strong contrast and visual hierarchy

OUTPUT: one single illustration, vector-style clarity, no unrelated objects.`;
```

- [ ] **Step 2: Write `src/services/ai.ts`**

```ts
import { GoogleGenAI } from '@google/genai';
import { newCardState } from '../lib/srs';
import { getMeta } from '../lib/db';
import type { ExtractedInput } from '../lib/extract';
import type { ChatMessage, Flashcard, QuizQuestion } from '../types';
import {
  SUMMARY_PROMPT, flashcardPrompt, quizPrompt, tutorSystemInstruction, imagePrompt,
} from './prompts';

const MODEL = 'gemini-2.5-flash';

export class MissingApiKeyError extends Error {
  constructor() {
    super('Add your Gemini API key in Settings to generate study sets.');
    this.name = 'MissingApiKeyError';
  }
}

export type AiErrorKind = 'invalid-key' | 'rate-limit' | 'network' | 'unknown';

export class AiError extends Error {
  constructor(public readonly kind: AiErrorKind, message: string) {
    super(message);
    this.name = 'AiError';
  }
}

let client: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/** Called by useSettings whenever the stored key changes. */
export function setApiKey(key: string | null): void {
  cachedKey = key;
  client = null;
}

async function resolveKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const meta = await getMeta();
  const key = meta.apiKey ?? import.meta.env.VITE_GEMINI_API_KEY ?? null;
  if (!key) throw new MissingApiKeyError();
  cachedKey = key;
  return key;
}

async function ai(): Promise<GoogleGenAI> {
  const key = await resolveKey();
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

function toAiError(e: unknown): AiError {
  const message = e instanceof Error ? e.message : String(e);
  const lower = message.toLowerCase();
  if (lower.includes('api key') || lower.includes('permission') || lower.includes('401') || lower.includes('403')) {
    client = null;
    cachedKey = null;
    return new AiError('invalid-key', 'That Gemini API key was rejected. Check it in Settings.');
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate')) {
    return new AiError('rate-limit', 'Gemini is rate-limiting this key. Wait a minute and try again.');
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('offline')) {
    return new AiError('network', 'Could not reach Gemini. Check your connection.');
  }
  return new AiError('unknown', message);
}

export async function generateSummary(input: ExtractedInput): Promise<string> {
  try {
    const parts = input.kind === 'text'
      ? [{ text: input.text }, { text: SUMMARY_PROMPT }]
      : [{ inlineData: { data: input.data, mimeType: input.mimeType } }, { text: SUMMARY_PROMPT }];

    const response = await (await ai()).models.generateContent({ model: MODEL, contents: { parts } });
    const text = response.text?.trim();
    if (!text) throw new AiError('unknown', 'Gemini returned an empty study guide.');
    return text;
  } catch (e) {
    throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
  }
}

export async function generateFlashcards(summary: string): Promise<Flashcard[]> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: flashcardPrompt(summary),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              term: { type: 'string' },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    if (!response.text) return [];
    const now = new Date();
    const parsed = JSON.parse(response.text) as { front: string; back: string; term?: string }[];

    return parsed.map((card, i) => ({
      id: `card-${i}-${now.getTime()}`,
      front: card.front,
      back: card.back,
      term: card.term?.trim() || undefined,
      srs: newCardState(now),
    }));
  } catch (e) {
    throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
  }
}

export async function generateQuiz(summary: string): Promise<QuizQuestion[]> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: quizPrompt(summary),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswerIndex: { type: 'integer' },
              explanation: { type: 'string' },
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
          },
        },
      },
    });

    if (!response.text) return [];
    const now = Date.now();
    const parsed = JSON.parse(response.text) as Omit<QuizQuestion, 'id'>[];
    return parsed.map((q, i) => ({ ...q, id: `quiz-${i}-${now}` }));
  } catch (e) {
    throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
  }
}

export async function chatWithContext(
  message: string,
  context: string,
  history: ChatMessage[],
): Promise<string> {
  try {
    const chat = (await ai()).chats.create({
      model: MODEL,
      config: { systemInstruction: tutorSystemInstruction(context) },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    });
    const result = await chat.sendMessage({ message });
    return result.text ?? "I couldn't generate a response.";
  } catch (e) {
    throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
  }
}

export async function generateStudyImage(topic: string): Promise<Blob | null> {
  try {
    const response = await (await ai()).models.generateContent({
      model: MODEL,
      contents: { parts: [{ text: imagePrompt(topic) }] },
      config: { imageConfig: { aspectRatio: '16:9' } },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const binary = atob(part.inlineData.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: part.inlineData.mimeType ?? 'image/png' });
      }
    }
    return null;
  } catch (e) {
    throw e instanceof AiError || e instanceof MissingApiKeyError ? e : toAiError(e);
  }
}
```

- [ ] **Step 3: Delete the old service**

```bash
git rm src/services/geminiService.ts
```

- [ ] **Step 4: Add the env type declaration**

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: errors only in `src/App.tsx` and `src/components/*` where they still import `geminiService`. Task 8 fixes those.

- [ ] **Step 6: Commit**

```bash
git add src/services src/vite-env.d.ts
git commit -m "feat: typed AI service with real key resolution and error kinds

Prompts move to their own module. Errors distinguish missing key,
invalid key, rate limit, and network. Images return Blobs, not data URIs.
Flashcards ask for a term so they can join the highlighter system."
```

---

### Task 8: Wire the app to the new foundation

**Files:**
- Create: `src/store/useSettings.ts`
- Create: `src/store/useStudySets.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/StudySession.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–7.
- Produces:
  - `useSettings(): { meta: AppMeta | null; update(patch: Partial<AppMeta>): Promise<void> }`
  - `useStudySets(): { sets, loading, error, status, createFromFile, createFromText, updateSet, removeSet, clearError }`

- [ ] **Step 1: Write `src/store/useSettings.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { getMeta, putMeta } from '../lib/db';
import { setApiKey } from '../services/ai';
import type { AppMeta } from '../types';

export function useSettings() {
  const [meta, setMeta] = useState<AppMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeta().then(m => {
      if (cancelled) return;
      setMeta(m);
      setApiKey(m.apiKey);
    });
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (patch: Partial<AppMeta>) => {
    const next = await putMeta(patch);
    setMeta(next);
    if ('apiKey' in patch) setApiKey(next.apiKey);
  }, []);

  return { meta, update };
}
```

- [ ] **Step 2: Write `src/store/useStudySets.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { deleteSet, getAllSets, putSet } from '../lib/db';
import { migrateLegacyData } from '../lib/migrate';
import { extractFromFile, extractFromText, type ExtractResult } from '../lib/extract';
import { generateFlashcards, generateQuiz, generateSummary } from '../services/ai';
import type { ProcessingStatus, StudySet } from '../types';

function titleFrom(markdown: string): string {
  return /^# (.*)$/m.exec(markdown)?.[1]?.trim() || 'Study Note';
}

export function useStudySets() {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await migrateLegacyData(new Date());
      if (result.error) setError(`Could not import your old notes: ${result.error}`);
      setSets(await getAllSets());
      setLoading(false);
    })();
  }, []);

  const create = useCallback(async (extracted: ExtractResult): Promise<StudySet | null> => {
    setError(null);
    setStatus('analyzing');
    try {
      const summary = await generateSummary(extracted.input);

      setStatus('generating_flashcards');
      const flashcards = await generateFlashcards(summary);

      setStatus('generating_quiz');
      const quiz = await generateQuiz(summary);

      const now = new Date().toISOString();
      const set: StudySet = {
        id: `set-${Date.now()}`,
        title: titleFrom(summary),
        createdAt: now,
        updatedAt: now,
        summary,
        flashcards,
        quiz,
        quizAttempts: [],
        originalContent: extracted.originalText,
        contentType: extracted.contentType,
        chatHistory: [],
        images: [],
        tags: [],
        archived: false,
      };

      await putSet(set);
      setSets(await getAllSets());
      setStatus('complete');
      return set;
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Something went wrong generating this set.');
      return null;
    }
  }, []);

  const createFromFile = useCallback(async (file: File) => {
    try {
      return await create(await extractFromFile(file));
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not read that file.');
      return null;
    }
  }, [create]);

  const createFromText = useCallback(
    (text: string) => create(extractFromText(text)),
    [create],
  );

  const updateSet = useCallback(async (set: StudySet) => {
    const next = { ...set, updatedAt: new Date().toISOString() };
    await putSet(next);
    setSets(current => current.map(s => (s.id === next.id ? next : s)));
  }, []);

  const removeSet = useCallback(async (id: string) => {
    await deleteSet(id);
    setSets(current => current.filter(s => s.id !== id));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { sets, loading, status, error, createFromFile, createFromText, updateSet, removeSet, clearError };
}
```

- [ ] **Step 3: Rewrite `src/App.tsx` as a shell**

```tsx
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import UploadArea from './components/UploadArea';
import StudySession from './components/StudySession';
import { useStudySets } from './store/useStudySets';
import { Menu } from 'lucide-react';

export default function App() {
  const { sets, status, error, createFromFile, createFromText, updateSet, clearError } = useStudySets();
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeSet = sets.find(s => s.id === activeSetId) ?? null;

  const handleProcess = async (content: string | File) => {
    const created = content instanceof File
      ? await createFromFile(content)
      : await createFromText(content);
    if (created) setActiveSetId(created.id);
  };

  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          savedSets={sets}
          activeSetId={activeSetId}
          onSelectSet={id => { setActiveSetId(id); setIsSidebarOpen(false); }}
          onNewSet={() => { setActiveSetId(null); setIsSidebarOpen(false); }}
        />
      </div>

      <main className="flex-1 flex flex-col h-full relative w-full bg-background">
        {error && (
          <div className="mx-6 mt-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={clearError} className="font-semibold underline">Dismiss</button>
          </div>
        )}

        {!activeSet ? (
          <div className="flex-1 h-full overflow-hidden relative">
            <button
              className="md:hidden absolute top-6 left-6 p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 z-20"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open library"
            >
              <Menu size={24} />
            </button>
            <UploadArea onProcess={handleProcess} status={status} />
          </div>
        ) : (
          <StudySession set={activeSet} onBack={() => setActiveSetId(null)} onUpdateSet={updateSet} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Update `UploadArea`'s prop type**

In `src/components/UploadArea.tsx`, change the interface and drop the now-unused type argument:

```ts
interface UploadAreaProps {
  onProcess: (content: string | File) => void;
  status: ProcessingStatus;
}
```

Update the three call sites — `onProcess(file, 'audio')`, `onProcess(file, 'document')`, and `onProcess(textInput, 'text')` — to drop their second argument. Replace the `alert(...)` in `processFile` with a local error state rendered under the drop zone:

```tsx
const [fileError, setFileError] = useState<string | null>(null);
```

Set it instead of calling `alert`, clear it at the top of `processFile`, and render it beneath the drop zone as `{fileError && <p className="mt-4 text-sm text-red-600">{fileError}</p>}`.

- [ ] **Step 5: Update `StudySession` for the new shapes**

In `src/components/StudySession.tsx`:
- Change the import to `import { chatWithContext, generateStudyImage } from '../services/ai';`
- `chatWithContext` now takes `ChatMessage[]` directly; delete the `historyForApi` mapping and pass `newHistory`.
- `generateStudyImage` now returns a `Blob`. Replace the handler body:

```tsx
const handleGenerateImage = async () => {
  if (isGeneratingImage) return;
  setIsGeneratingImage(true);
  try {
    const blob = await generateStudyImage(set.title);
    if (!blob) { setImageError('Gemini did not return an image. Try again.'); return; }
    const key = await putBlob(blob);
    onUpdateSet({ ...set, images: [...set.images, key] });
  } catch (e) {
    setImageError(e instanceof Error ? e.message : 'Could not generate a visual.');
  } finally {
    setIsGeneratingImage(false);
  }
};
```

Add `import { putBlob, getBlobUrl } from '../lib/db';` and a `const [imageError, setImageError] = useState<string | null>(null);`. Replace both `alert()` calls with `setImageError`.

- Images are now blob keys, so resolve them to object URLs:

```tsx
const [imageUrls, setImageUrls] = useState<string[]>([]);

useEffect(() => {
  let revoked: string[] = [];
  Promise.all(set.images.map(getBlobUrl)).then(urls => {
    revoked = urls.filter((u): u is string => Boolean(u));
    setImageUrls(revoked);
  });
  return () => { revoked.forEach(URL.revokeObjectURL); };
}, [set.images]);
```

Render `imageUrls` instead of `set.images` in the gallery.

- `set.createdAt` is already a string; `new Date(set.createdAt).toLocaleDateString()` still works unchanged.

- [ ] **Step 6: Update `Sidebar` for ISO dates**

`src/components/Sidebar.tsx` line 93 already wraps `set.createdAt` in `new Date(...)`, which works with an ISO string. No change needed — verify it compiles.

- [ ] **Step 7: Verify the build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS, 55 tests.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Verify by hand in the browser**

Run: `npm run dev`

1. If you have existing sets from the old build, they appear in the sidebar. Open DevTools → Application → IndexedDB → `cocostudy` → `sets` and confirm they are there, and that `localStorage['coco_study_sets']` still exists.
2. Reload. The library still shows the same sets and the count has not doubled.
3. With no API key configured, paste text and submit. Expect the inline error "Add your Gemini API key in Settings to generate study sets." — not an `alert`, and not a hang.
4. Add `VITE_GEMINI_API_KEY=...` to `.env`, restart, and generate a set from pasted text. Notes, flashcards, and quiz all populate.
5. Drop a `.zip`. Expect the inline unsupported-file message under the drop zone.
6. Network tab shows zero requests to `cdn.tailwindcss.com`, `aistudiocdn.com`, or `fonts.googleapis.com`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: wire the app to IndexedDB, the AI service, and the SRS foundation

App.tsx drops to a shell. All alert() calls become inline errors. Images
persist as blobs. Legacy localStorage data migrates on first load."
```

---

## Self-Review

**Spec coverage for P0.** The spec's P0 row reads: "Toolchain: Tailwind v4 build, GSAP and `@google/genai` as real dependencies, React 19 aligned, `lib/` split, IndexedDB layer, migration, Vitest." Task 1 covers the toolchain, React 19, and Vitest, and installs GSAP so P1 can use it without another install step. Tasks 2–6 cover the `lib/` split. Tasks 4–5 cover IndexedDB and migration. Task 7 covers `@google/genai` as a real dependency. Task 8 covers removing `alert` and the `Date` type confusion.

**Deferred to later phases, by design.** `lib/motion.ts` and `lib/markdown.ts` are listed in the spec's file structure but belong to P1 and P2 respectively — neither has a consumer in P0, and writing them now would be untestable scaffolding. `store/useReviewQueue.ts` and `store/useFocus.ts` belong to P3 and P5. Self-hosted fonts land in P1 with the design system that uses them; P0 ships no font loading at all rather than a CDN one.

**Type consistency.** `newCardState` is used identically in `srs.ts`, `migrate.ts`, and `ai.ts`. `ExtractResult` is produced by `extract.ts` and consumed by `useStudySets.ts` with matching field names (`input`, `contentType`, `originalText`). `getBlobUrl` and `putBlob` are defined in Task 4 and consumed in Task 8. `ChatMessage[]` is the history type in both `types.ts` and `ai.ts`; the old `{ role, parts }` mapping is deleted.

**Known follow-on.** `UploadArea` and `StudySession` keep their old visual design through P0 and are replaced wholesale in P1, at which point the compat block in `index.css` is deleted.
