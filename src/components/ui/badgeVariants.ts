import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Status pill appearance.
 *
 * `tone` carries the meaning and `variant` carries the emphasis, as two axes
 * rather than one list of a dozen names: the same "failed" tone is needed
 * loud on a card header and quiet inside a dense table row, and splitting
 * them is what stops a second palette growing for the quiet case.
 *
 * Lives outside `Badge.tsx` deliberately: a non-component export in a
 * component module breaks React Fast Refresh for that file.
 */
export const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-pill whitespace-nowrap',
    'text-xs font-medium',
    '[&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        neutral: '',
        primary: '',
        success: '',
        warning: '',
        danger: '',
        accent: '',
      },
      variant: {
        soft: '',
        solid: '',
        outline: 'bg-transparent',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[11px]',
        md: 'px-2.5 py-1',
      },
    },
    compoundVariants: [
      // --- soft: a tinted wash. The default, and the only one dense enough
      // to use repeatedly down a table without the page turning into stripes.
      { tone: 'neutral', variant: 'soft', class: 'bg-surface-muted text-muted-foreground' },
      { tone: 'primary', variant: 'soft', class: 'bg-primary/10 text-primary' },
      { tone: 'success', variant: 'soft', class: 'bg-success/12 text-success' },
      { tone: 'warning', variant: 'soft', class: 'bg-warning/15 text-foreground' },
      { tone: 'danger', variant: 'soft', class: 'bg-danger/12 text-danger' },
      { tone: 'accent', variant: 'soft', class: 'bg-accent/15 text-accent-strong' },

      // --- solid: one per screen at most.
      { tone: 'neutral', variant: 'solid', class: 'bg-foreground/85 text-surface' },
      { tone: 'primary', variant: 'solid', class: 'bg-primary text-primary-foreground' },
      { tone: 'success', variant: 'solid', class: 'bg-success text-primary-foreground' },
      { tone: 'warning', variant: 'solid', class: 'bg-warning text-accent-foreground' },
      { tone: 'danger', variant: 'solid', class: 'bg-danger text-danger-foreground' },
      { tone: 'accent', variant: 'solid', class: 'bg-accent text-accent-foreground' },

      // --- outline: for a badge that must not read as filled chrome.
      { tone: 'neutral', variant: 'outline', class: 'border border-border text-muted-foreground' },
      { tone: 'primary', variant: 'outline', class: 'border border-primary/40 text-primary' },
      { tone: 'success', variant: 'outline', class: 'border border-success/40 text-success' },
      { tone: 'warning', variant: 'outline', class: 'border border-warning/50 text-foreground' },
      { tone: 'danger', variant: 'outline', class: 'border border-danger/40 text-danger' },
      { tone: 'accent', variant: 'outline', class: 'border border-accent/50 text-accent-strong' },
    ],
    defaultVariants: {
      tone: 'neutral',
      variant: 'soft',
      size: 'md',
    },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
