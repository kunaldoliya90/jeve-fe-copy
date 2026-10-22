import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

/**
 * Suspense fallback for a lazily-loaded route.
 *
 * Shaped like a page — a title, a line of description, a panel — rather than
 * a centred spinner. The route chunk usually arrives in well under a second,
 * and a spinner that flashes for 300ms reads as a stutter where a skeleton
 * reads as the page drawing itself.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto w-full max-w-5xl animate-fade px-4 py-10"
    >
      <span className="sr-only">Loading page</span>

      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton shape="text" className="w-full max-w-prose" />
      </div>

      <div className="mt-8 space-y-4 rounded-card border border-border bg-surface p-5 shadow-rest">
        <div className="flex items-center gap-3">
          <Skeleton shape="circle" className="size-9" />
          <Skeleton shape="text" className="w-40" />
        </div>
        <SkeletonText lines={3} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-rest"
          >
            <Skeleton shape="text" className="w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
