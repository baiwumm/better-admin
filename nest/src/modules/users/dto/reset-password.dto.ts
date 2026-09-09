import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /api/users/:id/reset-password 请求体 */
export class ResetPasswordDto {
  /** 6-72 位：72 为 bcrypt 输入上限，超出部分哈希时被截断忽略（契约 v1.7.3） */
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword!: string;
}
