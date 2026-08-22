import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

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
}
