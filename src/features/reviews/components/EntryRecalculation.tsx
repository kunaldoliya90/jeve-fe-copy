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
 * Nothing is behind a disclosure. This report is printed and circulated, and a
 * table inside a closed panel prints as a blank.
 */

import { AlertTriangle, Check, ChevronDown, Equal, Minus } from 'lucide-react';

import { Badge } from '@/components/ui';
import { cn } from '@/utils/cn';

import { formatAmount, formatExcel, formatVariance } from '../lib/excelFormat';
import { STATUS_TONE } from '../lib/status';
import {
  BOOKED_METHOD_LABELS,
  DISCREPANCY_LABELS,
  type EntryRecalculation as EntryRecalculationData,
  type RecalcCitation,
  type RecalcComponent,
  type RecalcExplained,
  type RecalcInputReading,
  type ReviewDetail,
  STATUS_LABELS,
  UNIT_LABELS,
} from '../types';
import { RecalcRowsExplorer } from './RecalcRowsExplorer';
import { Block, Field, NotStated, Section } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

interface EntryRecalculationProps {
  review: ReviewDetail;
  /** Position in the report's numbered spine, allocated by `ReviewResult`. */
  index: number;
}

export function EntryRecalculation({ review, index }: EntryRecalculationProps) {
  const paper = review.recalculation;
  if (!paper) return null;

  return (
    <Section
      index={index}
      id="entry-recalculation"
      title="The posted amount, rebuilt from its inputs"
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
      <div className="space-y-6">
        <Comparison paper={paper} />

        {/* Lettered by hand: every block below is unconditional, so the letters
            are fixed. Allocate them in a loop again the day one becomes optional. */}
        <Block prefix="entry-recalculation" letter="A" title="How the amount is arrived at">
          <Formula paper={paper} />
        </Block>

        <Block
          prefix="entry-recalculation"
          letter="B"
          title="Where the records did not reconcile"
          note={
            paper.citation_count > 0
              ? 'Each row below is a citation: where to open the file, what the formula produced, what the workbook states, and why the two differ.'
              : undefined
          }
        >
          <Citations paper={paper} />
        </Block>

        {/* `lazy`: the grid queries the server on mount, and a closed `details`
            still renders its children — so without it every review page would
            fetch a page of rows nobody asked to see. */}
        <Block prefix="entry-recalculation" letter="C" title="Browse every record" collapsible lazy>
          <RecalcRowsExplorer reviewId={review.review_id} />
        </Block>

        <Block prefix="entry-recalculation" letter="D" title="What it was rebuilt from" collapsible>
          <Inputs inputs={paper.inputs} records={paper.rows_total} />
        </Block>

        <Basis paper={paper} />
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  The comparison                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Recomputed against booked, in whichever of its three states applies.
 *
 * The states are genuinely different findings and are not variations on a
 * colour: an entry that reconciles, an entry that does not, and an entry
 * nothing could be compared against. The third is the one a table of figures
 * would quietly render as zeroes.
 */
function Comparison({ paper }: { paper: EntryRecalculationData }) {
  if (paper.within_tolerance === null) return <NothingToCompare paper={paper} />;
  return paper.ties ? <Reconciles paper={paper} /> : <Differs paper={paper} />;
}

/**
 * It rebuilds to the booked amount, over every record.
 *
 * One figure, stated once. The booked amount is repeated underneath in the
 * ordinary weight rather than beside it in the same size: they are the same
 * number, and printing it twice as large as life invites a reader to compare
 * two identical figures digit by digit.
 */
function Reconciles({ paper }: { paper: EntryRecalculationData }) {
  return (
    <div className="overflow-hidden rounded-card border border-success/30 bg-success/[0.07] shadow-rest">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-success uppercase">
            <Check aria-hidden className="size-3.5" />
            Rebuilt to the cent
          </p>
          <p className="mt-2 text-[1.75rem] leading-none font-semibold text-foreground-strong tabular-nums">
            {formatAmount(paper.recomputed_total)}
          </p>
          {/*
            Two claims, and they are not the same one twice: this says the entry
            total reproduces, while block C says every individual record did.
            A total can reproduce while two records cancel each other out, which
            is the case neither sentence alone would catch.
          */}
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            The same amount as {paper.booked.description}, rebuilt from all{' '}
            {paper.rows_total.toLocaleString()} records.
          </p>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-success/20 bg-success/20 sm:grid-cols-1">
          <Measure label="Booked" value={formatAmount(paper.booked.total)} />
          <Measure label="Difference" value={formatVariance(paper.difference)} tone="success" />
        </dl>
      </div>
    </div>
  );
}

/** It does not rebuild to the booked amount. The difference is the headline. */
function Differs({ paper }: { paper: EntryRecalculationData }) {
  const inside = paper.within_tolerance === true;
  const tone = inside ? 'warning' : 'danger';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border shadow-rest',
        inside ? 'border-warning/40 bg-warning/[0.08]' : 'border-danger/30 bg-danger/[0.07]',
      )}
    >
      <div className="p-5">
        <p
          className={cn(
            'flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase',
            inside ? 'text-foreground' : 'text-danger',
          )}
        >
          <AlertTriangle aria-hidden className="size-3.5" />
          {inside
            ? 'Rebuilds to a different amount, inside tolerance'
            : 'Does not rebuild to the amount that was posted'}
        </p>

        <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <Measure label="Recomputed" value={formatAmount(paper.recomputed_total)} large />
          <Measure label="Booked" value={formatAmount(paper.booked.total)} large />
          <Measure
            label="Difference"
            value={formatVariance(paper.difference)}
            hint={
              paper.difference_pct === null
                ? undefined
                : `${paper.difference_pct > 0 ? '+' : ''}${paper.difference_pct.toFixed(4)}% of the booked amount`
            }
            tone={tone}
            large
          />
        </dl>
      </div>
    </div>
  );
}

/**
 * Nothing could be compared.
 *
 * Neutral, and explicitly not a failure: a required input the workbook does not
 * carry, or a posting table that could not be read, is a gap in the evidence.
 * Rendering it in the same red as a real difference would turn every unusual
 * workbook into an exception somebody has to clear.
 */
function NothingToCompare({ paper }: { paper: EntryRecalculationData }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-muted/40 p-5 shadow-rest">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <Minus aria-hidden className="size-3.5" />
        Nothing to compare against
      </p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground">
        {paper.explanation}
      </p>
      {paper.rows_recomputed > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          The recomputation itself stands:{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {formatAmount(paper.recomputed_total)}
          </span>{' '}
          from {paper.rows_recomputed.toLocaleString()} records.
        </p>
      ) : null}
    </div>
  );
}

function Measure({
  label,
  value,
  hint,
  tone,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: 'success' | 'warning' | 'danger' | undefined;
  large?: boolean;
}) {
  const colour =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'warning'
          ? 'text-warning'
          : 'text-foreground-strong';

  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn('mt-1 font-semibold tabular-nums', large ? 'text-base' : 'text-sm', colour)}
      >
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  A - the formula                                                            */
/* -------------------------------------------------------------------------- */

function Formula({ paper }: { paper: EntryRecalculationData }) {
  const { basis } = paper;

  return (
    <div className="space-y-3">
      <div className="rounded-card border border-border bg-surface p-4 shadow-rest">
        <p className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Per record
        </p>
        {/*
         * The expanded form leads, because it is the only one that names the columns. The
         * staged form reads better but a stage has no column, so "Rebuilt RTT accrual / 12"
         * tells a reviewer nothing about the four columns behind it - and reads as though
         * the figure were still being lifted straight out of the workbook.
         */}
        <p className="mt-1.5 font-mono text-sm leading-relaxed text-pretty break-words text-foreground-strong">
          {basis.formula_expanded || basis.formula_in_headers || basis.formula}
        </p>
        {basis.formula_expanded && basis.formula_expanded !== basis.formula_in_headers ? (
          <p className="mt-2 font-mono text-[11px] leading-relaxed break-words text-subtle-foreground">
            In stages: {basis.formula_in_headers}
          </p>
        ) : null}
        {basis.formula_in_headers && basis.formula_in_headers !== basis.formula ? (
          <p className="mt-1 font-mono text-[11px] leading-relaxed break-words text-subtle-foreground">
            As declared: {basis.formula}
          </p>
        ) : null}
      </div>

      <Explained explained={basis.explained} />

      {paper.components.length > 0 ? <Components items={paper.components} /> : null}
    </div>
  );
}

/**
 * The formula walked through in plain language, one fixed example carried start to finish.
 *
 * `null` for a JE type nobody has written this for yet - the formula box and the worked
 * example above it still stand on their own, so this is additive rather than load-bearing.
 *
 * Collapsed by default: the formula itself is already stated above, in headers and as a
 * worked example, so this walkthrough is a reader's choice to open rather than something
 * that has to be scanned past on every visit. The print stylesheet (`globals.css`) still
 * forces it open on a printed copy, same as every other disclosure in this report.
 */
function Explained({ explained }: { explained: RecalcExplained | null }) {
  if (!explained) return null;

  return (
    <details className="group rounded-card border border-border bg-surface-muted/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm leading-relaxed text-foreground select-none [&::-webkit-details-marker]:hidden">
        <span>{explained.intro || 'The formula, explained step by step'}</span>
        <ChevronDown
          aria-hidden="true"
          className="duration-quick size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="space-y-3 border-t border-border-hairline p-4">
        {explained.context ? (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {explained.context}
          </p>
        ) : null}

        {explained.steps.length > 0 ? (
          <ol className="space-y-2.5 border-t border-border-hairline pt-3">
            {explained.steps.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{step.label}</p>
                  {step.detail ? (
                    <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  ) : null}
                  {step.example ? (
                    <p className="mt-1 font-mono text-[11px] text-subtle-foreground">
                      {step.example}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {explained.summary ? (
          <p className="border-t border-border-hairline pt-3 text-xs leading-relaxed font-medium text-foreground-strong">
            {explained.summary}
          </p>
        ) : null}

        {explained.caveats.length > 0 ? (
          <ul className="list-disc space-y-1 border-t border-border-hairline pt-3 pl-4">
            {explained.caveats.map((caveat) => (
              <li
                key={caveat}
                className="max-w-prose text-xs leading-relaxed text-muted-foreground"
              >
                {caveat}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

/** Each stage of the formula, totalled, so the recomputed figure comes apart. */
function Components({ items }: { items: RecalcComponent[] }) {
  return (
    <TableShell caption="Each stage of the formula, totalled over the records">
      <thead>
        <tr>
          <Th>Stage</Th>
          <Th>How it is derived</Th>
          <Th className="text-right">Records</Th>
          <Th className="text-right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <Tr key={item.id}>
            <Td>
              <span className="font-medium text-foreground">{item.label || item.id}</span>
              {item.description ? (
                <span className="mt-0.5 block max-w-prose text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </Td>
            <Td className="font-mono text-[11px]">{item.in_headers || item.expression}</Td>
            <Td className="text-right tabular-nums">{item.rows_populated.toLocaleString()}</Td>
            <Td className="text-right font-medium text-foreground tabular-nums">
              {item.number_format
                ? formatExcel(item.total, item.number_format)
                : formatAmount(item.total)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  B - the inputs                                                             */
/* -------------------------------------------------------------------------- */

function Inputs({ inputs, records }: { inputs: RecalcInputReading[]; records: number }) {
  if (inputs.length === 0) {
    return <p className="text-sm text-muted-foreground">This entry type declares no inputs.</p>;
  }

  return (
    <TableShell
      caption="Every input the approved formula reads, and what this workbook carries for it"
      minWidth="min-w-[44rem]"
    >
      <thead>
        <tr>
          <Th>Input</Th>
          <Th>Measured in</Th>
          <Th>Read from</Th>
          <Th className="text-right">Records with a number</Th>
        </tr>
      </thead>
      <tbody>
        {inputs.map((input) => (
          <Tr key={input.id}>
            <Td className="text-foreground">
              <span className="font-medium">{input.header || input.id}</span>
              {input.required ? null : (
                <span className="ml-2 text-[10px] tracking-[0.08em] text-subtle-foreground uppercase">
                  optional
                </span>
              )}
              {input.description ? (
                <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                  {input.description}
                </p>
              ) : null}
            </Td>
            <Td>{UNIT_LABELS[input.unit]}</Td>
            <Td>
              {input.bound ? (
                input.column ? (
                  <span>
                    <span className="font-mono text-foreground">{input.column}</span>
                    <span className="text-subtle-foreground"> on {input.source}</span>
                  </span>
                ) : (
                  <span className="text-foreground">{input.source}</span>
                )
              ) : (
                <NotStated>
                  {input.required ? 'Not in this workbook' : 'Not in this workbook (not needed)'}
                </NotStated>
              )}
            </Td>
            <Td className="text-right tabular-nums">
              {input.bound && input.column ? (
                <>
                  <span
                    className={
                      input.rows_missing > 0 ? 'text-warning' : 'font-medium text-foreground'
                    }
                  >
                    {input.rows_present.toLocaleString()}
                  </span>
                  <span className="text-subtle-foreground"> / {records.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-subtle-foreground">-</span>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  C - the citations                                                          */
/* -------------------------------------------------------------------------- */

function Citations({ paper }: { paper: EntryRecalculationData }) {
  if (paper.citation_count === 0) {
    return (
      <p className="flex items-start gap-2 rounded-card border border-success/30 bg-success/[0.07] p-4 text-sm leading-relaxed text-foreground">
        <Equal aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
        <span>
          Every one of {paper.rows_total.toLocaleString()} records rebuilt to the amount the
          workbook states for it, within the {paper.basis.row_tolerance} of rounding the business
          allows a record.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <TableShell
        caption="Records where the recomputation and the workbook do not agree"
        minWidth="min-w-[52rem]"
      >
        <thead>
          <tr>
            <Th>Row</Th>
            <Th>What it is</Th>
            <Th className="text-right">Recomputed</Th>
            <Th className="text-right">Stated</Th>
            <Th className="text-right">Difference</Th>
            <Th>Why</Th>
          </tr>
        </thead>
        <tbody>
          {paper.citations.map((citation) => (
            <CitationRow key={`${citation.row}-${citation.kind}`} citation={citation} />
          ))}
        </tbody>
      </TableShell>

      {paper.citation_count > paper.citations.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the {paper.citations.length} largest of{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {paper.citation_count.toLocaleString()}
          </span>{' '}
          records that did not reconcile, with one example of each kind kept.{' '}
          {paper.row_impact ? (
            <>
              They differ by{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {formatAmount(paper.row_impact)}
              </span>{' '}
              in total.
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function CitationRow({ citation }: { citation: RecalcCitation }) {
  return (
    <Tr>
      <Td className="font-mono text-xs whitespace-nowrap text-foreground">
        {citation.stated_cell || citation.row}
        {citation.sheet ? (
          <span className="block text-[10px] text-subtle-foreground">{citation.sheet}</span>
        ) : null}
      </Td>
      <Td>
        <Badge tone={citation.kind === 'stated_differs' ? 'danger' : 'warning'}>
          {DISCREPANCY_LABELS[citation.kind]}
        </Badge>
      </Td>
      <Td className="text-right tabular-nums">
        {citation.recomputed === null ? (
          <span className="text-subtle-foreground">-</span>
        ) : (
          formatAmount(citation.recomputed)
        )}
      </Td>
      <Td className="text-right tabular-nums">
        {citation.stated === null ? (
          <span className="text-subtle-foreground">-</span>
        ) : (
          formatAmount(citation.stated)
        )}
      </Td>
      <Td className="text-right font-medium tabular-nums">
        {citation.difference === null ? (
          <span className="text-subtle-foreground">-</span>
        ) : (
          <>
            <span className="text-danger">{formatVariance(citation.difference)}</span>
            {citation.difference_pct === null ? null : (
              <span className="block text-[10px] text-subtle-foreground">
                {citation.difference_pct.toFixed(2)}%
              </span>
            )}
          </>
        )}
      </Td>
      <Td>
        <p className="max-w-prose text-xs leading-relaxed">{citation.why}</p>
        {citation.inputs.length > 0 ? (
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-subtle-foreground">
            {citation.inputs
              .filter((value) => value.cell)
              .map((value) => `${value.cell} ${value.value ?? 'blank'}`)
              .join('  ·  ')}
          </p>
        ) : null}
      </Td>
    </Tr>
  );
}

/* -------------------------------------------------------------------------- */
/*  The basis                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What was recalculated, under which conventions.
 *
 * Last, and never omitted. A reviewer reopening this in March needs to know
 * which block of which tab was rebuilt, under which rounding and which
 * tolerance, before any figure above means anything - and whether the basis
 * itself has been signed off.
 *
 * Closed by default: it is the conventions a reader consults when they doubt a
 * figure above, not something to scroll past on every visit. The sign-off badge
 * rides on the summary rather than inside the panel, so the one thing here that
 * is a warning is still visible while the block is shut. The print stylesheet
 * forces it open, so a printed copy carries the basis in full.
 */
function Basis({ paper }: { paper: EntryRecalculationData }) {
  const { basis, booked } = paper;

  return (
    <details className="group scroll-mt-24">
      {/*
        A badge here, and the server's own sentence in the notes below - not the same forty
        words in both places. The badge marks the figures where they are read; the sentence
        sits where the other caveats already are, and a reader who meets one twice within a
        screen of itself reads it as a layout fault rather than as a warning.
      */}
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
        <h3
          id="entry-recalculation-basis-heading"
          className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        >
          What was rebuilt, and under which rules
        </h3>
        {basis.provisional_basis ? (
          <Badge tone="warning">
            <AlertTriangle aria-hidden className="mr-1 size-3" />
            Basis not signed off
          </Badge>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="duration-quick ml-auto size-4 shrink-0 text-muted-foreground transition-transform ease-out-soft group-open:rotate-180"
        />
      </summary>

      <dl className="mt-2 grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-rest sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Rebuilt from"
          value={`${basis.sheet} rows ${basis.first_row.toLocaleString()}-${basis.last_row.toLocaleString()}`}
          hint={`The ${basis.table} table, as the entry type binds it`}
        />
        <Field
          label="Records"
          value={basis.record_key ? `Rows carrying ${basis.record_key}` : 'Every row of the block'}
          hint="A profiled block runs past the last record into the preparer's own subtotal rows, which are not records and are not summed."
        />
        <Field
          label="Booked amount from"
          value={BOOKED_METHOD_LABELS[booked.method]}
          hint={booked.description}
        />
        <Field
          label="Accounts reached"
          value={
            booked.accounts.length > 0 ? (
              booked.accounts.join(', ')
            ) : (
              <NotStated>None read</NotStated>
            )
          }
        />
        <Field label="Rounding" value={basis.rounding} />
        <Field
          label="Tolerance"
          value={`${basis.tolerance_pct}% (${formatAmount(basis.tolerance_amount)})`}
          hint={`Per record, ${basis.row_tolerance} of rounding is allowed`}
        />
        <Field label="Currency" value={basis.currency || <NotStated>Not stated</NotStated>} />
        <Field label="Sign convention" value={basis.sign || <NotStated>Not stated</NotStated>} />
        {basis.day_count ? <Field label="Day count" value={basis.day_count} /> : null}
        <Field
          label="Time to rebuild"
          value={`${paper.duration_ms.toLocaleString()} ms`}
          hint={`${paper.rows_total.toLocaleString()} records, one pass`}
        />
      </dl>
    </details>
  );
}
