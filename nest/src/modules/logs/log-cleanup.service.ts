import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { inArray, lt } from 'drizzle-orm';
import { db } from '../../db/client';
import { logs } from '../../db/schema';

/**
 * 日志定时清理（type=api/error/login/operation 统一保留 30 天，评审确认）。
 *
 * - 默认每日北京时间 03:00 执行（cron 显式 TZ，Render 服务器为 UTC）；
 * - LOG_CLEANUP_CRON 覆盖执行计划；LOG_CLEANUP_ENABLED=false 关闭（默认开）；
 *   LOG_RETENTION_DAYS 覆盖保留天数（默认 30，须为正整数，非法值回退默认）；
 * - 分批删除：单条 SQL 全删会长时间持锁，按批 1000 条循环删到删无可删
 *   （logs_created_idx 支撑截止时间扫描）；
 * - best-effort：失败仅打印，不影响主流程；成功写一条 operation 日志
 *   （action=log.cleanup，系统任务无操作人，userId 为 null 属预期）。
 */

/** 单批删除行数 */
const DELETE_CHUNK_SIZE = 1000;

/** 保留天数环境变量名 / 默认值 */
const RETENTION_DAYS_ENV = 'LOG_RETENTION_DAYS';
const RETENTION_DAYS_DEFAULT = 30;

function resolveRetentionDays(): number {
  const parsed = Number(process.env[RETENTION_DAYS_ENV]);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : RETENTION_DAYS_DEFAULT;
}

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);

  @Cron(process.env.LOG_CLEANUP_CRON ?? '0 3 * * *', {
    // Render 服务器为 UTC，显式锚定北京时间低峰时段
    timeZone: 'Asia/Shanghai',
    name: 'log-cleanup',
  })
  async handleCron() {
    if ((process.env.LOG_CLEANUP_ENABLED ?? 'true') === 'false') {
      return;
    }

    await this.cleanup();
  }

  /** 清理保留期之前的全部日志（供定时触发与手动调用共用） */
  async cleanup(retentionDays = resolveRetentionDays()) {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    let deleted = 0;

    try {
      // 循环分批：每批先取待删 ID 再按 ID 删除，删完继续，直到删无可删
      for (;;) {
        const rows = await db
          .select({ id: logs.id })
          .from(logs)
          .where(lt(logs.createdAt, cutoff))
          .limit(DELETE_CHUNK_SIZE);

        if (rows.length === 0) break;

        await db
          .delete(logs)
          .where(inArray(logs.id, rows.map((row) => row.id)));

        deleted += rows.length;

        if (rows.length < DELETE_CHUNK_SIZE) break;
      }
    } catch (err) {
      this.logger.error(
        `[log-cleanup] 清理失败（已删 ${deleted} 条，截止 ${cutoff.toISOString()}）`,
        err instanceof Error ? err.stack : String(err),
      );

      return;
    }

    if (deleted === 0) {
      return;
    }

    this.logger.log(
      `[log-cleanup] 已清理 ${deleted} 条日志（保留 ${retentionDays} 天，截止 ${cutoff.toISOString()}）`,
    );

    try {
      await db.insert(logs).values({
        type: 'operation',
        action: 'log.cleanup',
        userId: null,
        detail: { deleted, retentionDays, cutoff: cutoff.toISOString() },
      });
    } catch (err) {

      console.error('[log-cleanup] 写入清理日志失败:', err);
    }
  }
}
