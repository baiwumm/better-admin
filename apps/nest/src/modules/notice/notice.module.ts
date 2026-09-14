import { Module } from '@nestjs/common';
import { NoticesController } from './notice.controller';
import { NoticesService } from './notice.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NoticePublishCronService } from './notice-publish-cron.service';

/** 公告 + 站内信铃铛（契约 v1.7.0 阶段 3） */
@Module({
  controllers: [NoticesController, NotificationsController],
  providers: [NoticesService, NotificationsService, NoticePublishCronService],
})
export class NoticeModule {}
