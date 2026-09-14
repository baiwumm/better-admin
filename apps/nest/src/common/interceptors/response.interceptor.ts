import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 全局响应拦截器。
 * 统一成功响应结构（与 openapi-design.md §1.2 一致）：
 * - 单对象 / 写操作：{ data }
 * - 列表（含分页）：{ data, pagination }（已由 Controller 组装好）
 *
 * 约定：若 Controller 返回的对象已含顶层 `data` 字段，则视为已符合 Contract，
 * 直接透传（避免重复包裹）；否则包裹为 { data: body }。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        if (
          body &&
          typeof body === 'object' &&
          !Array.isArray(body) &&
          'data' in (body as Record<string, unknown>)
        ) {
          return body;
        }
        return { data: body ?? null };
      }),
    );
  }
}
