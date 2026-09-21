# Better Admin 阶段性进度记录

> **新条目追加在最上方（按时间倒序）**；条目中引用的 § 章节号（如 §7.2）指 `AGENTS.md` 对应章节，`§x.y` 指对应设计文档自身章节。

### Playground 追加「加载动画」演示页：React 基准 + Next 对齐（2026-09-21）

- **范围**：第 9 个演示页 `/playground/loaders`——vendor beUI（MIT）registry 的 `loader` 组件（快照来源 https://beui.dev/r/loader.json ），单组件 **17 种加载动效变体**（spinner / dots / bars / dot-matrix / dither / morph / comet / scramble / metaballs / newton / helix / percent + ASCII 系 5 种）。React 基准 `d12f190`（用户 GUI 走查通过）→ 本轮按基准平移 Next 端。**零新依赖**：`motion@13.2.0` 两端均已随 Playground Phase B 引入。
- **页面形态**：两区块共享 size / speed——① 变体墙 17 卡（xl 5 列、卡片 `min-h-24` 随 size 撑开而非写死行高，6 列在 size=96 时 percent 变体横向溢出）；② 参数调试（17 个变体选择钮 + 中央 `DemoStage` 大号实时预览）。变体名属技术专名保留英文不译，与主题切换动画页同口径。
- **关键机制**：① ⚠️ **motion 对「循环中」的动画不应用新的 transition**——speed 变化须靠 `key={speed}` 重挂载才能重启（卡片与预览各一处）；② 尺寸全由单一 `size` 派生（笔画 / 间距 / 字号按系数计算）、着色一律 `currentColor`，故跟随组件所在上下文主题色；reduced-motion 下 transform 一律降级为缓慢透明度呼吸，ASCII 系（按帧换字，不属屏动）改为 2.5 倍减速而非停摆；③ morph 以 24 点同构采样生成命令结构一致的 SVG path、逐点 tween `d`（clip-path polygon 在 framer 下不可靠插值），每形状连续采样两次形成「成形后停留」再 morph，旋转 / 缩放只在 morph 段变化。
- **vendor 本地改动仅三处**：`cn` 改自 `@heroui/react` 导入、`EASE_IN_OUT` 自上游 `lib/ease.ts` 内联（避免整份工具文件入库）、Next 端加回 `"use client"`（React 端移除）。
- **端差异**：Next 与 React 源码逐行一致（`diff` 只有 `"use client"` 头 + vendor 注释措辞 + `meta.source` 路径三处）；Next `lib/route-title.ts` **不登记**——本页是菜单路由，标题与图标来自菜单树（与主题切换动画页口径一致，该表只兜底非菜单路由）。
- **菜单与 i18n**：共用库幂等脚本 `apps/nest/scripts/migrate-menus-add-playground-loaders.ts`（父 `menu.playground`、icon `loader-circle`、sort 5 排主题切换动画之后、permissions 0n、super_admin 补全量位；重复执行不重复插入）。i18n 8 键（`menu.playground.loaders` + `features.playground.loaders.*` 7 键）以 React 为真源同步 Next，`check-locales` 校验一致。
- **验证**：React `tsc` 零错误 / eslint 0 error / `check-locales` 通过（14 文件）/ vitest 8 文件 93 用例，**用户 GUI 走查通过**；Next `tsc --noEmit` 零错误 / eslint 0 error（3 条既有 warning 不在本轮文件）/ `next build` 成功（`/playground/loaders` 已入路由表）/ `check-locales` 一致，**GUI 走查待用户本地确认**。
- **待办**：Vue / Nuxt 端尚未对齐，菜单四端共用故点入 404 属预期；feature-matrix 该行 Vue / Nuxt 暂标 🔧（仅指本页，前 8 页四端仍 ✅）。

### 角色关联用户 + 成员抽屉分页对齐 Nuxt 端（2026-09-21，功能四端 100% 收尾）

- **范围**：Vue 验证通过后用户拍板对齐 Nuxt 端（四端最后一端）。Nuxt 为独立全栈，server 侧与前端同步补齐；语言包经 `sync-locales`（pretest/prebuild）自动同步。
- **server 端**：`roles-service` 增 `RoleReaderView` / `RoleView.userCount` / `readers`，`listRoles` 组装 `loadUserCountsBatch` + `loadReadersBatch`（窗口函数 raw SQL；postgres.js 驱动 `db.execute` 直接返回行数组，`result as unknown as T[]` 映射对齐端内 notices-service 模式）；`listRoleUsers` 照 Nest `findUsers` 平移；从 `posts-service` 导出 `employedUserFilter` / `loadDirectoryExtras` / `toDirectoryEntryView` 复用（同 Next 端处理）；新路由 `server/api/roles/[id]/users.get.ts`（SEARCH 位，`jsonList`，模式照 posts members route）。
- **前端**：`api-types` 加 `RoleReader` / 扩展 `Role`；`role-api` 加 `fetchRoleUsers`；新建 `RoleMembersDrawer.vue`（USlideover + description 副文案 + footer UPagination，pageSize=20、关闭重置页码、isPlaceholderData 降透明 + Spinner 反馈）；`PostMembersDrawer.vue` 分页化重写（与角色抽屉同构）；`RolesPage.vue` description 后插 readers 列（UAvatarGroup children 按视觉正序 `[头像正序..., +N]` 传——沿用 Vue 端 §走查修正结论，+N 点击/键盘可达性挂 UAvatar）+ 抽屉接线；公告 `NoticesPage.vue` readers 列同款 UAvatarGroup。端风格差异：Nuxt 文件单引号无分号，全部以 Nuxt 版打底精准套用（未整文件覆盖）。
- **验证**：`typecheck` / `lint`（`@stylistic/quote-props` 6 error 经 `eslint --fix` 修复：对象含 `aria-label` 等引号键时全键须引号）/ `test`（10 文件 99 用例）/ `build` 四绿。运行时冒烟（构建产物 + `source .env` 供 DATABASE_URL，3005）：`GET /api/roles` 六角色 userCount + readers 与 Nest 端逐项一致（普通员工 104），`GET /roles/:id/users` 分页正确（部门主管 total=15、deptPath 回填）、404 `ROLE_NOT_FOUND`。GUI 走查待用户本地确认。
- **契约冒烟脚本备注**：`scripts/contract-diff.mjs` 依赖 admin 密码登录（CONTRACT_USER/CONTRACT_PASSWORD env 可覆盖），本共享库 admin 密码已变更且脚本未接 demo-login，本轮以逐接口 curl 冒烟替代；后续如需跑全量契约 diff，先解决凭据注入。

### 修正 Vue 端头像组 +N 位置（走查反馈，2026-09-21）

- **现象**：用户走查 Vue 端角色列表截图反馈「+N」显示在头像**前面**（左），React 端在尾部。
- **根因**：上一条目里「children 须按 `[+N, 倒序头像]` 传入」的推演错了一层——UAvatarGroup 组件内部会先对 children 做 `.reverse()` 再以 `flex-row-reverse` 渲染，**双重反转后视觉顺序恰等于 children 传入顺序**；我自行做了一次 reverse，等于把顺序翻回去了。
- **修复**：角色列与公告已读人员列 children 统一改按视觉正序 `[头像正序..., +N]` 传入（去掉手写 reverse，+N 移到数组末尾），注释同步订正。
- **验证**：`type-check` / `lint`（0 error）/ `test`（101 用例）/ `build` 四绿；视觉形态待用户复核。

### 角色关联用户 + 成员抽屉分页 + AvatarGroup 对齐 Vue 端（2026-09-21，消费 Nest 接口）

- **范围**：Next 验证通过后用户拍板对齐 Vue 端。Vue 消费 NestJS API（v1.13.0 已就绪），本轮仅动前端；语言包经 `sync-locales`（pretest/prebuild 挂载）从 React 端自动同步（5 新键），零手工。
- **组件换型（Nuxt UI v4 等价件，API 均经端内 `node_modules/.nuxt-ui/ui/` 主题与组件源码取证）**：HeroUI `AvatarGroup.Count` → **UAvatarGroup + 自绘 `+N` UAvatar**——组内置计数基于默认 slot 的 children 数（服务端只回 3 个不会触发），且组根是 `flex-row-reverse justify-end`，children 须按 `[+N, 倒序头像]` 传入才渲染为视觉 `[头像正序..., +N]`；角色列 +N 的点击/键盘可达性直接挂 UAvatar（attrs 透传）。HeroUI `Drawer` → **USlideover**（端内既有抽屉件）：`title` + `description`（总数副文案，加载完成且非空才显示）+ `#footer` 分页；HeroUI `Pagination` + 自算页码 → **UPagination**（`:page`/`:total`/`:items-per-page`/`:sibling-count`，内置省略号，无需 getPageItems）；USlideover 主题类是 utilities 层（§32 结论），footer 内 `class="justify-center"` 直接生效，无 React 端 §33 的未分层覆盖问题。
- **文件**：`lib/api-types` 加 `RoleReader` / 扩展 `Role`；`role-api` 加 `fetchRoleUsers`；新建 `RoleMembersDrawer.vue`（pageSize=20、关闭重置页码、isPlaceholderData 降透明 + Spinner 反馈）；`RolesPage.vue` description 后插 readers 列（+N 点击 + Enter/空格键盘可达）+ 抽屉接线；`NoticesPage.vue` 已读人员列同款 UAvatarGroup（纯展示）；`PostMembersDrawer.vue` 分页化重写（与角色抽屉同构，去原底部关闭按钮对齐 React 形态——USlideover 自带右上角 close）。
- **Vue 端既有模式跟随**：列 cell 里 h() 的组件引用走文件底部 `resolveComponent` 声明（RolesPage 为 UAvatar/UAvatarGroup 补声明时初版误用自动导入标识符，vue-tsc TS2304 揪出——端内 unimport 不覆盖 h() 中的裸标识符，须显式 resolveComponent）。
- **验证**：`type-check` / `lint`（0 error）/ `test`（10 文件 101 用例）/ `build` 四绿；server 无改动（直连 Nest）。GUI 走查（角色 +N 抽屉翻页 / 公告与岗位堆叠视觉）待用户本地确认。

### 角色关联用户 + 抽屉分页 + HeroUI 3.2.6 同步 Next 端（2026-09-21，React 基准平移）

- **范围**：用户验证 React 端通过后拍板「同步 Next，Vue / Nuxt 不动」。Next 端本轮补齐三块：①契约 v1.13.0 关联用户功能（此前仅语言包先行）；②HeroUI 3.2.6 + AvatarGroup 两列；③两个成员穿透抽屉分页化。
- **依赖**：`@heroui/react` / `@heroui/styles` 3.2.5 → 3.2.6、`react-aria-components` 1.20.0 → 1.21.1（与 React 端同批，peer 要求）。
- **server 端**（Next 独立全栈，必须自带实现）：`roles-service` 增 `RoleReaderView` / `RoleView.userCount` / `readers`，`listRoles` 组装 `loadUserCountsBatch`（drizzle groupBy）+ `loadReadersBatch`（窗口函数 raw SQL）——⚠️ 端差异：postgres.js 驱动的 `db.execute` 直接返回行数组，映射写 `result as unknown as T[]`（对齐端内 notices-service 同款），不是 Nest pg 驱动的 `result.rows`；`listRoleUsers` 照 Nest `findUsers` 平移。跨模块复用改为从 `posts-service` 导出 `employedUserFilter` / `loadDirectoryExtras` / `toDirectoryEntryView`（Next 端无集中 org-views，各 service 自持——本条是首次跨 service 导入，取「导出共享」而非复制 ~150 行）。新路由 `app/api/roles/[id]/users/route.ts`（SEARCH 位，`jsonList` 包装，模式照 posts members route）。
- **前端**：`api-types` 加 `RoleReader` / 扩展 `Role`；`role-api` 加 `fetchRoleUsers`；`role-members-drawer` / `post-members-drawer` 直接从 React 最终版平移（加 `"use client"` 头，无 Next 特有依赖）；`roles-page` 以 Next 版打底精准套用六处改动（import / state / readers 列 AvatarGroup / 依赖数组 / JSX 挂载——Next 版有 `@bprogress/next` 的 useRouter 等自有依赖，不全量覆盖）；公告 `notices-page` readers 列同 React 版改 AvatarGroup。语言包上轮已同步（check-locales 校验一致）。
- **验证**：lint 0 error / `tsc --noEmit` 通过 / `next build` 成功 / check-locales 一致；dev 冒烟（3100）：`GET /api/roles` 六角色 userCount + readers 与 Nest 端数据逐项一致（普通员工 104），`GET /roles/:id/users` 分页正确（部门主管 total=15、deptPath 回填）、不存在 id 404 `ROLE_NOT_FOUND`。GUI 走查待用户本地确认。

### HeroUI 3.2.6 + AvatarGroup 两列 + 双抽屉分页对齐（2026-09-21，React 端）

- **背景**：用户走查角色关联用户功能后三项反馈：①升级 HeroUI 至 3.2.6 并改用新增的 `AvatarGroup` 组件（角色「关联用户」与公告「已读人员」两列同步）；②关联用户抽屉一次拉 50 条看不到全量，加分页；③抽屉内「共 N 名」随名单滚动，移到 Header。用户确认岗位管理「在职人数」穿透抽屉与之同构，一并同步。
- **依赖升级**：`@heroui/react` / `@heroui/styles` 3.2.5 → **3.2.6**（精确锁版）；按 v3.2.6 release notes 的 peer 要求同步 `react-aria-components` 1.20.0 → **1.21.1**（`@internationalized/date@3.12.4` 已显式声明满足新 peer）。⚠️ `heroui agents-md --react` 拉取的 `.heroui-docs` 索引仍停在 3.2.4 文档（无 avatar-group / releases v3-2-6），AvatarGroup API 以官方站 + `node_modules` 内 `.d.ts` / 源码取证为准。
- **AvatarGroup 替换手写堆叠**（`roles-page.tsx` / `notices-page.tsx`）：`AvatarGroup max={3} size="sm"` + 显式 `AvatarGroup.Count` 渲染 `+N`（总数服务端已知场景，Count 不受 max 截断，替代 v2 的 total prop）；角色列的 Count 透传 `onClick` + `role="button"` + `tabIndex` + Enter/空格（源码确认 props 落到底层元素），键盘可达；去掉手写 `-space-x-2` 与 `ring-2`（clip 月牙遮罩为库默认，用户已验收）。
- **双抽屉分页同构**（`role-members-drawer.tsx` / `post-members-drawer.tsx`）：一次拉 50 → 服务端分页 `pageSize=20`（全站枚举档位）；「共 N 名」移入 `Drawer.Header`（标题副标题模式，对齐 role-grant-drawer）；分页入 `Drawer.Footer`，页码序列复用 DataTable 的 `getPageItems`（带省略号），多于一页才渲染 Footer；关闭抽屉重置回第 1 页；翻页反馈用 `isPlaceholderData`（keepPreviousData 显示旧页期间）列表降透明 40% + 禁点 + 居中叠加 Spinner。
- **坑与沉淀（→ mechanisms §33）**：分页居中最初怎么都不生效——`drawer.css` / `pagination.css` 是**未分层 CSS**（`.drawer__footer` 的 justify-end、`.pagination` 的 w-full + justify-between、`.pagination__content` 的 self-start 全部压过 utilities 层）；且 `.pagination` 根 `w-full` 使 Footer 的 justify 无效、`<sm` 断点 nav 纵向时水平位置由 content 的 `self-*` 决定。终态：`<Pagination className="justify-center!">` + `<Pagination.Content className="self-center!">` 双 important 后缀。§29 的「工具类无条件覆盖」仅对 layer 内组件（button 等）成立，覆盖前先查目标 CSS 是否在层内。
- **验证**：`tsc` / eslint（0 error）/ vitest（8 文件 93 用例）/ `build` 全绿；角色抽屉分页居中与翻页反馈经用户本地 GUI 验证通过（岗位抽屉与角色抽屉代码同构，待走查）。

### 角色管理「关联用户」列 + 名单穿透（契约 v1.13.0，React + Nest 先行，2026-09-20）

- **需求与方案**：用户要求角色列表新增「关联用户」列，展现形式对齐公告管理「已读人员」（头像堆叠最多 3 个 + `+N`），并追加拍板：点击 `+N` 弹出抽屉查看完整名单，交互参考岗位管理「在职人数」穿透；排序口径取 `user_roles.created_at DESC`（最近分配的 3 个）；只在列表接口回填（详情不带）；分步实施——本轮 Nest + React，验证通过后 Vue / Next / Nuxt 逐端对齐。
- **契约（v1.12.0 → v1.13.0）**：`Role` schema 新增 `userCount`（关联用户总数，仅在职且未删除）与 `readers`（`RoleReader[]`，形状对齐 `NoticeReader`：`{id, name, avatar}`）；新增 `GET /roles/{id}/users` 分页端点（`x-permission: SEARCH`，响应 `data` 为 `DirectoryEntry[]`，404 `ROLE_NOT_FOUND`，`pageSize` 枚举同全站 10/20/30/40/50）。
- **Nest**：`roles.service` 新增 `loadUserCountsBatch`（`COUNT GROUP BY role_id`，`innerJoin users` 挂 `employedUserFilter`）与 `loadReadersBatch`（窗口函数 `PARTITION BY role_id ORDER BY ur.created_at DESC` 取 3，写法对齐 `notice.service.loadReadersBatch`；过滤条件为 `employedUserFilter` 的 SQL 形态）——列表整页恒定 2 组批量查询，无 N+1；`findUsers` 照 `posts.service.findMembers` 平移（`loadDirectoryExtras` 回填 deptPath）。控制器加 `@Get(':id/users')`（`SEARCH` 位）+ `RoleUsersQueryDto`。
- **React**：`roles-page` 在「描述」后插入 `readers` 列（头像堆叠写法照公告列，`+N` 包 `<button>` 承接点击）；新建 `role-members-drawer.tsx`（照 `post-members-drawer`：`useOverlayState` + 右侧 Drawer，一次拉前 50 名 + 顶部总数，loading/error/empty 三态）；`role-api` 加 `fetchRoleUsers`；`api-types` 加 `RoleReader` 并扩展 `Role`；语言包 6 键 × 2 语言（zh-CN / en），`check-locales` 强制同步至 Next 端语言包（Next 功能本体待后续对齐）。
- **验证**：Nest `tsc` / `lint` / `build` 三绿；React `tsc` / `lint` / `test`（93 用例）/ `build` / `check-locales` 全绿。运行时冒烟（watch 实例自动重编译后 curl）：`GET /roles` 六角色全部带回 `userCount`（普通员工 104）与 `readers`（最近 3 人）；`GET /roles/{id}/users` 分页正确（部门主管 total=15 与列表 userCount 一致、deptPath 回填、createdAt 降序）；不存在 id 返回 404 `ROLE_NOT_FOUND`；非法 `pageSize` 返回 `VALIDATION_ERROR`（枚举与契约一致）。GUI 走查（列表新列 + 点击 +N 抽屉）待用户本地验证。
- **待办**：Vue / Next / Nuxt 三端逐端对齐（Next 语言包已先行同步；Nuxt 端注意其 server 侧需同步 `roles-service` 的列表字段与新端点）。

### 修复概览页 vccs 依赖 CJS 直链导致的整页崩溃（decimal.js-light / eventemitter3，2026-09-20，遗留问题次日继续）

- **现象**：用户登录提示成功后 toast 同时报 `The requested module '.../decimal.js-light/decimal.js' does not provide an export named 'default'`，无法进入概览页。根因链：概览页是首个加载 nuxt-charts 的页面 → 其 vccs 引擎（Recharts 的 Vue 移植）的依赖在 **pnpm 虚拟目录下被 Vite dev 以 CJS 原文件 `@fs` 直链 serve**——decimal.js-light 的 `browser` 字段指向 CJS 的 `decimal.js`（Vite mainFields 默认 browser 优先），eventemitter3 的 exports `import` 条件未被 optimizeDeps esbuild 匹配而回退 CJS `main`——浏览器原生 ESM 拿不到 default 导出，模块加载崩溃即整页崩溃。
- **为什么 nuxt-charts 自带修复无效**：模块把 `vccs / motion-v / vccs > eventemitter3` 加进 `optimizeDeps.include`，但 pnpm 严格布局下这些条目 Nuxt 解析失败（警告 `NUXT_B7002`，提示「Report entries added by a Nuxt module to the module author」），且清单本身漏了 decimal.js-light。
- **修复**（`nuxt.config.ts`）：alias 把两包精确指到 ESM 入口（decimal.mjs / index.mjs），使其被 Vite 识别为可预打包 ESM，import 重写到 `.cache/vite/client/deps/*` chunk。实现要点：①两包是传递依赖，顶层无符号链接，须从 `.pnpm` 下 vccs 的实际安装位置按「包与依赖同层」拼路径；②nuxt-charts 的 exports 未暴露 `./package.json`，不能 `require.resolve('nuxt-charts/package.json')`；③解析任何一步失败都保持 alias 为空——config 顶层抛错会让 dev server 直接 500（本轮实测踩过）。另给 DashboardPage 加 `mounted` 门闩 + `enabled: mounted`（对齐 Next 端「SSR 恒输出骨架」先例：SPA 模式下避免初始渲染期加载图表依赖树，顺带保证 mounted 前不发 stats 查询）。
- **验证**：curl Vite 转换产物确认 arithmetic.mjs 的 `import Decimal from` 与 events.mjs 的 `import EventEmitter from` 均重写到 `deps/*.js` ESM chunk；浏览器实测（3002 验证实例，demo-login）概览页全区块渲染成功——欢迎横幅（问候/日期/天气/快捷入口）、KPI 4 卡（环比 badge ↓46.2%）、登录趋势 AreaChart（近 7 日 7 点序列 + **y 轴整数刻度 0/7/14/21/28**，与手写版量程口径殊途同归）、角色占比 DonutChart（6 扇区 + 圆心 151 成员总数 + 带值图例）、最近动态 7 条（**「前天 / 3天前」同时验证 format-date 修复**）、最新公告 5 条；lint / typecheck 恢复全绿。
- **遗留**：①本端 dev 实例与用户 3001 进程共写 `.nuxt` / vite 缓存目录，并行互踩会导致 worker 崩溃页（刷新恢复），验证完已停掉验证实例；②`vccs > xxx` 嵌套 include 语法在 pnpm 下不生效属 nuxt-charts 模块 bug，升级模块版本后可尝试删掉本端 alias 还原简洁配置；③**自动化环境实测概览页全区块渲染通过后，用户本地 GUI 走查仍见问题（细节待用户提供），已提交当前修复基线，次日继续排查调整**。

### 修复两端 format-date「天」档换算笔误（2026-09-19）

- **背景**：上条 Vue 端对齐条目中备案的既有缺陷——`apps/vue/src/lib/format-date.ts:41` 的 `day` 间隔误写为 `24 * 24 * 60 * 60 * 1000`（React 基准为 `24 * 60 * 60 * 1000`），「1~24 天」的时间差全部落到 hour 档（概览页最近动态显示「50小时前」，React 基准显示「前天」）；`apps/nuxt/app/lib/format-date.ts:41` 同源同值，备案明确「Nuxt 做 Dashboard 时会同样偏」。
- **修复时机**：本轮进入 Nuxt 端 Dashboard 开发，触发备案条件；且 Vue 端 Dashboard 待 GUI 审核中，该偏差在最近动态卡直接可见。两端各改一行，`unit: 'day'` 的 `ms` 改为 `24 * 60 * 60 * 1000`，行为对齐 React 基准（`numeric: 'auto'` 下「前天 / 3天前 / 2 days ago」恢复正常）。
- **影响面**：`formatRelativeTime` 被公告列表、铃铛、最近动态等页面共用，此修对全部调用点一致生效；无键值/签名变化。
- **验证**：Vue `test` 10 文件 106 用例、Nuxt `test` 10 文件 99 用例复跑全绿。

### Nuxt 端 Dashboard 概览对齐 React 基准（契约 v1.12.0 + nuxt-charts 3.0.0，2026-09-19）

- **背景**：Vue 端 Dashboard 审查通过后，用户确认进入 Nuxt 端开发，并拍板图表方案——Nuxt 用 `nuxt-charts`（评估见会话：v3.0.0 MIT，底层 vccs 为 **Recharts 的非官方 Vue 移植**，与 React 基准同源；Vue 端维持手写 SVG 不引入 vue-chrts，其 Unovis 引擎与两端不同源且硬依赖 proj4/d3-geo/@turf 地图组件）。库为用户明确指定的 §21 评审引入，**锁精确版本 3.0.0**（§15）。
- **服务端**：`server/lib/stats-service.ts` 逐字平移 Nest `stats.service.ts`（v1.12.0 无参 `fetchStatsOverview()`；UTC+8 日界补 0、KPI 近 7 日 / 趋势固定 30 日、角色环形联表、公告 ≤5 / 动态 ≤10）+ `server/api/stats/overview.get.ts`（`requireAuthUser` 无权限位，与 Nest「无 @Permissions 即放行」口径一致；`jsonOk` 包装）。**本端 schema 时间列为 `mode:'string'`**，drizzle 比较 统一改传 ISO 串（同 notices-service 既有写法），语义与 Nest 的 Date 比较恒等。
- **前端**：`app/lib/api-types.ts` 追加 Stats 六类型（与 Vue 端同注释口径）；`app/features/dashboard/` 九文件与 Vue 端同构——DashboardPage / WelcomeBanner / KpiCard / RecentActivityCard / LatestNoticesCard 直接平移（Nuxt UI 组件同款），**两处图表换 nuxt-charts**：登录趋势 `AreaChart`（`curveType: CurveType.MonotoneX` 对齐 recharts monotone；渐变面积/主色/弱网格/毛玻璃 tooltip 为组件默认，不传系列色即回落 `--vc-series-0` = `--ui-primary`；高度 `useElementSize` 实测传像素，宽度组件自适应）、角色占比 `DonutChart`（`padAngle 2°` 对齐 paddingAngle；`arcWidth` 按容器实测换算 30% 厚度对齐 `innerRadius="70%"`；圆心成员总数走 default slot；图例自绘带数值）；语言包 65 键经 `sync-locales` 自动同步（pretest/prebuild 已挂）。
- **nuxt-charts v3 关键事实**（包内取证，官网 403 且 README 仍是 v2 旧文）：`theme.css` 原生以 `--ui-*` / `.dark` 对接 Nuxt UI token；类型（`BulletLegendItemInterface` 等）与 `CurveType` 枚举经模块 `addImportsSources` **自动导入**，勿从 `nuxt-charts` 手动 import；`xFormatter` 语义在直角坐标轴传 tick 值、Candlestick 传索引——本端写成两者兼容（整数索引查序列，其余透传）；渐变 id 由组件内部 `useId()` 管理，无 Vue 端 KpiCard 那类撞 id 问题。
- **配色决策**：环形图分段**不逐段指定颜色**，回落 `--vc-series-0..N`（--ui-primary/secondary/success/info/warning/error 等分类色 token，暗色自动适配）——符合 §21「直接使用 Nuxt UI 默认 Design Tokens」；React 端「主色色相轮转」为 HeroUI 侧等价决策，两端视觉语义（多色分类色、深色可辨）一致。KPI sparkline 仍手写 SVG（三端同口径，React 端本就不依赖 recharts）。
- **验证**：`lint` / `typecheck` / `test`（10 文件 99 用例，新增 sparkline-geometry 4 例）/ `build` 四绿；**运行时 GUI 走查与双端契约冒烟（`scripts/contract-diff.mjs` 需 Nuxt+Nest 双服务在线）未执行**，服务端正确性目前由「与 Nest 逐字同构 + typecheck」保证，待走查一并验收。
- **文档**：`feature-matrix.md` Dashboard 行 Nuxt ❌→✅（27 项四端全对齐）+ Nuxt 统计注释；本条目与 format-date 修复条目。

### Vue 端 Dashboard 概览对齐 React 基准（契约 v1.12.0，2026-09-19，未提交待审核）

- **背景**：用户指示「概览页 React / Next 两端已开发完，按 React 基准开发 Vue 端，组件尽量用 Nuxt UI 内置，Nuxt 先不要改，改完先不提交等审核」。纯对齐，无契约变更、无新增功能。
- **落地文件**（`apps/vue/src/features/dashboard/` 九文件 + 三处接线）：`DashboardPage.vue`（整页：单查询 key / 骨架 / 错误重试 / stagger 编排）、`WelcomeBanner.vue`、`KpiCard.vue`、`LoginTrendChart.vue`、`RoleDistributionChart.vue`、`RecentActivityCard.vue`、`LatestNoticesCard.vue`、`stats-api.ts`、`chart-geometry.ts`；接线为 `lib/api-types.ts` 追加 `StatsOverview` 等 5 个类型、`styles/dashboard.css`（在 `main.css` 聚合）、`pages/(authenticated)/index.vue` 由 PlaceholderPage 换成 DashboardPage。语言包按既定机制 `pnpm sync-locales` 从 React 同步（features.json 双向各 +65 键，纯增量无改写）。
- **控件选型（nuxt-ui-guide §1 优先级）**：卡片 / Tab / Badge / 头像 / 空态 / 骨架 / 图标 / 按钮全部用 Nuxt UI 内置（UCard、UTabs `:content="false"` 只做卡头区间切换、UBadge 承接 React 的 Chip、UEmpty `variant="naked"` 承接 EmptyContent、UButton `:to` 承接导航）；浮层不涉及（本页零 Modal），故 §7.2 的 `useOverlayState` 规则本轮不适用；数字滚动用已装的 `@number-flow/vue`。
- **关键决策 · 图表零依赖手写 SVG（本轮唯一实质差异点）**：Nuxt UI **v4 已不再自带图表组件**（v3 的 `Chart*` 系列移除，实测 `@nuxt/ui@4.11.0` dist 无任何 chart 组件、也不引用 chart.js），要走官方图表路径必须新增 `chart.js` 依赖——触 AGENTS §15「不擅自引入依赖」，且 React 端的 sparkline 本就是内联 SVG，遂两处图表一并手写（`chart-geometry.ts` 纯函数 + 单测）。取舍记录：① 趋势面积图不用 `preserveAspectRatio="none"`（会把轴标签文字横向拉扁），改为 `useElementSize` 实测像素画布，等价于 recharts 的 `ResponsiveContainer`；② 纵轴量程取「步长向上取整的四等分」而非 recharts 的好看数——后者会把 23 抬到 40、曲线只占半高；③ 环形图扇区为自绘 `<path>`，命中判定可直接用 `mouseenter`（React 端那套「容器单条 mousemove 反查 `data-recharts-item-index`」是被 recharts 的事件模型逼出来的，手写 SVG 无此约束），但 Tooltip 仍沿用「元素常驻只切 `data-visible`」的零 rAF 依赖写法。
- **Token 映射与一处 CSS 层叠硬约束**：`--accent → --ui-primary`、`--muted → --ui-text-muted`、`--border → --ui-border`、`--surface → --ui-bg`、`--surface-secondary/60 → bg-elevated/50`；骨架圆角按 **UCard 实测 `rounded-lg`（8px）** 而非 React 的 `rounded-3xl`（HeroUI 24px），§21 明确 Vue 端不模仿 HeroUI 视觉；环形图分类色沿用同一标度 `oklch(from var(--ui-primary) l calc(c * 0.72) calc(h ± N))`（DOM 实测 computed：L 恒 0.723 = 主色明度、C = 0.219×0.72 = 0.15768、六段色相轮转，与 React 机制一致、绝对色值随各端主色不同）。⚠️ **`dashboard.css` 一律不套 `@layer`**：CSS 层叠优先级高于选择器特异性，写进 `components` 层会被 UCard 根节点自带的 `bg-default` 工具类（`utilities` 层）盖掉，欢迎横幅光晕直接消失；未分层规则恒高于所有层，实测 `getComputedStyle` 取到三层叠加的 radial-gradient。另记：UCard 卡体默认不是弹性容器，卡片等高 + 内容撑满须同时给根 `flex flex-col` 与 `:ui="{ body: 'flex min-h-0 flex-1 flex-col' }"`。三条机制结论沉淀至 [`docs/mechanisms.md`](./mechanisms.md) §32（Nuxt 端 Dashboard 直接复用，勿再去翻 `UChart`）。
- **验证**：`pnpm lint`（0 error，7 警告全为既有文件）/ `type-check` / `test`（10 文件 106 用例，新增 `chart-geometry` 11 例：坐标归一、整数刻度量程、面积闭合、半环与 >180° 大弧 flag、缝隙吞扇区）/ `build` 四绿；运行时冒烟（Vite :5174 + faker 账号 changyewei，DOM/computed 取证）——横幅问候与日期 Chip（`9月19日 星期六`）+ 三个快捷入口按菜单过滤、KPI 4 卡与 badge、8 张 `.dashboard-card`、stagger 1-4、环形 6 扇区 + 圆心 151 成员总数、3 条 sparkline 渐变与描边取色、动态 7 条 + 公告 5 条、Tooltip 默认 `data-visible=false` opacity 0；**连点 7/30 Tabs 期间 fetch 拦截计数为 0**（v1.12.0 本地截取语义守住）、「查看全部」出口实际路由到 `/settings/logs` 并可返回；控制台 0 报错。
- **已知限制 / 遗留**：① 自动化面板 `innerWidth=0` 且帧生命周期冻结（ResizeObserver / rAF 不回调），故趋势图 SVG（依赖实测宽度）与 NumberFlow 数字该环境下不出节点——与 React / Next 端同一限制，**像素级观感、趋势图 Tooltip 跟随、暗色模式仍需用户 GUI 走查**；② 整页错误态与首屏骨架两分支未在运行时实跑（代码为 React 同构移植 + 类型/构建通过）；③ **发现既有缺陷（未修，待拍板）**：`apps/vue/src/lib/format-date.ts:41` 的 `day` 间隔写成 `24 * 24 * 60 * 60 * 1000`（React / Next 均为 `24 * 60 * 60 * 1000`），于是「1~24 天」的时间差一律落到 hour 档——概览页最近动态显示 `50小时前 / 76小时前`，而 React 基准显示 `前天 / 3天前`。该函数被公告列表、铃铛等既有页面共用；**同源缺陷 Nuxt 端也有**（`apps/nuxt/app/lib/format-date.ts:41` 同一行同值，Nuxt 做 Dashboard 时会同样偏）。按「评估影响 ≠ 立即修改」只备案不顺手改，各一行即可修掉。
- **文档**：本条目；`feature-matrix.md` Dashboard 行 Vue ❌→✅、统计表 Vue 27/27（100%）。**工作区全部改动未提交，等用户 GUI 审核通过后按 §10 提交**。

### 修复 Next 端整页过渡动画重播（概览页必播 / 异常页偶发，2026-09-19）

- **背景**：用户验收 Next Dashboard 时反馈「进入概览页动画播两遍，像刷新页面」，并补充「概览页刷新必播」「异常页 403/404/500 三标签间来回切偶发重播」「组织管理 / 用户管理等页面正常」「React 端全部正常」。
- **定位过程**：先假设是概览页异步揭示（`enabled: mounted` 两段式渲染）撞上 layout 级 `<ViewTransition update="rt ...">`——该边界自身注释即写明「导航时内部 children 被替换即触发 update」，Next 把「页面切换」实现成了边界的 update，而 React 的 update 语义是「边界子树内任意 DOM 提交」，不区分来源。**第一版修法失败**：在页面内套一层 `<ViewTransition update="none">` 包住骨架/内容/错误三分支，假设「变更归属最近 ViewTransition 祖先」——用户实测仍重播，React 实际会把变更向上传给所有外层边界。**决定性验证**：把偏好设置里路由过渡调成「无」后重播消失，确认病根就是这个边界的 update 语义。异常页那条现象单独查：三个页面组件（`forbidden-error` / `result-page` / `illustration-*`）零 state 零 effect 纯静态，故二次提交不可能来自页面自身，只能来自 `(authenticated)/layout.tsx` 作为 async RSC 每次导航重新下发 `user` / `menuTree`（对象身份必新）→ `admin-shell.tsx:60-68` 的 `setUser` / `setMenus` effect 在导航提交后再跑一轮 → RSC 到达时机竞态 → 「偶发」。
- **修复**（仅 `admin-shell.tsx` 一个文件）：把 `update` 从「只要开了偏好就永远 `rt-*`」收窄为「只有 pathname 刚变化的那次提交为 `rt-*`」——新增 `animatedPath` 状态与 `isFreshNavigation` 派生值，在导航提交后的 effect 里追平，此后任何非导航提交一律拿 `none`。导航动画照常播一次，数据揭示与 RSC 二次渲染不再触发动画。附带确认：中途把 `update` 从 `rt-*` 翻回 `none` 不打断已在跑的过渡，React 是在发起过渡时一次性读取类名。
- **影响面**：未触碰 CSS、方向感知（`html[data-rt-direction]`）、速度档（`html[data-rt-speed]`）、主题切换 VT（`runViewTransition` 独立路径）、权限门控与 store 同步语义；`routeTransition === "none"` 偏好短路保留。预期内变化：若某次导航的 DOM 被 RSC 流式拆成两次提交，第二次不再播动画（React 端本来如此）。
- **沉淀**：机制结论写入 [`docs/mechanisms.md`](./mechanisms.md) §31（含失败修法与「别再走一遍」标注、自查口诀：Next 端动画多播先找导航后的第二次 DOM 提交，而不是查动画本身）。本条同时修正上一条 Next 对齐条目中「chartsReady 门闩后 VT 只播一次」的不完整结论——该门闩只合并了同一次揭示内部的多次提交，管不了「揭示相对导航是第二次提交」。
- **验证**：Next `eslint` 0 error / `tsc --noEmit` / `next build` 全绿；用户本地浏览器实测重播消失、导航与方向感知动画正常。⚠️ 本仓库自动化浏览器面板为 hidden（`visibilityState: hidden` 下 `document.startViewTransition` 空转、`ResponsiveContainer` 零宽不渲染），**VT 类问题在此环境不可测**，本轮曾因此产出过无效结论，后续一律以用户肉眼验证为准。

### Next 端同步契约 v1.12.0 与 Dashboard 新基准（2026-09-19）

- **背景**：用户验收 React 基准（含环形图新配色）后指示「以 React 为基准开发 Next 端，Vue 和 Nuxt 先不要动」。本轮是纯对齐，无新增功能、无契约变更。
- **服务端**：`lib/server/stats-service.ts` 的 `getStatsOverview()` 去掉 `days` 形参，改由 `KPI_SERIES_DAYS = 7` / `TREND_SERIES_DAYS = 30` 两个常量驱动，趋势固定 30 点；`app/api/stats/overview/route.ts` 移除 `days` 解析与 400 `VALIDATION_ERROR` 分支（`ServerApiError` import 一并摘除），与 Nest 端 v1.12.0 完全同形。
- **客户端**：`features/dashboard/` 六文件 + `styles/dashboard.css` + `lib/api-types.ts` 对齐 React 基准——KPI 卡图标徽标与底部通栏 sparkline（`vector-effect="non-scaling-stroke"`）、`days` 降级为 `DashboardContent` 本地状态 + `slice(-days)`（删 `keepPreviousData` / `refreshing`）、主图卡小结带去重并随区间计算、`max-w-7xl` 限宽、骨架 `rounded-3xl` 与高度校准、卡片 hover 微升、动态 7 条、圆心成员总数、环形图色相轮转分类色 + 容器单条 mousemove 自绘 Tooltip、动态/公告「查看全部」出口。
- **保住 Next 专有机制（未被移植覆盖）**：① `mounted` 门闩 + `enabled: mounted`（SSR 期 react-query 模块级单例会真实执行 queryFn，14 路并行 DB 查询双重承担并拖长 HTML 流阻塞水合）；② `chartsReady` 分包预取门闩（防「骨架→内容」+ 两处 Suspense 补位 + 容器首测共多次提交导致路由过渡连播）；③ 两个图表外层 `<ViewTransition update="none">` 嵌套边界。与 React 的三处常规差异沿用：菜单可见性读 RSC 注入的 `useMenuStore`（非 `useMenus`）、导航用 `next/navigation` 的 `useRouter().push`、`dashboard.css` 经 `globals.css` `@import` 聚合故本页不 import。
- **验证**：`eslint` 0 error / `tsc --noEmit` / `next build` / `check-locales` 全绿；运行时冒烟（dev :3100 + faker 账号 changyewei）——`GET /api/stats/overview` 返回 `loginTrend` 30 点（2026-08-21 → 09-19）而 KPI 序列仍 7 点、携带 `?days=7` 或 `?days=99` 均 200 静默忽略（与 Nest 行为一致）、DOM 侧 4 个图标徽标 / 3 条 non-scaling-stroke 折线 / 圆心 151 成员总数 / 2 个查看全部入口 / 动态 7 行全部到位、**六个图例色值 computed 后与 React 端逐位相同**（h = 253.825 / 295.825 / 211.825 / 337.825 / 169.825 / 19.8254，恒定 L 0.62039 / C 0.140388）、连点 3 次 Tabs fetch 拦截计数为 0、控制台无报错（仅既有 PressResponder warning 与 drizzle SQL 调试日志）。
- **已知限制**：截图面板 0×0 视口不可用，**像素级观感与环形图 Tooltip 运行时命中仍需用户 GUI 走查**（零宽下 `ResponsiveContainer` 不渲染 SVG，无法自测 hover）；Vue / Nuxt 按用户指示未动，其 Dashboard 尚未开工，届时直接按 v1.12.0 + 本基准落地。

### React Dashboard 颜值二轮打磨 + 契约 v1.12.0 取数口径修正（2026-09-19）

- **背景**：用户反馈概览页「颜值不够惊艳」，要求高颜值 / 干净简洁 / 有高级感。指示先改 React 基准、验收后再以此为基准推其他端。全程只动契约 + Nest + React（+ Next 语言包，见下），Vue / Nuxt 未动。
- **契约 v1.11.0 → v1.12.0（唯一实质契约变更）**：`GET /stats/overview` 移除 `days` 查询参数，`loginTrend` 固定返回近 30 日，7/30 区间下移到前端 `slice(-days)`。**动因**：`days` 在服务端只作用于 `loginTrend` 一个字段（KPI 迷你序列固定 7 日、角色/公告/日志均无关），但它是页面级聚合接口的入参，前端把它拼进 queryKey 后，用户点一下图表 Tabs 就重算十余个聚合只为换一条曲线；配合 `keepPreviousData` 续显旧数据时，其它区块若在两次请求间发生变化会表现为「只切了图表、KPI 数字却跳了」——控件作用域与请求作用域不一致。**等价性**：`lastNDates(30)` 取后 7 项 ≡ `lastNDates(7)`（同 UTC+8 日界、无数据日补 0），数值口径不变。**兼容性**：`forbidNonWhitelisted=false`，存量客户端携带 `?days=` 静默忽略不 400；400 ValidationError 响应随参数一并移除；`dto/stats-query.dto.ts` 与 `dto/` 目录删除。实测连点 4 次 Tabs fetch 拦截计数为 0。
- **视觉与交互修复（React）**：① KPI 卡补 plan §4.1.1 要求但此前缺失的左上角图标徽标（`bg-accent/10` + `text-accent`，项目既有工具类）；② sparkline 从「数字右侧 50/50」移到卡片底部通栏（同 §4.1.1），并以 `vector-effect="non-scaling-stroke"` 修掉 `preserveAspectRatio="none"` 非等比缩放导致的线宽随方向变化（横段粗竖段细）；③ 内容加 `mx-auto max-w-7xl`（对齐 ui-spec §1.2 非 fluid Main 限宽口径）；④ 卡片 hover 阴影微升（§4.1.3 补做，阴影几何复用本文件 Tooltip 既有的 `0 8px 24px`，不新增阴影值）；⑤ 主图卡小结删掉与 KPI 第 2 卡完全重复的「今日登录 + 环比」，只留周期/日均并改为随所选区间计算（此前恒按 30 日算，是顺带发现的正确性问题）；⑥ 动态 5→7 条对齐公告卡高度（单行约 50px×7 ≈ 两行公告 68px×5）；⑦ 环形图圆心显示成员总数；⑧ 零值 badge 降为中性色；⑨ 动态/公告卡补「查看全部」出口，与路由守卫同判据（`collectMenuPaths`）过滤。
- **关键机制（mechanisms 候选）· recharts 扇区级 Tooltip 无法平滑跟随**：`Pie.js` 给每个扇区各挂一对 enter/leave，离开即 dispatch `mouseLeaveItem` 把 `hover.active` 置 false 且 `coordinate` 清空（`TooltipBoundingBox` 外层是 `top:0/left:0` + transform 定位，于是归零回容器左上角），进入下一扇区再置 true——**开位置动画必然每次从左上角飞入，关位置动画必然闪**，两种都不对；而轴类图表（面积/折线）走连续 axis index 更新、中途从不 deactivate，才表现为平滑滑行。二次踩坑：改用手绑扇区 `onMouseLeave` 收起也不可靠——`activeIndex` 一变 recharts 就把**所有**扇区的 shape 换成 `inactiveShapeProp`，指针下节点被替换，`mouseleave` 发不出来，Tooltip 卡在图上不走。最终方案：只监听容器一条 `mousemove`，用 `event.target.closest('[data-recharts-item-index]')` 反查命中扇区（该属性经 `svgPropertiesAndEvents` 显式保留 data-* 落到 `.recharts-sector` 的 path 上），Tooltip 元素常驻不卸载、只切 `data-visible` 的 opacity——单一事件源，无 enter/leave 竞态，也不依赖 rAF（rAF 在后台标签页 / 省电模式 / 内嵌面板会冻结）。
- **角色环形图配色改标度（同日追加，用户拍板「改配色」）**：`SLICE_OPACITIES` 透明度阶梯 → `SLICE_HUE_OFFSETS = [0, 42, -42, 84, -84, 126]` 色相轮转，填充色改为 `oklch(from var(--accent) l calc(c * 0.72) calc(h ± N))`——明度沿用品牌值、彩度统一压到品牌彩度 0.72 倍（0.195 → 0.1404），只改色相。**根因不只是「相邻难分辨」**：alpha 阶梯是往背后卡片色里融，浅色卡片上还读得出深浅，深色卡片上低 alpha 扇区几乎与底色同化，这套标度在深色模式本就不成立；固定 L/C 的色相轮转两种主题下感知距离一致。未新增色值（每个颜色仍是品牌色的色相变体，AGENTS §7.3）；oklch 相对色彩语法项目 `sign-in.css:172` 已在用，实测在 CSS 与 SVG `fill` 属性两条路上均可解析。六色实测解析值 h = 253.83 / 295.83 / 211.83 / 337.83 / 169.83 / 19.83（图例圆点共用同一 `fill`，自动跟随）。⚠️ 原代码注释里「四端以同一 opacity 标度对齐」的约定作废——该约定只写在代码注释、`plan-dashboard-playground.md` 未硬编码，且 Vue / Nuxt 尚未做 Dashboard，无既成实现被破坏。
- **已知限制 / 待办**：① **Next 端仍是 v1.11.0 旧取数形状**（`lib/server/stats-service.ts` 带 `days` 签名 + route handler 400 校验），且未含本轮打磨与环形图新配色，需同步；语言包 3 个新键（`activity.viewAll` / `notices.viewAll` / `chart.totalMembers`）已因 `check-locales` 双向逐键比对先行写入 Next 四份文件；② Vue / Nuxt 尚未做 Dashboard，直接按 v1.12.0 落地；③ 设计决策仅剩一项挂起待拍板——两级卡片分层（浅色下 `--surface-secondary` 95.24% 比页面底色 97.02% 更深，会变成「凹陷」而非「分层」）；④ `ui-spec.md` §8 记录的 Card 圆角刻度（10/14px）与 HeroUI v3 实测 24px 不一致，本轮按实测值对齐骨架。
- **验证**：React `tsc` / `eslint` 0 error / `vitest` 93 用例 / `check-locales` / `vite build` 全绿；Nest `tsc` / `eslint` / `nest build` 全绿；`openapi.yaml` 经 js-yaml 解析校验（version 1.12.0、parameters 空、responses 200/401）；curl 实测 `loginTrend` 30 点、KPI 序列仍 7 点、携带旧 `?days=` 返回 200。**像素级效果经用户 GUI 走查三轮确认**（截图面板 0×0 视口不可用，图表在零宽下不渲染，Tooltip 运行时命中未能自测，由用户实测验收）。

### Next 端 Dashboard 全量对齐（含欢迎横幅，2026-09-19，未提交待审核）

- **背景**：用户确认 React 横幅方案后指示「基于 React 基准先完成 Next 端开发，改完先不提交，等审核通过再提交；Vue / Nuxt 等指令」。
- **服务端**：`lib/server/stats-service.ts`（Nest stats.service 逐条平移：UTC+8 日界序列补 0、14+1 路聚合、敏感字段不出现；时间列为 mode:"string"，比较边界传 ISO 字符串）+ `app/api/stats/overview/route.ts`（requireAuthUser 无权限位，与 notice 消费口径一致；days 缺省 7，非法值 400 `VALIDATION_ERROR` 与 Nest ValidationPipe 对齐）；同库同 schema（users/logs/notices/roles/userRoles/depts/posts）。
- **客户端**（`features/dashboard/` 七文件 + `(authenticated)/page.tsx` 空壳替换）：stats-api / kpi-card / login-trend-chart / role-distribution-chart / recent-activity-card / latest-notices-card / welcome-banner 同源移植；差异点三处——① 导航用 next/navigation useRouter；② 菜单可见性过滤读 `useMenuStore`（RSC layout 注入 findMenuTree 结果，与侧边栏同源），不引入 useMenus；③ dashboard.css 放 `src/styles/` 经 globals.css `@import` 聚合（Next 特性 CSS 约定）；依赖引入 `recharts@3.10.1`（与 React 锁定同版本）；语言包横幅 9 键此前已随 React 同步。
- **关键机制（mechanisms 候选）**：Next SSR 期 react-query 的**模块级单例 queryClient 会真实执行 queryFn**（debug 证实 fetchStatus=fetching）——stats 聚合 14 路并行查询在服务端重复承担，远程 Supabase pooler 拖慢时 HTML 流被拉长、水合被阻塞，页面呈「SSR 骨架冻结」假象（dev 日志可见 stats 200 in 60s~2.4min）。修复：DashboardPage 加 `mounted` 门闩 + `enabled: mounted`，SSR 恒输出骨架、水合一致，取数全部发生在客户端（与 React 纯 SPA 语义对齐）。
- **stats 接口持续挂起根因（用户实测反馈「一直在请求也不成功」）**：`db/client.ts`（postgres.js）此前无任何池防护——事务池模式（6543）下闲置客户端连接被池端回收，复用半开连接的查询永不返回。独立脚本对照实验证实：6543 连发 14 并发，**每轮约 4/10 连接 wedged 且永不恢复**（轮 2 起尾随查询成批超时，开关 postgres.js 流水线 max_pipeline 无差别）；而 5432 session pooler 直连 4 轮全稳、热身后 14 查询仅 ~200ms。修复两层：① `db/client.ts` 补齐 Nest 98d7cad 同款池四项防护（postgres.js 单位为秒：idle_timeout 30 / keep_alive 30 / max_lifetime 1800 / connect_timeout 10）；② 本地 `.env.local` 连接串 6543→**5432（session pooler）**，`.env.example` 补端口选型说明（生产 Vercel 仍用平台注入的 6543）。验证：连续 6 轮 stats 全 200（稳定 1.9s，此前 8.8s~2.4min+90s 超时），闲置 35s 后首请求 200（5.4s，重连开销）、紧随二连 1.9s。
- **路由过渡动画三连播（用户实测反馈）**：数据到达「骨架 → 整页内容」提交 + 两个 recharts 图表分包 Suspense 补位提交（dev 下分包按需编译必然晚于取数）+ 图表容器 ResizeObserver 首测后再提交，每处 DOM 变更都落在 AdminShell 的路由过渡 `<ViewTransition update>` 边界内 → 动画连播。修复：① chartsReady 门闩——分包 `Promise.all` 预取就绪（失败放行兜底）后才揭示内容，前两类提交合并为一次；② 两个图表套 `<ViewTransition update="none">` 嵌套边界（React 19.2，实验特性已由 next.config viewTransition 开启），图表容器首测尺寸 / Tabs 数据重绘等内部更新不再重复触发路由过渡。
- **遗留（用户实测仍会重复一次，2026-09-19 记录，次日继续）**：上述修复后三连播已消（分包补位与揭示合并），但内容揭示后仍会**多播一次**动画。剩余疑点：recharts `ResponsiveContainer` 首帧不渲染 svg，ResizeObserver 首测后才插入——这次「空容器 → svg」的内部提交疑似未被嵌套 `update="none"` 抑制（该嵌套边界与揭示同帧创建，首次内容插入的 VT 语义待查证）。明日候选方案（按优先级）：① 给两处 `ResponsiveContainer` 传 `initialDimension`（recharts 3.10.1 已支持，实测类型存在），首帧即按预估尺寸渲染 svg、消除揭示后的补插提交；② 用最小 demo 查证 React 19.2 嵌套 ViewTransition 对「同帧新建内层边界首次插入」是否可被 `update="none"` 抑制，修正边界用法；③ 兜底：Next 端图表改静态 import（放弃分包，接受 chunk 体积）。验证手段：`document.startViewTransition` 打补丁计数激活次数（本自动化面板 rAF 冻结、CSS 动画可见，该计数法不受影响）。
- **验证**：eslint 0 error（24 警告均为既有文件 console 提示）/ tsc --noEmit / next build（`/api/stats/overview` 注册）/ check-locales 全绿；浏览器实测（:3100 dev + 演示账号 changyewei）：登录跳转后欢迎横幅（问候/日期/天气 Chip/快捷入口按菜单过滤）、KPI 4 卡、登录趋势面积图 + 7/30 日 Tabs 切换、最近动态/最新公告直载渲染正常；角色占比环形图 DOM 几何完整（6 扇区、半径/填充正确），自动化浏览器面板 rAF 被冻结致入场动画停在第 0 帧，属环境假象，真实浏览器不受影响。
- **既有问题（与本次无关，备案不修）**：① 侧边栏/登录页 Logo `<img src>` 依据主题在 SSR（logo.svg）与客户端（logo-dark.svg）不一致 → React 19 可恢复 hydration 警告，dev overlay「1 Issue」即此；② 本机到 Supabase ap-southeast-1 pooler 的连接在 dev 下偶发拖慢（既有的 PgBouncer 防护提交即为此背景）。
- **文档**：本条目；`feature-matrix.md` Dashboard 行 Next ❌→✅。**工作区全部改动未提交，等用户 GUI 审核通过后按 §10 提交**。

### Dashboard 页头升级欢迎横幅（React 先行，2026-09-19）

- **背景**：用户反馈控制台顶部「时段问候 + 副标题」两行纯文本过于单调，希望优化 UI 展示并可增加内容（内容允许虚拟，好看即可）。
- **做了什么**（仅 React，`features/dashboard/`）：新增 `welcome-banner.tsx` 替代纯文本页头——① 视觉：主色径向光晕铺底 + 右上同心圆环装饰的 Card（`dashboard.css`，全部 `color-mix(var(--accent))` token 取色零新色值，深色模式透明度 12%→16% 微增，overflow-hidden 裁切圆环）；② 左列：时段问候升为 `text-2xl` + 情绪副标题 + 信息 Chip 行——当日日期用 `Intl.DateTimeFormat` 按语言分段拼接（zh「9月19日 星期六」/ en「Saturday, September 19」），天气为**按日期确定性生成的虚拟演示数据**（暖/寒季现象池 + 各月基准气温 ±2°，种子 = 年月日，刷新不跳变；Chip `title` 标注「今日天气为演示数据」）；③ 右列：快捷入口按钮组（用户管理 primary / 公告管理 / 日志管理 outline，`useNavigate` 导航语义），**以 `collectMenuPaths` 按用户可见菜单过滤（与路由守卫同判据），无可见菜单整组不渲染**；问候细分时段补 `greeting.dawn` 键（0~5 点「凌晨好」/ en「Still up, {{name}}?」，修复凌晨「早上好」与「夜深了」副标题打架）。整页 Skeleton 页头占位同步 `h-8` → `h-32`；greeting/subtitleKey 函数移入横幅组件。
- **语言包**：zh-CN/en 各 +9 键（`features.dashboard.banner.*` 8 键 + `greeting.dawn`），Next 端逐字同步（check-locales 14 文件一致通过）。
- **验证**：React check-locales / lint 0 error / tsc / vitest 93 用例 / build 全绿；浏览器 GUI 实测（本地 dev + Nest + faker 库，演示账号 changyewei 登录）：深浅色两模式横幅光晕与圆环、日期/天气 Chip、快捷入口渲染与过滤、凌晨问候修正、移动端 390px 断点纵排换行、英文语言全量文案——逐项通过。
- **文档**：本条目；`feature-matrix.md` Dashboard 行追加横幅备注（React 新增项，其余三端随各端 Dashboard 阶段对齐）；`plan-dashboard-playground.md` §4.1 布局骨架图与视觉语言拆解同步（新增第 4 条「欢迎横幅」、§4.1.8 逼真数据口径标注天气为唯一虚拟例外）。

### Phase C 启动：契约 v1.11.0 + Nest stats 模块 + React Dashboard 基准版（2026-09-18）

- **背景**：Phase 0 完成后按计划 §4 启动 Dashboard。用户指示：先完成 React 端，**经用户 GUI 验证通过后**再以 React 为基准开发 Next / Vue / Nuxt。
- **契约 v1.11.0（`d677bb3`，契约先行）**：新增 `GET /stats/overview` 只读聚合端点——任意已登录用户（x-permission NONE，与 notice 消费接口口径一致）；一次返回 KPI 计数（用户总数/今日新增、今日登录/昨日环比、累计操作日志/今日、部门/岗位数）+ KPI 迷你序列（固定近 7 日）+ 登录趋势序列（`?days=7|30`）+ 角色占比 + 最新公告（≤5）+ 最近操作日志（≤10）；**序列 date 按 Asia/Shanghai（UTC+8）日界聚合、无数据日补 0**；敏感字段（手机号/邮箱/IP/UA/头像）不出现在响应中；四端影响评估写入 changelog。
- **Nest stats 模块（`19b806c`）**：`modules/stats` 三件套 + app.module 注册；users.created_at 与 logs（type=login / operation）按日聚合（SQL `at time zone 'Asia/Shanghai'`）、roles left join user_roles 含 0 绑定角色、最新公告取已发布且发布时间到点、最近日志 left join users 仅取 username / displayName。curl 验证：结构/契约一致、敏感字段零出现、days=30 返回 30 点、未登录 401、非法 days 400、DEMO_MODE 下 GET 正常可用；build / lint 绿。**踩坑**：user_roles 复合主键无 id 列，`count(userRoles.id)` 编译期报错，改 `count(userRoles.userId)`。
- **React Dashboard 基准版（`3159f8c`）**：`features/dashboard/` 七文件 + 路由占位替换。布局按计划 §4.1 骨架：页头行（时段问候 + displayName + 7/30 日 Tabs）→ KPI 4 卡（NumberFlow 数字滚动、内联 SVG sparkline——7 点序列不依赖 recharts chunk、语义色环比 badge、KPI 4 双数无序列）→ 登录趋势 AreaChart（2/3）+ 角色占比环形图（1/3，主色透明度阶梯不新增色值）→ 最近动态 + 最新公告（各 1/2）。性能：recharts@3.10.1（§7 评审通过）经 React.lazy 分包（独立 chunk 293KB / gzip 86KB 不进首屏）；动画：CSS stagger 入场（尊重 prefers-reduced-motion）+ NumberFlow 数据到达触发一次，不引第三方动画库；视觉全量复用既有 Design Tokens；整页 Skeleton 与真实布局一致 + 错误卡重试。i18n `features.dashboard.*` 25 键（zh-CN/en），Next 语言包逐键同步（T3 先例：纯数据先行，页面实现留对齐阶段）。
- **验证**：React check-locales / lint 0 error / tsc 0 error / vitest 93 用例 / build 全绿；Nest build / lint 绿 + curl 全链路。HeroUI v3 API 适配两处：Button 无 startContent（图标作 children）、variant 无 soft（改 outline）。
- **待用户 GUI 验证**（验证通过后推进第 4~7 步）：四端视觉与交互一致性、深浅色逐项过检、响应式断点；§9.3 Dashboard 验收清单（数字来自真实聚合 / Skeleton+重试 / 无敏感字段）。
- **文档**：本条目；`feature-matrix.md` Dashboard 行（React ✅ / Nest ✅ / 其余 ❌）；计划 §4.4 实施顺序 1~3 打钩。

### Phase 0 演示上线准备全部完成（T1~T5，2026-09-17 ~ 09-18）

- **背景**：演示站公开上线前的最后一块能力：faker 逼真数据集 + 全站只读守卫 + 快捷登录 + 日志降噪。执行全程见 [`plan-phase0-execution.md`](plan-phase0-execution.md) §0/§4（T1 契约 `d7b7bb3` + 实现 `4147654`、T2 脚本 `1e5d48f`、T3 `4cb3436`、T4 用户手动完成）。
- **T5 全链路验收（2026-09-18，定时任务 B 自动执行）**：① 以进程环境变量注入 `DEMO_MODE=true`（不改 `.env`、无残留）启动 Nest 构建产物，curl 全链路矩阵全过——白名单放行（login 401 到 handler / demo-login 200 / refresh / logout 204 / notifications read-all）、非 GET 直拦（未登录与已登录 POST/PUT/DELETE 均 403 `DEMO_READONLY`）、demo-login 两 kind 成功（admin → `sys_admin`；random 30 次覆盖全部 4 演示角色 guest / employee / dept_manager / hr_specialist，无超管混入）、登录-刷新-退出完整（旧 refresh 撤销后 401）；超管双保险为 handler 层逻辑经代码确认（DEMO 守卫先拦，与任务 A 口径一致）。② 查库确认：`DEMO_READONLY` 拦截 0 条 error 日志（过滤器硬编码特判）；`LOG_API_SKIP_GET=true` 下 GET 0 条 api 日志而 POST 正常记录，未登录 GET 的 401 error 日志正常保留。③ `demo-reset` 幂等复跑（D/E 两轮）：11 张业务表（roles / user_roles / role_menus / depts / posts / user_posts / notices / notice_scopes / notice_read_records / notice_remind_logs / notifications）业务字段 md5 指纹逐表一致；超管 `admin` 密码哈希四轮执行全同且为全库唯一 super_admin 绑定用户；users 表指纹差异仅 avatar 列（单轮 1~2 张头像下载失败回退空头像，命中 T2 降级预案，faker 序列不受影响——头像 URL 先于下载由 seed 确定）；头像 150 张全部为自家 Supabase Storage 域名零外链。
- **T3 遗留清理**：四端语言包删除废弃键 `githubDeveloping` / `googleDeveloping`（全仓 grep 源码零引用后删；React 真源 + Next 手工同步 + Vue / Nuxt `sync-locales` 重新生成，两端 check-locales 14 文件一致通过，Nuxt locales 测试 3 用例过）。提交 `5dbd607`。
- **文档收尾**：`feature-matrix.md` 核心业务模块新增「演示模式（快捷登录 / 只读守卫）」行（四端 + NestJS 全 ✅）；`ui-spec.md` §1.3 补 `/sign-in` 快捷登录口径与 `/playground/*` 行；计划 §8 一致性同步清单逐项核对打钩（Dashboard 两项如实标注待 Phase C）；`AGENTS.md` §19 当前待办指针同步（Phase 0 完成 → 下一步 Phase C Dashboard 与四端统一上线）。提交 `docs: Phase 0 验收与文档同步`。
- **遗留给用户（不阻塞，随统一上线执行）**：① 线上环境配 `DEMO_MODE=true`（`LOG_API_SKIP_GET` 按需）；② §5 人工清单（数据观感 GUI 验收、§9.2 线上口径最终确认）；③ Playground 主题切换动画页 GUI 复核沿用户节奏。**下一步：Phase C Dashboard（Gate 后启动，faker 数据集为数据底座，契约 v1.11.0 stats 先行）**。

### 架构图谱去虚拟根 + 默认仅展开前两级（四端，2026-09-17）

- **背景**：用户反馈 `/org/chart` 组织层级太多导致图谱看不清，提出两点调整：① 组织已有真实顶级组织，去掉图谱顶部「Better Admin」虚拟根节点；② 初始只展示前两级，更深层级默认收起。
- **做了什么**（四端 `features/org` 图谱四文件同步）：① 删除页面构造的虚拟根——`CHART_ROOT_ID` 常量、节点 `isRoot` 字段及其全部 UI 分支（「根组织」徽章 / Landmark 图标 /「N 个顶级组织」文案 / 根字号）移除，顶级组织直接作为根层（`layoutDeptForest` 森林多根布局天然支持，节点点击跳通讯录无需再过滤虚拟根 id）；② 折叠集合初始值改为 `collectDefaultCollapsed`（深度 ≥ 1 的节点 id 全部收起 = 仅展示前两级，折叠钮展示「+N」可展开）。初始化时序：React / Next 新增 `OrgChartView` 子组件在树数据就绪后才挂载、惰性 `useState` 求值（避免树异步到达前首帧全展开闪现，树刷新不重置用户操作）；Vue / Nuxt 用 `watch(tree, …, { immediate: true })` + `collapsedInitialized` 标志一次性初始化。**无契约变更**（数据源仍为 GET /org/depts/tree）。
- **语言包**：四端 × 2 删除 `features.chart.rootBadge` / `features.chart.rootSubtitle`（虚拟根专属文案，已无引用）；check-locales（next vs react）通过。
- **验证**：React `tsc --noEmit` / eslint / vitest 8 文件 93 用例；Next `tsc --noEmit` / eslint；Vue `type-check` / eslint / prettier / vitest 9 文件 95 用例；Nuxt `typecheck` / eslint / vitest 9 文件 95 用例——四端全绿。GUI 效果留用户本地复核。
- **文档**：本条目；`ui-spec.md` §1.3 交互更新 + 变更记录 v1.6；`mechanisms.md` §7.1 collapsed 语义更新、§7.2 节点尺寸事实修正（220×84 → 240×112）；`feature-matrix.md` 无状态变化（仍全 ✅）。

### 公告详情抽屉按钮叠压修复 + 一键催办移入 Drawer.Footer（React / Next，2026-09-17）

- **背景**：用户反馈 `/org/notices`「查看详情」抽屉里「加载更多」「一键催办」按钮叠在未读名单条目上随滚动浮动，Vue / Nuxt 端正常；用户查 DOM 定位到名单容器 `min-h-40` 未随内容撑开。
- **根因**：HeroUI `Drawer.Body` 本身是 `flex-1 min-h-0 overflow-y-auto` 的高度受限滚动容器，React 端又给它写了 `flex flex-col gap-4`——内容超高时子项先按 flex-shrink 收缩：名单容器的显式 `min-h-40` 覆盖了 `min-height: auto` 保护被压到 160px（条目溢出叠到按钮上），正文 `max-h-96 overflow-y-auto` 的 `min-height` 为 0 同样可被压缩。中途只给名单容器加 `shrink-0` 实测把压缩全部转嫁给正文（只剩一行），故最终改 Body 为块流。完整机制见 `mechanisms.md` §30。
- **做了什么**（React / Next 两端 `notice-detail-drawer.tsx` 同步）：① `Drawer.Body` 由 `flex flex-col gap-4` 改 `space-y-4`；② 「一键催办」按用户建议移入 `Drawer.Footer`（Dialog 直接子级，滚动区之外固定底部，`fullWidth`），条件仍为未读 Tab 且有编辑权限；③ 两个按 Tab 分写的「加载更多」合并为一个 `fullWidth` 按钮置于名单末尾（呈现与 Vue 端 `block` 按钮一致）。其他 `flex flex-col` 的 Body（`post-members-drawer.tsx`）子项无显式 `min-h` / overflow 容器不触发，未动。
- **验证**：React / Next `tsc --noEmit` / eslint 全绿；React 端浏览器复现（演示管理员登录 → 打开「新员工入职培训计划（6月批次）」详情）：正文完整多行、名单 10 条正常、「加载更多」全宽在名单末尾、「一键催办」固定 Footer，滚动无叠压。**Next 端运行时效果由用户本地验证**（用户指示）。
- **文档**：本条目；`mechanisms.md` 新增 §30；`feature-matrix.md` 公告管理行追加修复记录。

### 组织管理「负责人」列改为 UserInfo 头像形式（四端，2026-09-17）

- **背景**：用户指示 `/org/depts` 子组织列表的「负责人」列改用侧边栏用户头像形式（头像 + 姓名），四端统一。
- **做了什么**：四端 `DeptsPage` 负责人列由纯文本 `leaderName ?? "—"` 改为复用各端既有 `UserInfo` 组件（React / Next：新增模块级 `deptLeader(node)` 辅助函数，形态同日志页 `logOperator`；Vue / Nuxt：cell 三元分支，同日志页操作人列写法）。**无契约变更**：列表数据源本就是树接口 `DeptTreeNode`，`leaderAvatar` 为契约 v1.7.0 既有字段。负责人只有姓名与头像，`username` 复用姓名传入——React 版 `UserInfo` 次行与主行相同时本就不渲染；**Vue / Nuxt `UserInfo.vue` 顺带补齐同一逻辑**（副行为空或与主行相同时不渲染，对齐 React 基准），否则会显示两行相同姓名。未设负责人或其账号已删除（`leaderName` 为 null）时显示 `—`。
- **取证**：Nuxt 组件自动导入只对模板生效，`h()` 渲染函数中引用须显式 `import`（既有 LogsPage / UsersPage 亦如此），首轮 `typecheck` 报 `Cannot find name 'UserInfo'` 后补导入。
- **验证**：React `tsc` / eslint / vitest 93 用例；Next `tsc` / eslint；Vue `type-check` / eslint / prettier / vitest 95 用例；Nuxt `typecheck` / eslint / vitest 95 用例——四端全绿。GUI 效果留用户本地复核。
- **文档**：本条目；`feature-matrix.md` 组织管理行追加现状。

### Vue / Nuxt 命令面板菜单组改为保持树形（2026-09-17）

- **背景**：用户指示 `searchGroups` 的菜单不必对齐 React 端 `collectMenuSections` 的拍平（「父级 › 页面」平铺），`UDashboardSearch` 对 `children` 有内置处理，Vue / Nuxt 两端同步修改——属组件库能力带来的**有意差异**，后续勿再改回拍平。
- **做了什么**：`apps/vue/src/layouts/AdminLayout.vue` / `apps/nuxt/app/layouts/admin.vue` 删除 `walk` 拍平递归与本地 `CommandItem` 接口，改为 `toCommandItem` 树形映射——顶层分组节点仍各成一节（标题为分组名），组内条目保持 `children` 嵌套直传（`CommandPaletteItem` 自带 `children?` 字段，无需扩展类型）；带 children 的父节点不设 `to`（组件 `onSelect` 对其 `preventDefault` 并 `navigate`，`to` 不会生效）。菜单条目移除 `searchText`，fuse keys 不变（`searchText` 键仅剩主题英文关键字与快捷链接使用）。
- **组件行为取证（`@nuxt/ui` 4.11 `CommandPalette.vue` 源码，`UDashboardSearch` 仅透传）**：带 `children` 的条目渲染尾部 chevron（`childrenIcon`），点击 / 回车 push 进 `history` 显示子级并出现返回按钮，空搜索词时 Backspace 返回上级；**fuse 只索引当前层级 `group.items` 顶层、不递归 `children`**——二级叶子页面（绝大多数页面）仍可在顶层直搜直达，三级页（如演示场的三级菜单）需先钻入二级分组再搜。
- **验证**：Vue `type-check` / eslint / prettier 绿；Nuxt `typecheck` / eslint / vitest 9 文件 95 用例绿。GUI 钻取交互留用户本地复核。
- **文档**：本条目；`feature-matrix.md` 命令面板行追加现状；`nuxt-plan.md` 功能对齐表命令面板备注同步。

### Phase 0 T4：Next / Nuxt 独立全栈演示模式（server demo-login + 只读拦截 + 登录页）（2026-09-17）

- **做了什么**（按 `plan-phase0-execution.md` §3 T4 卡执行计划 §3.6 Step 6 / 7）：① **server 端**：两端 `session.ts` 抽出 `issueSession`（login 与 demo-login 共用签发链路，与 Nest 端同名函数语义一致）并新增 `demoLogin(kind)`（DEMO_MODE 关 404 `NOT_FOUND` / 池空 404 `DEMO_USER_NOT_AVAILABLE` / admin 池 + random 两级随机 / 超管永不进池）；新增 route handler `demo-login`（非法 kind 400 `VALIDATION_ERROR`；响应复用 /auth/login 并写 httpOnly Cookie）；演示常量（`DEMO_ADMIN_ROLE_CODE` / `DEMO_RANDOM_EXCLUDED_ROLE_CODES` / `isDemoMode`）收敛于各自 `lib/server/demo.ts`。② **只读拦截**：Next 落在 `route-auth.ts` 的 `requireAuthUser` 前置调用 `assertDemoReadonly`；Nuxt 新增 `server/middleware/demo-readonly.ts`；白名单同为 auth 四端点 + notifications read-all / `{id}/read`。③ **客户端**：登录页 GitHub / Google 占位换「管理员」「随机用户」两按钮（图标 `shield-check` / `dices`，pending 按按钮独立），api-client 拦截器识别 `DEMO_READONLY` → i18n `errors.api.demoReadonly`，auth store 新增 `demoLogin`；`.env.example` 两端登记 `DEMO_MODE`（Next / Nuxt 无 Nest 的 api 日志机制，`LOG_API_SKIP_GET` 不适用不登记）。④ **顺带一致性修复**：两端 `scripts/clean-logs.mjs` 补 `coalesce(detail->>'seed','') <> 'true'`（对齐 Nest 端 log-cleanup，否则 faker 布景日志会被保留窗口清除，Dashboard 趋势数据源消失）。语言包零新增键：Next 在 T3 已同步，Nuxt 经 `sync-locales`（pretest / prebuild 钩子）自动同步。
- **关键发现 1（Next）**：把只读拦截放进 `proxy.ts`（matcher 纳入 `/api`）在 Next 16 dev 下会让**所有 POST 路由 404**（GET 正常，既有 `/api/auth/login` 也 404，A/B 实测确认），proxy 覆盖 API 此路不通——`proxy.ts` 还原零改动，改为 `requireAuthUser` 顶部前置检查：经全量排查，写路由中仅 auth 四端点不经 `requireAuthUser`（本就免鉴权放行），其余全部覆盖，未登录写请求同样 403 `DEMO_READONLY` 而非 401（等价 Nest 全局守卫先于 AuthGuard）。
- **关键发现 2（Nuxt / h3 v1）**：server middleware 放行分支**必须返回 `undefined`**——h3 对中间件任何非 undefined 返回值（**含 `null`**）都会序列化为响应并结束请求链，`return null` 表现为全站 204 空响应；403 分支 `setResponseStatus(403)` + 返回 `{ code, message }` 对象，形状与 `route-helpers.jsonError` 完全一致。
- **验证**：Next `lint` 0 error / `build` 绿；Nuxt `lint` 0 error / vitest 95 用例 / `typecheck` / `build` 四绿（demo-login 路由确认进 Nitro 产物）。**Next curl 全链路 7/7**：admin 200（faker `sys_admin`）、random 200（faker `employee`）、非法 kind 400、未登录写 403 `DEMO_READONLY` 先于鉴权、白名单 login 401 放行到 handler、GET 401 不受影响、通知已读白名单 401 非 403。Nuxt curl 两轮误打到同端口 Nest（`EADDRINUSE` 后请求落到用户运行的 Nest 3000）识别后，修正构建通过即停，**Nuxt 运行验证与两端 GUI 留用户本地复核**（用户指示）。
- **文档**：本条目；`plan-phase0-execution.md` §0 T4 置 ✅、§4 追加 T4 报告；`plan-dashboard-playground.md` §3.6 Step 6 / 7 打钩。

### Phase 0 T3：React / Vue 登录页演示快捷登录 + DEMO_READONLY 统一提示（2026-09-17）

- **做了什么**（`4cb3436`，按 `plan-phase0-execution.md` §3 T3 卡执行计划 §3.6 Step 4 / 5）：① 登录页移除 GitHub / Google 占位按钮（含内联 SVG 图标组件与 `oauthPlaceholder`），换为「管理员」「随机用户」两按钮（lucide `shield-check` / `dices`）调 `POST /auth/demo-login`；pending 态按按钮独立（本地 `demoKind` 决定哪个按钮转圈，其余按钮与密码登录提交按钮仅禁用、不显示「登录中…」）；成功 toast「登录成功，欢迎 {姓名}」（计划 §3.3 拍板不带角色）；404 统一提示「演示登录暂不可用」（覆盖 `DEMO_MODE` 关闭 `NOT_FOUND` 与候选池空 `DEMO_USER_NOT_AVAILABLE`）；回跳抽 `finishSignIn()` 与密码登录共用。② auth store 新增 `demoLogin(kind)`（固定短会话 `rememberMe=false`、同 login 预取菜单、返回 `AuthUser` 供 toast），`api-types` 新增 `DemoLoginKind`。③ `api-client` 在 `!response.ok` 分支识别 `code === 'DEMO_READONLY'` → message 替换为 i18n `errors.api.demoReadonly`。④ i18n 新增 5 键（`auth.signIn.demoAdmin` / `demoRandom` / `demoUnavailable` / `demoWelcome`、`errors.api.demoReadonly`，zh-CN / en）：React 真源 + Vue + **Next 手工同步**（`check-locales` CI 强制 React ↔ Next 逐键一致；Next 功能实现留 T4）。⑤ CSS 类 `.sign-in-oauth` → `.sign-in-demo`（两端语义重命名，规则不变）。
- **关键决策：DEMO_READONLY「统一 toast」落地为「拦截器本地化 message + 页面既有错误 toast 呈现」**——两端所有写操作页面均已有各自错误 toast（`getXxxErrorMessage` 未知 code 回退 `error.message`），拦截器若再弹全局 toast 会双重提示；改为在拦截器层替换 message，零页面改动、零重复，Next / Nuxt 照做即可。Vue 端既有 `setApiErrorHandler` 桥（5xx）不动；React 端未引入全局错误桥。
- **保留旧键**：`auth.signIn.githubDeveloping` / `googleDeveloping` 两端已无引用，但 Next / Nuxt 登录页仍在用，语言包暂留，**T4 完成后统一清理**。
- **验证**：React `lint` 0 error / vitest 93 用例 / `build`（tsc + vite）三绿；Vue `lint` 0 error / vitest 95 用例 / `build`（vite + vue-tsc）三绿；Next `check-locales` 14 文件一致。React 浏览器冒烟（用户本地 Nest 已开 `DEMO_MODE`）：两按钮渲染正确、点「管理员」pending 态正确 → 以 faker 用户「季智宸」（`sys_admin`）登录跳首页、头像 / 全菜单正常；用户管理 → 行操作「停用」→ 确认 → 弹出「演示环境，禁止修改数据」toast。**随机用户 kind、Vue 端 GUI、写表单打开与校验由用户本地手动验证**（用户指示）。
- **文档**：本条目；`plan-phase0-execution.md` §0 T3 置 ✅、§4 追加 T3 报告；`plan-dashboard-playground.md` §3.6 Step 4 / 5 打钩。

### demo-reset 用户数据中国化（2026-09-17）

- **背景**：用户反馈生成用户的英文用户名与 `@demo.better-admin.com` 邮箱过长、不贴合国内用户画像。
- **做了什么**：① 用户名改为姓名拼音（`pinyin-pro` 3.29.4 devDependency，姓氏 `surname` 模式处理多音字），形态 80% 全拼 `xiaoyewei` / 20% `xiao.yewei`，重名追加两位数字；邮箱后缀改 `@better-admin.com`（平均 27 字符）。② 排查发现 **faker zh_CN 无分性别名字库**，`firstName(sex)` 静默回退通用列表，名字与性别（及按性别匹配的头像）会错位——脚本内置男 / 女各约 80 个常用名字池，姓氏仍取 faker 百家姓（含复姓）。移除 `fakerEN` 实例。重跑验证：150/150 拼音形态、149 个不重复姓名、性别与名字一致。
- **文档**：计划 §7 依赖清单登记 `pinyin-pro` 并补 faker zh_CN 名字库限制说明。

### demo-reset 超管保留口径收窄为仅 admin（2026-09-17）

- **背景**：任务 A 按计划 §3.1「保留超管用户」字面保留了全部 super_admin 绑定账号（admin / test2 / test3），用户查看用户列表后拍板：只保留内置 `admin`，其余超管绑定的测试账号一并清理。
- **做了什么**：`scripts/demo-reset.ts` 保留判据由「绑定 super_admin 的所有用户」改为 `username = 'admin'` 单一用户，并校验其已绑定 super_admin（缺失或未绑定即拒绝执行，宁可不跑也不让库里失去可用超管）。重跑 `pnpm db:demo-reset --confirm`（31.9s）：test2 / test3 物理清除，活跃用户 151（150 演示 + admin），超管绑定仅 admin，admin 密码哈希未变，depts.leader / notices.publisher 无孤儿引用。
- **文档**：计划 §3.1 保留口径同步（并移除已不存在的 `settings` 表表述）；执行手册 §4 任务 A 遗留项 ② 销项。

### Phase 0 任务 A：契约 v1.10.0 + Nest 演示模式改造 + faker 重置脚本首次真实执行（2026-09-17，定时任务无人值守执行）

- **执行口径**：按 `plan-phase0-execution.md` §1 协议执行 §2 任务 A（T1 / T2 独立检查点），三个提交：`d7b7bb3`（契约）→ `4147654`（Nest 实现）→ `1e5d48f`（faker 脚本）。前置检查偏差：密钥实际位于 `apps/nest/.env`（`DATABASE_URL` + `SUPABASE_SECRET_KEY`）而非手册所写 `.env.local`，协议意图（密钥就位、只检查不创建）满足，继续执行。
- **T1 做了什么**：① `openapi.yaml` v1.9.0 → **v1.10.0**：新增 `POST /auth/demo-login`（`DemoLoginRequest.kind` enum、响应复用 `LoginResponse`、404 `NOT_FOUND` / `DEMO_USER_NOT_AVAILABLE`）、`components.responses.DemoReadonly`（403 `DEMO_READONLY` 作为**全局语义**登记，各写端点不逐个声明）、changelog 含四端影响评估；`main.ts` swagger 版本自 1.8.0 同步至 1.10.0。② Nest：`DemoReadonlyGuard` 以 `APP_GUARD` 全局注册（`DEMO_MODE=true` 拦所有非 GET / HEAD / OPTIONS，**先于路由级 AuthGuard**——未登录写请求同样 403 `DEMO_READONLY`）+ `@DemoAllowed()` 装饰器就地标注白名单（auth login / refresh / logout / demo-login，notifications read-all / `:id/read`）；`auth.service` 抽出 `issueSession()` 供 login 与 demoLogin 共用签发链路，demo-login 两级随机（先等概率选角色再选人）、候选排除任何 `super_admin` 绑定用户、统一短会话、日志 action `login.success.demo`；`HttpExceptionFilter` 对 `DEMO_READONLY` 不写 error 日志；`LoggingInterceptor` 增 `LOG_API_SKIP_GET`；`log-cleanup` 以 `coalesce(detail->>'seed','') <> 'true'` 跳过布景日志；新增 `RefreshTokenCleanupService`（每日 03:30 Asia/Shanghai 分批清理过期行，此前仅撤销路径删行、自然过期行无人回收）；`src/db/demo.constants.ts` 收敛演示角色 code（`sys_admin` / `dept_manager` / `hr_specialist` / `employee` / `guest`）与 seed 标记键，脚本与服务端共用真源；`.env.example` 登记 `DEMO_MODE` / `LOG_API_SKIP_GET` / `REFRESH_TOKEN_CLEANUP_*`。**超管双保险经代码确认已存在**（v1.4.6 `assertTargetOperable` 覆盖 update / remove / resetPassword / updateStatus，批量删走批量版；超管互操作豁免属 v1.9.0 超管转移设计，不动）。
- **T1 验证**：`build` / `lint` 绿，YAML 经 PyYAML 解析通过。以进程环境变量注入 `DEMO_MODE=true`（**未改 `.env`，无残留**）启动构建产物 curl：6 类写请求（含已登录超管）均 403 `DEMO_READONLY`；6 个白名单端点均放行到 handler（错误凭据 401、伪 token 401、未登录 401、池空 404、非法 kind 400）；登录 → 刷新 → 带 token 登出 204 → 已撤销 token 刷新 401 链路完整。查库：8 次拦截 0 条 error 日志、GET 0 条 api 日志、非 GET 10 条 api 日志与 2 条 login 日志照记。`DEMO_MODE` 缺省回归：demo-login 404、未登录写请求回到 401。
- **T2 做了什么**：`apps/nest/scripts/demo-reset.ts`（`pnpm db:demo-reset --confirm`，`@faker-js/faker` 10.6.0 锁版）。安全阀打印目标库 host / 保留超管 / 9 项删行预估，无 `--confirm` 拒绝（exit 1）。固定 seed 20260917 且**主键亦由 `faker.string.nanoid` 派生**，时间字段相对执行时刻分布。清理：日志 → refresh_tokens → 站内信 / 公告全套 → user_posts → 非超管用户（**含 51 个软删除行物理清除**）→ 岗位 → 组织（自引用 RESTRICT，叶子优先循环删）→ 非 super_admin 角色；**保留全部 `super_admin` 绑定用户**（admin / test2 / test3，密码哈希不动，仅 dept_id 置空）/ 菜单 / 字典。生成：组织树 36 节点（星河科技集团 → 6 中心 → 部门 → 小组）/ 岗位 32（按角色划分岗位池）/ 5 演示角色 + 权限矩阵 89 行 / 用户 150（8 / 15 / 8 / 105 / 14，`demo1234`，最近 12 人近 30 天入职其中 4 人近 7 天）/ 公告 40（30 published + 5 draft + 5 withdrawn，范围 72）/ 站内信 163 / 阅读记录 91 / 四类布景日志 900（`detail.seed=true`，29.9 天 → 0.03 天，近 7 日每天均有登录日志）。头像：`faker.image.personPortrait({ sex })` 性别匹配 → supabase-js `upsert` 至 `avatars/demo/00xx.jpg`（并发 6，URL 不带缓存参数以保持重跑一致），150/150 成功。
- **T2 验证**：真实执行 53.4s；复跑 45.6s 后 11 张表业务字段 md5 指纹（含主键）**逐表完全一致**；151 个头像 0 外链、随机 HEAD 200 `image/jpeg`；软删残留 0；`super_admin` 角色 / 28 菜单 / 字典 3+9 未动；部门主管在设置六页位均为 `SEARCH`(1)。真实数据端到端：admin 池 5 次全为 `sys_admin`；random 池 24 次覆盖 dept_manager 6 / employee 7 / guest 4 / hr_specialist 7、无超管；`demo1234` 密码登录 200；演示 `sys_admin` 写请求 403、列表 200、`auth/me` 头像 host 为 Supabase。
- **关键决策**：① **e2e 未补齐、备案 backlog**——项目无任何测试基建（无 spec / jest / test 脚本 / `@nestjs/testing`），计划「e2e 补齐」前提不成立；从零引入测试框架属 §18 架构级决策，凌晨无人值守不自行拍板，T1 以 curl 全链路提供同等覆盖。② 矩阵中「只读可见 / 纯查看」落地为 `SEARCH` 单一位——列表 GET 端点均要求 SEARCH，0 位页面可见但接口 403。③ 矩阵按计划 §3.1 字面执行（部门主管 / HR 不含演示场，HR 不含架构图谱），可在角色管理调整。④ `test2` / `test3` 两个超管绑定测试账号按「保留超管用户」口径保留，是否清理留用户决定。
- **⚠️ 上线前必做（人工清单）**：超管 `admin` 当前仍可用种子默认密码 `admin123` 登录（curl 实测），公开上线前**必须改密**；`super_admin` 角色 role_menus 仅 24/28（缺 exception 三页 + 主题切换动画页，重置前即如此，超管靠 -1n 聚合免检不受影响）。
- **文档**：本条目；`plan-phase0-execution.md` §0 T1 / T2 置 ✅、§2 判据打钩、§4 执行报告；`plan-dashboard-playground.md` §3.6 Step 1 / 2 / 3 打钩；`code-review-backlog.md` 备案 Nest e2e 基建缺口。

### Playground 整体验收通过 + Gate 全部达成（2026-09-16，仅文档）

- **验收（用户 GUI 实测）**：① Gate-2 冒烟通过（§9.4 口径）；② 计划 §9.1 Playground 验收清单五项全过——含折叠态三级菜单 / 面包屑 / 命令面板搜索过检点（§5.1）与 Next 端 8 页 GUI 冒烟。**Gate-1 / Gate-2 均达成；下一步进入 Phase 0（§3.6 执行清单），Phase C Dashboard 等 Phase 0 完成后启动**（§2 总顺序）。
- **文档**：`plan-dashboard-playground.md`（Gate-2 勾选、§5.0 步骤 4 与 §5.1 过检点销项、§9.1 五项全勾并注验收日期、§4 补「等 Phase 0 完成后启动」）；`AGENTS.md` §19 当前待办按「快照不存历史」规则重写为两条精简条目（Playground 2,875 字符历史叙述移交本文件，仅保留撞名警示指针）；本条目。

### Nuxt logs 模块源码重建（P0 销项）+ Playground 语言包措辞技术栈中立（2026-09-16）

- **做了什么**：① **`apps/nuxt/app/features/logs/` 四文件按 Vue 端 `apps/vue/src/features/logs/` 逐字平移**（`LogsPage.vue` / `LogDetailDrawer.vue` / `log-api.ts` / `log-type.ts`，修复 2026-09-14 发现的 `.gitignore` 模板规则导致源码从未入库的 P0，`pages/(authenticated)/settings/logs.vue` 引用恢复，AGENTS §19 待办销项）。Nuxt 端适配三点：`getErrorMessage` 改走 `@/lib/i18n-bridge`（Vue 端为 `@/i18n`）；`vue-i18n` / `useToast` 去显式导入走 Nuxt 自动导入（`vue` / `@tanstack/*` 显式导入保留，与既有 feature 一致）；**Nuxt 端 eslint 比 Vue 端严格**——`resolveComponent` 调用必须在全部 import 之后（`import/first`）、table-types 类型导入合并为单条 `import type`（`import/no-duplicates` + `no-import-type-side-effects`），风格经 `eslint --fix` 收敛。①′ 顺手根治 **NUXT_B3011 重名警告**：`components/layout/prefs/ConfigDrawer.vue` 为仓库重组（`618e368`）时误入库的空文件（Vue 端 prefs/ 无对应物、全仓零引用），`git rm` 移除。② **Playground 语言包措辞技术栈中立（用户拍板）**：React 真源 2 键（zh-CN / en 各 2）——`features.playground.codeBlock.inlineLead`「在 React 端安装本页依赖：」→「安装本页依赖：」、`features.playground.numberFlow.description`「官方 @number-flow/react：」→「官方 Number Flow：」；Next 端手工同步同 2 键，Vue / Nuxt 端经各自 `sync-locales.mjs` 重新生成（非手工编辑）。
- **验证**：Nuxt `nuxt typecheck` 通过（ConfigDrawer 重名警告经空文件移除后已消除）；`eslint .` 0 error（logs 目录经 `--fix` 后全绿）；vitest 9 文件 95 用例全绿；Next `check-locales` 14 文件与 React 完全一致；**用户本地 `nuxt build` 与页面预览通过（2026-09-16 确认）**。
- **文档**：本条目 + `AGENTS.md` §19 当前待办销项（P0 移除，待办只剩 Nuxt M5 部署项）。
- **明确不做**：不改动 3.6 执行清单相关内容（用户指示，Phase 0 待用户另行启动）。

### Playground 追加主题切换动画页：四端对齐完成（2026-09-16）

- **做了什么**（第 8 个演示页，React 基准 `db5f48a` → Next `4935ce9` → Vue `6a17381` → Nuxt `dda2ad6`，每段独立提交）：引入 `theme-switch-animation@0.1.0`（作者 baiwumm，MIT；View Transitions 蒙版揭示，13 类型：Circle / Circle Blur / LTR / RTL / TTB / BTT / Square / Diamond / Rectangle / Hexagon / Triangle / Star + 圆形反向），`/playground/theme-switch-animation` 二级页面（菜单经 `apps/nest/scripts/migrate-menus-add-theme-switch-animation.ts` 幂等录入共用库：父 `menu.playground`、icon `sun-moon`、sort 4 排 GitHub Activity 之后、0 位 + super_admin 补录全量位）。演示页 4 区块对齐 React 端源码：动画类型清单（卡片 + 右侧圆形渐变描边触发钮，圆心即揭示中心）、动画时长 / 缓动选择、方向类型区块、重置区块；i18n `menu.playground.themeSwitchAnimation` + `features.playground.themeSwitchAnimation.*` 38 键经 React 真源同步。
- **关键决策**：① `design-theme-store` 新增 `applyThemeModeInstant(mode)`（只写 DOM class / localStorage / store，不跑 `runViewTransition`）——库的 mask 揭示必须独占 View Transition 编排权，若走 `setThemeMode` 其内部二次 `startViewTransition` 会抢占并使库动画失效；② 新增 `html[data-theme-demo-vt] [data-vt-name]`（Vue / Nuxt 端为 `.route-vt-main`）摘名规则——库只动画 `::view-transition-new(root)`，`main-content` 具名快照组会静止叠放遮挡 mask；React 提交时已沉淀 `mechanisms.md` §29（HeroUI layer(components) vs Tailwind utilities 级联层序）；③ 库的 Vue 受控模式 `options` 必须传 getter 对象使内部 `computed` 追踪响应源（普通字面量只是 setup 快照）；`onChange` 内同步写 `<html>.dark` 供 `waitForThemeSync` 立即解析；④ Nuxt 端经 `theme-switch-animation/nuxt` 模块自动导入（`useThemeAnimation` / `ThemeAnimationType` 不显式 import），Next 端 `<main>` 无具名快照组故不挂摘名属性；⑤ 摘名与「动画期间禁用」按「本次时长 + 150ms 缓冲」模块级单例计时，不消费库返回的 `finished`（state 闭包读到上一轮 promise）。
- **验证**：React `tsc` / `vite build`（独立分包 22.19 kB）/ lint / `check-locales` / vitest 93 用例通过；Next `next build` 通过（61 静态页含新路由，lint 0 error）；Vue lint / `vue-tsc` / `vite build`（独立分包 22.56 kB）/ test 95 用例通过；Nuxt lint / test 95 用例通过，`nuxt build` 在 DEBUG 日志下 1,820 模块全量转换、唯一错误为既有 `app/features/logs/LogsPage.vue` 缺失 P0（AGENTS §19 已登记，非本次引入；另发现该 P0 在非 TTY 下会导致 `nuxt build` 静默挂起不打印错误，需 `DEBUG=nuxt:*` 才能看到 UNLOADABLE_DEPENDENCY）。**待用户本地 GUI 验证**：四端页面视觉与 13 动画实际效果、深浅色、快速连点不同触发钮。
- **文档**：本条目 + `plan-dashboard-playground.md` §5.1 菜单树补节点 / §6 表格补行 / §7 依赖清单补行；`feature-matrix.md` Playground 行更新为 8 页并登记四端对齐；`AGENTS.md` §19 指针同步。

### 登录页品牌文案口径统一为「五端」（2026-09-16）

- **背景**：四端登录页品牌区文案（「一套产品，四种实现」）与官网文档站 Hero（「一套 Admin 系统，五种技术栈实现」）及 README / AGENTS 的全栈定位口径不一致——登录页是早期只有四端时的遗留表述，产品级口径应为 React / Vue / Next.js / Nuxt / NestJS 五端。经用户拍板按方案 A 统一为五端口径。
- **做了什么**（语言包真源链路：React → Next 逐键一致 / Vue · Nuxt 由 sync-locales 自动拷贝）：
  - `apps/react/src/i18n/locales/{zh-CN,en}/auth.json` 与 `apps/next/src/i18n/locales/{zh-CN,en}/auth.json` 各改 3 键：`auth.brand.slogan`（一套产品，五种实现 / One Product, Five Implementations）、`auth.brand.sloganDetail`（与官网 Hero 副句同义对齐，补 NestJS）、`auth.brand.chip.stacks`（补「· NestJS」，否则与新 slogan 同屏矛盾）。
  - Vue / Nuxt 端 auth.json 由各自 `scripts/sync-locales.mjs` 重新生成（非手工编辑，避免 predev 覆盖漂移）。
- **明确不改**：docs / 各计划文档中的「四端 / 四种前端」表述（如 feature-matrix「四种前端实现的功能对齐状态」）是前端对齐语境，与 NestJS 后端并列陈述，事实准确，不属品牌口径，保持原样。
- **验证**：react / next 两端 `check-locales` 通过（14 文件逐键一致）；全仓 grep 无「四种实现 / Four Implementations」残留。
- **文档**：本条目；官网文档站 Hero 与 Features / FAQ 本就为五端口径，无需改动。

### Playground Grid Reveal 说明条修复 + Vue / Nuxt 端用户 GUI 验证通过（2026-09-16）

- **做了什么**（提交 `92c3944`，Vue / Nuxt 两端 `GridReveal.vue`）：用户本地测试发现「模拟生成」期间说明条「AI 正在生成 X%」完全不可见。根因是文案切换用了 `<Transition mode="out-in">`，而生成期间百分比每 80ms 递增、`:key="caption"` 随之变化，串行 out-in 的旧文字淡出（0.14s）永远追不上变化频率，新文字始终未插入；React 端 rare-ui 用的是 `AnimatePresence mode="popLayout"`（并行、旧元素脱流）。修复为默认并行模式 + `.gr-text-leave-active { position: absolute; left: 0.625rem }`，机制与规则沉淀见 `mechanisms.md` §28（motion popLayout → Vue Transition 的等效写法是「并行 + 离场 absolute」，不是 out-in）。
- **验证**：两端 lint 通过；**用户本地 GUI 手动验证通过**（Vue 端 5174），同时确认前一条目「待用户本地复核」的真实浏览器动画连续性——至此 Vue / Nuxt 端 Playground 的 GUI 验证由「任务内嵌浏览器冒烟」升级为「用户实测通过」。
- **文档**：`mechanisms.md` 新增 §28；`AGENTS.md` §19 指针标注用户验证通过。

### Playground Phase B：Vue 端 + Nuxt 端对齐（2026-09-16，定时任务无人值守执行）

- **做了什么**（`plan-dashboard-playground.md` §5.0 步骤 4 的 Vue / Nuxt 部分，用户 2026-09-15 授权跨两端串行；提交 `2405954`（Vue）/ `8c82327`（Nuxt））：
  - **Vue 端**（`apps/vue/src/features/playground/` 45 文件 + `lib/cn.ts` + 7 路由页 + `public/playground/` 资源）：① **共享机制**平移——`types.ts` / `constants.ts`（`packageVersion()` 从 `apps/vue/package.json` JSON import 读取，`resolveJsonModule` 既有开启）/ `registry.ts` / `demo-palette.ts` 原样；`PlaygroundIntro.vue`（`UCard` + `UBadge` 零依赖标签 + `UTooltip` 包 `UButton` 图标外链 + `useRouter().push` 跳 `usedIn`）、骨架 `PlaygroundPage` / `DemoSection`（`UCard` header slot）/ `DemoControl` / `DemoStage`、控件 `DemoSegmented`（**`UTabs :content="false"` pill 形态**，与 NoticeScopeSelector 既有用法同构，`generic="T extends string"` 收敛 id）/ `DemoSwitch`（`USwitch`）/ `DemoSlider`（`USlider` + `Intl.NumberFormat` 输出值并排——Nuxt UI 无 output 槽位）/ `DemoColorSwatches`（**自定义**：Nuxt UI 仅有完整取色器 `UColorPicker`、无预设色板单选，按 §21 优先级以 radiogroup 语义自建，注释说明原因）。② **七页**：代码块——`prismjs` 直渲染（`prism.ts` 按需注册 tsx / css / json / sql / python / bash、`Prism.manual` 关自动高亮，**自实现 prism-react-renderer 的 normalizeTokens 语义**把嵌套 token 展平为「行 × token」，跨行注释 / 模板串也能逐行落行号与高亮行；`code-theme.ts` 单 hex 派生浅深主题逐字移植；主题「跟随页面」经 `useDesignThemeStore().isDark`；复制反馈 `<Transition>` 淡入缩放模糊 + 对勾 `stroke-dashoffset` 描边 keyframes + `active:scale-90`）；Number Flow（`@number-flow/vue` 默认导出 + `NumberFlowGroup`，`trend` / `digits` / `format` / `locales` / `suffix` 全部对齐）；Animated Counter（**30 面轮 + CSS transform transition + `transitionend` 归一化**替代 motion 逐帧取 mod 的 11 面轮：目标位置按方向取最短 / 最长路径，位置区间 [-10, 20)，过渡结束后无动画归回 [0, 10)；字符进出场与列位移用 `<TransitionGroup>` 内置 FLIP，`.ac-move` 只声明 transform、enter / leave 只声明 opacity；新出现的列 `onMounted` 下一帧再瞄准，先绘 from 面再滚入）；Fluid Orb（WebGL 着色器逐字移植，程序与 RAF 在 `watch([active, size, color, canvasRef])` 内建立、cleanup 释放 GL 资源）；Grid Reveal（引擎 `grid-reveal-engine.ts` 逐字移植为纯 TS，组件层 RAF / ResizeObserver / IntersectionObserver / 图片 CORS 回退同上游，说明条淡出 + `<Transition mode="out-in">` 文案切换 + keyframes 闪光）；Matrix Orb（Canvas 2D 逐字移植，DPR 经 `useDevicePixelRatio`，state / level 循环内实时读 props 不重启）；GitHub Activity（网格格子 stagger 入场 / 月份标签模糊揭示 keyframes、Tooltip `<Teleport to="body">` + 视口夹紧、仓库面板 `grid-template-rows` 0fr→1fr 展开、头像堆叠淡出、列表滑入；**不内置 GitHub API 拉取**（演示本就不请求外部 API，重写时省略）；`formatHeading` / `formatDay` / `toggleLabels` 三出口同名）。③ **keepAlive 暂停**：`use-demo-active.ts` 组合式（mounted / activated → true，deactivated / beforeUnmount → false），各页定时器 / RAF 以 `watch(active, …, { immediate: true })` + `onCleanup` 挂接，切走即停、切回重启。④ **依赖**（§7 清单，`pnpm add -E` 锁版）：`clsx 2.1.1` + `tailwind-merge 3.7.0`（`lib/cn.ts`）、`@number-flow/vue 0.5.2`、`prismjs 1.30.0` + `@types/prismjs 1.26.6`（dev）；**motion-v 逐页评审后不引入**。⑤ **i18n**：语言包由既有 `scripts/sync-locales.mjs` 自 React 端拷贝（predev / prebuild 自动跑），116 键零手工；插值 `{{x}}` → `{x}` 归一化既有机制覆盖，无复数键。
  - **Nuxt 端**（`apps/nuxt/app/features/playground/` 自 Vue 整体拷贝后适配）：去显式 `vue-i18n` / `vue-router` 导入改自动导入（与 Nuxt 端既有 feature 一致）、7 个 `meta.ts` 的 `source` 指向 `apps/nuxt/app/`、Fluid Orb / Grid Reveal / Matrix Orb 三页 canvas 组件以 `<ClientOnly>` 包裹（Nuxt 端现为 `ssr: false`，包裹为前瞻性约束）、`eslint --fix` 按 stylistic（单引号无分号）统一；7 个路由页保留 `<script setup>`（mechanisms §26）；同版依赖锁入；`public/playground/` 资源同步。
- **关键决策 / 已知限制**：① **prism-react-renderer 是 React 专属渲染器**（计划文档 §6 Vue 列原写法为笔误），Vue 侧改 `prismjs` 核心 tokenize 后自渲染，语言注册含 bash（React 端 prism-react-renderer 不含 bash、无边框区降级纯文本，Vue / Nuxt 端该区会真高亮——超对齐、可接受）。② **motion-v 不引入**：全部动画以 CSS transition / `<Transition>` / `<TransitionGroup>` FLIP / Canvas RAF 等效，唯一未复刻的是 github-activity 头像 `layoutId` 共享元素飞行（降级为淡入淡出）；Grid Reveal 说明条的 motion `layout` 宽度动画不做。③ **⚠️ 语言包措辞遗留（待用户拍板）**：React 端 `features.playground.codeBlock.inlineLead`（「在 React 端安装本页依赖」）与 `numberFlow.description`（「官方 @number-flow/react」）写死了 React 措辞，经 sync-locales 同步后 Vue / Nuxt 界面原样显示；Vue / Nuxt 语言包不能单独改（每次 predev 被覆盖），修法只能是把 React 端语言包文案改为技术栈中立（如「安装本页依赖」/「官方 Number Flow」），属 React 语言包 JSON 两行变更、不动代码——本次按「不动 React / Next」红线未改，留用户决定。④ **内嵌浏览器冒烟的环境限制**：ZCode 内嵌 webview 未取得焦点时不调度 `requestAnimationFrame`（实测 600ms 内 0 帧），Vue `<Transition>` 靠 rAF 摘 `enter-from`、RAF 动画循环也停摆，仅截图抓帧时推进；故冒烟以「DOM 结构 + 控制台零错误 + WebGL / Canvas 像素读回 + 定时器存活数」为主，动画连续性以真实浏览器为准（用户本地复核项）。冒烟中一度误判 Animated Counter「新列空白」为代码 bug，实为此环境所致；顺手修的两处仍成立——新出现的列挂载后不瞄准目标 digit 是真实 bug（React 端 effect 挂载即动画），过渡属性分声明让 transitionend 与 Vue 等待计数精确对应。⑤ **Playwright 定位器点击在内嵌浏览器会超时**（Reka 组件），改用 `tab.cua.click` 坐标或 `evaluate(el.click())`。⑥ Nuxt `typecheck` / `build` 仍被既有 `app/features/logs/LogsPage.vue` 缺失（AGENTS §19 P0 待办）阻塞，本次用临时桩验证 build 通过后删桩，未入库。⑦ 冒烟复用了用户本地留存的 Nest（3000）与 Vue dev（5174）实例；Nuxt dev（3001）由任务启动并在结束时停止；登录经接口以种子 admin 取 token 注入 `auth-storage`，未在表单输入密码。
- **验证**：Vue 端 lint 0 error（新增 2 条 warning 为 fluid-orb 着色器诊断 `console.error`，与 React 端同款）/ `vue-tsc` 零错误 / test 9 文件 95 用例 / `vite build` 通过，演示页全部独立分包（code-block 含 prism 约 56KB，其余 6–13KB，`index` 大包经标识符扫描确认不含 prism / number-flow / 着色器）；Nuxt 端 lint 干净 / test 95 用例 / 桩验 build 通过。**GUI 冒烟（两端各 7 页）**：信息卡（依赖 Chip 版本 / npm·GitHub·Docs 外链 / 源码链接指向各自端目录 / 零依赖标签）、分段 / 开关 / 滑块 / 色板交互、代码块高亮行与紫色主题派生、深色模式跟随、Number Flow 倒计时 / 货币 / 后缀 / 滑块联动、Animated Counter 格式化 / 补零 / 负数变红、Fluid Orb 四枚 WebGL 中心像素上色、Grid Reveal 出图后网格上色 + 说明条「生成完成」、Matrix Orb 四枚画布像素与三态标签、GitHub Activity 52 列 361 格 / 月份标签 / 仓库面板展开、**keepAlive 切走 1500ms 定时器归零切回重建**（两端）、控制台零错误。**待用户本地复核**：真实浏览器下动画连续性（滚轮 / FLIP / 闪光 / 面板展开）、复制按钮反馈、三级菜单折叠态 / 面包屑 / 命令面板（§9.3 既有过检项）。
- **文档**：`plan-dashboard-playground.md` §5.0 步骤 4 标记完成、§7 四包销项（含新增 prismjs 行、motion-v 评审结论）；`feature-matrix.md` Playground 行 Vue / Nuxt 🔧 → ✅（四端全对齐）；`AGENTS.md` §19 指针同步（步骤 4 销项 + 语言包措辞遗留）。

### Nest 端 API 文档 UI：Swagger UI 换为 Scalar API Reference（2026-09-15）

- **做了什么**（仅 `apps/nest`，`main.ts` 净变更约 10 行）：引入 `@scalar/nestjs-api-reference 1.2.18`（`pnpm add -E` 精确锁版，无 peerDependencies、仅 1 个传递依赖 `@scalar/client-side-rendering`），`/docs` 改挂 Scalar UI；`SwaggerModule.setup('docs', …, { swaggerUiEnabled: false, jsonDocumentUrl: '/docs-json' })` 禁用 Swagger UI 但**保留 OpenAPI JSON 出口 `/docs-json`**（契约运行时出口不变，Scalar 经 `url: '/docs-json'` 浏览器端实时拉取，避免文档双份内联）。`@nestjs/swagger` 装饰器层与文档生成逻辑零改动，全局前缀 `/api` 与两端点互不影响（与既有一致）。主题经 `apiReference({ theme })` 字段选择（不传即包内置默认：NestJS 集成版注入 `customThemeCSS` 品牌红主题；**由用户本地实测后自选**，内置 14 种：`default` / `alternate` / `moon` / `purple` / `solarized` / `bluePlanet` / `deepSpace` / `saturn` / `kepler` / `mars` / `laserwave` 等，`none` 为清空预设）。
- **关键决策 / 已知限制**：① 1.2.x API 与网上多数 0.x 教程不同——配置类型为 `Partial<HtmlRenderingConfiguration>`，`spec.url` 已标记 deprecated，应用顶层 `url` / `content`；② **渲染机制为 CDN 客户端渲染**：服务端只吐 HTML 骨架，浏览器默认从 jsDelivr 加载 `@scalar/api-reference` ESM 包，中国大陆网络访问 jsDelivr 可能不稳定——先按默认 CDN 落地零维护，若线上实测白屏再经 `cdn` 参数切镜像或自托管 bundle（一行配置可切）；③ 包要求 **Node >= 22**（本地 v24.15 满足），Render 部署需确认默认镜像 Node 版本（当前 22.x）或显式设 `NODE_VERSION`，无需改 `package.json engines`；④ `/docs` 在生产环境公开可访问的现状不变，如需收紧另加环境开关。
- **验证**：`nest build` + `pnpm lint` 通过；本地起服务冒烟：`/docs` 200 `text/html`（`<title>Better Admin API</title>`、Scalar ESM CDN 脚本、配置 `url: "/docs-json"` 注入正确、品牌主题变量注入、`swagger-ui` 零残留）；`/docs-json` 200 `application/json`（OpenAPI 3.0.0 / 版本 1.8.0 / **44 条路径**与契约一致 / `bearerAuth` 保留）。四端与 Nuxt `contract-diff.mjs`（直调 `/api/*`）均不受影响。**待用户本地 GUI 验证**：浏览器打开 `/docs` 视觉、暗色模式、在线调试（Bearer 授权后直接发请求）。
- **文档**：`apps/nest/docs/openapi-design.md` §0 / §6 现状表述同步（Swagger UI → Scalar，JSON 出口补录），§8 历史步骤按「现状与历史分离」规则不回改。

### Playground Phase B：Next 端对齐（2026-09-15）

- **做了什么**（`plan-dashboard-playground.md` §5.0 步骤 4 的 Next 部分，`apps/next/src/features/playground/` 31 文件 + 7 个路由页）：自 React 端整体平移——① **基础层**：`types.ts` / `constants.ts`（`packageVersion()` 从 `apps/next/package.json` JSON import 读取，`resolveJsonModule` 既有开启）/ `demo-palette.ts` / `demo-section.tsx` / `demo-controls.tsx` / `playground-intro.tsx` / `registry.ts` 原样复制；② **六个演示目录**：rare-ui vendor 六组件（code-block / animated-counter / fluid-orb / grid-reveal / matrix-orb / github-activity）+ 各页组件 + 数据文件逐字复制，**全部客户端 tsx 在文件顶部加回 `"use client"`**（vendor 头注释由「移除 use client（Next 复用时加回）」改记「Next 端在文件顶部加回」），纯数据模块（code-samples / artwork / github-activity-data）不加指令；7 个 `meta.ts` 的 `source` 路径替换为 `apps/next/src/features/playground/...`（「查看源码」链接指对仓库位置）；③ **导航适配**：`PlaygroundIntro` 的 `usedIn` 跳转由 `@tanstack/react-router` `useNavigate` 改 `next/navigation` `useRouter`（`router.push`，当前 `usedIn` 尚未回填、仅编译通路）；④ **路由**：7 个 `app/(authenticated)/playground/**/page.tsx` 从 `PlaceholderPage` 切到真实页面组件，**page.tsx 保持服务端组件**导出 `generateRouteMetadata`（标题仍服务端按语言渲染），客户端页面组件经 import 挂载——`generateMetadata` 与 `"use client"` 不可同文件，既有业务页同构。**依赖**：`motion 13.2.0` / `prism-react-renderer 2.4.1` / `@number-flow/react 0.6.2` 与 React 端同版锁入（`pnpm add -E`）；`pnpm peers check` 仅有既有 `react-aria-components 1.20 vs ^1.21` 警告。`.tag` 撞名修复随源码自带——Next 端同版本 HeroUI + 同一份 `@heroui/styles` 全局 BEM 类，mechanisms §27 机制同样成立。
- **验证**：`pnpm lint` 0 error（24 条 warning 全部既有：vendor 上游 `console.error` 诊断 / `<img>`（github-activity 上游仓库头像）/ 服务端 service `no-console`，本次未新增）；`npx tsc --noEmit` 零错误；`next build` 成功（7 条 `/playground/*` 路由注册）；`check-locales` 与 React 端完全一致（语言包 Phase B React 落地时已同步，本次零改动）；构建产物分析确认 `motion`（6 chunk 约 431KB）与 prism（5 chunk 约 221KB）全部隔离在演示页按需 chunk，>200KB 的首屏大包均不含演示依赖。**冒烟（简化）**：浏览器登录态打开 `/playground/code-block` 首屏渲染正常（信息卡 / 控件 / 高亮代码块均出图，截图存 session artifacts），用户要求剩余页面由其本地自行验证——**待用户验证**：7 页视觉与交互、深浅色、多标签 keepAlive 切走切回动画暂停恢复、三级菜单 / 面包屑 / 命令面板（§9.3 验收项）。
- **文档**：`plan-dashboard-playground.md` §5.0 步骤 4 标记 Next 完成；`feature-matrix.md` Playground 行 Next 🔧 → ✅；`AGENTS.md` §19 指针同步（步骤 4 剩余：Vue → Nuxt，等用户指令）。

### Playground Phase B：React 基准——PlaygroundIntro 机制 + rare-ui 7 页（2026-09-15）

- **做了什么**（`plan-dashboard-playground.md` §5.0 步骤 3，React 端 `src/features/playground/`，约 30 文件）：① **信息卡机制**：`types.ts`（`DemoMeta` / `DemoPackage` 按 §5.2 定义）+ `constants.ts`（仓库地址 / 分支常量、`sourceUrl` / `npmUrl` 推导、**`packageVersion()` 以 `keyof typeof pkg.dependencies` 收敛参数**——版本从 `package.json` JSON import 读取，登记未安装的包在编译期报错）+ 每个演示目录就近 `meta.ts` + `registry.ts` 汇总 7 条 + `playground-intro.tsx`（HeroUI Card：标题区 / 依赖 Chip（`包名@版本` + npm / GitHub / Docs 图标外链，零依赖显示「零新依赖」）/ 关联区「查看源码」+ `usedIn` 跳转，`usedIn` 留待 Phase C 回填）；页面骨架 `demo-section.tsx`（`PlaygroundPage` / `DemoSection` / `DemoControl` / `DemoStage`）与控件 `demo-controls.tsx`（`DemoSegmented`(ToggleButtonGroup) / `ColorSwatches` / `DemoSlider` / `DemoSwitch`）供七页复用。② **rare-ui 六组件 vendor**（脚本从 `rareui.com/r/<name>.json` 拉取快照，文件头注明来源与本地改动）：`cn` 改自 `@heroui/react`；移除 `"use client"`（Vite SPA 无需，Next 复用时加回）；shadcn / 硬编码色换项目 token（github-activity `bg-white dark:bg-black` → `bg-surface`、`bg-card` → `bg-surface(-secondary)`、`bg-neutral-*` → `bg-default`、`#C4C9CC` → `text-muted`；grid-reveal `bg-muted` → `bg-default`）；github-activity 增补 `formatHeading` / `formatDay` / `toggleLabels` 三个可选 i18n 出口（缺省沿用上游英文），内置 GitHub API 拉取逻辑保留但演示不传 `username`。③ **七页**：代码块（语言 / 主题模式 / 行号 / 高亮行、单一 hex 派生浅深双主题、无边框嵌入）；Number Flow（实时随机游走 / `NumberFlowGroup` 倒计时 + `digits` 限位 / 货币与后缀 / 滑块联动）；Animated Counter（基础计数 + 时长滑块 / 小数 + 前缀 + western / indian 分组 / 里程表补零 + 余额负数变红）；Fluid Orb（色板 + S/M/L 分段尺寸、三色并列，WebGL 说明）；Grid Reveal（**模拟 AI 出图**：进度 0→1 驱动网格拆分、进度满即本地 canvas 生成 data URL 作为「图片到达」、组件以图片落地完成揭示；受控进度滑块）；Matrix Orb（三态分段 + 自动包络 / 手动音量 + 点阵密度 + 色板、三态并列）；GitHub Activity（月份范围 / 格子尺寸 / 单色 + 五档色阶 / 月份标签，**数据为固定 seed 确定性生成 + 静态仓库榜、不请求 GitHub API**）。所有计时器 / RAF 均在 effect 内并带 cleanup，keepAlive（`<Activity>` hidden）切走即停、切回重建。④ 7 个路由文件从 `PlaceholderPage` 切到真实页面组件（路径不变，`routeTree.gen.ts` 无 diff）。
- **依赖**（§7 评审清单，精确锁版）：`motion 13.2.0` / `prism-react-renderer 2.4.1` / `@number-flow/react 0.6.2`；fluid-orb / matrix-orb 核实为原生 WebGL / Canvas 2D **零 npm 依赖**（§6 待核对项销项）。构建产物：七页各自独立分包 5–95KB，`motion` 落在按需共享包（122KB，仅演示页 dynamic import，`index.html` 不引用），首屏体积不受影响。`pnpm peers check` 的 `react-aria-components 1.20 vs ^1.21` 为既有警告、与本次无关。
- **GUI 冒烟发现并修复 2 项**（临时公开预览路由自测代码块 / Number Flow 两页浅深色后即删，`routeTree` 已确认无残留；其余五页交用户手动验证）：① **HeroUI 全局 BEM 类 `.tag` 与 prism token 类名撞车**——JSX 标签 token 带 `class="token tag"` 被 HeroUI Tag 组件样式渲染成 `inline-flex`，属性间空白 token 折叠为零宽（`<Modal.BackdropisOpen=...>`）；修复为 token span 只取 `style` / `children` 不透传 className（高亮色本就走内联样式），已扫描 HeroUI 样式产物确认仅 `.tag` 一处撞名（机制沉淀 mechanisms §27）。② 无边框嵌入的单行代码容器高度不足以容纳浮动复制按钮（`overflow-hidden` 裁切），加 `min-h-12 justify-center pr-12`。另：react-aria `onPress` 不响应合成 `el.click()`，自动化验证须走真实指针事件（不影响用户）。
- **验证**：`tsc` 零错误 / lint 0 error（新增 2 条 warning 为 fluid-orb 上游着色器编译失败的 `console.error` 诊断，保留）/ test 8 文件 93 用例 / `vite build` 通过；i18n 新增 116 键（`features.playground.*`，含 intro / common 公共键）四份语言包（**React + Next zh-CN / en 同步**，仅语言包 JSON、不动 Next 代码，`check-locales` 通过），脚本校验代码中 118 个引用键 0 缺失、语言包 0 冗余键。**待用户手动验证**：登录后 7 页视觉与交互、深浅色、keepAlive 切走切回动画暂停恢复、三级菜单 / 面包屑 / 命令面板（§9.3 验收项）。
- **文档**：`plan-dashboard-playground.md` §5.0 步骤 3 标记完成、§6 fluid-orb 依赖核对销项、§7 三包标注已引入；`feature-matrix.md` Playground 行 React 🔧 → ✅；`mechanisms.md` 新增 §27；`AGENTS.md` §19 指针同步（下一步：步骤 4 Next → Vue → Nuxt 逐端对齐）。

### Playground Phase A 验收通过 + Phase B 排期（2026-09-15）

- **验收**（用户 GUI 冒烟，React 端）：菜单可见性修正后角色授权行为正常（普通角色在角色管理勾选演示场子页后可见、页面无按钮），侧边栏「演示场」三级菜单展示与 7 个占位页点入均正常。Next / Vue / Nuxt 的 GUI 冒烟随 Phase B 步骤 4 逐端对齐时一并执行；折叠态第三级形态与命令面板搜索三级项仍为 `plan-dashboard-playground.md` §5.1 过检点。
- **排期**：Phase B（React 基准——`PlaygroundIntro` + meta 机制先行，再按 §6 清单 vendor rare-ui 7 页，依赖按 §7 清单安装；随后 Next / Vue / Nuxt 逐端对齐）用户确认推进，下次会话启动。本条仅记录验收与排期，无代码改动。

### 菜单可见性修正：有 role_menus 关联记录即可见（三端服务端，2026-09-14）

- **背景**（订正上一条「页面声明 SEARCH 位」的决策）：Phase A 为绕开「0 位页面对普通角色不可见」给演示页声明了 SEARCH 位；用户裁定这是服务端逻辑本身不对——`/api/menus` 应包含 `permissions = 0` 的菜单，纯展示页只是没有按钮，角色管理中照常勾选。用户已手动把演示场 10 节点改回 0 位（只读查询核实一致）。
- **修复**：Nest `MenusService.buildAllowedMenuIds`、Next `lib/server/menus-service.ts`、Nuxt `server/lib/menus-service.ts` 三处同款移除 `role_menus.permissions != 0` 过滤（`sql` 导入随之清理），语义回归 `database-design.md` §1.5 步骤 2「关联记录集合 = 直接授权集合」（该文档 v0.10 明确此口径并记录变更）。**安全前提已核实**：四端授权抽屉的保存载荷只含勾选节点（React / Next `isNodeSelected`、Vue / Nuxt `use-grant-tree` 对齐口径），未勾选项不会产生 0 位记录，故不会误放行；守卫按「路径是否在返回树中」判定、`usePermissions` 不按 0 位拦页面，无连带改动。录入脚本改为全部节点 `permissions: 0n`，与库一致。**副作用即收益**：线上「异常页」三子页（0 位）此前仅超管可见，现普通角色勾选后即可见，无需改库。
- **验证**：Nest lint + `nest build` + 脚本单文件 tsc；Next lint（2 条既有 warning，本次未新增）+ `tsc --noEmit`；Nuxt lint + typecheck（唯一错误仍为既有 logs P0）。无既有测试断言旧过滤行为。待用户 GUI 自测：给任一普通角色勾选「演示场」子页 → 该角色登录后侧边栏可见、页面可进、无按钮。
- **文档**：`database-design.md` §1.5 步骤 2 + §9 v0.10；`code-review-backlog.md` 备案项转入「已修复 2026-09-14」；`plan-dashboard-playground.md` §5.0 步骤 1、`feature-matrix.md` Playground 行、`AGENTS.md` §19 口径同步（上一条 progress 记录按规则不回改）。

### Playground Phase A：菜单树录入共用库 + 四端占位页（2026-09-14）

- **做了什么**（`plan-dashboard-playground.md` §5.0 步骤 1-2）：① `apps/nest/scripts/migrate-menus-add-playground.ts`——幂等菜单录入脚本（命名沿用 `migrate-menus-add-*` 惯例，整棵树 + super_admin 授权一个事务落库），已在共用库执行：10 节点（演示场 一级目录 → 代码块 / 数字动画 / Ai Kit / GitHub Activity 二级 → Number Flow / Animated Counter / Fluid Orb / Grid Reveal / Matrix Orb 三级，**项目首个三级菜单**），重跑验证全部跳过、无重复插入。② 四端 7 页占位（28 文件）：React / Next 新建 `components/common/placeholder-page.tsx`（图标 + 标题 + 描述，与 Vue / Nuxt 既有 `PlaceholderPage.vue` 同构），Vue / Nuxt 复用既有组件；i18n `menu.playground.*` 10 键 + `features.playground.placeholder` 四端 zh-CN / en 同步（node 脚本按字母序插入，16 文件 round-trip 校验后仅新增行）；Vue / Nuxt `MENU_REQUIRED_PATHS` + `ROUTE_TITLE_KEYS`、Next `route-title.ts` 登记 7 路径（React / Next 菜单门卫为「非登录白名单即受控」，无需登记）。
- **关键决策 / 与计划的偏离**：**页面节点声明 `SEARCH` 位而非计划的「保持 0」**——实施前核实：角色授权抽屉勾选写入的是菜单声明位（`node.permissions || "0"`），而 `MenusService.buildAllowedMenuIds` 只把 `role_menus.permissions != 0` 算作可见，0 位页面对普通角色永远不可见（线上「异常页」三子页即处于该状态，已备案 `code-review-backlog.md`）；SEARCH 是项目事实上的「可查看」位，演示页仅声明它，授权后即可见、无其他按钮。目录节点保持 0 位 + `to = NULL`（线上目录现状均为 NULL，避开 `menus_to_unique` 部分唯一索引）。super_admin 按 org 迁移脚本同款补录全量位（树节点 `userPermissions` 完整）。`PlaygroundIntro` 骨架顺延为 Phase B 首项（在 React 端定稿，不先在四端各铺一版再返工）。图标：lucide-react 1.x 已移除品牌图标 `github`，GitHub Activity 改用 `calendar-days`；其余 9 个图标名已核对同时存在于 lucide-react 1.33 与 @iconify-json/lucide。
- **验证**：React `vite build`（路由树重生成）+ `tsc` + lint + `check-locales`（与 Next 完全一致）+ test 8 文件 93 用例；Next lint + `next build`（TypeScript 通过，7 条 `/playground/*` 路由注册）；Vue lint + test 9 文件 95 用例 + `build`（vite + vue-tsc）；Nuxt lint + test 9 文件 95 用例 + typecheck（唯一错误为既有 logs P0，本次无新增）。**三级菜单展开态四端代码级核实递归渲染**（React / Next `SidebarGroup → MenuLevel`；Vue / Nuxt `toNavLeaf` 递归 + Nuxt UI 4.11 `NavigationMenu` 经 `ReuseItemTemplate(level + 1)` 递归）。**待用户 GUI 自测**（需登录）：超管侧边栏出现「演示场」及三级展开、7 个占位页可点入并显示图标 / 标题 / 「开发中」文案、标签栏 / 面包屑 / 文档标题正确、中英切换；折叠态第三级形态（Nuxt UI 折叠态 `UPopover` 仅平铺一层子项）与命令面板搜索三级项为计划 §5.1 明确的过检点。
- **文档**：`plan-dashboard-playground.md` §5.0 步骤 1-2 标记完成并记录偏离、§5.1 补图标清单与递归核实结论；`feature-matrix.md` 新增 Playground 行（四端 🔧）；`code-review-backlog.md` 备案「0 位页面普通角色不可见」；`AGENTS.md` §19 指针同步。

### 演示站计划修订：Playground 先行 + 菜单定稿 rare-ui 组件集（2026-09-14，仅文档）

- **决策**（用户拍板三项，评估过程见本条「核实结论」）：① Playground 菜单定稿为 rare-ui 组件集（`code-block` / `animated-counter` / `fluid-orb` / `grid-reveal` / `matrix-orb` / `github-activity`）+ `@number-flow`，含两个二级目录下的五个三级页；旧清单（Smart Ticker / 拖拽 / 富文本 / 加载态集 / 轮播 / auto-animate / Lightbox / 二维码）**整体移除**——拖拽、富文本业务功能已上线无需重复演示。② Vue / Nuxt 端引入 `clsx` + `tailwind-merge` 新增 `cn` 工具函数；React / Next 直接用 `@heroui/react` 导出的 `cn`。③ **Phase A/B Playground 调整为先行、不等 Gate**（纯前端静态演示，与 Nuxt 收尾并发；Gate-1 / Gate-2 改为只约束 Phase 0 与 Phase C），三大功能块新顺序：Playground → 演示上线准备 → Dashboard。
- **核实结论**：`@heroui/react` 确认导出 `cn`（tailwind-variants 封装）；`@nuxt/ui` v4 内部依赖 tailwind-merge 但 `addImports` 只注册 composables，**不向业务代码导出 `cn`**；Vue 端现状无 clsx / tailwind-merge、类名全部手拼；`@number-flow/vue` 官方存在（0.5.2）；rare-ui 为 MIT shadcn registry，组件共同依赖 `motion`，code-block 另需 `prism-react-renderer`，Ai Kit 三件依赖装后核对；React / Next 两端**从未初始化 shadcn**（无 `components.json`），决定手动 vendor 源码、不建 shadcn 基建；`menus` 表 `parentId` 自引用树对三级层级无 schema 约束，菜单数据经共用库单点录入四端自动一致。
- **实施四步**（尚未写代码）：`apps/nest/scripts/playground-menu-seed.ts` 幂等菜单录入（不做默认授权，走 RBAC）→ 四端路由 / 页面占位 + `PlaygroundIntro` 骨架 → React 基准开发 → Next（复用源码）/ Vue / Nuxt（Nuxt UI + 自定义重写）逐端对齐。
- **文档**：`plan-dashboard-playground.md` §1 / §2 / §3.2 / §4.3 / §4.4 / §5 / §6 / §7 / §9 同步重写（§7 新增 `motion` / `prism-react-renderer` / `@number-flow/vue` / `clsx`+`tailwind-merge` / `motion-v`（待评审），移除五个旧依赖；「三端」表述全部改「四端」，Nuxt 首页已核实同为 `PlaceholderPage`）；`AGENTS.md` §19 待办指针同步并合并了两处重复表述。

### Nuxt 对齐：顶栏全屏按钮替换主题切换（2026-09-14）

- **现象**（用户反馈）：Nuxt 端顶栏缺少 Vue 端的 `FullscreenButton`。Vue 端 `AdminLayout` 右侧顺序为「铃铛 → 全屏 → 语言 → 配置抽屉」（主题切换已随提交 `222f42f` 收进 ConfigDrawer），Nuxt 端 M4 平移时 `admin.vue` 注释「FullscreenButton 未列入 M4 平移范围（随需评估）」，右侧第二位仍是 `ThemeSwitch`。
- **修复**：新建 `app/components/layout/FullscreenButton.vue`（逐字平移 Vue 端，`useFullscreen` 经 `@vueuse/nuxt` auto-import、无参默认作用于 `documentElement`）；`admin.vue` 顶栏 `ThemeSwitch → FullscreenButton`，右侧顺序与 Vue 端一致；删除 `ThemeSwitch.vue`（唯一引用已替换）。主题三态切换能力**不损失**——仍在 ConfigDrawer 偏好抽屉与命令面板主题组两处。i18n `layout.fullscreen.enter / exit` 两语言键已随 M0 同步存在，无需补文案。
- **验证**：eslint 净 + test 9 文件 95 用例全绿；`nuxt typecheck` 仅剩既有 P0（`app/features/logs/` 源码缺失，AGENTS §19 已登记），本次无新增错误。全屏切换端到端复测待用户自测（观察点：点击后 `document.documentElement` 进入全屏、图标切为 minimize、aria-label 切为「退出全屏」，Esc 退出后状态同步回来）。

### Nuxt 修复：异常页切换标签栏 / 面包屑冻结在首个页面（2026-09-14）

- **现象**（用户反馈）：菜单进入 `/exception/403` 后再点 404、500，页面主体正确切换，但标签栏不新增、激活态与面包屑一直显示 403。
- **根因**（机制沉淀 mechanisms.md §26）：Nuxt 的 `useRoute()` 是 `nuxtApp._route` **快照**，只在 NuxtPage 的 Suspense resolve 后 `_route.sync()` 才跟上导航；而 `KeepAliveOutlet` 传给 NuxtPage 的 `page-key` 恰好取自这个快照——Suspense 是否 resolve 又取决于 key 是否变化，形成「输入依赖输出」的死锁。异常页三个文件平移时去掉了 `<script setup>`，编译产物无 `__name`，dev 下被 Nuxt keepalive 分支归为同一个 RouteProvider 类型，「同 type + 同 key」凑齐后 Suspense 只 patch 不 resolve，`_route` 永久冻结。普通页面靠组件名不同触发 resolve 未暴露，但代价是每次切页页面组件挂载两次；经编译产物实证 `index.vue` 与 `settings/index.vue` 同名 `index`，控制台 ↔ 系统设置切换踩的是同一个坑。
- **修复**：`KeepAliveOutlet.pageKey` 改取 `router.currentRoute.value.path`（vue-router 实时路由，与 NuxtPage 不传 `page-key` 时的默认行为等价），组件内其余 `route.*` 读取保留 `useRoute()`；三个异常页补回 `<script setup lang="ts">`（对齐 Vue 端写法），`__name` 恢复为 `403 / 404 / 500`。**规则沉淀**（§26）：驱动 NuxtPage 渲染的输入一律取 `useRouter().currentRoute`，`useRoute()` 只用于消费渲染结果的布局展示；页面 SFC 不得省略 `<script setup>`。
- **验证**：eslint 净 + test 9 文件 95 用例全绿；dev server 编译产物比对确认两处修复已生效。异常页 / 控制台 ↔ 系统设置的切换端到端复测需登录态，待用户自测（观察点：标签逐个新增且激活态跟随、面包屑与文档标题同步更新）。

### Nuxt 修复：登录 / 退出布局切换错乱帧（2026-09-14）

- **现象**（用户反馈）：登录成功后「登录页表单变成控制台页面，然后再进入 AdminLayout」，退出同样错序。
- **根因**（机制沉淀 mechanisms.md §25「后续调整」）：① **退出**——`app.vue` 布局缺省分支按 `isAuthenticated` 判定（同日三轮修复引入），`logout()` 内 `clearSession()` 先于导航同步清认证态，布局立刻切 `auth` 却套着仍在渲染的控制台页面，撤销请求返回、`router.push('/sign-in')` 完成后才换成表单（窗口 = 一次网络往返，最长 5s 超时，每次退出必现）；② **登录**——Nuxt 布局经 `#build/layouts` 以 `defineAsyncComponent` 注册、不在 vue-router 导航期加载范围，导航确认后 admin 布局首载空白；`KeepAliveOutlet.beforeResolve` 只判 `isAdminLayoutRoute(to)` 未判 `from`，登录导航（/sign-in → /）也进路由 VT，afterEach + nextTick 放行时布局未就绪，VT 捕获的新帧是空白，动画结束后布局与页面才「跳」出来。Vue 端 `AppShell.vue` 布局纯路径判定 + 静态 import、React 端 KeepAliveOutlet 挂在 AdminLayout 内部，均无此问题。
- **修复**：`app.vue` `layoutName` 缺省分支改**纯路径判定**（`isAuthLayoutPath` → auth / `isAdminLayoutRoute` → admin / 否则 empty，对齐 Vue 端 AppShell；§25 防护仍成立——Nuxt 客户端入口 `await applyPlugins` 后才 mount，router 插件在该阶段无条件 `await router.isReady()`，首帧 route 已是守卫重定向后的最终位置，源码实证）；`KeepAliveOutlet.beforeResolve` 增加 `isAdminLayoutRoute(from)`（仅布局内页面切换播 VT）；`sign-in.vue` setup 内 `void import('@/layouts/admin.vue')` 预热 admin 布局 chunk（Vite 解析为与 `#build/layouts` loader **完全相同**的模块 URL，dev 下含同一 HMR 时间戳，实测一致）。
- **验证**：eslint 净 + test 9 文件 95 用例全绿；IAB 复测无痕直访 `/settings/users` → 一步 `/sign-in?redirect=/settings/users`、`navType=navigate`、**零 /api 请求**、admin 布局未挂载 ✅，登录页渲染正常 ✅。登录 / 退出的端到端视觉复测需真实凭据，待用户自测（观察点：登录后不再有空白 / 无布局的中间帧；退出后控制台页面不再被套进登录页外壳）。

### Nuxt 修复：登录页无限循环 + 二级跳变丢 redirect 参数（2026-09-14）

- **现象**：nuxt dev 登录页无限循环（`/sign-in?redirect=/` ↔ `/sign-in` 白屏循环）；随后用户反馈干净直访首页也有「先 `/sign-in?redirect=/` 再刷新跳裸 `/sign-in`」的二级跳变，与其他端不一致。
- **根因与修复**（机制结论沉淀 mechanisms.md §25）：① **无限循环**——M4 全局挂载的 `KeepAliveOutlet` 打破「菜单查询靠 Admin 布局隔离」的三端同构前提，未登录直访时 `useMenus()` 无 token 请求 `/menus` → 401 → api-client 硬跳登录页 → 整页重载 → 循环（临时 server middleware 打点实证 6 秒 30 次 noauth 请求）；修复为该组件菜单查询加 `enabled: isAuthenticated` 门控。② **二级跳变**——残留过期 token 直访时守卫放行 → `/auth/me` 401 → `redirectToSignIn()` 原实现不带 `redirect` 参数，登录后无法回跳；修复为携带当前完整路径（登录页自触发不带参数防自指）。**跨端备案**：React / Vue 端 `redirectToSignIn` 同构不带参数，后续按需统一。
- **验证**：IAB 五场景实测（干净直访 / 过期 token 直访 / 过期 token 登录回跳 / 已登录访问登录页弹回 / 已登录刷新保持）全部通过；lint 净 + test 9 文件 95 用例全绿。诊断用临时 middleware 已删除。
- **同日二轮收敛（用户无痕复测后拍板）**：redirect 参数规则统一为 **Next 端 `buildSignInRedirect` 既有规则**——根路径 `/` 跳登录页**不带参数**，其余业务路径保留 `redirect`。nuxt 守卫①与 api-client `redirectToSignIn` 两处同步；复测：无痕直访 `/` → 一步裸 `/sign-in` ✅、`/settings/users` 直访保留参数且登录后回跳原页渲染正常 ✅（`/settings/logs` 回跳后 404 为 logs 模块源码缺失的既有 P0 待办所致，与跳转逻辑无关）。
- **同日三轮（用户三报「进入登录页又刷新」，文件打点抓到真根因）**：一轮修复只挡住了 KeepAliveOutlet 自己的菜单查询，**更底层根因是 `app.vue` 布局选择 `route.meta.layout ?? 'admin'`**——初始导航未完成 / 守卫重定向前的首帧缺省挂载 admin 布局，其副作用（admin.vue 的 `useMenus` + `NoticeBell` 未读数轮询）在未登录态发出 noauth 请求 → 401 → `redirectToSignIn` 登录页分支 `assign` 同 URL 造成整页重载（Vue / React 端布局由根组件按认证态控制、未登录不挂 AdminLayout，故无此问题）。修复：① `layoutName` 缺省分支改 `isAuthenticated ? 'admin' : 'auth'`（治本）；② `redirectToSignIn` 登录页分支改 return 不再重载（防御）。3002 冷启动实例 + 文件打点复测：无痕直访 `/` 全程**零 /api 请求、无重载**，业务路径直访保留参数、登录后回跳且全部请求带 Bearer。机制结论完整版见 mechanisms.md §25（已重写因果链）。

### 品牌标识审计：补齐 Next 文件约定图标 + `.workbuddy/` 出库（2026-09-14）

- **审计范围**：按用户要求逐端核对「`apps/*` 替换是否完整」——覆盖 `public/` 资产、HTML / `metadata.icons` 声明、组件引用路径，以及**框架自身的图标入口**（框架约定常绕过显式声明）。
- **发现并修复的缺口（Next 端，真实生效路径被漏掉）**：`apps/next/src/app/{favicon.ico,icon0.svg,icon1.png,apple-icon.png}` 属 Next App Router 的 **file-based metadata**，其优先级**高于** `layout.tsx` 的 `metadata.icons`——即浏览器标签页 / 桌面图标实际取的是这一组，而上一轮只替换了 `public/`，该组仍是旧品牌（`icon0.svg` 为 RealFaviconGenerator 生成的内嵌 base64 位图包装，`favicon.ico` 栅格可见仍是旧的「左柱 + 右侧竖条」字形，与新 Monogram B 的双碗结构不同）。已纳入 `build-assets.py` 统一生成：`favicon.ico` ← `assets/logo/favicon.ico`、`icon0.svg` ← `favicon.svg`、`icon1.png` ← 图标几何 96px、`apple-icon.png` ← 品牌几何 180px；四个文件与各自来源 **sha1 完全一致**。文档：`ui-spec.md` §19.3 补登记表、§19.4 硬性规则 5 与 §19.6 输出清单同步（变更记录补 v1.5），`AGENTS.md` §19 品牌标识指针加约束。
- **审计结论（其余部分完整）**：五端 `public/` 均已装配 `logo.svg` / `logo-dark.svg` / `favicon.svg` / `favicon.ico`（react / next 另有历史资产 `favicon_light.svg`）；代码侧引用全部命中新资产——React（`layouts/components/app-sidebar.tsx`、`routes/(auth)/route.tsx` 的 `import logo`）、Next（`app-sidebar.tsx`、`(auth)/auth-page-shell.tsx`）、Vue（`components/layout/SidebarBrand.vue`、`layouts/AuthLayout.vue`）、Nuxt（`app/components/layout/SidebarBrand.vue`、`app/layouts/auth.vue`）、website（`components/logo.tsx`）均指向 `/logo.svg` 或 `/logo-dark.svg`；`nest/` 为纯后端、无静态目录，符合预期。各端标签图标入口：React / Vue 走 `index.html` 的 `<link rel="icon">`；Next / website 走 `app/` 文件约定（website 无该组文件）+ `metadata.icons`；Nuxt 无 head 声明、依赖浏览器默认 `/favicon.ico`（既有状态，非本次引入）。
- **未处理（登记备案）**：① `apps/{react,vue}/dist/` 为本地构建产物（各端 `.gitignore` 已忽略 `dist`），其中仍是旧图标与 `/vite.svg` 引用，重新构建即刷新，无需处理；② Next 端同时存在 `src/app/manifest.json`（文件约定）与 `public/site.webmanifest` + `metadata.manifest`，前者优先，两者引用同一组 PNG（无破图），属既有双来源，未在本次资源范围内改动。
- **仓库卫生**：`.gitignore` 新增 `/.workbuddy/`——该目录只存 Agent 本地产物（`design/` 设计过程稿、`memory/` 会话记忆、缓存），不入库；`assets/`（品牌真源）与新增的 `apps/vue/public/favicon.ico` 保持追踪。⚠️ 副作用：日后若把项目级 Skills 放进 `.workbuddy/skills/`，需改写为 `/.workbuddy/*` + `!/.workbuddy/skills/` 白名单形式。
- **`preview.png` 标题**：移除 `（方案 03 Monogram B · 精修版）` 后缀，只保留「Better Admin — Logo 资源预览」——方案名已在 `ui-spec.md` §19.1 登记，预览图标题保持中性。

### 品牌标识定稿：方案 03 Monogram B 精修 + 全套资源落地（2026-09-14）

- **产出**：新增 `assets/logo/` 作为品牌标识**单一真源**（`logo.svg` 主版本 currentColor 挖空 / `logo-dark.svg` 黑底白块 / `logo-light.svg` 白底黑块 / `favicon.svg` 图标几何双态 / `favicon-light.svg` 单态 / `favicon.ico` 16·32·48 / `logo.png`、`logo-dark.png` 256 / `preview.png`），并装配到五端 `apps/{react,vue,next,nuxt,website}/public/`（含 8 类派生位图，沿用仓库既有文件名与像素尺寸，**零代码改动**）。
- **精修内容（结构不变，只调比例 / 间距）**：两碗垂直间距 `16 → 24`；竖柱宽 `46 → 52`、高 `136 → 128`（与碗组上下齐平）；碗高 `60 → 52`；字腔 `44×30 / 46×30 rx15 → 36×32 rx14`；整体安全区收敛为居中 `128×128`（`64–192`，原横向 `68–186` 不对称）；横向咬合 `8 → 4`。核心目的：16px 下两碗间距由 `1.0px` 提到 `1.5px`，避免被误读成「日 / 18」。
- **关键决策 · 双几何策略**：**品牌几何** `64–192`（占画布 50%，克制；用于字标 / ogimg / apple-touch-icon / maskable 图标）与**图标几何** `52–204`（占 59.4%，饱满；用于浏览器标签 16 / 32——16px 下竖柱 `4px`、两碗间距 `2px`、字腔 `3×2.25px` 仍读作 B）。二者是同一套比例规则的两档留白，**不是两套图形语言**；`favicon.ico` 非 maskable，故可安全使用更满构图（圆角后墨迹最远点 99.2 < 安全圆半径 102.4）。
- **关键决策 · 单文件自动反色**：主版本 `logo.svg` 用 `currentColor` + `<mask>` 挖空（白色保留 / 黑色打孔），改 `color` 即反色；亮暗静态变体**共用同一份几何、只换填充色**（色值仅在 CSS 变量默认值中出现，可被 `--ba-logo-plate` / `--ba-logo-mark` 覆盖），不维护第二份几何定义——满足「禁止维护两份独立文件」与「亮暗逐像素等价」两条约束。
- **验收（脚本自检，可复现）**：亮暗两版 128px 逐像素角色比对 **不一致 `0`**（Alpha 最大差 `0`，两版字块均 `2913` 像素）；唯一 `30` 像素差位于圆角外缘 `alpha ≤ 31` 的 8bit 预乘毛边，已单列为忽略区；`favicon.ico` 内含 `16 / 32 / 48`；`logo.svg` hex 色值扫描为空（仅 `currentColor`）。
- **顺手修复（审计中发现，与本次资源直接相关）**：`apps/react/index.html` 移除模板残留的 `<link rel="icon" href="/vite.svg">`（`public/vite.svg` 早已不存在，死链会干扰浏览器标签图标的选取）与前面一条重复的 `viewport` meta（该条缺 `viewport-fit=cover`，若被优先采纳会削弱 iOS 安全区适配）。
- **生成入口**：`assets/logo/build-assets.py`（唯一入口，与资源同目录、路径相对仓库根可移植；替代原先放在 `.workbuddy/design/logo-drafts/` 的位置）；设计过程稿 `.workbuddy/design/logo-drafts/compare.html`（三方案并排 / 精修前后 / 像素放大自检）与同目录 `build-compare.py`。
- **已知限制**：① 品牌几何在 16px 下笔画偏细（碗的上下环边仅 `0.625px`），故 16px 场景一律用图标几何，**不要**把品牌几何下放到 16px 标签页；② `assets/logo/` 与 `apps/*/public/` 的 `logo-dark` 命名语义**相反**（前者按图形外观、后者按适用主题），已在 `ui-spec.md` §19.3 立表对照，本次未重命名以免破坏现有 `import logo from "/logo.svg"` 引用。
- **文档同步**：`docs/ui-spec.md` 新增 §19「品牌标识资源（Logo / Favicon）」（几何常量 / 命名对照 / 硬性规则 / 验收结果 / 生成方式），变更记录补 v1.4 行并顺延为 §20。

### 仓库结构重组：六端迁入 apps/（2026-09-14）

- **变更**：`react` / `vue` / `next` / `nuxt` / `nest` / `website` 六个应用目录整体 `git mv` 迁入 `apps/`（1309 文件全部 rename 保留历史；根目录只留 `apps/` + `docs/` + `scripts/` + `.agents/` 等工程设施）。**决策：不引入 pnpm workspace**——单一根 lockfile + 依赖提升会破坏「各端独立 install / 独立 lockfile / 按 `apps/<name>` 子目录独立部署」的既有架构（AGENTS §3 独立性原则）；目录分层只是仓库组织约定。
- **时机依据**：四端均未上线，部署平台 Root Directory 尚未绑定——统一上线时直接用 `apps/<应用名>` 新路径，零线上成本（若上线后改需同时动 Vercel ×3 + CF Pages ×2 + Render ×1）。
- **脚本与 CI 路径同步**：`scripts/sync-versions.mjs`（SUB_PROJECTS 加 apps/ 前缀）；`.github/workflows/check-locales.yml` 与 `clean-logs.yml`（`cache-dependency-path` / `working-directory`）；`apps/website/scripts/sync-docs.mjs`（repoRoot 改为向上两级到仓库根 + 源路径 `nest/docs/*` → `apps/nest/docs/*`——**唯一真正断链的脚本**，其余 locales 类脚本的兄弟相对引用（`../react`、`../..` + `react`）随整体平移恰好继续有效，仅把 vue / nuxt `sync-locales.mjs` 语义漂移的 `repoRoot` 变量改名 `appsRoot`）。
- **依赖重装暴露的两个既有问题（均非本次移动引入）**：① **nuxt 端 `pnpm-workspace.yaml` 补 `trustPolicyIgnoreAfter: 525600`**——其 packageManager 钉 pnpm 12（其余端 11.x），pnpm 12 默认启用的供应链策略对 `semver@6.3.1` / `undici-types@6.21.0` 等存量老包报 trust downgrade 误报，按 next 端既定方案补配；② **next 端 frozen install 曾报 lockfile overrides mismatch**——为 install 中间态误报，`--no-frozen-lockfile` 重新解析后写回内容与 HEAD 完全一致（零 diff，overrides `@internationalized/date` 终态 3.12.4 与 workspace 声明一致）。
- **文档同步**：AGENTS §3 结构树 / §4 表 / §7.1 / §13（`apps/nest/docs/*`）/ §15 / §17（Root Directory 表述）/ §20（Next 内置 docs 路径）/ §21；README（结构表树 + `cd apps/*` + 进度小节顺手修正「Nuxt 立项待决策」→「M0-M5 完成」）；docs 现状类 12 篇批量加 `apps/` 前缀（sed，含 `../nest/...` 相对链接修复）；**progress.md 历史条目按「现状与历史分离」原则一律不回改**。
- **验证**：`pnpm sync-versions` 五端一致 0.2.0；check-locales 三向（next↔react / nuxt↔react / react↔next）全部一致；react 端 lint 0 error / test 8 文件 93 用例 / build 三绿；nuxt 端 lint 净 / test 9 文件 95 用例全绿；website `sync-docs.mjs` 同步 14/14 篇、`apps/nest/docs/*` 到位（3 条「链接未重写」警告均为既有：nuxt-plan / plan-dashboard-playground 不在同步清单、openapi.yaml 非 md）。
- **⚠️ 验证暴露的既有缺陷：nuxt 端日志管理模块源码从未进仓库**——`apps/nuxt/.gitignore` 沿用 Nuxt 模板默认的不锚定 `logs` 规则，把业务目录 `app/features/logs/` 整个忽略（react 端 `.gitignore` 早已用 `/logs` 锚定根目录修过同一问题，vue 端正常追踪），HEAD 中不存在、当前工作副本也不存在、无 stash / 分支可恢复，`pages/(authenticated)/settings/logs.vue` 引用悬空 → **nuxt typecheck / build 在干净 clone 下本就不可通过**（M2 期本地能过是因为文件当时未追踪地存在于开发机）。本次只修 `.gitignore`（`logs` → `/logs`，对齐 react 端）；**LogsPage 模块按 vue 端 `src/features/logs/` 重新平移属业务代码，登记 §19 待办、待用户安排**。

### Nuxt M5：文档收尾（2026-09-13；部署与线上冒烟随四端统一上线）

- **范围调整（用户指示）**：M5 仅执行文档收尾；Vercel 部署 nuxt.baiwumm.com 与线上冒烟**延后**，随四端统一上线一并执行（§17 统一上线清单）。
- **mechanisms.md 增补 Nuxt 期机制结论四节（§21-§24）**：§21 KeepAliveOutlet 保活宿主在 NuxtPage 下的失效机理（slot 直通 / 冻结 vnode 两形态实证）与 NuxtPage 内置 keepalive 重写要点（含取证手法：`__vueParentComponent` 组件链 / `__v_cache` / 实例 uid 对比）；§22 @nuxtjs/i18n v10 接线三坑（vueI18n 路径相对 restructureDir / files 加载绕过插值归一化 / 非组件取词 `$i18n` + i18n-bridge）；§23 依赖治理三条（TS 6→5.9.3 降级、noUncheckedIndexedAccess 双通道注入、@internationalized/date 双实例名义类型不兼容）；§24 图标零外网（serverBundle.collections 整包 + fallbackToApi:false，clientBundle 无 collections 选项的包内查证）。
- **版本同步**：根 `package.json` version 0.1.0 → **0.2.0**（minor：Nuxt 端全栈完成的增量节点），`pnpm sync-versions` 五端一致（react / vue / next / nuxt / nest 均为 0.2.0）。**git tag 留待四端统一上线时打**（release 语义）。
- **feature-matrix 终核**：Nuxt 列 26/27（96%）与 M0-M4 各条目核对一致，仅剩 Dashboard ❌；AGENTS §19 与 nuxt-plan 状态行同步（M0-M4 完成、部署待统一上线）。
- **无需处理**：契约 / Schema 零变更（Nuxt 端全程消费既有 openapi v1.9.0）；`nest/docs` 不涉及。

### Nuxt M4：增强特性与收尾——Nuxt 端功能对齐全部完成（2026-09-13）

- **范围**：`docs/nuxt-plan.md` §6 M4 全部任务，只动 `/nuxt` 与 `docs/`。验收：typecheck 0 错 / lint 净 / test **9 文件 95 用例**全绿 / build 成功 / dev 正常 + GUI 实测（保活 / 关闭销毁 / 偏好九项 / 主题切换持久与重置 / ⌘K / 键盘可达）。
- **平移内容（约 3,100 行）**：design-theme-store（376 行）+ themes 五纯模块（primary-colors / radius / color-vision / route-transitions / transition-direction，含 runViewTransition 揭示动画）+ ConfigDrawer 与 prefs 十组件 + TagsBar（593 行）+ tabs-store / tabs-model（319 行，32 用例）+ route-vt + KeepAliveOutlet + CSS 四件（tags-bar / theme-transition / route-transitions / color-vision）+ themes 用例（21 用例）。**恢复 M0/M3 摘除点**：auth-store resetTabs、language-store clearTabsCache、NoticeDetailPage syncMeta（公告标题标签 + 面包屑两级）、命令面板主题组接 design-theme-store（揭示动画单一真源）。**NoticeBell 挂入 Header 首位、ConfigDrawer 接入双布局**（Auth 右上角与 Admin Header）。
- **核心机制重写：KeepAliveOutlet 保活宿主（Nuxt 内置机制适配）**。Vue 端「按路径命名宿主 + KeepAlive include=path」在 NuxtPage 动态渲染下两种形态均失效（slot 直通形态停用实例跟随路由重渲；h(props.page) 冻结形态不缓存——经 `__vueParentComponent` 组件树取证与 `__v_cache` 缓存 Map 实证定位），最终改用 **NuxtPage 内置 keepalive**（nuxt-plan §4 内置机制优先）：include 按页面组件名匹配，path→组件名映射经 route.matched 实时记录并随 sessionStorage 持久化；刷新 = pageKey 递增强制重挂载 + include 摘一拍剪除；VT 编排（beforeResolve 捕旧帧 → 提交 → nextTick 放行捕新帧）与方向感知照蓝本挂同组件。**已知近似（备案）**：同名页面组件关闭其一将一并剪除缓存（仅损失缓存不影响正确性）。
- **design-theme-store 适配**：明暗真源 @vueuse useColorMode → @nuxtjs/color-mode（preference 读写 / value resolved / matchMedia 系统偏好），ThemeMode 值域与模块一致无需 auto 映射；initDesignTheme 经 client plugin 于水合前应用（对齐 Vue 端 mount 前语义）。
- **GUI 实测**：标签追加 / 关闭销毁（重进弹窗消失 = 缓存剪除）/ 重定向正确；**保活弹窗探针跨导航保留**；偏好抽屉九项渲染、主题色 Green→Red 切换（DOM --ui-primary 同步 + localStorage 持久化）、重置复原（回 Green）；命令面板菜单分组拍平 + 主题组切深色（preference system→dark）；标签键盘可达（关闭热区 tabindex=0 聚焦 + Enter 关闭）；401 → refresh → 踢回登录链路再次实测正常。
- **里程碑意义**：**Nuxt 端功能对齐 27 项中 26 项完成（96%，与 React / Next / Vue 持平），仅剩 Dashboard ❌**（随 plan-dashboard-playground.md 统一立项）。剩余为 M5 部署与文档收尾（Vercel 部署 nuxt.baiwumm.com、根 version 同步、feature-matrix 终核）。
- **文档同步**：feature-matrix 基础设施 4 行转 ✅（偏好设置抽屉 / 多标签页 / 命令面板 / 路由过渡动画）；AGENTS §19 指针；nuxt-plan 状态行。

### Nuxt M3：组织中心 + 我的账户（2026-09-13）

- **范围**：`docs/nuxt-plan.md` §6 M3 全部 8 项——组织管理（左树右表）→ 岗位（成员穿透）→ 通讯录（组织树筛选）→ 公告管理（UEditor 富文本）→ 我的公告 → 站内信 → 架构图谱 → Excel 导出 → 我的账户，只动 `/nuxt` 与 `docs/`。验收：typecheck 0 错 / lint 净 / test 7 文件 46 用例全绿 / build 成功 / dev 正常 + 八页走查通过。
- **平移内容（39 文件，约 8,100 行，Vue → Nuxt 逐字）**：org 全套（DeptsPage/DeptFormDialog/DeptLeaderSelect/DeptTree/DeptTreePanel、PostsPage/PostFormDialog/PostMembersDrawer、DirectoryPage、OrgChart/OrgChartNode/OrgChartPage + org-chart-layout 纯函数、directory-export 253 行）+ notice 全套（NoticesPage/NoticeFormDialog（**UEditor 即 Nuxt UI 内置 Tiptap，零自装依赖**）/NoticeScopeSelector/NoticeDetailDrawer/NoticeDetailPage/MyNoticesPage/sanitize（DOMPurify）/notification-api）+ account 全套（AccountPage 双 Tab 六卡/AvatarCropDialog（vue-advanced-cropper WebP 256×256）/TagInput（UInputTags）/PasswordStrength/crop-image）+ **NoticeBell 铃铛挂入 AdminLayout Header 首位**（未读数 + 60s 轮询）。依赖补装：@vue-flow 三件套 / dompurify / vue-advanced-cropper / write-excel-file（**锁 4.1.1**）。
- **蓝本差异备案（2 处）**：① NoticeDetailPage 的 `tabsStore.syncMeta` 公告标题快照写入摘除（tabs-store 属 M4 多标签页，留注释届时恢复；动态详情标题的标签/面包屑两级随 M4）；② TagInput 的 SFC 双块（普通 script 导出常量 + script setup）在合并模块视角触发 import/first（Vue 端规则集未启用），显式 eslint-disable 豁免、块序保持蓝本。
- **GUI 走查**：八页标题/数据/工具栏全部就位——组织树（阿里巴巴/淘宝等真实节点）、岗位 6 行、通讯录 6 行、公告 6 行 + 分页、图谱 **vue-flow 13 节点 + controls**、账户双 Tab（账号/安全）+ 更换头像/删除头像/保存修改卡、铃铛 **「通知 (6)」真实未读数**、公告详情直链 `/org/notices/:id` 渲染（标题复用列表 titleKey 口径正确）、「导出 Excel」按钮触发 + loading 门控（下载落盘不在无头断言内）。
- **文档同步**：feature-matrix 组织中心 8 行 + 我的账户转 ✅（**22/27 = 81%**，仅剩 Dashboard ❌ + 多标签页/偏好抽屉/路由过渡动画/命令面板全量 4 项 P2/P3 随 M4）；AGENTS §19 指针（M4 待开工）；nuxt-plan 状态行。

### Nuxt M2：核心系统管理六模块（2026-09-13）

- **范围**：`docs/nuxt-plan.md` §6 M2——用户（列表范式首立页）→ 角色 → 权限 → 菜单 → 字典 → 日志，只动 `/nuxt` 与 `docs/`。验收：typecheck 0 错 / lint 净 / **test 7 文件 46 用例全绿** / build 成功 / dev 正常 + 六页走查（列表真实数据 / 新建弹窗 13 字段 / 权限门控 / 列设置按钮）。
- **平移内容（约 8,200 行，Vue → Nuxt 逐字）**：六模块 features（UsersPage / UserFormDialog / UserResetPasswordDialog / 链接与角色 Cells / RowActions；RolesPage / RoleFormDialog / RoleGrantDrawer + use-grant-tree 521 行；PermissionsPage；MenusPage / MenuFormModal / MenuTreeSelect；DictsPage 双栏 + 两个表单 + DictTypeItem；LogsPage / LogDetailDrawer）+ DataTable 组合件 8 文件（DataTable / Pagination / BulkActions / SearchReset / Toolbar / ViewOptions / column-setting / table-types，**列设置与首屏骨架行随组件内置**）+ 共享基建（list-store epoch 工厂 / use-list-query / use-permissions 按钮门控 / use-dialog-state / use-column-setting-key / dict-store 业务字典缓存 / format-date / ui 原子组件 spinner·loading-content / UserInfo·PasswordField·ErrorContent）。**UserFormDialog 依赖的 org dept-api / post-api / DeptTreeSelect 预带平移**（M3 组织中心的前置叶子，M3 落其余）。
- **测试平移（7 文件 46 用例）**：permission 9 / route-access 10 / password-validation 9 / list-store 4 / column-setting 9 / use-list-query 2 / locales 3；vitest 环境从 node 切 **jsdom**（column-setting 消费 localStorage，对齐 Vue 端全局 jsdom 策略）。
- **依赖补装**：@tanstack/vue-table 8.21（v8 对齐 UTable）/ zod 4.6 / sortablejs + @types / reka-ui 2.10.3（授权抽屉 Tree 类型，与 @nuxt/ui 同版）/ @vueuse/integrations 14.4 / @internationalized/date / jsdom。
- **根因修复：@internationalized/date 双实例**——模板期 lockfile 固化 reka-ui → 3.12.1，`pnpm add` 装出 3.12.4 根实例；该库类含私有字段（名义类型），跨实例不兼容导致 UInputDate 的 `CalendarDate` v-model 全部报型不匹配（错误信息 `InputDateModelValue<boolean>` 有误导性，曾试错 allowArbitraryExtensions 关闭/恢复与 `:range` workaround 后定位真因）——pnpm-workspace overrides 统一 3.12.4 根治，全部 workaround 撤销。**顺带修复 @nuxt/eslint 自动合并导入引入的 TS2206**：`import type {A}` + `import { type B }` 被合并为 `import type {A, type B}`，在 Nuxt 开启的 verbatimModuleSyntax 下非法——改为 `import type {A, B}`。
- **蓝本差异备案（3 处，均为 lint 规则差）**：dict-store / use-grant-tree 的动态键 `delete` 加 eslint-disable 注释（Vue 端规则集未启用 no-dynamic-delete，行为不变）；DictTypeItem 的 `const props =` 改裸 `defineProps`（props 未在 script 消费，模板访问不受影响）。
- **走查记录**：登录 → redirect 回跳 `/settings/logs` 正常；六页标题 / 行数 / 工具栏（搜索·重置·筛选·新增·列设置）全部就位；新增用户弹窗 13 字段（含组织/岗位/主岗/入职日期/性别，占位符 `name@example.com` 验证 @ 转义）；分页与「每页条数」随组件可用；期间令牌过期触发的 401 → refresh → 踢回登录链路亦实测正常。

### Nuxt M1：服务端全量移植 + 契约冒烟（2026-09-13）

- **范围**：`docs/nuxt-plan.md` §6 M1 全部任务，只动 `/nuxt` 与 `docs/`。验收：`typecheck` 0 错 / `lint` 净 / `test` 3/3 / `build` 成功 / `dev` 正常（五绿）+ 契约冒烟脚本 20 只读端点 diff 通过 + GUI 实测前端消费真实 `/menus` 数据。
- **服务端全量落地（Next → Nitro 逐字平移）**：`server/lib` 补齐 `pagination` / `password-policy` / `avatar-storage` / `route-auth`（h3 版 requireAuthUser）/ `constants`（app/lib）+ 11 个业务 service（dict / logs / menus / roles / users / posts / depts / notices / notifications / account，合计约 6,400 行，import 路径统一映射、`server-only` 移除、业务逻辑零改写——`token_version` 实时校验 / 软删 / 日志 action 命名 / `super_admin` 保护逐行保留）；`server/api` **70 个方法文件**（44 个契约路径：auth 4 + permissions 1 + dict 9 + menus 6 + roles 6 + users 6 + logs 4 + org 14 + notifications 4 + account 6；Next 的 `GET/POST/PUT/DELETE/PATCH` 具名导出逐一转为 Nitro 方法后缀文件）。`route-metadata.ts`（Next 服务端 metadata）按 D1（ssr: false）判定跳过。
- **契约冒烟脚本**（M1 验收硬性项）：`scripts/contract-diff.mjs`——同一 admin 账号分别登录 Nuxt 与 Nest，对 20 个只读 GET 端点做结构 / 字段级 diff（忽略时间戳类易变字段；校验 Content-Type 防 SPA HTML 假 200）。结果：**17 端点完全一致 + 2 类已记录既有差异**（`/permissions` 的 label：Nest 中文 vs Next/React/Nuxt 英文键名；`/users` 的 tags：Nest null vs Next/Nuxt 归一化 `[]`——均为 Nest 与 Next 蓝本的既有差异，Nuxt 对齐 Next）+ **0 未知差异**，退出码 0。
- **前端接线**：删除 M0 静态种子菜单（`menu-seed.ts`），`menu-fetch.ts` 恢复与 Vue 端同构的直连实现（失败回退仅「控制台」节点）；`app/lib/api-types.ts` 的 User 接口补 `phone` / `tags`（对齐 Next 端 api-types，users-service toView 消费）并移除 `tokenVersion`（Next 端契约视图不含该内部字段）。
- **脚本平移**：`scripts/clean-logs.mjs`（.env 最小加载器替代 dotenv）与 `scripts/check-locales.mjs`（对比 react 与 nuxt 语言包，值对比前归一化 `{'@'}` 转义，实测 14 文件完全一致）。
- **工具链裁决（三项，均已注释进代码）**：① **TypeScript 6.0.3 → 5.9.3**（Nuxt 模板默认 6.0.3 对 drizzle 0.45 的数组解构类型推断产生 30+ 处 `T | undefined` 误报；Next 5.6.3 / Vue 5.9.3 均无——降级对齐 Vue 端实际解析版本）；② **关闭 `noUncheckedIndexedAccess`**（Nuxt 4 默认开启而 Next / Vue 均未开启，经 `typescript.tsConfig.compilerOptions` 注入全部生成的 tsconfig；Nuxt 该选项顶层形状无法触达 nitro 侧，另经 `nitro:config` hook 兜底）；③ `vue/no-multiple-template-root` 维持 M0 裁决。
- **过程教训（记录给后续里程碑）**：批量 heredoc 写文件时 cwd 曾两次漂移——一批端点文件被误写到 `/next/src/app/api/`（已全部清除，`git status next/` 干净）与 `nuxt/` 根（已归位）；**contract-diff 首轮 `GET /api/menus` 的假 200 即由此暴露**（SSR 关闭时未命中的 API 路径兜底返回 SPA HTML），脚本因此加了 JSON Content-Type 校验。
- **GUI 冒烟**：登录 → 侧边栏渲染 **DB 真实菜单树**（含静态树没有的「异常页」分组，证明消费真实 `/menus`）+ 面包屑；契约冒烟期间本机 DNS 对 Supabase pooler 间歇故障（Nest 与 Nuxt 同时受影响）导致的 500 属环境噪音，恢复后全绿。
- **文档同步**：`feature-matrix.md` 统计说明补 M1 条目（各功能行状态不变——前端页面随 M2/M3 平移，服务端已全部就绪）；`AGENTS.md` §19 指针；`nuxt-plan.md` 状态行。

### Nuxt M0：工程基建与骨架 + 认证最小闭环（2026-09-12）

- **范围**：`docs/nuxt-plan.md` v1.3 M0 全部 7 项任务，只动 `/nuxt` 与 `docs/`。验收**五绿**（`dev / build / lint / typecheck / test`）+ 认证闭环 curl 实测 + 浏览器 GUI 冒烟通过。
- **模板清理与工程化**：删演示页（`index.vue` / `TemplateMenu.vue` / `AppLogo.vue`）、模板 CI（子目录 `.github/` 对 GitHub Actions 不生效，直接删除）与 `renovate.json`；`pnpm-workspace.yaml` 仅留 allowBuilds；图标卸载 `simple-icons` 装 `logos`，`nuxt.config` 配 `icon.serverBundle`（lucide/logos 整包进 Nitro，覆盖 DB 动态菜单图标名）+ `clientBundle.scan` + **`fallbackToApi: false`**（运行时零外部网络依赖——`clientBundle` 无 collections 选项，整包集合由 serverBundle + 本地 API `/api/_nuxt_icon` 承担，与计划 §4 拍板意图一致）；新增 vitest（`@nuxt/test-utils` `defineVitestConfig`）+ `test` 脚本 + `.env.example`；`dev` 脚本固定 `--port 3001`（避免与 Nest 的 3000 冲突）。
- **服务端地基（Next → Nitro 平移）**：`server/db/{schema,relations,client}`（D4 逐字复制，client 移除 `server-only`）、`server/lib/{http,ids,permissions,route-helpers,auth-cookies}`、`server/lib/auth/{tokens,session,cookies,request-auth}`（tokens/session 逐字平移；cookies/request-auth/route-helpers 为 h3 适配层：`NextResponse.cookies` → `setCookie(event,…)`、`NextRequest` 双源 → Bearer 头 + `getCookie` 回退，信封与错误语义逐字对齐）；`server/api/auth/{login,logout,refresh,me}` 四端点对齐 Next route handler。**curl 实测**：登录（rememberMe 分档）/ me 双源（Bearer + Cookie 各 200）/ refresh 轮换（新 refresh ≠ 旧值）/ 旧令牌重放 401 / 错误密码 401 / 登出 204 且撤销生效。
- **前端平移与接线**：`app/lib`（api-types / route-access / permission / menu-utils / profile-links / progress / query-client 逐字；env 改 plugin 注入快照、api-client 错误文案改 `i18n-bridge` 解耦——两者因 Nuxt 上下文限制，模式对齐 `bindAuthSnapshot` 惯例）、`app/stores/{auth,language}`（平移，tabs-store 依赖留注释待 M4）、`app/middleware/auth.global.ts` 三层守卫（路由进度条由 NuxtLoadingIndicator 承担，不再在守卫触发）、`app/layouts/{admin,auth,empty}`（布局分支由 AppShell 组件改 Nuxt layouts 机制 + `definePageMeta layout`，内置机制优先）、`app/pages` 24 个 URL（登录页完整平移 + 22 占位 + catch-all）、Header 操作区（Theme/Language/UserMenu + UDashboardSearch）。**M0 静态菜单**：`/menus` 端点属 M1，`menu-seed.ts` 静态树（结构与 nest seed 菜单一致）驱动侧边栏 / 守卫第③层 / 命令面板，M1 端点就绪后仅改 `menu-fetch.ts`。
- **i18n（D3）**：`@nuxtjs/i18n` v10 `strategy: 'no_prefix'`；**语言包不走 `locales[].files` 加载**——React 语言包用 i18next 双花括号插值（`{{status}}`），vue-i18n 需单花括号，Vue 端在 createI18n 前运行时归一化；Nuxt 端在 `i18n/vue-i18n.config.ts` 显式 import 七域 JSON 合并 + 同一份 `normalizeInterpolation` 归一化（与 Vue 端同构，源 JSON 与 React 零漂移）；`locales[].files` 移除、`vueI18n` 路径**相对 `i18n/` 目录**（非项目根，包内源码核实）；非组件取词经 `useNuxtApp().$i18n`（`getI18nTarget` 全局 Composer）绑入 bridge。sync-locales 幂等转义实测（`features.users.form.emailPlaceholder` → `name@example.com`）。locales 一致性测试（zh/en 逐域键集合 / 非空 / 前缀，3 用例）平移接入 vitest。
- **进度条双轨（拍板口径）**：路由 = `NuxtLoadingIndicator`（app.vue，`var(--ui-primary)` 2px）；请求 = `@bprogress/vue` + `lib/progress.ts` 状态机（provider/bridge 组件平移），api-client 引用计数不改。
- **依赖与版本治理**：新增 `@nuxtjs/i18n` / `@pinia/nuxt` / `pinia` / `@tanstack/vue-query` / `@bprogress/vue` / `@vueuse/nuxt` / `drizzle-orm` / `postgres` / `jose` / `bcryptjs` / `nanoid` / `@nuxt/test-utils` / `vitest` / `@types/node`。**发现并修复 Vue 双实例崩溃**：新装依赖使 pnpm 解析出 vue 3.5.40 与 3.5.42 并存，reka-ui ConfigProvider 跨实例渲染 slot 时 `currentRenderingInstance` 为 null 抛 `Cannot read properties of null (reading 'ce')`，应用白屏（payload.error 捕获定位）——`pnpm-workspace.yaml` overrides 统一 `vue: 3.5.42`（lockfile 复核 3.5.40 零引用），bundle 由 8.62MB 降至 3.38MB。
- **ESLint 裁决**：`vue/no-multiple-template-root` 属 eslint-plugin-vue 的 **vue2-essential** 规则集（包内源码核实），对 Vue 3 项目被误启用（注释节点 / slot 作模板根在 Vue 3 fragment 下合法）——项目级 `eslint.config.mjs` 显式关闭，stylistic 格式（单引号 / 无分号）由 `eslint --fix` 收敛平移文件。
- **GUI 冒烟（浏览器实测）**：未登录访问 `/settings/users` → 守卫拦截 `/sign-in?redirect=/settings/users`（含 404 路径同口径）；登录 → Admin 布局（Dashboard 套件侧边栏菜单树 / 搜索按钮 / 用户菜单 / 面包屑「系统管理 › 用户管理」）；F5 会话恢复（ensureSession）；i18n 中英切换（菜单 / 文档标题即时刷新 / localStorage 持久化）；主题 dark↔light（html class 即时切换）；登出确认弹窗 → 会话清除 → 守卫重新拦截；catch-all 404 渲染（未登录先拦截、登录后渲染 Not Found 插画页）。
- **文档同步**：`feature-matrix.md` Nuxt 列 6 项转 ✅（认证 / 全站 i18n / 主题系统 / 错误页 / 异常页菜单 / 路由权限守卫；命令面板登记 M0 接线、完成口径随 M4），统计 6/27 = 22%；`AGENTS.md` §19 阶段指针；`nuxt-plan.md` 状态行。**已知边界**：`@nuxt/ui` 的 unifont（google/googleicons provider）在无外网环境 dev 启动报 ERROR——字体为自托管 Maple Mono CN、图标为本地 collection，不影响功能与构建。

### Nest 免费托管决策：留 Render + 保活 ping（2026-09-12）

- **背景**：用户询问 Render 是否最优免费托管。免费托管市场核实（2026 政策）：全托管平台免费层**普遍休眠**——Render 15 分钟不活跃休眠（冷启动 30-50s）、Koyeb 同样 scale-to-zero 且打击保活滥用；真正常驻免费的只有 Oracle Always Free VPS（ARM 4C/24G，需绑卡 + 全自运维）；Railway / Fly / Heroku 免费已取消，Glitch 关停；CF Workers / Supabase Edge / Deno Deploy 运行时不兼容（postgres.js TCP + Nest Express 模型）。
- **决策（用户拍板，写入上线清单标题）**：**Nest 留 Render + 保活 ping**——上线时新增无鉴权 `GET /api/health` 健康端点（当前不存在，已核实；契约补录）+ UptimeRobot / CF Worker Cron 每 5-10 分钟 ping。免费 750 实例小时/月 ≥ 单服务常驻 744h，额度恰好覆盖。Oracle VPS 留作将来升级选项。
- **落档**：AGENTS §17 改写为「**统一上线清单**」（标题级携带保活决策，含 ① 保活 / ② SPA 回退验证 / ③ CORS 白名单 / ④ 各端冒烟 / ⑤ 项目清理五项）；requirements §13 平台分化注记补保活决策；vue-plan §M4 部署清单加「Nest 保活 ping 联动确认」（SPA 首次调用不撞冷启动）。
- **无需同步**：本次仅文档；`/api/health` 代码与契约补录在上线环节执行。

### 部署平台分化拍板：React / Vue → Cloudflare Pages（2026-09-12）

- **背景**：五个站点原规划全部 Vercel（Hobby 免费额度），用户提出额度压力关切。逐站兼容性分析结论：**Next / Nuxt 全栈必须留 Vercel**——服务端数据层走 `postgres.js` TCP 直连，Cloudflare Workers 运行时不支持 raw TCP（Hyperdrive 需付费 + 驱动兼容性存疑；重写数据层违反「行为不变」）；**React / Vue 为纯静态 SPA，迁 CF Pages**（免费静态请求 / 带宽无限）；website 留 Vercel；NestJS 留 Render。
- **前提实测**：`baiwumm.com` zone 已托管 Cloudflare DNS（公共 DNS 查询 NS = `elma / tadeo.ns.cloudflare.com`；`react.baiwumm.com` 现解析即 CF 代理 IP）——CF Pages 绑自定义域前提成立。
- **拍板（用户确认）**：React / Vue → CF Pages；website / Next / Nuxt → Vercel；NestJS → Render。Vercel 由五站收敛为三站（静态带宽大头转走），额度压力显著缓解。**Nest 连接不受影响**：SPA 在浏览器直连 `nest.baiwumm.com/api`（跨域 XHR），与 SPA 托管平台无关，域名不变则 Nest CORS 白名单不变。
- **文档同步**：requirements §13（域名表平台列 + 平台分化说明）、AGENTS §17（部署规范分组）/ §19（待办）、vue-plan §M4（部署清单改 CF Pages：Root Directory / `dist/` / SPA 回退验证 `_redirects` 兜底 / VITE_API_BASE_URL / CORS）。
- **执行时点**：统一上线环节（M5 / §M4 清单），本次仅文档，无代码改动。

### nuxt-plan v1.3：按用户指令对齐实际项目 + Nuxt Modules 优先（2026-09-12）

- 六项指令落地：① §2 新增 **§2.4 行为级对齐补充**（键盘可达性 / DataTable 首屏骨架 / 公告详情 syncMeta / locales 一致性测试 / 进度条状态机，共 7 项）；② 选型翻转为 **Nuxt Modules / 内置机制优先**——主题明暗改 `@nuxtjs/color-mode`（Nuxt UI module 内置）、页面标题改内置 `useHead`、富文本改 Nuxt UI 内置 `UEditor`、拖拽走 `@vueuse/nuxt`，**明确不用 `NuxtLoadingIndicator`**（仅路由进度、无法承载 api-client 请求驱动，行为不一致）；③ §1 新增 **llms-full.txt 开发规则**（https://nuxt.com/llms-full.txt 全文指南，动手前查证）；④ M0 改为基于既有模板（实测 Nuxt 4.5.2 / @nuxt/ui 4.11 / @nuxt/eslint，模板清理与工程化补齐入 M0）；⑤ §5 决策重排——**D3 推荐翻转为 @nuxtjs/i18n v10**（已查证支持 Nuxt 4，`strategy: 'no_prefix'` + 扁平键 resolver）、D5 改「平移代码导入风格」（推荐保留显式导入）、D6 改「工程化口径」（推荐沿用模板 stylistic 不引 Prettier），目录结构由模板确定移出决策表；⑥ 核实 `@bprogress/nuxt` 存在但动手前仍需核对版本可用性。
- 文件：`docs/nuxt-plan.md`（v1.2 → v1.3，修订记录见文档）。
- **同日拍板与补充**：D1-D6 六项均按推荐方案（选项 A）执行；进度条口径定稿——**路由切换进度用 Nuxt 内置 `NuxtLoadingIndicator`，接口请求进度用 `@bprogress/vue`**（BProgress 无 nuxt 子包），双指示器呈现属已确认口径；llms-full.txt 规则升格为 `AGENTS.md` §18 第 8 条硬性规则（跨会话持久生效）。状态：M0 待开工指令。
- **图标选型细化**：`@nuxt/icon` 内置的是解析机制非图标数据——SPA 模式无本地 collection 会回退 Iconify API 运行时请求。定稿：保留 lucide、**补装 logos**（品牌图标 11 处，Vue 蓝本同款，simple-icons 无法替代多色 logo）、**卸载 simple-icons**（Vue 蓝本零使用），M0 配 `icon.clientBundle` 实现运行时零外部依赖（nuxt-plan §4 / M0 已同步）。

### 文档整合批次：requirements 对齐实际业务 + 多源收敛（2026-09-12）

- **背景**：docs/ 全量评估（合并 / 删除 / 简化 / requirements 时效）后经用户拍板执行；目标为「单一职责、规则只在一处」，消除状态类信息多源漂移（评估中已实际发现 react.md 状态严重过时等实例）。
- **requirements.md 对齐实际业务**：§10 重写——**补字典管理（§10.8）与组织中心全套（§10.9，含 8 子模块）**、**权限管理改只读口径**（原文误写「创建/编辑/删除/分配」，实际为位掩码枚举字典）、用户/角色/日志按实际形态修正（三层写保护 / GRANT 位菜单授权 / super_admin 保护 / 字典 log_type 真源）；§9 从「建议使用 OpenAPI」改为事实陈述（`nest/openapi/openapi.yaml` v1.9.0 唯一真源 + 错误码统一登记）；§7.3 补 Vue / Nuxt 的 **UForm + Zod** 口径；**域名收敛 §13 单源**（原 §12.1 / §16 重复列表改为指针），§13 补官方文档站 better-admin.baiwumm.com 与「四端未上线、统一上线」标记；§15 补当前进度指针；文末新增修订记录（§18）。
- **多源收敛**：① `react.md` §5「当前状态」指针化——原文仍写「用户管理为 Mock 页未完成」（Phase 3 前的旧状态），完成状态统一归 feature-matrix + AGENTS §19；② `routing.md` §10 改「已知约束」（完成类 ✅ 条目指针化，routeTree 勿手改 / Drawer 规范等常驻约束保留）；③ **AGENTS §7.2 收敛为策略级**——组件选择规则 4 条、禁止事项、渐进式调整细则单点归 `ui-spec.md` §18.3（细则已补全），`useOverlayState` 硬规则保留在 AGENTS（编码级、高频适用）；④ AGENTS §13 文档体系表补全（nuxt-ui-guide / code-review-backlog / plan-dashboard-playground / vue-plan / nuxt-plan 五份此前未登记）。
- **历史迁移**：`ui-spec.md` §19「Phase 1B 落地记录」迁入 progress.md 的 Phase 1B 条目（落地明细附注），spec 文档不再保存落地流水账；变更记录表补 v1.3 行，原 §20 顺延为 §19。
- **删除项**：无。`vue-plan.md` 生命周期已结束但 §M4 部署清单在统一上线时仍被引用，保留至上线后删除（AGENTS §13 表已注明）。
- **附带定稿**：官方文档站域名改为 **`better-admin.baiwumm.com`**（原规划 docs.baiwumm.com；历史条目按规范不回改）——同步 website 配置（site.ts / opengraph-image / package.json）、AGENTS §19、requirements §13；根目录 `README.md` 简洁重写对齐现状（旧版停留在契约 v1.4.3 / Vue 未初始化时期）。
- **保持不动**：mechanisms.md（机制结论密度高，编号刚修）、progress.md（append-only 规范，体量尚可）、feature-matrix.md、nuxt-ui-guide.md、react-performance.md、code-review-backlog.md、plan-dashboard-playground.md。
- **无需同步**：四端代码与契约均不涉及；`nuxt-plan.md` 按用户指示未纳入本次整理。

### Next 公告详情页标题 metadata 对齐（2026-09-12）

- **背景**：Next 端路由标题服务端化（见 2026-09-12 置顶条目）时 `/org/notices/[noticeId]` 详情页**未加** metadata——动态路由在 `routeStaticMetaByPath` 精确映射中无键，静态加了也会被客户端 hook 水合后回退应用名，登记为「与 React 的既有差异待后续单独对齐」。
- **实现**：① `next/src/lib/route-title.ts` 登记动态路由模板键 `/org/notices/[noticeId]`（titleKey 与列表页 / React 端详情路由 staticData 同源），新增 `findRouteStaticMeta(path)` 做「精确 → 动态段模板匹配」（单段 `[param]` 匹配任意非空段，对齐 React 端 `findRouteStaticMeta` + `matchRoutePattern` 语义），`getRouteTitleKey` / `getRouteStaticMeta` 委托之——客户端 `usePageTitle` 与面包屑（app-header 回退分支）自动受益，水合后标题稳定为「公告管理 - 应用名」不再退化；② 详情页 `page.tsx`（本就是服务端薄壳）导出 `generateMetadata`，初始 HTML 标题按语言渲染；③ `tags-bar` 的标题回退由 `routeStaticMetaByPath.get`（仅精确）切换为 `findRouteStaticMeta`。
- **连带确认**：Next 详情页本就写入 tabs meta（`syncMeta`，React 平移）——面包屑「公告详情 › 标题」两级与标签标题不受本改动影响；模板匹配仅补「无快照时的回退链」。React / Vue 端无对应改动（React 靠路由 staticData 天然支持，Vue `resolveRouteTitleKey` 已有前缀键）。
- **验证**：`next lint`（0 error，21 条存量 warning）/ `next build`（含 TS 全量检查）通过。带登录态的页面标题 / 面包屑走查随统一线上冒烟（匿名访问会被 proxy 重定向，无法离线 curl 实测渲染标题）。
- **无需同步**：数据库 / OpenAPI 契约、React / Vue / NestJS 端均不涉及。

### 契约 v1.9.0：super_admin 绑定不变量守卫（组合场景口径评审落地，2026-09-12）

- **背景**：mechanisms §5 挂着「组合场景口径待评审」。评审结论：绑定守卫只校验操作者权限，超管操作者豁免范围内存在锁死路径——可摘掉 admin 用户的 super_admin 绑定（admin 保护不覆盖绑定变更）或自摘，两超管先后摘绑可使绑定归零，此后所有加绑请求均被 `SUPER_ADMIN_ROLE_BINDING_PROTECTED` 拒绝、无自助恢复手段；且既有校验在事务外，并发摘绑存在 TOCTOU。
- **方案（经用户拍板，方案 A：最小不变量守卫 + 行锁）**：新增 403 `SUPER_ADMIN_LAST_PROTECTED`——`PUT /users/{id}` 移除 super_admin 绑定时，事务内先对 super_admin 角色行 `FOR UPDATE` 串行化（顺带关断 TOCTOU），再校验除目标外仍有「`status=active` 且未删除」的超管绑定。停用用户不计入活跃数（无法登录即不具备超管能力，防「停用最后一个其他超管后自摘」绕过）。归零不可达论证：最后一个活跃超管必然是操作者本人，本人删/停/重置已被 `assertTargetOperable` 规则 1 拦死。被否方案：原子转移 API / 乐观锁（过度设计，转移按「先挂后摘」天然安全；roleIds 并发丢更新按 PUT 语义接受并记录在案）。
- **实现**：`nest/src/modules/users/users.service.ts` 与 `next/src/lib/server/users-service.ts` 同构——update 事务内读目标当前绑定 → 命中移除方向则锁角色行 + 计活跃他人 → 归零抛 403；`POST /users` 仅添加绑定不涉及守卫。契约 `nest/openapi/openapi.yaml` 升 **v1.9.0**（PUT /users/{id} 补 403 响应示例 + 版本注记写明不变量、先挂后摘顺序、并发口径）。
- **前端三端**：`features/users/user-api.ts` 的 `getUserErrorMessage` 新增 `SUPER_ADMIN_LAST_PROTECTED` 映射；`errors.users.superAdminLastProtected` 双语键六份 locales 同步（react / vue / next × zh-CN / en）。
- **测试口径**：nest 无既有测试基建（与三层规则、绑定守卫等既有保护一致），服务端行为以集成冒烟验证——用例清单：自摘被拦（无其他活跃超管）/ 自摘放行（存在其他活跃超管）/ 已停用绑定不计入 / 并发摘绑串行化。
- **文档**：mechanisms §5 组合场景口径闭环（含「用户级操作不归零」论断的适用范围修正）；feature-matrix 用户管理行补 v1.9.0 备注。
- **无需同步**：Vue / Nuxt 端零改动（错误映射属消费端已覆盖）；数据库 schema 不涉及（守卫为查询级）。

### 键盘可达性批次：code-review-backlog #1 / #2 / #4 落地（2026-09-12）

- **背景**：docs 盘点后经用户拍板，按「code-review-backlog 最佳建议方案」执行一批行为级修复（backlog 原则「交互变更需单独决策」的首批落地）。
- **#1 标签关闭热区键盘关闭（三端）**：关闭 span 补 `tabIndex` + Enter / Space 关闭 + focus-visible 焦点环。react / next 在 `TabCloseTrigger`（`stopPropagation` 隔离外层 react-aria Button 键盘 press，防误切页；焦点环 `ring-focus`）；vue 端由 `tabindex="-1"` 改 `0`，`@keydown.enter/space.prevent.stop` + `ring-accented`。
- **#2 组织树键盘拖拽（react / next）**：dept-tree 把手本就可聚焦且内无子交互元素（与列设置手柄同构），复用 KeyboardSensor 先例（`data-table-view-options`）+ `sortableKeyboardCoordinates`，零冲突接入；把手聚焦 Space / Enter 拾起、方向键移动、Esc 取消。**Vue 端 sortablejs 无键盘能力，与标签键盘排序同性质记已知差异**（不做 Alt+方向键自研，维持标签栏既定口径）。
- **#4 标签菜单键盘入口 Shift+F10（三端）**：react / next 把 `openContextMenu` 拆出 `openContextMenuAt(x, y, path)`，在标签 Button `onKeyDown` 以元素中心为锚打开（props 新增 `onKeyboardContextMenu`）；vue 端 reka ContextMenu 无受控 open，`openMenuByKeyboard` 以合成 `MouseEvent("contextmenu")` 派发到聚焦标签——走「标签 → 容器 `@contextmenu.capture` 记录目标 → ContextMenuTrigger」同一条原生冒泡链路，坐标用元素中心。**运行时前提为 reka 不校验 isTrusted，浏览器冒烟若发现不弹菜单则回退为记已知差异**（同 sortablejs 物理拖拽的自动化边界先例）。
- **#5 销项 + 修正既有误判**：核实 vue `AvatarCropDialog` 为 `UModal :dismissible="false"`——禁 Esc + 禁遮罩点击与 react / next 已一致，无需改动。**#3 自绘树 tree 语义维持暂缓**（完整方案需配套方向键漫游，Vue 端 UTree 已合规）；**#6 维持备案**；**进度条 aria 维持待库**——核实 vue 端同为 `@bprogress/vue` 注入 DOM（此前「vue 自研 DOM 可先行」判断有误），三端口径一致。
- **验证**：react `lint`（0 error）/ `build`（tsc + vite）全绿；next `lint`（0 error，21 条存量 warning）/ `next build` 通过；vue `type-check` / `lint`（0 error，5 条存量 warning）/ `test`（95 用例）/ `build` 四绿。**行为边界**：鼠标 / 触屏交互零变化；新增键盘路径不影响 dnd-kit / sortablejs 既有拖拽编排（#1 的 keydown 在 `data-tab-close` 元素上，与 sortable filter、pointerdown 捕获链路无交集）。
- **文档**：`code-review-backlog.md` 重写为「已修复 / 暂缓备案 / 销项」三段；`feature-matrix.md` 多标签页行补键盘可达性备注、组织管理行补键盘拖拽备注。
- **无需同步**：数据库 / OpenAPI 契约不涉及；Nuxt 端待 M0 后随标签栏实现跟进。

### 文档指针清理：上线状态标记 + 待办去虚 + 机制文档编号修复（2026-09-12）

- **背景**：docs/ 全量扫描（历史遗漏 / 技术债 / 待拍板决策盘点）发现多处文档指针滞后，逐项核实代码现状后统一清理。
- **上线状态标记（AGENTS §17，重要）**：**四端均未部署上线**——现 `react / next.baiwumm.com` 响应来自历史旧项目（其余域名未配置），§17 URL 为规划目标；全部版本开发完成后**统一上线**，各端线上冒烟随部署环节执行。`AGENTS.md` §19「Next.js 全栈版已上线」修正为「已完成（未部署）」，`vue-plan.md` 与 `feature-matrix.md` 的「部署由用户手动执行」表述同步改为「随四端统一上线执行」。
- **AGENTS §19 待办去虚**：删除「mechanisms.md 沉淀 Next 期机制结论」（§18 / §19 已在库）；「Next.js Vercel 部署」并入「四端统一上线」，CI 挂接单列（现有 workflows 仅 check-locales / clean-logs 两个 cron）；Nuxt 句更新为「官方启动模板已初始化（`e8f71cd`），D1-D6 拍板后推进 M0」。
- **nuxt-plan v1.2**：状态行由「待评审、不含 nuxt/ 代码」同步为「模板已初始化、业务开发未启动」，修订记录补 v1.2 行。
- **mechanisms.md 编号修复**：§14（UInputDate 桥接）移回 §15 之前；与 §10 撞号的 dnd-kit 条目重编为 **§20** 并移至文末（经查 §10/§14 无任何外部引用，重编号零破坏），全文编号自此连续有序。
- **附带核实结论（历史条目按规范不回改，记录在案防止重复排查）**：`errors.users` 存量五键已补齐（11 键与代码用量一致）；角色模块 GRANT 门控 Vue / Next 均已落地；Next depts / posts 排序白名单已与 nest 对齐（两端 `SORTABLE` 集合一致）。
- **无需同步**：数据库 / OpenAPI 契约与四端代码均不涉及。

### React / Next 端内部收敛：进度条状态机 zustand 化 + useEventListener 收敛（2026-09-12）

- **背景**：React 端优化扫描（经用户拍板，行为零改动）落地两项——① 进度条状态机响应式化
  （Vue 端同款重构的 React/Next 收尾，跨端机制一致）；② 手动事件监听收敛项目级 hook。
- **progress.ts zustand 化（双端）**：状态机展示态 `active` 收进小 zustand store，api-client /
  use-route-progress（next 为 ProgressBinder）直接调 `progressStart/Stop/RouteBegin` 改状态；
  桥接组件由 `bindProgress` 命令式注入改为 `watchProgress` 订阅边沿（react 在 `__root.tsx`、
  next 在 providers 的 ProgressBinder）。**行为零改动的关键**：zustand subscribe 在 setState 时
  **同步**触发，边沿时序与原直接调用完全一致。时序常量（0.3 / 200 / 0）收敛进状态机（与两端
  Provider props 取值一致，那三个 props 仅影响未启用的锚点场景）。
- **next 特有保留点**：`progressStart` 首个飞行请求的 `disableAutoStop()` 必须同步发生
  （早于库在宏任务里检查 isAutoStopDisabled）——`watchProgress` 登记模块级 `boundActions`
  供模块同步调用，stop / enableAutoStop 走订阅；退订时清理登记。
- **useEventListener hook（双端各一份）**：新建 `hooks/use-event-listener.ts`（target / type /
  listener 变化时重订阅，listener 传 null 表达条件监听），各迁移 4 处手动「注册 + 清理」对——
  bulk-actions Esc（未选中不订阅语义以 null listener 保留）、app-header ⌘K、fullscreen-button
  （next 保留挂载即校正）、theme-color-picker 跨标签页 storage。**tags-bar 两端的手动监听有意
  不动**（拖拽编排核心 + 拖拽排序在途迭代）。
- **验证**：react `eslint` / `test`（93 用例）/ `build`（tsc + vite）全绿；next `eslint` /
  `build`（含 TS 全量检查）通过。UX 零变化，feature-matrix 不涉及。
- **无需同步**：数据库 / OpenAPI 契约不涉及；Vue 端已在既有重构中完成同语义收敛。

### 页面标题随语言切换即时刷新：Next sign-in + Vue 全站对齐 React 语义（2026-09-12）

- **背景**：generateMetadata 落地后用户实测反馈——登录后页面（admin-shell 内）切语言标题即时更新，
  但 sign-in 页要刷新才变；Vue 端存在同样问题（全站），React 端正常（根路由 `useDocumentTitle`
  订阅「titleKey + 语言」两来源）。
- **Next**：sign-in 页（admin-shell 之外、唯一带语言切换器的非管理区页面）组件内新增 effect 订阅
  语言 store，切语言即时重写 `document.title`；key 与 sign-in layout 的 generateMetadata 同源，
  终态字符串一致无闪烁。
- **Vue**：标题原在 `router.afterEach` 设置（只随导航更新，切语言不导航即滞留）——新建根级
  `composables/use-document-title.ts`（React 同名文件的 Vue 等价物）挂在 App.vue，watch
  「route.path + locale」即时刷新；guards.ts 的 afterEach 删除（标题逻辑单一来源），签名未变。
  全站受益（管理区页面此前同样受影响，不止 sign-in）。
- **验证**：Vue `lint`（0 error）/ `type-check` / `test`（92 用例）/ `build` 四绿；Next
  `eslint` / `next build` 通过。逻辑与 React 端 use-document-title 同构（路径 + 语言 → 标题）。
- **无需同步**：React 端本就正常；feature-matrix 无功能变化。

### Next 端路由标题服务端化：generateMetadata 进初始 HTML（2026-09-12，提交 113dc2c）

- **背景**：Next 端「平台化」评估的落地项（经用户拍板只做本项）。此前页面标题由 admin-shell 的
  `usePageTitle` 客户端 effect 写入，刷新 / 直链 / 分享场景首帧标题为应用名、菜单加载后才被改写。
- **实现**：20 个叶子路由（控制台 / settings 六页 / org 五页 / account / my-notices / 布局内异常页
  三页 / 全屏 403·404·500）+ 登录页（客户端页面经新建 sign-in 服务端薄 layout）导出
  `generateMetadata`，调用新建 `lib/server/route-metadata.ts` 的 `generateRouteMetadata(titleKey)`
  ——读语言 Cookie → `createI18nInstance` 服务端实例取词 → 根 layout 的 `title.template`
  拼「%s - 应用名」。titleKey 与 React 端 staticData 逐字同源。
- **关键决策**：① 标题来源用静态 key 而非菜单树（零 DB 开销，与 React staticData 语义同构，
  机制见 `docs/mechanisms.md` §18）；② `createI18nInstance` 从 `@/i18n` 入口下沉到 config.ts
  （RSC 只能引 config，入口连带 react-i18next 会在 react-server 构建崩溃），入口 re-export
  维持 providers.tsx 引入路径不变；③ `route-title.ts` 补登记 `/exception/*` 三路径（对齐 React
  的 `menu.exception.*`），避免 hook 水合后把 metadata 标题回写成应用名；④ `/org/notices/[noticeId]`
  详情页**不加** metadata（`findActivePath` 精确匹配，hook 本就回退应用名，加了会首帧对→水合后退化，
  与 React 的既有差异待后续单独对齐）；⑤ `usePageTitle` 保留（运行期语言切换即时刷新）。
- **验证**：`lint`（0 error，21 条存量 warning）/ `next build`（含 TS 全量检查）通过；生产服务器
  curl 实测——`/sign-in` 默认中文「用户登录 - Better Admin」、带 `better-admin-language=en` 返回
  「Sign In - Better Admin」，语言感知生效；叶子路由全部编译为动态渲染（读 Cookie 的预期形态）。
- **无需同步**：数据库 / OpenAPI 契约不涉及；feature-matrix 无功能变化；React / Vue / NestJS 端无对应改动。

### 多标签页拖拽排序：Vue 端对齐（2026-09-12）

- **技术选型**：沿用三端依赖清理后保留的 `@vueuse/integrations useSortable`（sortablejs）——与
  DataTable 列设置（手柄拖拽）、组织树（UTree 节点拖拽 + 点击选中并存）同源方案，零新增依赖
  （`vue-draggable-plus` 已在依赖清理中移除，不回引）。
- **实现**（`TagsBar.vue` + `tabs-model.ts` + `tabs-store.ts`）：tabs-model 新增 `moveTabPath`
  纯函数 + 7 单测（与 React 端逐字一致），store 新增 `moveTab` action；useSortable 配
  `draggable: 'li:not([data-tab-pinned])'`（固定标签不可拖、不参与 sortable 索引与落点交换，
  数据层 clamp 另有兜底）、`filter: '[data-tab-close]'`（关闭热区 pointerdown 已 stop，filter
  双保险）、`ghostClass` 占位 + `chosenClass` 拖起浮起（scale-105 + 轻透明 + 高阴影）；
  曾尝试 `forceFallback`（JS 模拟拖拽规避原生 DnD 虚影、`direction` 限制方向）但实测
  体验不及 native 模式，经用户确认已回退（拖拽轨迹随鼠标为 sortablejs 能力边界，保持现状）；
  平移手势 pointerdown 排除 `[data-tab-item]`（标签上拖 = 排序、空白区拖 = 平移，对齐 React 端）。
- **关键认知——索引语义（首版曾搞反，实测复现后修正）**：sortablejs 的 `oldIndex/newIndex`
  相对**容器全部子元素**（`index(el)` 不带 selector，含首位固定标签的占位下标），与 store 的
  `paths` 下标**天然 1:1 对齐**，`onUpdate` 直接 `moveTab(paths[oldIndex], newIndex)` 即可；
  `oldDraggableIndex / newDraggableIndex` 才是相对 `draggable` 选择器过滤后的索引。首版误把
  全量索引当成 draggable 索引做了 +1 补偿，导致拖拽后顺序错位一项。
- **与 React 端实现差异（无需对齐项）**：React 端 react-aria 的捕获阶段 Sensor 适配
  （`TabPointerSensor` / `onPressStart=continuePropagation` / `sortMovedRef`）在 Vue 端不需要——
  Vue 原生事件绑定 + sortablejs 原生监听，不存在 RAC 合成层 stopPropagation 问题；拖拽后的
  click 由 sortablejs 自行抑制，`handleSelect` 仅保留平移的 `dragMoved` 检查。
- **已知差异**：sortablejs 无键盘排序（React / Next 端 dnd-kit KeyboardSensor 支持
  空格拾起 + 方向键移动），记入 feature-matrix。
- **关键坑——chosenClass 多类名导致「拖拽完全不生效」**：sortablejs 的 `toggleClass` 用
  `classList.add(name)` 写入，token 含空格（如 "scale-105 opacity-80 shadow-lg"）直接抛
  `InvalidCharacterError`——异常发生在 `_prepareDragStart` 内部（choose 派发之后的最后一句），
  模块级 `dragEl` / `lastDownEl` 残留，此后所有 `_onTapStart` 在 `if (dragEl) return` /
  `if (lastDownEl === target) return` 早退，任何标签都无法再拖。修复：chosenClass / ghostClass
  一律单一类名，浮起样式写 `styles/tags-bar.css`（`.tab-sort-chosen` / `.tab-sort-ghost`）。
  **教训：sortablejs 的类名类选项（ghostClass / chosenClass / dragClass / fallbackClass）
  禁止 Tailwind 多原子类拼接**。
- **验证**：`type-check` / `lint`（0 error）/ `test`（92 用例，含新增 7 个）全绿；浏览器实测
  （5174，admin 账号）：修复后干净状态下 mousedown → choose 派发 → chosen 类写入无异常，
  store → 视图 → sessionStorage 持久化链路、点击导航、中键关闭回归通过。
  **自动化边界说明**：sortablejs 在 Chromium 上走原生 HTML5 DnD（`nativeDraggable`），
  `dispatchEvent` 合成事件无法驱动 UA 级拖拽启动、IAB CUA drag 亦超时，物理拖拽的最终
  冒烟以用户真实鼠标为准（同管线列设置 / 组织树已生产验证）。
- **无需同步**：数据库 / OpenAPI 契约不涉及；Nuxt 端待排期。

### 三端依赖清理：vue / react / next 共移除 10 项未使用包（2026-09-12）

- **清理清单**：vue 删 `vue-draggable-plus`（M2 后被 useSortable 取代，业务零引用）；react 删 `axios`（请求层实为 fetch 封装 api-client，全仓零引用）、`react-router-dom`（已迁移 TanStack Router）、`@tanstack/react-query-devtools` / `@tanstack/react-router-devtools`（从未接入）、`tailwind-variants`（HeroUI 内部依赖，业务未直接使用）、`eslint-plugin-node`（eslint 配置零引用，插件已停维护）；next 删 `eslint-config-next`（eslint 实用 `@next/eslint-plugin-next` flat config）、`eslint-plugin-node`、`@types/bcryptjs`（bcryptjs 3.x 自带类型）——next 三项原本只挂在 package.json，lockfile 本就不含，删除后首次对齐。
- **关键保留判定**（按 import 搜不到 ≠ 可删）：三端 `@tiptap/pm`（`@tiptap/react` 必需 peer + 官方要求显式安装）；next 端 `pg`（drizzle-kit 0.31.10 内省崩溃坑的修复驱动，drizzle.config.ts 注释有记录）；`@types/node` / `eslint-plugin-react-hooks`（非 import 方式引用）；vue 端 `@tanstack/vue-virtual` 等 `optimizeDeps.include` 配套声明（`@nuxt/ui` 被排除出预构建，其传递依赖必须在 package.json 显式声明，vite.config.ts 注释有记录）。
- **文档同步**：修正 5 处过时/错误表述——react.md 技术栈表与 ui-spec §18.1 的「TanStack Query + axios」（实为 fetch 封装）、vue-plan §1.3 组织管理与 §2 拖拽行的 `vue-draggable-plus`（实为 useSortable）、feature-matrix 组织管理行与标签页行（「可用已有 vue-draggable-plus」已失效）；website 站内容经 sync-docs 重新生成。
- **验证**：vue `type-check` / `test`（85 用例）/ `build` / dev 冒烟通过；react `lint`（0 error）/ `test`（93 用例）/ `build` 全绿；next `lint`（0 error）/ `build` 成功。
- **无需同步**：数据库 / OpenAPI 契约不涉及。

### Vue 端「Vue 化」收敛：三处命令式 API 迁移 VueUse + 进度条状态机响应式化（2026-09-12）

- **背景**：功能与 React 端对齐后的内部实现收敛评估（经用户拍板执行）。逐模块排查「React 移植痕迹」——手动事件监听 / Observer / DOM API / 命令式桥接——共 4 项可替换点；路由过渡 VT vs Vue 内置 `<Transition>` 经评估**维持现状**（VT 快照动画质量 + 与 React 端同源，机制见 `docs/mechanisms.md` §15）。全部改动为行为等价替换、UX 零变化，feature-matrix 不涉及。
- **VueUse 三处**（API 先查 `vueuse-functions` Skill + 已安装源码核对）：FullscreenButton 手动 fullscreenchange → `useFullscreen`（无参默认 documentElement + 挂载同步）；DataTableBulkActions 手动 window keydown → `useEventListener`；TagsBar 手动 ResizeObserver（容器+内容双观察）→ `useResizeObserver` 数组 target（observe 初始派发等效原手动初始化）。净删 39 行生命周期样板。
- **progress.ts 响应式化**：去除 `bindProgress` 命令式桥接——状态 ref 化、时序参数收敛为状态机常量、progress-bridge 改 `watchProgress` 订阅展示态边沿；关键点为边沿 delay 同步判定（watch 回调异步不能现算）与冷启动窗口不补发语义保持，详见 `docs/mechanisms.md` §17。
- **验证**：`lint`（0 error，5 条存量 warning）/ `type-check` / `test`（85 用例）/ `build` 四绿。
- **无需同步**：数据库 / OpenAPI 契约不涉及；React / Next / NestJS 端为各自技术栈惯用机制，无对应改动。
- **挂起项**：4 处 localStorage 手动读写 → `useStorage` 挂起（跨标签页同步属行为新增，待需求出现再做）。

### 多标签页拖拽排序：React + Next 双端落地（2026-09-12）

- **功能**：普通标签支持拖拽排序（控制台恒首位不可拖），标签上按住拖 = 排序、空白区按住拖 = 平移滚动、右键 / 中键关闭不受影响；拖起视觉 = 微放大 + 轻透明 + 高阴影。排序仅改展示序，sessionStorage 持久化与刷新恢复自动跟随。
- **数据层**：`tabs-model.ts` 新增 `moveTabPath` 纯函数（固定标签不可移动、目标位置 clamp ≥1、无变化返回原引用跳过持久化；React 端补 7 单测），store 新增 `moveTab` action。保活层零影响（React 端池按插入序常驻，`reconcileWithTabs` 按 Set 内容幂等；Next 端无实例池）。
- **视图层**：dnd-kit（两端已有依赖，零新增）+ `SortableContext` 只登记普通标签 + `useSortable({ disabled: pinned })` 三层防护；`restrictToHorizontalAxis` + 6px 激活约束（与平移手势同阈值）；`TabPointerSensor` 自定义传感器 + `SortableTabItem` 组件（listeners 挂 li 保键盘 Space 拾起不被 RAC press 消费）。
- **关键坑：react-aria 双层 stopPropagation 导致「只能拖一次」**（React / Next 同源问题，事件流诊断定位）：① `usePress` 的 `onPointerDown` 缺省 `stopPropagation`（`shouldStopPropagation` 缺省 true）切断冒泡到 li 的合成事件——`onPressStart` 显式 `continuePropagation` 修复；② press 状态机依赖 click 收尾复位 `isPressed`，若吞掉排序后的 click 传播会卡死状态机（后续 pointerdown 走已按下分支再次 stopPropagation）——根治方案为自定义 `TabPointerSensor` 把激活事件改走 React 捕获阶段（`onPointerDownCapture`，先于冒泡层 stopPropagation 分派，结构性免疫），同时排序后的 click 放行（防误导航由 `handleSelect` 检查 `sortMovedRef` 承担，rAF 兜底复位）；关闭热区加 `data-tab-close` 在 capture handler 排除。
- **机制结论**：React 合成事件分派中，捕获阶段 handler 先于冒泡阶段的 `stopPropagation` 执行——与 react-aria pressable 元素同场景的 dnd-kit 拖拽，listeners 应用 capture 事件名挂载。已沉淀至 `docs/mechanisms.md`。
- **验证**：两端 `tsc` / `lint`（0 error）全绿，React 端 93 单测通过；IAB 浏览器实测（React 5173 / Next 3001，admin 账号）——连续 6 次拖拽轮转零失效、无误导航、点击导航 / 右键菜单 / 中键与 X 关闭 / 排序持久化与刷新恢复全部回归通过。
- **无需同步**：数据库 / OpenAPI 契约不涉及；Vue 端待对齐（可用已有 `vue-draggable-plus`），Nuxt 待排期（`docs/feature-matrix.md` 已同步）。

### Vue 端 DataTable 内聚错误态与分页条：页面模板三段式收敛为单组件（2026-09-11）

- **背景**：Vue 六个列表页此前各自维护「ErrorContent `v-if` / DataTable `v-else` / DataTablePagination
  无条件渲染」三段模板，且错误态下分页条仍持 stale total 渲染（React 基准为隐藏）。对齐 React
  `data-table.tsx`（isError 强制清空行 + renderEmptyState 错误占位 + Footer 分页、isError 时隐藏分页），
  经用户确认后执行。
- **`DataTable.vue` 扩展（向后兼容）**：新增 `isError` / `total` props 与 `retry` 事件——isError 时
  `:data` 强制清空行（vue-query 失败仍持旧数据，同 React 的 `isError ? [] : rows`），经 `#empty` 槽
  条件渲染 `ErrorContent`（`common.loadError` / `common.retry` 文案内聚，复用既有 UAlert 形态，
  §21 不刻意仿 React 居中占位式）与原 `UEmpty` 空态；`total` 传入时在表格下方内聚渲染
  `DataTablePagination`，isError 时隐藏。
- **`DataTablePagination.vue` API 收敛为 `table + total`**（对齐 React，改造后唯一消费者为
  DataTable.vue）：页码不再由页面显式传 props，改读 `table.getState().pagination`——已核实
  `@tanstack/vue-table@8.21.3` 的 `options.state` 为 mergeProxy 转发读取（不快照值），六页列表的
  `state.pagination` 均为列表 store 驱动的 getter，computed 求值时读取响应式 store，Vue 响应性成立。
- **六个页面模板简化**（users / logs / roles / posts / notices / directory）：三段收敛为单个
  `<DataTable :is-error :loading :refreshing :table :total @retry>`，各页净减约 20 行。**范围界定**：
  menus（树表直渲染 UTable）与 dicts / depts / permissions（React 基准同样不传 isError/total）不动。
- **验证**：`lint`（0 error，5 条存量 warning）/ `type-check` / `test`（85 用例）/ `build` 四绿；
  本地 5174 dev server + admin 账号浏览器实测——六页分页条均由 DataTable 内聚渲染且统计文案正确
  （岗位空数据页「第 0 - 0 条，共 0 条」）；fetch 拦截构造 /users 失败后表头保留、空态区渲染
  「数据加载失败 + 重试」、分页条隐藏，恢复网络点重试后数据与分页条完整恢复。
- **无需同步**：数据库 / OpenAPI 契约不涉及；React / Next / NestJS 端无对应改动。

### M4 遗留补验：登录回跳链路端到端通过 + 已登录访问登录页口径对齐（2026-09-11）

- **背景**：Vue M4 冒烟时因本地后端故障未能复验的「带 `redirect` 的登录回跳链路」，Nest 恢复
  （本地 3000）后于 Vue dev（5174）补验，admin 账号实测。
- **链路实测通过（M4 遗留销项）**：匿名访问 `/settings/users` / `/settings/roles` → 均跳
  `/sign-in?redirect=<fullPath>`（参数正确）；登录成功（rememberMe 勾选）→ 回跳原目标页
  （页面标题「用户管理 / 角色管理」正确），`auth-storage` 写入
  `user/accessToken/isAuthenticated/rememberMe/refreshToken`（长短会话分档符合契约 v1.2）。
- **回跳耗时 2-7s 为本地环境固有延迟，非代码问题**：实测 Nest 连远程 Supabase 的接口耗时
  `login` 1.6s、`/auth/me` 4.3s、`/menus` 1.3s，回跳路径上无多余串行等待；Vercel 部署后无此延迟。
- **顺带发现并修复一处守卫偏差**（`vue/src/router/guards.ts`）：「已登录访问 `/sign-in`」分支
  原实现读 `redirect` 参数直接跳转且未过 `isSafeRedirect` 校验（`?redirect=//evil.com` 会落
  站内 404 而非首页）；React `(auth)` beforeLoad 与 Next proxy 同场景均为固定回 `/`。已对齐两端
  改为 `{ path: "/" }` 并删除守卫层 `readRedirectTarget`（`redirect` 参数只由登录页提交后消费，
  该处有 `isSafeRedirect` 保护）。vue-router 为 SPA 内部导航、不构成开放重定向，属口径一致性修复。
- **复验**：已登录访问 `/sign-in?redirect=//evil.com` 与 `?redirect=/settings/logs` 均落 `/`
  （控制台）；完整链路重跑通过；`lint`（0 error，5 条存量 warning）/ `type-check` / `test`
  （85 用例）/ `build` 四绿。
- **无需同步**：数据库 / OpenAPI 契约不涉及；React / Next 端本就是「固定回 `/`」的基准实现，
  无改动。

### Vue 端五项体验对齐调整：个人链接子菜单 / 列设置重置动画 / 标签栏载体 / 标签输入 / 菜单失败回退（2026-09-11）

- **背景**：Vue 端 M4 冒烟后的体验收口，五项由用户提出，逐项对照 React 基准处理（不涉及架构级改动，
  §18 的冲突升级未触发）。
- **① 头像下拉补「个人链接」子菜单**（`components/layout/UserMenu.vue`）：复用 `lib/profile-links.ts`
  的 `buildProfileLinks`，用 Nuxt UI `DropdownMenuItem.children` 渲染子菜单，子项为主页 / GitHub / X
  （图标同用户列表链接列：`i-lucide-house` / `i-logos-github-icon` / `i-logos-x`），新窗口打开；
  三个字段全空时整项隐藏（同 React `sidebar-user`）。此前 Vue 端缺该子菜单。
- **② 列设置重置 FLIP 动画**（`components/data-table/DataTableViewOptions.vue`）：评估结论为
  **可用 Vue 内置 `TransitionGroup`**（其 move class 即 FLIP 机制）；为对齐 React「拖拽重排交给
  sortablejs、仅程序性重排播 FLIP」的策略，用容器 `.flip-anim` 类做门控——只有 `resetColumns()`
  打开它时 CSS 才给 `.flip-move` 声明 `transform 0.2s ease-out`（`prefers-reduced-motion` 关闭），
  等价 React 端 `useFlipReorder`（同为 200ms）。未新增依赖。
- **③ TagsBar 适配 UDashboardToolbar**（`layouts/AdminLayout.vue` / `components/layout/TagsBar.vue`）：
  nav 去掉与 toolbar 重复的底边框 / 背景，toolbar 经 `:ui` 覆盖默认 `min-h-[49px]` 与 `px-4`，
  栏高回到 40px（对齐 React）；`v-if="showTabs"` 提到 toolbar 上，避免关闭标签栏时残留一条空 toolbar。
- **④ 账户个人标签改用 Nuxt UI 内置 UInputTags**（`features/account/TagInput.vue`）：按 §21 组件
  优先级用内置组件替换原自定义拼装（React 端因 HeroUI 无对应组件仍自建），对外接口不变
  （`v-model` / label / placeholder / disabled，`ProfileFormCard` 无需改）；`max=10` /
  `max-length=20` / `convert-value` 去首尾空格 / `@invalid` 区分「已存在」与「超上限」内联提示。
  **已知行为差异**：单项超长由原生 maxlength 截断（`tags.tooLong` 不再触发，i18n key 保留未删）；
  内置组件无「+」按钮，回车即添加（placeholder 文案本就如此）；删除按钮可访问名由 reka-ui 的
  `aria-labelledby` 固定为标签文本（无法从外部改写为 React 端「删除标签 X」语义，评估后记为已知差异）。
- **⑤ 菜单加载失败回退控制台**（`layouts/AdminLayout.vue`）：侧边栏 `error` 时 items 回退
  `[CONSOLE_MENU_NODE]` 照常渲染（不再被错误内容顶掉，对齐 React `app-sidebar`）；同时按 React
  结构把失败提示与重试移到主体区覆盖层（`ErrorOverlay` 语义），用 `v-show` + `display:contents`
  包裹 KeepAliveOutlet，保证覆盖期间保活实例池与路由 VT 守卫保持挂载、恢复后原页面状态无损。
- **验证**：`lint`（0 error，5 条存量 warning）/ `type-check` / `test`（85 用例）/ `build`（vite +
  vue-tsc）全绿；本地 5174 dev server + admin 账号浏览器实测五项——下拉「个人链接」子菜单项完整、
  列设置重置采样到 FLIP 全过程（3 行 `transition: transform 0.2s`，位移 64px 逐帧归零；拖拽重排
  0 个 move class 即不播放）且重置已清 localStorage、标签添加 / 重复提示 / 保存落库均通过
  （测试数据已删回原状）、注入 `/menus` 500 后侧边栏仅剩「控制台」且主体区出现失败提示、
  点重试完整恢复菜单。
- **无需同步**：数据库 / OpenAPI 契约 / Schema 不涉及（纯前端体验调整）；React / Next / NestJS
  端无对应改动。

### 非菜单路由标签页图标兜底：Next / Vue 两端同步 React（2026-09-11）

- **背景**：承接「React：非菜单路由标签页图标兜底」条目（/account、/my-notices 标签页补图标），
  将同一能力对齐到 Next 与 Vue 两端，图标名与图标来源口径完全一致（`id-card` / `bell-ring`，
  与各自用户下拉菜单入口图标一致）。
- **Next 端**（App Router 无 staticData 机制，走手写静态映射表，与标题兜底同表同源）：
  - `lib/route-title.ts`：映射表由 `Record<string, string>`（titleKey）扩为
    `Record<string, RouteStaticMeta>`（`{ titleKey, icon? }`），新增 `getRouteStaticMeta` /
    `routeStaticMetaByPath`；保留 `getRouteTitleKey`（use-page-title / app-header 面包屑继续用，行为不变）；
  - `layouts/components/tags-bar.tsx`：图标回退链改为 `live ?? cached ?? routeStatic.icon`，
    与标题三级回退同构。
- **Vue 端**（路由标题走 route-access.ts 集中登记，图标同址登记）：
  - `lib/route-access.ts`：新增 `ROUTE_TAB_ICONS`（路径 → lucide kebab-case 图标名，
    仅登录白名单页登记，菜单路由图标来自菜单树）与 `resolveRouteTabIcon`；
  - `components/layout/TagsBar.vue`：图标回退链改为 `live ?? cached ?? i-lucide-<routeIcon>`
    （Vue 端 UIcon 消费 `i-lucide-*` 完整名，前缀在消费处拼）。
- **验证**：Next `pnpm build` + `lint` 通过（仅存量警告）；Vue `type-check` + `lint` + `test`
  （85 用例）通过（仅存量警告）；两端图标集均确认含 `id-card` / `bell-ring`
  （lucide-react 1.37.0 / @iconify-json/lucide 1.2.129）。
- **无需同步**：数据库 / OpenAPI 契约不涉及（图标仅前端登记，不进菜单表）；Nuxt 端尚未立项，
  其标签页实现时按本条目口径登记。

### 契约 v1.8.1：账户资料电话收紧为 11 位大陆手机号 + 基本信息显示名称实时字数（五端同步）（2026-09-11）

- **需求**：「我的账户 → 基本信息」电话字段此前仅宽松校验（`^\+?[0-9][0-9\- ]{3,19}$`，允许 + 前缀 /
  空格 / 短横线，maxLength 20），收紧为 11 位大陆手机号标准格式；显示名称补实时字数展示，口径同
  用户管理表单「姓名」（`n/50`）。
- **契约先行（`nest/openapi/openapi.yaml` → v1.8.1）**：`AccountProfileUpdateRequest.phone`
  `maxLength` 20 → 11、新增 `pattern: '^1[3-9]\d{9}$'`，仍可传 `null` 清空；格式不符 400 VALIDATION_ERROR。
- **同一条宽松正则原分布 5 处，本轮全部同步**：
  - NestJS `account/dto/account.dto.ts`：`@Matches` 换 11 位正则，消息「请输入 11 位有效手机号」；
  - Next 服务端 `lib/server/account-service.ts`：`assertMatches` 同步（Next 独立后端，不走 NestJS；
    `route.ts` 只做 body 归一化、无格式校验，无需改）；
  - React / Next `features/account/cards/profile-form-card.tsx`：zod 正则 + `maxLength` 11 +
    显示名称改 `InputGroup` + `Suffix` 实时字数（同 `user-form-dialog.tsx` 姓名写法）；
  - Vue `features/account/cards/ProfileFormCard.vue`：`PHONE_PATTERN` + `maxlength` 11 +
    显示名称 `UInput #trailing` 实时字数（沿用 Vue 端 `UserFormDialog.vue` 既有写法，不照搬 HeroUI 结构）；
  - 三端语言包 `features.account.profile.phoneInvalid` / `phonePlaceholder` 改为「手机号」口径
    （React → Next 直接同步整文件，diff 确认仅此两行差异；Vue 精确改两行，保留其既有 `{'@'}` 转义差异）。
- **关键决策**：
  - 契约 `maxLength: 11` 不单独加长度断言，Nest / Next 两端服务端均靠正则天然限定恰好 11 位，口径一致；
  - 存量宽松格式值不做数据迁移：读取不受影响，用户下次保存资料时须改为标准格式方可提交
    （seed 不写 phone，存量仅来自用户自填）；
  - Nuxt 尚未启动，M0 时直接跟 v1.8.1 契约；`feature-matrix.md` 无需变更（各端功能状态未变）。
- **已知限制（既有、本轮未动，待拍板）**：Nest 对 phone **不 trim**（DTO `@Matches` 校验原始值、service
  `patch.phone = dto.phone` 原样入库），Next 则 `dto.phone.trim() || null` **先 trim 再校验**——直调 API 传
  `" 13800138000 "` 时 Nest 400 / Next 通过，传纯空格时 Nest 400 / Next 视为清空。三端前端提交前均已
  `trim()`，界面流量不受影响。若统一，倾向 Next 对齐 Nest（与 displayName「校验原始字符串」既有口径一致）。
- **验证**：`react/scripts/check-locales.mjs` React / Next 14 个语言包完全一致；React / Next / Nest
  `tsc --noEmit` + `eslint` 通过（Next 仅 1 个既有 `no-console` 警告，`account-service.ts:421`，非本轮）；
  Vue `vue-tsc` / `eslint` / `vitest`（85 用例）三绿；Nest 无测试文件。

### React：非菜单路由标签页图标兜底（/account、/my-notices 加图标）（2026-09-11）

- **问题**：标签栏（TagsBar）中「我的账户」标签只显示名称没有图标。根因：标签图标唯一来源是菜单树
  （`liveMetaByPath`）+ tabs 快照（`syncMeta` 持久化），而 `/account`、`/my-notices` 是登录白名单页
  （`route-access.ts`），不在菜单树也不在种子数据，标题有 `staticData.titleKey` 兜底但图标没有，
  于是图标为空、标题正常。
- **方案**：图标接入与标题同一套 staticData 兜底链路，不新增机制：
  - `lib/route-title.ts`：`buildRouteTitleKeyMap` / `findRouteTitleKey` 重构为
    `buildRouteStaticMetaMap` / `findRouteStaticMeta`，映射值从 `titleKey: string` 扩为
    `{ titleKey, icon? }`（调用方 tags-bar / app-header 同步改名，行为不变）；
  - `lib/use-document-title.ts`：`StaticDataRouteOption` 模块扩充新增可选 `icon?: string`
    （lucide kebab-case 图标名）；
  - `routes/_authenticated/account.tsx` 声明 `icon: "id-card"`（与侧边栏用户下拉菜单「我的账户」
    入口 `IdCard` 一致）、`my-notices.tsx` 声明 `icon: "bell-ring"`（同 `BellRing`）；
  - `tags-bar.tsx`：`icon` 回退链改为 `live ?? cached ?? routeStatic.icon`，与标题三级回退同构。
- **验证**：`pnpm build`（含 tsc 类型检查）/ `lint`（仅存量警告）/ `test`（86 用例）三绿；
  确认 lucide-react 1.33.0 `dynamicIconImports` 含 `id-card` / `bell-ring`，`DynamicIcon` 可解析。
- **待同步（跨技术栈一致性）**：Vue 端（`vue/src`）标签页对同一问题如法处理时，图标同样取
  `id-card` / `bell-ring`；Next 端如实现同款标签栏也走同一图标名。无需改数据库 / OpenAPI 契约
  （图标仅前端 staticData，不进菜单表）。

### 路由过渡动画：Next 端同步 React 的「位移收敛 + 进出场分时」两条硬约束（2026-09-11）

- **背景**：`docs/mechanisms.md` §0.1 登记的 6 条 Next 待同步差异点，本轮按 React 端同源参数逐条对齐
  （React 是 Source of Truth；Vue 早已同源）。
- **改动（仅 `next/src/styles/route-transitions.css`，无 TS/JSX 变动）**：
  - **位移/缩放收敛到"出不了盒"**：`glide` 横向 14% / 22% → 4% / 5%；`rise` -20px / 40px → -6px / 10px；
    `zoom` 1.08 / 0.94 → 1.02 / 0.99；`blur` 去掉 `scale` 且 blur 10px → 8px；
  - **`cover` 由整幅横向平移（`translateX(100%)`，会整幅横穿侧边栏）改为盒内 `clip-path` 擦除**，
    新增 `rt-cover-in-reverse` + `html[data-rt-direction="back"]::view-transition-new(.rt-cover)`
    反转擦除方向（保留 iOS push 观感）；
  - **进出场分时**：`:root` 补 `--rt-exit`(0.6×) / `--rt-enter`(0.65×) / `--rt-stagger`(0.35×)，
    `glide` / `rise` / `zoom` / `blur` 新页加 `animation-delay: var(--rt-stagger)`，
    **总时长仍 = 基准 `--rt-duration`（420ms）**；`fade` / `reveal` / `circle` 按语义保持不分时；
  - `reveal` / `circle` 去掉多出的 `+60ms` 尾巴，回归 `var(--rt-duration)`；
  - 组盒兜底 `::view-transition-group(.rt) { overflow: clip }`，收在
    `@media (prefers-reduced-motion: no-preference)` 内；reduced-motion 分支补三个新变量归零。
  - **保留选择器形态差异**：Next 走 `::view-transition-old/new(.rt-<id>)` 类选择器
    （React `<ViewTransition update="rt rt-<id>">` 写入 `view-transition-class`），
    与 React / Vue 的 `main-content` 具名组 + `data-route-vt` 门控不同，**关键帧与变量语义逐字一致**。
  - 预设 id / 文案 / 偏好契约未动（`themes/route-transitions.ts` 未改）。
- **验证**：经项目真实 CSS 管线（Tailwind v4 `@tailwindcss/postcss`）编译 `globals.css` 通过；
  产物中确认反向擦除规则、组盒兜底、`var(--rt-stagger)` 分时均在位，旧参数（`scale(1.08)` / `translateX(22%)`）已消失；
  `prettier --check` 通过。**未运行 `next build`，也未在浏览器逐预设目视确认——建议人工复核一次观感**（本机截图口径对 VT 覆盖层不可靠，见 §0 排查提醒）。
- **文档**：`docs/mechanisms.md` §0.1 由「待同步」改为「已同步」；`docs/feature-matrix.md` 路由过渡行动画参数备注同步。

### 路由过渡动画：Next 端暂不同步（仅登记）+ reveal 语义确认（2026-09-11）

- **用户反馈**：`reveal` 观感"有点怪"——新页扫入覆盖完成后旧页才消失；随后决定「就这样」，但要求
  Next 与 Vue 一起同步修改；再随后改为**先不改 Vue / Next，只在文档标记**。
- **reveal 语义确认（非 bug，保持现状）**：这是最初的设计——`rt-reveal-in` 用
  `clip-path: inset(0 100% → 0)` 让新页**全程不透明**地扫入（避免扫过区域透出旧页形成叠影），
  `rt-reveal-dim` 只把旧页压暗到 `opacity: 0.85`（**退让而非退场**），因此旧页一直保留到
  整个 View Transition 结束、浏览器换成真实新页那一刻才"消失"。观感上的"两段式"即由此而来。
  若日后要让它更像"替换"，只需把 `rt-reveal-dim` 的终值从 `0.85` 压到 ~`0.6`（让旧页更早沉下去），
  无需改动编排。
- **本轮实际处置**：**未修改任何动画代码**。
  - Vue `vue/src/styles/route-transitions.css` 复核结论：规则层已与 React 逐条一致
    （`diff` 后仅差 Vue 特有的 `.route-vt-main { view-transition-name: main-content }` 承载规则与注释措辞），
    **无需再同步**；
  - Next 端改动已起草但**按要求回退**（`git checkout`，工作区干净）；
  - 待同步差异点（6 条：派生变量 / 四个预设分时 / reveal+circle 去 60ms 尾巴 / 幅度收敛 /
    cover 改盒内擦除 + 反向擦除 / 组盒 `overflow: clip` 的 Next 写法）**逐条登记在
    `docs/mechanisms.md` §0.1**，后续同步时直接照单比对即可。
- **后续（2026-09-11 晚些时候）**：上述 6 条差异点已在 Next 端全部落地，
  见上方「Next 端同步 React 的…」条目；`mechanisms.md` §0.1 已由「待同步」改为「已同步」。

---

### Vue 端错误页登录要求对齐 React / Next（2026-09-11）

- **需求**：用户确认 `/403` `/404` `/500` 在 Vue 端也要求登录，与 React 端保持一致。
- **根因**：`vue/src/lib/route-access.ts` 的 `PUBLIC_PATHS` 一个数组兼任两个维度——`isPublicPath()`（守卫放行）与 `isAdminLayoutRoute()`（布局分支 + VT 编排）；直接删元素会让错误页被判成认证态页面、套上 AdminLayout（带侧边栏的错误页），故此前只做了记录而未被对齐。
- **改动**：
  - `PUBLIC_PATHS` 收敛为 `["/sign-in"]`（语义＝无需登录）；
  - 新增 `FULLSCREEN_PATHS = ["/sign-in", "/403", "/404", "/500"]` + `isFullscreenPath()`（语义＝不套 AdminLayout）；
  - `isAdminLayoutRoute()` 判据由 `!isPublicPath` 改为 `!isFullscreenPath`（`AppShell` 布局分支与 `KeepAliveOutlet` VT 编排同步受益：错误页不再参与主体区过渡）；
  - `router/guards.ts` 注释同步；`lib/__tests__/route-access.test.ts` 重写用例（7 → 10 条，覆盖两个集合的职责边界与 `/exception/403` 反例）。
- **验证（后端可用时实测）**：匿名访问 `/403` `/404` `/500` `/exception/403` `/settings/users` / catch-all → **6/6 全部跳 `/sign-in?redirect=…`**（与 Next 端 307 行为一致）；已登录访问 `/403` `/404` `/500` → 全屏渲染（正文无侧边栏 / Header，文档标题 `errors.*.title`）；已登录访问 `/exception/403` → 仍套 AdminLayout；全页走查 **21/21**。四绿：`lint`（0 error）/ `vue-tsc` / `vitest`（**85/85**）/ `vite build`。
- **未完成的验证（环境阻塞，非代码问题）**：带 `redirect` 参数的登录回跳链路本应一并复验，但本地后端进入故障态（Nest `POST /api/auth/login` 超时 / 500，日志为 `users` 表查询 `Failed query`；同期 Next 实例登录曾正常、随后 3001 停止），且 3100 端口被另一个无关项目（`theme-switch-animation` 的 Nuxt dev `--port 3100`）抢占，无法取得干净环境。**该回跳属登录页既有逻辑（本次未改动）**；改动后「回跳落点 ＝ 已登录访问 `/403`」的终态已单独验证通过（见上），据此判断不破坏该链路。**建议后端恢复后补一次端到端复验**，并留意排查 Nest 侧 `users` 表查询失败（同库的 Next 实例正常，指向 Nest 连接 / schema 层而非数据库本身）。
- **机制沉淀**：mechanisms §16.5。

---

### React 路由过渡动画优化：位移收敛 + 进出场分时（React 端，Vue 同源副本同步）（2026-09-11）

- **背景（用户报障）**：页面切换时"退出与进入同时执行"，且动画范围会盖到标签栏 / 顶栏 / 侧边栏。
- **诊断（CDP 驱动无头 Chromium 152 实测，非推断）**：
  - **同步执行确认**：`startViewTransition` 的模型就是旧/新快照并行播放；9 预设中 7 个（除 reveal / circle）
    old/new 时长相同且无 delay，两页互相"抢戏"（rise 一上一下对穿、fade 中点灰蒙）。
  - **越界机理确认**：`::view-transition-old/new()` 是根级覆盖层（UA z-index 极高）里的位图，
    只按视口裁剪。① 给它加 `overflow: clip` **实测不生效**（计算值为 clip 但不参与绘制裁剪）；
    ② 给实时元素加 `clip-path: inset(0)` / `overflow: clip` 也管不到已捕获的快照；
    ③ 冻结帧像素证据：`cover` 的 `translateX(100%)`＝960px 整幅横穿侧边栏，`rise` 的
    `translateY(40px)` 把内容顶进标签栏（黑色内容条上移、红顶栏被吃掉一截）。
  - **唯一有效兜底**：组盒 `::view-transition-group(main-content) { overflow: clip }`，
    实测顶栏/侧边栏零污染（旧方案的所有候选逐个对照后仅此一项生效）。
- **改动**（`react/src/styles/route-transitions.css` 为主，Vue 同源副本同步）：
  - 位移/缩放收敛到"出不了盒"：纵向 ≤ 10px（rise 40→10 / glide 横向 22%→5% 且改小）、
    `zoom` 外扩 1.08→1.02；**`cover` 的整幅横向平移改为盒内 `clip-path` 擦除**
    （保留 iOS push 观感 + 按 `--rt-dir-x` 反转擦除方向）；`blur` 去掉缩放只留虚化。
  - 进出场分时：新增 `--rt-exit`(0.6×) / `--rt-enter`(0.65×) / `--rt-stagger`(0.35×)，
    新页 `animation-delay: var(--rt-stagger)`，**总时长仍等于基准 `--rt-duration`（420ms）**；
    `fade` / `reveal` / `circle` 按语义保持不分时；reduced-motion 分支同步补新变量。
  - 组盒兜底 `overflow: clip`；预设 id / 文案 / 偏好契约**均未改动**（`themes/route-transitions.ts` 未改）。
- **验证**：
  - 时序回归（CDP 读 `effect.getTiming()`）：glide / rise / zoom / blur = old 252ms+delay0 /
    new 273ms+delay147（147+273=420）；fade / reveal / cover / circle = 420ms+0。**全部符合设计值**。
  - 组盒裁切对照实验：`overflow: clip` 组盒的越界帧数为 0（其余候选与基线均有越界）。
  - `pnpm run lint`（0 error，仅 4 条既有 `no-console` warning）+ Prettier 通过。
  - **未完成/已知限制**：本机 Chrome/Edge 的 `Page.captureScreenshot` 会把 VT 覆盖层拍成终态
    （暂停帧与真实时钟两种口径都试过），因此"过渡中的实际观感"未能在自动化里截图取证，
    需人工在浏览器里逐预设目视确认一次（机制与像素级机理证据见 `docs/mechanisms.md` §0）。
- **影响面**：仅动画表现层；未触及路由编排（`keep-alive-outlet.tsx`）、主题切换 VT、偏好存储与 API。
- **顺带说明**：本次为验证曾临时启动本地 Nest（3000）与两个验证用 Vite 实例（3010 / 4173，
  `VITE_API_BASE_URL` 指向 3000，因 CORS 白名单只含 `localhost:5173/5174/4173`），
  未修改任何 env 文件；验证脚本与产物在 `.tmp-vt-verify/`（已清理）。

### Vue M4 收尾：文档校正 + 本地冒烟，修复 4 项对齐缺陷（2026-09-11）

- **范围**：按 `vue-plan.md` §M4 执行「文档收尾 + 本地冒烟」；**不含 Vercel 部署与线上冒烟**（由用户手动执行，待办见末段）。
- **冒烟环境**：本地 Nest（`PORT=3100`——3000 被本机无关 Nuxt 应用占用）+ Vue dev（5173，`VITE_API_BASE_URL` 指向 3100）+ Edge headless CDP 驱动脚本（自建专属 tab、按 `aria-label`/文本驱动交互、逐页收集 console 异常与 ≥400 网络响应）。
- **冒烟结果（全通过）**：
  - 登录闭环 4/4：表单渲染 / 提交 / 离开登录页 / 主界面挂载。
  - API 读端点 17/17：认证、用户、角色、权限、菜单（含 tree）、字典、日志、组织（含 tree）、岗位、通讯录、公告（含 mine）、站内信（含未读数）、账户资料；分页信封 `{ data, pagination: { page, pageSize, total } }` 全量核对。
  - 全页走查 21/21：21 条路由逐一冷启动加载 + 网络监控，零 4xx、零应用级 console 异常、文档标题全量正确（含 `/exception/*` 与 `/403` `/404` `/500`）。
  - M3 专项 8 项：用户列表数据渲染（5 条）/ 列设置面板 / 偏好设置抽屉 9 项 / 深色切换生效并持久化 / 恢复浅色 / 命令面板（Ctrl+K + 菜单分组 + 主题组）/ 应用内导航 + 多标签页新增 / 路由 VT 编排（`document.startViewTransition` 实测调用 1 次、`html[data-route-vt]` 置位 1 次）。
  - 非登录态守卫 7 项：`/settings/users`、`/account`、`/exception/404`、catch-all 均带 `redirect` 跳登录。
- **发现并修复 4 项缺陷**：
  1. **`GET /roles//menus` 404**：`RolesPage` 的授权抽屉常驻挂载（`role=null` → `roleId=""`），`useGrantTree` 的 `roleMenusQuery` 缺 `enabled` 门控，页面加载即发空 id 请求 → 补 `enabled: computed(() => roleId() !== "")`（React 端抽屉按需挂载，无此问题；机制见 mechanisms §16.1）。
  2. **独立错误页文档标题缺失**：`ROUTE_TITLE_KEYS` 无 `/403` `/404` `/500` → 标题回退裸品牌名；补 `errors.forbidden.title` / `errors.notFound.title` / `errors.serverError.title`（与 React `staticData.titleKey` 同键）。
  3. **公告详情标题 / 面包屑 / 标签标题缺失**：标题映射只做精确匹配，动态路由 `/org/notices/:noticeId` 命中不到 → 新增 `ROUTE_TITLE_PREFIX_KEYS` + `resolveRouteTitleKey()`（精确优先、最长前缀兜底），文档标题（guards）/ 面包屑（AdminLayout）/ 标签标题（TagsBar）三处统一改用（机制见 mechanisms §16.2）。
  4. **命令面板顶部渲染原始键名** `dashboardSearch.title` / `dashboardSearch.description`：`@nuxt/ui` 4.11.0 的 locale 包（zh_cn / en）该分组只有 `theme` 键，组件 `props.title || t('dashboardSearch.title')` 回退即露出键名 → `UDashboardSearch` 显式传 `title` / `description`（`layout.command.palette` / `layout.command.search`，机制见 mechanisms §16.3）。
  - **顺带清理既有 lint error**：`progress-bridge.vue` 的空注释模板（`vue/valid-template-root`，M3 条目已记录「HEAD 已存在、未处理」）改为 `<slot />` 透传，`pnpm lint` 恢复 **0 error**（机制见 mechanisms §16.4）。
- **未对齐项（已记录、未擅自修改，待用户拍板）**：React（路由 `beforeLoad`）与 Next（`proxy.ts`）对 `/403` `/404` `/500` 均要求登录（未登录 307 → `/sign-in?redirect=`），Vue 端这三条路径登记在 `PUBLIC_PATHS` 中匿名放行。统一需拆开 `PUBLIC_PATHS` 的双重职责（守卫放行 + 不进 AdminLayout 的全屏页判定），当前已在 `feature-matrix.md` 错误页行标注 `⚠️`。
- **验证**：`pnpm lint`（0 error / 5 既有 warning）、`vue-tsc --noEmit`、`vitest`（82/82）、`vite build` **四绿**。
- **文档**：`feature-matrix.md` 统计口径按行校正（基础设施实为 10 行，**23 项 → 27 项**，四端完成率重算：React / Next / Vue 各 26 项完成）+ 错误页行标注未对齐项；`mechanisms.md` 增补 §16（Vue 端 4 条机制结论）；`vue-plan.md` M4 标记完成（部署除外）；`AGENTS.md` §19 阶段指针同步。
- **部署待办（用户手动执行）**：Vercel Root Directory = `vue`、`VITE_API_BASE_URL=https://nest.baiwumm.com/api`、Nest CORS 增加 `https://vue.baiwumm.com`；随后根 version → `pnpm sync-versions` → 单提交 `chore: release vX.Y.Z` → tag。
- **环境备注（非应用问题，供后续排障参考）**：① Vite dev server 在 Windows 上编辑 `.vue` 时可能因文件监听 `EBUSY`（原子写临时目录被锁）整体退出，重启即可，HMR 日志可确认改动已应用；② 本机 Chrome `--remote-debugging-port` 不生效（Edge 可用），且 Edge 内置扩展会注入 `chrome-extension://` 与 `edge://` target——CDP 冒烟必须自建专属 tab，取「第一个 page」会连到无关页面；headless 关闭最后一个 tab 会自行退出；③ 工作区存在另一会话的并行改动（未跟踪目录 `.tmp-vt-verify/` 与 `react/src/styles/route-transitions.css`），本次未触碰。

---

### Next 端路由过渡动画落地（React ViewTransition 方案）（2026-09-11）

- **背景**：Next 端偏好抽屉的「路由动画 9 预设 / 速度」此前只写 `data-route-transition` / `data-rt-speed` 属性而无任何 CSS 消费（KeepAlive 放弃时未跟进），选项形同虚设；功能矩阵「偏好设置抽屉」行描述与实际不符。方案参考旧项目 better-next 的 layout 级 `<ViewTransition>` 用法（其 Next 16.0.10 + `import { ViewTransition } from 'react'` 靠 ignoreBuildErrors 绕过类型缺失）。
- **实现**（仅 next/ 目录，React/Vue 零改动）：① `next.config.mjs` 开 `experimental.viewTransition`（内置文档 `01-app/02-guides/view-transitions.md` 要求；Skill 文档说法相反，按 AGENTS §20 以安装版内置文档为准）；② `src/types/react-canary.d.ts` 经 `import {} from "react/canary"` 引入 ViewTransition 类型（npm 稳定版 @types/react 不含，且不用 tsconfig types 数组以免关闭 @types 自动包含）；③ `admin-shell.tsx` 用 `<ViewTransition default="none" update={...}>` 包 `<main>`——Next 导航本身是 React Transition，layout 级 VT 跨导航持久存在、children 替换触发 update；update class 为 `rt rt-<id>`（routeTransition 为 none 时传 "none"）；④ `styles/route-transitions.css` 从 React 端平移（关键帧/速度倍率/方向变量逐字一致），选择器改 `::view-transition-old/new(.rt-<id>)` class 形式，**无需 React 版的 data-route-vt 门控与摘名机制**——React 仅在自己发起的 VT 期间临时挂 view-transition-class/name，HeroUI toast 与主题切换的第三方 VT 期间 `<main>` 无快照组，天然不误播；⑤ 方向感知：`lib/route-direction.ts`（markRouteDirection，按菜单层级深度判后退写 `html[data-rt-direction="back"]`）接入 6 个导航入口（sidebar-menu / collapsed-menu / command-menu / tags-bar 三处 / sidebar-user / notice-bell 两处）；⑥ 标签「刷新」改 `startTransition(() => router.refresh())`——Transition 提交激活 update，静态页刷新重播切换动画；⑦ admin-shell 补 pathname 变化时 `<main>` 滚动回顶（内部滚动容器，Next 默认 window 级恢复无效）；⑧ theme-transition.css 清理 React 端平移残留的死代码（main-content 组规则与 `[data-vt-name]` 摘名——Next 端无常驻命名的 main，从未生效）。
- **验证**：`tsc` / eslint（0 error）/ `next build` 三绿（build 输出确认 `✓ viewTransition`）。有头 Chrome（CDP 端口被本机策略拦，用「页面内自检脚本 + 本地 3999 接收器回收结果」替代）端到端实测：原生 VT 基线 ready 20ms / 动画 284ms；登录 → 侧边栏导航 `/`→`/settings/users` 捕获 1 次 VT（vtc=`rt rt-glide`、ready=ok）；后退 `/settings/users`→`/`（TagsBar）方向标记 `back` 正确出现、ready=ok。**ZCode IAB 内嵌浏览器渲染管线不支持 ViewTransition**（最朴素的原生 VT 亦 InvalidStateError/TimeoutError，example.com 同样失败），IAB 中看不到动画属环境限制，非代码问题；headless Chrome 的 VT 合成同样受限，不可作为验证环境。
- **机制结论（Next VT，沉淀候选 mechanisms）**：① React canary 的 `update` class 经 `view-transition-class` style 临时注入，VT 结束即恢复，layout 级 VT 在导航（非 enter/exit）时走 update 触发器；② react-dom 内部以 `{update, types}` v2 对象形式调 `startViewTransition`，types 为 null（无 transitionTypes 时）；③ `router.refresh()` 包 startTransition 即可作为 update transition 播动画。
- **环境事故记录（排查耗时占大头）**：验证期间一次失败的 `node -e` shell 命令在 `next/` 根目录创建了**文件名含 `JSON.stringify({test` 与未闭合花括号的空文件**，Tailwind v4 默认 source 扫描把项目内文件名拼进 glob，Turbopack `Glob::new` 解析畸形模式即 panic（dev 全路由 500，清 `.next` 无效、干净 HEAD 也崩——与代码无关）。删除该文件后 dev 立即恢复。另：`pnpm build` 与 dev server 并发跑会争抢 `.next`/Turbopack 持久库（`Persisting failed: Another write batch...`），验证 build 前应停 dev。两次误判（孤儿 postcss 进程 / CSS 内容二分）的教训：**畸形 glob 里的 `stringify({test` 就是 JS 源码片段，本应第一时间反查项目根目录的异常文件**。

---

### Vue M3 完成：页面切换 VT + 列设置 + 我的账户 + 命令面板（2026-09-11）

- **M3-3 页面切换 VT 编排 + 导航方向感知**：`lib/route-vt.ts`（`startRouteVt` 门控 + `canRouteVt`，机制见 mechanisms §15）+ KeepAliveOutlet 内 `router.beforeResolve/afterEach` 编排（旧帧捕获 → 放行导航 → 新页 DOM 提交 → 新帧；2s 渲染超时兜底；连续导航先放行旧回调、afterEach 按 `to` 引用匹配）+ 按菜单层级深度的方向感知（`data-rt-direction="back"` 反转位移类动画）；标签「刷新」复用同套门控（`appliedRefreshSeq` 与 store 分离，激活页刷新延迟到 VT 回调提交）；AdminLayout 面板 body 经 `:ui` 绑定 `.route-vt-main`（`view-transition-name: main-content`），主题切换摘名规则同步改为 class 选择器。GUI 实测：前进 `data-route-vt` 置位 272ms 后清除、后退 `data-rt-direction="back"` 同步出现。**顺带发现 React 端回归**（未动，待修复）：`05f5cff` 架构图谱全宽改造时误删 `<main>` 的 `[view-transition-name:main-content]` 类，React 端路由过渡动画当前实际失效。
- **M3-4 DataTable 列设置**：`column-setting.ts` 纯函数（key 规则 / v1 旧格式兼容 / 顺序合并，9 用例）+ `DataTableViewOptions.vue`（UPopover + useSortable 手柄拖拽 + 至少保留一列禁用 + 全默认不落存储）+ DataTable 增加 `v-model:column-visibility / column-order` 桥接（UTable 内部实例 → 页面实例）；`useColumnSettingKey` composable 接入 10 个列表页（MenusPage 无页面级实例，建影子 `useVueTable` 只承载列状态再 v-model 桥接，DeptsPage 在详情卡操作区直放 `size="sm"`）。拖拽方案按现状收敛为组织树同款 `@vueuse/integrations useSortable`（`vue-draggable-plus` 依赖未使用，vue-plan 表述已修正）。GUI 实测：勾选隐藏两列即时生效、刷新后恢复、相邻行拖拽三端同步（面板顺序/存储 order/表头顺序）、重置复原且清除存储。
- **M3-5 我的账户**：对齐 React 端 account 模块全量——`account-api.ts`（详情/资料/邮箱/密码/头像上传与删除 + 错误映射）+ 双 Tab 六卡（头像 / 基本信息 TagInput / 个人链接前缀输入 + 预览打开 / 只读账号信息 / 邮箱 / 密码）+ `AvatarCropDialog.vue`（vue-advanced-cropper 固定正方形裁剪框 + 滑杆缩放 + ±90° 旋转 → `toAvatarWebpBlob` 256×256 WebP → FormData 上传）+ `PasswordStrength`（5 档）+ `TagInput`（最多 10 个 / 1-20 字符 / 去重 / 超限内联报错）；改密卡复用 `lib/password-validation` 预检（含不含用户名），成功后 `clearSession` + `location.assign('/sign-in')`；api-types 补 `AccountProfile` 等四类型；PasswordField 从 features/users 上移至 `components/common`（对齐 React 端位置）。GUI 实测：displayName 保存后侧边栏即时同步、标签添加/删除（按钮 + 回车两条路径）、强度指示「极弱/强」分档、`新密码至少 8 位` / `两次输入的密码不一致` 前端拦截、测试图注入 file input → 裁剪弹窗 → 上传成功（Supabase Storage URL 返回、toast、侧边栏头像同步）。测试数据已还原（displayName/标签），admin 头像为测试新图。
- **M3-6 命令面板对齐**：AdminLayout 的 `searchGroups` 按 React 端 `collectMenuSections` 语义重构——菜单树按顶层分组拍平（多级条目「父级 › 页面」、顶层叶子无标题节）+ 条目 `searchText`（祖先链 + 分组名，fuse keys 追加该键）+ 快捷链接组 + **自建主题组**（`design-theme.setThemeMode` 带揭示动画，`:color-mode="false"` 关闭 UDashboardSearch 内置 colorMode 组避免绕过 store）。GUI 实测：搜「用户」命中用户管理、搜「系统」（分组名）命中系统管理组下全部 6 页、搜「dark」（英文关键字）命中深色、执行深色切换后 `vueuse-color-scheme=dark` 持久化并已恢复 auto。
- **验证**：`vue-tsc` / eslint / vitest（82 用例，含新增 column-setting 9）/ `vite build` 四绿；GUI 冒烟基于本地 Nest + 5174 dev（账户页测试数据已还原）。已知非应用问题：ZCode IAB 的 locator 超时后可能延迟补发点击（冒烟中多次「页面跳走」假象均由它造成，全部改 evaluate 驱动后稳定）；既有 eslint error `progress-bridge.vue`（空模板 `vue/valid-temple-root`，HEAD 已存在）未处理。

---

### Vue M3 阶段启动：偏好设置补齐 + 多标签页落地（2026-09-10 ~ 09-11）

- **M3-1 偏好设置补齐**（`08c173d`，GUI 冒烟通过）：design-theme-store（Pinia）单一真源 + localStorage 逐项持久化，`initDesignTheme` 在 `app.mount` 前同步应用防首帧闪烁，store 随应用常驻（Black 档需在登录页也跟随明暗重算）。主题色按 better-nuxt 机制：运行时覆盖 `--ui-color-primary-{50..950}`（`--ui-primary` 的亮 500/暗 400 分档链自动跟随），Black 档清 shade 覆盖、改覆盖 `--ui-primary` 为 black/white 并随 isDark 重算，与色板互斥；圆角覆盖 `--ui-radius`，档位文案对齐 React、数值按 Nuxt UI 标度 0/0.125/0.25/0.5rem（默认档不写 DOM）。主题模式并入 store：`useColorMode({ emitAuto: true })` 原样读写 auto（否则「跟随系统」回显错），真源仍是 `vueuse-color-scheme` 键（index.html 防闪烁脚本共用）。主题色/模式/色彩模式切换走 Vue 版 `runViewTransition`（VT 回调内 mutate + `await nextTick()`，对应 React flushSync 收敛提交语义）；平移三个样式文件与色弱 SVG 滤镜；抽屉为 better-nuxt 按钮网格形态（PrefOptionGrid 复用），移除与 Header 重复的语言项。
- **机制结论（Vue 偏好设置）**：① `useAppConfig()` 在 Vue 端是 reactive 单例且 Nuxt UI colors 插件经 glob 也会在 Vue 端加载——理论上可直接改 `appConfig.ui.colors.primary` 触发整套 shade 变量重生成，但其经 unhead 异步更新 `<style>`，与 ViewTransition「mutate 回调内同步完成 DOM 变更」冲突且依赖内部行为，故仍用公开 CSS 变量手动覆盖；② vueuse useStorage 对字符串用裸存储（`dark` 无引号）——index.html 防闪烁脚本原 `'"dark"'` 比较永不成立且 auto 未跟随系统，已修正（裸/带引号兼容 + auto 跟随系统）；③ 色弱滤镜节点（feColorMatrix）平移至 vue/index.html 零尺寸内联 SVG。
- **M3-2 多标签页**（`a10f9eb`，GUI 冒烟通过）：tabs-model 纯函数 + 32 用例自 React 原样平移；tabs-store（Pinia）sessionStorage 持久化（paths + 标题/图标快照）+ refreshSeq + prune/登出 reset（auth-store clearSession 接入）/语言切换 clearTabsCache。TagsBar：UButton 标签 + 关闭热区 + 中键关闭 + UContextMenu 六动作（capture 阶段记录目标标签）+ mask 渐隐/chevron/滚轮横滚/拖拽平移/激活滚入 + 进场动画。KeepAliveOutlet 替代裸 RouterView：**每条路径包一层 `name=path` 的宿主组件**（KeepAlive 的 include 按组件 name 匹配，页面组件名与路径无关且 index.vue 同名冲突，宿主组件按路径缓存保证类型稳定），`include = 已打开标签 ∩ 菜单 keepAlive`（关闭标签即销毁缓存实例）、`max=10` LRU；「刷新」= key 序号重挂载 + include 摘一拍触发 KeepAlive 剪除旧缓存（否则旧实例残留至 LRU 淘汰）；路由切换面板 body 滚动回顶；显隐开关接偏好 showTabs。
- **机制结论（Vue 多标签页，与 React 端差异）**：Vue 原生 KeepAlive 无 React `<Activity>` 的 effects 暂停——隐藏页 vue-query 订阅仍活跃（数据保鲜不冻结，语义差异记录在案）；RouterView 作用域插槽的 `Component` 是 VNode，宿主内经 `h()` 克隆渲染。
- **验证**：两次 GUI 冒烟（本地 Nest + 浏览器实测）——偏好 9 项逐项即时生效 + 刷新持久 + 重置复原（揭示动画后弹 toast）+ Black 随明暗重算；标签登记/快照、keepAlive 页两次切换输入保留、关闭销毁后重开全新、关闭当前页跳右侧幸存者、右键菜单禁用态、刷新重建，全部通过；`vue-tsc` / `eslint` / `vitest`（73 用例）/ `vite build` 四绿贯穿。
- **M3 剩余**：页面切换 VT 编排 + 导航方向感知（route-transitions.css 已就位，data-route-vt 门控待接；Nuxt UI toast 是否误触发根级 VT 待验证）；DataTable 列设置；我的账户；命令面板菜单/路由数据核对。

---

### 密码策略 v1.8.0 同步 Vue 端（2026-09-10）

- **范围**：Vue 端尚无「我的账户」模块，本次仅涉及用户管理的两个弹窗（新建用户初始密码 / 重置密码）；规则口径与 React 端完全一致。
- **规则模块**：新建 `lib/password-validation.ts`，常量 + `passwordContainsUsername` + `getPasswordError` 纯函数部分与 React 端逐行相同；**不带 zod 字段工厂**——UForm 直接展示 `issue.message`，翻译须在表单的对象级 superRefine 中完成（React 端是 issue.message 存 key、渲染层再 `t()`，两端在表单层的接法不同但规则源一致，头注释已注明差异）。`lib/constants.ts` 的 `PASSWORD_MAX_LENGTH = 72` 删除（长度常量随规则迁入新模块）。
- **两个弹窗**：`UserFormDialog` superRefine 改调 `getPasswordError(password, username.trim())`，issue.message 为 `t(\`features.users.form.password.${key}\`)` 精确文案；`UserResetPasswordDialog` 由 `.min(6).max(72)` 字段级校验改为与 UserFormDialog 同构的对象级 superRefine（用户名在校验时从 `props.user` 读取，无需 computed schema），并补 `features.users.resetPassword.passwordHint` 提示（写法沿用 UserFormDialog 的 `:help` + `:ui` 样式透传）。`user-api.getUserErrorMessage` 补 `PASSWORD_CONTAINS_USERNAME` / `PASSWORD_SAME_AS_OLD` 映射。
- **语言包**：`pnpm sync-locales` 从 React 端同步（`@` 转义机制正常，`emailPlaceholder` 仍为 `name{'@'}example.com`）；新增键 `features.users.form.password.*` 与既有叶子键 `features.users.form.password` 共存，Vue 端自定义 `messageResolver` 对扁平 map 精确查找，无嵌套冲突（同 React `keySeparator: false` 语义）。
- **验证**：`vue-tsc --noEmit` / eslint（0 error）/ vitest（31/31，含新增 `lib/__tests__/password-validation.test.ts` 9 用例，边界口径与 React / Nest 一致）/ `vite build` 全绿。
- **至此四端对齐**：契约 v1.8.0 密码策略在 NestJS / React / Next / Vue 全部落地（Vue 账户改密卡待其「我的账户」模块启动时按同一规则实现）。

---

### 密码策略 v1.8.0 同步 Next.js 端：server + web（2026-09-10）

- **server 端**：新建 `lib/server/password-policy.ts`（server-only），与 nest `common/validators/password-policy` 一一对齐——规则本体不再另写一份，直接复用同构模块 `@/lib/password-validation` 的纯函数（`getPasswordError` / `passwordContainsUsername`），此处仅做「规则 → ServerApiError」映射：`assertPasswordFormat`（格式项 → 400 VALIDATION_ERROR，等价 nest DTO 管道）、`assertPasswordNotContainingUsername`（→ 400 PASSWORD_CONTAINS_USERNAME）、`assertPasswordNotSameAsCurrent`（bcryptjs 比对 → 400 PASSWORD_SAME_AS_OLD）。分层与 nest 一致：三个路由（`POST /api/users`、`POST /api/users/[id]/reset-password`、`PUT /api/account/password`）在必填检查后调 `assertPasswordFormat`，原 6-72 位长度判断全部移除；`users-service.createUser` 对 body.username 查包含、`resetUserPassword` 对目标用户查包含 + hash 比对（原 service 内 6-72 兜底删除，格式改由路由层负责）、`account-service.updateAccountPassword` 对本人查包含 + hash 比对（noop 分支删除，`account.password_update_noop` 日志 action 全仓不再产生）。
- **web 端**：`lib/password-validation.ts` 从 React 端逐字节复制（同构副本，server 亦复用）；`user-form-dialog` / `user-reset-password-dialog` / `account/password-form-card` / `account/password-strength` / `account-api` / `user-api` 六文件与 React 端逐行一致（仅多 `"use client"` 头）整文件同步；四个语言包 JSON 直接复制，`pnpm check-locales` 由 42 处差异恢复为完全一致。
- **React 端顺带微调**（保证两端 `password-validation.ts` 逐字节相同）：`getPasswordError` 内的用户名包含判断抽为导出函数 `passwordContainsUsername`（Next server 断言需要单独调用），行为不变，10 个单测全过。
- **验证**：next `tsc --noEmit` / eslint（0 error，2 个既有 `writeLog` console warning）/ `check-locales` / `next build` 全绿；react 单测 / eslint / tsc 复跑全绿。
- **Vue 待同步（用户指令后进行）**：`lib/constants.ts` 的 `PASSWORD_MAX_LENGTH = 72` 与 UserFormDialog / UserResetPasswordDialog 的 6-72 校验、账户改密卡（M3）按同一规则落地。

---

### 密码策略收紧：契约 v1.8.0，NestJS + React 首轮落地（2026-09-10）

- **需求与决策**：三个设置密码入口（新建用户初始密码 / 管理员重置密码 / 我的账户改密）统一为——8-20 位；仅 ASCII 可打印字符（0x21-0x7E，天然排除空格及任何空白、中文 / emoji 等非 ASCII）；必须同时包含字母和数字，可含特殊符号；不能包含用户名（用户名 ≥3 位时才做不区分大小写的包含检查，避免单字符用户名无法设密）；不能与当前密码相同。评估阶段拍板：**不做弱密码字典**（字母+数字即可）；「与原密码相同」由改密场景的「静默成功」（v0.9）改为明确报错，且重置密码场景同样校验（后端持有 hash，一次 bcrypt 比对）。登录不套用策略，**存量不合规密码静默兼容**，下次改密时被强制升级——无迁移。
- **契约先行（v1.8.0）**：`openapi.yaml` 三个密码字段改 `minLength 8 / maxLength 20 / pattern ^(?=.*[A-Za-z])(?=.*[0-9])[\x21-\x7E]{8,20}$`；新增错误码 `PASSWORD_CONTAINS_USERNAME` / `PASSWORD_SAME_AS_OLD`（400），`POST /users`、`POST /users/{id}/reset-password`、`PUT /account/password` 三端点 400 响应补 examples；`main.ts` Swagger setVersion 同步 1.8.0。
- **NestJS**：新建 `common/validators/password-policy.ts` 集中策略——`getPasswordFormatError`（格式四规则按序短路）+ `@IsPolicyPassword()` DTO 装饰器（格式项走 class-validator 管道 → 400 VALIDATION_ERROR；命名避开 class-validator 内置 `IsStrongPassword`）+ `assertPasswordNotContainingUsername` / `assertPasswordNotSameAsCurrent` 两个 service 层断言（跨字段 / 需查库项）。三个 DTO 换装饰器（原 `MinLength(6)/MaxLength(72)` 移除，72 位 bcrypt 上限说明随之退场）；`users.service.create` 对 body.username 查包含、`resetPassword` 对目标用户查包含 + hash 比对、`account.service.updatePassword` 对本人查包含 + hash 比对（noop 分支删除，`account.password_update_noop` 日志 action 不再产生）。
- **React**：新建 `lib/password-validation.ts`（与 Nest 同规则的前端预检副本：常量 + `getPasswordError` 返回 i18n key 末段 + `buildPasswordSchema(username)` zod 工厂）；`user-form-dialog` superRefine 改调 `getPasswordError(password, username)`（原导出常量 `PASSWORD_MAX_LENGTH = 72` 删除）、`user-reset-password-dialog` schema 改为按目标用户名构建的工厂（useMemo）、`account/password-form-card` 从 auth-store 取本人 username 构建 schema 并在无错误时显示规则提示；三处错误渲染由「统一文案」改为按 `issue.message` 拼 `features.users.form.password.*` / `features.account.password.new.*` 精确提示；`PasswordStrength` 最低档阈值 6 → `PASSWORD_MIN_LENGTH`；`getAccountErrorMessage` / `getUserErrorMessage` 补两个新错误码映射。i18n zh/en：新增 12 个 features 键 + 4 个 errors 键、改 3 个提示/占位值、删 2 个死键（`passwordInvalid` / `newPasswordInvalid`）。新增 `lib/__tests__/password-validation.test.ts`（10 用例，边界口径与后端验证用例一致，前后端漂移由此暴露）。
- **验证**：nest `tsc` / eslint 全绿，策略函数以 dist 产物跑 21 个边界用例全过（Nest 端无测试框架，按 §15 不为此引入）；react `tsc --noEmit` / eslint / vitest（86/86，含新增 10）全绿。
- **Next / Vue 未动（待同步，用户指令）**：① Next 端 server 校验 + 三表单 + `account-service` noop 分支改报错，语言包按 `pnpm check-locales` 差异报告（当前 42 处，全部为本次密码文案）对齐后恢复通过——**该脚本在 Next 同步前预期失败**；② Vue 端 `lib/constants.ts` 的 `PASSWORD_MAX_LENGTH = 72` 与 UserFormDialog / UserResetPasswordDialog 的 6-72 校验、账户改密卡（M3）按同一规则落地。契约版本引用统一升至 v1.8.0。

---

### Vue 用户表单样式微调 + 入职日期改用 UInputDate（2026-09-10）

- **用户样式调整**：用户管理弹窗全部输入框（UserFormDialog / PasswordField）移除 `variant="soft"` 回归 Nuxt UI 默认外观；状态开关外框 `rounded-lg` → `rounded-xl` + `border-default`。
- **入职日期 UInputDate 改造**（原生 `UInput type="date"` → `UInputDate` 分段输入 + `#trailing` 内嵌 `UPopover`+`UCalendar` 日历弹窗，结构对齐公告表单发布日期与官方示例）：`state.entryDate` 保持字符串语义不变（UForm zod 校验、编辑回显、提交 `|| null` 映射零改动），新增 writable computed `entryDateValue` 双向桥接——get 经 `parseDate` 转 `CalendarDate`（语义非法日期如 02-31 catch 后视同未设置）、set 经 `toString()` 转回 `YYYY-MM-DD`。注意 `UInputDate` 的 `placeholder` prop 是 Reka DatePickerRoot 的占位日期（`DateValue` 类型）而非文本占位，分段空态占位由组件内置。
- **验证**：`vue-tsc` / eslint / vitest（22/22）/ `vite build` 全绿；浏览器端到端（本地 dev + Nest）——日历选 2026-09-15 分段回填、新增 `test-ui` 用户提交成功（entryDate 合法下发）、编辑重开回显 `2026/9/15`、删除测试用户数据清理。排障备注：Nuxt UI v4 `UCalendar` 弹层不渲染 `table[role=grid]`（日期是 `TD[role=gridcell]` 内 `div[data-reka-calendar-cell-trigger]`），自动化定位以 `data-value` 属性为准；且 UPopover 打开后本身也是 `[role=dialog]`，弹窗可见性判定需按内容区分。

### Vue 用户管理 v1.7.3 对齐 + 「新增用户」弹窗打不开修复（2026-09-09）

- **弹窗打不开根因（vue-i18n 与 i18next 文案语法冲突）**：`features.users.form.emailPlaceholder` = `name@example.com` 中的裸 `@` 被 vue-i18n 解析为 linked message 前缀，消息编译抛 `SyntaxError: Invalid linked format`，引用该文案的 UserFormDialog 渲染中断——点击「新增用户」弹窗不打开。修复分两层：locale 值就地转义为字面量插值 `name{'@'}example.com`；机制层在 `vue/scripts/sync-locales.mjs` 同步后递归转义所有 JSON 文案值的 `@` → `{'@'}`（先还原再转义保证幂等），防止 `predev` 每次同步把裸 `@` 带回来复发（验证过程中 dev server 重启即复现过一次）。机制沉淀 `docs/mechanisms.md` §13。
- **契约 v1.7.3 表单对齐**（对齐 React 端 `user-form-dialog` / `user-reset-password-dialog`）：① `UserFormDialog` password superRefine 补 `> 72` 分支（与 `< 6` 同报「密码长度为 6-72 位」）；② `UserResetPasswordDialog` newPassword 补 `.max(72)`；③ 共享常量 `PASSWORD_MAX_LENGTH = 72` 落 `vue/src/lib/constants.ts`（React 端在 user-form-dialog 导出，Vue 端考虑 M3 账户改密卡复用放公共常量）；④ username / displayName / email / employeeNo 四输入框加 `UInput #trailing` 实时字数 `x/上限`（风格对齐 `MenuFormModal`：`pe-13/pe-16` 预留 + `text-dimmed text-xs tabular-nums`），schema 长度上限同步常量化。
- **顺手修复（同弹窗范围）**：① gender「未设置」与主岗「无主岗」下拉的空串 value 触发 Reka UI `SelectItem must have a value prop` 告警刷屏（空串是 placeholder 清除语义保留值）——改哨兵值 `GENDER_UNSET` / `MAIN_POST_NONE` + `toNullable` 提交映射 null、回显 `?? 哨兵`、岗位联动 watch 排除哨兵；② `UsersPage` 状态筛选 placeholder 引用已删键 `features.users.filter.all`（裸 key 直显），改用列名键（对齐 LogsPage 模式）。
- **验证**：`vue-tsc --noEmit` / eslint（0 error）/ vitest（22/22）/ `vite build` 全绿；浏览器实测（本地 dev + Nest）：弹窗正常打开、email placeholder 渲染 `name@example.com`、四字段字数统计显示、控制台无编译错误与 SelectItem 告警、新增表单与重置密码弹窗输入 80 位密码提交均报「密码长度为 6-72 位」且弹窗保持打开。
- **范围说明**：仅动 `/vue` 用户管理相关 + sync 脚本 + 文档；工作区中公告 UEditor 重构等他人进行中改动未触碰。

### 契约 v1.7.3 同步 Next.js 端：server 校验 + web 表单（2026-09-09）

- **server 端（路由层校验为主，与既有分层一致）**：`POST /api/users` 补 username/displayName ≤50、email ≤100、password ≤72（required 块已有 trim）；`PUT /api/users/:id` 补 displayName trim 后 1-50（路由 trim 后传 service，对齐 nest `@Transform` 行为）、email ≤100；`users-service.resetUserPassword` 长度兜底改「6-72 位」；`PUT /api/account/password` 路由校验补 `> 72`，错误信息同步（next 端 bcryptjs 与原生 bcrypt 同为 72 字节静默截断口径）。
- **web 端**：`user-form-dialog` / `user-reset-password-dialog` / `account password-form-card` 三文件与 React 端逐行一致（仅多 `"use client"` 头），直接整文件同步——含 password zod max(72)、username/姓名/邮箱/工号 `InputGroup.Suffix` 实时字数、用户表单 Modal 宽度 `sm:max-w-lg → sm:max-w-xl`（用户在 React 端手工调宽，随同步带入）；i18n 中英各 5 处密码文案改「6-72 位」。
- **验证**：`check-locales`（与 React 端 14 个语言包完全一致）/ `eslint`（0 error）/ `next build` 全绿。
- **遗留**：Vue 端后续实现时直接按契约 v1.7.3 落地表单约束与字数统计（feature-matrix 已标注）。

---

### Vue 错误页对齐 React Result 风格 + 架构图谱初始居中修复（2026-09-09）

- **架构图谱初始贴顶修复**（`vue/src/features/org/OrgChart.vue`）：vue-flow 的 `fitViewOnInit` 是 Boolean prop（无 options prop，原 `:fit-view-init="{...}"` 传对象仅当 truthy、以默认选项执行），且内置时机在首批节点测量后即触发（bounds 不完整），实测画布整体偏右上、虚拟根节点被截断。改为移除 `fit-view-init`，监听 `@nodes-initialized`（全部节点完成测量，等价 React Flow `fitViewOnInit` 时机）后以 `fitView({ maxZoom: 1, padding: 0.15 })` 居中一次（模块内 `didInitialFit` 标志保证只执行一次，展开/收起后不自动缩放，对齐 React 端交互边界）。
- **错误页同步 React Result 风格**：原 Vue 端 `ErrorPageShell` 是「超大状态码数字 + 标题 + 描述」纯文本壳，与 React 端 `ResultPage`（ant-design Result 插画 + 标题 + 副标题 + 操作区）不一致。按 React 端结构新建 `vue/src/components/common/error-pages/`：`IllustrationForbidden/NotFound/ServerError.vue`（ant-design Result 插画 SVG 平移，根元素自动继承 class）、`ResultPage.vue`（字符串 `title/subTitle` props + `image/actions` 插槽 + `fullscreen/embedded` variant，样式 token 映射 bg-background→bg-default 等）、`ForbiddenErrorPage/NotFoundErrorPage/GeneralErrorPage.vue` 三个页面级组件（i18n 与默认按钮内聚；500 为「重试 + 返回首页」，重试语义对齐 React：history state 有 `from` 回原 URL、否则整页刷新）。删除 `ErrorPageShell.vue`，`(errors)/403|404|500` 与 `[...all]` 兜底页改为引用三个页面级组件。
- **异常页菜单页补齐**（功能矩阵 Vue ❌→✅）：新建 `(authenticated)/exception/403|404|500.vue`（embedded 形态，登录即可、不参与菜单权限校验），`AdminLayout` 全宽白名单补三条 exception 路径，`ROUTE_TITLE_KEYS` 补 `menu.exception.*` 文档标题键（面包屑走菜单树链路天然支持）。
- **验证**：`vue-tsc --noEmit`、`vitest`（22/22）通过；GUI 冒烟（1280×720 暗色）：/org/chart 初始水平垂直居中、根节点完整；/403、/404、/500 全屏页与 /exception/403|404|500 嵌入页（侧边栏 + 面包屑「异常页 → 40x」+ 全宽无内边距）渲染一致；未知路径 catch-all 全屏 404 正常。存量 `progress-bridge.vue` 的 `vue/valid-template-root` lint error 为 HEAD 既有问题，与本次无关未动。

---

### 用户/密码输入长度约束补齐：契约 v1.7.3，前后端兜底口径统一（2026-09-09）

- **背景**：排查发现用户管理表单的限制倒挂——React 前端 zod 已有 username/displayName ≤50、email ≤100、password ≥6，但后端 DTO 仅 username/displayName `@IsString()` 裸放行、password 只 `@MinLength(6)` 无上限，直调 API 可灌超长数据；且 bcrypt 6.0.0 对超 72 字节输入静默截断（不报错，前 72 字节即可登录，机制见 `docs/mechanisms.md` §12）。
- **契约先行（v1.7.3）**：`openapi.yaml` 的 UserCreateRequest 补 username 1-50（trim）、displayName 1-50（trim）、email ≤100、password ≤72；UserUpdateRequest 补 displayName/email 同规；ResetPasswordRequest / AccountPasswordUpdateRequest 的 newPassword 补 ≤72（72 为 bcrypt 输入上限，description 注明）；版本注记追加 v1.7.3 段落，`main.ts` Swagger setVersion 同步（发现其停在 1.7.1，顺手对齐）。
- **NestJS**：`CreateUserDto` / `UpdateUserDto` 补 `@MinLength(1) @MaxLength(50)` + `@Transform` trim（username/displayName）、`@MaxLength(100)`（email）；`ResetPasswordDto` / `UpdateAccountPasswordDto` 补 `@MaxLength(72)`。`ValidationPipe transform: true` 已全局开启，trim 后的值参与校验。
- **React**：新增表单 password superRefine 补 `>72` 校验、重置密码弹窗与 Account 改密卡 zod 补 `.max(72)`（常量 `PASSWORD_MAX_LENGTH` 导出复用）；username / displayName / email / employeeNo 四字段输入框换 `InputGroup` + `InputGroup.Suffix` 实时字数 `x/上限`（参考 `dict-type-form-dialog` 既有写法）；i18n 中英各 5 处密码文案改「6-72 位」。
- **Next.js 未动（待同步）**：契约 v1.7.3 的输入长度约束需在 next 端 server API 校验与表单同步，留待下次 Next 阶段处理。
- **验证**：nest `tsc` / `eslint`、react `tsc` / `vite build` / `eslint` 全绿。

---

### 列表排序口径统一同步 Next.js 端（2026-09-09）

- **四型口径全量对齐 nest 契约 v1.7.2**（`next/src/lib/server/` 11 个文件）：权重型（roles、depts 树/分页 sort 降序）、序号型（menus 树 / dict 项 sort 升序保持 + 次级翻 createdAt 降序）、流水型（logs / notifications / dictTypes / posts 成员列表 createdAt 降序）、内容型（notices 置顶优先 + 次级链）；全部分页列表补 `id DESC` 兜底；users / account 内嵌 roles 摘要与角色列表同口径（`sort DESC, name ASC`）；表头排序接口（users / posts / directory(在 posts-service) / depts / notices）次级兜底链固定、主列即 createdAt 时不重复拼接。
- **修复跨端行为分叉（重要）**：next `normalizePaging` 的 order 缺省原为 `asc`，而 nest 端表头排序接口缺省为 `desc`（`dir = order === 'asc' ? asc : desc`）——即此前 next 端用户/岗位/通讯录/部门/公告列表不传 order 时默认「旧数据在前」，与 react（走 nest，新数据在前）不一致。统一改为缺省 `desc`，注释同步（前端仅通讯录表头显式传 order，其余列表吃缺省，无硬编码冲突）。
- **已知既有差异（未动，留待后续）**：next depts / posts 列表排序白名单缺 `createdAt / updatedAt`（nest 含），表头可排序列范围两端不一致；与本次方向统一无关，行为等价（next 传 sort=createdAt 回落默认列）。
- **验证**：`tsc --noEmit` / `eslint`（0 error）/ `next build` 全绿。

---

### 列表排序口径统一：四型分类 + id 兜底（NestJS，契约 v1.7.2）（2026-09-09）

- **背景**：nest 端各列表排序口径不一——菜单/角色/字典项 sort 升序且次级 createdAt **升序**（同为默认排序号时旧数据霸屏）、用户列表无次级排序（同秒多条翻页可能重复/丢行）、岗位成员列表按 createdAt 升序。经确认按业内惯例统一为「主排序列 → createdAt 降序 → id 降序」兜底链（id 兜底是分页正确性：nanoid 主键唯一稳定，消除非唯一列排序的不稳定顺序）。
- **四型口径**（详见 `docs/mechanisms.md` §11）：权重型 sort 降序（角色、部门树/分页）；**序号型 sort 升序保持不变**（菜单=导航序号、字典项=枚举序，seed 与线上共享库数据均按此语义，翻转 = 侧边栏/字典下拉全站倒序且需数据迁移，用户拍板的「大在前」仅适用于权重语义）；流水型 createdAt 降序（日志、站内信、字典类型、岗位成员——最后一个原为升序）；内容型置顶优先（公告：isTop → 排序列 → createdAt → id）。
- **表头排序接口**（users / posts / directory / depts / notices）：sort/order 参数仅替换主排序列，次级兜底链固定，主列即 createdAt 时不重复拼接；菜单/角色/字典项仍为写死排序。用户/账户内嵌 roles 摘要与角色列表同口径（`sort DESC, name ASC`）。OpenAPI 版本注记补 v1.7.2 说明默认排序行为变更（接口参数不变）；前端仅通讯录表头显式传 order，其余依赖后端默认——无硬编码冲突。11 个 service 改动，`tsc` / `eslint` 通过（nest 无测试脚本）。

---

### 错误页重设计为 Result 风格 + 异常页菜单上线（React / Next）（2026-09-09）

- **Result 风格重设计**：三个错误页换为 Ant Design Result 的信息结构（插画 250px → 标题 24px/600 → 副标题 14px 次要色 → 操作区，整页居中）。插画取自 ant-design 仓库源码（MIT，SVG 原样），强调色保留 antd 原值维持语义（404 蓝 / 500 橙红 / 403 紫，不跟主题色切换——用户确认场景色语义优先）；删除旧样式（error-page-shell 毛玻璃壳、error-page-glyph 线稿、error-page.css 动效/流光）。Next 端同步（路由 API 为 bprogress router / next/link，/500 保留 ?from 重试语义）。
- **错误页登录收紧**：此前两端都将 /403 /404 /500 列入匿名白名单（React 路由在 _authenticated 守卫之外；Next proxy PUBLIC_PATHS + matcher 双重豁免）。按「仅登录页匿名」口径收紧：React 三个路由加 beforeLoad（redirect /sign-in 携带回跳地址）；Next PUBLIC_PATHS 收紧为仅 /sign-in 且 matcher 同步移除三路径（否则请求不进守卫）。
- **异常页菜单（/exception/403、/exception/404、/exception/500）**：`ResultPage` 加 `variant` 形态（fullscreen 默认 / embedded 撑满父容器，插画 max-h-[45vh] 防小窗滚动条），三个页面组件透传；React 布局内路由（_authenticated/exception/*）+ Next (authenticated) 组 page；两端 FULL_WIDTH_ROUTES 加入三路径（main 去 padding 贴边撑满）；sys_menus 直插菜单数据（目录「异常页」shield-alert + 三个子菜单 ban/file-question/server-crash，i18n_key=menu.exception.*，事务+幂等脚本；超管经全量掩码免过滤自动可见，普通角色需角色管理授权）；locales 两端四份 menu.json 加中英文案。菜单页与错误跳转路径分离——真实错误仍走全屏 /403 /404 /500，菜单页为 embedded 演示形态。
- **验证**：React tsc / eslint / vitest（76 用例）/ vite build（routeTree 含 exception 路由）；Next tsc / eslint / check-locales / next build（输出 /exception/* 三路由）全绿。

---

### React 错误页回滚为跳转独立页，四端行为统一到跳转口径（2026-09-09）

- **背景**：上一条目完成主体区直显改造（ef9f53b）后重新评估跨端对齐：Next 端机制特殊（404 由路由层兜底到根 not-found、403 门卫是有意的服务端 proxy 架构），用户决策 Next 不改；「Next 不变」约束下直显无法四端统一，而跳转口径在四端都落在各自框架惯用机制上（React 客户端跳转 / Next proxy redirect + 框架兜底 / Vue M0 catch-all 全屏页），且直显的产品价值集中于 403 单一场景，不值长期分叉代价。用户拍板 React 改回跳转。
- **做法**：`git revert` 只取 ef9f53b 代码部分（恢复 /403 /404 /500 路由与根路由跳转中转、删除 catch-all splat 与 notFound overlay 判定、删面板级 PaneErrorBoundary 与 TagsBar 守卫），回到 117e0e4 跳转方案（其后新增的动态路由父路径权限判定等增强本就存在于父提交，全部保留）；docs 不随 revert——mechanisms.md §2 的「跳转」表述随行为回滚重新准确，feature-matrix 备注更新为四端统一跳转口径。
- **遗留**：三个错误页组件（ErrorPageShell 壳）保持现状，等用户重新设计；重新设计只改组件视觉，不影响跳转行为。
- **验证**：tsc、eslint、vitest（7 文件 76 用例）、vite build 全绿。

---

### React 错误页回归主体区直显：403/404/500 布局内展示，推翻独立错误页跳转（2026-09-09）

- **背景**：用户需求调整——推翻 2026-08-30 v2「403/404/500 跳转独立全屏页」设计（提交 117e0e4），错误态只在 Admin 布局 main 主体区展示，侧边栏/顶栏/标签栏保留、可直接点其它菜单离开。三个错误页组件（ErrorPageShell 壳）保留待用户重新设计，尺寸本次不动。
- **403**：`admin-layout.tsx` 恢复 forbidden 时 overlay 直显 `ForbiddenErrorPage`（URL 不变），删 replace 跳转与跳转前撤标签逻辑；保留动态路由父路径判定；无权路径仍登记标签（旧 overlay 方案语义，点回仍 403）。
- **404**：新增 catch-all splat 路由 `routes/_authenticated/$.tsx` 兜住未匹配 URL 使布局稳定（router 不再触发 notFound 流程替换布局）；**刻意不注册 component**——KeepAliveOutlet 按 URL 解析 routeTree 叶子组件（`findRouteLeafComponent`），splat 若带组件会让任何未知路径「解析成功」、404 判定失效。AdminLayout 新增 notFound 判定（解析不到叶子组件 → overlay 直显 404，优先于 403）；TagsBar `openPath` 加守卫，无匹配路由的路径不登记标签；根路由 `notFoundComponent` 恢复直挂（布局外兜底，登录页等场景）。
- **500**：`keep-alive-outlet.tsx` 新增面板级 `PaneErrorBoundary`（class 组件手写，不引依赖）——KeepAliveOutlet 旁路 TanStack Match 渲染，页面组件错误进不了路由器 errorComponent 边界、冒泡到根会导致整布局消失；面板级边界仅当前面板显示 500、其余保活面板不受影响，「重试」= 重置边界 + key 递增重挂载子树。`GeneralErrorPage` 增加可选 `onRetry` prop（缺省整页刷新，根路由兜底场景用）；根路由 `errorComponent` 恢复直挂。
- **清理**：删除 `/403` `/404` `/500` 独立路由（重新生成 routeTree）；`router.ts` 删 `ErrorRedirectState`；`__root.tsx` 删 `NotFoundRedirect` / `ServerErrorRedirect` 两个中转。
- **验证**：tsc、eslint、vitest（7 文件 76 用例）、vite build 全绿。
- **跨端评估（Next 端保持原样，用户确认）**：Next 端经评估不对齐本次改动，维持独立全屏页——机制差异有三：① 未匹配 URL 由 Next 路由层兜底到根 `app/not-found.tsx`（官方设计，不经过任何布局；布局内 404 需 catch-all page + 段级 not-found 组合，违背框架惯例）；② 403 门卫是 N2 有意的服务端架构（proxy.ts 统一执行 + N7 语义修正），改客户端直显会推翻；③ 段级 `error.tsx` 虽可低成本布局内直显，但为保持三态行为一致一并保留。Vue 端（M0 占位）后续实装时按 React 新口径评估。`docs/feature-matrix.md` 备注已更新。

---

### Next server 端请求校验与契约对齐补齐（2026-09-09）

- **背景**：Nest 侧契约对齐补录（上一条目）后排查 Next server API 同口径现状：notifications 分页（normalizePaging 白名单）、dict types/items（route 层长度+格式校验）、roles（assertFieldLengths、409 冲突码、super_admin 停用 403）、menus addChild 布尔字段、password ≥6、notices POST content 非空均已对齐；发现 6 处缺口本轮补齐。
- **补齐**（对齐 nest @IsEmail / @MaxLength / @IsNotEmpty / @ArrayMaxSize 与契约声明）：① PUT /notices/{id} content 有传须非空（此前空串可清空已发布公告内容，trim 口径与 POST 一致）；② PUT /account/profile 的 website 补 ≤255 上限（剥离前缀后的裸值口径，对齐 nest @MaxLength(255)）；③④⑤ users POST / users PUT / PUT /account/email 的 email 补格式校验（新增 EMAIL_PATTERN 共享正则于 lib/constants.ts，三处共用）；⑥ PATCH /org/depts/sort 的 items 补 ≤200 上限。
- **顺手修复既有类型错误**：roles-service.ts assertFieldLengths 的 description 参数未含 null（7f2768f 遗留——UpdateRoleInput.description 为 string | null，tsc --noEmit 报 TS2345），typeof 窄化修复。
- **验证**：tsc --noEmit 全绿、改动文件 eslint 0 error、Prettier 格式化。行为影响：均为服务端兜底，正常前端流程（react 端表单 zod 已有 email / website 255 约束）不可触发。

---

### Nest 接口与 OpenAPI 契约全量对齐扫描 + 补录（契约 v1.7.1）（2026-09-09）

- **背景**：用户发现 nest 接口近期改动可能未与契约对齐，要求全量扫描。方法：通读 openapi.yaml（44 路径）逐一对照 13 个 controller、31 个 DTO 与各 service 校验逻辑。**结论：路由/方法/权限位/@HttpCode/主要错误码/响应视图全部对齐**；差异集中在「最近表单校验三端对齐系列提交（角色/字典字段长度）只改了实现、契约未同步」与若干错误码声明缺漏。
- **契约补录（以实现为准的文档追认，无破坏性行为变更）**：POST /roles、PUT /roles/{id} 补 409 ROLE_CODE_EXISTS / ROLE_NAME_EXISTS（唯一冲突实现已有）；PUT /roles/{id} 补 403 SUPER_ADMIN_ROLE_PROTECTED（停用 super_admin 保护，v1.4.3 漏录编辑口）；PUT /roles/{id}/menus 400 补 INVALID_OPERATION；POST /dict/types 补 409 DICT_TYPE_CODE_EXISTS；Role/DictType/DictItem 请求 schema 补长度与格式约束；AddChildRequest 补 keepAlive/hideInMenu/enabled/defaultOpen（AddChildDto 一直接受并落库）；DeptSortRequest.items 补 maxItems 200；UserCreateRequest.password 与 ResetPasswordRequest.newPassword 补 minLength 6；UserUpdateRequest.email 补 format: email；管理端 User 视图补录 lastLoginAt（toView 展开剩余列、一直返回）。
- **契约自身修复**：AuthUser.tags 的 items 缩进错位（原误挂在 xUsername 属性下导致 tags 无 items）；DictItemCreateRequest 移除 body.typeCode（实现以路径参数 code 为准，该字段被全局 whitelist 剥离、从未读取）。
- **实现侧同步收紧三处兜底校验（对齐契约既有声明）**：UpdateAccountProfileDto.website 补 @MaxLength(255)（此前只有格式正则，react 端前端本就限 255）；NoticeCreateDto/UpdateDto.content 补 @IsNotEmpty（契约「非空」语义落地，此前空串可建公告）；GET /notifications 查询参数 DTO 化（新建 NotificationQueryDto，page/pageSize 枚举/unreadOnly 与契约一致，此前手动解析无校验）。
- **周边同步**：main.ts Swagger 展示版本 1.2.0 → 1.7.1（与契约 info.version 同步）；openapi-design.md §4 错误码清单补登 v1.4 后各模块全部错误码（DEPT_*/POST_*/NOTICE_*/MENU_*/AVATAR_* 等，清单此前停留在初版）+ 变更记录 v1.0。
- **验证**：tsc 构建通过、eslint 无 error、PyYAML 解析通过（58 个 $ref 引用全部有效）。前端影响评估：三处收紧均为服务端兜底，react 端表单已有对应约束（website maxLength 255 等），正常流程不可触发。

---

### Vue 端表单禁用失效修复：UFormField 无 disabled prop，锁定字段全部可编辑（2026-09-09）

- **现象**（用户报告）：角色编辑时 code 可修改但保存后不变——这是**设计内行为**（Nest `UpdateRoleDto` 白名单仅 name/description/enabled/sort，注释明确「code 创建后锁定」；React 基准同语义），真正的 bug 是**编辑态锁定从未生效**。
- **根因**：`UFormField` **没有 `disabled` prop**（@nuxt/ui 4.11 FormField.vue 源码零匹配），传入值作为无效 attrs 落到根 div，对内部输入控件毫无作用——与 React（HeroUI）「FormField 传导 isDisabled」的心智模型不同。disabled 必须直接挂在 UInput/USelect/USelectMenu 等控件上。
- **影响面**（全仓 grep 排查，功能性问题 3 处）：① 角色 code（编辑态可改但不提交 → 静默丢弃，即用户报告的问题）；② **super_admin 编辑态 name（可改且载荷会提交 name → 超管改名保护缺口，比报告问题更严重）**；③ 字典类型 code（同角色，静默丢弃）。另有 2 处无效冗余（DeptFormDialog parent / DeptLeaderSelect，内部控件本就有 disabled，仅删 FormField 上的无效 attr）；UserFormDialog 主岗位等其余匹配均为控件自身 disabled，无问题。
- **修复**：四处文件将 disabled 移到实际控件上（对齐 React `isDisabled` 挂输入控件的写法）：RoleFormDialog code `:disabled="isEdit"` + name `:disabled="isSuperAdmin"`、DictTypeFormDialog code `:disabled="isEdit"`；USwitch 的 enabled 锁定原本就正确（disabled 直接绑组件）。约定沉淀：**Vue/Nuxt 端 UFormField 不传导 disabled**，锁定一律挂控件。
- **验证**：vue-tsc / eslint 全绿；浏览器实测——管理员编辑 code 禁用、super_admin 编辑 code+name 双禁用（sort 可改对齐 React「仅 description…等可改」口径）、字典类型编辑 code 禁用。测试备注：UModal/USlideover 关闭后 teleport DOM 残留会污染 `querySelectorAll("[role=dialog]")` 类查询（视觉已卸载），自动化判定需以截图或 display 过滤为准。

---

### Vue 端角色授权抽屉重构：手写勾选模型 → Nuxt UI UTree 集合模型（2026-09-08）

- **背景**：角色管理菜单授权的父子级联错乱。根因在 `GrantTreeNode.vue`（已删除）的位复选框本地残留层 `bitChecked`——只在手动切位时写入、永不失效，父级勾选/取消整树（`setSubtreeChecked` 直写 `overrides.bits`）后 UI 与真实授权位脱节，且残留跨抽屉开关存活；另有目录 `checkState` 渲染期递归整树的 O(n²) 未同步 React 端 `checkStateMap` 优化。
- **方案**（评估先行、用户确认后实施）：改用 Nuxt UI `UTree`（@nuxt/ui 4.11 内置，reka-ui TreeRoot 封装）——权限位作为叶子菜单的**虚拟子节点**（key = `${menuId}:${item.value}`，携带 bits）参与级联，勾选状态收敛为**单一选中集合**（`v-model`，TreeItem 对象数组），`bitChecked` 类双源残留从结构上消失。评估阶段核对了官方文档 + 两个包的源码（propagate/bubble/isIndeterminate 的确切语义），非凭记忆。
- **关键决策——级联手写而非组件内建**：所有 `@select` 事件统一 `preventDefault`，勾选/取消走自实现 `toggleItem`（未全选 → 子树加入集合并向上冒泡；已全选 → 子树移出并父链失效），精确对齐 React `toggleMaster`；`bubble-select` 仅保留其 `isIndeterminate` 推导用于半选显示。原因：reka 的 `propagate/bubble` 无法表达「载荷只含显式勾选传播的节点」口径，且半选回显目录需「在集合 ⇔ 全选态」不变式才能保证 toggle 语义正确。
- **载荷/统计口径对齐 React**：`explicitVisibility` / `touchedBits` 对应 React `visibleOverrides` / `bitsOverrides`——冒泡推导入集合的父级仅影响显示、不入载荷（不给无记录目录凭空补授权）；叶子有位 → 选中位 OR 聚合（半选叶子也保存），目录/无位叶子 → 显式设置 ?? 服务端记录；统计半选计入（6/13 口径）。`resetSelection` 数据可用（含缓存）立即回显，避免 staleTime=0 refetch 期间空树闪烁（React 直接消费缓存渲染的同语义）。
- **UTree 适配要点**：`:as="{ link: 'div' }"`（checkbox 是 button 禁止嵌套）；`#item-leading` 放 UCheckbox（`indeterminate ? 'indeterminate' : selected`）+ 菜单/位图标，`#item-label` 渲染停用标签；`:ui.link: 'before:bg-transparent'` 覆盖选中行高亮（授权树无导航选中语义）；节点类型独立定义（不 extends 带 index-signature 的 `TreeItem`，位节点显式 `children?: undefined`，规避联合拓宽与 TS2589）；`v-model:expanded` 受控 + `get-key` 稳定 id。
- **验证**：vue-tsc / eslint 全绿；GUI 端到端（本地 Nest + 浏览器实测）——回显（半选目录 `[checked=mixed]`、统计 6/13 含半选）、勾选目录整树级联（6→12）、取消单位向上半选（父级与根目录同时 `[checked=mixed]`）、半选点击变全选、取消目录整树清空（12→6）、保存载荷服务端落库正确（12 条 ↔ 6 条）、保存后重开回显一致。**已知说明**：USlideover 关闭后 teleport DOM 残留（a11y snapshot 可见、视觉已卸载）与关闭后空 roleId 的后台查询报错均为重构前既有行为，未扩大范围处理。
- **范围**：仅 vue 端三文件（`use-grant-tree.ts` 重写 / `RoleGrantDrawer.vue` 模板换 UTree / `GrantTreeNode.vue` 删除）；React 端不动，功能矩阵无状态变化。

---

### Vue 端 M2 组织中心剩余 7 模块全量落地（2026-09-08）

- **范围**：vue-plan M2 后七项——岗位管理 / 人员通讯录 / 公告管理 / 我的公告 / 站内信 / 架构图谱 / 通讯录 Excel 导出，全部对齐 React 端功能语义；七个独立提交（0f060c2 → 514f194），每模块一项。验证：vue-tsc / eslint / vitest（22 用例）/ vite build 四绿。**已知限制：本轮仅代码落地 + 构建验证，GUI 冒烟验收待做**（需本地 Nest 服务；feature-matrix 中 7 项均标注「待 GUI 冒烟验收」）。
- **基建复用**：列表页全部走 M1 既有范式（createListStore + useListQuery epoch 策略 + DataTable 组合件 + toast.promise 三段式 + ConfirmDialog 关键词确认）；组织树筛选复用 DEPTS_TREE_QUERY_KEY 共享缓存与 DeptTreePanel。
- **关键决策 / Nuxt UI 能力适配**（与 React 端交互的实现偏差，功能语义等价）：
  - 公告发布范围选择器：岗位/人员候选由 React 端 useInfiniteQuery 滚动加载改为 **USelectMenu 本地多选 + 弹窗打开时串行拉全量**（staleTime 60s；演示规模 1-3 页），「全量可选」语义不变；
  - 公告定时发布：HeroUI DatePicker（分钟粒度）改用**原生 datetime-local 输入**，toISOWithOffset 本地时区偏移转换逐字平移（契约 RFC3339 语义不变）；
  - 岗位表单 UForm+zod、公告表单 UForm+zod（superRefine 延迟求值文案跟随 locale）；
  - 架构图谱：@vue-flow/core 1.48（Background/Controls 已拆分为 @vue-flow/background、@vue-flow/controls 子包，需单独装 + 各自 CSS）；暗色适配给画布容器挂 .dark 类（useColorMode resolved 值驱动）；手写树布局 org-chart-layout.ts 零改动平移（mechanisms §7.2 适用）；
  - Excel 导出：write-excel-file 4.1.1 原库复用（同 React 版本），getSheetData + columns 样式管线逐字平移；
  - 站内信铃铛：UChip 红点角标 + 60s refetchInterval 轮询；抽屉固定「未读/全部」UTabs 筛选器（无 Panel，对齐 React 端语义）；公告详情消费路由 /org/notices/:noticeId 登录可达。
- **我的公告 URL 驱动选中**：?noticeId= ↔ 选中公告双向同步，KeepAlive 转场守卫口径为 route.path !== '/my-notices' 时忽略 URL 回写（对应 React 端 pathname 守卫）；首读生效后失效 my-notices + notifications 双缓存（未读点/红点即时消隐）。
- **顺带修正**：UserInfo 入参由 Pick<User> 放宽为结构化最小接口（DirectoryEntry 的 email/avatar 可空）；menu-utils 补 collectMenuPaths（详情页「返回列表」降级判断）；AdminLayout 铃铛占位换正。
- **文档滞后修正**：feature-matrix 基础设施 6 项（i18n/主题/命令面板/错误页/路由守卫）M0 验收后遗留的 🔧 转正 ✅；统计口径修正为 23 项（组织中心实为 8 行，原口径 22 项少计 1 行），React/Next 同步重算为 96%。
- **环境注意**：本轮工作期间仓库存在另一批并行未提交改动（角色授权树重构 GrantTreeNode 删除 + menus DTO/表单三端修改），vue type-check 全量跑会命中该批进行中代码的报错，与本轮产出无关；本条目各提交均精确限定文件范围未夹带。

---

### 菜单表单字段校验补齐：契约 + Nest DTO + React 表单对齐（2026-09-08）

- **背景**：菜单 label / i18nKey / icon / to 四字段此前仅前端 zod 有长度与格式限制，Nest DTO 只有 `@IsString`，DB 为无上限 `text`，OpenAPI 契约也无声明——绕过前端可直接写入超长 label、空 icon、非法格式 i18nKey（服务端无任何字数防线）。
- **方案上限**（用户给定，经评估采纳）：label 1-20 字、i18nKey ≤100 字 + 点分格式、icon 1-30 字、to ≤200 字 + `/` 或 `https://` 开头。label 20 与角色 name 上限一致，其余上限对实际数据（seed 菜单 `menu.system`、lucide 图标名、路由路径）均充裕。
- **契约先行**：openapi.yaml 的 `MenuCreateRequest` / `MenuUpdateRequest` / `AddChildRequest` 补 `minLength` / `maxLength` / `pattern`；to 的格式校验保留在 service `assertValidTo`（保留 `MENU_TO_INVALID` 业务错误码路径，未下沉 DTO）。
- **Nest**：三个菜单 DTO 按字典模块先例加 `@Length` + `@Matches(I18N_KEY_PATTERN)`（复用 `@/lib/constants` 既有常量）；create 路径 i18nKey / to 空串归一 `|| null`（与 update 路径口径统一，修复空串可绕过 `menus_to_unique` 部分唯一索引落库的隐患）。
- **React**：表单 zod 上限对齐（label 50→20，i18nKey / icon / to 补 max）；四个输入框换 `InputGroup` + Suffix 实时字数（照搬角色表单模式，`maxLength` 硬限制 + `n/上限` 显示）；`labelInvalid` 文案同步 20 字。
- **Next（同日跟进）**：UI 与 react 同构（常量 + zod 上限 + InputGroup 实时字数；next 端表单 i18nKey 既有语义为必填 `min(1)`，与 react 端可空不同，保持不变仅加上限）；server 侧 `menus-service` 新增 `assertFieldLengths`（四字段长度 + i18nKey 点分格式），`createMenuRow` / `updateMenu` 入口统一调用——三条写路径（POST/PUT/add-child）全部收敛于这两个入口，一处校验即全覆盖，故未照搬 roles 先例的 route+service 双层重复；create/update 的 i18nKey / to 空串归一 `|| null`（route 解析层已归一，此为 service 直调场景的防御）。
- **验证**：nest / react / next `tsc` 0 error；react eslint、vitest（i18n 3 用例）全过；契约 diff 人工核对。
- **待同步**：vue 端表单尚未跟上本规格，后续安排。

### 搜索按钮「提交 / 刷新」双语义三端统一：条件未变不再禁用（2026-09-08）

- **需求**：列表页搜索按钮原在条件未变化（`searchDirty=false`）时禁用，但用户可能只想刷新列表——禁用杀死了刷新语义。放开禁用后同值点击是 no-op（`setSearch` 同值幂等，见 mechanisms §4.2），按钮「点了没反应」更差，故配套引入刷新分支。
- **方案**（业内传统后台模式，经用户确认）：搜索按钮仅请求中禁用 + pending；`useListQuery.submitSearch`——输入与已生效条件不同 → `setSearch` 正常提交（epoch+1、回第 1 页）；相同 → `refetch()` 强制绕过缓存重新请求（页码/筛选/排序全保留，`keepPreviousData` 不闪空）。核心逻辑为三端逐字同构的纯函数 `submitListSearch`。
- **落地**：react / next / vue 三端组件（`DataTableSearchReset` 删 `searchDirty` prop）+ 装配层 + 页面全量接入——服务端分页页（users / roles / org posts / logs / notices / org directory / dicts 字典项）提交回调换 `submitSearch`；本地过滤页（menus / permissions / dicts 类型树）仅删 prop。vue 端同时新增 `composables/__tests__/use-list-query.test.ts`（与 react 端两分支用例语义对齐）。
- **验证**：三端 tsc / eslint / prettier 全绿；react + vue vitest 全过（22 + 22 用例）。机制沉淀见 mechanisms.md §4.4。已知取舍：store 层同值幂等保持不变（URL 同步等隐式调用防重复请求仍依赖它），「同值发请求」仅发生在用户显式点搜索的路径。vue 端 dicts 字典项搜索沿用 `itemsQuery`（独立 useQuery），未走 useListQuery 装配，其「同值刷新」由本地过滤语义天然覆盖。

### Vue 端 M1 冒烟验收通过：修复启动整页刷新死循环 + 字典左栏骨架卡死（2026-09-06）

- **结论**：M1 六模块（users / roles / permissions / menus / dicts / logs）GUI 冒烟验收**通过**——登录认证链路（登录 → 预取菜单 → 守卫 → 布局 → F5 会话恢复）、侧边栏导航、六页列表/表格/筛选/分页均正常；build（vite + vue-tsc）/ eslint / vitest（20 用例）四绿。feature-matrix Vue 列七项 🔧/❌ → ✅（角色管理行此前漏更，一并修正）。
- **P0 修复一：启动整页刷新死循环**（即前一会话遗留的「登录主线程卡死」真因）。`main.ts` 在 `router.isReady()` 之前 `app.mount()`，挂载瞬间 `useRoute()` 仍是初始占位路由（path="/"），AppShell 在 `/sign-in` 误挂 AdminLayout → 无 token 请求 `/menus` → 401 → refresh 失败 → `window.location.assign("/sign-in")` 整页刷新 → 无限循环（实测 ~7 次/秒，每次写一条 error.401 日志，20 分钟累计 2000+ 条）。修复：`router.isReady().then(() => app.mount("#app"))`。排查手法与机制沉淀见 mechanisms.md §8。
- **P1 修复二：字典管理左栏永远骨架**。`DictsPage.vue` 模板 `v-if="typesQuery.isLoading"` 拿到的是查询信封对象里的 **Ref 本身**（恒 truthy）——接口已 success、计数显示 3，骨架仍永久渲染。改为 `typesQuery.isLoading.value`（其余页面均为解构写法无此坑）。机制沉淀见 mechanisms.md §9。
- **诊断环境残留清理**：auth-store 登录 trace 打点、AppShell `VITE_LAYOUT_OFF` 二分开关、menu-fetch 栈参数、临时日志代理均已移除还原。本次新增的环境产物：`vue/.env.local`（`VITE_API_BASE_URL=http://localhost:3001/api`，本地联调用，已 gitignore）；本地起 Nest 需带 `PORT=3001 CORS_ORIGINS="http://127.0.0.1:5173,http://localhost:5173"`（vite 只绑 127.0.0.1 时 origin 非 localhost 默认白名单）。
- **已知残留**：排查期间死循环向共享 Supabase 库写入了约 2400 条 `error.401` 日志（logs 表总量 3.6w），如需可按 `action = 'error.401' AND user_id IS NULL AND created_at >= '2026-09-06'` 清理；登录页 sign-in.vue 的 toast → 页内 Alert 改动与 i18n 键为前一会话调试产物，本轮确认行为合理予以保留，随 M1 收尾提交。
- **待办不变**：列显隐/拖拽列设置、vee-validate 引入延后决策不变；Dashboard 各端均未实现。

### website/ 文档站落地：Next 16 + Fumadocs + ogimg 黑白皮肤（2026-09-06）

- **品牌统一（同日第三轮）**：全局字体换成 **Maple Mono CN**——与 react / next 端同源自托管子集（`public/fonts/maple-mono-cn-regular.woff2`，GB2312 常用字 + ASCII，woff2 ≈1.7MB，OFL-1.1），`globals.css` 顶部 `@font-face`（`font-display: swap` + `unicode-range` 限定区段，生僻字回退系统字体，与 react 的 `styles/fonts.css` 规则一致），`--font-sans` 与 `--font-mono` 栈首位均为 `'Maple Mono CN'`。Logo 换成项目实际 Logo：复制 `logo.svg` / `logo-dark.svg`，新增 `components/logo.tsx`（next-themes 按 resolvedTheme 切换亮暗变体，方式对齐 react 的 app-sidebar），navbar（24px）与 footer（32px）替换占位 LogoMark；同时复制 `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` 并在 metadata 挂 icons。tsc 0 error、build 全绿、截图验收。

- **范围**：新增第六个独立应用 `website/`（Better Admin 官方文档站，规划经用户逐项确认：Fumadocs 内容引擎 / `website/` 目录名 / `docs.baiwumm.com` 域名）。技术栈：Next 16.2.6 + React 19.2.6 + Tailwind 4.3.3 + fumadocs-ui/core 16.15.7 + fumadocs-mdx 15.4.0 + next-themes。视觉按 `F:\projects\ogimg` 风格移植：shadcn neutral oklch 黑白 token、`--radius: 0.625rem`、全站虚线边框分隔、玻璃岛悬浮导航、pill 按钮、fade-up 入场动效、方角滚动条；暗/亮/系统三态主题。**边界说明**：文档站是独立展示型应用，不属 admin 产品四前端，UI 走 shadcn 体系（用户指定），不适用 §7.2 的 HeroUI 优先策略，也不进 feature-matrix。
- **内容策略（防双源）**：`docs/` 仍是唯一真源；`website/scripts/sync-docs.mjs` 在 dev/build 前自动同步 14 篇（docs/*.md + nest/docs/*.md + AGENTS.md）→ `content/`，同步时注入 frontmatter（title/description）、重写内部相对链接为站内路由（零遗漏）、生成 meta.json（sidebar 分组：指南/设计/后端/前端实现/进展）与 /docs 概览卡片页；`content/` 与 `.source/` 均 gitignore。MDX 字符安全化：围栏代码块与行内代码之外的裸 `<`、`{` 转义 HTML 实体（progress.md 的「<6 位」曾致 MDX 编译失败），HTML 注释删除。
- **fumadocs 16.15.7 API 事实（与旧记忆差异大，以包内类型为准）**：`createMDX` 从 `fumadocs-mdx/next` 导入（`/config` 只有 define 系列），且必须两段式 `export default createMDX()(config)`——直接 `default createMDX(config)` 返回函数会被 Next 以 `phase-development-server`（24 字符）调用，产生「Unrecognized keys '0'-'23'」警告；默认配置文件名仍是 `source.config.ts`；codegen 产物是 `.source/server.ts`（无 index.ts，top-level await），loader 接 `docs.toFumadocsSource()`；搜索 `createFromSource(source)` 只导出 `GET`；界面文案无内置中文包，经 RootProvider `i18n.translations` 传「英文键(上下文)」格式翻译（`lib/i18n.ts`）。
- **Tailwind 版本要求**：fumadocs-ui 的 CSS 使用 `inset-s-*` 等 4.2+ utility，**必须 tailwindcss ≥ 4.2**（4.1.11 下静默编译输出空 CSS、无任何报错；本站装 4.3.3，与 next/ 应用的 4.1.11 互不影响）。
- **Turbopack 坑**：dev 文件系统缓存会保留编译失败期的空 CSS 产物（`rm -rf .next` 解决）；Windows dev 进程偶发原生崩溃（0xC0000409），生产 build 稳定。
- **验证**：tsc 0 error；`pnpm build` 全绿——22 个路由全部静态化（15 篇文档 SSG + 首页 + 动态 OG 图（next/og 英文文案规避中文字体依赖）+ robots + sitemap），唯一动态路由 `/api/search`（fumadocs lucene，中文命中正常）；浏览器验收：首页/文档页/搜索对话框（关键词高亮 + 面包屑分组）/sidebar 分组/TOC/暗亮双主题均正常。
- **ogimg 三件套补齐（同日第二轮）**：① 首页移植 ogimg 的 `LightRays` WebGL 光线背景（`components/background/light-ray.tsx` 原样移植，新增依赖 `ogl@1.0.11`——该组件唯一依赖；fixed z-0 铺底 + 内容层 z-10，亮色下呈柔光、暗色下为标志性顶部光束，跟随鼠标）；② 页脚重构为 ogimg 极简结构（品牌+简介居左、GitHub 图标居右、底行版权 + `TextScramble` 乱码渐显署名 baiwumm）——`TextScramble` 去掉 ogimg 的 motion 依赖改纯 React 重写（`components/text-scramble.tsx`，其动画逻辑本就是 setInterval）；③ 新增 FAQ 模块（CTA 之后、footer 之前，8 条中文常见问题，fumadocs 内置 `Accordions` 组件 + ogimg 虚线边框样式，不引入 Radix 直依赖）。website 加入 prettier（devDep，默认配置）统一格式化全部源码。
- **已验证**：暗/亮双主题下首页光效、FAQ 展开交互、新页脚均截图验收；tsc 0 error、build 全绿。自动化注意：WebGL 页面上 Playwright click 的 actionability 检查会超时（force click 也可能卡住），用坐标点击绕过；截图偶发瞬态伪影（HMR 中间态），以 computed style 实证层级为准。
- **待办**：Vercel 部署（Root Directory 指向 `website/`）+ 绑定 docs.baiwumm.com + Git 提交；可选后续：openapi.yaml 自动渲染 API Reference、中英 i18n、RSS。

---

### React + Next 代码审查修复：列表页记忆化收敛 + Intl 缓存 + 无障碍属性级补齐（2026-09-06）

- **背景**：项目级装齐 Vercel 三件套 + drizzle-orm + web-design-guidelines 后，按新规范维度对 react / next 做只读审查（性能模式 + 无障碍，代理扫描、行号逐一验证），产出 backlog 后全部修复属性级条目；行为级 6 项 + 进度条 aria（库 DOM 注入不可挂 role）留存 `docs/code-review-backlog.md` 单独决策。
- **性能 P1（一个根因 × 六页 × 双端）**：`useOverlayState()` 每次渲染返回新对象，被 logs / roles / notices / posts / dicts / depts 列表页直接或经 `openXxx` 回调放进 `columns` 的 useMemo/useCallback 依赖 → 记忆化全失效、打字 / 勾选 / refetch 均整表重渲染。修复：依赖统一收敛到 `.open` 稳定方法引用（users-page 既有示范模式，directory-page 本已合规）。
- **性能 P2（双端）**：`format-date` 两个 Intl formatter 按 locale 模块级 Map 缓存（原每行每帧重建）；公告正文 `sanitizeNoticeHtml`（DOMPurify 全文解析）三处渲染期直调改 `useMemo` 按内容缓存；role-grant-drawer 全树勾选状态由渲染期逐节点递归（O(n²)）收敛为一次 `checkStateMap` useMemo（O(n)）查表；sidebar-menu 受控 `expandedKeys` 空态用模块级共享 Set + useMemo（受控 Accordion 对引用敏感）。
- **无障碍属性级（双端）**：分页条首 / 末页图标 Link 补 aria-label（新增 `common.datatable.firstPage/lastPage` 四语言键）；my-notices 翻页箭头补 aria-label（复用既有 `paginationPrev/Next` 键）；users 外链图标按钮 aria-label 从 `Tooltip.Trigger` 移到真实 Button（Trigger 渲染的外层 div 不透传名称——组件库陷阱，已核实实现）；登录页补 `autoComplete="username"/"current-password"` + `spellCheck={false}`；account 邮箱补 `type="email"+autoComplete`、电话补 `type="tel"+inputMode`；account 裸 `<p>` 错误提示（密码 ×3、邮箱 ×1、标签输入 ×1）补 `role="alert"` 使 SR 可感知；通知铃铛 aria-label 动态拼接未读数、未读红点 Badge 补 sr-only 文本；command-menu 移除焦点环处补 `focus-within:border-focus` 底边框高亮替代（WCAG 2.4.7）；sort-field 用 useId 建立 Label-htmlFor/输入 id 关联；dept-tree 树节点补 `aria-pressed` 传达选中态；menus 树展开按钮 aria-label 随展开态切换（新增 `features.menus.tree.collapse/expand` 四语言键）。
- **验证**：双端 tsc / eslint 0 error、build 全绿；react 71 单测全过；`check-locales` 双端一致。行为零变更：全部改动为依赖数组引用、useMemo 包裹与 ARIA 属性。

---

- **同步 React 端当轮修复**：进度条并发竞态（`lib/progress.ts` 重构为「请求数 + 路由过渡」统一状态机；与 React 端差异：`@bprogress/next` 内置 pathname 变化自动 stop，故请求存在期间先 `disableAutoStop()` 拦截库收尾、状态机接管 stop + `enableAutoStop()`，`ProgressBinder` 监听 pathname 驱动过渡段；`api-client.ts` try/finally 收口计数）；图谱暗色（`org-chart.tsx` 改 `useResolvedTheme()` 下发 React Flow `colorMode`）；失效 token 类名清理（`bg-content1/2`、`text-default-500`、`ring-ring`、`border-primary/40` 共 8 处，扫描脚本复制至 `next/scripts/`）。
- **web 端对齐 React（排查：页面清单 21/21 一致；confirmKeyword / mainPostId 联动 / 导出门控 / 图标预览 / 分页组件已对齐）**：data-table 补首屏 6 行骨架（取消「刻意差异」，`ui-spec.md` §14.2 同步；refetch 仍用遮罩）；`use-list-query` 补 `refetch` 透出；六列表页（users/roles/logs/notices/posts/directory）补错误态接线（isError + ErrorContent + 重试）；users 删除 / 批量删除后补 `resetRowSelection`（两个回调顺带移到 table 声明后，修复 TDZ）；公告详情抽屉补「切换公告重置名单页码」。
- **server 端对齐 nest（系统性排查 42 条契约路径：端点完整性与权限校验矩阵一致，无端点缺失）**：menus 补 parentId 存在性 + 防环校验（`MENU_PARENT_INVALID`，此前无效 parentId 静默落库可构造环）+ permissions 位范围校验（非法 BigInt 500 → 400）+ parentId 空串归一；permissions 枚举补 `EXPORT(512n)` 并导出 `ALL_PERMISSION_BITS` 共享（此前经 nest 授予 EXPORT 后 next 再授权会误判 400）；dict 补 label 唯一冲突 409；account 补改密「新旧相同静默成功」分支（不再无谓全端下线）+ 改密双写事务化 + avatar 缺 file 400 `AVATAR_FILE_INVALID` + profile 字段级校验与链接前缀剥离（对齐 nest DTO）；posts create/update 补 category/rank/status 校验（此前非法 category 静默默认 management）；notices 补 publishTime RFC3339 校验（非法 500 → 400）+ 站内信通知并入发布事务（对齐 nest，不出现「已发布但无人收到」）+ read-stats status 严格校验；新建共享 `lib/server/pagination.ts` 接入全部 11 处列表（page/pageSize/order 非法一律 400，对齐 nest DTO，替换原静默钳制/回落）。
- **已知差异（记录不修）**：notices 定时发布为惰性触发（访问时 `publishDueNotices()`），nest 为 @Cron 后台扫描——Next serverless 环境的架构适配；`type=api` 访问日志 nest 有全局拦截器、next 无等价机制（日志页 type=api 过滤为空），待 middleware Node runtime 方案评估；dict 可选字段「清空」语义两端实际行为一致（前端传空串），API 层 null 支持差异不修（避免 ""/null 数据形状分裂）。
- **验证**：tsc / eslint 0 error、`check-locales` 与 React 端完全一致、build 全绿。

---

### React 端修复：进度条并发竞态 + 架构图谱暗色模式 + 失效 token 类名清理（2026-09-05）

- **进度条提前消失（用户报障）**：路由切换后 `use-route-progress` 以 rAF+50ms 无条件 `stop()`，绕过 `progress.ts` 的请求引用计数——页面并发请求仍在飞行时进度条即结束。`progress.ts` 重构为统一状态机（「飞行中请求数 > 0」或「路由过渡未结束」任一活跃即展示，双双归零才 stop；路由过渡计时收进模块，快速连切自动取消旧定时器）；`api-client.ts` 改 try/finally 收口计数（顺带修复 401 重试计数泄漏 + 网络异常 / JSON 解析异常泄漏）；Provider 的 delay / startPosition / stopDelay 经 `bindProgress` 下发后对手动调用生效（BProgress 的这三个 props 仅锚点场景自动生效，此前配置形同虚设），`delay=200`「短导航不闪进度条」真正落地。
- **架构图谱暗色模式失效（用户报障）**：`org-chart.tsx` 将 HeroUI `useTheme().theme` 强转传给 React Flow `colorMode`——该 hook 读 `heroui-theme` localStorage key（本项目主题真源是 design-theme-store 的 `better-admin-theme-mode`，从不写它），恒返回 `"system"`，React Flow 遂跟随 OS 偏好而非应用内选择：系统浅色 + 应用深色时容器被加 `.light` 类、强制回亮色 token（暗画布 + 白卡片）。改用 `useResolvedTheme()`（与 `<html>` 的 dark/light 类一致）。
- **失效 token 类名全量清理（排查任务）**：以 `@heroui/styles` `@theme inline` 的 65 个 v3 合法颜色 token 建白名单，脚本扫描 + v2 特征 grep 交叉验证。修复 5 类 8 处：`bg-content1`→`bg-surface`、`bg-content2`→`bg-surface-secondary`、`text-default-500`→`text-muted`（v2 色阶，即图谱卡片次要文字不可见的另一成因）、`ring-ring`→`ring-focus`（shadcn 写法残留）、`border-primary/40`→`border-accent/40`；`bg-gradient-to-br` 为 Tailwind v4 兼容别名，有效保留。扫描脚本留存 `react/scripts/scan-stale-tokens.cjs` 供其他端复用。
- **验证**：tsc / eslint 0 error、build 全绿；进度条与图谱暗色行为经用户浏览器确认。

---

### Vue 端 M1 阶段二：menus / dicts / logs 三模块落地，M1 六模块全量完成（2026-09-05）

- **范围**：vue-plan M1 后三模块。 `pnpm build`（含 vue-tsc）/ lint / test（20 用例）四绿。M1 六模块（users / roles / permissions / menus / dicts / logs）全部完成，页面挂载于 /settings/*（URL 与 React 端一致）。
- **菜单管理**：树形表格（TanStack expanded 模型，getSubRows = children、初始全展开）；搜索为后端模糊过滤（结果保留祖先链）；增删改失效导航树 + 管理树双缓存（导航树必须 exact，避免在途管理树被取消重发）；addChild 锁定父级、edit 父级候选排除自身及后代（防环）；按钮权限位 OR 多选、图标裸名实时预览。
- **字典管理**：双栏布局（左类型右项）；选中类型为派生态（selectedCode 失效自动回退首个）；字典项保存后用本次请求结果回填业务侧 dict-store（下拉实时更新、单次请求）；类型删除 409（被引用）拦截 + 清业务缓存 + 不 removeQueries（激活观察者立即重发会 404）的语义平移。
- **日志管理**：列表 + 详情抽屉（UA / JSON extra）+ 单条/批量删除（批量后清勾选残留）；类型筛选与显示名以字典 log_type 为真源，字典不可用时回退内置四枚举 i18n 文案（log-type.ts 平移）。
- **新增业务缓存**：`stores/dict-store.ts`（Pinia 版全局字典缓存：fetchDict / clearDict / setDict / refreshDict，语义对齐 React 端 zustand 版）。
- **待办**：六页与 React 端并排走查验收（M1 验收标准）；列显隐/拖拽列设置、vee-validate 两项延后决策不变。

---

### Vue 端 M1 阶段一：RBAC 核心三模块落地（用户/角色/权限）（2026-09-05）

- **范围**：vue-plan M1 前三模块（users / roles / permissions）+ 全部列表基建；pnpm build（含 vue-tsc）/ lint / test（20 用例）四绿。menus / dicts / logs 留待 M1 阶段二（范式已立，照搬加速）。
- **列表基建（六模块共用，全部平移 React 端机制）**：
  - `lib/list-store.ts`：列表状态工厂（模块级 reactive 单例，语义对齐 zustand 版）；epoch 硬约定（搜索/筛选/重置 bump、同值幂等、切 pageSize 回首页）+ 契约测试；
  - `composables/use-list-query.ts`：vue-query 装配（queryKey 含全部影响字段、epoch 居 prefix 后、keepPreviousData 保旧数据）；
  - `components/data-table/`：DataTable（Nuxt UI UTable 渲染层 + Nuxt UI 样式对齐 better-nuxt；骨架/刷新进度条/空态三态）、Toolbar、SearchReset、Pagination（受控分页：pageIndex/pageSize 由页面 store 传入）、BulkActions（浮动批量条）；
  - `composables/use-permissions.ts`：权限点缓存（staleTime 5min）+ useMenuPermissions（当前路由菜单 userPermissions 位 → 按钮/操作门控）。
- **用户管理**：列表 + 状态筛选 + CRUD + 启停/重置密码 + 批量（allSettled 部分成功）+ 写保护三层口径（本人/内置 admin/super_admin 绑定，超管操作者豁免，受保护行禁勾选）+ 表单全字段（含契约 v1.6.0 组织关联：DeptTreeSelect/岗位多选/主岗联动清空/工号/入职日期/在职状态/性别）。
- **角色管理**：列表 + CRUD（code 创建后锁定；super_admin 编辑仅 description）+ 授权抽屉（**Antd Tree 勾选模型**：权限位为叶子子行、勾选向下级联/位与可见性向上联动、状态纯由子级推导、半选、保存 PUT 全量替换并失效导航菜单缓存——当前用户自己的角色授权立即生效）。
- **权限管理**：只读列表（bits 升序 + 前端过滤，i18n 名称映射回退后端 label）。
- **关键机制结论（纯 Vue 环境，沉淀给后续模块）**：
  - **vue-table v8 + Nuxt UI UTable**：降级至 @tanstack/vue-table v8.21.3（与 Nuxt UI v4.11 peer 依赖 `^8.21.3` 匹配；v9 的 table-core v9 将 getCoreRowModel 改名为 createCoreRowModel，导致 UTable 内部导入失败）；v8 API 使用 `useVueTable` + `getCoreRowModel()` / `getSortedRowModel()` 等函数；通用渲染组件用非同构 mapped type（AppTableLike）打破 Table 的 TData in out variance，业务页以 `const table: AppTable<TData> = useVueTable({...})` 显式注解；DataTable.vue 内部切换为 UTable 渲染（从 table 实例提取 data/columns），样式对齐 better-nuxt；
  - **#imports shim**：@nuxt/ui 4.11.0 stubs/vue-router.js 缺 onServerPrefetch/useAsyncData/defineComponent，rolldown 对 #imports re-export 链严格校验失败——vite 插件 enforce:pre 抢先解析 #imports 到项目 shim（`src/shims/nuxt-ui-imports.ts`）；
  - **#build/nuxt-icon-client-bundle shim**：@nuxt/icon 可选 bundle 在纯 Vue 下以空 init 代替（图标走已安装的 @iconify-json/lucide）；
  - 表单校验暂用手动 validate（规则与 React zod schema 一一对应），vee-validate 引入延后评审；列显隐/拖拽列设置延后（React 端 buildColumnSettingKey 对应能力 M1 未做）。
- **文档**：feature-matrix 用户/角色/权限 Vue 列置 🔧。

---

### Vue 端启动（Phase 4）：M0 工程基建与骨架完成（2026-09-05）

- **范围**：`/vue` 从零搭建（vue-plan v1.2，评审 5 条微调 + 路由选型修正落地）；`pnpm dev` / `build`（vite build + vue-tsc type-check）/ `lint` / `test`（16 用例）四绿；dev 冒烟（`/`、`/sign-in`、SPA 路由回退 200）。
- **技术栈落地**：Vue 3.5 + Vite 8 + TS strict + **Nuxt UI v4.11**（`@nuxt/ui/vite` + `@nuxt/ui/vue-plugin` + Tailwind v4）+ `vue-router/vite` 文件式路由（`src/pages/`，URL 与 React 逐条一致，`typed-router.d.ts` 提交入库）+ Pinia 4 + `@tanstack/vue-query` + vue-i18n 11 + @vueuse/core 14。布局用 Nuxt UI Dashboard 套件（`UDashboardGroup` / `UDashboardSidebar` / `UDashboardPanel` / `UDashboardNavbar` / `UDashboardSearch`），折叠/移动端抽屉/Cmd+K 由套件内置；暗色模式用 @vueuse/core `useColorMode`（默认 tokens，无 React token 移植）。
- **认证链路闭环**：登录页（受控表单 + `isSafeRedirect` 回跳 + rememberMe 长短会话）→ Pinia auth-store（localStorage 持久化语义对齐 React zustand persist）→ fetch 版 api-client（Bearer 注入、401 refresh 并发去重重试一次、`{data}` 信封解包）→ 守卫 `ensureSession`（F5 恢复 `/auth/me` 快照 + 菜单缓存）→ 登出清缓存。路由守卫三层（公开页放行 / 登录拦截 / 菜单权限 + 白名单豁免）+ 文档标题 i18n。
- **关键决策 / 机制偏差（与 React 端实现差异）**：
  - `@nuxt/ui/vue-plugin` 子路径在 rolldown-vite 8 下由插件 `resolveId` 重定向虚拟模块，`ui()` 必须置于 `vue()` **之前**才能生效（官方文档顺序相反，以实测为准）；
  - `@vueuse/core` 14 的 `useColorMode` 返回 **Ref 本身**（`.value` 读写偏好，无 `preference` 属性，三态值是 `auto/light/dark`）；
  - vue-i18n 用 `messageResolver: (obj, key) => obj[key]` 扁平查表 + 构建期把 `{{x}}` 归一为 `{x}`，兼容 React 语言包的共存键（`menu.settings` 组/叶子）与 i18next 插值语法，JSON 零改动复用（`scripts/sync-locales.mjs` 同步）；
  - 菜单名翻译 `getMenuLabel`（i18nKey 优先）与 `fetchMenus` 合并固定「控制台」节点、侧边栏仅 `filterHiddenMenus` 不做二次权限过滤——均平移 React 端结论；
  - 页面 meta 采用集中常量（`route-access.ts` 的 `MENU_REQUIRED_PATHS` / `ROUTE_TITLE_KEYS`），`definePage()` 宏路线留待 M1 评估；
  - pnpm 11 的依赖构建脚本许可在 `vue/pnpm-workspace.yaml`（`allowBuilds`，非 workspace 依赖提升）。
- **文档同步**：`docs/vue-plan.md`（v1.2）；`AGENTS.md` §7.2 更新 + 新增 §21（Vue/Nuxt 全局组件规范：Nuxt UI 唯一组件库）；`requirements.md` §7.3 及关联表述；`ui-spec.md` §18.3（v1.2）；新建 `docs/nuxt-ui-guide.md`；`docs/routing.md` 补 Vue 端对齐（§2.2）；本文件与 feature-matrix（Vue 列 🔧：认证/i18n/主题/命令面板/错误页/路由守卫）。
- **已知限制**：Dashboard 保持占位（各端均未实现）；React 端 ConfigDrawer 的侧栏变体/Layout 模式偏好由 Dashboard 套件内置行为接管，页面级偏好抽屉 M0 仅主题+语言两项（M3 评审补齐）；登录第三方 OAuth 仍为占位 Toast（与 React 端一致）；组件测试与 KeepAlive 多标签页随 M1/M3 落地。

---

### 三端全量代码排查（NestJS / React / Next.js）——P1 已修复，P2 已完成（2026-09-04 排查 / 2026-09-05 修复）

- **范围**：按「Nest 逻辑正确性 → React 联调 / 功能对齐 / 交互一致性 → Next 对齐」系统性排查，对照 openapi.yaml 契约、mechanisms.md 机制结论与 feature-matrix.md。共发现 **46 个问题（P0: 0 / P1: 15 / P2: 31）**，无功能不可用 / 安全漏洞 / 数据损坏级问题。
- **NestJS（17 项，P1×7）**：菜单 `update` 的 parentId 无存在性 / 自环 / 挂到子孙下校验（可构造环致节点从树中消失）且 `??` 使 null 无法清空父节点与 i18nKey（`menus.service.ts:302-372`）；`menus.permissions` 无位范围校验（负数 / 越界可致 500，roles 侧已有 assertValidBits 未复用）；openapi.yaml 契约缺口四类——`SUPER_ADMIN_ROLE_BINDING_PROTECTED` 未声明、`/menus` 系 409 缺失、权限位字段声明 `type: integer` 与实现字符串收发系统性不符、多模块 `@Post` 未 `@HttpCode(200)` 实际 201；公告 `scopeTargets` DTO 缺 `@ArrayMinSize(1)/@ArrayMaxSize(100)`（空范围可发布成无人可见公告）；`findVisibleDetail` 无公告状态拦截（draft / withdrawn 可被范围或站内信凭证用户看全文）。
- **React（23 项，P1×7）**：列表查询失败静默降级空态（users / roles / logs / notices / directory / posts 六页未接 isError + ErrorContent）；`clearSession`/`resetAuth` 不清 `MENUS_QUERY_KEY`（SPA 内换账号命中上一账号菜单缓存串号）；`create-list-store.setFilters` 无同值幂等（违反 mechanisms §4.2 契约，通讯录重置双 epoch bump 双请求）；公告详情抽屉已读 / 未读页码不随公告切换重置（换公告从旧页码查询致名单误空）；users 删除后未 `resetRowSelection`；菜单表单图标实时预览缺失（注释声称有）；10 处 `new Date().toLocaleString()` 裸调用不受 i18n 语言控制。
- **Next.js（6 项，P1×1）**：`proxy.ts` 静默刷新无并发去重（并行请求共用 refresh Cookie 竞态，失败方被误踢登录）；`menu-fetch.ts` 死代码残留 `filterAccessibleMenus` 二次过滤（复用即复发分组菜单整组消失缺陷）；`EmptyContent` 的 `className ??` 覆盖默认布局类；登录 / 刷新响应体仍返回双 token（削弱 httpOnly 防线）；约 22 个 layouts / components 文件缺显式 `"use client"`；org-chart-node 多 `p-0` 与 React 基准不一致。
- **已知限制 / 待办（P1 已于 2026-09-05 分 7 批修复、P2 已于同日分 4 批修复；验证：三端 tsc / eslint 0 error / build 全绿 + React 71 单测 + check-locales 双向一致 + API 冒烟 19 项全过 + 浏览器走查）**：
  - [x] 契约修复四件套：openapi.yaml 补 `SUPER_ADMIN_ROLE_BINDING_PROTECTED`（POST/PUT /users）、`/menus` 系 409、权限位字段改 `type: string`、`/menus` 400 展开 `MENU_PARENT_INVALID` / `INVALID_OPERATION`（各 `@Post` 补 `@HttpCode(200)` 属 P2 仍未改）
  - [x] menus.service 补 parentId 防环 + 存在性校验 + null 清空语义（`=== undefined` 判别）+ 复用 assertValidBits 口径（`INVALID_OPERATION`）
  - [x] notice：scopeTargets DTO 补 `@ArrayMinSize(1)/@ArrayMaxSize(100)`（nest + next 双端）；findVisibleDetail/findVisibleNotice 对非管理视角加 published 状态拦截（draft / withdrawn 不再被范围 / 凭证用户看到全文）
  - [x] react：setFilters 同值幂等；六列表页接错误态（isError + ErrorContent + refetch）；clearSession/resetAuth 清 menus 缓存；format-date 统一替换 10 处 toLocaleString；users 删除后 resetRowSelection；菜单表单图标实时预览补齐；公告详情抽屉切换公告重置名单页码
  - [x] next：proxy 静默刷新按 refresh token 并发去重（in-flight Map，修并行请求竞态误踢登录）；附带收敛 `@internationalized/date` 双版本类型冲突（pnpm-workspace.yaml overrides 3.12.3）
- **P2 修复记录（2026-09-05，4 批次提交）**：
  - **P2-A 契约与文档**（`4739d56`）：Nest 14 处 `@Post` 补 `@HttpCode(200)` 对齐契约；errors 语言包补 `errors.users.*` 5 键与 `errors.menus.*` 命名空间（react/next × zh-CN/en 四套一致）；`docs/routing.md` 按现状重写（三层访问控制模型 + 完整 20 条路由表 + route-access.ts 真源）；`docs/ui-spec.md` §1.3 路由表/日志模式/权限只读、§2.1 主题抽屉 localStorage 与 bprogress 对齐。
  - **P2-B 交互与体验**（`c00c147`）：menus/depts/posts/dicts(类型)/notices 五页删除确认补 `confirmKeyword` 强确认；公告范围选择器岗位/人员候选改 `useInfiniteQuery` + `ListBoxLoadMoreItem`（不再截断首页 50 条）；用户表单取消勾选岗位联动清空 mainPostId（避免后端 400）；通讯录导出按钮补 SEARCH 位门控；菜单表单 i18nKey 放宽可选（对齐契约）；分页条补首/末页按钮（窄屏隐藏）；DataTable 首屏加载改 6 行骨架屏（refetch 仍用遮罩保留旧数据）。
  - **P2-C i18n 与格式化**（`8a5acb7`）：菜单管理/登录页错误码走 `getMenuErrorMessage` 与 `errors.auth.*` 映射（补 `invalidCredentials`/`userDisabled` 键 ×4 语言包）；locales.test 补 features/dict 两域前缀与键集校验（并借此清理 features.json 中 13 个跨域死键：errors.* 10 个 + layout.header.* 3 个，react/next 同步）；React 端补 `scripts/check-locales.mjs`（与 Next 双向一致）+ `pnpm check-locales`。
  - **P2-D 性能与架构**（`c8777e4`）：users 页 columns useMemo / openForm 依赖收敛到 useOverlayState 的稳定方法引用（`.open`，修搜索击键重建列定义）；公告定时发布前端提交带本地时区偏移的 RFC3339（`toISOWithOffset`）+ Nest 正则收紧为时区必选（契约 date-time 对齐，openapi 描述同步）；React 四页列设置 key 统一真实路由全路径（/settings/*）；Next `menu-fetch.ts` 移除 `filterAccessibleMenus` 死代码二次过滤；Next `EmptyContent` 恢复 `cn()` 合并语义；Next layouts/components 19 个交互组件补显式 `"use client"`。
  - **P2-E 后端快速收尾**（本批次）：dict.service updateType/updateItem 改 `=== undefined` 判别（null 可清空 description/i18nKey，与 depts/posts 惯例一致）；users.service resetPassword/updateStatus 与 account.service updatePassword 的「bump tokenVersion + 清 refresh_tokens」包入同一事务（不留中间态）；avatar `FileInterceptor` 补 `limits.fileSize: 2MB`（multer 读入内存前拦截超大请求）；notifications readOne 清理 `updated ? null : null` 冗余三元；Next org-chart-node 删除移植笔误的 `p-0`（对齐 React 基准 Card.Content 默认内边距）。仍余 3 项：Notice create 通知写入纳入事务 + remind 分批、管理列表 computeStats 批量化（需查询重写，单独批次）、Next 登录/刷新响应体裁剪双 token（需与客户端 api-client 协调后实施）。
- **P2-F Notice 事务边界 + N+1 批量化**（本批次）：
  - **#6 create 事务化**：`notifyScopePublish` 加 `DbOrTx` 客户端参数，create 时传入事务——站内信批量写入（1000/批保持在事务内）与公告/范围写入原子化，消除「公告已发布但无人收到」中间态。配套把 `resolveScopeUserIds` / `collectDeptSubtreeIds`（org-views.ts）加可选 client 参数（默认全局 db，既有调用不变）：事务内读取本事务写入的范围行必须同源，否则读不到未提交数据。publishDueNotices（定时发布）维持传 db。
  - **#7 管理列表统计批量化**：新增 `computeStatsBatch`（一次 scope IN + 合并三粒度目标的 3 段范围解析 + 1 次 (notice_id, user_id) 已读明细，交集内存过滤），查询数从「行数 × 5-6」降为「页内不同部门目标数 + 4」；口径与逐条 computeStats 完全一致（readCount = 范围内用户 ∩ 已读用户、分母含离职、readRate 两位小数）；findAll 移除 mapWithConcurrency 逐条统计（该工具函数一并删除），单条 computeStats 保留给详情接口。
  - **冒烟**（真实库，10/10 通过）：发布→范围内用户铃铛可见+未读数 1（事务内生效）→ 列表批量口径 0/1/0 → 未读时催办 200 → 24h 重催 409 → 用户详情已读 → 管理详情逐条口径 1/1/100 → 列表批量口径 1/1/100，批量与逐条口径互证一致。
- **待确认（评审定口径，不修）**：refresh 并发重放短窗口双活（Nest 与 Next 同病，Next proxy 已做并发去重缓解）；`findTree` 是否过滤 enabled=false 菜单；dict label 不设唯一（契约如此）；删除公告保留 read_records（有意，审计数据）；改密码无「新旧相同」校验；`/settings` 空壳页 Next 缺失（父级分组 to='' 正常导航不可达，影响极低）。菜单 i18nKey 前端必填问题已随 P2-B 放宽解决。
- **P2 未同步项（Next 端）**：P2-B 中五页强确认 / mainPostId 联动 / 导出门控 / i18nKey 放宽 / 分页首末页 / 表格骨架为 React 端（UI Source of Truth）先行修复，Next 端 features 同构文件待下一轮同步（键集已随语言包同步）。

### 公告/站内信功能 React + Next 双端对齐（含 Nest 接口增强）（2026-09-06）

- **范围**：将 React + Nest 端的公告/站内信增强同步到 Next.js 独立实现，两端功能一致；另含 React 端若干体验修复。
- **NestJS（契约同步更新 `openapi.yaml`）**：
  - `Notice` 新增 `readers`（`NoticeReader`：id/name/avatar，按已读时间倒序最多 3 个，仅管理列表回填）；`findAll` 新增 `loadReadersBatch`（`row_number()` 窗口函数每页 1 次查询），`+N` 复用已有 `readCount` 口径。
  - `notifyScopePublish`：通知 title 去掉「新公告：」前缀（直接用公告标题），`content` 写入纯文本摘要（`summarizeNoticeContent`：HTML 剥标签 + 实体解码 + 截断 140 字符）——修复通知 content 恒为 null 的问题。
- **React（UI Source of Truth）**：
  - 「我的公告」页交互修复：ListBox 点击切换失效根因为 React Aria 默认 toggle 行为下单击不触发 `onAction`，改用 `selectionBehavior="replace"` + `onSelectionChange` 兜底（与 sidebar-menu 同款）；列表项/详情发布人统一 `UserInfo`；置顶 Chip 移至底部状态行右侧；去重置按钮（SearchField `onClear` 提交空搜索）；刷新进度条定位筛选区下边框（`h-px` 同边框高，零位移）。
  - 通知抽屉美化：类型图标锚点（BellRing/AlarmClock/Settings）+ HeroUI Badge dot 未读角标 + content 通栏两行摘要 + 通栏 `divide-y` 分隔；Tabs（未读/全部）移入 `Drawer.Header` 固定、去掉 `Tabs.Panel`（筛选器语义，无内容联动）；侧边栏用户菜单新增「我的公告」入口。
  - 公告管理：新增「已读人员」头像堆叠列（`-space-x-2` + `ring-background`，空显示 —）；「发布时间/状态」列位置互换（状态前移）。
- **Next.js（同步实现）**：
  - server：`notices-service` 同步 `notifyScopePublish` 修复与 `loadReadersBatch`（注意 Next 端 `db.execute` 直接返回行数组，与 Nest 端 `result.rows` 不同）。
  - 新增 `/(authenticated)/my-notices` 页面（URL 同步采用 `usePathname + 原生 router.replace`，避免 bprogress 闪烁）与 `my-notices-page` 组件；`notice-bell` 全量对齐 React 最终版；公告管理列同步（readers 列 + 列顺序）；`format-date` 补 `formatRelativeTime`；i18n 中英文补 `features.myNotices.*`、`column.readers`、`menu.pageTitle.myNotices`、layout 抽屉相关 key。
- **验证**：两端 `tsc`/ESLint 通过；React 71 单测通过；`next build` 成功（`/my-notices` 路由注册）；Nest 端 `/api/notices` 实测返回 `readers`。
- **已知限制**：存量通知 title（带前缀）与 content（null）不回改，新发布公告生效。

### 我的公告白名单入口上线（React + Nest，公告消费端补齐）（2026-09-03）

- **背景**：公告模块已有管理端 `/org/notices`、铃铛通知抽屉与消费详情 `/org/notices/:id`，但缺少一个稳定的个人消费入口；已读公告会被新通知挤出铃铛最近 20 条列表，用户难以回看历史公告。
- **方案定稿**：不把个人消费场景塞进左侧菜单，也不继续扩张铃铛职责；改为在**侧边栏头像下拉**新增「我的公告」入口，落地独立登录白名单页 `/my-notices`。语义分层固定为：`公告管理 = 发布/统计`、`铃铛 = 最近提醒`、`我的公告 = 历史消费入口`。
- **NestJS**：
  - `GET /notices/mine` 查询参数从仅分页扩展为 `page/pageSize/keyword/readStatus(all|read|unread)`，支持标题模糊搜索与个人阅读态筛选。
  - 列表响应 `Notice` 新增可选 `myReadAt`（当前用户首次阅读时间）；实现上以 `notice_read_records` LEFT JOIN 当前用户，按个人维度判断已读/未读，不借用 notifications 通知流倒推。
  - OpenAPI 同步补充 `Notice.myReadAt` 与 `/notices/mine` 的 `keyword/readStatus` 参数说明。
- **React**：
  - `sidebar-user.tsx` 在 `我的账户` 下新增 `我的公告` 菜单项，仍复用 HeroUI `Dropdown` 体系。
  - `route-access.ts` 将 `/my-notices` 加入 `LOGIN_REQUIRED_PATHS`，与 `/account` 同级，明确“不走菜单权限，只要求登录态”。
  - 新增路由 `/my-notices`（带 `noticeId` URL Query 恢复当前选中公告），页面采用 **HeroUI 双栏公告中心**：左侧 `Tabs + SearchField + ScrollShadow` 列表，右侧详情卡复用现有消费端视觉语言；选中公告后拉详情并自动记首读，成功后失效 `["my-notices"]` 与 `["notifications"]` 缓存，左侧阅读态与铃铛未读数即时刷新。
  - 文案补充：`layout.user.myNotices`、`menu.pageTitle.myNotices`、`features.myNotices.*` 中英文键。
- **文档同步**：`docs/feature-matrix.md` 在「站内信通知」备注追加 React 端 `我的公告` 白名单入口说明。

### 架构图谱负责人头像显示修复（2026-09-06）

- **问题**：架构图谱中，用户有头像，但卡片名称左侧的头像还是显示的是第一个字（首字 Fallback），没有显示用户实际头像。
- **根因分析**：
  1. OpenAPI 合约 `DeptTreeNode` 缺少 `leaderAvatar` 字段
  2. 后端 `depts.service.ts` 的 `baseSelect` 查询只返回 `users.displayName` 作为 `leaderName`，未返回 `users.avatar`
  3. 前端 `org-chart-node.tsx` 使用 HeroUI Avatar 组件时，只使用了 `Avatar.Fallback` 显示首字，未使用 `Avatar.Image` 显示头像
- **修复方案**：
  1. **更新 OpenAPI 合约**：`DeptTreeNode` 新增 `leaderAvatar` 字段（nullable string，契约 v1.7.0）
  2. **更新后端服务（NestJS）**：
     - `DeptView`、`DeptTreeNodeView`、`DeptRow` 类型新增 `leaderAvatar` 字段
     - `baseSelect` 查询增加 `users.avatar AS leaderAvatar`（LEFT JOIN users）
     - `toView` 函数和 `findTree` 构建逻辑同步返回 `leaderAvatar`
  3. **更新后端服务（Next.js）**：同步 NestJS 的变更，`DeptView`、`DeptTreeNodeView`、`DeptRow` 类型 + `baseSelect` + `toView` + `findDeptTree` 构建逻辑
  4. **更新前端类型**：React / Next.js 两端 `api-types.ts` 的 `DeptTreeNode` 接口新增 `leaderAvatar: string | null`
  5. **更新前端组件**：React / Next.js 两端 `org-chart-node.tsx` 的 Avatar 区域改为条件渲染——有 `leaderAvatar` 时渲染 `<Avatar.Image>`，始终渲染 `<Avatar.Fallback>` 作为无头像时的首字兜底
  6. **同步虚拟根节点**：React / Next.js 两端 `org-chart-page.tsx` 的 Better Admin 虚拟根节点补 `leaderAvatar: null`
- **变更文件**：
  - `nest/openapi/openapi.yaml`（DeptTreeNode schema）
  - `nest/src/modules/org/depts.service.ts`（类型 + 查询 + 构建）
  - `react/src/lib/api-types.ts`（DeptTreeNode 接口）
  - `react/src/features/org/org-chart-node.tsx`（Avatar.Image 条件渲染）
  - `react/src/features/org/org-chart-page.tsx`（虚拟根节点 leaderAvatar）
  - `next/src/lib/api-types.ts`（DeptTreeNode 接口）
  - `next/src/lib/server/depts-service.ts`（类型 + 查询 + 构建）
  - `next/src/features/org/org-chart-node.tsx`（Avatar.Image 条件渲染）
  - `next/src/features/org/org-chart-page.tsx`（虚拟根节点 leaderAvatar）
- **验证**：React / Next.js 两端 tsc 通过，TypeScript 类型完整对齐。图谱卡片在有头像时显示用户头像图片，无头像时 Fallback 显示首字。

### super_admin 角色绑定保护确认 + 侧边栏菜单过滤修复 + 文档清理（2026-09-05）

- **Next.js 端浏览器 UI 走查完成**：逐页与 React 基准对照验证通过（登录 / Dashboard 占位 / 用户管理 / 角色管理 / 菜单管理 / 字典管理 / 权限管理 / 日志管理 / 我的账户 / 组织管理 / 岗位管理 / 人员通讯录 / 公告管理 / 通知详情 / 架构图谱），UI 一致性与交互逻辑符合预期。
- **AGENTS.md 大幅精简**（507 行 → 193 行，减少 62%）：§1/§2/§4/§5/§6/§8 删除与 requirements.md 重复的说明性文字，改为引用；§18 开发规则从 13 条精简为 5 条独立规则；§19 当前阶段描述从 ~400 字精简为 ~150 字（删除历史版本号/提交 hash/组件沉淀细节）。
- **过时待办全面清理**：确认 super_admin 角色绑定保护 create 端点已覆盖、`roles.enabled` 参与权限聚合、`hasPermission` 三端 OR 语义对齐、所有迁移脚本已执行、系统设置功能已废弃（文档已清理），AGENTS.md §19 对应项已移除。

- **super_admin 角色绑定保护（create 端点）**：排查确认 NestJS `create`（`nest/src/modules/users/users.service.ts` 第 527 行）与 Next.js `createUser`（`next/src/lib/server/users-service.ts` 第 542-543 行）均已在事务内调用 `assertValidRoleBindingChange`，非超管操作者绑定 super_admin 角色会被 403 `SUPER_ADMIN_ROLE_BINDING_PROTECTED`；React / Next.js 前端表单（`user-form-dialog.tsx`）均通过 `roleOptions` 过滤 `SUPER_ADMIN_ROLE_CODE`，非超管操作者不可见 super_admin 选项。AGENTS.md §19 此前记录的「create 未拦」为过时条目，代码早已补全，本次文档同步清账；§19 当前阶段描述中 super_admin 角色绑定保护措辞由「update 端点」更正为「create + update 端点，nest + next 三端同步」。
- **`roles.enabled` 参与权限聚合确认**：NestJS `auth.service.aggregatePermissions`（第 59、90 行）、`menus.service.buildAllowedMenuIds`（第 66、100 行）与 Next.js `session.ts aggregatePermissions`（第 59、96 行）、`menus-service.ts buildPermissionMap`（第 37 行）、`buildAllowedMenuIds`（第 69 行）查询均含 `eq(roles.enabled, true)` 条件，停用角色的权限位不参与聚合，权限即时回收已落地。
- **`hasPermission` 前后端 OR 语义确认**：NestJS `permissions.enum.ts hasPermission`（第 81-84 行）：`(userBits & requiredBit) !== 0n`（OR 语义）+ `-1n / SUPER_ADMIN_BITS_POSITIVE` 全量位识别；Next.js 服务端 `permissions.ts hasPermission`（第 81-85 行）同款逻辑；React / Next.js 客户端 `permission.ts hasPermission`：`(bits & requiredBits) !== 0n`（OR）+ `9223372036854775807n` 全量位识别——三端语义完全对齐。
- **侧边栏菜单分组分支消失修复**：React / Next.js 两端侧边栏均缺失分组菜单（如「系统管理」整个分支）。根因为 `filterAccessibleMenus` 对 `findMenuTree` / `GET /api/menus` 已过滤的结果做二次过滤——分组节点（如「系统管理」「组织中心」）的 `userPermissions` 为 `"0"`（自身不声明权限位），`canAccessMenu` 将其判为无权而砍掉整个分支。修复：移除 React `menu-fetch.ts`、Next.js `layout.tsx`（RSC）与 `proxy.ts` 中多余的 `filterAccessibleMenus` 调用，保留后端 `buildAllowedMenuIds`（按 `role_menus` 角色关联过滤 + 祖先链补全）为唯一权限层；侧边栏渲染仅做 `hideInMenu` 剔除（`filterHiddenMenus`）。
- **迁移脚本全部已执行确认**：排查确认所有存量库迁移脚本与补录脚本均已在 Supabase 真实库执行完毕——drizzle 迁移 0005（phone/tags/last_login_at）、0006（website/github_username/x_username）、0007（组织中心 8 张表 + users 扩展 4 列）、0008（gender）；菜单补录 `migrate-menus-add-org.ts`（组织中心 + 组织管理/岗位管理/人员通讯录/公告管理 4 子菜单）、`migrate-menus-add-org-chart.ts`（架构图谱）、`migrate-menus-add-grant-bit.ts`（GRANT 位，seed 已含且 super_admin 全量位自动覆盖）、`migrate-menus-add-dicts.ts`（字典管理）；`clean-dead-notifications.ts`（清理 3 条死通知）；`pnpm storage:init`（Supabase Storage avatars bucket）。所有脚本均为幂等设计，AGENTS.md §19 当前待办中对应的执行项已移除。
- **侧边栏菜单分组分支消失修复**：React / Next.js 两端侧边栏均缺失分组菜单（如「系统管理」整个分支）。根因为 `filterAccessibleMenus` 对 `findMenuTree` / `GET /api/menus` 已过滤的结果做二次过滤——分组节点（如「系统管理」「组织中心」）的 `userPermissions` 为 `"0"`（自身不声明权限位），`canAccessMenu` 将其判为无权而砍掉整个分支。修复：移除 React `menu-fetch.ts`、Next.js `layout.tsx`（RSC）与 `proxy.ts` 中多余的 `filterAccessibleMenus` 调用，保留后端 `buildAllowedMenuIds`（按 `role_menus` 角色关联过滤 + 祖先链补全）为唯一权限层；侧边栏渲染仅做 `hideInMenu` 剔除（`filterHiddenMenus`）。
- **验证**：react / next tsc / lint（无新增 error）全绿。
- **变更文件**：`react/src/lib/menu-fetch.ts`、`next/src/app/(authenticated)/layout.tsx`、`next/src/proxy.ts`、`next/src/layouts/components/app-sidebar.tsx`、`AGENTS.md`、`docs/progress.md`。

### 图谱节点卡片重设计 + 导出样式美化 + Next 端导出跟进（2026-09-03）

- **背景**：阶段 4 验收反馈——图谱卡片太简陋（白底细边框、负责人「R 张三」类文本无视觉锚点）、导出 Excel 是默认样式；且用户明确要求**导出功能 React / Next 两端一致**。本轮三项：节点卡片 HeroUI 化重设计、导出表格企业级样式、Next 端导出同步上线。
- **节点卡片重设计（org-chart-node）**：改用 HeroUI **Card / Avatar / Chip / Tooltip / Button** 复合组件（Card.Header/Content/Footer 语义分区）。负责人区为视觉核心：圆形头像（HeroUI Avatar，无头像数据故按姓名散列稳定取色 accent/success/warning/danger/default + Fallback 首字）+ 姓名加粗 / 组织编码灰色 mono 两行；头部为名称（截断 Tooltip 全名）+ 状态 Chip（启用 success soft / 停用 default soft）；底部归属行（根节点 = N 个顶级组织；普通节点 = N 个下级组织 / 末级显示「末级组织」）；hover 抬起（-translate-y-1 + 主色边框 + shadow-md）。折叠钮改 HeroUI Button——**React Aria 的 PressEvent 默认停止冒泡**（不调用 continuePropagation），无需外层 div 拦截 click（顺带消除 jsx-a11y 违规）。卡片尺寸 220×84 → **240×112**（布局常量与骨架屏占位同步），LEVEL_GAP 88→100、SIBLING_GAP 32→36。
- **导出样式美化（directory-export，两端同文件）**：write-excel-file 4.x 企业级样式——全局**微软雅黑 11 号**（第三参 Options `{ fontFamily, fontSize }`）；表头由 `columns[].header` 生成（**objects 只含数据行**），品牌蓝 `#1677FF` 底白字加粗 12 号水平/垂直居中 + 深蓝 `#1668DC` 细边框 + 行高 26；数据单元格的值与样式统一由 `columns[].cell(object, objectIndex)` 回调产出：**斑马纹**（偶数行 `#F5F7FA` / 奇数行 `#FFFFFF`，索引自第一条数据行起）+ 浅灰 `#D9D9D9` 细边框 + 行高 22 + 垂直居中 + 正文 `#333333`；**在职状态列按值高亮**（在职 `#52c41a` 加粗 / 离职 `#f5222d`）；`stickyRowsCount: 1` 冻结表头。样式属性命名差异（`textColor` 非 color、`alignVertical` 非 verticalAlign）沉淀 mechanisms §7.3。
- **Next 端导出跟进（用户安排，两端一致）**：write-excel-file 4.1.1 装入 next；`directory-export.ts` 全量移植（两端 api 层同构，零适配）；directory-page 加同款导出按钮（outline + isPending + toast.promise）。语言包**增量合并**（React 独有的 chart.* 9 键 + export.* 5 键 + menu 2 键 + 并行任务的 common.loading 追平；用脚本合并且按字母序重排，避免整文件覆盖丢掉并行任务新增的 notices 键），`pnpm check-locales` 14 文件完全一致。**Next 端架构图谱仍 ❌ 待用户安排**。
- **Next 端架构图谱跟进（2026-09-03 晚，用户点菜单遇 404 触发）**：菜单数据在共享库（seed 已含 `/org/chart`），Next 端页面此前未实施导致侧边栏出现破损入口——按用户「两端功能、UI 一致」要求补齐：`@xyflow/react` 装入 next；org-chart-layout / org-chart-node / org-chart 三件直接复制（纯客户端组件零平台依赖）；org-chart-page 适配 **next/dynamic（`ssr: false`，选型评审定稿：后台页面不做 SSR）** + bprogress `router.push` 跳转 `/org/directory?deptId=xxx`；directory-page 补 **deptId URL Query 双向同步**（原生 `useSearchParams` 读 + effect `getState` 比较防循环 + 树点击 / 清除原生 `router.replace` 回写，replace 避开 bprogress 进度条闪烁）。踩坑：新页面文件漏 `"use client"`，Turbopack build 以 Server Component 报 `ssr:false`/`useState` 非法——Next 端移植 Vite SPA 组件时此指令必补。
- **验证**：react tsc / eslint / vitest（71 通过）/ build 全绿；next tsc / eslint（0 error）/ build 全绿；check-locales ✓。**待人工验证**：两端导出文件打开核对样式（蓝底表头 / 斑马纹 / 状态色 / 冻结首行 / 微软雅黑）、图谱卡片观感与 hover 抬起、折叠钮不误触跳转、**Next 端 `/org/chart` 打开与节点跳转通讯录带筛选**。
- **缺陷修复（同日，导出表头丢失）**：首轮样式版导出实测**表头行消失、全部样式未生效**（数据值正常）。根因：write-excel-file 4.1.1 运行时的 `writeXlsxFile` **不消费 `columns.header/cell`**（initializeSheets 无该逻辑），objects 被当纯行数组直写——表头与样式必须经库导出的 **`getSheetData(objects, columns)`** 显式转换成 SheetData 再传入。修复方式：动态 import 解构 `getSheetData`，调用链改为 `getSheetData(objectRows, columns)` → `writeXlsxFile(sheetData, { stickyRowsCount: 1 }, options)`；已用 node 生成测试文件解包 XML 验证（sharedStrings 含表头文字、styles.xml 含 1677FF/F5F7FA/D9D9D9、sheet1 冻结 pane），两端同文件修复，tsc / build 全绿。机制结论更新至 mechanisms §7.3（含「解包 xlsx 定位数据层 / 样式层」排查手段）。

### 组织中心阶段 4 实施：架构图谱 + 通讯录 Excel 导出（React 端，2026-09-03）

- **范围**：React 端（本阶段 UI 与交互基准）两项上线——架构图谱页 `/org/chart`（React Flow 只读可视化）与通讯录 Excel 导出；**Next 端严格按 feature-matrix 保持 ❌，待用户安排**。新增运行时依赖仅 2 个：`@xyflow/react 12.11.6`、`write-excel-file 4.1.1`（均按需懒加载）；**未引入 d3-hierarchy**——手写紧凑树布局（见 mechanisms §7.2 评估结论）。
- **架构图谱**：新路由 `/org/chart`；菜单 seed（icon `git-fork`，sort 4，常规全量按钮位）+ `nest/scripts/migrate-menus-add-org-chart.ts` 幂等补录（本地库已执行：菜单插入 + super_admin 全量授权）。手写树布局 `org-chart-layout.ts`（子树宽度先序分配 + 父节点居中，固定节点尺寸 220×84）；自定义节点 `org-chart-node.tsx`（HeroUI Typography/Chip，停用置灰，底部折叠按钮显示 +N）；只读边界——`nodesDraggable` / `nodesConnectable` / `elementsSelectable` / `edgesFocusable` / `zoomOnDoubleClick` 全关、Controls `showInteractive={false}`（Zoom In / Out / Fit View）、无 Minimap（按规模再评估）；节点点击 → `navigate /org/directory?deptId=xxx`（URL Query 规范）；折叠展开基于可见子树整体重排（不自动 fitView 保持视角）；图谱组件 `React.lazy` 懒加载（org-chart chunk 约 180KB / gzip 58KB，@xyflow/react 不进主包，CSS 随 chunk）。
- **通讯录导出**：`directory-export.ts`——`write-excel-file/browser` 在触发导出时动态 import（通讯录页初始包不受影响）；串行分页 pageSize=100 逐页汇总（禁止 pageSize 拉满）；**超限判断前移**：首次响应优先读 `pagination.total`，total > 10000 直接终止不再请求后续页，无 total 时累计超限立即停止（不允许拉完全部数据后才判断）；导出随当前筛选与排序（sort / order 传后端保证翻页稳定）；工具栏「导出 Excel」按钮 `isPending` 防重复 + `toast.promise` 反馈；9 列（姓名/登录名/工号/组织路径/主岗/手机/邮箱/入职日期/状态）。
- **通讯录 URL Query 落点**：directory 路由新增 `validateSearch`（deptId）；URL → store 用 effect + `getState()` 比较后 `setFilters`（防冗余 epoch 重置）；store → URL 树点击 / 清除时 replace navigate 同步——刷新 / 分享 / 前进后退稳定（详见 mechanisms §7.4）。
- **write-excel-file 4.x API 差异（踩坑，详见 mechanisms §7.3）**：exports 无裸 "."（必须 `/browser` 子路径）；`columns[].cell` 是按行回调而非静态对象；`writeXlsxFile(...)` 返回 `{ toBlob, toFile }` 句柄、下载走 `.toFile(fileName)`（options 无 fileName）。
- **验证**：react tsc / eslint / vitest（71 通过，含 locales 一致性）/ vite build 全绿；nest tsc 全绿；补录脚本本地库执行成功。**待人工验证**：浏览器走查图谱页（布局 / 折叠 / 缩放 / Dark Mode / 节点跳转）与导出（各筛选组合、超限提示、文件打开）。
- **同步待办**：Next 端图谱与导出待用户安排（Client Component + `next/dynamic`，不做 SSR）；mechanisms.md §7 已沉淀机制结论。

### 通知详情登录可达路由 + 权限体系整改落地（2026-09-03）

- **背景**：站内信推送给发布范围内用户，接收者未必拥有公告管理菜单——点铃铛通知跳 `/org/notices/:id` 被菜单权限门卫整页 403，体验断裂。方案经用户评估批准：**路由访问控制升级三层模型**——公开路由 / **登录可达路由**（精确白名单 + 动态前缀）/ 菜单权限路由；公告详情归登录可达层，可见性由详情接口服务端校验兜底（super_admin / SEARCH 位 / 发布范围内，范围外 API 403 `NOTICE_NOT_VISIBLE`，详情页内容区错误卡呈现，非整页 403）。
- **路由层改动（React / Next 同一变更集同步）**：
  - 两端 `lib/route-access.ts` 新增 `LOGIN_REQUIRED_PREFIXES = ["/org/notices/"]` 与 `isLoginRequiredPath()`，作为唯一语义源（前缀带尾斜杠，列表页 `/org/notices` 不豁免；已确认前缀下无其它业务路由）；Next `proxy.ts` 删除本地 `NOTIFICATION_CONSUME_PREFIXES` 改用统一判定，React `admin-layout.tsx` 门卫同步切换，父级路径匹配逻辑保留服务其它动态路由。
  - 多标签治理放行：`lib/tabs-model.ts` 的 `pruneTabPaths` 增加 `allowPrefixes` 参数（两端同构实现），`tags-bar.tsx` / `admin-shell.tsx` 传入前缀——通知详情标签不再被菜单加载后的治理误删；React 端 `tabs-model.test.ts` 补 3 个用例（32 全过）。
  - 详情页返回入口动态降级：两端 `notice-detail-page.tsx` 按「当前用户菜单树是否含 `/org/notices`」（`useMemo` 派生）切换「返回列表 / 返回控制台」，无公告菜单权限的消费用户不再撞列表页门卫。
- **走查发现的两个既有缺陷（放行后暴露，已修复）**：
  - React 端 `lib/route-component.ts` 的 `findRouteLeafComponent` 仅精确匹配 fullPath，动态路由 `/org/notices/<id>` 解析不到 routeTree 模板 `/org/notices/$noticeId` → KeepAliveOutlet 实例池渲染 null → **详情页主体空白**（此前有菜单权限账号经父级匹配放行后同样命中，属既有问题）。修复：新增导出 `matchRoutePattern`（段级匹配，`$xxx` 通配），叶子判定改用之。
  - `lib/route-title.ts` 的 titleKey 映射键为路由模板，消费点（`tags-bar` 标签名 / `app-header` 面包屑）用具体路径查询必然 miss → 详情标签无名。修复：新增 `findRouteTitleKey`（精确 → 模板匹配兜底），两消费点切换。
- **同一变更集落地的权限体系整改**（对应 AGENTS.md §19 三项待办清账）：
  - **按钮门控改菜单粒度**：新增 `useMenuPermissions` / `useMenuHasPermissionKey` / `useHasPermission`（基于当前路由菜单的 `userPermissions` 位，数据链路 React=useMenus / Next=RSC menuTree → `stores/menu-store.ts`），全部业务页与 `DataTableSearchReset` 从全局聚合位切换；旧的 `use-has-permission.ts` 与 `useHasPermissionKey` 删除（无残留引用）。
  - **`hasPermission` 语义对齐后端**：多权限位判定由「全部命中（AND）」改「任一命中（OR）」，并识别 super_admin 全量位 `9223372036854775807n`（与后端 `normalizePermissionBits` 输出对齐）。
  - **`roles.enabled` 参与权限聚合**：NestJS（`aggregatePermissions` / `buildAllowedMenuIds`）与 Next（`buildPermissionMap` / `buildAllowedMenuIds`）同步只聚合启用角色，停用角色权限即时回收。
  - **super_admin 角色绑定保护**：`PUT /users/:id` 的 `roleIds` 变更拦截移除/添加 super_admin 绑定（非超管操作者 403 `SUPER_ADMIN_ROLE_BINDING_PROTECTED`，超管间互操作豁免），nest / next 同步实现；**`POST /users`（create）尚未拦截，留待办**。
  - **NoticeBell 列表换 HeroUI ListBox**（对齐 `.heroui-docs` 文档用法：`selectionMode="none"` + `onAction`），浏览器实测渲染正常。
  - **通知消费凭证（人工验收修复）**：发布时在范围内、此后被移出范围（调岗/组织调整）的账号，点站内信进详情曾 403 `NOTICE_NOT_VISIBLE`（可见性为实时范围判定）。语义修正为「**能在通知列表看到，就能查看详情**」：`GET /notices/{id}` 可见性增加「收到过该公告站内信」分支（`notifications.recipient_id + link = /org/notices/{id}` 精确匹配，nest / next 同步实现，openapi 契约描述同步更新）；无凭证且不在范围仍 403，安全边界不变。API 实测：凭证用户 nest 200 / next 200，无凭证用户 403。
  - **通知详情标签页与面包屑显示具体公告标题（人工验收修复）**：详情页加载成功后将 `notice.title` 写入 tabs meta（复用 `syncMeta` 快照机制，随 sessionStorage 持久化、关标签随治理清理），标签页与面包屑据此显示具体标题而非静态名「公告管理」。截断：标签沿用 `max-w-44 + truncate`；面包屑新增 `max-w-60` + `styles/breadcrumbs.css` 组件类（`.breadcrumbs__link` 为 flex 容器，`text-overflow` 需 block 才生效；Tailwind 任意变体含 `.` 的选择器无法生成，走全局组件类），两端同步。
  - **死通知治理（人工验收修复）**：删除公告（软删）此前不清理关联站内信，铃铛列表残留「点开即 404 `NOTICE_NOT_FOUND`」的死通知。修复分两层：① 删除公告时在同一事务内清理 `link = /org/notices/{id}` 的站内信（nest / next 同步）；② 存量兜底脚本 `nest/scripts/clean-dead-notifications.ts`（幂等，本地库已执行，清理 3 条死通知），存量库执行项已记入 AGENTS.md §19。详情 404 的错误卡文案「或公告已被删除」本就覆盖该场景。
  - **详情错误卡入口改按钮（人工验收调整）**：`ErrorContent` 的 action 从 Link 文字链接改为 `Button size="sm"`「返回控制台」（HeroUI Button 无 href 属性，`onPress` + 路由导航实现，react 用 `useNavigate` / next 用 `router.push`），两端同步。
  - **面包屑两级化（人工验收调整）**：通知详情面包屑由单级具体标题改为「**公告详情 > 标题**」两级——`TabMetaSnapshot` 增加可选 `parentTitle`（两端 `tabs-model.ts` 同步），详情页写 meta 时以 `features.notices.detail.titleFallback`（公告详情 / Notice detail）为父级名，两端 `app-header` 回退分支按 `parentTitle` 渲染两级，无 parentTitle 的标签保持单级。
  - **详情页样式升级（人工验收调整）**：标题从 `body-sm` 小字升级为 `Typography type="h4" font-bold` + 置顶 Chip 同行，下接发布人/发布时间元信息行；正文改 `bg-surface` 卡片（`rounded-3xl border px-6 py-5`），容器间距 `gap-5`，视觉对齐管理侧详情抽屉的信息层次，两端同步。
  - **通知抽屉骨架屏闪空态修复（人工验收反馈）**：抽屉未开时列表 query 处于 disabled 的 pending 态，`isLoading`（= pending && fetching）为 false，导致打开抽屉首帧闪现「暂无通知」空态再切骨架。条件改 `isPending`（无数据即骨架）后稳定呈现与条目同形的骨架屏，两端同步。
  - **详情页 Card 版式重构（人工验收任务）**：按用户设计要求整体重构——HeroUI Card 主容器（rounded-3xl shadow-sm，p-6/8 留白充足）内依次为返回 Button（ghost + 箭头，按菜单权限「返回列表/返回控制台」降级）、类型 Chip「系统公告」（新增 i18n key `typeNotice`）+ 置顶 Chip、`type="h3"` 大标题（`leading-relaxed` 保证超长标题换行阅读间距）、发布人/发布时间元信息（`Intl.DateTimeFormat` 按 i18n locale 输出「2026年9月3日 11:15」格式，新增 `lib/format-date.ts`）、Separator、ScrollShadow 正文卡片（`max-h-[480px] bg-content2` 限高滚动 + `leading-7` 行距；content 缺失回退标题文本）、底部已读状态「你已于 {{time}} 阅读此公告」（新增 i18n key `readAtTip`）。加载骨架与卡片同形。两端同步，含 4 个语言包文件。
  - **契约扩展 `myReadAt`**：`GET /notices/{id}` 响应新增当前用户首次阅读时间（范围内进详情记首读后查询，含本次触发；管理视角/范围外查看为 null）——nest / next `NoticeView` + openapi `NoticeDetail` schema + 两端 `api-types` 四处同步。HeroUI 项目枚举注意：Button 无 `light` variant（用 `ghost`）与 `startContent` prop（图标放 children），Chip 无 `primary`（主色为 `accent`）。
  - **公告标题上限 200 → 50（人工验收调整）**：nest `NoticeCreateDto/NoticeUpdateDto` `@MaxLength(50)`；openapi 三处 `title maxLength`（实体/创建/更新）同步；next server 补齐缺失的长度校验（create/update 超 50 → 400 VALIDATION_ERROR「公告标题不能超过 50 个字符」，此前 next 端无此校验）；两端表单 zod `max(50)` + Input `maxLength={50}` + `titleInvalid` 文案「公告标题为 1-50 个字符」（4 语言包）。API 实测 51 字 nest/next 均 400。
  - **详情页发布人头像（人工验收调整）**：元信息行左侧新增发布人 Avatar（`publisherAvatar` 非空才渲染，`size="sm"` 最小档，accent soft + `Avatar.Image/Fallback` 组合式 API），无头像保持纯文本元信息，两端同步。
  - **KeepAlive 保活下详情页 `useParams` 崩溃修复（人工验收反馈）**：动态路由组件解析修复后，详情组件真正进入 KeepAlive 实例池；从详情跳往他页时实例 hidden 保活但路由已切走，`useParams({ from: 详情路由 })` 严格模式因找不到活跃 match 抛 `Invariant failed: Could not find an active match` 使布局级 CatchBoundary 重建整树（多标签栏渲染随之错乱）。修复：改 `useParams({ strict: false })` 宽松模式（hidden 期间实例不发请求，无副作用）。验证：详情 → 返回列表正常跳转无崩溃，三标签（控制台/公告管理/详情标题）标题与活跃态正确；详情页刷新后标签亦正常——用户报告的「刷新后公告管理标签显示成详情标题」为崩溃重建的次生表现，随崩溃修复消失。
- **验证**：react / next / nest 三端 `tsc --noEmit`（react 端现存 3 个错误全部来自并行进行中的阶段 4 依赖未安装，与本批改动文件无关）；eslint 0 error；tabs-model 32 测试全过；**真实库浏览器走查矩阵全过**（admin / 无权限观察者 / 范围内详情 / 范围外错误卡 / Next proxy 放行与列表页 403 未误豁免 / 标签保留与标题恢复 / 返回按钮降级 / 进详情记已读），测试数据（角色、用户、公告）已清理。
- **后续对齐**：Vue / Nuxt 实现公告/通知模块时直接跟上登录可达三层模型与菜单粒度按钮门控；机制结论（动态路由模板匹配、登录可达层）视需要沉淀 `docs/mechanisms.md`。

### 组织中心阶段 4 技术选型评审：图谱 React Flow + 导出 write-excel-file（2026-09-03）

- **性质**：选型决策 + 实施批准记录。阶段 1 评审暂定的「架构图谱 ECharts + 通讯录 Excel 导出 xlsx」经用户评审确认推翻，新方向如下（历史条目按 §13 原则永不回改，以本条目为准）；方案 v2 经用户批准进入实施，批准时确认 3 项微调（懒加载策略分别明确 / 导出上限优先读 total / 本阶段仅 React 端实施），同日开工。
- **架构图谱 → React Flow（`@xyflow/react ^12`，React / Next 端）**：v12 官方支持 React 19 / Tailwind 4 / Dark Mode；相比 ECharts canvas 自绘，其节点为普通 DOM，组织卡片直接用 HeroUI 组件 + 项目 Design Tokens 渲染，视觉一致性更贴合「UI 基准 + 各端组件库」架构。**第一版定位只读可视化**——允许：画布平移 / 缩放 / Fit View / 点击节点 / 折叠展开组织节点；禁用：节点自由拖拽 / 连线创建与编辑 / 拖拽改变组织结构（React Flow 仅作图谱可视化引擎，关闭编辑能力，不做成流程编辑器）。Minimap 不作第一版必备：演示规模几十~百级节点，提供 Zoom Controls / Fit View / 画布平移即可，是否加 Minimap 按实际节点规模决定。
- **d3-hierarchy 暂不引入**：React Flow 是唯一确定依赖；自动布局方案待根据实际节点规格（规模 / 节点尺寸 / 布局复杂度）评估后再定，优先考虑 d3-hierarchy，确认需要前不提前引入；确需引入时单独说明理由。
- **节点跳转通讯录统一 URL Query**：`/org/directory?deptId=xxx`，不用路由 state——支持刷新 / 复制分享 URL / 浏览器前进后退，四端实现统一（与 ui-spec §18.2「路由态 → URL search params」一致）。
- **懒加载策略（两项依赖分别明确，不笼统「均可 lazy」）**：`@xyflow/react` 随图谱页面懒加载（React.lazy / `next/dynamic`，仅进入图谱路由时加载）；`write-excel-file` 在用户触发导出时动态 `import()`，不增加通讯录页面初始包体积。
- **Next.js 端不做 React Flow SSR**：图谱属后台高交互页面、无 SEO 需求，采用 Client Component + 图谱组件 `next/dynamic` 懒加载，默认不做 SSR，不为 SSR 增加节点尺寸 / Handle / fitView 容器尺寸等额外复杂度。
- **后续图表库 → Recharts（仅 React / Next）**：recharts 3.x 对齐 React 19、内置 TS、无头 SVG 完全消费项目 Design Tokens（ui-spec §18.1 已列 Recharts、§17.2 已有 `--chart-1..5` token，决策有先例）。**Vue / Nuxt 图表库本次不决策**，待其 Dashboard 阶段单独评估；四端图表一致性不依赖同一实现库，靠 Design Tokens + 图表颜色 / 字号 / Tooltip / Grid / Legend / 空状态 / Dark Mode 的 UI 规范保证。
- **Excel 导出弃用 npm `xlsx`（SheetJS）→ `write-excel-file ^4`**：npm xlsx 0.18.5 停更且带未修复 CVE（CVE-2023-30533 原型污染 / CVE-2024-22363 ReDoS），禁止作为新依赖；write-excel-file 纯 TS、浏览器端生成 xlsx、运行时仅依赖 fflate（无 React 依赖，四端可复用同一库），满足通讯录导出需求（单 Sheet + 表头加粗 / 列宽等基础样式，无多 Sheet / 图片 / 公式 / 合并单元格诉求）；如实施中发现无法满足，说明具体原因后再评估 ExcelJS。
- **导出数据获取 → 分页批量汇总（禁止 pageSize 拉满）**：当前筛选条件 → 串行分页请求（复用 `DirectoryListParams`，不使用 pageSize=999999 一类方式）→ 逐页汇总 → 前端生成 Excel。数据量保护（超限判断前移，不允许拉完全部数据后才判断）：分页接口返回 `pagination.total` 时，**首次请求后优先读 total**，total > 10000 直接提示缩小筛选范围并终止（不继续请求后续页）；无 total 时分页过程中累计数量，一旦超过 10000 立即停止后续请求。未来数据规模明显扩大再单独演进 NestJS 服务端生成文件流的导出方案，现阶段不为未来大数据量提前增加后端导出接口（无契约变更）。
- **本阶段实施范围**：**React 端为本阶段 UI 与交互基准**；Next.js 是否同步实施严格按 feature-matrix 与当前阶段范围执行——本阶段仅实施 React 端，Next 端图谱/导出保持 ❌ 待用户安排，不因方案中「Next 端随后对齐」的表述默认扩大范围。
- **四端图谱架构原则**：统一「组织图谱数据模型（节点字段 / 节点状态）+ 节点视觉 + 连线视觉 + 交互规范」，各端 Adapter 对接各自实现库——React / Next → `@xyflow/react`（官方）；Vue / Nuxt → `@vue-flow/core`（社区维护，最终版本与维护状态待 Vue / Nuxt 进入组织模块阶段再确认，不阻塞 React 端）。图谱数据源复用现有 `GET /org/depts/tree`，无契约变更；节点展示组织人数属契约扩展，第一版不做（后续如需另行评审）。
- **文档同步**：feature-matrix 新增架构图谱 / 通讯录 Excel 导出两行（❌ 待实施）并修正统计口径；ui-spec §1.3 增补图谱页面规划与交互边界（v1.1）；AGENTS.md §19 待办措辞更新。mechanisms.md 本次不新增条目（无代码行为结论可沉淀），待实施后补 React Flow 集成机制条目（布局计算 / 受控节点 / 懒加载边界）。

### Next.js 全栈版分期落地 N0–N7（2026-09-02）

- **范围**：`next/` 从 HeroUI 官方模板（零业务代码）分八期实现至与 React 端冻结范围（契约 v1.6.0 阶段 1）对齐的全栈版本。方案经用户评审（9 条修正 + 3 项决策确认：契约冻结文件加附录、GitHub Actions cron 直连数据库、服务端双源提取鉴权）。八期提交：N0 地基 `0d00d4` / N1 认证 `461a94a` / N2 布局横切 `dd68e88` / N3a 用户 `cf9efe2` / N3b 角色 `d90848b` / N3c 菜单+权限 `fbe3430` / N4 字典+日志 `629de7f` / N5 我的账户 `f9dffdd` / N6 组织管理 `753b9d3` / N7 收尾 `25c08d0`；此后并行演进：岗位/通讯录/公告跟进与冻结契约退役（`700d4d3`）、README 对齐（`3300ec1`）、全局进度条（`c1db1aa` / `a1b3f96` / `6ac9363`）。
- **技术选型**（对齐 React 端）：HeroUI v3 同版本、React Query / zustand / RHF+zod / i18next（语言包与 React 端文件同步 + `pnpm check-locales` 一致性强制）、@tanstack/react-table + dnd-kit（DataTable 全套移植，零行为差异）；服务端 Drizzle + postgres.js（`prepare:false` 适配 transaction pooler）、jose、bcryptjs、nanoid。新增依赖仅对齐项，未引入 axios/NextAuth。
- **架构要点**：
  - **契约冻结机制**：`contracts/` 快照作为 N0–N6 唯一事实来源（阶段 2/公告字段冻结在外），N7 升级至 HEAD 后任务完成、快照退役（`700d4d3`）——字段实现严格按冻结版裁剪（如用户表单无组织/岗位字段），避免追并行开发中的移动目标。
  - **鉴权**：JWT 双令牌存 httpOnly Cookie（与 React 的 localStorage+Bearer 仅存储层不同，内部 API 双源提取仍兼容 Bearer）；`src/proxy.ts`（Next 16 的 middleware 更名）每请求执行 jose 验签 → **token_version 实时 DB 比对**（改密全端即刻下线）→ refresh Cookie 静默轮换 → 菜单路径门卫；`requireAuthUser(req, permission)` 等价 AuthGuard+PermissionsGuard。
  - **菜单权限过滤在服务端**（方案修正二）：authenticated layout RSC 过滤菜单树经 props 注入 Sidebar，客户端零二次过滤，规避水合闪烁；路径门卫在 proxy 用「全量菜单树 ∪ 白名单」区分**真实路由无权（403）**与**不存在路由（放行给 Next 404）**——修正了初版「未知路径误 403」的问题（N7 走查发现）。
  - **数据库**：迁移真源在 `nest/drizzle/`，Next 端 `pnpm db:pull`（drizzle-kit pull）内省生成 schema，`scripts/sync-pulled-schema.mjs` 自动修复三类内省缺陷（空字符串默认值输出未闭合字面量、users↔depts 循环外键 TS 推断死循环、`i18NKey` 命名怪异大写）并强制 permissions 列 `mode:"bigint"`（9223372036854775807 超出 Number 安全整数）。**postgres.js 驱动的 pg 错误字段是 `constraint_name`（pg 驱动为 `constraint`）**——唯一冲突 409 映射须按此判别；drizzle-kit 0.31.10 在 postgres.js 多表并发内省下崩溃，装 `pg` 依赖即被优先选用后稳定。
  - **SSR 适配**：i18next 同步初始化 + 服务端每请求独立实例（模块单例仅浏览器会话持有，防跨请求语言污染）；服务端模块只许引 `@/i18n/config`（引到 index 会经 re-export 评估 react-i18next，其 createContext 在 RSC 缺失即崩）；语言经 Cookie 双写实现服务端/客户端首帧一致；主题偏好由内联 bootstrap 脚本首帧前应用。移植 React 组件一律补 `"use client"`（Vite SPA 无此概念）。
- **已知差异**（均已确认记录在 next/README.md）：KeepAlive 放弃（标签刷新仅对激活标签 `router.refresh()`）；菜单过滤位置服务端化；日志清理载体 GitHub Actions cron（`next/scripts/clean-logs.mjs`，幂等，与 Nest schedule 重复无害）。
- **验证**：tsc / eslint（0 error）/ next build 全绿贯穿全程；每期真实库冒烟——认证闭环（登录/轮换/重放 401/登出/token_version 下线）、用户/角色/菜单/字典 CRUD 全链路、删除保护（删自己、super_admin、内置角色/账号/组织三级占用）、组织拖拽排序与组合环 400、头像 Supabase 上传/删除、改密后旧会话 401 + 新密码登录；N7 逐页 HTTP 走查 9 页全 200 + 守卫三语义。**待人工验证**：浏览器逐页 UI 走查（与 React 端像素级对照）、Vercel 部署。
- **同步待办**：`docs/mechanisms.md` 沉淀本期机制结论（驱动差异/RSC 边界/内省缺陷修复）；组织阶段 2 字段（用户表单组织/岗位六项与列表列）随冻结契约退役已由并行批次补齐（`700d4d3` 等）；Vercel 部署与仓库级 CI 挂接（locales 检查 + 日志清理 cron，脚本已就绪）。

 + 契约 v1.7.1（发布范围列展示范围摘要）（2026-09-02）

- **背景**：公告管理页人工验收发现三类问题：① 详情抽屉「暂无人员」空状态不居中；② 详情抽屉富文本不渲染；③ 「先看详情再点编辑」表单不回显但能保存。另有范围口径疑问（勾 1 岗位 + 2 人员，未读仅显示 1 人）。
- **修复（前端）**：
  - `EmptyContent` 类名从「传入即整体替换」改为 `cn(默认类, className)` 合并语义——调用方只传 `py-8` 等间距类时保留 `flex items-center justify-center` 居中（详情抽屉空状态居中显示）；既有传完整类的调用点（depts-page / dept-tree-panel）经 tailwind-merge 合并后行为不变。
  - 详情抽屉（`notice-detail-drawer.tsx`）不再直接用列表行数据渲染：抽屉内部按 id 拉取 `fetchNoticeDetail`（queryKey `["notices","detail",id]`，与编辑弹窗共享缓存），富文本渲染真实 `content`，加载中显示骨架屏，返回前用列表行基础字段兜底。
  - 编辑弹窗（`notice-form-dialog.tsx`）回填从 `useMemo + setValue`（渲染期副作用，第二次打开命中缓存时挂载首帧 setValue 被 React 丢弃 → 值已写入但界面不回显、保存却成功）改为 `useEffect + reset()` 整体回填，并用 `useRef` 保证每次打开仅回填一次（避免 `staleTime: 0` 的 refetch 覆盖用户正在编辑的内容）。
- **契约 v1.7.1（发布范围列展示范围摘要）**：`GET /notices` 列表每条补充返回 `scopes`（NoticeScope[]，targetName 回填；`scopeCount` 保留为范围目标条数），`Notice` schema 新增可选 `scopes`，`NoticeScope.targetName` 描述更新为「列表与详情均回填」。`findAll` 由「scopeCount 计数查询」改为复用 `loadScopes`（targetName 回填，scopeCount = scopes.length，每行查询组数不变级）。前端列表「发布范围」列由数字 Chip 改为范围名称摘要（如「岗位：前端组、测试；人员：张三、李四」，组间「；」组内「、」，目标已删除显示「已删除」，无范围显示「—」）。
- **收尾打磨（同日）**：① 发布范围摘要超长截断（单格限 20 字符 + 「…」）+ HeroUI Tooltip 完整提示（替代原生 title）；② 一键催办改用 `toast.promise`（loading「催办中…」/ 成功带 `remindedCount` 文案 / 失败走 `getNoticeErrorMessage`）且按钮 `isPending` 态显示「催办中…」防重复点击，toast 从 mutation onSuccess/onError 移出由 promise 统一呈现（成功副作用保留 invalidate read-stats）；③ 详情抽屉已读/未读名单由「单查询 queryKey 含 readTab + staleTime 0（切 Tab 必重新请求）」改为**两 Tab 独立查询**（queryKey 各含自身页码，抽屉打开时预取两个 Tab 首页，切 Tab 仅切换取数查询、零请求），staleTime 60s 内抽屉开合 / Tab 来回切换复用缓存，催办后 invalidate read-stats 前缀仍强制刷新；④ **列表接口连接池耗尽修复**：v1.7.1 的 `findAll` 每行 `loadScopes`（每行 4 组查询）与逐行 `computeStats` 用 `Promise.all` 全量并发，瞬间打满 pg Pool（默认 max 10）→ 详情请求排队 22s ETIMEDOUT 500、日志写入同样超时（`AggregateError [ETIMEDOUT]`）。修复：范围明细改**批量装载** `loadScopesBatch`（全页一次 IN + 3 组批量名称回填，共 4 组查询）+ 逐条统计 `mapWithConcurrency` 并发限制（同时 4 条），契约与返回结构不变；⑤ 顶栏铃铛通知抽屉 Loading 由单行文字改为**与通知条目同形的骨架屏**（红点占位 + 标题/时间双行，5 条、宽度渐变）。
- **未读口径确认（维持现状）**：范围内总人数 `totalCount` = 三粒度并集去重（**含离职**，已读率分母口径）；未读名单（催办口径）**不含离职**；已读名单含离职（历史保留）。「勾 1 岗位 + 2 人员只显示 1 个未读」= 并集去重（岗位成员与勾选人员重合只算一次）+ 离职不展示的共同作用。「怎样算已读」：范围内用户打开公告详情（消费端详情页 / 铃铛跳转）即写 `notice_read_records`（唯一约束幂等，只记首次）。
- **验证**：nest tsc / eslint 全绿；react tsc / eslint / vitest（68 通过，含 locales 一致性）/ vite build 全绿；openapi.yaml 文本结构校验通过（无 yaml 库，人工核对缩进与 $ref）。
- **契约 v1.7.2（发布人列升级头像+邮箱）**：`Notice` schema 新增可选 `publisherEmail` / `publisherAvatar`（发布人被删除即 publisherId 置空时为 null）；后端 `findAll` / `findMine` / `findVisibleDetail` 的 users left join 补充 select `email` / `avatar`，`create` 返回补 `user.email` / `user.avatar`。前端公告管理列表「发布人」列由纯文本（publisherName）改为复用 `UserInfo` 通用组件（头像 + 名称 + 邮箱小字），发布人被删除时整体显示「—」，与通讯录「人员」列 / 日志「操作人」列样式统一。
- **缺陷修复（同日）**：公告管理页**标题搜索不生效**——`useListQuery` 缺省 `searchParam` 为 `search`，而 `GET /notices` 后端参数名为 `keyword`（`NoticeQueryDto.keyword`，标题 ILIKE），搜索词从未发给后端。修复：`useListQuery` 补 `searchParam: "keyword"`（与 `/org/*` 系列统一命名）。

### 组织中心阶段 3：公告管理 + 站内信铃铛（契约 v1.7.0）（2026-09-01）

- **范围**：公告全流程（发布/范围三粒度/可见性过滤/已读率/阅读记录/定时发布/撤回/催办）+ 站内信 notifications（表在迁移 0007 已建）+ 顶栏铃铛。契约先行：openapi.yaml 升 v1.7.0（新增 Notices / Notifications tag、10 个路径、9 个 schema，YAML 校验通过）。
- **后端（`nest/src/modules/notice/`）**：`NoticesService`（管理列表当页并行统计已读率；范围内详情可见性校验 [范围内用户或 SEARCH 位]；进详情自动记首读，唯一约束幂等，IP 从请求取；编辑/删除/撤回/催办走「发布人本人或 super_admin」保护 403 `NOTICE_NOT_PUBLISHER`；撤回仅 published 409 `NOTICE_NOT_PUBLISHED`；催办 24h 防频 409 `NOTICE_REMIND_TOO_FREQUENT`、无未读 409 `NOTICE_NO_UNREAD`）；`publishDueNotices` 定时发布（@Cron 每分钟扫描 draft 且 publish_time 到期 → published + 通知范围内全员，通知分批 1000/批写入）；`NotificationsService`（铃铛列表/未读数/单条与全部已读，数据严格限定 recipientId）。范围解析 `resolveScopeUserIds`（dept 递归子树 / post 经 user_posts / user 直接，并集去重）与 `assertScopeTargets` 沉淀在 org-views。
- **前端（`react/src/features/notice/`）**：公告管理页（服务端分页 + keyword/status 筛选；置顶 Chip + 已读率 ProgressBar；详情抽屉：内容消毒渲染 + 已读/未读 Tab 名单 + 一键催办）；发布/编辑弹窗（**Tiptap 3** 富文本 + 三粒度范围选择器 `NoticeScopeSelector`（Tabs 组织/岗位/人员多选，三数组受控）+ 置顶开关 + 发布时间 DatePicker（未来时间 = 定时草稿））；公告详情页 `/org/notices/$noticeId`（全员，进详情自动记已读）；**顶栏铃铛** `NoticeBell`（未读数 60s 轮询红点 Badge、通知抽屉、点击标记已读并跳转 link、全部已读）。新增依赖：@tiptap/react / @tiptap/starter-kit / @tiptap/pm / dompurify；渲染端 `sanitizeNoticeHtml`（DOMPurify）阻断存储型 XSS——**服务端存储原始 HTML，消毒在渲染端**。
- **Modal.Footer 结构修正（全站 8 个表单弹窗）**：原 Footer 嵌在 `Modal.Body` 内的 Form 里，跟随 Body 滚动不固定；统一重构为「Modal 结构下沉到有 mutation 的内层组件」——外层组件纯转发（isOpen 条件 + key），内层渲染完整 Modal（Header/Body[Form 无 Footer]/Footer），Footer 成为 Dialog 直接子元素（HeroUI CSS 语义：Body flex-1 滚动 + Footer flex 兄弟固定，无 sticky 样式）。涉及 dept/post/user/user-reset/menu/role/dict×2。
- **事故记录**：Modal.Footer 批量移动曾误用 `git checkout` 还原 7 个文件，回退了 user-form 等未提交改动（阶段 2 用户表单扩展 + 4 处 toast.promise）——已全部重做并合并进本次 Modal 重构；教训：`git checkout --` 还原前必须确认目标文件的未提交改动内容（见 mechanisms.md 后续补充）。
- **验证**：nest tsc / eslint / build 全绿；react tsc / eslint / build 全绿（routeTree 注册 /org/notices 与 /org/notices/$noticeId）。后端冒烟：发布 201（published，readRate null [范围内 0 人]）→ 详情/编辑/撤回状态流转 → 定时草稿 draft → 催办 409 NOTICE_NO_UNREAD（无范围内用户）→ read-stats → 删除清理 → 铃铛 unread-count/read-all 全通。**待人工验证**：浏览器发布带范围的公告 → 挂靠组织用户铃铛收到通知 → 点击进详情记已读 → 管理侧已读率与未读名单变化 → 催办防频；定时发布等 Cron 触发。
- **同步待办**：阶段 4（架构图谱 ECharts + 通讯录 Excel 导出）；Vue / Next / Nuxt 跟上 v1.7.0。

### 组织中心阶段 2：岗位管理 + 人员通讯录 + 用户关联闭环（契约 v1.6.0 补充）（2026-09-01）

- **范围**：阶段 1 契约中的岗位 5 接口与通讯录 1 接口全量实现；另扩 **用户管理关联编辑**（阶段 2 范围扩展，实现通讯录数据闭环——PRD 4.3 用户表组织字段的使用入口即用户管理，无此入口通讯录永远无数据）：`UserCreateRequest` / `UserUpdateRequest` 新增 `deptId`（须存在且启用，400 `DEPT_NOT_FOUND`）/ `employeeNo` / `entryDate`（YYYY-MM-DD）/ `employmentStatus` / `postIds`（user_posts 全量替换，须存在且启用，最多 20 个）/ `mainPostId`（须在 postIds 中，400 `VALIDATION_ERROR`）；管理端 User 视图新增 `deptId / deptName / employeeNo / entryDate / employmentStatus（存量 NULL 按 employed 输出）/ posts（主岗标记）`；用户软删同步清理 user_posts。契约以 v1.6.0 补充注记记录（YAML 校验通过）。
- **后端（`nest/src/modules/org/`）**：`PostsService`（分页列表含下级组织筛选（递归 CTE 两步查询）/ keyword / category / status；同组织岗位名唯一 409 `POST_NAME_EXISTS`；删除校验在职人数 `POST_HAS_ACTIVE_USERS`（message 携带人数）并软删 + 清理 user_posts；`/org/posts/:id/members` 在职人数穿透）；`DirectoryService`（`employmentStatus` 缺省 employed、递归组织筛选、displayName/employeeNo/username 三字段模糊搜索；deptPath 全量内存拼链、主岗 join 单次装载）。共享 helper `org-views.ts`：`buildDeptPathMap` / `collectDeptSubtreeIds` / `loadDirectoryExtras` / `toDirectoryEntryView` / `assertValidDeptId`（组织中心与用户模块共用校验）/ `assertValidPostIds`。
- **前端（`react/src/features/org/`）**：岗位管理页（组织筛选 DeptTreeSelect + 类别/状态 FilterSelect + 关键词 + 服务端分页 DataTable；「在职人数」列点击打开成员穿透抽屉（一次拉 50 名，数量级小不做分页 UI）；表单 toast.promise）；人员通讯录页（左树右表：树点击即筛选组织及下级、FilterX 清除、`employmentStatus` 缺省筛选在职；列：人员（UserInfo）/工号/组织路径/主岗/手机/邮箱/入职日期/在职 Chip）；共享组件 `DeptTreeSelect`（平铺缩进树下拉，组织表单与用户表单复用）。用户管理编辑弹窗新增「所属组织 / 关联岗位（多选）/ 主岗（选项限定已选岗位，天然满足约束）/ 工号 / 入职日期 / 在职状态」六项，用户列表加「所属组织」列。
- **菜单 seed**：「组织管理」sort 0、「岗位管理」（briefcase，/org/posts）sort 1、「人员通讯录」（book-user，/org/directory）sort 2；`migrate-menus-add-org.ts` 扩展为按 i18nKey 幂等补录三个子菜单，存量库已执行（旧两条跳过、新两条插入 + super_admin 授权）。
- **验证**：nest tsc / eslint / build 全绿；react tsc / eslint / build 全绿（routeTree 注册 /org/posts、/org/directory）。后端冒烟：登录 → 通讯录（默认全 employed 3 人 / resigned 0 / all 3 / deptId 筛选 0——用户未挂组织符合预期）→ 岗位创建 201 → 同组织重名 409 → 按组织筛选 → members 空穿透 → 删除软删后列表清空 → User 视图新字段输出正常。**待人工验证**：浏览器走通「用户编辑挂组织/岗位 → 通讯录/在职人数/主岗展示」全链路、岗位删除的在职人员 409 拦截。
- **同步待办**：阶段 3（公告 + notifications 站内信 + 顶栏铃铛）→ 阶段 4（架构图谱 ECharts + 通讯录 Excel 导出）；Vue / Next / Nuxt 跟上 v1.6.0（含用户关联六字段与 org 模块）。

### 组织中心阶段 1：契约 v1.6.0 + 建表迁移 0007 + 组织管理前后端（2026-09-01）

- **范围**：新模块「组织中心」阶段 1 落地——契约先行（v1.6.0，阶段 1/2 接口一次性定义）、迁移 0007 一次建全 8 张新表 + users 扩展、NestJS 组织管理（depts）、React 组织管理页、菜单 seed 与 i18n。方案经用户评审：5 项决策确认（users 表扩展四字段、岗位不接入权限聚合、富文本选 Tiptap、ECharts+xlsx 阶段 4 引入、模块名保留）；模块显示名最终定为「组织中心」（原 PRD 名「组织与权限中心」太长，调整 i18n `menu.org` 文案 + seed label，菜单结构与路由不变）。
- **契约 v1.6.0**（openapi.yaml 合并自评审草案并删除草案文件，YAML 解析与全量 $ref 校验通过）：新增 Depts / Posts / Directory 三个 tag、14 个接口——`GET /org/depts/tree` 全量树、`GET/POST /org/depts`、`GET/PUT/DELETE /org/depts/{id}`、`PATCH /org/depts/sort`（拖拽整批提交）、岗位 5 个（阶段 2 实现）、`GET /org/directory`（阶段 2 实现）。新增 schema：Dept / DeptTreeNode / Post / DirectoryEntry 等 9 个。删除三级校验 409（`DEPT_HAS_CHILDREN` / `DEPT_HAS_POSTS` / `DEPT_HAS_ACTIVE_USERS`，按序阻断）、防环 `DEPT_PARENT_INVALID`（编辑父级不可为自身/自身后代，含批量排序的组合环检测）、`POST_NAME_EXISTS` / `POST_HAS_ACTIVE_USERS`。
- **数据库（迁移 `drizzle/0007_*.sql`，17 张表）**：新增 `depts` / `posts` / `user_posts` / `notices` / `notice_scopes` / `notice_read_records` / `notice_remind_logs` / `notifications`（后 5 张阶段 3 实现业务）；users 新增 `dept_id` / `employee_no` / `employment_status`（NULL 视为在职）/ `entry_date` 四个可空列。depts↔users 循环外键用 Drizzle 官方 `AnyPgColumn` 惰性回调声明（depts.leader_id → users.id、users.dept_id → depts.id 双向 SET NULL/RESTRICT）。组织/岗位软删 + 部分唯一索引（软删后名称/编码可复用）。
- **后端（`nest/src/modules/org/`）**：DeptsController/Service + 4 个 DTO，tree/sort 静态路由声明在 `:id` 之前防吞。删除三级校验、`loadCounts` 三条 group by 聚合避免 N+1、防环用全量父子映射走链检测（批量排序按「应用全部变更后」的最终状态判环）。操作日志 `dept.create/update/delete/sort`。注意：`GET /org/depts` 分页接口后端已实现但阶段 1 页面未消费（树派生数据源），阶段 2 岗位管理使用。
- **前端（`react/src/features/org/`）**：左树右表布局（对齐 dicts-page 双栏模式）——左栏 `DeptTree` 递归树（展开态用 `Set | null` 表达、null = 全展开默认态；@dnd-kit 同级拖拽，嵌套 SortableContext 共享根部 DndContext，扁平 siblingMap 定位拖拽组，整组重编号 sort = len-1-idx 提交）；右栏选中组织详情卡 + 子组织 DataTable（数据全部由树派生，无第二请求）。`DeptFormDialog`：父级选择用平铺缩进 Select（HeroUI 无 Tree；编辑时自身/后代/停用组织禁选防环），负责人 Select 拉 /users（403 时禁用不阻塞表单）。`useOverlayState` 受控浮层；api-types 追加 Dept/DeptTreeNode 等 7 类型。
- **菜单 seed**：「组织中心」顶级（building-2，sort 2）+「组织管理」子菜单（network，to=/org/depts，常规全量按钮位，无 GRANT）；seed.ts 同步更新。存量库幂等补录脚本 `nest/scripts/migrate-menus-add-org.ts`（按 i18nKey 查重 + super_admin 全量授权）。i18n `menu.org` / `menu.depts` / `menu.pageTitle.*` 与 `features.depts.*` / `errors.depts.*`（zh-CN/en）。
- **验证**：nest tsc / eslint / build 全绿；react tsc / eslint / build 全绿（routeTree 已注册 /org/depts）。**待人工验证**：连接存量库执行 `pnpm db:migrate`（0007）+ `pnpm db:seed` 或 `nest/scripts/migrate-menus-add-org.ts` 后，登录侧边栏出现「组织中心」并完整走一遍组织 CRUD / 拖拽 / 删除校验。
- **同步待办**：阶段 2（岗位管理 + 人员通讯录）→ 阶段 3（公告 + notifications + 顶栏铃铛）→ 阶段 4（架构图谱 ECharts + Excel 导出）；Vue / Next / Nuxt 后续实现组织模块时跟上 v1.6.0（users 表四字段为共享 Schema 变更，各栈建表/类型同步）。

### 个人链接消费端上线：用户管理列改版 + 侧边栏菜单（契约 v1.5.3）（2026-09-01）

- **范围**：个人链接（v1.5.2）的首批消费端——用户管理表格展示与侧边栏用户菜单；契约 v1.5.3 为 AuthUser 补个人链接三字段。
- **契约 v1.5.3**：AuthUser（LoginResponse.user 与 GET /auth/me）新增 `website / githubUsername / xUsername` 只读裸值——侧边栏菜单需要登录态快照携带（v1.5.2 时「刻意不加」的决定因本需求翻转，三个可空短字符串成本可忽略）；管理端 User 契约补 `lastLoginAt` 与个人链接三字段说明（`toView` 剩余展开本就带出）。
- **用户管理表格**：① 去掉独立的头像/姓名/邮箱三列，合并为「用户信息」列（复用 `UserInfo` 组件，头像 + 姓名 + 邮箱次行）；用户名列保留紧随其后；② 新增「最近登录」列（lastLoginAt，从未登录显示 —；**禁用排序**——后端 SORTABLE 白名单不含该列，开启会静默回退按 createdAt 排）；③ 新增「个人链接」列：主页（lucide Globe）/ GitHub / X 图标按钮，悬停 Tooltip 显示名称 + 完整 URL，点击新窗口打开（noopener），全空显示 —；列顺序调整为 用户信息 → 用户名 → 状态 → 角色 → 个人链接 → 最近登录 → 创建时间 → 操作。
- **侧边栏用户菜单**：新增「个人链接」Submenu（Link2 触发项 + SubmenuIndicator），子项图标（Globe / Simple Icons Github/X）+ 名称，点击新窗口打开；三个链接全空时整个子菜单不渲染；「我的账户」保存个人链接后经 applyProfileUpdate 同步 auth-store，菜单即时生效。
- **关键修复（表头全选失效）**：react-aria-components 会在 Table 上下文内给表头 selection 复选框注入 `isDisabled: true`（行复选框不受影响），全选永远点不动。修复：`DataTableSelectAll` 显式 `isDisabled={false}` 覆盖注入。实测：全选只选中可选行（受保护行由 enableRowSelection 排除）、再点取消、批量操作条联动均正常；「全部可选行已选」即呈勾选态（TanStack 语义）。
- **结构调整**：`brand-icons.tsx` 由 `components/common/` 迁至 `lib/`（按用户要求），并按 Simple Icons 惯例补 `GithubIcon` / `XIcon`（lucide 新版已移除品牌图标）；新增共享工具 `lib/profile-links.ts`（裸值拼 URL + i18n labelKey + openExternalLink），用户表 / 侧边栏 / 将来控制台展示共用同一拼接规则。
- **验证**：nest tsc 全绿、openapi YAML 校验通过；react tsc / eslint / test(68) / build 全绿；浏览器实测（独立 3002/5174 环境，验证后已清理）：表头全选/取消、新列布局、链接图标跳转。**待人工验证**：用户登录态下侧边栏菜单与表格展示。
- **同步待办**：Vue / Next / Nuxt 跟进 v1.5.3（AuthUser 三字段）与用户管理/侧边栏展示。


- **范围**：我的账户上线后两轮验收调整；契约 v1.5.1（DELETE /account/avatar）与 v1.5.2（个人链接三字段），users 表迁移 0005/0006 均已对 Supabase 执行。
- **严重 bug 修复（裁剪偏移）**：`crop-image.ts` 的 `putImageData` 偏移量符号写反，保存头像与裁剪框区域不一致（只显示图片右下角）。已按 react-easy-crop 官方 safeArea 算法修正，并用「蓝底 + 中央黄色矩形」测试图实测裁剪一致性。
- **契约 v1.5.1 删除头像**：`DELETE /account/avatar`——置空 `users.avatar` 并按现有 URL 尽力删除 Storage 对象（`AvatarStorageService.removeObject` 失败仅记日志不阻断），返回最新 AccountProfile；前端头像卡有头像时显示删除按钮（danger-soft），删除中按钮转 Spinner 并禁用「更换头像」。
- **契约 v1.5.2 个人链接**：`AccountProfile` / `PUT /account/profile` 新增 `website`（裸域名，可带路径）/ `githubUsername` / `xUsername`（平台用户名裸值），存裸值、展示前缀（`https://`、`https://github.com/`、`https://x.com/`）由前端统一拼接——前缀规则变更零迁移。DTO 以 `@Transform` 自动剥离粘贴的完整链接前缀（X 兼容 twitter.com），剥离后空串归一 null（= 清空）；校验：域名（可带端口/路径）、GitHub 1-39 位、X 4-15 位。管理端 User 视图经 `toView` 剩余字段展开自动带出（契约补只读说明）；`AuthUser` 刻意不加（避免每请求快照变胖）。
- **前端页面重构**：五卡拆分为独立组件（`features/account/cards/`：avatar / profile-form / profile-links / email-form / password / account-info），页面只剩数据加载 + Tabs 编排；Tabs 分「账号」（头像/基本信息/个人链接/账号信息）与「安全」（邮箱/密码）两组，带 lucide 图标；加载态由 Spinner 改为模拟卡片布局的骨架屏（HeroUI `Skeleton`）。
- **新增组件**：`PasswordStrength`（新密码 5 档强度：长度 ≥8/≥12 + 大小写/数字/符号维度，<6 位直接极弱，未输入不渲染）；`ProfileLinksCard`（`InputGroup.Prefix` 固定前缀输入 + `Suffix` 预览按钮——点击按提交同款剥前缀规则拼 URL 新窗口打开，空值禁用）；所有密码框统一换共享 `PasswordInput`（内部 InputGroup 补 `variant="secondary"`）。
- **Radix Avatar 状态残留 bug（重要机制结论）**：HeroUI Avatar 底层是 Radix Avatar，Fallback 显隐由 Root 内部记录的图片加载状态决定，`Avatar.Image` 卸载后状态残留 loaded → Fallback 永不显示（表现为删除头像后侧边栏不同步、需刷新）。修复：`UserInfo` 与头像卡的 Avatar 均加 `key={avatar ?? "fallback"}` 强制重建子树。已沉淀至 AGENTS §19；凡「avatar 从有值变 null」的场景都必须重建 Avatar 子树。
- **其他修复**：i18next 插值必须 `{{var}}` 双花括号（首版单花括号致 aria-label 原样输出）；全部保存/更新按钮统一 `size="sm"`；`Card.Title` 统一加粗；裁剪弹窗上传按钮加 Upload 图标、上传中禁用「取消」。
- **验证**：nest tsc / eslint 全绿；react tsc / eslint / test(68) / build 全绿；后端 curl 冒烟（链接剥前缀/部分更新保留/null 与空串清空/非法值 400、删除头像后 Storage 对象 404）。裁剪一致性、删除头像、骨架屏、密码强度、个人链接卡均经浏览器验收（用户自验通过）。**待人工验证**：存量库执行迁移 0005/0006 + `pnpm storage:init` 的部署步骤。
- **同步待办**：Vue / Next / Nuxt 后续实现 account 模块跟上 v1.5.2（含 AuthUser `avatar/phone/tags` 与个人链接三字段）；个人链接的控制台展示随 Dashboard 迁移一并做。


- **范围**：React 端「我的账户」（`/account` 非菜单路由，占位替换为真实页面）；配套契约 v1.5.0（Nest 先行）+ users 表新增 3 列 + Supabase Storage 头像上传（AGENTS §5 首次豁免：Storage 仅用于用户头像，服务端持密钥中转，浏览器不接触密钥、不用 RLS）。方案经用户逐项确认：Storage 中转、改邮箱需当前密码、新增 `phone` / `tags` / `lastLoginAt`、接受 `react-easy-crop` 与 `@supabase/supabase-js` 两个新依赖。
- **契约 v1.5.0**（`nest/openapi/openapi.yaml`，YAML 解析通过）：新增 Account tag 与 5 个自助端点——`GET/PUT /account/profile`（displayName / phone / tags，tags 服务端 trim、去空、去重，≤10 个×20 字符）、`PUT /account/email`（需 currentPassword，冲突 409 `EMAIL_EXISTS`）、`PUT /account/password`（需 currentPassword，成功后 tokenVersion+1 + 清空托管 refreshToken，全端强制下线）、`POST /account/avatar`（multipart，白名单 webp/png/jpeg、≤2MB，`AVATAR_FILE_INVALID` / `AVATAR_FILE_TOO_LARGE` / `AVATAR_UPLOAD_FAILED`）。AuthUser 视图新增 `avatar / phone / tags`；`GET /auth/me` 的 data 契约由 `LoginResponse` 纠偏为 `AuthUser`（实现一直如此）；管理端 User 视图补 phone / tags 只读展示。Account 模块仅挂 `AuthGuard('jwt')` 不走 PermissionsGuard（自助操作不依赖权限位）。
- **Supabase 新 API key 体系**：使用 `sb_secret_`（Secret key，非 JWT），环境变量 `SUPABASE_URL` + `SUPABASE_SECRET_KEY`（`.env.example` 已补说明；旧 service_role JWT key 2026 年底废弃）。关键约束：新 key 只能走 `apikey` 请求头（`Authorization: Bearer` 会被当 JWT 拒绝）；supabase-js 同时设置两者（值相等时允许）故天然兼容。bucket `avatars`（public read）由 `pnpm storage:init`（`nest/scripts/init-storage.ts`，幂等）创建，已执行。头像文件名 `{userId}.{ext}` 同名覆盖（每用户一张），返回 URL 带时间戳查询参数穿透缓存。
- **后端**（`nest/src/account/`）：`AccountService`（profile 读写 / email / password / avatar）+ `AvatarStorageService`（类型白名单与大小校验、upsert 上传、URL 拼时间戳）；邮箱唯一性复用部分唯一索引冲突转译（同 users.service 模式）；`auth.service.login` 成功后写 `lastLoginAt`。DB 迁移 `drizzle/0005_*.sql`（users 加 `phone` / `tags text[]` / `last_login_at`，全部可空增量列）已对 Supabase 库执行。
- **前端**（`react/src/features/account/`）：页面 max-w-2xl 居中五卡布局（头像 / 基本信息 / 修改邮箱 / 修改密码 / 账号信息只读：角色 chips、状态、注册时间、最近登录）。头像裁剪弹窗 `react-easy-crop`（缩放 Slider + ±90° 旋转）→ canvas 合成 256×256 WebP（`crop-image.ts`，toBlob 不支持 webp 时自动回退 PNG）→ FormData 上传；裁剪产出已实测为 webp。`TagInput` 自定义组件（HeroUI 无 TagInput；回车添加、Backspace 删除末项、Chip 可移除、内联超限提示）。保存 / 头像更新后经 `setQueryData` + `setUser` 同步详情缓存与 auth-store 快照（侧边栏头像与名称即时刷新）；改密码成功后 `clearSession()` + 整页跳 `/sign-in`。i18n 键 `features.account.*` / `errors.account.*`（zh-CN / en 双语，locales 测试通过）；i18next 插值必须用 `{{var}}` 双花括号（首版单花括号导致 aria-label 原样输出，已修）。
- **验证**：nest tsc / eslint 全绿；react tsc / eslint / test(68) / build 全绿。后端 curl 冒烟：profile 读写（tags 3→2 去重）、email / password 错密码 `CURRENT_PASSWORD_INCORRECT`、头像上传（URL 公开可访问、类型与超限 400）。浏览器联调（IAB evaluate 注入 File 绕过原生文件选择器）：登录 → 页面渲染 → 标签添加保存并刷新持久 → 旋转 + 裁剪上传成功且侧边栏头像即时同步 → 改邮箱错密码 toast 正确。**待人工验证（需登录态）**：真实头像上传全流程、改邮箱全量成功路径、改密码后重新登录（本会话即刻失效）。
- **同步待办**：Vue / Next / Nuxt 后续实现 account 模块直接跟上 v1.5.0（含 AuthUser 三字段与 `lastLoginAt`）；Render 部署需补 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` 两个环境变量并执行 `pnpm storage:init`（或手动建 bucket）。

### 日志管理模块上线：操作人摘要 + 批量删除 + 字典驱动类型（契约 v1.4.8）（2026-08-31）

- **范围**：React 端最后一个待迁移业务模块「日志管理」（`/settings/logs` 路由占位替换为真实页面）；配套契约 v1.4.8（Nest 先行）。需求对齐结论：详情用 Drawer、需批量删除、类型走字典管理、操作人列「头像 + 名称 + 邮箱」。
- **事实修正（调研发现）**：① `operation` 类型并非预留空枚举——users / roles / menus / dict 四模块的写操作均以 `type='operation'` 私有 `writeLog` 记日志（各模块重复实现同一模式），四类日志都有真实数据；② AGENTS §4.6 迁移表中「日志管理对应 `/react-shadcn` `logs/` 源」与实际不符——`/react-shadcn` **无日志页实现**（仅侧边栏菜单项与 api 类型），本期按用户管理页风格新设计，表格已同步修正。
- **契约 v1.4.8**（`nest/openapi/openapi.yaml`，YAML 解析通过）：Log schema 新增操作人摘要 `username / displayName / email / avatar`（均可空）；新增 `DELETE /logs?ids=` 批量删除（`BATCH_DELETE` 权限，任一 ID 无效整体 400 `INVALID_OPERATION`，全有全无语义对齐 `DELETE /users?ids=`）；登录 / 每请求鉴权共用用户视图（`LoginResponse.user` 与 `GET /auth/me`）新增 `email` 字段（评审要求侧边栏统一展示邮箱，此前 AuthUser 无邮箱、次行展示的是用户名）。
- **后端**（`nest/src/modules/logs/`）：`logs.service` 列表 / 详情 left join users 返回操作人摘要（**软删除用户仍回显**——日志是历史记录，`user_id` 仅在硬删时经 FK `set null` 置空）；`batchRemove` 全有全无校验；`remove` / `batchRemove` 补写 operation 日志（`log.delete` / `log.batch_delete`，沿用各业务模块私有 `writeLog` 惯例）；controller 增加 `operatorId(req)` 取操作者（对齐 users.controller）。`auth.service` 用户视图（`AuthUser`）补充 `email`。
- **日志定时清理**（评审确认：全部类型统一保留 30 天，每日北京时间 03:00）：新增 `LogCleanupService`（`@nestjs/schedule` v12，`ScheduleModule.forRoot()` 挂 AppModule），分批删除（批 1000 条，先取 ID 再 `inArray` 删，`logs_created_idx` 支撑扫描），成功写一条 operation 日志（`log.cleanup`，系统任务无操作人 userId=null 属预期）。环境变量：`LOG_CLEANUP_ENABLED`（默认开）/ `LOG_CLEANUP_CRON`（默认 `0 3 * * *`，TZ 固定 Asia/Shanghai）/ `LOG_RETENTION_DAYS`（默认 30，非法值回退），已补 `.env.example`。契约零改动、不新增 API 端点。**待人工验证**：临时改 `LOG_CLEANUP_CRON` 观察执行日志与 `log.cleanup` operation 记录。
- **前端——UserInfo 通用组件**（`components/common/user-info/`）：统一「左侧 Avatar（有 avatar 用图片，否则名称首字 fallback）+ 右侧名称（displayName 缺省回退 username）+ 下方邮箱小字」格式；`user` 传 null 显示占位符 —；subtitle 支持 email（默认，缺省回退 username）/ username（侧边栏，AuthUser 无邮箱）。侧边栏底部用户区触发器展开态与弹层头部已替换复用（折叠态保留独立头像），日志操作人列与详情抽屉同用。
- **前端——features/logs**：完全对齐用户管理页模式（`createListStore` + `useListQuery` + DataTable Toolbar/BulkActions + `useOverlayState` + ConfirmDialog）。差异点：列表固定 `created_at` 倒序（后端不支持排序参数）**无排序交互**；无新增入口（系统自动写入，只读 + 人工清理）；列序为操作人在类型前（评审调整）；类型筛选与类型 Chip 显示名以**字典管理 `log_type` 为真源**（value 限于契约四枚举，字典项 i18nKey 翻译优先回退 label）；字典不可用（当前用户无字典 SEARCH 位 / 加载失败）时**静默降级**内置 `dict.log_type.*` 文案——为此新建 `i18n/locales/{zh-CN,en}/dict.json` 并注册进 `config.ts`（`log_type` 与 `user_status` 的 DB i18nKey 此前均无前端语言包键）；详情 Drawer 直接复用列表行数据（列表/详情同构，免二次请求）；批量删除 ConfirmDialog 沿用 keyword=`DELETE` 强确认；**单条 / 批量删除成功后均 `table.resetRowSelection()`**（删除后行不在当前页但勾选 state 残留旧行 ID，表头全选框会误判保持勾选——评审反馈修复）。
- **验证**：nest tsc / eslint 全绿；react tsc / eslint / test(68，含 i18n 双语键对齐) / build 全绿。**待人工验证（需登录态）**：四类日志筛选与字典文案、操作人头像列、详情抽屉、单条/批量删除、`BATCH_DELETE` 位缺失时按钮隐藏（存量库注意先执行 `nest/scripts/migrate-menus-add-grant-bit.ts` 补 GRANT 位）。
- **同步待办**：Vue / Next / Nuxt 后续实现日志模块直接跟上 v1.4.8；`GET /logs` 的 `search` 仅匹配 action、不支持按操作人搜索，如需扩展再评估契约。

### 错误页改为独立跳转页：403 / 404 / 500 统一 replace 跳转（2026-08-30）

- **背景**：错误页（`ErrorPageShell` 毛玻璃卡片 + 巨字光晕）样式按**独立全屏页**重新设计后，admin-layout 把 403 组件直显在主体区的旧方案观感不符（卡片挤在内容区、与全屏设计稿差异大），评审决策改为统一跳转独立路由页。
- **设计决策变更（v2，推翻原记录）**：原决策「无权访问时 URL 不变、主体区直显 403、侧边栏保留」废弃；新决策为 **403 / 404 / 500 一律 replace 跳转独立页**（`/403` `/404` `/500`，均位于 admin 布局之外、全屏渲染）。后果已确认接受：离开布局即无侧边栏 / 顶栏 / 多标签页，返回靠错误页按钮或浏览器后退（replace 保证后退不回到无权路径）。
- **实现**（React）：
  - `admin-layout.tsx`：无权分支改为菜单就绪后在 effect 中 `navigate({ to: "/403", replace: true })`；过渡帧沿用 loading 覆盖层避免无权内容闪现；**跳转前撤销 TagsBar 已误登记的无权路径标签**（TagsBar 的 `openPath` effect 子组件先执行，会先把当前路径入栈）；loading / 菜单校验失败仍走 overlay（KeepAliveOutlet 池保持挂载），仅 403 移出。
  - `routes/__root.tsx`：`notFoundComponent` / `errorComponent` 由直挂组件改为跳转中转组件（`NotFoundRedirect` / `ServerErrorRedirect`），replace 跳转 `/404` / `/500`，带循环守卫（目标页自身触发时直接渲染）。`/500` 路由页已存在（阶段1 i18n 提交中创建），本次补齐入口。
  - 500 重试语义保留：出错 URL 经 history state（`from`）随跳转携带，`GeneralErrorPage` 的「重试」优先回原 URL 重新渲染（错误边界随路由卸载重置），直接访问 `/500` 时退化为整页刷新。`HistoryState` 为空接口且 `@tanstack/history` 非直接依赖无法模块扩充，读写两端以 `HistoryState` 断言 / `ErrorRedirectState`（`router.ts`）收窄。
- **验证**：react tsc / eslint（改动文件全净，users 模块 3 个存量警告不属本次）/ test(68) / build 全绿。**待人工验证（需登录态）**：普通用户直输无权 URL → 跳 /403 且标签无残留；错误 URL 404 跳转；渲染异常跳 /500 后「重试」回原页。

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
- 落地明细（2026-09-12 自 `ui-spec.md` §19 迁入，原文为 Phase 1B 审查记录）：品牌化涉及 `index.html`、`src/assets/`、`src/styles/theme.css`（站点标题/描述/OG、Logo、favicon、主色与图表色 token）；Sidebar 调整涉及 `sidebar-data.ts`、`app-sidebar.tsx`（TeamSwitcher → AppTitle、菜单按 ui-spec §3.2 规划、清理 Demo 项）；Layout 调整统一 Header 操作区顺序、清理演示导航；页面规划按 ui-spec §1.3 建立业务路由骨架与占位页；规范化收尾为全局颜色/字号/间距按 ui-spec 对齐。

### Phase 1A：React + Shadcn Admin 基础建设（已完成）

- React（`/react`）基于官方 Shadcn Admin v2.2.1 初始化完成。
- UI 基础建立：Layout / Sidebar / Header / Theme / Dark Mode / shadcn/ui 组件可用。
- `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` 已实测通过，项目可独立运行。
- 未接入 NestJS、数据库、真实认证与 RBAC；当前页面为官方 Demo 与 Mock 数据。

---

## 附：待确认项决策记录（2026-09-05 评审定稿）

> 三端排查报告中的「待确认」项，经评审后定案如下。本章节为决策存档，追加于文件底部，不随时间线倒序调整。

| 项 | 决策 | 落点 |
| --- | --- | --- |
| refresh 并发重放短窗口双活 | ❌ 不修，记录在案（触发条件苛刻，ROI 极低） | 无代码改动；Next proxy 已有并发去重缓解 |
| `GET /menus`（侧边栏）过滤 enabled=false | ✅ 已实现，保持现状 | `buildAllowedMenuIds` 等 |
| `GET /menus/tree`（管理页）过滤 enabled=false | ✅ 保持现状（不过滤，契约未承诺） | 无代码改动 |
| dict label 不设唯一 | ⚠️ 原决策推翻：同一 type_code 下 label 唯一 | `dict_items_type_label_unique` 索引（drizzle 0009）；409 `DICT_ITEM_LABEL_EXISTS` + 前端 i18n 映射 |
| 删除公告保留 read_records | ✅ 接受（审计数据需要），保持现状 | 无代码改动 |
| 改密码无「新旧相同」校验 | 方案 C：新旧相同时不 bump tokenVersion，静默成功 | `account.service.updatePassword`（`bcrypt.compare` 命中即幂等返回，仅记审计日志） |
| /settings 空壳页 Next 端缺失 | ❌ 忽略（父级分组 to=''，正常导航不可达，无业务价值） | 无代码改动 |

**实施与验证**：
- dict label 唯一：drizzle 迁移 `drizzle/0009_sudden_khan.sql` 已生成并在 Supabase 工作库应用（`pg_indexes` 核对三索引齐全），重跑幂等；两端 dict-api 补 `DICT_ITEM_LABEL_EXISTS` → `errors.dict.labelExists` 映射（×4 语言包）。
- 改密码静默成功：API 冒烟 7/7——新旧相同 200 且会话不被踢、原密码仍可登录；真实改密后旧 token 401、新密码可登录。
- EXPORT 门控：GET /permissions 含 EXPORT(512)；角色授权含/不含 512 时通讯录菜单 userPermissions 位掩码随授权变化（API 冒烟 6/6）。
