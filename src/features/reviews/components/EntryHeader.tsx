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
import { COMPLIANCE_LEGEND, complianceLevel, STATE_LABEL, STATE_TONE } from '../lib/status';
import { isFinished, type ReviewDetail, type ReviewSummary } from '../types';
import { Field, NotStated, Section } from './Section';

/**
 * Where the compliance word comes from, for the tooltip on its card.
 *
 * Worth stating on the card, because the obvious reading of a one-word verdict
 * is the opposite one: the server bands this review "High risk", and the same
 * 30 is Low compliance. The thresholds are named so a reader can check the
 * word against the dial below without scrolling to its legend.
 */
const FROM_SCORE = `From the score this review reached: ${COMPLIANCE_LEGEND}.`;

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
  const level = complianceLevel(review.score);

  return (
    <Section
      index={1}
      id="entry"
      title="Select journal entry"
      aside={
        <span className="font-mono text-xs">
          {review.file_name}
          {review.workbook ? ` · ${review.workbook.workbook_format}` : ''}
        </span>
      }
    >
      {/*
        Auto-fitting tracks rather than a fixed six columns. The strip grew a
        seventh cell — the link to the workbook, which belongs beside the facts
        it describes rather than tucked into the heading row — and a hard
        `lg:grid-cols-6` left it alone on a row of its own. Each track is at
        least 13.75rem, which is the width at which "Payroll — France vacation
        accrual" stops wrapping to three lines.
      */}
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-2">
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
          label="Compliance"
          value={
            // Not "Low". An unscored review has no band at all, and an
            // all-clear — or an alarm — printed over one that was never
            // scored is the one reading this field must never allow.
            level ? level.name : <NotStated>Not scored</NotStated>
          }
          hint={FROM_SCORE}
          tone={level?.tone ?? 'default'}
          emphasis
        />
        <SupportingDocument review={review} />
      </dl>
    </Section>
  );
}

/**
 * The workbook this review was run on, as a cell of the strip.
 *
 * In the grid rather than in the heading row: it is the evidence every other
 * fact here was read out of, and a reviewer asked to check one of them reaches
 * for it immediately. Sized to the tiles beside it so the row keeps one
 * rhythm, and it opens in a new tab — a reviewer who follows it has not
 * finished with the report.
 */
function SupportingDocument({ review }: { review: ReviewDetail }) {
  // Wrapped: a `dl` may hold only `dt`, `dd` and `div`, and this cell is
  // neither a term nor a definition — it is the file the terms were read from.
  return (
    <div className="flex">
      <a
        href={workbookUrl(review.review_id)}
        target="_blank"
        rel="noreferrer"
        title="Open the workbook this review was run on, as it was uploaded"
        className="duration-quick flex flex-1 press items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-center text-sm font-medium text-primary shadow-rest transition-colors ease-out-soft hover:border-primary hover:bg-primary/[0.06] hover:text-primary-active"
      >
        <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0" />
        Open supporting document
      </a>
    </div>
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
