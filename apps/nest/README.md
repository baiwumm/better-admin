# Better Admin — NestJS API

The **NestJS backend API** for Better Admin: it provides the REST API for React / Vue and is the **source of truth for the API contract and database migrations**.

- Live URL: <https://nest.baiwumm.com> (Render; `/api/health` is polled by UptimeRobot every 5 minutes to keep the service awake)
- API docs (Swagger): <https://nest.baiwumm.com/docs> (local: `/docs`)
- Contract source: [`openapi/openapi.yaml`](./openapi/openapi.yaml) (currently v1.14.0; **define the contract before implementing**, shared by all four frontends)
- Database: PostgreSQL (Supabase) + Drizzle ORM 0.45; **migrations are owned by [`drizzle/`](./drizzle)** — Next.js / Nuxt connect to the same database but neither generate nor run migrations
- Auth: dual JWT tokens (Bearer); RBAC permission model (user ↔ role ↔ permission bitmask + menu grants; `super_admin` aggregates all permission bits in real time with OR)

## Commands

```bash
pnpm start:dev      # development (watch)
pnpm build          # build
pnpm lint           # ESLint
pnpm db:generate    # generate a migration with drizzle-kit
pnpm db:migrate     # run migrations (scripts/migrate.ts)
pnpm db:seed        # seed data (menus / roles / demo data; fresh database bootstrap = migrate + seed)
pnpm db:demo-reset  # reset demo data (faker, idempotent)
pnpm storage:init   # initialize the Supabase Storage avatars bucket (idempotent)
```

> The four `scripts/migrate-menus-add-playground*.ts` scripts are intentionally kept: the Playground menu tree is not part of the seed, so a fresh database needs a one-time run following each script's header comment.

## Environment variables

See [`.env.example`](./.env.example): `DATABASE_URL` (local 5432 / Supabase pooler 6543), `JWT_SECRET` / `JWT_REFRESH_SECRET` (startup fails if missing; no fallback), `SEED_ADMIN_PASSWORD`, `LOG_*` (API logging and in-process `@Cron` log cleanup), `DEMO_MODE=true` (read-only demo guard + `POST /auth/demo-login` quick sign-in), `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (server-side only; only `sb_secret_` keys are sent via the `apikey` header). **Never commit real secrets.**

## Deployment

Render (Root Directory = `nest/`): `pnpm build` + `node dist/main.js`; the CORS allowlist includes all four frontend domains. Log and refresh-token cleanup run through in-process `@Cron` (`LOG_CLEANUP_CRON`).
