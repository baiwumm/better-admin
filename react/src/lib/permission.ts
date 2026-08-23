import { type MenuNode } from "@/lib/api-types";

/**
 * 解析 bigint 位掩码字符串（超级管理员内部为 -1n，输出统一归一化为
 * 9223372036854775807 的正数全 1 掩码，见 nest normalizePermissionBits）。
 * 解析失败返回 null。
 */
export function parsePermissionBits(
  bits: string | null | undefined,
): bigint | null {
  if (bits === null || bits === undefined || bits === "") return null;
  try {
    return BigInt(bits);
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
 * 操作级权限判断（业务页按钮显隐用）：
 * hasPermission(userBits, requiredBits)，例如 hasPermission(bits, 1n << 4n)。
 */
export function hasPermission(
  userBits: string | null | undefined,
  requiredBits: bigint,
): boolean {
  const bits = parsePermissionBits(userBits);

  if (bits === null) return false;

  return (bits & requiredBits) === requiredBits;
}
