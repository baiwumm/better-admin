import { IsArray, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 单个角色菜单授权位。
 * permissions 为整数字符串（位掩码），以字符串传输避免 JS 精度丢失；
 * -1 代表全量位（super_admin）。后续统一在 Service 层校验是否仅含合法权限位。
 */
export class RoleMenuPermissionDto {
  @IsString()
  menuId!: string;

  @IsString()
  @Matches(/^-?\d+$/, { message: 'permissions 必须为整数位掩码' })
  permissions!: string;
}

/** PUT /api/roles/:id/menus 请求体（全量替换） */
export class RoleMenusUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleMenuPermissionDto)
  menus!: RoleMenuPermissionDto[];
}
