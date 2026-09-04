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
