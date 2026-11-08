/**
 * The entry recalculation, read in the order a reviewer asks about it.
 *
 * Four sections, and they answer four questions in sequence: how big is the difference,
 * where is it, how is the amount meant to be worked out, and what does that look like on
 * the record that broke. A reviewer who reads only the first tile row has the finding; one
 * who reads to the end has the cell to open and the arithmetic to quote in the email.
 *
 * Nothing here computes anything. Every figure and every sentence is produced by the
 * engine - the difference and the coverage by the work paper, the cell and the expected
 * value by `row_diagnosis`, which solves them from the business's own formula, and the
 * step wording by the entry type's `walkthrough`. This file lays them out, counts how many
 * findings share a row, and does no arithmetic of its own: a UI that re-performs a
 * business formula is a second answer nobody reconciled.
 *
 * The blocks the work paper carried before this - every record, what it was rebuilt from,
 * the full prose explanation, the basis - are still below, lettered on from here. They are
 * the evidence for these four, and a reader who wants them should not have to go looking
 * in a different place than they were yesterday.
 */

import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

import { formatAmount } from '../lib/excelFormat';
import type {
  EntryRecalculation as EntryRecalculationData,
  RecalcCitation,
  RowDiagnosis,
  Walkthrough,
} from '../types';
import { NotStated } from './Section';
import { TableShell, Td, Th, Tr } from './TableShell';

/* -------------------------------------------------------------------------- */
/*  One lettered part                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A section of the panel, lettered so one person can say "look at B" to another.
 *
 * The letter sits inside the heading rather than beside it as decoration: the print
 * stylesheet drops `aria-hidden` elements, and a reader listening to the report needs the
 * letter as much as a reader pointing at it.
 */
export function Part({
  prefix,
  letter,
  title,
  children,
}: {
  prefix: string;
  letter: string;
  title: string;
  children: ReactNode;
}) {
  const id = `${prefix}-${letter.toLowerCase()}`;

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h3
        id={`${id}-heading`}
        className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        {letter} · {title}
      </h3>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  A · The difference                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The four figures the whole section comes down to.
 *
 * The difference is the one tile with a colour on it, because it is the one a reader is
 * looking for. Its second line says what the difference is as a share and whether that
 * share is inside the limit the business set — the two facts that decide whether this is
 * a finding or a note, side by side rather than two sections apart.
 */
function Figures({ paper }: { paper: EntryRecalculationData }) {
  const blanks = paper.citations.filter((citation) => citation.kind === 'input_missing');
  const notRecomputed = paper.rows_total - paper.rows_recomputed;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Our calculation" value={formatAmount(paper.recomputed_total)} />
      <Tile
        label="Booked in JE"
        value={
          paper.booked.total === null ? (
            <NotStated>Not read</NotStated>
          ) : (
            formatAmount(paper.booked.total)
          )
        }
      />
      {/*
        Neutral, not amber, where there was nothing to compare: a required input the
        workbook does not carry is a gap in the evidence, and a tile that renders it like
        a difference turns every unusual workbook into an exception somebody must clear.
      */}
      <Tile
        label="Difference"
        tone={paper.within_tolerance === null ? 'plain' : 'accent'}
        value={
          paper.difference === null ? (
            <NotStated>Nothing to compare</NotStated>
          ) : (
            formatAmount(paper.difference)
          )
        }
        note={<Limit paper={paper} />}
      />
      <Tile
        label="Employees checked"
        value={`${formatNumber(paper.rows_recomputed)} / ${formatNumber(paper.rows_total)}`}
        note={
          notRecomputed > 0 ? (
            // One string rather than three nodes: a reader selects this to paste into a
            // mail, and a sentence split across elements copies with the spaces missing.
            <span className="text-primary">{blankNote(notRecomputed, blanks)}</span>
          ) : undefined
        }
      />
    </div>
  );
}

/** "2 rows are blank (rows 232 and 1650)" — the count, and the records themselves. */
function blankNote(count: number, blanks: RecalcCitation[]): string {
  const sentence = `${formatNumber(count)} ${count === 1 ? 'row is' : 'rows are'} blank`;
  return blanks.length > 0 ? `${sentence} (${rowList(blanks)})` : sentence;
}

/** "rows 232 and 1650" — the records themselves, where the work paper cited them. */
function rowList(citations: RecalcCitation[]): string {
  const rows = citations.map((citation) => String(citation.row));
  const noun = rows.length === 1 ? 'row' : 'rows';
  if (rows.length === 1) return `${noun} ${String(rows[0])}`;
  return `${noun} ${rows.slice(0, -1).join(', ')} and ${String(rows.at(-1))}`;
}

/**
 * The difference as a share, against the limit it was measured under.
 *
 * Both halves or neither: a percentage with no limit beside it is a number a reader has to
 * carry to another section to use, and the limit on its own says nothing about this entry.
 */
function Limit({ paper }: { paper: EntryRecalculationData }) {
  if (paper.difference_pct === null) return null;

  const share = `${Math.abs(paper.difference_pct).toFixed(2)}%`;
  const limit = `${paper.basis.tolerance_pct}% limit`;

  return (
    <>
      {share} –{' '}
      {paper.within_tolerance === false ? (
        <span className="text-danger">beyond the {limit}</span>
      ) : (
        <>within the {limit}</>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  note,
  tone = 'plain',
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'plain' | 'accent';
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-3.5',
        tone === 'accent' ? 'border-accent/40 bg-accent/[0.07]' : 'border-border bg-surface',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-xl leading-none font-semibold tabular-nums',
          tone === 'accent' ? 'text-accent-strong' : 'text-foreground-strong',
        )}
      >
        {value}
      </p>
      {note ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-subtle-foreground">{note}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  A · What was checked                                                       */
/* -------------------------------------------------------------------------- */

/** One line of the findings table: a check, where it looked, and what it found. */
interface Finding {
  key: string;
  label: string;
  where: string;
  recomputed: string | null;
  stated: string | null;
  difference: string | null;
  row: number;
}

/**
 * Every check that cited the record carrying the difference.
 *
 * Gathered across the work paper's own citations and the related checks', because to a
 * reviewer they are one finding seen three times rather than three findings: the entry
 * total is wrong *because* the RTT value is wrong, and reading them apart is what makes a
 * single bad cell look like a workbook full of problems. Where other records are cited
 * too, the count is said rather than the rows silently dropped.
 */
function Findings({ paper }: { paper: EntryRecalculationData }) {
  const focus = paper.row_diagnosis?.row ?? null;
  const stated = paper.walkthrough?.stated_label ?? '';

  const own: Finding[] = paper.citations
    .filter((citation) => citation.kind === 'stated_differs')
    .map((citation) => ({
      key: `own-${String(citation.row)}-${citation.stated_cell}`,
      label: stated || paper.basis.stated_header || 'Record total',
      where: cellOf(citation, paper.basis.sheet),
      recomputed: citation.recomputed,
      stated: citation.stated,
      difference: citation.difference,
      row: citation.row,
    }));

  const related: Finding[] = paper.related_checks.flatMap((check) =>
    check.citations
      .filter((citation) => citation.kind === 'stated_differs')
      .map((citation) => ({
        key: `${check.check_id}-${String(citation.row)}-${citation.stated_cell}`,
        label: check.short || check.label,
        where: cellOf(citation, paper.basis.sheet),
        recomputed: citation.recomputed,
        stated: citation.stated,
        difference: citation.difference,
        row: citation.row,
      })),
  );

  const all = [...own, ...related];
  const shown = focus === null ? all : all.filter((finding) => finding.row === focus);
  const elsewhere = all.length - shown.length;

  if (shown.length === 0) return null;

  return (
    <div className="mt-3">
      <TableShell
        caption="Each check that cited this record, and what it found"
        minWidth="min-w-[48rem]"
      >
        <thead>
          <tr>
            <Th>What was checked</Th>
            <Th>Where</Th>
            <Th className="text-right">Our calculation</Th>
            <Th className="text-right">In the file</Th>
            <Th className="text-right">Difference</Th>
            <Th>Result</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((finding) => (
            <Tr key={finding.key}>
              <Td className="font-medium text-foreground">{finding.label}</Td>
              <Td className="font-mono text-xs text-muted-foreground">{finding.where}</Td>
              <Td className="text-right tabular-nums">{formatAmount(finding.recomputed)}</Td>
              <Td className="text-right tabular-nums">{formatAmount(finding.stated)}</Td>
              <Td className="text-right tabular-nums">{formatAmount(finding.difference)}</Td>
              <Td className="font-medium text-danger">Fail</Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      {shown.length > 1 && focus !== null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          All {word(shown.length)} problems come from the same employee (row {focus}).
        </p>
      ) : null}
      {elsewhere > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {formatNumber(elsewhere)} further{' '}
          {elsewhere === 1 ? 'record is cited' : 'records are cited'} below.
        </p>
      ) : null}
    </div>
  );
}

/** "GPAY!AH9" — the sheet the work paper walked, and the cell the check cited. */
function cellOf(citation: RecalcCitation, sheet: string): string {
  const on = citation.sheet || sheet;
  return on ? `${on}!${citation.stated_cell}` : citation.stated_cell;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function word(count: number): string {
  return WORDS[count] ?? formatNumber(count);
}

/* -------------------------------------------------------------------------- */
/*  B · Where the problem is                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The cell to open, what is in it, and what to do.
 *
 * Four labelled lines, in the order somebody acts on them. The wording is the engine's and
 * is deliberately an ask rather than an accusation — the record agreeing at some value is
 * evidence about where to look, not proof of what the preparer meant to type.
 */
function Problem({ diagnosis }: { diagnosis: RowDiagnosis }) {
  return (
    <div className="rounded-card border border-danger/25 bg-danger/[0.05] p-4 sm:p-5">
      <dl className="space-y-2.5 text-sm leading-relaxed text-foreground">
        <Line label="Where" value={diagnosis.where} />
        <Line label="Problem" value={diagnosis.problem} />
        <Line label="Impact" value={diagnosis.impact} />
        <Line label="Next step" value={diagnosis.next_step} />
      </dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="text-pretty">
      <dt className="inline font-semibold text-foreground-strong">{label}:</dt>{' '}
      <dd className="inline">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  C · How the amount is calculated                                           */
/* -------------------------------------------------------------------------- */

/**
 * The formula in one line and six sentences, exactly as the business wrote them.
 *
 * The full prose account is still below, under its own letter. This is the form a reader
 * needs while they are looking at a difference: short enough to hold in the head while
 * reading the worked example beside it.
 */
function HowItWorks({ walkthrough }: { walkthrough: Walkthrough }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
      {walkthrough.total ? (
        <p className="text-sm font-semibold text-pretty text-foreground-strong">
          {walkthrough.total}
        </p>
      ) : null}

      <ol className="mt-3 space-y-1.5">
        {walkthrough.steps.map((step, index) => (
          <li key={step.id} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span className="flex-none text-muted-foreground tabular-nums">{index + 1}.</span>
            <span className="text-pretty">{step.line}</span>
          </li>
        ))}
      </ol>

      {walkthrough.footnote ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{walkthrough.footnote}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  D · The example                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The same record, worked twice: as the formula says it should be, and as the file has it.
 *
 * The right-hand column prints the arithmetic only on the steps where the two part
 * company. Repeating an identical sum in both columns invites a reader to hunt for a
 * difference that is not there, and on this record four of the six steps are identical.
 */
function Example({ diagnosis }: { diagnosis: RowDiagnosis }) {
  const fault = diagnosis.fault;
  const correct = fault?.expected == null ? 'Correct' : `Correct (${label(diagnosis)})`;
  const wrong =
    fault?.value == null
      ? 'As the file has it'
      : `With wrong ${plain(fault.label)} (${formatNumber(Number(fault.value))})`;

  return (
    <>
      <TableShell
        caption="Each step of the formula on this record, both ways"
        minWidth="min-w-[44rem]"
      >
        <thead>
          <tr>
            <Th>Step</Th>
            <Th>{correct}</Th>
            <Th>{wrong}</Th>
          </tr>
        </thead>
        <tbody>
          {diagnosis.steps.map((step) => (
            <Tr key={step.label}>
              <Td className="font-medium text-foreground">{step.label}</Td>
              <Td className="tabular-nums">{step.correct}</Td>
              <Td className={cn('tabular-nums', step.differs ? 'text-danger' : undefined)}>
                {step.actual}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      {diagnosis.difference === null ? null : (
        <div className="mt-2 rounded-card border border-accent/40 bg-accent/[0.07] px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-foreground-strong">Difference: </span>
            <span className="tabular-nums">
              {formatAmount(diagnosis.recomputed)} – {formatAmount(diagnosis.stated)} ={' '}
              <span className="font-semibold">{formatAmount(diagnosis.difference)}</span>
            </span>
          </p>
        </div>
      )}
    </>
  );
}

/** "daily salary 311.74" — the input, as the correct column is headed. */
function label(diagnosis: RowDiagnosis): string {
  const fault = diagnosis.fault;
  if (fault?.expected == null) return 'as approved';
  return `${plain(fault.label)} ${formatNumber(Number(fault.expected))}`;
}

/** A workbook header as it reads mid-sentence: "Daily Salary (RTT Rate)" → "daily salary". */
function plain(header: string): string {
  const cleaned = header.replace(/\s+/g, ' ').trim();
  const bracket = cleaned.indexOf('(');
  return (bracket > 0 ? cleaned.slice(0, bracket) : cleaned).trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*  The four parts together                                                    */
/* -------------------------------------------------------------------------- */

export function CalculationDetails({
  paper,
  prefix,
}: {
  paper: EntryRecalculationData;
  prefix: string;
}) {
  const diagnosis = paper.row_diagnosis;
  const walkthrough = paper.walkthrough;

  return (
    <>
      <Part prefix={prefix} letter="A" title="Summary of the difference">
        <Figures paper={paper} />
        <Findings paper={paper} />
      </Part>

      {diagnosis ? (
        <Part
          prefix={prefix}
          letter="B"
          title={`Where the problem is (row ${String(diagnosis.row)})`}
        >
          <Problem diagnosis={diagnosis} />
        </Part>
      ) : null}

      {walkthrough && walkthrough.steps.length > 0 ? (
        <Part prefix={prefix} letter="C" title="How the amount is calculated">
          <HowItWorks walkthrough={walkthrough} />
        </Part>
      ) : null}

      {diagnosis && diagnosis.steps.length > 0 ? (
        <Part prefix={prefix} letter="D" title={`Example – row ${String(diagnosis.row)}`}>
          <Example diagnosis={diagnosis} />
        </Part>
      ) : null}
    </>
  );
}
