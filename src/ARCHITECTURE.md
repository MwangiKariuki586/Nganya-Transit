# MATWANA Frontend Architecture (Incremental Refactor)

## Layers

- `routes/`: TanStack file-routes only (routing + guards).
- `modules/`: role-specific UI/workflows (`fan`, `crew`, `admin`).
- `features/`: reusable workflows shared across roles.
- `entities/`: data-access repositories by domain object.
- `shared/`: design system, generic hooks/utils, auth helpers, supabase client wrappers.
- `server/`: server-only functions and enforcement.

## Import Rules

- `routes -> modules|features|entities|shared`: allowed.
- `modules -> features|entities|shared`: allowed.
- `features -> entities|shared`: allowed.
- `entities -> shared`: allowed.
- `shared -> shared`: allowed only.
- `server -> server|shared(server-safe)|entities(server-safe)`: allowed.

## Disallowed

- `shared` importing from `modules|features|entities`.
- `entities` importing from `features|modules`.
- Cross-role imports, e.g. `modules/fan` importing `modules/admin`.
- Client code importing any `*.server.ts`.
- Grouped role routes importing from `components|lib|features|entities` directly.

## Current Stage

- Route groups added: `(fan)`, `(crew)`, `(admin)`.
- Fan routes moved into `(fan)` group and made thin wrappers.
- Shared/entities/features/server scaffolding established for incremental migration.
- Fan screen implementations are now in `modules/fan/screens`.

## Boundary Check

- Run `npm run check:boundaries` to enforce import constraints in CI/local checks.
