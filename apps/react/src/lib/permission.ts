import { type MenuNode } from "@/lib/api-types";

/**
 * 解析 bigint 位掩码（兼容 string | number，方案 A）。
 * 后端契约 permissions 为 integer，但实际以字符串形式下发以避免精度丢失；
 * 前端统一归一化：number 先 String() 再 BigInt，解析失败返回 null。
 * 超级管理员内部为 -1n，输出统一归一化为 9223372036854775807 的正数全 1 掩码，
 * 见 nest normalizePermissionBits。
 */
export function parsePermissionBits(
  bits: string | number | null | undefined,
): bigint | null {
  if (bits === null || bits === undefined || bits === "") return null;
  // number 归一化为 string（避免 BigInt(number) 在超大整数下的精度问题）
  const normalized = typeof bits === "number" ? String(bits) : bits;

  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

/**
 * 当前用户是否具备某菜单的访问权：
 * - userPermissions 为空（未下发，开发期 Mock/兼容）→ 视为可见；
 * - 否则要求至少一个授权位（位掩码非 0）。
 */
export function canAccessMenu(menu: MenuNode): boolean {
  if (!menu.enabled) return false;
  const bits = parsePermissionBits(menu.userPermissions);

  if (bits === null) return true;

  return bits !== 0n;
}

/**
 * 递归过滤当前用户无权访问的菜单节点；
 * 分组下无任何可见子项时整组隐藏（避免出现空分组）。
 */
export function filterAccessibleMenus(nodes: MenuNode[]): MenuNode[] {
  const result: MenuNode[] = [];

  for (const node of nodes) {
    if (!canAccessMenu(node)) continue;
    if (node.children?.length) {
      const children = filterAccessibleMenus(node.children);

      if (children.length === 0) continue;
      result.push({ ...node, children });
    } else {
      result.push(node);
    }
  }

  return result;
}

/**
 * 递归过滤不应在侧边栏展示的菜单节点（hideInMenu）。
 * 注意：仅用于侧边栏渲染；路由守卫仍使用完整树（含 hideInMenu 节点），
 * 使隐藏页保持「菜单不显示但直接访问可通行」。
 */
export function filterHiddenMenus(nodes: MenuNode[]): MenuNode[] {
  const result: MenuNode[] = [];

  for (const node of nodes) {
    if (node.hideInMenu) continue;
    if (node.children?.length) {
      const children = filterHiddenMenus(node.children);

      if (children.length === 0) continue;
      result.push({ ...node, children });
    } else {
      result.push(node);
    }
  }

  return result;
}

/**
 * 操作级权限判断（业务页按钮显隐用）：
 * hasPermission(userBits, requiredBits)，例如 hasPermission(bits, 1n << 4n)。
 *
 * 语义与后端对齐：用户拥有 requiredBits 中的任意一个 bit 即通过（OR）。
 * 同时识别 super_admin 全量位（9223372036854775807）。
 */
export function hasPermission(
  userBits: string | number | bigint | null | undefined,
  requiredBits: bigint,
): boolean {
  const bits =
    typeof userBits === "bigint" ? userBits : parsePermissionBits(userBits);

  if (bits === null) return false;

  // super_admin 全量位识别（与后端 normalizePermissionBits 输出对齐）
  if (bits === 9223372036854775807n) return true;

  return (bits & requiredBits) !== 0n;
}
