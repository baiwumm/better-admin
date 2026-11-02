# AGENTS.md — Better Admin 项目开发指南

> 指导 AI Agent 与开发者进行整个 Better Admin 项目的开发；业务开发前必读本文档与 [`docs/requirements.md`](docs/requirements.md)。
> 本文件只存**硬性规则 + 当前阶段指针**，细则一律「相对路径 + 章节号」指向真源文档，禁止复制规则内容（§13）。章节编号被全仓 110+ 处引用，**不得重排**；§18 有序列表条目只追加、不插入。

## 1. 项目简介

Better Admin 是用 **React、Vue、Next.js、Nuxt、NestJS** 分别实现的全栈 Admin 系统，核心理念是**同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用不同技术栈完成实现**。定位与目标详见 [`docs/requirements.md`](docs/requirements.md) §1-§2。

## 2. 项目目标

- 所有版本共用**同一个 PostgreSQL 数据库**（Supabase 托管）。
- UI、业务逻辑、数据结构与 API Contract 跨技术栈**尽可能一致**（详见 requirements.md §2）。

## 3. 项目结构与多应用管理

**单仓库、多独立应用**：每个 `apps/*` 都能独立运行 / 构建 / 部署（如 `cd apps/react && pnpm dev`）。

```text
better-admin/
├── apps/       # react（UI 基准）· vue · next · nuxt（两个独立全栈）· nest（API）· website（文档站，Next.js 静态导出）
├── docs/       # 项目文档（§13）
├── assets/     # 跨端品牌资产真源 assets/logo/（ui-spec §19）
├── scripts/    # 仓库级脚本（sync-versions 等）
└── package.json  # 仅元数据；version 是全产品版本唯一真源（§15）
```

- **不引入 pnpm workspace**，各应用独立 lockfile——这是子目录独立部署的前提；`apps/` 分层仅是组织约定，不产生技术栈耦合。

## 4. 各技术栈职责

| 技术栈 | 核心约束 |
| --- | --- |
| **React** (`apps/react`) | UI Source of Truth；Hero UI 模板实现，不含 Shadcn UI（§7.2）；经 NestJS API 访问数据库 |
| **Vue** (`apps/vue`) | 还原 React 版页面 / 交互 / UX；Nuxt UI v4（§21）；经 NestJS API 访问数据库 |
| **Next.js** (`apps/next`) | 独立全栈，**不依赖 NestJS**；Hero UI 为主（§7.2） |
| **Nuxt** (`apps/nuxt`) | 独立全栈，**不依赖 NestJS**；Nuxt UI v4（§21） |
| **NestJS** (`apps/nest`) | 为 React / Vue 提供 REST API；NestJS + Drizzle ORM + PostgreSQL |

详细职责、目录结构与数据流见 requirements.md §4。

## 5. 数据库架构

- **统一 PostgreSQL**（Supabase 托管），仅作数据库平台；**不使用** Supabase Auth、RLS、Edge Functions。
- **Storage 唯一豁免**：用户头像可用 Supabase Storage（bucket `avatars`，public read）；上传由**服务端持密钥中转**，浏览器端不接触密钥；API 密钥用 `sb_secret_` 前缀、只走 `apikey` 请求头。
- **浏览器端禁止直接访问 PostgreSQL**，连接信息只存在于服务端环境变量。
- **ORM 一律 Drizzle**，禁止仅因偏好更换；无论 ORM 是否一致，PostgreSQL Schema / 数据模型 / 业务规则 / 数据类型 / API Contract **五项一致**。服务端数据库代码动手前先查 `.agents/skills/drizzle-orm`（§18 第 7 条）。

## 6. API 架构

- React / Vue 消费 **NestJS** REST API；Next.js / Nuxt 各自实现 Server API。
- **OpenAPI 是 API Contract 唯一事实来源**（`apps/nest/openapi/openapi.yaml`）：**先定义 Contract，再实现**；所有技术栈遵循同一 Contract，不得为实现方便自行修改。
- 修改 Contract 必须先评估 **React、Vue、Next.js、Nuxt、NestJS** 五端影响；契约 / Schema 变更先更新 openapi.yaml 与 `apps/nest/docs/database-design.md`，再动实现。

## 7. UI 一致性要求

- **7.1 设计基准**：**React 是 UI Source of Truth**（页面结构、交互、Design Tokens、组件行为、Loading / Empty / Error State、Responsive、Dark Mode）；React 未实现的页面，其他栈**不得自行创造 UI 方案**，保持设计语言与基准一致。
- **7.2 UI 组件库策略**：React / Next.js = **Hero UI + 项目级自定义组件**两级（Shadcn UI 层级已于 2026-09-22 作废）；Vue / Nuxt = **Nuxt UI v4 唯一组件库**。细则单源 [`docs/ui-spec.md`](docs/ui-spec.md) §18.3，Vue / Nuxt 细则见 §21 与 [`docs/nuxt-ui-guide.md`](docs/nuxt-ui-guide.md)。⚠️ **浮层开合状态必须用 Hero UI 的 `useOverlayState()`**（`isOpen` / `onOpenChange` 挂最外层 Overlay 组件，`state.open()` / `close()` / `toggle()` 触发），**禁止裸 `useState` 布尔量控制浮层**——否则 react-aria 受控流不匹配、弹窗不显示（编码级规则，单点维护在本条）。HeroUI 组件任务**先查文档再动手**：`.heroui-docs/react` 索引可能滞后于依赖版本，新组件以官方站 + `node_modules` 内 `.d.ts` / 源码取证为准。
- **7.3 Design Tokens**：React / Next.js 以 Hero UI 设计体系为主要参考形成**一套项目级 Design Tokens**，全站共用这一套；主色 / Background / Border / Focus / Radius / Typography / Spacing / Shadow / Dark Mode 全覆盖，项目级自定义组件复用同一视觉体系（细则 ui-spec §18.3）。
- **7.4 跨端一致**：页面、UI 组件、视觉（色彩 / 字体 / 间距 / 圆角 / 阴影 / 图标风格）四端保持一致，组件清单见 requirements.md §7.2。

## 8. 认证与权限要求

- **不使用 Supabase Auth**，认证体系由应用自身实现；四端行为保持一致（登录 / 登出 / Session / 用户身份 / 路由权限 / API 权限）。
- 权限模型 **RBAC**：用户 ↔ 角色 ↔ 权限（位掩码），支持菜单与权限关联控制；**服务端必须校验 API 权限**，不能只依赖前端路由守卫。

## 9. 环境变量管理规范

- 各子项目维护 `.env.local` / `.env`，提供 `.env.example` 提交仓库；**真实密钥（数据库连接串、JWT 密钥、OAuth Secret）严禁入库**。
- 数据库连接信息只在**服务端**环境变量；前端可见变量必须显式带公开前缀（`VITE_*` / `NEXT_PUBLIC_*` / `NUXT_PUBLIC_*`）；命名用大写下划线（`DATABASE_URL`、`JWT_SECRET`）。

## 10. Git 提交规范

- **Conventional Commits**：`feat / fix / docs / style / refactor / perf / test / chore / build / ci`；描述用中文，格式 `<type>: <简短描述>`（如 `feat: 用户管理新增分页功能`）。
- 提交前保持代码可构建、测试通过；**单次提交单一目的**。

## 11. 代码规范

统一 **Prettier** 格式化（遵循各子项目既定配置）+ **ESLint** 静态检查（提交前 0 error）。

## 12. TypeScript 规范

- 全项目 **TypeScript 严格模式**，类型显式标注到接口边界（公共函数签名、业务数据结构、API 请求 / 响应）。
- 业务数据类型（用户 / 角色 / 权限 / 菜单）定义清晰 interface 并跨栈一致；API 请求 / 响应类型与 API Contract 对齐；共享结构尽量从 OpenAPI 单源派生。

## 13. 文件组织规范与文档体系

- 各子项目遵循框架约定目录结构（Next App Router、Nuxt、NestJS 模块化等）；业务模块按领域组织（用户 / 角色 / 权限 / 菜单 / 设置 / 日志），保持跨栈结构对应。
- **文档体系（单一职责，规则只在一处维护）**：

| 文档 | 职责 |
| --- | --- |
| `AGENTS.md` | 硬性规则 + 当前阶段指针；不存放进度细节 |
| `docs/progress.md` | 阶段进度（新条目**置顶**倒序）；查「某模块何时 / 为何做成现在这样」进这里；只记「做了什么 / 关键决策 / 已知限制」 |
| `docs/mechanisms.md` | 机制沉淀（代码行为的技术结论，代码为准）；遇反直觉框架 / 库行为、排查「为何这样实现」先查这里 |
| `docs/requirements.md` | 业务需求真源 |
| `docs/ui-spec.md` | UI 规范真源（本文件 §7 只留策略级） |
| `docs/feature-matrix.md` | **四端功能对齐状态唯一追踪源**（✅/🔧/❌）；查某功能某端做没做进这里（里程碑代号定义在其头部） |
| `docs/react.md` / `docs/routing.md` | React 版本 / 路由说明（不维护完成状态） |
| `docs/react-performance.md` | Vercel React Skills 项目适用政策（§20 指向） |
| `docs/nuxt-ui-guide.md` | Nuxt UI 组件使用指引（§21 指向） |
| `docs/launch-runbook.md` | 上线操作手册：部署顺序、环境变量、冒烟与回滚（版本更新复用） |
| `docs/launch-audit.md` / `docs/code-review-backlog.md` | 上线审计台账（已归档只读）/ 代码审查未修项追踪 |
| `apps/nest/docs/*` | 数据库设计、OpenAPI Contract 设计说明 |

- **更新触发**：完成阶段 → progress.md 置顶条目 + §19 同步；契约 / Schema 变更 → openapi.yaml / database-design.md 先行；机制结论 → mechanisms.md（进度条目只留一行引用）；新增功能 → feature-matrix.md（§18 第 5 条）。
- **现状与历史分离**：「当前是什么」的表述过时必须更新；「当时做了什么」的记录（progress 条目、变更记录表、README 阶段历史）**永不回改**，事实修正写新条目。

## 14. 命名规范

目录 / 文件 kebab-case；组件 PascalCase（与文件名一致）；函数 / 变量 / 字段 camelCase；常量 UPPER_SNAKE_CASE；路由 / URL kebab-case；API 契约字段 camelCase 跨端一致，避免命名漂移。

## 15. 依赖与版本管理

- 包管理器统一 **pnpm**，依赖锁版本（lockfile），各子项目依赖相互独立；安装新依赖前按 §18 第 10 条评审。
- **版本按产品级统一**：根 `package.json` 的 `version` 是唯一真源，各子项目 version 同 release 内保持一致。发布流程：改根 version → `pnpm sync-versions`（未变化文件不重写）→ 单提交 `chore: release vX.Y.Z`（先合入 main）→ `git tag vX.Y.Z && git push origin vX.Y.Z` → CI `.github/workflows/release.yml` 自动创建 GitHub Release（tag 校验根 version 一致 + 必须落在 main 上；本仓不发 npm 包）。

## 16. 测试与常用命令

- 关键业务逻辑与 API 要有自动化测试（重点：用户 / 角色 / 权限）；前端重组件与关键交互，后端重 API 与业务逻辑；数据库测试用隔离库（nest e2e 走共享库 e2e schema，坑见 mechanisms §42）。
- 各端命令以**环境真源为准**：dev / build / lint / test / type-check（或 typecheck）等 scripts 一律查各端 `package.json`（勿在本文件维护副本）；语言包完整性：react / next 跑 `check-locales`，vue / nuxt 由 `sync-locales` 在 dev / build / test 前自动同步，CI `check-locales.yml` 把关。

## 17. 部署规范

- **平台分工速览**：React / Vue / Next / Nuxt → Vercel（React / Vue 为纯静态 SPA，2026-11-02 由 CF Workers 改判过来）；website → CF Workers 静态导出；NestJS → Render；数据库 → Supabase PostgreSQL。**各端域名、环境变量、部署顺序与回滚以 [`docs/launch-runbook.md`](docs/launch-runbook.md) 为唯一真源**；六端已于 2026-09-23 上线，线上即演示环境（Nest / Next / Nuxt `DEMO_MODE=true`）。
- React / Vue 的 SPA 深链回退由各端 `vercel.json` 的 `rewrites: /(.*) → /index.html` 提供（Vercel 在文件系统匹配之后才应用 rewrites，静态资源不受影响；**缺它刷新任意深链即返回 `X-Vercel-Error: NOT_FOUND`**）。原 `wrangler.jsonc` 的 `not_found_handling` 与 Pages `_redirects` 方案一并作废；域名仍在 Cloudflare DNS，CNAME 指向 Vercel 时代理必须设 **DNS only（灰云）**。
- **Next / Nuxt 必须留 Vercel**：数据层是 postgres.js TCP 直连，Workers 运行时跑不了。
- ⚠️ **Nest Render 保活（勿动）**：UptimeRobot **HTTP(S) 类型**每 5-10 分钟探活无鉴权 `GET /api/health`（无 DB 访问）；**禁止 PING（ICMP）类型**——它不发 HTTP 请求，只会永远 Down 而服务其实健康（机理与验证口径 mechanisms §39）。

## 18. AI Agent 开发规则（硬性）

1. **不允许为了方便而修改既定的项目架构**（架构约束见本文档与 requirements.md）。
2. **不要为了实现某一个版本而破坏其他版本的设计一致性**。
3. **React / Next.js 代码生成与重构必须遵循 Vercel 官方 React Skills 三件套**（性能 / 组合模式 / View Transitions，详见 §20）；与本文档架构约束、UI 组件库策略（§7.2）冲突时以后者更高优先级，但性能模式不得无故违反。
4. **全局语言规则（跨会话持久生效）**：全部对话、思考与回复一律**中文**；代码注释、文档、提交信息也以中文为主，仅代码标识符、命令、API 字段等必须英文的场合保留英文。
5. **功能矩阵同步（跨会话持久生效）**：新增功能、完成迁移或功能状态变化时**必须同步 `docs/feature-matrix.md`**，并在提交信息中体现；该文件是四端对齐状态唯一追踪源。
6. **Skill 安装位置统一（跨会话持久生效）**：项目级 Skill 一律装到 `.agents/skills/<skill-name>/`，装入前先 `ls .agents/skills/` 查重（现有清单以目录为准，勿在本文件维护副本）；禁止 `.claude/skills/`、`agent/` 等重复位置，skills CLI 若自动生成 `.claude/` 符号链接应删除。
7. **Server 端数据库代码必须参考 `drizzle-orm` Skill**（schema / 查询 / 事务 / 迁移 / relations，重点吸收其反模式清单）。该 Skill 为社区维护（非官方），与项目实际行为冲突时**以项目既有代码与 drizzle-orm 0.45 实际行为为准**。
8. **Nuxt 开发必须遵循官方完整指南（跨会话持久生效）**：一切 Nuxt 开发先查证 https://nuxt.com/llms-full.txt ，**禁止凭记忆使用 Nuxt API**；能力有官方 Module 或框架内置机制时优先采用；与本文档冲突时以本文档为高优先级。
9. **需求优先级**：用户当前明确需求 > `docs/requirements.md` > `AGENTS.md` > 项目现有代码与架构 > 框架官方最佳实践。需求与既有规则冲突时：**不静默修改架构、不自行选方案**，明确指出冲突、给出可选方案、**等确认后再动架构**。
10. **不擅自引入依赖**：新依赖先评估是否真的需要 / 有无现有替代 / 维护成本 / 对跨栈一致性的影响；有简单原生实现或既有能力时优先用现有能力。
11. **不擅自修改架构**：数据库 Schema、API Contract、目录结构、ORM、认证方案、UI 基础方案、状态管理、请求库均不得因任务方便而更换；确需修改先说明原因与影响。
12. **阶段性开发**：**一次只改当前阶段涉及的技术栈**，新想法只登记不动手（开发顺序 Phase 1-7 已全部走完，定义见 requirements.md §15，项目现处持续迭代期）。阶段完成的门槛全部可观测：受影响端 `build` 通过、类型检查 0 error、改动文件 eslint 0 error、测试全绿；随后总结修改、明确阶段状态、等待用户安排下一阶段。
13. **跨技术栈一致性检查**：改 Schema、Contract、核心模型或业务规则时必须评估 **NestJS、React、Vue、Next.js、Nuxt 五端与数据库 / OpenAPI 真源**的影响——**评估 ≠ 立即全改**：单栈阶段只改当前栈，待同步项**登记到 progress.md 当前条目**（写明涉及端与文件），完成同步后销项。
14. **UI 基准**：React 不仅是视觉参考，也是布局、组件行为、响应式、Dark Mode 与三态（Loading / Empty / Error）的参考基准；对齐口径见 §7。

## 19. 当前阶段状态

> 进度细节一律查 [`docs/progress.md`](docs/progress.md)（倒序）与 feature-matrix；本节只留快照与「勿遗忘」约束。

- **当前阶段**：六端统一上线已完成（2026-09-23）后进入持续迭代，最新版本 **v1.1.0**（tag 见 release.yml 流程）。近期里程碑：Nest e2e 基建 31 用例（2026-09-25，mechanisms §42）、refresh token 同秒重复缺陷 jti 根治（2026-09-25，§42 坑 4）、Nest auth 限流 + trust proxy 三跳（2026-10-14，§43）、Vercel WAF 防刷上线（runbook §0.3）、React / Vue 迁 Vercel + 两端接入站点分析并线上复验通过（2026-11-02，runbook §2.4）。
- **当前待办**：**已清零**；新待办出现时在此登记。
- 📌 **备忘（非待办）**：CI `nest-e2e` 走自托管 TLS postgres 容器，初版方案的 `TEST_DATABASE_URL` secret 已不再使用、可删；Supabase 直连 / pooler 不可用作 CI 测试库的原因见 mechanisms §42。
- ⚠️ **website 内容是手写 MDX、不是 `docs/` 的自动同步**（`apps/website/content/**` 独立维护）——`docs/` 每次口径变化必须人工回写文档站（曾因此积压过时数字，launch-audit #11 / #12）。
- **品牌标识**：已定稿方案 03「Monogram B」精修版，真源 `assets/logo/`；除 Next 外五端的 `public/` 图标 + Next 端 `src/app/` 文件约定图标均由 `build-assets.py` 统一生成，**新增端或图标路径必须同步扩展脚本**；几何常量与验收口径 ui-spec §19。⚠️ Next 的 file-based metadata 优先于 `metadata.icons`。
- **super_admin 保护设计（勿推翻）**：超管「全量权限」是 seed 写入 role_menus 的 `-1n` 全量位经登录 / 每请求实时 OR 聚合而来（`auth.service.aggregatePermissions`），**不是代码身份判定**；清空授权 = 全后台立即 403 且无自助恢复，故 `PUT /roles/{id}/menus` 与 `DELETE /roles/{id}` 对 `code === 'super_admin'` 必须返回 403 `SUPER_ADMIN_ROLE_PROTECTED`（背景见 progress.md 当时的契约 v1.4.2 / v1.4.3 条目——契约版本独立于产品版本编号，现行 v1.14.1）。
- **Playground 演示场**：10 页四端全部对齐（明细见 feature-matrix）；引入会自行输出 className 的第三方渲染器前，先查与 HeroUI 全局 BEM 类撞名（mechanisms §27，曾发生 prism `.tag` 撞 HeroUI Tag）。
- **TanStack 官方 Skills（暂缓安装，勿遗忘）**：官方 SKILL.md 内嵌于 npm 包，项目已装版本尚不含；待四端下次例行升级 TanStack 全家桶（react / next 端的 react-query / react-table / react-router，vue / nuxt 端的 vue-query / vue-table）时随包带入并在 §20 登记，**不要为获取 Skill 单独发起依赖升级**（§15 锁版本约定）。

## 20. React / Next.js 全局规范（Vercel Skills）

- React / Next.js 一切代码生成与重构必须遵循三件套：`vercel-react-best-practices`（性能与正确性）、`vercel-composition-patterns`（组合模式与组件 API，含 React 19 变更）、`vercel-react-view-transitions`（动画过渡，扩展动画不引入第三方库），均装于 `.agents/skills/`。
- 触发范围、冲突裁决与适用范围限定详见 [`docs/react-performance.md`](docs/react-performance.md)；与本文档架构约束冲突时以本文档为高优先级；Vue / Nuxt 不适用本节（见 §21）。
- **Next.js 框架 API / 行为以包内内置官方文档为准**：`apps/next/node_modules/next/dist/docs/`（版本与依赖精确匹配，随 install 到位）——先查文档再写 Next API，不凭训练记忆；升级 Next 16.3+ 后 `next dev` 自动生成的 agent 规则文件须人工核对不覆盖本文档。

## 21. Vue / Nuxt 全局组件规范（Nuxt UI）

> 本节为 Vue / Nuxt 范围内的更高优先级规则，与 §7.2 相关表述冲突时以本节为准；操作细则见 [`docs/nuxt-ui-guide.md`](docs/nuxt-ui-guide.md)。

- **组件库唯一**：Vue 与 Nuxt 统一 **Nuxt UI v4**（`@nuxt/ui`）；**禁止引入** Vuetify、Quasar、Element Plus、PrimeVue、shadcn-vue 等替代库。
- **组件优先级（硬性）**：Nuxt UI 内置 → 项目级自定义组件（基于 Nuxt UI 原子组件拼装，注释说明原因）→ 第三方 Vue 组件库（必须先评审：记录理由 + 替代方案，批准后引入）。
- **布局硬约束**：侧边栏 / 顶部栏 / 命令面板必须优先官方 Dashboard 套件（`UDashboardGroup` / `UDashboardPanel` / `UDashboardSidebar` / `UDashboardNavbar` / `UDashboardSearch` / `UCommandPalette` 等），禁止从零手写。
- **图表库不属于「UI 组件库唯一」约束**：Vue 端 = **Unovis**（`@unovis/vue` + `@unovis/ts` 精确锁版），Nuxt 端 = **nuxt-charts**；不强求同源引擎，只对齐功能与信息口径（选型实测 mechanisms §32）。
- **主题策略**：直接用 Nuxt UI 默认 Design Tokens 与 Color System，暗色由内置 color mode 提供；不从 React 端移植 token、不建映射层；品牌定制经 `ui({ ui: { colors } })`，禁止业务代码硬编码色值。
- **代码生成前置检查**：产出前 ① 确认 Skill 可用（`npx skills ls` 应列出 `nuxt/ui` 与 antfu 系列，Vue / Nuxt 全套已装于项目级 `.agents/skills/`）；② 查 Nuxt UI 官方文档确认组件存在、API 正确，**禁止凭记忆或猜测使用 Nuxt UI API**。
- **UI 对齐口径**：页面结构、布局骨架、交互行为与 React 端一致（侧边栏折叠、Header 操作区顺序等）；组件视觉直接用 Nuxt UI 默认风格，不刻意模仿 HeroUI；品牌标识一致；**功能对齐优先于像素级对齐**。
