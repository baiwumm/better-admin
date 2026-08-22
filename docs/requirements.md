# Better Admin

> 基于统一设计与业务逻辑，使用 Next.js、Nuxt、React、Vue、NestJS 等现代 Web 技术栈实现的全栈 Admin 系统。

## 1. 项目概述

### 1.1 项目名称

**Better Admin**

仓库名称：

```text
better-admin
```

### 1.2 项目定位

Better Admin 是一个基于现代 Web 技术栈构建的全栈 Admin 系统。

项目以 **React 版本（基于 Shadcn Admin 源码二次开发）** 作为前端 UI / UX 的基准（UI Source of Truth）；不同技术栈采用各自的 UI 组件库（React / Next.js：**Hero UI 为主 + Shadcn UI 补充**；Vue / Nuxt：**Shadcn UI 为主**），在保持整体视觉风格、页面结构和交互体验一致的前提下，分别使用不同的前端及全栈技术进行实现。

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
├── vue/                     # Vue + Shadcn UI（shadcn-vue）
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

React 版本以 Shadcn Admin 源码作为工程基础进行二次开发；UI 组件库策略遵循「渐进式调整」：存量 Shadcn UI 保留，新增功能优先 Hero UI，不做一次性大规模重构。

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
- Supabase Storage

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

React 版本基于官方 **Shadcn Admin** 源码二次开发（产品与工程起点）。

Vue、Next.js、Nuxt.js 版本按照 React 版本实现页面结构与交互。

UI 组件库策略（§7.3）：React / Next.js 以 **Hero UI 为主 + Shadcn UI 为补充**；Vue / Nuxt 以 **Shadcn UI 为主**，暂不切换 Hero UI。

---

## 7.2 UI 一致性要求

四个前端版本需要尽可能保持一致：

### 页面

- Dashboard
- 用户管理
- 角色管理
- 权限管理
- 菜单管理
- 系统设置
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
Vue         → Shadcn UI 为主（暂不调整）
Nuxt.js     → Shadcn UI 为主（暂不调整）
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

- 存量 Shadcn Admin / Shadcn UI 成熟能力（Layout、Sidebar、Header、Theme、Dark Mode、Responsive、DataTable、Form、Dialog、Drawer、Command、Chart、Hooks、Utils）**继续保留**，不一次性重构。
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

### Vue / Nuxt

- Vue / Nuxt 当前保持 **Shadcn UI 为主要 UI 体系**，不主动切换到 Hero UI。
- 未来若实际开发发现 Hero UI 更适合 Vue / Nuxt，再单独进行技术评估，不因 React / Next.js 使用 Hero UI 而自动同步修改。

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

不同技术栈之间需要保持统一的数据协议。

建议使用 OpenAPI 作为 API Contract。

目标：

```text
                 OpenAPI
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      React        Vue        Other
        │           │
        └───── NestJS API ──────┘
```

Next.js 和 Nuxt.js 虽然采用各自的 Server API，但需要尽量遵循相同的 API 设计规范。

---

# 10. 业务功能

第一阶段建议完成一个完整的 Admin 基础系统。

核心模块包括：

## 10.1 用户管理

- 用户列表
- 用户详情
- 创建用户
- 编辑用户
- 删除用户
- 用户状态
- 用户搜索
- 用户分页

## 10.2 角色管理

- 角色列表
- 创建角色
- 编辑角色
- 删除角色
- 角色权限配置

## 10.3 权限管理

- 权限列表
- 权限创建
- 权限编辑
- 权限删除
- 权限分配

## 10.4 菜单管理

- 菜单列表
- 菜单创建
- 菜单编辑
- 菜单删除
- 菜单排序
- 菜单权限关联

## 10.5 Dashboard

包含：

- 数据统计
- 图表
- 最近活动
- 用户数据
- 系统状态
- 快捷操作

## 10.6 系统设置

例如：

- 基础设置
- 用户设置
- 主题设置
- 系统配置

## 10.7 日志

包含：

- 操作日志
- 登录日志
- API 日志
- 错误日志

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

所有前端项目使用 Vercel 部署。

### Next.js

```text
https://next.baiwumm.com
```

### Nuxt

```text
https://nuxt.baiwumm.com
```

### React

```text
https://react.baiwumm.com
```

### Vue

```text
https://vue.baiwumm.com
```

---

## 12.2 NestJS

NestJS 使用 Render 部署。

建议 API 域名：

```text
https://api.baiwumm.com
```

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
                                            api.baiwumm.com
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
| Next.js | `next.baiwumm.com` | Vercel |
| Nuxt | `nuxt.baiwumm.com` | Vercel |
| React | `react.baiwumm.com` | Vercel |
| Vue | `vue.baiwumm.com` | Vercel |
| NestJS | `api.baiwumm.com` | Render |

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

推荐按照以下顺序：

```text
Phase 1
React + Shadcn Admin（工程基础）
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
│   └── Shadcn UI
│
├── Next.js
│   └── Hero UI（主）+ Shadcn UI（补充）· Full-stack
│
├── Nuxt
│   └── Shadcn UI · Full-stack
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

最终通过以下地址提供在线 Demo：

- Next.js：`https://next.baiwumm.com`
- Nuxt：`https://nuxt.baiwumm.com`
- React：`https://react.baiwumm.com`
- Vue：`https://vue.baiwumm.com`
- API：`https://api.baiwumm.com`

---

# 17. 项目最终定位

Better Admin 不仅是一个 Admin 模板，也不是简单的 Shadcn Admin 二次开发项目。

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