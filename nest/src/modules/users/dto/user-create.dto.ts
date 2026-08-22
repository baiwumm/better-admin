import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
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

  /** 关联角色 id 列表（用户 → 角色，多对多）。不传或空数组表示无角色。 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
