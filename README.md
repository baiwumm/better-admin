<p align="center">
  <strong>English</strong> · <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <!-- Brand asset source: assets/logo/ (light/dark variants follow the artwork color, see docs/ui-spec.md §19.3) -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/logo-light.svg" />
    <img src="assets/logo/logo-dark.svg" width="112" height="112" alt="Better Admin Logo" />
  </picture>
</p>

<h1 align="center">Better Admin</h1>

<p align="center">
  One product, one UI, one set of business logic, one database —<br />
  an open-source full-stack admin system (admin dashboard template) implemented independently with <strong>React, Vue, Next.js, Nuxt, and NestJS</strong>.
</p>

<p align="center">
  <a href="https://better-admin.baiwumm.com"><img src="https://img.shields.io/badge/docs-live-0A0A0A?style=flat-square" alt="Docs site" /></a>
  <a href="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml"><img src="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/github/package-json/v/baiwumm/better-admin?style=flat-square&label=version" alt="Current version" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-0A0A0A?style=flat-square" alt="MIT License" /></a>
  <a href="https://hub.xerj.org/contributors/baiwumm"><img src="https://hub.xerj.org/contributors/baiwumm/badge.svg" alt="XERJ Corpus Hub contributor" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-111?style=flat-square&logo=react&logoColor=61DAFB&labelColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/Vue-3.5-111?style=flat-square&logo=vuedotjs&logoColor=42b883&labelColor=111" alt="Vue 3.5" />
  <img src="https://img.shields.io/badge/Next.js-16-111?style=flat-square&logo=nextdotjs&logoColor=fff&labelColor=111" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Nuxt-4-111?style=flat-square&logo=nuxt&logoColor=00DC82&labelColor=111" alt="Nuxt 4" />
  <img src="https://img.shields.io/badge/NestJS-11-111?style=flat-square&logo=nestjs&logoColor=DD0031&labelColor=111" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/ORM-Drizzle-111?style=flat-square&logo=drizzle&logoColor=C5F7A6&labelColor=111" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/DB-PostgreSQL-111?style=flat-square&logo=postgresql&logoColor=336791&labelColor=111" alt="PostgreSQL (Supabase)" />
</p>

<p align="center">
  📚 <a href="https://better-admin.baiwumm.com">Documentation</a> ·
  🎬 <a href="https://v.douyin.com/rv2bIcmeLww/">Promo video</a> (Chinese narration) ·
  🧩 <a href="docs/feature-matrix.md">Feature matrix</a> ·
  🤖 <a href="AGENTS.md">Dev conventions</a> ·
  📈 <a href="docs/progress.md">Progress log</a>
</p>

> This is a condensed English summary. The [Chinese README](./README.zh-CN.md) is the source of truth; the in-repo docs are written in Chinese.

## ✨ Highlights

- **Five-stack parity**: one product, one UI, one set of business logic, one database — implemented independently with React, Vue, Next.js, Nuxt, and NestJS.
- **29/29 feature parity**: all four frontends stay aligned, with only two intentional architecture differences ([feature matrix](docs/feature-matrix.md)).
- **Auth & RBAC**: dual-token JWT sessions and permission bitmasks, enforced on the server ([auth docs](https://better-admin.baiwumm.com/docs/architecture/auth/)).
- **Contract-first API**: OpenAPI is the single source of truth for every app ([API contract](https://better-admin.baiwumm.com/docs/architecture/api/)).
- **One data layer**: PostgreSQL + Drizzle ORM with the same 17 tables across stacks ([database design](https://better-admin.baiwumm.com/docs/architecture/database/)).
- **UI consistency**: React is the UI source of truth; Hero UI and Nuxt UI v4 are aligned visually and behaviorally ([UI spec](https://better-admin.baiwumm.com/docs/design/ui/)).

## 🌐 Live Demo

All sites run in read-only demo mode: the login page offers one-click "Admin / Random user" sign-in, and write operations are blocked by a read-only guard.

| App | URL | Hosting |
| --- | --- | --- |
| Docs | <https://better-admin.baiwumm.com> | Tencent Cloud EdgeOne Makers (static export) |
| React (UI reference) | <https://react.baiwumm.com> | Vercel |
| Vue | <https://vue.baiwumm.com> | Vercel |
| Next.js | <https://next.baiwumm.com> | Vercel |
| Nuxt | <https://nuxt.baiwumm.com> | Vercel |
| NestJS API | <https://nest.baiwumm.com> | Render |

- Swagger: <https://nest.baiwumm.com/docs>
- API contract (single source of truth): [`apps/nest/openapi/openapi.yaml`](apps/nest/openapi/openapi.yaml)
- Database: one PostgreSQL instance (Supabase) shared by every app, accessed through Drizzle ORM

## 📖 Documentation Site

| Page | Contents |
| --- | --- |
| [Overview](https://better-admin.baiwumm.com/docs/) | App responsibilities, data flow, and architecture rules |
| [Quick start](https://better-admin.baiwumm.com/docs/start/quick-start/) | Run all five apps locally |
| [API contract](https://better-admin.baiwumm.com/docs/architecture/api/) | Response envelope, pagination, and error codes |
| [Auth & RBAC](https://better-admin.baiwumm.com/docs/architecture/auth/) | Dual-token JWT and permission bitmasks |
| [Database design](https://better-admin.baiwumm.com/docs/architecture/database/) | 17 tables and permission-bit storage |
| [UI spec](https://better-admin.baiwumm.com/docs/design/ui/) | Design tokens and component priority |
| [React implementation](https://better-admin.baiwumm.com/docs/frontends/react/) | UI reference, structure, and data flow |
| [Vue implementation](https://better-admin.baiwumm.com/docs/frontends/vue/) | React parity with Nuxt UI v4 |
| [Next.js implementation](https://better-admin.baiwumm.com/docs/frontends/next/) | Full-stack App Router implementation |
| [Nuxt implementation](https://better-admin.baiwumm.com/docs/frontends/nuxt/) | Full-stack Nitro implementation |

## 🧱 Tech Stack

| App | Directory | Stack | UI library |
| --- | --- | --- | --- |
| React | [`apps/react`](apps/react) | React 19 + Vite 8 + TanStack Router/Query + Zustand | Hero UI v3 |
| Vue | [`apps/vue`](apps/vue) | Vue 3.5 + Vite 8 + Pinia + vue-query | Nuxt UI v4 |
| Next.js | [`apps/next`](apps/next) | Next 16 App Router (full-stack, no NestJS dependency) | Hero UI v3 |
| Nuxt | [`apps/nuxt`](apps/nuxt) | Nuxt 4 + Nitro (full-stack, no NestJS dependency) | Nuxt UI v4 |
| NestJS | [`apps/nest`](apps/nest) | Nest 11 + Drizzle ORM + PostgreSQL | — |
| Docs site | [`apps/website`](apps/website) | Next 16 static export; fumadocs for `/docs` | fumadocs-ui |

React is the **UI source of truth**: the four frontends share page structure, interactions, visuals, and design tokens (see [`docs/ui-spec.md`](docs/ui-spec.md)).

## 📁 Project Structure

```text
better-admin/
├── apps/          # Independently runnable / buildable / deployable apps
├── docs/          # Requirements, UI spec, progress, mechanisms (Chinese)
├── assets/logo/   # Shared brand assets
├── scripts/       # Repo-level scripts (version sync)
├── package.json   # Single source of truth for the product version
└── AGENTS.md      # Development conventions
```

Each app is self-contained: no pnpm workspace, separate lockfile / install / build / deploy.

## 🚀 Quick Start

```bash
# Backend API (data source for React / Vue; needs DATABASE_URL and friends in .env)
cd apps/nest && pnpm install
pnpm db:migrate && pnpm db:seed
pnpm start:dev            # http://localhost:3000/api (Swagger at /docs)

# Any frontend
cd apps/react && pnpm install && pnpm dev    # or apps/vue
cd apps/next && pnpm install && pnpm dev     # or apps/nuxt (full-stack, connects to the DB directly)
```

Requirements: Node.js ≥ 20, pnpm (version pinned per app), and a PostgreSQL connection string in server-side env vars (see each app's `.env.example`).

## 🤖 Ask an AI About the Code

This repository is indexed by [XERJ Corpus Hub](https://hub.xerj.org/contributors/baiwumm) as an agent-readable corpus. Point an AI coding agent at the repo and ask where a feature lives or how it works — answers cite files and lines instead of relying on model memory.

- AI entry point for the docs site: [`llms.txt`](https://better-admin.baiwumm.com/llms.txt)

## 📚 Repository Docs

The docs are written in Chinese (the project's primary language):

| Document | Contents |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Development conventions and agent rules |
| [`docs/requirements.md`](docs/requirements.md) | Product requirements |
| [`docs/feature-matrix.md`](docs/feature-matrix.md) | Feature parity across the four frontends |
| [`docs/launch-runbook.md`](docs/launch-runbook.md) | Deployment, smoke tests, rollback |

## ❓ FAQ

**What is Better Admin?**
An open-source full-stack admin system (admin dashboard template): one product, UI, business logic, and database, implemented independently with React, Vue, Next.js, Nuxt, and NestJS.

**Why implement the same product five times?**
To compare how one product lands across different stacks and provide a reference implementation; every app runs, builds, and deploys independently.

**Do all versions share the same database?**
Yes. One PostgreSQL database with Drizzle ORM; schema, data model, business rules, data types, and API contract stay aligned.

**Can I use it commercially?**
Yes. The project is MIT licensed; keep the copyright notice. Issues and pull requests are welcome.

## 🤝 Contributing

Issues and pull requests are welcome. Read [`AGENTS.md`](AGENTS.md) before making changes; when adding a feature or changing feature status, update [`docs/feature-matrix.md`](docs/feature-matrix.md) too.

## ⚖️ License

[MIT](./LICENSE) — see `LICENSE` for copyright (© 2026 baiwumm).
