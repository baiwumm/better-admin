# Better Admin — Vue 端开发方案（v1.1 修订版）

> 本文档是 Vue 端（Phase 4：Vue + NestJS）的完整开发方案：功能对齐清单、技术选型、MVP 路线。
> 基准：React 端为 UI / 交互 / 页面结构 Source of Truth（`ui-spec.md` §1）；API Contract 以 `nest/openapi/openapi.yaml`（v1.7.0）为唯一事实来源。
> 组件库策略：**Vue / Nuxt 以 Nuxt UI v4 为唯一 UI 组件库**（规则真源见 `AGENTS.md` §21 与 `docs/nuxt-ui-guide.md`）。

## 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v1.0 | 2026-09-05 | 初版方案（功能对齐清单 + 技术选型 + MVP 路线），评审通过 |
| v1.1 | 2026-09-05 | 落地评审 5 条微调：① M0 增加重写 `docs/routing.md`；② 图表选型补 chart tokens 色值对齐约束；③ M1 验收补测试策略（vitest globals + jsdom、纯函数测试拷贝）；④ 布局必须使用 Nuxt UI Dashboard 套件；⑤ 移除 React token 移植要求，直接使用 Nuxt UI 默认 Design Tokens / Color System |
| v1.2 | 2026-09-05 | 评审修正：路由选型由「Vue Router 集中式路由表手写 + `ROUTE_PATHS` 字典」改为 **Vue Router + unplugin-vue-router（官方文件式路由插件，`vue-router/vite`）**：`src/pages/` 为路由根、`(group)` 分组、`[param]` 动态段、`typed-router.d.ts` 类型生成；三层守卫逻辑保持不变，挂载方式适配为「全局前置守卫 + App.vue 按 `definePage()` meta 挂载 AdminLayout」（对应 React 端 `_authenticated` 布局路由） |

---

## 0. 架构约束（不可违反）

- **数据库**：Vue 不直接连接数据库，数据来源为 NestJS API（`requirements.md` §4.2）：`Browser → Vue → NestJS → PostgreSQL`。
- **API Contract**：请求/响应结构遵守 `nest/openapi/openapi.yaml`（v1.7.0）；Vue 阶段零后端改动，若发现契约缺口，先改契约评审再实现。
- **UI 对齐策略（v1.1 修订）**：页面结构、布局骨架、交互行为（侧边栏折叠/展开、Header 操作区顺序、表格工具栏位置等）与 React 端保持一致；**组件视觉直接使用 Nuxt UI 默认风格**，不刻意模仿 React（HeroUI）组件样式；品牌标识（Logo、产品名）保持一致；**功能对齐优先于像素级视觉对齐**。
- **UI 组件库**：Vue / Nuxt 均使用 **Nuxt UI v4**（`@nuxt/ui`，Tailwind CSS v4 + Reka UI）；禁止引入 Vuetify / Quasar / Element Plus / PrimeVue / shadcn-vue 等替代 UI 库（详见 `docs/nuxt-ui-guide.md`）。
- **布局实现硬约束**：侧边栏与顶部栏必须优先使用 Nuxt UI 官方 Dashboard 套件（`UDashboardGroup` / `UDashboardPanel` / `UDashboardSidebar` / `UDashboardNavbar` / `UDashboardSearch` / `UCommandPalette`），**禁止从零手写布局**。命名说明：评审意见中的 `UDashboardLayout` 在 Nuxt UI v4 中的实际组件名为 **`UDashboardGroup`**（v3 → v4 更名，职责一致：布局容器 + 侧栏状态持久化 + 单位定义）。
- 只动 `/vue` 与 `docs/`，不修改 NestJS 契约、React 端、Next.js 端。

---

## 1. 功能对齐清单

基准：`docs/feature-matrix.md` 22 项 + `react/src/routes/` 实际路由核对。优先级：**P0** = M0 骨架必备；**P1** = 核心业务（M1）；**P2** = 组织中心与增强（M2/M3）；P3 = 暂缓。依赖 API 均为 NestJS 现有契约，**Vue 阶段零后端改动**。

### 1.1 基础设施（6 项）

| 功能模块 | React 状态 | Vue 需实现内容（技术映射） | 依赖 API | 优先级 |
| --- | --- | --- | --- | --- |
| 全站 i18n（zh-CN/en） | ✅ | vue-i18n v11 + **`messageResolver` 扁平键查表**（等价 React 端 i18next `keySeparator: false`，兼容 `menu.settings` 等"叶子/分支共存"键）；直接复用 `react/src/i18n/locales/` 七个命名空间 JSON（同步脚本） | — | P0 |
| 主题系统（明暗模式） | ✅ | **Nuxt UI 内置 color mode（Vue 端基于 `@vueuse/core` 集成，`useColorMode` 自动导入）**，system/light/dark；**直接使用 Nuxt UI 默认 Design Tokens 与 Color System**，不移植 React token | — | P0 |
| 错误页（403/404/500） | ✅ | 独立全屏路由 + vue-router catch-all 404 | — | P0 |
| 路由权限守卫 | ✅ | vue-router **全局前置守卫**三层：登录拦截（带 redirect）→ 菜单派生权限（`permission.ts` 位运算平移）→ 白名单（`LOGIN_REQUIRED_PATHS = ['/','/account','/my-notices']` + 前缀 `'/org/notices/'`）；页面级 meta（`public` / `requiresMenu` / `titleKey`）经页面文件 `definePage()` 声明 | `GET /menus`、`GET /auth/me` | P0 |
| 多标签页 + KeepAlive | ✅ | **机制简化**：Vue 原生 `<KeepAlive include max>` 对齐「菜单 keepAlive 绑定标签、关闭即销毁、上限 10 LRU」语义；`tabs-store` / `tabs-model` 平移 | — | P1 |
| 命令面板 | ✅ | Nuxt UI `UDashboardSearch`（内置 Cmd+K 快捷键与明暗切换命令组）+ `UDashboardSearchButton` | `GET /menus` | P0（随布局套件落地） |

### 1.2 核心业务模块（9 项）

| 功能模块 | React 状态 | Vue 需实现内容（技术映射） | 依赖 API | 优先级 |
| --- | --- | --- | --- | --- |
| 认证（登录/登出/刷新/me） | ✅ | 登录页（受控表单 + `isSafeRedirect` 回跳 + rememberMe 长短会话）；Pinia auth-store（localStorage 持久化 `user/accessToken/isAuthenticated`，rememberMe 时才持久化 refreshToken）；api-client 401 → refresh（并发去重）→ 重试一次链路 | `/auth/login` `/auth/logout` `/auth/refresh` `/auth/me` | P0（页面）/ P0（链路） |
| 认证态布局骨架 | ✅ | **Nuxt UI Dashboard 套件**：`UDashboardGroup` + `UDashboardSidebar`（菜单 items 注入）+ `UDashboardPanel` + `UDashboardNavbar`（右侧操作区：Search / ThemeSwitch / ConfigDrawer / ProfileDropdown）+ 移动端抽屉与折叠由套件内置；导航数据 `useMenus` + `hideInMenu` 过滤 + `getMenuLabel`（i18nKey 优先） | `GET /menus` | P0 |
| 用户管理 | ✅ | 列表范式首立页：`@tanstack/vue-table` + Nuxt UI 原子组件拼装 DataTable（Toolbar / Pagination / BulkActions / FacetedFilter / ViewOptions）；`create-list-store`（epoch 策略）Pinia 版；写保护按钮显隐三层口径 | `/users` 系 | P1 |
| 角色管理 | ✅ | CRUD + 菜单授权 Drawer；`SUPER_ADMIN_ROLE_PROTECTED` 403 文案分支 | `/roles` `/roles/{id}/menus` | P1 |
| 权限管理（只读） | ✅ | 位掩码枚举字典表（`usePermissions` + staleTime 5min 平移） | `/permissions` | P1 |
| 菜单管理 | ✅ | 树形 CRUD（add-child、排序、防环 409、i18nKey、图标选择） | `/menus` `/menus/tree` `/menus/{id}/add-child` | P1 |
| 字典管理 | ✅ | 类型 + 项双栏 CRUD | `/dict/*` | P1 |
| 日志管理 | ✅ | Tabs 四分类 + 只读列表 + 详情 Drawer + 批量删除 | `/logs` `/logs/{id}` | P1 |
| Dashboard 概览 | ❌ | **保持占位页，不实现**（各端均未实现，图表选型见 §2 图表行） | — | P3 |

### 1.3 组织中心模块（7 项 + 账户）

| 功能模块 | React 状态 | Vue 需实现内容（技术映射） | 依赖 API | 优先级 |
| --- | --- | --- | --- | --- |
| 组织管理 | ✅ | 左树右表 + 拖拽排序（`vue-draggable-plus`） | `/org/depts` `/org/depts/tree` `/org/depts/sort` | P1 |
| 岗位管理 | ✅ | CRUD + 成员穿透 Drawer | `/org/posts` `/org/posts/{id}/members` | P1 |
| 人员通讯录 | ✅ | 组织树筛选 + 服务端分页 + URL Query ↔ store 双向同步（防 epoch 循环） | `/org/directory` `/org/depts/tree` | P1 |
| 公告管理 | ✅ | `@tiptap/vue-3`（同内核，HTML 序列化与 React 端互通）+ `dompurify`；范围选择/定时/撤回/催读；已读人员头像堆叠列 | `/notices` 系 | P2 |
| 我的公告 | ✅ | 白名单页 `/my-notices`：双栏 + `?noticeId=` 驱动选中 + 阅读态筛选 + 进详情记已读 | `/notices/mine` `/notices/{id}` | P2 |
| 站内信通知 | ✅ | Header 铃铛 + 未读数 + 抽屉（固定 Tabs + 类型图标 + 未读点）；消费路由 `/org/notices/:noticeId`（登录可达，服务端可见性校验） | `/notifications` 系 | P2 |
| 架构图谱 | ✅ | `@vue-flow/core`（懒加载独立 chunk）+ 手写树布局移植（零依赖，mechanisms §7.2 适用） | `GET /org/depts/tree` | P2 |
| 通讯录 Excel 导出 | ✅ | `write-excel-file`（框架无关直接复用，mechanisms §7.3 踩坑结论适用） | `/org/directory` | P2 |
| 我的账户 | ✅ | 双 Tab（资料/安全）+ 头像裁剪（`vue-advanced-cropper`）+ Storage 中转上传 | `/account/*` | P2 |

**复用结论**：全部 21 个可实现模块均直接消费 NestJS API，零契约变更；需独立实现的只有纯前端层——全部 UI（Nuxt UI）、4 个框架绑定库替换点（裁剪/拖拽/图谱/图表）、KeepAlive 机制简化。可直接复用的框架无关资产：i18n 七个 JSON、zod schema、`permission.ts` 位运算、`api-types.ts`、`write-excel-file` 导出逻辑、手写树布局、`tabs-model`。

---

## 2. 技术选型方案

| 能力 | React 基准 | **Vue 端选型** | 选型理由 | 备选 |
| --- | --- | --- | --- | --- |
| 框架 | React 19 + Vite 8 | **Vue 3.5+（`<script setup>` + TS strict）+ Vite 8 + `@vitejs/plugin-vue`** | 对齐 React 工程基线；纯 SPA | — |
| UI 库 | HeroUI 3.2 | **Nuxt UI v4（`@nuxt/ui`）**，Vue 项目经 `@nuxt/ui/vite` 插件 + `@nuxt/ui/vue-plugin` 接入 | 唯一组件库（评审决策）；v4 免费含 Dashboard 套件 / UTable（底层 TanStack Table）/ CommandPalette | shadcn-vue（被本决策取代，禁止引入） |
| 布局 | 自研 AdminLayout（HeroUI） | **Dashboard 套件**：`UDashboardGroup`（v4 中 `UDashboardLayout` 的对应组件）+ `UDashboardSidebar` + `UDashboardPanel` + `UDashboardNavbar`；折叠/移动端抽屉由套件内置 | 减少约 80% 布局自研工作量；与 Nuxt 端共享同一套布局实现 | — |
| 路由 | TanStack Router 1.x（文件式） | **Vue Router + unplugin-vue-router（官方文件式路由插件）**：`src/pages/` 为路由根，`index.vue` / `[param].vue` / `(group)/` / 点号扁平化等约定，**URL 与 React 端完全一致**；构建期生成 `typed-router.d.ts`，路由跳转与参数均有类型提示（开发体验对齐 React 端文件式路由与 Nuxt 约定） | 与 React 端 `src/routes/` 文件式心智一致；官方维护（vue-router 5 已内置集成，`import VueRouter from "vue-router/vite"`） | 集中式手写路由表（已否决） |
| 状态 | Zustand 5 | **Pinia 3（setup store）** | Vue 官方事实标准；React 6 个 store 逐一平移 | — |
| 数据请求 | fetch 封装 api-client | **@tanstack/vue-query 5 + 复刻 fetch 版 api-client**（React 端实为 fetch 封装而非 axios；401 refresh 并发去重 + 信封解包逻辑平移） | vue-query 与 react-query 同 API，epoch 策略整体平移 | — |
| 表格 | TanStack Table v9 + 自研 DataTable | **@tanstack/vue-table v9 + Nuxt UI 原子组件拼装 DataTable** | TanStack Table 官方 Vue adapter，逻辑层与 React 几乎同构 | Nuxt UI UTable 整表（定制自由度低） |
| 表单 | react-hook-form + zod 4 | **vee-validate 4 + zod 4（`@vee-validate/zod`）**（M1 引入；M0 登录页用受控 refs） | zod schema 框架无关直接平移 | — |
| i18n | i18next（扁平键） | **vue-i18n v11 + `messageResolver: (obj, key) => obj[key]`** | 官方自定义 resolver 支持扁平字面量键，兼容共存键；locales JSON 直接复用 | — |
| 富文本 | TipTap 3 | **@tiptap/vue-3 + starter-kit** | 官方双框架，序列化互通 | — |
| 图谱 | @xyflow/react 12 | **@vue-flow/core**（懒加载独立 chunk） | ui-spec §1.3 预留决策 | — |
| Excel | write-excel-file 4 | **原库复用**（框架无关） | mechanisms §7.3 直接适用 | — |
| 图表 | Recharts（已定未实施） | **暂不引入；Dashboard 立项时推荐 ECharts + vue-echarts。若 React 端 Dashboard 先行采用 Recharts，Vue 端 ECharts 必须在配置中强制使用项目 chart tokens（--chart-1..5）确保 Dark/Light 色值与 React 端完全一致；Dashboard 立项时两端共同评审色值映射方案**（ui-spec §1.3「四端图表一致性靠规范保证」的显式色值约束） | Recharts 无 Vue 实现；依赖纪律不提前引入 | unovis / Chart.js |
| 拖拽 | @dnd-kit | **vue-draggable-plus** | Vue 生态主流 | useSortable（@vueuse/integrations） |
| 裁剪 | react-easy-crop | **vue-advanced-cropper** | Vue 生态成熟 | cropperjs |
| 图标 | lucide-react | **lucide-vue-next** + Nuxt UI Icon（`@iconify-json/lucide`，组件 `icon` prop 用 `i-lucide-*` 名） | 同一图标集 | — |
| Toast | HeroUI toast | **Nuxt UI `useToast`**（`UApp` 提供上下文；api-client 全局错误经回调注入到 App 层转发） | 统一组件库 | vue-sonner |
| 主题 | 自研 ThemeProvider + Cookie | **Nuxt UI 内置 color mode（`useColorMode` 自动导入，Vue 端基于 @vueuse/core）+ Nuxt UI 默认 Design Tokens / Color System**；品牌色如需定制走 vite 插件 `ui({ ui: { colors } })` 配置，禁止业务代码硬编码色值 | v1.1 修订：不移植 React token，不建 --ui-* 映射层；暗色模式开箱即用 | — |
| 保活 | 自研 KeepAliveOutlet（Activity + LRU） | **Vue 原生 `<KeepAlive>`（include 白名单 + max LRU）+ tabs-store** | 原生能力覆盖核心语义，实现大幅简化 | — |
| 测试 | vitest 4 | **vitest（`globals: true` + `environment: 'jsdom'`）+ @vue/test-utils**；纯函数测试（permission / tabs-model / format-date）从 React `__tests__` 拷贝平移；组件测试独立编写；**无覆盖率硬性要求**（v1.1 微调 3） | React 端纯逻辑测试直接复用；jsdom 供组件挂载测试 | — |
| 工具 | clsx + tailwind-merge、dompurify | **同库复用** | 框架无关 | — |

### 路由文件结构（`src/pages/`，v1.2）

unplugin-vue-router 官方约定：`index.vue` → 空路径；`[param].vue` → 动态段；`[...all].vue` → catch-all；`(group)/` 分组目录**不入 URL**；`a.[param].vue` 点号扁平化 → 顶层路由（不嵌套进 `a.vue`）——与 React 端 TanStack Router 的 `notices_.$noticeId.tsx` 脱嵌套语法一一对应。文件树覆盖全部 22 项功能的 URL：

```text
vue/src/pages/
├── (auth)/
│   └── sign-in.vue                 → /sign-in                    登录
├── (errors)/
│   ├── 403.vue                     → /403                        禁止访问
│   ├── 404.vue                     → /404                        页面不存在
│   └── 500.vue                     → /500                        服务器错误
├── (authenticated)/                # 语义对应 React _authenticated 路由组（分组名不入 URL）
│   ├── index.vue                   → /                           Dashboard 占位
│   ├── account.vue                 → /account                    我的账户
│   ├── my-notices.vue              → /my-notices                 我的公告（白名单）
│   ├── org/
│   │   ├── depts.vue               → /org/depts                  组织管理
│   │   ├── posts.vue               → /org/posts                  岗位管理
│   │   ├── directory.vue           → /org/directory              人员通讯录
│   │   ├── chart.vue               → /org/chart                  架构图谱
│   │   ├── notices.vue             → /org/notices                公告管理
│   │   └── notices.[noticeId].vue  → /org/notices/:noticeId      公告详情（白名单前缀豁免）
│   └── settings/
│       ├── index.vue               → /settings                   系统设置占位
│       ├── users.vue               → /settings/users             用户管理
│       ├── roles.vue               → /settings/roles             角色管理
│       ├── permissions.vue         → /settings/permissions       权限管理
│       ├── menus.vue               → /settings/menus             菜单管理
│       ├── dicts.vue               → /settings/dicts             字典管理
│       └── logs.vue                → /settings/logs              日志管理
└── [...all].vue                    → /:path(.*)                  未匹配兜底（全屏 404）
```

布局与守卫挂载（unplugin-vue-router 无 Nuxt 式 pathless 布局文件，按评审允许的方式适配）：

- **共享布局**：`(authenticated)/` 各页经 `definePage()` 声明 `meta.requiresLayout`；`App.vue` 据此把 `<RouterView/>` 包进 `layouts/AdminLayout.vue`（Dashboard 套件）——等价 React `_authenticated/route.tsx` 布局路由，且布局跨页面切换保持挂载。
- **三层守卫**：逻辑集中在一个全局前置守卫（`src/router/guards.ts`：登录拦截 → 菜单派生权限 → 白名单豁免），语义与 React 端 `beforeLoad` + `useMenuRouteGuard` 完全一致；页面仅通过 `definePage()` 提供声明式 meta（`public` / `requiresMenu` / `requiresLayout` / `titleKey`）。
- **类型安全**：vite 插件生成 `typed-router.d.ts`（tsconfig include），`router.push({ name: '...(authenticated)/settings/users' })`、路由 query/params 均有类型提示；`typed-router.d.ts` 与 `auto-imports.d.ts` 等生成物一并加入 `.gitignore`。

### 机制结论适用性评估（`docs/mechanisms.md`）

| 机制 | Vue 端处置 |
| --- | --- |
| §1 permissions 缓存 | 平移：vue-query `["permissions"]` + staleTime 5min |
| §2 KeepAlive 实例池 | 简化重建：原生 KeepAlive `include`（打开且未关闭的保活菜单）+ `max: 10`（LRU）；自研池不再需要；「关闭标签即销毁」由 include 白名单维护 |
| §3 菜单可见性 / super_admin | 后端权威；前端仅 `filterHiddenMenus`（侧边栏渲染），**不做 filterAccessibleMenus 二次过滤**（React 端教训：分组节点 userPermissions="0" 会被误杀整组） |
| §4 epoch 列表策略 | 整体平移：Pinia 版 `create-list-store`（含 setFilters 同值幂等）+ vue-query `placeholderData: keepPreviousData`；契约测试平移 |
| §5 用户写保护三层规则 | 后端权威；按钮显隐口径平移 |
| §6 权限快照 + /auth/me | 平移：AdminLayout 挂载时 `/auth/me`（staleTime 30s、retry false）覆盖 user；登出时 `removeQueries` 清 auth/menus 缓存 |
| §7 图谱/导出踩坑 | 框架无关直接适用 |

**不继承清单**（React 端 2026-09-04 排查已修问题，Vue 直接做对）：列表页接 `isError` 错误态；`clearSession` 清 menus 缓存；`setFilters` 同值幂等；日期统一走 i18n 感知 `format-date`；删除后 `resetRowSelection`；公告详情切换重置已读/未读页码。

---

## 3. MVP 开发路线

原则：每个里程碑独立可验收、可构建（`pnpm dev/build/lint/test` 四绿）；结束即更新 `docs/feature-matrix.md` 与 `docs/progress.md` 并按 AGENTS §10 提交；只动 `/vue`（+ 文档）。提交规范：每个验收点独立 commit，前缀 `vue(Mn):`。

### M0 — 工程基建与骨架（当前阶段）

1. Vite + Vue 3.5 + TS strict 脚手架；ESLint 9（flat config + eslint-plugin-vue）+ Prettier；vitest（globals + jsdom）。
2. Nuxt UI v4 接入：`@nuxt/ui/vite` 插件 + `@nuxt/ui/vue-plugin` + CSS `@import "tailwindcss"; @import "@nuxt/ui";` + `UApp` 包裹 + `auto-imports.d.ts` / `components.d.ts`。
3. **布局骨架使用 Dashboard 套件**：`UDashboardGroup` + `UDashboardSidebar`（菜单 items 注入）+ `UDashboardPanel` + `UDashboardNavbar` + `UDashboardSearch` / `UDashboardSearchButton`；折叠/展开/移动端抽屉/Cmd+B 由套件内置，不手写。
4. 暗色模式由 Nuxt UI 内置 useColorMode 提供，直接使用默认 Design Tokens 和 Color System；主题切换（system/light/dark）+ 语言切换 + 用户菜单入 Navbar slots。
5. 文件式路由：`vue-router/vite` 插件 + `src/pages/` 约定（§2 路由文件结构，URL 与 React 一致）+ 全局前置三层守卫（页面 meta 经 `definePage()` 声明）；403/404/500 + Dashboard 占位。
6. pinia auth-store + vue-query + api-client（Bearer 注入、401 refresh 并发去重、500 全局链路）闭环。
7. vue-i18n 接入（`messageResolver` 扁平键），locales 从 React 拷贝 + `scripts/sync-locales.mjs` 同步脚本。
8. 登录页（受控表单 + redirect 回跳 + rememberMe）。
9. **重写 `docs/routing.md`**（以 React 实际路由为基准，补组织中心 7 条路由，删除对已删除的 `route-paths.ts` 的引用）。
10. 组件库策略文档同步（AGENTS §7.2+§21 / requirements §7.3 / ui-spec §18.3 → Nuxt UI，随 `docs/nuxt-ui-guide.md` 一并落地）。

**M0 验收标准**：脚手架可运行；Nuxt UI + Tailwind v4 工作；布局为 Dashboard 套件且折叠/抽屉/快捷键内置；暗色模式为 Nuxt UI 内置方案；文件式路由（unplugin-vue-router，`src/pages/` 覆盖全部模块 URL）+ 三层守卫；auth 链路闭环；i18n 中英切换生效；登录页 + 错误页 + 占位页；`pnpm build` / `pnpm lint` 通过；`docs/routing.md` 重写完成；三份组件库策略文档更新完成。

### M1 — 核心系统管理六模块

- 顺序：用户 → 角色 → 权限 → 菜单 → 字典 → 日志（用户页首立 DataTable/Drawer 表单/ConfirmDialog 范式）。
- 同步落地：DataTable 组合件、`create-list-store` + epoch（含契约测试）、`hasPermission` 按钮门控。
- **测试策略（v1.1 微调 3）**：`vue/src/lib/__tests__/` 存放从 React 拷贝的纯函数测试（permission、tabs-model、format-date），vitest 配置 `globals: true` + `environment: 'jsdom'`（避免 JSX 解析差异，测试文件为纯 TS）；KeepAlive 行为等组件测试用 `@vue/test-utils` 独立编写；**不做覆盖率硬性要求**。
- 验收：六页功能与 React 对齐（列表三态、URL 状态、权限门控、super_admin 保护 403 文案）；vitest 全绿；与 React 并排走查。

### M2 — 组织中心

- 顺序：组织管理 → 岗位 → 通讯录（URL Query 同步）→ 公告管理（TipTap）→ 我的公告 + 站内信 → 架构图谱（vue-flow）→ Excel 导出。
- 验收：图谱四交互 + `?deptId=` 贯通；导出样式对齐（品牌蓝表头/斑马纹/冻结首行）；公告 HTML 与 React 端互发渲染一致。

### M3 — 我的账户 + 多标签页 + 收尾

- 账户双 Tab + 头像裁剪上传闭环；多标签页（KeepAlive include/max + 关闭即销毁）；命令面板接入菜单/路由数据。
- 验收：标签页保活行为对照 React；头像上传后全局刷新；Cmd/Ctrl+K 唤起。

### M4 — 部署与文档收尾

- Vercel 部署 `vue.baiwumm.com`（Root Directory = `vue`，`VITE_API_BASE_URL` 指向 `https://nest.baiwumm.com`，Nest CORS 增加该域名）；根 version 同步 + `pnpm sync-versions` + tag。
- 文档：feature-matrix Vue 列全量更新（Dashboard 保持 ❌）；mechanisms.md 增补 Vue KeepAlive 简化条目；progress.md 置顶各阶段条目。
- 验收：线上冒烟（登录 → 模块走查 → 暗色/英文）；统计与实际一致。

### 范围外

Dashboard 实现（等 React 端立项，图表按 §2 图表行约束双端评审）；Nuxt 版（Phase 6）；任何 NestJS 契约变更。
