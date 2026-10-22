import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will actually happen. Say what is lost, not "are you sure".  */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string | undefined;
  /** `danger` for anything that destroys work. */
  tone?: 'danger' | 'primary' | undefined;
  onConfirm: () => void;
  /** Keeps the dialog open with the button spinning while the work runs. */
  isPending?: boolean | undefined;
  /** Shown inside the dialog, so a refusal lands where the user is looking. */
  error?: string | null | undefined;
  /**
   * The element focus should return to on close.
   *
   * Radix restores focus to whatever was focused when the dialog opened, which
   * is right until the thing that opened it is a control inside a list that
   * re-renders underneath — then focus lands on `<body>` and a keyboard user
   * loses their place entirely. Supplying a getter lets the caller name the
   * element at close time rather than relying on a node captured at open time.
   */
  returnFocusTo?: (() => HTMLElement | null) | undefined;
}

/**
 * A modal that asks before something irreversible happens.
 *
 * Built on Radix rather than hand-rolled: the focus trap, the Escape
 * handling, the `aria-modal` wiring, the inert background and the return of
 * focus to the trigger on close are all things a confirmation dialog has to
 * get right and that a `<div>` with a fixed position does not.
 *
 * It stays open while the work runs and shows the failure in place. Closing
 * optimistically and reporting the outcome somewhere else is how a user ends
 * up believing a delete succeeded when the server refused it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  isPending = false,
  error,
  returnFocusTo,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        // A dismissal mid-flight would leave the user with no idea whether the
        // work carried on. The only way out while pending is the outcome.
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-scrim',
            'data-[state=closed]:animate-fade-out data-[state=open]:animate-fade',
            'supports-[backdrop-filter:blur(1px)]:backdrop-blur-sm',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-panel border border-border bg-surface p-5 shadow-float sm:p-6',
            'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop',
          )}
          onCloseAutoFocus={(event) => {
            const target = returnFocusTo?.();
            if (!target) return;
            // Radix's own restoration is pre-empted rather than raced with.
            event.preventDefault();
            target.focus();
          }}
        >
          <div className="flex gap-4">
            {tone === 'danger' ? (
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-danger/10"
              >
                <AlertTriangle className="size-5 text-danger" />
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground-strong">
                {title}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description asChild>
                <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </div>
              </DialogPrimitive.Description>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-card border border-danger/40 bg-danger/[0.07] px-3 py-2.5 text-sm text-foreground"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" disabled={isPending}>
                {cancelLabel}
              </Button>
            </DialogPrimitive.Close>

            <Button variant={tone} isLoading={isPending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
