/**
 * Engine-written text, rendered for a person.
 *
 * One component rather than one per screen, because the same schema names and
 * the same citation markers turn up in the executive summary, in an area's
 * reason and in a check's conclusion — and a reader who meets
 * `typed_over_formula` respaced on one card and raw on the next will reasonably
 * conclude that the two mean different things.
 *
 * What it does to the text is set out in `lib/summary.ts`, and amounts to
 * spacing and punctuation. Nothing here rewords a finding.
 */

import { parseInline, type SummarySegment } from '../lib/summary';

/**
 * Shared so the default never changes identity between renders — an inline
 * `= []` would be a new array each time and defeat every memo downstream.
 */
const NONE: readonly string[] = [];

export interface ProseProps {
  text: string;
  /**
   * Figures the report could not trace to any evidence or score, marked where
   * they are read.
   *
   * Only the written summary has these. A figure in a check's conclusion came
   * from the check that produced it, so passing them here would mark a number
   * that traces perfectly well.
   */
  untraced?: readonly string[] | undefined;
}

export function Prose({ text, untraced = NONE }: ProseProps) {
  const { segments, cites } = parseInline(text, untraced);

  return (
    <>
      <Segments segments={segments} />
      {cites.map((reference) => (
        <Cite key={reference} reference={reference} />
      ))}
    </>
  );
}

export function Segments({ segments }: { segments: SummarySegment[] }) {
  return segments.map((segment, at) => <Segment key={at} segment={segment} />);
}

function Segment({ segment }: { segment: SummarySegment }) {
  if (segment.kind === 'text') return <>{segment.text}</>;

  if (segment.kind === 'figure') return <Untraced text={segment.text} />;

  return (
    <>
      <span
        // The id is what matches the workbook, the register and the defect
        // table, so it stays one hover away rather than being replaced.
        title={`Written in the report as ${segment.raw}`}
        className="font-medium text-foreground underline decoration-border-strong decoration-dotted underline-offset-[3px]"
      >
        {segment.text}
      </span>
      {segment.count === null ? null : (
        <>
          {': '}
          {segment.countUntraced ? (
            <Untraced text={segment.count} />
          ) : (
            <span className="font-semibold text-foreground tabular-nums">{segment.count}</span>
          )}
        </>
      )}
    </>
  );
}

/**
 * A figure in the summary that traces to no evidence and no score.
 *
 * Marked where it is read, not only in the panel below. By the time a reviewer
 * has reached that panel they have already read the sentence and taken the
 * number in, and a figure that must not be quoted has to say so at the moment
 * it is quoted. Said in words as well as in colour, because this is the one
 * warning on the page a reader must not miss.
 */
function Untraced({ text }: { text: string }) {
  return (
    <span
      title="This figure traces to no evidence and no score. Do not quote it."
      className="rounded-sm bg-danger/10 px-1 font-semibold text-danger tabular-nums"
    >
      {text}
      <span className="sr-only"> (traces to nothing, do not quote)</span>
    </span>
  );
}

/** A reference the text cited inline, moved to the end of its own line. */
export function Cite({ reference }: { reference: string }) {
  return (
    <span
      title="Cited at this point in the report as written"
      className="ml-1.5 inline-block rounded-sm border border-border px-1 align-[0.08em] font-mono text-[10px] text-subtle-foreground"
    >
      {reference}
    </span>
  );
}
