import { useMenuStore } from "@/stores/menu-store";
import { findActivePath } from "@/lib/menu-utils";
import { type MenuNode } from "@/lib/api-types";

/**
 * 路由过渡方向标记（对齐 React 版 KeepAliveOutlet 的导航方向判定）。
 *
 * 在导航发起前按「新旧路径在菜单树中的层级深度」判定前进/后退：
 * 目标深度更浅视为后退，写入 html[data-rt-direction="back"]；否则移除
 * （前进/同层）。位移类过渡动画（glide/cover 等）经 CSS 变量 --rt-dir-x
 * 反转播放方向，见 styles/route-transitions.css。
 *
 * 必须在 router.push 之前调用——VT 快照生成时 CSS 变量需已生效。
 * 树外路径（白名单 / 动态段）深度按 0 计，与 React 版 menuDepthOf 一致。
 * 浏览器前进/后退按钮无导航发起点，不带方向（默认前进），为两端一致的
 * 已知边界。
 */

/** 菜单树中的层级深度（白名单等树外路径为 0）。 */
function menuDepthOf(path: string, menuTree: MenuNode[]): number {
  return findActivePath(menuTree, path).length;
}

/**
 * 导航发起点调用：按菜单深度标记本次导航方向。
 * 判定菜单树缺失时清除标记（保守按前进处理）。
 */
export function markRouteDirection(to: string): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const menuTree = useMenuStore.getState().menus;

  // 非站内路径（外链等）不参与方向判定
  if (!to.startsWith("/")) return;

  if (!menuTree || menuTree.length === 0) {
    root.removeAttribute("data-rt-direction");

    return;
  }

  const currentPath = window.location.pathname;
  const prevDepth = menuDepthOf(currentPath, menuTree);
  const nextDepth = menuDepthOf(to, menuTree);

  if (nextDepth < prevDepth) {
    root.setAttribute("data-rt-direction", "back");
  } else {
    root.removeAttribute("data-rt-direction");
  }
}
