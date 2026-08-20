import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * The bridge between the markdown a study guide is stored as and the HTML the
 * rich text editor works in.
 *
 * Markdown stays the source of truth: the AI reads it, the contents rail is
 * built from its H2s, and the guide is rendered from it. The editor is only a
 * nicer surface to change it through, so every trip out and back has to return
 * what it was given. Where that cannot be guaranteed, the original text is
 * carried through untouched rather than approximated.
 *
 * Maths is the sharp edge. `$\lceil 22/8 \rceil$` is meaningless to an HTML
 * editor and full of characters a markdown serialiser wants to escape, so it
 * never enters the round trip at all: each expression is lifted out, replaced
 * with an opaque token, and put back verbatim on the way home.
 */

/** A token no document would contain, and that no serialiser will escape. */
const MATH_TOKEN = (i: number) => `MATHPLACEHOLDER${i}ENDMATH`;
const MATH_TOKEN_PATTERN = /MATHPLACEHOLDER(\d+)ENDMATH/g;

/**
 * Display maths first, so `$$...$$` is never mistaken for two inline spans.
 * A lone dollar amount ("It cost $5") must not match, which is why the inline
 * form requires a non-space next to each delimiter.
 */
const MATH_PATTERNS = [/\$\$[\s\S]+?\$\$/g, /\$(?!\s)(?:[^$\n]|\\\$)+?(?<!\s)\$/g];

export interface Protected {
  text: string;
  expressions: string[];
}

export function protectMath(markdown: string): Protected {
  const expressions: string[] = [];
  let text = markdown;

  for (const pattern of MATH_PATTERNS) {
    text = text.replace(pattern, match => {
      expressions.push(match);
      return MATH_TOKEN(expressions.length - 1);
    });
  }

  return { text, expressions };
}

export function restoreMath(text: string, expressions: string[]): string {
  return text.replace(MATH_TOKEN_PATTERN, (whole, index: string) => {
    const original = expressions[Number(index)];
    return original ?? whole;
  });
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  // Turndown's default rule is `* * *`, which is the same rule but not the
  // same bytes, and this file is judged on bytes.
  hr: '---',
});
turndown.use(gfm);

/**
 * List items, spaced the way the rest of the app writes them.
 *
 * Turndown indents continuation lines by the width of its marker plus two,
 * emitting `-   item`. That renders identically and compares differently, so
 * a note would come back "changed" every time it was opened.
 */
turndown.addRule('listItem', {
  filter: 'li',
  replacement: (content, node) => {
    const parent = node.parentNode as HTMLElement | null;
    let prefix = '- ';

    if (parent?.nodeName === 'OL') {
      const start = Number(parent.getAttribute('start') ?? 1);
      const index = Array.prototype.indexOf.call(parent.children, node);
      prefix = `${start + index}. `;
    }

    const body = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      // A checkbox arrives as its own token, so the space after it doubles up.
      .replace(/^\[([ xX])\]\s+/, '[$1] ')
      .replace(/\n/g, `\n${' '.repeat(prefix.length)}`);

    return `${prefix}${body}\n`;
  },
});

/**
 * Task list items come back as `- [x]`, which `gfm` alone does not do: it
 * writes the checkbox as an `<input>` it does not know how to phrase.
 */
turndown.addRule('taskListItem', {
  filter: node =>
    node.nodeName === 'LI' &&
    (node as HTMLElement).getAttribute('data-type') === 'taskItem',
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute('data-checked') === 'true';
    const body = content
      .replace(/^\s*\n+/, '')
      .replace(/\n+\s*$/, '')
      // TipTap nests the label and the text, so the checkbox may arrive twice.
      .replace(/^\[([ xX])\]\s+/, '')
      .replace(/\n/g, '\n  ')
      .trim();
    return `- [${checked ? 'x' : ' '}] ${body}\n`;
  },
});

/**
 * A soft break comes back as a plain newline rather than markdown's two
 * trailing spaces, so the file reads as it was written. Re-parsing it produces
 * the same break again, which is what makes opening and closing a note a
 * no-op instead of a slow drift of whitespace.
 */
turndown.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '\n',
});

export function markdownToHtml(markdown: string): string {
  const { text, expressions } = protectMath(markdown);
  /*
   * `breaks` matters more than it looks. CommonMark folds consecutive lines
   * into one paragraph, so a glossary written as nine lines came back as a
   * single run-on line — the render was unchanged, but the file had been
   * rewritten. Treating a newline as a newline keeps the shape the model wrote.
   */
  const html = marked.parse(text, { async: false, gfm: true, breaks: true }) as string;
  return restoreMath(html, expressions);
}

/**
 * Makes a table from the editor look like the one the GFM rule expects.
 *
 * Three differences, each of which alone is enough to lose the table:
 *
 * - TipTap writes a `<colgroup>` of pixel widths before `<tbody>`. The rule
 *   only accepts a heading row when the tbody is the table's first child, so
 *   the colgroup makes every table unrecognisable and it is emitted as raw
 *   HTML instead — which is what put `<table style="min-width...">` into a
 *   saved note as literal text.
 * - Each cell wraps its text in a paragraph, which serialises to a blank line
 *   and splits the row in half.
 * - A markdown table must have a header. If the header row has been deleted,
 *   the first row is promoted rather than the table being lost.
 */
export function normaliseEditorTables(html: string): string {
  let out = html.replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '');

  out = out.replace(
    /<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_all, tag: string, attrs: string, inner: string) => {
      const flat = inner
        .replace(/<\/?p\b[^>]*>/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag}${attrs}>${flat}</${tag}>`;
    },
  );

  out = out.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => {
    const firstRow = /<tr\b[^>]*>[\s\S]*?<\/tr>/i.exec(table);
    if (!firstRow || /<th\b/i.test(firstRow[0])) return table;

    const promoted = firstRow[0].replace(/<td\b/gi, '<th').replace(/<\/td>/gi, '</th>');
    return table.replace(firstRow[0], promoted);
  });

  return out;
}

export function htmlToMarkdown(html: string): string {
  const { text, expressions } = protectMath(normaliseEditorTables(html));
  const markdown = turndown.turndown(text);
  return restoreMath(markdown, expressions).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Whether a value survives the trip out and back.
 *
 * Used by the editor before it saves: if a note would not come home intact,
 * the safe thing is to keep what is already stored rather than write the
 * approximation over it.
 */
export function roundTrips(markdown: string): boolean {
  return normalise(htmlToMarkdown(markdownToHtml(markdown))) === normalise(markdown);
}

/**
 * Differences that are not differences: trailing space, the number of blank
 * lines between blocks, and `*`/`_` for the same emphasis all render the same
 * and mean the same to the model reading it.
 */
export function normalise(markdown: string): string {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
