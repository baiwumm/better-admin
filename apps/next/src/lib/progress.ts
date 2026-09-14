import { create } from "zustand";

/**
 * 全局进度条状态机（zustand 响应式状态驱动）。
 *
 * api-client.ts 是纯函数模块，无法直接调用 useProgress() hook；
 * api-client 与 providers 的 ProgressBinder（路由过渡）直接调用本模块的
 * progressStart / progressStop / progressRouteBegin 改写状态，展示态
 * active 的变化由组件侧经 watchProgress() 订阅并驱动 bprogress
 * （useProgress 需组件上下文，无法在非 React 模块直接调用）。
 *
 * 并发模型（统一状态机，修复「路由 + 并发请求」竞态）：
 * - 展示态 = 「飞行中业务请求数 > 0」或「路由切换过渡未结束」，任一活跃即展示；
 * - 只有两者都归零才真正 stop()。@bprogress/next 内置「pathname/searchParams
 *   变化即自动 stop」的收尾（stopDelay=0 时导航一完成进度条就消失），而页面
 *   client 端数据请求不在此生命周期内——因此请求存在期间先 disableAutoStop()
 *   拦截库的自动收尾，收尾权移交本状态机，全部结束后 stop + enableAutoStop()。
 * - start：仅「无路由导航的独立请求」由状态机补发（轮询 / 懒加载等）；
 *   导航场景的 start 由 @bprogress/next 的路由监听负责，重复 start 会重置进度。
 * - start 带 delay（200ms）：短导航 / 快速接口全程不闪进度条；delay 期间
 *   收到 stop 会取消未触发的 start，无残留。
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

// ── 时序配置（单一来源；取值与 app/providers.tsx 的 ProgressProvider
//    startPosition / delay / stopDelay 一致——Provider 的这三个 props 仅影响
//    锚点点击场景，手动 start / stop 的时序以这里为准）──

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
/** 路由切换过渡是否未结束（ProgressBinder 监听 pathname 触发） */
let routePending = false;

/** 路由过渡的收尾定时器（rAF + 延迟；重复触发时先取消旧的） */
let routeRafId: number | null = null;
let routeEndTimerId: ReturnType<typeof setTimeout> | null = null;

/** 路由过渡收尾延迟：等新页面完成渲染 */
const ROUTE_SETTLE_DELAY_MS = 50;

/**
 * watchProgress 登记的组件侧 actions：progressStart 首个飞行请求需
 * 「同步」disableAutoStop（早于库在宏任务里检查 isAutoStopDisabled 的时机），
 * 不能等订阅回调。
 */
let boundActions: ProgressActions | null = null;

function sync() {
  const next = pendingCount > 0 || routePending;

  if (next === useProgressStore.getState().active) return;

  // zustand subscribe 在 setState 时同步触发，订阅侧此刻即拿到新展示态
  useProgressStore.setState({ active: next });
}

/**
 * 订阅进度条展示态边沿，驱动 bprogress start/stop / 自动收尾拦截
 * （组件侧调用一次；返回的退订函数交由 effect 清理）。
 */
export function watchProgress(actions: ProgressActions): () => void {
  boundActions = actions;

  const unsubscribe = useProgressStore.subscribe((state, prev) => {
    if (state.active === prev.active) return;

    if (state.active) {
      // 导航过渡（routePending）时 start 由 @bprogress/next 负责，不重复 start
      if (!routePending) {
        actions.start(START_POSITION, START_DELAY_MS);
      }
    } else {
      actions.enableAutoStop();
      actions.stop(STOP_DELAY_MS);
    }
  });

  return () => {
    if (boundActions === actions) boundActions = null;
    unsubscribe();
  };
}

/** 业务请求开始（api-client 调用；引用计数，并发安全）。 */
export function progressStart() {
  pendingCount++;
  if (pendingCount === 1) {
    // 首个飞行请求拦截库的 pathname 变化自动 stop（同步置 ref，
    // 早于库在宏任务里检查 isAutoStopDisabled 的时机）
    boundActions?.disableAutoStop();
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
