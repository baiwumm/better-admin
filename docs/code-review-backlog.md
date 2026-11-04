# 代码审查 Backlog：行为级未修项（2026-09-06 审查）

> 2026-09-06 只读审查的**属性级问题（性能 P1/P2 + 无障碍 P1/P2）已全部修复**并入库，记录见 `progress.md` 当日条目。
> 本文件保留**行为级**项与属性级不可行项——修复涉及交互逻辑变更（违反「功能不变」约束），需单独决策评估。
> **2026-09-12 经用户拍板执行一批键盘可达性修复（#1 / #2 / #4），#5 经核实四端行为已一致销项**，状态见各条。

## 【已修复】2026-09-12 批次

1. ✅ **#1 标签关闭热区键盘关闭**（react / next / vue 三端）：关闭 span 补 `tabIndex={0}` +
   Enter / Space 关闭（`stopPropagation` 隔离外层 react-aria Button 键盘 press，防误切页）+
   focus-visible 焦点环（react / next 用 `ring-focus`，vue 用 `ring-accented`，对齐各自技术栈焦点惯例）。
2. ✅ **#2 组织树键盘拖拽**（react / next）：dept-tree 拖拽把手本就可聚焦且把手内无子交互元素
   （与列设置手柄同构），直接复用 KeyboardSensor 先例（`data-table-view-options`）+
   `sortableKeyboardCoordinates`——把手聚焦后 Space / Enter 拾起、方向键移动、Space / Enter 落下、
   Esc 取消。**Vue 端 sortablejs 无键盘能力，与标签键盘排序同性质，记为已知差异**（见 feature-matrix）。
3. ✅ **#4 标签菜单键盘入口**（react / next / vue）：Shift+F10 对聚焦标签打开右键菜单——
   react / next 把既有状态驱动菜单拆出 `openContextMenuAt(x, y, path)`，以标签元素中心为锚打开；
   vue 端 reka ContextMenu 无受控 open，经合成派发 contextmenu 事件走「标签 →
   `@contextmenu.capture` 记录目标 → ContextMenuTrigger」同一条原生冒泡链路（浏览器冒烟若发现
   reka 拒绝合成事件则回退为记已知差异）。

## 【已修复】2026-09-14

1. ✅ **菜单声明 0 位的页面对普通角色不可见**（nest / next / nuxt 三处服务端，Playground Phase A 发现、
   用户拍板根治）：`buildAllowedMenuIds` 原带 `role_menus.permissions != 0` 过滤，而四端授权抽屉勾选
   菜单写入的是菜单声明位（`node.permissions || "0"`），导致 0 位纯展示页（异常页 / 演示场）即使在
   角色管理中勾选也不可见。修复为**「有 role_menus 关联记录即可见」**（与 `database-design.md` §1.5
   步骤 2 原设计一致，实现层的 `!= 0` 属偏离）：三端同款删除该过滤；安全前提已核实——四端授权抽屉的
   载荷只含勾选节点（React / Next `isNodeSelected`、Vue / Nuxt `use-grant-tree` 同口径），未勾选项不产生
   记录。Playground 页面随之回到 0 位（脚本与库已同步），异常页三子页无需改库即修复。

## 【已修复】2026-11-04

1. ✅ **website 四条 lint 告警清零**（2026-11-03 website 首次接入 lint 时暴露；2026-11-04 修复，提交 `fix(website): 清理既有 lint 告警`）：
   - `components/background/light-ray.tsx` 两处 `no-console`：核实为 WebGL 渲染失败 / 清理异常的运行时上报（**非调试残留**），故保留 `console.warn`，加 `eslint-disable-next-line no-console` 与原因注释——渲染失败后不再调度下一帧、清理异常仅在卸载时触发，均只输出一次，**不静默吞错**。
   - `components/landing/footer.tsx:71` 版权行 `© {year} Better Admin` 由原生 `<a href="/">` 改为 `next/link` 的 `Link`，样式与跳转行为不变。
   - `components/motion/tilt-card.tsx:72` 按 `react/jsx-sort-props`（callbacksLast + reservedFirst + 字母序）调整 props 顺序为 `ref` → `className` → `style` → `onMouseLeave` → `onMouseMove`，行为不变。
   - 复跑 `pnpm run lint` 达 **0 error 0 warning**；typecheck / test / build 全通过。
2. ✅ **#6 command-menu Esc 关闭（四端，2026-11-04 修复）**：根因是 React / Next 只在
   `SearchField.Input` 的 `onKeyDown` 里处理 Esc——react-aria 的 `useSearchField` 在输入框有内容时
   会先清空文本并拦截冒泡（表现为按两次 Esc 才关），焦点移到结果列表项后则没有应用层监听。
   修复：抽出纯函数 `isOverlayEscapeKey`（排除输入法组合中）并在面板主体 `onKeyDownCapture`
   统一关闭（捕获阶段先于库内处理、仅面板子树内触发，不误关其它浮层），输入框处的 Esc 分支删除；
   React / Next 各补一条单测。Vue / Nuxt 的 Esc 关闭本就由 Nuxt UI 官方能力提供
   （`UDashboardSearch` → `UModal` → reka-ui `DismissableLayer` 在 window 级监听且仅最高层浮层响应），
   本次显式绑定 `v-model:open` 让开合状态归布局层所有、行为可观测，组件行为不变。
3. ✅ **全局路由进度条无 role/aria（四端，2026-11-04 修复）**：不复用 `@bprogress` 运行时注入的 DOM，
   改为在其外层挂独立的 `role="status"` + `aria-live="polite"` + `aria-atomic="true"` + `sr-only`
   播报容器（react / next 在 Progress Provider 内，vue / nuxt 在 progress-provider.vue 内）：
   只在进度展示态边沿写入 `common.loading` 文案，空闲时为空内容（首帧无文本 → 无噪音；状态机已合并
   并发请求 / 路由过渡，活跃期间不反复翻转 → 不重复播报）。
4. ✅ **`@vercel/analytics` 的 `vue-router` peer 不匹配（2026-11-04 解决）**：npm 上仅 canary 版本把
   peer 放宽到 `^4 || ^5`，稳定版 `2.0.1` 仍为 `^4`（四端精确锁版一致）；不升 canary（§15 锁版本），
   改在 `apps/vue/pnpm-workspace.yaml` 加 `peerDependencyRules.allowedVersions`
   （`'@vercel/analytics>vue-router': '^5'`）抑制误报，**随上游 peer 更新移除本条**。取舍理由：
   四端版本一致、无重复 `vue-router` 实例（实际只有 5.3.1 一份）、`analytics-pageview.test.ts`
   已在 v5 下守卫上报语义；升级到 pre-release 的风险与收益不成比例。

## 【暂缓 / 备案】
- ✅ **website 四条既有 lint 告警（2026-11-04 已修复，见上方「【已修复】2026-11-04」）**（2026-11-03 website 首次接入 lint 时暴露，
  详见 progress.md 当日「Next / Website 接入 Vitest 与 lint」条目）：
  `components/background/light-ray.tsx:356/:386` 两处 `no-console`（调试输出）、
  `components/landing/footer.tsx:71` 用原生 `<a>` 跳 `/`（`@next/next/no-html-link-for-pages`，
  应改 `next/link`）、`components/motion/tilt-card.tsx:72` `jsx-sort-props`（回调须排在其他 props 之后）。
  均不影响构建与运行，待顺手批次统一修。

- **`phone` 空串语义：Nest 返回 400 vs Next / Nuxt 归一为「清空」**（2026-09-22 复核后**备案不修**，审计台账 #27）：`apps/nest/src/account/dto/account.dto.ts:31-36` 对 `phone` 只有 `@IsOptional` + `@Matches(/^1[3-9]\d{9}$/)`，空串既非 undefined 也非 null、正则不放行 ⇒ **400**；而 Next `app/api/account/profile/route.ts:43-49` 与 Nuxt `server/api/account/profile.put.ts:24-29` 都把「非空字符串以外」归一为 `null`（即**清空**）。**为何不算缺陷**：① 分歧只存在于「Nest vs 两个独立全栈端」，Next 与 Nuxt 之间写法一致，不是某端漏改；② 四端前端提交前均已把空串转 `null`（`react profile-form-card.tsx:75`、`next :77`、`vue ProfileFormCard.vue:50/77`、`nuxt :48/75`），界面永远发不出 `""`，只有非 UI 客户端会撞到；③ 要对齐只能改 Nest（契约级行为变更，牵动 React / Vue 的错误提示与 i18n 文案），代价大于收益。**将来若真要修，方向是 Nest 接受「空串=清空」，而不是让两端去学 400。**

- **Nest 端 e2e / 单测基建缺失**（2026-09-17 Phase 0 任务 A 发现）——**✅ e2e 已落地（2026-09-25，用户拍板 vitest + Supabase 同库 e2e schema 隔离）**：`apps/nest` 补齐 vitest + @nestjs/testing 与 `pnpm test`（31 用例：认证链路 / RBAC 聚合 / super_admin 双重保护 / 演示只读守卫 / 密码策略 / 基线冒烟），测试自行在共享库内建删 e2e schema 隔离（机制与四个坑见 `mechanisms.md` §42），CI 由 `ci.yml` 独立 `nest-e2e` job 承接（job 内自托管 TLS postgres 容器，不依赖任何 secret；初版方案的 `TEST_DATABASE_URL` secret 改判容器方案后从未实际创建）。落地详情见 `progress.md` 2026-09-25 条目。**遗留**：service 层单测（@nestjs/testing mock 依赖形态）仍未建，待有真实需要再立项。
- **#3 自绘树 role=tree/treeitem 语义**（react / next）：**暂缓**——完整可用需配套 roving tabindex
  与方向键漫游（APG tree 模式），自绘树改动量大；只加属性不加键导会让读屏器产生错误预期。
  Vue 端 UTree（reka）已自带 tree 语义与键盘导航，天然合规。待 a11y 需求出现或组件库提供
  Tree 原语后单独立项。
- ✅ **#6 command-menu 输入框拦截 Escape（2026-11-04 已修复，见上方「【已修复】2026-11-04」第 2 条）**：维持备案（避免双击 Esc 的既定行为；vue 端
  UDashboardSearch 口径不同，接受）。
- ✅ **属性级不可行——全局路由进度条无 role/aria（2026-11-04 已修复，见上方「【已修复】2026-11-04」第 3 条）**：三端 DOM 均由 `@bprogress` 库运行时注入
  （vue 端同为 `@bprogress/vue`，此前「vue 自研 DOM 可先行」的判断有误），项目侧无可挂容器；
  需库支持（如透传 props）或升级库版本后重估。react progress-provider.tsx / next providers.tsx /
  vue progress-bridge.vue。

## 【销项】

- ~~#5 avatar-crop-dialog 禁用 Esc 关闭~~：2026-09-12 核实**四端行为已一致**——react / next 显式
  禁用 Esc，vue 端 `UModal :dismissible="false"` 同款禁 Esc + 禁遮罩点击（取消按钮兜底），无需改动。
