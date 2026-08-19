import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, Eye, EyeOff, Trash2, Upload } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { getAllSets, getBlobsByKey, putBlobAt, putMeta, putSet, resetDb } from '../../lib/db';
import { blobToBase64, buildExport, downloadJson, exportFilename, imageKeys } from '../../lib/export';
import { base64ToBlob, mergeFolders, parseBackup, planMerge } from '../../lib/backup';
import type { AppMeta, StudySet } from '../../types';

const FOCUS_OPTIONS = [15, 25, 45, 60] as const;
const WIPE_PHRASE = 'DELETE';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  meta: AppMeta | null;
  onUpdate: (patch: Partial<AppMeta>) => Promise<void>;
  sets: StudySet[];
  /** Called after a restore, so the library reflects it immediately. */
  onRestored?: () => Promise<void> | void;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--rule)] pt-5 first:border-t-0 first:pt-0">
      <h3 className="label mb-3">{label}</h3>
      {children}
    </section>
  );
}

/** Row of mutually exclusive choices, drawn as one ruled block. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format = String,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  format?: (option: T) => string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[4px] border border-[var(--rule)]">
      {options.map(option => {
        const selected = option === value;
        return (
          <button
            key={String(option)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`flex-1 border-r border-[var(--rule)] py-2 font-mono text-2xs font-semibold uppercase tracking-[0.1em] transition-colors last:border-r-0 ${
              selected
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'text-[var(--ink-2)] hover:bg-[var(--paper-3)]'
            }`}
          >
            {format(option)}
          </button>
        );
      })}
    </div>
  );
}

export default function Settings({ open, onClose, meta, onUpdate, sets, onRestored }: SettingsProps) {
  const [keyDraft, setKeyDraft] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wipeDraft, setWipeDraft] = useState('');
  const [restoreNote, setRestoreNote] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hasEnvKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  // Reset the transient bits every time the sheet opens so a stale draft or a
  // half-typed wipe confirmation never carries over.
  useEffect(() => {
    if (!open) return;
    setKeyDraft('');
    setRevealed(false);
    setSaved(false);
    setWipeDraft('');
    setRestoreNote(null);
  }, [open]);

  if (!meta) return null;

  const storedKey = meta.apiKey;

  const saveKey = async () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    await onUpdate({ apiKey: trimmed });
    setKeyDraft('');
    setRevealed(false);
    setSaved(true);
  };

  const removeKey = async () => {
    await onUpdate({ apiKey: null });
    setSaved(false);
  };

  /** Illustrations live in a separate store, so a backup has to fetch them. */
  const exportAll = async () => {
    const now = new Date();
    const blobs = await getBlobsByKey(imageKeys(sets));
    const encoded: Record<string, string> = {};
    for (const [key, blob] of Object.entries(blobs)) {
      encoded[key] = await blobToBase64(blob);
    }
    downloadJson(buildExport(sets, meta, now, encoded), exportFilename(now));
  };

  const importBackup = async (file: File) => {
    setRestoreNote(null);
    try {
      const parsed = parseBackup(await file.text());
      // Counted against storage, not the rendered list, so the tally is true
      // even if the two have drifted.
      const plan = planMerge(await getAllSets(), parsed.sets);

      // Images first: a set is written only once the pictures it points at
      // are already in place, so a failure halfway cannot leave gaps.
      for (const [key, data] of Object.entries(parsed.blobs)) {
        await putBlobAt(key, base64ToBlob(data));
      }
      for (const set of parsed.sets) await putSet(set);
      if (parsed.folders.length > 0) {
        await putMeta({ folders: mergeFolders(meta.folders ?? [], parsed.folders) });
      }

      const parts = [
        plan.added > 0 ? `${plan.added} added` : null,
        plan.replaced > 0 ? `${plan.replaced} replaced` : null,
        parsed.missingImages > 0
          ? `${parsed.missingImages} image${parsed.missingImages === 1 ? '' : 's'} were not in the file`
          : null,
      ].filter(Boolean);
      await onRestored?.();
      setRestoreNote({ tone: 'ok', text: `Restored — ${parts.join(', ')}.` });
    } catch (e) {
      setRestoreNote({
        tone: 'bad',
        text: e instanceof Error ? e.message : 'That file could not be read.',
      });
    }
  };

  const wipe = async () => {
    await resetDb();
    window.location.reload();
  };

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="space-y-6">
        {/* Theme lives on the sidebar footer, next to Settings. */}
        <Section label="Gemini API key">
          {storedKey ? (
            <div className="flex items-center justify-between gap-3 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5">
              <span className="numeral flex items-center gap-2 text-xs text-[var(--ink)]">
                <Check size={14} style={{ color: 'var(--green)' }} />
                Key saved ·&nbsp;
                {revealed ? storedKey : `••••••••${storedKey.slice(-4)}`}
              </span>
              <button
                onClick={() => setRevealed(v => !v)}
                aria-label={revealed ? 'Hide API key' : 'Show API key'}
                className="shrink-0 text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type={revealed ? 'text' : 'password'}
                value={keyDraft}
                onChange={e => setKeyDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void saveKey();
                }}
                placeholder="AIza…"
                aria-label="Gemini API key"
                autoComplete="off"
                spellCheck={false}
                className="h-9 min-w-0 flex-1 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-3 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none"
              />
              <button
                onClick={() => setRevealed(v => !v)}
                aria-label={revealed ? 'Hide API key' : 'Show API key'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule)] text-[var(--ink-3)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {storedKey ? (
              <Button size="sm" variant="quiet" onClick={() => void removeKey()}>
                Remove key
              </Button>
            ) : (
              <Button size="sm" variant="primary" disabled={!keyDraft.trim()} onClick={() => void saveKey()}>
                Save key
              </Button>
            )}
            {saved && !storedKey && (
              <span className="label" style={{ color: 'var(--green)' }}>
                Saved
              </span>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--ink-2)]">
            {storedKey
              ? 'Stored in this browser only — it never leaves your device except to call Google.'
              : hasEnvKey
                ? 'A key from your .env is in use. Saving one here overrides it.'
                : 'Without a key you can still study saved sets and the demo, but new sets cannot be generated.'}
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block font-mono text-2xs uppercase tracking-[0.1em] text-[var(--ink-3)] underline underline-offset-4 transition-colors hover:text-[var(--ink)]"
          >
            Get a key
          </a>
        </Section>

        <Section label="Focus session">
          <Segmented
            label="Default focus duration"
            options={FOCUS_OPTIONS}
            value={
              (FOCUS_OPTIONS.find(m => m === meta.focus.durationMin) ??
                FOCUS_OPTIONS[1]) as (typeof FOCUS_OPTIONS)[number]
            }
            onChange={durationMin => void onUpdate({ focus: { ...meta.focus, durationMin } })}
            format={m => `${m}m`}
          />
          <p className="mt-3 text-xs text-[var(--ink-2)]">
            {meta.focus.sessions > 0
              ? `${meta.focus.sessions} sessions · ${Math.round(meta.focus.totalMs / 60000)} minutes focused so far.`
              : 'No focus sessions yet.'}
          </p>
        </Section>

        <Section label="Your data">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void exportAll()}
              disabled={sets.length === 0}
            >
              <Download size={14} />
              Export {sets.length} {sets.length === 1 ? 'set' : 'sets'}
            </Button>

            <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
              <Upload size={14} />
              Import backup
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a CocoStudy backup file"
              onChange={e => {
                const file = e.target.files?.[0];
                // Cleared so picking the same file twice still fires a change.
                e.target.value = '';
                if (file) void importBackup(file);
              }}
            />
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
            A JSON file with every set, your progress and any generated illustrations. The API
            key is left out. Importing adds to what is here rather than replacing it — a set
            that already exists is overwritten by the one in the file.
          </p>

          {restoreNote && (
            <p
              className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed"
              style={{ color: restoreNote.tone === 'ok' ? 'var(--ink)' : 'var(--red)' }}
              role="status"
            >
              {restoreNote.tone === 'ok' ? (
                <Check size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--green)' }} />
              ) : (
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              )}
              {restoreNote.text}
            </p>
          )}

          <div className="mt-5 border-l-2 pl-4" style={{ borderLeftColor: 'var(--red)' }}>
            <p className="text-xs leading-relaxed text-[var(--ink)]">
              Delete everything — sets, cards, progress, and your key. This cannot be undone.
            </p>
            <input
              value={wipeDraft}
              onChange={e => setWipeDraft(e.target.value)}
              placeholder={`Type ${WIPE_PHRASE} to confirm`}
              aria-label={`Type ${WIPE_PHRASE} to confirm deleting everything`}
              autoComplete="off"
              className="mt-3 h-9 w-full rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-3 font-mono text-xs uppercase tracking-[0.1em] text-[var(--ink)] placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--ink-3)] focus:border-[var(--red)] focus:outline-none"
            />
            <Button
              size="sm"
              variant="danger"
              className="mt-2"
              disabled={wipeDraft.trim().toUpperCase() !== WIPE_PHRASE}
              onClick={() => void wipe()}
            >
              <Trash2 size={14} />
              Delete everything
            </Button>
          </div>
        </Section>
      </div>
    </Sheet>
  );
}
