/**
 * Toast 进出场动画编排（无 ViewTransition 版）。
 *
 * HeroUI toast 的根级 VT 已由 provider.tsx 的 disableToastViewTransition
 * 禁用（覆写底层 stately 队列的 wrapUpdate = (fn) => fn()，队列不再调用
 * document.startViewTransition），toast 元素随队列更新即时增删——入场动画
 * 纯 CSS 即可（元素挂载时播放 globals.css 的 toast-enter-* 关键帧），但退场
 * 需要元素在 DOM 停留片刻才能播放动画。react-stately 的 ToastQueue 移除元素
 * 是即时的（close → 通知订阅 → 区域卸载），因此本模块在应用启动时给队列
 * 单例的 close 打补丁：先给对应 toast 元素套上退场动画（toast-exit-*，无
 * 位移出视口），延迟 ~180ms 后再真正从队列移除。自动超时（react-stately
 * 内部 Timer 调用 this.close）与手动关闭（关闭按钮 / toast.close）都经过
 * 该实例方法，故两条路径均覆盖。
 *
 * 动画方向与 HeroUI 原本的 toast-slide-top-in/out 一致（顶部 placement 从
 * 上方滑入、向上滑出），只是改为小幅度位移 + 淡入淡出，观感更克制，且
 * 全程不产生任何 view-transition 伪元素、不影响页面。
 *
 * 注：仅覆盖 @heroui/react 导出的全局 toast 单例（应用内 toast.success /
 * toast.danger 等均走此队列）；若将来有独立 queueProp 的 Provider 实例，
 * 需另行处理。
 */

import { toast } from "@heroui/react";

const TOAST_EXIT_MS = 180;

const PATCH_MARK = Symbol.for("better-admin.toast-exit.patched");

/** 与 HeroUI Toast 渲染时一致的内联 view-transition-name 命名（toast.js）。 */
function toastViewTransitionName(key: string): string {
  return `toast-${String(key).replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/** 按队列 key 找到对应 toast 元素（HeroUI 把 key 编码进内联 view-transition-name）。 */
function findToastElement(key: string): HTMLElement | null {
  const name = toastViewTransitionName(key);

  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-slot="toast"]',
  )) {
    if (el.style.getPropertyValue("view-transition-name") === name) return el;
  }

  return null;
}

/**
 * 安装 toast 退场动画补丁（幂等；应用启动早期调用一次，见 main.tsx）。
 */
export function installToastExitAnimation(): void {
  if (typeof document === "undefined") return;

  const queue = toast.getQueue() as unknown as {
    close: (key: string) => void;
  };

  if (typeof queue?.close !== "function") return;
  if ((queue as unknown as Record<PropertyKey, unknown>)[PATCH_MARK]) return;

  (queue as unknown as Record<PropertyKey, unknown>)[PATCH_MARK] = true;

  const nativeClose = queue.close.bind(queue);

  queue.close = (key: string) => {
    const el = findToastElement(key);
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (el && !reduceMotion) {
      const isBottom = el.classList.contains("toast--bottom");

      // 内联 animation 覆盖 CSS 入场动画，播放退场动画后再真正移除。
      el.style.animation = isBottom
        ? "toast-exit-bottom 180ms ease-in forwards"
        : "toast-exit-top 180ms ease-in forwards";

      window.setTimeout(() => nativeClose(key), TOAST_EXIT_MS);
    } else {
      nativeClose(key);
    }
  };
}
