# AGENTS.md — Better Admin 项目开发指南

> 本文件用于指导后续 AI Agent 与开发者进行整个 Better Admin 项目的开发。
> 在开始任何业务开发之前，请务必完整阅读本文档与 [`docs/requirements.md`](docs/requirements.md)。

---

## 1. 项目简介

Better Admin 是一个基于统一设计与业务逻辑，使用 **React、Vue、Next.js、Nuxt、NestJS** 等现代 Web 技术栈分别实现的全栈 Admin 系统。

它的核心目标不是做多套不同的后台，而是：

> **同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用不同技术栈完成实现。**

通过同一个实际项目，对比和实践不同技术栈下的工程实践（Full-stack、UI 一致性、API 设计、认证、RBAC、部署等）。

---

## 2. 项目目标

- 完成一套完整、可实际使用的 Admin 基础系统（用户 / 角色 / 权限 / 菜单 / Dashboard / 系统设置 / 日志）。
- 提供四种前端实现：**React、Vue、Next.js、Nuxt**。
- 提供独立后端服务 **NestJS**，为 React 与 Vue 提供 API。
- 所有版本共用**同一个 PostgreSQL 数据库**（Supabase 托管）。
- 保持 UI、业务逻辑、数据结构与 API Contract 在各技术栈间**尽可能一致**。

### 技术栈定位

| 技术栈 | 定位 | 后端方式 |
| --- | --- | --- |
| React | 前端（UI 基准） | NestJS API |
| Vue | 前端 | NestJS API |
| Next.js | 全栈 | Next.js Server |
| Nuxt | 全栈 | Nuxt Server / Nitro |
| NestJS | 后端 API | PostgreSQL |

---

## 3. 项目结构与多应用管理

本项目采用 **单仓库、多独立应用** 的项目结构。

- **单仓库**：所有技术栈实现集中在同一个仓库 `better-admin/` 中统一管理。
- **多独立应用**：`react/`、`vue/`、`next/`、`nuxt/`、`nest/` 是相互独立的应用程序。

```text
better-admin/
├── next/                    # Next.js 全栈实现
├── nuxt/                    # Nuxt 全栈实现
├── react/                   # React（UI 基准；Hero UI 为主 + Shadcn UI 补充）
├── vue/                     # Vue + Shadcn UI
├── nest/                    # NestJS 后端 API
├── docs/                    # 项目文档
├── README.md
└── AGENTS.md
```

**独立性原则**：

- 每个应用应当能够**独立运行、独立构建、独立部署**（例如 `cd react && pnpm dev`）。
- **不强制**技术栈之间共享依赖。
- **不因为使用 Workspace 而产生技术栈耦合**：若后续引入 pnpm workspace，仅作为工程效率工具，不应改变各应用的独立性。

---

## 4. 各技术栈职责

### 4.1 React（UI 基准版本）

- 目录：`/react`
- 技术栈：React + Tailwind CSS + TypeScript；UI 组件库 **Hero UI 为主 + Shadcn UI 补充**（§7.2）
- 职责：以 **Hero UI 初始化模板为基础，渐进式迁移 `/react-shadcn`（原 Shadcn Admin 源码）的功能与页面**，是整套产品的 **UI Source of Truth**（页面结构 / UI 设计 / 交互 / UX / Design Tokens / 组件行为）。
- 数据流：`Browser → React → NestJS API → PostgreSQL`（不直接连接数据库）。

### 4.6 React 迁移策略（`/react` 与 `/react-shadcn` 的关系）

#### 背景说明

- `/react-shadcn`：原 Shadcn Admin 实现（基于官方 Shadcn Admin v2.2.1 二次开发），是**旧实现**，沉淀了 Better Admin 已有的 Layout、页面、组件与业务能力。
- `/react`：以 **Hero UI 初始化模板**创建的新目录，是 **UI 迁移的目标版本**，作为新的 UI 基准（UI Source of Truth）。
- 两者关系：`/react-shadcn` 是迁移的**源**，`/react` 是迁移的**目标**；迁移过程是**渐进式**地把 `/react-shadcn` 的功能与页面搬到 `/react`，而非一次性替换。

#### 迁移原则

1. **渐进式**：不一次性迁移全部模块，按模块逐个推进，每完成一个模块即保持 `/react` 可运行。
2. **功能等同**：迁移后的 `/react` 模块在功能、数据展示、交互上须与 `/react-shadcn` 对应模块保持一致，不丢失业务能力。
3. **组件映射**：优先使用 Hero UI 组件对应 `/react-shadcn` 中的 Shadcn UI 组件（遵循 §7.2 组件优先级）；无对应 Hero UI 组件时按策略补充 Shadcn UI 或自定义组件。
4. **保持可运行**：每次迁移提交后 `/react` 必须保持可构建、可运行，不留下半成品或破坏现有页面。
5. **阶段性提交**：每个模块迁移以独立、清晰的提交完成，便于 review 与回滚。
6. **参考源只读**：`/react-shadcn` 仅作为**只读参考源**，供阅读与比对，迁移过程中**不得修改** `/react-shadcn` 代码（见 §18 第 13 条）。

#### 迁移进度表

| 模块 | 对应 `/react-shadcn` 源 | 状态 |
| --- | --- | --- |
| Layout | `layout/` 相关 | 🔲 待迁移 |
| Dashboard | `dashboard/` / 概览 | 🔲 待迁移 |
| 用户管理 | `users/` | 🔲 待迁移 |
| 角色管理 | `roles/` | 🔲 待迁移 |
| 权限管理 | `permissions/` | 🔲 待迁移 |
| 菜单管理 | `menus/` | 🔲 待迁移 |
| 系统设置 | `settings/` | 🔲 待迁移 |
| 日志管理 | `logs/` | 🔲 待迁移 |
| 认证 | `auth/` / 登录登出 | 🔲 待迁移 |

### 4.2 Vue

- 目录：`/vue`
- 技术栈：Vue + **Shadcn UI**（shadcn-vue）+ TypeScript
- 职责：尽可能还原 React 版本的页面结构、UI 设计、组件、交互、数据展示与用户体验；UI 组件库保持 **Shadcn UI 为主**，暂不切换 Hero UI（§7.2）。
- 数据流：`Browser → Vue → NestJS API → PostgreSQL`（不直接连接数据库）。

### 4.3 Next.js（全栈）

- 目录：`/next`
- 技术栈：Next.js App Router / Server Components 等全栈能力 + TypeScript；UI 组件库 **Hero UI 为主 + Shadcn UI 补充**（§7.2）
- 职责：独立实现页面、UI、API、服务端逻辑、数据库访问、用户认证与权限控制，**不依赖 NestJS**。
- 数据流：`Browser → Next.js → PostgreSQL`。

### 4.4 Nuxt（全栈）

- 目录：`/nuxt`
- 技术栈：Nuxt 3 + Nitro Server + TypeScript；UI 组件库保持 **Shadcn UI 为主**（§7.2）
- 职责：独立实现页面、UI、API / Server API、服务端业务逻辑、数据库访问、用户认证与权限控制，**不依赖 NestJS**。
- 数据流：`Browser → Nuxt → PostgreSQL`。

### 4.5 NestJS（后端 API）

- 目录：`/nest`
- 技术栈：NestJS + PostgreSQL + Drizzle ORM + TypeScript
- 职责：独立的 REST API 服务，主要为 **React 和 Vue** 提供后端能力。
- 覆盖：REST API、用户认证、用户/角色/权限/菜单管理、系统配置、日志、数据库访问、业务逻辑。
- 数据流：`React / Vue → NestJS → PostgreSQL`。

---

## 5. 数据库架构

- **统一使用 PostgreSQL**，由 **Supabase** 提供数据库托管。
- Supabase 仅作为 **PostgreSQL 托管平台**：**不使用** Supabase Auth、RLS（Row Level Security）、Edge Functions、Storage。
- 数据库按照普通 PostgreSQL 使用，数据库连接由**服务端**负责。

### 数据库访问原则

- **浏览器端禁止直接访问 PostgreSQL。**
- 数据库连接信息**只允许存在于服务端环境变量**中，严禁写入前端代码或提交到仓库。
- 各后端（NestJS / Next.js / Nuxt）统一通过服务端访问数据库。

### ORM

- **Drizzle ORM 是项目默认 ORM。** Next.js、Nuxt、NestJS 默认使用 Drizzle ORM。
- 如果某个技术栈存在**明确的技术原因**导致 Drizzle 不适合使用，可以提出说明后评估调整；**禁止仅仅因为个人偏好而更换 ORM**。
- 无论 ORM 是否完全一致，都必须保证：
  - **PostgreSQL Schema 一致**（同一套 Schema）
  - **数据模型一致**
  - **业务规则一致**
  - **数据类型一致**
  - **API Contract 一致**
- 不要为了 ORM 的实现方式破坏整体架构一致性；禁止不同技术栈维护完全不同的数据库结构。

---

## 6. API 架构

- React 与 Vue 使用 **NestJS** 提供的 REST API；Next.js 与 Nuxt 各自实现 Server API。
- API 采用统一 **RESTful** 设计。示例（用户模块）：

```http
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### API 返回结构（统一规范）

成功响应：

```json
{ "data": {} }
```

列表响应：

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 100 }
}
```

错误响应：

```json
{ "code": "USER_NOT_FOUND", "message": "用户不存在" }
```

### API Contract

- **OpenAPI 是 Better Admin 项目的 API Contract 唯一事实来源（Single Source of Truth）。**
- 要求：
  1. API 设计**优先定义 Contract，再进行实现**。
  2. **NestJS API 必须遵循 OpenAPI Contract。**
  3. **Next.js Server API 必须遵循相同 Contract。**
  4. **Nuxt Server API 必须遵循相同 Contract。**
  5. **React / Vue 前端请求必须遵循 Contract。**
  6. API 请求参数、响应结构、错误结构、分页结构、字段命名必须保持一致。
  7. **不允许某个技术栈为了实现方便而自行修改 API Contract。**
- 如果修改 API Contract，必须**同步评估 React、Vue、Next.js、Nuxt、NestJS** 受到的影响，确认后再执行。

---

## 7. UI 一致性要求

### 7.1 UI Source of Truth 与设计基准

- **React 是 Better Admin 的 UI Source of Truth**：页面结构、UI 设计、交互、UX、Design Tokens、组件行为均以 React 版本为基准。React 保持 Source of Truth **并不意味着 React 必须全部使用 Shadcn UI**。
- React 版本基于官方 **Shadcn Admin** v2.2.1 源码二次开发，作为产品与工程起点；**UI 组件库策略独立定义**（见 §7.2）。
- Vue、Next.js、Nuxt 版本按 React 版本实现，保持页面、组件行为、视觉与交互一致。

### 7.2 UI 组件库策略（核心规则）

```text
Better Admin UI Strategy

React:
Hero UI 为主要 UI 组件库
Shadcn UI 为补充

Next.js:
Hero UI 为主要 UI 组件库
Shadcn UI 为补充

Vue:
Shadcn UI 为主要 UI 组件库

Nuxt.js:
Shadcn UI 为主要 UI 组件库

React / Next.js 组件优先级：

Hero UI
  >
Shadcn UI
  >
Custom Component

React / Next.js 样式变量：

Hero UI Design System
  ↓
Project Design Tokens
  ↓
Hero UI + Shadcn UI + Custom Components

Vue / Nuxt：
当前保持 Shadcn UI
未来是否切换 Hero UI，另行评估。

整个项目：
React 仍然是 UI / UX Source of Truth。
不同技术栈可以使用不同 UI 组件库，但最终页面必须保持统一的视觉、交互、结构和用户体验。
```

**组件选择规则（React / Next.js）**：

1. 先检查项目现有组件（`components/`、`components/ui/`、`features/`），不重复创建已存在组件。
2. Hero UI 已提供满足需求的组件 → **优先使用**（Button / Input / Textarea / Select / Autocomplete / Dropdown / Modal / Drawer / Tabs / Card / Tooltip / Popover / Avatar / Badge / Chip / Switch / Checkbox / Radio / Progress / Spinner / Pagination / Navbar / DatePicker / DateRangePicker / Table 等）。
3. Hero UI 没有对应组件、或无法满足/不适合当前场景 → 使用 **Shadcn UI**（Command、复杂 Form 组合、Sidebar、DataTable 相关、特殊 Sheet / Drawer、或项目已高度定制并稳定使用的组件）。不要为了使用 Shadcn UI 而主动寻找 Shadcn 方案。
4. 两者都无法满足 → **项目级自定义组件**（遵循现有 Design Tokens，禁止随意新增颜色 / 圆角 / 阴影 / 字体 / 间距）。

**禁止事项**：

- 禁止同一种基础组件在不同页面随意混用不同组件库（如 A 页 Shadcn Button、B 页 Hero Button、C 页自定义 Button），除非存在被项目规范认可的明确技术原因。
- 禁止因为熟悉 Shadcn UI 就默认所有组件使用 Shadcn UI；禁止为了「全部 Hero UI 化」强行重写存量 Shadcn UI。
- 禁止未经确认进行大规模 UI 重构 / 一次性迁移。
- **浮层开合状态必须用 `useOverlayState`（禁止裸 `useState` 布尔量控制）**：React / Next.js 中所有由布尔值控制的浮层（Modal / AlertDialog / Drawer / Popover / 任意 Overlay 等），其 open 状态**统一使用 Hero UI 导出的 `useOverlayState()` hook 管理**，并严格遵循官方受控写法——`isOpen` / `onOpenChange` 挂在浮层的最外层 Overlay 组件（如 `<AlertDialog.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>`）上，触发用 `state.open()` / `state.close()` / `state.toggle()`。禁止自行用 `useState(true/false)` 把 `isOpen` 挂在 Root/Trigger 上（会导致 react-aria 受控流不匹配、弹窗不显示或控制台报错）。开放状态即「with useOverlayState」，关闭即「禁止裸 useState 布尔量」。

**渐进式调整（不是一次性重构）**：

- 现有成熟能力（Layout / Sidebar / Header / Navigation / Theme / Dark Mode / Responsive / DataTable / Form / Dialog / Drawer / Command / Chart / Hooks / Utils / 页面结构 / 交互逻辑）**继续保留**，不机械迁移。
- 新增功能优先使用 Hero UI；修改已有组件时按实际收益决定是否迁移。
- 不破坏现有页面结构、交互逻辑与业务逻辑；不破坏 DataTable、Form 等成熟基础设施；**业务能力优先于组件库替换**。

### 7.3 样式变量 / Design Tokens 规则

- React / Next.js 的样式变量、设计 Token、主题变量以 **Hero UI 设计体系为主要参考**，形成**一套项目级 Design Tokens**；**禁止并行维护两套互相独立的设计变量**。
- 需重点统一：主色、次要颜色、Background / Foreground、Content、Border / Divider、Focus / Hover / Active / Disabled、Radius、Typography（Font Size / Font Weight）、Spacing、Shadow、Transition、Dark Mode / Light Mode。
- Shadcn UI 复用这套项目级变量进行适配，与 Hero UI 共用同一视觉体系（圆角、边框、颜色、字体、阴影、间距、Focus / Hover / Disabled、Dark Mode、动画），最终产品不允许出现两套截然不同的组件视觉。

### 7.4 UI 一致性要求

- 四个前端版本需尽可能保持一致的：
  - **页面**：Dashboard、用户管理、角色管理、权限管理、菜单管理、系统设置、日志、其他业务页面。
  - **UI 组件**：Sidebar、Header、Breadcrumb、Table、Form、Dialog、Drawer、Dropdown、Command、Tabs、Card、Button、Input、Select、Date Picker、Toast、Pagination、Empty / Loading / Error State。
  - **视觉**：色彩体系、字体体系、间距、圆角、阴影、图标风格、Dark Mode、Responsive 行为保持一致。

---

## 8. 认证与权限要求

- 项目**不使用 Supabase Auth**，认证体系由应用自身实现。
- 四个版本需保持基本一致的：登录、登出、Session、用户身份、角色、权限、路由权限、API 权限。
- 权限模型建议采用 **RBAC**：用户 ↔ 角色 ↔ 权限（权限点），并支持菜单与权限的关联控制。
- 服务端必须对 API 做权限校验（授权），不能只依赖前端路由守卫。

---

## 9. 环境变量管理规范

- 每个子项目维护各自的 `.env.local` / `.env`，并提供 `.env.example` 作为参考，提交到仓库。
- **真实密钥（数据库连接串、JWT 密钥、OAuth Secret 等）严禁提交到仓库**，只存在于本地或部署平台的环境变量中。
- 数据库连接信息只存在于**服务端**环境变量，禁止暴露给浏览器端。
- 变量命名使用大写下划线（`DATABASE_URL`、`JWT_SECRET`、`NEXT_PUBLIC_*` / `NUXT_PUBLIC_*` / `VITE_*` 等）。前端可见的变量必须显式带有公开前缀。

---

## 10. Git 提交规范

- 使用 **Conventional Commits** 规范：

```text
feat: 新增功能
fix: 修复 bug
docs: 仅文档变更
style: 不影响代码含义的格式调整
refactor: 重构（不新增功能也不修 bug）
perf: 性能优化
test: 补/改测试
chore: 构建、工具、依赖等杂项
build: 影响构建系统或外部依赖的变更
ci: CI 配置变更
```

- 提交信息建议用中文描述，格式：`<type>: <简短描述>`，例如 `feat: 用户管理新增分页功能`。
- 提交前保持代码可构建、测试通过；避免混入无关改动。

---

## 11. 代码规范

- 统一 **Prettier** 格式化，遵循各子项目既定配置。
- 使用 **ESLint** 进行静态检查，提交前确保无 error。
- 组件、函数、类型等遵循下文的命名与组织规范。
- 保持代码可读性，避免为兼容某一版本而牺牲整体一致性。

---

## 12. TypeScript 规范

- 全项目统一使用 **TypeScript**（严格模式），禁止使用 `any` 绕过类型检查。
- 业务数据类型（用户、角色、权限、菜单等）应定义清晰的 TypeScript 类型 / interface，并在不同技术栈中保持一致结构。
- API 请求 / 响应类型应与 API Contract 对齐。
- 前后端共享的数据结构尽量从一份来源派生（如 OpenAPI / 共享类型），以减少漂移。

---

## 13. 文件组织规范

- 各子项目遵循其框架约定的目录结构（Next.js App Router、Nuxt、Vue CLI / Vite、NestJS 模块化、React 组件分层）。
- `docs/` 存放项目级文档，需求文档固定为 `docs/requirements.md`。
- 业务模块在各项目中按模块/领域组织（用户、角色、权限、菜单、设置、日志），并尽量保持跨技术栈的结构对应关系。

---

## 14. 命名规范

- 目录 / 文件：小写短横线（kebab-case），如 `user-management/`。
- 组件名：PascalCase；文件与组件名保持一致。
- 函数 / 变量 / 接口字段：camelCase。
- 常量：UPPER_SNAKE_CASE。
- 路由 / URL：kebab-case。
- API 契约字段：camelCase，跨技术栈保持一致，避免命名漂移。

---

## 15. 依赖管理规范

- 包管理器统一使用 **pnpm**。
- 依赖尽量锁定版本（lockfile），避免隐性升级破坏一致性。
- 各子项目依赖相互独立；如使用根级 Workspace，仅用于共享脚本/类型，不应造成技术栈耦合。
- 安装新依赖前评估其对一致性维护的影响，避免引入与现有技术栈冲突的方案。

---

## 16. 测试规范

- 关键业务逻辑与 API 应有自动化测试，重点是用户/角色/权限等核心模块。
- 前端以组件与关键交互测试为主；后端以 API 与业务逻辑测试为主。
- 数据库相关测试建议使用隔离测试数据库，避免污染共有数据库。
- 测试与代码同目录或遵循各框架约定；保证测试可独立运行。

---

## 17. 部署规范

- **前端**（React / Vue / Next.js / Nuxt）部署到 **Vercel**：

```text
https://next.baiwumm.com
https://nuxt.baiwumm.com
https://react.baiwumm.com
https://vue.baiwumm.com
```

- **NestJS** 部署到 **Render**：

```text
https://api.baiwumm.com
```

- **数据库**：Supabase PostgreSQL。
- 每个子项目应能独立构建、独立部署；环境变量在对应部署平台配置。

---

## 18. AI Agent 开发规则（重要）

以下为所有 AI Agent 在开发 Better Admin 时必须遵守的**硬性规则**：

1. **React 是 UI 基准版本（UI Source of Truth）**，基于 Shadcn Admin 二次开发；UI 组件库策略遵循 §7.2：React / Next.js 以 **Hero UI 为主、Shadcn UI 为补充**，Vue / Nuxt 以 **Shadcn UI 为主**。
2. **Vue、Next.js、Nuxt 的 UI 应尽可能与 React 版本保持一致**（包括组件、视觉与交互）。
3. **React 和 Vue 使用 NestJS API**；不得绕过 NestJS 直接访问数据库。
4. **Next.js 和 Nuxt 采用各自的全栈能力，不依赖 NestJS**。
5. **所有版本共用同一个 PostgreSQL 数据库**（同一套 Schema）。
6. **Supabase 仅作为 PostgreSQL 托管平台**，不使用 Supabase Auth 与 RLS。
7. **浏览器端禁止直接连接数据库**；数据库连接信息只存在于服务端环境变量。
8. **不允许为了方便而修改既定的项目架构**（架构约束见本文档与 requirements.md）。
9. **不同技术栈之间的业务逻辑、数据结构和 API Contract 应尽可能保持一致**。
10. **不要为了实现某一个版本而破坏其他版本的设计一致性**。
11. **React / Next.js 代码生成与重构必须遵循 `vercel-react-best-practices` Skill**（详见 §20）。该 Skill 已全局安装（`~/.agents/skills/vercel-react-best-practices`），是所有 React / Next.js 代码产出（新建组件 / 页面、数据获取、重构、性能优化）的硬性性能与正确性规范；若与其冲突，以本文档的架构约束与 UI 组件库策略（§7.2）为更高优先级，但性能模式不得无故违反。
12. **React 迁移约束**：涉及 `/react` 代码生成（新建页面 / 组件 / 功能）时，**必须先阅读 `/react-shadcn` 对应模块代码**，理解其既有实现、布局、交互与业务逻辑，再在 `/react` 中以 Hero UI 模板为基础进行等效迁移（迁移策略详见 §4.6）。
13. **`/react-shadcn` 是只读参考源**：`/react-shadcn`（原 Shadcn Admin 源码）仅作为迁移参考与比对使用，**不得修改其代码**；任何功能迁移、修复或调整都应在 `/react` 中完成，而非改动 `/react-shadcn`。
14. **全局语言规则（跨会话持久生效）**：所有 AI Agent 在本项目中的**全部对话、思考过程与回复一律使用中文**。代码注释、文档、提交信息（Conventional Commits 描述）也以中文为主；仅在代码标识符、命令、API 字段等必须使用英文的场合保留英文。此规则覆盖所有会话，不局限于单一对话。

### 需求优先级

AI Agent 在开发时按照以下优先级理解需求：

1. 用户当前明确提出的需求
2. `docs/requirements.md`
3. `AGENTS.md`
4. 项目现有代码与架构
5. 框架官方最佳实践

如果当前需求与项目既有规则发生冲突：

- **不要静默修改架构**。
- **不要自行选择一个方案继续开发**。
- 应**明确指出冲突**，给出可选方案，**等待确认后再进行架构级修改**。

### 不擅自引入依赖

AI Agent 不得为了实现一个简单功能而随意安装新的依赖。

安装新依赖前应判断：

- 是否真的需要
- 当前项目是否已有替代方案
- 是否会增加维护成本
- 是否会影响不同技术栈的一致性

如果存在简单的原生实现或项目已有能力，应**优先使用现有能力**。

### 不擅自修改架构

AI Agent 不得因为当前任务方便而：

- 修改数据库架构
- 修改 API Contract
- 修改项目目录结构
- 更换 ORM
- 更换认证方案
- 更换 UI 基础方案
- 引入新的状态管理方案
- 引入新的请求库

除非当前任务明确要求，或者发现现有架构无法满足需求。如果确实需要修改，必须先**说明原因和影响**。

### 阶段性开发

Better Admin 是一个长期、多技术栈项目。AI Agent 应按照阶段逐步开发，**不应一次性修改多个技术栈**。

默认遵循：

```text
React UI
    ↓
NestJS
    ↓
React + NestJS
    ↓
Vue + NestJS
    ↓
Next.js
    ↓
Nuxt
    ↓
统一测试
    ↓
部署
```

除非用户明确要求，否则：

- 当前阶段只修改当前阶段涉及的项目
- 不要提前实现后续技术栈
- 不要因为发现未来需求而提前开发
- 不要自动进入下一阶段

每个阶段完成后：

1. 检查代码
2. 检查类型
3. 检查 lint
4. 检查测试
5. 总结修改内容
6. 明确当前阶段状态
7. 等待用户安排下一阶段

### 跨技术栈一致性检查

当修改以下内容时：

- 数据库 Schema
- API Contract
- 用户模型
- 角色模型
- 权限模型
- 菜单模型
- 核心业务规则

AI Agent 必须考虑对其他技术栈的影响。

例如修改用户字段时，需要评估 `NestJS`、`React`、`Vue`、`Next.js`、`Nuxt`、`Database`、`OpenAPI` 是否需要同步修改。

但是：**评估影响 ≠ 立即修改所有项目。**

如果当前处于单一技术栈开发阶段，只修改当前阶段需要修改的项目，并**记录后续需要同步的内容**。

### UI 基准版本

**React 是 Better Admin 的 UI Source of Truth。**

React 版本不仅是视觉参考，也是：

- 页面布局参考
- 组件行为参考
- 交互参考
- 响应式行为参考
- Dark Mode 参考
- Loading / Empty / Error State 参考

Vue、Next.js、Nuxt 后续实现时，应优先参考已经完成的 React 版本。

如果 React 版本尚未实现某个页面：**不要自行在其他技术栈创造一套新的 UI 方案**，应优先保持设计语言与 React 基准一致（遵循 §7.2 组件库策略与 §7.3 项目级 Design Tokens）。

### 开发顺序建议

不要四套前端同时开发，推荐按以下顺序：

```text
Phase 1  React + Shadcn Admin（完成 UI 基础）
Phase 2  NestJS + PostgreSQL（完成后端基础能力）
Phase 3  React + NestJS（完成第一套完整全栈系统）
Phase 4  Vue + NestJS（复刻完整系统）
Phase 5  Next.js（实现全栈版本）
Phase 6  Nuxt（实现全栈版本）
Phase 7  统一测试 → 部署全部版本
```

### 约定

- 任何业务开发前先读本文件与 `docs/requirements.md`。
- 改动某版本时，评估其对 UI/业务/数据结构/API Contract 一致性的影响。
- 完成阶段性工作后按规范提交，避免留下与既定架构冲突的实现。

---

## 19. 当前阶段状态

> 记录各阶段完成情况，供后续 Agent 快速了解项目进度；阶段由用户明确安排后再推进。

### Phase 1A：React + Shadcn Admin 基础建设（已完成）

- React（`/react`）基于官方 Shadcn Admin v2.2.1 初始化完成。
- UI 基础建立：Layout / Sidebar / Header / Theme / Dark Mode / shadcn/ui 组件可用。
- `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` 已实测通过，项目可独立运行。
- 未接入 NestJS、数据库、真实认证与 RBAC；当前页面为官方 Demo 与 Mock 数据。

### Phase 1B：Better Admin UI 定制（已完成）

- 品牌化：接入 Better Admin Logo（含 favicon、浅/深色两版）、站点标题与元信息、AppTitle。
- Sidebar 调整为 Better Admin 中文菜单（概览 / 系统管理 / 系统设置），移除团队切换与 Clerk 演示导航。
- 页面规划：新增 `/roles`、`/permissions`、`/menus`、`/logs` 占位路由（中文占位页，不实现业务逻辑）。
- Demo 清理：移除 Tasks、Chats、Apps、Clerk、Help Center 演示页面与相关组件。
- 界面默认中文：Dashboard / Users / Settings / Auth / Errors / DataTable / ConfigDrawer 等界面文案中文化。
- 主色保持 Shadcn Admin 默认（slate），按约定待项目完成后再调整。
- 验证：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm format:check` 全部通过。
- 等待下一阶段（Phase 2：NestJS + PostgreSQL，或用户安排的其它阶段）。

### Phase 1C：React Hero UI 迁移启动（进行中）

- **目录调整**：原 `/react`（Shadcn Admin）已重命名为 `/react-shadcn`；新 `/react` 以 **Hero UI 初始化模板**创建，作为 UI 迁移的目标版本与新的 UI 基准（详见 §4.1、§4.6）。
- **迁移策略**：已制定渐进式迁移策略（§4.6），明确 `/react-shadcn` 为只读参考源、6 条迁移原则与 9 个模块的迁移进度表（状态均 🔲 待迁移）。
- **当前状态**：`/react` Hero UI 初始化完成，项目可独立运行；尚未迁移任何业务模块（Layout / Dashboard / 用户管理 / 角色管理 / 权限管理 / 菜单管理 / 系统设置 / 日志管理 / 认证 均待迁移）。
- 等待下一指令：按 §4.6 进度表逐个模块推进迁移，或用户安排的其它阶段。

### Phase 2：NestJS + PostgreSQL（已完成）

> 设计真源：`nest/docs/database-design.md` (v0.3)、`nest/docs/openapi-design.md` (v0.2)、`nest/openapi/openapi.yaml` (v1.1.0)。

- **工程初始化**：`nest/` 已用 pnpm 初始化（NestJS 11 + TypeScript 5.8）。依赖含 drizzle-orm / pg / nanoid / bcrypt / @nestjs/jwt / @nestjs/passport / class-validator / @nestjs/config / @nestjs/swagger。
- **Schema（Drizzle）**：`nest/src/db/schema/` 下 9 张表（users/roles/menus/user_roles/role_menus/dict_types/dict_items/settings/logs）+ `permissions.enum.ts`（位掩码枚举，bigint，`hasPermission` 守卫）。部分唯一索引（软删用户名/邮箱复用）、联合主键、级联/限制外键、jsonb、bigint 位掩码均已对齐设计。
- **迁移**：`drizzle-kit generate` 生成 `drizzle/0000_initial_schema.sql`；`pnpm db:migrate` 应用，`pnpm db:seed` 写入种子（super_admin 全量位 -1n、admin/admin123、菜单树、字典、8 个设置 key）。
- **数据库联调（已完成）**：已连接真实 Supabase PostgreSQL（aws-0-ap-southeast-1.pooler.supabase.com:6543），`0000_initial_schema.sql` 迁移成功——9 张表全部建成，7 条外键级联规则与 2 个软删部分唯一索引核对无误。连接细节：URL 不写 `sslmode`，由 `db/client.ts` / `scripts/migrate.ts` 代码层配置 `ssl: { rejectUnauthorized: false }`（pg 8.x 会把 URL 的 sslmode=require 解析为证书链校验而失败）。`dict_types.code` 唯一性采用 UNIQUE 约束（内联）而非唯一索引，避免「先加外键后建索引」的 42830 顺序问题。真实凭据存于 gitignored 的 `nest/.env`。
- **基础设施**：全局异常过滤器（{code,message}、401/404/Validation 映射）、全局响应拦截器（{data}/{data,pagination}）、JWT 策略 + PermissionsGuard（位掩码，super_admin -1n 放行）、@Permissions 装饰器、全局 API 日志拦截器与 error 日志埋点。
- **业务模块**（严格按 openapi.yaml）：Auth（login/refresh/me/logout）、Users、Roles、Menus（§1.5 O(1) 内存映射填充 userPermissions，禁 N+1）、Permissions（枚举下发）、Dict、Settings（SETTINGS_UPDATE 独立位 + 类型校验）、Logs（列表/详情/删除 + 4 Tab 过滤）。
- **集成**：`loadConfig()` 启动期校验 `DATABASE_URL` / `JWT_SECRET`（缺省报错退出），`JWT_EXPIRES_IN`(7d) / `REFRESH_EXPIRES_IN`(30d) 带默认值；Swagger 挂在 `/docs`；全局前缀 `/api`。验证：`tsc --noEmit` 与 `nest build` 通过；启动后路由鉴权、Swagger、全局日志埋点均工作；真实库迁移已跑通，`db:seed` 待执行。
- **已知问题 / 后续优化**：
  - 权限位 `permissions` 在 JSON 中统一以**正数全 1 掩码 `9223372036854775807`**（字符串）表示超级管理员全量位（内部存储为 -1n，输出经 `normalizePermissionBits` 归一化）；`hasPermission` / PermissionsGuard 同时识别 `-1n` 与 `2^63-1`。前端按 BigInt 解析即可，跨技术栈保持一致。
  - 日志定期清理（pg_cron / @Cron 按 `system.logRetentionDays`）尚未实现，数据访问层已就绪。
  - 种子 `menuFullBits` 含 `ADD_CHILD`（7 位），比任务示例多 1 位，属菜单管理页完整按钮集，符合设计 §2.3。
- 等待下一阶段（Phase 3：React + NestJS 完整全栈，或用户安排的其它阶段）。

### UI 组件库策略调整（2026-08-22）

- 明确 React / Next.js：**Hero UI 为主 + Shadcn UI 为补充**；Vue / Nuxt：**Shadcn UI 为主，暂不调整**。
- React / Next.js 组件优先级：Hero UI > Shadcn UI > Custom；样式变量以 **Hero UI 设计体系为主要参考**，统一维护一套项目级 Design Tokens（§7.2 / §7.3）。
- 存量 Shadcn Admin / Shadcn UI 能力（Layout、Sidebar、DataTable、Form 等）**渐进式保留**，不做一次性大规模迁移；新增功能优先 Hero UI。
- 本次仅同步项目规范与文档（`AGENTS.md`、`docs/requirements.md`、`docs/ui-spec.md`、`docs/react.md`、`README.md`），**未进行任何 UI 代码迁移**。

### keepAlive 路由缓存 + 过渡动画重构（2026-08-25）

- **目标**：菜单数据 `keepAlive: true` 的页面实现**组件实例级状态保活**，同时修复路由过渡动画「先切页再空播一遍」的缺陷，并重做动画预设。
- **旧过渡缺陷根因**：RouteTransition 双缓冲依赖「children 引用不变 → bailout」，但 Outlet 子树自身订阅 location（useSyncExternalStore 会给 fiber 安排更新 lane）→ bailout 必然失败 → DOM 当帧切到新页 → VT 旧快照拍到的是新页（old≈new）→ 动画退化为同图淡化且卡顿。结论：双缓冲在「子树有 store 订阅」时必然被击穿，无法调参修复。
- **技术选型**：React 官方 **`<Activity>`**（项目 React 19.2.8 stable）：hidden 保留 state 与 DOM、自动卸载 effects；不依赖 TanStack Router 内部 API（`getRouterContext` 在 1.168 已移除，第三方 `tanstack-router-keepalive` 确认不可用）。
- **核心架构（KeepAliveOutlet = 路由呈现管理器，v3）**：`react/src/layouts/components/keep-alive-outlet.tsx`
  - **displayedPath 与 pathname 分离**：渲染期显式输出 displayedPath 结构（不靠 bailout，store 击穿无效化）；layout effect 中 `startViewTransition`（捕获真实旧帧）→ 回调内 flushSync 切换；连续导航 skip 旧 VT（ready 的 AbortError 已吞掉）。
  - **导航方向感知**：按新旧路径在菜单树中的层级深度判定前进/后退，写入 `html[data-rt-direction="back"]`，CSS 变量 `--rt-dir-x` 反转位移类动画（glide/cover）方向。
  - **异常态 overlay 化**：AdminLayout 将 loading / 菜单校验失败 / 403 以 `overlay` prop 传入 KeepAliveOutlet——实例池保持挂载（全部转 hidden 保活），异常恢复后原页面状态无损；403 时侧边栏保留，可直接切换其它菜单离开。
  - **统一实例池**：所有已访问页面入池渲染（`<Activity mode>` 切换显隐）。菜单 `keepAlive: true` → permanent 长驻保活；其余 → transient，仅为过渡期提供旧帧，切换完成后移除卸载（语义等同普通路由切换）。LRU 上限 10（transient 优先淘汰，不足时 permanent 间 LRU + dev 告警）。池逻辑抽为纯函数 `lib/keepalive-pool.ts`（vitest 单测覆盖，`pnpm test`）。
  - **组件来源两级**：`keepalive-registry.tsx` 注册表（手动覆盖入口，可选）→ `lib/route-component.ts` 按 fullPath 从 routeTree 解析叶子组件（公开 API，全量兜底；只匹配无 children 的节点避免误中布局路由）。**新增 keepAlive 页面零登记成本**。
  - RouteTransition 组件已删除（职责并入 KeepAliveOutlet）；admin-layout 直接渲染 `<KeepAliveOutlet />`。
- **滚动模型**：AdminLayout `<main>` 统一滚动（滚动条贴合主体区边缘）；页面位置**不做保活**（产品约定），KeepAliveOutlet 在每次切换完成、VT 新帧捕获前显式回顶；`lib/keepalive-cache.ts` 已删除。
- **动画预设**（`themes/route-transitions.ts` + `styles/route-transitions.css`，共 9 种）：none / fade 柔和淡化 / glide 视差推滑 / rise 浮现上升 / zoom 纵深缩放 / reveal 揭示展开 / cover 覆盖推入 / circle 圆形揭示 / blur 景深聚焦；双侧协同关键帧、340ms 基准 × 速度档位（`html[data-rt-speed]` → `--rt-speed` 倍率，偏好设置可选慢速/标准/快速）、统一 easeOut 曲线；`html[data-route-transition]` 选择器机制不变；reduced-motion 全关。
- **数据新鲜度约定（保活 ≠ 数据冻结）**：`<Activity>` hidden 卸载 effects → React Query 订阅暂停、后台不发请求；恢复 visible 时重新订阅，数据已 stale 自动 refetch。此为预期行为，Phase 4 接真实数据时勿绕过该机制。
- **验证页**：`react/src/features/users/users-page.tsx` 保活演示页（搜索关键字 / 计数按钮 / 长 Mock 列表滚动），Phase 4 接入真实用户管理时替换内容并保留路由挂载方式。
- **已知边界**：隐藏实例仍订阅 Router Context（不可见的轻量重渲染）；页面 UI 态建议放 store 而非 search params；403/loading 分支下 KeepAliveOutlet 不渲染（缓存随组件树销毁重建，异常场景可接受）。

---

## 20. React / Next.js 全局性能规范（vercel-react-best-practices）

> 本节是对 §18 第 11 条的展开与强制化。所有 React / Next.js 代码生成与重构都必须遵循此规范。

### 20.1 背景

`vercel-react-best-practices` 是 Vercel 工程团队维护的 React / Next.js 性能优化指南 Skill，包含 **70 条规则、8 大类**（按影响力排序）：

| 优先级 | 类别 | 影响 | 规则前缀 |
| --- | --- | --- | --- |
| 1 | 消除瀑布流（Waterfalls） | 关键 | `async-` |
| 2 | 包体积优化（Bundle） | 关键 | `bundle-` |
| 3 | 服务端性能（Server） | 高 | `server-` |
| 4 | 客户端数据获取（Client） | 中-高 | `client-` |
| 5 | 重渲染优化（Re-render） | 中 | `rerender-` |
| 6 | 渲染性能（Rendering） | 中 | `rendering-` |
| 7 | JavaScript 性能 | 低-中 | `js-` |
| 8 | 进阶模式（Advanced） | 低 | `advanced-` |

该 Skill 已**全局安装**到用户级目录：`~/.agents/skills/vercel-react-best-practices`（内含 `SKILL.md` 与 `rules/` 下 70 个规则文件）。在支持 universal skill 的 Agent（Claude Code、Cursor、Codex、Gemini CLI、Cline 等绝大多数）中，它会随仓库自动加载。

### 20.2 硬性规则（所有 AI Agent 必须遵守）

1. **触发范围**：只要任务涉及 **React 或 Next.js 的代码生成、页面 / 组件新建、数据获取、重构、性能优化**，在动手前必须先加载并遵循 `vercel-react-best-practices` Skill 的全部相关规则。
2. **Skill 优先加载**：当任务明确匹配该 Skill 的触发条件（React 组件、Next.js 页面、数据获取、包体积优化、性能改进）时，应主动 `skill` 调用 / 读取 `~/.agents/skills/vercel-react-best-practices/SKILL.md` 及其 `rules/` 下对应规则，再产出代码。
3. **代码产出即合规**：生成的 React / Next.js 代码默认应符合该 Skill 的关键规则，至少包括：
   - **消除瀑布流**：在 `await` 远程值 / flag 前先做廉价的同步判断；并行获取数据（`Promise.all`）；避免嵌套串行 fetch。
   - **包体积**：避免 barrel import 引发的打包膨胀；对第三方重依赖使用动态 `import()` / `next/dynamic`；可分析路径优先。
   - **服务端**：并行 server-side fetching；不在 module 级共享可变状态；使用 React 缓存 / LRU 缓存去重。
   - **客户端数据获取**：SWR / React Query 去重请求；被动事件监听器；localStorage 访问带 schema 校验。
   - **重渲染**：`useMemo` / `useCallback` 合理使用；不在渲染中内联定义组件；派生状态优先用 `useMemo` 而非 `useEffect`；`useState` 初始化用惰性函数。
   - **渲染**：`useTransition` 处理加载态；Suspense 边界合理拆分；`content-visibility` / `useDeferredValue` 等。
4. **冲突裁决**：若 Vercel Skill 的某条性能建议与本文档的**架构约束**（§5/§6 数据库与 API Contract）、**UI 组件库策略**（§7.2 Hero UI 优先）或**阶段性开发约束**（§18）冲突，**以本文档为高优先级**；但性能模式（如消除瀑布、并行 fetch、`useMemo` 等）**不得无故违反**。
5. **适用范围限定**：该 Skill 面向 **React / Next.js**。Vue / Nuxt 代码不强制套用其 React 专属规则，但「消除瀑布、并行请求、避免无谓重渲染」等通用性能原则仍应参考。

### 20.3 安装与维护

- 安装命令（已执行）：

```text
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -g -y -a "*"
```

- 该命令将 Skill 安装到 `~/.agents/skills/vercel-react-best-practices`（用户级、跨项目生效），并对 77 个 Agent 建立 universal / symlink 关联。
- 升级：`npx skills update -g vercel-react-best-practices`（或在任意位置 `npx skills update`）。
- 验证安装：`npx skills ls -g` 应列出 `vercel-react-best-practices`。

<!-- HEROUI-REACT-AGENTS-MD-START -->
[HeroUI React v3 Docs Index]|root: ./.heroui-docs/react|STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --react --output AGENTS.md|.:{components\(buttons)\button-group.mdx,components\(buttons)\button.mdx,components\(buttons)\close-button.mdx,components\(buttons)\toggle-button-group.mdx,components\(buttons)\toggle-button.mdx,components\(collections)\dropdown.mdx,components\(collections)\list-box.mdx,components\(collections)\tag-group.mdx,components\(colors)\color-area.mdx,components\(colors)\color-field.mdx,components\(colors)\color-picker.mdx,components\(colors)\color-slider.mdx,components\(colors)\color-swatch-picker.mdx,components\(colors)\color-swatch.mdx,components\(controls)\slider.mdx,components\(controls)\switch.mdx,components\(data-display)\badge.mdx,components\(data-display)\chip.mdx,components\(data-display)\table.mdx,components\(date-and-time)\calendar.mdx,components\(date-and-time)\date-field.mdx,components\(date-and-time)\date-picker.mdx,components\(date-and-time)\date-range-picker.mdx,components\(date-and-time)\range-calendar.mdx,components\(date-and-time)\time-field.mdx,components\(feedback)\alert.mdx,components\(feedback)\meter.mdx,components\(feedback)\progress-bar.mdx,components\(feedback)\progress-circle.mdx,components\(feedback)\skeleton.mdx,components\(feedback)\spinner.mdx,components\(forms)\checkbox-group.mdx,components\(forms)\checkbox.mdx,components\(forms)\description.mdx,components\(forms)\error-message.mdx,components\(forms)\field-error.mdx,components\(forms)\fieldset.mdx,components\(forms)\form.mdx,components\(forms)\input-group.mdx,components\(forms)\input-otp.mdx,components\(forms)\input.mdx,components\(forms)\label.mdx,components\(forms)\number-field.mdx,components\(forms)\radio-group.mdx,components\(forms)\search-field.mdx,components\(forms)\text-area.mdx,components\(forms)\text-field.mdx,components\(layout)\card.mdx,components\(layout)\separator.mdx,components\(layout)\surface.mdx,components\(layout)\toolbar.mdx,components\(media)\avatar.mdx,components\(navigation)\accordion.mdx,components\(navigation)\breadcrumbs.mdx,components\(navigation)\disclosure-group.mdx,components\(navigation)\disclosure.mdx,components\(navigation)\link.mdx,components\(navigation)\pagination.mdx,components\(navigation)\tabs.mdx,components\(overlays)\alert-dialog.mdx,components\(overlays)\drawer.mdx,components\(overlays)\modal.mdx,components\(overlays)\popover.mdx,components\(overlays)\toast.mdx,components\(overlays)\tooltip.mdx,components\(pickers)\autocomplete.mdx,components\(pickers)\combo-box.mdx,components\(pickers)\select.mdx,components\(typography)\kbd.mdx,components\(typography)\typography.mdx,components\(utilities)\scroll-shadow.mdx,components\index.mdx,getting-started\(handbook)\animation.mdx,getting-started\(handbook)\colors.mdx,getting-started\(handbook)\composition.mdx,getting-started\(handbook)\dark-mode.mdx,getting-started\(handbook)\styling.mdx,getting-started\(handbook)\theming.mdx,getting-started\(overview)\cli.mdx,getting-started\(overview)\design-principles.mdx,getting-started\(overview)\frameworks.mdx,getting-started\(overview)\quick-start.mdx,getting-started\(ui-for-agents)\agent-skills.mdx,getting-started\(ui-for-agents)\agents-md.mdx,getting-started\(ui-for-agents)\llms-txt.mdx,getting-started\(ui-for-agents)\mcp-server.mdx,getting-started\index.mdx,releases\index.mdx,releases\v3-0-0-alpha-32.mdx,releases\v3-0-0-alpha-33.mdx,releases\v3-0-0-alpha-34.mdx,releases\v3-0-0-alpha-35.mdx,releases\v3-0-0-beta-1.mdx,releases\v3-0-0-beta-2.mdx,releases\v3-0-0-beta-3.mdx,releases\v3-0-0-beta-4.mdx,releases\v3-0-0-beta-6.mdx,releases\v3-0-0-beta-7.mdx,releases\v3-0-0-beta-8.mdx,releases\v3-0-0-rc-1.mdx,releases\v3-0-0.mdx,releases\v3-0-2.mdx,releases\v3-0-3.mdx,releases\v3-0-4.mdx,releases\v3-0-5.mdx,releases\v3-1-0.mdx,releases\v3-2-0.mdx,releases\v3-2-1.mdx,releases\v3-2-2.mdx,releases\v3-2-3.mdx,releases\v3-2-4.mdx}|demos/.:{cn\accordion\basic.tsx,cn\accordion\controlled.tsx,cn\accordion\custom-indicator.tsx,cn\accordion\custom-styles.tsx,cn\accordion\disabled.tsx,cn\accordion\faq.tsx,cn\accordion\multiple.tsx,cn\accordion\render-function.tsx,cn\accordion\surface.tsx,cn\accordion\without-separator.tsx,cn\alert-dialog\backdrop-variants.tsx,cn\alert-dialog\close-methods.tsx,cn\alert-dialog\controlled.tsx,cn\alert-dialog\custom-animations.tsx,cn\alert-dialog\custom-backdrop.tsx,cn\alert-dialog\custom-icon.tsx,cn\alert-dialog\custom-portal.tsx,cn\alert-dialog\custom-styles.tsx,cn\alert-dialog\custom-trigger.tsx,cn\alert-dialog\default.tsx,cn\alert-dialog\dismiss-behavior.tsx,cn\alert-dialog\placements.tsx,cn\alert-dialog\sizes.tsx,cn\alert-dialog\statuses.tsx,cn\alert\basic.tsx,cn\alert\custom-styles.tsx,cn\autocomplete\allows-empty-collection.tsx,cn\autocomplete\asynchronous-filtering.tsx,cn\autocomplete\controlled-multiple.tsx,cn\autocomplete\controlled-open-state.tsx,cn\autocomplete\controlled.tsx,cn\autocomplete\custom-indicator.tsx,cn\autocomplete\custom-styles.tsx,cn\autocomplete\custom-value.tsx,cn\autocomplete\default.tsx,cn\autocomplete\disabled.tsx,cn\autocomplete\email-recipients.tsx,cn\autocomplete\full-width.tsx,cn\autocomplete\location-search.tsx,cn\autocomplete\multiple-select.tsx,cn\autocomplete\on-surface.tsx,cn\autocomplete\required.tsx,cn\autocomplete\tag-group-selection.tsx,cn\autocomplete\user-selection-multiple.tsx,cn\autocomplete\user-selection.tsx,cn\autocomplete\variants.tsx,cn\autocomplete\virtualization.tsx,cn\autocomplete\with-description.tsx,cn\autocomplete\with-disabled-options.tsx,cn\autocomplete\with-sections.tsx,cn\avatar\basic.tsx,cn\avatar\colors.tsx,cn\avatar\custom-image-component.tsx,cn\avatar\custom-styles.tsx,cn\avatar\fallback.tsx,cn\avatar\group.tsx,cn\avatar\sizes.tsx,cn\avatar\variants.tsx,cn\badge\basic.tsx,cn\badge\colors.tsx,cn\badge\custom-styles.tsx,cn\badge\dot.tsx,cn\badge\placements.tsx,cn\badge\sizes.tsx,cn\badge\variants.tsx,cn\badge\with-content.tsx,cn\breadcrumbs\basic.tsx,cn\breadcrumbs\custom-separator.tsx,cn\breadcrumbs\custom-styles.tsx,cn\breadcrumbs\disabled.tsx,cn\breadcrumbs\level-2.tsx,cn\breadcrumbs\level-3.tsx,cn\breadcrumbs\render-function.tsx,cn\button-group\basic.tsx,cn\button-group\custom-styles.tsx,cn\button-group\disabled.tsx,cn\button-group\full-width.tsx,cn\button-group\orientation.tsx,cn\button-group\sizes.tsx,cn\button-group\variants.tsx,cn\button-group\with-icons.tsx,cn\button-group\without-separator.tsx,cn\button\basic.tsx,cn\button\custom-styles.tsx,cn\button\custom-variants.tsx,cn\button\disabled.tsx,cn\button\full-width.tsx,cn\button\icon-only.tsx,cn\button\loading-state.tsx,cn\button\loading.tsx,cn\button\release-outline-variant.tsx,cn\button\render-function.tsx,cn\button\ripple-effect.tsx,cn\button\sizes.tsx,cn\button\social.tsx,cn\button\variants.tsx,cn\button\with-icons.tsx,cn\calendar\basic.tsx,cn\calendar\booking-calendar.tsx,cn\calendar\controlled.tsx,cn\calendar\custom-icons.tsx,cn\calendar\custom-styles.tsx,cn\calendar\day-view.tsx,cn\calendar\default-value.tsx,cn\calendar\disabled.tsx,cn\calendar\focused-value.tsx,cn\calendar\international-calendar.tsx,cn\calendar\min-max-dates.tsx,cn\calendar\multiple-months.tsx,cn\calendar\multiple-selection.tsx,cn\calendar\read-only.tsx,cn\calendar\unavailable-dates.tsx,cn\calendar\week-view.tsx,cn\calendar\weeks-in-month.tsx,cn\calendar\with-indicators.tsx,cn\calendar\year-picker.tsx,cn\card\custom-styles.tsx,cn\card\default.tsx,cn\card\horizontal.tsx,cn\card\variants.tsx,cn\card\with-avatar.tsx,cn\card\with-form.tsx,cn\card\with-images.tsx,cn\checkbox-group\basic.tsx,cn\checkbox-group\controlled.tsx,cn\checkbox-group\custom-styles.tsx,cn\checkbox-group\disabled.tsx,cn\checkbox-group\features-and-addons.tsx,cn\checkbox-group\indeterminate.tsx,cn\checkbox-group\on-surface.tsx,cn\checkbox-group\render-function.tsx,cn\checkbox-group\validation.tsx,cn\checkbox-group\with-custom-indicator.tsx,cn\checkbox\basic.tsx,cn\checkbox\controlled.tsx,cn\checkbox\custom-indicator.tsx,cn\checkbox\custom-styles.tsx,cn\checkbox\default-selected.tsx,cn\checkbox\disabled.tsx,cn\checkbox\external-label.tsx,cn\checkbox\form.tsx,cn\checkbox\full-rounded.tsx,cn\checkbox\indeterminate.tsx,cn\checkbox\invalid.tsx,cn\checkbox\render-function.tsx,cn\checkbox\render-props.tsx,cn\checkbox\variants.tsx,cn\checkbox\with-description.tsx,cn\chip\basic.tsx,cn\chip\custom-styles.tsx,cn\chip\release-vibrant-palette.tsx,cn\chip\statuses.tsx,cn\chip\variants.tsx,cn\chip\with-icon.tsx,cn\close-button\custom-styles.tsx,cn\close-button\default.tsx,cn\close-button\interactive.tsx,cn\close-button\variants.tsx,cn\close-button\with-custom-icon.tsx,cn\color-area\basic.tsx,cn\color-area\controlled.tsx,cn\color-area\custom-styles.tsx,cn\color-area\disabled.tsx,cn\color-area\render-function.tsx,cn\color-area\space-and-channels.tsx,cn\color-area\with-dots.tsx,cn\color-field\basic.tsx,cn\color-field\channel-editing.tsx,cn\color-field\controlled.tsx,cn\color-field\custom-styles.tsx,cn\color-field\disabled.tsx,cn\color-field\form-example.tsx,cn\color-field\full-width.tsx,cn\color-field\invalid.tsx,cn\color-field\on-surface.tsx,cn\color-field\render-function.tsx,cn\color-field\required.tsx,cn\color-field\variants.tsx,cn\color-field\with-description.tsx,cn\color-picker\basic.tsx,cn\color-picker\controlled.tsx,cn\color-picker\custom-styles.tsx,cn\color-picker\with-fields.tsx,cn\color-picker\with-sliders.tsx,cn\color-picker\with-swatches.tsx,cn\color-slider\alpha-channel.tsx,cn\color-slider\basic.tsx,cn\color-slider\channels.tsx,cn\color-slider\controlled.tsx,cn\color-slider\custom-styles.tsx,cn\color-slider\disabled.tsx,cn\color-slider\render-function.tsx,cn\color-slider\rgb-channels.tsx,cn\color-slider\vertical.tsx,cn\color-swatch-picker\basic.tsx,cn\color-swatch-picker\controlled.tsx,cn\color-swatch-picker\custom-indicator.tsx,cn\color-swatch-picker\custom-styles.tsx,cn\color-swatch-picker\default-value.tsx,cn\color-swatch-picker\disabled.tsx,cn\color-swatch-picker\render-function.tsx,cn\color-swatch-picker\sizes.tsx,cn\color-swatch-picker\stack-layout.tsx,cn\color-swatch-picker\variants.tsx,cn\color-swatch\accessibility.tsx,cn\color-swatch\basic.tsx,cn\color-swatch\custom-styles.tsx,cn\color-swatch\render-function.tsx,cn\color-swatch\shapes.tsx,cn\color-swatch\sizes.tsx,cn\color-swatch\transparency.tsx,cn\combo-box\allows-custom-value.tsx,cn\combo-box\asynchronous-loading.tsx,cn\combo-box\controlled-input-value.tsx,cn\combo-box\controlled.tsx,cn\combo-box\custom-filtering.tsx,cn\combo-box\custom-indicator.tsx,cn\combo-box\custom-styles.tsx,cn\combo-box\custom-value.tsx,cn\combo-box\default-selected-key.tsx,cn\combo-box\default.tsx,cn\combo-box\disabled.tsx,cn\combo-box\full-width.tsx,cn\combo-box\menu-trigger.tsx,cn\combo-box\multiple-selection.tsx,cn\combo-box\on-surface.tsx,cn\combo-box\render-function.tsx,cn\combo-box\required.tsx,cn\combo-box\with-description.tsx,cn\combo-box\with-disabled-options.tsx,cn\combo-box\with-sections.tsx,cn\date-field\basic.tsx,cn\date-field\controlled.tsx,cn\date-field\custom-styles.tsx,cn\date-field\disabled.tsx,cn\date-field\form-example.tsx,cn\date-field\full-width.tsx,cn\date-field\granularity.tsx,cn\date-field\invalid.tsx,cn\date-field\on-surface.tsx,cn\date-field\render-function.tsx,cn\date-field\required.tsx,cn\date-field\variants.tsx,cn\date-field\with-description.tsx,cn\date-field\with-prefix-and-suffix.tsx,cn\date-field\with-prefix-icon.tsx,cn\date-field\with-suffix-icon.tsx,cn\date-field\with-validation.tsx,cn\date-picker\basic.tsx,cn\date-picker\controlled.tsx,cn\date-picker\custom-styles.tsx,cn\date-picker\disabled.tsx,cn\date-picker\form-example.tsx,cn\date-picker\format-options-no-ssr.tsx,cn\date-picker\format-options.tsx,cn\date-picker\international-calendar.tsx,cn\date-picker\render-function.tsx,cn\date-picker\with-custom-indicator.tsx,cn\date-picker\with-validation.tsx,cn\date-range-picker\basic.tsx,cn\date-range-picker\controlled.tsx,cn\date-range-picker\custom-styles.tsx,cn\date-range-picker\disabled.tsx,cn\date-range-picker\form-example.tsx,cn\date-range-picker\format-options-no-ssr.tsx,cn\date-range-picker\format-options.tsx,cn\date-range-picker\international-calendar.tsx,cn\date-range-picker\release-input-container.tsx,cn\date-range-picker\render-function.tsx,cn\date-range-picker\with-custom-indicator.tsx,cn\date-range-picker\with-validation.tsx,cn\description\basic.tsx,cn\description\custom-styles.tsx,cn\disclosure-group\basic.tsx,cn\disclosure-group\controlled.tsx,cn\disclosure-group\custom-styles.tsx,cn\disclosure\basic.tsx,cn\disclosure\custom-styles.tsx,cn\disclosure\render-function.tsx,cn\drawer\backdrop-variants.tsx,cn\drawer\basic.tsx,cn\drawer\controlled.tsx,cn\drawer\custom-styles.tsx,cn\drawer\navigation.tsx,cn\drawer\non-dismissable.tsx,cn\drawer\placements.tsx,cn\drawer\scrollable-content.tsx,cn\drawer\with-form.tsx,cn\dropdown\controlled-open-state.tsx,cn\dropdown\controlled.tsx,cn\dropdown\custom-styles.tsx,cn\dropdown\custom-trigger.tsx,cn\dropdown\default.tsx,cn\dropdown\long-press-trigger.tsx,cn\dropdown\single-with-custom-indicator.tsx,cn\dropdown\with-custom-submenu-indicator.tsx,cn\dropdown\with-descriptions.tsx,cn\dropdown\with-disabled-items.tsx,cn\dropdown\with-icons.tsx,cn\dropdown\with-keyboard-shortcuts.tsx,cn\dropdown\with-multiple-selection.tsx,cn\dropdown\with-section-level-selection.tsx,cn\dropdown\with-sections.tsx,cn\dropdown\with-single-selection.tsx,cn\dropdown\with-submenus.tsx,cn\error-message\basic.tsx,cn\error-message\custom-styles.tsx,cn\field-error\basic.tsx,cn\field-error\custom-styles.tsx,cn\fieldset\basic.tsx,cn\fieldset\custom-styles.tsx,cn\fieldset\on-surface.tsx,cn\form\basic.tsx,cn\form\custom-styles.tsx,cn\form\render-function.tsx,cn\input-group\custom-styles.tsx,cn\input-group\default.tsx,cn\input-group\disabled.tsx,cn\input-group\full-width.tsx,cn\input-group\invalid.tsx,cn\input-group\on-surface.tsx,cn\input-group\password-with-toggle.tsx,cn\input-group\required.tsx,cn\input-group\variants.tsx,cn\input-group\with-badge-suffix.tsx,cn\input-group\with-copy-suffix.tsx,cn\input-group\with-icon-prefix-and-copy-suffix.tsx,cn\input-group\with-icon-prefix-and-text-suffix.tsx,cn\input-group\with-keyboard-shortcut.tsx,cn\input-group\with-loading-suffix.tsx,cn\input-group\with-prefix-and-suffix.tsx,cn\input-group\with-prefix-icon.tsx,cn\input-group\with-suffix-icon.tsx,cn\input-group\with-text-prefix.tsx,cn\input-group\with-text-suffix.tsx,cn\input-group\with-textarea.tsx,cn\input-otp\basic.tsx,cn\input-otp\controlled.tsx,cn\input-otp\custom-styles.tsx,cn\input-otp\disabled.tsx,cn\input-otp\form-example.tsx,cn\input-otp\four-digits.tsx,cn\input-otp\on-complete.tsx,cn\input-otp\on-surface.tsx,cn\input-otp\variants.tsx,cn\input-otp\with-pattern.tsx,cn\input-otp\with-validation.tsx,cn\input\basic.tsx,cn\input\controlled.tsx,cn\input\custom-styles.tsx,cn\input\full-width.tsx,cn\input\on-surface.tsx,cn\input\types.tsx,cn\input\variants.tsx,cn\kbd\basic.tsx,cn\kbd\custom-styles.tsx,cn\kbd\inline.tsx,cn\kbd\instructional.tsx,cn\kbd\navigation.tsx,cn\kbd\special.tsx,cn\kbd\variants.tsx,cn\label\basic.tsx,cn\label\custom-styles.tsx,cn\link\basic.tsx,cn\link\custom-icon.tsx,cn\link\custom-styles.tsx,cn\link\icon-placement.tsx,cn\link\render-function.tsx,cn\link\underline-and-offset.tsx,cn\link\underline-offset.tsx,cn\link\underline-variants.tsx,cn\list-box\controlled.tsx,cn\list-box\custom-check-icon.tsx,cn\list-box\custom-styles.tsx,cn\list-box\default.tsx,cn\list-box\multi-select.tsx,cn\list-box\release-scrollbar-modes.tsx,cn\list-box\render-function.tsx,cn\list-box\virtualization.tsx,cn\list-box\with-disabled-items.tsx,cn\list-box\with-sections.tsx,cn\meter\basic.tsx,cn\meter\colors.tsx,cn\meter\custom-styles.tsx,cn\meter\custom-value.tsx,cn\meter\sizes.tsx,cn\meter\without-label.tsx,cn\modal\backdrop-variants.tsx,cn\modal\close-methods.tsx,cn\modal\controlled.tsx,cn\modal\custom-animations.tsx,cn\modal\custom-backdrop.tsx,cn\modal\custom-portal.tsx,cn\modal\custom-styles.tsx,cn\modal\custom-trigger.tsx,cn\modal\default.tsx,cn\modal\dismiss-behavior.tsx,cn\modal\placements.tsx,cn\modal\scroll-comparison.tsx,cn\modal\sizes.tsx,cn\modal\with-form.tsx,cn\number-field\basic.tsx,cn\number-field\controlled.tsx,cn\number-field\custom-icons.tsx,cn\number-field\custom-styles.tsx,cn\number-field\disabled.tsx,cn\number-field\form-example.tsx,cn\number-field\full-width.tsx,cn\number-field\on-surface.tsx,cn\number-field\render-function.tsx,cn\number-field\required.tsx,cn\number-field\validation.tsx,cn\number-field\variants.tsx,cn\number-field\with-chevrons.tsx,cn\number-field\with-description.tsx,cn\number-field\with-format-options.tsx,cn\number-field\with-step.tsx,cn\number-field\with-validation.tsx,cn\pagination\basic.tsx,cn\pagination\controlled.tsx,cn\pagination\custom-icons.tsx,cn\pagination\custom-styles.tsx,cn\pagination\disabled.tsx,cn\pagination\simple-prev-next.tsx,cn\pagination\sizes.tsx,cn\pagination\with-ellipsis.tsx,cn\pagination\with-summary.tsx,cn\popover\basic.tsx,cn\popover\custom-styles.tsx,cn\popover\interactive.tsx,cn\popover\placement.tsx,cn\popover\render-function.tsx,cn\popover\with-arrow.tsx,cn\progress-bar\basic.tsx,cn\progress-bar\colors.tsx,cn\progress-bar\custom-styles.tsx,cn\progress-bar\custom-value.tsx,cn\progress-bar\indeterminate.tsx,cn\progress-bar\sizes.tsx,cn\progress-bar\without-label.tsx,cn\progress-circle\basic.tsx,cn\progress-circle\colors.tsx,cn\progress-circle\custom-styles.tsx,cn\progress-circle\custom-svg.tsx,cn\progress-circle\indeterminate.tsx,cn\progress-circle\sizes.tsx,cn\progress-circle\with-label.tsx,cn\radio-group\basic.tsx,cn\radio-group\controlled.tsx,cn\radio-group\custom-indicator.tsx,cn\radio-group\custom-styles.tsx,cn\radio-group\delivery-and-payment.tsx,cn\radio-group\disabled.tsx,cn\radio-group\horizontal.tsx,cn\radio-group\on-surface.tsx,cn\radio-group\render-function.tsx,cn\radio-group\uncontrolled.tsx,cn\radio-group\validation.tsx,cn\radio-group\variants.tsx,cn\range-calendar\allows-non-contiguous-ranges.tsx,cn\range-calendar\anchor-unavailable-dates.tsx,cn\range-calendar\basic.tsx,cn\range-calendar\booking-calendar.tsx,cn\range-calendar\controlled.tsx,cn\range-calendar\custom-styles.tsx,cn\range-calendar\day-view.tsx,cn\range-calendar\default-value.tsx,cn\range-calendar\disabled.tsx,cn\range-calendar\focused-value.tsx,cn\range-calendar\international-calendar.tsx,cn\range-calendar\invalid.tsx,cn\range-calendar\min-max-dates.tsx,cn\range-calendar\multiple-months.tsx,cn\range-calendar\read-only.tsx,cn\range-calendar\unavailable-dates.tsx,cn\range-calendar\week-view.tsx,cn\range-calendar\weeks-in-month.tsx,cn\range-calendar\with-indicators.tsx,cn\range-calendar\year-picker.tsx,cn\scroll-shadow\custom-styles.tsx,cn\scroll-shadow\default.tsx,cn\scroll-shadow\hide-scroll-bar.tsx,cn\scroll-shadow\orientation.tsx,cn\scroll-shadow\size.tsx,cn\scroll-shadow\visibility-change.tsx,cn\scroll-shadow\with-card.tsx,cn\search-field\basic.tsx,cn\search-field\controlled.tsx,cn\search-field\custom-icons.tsx,cn\search-field\custom-styles.tsx,cn\search-field\disabled.tsx,cn\search-field\form-example.tsx,cn\search-field\full-width.tsx,cn\search-field\on-surface.tsx,cn\search-field\render-function.tsx,cn\search-field\required.tsx,cn\search-field\validation.tsx,cn\search-field\variants.tsx,cn\search-field\with-description.tsx,cn\search-field\with-keyboard-shortcut.tsx,cn\search-field\with-validation.tsx,cn\select\asynchronous-loading.tsx,cn\select\controlled-multiple.tsx,cn\select\controlled-open-state.tsx,cn\select\controlled.tsx,cn\select\custom-indicator.tsx,cn\select\custom-styles.tsx,cn\select\custom-value.tsx,cn\select\default.tsx,cn\select\disabled.tsx,cn\select\full-width.tsx,cn\select\multiple-select.tsx,cn\select\on-surface.tsx,cn\select\render-function.tsx,cn\select\required.tsx,cn\select\variants.tsx,cn\select\with-description.tsx,cn\select\with-disabled-options.tsx,cn\select\with-sections.tsx,cn\separator\basic.tsx,cn\separator\custom-styles.tsx,cn\separator\render-function.tsx,cn\separator\variants.tsx,cn\separator\vertical.tsx,cn\separator\with-content.tsx,cn\separator\with-surface.tsx,cn\skeleton\animation-types.tsx,cn\skeleton\basic.tsx,cn\skeleton\card.tsx,cn\skeleton\custom-styles.tsx,cn\skeleton\grid.tsx,cn\skeleton\list.tsx,cn\skeleton\single-shimmer.tsx,cn\skeleton\text-content.tsx,cn\skeleton\user-profile.tsx,cn\slider\custom-styles.tsx,cn\slider\default.tsx,cn\slider\disabled.tsx,cn\slider\range.tsx,cn\slider\render-function.tsx,cn\slider\vertical.tsx,cn\spinner\basic.tsx,cn\spinner\colors.tsx,cn\spinner\custom-styles.tsx,cn\spinner\sizes.tsx,cn\spinner\speed.tsx,cn\surface\basic.tsx,cn\surface\custom-styles.tsx,cn\surface\variants.tsx,cn\surface\with-form-components.tsx,cn\switch\basic.tsx,cn\switch\controlled.tsx,cn\switch\custom-styles.tsx,cn\switch\default-selected.tsx,cn\switch\disabled.tsx,cn\switch\form.tsx,cn\switch\group-horizontal.tsx,cn\switch\group.tsx,cn\switch\label-position.tsx,cn\switch\render-function.tsx,cn\switch\render-props.tsx,cn\switch\sizes.tsx,cn\switch\with-description.tsx,cn\switch\with-icons.tsx,cn\switch\without-label.tsx,cn\table\async-loading.tsx,cn\table\basic.tsx,cn\table\column-resizing.tsx,cn\table\custom-cells.tsx,cn\table\custom-styles.tsx,cn\table\empty-state.tsx,cn\table\expandable-rows.tsx,cn\table\pagination.tsx,cn\table\secondary-variant.tsx,cn\table\selection.tsx,cn\table\sorting.tsx,cn\table\tanstack-table.tsx,cn\table\virtualization.tsx,cn\tabs\basic.tsx,cn\tabs\custom-styles.tsx,cn\tabs\disabled.tsx,cn\tabs\overflow.tsx,cn\tabs\render-function.tsx,cn\tabs\secondary-vertical.tsx,cn\tabs\secondary.tsx,cn\tabs\vertical.tsx,cn\tabs\with-separator.tsx,cn\tag-group\basic.tsx,cn\tag-group\controlled.tsx,cn\tag-group\custom-styles.tsx,cn\tag-group\disabled.tsx,cn\tag-group\render-function.tsx,cn\tag-group\selection-modes.tsx,cn\tag-group\sizes.tsx,cn\tag-group\variants.tsx,cn\tag-group\with-error-message.tsx,cn\tag-group\with-list-data.tsx,cn\tag-group\with-prefix.tsx,cn\tag-group\with-remove-button.tsx,cn\textarea\basic.tsx,cn\textarea\controlled.tsx,cn\textarea\custom-styles.tsx,cn\textarea\full-width.tsx,cn\textarea\on-surface.tsx,cn\textarea\rows.tsx,cn\textarea\variants.tsx,cn\textfield\basic.tsx,cn\textfield\controlled.tsx,cn\textfield\custom-styles.tsx,cn\textfield\disabled.tsx,cn\textfield\full-width.tsx,cn\textfield\input-types.tsx,cn\textfield\on-surface.tsx,cn\textfield\render-function.tsx,cn\textfield\required.tsx,cn\textfield\textarea.tsx,cn\textfield\validation.tsx,cn\textfield\with-description.tsx,cn\textfield\with-error.tsx,cn\time-field\basic.tsx,cn\time-field\controlled.tsx,cn\time-field\custom-styles.tsx,cn\time-field\disabled.tsx,cn\time-field\form-example.tsx,cn\time-field\full-width.tsx,cn\time-field\invalid.tsx,cn\time-field\on-surface.tsx,cn\time-field\render-function.tsx,cn\time-field\required.tsx,cn\time-field\with-description.tsx,cn\time-field\with-prefix-and-suffix.tsx,cn\time-field\with-prefix-icon.tsx,cn\time-field\with-suffix-icon.tsx,cn\time-field\with-validation.tsx,cn\toast\callbacks.tsx,cn\toast\custom-indicator.tsx,cn\toast\custom-queue.tsx,cn\toast\custom-styles.tsx,cn\toast\custom-toast.tsx,cn\toast\default.tsx,cn\toast\placements.tsx,cn\toast\promise.tsx,cn\toast\simple.tsx,cn\toast\variants.tsx,cn\toggle-button-group\attached.tsx,cn\toggle-button-group\basic.tsx,cn\toggle-button-group\controlled.tsx,cn\toggle-button-group\custom-styles.tsx,cn\toggle-button-group\disabled.tsx,cn\toggle-button-group\full-width.tsx,cn\toggle-button-group\orientation.tsx,cn\toggle-button-group\selection-mode.tsx,cn\toggle-button-group\sizes.tsx,cn\toggle-button-group\without-separator.tsx,cn\toggle-button\basic.tsx,cn\toggle-button\controlled.tsx,cn\toggle-button\custom-styles.tsx,cn\toggle-button\disabled.tsx,cn\toggle-button\icon-only.tsx,cn\toggle-button\sizes.tsx,cn\toggle-button\variants.tsx,cn\toolbar\attached.tsx,cn\toolbar\basic.tsx,cn\toolbar\custom-styles.tsx,cn\toolbar\vertical.tsx,cn\toolbar\with-button-group.tsx,cn\tooltip\basic.tsx,cn\tooltip\custom-styles.tsx,cn\tooltip\custom-trigger.tsx,cn\tooltip\placement.tsx,cn\tooltip\render-function.tsx,cn\tooltip\with-arrow.tsx,cn\typography\custom-styles.tsx,cn\typography\default.tsx,cn\typography\primitives.tsx,cn\typography\prose.tsx,cn\typography\render-props.tsx,cn\typography\typography-scale.tsx,en\accordion\basic.tsx,en\accordion\controlled.tsx,en\accordion\custom-indicator.tsx,en\accordion\custom-styles.tsx,en\accordion\disabled.tsx,en\accordion\faq.tsx,en\accordion\multiple.tsx,en\accordion\render-function.tsx,en\accordion\surface.tsx,en\accordion\without-separator.tsx,en\alert-dialog\backdrop-variants.tsx,en\alert-dialog\close-methods.tsx,en\alert-dialog\controlled.tsx,en\alert-dialog\custom-animations.tsx,en\alert-dialog\custom-backdrop.tsx,en\alert-dialog\custom-icon.tsx,en\alert-dialog\custom-portal.tsx,en\alert-dialog\custom-styles.tsx,en\alert-dialog\custom-trigger.tsx,en\alert-dialog\default.tsx,en\alert-dialog\dismiss-behavior.tsx,en\alert-dialog\placements.tsx,en\alert-dialog\sizes.tsx,en\alert-dialog\statuses.tsx,en\alert\basic.tsx,en\alert\custom-styles.tsx,en\autocomplete\allows-empty-collection.tsx,en\autocomplete\asynchronous-filtering.tsx,en\autocomplete\controlled-multiple.tsx,en\autocomplete\controlled-open-state.tsx,en\autocomplete\controlled.tsx,en\autocomplete\custom-indicator.tsx,en\autocomplete\custom-styles.tsx,en\autocomplete\custom-value.tsx,en\autocomplete\default.tsx,en\autocomplete\disabled.tsx,en\autocomplete\email-recipients.tsx,en\autocomplete\full-width.tsx,en\autocomplete\location-search.tsx,en\autocomplete\multiple-select.tsx,en\autocomplete\on-surface.tsx,en\autocomplete\required.tsx,en\autocomplete\tag-group-selection.tsx,en\autocomplete\user-selection-multiple.tsx,en\autocomplete\user-selection.tsx,en\autocomplete\variants.tsx,en\autocomplete\virtualization.tsx,en\autocomplete\with-description.tsx,en\autocomplete\with-disabled-options.tsx,en\autocomplete\with-sections.tsx,en\avatar\basic.tsx,en\avatar\colors.tsx,en\avatar\custom-image-component.tsx,en\avatar\custom-styles.tsx,en\avatar\fallback.tsx,en\avatar\group.tsx,en\avatar\sizes.tsx,en\avatar\variants.tsx,en\badge\basic.tsx,en\badge\colors.tsx,en\badge\custom-styles.tsx,en\badge\dot.tsx,en\badge\placements.tsx,en\badge\sizes.tsx,en\badge\variants.tsx,en\badge\with-content.tsx,en\breadcrumbs\basic.tsx,en\breadcrumbs\custom-separator.tsx,en\breadcrumbs\custom-styles.tsx,en\breadcrumbs\disabled.tsx,en\breadcrumbs\level-2.tsx,en\breadcrumbs\level-3.tsx,en\breadcrumbs\render-function.tsx,en\button-group\basic.tsx,en\button-group\custom-styles.tsx,en\button-group\disabled.tsx,en\button-group\full-width.tsx,en\button-group\orientation.tsx,en\button-group\sizes.tsx,en\button-group\variants.tsx,en\button-group\with-icons.tsx,en\button-group\without-separator.tsx,en\button\basic.tsx,en\button\custom-styles.tsx,en\button\custom-variants.tsx,en\button\disabled.tsx,en\button\full-width.tsx,en\button\icon-only.tsx,en\button\loading-state.tsx,en\button\loading.tsx,en\button\release-outline-variant.tsx,en\button\render-function.tsx,en\button\ripple-effect.tsx,en\button\sizes.tsx,en\button\social.tsx,en\button\variants.tsx,en\button\with-icons.tsx,en\calendar\basic.tsx,en\calendar\booking-calendar.tsx,en\calendar\controlled.tsx,en\calendar\custom-icons.tsx,en\calendar\custom-styles.tsx,en\calendar\day-view.tsx,en\calendar\default-value.tsx,en\calendar\disabled.tsx,en\calendar\focused-value.tsx,en\calendar\international-calendar.tsx,en\calendar\min-max-dates.tsx,en\calendar\multiple-months.tsx,en\calendar\multiple-selection.tsx,en\calendar\read-only.tsx,en\calendar\unavailable-dates.tsx,en\calendar\week-view.tsx,en\calendar\weeks-in-month.tsx,en\calendar\with-indicators.tsx,en\calendar\year-picker.tsx,en\card\custom-styles.tsx,en\card\default.tsx,en\card\horizontal.tsx,en\card\variants.tsx,en\card\with-avatar.tsx,en\card\with-form.tsx,en\card\with-images.tsx,en\checkbox-group\basic.tsx,en\checkbox-group\controlled.tsx,en\checkbox-group\custom-styles.tsx,en\checkbox-group\disabled.tsx,en\checkbox-group\features-and-addons.tsx,en\checkbox-group\indeterminate.tsx,en\checkbox-group\on-surface.tsx,en\checkbox-group\render-function.tsx,en\checkbox-group\validation.tsx,en\checkbox-group\with-custom-indicator.tsx,en\checkbox\basic.tsx,en\checkbox\controlled.tsx,en\checkbox\custom-indicator.tsx,en\checkbox\custom-styles.tsx,en\checkbox\default-selected.tsx,en\checkbox\disabled.tsx,en\checkbox\external-label.tsx,en\checkbox\form.tsx,en\checkbox\full-rounded.tsx,en\checkbox\indeterminate.tsx,en\checkbox\invalid.tsx,en\checkbox\render-function.tsx,en\checkbox\render-props.tsx,en\checkbox\variants.tsx,en\checkbox\with-description.tsx,en\chip\basic.tsx,en\chip\custom-styles.tsx,en\chip\release-vibrant-palette.tsx,en\chip\statuses.tsx,en\chip\variants.tsx,en\chip\with-icon.tsx,en\close-button\custom-styles.tsx,en\close-button\default.tsx,en\close-button\interactive.tsx,en\close-button\with-custom-icon.tsx,en\color-area\basic.tsx,en\color-area\controlled.tsx,en\color-area\custom-styles.tsx,en\color-area\disabled.tsx,en\color-area\render-function.tsx,en\color-area\space-and-channels.tsx,en\color-area\with-dots.tsx,en\color-field\basic.tsx,en\color-field\channel-editing.tsx,en\color-field\controlled.tsx,en\color-field\custom-styles.tsx,en\color-field\disabled.tsx,en\color-field\form-example.tsx,en\color-field\full-width.tsx,en\color-field\invalid.tsx,en\color-field\on-surface.tsx,en\color-field\render-function.tsx,en\color-field\required.tsx,en\color-field\variants.tsx,en\color-field\with-description.tsx,en\color-picker\basic.tsx,en\color-picker\controlled.tsx,en\color-picker\custom-styles.tsx,en\color-picker\with-fields.tsx,en\color-picker\with-sliders.tsx,en\color-picker\with-swatches.tsx,en\color-slider\alpha-channel.tsx,en\color-slider\basic.tsx,en\color-slider\channels.tsx,en\color-slider\controlled.tsx,en\color-slider\custom-styles.tsx,en\color-slider\disabled.tsx,en\color-slider\render-function.tsx,en\color-slider\rgb-channels.tsx,en\color-slider\vertical.tsx,en\color-swatch-picker\basic.tsx,en\color-swatch-picker\controlled.tsx,en\color-swatch-picker\custom-indicator.tsx,en\color-swatch-picker\custom-styles.tsx,en\color-swatch-picker\default-value.tsx,en\color-swatch-picker\disabled.tsx,en\color-swatch-picker\render-function.tsx,en\color-swatch-picker\sizes.tsx,en\color-swatch-picker\stack-layout.tsx,en\color-swatch-picker\variants.tsx,en\color-swatch\accessibility.tsx,en\color-swatch\basic.tsx,en\color-swatch\custom-styles.tsx,en\color-swatch\render-function.tsx,en\color-swatch\shapes.tsx,en\color-swatch\sizes.tsx,en\color-swatch\transparency.tsx,en\combo-box\allows-custom-value.tsx,en\combo-box\asynchronous-loading.tsx,en\combo-box\controlled-input-value.tsx,en\combo-box\controlled.tsx,en\combo-box\custom-filtering.tsx,en\combo-box\custom-indicator.tsx,en\combo-box\custom-styles.tsx,en\combo-box\custom-value.tsx,en\combo-box\default-selected-key.tsx,en\combo-box\default.tsx,en\combo-box\disabled.tsx,en\combo-box\full-width.tsx,en\combo-box\menu-trigger.tsx,en\combo-box\multiple-selection.tsx,en\combo-box\on-surface.tsx,en\combo-box\render-function.tsx,en\combo-box\required.tsx,en\combo-box\with-description.tsx,en\combo-box\with-disabled-options.tsx,en\combo-box\with-sections.tsx,en\date-field\basic.tsx,en\date-field\controlled.tsx,en\date-field\custom-styles.tsx,en\date-field\disabled.tsx,en\date-field\form-example.tsx,en\date-field\full-width.tsx,en\date-field\granularity.tsx,en\date-field\invalid.tsx,en\date-field\on-surface.tsx,en\date-field\render-function.tsx,en\date-field\required.tsx,en\date-field\variants.tsx,en\date-field\with-description.tsx,en\date-field\with-prefix-and-suffix.tsx,en\date-field\with-prefix-icon.tsx,en\date-field\with-suffix-icon.tsx,en\date-field\with-validation.tsx,en\date-picker\basic.tsx,en\date-picker\controlled.tsx,en\date-picker\custom-styles.tsx,en\date-picker\disabled.tsx,en\date-picker\form-example.tsx,en\date-picker\format-options-no-ssr.tsx,en\date-picker\format-options.tsx,en\date-picker\international-calendar.tsx,en\date-picker\render-function.tsx,en\date-picker\with-custom-indicator.tsx,en\date-picker\with-validation.tsx,en\date-range-picker\basic.tsx,en\date-range-picker\controlled.tsx,en\date-range-picker\custom-styles.tsx,en\date-range-picker\disabled.tsx,en\date-range-picker\form-example.tsx,en\date-range-picker\format-options-no-ssr.tsx,en\date-range-picker\format-options.tsx,en\date-range-picker\international-calendar.tsx,en\date-range-picker\release-input-container.tsx,en\date-range-picker\render-function.tsx,en\date-range-picker\with-custom-indicator.tsx,en\date-range-picker\with-validation.tsx,en\description\basic.tsx,en\description\custom-styles.tsx,en\disclosure-group\basic.tsx,en\disclosure-group\controlled.tsx,en\disclosure-group\custom-styles.tsx,en\disclosure\basic.tsx,en\disclosure\custom-styles.tsx,en\disclosure\render-function.tsx,en\drawer\backdrop-variants.tsx,en\drawer\basic.tsx,en\drawer\controlled.tsx,en\drawer\custom-styles.tsx,en\drawer\navigation.tsx,en\drawer\non-dismissable.tsx,en\drawer\placements.tsx,en\drawer\scrollable-content.tsx,en\drawer\with-form.tsx,en\dropdown\controlled-open-state.tsx,en\dropdown\controlled.tsx,en\dropdown\custom-styles.tsx,en\dropdown\custom-trigger.tsx,en\dropdown\default.tsx,en\dropdown\long-press-trigger.tsx,en\dropdown\single-with-custom-indicator.tsx,en\dropdown\with-custom-submenu-indicator.tsx,en\dropdown\with-descriptions.tsx,en\dropdown\with-disabled-items.tsx,en\dropdown\with-icons.tsx,en\dropdown\with-keyboard-shortcuts.tsx,en\dropdown\with-multiple-selection.tsx,en\dropdown\with-section-level-selection.tsx,en\dropdown\with-sections.tsx,en\dropdown\with-single-selection.tsx,en\dropdown\with-submenus.tsx,en\error-message\basic.tsx,en\error-message\custom-styles.tsx,en\field-error\basic.tsx,en\field-error\custom-styles.tsx,en\fieldset\basic.tsx,en\fieldset\custom-styles.tsx,en\fieldset\on-surface.tsx,en\form\basic.tsx,en\form\custom-styles.tsx,en\form\render-function.tsx,en\input-group\custom-styles.tsx,en\input-group\default.tsx,en\input-group\disabled.tsx,en\input-group\full-width.tsx,en\input-group\invalid.tsx,en\input-group\on-surface.tsx,en\input-group\password-with-toggle.tsx,en\input-group\required.tsx,en\input-group\variants.tsx,en\input-group\with-badge-suffix.tsx,en\input-group\with-copy-suffix.tsx,en\input-group\with-icon-prefix-and-copy-suffix.tsx,en\input-group\with-icon-prefix-and-text-suffix.tsx,en\input-group\with-keyboard-shortcut.tsx,en\input-group\with-loading-suffix.tsx,en\input-group\with-prefix-and-suffix.tsx,en\input-group\with-prefix-icon.tsx,en\input-group\with-suffix-icon.tsx,en\input-group\with-text-prefix.tsx,en\input-group\with-text-suffix.tsx,en\input-group\with-textarea.tsx,en\input-otp\basic.tsx,en\input-otp\controlled.tsx,en\input-otp\custom-styles.tsx,en\input-otp\disabled.tsx,en\input-otp\form-example.tsx,en\input-otp\four-digits.tsx,en\input-otp\on-complete.tsx,en\input-otp\on-surface.tsx,en\input-otp\variants.tsx,en\input-otp\with-pattern.tsx,en\input-otp\with-validation.tsx,en\input\basic.tsx,en\input\controlled.tsx,en\input\custom-styles.tsx,en\input\full-width.tsx,en\input\on-surface.tsx,en\input\types.tsx,en\input\variants.tsx,en\kbd\basic.tsx,en\kbd\custom-styles.tsx,en\kbd\inline.tsx,en\kbd\instructional.tsx,en\kbd\navigation.tsx,en\kbd\special.tsx,en\kbd\variants.tsx,en\label\basic.tsx,en\label\custom-styles.tsx,en\link\basic.tsx,en\link\custom-icon.tsx,en\link\custom-styles.tsx,en\link\icon-placement.tsx,en\link\render-function.tsx,en\link\underline-and-offset.tsx,en\list-box\controlled.tsx,en\list-box\custom-check-icon.tsx,en\list-box\custom-styles.tsx,en\list-box\default.tsx,en\list-box\multi-select.tsx,en\list-box\release-scrollbar-modes.tsx,en\list-box\render-function.tsx,en\list-box\virtualization.tsx,en\list-box\with-disabled-items.tsx,en\list-box\with-sections.tsx,en\meter\basic.tsx,en\meter\colors.tsx,en\meter\custom-styles.tsx,en\meter\custom-value.tsx,en\meter\sizes.tsx,en\meter\without-label.tsx,en\modal\backdrop-variants.tsx,en\modal\close-methods.tsx,en\modal\controlled.tsx,en\modal\custom-animations.tsx,en\modal\custom-backdrop.tsx,en\modal\custom-portal.tsx,en\modal\custom-styles.tsx,en\modal\custom-trigger.tsx,en\modal\default.tsx,en\modal\dismiss-behavior.tsx,en\modal\placements.tsx,en\modal\scroll-comparison.tsx,en\modal\sizes.tsx,en\modal\with-form.tsx,en\number-field\basic.tsx,en\number-field\controlled.tsx,en\number-field\custom-icons.tsx,en\number-field\custom-styles.tsx,en\number-field\disabled.tsx,en\number-field\form-example.tsx,en\number-field\full-width.tsx,en\number-field\on-surface.tsx,en\number-field\render-function.tsx,en\number-field\required.tsx,en\number-field\validation.tsx,en\number-field\variants.tsx,en\number-field\with-chevrons.tsx,en\number-field\with-description.tsx,en\number-field\with-format-options.tsx,en\number-field\with-step.tsx,en\number-field\with-validation.tsx,en\pagination\basic.tsx,en\pagination\controlled.tsx,en\pagination\custom-icons.tsx,en\pagination\custom-styles.tsx,en\pagination\disabled.tsx,en\pagination\simple-prev-next.tsx,en\pagination\sizes.tsx,en\pagination\with-ellipsis.tsx,en\pagination\with-summary.tsx,en\popover\basic.tsx,en\popover\custom-styles.tsx,en\popover\interactive.tsx,en\popover\placement.tsx,en\popover\render-function.tsx,en\popover\with-arrow.tsx,en\progress-bar\basic.tsx,en\progress-bar\colors.tsx,en\progress-bar\custom-styles.tsx,en\progress-bar\custom-value.tsx,en\progress-bar\indeterminate.tsx,en\progress-bar\sizes.tsx,en\progress-bar\without-label.tsx,en\progress-circle\basic.tsx,en\progress-circle\colors.tsx,en\progress-circle\custom-styles.tsx,en\progress-circle\custom-svg.tsx,en\progress-circle\indeterminate.tsx,en\progress-circle\sizes.tsx,en\progress-circle\with-label.tsx,en\radio-group\basic.tsx,en\radio-group\controlled.tsx,en\radio-group\custom-indicator.tsx,en\radio-group\custom-styles.tsx,en\radio-group\delivery-and-payment.tsx,en\radio-group\disabled.tsx,en\radio-group\horizontal.tsx,en\radio-group\on-surface.tsx,en\radio-group\render-function.tsx,en\radio-group\uncontrolled.tsx,en\radio-group\validation.tsx,en\radio-group\variants.tsx,en\range-calendar\allows-non-contiguous-ranges.tsx,en\range-calendar\anchor-unavailable-dates.tsx,en\range-calendar\basic.tsx,en\range-calendar\booking-calendar.tsx,en\range-calendar\controlled.tsx,en\range-calendar\custom-styles.tsx,en\range-calendar\day-view.tsx,en\range-calendar\default-value.tsx,en\range-calendar\disabled.tsx,en\range-calendar\focused-value.tsx,en\range-calendar\international-calendar.tsx,en\range-calendar\invalid.tsx,en\range-calendar\min-max-dates.tsx,en\range-calendar\multiple-months.tsx,en\range-calendar\read-only.tsx,en\range-calendar\unavailable-dates.tsx,en\range-calendar\week-view.tsx,en\range-calendar\weeks-in-month.tsx,en\range-calendar\with-indicators.tsx,en\range-calendar\year-picker.tsx,en\scroll-shadow\custom-styles.tsx,en\scroll-shadow\default.tsx,en\scroll-shadow\hide-scroll-bar.tsx,en\scroll-shadow\orientation.tsx,en\scroll-shadow\size.tsx,en\scroll-shadow\visibility-change.tsx,en\scroll-shadow\with-card.tsx,en\search-field\basic.tsx,en\search-field\controlled.tsx,en\search-field\custom-icons.tsx,en\search-field\custom-styles.tsx,en\search-field\disabled.tsx,en\search-field\form-example.tsx,en\search-field\full-width.tsx,en\search-field\on-surface.tsx,en\search-field\render-function.tsx,en\search-field\required.tsx,en\search-field\validation.tsx,en\search-field\variants.tsx,en\search-field\with-description.tsx,en\search-field\with-keyboard-shortcut.tsx,en\search-field\with-validation.tsx,en\select\asynchronous-loading.tsx,en\select\controlled-multiple.tsx,en\select\controlled-open-state.tsx,en\select\controlled.tsx,en\select\custom-indicator.tsx,en\select\custom-styles.tsx,en\select\custom-value.tsx,en\select\default.tsx,en\select\disabled.tsx,en\select\full-width.tsx,en\select\multiple-select.tsx,en\select\on-surface.tsx,en\select\render-function.tsx,en\select\required.tsx,en\select\variants.tsx,en\select\with-description.tsx,en\select\with-disabled-options.tsx,en\select\with-sections.tsx,en\separator\basic.tsx,en\separator\custom-styles.tsx,en\separator\render-function.tsx,en\separator\variants.tsx,en\separator\vertical.tsx,en\separator\with-content.tsx,en\separator\with-surface.tsx,en\skeleton\animation-types.tsx,en\skeleton\basic.tsx,en\skeleton\custom-styles.tsx,en\skeleton\grid.tsx,en\skeleton\list.tsx,en\skeleton\single-shimmer.tsx,en\skeleton\text-content.tsx,en\skeleton\user-profile.tsx,en\slider\custom-styles.tsx,en\slider\default.tsx,en\slider\disabled.tsx,en\slider\range.tsx,en\slider\render-function.tsx,en\slider\vertical.tsx,en\spinner\basic.tsx,en\spinner\colors.tsx,en\spinner\custom-styles.tsx,en\spinner\sizes.tsx,en\spinner\speed.tsx,en\surface\basic.tsx,en\surface\custom-styles.tsx,en\surface\variants.tsx,en\surface\with-form-components.tsx,en\switch\basic.tsx,en\switch\controlled.tsx,en\switch\custom-styles.tsx,en\switch\default-selected.tsx,en\switch\disabled.tsx,en\switch\form.tsx,en\switch\group-horizontal.tsx,en\switch\group.tsx,en\switch\label-position.tsx,en\switch\render-function.tsx,en\switch\render-props.tsx,en\switch\sizes.tsx,en\switch\with-description.tsx,en\switch\with-icons.tsx,en\switch\without-label.tsx,en\table\async-loading.tsx,en\table\basic.tsx,en\table\column-resizing.tsx,en\table\custom-cells.tsx,en\table\custom-styles.tsx,en\table\empty-state.tsx,en\table\expandable-rows.tsx,en\table\pagination.tsx,en\table\secondary-variant.tsx,en\table\selection.tsx,en\table\sorting.tsx,en\table\tanstack-table.tsx,en\table\virtualization.tsx,en\tabs\basic.tsx,en\tabs\custom-styles.tsx,en\tabs\disabled.tsx,en\tabs\overflow.tsx,en\tabs\render-function.tsx,en\tabs\secondary-vertical.tsx,en\tabs\secondary.tsx,en\tabs\vertical.tsx,en\tabs\with-separator.tsx,en\tag-group\basic.tsx,en\tag-group\controlled.tsx,en\tag-group\custom-styles.tsx,en\tag-group\disabled.tsx,en\tag-group\render-function.tsx,en\tag-group\selection-modes.tsx,en\tag-group\sizes.tsx,en\tag-group\variants.tsx,en\tag-group\with-error-message.tsx,en\tag-group\with-list-data.tsx,en\tag-group\with-prefix.tsx,en\tag-group\with-remove-button.tsx,en\textarea\basic.tsx,en\textarea\controlled.tsx,en\textarea\custom-styles.tsx,en\textarea\full-width.tsx,en\textarea\on-surface.tsx,en\textarea\rows.tsx,en\textarea\variants.tsx,en\textfield\basic.tsx,en\textfield\controlled.tsx,en\textfield\custom-styles.tsx,en\textfield\disabled.tsx,en\textfield\full-width.tsx,en\textfield\input-types.tsx,en\textfield\on-surface.tsx,en\textfield\render-function.tsx,en\textfield\required.tsx,en\textfield\textarea.tsx,en\textfield\validation.tsx,en\textfield\with-description.tsx,en\textfield\with-error.tsx,en\time-field\basic.tsx,en\time-field\controlled.tsx,en\time-field\custom-styles.tsx,en\time-field\disabled.tsx,en\time-field\form-example.tsx,en\time-field\full-width.tsx,en\time-field\invalid.tsx,en\time-field\on-surface.tsx,en\time-field\render-function.tsx,en\time-field\required.tsx,en\time-field\with-description.tsx,en\time-field\with-prefix-and-suffix.tsx,en\time-field\with-prefix-icon.tsx,en\time-field\with-suffix-icon.tsx,en\time-field\with-validation.tsx,en\toast\callbacks.tsx,en\toast\custom-indicator.tsx,en\toast\custom-queue.tsx,en\toast\custom-styles.tsx,en\toast\custom-toast.tsx,en\toast\default.tsx,en\toast\placements.tsx,en\toast\promise.tsx,en\toast\simple.tsx,en\toast\variants.tsx,en\toggle-button-group\attached.tsx,en\toggle-button-group\basic.tsx,en\toggle-button-group\controlled.tsx,en\toggle-button-group\custom-styles.tsx,en\toggle-button-group\disabled.tsx,en\toggle-button-group\full-width.tsx,en\toggle-button-group\orientation.tsx,en\toggle-button-group\selection-mode.tsx,en\toggle-button-group\sizes.tsx,en\toggle-button-group\without-separator.tsx,en\toggle-button\basic.tsx,en\toggle-button\controlled.tsx,en\toggle-button\custom-styles.tsx,en\toggle-button\disabled.tsx,en\toggle-button\icon-only.tsx,en\toggle-button\sizes.tsx,en\toggle-button\variants.tsx,en\toolbar\attached.tsx,en\toolbar\basic.tsx,en\toolbar\custom-styles.tsx,en\toolbar\vertical.tsx,en\toolbar\with-button-group.tsx,en\tooltip\basic.tsx,en\tooltip\custom-styles.tsx,en\tooltip\custom-trigger.tsx,en\tooltip\placement.tsx,en\tooltip\render-function.tsx,en\tooltip\with-arrow.tsx,en\typography\custom-styles.tsx,en\typography\default.tsx,en\typography\primitives.tsx,en\typography\prose.tsx,en\typography\render-props.tsx,en\typography\typography-scale.tsx}
<!-- HEROUI-REACT-AGENTS-MD-END -->
