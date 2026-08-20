import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarkdownView from './MarkdownView';

/**
 * The rendered page with KaTeX's `<annotation>` blocks stripped. KaTeX keeps a
 * copy of the original TeX there for screen readers and copy-paste, so the raw
 * commands legitimately survive in the markup — what matters is that they are
 * not what the reader sees.
 */
function render(markdown: string): string {
  return renderToStaticMarkup(<MarkdownView>{markdown}</MarkdownView>).replace(
    /<annotation[^>]*>.*?<\/annotation>/g,
    '',
  );
}

describe('MarkdownView maths', () => {
  it('renders inline maths instead of printing the source', () => {
    const html = render('Find $n$ such that $2^n \\ge \\text{target number}$.');
    expect(html).toContain('katex');
    expect(html).not.toContain('\\ge');
    expect(html).not.toContain('\\text{target number}');
    // The operator survives as its glyph, not as a command.
    expect(html).toContain('≥');
  });

  it('renders arrows written as LaTeX in prose', () => {
    const html = render('Vacuum Tubes $\\rightarrow$ Transistors $\\rightarrow$ ICs');
    expect(html).not.toContain('rightarrow');
    expect(html).toContain('→');
  });

  it('renders ceilings and bold text macros', () => {
    const html = render('Convert: $\\lceil 22 / 8 \\rceil = \\mathbf{3\\text{ bytes}}$.');
    expect(html).not.toContain('\\lceil');
    expect(html).not.toContain('\\mathbf');
    expect(html).toContain('⌈');
  });

  it('leaves a lone dollar amount alone', () => {
    expect(render('It cost $5 to run.')).toContain('$5 to run.');
  });

  it('keeps the page readable when an expression is malformed', () => {
    // throwOnError: false — the bad expression is shown, the prose still renders.
    const html = render('Broken $\\frac{1}{$ but this still shows.');
    expect(html).toContain('but this still shows.');
  });
});

describe('MarkdownView GFM', () => {
  const TABLE = [
    '| Bit Position | 0 | 1 | 2 |',
    '| :--- | :--- | :--- | :--- |',
    '| Field | S | Z | C |',
    '| Value | 0 | 1 | 0 |',
  ].join('\n');

  it('renders a pipe table as a table, not a paragraph of pipes', () => {
    const html = render(TABLE);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    // The failure this guards: rows joined into prose, pipes and all.
    expect(html).not.toContain('| Field |');
  });

  it('keeps every column of a wide layout table', () => {
    const html = render(TABLE);
    // `[ >]` so `<thead>` is not counted as a header cell.
    expect(html.match(/<th[ >]/g)).toHaveLength(4);
    expect(html.match(/<tr/g)).toHaveLength(3);
  });

  it('renders a table that follows a list item', () => {
    const html = render(`- Substitute the flag values:\n\n${TABLE}`);
    expect(html).toContain('<table');
    expect(html).toContain('<li');
  });

  it('renders task lists with checkboxes', () => {
    const html = render('- [x] Revise PSW\n- [ ] Revise addressing modes');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).not.toContain('[x]');
  });

  it('renders bullet lists with standard ul and li elements', () => {
    const html = render('- Bullet 1\n- Bullet 2\n- Bullet 3');
    expect(html).toContain('<ul');
    expect(html).toContain('list-disc');
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain('Bullet 1');
    expect(html).toContain('Bullet 2');
  });

  it('renders numbered lists with standard ol and li elements', () => {
    const html = render('1. First item\n2. Second item\n3. Third item');
    expect(html).toContain('<ol');
    expect(html).toContain('list-decimal');
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain('First item');
    expect(html).toContain('Second item');
  });

  it('renders strikethrough', () => {
    expect(render('~~wrong~~ right')).toContain('<del');
  });
});
