import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { StatsService } from './stats.service';
import { StatsOverviewQueryDto } from './dto/stats-query.dto';

/**
 * Dashboard 概览统计（契约 v1.11.0）。
 *
 * - 只读聚合，鉴权为任意已登录用户（无 @Permissions，PermissionsGuard
 *   对无元数据路由放行，与 notice 消费接口口径一致）；
 * - GET 请求不受 DemoReadonlyGuard 只读拦截影响。
 */
@Controller('stats')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /** GET /api/stats/overview —— 概览统计（KPI + 趋势 + 角色 + 公告 + 动态） */
  @Get('overview')
  overview(@Query() query: StatsOverviewQueryDto) {
    return this.statsService.overview(query.days ?? 7);
  }
}
