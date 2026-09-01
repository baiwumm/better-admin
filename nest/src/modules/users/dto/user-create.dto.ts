import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /api/users 请求体（与 UserCreateRequest 对齐） */
export class CreateUserDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled' = 'active';

  /** 关联角色 id 列表（用户 → 角色，多对多）。不传或空数组表示无角色。最多 5 个。 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  roleIds?: string[];

  /**
   * 组织与权限中心关联（v1.6.0，可空向前兼容）：
   * deptId 所属组织（须存在且启用）/ employeeNo 工号 / entryDate 入职日期（YYYY-MM-DD）/
   * employmentStatus 在职状态 / postIds 关联岗位（全量替换，须存在且启用，最多 20 个）/
   * mainPostId 主岗（须在 postIds 中）。
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

  /** 性别（v1.6.0 阶段 2 补充；male 男 / female 女，null = 未设置） */
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
