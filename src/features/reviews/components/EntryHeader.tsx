/**
 * Which journal entry this is, and where each fact came from.
 *
 * Nothing in this strip is the uploader's word. Both fields that used to be
 * were typed on the upload form and checked against nothing, which in
 * practice meant both were blank on nearly every review; the document number
 * is now the name the workbook arrived under, and the risk rating is the band
 * this review's own score reached.
 *
 * That second one needs saying out loud, which is what the line under the
 * grid is for: the rating is the score restated, not a second reading of it.
 * Two numbers that always agree look like corroboration, and a reader who
 * takes them that way has been misled by the layout rather than by the data.
 */

import { Badge } from '@/components/ui';

import { type ReviewDetail, RISK_LABELS } from '../types';
import { Field, NotStated, Section } from './Section';

/** Where each derived value comes from, for the tooltip on its card. */
const FROM_FILE_NAME = 'Taken from the name the workbook was uploaded under.';
const FROM_SCORE =
  "From the band this review's score reached. The same fact as the compliance band, " +
  'not a second opinion on it.';

/**
 * How loudly each rating is shown.
 *
 * A high rating is a finding and is coloured like one. A low rating is
 * coloured as a conclusion rather than left plain, because it *is* one now —
 * the review scored above the band threshold. An absent rating stays neutral:
 * it means the review has not been scored yet, which is not good news.
 */
const RISK_TONE = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
  none: 'default',
} as const;

/**
 * A value, or the marker that stands in for one nobody supplied.
 *
 * Whitespace counts as absent. A document number of `" "` is not a document
 * number, and rendering it would put a blank into a bold slot — the exact
 * thing that reads as a field which failed to load.
 */
function orNothing(value: string | null, wording?: string) {
  return value?.trim() ? value : <NotStated>{wording}</NotStated>;
}

export function EntryHeader({ review }: { review: ReviewDetail }) {
  const recognised = review.je_type !== 'unknown';

  return (
    <Section
      index={1}
      id="entry"
      title="Journal entry under review"
      aside={
        <span className="font-mono text-xs">
          {review.file_name}
          {review.workbook ? ` · ${review.workbook.workbook_format}` : ''}
        </span>
      }
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Field
          label="Document no."
          value={orNothing(review.document_number)}
          hint={FROM_FILE_NAME}
        />
        <Field label="Process" value={orNothing(review.process, 'Not established')} />
        <Field label="Sub process" value={orNothing(review.sub_process, 'Not established')} />
        <Field
          label="Period"
          value={orNothing(review.period, 'Not established')}
          hint="Read off the posting table by code."
        />
        <Field
          label="Entry type"
          value={recognised ? review.je_type_name || review.je_type : 'Not recognised'}
          hint={recognised ? review.je_type : 'Nothing in the catalogue matched this workbook.'}
          tone={recognised ? 'default' : 'warning'}
        />
        <Field
          label="Risk rating"
          value={
            review.risk_rating ? (
              RISK_LABELS[review.risk_rating]
            ) : (
              // Not "Low". The rating is the banded score, so it is absent
              // on a review nothing has scored yet and on one stored before
              // the rating existed. An all-clear printed over either of those
              // is the one reading this field must never allow.
              <NotStated>Not rated</NotStated>
            )
          }
          hint={FROM_SCORE}
          tone={RISK_TONE[review.risk_rating ?? 'none']}
        />
      </dl>

      {/*
        Said once rather than six times, and said at all because the risk
        rating sitting in its own card implies an independence it does not
        have. It is the compliance score, banded.
      */}
      <p className="mt-2 text-xs leading-relaxed text-subtle-foreground">
        Every value here was established by the review: the document number from the file name, the
        rest from the workbook itself. The risk rating is the band the compliance score reached, so
        it restates that score rather than confirming it.
      </p>

      <Identification review={review} />
    </Section>
  );
}

/**
 * How the type was settled, which is a different claim from what it is.
 *
 * Three tiers run — the layout cache, the shape discriminators, then a second
 * independent reading — and the last of them can only raise the recorded
 * confidence or send the review to a person. It can never move a binding or a
 * number, so a dispute here never means the arithmetic is in doubt.
 */
function Identification({ review }: { review: ReviewDetail }) {
  if (review.je_type === 'unknown') {
    return (
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Nothing in the catalogue matched this workbook&rsquo;s shape, so no entry type&rsquo;s
        checks were applied to it.
      </p>
    );
  }

  const percent = Math.round(review.je_type_confidence * 100);

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs leading-relaxed text-muted-foreground">
      <span>
        Recognised from the workbook&rsquo;s own columns
        {review.je_type_variant ? (
          <>
            {' as '}
            <span className="font-mono text-foreground">{review.je_type_variant}</span>
          </>
        ) : null}
        , at {percent}% confidence.
      </span>

      {review.je_type_corroborated ? (
        <Badge tone="success" size="sm">
          A second, independent reading agreed
        </Badge>
      ) : (
        <Badge tone="warning" size="sm">
          The two readings differed, so a person is looking. The arithmetic is unaffected.
        </Badge>
      )}
    </p>
  );
}
