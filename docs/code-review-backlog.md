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

## 【暂缓 / 备案】

- **菜单声明 0 位的页面对普通角色不可见**（nest，2026-09-14 Playground Phase A 发现）：
  `MenusService.buildAllowedMenuIds` 只把 `role_menus.permissions != 0` 的菜单算作可见，而四端
  角色授权抽屉勾选菜单写入的是菜单声明位（`node.permissions || "0"`）——线上「异常页」三个子页
  （`permissions = 0`，经 GUI 创建）因此**仅超管可见**，普通角色即使在角色管理中勾选也不可见。
  Playground 页面已改为声明 `SEARCH` 位规避。异常页是否同样补 `SEARCH` 位（需脚本改库，并同步
  feature-matrix「超管免授权可见」口径）待定；根治方案（「有 role_menus 记录即可见」）涉及五端
  RBAC 核心语义，不在本项范围内擅动。
- **#3 自绘树 role=tree/treeitem 语义**（react / next）：**暂缓**——完整可用需配套 roving tabindex
  与方向键漫游（APG tree 模式），自绘树改动量大；只加属性不加键导会让读屏器产生错误预期。
  Vue 端 UTree（reka）已自带 tree 语义与键盘导航，天然合规。待 a11y 需求出现或组件库提供
  Tree 原语后单独立项。
- **#6 command-menu 输入框拦截 Escape**：维持备案（避免双击 Esc 的既定行为；vue 端
  UDashboardSearch 口径不同，接受）。
- **属性级不可行——全局路由进度条无 role/aria**：三端 DOM 均由 `@bprogress` 库运行时注入
  （vue 端同为 `@bprogress/vue`，此前「vue 自研 DOM 可先行」的判断有误），项目侧无可挂容器；
  需库支持（如透传 props）或升级库版本后重估。react progress-provider.tsx / next providers.tsx /
  vue progress-bridge.vue。

## 【销项】

- ~~#5 avatar-crop-dialog 禁用 Esc 关闭~~：2026-09-12 核实**四端行为已一致**——react / next 显式
  禁用 Esc，vue 端 `UModal :dismissible="false"` 同款禁 Esc + 禁遮罩点击（取消按钮兜底），无需改动。
