# Handoff

## State
Redesigning CocoStudy end-to-end on branch `redesign/marked-up` (5 commits ahead of main, all committed, 78 tests green). Spec: `docs/superpowers/specs/2026-08-10-cocostudy-marked-up-redesign-design.md`. Plans: `docs/superpowers/plans/`.
**Done:** P0 foundation (Vite + Tailwind v4 + Vitest, no CDN, IndexedDB + migration, `src/lib/` pure modules, typed `services/ai.ts`), P1 the MARKED UP redesign (new shell, sidebar, intake, Ritual, StudySession), P3 card grading + review queue + streak + demo set.
**Not done:** P2 (highlighter strokes on notes terms, marginalia, selection AI actions), P4 (quiz-my-misses), P5 (focus mode, Study Run, ⌘K palette, library management, Settings sheet — the Settings button is still a no-op), P6 (a11y audit, mobile pass, code-split the 1.16MB bundle).

## Next
1. **P5 Settings sheet first** — the BYO Gemini key has no UI, so AI generation only works via `VITE_GEMINI_API_KEY` in `.env`. `useSettings.ts` and `db.putMeta` already support it; only the sheet is missing.
2. P2: wire `card.term` → highlighter strokes in the notes (the signature element; currently only used in the intake hero).
3. P5 library management: delete/rename/export — `removeSet` exists in the store but nothing calls it.

## Context
- Ink encodes recall: pink=learning, yellow=reviewing, green=mastered, bare paper=unseen. Never use colour decoratively.
- All durations/eases come from `src/lib/motion.ts`. Guard every entrance with `shouldAnimate()` and make the **resting state the finished state** — I hit a real bug where stalled tweens left content permanently invisible in background tabs.
- `migrateLegacyData` is guarded by an in-flight promise; React StrictMode double-invocation orphaned blobs without it.
- Never derive a value to persist inside a `setState` updater (raced in `gradeCard`); read from IndexedDB instead.
- Verify in the browser, not just tests — both real bugs this session were found by looking, not by the suite.
- Dev server: `npm run dev` (was on :5174, :5173 occupied). Demo set loads with no API key via the intake button.
