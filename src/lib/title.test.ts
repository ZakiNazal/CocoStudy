import { describe, expect, it } from 'vitest';
import { titleFrom } from './title';

describe('titleFrom', () => {
  it('reads the H1', () => {
    expect(titleFrom('# Chapter 4: The Little Man Computer\n\nBody')).toBe(
      'Chapter 4: The Little Man Computer',
    );
  });

  it('takes the first H1 when a guide has several', () => {
    expect(titleFrom('# First\n\n# Second')).toBe('First');
  });

  it('ignores deeper headings', () => {
    expect(titleFrom('## Subsection\n\n# Real title')).toBe('Real title');
  });

  it('falls back when there is no heading', () => {
    expect(titleFrom('Just some prose.')).toBe('Study Note');
  });

  it('falls back on an empty heading', () => {
    expect(titleFrom('#   \n\nBody')).toBe('Study Note');
  });
});
