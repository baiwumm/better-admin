import { useEffect } from "react";

/**
 * 事件监听订阅（声明式：随组件作用域自动摘除，收敛手写
 * addEventListener / useEffect 清理对）。
 *
 * - target / type / listener / options 变化时重订阅；listener 建议 useCallback
 *   记忆化，listener 传 null 表示暂不订阅（可表达「条件生效」的监听）；
 * - options 传对象时请在调用方记忆化，避免每次渲染重订阅。
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
