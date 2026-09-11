/**
 * 列设置持久化纯函数（对齐 React 端 data-table-view-options 内同名逻辑）。
 *
 * storage key 规则：`column-setting:{userId}:{routePath}`（按用户 + 路由路径共享，
 * 不含查询参数），存 `{ hidden, order }`；兼容 v1 旧格式（纯字符串数组，仅隐藏列）。
 * 两端 key 与结构一致，同一浏览器下 React / Vue 端可互读。
 */

export function buildColumnSettingKey(userId: string, routePath: string) {
  return `column-setting:${userId}:${routePath}`;
}

/** 持久化结构：隐藏列 id + 可隐藏列的展示顺序 */
export interface ColumnSettingStore {
  hidden: string[];
  order: string[];
}

const EMPTY: ColumnSettingStore = { hidden: [], order: [] };

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** 解析持久化原文（schema 校验 + v1 旧格式兼容；非法输入回退空设置）。 */
export function parseColumnSetting(raw: string | null): ColumnSettingStore {
  if (!raw) return { ...EMPTY };

  try {
    const parsed: unknown = JSON.parse(raw);

    // v1 旧格式：字符串数组（仅隐藏列）
    if (isStringArray(parsed)) return { hidden: parsed, order: [] };

    if (
      parsed &&
      typeof parsed === "object" &&
      "hidden" in parsed &&
      "order" in parsed &&
      isStringArray(parsed.hidden) &&
      isStringArray(parsed.order)
    ) {
      return { hidden: parsed.hidden, order: parsed.order };
    }

    return { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

/** 读取持久化列设置（存储不可用时回退空设置）。 */
export function readColumnSetting(storageKey: string): ColumnSettingStore {
  try {
    return parseColumnSetting(localStorage.getItem(storageKey));
  } catch {
    return { ...EMPTY };
  }
}

/**
 * 写入列设置：全默认（无隐藏且顺序未调整）时清除存储，否则落盘。
 * 存储不可用时忽略（列设置退化为会话内生效）。
 */
export function writeColumnSetting(
  storageKey: string,
  store: ColumnSettingStore,
  isDefault: boolean,
): void {
  try {
    if (isDefault) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(store));
    }
  } catch {
    // 忽略存储异常
  }
}

/**
 * 持久化顺序 → 面板顺序：过滤掉列定义中已删除的 id，新增列按默认顺序追加到末尾。
 */
export function restoreColumnOrder(
  storedOrder: string[],
  hideableIds: string[],
): string[] {
  const hideableIdSet = new Set(hideableIds);
  const valid = storedOrder.filter((id) => hideableIdSet.has(id));

  return [...valid, ...hideableIds.filter((id) => !valid.includes(id))];
}

/**
 * 把面板内的可隐藏列顺序合并回全量 leaf 列顺序：
 * 不可隐藏的功能性列（行选择 / 操作等）保持原位，可隐藏列按面板顺序依次占据其默认槽位。
 */
export function mergeColumnOrder(
  allIds: string[],
  hideableOrder: string[],
  isHideable: (id: string) => boolean,
): string[] {
  const queue = [...hideableOrder];

  return allIds.map((id) => (isHideable(id) ? (queue.shift() ?? id) : id));
}
