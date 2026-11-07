/**
 * A numbered section of the review report.
 *
 * The numbers are not decoration. The report is read top to bottom in a
 * meeting — which entry, what it scored, which parameters decided that, what
 * evidence stood behind them — and a number is how one person says "look at
 * three" to another. They are also anchors, so a section can be linked to.
 */

import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';

/**
 * The wash a section carries, so the report's parts are told apart by colour
 * as well as by number.
 *
 * Four washes rather than a free `className`: a reader scrolling a long report
 * learns that the evidence register is the cool one and the work paper the blue
 * one, and that only holds while the set is closed. Every wash is a tint of a
 * palette token, never a literal colour, so each one swaps with the theme — a
 * hardcoded cream panel is unreadable the moment the page goes dark.
 */
const washClass = {
  /** The default. Recedes, so the cards inside it carry the page. */
  neutral: '',
  /** Warm. For the parameters, which are the section a reader argues with. */
  accent: 'border-accent/30 bg-accent/[0.06]',
  /** Cool. For the evidence register. */
  info: 'border-info/25 bg-info/[0.05]',
  /** For the work papers, which are the arithmetic rather than the finding. */
  primary: 'border-primary/20 bg-primary/[0.04]',
} as const;

interface SectionProps {
  /** Position in the report, shown in the badge. */
  index: number;
  id: string;
  title: string;
  /** Shown right-aligned on the heading row, for a total or a count. */
  aside?: ReactNode;
  /** The section's background tint. See `washClass`. */
  wash?: keyof typeof washClass | undefined;
  children: ReactNode;
}

export function Section({ index, id, title, aside, wash = 'neutral', children }: SectionProps) {
  return (
    <Card
      as="section"
      id={id}
      aria-labelledby={`${id}-heading`}
      tone={wash === 'neutral' ? 'sunken' : 'default'}
      elevation="flat"
      // Most of a report is off-screen. Skipping layout and paint for the
      // sections nobody has scrolled to is the single biggest rendering win
      // on this page, and the intrinsic size keeps the scrollbar steady.
      className={cn('scroll-mt-24 p-4 defer-paint sm:p-5', washClass[wash])}
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
          <span className="flex size-7 flex-none items-center justify-center rounded-pill bg-gradient-to-br from-primary to-primary-active font-mono text-xs font-semibold text-primary-foreground shadow-rest inset-shadow-2xs inset-shadow-white/20">
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

/**
 * A lettered block inside a numbered section.
 *
 * The work papers are long enough that their parts need names of their own, and
 * letters keep the report's numbered spine readable: it still runs 1, 2, 3
 * while "six B" names the tie-out table inside section six.
 *
 * Shared by both work papers rather than written twice. The two had one copy
 * each of this for about a day, which is how the three report tables came to
 * carry two different greys for a header row before `TableShell` existed.
 *
 * `collapsible` closes a block that is reference material rather than a
 * finding — the reader opens it when they want it instead of scrolling past it
 * every time. The heading stays inside the `summary`, which the HTML spec
 * allows precisely so a closed disclosure still carries its own name in the
 * document outline. The print stylesheet (`globals.css`) forces every
 * disclosure open, so a collapsed block still prints in full.
 *
 * `lazy` goes further and does not mount the children until the block is first
 * opened. Only for a block whose children fetch: a closed `details` still
 * renders its contents into the DOM, so a grid that queries the server on mount
 * would pay for a page of rows nobody asked to see. The trade is that a block
 * never opened has nothing to print, so this is for screen-only tools — a
 * server-paginated grid cannot print in full by its nature anyway.
 */
export function Block({
  prefix,
  letter,
  title,
  note,
  collapsible = false,
  lazy = false,
  children,
}: {
  /** The owning section's id, so two work papers on one page keep distinct anchors. */
  prefix: string;
  letter: string;
  title: string;
  note?: string | undefined;
  /** Closed by default, for a block a reader consults rather than reads. */
  collapsible?: boolean | undefined;
  /** Hold the children back until first opened. Needs `collapsible`; see above. */
  lazy?: boolean | undefined;
  children: ReactNode;
}) {
  const id = `${prefix}-${letter.toLowerCase()}`;
  // Latched rather than tracking `open`: once mounted the children keep their
  // own state, so collapsing the block must not throw away the reader's paging
  // and filters and re-query the server when they open it again.
  const [opened, setOpened] = useState(false);

  /*
    The letter is inside the heading and not aria-hidden, the same way
    `Section` carries its number: "look at four B" has to work for somebody
    listening to the report as well as for somebody pointing at it, and the
    print stylesheet drops `[aria-hidden]` elements outright, so a decorative
    letter prints as nothing at all.
  */
  const heading = (
    <h3
      id={`${id}-heading`}
      className="flex items-baseline gap-2.5 text-sm font-semibold text-foreground"
    >
      <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-accent-strong">
        {letter}
      </span>{' '}
      {title}
    </h3>
  );

  const body = (
    <>
      {note ? (
        <p className="mt-1 mb-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </>
  );

  if (collapsible) {
    return (
      <details
        className="group scroll-mt-24"
        onToggle={(event) => {
          if (event.currentTarget.open) setOpened(true);
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2.5 select-none [&::-webkit-details-marker]:hidden">
          {heading}
          <ChevronDown
            aria-hidden="true"
            className="duration-quick size-4 shrink-0 text-muted-foreground transition-transform ease-out-soft group-open:rotate-180"
          />
        </summary>
        <div className="mt-2">{lazy && !opened ? null : body}</div>
      </details>
    );
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      {heading}
      {body}
    </section>
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
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  tone?: keyof typeof toneClass | undefined;
  /**
   * Centre the card and set the value large.
   *
   * For the one fact in the strip that is a conclusion rather than an
   * identifier — the compliance band. It is read across the room, and a
   * conclusion set in the same size as a period code is one a reader scans
   * past.
   */
  emphasis?: boolean | undefined;
}) {
  // Only a plain string can be put in a tooltip; a rendered node is left to
  // the hint alone rather than stringified into something like "[object]".
  const spoken = typeof value === 'string' ? value : null;
  // Two lines rather than one joined by a dash: a native tooltip honours a
  // newline, and the value and the explanation of it are two separate things.
  const title = [spoken, hint].filter(Boolean).join('\n') || undefined;

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border px-3 py-2 shadow-rest',
        toneClass[tone],
        emphasis && 'items-center justify-center text-center',
      )}
    >
      <dt className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 leading-snug font-semibold text-pretty break-words hyphens-auto',
          emphasis ? 'text-lg sm:text-xl' : 'text-sm',
        )}
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
