# Architecture

This document explains **why** the code is laid out the way it is. The rules
here are enforced by ESLint, not by convention alone — see the `layerRules`
block at the top of [`eslint.config.js`](../eslint.config.js).

## The shape: feature-sliced, with enforced layers

Most React codebases start grouped by technical role (`components/`, `hooks/`,
`services/`) and stop scaling at about twenty screens, because a single change
to one business capability touches every folder. This project groups by
**capability** instead, and keeps a thin shared layer underneath.

```
src/
├── app/          Application shell: providers, router, layouts
├── pages/        Route-level screens. Thin — they compose features
├── features/     Vertical slices. Each owns its API, state, UI and types
├── components/   Shared presentational code (ui/ primitives, common/ composites)
├── hooks/        Shared hooks
├── lib/          Cross-cutting infrastructure (http, query client, logger, storage)
├── stores/       Global client state
├── config/       Env contract, route paths, constants
├── types/        Shared types
├── utils/        Pure helpers
├── styles/       Tailwind entry + design tokens
└── testing/      Test utilities and MSW handlers
```

### The dependency rule

Imports may only point **downward**:

```
app  →  pages  →  features  →  components / hooks / lib / utils / config / types / stores
```

Concretely:

| Layer        | May import                      | May **not** import                         |
| ------------ | ------------------------------- | ------------------------------------------ |
| `app/`       | everything                      | a feature's internals (barrel only)        |
| `pages/`     | features, shared                | `app/`, a feature's internals              |
| `features/*` | shared, own internals           | `app/`, `pages/`, **other features' files** |
| shared       | other shared                    | `app/`, `pages/`, `features/`              |

Two consequences worth stating plainly:

- **Shared code may never import a feature.** If one feature needs it, it
  belongs in that feature. If several do, it belongs in the shared layer
  _without_ the feature dependency. This is the rule that stops `components/`
  from quietly becoming a second copy of the app.
- **A feature may never import another feature's files**, only its barrel
  (`@/features/auth`). Cross-feature composition happens one level up, in a
  page or in `app/`.

Breaking either produces an ESLint error with an explanation, at the import.

## Feature anatomy

```
src/features/auth/
├── api/          Transport (auth.api.ts) + React Query hooks (auth.queries.ts)
├── components/   Feature-specific UI, co-located with its tests
├── hooks/        Feature-specific hooks
├── lib/          Pure logic the components render but do not own
├── schemas/      Zod schemas — one source of truth for forms and API parsing
├── stores/       Feature-scoped client state
├── types/        Feature models
└── index.ts      Public API. The only entry point other layers may use
```

`lib/` is for the decisions a feature makes that are not React's business —
`reviews/lib/narrative.ts` turns a raw SSE event into the sentence a reviewer
reads, and `reviews/lib/status.ts` is the single place a review state is given
a word and a colour. Keeping them out of the components is not tidiness: the
wording *is* the product in an audit tool, and wording that lives in a pure
module can be unit-tested sentence by sentence, which wording embedded in JSX
cannot.

### Intra-feature imports are relative

Inside a feature, use `./` and `../`. Outside it, use the `@/` alias. This is
deliberate: it means a feature folder can be moved, renamed, copied to another
project, or deleted without touching a single import inside it. The `@/`
alias appearing inside a feature is a signal that it is reaching out of itself.

### The barrel is the contract

`index.ts` is a hand-written list, not `export *`. Keeping it small is what
makes the internals free to change — if everything is exported, nothing can be
refactored.

## Server state vs. client state

This is the distinction that causes the most trouble when it is blurred:

- **Server state** → React Query. Anything that lives in a database. It has
  caching, staleness, and invalidation semantics that a store cannot express.
- **Client state** → Zustand. Preferences, UI chrome, ephemeral selections.
  Things that have no server copy and need no invalidation.

Caching server data in a Zustand store is the usual root cause of
"why is this screen stale" bugs. See [`lib/query/queryClient.ts`](../src/lib/query/queryClient.ts)
for the retry predicate, which is the one React Query default genuinely worth
overriding.

## Key decisions and the reasoning

| Decision                                          | Why                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Access token in memory, refresh token in a cookie | A token in `localStorage` is readable by any injected script, turning one XSS into a stolen session. Costs one request at boot.    |
| `fetch` wrapper, not a client library             | Timeouts, error normalisation and the single-flight 401 refresh are all visible in one file with no hidden behaviour.             |
| Auth injected into the HTTP client via a setter   | The client must not import the auth store, because the store calls the client. The setter breaks that cycle.                      |
| Zod validates every API response                  | A type parameter on `http.get<T>()` is an assertion, not a guarantee. `parse` is what actually catches a changed server contract. |
| Env parsed once at startup                        | A misconfigured deploy fails on boot with a readable message, rather than hours later as `undefined`.                             |
| Routes as functions in `config/paths.ts`          | `paths.app.userDetail.getHref(id)` cannot produce `/users/undefined`. Hand-written route strings can.                             |
| Semantic colour tokens, not literal ones          | Dark mode becomes a palette swap in one CSS block rather than a `dark:` variant on every component.                               |
| Pages are lazy, layouts are eager                 | Every route needs the layout; only one needs its page. Each route ships as its own chunk.                                         |
| MSW for both dev and tests                        | One set of handlers means the mock the UI was built against is the mock the tests assert on.                                      |
| Figures formatted from the workbook's own format string | The alternative is a table in this codebase saying which columns are money, which are days and which are percentages - written per entry type, per country and per period, and wrong the first time a preparer adds a column. `lib/excelFormat.ts` is the only thing that reads it. |
| Report section numbers allocated in reading order | Every section below the third is conditional. Numbered by hand, the spine skipped 4 whenever the evidence register was empty - and the numbers are how one person says "look at four" to another. |
| Logging only via `@/lib/logger`                   | `no-console` is an error, so log level is configurable and there is one place to add a crash reporter.                             |

## Adding a feature

1. `mkdir src/features/<name>` with the folders it actually needs.
2. Define `schemas/` first — it is the contract for both the form and the API.
3. `api/<name>.api.ts` for transport, `api/<name>.queries.ts` for the React
   Query hooks and the `<name>Keys` hierarchy.
4. Build components under `components/`, with tests beside them.
5. Export the minimum from `index.ts`.
6. Compose it into a page under `src/pages/`, and register the route in
   `src/config/paths.ts` + `src/app/router/routes.tsx`.

Add handlers to `src/testing/mocks/handlers.ts` and the feature can be built
and tested before the API exists.

## Testing strategy

| Level       | Tool                    | What it is for                                              |
| ----------- | ----------------------- | ----------------------------------------------------------- |
| Unit        | Vitest                  | Pure logic: utils, schemas, the HTTP client                 |
| Component   | Vitest + RTL + MSW      | A feature's behaviour through the DOM, against mocked HTTP  |
| End-to-end  | Playwright              | Whole journeys against a real production-style build        |

Tests query by role and label rather than by test id, so they assert the same
thing a screen reader sees. `renderWithProviders` from
[`src/testing/test-utils.tsx`](../src/testing/test-utils.tsx) supplies a fresh
QueryClient per test — a shared one leaks cache between tests and produces
order-dependent failures.

E2E runs `vite build --mode e2e`, which loads `.env.e2e` and enables MSW. The
production mode deliberately cannot enable it: the check in `main.tsx` compares
the inlined `import.meta.env.MODE` literal, so the bundler drops MSW (~390 kB)
from a production build entirely.
