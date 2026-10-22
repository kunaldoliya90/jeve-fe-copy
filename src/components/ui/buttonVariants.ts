import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button appearance, as a `cva` config rather than conditional JSX, so the
 * full set of variants is enumerable, type-checked, and reusable by anything
 * that needs to look like a button.
 *
 * This lives outside `Button.tsx` deliberately: a non-component export in a
 * component module breaks React Fast Refresh for that file.
 *
 * Every variant transitions and presses through the shared `press` utility
 * rather than its own `transition-colors`, so the whole app responds to a
 * click with the same weight. The press is a `transform`, which the
 * compositor handles without a layout pass.
 */
export const buttonVariants = cva(
  [
    'inline-flex press items-center justify-center gap-2 rounded-md whitespace-nowrap',
    'text-sm font-medium select-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /**
         * The gradient is a two-stop wash of the same hue, not a colour
         * change: it reads as a lit surface rather than as a second brand
         * colour, and it survives the palette swap into dark mode because
         * both stops are derived from one token.
         */
        primary: [
          'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground',
          'shadow-rest inset-shadow-2xs inset-shadow-white/15',
          'hover:from-primary-hover hover:to-primary-active hover:shadow-lift',
        ],
        secondary: [
          'border border-border bg-surface text-foreground shadow-rest',
          'hover:border-border-strong hover:bg-surface-muted',
        ],
        ghost: 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
        danger: [
          'bg-gradient-to-b from-danger to-danger-hover text-danger-foreground',
          'shadow-rest inset-shadow-2xs inset-shadow-white/15',
          'hover:shadow-lift',
        ],
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-12 px-7 text-[15px] tracking-[-0.01em]',
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
