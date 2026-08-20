/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * `turndown-plugin-gfm` ships no types. Only the one export is used, and it is
 * a plain Turndown plugin, so the shape is declared here rather than pulling in
 * a community package for a single function.
 */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;
}
