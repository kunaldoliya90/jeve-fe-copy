# Features

Each folder here is one **vertical slice** of the product: it owns its own API
calls, state, UI, schemas and types, and exposes a small public API through
`index.ts`.

`auth/` is the reference implementation — copy its shape.

## Rules (enforced by ESLint)

1. **A feature may not import another feature's internals.** Use the barrel
   (`@/features/other`), or compose the two one level up in a page.
2. **A feature may not import `app/` or `pages/`.** Dependencies point
   downward. If a feature needs something from the shell, the shell passes it
   in as a prop or callback.
3. **Inside a feature, imports are relative** (`./`, `../`). Use the `@/` alias
   only for shared layers. This keeps the folder portable — it can be moved,
   renamed or deleted without rewriting its own imports.
4. **`index.ts` is hand-written**, not `export *`. A small surface is what
   makes the internals safe to refactor.

## Layout

```
<feature>/
├── api/          Transport + React Query hooks and the query-key hierarchy
├── components/   Feature UI, with tests beside each file
├── hooks/        Feature hooks (the one consumers use lives here)
├── schemas/      Zod schemas — one contract for forms and API parsing
├── stores/       Feature-scoped Zustand state (client state only)
├── types/        Feature models
└── index.ts      Public API
```

Only create the folders the feature actually needs.

## Where things go

- Fetching, caching, invalidation → `api/`, via React Query.
- Preferences and UI state with no server copy → `stores/`.
- Validation → `schemas/`, and reuse the same schema to `parse` API responses.
- Anything a second feature needs → promote it to the shared layer
  (`components/`, `hooks/`, `lib/`, `utils/`), **without** a feature import.
