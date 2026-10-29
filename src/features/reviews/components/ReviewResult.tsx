/**
 * What the review found, and — just as prominently — what it did not do.
 *
 * The report reads top to bottom the way it is discussed: which entry this is,
 * what evidence was on the file, what it scored, which parameters decided
 * that, what it cost to find out, and then the working behind it. The numbered
 * sections exist so one person can say "look at three" to another.
 *
 * The register sits above the score rather than below the parameters. What a
 * reviewer is asked first is which layers arrived at all, and a score read
 * before that question is settled is a score read without knowing how much of
 * the file it was computed from.
 *
 * `not_yet_run` and `untraced_numbers` are first-class panels rather than
 * footnotes, and `untraced_numbers` sits directly under the summary it
 * qualifies. A reader who mistakes an absent judgement for a passed one has
 * been misled, and that is the one failure an audit tool cannot recover from.
 *
 * Each block fades up as it is scrolled to, one after another. The motion is
 * `opacity` and `transform` only and the sections carry `content-visibility`,
 * so a long report costs the browser nothing for the parts nobody has reached.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Reveal } from '@/components/common';
import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';

import { termLabel } from '../lib/terms';
import { AREA_LABELS, type ReviewDetail } from '../types';
import { CheckFacts, ReviewReasons } from './CheckFacts';
import { ComplianceScore } from './ComplianceScore';
import { CostBreakdown } from './CostBreakdown';
import { EntryHeader } from './EntryHeader';
import { EvidenceRegister } from './EvidenceRegister';
import { NextSteps } from './NextSteps';
import { NotValidated } from './NotValidated';
import { Prose } from './Prose';
import { Recalculation } from './Recalculation';
import { Section } from './Section';
import { LineagePanel, SheetTable } from './SheetTable';
import { StatusBadge, TestedParameters } from './TestedParameters';

/** The area key the context file uses for checks that carry no weight. */
const OBSERVATION_AREA = 'observation';

interface ReviewResultProps {
  review: ReviewDetail;
}

/**
 * The first number the spine hands out.
 *
 * Section 1 — which entry this is — is on every report, so it numbers itself.
 * Everything below it is handed a number in reading order, the score included:
 * the register above it is conditional, so the score is 2 on a review with no
 * evidence and 3 on one with a register, and neither spine skips a number.
 */
const FIRST_ALLOCATED_SECTION = 2;

export function ReviewResult({ review }: ReviewResultProps) {
  const { workbook } = review;

  // The numbered spine must not skip a number: the numbers are how one person
  // says "look at four" to another, and a report whose sections run 3, 5, 6
  // reads as one with a section missing. Allocated in reading order rather than
  // written at each call site, because every section below the first is either
  // conditional or sits behind one that is, and they were once numbered by hand.
  //
  // The calls below must stay in the order the sections render in. That is the
  // whole mechanism: a number is claimed by being asked for first.
  let next = FIRST_ALLOCATED_SECTION;
  const number = () => next++;
  const evidenceIndex = review.evidence.length > 0 ? number() : 0;
  // Always present, and still numbered here rather than at the call site: it is
  // 2 or 3 depending on whether a register claimed 2 ahead of it.
  const scoreIndex = number();
  // Conditional too, which is how a review with nothing scored came to print a
  // spine reading 1, 2, 4.
  const parametersIndex = review.areas.length > 0 || review.observations.length > 0 ? number() : 0;
  // Always present, so it is the second number that moves with what precedes it:
  // 5 on a report carrying a register and parameters, lower on one that is not.
  const costIndex = number();
  // The working behind the parameters, and the checks nobody could settle. Both
  // conditional, and both below the cost for that reason: a number taken by a
  // section that is sometimes absent cannot be quoted onward.
  const splitIndex = review.split_summary ? number() : 0;
  const needsPersonIndex = review.needs_person.length > 0 ? number() : 0;

  return (
    <div className="space-y-5">
      {/*
        The `index` on each wrapper is its reading position, which is what
        staggers the reveals. Written out rather than mapped over an array of
        elements: the sections are a fixed composition, not data, and a map
        would need a synthetic key for every one of them.
      */}
      <Reveal index={0}>
        <EntryHeader review={review} />
      </Reveal>

      {review.evidence.length > 0 ? (
        <Reveal index={1}>
          <EvidenceRegister review={review} index={evidenceIndex} />
        </Reveal>
      ) : null}

      <Reveal index={2}>
        <ComplianceScore review={review} index={scoreIndex} />
      </Reveal>

      {/* Directly under the summary it qualifies, wherever that summary sits. */}
      {review.untraced_numbers.length > 0 ? (
        <Reveal index={3}>
          <UntracedNumbers numbers={review.untraced_numbers} />
        </Reveal>
      ) : null}

      <Reveal index={4}>
        <TestedParameters review={review} index={parametersIndex} />
      </Reveal>

      <Reveal index={5}>
        <CostBreakdown review={review} index={costIndex} />
      </Reveal>

      {review.split_summary ? (
        <Reveal index={6}>
          <Recalculation review={review} index={splitIndex} />
        </Reveal>
      ) : null}

      {review.needs_person.length > 0 ? (
        <Reveal index={7}>
          <NeedsPerson review={review} index={needsPersonIndex} />
        </Reveal>
      ) : null}

      {review.gaps.length > 0 ? (
        <Reveal index={8}>
          <NotValidated review={review} />
        </Reveal>
      ) : null}

      {review.next_steps.length > 0 ? (
        <Reveal index={9}>
          <NextSteps review={review} />
        </Reveal>
      ) : null}

      {review.not_yet_run.length > 0 ? (
        <Reveal index={9}>
          <NotYetRun items={review.not_yet_run} />
        </Reveal>
      ) : null}

      {workbook ? (
        <>
          <Reveal index={10}>
            <WorkbookFacts workbook={workbook} />
          </Reveal>

          {workbook.defect_summary.length > 0 ? (
            <Reveal index={10}>
              <Defects lines={workbook.defect_summary} />
            </Reveal>
          ) : null}

          <Reveal index={10}>
            <SheetTable sheets={workbook.sheets} />
          </Reveal>

          <Reveal index={10}>
            <LineagePanel lineage={workbook.lineage} />
          </Reveal>
        </>
      ) : null}
    </div>
  );
}

function WorkbookFacts({ workbook }: { workbook: NonNullable<ReviewDetail['workbook']> }) {
  return (
    <section aria-labelledby="workbook-heading" className="space-y-3 defer-paint">
      <h2 id="workbook-heading" className="text-sm font-semibold text-foreground">
        What the file turned out to be
      </h2>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border shadow-rest sm:grid-cols-4">
        <Fact label="Sheets" value={workbook.sheet_count} />
        <Fact label="Tables found" value={workbook.table_count} />
        <Fact label="Largest table" value={`${workbook.row_count.toLocaleString()} rows`} />
        <Fact label="Format" value={workbook.workbook_format} />
      </dl>

      <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-rest sm:grid-cols-2">
        <Fact
          label="Formulas readable"
          value={workbook.formulas_available ? 'Yes' : 'No (values only)'}
          hint={
            workbook.formulas_available
              ? undefined
              : 'Binary workbooks carry no formulas, so lineage and tie-out degrade rather than report nothing.'
          }
        />
        <Fact
          label="Layout fingerprint"
          value={workbook.layout_fingerprint.slice(0, 12) || '-'}
          hint="Identifies the template, not the file: next month's workbook from the same template matches."
          mono
        />
      </dl>
    </section>
  );
}

function Defects({ lines }: { lines: string[] }) {
  return (
    <section aria-labelledby="defects-heading" className="space-y-3 defer-paint">
      <h2 id="defects-heading" className="text-sm font-semibold text-foreground">
        Observations found in the workbook
      </h2>

      <Card as="ul" className="divide-y divide-border overflow-hidden">
        {lines.map((line) => (
          <li key={line} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-foreground">{termLabel(line.split(':')[0]?.trim() ?? '')}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {line.split(':')[1]?.trim()}
            </span>
          </li>
        ))}
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Observations are reported, never scored. A formula defect can accompany a failure but is
        never the only reason for one.
      </p>
    </section>
  );
}

/**
 * The reviewer's worklist: every check the system would not settle on its own.
 *
 * A numbered section rather than one of the trailing panels, because this is
 * the part of the report somebody has to act on. It was previously a plain
 * heading below the cost breakdown — which put what the review spent above
 * what the review needs, and left the one list with work in it looking like a
 * footnote.
 *
 * Each item carries the four things a reviewer needs before they can start:
 * what was asked, what the system did establish, why it stopped short, and
 * where the rest of the context is.
 *
 * Deliberately not sorted. These arrive in the order of the parameters they
 * came from, so a reviewer working down this list and a reviewer working down
 * section 3 are reading the same report in the same order.
 */
function NeedsPerson({ review, index }: { review: ReviewDetail; index: number }) {
  const waiting = review.needs_person;
  // Only an area that was actually scored has a card to jump back to.
  const scored = new Set(review.areas.map((area) => area.area));

  return (
    <Section
      index={index}
      id="needs-person"
      title="Needs a person"
      aside={
        <span>
          <span className="font-semibold text-foreground tabular-nums">{waiting.length}</span> check
          {waiting.length === 1 ? '' : 's'} waiting
        </span>
      }
    >
      <p className="-mt-1 mb-4 max-w-prose text-xs leading-relaxed text-muted-foreground">
        Nothing here has been settled by the system, so nothing here has passed or failed. Each one
        is waiting on a reviewer to look and decide. These are the judgements the review would not
        make on its own.
      </p>

      <ol className="space-y-2.5">
        {waiting.map((check, position) => (
          <li
            key={check.check_id}
            className="stagger"
            style={{ '--i': position } as React.CSSProperties}
          >
            <Card className="p-4">
              <div className="flex items-start gap-3">
                {/* The position in the list, so two people on a call can agree
                    which one they are talking about. */}
                <span
                  aria-hidden
                  className="mt-px flex size-5 flex-none items-center justify-center rounded-pill bg-warning/20 font-mono text-[11px] font-semibold text-foreground"
                >
                  {position + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed font-medium text-foreground">
                      {check.question || check.check_id}
                    </p>
                    <StatusBadge status={check.status} />
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {check.area === OBSERVATION_AREA
                      ? 'Observation · carries no weight in the score'
                      : (AREA_LABELS[check.area] ?? check.area)}
                  </p>

                  {/* What the system did establish, which is never nothing. A
                      reviewer starting from "unproven" and no sentence has to
                      redo the work the review has already done. */}
                  {check.conclusion ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      <Prose text={check.conclusion} />
                    </p>
                  ) : null}

                  <CheckFacts check={check} />
                  <ReviewReasons reasons={check.review_reasons} />

                  {scored.has(check.area) ? (
                    <p className="mt-2.5">
                      <a
                        href={`#parameter-${check.area}`}
                        className="inline-flex press items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        See it under {AREA_LABELS[check.area] ?? check.area}
                        <ArrowUp aria-hidden="true" className="size-3" />
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {/* This section says who has to decide; that one says what to go and
          get. They were written by the same pass over the same checks and read
          as two halves of one instruction, so they are joined up rather than
          left for a reader to find by scrolling. */}
      {review.next_steps.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          <a
            href="#next-steps"
            className="inline-flex press items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            What to do next
            <ArrowDown aria-hidden="true" className="size-3" />
          </a>{' '}
          lists the specific things to obtain or confirm.
        </p>
      ) : null}
    </Section>
  );
}

function NotYetRun({ items }: { items: string[] }) {
  return (
    <Card
      as="section"
      aria-labelledby="pending-heading"
      tone="sunken"
      elevation="flat"
      className="border-dashed border-border-strong p-5 defer-paint"
    >
      <h2 id="pending-heading" className="text-sm font-semibold text-foreground">
        What did not run on this review
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Listed rather than silently skipped. Nothing below has been assessed, so nothing below has
        passed.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-foreground">
            <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-border-strong" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function UntracedNumbers({ numbers }: { numbers: string[] }) {
  return (
    <Card as="section" aria-labelledby="untraced-heading" tone="danger" className="p-5 defer-paint">
      <h2 id="untraced-heading" className="text-sm font-semibold text-danger">
        Numbers in the summary that trace to nothing
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground">
        Every figure in the written summary is matched against the score and the cited evidence.
        These matched neither. They are named rather than deleted, because a sentence with the
        figure quietly removed reads as though it had been verified. Do not quote them.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {numbers.map((number) => (
          <li
            key={number}
            className="rounded-md border border-danger/25 bg-surface px-2 py-1 font-mono text-xs text-danger tabular-nums"
          >
            {number}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Fact({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 text-lg font-semibold text-foreground tabular-nums',
          mono && 'font-mono text-sm',
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
