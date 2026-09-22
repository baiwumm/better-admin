# Better Admin

> 同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，使用 **React、Vue、Next.js、Nuxt、NestJS** 分别实现的全栈 Admin 系统。

## 技术栈

| 技术栈 | 目录 | 定位 | 组件库 |
| --- | --- | --- | --- |
| React | `apps/react/` | 前端（UI 基准） | Hero UI + 项目级自定义组件 |
| Vue | `apps/vue/` | 前端 | Nuxt UI v4 |
| Next.js | `apps/next/` | 全栈（不依赖 NestJS） | Hero UI + 项目级自定义组件 |
| Nuxt | `apps/nuxt/` | 全栈（不依赖 NestJS） | Nuxt UI v4 |
| NestJS | `apps/nest/` | 后端 API | — |

统一 PostgreSQL（Supabase 托管）+ Drizzle ORM；OpenAPI 为 API Contract 唯一真源（`apps/nest/openapi/openapi.yaml`）。

## 项目结构

```text
better-admin/
├── apps/     # 全部可独立运行 / 构建 / 部署的应用
│   ├── react/    # React 前端（UI 基准）
│   ├── vue/      # Vue 前端
│   ├── next/     # Next.js 全栈
│   ├── nuxt/     # Nuxt 全栈
│   ├── nest/     # NestJS 后端 API
│   └── website/  # 官方文档站（Next 16 + Fumadocs）
└── docs/     # 项目文档
```

## 在线地址

> **四端均未部署上线**——现域名指向历史旧项目，全部版本完成后统一上线。

| 站点 | 域名 |
| --- | --- |
| 官方文档站 | `https://better-admin.baiwumm.com` |
| React | `https://react.baiwumm.com` |
| Vue | `https://vue.baiwumm.com` |
| Next.js | `https://next.baiwumm.com` |
| Nuxt | `https://nuxt.baiwumm.com` |
| API | `https://nest.baiwumm.com` |

## 快速开始

```bash
# 前端任一子项目
cd apps/react   # 或 apps/vue / apps/next / apps/nuxt
pnpm install
pnpm dev

# 后端
cd apps/nest
pnpm install
pnpm start:dev
```

前置要求：Node.js、pnpm、Supabase PostgreSQL 连接信息（服务端环境变量，见各子项目 `.env.example`）。

## 文档

| 文档 | 内容 |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | 业务需求真源 |
| [`docs/feature-matrix.md`](docs/feature-matrix.md) | 四端功能对齐状态 |
| [`AGENTS.md`](AGENTS.md) | 开发规范（AI Agent 硬性规则） |
| [`docs/progress.md`](docs/progress.md) | 阶段性进度（倒序） |

## 当前进度

- ✅ React + NestJS 全栈、Vue 前端、Next.js 全栈（功能对齐 React 基准）
- ✅ Nuxt 全栈（功能对齐 26/27，仅剩 Dashboard）
- ❌ Dashboard 概览、Playground 演示场（Gate 后启动）
- ❌ 统一上线

详细进度见 [`docs/progress.md`](docs/progress.md)。
