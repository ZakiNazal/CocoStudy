import type { AppMeta } from '../types';

export type Theme = AppMeta['theme'];

export const THEMES: readonly Theme[] = ['light', 'dark'] as const;

/** The palette a stored value means, defaulting anything unrecognised to light. */
export function normalizeTheme(value: unknown): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

export interface ThemeTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Writes the theme choice onto the document root.
 *
 * The stylesheet defines light on bare `:root` and dark under
 * `[data-theme="dark"]`, so the attribute is always pinned to one of the two —
 * the OS preference is not consulted.
 */
export function applyTheme(theme: Theme, root: ThemeTarget): void {
  root.setAttribute('data-theme', normalizeTheme(theme));
}

/** The palette to switch to when the toggle is pressed. */
export function nextTheme(theme: Theme): Theme {
  return normalizeTheme(theme) === 'dark' ? 'light' : 'dark';
}
