import { Slot, Slottable } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';

import { type ButtonVariantProps, buttonVariants } from '@/components/ui/buttonVariants';
import { cn } from '@/utils/cn';

export interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  /**
   * Render as the child element instead of a `<button>`, keeping the styling.
   * Use it for links that look like buttons, so the semantics stay correct:
   * `<Button asChild><Link to="/x">Go</Link></Button>`.
   */
  asChild?: boolean | undefined;
  /** Shows a spinner and blocks interaction. */
  isLoading?: boolean | undefined;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled === true || isLoading}
      // Tells assistive tech the control is working, not broken.
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {/*
        `Slottable` marks which child Slot should merge its props into. Without
        it, `asChild` throws as soon as a second child (the spinner) exists —
        Slot requires exactly one element child.
      */}
      <Slottable>{children}</Slottable>
    </Component>
  );
}
