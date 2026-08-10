/** Headings in the study guide, in document order, minus the H1 title. */
export function headings(markdown: string): string[] {
  return [...markdown.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map(m => m[1].trim())
    .filter(Boolean);
}

/**
 * Openers for an empty tutor thread.
 *
 * An empty screen should invite an action, so these are real questions about
 * this set rather than a generic "how can I help?". They are drawn from the
 * guide's own headings, and fall back to the set title when it has none.
 */
export function starterPrompts(summary: string, title: string): string[] {
  const found = headings(summary);
  const subject = found[0] ?? title;
  const second = found[1] ?? title;

  return [
    `Explain ${lower(subject)} in plainer language`,
    `Give me a worked example of ${lower(second)}`,
    'Quiz me on the part I am most likely to get wrong',
  ];
}

/** Lowercases a heading for use mid-sentence, leaving acronyms alone. */
function lower(text: string): string {
  const trimmed = text.trim();
  if (trimmed === trimmed.toUpperCase()) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
