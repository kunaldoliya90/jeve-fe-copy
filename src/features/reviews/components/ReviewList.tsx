/** Recent reviews, newest first. Includes ones still running. */

import { AlertTriangle, ChevronRight, Inbox, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge, Card, Skeleton } from '@/components/ui';
import { paths } from '@/config/paths';
import { formatDate } from '@/utils/format';

import { deleteErrorMessage } from '../api/reviews.api';
import { useDeleteReview, useReviewList } from '../api/reviews.queries';
import type { BadgeTone } from '../lib/status';
import { STATE_LABEL, STATE_TONE } from '../lib/status';
import { isFinished, type ReviewSummary } from '../types';

export function ReviewList() {
  const { data, isPending, isError } = useReviewList();
  const remove = useDeleteReview();

  // The row awaiting confirmation. Held as the whole summary rather than an
  // id so the dialog can name the file, which is what the reader recognises.
  const [confirming, setConfirming] = useState<ReviewSummary | null>(null);

  // The button that opened the dialog, so focus can go back to it on cancel.
  // Cleared on a successful delete: that button no longer exists, and focusing
  // a detached node is how focus ends up on `<body>`.
  const trigger = useRef<HTMLButtonElement | null>(null);

  if (isPending) {
    return (
      <Card as="ul" elevation="rest" className="divide-y divide-border overflow-hidden" aria-busy>
        <span className="sr-only">Loading recent reviews</span>
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton shape="text" className="w-48" />
              <Skeleton shape="text" className="w-28" />
            </div>
            <Skeleton className="h-6 w-20 rounded-pill" />
          </li>
        ))}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card tone="danger" className="flex items-start gap-2.5 p-4 text-sm">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
        <span className="text-foreground">
          The review service could not be reached, so earlier reviews cannot be listed. Nothing has
          been lost; they are stored on the server.
        </span>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card
        tone="sunken"
        elevation="flat"
        className="flex flex-col items-center gap-2 border-dashed p-10 text-center"
      >
        <Inbox aria-hidden="true" className="size-7 text-subtle-foreground" />
        <p className="text-sm font-medium text-foreground">No reviews yet</p>
        <p className="text-sm text-muted-foreground">
          Upload a workbook above and this is where it will appear.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card as="ul" elevation="rest" className="divide-y divide-border overflow-hidden">
        {data.map((row, index) => (
          <Row
            key={row.review_id}
            row={row}
            index={index}
            onDelete={(button) => {
              remove.reset();
              trigger.current = button;
              setConfirming(row);
            }}
          />
        ))}
      </Card>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Delete this review?"
        description={
          <>
            <p>
              <span className="font-medium text-foreground">{confirming?.file_name}</span> and
              everything it found will be removed: the score, the parameters it was tested on, the
              evidence register and the cost breakdown. This cannot be undone.
            </p>
            <p>
              The workbook itself is untouched. Uploading it again will run a fresh review rather
              than return this one.
            </p>
          </>
        }
        confirmLabel="Delete review"
        returnFocusTo={() => trigger.current}
        isPending={remove.isPending}
        error={remove.isError ? deleteErrorMessage(remove.error) : null}
        onConfirm={() => {
          if (!confirming) return;
          remove.mutate(confirming.review_id, {
            // Closed on success only. A refusal keeps the dialog open with the
            // reason in it, where the user is already looking.
            onSuccess: () => {
              // The row is gone, so there is nothing to hand focus back to.
              trigger.current = null;
              setConfirming(null);
            },
          });
        }}
      />
    </>
  );
}

function Row({
  row,
  index,
  onDelete,
}: {
  row: ReviewSummary;
  index: number;
  onDelete: (button: HTMLButtonElement) => void;
}) {
  const running = !isFinished(row.status);
  const tone: BadgeTone = STATE_TONE[row.status];

  return (
    <li
      className="group relative flex stagger items-center gap-3 px-4 py-3.5 transition-colors duration-[160ms] ease-glide hover:bg-surface-muted"
      style={{ '--i': index } as React.CSSProperties}
    >
      {/*
        A stretched link: the anchor covers the whole row through its own
        `::after`, so the entire row is one hit target, while the delete
        button stays a real sibling button. Nesting a button inside an anchor
        would be invalid HTML and would leave the row un-clickable for a
        keyboard user in some browsers.
      */}
      <Link
        to={paths.app.reviewDetail.getHref(row.review_id)}
        className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
      >
        <span className="block truncate text-sm font-medium text-foreground">{row.file_name}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatDate(row.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
          {row.je_type && row.je_type !== 'unknown' ? ` · ${row.je_type}` : ''}
        </span>
      </Link>

      {row.score !== null ? (
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold text-foreground tabular-nums">
            {row.score}
          </span>
          {row.provisional ? (
            <span
              className="block text-[10px] text-muted-foreground"
              title="A check is still waiting for a person, so the score may yet change"
            >
              provisional
            </span>
          ) : null}
        </span>
      ) : null}

      <Badge tone={tone} live={running} className="shrink-0">
        {STATE_LABEL[row.status]}
      </Badge>

      {/*
        Above the stretched link, and only shown on hover or focus so a list of
        reviews does not read as a row of delete buttons. It stays reachable by
        keyboard because `focus-visible` brings it back.
      */}
      <button
        type="button"
        onClick={(event) => {
          onDelete(event.currentTarget);
        }}
        disabled={running}
        aria-label={`Delete the review of ${row.file_name}`}
        title={
          running
            ? 'A running review can be deleted once it finishes'
            : `Delete the review of ${row.file_name}`
        }
        className="relative z-10 flex size-8 shrink-0 press items-center justify-center rounded-pill text-subtle-foreground opacity-0 transition-opacity duration-[160ms] group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-subtle-foreground transition-transform duration-[160ms] ease-glide group-hover:translate-x-0.5 group-hover:text-muted-foreground"
      />
    </li>
  );
}
