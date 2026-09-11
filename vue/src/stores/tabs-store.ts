import { ref, watch } from "vue";
import { defineStore } from "pinia";

import {
  closeAllTabPaths,
  closeLeftTabPaths,
  closeOtherTabPaths,
  closeRightTabPaths,
  closeTabPaths,
  ensureHomeTab,
  moveTabPath,
  parseStoredTabs,
  pruneTabPaths,
  type TabMetaSnapshot,
  withOpenedPath,
} from "@/lib/tabs-model";

const TABS_STORAGE_KEY = "better-admin-tabs";

/** 从 sessionStorage 恢复标签与元数据快照（刷新后立即渲染中文标题，不等菜单接口）。 */
function readStateFromStorage(): {
  paths: string[];
  meta: Record<string, TabMetaSnapshot>;
} {
  if (typeof window === "undefined") return { paths: [], meta: {} };

  try {
    return parseStoredTabs(window.sessionStorage.getItem(TABS_STORAGE_KEY));
  } catch {
    return { paths: [], meta: {} };
  }
}

function writeStateToStorage(
  paths: string[],
  meta: Record<string, TabMetaSnapshot>,
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      TABS_STORAGE_KEY,
      JSON.stringify({ paths, meta }),
    );
  } catch {
    // 存储不可用时标签仅会话内存生效
  }
}

/**
 * 多标签页 store（对齐 React 端 tabs-store，Pinia 实现）：
 * - paths：已打开且未关闭的路径序列（插入序即展示序，控制台经 ensureHomeTab 恒在首位）；
 * - meta：标题 / 图标快照（菜单就绪时写入并持久化，刷新恢复后无需等菜单接口）；
 * - refreshSeq：刷新计数器（KeepAliveOutlet 以 key 变化强制重挂载实现「刷新」，临时态不持久化）；
 * - close* 系列返回需要导航的目标（null = 无需导航），由调用方执行导航（store 不耦合路由器）。
 */
export const useTabsStore = defineStore("tabs", () => {
  const initial = readStateFromStorage();

  const paths = ref<string[]>(ensureHomeTab(initial.paths));
  const meta = ref<Record<string, TabMetaSnapshot>>(initial.meta);
  const refreshSeq = ref<Record<string, number>>({});

  // 持久化：paths 或 meta 变化同步写 sessionStorage（refreshSeq 属临时态不参与）
  watch([paths, meta], ([nextPaths, nextMeta]) => {
    writeStateToStorage(nextPaths, nextMeta);
  });

  /** 打开标签（去重追加 + 数量治理 + 控制台首位保证）。 */
  function openPath(path: string, currentPath: string): void {
    const next = ensureHomeTab(withOpenedPath(paths.value, path, currentPath));

    if (next !== paths.value) paths.value = next;
  }

  /** 拖拽排序：将标签移动到目标下标（固定标签不可移动、首位不可被占据）。 */
  function moveTab(path: string, targetIndex: number): void {
    const next = moveTabPath(paths.value, path, targetIndex);

    if (next !== paths.value) paths.value = next;
  }

  function applyClose(result: {
    paths: string[];
    redirect: string | null;
  }): string | null {
    if (result.paths !== paths.value) paths.value = result.paths;

    return result.redirect;
  }

  /** 关闭单个标签；返回需要导航的目标（null = 无需导航）。 */
  function closePath(path: string, currentPath: string): string | null {
    return applyClose(closeTabPaths(paths.value, path, currentPath));
  }

  /** 关闭其他（仅保留固定标签与锚点）；返回值语义同 closePath。 */
  function closeOthers(anchorPath: string, currentPath: string): string | null {
    return applyClose(closeOtherTabPaths(paths.value, anchorPath, currentPath));
  }

  /** 关闭左侧；返回值语义同 closePath。 */
  function closeLeft(anchorPath: string, currentPath: string): string | null {
    return applyClose(closeLeftTabPaths(paths.value, anchorPath, currentPath));
  }

  /** 关闭右侧；返回值语义同 closePath。 */
  function closeRight(anchorPath: string, currentPath: string): string | null {
    return applyClose(closeRightTabPaths(paths.value, anchorPath, currentPath));
  }

  /** 全部关闭（仅保留固定标签）；返回值语义同 closePath。 */
  function closeAll(currentPath: string): string | null {
    return applyClose(closeAllTabPaths(paths.value, currentPath));
  }

  /** 刷新标签对应页面（强制销毁并重建组件实例）。 */
  function refreshPath(path: string): void {
    refreshSeq.value = {
      ...refreshSeq.value,
      [path]: (refreshSeq.value[path] ?? 0) + 1,
    };
  }

  /** 合并标题/图标快照（菜单就绪后调用；新值覆盖旧值，文案变更自动跟随）。 */
  function syncMeta(entries: Record<string, TabMetaSnapshot>): void {
    if (Object.keys(entries).length === 0) return;

    meta.value = { ...meta.value, ...entries };
  }

  /** 权限治理：移除不可达标签及其元数据（恢复 / 权限变更后调用）。 */
  function pruneTabs(
    allowedPaths: ReadonlySet<string>,
    allowPrefixes?: readonly string[],
  ): void {
    const nextPaths = ensureHomeTab(
      pruneTabPaths(paths.value, allowedPaths, allowPrefixes),
    );
    const stale = Object.keys(meta.value).filter(
      (key) => !nextPaths.includes(key),
    );

    if (nextPaths === paths.value && stale.length === 0) return;

    if (nextPaths !== paths.value) paths.value = nextPaths;

    if (stale.length > 0) {
      meta.value = Object.fromEntries(
        Object.entries(meta.value).filter(([key]) => nextPaths.includes(key)),
      );
    }
  }

  /** 清空标题快照缓存（语言切换时调用）：标签列表保留，TagsBar 回退实时菜单名称。 */
  function clearTabsCache(): void {
    meta.value = {};
  }

  /** 清空（登出 / 会话失效时调用）。 */
  function resetTabs(): void {
    paths.value = [];
    meta.value = {};
    refreshSeq.value = {};
    writeStateToStorage([], {});
  }

  return {
    paths,
    meta,
    refreshSeq,
    openPath,
    moveTab,
    closePath,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    refreshPath,
    syncMeta,
    pruneTabs,
    clearTabsCache,
    resetTabs,
  };
});
