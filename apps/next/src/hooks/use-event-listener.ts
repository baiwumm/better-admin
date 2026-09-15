import { useEffect } from "react";

/**
 * SSR 安全的 document 引用：Next 端 client 组件会在服务端预渲染，
 * 渲染期直接求值 document 标识符会抛 ReferenceError；经此函数包裹后
 * 服务端返回 undefined（useEventListener 内 !target 早退、不订阅），
 * 客户端返回 document，hydration 后 effect 正常订阅。
 */
export function getDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

/**
 * SSR 安全的 window 引用（语义同 getDocument，监听 window 事件时使用）。
 */
export function getWindow(): Window | undefined {
  return typeof window === "undefined" ? undefined : window;
}

/**
 * 事件监听订阅（声明式：随组件作用域自动摘除，收敛手写
 * addEventListener / useEffect 清理对）。
 *
 * - target / type / listener / options 变化时重订阅；listener 建议 useCallback
 *   记忆化，listener 传 null 表示暂不订阅（可表达「条件生效」的监听）；
 * - options 传对象时请在调用方记忆化，避免每次渲染重订阅。
 * - target 需为 document / window 等浏览器全局对象时请经 getDocument() 等
 *   SSR 安全引用传入，禁止在渲染期直接求值 document / window 标识符。
 */
export function useEventListener<E extends Event = Event>(
  target: EventTarget | null | undefined,
  type: string,
  listener: ((event: E) => void) | null | undefined,
  options?: boolean | AddEventListenerOptions,
): void {
  useEffect(() => {
    if (!target || !listener) return;

    // 泛型 E 由调用方 listener 标注收窄，EventListener 为 DOM API 的宽化形态
    target.addEventListener(type, listener as EventListener, options);

    return () => {
      target.removeEventListener(type, listener as EventListener, options);
    };
  }, [target, type, listener, options]);
}
