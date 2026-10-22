# JEVE — Frontend

React + TypeScript single-page application built with Vite.

## Stack

| Concern         | Choice                                   |
| --------------- | ---------------------------------------- |
| Build           | Vite 8 (Rolldown)                        |
| UI              | React 19                                 |
| Language        | TypeScript 5.9, `strict` + extra checks  |
| Routing         | React Router 8 (data router)             |
| Server state    | TanStack Query 5                         |
| Client state    | Zustand 5                                |
| Forms           | React Hook Form + Zod                    |
| Styling         | Tailwind CSS 4 (CSS-first tokens)        |
| Primitives      | Radix UI + CVA                           |
| Unit / component| Vitest + Testing Library + MSW           |
| End-to-end      | Playwright                               |
| Quality gates   | ESLint 9 (type-aware), Prettier, Husky   |

## Getting started

Requires Node `>=20.19` (see `.nvmrc` — CI uses 24).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

No backend yet? Set `VITE_ENABLE_API_MOCKING="true"` in `.env.local` and the
app runs against the MSW handlers in `src/testing/mocks/handlers.ts`.

## Scripts

| Script                  | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Dev server on port 3000, with HMR                              |
| `npm run build`         | Typecheck, then production build to `dist/`                    |
| `npm run preview`        | Serve the built output locally                                  |
| `npm run typecheck`     | `tsc -b` across app, test and node projects                    |
| `npm run lint`          | ESLint, zero warnings tolerated                                |
| `npm run lint:fix`      | ESLint with `--fix`                                            |
| `npm run format`        | Prettier write                                                 |
| `npm run test`          | Unit + component tests, once                                   |
| `npm run test:watch`    | Tests in watch mode                                            |
| `npm run test:coverage` | Tests with a coverage report and thresholds                    |
| `npm run e2e`           | Playwright, against a real build with mocking on               |
| `npm run e2e:ui`        | Playwright in UI mode                                          |
| `npm run validate`      | Everything CI runs for the `verify` job                        |

Run `npm run validate` before opening a pull request.

## Project layout

```
src/
├── app/          Shell: providers, router, layouts
├── pages/        Route-level screens (thin; they compose features)
├── features/     Vertical slices — each owns its API, state, UI and types
├── components/   ui/ primitives and common/ composites
├── hooks/        Shared hooks
├── lib/          HTTP client, query client, logger, storage
├── stores/       Global client state
├── config/       Env contract, route paths, constants
├── types/        Shared types
├── utils/        Pure helpers
├── styles/       Tailwind entry and design tokens
└── testing/      Test utilities and MSW handlers
```

Imports point downward only — `app → pages → features → shared` — and a
feature may not import another feature's internals. These rules are **enforced
by ESLint**, with the reasoning in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Read that before adding a
feature.

Use the `@/` alias for anything outside the current feature; inside a feature,
use relative paths so the folder stays portable.

## Environment

Every variable is declared and validated in
[`src/config/env.ts`](src/config/env.ts) and documented in `.env.example`. A
missing or malformed value fails at startup with a readable message instead of
surfacing as `undefined` later.

Only `VITE_`-prefixed variables reach the browser bundle. **Never put a secret
in one** — they ship to every user.

| File           | Used for                                            | Committed |
| -------------- | --------------------------------------------------- | --------- |
| `.env.example` | The documented template                             | yes       |
| `.env.development` | Defaults for `npm run dev`                      | yes       |
| `.env.e2e`     | The Playwright build (mocking on)                   | yes       |
| `.env.local`   | Your machine's overrides                            | **no**    |

## Conventions

- **Components** `PascalCase.tsx`; everything else `camelCase.ts`.
- **Tests** live beside the code as `*.test.ts(x)`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/),
  checked by commitlint. Scopes are listed in `commitlint.config.js`.
- **Logging** goes through `@/lib/logger`; bare `console.*` is a lint error.
- **Colours** come from the semantic tokens in `src/styles/globals.css`
  (`bg-surface`, `text-muted-foreground`, …), never raw palette values — that
  is what keeps dark mode to a single block of CSS.
- **Elevation and motion** are tokens in the same file: `shadow-rest`/`-lift`/
  `-float` rather than a hand-written blur (light and dark need genuinely
  different shadows), and `ease-out-soft`/`-spring`/`-glide` with
  `duration-quick`/`-calm`/`-slow` rather than ad-hoc numbers. Animate
  `opacity` and `transform` only; anything else costs a layout pass.
- **Reduced motion** is honoured app-wide in CSS, but that cannot reach motion
  driven from JavaScript. Anything animating in a component asks
  `usePrefersReducedMotion()` first.

## Git hooks

Installed by `npm install` via Husky:

- **pre-commit** — ESLint + Prettier on staged files
- **commit-msg** — commitlint
- **pre-push** — full typecheck and unit tests

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull
requests to `main`: a `verify` job (typecheck, lint, format, unit tests with
coverage), then `build` and `e2e` in parallel.
