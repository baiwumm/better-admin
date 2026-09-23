# Better Admin — Vue 版

Better Admin 的 **Vue 纯前端 SPA 实现**：以 React 版为 UI / 交互 / 页面结构基准（Source of Truth）复刻，组件实现统一使用 **Nuxt UI v4**（唯一组件库，禁止替代库），通过 NestJS API 访问数据。

- 在线地址：<https://vue.baiwumm.com>（Cloudflare Workers Static Assets）
- 数据来源：全部经 **NestJS API**（本地开发需先启动 `apps/nest`，见 [`.env.example`](./.env.example) 的 `VITE_API_BASE_URL`），不直连数据库
- 组件与图表：Nuxt UI v4 + 项目级自定义组件；图表用 **Unovis**（`@unovis/vue` + `@unovis/ts`，精确锁版）
- 核心依赖：Vue 3.5 · Vite 8 · vue-router（unplugin-vue-router 文件式路由）· TanStack vue-query · Pinia · Tailwind CSS 4（Nuxt UI 内置）· TypeScript

## 功能范围

与 React 基准功能对齐（对齐状态见 [`docs/feature-matrix.md`](../../docs/feature-matrix.md)）：认证 · Dashboard 概览 · 用户 / 角色 / 权限 / 菜单 / 字典 / 日志管理 · 我的账户 · 组织中心全套 · 偏好设置 · 多标签页（KeepAlive）· 命令面板 · 全站国际化 · 路由过渡动画 · Playground 演示场。

布局硬约束：侧边栏 / 顶部栏 / 命令面板使用官方 Dashboard 套件（`UDashboardGroup` / `UDashboardPanel` 等），细则见 [`docs/nuxt-ui-guide.md`](../../docs/nuxt-ui-guide.md)。

## 常用命令

```bash
pnpm dev            # 开发
pnpm build          # 生产构建
pnpm type-check     # vue-tsc 类型检查
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm sync-locales   # 从 React 端同步语言包（predev / prebuild 自动执行）
```

## 部署

Cloudflare Workers（Static Assets）：`wrangler.jsonc` 的 `assets.directory=./dist` + `not_found_handling=single-page-application` 负责 SPA 深链回退。环境变量仅需前端公开前缀 `VITE_*`。
