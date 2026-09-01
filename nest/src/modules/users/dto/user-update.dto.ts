import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Matches } from 'class-validator';

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

  /**
   * 组织与权限中心关联（v1.6.0，全部可空向前兼容）：
   * - deptId：所属组织（须存在且启用；null = 清空）；
   * - employeeNo：工号；
   * - entryDate：入职日期（YYYY-MM-DD）；
   * - employmentStatus：在职状态（employed / resigned；null = 回到存量默认在职）；
   * - postIds：关联岗位 id 列表（全量替换，同 roleIds 语义；须存在且启用）；
   * - mainPostId：主岗（须在 postIds 中；空串/null = 无主岗）。
   */
  @IsOptional()
  @IsString()
  deptId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeNo?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  entryDate?: string | null;

  /** 性别（v1.6.0 阶段 2 补充；undefined 不修改 / null 清空为未设置） */
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female' | null;

  @IsOptional()
  @IsIn(['employed', 'resigned'])
  employmentStatus?: 'employed' | 'resigned' | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  postIds?: string[];

  @IsOptional()
  @IsString()
  mainPostId?: string | null;
}
