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
import { type TransformFnParams, Transform } from 'class-transformer';

/** trim 后入库：与前端 zod .trim() 口径一致，空格参与唯一索引/保护比较属于脏数据 */
const trimTransform = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST /api/users 请求体（与 UserCreateRequest 对齐） */
export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(trimTransform)
  username!: string;

  @IsEmail()
  @MaxLength(100)
  email!: string;

  /** 6-72 位：72 为 bcrypt 输入上限，超出部分哈希时被截断忽略（契约 v1.7.3） */
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(trimTransform)
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
