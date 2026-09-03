/**
 * 多标签页状态管理纯函数（无 React / store / 路由依赖）。
 *
 * 从 tags-store 抽离以便独立单测（对齐 keepalive-pool 的工程模式）：
 * - 标签以 pathname 为键（与 KeepAliveOutlet 池键、菜单匹配、权限校验一致，
 *   search 变化不新开标签）；
 * - 控制台（HOME_TAB_PATH）为固定标签：恒在首位、不可关闭；
 * - 所有 close* 操作统一返回 { paths, redirect }：redirect 非空表示被关闭的
 *   是当前所在页面，需要导航到回退目标（右侧第一个幸存者 → 左侧最后一个
 *   幸存者 → 固定首页），由调用方负责执行导航（store 不耦合路由器）；
 * - MAX_OPEN_TABS 为打开数量软上限：超出时淘汰最早的可关闭且非当前/
 *   非目标项（保活实例上限另由 keepalive-pool 独立治理）。
 */

/** 固定标签路径（控制台）：恒在首位、不可关闭。 */
export const HOME_TAB_PATH = "/";

/** 打开标签数量软上限。 */
export const MAX_OPEN_TABS = 16;

/**
 * 标签元数据快照（菜单就绪时写入；用于刷新后立即渲染中文标题）。
 * parentTitle：动态路由详情页（如公告详情）写入的面包屑父级名，
 * 供面包屑渲染「父级 > 具体标题」两级结构；普通标签不写。
 */
export type TabMetaSnapshot = {
  title?: string;
  icon?: string;
  parentTitle?: string;
};

/** 变更结果：paths 为新标签序列；redirect 为需要导航的目标（null = 不需要）。 */
export type TabsMutationResult = {
  paths: string[];
  redirect: string | null;
};

/**
 * 保证控制台固定标签存在于首位（标签栏至少有一个标签）。
 * 覆盖：sessionStorage 恢复为空 / 恢复内容缺失首页 / 登出重置后再进入等场景。
 */
export function ensureHomeTab(paths: string[]): string[] {
  if (paths.includes(HOME_TAB_PATH)) return paths;

  return [HOME_TAB_PATH, ...paths];
}

/** 是否固定标签（控制台）。 */
export function isPinnedTab(path: string): boolean {
  return path === HOME_TAB_PATH;
}

/**
 * 打开标签：去重追加 + 数量治理（超上限时淘汰最早的
 * 「可关闭 且 非当前显示 且 非目标」项）。
 */
export function withOpenedPath(
  paths: string[],
  nextPath: string,
  currentPath: string,
): string[] {
  if (paths.includes(nextPath)) return paths;

  let next = [...paths, nextPath];

  while (next.length > MAX_OPEN_TABS) {
    const victim = next.find(
      (p) => !isPinnedTab(p) && p !== currentPath && p !== nextPath,
    );

    if (victim === undefined) break;

    next = next.filter((p) => p !== victim);
  }

  return next;
}

/**
 * 回退目标选择：优先取原数组中位于「被关闭的当前页」之后的第一位幸存者
 * （右侧语义），否则取最后一位幸存者（左侧末尾），无幸存者返回 null
 * （由调用方兜底跳固定首页）。
 */
function pickFallback(
  before: readonly string[],
  remaining: readonly string[],
  removedIndex: number,
): string | null {
  const survivors = new Set(remaining);

  for (let i = removedIndex + 1; i < before.length; i += 1) {
    const candidate = before[i];

    if (candidate !== undefined && survivors.has(candidate)) return candidate;
  }

  return remaining[remaining.length - 1] ?? null;
}

/** 统一移除管道：按目标集合过滤并计算回退目标。 */
function removePaths(
  paths: string[],
  targets: ReadonlySet<string>,
  currentPath: string,
): TabsMutationResult {
  const hasTarget = [...targets].some((t) => paths.includes(t));

  if (!hasTarget) return { paths, redirect: null };

  const remaining = paths.filter((p) => !targets.has(p));
  const currentIndex = paths.indexOf(currentPath);
  const redirect =
    targets.has(currentPath) && currentIndex >= 0
      ? pickFallback(paths, remaining, currentIndex)
      : null;

  return { paths: remaining, redirect };
}

/** 关闭单个标签。 */
export function closeTabPaths(
  paths: string[],
  targetPath: string,
  currentPath: string,
): TabsMutationResult {
  if (isPinnedTab(targetPath)) return { paths, redirect: null };

  return removePaths(paths, new Set([targetPath]), currentPath);
}

/** 关闭其他：仅保留固定标签与锚点标签。 */
export function closeOtherTabPaths(
  paths: string[],
  anchorPath: string,
  currentPath: string,
): TabsMutationResult {
  if (!paths.includes(anchorPath)) return { paths, redirect: null };

  const targets = new Set(
    paths.filter((p) => !isPinnedTab(p) && p !== anchorPath),
  );

  return removePaths(paths, targets, currentPath);
}

/** 关闭左侧：移除锚点之前（不含锚点）的可关闭标签。 */
export function closeLeftTabPaths(
  paths: string[],
  anchorPath: string,
  currentPath: string,
): TabsMutationResult {
  const idx = paths.indexOf(anchorPath);

  // 锚点不存在，或左侧没有可关闭标签（首位 / 仅剩固定标签）
  if (idx <= 0 || (idx === 1 && isPinnedTab(paths[0] ?? ""))) {
    return { paths, redirect: null };
  }

  const targets = new Set(paths.slice(0, idx).filter((p) => !isPinnedTab(p)));

  return removePaths(paths, targets, currentPath);
}

/** 关闭右侧：移除锚点之后（不含锚点）的可关闭标签。 */
export function closeRightTabPaths(
  paths: string[],
  anchorPath: string,
  currentPath: string,
): TabsMutationResult {
  const idx = paths.indexOf(anchorPath);

  // 锚点不存在或已是最后一位：无可关闭项
  if (idx === -1 || idx >= paths.length - 1) {
    return { paths, redirect: null };
  }

  const targets = new Set(paths.slice(idx + 1).filter((p) => !isPinnedTab(p)));

  return removePaths(paths, targets, currentPath);
}

/** 全部关闭：仅保留固定标签。 */
export function closeAllTabPaths(
  paths: string[],
  currentPath: string,
): TabsMutationResult {
  const targets = new Set(paths.filter((p) => !isPinnedTab(p)));

  return removePaths(paths, targets, currentPath);
}

/**
 * 权限治理：移除不在可达集合中的标签（登录恢复 / 权限变更后清理残留）。
 * 固定标签始终保留（控制台为登录白名单）；
 * 命中 allowPrefixes 前缀的登录可达路由（如通知详情）同样豁免——
 * 用户显式打开的标签不应被菜单加载后的治理误删。
 */
export function pruneTabPaths(
  paths: string[],
  allowedPaths: ReadonlySet<string>,
  allowPrefixes: readonly string[] = [],
): string[] {
  const next = paths.filter(
    (p) =>
      allowedPaths.has(p) ||
      isPinnedTab(p) ||
      allowPrefixes.some((prefix) => p.startsWith(prefix)),
  );

  return sameStrings(next, paths) ? paths : next;
}

/**
 * 解析 sessionStorage 持久化内容（容错：非 JSON / 非法项一律剔除，
 * 路径去重保持首次出现顺序，并保证控制台固定标签在首位）。
 */
export function parseStoredTabs(raw: string | null): {
  paths: string[];
  meta: Record<string, TabMetaSnapshot>;
} {
  const empty = { paths: [] as string[], meta: {} };

  if (!raw) return empty;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { paths?: unknown }).paths)
  ) {
    return empty;
  }

  const rawPaths = (parsed as { paths: unknown[] }).paths;
  const seen = new Set<string>();
  const paths: string[] = [];

  for (const item of rawPaths) {
    if (typeof item !== "string" || !item.startsWith("/") || seen.has(item)) {
      continue;
    }

    seen.add(item);
    paths.push(item);
  }

  // 元数据快照：仅接受 { title?, icon? } 形态
  const meta: Record<string, TabMetaSnapshot> = {};
  const rawMeta = (parsed as { meta?: unknown }).meta;

  if (typeof rawMeta === "object" && rawMeta !== null) {
    for (const [key, value] of Object.entries(
      rawMeta as Record<string, unknown>,
    )) {
      if (
        !seen.has(key) ||
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        continue;
      }

      const entry: TabMetaSnapshot = {};
      const candidate = value as Record<string, unknown>;

      if (typeof candidate.title === "string") entry.title = candidate.title;
      if (typeof candidate.icon === "string") entry.icon = candidate.icon;

      if (entry.title !== undefined || entry.icon !== undefined) {
        meta[key] = entry;
      }
    }
  }

  return { paths: ensureHomeTab(paths), meta };
}

/** 浅比较字符串数组是否完全一致（无需变更时返回原引用跳过更新）。 */
function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;

  return a.every((value, i) => value === b[i]);
}
