import { describe, expect, it } from 'vitest';
import { headings, starterPrompts } from './tutor';

const GUIDE = `# Spaced Repetition

Intro line.

## Executive summary

Body.

### The forgetting curve

Body.

#### Too deep to count

Body.
`;

describe('headings', () => {
  it('takes h2 and h3 in order, skipping the h1 title', () => {
    expect(headings(GUIDE)).toEqual(['Executive summary', 'The forgetting curve']);
  });

  it('is empty for prose with no headings', () => {
    expect(headings('Just some text.\nAnd more.')).toEqual([]);
  });
});

describe('starterPrompts', () => {
  it('draws on the guide’s own headings', () => {
    const prompts = starterPrompts(GUIDE, 'Spaced Repetition');
    expect(prompts[0]).toBe('Explain executive summary in plainer language');
    expect(prompts[1]).toBe('Give me a worked example of the forgetting curve');
  });

  it('falls back to the title when the guide has no headings', () => {
    const prompts = starterPrompts('No headings here.', 'Photosynthesis');
    expect(prompts[0]).toContain('photosynthesis');
    expect(prompts[1]).toContain('photosynthesis');
  });

  it('leaves acronyms uppercase', () => {
    expect(starterPrompts('## DNA\n', 'Bio')[0]).toBe('Explain DNA in plainer language');
  });

  it('always offers three', () => {
    expect(starterPrompts(GUIDE, 'x')).toHaveLength(3);
    expect(starterPrompts('', 'x')).toHaveLength(3);
  });
});
