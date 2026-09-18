import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Drizzle 数据库客户端（Phase 2 基础设施）。
 *
 * 连接信息只允许存在于服务端环境变量 DATABASE_URL，严禁写入前端或提交仓库。
 * 格式：postgresql://user:password@host:5432/dbname
 *
 * SSL：Supabase（及多数云托管 PG）要求 TLS。pg 8.x 对 URL 中的 sslmode=require
 * 会走证书链校验（自签/私有 CA 会失败），因此统一在代码层配置
 * ssl: { rejectUnauthorized: false }，URL 中不写 sslmode。
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL 环境变量未设置，无法初始化数据库连接。');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // Supabase PgBouncer（pooler 6543）会回收空闲连接：复用半开连接会随机报
  // "Failed query"（任何接口均可命中，与查询本身无关）。keepAlive 维持 TCP
  // 探活、idleTimeoutMillis 主动收缩闲置连接、connectionTimeoutMillis 防止
  // 拿连接无限等待——三者将死连接窗口收敛到秒级。
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

export const db = drizzle(pool, { schema, logger: true });
