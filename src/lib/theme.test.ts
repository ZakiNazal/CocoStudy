import { describe, expect, it } from 'vitest';
import { applyTheme, resolvedTheme, type ThemeTarget } from './theme';

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

  it('removes the attribute for system so the OS query applies', () => {
    const el = root();
    applyTheme('dark', el);
    applyTheme('system', el);
    expect(el.attrs.has('data-theme')).toBe(false);
  });
});

describe('resolvedTheme', () => {
  it('follows the OS only when the choice is system', () => {
    expect(resolvedTheme('system', true)).toBe('dark');
    expect(resolvedTheme('system', false)).toBe('light');
    expect(resolvedTheme('light', true)).toBe('light');
    expect(resolvedTheme('dark', false)).toBe('dark');
  });
});
