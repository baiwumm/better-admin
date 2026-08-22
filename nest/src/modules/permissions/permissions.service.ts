import { Injectable } from '@nestjs/common';
import { Permissions as PermissionsEnum } from '../../db/schema/permissions.enum';

/** 返回给前端的权限点项结构（与 openapi.yaml PermissionItem 一致） */
export interface PermissionItem {
  value: string;
  label: string;
  bits: number;
  icon: string;
}

@Injectable()
export class PermissionsService {
  /**
   * 返回 PERMISSIONS 全量枚举列表。
   * 直接从 permissions.enum.ts 读取（编译期常量），不查询数据库。
   * bits 为 bigint，转换为 number 返回（当前所有位 ≤ 128，安全范围内）。
   */
  list(): PermissionItem[] {
    return (Object.values(PermissionsEnum) as { value: string; label: string; bits: bigint; icon: string }[]).map(
      (p) => ({
        value: p.value,
        label: p.label,
        bits: Number(p.bits),
        icon: p.icon,
      }),
    );
  }
}
