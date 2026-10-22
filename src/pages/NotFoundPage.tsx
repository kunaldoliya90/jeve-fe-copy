import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { paths } from '@/config/paths';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="animate-rise font-mono text-sm tracking-[0.2em] text-subtle-foreground">404</p>
      <h1 className="animate-rise text-2xl font-semibold tracking-tight text-foreground-strong">
        Page not found
      </h1>
      <p className="max-w-sm animate-rise text-sm leading-relaxed text-muted-foreground">
        The page you were looking for does not exist or has moved.
      </p>

      {/* asChild keeps the anchor semantics while borrowing button styling. */}
      <Button asChild className="mt-2 animate-rise">
        <Link to={paths.home.getHref()}>Back to start</Link>
      </Button>
    </div>
  );
}
