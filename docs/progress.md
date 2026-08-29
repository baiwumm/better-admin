# Better Admin 阶段性进度记录

> 本文件记录各阶段 / 模块的完成情况、关键决策与已知限制，**只做记录，不写规则**；硬性规则见 [`AGENTS.md`](../AGENTS.md)，机制结论沉淀见 [`mechanisms.md`](mechanisms.md)。
> **新条目追加在最上方（按时间倒序）**；条目中引用的 § 章节号（如 §7.2）指 `AGENTS.md` 对应章节，`§x.y` 指对应设计文档自身章节。

---

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
