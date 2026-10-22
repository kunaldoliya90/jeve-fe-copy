import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string | undefined;
  /** A short label above the title — the section the page belongs to. */
  eyebrow?: string | undefined;
  /** Primary actions for the page, right-aligned on wide viewports. */
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex animate-rise flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.14em] text-accent-strong uppercase">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-[1.75rem] leading-tight font-semibold text-foreground-strong sm:text-[2rem]">
          {title}
        </h1>

        {description ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
