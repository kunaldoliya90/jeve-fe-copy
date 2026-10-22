import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  icon?: LucideIcon | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * The "no data yet" state. Worth a shared component because an empty list and
 * a failed request look identical otherwise, and users read both as broken.
 */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex animate-fade flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface-sunken p-10 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-pill bg-surface-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
      ) : null}

      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {action}
    </div>
  );
}
