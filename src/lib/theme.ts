import type { AppMeta } from '../types';

export type Theme = AppMeta['theme'];

export const THEMES: readonly Theme[] = ['light', 'dark', 'system'] as const;

/**
 * Writes the theme choice onto the document root.
 *
 * `system` removes the attribute entirely rather than setting a value: the
 * stylesheet defines light on bare `:root` and switches to dark inside a
 * `prefers-color-scheme` query guarded by `:not([data-theme="light"])`, so an
 * absent attribute is what lets the OS preference through.
 */
export interface ThemeTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export function applyTheme(theme: Theme, root: ThemeTarget): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** The palette a choice resolves to right now, for previews and labels. */
export function resolvedTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}
