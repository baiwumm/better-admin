import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config } from 'dotenv';

/**
 * 数据库迁移执行脚本（Phase 2）。
 *
 * 用法：pnpm db:migrate
 * 依赖：drizzle/ 目录下的迁移文件（由 `pnpm db:generate` 生成）。
 *
 * SSL：同 src/db/client.ts，云托管 PG（Supabase）要求 TLS，
 * 统一配置 ssl: { rejectUnauthorized: false }。
 */
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL 环境变量未设置，无法执行迁移。');
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

async function run() {
  // eslint-disable-next-line no-console
  console.log('[migrate] 开始应用迁移...');
  await migrate(db, { migrationsFolder: './drizzle' });
  // eslint-disable-next-line no-console
  console.log('[migrate] 迁移完成。');
  await pool.end();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] 迁移失败:', err);
  process.exit(1);
});
