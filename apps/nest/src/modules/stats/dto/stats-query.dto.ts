import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

/** GET /api/stats/overview 查询参数（契约 v1.11.0） */
export class StatsOverviewQueryDto {
  /** 登录趋势序列天数（KPI 迷你序列固定近 7 日，不受本参数影响） */
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30])
  days?: 7 | 30 = 7;
}
