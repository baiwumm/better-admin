import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

/** PUT /api/users/:id 请求体（与 UserUpdateRequest 对齐，不允许改密码） */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  /** 关联角色 id 列表（全量替换：传入空数组/不传即清空该用户角色关联）。最多 5 个。 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  roleIds?: string[];
}
