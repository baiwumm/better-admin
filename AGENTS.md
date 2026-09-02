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
- 职责：`/react` 基于 **Hero UI 模板实现，不含 Shadcn UI 组件**；业务模块迁移期间以 `/react-shadcn`（原 Shadcn Admin 实现）为只读参考，做能力等价重写（见 §4.6），是整套产品的 **UI Source of Truth**（页面结构 / UI 设计 / 交互 / UX / Design Tokens / 组件行为）。
- 数据流：`Browser → React → NestJS API → PostgreSQL`（不直接连接数据库）。

### 4.6 React 迁移策略（`/react` 与 `/react-shadcn` 的关系）

`/react-shadcn`（基于官方 Shadcn Admin v2.2.1 二次开发）是**旧实现**，沉淀了既有的 Layout、页面、组件与业务能力，是迁移的**只读源**；`/react` 以 **Hero UI 初始化模板**创建，是**迁移目标**与新的 UI 基准（UI Source of Truth）。迁移过程是**渐进式**地按模块把 `/react-shadcn` 的功能与页面搬到 `/react`，而非一次性替换。

**迁移原则**：

1. **渐进式**：不一次性迁移全部模块，按模块逐个推进，每完成一个模块即保持 `/react` 可运行。
2. **功能等同**：迁移后的模块在功能、数据展示、交互上须与 `/react-shadcn` 对应模块保持一致，不丢失业务能力。
3. **组件映射**：优先使用 Hero UI 组件对应原 Shadcn UI 组件（遵循 §7.2 组件优先级）；无对应 Hero UI 组件时按策略补充 Shadcn UI 或自定义组件。
4. **保持可运行**：每次迁移提交后 `/react` 必须保持可构建、可运行，不留下半成品或破坏现有页面。
5. **阶段性提交**：每个模块迁移以独立、清晰的提交完成，便于 review 与回滚。
6. **参考源只读**：`/react-shadcn` 仅作只读参考与比对，**不得修改**其代码（见 §18 第 13 条）。

**迁移进度表**（完成 `/react-shadcn` 删除后，本节整体移除）

| 模块 | 对应 `/react-shadcn` 源 | 状态 |
| --- | --- | --- |
| Layout | `layout/` 相关 | 🔲 待迁移 |
| Dashboard | `dashboard/` / 概览 | 🔲 待迁移 |
| 用户管理 | `users/` | ✅ 已上线（2026-08-30，真实业务替换 keepAlive 演示页） |
| 角色管理 | `roles/` | ✅ 已上线（2026-08-30） |
| 权限管理 | `permissions/` | ✅ 已上线（2026-08-28） |
| 菜单管理 | `menus/` | ✅ 已上线（2026-08-29） |
| 系统设置 | `settings/` | — 模块已移除（契约 v1.3），无迁移计划 |
| 日志管理 | —（`/react-shadcn` 无日志页实现，按用户管理页风格新设计） | ✅ 已上线（2026-08-31，契约 v1.4.8） |
| 认证 | `auth/` / 登录登出 | ✅ 已上线（2026-08-27，含记住我 / 会话真撤销） |

> 字典管理不在此表（`/react-shadcn` 无对应源，为新增模块）；各阶段明细见 [`docs/progress.md`](docs/progress.md)。

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
- Supabase 仅作为 **PostgreSQL 托管平台**：**不使用** Supabase Auth、RLS（Row Level Security）、Edge Functions。
- **Storage 唯一豁免（v1.5.0）**：用户头像这类静态文件允许使用 Supabase Storage（bucket `avatars`，public read）；上传一律由**服务端持有密钥中转**，浏览器端不接触 Storage 密钥、不直接读写 Storage，也不使用 Storage RLS 策略。API 密钥使用新体系 `sb_secret_`（Secret key），只走 `apikey` 请求头。
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

- **OpenAPI 是 Better Admin 项目的 API Contract 唯一事实来源（Single Source of Truth）**：API 设计**优先定义 Contract，再进行实现**；NestJS / Next.js / Nuxt 的 Server API 与 React / Vue 前端请求都必须遵循同一 Contract。
- 请求参数、响应结构、错误结构、分页结构、字段命名必须保持一致；**不允许任何技术栈为了实现方便而自行修改 API Contract**。
- 修改 API Contract 时，必须**同步评估 React、Vue、Next.js、Nuxt、NestJS** 受到的影响，确认后再执行。

---

## 7. UI 一致性要求

### 7.1 UI Source of Truth 与设计基准

- **React 是 Better Admin 的 UI Source of Truth**：页面结构、UI 设计、交互、UX、Design Tokens、组件行为均以 React 版本为基准。React 保持 Source of Truth **并不意味着 React 必须全部使用 Shadcn UI**。
- React 版本（`/react`）基于 Hero UI 模板实现，不含 Shadcn UI 组件；业务模块迁移期间以 `/react-shadcn`（原 Shadcn Admin 实现）为只读参考（见 §4.6）。**UI 组件库策略独立定义**（见 §7.2）。
- Vue、Next.js、Nuxt 版本按 React 版本实现，保持页面、组件行为、视觉与交互一致。

### 7.2 UI 组件库策略（核心规则）

| 技术栈 | 主组件库 | 补充 |
| --- | --- | --- |
| React / Next.js | **Hero UI** | Shadcn UI（组件优先级：Hero UI > Shadcn UI > Custom Component） |
| Vue / Nuxt | **Shadcn UI** | 暂不切换 Hero UI，未来是否切换另行评估 |

- **样式变量**：React / Next.js 以 Hero UI Design System 为参考形成一套项目级 Design Tokens，Hero UI + Shadcn UI + 自定义组件共用（见 §7.3）。
- **整个项目**：React 仍然是 UI / UX Source of Truth；不同技术栈可以使用不同 UI 组件库，但最终页面必须保持统一的视觉、交互、结构和用户体验。
- **HeroUI 文档**：HeroUI v3 文档索引位于 `./.heroui-docs/react`，任何 HeroUI 组件任务**先查文档再动手**（凭记忆写 HeroUI v3 API 极易出错）；本文档的自动索引块已移除，需要时可用 `heroui agents-md --react --output AGENTS.md` 重新生成。

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

## 13. 文件组织规范与文档体系

- 各子项目遵循其框架约定的目录结构（Next.js App Router、Nuxt、Vue CLI / Vite、NestJS 模块化、React 组件分层）。
- 业务模块在各项目中按模块/领域组织（用户、角色、权限、菜单、设置、日志），并尽量保持跨技术栈的结构对应关系。

### 文档体系（单一职责，规则只在一处维护）

| 文档 | 职责 |
| --- | --- |
| `AGENTS.md` | 硬性规则 + 当前阶段/待办指针；**不存放进度细节** |
| `docs/progress.md` | 阶段性进度记录，新条目**追加在最上方**（倒序）；只记录「做了什么 / 关键决策 / 已知限制」，不写规则 |
| `docs/mechanisms.md` | 机制沉淀（代码行为的技术结论，代码为准） |
| `docs/requirements.md` | 业务需求真源 |
| `docs/ui-spec.md` | UI 规范真源（AGENTS.md §7 只留策略级规则） |
| `docs/react.md` / `docs/routing.md` | React 版本说明 / 路由说明 |
| `docs/react-performance.md` | `vercel-react-best-practices` Skill 的项目适用政策 |
| `nest/docs/*` | 后端数据库设计、OpenAPI Contract 设计说明 |

**更新触发**：

- 每完成一个阶段/模块 → `docs/progress.md` 新增条目（置顶）+ `AGENTS.md` 当前阶段指针同步。
- 契约/Schema 变更 → `nest/openapi/openapi.yaml` / `nest/docs/database-design.md` 先行更新，`docs/progress.md` 记录变更。
- 发现可复用的机制结论 → 沉淀到 `docs/mechanisms.md`，进度条目里只留一行引用。
- **现状与历史分离**：描述「当前是什么」的表述过时必须更新；描述「当时做了什么」的记录（`docs/progress.md` 条目、各文档变更记录表、README 阶段历史）**永不回改**——事实修正写新条目，不改旧条目。
- 引用其他文档一律用**相对路径 + 章节号**，**禁止整段复制规则内容**（避免多源漂移）。

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

### 版本统一管理

- 整个仓库是**同一套产品的多套实现**，版本按**产品级**统一管理：根目录 `package.json`（仅元数据、不放依赖）的 `version` 是唯一真源。
- 各子项目 package.json 保留各自的 `version` 字段（工具链友好），约定同一 release 内与根保持一致。
- 发布流程：改根 version → `pnpm sync-versions`（`scripts/sync-versions.mjs`，按子目录存在性分发，未变化的文件不重写）→ 单个提交 `chore: release vX.Y.Z` → 打 git tag `vX.Y.Z`。
- 该约定不引入 workspace 依赖提升，各子项目仍独立 install / build / deploy；Vercel / Render 部署的 Root Directory 指向子目录，根 package.json 不参与部署。

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

1. **React 是 UI 基准版本（UI Source of Truth）**，`/react` 基于 Hero UI 实现；UI 组件库策略遵循 §7.2：React / Next.js 以 **Hero UI 为主、Shadcn UI 为补充**，Vue / Nuxt 以 **Shadcn UI 为主**。
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

Better Admin 是一个长期、多技术栈项目。AI Agent 应按照阶段逐步开发，**不应一次性修改多个技术栈**（默认开发顺序见下文「开发顺序建议」）。

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

当修改数据库 Schema、API Contract、用户/角色/权限/菜单模型或核心业务规则时，必须考虑对其他技术栈的影响。

例如修改用户字段时，需要评估 `NestJS`、`React`、`Vue`、`Next.js`、`Nuxt`、`Database`、`OpenAPI` 是否需要同步修改。

但是：**评估影响 ≠ 立即修改所有项目。**

如果当前处于单一技术栈开发阶段，只修改当前阶段需要修改的项目，并**记录后续需要同步的内容**。

### UI 基准版本

**React 是 Better Admin 的 UI Source of Truth**，不仅是视觉参考，也是页面布局、组件行为、交互、响应式行为、Dark Mode、Loading / Empty / Error State 的参考基准。Vue、Next.js、Nuxt 后续实现时，应优先参考已经完成的 React 版本。

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

> 约定：任何业务开发前先读本文件与 `docs/requirements.md`（见文档开头）；改动某版本时评估其对 UI / 业务 / 数据结构 / API Contract 一致性的影响（见「跨技术栈一致性检查」）；阶段性工作完成后按 §10 规范提交。

---

## 19. 当前阶段状态

> 阶段性进度记录已全部移至 [`docs/progress.md`](docs/progress.md)（按时间倒序），本节只保留当前快照；阶段由用户明确安排后再推进。

- **当前阶段**：React 端业务模块迁移推进中（React + NestJS 全栈阶段）。已完成：React Hero UI 迁移启动、NestJS + PostgreSQL 后端（契约 v1.6.0），React 端登录认证 / 全站国际化 / 权限管理 / 菜单管理 / 字典管理 / 角色管理 / 用户管理 / 日志管理 / 我的账户均已上线（含用户写操作保护 v1.4.6、登录鉴权加固 v1.4.7、日志操作人摘要与批量删除 v1.4.8、我的账户与 Supabase Storage 头像上传 v1.5.0、删除头像 v1.5.1、个人链接三字段 v1.5.2、用户管理列改版与侧边栏个人链接菜单 v1.5.3）；组织中心阶段 1（契约 v1.6.0 + 迁移 0007 + 组织管理前后端）、阶段 2（岗位管理 + 人员通讯录 + 用户管理组织/岗位关联编辑闭环）与阶段 3（契约 v1.7.0 + 公告管理 + 站内信铃铛 + Tiptap 富文本 + Modal.Footer 结构全站修正）已完成（2026-09-01，详见 progress.md）；`UserInfo` 通用用户信息展示组件已沉淀（侧边栏与日志操作人列复用，Avatar 需随 avatar 值重建子树以规避 Radix 状态残留）；`DeptTreeSelect` 平铺缩进树下拉组件已沉淀（组织父级 / 用户所属组织 / 岗位所属组织复用，HeroUI 无 Tree 组件）；`DeptTreePanel` 组织树面板与 `RichTextEditor`（Tiptap）+ `sanitizeNoticeHtml`（DOMPurify 渲染端消毒）已沉淀。
- **当前待办（记录在案）**：组织中心阶段 4（架构图谱 ECharts + 通讯录 Excel 导出，依赖引入待确认）；概览 Dashboard 仍待迁移；`roles.enabled` 参与权限聚合待评估；`PUT /users/{id}` 的 `roleIds` 可摘除 super_admin 绑定（v1.4.6 已知未拦点，评估是否限制）；前端 `hasPermission`（全部位命中）与后端同名函数（任一位命中）多权限位语义待对齐；存量库需执行 `nest/scripts/migrate-menus-add-grant-bit.ts` 补录角色管理菜单 GRANT 声明位（v1.4.4）；存量库需执行 `pnpm db:migrate`（v1.5.0 迁移 0005、v1.5.2 迁移 0006、v1.6.0 迁移 0007）并执行 `nest/scripts/migrate-menus-add-org.ts` 幂等补录组织菜单三个子菜单（v1.6.0，本地库已执行），配置 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` 后执行 `pnpm storage:init`；Vue / Next / Nuxt 后续实现 account 模块与 AuthUser `avatar / phone / tags` 字段直接跟上 v1.5.0，实现组织模块时跟上 v1.6.0（users 表新增 `dept_id / employee_no / employment_status / entry_date`、用户关联六字段与 org 模块为共享 Schema 变更）。
- **super_admin 保护设计依据（重要，勿推翻）**：超管的"全量权限"不是代码身份判定，而是 seed 写入 role_menus 的 -1n 全量位经登录/每请求实时 OR 聚合而来（`auth.service.aggregatePermissions`）；PermissionsGuard 与菜单可见性的"超管免检"分支判据都是聚合值。清空其授权 = 全后台立即 403 且无自助恢复手段，故 `PUT /roles/{id}/menus` 与 `DELETE /roles/{id}` 对 `code === 'super_admin'` 必须返回 403 `SUPER_ADMIN_ROLE_PROTECTED`（详细背景见 progress.md 契约 v1.4.2/v1.4.3 条目）。

---

## 20. React / Next.js 全局性能规范（vercel-react-best-practices）

- 所有 **React / Next.js 代码生成与重构**（新建组件 / 页面、数据获取、重构、性能优化）必须遵循全局安装的 `vercel-react-best-practices` Skill（`~/.agents/skills/vercel-react-best-practices`，规则详情以 Skill 为准）。
- 触发范围、Skill 优先加载、冲突裁决与适用范围限定等项目政策详见 [`docs/react-performance.md`](docs/react-performance.md)；若与本文档架构约束冲突，以本文档为高优先级。
