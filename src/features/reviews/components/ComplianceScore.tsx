/**
 * The compliance score, and the written summary standing behind it.
 *
 * The gauge is read first and argued with afterwards, so it carries its
 * qualifications on its face: a provisional score says so next to the number,
 * and a review with no score shows no dial at all rather than an empty one at
 * zero. Nought out of a hundred and "nobody has checked" are different
 * findings, and a dial cannot tell them apart.
 *
 * The summary beside it is the paragraph a reviewer quotes in a meeting, and
 * it arrives as a single block of prose carrying five separate findings,
 * schema names, defect counts and a citation marker repeated on every
 * sentence. It is laid out here as one line per finding — see `lib/summary.ts`
 * for what that re-laying out is allowed to touch, which is punctuation and
 * spacing and nothing else. The verbatim paragraph stays one disclosure away,
 * because a reviewer must always be able to read what was actually written.
 */

import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import { AnimatedNumber } from '@/components/common';
import { Badge } from '@/components/ui';
import { cn } from '@/utils/cn';

import { BAND_TEXT, BAND_TONE } from '../lib/status';
import { parseSummary, type SummaryPoint } from '../lib/summary';
import type { ReviewDetail } from '../types';
import { CopyButton } from './CopyButton';
import { Cite, Segments } from './Prose';
import { Section } from './Section';

export function ComplianceScore({ review }: { review: ReviewDetail }) {
  return (
    <Section
      index={2}
      id="compliance"
      title="Evidence-led compliance"
      aside={
        review.band ? <Badge tone={BAND_TONE[review.band] ?? 'neutral'}>{review.band}</Badge> : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
        <Gauge score={review.score} band={review.band} provisional={review.provisional} />
        <ExecutiveSummary review={review} />
      </div>
    </Section>
  );
}

const RADIUS = 70;
const SEMICIRCLE = Math.PI * RADIUS;

function Gauge({
  score,
  band,
  provisional,
}: {
  score: number | null;
  band: string | null;
  provisional: boolean;
}) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-warning/40 bg-warning/[0.08] p-5 text-center">
        <p className="text-sm font-medium text-foreground">No compliance score</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          No check has been run on this entry, so there is nothing to score. This is not a zero.
        </p>
      </div>
    );
  }

  const tone = BAND_TEXT[band ?? ''] ?? 'text-primary';
  const filled = (Math.min(Math.max(score, 0), 100) / 100) * SEMICIRCLE;

  return (
    <figure className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-rest">
      <figcaption className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
        Compliance score
      </figcaption>

      {/* The grid stretches this card to the height of the summary beside it.
          The caption stays where a caption belongs and the dial takes the rest,
          centred — a dial pinned to the top of a tall card reads as a panel
          that failed to finish loading. */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative mx-auto mt-2 w-full max-w-[16rem]">
          <svg
            viewBox="0 0 180 104"
            className="w-full"
            role="img"
            aria-label={`Compliance score ${String(score)} out of 100${band ? `, ${band}` : ''}`}
          >
            <path
              d={`M 20 94 A ${String(RADIUS)} ${String(RADIUS)} 0 0 1 160 94`}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              className="stroke-border"
            />
            {/*
              The arc sweeps once on arrival, driven by a keyframe that declares
              only its `from` — so the `to` is this element's own dasharray and
              one rule covers every possible score. Reduced motion is handled
              app-wide, which is why there is no branch for it here.
            */}
            <path
              d={`M 20 94 A ${String(RADIUS)} ${String(RADIUS)} 0 0 1 160 94`}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              stroke="currentColor"
              className={cn('animate-arc-sweep', tone)}
              style={
                {
                  strokeDasharray: `${String(filled)} ${String(SEMICIRCLE)}`,
                  '--arc-total': SEMICIRCLE,
                } as React.CSSProperties
              }
            />
          </svg>

          <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
            <AnimatedNumber
              value={score}
              decimals={Number.isInteger(score) ? 0 : 1}
              className="text-[2.25rem] leading-none font-semibold text-foreground-strong tabular-nums"
            />
          </div>
        </div>

        <div className="mt-1 flex justify-between font-mono text-[10px] text-subtle-foreground">
          <span>0</span>
          <span>100</span>
        </div>

        <p className={cn('mt-2 text-center text-sm font-semibold', tone)}>{band ?? '-'}</p>
        {provisional ? (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Provisional: a check is still waiting for a person
          </p>
        ) : null}
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/*  The written summary                                                        */
/* -------------------------------------------------------------------------- */

function ExecutiveSummary({ review }: { review: ReviewDetail }) {
  const { headline, summary, untraced_numbers: untraced } = review;

  const points = useMemo(() => parseSummary(summary, untraced), [summary, untraced]);
  // What a reviewer pastes into a mail or a ticket: the words as written, not
  // the layout. Copying back a version this component had restructured would
  // put punctuation nobody wrote into a document somebody signs.
  const verbatim = [headline, summary].filter(Boolean).join('\n\n');

  return (
    <div className="relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-rest">
      {/* A single accent edge, the one on the page. It marks the paragraph a
          reader quotes in a meeting. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />

      <div className="flex-1 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Executive summary</h3>
          {verbatim ? (
            <CopyButton text={verbatim} className="-mt-1.5 -mr-2 shrink-0 text-[11px]" />
          ) : null}
        </div>

        {/* The verdict in one line. Left whole: it is already short, already
            written for a person, and it is what gets read aloud. */}
        {headline ? (
          <p className="mt-2 text-[0.9375rem] leading-relaxed font-medium text-pretty text-foreground-strong">
            {headline}
          </p>
        ) : null}

        {points.length > 0 ? (
          <ol
            className={cn(
              'space-y-2.5',
              headline ? 'mt-3.5 border-t border-border-hairline pt-3.5' : 'mt-3',
            )}
          >
            {points.map((point, index) => (
              <Point key={point.key} point={point} index={index} />
            ))}
          </ol>
        ) : summary ? (
          // Nothing split into findings — a one-clause summary, or wording
          // this module does not recognise. Shown exactly as it arrived rather
          // than forced into a shape it does not have.
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No summary was written for this review.
          </p>
        )}
      </div>

      {points.length > 0 ? (
        <footer className="border-t border-border-hairline bg-surface-muted/40 px-4 py-3 pl-5 sm:px-5 sm:pl-6">
          <Trail review={review} />
          <AsWritten text={summary} />
        </footer>
      ) : null}
    </div>
  );
}

/**
 * One finding, on its own line.
 *
 * The dot is decoration and nothing else — an `aria-hidden` colour that no
 * reader depends on, because the sentence beside it states the finding in
 * full. It exists so an eye scanning five lines lands on the ones reporting a
 * problem first, and it is amber rather than red because this module infers
 * it from wording. An inferred alarm must never look like a scored failure.
 */
function Point({ point, index }: { point: SummaryPoint; index: number }) {
  return (
    <li className="flex stagger gap-2.5" style={{ '--i': index } as React.CSSProperties}>
      <span
        aria-hidden
        className={cn(
          'mt-[0.4375rem] size-1.5 flex-none rounded-full',
          point.tone === 'attention' ? 'bg-warning' : 'bg-border-strong',
        )}
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        {point.lead ? <span className="font-semibold text-foreground">{point.lead}: </span> : null}
        <Segments segments={point.body} />
        {point.cites.map((reference) => (
          <Cite key={reference} reference={reference} />
        ))}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where each claim in the summary can be checked.
 *
 * Every count here is read off the result itself rather than off the prose —
 * the sections below are the evidence for the paragraph above, and a summary
 * that says four things failed should take you to the four. Counted from the
 * structured result so these can never disagree with the sections they link to.
 */
function Trail({ review }: { review: ReviewDetail }) {
  const failed = review.areas.filter((area) => area.status === 'fail').length;
  const missing = review.evidence.filter(
    (item) => item.required && item.status !== 'available',
  ).length;
  const waiting = review.needs_person.length;

  const links = [
    failed > 0
      ? { href: '#parameters', label: `${failed} parameter${plural(failed)} failed` }
      : null,
    missing > 0
      ? { href: '#evidence', label: `${missing} required layer${plural(missing)} missing` }
      : null,
    waiting > 0
      ? { href: '#needs-person', label: `${waiting} check${plural(waiting)} waiting on a person` }
      : null,
    review.next_steps.length > 0 ? { href: '#next-steps', label: 'What to do next' } : null,
  ].filter((link) => link !== null);

  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Where the summary can be checked"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-[10px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
        Where to look
      </span>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="inline-flex press items-center gap-0.5 rounded-pill border border-border bg-surface py-0.5 pr-1 pl-2 text-[11px] font-medium text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          {link.label}
          <ChevronRight aria-hidden="true" className="size-3" />
        </a>
      ))}
    </nav>
  );
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}

/**
 * The paragraph exactly as the review wrote it.
 *
 * Not optional furniture. Everything above is a re-layout of this text, and an
 * audit tool that only ever shows its own arrangement of a finding has put
 * itself between the reviewer and the record. Closed by default because the
 * arrangement above is the better read; present always, because this is the
 * one that gets signed off.
 */
function AsWritten({ text }: { text: string }) {
  return (
    <details className="group mt-2.5">
      <summary className="inline-flex press cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-subtle-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="duration-quick size-3 transition-transform group-open:rotate-90"
        />
        The summary as it was written
      </summary>
      <p className="mt-2 rounded-lg border border-border-hairline bg-surface p-3 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
        {text}
      </p>
    </details>
  );
}
