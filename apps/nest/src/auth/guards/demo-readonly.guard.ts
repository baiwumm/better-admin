import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEMO_ALLOWED_KEY } from '@/auth/decorators/demo-allowed.decorator';

/** 演示模式是否开启（缺省 false，本地开发无感） */
export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE ?? 'false') === 'true';
}

/**
 * 演示只读守卫（全局注册，契约 v1.10.0）。
 *
 * DEMO_MODE=true 时默认拦截所有非 GET 请求（POST / PUT / PATCH / DELETE），
 * 统一返回 403 { code: 'DEMO_READONLY' }；白名单由 @DemoAllowed() 标注在
 * handler 上放行。DEMO_MODE 关闭时整体放行，行为与现状完全一致。
 *
 * 全局守卫先于路由级 AuthGuard 执行：未登录的写请求同样被拦为 DEMO_READONLY
 * 而非 401，服务端权威、规则只在此一处维护。
 */
@Injectable()
export class DemoReadonlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isDemoMode()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    const method = (request.method ?? 'GET').toUpperCase();
    // 只读与预检方法不在拦截语义内
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const allowed = this.reflector.getAllAndOverride<boolean>(DEMO_ALLOWED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) {
      return true;
    }

    throw new ForbiddenException({
      code: 'DEMO_READONLY',
      message: '演示环境，禁止修改数据',
    });
  }
}
