import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Markdown mapped onto the MARKED UP type system. Study notes are long-form
 * reading, so the body is the serif face; anything that is data or a label
 * takes the mono face.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="display mt-12 text-2xl first:mt-0 sm:text-3xl">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="display mt-10 border-b border-[var(--rule)] pb-2 text-xl">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="display mt-7 text-base uppercase tracking-[0.06em]">{children}</h3>
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
    <code className="numeral bg-[var(--paper-3)] px-1.5 py-0.5 text-[0.85em] text-[var(--ink)]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-5 overflow-x-auto border border-[var(--rule)] bg-[var(--paper-3)] p-4 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),
  hr: () => <hr className="mt-8 border-[var(--rule)]" />,
  a: ({ href, children }) => (
    <a
      href={href}
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
    <ReactMarkdown
      components={components}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
    >
      {children}
    </ReactMarkdown>
  );
}
