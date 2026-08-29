# Better Admin

> 基于统一设计与业务逻辑，使用 **React、Vue、Next.js、Nuxt、NestJS** 等现代 Web 技术栈分别实现的全栈 Admin 系统。

Better Admin 的核心目标不是做多套不同的后台，而是：

> **同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用不同技术栈完成实现。**

通过同一个实际项目，对比和实践 React、Vue、Next.js、Nuxt、NestJS 等现代 Web 技术栈下的工程实践。

---

## 项目特点

- **一套代码设计，多版本实现**：统一 UI（React / Next.js：Hero UI 为主 + Shadcn UI 补充；Vue / Nuxt：Shadcn UI 为主）、统一业务逻辑、统一数据库，跨技术栈保持一致性。
- **全栈能力对比**：直接对比 React/Vue（SPA + NestJS API）与 Next.js/Nuxt（全栈 Server）两种开发范式。
- **统一 API Contract**：RESTful API，各版本尽量遵循相同的返回结构与协议。
- **统一数据库**：共用同一个 PostgreSQL（Supabase 托管），服务端统一使用 Drizzle ORM。
- **可独立构建与部署**：每个子项目均可独立运行、独立部署。

---

## 技术栈

| 技术栈 | 版本目录 | 定位 | 后端方式 |
| --- | --- | --- | --- |
| React | `react/` | 前端（UI 基准） | NestJS API |
| Vue | `vue/` | 前端 | NestJS API |
| Next.js | `next/` | 全栈 | Next.js Server |
| Nuxt | `nuxt/` | 全栈 | Nuxt Server / Nitro |
| NestJS | `nest/` | 后端 API | PostgreSQL |

基础能力：TypeScript · Tailwind CSS · Hero UI / Shadcn UI · Drizzle ORM · PostgreSQL（Supabase 托管）

---

## 项目结构

```text
better-admin/
├── next/        # Next.js 全栈实现
├── nuxt/        # Nuxt 全栈实现
├── react/       # React（UI 基准；Hero UI 为主 + Shadcn UI 补充）
├── vue/         # Vue + Shadcn UI
├── nest/        # NestJS 后端 API
├── docs/        # 项目文档（需求 / 进度 / UI 规范 / 机制沉淀等）
├── AGENTS.md    # AI Agent 开发指南
└── README.md
```

---

## 在线 Demo

> React 版与 NestJS API 已部署上线；Vue / Next.js / Nuxt 为规划地址，对应版本实现后上线。

- React：`https://react.baiwumm.com`（开发中）
- API：`https://api.baiwumm.com`（开发中，Swagger 文档见 `/docs`）
- Next.js：`https://next.baiwumm.com`（规划中）
- Nuxt：`https://nuxt.baiwumm.com`（规划中）
- Vue：`https://vue.baiwumm.com`（规划中）

---

## 开发阶段记录

> 当前阶段与详细进度见 [`docs/progress.md`](docs/progress.md)（按时间倒序）。

**当前阶段**：React + NestJS 全栈推进中（API 契约 v1.4.3）——React 端登录认证、全站国际化、权限管理 / 菜单管理 / 字典管理 / 角色管理已上线；用户管理、日志管理、概览 Dashboard 迁移中。

历史阶段：Phase 1A React + Shadcn Admin 基础建设（已完成）→ Phase 1B Better Admin UI 定制（已完成）→ Phase 1C React Hero UI 迁移启动 → Phase 2 NestJS + PostgreSQL（已完成），各阶段明细见 `docs/progress.md`。

---

## 快速开始

```bash
# React（Hero UI 基准版本）
cd react
pnpm install
pnpm dev

# Vue / Next / Nuxt（尚未初始化，以下为规划中的使用方式）
cd vue   # 或 next / nuxt
pnpm install
pnpm dev

# NestJS
cd nest
pnpm install
pnpm start:dev
```

> React 版本详情见 [`docs/react.md`](docs/react.md)。各子项目独立运行、独立构建、独立部署。
> 前置要求：Node.js、pnpm、PostgreSQL（Supabase）连接信息（通过服务端环境变量配置）。

---

## 开发状态

- [x] 项目工程规范与文档基础设施（README、AGENTS.md、需求文档）
- [x] React 版本（Hero UI 基准；登录认证 / 国际化 / 角色 / 菜单 / 字典 / 权限管理已上线，详见 [`docs/react.md`](docs/react.md)）
- [x] NestJS 后端 API（用户 / 角色 / 权限 / 菜单 / 字典 / 日志，OpenAPI 契约 v1.4.3，详见 `nest/docs/`）
- [ ] Vue 版本
- [ ] Next.js 版本
- [ ] Nuxt 版本
- [ ] 统一测试与部署

详细需求见 [`docs/requirements.md`](docs/requirements.md)，开发规范见 [`AGENTS.md`](AGENTS.md)，阶段性进度见 [`docs/progress.md`](docs/progress.md)。
