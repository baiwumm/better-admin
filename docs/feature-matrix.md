# 功能矩阵 — 跨技术栈功能对齐状态

> 本文件记录 Better Admin 各功能模块在四种前端实现中的完成状态。
> **每次新增功能或完成模块迁移时，必须同步更新本文件。**

***

## 状态标记

- ✅ 已完成（功能上线）

- 🔧 开发中

- ❌ 未实现

- ⬜ 不适用（该技术栈无需实现）

***

## 核心业务模块

| 模块                | React | Next.js | Vue | Nuxt | NestJS API | 备注                                        |
| ----------------- | ----- | ------- | --- | ---- | ---------- | ----------------------------------------- |
| 认证（登录/登出/刷新/me）   | ✅     | ✅       | ✅   | ❌    | ✅          | Next.js 用 httpOnly Cookie，其余 Bearer Token；Vue M1 冒烟验收通过（登录/守卫/会话恢复/401 刷新/整页跳转） |
| 我的账户（资料/邮箱/密码/头像） | ✅     | ✅       | ✅   | ❌    | ✅          | 含头像裁剪、Supabase Storage 中转；**契约 v1.8.0 密码策略**（8-20 位 / 字母+数字 / 禁空白 / 不含用户名 / 不与原密码相同报错）四端 + NestJS 已对齐；Vue M3（2026-09-11）落地并 GUI 冒烟通过：双 Tab（账号/安全）+ 6 卡、vue-advanced-cropper 裁剪 256×256 WebP 上传闭环（改资料/头像后 auth-store 快照同步侧边栏）、改密卡走 lib/password-validation 预检 + PASSWORD_SAME_AS_OLD 后端兜底、改密成功清会话跳登录 |
| 用户管理              | ✅     | ✅       | ✅   | ❌    | ✅          | CRUD + 状态 + 重置密码 + 批量删除；Vue M1 已落地并冒烟验收通过（列表三态/epoch/写保护/表单/授权表单含组织关联）；**契约 v1.8.0 密码策略**（新建初始密码 / 重置密码同「我的账户」口径）NestJS + React + Next + Vue 已对齐；v1.7.3 表单长度约束 + 字数统计三端已对齐  |
| 角色管理              | ✅     | ✅       | ✅   | ❌    | ✅          | CRUD + 菜单授权 + super\_admin 保护；Vue M1 已落地并冒烟验收通过（code 锁定 / 授权抽屉勾选模型） |
| 权限管理（只读）          | ✅     | ✅       | ✅   | ❌    | ✅          | 位掩码枚举字典；Vue M1 已落地并冒烟验收通过（前端过滤只读列表）                   |
| 菜单管理              | ✅     | ✅       | ✅   | ❌    | ✅          | 树形 CRUD + add-child + 搜索；Vue M1 已落地并冒烟验收通过（expanded 模型初始全展开、addChild 锁父级 / edit 防环） |
| 字典管理              | ✅     | ✅       | ✅   | ❌    | ✅          | 类型 + 项双栏 CRUD；Vue M1 已落地并冒烟验收通过（选中类型派生自回退、保存回填业务字典缓存）  |
| 日志管理              | ✅     | ✅       | ✅   | ❌    | ✅          | 列表 + 详情 + 批量删除；Vue M1 已落地并冒烟验收通过（类型筛选以字典 log\_type 为真源、内置枚举降级） |
| Dashboard 概览      | ❌     | ❌       | ❌   | ❌    | —          | 各端均未实现                                    |

## 组织中心模块

| 模块           | React | Next.js | Vue | Nuxt | NestJS API | 备注                                                                                                               |
| ------------ | ----- | ------- | --- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 组织管理         | ✅     | ✅       | ✅   | ❌    | ✅          | 左树右表 + 拖拽排序；Vue M2 已落地并冒烟验收通过（vue-draggable-plus 同级拖拽整组重编号、关键词确认删除、负责人滚动加载选择）                                     |
| 岗位管理         | ✅     | ✅       | ✅   | ❌    | ✅          | CRUD + 成员穿透；Vue M2 已落地（DeptTreeSelect 筛选 / UForm+zod 表单 / 在职人数穿透抽屉）；2026-09-09 GUI 冒烟验收通过 |
| 人员通讯录        | ✅     | ✅       | ✅   | ❌    | ✅          | 组织树筛选 + 服务端分页；Vue M2 已落地（?deptId= URL Query 双向同步 / EXPORT 位门控）；2026-09-09 GUI 冒烟验收通过 |
| 公告管理         | ✅     | ✅       | ✅   | ❌    | ✅          | 富文本 + 范围选择 + 定时 + 撤回 + 催读；Vue M2 已落地（Tiptap 富文本 / 三粒度范围 / 已读人员头像堆叠列 / 已读未读名单 / 一键催办）；2026-09-09 GUI 冒烟验收通过 |
| 我的公告         | ✅     | ✅       | ✅   | ❌    | ✅          | 左列表右详情（URL `?noticeId=` 驱动选中）、阅读状态筛选 + 标题搜索 + 分页、置顶标签、UserInfo 发布人、进详情记已读；Vue M2 已落地；2026-09-09 GUI 冒烟验收通过 |
| 站内信通知        | ✅     | ✅       | ✅   | ❌    | ✅          | 铃铛 + 未读数 + 已读；详情 `/org/notices/:id` 登录可达（消费路由，不走菜单权限）；Header 固定「未读/全部」筛选 + 类型图标 + 未读点 + 「查看我的公告」；Vue M2 已落地（UChip 红点 + 60s 轮询）；2026-09-09 GUI 冒烟验收通过 |
| 架构图谱         | ✅     | ✅       | ✅   | ❌    | —          | 只读可视化（平移/缩放/Fit View/折叠展开），复用组织树接口；Vue M2 已落地（@vue-flow/core + 手写树布局平移 + useColorMode 暗色）；2026-09-09 GUI 冒烟验收通过 |
| 通讯录 Excel 导出 | ✅     | ✅       | ✅   | ❌    | —          | write-excel-file 触发时动态加载，串行分页批量（total 优先超限拦截，上限 10000）；企业级样式（品牌蓝表头 / 斑马纹 / 状态高亮 / 冻结首行）；Vue M2 已落地（与 React 端同源逻辑平移） |

## 基础设施

| 模块                | React | Next.js | Vue | Nuxt | 备注                                |
| ----------------- | ----- | ------- | --- | ---- | --------------------------------- |
| 全站 i18n（zh-CN/en） | ✅     | ✅       | ✅   | ❌    | Vue M0：vue-i18n（messageResolver 扁平键）+ 复用 react locales；M1 冒烟验收通过 |
| 主题系统（明暗模式）        | ✅     | ✅       | ✅   | ❌    | Vue M0：Nuxt UI 默认 Design Tokens + @vueuse/core useColorMode；M1 冒烟验收通过 |
| 偏好设置抽屉             | ✅     | ✅       | ✅   | ❌    | 9 项：主题色（含随机换色 + Black 黑白主题）/ 模式 / 色彩模式（正常/灰色/色弱）/ 动画方向 / 路由动画（9 预设）/ 速度 / 圆角 4 档 / 多标签页显隐 / 重置；Vue M3（2026-09-10）全项补齐并 GUI 冒烟通过：主题色 = Tailwind 17 色板运行时覆盖 `--ui-color-primary-*` + Black 覆盖 `--ui-primary`（随明暗重算）、圆角按 Nuxt UI 标度 0/0.125/0.25/0.5rem、design-theme-store 单一真源 + `app.mount` 前恢复；Next 端路由动画 2026-09-11 起真实生效（见「路由过渡动画」行，此前选择器无消费者）；路由动画 / 多标签页开关的实际编排接入见对应行 |
| 多标签页              | ✅     | ✅       | ✅   | ❌    | Vue M3（2026-09-11）落地并 GUI 冒烟通过：tabs-model 纯函数与 32 用例原样平移、Pinia tabs-store（sessionStorage 持久化 + 标题快照）；TagsBar（固定控制台 / 关闭热区 / 中键关闭 / UContextMenu 六动作 / 横向滚动 mask+chevron+滚轮+拖拽 / 进场动画）；KeepAliveOutlet = 原生 `<KeepAlive :include :max=10>`，include = 已打开标签 ∩ 菜单 keepAlive（关闭即销毁），刷新 = key 序号重挂载 + include 摘一拍清旧缓存；显隐开关已接偏好；页面切换 VT 编排（2026-09-11）已落地：beforeResolve/afterEach 编排（真旧帧 → 提交 → 新帧）、data-route-vt 门控、按菜单层级深度的导航方向感知（data-rt-direction 反转位移类动画）、标签刷新复用同套 VT |
| DataTable 列设置        | ✅     | ✅       | ✅   | ❌    | 可见性勾选 + 拖拽排序（`column-setting:{userId}:{routePath}` 持久化，两端互读）；Vue M3（2026-09-11）回收并 GUI 冒烟通过：DataTableViewOptions（UPopover + useSortable 手柄拖拽）+ column-setting 纯函数（v1 旧格式兼容，9 用例）、页面级 table 实例 columnVisibility/columnOrder 经 DataTable v-model 桥接 UTable；10 个列表页全量接入（MenusPage 影子实例模式） |
| 命令面板              | ✅     | ✅       | ✅   | ❌    | Vue M0 接 UDashboardSearch；M3（2026-09-11）对齐 React 端 command-menu：菜单树按顶层分组拍平（多级显示「父级 › 页面」）+ searchText 键（祖先链/分组名可被搜索）+ 快捷链接组 + 自建主题组（走 design-theme-store 带揭示动画，关闭内置 colorMode 组） |
| 错误页（403/404/500）  | ✅     | ✅       | ✅   | ❌    | 四端统一跳转独立全屏页（React 2026-09-09 回滚直显改造对齐 Next/Vue）；Vue M0：全屏错误页 + catch-all 404；2026-09-09 Vue 同步 React Result 风格（ant-design 插画 + ResultPage 结构，替代纯文本大数字壳）。**四端登录要求已统一（2026-09-11）**：`/403` `/404` `/500` 均要求登录（未登录 → `/sign-in?redirect=<原路径>`），Vue 端此前登记在 `PUBLIC_PATHS` 中匿名放行、本次按 React `beforeLoad` / Next `proxy.ts` 口径对齐——`PUBLIC_PATHS` 收敛为仅登录页，另立 `FULLSCREEN_PATHS`（登录页 + 错误页）承担「不套 AdminLayout」判定，两个维度解耦（机制见 `mechanisms.md` §16.5）；Vue 端文档标题补齐（`errors.*.title`，与 React `staticData.titleKey` 同键） |
| 异常页菜单（/exception/*） | ✅     | ✅       | ✅   | ❌    | 错误页 Result 风格的菜单化展示（embedded 撑满主体区，FULL_WIDTH 白名单），菜单数据配置于 sys_menus（超管免授权可见）；Vue 2026-09-09 已对齐（(authenticated)/exception/* 三页 + AdminLayout 全宽白名单 + 文档标题键） |
| 路由权限守卫            | ✅     | ✅       | ✅   | ❌    | React: KeepAlive / Next: proxy.ts / Vue M0: 全局 beforeEach 三层；M1 冒烟验收通过 |
| 路由过渡动画            | ✅     | ✅       | ✅   | ❌    | 9 预设 + 3 档速度 + 方向反转 + reduced-motion 降级，偏好设置驱动（route-transition/rt-speed）。React：手动 startViewTransition + displayedPath 双缓冲（main-content 具名组 + data-route-vt 门控）；Next（2026-09-11 落地）：React `<ViewTransition>`（experimental.viewTransition）包 admin-shell 的 `<main>`，导航即 Transition 自动触发 update，class 选择器 `.rt rt-<id>` 消费，`lib/route-direction.ts` 在 6 个导航入口写方向标记，标签刷新经 startTransition 重播，主体区滚动回顶；**Next 动画参数 2026-09-11 与 React 同源对齐**（位移收敛 + 进出场分时，仅选择器形态不同，见 mechanisms §0.1）；Vue：lib/route-vt + KeepAliveOutlet 编排。浏览器前进/后退按钮无方向信号为三端一致的已知边界 |

## 已知架构差异（非功能缺失）

| 差异项   | React                     | Next.js         | 说明                     |
| ----- | ------------------------- | --------------- | ---------------------- |
| 路由缓存  | KeepAlive（Activity + LRU） | 不支持             | 架构限制，非 bug             |
| 认证传输层 | localStorage + Bearer     | httpOnly Cookie | 设计决策不同，API Contract 一致 |

***

## 统计

| 技术栈     | 已完成 | 未完成 | 完成率 |
| ------- | --- | --- | --- |
| React   | 26  | 1   | 96% |
| Next.js | 26  | 1   | 96% |
| Vue     | 26  | 1   | 96% |
| Nuxt    | 0   | 27  | 0%  |

> 统计口径（2026-09-11 按行校正）：核心业务模块 9 项 + 组织中心 8 项 + 基础设施 10 项（含「路由过渡动画」行）= **27 项**（Dashboard 计入核心业务模块）。此前"23 项"的表述与表格实际行数不符（基础设施实为 10 行而非 6 行），本次按行修正，各端完成率随之重算。
> 上表不含"已知架构差异"行。
> Vue 端：M0（2026-09-05）工程基建与骨架；M1（2026-09-06）六模块 RBAC 冒烟验收通过；M2（2026-09-08）组织中心 8 项全量落地（2026-09-09 GUI 冒烟验收全部通过）；M3（2026-09-11）偏好设置补齐 / 多标签页 + 页面切换 VT / DataTable 列设置 / 我的账户 / 命令面板对齐；M4（2026-09-11）文档收尾 + 本地冒烟通过——27 项中 26 项完成、仅剩 Dashboard；**Vercel 部署与线上冒烟由用户手动执行**。M4 冒烟另发现并修复 4 项缺陷，清单与根因见 `docs/progress.md` 置顶条目。方案见 `docs/vue-plan.md`。

