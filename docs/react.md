# React（Better Admin）

> 本文档记录 Better Admin 的 React 版本（`/react`）的定位、技术栈、来源与当前状态。

---

## 1. 项目定位

**React 是 Better Admin 的 UI Source of Truth（UI 基准版本）。**

- 后续 Vue、Next.js、Nuxt 版本以 React 版本的页面结构、UI 组件、视觉、交互、响应式与 Dark Mode 行为作为参考基准。
- **`/react` 基于 Hero UI 模板实现，不含 Shadcn UI 组件**，新增功能一律使用 Hero UI。
- **UI 组件库策略**：React（含 Next.js）以 **Hero UI 为主、Shadcn UI 为补充**（优先级：Hero UI > Shadcn UI > 项目级自定义）；样式变量以 Hero UI 设计体系为主要参考（详见 `AGENTS.md` §7.2 / `ui-spec.md` §18.3）。
- React 是纯前端实现，**不直接连接数据库**，通过 NestJS API 访问数据：

```text
Browser → React → NestJS API → PostgreSQL
```

---

## 2. 技术栈

> 版本以 `/react/package.json` 为准（记录于 2026-08-30）。

| 类别 | 选型 | 版本 |
| --- | --- | --- |
| 语言 | TypeScript（strict） | `5.6.3` |
| UI 框架 | React | `^19.0.0` |
| 构建工具 | Vite（含 `@vitejs/plugin-react`） | `8.0.16` |
| 样式 | Tailwind CSS（v4，CSS-first，`@tailwindcss/vite` 插件，无 `tailwind.config`） | `4.3.1` |
| 字体 | 默认 **Maple Mono CN**（`index.html` 内联声明）+ system 回退 | — |
| UI 组件库 | **Hero UI**（`@heroui/react` + `@heroui/styles`）；**当前无任何 shadcn / radix 组件**，Shadcn UI 仅为策略上的补充选项（按需引入） | `3.2.4` |
| 路由 | TanStack Router（文件式路由 `src/routes/`，自动生成 `src/routeTree.gen.ts`） | `1.168.22` |
| 状态管理 | Zustand（全局 store，如 `src/stores/auth-store.ts`） | `5.0.12` |
| 数据请求 | TanStack Query + axios（统一走 `src/lib/api-client.ts` 请求 NestJS REST API） | `5.99.0` / `1.15.0` |
| 表单 | react-hook-form + zod + `@hookform/resolvers` | `7.86.0` / `4.4.3` |
| 表格 | TanStack Table（可复用 DataTable：列头、过滤、排序、分页） | `^9.2.3` |
| 拖拽 | dnd-kit（core / modifiers / sortable / util） | `^6.3.1` 等 |
| 国际化 | i18next + react-i18next（自建实例，非默认单例） | `26.4.0` / `17.0.12` |
| 图标 | lucide-react | `^1.33.0` |
| 代码规范 | ESLint（flat config）+ Prettier | `9.25.1` / `3.5.3` |
| 测试 | Vitest | `4.1.11` |
| 包管理器 | pnpm（`pnpm-lock.yaml` 提交仓库，依赖锁定） | pnpm 10 |

### 路由

- 文件式路由：`src/routes/`，路由树由 `@tanstack/router-plugin` 自动生成到 `src/routeTree.gen.ts`，修改路由文件后由 Vite 插件自动重建。
- 目录约定、路由表、登录鉴权与路由-菜单契约详见 [`routing.md`](routing.md)（现状以其为准）。

### 状态管理

- **Zustand**：`src/stores/auth-store.ts`（登录态 + accessToken/refreshToken + 用户权限位；「记住我」决定 refreshToken 是否持久化）。
- **React Context**：`src/context/*`（theme 等 HeroUI/react-aria 运行时上下文）。

### 数据请求

- TanStack Query：全局单例 QueryClient（`src/lib/query-client.ts`：retry 1、staleTime 1 分钟、`refetchOnWindowFocus: false`）；请求统一走 `src/lib/api-client.ts` 的 `fetchApi`（NestJS REST API）。
- 菜单树（`["menus"]`）登录成功后 prefetch，供路由 beforeLoad 同步判权；权限点枚举（`["permissions"]`）懒加载、staleTime 5 分钟、全项目共享缓存，均无持久化。
- 请求与缓存机制（含保活与菜单可见性）详见 `docs/mechanisms.md`。

### 主题 / Dark Mode

- 自定义 `ThemeProvider`（`src/context/theme-provider.tsx`），在 `<html>` 上切换 `light`/`dark` class，支持 `system`，cookie 持久化。
- Tailwind v4 通过 `@custom-variant dark` 实现 class 策略（`src/styles/index.css`）。

### 关于 pnpm 构建脚本（pnpm-workspace.yaml）

- pnpm 10+ 出于安全默认不执行依赖的构建脚本（`ERR_PNPM_IGNORED_BUILDS`）。
- 本仓库通过 `react/pnpm-workspace.yaml` 的 `allowBuilds` 显式声明 `esbuild` **不执行**脚本：
  - `esbuild` 的平台二进制已随对应平台包提供，无需 postinstall（已实测 dev/build 正常）。
- 如需在本地运行这些脚本，可将对应值改为 `true` 或执行 `pnpm approve-builds`。

---

## 3. 项目目录

```text
react/
├── public/                    # 静态资源（favicon、图片、字体）
├── src/
│   ├── components/            # 项目级可复用组件
│   │   ├── ui/                # shadcn/ui 基础组件（按需创建，当前无 Shadcn 组件）
│   │   ├── common/            # 项目通用组件（按需创建，跨业务复用）
│   │   │   └── error-pages/   # 全屏错误页（ErrorPageShell + 403/404/500）
│   │   └── business/          # 业务组件（按需创建，特定业务域专用）
│   ├── layouts/               # 应用布局（AdminLayout + 布局子组件）
│   │   ├── components/        # 布局专属子组件（app-sidebar、sidebar-menu 等）
│   │   └── admin-layout.tsx   # 双栏布局 + 权限门卫
│   ├── hooks/                 # 自定义 Hooks（use-menus）
│   ├── lib/                   # 工具（api-client、menu-utils、menu-fetch、permission 等）
│   ├── routes/                # TanStack Router 文件式路由 + 页面
│   ├── stores/                # Zustand store（auth-store）
│   ├── styles/                # Tailwind v4 CSS（globals.css、theme.css）
│   ├── provider.tsx           # Provider 壳
│   ├── main.tsx               # 应用入口
│   └── routeTree.gen.ts       # 自动生成的路由树（勿手改）
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
└── README.md / LICENSE
```

### 组件分层规范

`src/components/` 按职责分为三层，**按需创建，不提前建立空目录**：

| 层级 | 目录 | 职责 | 示例 |
|---|---|---|---|
| **UI 层** | `components/ui/` | 纯 UI 基础组件（shadcn/ui 源码组件，如 button、dialog、input、select） | `button.tsx`、`dialog.tsx` |
| **通用层** | `components/common/` | 项目级可复用组件，跨业务模块共享（Shell、Loading、EmptyState、ConfirmDialog 等） | `error-pages/`、`PageHeader/` |
| **业务层** | `components/business/` | 特定业务域专用组件，仅在某模块内复用（UserTable、UserForm、DashboardCard 等） | `UserTable/`、`UserForm/` |

**命名规则（遵循 AGENTS.md §14）**：
- 目录：kebab-case（`error-pages/`、`page-header/`）
- 组件文件：kebab-case（`error-page-shell.tsx`）
- 组件导出：PascalCase（`ErrorPageShell`）
- barrel export：`components/common/index.ts`（按需添加，避免 barrel import 影响 tree-shaking）

**布局组件**保留在 `layouts/components/`（`app-header`、`app-sidebar`、`sidebar-menu` 等），不归入 `components/` 三层体系——它们是布局专属，不是跨模块通用组件。

---

## 4. 开发命令

```bash
cd react

pnpm install        # 安装依赖
pnpm dev            # 启动 Vite 开发服务器（默认 http://localhost:5173）
pnpm build          # 类型检查（tsc）+ 生产构建（vite build）
pnpm lint           # ESLint 检查（--fix）
pnpm test           # Vitest 测试
pnpm preview        # 预览生产构建
```

> 环境变量：`/react/.env.example` 为参考模板（前端可见变量带 `VITE_` 前缀）；真实密钥不入仓库（见 AGENTS.md §9）。

---

## 5. 当前状态

### 已完成

- [x] 基于 Hero UI 初始化模板建立 `/react`，作为 UI 迁移目标版本（UI Source of Truth）。
- [x] Hero UI 为主组件库，布局（双栏 Sidebar + Header）、主题（Dark Mode / Light Mode）、响应式已就绪。
- [x] Phase 3 联调：真实登录/退出（AlertDialog + useOverlayState）、后端菜单联调、双 Token 刷新、菜单路由权限门卫。
- [x] 布局级权限门卫：未登录拦截、白名单放行、菜单未就绪全屏 Spinner、无权限渲染 403。
- [x] TanStack Router 文件式路由 + QueryClient + Zustand auth-store（含 persist）。
- [x] 角色管理 / 菜单管理 / 字典管理 / 权限管理页已上线，全站国际化（zh-CN / en）完成（进度详见 `docs/progress.md`）。
- [x] 组件分层：`components/common/`（错误页等通用组件）、`layouts/components/`（布局子组件），按需扩展 `ui/`、`business/`。
- [x] `pnpm install`、`pnpm dev`、`pnpm build`（含 `tsc`）、`pnpm lint`、`pnpm test` 全部通过。

### 尚未完成

- [ ] 用户管理（当前 `users-page.tsx` 为 keepAlive 演示 Mock 页，接入真实 API 时替换）。
- [ ] 日志管理、概览 Dashboard。

### 后端 / 数据库接入状态

- **已接入 NestJS API**（`Browser → React → NestJS`）：认证、菜单、角色、权限、字典等模块走真实接口。
- **不直接连接数据库**（项目约束，见 AGENTS.md §5）。
