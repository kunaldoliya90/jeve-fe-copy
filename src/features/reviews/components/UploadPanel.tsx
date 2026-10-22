/**
 * The upload surface: pick a workbook, check it is the right one, start a review.
 *
 * Accepts a drop as well as a click, because the file being reviewed is
 * usually already open in a folder next to the browser. Client-side checks
 * here are a courtesy only — the server decides, by reading the file's
 * content rather than trusting its name, and its refusal is what is shown.
 *
 * Choosing a file **stages** it rather than starting the review. The review
 * costs real money and takes a minute, and the one thing a reviewer cannot
 * undo is starting it on the wrong workbook, so the file name is put in front
 * of them with a button to change it before anything is sent.
 *
 * Nothing is asked of the reviewer beyond the file. The document number and
 * the risk rating used to be typed here; both are now the review's own — the
 * number comes off the file name, the rating off the score — so there is
 * nothing left to type and no form to get wrong.
 */

import { AlertTriangle, FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';

import { ReviewUploadError } from '../api/reviews.api';
import { useUploadWorkbook } from '../api/reviews.queries';
import { formatBytes } from '../lib/narrative';

const ACCEPT = '.xlsx,.xlsm,.xlsb';
const JE_TYPE = 'vacation-accrual-france';

interface UploadPanelProps {
  onAccepted: (reviewId: string) => void;
}

export function UploadPanel({ onAccepted }: UploadPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadWorkbook();

  const stage = useCallback((file: File) => {
    setProblem(null);
    setStaged(file);
  }, []);

  const clear = useCallback(() => {
    setStaged(null);
    setProblem(null);
    // Without this, choosing the same file again fires no `change` event and
    // the picker appears to do nothing.
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const submit = useCallback(() => {
    if (!staged) return;

    upload.mutate(
      { file: staged, jeType: JE_TYPE },
      {
        onSuccess: (accepted) => {
          onAccepted(accepted.review_id);
        },
        onError: (error) => {
          // The file stays staged. A refusal the reviewer can act on — wrong
          // format, service down — is not a reason to make them find it again.
          setProblem(
            error instanceof ReviewUploadError
              ? error.message
              : 'The upload could not be sent. Check that the service is running.',
          );
        },
      },
    );
  }, [onAccepted, staged, upload]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      if (upload.isPending) return;
      const file = event.dataTransfer.files[0];
      if (file) stage(file);
    },
    [stage, upload.isPending],
  );

  const dragProps = {
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!upload.isPending) setDragging(true);
    },
    onDragLeave: () => {
      setDragging(false);
    },
    onDrop,
  };

  return (
    <section aria-labelledby="upload-heading" className="space-y-4">
      <h2 id="upload-heading" className="sr-only">
        Upload a journal entry workbook
      </h2>

      {/* Driven by the buttons below. It still carries a name, because a
          screen reader reaching it by other means must not meet "file, edit". */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        id="workbook-input"
        aria-label="Journal entry workbook"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) stage(file);
        }}
      />

      {staged ? (
        <StagedWorkbook
          file={staged}
          busy={upload.isPending}
          dragging={dragging}
          dragProps={dragProps}
          onReplace={() => {
            inputRef.current?.click();
          }}
          onClear={clear}
          onSubmit={submit}
        />
      ) : (
        <DropTarget
          dragging={dragging}
          dragProps={dragProps}
          onChoose={() => {
            inputRef.current?.click();
          }}
        />
      )}

      {problem ? (
        <p
          role="alert"
          className="flex animate-rise-sm items-start gap-2.5 rounded-card border border-danger/40 bg-danger/[0.07] px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{problem}</span>
        </p>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

interface DragProps {
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
}

/**
 * Step one: the empty state.
 *
 * A 2px dashed border that brightens and a background that tints on
 * drag-over — nothing moves, because a target that grows under the cursor is
 * a target the pointer can leave by accident.
 */
function DropTarget({
  dragging,
  dragProps,
  onChoose,
}: {
  dragging: boolean;
  dragProps: DragProps;
  onChoose: () => void;
}) {
  return (
    <div
      {...dragProps}
      className={cn(
        'relative rounded-panel border-2 border-dashed p-8 text-center sm:p-12',
        'transition-[border-color,background-color,box-shadow] duration-[280ms] ease-glide',
        dragging
          ? 'border-primary bg-primary/[0.07] shadow-glow'
          : 'border-border-strong bg-surface shadow-rest hover:border-primary/50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mx-auto flex size-14 items-center justify-center rounded-pill',
          'transition-[background-color,transform] duration-[280ms] ease-spring',
          dragging
            ? 'scale-110 bg-primary/15 text-primary'
            : 'bg-surface-muted text-muted-foreground',
        )}
      >
        <UploadCloud className="size-6" />
      </span>

      <p className="mt-4 text-base font-medium text-foreground">
        {dragging ? 'Let go to choose this workbook' : 'Drop a journal entry workbook here'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">.xlsx, .xlsm or .xlsb (up to 25 MB)</p>

      <Button type="button" size="lg" className="mt-6" onClick={onChoose}>
        Choose a workbook
      </Button>

      <p className="mt-4 text-xs text-subtle-foreground">
        Nothing is sent yet. You will see which file you picked before the review starts.
      </p>
    </div>
  );
}

/**
 * Step two: what is about to be reviewed.
 *
 * A form rather than a div with a button, so Enter starts the review the way
 * every other form on the intranet does.
 */
function StagedWorkbook({
  file,
  busy,
  dragging,
  dragProps,
  onReplace,
  onClear,
  onSubmit,
}: {
  file: File;
  busy: boolean;
  dragging: boolean;
  dragProps: DragProps;
  onReplace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      {...dragProps}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cn(
        'animate-rise-sm rounded-panel border bg-surface p-5 shadow-rest sm:p-6',
        'transition-[border-color,box-shadow] duration-[280ms] ease-glide',
        dragging ? 'border-primary shadow-glow' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-card bg-success/10 text-success"
        >
          <FileSpreadsheet className="size-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground" title={file.name}>
            {file.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            {formatBytes(file.size)} · ready to review
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onReplace}>
            Change
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={busy}
            onClick={onClear}
            aria-label="Remove this workbook"
            title="Remove this workbook"
          >
            <X aria-hidden="true" />
          </Button>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-hairline pt-5">
        <Button type="submit" size="lg" isLoading={busy}>
          {busy ? 'Starting the review…' : 'Start review'}
        </Button>
        <p className="text-xs text-subtle-foreground">
          {busy
            ? 'Sending the workbook. This page will follow the review as it runs.'
            : 'The workbook is sent when you start the review, and not before.'}
        </p>
      </div>
    </form>
  );
}
