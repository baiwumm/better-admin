import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { LogsService } from '../../modules/logs/logs.service';

/**
 * 全局 API 日志拦截器（type=api）。
 *
 * 在所有请求响应完成后，异步记录一条 api 日志：
 * action = `${method} ${path}`，detail 含 status / 耗时。
 *
 * 开关：环境变量 LOG_API_ENABLED（默认 'true'）。
 * 为避免自引用噪声，跳过对 /api/logs 的读取型请求记录。
 * best-effort：失败仅打印，不影响主流程。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = (process.env.LOG_API_ENABLED ?? 'true') !== 'false';
    if (!enabled) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const path = req.originalUrl ?? req.url;

    // 跳过对日志接口自身的记录，避免自引用噪声
    if (path.startsWith('/api/logs')) {
      return next.handle();
    }

    const start = Date.now();
    const userId = (req.user as { id?: string } | undefined)?.id ?? null;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;

    // 响应完成后异步写日志（不阻塞响应）
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      void this.logsService.recordApi({
        method: req.method,
        path,
        status: res.statusCode,
        durationMs,
        userId,
        ip,
        userAgent,
      });
    });

    return next.handle();
  }
}
