import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Edit3,
  Eye,
  Image as ImageIcon,
  Loader2,
  PenLine,
  Save,
  X,
} from 'lucide-react';
import { getBlobUrl, putBlob } from '../../lib/db';
import { slugify, stickyOffset } from '../../lib/anchors';
import { shouldAnimate } from '../../lib/motion';
import { generateStudyImage } from '../../services/ai';
import MarkdownView from './MarkdownView';
import RichEditor from './RichEditor';
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

interface ParsedNote {
  title: string;
  lead: string;
  sections: NoteSection[];
}

/**
 * Splits notes markdown into document header, lead paragraph, and collapsible H2 sections.
 */
function parseNoteSections(markdown: string, fallbackTitle: string): ParsedNote {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  const leadLines: string[] = [];
  const sections: NoteSection[] = [];

  let currentSection: { title: string; lines: string[] } | null = null;
  let inLead = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Top-level title (# Title)
    const h1Match = line.match(/^#[ \t]+(.*)$/);
    if (h1Match && !title) {
      title = h1Match[1].trim();
      continue;
    }

    // Section title (## Section)
    const h2Match = line.match(/^##[ \t]+(.*)$/);
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
  const [editTab, setEditTab] = useState<'write' | 'preview'>('write');
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);


  const scrollContainer = useRef<HTMLDivElement>(null);


  const { title, lead, sections } = useMemo(
    () => parseNoteSections(set.summary, set.title),
    [set.summary, set.title],
  );

  useEffect(() => {
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
          top: pane.scrollTop + top - 24 - stickyOffset(pane),
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

  const startEditing = () => {
    const match = /^#[ \t]+(.*)$/m.exec(set.summary);
    const extractedTitle = match?.[1]?.trim() || set.title || title;
    const extractedBody = set.summary.replace(/^#[ \t]+.*(\r?\n)*/m, '').trim();
    setTitleDraft(extractedTitle);
    setBodyDraft(extractedBody);
    setEditTab('write');
    setEditing(true);
  };

  const handleSave = () => {
    const finalTitle = titleDraft.trim() || 'Untitled Note';
    const finalSummary = bodyDraft.trim() ? `# ${finalTitle}\n\n${bodyDraft.trim()}` : `# ${finalTitle}`;
    onUpdateSet({ ...set, summary: finalSummary, title: finalTitle });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };




  const wordCount = useMemo(() => {
    const text = `${titleDraft} ${bodyDraft}`.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [titleDraft, bodyDraft]);

  const charCount = useMemo(() => {
    return `${titleDraft}\n\n${bodyDraft}`.trim().length;
  }, [titleDraft, bodyDraft]);

  const toolButton =
    'flex min-h-11 items-center gap-1.5 rounded-[4px] border border-[var(--rule)] px-4 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-150 hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-50 sm:min-h-0 sm:px-3';

  return (
    <div ref={scrollContainer} className="pb-safe [--pb-base:2rem] h-full overflow-y-auto px-4 sm:px-10">
      <div className="mx-auto max-w-5xl pt-8">
        {imageError && (
          <div className="mb-6">
            <Banner tone="error" onDismiss={() => setImageError(null)}>
              {imageError}
            </Banner>
          </div>
        )}

        {!editing ? (
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            {/*
             * The contents, lying down as a row of section tabs and pinned to
             * the top of the pane so a jump is always one thumb away.
             *
             * It is a child of this container rather than of the rail because a
             * sticky element only stays put while its own parent is on screen,
             * and the rail is 200px tall — it would come unstuck almost at once.
             * The rail keeps its own vertical copy for wide screens; only one of
             * the two is ever displayed, so there is no duplicate landmark.
             */}
            {sections.length > 0 && (
              <nav
                data-sticky-offset
                aria-label="Table of contents"
                className="no-scrollbar sticky top-0 z-10 order-2 -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto border-b border-[var(--rule)] bg-[var(--paper)] px-4 py-2.5 lg:hidden"
              >
                {sections.map(section => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`shrink-0 whitespace-nowrap rounded-[4px] border px-3 py-2 text-left text-sm font-bold transition-colors duration-150 ${
                        isActive
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--rule)] text-[var(--ink)] hover:text-[var(--accent)]'
                      }`}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Main Content (Left) */}
            <div className="order-3 min-w-0 flex-1 w-full lg:order-none">
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

              {/* Images */}
              {imageUrls.length > 0 && (
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {imageUrls.map((url, i) => (
                    <figure key={url} className="border border-[var(--rule)] bg-[var(--paper-2)]">
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
                  {sections.map(section => {
                    const isOpen = !collapsedSections.has(section.id);
                    return (
                      <section
                        key={section.id}
                        id={section.id}
                        className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] overflow-hidden transition-colors"
                      >
                        <button
                          onClick={() => toggleSection(section.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--rule)]/20"
                        >
                          <h2 className="text-lg font-bold text-[var(--ink)]">{section.title}</h2>
                          <div className="text-[var(--ink-3)] transition-transform duration-200">
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-[var(--rule)] px-6 py-6 text-sm leading-relaxed text-[var(--ink)]">
                            <MarkdownView>{section.content}</MarkdownView>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] p-6">
                  <MarkdownView>{set.summary}</MarkdownView>
                </div>
              )}
            </div>

            {/* Study Guide Sidebar (Right - Sticky) */}
            <aside className="order-1 w-full shrink-0 lg:order-none lg:sticky lg:top-0 lg:w-56">
              <div className="border-b border-[var(--rule)] pb-4">
                <span className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] font-semibold">
                  Study Guide
                </span>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={visualise} disabled={imageBusy} className={toolButton}>
                    {imageBusy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ImageIcon size={13} />
                    )}
                    <span>Visualise</span>
                  </button>
                  <button onClick={startEditing} className={toolButton}>
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* The rail's own copy of the contents, beside the guide. */}
              {sections.length > 0 && (
                <div className="mt-6 hidden lg:block">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] font-semibold">
                      Outline
                    </span>
                    <button
                      onClick={toggleCollapseAll}
                      className="-my-2 flex items-center gap-1 py-2 font-mono text-2xs uppercase tracking-[0.08em] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
                      title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                    >
                      {allCollapsed ? <ChevronsDown size={12} /> : <ChevronsUp size={12} />}
                      <span>{allCollapsed ? 'Expand' : 'Collapse'}</span>
                    </button>
                  </div>

                  <nav className="flex flex-col space-y-3" aria-label="Table of contents">
                    {sections.map(section => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`text-left text-sm font-bold transition-colors duration-150 ${
                          activeSectionId === section.id
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--ink)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </aside>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Action & Mode Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-3">
              <div className="flex items-center gap-1 rounded-[6px] border border-[var(--rule)] bg-[var(--paper)] p-0.5">
                <button
                  type="button"
                  onClick={() => setEditTab('write')}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                    editTab === 'write'
                      ? 'bg-[var(--paper-2)] text-[var(--accent)] shadow-xs'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                  }`}
                >
                  <PenLine size={12} />
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab('preview')}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                    editTab === 'preview'
                      ? 'bg-[var(--paper-2)] text-[var(--accent)] shadow-xs'
                      : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Eye size={12} />
                  Preview
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] dark:bg-[var(--paper)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-[4px] bg-[var(--accent)] px-4 py-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:bg-[var(--accent-strong)] active:scale-[0.97]"
                >
                  <Save size={13} />
                  Save Notes
                </button>
              </div>
            </div>

            {/* Note Title Input Field */}
            <div>
              <label
                htmlFor="notes-title-input"
                className="block font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ink-3)] mb-1.5"
              >
                Note Title
              </label>
              <input
                id="notes-title-input"
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                placeholder="Title of your study notes..."
                className="w-full rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-2.5 font-bold text-lg sm:text-xl text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
            </div>

            {editTab === 'write' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="notes-content-textarea"
                    className="block font-mono text-2xs font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]"
                  >
                    Notes Content
                  </label>
                  <span className="font-mono text-2xs text-[var(--ink-3)]">
                    {wordCount} words · {charCount} chars
                  </span>
                </div>

                {/*
                  * The markdown toolbar and the raw field it drove are gone.
                  * The document is edited as a document now; the editor owns
                  * its own history, so undo and the formatting shortcuts are
                  * the ones every other editor has already taught people.
                  */}
                <RichEditor value={bodyDraft} onChange={setBodyDraft} />

                <div className="flex items-center justify-between text-2xs text-[var(--ink-3)] px-1">
                  <span>Ctrl+B bold · Ctrl+I italic · Ctrl+Z undo · markdown shortcuts still work as you type</span>
                </div>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)] p-6 sm:p-8 min-h-[55vh]">
                <div className="border-b border-[var(--rule)] pb-4 mb-6">
                  <span className="font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] font-semibold">
                    Preview Mode
                  </span>
                  <h1 className="display mt-2 text-2xl sm:text-3xl font-extrabold text-[var(--ink)]">
                    {titleDraft || 'Untitled Note'}
                  </h1>
                </div>

                {bodyDraft.trim() ? (
                  <MarkdownView>{bodyDraft}</MarkdownView>
                ) : (
                  <p className="text-sm italic text-[var(--ink-3)]">No content to preview yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
