import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  Edit3,
  Image as ImageIcon,
  Italic,
  List,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { getBlobUrl, putBlob } from '../../lib/db';
import { generateStudyImage } from '../../services/ai';
import MarkdownView from './MarkdownView';
import Banner from '../ui/Banner';
import type { StudySet } from '../../types';

interface NotesViewProps {
  set: StudySet;
  onUpdateSet: (set: StudySet) => void;
}

export default function NotesView({ set, onUpdateSet }: NotesViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(set.summary);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(set.summary);
    setEditing(false);
  }, [set.id, set.summary]);

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
    <div className="h-full overflow-y-auto px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        {imageError && (
          <div className="mb-6">
            <Banner tone="error" onDismiss={() => setImageError(null)}>
              {imageError}
            </Banner>
          </div>
        )}

        {!editing ? (
          <>
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--rule)] pb-3">
              <span className="label">Study guide</span>
              <div className="flex gap-2">
                <button onClick={visualise} disabled={imageBusy} className={toolButton}>
                  {imageBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ImageIcon size={13} />
                  )}
                  {imageBusy ? 'Drawing' : 'Visualise'}
                </button>
                <button onClick={() => setEditing(true)} className={toolButton}>
                  <Edit3 size={13} />
                  Edit
                </button>
              </div>
            </div>

            {imageUrls.length > 0 && (
              <div className="mb-10 grid gap-4 sm:grid-cols-2">
                {imageUrls.map((url, i) => (
                  <figure key={url} className="border border-[var(--rule)]">
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

            <article>
              <MarkdownView>{set.summary}</MarkdownView>
            </article>

            <div className="h-16" />
          </>
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
                    onUpdateSet({ ...set, summary: draft });
                    setEditing(false);
                  }}
                  className="flex items-center gap-1.5 rounded-[4px] bg-[var(--ink)] px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] text-[var(--paper)] transition-transform active:scale-[0.97]"
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
              className="ruled h-[60vh] w-full resize-none rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-[0.4rem] font-mono text-xs leading-[1.6rem] text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
            />
          </>
        )}
      </div>
    </div>
  );
}
