import { useId } from 'react';

import { Label } from '@/components/ui/Label';
import { cn } from '@/utils/cn';

export interface FormFieldProps {
  label: string;
  /** Validation message. Its presence is what marks the field invalid. */
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  /**
   * Receives the ids to wire onto the control. Passing them down (rather than
   * cloning children) keeps the association explicit and avoids guessing at
   * the child's prop names.
   */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => React.ReactNode;
}

/**
 * Pairs a label, control, hint and error with the ARIA wiring that makes a
 * form usable with a screen reader — the part most hand-rolled forms miss.
 */
export function FormField({
  label,
  error,
  hint,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}

      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {/* role="alert" so the message is announced the moment it appears. */}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
