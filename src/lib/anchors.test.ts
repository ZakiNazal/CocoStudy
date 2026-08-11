import { describe, expect, it } from 'vitest';
import { findHeading, slugify, type HeadingRef } from './anchors';

/** The sections from a real guide, slugged the way rehype-slug slugs them. */
const HEADINGS: HeadingRef[] = [
  { id: 'computer-architecture', text: 'Computer Architecture' },
  { id: 'the-von-neumann-architecture', text: 'The Von Neumann Architecture' },
  { id: 'the-harvard-architecture', text: 'The Harvard Architecture' },
  {
    id: 'comparative-analysis-of-architectural-frameworks',
    text: 'Comparative Analysis of Architectural Frameworks',
  },
  { id: 'the-modified-harvard-architecture', text: 'The Modified Harvard Architecture' },
];

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Harvard Architecture')).toBe('the-harvard-architecture');
  });

  // A run of space left by stripped punctuation collapses to one hyphen, where
  // github-slugger would leave two. Both sides of a comparison come through
  // here, so the two agree with each other, which is what the match needs.
  it('drops punctuation but keeps words and digits', () => {
    expect(slugify('Step 3: Fetch — Decode, Execute!')).toBe('step-3-fetch-decode-execute');
  });

  it('keeps letters outside ASCII', () => {
    expect(slugify('Schrödinger Notes')).toBe('schrödinger-notes');
  });
});

describe('findHeading', () => {
  it('matches the id the link asks for', () => {
    expect(findHeading(HEADINGS, '#the-harvard-architecture', 'The Harvard Architecture')).toBe(2);
  });

  it('falls back to the section title the link shows', () => {
    // The model guessed an id that does not exist; the text still names it.
    expect(findHeading(HEADINGS, '#section-3', 'The Harvard Architecture')).toBe(2);
  });

  it('matches when the model drops the leading article', () => {
    expect(findHeading(HEADINGS, '#von-neumann-architecture', '')).toBe(1);
  });

  it('matches a shortened anchor against the full heading', () => {
    expect(findHeading(HEADINGS, '#comparative-analysis', '')).toBe(3);
  });

  it('decodes an escaped anchor', () => {
    expect(findHeading(HEADINGS, '#the%20harvard%20architecture', '')).toBe(2);
  });

  it('prefers the exact id over a looser reading of the text', () => {
    // "Harvard" alone would also brush the modified section.
    expect(
      findHeading(HEADINGS, '#the-modified-harvard-architecture', 'Harvard'),
    ).toBe(4);
  });

  it('gives up rather than guessing when nothing is close', () => {
    expect(findHeading(HEADINGS, '#glossary', 'Glossary')).toBe(-1);
  });

  it('gives up on an empty link', () => {
    expect(findHeading(HEADINGS, '#', '')).toBe(-1);
  });

  it('handles a guide with no headings at all', () => {
    expect(findHeading([], '#anything', 'Anything')).toBe(-1);
  });
});
