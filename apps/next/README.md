# Better Admin — Next.js Full-Stack

- Live demo: <https://next.baiwumm.com> (Vercel; production `DATABASE_URL` uses the Supabase pooler on port 6543)

The **standalone Next.js full-stack implementation** of the same Better Admin product (see the repo root [AGENTS.md](../../AGENTS.md)):
App Router + Server Components/Route Handlers + PostgreSQL (Drizzle ORM), with no dependency on NestJS.

- UI reference: `/react` (Hero UI v3) is the Source of Truth; page structure, interactions, and visuals align with it
- API: `src/app/api/**` Route Handlers, matching `nest/openapi/openapi.yaml` (the single source of truth for the API contract)
- Auth: dual JWT tokens (httpOnly cookies) + `src/proxy.ts` guard (signature verification + live `token_version` comparison + 403/404 semantics for menu paths)
- Database: shares the same Supabase PostgreSQL instance as Nest; **migrations are owned by `nest/drizzle/`**, and this app neither generates nor runs them

## Implemented modules (N0–N7 + organization follow-up)

Authentication (sign-in / dual tokens / silent refresh / forced sign-out) · Admin layout (dynamic menus / multi-tab workspace / command palette / theme and language switching) ·
User management (including organization and position links) · Role management (including menu-authorization drawer) · Menu management · Permission reference page · Dictionary management · Log management ·
My account (Supabase Storage avatar) · Organization management (org tree / drag-and-drop ordering) · Position management · People directory ·
Notice management (Tiptap rich text / publish scope / read stats / reminders) · Inbox bell · Error pages 403/404/500

## Commands

```bash
pnpm dev            # development (port 3000 by default)
pnpm build / start  # production build / start
pnpm lint           # ESLint (--fix)
pnpm db:pull        # introspect the database into src/db/schema.ts (run manually after Nest-side migration changes)
pnpm db:clean-logs  # log cleanup (keeps LOG_RETENTION_DAYS days, default 30; used by GitHub Actions cron)
pnpm check-locales  # locale consistency with react/src/i18n/locales (enforced in CI)
```

## Environment variables

See [.env.example](./.env.example): `DATABASE_URL`, `JWT_*`, `SUPABASE_URL` / `SUPABASE_SECRET_KEY`,
`LOG_RETENTION_DAYS`, `NEXT_PUBLIC_*`. Secrets live only in server-side environment variables and must never be committed.

## Deployment (Vercel)

- Root Directory = `next/`; configure environment variables in the Vercel project (same names as `.env.example`)
- Database migrations **do not** run on Vercel (the source of truth is Nest); `db:pull` is for local development only
- Log cleanup: the automatic path is owned by **Nest's in-process `@Cron`** (`LOG_CLEANUP_CRON` / `LOG_RETENTION_DAYS`).
  This app's `db:clean-logs` is for manual catch-up only: the scheduled trigger in `.github/workflows/clean-logs.yml` was removed on 2026-09-22
  to avoid automatic daily use of write credentials that can delete production data; `workflow_dispatch` remains for catch-up after a Nest-side failure (see `docs/launch-audit.md` #45).

## Known differences from the React app (all confirmed decisions)

- No KeepAlive (App Router has no equivalent); the tab "refresh" action only affects the active tab
- Route transitions use React `<ViewTransition>` (no config flag needed since Next 16.3; a `<main>`-level VT boundary in `admin-shell` + `styles/route-transitions.css`), rather than the React app's manual `startViewTransition` + displayedPath double buffering; direction awareness is written by `lib/route-direction.ts` at the navigation origin via `data-rt-direction` (browser back/forward has no direction, same as the React app)
- Tokens are stored in httpOnly cookies (the React app uses localStorage + Bearer); the API still accepts Bearer internally
- Menu permission filtering runs on the server (client-side in the React app); log cleanup uses a GitHub Actions cron (Nest uses an in-process schedule)
