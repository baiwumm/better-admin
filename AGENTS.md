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
├── react/                   # React + Shadcn Admin（UI 基准）
├── vue/                     # Vue + Shadcn Admin 风格
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
- 技术栈：React + Shadcn Admin + Tailwind CSS + TypeScript
- 职责：以 **Shadcn Admin 源码作为主要基础进行二次开发**，是整套产品的 **UI 基准版本**。
- 数据流：`Browser → React → NestJS API → PostgreSQL`（不直接连接数据库）。

### 4.2 Vue

- 目录：`/vue`
- 技术栈：Vue + Shadcn Admin 风格 + TypeScript
- 职责：尽可能还原 React 版本的页面结构、UI 设计、组件、交互、数据展示与用户体验。
- 数据流：`Browser → Vue → NestJS API → PostgreSQL`（不直接连接数据库）。

### 4.3 Next.js（全栈）

- 目录：`/next`
- 技术栈：Next.js App Router / Server Components 等全栈能力 + TypeScript
- 职责：独立实现页面、UI、API、服务端逻辑、数据库访问、用户认证与权限控制，**不依赖 NestJS**。
- 数据流：`Browser → Next.js → PostgreSQL`。

### 4.4 Nuxt（全栈）

- 目录：`/nuxt`
- 技术栈：Nuxt 3 + Nitro Server + TypeScript
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

- **设计基准：Shadcn Admin。** React 版本直接基于 Shadcn Admin 二次开发；Vue、Next.js、Nuxt 版本按 React 版本实现。
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

1. **React 是 UI 基准版本**，基于 Shadcn Admin 进行二次开发。
2. **Vue、Next.js、Nuxt 的 UI 应尽可能与 React 版本保持一致**（包括组件、视觉与交互）。
3. **React 和 Vue 使用 NestJS API**；不得绕过 NestJS 直接访问数据库。
4. **Next.js 和 Nuxt 采用各自的全栈能力，不依赖 NestJS**。
5. **所有版本共用同一个 PostgreSQL 数据库**（同一套 Schema）。
6. **Supabase 仅作为 PostgreSQL 托管平台**，不使用 Supabase Auth 与 RLS。
7. **浏览器端禁止直接连接数据库**；数据库连接信息只存在于服务端环境变量。
8. **不允许为了方便而修改既定的项目架构**（架构约束见本文档与 requirements.md）。
9. **不同技术栈之间的业务逻辑、数据结构和 API Contract 应尽可能保持一致**。
10. **不要为了实现某一个版本而破坏其他版本的设计一致性。**

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

如果 React 版本尚未实现某个页面：**不要自行在其他技术栈创造一套新的 UI 方案**，应优先保持设计语言与 Shadcn Admin 基准一致。

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
- 等待 **Phase 1B：Better Admin UI 定制**（品牌化、Layout/Sidebar 调整、页面规划、Demo 清理）。
