import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string | undefined;
  /** Primary actions for the page, right-aligned on wide viewports. */
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
