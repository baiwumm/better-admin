import { ref, watch } from "vue";

/**
 * 全局进度条状态机（响应式状态驱动）。
 *
 * api-client.ts 与路由守卫是非组件上下文，直接调用本模块的
 * progressStart / progressStop / progressRouteBegin 改写响应式状态；
 * 展示态 active 的变化由组件侧 progress-bridge.vue 经 watchProgress()
 * 订阅并驱动 bprogress（useProgress 需 inject Provider 上下文，
 * 无法在非组件模块直接调用）。
 *
 * 并发模型（统一状态机，对齐 React 端实现）：
 * - 展示态 = 「飞行中业务请求数 > 0」或「路由切换过渡未结束」，任一活跃即展示；
 * - 只有两者都归零才真正 stop()。否则路由切换后约 50ms 即无条件 stop，
 *   页面并发请求仍在飞行时进度条会提前消失（闪现即止、请求仍在加载）。
 * - start 带 delay：短导航 / 快速接口全程不闪进度条；delay 期间收到 stop
 *   会取消未触发的 start，无残留。
 */

type ProgressActions = {
  start: (
    startPosition?: number,
    delay?: number,
    autoStopDisabled?: boolean,
  ) => void;
  stop: (stopDelay?: number, forcedStopDelay?: number) => void;
};

// ── 时序配置（单一来源；Vue 版 useProgress 不暴露 Provider 的时序 props，
//    无法从组件读取，故直接收敛在本状态机内）──

/** start 起始位置。 */
const START_POSITION = 0.3;
/** 请求场景 start delay（防快接口闪条）。 */
const START_DELAY_MS = 200;
/** 路由场景独立 start delay：vue-router 导航不含数据加载（页面数据由挂载后
 * 的 vue-query 走 api-client 计数），导航耗时普遍 < 请求场景 delay，若共用
 * 会被防闪机制吞掉，路由进度条永远不显示，故立即开始。 */
const ROUTE_START_DELAY_MS = 0;
/** stop 延迟：立即收尾。 */
const STOP_DELAY_MS = 0;

/** 飞行中的业务请求数（api-client 引用计数）。 */
const pendingCount = ref(0);
/** 路由切换过渡是否未结束（路由守卫触发）。 */
const routePending = ref(false);
/** 进度条展示态（状态机输出，边沿由 watchProgress 订阅）。 */
const active = ref(false);
/** 边沿时刻选定的 start delay（同步判定后存入，订阅侧直接读取）。 */
const activeStartDelay = ref(0);

/** 路由过渡的收尾定时器（rAF + 延迟；重复触发时先取消旧的） */
let routeRafId: number | null = null;
let routeEndTimerId: ReturnType<typeof setTimeout> | null = null;

/** 路由过渡收尾延迟：等新页面完成渲染（与 React 端实现一致） */
const ROUTE_SETTLE_DELAY_MS = 50;

function sync() {
  const next = pendingCount.value > 0 || routePending.value;

  if (next === active.value) return;

  // 仅在静止→活跃的边沿选定 delay，此刻按触发源选择：
  // - 请求触发（pendingCount > 0）→ 请求场景 delay；
  // - 路由触发（routePending 且无请求）→ 路由场景 delay（立即显示）。
  // 活跃期间任一来源续期不会改变展示态（bprogress 进度自带连续性）。
  activeStartDelay.value =
    pendingCount.value > 0 ? START_DELAY_MS : ROUTE_START_DELAY_MS;
  active.value = next;
}

/**
 * 订阅进度条展示态边沿，驱动 bprogress start/stop（组件侧调用一次；
 * watch 随调用方组件作用域自动清理）。冷启动首屏导航先于组件挂载的窗口
 * 不补发 start（与原命令式绑定语义一致）。
 */
export function watchProgress(actions: ProgressActions): () => void {
  return watch(active, (next) => {
    if (next) {
      actions.start(START_POSITION, activeStartDelay.value);
    } else {
      actions.stop(STOP_DELAY_MS);
    }
  });
}

/** 业务请求开始（api-client 调用；引用计数，并发安全）。 */
export function progressStart() {
  pendingCount.value++;
  sync();
}

/** 业务请求结束（api-client 调用；最后一个请求结束才停进度条）。 */
export function progressStop() {
  pendingCount.value = Math.max(0, pendingCount.value - 1);
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

  routePending.value = true;
  sync();

  routeRafId = requestAnimationFrame(() => {
    routeRafId = null;
    routeEndTimerId = setTimeout(() => {
      routeEndTimerId = null;
      routePending.value = false;
      sync();
    }, ROUTE_SETTLE_DELAY_MS);
  });
}
