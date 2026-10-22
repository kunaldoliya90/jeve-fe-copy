import { cn } from '@/utils/cn';

const toneClass = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const;

export interface ProgressBarProps {
  /** 0–100. Clamped, so a server that reports 104 does not overflow the track. */
  value: number;
  tone?: keyof typeof toneClass | undefined;
  /** Adds a travelling highlight. For work still in flight only. */
  active?: boolean | undefined;
  /** Accessible name. Required: a bar with no label announces as "0 percent". */
  label: string;
  className?: string | undefined;
}

/**
 * The one progress bar.
 *
 * Width is transitioned rather than animated frame by frame, so a jump from
 * 40% to 78% glides on the compositor instead of re-laying out the page
 * sixty times. The sheen is a separate absolutely-positioned element moving
 * on `transform` for the same reason.
 */
export function ProgressBar({
  value,
  tone = 'primary',
  active = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'relative h-1.5 overflow-hidden rounded-pill bg-surface-muted',
        'inset-shadow-2xs',
        className,
      )}
    >
      <div
        className={cn(
          'relative h-full rounded-pill transition-[width] duration-700 ease-out-soft',
          toneClass[tone],
        )}
        style={{ width: `${String(clamped)}%` }}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/45 to-transparent"
          />
        ) : null}
      </div>
    </div>
  );
}
