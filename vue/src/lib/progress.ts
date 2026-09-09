/**
 * 全局进度条控制器（非组件模块安全读写）。
 *
 * api-client.ts 是纯函数模块，路由守卫也是非组件上下文，
 * 均无法直接调用 useProgress() composable。
 * 本模块通过 bindProgress() 接受组件侧注入的 start/stop 引用，
 * 供 api-client（请求进度）与路由守卫（路由进度）调用。
 *
 * 并发模型（统一状态机，对齐 React 端实现）：
 * - 展示态 = 「飞行中业务请求数 > 0」或「路由切换过渡未结束」，任一活跃即展示；
 * - 只有两者都归零才真正 stop()。否则路由切换后约 50ms 即无条件 stop，
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

/** 由组件侧注入的 start/stop 引用与时序配置 */
let actions: ProgressActions | null = null;
let startPosition = 0;
let startDelayMs = 0;
/** 路由场景独立的 start delay：vue-router 导航不含数据加载（请求走 api-client 计数），
 * 导航耗时普遍 < 请求场景 delay，若共用会被防闪机制吞掉，路由进度条永远不显示 */
let routeStartDelayMs = 0;
let stopDelayMs = 0;

/** 飞行中的业务请求数（api-client progressStart/Stop 引用计数） */
let pendingCount = 0;
/** 路由切换过渡是否未结束（路由守卫触发） */
let routePending = false;
/** 进度条当前展示态（状态机上次输出，避免重复 start/stop） */
let active = false;

/** 路由过渡的收尾定时器（rAF + 延迟；重复触发时先取消旧的） */
let routeRafId: number | null = null;
let routeEndTimerId: ReturnType<typeof setTimeout> | null = null;

/** 路由过渡收尾延迟：等新页面完成渲染（与 React 端实现一致） */
const ROUTE_SETTLE_DELAY_MS = 50;

function sync() {
  const next = pendingCount > 0 || routePending;

  if (next === active) return;

  // 仅在静止→活跃的边沿触发 start，此刻按触发源选 delay：
  // - 请求触发（pendingCount > 0）→ 请求场景 delay（防快接口闪条）；
  // - 路由触发（routePending 且无请求）→ 路由场景 delay（默认立即显示）。
  // 活跃期间任一来源续期不会重复 start（bprogress 进度自带连续性）。
  const delay = pendingCount > 0 ? startDelayMs : routeStartDelayMs;

  active = next;

  if (next) {
    actions?.start(startPosition, delay);
  } else {
    actions?.stop(stopDelayMs);
  }
}

/**
 * 由进度条 Provider 内部的桥接组件调用一次，注入 useProgress 的
 * start/stop 与时序配置（startPosition / delay / stopDelay 单一来源）。
 * start/stop 引用稳定，重复 bind 为幂等更新。
 */
export function bindProgress(
  a: ProgressActions,
  timing: {
    startPosition?: number;
    startDelayMs?: number;
    routeStartDelayMs?: number;
    stopDelayMs?: number;
  } = {},
) {
  actions = a;
  startPosition = timing.startPosition ?? 0;
  startDelayMs = timing.startDelayMs ?? 0;
  routeStartDelayMs = timing.routeStartDelayMs ?? 0;
  stopDelayMs = timing.stopDelayMs ?? 0;
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
 * 路由切换过渡开始（路由守卫调用）。
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
