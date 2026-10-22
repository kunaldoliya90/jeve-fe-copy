/**
 * What one check looked at, and why it is with a person.
 *
 * Shared, because the same check is reported twice on purpose — once under
 * the parameter it scored, and once in the reviewer's worklist — and two
 * renderings of one check are two chances for them to disagree. A reviewer
 * who sees "3 exceptions" in section 3 and nothing in section 5 has to work
 * out which of the two is wrong before they can do anything else.
 */

import { termLabel } from '../lib/terms';
import type { CheckView } from '../types';

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

  return (
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
        <li className="tabular-nums" title="Value carried by the rows that came out as exceptions">
          Value affected {check.financial_impact}
        </li>
      ) : null}

      {check.cells.length > 0 ? (
        <li className="font-mono" title={check.cells.join(', ')}>
          {check.cells.slice(0, CELLS_SHOWN).join(' · ')}
          {check.cells.length > CELLS_SHOWN
            ? ` +${String(check.cells.length - CELLS_SHOWN)} more`
            : ''}
        </li>
      ) : null}
    </ul>
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
