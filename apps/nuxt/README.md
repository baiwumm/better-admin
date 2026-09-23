# Better Admin — Nuxt 版

Better Admin 的 **Nuxt 独立全栈实现**（不依赖 NestJS）：以 React 版为 UI 基准、Vue 版为组件实现蓝本、Next 版为服务端蓝本，服务端业务逻辑自 NestJS 逐字平移。

- 在线地址：<https://nuxt.baiwumm.com>（Vercel，Nitro node preset）
- 服务端：`server/api/**` 76 个方法文件 + `server/lib/**` 业务 service，直连 PostgreSQL（postgres.js），对齐 [`openapi.yaml`](../nest/openapi/openapi.yaml) 契约（除保活专用 `GET /health` 外全覆盖）；**迁移真源在 `nest/drizzle/`，本端不生成 / 不执行迁移**
- UI 组件：**Nuxt UI v4**（唯一组件库）+ 官方 Dashboard 套件；图表用 **nuxt-charts**（底层 vccs，Recharts 的 Vue 移植）
- 核心依赖：Nuxt 4 · Nitro · TanStack vue-query · Pinia · Tailwind CSS 4 · TypeScript

## 功能范围

与 React 基准功能对齐 29/29（对齐状态见 [`docs/feature-matrix.md`](../../docs/feature-matrix.md)）：认证 · Dashboard 概览 · 用户 / 角色 / 权限 / 菜单 / 字典 / 日志管理 · 我的账户 · 组织中心全套 · 偏好设置 · 多标签页（NuxtPage 内置 keepalive）· 命令面板 · 全站国际化 · 路由过渡动画 · Playground 演示场。

## 常用命令

```bash
pnpm dev            # 开发
pnpm build          # 生产构建
pnpm typecheck      # 类型检查
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm check-locales  # 语言包一致性检查（CI 强制）
pnpm sync-locales   # 从 React 端同步语言包（predev / pretest 自动执行）
pnpm contract-diff  # 与 Nest 服务的契约冒烟对比（需 Nest 在线；上线验收工具）
```

## 环境变量

见 [`.env.example`](./.env.example)：`DATABASE_URL`、`JWT_SECRET` / `JWT_REFRESH_SECRET`、`SUPABASE_URL` / `SUPABASE_SECRET_KEY`（头像 Storage 中转）、`DEMO_MODE`、`NUXT_PUBLIC_*`。密钥仅存在于服务端环境变量，严禁提交。

## 部署

Vercel（Root Directory 指向 `nuxt/`，Nitro node preset——postgres.js TCP 直连不支持 Workers 运行时）：环境变量在 Vercel 项目配置，迁移不在部署时执行。
