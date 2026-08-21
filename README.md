# Better Admin

> 基于统一设计与业务逻辑，使用 **React、Vue、Next.js、Nuxt、NestJS** 等现代 Web 技术栈分别实现的全栈 Admin 系统。

Better Admin 的核心目标不是做多套不同的后台，而是：

> **同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用不同技术栈完成实现。**

通过同一个实际项目，对比和实践 React、Vue、Next.js、Nuxt、NestJS 等现代 Web 技术栈下的工程实践。

---

## 项目特点

- **一套代码设计，多版本实现**：统一 UI（基于 Shadcn Admin）、统一业务逻辑、统一数据库，跨技术栈保持一致性。
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

基础能力：TypeScript · Tailwind CSS · Shadcn Admin · Drizzle ORM · PostgreSQL（Supabase 托管）

---

## 项目结构

```text
better-admin/
├── next/        # Next.js 全栈实现
├── nuxt/        # Nuxt 全栈实现
├── react/       # React + Shadcn Admin（UI 基准）
├── vue/         # Vue + Shadcn Admin 风格
├── nest/        # NestJS 后端 API
├── docs/        # 项目文档（需求：docs/requirements.md）
├── AGENTS.md    # AI Agent 开发指南
└── README.md
```

---

## 在线 Demo

> ⏳ 尚未上线，敬请期待。规划地址如下：

- Next.js：`https://next.baiwumm.com`
- Nuxt：`https://nuxt.baiwumm.com`
- React：`https://react.baiwumm.com`
- Vue：`https://vue.baiwumm.com`
- API：`https://api.baiwumm.com`

---

## 当前开发阶段

**Phase 1A：React + Shadcn Admin 基础建设（已完成）**

- [x] `react/` 初始化完成，基于官方 Shadcn Admin（v2.2.1）二次开发
- [x] UI 基础结构建立（Layout / Sidebar / Header / Theme / Dark Mode / shadcn/ui 组件）
- [x] 项目可独立运行：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` 全部通过
- [ ] 登录、RBAC 权限、真实业务页面（用户/角色/权限/菜单/系统设置/日志）
- [ ] 接入 NestJS API 与数据库（当前仅使用 Demo Mock 数据）

> 下一阶段为 Phase 1B（UI 定制），当前不进入；各版本开发路线：
> React → NestJS → Vue → Next.js → Nuxt.js → 统一测试 → 部署。

---

## 快速开始

```bash
# React（已初始化：基于官方 Shadcn Admin 建立 UI 基础）
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
- [x] React 版本（基于 Shadcn Admin 的 UI 基础已建立，业务功能后续阶段开发，详见 [`docs/react.md`](docs/react.md)）
- [ ] NestJS 后端 API
- [ ] Vue 版本
- [ ] Next.js 版本
- [ ] Nuxt 版本
- [ ] 统一测试与部署

详细需求见 [`docs/requirements.md`](docs/requirements.md)，开发规范见 [`AGENTS.md`](AGENTS.md)。
