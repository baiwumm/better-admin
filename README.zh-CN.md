<p align="center">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

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
  分别用 <strong>React、Vue、Next.js、Nuxt、NestJS</strong> 独立实现的开源全栈 Admin 系统（后台管理系统）。
</p>

<p align="center">
  <a href="https://better-admin.baiwumm.com"><img src="https://img.shields.io/badge/%E6%96%87%E6%A1%A3%E7%AB%99-%E5%9C%A8%E7%BA%BF-0A0A0A?style=flat-square" alt="官方文档站在线" /></a>
  <a href="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml"><img src="https://github.com/baiwumm/better-admin/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/github/package-json/v/baiwumm/better-admin?style=flat-square&label=%E7%89%88%E6%9C%AC" alt="当前版本" />
  <img src="https://img.shields.io/badge/%E5%85%AD%E7%AB%AF%E5%B7%B2%E4%B8%8A%E7%BA%BF-2026--09--23-2ea44f?style=flat-square" alt="六端已于 2026-09-23 上线" />
  <a href="docs/feature-matrix.md"><img src="https://img.shields.io/badge/%E5%8A%9F%E8%83%BD%E5%AF%B9%E9%BD%90-29%2F29-2ea44f?style=flat-square" alt="四端功能对齐 29/29" /></a>
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
  <img src="https://img.shields.io/badge/DB-PostgreSQL-111?style=flat-square&logo=postgresql&logoColor=336791&labelColor=111" alt="PostgreSQL（Supabase 托管）" />
</p>

<p align="center">
  📚 <a href="https://better-admin.baiwumm.com">在线文档站</a> ·
  🧩 <a href="docs/feature-matrix.md">功能矩阵</a> ·
  🤖 <a href="AGENTS.md">开发规范</a> ·
  📈 <a href="docs/progress.md">进度记录</a>
</p>

## 🎬 产品宣传片

<p align="center">
  <video src="https://github.com/user-attachments/assets/0b435f29-608a-406f-b586-b0a21b941825" width="90%" controls muted playsinline></video>
</p>

## ✨ 核心特性

- **五端同构**：同一套产品、UI、业务逻辑与数据库，分别用 React、Vue、Next.js、Nuxt 与 NestJS 独立实现、独立部署。
- **功能对齐 29/29**：四个前端的功能矩阵完全对齐，只保留两处有意的架构差异（[功能矩阵](docs/feature-matrix.md)）。
- **认证与权限**：JWT 双 Token 会话 + RBAC 位掩码，服务端强制校验 API 权限（[认证与权限](https://better-admin.baiwumm.com/docs/architecture/auth/)）。
- **契约优先**：OpenAPI 是 API Contract 唯一真源，五个应用共用同一份契约（[API 契约](https://better-admin.baiwumm.com/docs/architecture/api/)）。
- **统一数据层**：PostgreSQL + Drizzle ORM，17 张表跨端一致（[数据库设计](https://better-admin.baiwumm.com/docs/architecture/database/)）。
- **UI 一致性**：React 是 UI Source of Truth，Hero UI 与 Nuxt UI v4 两套组件库视觉与交互对齐（[UI 规范](https://better-admin.baiwumm.com/docs/design/ui/)）。

## 🌐 在线体验

线上即演示环境（只读演示模式）：登录页可一键「管理员 / 随机用户」快捷登录，写操作由只读守卫拦截并提示。

| 站点 | 地址 | 部署平台 |
| --- | --- | --- |
| 官方文档站 | <https://better-admin.baiwumm.com> | 腾讯云 EdgeOne Makers（静态导出） |
| React（UI 基准） | <https://react.baiwumm.com> | Vercel |
| Vue | <https://vue.baiwumm.com> | Vercel |
| Next.js | <https://next.baiwumm.com> | Vercel |
| Nuxt | <https://nuxt.baiwumm.com> | Vercel |
| NestJS API | <https://nest.baiwumm.com> | Render（UptimeRobot 保活） |

- API 文档（Swagger）：<https://nest.baiwumm.com/docs>
- API Contract 唯一真源：[`apps/nest/openapi/openapi.yaml`](apps/nest/openapi/openapi.yaml)
- 数据库：统一 PostgreSQL（Supabase 托管，仅作数据库 + 头像 Storage）+ Drizzle ORM

## 📖 在线文档

| 文档 | 内容 |
| --- | --- |
| [项目概览](https://better-admin.baiwumm.com/docs/) | 五个应用的分工、数据流与架构约定 |
| [快速开始](https://better-admin.baiwumm.com/docs/start/quick-start/) | 五端本地启动：依赖、环境变量、数据库初始化 |
| [API 契约](https://better-admin.baiwumm.com/docs/architecture/api/) | 统一响应信封、分页参数与错误码规范 |
| [认证与权限](https://better-admin.baiwumm.com/docs/architecture/auth/) | JWT 双 Token 与 RBAC 位掩码校验链路 |
| [数据库设计](https://better-admin.baiwumm.com/docs/architecture/database/) | 17 张表分域、关键字段与权限位存储 |
| [UI 规范](https://better-admin.baiwumm.com/docs/design/ui/) | Design Tokens、组件优先级与视觉一致规则 |
| [React 实现](https://better-admin.baiwumm.com/docs/frontends/react/) | UI 基准版本的技术栈、目录结构与数据流 |
| [Vue 实现](https://better-admin.baiwumm.com/docs/frontends/vue/) | 用 Nuxt UI v4 复刻 React 基准 |
| [Next.js 实现](https://better-admin.baiwumm.com/docs/frontends/next/) | App Router 独立全栈实现 |
| [Nuxt 实现](https://better-admin.baiwumm.com/docs/frontends/nuxt/) | Nitro 独立全栈实现 |

## 🤖 用 AI 查阅代码

本仓库已被 [XERJ Corpus Hub](https://hub.xerj.org/contributors/baiwumm) 收录为面向 AI Agent 的可检索语料库。把仓库交给 AI 编程助手后，可以直接问「某个功能在哪实现、怎么实现」，回答会带文件与行号引用，而不是靠模型记忆猜测。

- 文档站 AI 入口：[`llms.txt`](https://better-admin.baiwumm.com/llms.txt)

## 🧱 技术栈

| 端 | 目录 | 技术栈 | 组件库 |
| --- | --- | --- | --- |
| React | [`apps/react`](apps/react) | React 19 + Vite 8 + TanStack Router/Query + Zustand | Hero UI v3 |
| Vue | [`apps/vue`](apps/vue) | Vue 3.5 + Vite 8 + Pinia + vue-query | Nuxt UI v4（唯一） |
| Next.js | [`apps/next`](apps/next) | Next 16 App Router（独立全栈，不依赖 NestJS） | Hero UI v3 |
| Nuxt | [`apps/nuxt`](apps/nuxt) | Nuxt 4 + Nitro（独立全栈，不依赖 NestJS） | Nuxt UI v4（唯一） |
| NestJS | [`apps/nest`](apps/nest) | Nest 11 + Drizzle ORM + PostgreSQL | — |
| 文档站 | [`apps/website`](apps/website) | Next 16 静态导出；`/` 首页为 beUI 风格自绘组件，`/docs` 用 fumadocs | fumadocs-ui（/docs）+ 自绘首页组件 |

React 是 **UI Source of Truth**；四个前端页面结构、交互、视觉与 Design Tokens 保持一致（细则见 [`docs/ui-spec.md`](docs/ui-spec.md)）。

## 📁 项目结构

```text
better-admin/
├── apps/          # 全部可独立运行 / 构建 / 部署的应用（见上表）
├── docs/          # 项目文档（需求真源 / UI 规范 / 进度 / 机制沉淀）
├── assets/logo/   # 跨端共享的品牌资产真源
├── scripts/       # 仓库级脚本（sync-versions 版本同步）
├── package.json   # 产品版本唯一真源（发布流程见 AGENTS.md §15）
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

## 📚 仓库文档

| 文档 | 内容 |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | 开发规范与 AI Agent 硬性规则（**全部文档索引见其 §13**） |
| [`docs/requirements.md`](docs/requirements.md) | 业务需求真源 |
| [`docs/feature-matrix.md`](docs/feature-matrix.md) | 四端功能对齐状态 |
| [`docs/launch-runbook.md`](docs/launch-runbook.md) | 部署 / 冒烟 / 回滚运维手册 |

## ❓ 常见问题

**Better Admin 是什么？**
一套开源的全栈 Admin 系统（后台管理系统）：同一套产品、UI、业务逻辑与数据库，分别用 React、Vue、Next.js、Nuxt 与 NestJS 实现。

**为什么要用五种技术栈重复实现？**
为了横向对照同一产品在不同技术栈下的完整落地路径，沉淀可参考的实现范例；各应用独立运行、构建与部署，不产生技术栈耦合。

**五个版本共用数据库吗？**
是。统一使用 PostgreSQL + Drizzle ORM，Schema、数据模型、业务规则、数据类型与 API Contract 五项跨栈一致。

**可以商用或二次开发吗？**
可以，项目采用 MIT License；保留版权声明即可，欢迎通过 Issue / PR 参与。

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request。开发前请先阅读 [`AGENTS.md`](AGENTS.md) 的硬性规则；新增功能或改变功能状态时，同步更新 [`docs/feature-matrix.md`](docs/feature-matrix.md)。

## ⚖️ License

[MIT](./LICENSE) —— 版权见 `LICENSE`（Copyright © 2026 baiwumm）。
