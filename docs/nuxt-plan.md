# Better Admin — Nuxt 端开发方案（v1.3 可行性计划）

> 本文档是 Nuxt 端（Phase 6：Nuxt 全栈）的可行性评估与开发计划：功能对齐清单、代码复用地图、技术选型、待确认决策、MVP 路线与风险评估。
> **状态：M0 已完成（2026-09-12，工程基建与骨架 + 认证最小闭环，五绿 + GUI 冒烟通过，详见 progress.md 置顶条目），M1（服务端全量移植）待开工指令**。
> 基准三方：**React = UI / 交互 / 页面结构 Source of Truth**（`ui-spec.md` §1）；**Vue = 组件实现与代码形态的平移蓝本**（同 Nuxt UI + Pinia + vue-query）；**Next = 服务端实现蓝本**（同为独立全栈、共用同一 PostgreSQL）。
> 契约真源：`nest/openapi/openapi.yaml`（v1.9.0）。组件库规则见 `AGENTS.md` §21 与 `nuxt-ui-guide.md`。

## 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v1.0 | 2026-09-11 | 初版可行性计划：功能对齐清单（26 项）、三源复用地图、技术选型、6 项待确认决策、M0-M5 路线、风险评估 |
| v1.1 | 2026-09-11 | 与 `feature-matrix.md` 校正后的行数对齐：清单 **26 项 → 27 项**（新增「路由过渡动画」行，Vue 端 M4 已实测生效）；「统计口径漂移」顺带修正项已由 Vue M4 文档收尾完成 |
| v1.2 | 2026-09-12 | 状态同步（文档指针清理）：`nuxt/` 官方启动模板已初始化（`e8f71cd`），D1-D6 决策仍待拍板，M0 业务代码未开始 |
| v1.3 | 2026-09-12 | 按用户指令对齐实际项目：① §2 新增 **§2.4 行为级对齐补充**（键盘可达性 / 首屏骨架 / syncMeta 等 2026-09-12+ Vue 端新增）；② 技术选型翻转为 **Nuxt Modules / 内置机制优先**（color-mode 内置 / useHead / @nuxtjs/i18n 推荐 / 不用 NuxtLoadingIndicator）；③ §1 新增 **llms-full.txt 开发规则**；④ M0 改为基于既有模板（不再脚手架）；⑤ D3 推荐翻转、D5 改导入风格口径、D6 改工程化口径（目录结构已由模板确定，移出决策表） |

---

## 0. 可行性结论（TL;DR）

**结论：可行，且是四端中「复用率最高」的一次实现——但工作量分布与前三端不同，重心从「写前端」转为「移植服务端」。**

关键依据（均为本次实地核对代码得出）：

1. **Nuxt 与 Vue 前端同构，可整体平移。** Vue 端已是 Nuxt UI v4 + Pinia + `@tanstack/vue-query` + `vue-i18n`（扁平键 resolver）+ `@tanstack/vue-table`，与 Nuxt 端技术栈**逐项相同**，差别只在「路由与运行时的接线方式」。Vue 前端约 **21,600 行**（features 12,987 / components 3,902 / lib 2,124 / stores 764 / themes 480 / layouts 469 / composables 332 / pages 330），预计 **85-90% 可平移**，真正需要新写/改造的入口文件合计仅约 **1,100 行**（`AdminLayout.vue` 326 / `AuthLayout.vue` 143 / `api-client.ts` 231 / `KeepAliveOutlet.vue` 199 / `i18n/index.ts` 88 / `guards.ts` 60 / `main.ts` 39 / `App.vue` 35 / `route-vt.ts` 34 / `env.ts` 10）。
2. **服务端必须新写，但蓝本完备。** Nuxt 是独立全栈、不依赖 NestJS（`AGENTS.md` §4），需自行实现全部 REST API。Next 端已经是一份**同构可移植实现**：`db/` 774 行 + `lib/server/` 5,780 行（22 文件）+ `app/api/` 44 个 route handler 2,386 行 + `proxy.ts` 147 行，合计约 **8,900 行**，且**与 Next 框架耦合点仅 4 文件 22 处**（`route-helpers.ts` 10、`request-auth.ts` 7、`auth/cookies.ts` 3、`route-auth.ts` 2），其余全是框架无关的 drizzle 业务逻辑。
3. **Next 端页面无服务端查库。** 已核对 `next/src/app/**/page.tsx`：**全部为客户端组件**，数据一律经 `/api/**` route handler 获取。因此 Nuxt 端**不需要**为 SSR 重写数据层，沿用 Vue 的 `vue-query + api-client` 客户端取数即可，Nuxt 的「全栈」价值落在 Nitro server routes（与 Next 完全同构）。
4. **共用同一数据库，行级业务规则已在 Next 端固化。** schema（17 张表 / 573 行）、`token_version` 实时校验、软删、日志 action 命名、`super_admin` 保护等均为既有资产，移植时**只搬运不改写**，是保证四端数据行为一致的最低风险路径。
5. **最大不确定性是渲染模式与认证传输层**（§5 D1/D2），两者决定前端改造量级（0% 或 20%），**须先拍板再动工**。

预计相对工作量：服务端移植 ≈ 45%、前端平移与接线 ≈ 30%、增强特性（多标签页 / VT / 列设置 / 命令面板 / 偏好）≈ 15%、部署与文档 ≈ 10%。

---

## 1. 架构约束（不可违反）

- **全栈独立**：Nuxt 不依赖 NestJS、不依赖 Next.js（`AGENTS.md` §4）；数据库访问只经 Nitro 服务端，浏览器端不接触 `DATABASE_URL`（§5）。
- **共用数据库**：与 Nest / Next 共用同一个 Supabase PostgreSQL；**不改 Schema、不改 API Contract**。若发现契约缺口，先改 `nest/openapi/openapi.yaml` 评审再实现（§6）。
- **Contract 一致**：44 个端点的路径、方法、请求/响应信封（`{ data }` / `{ data, pagination }` / `{ code, message }`）、错误码必须与契约逐字一致。
- **UI 对齐策略**：页面结构、布局骨架、交互行为（侧边栏折叠 / Header 操作区顺序 / 表格工具栏位置）与 **React 端**一致；组件视觉直接使用 **Nuxt UI 默认风格**，不刻意模仿 HeroUI（`AGENTS.md` §21；`vue-plan.md` §0 同口径）。
- **组件库唯一**：Nuxt UI v4（`@nuxt/ui` Nuxt module）。禁止 Vuetify / Quasar / Element Plus / PrimeVue / shadcn-vue（§21）。
- **布局硬约束**：侧边栏 / 顶部栏 / 命令面板必须使用 Dashboard 套件（`UDashboardGroup` / `UDashboardPanel` / `UDashboardSidebar` / `UDashboardNavbar` / `UDashboardSearch`），禁止手写布局（§21）。
- **主题策略**：直接使用 Nuxt UI 默认 Design Tokens 与 Color System；**不移植** React `theme.css`、不建 `--ui-*` 映射层（§21）。
- **只动 `/nuxt` 与 `docs/`**：不修改 NestJS、React、Next、Vue 各端代码。
- **代码生成前置检查**：任何 Nuxt / Nuxt UI 代码产出前必须执行 `nuxt-ui-guide.md` §2 前置检查（Skill 可用性 + 官方文档核对），**禁止凭记忆使用 Nuxt UI API**。
- **Nuxt 开发规则**：Nuxt 相关开发必须遵循来自 **https://nuxt.com/llms-full.txt** 的完整 Nuxt 指南（硬性规则单点维护在 `AGENTS.md` §18 第 8 条）。
- **Nuxt Modules / 内置机制优先**：某项能力存在官方 Nuxt Module 或框架内置机制（auto-imports / `useHead` / route middleware / `useCookie` / `error.vue` / Nitro server routes 等）时，**优先采用**，不强制实现方式与 Vue 端逐字一致；但**行为必须保持不变**（与 React 基准、Vue 端既有效果对齐）。内置机制无法覆盖行为时（如进度条的请求驱动），不用内置替代品硬凑，按 §4 选型。

---

## 2. 功能对齐清单（27 项）

基准：`docs/feature-matrix.md` 实际表格行（核心业务 9 + 组织中心 8 + 基础设施 10 = **27 项**；该文件的统计口径已于 2026-09-11 按行校正，见 §7）。优先级：**P0** = 骨架必备；**P1** = 核心业务；**P2** = 组织中心与增强；**P3** = 暂缓。

### 2.1 基础设施（10 项）

| 功能模块 | React | Vue | Nuxt 实现要点 | 优先级 |
| --- | --- | --- | --- | --- |
| 全站 i18n（zh-CN/en） | ✅ | ✅ | 复用 `vue-i18n` + `messageResolver` 扁平键（同 Vue）；`scripts/sync-locales.mjs` 从 Vue 平移（含裸 `@` → `{'@'}` 幂等转义，机制见 `mechanisms.md` §13）；`predev` 钩子同步 | P0 |
| 主题系统（明暗模式） | ✅ | ✅ | Nuxt UI 内置 color mode（`useColorMode`，module 自带 `@nuxtjs/color-mode` 能力）；`app.head` 输出防闪烁脚本（对齐 Vue 的 `index.html` 脚本语义） | P0 |
| 偏好设置抽屉（9 项） | ✅ | ✅ | `design-theme-store`（Pinia）+ `themes/*` + `components/layout/prefs/*` 整体平移；`initDesignTheme` 改在 Nuxt plugin（client）中于挂载前应用 | P1 |
| 多标签页 + KeepAlive | ✅ | ✅ | `tabs-model`（32 用例）+ `tabs-store` 平移；`KeepAliveOutlet` 宿主组件机制需按 Nuxt `<NuxtPage keepalive>` 语义重写（Vue 端按路径包宿主组件的做法在 Nuxt 下需评估保留或替换） | P2 |
| DataTable 列设置 | ✅ | ✅ | `column-setting.ts`（9 用例）+ `DataTableViewOptions.vue` 整体平移；`useColumnSettingKey` 改用 Nuxt 路由 | P2 |
| 命令面板 | ✅ | ✅ | `UDashboardSearch` + React 语义的菜单分组拍平（Vue M3-6 成果平移）+ 自建主题组（走 design-theme-store）；**必须显式传 `title` / `description`**（Nuxt UI 4.11 locale 包缺键，见 `mechanisms.md` §16.3） | P1 |
| 错误页（403/404/500） | ✅ | ✅ | `error.vue` + `components/common/error-pages/*` 平移；Nuxt 原生 `createError` / `showError` 接线；文档标题用 `errors.*.title`（同 React `staticData.titleKey`）；**登录要求口径待统一**（见 `feature-matrix.md` 错误页行 ⚠️） | P0 |
| 异常页菜单（/exception/*） | ✅ | ✅ | `pages/exception/{403,404,500}.vue` + AdminLayout 全宽白名单 + 文档标题键 | P0 |
| 路由权限守卫 | ✅ | ✅ | 三层守卫用 Nuxt 全局 route middleware（`app/middleware/auth.global.ts`）重写（逻辑照抄 `vue/src/router/guards.ts`）；**权威仍是 API 层鉴权** | P0 |
| 路由过渡动画（9 预设 + 3 档速度） | ✅ | ✅ | `lib/route-vt.ts` + `route-transitions.css` 平移；接线点为 `useRouter()` 的 `beforeResolve` / `afterEach`（须 `import.meta.client` 守卫）；动态路由标题/面包屑需用 `resolveRouteTitleKey()` 前缀匹配（见 `mechanisms.md` §16.2） | P2 |

### 2.2 核心业务模块（9 项）

| 功能模块 | React | Vue | Nuxt 实现要点 | 优先级 |
| --- | --- | --- | --- | --- |
| 认证（登录/登出/刷新/me） | ✅ | ✅ | 服务端移植 Next `lib/server/auth/*`（tokens / session / cookies / request-auth）+ 4 个端点；前端 `auth-store` 与 `api-client` 平移（传输层见 §5 D2） | P0 |
| 我的账户（资料/邮箱/密码/头像） | ✅ | ✅ | 前端整体平移（双 Tab 六卡 + `AvatarCropDialog` + `TagInput` + `PasswordStrength`）；服务端移植 `account-service` + `avatar-storage`（Supabase Storage 中转，框架无关） | P2 |
| 用户管理 | ✅ | ✅ | 前端 `features/users/*` 平移（列表范式首立页）；服务端 `users-service` 775 行 + 5 端点 | P1 |
| 角色管理 | ✅ | ✅ | CRUD + 菜单授权 Drawer + `SUPER_ADMIN_ROLE_PROTECTED` 403 文案分支；服务端 `roles-service` + 3 端点 | P1 |
| 权限管理（只读） | ✅ | ✅ | 位掩码字典只读列表；服务端 `permissions.ts` + 1 端点 | P1 |
| 菜单管理 | ✅ | ✅ | 树形 CRUD（add-child / 防环 409 / i18nKey / 图标）；服务端 `menus-service` 513 行 + 4 端点 | P1 |
| 字典管理 | ✅ | ✅ | 类型 + 项双栏 CRUD；服务端 `dict-service` + 4 端点 | P1 |
| 日志管理 | ✅ | ✅ | 四分类只读列表 + 详情 Drawer + 批量删除；服务端 `logs-service` + 2 端点；`scripts/clean-logs.mjs` 平移 | P1 |
| Dashboard 概览 | ❌ | ❌ | **保持占位页**（各端均未实现，`plan-dashboard-playground.md` 统一立项） | P3 |

### 2.3 组织中心模块（8 项）

| 功能模块 | React | Vue | Nuxt 实现要点 | 优先级 |
| --- | --- | --- | --- | --- |
| 组织管理 | ✅ | ✅ | 左树右表 + 同级拖拽排序（`useSortable`）；服务端 `depts-service` 594 行 + 4 端点 | P2 |
| 岗位管理 | ✅ | ✅ | CRUD + 成员穿透 Drawer；服务端 `posts-service` 613 行 + 3 端点 | P2 |
| 人员通讯录 | ✅ | ✅ | 组织树筛选 + 服务端分页 + `?deptId=` URL 双向同步（Nuxt `useRoute()` 语义，注意 SSR/客户端一致性） | P2 |
| 公告管理 | ✅ | ✅ | `@tiptap/vue-3` 富文本 + 范围选择 + 定时 + 撤回 + 催读；服务端 `notices-service` **1,183 行** + 7 端点（服务端最大单文件） | P2 |
| 我的公告 | ✅ | ✅ | 左列表右详情（`?noticeId=` 驱动）+ 阅读态筛选 + 进详情记已读 | P2 |
| 站内信通知 | ✅ | ✅ | Header 铃铛 + 未读数 + 60s 轮询 + 消费路由 `/org/notices/:noticeId`（登录可达、不走菜单权限）；服务端 `notifications-service` + 4 端点 | P2 |
| 架构图谱 | ✅ | ✅ | `@vue-flow/core` + 手写树布局（懒加载 chunk）；`org-chart-layout.ts` 框架无关直接平移 | P2 |
| 通讯录 Excel 导出 | ✅ | ✅ | `write-excel-file` 串行分页导出 + 企业级样式；`directory-export.ts` 平移（机制 §7.3 适用） | P2 |

### 2.4 行为级对齐补充（2026-09-12 后 Vue 端新增，随所属里程碑落地）

> 功能矩阵 27 行之外的行为级对齐项（进度详见 `docs/progress.md` 2026-09-12 各条目）。

| 行为 | React | Vue | Nuxt 实现要点 | 优先级 |
| --- | --- | --- | --- | --- |
| 键盘可达性：标签关闭热区（Tab 聚焦 + Enter / Space 关闭 + 焦点环） | ✅ | ✅ | 随 TagsBar 平移（span `tabindex` + keydown + 焦点环，行为同 Vue） | P2 |
| 键盘可达性：Shift+F10 打开标签菜单 | ✅ | ✅ | Vue 端为合成派发 contextmenu（reka ContextMenu 无受控 open）——同构平移，浏览器冒烟确认 | P2 |
| 键盘拖拽：标签排序 / 组织树（dnd-kit KeyboardSensor） | ✅ | ❌ | **已知差异（沿用 Vue 口径）**：Vue / Nuxt 用 sortablejs（无键盘能力），不另行实现 | P3 |
| DataTable 首屏骨架行（表头 + 6 行骨架，非遮罩） | ✅ | ✅ | 随 DataTable.vue 平移（假行 + cell 渲染器覆盖方案，对齐 ui-spec §14.2 三端口径） | P2 |
| 公告详情 tabs meta（标签显示公告标题 + 面包屑两级） | ✅ | ✅ | 随 notice-detail-page 平移（`syncMeta` 调用 + 面包屑 meta 回退分支） | P2 |
| i18n locales 键集合一致性测试（zh/en 逐域 + 非空 + 前缀） | ✅ | ✅ | 随 vitest 接线平移（`i18n/__tests__/locales.test.ts`） | P1 |
| 进度条状态机响应式化 + 事件监听收敛（VueUse） | ✅（zustand） | ✅ | `lib/progress.ts` 响应式状态机平移；`@bprogress` 桥接按 §4 选型 | P1 |

---

## 3. 代码复用地图（三源）

### 3.1 服务端：Next → Nitro（新增工作量主体）

| Next 资产 | 规模 | 移植处置 |
| --- | --- | --- |
| `src/db/schema.ts` + `relations.ts` + `client.ts` | 774 行 | **整体平移**（同构副本）；`server-only` 导入移除；`postgres` 驱动 + `ssl: { rejectUnauthorized: false }` + `prepare: false` + `max: 10` 配置逐字保留（机制见 `next/src/db/client.ts` 头注释） |
| `src/lib/server/*-service.ts`（12 个业务 service） | 5,780 行 | **逐文件平移**，业务逻辑零改写；仅改 import 别名 |
| `src/lib/server/auth/*`（tokens / session / cookies / request-auth） | 470 行 | 平移 + h3 适配：`jose` 验签逻辑不变；`NextRequest.cookies` → `getCookie(event, ...)`；`NextResponse.cookies.set` → `setCookie(event, ...)` |
| `src/app/api/**/route.ts`（44 个） | 2,386 行 | 平移为 `server/api/**/*.{get,post,put,delete}.ts`（Nitro 文件式 + 方法后缀）；`GET/POST` 具名导出 → `defineEventHandler`；44 端点逐一对照契约 |
| `src/lib/server/route-helpers.ts` + `http.ts` | 72 行 | **优先重写**：`jsonOk` / `jsonError` / `handleRouteError` 的 h3 等价层，是全量移植的地基 |
| `src/proxy.ts` | 147 行 | 评估取舍（§5 D1）：客户端 route middleware 是必需项；Nitro server middleware 仅在 SSR 模式下有意义 |
| `src/lib/server/avatar-storage.ts` | 99 行 | 平移（`@supabase/supabase-js` 框架无关） |

### 3.2 前端：Vue → Nuxt（平移 + 接线）

| Vue 资产 | 规模 | 平移改造点 |
| --- | --- | --- |
| `features/**` | 12,987 行 | **近乎零改动平移**（同 Nuxt UI 原子组件 + zod + vue-query） |
| `components/**` | 3,902 行 | 平移；`KeepAliveOutlet.vue`（199 行）需按 Nuxt 语义重写 |
| `stores/**` | 764 行 | Pinia setup store 平移（`@pinia/nuxt` 自动注册）；localStorage 持久化需 client-only 保护（§5 D1） |
| `lib/**` | 2,124 行 | `permission.ts` / `tabs-model.ts` / `format-date.ts` / `password-validation.ts` / `menu-utils.ts` 等纯函数**逐字平移**；`env.ts`（10 行）改 `useRuntimeConfig().public`；`api-client.ts`（231 行）改 baseURL 为同源 `/api` |
| `themes/**` | 480 行 | 逐字平移（纯数据 + CSS 变量覆盖） |
| `layouts/AdminLayout.vue` | 326 行 | 平移 + 接线调整（Dashboard 套件用法不变；`router.afterEach` → Nuxt 路由钩子） |
| `pages/**`（24 个） | 330 行 | 文件式路由结构**一一对应**（`(group)` 目录名 → Nuxt 的 `(group)` 保留语义一致；`notices.[noticeId].vue` → `notices/[noticeId].vue`）；`definePage()` → `definePageMeta()` |
| `i18n/index.ts`（88 行）+ `config.ts` | 109 行 | 平移为 Nuxt plugin（见 §5 D3） |
| `router/guards.ts` | 60 行 | 平移为 `middleware/auth.global.ts`（守卫语义不变） |
| `scripts/sync-locales.mjs` | — | 平移（真源仍是 React 语言包） |
| `assets/css/*`（`main.css` / `theme-transition.css` / `route-transitions.css` / `tags-bar.css` / `sign-in.css` / `fonts.css` / `color-vision.css`） | — | 平移（CSS 与框架无关） |

### 3.3 框架无关、可逐字复用

`permission.ts` 位运算 · `tabs-model.ts` · `column-setting.ts` · `password-validation.ts` · `route-access.ts` · `menu-utils.ts` / `menu-tree-utils.ts` · `format-date.ts` · `profile-links.ts` · `org-chart-layout.ts` · `directory-export.ts` · `sanitize.ts` · `crop-image.ts`（WebP 256×256）· i18n 七个命名空间 JSON · zod schema · 全部 `lib/__tests__` 纯函数用例（vitest）

### 3.4 必须新写（无现成资产）

1. **Nitro 服务端地基**：`route-helpers` h3 版、`server/api/**` 文件式路由骨架、cookie 读写适配。
2. **Nuxt 运行时接线**：`nuxt.config.ts`（module / runtimeConfig / routeRules / app.head）、`app.vue`（`UApp` + `NuxtLayout` + `NuxtPage`）、Pinia 与 vue-query 的 Nuxt plugin、i18n plugin、`initDesignTheme` 防闪烁接线。
3. **守卫与保活**：全局 route middleware；多标签页在 Nuxt 下的保活宿主机制。
4. **工程化**：ESLint（flat + `eslint-plugin-vue`）/ Prettier / vitest（`@nuxt/test-utils`）/ `.env.example` / `scripts/`（sync-locales、clean-logs、check-locales）。
5. **测试**：服务端契约冒烟脚本（见 §6 验证手段）。

---

## 4. 技术选型方案（Nuxt Modules / 内置机制优先）

> 选型原则（2026-09-12 用户指令）：存在官方 Nuxt Module 或框架内置机制的能力**一律优先采用**，不强制与 Vue 端实现方式逐字一致；内置机制无法覆盖既有行为时（如请求驱动进度条）不硬凑，选型如下表并标注理由。

| 能力 | Vue 端（基准） | **Nuxt 端选型** | 说明 |
| --- | --- | --- | --- |
| 框架 | Vue 3.5 + Vite 8（纯 SPA） | **Nuxt 4.5（模板已就位）** | 与 Next 同构的独立全栈；`server/` 在根 |
| UI 库 | `@nuxt/ui` 4.11（Vite 插件） | **`@nuxt/ui` 4.11（Nuxt module，模板已接）** | 同版本；module 自动注册组件 / composable / 样式 |
| 布局 | Dashboard 套件 | **同**（Dashboard 套件） | 组件用法不变 |
| 路由 | vue-router + unplugin-vue-router（`src/pages/`） | **Nuxt 文件式路由**（内置，`app/pages/`） | URL 结构一一对应；`definePageMeta` |
| 守卫 | 全局 `beforeEach` 三层 | **全局 route middleware**（内置，`auth.global.ts`）+ **Nitro API 鉴权**（权威） | 逻辑照抄，不改语义 |
| 状态 | Pinia 4（显式注册） | **`@pinia/nuxt` module（auto-imports）** | store 平移后免手动注册 |
| 数据请求 | `@tanstack/vue-query` + fetch 版 api-client | **同**（baseURL 改同源 `/api`） | 无官方 Nuxt module，属 Vue 库——**刻意不用内置 `useFetch` 替代**：缓存 / refetch / epoch 语义会重写，违反「行为不变」；vue-query 经 Nuxt plugin 注入 `QueryClient` |
| 表单 | `UForm` + zod（Standard Schema） | **同** | Vue 端实际未引入 vee-validate（以代码为准） |
| 表格 | `@tanstack/vue-table` 8 + `UTable` | **同（版本对齐 8.x）** | v9 与 UTable 不兼容 |
| i18n | `vue-i18n` 11 + 扁平键 `messageResolver` | **待决策 D3**（推荐 `@nuxtjs/i18n` v10，支持 Nuxt 4） | Modules 优先：`strategy: 'no_prefix'` + `vueI18n.messageResolver` 扁平键；locales JSON / sync 脚本复用；备选直用 vue-i18n plugin（与 Vue 100% 同构） |
| 主题明暗 | `@vueuse/core` `useColorMode` + 防闪烁脚本 | **`@nuxtjs/color-mode`（Nuxt UI module 内置集成，内置机制）** | 三态 light / dark / system + class 策略对齐 Vue 行为；防闪烁由模块接管，删除自研脚本 |
| 页面标题 | `composables/use-document-title`（watch 路径 + locale） | **`useHead` / `useSeoMeta`（Nuxt 内置）** | 「路径 + 语言 → 标题」语义收进响应式 computed；服务端直出标题属 Nuxt 内置能力（对齐 Next generateMetadata 体验，M5 评估） |
| 服务端 DB | — | **drizzle-orm 0.45 + postgres.js**（同 Next） | `AGENTS.md` §18.7：动手前查 `drizzle-orm` Skill |
| 认证/鉴权 | Bearer + localStorage | **待决策 D2**（推荐服务端双源 + 前端 Bearer） | `jose` + `bcryptjs` |
| 存储 | — | **`@supabase/supabase-js`**（头像中转，服务端持密钥） | 框架无关，无需 module |
| 富文本 | `@tiptap/vue-3` + starter-kit（Vue 端自装） | **`UEditor`（Nuxt UI 内置 Tiptap）** | 内置机制：免自装依赖，工具栏用 `UEditorToolbar`（Vue 端已用同款 API，平移成本低） |
| 图谱 | `@vue-flow/core` + background + controls | **同** | 懒加载 chunk；SSR 下 `ClientOnly` |
| 拖拽 | `@vueuse/integrations` `useSortable` | **`@vueuse/nuxt` module（auto-imports）** | 组织树 / 列设置 / 标签排序同源 |
| 裁剪 | `vue-advanced-cropper` | **同** | 头像 |
| Excel | `write-excel-file` 4.1.1 | **同**（锁版本） | 框架无关 |
| 图标 | `@iconify-json/lucide` + `logos` 走 `UIcon` | **`@nuxt/icon`（Nuxt UI 内置解析）+ 本地 collection `lucide` / `logos`** | collection 是 @nuxt/icon 的本地数据源（内置的是解析机制非数据）；**补装 `logos`**（品牌下拉 / 个人链接 / OAuth 共 11 处，Vue 蓝本同款）；**删模板自带的 `simple-icons`**（Vue 蓝本零使用）。SPA 模式（D1）必须配 `icon.clientBundle`（collections: lucide / logos）——否则回退 Iconify API 运行时网络请求，离线 / 网络受限即缺图标；菜单图标为 DB 动态名（`i-lucide-${icon}`），整包 collection 是唯一稳妥兜底 |
| Toast | `useToast()`（`UApp`） | **同** | — |
| 进度条 | `@bprogress/vue` + 响应式状态机 | **双轨（2026-09-12 拍板）**：路由切换进度 = Nuxt 内置 **`NuxtLoadingIndicator`**；接口请求进度 = **`@bprogress/vue`**（BProgress 无 nuxt 子包）经 `lib/progress.ts` 状态机驱动 | 呈现层与 Vue 单条进度条存在差异（路由 / 请求双指示器），属已确认口径；请求驱动不用 `NuxtLoadingIndicator` 硬凑（无法承载 api-client 事件） |
| 保活 | 原生 `<KeepAlive>` + 宿主组件 | **`<NuxtPage keepalive>` + 宿主机制** | §2.1 多标签页行 |
| 测试 | vitest + `@vue/test-utils` | **vitest + `@nuxt/test-utils`** | 纯函数用例直接复用 |
| 部署 | Vercel（静态 SPA） | **Vercel（Nitro node preset）** | ⚠️ 不可用 edge preset（`postgres` / `bcryptjs` 需 Node 运行时） |

> **自动导入口径（对应 D5）**：新写代码（`server/` / plugins / middleware / 新 composables）使用 Nuxt 自动导入惯例；从 Vue 平移的存量代码保留显式导入，降低蓝本 diff、聚焦行为审查。

---

## 5. 待确认决策（已拍板）

> **2026-09-12 用户确认：六项均按推荐方案（选项 A）执行。**目录结构原 D6（Nuxt 4 默认 `app/`）已由官方模板确定，移出决策表；D3 按用户「Modules 优先」指令翻转推荐、D5 / D6 为本次新增口径。

| # | 决策点 | 选项 A（推荐） | 选项 B | 影响 |
| --- | --- | --- | --- | --- |
| **D1** | **渲染模式** | **`ssr: false`（SPA 模式）**：与 Vue / React 行为完全一致；localStorage 持久化 store、`useColorMode`、Tiptap、VT 编排**零改造**；守卫走客户端 route middleware；Nitro 仍提供全部 server API | `ssr: true`（universal）：首屏 SSR + 服务端守门（对齐 Next 的 proxy.ts 体验）；但 auth-store / tabs-store / design-theme-store 的 localStorage 持久化、`vue-query` 水合、Tiptap、路由 VT 编排均需 client-only 化，前端改造量 +20% 且水合不一致风险上升 | **最大分叉点**。Next 端虽是 SSR 应用，但其页面数据全在客户端取，SSR 收益主要集中在「首屏 HTML + 服务端重定向」 |
| **D2** | **认证传输层** | **服务端双源（Bearer 优先 + Cookie 回退，照抄 Next `request-auth.ts`）+ 前端沿用 Vue 的 Bearer/localStorage** → 前端 `auth-store` / `api-client` **零改造**；Cookie 仍在登录/刷新时下发，为将来开启 SSR 留路 | 纯 httpOnly Cookie（对齐 Next 前端语义）：需改造 `api-client`（去 Bearer、加 `credentials`）与 `auth-store` 持久化逻辑 | 推荐方案等同于 Next 服务端**已实现**的双源能力，纯收益 |
| **D3** | **i18n 方案** | **`@nuxtjs/i18n` v10（Modules 优先，2026-09-12 指令翻转）**：`strategy: 'no_prefix'`（无 locale 前缀路由，行为与三端一致）+ `vueI18n.messageResolver` 扁平键；locales JSON / sync 脚本全部复用；hreflang / SEO 能力顺带就位 | 直用 `vue-i18n` 11（Nuxt plugin 方式）：与 Vue 端实现 100% 同构、少一层模块抽象；SEO/hreflang 不需要（四端均客户端切换） | i18n 接线方式与模块依赖面 |
| **D4** | **Drizzle schema 来源** | **逐字复制 Next 的 `schema.ts` / `relations.ts`**（同构副本）：保证与 Next 读取行为完全一致，零漂移风险 | 独立执行 `drizzle-kit pull` + `sync-pulled-schema.mjs`（同 Next 脚本） | 推荐方案与 `password-validation` 等既有「同构副本」惯例一致 |
| **D5** | **平移代码的导入风格** | **保留 Vue 显式导入**：蓝本 diff 最小、代码审查聚焦行为差异；新写代码（`server/` / plugins / middleware / 新 composables）用 Nuxt 自动导入惯例 | 全面改写为 Nuxt auto-import 风格（更贴官方惯例，但蓝本 diff 大、后续与 Vue 双端同步成本上升） | 平移效率与长期双端同步成本 |
| **D6** | **工程化口径** | **沿用模板 `@nuxt/eslint`（stylistic 承担格式化，不引入 Prettier）**——Nuxt 官方约定；补 `test` 脚本（vitest + `@nuxt/test-utils`），验收链为 `dev / build / lint / typecheck / test` | 引入 Prettier 与 react / vue / next 三端工具链完全对齐 | 工具链一致性 vs Nuxt 官方约定（模板已按 A 配置） |

> 以上 6 项均属架构级选择，按 `AGENTS.md` §18「需求优先级」规定：**不静默决策、不自选方案继续开发**。✅ **已拍板（2026-09-12）：六项均执行选项 A**。
> 模板自带资产处置（M0 内执行，不需单独决策）：演示内容（`index.vue` / `TemplateMenu.vue`）移除；`.github/workflows/ci.yml` 与 `renovate.json` 停用或按项目口径改写；`pnpm-workspace.yaml` 仅保留 allowBuilds 配置。

---

## 6. MVP 开发路线

原则：每个里程碑独立可验收、可构建（`pnpm dev / build / lint / typecheck / test` 全绿）；结束即更新 `docs/feature-matrix.md`（Nuxt 列）与 `docs/progress.md`（置顶）并按 §10 提交。提交前缀 `nuxt(Mn):`。**只动 `/nuxt` + `docs/`**。

### M0 — 工程基建与骨架（基于既有模板，不再脚手架）

模板已有资产（实测核对）：Nuxt **4.5.2** + `@nuxt/ui` **4.11**（module 已接，`compatibilityDate: 2026-06-30`）+ `@nuxt/eslint`（stylistic）+ `app/` 默认结构 + `main.css` + 演示页（`index.vue` / `TemplateMenu.vue`）+ `typecheck` 脚本（`nuxt typecheck`）。

1. **模板清理**：移除演示内容（`app/pages/index.vue` 占位业务化、删 `TemplateMenu.vue`）；处置模板自带 `.github/workflows/ci.yml` 与 `renovate.json`（停用或按项目口径改写）；`pnpm-workspace.yaml` 仅保留 allowBuilds；**图标 collection 调整**——卸载 `@iconify-json/simple-icons`（零使用）、安装 `@iconify-json/logos`（品牌图标，Vue 蓝本同款），并在 `nuxt.config.ts` 配 `icon.clientBundle`（lucide / logos，SPA 模式运行时零外部网络依赖，§4 图标行）。
2. 工程化补齐：vitest（`@nuxt/test-utils`）+ `test` 脚本；`.env.example`（含 `NUXT_PUBLIC_*` 与服务端密钥占位）。
3. **Dashboard 套件布局骨架**：`UDashboardGroup` + `UDashboardSidebar`（菜单 items 注入）+ `UDashboardPanel` + `UDashboardNavbar` + `UDashboardSearch`；折叠 / 移动端抽屉 / `⌘B` 由套件内置。
4. 文件式路由骨架（`app/pages/` 覆盖全部 24 个 URL）+ 三层守卫（`app/middleware/auth.global.ts`）+ 403/404/500 + Dashboard 占位。
5. i18n 接线（按 D3）+ `scripts/sync-locales.mjs` 从 Vue 平移（含裸 `@` → `{'@'}` 幂等转义）；语言切换生效；locales 一致性测试（§2.4）。
6. **认证最小闭环**（服务端地基 + 4 端点）：`db/client` + `schema`（按 D4）+ `server/utils/{route-helpers,auth/*}` + `/api/auth/{login,logout,refresh,me}`；前端 `auth-store` + `api-client` + 登录页（`isSafeRedirect` / rememberMe）；进度条接线（`NuxtLoadingIndicator` 路由 + `@bprogress/vue` 请求驱动，§4）。
7. 主题（`@nuxtjs/color-mode` 三态 + 防闪烁由模块接管）+ Header 操作区（Search / ThemeSwitch / LanguageSwitch / UserMenu）。

**验收**：模板清理后可运行；Nuxt UI + Tailwind v4 工作；布局为 Dashboard 套件；登录 → 守卫 → 会话恢复 → 401 refresh → 登出闭环；i18n 中英切换（含 `@` 转义场景）；错误页跳转正确；`dev / build / lint / typecheck / test` 全绿。

### M1 — 服务端全量移植（Nuxt 特有主战场）

- 顺序：`route-helpers` h3 等价层 → 业务 service 逐文件平移（`permissions` → `dict` → `menus` → `roles` → `users` → `logs` → `posts` → `depts` → `notices` → `notifications` → `account`）→ 对应 `server/api/**` 端点 → `password-policy` → `avatar-storage` → 脚本（`clean-logs` / `check-locales`）。
- 逐端点核对 `nest/openapi/openapi.yaml`（v1.9.0）：路径、方法、信封、错误码、分页结构。
- 不回改业务规则：`token_version` 实时校验、软删、日志 action 命名、`super_admin` 保护（`PUT /roles/{id}/menus`、`DELETE /roles/{id}` → 403 `SUPER_ADMIN_ROLE_PROTECTED`）逐行比对移植。
- 中间件按 D1 决策接线（客户端守卫必需；Nitro server middleware 视 SSR 决策）。

**验收（硬性）**：44 端点与契约一致；**契约冒烟脚本**——用同一账号 token 分别请求 Nuxt 与 Nest（或 Next）的同名端点，对响应 JSON 做结构/字段级 diff（忽略时间戳等易变字段），差异为零或已记录。

### M2 — 核心系统管理六模块

- 顺序：用户（首立 DataTable / Drawer 表单 / ConfirmDialog 范式）→ 角色 → 权限 → 菜单 → 字典 → 日志。
- 同步落地：DataTable 组合件、`list-store` + epoch 策略（含契约测试）、`hasPermission` 按钮门控（写保护三层口径）。
- **测试策略**：`lib/__tests__` 纯函数用例从 Vue 平移（permission / tabs-model / route-access / format-date / password-validation / column-setting / list-store）；组件测试用 `@nuxt/test-utils` 按需补；**无覆盖率硬性要求**（沿用 Vue 口径）。

**验收**：六页与 React 对齐（列表三态、URL 状态、权限门控、super_admin 403 文案）；vitest 全绿；与 React 并排走查。

### M3 — 组织中心 + 我的账户

- 顺序：组织管理（拖拽排序）→ 岗位（成员穿透）→ 通讯录（`?deptId=` URL 双向同步）→ 公告管理（Tiptap + 三粒度范围 + 催读）→ 我的公告 + 站内信（铃铛 / 未读数 / 60s 轮询）→ 架构图谱（vue-flow）→ Excel 导出 → 我的账户（双 Tab 六卡 + 头像裁剪上传闭环）。
- **验收**：图谱四交互；导出样式对齐（品牌蓝表头 / 斑马纹 / 冻结首行）；公告 HTML 与 React 互发渲染一致；头像上传后全局刷新；`?deptId=` 与 `?noticeId=` 直链可复现。

### M4 — 增强特性与收尾

- 偏好设置 9 项全量（`design-theme-store` 单一真源 + 揭示动画）。
- 多标签页（Nuxt 保活宿主机制）+ 标签「刷新」+ 拖拽排序（useSortable）+ 页面切换 VT 编排 + 导航方向感知。
- DataTable 列设置全量接入（10 个列表页）+ **首屏骨架行**（§2.4）。
- 命令面板对齐 React `collectMenuSections` 语义（分组拍平 + `searchText` + 自建主题组）。
- **行为级对齐收尾（§2.4）**：键盘可达性（标签关闭热区 Enter / Space、Shift+F10 菜单——合成派发链路浏览器冒烟）、公告详情 `syncMeta`（标签具体标题 + 面包屑两级）。
- **验收**：偏好全项即时生效 + 刷新持久 + 重置复原；标签保活 / 关闭销毁 / 刷新重建 / 键盘可达；列设置持久与重置；`⌘K` 唤起。

### M5 — 部署与文档收尾

- Vercel 部署 `nuxt.baiwumm.com`（Root Directory = `nuxt`；Nitro **node** preset，非 edge）；环境变量按 `.env.example` 配置（`DATABASE_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET` / `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `NUXT_PUBLIC_*`）。
- 根 version 同步 + `pnpm sync-versions` + git tag。
- 文档：`feature-matrix.md` Nuxt 列全量更新（Dashboard 保持 ❌ + 统计口径修正）；`mechanisms.md` 增补 Nuxt 期机制结论；`progress.md` 置顶；`AGENTS.md` §19 阶段指针更新。

**验收**：线上冒烟（登录 → 模块走查 → 暗色 / 英文 → 头像上传）；统计与实际一致。

---

## 7. 风险与工作量评估

| 风险 | 概率 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| **服务端移植量大**（~8,900 行 / 44 端点 / 17 表） | 高 | 工期 | 框架耦合仅 4 文件 22 处；先做 `route-helpers` 地基；按 service 粒度逐个平移 + 契约 diff 脚本兜底 |
| **Next → Nitro 运行时差异**（`NextRequest` / `NextResponse` → h3 `H3Event`） | 中 | 中 | 适配面收敛在 `route-helpers` / `cookies` / `request-auth` 三处；Web 标准 `Request`/`Response` 部分可直接复用 |
| **共库写入一致性**（与 Next / Nest 操作同一 PostgreSQL） | 中 | **高** | 移植**不改业务规则**；逐行比对日志 action 名、`token_version`、软删、事务边界；以 React / Next 行为为验收基准 |
| **SSR 与 localStorage 冲突**（若选 D1-B） | 中 | 高 | 默认推荐 `ssr: false`；若开 SSR，则 auth / tabs / design-theme 三 store 与 VT 编排全部 client-only 化并逐页验证水合 |
| **Node 专属依赖在 Serverless 的运行** | 低 | 中 | `postgres` / `bcryptjs` / `@supabase/supabase-js` 需 Node 运行时 → Nitro **vercel** preset（禁用 edge） |
| **Nuxt UI module 与 Vue Vite 插件行为差异** | 中 | 低 | 同版本 4.x；主题策略不移植 token；`.nuxt/ui/*.ts` 主题文件作为 slot / variant 事实来源（skill 规则 3） |
| **富文本 / 图谱 / VT 的 SSR 或水合问题** | 中 | 低 | Tiptap、vue-flow 懒加载 + `ClientOnly`；VT 编排仅在客户端注册 |
| **包体积与冷启动**（Nitro bundle） | 低 | 低 | 按需懒加载（图谱 / Tiptap / Excel 已有动态导入惯例） |
| **`feature-matrix.md` 统计口径漂移** | — | 低 | **已修正（2026-09-11，Vue M4 文档收尾）**：矩阵统计口径按行重算为 **27 项**（基础设施实为 10 行），四端完成率同步重算 |

### 工作量分布（相对）

| 阶段 | 相对占比 | 主要依据 |
| --- | --- | --- |
| M0 骨架 + 认证最小闭环 | ~15% | 新写接线约 1,100 行 + 服务端地基 |
| M1 服务端全量移植 | **~45%** | 8,900 行（Next 蓝本） |
| M2 核心六模块 | ~15% | 前端平移为主（features 12,987 行中约 1/3） |
| M3 组织中心 + 账户 | ~15% | 服务端 notices / posts / depts 合计 2,390 行 |
| M4 增强特性 | ~10% | 多标签页 / VT / 列设置 / 命令面板 / 偏好 |
| M5 部署与文档 | ~5% | — |

---

## 8. 范围外（本次不做）

1. **Dashboard 概览页实现**——各端均未实现，按 `plan-dashboard-playground.md` 统一立项（图表库已定 Recharts，四端色值对齐方案需共同评审）。
2. **Playground 演示场**——同上，统一立项后排期。
3. **任何 NestJS / Nuxt 之外的契约或 Schema 变更**——契约变更须先行评审。
4. **React / Next / Vue 三端的修改**——契约或行为对齐问题先在本文档登记，经评审后由对应端处理。（原登记的 React 架构图谱 `view-transition-name` 回归已在 `3939abe` 修复，2026-09-12 核对闭环。）

---

## 9. 验收标准（整体）

1. **功能**：§2 清单 27 项中 26 项与 React 对齐（Dashboard 保持占位 ❌），且 **§2.4 行为级对齐项随所属里程碑落地**；`docs/feature-matrix.md` Nuxt 列如实更新。
2. **契约**：44 个端点与 `openapi.yaml` v1.9.0 逐字一致（含 v1.9.0 `SUPER_ADMIN_LAST_PROTECTED` 守卫语义）；契约冒烟脚本差异为零或已记录。
3. **UI**：与 React 并排走查（页面结构 / 布局骨架 / 交互顺序 / 响应式 / 明暗 / Loading-Empty-Error 三态）；组件视觉为 Nuxt UI 默认风格。
4. **工程**：`pnpm dev / build / lint / typecheck / test` 全绿；无 `any` 绕过；ESLint 无 error；Nuxt API 用法经 llms-full.txt 指南查证（§1）。
5. **部署**：`nuxt.baiwumm.com` 线上冒烟通过；环境变量不泄漏密钥。
6. **一致性**：与 Nest / Next / Vue 共用同一数据库，四端数据行为一致（写操作行级规则逐项验证）。
