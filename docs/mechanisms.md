# 机制梳理：权限点请求 / 标签页保活 / 菜单可见性与超管 / 列表缓存展示策略

> 本文沉淀高频疑问的机制结论，供开发与排查快速查阅。
> 相关设计文档：`nest/docs/database-design.md`（§1.1 超管全量位、§1.5 菜单可见性）、
> `docs/progress.md`（keepAlive 路由缓存 + 过渡动画重构条目）、`nest/openapi/openapi.yaml`（API Contract）。
> 更新日期：2026-09-09（基于当前代码实现梳理，代码为准）。

---

## 0. 路由过渡（View Transition）的两条硬约束：位移必须留痕在主体盒内 + 进出场可分时（React / Vue 端）

**结论一：`::view-transition-old/new()` 只是挂在根级覆盖层里的位图，给它加 `overflow: clip`
在 Chromium 上不生效——位移多少，快照就真的会越过主体区边界盖到标签栏 / 顶栏 / 侧边栏上。**

- **机理**：`::view-transition` 是根上的固定层（UA `z-index: 2147483646`），只按**视口**裁剪；
  具名组的旧/新快照是两张位图，`transform` 施加在图片上。给伪元素声明 `overflow: clip`
  可计算值确实变成 `clip`（`getComputedStyle` 可验证），但**不参与绘制裁剪**。
  给实时元素加 `clip-path: inset(0)` / `overflow: clip` 也不影响已捕获的快照。
- **实测证据（本机 Chromium 152，CDP 驱动）**：`cover` 的 `translateX(100%)`（主体宽 960px）
  会让新页整幅横穿侧边栏；`rise` 的 `translateY(40px)` 会把页面内容顶进标签栏
  （像素级复现：t=400ms 冻结帧里黑色顶部内容条上移、红顶栏被吃掉一截）。
- **唯一可靠的两条路**：① 把位移/缩放幅度压到"出不了盒"（纵向 ≤ ~10px、缩放 ≤ 1.02、
  横向不做整幅平移；覆盖类改用**盒内 `clip-path` 擦除**，视觉上仍是"推入"）；
  ② 给**组盒** `::view-transition-group(main-content) { overflow: clip }` 兜底——
  实测可完全消除顶栏/侧边栏污染，且对忽略该属性的内核会退化为原行为、无害。
- **落地**：`react/src/styles/route-transitions.css` 与 Vue 端同源副本（2026-09-11 起同款）。

**结论二：View Transition 的旧/新快照默认同时起跑同时收尾（`startViewTransition` 的模型），
可用 `animation-delay` + `fill-mode: both` 拆成"旧页先行、新页压后"，且**总时长不变**。**

- **做法**：`:root` 派生 `--rt-exit`（0.6×基准）/ `--rt-enter`（0.65×基准）/ `--rt-stagger`（0.35×基准），
  旧页用 `--rt-exit`、新页用 `--rt-enter` + `animation-delay: var(--rt-stagger)`；
  `both` 填充保证延迟期间新页停在首帧（不提前露脸）、旧页延迟结束后停在末帧（不闪回）。
  0.6×420 + 0.35×420 = 399ms ≤ 基准，新页结束时刻 = 147 + 273 = 420ms = 基准总时长。
- **哪些预设不分时**：`fade` 的语义就是交叉淡化（保持全程重叠）；`reveal` / `circle` 本来就是
  "旧页静止被覆盖"，分时反而破坏观感。
- **验证口径**：`document.getAnimations()` 按 `effect.pseudoElement` 过滤后读 `effect.getTiming()`
  即可核对（实测：glide/rise/zoom/blur = old 252ms/delay 0 + new 273ms/delay 147ms；
  fade/reveal/cover/circle = 420ms/0）。
- **排查提醒**：`Page.captureScreenshot` 在本机 Chrome/Edge 上会把 VT 覆盖层拍成**终态**
  （暂停帧与真实时钟两种口径都试过），因此"过渡中帧"不能用它验证；用冻结帧 + 逐像素读取
  或用 `getComputedStyle(el, '::view-transition-…')` 读关键帧值更可靠。

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
  loading / 菜单校验失败走 overlay，池保持挂载不销毁；403（无权访问）自
  2026-08-30 起改为 replace 跳转独立 /403 页——离开 `_authenticated` 布局，
  池随组件树销毁（跳转过渡帧以 loading 覆盖层兜底，误登记的标签页随跳转撤销）。

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
  页面返回＝**数据导航**（允许缓存加速）。重复搜索同一词永远重新请求（经 §4.4
  搜索按钮的 refetch 分支实现），属预期行为；
  未来若要「重复搜索秒出」，可叠加工具栏 hover 时 `queryClient.ensureQueryData` 预热
  （独立增量，未实现）。
- 收益范围：所有使用 `useListQuery` 的列表（当前 users / roles，后续模块迁移即得）；
  dicts / menus 为各自独立查询（tree/detail 场景），不在该链路上。

### 4.4 搜索按钮的「提交 / 刷新」双语义（react / next / vue 三端一致）

**结论：搜索按钮不因「条件未变化」禁用——点它要么提交新条件、要么刷新当前列表，
永远不会无反应。**

- **背景**：搜索按钮原先在 `searchDirty`（输入与已生效条件不一致）为 false 时禁用，
  但「提交新条件」与「刷新列表」是两个语义，禁用会杀死后者——用户想刷新列表时
  无入口可点。而直接放开禁用也不行：`setSearch` 同值幂等（§4.2），同值点击是
  no-op，按钮「点了没反应」比禁用更差。
- **实现**（`useListQuery.submitSearch(input)`，核心为独立导出的纯函数
  `submitListSearch`，react / next / vue 三端逐字同构）：
  - 输入与已生效条件**不同** → `setSearch`：正常提交（epoch +1、回第 1 页）；
  - **相同** → `setSearch` 同值幂等不会发包（§4.2），改走 `refetch()` 强制绕过
    缓存重新请求：当前页码 / 筛选 / 排序全保留，`keepPreviousData` 保住旧数据
    不闪空（对应 §4.3 表格「手动刷新」行）。
- **组件层**：`DataTableSearchReset` 搜索按钮仅在 `isFetching` 时禁用 + pending
  （防重复点击）；`searchDirty` prop 已删除（`searchDirty` 变量仍可参与页面
  `canReset` 计算）。纯本地过滤页（menus / permissions / dicts 类型树）无请求
  语义，搜索恒可点、同值应用为 no-op，无刷新诉求。
- **覆盖页面**：服务端分页页（users / roles / org posts / logs / notices /
  org directory / dicts 字典项）全部接入 `submitSearch`；对应提交回调从
  `setSearch(...)` 换为 `submitSearch(...)`。
- **与 §4.2 的关系**：store 层同值幂等保持不变（URL 同步 effect 等隐式调用仍依赖
  它防重复请求）；「同值也发请求」只发生在**用户显式点搜索**这一路径上，
  §4.3 边界定义中「重复搜索同一词永远重新请求」自此经 refetch 分支真正成立。
- **单测**：`react/src/hooks/__tests__/use-list-query.test.ts` 与
  `vue/src/composables/__tests__/use-list-query.test.ts` 的 `submitListSearch`
  两分支用例（异值 → epoch+1 回第 1 页；同值 → refetch 且不 bump epoch）。

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
- **super_admin 角色绑定变更已拦截**：`POST /users` 与 `PUT /users/{id}` 的
  `roleIds`（含全量替换）经 `assertValidRoleBindingChange` 校验——非超管操作者
  移除或添加 super_admin 绑定一律 403 `SUPER_ADMIN_ROLE_BINDING_PROTECTED`，
  操作者自身绑定 super_admin 时豁免（超管间互操作不锁死系统）。
  组合场景口径（如「先摘后挂」分两次请求的中间态、并发授权竞态）待评审，
  当前以「单请求内最终 roleIds 集合」为判定粒度。

## 6. 前端权限快照与同步机制：登录快照 + 挂载时 /auth/me（React 端）

**结论：权限有「服务端实时」与「前端快照」两层——服务端每请求实时聚合、永远权威；
前端快照（user.permissions / 菜单缓存）只决定渲染。快照的生效语义是「刷新页面
生效」：AdminLayout 挂载时请求 GET /auth/me 覆盖登录快照，SPA 会话内不再同步。**

- **服务端实时层**：`jwt.strategy` 每请求经 `loadUserWithPermissions` 实时聚合
  `user_roles → role_menus` 权限位；`GET /menus` 每次现算可见性；`PermissionsGuard`
  按实时位拦截。因此**前端快照过期只造成 UI 展示滞后，永远不会越权**——点了
  已无权的按钮会被 403 拒绝。
- **前端快照层**（两份独立快照，更新时机不同）：
  1. `user.permissions`（按钮门控 `useHasPermissionKey` 的唯一依据）：登录响应
     计算一次，zustand persist 落 localStorage。**同步通道只有 `useAuthSync`**——
     `AdminLayout` 挂载时请求 `/auth/me`（后端实时聚合，契约已存在），用返回值
     覆盖 auth-store 的 user（`setUser`）。F5 / 首次进入即最新；SPA 会话内
     （不刷新）保持登录时的值，属接受的权衡（会话内不额外发请求）。
  2. 菜单树（`useMenus`，queryKey `["menus"]`，staleTime 60s）：数据本身来自
     后端实时接口，F5 后 React Query 缓存重建即重取最新；SPA 会话内由
     staleTime 控制陈旧窗口，管理员保存角色授权弹窗时会 invalidate 操作者
     自己的菜单缓存。
- **缓存卫生**：`clearSession` / `resetAuth` 时 `removeQueries(AUTH_ME_QUERY_KEY)`，
  防止换账号登录后命中上一账号的快照缓存。`AUTH_ME_QUERY_KEY` 定义在
  auth-store（下层）供 `use-auth-sync` 引用，避免 store ↔ hook 循环依赖。
- **设计取舍**：管理后台权限变更为低频事件，未采用推送（WebSocket/SSE）或
  权限版本号探测等「在线即时生效」方案；如未来需要即时生效语义，演进路径为
  权限版本号（API 响应携带版本，前端发现变化重拉 /auth/me + invalidate menus），
  无需引入长连接。

---

## 7. 组织架构图谱与通讯录 Excel 导出（React 端，阶段 4）

> 更新日期：2026-09-03。对应代码：`react/src/features/org/org-chart*.ts(x)`、
> `directory-export.ts`、`directory-page.tsx`、`routes/_authenticated/org/{chart,directory}.tsx`。

### 7.1 React Flow v12 只读配置（@xyflow/react 12.11）

- 编辑能力全部关闭：`nodesDraggable={false}`、`nodesConnectable={false}`、
  `elementsSelectable={false}`、`edgesFocusable={false}`、`zoomOnDoubleClick={false}`；
  Controls 用 `showInteractive={false}` 隐藏「锁定交互」按钮，只留 Zoom In / Out / Fit View。
- `nodeTypes` 必须是模块级常量——组件内字面量会随渲染重建触发 React Flow 性能警告。
- 折叠 / 展开 = 受控 nodes/edges 重算：`collapsed: Set<string>`（空集 = 全展开），
  按可见子树 relayout（父节点居中于子树 span），不自动 fitView（保持用户视角）；
  节点 data中的 `onToggle` 由页面 `useCallback` 提供（functional setState 保证引用稳定）。
- Handle 隐藏后仍可锚定连线：`style={{ visibility: "hidden" }}` + `isConnectable={false}`。
- 懒加载：`React.lazy(() => import("./org-chart"))`，@xyflow/react 及其 CSS 独立 chunk
  （约 180KB / gzip 58KB），不进主包；`import "@xyflow/react/dist/style.css"` 写在图谱组件模块内。

### 7.2 手写树布局替代 d3-hierarchy

- 组织树为严格树 + 固定节点尺寸（220×84），「子树宽度先序分配」即可：
  叶子宽 = 节点宽；内部节点宽 = max(自身, Σ子树宽 + 兄弟间距)；子树布完后父节点居中于子树 span。
  约 60 行零依赖，不引入 d3-hierarchy（阶段 4 选型评审约束：确认需要前不提前引入）。
- 正确性前提：节点 DOM 尺寸必须与布局常量一致（org-chart-node 用 style width/height 锁定）。

### 7.3 write-excel-file 4.x API 与旧版 / 常见文档的差异（踩坑）

- exports 无裸 `"."` 入口：必须 `write-excel-file/browser`（浏览器）/ `/node` / `/universal`
  子路径导入，否则 rolldown 构建报 "not exported under conditions"。
- 行数组模式下 `columns[].cell` 是**按行回调** `(object, objectIndex) => Cell`，不是静态样式对象。
- **`columns[].header` / `columns[].cell` 不会被 `writeXlsxFile` 内部消费**（4.1.1 运行时
  initializeSheets 无 header 逻辑）——直接把 objects + columns 传给 writeXlsxFile 时
  表头行不生成、全部单元格样式丢失（值倒是会按数组直写）。**必须先调库导出的
  `getSheetData(objects, columns)` 转成 SheetData**（自动拼表头行 + 应用单元格样式），
  再把 SheetData 传给 writeXlsxFile；`stickyRowsCount` 保持在 sheetOptions。
  排查手段：xlsx 即 zip，解包看 `xl/sharedStrings.xml`（有无表头文字）与
  `xl/worksheets/sheet1.xml`（行数、`s=` 样式索引是否分化）即可定位数据层 / 样式层。
- `writeXlsxFile(objects, sheetOptions, options)` 的 options 只有 fontFamily / fontSize / features
  ——**没有 fileName**；返回 `{ toBlob(): Promise<Blob>, toFile(fileName): Promise<void> }` 句柄，
  浏览器下载走 `.toFile("xxx.xlsx")`。
- 动态 `import("write-excel-file/browser")` 放在导出动作内，通讯录页初始包不受影响。
- 4.x 样式属性命名与常见文档 / 直觉不同：字体色是 **`textColor`**（非 `color`）、
  垂直对齐是 **`alignVertical`**（非 `verticalAlign`）；四边统一边框用
  `borderColor` + `borderStyle`（'thin' 等）。
- objects 模式下单元格的**值与样式统一由 `columns[].cell(object, objectIndex)` 回调产出**
  （这一转换发生在 `getSheetData` 内，须返回 `{ value, ...style }`）；
  `columns[].header` 为列头 Cell——只要有一列配了 header，`getSheetData` 即自动生成表头行，
  此时 objects 只含数据行，`objectIndex` 自第一条数据行起 0 计（斑马纹按此索引）。
- 全局字体 / 字号走第三个参数 `Options { fontFamily, fontSize }`（仅 fontFamily /
  fontSize / features 三类字段，无 fileName / 样式）；`stickyRowsCount: 1` 冻结表头
  在第二个参数 sheetOptions。

### 7.4 URL Query ↔ list store 双向同步（KeepAlive 页面）

- URL → store：effect 内先 `store.getState().filters.deptId` 比较、不同才 `setFilters`，
  避免手动回写 URL 触发的 effect 空转（防 epoch 重置循环）。
- store → URL：树点击 / 清除时 `navigate({ replace: true, search: {...} })`（replace 不塞历史）；
  `validateSearch` 在 route 文件声明 `deptId?: string`。
- 效果：图谱跳转 `/org/directory?deptId=xxx` 后，刷新 / 分享 / 前进后退均恢复筛选；
  页内操作地址栏实时跟随。

## 8. Vue 端启动挂载时序：必须 `router.isReady()` 后再 `app.mount()`（Vue 端，M1 验收修复）

**结论：`main.ts` 在 `router.isReady().then(...)` 中挂载应用；提前挂载会在公共页
（如 `/sign-in`）误挂 AdminLayout 并引发「401 → 整页刷新」死循环。**

- **竞态根因**：`app.mount()` 时 vue-router 的初始导航尚未解析，`useRoute()` 返回
  初始占位路由（`path: "/"`）。AppShell 的 `useAdminLayout` computed 读 `route.path`
  → 在 `/sign-in` 上误判为认证页 → 挂载 AdminLayout。
- **连锁反应**：布局内 `useMenus()` 发起无 token 的 `GET /menus` → 401 →
  api-client refresh 失败 → `redirectToSignIn()` 执行
  `window.location.assign("/sign-in")` → 整页刷新 → 回到「挂载时占位路由为 /」
  → 无限循环（每次刷新写一条 error.401 日志，~7 次/秒打满主线程，表现为
  「页面卡死 / 白屏」）。
- **修复**：`vue/src/main.ts` 改为 `router.isReady().then(() => app.mount("#app"))`。
  挂载时初始导航已完成，`route.path` 即真实路径，公共页不再误挂布局。
- **排查手法（可复用）**：怀疑页面死循环时，给关键组件 `onMounted` 挂
  `navigator.sendBeacon` 探针发到本地日志代理（记录 `location.href` /
  `localStorage` 快照），beacon 在页面卸载/冻结前也能发出，比 console 可靠。

## 9. vue-query 查询信封对象的属性在模板中不会自动解包（Vue 端，M1 验收修复）

**结论：`const q = useQuery(...)` 的返回对象是普通对象，其属性是 Ref；模板里
`v-if="q.isLoading"` 判定的是 Ref 对象本身（恒 truthy），必须解构（`const { isLoading } =
useQuery(...)`）或显式 `q.isLoading.value`。**

- **事故**：`DictsPage.vue` 左栏 `v-if="typesQuery.isLoading"` 恒真 → 字典类型列表
  永远渲染骨架屏（接口实际已 success 且计数显示 3，表象矛盾）。
- **为什么其他页没事**：MenusPage 等均按官方写法解构 `const { data, isLoading,
  isFetching } = useQuery(...)`，顶层 ref 在模板中自动解包。
- **判据技巧**：怀疑此坑时，通过
  `document.querySelector('#app').__vue_app__._instance` 遍历组件树读
  `setupState.xxxQuery.isLoading`，若为 `{ isRef: true }` 即中招；同理可读
  `__vue_app__._context.provides` 中的 QueryClient 直接检查缓存各查询的
  `status / fetchStatus`，区分「接口问题」与「响应性问题」。

## 10. KeepAlive 池内路由组件禁止严格匹配 useSearch/useParams（React 端）

**结论：实例池渲染的路由组件脱离了路由树 MatchContext，在「match 已移除但组件
仍在渲染」的窗口内，`Route.useSearch()` / `Route.useParams()` 等严格匹配 hook 会抛
`Invariant failed: Could not find an active match from "<routeId>"`。池内路由读
URL 参数一律用 `useSearch({ strict: false })` / `useParams({ strict: false })`
全局读取；`validateSearch` 保留负责写入校验。**

- **机制**（`@tanstack/react-router` 1.168.x）：严格匹配经
  `useMatch({ from })` → `router.stores.getRouteMatchStore(routeId)` 派生 store
  读 match；导航提交（`setMatches`）会把离开页面的 match 从 `matchStores` /
  `matchesId` 中删除，snapshot 变 `undefined`，selector 的 `shouldThrow` 分支即抛
  上述 Invariant（`react/src/routes/_authenticated/my-notices.tsx` 注释为首例记录）。
- **偶现根因是竞速**：离开页面时池面板的过渡帧仍 visible；开启路由 VT 动画时，
  池提交（`startViewTransition` 回调，下一帧）晚于 matches 提交（`onReady`
  微任务）→ 窗口必踩；无动画时 `useLayoutEffect` 同步提交先行 → 不崩。次级路径：
  hidden 保活实例被全局状态更新（标签增删/刷新、菜单刷新等）拖动被动重渲染
  （`keep-alive-outlet.tsx` 注释中的已知边界「隐藏实例仍订阅 Router Context」）。
- **项目先例**：`my-notices.tsx`、`org/directory.tsx` 用
  `useSearch({ strict: false })`；`notice-detail-page.tsx` 用
  `useParams({ strict: false })`（全仓唯一动态路由
  `org/notices_.$noticeId.tsx`）。登录页 `sign-in.tsx` 的 `Route.useSearch()`
  在 `(auth)` 布局、不入池，不受影响。
- **防回归守卫**：`react/src/lib/__tests__/strict-route-hooks.test.ts` 静态
  扫描池内组件源码范围（`routes/_authenticated` + `features` / `layouts` /
  `hooks` / `components`），拦截 `Route.useXxx()`、`useXxx({ from })`（含
  `shouldThrow: false` 豁免）与无参 `useParams()`（池内读到布局层 params
  恒空对象，静默取值 bug）；`pnpm test`（vitest）阶段即报红，附修复指引。
- **strict:false 的读取路径**：从最近 match（池内即 `_authenticated` 布局
  match）的 `match.search` 读取；search 自全量 location search 逐层继承，父级
  match 含 URL 上全部参数（含子路由参数），故能读到。但它**不经过**本路由
  `validateSearch` 的规整（`?deptId=` 空串原样返回），读取侧需按同样规则自行
  规整。
- **Next.js 端无此问题**：App Router 无实例池（页面切走即卸载），且
  `useSearchParams()`（`next/navigation`）读当前 URL、不依赖 route match。

---

## 11. 列表排序口径：权重 / 序号 / 流水 / 内容四型 + id 兜底（NestJS 端，契约 v1.7.2）

**结论：全站分页列表统一为「主排序列 → createdAt 降序 → id 降序」的兜底链；
主排序列按实体语义分四型，sort 方向不搞全站一刀切。**

- **四型口径**（契约 v1.7.2，实现为各 service 的 `orderBy`）：
  - **权重型**（sort 降序，数字越大越靠前）：角色列表、部门树/分页列表。
    语义是「权重大的在前」，新增想置顶填大数字即可，无需批量调整存量。
  - **序号型**（sort 升序，小在前）：菜单树（`/menus`、`/menus/tree`）、字典项。
    菜单 sort 是**导航序号**（seed：系统管理=1 在前），字典项 sort 是**枚举序**
    （启用=0 在前、下拉顺序依赖它）——翻转方向 = 全站侧边栏/字典下拉倒序，
    且需迁移线上共享库数据，故方向锁定为升序，靠注释与契约说明防误改。
  - **流水型**（createdAt 降序）：日志、站内信、字典类型列表、岗位成员列表。
  - **内容型**（置顶优先）：公告列表 `isTop DESC → 主排序列 → createdAt DESC → id DESC`。
- **id 兜底是分页正确性而非风格**：PostgreSQL 对非唯一排序列不保证稳定顺序，
  createdAt 精度内同秒多条时，仅按时间排序翻页会出现重复行/丢行；全表主键为
  text nanoid（唯一稳定），`id DESC` 作为最终 tie-breaker 消除该问题。
- **表头排序只替换主排序列**：`GET /users`、`/org/posts`、`/org/directory`、
  `/org/depts`、`/notices` 接受 `sort`（白名单防注入）+ `order` 参数，仅覆盖链首
  业务列；次级 `createdAt DESC + id DESC` 固定（主列即 createdAt 时不重复拼接）。
  菜单/角色/字典项列表为写死排序，不支持表头排序参数。
- **角色摘要同口径**：用户管理 / 我的账户内嵌的 roles 摘要列表排序与角色管理
  列表一致（`sort DESC, name ASC`），避免「角色列表排第一的角色在用户详情里
  排最后」的错位观感。
- **教训**：改动 sort 方向前必须先核对 seed 与存量数据的语义方向——
  「统一方向」只对权重语义成立；序号语义的实体（菜单/字典项）方向由数据定义，
  代码跟着数据走，不跟「统一」走。



---

## 12. 用户/密码输入长度约束：bcrypt 72 字节截断是隐性口径（NestJS 端，契约 v1.7.3）

- **bcrypt 只取前 72 字节（UTF-8）**：项目用原生 `bcrypt` 6.0.0，其 README 明确
  超出 72 字节的输入「被忽略」——不报错、**静默截断**。后果是「设置 100 位密码，
  前 72 字节即可登录」，与用户预期不符；且 72 是**字节**不是字符（中文/emoji 每字符
  2-4 字节）。DTO 层 `@MaxLength(72)` 是字符级近似（全 4 字节字符时字节数仍可超 72），
  把风险从「无限长」收敛到「最多 288 字节」，边缘场景接受截断不报 500。
- **前后端口径统一为「6-72 位」**：服务端三处 DTO（`CreateUserDto.password` /
  `ResetPasswordDto.newPassword` / `UpdateAccountPasswordDto.newPassword`）补
  `@MaxLength(72)`；React 三处表单（用户新增 / 重置密码弹窗 / Account 改密卡）zod
  同步 `.max(72)`，i18n 文案写「6-72 位」。上限常量 `PASSWORD_MAX_LENGTH` 由
  `user-form-dialog.tsx` 导出、重置密码弹窗复用。
- **文本字段两端同规**：username / displayName 后端补 `@MinLength(1) @MaxLength(50)`
  + `@Transform` trim（与前端 zod `.trim()` 口径一致——trim 后的值才参与唯一索引与
  `ADMIN_USERNAME` 精确比较，带空格绕过保护属于脏数据）；email 补 `@MaxLength(100)`；
  employeeNo 原本就有 `@MaxLength(50)`。前端 4 字段（username / displayName / email /
  employeeNo）用 `InputGroup.Suffix` 实时字数 `x/上限`（参考 `dict-type-form-dialog`）。
- **注意**：`ValidationPipe` 需 `transform: true`（`main.ts` 已配）Transform 才会在
  validate 前执行——trim 后的值参与 `@MinLength(1)` 校验，纯空格输入会被拦截。

---

## 13. vue-i18n 与 i18next 文案语法冲突：裸 `@` 编译崩溃 + Reka Select 空串 value（Vue 端）

- **裸 `@` 是 vue-i18n linked message 语法前缀**：`sync-locales` 从 react 复制的
  文案含 `@`（如 `features.users.form.emailPlaceholder` = `name@example.com`）时，
  vue-i18n 把 `@e...` 解析为 linked format，消息编译抛 `SyntaxError: Invalid linked
  format`（unhandledrejection），**引用该文案的组件渲染中断**——表现为「点击新增
  用户弹窗不打开、控制台报错」。i18next 无此语法，react 真源无需修改。
- **修复机制在同步脚本**：`vue/scripts/sync-locales.mjs` 在 `cpSync` 后递归遍历
  `locales/<locale>/*.json`，把消息值中的 `@` 统一转义为字面量插值 `{'@'}`；先还原
  已有 `{'@'}` 再统一转义保证**幂等**。JSON 往返用 `JSON.stringify(msg, null, 2)`，
  与源格式（2 空格缩进扁平键）一致，diff 仅含转义行。注意 `readdirSync` 不递归，
  locale 是两级目录结构，必须自写递归收集。
- **Reka UI 保留空串 SelectItem value**：Nuxt UI `USelect` 底层 Reka UI 约定空串
  value 是「清除选择回到 placeholder」的保留值，业务空选项（性别「未设置」
  `{ value: '' }`、主岗「无主岗」）会刷 `A <SelectItem /> must have a value prop
  that is not an empty string` 告警。修法：**哨兵值 + 提交/回显映射**——组件内定义
  `GENDER_UNSET = "unset"` / `MAIN_POST_NONE = "none"`，schema 枚举含哨兵，提交经
  `toNullable(value, sentinel)` 转 `null`（泛型 `Exclude<T, S>` 保持 API 入参字面量
  类型），回显 `null ?? sentinel`；列表 store 联动 watch 需排除哨兵避免误重置。
- **排查提醒**：`UModal` 关闭后 teleport DOM 残留（视觉已卸载、a11y/DOM 查询仍可见），
  自动化判定弹窗开关必须按 `display`/`offsetParent` 过滤或以截图为准（M1 已知问题在
  用户表单验证中再次出现）。

---

## 15. Vue 端路由过渡 VT 编排：守卫内启动 + afterEach 放行（Vue 端，M3）

**结论：Vue Router 没有 React 端 `displayedPath` 双缓冲的等价物，路由过渡在导航
流程内编排——`beforeResolve` 里启动 ViewTransition（此时浏览器捕获真实旧帧），
`await` 快照回调被调用后再放行导航；导航提交、RouterView 渲染新页并在
`nextTick` 落到 DOM 后 resolve 回调的 Promise，浏览器据此捕获新帧并播放 CSS 预设。**

- **为什么不在 KeepAliveOutlet 里自管呈现路径**：RouterView 作用域插槽的 VNode 由
  内部 `matchedRouteRef` 驱动，pending 期间继续渲染旧 VNode 需要克隆并与其内部
  状态博弈；Nuxt `experimental.viewTransition` 验证过的守卫编排更稳。Vue 端
  `router.beforeResolve/afterEach` 在 KeepAliveOutlet `setup` 内注册、
  `onUnmounted` 注销——登录页等布局外场景天然无路由动画（React 端为整树替换语义）。
- **回调放行链**：`beforeResolve` 创建两个 promise——`ready`（VT 快照回调被调用时
  resolve，放行导航）与 `rendered`（`afterEach` 后 `nextTick` resolve，表示新页
  DOM 已提交）。回调返回 `Promise.race([rendered, 2s 超时])`，超时兜底防极端情况下
  页面被快照层冻结。快速连续导航：新导航覆盖 `pendingNavigation` 时先放行旧回调，
  旧 VT 随新 `startViewTransition` 自动 skip；`afterEach` 按 `to` 引用匹配仅处理
  本次登记（守卫与 afterEach 收到同一 `toLocation` 引用），被取消的导航无论成败都
  放行避免回调悬挂。
- **主体区命名**：UDashboardPanel 的 body（滚动容器）经 `:ui="{ body: 'route-vt-main' }"`
  绑定 `.route-vt-main { view-transition-name: main-content }`——不能用 React 端的
  `data-vt-name` 属性方案（无法给组件内部元素加属性），主题切换摘名规则同步改为
  `html[data-theme-transition] .route-vt-main`。React 端曾在
  `05f5cff` 全宽布局改造时误删 `<main>` 上的 `[view-transition-name:main-content]`
  类（仅剩 data-vt-name 标记，main-content 快照组不存在、路由动画静默失效），
  `3939abe` 已补回——Vue 端实现 UI 组件 `:ui` 无法附加属性时的 class 等价方案。
- **门控与 toast**：`lib/route-vt.ts` 的 `startRouteVt` 在 VT 期间设
  `html[data-route-vt]`，route-transitions.css 的动画选择器要求该标记与常驻
  `data-route-transition` 同时存在；已核实 Nuxt UI / Reka UI 的 toast 走 CSS
  transition 不启动根级 VT，门控为纯防御。标签「刷新」复用同套门控：已应用序号
  （`appliedRefreshSeq`）与 store 分离，VT 回调内提交序号 + include 摘一拍。


## 14. UInputDate 与字符串日期字段桥接：writable computed，state 语义不变（Vue 端）

- **`UInputDate`/`UCalendar` 的模型是 `DateValue`（`CalendarDate`）对象**，而项目
  API 契约与 UForm zod schema 的日期字段是 `YYYY-MM-DD` 字符串。不要把 schema/state
  改成对象语义——用 writable computed 桥接：`get` 把 `state.entryDate` 字符串经
  `parseDate`（`@internationalized/date`，非法抛错 catch 后返回 undefined = 未设置）
  转为 `CalendarDate`，`set` 用 `toString()` 转回 `YYYY-MM-DD`（`CalendarDate.toString()`
  即 ISO 扩展格式）。这样 zod 校验（`ENTRY_DATE_RE`）、编辑回显、提交 `|| null` 映射
  全部零改动，`UCalendar` 弹层与 `UInputDate` 共用同一 computed 即可双向同步。
- **`UInputDate` 的 `placeholder` prop 是日期不是文本**（Reka DatePickerRoot 的
  占位 `DateValue`，控制无值时日历聚焦月份），传字符串会 TS 报错；分段输入的空态
  占位（yyyy/mm/dd）由组件内置渲染，无障碍名用 `aria-label` 提供。
- **日历弹层结构**：`#trailing` 插槽内 `UPopover :reference="input?.inputsRef.at(-1)?.$el"`
  把日历锚定到最后一个分段输入（官方示例 `inputsRef[3]` 同义，`.at(-1)` 对粒度变化
  更稳）；popover 打开后自身也是 `[role=dialog]`（与业务 UModal 同角色），自动化
  判定弹窗可见性需按内容区分；日期单元格定位用 `div[data-reka-calendar-cell-trigger]
  [data-value="YYYY-MM-DD"]`（v4 不渲染 `table[role=grid]`）。既有范例：
  `NoticeFormDialog` 发布日期 / `UserFormDialog` 入职日期。

---

## 16. Vue 端 M4 冒烟四条机制结论（常驻挂载查询 / 动态标题 / Nuxt UI locale 缺键 / 无渲染组件）

> 更新日期：2026-09-11。对应代码：`vue/src/features/roles/use-grant-tree.ts`、
> `vue/src/lib/route-access.ts`、`vue/src/router/guards.ts`、`vue/src/layouts/AdminLayout.vue`、
> `vue/src/components/layout/TagsBar.vue`、`vue/src/components/common/progress-provider/progress-bridge.vue`。

### 16.1 常驻挂载的浮层组件：依赖 props 的 useQuery 必须显式 `enabled` 门控

**结论：Vue 端浮层（Drawer / Modal / Slideover）以 `v-model:open` 受控、组件常驻挂载时，
props 上的业务 id 在关闭态是空值；任何以该 id 为参数的 `useQuery` 都必须加
`enabled: computed(() => id !== "")`，否则页面加载即发出畸形请求。**

- **实例**：`RolesPage` 的 `<RoleGrantDrawer>` 无 `v-if`、关闭时传 `:role="null"`，
  抽屉内 `roleId = props.role?.id ?? ""`；`useGrantTree` 的 `roleMenusQuery` 无门控
  → 角色页一加载就请求 `GET /roles//menus`（双斜杠、空 id）→ 404 并污染控制台。
- **为什么 React 端没有**：React 端 `role-grant-drawer.tsx` 的 query 在抽屉组件内部，
  而抽屉由 HeroUI Modal 按需挂载（关闭即卸载），`roleId` 恒为有效值——
  **这是「框架挂载语义差异」而非业务逻辑差异**，跨端移植时容易漏。
- **修法**：`enabled: computed(() => roleId() !== "")`。注意 `queryKey` 用 computed
  时，`enabled` 同样需为响应式（`MaybeRefOrGetter`），否则切换角色不会重新取数。
- **同类排查面**：所有「列表页常驻渲染抽屉/弹窗 + 抽屉内按 id 取详情」的组合
  （用户重置密码、日志详情、岗位成员、公告详情等）都要检查同一模式；
  症状是页面初载出现 `/xxx//yyy` 或 `/xxx/undefined` 类请求。

### 16.2 文档标题 / 面包屑 / 标签标题必须支持动态路由前缀匹配

**结论：以 `Record<path, titleKey>[route.path]` 精确匹配的标题映射表无法覆盖动态路由
（`/org/notices/:noticeId`），必须补「精确优先 + 最长前缀兜底」的解析函数，且文档标题、
面包屑、多标签页标题三处共用同一函数。**

- **症状**：公告详情（站内信消费路由）文档标题回退为裸品牌名 `Better Admin`，
  面包屑与标签标题同时缺失。
- **实现**（`lib/route-access.ts`）：新增 `ROUTE_TITLE_PREFIX_KEYS`
  （`"/org/notices/": "menu.pageTitle.notices"`）+ `resolveRouteTitleKey(pathname)`
  （先查 `ROUTE_TITLE_KEYS`，未命中则取最长匹配前缀）。
- **三个消费点**：`router/guards.ts` 的 `afterEach`（`document.title`）、
  `layouts/AdminLayout.vue` 的面包屑兜底、`components/layout/TagsBar.vue` 的标签标题。
  改成解析函数时必须三处同改——只改一处会出现「文档标题对了、标签还缺」的割裂。
- **与 React 端对齐**：React 的 `staticData.titleKey` 挂路由定义上，动态路由天然继承
  同一 titleKey（`notices_.$noticeId.tsx` 与列表页同键），Vue 端需用前缀表手工等价。

### 16.3 Nuxt UI 4.11.0 locale 包缺键：组件回退会把**原始键名**渲染到界面

**结论：Nuxt UI 组件的兜底写法是 `props.x || t("someKey")`；当组件新增了文案而 locale
包未同步补键时，缺失的不是空白而是字面键名（用户可见）。项目内对这类组件必须显式传
文案 props，不能依赖 locale 包。**

- **实例**：`UDashboardSearch` 的 `:title="props.title || t('dashboardSearch.title')"`
  与 `:description` 同理，而 `@nuxt/ui` 4.11.0 的 `zh_cn.js` / `en.js` 中
  `dashboardSearch` 分组**只有 `theme` 键**（无 title / description）→ 命令面板顶部
  直接显示 `dashboardSearch.title` / `dashboardSearch.description`。
- **判据**：`UApp :locale` 已正确配置（同页面的分页、表格「暂无数据」等文案均为中文），
  仍出现 `xxx.yyy` 形态文本 → 即 locale 包缺该键，而非 i18n 未接入。
- **修法**（`AdminLayout.vue`）：显式传 `:title="t('layout.command.palette')"` /
  `:description="t('layout.command.search')"`，复用应用语言包（React 端 `layout.command.*`
  同键）。**不修改 node_modules**，也不因上游缺键引入 locale 覆盖层。
- **通用检查**：升级 `@nuxt/ui` 后，对新增/改动的组件文案键比对
  `node_modules/@nuxt/ui/dist/runtime/locale/en.js` 是否已提供，缺失即在调用处显式传入。

### 16.4 无渲染桥接组件的空模板触发 `vue/valid-template-root`

**结论：仅含注释的 `<template>` 会被 eslint-plugin-vue 判为「模板缺少子元素」；
无渲染组件应写 `<slot />`（默认插槽为空即不产出节点），而不是空注释模板。**

- **实例**：`progress-bridge.vue`（桥接 `useProgress()` 到模块级状态机的无渲染组件）
  长期携带 1 个 lint error，导致 `pnpm lint` 非零退出（M3 已记录为「未处理」）。
- **修法**：`<template><slot /></template>`，语义不变（无调用的默认插槽不渲染内容），
  `pnpm lint` 恢复 0 error。
- **注意**：`<slot />` 会把组件变成「透传默认插槽」，若误传内容会被渲染；
  真正的「零输出」语义需靠调用方不提供插槽内容维持，故该类组件应保留「无渲染」注释说明。

### 16.5 「是否要求登录」与「是否全屏」是两个维度：`PUBLIC_PATHS` 不可两用（Vue 端）

**结论：路由集合按职责拆分——`PUBLIC_PATHS` 只表达「无需登录」（仅登录页），
`FULLSCREEN_PATHS` 表达「不套 AdminLayout」（登录页 + 独立错误页）。两者此前由同一个
数组兼任，使「错误页匿名可访问」这一与 React / Next 不一致的行为被固化。**

- **历史成因**：`PUBLIC_PATHS = ["/sign-in", "/403", "/404", "/500"]` 同时被
  `isPublicPath()`（守卫放行）与 `isAdminLayoutRoute()`（布局分支 + VT 编排）消费。
  要让错误页要求登录时，直接删元素会连带把错误页判成「认证态页面」→ 套上
  AdminLayout（带侧边栏的错误页），与「全屏错误页」语义冲突。
- **正确拆法**：`isAdminLayoutRoute()` 判据改为 `!isFullscreenPath(path)`；守卫的
  `isPublicPath()` 随之只剩登录页——错误页自然落到「① 登录拦截」分支，未登录即
  `/sign-in?redirect=<原路径>`（对齐 React `beforeLoad` / Next `proxy.ts`）。
  catch-all 404 仍由路由 name（`/[...all]`）单独判定，不进 `FULLSCREEN_PATHS`。
- **验证口径**（2026-09-11 实测，后端可用时取得）：
  - 匿名访问 `/403` `/404` `/500` `/exception/403` `/settings/users` / catch-all
    → 全部跳 `/sign-in?redirect=…`；
  - 已登录访问 `/403` `/404` `/500` → 全屏渲染（正文仅错误页内容，无侧边栏 / Header），
    文档标题为 `errors.*.title`；
  - 已登录访问 `/exception/403` → 仍套 AdminLayout（异常页菜单语义不受影响）。
- **连带影响面**：`isAdminLayoutRoute` 同被 `AppShell`（布局分支）与 `KeepAliveOutlet`
  （路由过渡编排：仅布局内页面切换才播放）消费——拆分后错误页不再参与主体区 VT，
  与 React（VT 挂在 admin-shell 的 `<main>` 上、全屏页不在其中）口径一致。
- **判定原则**：新增「全屏但需登录」的页面（如未来的独立结果页 / 授权回调页）时，
  只加入 `FULLSCREEN_PATHS`，**不要**加入 `PUBLIC_PATHS`。

