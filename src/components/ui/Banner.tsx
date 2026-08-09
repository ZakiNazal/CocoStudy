import { X } from 'lucide-react';

interface BannerProps {
  tone?: 'error' | 'info';
  children: React.ReactNode;
  onDismiss?: () => void;
}

export default function Banner({ tone = 'info', children, onDismiss }: BannerProps) {
  const accent = tone === 'error' ? 'var(--red)' : 'var(--cyan)';

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex items-start gap-3 border-l-2 bg-[var(--paper-2)] px-4 py-3"
      style={{ borderLeftColor: accent }}
    >
      <span className="label shrink-0 pt-0.5" style={{ color: accent }}>
        {tone === 'error' ? 'Error' : 'Note'}
      </span>
      <p className="flex-1 text-sm text-[var(--ink)]">{children}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
