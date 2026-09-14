import { SetMetadata } from '@nestjs/common';

/**
 * 权限位元数据 key（PermissionsGuard 通过 Reflector 读取）。
 * 存储值为所需权限位名数组（如 ['ADD']），由 Permissions 枚举解析为 bigint。
 */
export const PERMISSIONS_KEY = 'better_admin_permissions';

/**
 * @Permissions('ADD') / @Permissions('EDIT', 'DELETE')
 * 标注某个 Controller 或 Handler 所需的权限位。
 * 在 PermissionsGuard 中与 req.user.permissions 聚合位做 & 校验。
 */
export const Permissions = (...bits: string[]) =>
  SetMetadata(PERMISSIONS_KEY, bits);
