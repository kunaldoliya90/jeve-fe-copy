/**
 * The only list on the report that is pure action.
 *
 * Everything else here reports: what was found, what was not established, what
 * did not run. This says what to go and do, and it is the part a reviewer
 * actually takes away from the page — into a ticket, a mail, or a conversation
 * with whoever owns the workbook.
 *
 * So two decisions follow from that:
 *
 *  - It is the one panel carried in the brand colour. The trailing panels on
 *    this report use a dashed edge, which on this page means absence —
 *    nothing established, nothing run, nothing scored. This is the opposite
 *    statement, and it should not look like its neighbours.
 *  - It copies. A list of instructions that has to be re-typed to be acted on
 *    is a list that gets acted on from memory.
 *
 * The steps are the review's own words, through the same respacing every other
 * piece of engine prose on this page gets. They are numbered, and left in the
 * order the review wrote them: these are often sequential — obtain the file,
 * then re-run — and sorting them would break an instruction in half.
 *
 * There are deliberately no tick boxes. A tick that is not in the record is
 * not evidence anybody did anything, and a control that looks like it is
 * keeping score while keeping none is worse on an audit report than no control
 * at all.
 */

import { Card } from '@/components/ui';

import type { ReviewDetail } from '../types';
import { CopyButton } from './CopyButton';
import { Prose } from './Prose';

export function NextSteps({ review }: { review: ReviewDetail }) {
  const steps = review.next_steps;
  if (steps.length === 0) return null;

  // Numbered on the clipboard too, and headed by the file it belongs to: this
  // is pasted somewhere that has no idea which review it came from.
  const forClipboard = [
    `What to do next: ${review.file_name || review.review_id}`,
    ...steps.map((step, index) => `${String(index + 1)}. ${step}`),
  ].join('\n');

  return (
    <section
      id="next-steps"
      aria-labelledby="next-steps-heading"
      className="scroll-mt-24 defer-paint"
    >
      <Card tone="feature" elevation="lift" className="hairline-top overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 bg-primary/[0.045] p-4 sm:p-5 sm:pb-4">
          <div className="min-w-0">
            <h2 id="next-steps-heading" className="text-sm font-semibold text-foreground">
              What to do next
            </h2>
            {/* Ahead of the list, not under it. A reader who meets the
                qualification after the instructions has already decided how
                much authority the instructions carry. */}
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
              Specific things to obtain or confirm, drawn from what the checks actually found.{' '}
              {steps.length === 1 ? 'It is' : 'They are'} not a decision. The judgement stays with
              the reviewer.
            </p>
          </div>

          <div className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{steps.length}</span>{' '}
              {steps.length === 1 ? 'step' : 'steps'}
            </span>
            <CopyButton text={forClipboard} className="-mr-2 text-[11px]" />
          </div>
        </header>

        <ol className="divide-y divide-border-hairline border-t border-border-hairline">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex stagger items-baseline gap-3 px-4 py-3 sm:px-5"
              style={{ '--i': index } as React.CSSProperties}
            >
              <span
                aria-hidden
                className="flex size-5 flex-none translate-y-0.5 items-center justify-center rounded-pill bg-primary/10 font-mono text-[11px] font-semibold text-primary"
              >
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-foreground">
                <Prose text={step} />
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
