# Better Admin

> 基于统一设计与业务逻辑，使用 Next.js、Nuxt、React、Vue、NestJS 等现代 Web 技术栈实现的全栈 Admin 系统。

> **文档性质**：业务需求真源（What），实现细节与状态见各专项文档；本文描述「当前是什么」，阶段性进度见 `progress.md`。

## 1. 项目概述

### 1.1 项目名称

**Better Admin**

仓库名称：

```text
better-admin
```

### 1.2 项目定位

Better Admin 是一个基于现代 Web 技术栈构建的全栈 Admin 系统。

项目以 **React 版本（基于 Hero UI 实现）** 作为前端 UI / UX 的基准（UI Source of Truth）；不同技术栈采用各自的 UI 组件库（React / Next.js：**Hero UI 为主 + Shadcn UI 补充**；Vue / Nuxt：**Nuxt UI v4 为主**），在保持整体视觉风格、页面结构和交互体验一致的前提下，分别使用不同的前端及全栈技术进行实现。

项目的核心目标不是开发多套不同的后台系统，而是：

> **同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，使用不同技术栈完成实现。**

通过这种方式，对比和实践 React、Vue、Next.js、Nuxt、NestJS 等现代 Web 技术栈。

---

# 2. 项目目标

## 2.1 核心目标

最终完成一套完整、可实际使用的 Admin 系统，并提供以下四种前端实现：

- React
- Vue
- Next.js
- Nuxt

同时提供独立的 NestJS 后端服务，为 React 和 Vue 提供 API 支持。

---

## 2.2 技术栈目标

项目最终包含：

| 技术栈 | 定位 | 后端方式 |
| --- | --- | --- |
| React | 前端 | NestJS API |
| Vue | 前端 | NestJS API |
| Next.js | 全栈 | Next.js Server |
| Nuxt | 全栈 | Nuxt Server / Nitro |
| NestJS | 后端 API | PostgreSQL |

数据库统一使用：

- PostgreSQL
- Supabase 托管

---

# 3. 总体架构

项目目录：

```text
better-admin/
├── next/                    # Next.js 全栈实现
├── nuxt/                    # Nuxt 全栈实现
├── react/                   # React（UI 基准；Hero UI 为主 + Shadcn UI 补充）
├── vue/                     # Vue + Nuxt UI
├── nest/                    # NestJS 后端 API
├── docs/                    # 项目文档
├── README.md
├── AGENTS.md
└── package.json             # 可选 Workspace 配置
```

---

# 4. 各项目职责

## 4.1 React

目录：

```text
/react
```

定位：

> React 前端版本。

基础：

- React
- Tailwind CSS
- TypeScript
- UI 组件库：**Hero UI（为主）+ Shadcn UI（补充）**（见 §7.3）

React 版本（`/react`）基于 Hero UI 模板实现，不含 Shadcn UI 组件。UI 组件库策略遵循「渐进式调整」：新增功能优先 Hero UI，不做一次性大规模重构。

React 不直接连接数据库。

数据请求：

```text
React
  ↓
NestJS API
  ↓
PostgreSQL
```

---

## 4.2 Vue

目录：

```text
/vue
```

定位：

> Vue 前端版本。

Vue 需要尽可能还原 React 版本的：

- 页面结构
- UI 设计
- 组件
- 交互
- 数据展示
- 用户体验

Vue 不直接连接数据库。

数据请求：

```text
Vue
  ↓
NestJS API
  ↓
PostgreSQL
```

---

## 4.3 Next.js

目录：

```text
/next
```

定位：

> Next.js 全栈版本。

Next.js 需要独立实现：

- 页面
- UI
- API
- 服务端逻辑
- 数据库访问
- 用户认证
- 权限控制

Next.js 不依赖 NestJS API。

数据流：

```text
Browser
   ↓
Next.js
   ↓
PostgreSQL
```

---

## 4.4 Nuxt

目录：

```text
/nuxt
```

定位：

> Nuxt 全栈版本。

Nuxt 需要独立实现：

- 页面
- UI
- API
- Server API
- 服务端业务逻辑
- 数据库访问
- 用户认证
- 权限控制

Nuxt 不依赖 NestJS API。

数据流：

```text
Browser
   ↓
Nuxt
   ↓
PostgreSQL
```

---

## 4.5 NestJS

目录：

```text
/nest
```

定位：

> 独立后端 API 服务。

NestJS 主要为 React 和 Vue 提供后端能力。

职责包括：

- REST API
- 用户认证
- 用户管理
- 角色管理
- 权限管理
- 菜单管理
- 系统配置
- 日志
- 数据库访问
- 业务逻辑

数据流：

```text
React / Vue
      ↓
NestJS
      ↓
PostgreSQL
```

---

# 5. 数据库设计

## 5.1 数据库

统一使用：

> PostgreSQL

由 Supabase 提供数据库托管。

Supabase 在本项目中主要作为：

> **PostgreSQL 数据库托管平台**

---

## 5.2 Supabase 使用范围

项目不依赖 Supabase 的以下能力：

- Supabase Auth
- Supabase Row Level Security
- Supabase Edge Functions

**Storage 例外（v1.5.0）**：用户头像允许使用 Supabase Storage（公开读 bucket `avatars`）。上传由服务端持有密钥中转完成，浏览器端不接触 Storage 密钥，不使用 Storage RLS 策略；API 密钥使用新体系 Secret key（`sb_secret_` 前缀）。

数据库按照普通 PostgreSQL 使用。

数据库连接由服务端负责。

---

## 5.3 数据库访问原则

浏览器端禁止直接访问 PostgreSQL。

React：

```text
Browser
 ↓
React
 ↓
NestJS
 ↓
PostgreSQL
```

Vue：

```text
Browser
 ↓
Vue
 ↓
NestJS
 ↓
PostgreSQL
```

Next：

```text
Browser
 ↓
Next.js
 ↓
PostgreSQL
```

Nuxt：

```text
Browser
 ↓
Nuxt
 ↓
PostgreSQL
```

数据库连接信息只允许存在于服务端环境变量中。

---

# 6. ORM

建议统一使用：

> Drizzle ORM

目标是在不同后端实现中尽可能保持数据库 Schema 和数据访问方式的一致性。

例如：

```text
Next.js ── Drizzle ──┐
Nuxt ──── Drizzle ──┤
NestJS ── Drizzle ──┤
                    ↓
              PostgreSQL
```

数据库 Schema 应尽量保持一致。

---

# 7. UI 与设计规范

## 7.1 设计基准

**React 是 Better Admin 的 UI Source of Truth**（页面结构、UI 设计、交互、UX、Design Tokens、组件行为）。

React 版本（`/react`）基于 Hero UI 模板实现（UI 组件库策略见 §7.3）。

Vue、Next.js、Nuxt.js 版本按照 React 版本实现页面结构与交互。

UI 组件库策略（§7.3）：React / Next.js 以 **Hero UI 为主 + Shadcn UI 为补充**；Vue / Nuxt 以 **Nuxt UI v4 为主**（唯一组件库，规则见 `AGENTS.md` §21）。

---

## 7.2 UI 一致性要求

四个前端版本需要尽可能保持一致：

### 页面

- Dashboard
- 用户管理
- 角色管理
- 权限管理
- 菜单管理
- 日志
- 其他业务页面

### UI

- Sidebar
- Header
- Breadcrumb
- Table
- Form
- Dialog
- Drawer
- Dropdown
- Command
- Tabs
- Card
- Button
- Input
- Select
- Date Picker
- Toast
- Pagination
- Empty State
- Loading State
- Error State

### 视觉

需要保持：

- 色彩体系一致
- 字体体系一致
- 间距一致
- 圆角一致
- 阴影一致
- 图标风格一致
- Dark Mode 一致
- Responsive 行为一致

---

## 7.3 UI 组件库策略与样式变量

### 组件库定位

```text
React       → Hero UI 为主 + Shadcn UI 补充
Next.js     → Hero UI 为主 + Shadcn UI 补充
Vue         → Nuxt UI v4（唯一组件库）
Nuxt.js     → Nuxt UI v4（唯一组件库）
```

### 组件选择优先级（React / Next.js）

```text
Hero UI
  ↓
Hero UI 没有对应组件 / 不适合当前场景
  ↓
Shadcn UI
  ↓
两者都无法满足需求
  ↓
项目级自定义组件
```

即：**Hero UI > Shadcn UI > 自定义实现**。

- Hero UI 已提供满足需求的组件（Button / Input / Textarea / Select / Autocomplete / Dropdown / Modal / Drawer / Tabs / Card / Tooltip / Popover / Avatar / Badge / Chip / Switch / Checkbox / Radio / Progress / Spinner / Pagination / Navbar / DatePicker / DateRangePicker / Table 等）必须优先使用。
- Shadcn UI 用于 Hero UI 未覆盖的场景（Command、复杂 Form 组合、Sidebar、DataTable 相关、特殊 Sheet / Drawer、已高度定制并稳定使用的组件）。
- 禁止同类组件无规则混用；禁止因开发者个人偏好随意选择组件库。

### 渐进式调整（React / Next.js）

- `/react` 基于 Hero UI 模板实现，不含 Shadcn UI 组件；不一次性重构。
- 新增功能优先使用 Hero UI；修改已有组件时按实际收益决定是否迁移。
- 不破坏现有页面结构与业务逻辑；DataTable 等复杂组件不因组件库统一而强行重写，**业务能力优先于组件库替换**。

### 样式变量（React / Next.js）

React / Next.js 的样式变量、设计 Token、主题变量以 **Hero UI 设计体系为主要参考**，形成一套项目级 Design Tokens：

```text
Hero UI Design System
        ↓
项目 CSS Variables / Design Tokens
        ↓
Hero UI + Shadcn UI + 项目自定义组件
```

需要统一：主色、次要颜色、Background / Foreground、Content、Border / Divider、Focus / Hover / Active / Disabled、Radius、Typography、Font Size、Font Weight、Spacing、Shadow、Transition、Dark Mode / Light Mode。

Shadcn UI 复用项目级变量进行适配，最终产品必须看起来像同一个设计系统，不允许 Hero UI 与 Shadcn UI 各自保持完全不同的默认视觉。

### Form 技术方案

React / Next.js 表单保持 **React Hook Form + Zod**，不因 UI 组件库改变表单校验方案与业务逻辑；UI 控件选择遵循「Hero UI 优先，Shadcn UI 补充」。

Vue / Nuxt 表单统一 **UForm + Zod**（Nuxt UI 表单容器 + zod schema 校验；vee-validate 经评审不引入）。

### Vue / Nuxt

- Vue / Nuxt 以 **Nuxt UI v4（`@nuxt/ui`）为唯一 UI 组件库**（2026-09 评审决策，替代原 Shadcn UI 策略）。
- 组件优先级：Nuxt UI 内置组件 → 项目级自定义组件（基于 Nuxt UI 原子拼装）→ 第三方组件库（需评审）；禁止引入 Vuetify、Quasar、Element Plus、PrimeVue、shadcn-vue 等替代 UI 库。
- 主题直接使用 Nuxt UI 默认 Design Tokens 与 Color System，暗色模式由其内置 color mode 提供；页面结构、布局骨架、交互行为与 React 基准一致，组件视觉使用 Nuxt UI 默认风格。
- 硬性规则与操作指引见 `AGENTS.md` §21 与 [`nuxt-ui-guide.md`](nuxt-ui-guide.md)。

---

# 8. API 设计

React 和 Vue 使用 NestJS API。

API 应采用统一的 RESTful API 设计。

例如用户模块：

```http
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

---

## 8.1 API 返回结构

成功响应统一：

```json
{
  "data": {}
}
```

列表响应：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

错误响应统一：

```json
{
  "code": "USER_NOT_FOUND",
  "message": "用户不存在"
}
```

---

# 9. API Contract

API Contract 的唯一事实来源是 [`nest/openapi/openapi.yaml`](../nest/openapi/openapi.yaml)（Contract-First：先定契约再实现；当前 v1.9.0）。

- 四端（React / Vue / Next.js / Nuxt）与 NestJS 均以该文件为准：路径、方法、信封、错误码、分页结构逐字一致；
- 业务错误码（大写蛇形）统一登记在契约中，禁止散落各端实现；
- 修改契约时必须评估四端 + NestJS 的影响并同步（见 `AGENTS.md` §6）。

---

# 10. 业务功能

核心业务模块与组织中心。各模块的四端实现状态见 `docs/feature-matrix.md`（Dashboard 为唯一全端未实现项）。

## 10.1 用户管理

- 用户列表：三态（首屏骨架 / 空态 / 错误重试）、信息合并展示、最近登录、个人链接图标跳转
- 创建用户（初始密码按密码策略）、编辑用户（表单抽屉，含角色授权与组织关联）
- 删除用户（软删）、批量删除
- 用户状态（停用 / 启用；写保护三层规则：本人 / 内置 admin / super_admin 绑定用户）
- 重置密码（按密码策略）
- 用户搜索、筛选、分页、排序；DataTable 列设置（可见性 + 拖拽排序持久化）

## 10.2 角色管理

- 角色列表（三态）、创建角色、编辑角色、删除角色
- 菜单授权抽屉（GRANT 权限位门控，勾选模型全量替换）
- super_admin 角色保护：不可删除 / 不可停用 / 授权不可修改；绑定变更仅限超管操作者，并受「最后活跃超管」不变量守卫（契约 v1.9.0，机制见 `docs/mechanisms.md` §5）

## 10.3 权限管理（只读）

- 权限点为**只读的位掩码枚举字典**：由代码与契约定义，不在界面创建 / 编辑 / 删除
- 列表展示位值、名称与说明；新增权限点随契约版本扩展（如 EXPORT / GRANT）

## 10.4 菜单管理

- 树形菜单 CRUD（含 add-child）、菜单排序
- 菜单与权限位关联，支持 i18n key、路由地址、图标、keepAlive 等配置
- 搜索过滤；编辑防环

## 10.5 Dashboard（规划中）

包含：

- 数据统计
- 图表
- 最近活动
- 用户数据
- 系统状态
- 快捷操作

（实施排在 Playground Gate 之后，方案见 `docs/plan-dashboard-playground.md`。）

## 10.6 日志

- 操作日志 / API 日志 / 登录日志 / 错误日志（类型以字典 `log_type` 为真源，内置枚举降级）
- 列表筛选、详情抽屉、批量删除

## 10.7 我的账户

当前登录用户的自助管理页（非菜单路由，无需权限位，仅要求登录；Tab 分「账号」与「安全」两组）：

账号 Tab：

- 头像：上传前支持裁剪、缩放、旋转；支持删除头像；服务端中转写入 Supabase Storage，每用户一张，同名覆盖
- 基本信息：修改显示名称、电话；维护个人标签（增删，最多 10 个）
- 个人链接：个人网站（裸域名）、GitHub 用户名、X 用户名（输入框固定协议/平台前缀，存裸值；自动剥离粘贴的完整链接前缀；控制台后续展示）
- 账号信息（只读）：用户名、角色、账号状态、注册时间、最近登录时间

安全 Tab：

- 修改邮箱：需验证当前密码，新邮箱全站唯一
- 修改密码：需验证当前密码，新密码展示 5 档强度；成功后所有登录会话失效，需重新登录

## 10.8 字典管理

- 字典类型 + 字典项双栏 CRUD
- 业务字典缓存（保存回填）；业务下拉（用户状态、日志类型等）以字典为真源，字典缺失时内置枚举降级

## 10.9 组织中心

- 组织管理：左树右表、同级拖拽排序（整组重编号）、关键词确认删除、负责人滚动加载选择
- 岗位管理：CRUD + 在职成员穿透抽屉
- 人员通讯录：组织树筛选 + 服务端分页 + EXPORT 权限位门控
- 通讯录 Excel 导出：企业级样式（品牌蓝表头 / 斑马纹 / 状态高亮 / 冻结首行），串行分页批量
- 公告管理：富文本（Tiptap）+ 三粒度发布范围 + 定时发布 + 撤回 + 催读；已读 / 未读名单
- 我的公告：左列表右详情（URL 参数驱动选中）、阅读状态筛选、进详情记首次已读
- 站内信通知：Header 铃铛 + 未读数轮询 + 已读；通知详情为登录可达的消费路由
- 架构图谱：只读可视化（平移 / 缩放 / Fit View / 折叠展开）

---

# 11. 认证与权限

项目不使用 Supabase Auth。

认证体系由应用自身实现。

React / Vue：

```text
React / Vue
    ↓
NestJS
    ↓
Auth
```

Next.js：

```text
Next.js
 ↓
Auth
```

Nuxt：

```text
Nuxt
 ↓
Auth
```

四个版本需要保持基本一致的：

- 登录
- 登出
- Session
- 用户身份
- 角色
- 权限
- 路由权限
- API 权限

---

# 12. 部署架构

## 12.1 前端

所有前端项目使用 Vercel 部署，域名统一见 §13 域名规划（单一来源）。

## 12.2 NestJS

NestJS 使用 Render 部署，API 域名见 §13 域名规划。

---

## 12.3 数据库

Supabase PostgreSQL。

最终整体结构：

```text
                         ┌───────────────┐
                         │   Supabase    │
                         │  PostgreSQL   │
                         └───────▲───────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
             Next              Nuxt              Nest
               │                 │                 │
             Vercel            Vercel            Render
                                                   │
                                            nest.baiwumm.com
                                                   ▲
                                              ┌────┴────┐
                                              │         │
                                            React      Vue
                                            Vercel    Vercel
```

---

# 13. 域名规划

| 项目 | 域名 | 平台 |
| --- | --- | --- |
| 官方文档站 | `better-admin.baiwumm.com` | Vercel |
| Next.js | `next.baiwumm.com` | Vercel |
| Nuxt | `nuxt.baiwumm.com` | Vercel |
| React | `react.baiwumm.com` | Vercel |
| Vue | `vue.baiwumm.com` | Vercel |
| NestJS API | `nest.baiwumm.com` | Render |

> **上线状态（2026-09-12）**：四端均未部署上线——现域名指向历史旧项目；全部版本开发完成后**统一上线**（详见 `AGENTS.md` §17）。官方文档站待 Vercel 部署绑定。

---

# 14. 开发原则

## 14.1 功能一致

四个前端版本应尽可能实现相同功能。

不因为技术栈不同而改变产品功能。

---

## 14.2 UI 一致

React 作为 UI 基准。

其他版本按照 React 版本进行实现。

---

## 14.3 API 一致

NestJS API 作为 React / Vue 的标准 API。

Next.js / Nuxt.js 自己实现 Server API 时，也尽可能保持相同的 API Contract。

---

## 14.4 数据库一致

所有版本使用相同的 PostgreSQL 数据库 Schema。

禁止不同技术栈维护完全不同的数据库结构。

---

## 14.5 技术栈独立

每个项目应该能够独立运行、独立构建和独立部署。

例如：

```bash
cd react
pnpm dev
```

```bash
cd vue
pnpm dev
```

```bash
cd next
pnpm dev
```

```bash
cd nuxt
pnpm dev
```

```bash
cd nest
pnpm start:dev
```

---

# 15. 项目开发顺序

不建议四套前端同时开发。

> 当前进度：Phase 1-5 已完成（React / NestJS / Vue / Next.js），Phase 6（Nuxt）已立项待决策——最新状态以 `AGENTS.md` §19 为准。

推荐按照以下顺序：

```text
Phase 1
React（Hero UI 工程基础）
        ↓
完成 UI 基础（UI 组件策略按 §7.3 渐进演进）

Phase 2
NestJS + PostgreSQL
        ↓
完成后端基础能力

Phase 3
React + NestJS
        ↓
完成第一套完整全栈系统

Phase 4
Vue + NestJS
        ↓
复刻完整系统

Phase 5
Next.js
        ↓
实现 Next.js 全栈版本

Phase 6
Nuxt
        ↓
实现 Nuxt 全栈版本

Phase 7
统一测试
        ↓
部署全部版本
```

---

# 16. 最终目标

项目最终形成：

```text
Better Admin

├── React
│   └── Hero UI（主）+ Shadcn UI（补充）
│
├── Vue
│   └── Nuxt UI v4
│
├── Next.js
│   └── Hero UI（主）+ Shadcn UI（补充）· Full-stack
│
├── Nuxt
│   └── Nuxt UI v4 · Full-stack
│
└── NestJS
    └── API Backend
```

并实现：

```text
同一套 UI
     +
同一套业务
     +
同一套数据库
     +
统一 API Contract
     +
不同技术栈实现
```

最终通过 §13 域名规划中的地址提供在线 Demo（统一上线后生效）。

---

# 17. 项目最终定位

Better Admin 不仅是一个 Admin 模板，也不是对某个开源模板的简单二次开发项目。

它的最终定位是：

> **一个以统一产品为基础，使用 React、Vue、Next.js、Nuxt、NestJS 等现代 Web 技术栈进行多版本实现的全栈 Admin 项目。**

项目重点关注：

- Modern Web Development
- Full-stack Development
- React / Vue 技术对比
- Next.js / Nuxt 全栈开发
- NestJS 后端开发
- Hero UI Design / Shadcn UI Design
- PostgreSQL
- TypeScript
- API Design
- Authentication
- RBAC
- Deployment

通过同一个实际项目，验证和沉淀不同技术栈下的工程实践。
---

# 18. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-09-12 | 对齐实际业务：§10 补字典管理与组织中心全套、权限管理改只读口径、用户/角色模块按实际形态修正；§9 改契约事实陈述（openapi.yaml v1.9.0 唯一真源）；§7.3 补 Vue / Nuxt 的 UForm + Zod 方案；域名收敛 §13 单源、补官方文档站与「统一上线」状态标记；§15 补当前进度指针 |
