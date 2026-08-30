# Better Admin 阶段性进度记录

> 本文件记录各阶段 / 模块的完成情况、关键决策与已知限制，**只做记录，不写规则**；硬性规则见 [`AGENTS.md`](../AGENTS.md)，机制结论沉淀见 [`mechanisms.md`](mechanisms.md)。
> **新条目追加在最上方（按时间倒序）**；条目中引用的 § 章节号（如 §7.2）指 `AGENTS.md` 对应章节，`§x.y` 指对应设计文档自身章节。

---

### 前端权限快照同步：挂载时 /auth/me，权限变更「刷新页面生效」（2026-08-30）

- **问题**：管理员修改角色授权后，在线用户的前端仍显示旧权限，须退出重登才更新。排查结论：后端每请求实时聚合（`jwt.strategy` / `GET /menus` / `PermissionsGuard`），**安全上无越权可能**；缺口纯在前端——`user.permissions` 仅登录时计算并持久化，代码中无任何登录后的刷新通道，重新登录是唯一重算时机。
- **方案（评审选定 A，否决聚焦自愈的 B）**：新增 `useAuthSync`（`hooks/use-auth-sync.ts`），`AdminLayout` 挂载时请求已存在的 `GET /auth/me`（后端实时聚合、契约零改动），用返回值经 `setUser` 覆盖 auth-store 快照。生效语义收敛为「刷新页面生效」：F5 / 首次进入即最新，SPA 会话内不额外发请求。菜单树本就来自实时接口、F5 后缓存重建即新，无需改动。
- **实现细节**：`setUser` 加入 auth-store；`clearSession` / `resetAuth` 时 `removeQueries` 清理 `/auth/me` 缓存（防换账号命中上一账号快照）；`AUTH_ME_QUERY_KEY` 定义在 auth-store（下层）供 hook 引用，避免 store ↔ hook 循环依赖。被否决的 B（窗口聚焦 refetch）与演进路径（权限版本号、推送）记录在 [`mechanisms.md`](mechanisms.md) §6。
- **验证**：react tsc / eslint / test(68) / build 全绿；nest 零改动。**待人工验证（需登录态）**：管理员改授权 → 普通用户 F5 后按钮/菜单立即对齐，无需重登。

### 登录鉴权加固：停用拦截 + 软删除过滤 + 幽灵权限修复（契约 v1.4.7）（2026-08-30）

- **问题（排查实锤）**：① 停用用户仍可登录——`validateCredentials` 只校验密码，全链路无 `status` 检查；② 「部分权限角色却看到全量菜单/按钮」根因不在权限过滤算法（OR 聚合 / 菜单可见性过滤 / 前端位判定链路均正确），而在数据层：username 部分唯一索引（`deleted_at IS NULL`）允许同名新旧用户共存，登录查询**不过滤 `deleted_at`**，实测命中软删除旧行——该幽灵用户仍绑定 super_admin（聚合位 -1n），登录即超管全量。只读 SQL 复现：`findFirst limit 1` 命中已删除的 test1（super_admin + admin），而非存活的停用行。
- **契约 v1.4.7**（`nest/openapi/openapi.yaml`）：`POST /auth/login` 401 细化为 `INVALID_CREDENTIALS`（含软删除命中失败）+ `USER_DISABLED`（停用拒绝新登录）；每请求鉴权对软删除/停用用户返回 401；软删除同步清理 `user_roles` / `refresh_tokens`。openapi-design.md v0.8。
- **后端**：`validateCredentials` 加 `isNull(users.deletedAt)`；`login()` 停用用户抛 `USER_DISABLED`；`loadUserWithPermissions` 过滤软删除行 + 停用返回 null（登录视图 / 每请求 JWT validate / refresh 三链路统一拦截，覆盖「编辑接口直接改 status 不递增 tokenVersion」的旁路）；`users.service` 的 `remove` / `batchRemove` 改事务内软删除 + 清理角色绑定与托管会话（防同名幽灵绑定复发）。
- **前端（React）**：零改动——登录页 catch 直接展示 `ApiClientError.message`（透传后端中文 message，「账号已停用，请联系管理员」自动生效）。
- **数据修复**：一次性清理存量软删除用户（26 个）的残留 `user_roles` 5 行（含幽灵 test1 的 super_admin 绑定）与 `refresh_tokens` 1 行，复核归零。
- **验证**：nest / react tsc、eslint 全绿（nest 无测试文件）；停用的存活 test1 登录现返回 401 `USER_DISABLED`（数据面推演）。**待人工验证（需登录态）**：停用账号登录提示、软删除同名场景、停用用户存量 token 每请求 401。
- **已知限制 / 待办**：`roles.enabled` 仍不参与权限聚合（既有待评估项）；前端 `hasPermission`（要求全部位命中）与后端同名函数（任一位命中）多权限位语义不一致，当前均为单权限点使用，属潜伏问题；Vue / Next / Nuxt 登录模块后续实现直接跟上 v1.4.7。

### 用户写操作保护：本人 / 内置 admin / super_admin 绑定用户（契约 v1.4.6）（2026-08-30）

- **问题**：用户模块写操作此前完全裸奔——持有 `user:delete` 的任意管理员可删除/停用/重置密码 admin 用户或任意 super_admin 绑定用户；前端仅有「不能操作自己」的按钮止损（后端契约无此校验），普通管理员登录后 admin 行的删除入口即出现。效果等同绕过角色侧 `SUPER_ADMIN_ROLE_PROTECTED` 保护（删号/重置密码/停用 = 变相清空超管授权）。
- **契约 v1.4.6**（`nest/openapi/openapi.yaml`）：`DELETE /users/{id}`、`DELETE /users`、`PUT /users/{id}/status`、`POST /users/{id}/reset-password` 新增 `400 SELF_OPERATION_FORBIDDEN`、`403 ADMIN_USER_PROTECTED`、`403 SUPER_ADMIN_USER_PROTECTED`；`PUT /users/{id}` 补充两个 403（关闭「编辑表单改 status 停用受保护用户」的旁路）。
- **后端**（`nest/src/modules/users/users.service.ts`）：新增 `assertTargetOperable` / `assertBatchOperable` / `filterSuperAdminIds`，规则顺序：本人（400）→ 内置 admin（403）→ super_admin 绑定用户（403，操作者自身也是 super_admin 时豁免；admin 用户受规则 2 绝对保护，超管账号不可能被删光，豁免不会锁死系统）。super_admin 绑定判据为 `user_roles → roles.code` 直接绑定查询（非聚合权限位，边界见 mechanisms.md §5）。批量删沿用全有全无语义，任一目标命中即整体拒绝。`remove` / `batchRemove` / `updateStatus`（仅 disabled 时）/ `resetPassword` / `update`（仅 dto.status=disabled 时）五处接入。
- **前端**（React）：`users-page.tsx` 以 `isProtectedUser`（本人 ∨ username=admin ∨ 绑定 super_admin 且操作者非超管）统一行操作隐藏口径——删除/重置密码整项隐藏，停用/启用按目标状态分别判定（已停用的受保护用户可被启用，与后端「启用不受限」对齐）；`enableRowSelection` 同口径排除勾选（封堵批量入口）；`user-form-dialog.tsx` 编辑受保护用户时锁定状态开关（`isDisabled`）。`getUserErrorMessage` 新增三个错误码映射，i18n 键正确落入双语 `errors.json`（`errors.users.*` 此前在语言包中无键、一直走中文 fallback，属既有缺口，本期新键已规范落地，存量五键待后续补）。
- **验证**：openapi YAML 解析通过（v1.4.6）；nest / react tsc、eslint、react build + test(68)、nest build 全绿；只读脚本验证 `filterSuperAdminIds` 同款 join 在真实数据上正确识别 admin 绑定（test/test1 未绑定）。**待人工验证（需登录态）**：普通管理员删除/停用/重置密码自己、admin、super_admin 用户的拦截路径与前端入口隐藏观感。
- **已知限制**：`PUT /users/{id}` 的 `roleIds` 全量替换仍可摘除 super_admin 绑定（摘绑定不锁死系统，本期不拦，记录待办）；Vue / Next / Nuxt 未开发用户模块，后续实现直接跟上 v1.4.6。

### 列表缓存展示策略：条件代际号 epoch，消除重置 / 搜索时的缓存闪回（2026-08-30）

- **问题**：列表 queryKey 全字段驱动 + React Query SWR 语义——重置 / 搜索回退到已有缓存的 key 时，旧数据被**同步回放**（stale-while-revalidate），表格先闪回旧数据、接口才开始加载；且全局 `staleTime: 60s` 内重置甚至不发请求。`keepPreviousData` 只在新 key 无任何数据时兜底，有缓存时轮不到它；`staleTime` 只控制是否 refetch、不控制是否展示缓存，纯配置无解。
- **方案（评审通过的设计文档 v1.1，机制沉淀见 [`mechanisms.md`](mechanisms.md) §4）**：`createListStore` 新增单调递增 `epoch`（条件代际号）并入 queryKey（prefix 之后、其余字段之前）。**条件重构**（搜索提交 / 筛选变更 / 重置）使 epoch +1 → key 必然全新 → 无缓存可回放 → `keepPreviousData` 保住旧条件结果直到新数据一次性切换（无闪回）；**数据导航**（翻页 / pageSize / 排序 / 页面切换返回）不变 epoch，目标 key 仍命中缓存加速。三个 bump action 均同值幂等跳过；`staleTime: 60s`「60 秒内重置不发请求」的边界随 epoch 结构性消除。
- **实现**：`use-list-query.ts` 抽出 `buildListQueryKey` 导出函数（hook 与单测共用）；对外返回字段名保持 `isLoading`（映射 `query.isPending`，v5 术语，页面层零改动）。改动仅两个通用文件（约 13 行）+ 测试，`data-table.tsx` / `query-client.ts` / 页面层均不动；前缀式 `invalidateQueries` 兼容（命中所有 epoch，仅当前 epoch active）；缓存碎片由 gcTime 自然回收，无需清理。覆盖所有 `useListQuery` 列表（当前 users / roles）。
- **测试**：新增 `use-list-query.test.ts`（不同 epoch key 隔离、同 epoch 翻页/排序区分、前缀失效命中、**慢请求返回后不覆盖新请求**的 per-key 隔离集成用例）；`create-list-store.test.ts` 补 epoch 递增 / 幂等不 bump / 翻页排序不 bump 用例。tsc / eslint / test(68) / build 全绿。
- **待人工验证（浏览器级，需登录态）**：重置无闪回、翻页排序缓存加速、60 秒内重置必发请求、连续条件变更慢请求不覆盖——key 契约与竞态语义已由单测覆盖，页面观感待登录后核验。

### 抽取共享 SortField 组件收敛「排序」字段（2026-08-30）

- 新增 `components/common/sort-field/sort-field.tsx`：`SortField`（Label + HeroUI NumberField 步进组合，默认 0-999、`Number.isFinite` 回退、secondary variant）+ `sortFieldSchema`（`z.number().int().min(0).max(999)`，zod 规则单点维护）。
- 角色 / 字典项 / 菜单三处表单的排序字段（各约 22 行逐行等价 JSX + 重复 schema 片段）等价替换为一行 `<SortField>` + `sort: sortFieldSchema` 引用；菜单表单顺带移除未再使用的 `NumberField` 导入。行为零变化，无新增依赖。

### 用户管理验收调整 + 契约 v1.4.5 角色关联数上限（2026-08-30）

- **契约 v1.4.5：用户最多关联 5 个角色**：`UserCreateRequest` / `UserUpdateRequest` 的 `roleIds` 增加 `maxItems: 5`（超限 400 `VALIDATION_ERROR`）；NestJS 两个用户 DTO 加 `@ArrayMaxSize(5)`；前端表单 zod `max(5)` + 角色 Select 内联错误（`features.users.form.rolesMax`）。openapi-design.md v0.6。无数据库改动；Vue / Next / Nuxt 尚未开发用户模块，后续实现直接跟上。
- **功能修复（用户管理验收发现）**：
  - 编辑保存无反应：新建/编辑共用 zod schema 时，编辑态仍校验未渲染的空串 `password`（min(6) 失败），resolver 在未注册字段报错致 `handleSubmit` 静默失败——改为 `buildUserFormSchema(isEdit)` 按模式构建（superRefine 跳过编辑态密码校验）；
  - 表格行选择 Checkbox 运行时抛 `A slot prop is required`：react-aria Table 上下文内 Checkbox 必须声明 `slot="selection"`（HeroUI Table 文档明示）；共享桥接件 `data-table-select-cell.tsx` 补上，同时 table 参数类型由 React 绑定层 `AppTable` 收窄为 core `Table`（header 上下文提供的是 core 类型，原签名与文档示例矛盾）。
- **UI 调整（验收反馈）**：
  - 批量操作条重写为胶囊 ActionBar 风格：Chip 计数徽章 + 竖分隔线（`self-center` 覆盖 `separator--vertical` 自带的 `self-stretch`）+ 操作插槽 + X 清空；进场自底部淡入上滑、退场向下淡出滑出（延迟卸载 200ms，`motion-reduce:transition-none`）；页面按钮启用/停用改 ghost、删除改 `danger-soft`；
  - 行 Checkbox `variant="secondary"`（表头保持默认）；表单密码框 InputGroup `variant="secondary"`（variant 挂 InputGroup 根）；
  - 启用用户弹窗加 `AlertDialog.Icon status="accent"`：ConfirmDialog 新增可选 `iconStatus`（destructive 时恒为 danger 并忽略该值），向后兼容；
  - 用户「角色」列与菜单「权限按钮」列统一：表头居中 + 最多 2 个 Chip + `+N` 聚合；`+N` 的 Tooltip 必须用 `Tooltip.Trigger` 包裹（Chip 为非交互元素，直接作 Tooltip 子元素无触发语义）。
- **布局健壮性**：`/api/menus` 加载失败由一行灰字改为区分背景卡片（`bg-surface` + border 圆角，垂直居中）内的 `ErrorContent` + 重试按钮（`refetchQueries` MENUS_QUERY_KEY）；侧边栏失败时回退为仅「控制台」节点（前端固定注入，本就不依赖接口）。
- **i18n 收敛**：`sort` 字段文案统一走 `common.column.sort`，删除 `features.roles/dicts/menus.form.sort` 三个独立键（roles/dicts/menus 三处表单同步改引用）；搜索占位缩短；新增 `rolesMax` / `rolesMore` / `permissionsMore` / `permissionCheckFailedDesc`。已全量扫描 `t()` 字面量与语言包差集，无缺失键。
- **验证**：前后端 tsc / eslint / react build / test(61) / openapi YAML 校验全绿。

### React 用户管理上线（真实业务替换 keepAlive Mock 页）（2026-08-30）

- **`src/features/users/`**（users-page / user-api / user-form-dialog / user-reset-password-dialog / password-field），完全对齐角色管理四件套模式：`createListStore + useListQuery`（page/pageSize/search/status/sort/order 服务端分页排序，status 筛选入内存 store 兼容 keepAlive）、HeroUI `useOverlayState` 管理全部浮层。
  - 列表列：多选框（`DataTableSelectAll/SelectRow` 首个消费方）+ 用户名/姓名/邮箱/状态/角色/创建时间；username/displayName/email/status/createdAt 服务端排序（`manualSorting: true`，排序列 id 对齐后端 SORTABLE 白名单）；角色列 Chip 组。
  - CRUD：新建（username/email/初始密码+确认/displayName/启用开关/角色多选）；编辑 username 禁用且无密码字段（改密走重置密码，契约不含 password）；删除强确认（输入用户名）、批量删除强确认（输入 DELETE，后端 `INVALID_OPERATION` 整体拦截）；启用/停用走确认弹窗（停用为 destructive，提示全端下线）；重置密码弹窗（新密码+确认，成功提示全部会话失效）；角色多选用 HeroUI `Select selectionMode="multiple"` 受控用法。
  - 批量状态切换（首个批量场景）：后端无批量端点，前端 `Promise.allSettled` 逐行调 `PUT /users/:id/status`，部分成功不回滚，toast「成功 X 失败 Y」+ 透出首个失败原因；批量删除为单接口事务，无此问题。
  - 角色下拉选项：`GET /roles` pageSize DTO 白名单上限 50（传更大值 400），`fetchRoleOptions` 超 50 按页续拉拼全，仅取 `enabled=true`。
- **权限位门控**：ADD/EDIT/DELETE/BATCH_DELETE/RESET_PASSWORD 五位（`useHasPermissionKey`，位值由 /permissions 下发）；SEARCH/RESET 由 `DataTableSearchReset` 内置。
- **自我保护（前端止损，与用户确认的口径）**：后端对「操作者本人」无任何拦截（status/delete/reset-password 均可作用于本人，契约如此不改）；前端 `enableRowSelection` 禁止勾选自己 + 行操作对本人隐藏删除/停用（重置密码保留）。
- **共享件调整**：`data-table-select-cell.tsx` 的 table 参数类型由 `AppTable`（React 绑定层）收窄为 core `Table<AppTableFeatures, TData>`——列 header 上下文提供的是 core Table，此前签名与文档示例用法自相矛盾（纯类型修正，行为不变）。
- **类型对齐**：`api-types.ts` 的 `CreateUserInput`/`UpdateUserInput` 对齐契约 v1.4.4（后者去掉遗留的 `password?` 字段，新增 `status/avatar?`，注释标明 roleIds 全量替换语义）。
- **i18n**：zh/en 新增 `features.users.*`（65 键）与 `errors.users.*`（5 键，USERNAME_EXISTS/EMAIL_EXISTS/USER_NOT_FOUND/VALIDATION_ERROR/INVALID_OPERATION）；删除 `common.demo.users.*` 全部 11 个 Mock 键。菜单键 `menu.users`/`menu.pageTitle.users` 后端既有，零改动。
- **验证**：tsc / lint / test(61，含 locales 键位一致性) / build 全绿。

### 错误页重设计（巨字光晕 → 毛玻璃卡片）+ globals.css 按特性拆分（2026-08-30）

- **403/404/500 错误页重设计**（`components/common/error-pages/`，方向经用户确认）：
  - 构图：描边空心状态码巨字（约缩小 85%，tone 色 40% 透明描边）在流内以负 margin 压进毛玻璃卡片顶边，重叠区经 `bg-surface/70~80 + backdrop-blur-xl` 呈现「穿透若隐若现」；文案/图标章/按钮全收进卡片，1px 渐变描边（透明 → tone 色，外层 `p-px` 渐变底 + 内层收 1px 圆角实现）。
  - 情绪色调：403 danger / 404 primary / 500 warning，光斑、图标章、巨字描边、卡片描边、插画同色联动。
  - 线稿插画 `error-page-glyph.tsx`：内联 SVG 单色线条（tone 色 50% 透明），403 小锁 / 404 失焦指南针（虚线外环）/ 500 破碎齿轮，巨字右侧空白区，仅 lg+ 屏宽渲染。
  - 光斑几何化：大圆光晕 + 圆环（粗描边）+ 三角（clip-path）× blur；点阵纹理保留。
  - 微交互：内容层入场 `.error-page-enter`（上浮淡入）；按钮悬停水平流光 `.btn-shine`（白色高光斜条扫过）；均尊重 `prefers-reduced-motion`。
  - 操作区分化：403/404 默认「返回上一页（router.history.back）+ 返回首页」（新增 `common.goBack` zh/en）；500 为「重试（整页刷新）+ 返回首页」。
  - 坑：巨字若整体绝对定位在卡片 z 层之后会被毛玻璃完全遮蔽，必须与卡片流内重叠才能透出；亮色模式卡片不透明度需 80%（70% 会被光晕染蓝、正文对比度不足）。
- **globals.css 按特性拆分**（纯移动，无行为变更）：`theme-transition.css`（主题切换 VT 揭示）、`toast.css`（Toast 进出场）、`error-page.css`（错误页动效 + 流光）独立成文件；`globals.css` 只留共用基底（Tailwind/HeroUI 引入、`@custom-variant dark`、`:root` 基础 token、`@layer base`）+ `@import` 聚合，入口仍只有 `main.tsx` 引 globals。
- **验证**：tsc / lint / test(61) / build 全绿；403/404/500 暗色与亮色浏览器实测截图确认。

### 契约 v1.4.4 GRANT 权限位 + React 搜索/重置按钮位掩码门控（2026-08-30）

- **契约 v1.4.4：新增 `GRANT`(256) 权限点（菜单授权）**：`PUT /roles/:id/menus` 权限要求由 EDIT 收敛为 GRANT（`roles.controller`）；此前授权入口复用 EDIT 位，无法与「编辑角色资料」分离授权。seed 仅角色管理菜单声明 GRANT 位（`rolesMenuBits`，授权动作只存在于角色页）。
  - **存量库迁移**：seed 为 `onConflictDoNothing`，真实库角色管理菜单行的 `menus.permissions` 需经 `nest/scripts/migrate-menus-add-grant-bit.ts` 幂等补录（`permissions | 256`）；super_admin 的 -1n 全量位自动覆盖新位，无需改数据。
  - **行为变更**：已有非超管角色需重新授予 GRANT 位才会重新出现授权入口（原靠 EDIT 位可见）。
- **React 搜索/重置按钮补齐位掩码门控**：落实 v1.3 约定——`RESET` 位本就是「前端重置按钮显隐位（纯前端，不挂后端守卫）」，此前一直闲置。搜索按钮消费 SEARCH 位（与后端列表接口 `@Permissions('SEARCH')` 对齐；无 SEARCH 位的用户列表 403，该门控为显隐形式对齐）、重置按钮消费 RESET 位。
  - 新增共享组件 `DataTableSearchReset`（`components/common/data-table/`）：内置 SEARCH/RESET 门控（两都缺失整体不渲染），`searchDirty/canReset/isFetching/onSearch/onReset` 由页面传入；roles / menus / dicts（字典项栏）/ permissions（纯本地过滤，恒可点）四页接入，删除各页重复的 Button+Spinner 三元渲染。统一行为：请求进行中重置按钮同时禁用（menus 原有语义推广到 roles/dicts）。
  - 角色管理授权入口改 `useHasPermissionKey("GRANT")`；启用/停用维持 EDIT 位判断（`canToggle = canEdit`，未变化）。
- **顺手清理**：zh/en 语言包移除 v1.3 已废弃的 `features.permissions.items.SETTINGS_UPDATE` 残留键；`permissions-page` 位掩码升序注释「SETTINGS_UPDATE=128」修正为实际枚举。
- **文档同步**：openapi.yaml v1.4.4、database-design.md v0.5（§1.2 枚举表 + 变更记录）、openapi-design.md v0.5。
- **跨栈待办（记录在案，暂不实施）**：Vue / Next / Nuxt 的角色模块授权入口与搜索/重置按钮门控、`GET /permissions` 新增的 GRANT 点，待各自阶段同步。
- **验证**：nest `tsc/build/lint` 与 openapi.yaml（pnpm dlx js-yaml）通过；react `tsc --noEmit`/`lint`/`build`/`test`(61) 全绿。

### 契约 v1.4.2/v1.4.3 + React 角色管理上线（2026-08-30）

- **后端**：`GET /roles` 新增 `enabled` 状态筛选参数（v1.4.2）；super_admin 角色保护（v1.4.3）——`PUT /roles/{id}/menus` 与 `DELETE /roles/{id}` 对 `code === 'super_admin'` 返回 403 `SUPER_ADMIN_ROLE_PROTECTED`。
- **super_admin 保护的设计依据（重要，勿推翻）**：超管的"全量权限"不是代码身份判定，而是 seed 写入 role_menus 的 -1n 全量位经登录/每请求实时 OR 聚合而来（`auth.service.aggregatePermissions`）；PermissionsGuard 与菜单可见性的"超管免检"分支判据都是聚合值。清空其授权 = 全后台立即 403 且无自助恢复手段，故必须拦截。已知口径：`roles.enabled` 目前不参与权限聚合（停用角色为 no-op），后续单独立项评估。
- **React 角色管理页**：`src/features/roles/`（role-api / roles-page / role-form-dialog / role-grant-drawer）。
  - 列表：首个启用 `createListStore + useListQuery` 服务端分页基建的页面（page/pageSize/search/enabled），`DataTablePagination` 分页条改为三列布局（范围总数/页码/每页条数，全局共用）。
  - CRUD：code 创建后锁定；删除强确认（输入角色 code）；状态切换走 `toast.promise` 三段反馈；sort 列 + 表单 NumberField。
  - 菜单授权抽屉：数据源 `GET /menus/tree`（全量含停用；要求菜单 SEARCH 位）；**纯 Antd Tree 勾选模型**——权限位为叶子菜单的子节点、状态完全由子节点推导、级联双向（勾父全选位/取消父清空位）；`GET/PUT /roles/:id/menus` 全量替换；保存后失效 `MENUS_QUERY_KEY`（改自己的角色侧边栏立即生效）。注意树节点 `userPermissions` 是当前用户的授权，授权场景只消费声明位 `permissions`。
  - super_admin 三层保护：后端 403 兜底 + 操作列隐藏授权/删除/状态切换 + 编辑弹窗仅 description 可改 + 授权抽屉保存禁用（Alert 警示条）。
  - 错误码 i18n：`errors.roles.*`（inUse/codeExists/nameExists/notFound/superAdminProtected/invalidOperation，zh/en）。
- **通用组件**：`EmptyContent` 扩展可选 icon/title/description/action（默认行为不变）；新增 `ErrorContent`（错误态语义，与空状态分离，全局共用）；`ConfirmDialog` 强确认输入框 variant=secondary；公共列键 `common.column.sort/createdAt` 抽取（角色/字典/菜单三页同步）。
- **验证**：react `tsc/lint/build/test`(61) 与 nest `tsc/build` 全绿；openapi.yaml js-yaml 严格解析通过。
- **待办（记录在案）**：用户管理（替换 keepAlive Mock 页）、日志管理、概览 Dashboard 仍待迁移；`roles.enabled` 参与权限聚合待评估。

### 契约 v1.4 / React 端菜单管理 + 字典管理上线（2026-08-29）

- **React 菜单管理页（契约 v1.4）**：管理树 CRUD（新增/子菜单/编辑/删除、权限位多选、图标实时预览），已上线。
- **React 字典管理页（本期新增）**：`src/features/dicts/`（dict-api / dicts-page / 两个表单弹窗），双栏布局——左栏字典类型（本地提交式过滤 + 新增/编辑/删除），右栏选中类型的字典项（DataTable + 提交式过滤 + CRUD）。
  - 契约为准：类型按 code 定位（`PUT/DELETE /dict/types/{code}`），项挂在类型下（`GET/POST /dict/types/{code}/items`）；契约无分页，前后端一致采用全量 + 前端过滤。
  - 清空语义：`description` / `i18nKey` 清空须传 `""`（后端部分更新 `??` 兜底不接受 null），表单已按此处理。
  - 删除拦截：类型被项引用时后端 409 `DICT_TYPE_IN_USE`；前端错误码经 `getDictErrorMessage` 做 i18n 映射（errors.dict.*，zh/en 双语）。
  - 缓存联动：字典项保存后 `dict-store.refreshDict(code)` 强刷业务侧下拉缓存；类型删除后 `clearDict(code)` 清残留；右栏 React Query 按 typeCode 精准失效。
  - 权限门控：`useHasPermissionKey(SEARCH/ADD/EDIT/DELETE)` 控制按钮显隐；浮层全部 `useOverlayState`（§7.2）。
  - 类型修正：`api-types.ts` 的 `DictItem` 移除后端不返回的 `createdAt/updatedAt`；`dict-store` 新增 `clearDict`/`refreshDict`。
- **契约 v1.4.1**：补录 `DELETE /dict/types/{code}` 的 409 响应声明（实现已有、文档补齐）；修复 tags 块 v1.3 移除 Settings 时遗留的重复 `description` 键（此前该 YAML 无法被严格解析器读取）。
- **验证**：react `tsc --noEmit` / `lint` / `build` / `test`(61) 全绿；openapi.yaml 经 js-yaml 严格解析通过。
- **待办（记录在案）**：用户管理（替换 keepAlive Mock 页）、日志管理、概览 Dashboard 仍待迁移。

### 契约 v1.3：管理菜单树 + Settings 整体移除 + 权限点收敛（2026-08-28）

- **`GET /api/menus/tree`（新增）**：管理用全量菜单树，不做角色可见性过滤（含 `enabled=false`/`hideInMenu` 节点），须持菜单 SEARCH 位；`userPermissions` 仍按当前用户下发。为菜单管理页（Phase 4 顺序中的下一模块）提供数据源，与面向导航的 `GET /api/menus` 并存。
- **Settings 模块整体移除**：删除 `src/modules/settings/`、`settings` 表（迁移 `0002_*` 已在真实库 DROP）、seed 预置 key、OpenAPI `/settings` 路径与 `Setting`/`SettingUpdateRequest` schemas。系统设置页暂无落地计划；`RESET` 位原本服务的重置密码端点不受影响。
- **权限点调整为 8 个**：SEARCH(1)/ADD(2)/EDIT(4)/DELETE(8)/BATCH_DELETE(16)/ADD_CHILD(32)/RESET(64)/RESET_PASSWORD(128)。`SETTINGS_UPDATE` 删除；新增 `RESET_PASSWORD` 守卫重置密码端点；`RESET` 保留为前端「重置」按钮显隐位（纯前端，不挂后端守卫）。历史 `role_menus` 中已存的旧位值不影响运行，后续可出清理脚本。
- **文档同步**：`nest/openapi/openapi.yaml` v1.3.0、`nest/docs/database-design.md` v0.3（§2.8 标注移除）、`nest/docs/openapi-design.md` v0.3（§3.7 标注移除）。
- **React 端**：权限管理只读页已上线（消费 `GET /api/permissions`，前端 i18n 名称映射）；下一步为菜单管理页。

### 全站国际化 i18n（2026-08-27，React 端已完成）

- **范围**：React 端全站国际化（简体中文默认 + English），语言切换不改 URL（纯客户端状态，无 locale 路由段），localStorage 持久化、刷新保持。Vue / Next / Nuxt 后续实现时按本节架构对齐。
- **技术选型**：`i18next` + `react-i18next`（自建实例，非默认单例——必须经 `provider.tsx` 的 `I18nextProvider` 注入，否则 `useTranslation` 落到未初始化的全局单例上返回 key 原文）。
- **初始化时序（硬约束）**：`main.tsx` bootstrap 先 `initLanguage()`（同步读 localStorage + 设 `<html lang>`）→ `await initI18n()` → 才 `createRoot().render()`。菜单树可能在首帧前经 `useMenus` prefetch 到达，`t()` 必须已可用。非 hook 环境（api-client 等）统一走 `@/i18n` 导出的模块级 `t()` 与 `getErrorMessage(key, fallback, options?)`（延迟求值 + 容错回退，禁止在模块顶层定义常量时取词）。
- **语言包架构（扁平键）**：`src/i18n/locales/{zh-CN,en}/{common,auth,layout,menu,errors}.json` 五域，文件内是**完整字面量键**（如 `"menu.users"`），config 合并为单一 translation 对象并设 `keySeparator: false`。原因：后端 `menus.i18n_key` 存在 `menu.settings`（组）与 `menu.settings.profile`（子项）叶子/分支共存的键，i18next 嵌套结构无法表达，扁平 map 天然支持。新增 `src/i18n/__tests__/locales.test.ts` 守卫两语言键集合一致（随 `pnpm test` 运行）。
- **菜单国际化（方案 C 就地接入）**：渲染层统一 `getMenuLabel(node, t)`（`lib/menu-i18n.ts`）——`node.i18nKey ? t(key) : node.label`，五处消费点（侧边栏展开/折叠、面包屑、命令面板、标签栏）已接入；后端菜单名随语言实时翻译。后端 `menus.i18n_key` 列为既建设计（OpenAPI 契约已含），**无需数据库迁移**；`role_menus`/权限位链路不经过 label/i18nKey，零影响。前端固定注入的 `CONSOLE_MENU_NODE` 已带 `i18nKey: "menu.pageTitle.console"`。
- **菜单-路由交叉核对（阶段 4）**：真实库 7 菜单 `to` 全部与前端路由一致；新增「字典管理」菜单（`nest/scripts/migrate-menus-add-dicts.ts` 幂等迁移，已应用真实库）；seed.ts 重写对齐真实库（移除概览/系统设置分支、路径 `/settings/*`）。**注意：库内 `menus.icon` 是裸 lucide 名（`book-text`），带 `lucide:` 前缀会导致前端 DynamicIcon 报 Name not found**（已修复并统一）。
- **覆盖面**：登录页全量（含校验/toast/记住我）、登录壳品牌区、8 个占位路由（正文删除改空 div，title 走 `titleKey`）、users Mock 页、错误页三件套、admin-layout 异常 overlay（memo 组件化）、api-client 错误文案、`document.title` 链路（路由 `staticData.titleKey` + 语言订阅即时刷新）、偏好设置抽屉 + 7 个 picker、themes 三张常量表（label→labelKey）、header/sidebar/命令面板/标签栏右键菜单/退出弹窗全部 t() 化；登录页与后台顶栏均有语言切换入口。
- **语言切换联动**：`language-store`（localStorage `better-admin-language`，非法值收窄 zh-CN）→ `i18n.changeLanguage` + `document.documentElement.lang` + **`tabs-store.clearTabsCache()`**（作废旧语言标签标题快照，tags-bar 回退实时菜单渲染）。HeroUI 侧经 `I18nProvider locale` 适配 react-aria。
- **回归结论**：`tsc`/`lint`/`build`/`test`(47) 全绿；浏览器实测语言切换 URL 不变、刷新保持、keepAlive 页跨语言往返状态保留且文案即时换新、标签栏快照失效、404/登录/退出全流程双语正确。
- **后续（记录在案）**：`dict.*` 字典项键已预留（后端 dict_items.i18n_key），待真实业务页接入时再补前端翻译；index.html boot-text「正在加载…」为 JS 运行前文案，固定默认语言；`VITE_APP_DESC` 环境变量已无 UI 消费方。

### 记住我 + 会话真撤销（2026-08-27，契约 v1.2）

- **背景**：React 登录页「记住我」原为纯 UI 摆设；登出仅写日志、token 未作废（logout 后 accessToken 仍有效至自然过期，原默认 7 天）。本次一并修复。
- **API Contract v1.2**（`nest/openapi/openapi.yaml`）：`LoginRequest` + `rememberMe`；refresh 响应 `required: [accessToken, refreshToken]`（轮换必下发新 token）；新增 `LogoutRequest`（body 可选）。
- **NestJS**：
  - 新增 **`refresh_tokens` 托管表**（drizzle 迁移 `0001_supreme_major_mapleleaf.sql` 已应用真实库）：SHA-256 哈希存储不落明文；登录写入、refresh 轮换（事务删旧插新、`expiresAt` 继承原行=固定窗口非滑动续期）、旧 token 重放直接 401。
  - 有效期分档：accessToken 统一 `JWT_EXPIRES_IN ?? '1h'`（无状态不做黑名单，泄露残留窗口 ≤1h）；refreshToken 勾选 `REFRESH_EXPIRES_IN ?? '30d'` / 未勾选 `REFRESH_EXPIRES_IN_SHORT ?? '1d'`。`.env.example` 已同步说明。
  - logout 带 `refreshToken` 精确撤销本设备，不带则删该用户全部托管行（全端下线）。
  - **users.token_version（integer 默认 0）+ JWT `ver` claim**：`jwt.strategy` / refresh 链路比对不一致即 401；resetPassword 与封禁（status→disabled）时 bump + 清空托管会话 → 改密码/封禁即刻全端强制下线；解封不 bump。
- **React**：
  - 登录页「记住我」真正生效：提交 `rememberMe`；auth-store 记录该标志并在 `partialize` 中动态决定是否持久化 `refreshToken`（勾选才落 localStorage，未勾选保持仅内存=关浏览器即失效的会话级语义）。
  - api-client 适配轮换：refresh 成功写回新 refreshToken（未下发则保留原值）；logout 携带本设备 refreshToken。
- **验证**：接口层 17 项（双分档有效期、轮换继承过期时间、重放拒绝、精确/全量撤销、无鉴权 401 等）+ DB 层 6 项（哈希非明文、ver bump 全端失效等）全部通过；`tsc --noEmit`、nest build、react build/lint 通过。
- **已知限制（记录在案，后续增强可选）**：accessToken 无黑名单（残留窗口 ≤1h，业内可接受）；无 refreshToken 重放检测全端撤销（可演进为 `revokedAt` 软删替代硬删）；勾选记住我后 localStorage 存 refreshToken 存在 XSS 面（仅勾选用户，30 天上限）。Vue/Next/Nuxt 登录尚未实现，实现时按 v1.2 契约对齐即可。

### keepAlive 路由缓存 + 过渡动画重构（2026-08-25）

- **目标**：菜单数据 `keepAlive: true` 的页面实现**组件实例级状态保活**，同时修复路由过渡动画「先切页再空播一遍」的缺陷，并重做动画预设。
- **旧过渡缺陷根因**：RouteTransition 双缓冲依赖「children 引用不变 → bailout」，但 Outlet 子树自身订阅 location（useSyncExternalStore 会给 fiber 安排更新 lane）→ bailout 必然失败 → DOM 当帧切到新页 → VT 旧快照拍到的是新页（old≈new）→ 动画退化为同图淡化且卡顿。结论：双缓冲在「子树有 store 订阅」时必然被击穿，无法调参修复。
- **技术选型**：React 官方 **`<Activity>`**（项目 React 19.2.8 stable）：hidden 保留 state 与 DOM、自动卸载 effects；不依赖 TanStack Router 内部 API（`getRouterContext` 在 1.168 已移除，第三方 `tanstack-router-keepalive` 确认不可用）。
- **核心架构（KeepAliveOutlet = 路由呈现管理器，v3）**：`react/src/layouts/components/keep-alive-outlet.tsx`
  - **displayedPath 与 pathname 分离**：渲染期显式输出 displayedPath 结构（不靠 bailout，store 击穿无效化）；layout effect 中 `startViewTransition`（捕获真实旧帧）→ 回调内 flushSync 切换；连续导航 skip 旧 VT（ready 的 AbortError 已吞掉）。
  - **导航方向感知**：按新旧路径在菜单树中的层级深度判定前进/后退，写入 `html[data-rt-direction="back"]`，CSS 变量 `--rt-dir-x` 反转位移类动画（glide/cover）方向。
  - **异常态 overlay 化**：AdminLayout 将 loading / 菜单校验失败 / 403 以 `overlay` prop 传入 KeepAliveOutlet——实例池保持挂载（全部转 hidden 保活），异常恢复后原页面状态无损；403 时侧边栏保留，可直接切换其它菜单离开。
  - **统一实例池**：所有已访问页面入池渲染（`<Activity mode>` 切换显隐）。菜单 `keepAlive: true` → permanent 长驻保活；其余 → transient，仅为过渡期提供旧帧，切换完成后移除卸载（语义等同普通路由切换）。LRU 上限 10（transient 优先淘汰，不足时 permanent 间 LRU + dev 告警）。池逻辑抽为纯函数 `lib/keepalive-pool.ts`（vitest 单测覆盖，`pnpm test`）。
  - **组件来源两级**：`keepalive-registry.tsx` 注册表（手动覆盖入口，可选）→ `lib/route-component.ts` 按 fullPath 从 routeTree 解析叶子组件（公开 API，全量兜底；只匹配无 children 的节点避免误中布局路由）。**新增 keepAlive 页面零登记成本**。
  - RouteTransition 组件已删除（职责并入 KeepAliveOutlet）；admin-layout 直接渲染 `<KeepAliveOutlet />`。
- **滚动模型**：AdminLayout `<main>` 统一滚动（滚动条贴合主体区边缘）；页面位置**不做保活**（产品约定），KeepAliveOutlet 在每次切换完成、VT 新帧捕获前显式回顶；`lib/keepalive-cache.ts` 已删除。
- **动画预设**（`themes/route-transitions.ts` + `styles/route-transitions.css`，共 9 种）：none / fade 柔和淡化 / glide 视差推滑 / rise 浮现上升 / zoom 纵深缩放 / reveal 揭示展开 / cover 覆盖推入 / circle 圆形揭示 / blur 景深聚焦；双侧协同关键帧、420ms 基准 × 速度档位（`html[data-rt-speed]` → `--rt-speed` 倍率，偏好设置可选慢速/标准/快速）、统一 easeOut 曲线；`html[data-route-transition]` 选择器机制不变；reduced-motion 全关。
- **数据新鲜度约定（保活 ≠ 数据冻结）**：`<Activity>` hidden 卸载 effects → React Query 订阅暂停、后台不发请求；恢复 visible 时重新订阅，数据已 stale 自动 refetch。此为预期行为，Phase 4 接真实数据时勿绕过该机制。
- **验证页**：`react/src/features/users/users-page.tsx` 保活演示页（搜索关键字 / 计数按钮 / 长 Mock 列表滚动），Phase 4 接入真实用户管理时替换内容并保留路由挂载方式。
- **已知边界**：隐藏实例仍订阅 Router Context（不可见的轻量重渲染）；页面 UI 态建议放 store 而非 search params；403/loading 分支下 KeepAliveOutlet 不渲染（缓存随组件树销毁重建，异常场景可接受）。

### UI 组件库策略调整（2026-08-22）

- 明确 React / Next.js：**Hero UI 为主 + Shadcn UI 为补充**；Vue / Nuxt：**Shadcn UI 为主，暂不调整**。
- React / Next.js 组件优先级：Hero UI > Shadcn UI > Custom；样式变量以 **Hero UI 设计体系为主要参考**，统一维护一套项目级 Design Tokens（§7.2 / §7.3）。
- 存量 Shadcn Admin / Shadcn UI 能力（Layout、Sidebar、DataTable、Form 等）**渐进式保留**，不做一次性大规模迁移；新增功能优先 Hero UI。
- 本次仅同步项目规范与文档（`AGENTS.md`、`docs/requirements.md`、`docs/ui-spec.md`、`docs/react.md`、`README.md`），**未进行任何 UI 代码迁移**。

### Phase 2：NestJS + PostgreSQL（已完成）

> 设计真源：`nest/docs/database-design.md` (v0.3)、`nest/docs/openapi-design.md` (v0.2)、`nest/openapi/openapi.yaml` (v1.1.0)。

- **工程初始化**：`nest/` 已用 pnpm 初始化（NestJS 11 + TypeScript 5.8）。依赖含 drizzle-orm / pg / nanoid / bcrypt / @nestjs/jwt / @nestjs/passport / class-validator / @nestjs/config / @nestjs/swagger。
- **Schema（Drizzle）**：`nest/src/db/schema/` 下 9 张表（users/roles/menus/user_roles/role_menus/dict_types/dict_items/settings/logs；settings 表已于 2026-08-28 移除，见上文契约 v1.3 条目）+ `permissions.enum.ts`（位掩码枚举，bigint，`hasPermission` 守卫）。部分唯一索引（软删用户名/邮箱复用）、联合主键、级联/限制外键、jsonb、bigint 位掩码均已对齐设计。
- **迁移**：`drizzle-kit generate` 生成 `drizzle/0000_initial_schema.sql`；`pnpm db:migrate` 应用，`pnpm db:seed` 写入种子（super_admin 全量位 -1n、admin/admin123、菜单树、字典、8 个设置 key）。
- **数据库联调（已完成）**：已连接真实 Supabase PostgreSQL（aws-0-ap-southeast-1.pooler.supabase.com:6543），`0000_initial_schema.sql` 迁移成功——9 张表全部建成，7 条外键级联规则与 2 个软删部分唯一索引核对无误。连接细节：URL 不写 `sslmode`，由 `db/client.ts` / `scripts/migrate.ts` 代码层配置 `ssl: { rejectUnauthorized: false }`（pg 8.x 会把 URL 的 sslmode=require 解析为证书链校验而失败）。`dict_types.code` 唯一性采用 UNIQUE 约束（内联）而非唯一索引，避免「先加外键后建索引」的 42830 顺序问题。真实凭据存于 gitignored 的 `nest/.env`。
- **基础设施**：全局异常过滤器（{code,message}、401/404/Validation 映射）、全局响应拦截器（{data}/{data,pagination}）、JWT 策略 + PermissionsGuard（位掩码，super_admin -1n 放行）、@Permissions 装饰器、全局 API 日志拦截器与 error 日志埋点。
- **业务模块**（严格按 openapi.yaml）：Auth（login/refresh/me/logout）、Users、Roles、Menus（§1.5 O(1) 内存映射填充 userPermissions，禁 N+1）、Permissions（枚举下发）、Dict、Settings（已于 2026-08-28 移除）、Logs（列表/详情/删除 + 4 Tab 过滤）。
- **集成**：`loadConfig()` 启动期校验 `DATABASE_URL` / `JWT_SECRET`（缺省报错退出），`JWT_EXPIRES_IN`(7d) / `REFRESH_EXPIRES_IN`(30d) 带默认值；Swagger 挂在 `/docs`；全局前缀 `/api`。验证：`tsc --noEmit` 与 `nest build` 通过；启动后路由鉴权、Swagger、全局日志埋点均工作；真实库迁移已跑通，`db:seed` 待执行。
- **已知问题 / 后续优化**：
  - 权限位 `permissions` 在 JSON 中统一以**正数全 1 掩码 `9223372036854775807`**（字符串）表示超级管理员全量位（内部存储为 -1n，输出经 `normalizePermissionBits` 归一化）；`hasPermission` / PermissionsGuard 同时识别 `-1n` 与 `2^63-1`。前端按 BigInt 解析即可，跨技术栈保持一致。
  - 日志定期清理（pg_cron / @Cron 按 `system.logRetentionDays`）尚未实现，数据访问层已就绪。
  - 种子 `menuFullBits` 含 `ADD_CHILD`（7 位），比任务示例多 1 位，属菜单管理页完整按钮集，符合设计 §2.3。
- 等待下一阶段（Phase 3：React + NestJS 完整全栈，或用户安排的其它阶段）。

### Phase 1C：React Hero UI 迁移启动（进行中）

- **目录调整**：原 `/react`（Shadcn Admin）已重命名为 `/react-shadcn`；新 `/react` 以 **Hero UI 初始化模板**创建，作为 UI 迁移的目标版本与新的 UI 基准（详见 AGENTS.md §4.1、§4.6）。
- **迁移策略**：已制定渐进式迁移策略（AGENTS.md §4.6），明确 `/react-shadcn` 为只读参考源、6 条迁移原则与 9 个模块的迁移进度表（状态均 🔲 待迁移）。
- **当前状态**：`/react` Hero UI 初始化完成，项目可独立运行；尚未迁移任何业务模块（Layout / Dashboard / 用户管理 / 角色管理 / 权限管理 / 菜单管理 / 系统设置 / 日志管理 / 认证 均待迁移）。
- 等待下一指令：按 §4.6 进度表逐个模块推进迁移，或用户安排的其它阶段。

### Phase 1B：Better Admin UI 定制（已完成）

- 品牌化：接入 Better Admin Logo（含 favicon、浅/深色两版）、站点标题与元信息、AppTitle。
- Sidebar 调整为 Better Admin 中文菜单（概览 / 系统管理 / 系统设置），移除团队切换与 Clerk 演示导航。
- 页面规划：新增 `/roles`、`/permissions`、`/menus`、`/logs` 占位路由（中文占位页，不实现业务逻辑）。
- Demo 清理：移除 Tasks、Chats、Apps、Clerk、Help Center 演示页面与相关组件。
- 界面默认中文：Dashboard / Users / Settings / Auth / Errors / DataTable / ConfigDrawer 等界面文案中文化。
- 主色保持 Shadcn Admin 默认（slate），按约定待项目完成后再调整。
- 验证：`pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm format:check` 全部通过。
- 等待下一阶段（Phase 2：NestJS + PostgreSQL，或用户安排的其它阶段）。

### Phase 1A：React + Shadcn Admin 基础建设（已完成）

- React（`/react`）基于官方 Shadcn Admin v2.2.1 初始化完成。
- UI 基础建立：Layout / Sidebar / Header / Theme / Dark Mode / shadcn/ui 组件可用。
- `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` 已实测通过，项目可独立运行。
- 未接入 NestJS、数据库、真实认证与 RBAC；当前页面为官方 Demo 与 Mock 数据。
