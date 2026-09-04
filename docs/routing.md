# Better Admin — 路由功能说明（React 版）

> 范围：本文档描述 `/react`（Hero UI 基准版本）的约定式路由体系：目录约定、完整路由表、三层访问控制模型、登录鉴权、404/错误页与路由-菜单契约。
> 状态：已落地实现（TanStack Router 文件式路由 + NestJS 真实后端）。Vue / Next.js / Nuxt 后续按本文档的**路由表与行为约定**对齐。
>
> 相关代码：`react/src/routes/`、`react/src/router.ts`、`react/src/lib/route-access.ts`（访问控制唯一语义源）、`react/src/lib/api-client.ts`、`react/src/stores/auth-store.ts`
> 依赖：`@tanstack/react-router`、`@tanstack/react-query`、`zustand`（详见 `react/package.json`）

---

## 1. 设计概述

路由采用**三层访问控制模型**：

```text
┌───────────────────────────────────────────┐
│ 公开路由          │  /sign-in、/403、/404、/500
├───────────────────────────────────────────┤
│ 登录可达路由       │  仅需登录态，不走菜单权限：
│ （白名单语义）      │  /、/account、/my-notices、/org/notices/:id
│                   │  真源：lib/route-access.ts
├───────────────────────────────────────────┤
│ 菜单权限路由       │  路径必须在当前用户可见菜单树中：
│                   │  /settings/*、/org/*（管理页）
└───────────────────────────────────────────┘
```

要点：

- **新增页面** = 在 `src/routes/` 新增一个路由文件（发版）；**新增菜单** = 菜单管理中 `to` 指向**已存在的路由路径**（数据操作）。
- 业务路由路径由 TanStack Router 自动扫描生成 `src/routeTree.gen.ts`（**勿手改**，建议提交）；不再维护手写中央路径字典（原 `lib/route-paths.ts` 已删除）。
- 路由文件由 `@tanstack/router-plugin` 在 dev/build 时自动重建。
- 访问控制语义（白名单/前缀）只在一处维护：`lib/route-access.ts`（React 与 Next 端同构文件）。

---

## 2. 目录约定（文件式路由规则）

```text
src/routes/
├── __root.tsx                 # 根布局：Outlet + Toast.Provider + notFound/errorComponent
├── (auth)/                    # 路由组：不影响 URL（/sign-in 登录页）
├── 403.tsx                    # /403（禁止访问，全屏）
├── 404.tsx                    # /404（页面不存在，全屏）
├── 500.tsx                    # /500（服务器错误，全屏）
├── _authenticated/            # pathless 布局：URL 不含该段，包住所有需登录页面
│   ├── route.tsx              # 布局路由：beforeLoad 登录鉴权
│   ├── index.tsx              # /                （控制台占位，登录可达）
│   ├── account.tsx            # /account         （我的账户，登录可达）
│   ├── my-notices.tsx         # /my-notices      （我的公告，登录可达）
│   ├── org/                   # 组织中心（菜单权限）
│   │   ├── depts.tsx          # /org/depts       （组织管理）
│   │   ├── posts.tsx          # /org/posts       （岗位管理）
│   │   ├── directory.tsx      # /org/directory   （人员通讯录，支持 ?deptId=）
│   │   ├── notices.tsx        # /org/notices     （公告管理）
│   │   ├── notices_.$noticeId.tsx  # /org/notices/:noticeId（公告详情，登录可达前缀）
│   │   └── chart.tsx          # /org/chart       （架构图谱）
│   └── settings/              # 系统管理（菜单权限）
│       ├── index.tsx          # /settings        （分组兜底空页）
│       ├── users.tsx          # /settings/users  （用户管理）
│       ├── roles.tsx          # /settings/roles  （角色管理）
│       ├── permissions.tsx    # /settings/permissions（权限管理）
│       ├── menus.tsx          # /settings/menus  （菜单管理）
│       ├── dicts.tsx          # /settings/dicts  （字典管理）
│       └── logs.tsx           # /settings/logs   （日志管理）
```

约定语法（TanStack Router / 类 Next.js）：

| 语法 | 含义 | 本项目的用法 |
| --- | --- | --- |
| 目录 = 路径段 | `settings/users.tsx` → `/settings/users` | 业务页面按域组织 |
| `route.tsx` | 布局路由（自身无 URL，渲染 `<Outlet/>`） | `_authenticated/route.tsx` |
| `index.tsx` | 目录的索引页 | 控制台 `/`、`/settings` 兜底 |
| `(group)` | 路由组，**不进入 URL** | `(auth)` |
| `_layout` | pathless 布局，**不进入 URL** | `_authenticated` |
| `$param` / `notices_.$noticeId` | 动态段 | 公告详情 `/org/notices/:noticeId` |

---

## 3. 完整路由表

| URL | 文件 | 页面 | 访问层级 | 页面权限 |
| --- | --- | --- | --- | --- |
| `/` | `_authenticated/index.tsx` | 控制台（占位） | 登录可达（白名单） | — |
| `/sign-in` | `(auth)/sign-in.tsx` | 登录 | 公开 | 已登录自动回首页 |
| `/403` | `403.tsx` | 禁止访问（全屏） | 公开 | — |
| `/404` | `404.tsx` | 页面不存在（全屏） | 公开 | — |
| `/500` | `500.tsx` | 服务器错误（全屏） | 公开 | — |
| `/account` | `_authenticated/account.tsx` | 我的账户 | 登录可达（白名单） | — |
| `/my-notices` | `_authenticated/my-notices.tsx` | 我的公告（支持 `?noticeId=`） | 登录可达（白名单） | — |
| `/org/notices/:noticeId` | `_authenticated/org/notices_.$noticeId.tsx` | 公告详情（消费端） | 登录可达（动态前缀 `/org/notices/`） | 详情接口服务端校验可见性 |
| `/org/depts` | `_authenticated/org/depts.tsx` | 组织管理 | 菜单权限 | 菜单树含该路径 |
| `/org/posts` | `_authenticated/org/posts.tsx` | 岗位管理 | 菜单权限 | 菜单树含该路径 |
| `/org/directory` | `_authenticated/org/directory.tsx` | 人员通讯录（支持 `?deptId=`） | 菜单权限 | 菜单树含该路径 |
| `/org/notices` | `_authenticated/org/notices.tsx` | 公告管理 | 菜单权限 | 菜单树含该路径 |
| `/org/chart` | `_authenticated/org/chart.tsx` | 架构图谱 | 菜单权限 | 菜单树含该路径 |
| `/settings` | `_authenticated/settings/index.tsx` | 分组兜底空页 | 菜单权限 | 分组节点 `to` 为空，正常导航不可达 |
| `/settings/users` | `_authenticated/settings/users.tsx` | 用户管理 | 菜单权限 | 菜单树含该路径 |
| `/settings/roles` | `_authenticated/settings/roles.tsx` | 角色管理 | 菜单权限 | 菜单树含该路径 |
| `/settings/permissions` | `_authenticated/settings/permissions.tsx` | 权限管理 | 菜单权限 | 菜单树含该路径 |
| `/settings/menus` | `_authenticated/settings/menus.tsx` | 菜单管理 | 菜单权限 | 菜单树含该路径 |
| `/settings/dicts` | `_authenticated/settings/dicts.tsx` | 字典管理 | 菜单权限 | 菜单树含该路径 |
| `/settings/logs` | `_authenticated/settings/logs.tsx` | 日志管理 | 菜单权限 | 菜单树含该路径 |
| `*`（未匹配） | — | 404 全屏页 | 根 `notFoundComponent` | — |

---

## 4. 路径真源与访问控制常量

- **业务路由路径**：由 TanStack Router 从 `src/routes/` 文件结构自动生成（`routeTree.gen.ts`）；组件内跳转使用类型安全的字面量 `to`。**不存在也不需要手写中央路径字典**（原 `lib/route-paths.ts` 已删除）。
- **访问控制语义**：`lib/route-access.ts` 是唯一语义源——
  - `LOGIN_REQUIRED_PATHS = ["/", "/account", "/my-notices"]`：登录即可访问的精确白名单；
  - `LOGIN_REQUIRED_PREFIXES = ["/org/notices/"]`：登录可达的动态前缀（公告详情，前缀带尾斜杠，列表页 `/org/notices` 不豁免）；
  - `isLoginRequiredPath(pathname)`：统一判定函数。
  - Next 端（`next/src/lib/route-access.ts` + `proxy.ts`）保持同构实现。

---

## 5. 登录鉴权（真实后端）

```text
① 路由守卫（框架层）    _authenticated/route.tsx beforeLoad：无 accessToken → 跳登录
② 布局门卫（业务层）    admin-layout：登录可达放行；菜单树不含当前路径 → replace /403
③ API 401（运行时）    api-client 401 → refresh 轮换（并发去重）→ 失败 clearSession → 跳登录
```

- **登录**：`POST /auth/login`（`rememberMe` 控制 refreshToken 持久化分档）；成功后 zustand 写入 user/tokens 并 prefetch 菜单缓存。
- **会话恢复**：AdminLayout 挂载时 `useAuthSync` 请求 `GET /auth/me` 覆盖本地权限快照（机制见 `docs/mechanisms.md` §6）。
- **登出**：侧边栏用户区 Dropdown → `POST /auth/logout`（带 refreshToken 精确撤销）→ `clearSession()`（清用户快照与菜单缓存）→ 跳 `/sign-in`。
- **多标签页**：KeepAlive 实例池按 fullPath 分池（机制见 `docs/mechanisms.md` §2）；URL Query 驱动的筛选（通讯录 `?deptId=`、我的公告 `?noticeId=`）随路由恢复。

---

## 6. 404 与错误页

| 场景 | 处理机制 | 页面 |
| --- | --- | --- |
| 任意未匹配路径 | 根 `__root.tsx` `notFoundComponent` | 全屏 404（`components/error-pages/not-found-error.tsx`） |
| 页面渲染抛错 | 根 `__root.tsx` `errorComponent` | 全屏错误兜底（`general-error.tsx`） |
| 无权访问（菜单门卫） | admin-layout 门卫 replace 跳 `/403` | 全屏 403（`forbidden-error.tsx`） |
| 强制异常页 | 直接访问 `/403` `/404` `/500` | 各全屏页 |

错误页组件统一在 `src/components/error-pages/`（Hero UI 风格，复用 `ErrorPageShell`），路由文件仅做一行挂载。

---

## 7. 页面权限（RBAC，后端菜单树驱动）

核心原则：**页面权限由后端实时聚合的权限位派生**，前端不做硬编码路由权限表、不做二次权限过滤。

### 7.1 数据流

```text
useMenus()（GET /api/menus，后端 buildAllowedMenuIds 按角色关联过滤 + 祖先链补全；
            super_admin 全量位免过滤。机制见 docs/mechanisms.md §3）
  → filterHiddenMenus() 仅剔除 hideInMenu 显示属性（与授权过滤是两层）
  → 侧边栏渲染（不可见 = 无权限）
  → admin-layout 门卫：isLoginRequiredPath() 放行；否则 URL 必须在可见菜单树路径集
    （含动态路由父级匹配），否则 replace 跳 /403
```

### 7.2 关键实现

| 模块 | 职责 |
| --- | --- |
| `lib/route-access.ts` | 登录可达白名单/前缀的唯一语义源 |
| `hooks/use-menus.ts` | 菜单查询（`GET /api/menus`，queryKey `["menus"]`，staleTime 60s） |
| `layouts/components/admin-layout.tsx` | 布局门卫（登录可达放行 + 菜单路径集校验 403）+ `useAuthSync` 权限快照同步 |
| `lib/permission.ts` + `hooks/use-permissions.ts` | `useMenuPermissions` / `useMenuHasPermissionKey`：按当前路由菜单的 `userPermissions` 位做按钮级门控（OR 语义，识别全量位） |

### 7.3 权限验证方法

用超级管理员在「角色管理」给某角色授权菜单后，绑定该角色的用户登录：

- 后端 `GET /api/menus` 只返回其角色关联（`role_menus`）且父链完整的菜单；
- 未授权页面侧边栏不可见，直接输入 URL → 布局门卫 replace 跳 `/403`；
- 后端 API 另有 `PermissionsGuard` 独立校验（前端隐藏 ≠ 放行）。

> 位掩码约定与后端一致：`9223372036854775807` = 全量权限（super_admin），`"0"` = 无权限。

---

## 8. 路由与菜单的契约

1. 菜单 `to` 必须是**已存在的路由路径**（不得手造未注册路径；分组节点 `to` 为空）。
2. 菜单树分组节点（有 `children`）不参与导航；仅叶子节点（有 `to`）产生路径。
3. `hideInMenu: true` 隐藏菜单但路由仍可访问；`enabled: false` 由后端直接不下发。
4. 侧边栏菜单高亮/自动展开由 `pathname` 与 `findActivePath` 驱动。

---

## 9. 常用操作指南

### 新增一个页面

1. 新建 `src/routes/_authenticated/<域>/<name>.tsx`，`createFileRoute("/_authenticated/<域>/<name>")`；
2. 在菜单管理中新增菜单节点，`to` 指向新路径（后端 seed 可用 `nest/scripts/migrate-menus-add-*.ts` 幂等补录）；
3. dev/build 自动重建 `routeTree.gen.ts`，运行 `pnpm lint && pnpm build` 验证；
4. 页面按钮级门控使用 `useMenuHasPermissionKey`（菜单粒度权限位）。

### 新增「登录可达」页面

1. `lib/route-access.ts` 的 `LOGIN_REQUIRED_PATHS` 追加路径（动态路由用 `LOGIN_REQUIRED_PREFIXES`）；
2. 新建路由文件与页面组件；Next 端同步 `route-access.ts` 与 `proxy.ts` 判定。

### 演示无权限场景

给测试账号绑定一个仅授权部分菜单的角色（角色管理），登录后观察侧边栏与直接输入 URL 的 403 行为。

---

## 10. 当前状态与已知约束

- ✅ `pnpm dev` / `pnpm build` / `pnpm lint` 均通过；路由级代码分割（`autoCodeSplitting`）生效。
- ✅ 登录、菜单、全部业务页均已接入 NestJS 真实后端（无 Mock 残留）。
- ⚠️ `src/routeTree.gen.ts` 为自动生成文件：勿手改；新增路由后由 Vite 插件自动重建。
- ℹ️ 管理页详情规范：列表详情一律用 Drawer/Dialog（见 `docs/ui-spec.md` §1.3）；唯一的消费端详情路由是公告详情（登录可达前缀）。
- ℹ️ Next 端路由与本文档路由表逐页对应（App Router 目录 `next/src/app/(authenticated)/`），差异仅实现层（httpOnly Cookie + `proxy.ts` 门卫，见 `docs/feature-matrix.md`）。
