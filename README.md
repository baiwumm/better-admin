# Better Admin

> 同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用 **React、Vue、Next.js、Nuxt、NestJS** 独立实现的全栈 Admin 系统。
>
> **v0.2.0 · 六端已全部上线（2026-09-23）**，功能对齐 29/29（见 [`docs/feature-matrix.md`](docs/feature-matrix.md)）。

## 在线体验

线上即演示环境（只读演示模式）：登录页可一键「管理员 / 随机用户」快捷登录，写操作由只读守卫拦截并提示。

| 站点 | 地址 | 部署平台 |
| --- | --- | --- |
| 官方文档站 | <https://better-admin.baiwumm.com> | Cloudflare Workers（静态导出） |
| React（UI 基准） | <https://react.baiwumm.com> | Cloudflare Workers（Static Assets） |
| Vue | <https://vue.baiwumm.com> | Cloudflare Workers（Static Assets） |
| Next.js | <https://next.baiwumm.com> | Vercel |
| Nuxt | <https://nuxt.baiwumm.com> | Vercel |
| NestJS API | <https://nest.baiwumm.com> | Render（UptimeRobot 保活） |

- API 文档（Swagger）：<https://nest.baiwumm.com/docs>
- API Contract 唯一真源：[`apps/nest/openapi/openapi.yaml`](apps/nest/openapi/openapi.yaml)
- 数据库：统一 PostgreSQL（Supabase 托管，仅作数据库 + 头像 Storage）+ Drizzle ORM

## 技术栈

| 端 | 目录 | 技术栈 | 组件库 |
| --- | --- | --- | --- |
| React | [`apps/react`](apps/react) | React 19 + Vite 8 + TanStack Router/Query + Zustand | Hero UI v3 |
| Vue | [`apps/vue`](apps/vue) | Vue 3.5 + Vite 8 + Pinia + vue-query | Nuxt UI v4（唯一） |
| Next.js | [`apps/next`](apps/next) | Next 16 App Router（独立全栈，不依赖 NestJS） | Hero UI v3 |
| Nuxt | [`apps/nuxt`](apps/nuxt) | Nuxt 4 + Nitro（独立全栈，不依赖 NestJS） | Nuxt UI v4（唯一） |
| NestJS | [`apps/nest`](apps/nest) | Nest 11 + Drizzle ORM + PostgreSQL | — |
| 文档站 | [`apps/website`](apps/website) | Next 16 静态导出 + fumadocs-core | beUI 风格自建组件 |

React 是 **UI Source of Truth**；四个前端页面结构、交互、视觉与 Design Tokens 保持一致（细则见 [`docs/ui-spec.md`](docs/ui-spec.md)）。

## 项目结构

```text
better-admin/
├── apps/          # 全部可独立运行 / 构建 / 部署的应用（见上表）
├── docs/          # 项目文档（需求真源 / UI 规范 / 进度 / 机制沉淀）
├── assets/logo/   # 跨端共享的品牌资产真源
├── scripts/       # 仓库级脚本（sync-versions 版本同步）
└── AGENTS.md      # 开发规范（含 AI Agent 硬性规则）
```

每个子应用相互独立：**不引入 pnpm workspace**，各自独立 lockfile / install / build / deploy。

## 快速开始

```bash
# 后端 API（React / Vue 的数据源；需在 .env 配好 DATABASE_URL 等服务端变量）
cd apps/nest && pnpm install
pnpm db:migrate && pnpm db:seed
pnpm start:dev            # http://localhost:3000/api（Swagger 在 /docs）

# 前端任选其一
cd apps/react && pnpm install && pnpm dev    # 或 apps/vue
cd apps/next && pnpm install && pnpm dev     # 或 apps/nuxt（独立全栈，直连数据库）
```

前置要求：Node.js ≥ 20、pnpm（版本按各端 `packageManager` 字段）、PostgreSQL 连接信息（服务端环境变量，见各子项目 `.env.example`；**密钥严禁提交仓库**）。

## 文档

| 文档 | 内容 |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | 业务需求真源 |
| [`docs/ui-spec.md`](docs/ui-spec.md) | UI 规范真源（组件策略 / Design Tokens / 品牌资产） |
| [`docs/feature-matrix.md`](docs/feature-matrix.md) | 四端功能对齐状态 |
| [`docs/progress.md`](docs/progress.md) | 阶段性进度（倒序） |
| [`docs/mechanisms.md`](docs/mechanisms.md) | 机制沉淀（技术结论） |
| [`docs/launch-runbook.md`](docs/launch-runbook.md) | 六端上线记录与运维手册 |
| [`AGENTS.md`](AGENTS.md) | 开发规范与 AI Agent 硬性规则 |
