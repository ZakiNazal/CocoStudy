/**
 * A set's title is the H1 of its study guide, so editing that heading in the
 * notes renames the set everywhere it is listed. Kept in one place because
 * both generation and editing have to derive it the same way.
 */
export function titleFrom(markdown: string): string {
  // Horizontal whitespace only — `\s` would swallow the newline and pull the
  // first line of body text up as the title.
  return /^#[ \t]+(.*)$/m.exec(markdown)?.[1]?.trim() || 'Study Note';
}
