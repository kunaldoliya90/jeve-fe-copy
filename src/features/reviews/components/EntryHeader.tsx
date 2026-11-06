/**
 * Which journal entry this is, and where each fact came from.
 *
 * Nothing in this strip is the uploader's word. Both fields that used to be
 * were typed on the upload form and checked against nothing, which in
 * practice meant both were blank on nearly every review; the document number
 * is now the name the workbook arrived under, and the risk rating is the band
 * this review's own score reached.
 */

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Badge } from '@/components/ui';
import { paths } from '@/config/paths';

import { workbookUrl } from '../api/reviews.api';
import { useReviewList } from '../api/reviews.queries';
import { STATE_LABEL, STATE_TONE } from '../lib/status';
import { isFinished, type ReviewDetail, type ReviewSummary, RISK_LABELS } from '../types';
import { Field, NotStated, Section } from './Section';

/** Where each derived value comes from, for the tooltip on its card. */
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-xs">
            {review.file_name}
            {review.workbook ? ` · ${review.workbook.workbook_format}` : ''}
          </span>
          <a
            href={workbookUrl(review.review_id)}
            target="_blank"
            rel="noreferrer"
            title="Open the workbook this review was run on, as it was uploaded"
            className="duration-quick inline-flex press items-center gap-1.5 text-xs font-medium text-primary transition-colors ease-out-soft hover:text-primary-active"
          >
            <FileSpreadsheet aria-hidden="true" className="size-3.5" />
            Open supporting document
          </a>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <DocumentSelector review={review} />
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
    </Section>
  );
}

/** A row's document number, or the file name when nothing was established yet. */
function documentLabel(row: Pick<ReviewSummary, 'document_number' | 'file_name'>): string {
  return row.document_number?.trim() ? row.document_number : row.file_name;
}

/**
 * The document number, as a switch to any other finished review rather than
 * plain text.
 *
 * A reviewer comparing entries used to have to leave this page for the list and
 * find the other one by file name; this puts that choice where they are already
 * looking. Still-running reviews are left off the list: there is nothing on
 * them yet worth switching to.
 *
 * Built on Radix rather than a native `<select>`: a browser's own option list
 * cannot show a second line or a status badge per row, and with two uploads of
 * the same workbook sharing a document number, the file name underneath is
 * what tells them apart.
 */
function DocumentSelector({ review }: { review: ReviewDetail }) {
  const navigate = useNavigate();
  const { data } = useReviewList();

  const options = (data ?? []).filter(
    (row) => row.review_id === review.review_id || isFinished(row.status),
  );
  if (!options.some((row) => row.review_id === review.review_id)) {
    options.unshift({
      review_id: review.review_id,
      file_name: review.file_name,
      document_number: review.document_number,
      je_type: review.je_type,
      status: review.status,
      score: review.score,
      band: review.band,
      provisional: review.provisional,
      created_at: review.created_at,
    });
  }

  return (
    <SelectPrimitive.Root
      value={review.review_id}
      onValueChange={(nextId) => {
        if (nextId !== review.review_id) {
          void navigate(paths.app.reviewDetail.getHref(nextId));
        }
      }}
    >
      <div className="duration-quick flex flex-col rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-rest transition-[border-color,box-shadow] ease-glide has-[:focus-visible]:border-primary has-[:focus-visible]:shadow-glow has-[[data-state=open]]:border-primary has-[[data-state=open]]:shadow-glow">
        <dt
          id="document-selector-label"
          className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
        >
          Document no.
        </dt>
        <dd className="mt-1">
          <SelectPrimitive.Trigger
            id="document-selector-trigger"
            aria-labelledby="document-selector-label document-selector-trigger"
            className="group -mx-0.5 flex w-[calc(100%+0.25rem)] cursor-pointer items-center justify-between gap-1.5 rounded px-0.5 text-left text-sm leading-snug font-semibold text-pretty text-foreground outline-none"
          >
            <SelectPrimitive.Value className="truncate">
              {documentLabel(review)}
            </SelectPrimitive.Value>
            <SelectPrimitive.Icon asChild>
              <ChevronDown
                aria-hidden="true"
                className="duration-quick size-3.5 shrink-0 text-muted-foreground transition-transform ease-out-soft group-data-[state=open]:rotate-180"
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
        </dd>
      </div>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="start"
          sideOffset={8}
          className="z-50 max-w-[26rem] min-w-[20rem] overflow-hidden rounded-card border border-border bg-surface shadow-float data-[state=closed]:animate-pop-out data-[state=open]:animate-pop"
        >
          <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-muted-foreground">
            <ChevronUp aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="max-h-[22rem] p-1.5">
            {options.map((row) => (
              <SelectPrimitive.Item
                key={row.review_id}
                value={row.review_id}
                className="relative flex cursor-pointer scroll-my-1.5 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-surface-muted data-[state=checked]:bg-primary-subtle"
              >
                <div className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText>
                    <span className="block truncate font-semibold text-foreground">
                      {documentLabel(row)}
                    </span>
                  </SelectPrimitive.ItemText>
                  {row.document_number?.trim() && row.document_number !== row.file_name ? (
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                      {row.file_name}
                    </span>
                  ) : null}
                </div>

                <Badge tone={STATE_TONE[row.status]} size="sm" className="shrink-0">
                  {STATE_LABEL[row.status]}
                </Badge>

                <SelectPrimitive.ItemIndicator className="flex shrink-0 items-center text-primary">
                  <Check aria-hidden="true" className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-muted-foreground">
            <ChevronDown aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
