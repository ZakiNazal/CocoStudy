import { describe, expect, it } from 'vitest';
import { applyTheme, nextTheme, normalizeTheme, type ThemeTarget } from './theme';

/** Records attribute writes without pulling in a DOM implementation. */
function root(): ThemeTarget & { attrs: Map<string, string> } {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name, value) => void attrs.set(name, value),
    removeAttribute: name => void attrs.delete(name),
  };
}

describe('applyTheme', () => {
  it('pins light', () => {
    const el = root();
    applyTheme('light', el);
    expect(el.attrs.get('data-theme')).toBe('light');
  });

  it('pins dark', () => {
    const el = root();
    applyTheme('dark', el);
    expect(el.attrs.get('data-theme')).toBe('dark');
  });

  it('pins light for a theme left over from an older version', () => {
    const el = root();
    applyTheme('system' as never, el);
    expect(el.attrs.get('data-theme')).toBe('light');
  });
});

describe('normalizeTheme', () => {
  it('keeps dark and treats everything else as light', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('system')).toBe('light');
    expect(normalizeTheme(undefined)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('swaps between the two palettes', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });

  it('moves a stale value to dark, since it displays as light', () => {
    expect(nextTheme('system' as never)).toBe('dark');
  });
});
