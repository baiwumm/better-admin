# AGENTS.md — Better Admin 项目开发指南

> 本文件用于指导后续 AI Agent 与开发者进行整个 Better Admin 项目的开发。
> 在开始任何业务开发之前，请务必完整阅读本文档与 [`docs/requirements.md`](docs/requirements.md)。

---

## 1. 项目简介

Better Admin 是一个使用 **React、Vue、Next.js、Nuxt、NestJS** 分别实现的全栈 Admin 系统，核心理念是**同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用不同技术栈完成实现**。

> 项目定位、目标与技术栈角色详见 [`docs/requirements.md`](docs/requirements.md) §1-§4。

---

## 2. 项目目标

> 完整目标与技术栈定位详见 [`docs/requirements.md`](docs/requirements.md) §2。以下为本文件需要的规则性约束：

- 所有版本共用**同一个 PostgreSQL 数据库**（Supabase 托管）。
- 保持 UI、业务逻辑、数据结构与 API Contract 在各技术栈间**尽可能一致**。

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
├── vue/                     # Vue + Nuxt UI
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

> 各技术栈的详细职责、目录结构与数据流详见 [`docs/requirements.md`](docs/requirements.md) §4。以下为 AGENTS 约束要点：

| 技术栈 | 核心约束 |
| --- | --- |
| **React** (`/react`) | UI Source of Truth；Hero UI 模板实现，不含 Shadcn UI 组件（§7.2）；通过 NestJS API 访问数据库 |
| **Vue** (`/vue`) | 还原 React 版本的页面/交互/UX；Nuxt UI v4 为主（§21）；通过 NestJS API 访问数据库 |
| **Next.js** (`/next`) | 独立全栈，**不依赖 NestJS**；Hero UI 为主（§7.2） |
| **Nuxt** (`/nuxt`) | 独立全栈，**不依赖 NestJS**；Nuxt UI v4 为主（§21） |
| **NestJS** (`/nest`) | 为 React 和 Vue 提供 REST API；NestJS + Drizzle ORM + PostgreSQL |

---

## 5. 数据库架构

> 数据库设计、Supabase 使用范围与访问原则详见 [`docs/requirements.md`](docs/requirements.md) §5。以下为 AGENTS 约束要点：

- **统一 PostgreSQL**（Supabase 托管），仅作数据库平台使用；**不使用** Supabase Auth、RLS、Edge Functions。
- **Storage 唯一豁免（v1.5.0）**：用户头像允许使用 Supabase Storage（bucket `avatars`，public read）；上传由**服务端持有密钥中转**，浏览器端不接触密钥、不直接读写 Storage。API 密钥使用 `sb_secret_` 前缀，只走 `apikey` 请求头。
- **浏览器端禁止直接访问 PostgreSQL**；数据库连接信息只存在于服务端环境变量。
- **默认 ORM 为 Drizzle ORM**；禁止仅因个人偏好更换；无论 ORM 是否一致，必须保证 PostgreSQL Schema / 数据模型 / 业务规则 / 数据类型 / API Contract **五项一致**。

---

## 6. API 架构

> RESTful 设计、返回结构与 API 示例详见 [`docs/requirements.md`](docs/requirements.md) §8-§9。

- React 与 Vue 使用 **NestJS** REST API；Next.js 与 Nuxt 各自实现 Server API。
- **OpenAPI 是 API Contract 唯一事实来源**：API 设计**优先定义 Contract，再进行实现**；所有技术栈必须遵循同一 Contract，不允许为实现方便而自行修改。
- 修改 API Contract 时，必须**同步评估 React、Vue、Next.js、Nuxt、NestJS** 受到的影响，确认后再执行。

---

## 7. UI 一致性要求

### 7.1 UI Source of Truth 与设计基准

- **React 是 Better Admin 的 UI Source of Truth**：页面结构、UI 设计、交互、UX、Design Tokens、组件行为均以 React 版本为基准。React 保持 Source of Truth **并不意味着 React 必须全部使用 Shadcn UI**。
- React 版本（`/react`）基于 Hero UI 模板实现，不含 Shadcn UI 组件。**UI 组件库策略独立定义**（见 §7.2）。
- Vue、Next.js、Nuxt 版本按 React 版本实现，保持页面、组件行为、视觉与交互一致。

### 7.2 UI 组件库策略（核心规则）

| 技术栈 | 主组件库 | 补充 |
| --- | --- | --- |
| React / Next.js | **Hero UI** | Shadcn UI（组件优先级：Hero UI > Shadcn UI > Custom Component） |
| Vue / Nuxt | **Nuxt UI v4** | 唯一组件库，禁止替代库（组件优先级与操作指引见 §21 与 `docs/nuxt-ui-guide.md`） |

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
  - **页面**：Dashboard、用户管理、角色管理、权限管理、菜单管理、日志、其他业务页面。
  - **UI 组件**：Sidebar、Header、Breadcrumb、Table、Form、Dialog、Drawer、Dropdown、Command、Tabs、Card、Button、Input、Select、Date Picker、Toast、Pagination、Empty / Loading / Error State。
  - **视觉**：色彩体系、字体体系、间距、圆角、阴影、图标风格、Dark Mode、Responsive 行为保持一致。

---

## 8. 认证与权限要求

> 认证架构详见 [`docs/requirements.md`](docs/requirements.md) §11。

- 项目**不使用 Supabase Auth**，认证体系由应用自身实现。
- 四个版本需保持基本一致的认证与权限行为（登录 / 登出 / Session / 用户身份 / 角色 / 权限 / 路由权限 / API 权限）。
- 权限模型采用 **RBAC**：用户 ↔ 角色 ↔ 权限（位掩码），并支持菜单与权限的关联控制。
- **服务端必须对 API 做权限校验**，不能只依赖前端路由守卫。

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
| `docs/feature-matrix.md` | **功能矩阵**：四种前端实现的功能对齐状态（✅/❌），新增功能必须同步更新 |
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
https://nest.baiwumm.com
```

- **数据库**：Supabase PostgreSQL。
- 每个子项目应能独立构建、独立部署；环境变量在对应部署平台配置。

---

## 18. AI Agent 开发规则（重要）

以下为所有 AI Agent 在开发 Better Admin 时必须遵守的**硬性规则**。架构约束（§3-§8）不在此重复，详见对应章节。

1. **不允许为了方便而修改既定的项目架构**（架构约束见本文档与 requirements.md）。
2. **不要为了实现某一个版本而破坏其他版本的设计一致性**。
3. **React / Next.js 代码生成与重构必须遵循 `vercel-react-best-practices` Skill**（详见 §20）。该 Skill 已全局安装（`~/.agents/skills/vercel-react-best-practices`），是所有 React / Next.js 代码产出（新建组件 / 页面、数据获取、重构、性能优化）的硬性性能与正确性规范；若与其冲突，以本文档的架构约束与 UI 组件库策略（§7.2）为更高优先级，但性能模式不得无故违反。
4. **全局语言规则（跨会话持久生效）**：所有 AI Agent 在本项目中的**全部对话、思考过程与回复一律使用中文**。代码注释、文档、提交信息（Conventional Commits 描述）也以中文为主；仅在代码标识符、命令、API 字段等必须使用英文的场合保留英文。此规则覆盖所有会话，不局限于单一对话。
5. **功能矩阵同步（跨会话持久生效）**：每次新增功能模块、完成模块迁移、或功能状态发生变化时，**必须同步更新 `docs/feature-matrix.md`**。更新时机：功能开发完成后立即更新对应技术栈的状态标记（✅/🔧/❌），并在提交信息中体现。该文件是四种前端实现功能对齐状态的唯一追踪源。
6. **Skill 安装位置统一（跨会话持久生效）**：项目级 Agent Skill 一律安装到 `.agents/skills/<skill-name>/`（universal skill 约定路径，现有 `heroui-react`、`vercel-react-best-practices` 即在此）。禁止生成或保留 `.claude/skills/`、`agent/` 等其他位置的重复副本；安装 / 更新 Skill 时只维护 `.agents/skills/` 一份，避免多副本漂移。

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

- **当前阶段**：React + NestJS 全栈已完成，Next.js 全栈版已上线。Vue / Nuxt 尚未启动。
- **React 端已完成模块**：登录认证 / 全站国际化 / 权限管理 / 菜单管理 / 字典管理 / 角色管理 / 用户管理 / 日志管理 / 我的账户 / 组织中心全套（组织管理 / 岗位管理 / 通讯录 / 公告管理 / 站内信 / 架构图谱 / 导出）。
- **Next.js 端已完成模块**：与 React 端对齐（认证 / Admin 布局 / 用户 / 角色 / 菜单 / 字典 / 日志 / 我的账户 / 组织中心全套）。
- **当前待办**：Dashboard 概览页（React / Next.js 均未实现，图表库已定 Recharts）；Next.js Vercel 部署 + CI 挂接；`docs/mechanisms.md` 沉淀 Next 期机制结论。Vue / Nuxt 后续实现时直接跟上最新契约版本（详见 progress.md 各阶段条目）。
- **super_admin 保护设计依据（重要，勿推翻）**：超管的"全量权限"不是代码身份判定，而是 seed 写入 role_menus 的 -1n 全量位经登录/每请求实时 OR 聚合而来（`auth.service.aggregatePermissions`）；PermissionsGuard 与菜单可见性的"超管免检"分支判据都是聚合值。清空其授权 = 全后台立即 403 且无自助恢复手段，故 `PUT /roles/{id}/menus` 与 `DELETE /roles/{id}` 对 `code === 'super_admin'` 必须返回 403 `SUPER_ADMIN_ROLE_PROTECTED`（详细背景见 progress.md 契约 v1.4.2/v1.4.3 条目）。

---

## 20. React / Next.js 全局性能规范（vercel-react-best-practices）

- 所有 **React / Next.js 代码生成与重构**（新建组件 / 页面、数据获取、重构、性能优化）必须遵循全局安装的 `vercel-react-best-practices` Skill（`~/.agents/skills/vercel-react-best-practices`，规则详情以 Skill 为准）。
- 触发范围、Skill 优先加载、冲突裁决与适用范围限定等项目政策详见 [`docs/react-performance.md`](docs/react-performance.md)；若与本文档架构约束冲突，以本文档为高优先级。

---

## 21. Vue / Nuxt 全局组件规范（Nuxt UI）

- **组件库唯一**：Vue（`/vue`）与 Nuxt（`/nuxt`）端 UI 组件库统一为 **Nuxt UI v4**（`@nuxt/ui`，Tailwind CSS v4 + Reka UI）。**禁止引入** Vuetify、Quasar、Element Plus、PrimeVue、shadcn-vue 等替代 UI 库。
- **组件优先级（硬性）**：Nuxt UI 内置组件（`@nuxt/ui`）→ Nuxt UI 没有对应组件 / 不适合当前场景时用项目级自定义组件（基于 Nuxt UI 原子组件拼装，代码注释说明原因）→ 第三方 Vue 组件库（必须先评审：记录理由 + 替代方案评估，批准后方可引入）。
- **布局硬约束**：侧边栏 / 顶部栏 / 命令面板必须优先使用官方 Dashboard 套件（`UDashboardGroup` / `UDashboardPanel` / `UDashboardSidebar` / `UDashboardNavbar` / `UDashboardSearch` / `UCommandPalette` 等），禁止从零手写布局。命名说明：`UDashboardLayout` 为 v3 名称，v4 对应组件为 `UDashboardGroup`。
- **代码生成前置检查**：任何涉及 Vue / Nuxt 的代码生成任务，产出代码前必须：① 确认 Skill 可用（`npx skills ls -g` 应列出 `nuxt/ui` 与 antfu/skills 系列，全局安装于 `~/.agents/skills/`）；② 查阅 Nuxt UI 官方文档确认目标组件存在、API 用法正确；**禁止凭记忆或猜测使用 Nuxt UI API**。
- **主题策略**：直接使用 Nuxt UI 默认 Design Tokens 与 Color System，暗色模式由其内置 color mode（`useColorMode`）提供；不从 React 端移植 `theme.css` token、不建立 `--ui-*` 映射层；品牌定制通过 Nuxt UI 的 `ui({ ui: { colors } })` 配置实现，禁止在业务代码中硬编码色值。
- **UI 对齐口径**：页面结构、布局骨架、交互行为与 React 端保持一致（侧边栏折叠/展开、Header 操作区顺序、表格工具栏位置等）；组件视觉直接使用 Nuxt UI 默认风格，不刻意模仿 React（HeroUI）样式；品牌标识（Logo、产品名）保持一致；**功能对齐优先于像素级视觉对齐**。
- **操作指引**：组件优先级、常用组件映射、Dashboard 套件示例、HeroUI 对照表、纯 Vue 安装事实见 [`docs/nuxt-ui-guide.md`](docs/nuxt-ui-guide.md)。
- 本节为 Vue / Nuxt 范围内的更高优先级规则，与 §7.2 中 Vue / Nuxt 相关表述冲突时以本节为准。
