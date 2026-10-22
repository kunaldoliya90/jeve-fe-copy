/**
 * A numbered section of the review report.
 *
 * The numbers are not decoration. The report is read top to bottom in a
 * meeting — which entry, what it scored, which parameters decided that, what
 * evidence stood behind them — and a number is how one person says "look at
 * three" to another. They are also anchors, so a section can be linked to.
 */

import type { ReactNode } from 'react';

import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';

interface SectionProps {
  /** Position in the report, shown in the badge. */
  index: number;
  id: string;
  title: string;
  /** Shown right-aligned on the heading row, for a total or a count. */
  aside?: ReactNode;
  children: ReactNode;
}

export function Section({ index, id, title, aside, children }: SectionProps) {
  return (
    <Card
      as="section"
      id={id}
      aria-labelledby={`${id}-heading`}
      tone="sunken"
      elevation="flat"
      // Most of a report is off-screen. Skipping layout and paint for the
      // sections nobody has scrolled to is the single biggest rendering win
      // on this page, and the intrinsic size keeps the scrollbar steady.
      className="scroll-mt-24 p-4 defer-paint sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/*
          The number sits inside the heading rather than beside it, so it is
          part of the section's accessible name: "look at three" has to work
          for somebody listening to the report as well as for somebody
          pointing at it.
        */}
        <h2
          id={`${id}-heading`}
          className="flex items-center gap-3 text-[0.9375rem] font-semibold text-foreground-strong"
        >
          <span className="flex size-7 flex-none items-center justify-center rounded-pill bg-primary/10 font-mono text-xs font-semibold text-primary">
            {index}
          </span>
          {/* The space is load-bearing: without a whitespace node between
              them the accessible name computes as "3Key tested parameters". */}{' '}
          {title}
        </h2>
        {aside ? <div className="text-sm text-muted-foreground">{aside}</div> : null}
      </div>
      {children}
    </Card>
  );
}

const toneClass = {
  default: 'border-border bg-surface text-foreground',
  danger: 'border-danger/30 bg-danger/[0.07] text-danger',
  warning: 'border-warning/40 bg-warning/[0.08] text-foreground',
  success: 'border-success/30 bg-success/[0.07] text-success',
} as const;

/**
 * One labelled value in a section's header strip.
 *
 * The value wraps rather than truncating. These cards sit six to a row, so a
 * perfectly ordinary entry type — "France vacation accrual" — was being cut
 * to "France vacation a…", and the tooltip carried the *hint* rather than the
 * value, so there was no way to read the rest of it at all. A strip of facts
 * that hides the fact is worse than a strip one line taller.
 */
export function Field({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  tone?: keyof typeof toneClass | undefined;
}) {
  // Only a plain string can be put in a tooltip; a rendered node is left to
  // the hint alone rather than stringified into something like "[object]".
  const spoken = typeof value === 'string' ? value : null;
  // Two lines rather than one joined by a dash: a native tooltip honours a
  // newline, and the value and the explanation of it are two separate things.
  const title = [spoken, hint].filter(Boolean).join('\n') || undefined;

  return (
    <div className={cn('flex flex-col rounded-lg border px-3 py-2 shadow-rest', toneClass[tone])}>
      <dt className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className="mt-1 text-sm leading-snug font-semibold text-pretty break-words hyphens-auto"
        {...(title ? { title } : {})}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A value nobody supplied.
 *
 * Said in words and in the ordinary weight, because a bare dash in a bold
 * slot is indistinguishable from a field that failed to load — and a reader
 * who cannot tell those apart will distrust the five beside it too.
 */
export function NotStated({ children = 'Not stated' }: { children?: ReactNode }) {
  return <span className="font-normal text-subtle-foreground">{children}</span>;
}
