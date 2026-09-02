import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { NoticesService } from './notice.service';

/**
 * 公告定时发布（契约 v1.7.0）：每分钟扫描 publish_time 已到期的
 * draft 公告自动置为 published，并给范围内全员写 notice_publish 通知。
 * 模式对齐 log-cleanup.service（@Cron + 服务层委托）。
 */
@Injectable()
export class NoticePublishCronService {
  constructor(private readonly noticesService: NoticesService) {}

  @Cron('* * * * *')
  async handlePublishDueNotices() {
    try {
      const published = await this.noticesService.publishDueNotices();
      if (published > 0) {
        console.log(`[notice-cron] 定时发布完成：${published} 条公告已发布`);
      }
    } catch (err) {
      console.error('[notice-cron] 定时发布失败:', err);
    }
  }
}
