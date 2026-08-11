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
