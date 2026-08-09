import ReactMarkdown, { type Components } from 'react-markdown';

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
  li: ({ children }) => (
    <li className="relative pl-5 leading-[1.7] text-[var(--ink-2)] before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-[var(--ink-3)]">
      {children}
    </li>
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
  table: ({ children }) => (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="label border-b border-[var(--rule)] px-3 py-2 text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[var(--rule)] px-3 py-2 text-[var(--ink-2)]">{children}</td>
  ),
};

export default function MarkdownView({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
