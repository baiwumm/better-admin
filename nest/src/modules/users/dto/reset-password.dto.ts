import { IsString } from 'class-validator';
import { IsPolicyPassword } from '../../../common/validators/password-policy';

/** POST /api/users/:id/reset-password 请求体 */
export class ResetPasswordDto {
  /** 密码策略见 common/validators/password-policy（契约 v1.8.0）；含用户名 / 与原密码相同的检查在 service 层 */
  @IsString()
  @IsPolicyPassword()
  newPassword!: string;
}
