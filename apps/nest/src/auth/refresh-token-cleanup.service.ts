import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { inArray, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { refreshTokens } from '@/db/schema';

/**
 * refresh_tokens 过期行定时清理（Phase 0 补齐）。
 *
 * 此前仅登出 / 轮换 / 用户删除时按行撤销，自然过期的行无人回收，
 * 演示站高频快捷登录下表会持续膨胀。默认每日北京时间 03:30
 * （日志清理 03:00 之后错峰），分批删除 expires_at 已过的行；
 * REFRESH_TOKEN_CLEANUP_CRON 覆盖计划，REFRESH_TOKEN_CLEANUP_ENABLED=false 关闭。
 * best-effort：失败仅打印，不影响主流程。
 */

/** 单批删除行数 */
const DELETE_CHUNK_SIZE = 1000;

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  @Cron(process.env.REFRESH_TOKEN_CLEANUP_CRON ?? '30 3 * * *', {
    timeZone: 'Asia/Shanghai',
    name: 'refresh-token-cleanup',
  })
  async handleCron() {
    if ((process.env.REFRESH_TOKEN_CLEANUP_ENABLED ?? 'true') === 'false') {
      return;
    }

    await this.cleanup();
  }

  /** 删除全部已过期的托管刷新令牌（供定时触发与手动调用共用） */
  async cleanup() {
    const now = new Date();
    let deleted = 0;

    try {
      for (;;) {
        const rows = await db
          .select({ id: refreshTokens.id })
          .from(refreshTokens)
          .where(lt(refreshTokens.expiresAt, now))
          .limit(DELETE_CHUNK_SIZE);

        if (rows.length === 0) break;

        await db
          .delete(refreshTokens)
          .where(inArray(refreshTokens.id, rows.map((row) => row.id)));

        deleted += rows.length;

        if (rows.length < DELETE_CHUNK_SIZE) break;
      }
    } catch (err) {
      this.logger.error(
        `[refresh-token-cleanup] 清理失败（已删 ${deleted} 条）`,
        err instanceof Error ? err.stack : String(err),
      );

      return;
    }

    if (deleted > 0) {
      this.logger.log(`[refresh-token-cleanup] 已清理 ${deleted} 条过期刷新令牌`);
    }
  }
}
