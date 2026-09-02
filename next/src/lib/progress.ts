/**
 * 全局进度条控制器（非 React 模块安全读写）。
 *
 * api-client.ts 是纯函数模块，无法直接调用 useProgress() hook。
 * 本模块通过 bindProgress() 接受 React 侧注入的 start/stop 引用，
 * 供 api-client 在请求前后调用。
 *
 * 并发安全：内部维护引用计数器，多个并行请求时只在最后一个请求结束后
 * 才真正调用 stop()，避免中途消失。
 */

type ProgressActions = {
  start: () => void;
  stop: () => void;
};

let actions: ProgressActions | null = null;
let pendingCount = 0;

/** 由 React 侧调用一次，注入 useProgress 返回的 start/stop。 */
export function bindProgress(a: ProgressActions) {
  actions = a;
}

export function progressStart() {
  if (pendingCount === 0) {
    actions?.start();
  }
  pendingCount++;
}

export function progressStop() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) {
    actions?.stop();
  }
}
