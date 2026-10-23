/**
 * The arithmetic behind the parameters: the working re-added, split by its own classes.
 *
 * The section above this one says what the entry scored. This one says *how the
 * number is arrived at* — what it is composed of, how it divides between the
 * classes the workbook sorts its rows into, whether the totals the preparer
 * typed above the data agree with an independent re-add of the rows beneath
 * them, what each column's formula actually says, and what one row looks like
 * traced end to end. It is the page a reviewer points at when asked why the
 * figure is believed.
 *
 * **Nothing on it is labelled by this file.** Every row title is the header the
 * preparer wrote, every column letter comes from the verified sheet map, and
 * every class is a value the classification column turned out to hold. Even the
 * number formatting is the workbook's own, read off Excel's format string. A
 * workbook that spells its classes `Permanent` and `Temp`, in a column called
 * something nobody here has seen, renders correctly with no edit — which is the
 * whole reason there is no mapping table in this feature.
 *
 * The blocks are lettered A to E rather than numbered, so the report's numbered
 * spine still reads 1, 2, 3 while "four B" names the tie-out inside it.
 *
 * Nothing is behind a disclosure. The traced rows have a picker, but every one
 * of them is in the document and the unselected ones are hidden for screen
 * only: this report is printed and circulated, and a table behind a closed
 * panel prints as a blank.
 */

import { useState } from 'react';

import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';

import { formatExcel, formatShare, formatVariance } from '../lib/excelFormat';
import { STATUS_TONE } from '../lib/status';
import { termLabel } from '../lib/terms';
import {
  AREA_LABELS,
  type CategoryRef,
  type ComponentSplit,
  type DerivedRule,
  type ExceptionTest,
  type ReviewDetail,
  type RowWalkthrough,
  SEVERITY_LABELS,
  type SplitSummary as SplitSummaryData,
  type SplitTieOut,
  STATUS_LABELS,
  type WalkStep,
} from '../types';
import { Section } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

interface RecalculationProps {
  review: ReviewDetail;
  /** Position in the report's numbered spine, allocated by `ReviewResult`. */
  index: number;
}

export function Recalculation({ review, index }: RecalculationProps) {
  const paper = review.split_summary;
  if (!paper) return null;

  const { basis, categories, components, tie_outs: tieOuts } = paper;
  const agreeing = tieOuts.filter((entry) => entry.within_tolerance === true).length;

  return (
    <Section
      index={index}
      id="recalculation"
      // The title names the column the split was taken on, because that is what
      // makes the section mean something. "Independent recalculation" alone does
      // not say recalculated *how*.
      // The fallback is for an older stored payload only; the server will not
      // produce a work paper without a header on the column it split on.
      title={`Independent recalculation by ${basis.classification_header || 'category'}`}
      aside={
        <span>
          <span className="font-semibold text-foreground tabular-nums">
            {basis.rows_read.toLocaleString()}
          </span>{' '}
          rows re-added
          {tieOuts.length > 0 ? (
            <span className={agreeing === tieOuts.length ? 'text-success' : 'text-danger'}>
              {' · '}
              {agreeing}/{tieOuts.length} control totals agree
            </span>
          ) : null}
        </span>
      }
    >
      <p className="-mt-1 mb-5 max-w-prose text-xs leading-relaxed text-muted-foreground">
        Everything below was computed from the workbook's own cells by code alone — no model
        contributed a figure. The row titles are the headers the preparer wrote and the amounts are
        formatted the way the file formats them.
      </p>

      <div className="space-y-6">
        <Block letter="A" title="What the entry is composed of, by class">
          <SplitMatrix categories={categories} components={components} />
        </Block>

        {tieOuts.length > 0 ? (
          <Block
            letter="B"
            title="Against the totals the file states above its own data"
            note="Each of these was found by shape, not by address: a number sitting in a column above its header is that column's control total, wherever the preparer put it."
          >
            <TieOutTable entries={tieOuts} />
          </Block>
        ) : null}

        <Block
          letter="C"
          title="How each column is calculated"
          note={
            paper.rules.length > 0
              ? 'The live formula, with every reference replaced by the header of the column it reads. A substitution rather than a translation, so it cannot say anything the file does not.'
              : undefined
          }
        >
          <Rules rules={paper.rules} />
        </Block>

        {paper.walkthroughs.length > 0 ? (
          <Block
            letter="D"
            title="One row, traced"
            note="Addressed by row number and nothing else. No name, no personnel reference — enough to open the file at the right line and follow the same arithmetic."
          >
            <Walkthroughs walkthroughs={paper.walkthroughs} />
          </Block>
        ) : null}

        {paper.tests.length > 0 ? (
          <Block
            letter="E"
            title="What each test found"
            note="Carried from the checks above rather than re-run here, so this table and the parameters section can never disagree about a result."
          >
            <Tests tests={paper.tests} />
          </Block>
        ) : null}

        <Basis paper={paper} />

        {paper.notes.length > 0 ? <Notes notes={paper.notes} /> : null}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  A lettered block inside the section                                        */
/* -------------------------------------------------------------------------- */

function Block({
  letter,
  title,
  note,
  children,
}: {
  letter: string;
  title: string;
  note?: string | undefined;
  children: React.ReactNode;
}) {
  const id = `recalculation-${letter.toLowerCase()}`;

  return (
    <section aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h3
        id={`${id}-heading`}
        className="flex items-baseline gap-2.5 text-sm font-semibold text-foreground"
      >
        {/* The letter is inside the heading and not aria-hidden, the same way
            `Section` carries its number: "look at four B" has to work for
            somebody listening to the report as well as for somebody pointing at
            it, and the print stylesheet drops `[aria-hidden]` elements outright,
            so a decorative letter prints as nothing at all. */}
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-accent-strong">
          {letter}
        </span>{' '}
        {title}
      </h3>
      {note ? (
        <p className="mt-1 mb-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      ) : (
        <div className="mb-3" />
      )}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  A — the matrix                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Components down, classes across.
 *
 * The share sits under each amount rather than in columns of its own. Three
 * classes would otherwise need three more columns, and on a thirty-row working
 * that is a table nobody can read across. Under the figure it is also where it
 * belongs: it qualifies that figure and no other.
 */
function SplitMatrix({
  categories,
  components,
}: {
  categories: CategoryRef[];
  components: ComponentSplit[];
}) {
  if (components.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The working bound no column of quantities, so there is nothing to re-add.
      </p>
    );
  }

  return (
    <>
      <TableShell
        caption="Each measured column of the working, re-added and divided by class"
        minWidth="min-w-[48rem]"
      >
        <thead>
          <tr>
            <Th>Column</Th>
            {categories.map((category) => (
              <Th key={category.key} className="text-right">
                {category.label}{' '}
                <span className="mt-0.5 block text-[9px] font-normal tracking-normal normal-case">
                  {category.row_count.toLocaleString()} rows
                </span>
              </Th>
            ))}
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <Tr key={component.column}>
              {/* Not a sticky column, though the temptation is obvious. The shell
                  owns the horizontal scroll and no other table in this report
                  pins its first cell, so one that did would read as a different
                  table - and a sticky cell inside `border-collapse` drops its
                  own row border, which looks like a rendering fault rather than
                  a choice. With two or three classes the matrix fits anyway. */}
              <th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground">
                {component.header || `Column ${component.column}`}{' '}
                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-normal text-subtle-foreground">
                  <span className="font-mono">{component.column}</span>
                  {component.meaning ? (
                    <span title="The meaning the verified sheet map bound this column to">
                      · {termLabel(component.meaning).toLowerCase()}
                    </span>
                  ) : null}
                </span>
              </th>

              {categories.map((category) => (
                <Td key={category.key} className="text-right tabular-nums">
                  <span className="text-foreground">
                    {formatExcel(component.amounts[category.key], component.number_format)}
                  </span>{' '}
                  {component.shares[category.key] !== undefined ? (
                    <span className="mt-0.5 block text-[10px] text-subtle-foreground">
                      {formatShare(component.shares[category.key])}
                    </span>
                  ) : null}
                </Td>
              ))}

              <Td className="bg-surface-muted/40 text-right font-semibold text-foreground-strong tabular-nums">
                {formatExcel(component.total, component.number_format)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Each row's classes add up to its total exactly. Rows of the block that carry no class at all
        are outside both — a block ends at a run of blank rows, so it reaches past the last record
        into the preparer's own subtotals, and adding those would count the column twice.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  B — the tie-out                                                            */
/* -------------------------------------------------------------------------- */

function TieOutTable({ entries }: { entries: SplitTieOut[] }) {
  return (
    <TableShell
      caption="Totals stated in the workbook against an independent re-add of the rows"
      minWidth="min-w-[44rem]"
    >
      <thead>
        <tr>
          <Th>Column</Th>
          <Th>Stated at</Th>
          <Th className="text-right">The file says</Th>
          <Th className="text-right">Re-added</Th>
          <Th className="text-right">Variance</Th>
          <Th>Outcome</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <Tr key={entry.cell}>
            <th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground">
              {entry.label}
            </th>
            <Td>
              <span className="font-mono text-xs">{entry.cell}</span>{' '}
              <TypedOrCalculated isFormula={entry.stated_is_formula} />
            </Td>
            <Td className="text-right text-foreground tabular-nums">{formatExcel(entry.stated)}</Td>
            <Td className="text-right tabular-nums">{formatExcel(entry.recomputed)}</Td>
            <Td
              className={cn(
                'text-right font-mono text-xs tabular-nums',
                entry.within_tolerance === false && 'text-danger',
              )}
            >
              {formatVariance(entry.variance)}
            </Td>
            <Td>
              {entry.within_tolerance === null ? (
                <Badge tone="neutral" size="sm">
                  Nothing to compare
                </Badge>
              ) : (
                <Badge tone={entry.within_tolerance ? 'success' : 'danger'} size="sm">
                  {entry.within_tolerance ? 'Agrees' : 'Differs'}
                </Badge>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

/**
 * Whether a stated total calculates itself.
 *
 * Three states, not two. A total that was typed by hand agreed with the rows on
 * the day somebody typed it and will go on agreeing after they change; a total
 * on a format that carries no formulas is one nobody can tell either way about.
 * Rendering the second as the first would be a finding the file does not support.
 */
function TypedOrCalculated({ isFormula }: { isFormula: boolean | null }) {
  if (isFormula === null) {
    return (
      <span
        className="mt-0.5 block text-[10px] text-subtle-foreground"
        title="This workbook format carries no formulas, so whether the total calculates itself cannot be read"
      >
        not readable
      </span>
    );
  }
  return (
    <span
      className={cn(
        'mt-0.5 block text-[10px]',
        isFormula ? 'text-subtle-foreground' : 'text-warning',
      )}
      title={
        isFormula
          ? 'The cell calculates itself from the rows beneath it'
          : 'The cell holds a typed number. It agreed with the rows when somebody typed it, and will go on agreeing after the rows change'
      }
    >
      {isFormula ? 'calculated' : 'typed by hand'}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  C — the rules                                                              */
/* -------------------------------------------------------------------------- */

function Rules({ rules }: { rules: DerivedRule[] }) {
  if (rules.length === 0) {
    return (
      <Card tone="sunken" elevation="flat" className="border-dashed border-border-strong p-4">
        <p className="text-sm leading-relaxed text-foreground">
          No column of this working calculates itself in the rows that were scanned: every amount is
          a typed value.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          That is a finding rather than a gap in this report. Nothing here can be re-performed from
          the file's own formulas, so the amounts above were re-added from the values as they stand.
        </p>
      </Card>
    );
  }

  return (
    <ol className="space-y-2.5">
      {rules.map((rule, position) => (
        <li
          key={rule.column}
          className="stagger"
          style={{ '--i': position } as React.CSSProperties}
        >
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-hairline bg-surface-muted/50 px-4 py-2">
              <h4 className="text-sm font-medium text-foreground">{rule.header}</h4>
              <span className="font-mono text-[11px] text-subtle-foreground">
                read from {rule.column}
                {rule.row}
              </span>
            </div>
            <div className="px-4 py-3">
              {/* The resolved reading leads. It is the one a reviewer can check
                  against their understanding of the methodology; the raw
                  formula is what they would paste into the file. */}
              <p className="font-mono text-[13px] leading-relaxed break-words text-foreground">
                {rule.in_headers}
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed break-words text-subtle-foreground">
                {rule.formula}
              </p>
              {rule.reads.length > 0 ? (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {rule.reads.map((read) => (
                    <li
                      key={read}
                      className="rounded-md border border-border bg-surface-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {read}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  D — the traced row                                                         */
/* -------------------------------------------------------------------------- */

function Walkthroughs({ walkthroughs }: { walkthroughs: RowWalkthrough[] }) {
  const [selected, setSelected] = useState(walkthroughs[0]?.row);
  const shown = walkthroughs.find((walk) => walk.row === selected) ?? walkthroughs[0];
  if (!shown) return null;

  return (
    <div className="space-y-3">
      {walkthroughs.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which row to trace">
          {walkthroughs.map((walk) => {
            const active = walk.row === shown.row;
            return (
              <button
                key={walk.row}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelected(walk.row);
                }}
                className={cn(
                  'press rounded-pill border px-3 py-1 font-mono text-xs transition-colors duration-[160ms] ease-glide',
                  active
                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted',
                )}
              >
                Row {walk.row}
              </button>
            );
          })}
        </div>
      ) : null}

      {walkthroughs.map((walk) => (
        <TracedRow key={walk.row} walk={walk} visible={walk.row === shown.row} />
      ))}
    </div>
  );
}

/**
 * One traced row.
 *
 * Every one of them is rendered and the unselected ones are hidden for screen
 * only. This report is printed and circulated, and a row behind a picker would
 * print as the one row that happened to be selected — which, when the others
 * are the exceptions somebody has to look at, is the half of the evidence a
 * reader most needs. `print:block` is what brings them back.
 */
function TracedRow({ walk, visible }: { walk: RowWalkthrough; visible: boolean }) {
  return (
    <Card className={cn('overflow-hidden', !visible && 'hidden print:block')}>
      <div className="border-b border-border-hairline bg-surface-muted/50 px-4 py-2.5">
        <p className="text-sm font-medium text-foreground">
          Row {walk.row}
          {walk.category ? (
            <span className="ml-2 font-normal text-muted-foreground">· {walk.category}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{walk.why}</p>
        {walk.context.length > 0 ? (
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {walk.context.map(([header, value]) => (
              <div key={header} className="flex items-baseline gap-1.5 text-xs">
                <dt className="text-subtle-foreground">{header}</dt>
                <dd className="font-medium text-foreground">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <TableShell
        caption={`Every measured column on row ${String(walk.row)}, with the formula behind it`}
        className="rounded-none border-0 shadow-none"
        minWidth="min-w-[40rem]"
      >
        <thead>
          <tr>
            <Th>Column</Th>
            <Th>Cell</Th>
            <Th className="text-right">Value</Th>
            <Th>How it is arrived at</Th>
          </tr>
        </thead>
        <tbody>
          {walk.steps.map((step) => (
            <StepRow key={step.cell} step={step} />
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
}

function StepRow({ step }: { step: WalkStep }) {
  return (
    <Tr>
      <th scope="row" className="px-3 py-2.5 text-left font-medium text-foreground">
        {step.header || `Column ${step.column}`}
      </th>
      <Td className="font-mono text-xs">{step.cell}</Td>
      <Td className="text-right text-foreground tabular-nums">
        {formatExcel(step.value, step.number_format)}
      </Td>
      <Td>
        {step.in_headers ? (
          <span className="font-mono text-[11px] break-words">{step.in_headers}</span>
        ) : (
          // Said in words rather than left blank: an empty cell here is
          // indistinguishable from a formula the report failed to read, and the
          // two mean opposite things about the evidence.
          <span className="text-xs text-subtle-foreground">A typed value, not a calculation</span>
        )}
      </Td>
    </Tr>
  );
}

/* -------------------------------------------------------------------------- */
/*  E — the tests                                                              */
/* -------------------------------------------------------------------------- */

const SEVERITY_TONE: Record<ExceptionTest['severity'], 'danger' | 'warning' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  info: 'neutral',
};

function Tests({ tests }: { tests: ExceptionTest[] }) {
  return (
    <>
      <TableShell
        caption="Every test that ran over the working, what it flagged, and what it came to"
        minWidth="min-w-[52rem]"
      >
        <thead>
          <tr>
            <Th>Test</Th>
            <Th className="text-right">Rows checked</Th>
            <Th className="text-right">Flagged</Th>
            <Th className="text-right">Value affected</Th>
            <Th>Severity</Th>
            <Th>Outcome</Th>
            <Th>First example</Th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <Tr key={test.check_id}>
              <th
                scope="row"
                className="max-w-[22rem] px-3 py-2.5 text-left font-medium text-foreground"
              >
                {test.question || test.check_id}{' '}
                <span className="mt-0.5 block text-[10px] font-normal text-subtle-foreground">
                  {AREA_LABELS[test.area] ?? termLabel(test.area)} · {test.tool}
                </span>
              </th>
              <Td className="text-right tabular-nums">
                {test.rows_total > 0 ? (
                  <>
                    {test.rows_checked.toLocaleString()}{' '}
                    {test.rows_checked < test.rows_total ? (
                      <span
                        className="mt-0.5 block text-[10px] text-warning"
                        title="Rows where an input did not resolve. The workbook claimed nothing there, so there was nothing to disagree with"
                      >
                        of {test.rows_total.toLocaleString()}
                      </span>
                    ) : null}
                  </>
                ) : (
                  '-'
                )}
              </Td>
              <Td
                className={cn(
                  'text-right font-medium tabular-nums',
                  test.flagged > 0 ? 'text-foreground' : 'text-subtle-foreground',
                )}
              >
                {test.flagged.toLocaleString()}
              </Td>
              <Td className="text-right tabular-nums">{formatExcel(test.financial_impact)}</Td>
              <Td>
                <Badge tone={SEVERITY_TONE[test.severity]} variant="soft" size="sm">
                  {SEVERITY_LABELS[test.severity]}
                </Badge>
              </Td>
              <Td>
                <Badge tone={STATUS_TONE[test.status]} size="sm">
                  {STATUS_LABELS[test.status]}
                </Badge>
              </Td>
              <Td className="font-mono text-xs">{test.first_example ?? '-'}</Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Severity is read off the weight the business gave each area, so it and the score can never
        tell two different stories about what matters. An unscored observation always reads as
        information: it moves no score by design.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  The basis, and what could not be done                                      */
/* -------------------------------------------------------------------------- */

function Basis({ paper }: { paper: SplitSummaryData }) {
  const { basis } = paper;
  const skipped = basis.rows_total - basis.rows_read;

  return (
    <section aria-labelledby="recalculation-basis-heading">
      <h3
        id="recalculation-basis-heading"
        className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        What this was read from
      </h3>
      <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border shadow-rest sm:grid-cols-3 lg:grid-cols-5">
        <Fact label="Tab" value={basis.sheet} mono />
        <Fact
          label="Block"
          value={`${basis.first_row}-${basis.last_row}`}
          hint={`Headers on row ${String(basis.header_row)}`}
          mono
        />
        <Fact
          label="Rows re-added"
          value={basis.rows_read.toLocaleString()}
          hint={
            skipped > 0
              ? `${skipped.toLocaleString()} further rows in the block carry no class and were left out`
              : undefined
          }
        />
        <Fact
          label="Split on"
          value={`${basis.classification_column} · ${basis.classification_header}`}
          hint={
            basis.classification_meaning
              ? 'Chosen because the verified sheet map bound this column'
              : 'Chosen by shape: no column here carried a meaning the map recognises'
          }
          mono
        />
        <Fact
          label="Tolerance"
          value={basis.tolerance}
          hint="What the business agreed counts as agreeing"
          mono
        />
      </dl>
    </section>
  );
}

function Notes({ notes }: { notes: string[] }) {
  return (
    <Card
      as="section"
      aria-labelledby="recalculation-notes-heading"
      tone="sunken"
      elevation="flat"
      className="border-dashed border-border-strong p-4"
    >
      <h3
        id="recalculation-notes-heading"
        className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        What this recalculation could not do
      </h3>
      <ul className="mt-2 space-y-2">
        {notes.map((note) => (
          <li key={note} className="flex gap-3 text-sm text-foreground">
            <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-border-strong" />
            <span className="leading-relaxed">{note}</span>
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
  value: string;
  hint?: string | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 text-sm font-semibold text-pretty break-words text-foreground tabular-nums',
          mono && 'font-mono text-xs',
        )}
      >
        {value}
      </dd>
      {hint ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
