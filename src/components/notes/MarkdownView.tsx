import type { MouseEvent } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import 'katex/dist/katex.min.css';
import { findHeading, scrollParent, type HeadingRef } from '../../lib/anchors';
import { shouldAnimate } from '../../lib/motion';

/** Room above a heading once it lands, so it is not flush to the pane's edge. */
const JUMP_GUTTER = 20;

/**
 * Jumps to the section an outline bullet names.
 *
 * The default `#hash` navigation is not usable here: the guide scrolls inside
 * a pane rather than the document, and letting the browser handle it would
 * stamp a fragment onto the URL of a single-page app for a move that is not
 * navigation at all.
 */
function jumpToSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const link = event.currentTarget;
  const root = link.closest('[data-markdown]') ?? document;
  const nodes = [...root.querySelectorAll<HTMLElement>('h1, h2, h3, h4')];
  const headings: HeadingRef[] = nodes.map(n => ({ id: n.id, text: n.textContent ?? '' }));

  const index = findHeading(headings, href, link.textContent ?? '');
  // Nothing matched, so the link is left to the browser rather than swallowed.
  if (index === -1) return;

  event.preventDefault();
  const target = nodes[index];
  const pane = scrollParent(target);

  if (pane) {
    const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    pane.scrollTo({
      top: pane.scrollTop + top - JUMP_GUTTER,
      behavior: shouldAnimate() ? 'smooth' : 'auto',
    });
  }

  // A struck heading, so the eye finds where it landed the way a marker finds
  // a line. The class removes itself, leaving the heading as it was.
  if (!shouldAnimate()) return;
  target.classList.remove('struck');
  // Reading the layout restarts the animation when the same link is clicked twice.
  void target.offsetWidth;
  target.classList.add('struck');
  target.addEventListener('animationend', () => target.classList.remove('struck'), {
    once: true,
  });
}

/**
 * Markdown mapped onto the MARKED UP type system. Study notes are long-form
 * reading, so the body is the serif face; anything that is data or a label
 * takes the mono face.
 */
const components: Components = {
  // `id` is the slug rehype-slug puts on the heading — dropping it here would
  // leave the outline links with nothing to find.
  h1: ({ children, id }) => (
    <h1 id={id} className="display mt-12 text-2xl first:mt-0 sm:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className="display mt-10 border-b border-[var(--rule)] pb-2 text-xl">
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="display mt-7 text-base uppercase tracking-[0.06em]">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mt-4 leading-[1.75] text-[var(--ink-2)]">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--ink)]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-[var(--ink)]">{children}</em>,
  ul: ({ children }) => <ul className="mt-4 space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 space-y-2">{children}</ol>,
  // A task item carries its own checkbox, so it drops the dash the other
  // bullets wear. `task-list-item` is the class remark-gfm puts on them.
  li: ({ children, className }) =>
    className?.includes('task-list-item') ? (
      <li className="flex items-baseline gap-2 leading-[1.7] text-[var(--ink-2)]">{children}</li>
    ) : (
      <li className="relative pl-5 leading-[1.7] text-[var(--ink-2)] before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-[var(--ink-3)]">
        {children}
      </li>
    ),
  input: ({ checked, type }) =>
    type === 'checkbox' ? (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mt-0.5 h-3 w-3 shrink-0 accent-[var(--ink)]"
      />
    ) : null,
  del: ({ children }) => (
    <del className="text-[var(--ink-3)] line-through">{children}</del>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-5 border-l-2 border-[var(--ink)] pl-4 text-[var(--ink)]">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[0.875em] bg-[var(--paper-3)] px-1.5 py-0.5 text-[var(--ink)]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto bg-[var(--paper-3)] p-4 font-mono text-xs sm:text-sm leading-relaxed text-[var(--ink)]">
      {children}
    </pre>
  ),
  hr: () => <hr className="mt-8 border-[var(--rule)]" />,
  a: ({ href, children }) =>
    href?.startsWith('#') ? (
      <a
        href={href}
        onClick={e => jumpToSection(e, href)}
        className="underline decoration-[var(--ink-3)] underline-offset-2 transition-colors duration-150 hover:decoration-[var(--ink)] hover:text-[var(--ink)]"
      >
        {children}
      </a>
    ) : (
      // Anything off the page opens beside the guide, never over it.
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-[var(--ink-3)] underline-offset-2 hover:decoration-[var(--ink)]"
      >
        {children}
      </a>
    ),
  // A register or bit-layout table is wider than the column it sits in, so the
  // cells hold their line and the table scrolls sideways inside its own box.
  table: ({ children }) => (
    <div className="mt-5 overflow-x-auto border border-[var(--rule)]">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="label whitespace-nowrap border-b border-[var(--rule)] bg-[var(--paper-3)] px-3 py-2 text-left">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="whitespace-nowrap border-b border-[var(--rule)] px-3 py-2 text-[var(--ink-2)]">
      {children}
    </td>
  ),
};

/**
 * Models write maths as LaTeX between dollar signs whatever the prompt asks,
 * so it is rendered rather than left as `$2^n \ge \text{target}$` on the page.
 * `throwOnError: false` keeps a malformed expression from taking down the
 * whole guide — KaTeX prints the source in red and the rest still reads.
 *
 * `remarkGfm` is what makes a pipe table a table. Without it CommonMark treats
 * the rows as ordinary text and joins them into one paragraph of pipes, which
 * is how a bit-layout table ends up printed as a wall of `| 0 | 1 |`.
 */
export default function MarkdownView({ children }: { children: string }) {
  return (
    // The marker the outline links search within, so a jump inside the tutor
    // thread cannot land on a heading in the guide behind it.
    <div data-markdown>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, [rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
