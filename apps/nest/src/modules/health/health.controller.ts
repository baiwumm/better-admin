import { Controller, Get } from '@nestjs/common';

/**
 * GET /api/health — 存活探针：无鉴权、无数据库访问。
 *
 * 存在理由是 Render 免费层 15 分钟不活跃即休眠（冷启动 30-50 秒），需要外部
 * 定时器每 5-10 分钟 ping 一次保活。因此本端点必须保证零依赖：不查库、不写日志，
 * 进程活着就返回 200。
 */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
