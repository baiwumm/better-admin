# 机制梳理：权限点请求 / 标签页保活 / 菜单可见性与超管

> 本文沉淀三个高频疑问的机制结论，供开发与排查快速查阅。
> 相关设计文档：`nest/docs/database-design.md`（§1.1 超管全量位、§1.5 菜单可见性）、
> `AGENTS.md`（keepAlive 路由缓存章节）、`nest/openapi/openapi.yaml`（API Contract）。
> 更新日期：2026-08-29（基于当前代码实现梳理，代码为准）。

---

## 1. `/api/permissions` 的请求与缓存（React 端）

**结论：不是进入应用就加载，也没有持久化；全项目共用一份内存缓存，按需懒加载。**

- **触发时机**：`usePermissions()`（`react/src/hooks/use-permissions.ts`）是普通
  TanStack Query hook，没有任何入口级 prefetch。第一个消费它的组件挂载时才发请求。
  登录成功后只有 `/api/menus` 会被预取（`auth-store.ts`，供路由 beforeLoad 同步判权）。
- **消费方**：权限管理页、菜单管理页（页面 / 树表 / 表单弹窗）、以及 PageHeader 的
  `useHasPermissionKey`（页面声明了「新增」按钮权限位时）。因此进入这类页面即触发请求。
- **项目共用**：全局单例 `QueryClient`（`react/src/lib/query-client.ts`），
  `queryKey: ["permissions"]` 全项目共享——多组件同时挂载只发一次请求（自动去重）。
- **缓存策略**：该查询单独 `staleTime: 5 分钟`（覆盖全局默认 1 分钟），理由是权限点
  枚举为编译期固定值；全局 `refetchOnWindowFocus: false`。stale 后重新挂载会后台刷新。
- **无持久化**：无 localStorage / persist 插件，纯内存缓存；刷新页面即重取，所有
  使用方卸载后约 5 分钟被 GC（默认 gcTime）。
- **与用户权限位分离**：该接口返回的是权限点**枚举定义**（value/label/bits），
  与具体用户无关；当前用户拥有的权限位在登录响应里，存于 zustand `auth-store`，
  两者配合 `lib/permission.ts` 的位运算做按钮级门控（`useHasPermissionKey`）。

## 2. 多标签页与保活（KeepAliveOutlet / 实例池）

**结论：所有访问过的页面进实例池由 `<Activity>` 切换显隐；菜单 `keepAlive: true` 的
页面长驻保活且与标签页绑定（关闭标签 = 销毁实例）；池上限 10，超限先淘汰过渡实例、
再在保活实例间 LRU。**

- **实例池**：核心在 `react/src/layouts/components/keep-alive-outlet.tsx` +
  `react/src/lib/keepalive-pool.ts`（纯函数池逻辑，vitest 单测覆盖）。
  hidden 实例保留组件 state 与 DOM、卸载 effects——React Query 订阅暂停、恢复可见时
  数据 stale 自动 refetch（「保活 ≠ 数据冻结」）。
- **permanent / transient 两级**：
  - 菜单 `keepAlive: true` → **permanent** 长驻，且必须「已打开且未关闭」：
    `reconcileWithTabs` 在标签变化时清除已关标签的实例（关闭标签即销毁保活）；
    刷新直入页面时先登记为 transient，菜单到达后自动转正。
  - 其余页面 → **transient**，仅为路由过渡期提供旧帧（供 View Transition 拍摄），
    导航提交后由 `commitNavigation` 清除，语义等同普通路由切换。
- **池上限与淘汰**（`MAX_POOL_SIZE = 10`，`trimPool`）：超限时先淘汰最早的
  transient（排除当前呈现页与目标页）；仍超限则在 permanent 间 **LRU**（淘汰最久
  未访问且非当前页者，该页组件 state 丢失、再访时重新挂载）；dev 下告警一次，
  视为菜单 keepAlive 配置失当的信号（减少配置或调大上限）。
- **边界**：池为纯内存，刷新后重建；页面滚动位置按产品约定不保活（每次切换回顶）；
  403 / loading 分支下池随组件树销毁重建（可接受的异常场景）。

## 3. 菜单可见性与 super_admin 的指定（NestJS 端）

**结论：侧边栏菜单由 `GET /api/menus` 按用户聚合权限位过滤；super_admin 不是代码
硬编码的角色，而是「聚合权限位 = 全量掩码」的用户——新增菜单对超管天然可见，
未经授权的菜单只对普通用户隐藏。**

- **过滤逻辑**（`nest/src/modules/menus/menus.service.ts` `buildAllowedMenuIds`）：
  1. 用户聚合权限位等于全量掩码（`9223372036854775807`，内部 `-1n`）→ 返回 null
     表示全量可见，**跳过 role_menus 过滤**，返回完整菜单树（含新建菜单）；
  2. 普通用户 → 取其所有角色在 `role_menus` 中直接授权的 menu_id 去重集合，
     再向上追溯 `parent_id` 补全祖先链（保证树形完整）；未授权菜单不可见。
- **超管身份的推导**（`nest/src/auth/auth.service.ts` `aggregatePermissions`）：
  用户权限位 = 其所有角色的 `role_menus.permissions` 按位 OR。
  运行时（菜单过滤、`permissions.guard.ts` 接口鉴权）只判定**位掩码的值**是否为
  全量掩码，不识别角色码——`super_admin` 只是种子数据里权限位恰好全 1 的角色名。
- **指定方式**：`seed.ts` 创建 `code: 'super_admin'` 角色并对每条菜单授权
  `SUPER_ADMIN_BITS`（-1n，注释明确禁止硬编码 127 等部分掩码），`admin` 用户绑定
  该角色。**再指定一个超管 = 把某用户绑到 `super_admin` 角色即可**（数据操作，
  无需改代码）。反向推论：把任意普通角色的所有菜单位配成全量位，绑定它的用户
  效果上等同超管。
- **角色管理的授权边界**：给角色勾菜单 / 配权限位只影响**绑定该角色的普通用户**；
  对超管无效。验证方式：造一个绑定普通角色（如种子里的 `admin` 角色，授权位为
  `menuFullBits` 具体组合）的测试账号，未授权菜单不可见，授权后可见。
- 前端另有 `filterHiddenMenus` 过滤 `hideInMenu` 显示属性，与授权过滤是两层，互不参与。
