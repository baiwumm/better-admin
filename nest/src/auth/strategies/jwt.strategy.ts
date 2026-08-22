import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, AuthUser } from '../auth.service';

interface AuthJwtPayload {
  sub: string;
  username: string;
  type?: 'access' | 'refresh';
}

/**
 * JWT 策略：从 Authorization: Bearer 提取 access token，
 * 校验后从 users 表加载用户（含 roles 与 permissions 聚合位），挂载到 req.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'better-admin-secret',
    });
  }

  async validate(payload: AuthJwtPayload): Promise<AuthUser> {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '无效的访问令牌',
      });
    }
    const user = await this.authService.loadUserWithPermissions(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '用户不存在或令牌无效',
      });
    }
    return user;
  }
}
