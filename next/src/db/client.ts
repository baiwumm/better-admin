import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle 数据库客户端（Next 端）。
 *
 * 连接信息只允许存在于服务端环境变量 DATABASE_URL，严禁写入前端或提交仓库。
 * 连接池端口 6543（Supabase transaction pooler），URL 中禁止携带 sslmode 参数。
 *
 * SSL：Supabase（及多数云托管 PG）要求 TLS。postgres.js 对 URL 中的
 * sslmode=require 会走证书链校验（自签/私有 CA 会失败），因此统一在代码层
 * 配置 ssl: { rejectUnauthorized: false }，与 Nest 端（pg 驱动）行为一致。
 *
 * prepare: false：transaction pooler 不支持预编译语句复用，必须禁用。
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 环境变量未设置，无法初始化数据库连接。");
}

export const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});
