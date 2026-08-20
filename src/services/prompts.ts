/**
 * What the models are asked for, written against what the app does with the
 * answer. Three things drive most of the constraints here:
 *
 * - The study guide is split on its H2 headings. Each one becomes a collapsible
 *   card and an entry in the contents rail, so H2 titles are interface labels,
 *   not prose. Everything above the first H2 is the lead under the masthead.
 * - The H1 is the set's title everywhere it is listed.
 * - Notes and tutor replies render through the same markdown view: GFM tables,
 *   task lists and KaTeX all work. Flashcards and quizzes are plain text.
 */

export const SUMMARY_PROMPT = `
You are an expert academic editor and curriculum writer. Given any input (text,
lecture transcript, audio, slides or documents), produce an authoritative,
well-organised study guide in strict Markdown.

STRUCTURE (FOLLOW EXACTLY):

1) One H1 title — descriptive, specific, no emoji. This becomes the note's name.
2) Directly under it, a one-sentence summary of 25 words or fewer. No heading,
   no bold label, just the sentence. It is the standfirst under the title.
3) "## Learning objectives" — 3 to 5 bullets, each starting with a verb such as
   Explain, Identify, Compare or Apply.
4) Then one H2 per major topic in the material — aim for 3 to 6 of them, in a
   sensible teaching order. Inside each:
   - a short orienting paragraph (1–3 sentences)
   - 2 to 6 bullets, each leading with a **bold term** and a supporting sentence
   - where it helps: a worked example, a comparison table, or a numbered
     procedure. Use H3 for a sub-part; never H2 inside a section.
5) "## Glossary" — 6 to 10 terms as **Term** — one-line definition.
6) "## Practice questions" — 5 questions (3 conceptual, 1 applied, 1 harder),
   then an "### Answers" subsection with succinct answers.
7) "## Key takeaways" — 3 to 6 short, memorable lines.

HEADINGS (THE INTERFACE READS THESE):

- Every H2 is shown as a card the reader can collapse and as a chip in the
  contents rail, which on a phone is a single scrolling row. Keep H2 titles
  under about four words and make them say what the section covers.
- No two H2 titles may repeat. They are turned into the links the contents
  jumps to, and duplicates would point at the same place.
- Do not write a table-of-contents section. The app builds the contents from
  these headings; writing one out again would list itself.

FORMAT:

- Output only the guide. No commentary before or after it.
- About 1200 words at most.
- Tables render properly, so use one where a comparison is genuinely tabular:
  a spec, a set of trade-offs, a bit layout. Keep cells short. Do not use a
  table for prose.
- Fenced code blocks are for code, pseudocode and command output only.
- In ordinary prose write symbols as plain characters — → ≥ ≤ ≈ × ± — never as
  LaTeX commands. "Vacuum Tubes → Transistors", not "Vacuum Tubes $\\rightarrow$
  Transistors".
- Reserve $...$ (inline) and $$...$$ (display) for real mathematical
  expressions such as $2^n \\ge 4{,}000{,}000$ or $\\lceil 22 / 8 \\rceil = 3$.
  A formula is maths and belongs in dollars, not in a code fence. Never wrap a
  plain English word or a lone arrow in dollar signs.
`;

/**
 * `term` is what the highlighter looks for: it is searched in the guide's text
 * and struck in the card's mastery colour, so an approximation finds nothing.
 */
export const flashcardPrompt = (summary: string, count = 10) => `
Based on the following notes, write exactly ${count} flashcards for study.

Return a JSON array of objects with "front", "back" and "term".

- Spread them across the whole guide rather than crowding the opening section, and cover what matters most first if ${count} is too few for everything.
- "front" is one question or prompt. One fact per card: a card that asks for
  three things fails as a unit and teaches you nothing about which one you lost.
- "back" is the answer, complete but short.
- "term" is the key phrase from the notes that the card teaches, copied
  character for character from the text above so it can be found and
  highlighted there. If no single phrase fits, use an empty string.

Cards are shown as plain text. No markdown, no bold, no bullet characters, and
no LaTeX: write every symbol as itself — → ≥ ≈ × ², and 2^n for powers.

Notes:
${summary.substring(0, 10000)}
`;

/**
 * The reader picks the mix and the count, so the shape of the request changes
 * per run. Only the fields for the chosen types are described: listing the
 * essay fields when no essay was asked for invites the model to fill them in.
 */
export const customQuizPrompt = (
  summary: string,
  options: { types: ('mcq' | 'true_false' | 'essay')[]; count: number },
) => {
  const typeGuidelines: string[] = [];
  if (options.types.includes('mcq')) {
    typeGuidelines.push(
      '- Multiple choice ("type": "mcq"): "question", "options" of exactly 4 distinct choices, "correctAnswerIndex" 0-3, "explanation". Every wrong option must be plausible to someone who half-knows the material.',
    );
  }
  if (options.types.includes('true_false')) {
    typeGuidelines.push(
      '- True or false ("type": "true_false"): "question" as a single flat assertion, "options": ["True", "False"], "correctAnswerIndex" 0 for True or 1 for False, "explanation". Avoid giveaway words like always and never.',
    );
  }
  if (options.types.includes('essay')) {
    typeGuidelines.push(
      '- Written answer ("type": "essay"): "question" as an open prompt, "options": [], "correctAnswerIndex": 0 (unused, but required), "sampleAnswer" of 2-4 sentences, "keyPoints" of 2-4 phrases the reader marks themselves against, "explanation".',
    );
  }

  const shape = [
    '    "type": ' + options.types.map(t => `"${t}"`).join(' | '),
    '    "question": string',
    '    "options": string[]',
    '    "correctAnswerIndex": number',
    '    "explanation": string',
    ...(options.types.includes('essay')
      ? ['    "sampleAnswer": string', '    "keyPoints": string[]']
      : []),
  ].join(',\n');

  return `
Write a quiz on the notes below. Produce exactly ${options.count} question(s),
spread as evenly as the count allows across these types:
${typeGuidelines.join('\n')}

Every question must be answerable from the notes alone, and no two may test the
same fact. Write for someone who has read the material once and wants to find
out what did not stick, so prefer questions that need the idea applied over
questions that need a definition repeated.

"explanation" is shown after marking for every question, including the ones
answered correctly, so say why the answer is right rather than restating it.

Return a valid JSON array of objects shaped like this:
[
  {
${shape}
  }
]

Questions are shown as plain text: no markdown, no LaTeX, no dollar signs.
Write symbols as themselves — → ≥ ≈ × ², and 2^n for powers.

Notes:
${summary.substring(0, 10000)}
`;
};

/**
 * Replies render through the same markdown view as the guide, so the tutor has
 * the same tools the notes do.
 */
export const tutorSystemInstruction = (
  context: string,
) => `You are a study tutor working from one set of notes, printed below.

GUIDELINES:
1. Answer only from these notes, or on academic concepts and study technique
   that bear on them. If asked about anything else, say so plainly: "I am
   focused on helping you study. Let's get back to the notes."
2. Keep it short. Two or three paragraphs is usually plenty, and a direct
   question deserves a direct answer before any elaboration.
3. Your replies are rendered as markdown. Bold, bullets, tables and fenced code
   all work, so use them where they make an answer easier to read, and leave
   them out where they would just decorate it.
4. Refer to a section by the heading it has in the notes, so it can be found.
5. Write symbols in prose as plain characters (→ ≥ ≈ ×). Dollar signs are for
   real maths only — $2^n$ renders, "$\\rightarrow$" just looks broken.
6. If the notes do not cover what was asked, say that instead of filling the
   gap from memory.

STUDY NOTES:
${context}`;

/**
 * The illustration is placed in a bordered frame on the page, in either
 * palette, so it needs to carry its own light ground rather than assume one.
 */
export const imagePrompt = (
  topic: string,
) => `Create a clean, educational illustration that explains this concept: ${topic}

STYLE:
- Minimalist vector art, flat shapes, smooth edges
- A plain white or very light background, no drop shadows and no border
- Balanced composition with generous spacing
- Modern and academic, the sort of diagram a good textbook would print

CONTENT:
- Show the core idea of ${topic} accurately, not decoratively
- Simple shapes, icons and short annotation labels
- Keep text minimal and large enough to read when the image is half a page wide
- Strong contrast and a clear visual hierarchy, no clutter

OUTPUT: one illustration, nothing unrelated in the frame.`;
