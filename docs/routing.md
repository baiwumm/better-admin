# Better Admin — 路由功能说明（React 版）

> 范围：本文档描述 `/react`（Hero UI 基准版本）的约定式路由体系：目录约定、路由表、登录鉴权、404/错误页、页面权限与路由-菜单契约。
> 状态：已落地实现（TanStack Router 文件式路由）；`/react-shadcn` 为只读参考源，Vue / Next.js / Nuxt 后续按本文档的**路由表与行为约定**对齐。
>
> 相关代码：`react/src/routes/`、`react/src/router.ts`、`react/src/lib/route-paths.ts`、`react/src/lib/permission.ts`、`react/src/stores/auth-store.ts`
> 依赖：`@tanstack/react-router`、`@tanstack/react-query`、`zustand`（详见 `react/package.json`）

---

## 1. 设计概述

路由采用**两层模型**：

```text
┌─────────────────────────────────────┐
│ 路由层（代码 / 构建时）               │  ← 约定式文件路由：决定「页面存在」
│ src/routes/ + routeTree.gen.ts      │     嵌套布局、懒加载、404 兜底
└──────────────┬──────────────────────┘
               │ 契约：菜单 to 必须命中 ROUTE_PATHS 字典中的路径
┌──────────────┴──────────────────────┐
│ 菜单层（数据 / 运行时）               │  ← Mock 菜单（data/menus.ts）
│ useMenus → 侧边栏 + 路由守卫          │     决定「显示什么 / 谁能访问」
└─────────────────────────────────────┘
```

要点：

- **新增页面** = 在 `src/routes/` 新增一个路由文件（发版）；**新增菜单** = 菜单 `to` 指向**已存在的路由路径**。
- 菜单树结构与后端 `GET /api/menus` 的 `MenuNode` 完全一致（当前为本地 Mock），后续接后端只需替换数据源。
- 路由文件由 `@tanstack/router-plugin` 在 dev/build 时自动扫描生成 `src/routeTree.gen.ts`（**勿手改**，建议提交）。

---

## 2. 目录约定（文件式路由规则）

```text
src/routes/
├── __root.tsx                 # 根布局：Outlet + Devtools + notFound/errorComponent
├── (auth)/                    # 路由组：不影响 URL，仅组织（/sign-in）
├── (errors)/                  # 路由组：全屏错误页（/401、/403、/404）
└── _authenticated/            # pathless 布局：URL 不含该段，包住所有需登录页面
    ├── route.tsx              # 布局路由：beforeLoad 登录鉴权 + AdminLayout（Hero UI 双栏）
    ├── index.tsx              # /    （仪表盘）
    ├── users/index.tsx        # /users
    ├── roles/index.tsx        # /roles
    ├── permissions/index.tsx  # /permissions
    ├── menus/index.tsx        # /menus
    ├── logs/index.tsx         # /logs
    ├── multi-level.tsx        # /multi-level（三级菜单演示页）
    └── settings/
        ├── route.tsx          # 子布局路由：二级导航（左侧 sticky 导航 + Outlet）
        ├── index.tsx          # /settings（系统设置）
        ├── profile.tsx        # /settings/profile
        ├── account.tsx        # /settings/account
        ├── appearance.tsx     # /settings/appearance
        ├── notifications.tsx  # /settings/notifications
        └── display.tsx        # /settings/display
```

约定语法（TanStack Router / 类 Next.js）：

| 语法 | 含义 | 本项目的用法 |
| --- | --- | --- |
| 目录 = 路径段 | `users/index.tsx` → `/users` | 业务页面按模块分组 |
| `route.tsx` | 布局路由（自身无 URL，渲染 `<Outlet/>`） | `_authenticated/route.tsx`、`settings/route.tsx` |
| `index.tsx` | 目录的索引页 | 各模块首页 |
| `(group)` | 路由组，**不进入 URL** | `(auth)`、`(errors)` |
| `_layout` | pathless 布局，**不进入 URL** | `_authenticated` |
| `$param` | 动态段（预留） | 当前业务无详情路由（详情走 Drawer，见 ui-spec） |

每个路由文件必须用与文件路径一致的字符串创建路由：

```tsx
// src/routes/_authenticated/users/index.tsx
export const Route = createFileRoute("/_authenticated/users/")({
  component: () => <UsersPage />,
});
```

> 路径字符串写错会由 typegen / 类型检查直接报错。

---

## 3. 完整路由表

| URL | 文件 | 页面 | 布局 | 登录 | 页面权限 |
| --- | --- | --- | --- | --- | --- |
| `/` | `_authenticated/index.tsx` | 仪表盘（占位） | AdminLayout | 必须 | 菜单树含 `/` |
| `/sign-in` | `(auth)/sign-in.tsx` | 登录 | 无（全屏） | 已登录自动回首页 | — |
| `/401` | `(errors)/401.tsx` | 未授权 | 无（全屏） | 否 | — |
| `/403` | `(errors)/403.tsx` | 禁止访问 | 无（全屏） | 否 | — |
| `/404` | `(errors)/404.tsx` | 页面不存在 | 无（全屏） | 否 | — |
| `/users` | `_authenticated/users/index.tsx` | 用户管理（占位） | AdminLayout | 必须 | 菜单树含 `/users` |
| `/roles` | `_authenticated/roles/index.tsx` | 角色管理（占位） | AdminLayout | 必须 | 菜单树含 `/roles` |
| `/permissions` | `_authenticated/permissions/index.tsx` | 权限管理（占位） | AdminLayout | 必须 | 菜单树含 `/permissions` |
| `/menus` | `_authenticated/menus/index.tsx` | 菜单管理（占位） | AdminLayout | 必须 | 菜单树含 `/menus` |
| `/logs` | `_authenticated/logs/index.tsx` | 日志管理（占位） | AdminLayout | 必须 | 菜单树含 `/logs` |
| `/multi-level` | `_authenticated/multi-level.tsx` | 三级菜单（占位） | AdminLayout | 必须 | 菜单树含 `/multi-level` |
| `/settings` | `_authenticated/settings/index.tsx` | 系统设置（占位） | AdminLayout + SettingsLayout | 必须 | 菜单树含 `/settings` |
| `/settings/profile` | `_authenticated/settings/profile.tsx` | 个人资料（占位） | 同上 | 必须 | 菜单树含该路径 |
| `/settings/account` | `_authenticated/settings/account.tsx` | 账户（占位） | 同上 | 必须 | 菜单树含该路径 |
| `/settings/appearance` | `_authenticated/settings/appearance.tsx` | 外观（占位） | 同上 | 必须 | 菜单树含该路径 |
| `/settings/notifications` | `_authenticated/settings/notifications.tsx` | 通知（占位） | 同上 | 必须 | 菜单树含该路径 |
| `/settings/display` | `_authenticated/settings/display.tsx` | 显示（占位） | 同上 | 必须 | 菜单树含该路径 |
| `*`（未匹配） | — | 404 全屏页 | 根 `notFoundComponent` | 取决于布局匹配 | — |

---

## 4. 路由路径字典（唯一真源）

`src/lib/route-paths.ts` 导出 `ROUTE_PATHS` 常量，是**路由路径的唯一真源**：

- 约定：全小写 kebab-case；跨技术栈 URL 保持一致。
- 约束：**菜单 `to` 字段、路由文件 path、此字典三者必须一致**（当前 Mock 菜单的 `to` 已直接引用 `ROUTE_PATHS`）。
- 新增页面时先在此字典登记路径，再建路由文件，最后在 Mock 菜单中挂载。

```ts
export const ROUTE_PATHS = {
  dashboard: "/",
  signIn: "/sign-in",
  users: "/users",
  // …完整见 src/lib/route-paths.ts
} as const;
```

---

## 5. 登录鉴权（三层）

```text
① 路由守卫（框架层）   _authenticated/route.tsx 的 beforeLoad
② 页面/菜单权限（业务层） 菜单树过滤 + useMenuRouteGuard（见 §7）
③ API 401（运行时，预留） axios 拦截器 → 清会话 → 跳登录
```

### 5.1 未登录拦截（beforeLoad）

`_authenticated/route.tsx`：

```ts
beforeLoad: async ({ location, context }) => {
  const token = context.auth.getState().accessToken; // 先做廉价的同步判断
  if (!token) {
    throw redirect({
      to: ROUTE_PATHS.signIn,
      search: { redirect: location.href }, // 登录后跳回原目标
    });
  }
  // 接入真实后端后：若内存无用户信息，追加 await getMe() 恢复会话
}
```

行为：未登录访问任何 `_authenticated` 下的页面 → 跳 `/sign-in?redirect=<原地址>`；登录成功后自动跳回。

### 5.2 登录页

`(auth)/sign-in.tsx`：

- Hero UI `TextField` + `Button`（受控表单，无额外表单库）。
- `validateSearch` 解析 `redirect` 参数（类型安全）；登录成功后 `window.location.assign(redirect)` 或回 `/`。
- `beforeLoad`：已登录用户访问登录页 → 重定向回 `/`（防重复登录）。
- 登录实现当前为 **Mock**（非空校验，`stores/auth-store.ts`）；用户信息与 Token 经 zustand `persist` 存于 localStorage（仅持久化 `user`/`accessToken`/`isAuthenticated` 三个字段）。

### 5.3 会话与登出

- 刷新页面：token 与用户信息由 persist 同步恢复，**不发请求**。
- 登出：侧边栏用户区 Dropdown → `logout()` 清理 Token + 跳 `/sign-in`。
- Token 过期（接入后端后）：API 401 → `resetAuth()` + 跳登录（预留的拦截器职责）。

---

## 6. 404 与错误页

| 场景 | 处理机制 | 页面 |
| --- | --- | --- |
| 任意未匹配路径 | 根 `__root.tsx` `notFoundComponent` | 全屏 404（`components/error-pages/not-found-error.tsx`） |
| 页面渲染抛错 | 根 `__root.tsx` `errorComponent` | 全屏错误兜底（`general-error.tsx`） |
| 无权访问（菜单守卫） | `useMenuRouteGuard` 跳 `/401` | 全屏 401（`unauthorized-error.tsx`） |
| 强制错误页 | 直接访问 `/401` `/403` `/404` | 各全屏页 |

错误页组件统一在 `src/components/error-pages/`（Hero UI 风格，复用 `ErrorPageShell`），路由文件仅做一行挂载。

---

## 7. 页面权限（RBAC，菜单数据驱动）

核心原则：**页面权限由「后端菜单树」派生**，前端不做硬编码路由权限表。

### 7.1 数据流

```text
useMenus()（react-query，缓存 60s）
  → data/menus.ts 的 mockMenus（结构 = 后端 MenuNode）
  → filterAccessibleMenus() 按 userPermissions 位掩码过滤
  → 侧边栏渲染（不可见 = 无权限）
  → useMenuRouteGuard()：URL 不在可见菜单树路径集 → 跳 /401
```

### 7.2 关键实现

| 模块 | 职责 |
| --- | --- |
| `lib/permission.ts` | `canAccessMenu`（enabled 且授权位非 0）、`filterAccessibleMenus`（分组无可见子项时整组隐藏）、`hasPermission(bits)`（操作级，供页面按钮显隐） |
| `hooks/use-menus.ts` | 菜单查询（当前 Mock，接后端后替换 queryFn 为 `GET /menus`） |
| `hooks/use-menu-route-guard.ts` | 菜单加载完成后校验当前 URL；菜单加载中/失败不校验（避免误跳与循环重定向） |
| `AdminLayout` | 挂载 `useMenuRouteGuard()` |

### 7.3 权限演示方法

把 `src/data/menus.ts` 中某个节点的 `userPermissions` 改为 `"0"`（`enabled` 保持 `true`）：

- 该菜单从侧边栏消失；
- 直接访问其路径（如 `/menus`）→ 被守卫重定向到 `/401` 全屏页。

> 位掩码约定与后端一致：`9223372036854775807` = 全量权限（super_admin），`"0"` = 无权限。

---

## 8. 路由与菜单的契约

1. 菜单 `to` 必须等于 `ROUTE_PATHS` 中登记的路由路径（**不得手造未注册路径**）。
2. 菜单树分组节点（有 `children`）不参与导航；仅叶子节点（有 `to`）产生路径。
3. `hideInMenu: true` 可隐藏菜单但路由仍可访问（预留字段）；`enabled: false` 直接禁止显示与访问。
4. 侧边栏菜单高亮/自动展开由 `pathname` 与 `findActivePath` 驱动（`data/menus.ts`）。

---

## 9. 常用操作指南

### 新增一个页面

1. `lib/route-paths.ts` 登记路径（如 `foo: "/foo"`）；
2. 新建 `src/routes/_authenticated/foo.tsx`（或 `foo/index.tsx`），`createFileRoute("/_authenticated/foo")`；
3. （可选）`data/menus.ts` 添加菜单节点，`to: ROUTE_PATHS.foo`；
4. dev/build 自动重建 `routeTree.gen.ts`，运行 `pnpm lint && pnpm build` 验证。

### 演示无权限场景

将目标菜单 `userPermissions` 改为 `"0"`。

### 接入真实后端（后续阶段）

1. `stores/auth-store.ts`：`login` 替换为 `POST /auth/login`；`beforeLoad` 补 `getMe()`；加 axios 401 拦截器；
2. `hooks/use-menus.ts`：queryFn 改为 `GET /menus`（返回结构即 `MenuNode[]`，无需改类型）；
3. `data/menus.ts` 降级为离线兜底或移除。

---

## 10. 当前状态与已知约束

- ✅ `pnpm dev` / `pnpm build` / `pnpm lint` 均通过；路由级代码分割（`autoCodeSplitting`）生效。
- ⚠️ `src/routeTree.gen.ts` 为自动生成文件：勿手改；新增路由后由 Vite 插件自动重建。
- ⚠️ 登录与菜单当前为 **Mock**（不依赖后端在线）；业务页均为占位页，后续按迁移进度表逐个实现（见 AGENTS.md §4.6）。
- ℹ️ 详情页规范：不新建 `/users/:id` 之类详情路由，详情一律用 Drawer/Dialog（见 `docs/ui-spec.md` §1.3）。