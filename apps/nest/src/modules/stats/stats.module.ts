import { Module } from '@nestjs/common';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

/** Dashboard 概览统计（契约 v1.11.0，只读聚合，无独立表访问） */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
