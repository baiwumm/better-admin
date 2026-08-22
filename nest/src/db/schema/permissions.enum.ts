/**
 * 权限点枚举（位掩码方案，详见 database-design.md §1）
 *
 * 权限点不是「数据库行 + 关联表」，而是编译期常量枚举 + 整型位掩码。
 * 每个操作占一个 bit（1 << n），前端按钮显隐与后端 @Permissions 守卫
 * 共用同一套位做 `&` 校验（服务端强制授权）。
 *
 * 超级管理员全量位：
 *   使用全 1 掩码表示「拥有全部权限」。在有符号 bigint 视角下即 -1n，
 *   正数视角为 9223372036854775807（所有 bit 置 1）。
 *   hasPermission 中识别 -1n 为全量权限，确保新增权限点时无需修改种子数据。
 */

export interface PermissionMeta {
  /** 枚举键名，如 'ADD' */
  value: string;
  /** 下发前端的标签，如 'add' */
  label: string;
  /** 位掩码值（bigint） */
  bits: bigint;
  /** 图标，如 'lucide:plus' */
  icon: string;
}

export const Permissions = {
  SEARCH: { value: 'SEARCH', label: 'search', bits: 1n, icon: 'lucide:search' },
  ADD: { value: 'ADD', label: 'add', bits: 2n, icon: 'lucide:plus' },
  EDIT: { value: 'EDIT', label: 'edit', bits: 4n, icon: 'lucide:pencil-line' },
  DELETE: { value: 'DELETE', label: 'delete', bits: 8n, icon: 'lucide:trash-2' },
  BATCH_DELETE: {
    value: 'BATCH_DELETE',
    label: 'batchDelete',
    bits: 16n,
    icon: 'i-lucide-list-x',
  },
  ADD_CHILD: {
    value: 'ADD_CHILD',
    label: 'addChild',
    bits: 32n,
    icon: 'lucide:git-branch-plus',
  },
  RESET: { value: 'RESET', label: 'reset', bits: 64n, icon: 'lucide:rotate-ccw' },
  SETTINGS_UPDATE: {
    value: 'SETTINGS_UPDATE',
    label: 'settingsUpdate',
    bits: 128n,
    icon: 'lucide:settings',
  },
} as const satisfies Record<string, PermissionMeta>;

/** 超级管理员全量位（bigint 全 1 掩码）。 */
export const SUPER_ADMIN_BITS = -1n;

/**
 * 判定用户是否拥有某权限位。
 *
 * @param userBits 用户聚合权限位（bigint）
 * @param requiredBit 所需权限位（bigint）
 * @returns 是否拥有该权限
 */
export function hasPermission(userBits: bigint, requiredBit: bigint): boolean {
  if (userBits === -1n) return true;
  return (userBits & requiredBit) !== 0n;
}
