import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink-2)] disabled:bg-[var(--ink-3)]',
  ghost:
    'border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper-2)]',
  quiet: 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-3)]',
  danger: 'border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red)] hover:text-[var(--paper)]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
};

export default function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={[
        'inline-flex items-center justify-center rounded-[4px] font-mono font-semibold uppercase tracking-[0.1em]',
        // Press feedback: scale 0.97, instant. No JS needed.
        'transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
