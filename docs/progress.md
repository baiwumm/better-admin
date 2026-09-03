# Better Admin 阶段性进度记录

> 本文件记录各阶段 / 模块的完成情况、关键决策与已知限制，**只做记录，不写规则**；硬性规则见 [`AGENTS.md`](../AGENTS.md)，机制结论沉淀见 [`mechanisms.md`](mechanisms.md)。
> **新条目追加在最上方（按时间倒序）**；条目中引用的 § 章节号（如 §7.2）指 `AGENTS.md` 对应章节，`§x.y` 指对应设计文档自身章节。

---

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

### Phase 1A：React + Shadcn Admin 基础建设（已完成）

- React（`/react`）基于官方 Shadcn Admin v2.2.1 初始化完成。
- UI 基础建立：Layout / Sidebar / Header / Theme / Dark Mode / shadcn/ui 组件可用。
- `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm lint` 已实测通过，项目可独立运行。
- 未接入 NestJS、数据库、真实认证与 RBAC；当前页面为官方 Demo 与 Mock 数据。
