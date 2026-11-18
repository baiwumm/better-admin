# Better Admin — React (UI Source of Truth)

The **React SPA implementation** of Better Admin and the product's **UI reference**: page structure, interactions, visuals, and design tokens are defined here, with Vue / Next.js / Nuxt aligning to this app.

- Live demo: <https://react.baiwumm.com> (Vercel)
- Data source: all requests go through the **NestJS API** (start `apps/nest` locally; see `VITE_API_BASE_URL` in [`.env.example`](./.env.example)); no direct database access
- UI components: **Hero UI v3 + project-level custom components** (no Shadcn / Radix); style variables follow the project design tokens, with Hero UI as the visual reference
- Core stack: React 19 · Vite 8 · TanStack Router (file-based routing) · TanStack Query · Zustand · Tailwind CSS 4 · TypeScript

## Features

Authentication (sign-in / dual tokens / silent refresh / forced sign-out) · Dashboard overview · Users / roles / permissions / menus / dictionaries / logs · My account (Supabase Storage avatar) · Organization center (organizations / positions / directory / notices / inbox / org chart / export) · Preferences · Multi-tab workspace (KeepAlive) · Command palette · Full i18n · Route transitions · Playground demos. See [`docs/feature-matrix.md`](../../docs/feature-matrix.md) for parity status.

## Commands

```bash
pnpm dev            # development
pnpm build          # production build (includes type checking)
pnpm preview        # preview the build output
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm check-locales  # locale consistency check (enforced in CI)
```

## Deployment

Vercel: Root Directory = `apps/react`, build output `dist/`. SPA deep-link fallback is provided by [`vercel.json`](./vercel.json)'s `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` — without it, refreshing any deep link returns 404 (Vercel applies rewrites after filesystem matches, so `/assets/*` is unaffected). Only public `VITE_*` environment variables are needed.
