/**
 * Resolving the outline links a model writes.
 *
 * The study guide opens with a table of contents whose bullets link to the
 * sections below. `rehype-slug` gives every heading a GitHub-style id, but the
 * model is guessing at those ids when it writes the link, and it guesses wrong
 * often enough — "#von-neumann" for "The Von Neumann Architecture" — that an
 * exact id match alone would leave half the outline dead.
 *
 * So the link text is treated as the stronger signal: it is the section title,
 * spelled out, because that is what the reader clicks.
 */

export interface HeadingRef {
  id: string;
  text: string;
}

/** GitHub's slug rules, which is what `rehype-slug` applies to the headings. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/\s+/g, '-');
}

/** Drops leading articles so "the-harvard-architecture" meets "harvard-architecture". */
function core(slug: string): string {
  return slug.replace(/^(the|a|an)-/, '');
}

/**
 * The heading an outline link means, or -1.
 *
 * Tried in order of how much the match can be trusted: the id the link asked
 * for, then the section title it is showing the reader, then a looser reading
 * of either with articles dropped and one allowed to contain the other.
 */
export function findHeading(
  headings: HeadingRef[],
  href: string,
  linkText: string,
): number {
  const wanted = decodeURIComponent(href.replace(/^#/, ''));
  if (!wanted && !linkText.trim()) return -1;

  const exact = headings.findIndex(h => h.id === wanted);
  if (exact !== -1) return exact;

  const byText = slugify(linkText);
  if (byText) {
    const titled = headings.findIndex(h => slugify(h.text) === byText);
    if (titled !== -1) return titled;
  }

  const candidates = [slugify(wanted), byText].filter(Boolean).map(core);
  for (const candidate of candidates) {
    const loose = headings.findIndex(h => {
      const heading = core(slugify(h.text));
      return heading === candidate || heading.includes(candidate) || candidate.includes(heading);
    });
    if (loose !== -1) return loose;
  }

  return -1;
}

/**
 * The box the heading has to be scrolled inside. Never `scrollIntoView`: it
 * walks the whole ancestor chain and drags the page along with the pane.
 */
export function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * The height of anything pinned to the top of `pane`, so a heading lands below
 * it rather than behind it. Returns 0 when the bar is not on screen — the
 * phone's contents row is `display: none` on a wide screen, which is what
 * `offsetParent` is being read for.
 */
export function stickyOffset(pane: HTMLElement | null): number {
  const bar = pane?.querySelector<HTMLElement>('[data-sticky-offset]');
  return bar && bar.offsetParent !== null ? bar.getBoundingClientRect().height : 0;
}
