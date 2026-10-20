import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button appearance, as a `cva` config rather than conditional JSX, so the
 * full set of variants is enumerable, type-checked, and reusable by anything
 * that needs to look like a button.
 *
 * This lives outside `Button.tsx` deliberately: a non-component export in a
 * component module breaks React Fast Refresh for that file.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap',
    'text-sm font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-border bg-surface-muted text-foreground hover:bg-surface',
        ghost: 'text-foreground hover:bg-surface-muted',
        danger: 'bg-danger text-danger-foreground hover:bg-danger-hover',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
