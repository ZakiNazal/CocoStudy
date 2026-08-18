<div align="center">

<img src="docs/mark.png" alt="" width="96" />
<img width="850" height="550" alt="logo" src="https://github.com/user-attachments/assets/c3451f65-d1f5-402a-bf2b-bd839f6c425b" />

# CocoStudy 🥥✨

# CocoStudy

**Marked up as you learn.**

Drop in a lecture recording or a slide deck and get back a study guide,
a deck of cards on a review schedule, and a tutor that has read all of it.

[**cocostudy.vercel.app**](https://cocostudy.vercel.app/)
---
<img width="1920" height="1080" alt="cocostudy" src="https://github.com/user-attachments/assets/5d7f3312-b4ae-4d17-90ce-e676b62bdd24" />

</div>

<br />

![CocoStudy](docs/cocostudy.png)

<br />

## Getting started

There's a demo set you can open without a key or an account, which is the fastest way to find out whether you like it. For your own material you'll need a Gemini key, pasted into Settings. It stays in your browser and only ever goes to Google.

## What it reads

PDFs, Word files, PowerPoint decks, audio, video, or text you paste in. Recordings get transcribed first.

## The four tabs

**Notes** is the study guide itself, and the tab I spent the most time on. Headings, key terms, a glossary, practice questions. The contents list at the top actually jumps to its sections, which sounds like table stakes and took two bugs to get right. Maths renders instead of sitting there as `$\lceil 22/8 \rceil$`. Tables come out as tables. Edit any of it. There's a Visualise button that draws the topic when another paragraph isn't going to help.

**Cards** are generated from the guide, and each one remembers which phrase in your notes it teaches, so the notes highlight themselves as you learn.

**Quiz** is five questions with an explanation for every answer, including the ones you got right. Attempts are kept.

**Tutor** is a chat that has only read your notes. Ask for a plainer explanation, or a harder version of a question. Ask it anything else and it'll tell you to get back to work.

## How the schedule works

Four grades: again, hard, good, easy. Each card has an ease factor starting at 2.5 that drifts between 1.3 and 2.8 depending on how you answer. Get one wrong and it comes back in ten minutes, not tomorrow. Intervals grow from there and stop at a year.

Colour does the reporting.

| Ink | Means |
| :--- | :--- |
| bare graphite | never seen |
| pink | learning |
| yellow | in review |
| green | mastered |

The bar under each set in the sidebar is the whole deck in those inks, so you can read the state of a set without opening it.

## The library

Make folders, drag sets into them. Deleting a folder puts its sets back in Unfiled rather than taking them with it. Search cuts across the lot.

## Your data

All of it lives in IndexedDB on your machine. No account, no upload, and closing the tab costs you nothing.

Settings exports a JSON file of every set and all your progress, minus the API key, on the theory that an export is a thing people email to themselves. There's also a wipe.

## Built with

React 19, TypeScript, Tailwind v4, Vite. GSAP for motion, react-markdown with remark-gfm and KaTeX, idb for storage, mammoth and jszip for reading documents, Gemini for generation.

Bricolage Grotesque for display, Source Serif 4 for reading, Martian Mono for anything that's data or a label. Light and dark are both chosen, never inherited from the OS.

## License

MIT.
