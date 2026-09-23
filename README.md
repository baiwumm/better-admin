<p align="center">
  <!-- 品牌资产真源 assets/logo/（命名按「图形自身外观」，与 apps/*/public/ 语义相反，规则见 docs/ui-spec.md §19.3）：
       亮色档用黑底白块的 logo-dark.svg，暗色档换白底黑块的 logo-light.svg -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/logo-light.svg" />
    <img src="assets/logo/logo-dark.svg" width="112" height="112" alt="Better Admin Logo" />
  </picture>
</p>

<h1 align="center">Better Admin</h1>

<p align="center">
  同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，<br />
  分别用 <strong>React、Vue、Next.js、Nuxt、NestJS</strong> 独立实现的全栈 Admin 系统。
</p>

<p align="center">
  <a href="https://better-admin.baiwumm.com"><img src="https://img.shields.io/badge/%E6%96%87%E6%A1%A3%E7%AB%99-%E5%9C%A8%E7%BA%BF-0A0A0A?style=flat-square" alt="官方文档站在线" /></a>
  <a href="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml"><img src="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/badge/%E7%89%88%E6%9C%AC-0.2.0-0A0A0A?style=flat-square" alt="版本 0.2.0" />
  <img src="https://img.shields.io/badge/%E5%85%AD%E7%AB%AF%E5%B7%B2%E4%B8%8A%E7%BA%BF-2026--09--23-2ea44f?style=flat-square" alt="六端已于 2026-09-23 上线" />
  <a href="docs/feature-matrix.md"><img src="https://img.shields.io/badge/%E5%8A%9F%E8%83%BD%E5%AF%B9%E9%BD%90-29%2F29-2ea44f?style=flat-square" alt="四端功能对齐 29/29" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-0A0A0A?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-111?style=flat-square&logo=react&logoColor=61DAFB&labelColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/Vue-3.5-111?style=flat-square&logo=vuedotjs&logoColor=42b883&labelColor=111" alt="Vue 3.5" />
  <img src="https://img.shields.io/badge/Next.js-16-111?style=flat-square&logo=nextdotjs&logoColor=fff&labelColor=111" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Nuxt-4-111?style=flat-square&logo=nuxt&logoColor=00DC82&labelColor=111" alt="Nuxt 4" />
  <img src="https://img.shields.io/badge/NestJS-11-111?style=flat-square&logo=nestjs&logoColor=DD0031&labelColor=111" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/ORM-Drizzle-111?style=flat-square&logo=drizzle&logoColor=C5F7A6&labelColor=111" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/DB-PostgreSQL-111?style=flat-square&logo=postgresql&logoColor=336791&labelColor=111" alt="PostgreSQL（Supabase 托管）" />
</p>

<p align="center">
  📚 <a href="https://better-admin.baiwumm.com">在线文档站</a> ·
  🧩 <a href="docs/feature-matrix.md">功能矩阵</a> ·
  🤖 <a href="AGENTS.md">开发规范</a> ·
  📈 <a href="docs/progress.md">进度记录</a>
</p>

## 🌐 在线体验

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

## 🧱 技术栈

| 端 | 目录 | 技术栈 | 组件库 |
| --- | --- | --- | --- |
| React | [`apps/react`](apps/react) | React 19 + Vite 8 + TanStack Router/Query + Zustand | Hero UI v3 |
| Vue | [`apps/vue`](apps/vue) | Vue 3.5 + Vite 8 + Pinia + vue-query | Nuxt UI v4（唯一） |
| Next.js | [`apps/next`](apps/next) | Next 16 App Router（独立全栈，不依赖 NestJS） | Hero UI v3 |
| Nuxt | [`apps/nuxt`](apps/nuxt) | Nuxt 4 + Nitro（独立全栈，不依赖 NestJS） | Nuxt UI v4（唯一） |
| NestJS | [`apps/nest`](apps/nest) | Nest 11 + Drizzle ORM + PostgreSQL | — |
| 文档站 | [`apps/website`](apps/website) | Next 16 静态导出 + fumadocs（/docs）+ beUI 风格首页 | fumadocs-ui + beUI 首页 |

React 是 **UI Source of Truth**；四个前端页面结构、交互、视觉与 Design Tokens 保持一致（细则见 [`docs/ui-spec.md`](docs/ui-spec.md)）。

## 📁 项目结构

```text
better-admin/
├── apps/          # 全部可独立运行 / 构建 / 部署的应用（见上表）
├── docs/          # 项目文档（需求真源 / UI 规范 / 进度 / 机制沉淀）
├── assets/logo/   # 跨端共享的品牌资产真源
├── scripts/       # 仓库级脚本（sync-versions 版本同步）
└── AGENTS.md      # 开发规范（含 AI Agent 硬性规则）
```

每个子应用相互独立：**不引入 pnpm workspace**，各自独立 lockfile / install / build / deploy。

## 🚀 快速开始

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

## 📚 文档

| 文档 | 内容 |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | 业务需求真源 |
| [`docs/ui-spec.md`](docs/ui-spec.md) | UI 规范真源（组件策略 / Design Tokens / 品牌资产） |
| [`docs/feature-matrix.md`](docs/feature-matrix.md) | 四端功能对齐状态 |
| [`docs/progress.md`](docs/progress.md) | 阶段性进度（倒序） |
| [`docs/mechanisms.md`](docs/mechanisms.md) | 机制沉淀（技术结论） |
| [`docs/launch-runbook.md`](docs/launch-runbook.md) | 六端上线记录与运维手册 |
| [`AGENTS.md`](AGENTS.md) | 开发规范与 AI Agent 硬性规则 |

## ⚖️ License

[MIT](./LICENSE) —— 版权见 `LICENSE`（Copyright © 2026 baiwumm）。
