import { IsString, MinLength } from 'class-validator';

/** POST /api/users/:id/reset-password 请求体 */
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
