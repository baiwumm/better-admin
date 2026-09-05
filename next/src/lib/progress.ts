/**
 * 全局进度条控制器（非 React 模块安全读写）。
 *
 * api-client.ts 是纯函数模块，无法直接调用 useProgress() hook。
 * 本模块通过 bindProgress() 接受 React 侧注入的 useProgress 引用，
 * 供 api-client（请求进度）与 providers 的 ProgressBinder（路由过渡）调用。
 *
 * 并发模型（统一状态机，修复「路由 + 并发请求」竞态）：
 * - 展示态 = 「飞行中业务请求数 > 0」或「路由切换过渡未结束」，任一活跃即展示；
 * - 只有两者都归零才真正 stop()。@bprogress/next 内置「pathname/searchParams
 *   变化即自动 stop」的收尾（stopDelay=0 时导航一完成进度条就消失），而页面
 *   client 端数据请求不在此生命周期内——因此请求存在期间先 disableAutoStop()
 *   拦截库的自动收尾，收尾权移交本状态机，全部结束后 stop + enableAutoStop()。
 * - start：仅「无路由导航的独立请求」由状态机补发（轮询 / 懒加载等）；
 *   导航场景的 start 由 @bprogress/next 的路由监听负责，重复 start 会重置进度。
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
  /** 拦截 @bprogress/next 的 pathname 变化自动 stop（请求存在期间） */
  disableAutoStop: () => void;
  enableAutoStop: () => void;
};

/** 由 React 侧注入的 useProgress 引用与时序配置 */
let actions: ProgressActions | null = null;
let startPosition = 0;
let startDelayMs = 0;
let stopDelayMs = 0;

/** 飞行中的业务请求数（api-client progressStart/Stop 引用计数） */
let pendingCount = 0;
/** 路由切换过渡是否未结束（ProgressBinder 监听 pathname 触发） */
let routePending = false;
/** 进度条当前展示态（状态机上次输出，避免重复 start/stop） */
let active = false;

/** 路由过渡的收尾定时器（rAF + 延迟；重复触发时先取消旧的） */
let routeRafId: number | null = null;
let routeEndTimerId: ReturnType<typeof setTimeout> | null = null;

/** 路由过渡收尾延迟：等新页面完成渲染 */
const ROUTE_SETTLE_DELAY_MS = 50;

function sync() {
  const next = pendingCount > 0 || routePending;

  if (next === active) return;
  active = next;

  if (next) {
    // 导航过渡（routePending）时 start 由 @bprogress/next 负责，不重复 start
    if (!routePending) {
      actions?.start(startPosition, startDelayMs);
    }
  } else {
    actions?.enableAutoStop();
    actions?.stop(stopDelayMs);
  }
}

/**
 * 由 React 侧调用一次，注入 useProgress 的 start/stop 与时序配置。
 * start/stop/disableAutoStop/enableAutoStop 引用稳定（useCallback），
 * 重复 bind 为幂等更新。
 */
export function bindProgress(
  a: ProgressActions,
  timing: {
    startPosition?: number;
    startDelayMs?: number;
    stopDelayMs?: number;
  } = {},
) {
  actions = a;
  startPosition = timing.startPosition ?? 0;
  startDelayMs = timing.startDelayMs ?? 0;
  stopDelayMs = timing.stopDelayMs ?? 0;
}

/** 业务请求开始（api-client 调用；引用计数，并发安全）。 */
export function progressStart() {
  pendingCount++;
  if (pendingCount === 1) {
    // 首个飞行请求拦截库的 pathname 变化自动 stop（同步置 ref，
    // 早于库在宏任务里检查 isAutoStopDisabled 的时机）
    actions?.disableAutoStop();
  }
  sync();
}

/** 业务请求结束（api-client 调用；最后一个请求结束才停进度条）。 */
export function progressStop() {
  pendingCount = Math.max(0, pendingCount - 1);
  sync();
}

/**
 * 路由切换过渡开始（ProgressBinder 调用）。
 * 过渡段持续到「新页面渲染完成」（rAF + 短延迟）；期间页面并发请求仍在
 * 飞行时，进度条由请求计数继续维持，不会提前消失。
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
