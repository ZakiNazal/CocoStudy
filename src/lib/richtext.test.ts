import { describe, expect, it } from 'vitest';
import {
  htmlToMarkdown,
  markdownToHtml,
  normalise,
  protectMath,
  restoreMath,
  roundTrips,
} from './richtext';

/**
 * The safety net for editing.
 *
 * Markdown is what is stored and what the model reads; the editor only borrows
 * it. So the question every one of these asks is the same: give the bridge a
 * guide, take it back, and is it the same guide? A failure here is not a
 * cosmetic bug, it is a note the user cannot get back.
 */

const trip = (md: string) => normalise(htmlToMarkdown(markdownToHtml(md)));
const same = (md: string) => expect(trip(md)).toBe(normalise(md));

describe('the things a study guide is made of', () => {
  it('keeps headings at their level', () => {
    same('# Title\n\n## Section\n\n### Sub-part\n\nBody text.');
  });

  it('keeps emphasis and inline code', () => {
    same('A **bold term**, an *aside*, and `some_identifier` in a line.');
  });

  it('keeps bullet and numbered lists', () => {
    same('- First point\n- Second point\n- Third point');
    same('1. Step one\n2. Step two\n3. Step three');
  });

  it('keeps task lists, checked and not', () => {
    same('- [x] Revise the PSW layout\n- [ ] Revise addressing modes');
  });

  it('keeps block quotes', () => {
    same('> Retrieval is what builds the memory, not review.');
  });

  it('keeps fenced code with its language', () => {
    same('```python\ndef ease(grade):\n    return grade * 0.15\n```');
  });

  it('keeps a horizontal rule', () => {
    same('Before.\n\n---\n\nAfter.');
  });

  it('keeps links', () => {
    same('See [the study guide](https://example.com/guide) for more.');
  });
});

describe('the two that would have been destroyed', () => {
  // The whole reason for the protection pass.
  it('keeps inline maths exactly as written', () => {
    same('Convert with $\\lceil 22 / 8 \\rceil = 3$ bytes per word.');
    same('Find $n$ where $2^n \\ge 4{,}000{,}000$.');
  });

  it('keeps display maths exactly as written', () => {
    same('The average access time is:\n\n$$t_{avg} = h \\times t_c + (1 - h) \\times t_m$$');
  });

  it('does not mistake a price for maths', () => {
    same('The textbook cost $40 and the reader cost $15.');
  });

  it('keeps a GFM table, borders and alignment included', () => {
    same(
      [
        '| Scheme | Placement | Cost |',
        '| --- | --- | --- |',
        '| Direct | One fixed line | Cheapest |',
        '| Fully associative | Any line | Most hardware |',
      ].join('\n'),
    );
  });

  it('keeps a wide bit-layout table', () => {
    same(
      [
        '| Bit | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        '| Field | S | Z | P | C | V | HC | N | I |',
        '| Value | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 1 |',
      ].join('\n'),
    );
  });
});

describe('a whole generated guide', () => {
  const GUIDE = [
    '# Cache Memory and the Memory Hierarchy',
    '',
    'Caches trade capacity for speed by keeping the lines a program will ask for next.',
    '',
    '## Learning objectives',
    '',
    '- Explain why a memory hierarchy exists.',
    '- Apply the average access time formula.',
    '',
    '## Why a hierarchy',
    '',
    'Fast memory is expensive per bit, so a machine buys a little of it.',
    '',
    '- **Locality of reference** is what makes the trick work.',
    '- **Hit rate** decides whether the fast layer earns its cost.',
    '',
    'Average access time is $t_{avg} = h \\times t_c + (1 - h) \\times t_m$.',
    '',
    '## Mapping schemes',
    '',
    '| Scheme | Placement | Cost |',
    '| --- | --- | --- |',
    '| Direct | One fixed line | Cheapest |',
    '| Set associative | Any line in a set | Middle |',
    '',
    '### Choosing between them',
    '',
    'Most designs land on set associative.',
    '',
    '> A cache is a bet that the past predicts the future.',
    '',
    '## Practice',
    '',
    '- [x] Work the hit-rate example',
    '- [ ] Derive the formula unaided',
    '',
    '```c',
    'int index = (addr >> 6) & 0x3F;',
    '```',
  ].join('\n');

  it('comes back the same guide', () => {
    same(GUIDE);
  });

  it('reports itself as safe to save', () => {
    expect(roundTrips(GUIDE)).toBe(true);
  });

  it('still splits into the same sections afterwards', () => {
    // The contents rail is built from H2s, so they have to survive intact.
    const headings = (md: string) => md.split('\n').filter(l => l.startsWith('## '));
    expect(headings(trip(GUIDE))).toEqual(headings(GUIDE));
  });
});

describe('the protection pass itself', () => {
  it('lifts every expression out and puts each one back', () => {
    const md = 'First $a + b$ then $$c \\times d$$ and finally $e^2$.';
    const { text, expressions } = protectMath(md);

    expect(text).not.toContain('$');
    expect(expressions).toHaveLength(3);
    expect(restoreMath(text, expressions)).toBe(md);
  });

  it('leaves a token alone when its expression is missing', () => {
    // Corrupted input should not throw or silently blank the text.
    const { text } = protectMath('$x$');
    expect(restoreMath(text, [])).toBe(text);
  });
});

describe('roundTrips as a guard', () => {
  it('is true for ordinary prose', () => {
    expect(roundTrips('# Notes\n\nA paragraph with a **term**.')).toBe(true);
  });

  it('ignores differences that are not differences', () => {
    // Trailing spaces and extra blank lines mean nothing to a reader or a model.
    expect(normalise('# A  \n\n\n\nB   ')).toBe('# A\n\nB');
  });
});

describe('line structure', () => {
  // A glossary is written one term per line with no blank line between.
  // CommonMark reads that as a single paragraph; rewriting the file that way
  // lost eight line breaks the first time this was tried against a real guide.
  it('keeps consecutive lines as separate lines', () => {
    same(
      [
        '**Forgetting curve** — the decline in retention since the last review.',
        '**Spacing effect** — distributed practice beats massed practice.',
        '**Ease factor** — the per-card multiplier governing interval growth.',
      ].join('\n'),
    );
  });

  it('is idempotent — a second trip changes nothing further', () => {
    const md = 'One line\nAnother line\n\nA new paragraph.';
    const once = trip(md);
    expect(trip(once)).toBe(once);
  });
});

describe('tables as the editor writes them', () => {
  /*
   * The shape that put `<table style="min-width: 75px;">` into a saved note as
   * literal text. TipTap puts a <colgroup> before <tbody>, which stops the GFM
   * rule recognising the header row, and wraps each cell's text in a <p>.
   */
  const editorTable = (rows: string) =>
    `<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;">` +
    `<col style="min-width: 25px;"></colgroup><tbody>${rows}</tbody></table>`;

  it('converts a table from the editor instead of dumping its HTML', () => {
    const html = editorTable(
      '<tr><th colspan="1" rowspan="1"><p>Scheme</p></th><th colspan="1" rowspan="1"><p>Cost</p></th></tr>' +
        '<tr><td colspan="1" rowspan="1"><p>Direct</p></td><td colspan="1" rowspan="1"><p>Cheapest</p></td></tr>',
    );
    const md = htmlToMarkdown(html);

    expect(md).not.toContain('<table');
    expect(md).not.toContain('colgroup');
    expect(md).not.toContain('min-width');
    expect(md).toContain('| Scheme | Cost |');
    expect(md).toContain('| Direct | Cheapest |');
  });

  it('does not split a row where a cell had a paragraph in it', () => {
    const md = htmlToMarkdown(
      editorTable('<tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>one</p></td><td><p>two</p></td></tr>'),
    );
    // Four lines: header, separator, one body row — and nothing torn in half.
    expect(md.split('\n').filter(Boolean)).toHaveLength(3);
    expect(md).toContain('| one | two |');
  });

  it('keeps a table whose header row was deleted, by promoting the first row', () => {
    // Markdown has no headerless table, and losing it entirely is worse.
    const md = htmlToMarkdown(
      editorTable('<tr><td><p>one</p></td><td><p>two</p></td></tr><tr><td><p>three</p></td><td><p>four</p></td></tr>'),
    );
    expect(md).not.toContain('<table');
    expect(md).toContain('| one | two |');
    expect(md).toContain('| three | four |');
  });

  it('survives the trip back into the editor and out again', () => {
    const md = htmlToMarkdown(
      editorTable('<tr><th><p>Term</p></th><th><p>Meaning</p></th></tr><tr><td><p>Ease</p></td><td><p>A multiplier</p></td></tr>'),
    );
    expect(trip(md)).toBe(normalise(md));
  });
});
