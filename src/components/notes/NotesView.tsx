import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Code,
  Edit3,
  Eye,
  FileCode,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PenLine,
  PlusCircle,
  Quote,
  Save,
  X,
} from 'lucide-react';
import { getBlobUrl, putBlob } from '../../lib/db';
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

  const textarea = useRef<HTMLTextAreaElement>(null);
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

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    setBodyDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        el.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      }
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const lastNewline = value.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    setBodyDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };

  const insertBlock = (block: string) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const prefix = start > 0 && !value.slice(0, start).endsWith('\n\n') ? '\n\n' : '';
    const suffix = !value.slice(end).startsWith('\n\n') ? '\n\n' : '';
    const insertion = `${prefix}${block}${suffix}`;
    const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    setBodyDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  };

  const wordCount = useMemo(() => {
    const text = `${titleDraft} ${bodyDraft}`.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [titleDraft, bodyDraft]);

  const charCount = useMemo(() => {
    return `${titleDraft}\n\n${bodyDraft}`.trim().length;
  }, [titleDraft, bodyDraft]);

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

              {/* Images */}
              {imageUrls.length > 0 && (
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-0">
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
          <div className="space-y-4">
            {/* Header Action & Mode Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-3">
              <div className="flex items-center gap-1 rounded-[6px] border border-[var(--rule)] bg-[var(--paper)] p-0.5">
                <button
                  type="button"
                  onClick={() => setEditTab('write')}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                    editTab === 'write'
                      ? 'bg-white dark:bg-[var(--paper-2)] text-[#0052FF] shadow-xs'
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
                      ? 'bg-white dark:bg-[var(--paper-2)] text-[#0052FF] shadow-xs'
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
                  className="flex items-center gap-1.5 rounded-[4px] border border-[var(--rule)] bg-white dark:bg-[var(--paper)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-[4px] bg-[#0052FF] px-4 py-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:bg-[#0047E0] active:scale-[0.97]"
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
                className="w-full rounded-[6px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] px-4 py-2.5 font-bold text-lg sm:text-xl text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[#0052FF] focus:outline-none transition-colors"
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

                {/* Comprehensive Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1 rounded-[6px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] p-1.5 shadow-2xs">
                  {/* Headings */}
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('## ')}
                    title="Section Heading (H2)"
                    className="flex h-7 items-center gap-1 rounded-[3px] px-2 text-2xs font-bold text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Heading2 size={14} />
                    <span>H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('### ')}
                    title="Sub-heading (H3)"
                    className="flex h-7 items-center gap-1 rounded-[3px] px-2 text-2xs font-bold text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Heading3 size={14} />
                    <span>H3</span>
                  </button>

                  <div className="h-4 w-px bg-[var(--rule)] mx-1" />

                  {/* Inline Text Styles */}
                  <button
                    type="button"
                    onClick={() => wrapSelection('**', '**')}
                    title="Bold (**text**)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection('*', '*')}
                    title="Italic (*text*)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection('`', '`')}
                    title="Inline Code (`code`)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Code size={14} />
                  </button>

                  <div className="h-4 w-px bg-[var(--rule)] mx-1" />

                  {/* Lists */}
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('- ')}
                    title="Bullet List (- item)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('1. ')}
                    title="Numbered List (1. item)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <ListOrdered size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('- [ ] ')}
                    title="Task Checklist (- [ ] task)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <CheckSquare size={14} />
                  </button>

                  <div className="h-4 w-px bg-[var(--rule)] mx-1" />

                  {/* Blocks & Inserts */}
                  <button
                    type="button"
                    onClick={() => insertLinePrefix('> ')}
                    title="Quote Block (> quote)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Quote size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertBlock('```\ncode here\n```')}
                    title="Code Block (```)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <FileCode size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertBlock('---')}
                    title="Horizontal Divider (---)"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
                  >
                    <Minus size={14} />
                  </button>

                  {/* Quick Add Section Template */}
                  <button
                    type="button"
                    onClick={() => insertBlock('## New Section\n\n- Key point 1\n- Key point 2')}
                    className="ml-auto inline-flex items-center gap-1 rounded-[3px] bg-[#0052FF]/10 px-2 py-1 font-mono text-2xs font-semibold text-[#0052FF] hover:bg-[#0052FF]/20"
                    title="Add a new structured section template"
                  >
                    <PlusCircle size={12} />
                    <span>Add Section</span>
                  </button>
                </div>

                {/* Clean, Modern Editor Textarea */}
                <textarea
                  id="notes-content-textarea"
                  ref={textarea}
                  value={bodyDraft}
                  onChange={e => setBodyDraft(e.target.value)}
                  placeholder="Write or customize your notes... Use ## for headings, - for bullet points, and ``` for code blocks."
                  aria-label="Edit study guide content"
                  className="h-[55vh] w-full resize-none rounded-[6px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] p-4 font-sans text-sm sm:text-base leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[#0052FF] focus:outline-none transition-colors"
                />

                <div className="flex items-center justify-between text-2xs text-[var(--ink-3)] px-1">
                  <span>Formatting tips: <code className="bg-[var(--paper-3)] px-1 rounded">## Heading</code> <code className="bg-[var(--paper-3)] px-1 rounded">**bold**</code> <code className="bg-[var(--paper-3)] px-1 rounded">*italic*</code> <code className="bg-[var(--paper-3)] px-1 rounded">- list</code></span>
                </div>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="rounded-[6px] border border-[var(--rule)] bg-white dark:bg-[var(--paper-2)] p-6 sm:p-8 min-h-[55vh]">
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
