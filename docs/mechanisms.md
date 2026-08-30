# 机制梳理：权限点请求 / 标签页保活 / 菜单可见性与超管 / 列表缓存展示策略

> 本文沉淀高频疑问的机制结论，供开发与排查快速查阅。
> 相关设计文档：`nest/docs/database-design.md`（§1.1 超管全量位、§1.5 菜单可见性）、
> `docs/progress.md`（keepAlive 路由缓存 + 过渡动画重构条目）、`nest/openapi/openapi.yaml`（API Contract）。
> 更新日期：2026-08-30（基于当前代码实现梳理，代码为准）。

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

## 4. 列表缓存展示策略：条件代际号 epoch（React 端）

**结论：列表查询的 queryKey 中含一个单调递增的 `epoch`（条件代际号）——「条件重构」
（搜索提交 / 筛选变更 / 重置）使 epoch +1，key 必然全新、无缓存可回放，由
`keepPreviousData` 保住旧条件结果直到新数据返回（消除重置 / 搜索时的 stale 缓存
闪回）；「数据导航」（翻页 / pageSize / 排序 / 页面切换返回）不变 epoch，目标 key
仍可命中缓存加速。**

### 4.1 问题背景（为什么需要 epoch）

- `use-list-query.ts` 的 queryKey 含全部影响列表结果的字段；React Query 对
  「key 变化但缓存已有该 key 数据」的行为是 stale-while-revalidate：**同步回放缓存
  （无论新旧）+ 后台 refetch**。
- 后果：搜索 B 后点重置（回到默认条件 A），若 A 的缓存条目还在（gcTime 5 分钟内），
  表格**立即**闪回旧 A，接口才开始加载；且全局 `staleTime: 60_000` 内重置甚至不发请求。
- `placeholderData: keepPreviousData` 对此无能为力——placeholder 只在**新 key 无任何
  数据**时兜底，有缓存时轮不到它。`staleTime` 只控制是否 refetch，**不控制是否展示
  缓存**，纯配置无法解决。

### 4.2 实现契约（硬约定）

- `create-list-store.ts`：`ListState.epoch` 初始 0；`setSearch` / `setFilters` / `reset`
  三个 action 递增（**同值幂等跳过**：重复提交相同搜索词、对已是初始态的 store 调
  reset 不 bump、不发请求）；`setPage` / `setPageSize` / `setSorting` 不递增。
- `use-list-query.ts`：导出 `buildListQueryKey`（hook 与单测共用），**epoch 位于
  prefix 之后、其余字段之前**。改 key 结构时必须同步该函数与
  `hooks/__tests__/use-list-query.test.ts` 的契约测试。
- 缓存失效兼容：各 feature 增删改后的 `invalidateQueries({ queryKey: ["roles"] })`
  为前缀匹配，命中所有 epoch 的 key；同时只有当前 epoch 的 query 处于 active，
  失效后仅 refetch 当前视图。
- 缓存碎片无需处理：同一时刻仅一个 active key，旧 epoch 条目无 observer、无渲染 /
  网络成本（KB 级静态对象），由 gcTime（5 分钟）自动回收。

### 4.3 各操作 UX 规则

| 操作 | 保留旧数据？ | 允许展示目标缓存？ | 强制请求？ |
| --- | --- | --- | --- |
| 首次加载 | — | 否（无缓存） | 是 |
| 分页 / 排序 / pageSize | 是（无缓存时 keepPreviousData） | 是（fresh 直接展示；stale 回放 + 后台刷新） | 否（fresh 期间零请求） |
| 搜索 / 筛选 / 重置 | 是（保持上一条件结果直到返回） | 否（epoch 隔离） | 是 |
| 手动刷新（refetch） | 是 | —（即当前 key） | 是 |
| 页面切换返回 | 是（keepAlive 实例存活则原样保留） | 是（条件未变，epoch 不变，同数据导航策略） | 否（stale 时后台刷新） |

- Loading 三态（v5 术语）：`isPending`＝当前 key 从未有过数据（空表 + 全量 Spinner）；
  `isPlaceholderData`＝keepPreviousData 生效中（旧数据 + 半透明遮罩）；
  `isFetching && !isPlaceholderData`＝后台刷新（当前数据 + 半透明遮罩）。
  `use-list-query.ts` 对外返回字段名保持 `isLoading`（页面层以该名解构），实现映射
  `query.isPending`（查询始终 enabled，二者等价）。
- 「页面切换返回」不是闪回：闪回的定义是**展示结果与当前查询条件不匹配**；返回时
  条件未变，展示的缓存即当前条件对应的数据。列表状态存于 feature 内 zustand store
  （非 URL），专为按 fullPath 分池的 keepAlive 实例设计（见 §2 与 store 头注释）。
- 竞态：由 React Query per-key 隔离保证——条件连续变更时，慢响应只写入自己 key 的
  缓存条目，不影响当前视图；`use-list-query.test.ts` 有显式用例覆盖。
- 边界定义：搜索 / 筛选 / 重置＝**条件重构**（强制新请求）；翻页 / 排序 / pageSize /
  页面返回＝**数据导航**（允许缓存加速）。重复搜索同一词永远重新请求，属预期行为；
  未来若要「重复搜索秒出」，可叠加工具栏 hover 时 `queryClient.ensureQueryData` 预热
  （独立增量，未实现）。
- 收益范围：所有使用 `useListQuery` 的列表（当前 users / roles，后续模块迁移即得）；
  dicts / menus 为各自独立查询（tree/detail 场景），不在该链路上。

## 5. 用户写操作保护：本人 / admin / super_admin 三层规则（NestJS 端，契约 v1.4.6）

**结论：用户的删除 / 批量删 / 停用 / 重置密码 / 编辑停用在 `users.service.ts` 统一过
`assertTargetOperable` 保护，规则顺序＝本人（400 SELF_OPERATION_FORBIDDEN）→ 内置
admin（403 ADMIN_USER_PROTECTED）→ super_admin 绑定用户（403
SUPER_ADMIN_USER_PROTECTED）；前端只做入口隐藏止损，后端为契约级强制校验。**

- **判据实现**（`nest/src/modules/users/users.service.ts`）：
  1. 本人：`target.id === operatorId`（`operatorId` 来自 JWT，前端传什么都不算数）；
  2. 内置 admin：`target.username === 'admin'`（seed 固定创建，模块内常量
     `ADMIN_USERNAME`）；
  3. super_admin 绑定：`filterSuperAdminIds` —— `user_roles` inner join `roles`
     where `roles.code = 'super_admin'` 的**直接绑定查询**。
- **关键边界：绑定查询 ≠ 聚合权限位。** §3 的反向推论（把普通角色配成全量位，
  绑定它的用户在接口鉴权 / 菜单可见性中等同超管）在用户写保护中**不成立**：
  保护判据只认 `roles.code === 'super_admin'` 的直接绑定，不认聚合位。即「全量位
  普通角色」的用户可以删除/停用/重置普通用户与"伪超管"，但不是保护豁免主体。
  两套判据并存是有意为之：接口鉴权回答「能不能做」，保护规则回答「对谁不能做」。
- **豁免安全性**：操作者自身绑定 super_admin 时可操作其他 super_admin 用户
  （`assertTargetOperable` 内二次查询操作者绑定）。豁免不会锁死系统——admin 用户
  受规则 2 绝对保护删不掉，超管账号数量不可能归零。前端以
  `AuthUser.roles.includes('super_admin')` 同口径对齐（登录响应 roles 为角色 code
  列表，`auth.service.ts`）。
- **启用不受保护约束**：三层规则仅在「危险方向」生效——停用（`updateStatus` 仅
  status=disabled 时校验）、删除、重置密码；启用任何用户（包括自己、admin、
  super_admin 用户）不校验。前端行操作据此按目标状态分别判定按钮显隐，而非整行
  隐藏停用/启用。
- **批量全有全无**：`batchRemove` 先做存在性校验（INVALID_OPERATION），再
  `assertBatchOperable`——任一目标命中规则即整体拒绝，错误码取最高优先级命中项。
- **编辑旁路已关闭**：`PUT /users/{id}` 的 DTO 含 `status`，目标为受保护用户且
  请求 `status=disabled` 时同权拦截（编辑邮箱/昵称/角色不受限）。
  已知未拦点：`roleIds` 全量替换可摘除 super_admin 绑定（摘绑定不锁死系统，
  见 progress.md v1.4.6 条目待办）。
