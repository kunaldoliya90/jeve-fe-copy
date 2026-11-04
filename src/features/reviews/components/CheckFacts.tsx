/**
 * What one check looked at, and why it is with a person.
 *
 * Shared, because the same check is reported twice on purpose — once under
 * the parameter it scored, and once in the reviewer's worklist — and two
 * renderings of one check are two chances for them to disagree. A reviewer
 * who sees "3 exceptions" in section 3 and nothing in section 5 has to work
 * out which of the two is wrong before they can do anything else.
 */

import { cn } from '@/utils/cn';

import { formatAmount, formatVariance } from '../lib/excelFormat';
import { termLabel } from '../lib/terms';
import type { CheckView, FigureSampleView } from '../types';

/** Cells beyond this are counted rather than listed; the rest is a wall. */
const CELLS_SHOWN = 6;

/**
 * The reference line under a conclusion.
 *
 * These are the facts a reviewer re-performs from: how the check was settled,
 * how many rows came out as exceptions, what those rows are worth, and where
 * in the workbook to look. Small and grey because they are reference rather
 * than argument — but present, because a conclusion nobody can trace back to
 * a cell is an opinion.
 */
export function CheckFacts({ check }: { check: CheckView }) {
  const settledByFigures = check.decided_by === 'figures';
  // Richer than a bare cell reference: a row-level re-performance carries what was
  // expected against what the workbook states, and the table below is what makes that
  // legible. A tool whose sample means something else (an account, a posting date) has
  // none of these three, and falls back to the plain cell list further down.
  const worked = check.samples.filter(
    (sample) => sample.expected !== null || sample.actual !== null || sample.difference !== null,
  );

  return (
    <>
      <ul className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle-foreground">
        <li
          title={
            settledByFigures
              ? 'The tool result alone sets this. A model only writes the explanation.'
              : 'A model concludes from the figures, and a second opinion may only make it stricter.'
          }
        >
          {settledByFigures ? 'Settled by arithmetic' : 'Judged by a model'}
        </li>

        {check.exception_count > 0 ? (
          <li className="font-medium text-danger tabular-nums">
            {check.exception_count.toLocaleString()} exception
            {check.exception_count === 1 ? '' : 's'}
          </li>
        ) : null}

        {check.financial_impact ? (
          <li
            className="tabular-nums"
            title="Value carried by the rows that came out as exceptions"
          >
            Value affected {check.financial_impact}
          </li>
        ) : null}

        {worked.length === 0 && check.cells.length > 0 ? (
          <li className="font-mono" title={check.cells.join(', ')}>
            {check.cells.slice(0, CELLS_SHOWN).join(' · ')}
            {check.cells.length > CELLS_SHOWN
              ? ` +${String(check.cells.length - CELLS_SHOWN)} more`
              : ''}
          </li>
        ) : null}
      </ul>

      {worked.length > 0 ? <DiscrepancyRows samples={worked} /> : null}
    </>
  );
}

/**
 * What re-performing the arithmetic gives, against what the workbook states — the
 * worst-first rows a check's conclusion is drawn from.
 *
 * Deliberately not behind a disclosure, same as the rest of this report: these are the
 * rows that explain a fail or a partial, and the one case a reviewer most needs open by
 * default is the one a closed panel would hide.
 */
function DiscrepancyRows({ samples }: { samples: FigureSampleView[] }) {
  const hasRow = samples.some((sample) => sample.row !== null);

  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-border-hairline">
      <table className="w-full min-w-[26rem] border-collapse text-left text-[11px]">
        <caption className="sr-only">Rows behind this check's conclusion</caption>
        <thead>
          <tr className="bg-surface-muted/60 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {hasRow ? <th className="px-2.5 py-1.5 font-semibold">Row</th> : null}
            <th className="px-2.5 py-1.5 font-semibold">Cell</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Expected</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Actual</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Difference</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample, position) => (
            <tr
              // Figures carry no stable id of their own, and the cell reference is not
              // always unique across a check's worst-first samples — two identities can
              // cite the same "against" cell. Position is unique and the ordering itself
              // is part of what is shown, so it is stable across a render of this list.
              key={position}
              className="border-t border-border-hairline align-top"
            >
              {hasRow ? (
                <td className="px-2.5 py-1.5 text-muted-foreground tabular-nums">
                  {sample.row ?? '-'}
                </td>
              ) : null}
              <td className="px-2.5 py-1.5 font-mono text-foreground">{sample.cell ?? '-'}</td>
              <td className="px-2.5 py-1.5 text-right text-foreground tabular-nums">
                {formatAmount(sample.expected)}
              </td>
              <td className="px-2.5 py-1.5 text-right text-foreground tabular-nums">
                {formatAmount(sample.actual)}
              </td>
              <td
                className={cn(
                  'px-2.5 py-1.5 text-right font-medium tabular-nums',
                  sample.difference && sample.difference !== '0' ? 'text-danger' : 'text-success',
                )}
              >
                {formatVariance(sample.difference)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Why the system stopped short of concluding.
 *
 * The engine names these the way a schema does — `incomplete_row_coverage` —
 * and that string was previously printed at the reader in monospace, which is
 * how a reviewer ends up asking an engineer what their own report means. It is
 * respaced here and nothing more: the id stays on hover, because it is what
 * matches the logs, and inventing a friendlier sentence for a reason code
 * whose exact meaning lives in the engine would be putting words in its mouth.
 */
export function ReviewReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-[11px] text-muted-foreground">Waiting because</span>
      {reasons.map((reason) => (
        <span
          key={reason}
          title={`Reported by the review as ${reason}`}
          className="rounded-sm bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
        >
          {termLabel(reason)}
        </span>
      ))}
    </p>
  );
}
