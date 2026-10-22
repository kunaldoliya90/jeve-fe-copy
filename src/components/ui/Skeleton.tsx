import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export interface SkeletonProps extends ComponentProps<'div'> {
  /** `text` matches a line of body copy; `block` fills whatever it is given. */
  shape?: 'text' | 'block' | 'circle' | undefined;
}

/**
 * A placeholder shaped like the thing that is coming.
 *
 * Deliberately not a spinner. A spinner says "wait"; a skeleton says "here is
 * the shape of what you will read", which is why a skeletoned screen measures
 * as faster than a spinnered one that takes exactly as long.
 *
 * `aria-hidden` throughout: the live region announcing "loading" belongs on
 * the container once, not on each of eleven grey rectangles.
 */
export function Skeleton({ className, shape = 'block', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'skeleton',
        shape === 'text' && 'h-3.5 rounded-sm',
        shape === 'block' && 'rounded-md',
        shape === 'circle' && 'aspect-square rounded-full',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A paragraph's worth of skeleton lines, the last one short.
 *
 * The short last line is the whole trick — equal-length bars read as a
 * loading graphic, ragged ones read as text that has not arrived yet.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          shape="text"
          style={{ width: index === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  );
}
