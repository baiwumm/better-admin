import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogCleanupService } from './log-cleanup.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService, LogCleanupService],
  exports: [LogsService],
})
export class LogsModule {}
