import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { createAdminPool, E2E_SCHEMA, requireTestDatabaseUrl, withSearchPath } from './test-env';

/** Supavisor session pooler 偶发瞬断（ECONNRESET）：关键连接点统一重试，间隔 2s。 */
async function withConnRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts) {
         
        console.warn(`[e2e] ${label} 第 ${i} 次失败（${(err as Error).message}），2s 后重试`);
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  }
  throw last;
}

/** 子进程串行重试（seed 幂等，重跑安全）；同步 sleep 用 Promise 包裹。 */
async function execWithRetry(command: string, env: NodeJS.ProcessEnv): Promise<void> {
  await withConnRetry(command, async () => {
    try {
      execSync(command, { stdio: 'inherit', env });
    } catch (err) {
      throw new Error(`command failed: ${command}`, { cause: err });
    }
    await Promise.resolve();
  });
}

/**
 * vitest globalSetup：全部用例开始前一次性重建 e2e schema（DROP → CREATE →
 * 建表 → db:seed），teardown 默认删除（E2E_KEEP_SCHEMA=1 保留调试）。
 *
 * 建表不用 `pnpm db:migrate`：drizzle migrator 把迁移记录表硬编码在库级
 * "drizzle"."__drizzle_migrations"（不受 search_path 影响），共享 Supabase 库的
 * 该表已有生产迁移记录，e2e 跑 migrate 会因「已应用」静默跳过全部语句。改为
 * 按序直执行 drizzle/*.sql——e2e schema 每次全新重建，无需增量迁移记录，
 * 产物与 migrate 完全一致。
 *
 * seed 仍走子进程 `pnpm db:seed`（与手工流程一致；应用内 db client 经注入的
 * search_path 连接串自动落进 e2e schema，dotenv 不覆盖注入的 env）。
 * SEED_ADMIN_PASSWORD 强制固定：e2e schema 每次全新重灌，登录凭据必须可预测。
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  loadDotenv({ path: '.env', quiet: true });
  const testUrl = requireTestDatabaseUrl();

  const bootstrap = createAdminPool(testUrl);
  // 建表连接必须带 search_path：迁移 SQL 无 schema 限定，否则会误写目库默认 schema
  const schemaPool = createAdminPool(withSearchPath(testUrl));
  // 整段（DROP → CREATE → 建表）作为重试单元：重试前重新 DROP，避免「表已存在」
  try {
    await withConnRetry('重建 e2e schema 并建表', async () => {
      await bootstrap.query(`DROP SCHEMA IF EXISTS ${E2E_SCHEMA} CASCADE`);
      await bootstrap.query(`CREATE SCHEMA ${E2E_SCHEMA}`);

      // 迁移 SQL 的表名无 schema 限定（随连接 search_path 落进 e2e），但外键被
      // drizzle-kit 显式写成 "public".限定——共享库下会把 e2e 的外键挂到生产表，
      // 执行前统一重写为 e2e 限定；文件名字典序即迁移序。
      // cwd 恒为 apps/nest（pnpm test / CI working-directory 一致）
      const migrationsDir = path.resolve(process.cwd(), 'drizzle');
      const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
        await schemaPool.query(sql.replaceAll('"public".', `"${E2E_SCHEMA}".`));
      }
    });
  } finally {
    await schemaPool.end().catch(() => undefined);
    await bootstrap.end().catch(() => undefined);
  }

  const childEnv = {
    ...process.env,
    DATABASE_URL: withSearchPath(testUrl),
    SEED_ADMIN_PASSWORD: 'admin123',
  };
  execWithRetry('pnpm db:seed', childEnv);

  // 防御：表必须落在 e2e schema。search_path 若被中间层丢弃，建表/种子会误写
  // 目库默认 schema——此时立即中止且不执行 teardown，保留现场供排查。
  const verify = createAdminPool(testUrl);
  try {
    const { rows } = await withConnRetry('校验 schema 落位', () =>
      verify.query(
        `SELECT count(*)::int AS count
           FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = 'users'`,
        [E2E_SCHEMA],
      ),
    );
    if (rows[0].count === 0) {
      throw new Error(
        `[e2e] users 表未出现在 ${E2E_SCHEMA} schema——search_path 未生效（连接串是否经过了 pooler？），已中止且未清理现场。`,
      );
    }
  } finally {
    await verify.end().catch(() => undefined);
  }

  return async () => {
    if (process.env.E2E_KEEP_SCHEMA === '1') return;
    const cleanup = createAdminPool(testUrl);
    try {
      await cleanup.query(`DROP SCHEMA IF EXISTS ${E2E_SCHEMA} CASCADE`);
    } finally {
      await cleanup.end().catch(() => undefined);
    }
  };
}
