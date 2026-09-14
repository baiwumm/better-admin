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

export const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

export const db = drizzle(pool, { schema, logger: true });
