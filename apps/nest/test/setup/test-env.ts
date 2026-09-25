import { Pool } from 'pg';

/** e2e 隔离 schema 名：测试期间在目标库内独占，跑完删除（见 global-setup.ts）。 */
export const E2E_SCHEMA = 'e2e';

/**
 * 读取测试库直连串（必填，缺失即抛出带指引的错误）。
 *
 * 必须是可执行 DDL 的直连（Supabase 用 5432，勿用 6543 pooler——PgBouncer 事务池
 * 不支持 startup parameters，search_path 会被静默丢弃导致迁移误写默认 schema）。
 */
export function requireTestDatabaseUrl(): string {
  const raw = process.env.DATABASE_TEST_URL?.trim();
  if (!raw) {
    throw new Error(
      '[e2e] 环境变量 DATABASE_TEST_URL 未设置。e2e 测试需要一个可执行 DDL 的 PostgreSQL 直连串' +
        '（Supabase 用 5432 直连，勿用 6543 pooler：PgBouncer 不支持 search_path 启动参数），格式见 .env.example。',
    );
  }
  return raw;
}

/**
 * 连接串追加 search_path 启动参数：持有该串的所有连接（应用内 pg Pool、
 * drizzle-kit 迁移、seed）无需任何代码改动即整体落进 e2e schema。
 */
export function withSearchPath(raw: string, schema: string = E2E_SCHEMA): string {
  const url = new URL(raw);
  url.searchParams.set('options', `-c search_path=${schema}`);
  return url.toString();
}

/**
 * 建库管理连接（建/删 schema、迁移结果校验用）。
 *
 * SSL 与 src/db/client.ts 同口径（Supabase 要求 TLS）；URL 显式带 sslmode=disable
 * 时关闭（指向本地无 TLS 的 postgres 时使用）。
 */
export function createAdminPool(raw: string): Pool {
  const disableSsl = new URL(raw).searchParams.get('sslmode') === 'disable';
  return new Pool({
    connectionString: raw,
    ...(disableSsl ? {} : { ssl: { rejectUnauthorized: false } }),
  });
}
