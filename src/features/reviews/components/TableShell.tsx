/**
 * The one table style in the report.
 *
 * Three tables here previously carried three hand-written copies of the same
 * header, border and padding classes, and they had already drifted — two
 * different greys for a header row, two different uppercase sizes. A report
 * whose tables do not match reads as assembled rather than authored.
 *
 * The shell owns the horizontal scroll, which is the other reason it exists:
 * these tables are genuinely wider than a phone, and they are the only
 * elements allowed to scroll sideways. The page itself never does.
 */

import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface TableShellProps {
  /** Describes the table for a screen reader. Always rendered, always hidden. */
  caption: string;
  /** Minimum width before the shell starts scrolling, e.g. `min-w-[46rem]`. */
  minWidth?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function TableShell({ caption, minWidth, className, children }: TableShellProps) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-card border border-border bg-surface shadow-rest',
        className,
      )}
    >
      <table className={cn('w-full border-collapse text-left text-sm', minWidth)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'bg-surface-muted/60 px-3 py-2.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-3 py-2.5 text-muted-foreground', className)} {...props} />;
}

/** A row header — the leftmost cell, which names what the row is about. */
export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-t border-border align-top transition-colors duration-[160ms] ease-glide hover:bg-surface-muted/50',
        className,
      )}
      {...props}
    />
  );
}
