/**
 * 统一权限判断工具。
 * 后端权限模型：bigint 位掩码（PERMISSIONS 位），超级管理员为全 1 掩码。
 * 后端将超管位归一化为正数全 1 掩码 9223372036854775807（字符串）下发，
 * 内部存储为 -1n；此处两种形态均按“全量权限”处理。
 */

export const SUPER_ADMIN_BITS = BigInt('9223372036854775807')

/** 权限点位值（与后端 permissions.enum.ts / openapi.yaml 一致） */
export const PERMISSIONS = {
  SEARCH: 1,
  ADD: 2,
  EDIT: 4,
  DELETE: 8,
  BATCH_DELETE: 16,
  ADD_CHILD: 32,
  RESET: 64,
  SETTINGS_UPDATE: 128,
} as const

export type PermissionKey = keyof typeof PERMISSIONS

/**
 * 判断用户权限位是否包含 requiredBit。
 * - permissions 为空 / 0，返回 false；
 * - 超级管理员（全 1 掩码或 -1n）直接放行；
 * - 否则按位与判断。
 */
export function hasPermission(
  userPermissions: string | number | bigint | undefined | null,
  requiredBit: number
): boolean {
  if (userPermissions === undefined || userPermissions === null) return false
  const userBits = BigInt(userPermissions)
  const required = BigInt(requiredBit)
  if (userBits === SUPER_ADMIN_BITS || userBits === BigInt(-1)) return true
  return (userBits & required) !== BigInt(0)
}
