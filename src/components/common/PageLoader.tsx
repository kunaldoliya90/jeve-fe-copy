import { Spinner } from '@/components/ui/Spinner';

/** Suspense fallback for a lazily-loaded route. */
export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}
