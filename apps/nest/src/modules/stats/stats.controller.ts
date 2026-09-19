import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { StatsService } from './stats.service';

/**
 * Dashboard 概览统计（契约 v1.12.0）。
 *
 * - 只读聚合，鉴权为任意已登录用户（无 @Permissions，PermissionsGuard
 *   对无元数据路由放行，与 notice 消费接口口径一致）；
 * - GET 请求不受 DemoReadonlyGuard 只读拦截影响；
 * - 无查询参数：本接口是页面级聚合，7 / 30 日趋势区间由前端本地截取，
 *   不作为服务端取数维度（v1.11.0 的 `days` 参数已在 v1.12.0 移除）。
 */
@Controller('stats')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /** GET /api/stats/overview —— 概览统计（KPI + 趋势 + 角色 + 公告 + 动态） */
  @Get('overview')
  overview() {
    return this.statsService.overview();
  }
}
