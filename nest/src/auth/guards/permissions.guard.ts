import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permissions as PermissionsEnum, SUPER_ADMIN_BITS_POSITIVE, hasPermission } from '../../db/schema/permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../auth.service';

/**
 * 权限守卫。
 * 读取 Handler/Controller 上的 @Permissions(...) 元数据（所需位名数组），
 * 与 req.user.permissions 聚合位做位掩码校验。
 *
 * - 无 @Permissions 元数据：放行（无权限要求，是否鉴权由 AuthGuard 决定）。
 * - userBits === -1n（super_admin 全量位）：直接放行。
 * - 否则执行 (userBits & requiredBit) !== 0n 校验。
 * - 校验失败：403 Forbidden（code = FORBIDDEN）。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredBits: string[] =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    // 无权限要求，放行
    if (requiredBits.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    // 必须有已认证用户（AuthGuard('jwt') 应先于本守卫执行）
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '未登录或 token 无效',
      });
    }

    const userBits = BigInt(user.permissions);

    // super_admin 全量位直接放行（内部 -1n 与对外正数 2^63-1 均识别）
    if (userBits === -1n || userBits === SUPER_ADMIN_BITS_POSITIVE) {
      return true;
    }

    for (const bitName of requiredBits) {
      const meta = PermissionsEnum[bitName as keyof typeof PermissionsEnum];
      if (!meta) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: `未知权限位: ${bitName}`,
        });
      }
      if (!hasPermission(userBits, meta.bits)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: '无权限',
        });
      }
    }

    return true;
  }
}
