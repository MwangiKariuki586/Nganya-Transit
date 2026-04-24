# MATWANA — Nganya Transit

A matatu (nganya) tracking and community platform built with TanStack Start, Supabase, and Tailwind CSS. Fans follow nganyas, spot sightings, and plan rides. Crew members manage live sessions. Admins oversee registrations and operations.

## Architecture

```
src/
├── routes/           # TanStack file-based routes (thin wrappers)
│   ├── (fan)/        # Fan role routes — home, discover, spot, following, profile
│   ├── (crew)/crew/  # Crew role routes — live setup, sessions, registration, profile
│   └── (admin)/admin # Admin routes — dashboard, users, crew, sessions, registrations
├── modules/          # Role-specific screens and domain logic
│   ├── fan/          #   screens/, services/, components/
│   ├── crew/         #   screens/, services/, components/, hooks/, context/
│   └── admin/        #   screens/, components/
├── components/       # Shared UI components
│   ├── ui/           #   Button, Card, Modal, BottomSheet, Skeleton, VirtualList, etc.
│   ├── features/     #   SearchResultsOverlayV2, TrackDrawer, WhereToCard, etc.
│   ├── error/        #   InlineErrorState, RouteErrorFallback, SectionBoundary
│   └── layout/       #   AppShell
├── stores/           # Zustand stores (nganya, sighting, follow, auth, profile, admin, crew)
├── hooks/            # Shared hooks (useRetry, useVirtualTable, useProfileMediaUpload, etc.)
├── lib/              # Utilities (formatters, queries, storage, image-compress, retry)
├── shared/           # Auth guards, error types, RBAC types, server-fn wrappers
├── server/           # Server-only modules (admin, crew, auth, registration, supabase clients)
└── entities/         # Data-access repositories by domain object
```

### Import Rules

Enforced by `npm run check:boundaries`:

| From → To         | modules | features | entities | shared | server |
| ------------------ | ------- | -------- | -------- | ------ | ------ |
| **routes**         | ✅       | ✅        | ✅        | ✅      | ❌      |
| **modules**        | ❌ (cross-role) | ✅ | ✅ | ✅ | ❌      |
| **features**       | ❌       | ❌        | ✅        | ✅      | ❌      |
| **entities**       | ❌       | ❌        | ❌        | ✅      | ❌      |
| **shared**         | ❌       | ❌        | ❌        | ✅      | ❌      |
| **server**         | ❌       | ❌        | ✅ (server-safe) | ✅ (server-safe) | ✅ |

Cross-role imports (e.g., `modules/fan → modules/admin`) are forbidden.

### Key Patterns

- **Routes are thin**: Route files only wire loaders, guards, and `pendingComponent`. Screen implementations live in `modules/`.
- **Custom hooks for screen logic**: Large screens delegate state and effects to co-located hooks (e.g., `useSpotFlow`, `useFollowingDashboard`, `useCrewLiveReadiness`).
- **Stores for client-side cache**: Zustand stores with TTL-based caching and `retryWithBackoff` on stale background refreshes.
- **Server functions for mutations**: All writes go through `@/server/` or `@/shared/server-fns/` with access control checks.
- **RBAC via `enforceRouteRole`**: Each role layout's `beforeLoad` calls `enforceRouteRole(role)` which redirects unauthenticated users.

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project with the required schema

### Setup

```bash
npm install
cp .env.example .env   # Fill in Supabase URL and keys
npm run dev
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest test suite |
| `npm run lint` | Run ESLint on `src/` |
| `npm run check:boundaries` | Verify import rules between layers |

## Testing

Tests use [Vitest](https://vitest.dev/) with the jsdom environment. Test files are co-located with source:

```
src/stores/__tests__/          # Zustand store tests
src/server/admin/__tests__/    # Admin server function tests
src/server/crew/__tests__/     # Crew server function tests
src/server/registration/__tests__/ # Registration approval tests
src/lib/utils/__tests__/       # Utility tests (image compression, etc.)
src/modules/*/services/__tests__/  # Service layer tests
src/__tests__/                 # Integration and property tests
```

Run all tests:

```bash
npm run test
```

Run specific test file:

```bash
npx vitest run src/server/admin/__tests__/dashboard.server.test.ts
```

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (SSR, file-based routing)
- **Database/Auth**: [Supabase](https://supabase.com) (Postgres, Auth, Storage, Realtime)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) for client-side stores
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) with CSS custom properties
- **Linting**: ESLint with `no-console` rule enforced
- **Testing**: Vitest
- **Virtualization**: [@tanstack/react-virtual](https://tanstack.com/virtual) for large lists
