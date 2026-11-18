# Better Admin — Nuxt

The **standalone Nuxt full-stack implementation** of Better Admin (no NestJS dependency): React is the UI reference, Vue is the component implementation blueprint, Next.js is the server blueprint, and server-side business logic is ported verbatim from NestJS.

- Live demo: <https://nuxt.baiwumm.com> (Vercel, Nitro node preset)
- Server: `server/api/**` with 76 method files + business services in `server/lib/**`, connecting directly to PostgreSQL (postgres.js) and matching the [`openapi.yaml`](../nest/openapi/openapi.yaml) contract (full coverage except the keep-alive-only `GET /health`); **migrations are owned by `nest/drizzle/`**, and this app neither generates nor runs them
- UI components: **Nuxt UI v4** (the only component library) + the official Dashboard suite; charts use **nuxt-charts** (vccs under the hood, the Vue port of Recharts)
- Core stack: Nuxt 4 · Nitro · TanStack vue-query · Pinia · Tailwind CSS 4 · TypeScript

## Features

Feature parity with the React reference at 29/29 (see [`docs/feature-matrix.md`](../../docs/feature-matrix.md)): authentication · Dashboard overview · users / roles / permissions / menus / dictionaries / logs · My account · full organization center · preferences · multi-tab workspace (built-in keepalive in NuxtPage) · command palette · full i18n · route transitions · Playground demos.

## Commands

```bash
pnpm dev            # development
pnpm build          # production build
pnpm typecheck      # type checking
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm check-locales  # locale consistency check (enforced in CI)
pnpm sync-locales   # sync locales from the React app (runs automatically before dev / test)
pnpm contract-diff  # contract smoke comparison against the Nest service (Nest must be online; release verification tool)
```

## Environment variables

See [`.env.example`](./.env.example): `DATABASE_URL`, `JWT_SECRET` / `JWT_REFRESH_SECRET`, `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (avatar Storage proxy), `DEMO_MODE`, `NUXT_PUBLIC_*`. Secrets live only in server-side environment variables and must never be committed.

## Deployment

Vercel (Root Directory = `nuxt/`, Nitro node preset — postgres.js TCP connections are not supported on the Workers runtime): configure environment variables in the Vercel project; migrations are not run during deployment.
