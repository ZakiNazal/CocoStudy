# CocoStudy — "Marked Up" Redesign

**Date:** 2026-08-10
**Status:** Approved
**Branch:** `redesign/marked-up`

## Summary

Rebuild CocoStudy as a spaced-repetition study system with a new visual identity in
which color encodes recall data. Replace the CDN-and-importmap toolchain with a real
Vite + Tailwind v4 + GSAP build, move storage from `localStorage` to IndexedDB, and
add four feature areas: spaced repetition with progress, library management, focus
sessions, and deeper AI tools.

The app stays local-only and account-free. The user supplies their own Gemini key.

## Goals

1. A visual identity that could not be mistaken for a generic AI-built study app, in
   which the palette does real work rather than decorating.
2. Turn flashcards from a carousel into a scheduling system that tells the user what
   to study today.
3. A motion system with one source of truth for timing, one orchestrated signature
   moment, and full `prefers-reduced-motion` support.
4. A toolchain with one source of truth per dependency.

## Non-goals

- Accounts, cloud sync, or any backend. Storage is on-device.
- Server-side proxying of the AI key.
- URL routing per set or tab. View state stays in React.
- Collaboration, sharing, or multi-device features.

---

## 1. Design direction: MARKED UP

The interface is a page the user marks up as they learn. A term never seen is bare
graphite; one being learned is struck in pink; one in review is yellow; one mastered
is green. The user can read their own mastery off the page before reading a word of it.

This is the reason the palette exists. Ink is data, not decoration.

### Color tokens

Light theme:

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#EEEDE8` | Ground. Cool bone/newsprint, not cream. |
| `--paper-2` | `#F7F6F2` | Raised surfaces, cards, sheets. |
| `--paper-3` | `#E3E1DA` | Sunken wells, inputs, rules. |
| `--ink` | `#16151A` | Primary text, graphite. |
| `--ink-2` | `#56545C` | Secondary text. |
| `--ink-3` | `#8B8A85` | Tertiary text, disabled, hairlines. |
| `--pink` | `#FF5FA2` | Mastery: learning / lapsed. |
| `--yellow` | `#F5E663` | Mastery: reviewing. |
| `--green` | `#9BEE5C` | Mastery: mastered. |
| `--cyan` | `#43D9E8` | AI and system moments. |
| `--red` | `#E5484D` | Destructive actions, wrong answers. |

Dark theme inverts ground and ink (`--paper` → `#0F0E12`, `--paper-2` → `#1A1920`,
`--ink` → `#EDECE7`) and raises the four highlighter inks in luminance. They are
fluorescent markers; they survive the flip. Both themes are defined as complete token
sets on `:root` and `[data-theme]`, never as partial overrides.

Every mastery ink must pass 4.5:1 against its ground when used as a text color. When
used as a highlighter stroke, `--ink` sits on top of it and must clear 4.5:1 against
the stroke fill.

### Typography

| Role | Face | Notes |
| --- | --- | --- |
| Display | Bricolage Grotesque | Variable `wdth` and `opsz`. Headlines widen and tighten as they scale. |
| Body | Source Serif 4 | Study notes are long-form reading. |
| Utility | Martian Mono | Counters, timers, due counts, keyboard hints, labels. |

Self-hosted as woff2 in `public/fonts`, declared with `font-display: swap`. No
Google Fonts network dependency.

Type scale (rem): 0.6875 / 0.8125 / 0.9375 / 1 / 1.25 / 1.625 / 2.25 / 3.25 / 4.5.

### Shape and structure

The current `rounded-[2.5rem]` squircles and glassmorphism are removed entirely.
A marked-up page has edges: 4px radii, hairline rules at `--ink-3`, ruled baselines,
and a persistent left margin rule on the notes surface. Elevation is expressed through
paper tone and hairlines rather than blur or large soft shadows.

Structural devices encode real content. Numbered markers appear only on quiz questions,
where order is real. Due counts, intervals, and mastery percentages are set in Martian
Mono because they are data.

### Signature element

**The mastery highlighter.** Every heading and glossary term in the notes carries an
SVG highlighter stroke. The stroke's ink comes from the mastery state of the cards that
reference that term; its coverage comes from how far through the interval ladder those
cards have climbed. Grading a card animates the corresponding stroke in the notes.

This is the one place boldness is spent. Everything around it stays quiet.

---

## 2. Architecture

```
src/
  main.tsx
  App.tsx                      shell, ~50 lines
  index.css                    Tailwind v4 @theme tokens
  lib/
    db.ts                      IndexedDB repository + migrations
    srs.ts                     SM-2-lite scheduler (pure)
    mastery.ts                 card state -> ink + coverage (pure)
    motion.ts                  GSAP registration, DUR/EASE, matchMedia
    extract.ts                 docx/pptx/pdf/audio -> text or inline data
    markdown.ts                markdown -> renderable nodes + term index
  services/
    ai.ts                      typed Gemini client
    prompts.ts                 prompt strings, isolated from transport
  store/
    useStudySets.ts            CRUD + persistence
    useReviewQueue.ts          cross-set due queue
    useFocus.ts                timer + focus overlay state
    useSettings.ts             theme, API key, preferences
  components/
    shell/    AppShell Sidebar TopBar CommandPalette ThemeToggle
    intake/   Intake DropZone Recorder Ritual
    notes/    NotesView MarkdownView Highlightable Marginalia SelectionMenu
    cards/    ReviewSession Card GradeBar DeckProgress
    quiz/     QuizView QuestionCard ResultsSheet
    tutor/    TutorView MessageList Composer
    focus/    FocusTimer FocusOverlay StudyRun
    ui/       Button Sheet Tabs Toast Empty Skeleton Field Menu
```

Each `lib/` module is pure and independently testable. `srs.ts` and `mastery.ts` take
data and return data; they touch no React and no storage. `db.ts` is the only module
that talks to IndexedDB. `services/ai.ts` is the only module that makes network calls.

`App.tsx` currently holds 240 lines mixing routing, file parsing, base64 conversion,
AI orchestration, and layout. Document extraction moves to `lib/extract.ts`, AI
orchestration moves to `store/useStudySets.ts`, and what remains is the shell.

### Toolchain changes

| Concern | Today | After |
| --- | --- | --- |
| React | 18 in `package.json`, 19 via importmap | 19, `package.json` only |
| Tailwind | `cdn.tailwindcss.com` + inline config | `@tailwindcss/vite`, tokens in `index.css` |
| GSAP | absent | npm dependency, `@gsap/react` for `useGSAP` |
| `@google/genai` | `eval("import(...)")`, externalized in Rollup | real typed dependency, bundled |
| Fonts | Google Fonts CDN | self-hosted woff2 |
| Types | `types/google-genai.d.ts` shim | removed, real types |

`index.html` drops the importmap, the Tailwind CDN script, the inline config, and the
inline `<style>` block. `vite.config.ts` drops `optimizeDeps.exclude`,
`rollupOptions.external`, and the `process.env.API_KEY` define.

---

## 3. Data model

```ts
type MasteryState = 'new' | 'learning' | 'review' | 'lapsed';

interface SrsState {
  due: string;          // ISO date
  interval: number;     // days; 0 means intraday
  ease: number;         // 1.3 .. 2.8
  reps: number;
  lapses: number;
  state: MasteryState;
  lastGrade?: Grade;
  lastReviewed?: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  term?: string;        // links the card to a term in the notes
  srs: SrsState;
}

interface QuizAttempt {
  id: string;
  takenAt: string;
  answers: number[];
  score: number;
}

interface StudySet {
  id: string;
  title: string;
  createdAt: string;    // ISO, not Date — survives serialization
  updatedAt: string;
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  originalContent: string | null;
  contentType: ContentType;
  chatHistory: ChatMessage[];
  images: string[];     // blob keys, not base64
  tags: string[];
  archived: boolean;
}

interface AppMeta {
  schemaVersion: number;
  theme: 'light' | 'dark' | 'system';
  apiKey: string | null;
  streak: { current: number; longest: number; lastStudiedDay: string | null };
  focus: { totalMs: number; sessions: number; durationMin: number };
}
```

`createdAt` becomes an ISO string. The current reviver that rehydrates it into a `Date`
is a persistent source of type confusion; dates are formatted at the render boundary.

### Storage

IndexedDB via a thin wrapper in `db.ts`. Three object stores: `sets`, `meta`, `blobs`.
Images and recorded audio go to `blobs` as `Blob` values and are referenced by key,
rather than being inlined as base64 into the set. This is the specific reason for
leaving `localStorage`: base64 images in a 5MB quota fail silently and irreversibly.

### Migration

On first load, `db.ts` checks for `localStorage['coco_study_sets']`. If present and
IndexedDB is empty, it reads each set, converts `createdAt` to ISO, seeds every card
with a fresh `SrsState` (`state: 'new'`, `due: today`, `interval: 0`, `ease: 2.5`),
moves base64 images into the `blobs` store, fills in `tags: []`, `archived: false`,
`quizAttempts: []`, writes the result, and stamps `schemaVersion`. The `localStorage`
key is left in place as a fallback and is not deleted. Migration failure surfaces a
toast and leaves the old data untouched.

---

## 4. Spaced repetition

`srs.ts` implements SM-2-lite as a pure function
`schedule(state: SrsState, grade: Grade, now: Date): SrsState`.

| Grade | Key | Effect |
| --- | --- | --- |
| Again | `1` | `state = 'lapsed'`, `interval = 0` (due in 10 min), `ease -= 0.20`, `lapses += 1` |
| Hard | `2` | `interval = max(1, interval * 1.2)`, `ease -= 0.15` |
| Good | `3` | `interval = interval === 0 ? 1 : interval * ease`, `ease` unchanged |
| Easy | `4` | `interval = (interval === 0 ? 3 : interval * ease * 1.3)`, `ease += 0.15` |

`ease` clamps to `[1.3, 2.8]`. `interval` clamps to `[0, 365]`. New cards graduate from
`learning` to `review` on their first Good or Easy. Intraday cards (`interval === 0`)
are re-queued within the same session.

`mastery.ts` derives presentation from that state:

| Condition | Ink | Coverage |
| --- | --- | --- |
| `state === 'new'` | none | 0% |
| `state === 'learning' \|\| 'lapsed'` | `--pink` | 33% |
| `state === 'review' && interval < 21` | `--yellow` | 66% |
| `state === 'review' && interval >= 21` | `--green` | 100% |

Set-level mastery is the mean coverage across the set's cards. This single number
drives the sidebar bar, the top-bar percentage, and the length of every highlighter
stroke in the notes.

**Review session.** A cross-set queue of everything due, sorted by due date. Space
flips, `1`–`4` grade, `U` undoes the last grade. Touch users swipe left for Again and
right for Good via GSAP Observer. Sidebar shows per-set due counts. A streak increments
on any day with at least one review.

---

## 5. Motion system

`lib/motion.ts` is the single source of truth. No component defines its own duration
or ease.

```ts
export const DUR = { instant: 0.12, quick: 0.2, base: 0.35, slow: 0.6, ritual: 1.2 };
export const EASE = { out: 'power3.out', in: 'power2.in', both: 'power2.inOut',
                      spring: 'back.out(1.6)', swipe: 'power2.out' };
```

Everything runs inside `gsap.matchMedia()`. The `(prefers-reduced-motion: reduce)`
branch sets `gsap.defaults({ duration: 0 })`, disables ScrollTrigger scrubbing, and
replaces the Ritual with a static status line. React components use `useGSAP` from
`@gsap/react` with a scoped ref so cleanup is automatic on unmount.

### The Ritual — signature moment

Content processing is currently a spinner with three swapped strings. It becomes one
orchestrated timeline synced to real status transitions:

1. `analyzing` — a sheet of paper draws in from the top edge; hairline rules stroke
   themselves across it left to right, staggered.
2. `generating_flashcards` — pink highlighter strokes sweep across the ruled lines.
3. `generating_quiz` — the strokes settle, the sheet lifts, numbered markers stamp in.
4. `complete` — the sheet transforms into the notes surface via Flip.

The timeline holds at the end of each beat until the next real status arrives, so it
never reports progress that has not happened. If a stage fails, the timeline reverses
and an error state replaces it.

### Plugin usage

| Plugin | Where |
| --- | --- |
| ScrollTrigger | Highlighter strokes draw on as headings enter the viewport, to their earned coverage. Notes margin rule scrubs with scroll position. |
| Flip | Card flies to its graded pile; library reorder on sort/filter; tab indicator morphs between tabs; Ritual sheet becomes the notes surface. |
| Observer | Swipe-to-grade on touch in the review session. |
| SplitText | Study-set title sets line by line on open. Used once, not everywhere. |
| CustomEase | One custom ease for the highlighter stroke, tuned to feel like a marker drag: fast entry, slight drag, clean lift. |

Micro-interactions: press-scale on controls (`0.97`, `DUR.instant`), toast slide-in,
focus rings that draw rather than appear, due-count numbers that roll on change.

---

## 6. Features

### Library management

Inline rename on the sidebar row. Delete with a 5-second undo toast; the record is
tombstoned, not dropped, until the toast expires. Duplicate. Tags with a filter bar.
Sort by recent, due count, mastery, or title. Export a set to Markdown (the summary
plus cards and quiz as appendices) or to JSON (complete, re-importable). Import JSON
with an id-collision check.

Settings sheet, replacing the dead button: theme, Gemini API key, default focus
duration, export-everything, and a destructive wipe behind a typed confirmation.

### Focus

A timer with a configurable duration. While running, `FocusOverlay` dims everything
outside the paragraph under the reading position — the lamp treatment — using a mask
that tracks scroll. Escape exits. Focus minutes accumulate into `AppMeta.focus`.

**Study Run** is a guided flow across four stages: Read the notes, Recall the due
cards, Test with the quiz, Fix the misses. Each stage hands off to the next with a
Flip transition, and the run is abandonable at any point without losing progress.

### AI tools

- **Selection menu** — select text in the notes for Explain, Simplify, or Make a card.
  A new card is appended with `term` set to the selection, so it immediately joins the
  highlighter system.
- **Marginalia** — ask a question about a specific paragraph; the answer pins to the
  margin beside it and persists with the set.
- **Quiz my misses** — builds a fresh quiz from wrong quiz answers and lapsed cards.
- **More cards on a weak topic** — generates additional cards for terms whose mastery
  is pink or absent.
- **In-app recording** — `MediaRecorder` captures a lecture directly. `metadata.json`
  already requests microphone permission.

All prompts move to `services/prompts.ts` so transport and wording stay separable.

### API key

Resolution order: `AppMeta.apiKey` from IndexedDB, then `import.meta.env.VITE_GEMINI_API_KEY`
for local development. No key is inlined into the production bundle. On first run with
no key resolvable, intake shows a key field with a link to the console rather than
failing at request time.

---

## 7. Error handling

The current code calls `alert()` on failure and returns `[]` silently from card and
quiz generation. Both are replaced.

- A `Toast` system carries recoverable errors with a retry action where one exists.
- Extraction failures name the file and the reason and leave the intake screen intact
  so the user can try another file.
- If flashcard or quiz generation returns nothing, the set is still created with the
  summary, and the affected tab shows an empty state with a Generate button rather
  than an empty carousel.
- AI failures distinguish missing key, invalid key, rate limit, and network error, and
  say which one happened.
- An error boundary wraps each view so one broken tab does not blank the app.

## 8. Testing

`lib/` is pure and gets unit tests via Vitest:

- `srs.ts` — grade transitions, ease clamping, interval clamping, lapse counting,
  new-card graduation, intraday requeue.
- `mastery.ts` — state-to-ink mapping at every boundary, set-level aggregation with
  zero cards.
- `db.ts` — migration from a realistic `localStorage` payload, including base64 images
  and `Date`-typed `createdAt`; idempotency when run twice; failure leaving old data intact.
- `extract.ts` — pptx slide ordering past slide 10, docx extraction, unsupported types.
- `markdown.ts` — term index extraction.

Components are verified by running the app, not by snapshot tests. Motion is verified
manually in both motion preferences.

## 9. Quality floor

Responsive to 360px. Visible keyboard focus on every interactive element. All
interactive elements reachable by keyboard, with the review session and command
palette fully operable without a mouse. `prefers-reduced-motion` respected throughout.
Both themes meet 4.5:1 on body text and 3:1 on large text and UI boundaries. No
horizontal page scroll; wide content scrolls within its own container.

## 10. Phases

Each phase ends with a working app.

| Phase | Contents |
| --- | --- |
| P0 | Toolchain: Tailwind v4 build, GSAP and `@google/genai` as real dependencies, React 19 aligned, `lib/` split, IndexedDB layer, migration, Vitest |
| P1 | Design tokens, shell, sidebar, intake, the Ritual |
| P2 | Notes view, markdown renderer, marginalia, selection AI actions |
| P3 | SRS engine, review session, mastery ink, streak |
| P4 | Quiz, results, quiz-my-misses |
| P5 | Tutor, focus mode, Study Run, command palette, library management, settings |
| P6 | Polish: reduced motion, accessibility audit, mobile pass |

## Open risks

- **Term linking.** The highlighter system depends on matching card `term` values to
  text in the notes. Model-generated cards do not reliably carry a clean term. Mitigation:
  ask for `term` in the card generation schema, fall back to fuzzy matching the card
  front against note headings, and degrade to set-level mastery when no match is found.
  The design must remain legible with zero term matches.
- **Font weight.** Three self-hosted families is a real payload. Subset to Latin and
  ship variable axes only where used.
- **Ritual timing.** If a stage completes faster than its beat, the timeline must skip
  forward without a visible jump.
