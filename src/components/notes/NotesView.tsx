import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Edit3,
  Image as ImageIcon,
  Italic,
  List,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { getBlobUrl, putBlob } from '../../lib/db';
import { titleFrom } from '../../lib/title';
import { slugify } from '../../lib/anchors';
import { shouldAnimate } from '../../lib/motion';
import { generateStudyImage } from '../../services/ai';
import MarkdownView from './MarkdownView';
import Banner from '../ui/Banner';
import type { StudySet } from '../../types';

interface NotesViewProps {
  set: StudySet;
  onUpdateSet: (set: StudySet) => void;
}

interface NoteSection {
  id: string;
  title: string;
  content: string;
}

function parseNoteSections(markdown: string, fallbackTitle: string): {
  title: string;
  lead: string;
  sections: NoteSection[];
} {
  const lines = markdown.split('\n');
  let title = '';
  const leadLines: string[] = [];
  const sections: NoteSection[] = [];

  let currentSection: { title: string; lines: string[] } | null = null;
  let inLead = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h1Match && !title && sections.length === 0 && !currentSection) {
      title = h1Match[1].trim();
      continue;
    }

    if (h2Match) {
      inLead = false;
      if (currentSection) {
        sections.push({
          id: slugify(currentSection.title) || `section-${sections.length}`,
          title: currentSection.title,
          content: currentSection.lines.join('\n').trim(),
        });
      }
      currentSection = {
        title: h2Match[1].trim(),
        lines: [],
      };
      continue;
    }

    if (inLead) {
      leadLines.push(line);
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      leadLines.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      id: slugify(currentSection.title) || `section-${sections.length}`,
      title: currentSection.title,
      content: currentSection.lines.join('\n').trim(),
    });
  }

  return {
    title: title || fallbackTitle,
    lead: leadLines.join('\n').trim(),
    sections,
  };
}

export default function NotesView({ set, onUpdateSet }: NotesViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(set.summary);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const textarea = useRef<HTMLTextAreaElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);

  const { title, lead, sections } = useMemo(
    () => parseNoteSections(set.summary, set.title),
    [set.summary, set.title],
  );

  useEffect(() => {
    setDraft(set.summary);
    setEditing(false);
    setCollapsedSections(new Set());
    if (sections.length > 0) {
      setActiveSectionId(sections[0].id);
    }
  }, [set.id, set.summary, sections]);

  // Blob keys resolve to object URLs for rendering, and are revoked on unmount.
  useEffect(() => {
    let created: string[] = [];
    let cancelled = false;

    Promise.all(set.images.map(getBlobUrl)).then(urls => {
      const resolved = urls.filter((u): u is string => Boolean(u));
      if (cancelled) {
        resolved.forEach(URL.revokeObjectURL);
        return;
      }
      created = resolved;
      setImageUrls(resolved);
    });

    return () => {
      cancelled = true;
      created.forEach(URL.revokeObjectURL);
    };
  }, [set.images]);

  // Scroll spy to update active outline item
  useEffect(() => {
    const pane = scrollContainer.current;
    if (!pane || sections.length === 0) return;

    const handleScroll = () => {
      const paneTop = pane.getBoundingClientRect().top;
      let currentId = sections[0].id;

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - paneTop <= 120) {
            currentId = section.id;
          }
        }
      }
      setActiveSectionId(currentId);
    };

    pane.addEventListener('scroll', handleScroll, { passive: true });
    return () => pane.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const allCollapsed = sections.length > 0 && sections.every(s => collapsedSections.has(s.id));

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedSections(new Set());
    } else {
      setCollapsedSections(new Set(sections.map(s => s.id)));
    }
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToSection = (id: string) => {
    // Ensure section is open
    setCollapsedSections(prev => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });
    setActiveSectionId(id);

    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      const pane = scrollContainer.current;
      if (el && pane) {
        const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top;
        pane.scrollTo({
          top: pane.scrollTop + top - 24,
          behavior: shouldAnimate() ? 'smooth' : 'auto',
        });

        if (shouldAnimate()) {
          el.classList.remove('struck');
          void el.offsetWidth;
          el.classList.add('struck');
          el.addEventListener('animationend', () => el.classList.remove('struck'), {
            once: true,
          });
        }
      }
    });
  };

  const wrapSelection = (prefix: string, suffix = '') => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    setDraft(
      `${draft.slice(0, start)}${prefix}${draft.slice(start, end)}${suffix}${draft.slice(end)}`,
    );
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = end + prefix.length;
    });
  };

  const visualise = async () => {
    if (imageBusy) return;
    setImageBusy(true);
    setImageError(null);
    try {
      const blob = await generateStudyImage(set.title);
      if (!blob) {
        setImageError('Gemini returned no image. Try again.');
        return;
      }
      onUpdateSet({ ...set, images: [...set.images, await putBlob(blob)] });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Could not draw a visual.');
    } finally {
      setImageBusy(false);
    }
  };

  const toolButton =
    'flex items-center gap-1.5 rounded-[4px] border border-[var(--rule)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-150 hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50';

  return (
    <div ref={scrollContainer} className="h-full overflow-y-auto px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        {imageError && (
          <div className="mb-6">
            <Banner tone="error" onDismiss={() => setImageError(null)}>
              {imageError}
            </Banner>
          </div>
        )}

        {!editing ? (
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            {/* Main Content (Left) */}
            <div className="min-w-0 flex-1 w-full">
              {/* Document Masthead */}
              <header className="mb-8">
                <h1 className="display text-3xl sm:text-4xl font-extrabold text-[var(--ink)] leading-tight">
                  {title}
                </h1>
                {lead && (
                  <div className="mt-3 text-base text-[var(--ink-2)] leading-relaxed">
                    <MarkdownView>{lead}</MarkdownView>
                  </div>
                )}
              </header>

              {/* Generated Images */}
              {imageUrls.length > 0 && (
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                  {imageUrls.map((url, i) => (
                    <figure key={url} className="border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)]">
                      <img
                        src={url}
                        alt={`Illustration ${i + 1} for ${set.title}`}
                        className="w-full"
                      />
                      <figcaption className="label border-t border-[var(--rule)] px-3 py-1.5">
                        Generated
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}

              {/* Content Sections as Collapsible Cards */}
              {sections.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-end pb-1">
                    <button
                      onClick={toggleCollapseAll}
                      className="flex items-center gap-1.5 rounded-[4px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.08em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      {allCollapsed ? <ChevronsDown size={13} /> : <ChevronsUp size={13} />}
                      <span>{allCollapsed ? 'Expand all' : 'Collapse all'}</span>
                    </button>
                  </div>

                  {sections.map(section => {
                    const isOpen = !collapsedSections.has(section.id);
                    return (
                      <section
                        key={section.id}
                        id={section.id}
                        className="rounded-[6px] border border-[var(--rule)] bg-[#FAF8F5]/90 dark:bg-[var(--paper-2)] overflow-hidden transition-colors"
                      >
                        <button
                          onClick={() => toggleSection(section.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--rule)]/20"
                        >
                          <h2 className="text-lg font-bold text-[var(--ink)]">{section.title}</h2>
                          <ChevronDown
                            size={18}
                            className={`text-[var(--ink-2)] transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="border-t border-[var(--rule)]/70 px-6 py-5 bg-white/50 dark:bg-transparent">
                            <article>
                              <MarkdownView>{section.content}</MarkdownView>
                            </article>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <article className="rounded-[6px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] p-6">
                  <MarkdownView>{set.summary}</MarkdownView>
                </article>
              )}

              <div className="h-16" />
            </div>

            {/* Fixed / Sticky Outline Sidebar (Right) */}
            <aside className="w-full lg:w-56 lg:shrink-0 lg:sticky lg:top-0">
              <div className="border-b border-[var(--rule)] pb-4">
                <span className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] font-semibold">
                  Study guide
                </span>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={visualise} disabled={imageBusy} className={toolButton}>
                    {imageBusy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ImageIcon size={13} />
                    )}
                    <span>Visualise</span>
                  </button>
                  <button onClick={() => setEditing(true)} className={toolButton}>
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Outline Table of Contents */}
              {sections.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] font-semibold">
                      Outline
                    </span>
                    <button
                      onClick={toggleCollapseAll}
                      className="flex items-center gap-1 font-mono text-2xs uppercase tracking-[0.08em] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                      title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                    >
                      {allCollapsed ? <ChevronsDown size={12} /> : <ChevronsUp size={12} />}
                      <span>{allCollapsed ? 'Expand' : 'Collapse'}</span>
                    </button>
                  </div>

                  <nav className="flex flex-col space-y-3" aria-label="Table of contents">
                    {sections.map(section => {
                      const isActive = activeSectionId === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`text-left text-sm font-bold transition-colors duration-150 ${
                            isActive
                              ? 'text-[#0052FF]'
                              : 'text-[var(--ink)] hover:text-[#0052FF]'
                          }`}
                        >
                          {section.title}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}
            </aside>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-[var(--rule)] pb-3">
              {(
                [
                  [Bold, 'Bold', () => wrapSelection('**', '**')],
                  [Italic, 'Italic', () => wrapSelection('*', '*')],
                  [List, 'Bullet', () => wrapSelection('\n- ')],
                  [CheckSquare, 'Checkbox', () => wrapSelection('\n- [ ] ')],
                ] as const
              ).map(([Icon, label, action]) => (
                <button
                  key={label}
                  onClick={action}
                  title={label}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                >
                  <Icon size={15} />
                </button>
              ))}

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    setDraft(set.summary);
                    setEditing(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] hover:text-[var(--ink)]"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateSet({ ...set, summary: draft, title: titleFrom(draft) });
                    setEditing(false);
                  }}
                  className="flex items-center gap-1.5 rounded-[4px] bg-[#0052FF] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-white transition-transform active:scale-[0.97]"
                >
                  <Save size={13} />
                  Save
                </button>
              </div>
            </div>

            <textarea
              ref={textarea}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              aria-label="Edit study guide"
              className="ruled h-[60vh] w-full resize-none rounded-[4px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] px-4 py-[0.4rem] font-mono text-xs leading-[1.6rem] text-[var(--ink)] focus:border-[#0052FF] focus:outline-none"
            />
          </>
        )}
      </div>
    </div>
  );
}
