/**
 * 浮层（Modal / Drawer / 命令面板）的 Esc 判定。
 *
 * 抽成纯函数供单测守卫：react-aria 的 useSearchField 在输入框有内容时会
 * 清空文本并拦截冒泡（按一次 Esc 只清空、需再按一次才关闭），命令面板
 * 必须在 Dialog 捕获阶段用本判定统一关闭，保证任意焦点位置一次 Esc 生效。
 *
 * isComposing（输入法组合中）不响应：中文候选框按 Esc 取消候选时不应误关面板。
 */
export function isOverlayEscapeKey(key: string, isComposing: boolean): boolean {
  return key === "Escape" && !isComposing;
}
