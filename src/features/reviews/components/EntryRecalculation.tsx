/**
 * Can the amount that was posted be produced again? The section that answers it.
 *
 * Everything else in the report compares one column of the workbook with
 * another. This compares the entry with *itself rebuilt*: each record recomputed
 * from the formula the business approved, summed, and set against the debit
 * total of the posted entry. Two readings of two different tables, which is the
 * only reason the difference between them is worth printing.
 *
 * The head of the section is the comparison, and it has three quite different
 * jobs depending on what it found. They are three findings, not one finding in
 * three colours, so each gets its own shape:
 *
 *  - **It reconciles.** Then the figure is stated once, large, with the booked
 *    amount beside it and the words "to the cent". A table of three columns
 *    whose third is always `0.00` buries the one thing a reviewer wanted to
 *    know, and a page of green ticks reads as decoration. One sentence and one
 *    number is the strongest form this can take.
 *  - **It does not.** Then the difference is the headline: the amount, the
 *    percentage, the tolerance it broke, and immediately beneath it the records
 *    that caused it — each as a citation a reviewer can open the file at.
 *  - **Nothing could be compared.** A required input the workbook does not
 *    carry, or a posting table that could not be read. Rendered neutral and
 *    never red: nothing was established, which is not the same as a difference
 *    of nothing, and colouring it like a failure would turn every unusual
 *    workbook into an exception somebody has to clear.
 *
 * A citation is a row number, a cell reference and a sentence written by code.
 * Never a name, never a personnel reference: the same rule as the work paper
 * below it, for the same reason.
 *
 * The section opens as one line: recomputed, booked, variance, whether that
 * variance is inside the agreed tolerance, and the method in a sentence. That
 * line is the finding, and it is all most readers of this report want from
 * this section — the working beneath it ran to several screens of tables
 * between the parameters above and the cost below, which is a long way to
 * scroll past arithmetic that reconciled. Everything that was on the page
 * before is still here, behind the one control that opens it.
 *
 * The trade is print: a reader who prints with the working shut prints the
 * comparison line and not the tables under it. That is deliberate — the line
 * carries the figures, the variance and the tolerance, which is what a
 * circulated copy is read for — and a reader who wants the full work paper on
 * paper opens it first, exactly as they would to read it on screen.
 */

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';

import { formatAmount, formatVariance } from '../lib/excelFormat';
import { STATUS_TONE } from '../lib/status';
import {
  type EntryRecalculation as EntryRecalculationData,
  type ReviewDetail,
  STATUS_LABELS,
} from '../types';
import { CalculationDetails } from './CalculationDetails';
import { NotStated, Section } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

/* -------------------------------------------------------------------------- */
/*  The section                                                                */
/* -------------------------------------------------------------------------- */

interface EntryRecalculationProps {
  review: ReviewDetail;
  /** Position in the report's numbered spine, allocated by `ReviewResult`. */
  index: number;
}

export function EntryRecalculation({ review, index }: EntryRecalculationProps) {
  // Before the early return: a hook cannot sit behind one, and a review with
  // no work paper renders nothing at all.
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  const paper = review.recalculation;
  if (!paper) return null;

  return (
    <Section
      index={index}
      id="entry-recalculation"
      title="The posted amount, rebuilt from its inputs"
      wash="primary"
      aside={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[paper.status]}>{STATUS_LABELS[paper.status]}</Badge>
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {paper.rows_recomputed.toLocaleString()}
            </span>
            {paper.rows_recomputed === paper.rows_total
              ? ' records rebuilt'
              : ` of ${paper.rows_total.toLocaleString()} records rebuilt`}
          </span>
        </span>
      }
    >
      <div className="space-y-4">
        <ComparisonLine
          paper={paper}
          open={open}
          detailsId={detailsId}
          onToggle={() => {
            setOpen((wasOpen) => !wasOpen);
          }}
        />

        {open ? (
          <WorkPaper
            paper={paper}
            id={detailsId}
            onClose={() => {
              setOpen(false);
            }}
          />
        ) : null}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  The comparison line                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The whole comparison on one line, with the control that opens the working.
 *
 * A table of one row rather than a strip of tiles, and deliberately so: this
 * is a work-paper line, it is read in the same shape as the registers above
 * it, and the column headings are what say which figure is which without a
 * reader having to infer it from size and colour.
 */
function ComparisonLine({
  paper,
  open,
  detailsId,
  onToggle,
}: {
  paper: EntryRecalculationData;
  open: boolean;
  detailsId: string;
  onToggle: () => void;
}) {
  return (
    <TableShell
      caption="The recomputed total against the booked amount, and the method behind it"
      minWidth="min-w-[52rem]"
    >
      <thead>
        <tr>
          <Th className="text-right">Our calculation</Th>
          <Th className="text-right">Booked in JE</Th>
          <Th className="text-right">Variance</Th>
          <Th>Within tolerance</Th>
          <Th>Method</Th>
          <Th className="text-right">Details</Th>
        </tr>
      </thead>
      <tbody>
        <Tr className="hover:bg-transparent">
          <Td className="text-right font-semibold text-foreground-strong tabular-nums">
            {formatAmount(paper.recomputed_total)}
          </Td>
          <Td className="text-right font-semibold text-foreground-strong tabular-nums">
            {paper.booked.total === null ? (
              <NotStated>Not read</NotStated>
            ) : (
              formatAmount(paper.booked.total)
            )}
          </Td>
          <Td className="text-right font-semibold tabular-nums">
            <Variance paper={paper} />
          </Td>
          <Td>
            <Tolerance paper={paper} />
          </Td>
          <Td>
            <Method paper={paper} />
          </Td>
          <Td className="text-right">
            <Button
              type="button"
              variant={open ? 'primary' : 'secondary'}
              size="sm"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={detailsId}
            >
              {open ? 'Hide details' : 'See details'}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'duration-quick transition-transform ease-out-soft',
                  open && 'rotate-180',
                )}
              />
            </Button>
          </Td>
        </Tr>
      </tbody>
    </TableShell>
  );
}

/** The variance, coloured by what it means rather than by its sign. */
function Variance({ paper }: { paper: EntryRecalculationData }) {
  if (paper.difference === null) return <NotStated>Nothing to compare</NotStated>;

  // `accent-strong` rather than `warning` for the middle case: the warning
  // hue is too light to read as text on a light ground, which is why the
  // palette's own warning badge sets its text in `foreground` instead.
  const tone =
    paper.within_tolerance === null
      ? 'text-muted-foreground'
      : paper.ties
        ? 'text-success'
        : paper.within_tolerance
          ? 'text-accent-strong'
          : 'text-danger';

  return (
    <>
      <span className={tone}>{formatVariance(paper.difference)}</span>
      {paper.difference_pct === null ? null : (
        <span className="block text-[10px] font-normal text-subtle-foreground">
          {paper.difference_pct > 0 ? '+' : ''}
          {paper.difference_pct.toFixed(4)}%
        </span>
      )}
    </>
  );
}

/**
 * Whether the variance is inside the tolerance the business agreed.
 *
 * The tolerance is printed with the answer, never on its own: "Yes" means
 * nothing to a reader who does not know what it was measured against, and the
 * figure it was measured against is the first thing challenged.
 */
function Tolerance({ paper }: { paper: EntryRecalculationData }) {
  if (paper.within_tolerance === null) {
    return <NotStated>Nothing to compare</NotStated>;
  }

  return (
    <span className={cn('font-medium', paper.within_tolerance ? 'text-foreground' : 'text-danger')}>
      {paper.within_tolerance ? 'Yes' : 'No'}
      <span className="font-normal text-subtle-foreground"> ({paper.basis.tolerance_pct}%)</span>
    </span>
  );
}

/**
 * How the amount was arrived at, in one line.
 *
 * The business's own sentence where this entry type has one, and the formula
 * otherwise. The sentence leads because this is the summary line: a reader
 * here wants to know the amount was rebuilt from unused leave days and a daily
 * rate, not which four columns that reads. The columns are a click away, in
 * the block that exists to name them.
 */
function Method({ paper }: { paper: EntryRecalculationData }) {
  const { explained } = paper.basis;
  // The summary first, the intro second, and a blank one skipped rather than
  // rendered: an entry type can carry the walkthrough with either half unwritten.
  const sentence = [explained?.summary, explained?.intro].find((text) => text?.trim());
  if (sentence) {
    return <p className="max-w-prose text-xs leading-relaxed">{sentence}</p>;
  }

  return (
    <p className="max-w-prose font-mono text-[11px] leading-relaxed break-words">
      {paper.basis.formula_in_headers || paper.basis.formula}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  The working                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Everything behind the line above, in the order it is argued.
 *
 * Bordered in the primary hue and set on the card surface rather than on the
 * section's wash, so a reader can see at a glance where the working starts and
 * ends.
 */
function WorkPaper({
  paper,
  id,
  onClose,
}: {
  paper: EntryRecalculationData;
  id: string;
  onClose: () => void;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="animate-rise-sm rounded-card border-2 border-primary/50 bg-surface p-4 shadow-rest sm:p-5"
    >
      {/* A `div`, not a `header`: the print stylesheet drops every `header` on
          the page as chrome, and this one is the panel's own title. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-heading`} className="text-[0.9375rem] font-semibold text-foreground-strong">
          Calculation Accuracy – details
        </h3>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="space-y-6">
        {/*
          A to D are the finding, in the order a reviewer asks about it: how big the
          difference is, where it is, how the amount is meant to be worked out, and what
          that looks like on the record that broke.
        */}
        <CalculationDetails paper={paper} prefix="entry-recalculation" />
      </div>
    </section>
  );
}
