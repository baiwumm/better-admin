import { create } from "zustand";

import {
  closeAllTabPaths,
  closeLeftTabPaths,
  closeOtherTabPaths,
  closeRightTabPaths,
  closeTabPaths,
  ensureHomeTab,
  parseStoredTabs,
  pruneTabPaths,
  withOpenedPath,
  type TabMetaSnapshot,
} from "@/lib/tabs-model";

const TABS_STORAGE_KEY = "better-admin-tabs";

/** 从 sessionStorage 恢复标签与元数据快照（刷新后立即渲染中文标题，不等菜单接口）。 */
function readStateFromStorage(): {
  paths: string[];
  meta: Record<string, TabMetaSnapshot>;
} {
  if (typeof window === "undefined") return { paths: [], meta: {} };

  return parseStoredTabs(window.sessionStorage.getItem(TABS_STORAGE_KEY));
}

function writeStateToStorage(
  paths: string[],
  meta: Record<string, TabMetaSnapshot>,
): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    TABS_STORAGE_KEY,
    JSON.stringify({ paths, meta }),
  );
}

interface TabsState {
  /**
   * 已打开且未关闭的路径序列（插入序即展示序，控制台经 ensureHomeTab 恒在首位）。
   */
  paths: string[];
  /**
   * 标题 / 图标快照：菜单就绪时由 syncMeta 写入并持久化，
   * 刷新恢复后无需等待菜单接口即可渲染中文标题。
   */
  meta: Record<string, TabMetaSnapshot>;
  /** 刷新计数器：path → 递增序号（KeepAliveOutlet 以 key 变化强制重挂载实现「刷新」）。 */
  refreshSeq: Record<string, number>;
  /** 打开标签（去重追加 + 数量治理 + 控制台首位保证）。 */
  openPath: (path: string, currentPath: string) => void;
  /** 关闭单个标签；返回需要导航的目标（null = 无需导航），由调用方执行导航。 */
  closePath: (path: string, currentPath: string) => string | null;
  /** 关闭其他（仅保留固定标签与锚点）；返回值语义同 closePath。 */
  closeOthers: (anchorPath: string, currentPath: string) => string | null;
  /** 关闭左侧；返回值语义同 closePath。 */
  closeLeft: (anchorPath: string, currentPath: string) => string | null;
  /** 关闭右侧；返回值语义同 closePath。 */
  closeRight: (anchorPath: string, currentPath: string) => string | null;
  /** 全部关闭（仅保留固定标签）；返回值语义同 closePath。 */
  closeAll: (currentPath: string) => string | null;
  /** 刷新标签对应页面（强制销毁并重建组件实例）。 */
  refreshPath: (path: string) => void;
  /** 合并标题/图标快照（菜单就绪后调用；新值覆盖旧值，文案变更自动跟随）。 */
  syncMeta: (entries: Record<string, TabMetaSnapshot>) => void;
  /** 权限治理：移除不可达标签及其元数据（恢复 / 权限变更后调用）。 */
  pruneTabs: (allowedPaths: ReadonlySet<string>) => void;
  /** 清空标题快照缓存（语言切换时调用）：标签列表保留，tags-bar 回退实时菜单名称。 */
  clearTabsCache: () => void;
  /** 清空（登出 / 会话失效时调用）。 */
  resetTabs: () => void;
  /** 挂载后从 sessionStorage 恢复标签（客户端专用，规避 SSR 水合偏差）。 */
  restoreTabs: () => void;
}

/**
 * Next 适配：初始状态恒为空（SSR 与客户端首帧渲染一致，规避水合偏差）。
 * sessionStorage 的恢复延迟到客户端挂载后调用 restoreTabs()（Admin Shell
 * 挂载 effect），恢复内容以 ensureHomeTab 保证控制台固定标签在首位。
 */
export const useTabsStore = create<TabsState>()(() => ({
  paths: ensureHomeTab([]),
  meta: {},
  refreshSeq: {},

  /** 挂载后恢复 sessionStorage 中的标签与元数据快照（客户端专用）。 */
  restoreTabs: () => {
    const restored = readStateFromStorage();

    useTabsStore.setState((state) => {
      const paths = ensureHomeTab(restored.paths);

      if (
        paths.length === state.paths.length &&
        paths.every((p, i) => p === state.paths[i])
      ) {
        return { meta: { ...state.meta, ...restored.meta } };
      }

      return { paths, meta: { ...state.meta, ...restored.meta } };
    });
  },

  openPath: (path, currentPath) => {
    useTabsStore.setState((state) => ({
      paths: ensureHomeTab(withOpenedPath(state.paths, path, currentPath)),
    }));
  },

  closePath: (path, currentPath) => {
    let redirect: string | null = null;

    useTabsStore.setState((state) => {
      const result = closeTabPaths(state.paths, path, currentPath);

      redirect = result.redirect;

      return { paths: result.paths };
    });

    return redirect;
  },

  closeOthers: (anchorPath, currentPath) => {
    let redirect: string | null = null;

    useTabsStore.setState((state) => {
      const result = closeOtherTabPaths(state.paths, anchorPath, currentPath);

      redirect = result.redirect;

      return { paths: result.paths };
    });

    return redirect;
  },

  closeLeft: (anchorPath, currentPath) => {
    let redirect: string | null = null;

    useTabsStore.setState((state) => {
      const result = closeLeftTabPaths(state.paths, anchorPath, currentPath);

      redirect = result.redirect;

      return { paths: result.paths };
    });

    return redirect;
  },

  closeRight: (anchorPath, currentPath) => {
    let redirect: string | null = null;

    useTabsStore.setState((state) => {
      const result = closeRightTabPaths(state.paths, anchorPath, currentPath);

      redirect = result.redirect;

      return { paths: result.paths };
    });

    return redirect;
  },

  closeAll: (currentPath) => {
    let redirect: string | null = null;

    useTabsStore.setState((state) => {
      const result = closeAllTabPaths(state.paths, currentPath);

      redirect = result.redirect;

      return { paths: result.paths };
    });

    return redirect;
  },

  refreshPath: (path) => {
    useTabsStore.setState((state) => ({
      refreshSeq: {
        ...state.refreshSeq,
        [path]: (state.refreshSeq[path] ?? 0) + 1,
      },
    }));
  },

  syncMeta: (entries) => {
    if (Object.keys(entries).length === 0) return;

    useTabsStore.setState((state) => ({ meta: { ...state.meta, ...entries } }));
  },

  pruneTabs: (allowedPaths) => {
    useTabsStore.setState((state) => {
      const paths = ensureHomeTab(pruneTabPaths(state.paths, allowedPaths));
      // 同步清理已不在标签列表中的残留元数据
      const stale = Object.keys(state.meta).filter(
        (key) => !paths.includes(key),
      );

      if (paths === state.paths && stale.length === 0) return state;

      const meta =
        stale.length === 0
          ? state.meta
          : Object.fromEntries(
              Object.entries(state.meta).filter(([key]) => paths.includes(key)),
            );

      return { paths, meta };
    });
  },

  clearTabsCache: () => {
    // 仅清元数据快照；paths 不动（用户打开的标签不被关闭），持久化由订阅自动同步
    useTabsStore.setState({ meta: {} });
  },

  resetTabs: () => {
    useTabsStore.setState({ paths: [], meta: {}, refreshSeq: {} });
    writeStateToStorage([], {});
  },
}));

// 持久化：paths 或 meta 变化同步写 sessionStorage（refreshSeq 属临时态不参与）。
useTabsStore.subscribe((state, prevState) => {
  if (state.paths !== prevState.paths || state.meta !== prevState.meta) {
    writeStateToStorage(state.paths, state.meta);
  }
});
