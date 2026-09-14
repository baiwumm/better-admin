import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  /**
   * 记住我：
   * - true：refreshToken 长效（默认 30d），前端持久化以便跨浏览器会话续期；
   * - false（缺省）：短会话（refreshToken 默认 1d），关闭浏览器后需重新登录。
   */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
