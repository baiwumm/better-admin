/**
 * 日志定时清理脚本（平移自 next/scripts/clean-logs.mjs，语义一致）。
 *
 * 删除「创建时间早于保留窗口」的日志（LOG_RETENTION_DAYS，缺省 30 天），
 * 与 Nest 端 log-cleanup.service（@nestjs/schedule 每日 03:00）语义一致。
 *
 * 载体：GitHub Actions cron 定时直连数据库执行（本脚本零 API 端点）。
 * 仓库级 workflow 挂接另行安排，届时在 GitHub Secrets 配置 DATABASE_URL
 * 后运行 `pnpm --filter nuxt db:clean-logs`（或在 nuxt 目录 `pnpm clean-logs`）。
 *
 * 幂等：与 Nest 端清理重复执行无害（删除条件一致，先到先删）。
 */
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

// Nitro dev 不参与纯脚本进程：手动加载 .env（与 next 端 dotenv 等价的最小实现）
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)

    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
} catch {
  // .env 不存在时依赖外部环境变量
}

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS ?? 30)

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS <= 0) {
  console.error('[clean-logs] LOG_RETENTION_DAYS 必须为正整数')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('[clean-logs] DATABASE_URL 环境变量未设置')
  process.exit(1)
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 1
})

try {
  // 跳过 faker 布景日志（detail.seed=true，契约 v1.10.0，与 Nest 端
  // log-cleanup 一致）：演示数据集的永久布景不随保留窗口滚动清除
  const result = await sql`
    DELETE FROM logs
    WHERE created_at < now() - (${RETENTION_DAYS} || ' days')::interval
      AND coalesce(detail->>'seed', '') <> 'true'
  `

  console.log(
    `[clean-logs] 已清理 ${result.count} 条 ${RETENTION_DAYS} 天前的日志（seed 布景除外）`
  )
} finally {
  await sql.end()
}
