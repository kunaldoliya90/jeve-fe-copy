/**
 * Chrome for the review area.
 *
 * Deliberately separate from `AppLayout`: that one carries authenticated
 * chrome — a user name and a sign-out button — and the review service has no
 * auth endpoints yet. Borrowing it would put a sign-out control on screen
 * that cannot work.
 *
 * The header is translucent and blurred rather than opaque so the report
 * appears to slide under it, and it is the only fixed chrome on the page: an
 * audit report is read top to bottom and every row of permanent furniture is
 * a row of findings somebody has to scroll for.
 */

import { NavLink, Outlet } from 'react-router';

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { env } from '@/config/env';
import { paths } from '@/config/paths';
import { cn } from '@/utils/cn';

const LINKS = [
  { to: paths.app.reviews.getHref(), label: 'Reviews', end: true },
  { to: paths.app.reviewPlan.getHref(), label: 'What is checked', end: false },
] as const;

export function ReviewLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/*
        A very faint, very slow wash behind everything. Fixed and
        pointer-events-none so it never intercepts a click, and animating
        `transform` only so it costs the compositor and not the main thread.
      */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 size-[46rem] -translate-x-1/2 animate-drift rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 size-[32rem] animate-drift rounded-full bg-accent/[0.05] blur-3xl" />
      </div>

      <a
        href="#main-content"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 glass">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:h-16 sm:gap-4">
          <NavLink to={paths.app.reviews.getHref()} className="group flex items-center gap-2.5">
            <Mark />
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-foreground-strong">
                {env.VITE_APP_NAME}
              </span>
              {/*
                The strapline is the first thing to go on a narrow screen. At
                390px the brand, both nav links and the theme control do not
                fit on one row, and a sticky header that wraps to two rows
                costs a line of findings on every page.
              */}
              <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                Journal entry review
              </span>
            </span>
          </NavLink>

          <nav aria-label="Review" className="ml-auto flex items-center gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'relative press rounded-pill px-2.5 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm',
                    isActive
                      ? 'bg-surface font-medium text-foreground shadow-rest'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Below `sm` this moves to the footer — see below. A preference
              control has no claim on a phone's sticky header. */}
          <ThemeToggle className="ml-1 hidden sm:inline-flex" />
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-10 border-t border-border/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-prose text-xs leading-relaxed text-subtle-foreground">
            Every figure comes from Python, exact to the cent. Anything that cannot be proven goes
            to a person rather than being passed.
          </p>
          <ThemeToggle className="self-start sm:hidden" />
        </div>
      </footer>
    </div>
  );
}

/**
 * The mark. Three bars — read, check, conclude — rising left to right.
 *
 * Inline SVG rather than an image file: it is nine elements, it inherits
 * `currentColor` so it needs no second version for dark mode, and it costs no
 * request on first paint.
 */
function Mark() {
  return (
    <span
      aria-hidden
      className="flex size-9 items-center justify-center rounded-[0.625rem] bg-gradient-to-br from-primary to-primary-active shadow-rest inset-shadow-2xs inset-shadow-white/20 transition-transform duration-[280ms] ease-spring group-hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="size-[18px] text-primary-foreground" fill="none">
        <path
          d="M5 15.5v3M12 10v8.5M19 5.5v13"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
