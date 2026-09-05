# 代码审查 Backlog：行为级未修项（2026-09-06 审查）

> 2026-09-06 只读审查的**属性级问题（性能 P1/P2 + 无障碍 P1/P2）已全部修复**并入库，记录见 `progress.md` 当日条目。
> 本文件仅保留**行为级**未修项——修复涉及交互逻辑变更（违反「功能不变」约束），需单独决策评估。
> 另有一条属性级不可行项（进度条 aria）一并记录在此。

## 【行为级】修复需单独决策（6 项）

1. tags-bar 标签关闭热区 span[role=button] 无 tabIndex/键盘处理器，键盘无法关标签（源码注释自认以鼠标为主）| react:614-621/next:606-613 → 需改为真 Button 内隔离 press，或补 tabIndex+Enter/Space+焦点环
2. dept-tree 拖拽排序仅 PointerSensor，无键盘替代（可参照 data-table-view-options.tsx 现成 KeyboardSensor 方案）| react:196-198/next:198-200
3. role-grant-drawer 与 dept-tree 自绘树无 role=tree/treeitem 语义（补齐须同步方向键导航与 aria-expanded，属交互变更）
4. tags-bar 刷新/批量关闭菜单仅 onContextMenu 触发，键盘无入口 → 需 Shift+F10 支持或可见菜单按钮 | react:372-377,494
5. avatar-crop-dialog 禁用 Esc 关闭（有取消按钮兜底，产品决策）| react:79-84
6. command-menu 输入框拦截 Escape（避免双击 Esc 的既定行为，备案）| react:263-277

## 【记录】属性级不可行（1 项）

- 全局路由进度条（@bprogress）无 role/aria：`.bprogress` DOM 由 `@bprogress/core` 运行时注入，项目侧无可挂容器；需库支持（如透传 props）或升级库版本后重估。react progress-provider.tsx / next providers.tsx。
