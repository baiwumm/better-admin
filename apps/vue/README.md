# Better Admin — Vue

The **Vue SPA implementation** of Better Admin: it replicates the React app's UI, interactions, and page structure (the Source of Truth) and uses **Nuxt UI v4** exclusively for components (no alternative libraries). Data is accessed through the NestJS API.

- Live demo: <https://vue.baiwumm.com> (Vercel)
- Data source: all requests go through the **NestJS API** (start `apps/nest` locally; see `VITE_API_BASE_URL` in [`.env.example`](./.env.example)); no direct database access
- Components & charts: Nuxt UI v4 + project-level custom components; charts use **Unovis** (`@unovis/vue` + `@unovis/ts`, pinned versions)
- Core stack: Vue 3.5 · Vite 8 · vue-router (file-based routing via unplugin-vue-router) · TanStack vue-query · Pinia · Tailwind CSS 4 (bundled with Nuxt UI) · TypeScript

## Features

Feature parity with the React reference (see [`docs/feature-matrix.md`](../../docs/feature-matrix.md)): authentication · Dashboard overview · users / roles / permissions / menus / dictionaries / logs · My account · full organization center · preferences · multi-tab workspace (KeepAlive) · command palette · full i18n · route transitions · Playground demos.

Layout constraint: the sidebar, top bar, and command palette use the official Dashboard suite (`UDashboardGroup` / `UDashboardPanel`, etc.); see [`docs/nuxt-ui-guide.md`](../../docs/nuxt-ui-guide.md).

## Commands

```bash
pnpm dev            # development
pnpm build          # production build
pnpm type-check     # vue-tsc type checking
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm sync-locales   # sync locales from the React app (runs automatically before dev / build)
```

## Deployment

Vercel: Root Directory = `apps/vue`, build output `dist/`. SPA deep-link fallback is provided by [`vercel.json`](./vercel.json)'s `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` — without it, refreshing any deep link returns 404 (Vercel applies rewrites after filesystem matches, so `/assets/*` is unaffected). Only public `VITE_*` environment variables are needed.
