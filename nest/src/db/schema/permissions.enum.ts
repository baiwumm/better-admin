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
  /** 图标（裸 lucide 图标名，如 'plus'；前端 DynamicIcon 直接消费，与 menus.icon 约定一致） */
  icon: string;
}

export const Permissions = {
  SEARCH: { value: 'SEARCH', label: 'search', bits: 1n, icon: 'search' },
  ADD: { value: 'ADD', label: 'add', bits: 2n, icon: 'plus' },
  EDIT: { value: 'EDIT', label: 'edit', bits: 4n, icon: 'pencil-line' },
  DELETE: { value: 'DELETE', label: 'delete', bits: 8n, icon: 'trash-2' },
  BATCH_DELETE: {
    value: 'BATCH_DELETE',
    label: 'batchDelete',
    bits: 16n,
    icon: 'list-x',
  },
  ADD_CHILD: {
    value: 'ADD_CHILD',
    label: 'addChild',
    bits: 32n,
    icon: 'git-branch-plus',
  },
  RESET: { value: 'RESET', label: 'reset', bits: 64n, icon: 'rotate-ccw' },
  RESET_PASSWORD: {
    value: 'RESET_PASSWORD',
    label: 'resetPassword',
    bits: 128n,
    icon: 'key-round',
  },
} as const satisfies Record<string, PermissionMeta>;

/** 超级管理员全量位（bigint 全 1 掩码，内部表示采用 -1n，见 database-design §1.1）。 */
export const SUPER_ADMIN_BITS = -1n;

/**
 * 超级管理员全量位的正数表示（2^63 - 1 = 9223372036854775807）。
 * 对外 JSON 传输统一使用该值（openapi 示例 `permissions: 9223372036854775807`），
 * 避免有符号 -1 造成前端 BigInt/位运算歧义（database-design v0.3 §1.1）。
 */
export const SUPER_ADMIN_BITS_POSITIVE = 9223372036854775807n;

/**
 * 将有符号 bigint 权限位归一化为正数无符号表示：
 * 仅对负数（全量位 -1n）映射为 2^63-1，其余值原样返回。
 * 用于对外输出（auth/me、menus.userPermissions、roles/:id/menus）。
 */
export function normalizePermissionBits(bits: bigint): bigint {
  return bits < 0n ? bits & SUPER_ADMIN_BITS_POSITIVE : bits;
}

/**
 * 判定用户是否拥有某权限位。
 *
 * @param userBits 用户聚合权限位（bigint）
 * @param requiredBit 所需权限位（bigint）
 * @returns 是否拥有该权限
 */
export function hasPermission(userBits: bigint, requiredBit: bigint): boolean {
  // 全量位识别：内部存储的有符号 -1n 与对外正数 2^63-1 均视为超级管理员全量
  if (userBits === -1n || userBits === SUPER_ADMIN_BITS_POSITIVE) return true;
  return (userBits & requiredBit) !== 0n;
}
