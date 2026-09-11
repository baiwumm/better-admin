import { create } from "zustand";

/**
 * 全局进度条状态机（zustand 响应式状态驱动）。
 *
 * api-client.ts 是纯函数模块，无法直接调用 useProgress() hook；
 * api-client 与 use-route-progress 直接调用本模块的 progressStart /
 * progressStop / progressRouteBegin 改写状态，展示态 active 的变化由
 * 组件侧（routes/__root.tsx）经 watchProgress() 订阅并驱动 bprogress
 * （useProgress 需组件上下文，无法在非 React 模块直接调用）。
 *
 * 并发模型（统一状态机，修复「路由 + 并发请求」竞态）：
 * - 展示态 = 「飞行中业务请求数 > 0」或「路由切换过渡未结束」，任一活跃即展示；
 * - 只有两者都归零才真正 stop()。此前路由切换后约 50ms 即无条件 stop，
 *   页面并发请求仍在飞行时进度条会提前消失（闪现即止、请求仍在加载）。
 * - start 带 Provider 下发的 delay（默认 200ms）：短导航 / 快速接口全程
 *   不闪进度条；delay 期间收到 stop 会取消未触发的 start，无残留。
 */

type ProgressActions = {
  start: (
    startPosition?: number,
    delay?: number,
    autoStopDisabled?: boolean,
  ) => void;
  stop: (stopDelay?: number, forcedStopDelay?: number) => void;
};

// ── 时序配置（单一来源；取值与 ProgressProvider 的 startPosition / delay /
//    stopDelay 一致——Provider 的这三个 props 仅影响锚点点击场景，
//    手动 start / stop 的时序以这里为准）──

/** start 起始位置 */
const START_POSITION = 0.3;
/** start delay：短导航 / 快速接口全程不闪进度条 */
const START_DELAY_MS = 200;
/** stop 延迟：立即收尾 */
const STOP_DELAY_MS = 0;

/** 进度条展示态（状态机输出，边沿由 watchProgress 订阅） */
const useProgressStore = create<{ active: boolean }>()(() => ({
  active: false,
}));

/** 飞行中的业务请求数（api-client progressStart/Stop 引用计数） */
let pendingCount = 0;
/** 路由切换过渡是否未结束（use-route-progress 触发） */
let routePending = false;

/** 路由过渡的收尾定时器（rAF + 延迟；重复触发时先取消旧的） */
let routeRafId: number | null = null;
let routeEndTimerId: ReturnType<typeof setTimeout> | null = null;

/** 路由过渡收尾延迟：等新页面完成渲染（与原 use-route-progress 实现一致） */
const ROUTE_SETTLE_DELAY_MS = 50;

function sync() {
  const next = pendingCount > 0 || routePending;

  if (next === useProgressStore.getState().active) return;

  // zustand subscribe 在 setState 时同步触发，订阅侧此刻即拿到新展示态
  useProgressStore.setState({ active: next });
}

/**
 * 订阅进度条展示态边沿，驱动 bprogress start/stop（组件侧调用一次；
 * 返回的退订函数交由 effect 清理，StrictMode 重复挂载安全）。
 */
export function watchProgress(actions: ProgressActions): () => void {
  return useProgressStore.subscribe((state, prev) => {
    if (state.active === prev.active) return;

    if (state.active) {
      actions.start(START_POSITION, START_DELAY_MS);
    } else {
      actions.stop(STOP_DELAY_MS);
    }
  });
}

/** 业务请求开始（api-client 调用；引用计数，并发安全）。 */
export function progressStart() {
  pendingCount++;
  sync();
}

/** 业务请求结束（api-client 调用；最后一个请求结束才停进度条）。 */
export function progressStop() {
  pendingCount = Math.max(0, pendingCount - 1);
  sync();
}

/**
 * 路由切换过渡开始（use-route-progress 调用）。
 * 过渡段持续到「新页面渲染完成」（rAF + 短延迟）；
 * 期间页面并发请求仍在飞行时，进度条由请求计数继续维持，不会提前消失。
 * 快速连续切换路由时，旧的收尾定时器会被取消，以最后一次为准。
 */
export function progressRouteBegin() {
  if (routeRafId !== null) {
    cancelAnimationFrame(routeRafId);
    routeRafId = null;
  }
  if (routeEndTimerId !== null) {
    clearTimeout(routeEndTimerId);
    routeEndTimerId = null;
  }

  routePending = true;
  sync();

  routeRafId = requestAnimationFrame(() => {
    routeRafId = null;
    routeEndTimerId = setTimeout(() => {
      routeEndTimerId = null;
      routePending = false;
      sync();
    }, ROUTE_SETTLE_DELAY_MS);
  });
}
