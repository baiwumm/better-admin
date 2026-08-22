import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { db } from '../../db/client';
import { logs } from '../../db/schema';

/**
 * 全局异常过滤器。
 * 统一输出 { code, message } 结构（与 openapi.yaml Error schema 一致）。
 *
 * - HttpException：取 HTTP 状态码，message 透传；若 exception 携带业务 code 则优先使用。
 * - 校验异常（class-validator）：400，code = VALIDATION_ERROR。
 * - 其余未捕获异常：500，code = INTERNAL_ERROR。
 *
 * 同时：所有异常（status >= 400）best-effort 写入 logs（type=error），
 * 用于审计与排查；写入失败不影响响应。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        // 业务 code 优先（如 { code: 'USER_NOT_FOUND', message: '...' }）
        if (typeof r.code === 'string') {
          code = r.code;
        }
        if (typeof r.message === 'string') {
          message = r.message;
        } else if (Array.isArray(r.message) && r.message.length > 0) {
          // class-validator 返回字符串数组
          message = (r.message as unknown[]).join('; ');
        }
      }

      // 校验异常：class-validator 抛出 BadRequestException，其响应体含
      // validationErrors / message 为数组；统一 code 为 VALIDATION_ERROR。
      const resObj = res as Record<string, unknown>;
      if (
        status === HttpStatus.BAD_REQUEST &&
        (Array.isArray(resObj.message) || 'validationErrors' in resObj)
      ) {
        code = 'VALIDATION_ERROR';
      }

      // 资源不存在：统一 code 为 NOT_FOUND（契约 404 通用码）
      if (status === HttpStatus.NOT_FOUND) {
        code = code === 'INTERNAL_ERROR' ? 'NOT_FOUND' : code;
      }

      // 未认证/令牌无效：统一 code 为 UNAUTHORIZED（契约 401 通用码）
      if (status === HttpStatus.UNAUTHORIZED) {
        code = code === 'INTERNAL_ERROR' ? 'UNAUTHORIZED' : code;
        if (message === 'Unauthorized') {
          message = '未登录或 token 无效';
        }
      }
    }

    // 记录未捕获的服务端异常堆栈，便于排查
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${code}] ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // best-effort：写入 error 日志（type=error）
    this.recordErrorLog(request, status, code, message, exception);

    response.status(status).json({ code, message });
  }

  private recordErrorLog(
    request: Request,
    status: number,
    code: string,
    message: string,
    exception: unknown,
  ) {
    try {
      const ip =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        request.ip ||
        null;
      const userAgent = (request.headers['user-agent'] as string) ?? null;
      const userId = (request.user as { id?: string } | undefined)?.id ?? null;
      void db
        .insert(logs)
        .values({
          type: 'error',
          action: `error.${status}`,
          userId,
          ip,
          userAgent,
          detail: {
            code,
            message,
            path: request.originalUrl ?? request.url,
            method: request.method,
            stack: exception instanceof Error ? exception.message : String(exception),
          },
        })
        .catch(() => undefined);
    } catch {
      /* best-effort，忽略 */
    }
  }
}
