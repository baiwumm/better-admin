# Better Admin

> 同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，使用 **React、Vue、Next.js、Nuxt、NestJS** 分别实现的全栈 Admin 系统。

## 技术栈

| 技术栈 | 目录 | 定位 | 组件库 |
| --- | --- | --- | --- |
| React | `react/` | 前端（UI 基准） | Hero UI 为主 + Shadcn UI 补充 |
| Vue | `vue/` | 前端 | Nuxt UI v4 |
| Next.js | `next/` | 全栈（不依赖 NestJS） | Hero UI 为主 + Shadcn UI 补充 |
| Nuxt | `nuxt/` | 全栈（不依赖 NestJS） | Nuxt UI v4 |
| NestJS | `nest/` | 后端 API | — |

统一 PostgreSQL（Supabase 托管）+ Drizzle ORM；OpenAPI 为 API Contract 唯一真源（`nest/openapi/openapi.yaml`）。

## 项目结构

```text
better-admin/
├── react/    # React 前端（UI 基准）
├── vue/      # Vue 前端
├── next/     # Next.js 全栈
├── nuxt/     # Nuxt 全栈
├── nest/     # NestJS 后端 API
├── website/  # 官方文档站（Next 16 + Fumadocs）
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
cd react   # 或 vue / next / nuxt
pnpm install
pnpm dev

# 后端
cd nest
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
- 🔧 Nuxt 全栈（立项待决策）
- ❌ Dashboard 概览、Playground 演示场（Gate 后启动）
- ❌ 统一上线

详细进度见 [`docs/progress.md`](docs/progress.md)。
