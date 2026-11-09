/**
 * What the review found, and — just as prominently — what it did not do.
 *
 * The report reads top to bottom the way it is discussed: which entry this is,
 * what evidence was on the file, what it scored, which parameters decided
 * that, what it cost to find out, and then the working behind it. The numbered
 * sections exist so one person can say "look at three" to another.
 *
 * The score sits directly under the entry, as section two on every report. It
 * is the number read aloud in a meeting, so it is the first thing after
 * identification rather than something a reader has to scroll past a register
 * to reach. The evidence register follows immediately after it, so a reader
 * who wants to check how much of the file that score was computed from finds
 * it on the very next card.
 *
 * `not_yet_run` is a first-class panel rather than a footnote: a reader who
 * mistakes an absent judgement for a passed one has been misled, and that is
 * the one failure an audit tool cannot recover from. A figure the summary
 * could not trace is marked in the sentence that quotes it — see `Prose` —
 * rather than collected into a panel of its own.
 *
 * Each block fades up as it is scrolled to, one after another. The motion is
 * `opacity` and `transform` only and the sections carry `content-visibility`,
 * so a long report costs the browser nothing for the parts nobody has reached.
 */

import { History } from 'lucide-react';
import { Link } from 'react-router';

import { Reveal } from '@/components/common';
import { Card } from '@/components/ui';
import { paths } from '@/config/paths';

import type { ReviewDetail } from '../types';
import { ComplianceScore } from './ComplianceScore';
import { CostBreakdown } from './CostBreakdown';
import { EntryHeader } from './EntryHeader';
import { EntryRecalculation } from './EntryRecalculation';
import { EvidenceRegister } from './EvidenceRegister';
import { TestedParameters } from './TestedParameters';

interface ReviewResultProps {
  review: ReviewDetail;
}

/**
 * The first number the spine hands out.
 *
 * Section 1 — which entry this is — is on every report, so it numbers itself.
 * Everything below it is handed a number in reading order, the score included:
 * the score is always 2, and the register, when there is one, is always 3.
 */
const FIRST_ALLOCATED_SECTION = 2;

export function ReviewResult({ review }: ReviewResultProps) {
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
  // Always present and claimed first, so the score is 2 on every report.
  const scoreIndex = number();
  // Conditional, and claimed second, so the parameters are 3 when there is
  // something to score — which is how a review with nothing scored came to
  // print a spine reading 1, 2, 4.
  const parametersIndex = review.areas.length > 0 || review.observations.length > 0 ? number() : 0;
  // Claimed after the parameters: the register is what a reviewer checks the
  // parameters' evidence against, not the other way round, and it is
  // conditional in the same way — a review with no evidence simply drops down
  // to fill the gap.
  const evidenceIndex = review.evidence.length > 0 ? number() : 0;
  // The first of the two work papers: whether the posted amount can be
  // produced again at all. Claimed ahead of the cost on purpose — a reader
  // wants the arithmetic before the metered total of producing it.
  const entryRecalcIndex = review.recalculation ? number() : 0;
  // Always present, so it is the number that moves with everything above it:
  // 6 on a report carrying a register, parameters and a recalculation, lower
  // on one that is missing any of them.
  const costIndex = number();

  return (
    <div className="space-y-5">
      {/*
        The `index` on each wrapper is its reading position, which is what
        staggers the reveals. Written out rather than mapped over an array of
        elements: the sections are a fixed composition, not data, and a map
        would need a synthetic key for every one of them.
      */}
      {review.reused_from ? <Reused from={review.reused_from} /> : null}

      <Reveal index={0}>
        <EntryHeader review={review} />
      </Reveal>

      <Reveal index={1}>
        <ComplianceScore review={review} index={scoreIndex} />
      </Reveal>

      <Reveal index={3}>
        <TestedParameters review={review} index={parametersIndex} />
      </Reveal>

      {review.evidence.length > 0 ? (
        <Reveal index={4}>
          <EvidenceRegister review={review} index={evidenceIndex} />
        </Reveal>
      ) : null}

      {review.recalculation ? (
        <Reveal index={5}>
          <EntryRecalculation review={review} index={entryRecalcIndex} />
        </Reveal>
      ) : null}

      <Reveal index={6}>
        <CostBreakdown review={review} index={costIndex} />
      </Reveal>

      {review.not_yet_run.length > 0 ? (
        <Reveal index={7}>
          <NotYetRun items={review.not_yet_run} />
        </Reveal>
      ) : null}
    </div>
  );
}

/**
 * This report is an earlier review's result, served again.
 *
 * Above everything, because it qualifies everything below it. The engine
 * serves a stored result whenever the same workbook is uploaded again under
 * unchanged rules, and until this said so the report was indistinguishable
 * from one produced just now — which is how findings the current engine no
 * longer reaches were read as its current answer. "Your file was reviewed just
 * now" and "this is the earlier review's result" are materially different
 * statements even when the bytes, and so the findings, are the same.
 *
 * It links to the review it came from, because the first thing a reviewer
 * wants on reading this is when that one was run.
 */
function Reused({ from }: { from: string }) {
  return (
    <Card
      as="aside"
      tone="sunken"
      elevation="flat"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-info/30 bg-info/[0.06] px-4 py-3"
    >
      <History aria-hidden="true" className="size-4 flex-none text-info" />
      <p className="text-sm text-foreground">
        This workbook had already been reviewed under these rules, so the earlier review&apos;s
        result is shown. Nothing was re-run.
      </p>
      <Link
        to={paths.app.reviewDetail.getHref(from)}
        className="press text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Open the review it came from
      </Link>
    </Card>
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
