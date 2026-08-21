# React（Better Admin）

> 本文档记录 Better Admin 的 React 版本（`/react`）的定位、技术栈、来源与当前状态。

---

## 1. 项目定位

**React 是 Better Admin 的 UI Source of Truth（UI 基准版本）。**

- 后续 Vue、Next.js、Nuxt 版本以 React 版本的页面结构、UI 组件、视觉、交互、响应式与 Dark Mode 行为作为参考基准。
- React 版本直接基于官方 **Shadcn Admin** 源码进行二次开发，当前阶段以「建立基础、稳定运行」为目标，不做大规模产品定制。
- React 是纯前端实现，**不直接连接数据库**；后续接入 NestJS API：

```text
Browser → React → NestJS API → PostgreSQL
```

---

## 2. 技术栈

> 版本以 `/react/package.json` 与实际安装结果为准（`pnpm list --depth 0` 核实，记录于 2026-08）。

| 类别 | 选型 | 实际版本 |
| --- | --- | --- |
| 语言 | TypeScript（strict，`tsc -b` 工程引用） | `~6.0.3` |
| UI 框架 | React | `19.2.5`（react / react-dom） |
| 构建工具 | Vite（含 `@vitejs/plugin-react`） | `8.0.8` / `6.0.1` |
| 样式 | Tailwind CSS（v4，CSS-first，`@tailwindcss/vite` 插件，无 `tailwind.config`） | `4.2.2` |
| UI 组件库 | shadcn/ui（new-york 风格，组件已复制到 `src/components/ui/`，基于 Radix UI） | `components.json` 配置 |
| 路由 | TanStack Router（文件式路由 `src/routes/`，自动生成 `src/routeTree.gen.ts`，路由插件 + Devtools） | `@tanstack/react-router 1.168.22` |
| 状态管理 | Zustand（全局 store，如 `src/stores/auth-store.ts`）；主题/字体/方向/布局/搜索使用 React Context | `zustand 5.0.12` |
| 数据请求 | TanStack Query + axios（当前仅演示 Mock 数据，未接真实后端） | `@tanstack/react-query 5.99.0` / `axios 1.15.0` |
| 表单 | react-hook-form + zod + hookform/resolvers | `7.72.1` / `4.3.6` / `5.2.2` |
| 表格 | TanStack Table（含可复用 DataTable：列头、过滤、排序、分页、批量操作、视图选项） | `@tanstack/react-table 8.21.3` |
| 图表 | Recharts | `3.8.1` |
| 图标 | lucide-react（+ 少量 Radix Icons、SVG 品牌图标） | `1.8.0` |
| Toast | sonner | `2.0.7` |
| 弹层原语 | Radix UI（alert-dialog、dialog、dropdown、popover、select、sheet、sidebar、tabs、tooltip 等 19 个包） | `@radix-ui/react-*` |
| 全局搜索 | cmdk | `1.1.1` |
| 日期/密钥等 | react-day-picker、input-otp、date-fns、react-top-loading-bar | 见 package.json |
| 认证（可选） | Clerk（模块化，仅存在于 `src/routes/clerk/`，无 Key 时优雅降级，不影响主应用；当前演示登录为前端 Mock） | `@clerk/react 6.4.3` |
| 代码规范 | ESLint（flat config，推荐 + typescript-eslint + react-hooks/refresh + tanstack query 插件） | `eslint 10.2.1` |
| 格式化 | Prettier（含 import 排序、tailwindcss 插件） | `prettier 3.8.3` |
| 测试 | Vitest（浏览器模式 + Playwright Chromium）+ faker | `vitest 4.1.4` / `playwright 1.59.1` |
| 包管理器 | pnpm（`pnpm-lock.yaml` 提交仓库，依赖锁定） | pnpm 10.33.0（实测） |
| 运行环境 | Node.js | v24.15.0（已验证） |

### shadcn/ui 使用方式

- shadcn/ui 组件以源码形式存在于 `src/components/ui/`（非运行时注册表），配置见 `components.json`（style: `new-york`，css: `src/styles/index.css`，baseColor: `slate`，别名 `@/*`）。
- 官方对部分组件做了 RTL 适配或二次修改（见官方 README 的 "Modified Components" / "RTL Updated Components"），更新组件时需注意手动合并。

### 路由

- 文件式路由：`src/routes/`。
  - `__root.tsx`：根布局（进度条、Toaster、Devtools）。
  - `(auth)/`：演示认证页（sign-in、sign-in-2、sign-up、otp、forgot-password）。
  - `_authenticated/`：认证态布局（Sidebar + Header 等）下的 Dashboard、Apps、Chats、Tasks、Users、Settings、Help Center、错误页。
  - `(errors)/`：401/403/404/500/503。
  - `clerk/`：可选的 Clerk 集成（无 Key 时显示引导提示）。
- 路由树由 `@tanstack/router-plugin` 自动生成到 `src/routeTree.gen.ts`，修改路由文件后由 Vite 插件自动重建。

### 状态管理

- **Zustand**：`src/stores/auth-store.ts`（演示登录态：Mock user + accessToken，cookie 持久化）。
- **React Context**：`src/context/*`（theme、font、direction、layout、search）。

### 数据请求

- TanStack Query（QueryClient 全局配置：retry、staleTime、401/403 处理）+ axios。
- 当前业务页面使用 `src/features/*/data/` 下的静态 Mock（tasks、users、chats 等），**未请求任何真实 API**。

### 主题 / Dark Mode

- 自定义 `ThemeProvider`（`src/context/theme-provider.tsx`），在 `<html>` 上切换 `light`/`dark` class，支持 `system`，cookie 持久化。
- Tailwind v4 通过 `@custom-variant dark` 实现 class 策略（`src/styles/index.css`）。

---

## 3. Shadcn Admin

| 项 | 内容 |
| --- | --- |
| 官方仓库 | <https://github.com/satnaing/shadcn-admin> |
| 官方 Demo | <https://shadcn-admin.netlify.app/> |
| 上游版本 | `2.2.1`（`package.json` `version` 字段），取自官方 `main` 分支快照 |
| 获取方式 | 通过 codeload 下载官方 `main` 分支 zip 快照整理到 `/react`；**未嵌套 `.git`**（Better Admin 主仓库保持为唯一的 Git 仓库） |
| 剔除内容 | 仅剔除仓库级 `.github/`（issue 模板、社区规范、针对上游仓库的 CI 工作流、FUNDING.yml）；应用代码、配置、文档、LICENSE 均保留 |
| 新增内容 | `pnpm-workspace.yaml`（pnpm 10+ 构建脚本策略，见下） |

### 二次开发原则

- **React 是 UI Source of Truth**：保持官方 Layout / Sidebar / Header / Navigation / Theme / Dark Mode / Responsive / shadcn/ui 组件 / Table / Form / Dialog / Drawer / Command / Chart / Hooks / Utils / 页面结构 / 交互逻辑。
- 不随意更换官方已选定的技术方案（路由、状态管理、表单、请求、图表等）。
- 逐步在现有架构上扩展，禁止凭记忆重建「类似 Shadcn Admin」的项目。

### 关于 pnpm 构建脚本（pnpm-workspace.yaml）

- pnpm 10+ 出于安全默认不执行依赖的构建脚本（`ERR_PNPM_IGNORED_BUILDS`）。
- 本仓库通过 `react/pnpm-workspace.yaml` 的 `allowBuilds` 显式声明 `esbuild`、`@clerk/shared` **不执行**脚本：
  - `esbuild` 的平台二进制已随 `@esbuild/win32-x64` 包提供，无需 postinstall（已实测 dev/build 正常）。
  - `@clerk/shared` 仅服务于可选的 Clerk 路由。
- 如需在本地运行这些脚本，可将对应值改为 `true` 或执行 `pnpm approve-builds`。

---

## 4. 项目目录

```text
react/
├── public/                    # 静态资源（favicon、图片）
├── src/
│   ├── assets/                # 品牌/自定义 SVG 图标、Logo
│   ├── components/
│   │   ├── ui/                # shadcn/ui 组件（Radix + tailwind）
│   │   ├── layout/            # 应用布局：AppSidebar、Header、Main、Nav 等
│   │   ├── data-table/        # 可复用 DataTable（列、过滤、分页、批量操作）
│   │   └── ...                # CommandMenu、Search、ThemeSwitch、Dialog 等通用组件
│   ├── config/                # 字体等配置
│   ├── context/               # Theme / Font / Direction / Layout / Search Provider
│   ├── features/              # 业务模块（apps/auth/chats/dashboard/errors/settings/tasks/users）
│   ├── hooks/                 # 自定义 Hooks（use-mobile、use-dialog-state、use-table-url-state）
│   ├── lib/                   # 工具（cn、cookies、handle-server-error、utils）
│   ├── routes/                # TanStack Router 文件式路由 + 页面
│   ├── stores/                # Zustand store（auth-store）
│   ├── styles/                # Tailwind v4 CSS（index.css、theme.css）
│   ├── test-utils/            # 测试工具
│   ├── main.tsx               # 应用入口（QueryClient + Providers + Router）
│   └── routeTree.gen.ts       # 自动生成的路由树（勿手改）
├── components.json            # shadcn/ui 配置
├── eslint.config.js
├── index.html
├── knip.config.ts
├── netlify.toml               # SPA 重定向配置（保留官方文件）
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        # pnpm 10+ 设置（allowBuilds）
├── tsconfig*.json
├── vite.config.ts             # TanStack Router 插件 + Tailwind v4 插件 + 别名 + Vitest
└── README.md / LICENSE / CHANGELOG.md  # 官方文件（保留）
```

---

## 5. 开发命令

```bash
cd react

pnpm install        # 安装依赖（exit 0，已实测）
pnpm dev            # 启动 Vite 开发服务器（默认 http://localhost:5173，已实测）
pnpm build          # 类型检查（tsc -b）+ 生产构建（vite build），已实测通过
pnpm lint           # ESLint 检查（已实测通过，无 error）
pnpm format:check   # Prettier 格式检查（已实测通过）
pnpm preview        # 预览生产构建
pnpm format         # Prettier 全量格式化
pnpm knip           # 未使用文件/依赖分析
pnpm test           # Vitest 浏览器测试（需先 pnpm test:browser:install 安装 Playwright Chromium）
```

> 说明：保留官方原有脚本名称；`test` 系列需要安装 Playwright 浏览器，当前阶段未执行。
> 环境变量：`/react/.env.example` 仅有公开配置 `VITE_CLERK_PUBLISHABLE_KEY`（可选 Clerk 用），当前无需创建 `.env`。

---

## 6. 当前状态

### 已完成

- [x] 基于官方 Shadcn Admin `main`（v2.2.1）建立 `/react`，无嵌套 `.git`。
- [x] 保留官方全部核心能力：Layout / Sidebar / Header / Navigation / Theme / Dark Mode / Responsive / shadcn/ui 组件 / DataTable / Form / Dialog / Drawer / Command / Chart / Hooks / Utils。
- [x] 保留官方 Demo 页面与 Mock 数据（Dashboard、Users、Tasks、Chats、Apps、Settings、演示登录等），用于验证 UI 与组件。
- [x] `pnpm install`、`pnpm dev`、`pnpm build`（含 `tsc -b` 类型检查）、`pnpm lint`、`pnpm format:check` 全部通过（详见验证记录）。

### 尚未完成

- [ ] 业务页面（用户/角色/权限/菜单/系统设置/日志等真实业务模块）。
- [ ] 接入 NestJS API（当前无任何真实 API 请求）。
- [ ] 接入数据库（无 DATABASE_URL / SUPABASE 等后端环境变量，无 Schema / ORM 代码）。
- [ ] 真实认证与 RBAC（当前仅有官方演示登录 Mock 与可选的 Clerk 路由）。

### 后端 / 数据库接入状态

- **当前未接入后端**：`Browser → React`（仅 Mock 数据）。
- **当前未接入数据库**：无任何数据库驱动、Schema 或连接配置。
- 按项目阶段规划，这两项在后续 Phase（NestJS、React + NestJS）中完成。
