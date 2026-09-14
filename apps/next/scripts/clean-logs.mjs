/**
 * 日志定时清理脚本（方案 §架构要点 6，N4 落地）。
 *
 * 删除「创建时间早于保留窗口」的日志（LOG_RETENTION_DAYS，缺省 30 天），
 * 与 Nest 端 log-cleanup.service（@nestjs/schedule 每日 03:00）语义一致。
 *
 * 载体：GitHub Actions cron 定时直连数据库执行（Vercel Cron 本质是 HTTP
 * 触发、无法直接跑脚本；本脚本零 API 端点）。仓库级 workflow 挂接另行安排，
 * 届时在 GitHub Secrets 配置 DATABASE_URL 后运行 `pnpm --filter next db:clean-logs`。
 *
 * 幂等：与 Nest 端清理重复执行无害（删除条件一致，先到先删）。
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS ?? 30);

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS <= 0) {
  console.error("[clean-logs] LOG_RETENTION_DAYS 必须为正整数");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[clean-logs] DATABASE_URL 环境变量未设置");
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const result = await sql`
    DELETE FROM logs
    WHERE created_at < now() - (${RETENTION_DAYS} || ' days')::interval
  `;

  console.log(
    `[clean-logs] 已清理 ${result.count} 条 ${RETENTION_DAYS} 天前的日志`,
  );
} catch (error) {
  console.error("[clean-logs] 清理失败:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
