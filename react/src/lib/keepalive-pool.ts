/**
 * keepAlive 实例池管理（纯函数，无 React 依赖）。
 *
 * 从 KeepAliveOutlet 抽离以便独立单测；池语义：
 * - 所有已访问路径入池渲染（<Activity> 切换显隐）；
 * - 菜单 keepAlive === true 的页面 permanent 长驻保活；
 * - 其余 transient：仅为过渡期旧帧服务，导航提交后清理；
 * - 池上限 MAX_POOL_SIZE：优先淘汰最早的 transient，不足时在 permanent
 *   间做 LRU（dev 下告警一次——keepAlive 菜单过多通常意味着配置失当）。
 */

/** 实例池上限。 */
export const MAX_POOL_SIZE = 10;

export type PoolEntry = {
  /** 路由完整路径（池键）。 */
  path: string;
  /** 是否永久驻留（菜单 keepAlive 命中）。 */
  permanent: boolean;
};

/** 构造池条目。 */
export function makePoolEntry(
  path: string,
  keepAlivePaths: ReadonlySet<string>,
): PoolEntry {
  return { path, permanent: keepAlivePaths.has(path) };
}

let oversizeWarned = false;

/**
 * 渲染期登记「呈现中的路径」（覆盖首次挂载），并治理池容量：
 * 1. displayedPath 不在池中 → 追加；
 * 2. 超限 → 先淘汰最早的、既非呈现中又非目标路径的 transient；
 * 3. 仍超限 → 在 permanent 间 LRU（淘汰最早的非呈现/非目标项），
 *    并在 dev 下告警一次。
 *
 * 纯函数：无需变更时返回原数组引用（配合 setState 引用比较跳过更新）。
 */
export function registerDisplayed(
  pool: PoolEntry[],
  displayedPath: string,
  pathname: string,
  keepAlivePaths: ReadonlySet<string>,
): PoolEntry[] {
  const next = pool.some((entry) => entry.path === displayedPath)
    ? [...pool]
    : [...pool, makePoolEntry(displayedPath, keepAlivePaths)];

  trimPool(next, displayedPath, pathname);

  // 无实质变更时返回原引用（配合 setState 引用比较跳过更新）。
  return sameEntries(pool, next) ? pool : next;
}

/**
 * 导航提交（flushSync 内）调用：清理临时成员（仅保留 permanent 与目标
 * 页），并确保目标页在池中。纯函数：无变更时返回原引用。
 */
export function commitNavigation(
  pool: PoolEntry[],
  pathname: string,
  keepAlivePaths: ReadonlySet<string>,
): PoolEntry[] {
  let next = pool.filter((entry) => entry.permanent || entry.path === pathname);

  if (!next.some((entry) => entry.path === pathname)) {
    next = [...next, makePoolEntry(pathname, keepAlivePaths)];
  }

  // 无实质变更时返回原引用（配合 setState 引用比较跳过更新）。
  return sameEntries(pool, next) ? pool : next;
}

/** 原地裁剪：先淘汰 transient，仍超限再淘汰 permanent（LRU，dev 告警一次）。 */
function trimPool(
  entries: PoolEntry[],
  displayedPath: string,
  pathname: string,
): void {
  while (entries.length > MAX_POOL_SIZE) {
    const victimIdx = entries.findIndex(
      (entry) =>
        !entry.permanent &&
        entry.path !== displayedPath &&
        entry.path !== pathname,
    );

    if (victimIdx === -1) break;

    removeAt(entries, victimIdx);
  }

  while (entries.length > MAX_POOL_SIZE) {
    const victimIdx = entries.findIndex(
      (entry) =>
        entry.permanent &&
        entry.path !== displayedPath &&
        entry.path !== pathname,
    );

    if (victimIdx === -1) break;

    removeAt(entries, victimIdx);

    if (import.meta.env.DEV && !oversizeWarned) {
      oversizeWarned = true;
      // eslint-disable-next-line no-console -- 开发期一次性诊断信息
      console.warn(
        `[KeepAlive] 永久保活页面超过 ${MAX_POOL_SIZE} 个，已按 LRU 淘汰最久未访问项。` +
          "如需全部长驻请评估 MAX_POOL_SIZE 或减少菜单 keepAlive 配置。",
      );
    }
  }
}

function removeAt(entries: PoolEntry[], index: number): void {
  entries.splice(index, 1);
}

/** 浅比较条目序列是否完全一致（长度 + 逐项 path/permanent）。 */
function sameEntries(
  a: readonly PoolEntry[],
  b: readonly PoolEntry[],
): boolean {
  if (a.length !== b.length) return false;

  return a.every((entry, i) => {
    const other = b[i];

    return (
      other !== undefined &&
      entry.path === other.path &&
      entry.permanent === other.permanent
    );
  });
}
